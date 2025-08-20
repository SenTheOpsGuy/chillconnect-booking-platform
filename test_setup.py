#!/usr/bin/env python3
"""
Quick test script to verify ChillConnect platform setup
"""

import os
import sys
import subprocess
import requests
from pathlib import Path

def check_file_exists(file_path):
    """Check if a file exists"""
    if os.path.exists(file_path):
        print(f"✅ {file_path}")
        return True
    else:
        print(f"❌ {file_path}")
        return False

def test_backend_structure():
    """Test backend file structure"""
    print("\n🔍 Testing Backend Structure...")
    
    backend_files = [
        "backend/main.py",
        "backend/requirements.txt",
        "backend/app/core/config.py",
        "backend/app/database/database.py",
        "backend/app/models/user.py",
        "backend/app/api/auth.py",
        "backend/app/api/tokens.py",
        "backend/app/api/bookings.py",
        "backend/app/api/chat.py",
        "backend/app/api/admin.py",
        "backend/app/api/support.py",
        "backend/app/services/email.py",
        "backend/app/services/sms.py",
        "backend/app/services/payment.py",
    ]
    
    all_exist = True
    for file_path in backend_files:
        if not check_file_exists(file_path):
            all_exist = False
    
    return all_exist

def test_frontend_structure():
    """Test frontend file structure"""
    print("\n🔍 Testing Frontend Structure...")
    
    frontend_files = [
        "frontend/package.json",
        "frontend/tailwind.config.js",
        "frontend/src/App.tsx",
        "frontend/src/index.tsx",
        "frontend/src/index.css",
        "frontend/src/contexts/AuthContext.tsx",
        "frontend/src/components/Layout.tsx",
        "frontend/src/pages/Home.tsx",
        "frontend/src/pages/auth/Login.tsx",
        "frontend/src/pages/auth/Register.tsx",
    ]
    
    all_exist = True
    for file_path in frontend_files:
        if not check_file_exists(file_path):
            all_exist = False
    
    return all_exist

def test_deployment_config():
    """Test deployment configuration files"""
    print("\n🔍 Testing Deployment Configuration...")
    
    config_files = [
        "vercel.json",
        "README.md",
        ".gitignore",
        "backend/.env.example",
        "frontend/.env.example",
    ]
    
    all_exist = True
    for file_path in config_files:
        if not check_file_exists(file_path):
            all_exist = False
    
    return all_exist

def check_python_dependencies():
    """Check if Python dependencies can be imported"""
    print("\n🔍 Testing Python Dependencies...")
    
    try:
        import fastapi
        print("✅ FastAPI")
    except ImportError:
        print("❌ FastAPI - Run: pip install fastapi")
        return False
    
    try:
        import sqlalchemy
        print("✅ SQLAlchemy")
    except ImportError:
        print("❌ SQLAlchemy - Run: pip install sqlalchemy")
        return False
    
    try:
        import pydantic
        print("✅ Pydantic")
    except ImportError:
        print("❌ Pydantic - Run: pip install pydantic")
        return False
    
    return True

def test_backend_imports():
    """Test backend imports"""
    print("\n🔍 Testing Backend Imports...")
    
    try:
        sys.path.append('backend')
        from app.core.config import settings
        print("✅ Config import successful")
        
        from app.models.user import User
        print("✅ User model import successful")
        
        from app.api.auth import router
        print("✅ Auth API import successful")
        
        return True
    except Exception as e:
        print(f"❌ Backend import failed: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 ChillConnect Platform Setup Test")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 5
    
    # Test backend structure
    if test_backend_structure():
        tests_passed += 1
        print("✅ Backend structure test passed")
    else:
        print("❌ Backend structure test failed")
    
    # Test frontend structure
    if test_frontend_structure():
        tests_passed += 1
        print("✅ Frontend structure test passed")
    else:
        print("❌ Frontend structure test failed")
    
    # Test deployment config
    if test_deployment_config():
        tests_passed += 1
        print("✅ Deployment configuration test passed")
    else:
        print("❌ Deployment configuration test failed")
    
    # Test Python dependencies
    if check_python_dependencies():
        tests_passed += 1
        print("✅ Python dependencies test passed")
    else:
        print("❌ Python dependencies test failed")
    
    # Test backend imports
    if test_backend_imports():
        tests_passed += 1
        print("✅ Backend imports test passed")
    else:
        print("❌ Backend imports test failed")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! ChillConnect platform is ready.")
        print("\n📋 Next Steps:")
        print("1. Set up PostgreSQL database")
        print("2. Configure environment variables (.env files)")
        print("3. Run: python backend/setup_initial_data.py")
        print("4. Start backend: uvicorn main:app --reload")
        print("5. Start frontend: npm start")
        print("6. Deploy to Vercel")
    else:
        print("⚠️  Some tests failed. Please fix the issues before proceeding.")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)