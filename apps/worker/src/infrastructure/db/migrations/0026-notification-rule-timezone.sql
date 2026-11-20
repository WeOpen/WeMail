-- Existing rules used UTC. Keep their interpretation stable while allowing
-- newly configured rules to use an explicit IANA timezone.
ALTER TABLE notification_rules ADD COLUMN quiet_hours_timezone TEXT NOT NULL DEFAULT 'UTC';
