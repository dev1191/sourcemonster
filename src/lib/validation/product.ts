import { z } from "zod";

export const productSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  shortDescription: z.string().min(5, "Short description is required"),
  description: z.string().min(10, "Full description must be at least 10 characters"),
  thumbnailMediaId: z.string().uuid().optional().nullable(),
  codecanyonUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  documentationUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  version: z.string().optional().or(z.literal("")),
  technologies: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  seoTitle: z.string().optional().or(z.literal("")),
  seoDescription: z.string().optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;

