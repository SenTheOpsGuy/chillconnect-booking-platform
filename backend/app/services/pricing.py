from sqlalchemy.orm import Session
from app.models.platform_fee import PlatformFeeConfig
from app.models.user import User, UserRole
from app.core.config import settings
from typing import Tuple, Optional

class PricingService:
    """Service to handle all pricing calculations and platform fee logic"""
    
    @staticmethod
    def get_platform_fee_percentage(db: Session, provider_id: Optional[int] = None) -> float:
        """
        Get the platform fee percentage for a provider or global default
        Returns the fee as a decimal (e.g., 0.30 for 30%)
        """
        if provider_id:
            # Check for provider-specific fee
            provider_fee = db.query(PlatformFeeConfig).filter(
                PlatformFeeConfig.provider_id == provider_id,
                PlatformFeeConfig.is_active == True
            ).first()
            
            if provider_fee:
                return provider_fee.fee_percentage
        
        # Check for global fee configuration
        global_fee = db.query(PlatformFeeConfig).filter(
            PlatformFeeConfig.provider_id.is_(None),
            PlatformFeeConfig.is_active == True
        ).order_by(PlatformFeeConfig.created_at.desc()).first()
        
        if global_fee:
            return global_fee.fee_percentage
        
        # Fallback to default from settings
        return settings.PLATFORM_COMMISSION
    
    @staticmethod
    def calculate_provider_rates(db: Session, provider_hourly_rate: int, provider_id: int) -> dict:
        """
        Calculate all rate variations for a provider
        Returns:
        - provider_rate: What provider set (100 tokens/hr)
        - seeker_rate: What seeker sees with platform fee (130 tokens/hr)
        - platform_fee_percentage: The fee percentage (0.30)
        - platform_fee_amount: The fee amount per hour (30 tokens)
        """
        platform_fee_percentage = PricingService.get_platform_fee_percentage(db, provider_id)
        platform_fee_amount = int(provider_hourly_rate * platform_fee_percentage)
        seeker_rate = provider_hourly_rate + platform_fee_amount
        
        return {
            "provider_rate": provider_hourly_rate,
            "seeker_rate": seeker_rate,
            "platform_fee_percentage": platform_fee_percentage,
            "platform_fee_amount": platform_fee_amount,
            "platform_fee_percentage_display": int(platform_fee_percentage * 100)  # For UI display (30%)
        }
    
    @staticmethod
    def calculate_booking_cost(db: Session, provider_hourly_rate: int, provider_id: int, duration_hours: int) -> dict:
        """
        Calculate total booking cost breakdown
        """
        rates = PricingService.calculate_provider_rates(db, provider_hourly_rate, provider_id)
        
        provider_total = rates["provider_rate"] * duration_hours
        platform_fee_total = rates["platform_fee_amount"] * duration_hours
        seeker_total = rates["seeker_rate"] * duration_hours
        
        return {
            "provider_earnings": provider_total,
            "platform_fee": platform_fee_total,
            "total_cost": seeker_total,
            "duration_hours": duration_hours,
            "hourly_breakdown": rates
        }
    
    @staticmethod
    def get_provider_preview_pricing(db: Session, provider_id: int) -> dict:
        """
        Get pricing information for provider to preview how their listing appears to seekers
        """
        from app.models.profile import Profile
        
        profile = db.query(Profile).filter(Profile.user_id == provider_id).first()
        if not profile or not profile.hourly_rate:
            return {
                "error": "Profile not found or hourly rate not set"
            }
        
        rates = PricingService.calculate_provider_rates(db, profile.hourly_rate, provider_id)
        
        return {
            "your_rate": rates["provider_rate"],
            "shown_to_seekers": rates["seeker_rate"],
            "platform_fee_percentage": rates["platform_fee_percentage_display"],
            "platform_fee_per_hour": rates["platform_fee_amount"],
            "disclaimer": f"Seekers will see your service priced at {rates['seeker_rate']} tokens/hour. "
                         f"This includes a {rates['platform_fee_percentage_display']}% platform fee. "
                         f"You will receive {rates['provider_rate']} tokens per hour after the platform fee."
        }
    
    @staticmethod
    def set_platform_fee(db: Session, admin_user_id: int, fee_percentage: float, 
                        provider_id: Optional[int] = None) -> PlatformFeeConfig:
        """
        Set platform fee (global or for specific provider)
        Only super admins can set fees directly
        """
        # Deactivate existing fee config
        existing_query = db.query(PlatformFeeConfig).filter(
            PlatformFeeConfig.is_active == True
        )
        
        if provider_id:
            existing_query = existing_query.filter(PlatformFeeConfig.provider_id == provider_id)
        else:
            existing_query = existing_query.filter(PlatformFeeConfig.provider_id.is_(None))
        
        existing_config = existing_query.first()
        if existing_config:
            existing_config.is_active = False
        
        # Create new fee config
        new_config = PlatformFeeConfig(
            provider_id=provider_id,
            fee_percentage=fee_percentage,
            created_by=admin_user_id,
            is_active=True
        )
        
        db.add(new_config)
        db.commit()
        
        return new_config