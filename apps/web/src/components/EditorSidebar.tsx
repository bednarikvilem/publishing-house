import type { Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { STATUS_LABELS, statusToVariant } from "../lib/articleStatus";
import type { Category, ArticleStatus } from "../types";

interface ArticleImage {
  id?: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
}

interface ArticleFormValues {
  title: string;
  perex: string;
  content: string;
  categoryId: string;
  keywords: string;
}

export function EditorSidebar({
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
          <Label className="text-muted-foreground text-xs font-medium" htmlFor="categoryId">
            Category <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="categoryId"
            control={control}
            rules={{ required: "Category is required." }}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => v !== null && field.onChange(v)}
                items={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
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
          <Label className="text-muted-foreground text-xs font-medium" htmlFor="keywords">
            Keywords
          </Label>
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
