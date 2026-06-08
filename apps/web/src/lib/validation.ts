import { FormatRegistry } from "@sinclair/typebox";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

if (!FormatRegistry.Has("email")) {
  FormatRegistry.Set("email", (v) => EMAIL_RE.test(v));
}
if (!FormatRegistry.Has("uuid")) {
  FormatRegistry.Set("uuid", (v) => UUID_RE.test(v));
}
if (!FormatRegistry.Has("date-time")) {
  FormatRegistry.Set("date-time", (v) => !Number.isNaN(Date.parse(v)));
}

export const emptyToUndefined = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value;

export { typeboxResolver } from "@hookform/resolvers/typebox";
