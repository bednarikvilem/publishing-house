export function DangerZoneCard() {
  return (
    <div className="border-destructive bg-card flex flex-col gap-4 rounded-xl border p-8">
      <h2
        className="text-destructive text-[18px] font-bold font-outfit"
      >
        Danger Zone
      </h2>
      <p className="text-muted-foreground text-[14px] leading-relaxed">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      <button
        type="button"
        className="border-destructive bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground w-fit rounded-md border px-4 py-2 text-[14px] font-semibold transition-colors"
      >
        Delete Account
      </button>
    </div>
  );
}
