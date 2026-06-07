import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { PlusIcon } from "../../components/Icons";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { FormField } from "../../components/FormField";

type GlobalUser = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
};

interface CreateGlobalUserFormValues {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role: "DIRECTOR" | "SYSTEM_ADMINISTRATOR";
}

export function GlobalUsersSection() {
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGlobalUserFormValues>({
    defaultValues: { role: "DIRECTOR" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/global/users`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: GlobalUser[] };
      setGlobalUsers(data.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(data: CreateGlobalUserFormValues) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/global/users`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 409) {
        const json = (await res.json()) as { error: string };
        setError("root", {
          message:
            json.error === "ROLE_ALREADY_HELD_GLOBALLY"
              ? "A user already holds this global role."
              : "Email is already taken.",
        });
        return;
      }
      if (!res.ok) throw new Error();
      setShowCreate(false);
      reset();
      load();
    } catch {
      setError("root", { message: "Failed to create global user." });
    }
  }

  async function handleRemove(userId: string, role: string) {
    if (!confirm(`Remove ${role} from this user?`)) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/users/${userId}/global-roles/${role}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (res.status === 422) {
        alert("Cannot remove your own SYSTEM_ADMINISTRATOR role.");
        return;
      }
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert("Failed to remove role.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle title="Global Users" />
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="bg-foreground text-background flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
        >
          <PlusIcon />
          New Global User
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="border-border bg-card flex flex-col gap-4 rounded-lg border p-5"
        >
          <p className="text-foreground text-[14px] font-semibold">
            Create Global User
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="email"
              label="Email"
              type="email"
              required
              error={errors.email?.message}
              {...register("email", { required: "Email is required" })}
            />
            <FormField
              id="username"
              label="Username"
              type="text"
              required
              error={errors.username?.message}
              {...register("username", { required: "Username is required" })}
            />
            <FormField
              id="full_name"
              label="Full Name"
              type="text"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              required
              error={errors.password?.message}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "At least 8 characters" },
              })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-[14px] font-medium">
                Role
              </label>
              <select
                className="border-border bg-background text-foreground focus:ring-ring h-9 rounded-md border px-3 text-[13px] outline-none focus:ring-2"
                {...register("role")}
              >
                <option value="DIRECTOR">DIRECTOR</option>
                <option value="SYSTEM_ADMINISTRATOR">SYSTEM_ADMINISTRATOR</option>
              </select>
            </div>
          </div>

          {errors.root && (
            <p className="text-destructive text-[13px]">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                reset();
              }}
              className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[13px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-foreground text-background rounded-md px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState />
      ) : globalUsers.length === 0 ? (
        <EmptyState message="No global users yet." />
      ) : (
        <div className="flex flex-col">
          {globalUsers.map((u, i) => (
            <ListRow
              key={u.id}
              first={i === 0}
              last={i === globalUsers.length - 1}
            >
              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-foreground text-[14px] font-semibold">
                    {u.full_name ?? u.username}
                  </span>
                  <span className="text-muted-foreground text-[12px]">
                    @{u.username} · {u.email}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {u.roles.map((role) => (
                      <span
                        key={role}
                        className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        {role}
                        <button
                          onClick={() => handleRemove(u.id, role)}
                          className="ml-0.5 transition-colors hover:text-[#dc2626]"
                          aria-label={`Remove ${role}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}