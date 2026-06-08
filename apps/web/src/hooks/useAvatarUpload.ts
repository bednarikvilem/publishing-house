import { useRef, useState } from "react";
import { client } from "../lib/api";

export function useAvatarUpload(initialUrl: string | null) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { data, error } = await client.api.users.me["profile-picture"].post({
        profile_picture: file,
      });
      if (error) throw error;
      setAvatarUrl((data as { profile_picture: string }).profile_picture);
    } catch {
      setError("Failed to upload photo. Use JPEG or PNG under 5 MB.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return { avatarUrl, uploading, error, fileInputRef, handleFileChange };
}
