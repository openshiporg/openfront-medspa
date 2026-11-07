'use server' 

import { createTransport, getTestMessageUrl } from "nodemailer";
import { escapeMailText, receiptBookingLink } from "./mailRendering";
import { emailButton, emailHeading, emailLayout, emailMuted, emailPanel, emailParagraph } from "./email-layout";

// Utility function to get base URL for emails
function getBaseUrlForEmails(): string {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  
  // Fallback warning - this should be set in production
  console.warn('SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.');
  return '';
}

function hasSmtpConfiguration() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

const transport = createTransport({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

function passwordResetEmail({ url }: { url: string }): string {
  return emailLayout({
    preheader: "Use this link to choose a new password.",
    title: "Reset your password",
    body: `${emailParagraph("We received a request to reset the password for your account. Use the button below to choose a new one.")}
${emailButton("Reset password", url)}
${emailMuted("If you did not request this, you can safely ignore this email. Your password will not change.")}`,
  });
}

export async function sendPasswordResetEmail(resetToken: string, to: string, baseUrl?: string): Promise<void> {
  // Use provided baseUrl or fall back to utility function
  const frontendUrl = baseUrl || getBaseUrlForEmails();

  // email the user a token
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`,
    }),
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`📧 Message Sent!  Preview it at ${getTestMessageUrl(info as any)}`);
  }
}

function appointmentRequestReceiptEmail(params: {
  clientName: string;
  serviceName: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
}): string {
  return emailLayout({
    preheader: "We received your pending appointment request.",
    title: "Appointment request received",
    body: `${emailParagraph(`Hi ${escapeMailText(params.clientName)},`)}
${emailParagraph("We received your pending request. This receipt does not confirm availability, candidacy, credentials, clinical authorization, safety, outcomes, or payment readiness.")}
${emailHeading("Requested details")}
${emailPanel(`<strong>Service:</strong> ${escapeMailText(params.serviceName)}<br><strong>Provider:</strong> ${escapeMailText(params.providerName)}<br><strong>Date:</strong> ${escapeMailText(params.appointmentDate)}<br><strong>Time:</strong> ${escapeMailText(params.appointmentTime)}<br><strong>Duration:</strong> ${escapeMailText(params.duration)} minutes`)}
${emailParagraph("<strong>No appointment has been confirmed.</strong> The operator must review the request before communicating any next step.")}
${emailMuted("Keep this email only as a receipt of the submitted request.")}`,
  });
}

export async function sendAppointmentRequestReceipt(params: {
  to: string;
  clientName: string;
  serviceName: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
}): Promise<void> {
  if (!hasSmtpConfiguration()) return;

  try {
    const info = await transport.sendMail({
      to: params.to,
      from: process.env.SMTP_FROM,
      subject: `Appointment request received - ${params.appointmentDate} at ${params.appointmentTime}`,
      html: appointmentRequestReceiptEmail(params),
      text: `Hi ${params.clientName},\nYour appointment request is pending and has not been confirmed.\nService: ${params.serviceName}\nProvider preference: ${params.providerName}\nRequested date/time: ${params.appointmentDate} at ${params.appointmentTime}\nDuration: ${params.duration} minutes.\nThe practice must review your request before any appointment, treatment or payment is confirmed.`,
    });

    if (process.env.SMTP_USER?.includes("ethereal.email")) {
      console.log(`📧 Appointment request receipt sent. Preview: ${getTestMessageUrl(info as any)}`);
    }
  } catch (error) {
    console.error("Failed to send appointment request receipt:", error);
    throw error;
  }
}

function giftCardEmail(params: {
  recipientName: string;
  senderName: string;
  amount: number;
  code: string;
  message?: string;
}): string {
  const bookingLink = receiptBookingLink(process.env.SMTP_STORE_LINK);
  return emailLayout({
    preheader: `${params.senderName} sent you a gift card.`,
    title: "You've received a gift card",
    body: `${emailParagraph(`Hi ${escapeMailText(params.recipientName)}, ${escapeMailText(params.senderName)} sent you a gift card.`)}
${params.message ? emailPanel(`&ldquo;${escapeMailText(params.message)}&rdquo;`) : ""}
${emailPanel(`<span style="font-size:13px;text-transform:uppercase;letter-spacing:1px;">Gift card value</span><br><span style="font-size:36px;font-weight:700;line-height:48px;">$${params.amount.toFixed(2)}</span><br><span style="font-size:13px;text-transform:uppercase;letter-spacing:1px;">Code</span><br><span style="font-family:Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:2px;">${escapeMailText(params.code)}</span>`, "center")}
${emailHeading("How to use it")}
${emailParagraph("Keep this code private. Contact the practice to review the accepted terms and balance, and confirm available redemption options before booking.")}
${bookingLink ? emailButton("Book your appointment", bookingLink) : ""}`,
  });
}

export async function sendGiftCardEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  amount: number;
  code: string;
  message?: string;
}): Promise<void> {
  try {
    const info = await transport.sendMail({
      to: params.to,
      from: process.env.SMTP_FROM,
      subject: `You've Received a $${params.amount} Gift Card from ${params.senderName}!`,
      html: giftCardEmail(params),
      text: `Hi ${params.recipientName},\n${params.senderName} sent a gift card for $${params.amount.toFixed(2)}.\nCode: ${params.code}\n${params.message || ''}\nContact the practice to review the accepted terms and redemption options.`, 
    });

    if (process.env.SMTP_USER?.includes("ethereal.email")) {
      console.log(`📧 Gift card email sent! Preview: ${getTestMessageUrl(info as any)}`);
    }
  } catch (error) {
    console.error("Failed to send gift card email:", error);
    throw error;
  }
}