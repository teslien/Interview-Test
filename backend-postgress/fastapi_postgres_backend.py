from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PostgreSQL connection pool
db_pool = None

# Security
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str  # "admin" or "applicant"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "applicant"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "multiple_choice", "coding", "essay"
    question: str
    options: Optional[List[str]] = None  # For multiple choice
    correct_answer: Optional[str] = None  # For multiple choice
    expected_language: Optional[str] = None  # For coding questions
    points: int = 1

class Test(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    questions: List[Question]
    duration_minutes: int
    created_by: str  # admin user id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class TestCreate(BaseModel):
    title: str
    description: str
    questions: List[Question]
    duration_minutes: int

class TestInvite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    applicant_email: EmailStr
    applicant_name: str
    invited_by: str  # admin user id
    invite_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scheduled_date: Optional[datetime] = None
    status: str = "sent"  # "sent", "scheduled", "in_progress", "completed", "expired"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TestInviteCreate(BaseModel):
    test_id: str
    applicant_email: EmailStr
    applicant_name: str

class ScheduleTest(BaseModel):
    scheduled_date: datetime

class TestAnswer(BaseModel):
    question_id: str
    answer: str  # JSON string for complex answers

class TestSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invite_id: str
    test_id: str
    applicant_email: EmailStr
    answers: List[TestAnswer]
    started_at: Optional[datetime] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    score: Optional[float] = None
    is_monitored: bool = False

class TestSubmissionCreate(BaseModel):
    answers: List[TestAnswer]

# Database connection
async def init_db():
    global db_pool
    db_pool = await asyncpg.create_pool(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=int(os.environ.get('DB_PORT', 5432)),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', 'password'),
        database=os.environ.get('DB_NAME', 'interview_platform'),
        min_size=10,
        max_size=20
    )

async def close_db():
    global db_pool
    if db_pool:
        await db_pool.close()

# Helper functions
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, full_name, role, created_at, is_active FROM users WHERE email = $1",
            email
        )
    
    if row is None:
        raise credentials_exception
    
    return User(
        id=str(row['id']),
        email=row['email'],
        full_name=row['full_name'],
        role=row['role'],
        created_at=row['created_at'],
        is_active=row['is_active']
    )

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def send_email(to_email: str, subject: str, body: str):
    try:
        # This is a placeholder - in a real app, you'd configure SMTP settings
        print(f"EMAIL: To: {to_email}, Subject: {subject}")
        print(f"Body: {body}")
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

# Create the app with lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()

