-- =====================================================
-- COMBINED POSTGRESQL SCHEMA FOR INTERVIEW TEST PLATFORM
-- =====================================================
-- This file combines all SQL migrations into one comprehensive schema
-- Run this file to set up the complete database structure

-- Create database (run this separately if needed)
-- CREATE DATABASE interview_platform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES (from postgres_schema.sql)
-- =====================================================

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

-- Test invites table (base structure)
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

-- Test submissions table (base structure)
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

-- Test answers table (base structure)
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

-- Admin notifications table (from add_notifications_table.sql)
CREATE TABLE admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- ADMIN SETTINGS TABLES
-- =====================================================

-- Admin Email Settings Table (from add_admin_settings.sql)
CREATE TABLE admin_email_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255),
    smtp_password VARCHAR(255),
    from_email VARCHAR(255),
    from_name VARCHAR(255) DEFAULT '12th Wonder Interview Platform',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id)
);

-- Admin Theme Settings Table (from add_theme_settings.sql)
CREATE TABLE admin_theme_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme_name VARCHAR(100) DEFAULT 'classic',
    custom_colors JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id)
);

-- =====================================================
-- TABLE MODIFICATIONS (MIGRATIONS)
-- =====================================================

-- Add admin_scheduled field to test_invites table (from add_admin_scheduling.sql)
ALTER TABLE test_invites 
ADD COLUMN IF NOT EXISTS admin_scheduled BOOLEAN DEFAULT FALSE;

-- Add no_schedule field to test_invites table (from add_no_schedule_field.sql)
ALTER TABLE test_invites 
ADD COLUMN IF NOT EXISTS no_schedule BOOLEAN DEFAULT FALSE;

-- Add email tracking fields to test_invites table (from add_email_status_to_invites.sql)
ALTER TABLE test_invites ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE test_invites ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE test_invites ADD COLUMN IF NOT EXISTS email_error TEXT;

-- Add manual scoring fields to test_answers table (from add_manual_scoring.sql)
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS manual_score FLOAT;
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS manual_score_status VARCHAR(20) DEFAULT 'pending' CHECK (manual_score_status IN ('pending', 'correct', 'wrong', 'partial'));
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id);
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS review_comments TEXT;
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add manual scoring fields to test_submissions table (from add_manual_scoring.sql)
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS manual_score FLOAT;
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS auto_score FLOAT;
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS final_score FLOAT;
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS scoring_status VARCHAR(20) DEFAULT 'auto_only' CHECK (scoring_status IN ('auto_only', 'needs_review', 'partially_reviewed', 'fully_reviewed'));
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;

-- =====================================================
-- DATA UPDATES
-- =====================================================

-- Update existing invites to have admin_scheduled = false
UPDATE test_invites 
SET admin_scheduled = FALSE 
WHERE admin_scheduled IS NULL;

-- Update existing invites to have no_schedule = false
UPDATE test_invites 
SET no_schedule = FALSE 
WHERE no_schedule IS NULL;

-- Update existing invites to have email_sent = true (assuming they were sent successfully)
UPDATE test_invites SET email_sent = TRUE WHERE status IN ('sent', 'scheduled', 'in_progress', 'completed');

-- Update existing score column to be auto_score and copy to final_score
UPDATE test_submissions SET auto_score = COALESCE(score, 0) WHERE auto_score IS NULL;
UPDATE test_submissions SET final_score = COALESCE(score, 0) WHERE final_score IS NULL;

-- Update scoring_status for existing submissions
UPDATE test_submissions SET scoring_status = 'auto_only' WHERE scoring_status IS NULL;

-- Insert default theme settings for existing admins (from add_theme_settings.sql)
INSERT INTO admin_theme_settings (admin_id, theme_name, custom_colors)
SELECT id, 'classic', '{}'
FROM users 
WHERE role = 'admin' 
AND id NOT IN (SELECT admin_id FROM admin_theme_settings WHERE admin_id IS NOT NULL)
ON CONFLICT (admin_id) DO NOTHING;

