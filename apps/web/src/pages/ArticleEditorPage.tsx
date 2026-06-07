import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import type { Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Navbar } from "../components/Navbar";
import { RichTextEditor } from "../components/RichTextEditor";
import { LoadingState } from "../components/LoadingState";
import { useNewspaper } from "../hooks/useNewspaper";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { STATUS_LABELS, statusToVariant } from "../lib/articleStatus";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import type { Category, ArticleStatus } from "../types";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface ArticleImage {
  id?: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
}

interface LoadedArticle {
  id: string;
  title: string;
  perex: string;
  content: string;
  keywords: string[] | null;
  category_id: string | null;
  status: ArticleStatus;
  images: ArticleImage[];
}

interface ArticleFormValues {
  title: string;
  perex: string;
  content: string;
  categoryId: string;
  keywords: string;
}

/* ── Editor Metadata Sidebar ────────────────────────────────────────────────── */

function EditorSidebar({
  isNew,
  canEdit,
  articleStatus,
  categories,
  control,
  register,
  errors,
  images,
  uploadingImage,
  fileInputRef,
  onImageUpload,
  onImageDelete,
  deleting,
  onDelete,
}: {
  isNew: boolean;
  canEdit: boolean;
  articleStatus: ArticleStatus;
  categories: Category[];
  control: Control<ArticleFormValues>;
  register: UseFormRegister<ArticleFormValues>;
  errors: FieldErrors<ArticleFormValues>;
  images: ArticleImage[];
  uploadingImage: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageDelete: (id: string) => void;
  deleting: boolean;
  onDelete: () => void;
}) {
  const isDraft = articleStatus === "DRAFT";
  const coverImage = images.find((img) => img.is_primary);

  return (
    <div className="flex w-full flex-col gap-5 lg:w-72 lg:shrink-0">
      {/* Status */}
      {!isNew && (
        <div className="border-border bg-card flex flex-col gap-3 rounded-lg border px-4 py-4">
          <h2 className="text-foreground text-2xs font-semibold">Status</h2>
          <Badge variant={statusToVariant(articleStatus)} className="self-start">
            {STATUS_LABELS[articleStatus]}
          </Badge>
          {!isDraft && (
            <p className="text-muted-foreground text-xs">
              This article cannot be edited in its current state.
            </p>
          )}
        </div>
      )}

      {/* Category & Keywords */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-lg border px-4 py-4">
        <h2 className="text-foreground text-2xs font-semibold">Details</h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-muted-foreground text-xs font-medium" htmlFor="categoryId">
            Category <span className="text-destructive">*</span>
          </label>
          <Controller
            name="categoryId"
            control={control}
            rules={{ required: "Category is required." }}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => v !== null && field.onChange(v)}
              >
                <SelectTrigger id="categoryId" className="w-full" disabled={!canEdit}>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && (
            <p className="text-destructive text-2xs">{errors.categoryId.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-muted-foreground text-xs font-medium" htmlFor="keywords">
            Keywords
          </label>
          <Input
            id="keywords"
            type="text"
            placeholder="comma, separated, keywords"
            disabled={!canEdit}
            {...register("keywords")}
          />
          <p className="text-muted-foreground/70 text-3xs">
            Separate keywords with commas
          </p>
        </div>
      </div>

      {/* Cover Image */}
      <div className="border-border bg-card flex flex-col gap-3 rounded-lg border px-4 py-4">
        <div>
          <h2 className="text-foreground text-2xs font-semibold">Cover Image</h2>
          <p className="text-muted-foreground mt-0.5 text-3xs">
            Displayed in article previews and on the homepage.
          </p>
        </div>

        {coverImage ? (
          <div className="border-border relative overflow-hidden rounded-md border">
            <img
              src={coverImage.url}
              alt={coverImage.caption ?? "Cover image"}
              className="h-36 w-full object-cover"
            />
            {coverImage.id && canEdit && (
              <div className="bg-background/80 absolute inset-x-0 bottom-0 flex justify-end px-2 py-1 backdrop-blur-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => onImageDelete(coverImage.id!)}
                  className="hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            {isNew
              ? "Save the article first, then upload a cover image."
              : "No cover image yet. Required before submitting."}
          </p>
        )}

        {!isNew && canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={onImageUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage
                ? "Uploading…"
                : coverImage
                  ? "Replace Cover Image"
                  : "Upload Cover Image"}
            </Button>
          </>
        )}
      </div>

      {/* Danger zone */}
      {!isNew && isDraft && (
        <div className="border-border bg-card rounded-lg border px-4 py-4">
          <h2 className="text-foreground mb-3 text-2xs font-semibold">Danger Zone</h2>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete Article"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */

export function ArticleEditorPage() {
  const { newspaperName, articleId } = useParams<{
    newspaperName: string;
    articleId?: string;
  }>();
  const navigate = useNavigate();
  const { newspaper } = useNewspaper();

  const isNew = !articleId || articleId === "new";
  const np = newspaperName ?? "";
  const newspaperId = newspaper?.id ?? "";

  /* ── Non-form state ─────────────────────────────────────────────────────── */
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>("DRAFT");
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [authorProfileComplete, setAuthorProfileComplete] = useState(true);
  const [editorKey, setEditorKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── React Hook Form ────────────────────────────────────────────────────── */
  const {
    register,
    control,
    handleSubmit: rhfHandleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    defaultValues: { title: "", perex: "", content: "", categoryId: "", keywords: "" },
  });

  /* ── Load categories ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!newspaperId) return;
    fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}/categories`)
      .then((res) => res.json() as Promise<{ data: Category[] }>)
      .then((data) => setCategories(data.data ?? []))
      .catch(() => {});
  }, [newspaperId]);

  /* ── Check author profile completeness ─────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            bio?: string | null;
            profile_picture?: string | null;
            roles?: string[];
          } | null
        ) => {
          if (data?.roles?.includes("AUTHOR")) {
            setAuthorProfileComplete(!!(data.bio && data.profile_picture));
          }
        }
      )
      .catch(() => {});
  }, []);

  /* ── Load existing article ──────────────────────────────────────────────── */
  useEffect(() => {
    if (isNew || !articleId || !newspaperId) return;
    setLoading(true);
    setLoadError(null);
    fetch(
      `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/mine/${articleId}`,
      { headers: authHeaders() }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<LoadedArticle>;
      })
      .then((data) => {
        setValue("title", data.title ?? "");
        setValue("perex", data.perex ?? "");
        setValue("content", data.content ?? "");
        setValue("categoryId", data.category_id ?? "");
        setValue("keywords", Array.isArray(data.keywords) ? data.keywords.join(", ") : "");
        setArticleStatus(data.status ?? "DRAFT");
        setImages(data.images ?? []);
        setEditorKey((k) => k + 1);
      })
      .catch((err: Error) => {
        const code = err.message;
        setLoadError(
          code === "404"
            ? "Article not found."
            : code === "403"
              ? "You don't have permission to edit this article."
              : "Failed to load article. Please try again."
        );
      })
      .finally(() => setLoading(false));
  }, [isNew, articleId, newspaperId, setValue]);

  /* ── Save as draft ──────────────────────────────────────────────────────── */
  const handleSave = rhfHandleSubmit(async (values) => {
    setServerError(null);
    setSaving(true);

    const keywordsArray = values.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const res = await fetch(
        isNew
          ? `${API_BASE_URL}/api/newspapers/${newspaperId}/articles`
          : `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title.trim(),
            perex: values.perex.trim(),
            content: values.content,
            category_id: values.categoryId,
            keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
          }),
        }
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          fields?: Record<string, string>;
        };
        if (data.fields) {
          const fieldMap: Partial<Record<string, keyof ArticleFormValues>> = {
            title: "title",
            perex: "perex",
            content: "content",
            category_id: "categoryId",
            keywords: "keywords",
          };
          Object.entries(data.fields).forEach(([key, message]) => {
            const field = fieldMap[key];
            if (field) setError(field, { type: "server", message });
            else setServerError(message);
          });
        } else {
          setServerError(data.error ?? "Failed to save article.");
        }
        return;
      }

      const saved = (await res.json()) as { id: string };
      if (isNew) navigate(`/${np}/articles/${saved.id}/edit`, { replace: true });
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  });

  /* ── Submit for review ──────────────────────────────────────────────────── */
  async function handleSubmitForReview() {
    if (isNew) {
      setServerError("Save the article first before submitting.");
      return;
    }
    if (!authorProfileComplete) {
      setServerError(
        "Complete your author profile (bio and profile picture) before submitting for review."
      );
      return;
    }
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/submit`,
        { method: "POST", headers: authHeaders() }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(
          data.error === "ARTICLE_MISSING_IMAGE"
            ? "Upload at least one image before submitting."
            : data.error === "AUTHOR_PROFILE_INCOMPLETE"
              ? "Complete your author profile (bio and profile picture) before submitting for review."
              : (data.error ?? "Failed to submit article.")
        );
        return;
      }
      setArticleStatus("SUBMITTED");
      navigate(`/${np}/author-dashboard?section=my-articles`);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Delete article ─────────────────────────────────────────────────────── */
  async function handleDelete() {
    if (isNew) return;
    if (!confirm("Permanently delete this article? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      navigate(`/${np}/author-dashboard?section=my-articles`);
    } catch {
      setServerError("Failed to delete article. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  /* ── Cover image upload / delete ────────────────────────────────────────── */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !articleId || isNew) return;
    setUploadingImage(true);
    setServerError(null);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/images`,
        { method: "POST", headers: authHeaders(), body: formData }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(data.error ?? "Failed to upload image.");
        return;
      }
      const img = (await res.json()) as {
        id: string;
        url: string;
        caption: string | null;
        is_primary: boolean;
      };
      setImages((prev) => [...prev, img]);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleImageDelete(imageId: string) {
    if (!articleId || isNew) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/images/${imageId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.status === 422) {
        setServerError("Cannot remove the only image from the article.");
        return;
      }
      if (!res.ok) throw new Error();
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setServerError("Failed to delete image. Please try again.");
    }
  }

  const isDraft = articleStatus === "DRAFT";
  const canEdit = isNew || isDraft;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Navbar newspaperName={np} />

      <main className="flex flex-1 flex-col gap-6 px-8 py-6 md:px-12">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to={`/${np}/author-dashboard?section=my-articles`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-2xs font-medium transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Draft"}
              </Button>
            )}
            {!isNew && isDraft && (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitForReview}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </Button>
            )}
          </div>
        </div>

        {/* Loading / load error */}
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-5 py-4">
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left: main editor area */}
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-2xs font-semibold" htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Article title…"
                  disabled={!canEdit}
                  className="bg-card rounded-lg px-4 py-2.5 text-xs-plus font-semibold"
                  {...register("title", { required: "Title is required." })}
                />
                {errors.title && (
                  <p className="text-destructive text-2xs">{errors.title.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-2xs font-semibold" htmlFor="perex">
                  Perex <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="perex"
                  placeholder="Short introduction shown in article listings…"
                  disabled={!canEdit}
                  rows={3}
                  className="bg-card rounded-lg px-4 py-3 text-sm leading-relaxed"
                  {...register("perex", { required: "Perex is required." })}
                />
                {errors.perex && (
                  <p className="text-destructive text-2xs">{errors.perex.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-2xs font-semibold">
                  Content <span className="text-destructive">*</span>
                </label>
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      key={editorKey}
                      initialContent={field.value}
                      onContentChange={canEdit ? field.onChange : () => {}}
                      newspaperId={newspaperId || undefined}
                      articleId={isNew ? undefined : articleId}
                      hasCoverImage={images.some((img) => img.is_primary)}
                      onUploadError={setServerError}
                    />
                  )}
                />
              </div>
            </div>

            {/* Right: metadata sidebar */}
            <EditorSidebar
              isNew={isNew}
              canEdit={canEdit}
              articleStatus={articleStatus}
              categories={categories}
              control={control}
              register={register}
              errors={errors}
              images={images}
              uploadingImage={uploadingImage}
              fileInputRef={fileInputRef}
              onImageUpload={handleImageUpload}
              onImageDelete={handleImageDelete}
              deleting={deleting}
              onDelete={handleDelete}
            />
          </div>
        )}

        {/* Form error */}
        {formError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-2xs text-destructive">{formError}</p>
          </div>
        )}
      </main>
    </div>
  );
}
