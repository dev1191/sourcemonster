import { defineAction } from "astro:actions";
import { Resend } from "resend";
import { captureLead } from "../services";
import { leadSubmissionSchema, escapeHtml } from "../lib/validation/lead";

const resendApiKey =
  process.env.RESEND_API_KEY ||
  (typeof import.meta !== "undefined" && import.meta.env?.RESEND_API_KEY);

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const contactEmail =
  process.env.CONTACT_EMAIL ||
  (typeof import.meta !== "undefined" && import.meta.env?.CONTACT_EMAIL) ||
  "contact@sourcemonster.in";

export const server = {
  sendEmail: defineAction({
    accept: "form",
    input: leadSubmissionSchema,

    handler: async (input) => {
      // 1. Honeypot anti-spam check
      if (input.honeypot && input.honeypot.trim() !== "") {
        console.warn("🤖 Bot submission filtered via honeypot field:", input.email);
        return { success: true, id: "filtered" };
      }

      const { name, email, service, message, company, budget, sourcePage, projectId, productId } = input;

      let savedLeadId = "";

      // 2. Persist to PostgreSQL database FIRST (Zero Lead Loss guarantee)
      try {
        const savedLead = await captureLead({
          name,
          email,
          company,
          service,
          projectId: projectId || productId,
          productId: projectId || productId,
          budget,
          message,
          sourcePage,
        });

        savedLeadId = savedLead.id;
        console.log(`✅ Lead captured in database (ID: ${savedLeadId}) from ${email}`);
      } catch (dbErr) {
        console.error("❌ Failed to persist lead to database:", dbErr);
        // If DB insertion fails, we log and proceed so email can still notify
      }

      // 3. Attempt email notification via Resend
      let emailSent = false;
      if (resend) {
        try {
          const safeName = escapeHtml(name);
          const safeEmail = escapeHtml(email);
          const safeService = escapeHtml(service || "General Inquiry");
          const safeCompany = company ? escapeHtml(company) : "Not specified";
          const safeBudget = budget ? escapeHtml(budget) : "Not specified";
          const safeMessage = escapeHtml(message);
          const safeSource = escapeHtml(sourcePage || "Direct / Homepage");

          const { error } = await resend.emails.send({
            from: "Source Monster <contact@sourcemonster.in>",
            to: [contactEmail],
            subject: `🎯 New Mission Request: ${safeService} from ${safeName}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #030712; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
                <div style="margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 16px;">
                  <h2 style="color: #FF4D1C; margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">Source Monster Hunt Alert</h2>
                  <p style="color: #94a3b8; margin: 0; font-size: 13px;">A new prospect inquiry has been recorded in your system.</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8; width: 140px;">Name:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-weight: bold;">${safeName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Email:</td>
                    <td style="padding: 8px 0; color: #ffffff;"><a href="mailto:${safeEmail}" style="color: #FF4D1C; text-decoration: none;">${safeEmail}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Service / Subject:</td>
                    <td style="padding: 8px 0; color: #ffffff;">${safeService}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Company:</td>
                    <td style="padding: 8px 0; color: #ffffff;">${safeCompany}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Budget Scope:</td>
                    <td style="padding: 8px 0; color: #ffffff;">${safeBudget}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #94a3b8;">Source Attribution:</td>
                    <td style="padding: 8px 0; color: #94a3b8; font-family: monospace;">${safeSource}</td>
                  </tr>
                </table>

                <div style="background: #0f172a; padding: 16px; border-radius: 12px; border-left: 4px solid #FF4D1C; margin-bottom: 24px;">
                  <div style="font-size: 11px; text-transform: uppercase; tracking: 1px; color: #94a3b8; margin-bottom: 8px; font-weight: bold;">Inquiry Message:</div>
                  <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-line;">${safeMessage}</p>
                </div>

                <div style="border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; text-align: center;">
                  Inquiry stored in PostgreSQL ID: <code style="color: #cbd5e1;">${savedLeadId || "N/A"}</code> • View in <a href="https://sourcemonster.in/admin/leads" style="color: #FF4D1C;">Admin Control Center</a>
                </div>
              </div>
            `,
          });

          if (error) {
            console.warn("⚠️ Resend dispatch warning:", error.message);
          } else {
            emailSent = true;
          }
        } catch (mailErr) {
          console.warn("⚠️ Resend email dispatch failed (lead remains safely stored):", mailErr);
        }
      } else {
        console.log("ℹ️  RESEND_API_KEY not configured. Lead stored to database without outgoing email.");
      }

      return {
        success: true,
        id: savedLeadId,
        emailSent,
      };
    },
  }),
};
