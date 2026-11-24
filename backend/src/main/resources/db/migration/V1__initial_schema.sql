-- ============================================================================
-- Thapar Connect Database Schema V1
-- Milestone 1: Initial Relational Schema
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(1024),
    phone_number VARCHAR(20),
    hostel VARCHAR(100),
    roll_number VARCHAR(50),
    branch VARCHAR(100),
    year INTEGER,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT chk_users_year CHECK (year IS NULL OR (year >= 1 AND year <= 5))
);

-- ----------------------------------------------------------------------------
-- 2. REFRESH TOKENS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. CAB GROUPS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cab_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pickup_point VARCHAR(255) NOT NULL,
    pickup_lat DOUBLE PRECISION,
    pickup_lng DOUBLE PRECISION,
    drop_point VARCHAR(255) NOT NULL,
    drop_lat DOUBLE PRECISION NOT NULL,
    drop_lng DOUBLE PRECISION NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_seats INTEGER NOT NULL,
    seats_taken INTEGER NOT NULL DEFAULT 1,
    estimated_fare NUMERIC(10,2) NOT NULL,
    note TEXT,
    auto_join_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cab_total_seats CHECK (total_seats > 0),
    CONSTRAINT chk_cab_seats_taken CHECK (seats_taken >= 1 AND seats_taken <= total_seats),
    CONSTRAINT chk_cab_status CHECK (status IN ('OPEN', 'FULL', 'CLOSED', 'EXPIRED')),
    CONSTRAINT chk_cab_fare CHECK (estimated_fare >= 0)
);

-- ----------------------------------------------------------------------------
-- 4. CAB MEMBERS / JOIN REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cab_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cab_group_id UUID NOT NULL REFERENCES cab_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_requested INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cab_member UNIQUE (cab_group_id, user_id),
    CONSTRAINT chk_seats_requested CHECK (seats_requested > 0),
    CONSTRAINT chk_member_status CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'))
);

-- ----------------------------------------------------------------------------
-- 5. LISTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    condition VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    hostel VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_listing_price CHECK (price >= 0),
    CONSTRAINT chk_listing_status CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED'))
);

-- ----------------------------------------------------------------------------
-- 6. LISTING IMAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    image_url VARCHAR(1024) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_display_order CHECK (display_order >= 0)
);

-- ----------------------------------------------------------------------------
-- 7. CONVERSATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type VARCHAR(50) NOT NULL,
    context_id UUID NOT NULL,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_conversation_context UNIQUE (context_type, context_id, user1_id, user2_id),
    CONSTRAINT chk_conversation_distinct_users CHECK (user1_id <> user2_id),
    CONSTRAINT chk_conversation_context_type CHECK (context_type IN ('CAB_GROUP', 'LISTING'))
);

-- ----------------------------------------------------------------------------
-- 8. MESSAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. REPORTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_report_target_type CHECK (target_type IN ('USER', 'LISTING', 'CAB_GROUP', 'MESSAGE')),
    CONSTRAINT chk_report_status CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED'))
);

-- ----------------------------------------------------------------------------
-- 10. BLOCKS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT chk_block_distinct_users CHECK (blocker_id <> blocked_id)
);

-- ----------------------------------------------------------------------------
-- 11. PAYMENTS AUDIT TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_ref VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    provider VARCHAR(50) NOT NULL DEFAULT 'NO_OP',
    status VARCHAR(30) NOT NULL,
    payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payments_amount CHECK (amount >= 0)
);

-- ----------------------------------------------------------------------------
-- PERFORMANCE & FILTER INDEXES
-- ----------------------------------------------------------------------------
-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Cab Groups
CREATE INDEX IF NOT EXISTS idx_cab_groups_drop_coords ON cab_groups(drop_lat, drop_lng);
CREATE INDEX IF NOT EXISTS idx_cab_groups_departure_status ON cab_groups(departure_time, status);
CREATE INDEX IF NOT EXISTS idx_cab_groups_creator ON cab_groups(creator_id);

-- Cab Members
CREATE INDEX IF NOT EXISTS idx_cab_members_group ON cab_members(cab_group_id);
CREATE INDEX IF NOT EXISTS idx_cab_members_user ON cab_members(user_id);

-- Listings
CREATE INDEX IF NOT EXISTS idx_listings_filter ON listings(category, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_hostel ON listings(hostel);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);

-- Listing Images
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id, display_order);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user1_user2 ON conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_user1 ON conversations(user2_id, user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_context ON conversations(context_type, context_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Reports
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- Blocks
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

-- Payments Audit
CREATE INDEX IF NOT EXISTS idx_payments_audit_user ON payments_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_audit_ref ON payments_audit(transaction_ref);
