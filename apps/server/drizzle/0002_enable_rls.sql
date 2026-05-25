--> app_user role and grants

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN PASSWORD 'app_user';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;


--> session context helpers

CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION current_newspaper_id() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.newspaper_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION current_roles() RETURNS text[] LANGUAGE sql STABLE AS $$
    SELECT string_to_array(coalesce(current_setting('app.roles', true), ''), ',')
$$;

CREATE OR REPLACE FUNCTION has_role(r text) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT r = ANY(current_roles())
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT has_role('SYSTEM_ADMINISTRATOR') OR has_role('DIRECTOR')
$$;

--> SECURITY DEFINER so policies on other tables can ask "does this user have role X in newspaper Y" without recursing into user_roles' own RLS policy
CREATE OR REPLACE FUNCTION has_newspaper_role(np uuid, r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = current_user_id()
          AND newspaper_id = np
          AND user_role::text = r
    )
$$;

CREATE OR REPLACE FUNCTION is_editorial_of(np uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT has_newspaper_role(np, 'EDITOR')
        OR has_newspaper_role(np, 'NEWSPAPER_MANAGER')
        OR is_admin()
$$;

--> central article visibility rule, reused by article_images/comments/likes policies
CREATE OR REPLACE FUNCTION can_see_article(a_state text, a_author uuid, a_newspaper uuid, a_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT
        is_admin()
     OR a_state = 'PUBLISHED'
     OR a_author = current_user_id()
     OR (a_state IN ('SUBMITTED','APPROVED_BY_EDITOR','REJECTED')
            AND has_newspaper_role(a_newspaper, 'NEWSPAPER_MANAGER'))
     OR (a_state = 'IN_REVIEW' AND EXISTS (
            SELECT 1 FROM article_reviews
            WHERE article_id = a_id AND reviewer_id = current_user_id()
        ))
     OR (a_state IN ('APPROVED_BY_MANAGER','APPROVED_BY_DIRECTOR')
            AND has_role('DIRECTOR'))
$$;


--> enable RLS on every table

ALTER TABLE "newspapers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "global_roles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "newspaper_authors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "article_category" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "article_images" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "article_reviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "article_views" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;


--> newspapers

CREATE POLICY "newspapers_select" ON "newspapers" FOR SELECT USING (true);

CREATE POLICY "newspapers_admin_write" ON "newspapers" FOR ALL USING (is_admin()) WITH CHECK (is_admin());


--> users

CREATE POLICY "users_select" ON "users" FOR SELECT USING (
    is_admin()
 OR id = current_user_id()
 OR (newspaper_id IS NOT NULL AND is_editorial_of(newspaper_id))
);

CREATE POLICY "users_self_update" ON "users" FOR UPDATE
    USING (id = current_user_id() OR is_admin())
    WITH CHECK (id = current_user_id() OR is_admin());

CREATE POLICY "users_admin_write" ON "users" FOR ALL USING (is_admin()) WITH CHECK (is_admin());


--> user_roles

CREATE POLICY "user_roles_select" ON "user_roles" FOR SELECT USING (
    is_admin()
 OR user_id = current_user_id()
 OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER')
);

CREATE POLICY "user_roles_manage" ON "user_roles" FOR ALL
    USING (is_admin() OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER'))
    WITH CHECK (is_admin() OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER'));


--> global_roles

CREATE POLICY "global_roles_admin" ON "global_roles" FOR ALL USING (is_admin()) WITH CHECK (is_admin());


--> newspaper_authors

CREATE POLICY "np_authors_select" ON "newspaper_authors" FOR SELECT USING (true);

CREATE POLICY "np_authors_self" ON "newspaper_authors" FOR ALL
    USING (user_id = current_user_id() OR is_admin())
    WITH CHECK (user_id = current_user_id() OR is_admin());


--> article_category

CREATE POLICY "article_cat_select" ON "article_category" FOR SELECT USING (true);

CREATE POLICY "article_cat_manage" ON "article_category" FOR ALL
    USING (is_admin() OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER'))
    WITH CHECK (is_admin() OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER'));


--> articles

CREATE POLICY "articles_select" ON "articles" FOR SELECT USING (
    can_see_article(article_state::text, author_id, newspaper_id, id)
);

CREATE POLICY "articles_insert" ON "articles" FOR INSERT WITH CHECK (
    is_admin()
 OR (author_id = current_user_id() AND has_newspaper_role(newspaper_id, 'AUTHOR'))
);

CREATE POLICY "articles_update" ON "articles" FOR UPDATE
    USING (
        is_admin()
     OR author_id = current_user_id()
     OR is_editorial_of(newspaper_id)
     OR has_role('DIRECTOR')
    )
    WITH CHECK (
        is_admin()
     OR author_id = current_user_id()
     OR is_editorial_of(newspaper_id)
     OR has_role('DIRECTOR')
    );

CREATE POLICY "articles_delete" ON "articles" FOR DELETE USING (
    is_admin() OR (author_id = current_user_id() AND article_state::text = 'DRAFT')
);


--> article_images

CREATE POLICY "article_images_select" ON "article_images" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id = article_images.article_id
          AND can_see_article(a.article_state::text, a.author_id, a.newspaper_id, a.id)
    )
);

CREATE POLICY "article_images_write" ON "article_images" FOR ALL
    USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM articles a
            WHERE a.id = article_images.article_id
              AND (a.author_id = current_user_id() OR is_editorial_of(a.newspaper_id))
        )
    )
    WITH CHECK (
        is_admin() OR EXISTS (
            SELECT 1 FROM articles a
            WHERE a.id = article_images.article_id
              AND (a.author_id = current_user_id() OR is_editorial_of(a.newspaper_id))
        )
    );


--> comments

CREATE POLICY "comments_select" ON "comments" FOR SELECT USING (
    is_admin() OR EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id = comments.article_id
          AND (a.article_state::text = 'PUBLISHED' OR is_editorial_of(a.newspaper_id))
    )
);

CREATE POLICY "comments_insert" ON "comments" FOR INSERT WITH CHECK (
    user_id = current_user_id()
 AND EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id = comments.article_id AND a.article_state::text = 'PUBLISHED'
    )
);

