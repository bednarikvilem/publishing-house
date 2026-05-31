import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, StarIcon } from "../components/Icons";
import { API_BASE_URL } from "../lib/api";
import type { Article, ArticlesResponse } from "../types/article";
import { ArticleCard } from "../components/ArticleCard";
import { CategoryBadge } from "../components/CategoryBadge";
import { Navbar } from "../components/Navbar";
import { useNewspaper } from "../hooks/useNewspaper";
import { formatDate } from "../lib/utils";

export function NewspaperHomepage() {
  const { newspaperName, newspaper, notFound } = useNewspaper();
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (!newspaper) return;
    fetch(`${API_BASE_URL}/api/newspapers/${newspaper.id}/articles`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<ArticlesResponse>;
      })
      .then((data) => setArticles(data.data))
      .catch(() => {});
  }, [newspaper]);

  if (notFound) {
    return (
      <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
        <Navbar newspaperName={newspaperName} />
        <div className="flex h-64 flex-col items-center justify-center gap-2">
          <p className="text-foreground text-[18px] font-semibold">
            Newspaper not found
          </p>
          <p className="text-muted-foreground text-[14px]">
            There is no newspaper at{" "}
            <span className="font-mono">/{newspaperName}</span>.
          </p>
        </div>
      </div>
    );
  }

  const [featured, ...rest] = articles;

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar
        newspaperName={newspaperName ?? ""}
        displayName={newspaper?.name}
      />

      {/* Hero Section */}
      {featured && (
        <section className="bg-background flex px-12">
          <div className="relative h-[500px] flex-1 overflow-hidden">
            {featured.primary_image ? (
              <img
                src={featured.primary_image.url}
                alt={featured.primary_image.caption}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-muted h-full w-full" />
            )}
            {featured.is_subscriber_only && (
              <span
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/70"
                title="Subscribers only"
              >
                <StarIcon size={14} className="fill-yellow-400 stroke-yellow-400" />
              </span>
            )}
          </div>
          <div className="flex w-[540px] shrink-0 flex-col justify-center gap-5 px-10 py-12">
            <CategoryBadge label="Featured" />
            <h1 className="text-foreground text-[32px] leading-[1.15] font-extrabold tracking-[-0.5px]">
              {featured.title}
            </h1>
            {featured.author ? (
              <Link
                to={`/${newspaperName}/authors/${featured.author.id}`}
                className="flex items-center gap-3"
              >
                {featured.author.profile_picture ? (
                  <img
                    src={featured.author.profile_picture}
                    alt={featured.author.full_name}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="bg-muted h-9 w-9 rounded-full" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-[14px] font-semibold">
                    {featured.author.full_name}
                  </span>
                  <span className="text-muted-foreground text-[13px]">
                    {formatDate(featured.publication_date)}
                  </span>
                </div>
              </Link>
            ) : (
              <span className="text-muted-foreground text-[13px]">
                {formatDate(featured.publication_date)}
              </span>
            )}
            <p className="text-muted-foreground text-[15px] leading-[1.6]">
              {featured.perex}
            </p>
            <Link
              to={`/${newspaperName}/articles/${featured.id}`}
              className="bg-foreground text-background flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-semibold hover:opacity-90"
            >
              Read Full Article
              <ArrowRightIcon />
            </Link>
          </div>
        </section>
      )}

      {/* Latest News */}
      <section className="bg-background flex flex-col gap-8 px-12 py-12">
        <h2 className="text-foreground text-[28px] font-extrabold tracking-[-0.5px]">
          Latest News
        </h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {rest.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
