import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { Heart, MessageCircle } from "lucide-react";
import { ImageNode } from "../lib/lexical/ImageNode";
import { API_BASE_URL, authHeaders, requestSubscription } from "../lib/api";
import type { ArticleDetail, Comment } from "../types";
import { Navbar } from "../components/Navbar";
import { useNewspaper } from "../hooks/useNewspaper";
import { useArticleViewTracker } from "../hooks/useArticleViewTracker";
import { formatDate } from "../lib/utils";

function estimateReadTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

const viewerTheme = {
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
  },
  list: {
    ul: "list-disc pl-6 my-2",
    ol: "list-decimal pl-6 my-2",
    listitem: "my-0.5",
    nested: { listitem: "list-none" },
  },
  quote:
    "border-l-4 border-border bg-muted px-8 py-6 text-foreground italic my-3",
  heading: {
    h1: "text-[32px] font-bold tracking-[-0.3px] my-3",
    h2: "text-[24px] font-bold tracking-[-0.3px] my-3",
    h3: "text-[20px] font-bold my-2",
  },
  paragraph: "text-foreground text-[16px] leading-[1.8] my-1",
};

function ArticleContent({ content }: { content: string }) {
  let editorState: string | undefined;
  try {
    const parsed = JSON.parse(content);
    if (parsed.root) editorState = content;
  } catch {
    // plain text fallback
  }

  return (
    <div className="flex flex-col gap-6">
      {editorState ? (
        <LexicalComposer
          initialConfig={{
            namespace: "ArticleViewer",
            theme: viewerTheme,
            nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, ImageNode],
            onError: (error: Error) => console.error("Lexical error:", error),
            editorState,
            editable: false,
          }}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="text-foreground text-[16px] leading-[1.8] outline-none" />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <ListPlugin />
        </LexicalComposer>
      ) : (
        <p className="text-foreground text-[16px] leading-[1.8]">{content}</p>
      )}
    </div>
  );
}

