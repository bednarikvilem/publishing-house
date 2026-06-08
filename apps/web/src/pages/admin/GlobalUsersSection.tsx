import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Static } from "@sinclair/typebox";
import { createGlobalUserInput } from "@pb138/server/schemas/auth";
import { client, toApiError } from "../../lib/api";
import { typeboxResolver, emptyToUndefined } from "../../lib/validation";
import { PlusIcon } from "../../components/Icons";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { FormField } from "../../components/FormField";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type GlobalUser = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
};

type GlobalRole = "DIRECTOR" | "SYSTEM_ADMINISTRATOR";
type CreateGlobalUserFormValues = Static<typeof createGlobalUserInput>;

export function GlobalUsersSection() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateGlobalUserFormValues>({
    resolver: typeboxResolver(createGlobalUserInput),
    defaultValues: { role: "DIRECTOR" },
  });

  const usersQuery = useQuery({
    queryKey: ["global-users"],
    queryFn: async () => {
      const { data, error } = await client.api.global.users.get();
      if (error) throw error;
      return (data as { data: GlobalUser[] }).data;
    },
  });

  const createUser = useMutation({
    mutationFn: async (values: CreateGlobalUserFormValues) => {
      const { error } = await client.api.global.users.post(values);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowCreate(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["global-users"] });
    },
    onError: (err) => {
      const { status, value } = toApiError(err);
      if (status === 409) {
        setError("root", {
          message:
            value?.error === "ROLE_ALREADY_HELD_GLOBALLY"
              ? "A user already holds this global role."
              : "Email is already taken.",
        });
      } else {
        setError("root", { message: "Failed to create global user." });
      }
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: GlobalRole }) => {
      const { error } = await client.api
        .users({ user_id: userId })["global-roles"]({ role })
        .delete();
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["global-users"] }),
    onError: (err) => {
      const { status } = toApiError(err);
      alert(
        status === 422
          ? "Cannot remove your own SYSTEM_ADMINISTRATOR role."
          : "Failed to remove role.",
      );
    },
  });

  function handleRemove(userId: string, role: string) {
    if (!confirm(`Remove ${role} from this user?`)) return;
    removeRole.mutate({ userId, role: role as GlobalRole });
  }

  const globalUsers = usersQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle title="Global Users" />
        <Button
          onClick={() => setShowCreate((v) => !v)}
          className="bg-foreground text-background rounded-md gap-2 text-[13px] font-semibold hover:bg-foreground hover:opacity-90"
        >
          <PlusIcon />
          New Global User
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleSubmit((values) => createUser.mutate(values))}
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
              {...register("email")}
            />
            <FormField
              id="username"
              label="Username"
              type="text"
              required
              error={errors.username?.message}
              {...register("username")}
            />
            <FormField
              id="full_name"
              label="Full Name"
              type="text"
              error={errors.full_name?.message}
              {...register("full_name", { setValueAs: emptyToUndefined })}
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              required
              error={errors.password?.message}
              {...register("password")}
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-foreground text-[14px]">
                Role
              </Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIRECTOR">DIRECTOR</SelectItem>
                      <SelectItem value="SYSTEM_ADMINISTRATOR">SYSTEM_ADMINISTRATOR</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {errors.root && (
            <p className="text-destructive text-[13px]">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreate(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createUser.isPending}
              size="sm"
              className="bg-foreground text-background rounded-md font-semibold hover:bg-foreground hover:opacity-90"
            >
              {createUser.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      )}

      {usersQuery.isLoading ? (
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
                        <Button
                          onClick={() => handleRemove(u.id, role)}
                          variant="ghost"
                          size="icon-xs"
                          className="ml-0.5 hover:bg-transparent hover:text-destructive"
                          aria-label={`Remove ${role}`}
                        >
                          ×
                        </Button>
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
