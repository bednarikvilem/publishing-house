-- Allow anyone to see users who are registered as newspaper authors (public profiles).
-- Without this, the users_select policy blocks visitors from seeing article author data.
-- NOTE: users.id must be table-qualified; bare "id" resolves to newspaper_authors.id inside the subquery.
DROP POLICY IF EXISTS "users_public_author" ON "users";
CREATE POLICY "users_public_author" ON "users" FOR SELECT USING (
    EXISTS (SELECT 1 FROM newspaper_authors WHERE user_id = users.id)
);
