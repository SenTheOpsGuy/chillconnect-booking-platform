#!/usr/bin/env python3
"""
Fix booking_type enum values in database
"""

import sys
import os

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from sqlalchemy import text

def fix_booking_type_enum():
    """Fix booking_type enum values in database"""
    print("🔧 Fixing booking_type enum values...")
    
    with engine.begin() as conn:
        try:
            # Update lowercase values to uppercase to match enum definition
            conn.execute(text("UPDATE bookings SET booking_type = 'OUTCALL' WHERE booking_type = 'outcall';"))
            conn.execute(text("UPDATE bookings SET booking_type = 'INCALL' WHERE booking_type = 'incall';"))
            print('✅ Fixed booking_type enum values successfully')
            
            # Check the updated values
            result = conn.execute(text("SELECT DISTINCT booking_type FROM bookings;"))
            values = [row[0] for row in result.fetchall()]
            print(f'✅ Current booking_type values: {values}')
        except Exception as e:
            print(f'❌ Error: {e}')
            raise

if __name__ == "__main__":
    fix_booking_type_enum()