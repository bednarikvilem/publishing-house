--> subscriptions

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON "subscriptions" FOR SELECT USING (
    is_admin()
 OR user_id = current_user_id()
 OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER')
);

CREATE POLICY "subscriptions_insert" ON "subscriptions" FOR INSERT WITH CHECK (
    is_admin()
 OR user_id = current_user_id()
);

CREATE POLICY "subscriptions_update" ON "subscriptions" FOR UPDATE
    USING (is_admin() OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER'))
    WITH CHECK (is_admin() OR has_newspaper_role(newspaper_id, 'NEWSPAPER_MANAGER'));

CREATE POLICY "subscriptions_delete" ON "subscriptions" FOR DELETE USING (
    is_admin()
);


--> subscription_tokens

ALTER TABLE "subscription_tokens" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_tokens_select" ON "subscription_tokens" FOR SELECT USING (
    is_admin()
 OR user_id = current_user_id()
);

CREATE POLICY "subscription_tokens_insert" ON "subscription_tokens" FOR INSERT WITH CHECK (
    is_admin()
 OR user_id = current_user_id()
);

CREATE POLICY "subscription_tokens_update" ON "subscription_tokens" FOR UPDATE
    USING (is_admin() OR user_id = current_user_id())
    WITH CHECK (is_admin() OR user_id = current_user_id());
