import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import type { Category } from "../../types";
import { PencilIcon, PlusIcon, TrashIcon } from "../../components/Icons";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";

interface CategoryFormValues {
  name: string;
}

// ── Inline edit form ──────────────────────────────────────────────────────────

function EditCategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category: Category;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    setError,
  } = useForm<CategoryFormValues>({
    defaultValues: { name: category.name },
  });

  async function onSubmit(data: CategoryFormValues) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${(category as any).newspaperId}/categories/${category.id}`,
        {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.name.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      onSaved();
    } catch {
      setError("root", { message: "Failed to update category." });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-4 w-full">
      <input
        autoFocus
        type="text"
        className="border-border bg-background text-foreground focus:ring-ring flex-1 rounded-md border px-3 py-1.5 text-[13px] outline-none focus:ring-2"
        {...register("name", { required: true })}
      />
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-foreground text-background rounded-md px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[12px] font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function CategoriesSection({ newspaperId }: { newspaperId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { isSubmitting, errors },
  } = useForm<CategoryFormValues>({ defaultValues: { name: "" } });

  const load = useCallback(async () => {
    if (!newspaperId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/categories`
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: Category[] };
      setCategories(data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [newspaperId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreateSubmit(data: CategoryFormValues) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/categories`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.name.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      reset();
      load();
    } catch {
      setFormError("root", { message: "Failed to create category." });
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Delete this category? This will fail if articles are assigned to it."
      )
    )
      return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/categories/${id}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.status === 409) {
        alert("Cannot delete: articles are assigned to this category.");
        return;
      }
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert("Failed to delete category.");
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle title="Categories" />

      {/* Create form */}
      <form
        onSubmit={handleSubmit(onCreateSubmit)}
        className="border-border bg-card flex items-center gap-3 rounded-lg border px-5 py-4"
      >
        <input
          type="text"
          placeholder="New category name…"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring flex-1 rounded-md border px-3 py-2 text-[13px] outline-none focus:ring-2"
          {...register("name", { required: true })}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-foreground text-background flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <PlusIcon />
          Add Category
        </button>
        {errors.root && (
          <span className="text-destructive text-[12px]">{errors.root.message}</span>
        )}
      </form>

      {error ? (
        <ErrorState />
      ) : loading ? (
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
                    category={{ ...cat, ...(cat as any) }}
                    onSaved={() => {
                      setEditId(null);
                      load();
                    }}
                    onCancel={() => setEditId(null)}
                  />
                ) : (
                  <>
                    <span className="text-foreground flex-1 text-[14px] font-medium">
                      {cat.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => setEditId(cat.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Edit category"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-muted-foreground transition-colors hover:text-[#dc2626]"
                        aria-label="Delete category"
                      >
                        <TrashIcon />
                      </button>
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