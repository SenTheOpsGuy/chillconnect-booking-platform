#!/bin/bash

# ChillConnect Platform Startup Script
echo "🚀 Starting ChillConnect Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the ChillConnect project root directory"
    exit 1
fi

print_status "Setting up ChillConnect platform..."

# Install backend dependencies
print_status "Installing Python dependencies..."
cd backend
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    print_success "Python dependencies installed successfully"
else
    print_error "Failed to install Python dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found in backend directory"
    print_status "Please configure your environment variables in backend/.env"
else
    print_success "Environment file found"
fi

# Initialize database
print_status "Setting up database and initial data..."
python setup_initial_data.py

if [ $? -eq 0 ]; then
    print_success "Database initialized successfully"
else
    print_warning "Database initialization failed - you may need to set up PostgreSQL first"
fi

# Go back to root directory
cd ..

# Install frontend dependencies
print_status "Installing Node.js dependencies..."
cd frontend

if command -v npm &> /dev/null; then
    npm install
    if [ $? -eq 0 ]; then
        print_success "Node.js dependencies installed successfully"
    else
        print_error "Failed to install Node.js dependencies"
        exit 1
    fi
else
    print_error "npm not found. Please install Node.js first"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found in frontend directory"
    print_status "Please configure your environment variables in frontend/.env"
else
    print_success "Frontend environment file found"
fi

cd ..

print_success "Setup completed!"
echo ""
print_status "🎉 ChillConnect is ready to run!"
echo ""
print_status "To start the platform:"
echo "1. Start the backend:"
echo "   cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo ""
echo "2. Start the frontend (in a new terminal):"
echo "   cd frontend && npm start"
echo ""
print_status "📋 Important Notes:"
echo "• Backend will run on: http://localhost:8000"
echo "• Frontend will run on: http://localhost:3000"
echo "• API docs available at: http://localhost:8000/docs"
echo "• Default admin login: admin@chillconnect.com / admin123!@#"
echo ""
print_warning "⚠️  Remember to:"
echo "• Set up PostgreSQL database"
echo "• Configure your Twilio phone number and auth token"
echo "• Set up Redis for caching"
echo "• Change the default admin password"
echo ""
print_status "🚀 Ready to launch ChillConnect!"