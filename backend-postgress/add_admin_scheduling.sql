-- Add admin_scheduled field to test_invites table
ALTER TABLE test_invites 
ADD COLUMN IF NOT EXISTS admin_scheduled BOOLEAN DEFAULT FALSE;

-- Update existing invites to have admin_scheduled = false
UPDATE test_invites 
SET admin_scheduled = FALSE 
WHERE admin_scheduled IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE test_invites 
ALTER COLUMN admin_scheduled SET NOT NULL;
