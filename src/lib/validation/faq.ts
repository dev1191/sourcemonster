import { z } from "zod";

export const faqSchema = z.object({
  question: z
    .string()
    .min(3, "Question must be at least 3 characters long")
    .max(500, "Question must be under 500 characters"),
  answer: z
    .string()
    .min(3, "Answer must be at least 3 characters long"),
  category: z
    .string()
    .min(2, "Category must be at least 2 characters")
    .max(100)
    .default("General"),
  sortOrder: z.coerce.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export type FAQInput = z.infer<typeof faqSchema>;

