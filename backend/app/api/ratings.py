from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.deps import get_db, get_current_active_user
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus
from app.models.rating import Rating
from app.models.profile import Profile
from pydantic import BaseModel

router = APIRouter()

class RatingCreate(BaseModel):
    booking_id: int
    rating: int  # 1-5 stars
    review: Optional[str] = None
    is_anonymous: bool = False

class RatingResponse(BaseModel):
    id: int
    booking_id: int
    rating: int
    review: Optional[str]
    is_anonymous: bool
    reviewer_name: str
    provider_response: Optional[str]
    created_at: str

class ProviderRatingsSummary(BaseModel):
    provider_id: int
    provider_name: str
    average_rating: float
    total_ratings: int
    rating_distribution: dict
    recent_reviews: List[RatingResponse]

@router.post("/create", response_model=RatingResponse)
async def create_rating(
    request: RatingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a rating for a completed booking"""
    # Validate rating value
    if request.rating < 1 or request.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    # Get booking
    booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify booking is completed
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate completed bookings"
        )
    
    # Verify user was part of this booking
    if current_user.id not in [booking.seeker_id, booking.provider_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only rate bookings you were part of"
        )
    
    # Check if rating already exists
    existing_rating = db.query(Rating).filter(
        Rating.booking_id == request.booking_id,
        Rating.rated_by == current_user.id
    ).first()
    
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already rated this booking"
        )
    
    # Determine who is being rated
    if current_user.id == booking.seeker_id:
        rated_user_id = booking.provider_id  # Seeker rating provider
    else:
        rated_user_id = booking.seeker_id    # Provider rating seeker
    
    # Create rating
    rating = Rating(
        booking_id=request.booking_id,
        rated_by=current_user.id,
        rated_user=rated_user_id,
        rating=request.rating,
        review=request.review,
        is_anonymous=1 if request.is_anonymous else 0
    )
    
    db.add(rating)
    db.commit()
    db.refresh(rating)
    
    # Get reviewer name
    reviewer_name = "Anonymous" if request.is_anonymous else (
        current_user.profile.name if current_user.profile and current_user.profile.name 
        else current_user.email
    )
    
    return RatingResponse(
        id=rating.id,
        booking_id=rating.booking_id,
        rating=rating.rating,
        review=rating.review,
        is_anonymous=bool(rating.is_anonymous),
        reviewer_name=reviewer_name,
        provider_response=rating.provider_response,
        created_at=rating.created_at.isoformat()
    )

@router.get("/provider/{provider_id}", response_model=ProviderRatingsSummary)
async def get_provider_ratings(
    provider_id: int,
    db: Session = Depends(get_db)
):
    """Get all ratings for a provider"""
    # Verify provider exists
    provider = db.query(User).filter(
        User.id == provider_id,
        User.role == UserRole.PROVIDER
    ).first()
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    # Get provider profile
    profile = db.query(Profile).filter(Profile.user_id == provider_id).first()
    provider_name = profile.name if profile and profile.name else "Provider"
    
    # Get all ratings for this provider
    ratings = db.query(Rating).filter(Rating.rated_user == provider_id).all()
    
    if not ratings:
        return ProviderRatingsSummary(
            provider_id=provider_id,
            provider_name=provider_name,
            average_rating=0.0,
            total_ratings=0,
            rating_distribution={},
            recent_reviews=[]
        )
    
    # Calculate statistics
    total_ratings = len(ratings)
    average_rating = sum(r.rating for r in ratings) / total_ratings
    
    # Rating distribution (1-5 stars)
    rating_distribution = {str(i): 0 for i in range(1, 6)}
    for rating in ratings:
        rating_distribution[str(rating.rating)] += 1
    
    # Get recent reviews (last 10)
    recent_ratings = sorted(ratings, key=lambda x: x.created_at, reverse=True)[:10]
    recent_reviews = []
    
    for rating in recent_ratings:
        # Get reviewer info
        reviewer = db.query(User).filter(User.id == rating.rated_by).first()
        reviewer_name = "Anonymous" if rating.is_anonymous else (
            reviewer.profile.name if reviewer.profile and reviewer.profile.name 
            else "User"
        )
        
        recent_reviews.append(RatingResponse(
            id=rating.id,
            booking_id=rating.booking_id,
            rating=rating.rating,
            review=rating.review,
            is_anonymous=bool(rating.is_anonymous),
            reviewer_name=reviewer_name,
            provider_response=rating.provider_response,
            created_at=rating.created_at.isoformat()
        ))
    
    return ProviderRatingsSummary(
        provider_id=provider_id,
        provider_name=provider_name,
        average_rating=round(average_rating, 1),
        total_ratings=total_ratings,
        rating_distribution=rating_distribution,
        recent_reviews=recent_reviews
    )

@router.get("/my-ratings")
async def get_my_ratings(
    current_user: User = Depends(get_current_active_user),
    as_reviewer: bool = True,
    db: Session = Depends(get_db)
):
    """Get ratings given or received by current user"""
    if as_reviewer:
        # Ratings given by current user
        ratings = db.query(Rating).filter(Rating.rated_by == current_user.id).all()
    else:
        # Ratings received by current user
        ratings = db.query(Rating).filter(Rating.rated_user == current_user.id).all()
    
    rating_responses = []
    for rating in ratings:
        # Get booking details
        booking = db.query(Booking).filter(Booking.id == rating.booking_id).first()
        
        # Get other user's info
        if as_reviewer:
            other_user = db.query(User).filter(User.id == rating.rated_user).first()
        else:
            other_user = db.query(User).filter(User.id == rating.rated_by).first()
        
        other_user_name = "Anonymous" if (not as_reviewer and rating.is_anonymous) else (
            other_user.profile.name if other_user.profile and other_user.profile.name 
            else "User"
        )
        
        rating_responses.append({
            "id": rating.id,
            "booking_id": rating.booking_id,
            "rating": rating.rating,
            "review": rating.review,
            "is_anonymous": bool(rating.is_anonymous),
            "other_user_name": other_user_name,
            "provider_response": rating.provider_response,
            "created_at": rating.created_at.isoformat(),
            "booking_date": booking.start_time.isoformat() if booking else None
        })
    
    return {"ratings": rating_responses}

@router.put("/respond/{rating_id}")
async def respond_to_rating(
    rating_id: int,
    response: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Respond to a rating (providers only)"""
    rating = db.query(Rating).filter(Rating.id == rating_id).first()
    
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )
    
    # Verify current user is the provider who was rated
    if rating.rated_user != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only respond to ratings about you"
        )
    
    # Verify user is a provider
    if current_user.role != UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only providers can respond to ratings"
        )
    
    # Check if response already exists
    if rating.provider_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already responded to this rating"
        )
    
    rating.provider_response = response
    db.commit()
    
    return {"success": True, "message": "Response added successfully"}

