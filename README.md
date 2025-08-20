# ChillConnect - Premium Adult Services Booking Platform

A comprehensive adult services booking platform with token-based payments, template communication, and multi-role admin system.

## 🌟 Features

### Core Platform Features
- **Multi-role Authentication**: Seeker, Provider, Employee, Manager, Admin, Super Admin
- **Token-based Payment System**: Secure PayPal integration with escrow functionality
- **Template-based Chat**: Pre-approved message templates for safe communication
- **Round-robin Assignment**: Automatic task distribution for verification and monitoring
- **Comprehensive Admin Panel**: Role-based access control with dashboard analytics
- **Dispute Resolution**: Multi-level escalation system for issue resolution
- **Help & Support**: Ticket system with knowledge base and live chat

### Security & Safety
- **Age Verification**: Simple 18+ confirmation system
- **User Verification**: Multi-step verification process with employee oversight
- **Secure Payments**: Escrow system with automatic release on completion
- **Template Communication**: Controlled messaging to maintain professionalism
- **Admin Monitoring**: Real-time oversight of bookings and user interactions

### Premium UI Design
- **Sensual Aesthetic**: Black, red, and gray color scheme
- **Responsive Design**: Mobile-first approach with smooth animations
- **Professional Interface**: Clean, elegant design with premium feel
- **Intuitive Navigation**: User-friendly interface for all user types

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── api/              # API endpoints
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   ├── core/             # Configuration & security
│   └── database/         # Database setup
├── main.py               # FastAPI application
└── requirements.txt      # Dependencies
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/       # Reusable components
│   ├── pages/           # Page components
│   ├── contexts/        # React contexts
│   ├── services/        # API services
│   └── styles/          # CSS styles
├── package.json         # Dependencies
└── tailwind.config.js   # Tailwind configuration
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- Redis 6+

### Backend Setup
1. **Clone and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup
1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server:**
   ```bash
   npm start
   ```

### Database Setup
1. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE chillconnect;
   ```

2. **Database migrations are handled automatically by SQLAlchemy**

## 🔧 Configuration

### Required Environment Variables

#### Backend (.env)
```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost/chillconnect
BREVO_API_KEY=your-brevo-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
REDIS_URL=redis://localhost:6379
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_PAYPAL_CLIENT_ID=your-paypal-client-id
```

## 🌐 Deployment on Vercel

1. **Connect your GitHub repository to Vercel**

2. **Configure environment variables in Vercel dashboard:**
   - All backend environment variables
   - Set `REACT_APP_API_URL` to your Vercel domain

3. **Deploy:**
   ```bash
   vercel --prod
   ```

The platform will be available at your Vercel domain.

## 🛡️ Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Session management

### Payment Security
- PayPal integration for secure payments
- Escrow system for transaction protection
- Token-based economy (1 token = ₹100)
- Platform commission tracking

### Communication Safety
- Template-only messaging system
- Admin-moderated conversations
- Flagging system for inappropriate content
- Automatic logging of all interactions

## 👥 User Roles

### Seekers
- Browse and book providers
- Manage token wallet
- Chat through templates
- Rate and review providers

### Providers
- Create and manage profiles
- Set hourly rates and availability
- Accept/decline bookings
- Respond to reviews

### Employees
- Verify user accounts and documents
- Monitor assigned bookings
- Handle basic support requests
- Update verification status

### Managers
- Oversee employee teams
- Handle dispute resolution
- Manage quality assurance
- Access performance metrics

### Admins
- Regional user management
- Content moderation
- Policy enforcement
- Financial oversight

### Super Admins
- Platform-wide configuration
- Role management
- System analytics
- Security settings

## 📊 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify-email` - Email verification

#### Providers
- `GET /api/v1/providers/search` - Search providers
- `GET /api/v1/providers/{id}` - Get provider details
- `PUT /api/v1/providers/my-profile` - Update provider profile

#### Bookings
- `POST /api/v1/bookings/create` - Create booking
- `GET /api/v1/bookings/my-bookings` - Get user bookings
- `PUT /api/v1/bookings/{id}/status` - Update booking status

#### Tokens
- `GET /api/v1/tokens/balance` - Get token balance
- `POST /api/v1/tokens/purchase` - Purchase tokens
- `GET /api/v1/tokens/transactions` - Get transaction history

#### Chat
- `GET /api/v1/chat/templates` - Get message templates
- `POST /api/v1/chat/{booking_id}/send` - Send template message
- `GET /api/v1/chat/{booking_id}/messages` - Get chat history

#### Admin
- `GET /api/v1/admin/dashboard` - Get admin dashboard stats
- `GET /api/v1/admin/verification-queue` - Get verification queue
- `PUT /api/v1/admin/verification/{id}/approve` - Approve verification

## 🎨 UI Components

### Premium Design System
- **Color Palette**: Black (#000000), Red (#DC2626), Gray (#6B7280)
- **Typography**: Inter and Poppins fonts
- **Components**: Cards, buttons, forms with sensual aesthetic
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design approach

### Key UI Features
- Dark theme with red accents
- Glass morphism effects
- Gradient backgrounds
- Custom scrollbars
- Loading animations
- Status badges
- Rating systems

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📈 Monitoring & Analytics

### Admin Dashboard Metrics
- User registration and verification rates
- Booking completion and cancellation rates
- Token purchase and platform revenue
- Support ticket resolution times
- Employee performance metrics

### Platform Analytics
- User engagement tracking
- Provider performance metrics
- Revenue and commission analysis
- Geographic usage patterns
- Safety and compliance monitoring

## 🆘 Support

### For Users
- In-app support ticket system
- Knowledge base with FAQ
- Live chat support
- Email support

### For Developers
- API documentation
- Code comments and documentation
- GitHub issues and discussions
- Development setup guides

## 📄 License

This project is proprietary software. All rights reserved.

## ⚠️ Legal Notice

This platform is intended for adults (18+) only. All users must comply with local laws and regulations regarding adult services. The platform operates as a booking and communication intermediary and does not provide services directly.

## 🤝 Contributing

This is a private project. For access and contribution guidelines, please contact the development team.

---

**ChillConnect** - Premium Adult Services Platform
© 2025 All Rights Reserved