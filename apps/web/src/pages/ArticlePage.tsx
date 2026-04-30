import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { sampleArticleDetail } from "../lib/sampleData";
import type { ArticleDetail } from "../types";
import { Navbar } from "../components/Navbar";
import { useNewspaper } from "../hooks/useNewspaper";

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

function ArticleContent({
  content,
  inlineImage,
}: {
  content: string;
  inlineImage?: { url: string; caption: string };
}) {
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
            nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
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
      {inlineImage && (
        <figure className="flex flex-col gap-2">
          <img
            src={inlineImage.url}
            alt={inlineImage.caption}
            className="h-[360px] w-full rounded-lg object-cover"
          />
          <figcaption className="text-muted-foreground text-[13px] italic">
            {inlineImage.caption}
          </figcaption>
        </figure>
      )}
    </div>
  );
}

export function ArticlePage() {
  const { articleId } = useParams<{ articleId: string }>();
  const { newspaperName, newspaper } = useNewspaper();
  const [article, setArticle] = useState<ArticleDetail>(sampleArticleDetail);

  useEffect(() => {
    if (!newspaper || !articleId) return;
    fetch(
      `${API_BASE_URL}/api/newspapers/${newspaper.id}/articles/${articleId}`,
      {
        headers: authHeaders(),
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json() as Promise<ArticleDetail>;
      })
      .then((data) => setArticle(data))
      .catch(() => {});
  }, [newspaper, articleId]);

  const primaryImage = article.images.find((img) => img.is_primary);
  const inlineImage = article.images.find((img) => !img.is_primary);
  const readTime = estimateReadTime(article.content);

  return (
    <div className="bg-background text-foreground min-h-screen w-full">
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
                {formatDate(article.publication_date)} · {readTime} min read
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
        <ArticleContent content={article.content} inlineImage={inlineImage} />
      </section>
    </div>
  );
}
