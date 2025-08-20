from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from app.core.deps import get_db, get_current_active_user, require_role
from app.models.user import User, UserRole
from app.models.profile import Profile, ProfileVerificationStatus
from app.models.rating import Rating
from app.services.pricing import PricingService
from pydantic import BaseModel
from datetime import datetime, time
import json

router = APIRouter()

class AvailabilitySlot(BaseModel):
    day: str  # monday, tuesday, etc.
    start_time: str  # "09:00"
    end_time: str   # "17:00"

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    hourly_rate: Optional[int] = None
    location: Optional[str] = None
    services_offered: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    availability: Optional[List[AvailabilitySlot]] = None

class ProviderSearchFilter(BaseModel):
    location: Optional[str] = None
    min_rate: Optional[int] = None
    max_rate: Optional[int] = None
    services: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    available_today: Optional[bool] = None

class ProviderResponse(BaseModel):
    id: int
    user_id: int
    name: str
    bio: str
    hourly_rate: int  # Rate shown to seekers (with platform fee)
    provider_base_rate: Optional[int] = None  # Provider's actual rate (for admin/internal use)
    location: str
    images: List[str]
    services_offered: List[str]
    languages: List[str]
    verification_status: ProfileVerificationStatus
    avg_rating: float
    total_ratings: int
    is_available_now: bool

class ProviderDetailResponse(ProviderResponse):
    availability: dict
    recent_reviews: List[dict]

