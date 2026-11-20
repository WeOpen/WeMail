-- Keep the canonical event independent from channel rendering so it can be
-- replayed after provider failures or changes to a platform's request format.
ALTER TABLE webhook_deliveries ADD COLUMN request_body_text TEXT;
