-- PostgreSQL Database Schema for Pre-Interview Test Platform

-- Create database (run this separately if needed)
-- CREATE DATABASE interview_platform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'applicant')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tests table
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('multiple_choice', 'coding', 'essay')),
    question TEXT NOT NULL,
    options JSONB, -- Store array of options as JSON
    correct_answer TEXT,
    expected_language VARCHAR(50),
    points INTEGER DEFAULT 1,
    question_order INTEGER DEFAULT 0
);

-- Test invites table
CREATE TABLE test_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invite_token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    scheduled_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'scheduled', 'in_progress', 'completed', 'expired')),
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Test submissions table
CREATE TABLE test_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invite_id UUID REFERENCES test_invites(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    applicant_email VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    score FLOAT,
    is_monitored BOOLEAN DEFAULT FALSE
);

-- Test answers table
CREATE TABLE test_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES test_submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL
);

-- WebRTC signals table (for video monitoring)
CREATE TABLE webrtc_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Active WebRTC sessions table (for managing video monitoring sessions)
CREATE TABLE active_webrtc_sessions (
    invite_id UUID PRIMARY KEY REFERENCES test_invites(id) ON DELETE CASCADE,
    admin_offer_id UUID REFERENCES webrtc_signals(id),
    applicant_answer_id UUID REFERENCES webrtc_signals(id),
    status VARCHAR(50) NOT NULL DEFAULT 'initializing' CHECK (status IN ('initializing', 'offer_sent', 'connected', 'ended')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_tests_created_by ON tests(created_by);
CREATE INDEX idx_tests_is_active ON tests(is_active);
CREATE INDEX idx_questions_test_id ON questions(test_id);
CREATE INDEX idx_invites_test_id ON test_invites(test_id);
CREATE INDEX idx_invites_token ON test_invites(invite_token);
CREATE INDEX idx_invites_applicant_email ON test_invites(applicant_email);
CREATE INDEX idx_invites_status ON test_invites(status);
CREATE INDEX idx_submissions_invite_id ON test_submissions(invite_id);
CREATE INDEX idx_submissions_test_id ON test_submissions(test_id);
CREATE INDEX idx_submissions_applicant_email ON test_submissions(applicant_email);
CREATE INDEX idx_answers_submission_id ON test_answers(submission_id);
CREATE INDEX idx_answers_question_id ON test_answers(question_id);
CREATE INDEX idx_webrtc_type ON webrtc_signals(type);
CREATE INDEX idx_webrtc_created_at ON webrtc_signals(created_at);
CREATE INDEX idx_webrtc_invite_id ON webrtc_signals((data->>'invite_id'));
CREATE INDEX idx_active_sessions_status ON active_webrtc_sessions(status);
CREATE INDEX idx_active_sessions_created_at ON active_webrtc_sessions(created_at);

-- Create views for commonly accessed data
CREATE VIEW test_details AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.duration_minutes,
    t.created_by,
    t.created_at,
    t.is_active,
    u.full_name as created_by_name,
    COUNT(DISTINCT q.id) as question_count,
    SUM(q.points) as total_points
FROM tests t
LEFT JOIN users u ON t.created_by = u.id
LEFT JOIN questions q ON t.id = q.test_id
GROUP BY t.id, t.title, t.description, t.duration_minutes, t.created_by, t.created_at, t.is_active, u.full_name;

CREATE VIEW submission_results AS
SELECT 
    ts.id,
    ts.invite_id,
    ts.test_id,
    ts.applicant_email,
    ts.started_at,
    ts.submitted_at,
    ts.score,
    ti.applicant_name,
    t.title as test_title,
    t.duration_minutes
FROM test_submissions ts
JOIN test_invites ti ON ts.invite_id = ti.id
JOIN tests t ON ts.test_id = t.id;

-- Function to cleanup old WebRTC signals (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_webrtc_signals()
RETURNS void AS $$
BEGIN
    DELETE FROM webrtc_signals
    WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to automatically expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
    UPDATE test_invites
    SET status = 'expired'
    WHERE status IN ('sent', 'scheduled')
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;