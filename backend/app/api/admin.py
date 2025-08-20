from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.deps import get_db, get_admin_user, get_super_admin_user, require_role
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus
from app.models.profile import Profile, ProfileVerificationStatus
from app.models.verification import Verification, Assignment, VerificationStatus, AssignmentStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.support import SupportTicket, SupportStatus
from app.models.token import TokenTransaction
from app.services.assignment import get_employee_assignments, get_assignment_statistics, reassign_task
from app.core.security import get_password_hash
from pydantic import BaseModel, EmailStr
import secrets
import string

router = APIRouter()

class AdminDashboardStats(BaseModel):
    total_users: int
    total_providers: int
    total_seekers: int
    pending_verifications: int
    active_bookings: int
    open_disputes: int
    open_support_tickets: int
    total_revenue: float
    platform_commission: float

class UserManagementResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    verification_status: str
    is_active: bool
    created_at: str
    last_login: Optional[str]

class VerificationQueueItem(BaseModel):
    id: int
    user_id: int
    user_email: str
    verification_type: str
    status: VerificationStatus
    documents: List[str]
    assigned_employee: Optional[int]
    created_at: str

class EmployeeCreate(BaseModel):
    email: EmailStr
    role: UserRole
    phone: Optional[str] = None

class EmployeeResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    phone: Optional[str]
    is_active: bool
    created_at: str
    temporary_password: Optional[str] = None

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    
    # User statistics
    total_users = db.query(User).count()
    total_providers = db.query(User).filter(User.role == UserRole.PROVIDER).count()
    total_seekers = db.query(User).filter(User.role == UserRole.SEEKER).count()
    
    # Verification queue
    pending_verifications = db.query(Verification).filter(
        Verification.status == VerificationStatus.PENDING
    ).count()
    
    # Active bookings
    active_bookings = db.query(Booking).filter(
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS])
    ).count()
    
    # Open disputes - handle case where assigned_manager column might not exist
    try:
        open_disputes = db.query(Dispute).filter(
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.INVESTIGATING])
        ).count()
    except Exception:
        # Fallback if dispute table doesn't have all columns
        open_disputes = 0
    
    # Open support tickets
    try:
        open_support_tickets = db.query(SupportTicket).filter(
            SupportTicket.status.in_([SupportStatus.OPEN, SupportStatus.IN_PROGRESS])
        ).count()
    except Exception:
        open_support_tickets = 0
    
    # Revenue statistics
    try:
        total_revenue_result = db.query(func.sum(TokenTransaction.amount)).filter(
            TokenTransaction.type == "purchase",
            TokenTransaction.status == "completed"
        ).scalar() or 0
        
        total_revenue = total_revenue_result * 100  # Convert tokens to INR
        platform_commission = total_revenue * 0.15  # 15% commission
    except Exception:
        total_revenue = 0
        platform_commission = 0
    
    return AdminDashboardStats(
        total_users=total_users,
        total_providers=total_providers,
        total_seekers=total_seekers,
        pending_verifications=pending_verifications,
        active_bookings=active_bookings,
        open_disputes=open_disputes,
        open_support_tickets=open_support_tickets,
        total_revenue=total_revenue,
        platform_commission=platform_commission
    )

@router.get("/users", response_model=List[UserManagementResponse])
async def get_all_users(
    current_user: User = Depends(get_admin_user),
    role_filter: Optional[UserRole] = None,
    verification_status: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    """Get all users for admin management"""
    query = db.query(User)
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    if verification_status:
        query = query.filter(User.verification_status == verification_status)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Pagination
    offset = (page - 1) * limit
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        UserManagementResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            verification_status=user.verification_status,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            last_login=None  # Implement login tracking if needed
        )
        for user in users
    ]

@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Activate/deactivate user account"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = not user.is_active
    db.commit()
    
    action = "activated" if user.is_active else "deactivated"
    return {"success": True, "message": f"User {action} successfully"}

@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    employee_data: EmployeeCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new employee account"""
    
    # Validate role - only allow employee, manager roles to be created
    if employee_data.role not in [UserRole.EMPLOYEE, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only create employee or manager accounts"
        )
    
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == employee_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Generate temporary password
    def generate_temp_password(length=12):
        characters = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    temp_password = generate_temp_password()
    hashed_password = get_password_hash(temp_password)
    
    # Create new employee user
    new_employee = User(
        email=employee_data.email,
        password_hash=hashed_password,
        role=employee_data.role,
        phone=employee_data.phone,
        age_confirmed=True,  # Employees are assumed to be verified adults
        email_verified=True,  # Admin-created accounts are pre-verified
        verification_status="verified",
        is_active=True
    )
    
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    
    return EmployeeResponse(
        id=new_employee.id,
        email=new_employee.email,
        role=new_employee.role,
        phone=new_employee.phone,
        is_active=new_employee.is_active,
        created_at=new_employee.created_at.isoformat(),
        temporary_password=temp_password  # Return temp password for admin to share
    )

@router.get("/employees", response_model=List[UserManagementResponse])
async def get_employees(
    current_user: User = Depends(get_admin_user),
    role_filter: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all employees and managers"""
    query = db.query(User).filter(
        User.role.in_([UserRole.EMPLOYEE, UserRole.MANAGER])
    )
    
    if role_filter and role_filter in [UserRole.EMPLOYEE, UserRole.MANAGER]:
        query = query.filter(User.role == role_filter)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    employees = query.order_by(User.created_at.desc()).all()
    
    return [
        UserManagementResponse(
            id=employee.id,
            email=employee.email,
            role=employee.role,
            verification_status=employee.verification_status,
            is_active=employee.is_active,
            created_at=employee.created_at.isoformat(),
            last_login=None
        )
        for employee in employees
    ]