@router.get("/statistics")
async def get_rating_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get rating statistics for current user"""
    if current_user.role == UserRole.PROVIDER:
        # Provider statistics
        ratings = db.query(Rating).filter(Rating.rated_user == current_user.id).all()
        
        if not ratings:
            return {
                "user_type": "provider",
                "total_ratings": 0,
                "average_rating": 0.0,
                "rating_distribution": {},
                "response_rate": 0.0
            }
        
        total_ratings = len(ratings)
        average_rating = sum(r.rating for r in ratings) / total_ratings
        
        # Rating distribution
        rating_distribution = {str(i): 0 for i in range(1, 6)}
        responses_given = 0
        
        for rating in ratings:
            rating_distribution[str(rating.rating)] += 1
            if rating.provider_response:
                responses_given += 1
        
        response_rate = (responses_given / total_ratings) * 100 if total_ratings > 0 else 0
        
        return {
            "user_type": "provider",
            "total_ratings": total_ratings,
            "average_rating": round(average_rating, 1),
            "rating_distribution": rating_distribution,
            "response_rate": round(response_rate, 1)
        }
    
    else:
        # Seeker statistics
        ratings_given = db.query(Rating).filter(Rating.rated_by == current_user.id).count()
        bookings_completed = db.query(Booking).filter(
            Booking.seeker_id == current_user.id,
            Booking.status == BookingStatus.COMPLETED
        ).count()
        
        rating_rate = (ratings_given / bookings_completed) * 100 if bookings_completed > 0 else 0
        
        return {
            "user_type": "seeker",
            "ratings_given": ratings_given,
            "bookings_completed": bookings_completed,
            "rating_rate": round(rating_rate, 1)
        }

@router.delete("/{rating_id}")
async def delete_rating(
    rating_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a rating (admin only or within 24 hours)"""
    rating = db.query(Rating).filter(Rating.id == rating_id).first()
    
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )
    
    # Check permissions
    is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    is_owner = rating.rated_by == current_user.id
    
    # Check if within 24 hours for non-admins
    from datetime import datetime, timedelta
    within_24_hours = datetime.utcnow() - rating.created_at < timedelta(hours=24)
    
    if not is_admin and not (is_owner and within_24_hours):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own ratings within 24 hours"
        )
    
    db.delete(rating)
    db.commit()
    
    return {"success": True, "message": "Rating deleted successfully"}