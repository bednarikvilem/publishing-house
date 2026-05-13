import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { RichTextEditor } from "../components/RichTextEditor";
import { LoadingState } from "../components/LoadingState";
import { useNewspaper } from "../hooks/useNewspaper";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { STATUS_LABELS, STATUS_STYLES } from "../lib/articleStatus";
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

/* ── Editor Metadata Sidebar ────────────────────────────────────────────────── */

function EditorSidebar({
  isNew,
  canEdit,
  articleStatus,
  categories,
  categoryId,
  setCategoryId,
  keywords,
  setKeywords,
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
  categoryId: string;
  setCategoryId: (id: string) => void;
  keywords: string;
  setKeywords: (k: string) => void;
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
          <h2 className="text-foreground text-[13px] font-semibold">Status</h2>
          <span
            className={`self-start rounded-full px-3 py-1 text-[12px] font-semibold ${STATUS_STYLES[articleStatus]}`}
          >
            {STATUS_LABELS[articleStatus]}
          </span>
          {!isDraft && (
            <p className="text-muted-foreground text-[12px]">
              This article cannot be edited in its current state.
            </p>
          )}
        </div>
      )}

      {/* Category & Keywords */}
      <div className="border-border bg-card flex flex-col gap-4 rounded-lg border px-4 py-4">
        <h2 className="text-foreground text-[13px] font-semibold">Details</h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-muted-foreground text-[12px] font-medium">
            Category <span className="text-[#dc2626]">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!canEdit}
            className="border-border bg-background text-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:opacity-60"
          >
            <option value="">Select category…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-muted-foreground text-[12px] font-medium">
            Keywords
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="comma, separated, keywords"
            disabled={!canEdit}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-[13px] outline-none focus:ring-2 disabled:opacity-60"
          />
          <p className="text-muted-foreground/70 text-[11px]">
            Separate keywords with commas
          </p>
        </div>
      </div>

      {/* Cover Image */}
      <div className="border-border bg-card flex flex-col gap-3 rounded-lg border px-4 py-4">
        <div>
          <h2 className="text-foreground text-[13px] font-semibold">Cover Image</h2>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
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
                <button
                  type="button"
                  onClick={() => onImageDelete(coverImage.id!)}
                  className="text-muted-foreground text-[11px] font-medium transition-colors hover:text-[#dc2626]"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-[12px]">
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="border-border text-foreground hover:bg-muted w-full rounded-md border px-3 py-2 text-[12px] font-medium transition-colors disabled:opacity-50"
            >
              {uploadingImage ? "Uploading…" : coverImage ? "Replace Cover Image" : "Upload Cover Image"}
            </button>
          </>
        )}
      </div>

      {/* Danger zone */}
      {!isNew && isDraft && (
        <div className="border-border bg-card rounded-lg border px-4 py-4">
          <h2 className="text-foreground mb-3 text-[13px] font-semibold">Danger Zone</h2>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="w-full rounded-md border border-[#dc2626]/30 px-3 py-2 text-[12px] font-medium text-[#dc2626] transition-colors hover:bg-[#dc262608] disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete Article"}
          </button>
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

  /* ── Form state ──────────────────────────────────────────────────────────── */
  const [title, setTitle] = useState("");
  const [perex, setPerex] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [keywords, setKeywords] = useState("");
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>("DRAFT");
  const [images, setImages] = useState<ArticleImage[]>([]);

  /* ── UI state ────────────────────────────────────────────────────────────── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [authorProfileComplete, setAuthorProfileComplete] = useState(true);
  const [editorKey, setEditorKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .then((data: { bio?: string | null; profile_picture?: string | null; roles?: string[] } | null) => {
        if (data?.roles?.includes("AUTHOR")) {
          setAuthorProfileComplete(!!(data.bio && data.profile_picture));
        }
      })
      .catch(() => {});
  }, []);

  /* ── Load existing article ──────────────────────────────────────────────── */
  useEffect(() => {
    if (isNew || !articleId || !newspaperId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        setTitle(data.title ?? "");
        setPerex(data.perex ?? "");
        setContent(data.content ?? "");
        setCategoryId(data.category_id ?? "");
        setKeywords(Array.isArray(data.keywords) ? data.keywords.join(", ") : "");
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
  }, [isNew, articleId, newspaperId]);

  /* ── Save as draft ──────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!title.trim()) { setFormError("Title is required."); return; }
    if (!perex.trim()) { setFormError("Perex is required."); return; }
    if (!categoryId)   { setFormError("Category is required."); return; }
    setFormError(null);
    setSaving(true);

    const keywordsArray = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const body = {
      title: title.trim(),
      perex: perex.trim(),
      content,
      category_id: categoryId,
      keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
    };

    try {
      const res = await fetch(
        isNew
          ? `${API_BASE_URL}/api/newspapers/${newspaperId}/articles`
          : `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
        setFormError(data.fields ? Object.values(data.fields).join(" ") : (data.error ?? "Failed to save article."));
        return;
      }
      const saved = (await res.json()) as { id: string };
      if (isNew) navigate(`/${np}/articles/${saved.id}/edit`, { replace: true });
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Submit for review ──────────────────────────────────────────────────── */
  async function handleSubmit() {
    if (isNew) { setFormError("Save the article first before submitting."); return; }
    if (!authorProfileComplete) {
      setFormError("Complete your author profile (bio and profile picture) before submitting for review.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/submit`,
        { method: "POST", headers: authHeaders() }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(
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
      setFormError("Network error. Please try again.");
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
      setFormError("Failed to delete article. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  /* ── Cover image upload / delete ────────────────────────────────────────── */
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !articleId || isNew) return;
    setUploadingImage(true);
    setFormError(null);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/images`,
        { method: "POST", headers: authHeaders(), body: formData }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error ?? "Failed to upload image.");
        return;
      }
      const img = (await res.json()) as { id: string; url: string; caption: string | null; is_primary: boolean };
      setImages((prev) => [...prev, img]);
    } catch {
      setFormError("Network error. Please try again.");
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
      if (res.status === 422) { setFormError("Cannot remove the only image from the article."); return; }
      if (!res.ok) throw new Error();
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setFormError("Failed to delete image. Please try again.");
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
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[13px] font-medium transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="border-border text-foreground hover:bg-muted rounded-md border px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Draft"}
              </button>
            )}
            {!isNew && isDraft && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-foreground text-background rounded-md px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </button>
            )}
          </div>
        </div>

        {/* Loading / load error */}
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc262608] px-5 py-4">
            <p className="text-[14px] text-[#dc2626]">{loadError}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left: main editor area */}
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-[13px] font-semibold">
                  Title <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title…"
                  disabled={!canEdit}
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-4 py-2.5 text-[15px] font-semibold outline-none focus:ring-2 disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-[13px] font-semibold">
                  Perex <span className="text-[#dc2626]">*</span>
                </label>
                <textarea
                  value={perex}
                  onChange={(e) => setPerex(e.target.value)}
                  placeholder="Short introduction shown in article listings…"
                  disabled={!canEdit}
                  rows={3}
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-lg border px-4 py-3 text-[14px] leading-relaxed outline-none focus:ring-2 disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-foreground text-[13px] font-semibold">
                  Content <span className="text-[#dc2626]">*</span>
                </label>
                <RichTextEditor
                  key={editorKey}
                  initialContent={content}
                  onContentChange={canEdit ? setContent : () => {}}
                  newspaperId={newspaperId || undefined}
                  articleId={isNew ? undefined : articleId}
                  hasCoverImage={images.some((img) => img.is_primary)}
                  onUploadError={setFormError}
                />
              </div>
            </div>

            {/* Right: metadata sidebar */}
            <EditorSidebar
              isNew={isNew}
              canEdit={canEdit}
              articleStatus={articleStatus}
              categories={categories}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              keywords={keywords}
              setKeywords={setKeywords}
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
          <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc262608] px-4 py-3">
            <p className="text-[13px] text-[#dc2626]">{formError}</p>
          </div>
        )}
      </main>
    </div>
  );
}