# Create the main app
app = FastAPI(title="Pre-Interview Test Platform", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# Root route for testing
@api_router.get("/")
async def root():
    return {"message": "Pre-Interview Test Platform API", "status": "running"}

# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_create: UserCreate):
    async with db_pool.acquire() as conn:
        # Check if user exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            user_create.email
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(user_create.password)
        
        row = await conn.fetchrow("""
            INSERT INTO users (id, email, password, full_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, full_name, role, created_at, is_active
        """, uuid.UUID(user_id), user_create.email, hashed_password, 
            user_create.full_name, user_create.role)
        
        return User(
            id=str(row['id']),
            email=row['email'],
            full_name=row['full_name'],
            role=row['role'],
            created_at=row['created_at'],
            is_active=row['is_active']
        )

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, password, full_name, role, created_at, is_active FROM users WHERE email = $1",
            user_login.email
        )
        
        if not user or not verify_password(user_login.password, user['password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user['email']}, expires_delta=access_token_expires
        )
        
        user_obj = User(
            id=str(user['id']),
            email=user['email'],
            full_name=user['full_name'],
            role=user['role'],
            created_at=user['created_at'],
            is_active=user['is_active']
        )
        
        return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Test Management Routes (Admin only)
@api_router.post("/tests", response_model=Test)
async def create_test(test_create: TestCreate, admin: User = Depends(get_admin_user)):
    async with db_pool.acquire() as conn:
        test_id = str(uuid.uuid4())
        
        # Insert test
        test_row = await conn.fetchrow("""
            INSERT INTO tests (id, title, description, duration_minutes, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, title, description, duration_minutes, created_by, created_at, is_active
        """, uuid.UUID(test_id), test_create.title, test_create.description,
            test_create.duration_minutes, uuid.UUID(admin.id))
        
        # Insert questions
        questions = []
        for i, q in enumerate(test_create.questions):
            question_id = str(uuid.uuid4())
            options_json = json.dumps(q.options) if q.options else None
            
            await conn.execute("""
                INSERT INTO questions (id, test_id, type, question, options, correct_answer,
                                     expected_language, points, question_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, uuid.UUID(question_id), uuid.UUID(test_id), q.type, q.question,
                options_json, q.correct_answer, q.expected_language, q.points, i)
            
            questions.append(Question(
                id=question_id,
                type=q.type,
                question=q.question,
                options=q.options,
                correct_answer=q.correct_answer,
                expected_language=q.expected_language,
                points=q.points
            ))
        
        return Test(
            id=str(test_row['id']),
            title=test_row['title'],
            description=test_row['description'],
            questions=questions,
            duration_minutes=test_row['duration_minutes'],
            created_by=str(test_row['created_by']),
            created_at=test_row['created_at'],
            is_active=test_row['is_active']
        )

@api_router.get("/tests", response_model=List[Test])
async def get_tests(admin: User = Depends(get_admin_user)):
    async with db_pool.acquire() as conn:
        # Get all active tests
        test_rows = await conn.fetch(
            "SELECT id, title, description, duration_minutes, created_by, created_at, is_active "
            "FROM tests WHERE is_active = true ORDER BY created_at DESC"
        )
        
        tests = []
        for test_row in test_rows:
            # Get questions for each test
            question_rows = await conn.fetch("""
                SELECT id, type, question, options, correct_answer, expected_language, points
                FROM questions WHERE test_id = $1 ORDER BY question_order
            """, test_row['id'])
            
            questions = []
            for q_row in question_rows:
                options = json.loads(q_row['options']) if q_row['options'] else None
                questions.append(Question(
                    id=str(q_row['id']),
                    type=q_row['type'],
                    question=q_row['question'],
                    options=options,
                    correct_answer=q_row['correct_answer'],
                    expected_language=q_row['expected_language'],
                    points=q_row['points']
                ))
            
            tests.append(Test(
                id=str(test_row['id']),
                title=test_row['title'],
                description=test_row['description'],
                questions=questions,
                duration_minutes=test_row['duration_minutes'],
                created_by=str(test_row['created_by']),
                created_at=test_row['created_at'],
                is_active=test_row['is_active']
            ))
        
        return tests

@api_router.get("/tests/{test_id}", response_model=Test)
async def get_test(test_id: str, admin: User = Depends(get_admin_user)):
    async with db_pool.acquire() as conn:
        test_row = await conn.fetchrow(
            "SELECT id, title, description, duration_minutes, created_by, created_at, is_active "
            "FROM tests WHERE id = $1 AND is_active = true",
            uuid.UUID(test_id)
        )
        
        if not test_row:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Get questions
        question_rows = await conn.fetch("""
            SELECT id, type, question, options, correct_answer, expected_language, points
            FROM questions WHERE test_id = $1 ORDER BY question_order
        """, test_row['id'])
        
        questions = []
        for q_row in question_rows:
            options = json.loads(q_row['options']) if q_row['options'] else None
            questions.append(Question(
                id=str(q_row['id']),
                type=q_row['type'],
                question=q_row['question'],
                options=options,
                correct_answer=q_row['correct_answer'],
                expected_language=q_row['expected_language'],
                points=q_row['points']
            ))
        
        return Test(
            id=str(test_row['id']),
            title=test_row['title'],
            description=test_row['description'],
            questions=questions,
            duration_minutes=test_row['duration_minutes'],
            created_by=str(test_row['created_by']),
            created_at=test_row['created_at'],
            is_active=test_row['is_active']
        )

@api_router.delete("/tests/{test_id}")
async def delete_test(test_id: str, admin: User = Depends(get_admin_user)):
    """Delete a test (soft delete by setting is_active to false)"""
    async with db_pool.acquire() as conn:
        # Check if test exists
        test = await conn.fetchrow(
            "SELECT id, title FROM tests WHERE id = $1",
            uuid.UUID(test_id)
        )

        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        # Check if there are any active invites for this test
        active_invites = await conn.fetchrow("""
            SELECT COUNT(*) as count FROM test_invites
            WHERE test_id = $1 AND status IN ('sent', 'scheduled', 'in_progress')
        """, uuid.UUID(test_id))

        if active_invites['count'] > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete test with active invitations. Please cancel all invitations first."
            )

        # Soft delete by setting is_active to false
        await conn.execute("""
            UPDATE tests SET is_active = false WHERE id = $1
        """, uuid.UUID(test_id))

        return {"message": f"Test '{test['title']}' has been deleted successfully"}

# Test Invitation Routes
@api_router.post("/invites", response_model=TestInvite)
async def send_test_invite(invite_create: TestInviteCreate, admin: User = Depends(get_admin_user)):
    async with db_pool.acquire() as conn:
        # Check if test exists
        test = await conn.fetchrow(
            "SELECT id, title FROM tests WHERE id = $1 AND is_active = true",
            uuid.UUID(invite_create.test_id)
        )
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        invite_id = str(uuid.uuid4())
        invite_token = str(uuid.uuid4())
        
        # Insert invite
        invite_row = await conn.fetchrow("""
            INSERT INTO test_invites (id, test_id, applicant_email, applicant_name,
                                    invited_by, invite_token)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, test_id, applicant_email, applicant_name, invited_by,
                      invite_token, scheduled_date, status, created_at
        """, uuid.UUID(invite_id), uuid.UUID(invite_create.test_id),
            invite_create.applicant_email, invite_create.applicant_name,
            uuid.UUID(admin.id), uuid.UUID(invite_token))
        
        # Send email
        invite_url = f"https://your-domain.com/test-invite/{invite_token}"
        email_body = f"""
        Hi {invite_create.applicant_name},
        
        You have been invited to take a pre-interview test: {test['title']}
        
        Please click the link below to schedule your test:
        {invite_url}
        
        Best regards,
        Interview Team
        """
        
        if not send_email(invite_create.applicant_email, f"Test Invitation: {test['title']}", email_body):
            # Rollback by deleting the invite
            await conn.execute("DELETE FROM test_invites WHERE id = $1", uuid.UUID(invite_id))
            raise HTTPException(status_code=500, detail="Failed to send email")
        
        return TestInvite(
            id=str(invite_row['id']),
            test_id=str(invite_row['test_id']),
            applicant_email=invite_row['applicant_email'],
            applicant_name=invite_row['applicant_name'],
            invited_by=str(invite_row['invited_by']),
            invite_token=str(invite_row['invite_token']),
            scheduled_date=invite_row['scheduled_date'],
            status=invite_row['status'],
            created_at=invite_row['created_at']
        )

@api_router.get("/invites", response_model=List[TestInvite])
async def get_invites(admin: User = Depends(get_admin_user)):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, test_id, applicant_email, applicant_name, invited_by,
                   invite_token, scheduled_date, status, created_at
            FROM test_invites
            WHERE invited_by = $1
            ORDER BY created_at DESC
        """, uuid.UUID(admin.id))
        
        return [TestInvite(
            id=str(row['id']),
            test_id=str(row['test_id']),
            applicant_email=row['applicant_email'],
            applicant_name=row['applicant_name'],
            invited_by=str(row['invited_by']),
            invite_token=str(row['invite_token']),
            scheduled_date=row['scheduled_date'],
            status=row['status'],
            created_at=row['created_at']
        ) for row in rows]

@api_router.get("/invites/token/{token}")
async def get_invite_by_token(token: str):
    async with db_pool.acquire() as conn:
        invite_row = await conn.fetchrow("""
            SELECT id, test_id, applicant_email, applicant_name, invited_by,
                   invite_token, scheduled_date, status, created_at
            FROM test_invites WHERE invite_token = $1
        """, uuid.UUID(token))
        
        if not invite_row:
            raise HTTPException(status_code=404, detail="Invalid invite token")
        
        test_row = await conn.fetchrow("""
            SELECT t.id, t.title, t.description, t.duration_minutes,
                   t.created_by, t.created_at, t.is_active
            FROM tests t WHERE t.id = $1
        """, invite_row['test_id'])
        
        if not test_row:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Get questions
        question_rows = await conn.fetch("""
            SELECT id, type, question, options, correct_answer, expected_language, points
            FROM questions WHERE test_id = $1 ORDER BY question_order
        """, test_row['id'])
        
        questions = []
        for q_row in question_rows:
            options = json.loads(q_row['options']) if q_row['options'] else None
            questions.append(Question(
                id=str(q_row['id']),
                type=q_row['type'],
                question=q_row['question'],
                options=options,
                correct_answer=q_row['correct_answer'],
                expected_language=q_row['expected_language'],
                points=q_row['points']
            ))
        
        return {
            "invite": TestInvite(
                id=str(invite_row['id']),
                test_id=str(invite_row['test_id']),
                applicant_email=invite_row['applicant_email'],
                applicant_name=invite_row['applicant_name'],
                invited_by=str(invite_row['invited_by']),
                invite_token=str(invite_row['invite_token']),
                scheduled_date=invite_row['scheduled_date'],
                status=invite_row['status'],
                created_at=invite_row['created_at']
            ),
            "test": Test(
                id=str(test_row['id']),
                title=test_row['title'],
                description=test_row['description'],
                questions=questions,
                duration_minutes=test_row['duration_minutes'],
                created_by=str(test_row['created_by']),
                created_at=test_row['created_at'],
                is_active=test_row['is_active']
            )
        }

@api_router.post("/invites/token/{token}/schedule")
async def schedule_test(token: str, schedule_data: ScheduleTest):
    async with db_pool.acquire() as conn:
        invite = await conn.fetchrow(
            "SELECT id FROM test_invites WHERE invite_token = $1",
            uuid.UUID(token)
        )
        
        if not invite:
            raise HTTPException(status_code=404, detail="Invalid invite token")
        
        await conn.execute("""
            UPDATE test_invites
            SET scheduled_date = $1, status = 'scheduled'
            WHERE invite_token = $2
        """, schedule_data.scheduled_date, uuid.UUID(token))
        
        return {"message": "Test scheduled successfully"}

# Test Taking Routes
@api_router.get("/take-test/{token}")
async def start_test(token: str):
    async with db_pool.acquire() as conn:
        invite_row = await conn.fetchrow("""
            SELECT id, test_id, applicant_email, applicant_name, invited_by,
                   invite_token, scheduled_date, status, created_at
            FROM test_invites
            WHERE invite_token = $1 AND status IN ('sent', 'scheduled')
        """, uuid.UUID(token))
        
        if not invite_row:
            raise HTTPException(status_code=404, detail="Invalid or expired test invite")

        # Check if it's the scheduled time (within 30 minutes window) - only for scheduled tests
        if invite_row.get('scheduled_date'):
            now = datetime.now(timezone.utc)
            scheduled_time = invite_row['scheduled_date']
            if scheduled_time > now + timedelta(minutes=30) or scheduled_time < now - timedelta(minutes=30):
                raise HTTPException(status_code=400, detail="Test can only be taken within 30 minutes of scheduled time")

        test_row = await conn.fetchrow(
            "SELECT id, title, description, duration_minutes, created_by, created_at, is_active "
            "FROM tests WHERE id = $1",
            invite_row['test_id']
        )

        if not test_row:
            raise HTTPException(status_code=404, detail="Test not found")

        # Remove correct answers from questions for security
        question_rows = await conn.fetch("""
            SELECT id, type, question, options, correct_answer, expected_language, points
            FROM questions WHERE test_id = $1 ORDER BY question_order
        """, test_row['id'])

        questions_for_display = []
        for q_row in question_rows:
            options = json.loads(q_row['options']) if q_row['options'] else None
            question_dict = {
                "id": str(q_row['id']),
                "type": q_row['type'],
                "question": q_row['question'],
                "options": options,
                "expected_language": q_row['expected_language'],
                "points": q_row['points']
            }
            questions_for_display.append(question_dict)

        # Clean the test object
        test_clean = {
            "id": str(test_row['id']),
            "title": test_row['title'],
            "description": test_row['description'],
            "duration_minutes": test_row['duration_minutes'],
            "questions": questions_for_display
        }

        # Clean the invite object
        invite_clean = {
            "id": str(invite_row['id']),
            "test_id": str(invite_row['test_id']),
            "applicant_email": invite_row['applicant_email'],
            "applicant_name": invite_row['applicant_name'],
            "status": invite_row['status'],
            "invite_token": str(invite_row['invite_token'])
        }

        return {
            "invite": invite_clean,
            "test": test_clean
        }

@api_router.post("/start-test/{token}")
async def start_test_monitoring(token: str):
    """Mark test as started and in progress"""
    async with db_pool.acquire() as conn:
        invite = await conn.fetchrow(
            "SELECT id FROM test_invites WHERE invite_token = $1",
            uuid.UUID(token)
        )
        if not invite:
            raise HTTPException(status_code=404, detail="Invalid test token")

        # Update invite status to in_progress
        await conn.execute("""
            UPDATE test_invites
            SET status = 'in_progress', started_at = $1
            WHERE invite_token = $2
        """, datetime.now(timezone.utc), token)

        return {"message": "Test started successfully", "status": "in_progress"}

@api_router.post("/submit-test/{token}")
async def submit_test(token: str, submission: TestSubmissionCreate):
    async with db_pool.acquire() as conn:
        # Convert token string to UUID for database query
        invite_token_uuid = uuid.UUID(token)
        invite = await conn.fetchrow("""
            SELECT id, test_id, applicant_email FROM test_invites
            WHERE invite_token = $1 AND status = 'in_progress'
        """, invite_token_uuid)

        if not invite:
            raise HTTPException(status_code=404, detail="Invalid or inactive test session")

        test = await conn.fetchrow(
            "SELECT id FROM tests WHERE id = $1",
            invite['test_id']
        )
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        # Calculate score for multiple choice questions
        score = 0
        total_points = 0

        # Get all questions for this test
        question_rows = await conn.fetch("""
            SELECT id, points, correct_answer FROM questions WHERE test_id = $1
        """, invite['test_id'])

        for question in question_rows:
            total_points += question['points']
            if question['correct_answer']:
                for answer in submission.answers:
                    if answer.question_id == str(question['id']) and answer.answer == question['correct_answer']:
                        score += question['points']

        calculated_score = (score / total_points * 100) if total_points > 0 else 0

        # Insert submission
        submission_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO test_submissions (id, invite_id, test_id, applicant_email, score, started_at, submitted_at, is_monitored)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, uuid.UUID(submission_id), invite['id'], invite['test_id'],
            invite['applicant_email'], calculated_score, invite.get('started_at'), datetime.now(timezone.utc), False)

        # Insert answers
        for answer in submission.answers:
            await conn.execute("""
                INSERT INTO test_answers (submission_id, question_id, answer)
                VALUES ($1, $2, $3)
            """, uuid.UUID(submission_id), uuid.UUID(answer.question_id), answer.answer)

        # Update invite status
        await conn.execute("""
            UPDATE test_invites SET status = 'completed' WHERE invite_token = $1
        """, token)

        return {"message": "Test submitted successfully", "score": calculated_score}

