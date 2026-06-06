import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import type { ArticleStatus, PaginatedResponse } from "../../types";
import type { DashboardArticle } from "../../types/dashboard";
import { PencilIcon, PlusIcon } from "../../components/Icons";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { Pagination } from "../../components/Pagination";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { STATUS_LABELS, STATUS_STYLES, MY_ARTICLE_FILTERS } from "../../lib/articleStatus";
import { formatDate } from "../../lib/utils";

export function MyArticlesSection({
  newspaperId,
  newspaperName,
}: {
  newspaperId: string;
  newspaperName: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatus = (searchParams.get("status") as ArticleStatus | null) ?? null;
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [articles, setArticles] = useState<DashboardArticle[]>([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!newspaperId) return;
    async function doFetch() {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams();
        if (activeStatus) params.set("status", activeStatus);
        params.set("page", String(currentPage));
        params.set("limit", "20");
        const res = await fetch(
          `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/mine?${params}`,
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as PaginatedResponse<DashboardArticle>;
        setArticles(data.data);
        setPagination({
          total: data.pagination.total,
          total_pages: data.pagination.total_pages,
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    doFetch();
  }, [newspaperId, activeStatus, currentPage]);

  function setPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  }

  const activeLabel =
    MY_ARTICLE_FILTERS.find((s) => s.value === activeStatus)?.label ?? "All Articles";

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle
        title={activeLabel}
        action={
          <Link
            to={`/${newspaperName}/articles/new`}
            className="bg-foreground text-background flex items-center gap-2 rounded-md px-4 py-2 text-2xs font-semibold transition-opacity hover:opacity-90"
          >
            <PlusIcon />
            New Article
          </Link>
        }
      />

      {error ? (
        <ErrorState message="Failed to load articles. Please sign in and try again." />
      ) : loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState
          message={
            activeStatus
              ? `No articles with status "${STATUS_LABELS[activeStatus]}".`
              : "You haven't written any articles yet."
          }
        />
      ) : (
        <>
          <div className="flex flex-col">
            {articles.map((article, index) => (
              <ListRow
                key={article.id}
                first={index === 0}
                last={index === articles.length - 1}
              >
                <div className="flex items-center gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-foreground text-xs-plus leading-snug font-semibold">
                      {article.title}
                    </span>
                    <span className="text-muted-foreground line-clamp-2 text-2xs leading-[1.4]">
                      {article.perex}
                    </span>
                    {article.latest_feedback && (
                      <span className="mt-1 text-xs leading-[1.4] text-[#dc2626]">
                        Feedback: {article.latest_feedback}
                      </span>
                    )}
                    {article.assigned_editor && (
                      <span className="text-muted-foreground text-xs">
                        Editor: {article.assigned_editor.full_name}
                      </span>
                    )}
                    <span className="text-muted-foreground/60 text-3xs">
                      Updated {formatDate(article.updated_at)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[article.status]}`}
                    >
                      {STATUS_LABELS[article.status]}
                    </span>
                    {article.status === "DRAFT" && (
                      <Link
                        to={`/${newspaperName}/articles/${article.id}/edit`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit article"
                      >
                        <PencilIcon />
                      </Link>
                    )}
                  </div>
                </div>
              </ListRow>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.total_pages}
            total={pagination.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
