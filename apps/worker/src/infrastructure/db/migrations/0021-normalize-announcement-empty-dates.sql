-- Normalizes announcement date columns written before empty strings were
-- rejected at the API boundary. A stored '' makes the SQL visibility
-- predicates disagree with the JS falsy handling (e.g. end_at = '' hides the
-- row from the board list while the detail endpoint still returns it).
-- Idempotent and backward compatible: NULL-or-valid-ISO rows are untouched.
UPDATE announcements SET start_at = NULL WHERE start_at = '';
UPDATE announcements SET end_at = NULL WHERE end_at = '';
