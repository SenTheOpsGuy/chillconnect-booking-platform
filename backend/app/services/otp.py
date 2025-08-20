from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.otp import OTPVerification
from app.models.user import User
from app.models.booking import Booking
from app.services.sms import generate_verification_code, send_verification_sms
from typing import Optional, Dict, Any

class OTPService:
    @staticmethod
    async def generate_seeker_service_start_otp(db: Session, booking_id: int, seeker_id: int) -> Dict[str, Any]:
        """Generate OTP for seeker to share with provider for service start verification"""
        # Get seeker and booking
        seeker = db.query(User).filter(User.id == seeker_id).first()
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        
        if not seeker or not booking:
            raise ValueError("Seeker or booking not found")
            
        if booking.seeker_id != seeker_id:
            raise ValueError("Seeker not authorized for this booking")
        
        if booking.status != "confirmed":
            raise ValueError("OTP can only be generated for confirmed bookings")
        
        # Check if there's a valid existing OTP
        existing_otp = db.query(OTPVerification).filter(
            OTPVerification.booking_id == booking_id,
            OTPVerification.user_id == seeker_id,
            OTPVerification.purpose == "seeker_service_start",
            OTPVerification.is_used == False
        ).order_by(OTPVerification.created_at.desc()).first()
        
        if existing_otp and existing_otp.is_valid:
            return {
                "success": True,
                "code": existing_otp.code,
                "message": "OTP retrieved successfully",
                "expires_in_minutes": int((existing_otp.expires_at - datetime.utcnow()).total_seconds() / 60)
            }
        
        # Generate new OTP
        code = generate_verification_code()
        
        # Create OTP verification record - Note: we store seeker's phone but this is for the provider to verify
        otp_verification = OTPVerification(
            user_id=seeker_id,
            booking_id=booking_id,
            code=code,
            purpose="seeker_service_start",
            phone_number=seeker.phone or "N/A",  # Seeker's phone for record keeping
            expires_at=datetime.utcnow() + timedelta(minutes=30)  # 30 minutes for seeker OTPs
        )
        
        db.add(otp_verification)
        db.commit()
        
        return {
            "success": True,
            "code": code,
            "message": "OTP generated successfully",
            "expires_in_minutes": 30
        }

    @staticmethod
    async def generate_service_start_otp(db: Session, booking_id: int, provider_id: int) -> Dict[str, Any]:
        """Generate OTP for service start verification"""
        # Get provider and booking
        provider = db.query(User).filter(User.id == provider_id).first()
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        
        if not provider or not booking:
            raise ValueError("Provider or booking not found")
            
        if not provider.phone:
            raise ValueError("Provider phone number not available")
            
        if booking.provider_id != provider_id:
            raise ValueError("Provider not authorized for this booking")
        
        # Check if there's a valid existing OTP
        existing_otp = db.query(OTPVerification).filter(
            OTPVerification.booking_id == booking_id,
            OTPVerification.user_id == provider_id,
            OTPVerification.purpose == "service_start",
            OTPVerification.is_used == False
        ).order_by(OTPVerification.created_at.desc()).first()
        
        if existing_otp and existing_otp.is_valid:
            # Resend existing OTP
            try:
                await OTPService._send_service_start_sms(provider.phone, existing_otp.code, booking)
                return {
                    "success": True,
                    "message": "OTP resent successfully",
                    "expires_in_minutes": int((existing_otp.expires_at - datetime.utcnow()).total_seconds() / 60)
                }
            except Exception as e:
                print(f"Failed to resend OTP SMS: {e}")
                raise ValueError("Failed to send OTP")
        
        # Generate new OTP
        code = generate_verification_code()
        
        # Create OTP verification record
        otp_verification = OTPVerification(
            user_id=provider_id,
            booking_id=booking_id,
            code=code,
            purpose="service_start",
            phone_number=provider.phone,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        db.add(otp_verification)
        db.commit()
        
        # Send OTP SMS
        try:
            await OTPService._send_service_start_sms(provider.phone, code, booking)
            return {
                "success": True,
                "message": "OTP sent successfully",
                "expires_in_minutes": 10
            }
        except Exception as e:
            # Remove the OTP record if SMS failed
            db.delete(otp_verification)
            db.commit()
            print(f"Failed to send OTP SMS: {e}")
            raise ValueError("Failed to send OTP")
    
    @staticmethod
    async def verify_service_start_otp(db: Session, booking_id: int, provider_id: int, code: str) -> Dict[str, Any]:
        """Verify OTP for service start - supports both provider-generated and seeker-generated OTPs"""
        # First check for provider-generated OTP
        otp_verification = db.query(OTPVerification).filter(
            OTPVerification.booking_id == booking_id,
            OTPVerification.user_id == provider_id,
            OTPVerification.purpose == "service_start",
            OTPVerification.is_used == False
        ).order_by(OTPVerification.created_at.desc()).first()
        
        # If no provider OTP found, check for seeker-generated OTP
        if not otp_verification:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if booking:
                otp_verification = db.query(OTPVerification).filter(
                    OTPVerification.booking_id == booking_id,
                    OTPVerification.user_id == booking.seeker_id,
                    OTPVerification.purpose == "seeker_service_start",
                    OTPVerification.is_used == False
                ).order_by(OTPVerification.created_at.desc()).first()
        
        if not otp_verification:
            return {"success": False, "message": "No valid OTP found. Please request a new one."}
        
        # Increment attempts
        otp_verification.attempts += 1
        
        # Check if expired
        if otp_verification.is_expired:
            db.commit()
            return {"success": False, "message": "OTP has expired. Please request a new one."}
        
        # Check if too many attempts
        if otp_verification.attempts > otp_verification.max_attempts:
            db.commit()
            return {"success": False, "message": "Too many attempts. Please request a new OTP."}
        
        # Verify code
        if otp_verification.code != code:
            db.commit()
            return {"success": False, "message": "Invalid OTP code."}
        
        # Mark as used and verified
        otp_verification.is_used = True
        otp_verification.verified_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": "OTP verified successfully",
            "verified_at": otp_verification.verified_at.isoformat()
        }
    
    @staticmethod
    async def _send_service_start_sms(phone: str, code: str, booking: Booking):
        """Send OTP SMS for service start"""
        from twilio.rest import Client
        from app.core.config import settings
        
        # Use existing SMS service but with custom message
        if hasattr(settings, 'TWILIO_AUTH_TOKEN') and settings.TWILIO_AUTH_TOKEN and "your_twilio_auth_token_here" not in settings.TWILIO_AUTH_TOKEN:
            try:
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                
                message_body = f"""
ChillConnect Service Verification

Your verification code to start service for Booking #{booking.id} is: {code}

Enter this code to confirm service start.

This code expires in 10 minutes.
                """.strip()
                
                message = client.messages.create(
                    body=message_body,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=phone
                )
                print(f"Service start OTP SMS sent: {message.sid}")
            except Exception as e:
                print(f"Failed to send service start OTP SMS: {e}")
                raise e
        else:
            # Simulation mode
            print(f"🧪 SMS Simulation - Service Start OTP for {phone}: {code} (Booking #{booking.id})")