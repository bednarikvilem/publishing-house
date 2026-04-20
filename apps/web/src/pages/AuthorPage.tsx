import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Twitter, Linkedin, Mail } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { sampleAuthors, sampleAuthorFallback } from "../lib/sampleData";
import type { AuthorDetail, Article } from "../types/article";
import { CategoryBadge } from "../components/CategoryBadge";
import { ArticleCard } from "../components/ArticleCard";
import { Navbar } from "../components/Navbar";

type SortOrder = "latest" | "oldest";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function sortArticles(articles: Article[], order: SortOrder): Article[] {
  return [...articles].sort((a, b) => {
    const diff =
      new Date(a.publication_date).getTime() -
      new Date(b.publication_date).getTime();
    return order === "latest" ? -diff : diff;
  });
}

export function AuthorPage() {
  const { newspaperName, authorId } = useParams<{
    newspaperName: string;
    authorId: string;
  }>();

  const fallback =
    authorId && sampleAuthors[authorId]
      ? sampleAuthors[authorId]
      : sampleAuthorFallback;

  const [author, setAuthor] = useState<AuthorDetail>(fallback);
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  // TODO: replace with real newspaper_id once a public lookup-by-name endpoint exists
  const newspaperId = "550e8400-e29b-41d4-a716-446655440000";

  useEffect(() => {
    const nextFallback =
      authorId && sampleAuthors[authorId]
        ? sampleAuthors[authorId]
        : sampleAuthorFallback;
    setAuthor(nextFallback);
    setSortOrder("latest");

    if (!authorId) return;
    fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}/authors/${authorId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<AuthorDetail>;
      })
      .then((data) => setAuthor(data))
      .catch(() => {
        // Backend not available — keep sample data
      });
  }, [newspaperId, authorId]);

  const sorted = sortArticles(author.articles, sortOrder);
  const [featured, ...rest] = sorted;

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <Navbar newspaperName={newspaperName ?? ""} />

      {/* Author Hero */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
        <div className="absolute inset-0 bg-black/67" />
        <div className="relative flex items-center gap-10 px-16 py-12">
          {/* Avatar — unchanged from mobile design */}
          {author.profile_picture ? (
            <img
              src={author.profile_picture}
              alt={author.full_name}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="h-24 w-24 shrink-0 rounded-full bg-white/20 ring-2 ring-white/20" />
          )}

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3">
            {/* Breadcrumb */}
            <p className="text-[13px] text-white/80">
              <Link
                to={`/${newspaperName}`}
                className="hover:text-white transition-colors"
              >
                Home
              </Link>
              {" › "}
              <span>Authors</span>
            </p>

            <div className="flex items-start justify-between gap-8">
              <div className="flex flex-col gap-2">
                <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.5px] text-white">
                  {author.full_name}
                </h1>
                <p className="text-[14px] font-medium text-primary-foreground/80">
                  {author.role}
                </p>
                {/* Bio — unchanged from mobile design */}
                <p className="max-w-[600px] text-[14px] leading-[1.6] text-white/70">
                  {author.bio}
                </p>

                {/* Social links */}
                <div className="mt-1 flex items-center gap-3">
                  {author.social_links.twitter && (
                    <a
                      href={author.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter size={18} />
                    </a>
                  )}
                  {author.social_links.linkedin && (
                    <a
                      href={author.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin size={18} />
                    </a>
                  )}
                  {author.social_links.email && (
                    <a
                      href={`mailto:${author.social_links.email}`}
                      className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                      aria-label="Email"
                    >
                      <Mail size={18} />
                    </a>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex shrink-0 items-center gap-8 self-center pr-4">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[28px] font-extrabold text-white">
                    {formatCount(author.articles_count)}
                  </span>
                  <span className="text-[12px] text-white/60">Articles</span>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[28px] font-extrabold text-white">
                    {author.years_active}
                  </span>
                  <span className="text-[12px] text-white/60">Years</span>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[28px] font-extrabold text-white">
                    {formatCount(author.total_likes)}
                  </span>
                  <span className="text-[12px] text-white/60">Likes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-12 px-16 py-12">

        {/* Featured Article */}
        {featured && (
          <Link
            to={`/${newspaperName}/articles/${featured.id}`}
            className="block"
          >
            <div className="flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="h-[360px] w-[560px] shrink-0 overflow-hidden rounded-tl-lg rounded-bl-lg">
                {featured.primary_image ? (
                  <img
                    src={featured.primary_image.url}
                    alt={featured.primary_image.caption}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-3 px-8 py-6">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                    Featured
                  </span>
                  <CategoryBadge label={featured.category} />
                </div>
                <h2 className="text-[28px] font-extrabold leading-[1.2] tracking-[-0.5px] text-card-foreground">
                  {featured.title}
                </h2>
                <p className="text-[15px] leading-[1.6] text-muted-foreground line-clamp-3">
                  {featured.perex}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {featured.author.profile_picture ? (
                    <img
                      src={featured.author.profile_picture}
                      alt={featured.author.full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-card-foreground">
                      {featured.author.full_name}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {formatDate(featured.publication_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-muted-foreground">
              Sort by:
            </span>
            <button
              onClick={() => setSortOrder("latest")}
              className={`rounded-full px-[14px] py-1.5 text-[13px] font-medium transition-colors ${
                sortOrder === "latest"
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setSortOrder("oldest")}
              className={`rounded-full px-[14px] py-1.5 text-[13px] font-medium transition-colors ${
                sortOrder === "oldest"
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Oldest
            </button>
          </div>
          <span className="text-[13px] text-muted-foreground">
            {author.articles_count} article{author.articles_count !== 1 ? "s" : ""} total
          </span>
        </div>

        {/* Article Grid */}
        {rest.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <Link
                key={article.id}
                to={`/${newspaperName}/articles/${article.id}`}
                className="block"
              >
                <ArticleCard article={article} />
              </Link>
            ))}
          </div>
        ) : (
          !featured && (
            <p className="py-16 text-center text-muted-foreground">
              No published articles found for this author.
            </p>
          )
        )}
      </div>
    </div>
  );
}
