# Password Reset — Implementation Plan

**Spec:** `2026-05-31-password-reset-design.md`  
**Date:** 2026-05-31

---

## Step 1 — Fix `PasswordResetPage.tsx`

**File:** `apps/web/src/pages/PasswordResetPage.tsx`

- Remove the `NEWSPAPER_ID` constant and its TODO comment.
- Import and call `useNewspaper()` to get `{ newspaper, newspaperName }`.
- Replace `newspaper_id: NEWSPAPER_ID` in the fetch body with `newspaper_id: newspaper.id`.
- Disable the submit button when `!newspaper` (loading), matching `SignUpPage` behaviour.
- Apply the primary colour theme class from `newspaper?.primary_color` (same pattern as `SignUpPage`).

---

## Step 2 — Create `SetNewPasswordPage.tsx`

**File:** `apps/web/src/pages/SetNewPasswordPage.tsx` (new)

### 2a. Token extraction
- Read `?token=` from the URL using `new URLSearchParams(window.location.search).get("token")` (or `useSearchParams` from react-router-dom).
- If token is absent, immediately render the "invalid link" error state (no API call).

### 2b. Form state
- Local state: `password`, `confirmPassword`, `loading`, `error`, `success`.
- On submit:
  1. If `password !== confirmPassword` → set inline error, return early.
  2. Call `POST /api/auth/reset-password` with `{ token, password }`.
  3. On 200 → set `success = true`.
  4. On 400 → set error "This link has expired or is invalid."
  5. On network failure → set error "Something went wrong. Please try again."

### 2c. Rendered states
- **No token:** `AuthCard` with an error message and a `<Link>` to `/:newspaperName/forgot-password`.
- **Form:** Two `FormField` inputs (new password, confirm password) + submit button. Inline error below fields.
- **Success:** Checkmark icon + "Your password has been reset." + `<Link>` to `/:newspaperName/login`.

### 2d. Style
- Use `useNewspaper()` for `{ newspaperName, newspaper }`.
- Wrap in `<div className={...theme...}>`, `<Navbar>`, `<AuthCard>` — identical shell to `PasswordResetPage`.
- Use `<CheckIcon>` from `../components/Icons` for the success state.
- Use `<FormField>` from `../components/FormField` for inputs.

---

## Step 3 — Register route in `App.tsx`

**File:** `apps/web/src/App.tsx`

- Import `SetNewPasswordPage` from `./pages/SetNewPasswordPage`.
- Add the route immediately after `/:newspaperName/verify-email`:

```tsx
<Route path="/:newspaperName/reset-password" element={<SetNewPasswordPage />} />
```

---

## Verification

After implementing, manually test the full flow:

1. Go to `/:newspaperName/forgot-password`, enter a registered email, submit.
2. Check Mailtrap inbox — a reset email should arrive.
3. Click the link in the email → lands on `/:newspaperName/reset-password?token=...`.
4. Enter a new password + confirm, submit → success message shown.
5. Log in with the new password → succeeds.
6. Revisit the same reset link → "expired or invalid" error shown (token already used / expired).
7. Visit `/:newspaperName/reset-password` with no token → "invalid link" error shown immediately.
