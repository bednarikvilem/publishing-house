# Password Reset — Design Spec

**Date:** 2026-05-31  
**Status:** Approved

---

## Problem

The forgot-password form (`PasswordResetPage.tsx`) uses a hardcoded `NEWSPAPER_ID` constant that does not correspond to any real newspaper. Because the user lookup always returns nothing, `sendPasswordResetEmail` is never called. The API returns a generic success response regardless (intentional, to prevent email enumeration), so the UI falsely claims the email was sent.

Additionally, the reset email constructs a link to `/:newspaperName/reset-password?token=...` but no route exists for that URL, so clicking the link leads to a blank page.

---

## Scope

Frontend only. The backend (`forgotPassword` and `resetPassword` services, `sendPasswordResetEmail`) is fully implemented and requires no changes.

---

## Fix 1 — `PasswordResetPage.tsx`

**File:** `apps/web/src/pages/PasswordResetPage.tsx`

Remove the hardcoded `NEWSPAPER_ID` constant. Use the `useNewspaper()` hook (already used by `SignUpPage`, `LoginPage`, etc.) to resolve the real newspaper from the URL slug.

- Disable the submit button while `newspaper` is null (loading), matching `SignUpPage` behaviour.
- Pass `newspaper.id` as `newspaper_id` in the API request body.

---

## Fix 2 — New `SetNewPasswordPage.tsx`

**File:** `apps/web/src/pages/SetNewPasswordPage.tsx` (new)

Handles the `/:newspaperName/reset-password?token=...` URL that the reset email links to.

### States

| State | Trigger | UI |
|---|---|---|
| No token | `?token` absent from URL on mount | Error message + link to `forgot-password` |
| Form | Token present | New password + Confirm password fields, submit button |
| Success | API returns 200 | Checkmark + "Password reset." + link to login |

### Validation & errors

- **Passwords don't match** — inline message, no API call made.
- **API 400 (invalid/expired token)** — "This link has expired or is invalid." + link to `forgot-password`.
- **Network error** — generic "Something went wrong. Please try again."
- Submit button disabled while request is in flight.

### API call

```
POST /api/auth/reset-password
Body: { token: string, password: string }
```

### Style

Uses `AuthCard`, `Navbar`, `FormField`, and the same CSS classes as `VerifyEmailPage` and `PasswordResetPage`. Applies `useNewspaper()` for the primary colour theme class.

---

## Fix 3 — Routing (`App.tsx`)

**File:** `apps/web/src/App.tsx`

Add one route, adjacent to `/:newspaperName/verify-email`:

```tsx
<Route path="/:newspaperName/reset-password" element={<SetNewPasswordPage />} />
```

---

## Files changed

| File | Change |
|---|---|
| `apps/web/src/pages/PasswordResetPage.tsx` | Replace hardcoded ID with `useNewspaper()` |
| `apps/web/src/pages/SetNewPasswordPage.tsx` | New component |
| `apps/web/src/App.tsx` | Add `/:newspaperName/reset-password` route |
