from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class SupportCategory(str, enum.Enum):
    ACCOUNT = "account"
    TOKENS = "tokens"
    BOOKING = "booking"
    SAFETY = "safety"
    TECHNICAL = "technical"

class SupportPriority(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class SupportStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(Enum(SupportCategory), nullable=False)
    priority = Column(Enum(SupportPriority), default=SupportPriority.MEDIUM)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(SupportStatus), default=SupportStatus.OPEN)
    assigned_agent = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="support_tickets")
    agent = relationship("User", foreign_keys=[assigned_agent])
    messages = relationship("SupportMessage", back_populates="ticket")

class SupportMessage(Base):
    __tablename__ = "support_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)  # internal agent notes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")
    sender = relationship("User")

class HelpArticle(Base):
    __tablename__ = "help_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(500), nullable=True)  # comma-separated tags
    views = Column(Integer, default=0)
    helpful_votes = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    author = relationship("User")