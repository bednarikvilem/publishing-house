import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewDecision } from "../types";

const DECISION_LABELS: Record<ReviewDecision, string> = {
  APPROVE: "Approve",
  REJECT: "Reject",
  REQUEST_REVISION: "Request Revision",
};

const DECISION_ACTIVE_CLASS: Record<ReviewDecision, string> = {
  APPROVE: "bg-green-600 text-white hover:bg-green-600",
  REJECT: "bg-red-600 text-white hover:bg-red-600",
  REQUEST_REVISION: "bg-orange-600 text-white hover:bg-orange-600",
};

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
          <Button
            key={d}
            type="button"
            size="sm"
            variant={decision === d ? "default" : "outline"}
            className={decision === d ? DECISION_ACTIVE_CLASS[d] : undefined}
            onClick={() => setDecision(d)}
          >
            {DECISION_LABELS[d]}
          </Button>
        ))}
      </div>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          noteRequired
            ? "Note is required for this decision…"
            : "Optional note for the author…"
        }
        required={noteRequired}
        rows={3}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || (noteRequired && !note.trim())}
        >
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </form>
  );
}
