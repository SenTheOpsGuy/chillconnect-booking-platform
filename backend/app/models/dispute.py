from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class DisputeType(str, enum.Enum):
    NO_SHOW = "no_show"
    SERVICE_QUALITY = "service_quality"
    PAYMENT = "payment"
    BEHAVIOR = "behavior"
    PLATFORM_VIOLATION = "platform_violation"

class DisputeStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"

class Dispute(Base):
    __tablename__ = "disputes"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    dispute_type = Column(Enum(DisputeType), nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(Text, nullable=True)  # JSON string of evidence files/details
    status = Column(Enum(DisputeStatus), default=DisputeStatus.OPEN)
    assigned_manager = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution = Column(Text, nullable=True)
    resolution_amount = Column(Integer, nullable=True)  # tokens refunded/compensated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    booking = relationship("Booking", back_populates="disputes")
    reporter = relationship("User", foreign_keys=[reported_by], back_populates="disputes")
    manager = relationship("User", foreign_keys=[assigned_manager], back_populates="assigned_disputes")