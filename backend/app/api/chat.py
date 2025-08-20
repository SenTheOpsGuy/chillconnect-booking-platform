from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.deps import get_db, get_current_active_user, get_admin_user
from app.models.user import User, UserRole
from app.models.chat import ChatTemplate, ChatMessage, TemplateCategory
from app.models.booking import Booking
from pydantic import BaseModel
import re

router = APIRouter()

class TemplateCreateRequest(BaseModel):
    category: TemplateCategory
    template_text: str
    variables: List[str] = []
    admin_only: bool = False

class TemplateResponse(BaseModel):
    id: int
    category: TemplateCategory
    template_text: str
    variables: List[str]
    active: bool
    admin_only: bool
    usage_count: int

class SendMessageRequest(BaseModel):
    template_id: int
    variables: Dict[str, str] = {}

class ChatMessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    template_id: int
    template_text: str
    processed_message: str
    created_at: str
    is_flagged: bool

def process_template_message(template_text: str, variables: Dict[str, str]) -> str:
    """Process template by replacing variables with values"""
    processed = template_text
    for var_name, var_value in variables.items():
        placeholder = f"[{var_name}]"
        processed = processed.replace(placeholder, var_value)
    return processed

def validate_template_variables(template_text: str, provided_variables: Dict[str, str]) -> bool:
    """Validate that all required variables are provided"""
    # Find all variables in template (format: [variable_name])
    required_vars = re.findall(r'\[(\w+)\]', template_text)
    
    for var in required_vars:
        if var not in provided_variables:
            return False
    return True

@router.get("/templates", response_model=List[TemplateResponse])
async def get_chat_templates(
    category: TemplateCategory = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get available chat templates"""
    query = db.query(ChatTemplate).filter(ChatTemplate.active == True)
    
    if category:
        query = query.filter(ChatTemplate.category == category)
    
    # Filter admin-only templates
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]:
        query = query.filter(ChatTemplate.admin_only == False)
    
    templates = query.order_by(ChatTemplate.usage_count.desc()).all()
    
    return [
        TemplateResponse(
            id=t.id,
            category=t.category,
            template_text=t.template_text,
            variables=t.variables or [],
            active=t.active,
            admin_only=t.admin_only,
            usage_count=t.usage_count
        )
        for t in templates
    ]

@router.post("/templates", response_model=TemplateResponse)
async def create_chat_template(
    request: TemplateCreateRequest,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create new chat template (admin only)"""
    template = ChatTemplate(
        category=request.category,
        template_text=request.template_text,
        variables=request.variables,
        admin_only=request.admin_only,
        created_by=current_user.id
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return TemplateResponse(
        id=template.id,
        category=template.category,
        template_text=template.template_text,
        variables=template.variables or [],
        active=template.active,
        admin_only=template.admin_only,
        usage_count=template.usage_count
    )

@router.put("/templates/{template_id}")
async def update_chat_template(
    template_id: int,
    request: TemplateCreateRequest,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update chat template (admin only)"""
    template = db.query(ChatTemplate).filter(ChatTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    template.category = request.category
    template.template_text = request.template_text
    template.variables = request.variables
    template.admin_only = request.admin_only
    
    db.commit()
    
    return {"success": True, "message": "Template updated successfully"}

@router.delete("/templates/{template_id}")
async def delete_chat_template(
    template_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Deactivate chat template (admin only)"""
    template = db.query(ChatTemplate).filter(ChatTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    template.active = False
    db.commit()
    
    return {"success": True, "message": "Template deactivated successfully"}

@router.get("/{booking_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get chat messages for a booking"""
    # Verify user has access to this booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check if user is part of this booking or an admin/employee
    if (current_user.id not in [booking.seeker_id, booking.provider_id] and 
        current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.booking_id == booking_id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    response_messages = []
    for msg in messages:
        # Get sender info
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        template = db.query(ChatTemplate).filter(ChatTemplate.id == msg.template_id).first()
        
        response_messages.append(ChatMessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=sender.profile.name if sender.profile and sender.profile.name else sender.email,
            template_id=msg.template_id,
            template_text=template.template_text if template else "",
            processed_message=msg.processed_message,
            created_at=msg.created_at.isoformat(),
            is_flagged=msg.is_flagged
        ))
    
    return response_messages

@router.post("/{booking_id}/send", response_model=ChatMessageResponse)
async def send_chat_message(
    booking_id: int,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a template-based chat message"""
    # Verify booking exists and user has access
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if current_user.id not in [booking.seeker_id, booking.provider_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get template
    template = db.query(ChatTemplate).filter(
        ChatTemplate.id == request.template_id,
        ChatTemplate.active == True
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or inactive"
        )
    
    # Check admin-only templates
    if (template.admin_only and 
        current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Template requires admin privileges"
        )
    
    # Validate variables
    if not validate_template_variables(template.template_text, request.variables):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required template variables"
        )
    
    # Process message
    processed_message = process_template_message(template.template_text, request.variables)
    
    # Create chat message
    chat_message = ChatMessage(
        booking_id=booking_id,
        sender_id=current_user.id,
        template_id=template.id,
        template_variables=request.variables,
        processed_message=processed_message
    )
    
    db.add(chat_message)
    
    # Update template usage count
    template.usage_count += 1
    
    db.commit()
    db.refresh(chat_message)
    
    # Get sender info for response
    sender_name = current_user.profile.name if current_user.profile and current_user.profile.name else current_user.email
    
    return ChatMessageResponse(
        id=chat_message.id,
        sender_id=current_user.id,
        sender_name=sender_name,
        template_id=template.id,
        template_text=template.template_text,
        processed_message=processed_message,
        created_at=chat_message.created_at.isoformat(),
        is_flagged=False
    )

@router.post("/messages/{message_id}/flag")
async def flag_message(
    message_id: int,
    reason: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Flag a chat message for admin review"""
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user has access to this booking
    booking = db.query(Booking).filter(Booking.id == message.booking_id).first()
    if current_user.id not in [booking.seeker_id, booking.provider_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    message.is_flagged = True
    message.flagged_reason = reason
    db.commit()
    
    return {"success": True, "message": "Message flagged for admin review"}

@router.get("/flagged-messages")
async def get_flagged_messages(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all flagged messages for admin review"""
    flagged_messages = db.query(ChatMessage).filter(
        ChatMessage.is_flagged == True
    ).order_by(ChatMessage.created_at.desc()).all()
    
    response = []
    for msg in flagged_messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        booking = db.query(Booking).filter(Booking.id == msg.booking_id).first()
        template = db.query(ChatTemplate).filter(ChatTemplate.id == msg.template_id).first()
        
        response.append({
            "message_id": msg.id,
            "booking_id": msg.booking_id,
            "sender_id": msg.sender_id,
            "sender_email": sender.email,
            "template_text": template.template_text if template else "",
            "processed_message": msg.processed_message,
            "flagged_reason": msg.flagged_reason,
            "created_at": msg.created_at.isoformat(),
            "booking_participants": {
                "seeker_id": booking.seeker_id,
                "provider_id": booking.provider_id
            }
        })
    
    return {"flagged_messages": response}