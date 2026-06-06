import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import type { PaginatedResponse } from "../../types";
import type { QueueArticle } from "../../types/dashboard";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";

export function PublicationQueue({ newspaperId }: { newspaperId: string }) {
  const [articles, setArticles]     = useState<QueueArticle[]>([]);
  const [loading, setLoading]       = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/queue?view=DIRECTOR&status=APPROVED_BY_DIRECTOR&limit=50`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as PaginatedResponse<QueueArticle>;
      setArticles(data.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [newspaperId]);

  useEffect(() => { load(); }, [load]);

  async function handlePublish(articleId: string) {
    if (!confirm("Publish this article immediately?")) return;
    setPublishing(articleId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/publish`,
        { method: "POST", headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert("Failed to publish article.");
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Publication Queue" />
      {loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles ready for publication." />
      ) : (
        <div className="flex flex-col">
          {articles.map((article, i) => (
            <ListRow key={article.id} first={i === 0} last={i === articles.length - 1}>
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-foreground text-xs-plus font-semibold">{article.title}</span>
                  <span className="text-muted-foreground line-clamp-2 text-2xs">{article.perex}</span>
                  <div className="text-muted-foreground flex gap-3 text-xs">
                    <span>Author: {article.author.full_name}</span>
                    <span>Category: {article.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePublish(article.id)}
                  disabled={publishing === article.id}
                  className="rounded-md bg-[#16a34a] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {publishing === article.id ? "Publishing…" : "Publish"}
                </button>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
