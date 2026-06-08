import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { client, type ApiError } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { CheckIcon } from "../components/Icons";

export function VerifyEmailPage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { mutate, isSuccess, isError, error } = useMutation<void, ApiError, string>({
    mutationFn: async (verificationToken) => {
      const { error } = await client.api.auth["verify-email"].post({
        token: verificationToken,
      });
      if (error) throw error;
    },
  });

  useEffect(() => {
    if (token) mutate(token);
  }, [token, mutate]);

  const status: "loading" | "success" | "error" =
    !token || isError ? "error" : isSuccess ? "success" : "loading";

  let errorMessage: string | null = null;
  if (!token) {
    errorMessage = "No verification token found in the link.";
  } else if (isError) {
    errorMessage =
      error?.value?.error === "INVALID_TOKEN"
        ? "This verification link is invalid or has expired."
        : "Something went wrong. Please try again.";
  }

  return (
    <div className="bg-background text-foreground min-h-screen w-full">
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
        <div className="border-border bg-card flex w-full max-w-[var(--layout-auth-card-max-width)] flex-col gap-4 rounded-xl border p-10 text-center shadow-sm">
          {status === "loading" && (
            <>
              <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
                Verifying your email…
              </h2>
              <p className="text-muted-foreground text-sm">
                Please wait a moment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <CheckIcon size={22} className="text-foreground" />
              </div>
              <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
                Email verified!
              </h2>
              <p className="text-muted-foreground text-sm">
                Your account is now active. You can sign in.
              </p>
              <Link
                to={`/${newspaperName}/login`}
                className="text-foreground mt-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                Go to Sign in
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
                Verification failed
              </h2>
              <p className="text-muted-foreground text-sm">
                {errorMessage}
              </p>
              <Link
                to={`/${newspaperName}/login`}
                className="text-foreground mt-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                Back to Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}