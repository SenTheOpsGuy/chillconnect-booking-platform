from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, time
from app.core.deps import get_db, get_current_active_user, require_role
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus, BookingType
from app.models.profile import Profile
from app.models.token import Token, TokenTransaction, TransactionType, TransactionStatus
from app.services.email import send_booking_confirmation_email
from app.services.sms import send_booking_reminder_sms
from app.core.config import settings
from app.services.pricing import PricingService
from app.services.otp import OTPService
from pydantic import BaseModel

router = APIRouter()

class BookingCreateRequest(BaseModel):
    provider_id: int
    start_time: datetime
    duration_hours: int
    booking_type: BookingType
    location: Optional[str] = None
    special_requests: Optional[str] = None

class BookingResponse(BaseModel):
    id: int
    provider_id: int
    provider_name: str
    seeker_id: int
    start_time: str
    duration_hours: int
    total_tokens: int
    booking_type: BookingType
    status: BookingStatus
    location: Optional[str]
    special_requests: Optional[str]
    created_at: str

class BookingUpdateRequest(BaseModel):
    status: BookingStatus
    otp_code: Optional[str] = None

def calculate_booking_cost(db: Session, provider_hourly_rate: int, provider_id: int, duration_hours: int) -> int:
    """Calculate total cost using PricingService with platform fees"""
    cost_breakdown = PricingService.calculate_booking_cost(db, provider_hourly_rate, provider_id, duration_hours)
    return cost_breakdown["total_cost"]

def assign_monitoring_employee(db: Session, booking_id: int) -> Optional[int]:
    """Assign an employee to monitor the booking using round-robin"""
    from app.services.assignment import get_next_available_employee
    
    employee_id = get_next_available_employee(db, "booking")
    if employee_id:
        # Create assignment record
        from app.models.verification import Assignment, AssignmentType
        assignment = Assignment(
            item_id=booking_id,
            item_type=AssignmentType.BOOKING,
            employee_id=employee_id
        )
        db.add(assignment)
        
        # Update booking with assigned employee
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if booking:
            booking.assigned_employee = employee_id
    
    return employee_id

@router.post("/create", response_model=BookingResponse)
async def create_booking(
    request: BookingCreateRequest,
    current_user: User = Depends(require_role([UserRole.SEEKER])),
    db: Session = Depends(get_db)
):
    """Create a new booking"""
    # Validate provider exists and is available
    provider = db.query(User).filter(
        User.id == request.provider_id,
        User.role == UserRole.PROVIDER,
        User.is_active == True
    ).first()
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    # Get provider profile
    profile = db.query(Profile).filter(Profile.user_id == request.provider_id).first()
    if not profile or not profile.hourly_rate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider profile incomplete"
        )
    
    # Validate booking time
    if request.start_time <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking time must be in the future"
        )
    
    if request.duration_hours <= 0 or request.duration_hours > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration must be between 1 and 12 hours"
        )
    
    # Calculate total cost
    total_cost = calculate_booking_cost(db, profile.hourly_rate, request.provider_id, request.duration_hours)
    
    # Check seeker's token balance
    seeker_wallet = db.query(Token).filter(Token.user_id == current_user.id).first()
    if not seeker_wallet or seeker_wallet.balance < total_cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient tokens. Need {total_cost} tokens."
        )
    
    # Skip conflict check for now - TODO: implement proper time conflict detection
    
    # Create booking
    booking = Booking(
        seeker_id=current_user.id,
        provider_id=request.provider_id,
        start_time=request.start_time,
        duration_hours=request.duration_hours,
        total_tokens=total_cost,
        booking_type=request.booking_type,
        location=request.location,
        special_requests=request.special_requests,
        status=BookingStatus.PENDING
    )
    
    db.add(booking)
    db.flush()  # Get booking ID
    
    # Move tokens to escrow
    seeker_wallet.balance -= total_cost
    seeker_wallet.escrow_balance += total_cost
    
    # Create escrow transaction
    escrow_transaction = TokenTransaction(
        user_id=current_user.id,
        token_id=seeker_wallet.id,
        type=TransactionType.ESCROW_HOLD,
        amount=-total_cost,
        balance_before=seeker_wallet.balance + total_cost,
        balance_after=seeker_wallet.balance,
        description=f"Escrow for booking #{booking.id}",
        booking_id=booking.id,
        status=TransactionStatus.COMPLETED
    )
    
    db.add(escrow_transaction)
    
    # Assign monitoring employee
    assigned_employee = assign_monitoring_employee(db, booking.id)
    
    db.commit()
    db.refresh(booking)
    
    # Send confirmation emails
    try:
        booking_details = {
            "booking_id": booking.id,
            "start_time": booking.start_time.strftime("%Y-%m-%d %H:%M"),
            "duration_hours": booking.duration_hours,
            "total_tokens": booking.total_tokens
        }
        await send_booking_confirmation_email(current_user.email, booking_details)
        await send_booking_confirmation_email(provider.email, booking_details)
    except Exception as e:
        print(f"Failed to send confirmation emails: {e}")
    
    return BookingResponse(
        id=booking.id,
        provider_id=booking.provider_id,
        provider_name=profile.name or "Provider",
        seeker_id=booking.seeker_id,
        start_time=booking.start_time.isoformat(),
        duration_hours=booking.duration_hours,
        total_tokens=booking.total_tokens,
        booking_type=booking.booking_type,
        status=booking.status,
        location=booking.location,
        special_requests=booking.special_requests,
        created_at=booking.created_at.isoformat()
    )

