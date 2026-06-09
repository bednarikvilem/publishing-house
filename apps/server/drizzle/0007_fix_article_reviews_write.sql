DROP POLICY IF EXISTS "article_reviews_write" ON "article_reviews";

CREATE POLICY "article_reviews_write" ON "article_reviews" FOR ALL
    USING (
        is_admin()
     OR reviewer_id = current_user_id()
     OR EXISTS (
            SELECT 1 FROM articles a
            WHERE a.id = article_reviews.article_id
              AND has_newspaper_role(a.newspaper_id, 'NEWSPAPER_MANAGER')
        )
    )
    WITH CHECK (
        is_admin()
     OR reviewer_id = current_user_id()
     OR EXISTS (
            SELECT 1 FROM articles a
            WHERE a.id = article_reviews.article_id
              AND has_newspaper_role(a.newspaper_id, 'NEWSPAPER_MANAGER')
        )
    );