CREATE POLICY "comments_delete" ON "comments" FOR DELETE USING (
    is_admin()
 OR user_id = current_user_id()
 OR EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id = comments.article_id AND is_editorial_of(a.newspaper_id)
    )
);


--> likes

CREATE POLICY "likes_select" ON "likes" FOR SELECT USING (
    is_admin() OR EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id = likes.article_id
          AND (a.article_state::text = 'PUBLISHED' OR is_editorial_of(a.newspaper_id))
    )
);

CREATE POLICY "likes_write" ON "likes" FOR ALL
    USING (is_admin() OR user_id = current_user_id())
    WITH CHECK (
        user_id = current_user_id()
     AND EXISTS (
            SELECT 1 FROM articles a
            WHERE a.id = likes.article_id AND a.article_state::text = 'PUBLISHED'
        )
    );


--> article_reviews

CREATE POLICY "article_reviews_select" ON "article_reviews" FOR SELECT USING (
    is_admin()
 OR reviewer_id = current_user_id()
 OR EXISTS (
        SELECT 1 FROM articles a
        WHERE a.id = article_reviews.article_id AND is_editorial_of(a.newspaper_id)
    )
);

CREATE POLICY "article_reviews_write" ON "article_reviews" FOR ALL
    USING (is_admin() OR reviewer_id = current_user_id())
    WITH CHECK (is_admin() OR reviewer_id = current_user_id());


--> article_views

CREATE POLICY "article_views_select" ON "article_views" FOR SELECT USING (
    is_admin() OR user_id = current_user_id()
);

CREATE POLICY "article_views_insert" ON "article_views" FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = current_user_id() OR is_admin()
);


--> audit_logs

CREATE POLICY "audit_logs_select" ON "audit_logs" FOR SELECT USING (
    is_admin() OR user_id = current_user_id()
);

CREATE POLICY "audit_logs_insert" ON "audit_logs" FOR INSERT WITH CHECK (true);
