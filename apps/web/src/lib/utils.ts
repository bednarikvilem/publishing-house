import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string, monthFormat: "short" | "long" = "short") {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: monthFormat,
    day: "numeric",
  });
}
