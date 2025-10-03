# PostgreSQL Backend for Pre-Interview Test Platform

This backend has been converted from MongoDB to PostgreSQL and includes all the necessary functionality for the interview test platform.

## Features

- **User Authentication**: JWT-based authentication with role-based access control (admin/applicant)
- **Test Management**: Create, view, and manage pre-interview tests
- **Test Invitations**: Send test invitations with unique tokens and scheduling
- **Test Taking**: Secure test taking interface with time validation
- **Results Management**: View and analyze test results
- **Video Monitoring**: WebRTC signaling for proctoring
- **PostgreSQL Database**: Full relational database implementation

## Setup Instructions

### 1. Database Setup

1. Install PostgreSQL on your system
2. Create a database named `interview_platform`
3. Run the schema file: `backend-postgress/postgres_schema.sql`

### 2. Environment Variables

Create a `.env` file in the backend-postgress directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=interview_platform

# Security
SECRET_KEY=your-secret-key-here-change-in-production

# CORS Configuration (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Application Configuration
ACCESS_TOKEN_EXPIRE_MINUTES=240  # 4 hours
```

### 3. Dependencies Installation

```bash
cd backend-postgress
pip install -r requirements.txt
```

Or if using the virtual environment:

```bash
cd backend-postgress
.\venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

### 4. Running the Application

```bash
cd backend-postgress
python fastapi_postgres_backend.py
```

The API will be available at `http://localhost:8000` with the following endpoints:

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Test Management (Admin Only)
- `POST /api/tests` - Create new test
- `GET /api/tests` - Get all tests
- `GET /api/tests/{test_id}` - Get specific test

### Test Invitations
- `POST /api/invites` - Send test invitation
- `GET /api/invites` - Get sent invitations (admin)
- `GET /api/invites/token/{token}` - Get invitation by token
- `POST /api/invites/token/{token}/schedule` - Schedule test

### Test Taking
- `GET /api/take-test/{token}` - Get test for taking
- `POST /api/start-test/{token}` - Start test monitoring
- `POST /api/submit-test/{token}` - Submit test answers

### Results
- `GET /api/results` - Get all test results (admin)
- `GET /api/results/{submission_id}` - Get specific result details
- `GET /api/my-invites` - Get user's invitations (applicant)

### WebRTC Signaling
- `POST /api/webrtc/offer` - Send WebRTC offer
- `POST /api/webrtc/answer` - Send WebRTC answer
- `GET /api/webrtc/signals/{signal_type}` - Get WebRTC signals

## Database Schema

The PostgreSQL schema includes the following tables:
- `users` - User accounts with authentication
- `tests` - Test definitions
- `questions` - Individual test questions
- `test_invites` - Test invitations sent to applicants
- `test_submissions` - Completed test submissions
- `test_answers` - Individual answers to questions
- `webrtc_signals` - WebRTC signaling data for video monitoring

## Key Differences from MongoDB Version

1. **Relational Structure**: Uses proper foreign key relationships
2. **UUID Primary Keys**: All tables use UUID for primary keys
3. **JSONB Fields**: Options and signaling data stored as JSONB
4. **Proper Indexing**: Optimized indexes for performance
5. **Views**: Includes useful views for common queries
6. **Constraints**: Proper data validation constraints

## Migration from MongoDB

The main changes when migrating from MongoDB:

1. **Connection**: Uses `asyncpg` instead of `motor`
2. **Queries**: Uses SQL queries instead of MongoDB queries
3. **Data Types**: Proper type handling with UUID conversion
4. **Relationships**: Explicit foreign key relationships
5. **Transactions**: Database transactions for data consistency

## Development Notes

- All database operations use connection pooling for performance
- Proper error handling and validation throughout
- CORS middleware configured for frontend integration
- Logging configured for debugging and monitoring
- JWT tokens with configurable expiration
- Password hashing using bcrypt
- Email functionality (placeholder for future implementation)