-- Update existing admin theme settings to use classic as default (from update_default_theme_to_classic.sql)
UPDATE admin_theme_settings 
SET theme_name = 'classic', updated_at = CURRENT_TIMESTAMP 
WHERE theme_name = 'light';

-- =====================================================
-- CONSTRAINTS AND NOT NULL SETTINGS
-- =====================================================

-- Make the admin_scheduled column NOT NULL after setting default values
ALTER TABLE test_invites 
ALTER COLUMN admin_scheduled SET NOT NULL;

-- Make the no_schedule column NOT NULL after setting default values
ALTER TABLE test_invites 
ALTER COLUMN no_schedule SET NOT NULL;

-- =====================================================
-- INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON tests(created_by);
CREATE INDEX IF NOT EXISTS idx_tests_is_active ON tests(is_active);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_invites_test_id ON test_invites(test_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON test_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_invites_applicant_email ON test_invites(applicant_email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON test_invites(status);
CREATE INDEX IF NOT EXISTS idx_submissions_invite_id ON test_submissions(invite_id);
CREATE INDEX IF NOT EXISTS idx_submissions_test_id ON test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_submissions_applicant_email ON test_submissions(applicant_email);
CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON test_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON test_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_type ON webrtc_signals(type);
CREATE INDEX IF NOT EXISTS idx_webrtc_created_at ON webrtc_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_webrtc_invite_id ON webrtc_signals((data->>'invite_id'));
CREATE INDEX IF NOT EXISTS idx_active_sessions_status ON active_webrtc_sessions(status);
CREATE INDEX IF NOT EXISTS idx_active_sessions_created_at ON active_webrtc_sessions(created_at);

-- Admin settings indexes
CREATE INDEX IF NOT EXISTS idx_admin_email_settings_admin_id ON admin_email_settings(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_theme_settings_admin_id ON admin_theme_settings(admin_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON admin_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON admin_notifications(is_read);

-- Manual scoring indexes
CREATE INDEX IF NOT EXISTS idx_answers_manual_score_status ON test_answers(manual_score_status);
CREATE INDEX IF NOT EXISTS idx_answers_reviewer_id ON test_answers(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_scoring_status ON test_submissions(scoring_status);
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON test_submissions(reviewed_by);

-- =====================================================
-- VIEWS FOR COMMONLY ACCESSED DATA
-- =====================================================

-- Test details view
CREATE OR REPLACE VIEW test_details AS
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

-- Submission results view
CREATE OR REPLACE VIEW submission_results AS
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

-- Manual scoring queue view
CREATE OR REPLACE VIEW manual_scoring_queue AS
SELECT 
    ts.id as submission_id,
    ts.applicant_email,
    ts.submitted_at,
    ts.scoring_status,
    t.title as test_title,
    t.id as test_id,
    COUNT(ta.id) as total_answers,
    COUNT(CASE WHEN q.type IN ('essay', 'coding') THEN 1 END) as manual_questions,
    COUNT(CASE WHEN ta.manual_score_status = 'pending' AND q.type IN ('essay', 'coding') THEN 1 END) as pending_reviews
FROM test_submissions ts
JOIN tests t ON ts.test_id = t.id
JOIN test_answers ta ON ts.id = ta.submission_id
JOIN questions q ON ta.question_id = q.id
WHERE ts.scoring_status IN ('needs_review', 'partially_reviewed')
GROUP BY ts.id, ts.applicant_email, ts.submitted_at, ts.scoring_status, t.title, t.id
ORDER BY ts.submitted_at ASC;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to cleanup old WebRTC signals (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_webrtc_signals()
RETURNS void AS $$
BEGIN
    DELETE FROM webrtc_signals
    WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
    UPDATE test_invites
    SET status = 'expired'
    WHERE status IN ('sent', 'scheduled')
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Combined schema setup completed successfully!' as status;
SELECT 'All tables, indexes, views, and functions have been created.' as message;
