import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";

const sendMailSpy = mock(async () => ({}));

mock.module("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: sendMailSpy }),
  },
  createTransport: () => ({ sendMail: sendMailSpy }),
}));

// SMTP_FROM is captured at module-load time, so it must be set before import
process.env.SMTP_FROM = "custom@sender.com";

const { sendVerificationEmail, sendPasswordResetEmail } = await import("../../src/utils/email");

describe("email", () => {
  const originalFrom = process.env.SMTP_FROM;
  const originalUrl = process.env.FRONTEND_URL;

  beforeEach(() => {
    sendMailSpy.mockClear();
  });

  afterEach(() => {
    process.env.SMTP_FROM = originalFrom;
    process.env.FRONTEND_URL = originalUrl;
  });

  test("sendVerificationEmail sends to recipient with token + slug in link", async () => {
    process.env.FRONTEND_URL = "https://example.com";
    await sendVerificationEmail("alice@example.com", "tok-123", "claudedaily");

    expect(sendMailSpy).toHaveBeenCalledTimes(1);
    const arg = sendMailSpy.mock.calls[0]![0] as {
      to: string;
      subject: string;
      text: string;
      html: string;
    };
    expect(arg.to).toBe("alice@example.com");
    expect(arg.subject).toMatch(/verify/i);
    expect(arg.text).toContain("https://example.com/claudedaily/verify-email?token=tok-123");
    expect(arg.html).toContain("tok-123");
  });

  test("sendPasswordResetEmail sends a reset link with token", async () => {
    process.env.FRONTEND_URL = "https://example.com";
    await sendPasswordResetEmail("bob@example.com", "reset-456", "claudedaily");

    const arg = sendMailSpy.mock.calls[0]![0] as { to: string; text: string };
    expect(arg.to).toBe("bob@example.com");
    expect(arg.text).toContain("https://example.com/claudedaily/reset-password?token=reset-456");
  });

  test("uses SMTP_FROM env var as sender", async () => {
    await sendVerificationEmail("a@b.com", "t", "n");
    expect((sendMailSpy.mock.calls[0]![0] as { from: string }).from).toBe("custom@sender.com");

    sendMailSpy.mockClear();
    await sendPasswordResetEmail("a@b.com", "t", "n");
    expect((sendMailSpy.mock.calls[0]![0] as { from: string }).from).toBe("custom@sender.com");
  });

  test("falls back to http://localhost:5173 when FRONTEND_URL is unset", async () => {
    delete process.env.FRONTEND_URL;
    await sendVerificationEmail("a@b.com", "tok", "claudedaily");
    const arg = sendMailSpy.mock.calls[0]![0] as { text: string };
    expect(arg.text).toContain("http://localhost:5173/claudedaily/verify-email?token=tok");
  });
});
