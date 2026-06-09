import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api";
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
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ["approval-queue", newspaperId],
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles.queue.get({
          query: { page: 1, view: "DIRECTOR", status: "APPROVED_BY_MANAGER", limit: 50 },
        });
      if (error) throw error;
      return data as PaginatedResponse<QueueArticle>;
    },
  });

  const decide = useMutation({
    mutationFn: async ({
      articleId,
      decision,
      note,
    }: {
      articleId: string;
      decision: ReviewDecision;
      note: string;
    }) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId })
        .status.patch({
          action: "APPROVE",
          decision,
          note: note || undefined,
          view: "DIRECTOR",
        });
      if (error) throw error;
    },
    onSuccess: (_data, { articleId }) => {
      setActiveId(null);
      for (const key of ["approval-queue", "publication-queue", "editorial-queue", "review-queue"]) {
        queryClient.invalidateQueries({ queryKey: [key, newspaperId] });
      }
      queryClient.invalidateQueries({ queryKey: ["article", newspaperId, articleId] });
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to submit decision.", variant: "error" }),
  });

  const articles = queueQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Approval Queue" />
      {queueQuery.isLoading ? (
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
                  onSubmit={(d, n) => decide.mutate({ articleId: article.id, decision: d, note: n })}
                  onCancel={() => setActiveId(null)}
                  submitting={decide.isPending}
                />
              )}
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
