from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.profile import Profile, ProfileVerificationStatus
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, List
import mimetypes

router = APIRouter()

# Configuration
UPLOAD_DIR = Path("uploads")
PROFILE_IMAGES_DIR = UPLOAD_DIR / "profile_images"
VERIFICATION_DOCS_DIR = UPLOAD_DIR / "verification_docs"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
ALLOWED_DOC_TYPES = {"application/pdf", "image/jpeg", "image/png"}

# Ensure upload directories exist
UPLOAD_DIR.mkdir(exist_ok=True)
PROFILE_IMAGES_DIR.mkdir(exist_ok=True)
VERIFICATION_DOCS_DIR.mkdir(exist_ok=True)

def validate_file_size(file: UploadFile):
    """Validate file size"""
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // 1024 // 1024}MB"
        )

def validate_file_type(file: UploadFile, allowed_types: set):
    """Validate file type"""
    # Get MIME type from filename
    content_type = mimetypes.guess_type(file.filename)[0]
    
    # Also check the provided content type
    file_type = file.content_type or content_type
    
    if file_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename while preserving extension"""
    file_ext = Path(original_filename).suffix.lower()
    unique_id = str(uuid.uuid4())
    return f"{unique_id}{file_ext}"

def save_uploaded_file(file: UploadFile, upload_dir: Path) -> str:
    """Save uploaded file and return the filename"""
    filename = generate_unique_filename(file.filename)
    file_path = upload_dir / filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return filename
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

@router.post("/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a profile image"""
    # Validate file
    validate_file_size(file)
    validate_file_type(file, ALLOWED_IMAGE_TYPES)
    
    # Get or create profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Check image limit
    current_images = profile.images or []
    if len(current_images) >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 images allowed per profile"
        )
    
    # Save file
    filename = save_uploaded_file(file, PROFILE_IMAGES_DIR)
    image_url = f"/api/uploads/profile-image/{filename}"
    
    # Update profile
    if not profile.images:
        profile.images = []
    profile.images.append(image_url)
    
    # Mark for re-verification if this is a significant change
    if profile.verification_status == ProfileVerificationStatus.APPROVED:
        profile.verification_status = ProfileVerificationStatus.PENDING
    
    db.commit()
    
    return {
        "success": True,
        "message": "Image uploaded successfully",
        "image_url": image_url,
        "total_images": len(profile.images)
    }

@router.post("/verification-document")
async def upload_verification_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),  # "id_proof", "address_proof", etc.
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload verification document"""
    # Validate file
    validate_file_size(file)
    validate_file_type(file, ALLOWED_DOC_TYPES)
    
    # Validate document type
    valid_doc_types = {"id_proof", "address_proof", "professional_cert", "other"}
    if document_type not in valid_doc_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Valid types: {', '.join(valid_doc_types)}"
        )
    
    # Save file
    filename = save_uploaded_file(file, VERIFICATION_DOCS_DIR)
    doc_url = f"/api/uploads/verification-document/{filename}"
    
    # Store in user profile or verification table
    # For now, we'll add to profile metadata
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Store verification documents in a JSON field (you might want a separate table)
    if not hasattr(profile, 'verification_documents') or not profile.verification_documents:
        # This would require adding a verification_documents JSON column to Profile model
        # For now, we'll just return the URL
        pass
    
    return {
        "success": True,
        "message": "Verification document uploaded successfully",
        "document_url": doc_url,
        "document_type": document_type
    }

@router.delete("/profile-image/{image_index}")
async def delete_profile_image(
    image_index: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a profile image"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile or not profile.images:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No images found"
        )
    
    if image_index < 0 or image_index >= len(profile.images):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image index"
        )
    
    # Get the image URL to delete
    image_url = profile.images[image_index]
    
    # Remove from database
    profile.images.pop(image_index)
    db.commit()
    
    # Try to delete the file from filesystem
    try:
        if image_url.startswith("/api/uploads/profile-image/"):
            filename = image_url.split("/")[-1]
            file_path = PROFILE_IMAGES_DIR / filename
            if file_path.exists():
                file_path.unlink()
    except Exception as e:
        print(f"Warning: Could not delete file {image_url}: {e}")
    
    return {
        "success": True,
        "message": "Image deleted successfully",
        "remaining_images": len(profile.images)
    }

@router.get("/profile-image/{filename}")
async def get_profile_image(filename: str):
    """Serve profile images"""
    file_path = PROFILE_IMAGES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    return FileResponse(file_path)

@router.get("/verification-document/{filename}")
async def get_verification_document(
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    """Serve verification documents (protected - only for the user who uploaded it or admins)"""
    # In production, you'd want to verify ownership or admin status
    file_path = VERIFICATION_DOCS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return FileResponse(file_path)

@router.get("/my-images")
async def get_my_images(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's uploaded images"""
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    if not profile or not profile.images:
        return {"images": []}
    
    return {"images": profile.images}

@router.post("/bulk-profile-images")
async def upload_bulk_profile_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload multiple profile images at once"""
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 images can be uploaded at once"
        )
    
    # Get or create profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Check total image limit
    current_images = profile.images or []
    if len(current_images) + len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total images would exceed limit of 5. Current: {len(current_images)}, Uploading: {len(files)}"
        )
    
    uploaded_images = []
    errors = []
    
    for i, file in enumerate(files):
        try:
            # Validate each file
            validate_file_size(file)
            validate_file_type(file, ALLOWED_IMAGE_TYPES)
            
            # Save file
            filename = save_uploaded_file(file, PROFILE_IMAGES_DIR)
            image_url = f"/api/uploads/profile-image/{filename}"
            
            uploaded_images.append({
                "original_filename": file.filename,
                "url": image_url
            })
            
            # Update profile
            if not profile.images:
                profile.images = []
            profile.images.append(image_url)
            
        except HTTPException as e:
            errors.append({
                "filename": file.filename,
                "error": e.detail
            })
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    # Mark for re-verification if images were uploaded
    if uploaded_images and profile.verification_status == ProfileVerificationStatus.APPROVED:
        profile.verification_status = ProfileVerificationStatus.PENDING
    
    db.commit()
    
    return {
        "success": len(uploaded_images) > 0,
        "message": f"Uploaded {len(uploaded_images)} of {len(files)} images",
        "uploaded_images": uploaded_images,
        "errors": errors,
        "total_images": len(profile.images)
    }