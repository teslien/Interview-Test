-- Add email_sent field to test_invites table to track email delivery status
ALTER TABLE test_invites ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE test_invites ADD COLUMN email_sent_at TIMESTAMPTZ;
ALTER TABLE test_invites ADD COLUMN email_error TEXT;

-- Update existing invites to have email_sent = true (assuming they were sent successfully)
UPDATE test_invites SET email_sent = TRUE WHERE status IN ('sent', 'scheduled', 'in_progress', 'completed');
