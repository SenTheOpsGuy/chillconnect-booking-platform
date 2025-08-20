from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, VerificationStatus

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole
    age_confirmed: bool = False

class UserCreate(UserBase):
    password: str
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    phone: Optional[str] = None
    age_confirmed: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    phone: Optional[str] = None
    phone_verified: bool = False
    email_verified: bool = False
    verification_status: VerificationStatus
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str