# Results Routes
@api_router.get("/results", response_model=List[Dict[str, Any]])
async def get_results(admin: User = Depends(get_admin_user)):
    """Get all test results"""
    async with db_pool.acquire() as conn:
        # Get all submissions with invite and test details
        submission_rows = await conn.fetch("""
            SELECT
                ts.id, ts.invite_id, ts.test_id, ts.applicant_email, ts.started_at,
                ts.submitted_at, ts.score, ts.is_monitored,
                ti.applicant_name, t.title as test_title, t.duration_minutes
            FROM test_submissions ts
            JOIN test_invites ti ON ts.invite_id = ti.id
            JOIN tests t ON ts.test_id = t.id
            ORDER BY ts.submitted_at DESC
        """)

        results = []
        for row in submission_rows:
            results.append({
                "submission_id": str(row['id']),
                "applicant_name": row['applicant_name'],
                "applicant_email": row['applicant_email'],
                "test_title": row['test_title'],
                "test_duration_minutes": row['duration_minutes'],
                "score": row['score'],
                "submitted_at": row['submitted_at'],
                "started_at": row['started_at'],
                "is_monitored": row['is_monitored']
            })

        return results

@api_router.get("/results/{submission_id}")
async def get_result_details(submission_id: str, admin: User = Depends(get_admin_user)):
    async with db_pool.acquire() as conn:
        submission = await conn.fetchrow("""
            SELECT
                ts.id, ts.invite_id, ts.test_id, ts.applicant_email, ts.started_at,
                ts.submitted_at, ts.score, ts.is_monitored,
                ti.applicant_name, t.title as test_title, t.duration_minutes
            FROM test_submissions ts
            JOIN test_invites ti ON ts.invite_id = ti.id
            JOIN tests t ON ts.test_id = t.id
            WHERE ts.id = $1
        """, uuid.UUID(submission_id))

        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Get answers for this submission
        answer_rows = await conn.fetch("""
            SELECT ta.answer, q.question, q.type, q.points, q.correct_answer
            FROM test_answers ta
            JOIN questions q ON ta.question_id = q.id
            WHERE ta.submission_id = $1
        """, uuid.UUID(submission_id))

        answers = []
        for row in answer_rows:
            answers.append({
                "question": row['question'],
                "question_type": row['type'],
                "answer": row['answer'],
                "correct_answer": row['correct_answer'],
                "points": row['points']
            })

        return {
            "submission_id": str(submission['id']),
            "applicant_name": submission['applicant_name'],
            "applicant_email": submission['applicant_email'],
            "test_title": submission['test_title'],
            "test_duration_minutes": submission['duration_minutes'],
            "score": submission['score'],
            "started_at": submission['started_at'],
            "submitted_at": submission['submitted_at'],
            "is_monitored": submission['is_monitored'],
            "answers": answers
        }

