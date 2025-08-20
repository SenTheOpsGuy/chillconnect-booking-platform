from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.deps import get_db, get_current_active_user, get_admin_user
from app.models.user import User, UserRole
from app.models.support import SupportTicket, SupportMessage, HelpArticle, SupportCategory, SupportPriority, SupportStatus
from app.services.email import send_support_ticket_email
from pydantic import BaseModel

router = APIRouter()

class SupportTicketCreate(BaseModel):
    category: SupportCategory
    priority: SupportPriority = SupportPriority.MEDIUM
    subject: str
    description: str

class SupportTicketResponse(BaseModel):
    id: int
    category: SupportCategory
    priority: SupportPriority
    subject: str
    description: str
    status: SupportStatus
    created_at: str
    resolution: Optional[str]

class SupportMessageCreate(BaseModel):
    message: str
    is_internal: bool = False

class SupportMessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    message: str
    is_internal: bool
    created_at: str

class HelpArticleResponse(BaseModel):
    id: int
    category: str
    title: str
    content: str
    tags: str
    views: int
    helpful_votes: int

@router.post("/tickets", response_model=SupportTicketResponse)
async def create_support_ticket(
    request: SupportTicketCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new support ticket"""
    ticket = SupportTicket(
        user_id=current_user.id,
        category=request.category,
        priority=request.priority,
        subject=request.subject,
        description=request.description
    )
    
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    # Send confirmation email
    try:
        await send_support_ticket_email(current_user.email, ticket.id, ticket.subject)
    except Exception as e:
        print(f"Failed to send support ticket email: {e}")
    
    # Auto-assign to available agent (simplified)
    available_agents = db.query(User).filter(
        User.role.in_([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN]),
        User.is_active == True
    ).all()
    
    if available_agents:
        # Simple round-robin assignment
        ticket.assigned_agent = available_agents[ticket.id % len(available_agents)].id
        db.commit()
    
    return SupportTicketResponse(
        id=ticket.id,
        category=ticket.category,
        priority=ticket.priority,
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status,
        created_at=ticket.created_at.isoformat(),
        resolution=ticket.resolution
    )

@router.get("/tickets", response_model=List[SupportTicketResponse])
async def get_my_support_tickets(
    current_user: User = Depends(get_current_active_user),
    status_filter: Optional[SupportStatus] = None,
    db: Session = Depends(get_db)
):
    """Get user's support tickets"""
    query = db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(SupportTicket.status == status_filter)
    
    tickets = query.order_by(SupportTicket.created_at.desc()).all()
    
    return [
        SupportTicketResponse(
            id=ticket.id,
            category=ticket.category,
            priority=ticket.priority,
            subject=ticket.subject,
            description=ticket.description,
            status=ticket.status,
            created_at=ticket.created_at.isoformat(),
            resolution=ticket.resolution
        )
        for ticket in tickets
    ]

@router.get("/tickets/{ticket_id}/messages", response_model=List[SupportMessageResponse])
async def get_ticket_messages(
    ticket_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get messages for a support ticket"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check access permissions
    if (ticket.user_id != current_user.id and 
        current_user.role not in [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    messages = db.query(SupportMessage).filter(
        SupportMessage.ticket_id == ticket_id
    ).order_by(SupportMessage.created_at.asc()).all()
    
    # Filter internal messages for regular users
    if current_user.role not in [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        messages = [msg for msg in messages if not msg.is_internal]
    
    message_responses = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        sender_name = "Support Agent" if sender.role in [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN] else (sender.profile.name if sender.profile else sender.email)
        
        message_responses.append(SupportMessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=sender_name,
            message=msg.message,
            is_internal=msg.is_internal,
            created_at=msg.created_at.isoformat()
        ))
    
    return message_responses

@router.post("/tickets/{ticket_id}/messages")
async def add_ticket_message(
    ticket_id: int,
    request: SupportMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add message to support ticket"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check access permissions
    if (ticket.user_id != current_user.id and 
        current_user.role not in [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Only admins/agents can send internal messages
    if request.is_internal and current_user.role not in [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot send internal messages"
        )
    
    message = SupportMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        message=request.message,
        is_internal=request.is_internal
    )
    
    db.add(message)
    
    # Update ticket status if customer responds
    if ticket.user_id == current_user.id and ticket.status == SupportStatus.RESOLVED:
        ticket.status = SupportStatus.OPEN
    elif current_user.role in [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN] and ticket.status == SupportStatus.OPEN:
        ticket.status = SupportStatus.IN_PROGRESS
    
    db.commit()
    
    return {"success": True, "message": "Message added successfully"}

@router.get("/help-articles", response_model=List[HelpArticleResponse])
async def get_help_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get help articles"""
    query = db.query(HelpArticle)
    
    if category:
        query = query.filter(HelpArticle.category == category)
    
    if search:
        query = query.filter(
            HelpArticle.title.ilike(f"%{search}%") |
            HelpArticle.content.ilike(f"%{search}%") |
            HelpArticle.tags.ilike(f"%{search}%")
        )
    
    articles = query.order_by(HelpArticle.views.desc()).all()
    
    return [
        HelpArticleResponse(
            id=article.id,
            category=article.category,
            title=article.title,
            content=article.content,
            tags=article.tags or "",
            views=article.views,
            helpful_votes=article.helpful_votes
        )
        for article in articles
    ]

@router.get("/help-articles/{article_id}", response_model=HelpArticleResponse)
async def get_help_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    """Get specific help article and increment view count"""
    article = db.query(HelpArticle).filter(HelpArticle.id == article_id).first()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    # Increment view count
    article.views += 1
    db.commit()
    
    return HelpArticleResponse(
        id=article.id,
        category=article.category,
        title=article.title,
        content=article.content,
        tags=article.tags or "",
        views=article.views,
        helpful_votes=article.helpful_votes
    )

@router.post("/help-articles/{article_id}/helpful")
async def mark_article_helpful(
    article_id: int,
    db: Session = Depends(get_db)
):
    """Mark help article as helpful"""
    article = db.query(HelpArticle).filter(HelpArticle.id == article_id).first()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    article.helpful_votes += 1
    db.commit()
    
    return {"success": True, "message": "Thank you for your feedback!"}

@router.get("/help-categories")
async def get_help_categories(db: Session = Depends(get_db)):
    """Get all help article categories"""
    categories = db.query(HelpArticle.category).distinct().all()
    return {"categories": [cat[0] for cat in categories]}

# Admin endpoints for managing support system
@router.get("/admin/tickets", response_model=List[dict])
async def get_all_support_tickets(
    current_user: User = Depends(get_admin_user),
    status_filter: Optional[SupportStatus] = None,
    priority_filter: Optional[SupportPriority] = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db)
):
    """Get all support tickets for admin management"""
    query = db.query(SupportTicket)
    
    if status_filter:
        query = query.filter(SupportTicket.status == status_filter)
    
    if priority_filter:
        query = query.filter(SupportTicket.priority == priority_filter)
    
    if assigned_to_me:
        query = query.filter(SupportTicket.assigned_agent == current_user.id)
    
    tickets = query.order_by(SupportTicket.created_at.desc()).all()
    
    ticket_data = []
    for ticket in tickets:
        user = db.query(User).filter(User.id == ticket.user_id).first()
        agent = db.query(User).filter(User.id == ticket.assigned_agent).first() if ticket.assigned_agent else None
        
        ticket_data.append({
            "id": ticket.id,
            "user_email": user.email,
            "category": ticket.category,
            "priority": ticket.priority,
            "subject": ticket.subject,
            "status": ticket.status,
            "assigned_agent": agent.email if agent else None,
            "created_at": ticket.created_at.isoformat(),
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None
        })
    
    return ticket_data

@router.put("/admin/tickets/{ticket_id}/assign")
async def assign_support_ticket(
    ticket_id: int,
    agent_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Assign support ticket to an agent"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Verify agent exists and has appropriate role
    agent = db.query(User).filter(
        User.id == agent_id,
        User.role.in_([UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN]),
        User.is_active == True
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    ticket.assigned_agent = agent_id
    if ticket.status == SupportStatus.OPEN:
        ticket.status = SupportStatus.IN_PROGRESS
    
    db.commit()
    
    return {"success": True, "message": f"Ticket assigned to {agent.email}"}

@router.put("/admin/tickets/{ticket_id}/resolve")
async def resolve_support_ticket(
    ticket_id: int,
    resolution: str,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Resolve support ticket"""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    ticket.status = SupportStatus.RESOLVED
    ticket.resolution = resolution
    ticket.resolved_at = db.func.now()
    
    # Add resolution message
    resolution_message = SupportMessage(
        ticket_id=ticket_id,
        sender_id=current_user.id,
        message=f"Resolution: {resolution}",
        is_internal=False
    )
    
    db.add(resolution_message)
    db.commit()
    
    return {"success": True, "message": "Ticket resolved successfully"}