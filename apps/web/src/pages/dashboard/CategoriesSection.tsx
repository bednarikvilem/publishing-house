import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import type { Category } from "../../types";
import { PencilIcon, PlusIcon, TrashIcon } from "../../components/Icons";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/toaster";

export function CategoriesSection({ newspaperId }: { newspaperId: string }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!newspaperId) return;
    await null;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/categories`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      setNewName("");
      load();
    } catch {
      toast({ title: "Error", description: "Failed to create category.", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/categories/${id}`,
        {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      setEditId(null);
      setEditName("");
      load();
    } catch {
      toast({ title: "Error", description: "Failed to update category.", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? This will fail if articles are assigned to it.")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/categories/${id}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.status === 409) {
        toast({ title: "Cannot delete", description: "Articles are assigned to this category.", variant: "error" });
        return;
      }
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete category.", variant: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle title="Categories" />

      <form
        onSubmit={handleCreate}
        className="border-border bg-card flex items-center gap-3 rounded-lg border px-5 py-4"
      >
        <Input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name…"
          className="flex-1"
        />
        <Button type="submit" disabled={saving || !newName.trim()}>
          <PlusIcon />
          Add Category
        </Button>
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
                  <Input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                  />
                ) : (
                  <span className="text-foreground flex-1 text-sm font-medium">
                    {cat.name}
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  {editId === cat.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(cat.id)}
                        disabled={saving || !editName.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditId(null); setEditName(""); }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => { setEditId(cat.id); setEditName(cat.name); }}
                        aria-label="Edit category"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(cat.id)}
                        aria-label="Delete category"
                        className="hover:text-destructive"
                      >
                        <TrashIcon />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
