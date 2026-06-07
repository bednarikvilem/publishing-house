import { Button } from "../../components/ui/button";

export function DangerZoneCard() {
  return (
    <div className="border-destructive bg-card flex flex-col gap-4 rounded-xl border p-8">
      <h2 className="text-destructive text-lg font-bold font-outfit">
        Danger Zone
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      <Button type="button" variant="destructive">
        Delete Account
      </Button>
    </div>
  );
}