@router.get("/search", response_model=List[ProviderResponse])
async def search_providers(
    location: Optional[str] = Query(None),
    min_rate: Optional[int] = Query(None),
    max_rate: Optional[int] = Query(None),
    services: Optional[str] = Query(None),  # comma-separated
    languages: Optional[str] = Query(None),  # comma-separated
    available_today: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    """Search for providers with filters"""
    query = db.query(Profile).join(User).filter(
        User.role == UserRole.PROVIDER,
        User.is_active == True,
        Profile.verification_status == ProfileVerificationStatus.APPROVED
    )
    
    # Apply filters
    if location:
        query = query.filter(Profile.location.ilike(f"%{location}%"))
    
    if min_rate:
        query = query.filter(Profile.hourly_rate >= min_rate)
    
    if max_rate:
        query = query.filter(Profile.hourly_rate <= max_rate)
    
    if services:
        service_list = [s.strip() for s in services.split(",")]
        for service in service_list:
            query = query.filter(Profile.services_offered.any(service))
    
    if languages:
        language_list = [l.strip() for l in languages.split(",")]
        for language in language_list:
            query = query.filter(Profile.languages.any(language))
    
    # Pagination
    offset = (page - 1) * limit
    profiles = query.offset(offset).limit(limit).all()
    
    providers = []
    for profile in profiles:
        # Calculate average rating
        ratings = db.query(Rating).filter(Rating.rated_user == profile.user_id).all()
        avg_rating = sum(r.rating for r in ratings) / len(ratings) if ratings else 0
        
        # Check if available today (simplified)
        is_available_now = True  # You can implement more complex availability logic
        
        # Calculate pricing with platform fee
        base_rate = profile.hourly_rate or 0
        if base_rate > 0:
            pricing = PricingService.calculate_provider_rates(db, base_rate, profile.user_id)
            seeker_rate = pricing["seeker_rate"]
        else:
            seeker_rate = 0
        
        providers.append(ProviderResponse(
            id=profile.id,
            user_id=profile.user_id,
            name=profile.name or "Anonymous",
            bio=profile.bio or "",
            hourly_rate=seeker_rate,  # Show rate with platform fee to seekers
            provider_base_rate=base_rate,  # Keep original rate for reference
            location=profile.location or "",
            images=profile.images or [],
            services_offered=profile.services_offered or [],
            languages=profile.languages or [],
            verification_status=profile.verification_status,
            avg_rating=round(avg_rating, 1),
            total_ratings=len(ratings),
            is_available_now=is_available_now
        ))
    
    return providers

@router.get("/{provider_id}", response_model=ProviderDetailResponse)
async def get_provider_details(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed provider information"""
    profile = db.query(Profile).filter(
        Profile.id == provider_id,
        Profile.verification_status == ProfileVerificationStatus.APPROVED
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    # Get ratings and reviews
    ratings = db.query(Rating).filter(Rating.rated_user == profile.user_id).all()
    avg_rating = sum(r.rating for r in ratings) / len(ratings) if ratings else 0
    
    # Get recent reviews
    recent_reviews = []
    for rating in ratings[-5:]:  # Last 5 reviews
        rater = db.query(User).filter(User.id == rating.rated_by).first()
        recent_reviews.append({
            "rating": rating.rating,
            "review": rating.review,
            "reviewer_name": "Anonymous" if rating.is_anonymous else (rater.profile.name if rater.profile else "User"),
            "created_at": rating.created_at.isoformat(),
            "provider_response": rating.provider_response
        })
    
    # Calculate pricing with platform fee for detail view
    base_rate = profile.hourly_rate or 0
    if base_rate > 0:
        pricing = PricingService.calculate_provider_rates(db, base_rate, profile.user_id)
        seeker_rate = pricing["seeker_rate"]
    else:
        seeker_rate = 0
    
    return ProviderDetailResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name or "Anonymous",
        bio=profile.bio or "",
        hourly_rate=seeker_rate,  # Show rate with platform fee to seekers
        provider_base_rate=base_rate,  # Keep original rate for reference
        location=profile.location or "",
        images=profile.images or [],
        services_offered=profile.services_offered or [],
        languages=profile.languages or [],
        verification_status=profile.verification_status,
        avg_rating=round(avg_rating, 1),
        total_ratings=len(ratings),
        is_available_now=True,
        availability=profile.availability or {},
        recent_reviews=recent_reviews
    )

@router.get("/my-profile")
async def get_my_provider_profile(
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """Get current provider's profile"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return {
        "id": profile.id,
        "name": profile.name,
        "bio": profile.bio,
        "hourly_rate": profile.hourly_rate,
        "location": profile.location,
        "images": profile.images or [],
        "services_offered": profile.services_offered or [],
        "languages": profile.languages or [],
        "availability": profile.availability or {},
        "verification_status": profile.verification_status
    }

@router.put("/my-profile")
async def update_my_provider_profile(
    request: ProfileUpdateRequest,
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """Update current provider's profile"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        # Create profile if it doesn't exist
        profile = Profile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    if request.name is not None:
        profile.name = request.name
    if request.bio is not None:
        profile.bio = request.bio
    if request.hourly_rate is not None:
        if request.hourly_rate < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hourly rate must be at least 1 token"
            )
        profile.hourly_rate = request.hourly_rate
    if request.location is not None:
        profile.location = request.location
    if request.services_offered is not None:
        profile.services_offered = request.services_offered
    if request.languages is not None:
        profile.languages = request.languages
    if request.availability is not None:
        # Convert availability slots to JSON format
        availability_dict = {}
        for slot in request.availability:
            if slot.day not in availability_dict:
                availability_dict[slot.day] = []
            availability_dict[slot.day].append({
                "start_time": slot.start_time,
                "end_time": slot.end_time
            })
        profile.availability = availability_dict
    
    # Mark profile for re-verification if significant changes
    if any([request.name, request.bio, request.services_offered]):
        profile.verification_status = ProfileVerificationStatus.PENDING
    
    db.commit()
    
    return {"success": True, "message": "Profile updated successfully"}

@router.post("/my-profile/upload-image")
async def upload_profile_image(
    image_url: str,  # In production, handle file upload
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """Upload profile image"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    if not profile.images:
        profile.images = []
    
    # Limit to 5 images
    if len(profile.images) >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 images allowed"
        )
    
    profile.images.append(image_url)
    profile.verification_status = ProfileVerificationStatus.PENDING  # Re-verify after image upload
    
    db.commit()
    
    return {"success": True, "message": "Image uploaded successfully"}

@router.delete("/my-profile/images/{image_index}")
async def delete_profile_image(
    image_index: int,
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """Delete profile image"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile or not profile.images:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    if image_index < 0 or image_index >= len(profile.images):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image index"
        )
    
    profile.images.pop(image_index)
    db.commit()
    
    return {"success": True, "message": "Image deleted successfully"}

@router.get("/my-earnings")
async def get_provider_earnings(
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """Get provider earnings summary"""
    from app.models.booking import Booking, BookingStatus
    from app.models.token import TokenTransaction, TransactionType
    
    # Get completed bookings
    completed_bookings = db.query(Booking).filter(
        Booking.provider_id == current_user.id,
        Booking.status == BookingStatus.COMPLETED
    ).all()
    
    # Get earnings transactions
    earnings = db.query(TokenTransaction).filter(
        TokenTransaction.user_id == current_user.id,
        TokenTransaction.type == TransactionType.EARNING
    ).all()
    
    total_earnings = sum(t.amount for t in earnings)
    total_bookings = len(completed_bookings)
    platform_commission = total_earnings * settings.PLATFORM_COMMISSION
    net_earnings = total_earnings - platform_commission
    
    return {
        "total_earnings": total_earnings,
        "platform_commission": platform_commission,
        "net_earnings": net_earnings,
        "total_bookings": total_bookings,
        "average_booking_value": total_earnings / total_bookings if total_bookings > 0 else 0,
        "recent_bookings": [
            {
                "id": booking.id,
                "start_time": booking.start_time.isoformat(),
                "duration_hours": booking.duration_hours,
                "total_tokens": booking.total_tokens,
                "status": booking.status
            }
            for booking in completed_bookings[-10:]  # Last 10 bookings
        ]
    }

@router.get("/my-profile/pricing-preview")
async def get_pricing_preview(
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """Get pricing preview showing how listing appears to seekers"""
    return PricingService.get_provider_preview_pricing(db, current_user.id)

@router.get("/my-profile/view-as-seeker")
async def view_profile_as_seeker(
    current_user: User = Depends(require_role([UserRole.PROVIDER])),
    db: Session = Depends(get_db)
):
    """View your profile exactly as seekers see it, including pricing with platform fee"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Get ratings and reviews
    ratings = db.query(Rating).filter(Rating.rated_user == current_user.id).all()
    avg_rating = sum(r.rating for r in ratings) / len(ratings) if ratings else 0
    
    # Get recent reviews
    recent_reviews = []
    for rating in ratings[-5:]:  # Last 5 reviews
        rater = db.query(User).filter(User.id == rating.rated_by).first()
        recent_reviews.append({
            "rating": rating.rating,
            "review": rating.review,
            "reviewer_name": "Anonymous" if rating.is_anonymous else (rater.profile.name if rater.profile else "User"),
            "created_at": rating.created_at.isoformat(),
            "provider_response": rating.provider_response
        })
    
    # Calculate pricing as seekers see it
    base_rate = profile.hourly_rate or 0
    pricing_info = PricingService.get_provider_preview_pricing(db, current_user.id)
    
    seeker_view = {
        "profile": {
            "id": profile.id,
            "name": profile.name or "Anonymous",
            "bio": profile.bio or "",
            "hourly_rate": pricing_info.get("shown_to_seekers", base_rate),
            "location": profile.location or "",
            "images": profile.images or [],
            "services_offered": profile.services_offered or [],
            "languages": profile.languages or [],
            "verification_status": profile.verification_status,
            "avg_rating": round(avg_rating, 1),
            "total_ratings": len(ratings),
            "is_available_now": True,
            "availability": profile.availability or {},
            "recent_reviews": recent_reviews
        },
        "pricing_breakdown": pricing_info,
        "provider_note": "This is exactly how seekers see your profile. The hourly rate shown includes the platform fee."
    }
    
    return seeker_view