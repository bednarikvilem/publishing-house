import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
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
import { STATUS_LABELS, statusToVariant } from "../../lib/articleStatus";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import { useToast } from "../../components/ui/toaster";
import { formatDate } from "../../lib/utils";

type Editor = { id: string; full_name: string };

/* ── Assign-editor form ───────────────────────────────────────────────────── */

interface AssignEditorFormValues {
  editorId: string;
}

function AssignEditorForm({
  editors,
  loadingEditors,
  isPending,
  onSubmit,
  onCancel,
}: {
  editors: Editor[];
  loadingEditors: boolean;
  isPending: boolean;
  onSubmit: (editorId: string) => void;
  onCancel: () => void;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignEditorFormValues>({ defaultValues: { editorId: "" } });

  return (
    <form
      onSubmit={handleSubmit(({ editorId }) => onSubmit(editorId))}
      className="border-border bg-muted/30 mt-3 flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-foreground text-2xs font-medium" htmlFor="editorId">
          Assign Editor
        </label>
        {loadingEditors ? (
          <p className="text-muted-foreground text-2xs">Loading editors…</p>
        ) : editors.length === 0 ? (
          <p className="text-muted-foreground text-2xs">
            No editors available in this newspaper.
          </p>
        ) : (
          <Controller
            name="editorId"
            control={control}
            rules={{ required: "Please select an editor." }}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={editors.map((e) => ({ value: e.id, label: e.full_name }))}
              >
                <SelectTrigger id="editorId" className="mt-0.5 w-full rounded-md">
                  <SelectValue placeholder="Select an editor…" />
                </SelectTrigger>
                <SelectContent>
                  {editors.map((editor) => (
                    <SelectItem key={editor.id} value={editor.id}>
                      {editor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
        {errors.editorId && (
          <p className="text-destructive text-2xs">{errors.editorId.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || loadingEditors || editors.length === 0}
        >
          {isPending ? "Assigning…" : "Assign"}
        </Button>
      </div>
    </form>
  );
}

/* ── Main section ─────────────────────────────────────────────────────────── */

export function EditorialQueueSection({ newspaperId }: { newspaperId: string }) {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(null);

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
      invalidateQueue();
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to assign editor. Please try again.",
        variant: "error",
      }),
  });

  const toggleSubscriber = useMutation({
    mutationFn: ({ articleId, current }: { articleId: string; current: boolean }) =>
      setArticleSubscriberOnly(newspaperId, articleId, !current),
    onSuccess: invalidateQueue,
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to update subscriber-only setting. Please try again.",
        variant: "error",
      }),
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
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "error",
      }),
  });

  function toggleActive(articleId: string) {
    setActiveId((prev) => (prev === articleId ? null : articleId));
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
                      <span className="text-muted-foreground line-clamp-2 text-2xs leading-md">
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
                        <Button
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
                          variant="ghost"
                          className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0 active:translate-y-0 ${
                            article.is_subscriber_only
                              ? "bg-foreground hover:bg-foreground/90"
                              : "bg-input hover:bg-input/90"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              article.is_subscriber_only ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </Button>
                        <span className="text-muted-foreground text-xs">Subscribers only</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant={statusToVariant(article.status)}>
                        {STATUS_LABELS[article.status]}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(article.id)}
                      >
                        {isSubmitted ? "Assign Editor" : "Review"}
                      </Button>
                    </div>
                  </div>

                  {activeId === article.id && isSubmitted && (
                    <AssignEditorForm
                      editors={editors}
                      loadingEditors={editorsQuery.isLoading}
                      isPending={assignEditor.isPending}
                      onSubmit={(editorId) =>
                        assignEditor.mutate({ articleId: article.id, editorId })
                      }
                      onCancel={() => setActiveId(null)}
                    />
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