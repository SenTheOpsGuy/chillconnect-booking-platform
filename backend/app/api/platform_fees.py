from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.deps import get_db, require_role
from app.models.user import User, UserRole
from app.models.platform_fee import (
    PlatformFeeConfig, FeeChangeRequest, FeeChangeLog,
    FeeChangeRequestStatus, FeeChangeRequestType
)
from app.services.pricing import PricingService
from pydantic import BaseModel

router = APIRouter()

class FeeConfigResponse(BaseModel):
    id: int
    provider_id: Optional[int]
    provider_email: Optional[str]
    fee_percentage: float
    fee_percentage_display: int  # 30 for 30%
    is_active: bool
    created_by: int
    created_at: str

class FeeChangeRequestCreate(BaseModel):
    request_type: FeeChangeRequestType
    provider_id: Optional[int] = None
    requested_fee_percentage: float
    justification: str

class FeeChangeRequestResponse(BaseModel):
    id: int
    request_type: FeeChangeRequestType
    provider_id: Optional[int]
    provider_email: Optional[str]
    current_fee_percentage: float
    requested_fee_percentage: float
    justification: str
    status: FeeChangeRequestStatus
    requested_by: int
    requester_email: str
    reviewed_by: Optional[int]
    reviewer_email: Optional[str]
    review_notes: Optional[str]
    reviewed_at: Optional[str]
    created_at: str

class FeeChangeApproval(BaseModel):
    approved: bool
    review_notes: Optional[str] = None

class FeeChangeLogResponse(BaseModel):
    id: int
    provider_id: Optional[int]
    provider_email: Optional[str]
    old_fee_percentage: float
    new_fee_percentage: float
    change_reason: str
    changed_by: int
    changer_email: str
    created_at: str

@router.get("/configs", response_model=List[FeeConfigResponse])
async def get_fee_configs(
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get all platform fee configurations"""
    query = db.query(PlatformFeeConfig)
    
    if active_only:
        query = query.filter(PlatformFeeConfig.is_active == True)
    
    configs = query.order_by(PlatformFeeConfig.created_at.desc()).all()
    
    result = []
    for config in configs:
        provider_email = None
        if config.provider_id:
            provider = db.query(User).filter(User.id == config.provider_id).first()
            provider_email = provider.email if provider else "Unknown"
        
        result.append(FeeConfigResponse(
            id=config.id,
            provider_id=config.provider_id,
            provider_email=provider_email,
            fee_percentage=config.fee_percentage,
            fee_percentage_display=int(config.fee_percentage * 100),
            is_active=config.is_active,
            created_by=config.created_by,
            created_at=config.created_at.isoformat()
        ))
    
    return result

@router.post("/set-global-fee")
async def set_global_platform_fee(
    fee_percentage: float,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Set global platform fee (Super Admin only)"""
    if fee_percentage < 0 or fee_percentage > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fee percentage must be between 0 and 1 (0% to 100%)"
        )
    
    # Get current global fee for logging
    current_config = db.query(PlatformFeeConfig).filter(
        PlatformFeeConfig.provider_id.is_(None),
        PlatformFeeConfig.is_active == True
    ).first()
    
    old_fee = current_config.fee_percentage if current_config else 0.15
    
    # Set new fee
    new_config = PricingService.set_platform_fee(db, current_user.id, fee_percentage)
    
    # Log the change
    log_entry = FeeChangeLog(
        provider_id=None,
        old_fee_percentage=old_fee,
        new_fee_percentage=fee_percentage,
        change_reason="Global fee update by Super Admin",
        changed_by=current_user.id
    )
    db.add(log_entry)
    db.commit()
    
    return {
        "success": True,
        "message": f"Global platform fee updated to {int(fee_percentage * 100)}%",
        "old_fee": f"{int(old_fee * 100)}%",
        "new_fee": f"{int(fee_percentage * 100)}%"
    }

