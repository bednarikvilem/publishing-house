import { Resend } from "resend";

const resend = new Resend(process.env.SMTP_PASS);
const FROM = process.env.SMTP_FROM ?? "noreply@example.com";

export async function sendVerificationEmail(
	to: string,
	token: string,
	newspaperSlug: string,
): Promise<void> {
	const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
	const link = `${frontendUrl}/${newspaperSlug}/verify-email?token=${token}`;

	await resend.emails.send({
		from: FROM,
		to,
		subject: "Verify your email address",
		text: `Please verify your email address by clicking the link below:\n\n${link}\n\nThis link expires in 48 hours.`,
		html: `
<p>Thanks for signing up! Please verify your email address by clicking the button below.</p>
<p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Verify email</a></p>
<p>Or copy this link into your browser:<br><a href="${link}">${link}</a></p>
<p>This link expires in 48 hours. If you did not create an account, you can safely ignore this email.</p>
`,
	});
}

export async function sendPasswordResetEmail(
	to: string,
	token: string,
	newspaperSlug: string,
): Promise<void> {
	const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
	const link = `${frontendUrl}/${newspaperSlug}/reset-password?token=${token}`;

	await resend.emails.send({
		from: FROM,
		to,
		subject: "Reset your password",
		text: `Reset your password by clicking the link below:\n\n${link}\n\nThis link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.`,
		html: `
<p>You requested a password reset. Click the button below to choose a new password.</p>
<p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Reset password</a></p>
<p>Or copy this link into your browser:<br><a href="${link}">${link}</a></p>
<p>This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
`,
	});
}
