import { useRef, useState } from "react";
import { API_BASE_URL, authHeaders } from "../lib/api";

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
    const formData = new FormData();
    formData.append("profile_picture", file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me/profile-picture`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { profile_picture: string };
      setAvatarUrl(data.profile_picture);
    } catch {
      setError("Failed to upload photo. Use JPEG or PNG under 5 MB.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return { avatarUrl, uploading, error, fileInputRef, handleFileChange };
}