@router.post("/set-provider-fee/{provider_id}")
async def set_provider_platform_fee(
    provider_id: int,
    fee_percentage: float,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Set platform fee for specific provider (Super Admin only)"""
    if fee_percentage < 0 or fee_percentage > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fee percentage must be between 0 and 1 (0% to 100%)"
        )
    
    # Verify provider exists
    provider = db.query(User).filter(
        User.id == provider_id,
        User.role == UserRole.PROVIDER
    ).first()
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    # Get current fee for logging
    old_fee = PricingService.get_platform_fee_percentage(db, provider_id)
    
    # Set new fee
    new_config = PricingService.set_platform_fee(db, current_user.id, fee_percentage, provider_id)
    
    # Log the change
    log_entry = FeeChangeLog(
        provider_id=provider_id,
        old_fee_percentage=old_fee,
        new_fee_percentage=fee_percentage,
        change_reason=f"Individual fee update for provider {provider.email}",
        changed_by=current_user.id
    )
    db.add(log_entry)
    db.commit()
    
    return {
        "success": True,
        "message": f"Platform fee for {provider.email} updated to {int(fee_percentage * 100)}%",
        "provider_email": provider.email,
        "old_fee": f"{int(old_fee * 100)}%",
        "new_fee": f"{int(fee_percentage * 100)}%"
    }

@router.post("/request-change", response_model=FeeChangeRequestResponse)
async def create_fee_change_request(
    request: FeeChangeRequestCreate,
    current_user: User = Depends(require_role([UserRole.EMPLOYEE, UserRole.MANAGER])),
    db: Session = Depends(get_db)
):
    """Create a fee change request (Employee/Manager only)"""
    if request.requested_fee_percentage < 0 or request.requested_fee_percentage > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fee percentage must be between 0 and 1 (0% to 100%)"
        )
    
    # Get current fee
    current_fee = PricingService.get_platform_fee_percentage(db, request.provider_id)
    
    # Verify provider exists if individual request
    provider = None
    if request.provider_id:
        provider = db.query(User).filter(
            User.id == request.provider_id,
            User.role == UserRole.PROVIDER
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
    
    # Create request
    fee_request = FeeChangeRequest(
        request_type=request.request_type,
        provider_id=request.provider_id,
        current_fee_percentage=current_fee,
        requested_fee_percentage=request.requested_fee_percentage,
        justification=request.justification,
        requested_by=current_user.id
    )
    
    db.add(fee_request)
    db.commit()
    db.refresh(fee_request)
    
    return FeeChangeRequestResponse(
        id=fee_request.id,
        request_type=fee_request.request_type,
        provider_id=fee_request.provider_id,
        provider_email=provider.email if provider else None,
        current_fee_percentage=fee_request.current_fee_percentage,
        requested_fee_percentage=fee_request.requested_fee_percentage,
        justification=fee_request.justification,
        status=fee_request.status,
        requested_by=fee_request.requested_by,
        requester_email=current_user.email,
        reviewed_by=fee_request.reviewed_by,
        reviewer_email=None,
        review_notes=fee_request.review_notes,
        reviewed_at=fee_request.reviewed_at.isoformat() if fee_request.reviewed_at else None,
        created_at=fee_request.created_at.isoformat()
    )

@router.get("/requests", response_model=List[FeeChangeRequestResponse])
async def get_fee_change_requests(
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    status_filter: Optional[FeeChangeRequestStatus] = Query(None),
    db: Session = Depends(get_db)
):
    """Get fee change requests"""
    query = db.query(FeeChangeRequest)
    
    if status_filter:
        query = query.filter(FeeChangeRequest.status == status_filter)
    
    requests = query.order_by(FeeChangeRequest.created_at.desc()).all()
    
    result = []
    for req in requests:
        # Get requester info
        requester = db.query(User).filter(User.id == req.requested_by).first()
        
        # Get provider info if applicable
        provider = None
        if req.provider_id:
            provider = db.query(User).filter(User.id == req.provider_id).first()
        
        # Get reviewer info if applicable
        reviewer = None
        if req.reviewed_by:
            reviewer = db.query(User).filter(User.id == req.reviewed_by).first()
        
        result.append(FeeChangeRequestResponse(
            id=req.id,
            request_type=req.request_type,
            provider_id=req.provider_id,
            provider_email=provider.email if provider else None,
            current_fee_percentage=req.current_fee_percentage,
            requested_fee_percentage=req.requested_fee_percentage,
            justification=req.justification,
            status=req.status,
            requested_by=req.requested_by,
            requester_email=requester.email if requester else "Unknown",
            reviewed_by=req.reviewed_by,
            reviewer_email=reviewer.email if reviewer else None,
            review_notes=req.review_notes,
            reviewed_at=req.reviewed_at.isoformat() if req.reviewed_at else None,
            created_at=req.created_at.isoformat()
        ))
    
    return result

@router.put("/requests/{request_id}/review")
async def review_fee_change_request(
    request_id: int,
    approval: FeeChangeApproval,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """Review and approve/reject fee change request"""
    fee_request = db.query(FeeChangeRequest).filter(FeeChangeRequest.id == request_id).first()
    
    if not fee_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fee change request not found"
        )
    
    if fee_request.status != FeeChangeRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request has already been reviewed"
        )
    
    # Update request status
    fee_request.status = FeeChangeRequestStatus.APPROVED if approval.approved else FeeChangeRequestStatus.REJECTED
    fee_request.reviewed_by = current_user.id
    fee_request.review_notes = approval.review_notes
    fee_request.reviewed_at = datetime.utcnow()
    
    # If approved, implement the change
    if approval.approved:
        old_fee = PricingService.get_platform_fee_percentage(db, fee_request.provider_id)
        
        # Set new fee
        PricingService.set_platform_fee(
            db, 
            current_user.id, 
            fee_request.requested_fee_percentage, 
            fee_request.provider_id
        )
        
        # Log the change
        provider_info = ""
        if fee_request.provider_id:
            provider = db.query(User).filter(User.id == fee_request.provider_id).first()
            provider_info = f" for provider {provider.email}" if provider else ""
        
        log_entry = FeeChangeLog(
            provider_id=fee_request.provider_id,
            old_fee_percentage=old_fee,
            new_fee_percentage=fee_request.requested_fee_percentage,
            change_reason=f"Approved fee change request #{fee_request.id}{provider_info}",
            changed_by=current_user.id,
            request_id=fee_request.id
        )
        db.add(log_entry)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Request {'approved' if approval.approved else 'rejected'} successfully",
        "request_id": request_id,
        "status": fee_request.status
    }

@router.get("/changelog", response_model=List[FeeChangeLogResponse])
async def get_fee_change_log(
    current_user: User = Depends(require_role([UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    provider_id: Optional[int] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    """Get fee change history/changelog"""
    query = db.query(FeeChangeLog)
    
    if provider_id:
        query = query.filter(FeeChangeLog.provider_id == provider_id)
    
    logs = query.order_by(FeeChangeLog.created_at.desc()).limit(limit).all()
    
    result = []
    for log in logs:
        # Get changer info
        changer = db.query(User).filter(User.id == log.changed_by).first()
        
        # Get provider info if applicable
        provider = None
        if log.provider_id:
            provider = db.query(User).filter(User.id == log.provider_id).first()
        
        result.append(FeeChangeLogResponse(
            id=log.id,
            provider_id=log.provider_id,
            provider_email=provider.email if provider else None,
            old_fee_percentage=log.old_fee_percentage,
            new_fee_percentage=log.new_fee_percentage,
            change_reason=log.change_reason,
            changed_by=log.changed_by,
            changer_email=changer.email if changer else "Unknown",
            created_at=log.created_at.isoformat()
        ))
    
    return result