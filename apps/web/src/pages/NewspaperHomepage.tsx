import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { sampleArticles } from "../lib/sampleData";
import type { Article, ArticlesResponse } from "../types/article";
import { ArticleCard } from "../components/ArticleCard";
import { CategoryBadge } from "../components/CategoryBadge";
import { Navbar } from "../components/Navbar";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function NewspaperHomepage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const [articles, setArticles] = useState<Article[]>(sampleArticles.data);

  // TODO: replace with a real newspaper_id once a public lookup-by-name endpoint exists
  const newspaperId = "550e8400-e29b-41d4-a716-446655440000";

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}/articles`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<ArticlesResponse>;
      })
      .then((data) => setArticles(data.data))
      .catch(() => {
        // Backend not available — keep sample data
      });
  }, [newspaperId]);

  const [featured, ...rest] = articles;

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <Navbar newspaperName={newspaperName ?? ""} />

      {/* Hero Section */}
      {featured && (
        <section className="flex bg-background px-12">
          <div className="h-[500px] flex-1 overflow-hidden">
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
          <div className="flex w-[540px] shrink-0 flex-col justify-center gap-5 px-10 py-12">
            <CategoryBadge label="Featured" />
            <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.5px] text-foreground">
              {featured.title}
            </h1>
            <Link to={`/${newspaperName}/authors/${featured.author.id}`} className="flex items-center gap-3">
              {featured.author.profile_picture ? (
                <img
                  src={featured.author.profile_picture}
                  alt={featured.author.full_name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-muted" />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-foreground">
                  {featured.author.full_name}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {formatDate(featured.publication_date)}
                </span>
              </div>
            </Link>
            <p className="text-[15px] leading-[1.6] text-muted-foreground">{featured.perex}</p>
            <Link
              to={`/${newspaperName}/articles/${featured.id}`}
              className="flex w-fit items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background hover:opacity-90"
            >
              Read Full Article
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* Latest News */}
      <section className="flex flex-col gap-8 bg-background px-12 py-12">
        <h2 className="text-[28px] font-extrabold tracking-[-0.5px] text-foreground">
          Latest News
        </h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {rest.map((article) => (
            <Link key={article.id} to={`/${newspaperName}/articles/${article.id}`} className="block">
              <ArticleCard article={article} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