@api_router.get("/my-invites")
async def get_my_invites(current_user: User = Depends(get_current_user)):
    """Get test invitations for current applicant user"""
    async with db_pool.acquire() as conn:
        invite_rows = await conn.fetch("""
            SELECT ti.id, ti.test_id, ti.applicant_email, ti.applicant_name, ti.status,
                   ti.invite_token, ti.scheduled_date, ti.created_at, ti.started_at,
                   t.title as test_title, t.description, t.duration_minutes
            FROM test_invites ti
            JOIN tests t ON ti.test_id = t.id
            WHERE ti.applicant_email = $1
            ORDER BY ti.created_at DESC
        """, current_user.email)

        invites = []
        for row in invite_rows:
            invites.append({
                "id": str(row['id']),
                "test_id": str(row['test_id']),
                "applicant_email": row['applicant_email'],
                "applicant_name": row['applicant_name'],
                "status": row['status'],
                "invite_token": str(row['invite_token']),
                "scheduled_date": row['scheduled_date'],
                "created_at": row['created_at'],
                "started_at": row['started_at'],
                "test_title": row['test_title'],
                "test_description": row['description'],
                "test_duration_minutes": row['duration_minutes']
            })

        return invites

# WebRTC Signaling Routes (for video monitoring)
@api_router.post("/webrtc/offer")
async def handle_webrtc_offer(data: Dict[str, Any]):
    """Handle WebRTC offer from admin to applicant"""
    try:
        # Validate required fields
        required_fields = ['type', 'sdp', 'invite_id']
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Validate invite_id format
        try:
            invite_uuid = uuid.UUID(data['invite_id'])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid invite ID format")

        offer_id = str(uuid.uuid4())

        async with db_pool.acquire() as conn:
            # Store offer for the specific invite/test session
            await conn.execute("""
                INSERT INTO webrtc_signals (id, type, data, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            """, uuid.UUID(offer_id), "offer", json.dumps(data))

            # Also store in a dedicated table for active sessions
            await conn.execute("""
                INSERT INTO active_webrtc_sessions (invite_id, admin_offer_id, status, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (invite_id) DO UPDATE SET
                admin_offer_id = EXCLUDED.admin_offer_id,
                status = EXCLUDED.status,
                created_at = CURRENT_TIMESTAMP
            """, invite_uuid, uuid.UUID(offer_id), 'offer_sent')

        return {"offer_id": offer_id, "status": "offer_sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to handle offer: {str(e)}")

