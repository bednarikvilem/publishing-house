import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { sampleArticleDetail, sampleArticles } from "../lib/sampleData";
import type { ArticleDetail } from "../types/article";
import { ArticleCard } from "../components/ArticleCard";
import { Navbar } from "../components/Navbar";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function estimateReadTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Renders article content: ## heading, > blockquote, plain paragraph */
function ArticleContent({ content, inlineImage }: {
  content: string;
  inlineImage?: { url: string; caption: string };
}) {
  const blocks = content.split(/\n\n+/);
  let imageInserted = false;

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        // Section heading
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="text-[24px] font-bold tracking-[-0.3px] text-foreground"
            >
              {trimmed.slice(3)}
            </h2>
          );
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
          const lines = trimmed.split("\n");
          const quoteLines = lines.filter((l) => l.startsWith("> ")).map((l) => l.slice(2));
          const attribution = lines.find((l) => l.startsWith("— ") || l.startsWith("> —"));
          const quoteText = attribution
            ? quoteLines.filter((l) => !l.startsWith("—")).join(" ")
            : quoteLines.join(" ");
          const attr = attribution?.replace(/^> /, "");

          return (
            <blockquote
              key={i}
              className="border-l-4 border-border bg-muted px-8 py-6 flex flex-col gap-3"
            >
              <p className="text-[16px] italic leading-[1.7] text-foreground">{quoteText}</p>
              {attr && (
                <span className="text-[14px] font-semibold text-muted-foreground">{attr}</span>
              )}
            </blockquote>
          );
        }

        // Insert inline image after the second paragraph
        const node = (
          <p
            key={i}
            className="text-[16px] leading-[1.8] text-foreground"
          >
            {trimmed}
          </p>
        );

        if (!imageInserted && inlineImage && i === 2) {
          imageInserted = true;
          return (
            <>
              {node}
              <figure key={`img-${i}`} className="flex flex-col gap-2">
                <img
                  src={inlineImage.url}
                  alt={inlineImage.caption}
                  className="h-[360px] w-full rounded-lg object-cover"
                />
                <figcaption className="text-[13px] italic text-muted-foreground">
                  {inlineImage.caption}
                </figcaption>
              </figure>
            </>
          );
        }

        return node;
      })}
    </div>
  );
}

export function ArticlePage() {
  const { newspaperName, articleId } = useParams<{
    newspaperName: string;
    articleId: string;
  }>();
  const [article, setArticle] = useState<ArticleDetail>(sampleArticleDetail);

  // TODO: replace with real newspaper_id once a public lookup-by-name endpoint exists
  const newspaperId = "550e8400-e29b-41d4-a716-446655440000";

  useEffect(() => {
    if (!articleId) return;
    fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}`, {
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<ArticleDetail>;
      })
      .then((data) => setArticle(data))
      .catch(() => {
        // Backend not available — keep sample data
      });
  }, [newspaperId, articleId]);

  const primaryImage = article.images.find((img) => img.is_primary);
  const inlineImage = article.images.find((img) => !img.is_primary);
  const readTime = estimateReadTime(article.content);

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
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
          <div className="absolute inset-0 bg-muted" />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/67" />
        {/* Content anchored to bottom */}
        <div className="absolute inset-0 flex flex-col justify-end gap-4 px-16 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[13px]">
            <Link to={`/${newspaperName}`} className="text-white/67 hover:text-white/90">
              Home
            </Link>
            <span className="text-white/40">/</span>
            <span className="text-white/67">{article.category}</span>
            <span className="text-white/40">/</span>
            <span className="font-medium text-white/87">Article</span>
          </nav>
          {/* Category badge */}
          <span className="w-fit rounded bg-primary px-2.5 py-1 text-[12px] font-semibold tracking-[0.5px] text-primary-foreground">
            {article.category}
          </span>
          {/* Title */}
          <h1 className="max-w-[800px] text-[40px] font-extrabold leading-[1.15] tracking-[-0.5px] text-white">
            {article.title}
          </h1>
          {/* Author meta */}
          <div className="flex items-center gap-4">
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
                {formatDate(article.publication_date)} · {readTime} min read
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Article Body */}
      <section className="px-16 py-12">
        {/* Lede */}
        <p className="mb-6 text-[18px] leading-[1.7] text-foreground">{article.perex}</p>
        <hr className="mb-6 border-border" />
        <ArticleContent content={article.content} inlineImage={inlineImage} />
      </section>

      {/* Related Articles */}
      <section className="flex flex-col gap-8 px-16 py-12">
        <h2 className="text-[28px] font-extrabold text-foreground">Related Articles</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sampleArticles.data
            .filter((a) => a.id !== article.id)
            .slice(0, 3)
            .map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
        </div>
      </section>
    </div>
  );
}
