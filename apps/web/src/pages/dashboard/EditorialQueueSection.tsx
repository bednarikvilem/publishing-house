import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useEditorialQueue } from "../../hooks/useEditorialQueue";
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
import { formatDate } from "../../lib/utils";

type Editor = { id: string; full_name: string };

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

export function EditorialQueueSection({ newspaperId }: { newspaperId: string }) {
  const {
    articles,
    totalPages,
    total,
    currentPage,
    isLoading,
    isError,
    editors,
    loadingEditors,
    activeId,
    toggleActive,
    setPage,
    assignEditor,
    toggleSubscriber,
    approve,
  } = useEditorialQueue(newspaperId);

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle title="Editorial Queue" />

      {isError ? (
        <ErrorState />
      ) : isLoading ? (
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
                      loadingEditors={loadingEditors}
                      isPending={assignEditor.isPending}
                      onSubmit={(editorId) =>
                        assignEditor.mutate({ articleId: article.id, editorId })
                      }
                      onCancel={() => toggleActive(article.id)}
                    />
                  )}

                  {activeId === article.id && !isSubmitted && (
                    <DecisionForm
                      onSubmit={(d, n) =>
                        approve.mutate({ articleId: article.id, decision: d, note: n })
                      }
                      onCancel={() => toggleActive(article.id)}
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
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
