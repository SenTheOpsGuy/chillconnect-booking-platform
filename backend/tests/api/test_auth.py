import pytest
from fastapi.testclient import TestClient

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_register_seeker_success(self, client: TestClient, db_session):
        """Test successful seeker registration"""
        user_data = {
            "email": "new_seeker@test.com",
            "password": "securepass123",
            "role": "seeker",
            "age_confirmed": True,
            "phone": "+1234567890"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["role"] == user_data["role"]
        assert "id" in data
    
    def test_register_provider_success(self, client: TestClient, db_session):
        """Test successful provider registration"""
        user_data = {
            "email": "new_provider@test.com",
            "password": "securepass123",
            "role": "provider",
            "age_confirmed": True,
            "phone": "+1234567891"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["role"] == user_data["role"]
    
    def test_register_duplicate_email(self, client: TestClient, test_seeker):
        """Test registration with duplicate email"""
        user_data = {
            "email": "test_seeker@example.com",  # Same as fixture
            "password": "securepass123",
            "role": "seeker",
            "age_confirmed": True
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_register_without_age_confirmation(self, client: TestClient):
        """Test registration without age confirmation"""
        user_data = {
            "email": "underage@test.com",
            "password": "securepass123",
            "role": "seeker",
            "age_confirmed": False
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 400
        assert "age confirmation" in response.json()["detail"].lower()
    
    def test_login_success(self, client: TestClient, test_seeker):
        """Test successful login"""
        login_data = {
            "email": "test_seeker@example.com",
            "password": "testpass123"
        }
        
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == login_data["email"]
    
    def test_login_invalid_credentials(self, client: TestClient, test_seeker):
        """Test login with invalid credentials"""
        login_data = {
            "email": "test_seeker@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with nonexistent user"""
        login_data = {
            "email": "nonexistent@test.com",
            "password": "testpass123"
        }
        
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 401
    
    def test_get_current_user_success(self, client: TestClient, seeker_headers):
        """Test getting current user profile"""
        response = client.get("/auth/me", headers=seeker_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == "test_seeker@example.com"
        assert data["role"] == "seeker"
    
    def test_get_current_user_unauthorized(self, client: TestClient):
        """Test getting current user without token"""
        response = client.get("/auth/me")
        assert response.status_code == 403  # No auth header
    
    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401