export function ArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const { newspaperName, newspaper } = useNewspaper();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState<"unauthorized" | "subscription_required" | "not_found" | "error" | null>(null);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isLoggedIn = !!localStorage.getItem("token");

  const { sentinelRef } = useArticleViewTracker({
    newspaperId: newspaper?.id,
    articleId: articleId,
    enabled: article !== null,
  });

  useEffect(() => {
    if (!newspaper || !articleId) return;
    setError(null);
    fetch(
      `${API_BASE_URL}/api/newspapers/${newspaper.id}/articles/${articleId}`,
      { headers: authHeaders() }
    )
      .then(async (res) => {
        if (res.status === 403) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          if (body.error === "SUBSCRIPTION_REQUIRED") {
            setError("subscription_required");
          } else {
            setError("unauthorized");
          }
          return null;
        }
        if (res.status === 401) {
          setError("unauthorized");
          return null;
        }
        if (res.status === 404) {
          setError("not_found");
          return null;
        }
        if (!res.ok) {
          setError("error");
          return null;
        }
        return res.json() as Promise<ArticleDetail>;
      })
      .then((data) => {
        if (data) {
          setArticle(data);
          setLikesCount(data.likes_count);
          setLikedByMe(data.liked_by_me);
          setComments(data.comments);
        }
      })
      .catch(() => setError("error"));
  }, [newspaper, articleId]);

  async function handleToggleLike() {
    if (!newspaper || !articleId || isTogglingLike) return;
    setIsTogglingLike(true);
    const wasLiked = likedByMe;
    setLikedByMe(!wasLiked);
    setLikesCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaper.id}/articles/${articleId}/likes`,
        { method: wasLiked ? "DELETE" : "POST", headers: authHeaders() }
      );
      if (res.ok) {
        const data = await res.json() as { likes_count: number };
        setLikesCount(data.likes_count);
      } else {
        setLikedByMe(wasLiked);
        setLikesCount((c) => c + (wasLiked ? 1 : -1));
      }
    } catch {
      setLikedByMe(wasLiked);
      setLikesCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setIsTogglingLike(false);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newspaper || !articleId || !commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaper.id}/articles/${articleId}/comments`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ content: commentText.trim() }),
        }
      );
      if (res.ok) {
        const newComment = await res.json() as Comment;
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
      }
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleSubscribeFromPaywall() {
    if (!newspaper) return;
    try {
      await requestSubscription(newspaper.id);
      setSubscribeMessage("Check your email for your subscription QR code.");
    } catch {
      setSubscribeMessage("Failed to send QR code. Please try again.");
    }
  }

  if (error === "subscription_required") {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
          <div className="border-border bg-card flex w-full max-w-[420px] flex-col items-center gap-4 rounded-xl border p-10 text-center shadow-sm">
            <h2 className="text-foreground text-[22px] font-extrabold tracking-tight">
              Subscriber-only content
            </h2>
            <p className="text-muted-foreground text-[14px]">
              You do not have access to this article.
            </p>
            {subscribeMessage ? (
              <p className="text-muted-foreground text-[14px]">{subscribeMessage}</p>
            ) : isLoggedIn ? (
              <button
                onClick={handleSubscribeFromPaywall}
                className="bg-primary text-primary-foreground mt-2 rounded-lg px-6 py-2.5 text-[14px] font-semibold hover:opacity-90"
              >
                Subscribe
              </button>
            ) : (
              <a
                href={`/${newspaperName}/login`}
                className="bg-primary text-primary-foreground mt-2 rounded-lg px-6 py-2.5 text-[14px] font-semibold hover:opacity-90"
              >
                Log in to subscribe
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const message =
      error === "unauthorized"
        ? "You do not have access to this article."
        : error === "not_found"
          ? "This article could not be found."
          : "Failed to load the article. Please try again later.";
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <p className="text-muted-foreground text-[15px]">{message}</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName ?? ""} />
        <div className="text-muted-foreground flex h-64 items-center justify-center text-[15px]">
          Loading…
        </div>
      </div>
    );
  }

  const primaryImage = article.images.find((img) => img.is_primary);
  const readTime = estimateReadTime(article.content);

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />

      {/* Hero */}
      <div className="relative h-[480px] w-full overflow-hidden">
        {/* Background image */}
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.caption}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="bg-muted absolute inset-0" />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/67" />
        {/* Content anchored to bottom */}
        <div className="absolute inset-0 flex flex-col justify-end gap-4 px-16 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[13px]">
            <Link
              to={`/${newspaperName}`}
              className="text-white/67 hover:text-white/90"
            >
              Home
            </Link>
            <span className="text-white/40">/</span>
            <Link
              to={`/${newspaperName}/category/${article.category_slug}`}
              className="text-white/67 hover:text-white/90"
            >
              {article.category}
            </Link>
            <span className="text-white/40">/</span>
            <span className="font-medium text-white/87">Article</span>
          </nav>
          {/* Category badge */}
          <span className="bg-primary text-primary-foreground w-fit rounded px-2.5 py-1 text-[12px] font-semibold tracking-[0.5px]">
            {article.category}
          </span>
          {/* Title */}
          <h1 className="max-w-[800px] text-[40px] leading-[1.15] font-extrabold tracking-[-0.5px] text-white">
            {article.title}
          </h1>
          {/* Author meta */}
          <Link
            to={`/${newspaperName}/authors/${article.author.id}`}
            className="flex w-fit items-center gap-4 transition-opacity hover:opacity-80"
          >
            {article.author.profile_picture ? (
              <img
                src={article.author.profile_picture}
                alt={article.author.full_name}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-white/27"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-white/20 ring-1 ring-white/27" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-white/90">
                By {article.author.full_name}
              </span>
              <span className="text-[13px] text-white/67">
                {formatDate(article.publication_date, "long")} · {readTime} min read
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Article Body */}
      <section className="px-16 py-12">
        {/* Lede */}
        <p className="text-foreground mb-6 text-[18px] leading-[1.7]">
          {article.perex}
        </p>

        <hr className="border-border mb-6" />

        <ArticleContent content={article.content} />

        {/* Article read tracking sentinel */}
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
      </section>

      {/* Likes & Comments */}
      <section className="px-16 pb-16">
        <hr className="border-border mb-8" />

        {/* Like button */}
        <div className="mb-10 flex items-center gap-3">
          {isLoggedIn ? (
            <button
              onClick={handleToggleLike}
              disabled={isTogglingLike}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium transition-colors ${
                likedByMe
                  ? "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
                  : "border-border text-muted-foreground hover:border-red-300 hover:text-red-500"
              }`}
            >
              <Heart
                size={16}
                className={likedByMe ? "fill-red-500 stroke-red-500" : ""}
              />
              {likesCount} {likesCount === 1 ? "Like" : "Likes"}
            </button>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2 text-[14px]">
              <Heart size={16} />
              {likesCount} {likesCount === 1 ? "Like" : "Likes"}
            </span>
          )}
        </div>

        {/* Comments */}
        <div className="flex flex-col gap-6">
          <h2 className="flex items-center gap-2 text-[20px] font-bold">
            <MessageCircle size={20} />
            Comments ({comments.length})
          </h2>

          {/* Comment form */}
          {isLoggedIn && (
            <form onSubmit={handleSubmitComment} className="flex flex-col gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                maxLength={2000}
                rows={3}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="bg-primary text-primary-foreground rounded-lg px-5 py-2 text-[14px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {isSubmittingComment ? "Posting…" : "Post comment"}
                </button>
              </div>
            </form>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-[14px]">No comments yet. Be the first!</p>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-border rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[13px] font-semibold">@{comment.author.username}</span>
                    <span className="text-muted-foreground text-[12px]">
                      {formatDate(comment.created_at, "long")}
                    </span>
                  </div>
                  <p className="text-foreground text-[14px] leading-[1.6]">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