@router.get("/my-bookings", response_model=List[BookingResponse])
async def get_my_bookings(
    current_user: User = Depends(get_current_active_user),
    status_filter: Optional[BookingStatus] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get user's bookings (as seeker or provider)"""
    query = db.query(Booking).filter(
        (Booking.seeker_id == current_user.id) | (Booking.provider_id == current_user.id)
    )
    
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    
    bookings = query.order_by(Booking.created_at.desc()).limit(limit).all()
    
    booking_responses = []
    for booking in bookings:
        # Get provider profile
        profile = db.query(Profile).filter(Profile.user_id == booking.provider_id).first()
        provider_name = profile.name if profile and profile.name else "Provider"
        
        booking_responses.append(BookingResponse(
            id=booking.id,
            provider_id=booking.provider_id,
            provider_name=provider_name,
            seeker_id=booking.seeker_id,
            start_time=booking.start_time.isoformat(),
            duration_hours=booking.duration_hours,
            total_tokens=booking.total_tokens,
            booking_type=booking.booking_type if hasattr(booking, 'booking_type') and booking.booking_type else BookingType.OUTCALL,
            status=booking.status,
            location=booking.location,
            special_requests=booking.special_requests,
            created_at=booking.created_at.isoformat()
        ))
    
    return booking_responses

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking_details(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific booking details"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check access permissions
    if (current_user.id not in [booking.seeker_id, booking.provider_id] and
        current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get provider profile
    profile = db.query(Profile).filter(Profile.user_id == booking.provider_id).first()
    provider_name = profile.name if profile and profile.name else "Provider"
    
    return BookingResponse(
        id=booking.id,
        provider_id=booking.provider_id,
        provider_name=provider_name,
        seeker_id=booking.seeker_id,
        start_time=booking.start_time.isoformat(),
        duration_hours=booking.duration_hours,
        total_tokens=booking.total_tokens,
        booking_type=booking.booking_type if hasattr(booking, 'booking_type') and booking.booking_type else BookingType.OUTCALL,
        status=booking.status,
        location=booking.location,
        special_requests=booking.special_requests,
        created_at=booking.created_at.isoformat()
    )

@router.put("/{booking_id}/status")
async def update_booking_status(
    booking_id: int,
    request: BookingUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update booking status"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check permissions based on status change
    if request.status == BookingStatus.CONFIRMED:
        # Only provider can confirm
        if current_user.id != booking.provider_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only provider can confirm booking"
            )
    elif request.status == BookingStatus.CANCELLED:
        # Seeker or provider can cancel
        if current_user.id not in [booking.seeker_id, booking.provider_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif request.status == BookingStatus.IN_PROGRESS:
        # Provider can mark as in progress - requires OTP verification
        if current_user.id != booking.provider_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only provider can start session"
            )
        
        # Verify OTP for service start
        if not request.otp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP verification required to start service"
            )
        
        otp_result = await OTPService.verify_service_start_otp(
            db, booking.id, current_user.id, request.otp_code
        )
        
        if not otp_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=otp_result["message"]
            )
    elif request.status == BookingStatus.COMPLETED:
        # Provider can mark as completed
        if current_user.id != booking.provider_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only provider can complete session"
            )
    
    old_status = booking.status
    booking.status = request.status
    
    # Handle escrow release for completed bookings
    if request.status == BookingStatus.COMPLETED and old_status != BookingStatus.COMPLETED:
        seeker_wallet = db.query(Token).filter(Token.user_id == booking.seeker_id).first()
        provider_wallet = db.query(Token).filter(Token.user_id == booking.provider_id).first()
        
        # Get provider profile to determine base rate
        provider_profile = db.query(Profile).filter(Profile.user_id == booking.provider_id).first()
        if provider_profile and provider_profile.hourly_rate:
            # Calculate earnings using PricingService
            cost_breakdown = PricingService.calculate_booking_cost(
                db, provider_profile.hourly_rate, booking.provider_id, booking.duration_hours
            )
            provider_earnings = cost_breakdown["provider_earnings"]
        else:
            # Fallback to old calculation if profile not found
            platform_commission = int(booking.total_tokens * settings.PLATFORM_COMMISSION)
            provider_earnings = booking.total_tokens - platform_commission
        
        # Release escrow to provider
        seeker_wallet.escrow_balance -= booking.total_tokens
        provider_wallet.balance += provider_earnings
        
        # Create transactions
        escrow_release = TokenTransaction(
            user_id=booking.seeker_id,
            token_id=seeker_wallet.id,
            type=TransactionType.ESCROW_RELEASE,
            amount=-booking.total_tokens,
            balance_before=seeker_wallet.escrow_balance + booking.total_tokens,
            balance_after=seeker_wallet.escrow_balance,
            description=f"Escrow release for booking #{booking.id}",
            booking_id=booking.id,
            status=TransactionStatus.COMPLETED
        )
        
        provider_earning = TokenTransaction(
            user_id=booking.provider_id,
            token_id=provider_wallet.id,
            type=TransactionType.EARNING,
            amount=provider_earnings,
            balance_before=provider_wallet.balance - provider_earnings,
            balance_after=provider_wallet.balance,
            description=f"Earnings from booking #{booking.id}",
            booking_id=booking.id,
            status=TransactionStatus.COMPLETED
        )
        
        db.add(escrow_release)
        db.add(provider_earning)
    
    # Handle refund for cancelled bookings
    elif request.status == BookingStatus.CANCELLED and old_status in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        seeker_wallet = db.query(Token).filter(Token.user_id == booking.seeker_id).first()
        
        # Return tokens from escrow to seeker
        seeker_wallet.escrow_balance -= booking.total_tokens
        seeker_wallet.balance += booking.total_tokens
        
        refund_transaction = TokenTransaction(
            user_id=booking.seeker_id,
            token_id=seeker_wallet.id,
            type=TransactionType.REFUND,
            amount=booking.total_tokens,
            balance_before=seeker_wallet.balance - booking.total_tokens,
            balance_after=seeker_wallet.balance,
            description=f"Refund for cancelled booking #{booking.id}",
            booking_id=booking.id,
            status=TransactionStatus.COMPLETED
        )
        
        db.add(refund_transaction)
    
    db.commit()
    
    return {"success": True, "message": f"Booking status updated to {request.status}"}

