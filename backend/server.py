from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app
app = FastAPI(title="Pre-Interview Test Platform")
api_router = APIRouter(prefix="/api")

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
    started_at: datetime
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    score: Optional[float] = None
    is_monitored: bool = False

class TestSubmissionCreate(BaseModel):
    answers: List[TestAnswer]

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
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

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

# Root route for testing
@api_router.get("/")
async def root():
    return {"message": "Pre-Interview Test Platform API", "status": "running"}

# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_create: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_create.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = user_create.dict()
    user_dict["password"] = get_password_hash(user_create.password)
    user_obj = User(**{k: v for k, v in user_dict.items() if k != "password"})
    
    await db.users.insert_one(user_dict)
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"email": user_login.email})
    if not user or not verify_password(user_login.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Test Management Routes (Admin only)
@api_router.post("/tests", response_model=Test)
async def create_test(test_create: TestCreate, admin: User = Depends(get_admin_user)):
    test_dict = test_create.dict()
    test_dict["created_by"] = admin.id
    test_obj = Test(**test_dict)
    
    await db.tests.insert_one(test_obj.dict())
    return test_obj

@api_router.get("/tests", response_model=List[Test])
async def get_tests(admin: User = Depends(get_admin_user)):
    tests = await db.tests.find({"is_active": True}).to_list(1000)
    return [Test(**test) for test in tests]

@api_router.get("/tests/{test_id}", response_model=Test)
async def get_test(test_id: str, admin: User = Depends(get_admin_user)):
    test = await db.tests.find_one({"id": test_id, "is_active": True})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return Test(**test)

# Test Invitation Routes
@api_router.post("/invites", response_model=TestInvite)
async def send_test_invite(invite_create: TestInviteCreate, admin: User = Depends(get_admin_user)):
    # Check if test exists
    test = await db.tests.find_one({"id": invite_create.test_id, "is_active": True})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    invite_dict = invite_create.dict()
    invite_dict["invited_by"] = admin.id
    invite_obj = TestInvite(**invite_dict)
    
    # Send email
    invite_url = f"https://your-domain.com/test-invite/{invite_obj.invite_token}"
    email_body = f"""
    Hi {invite_obj.applicant_name},
    
    You have been invited to take a pre-interview test: {test['title']}
    
    Please click the link below to schedule your test:
    {invite_url}
    
    Best regards,
    Interview Team
    """
    
    if send_email(invite_obj.applicant_email, f"Test Invitation: {test['title']}", email_body):
        await db.invites.insert_one(invite_obj.dict())
        return invite_obj
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")

@api_router.get("/invites", response_model=List[TestInvite])
async def get_invites(admin: User = Depends(get_admin_user)):
    invites = await db.invites.find({"invited_by": admin.id}).to_list(1000)
    return [TestInvite(**invite) for invite in invites]

@api_router.get("/invites/token/{token}")
async def get_invite_by_token(token: str):
    invite = await db.invites.find_one({"invite_token": token})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    
    test = await db.tests.find_one({"id": invite["test_id"]})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {
        "invite": TestInvite(**invite),
        "test": Test(**test)
    }

@api_router.post("/invites/token/{token}/schedule")
async def schedule_test(token: str, schedule_data: ScheduleTest):
    invite = await db.invites.find_one({"invite_token": token})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    
    await db.invites.update_one(
        {"invite_token": token},
        {"$set": {"scheduled_date": schedule_data.scheduled_date, "status": "scheduled"}}
    )
    
    return {"message": "Test scheduled successfully"}

# Test Taking Routes
@api_router.get("/take-test/{token}")
async def start_test(token: str):
    invite = await db.invites.find_one({"invite_token": token, "status": {"$in": ["sent", "scheduled"]}})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired test invite")
    
    # Check if it's the scheduled time (within 30 minutes window) - only for scheduled tests
    if invite.get("scheduled_date"):
        now = datetime.now(timezone.utc)
        scheduled_time = invite["scheduled_date"]
        if scheduled_time > now + timedelta(minutes=30) or scheduled_time < now - timedelta(minutes=30):
            raise HTTPException(status_code=400, detail="Test can only be taken within 30 minutes of scheduled time")
    
    test = await db.tests.find_one({"id": invite["test_id"]})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Update invite status
    await db.invites.update_one(
        {"invite_token": token},
        {"$set": {"status": "in_progress"}}
    )
    
    # Remove correct answers from questions for security
    questions_for_display = []
    for q in test["questions"]:
        question_dict = dict(q)
        if "correct_answer" in question_dict:
            del question_dict["correct_answer"]
        questions_for_display.append(question_dict)
    
    # Clean the test object and remove ObjectId
    test_clean = {
        "id": test["id"],
        "title": test["title"],
        "description": test["description"],
        "duration_minutes": test["duration_minutes"],
        "questions": questions_for_display
    }
    
    # Clean the invite object and remove ObjectId  
    invite_clean = {
        "id": invite["id"],
        "test_id": invite["test_id"],
        "applicant_email": invite["applicant_email"],
        "applicant_name": invite["applicant_name"],
        "status": invite["status"],
        "invite_token": invite["invite_token"]
    }
    
    return {
        "invite": invite_clean,
        "test": test_clean
    }

@api_router.post("/submit-test/{token}")
async def submit_test(token: str, submission: TestSubmissionCreate):
    invite = await db.invites.find_one({"invite_token": token, "status": "in_progress"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or inactive test session")
    
    test = await db.tests.find_one({"id": invite["test_id"]})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Calculate score for multiple choice questions
    score = 0
    total_points = 0
    for question in test["questions"]:
        total_points += question["points"]
        if question["type"] == "multiple_choice":
            for answer in submission.answers:
                if answer.question_id == question["id"] and answer.answer == question.get("correct_answer"):
                    score += question["points"]
    
    calculated_score = (score / total_points * 100) if total_points > 0 else 0
    
    submission_dict = submission.dict()
    submission_dict.update({
        "invite_id": invite["id"],
        "test_id": invite["test_id"],
        "applicant_email": invite["applicant_email"],
        "started_at": invite["scheduled_date"],
        "score": calculated_score
    })
    
    submission_obj = TestSubmission(**submission_dict)
    await db.submissions.insert_one(submission_obj.dict())
    
    # Update invite status
    await db.invites.update_one(
        {"invite_token": token},
        {"$set": {"status": "completed"}}
    )
    
    return {"message": "Test submitted successfully", "score": calculated_score}

# Results Routes
@api_router.get("/results", response_model=List[Dict[str, Any]])
async def get_results(admin: User = Depends(get_admin_user)):
    # Get all submissions with invite and test details
    submissions = await db.submissions.find().to_list(1000)
    results = []
    
    for submission in submissions:
        invite = await db.invites.find_one({"id": submission["invite_id"]})
        test = await db.tests.find_one({"id": submission["test_id"]})
        
        if invite and test:
            results.append({
                "submission": TestSubmission(**submission),
                "applicant_name": invite["applicant_name"],
                "test_title": test["title"]
            })
    
    return results

@api_router.get("/results/{submission_id}")
async def get_result_details(submission_id: str, admin: User = Depends(get_admin_user)):
    submission = await db.submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    invite = await db.invites.find_one({"id": submission["invite_id"]})
    test = await db.tests.find_one({"id": submission["test_id"]})
    
    return {
        "submission": TestSubmission(**submission),
        "invite": TestInvite(**invite) if invite else None,
        "test": Test(**test) if test else None
    }

@api_router.get("/my-invites")
async def get_my_invites(current_user: User = Depends(get_current_user)):
    """Get test invitations for current applicant user"""
    invites = []
    
    # Find invites by user email (assuming invites are sent to applicant_email)
    async for invite in db.invites.find({"applicant_email": current_user.email}):
        # Get the associated test
        test = await db.tests.find_one({"id": invite["test_id"]})
        
        # Clean invite data removing ObjectId
        invite_clean = {
            "id": invite["id"],
            "test_id": invite["test_id"],
            "applicant_email": invite["applicant_email"],
            "applicant_name": invite["applicant_name"],
            "status": invite["status"],
            "invite_token": invite["invite_token"],
            "scheduled_date": invite.get("scheduled_date"),
            "created_at": invite["created_at"]
        }
        
        # Clean test data removing ObjectId
        test_clean = None
        if test:
            test_clean = {
                "id": test["id"],
                "title": test["title"],
                "description": test["description"],
                "duration_minutes": test["duration_minutes"]
            }
        
        # Add test details to invite
        invite_with_test = {
            **invite_clean,
            "test": test_clean,
            "test_title": test["title"] if test else "Unknown Test"
        }
        invites.append(invite_with_test)
    
    return invites

# WebRTC Signaling Routes (for video monitoring)
@api_router.post("/webrtc/offer")
async def handle_webrtc_offer(data: Dict[str, Any]):
    # Store offer in database temporarily for signaling
    offer_id = str(uuid.uuid4())
    await db.webrtc_signals.insert_one({
        "id": offer_id,
        "type": "offer",
        "data": data,
        "created_at": datetime.now(timezone.utc)
    })
    return {"offer_id": offer_id}

@api_router.post("/webrtc/answer")
async def handle_webrtc_answer(data: Dict[str, Any]):
    # Store answer in database temporarily for signaling
    answer_id = str(uuid.uuid4())
    await db.webrtc_signals.insert_one({
        "id": answer_id,
        "type": "answer",
        "data": data,
        "created_at": datetime.now(timezone.utc)
    })
    return {"answer_id": answer_id}

@api_router.get("/webrtc/signals/{signal_type}")
async def get_webrtc_signals(signal_type: str):
    signals = await db.webrtc_signals.find({"type": signal_type}).to_list(100)
    return signals

# Include the router in the main app
app.include_router(api_router)

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
