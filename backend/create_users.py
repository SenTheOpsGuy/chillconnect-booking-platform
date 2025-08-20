#!/usr/bin/env python3
"""
Simple script to create test users
"""

import sys
import os
from datetime import datetime
from decimal import Decimal

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.user import User
from app.models.profile import Profile  
from app.models.token import Token
from app.core.security import get_password_hash

def create_test_users():
    """Create test users with different roles"""
    print("👥 Creating test users...")
    
    db = SessionLocal()
    
    users_data = [
        {
            "email": "seeker@test.com",
            "password": "password123",
            "role": "seeker",
            "profile_data": {
                "full_name": "Alex Johnson",
                "phone": "+1234567890",
                "age": 28,
                "city": "New York",
                "bio": "Looking for quality companionship services"
            }
        },
        {
            "email": "provider@test.com", 
            "password": "password123",
            "role": "provider",
            "profile_data": {
                "full_name": "Sarah Wilson",
                "phone": "+1234567891",
                "age": 25,
                "city": "New York",
                "bio": "Professional companion offering outcall and incall services",
                "hourly_rate": Decimal("200.00")
            }
        },
        {
            "email": "admin@test.com",
            "password": "password123",
            "role": "admin",
            "profile_data": {
                "full_name": "Admin User",
                "phone": "+1234567895",
                "age": 40,
                "city": "New York",
                "bio": "Platform administrator"
            }
        }
    ]
    
    try:
        for user_data in users_data:
            # Check if user already exists
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                print(f"⚠️ User {user_data['email']} already exists")
                continue
                
            # Create user
            user = User(
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"],
                is_active=True,
                email_verified=True,
                created_at=datetime.utcnow()
            )
            db.add(user)
            db.flush()  # Get the user ID
            
            # Create profile
            profile_data = user_data["profile_data"]
            profile = Profile(
                user_id=user.id,
                name=profile_data["full_name"],
                bio=profile_data["bio"],
                hourly_rate=int(profile_data.get("hourly_rate", 0) or 0),  # Convert to int tokens
                location=profile_data.get("city", ""),
                services_offered=["Companionship", "Social Events"],
                availability={"status": "available", "hours": "flexible"}
            )
            db.add(profile)
            
            # Create token balance for seekers
            if user_data["role"] == "seeker":
                token = Token(
                    user_id=user.id,
                    balance=1000,
                    escrow_balance=0
                )
                db.add(token)
            
            print(f"✅ Created {user_data['role']}: {user_data['email']}")
        
        db.commit()
        
        print("\n🎉 Users created successfully!")
        print("\n📋 Test Credentials:")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("Seeker:    seeker@test.com    / password123")
        print("Provider:  provider@test.com  / password123") 
        print("Admin:     admin@test.com     / password123")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
    except Exception as e:
        print(f"❌ Error creating users: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()