@router.get("/verification-queue", response_model=List[VerificationQueueItem])
async def get_verification_queue(
    current_user: User = Depends(get_admin_user),
    status_filter: Optional[VerificationStatus] = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db)
):
    """Get verification queue for admin management"""
    try:
        query = db.query(Verification).join(User)
        
        if status_filter:
            query = query.filter(Verification.status == status_filter)
        
        if assigned_to_me:
            query = query.filter(Verification.employee_id == current_user.id)
        
        verifications = query.order_by(Verification.created_at.asc()).all()
        
        return [
            VerificationQueueItem(
                id=verification.id,
                user_id=verification.user_id,
                user_email=verification.user.email,
                verification_type=verification.verification_type,
                status=verification.status,
                documents=verification.documents or [],
                assigned_employee=getattr(verification, 'employee_id', None),
                created_at=verification.created_at.isoformat()
            )
            for verification in verifications
        ]
    except Exception:
        # Return empty list if table structure is incompatible
        return []

@router.put("/verification/{verification_id}/approve")
async def approve_verification(
    verification_id: int,
    current_user: User = Depends(require_role([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Approve user verification"""
    verification = db.query(Verification).filter(Verification.id == verification_id).first()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification not found"
        )
    
    # Check if assigned to current user (for employees)
    if current_user.role == UserRole.EMPLOYEE and verification.employee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to you"
        )
    
    verification.status = VerificationStatus.APPROVED
    verification.employee_id = current_user.id
    verification.completed_at = func.now()
    
    # Update user verification status
    user = db.query(User).filter(User.id == verification.user_id).first()
    if user:
        user.verification_status = "verified"
    
    db.commit()
    
    return {"success": True, "message": "Verification approved"}

@router.put("/verification/{verification_id}/reject")
async def reject_verification(
    verification_id: int,
    reason: str,
    current_user: User = Depends(require_role([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Reject user verification"""
    verification = db.query(Verification).filter(Verification.id == verification_id).first()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification not found"
        )
    
    # Check if assigned to current user (for employees)
    if current_user.role == UserRole.EMPLOYEE and verification.employee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to you"
        )
    
    verification.status = VerificationStatus.REJECTED
    verification.rejection_reason = reason
    verification.employee_id = current_user.id
    verification.completed_at = func.now()
    
    # Update user verification status
    user = db.query(User).filter(User.id == verification.user_id).first()
    if user:
        user.verification_status = "rejected"
    
    db.commit()
    
    return {"success": True, "message": "Verification rejected"}

@router.get("/bookings/monitoring")
async def get_booking_monitoring_queue(
    current_user: User = Depends(require_role([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN])),
    assigned_to_me: bool = False,
    db: Session = Depends(get_db)
):
    """Get bookings assigned for monitoring"""
    query = db.query(Booking).filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS])
    )
    
    if assigned_to_me:
        query = query.filter(Booking.assigned_employee == current_user.id)
    
    bookings = query.order_by(Booking.start_time.asc()).all()
    
    booking_data = []
    for booking in bookings:
        seeker = db.query(User).filter(User.id == booking.seeker_id).first()
        provider = db.query(User).filter(User.id == booking.provider_id).first()
        
        booking_data.append({
            "id": booking.id,
            "seeker_email": seeker.email,
            "provider_email": provider.email,
            "start_time": booking.start_time.isoformat(),
            "duration_hours": booking.duration_hours,
            "status": booking.status,
            "assigned_employee": booking.assigned_employee,
            "location": booking.location,
            "total_tokens": booking.total_tokens
        })
    
    return {"bookings": booking_data}

