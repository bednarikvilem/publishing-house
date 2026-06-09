import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api";
import type { PaginatedResponse, ReviewDecision } from "../../types";
import type { QueueArticle } from "../../types/dashboard";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { Pagination } from "../../components/Pagination";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { DecisionForm } from "../../components/DecisionForm";
import { STATUS_LABELS } from "../../lib/articleStatus";
import { statusToVariant } from "../../lib/articleStatus";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toaster";
import { formatDate } from "../../lib/utils";

export function ReviewQueueSection({ newspaperId }: { newspaperId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");
  const [activeId, setActiveId] = useState<string | null>(null);

  const queueQuery = useQuery({
    queryKey: ["review-queue", newspaperId, currentPage],
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles.queue.get({
          query: { page: currentPage, limit: 20, view: "EDITOR" },
        });
      if (error) throw error;
      return data as PaginatedResponse<QueueArticle>;
    },
  });

  const review = useMutation({
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
        .status.patch({ action: "REVIEW", decision, note: note || undefined });
      if (error) throw error;
    },
    onSuccess: (_data, { articleId }) => {
      setActiveId(null);
      for (const key of ["review-queue", "editorial-queue", "approval-queue", "publication-queue"]) {
        queryClient.invalidateQueries({ queryKey: [key, newspaperId] });
      }
      queryClient.invalidateQueries({ queryKey: ["article", newspaperId, articleId] });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "error",
      }),
  });

  const articles = queueQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle title="Review Queue" />

      {queueQuery.isError ? (
        <ErrorState />
      ) : queueQuery.isLoading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles awaiting your review." />
      ) : (
        <>
          <div className="flex flex-col">
            {articles.map((article, index) => (
              <ListRow
                key={article.id}
                first={index === 0}
                last={index === articles.length - 1}
              >
                <div className="flex items-start gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-foreground text-xs-plus leading-snug font-semibold">
                      {article.title}
                    </span>
                    <span className="text-muted-foreground line-clamp-2 text-2xs leading-md">
                      {article.perex}
                    </span>
                    <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
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
                      Review
                    </Button>
                  </div>
                </div>
                {activeId === article.id && (
                  <DecisionForm
                    onSubmit={(d, n) =>
                      review.mutate({ articleId: article.id, decision: d, note: n })
                    }
                    onCancel={() => setActiveId(null)}
                    submitting={review.isPending}
                  />
                )}
              </ListRow>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={queueQuery.data?.pagination.total_pages ?? 1}
            total={queueQuery.data?.pagination.total ?? 0}
            onPageChange={(p) => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(p));
              setSearchParams(next);
            }}
          />
        </>
      )}
    </div>
  );
}
