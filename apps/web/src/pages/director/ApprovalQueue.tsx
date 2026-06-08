import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import type { PaginatedResponse, ReviewDecision } from "../../types";
import type { QueueArticle } from "../../types/dashboard";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { DecisionForm } from "../../components/DecisionForm";
import { STATUS_LABELS, statusToVariant } from "../../lib/articleStatus";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toaster";
import { formatDate } from "../../lib/utils";

export function ApprovalQueue({ newspaperId }: { newspaperId: string }) {
  const { toast } = useToast();
  const [articles, setArticles]   = useState<QueueArticle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/queue?view=DIRECTOR&status=APPROVED_BY_MANAGER&limit=50`,
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

  async function handleDecision(articleId: string, decision: ReviewDecision, note: string) {
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/status`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "APPROVE",
            decision,
            note: note || undefined,
            view: "DIRECTOR",
          }),
        }
      );
      if (!res.ok) throw new Error();
      setActiveId(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to submit decision.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Approval Queue" />
      {loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles awaiting your approval." />
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
                    <span>Submitted: {formatDate(article.submitted_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={statusToVariant(article.status)}>
                    {STATUS_LABELS[article.status]}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveId(activeId === article.id ? null : article.id)}
                  >
                    Decide
                  </Button>
                </div>
              </div>
              {activeId === article.id && (
                <DecisionForm
                  onSubmit={(d, n) => handleDecision(article.id, d, n)}
                  onCancel={() => setActiveId(null)}
                  submitting={submitting}
                />
              )}
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
