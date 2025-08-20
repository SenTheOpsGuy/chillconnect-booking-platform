from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, ARRAY, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class ProfileVerificationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    hourly_rate = Column(Integer, nullable=True)  # in tokens
    images = Column(ARRAY(String), nullable=True)  # array of image URLs
    location = Column(String(255), nullable=True)
    availability = Column(JSON, nullable=True)  # flexible availability structure
    verification_status = Column(Enum(ProfileVerificationStatus), default=ProfileVerificationStatus.PENDING)
    services_offered = Column(ARRAY(String), nullable=True)
    languages = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="profile")