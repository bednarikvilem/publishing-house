export function ErrorState({
  message = "Something went wrong. Please try again.",
}: {
  message?: string;
}) {
  return <p className="text-muted-foreground py-16 text-center">{message}</p>;
}
