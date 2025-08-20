from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class BookingType(str, enum.Enum):
    INCALL = "incall"
    OUTCALL = "outcall"

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    seeker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    duration_hours = Column(Integer, nullable=False)
    total_tokens = Column(Integer, nullable=False)
    booking_type = Column(Enum(BookingType), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    assigned_employee = Column(Integer, ForeignKey("users.id"), nullable=True)
    special_requests = Column(Text, nullable=True)
    location = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    seeker = relationship("User", foreign_keys=[seeker_id], back_populates="seeker_bookings")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="provider_bookings")
    employee = relationship("User", foreign_keys=[assigned_employee])
    chat_messages = relationship("ChatMessage", back_populates="booking")
    token_transactions = relationship("TokenTransaction", back_populates="booking")
    disputes = relationship("Dispute", back_populates="booking")
    ratings = relationship("Rating", back_populates="booking")
    otp_verifications = relationship("OTPVerification", back_populates="booking")