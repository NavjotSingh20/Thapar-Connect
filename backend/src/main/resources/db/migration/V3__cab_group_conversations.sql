-- Migration V3: Support for Cab Group Conversations and System Messages
ALTER TABLE conversations ALTER COLUMN user2_id DROP NOT NULL;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversation_distinct_users;
ALTER TABLE conversations ADD CONSTRAINT chk_conversation_distinct_users CHECK (user2_id IS NULL OR user1_id <> user2_id);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_conversation_context ON conversations (context_type, context_id) WHERE is_group = TRUE;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
