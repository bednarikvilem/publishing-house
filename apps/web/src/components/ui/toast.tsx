import * as React from "react";
import { Toast } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "bg-background text-foreground ring-foreground/10 data-open:animate-in data-open:slide-in-from-bottom-4 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-bottom-4 data-closed:fade-out-0 relative flex w-80 flex-col gap-1 rounded-2xl p-4 shadow-lg ring-1 duration-150",
  {
    variants: {
      variant: {
        default: "",
        success: "border-l-4 border-l-green-500",
        error: "border-l-4 border-l-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ToastData extends Record<string, unknown> {
  variant?: "default" | "success" | "error";
}

function ToastRoot({
  className,
  toast,
  ...props
}: React.ComponentProps<typeof Toast.Root> & { toast: Toast.Root.Props["toast"] }) {
  const variant = (toast.data as ToastData | undefined)?.variant ?? "default";
  return (
    <Toast.Root
      data-slot="toast"
      toast={toast}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof Toast.Title>) {
  return (
    <Toast.Title
      data-slot="toast-title"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: React.ComponentProps<typeof Toast.Description>) {
  return (
    <Toast.Description
      data-slot="toast-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function ToastClose({ className, ...props }: React.ComponentProps<typeof Toast.Close>) {
  return (
    <Toast.Close
      data-slot="toast-close"
      className={cn(
        "text-muted-foreground hover:text-foreground absolute top-3 right-3 rounded-sm transition-colors",
        className
      )}
      {...props}
    >
      <XIcon className="size-4" />
    </Toast.Close>
  );
}

export { ToastRoot, ToastTitle, ToastDescription, ToastClose, toastVariants };
export type { VariantProps };
