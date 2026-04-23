import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../lib/api";
import { Navbar } from "../components/Navbar";

export function VerifyEmailPage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setErrorMessage("No verification token found in the link.");
      setStatus("error");
      return;
    }

    fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (body.error === "INVALID_TOKEN") {
          setErrorMessage("This verification link is invalid or has expired.");
        } else {
          setErrorMessage("Something went wrong. Please try again.");
        }
        setStatus("error");
      })
      .catch(() => {
        setErrorMessage("Could not connect to the server. Please try again later.");
        setStatus("error");
      });
  }, []);

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] rounded-xl border border-border bg-card p-10 shadow-sm text-center flex flex-col gap-4">
          {status === "loading" && (
            <>
              <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">
                Verifying your email…
              </h2>
              <p className="text-[14px] text-muted-foreground">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-foreground"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">
                Email verified!
              </h2>
              <p className="text-[14px] text-muted-foreground">
                Your account is now active. You can sign in.
              </p>
              <Link
                to={`/${newspaperName}/login`}
                className="mt-2 text-[14px] font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Go to Sign in
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">
                Verification failed
              </h2>
              <p className="text-[14px] text-muted-foreground">{errorMessage}</p>
              <Link
                to={`/${newspaperName}/login`}
                className="mt-2 text-[14px] font-semibold text-foreground underline-offset-4 hover:underline"
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
