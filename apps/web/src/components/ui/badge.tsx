import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        outline: "border-border text-foreground bg-transparent",
        destructive: "bg-destructive/10 text-destructive border-transparent",
        draft: "bg-muted text-muted-foreground border-border",
        submitted: "bg-blue-500/10 text-blue-600 border-transparent dark:text-blue-400",
        "in-review": "bg-orange-500/10 text-orange-600 border-transparent dark:text-orange-400",
        "approved-editor": "bg-violet-500/10 text-violet-600 border-transparent dark:text-violet-400",
        "approved-manager": "bg-violet-500/10 text-violet-600 border-transparent dark:text-violet-400",
        "approved-director": "bg-cyan-500/10 text-cyan-600 border-transparent dark:text-cyan-400",
        published: "bg-green-500/10 text-green-600 border-transparent dark:text-green-400",
        rejected: "bg-red-500/10 text-red-600 border-transparent dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
