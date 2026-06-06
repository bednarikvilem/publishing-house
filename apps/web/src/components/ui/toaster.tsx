import { Toast } from "@base-ui/react/toast";
import { ToastRoot, ToastTitle, ToastDescription, ToastClose } from "./toast";
import type { ToastData } from "./toast";

export const toastManager = Toast.createToastManager<ToastData>();

export function toast(options: {
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
  timeout?: number;
}) {
  toastManager.add({
    title: options.title,
    description: options.description,
    type: options.variant ?? "default",
    timeout: options.timeout,
    data: { variant: options.variant ?? "default" },
  });
}

export function useToast() {
  return { toast };
}

function ToastList() {
  const { toasts } = Toast.useToastManager<ToastData>();
  return (
    <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 outline-none">
      {toasts.map((t) => (
        <ToastRoot key={t.id} toast={t}>
          {t.title && <ToastTitle>{t.title}</ToastTitle>}
          {t.description && <ToastDescription>{t.description}</ToastDescription>}
          <ToastClose />
        </ToastRoot>
      ))}
    </Toast.Viewport>
  );
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager}>
      <ToastList />
    </Toast.Provider>
  );
}
