import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock

from app.services.otp import OTPService
from app.models.otp import OTPVerification

class TestOTPService:
    """Test OTP service functionality"""
    
    @pytest.mark.asyncio
    async def test_generate_seeker_service_start_otp(self, db_session, test_booking):
        """Test seeker OTP generation"""
        result = await OTPService.generate_seeker_service_start_otp(
            db_session, test_booking.id, test_booking.seeker_id
        )
        
        assert result["success"] is True
        assert len(result["code"]) == 6
        assert result["expires_in_minutes"] == 30
        
        # Verify OTP is stored in database
        otp = db_session.query(OTPVerification).filter(
            OTPVerification.booking_id == test_booking.id,
            OTPVerification.purpose == "seeker_service_start"
        ).first()
        assert otp is not None
        assert otp.code == result["code"]
        assert not otp.is_used
    
    @pytest.mark.asyncio
    async def test_generate_seeker_otp_reuse_existing(self, db_session, test_booking):
        """Test that existing valid OTP is returned instead of creating new one"""
        # Generate first OTP
        result1 = await OTPService.generate_seeker_service_start_otp(
            db_session, test_booking.id, test_booking.seeker_id
        )
        
        # Generate second OTP (should return the same)
        result2 = await OTPService.generate_seeker_service_start_otp(
            db_session, test_booking.id, test_booking.seeker_id
        )
        
        assert result1["code"] == result2["code"]
        assert result2["message"] == "OTP retrieved successfully"
    
    @pytest.mark.asyncio
    async def test_generate_seeker_otp_wrong_status(self, db_session, test_booking):
        """Test seeker OTP generation with wrong booking status"""
        # Change booking status to pending
        test_booking.status = "pending"
        db_session.commit()
        
        with pytest.raises(ValueError, match="confirmed bookings"):
            await OTPService.generate_seeker_service_start_otp(
                db_session, test_booking.id, test_booking.seeker_id
            )
    
    @pytest.mark.asyncio
    async def test_generate_seeker_otp_wrong_user(self, db_session, test_booking, test_provider):
        """Test seeker OTP generation with wrong user"""
        with pytest.raises(ValueError, match="not authorized"):
            await OTPService.generate_seeker_service_start_otp(
                db_session, test_booking.id, test_provider.id
            )
    
    @pytest.mark.asyncio
    @patch('app.services.otp.OTPService._send_service_start_sms')
    async def test_generate_provider_service_start_otp(self, mock_sms, db_session, test_booking):
        """Test provider OTP generation"""
        mock_sms.return_value = None
        
        result = await OTPService.generate_service_start_otp(
            db_session, test_booking.id, test_booking.provider_id
        )
        
        assert result["success"] is True
        assert result["message"] == "OTP sent successfully"
        assert result["expires_in_minutes"] == 10
        
        # Verify OTP is stored in database
        otp = db_session.query(OTPVerification).filter(
            OTPVerification.booking_id == test_booking.id,
            OTPVerification.purpose == "service_start"
        ).first()
        assert otp is not None
        assert not otp.is_used
    
    @pytest.mark.asyncio
    async def test_verify_seeker_generated_otp(self, db_session, test_booking):
        """Test verifying seeker-generated OTP"""
        # Generate seeker OTP
        generate_result = await OTPService.generate_seeker_service_start_otp(
            db_session, test_booking.id, test_booking.seeker_id
        )
        otp_code = generate_result["code"]
        
        # Verify OTP (provider using seeker's OTP)
        verify_result = await OTPService.verify_service_start_otp(
            db_session, test_booking.id, test_booking.provider_id, otp_code
        )
        
        assert verify_result["success"] is True
        assert "verified successfully" in verify_result["message"]
        
        # Verify OTP is marked as used
        otp = db_session.query(OTPVerification).filter(
            OTPVerification.booking_id == test_booking.id,
            OTPVerification.code == otp_code
        ).first()
        assert otp.is_used
        assert otp.verified_at is not None
    
    @pytest.mark.asyncio
    async def test_verify_invalid_otp(self, db_session, test_booking):
        """Test verifying invalid OTP"""
        result = await OTPService.verify_service_start_otp(
            db_session, test_booking.id, test_booking.provider_id, "123456"
        )
        
        assert result["success"] is False
        assert "No valid OTP found" in result["message"]
    
    @pytest.mark.asyncio
    async def test_verify_expired_otp(self, db_session, test_booking):
        """Test verifying expired OTP"""
        # Create expired OTP
        from app.services.sms import generate_verification_code
        expired_otp = OTPVerification(
            user_id=test_booking.seeker_id,
            booking_id=test_booking.id,
            code=generate_verification_code(),
            purpose="seeker_service_start",
            phone_number="test",
            expires_at=datetime.utcnow() - timedelta(minutes=1)  # Expired
        )
        db_session.add(expired_otp)
        db_session.commit()
        
        result = await OTPService.verify_service_start_otp(
            db_session, test_booking.id, test_booking.provider_id, expired_otp.code
        )
        
        assert result["success"] is False
        assert "expired" in result["message"].lower()
    
    @pytest.mark.asyncio
    async def test_verify_otp_max_attempts(self, db_session, test_booking):
        """Test OTP verification with maximum attempts exceeded"""
        # Generate seeker OTP
        generate_result = await OTPService.generate_seeker_service_start_otp(
            db_session, test_booking.id, test_booking.seeker_id
        )
        
        # Try wrong OTP multiple times
        for _ in range(4):  # Max attempts is 3, so 4th should fail with max attempts
            result = await OTPService.verify_service_start_otp(
                db_session, test_booking.id, test_booking.provider_id, "wrong"
            )
        
        assert result["success"] is False
        assert "too many attempts" in result["message"].lower()
    
    @pytest.mark.asyncio
    async def test_otp_properties(self, db_session, test_booking):
        """Test OTP model properties"""
        from app.services.sms import generate_verification_code
        
        # Test valid OTP
        valid_otp = OTPVerification(
            user_id=test_booking.seeker_id,
            booking_id=test_booking.id,
            code=generate_verification_code(),
            purpose="seeker_service_start",
            phone_number="test"
        )
        db_session.add(valid_otp)
        db_session.commit()
        
        assert valid_otp.is_valid
        assert not valid_otp.is_expired
        
        # Test expired OTP
        expired_otp = OTPVerification(
            user_id=test_booking.seeker_id,
            booking_id=test_booking.id,
            code=generate_verification_code(),
            purpose="seeker_service_start",
            phone_number="test",
            expires_at=datetime.utcnow() - timedelta(minutes=1)
        )
        db_session.add(expired_otp)
        db_session.commit()
        
        assert not expired_otp.is_valid
        assert expired_otp.is_expired