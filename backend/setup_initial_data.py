#!/usr/bin/env python3
"""
Initial data setup script for ChillConnect platform
Creates default admin user, chat templates, and help articles
"""

import asyncio
from sqlalchemy.orm import Session
from app.database.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.support import HelpArticle
from app.core.security import get_password_hash
from app.services.chat_templates import create_default_templates

def create_default_admin():
    """Create default super admin user"""
    db = SessionLocal()
    
    # Check if super admin already exists
    existing_admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()
    if existing_admin:
        print("Super admin already exists")
        db.close()
        return existing_admin.id
    
    # Create super admin
    admin_user = User(
        email="admin@chillconnect.com",
        password_hash=get_password_hash("admin123!@#"),
        role=UserRole.SUPER_ADMIN,
        age_confirmed=True,
        email_verified=True,
        verification_status="verified",
        is_active=True
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    print(f"Created super admin user: {admin_user.email}")
    print(f"Default password: admin123!@#")
    print("Please change this password immediately after first login!")
    
    db.close()
    return admin_user.id

def create_help_articles():
    """Create default help articles"""
    db = SessionLocal()
    
    articles = [
        {
            "category": "Getting Started",
            "title": "How to Create an Account",
            "content": """
            Welcome to ChillConnect! Here's how to get started:
            
            1. Click 'Join Now' on the homepage
            2. Choose your account type (Find Services or Offer Services)
            3. Enter your email and create a secure password
            4. Confirm you are 18 years or older
            5. Verify your email address
            6. Complete your profile verification
            
            Your safety and privacy are our top priorities.
            """,
            "tags": "registration,account,getting started",
            "created_by": 1
        },
        {
            "category": "Tokens & Payments",
            "title": "Understanding the Token System",
            "content": """
            ChillConnect uses a secure token-based payment system:
            
            • 1 Token = ₹100
            • Purchase tokens using PayPal
            • Tokens are held in escrow during bookings
            • Automatic release upon booking completion
            • Refunds available for cancellations
            
            Available token packages:
            - 5 tokens: ₹500
            - 10 tokens: ₹1,000
            - 25 tokens: ₹2,375 (5% discount)
            - 50 tokens: ₹4,500 (10% discount)
            - 100 tokens: ₹8,500 (15% discount)
            """,
            "tags": "tokens,payment,paypal,pricing",
            "created_by": 1
        },
        {
            "category": "Safety & Security",
            "title": "Platform Safety Guidelines",
            "content": """
            Your safety is our priority. Please follow these guidelines:
            
            Communication:
            • Use only approved message templates
            • Never share personal contact information
            • Report inappropriate behavior immediately
            
            Meetings:
            • Meet only in safe, public locations initially
            • Trust your instincts
            • Use the emergency support feature if needed
            
            Financial Safety:
            • Never send money outside the platform
            • All payments are protected by escrow
            • Report any requests for external payments
            """,
            "tags": "safety,security,guidelines,emergency",
            "created_by": 1
        },
        {
            "category": "Booking Process",
            "title": "How to Book a Provider",
            "content": """
            Follow these steps to book a provider:
            
            1. Browse verified providers
            2. Review profiles, rates, and reviews
            3. Check availability calendar
            4. Select date, time, and duration
            5. Confirm booking details
            6. Tokens are automatically held in escrow
            7. Communicate through template messages
            8. Meet at agreed location and time
            9. Complete the session
            10. Leave a review (optional)
            
            Cancellation Policy:
            • Free cancellation 24+ hours before
            • 10% fee for cancellations under 24 hours
            """,
            "tags": "booking,providers,process,cancellation",
            "created_by": 1
        },
        {
            "category": "Provider Guide",
            "title": "Creating Your Provider Profile",
            "content": """
            Set up an attractive and professional profile:
            
            Profile Essentials:
            • Upload 3-5 high-quality photos
            • Write a compelling bio (500 characters max)
            • Set competitive hourly rates
            • List your services and specialties
            • Add languages you speak
            • Set your availability calendar
            
            Verification Process:
            • Submit government ID
            • Profile review by our team
            • Approval typically within 24 hours
            
            Tips for Success:
            • Maintain high ratings
            • Respond to messages promptly
            • Keep your calendar updated
            • Provide excellent service
            """,
            "tags": "provider,profile,verification,success",
            "created_by": 1
        }
    ]
    
    for article_data in articles:
        # Check if article already exists
        existing = db.query(HelpArticle).filter(
            HelpArticle.title == article_data["title"]
        ).first()
        
        if not existing:
            article = HelpArticle(**article_data)
            db.add(article)
    
    db.commit()
    print("Created default help articles")
    db.close()

def main():
    """Main setup function"""
    print("Setting up ChillConnect initial data...")
    
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created")
    
    # Create default admin user
    admin_id = create_default_admin()
    
    # Create default chat templates
    db = SessionLocal()
    create_default_templates(db, admin_id)
    db.close()
    
    # Create help articles
    create_help_articles()
    
    print("\n✅ Initial data setup completed successfully!")
    print("\nDefault Admin Credentials:")
    print("Email: admin@chillconnect.com")
    print("Password: admin123!@#")
    print("\n⚠️  IMPORTANT: Change the admin password immediately after first login!")
    print("\nNext steps:")
    print("1. Start the backend server: uvicorn main:app --reload")
    print("2. Start the frontend: npm start")
    print("3. Login as admin and change the password")
    print("4. Configure environment variables for external services")

if __name__ == "__main__":
    main()