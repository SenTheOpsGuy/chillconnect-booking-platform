from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class UserRole(str, enum.Enum):
    SEEKER = "seeker"
    PROVIDER = "provider"
    EMPLOYEE = "employee"
    MANAGER = "manager"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    age_confirmed = Column(Boolean, default=False)
    phone = Column(String(20), unique=True, nullable=True)
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False)
    tokens = relationship("Token", back_populates="user", uselist=False)
    seeker_bookings = relationship("Booking", foreign_keys="Booking.seeker_id", back_populates="seeker")
    provider_bookings = relationship("Booking", foreign_keys="Booking.provider_id", back_populates="provider")
    sent_messages = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender")
    support_tickets = relationship("SupportTicket", foreign_keys="SupportTicket.user_id", back_populates="user")
    verifications = relationship("Verification", foreign_keys="Verification.user_id", back_populates="user")
    employee_verifications = relationship("Verification", foreign_keys="Verification.employee_id", back_populates="employee")
    disputes = relationship("Dispute", foreign_keys="Dispute.reported_by", back_populates="reporter")
    assigned_disputes = relationship("Dispute", foreign_keys="Dispute.assigned_manager", back_populates="manager")
    ratings_given = relationship("Rating", foreign_keys="Rating.rated_by", back_populates="rater")
    ratings_received = relationship("Rating", foreign_keys="Rating.rated_user", back_populates="rated_user_rel")
    platform_fee_config = relationship("PlatformFeeConfig", foreign_keys="PlatformFeeConfig.provider_id", back_populates="provider")
    otp_verifications = relationship("OTPVerification", back_populates="user")