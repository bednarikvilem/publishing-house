import { useForm, useWatch } from "react-hook-form";
import type { ReviewDecision } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface DecisionFormValues {
  decision: ReviewDecision;
  note: string;
}

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
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DecisionFormValues>({
    defaultValues: { decision: "APPROVE", note: "" },
  });

  // Watch decision live so the note requirement updates immediately
  const decision = useWatch({ control, name: "decision" });
  const noteRequired = requireNoteFor.includes(decision);

  function onValid(data: DecisionFormValues) {
    onSubmit(data.decision, data.note);
  }

  const decisionStyles: Record<ReviewDecision, string> = {
    APPROVE: "bg-success text-white",
    REJECT: "bg-destructive text-white",
    REQUEST_REVISION: "bg-warning text-white",
  };
  const inactiveStyle =
    "border-border bg-background text-muted-foreground hover:bg-muted border";

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      className="border-border bg-muted/30 mt-3 flex flex-col gap-3 rounded-lg border p-4"
    >
      {/* Decision toggle buttons — registered as a radio group */}
      <div className="flex gap-2">
        {(["APPROVE", "REJECT", "REQUEST_REVISION"] as ReviewDecision[]).map((d) => (
          <label key={d} className="cursor-pointer">
            <Input
              type="radio"
              value={d}
              className="sr-only"
              {...register("decision")}
            />
            <span
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                decision === d ? decisionStyles[d] : inactiveStyle
              }`}
            >
              {d === "REQUEST_REVISION"
                ? "Request Revision"
                : d.charAt(0) + d.slice(1).toLowerCase()}
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <Textarea
          placeholder={
            noteRequired
              ? "Note is required for this decision…"
              : "Optional note for the author…"
          }
          rows={3}
          className="rounded-md text-[13px]"
          {...register("note", {
            validate: (val) =>
              !noteRequired || val.trim().length > 0
                ? true
                : "A note is required for this decision",
          })}
        />
        {errors.note && (
          <span className="text-destructive text-[12px]">{errors.note.message}</span>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          size="sm"
          className="bg-foreground text-background rounded-md font-semibold hover:bg-foreground hover:opacity-90"
        >
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </form>
  );
}