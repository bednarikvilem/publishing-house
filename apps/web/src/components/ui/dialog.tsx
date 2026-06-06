import * as React from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";

const Dialog = AlertDialog.Root;
const DialogTrigger = AlertDialog.Trigger;
const DialogClose = AlertDialog.Close;

function DialogContent({ className, children, ...props }: AlertDialog.Popup.Props) {
  return (
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />
      <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <AlertDialog.Popup
          data-slot="dialog-content"
          className={cn(
            "bg-background ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-full max-w-md rounded-2xl p-6 shadow-xl ring-1 duration-150",
            className
          )}
          {...props}
        >
          {children}
        </AlertDialog.Popup>
      </AlertDialog.Viewport>
    </AlertDialog.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-4 flex justify-end gap-2", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: AlertDialog.Title.Props) {
  return (
    <AlertDialog.Title
      data-slot="dialog-title"
      className={cn("text-foreground text-base font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: AlertDialog.Description.Props) {
  return (
    <AlertDialog.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
