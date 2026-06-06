import { Button } from "../../components/ui/button";

export function DangerZoneCard() {
  return (
    <div className="border-destructive bg-card flex flex-col gap-4 rounded-xl border p-8">
      <h2
        className="text-destructive text-[18px] font-bold"
        style={{ fontFamily: "Outfit, Inter, sans-serif" }}
      >
        Danger Zone
      </h2>
      <p className="text-muted-foreground text-[14px] leading-relaxed">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      <Button type="button" variant="destructive">
        Delete Account
      </Button>
    </div>
  );
}
