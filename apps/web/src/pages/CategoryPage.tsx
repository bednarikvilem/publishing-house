import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import type { Article, ArticlesResponse } from "../types/article";
import { CategoryBadge } from "../components/CategoryBadge";
import { ArticleCard } from "../components/ArticleCard";
import { Navbar } from "../components/Navbar";
import { useNewspaper } from "../hooks/useNewspaper";
import { useCategory } from "../hooks/useCategory";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type SortOrder = "latest" | "oldest";

function sortArticles(articles: Article[], order: SortOrder): Article[] {
  return [...articles].sort((a, b) => {
    const diff =
      new Date(a.publication_date).getTime() -
      new Date(b.publication_date).getTime();
    return order === "latest" ? -diff : diff;
  });
}

export function CategoryPage() {
  const { newspaper, newspaperName } = useNewspaper();
  const { categorySlug, category } = useCategory(newspaper?.id);

  const [articles, setArticles] = useState<Article[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  useEffect(() => {
    if (!newspaper || !category) return;

    setArticles([]);
    fetch(
      `${API_BASE_URL}/api/newspapers/${newspaper.id}/articles?category_id=${category.id}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<ArticlesResponse>;
      })
      .then((data) => setArticles(data.data))
      .catch(() => {});
  }, [newspaper, category?.id]);

  const sorted = sortArticles(articles, sortOrder);
  const [featured, ...rest] = sorted;

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <Navbar newspaperName={newspaperName} />

      {/* Category Hero */}
      <div className="relative h-[280px] w-full overflow-hidden">
        {/* Background — generic gradient fallback looks intentional for every category */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/67" />
        {/* Centered content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-12 text-center">
          {/* Breadcrumb */}
          <p className="text-[13px] text-white/80">
            <Link
              to={`/${newspaperName}`}
              className="hover:text-white transition-colors"
            >
              Home
            </Link>
            {" › "}
            <span>{category?.name ?? categorySlug}</span>
          </p>
          {/* Category title */}
          <h1 className="text-[48px] font-black leading-none tracking-[-1px] text-white">
            {category?.name ?? categorySlug}
          </h1>
          {/* Article count badge */}
          <span className="rounded-full border border-white/20 bg-white/[0.13] px-4 py-1.5 text-[13px] font-medium text-white">
            {articles.length} Article{articles.length !== 1 ? "s" : ""}
          </span>
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
              {/* Image */}
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
              {/* Content */}
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
            Showing {rest.length > 0 ? `1–${rest.length + 1}` : "0"} of{" "}
            {articles.length} article{articles.length !== 1 ? "s" : ""}
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
            <p className="text-center text-muted-foreground py-16">
              No articles found in the <strong>{category?.name ?? categorySlug}</strong> category.
            </p>
          )
        )}
      </div>
    </div>
  );
}