@api_router.post("/webrtc/answer")
async def handle_webrtc_answer(data: Dict[str, Any]):
    """Handle WebRTC answer from applicant to admin"""
    try:
        # Validate required fields
        required_fields = ['type', 'sdp', 'invite_id']
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Validate invite_id format
        try:
            invite_uuid = uuid.UUID(data['invite_id'])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid invite ID format")

        answer_id = str(uuid.uuid4())

        async with db_pool.acquire() as conn:
            # Store answer
            await conn.execute("""
                INSERT INTO webrtc_signals (id, type, data, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            """, uuid.UUID(answer_id), "answer", json.dumps(data))

            # Update session status
            await conn.execute("""
                UPDATE active_webrtc_sessions
                SET applicant_answer_id = $1, status = 'connected'
                WHERE invite_id = $2
            """, uuid.UUID(answer_id), invite_uuid)

        return {"answer_id": answer_id, "status": "answer_sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to handle answer: {str(e)}")

@api_router.post("/webrtc/ice-candidate")
async def handle_ice_candidate(data: Dict[str, Any]):
    """Handle ICE candidates for WebRTC connection"""
    try:
        required_fields = ['candidate', 'invite_id']
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        # Validate invite_id format
        try:
            invite_uuid = uuid.UUID(data['invite_id'])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid invite ID format")

        candidate_id = str(uuid.uuid4())

        async with db_pool.acquire() as conn:
            # Store ICE candidate
            await conn.execute("""
                INSERT INTO webrtc_signals (id, type, data, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            """, uuid.UUID(candidate_id), "ice_candidate", json.dumps(data))

        return {"candidate_id": candidate_id, "status": "candidate_sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to handle ICE candidate: {str(e)}")

