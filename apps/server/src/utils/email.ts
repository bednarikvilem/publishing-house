import nodemailer from "nodemailer";

// Mailtrap sandbox: sandbox.smtp.mailtrap.io, port 2525, secure: false
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT ?? 2525),
	secure: false,
	auth: {
		user: process.env.SMTP_USER!,
		pass: process.env.SMTP_PASS!,
	},
});

const FROM = process.env.SMTP_FROM ?? "noreply@example.com";

export async function sendVerificationEmail(
	to: string,
	token: string,
	newspaperSlug: string,
): Promise<void> {
	const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
	const link = `${frontendUrl}/${newspaperSlug}/verify-email?token=${token}`;

	await transporter.sendMail({
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

export async function sendSubscriptionQrEmail(
	to: string,
	newspaperName: string,
	qrDataUrl: string,
	confirmUrl: string,
): Promise<void> {
	await transporter.sendMail({
		from: FROM,
		to,
		subject: `Your subscription QR code for ${newspaperName}`,
		text: `Scan the QR code or open this link to activate your 30-day subscription to ${newspaperName}:\n\n${confirmUrl}`,
		html: `
<p>Here is your QR code to activate your 30-day subscription to <strong>${newspaperName}</strong>.</p>
<p>Scan the code with your phone camera, or click the link below.</p>
<p><img src="${qrDataUrl}" alt="Subscription QR code" width="200" height="200" /></p>
<p><a href="${confirmUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Activate subscription</a></p>
<p>This link expires in 7 days.</p>
`,
	});
}

export async function sendSubscriptionRenewalEmail(
	to: string,
	newspaperName: string,
	expiresAt: Date,
	qrDataUrl: string,
	confirmUrl: string,
): Promise<void> {
	const expiryStr = expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
	await transporter.sendMail({
		from: FROM,
		to,
		subject: `Renew your subscription to ${newspaperName}`,
		text: `Your subscription to ${newspaperName} expires on ${expiryStr}. Scan the QR code or open this link to renew for another 30 days:\n\n${confirmUrl}`,
		html: `
<p>Your subscription to <strong>${newspaperName}</strong> expires on <strong>${expiryStr}</strong>.</p>
<p>Scan the QR code or click the button below to renew for another 30 days.</p>
<p><img src="${qrDataUrl}" alt="Renewal QR code" width="200" height="200" /></p>
<p><a href="${confirmUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Renew subscription</a></p>
<p>This link expires in 7 days.</p>
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

	await transporter.sendMail({
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
