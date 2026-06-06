import { useState } from "react";
import type { ReviewDecision } from "../types";

export function DecisionForm({
  onSubmit,
  onCancel,
  submitting,
  requireNoteFor = ["REJECT", "REQUEST_REVISION"],
}: {
  onSubmit: (decision: ReviewDecision, note: string) => void;
  onCancel: () => void;
  submitting: boolean;
  requireNoteFor?: ReviewDecision[];
}) {
  const [decision, setDecision] = useState<ReviewDecision>("APPROVE");
  const [note, setNote] = useState("");

  const noteRequired = requireNoteFor.includes(decision);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (noteRequired && !note.trim()) return;
    onSubmit(decision, note);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-muted/30 mt-3 flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex gap-2">
        {(["APPROVE", "REJECT", "REQUEST_REVISION"] as ReviewDecision[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDecision(d)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              decision === d
                ? d === "APPROVE"
                  ? "bg-[#16a34a] text-white"
                  : d === "REJECT"
                    ? "bg-[#dc2626] text-white"
                    : "bg-[#ea580c] text-white"
                : "border-border bg-background text-muted-foreground hover:bg-muted border"
            }`}
          >
            {d === "REQUEST_REVISION"
              ? "Request Revision"
              : d.charAt(0) + d.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          noteRequired
            ? "Note is required for this decision…"
            : "Optional note for the author…"
        }
        required={noteRequired}
        rows={3}
        className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-2xs outline-none focus:ring-2"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-2xs font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || (noteRequired && !note.trim())}
          className="bg-foreground text-background rounded-md px-3 py-1.5 text-2xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
