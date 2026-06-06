import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, setArticleSubscriberOnly } from "../../lib/api";
import type { PaginatedResponse, ReviewDecision } from "../../types";
import type { QueueArticle } from "../../types/dashboard";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { Pagination } from "../../components/Pagination";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { DecisionForm } from "../../components/DecisionForm";
import { STATUS_LABELS, STATUS_STYLES } from "../../lib/articleStatus";
import { formatDate } from "../../lib/utils";

type Editor = { id: string; full_name: string };

export function EditorialQueueSection({ newspaperId }: { newspaperId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignEditorId, setAssignEditorId] = useState("");

  const queueQuery = useQuery({
    queryKey: ["editorial-queue", newspaperId, currentPage],
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles.queue.get({
          query: { page: currentPage, limit: 20, view: "NEWSPAPER_MANAGER" },
        });
      if (error) throw error;
      return data as PaginatedResponse<QueueArticle>;
    },
  });

  const articles = queueQuery.data?.data ?? [];
  const totalPages = queueQuery.data?.pagination.total_pages ?? 1;
  const total = queueQuery.data?.pagination.total ?? 0;

  const editorsQuery = useQuery({
    queryKey: ["editors", newspaperId],
    enabled: activeId !== null,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .editors.get();
      if (error) throw error;
      return (data as { data: Editor[] }).data;
    },
  });
  const editors = editorsQuery.data ?? [];

  const invalidateQueue = () =>
    queryClient.invalidateQueries({ queryKey: ["editorial-queue", newspaperId] });

  const assignEditor = useMutation({
    mutationFn: async ({ articleId, editorId }: { articleId: string; editorId: string }) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId })["assign-editor"]
        .post({ editor_id: editorId });
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveId(null);
      setAssignEditorId("");
      invalidateQueue();
    },
    onError: () => alert("Failed to assign editor. Please try again."),
  });

  const toggleSubscriber = useMutation({
    mutationFn: ({ articleId, current }: { articleId: string; current: boolean }) =>
      setArticleSubscriberOnly(newspaperId, articleId, !current),
    onSuccess: invalidateQueue,
    onError: () => alert("Failed to update subscriber-only setting. Please try again."),
  });

  const approve = useMutation({
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
        .approve.post(
          { decision, note: note || undefined },
          { query: { view: "NEWSPAPER_MANAGER" } }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveId(null);
      invalidateQueue();
    },
    onError: () => alert("Failed to submit review. Please try again."),
  });

  function toggleActive(articleId: string) {
    setActiveId((prev) => (prev === articleId ? null : articleId));
    setAssignEditorId("");
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle title="Editorial Queue" />

      {queueQuery.isError ? (
        <ErrorState />
      ) : queueQuery.isLoading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles awaiting editorial action." />
      ) : (
        <>
          <div className="flex flex-col">
            {articles.map((article, index) => {
              const isSubmitted = article.status === "SUBMITTED";
              return (
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
                      <span className="text-muted-foreground line-clamp-2 text-2xs leading-[1.4]">
                        {article.perex}
                      </span>
                      <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                        <span>Author: {article.author.full_name}</span>
                        <span>Category: {article.category}</span>
                        {article.assigned_editor && (
                          <span>Editor: {article.assigned_editor.full_name}</span>
                        )}
                        <span>Submitted: {formatDate(article.submitted_at)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          role="switch"
                          aria-checked={!!article.is_subscriber_only}
                          disabled={
                            toggleSubscriber.isPending &&
                            toggleSubscriber.variables?.articleId === article.id
                          }
                          onClick={() =>
                            toggleSubscriber.mutate({
                              articleId: article.id,
                              current: !!article.is_subscriber_only,
                            })
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                            article.is_subscriber_only ? "bg-foreground" : "bg-input"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              article.is_subscriber_only ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-muted-foreground text-xs">Subscribers only</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[article.status]}`}
                      >
                        {STATUS_LABELS[article.status]}
                      </span>
                      <button
                        onClick={() => toggleActive(article.id)}
                        className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        {isSubmitted ? "Assign Editor" : "Review"}
                      </button>
                    </div>
                  </div>

                  {activeId === article.id && isSubmitted && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!assignEditorId.trim()) return;
                        assignEditor.mutate({
                          articleId: article.id,
                          editorId: assignEditorId.trim(),
                        });
                      }}
                      className="border-border bg-muted/30 mt-3 flex flex-col gap-3 rounded-lg border p-4"
                    >
                      <label className="text-foreground text-2xs font-medium">
                        Assign Editor
                        {editorsQuery.isLoading ? (
                          <p className="text-muted-foreground mt-1.5 text-2xs">Loading editors…</p>
                        ) : editors.length === 0 ? (
                          <p className="text-muted-foreground mt-1.5 text-2xs">
                            No editors available in this newspaper.
                          </p>
                        ) : (
                          <select
                            value={assignEditorId}
                            onChange={(e) => setAssignEditorId(e.target.value)}
                            required
                            className="border-border bg-background text-foreground focus:ring-ring mt-1.5 w-full rounded-md border px-3 py-2 text-2xs outline-none focus:ring-2"
                          >
                            <option value="">Select an editor…</option>
                            {editors.map((editor) => (
                              <option key={editor.id} value={editor.id}>
                                {editor.full_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveId(null)}
                          className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-2xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={
                            assignEditor.isPending ||
                            !assignEditorId.trim() ||
                            editors.length === 0
                          }
                          className="bg-foreground text-background rounded-md px-3 py-1.5 text-2xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {assignEditor.isPending ? "Assigning…" : "Assign"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeId === article.id && !isSubmitted && (
                    <DecisionForm
                      onSubmit={(d, n) =>
                        approve.mutate({ articleId: article.id, decision: d, note: n })
                      }
                      onCancel={() => setActiveId(null)}
                      submitting={approve.isPending}
                    />
                  )}
                </ListRow>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
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
