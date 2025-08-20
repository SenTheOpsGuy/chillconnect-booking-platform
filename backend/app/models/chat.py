from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Boolean, JSON, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database.database import Base

class TemplateCategory(str, enum.Enum):
    BOOKING = "booking"
    SERVICE = "service"
    LOGISTICS = "logistics"
    SUPPORT = "support"

class ChatTemplate(Base):
    __tablename__ = "chat_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(Enum(TemplateCategory), nullable=False)
    template_text = Column(Text, nullable=False)
    variables = Column(ARRAY(String), nullable=True)  # array of variable names like [time], [location]
    active = Column(Boolean, default=True)
    admin_only = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")
    messages = relationship("ChatMessage", back_populates="template")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("chat_templates.id"), nullable=False)
    template_variables = Column(JSON, nullable=True)  # values for template variables
    processed_message = Column(Text, nullable=False)  # final message with variables filled
    is_flagged = Column(Boolean, default=False)
    flagged_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    booking = relationship("Booking", back_populates="chat_messages")
    sender = relationship("User", back_populates="sent_messages")
    template = relationship("ChatTemplate", back_populates="messages")