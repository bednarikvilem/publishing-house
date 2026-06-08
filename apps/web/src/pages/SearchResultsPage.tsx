import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";
import type { Article, PaginatedResponse } from "../types";
import { ArticleCard } from "../components/ArticleCard";
import { SearchIcon } from "../components/Icons";
import { Navbar } from "../components/Navbar";
import { useNewspaper } from "../hooks/useNewspaper";
import { Input } from "../components/ui/input";

export function SearchResultsPage() {
  const { newspaperName, newspaper } = useNewspaper();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const query = searchParams.get("q") ?? "";

  // Sync the controlled input whenever the URL query changes (e.g. browser back/forward)
  useEffect(() => {
    setInputValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  const searchQuery = useQuery({
    queryKey: ["search", newspaper?.id, query],
    enabled: !!newspaper && !!query.trim(),
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaper!.id })
        .articles.search.get({ query: { q: query, page: 1, limit: 20 } });
      if (error) throw error;
      return data as PaginatedResponse<Article>;
    },
  });

  const articles = searchQuery.data?.data ?? [];
  const total = searchQuery.data?.pagination.total ?? 0;
  const loading = searchQuery.isLoading;
  const error = searchQuery.isError;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) {
      navigate(
        `/${newspaperName}/search?q=${encodeURIComponent(inputValue.trim())}`
      );
    }
  }

  return (
    <div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex flex-col gap-6 px-16 py-12">
        {/* Search Section */}
        <div className="flex flex-col gap-4">
          <h1 className="text-foreground text-3xl-plus font-extrabold tracking-tight-px">
            Search Results
          </h1>
          <form onSubmit={handleSearch}>
            <div className="border-border bg-card flex h-12 w-full items-center gap-2.5 rounded-lg border px-4">
              <SearchIcon
                size={18}
                className="text-muted-foreground shrink-0"
              />
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search articles..."
                className="flex-1 border-0 bg-transparent px-0 text-xs-plus focus-visible:ring-0 h-full"
              />
            </div>
          </form>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          {query ? (
            <span className="text-foreground text-xs-plus font-semibold">
              {loading
                ? "Searching…"
                : `${total} Result${total !== 1 ? "s" : ""}`}
            </span>
          ) : (
            <span className="text-foreground text-xs-plus font-semibold">
              Enter a search term above
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="bg-border h-px w-full" />

        {/* Results Grid */}
        {error ? (
          <p className="text-muted-foreground py-16 text-center">
            Something went wrong. Please try again.
          </p>
        ) : loading ? (
          <p className="text-muted-foreground py-16 text-center">Loading…</p>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : query ? (
          <p className="text-muted-foreground py-16 text-center">
            No results found for <strong>"{query}"</strong>.
          </p>
        ) : null}
      </div>
    </div>
  );
}