from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.deps import get_db, get_current_active_user
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.models.token import Token as UserToken
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.services.email import send_verification_email
from app.services.sms import send_verification_sms

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate age confirmation
    if not user_data.age_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Age confirmation required - you must be 18 or older"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
        age_confirmed=user_data.age_confirmed,
        phone=user_data.phone
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create profile for providers
    if user.role == UserRole.PROVIDER:
        profile = Profile(user_id=user.id)
        db.add(profile)
    
    # Create token wallet for all users
    token_wallet = UserToken(user_id=user.id, balance=0)
    db.add(token_wallet)
    
    db.commit()
    
    # Send verification email
    try:
        await send_verification_email(user.email, user.id)
    except Exception as e:
        print(f"Failed to send verification email: {e}")
    
    # Send SMS verification if phone provided
    if user.phone:
        try:
            await send_verification_sms(user.phone)
        except Exception as e:
            print(f"Failed to send verification SMS: {e}")
    
    return user

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

@router.post("/verify-email/{user_id}")
async def verify_email(user_id: int, verification_code: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # In a real implementation, you would verify the code
    # For now, just mark as verified
    user.email_verified = True
    db.commit()
    
    return {"message": "Email verified successfully"}

@router.post("/verify-phone")
async def verify_phone(phone: str, verification_code: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found"
        )
    
    # In a real implementation, you would verify the code
    # For now, just mark as verified
    user.phone_verified = True
    db.commit()
    
    return {"message": "Phone verified successfully"}

@router.post("/resend-verification")
async def resend_verification(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    try:
        await send_verification_email(user.email, user.id)
        return {"message": "Verification email sent"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user information"""
    return current_user