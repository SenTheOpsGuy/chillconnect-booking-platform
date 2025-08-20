from app.models.chat import TemplateCategory

# Predefined chat templates for the platform
DEFAULT_TEMPLATES = [
    # Booking Coordination Templates
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "What time works best for you?",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "Can we confirm the appointment for [time] on [date]?",
        "variables": ["time", "date"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "I need to reschedule our appointment. Are you available on [alternative_date] at [alternative_time]?",
        "variables": ["alternative_date", "alternative_time"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "Please confirm the location for our meeting.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "I'm running [minutes] minutes late. See you soon!",
        "variables": ["minutes"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "I'll be there at the scheduled time. Looking forward to meeting you!",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "Would [day] at [time] work for you?",
        "variables": ["day", "time"],
        "admin_only": False
    },
    
    # Service Discussion Templates
    {
        "category": TemplateCategory.SERVICE,
        "template_text": "What services are you interested in today?",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SERVICE,
        "template_text": "My rate is [rate] tokens per hour.",
        "variables": ["rate"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SERVICE,
        "template_text": "The session duration will be [hours] hours.",
        "variables": ["hours"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SERVICE,
        "template_text": "Do you have any specific preferences or requests?",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SERVICE,
        "template_text": "Please review my service menu and let me know what interests you.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SERVICE,
        "template_text": "I specialize in [specialties]. Would you like to know more?",
        "variables": ["specialties"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SERVICE,
        "template_text": "The total cost for [hours] hours will be [total_tokens] tokens.",
        "variables": ["hours", "total_tokens"],
        "admin_only": False
    },
    
    # Logistics Templates
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "I'll be arriving at the specified time.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "Please share the exact address when you're ready.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "I'm here at [location]. Please let me know when you're ready.",
        "variables": ["location"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "Thank you for a wonderful time! Take care.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "Session is complete. Hope you enjoyed our time together!",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "I'm on my way and will arrive in approximately [minutes] minutes.",
        "variables": ["minutes"],
        "admin_only": False
    },
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "Could you please confirm the parking arrangements?",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.LOGISTICS,
        "template_text": "What's the best entrance to use when I arrive?",
        "variables": [],
        "admin_only": False
    },
    
    # Support Templates
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "I have a question about our booking.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "There seems to be an issue that needs attention.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "I need to contact platform support about this matter.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "Please help resolve this matter through the proper channels.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "I would like to file a formal complaint about this booking.",
        "variables": [],
        "admin_only": False
    },
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "Could we discuss this through the platform's dispute resolution?",
        "variables": [],
        "admin_only": False
    },
    
    # Admin-only Templates
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "This conversation is being monitored for quality assurance.",
        "variables": [],
        "admin_only": True
    },
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "Platform support has reviewed your booking and [action_taken].",
        "variables": ["action_taken"],
        "admin_only": True
    },
    {
        "category": TemplateCategory.SUPPORT,
        "template_text": "Your account is currently under review. Please contact support.",
        "variables": [],
        "admin_only": True
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "This booking has been flagged for admin review due to [reason].",
        "variables": ["reason"],
        "admin_only": True
    },
    {
        "category": TemplateCategory.BOOKING,
        "template_text": "Platform intervention: This booking is being monitored by our safety team.",
        "variables": [],
        "admin_only": True
    }
]

def create_default_templates(db, admin_user_id: int):
    """Create default chat templates in the database"""
    from app.models.chat import ChatTemplate
    
    for template_data in DEFAULT_TEMPLATES:
        # Check if template already exists
        existing = db.query(ChatTemplate).filter(
            ChatTemplate.template_text == template_data["template_text"]
        ).first()
        
        if not existing:
            template = ChatTemplate(
                category=template_data["category"],
                template_text=template_data["template_text"],
                variables=template_data["variables"],
                admin_only=template_data["admin_only"],
                created_by=admin_user_id,
                active=True,
                usage_count=0
            )
            db.add(template)
    
    db.commit()
    print(f"Created {len(DEFAULT_TEMPLATES)} default chat templates")