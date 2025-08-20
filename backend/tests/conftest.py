import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient

from main import app
from app.database.database import Base, get_db
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus, BookingType
from app.models.profile import Profile
import sqlalchemy.dialects.sqlite

# Fix for SQLite ARRAY compatibility in tests
def _visit_ARRAY(self, element, **kw):
    return "TEXT"

sqlalchemy.dialects.sqlite.base.SQLiteTypeCompiler.visit_ARRAY = _visit_ARRAY
from app.models.token import Token as UserToken
from app.core.security import get_password_hash

# Test database URL - using SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_chillconnect.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create test database tables"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Clean up after each test
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)

@pytest.fixture
async def async_client():
    """Create async test client"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
def test_seeker(db_session):
    """Create test seeker user"""
    user = User(
        email="test_seeker@example.com",
        password_hash=get_password_hash("testpass123"),
        role=UserRole.SEEKER,
        age_confirmed=True,
        phone="+1234567890",
        email_verified=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Create wallet
    wallet = UserToken(user_id=user.id, balance=1000, escrow_balance=0)
    db_session.add(wallet)
    db_session.commit()
    
    return user

@pytest.fixture
def test_provider(db_session):
    """Create test provider user"""
    user = User(
        email="test_provider@example.com",
        password_hash=get_password_hash("testpass123"),
        role=UserRole.PROVIDER,
        age_confirmed=True,
        phone="+1234567891",
        email_verified=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Create profile
    profile = Profile(
        user_id=user.id,
        name="Test Provider",
        bio="Test provider bio",
        hourly_rate=200,
        location="Test City",
        services_offered=["companionship", "dinner date"],
        languages=["English"]
    )
    db_session.add(profile)
    
    # Create wallet
    wallet = UserToken(user_id=user.id, balance=0, escrow_balance=0)
    db_session.add(wallet)
    
    db_session.commit()
    return user

@pytest.fixture
def test_admin(db_session):
    """Create test admin user"""
    user = User(
        email="test_admin@example.com",
        password_hash=get_password_hash("testpass123"),
        role=UserRole.ADMIN,
        age_confirmed=True,
        email_verified=True,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_booking(db_session, test_seeker, test_provider):
    """Create test booking"""
    from datetime import datetime, timedelta
    
    booking = Booking(
        seeker_id=test_seeker.id,
        provider_id=test_provider.id,
        start_time=datetime.utcnow() + timedelta(days=1),
        duration_hours=2,
        total_tokens=460,
        booking_type=BookingType.OUTCALL,
        status=BookingStatus.CONFIRMED,
        location="Test Hotel"
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    return booking

@pytest.fixture
def seeker_headers(client, test_seeker):
    """Get authorization headers for seeker"""
    login_data = {"email": "test_seeker@example.com", "password": "testpass123"}
    response = client.post("/auth/login", json=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def provider_headers(client, test_provider):
    """Get authorization headers for provider"""
    login_data = {"email": "test_provider@example.com", "password": "testpass123"}
    response = client.post("/auth/login", json=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_headers(client, test_admin):
    """Get authorization headers for admin"""
    login_data = {"email": "test_admin@example.com", "password": "testpass123"}
    response = client.post("/auth/login", json=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}