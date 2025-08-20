from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class FeeChangeRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class FeeChangeRequestType(str, enum.Enum):
    GLOBAL = "global"  # Change platform fee for all providers
    INDIVIDUAL = "individual"  # Change fee for specific provider

class PlatformFeeConfig(Base):
    __tablename__ = "platform_fee_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL = global config
    fee_percentage = Column(Float, nullable=False)  # e.g., 0.30 for 30%
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("User", foreign_keys=[provider_id], back_populates="platform_fee_config")
    creator = relationship("User", foreign_keys=[created_by])

class FeeChangeRequest(Base):
    __tablename__ = "fee_change_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    request_type = Column(Enum(FeeChangeRequestType), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL for global changes
    current_fee_percentage = Column(Float, nullable=False)
    requested_fee_percentage = Column(Float, nullable=False)
    justification = Column(Text, nullable=False)
    
    # Request details
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(FeeChangeRequestStatus), default=FeeChangeRequestStatus.PENDING)
    
    # Approval details
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("User", foreign_keys=[provider_id])
    requester = relationship("User", foreign_keys=[requested_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class FeeChangeLog(Base):
    __tablename__ = "fee_change_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL for global changes
    old_fee_percentage = Column(Float, nullable=False)
    new_fee_percentage = Column(Float, nullable=False)
    change_reason = Column(String(255), nullable=False)
    
    # Change details
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_id = Column(Integer, ForeignKey("fee_change_requests.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    provider = relationship("User", foreign_keys=[provider_id])
    changer = relationship("User", foreign_keys=[changed_by])
    related_request = relationship("FeeChangeRequest")