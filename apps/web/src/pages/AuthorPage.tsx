import { useState } from "react";
import { UserIcon } from "../components/Icons";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";
import { formatDate } from "../lib/utils";
import type { AuthorPublicProfile, Article } from "../types";
import { CategoryBadge } from "../components/CategoryBadge";
import { ArticleCard } from "../components/ArticleCard";
import { Navbar } from "../components/Navbar";
import { useNewspaper } from "../hooks/useNewspaper";
import { Button } from "../components/ui/button";

type SortOrder = "latest" | "oldest";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function sortArticles(
  articles: Article[] | undefined,
  order: SortOrder
): Article[] {
  if (!articles) return [];
  return [...articles].sort((a, b) => {
    const diff =
      new Date(a.publication_date).getTime() -
      new Date(b.publication_date).getTime();
    return order === "latest" ? -diff : diff;
  });
}

export function AuthorPage() {
  const { authorId } = useParams<{ authorId: string }>();
  const { newspaperName, newspaper } = useNewspaper();
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  const { data: author = null, isLoading, isError } = useQuery({
    queryKey: ["author", newspaper?.id, authorId],
    enabled: !!newspaper && !!authorId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaper!.id })
        .authors({ author_id: authorId! })
        .get({ query: { page: 1, limit: 50 } });
      if (error) throw error;
      return data as unknown as AuthorPublicProfile;
    },
  });

  const sorted = sortArticles(author?.articles.data, sortOrder);
  const [featured, ...rest] = sorted;

  if (isError) {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName} />
        <p className="text-muted-foreground py-16 text-center">
          Author not found.
        </p>
      </div>
    );
  }

  if (isLoading || !author) {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName} />
        <p className="text-muted-foreground py-16 text-center">Loading…</p>
      </div>
    );
  }

  const articleCount = author.articles.pagination.total;

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName} />

      {/* Author Hero */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
        <div className="absolute inset-0 bg-black/67" />
        <div className="relative flex items-center gap-10 px-16 py-12">
          {author.profile_picture ? (
            <img
              src={author.profile_picture}
              alt={author.full_name}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/20">
              <UserIcon size={40} className="text-white/60" />
            </div>
          )}

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3">
            {/* Breadcrumb */}
            <p className="text-2xs text-white/80">
              <Link
                to={`/${newspaperName}`}
                className="transition-colors hover:text-white"
              >
                Home
              </Link>
              {" › "}
              <span>Authors</span>
            </p>

            <div className="flex items-start justify-between gap-8">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl-plus leading-none font-extrabold tracking-tight-px text-white">
                  {author.full_name}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-white/70">
                  {author.bio}
                </p>
              </div>

              {/* Stats */}
              <div className="flex shrink-0 items-center gap-8 self-center pr-4">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-3xl-minus font-extrabold text-white">
                    {formatCount(articleCount)}
                  </span>
                  <span className="text-xs text-white/60">Articles</span>
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
            <div className="border-border bg-card flex overflow-hidden rounded-lg border shadow-sm">
              <div className="h-[var(--layout-featured-image-height)] w-[var(--layout-featured-image-width)] shrink-0 overflow-hidden rounded-tl-lg rounded-bl-lg">
                {featured.primary_image ? (
                  <img
                    src={featured.primary_image.url}
                    alt={featured.primary_image.caption}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="bg-muted h-full w-full" />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-3 px-8 py-6">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded px-2.5 py-1 text-3xs font-bold tracking-wider uppercase">
                    Featured
                  </span>
                  <CategoryBadge label={featured.category} />
                </div>
                <h2 className="text-card-foreground text-3xl-minus leading-xs font-extrabold tracking-tight-px">
                  {featured.title}
                </h2>
                <p className="text-muted-foreground line-clamp-3 text-xs-plus leading-relaxed">
                  {featured.perex}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {featured.author?.profile_picture ? (
                    <img
                      src={featured.author.profile_picture}
                      alt={featured.author.full_name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                      <UserIcon size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-card-foreground text-2xs font-semibold">
                      {featured.author?.full_name}
                    </span>
                    <span className="text-muted-foreground text-xs">
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
            <span className="text-muted-foreground text-sm font-medium">
              Sort by:
            </span>
            <Button
              onClick={() => setSortOrder("latest")}
              variant={sortOrder === "latest" ? "default" : "outline"}
              size="sm"
            >
              Latest
            </Button>
            <Button
              onClick={() => setSortOrder("oldest")}
              variant={sortOrder === "oldest" ? "default" : "outline"}
              size="sm"
            >
              Oldest
            </Button>
          </div>
          <span className="text-muted-foreground text-2xs">
            {articleCount} article{articleCount !== 1 ? "s" : ""} total
          </span>
        </div>

        {/* Article Grid */}
        {rest.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          !featured && (
            <p className="text-muted-foreground py-16 text-center">
              No published articles found for this author.
            </p>
          )
        )}
      </div>
    </div>
  );
}
