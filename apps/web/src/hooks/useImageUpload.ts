import { useEffect, useRef, useState } from "react";
import { API_BASE_URL, authHeaders } from "../lib/api";

export interface ArticleImage {
  id?: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
}

export function useImageUpload(
  articleId: string | undefined,
  newspaperId: string,
  initialImages: ArticleImage[] = [],
) {
  const [images, setImages] = useState<ArticleImage[]>(initialImages);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(initialImages);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialImages)]);

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onError: (msg: string) => void,
  ) {
    const file = e.target.files?.[0];
    if (!file || !articleId) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/images`,
        { method: "POST", headers: authHeaders(), body: formData },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        onError(data.error ?? "Failed to upload image.");
        return;
      }
      const img = (await res.json()) as ArticleImage;
      setImages((prev) => [...prev, img]);
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleImageDelete(
    imageId: string,
    onError: (msg: string) => void,
  ) {
    if (!articleId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/images/${imageId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (res.status === 422) {
        onError("Cannot remove the only image from the article.");
        return;
      }
      if (!res.ok) throw new Error();
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      onError("Failed to delete image. Please try again.");
    }
  }

  return { images, setImages, uploadingImage, fileInputRef, handleImageUpload, handleImageDelete };
}
