import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { Navbar } from "../components/Navbar";
import { RichTextEditor } from "../components/RichTextEditor";
import { LoadingState } from "../components/LoadingState";
import { EditorSidebar } from "../components/EditorSidebar";
import { useNewspaper } from "../hooks/useNewspaper";
import { useArticleEditor } from "../hooks/useArticleEditor";
import { useImageUpload } from "../hooks/useImageUpload";
import type { ArticleFormValues } from "../hooks/useArticleEditor";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

export function ArticleEditorPage() {
  const { newspaperName, articleId } = useParams<{
    newspaperName: string;
    articleId?: string;
  }>();
  const { newspaper } = useNewspaper();

  const isNew = !articleId || articleId === "new";
  const np = newspaperName ?? "";
  const newspaperId = newspaper?.id ?? "";

  const [editorKey, setEditorKey] = useState(0);

  /* ── React Hook Form ────────────────────────────────────────────────── */
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

  /* ── Image upload hook ──────────────────────────────────────────────── */
  const { images, setImages, uploadingImage, fileInputRef, handleImageUpload, handleImageDelete } =
    useImageUpload(isNew ? undefined : articleId, newspaperId);

  /* ── Article editor hook ────────────────────────────────────────────── */
  const {
    categories,
    articleStatus,
    loading,
    loadError,
    handleSave,
    handleSubmitForReview,
    handleDelete,
    saving,
    submitting,
    deleting,
    serverError,
    setServerError,
  } = useArticleEditor(
    articleId,
    newspaperId,
    np,
    setValue,
    setError,
    setImages,
    () => setEditorKey((k) => k + 1),
  );

  const isDraft = articleStatus === "DRAFT";
  const canEdit = isNew || isDraft;

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className={`bg-background text-foreground flex min-h-screen flex-col${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
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
                onClick={rhfHandleSubmit(handleSave)}
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
              onImageUpload={(e) => handleImageUpload(e, setServerError)}
              onImageDelete={(id) => handleImageDelete(id, setServerError)}
              deleting={deleting}
              onDelete={handleDelete}
            />
          </div>
        )}

        {/* Form error */}
        {serverError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <p className="text-2xs text-destructive">{serverError}</p>
          </div>
        )}
      </main>
    </div>
  );
}