@router.delete("/{booking_id}")
async def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a booking"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user can cancel
    if current_user.id not in [booking.seeker_id, booking.provider_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if booking can be cancelled
    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking cannot be cancelled"
        )
    
    # Check cancellation policy (24 hours before start time)
    if booking.start_time - datetime.utcnow() < timedelta(hours=24):
        # Apply cancellation fee
        cancellation_fee = int(booking.total_tokens * 0.1)  # 10% fee
        refund_amount = booking.total_tokens - cancellation_fee
    else:
        refund_amount = booking.total_tokens
    
    # Process refund
    seeker_wallet = db.query(Token).filter(Token.user_id == booking.seeker_id).first()
    seeker_wallet.escrow_balance -= booking.total_tokens
    seeker_wallet.balance += refund_amount
    
    refund_transaction = TokenTransaction(
        user_id=booking.seeker_id,
        token_id=seeker_wallet.id,
        type=TransactionType.REFUND,
        amount=refund_amount,
        balance_before=seeker_wallet.balance - refund_amount,
        balance_after=seeker_wallet.balance,
        description=f"Refund for cancelled booking #{booking.id}",
        booking_id=booking.id,
        status=TransactionStatus.COMPLETED
    )
    
    db.add(refund_transaction)
    
    booking.status = BookingStatus.CANCELLED
    db.commit()
    
    return {
        "success": True, 
        "message": "Booking cancelled successfully",
        "refund_amount": refund_amount,
        "cancellation_fee": booking.total_tokens - refund_amount
    }

@router.post("/{booking_id}/generate-start-otp")
async def generate_start_service_otp(
    booking_id: int,
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """Generate OTP for starting service"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if provider owns this booking
    if current_user.id != booking.provider_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned provider can request OTP for this booking"
        )
    
    # Check if booking is in correct status
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP can only be generated for confirmed bookings"
        )
    
    try:
        result = await OTPService.generate_service_start_otp(db, booking_id, current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error generating OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate OTP"
        )

@router.get("/{booking_id}/seeker-start-otp")
async def get_seeker_start_service_otp(
    booking_id: int,
    current_user: User = Depends(require_role([UserRole.SEEKER])),
    db: Session = Depends(get_db)
):
    """Get OTP for seeker to share with provider for starting service"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if seeker owns this booking
    if current_user.id != booking.seeker_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the booking seeker can request OTP for this booking"
        )
    
    # Check if booking is in correct status
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP can only be generated for confirmed bookings"
        )
    
    try:
        result = await OTPService.generate_seeker_service_start_otp(db, booking_id, current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error generating seeker OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate OTP"
        )