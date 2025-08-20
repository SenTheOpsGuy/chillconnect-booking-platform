import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

class TestBookings:
    """Test booking endpoints"""
    
    def test_create_booking_success(self, client: TestClient, test_provider, seeker_headers):
        """Test successful booking creation"""
        booking_data = {
            "provider_id": test_provider.id,
            "start_time": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "duration_hours": 2,
            "booking_type": "outcall",
            "location": "Test Hotel",
            "special_requests": "Test request"
        }
        
        response = client.post("/bookings/create", json=booking_data, headers=seeker_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["provider_id"] == booking_data["provider_id"]
        assert data["duration_hours"] == booking_data["duration_hours"]
        assert data["booking_type"] == booking_data["booking_type"]
        assert data["status"] == "pending"
    
    def test_create_booking_insufficient_tokens(self, client: TestClient, test_provider, db_session):
        """Test booking creation with insufficient tokens"""
        # Create seeker with no tokens
        from app.models.user import User, UserRole
        from app.models.token import Token as UserToken
        from app.core.security import get_password_hash
        
        poor_seeker = User(
            email="poor_seeker@test.com",
            password_hash=get_password_hash("testpass123"),
            role=UserRole.SEEKER,
            age_confirmed=True,
            email_verified=True,
            is_active=True
        )
        db_session.add(poor_seeker)
        db_session.commit()
        
        # Create wallet with no tokens
        wallet = UserToken(user_id=poor_seeker.id, balance=0, escrow_balance=0)
        db_session.add(wallet)
        db_session.commit()
        
        # Login as poor seeker
        login_data = {"email": "poor_seeker@test.com", "password": "testpass123"}
        login_response = client.post("/auth/login", json=login_data)
        headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        
        booking_data = {
            "provider_id": test_provider.id,
            "start_time": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "duration_hours": 2,
            "booking_type": "outcall"
        }
        
        response = client.post("/bookings/create", json=booking_data, headers=headers)
        assert response.status_code == 400
        assert "insufficient" in response.json()["detail"].lower()
    
    def test_create_booking_past_time(self, client: TestClient, test_provider, seeker_headers):
        """Test booking creation with past time"""
        booking_data = {
            "provider_id": test_provider.id,
            "start_time": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "duration_hours": 2,
            "booking_type": "outcall"
        }
        
        response = client.post("/bookings/create", json=booking_data, headers=seeker_headers)
        assert response.status_code == 400
        assert "future" in response.json()["detail"].lower()
    
    def test_get_my_bookings(self, client: TestClient, test_booking, seeker_headers):
        """Test getting user's bookings"""
        response = client.get("/bookings/my-bookings", headers=seeker_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["id"] == test_booking.id
    
    def test_get_booking_details(self, client: TestClient, test_booking, seeker_headers):
        """Test getting specific booking details"""
        response = client.get(f"/bookings/{test_booking.id}", headers=seeker_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_booking.id
        assert data["status"] == test_booking.status.value
    
    def test_update_booking_status_provider_confirm(self, client: TestClient, test_booking, provider_headers, db_session):
        """Test provider confirming a booking"""
        # Set booking to pending first
        test_booking.status = "pending"
        db_session.commit()
        
        update_data = {"status": "confirmed"}
        response = client.put(f"/bookings/{test_booking.id}/status", 
                            json=update_data, headers=provider_headers)
        assert response.status_code == 200
    
    def test_update_booking_status_unauthorized(self, client: TestClient, test_booking, seeker_headers):
        """Test unauthorized status update (seeker trying to confirm)"""
        update_data = {"status": "confirmed"}
        response = client.put(f"/bookings/{test_booking.id}/status", 
                            json=update_data, headers=seeker_headers)
        assert response.status_code == 403
    
    def test_get_seeker_start_otp(self, client: TestClient, test_booking, seeker_headers):
        """Test seeker getting start service OTP"""
        response = client.get(f"/bookings/{test_booking.id}/seeker-start-otp", 
                            headers=seeker_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "code" in data
        assert len(data["code"]) == 6
        assert data["expires_in_minutes"] == 30
    
    def test_get_seeker_start_otp_wrong_user(self, client: TestClient, test_booking, provider_headers):
        """Test provider trying to get seeker OTP (should fail)"""
        response = client.get(f"/bookings/{test_booking.id}/seeker-start-otp", 
                            headers=provider_headers)
        assert response.status_code == 403
    
    def test_generate_provider_start_otp(self, client: TestClient, test_booking, provider_headers):
        """Test provider generating start service OTP"""
        response = client.post(f"/bookings/{test_booking.id}/generate-start-otp", 
                             headers=provider_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "OTP sent to your phone number"
    
    def test_cancel_booking(self, client: TestClient, test_booking, seeker_headers, db_session):
        """Test cancelling a booking"""
        # Set booking to pending first
        test_booking.status = "pending"
        db_session.commit()
        
        response = client.delete(f"/bookings/{test_booking.id}", headers=seeker_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "refund_amount" in data