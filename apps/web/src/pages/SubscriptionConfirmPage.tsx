import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useNewspaper } from "../hooks/useNewspaper";
import { confirmSubscription } from "../lib/api";
import { CheckIcon } from "../components/Icons";

export function SubscriptionConfirmPage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const { newspaper } = useNewspaper();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!newspaper || confirmedRef.current) return;
    confirmedRef.current = true;
    const token = searchParams.get("token");
    if (!token) {
      setErrorMessage("No token found in the link.");
      setStatus("error");
      return;
    }

    confirmSubscription(newspaper.id, token)
      .then((data) => {
        setExpiresAt(data.expires_at);
        setStatus("success");
      })
      .catch((err: Error) => {
        if (err.message === "INVALID_TOKEN") {
          setErrorMessage("This QR code has already been used or has expired.");
        } else {
          setErrorMessage("Something went wrong. Please try again.");
        }
        setStatus("error");
      });
  }, [newspaper, searchParams]);

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-background text-foreground min-h-screen w-full">
      <Navbar newspaperName={newspaperName ?? ""} />

      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-12">
        <div className="border-border bg-card flex w-full max-w-[var(--layout-auth-card-max-width)] flex-col gap-4 rounded-xl border p-10 text-center shadow-sm">
          {status === "loading" && (
            <>
              <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
                Activating subscription…
              </h2>
              <p className="text-muted-foreground text-sm">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <CheckIcon size={22} className="text-foreground" />
              </div>
              <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
                Subscription activated!
              </h2>
              {formattedExpiry && (
                <p className="text-muted-foreground text-sm">
                  Valid until {formattedExpiry}.
                </p>
              )}
              <Link
                to={`/${newspaperName}`}
                className="text-foreground mt-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                Go to homepage
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h2 className="text-foreground text-xl-plus font-extrabold tracking-tight">
                Activation failed
              </h2>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
              <Link
                to={`/${newspaperName}`}
                className="text-foreground mt-2 text-sm font-semibold underline-offset-4 hover:underline"
              >
                Back to homepage
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
