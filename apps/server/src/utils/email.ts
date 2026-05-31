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

export async function sendSubscriptionQrEmail(
	to: string,
	newspaperName: string,
	qrDataUrl: string,
	confirmUrl: string,
): Promise<void> {
	await transporter.sendMail({
		from: FROM,
		to,
		subject: `Subscription payment for ${newspaperName}`,
		text: `Scan the QR code or open this link to pay for your 30-day subscription to ${newspaperName}:\n\n${confirmUrl}`,
		html: `
<p>Here is your QR payment code to pay for your 30-day subscription to <strong>${newspaperName}</strong>.</p>
<p>Scan the code with your phone camera, or click the link below.</p>
<p><img src="${qrDataUrl}" alt="Subscription QR code" width="200" height="200" /></p>
<p><a href="${confirmUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Pay for subscription</a></p>
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

const STATE_SUBJECTS: Record<string, string> = {
	IN_REVIEW: "is now under review",
	APPROVED_BY_EDITOR: "has been approved by the editor",
	APPROVED_BY_MANAGER: "has been approved by the manager",
	APPROVED_BY_DIRECTOR: "has been approved by the director",
	PUBLISHED: "is now live!",
	REJECTED: "has been rejected",
	DRAFT: "requires revisions",
};

export async function sendAuthorStateChangeEmail(
	to: string,
	articleTitle: string,
	newState: string,
	feedback?: string | null,
	reviewerName?: string | null,
	articleLink?: string | null,
): Promise<void> {
	const suffix = STATE_SUBJECTS[newState] ?? `moved to state: ${newState}`;
	const subject = `Your article "${articleTitle}" ${suffix}`;

	let feedbackBlock = "";
	if ((newState === "REJECTED" || newState === "DRAFT") && (feedback || reviewerName)) {
		feedbackBlock = `
<hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
${reviewerName ? `<p><strong>Reviewed by:</strong> ${reviewerName}</p>` : ""}
${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ""}`;
	}

	let actionBlock = "";
	if (newState === "PUBLISHED" && articleLink) {
		actionBlock = `<p><a href="${articleLink}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Read your article</a></p>`;
	}

	await transporter.sendMail({
		from: FROM,
		to,
		subject,
		text: subject + (reviewerName ? `\n\nReviewed by: ${reviewerName}` : "") + (feedback ? `\nFeedback: ${feedback}` : "") + (articleLink ? `\n\n${articleLink}` : ""),
		html: `
<p>Your article <strong>"${articleTitle}"</strong> ${suffix}.</p>
${actionBlock}${feedbackBlock}
`,
	});
}

export async function sendEditorAssignmentEmail(
	to: string,
	articleTitle: string,
	dashboardLink: string,
): Promise<void> {
	await transporter.sendMail({
		from: FROM,
		to,
		subject: `You have been assigned to review "${articleTitle}"`,
		text: `You have been assigned to review the article "${articleTitle}".\n\nOpen your dashboard to begin the review:\n\n${dashboardLink}`,
		html: `
<p>You have been assigned to review the article <strong>"${articleTitle}"</strong>.</p>
<p><a href="${dashboardLink}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Go to dashboard</a></p>
`,
	});
}

export async function sendManagerArticleReadyEmail(
	to: string,
	articleTitle: string,
	dashboardLink: string,
): Promise<void> {
	await transporter.sendMail({
		from: FROM,
		to,
		subject: `A new article is ready for your review: "${articleTitle}"`,
		text: `The article "${articleTitle}" is ready for your review.\n\nOpen your dashboard:\n\n${dashboardLink}`,
		html: `
<p>The article <strong>"${articleTitle}"</strong> is ready for your review.</p>
<p><a href="${dashboardLink}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Go to dashboard</a></p>
`,
	});
}

export async function sendDirectorArticleReadyEmail(
	to: string,
	articleTitle: string,
	dashboardLink: string,
): Promise<void> {
	await transporter.sendMail({
		from: FROM,
		to,
		subject: `An article is ready for your approval: "${articleTitle}"`,
		text: `The article "${articleTitle}" is ready for your approval.\n\nOpen your dashboard:\n\n${dashboardLink}`,
		html: `
<p>The article <strong>"${articleTitle}"</strong> is ready for your approval.</p>
<p><a href="${dashboardLink}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Go to dashboard</a></p>
`,
	});
}
