'use server' 

import { createTransport, getTestMessageUrl } from "nodemailer";
import { escapeMailText, receiptBookingLink } from "./mailRendering";

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
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";

  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
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
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const primaryColor = "#8b5cf6";
  const borderColor = "#e5e7eb";

  return `
    <body style="background: ${backgroundColor}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: ${backgroundColor}; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: ${mainBackgroundColor}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 2px solid ${primaryColor};">
                  <h1 style="margin: 0; font-size: 28px; color: ${primaryColor}; font-weight: bold;">Appointment request received</h1>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 40px 20px 40px;">
                  <p style="margin: 0; font-size: 16px; color: ${textColor}; line-height: 1.6;">
                    Hi ${escapeMailText(params.clientName)},
                  </p>
                  <p style="margin: 15px 0 0 0; font-size: 16px; color: ${textColor}; line-height: 1.6;">
                    We received your pending request. This receipt does not confirm availability, candidacy, credentials, clinical authorization, safety, outcomes, or payment readiness.
                  </p>
                </td>
              </tr>

              <!-- Appointment Details -->
              <tr>
                <td style="padding: 20px 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8f9fa; border-radius: 8px; border: 1px solid ${borderColor};">
                    <tr>
                      <td style="padding: 25px;">
                        <h2 style="margin: 0 0 20px 0; font-size: 18px; color: ${textColor}; font-weight: 600;">Requested details</h2>

                        <table width="100%" border="0" cellspacing="0" cellpadding="8">
                          <tr>
                            <td style="font-size: 14px; color: #6b7280; width: 120px;">Service:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${escapeMailText(params.serviceName)}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Provider:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${escapeMailText(params.providerName)}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Date:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${escapeMailText(params.appointmentDate)}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Time:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${escapeMailText(params.appointmentTime)}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #6b7280;">Duration:</td>
                            <td style="font-size: 14px; color: ${textColor}; font-weight: 500;">${escapeMailText(params.duration)} minutes</td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Important Info -->
              <tr>
                <td style="padding: 20px 40px;">
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                      <strong>No appointment has been confirmed.</strong> The operator must review the request before communicating any next step.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; border-top: 1px solid ${borderColor}; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    Keep this email only as a receipt of the submitted request.
                  </p>
                  <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af;">
                    Appointment request receipt
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  `;
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
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const primaryColor = "#8b5cf6";

  return `
    <body style="background: ${backgroundColor}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: ${backgroundColor}; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: ${mainBackgroundColor}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, ${primaryColor}, #a78bfa); border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; font-size: 32px; color: #ffffff; font-weight: bold;">You've Received a Gift Card!</h1>
                  <p style="margin: 10px 0 0 0; font-size: 18px; color: #f3e8ff;">From ${escapeMailText(params.senderName)}</p>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 30px 40px 20px 40px;">
                  <p style="margin: 0; font-size: 16px; color: ${textColor}; line-height: 1.6;">
                    Hi ${escapeMailText(params.recipientName)},
                  </p>
                  ${params.message ? `
                    <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-left: 4px solid ${primaryColor}; border-radius: 4px;">
                      <p style="margin: 0; font-size: 15px; color: ${textColor}; font-style: italic; line-height: 1.6;">
                        "${escapeMailText(params.message)}"
                      </p>
                    </div>
                  ` : ''}
                </td>
              </tr>

              <!-- Gift Card Amount -->
              <tr>
                <td style="padding: 20px 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #faf5ff, #f3e8ff); border-radius: 8px; border: 2px solid ${primaryColor};">
                    <tr>
                      <td style="padding: 30px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Gift Card Value</p>
                        <p style="margin: 10px 0 20px 0; font-size: 48px; color: ${primaryColor}; font-weight: bold;">$${params.amount.toFixed(2)}</p>
                        <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Gift Card Code</p>
                        <p style="margin: 10px 0 0 0; font-size: 24px; color: ${textColor}; font-weight: bold; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                          ${escapeMailText(params.code)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Redemption Instructions -->
              <tr>
                <td style="padding: 20px 40px 40px 40px;">
                  <h3 style="margin: 0 0 15px 0; font-size: 18px; color: ${textColor};">How to Use Your Gift Card</h3>
                  <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: ${textColor}; line-height: 1.8;">
                    <li>Keep this code private</li>
                    <li>Contact the practice to review the accepted terms and balance</li>
                    <li>Confirm available redemption options before booking</li>
                  </ol>
                  ${receiptBookingLink(process.env.SMTP_STORE_LINK) ? `<div style="margin-top: 20px; text-align: center;">
                    <a href="${receiptBookingLink(process.env.SMTP_STORE_LINK)}" style="display: inline-block; padding: 15px 30px; background: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Book Your Appointment
                    </a>
                  </div>` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
                    Contact the practice to review the accepted gift card terms and available redemption options.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  `;
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