@api_router.get("/webrtc/signals/{invite_id}")
async def get_webrtc_signals_for_invite(invite_id: str):
    """Get all WebRTC signals for a specific invite/test session"""
    try:
        # Validate UUID format
        try:
            invite_uuid = uuid.UUID(invite_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid invite ID format")

        async with db_pool.acquire() as conn:
            # Get all signals for this invite
            signal_rows = await conn.fetch("""
                SELECT id, type, data, created_at
                FROM webrtc_signals
                WHERE data->>'invite_id' = $1
                ORDER BY created_at ASC
            """, str(invite_uuid))

            signals = []
            for row in signal_rows:
                signal_data = json.loads(row['data'])
                signals.append({
                    "id": str(row['id']),
                    "type": row['type'],
                    "data": signal_data,
                    "created_at": row['created_at'].isoformat()
                })

            # Also get session status
            session_row = await conn.fetchrow("""
                SELECT status, created_at
                FROM active_webrtc_sessions
                WHERE invite_id = $1
            """, uuid.UUID(invite_id))

            return {
                "signals": signals,
                "session_status": session_row['status'] if session_row else 'not_started',
                "session_created_at": session_row['created_at'].isoformat() if session_row else None
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get signals: {str(e)}")

@api_router.post("/webrtc/start-session/{invite_id}")
async def start_webrtc_session(invite_id: str):
    """Initialize a WebRTC session for monitoring"""
    try:
        # Validate UUID format
        try:
            invite_uuid = uuid.UUID(invite_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid invite ID format")

        async with db_pool.acquire() as conn:
            # Check if invite exists and is in progress
            invite = await conn.fetchrow("""
                SELECT id, status FROM test_invites WHERE id = $1 AND status = 'in_progress'
            """, invite_uuid)

            if not invite:
                raise HTTPException(status_code=404, detail="Active test session not found")

            # Create or update session record
            await conn.execute("""
                INSERT INTO active_webrtc_sessions (invite_id, status, created_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (invite_id) DO UPDATE SET
                status = EXCLUDED.status,
                created_at = CURRENT_TIMESTAMP
            """, uuid.UUID(invite_id), 'initializing')

            return {"status": "session_initialized", "invite_id": invite_id}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@api_router.post("/webrtc/end-session/{invite_id}")
async def end_webrtc_session(invite_id: str):
    """End a WebRTC monitoring session"""
    try:
        # Validate UUID format
        try:
            invite_uuid = uuid.UUID(invite_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid invite ID format")

        async with db_pool.acquire() as conn:
            # Update session status
            await conn.execute("""
                UPDATE active_webrtc_sessions
                SET status = 'ended', ended_at = CURRENT_TIMESTAMP
                WHERE invite_id = $1
            """, invite_uuid)

            # Clean up old signals (keep for 1 hour for debugging)
            await conn.execute("""
                DELETE FROM webrtc_signals
                WHERE data->>'invite_id' = $1
                AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
            """, invite_id)

        return {"status": "session_ended", "invite_id": invite_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end session: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Run the application
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FastAPI server...")
    uvicorn.run(
        "fastapi_postgres_backend:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
