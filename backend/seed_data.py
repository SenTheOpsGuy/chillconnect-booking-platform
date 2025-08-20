#!/usr/bin/env python3
"""
Seed data script for ChillConnect platform
Creates test users and sample data for comprehensive testing
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import get_db, engine
from app.models.user import User
from app.models.profile import Profile  
from app.models.token import Token
from app.models.chat import ChatTemplate
from app.models.booking import Booking
from app.core.security import get_password_hash
from sqlalchemy.orm import Session
from sqlalchemy import text

async def clear_existing_data():
    """Clear existing data from all tables"""
    print("🗑️ Clearing existing data...")
    
    async with engine.begin() as conn:
        # Clear tables in proper order to respect foreign key constraints
        await conn.execute(text("TRUNCATE TABLE support_messages CASCADE"))
        await conn.execute(text("TRUNCATE TABLE support_tickets CASCADE"))
        await conn.execute(text("TRUNCATE TABLE chat_messages CASCADE"))
        await conn.execute(text("TRUNCATE TABLE disputes CASCADE"))
        await conn.execute(text("TRUNCATE TABLE ratings CASCADE"))
        await conn.execute(text("TRUNCATE TABLE bookings CASCADE"))
        await conn.execute(text("TRUNCATE TABLE assignments CASCADE"))
        await conn.execute(text("TRUNCATE TABLE verifications CASCADE"))
        await conn.execute(text("TRUNCATE TABLE token_transactions CASCADE"))
        await conn.execute(text("TRUNCATE TABLE tokens CASCADE"))
        await conn.execute(text("TRUNCATE TABLE profiles CASCADE"))
        await conn.execute(text("TRUNCATE TABLE users CASCADE"))
        await conn.execute(text("TRUNCATE TABLE chat_templates CASCADE"))
        await conn.execute(text("TRUNCATE TABLE help_articles CASCADE"))
        
        await conn.commit()
    print("✅ Data cleared successfully")

def create_test_users(db: Session):
    """Create test users with different roles"""
    print("👥 Creating test users...")
    
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
                "bio": "Looking for quality companionship services",
                "is_verified": True
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
                "is_verified": True,
                "hourly_rate": Decimal("200.00"),
                "services_offered": ["Companionship", "Social Events", "Dinner Dates"],
                "availability": "Evening and weekends"
            }
        },
        {
            "email": "provider2@test.com",
            "password": "password123", 
            "role": "provider",
            "profile_data": {
                "full_name": "Emma Davis",
                "phone": "+1234567892",
                "age": 24,
                "city": "Los Angeles",
                "bio": "Elite companion specializing in upscale experiences",
                "is_verified": True,
                "hourly_rate": Decimal("300.00"),
                "services_offered": ["Premium Companionship", "Travel Companion", "Events"],
                "availability": "By appointment"
            }
        },
        {
            "email": "employee@test.com",
            "password": "password123",
            "role": "employee",
            "profile_data": {
                "full_name": "Mike Chen",
                "phone": "+1234567893", 
                "age": 30,
                "city": "New York",
                "bio": "Verification specialist",
                "is_verified": True
            }
        },
        {
            "email": "manager@test.com",
            "password": "password123",
            "role": "manager", 
            "profile_data": {
                "full_name": "Lisa Rodriguez",
                "phone": "+1234567894",
                "age": 35,
                "city": "New York", 
                "bio": "Operations manager",
                "is_verified": True
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
                "bio": "Platform administrator",
                "is_verified": True
            }
        }
    ]
    
    created_users = []
    
    for user_data in users_data:
        # Create user
        user = User(
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            role=user_data["role"],
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.flush()  # Get the user ID
        
        # Create profile
        profile_data = user_data["profile_data"]
        profile = Profile(
            user_id=user.id,
            full_name=profile_data["full_name"],
            phone=profile_data["phone"],
            age=profile_data["age"],
            city=profile_data["city"],
            bio=profile_data["bio"],
            is_verified=profile_data["is_verified"],
            hourly_rate=profile_data.get("hourly_rate"),
            services_offered=profile_data.get("services_offered", []),
            availability=profile_data.get("availability", "Available")
        )
        db.add(profile)
        
        # Create token balance for users
        if user_data["role"] in ["seeker", "provider"]:
            initial_balance = 1000 if user_data["role"] == "seeker" else 0
            token = Token(
                user_id=user.id,
                balance=initial_balance,
                total_earned=0 if user_data["role"] == "seeker" else 0,
                total_spent=0
            )
            db.add(token)
        
        created_users.append(user)
        print(f"✅ Created {user_data['role']}: {user_data['email']}")
    
    db.commit()
    return created_users

def create_chat_templates(db: Session, admin_user):
    """Create chat message templates"""
    print("💬 Creating chat templates...")
    
    templates = [
        # Booking Templates
        {"category": "BOOKING", "template_text": "I'm available for the requested time. Shall we proceed?"},
        {"category": "BOOKING", "template_text": "Thank you for booking. I'll send location details shortly."},
        {"category": "BOOKING", "template_text": "For incall appointments, I'll provide the address after payment."},
        {"category": "BOOKING", "template_text": "For outcall services, please provide the location details."},
        
        # Service Templates  
        {"category": "SERVICE", "template_text": "My rates are clearly listed in my profile. No negotiations please."},
        {"category": "SERVICE", "template_text": "I offer professional companionship services only."},
        {"category": "SERVICE", "template_text": "Please respect boundaries and keep our conversation professional."},
        
        # Logistics Templates
        {"category": "LOGISTICS", "template_text": "The location is easily accessible by car or taxi."},
        {"category": "LOGISTICS", "template_text": "Please arrive on time. Late arrivals may result in reduced session time."},
        {"category": "LOGISTICS", "template_text": "I'll be ready at the scheduled time. See you soon!"},
        
        # Support Templates
        {"category": "SUPPORT", "template_text": "Thank you for a wonderful time! Please leave a review."},
        {"category": "SUPPORT", "template_text": "I hope you enjoyed our time together. Until next time!"},
        {"category": "SUPPORT", "template_text": "Safe travels! Looking forward to seeing you again."},
    ]
    
    for template_data in templates:
        template = ChatTemplate(
            category=template_data["category"],
            template_text=template_data["template_text"],
            created_by=admin_user.id,
            active=True,
            admin_only=False
        )
        db.add(template)
    
    db.commit()
    print(f"✅ Created {len(templates)} chat templates")

def create_sample_bookings(db: Session, users):
    """Create sample bookings for testing"""
    print("📅 Creating sample bookings...")
    
    # Find seeker and providers
    seeker = next(u for u in users if u.role == "seeker")
    provider1 = next(u for u in users if u.role == "provider" and u.email == "provider@test.com")
    provider2 = next(u for u in users if u.role == "provider" and u.email == "provider2@test.com")
    
    bookings_data = [
        {
            "seeker_id": seeker.id,
            "provider_id": provider1.id,
            "service_type": "outcall",
            "status": "pending",
            "duration_hours": 2,
            "total_amount": Decimal("400.00"),
            "scheduled_at": datetime.utcnow() + timedelta(days=1),
            "location": "Manhattan Hotel, Room 1205",
            "special_requests": "Please arrive at 8 PM sharp"
        },
        {
            "seeker_id": seeker.id,
            "provider_id": provider2.id,
            "service_type": "incall", 
            "status": "confirmed",
            "duration_hours": 1,
            "total_amount": Decimal("300.00"),
            "scheduled_at": datetime.utcnow() + timedelta(days=2),
            "location": "Provider's Location (will be shared)",
            "special_requests": "First time booking"
        },
        {
            "seeker_id": seeker.id,
            "provider_id": provider1.id,
            "service_type": "outcall",
            "status": "completed",
            "duration_hours": 3,
            "total_amount": Decimal("600.00"),
            "scheduled_at": datetime.utcnow() - timedelta(days=1),
            "completed_at": datetime.utcnow() - timedelta(hours=20),
            "location": "Private Residence",
            "special_requests": "Dinner companion for business event"
        }
    ]
    
    for booking_data in bookings_data:
        booking = Booking(
            seeker_id=booking_data["seeker_id"],
            provider_id=booking_data["provider_id"],
            service_type=booking_data["service_type"],
            status=booking_data["status"],
            duration_hours=booking_data["duration_hours"],
            total_amount=booking_data["total_amount"],
            scheduled_at=booking_data["scheduled_at"],
            completed_at=booking_data.get("completed_at"),
            location=booking_data["location"],
            special_requests=booking_data["special_requests"],
            created_at=datetime.utcnow()
        )
        db.add(booking)
    
    db.commit()
    print(f"✅ Created {len(bookings_data)} sample bookings")

async def main():
    """Main seeding function"""
    print("🌱 Starting database seeding process...")
    
    # Clear existing data
    await clear_existing_data()
    
    # Get database session
    db = next(get_db())
    
    try:
        # Create test users
        users = create_test_users(db)
        
        # Find admin user for templates
        admin_user = next(u for u in users if u.role == "admin")
        
        # Create chat templates
        create_chat_templates(db, admin_user)
        
        # Create sample bookings
        create_sample_bookings(db, users)
        
        print("\n🎉 Database seeded successfully!")
        print("\n📋 Test Credentials:")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("Seeker:    seeker@test.com    / password123")
        print("Provider:  provider@test.com  / password123") 
        print("Provider2: provider2@test.com / password123")
        print("Employee:  employee@test.com  / password123")
        print("Manager:   manager@test.com   / password123")
        print("Admin:     admin@test.com     / password123")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())