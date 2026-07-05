ALTER TABLE user_invites ADD COLUMN max_redemptions INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_invites ADD COLUMN redemption_count INTEGER NOT NULL DEFAULT 0;

UPDATE user_invites
SET redemption_count = 1
WHERE redeemed_at IS NOT NULL AND redemption_count = 0;
