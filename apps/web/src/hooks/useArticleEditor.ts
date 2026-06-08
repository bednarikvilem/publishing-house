import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { UseFormSetValue, UseFormSetError } from "react-hook-form";
import { client, toApiError } from "../lib/api";
import { useAuthorProfile } from "./useAuthorProfile";
import type { Category, ArticleStatus } from "../types";
import type { ArticleImage } from "./useImageUpload";

export interface ArticleFormValues {
  title: string;
  perex: string;
  content: string;
  categoryId: string;
  keywords: string;
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

export function useArticleEditor(
  articleId: string | undefined,
  newspaperId: string,
  newspaperName: string,
  setValue: UseFormSetValue<ArticleFormValues>,
  setError: UseFormSetError<ArticleFormValues>,
  setImages: (images: ArticleImage[]) => void,
  bumpEditorKey: () => void,
) {
  const navigate = useNavigate();
  const isNew = !articleId || articleId === "new";

  const [articleStatus, setArticleStatus] = useState<ArticleStatus>("DRAFT");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { isProfileComplete } = useAuthorProfile();

  /* ── Categories ─────────────────────────────────────────────────────── */
  const { data: categories = [] } = useQuery({
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

  /* ── Load existing article ──────────────────────────────────────────── */
  const {
    data: loadedArticle,
    isLoading: loading,
    isError: loadFailed,
    error: loadErrorRaw,
  } = useQuery({
    queryKey: ["article-edit", newspaperId, articleId],
    enabled: !isNew && !!articleId && !!newspaperId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles.mine({ article_id: articleId! })
        .get();
      if (error) throw error;
      return data as LoadedArticle;
    },
  });

  useEffect(() => {
    if (!loadedArticle) return;
    setValue("title", loadedArticle.title ?? "");
    setValue("perex", loadedArticle.perex ?? "");
    setValue("content", loadedArticle.content ?? "");
    setValue("categoryId", loadedArticle.category_id ?? "");
    setValue(
      "keywords",
      Array.isArray(loadedArticle.keywords)
        ? loadedArticle.keywords.join(", ")
        : "",
    );
    setArticleStatus(loadedArticle.status ?? "DRAFT");
    setImages(loadedArticle.images ?? []);
    bumpEditorKey();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedArticle]);

  const loadError = loadFailed
    ? (() => {
        const code = (loadErrorRaw as Error)?.message;
        if (code === "404") return "Article not found.";
        if (code === "403") return "You don't have permission to edit this article.";
        return "Failed to load article. Please try again.";
      })()
    : null;

  /* ── Save as draft ──────────────────────────────────────────────────── */
  async function handleSave(values: ArticleFormValues) {
    setServerError(null);
    setSaving(true);
    const keywordsArray = values.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const body = {
      title: values.title.trim(),
      perex: values.perex.trim(),
      content: values.content,
      category_id: values.categoryId,
      keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
    };
    try {
      const newspaperApi = client.api.newspapers({ newspaper_id: newspaperId });
      const { data: saved, error } = isNew
        ? await newspaperApi.articles.post(body)
        : await newspaperApi.articles({ article_id: articleId! }).patch(body);
      if (error) {
        const { value } = toApiError(error);
        if (value?.fields) {
          const fieldMap: Partial<Record<string, keyof ArticleFormValues>> = {
            title: "title",
            perex: "perex",
            content: "content",
            category_id: "categoryId",
            keywords: "keywords",
          };
          Object.entries(value.fields).forEach(([key, message]) => {
            const field = fieldMap[key];
            if (field) setError(field, { type: "server", message });
            else setServerError(message);
          });
        } else {
          setServerError(value?.error ?? "Failed to save article.");
        }
        return;
      }
      if (isNew && saved) {
        navigate(`/${newspaperName}/articles/${(saved as { id: string }).id}/edit`, {
          replace: true,
        });
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Submit for review ──────────────────────────────────────────────── */
  async function handleSubmitForReview() {
    if (isNew) {
      setServerError("Save the article first before submitting.");
      return;
    }
    if (!isProfileComplete) {
      setServerError(
        "Complete your author profile (bio and profile picture) before submitting for review.",
      );
      return;
    }
    setServerError(null);
    setSubmitting(true);
    try {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId! })
        .status.patch({ action: "SUBMIT" });
      if (error) {
        const { value } = toApiError(error);
        setServerError(
          value?.error === "ARTICLE_MISSING_IMAGE"
            ? "Upload at least one image before submitting."
            : value?.error === "AUTHOR_PROFILE_INCOMPLETE"
              ? "Complete your author profile (bio and profile picture) before submitting for review."
              : (value?.error ?? "Failed to submit article."),
        );
        return;
      }
      setArticleStatus("SUBMITTED");
      navigate(`/${newspaperName}/author-dashboard?section=my-articles`);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Delete article ─────────────────────────────────────────────────── */
  async function handleDelete() {
    if (isNew) return;
    if (!confirm("Permanently delete this article? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId! })
        .delete();
      if (error) throw error;
      navigate(`/${newspaperName}/author-dashboard?section=my-articles`);
    } catch {
      setServerError("Failed to delete article. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return {
    categories,
    articleStatus,
    loading,
    loadError,
    isProfileComplete,
    handleSave,
    handleSubmitForReview,
    handleDelete,
    saving,
    submitting,
    deleting,
    serverError,
    setServerError,
  };
}
