DROP INDEX IF EXISTS idx_telegram_subscriptions_chat_id;

DELETE FROM telegram_subscriptions
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY chat_id
        ORDER BY updated_at DESC, created_at DESC, id DESC
      ) AS duplicate_rank
    FROM telegram_subscriptions
  )
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_subscriptions_chat_id ON telegram_subscriptions(chat_id);
