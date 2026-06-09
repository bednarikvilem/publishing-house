import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../../lib/api";
import type { PaginatedResponse } from "../../types";
import type { QueueArticle } from "../../types/dashboard";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toaster";

export function PublicationQueue({ newspaperId }: { newspaperId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ["publication-queue", newspaperId],
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles.queue.get({
          query: { page: 1, view: "DIRECTOR", status: "APPROVED_BY_DIRECTOR", limit: 50 },
        });
      if (error) throw error;
      return data as PaginatedResponse<QueueArticle>;
    },
  });

  const publish = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId })
        .status.patch({ action: "PUBLISH" });
      if (error) throw error;
    },
    onSuccess: (_data, articleId) => {
      queryClient.invalidateQueries({ queryKey: ["publication-queue", newspaperId] });
      queryClient.invalidateQueries({ queryKey: ["article", newspaperId, articleId] });
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to publish article.", variant: "error" }),
  });

  function handlePublish(articleId: string) {
    if (!confirm("Publish this article immediately?")) return;
    publish.mutate(articleId);
  }

  const articles = queueQuery.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Publication Queue" />
      {queueQuery.isLoading ? (
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
                <Button
                  onClick={() => handlePublish(article.id)}
                  disabled={publish.isPending && publish.variables === article.id}
                  size="sm"
                >
                  {publish.isPending && publish.variables === article.id
                    ? "Publishing…"
                    : "Publish"}
                </Button>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
