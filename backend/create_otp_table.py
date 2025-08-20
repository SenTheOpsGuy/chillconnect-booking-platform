"""
Database migration script to add OTP verification table
"""

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.database.database import engine, Base
from app.models.otp import OTPVerification

def create_otp_table():
    """Create the OTP verification table"""
    
    # Create the table using SQLAlchemy
    Base.metadata.create_all(bind=engine, tables=[OTPVerification.__table__])
    
    print("✅ OTP verification table created successfully")

if __name__ == "__main__":
    create_otp_table()