@router.get("/disputes")
async def get_disputes(
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN])),
    status_filter: Optional[DisputeStatus] = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db)
):
    """Get all disputes for admin management"""
    try:
        query = db.query(Dispute)
        
        if status_filter:
            query = query.filter(Dispute.status == status_filter)
        
        if assigned_to_me:
            query = query.filter(Dispute.assigned_manager == current_user.id)
        
        disputes = query.order_by(Dispute.created_at.desc()).all()
        
        dispute_data = []
        for dispute in disputes:
            booking = db.query(Booking).filter(Booking.id == dispute.booking_id).first()
            reporter = db.query(User).filter(User.id == dispute.reported_by).first()
            
            # Handle potential missing assigned_manager field
            assigned_manager = getattr(dispute, 'assigned_manager', None)
            
            dispute_data.append({
                "id": dispute.id,
                "booking_id": dispute.booking_id,
                "reporter_email": reporter.email if reporter else "Unknown",
                "dispute_type": dispute.dispute_type,
                "description": dispute.description,
                "status": dispute.status,
                "assigned_manager": assigned_manager,
                "created_at": dispute.created_at.isoformat(),
                "booking_details": {
                    "start_time": booking.start_time.isoformat() if booking else None,
                    "total_tokens": booking.total_tokens if booking else None
                }
            })
        
        return {"disputes": dispute_data}
    except Exception as e:
        # Return empty list if table structure is incompatible
        return {"disputes": []}

@router.put("/disputes/{dispute_id}/assign")
async def assign_dispute(
    dispute_id: int,
    manager_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Assign dispute to a manager"""
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    
    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispute not found"
        )
    
    # Verify manager exists
    manager = db.query(User).filter(
        User.id == manager_id,
        User.role.in_([UserRole.MANAGER, UserRole.ADMIN]),
        User.is_active == True
    ).first()
    
    if not manager:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager not found"
        )
    
    dispute.assigned_manager = manager_id
    dispute.status = DisputeStatus.INVESTIGATING
    
    db.commit()
    
    return {"success": True, "message": f"Dispute assigned to {manager.email}"}

@router.put("/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: int,
    resolution: str,
    resolution_amount: Optional[int] = None,
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Resolve a dispute"""
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    
    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispute not found"
        )
    
    # Check if assigned to current user (for managers)
    if current_user.role == UserRole.MANAGER and dispute.assigned_manager != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not assigned to you"
        )
    
    dispute.status = DisputeStatus.RESOLVED
    dispute.resolution = resolution
    dispute.resolution_amount = resolution_amount
    dispute.resolved_at = func.now()
    
    # Process refund if specified
    if resolution_amount and resolution_amount > 0:
        from app.models.token import Token, TokenTransaction, TransactionType, TransactionStatus
        
        booking = db.query(Booking).filter(Booking.id == dispute.booking_id).first()
        if booking:
            seeker_wallet = db.query(Token).filter(Token.user_id == booking.seeker_id).first()
            if seeker_wallet:
                seeker_wallet.balance += resolution_amount
                
                refund_transaction = TokenTransaction(
                    user_id=booking.seeker_id,
                    token_id=seeker_wallet.id,
                    type=TransactionType.REFUND,
                    amount=resolution_amount,
                    balance_before=seeker_wallet.balance - resolution_amount,
                    balance_after=seeker_wallet.balance,
                    description=f"Dispute resolution refund for booking #{booking.id}",
                    booking_id=booking.id,
                    status=TransactionStatus.COMPLETED
                )
                
                db.add(refund_transaction)
    
    db.commit()
    
    return {"success": True, "message": "Dispute resolved successfully"}

@router.get("/assignments/statistics")
async def get_assignment_statistics_endpoint(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get assignment statistics for admin dashboard"""
    stats = get_assignment_statistics(db)
    return stats

@router.get("/my-assignments")
async def get_my_assignments(
    current_user: User = Depends(require_role([UserRole.EMPLOYEE])),
    db: Session = Depends(get_db)
):
    """Get assignments for current employee"""
    assignments = get_employee_assignments(db, current_user.id)
    return {"assignments": assignments}

@router.put("/assignments/{assignment_id}/reassign")
async def reassign_assignment(
    assignment_id: int,
    new_employee_id: int,
    reason: str,
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Reassign task to different employee"""
    success = reassign_task(db, assignment_id, new_employee_id, reason)
    
    if success:
        return {"success": True, "message": "Task reassigned successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reassign task"
        )

@router.get("/analytics/revenue")
async def get_revenue_analytics(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get revenue analytics for the specified period"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Daily revenue
    daily_revenue = db.query(
        func.date(TokenTransaction.created_at).label('date'),
        func.sum(TokenTransaction.amount).label('tokens'),
        func.count(TokenTransaction.id).label('transactions')
    ).filter(
        TokenTransaction.type == "purchase",
        TokenTransaction.status == "completed",
        TokenTransaction.created_at >= start_date
    ).group_by(func.date(TokenTransaction.created_at)).all()
    
    # Platform commission
    total_bookings_revenue = db.query(func.sum(Booking.total_tokens)).filter(
        Booking.status == BookingStatus.COMPLETED,
        Booking.created_at >= start_date
    ).scalar() or 0
    
    platform_commission = total_bookings_revenue * 0.15
    
    return {
        "period_days": days,
        "daily_revenue": [
            {
                "date": day.date.isoformat(),
                "tokens": day.tokens or 0,
                "revenue_inr": (day.tokens or 0) * 100,
                "transactions": day.transactions
            }
            for day in daily_revenue
        ],
        "total_platform_commission": platform_commission * 100,  # Convert to INR
        "total_bookings_revenue": total_bookings_revenue * 100
    }