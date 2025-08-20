from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Rating(Base):
    __tablename__ = "ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    rated_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # who gave the rating
    rated_user = Column(Integer, ForeignKey("users.id"), nullable=False)  # who received the rating
    rating = Column(Integer, nullable=False)
    review = Column(Text, nullable=True)
    is_anonymous = Column(Integer, default=0)  # 0 = show name, 1 = anonymous
    provider_response = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range'),
    )
    
    # Relationships
    booking = relationship("Booking", back_populates="ratings")
    rater = relationship("User", foreign_keys=[rated_by], back_populates="ratings_given")
    rated_user_rel = relationship("User", foreign_keys=[rated_user], back_populates="ratings_received")