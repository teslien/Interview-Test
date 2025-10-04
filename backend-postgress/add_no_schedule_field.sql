-- Add no_schedule field to test_invites table
ALTER TABLE test_invites 
ADD COLUMN IF NOT EXISTS no_schedule BOOLEAN DEFAULT FALSE;

-- Update existing invites to have no_schedule = false
UPDATE test_invites 
SET no_schedule = FALSE 
WHERE no_schedule IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE test_invites 
ALTER COLUMN no_schedule SET NOT NULL;
