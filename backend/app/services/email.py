import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from app.core.config import settings

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key['api-key'] = settings.BREVO_API_KEY

api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

async def send_verification_email(email: str, user_id: int):
    """Send email verification link"""
    verification_link = f"https://your-domain.com/verify-email/{user_id}"
    
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email}],
        sender={"name": "ChillConnect", "email": "noreply@chillconnect.com"},
        subject="Verify your ChillConnect account",
        html_content=f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #111; padding: 30px; border-radius: 10px;">
                <h1 style="color: #DC2626; text-align: center;">Welcome to ChillConnect</h1>
                <p>Thank you for joining ChillConnect, the premium adult services platform.</p>
                <p>Please verify your email address by clicking the link below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" 
                       style="background-color: #DC2626; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Verify Email Address
                    </a>
                </div>
                <p style="color: #6B7280; font-size: 14px;">
                    If you didn't create this account, please ignore this email.
                </p>
            </div>
        </body>
        </html>
        """
    )
    
    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        print(f"Email sent successfully: {api_response}")
        return True
    except ApiException as e:
        print(f"Exception when calling TransactionalEmailsApi->send_transac_email: {e}")
        return False

async def send_booking_confirmation_email(email: str, booking_details: dict):
    """Send booking confirmation email"""
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email}],
        sender={"name": "ChillConnect", "email": "noreply@chillconnect.com"},
        subject="Booking Confirmation - ChillConnect",
        html_content=f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #111; padding: 30px; border-radius: 10px;">
                <h1 style="color: #DC2626; text-align: center;">Booking Confirmed</h1>
                <p>Your booking has been confirmed with the following details:</p>
                <div style="background-color: #222; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Date & Time:</strong> {booking_details.get('start_time')}</p>
                    <p><strong>Duration:</strong> {booking_details.get('duration_hours')} hours</p>
                    <p><strong>Total Cost:</strong> {booking_details.get('total_tokens')} tokens</p>
                    <p><strong>Booking ID:</strong> #{booking_details.get('booking_id')}</p>
                </div>
                <p style="color: #6B7280; font-size: 14px;">
                    Please keep this confirmation for your records.
                </p>
            </div>
        </body>
        </html>
        """
    )
    
    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"Exception when sending booking confirmation: {e}")
        return False

async def send_support_ticket_email(email: str, ticket_id: int, subject: str):
    """Send support ticket confirmation email"""
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email}],
        sender={"name": "ChillConnect Support", "email": "support@chillconnect.com"},
        subject=f"Support Ticket #{ticket_id} - {subject}",
        html_content=f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #111; padding: 30px; border-radius: 10px;">
                <h1 style="color: #DC2626; text-align: center;">Support Ticket Created</h1>
                <p>We've received your support request and will respond within 24 hours.</p>
                <div style="background-color: #222; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Ticket ID:</strong> #{ticket_id}</p>
                    <p><strong>Subject:</strong> {subject}</p>
                </div>
                <p style="color: #6B7280; font-size: 14px;">
                    You can check the status of your ticket in your dashboard.
                </p>
            </div>
        </body>
        </html>
        """
    )
    
    try:
        api_response = api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"Exception when sending support ticket email: {e}")
        return False