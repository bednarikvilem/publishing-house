import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL, authHeaders, requestSubscription } from "../lib/api";
import type { ArticleDetail } from "../types";
import { Navbar } from "../components/Navbar";
import { ArticleContent } from "../components/ArticleContent";
import { ArticleActions } from "../components/ArticleActions";
import { CommentsSection } from "../components/CommentsSection";
import { useNewspaper } from "../hooks/useNewspaper";
import { useArticleViewTracker } from "../hooks/useArticleViewTracker";
import { Button } from "../components/ui/button";
import { formatDate } from "../lib/utils";
import { useState } from "react";

function estimateReadTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function ArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const { newspaperName, newspaper } = useNewspaper();
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);

  const isLoggedIn = !!localStorage.getItem("token");

  const { data: article = null, isLoading, error } = useQuery({
    queryKey: ["article", newspaper?.id, articleId],
    enabled: !!newspaper && !!articleId,
    retry: false,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaper!.id}/articles/${articleId}`,
        { headers: authHeaders() },
      );
      if (res.status === 403) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw Object.assign(new Error("forbidden"), {
          kind: body.error === "SUBSCRIPTION_REQUIRED" || isLoggedIn
            ? "subscription_required"
            : "unauthorized",
        });
      }
      if (res.status === 401) {
        throw Object.assign(new Error("unauthorized"), {
          kind: isLoggedIn ? "subscription_required" : "unauthorized",
        });
      }
      if (res.status === 404) throw Object.assign(new Error("not_found"), { kind: "not_found" });
      if (!res.ok) throw Object.assign(new Error("error"), { kind: "error" });
      return res.json() as Promise<ArticleDetail>;
    },
  });

  const errorKind = error ? (error as Error & { kind?: string }).kind ?? "error" : null;

  const { sentinelRef } = useArticleViewTracker({
    newspaperId: newspaper?.id,
    articleId,
    enabled: article !== null,
  });

  async function handleSubscribeFromPaywall() {
    if (!newspaper) return;
    try {
      await requestSubscription(newspaper.id);
      setSubscribeMessage("Check your email for your subscription QR code.");
    } catch {
      setSubscribeMessage("Failed to send QR code. Please try again.");
    }
  }

  const themeClass = `bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`;

  if (errorKind === "subscription_required") {
    return (
      <div className={themeClass}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
          <div className="border-border bg-card flex w-full max-w-[var(--layout-auth-card-max-width)] flex-col items-center gap-4 rounded-xl border p-10 text-center shadow-sm">
            <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
              Subscribers only
            </h2>
            <p className="text-muted-foreground text-sm">
              {isLoggedIn
                ? "This article is available to subscribers only. Subscribe to keep reading."
                : "This article is available to subscribers only. Sign in or create an account to subscribe."}
            </p>
            {subscribeMessage ? (
              <p className="text-muted-foreground text-sm">{subscribeMessage}</p>
            ) : isLoggedIn ? (
              <Button onClick={handleSubscribeFromPaywall} className="mt-2">
                Subscribe now
              </Button>
            ) : (
              <div className="mt-2 flex gap-3">
                <a href={`/${newspaperName}/login`} className="text-foreground hover:bg-muted rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors">
                  Sign in
                </a>
                <a href={`/${newspaperName}/register`} className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold hover:opacity-90">
                  Create account
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (errorKind === "unauthorized") {
    return (
      <div className={themeClass}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
          <div className="border-border bg-card flex w-full max-w-[var(--layout-auth-card-max-width)] flex-col items-center gap-4 rounded-xl border p-10 text-center shadow-sm">
            {isLoggedIn ? (
              <>
                <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">Access denied</h2>
                <p className="text-muted-foreground text-sm">You don't have permission to view this article.</p>
              </>
            ) : (
              <>
                <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">Sign in to read this article</h2>
                <p className="text-muted-foreground text-sm">Create a free account or sign in to access the full article.</p>
                <div className="mt-2 flex gap-3">
                  <a href={`/${newspaperName}/login`} className="text-foreground hover:bg-muted rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors">Sign in</a>
                  <a href={`/${newspaperName}/register`} className="bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold hover:opacity-90">Create account</a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (errorKind) {
    const message = errorKind === "not_found"
      ? "This article could not be found."
      : "Failed to load the article. Please try again later.";
    return (
      <div className={themeClass}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground text-xs-plus">{message}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !article) {
    return (
      <div className={themeClass}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="text-muted-foreground flex h-64 items-center justify-center text-xs-plus">
          Loading…
        </div>
      </div>
    );
  }

  const primaryImage = article.images.find((img) => img.is_primary);
  const readTime = estimateReadTime(article.content);

  return (
    <div className={themeClass}>
      <Navbar newspaperName={newspaperName ?? ""} />

      {/* Hero */}
      <div className="relative h-[var(--layout-article-hero-height)] w-full overflow-hidden">
        {primaryImage ? (
          <img src={primaryImage.url} alt={primaryImage.caption} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="bg-muted absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-black/67" />
        <div className="absolute inset-0 flex flex-col justify-end gap-4 px-16 pb-12">
          <nav className="flex items-center gap-2 text-2xs">
            <Link to={`/${newspaperName}`} className="text-white/67 hover:text-white/90">Home</Link>
            <span className="text-white/40">/</span>
            <Link to={`/${newspaperName}/category/${article.category_slug}`} className="text-white/67 hover:text-white/90">{article.category}</Link>
            <span className="text-white/40">/</span>
            <span className="font-medium text-white/87">Article</span>
          </nav>
          <span className="bg-primary text-primary-foreground w-fit rounded px-2.5 py-1 text-xs font-semibold tracking-wide-sm">
            {article.category}
          </span>
          <h1 className="max-w-[var(--layout-article-title-max-width)] text-4xl-plus leading-2xs font-extrabold tracking-tight-px text-white">
            {article.title}
          </h1>
          <Link to={`/${newspaperName}/authors/${article.author.id}`} className="flex w-fit items-center gap-4 transition-opacity hover:opacity-80">
            {article.author.profile_picture ? (
              <img src={article.author.profile_picture} alt={article.author.full_name} className="h-9 w-9 rounded-full object-cover ring-1 ring-white/27" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-white/20 ring-1 ring-white/27" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-white/90">By {article.author.full_name}</span>
              <span className="text-2xs text-white/67">{formatDate(article.publication_date, "long")} · {readTime} min read</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Article Body */}
      <section className="px-6 py-12">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-foreground mb-6 text-lg leading-lg">{article.perex}</p>
          <hr className="border-border mb-6" />
          <ArticleContent content={article.content} />
          <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
        </div>
      </section>

      {/* Likes & Comments */}
      <section className="px-6 pb-16">
        <div className="mx-auto w-full max-w-3xl">
          <hr className="border-border mb-8" />
          <div className="mb-10 flex items-center gap-3">
            <ArticleActions
              articleId={articleId!}
              newspaperId={newspaper!.id}
              initialLikesCount={article.likes_count}
              initialLikedByMe={article.liked_by_me}
              isLoggedIn={isLoggedIn}
            />
          </div>
          <CommentsSection
            articleId={articleId!}
            newspaperId={newspaper!.id}
            initialComments={article.comments}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </section>
    </div>
  );
}
