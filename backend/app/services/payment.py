import paypalrestsdk
from typing import Dict, Any
from app.core.config import settings

# Configure PayPal SDK
paypalrestsdk.configure({
    "mode": settings.PAYPAL_MODE,  # sandbox or live
    "client_id": settings.PAYPAL_CLIENT_ID,
    "client_secret": settings.PAYPAL_CLIENT_SECRET
})

class PayPalService:
    
    @staticmethod
    def create_payment(amount_inr: float, description: str, return_url: str, cancel_url: str) -> Dict[str, Any]:
        """Create a PayPal payment"""
        payment = paypalrestsdk.Payment({
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": return_url,
                "cancel_url": cancel_url
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "ChillConnect Tokens",
                        "sku": "TOKENS",
                        "price": str(amount_inr),
                        "currency": "INR",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "total": str(amount_inr),
                    "currency": "INR"
                },
                "description": description
            }]
        })
        
        if payment.create():
            # Find approval URL
            for link in payment.links:
                if link.rel == "approval_url":
                    return {
                        "success": True,
                        "payment_id": payment.id,
                        "approval_url": link.href
                    }
            return {"success": False, "error": "No approval URL found"}
        else:
            return {"success": False, "error": payment.error}
    
    @staticmethod
    def execute_payment(payment_id: str, payer_id: str) -> Dict[str, Any]:
        """Execute approved PayPal payment"""
        payment = paypalrestsdk.Payment.find(payment_id)
        
        if payment.execute({"payer_id": payer_id}):
            transaction = payment.transactions[0]
            return {
                "success": True,
                "payment_id": payment_id,
                "transaction_id": transaction.related_resources[0].sale.id,
                "amount": float(transaction.amount.total),
                "currency": transaction.amount.currency,
                "status": payment.state
            }
        else:
            return {"success": False, "error": payment.error}
    
    @staticmethod
    def get_payment_details(payment_id: str) -> Dict[str, Any]:
        """Get PayPal payment details"""
        try:
            payment = paypalrestsdk.Payment.find(payment_id)
            return {
                "success": True,
                "payment": {
                    "id": payment.id,
                    "state": payment.state,
                    "amount": payment.transactions[0].amount.total,
                    "currency": payment.transactions[0].amount.currency,
                    "create_time": payment.create_time,
                    "update_time": payment.update_time
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def refund_payment(sale_id: str, amount: float, currency: str = "INR") -> Dict[str, Any]:
        """Refund a PayPal payment"""
        try:
            sale = paypalrestsdk.Sale.find(sale_id)
            refund = sale.refund({
                "amount": {
                    "total": str(amount),
                    "currency": currency
                }
            })
            
            if refund.success():
                return {
                    "success": True,
                    "refund_id": refund.id,
                    "amount": amount,
                    "status": refund.state
                }
            else:
                return {"success": False, "error": refund.error}
        except Exception as e:
            return {"success": False, "error": str(e)}

def calculate_token_package_price(token_count: int) -> float:
    """Calculate price for token packages"""
    base_price = token_count * settings.TOKEN_VALUE_INR
    
    # Apply discounts for larger packages
    if token_count >= 100:
        discount = 0.15  # 15% discount for 100+ tokens
    elif token_count >= 50:
        discount = 0.10  # 10% discount for 50+ tokens
    elif token_count >= 25:
        discount = 0.05  # 5% discount for 25+ tokens
    else:
        discount = 0
    
    final_price = base_price * (1 - discount)
    return round(final_price, 2)

def get_token_packages():
    """Get available token packages with pricing"""
    packages = [5, 10, 25, 50, 100]
    return [
        {
            "tokens": package,
            "price_inr": calculate_token_package_price(package),
            "savings": round(package * settings.TOKEN_VALUE_INR - calculate_token_package_price(package), 2)
        }
        for package in packages
    ]