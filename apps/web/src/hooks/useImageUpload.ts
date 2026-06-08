import { useEffect, useRef, useState } from "react";
import { client, toApiError } from "../lib/api";

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
    try {
      const { data, error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId })
        .images.post({ image: file });
      if (error) {
        onError(toApiError(error).value?.error ?? "Failed to upload image.");
        return;
      }
      setImages((prev) => [...prev, data as ArticleImage]);
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
      const { error } = await client.api
        .newspapers({ newspaper_id: newspaperId })
        .articles({ article_id: articleId })
        .images({ image_id: imageId })
        .delete();
      if (error) {
        if (toApiError(error).status === 422) {
          onError("Cannot remove the only image from the article.");
          return;
        }
        throw error;
      }
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      onError("Failed to delete image. Please try again.");
    }
  }

  return { images, setImages, uploadingImage, fileInputRef, handleImageUpload, handleImageDelete };
}
