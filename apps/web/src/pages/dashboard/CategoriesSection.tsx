import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, toApiError } from "../../lib/api";
import type { Category } from "../../types";
import { PencilIcon, PlusIcon, TrashIcon } from "../../components/Icons";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface CategoryFormValues {
  name: string;
}

// ── Inline edit form ──────────────────────────────────────────────────────────

function EditCategoryForm({
  newspaperId,
  category,
  onSaved,
  onCancel,
}: {
  newspaperId: string;
  category: Category;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
  } = useForm<CategoryFormValues>({
    defaultValues: { name: category.name },
  });

  const update = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .categories({ category_id: category.id })
        .put({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: onSaved,
    onError: () => setError("root", { message: "Failed to update category." }),
  });

  return (
    <form
      onSubmit={handleSubmit((data) => update.mutate(data.name))}
      className="flex items-center gap-4 w-full"
    >
      <Input
        autoFocus
        type="text"
        className="flex-1 rounded-md text-[13px]"
        {...register("name", { required: true })}
      />
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="submit"
          disabled={update.isPending}
          size="sm"
          className="bg-foreground text-background rounded-md font-semibold hover:bg-foreground hover:opacity-90"
        >
          {update.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function CategoriesSection({ newspaperId }: { newspaperId: string }) {
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm<CategoryFormValues>({ defaultValues: { name: "" } });

  const categoriesQuery = useQuery({
    queryKey: ["categories", newspaperId],
    enabled: !!newspaperId,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .categories.get();
      if (error) throw error;
      return (data as { data: Category[] }).data;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["categories", newspaperId] });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .categories.post({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      reset();
      invalidate();
    },
    onError: () => setFormError("root", { message: "Failed to create category." }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .categories({ category_id: id })
        .delete();
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => {
      const { status } = toApiError(err);
      alert(
        status === 409
          ? "Cannot delete: articles are assigned to this category."
          : "Failed to delete category.",
      );
    },
  });

  function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this category? This will fail if articles are assigned to it.",
      )
    )
      return;
    deleteCategory.mutate(id);
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle title="Categories" />

      {/* Create form */}
      <form
        onSubmit={handleSubmit((data) => createCategory.mutate(data.name))}
        className="border-border bg-card flex items-center gap-3 rounded-lg border px-5 py-4"
      >
        <Input
          type="text"
          placeholder="New category name…"
          className="flex-1 rounded-md text-[13px]"
          {...register("name", { required: true })}
        />
        <Button
          type="submit"
          disabled={createCategory.isPending}
          className="bg-foreground text-background rounded-md gap-2 text-[13px] font-semibold hover:bg-foreground hover:opacity-90"
        >
          <PlusIcon />
          Add Category
        </Button>
        {errors.root && (
          <span className="text-destructive text-[12px]">{errors.root.message}</span>
        )}
      </form>

      {categoriesQuery.isError ? (
        <ErrorState />
      ) : categoriesQuery.isLoading ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <EmptyState message="No categories yet. Add one above." />
      ) : (
        <div className="flex flex-col">
          {categories.map((cat, index) => (
            <ListRow
              key={cat.id}
              first={index === 0}
              last={index === categories.length - 1}
            >
              <div className="flex items-center gap-4">
                {editId === cat.id ? (
                  <EditCategoryForm
                    newspaperId={newspaperId}
                    category={cat}
                    onSaved={() => {
                      setEditId(null);
                      invalidate();
                    }}
                    onCancel={() => setEditId(null)}
                  />
                ) : (
                  <>
                    <span className="text-foreground flex-1 text-[14px] font-medium">
                      {cat.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        onClick={() => setEditId(cat.id)}
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Edit category"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        onClick={() => handleDelete(cat.id)}
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete category"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
