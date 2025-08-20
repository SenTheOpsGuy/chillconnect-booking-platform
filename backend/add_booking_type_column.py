#!/usr/bin/env python3
"""
Add booking_type column to existing bookings table
"""

import sys
import os

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from sqlalchemy import text

def add_booking_type_column():
    """Add booking_type column to bookings table"""
    print("🔧 Adding booking_type column to bookings table...")
    
    with engine.begin() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND column_name='booking_type';"))
            if not result.fetchone():
                # Add the new column
                conn.execute(text("ALTER TABLE bookings ADD COLUMN booking_type VARCHAR(50) DEFAULT 'outcall';"))
                # Update existing records to have a default value
                conn.execute(text("UPDATE bookings SET booking_type = 'outcall' WHERE booking_type IS NULL;"))
                print('✅ Added booking_type column successfully')
            else:
                print('✅ booking_type column already exists')
        except Exception as e:
            print(f'❌ Error: {e}')
            raise

if __name__ == "__main__":
    add_booking_type_column()