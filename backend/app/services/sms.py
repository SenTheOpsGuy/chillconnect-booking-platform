from app.core.config import settings
import random
from datetime import datetime

# Initialize Twilio client only if credentials are provided
try:
    from twilio.rest import Client
    if settings.TWILIO_AUTH_TOKEN and "your_twilio_auth_token_here" not in settings.TWILIO_AUTH_TOKEN:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    else:
        client = None
        print("⚠️ Twilio not configured - SMS disabled")
except Exception as e:
    client = None
    print(f"⚠️ Twilio initialization failed - SMS disabled: {e}")

def generate_verification_code():
    """Generate 6-digit verification code"""
    return str(random.randint(100000, 999999))

async def send_verification_sms(phone: str):
    """Send SMS verification code"""
    code = generate_verification_code()
    
    if client is None:
        print(f"🧪 SMS Simulation - Code for {phone}: {code}")
        return {"code": code, "message_sid": "sim_" + code}
    
    message_body = f"""
ChillConnect Verification

Your verification code is: {code}

Enter this code in the app to verify your phone number.

If you didn't request this, please ignore this message.
    """.strip()
    
    try:
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone
        )
        print(f"SMS sent successfully: {message.sid}")
        # In production, store the code in Redis with expiration
        return {"code": code, "message_sid": message.sid}
    except Exception as e:
        print(f"Failed to send SMS: {e}")
        raise e

async def send_booking_reminder_sms(phone: str, booking_details: dict):
    """Send booking reminder SMS"""
    if client is None:
        print(f"🧪 SMS Simulation - Booking reminder sent to {phone}")
        return True
    
    message_body = f"""
ChillConnect Booking Reminder

Your appointment is scheduled for:
{booking_details.get('start_time')}

Duration: {booking_details.get('duration_hours')} hours
Booking ID: #{booking_details.get('booking_id')}

Please be punctual. Have a great experience!
    """.strip()
    
    try:
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone
        )
        return True
    except Exception as e:
        print(f"Failed to send booking reminder SMS: {e}")
        return False

async def send_emergency_alert_sms(phone: str, alert_message: str):
    """Send emergency alert SMS to admin/manager"""
    if client is None:
        print(f"🧪 SMS Simulation - Emergency alert sent to {phone}: {alert_message}")
        return True
    
    message_body = f"""
CHILLCONNECT ALERT

{alert_message}

Please review immediately in the admin dashboard.

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    """.strip()
    
    try:
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone
        )
        return True
    except Exception as e:
        print(f"Failed to send emergency alert SMS: {e}")
        return False