from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class VerificationType(str, enum.Enum):
    IDENTITY = "identity"
    PROFILE = "profile"
    DOCUMENTS = "documents"

class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Verification(Base):
    __tablename__ = "verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_type = Column(Enum(VerificationType), nullable=False)
    status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    documents = Column(ARRAY(String), nullable=True)  # array of document URLs
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="verifications")
    employee = relationship("User", foreign_keys=[employee_id], back_populates="employee_verifications")

class AssignmentType(str, enum.Enum):
    BOOKING = "booking"
    VERIFICATION = "verification"

class AssignmentStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, nullable=False)  # booking_id or verification_id
    item_type = Column(Enum(AssignmentType), nullable=False)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.ASSIGNED)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    employee = relationship("User")