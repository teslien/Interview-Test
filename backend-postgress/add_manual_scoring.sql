-- Migration script to add manual scoring functionality
-- Run this script to add manual scoring fields

-- Add manual scoring fields to test_answers table
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS manual_score FLOAT;
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS manual_score_status VARCHAR(20) DEFAULT 'pending' CHECK (manual_score_status IN ('pending', 'correct', 'wrong', 'partial'));
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id);
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS review_comments TEXT;
ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add manual scoring fields to test_submissions table
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS manual_score FLOAT;
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS auto_score FLOAT;
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS final_score FLOAT;
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS scoring_status VARCHAR(20) DEFAULT 'auto_only' CHECK (scoring_status IN ('auto_only', 'needs_review', 'partially_reviewed', 'fully_reviewed'));
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;

-- Update existing score column to be auto_score and copy to final_score
UPDATE test_submissions SET auto_score = COALESCE(score, 0) WHERE auto_score IS NULL;
UPDATE test_submissions SET final_score = COALESCE(score, 0) WHERE final_score IS NULL;

-- Update scoring_status for existing submissions
UPDATE test_submissions SET scoring_status = 'auto_only' WHERE scoring_status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_answers_manual_score_status ON test_answers(manual_score_status);
CREATE INDEX IF NOT EXISTS idx_answers_reviewer_id ON test_answers(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_submissions_scoring_status ON test_submissions(scoring_status);
CREATE INDEX IF NOT EXISTS idx_submissions_reviewed_by ON test_submissions(reviewed_by);

-- Create manual scoring queue view for easy querying
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

-- Verify changes
SELECT 'Manual scoring schema updated successfully' as status;
