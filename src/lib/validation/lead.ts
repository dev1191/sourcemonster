import { z } from "zod";

export const leadSubmissionSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  service: z.string().trim().optional().default("General Inquiry"),
  message: z.string().trim().min(5, "Message must be at least 5 characters long."),
  company: z.string().trim().optional(),
  budget: z.string().trim().optional(),
  sourcePage: z.string().trim().optional(),
  projectId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  honeypot: z.string().optional(),
});

export type LeadSubmissionInput = z.infer<typeof leadSubmissionSchema>;

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "converted",
  "rejected",
]);

export type LeadStatus = z.infer<typeof leadStatusSchema>;

// Helper to escape HTML characters in email templates to prevent XSS / HTML injection
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

