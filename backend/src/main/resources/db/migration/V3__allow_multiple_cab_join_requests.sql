-- Allow multiple join requests from the same user for the same cab pool
ALTER TABLE cab_members DROP CONSTRAINT IF EXISTS uq_cab_member;
