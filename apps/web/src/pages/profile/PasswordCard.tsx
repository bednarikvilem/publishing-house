import { useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/ui/button";

export function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving]                   = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccess(true);
        return;
      }

      const body = await res.json();
      if (res.status === 422 && body.fields?.password) {
        setError(body.fields.password);
        return;
      }
      setError("Something went wrong. Please try again.");
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="border-border bg-card flex flex-col gap-6 rounded-xl border p-8"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-bold font-outfit">
          Change Password
        </h2>
        <p className="text-muted-foreground text-sm">
          Update your password to keep your account secure.
        </p>
      </div>

      <FormField
        id="currentPassword"
        label="Current Password"
        type="password"
        placeholder="Enter current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-5">
        <FormField
          id="newPassword"
          label="New Password"
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <FormField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error   && <p className="text-destructive text-2xs">{error}</p>}
      {success && <p className="text-2xs text-green-600">Password updated successfully.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </form>
  );
}
