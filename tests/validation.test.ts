import { describe, it, expect } from "vitest";
import { leadSubmissionSchema, escapeHtml } from "../src/lib/validation/lead";
import { projectSchema, productSchema } from "../src/lib/validation/project";
import { faqSchema } from "../src/lib/validation/faq";

describe("Validation Schemas & HTML Sanitization", () => {
  describe("Lead Submission Schema", () => {
    it("should accept valid lead submissions", () => {
      const valid = {
        name: "Alex Mercer",
        email: "alex@mercer.dev",
        service: "Custom Engineering",
        message: "Need a full-stack SaaS platform built with Astro and PostgreSQL.",
      };
      const result = leadSubmissionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email and short messages", () => {
      const invalid = {
        name: "A",
        email: "not-an-email",
        message: "hi",
      };
      const result = leadSubmissionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.email).toBeDefined();
        expect(errors.name).toBeDefined();
        expect(errors.message).toBeDefined();
      }
    });

    it("should properly sanitize and escape HTML in email templates", () => {
      const dirty = `<script>alert('pwned')</script> & "hello" 'world'`;
      const clean = escapeHtml(dirty);
      expect(clean).not.toContain("<script>");
      expect(clean).toContain("&lt;script&gt;");
      expect(clean).toContain("&amp;");
      expect(clean).toContain("&quot;hello&quot;");
      expect(clean).toContain("&#039;world&#039;");
    });
  });

  describe("Product Validation Schema", () => {
    it("should accept valid product inputs", () => {
      const valid = {
        title: "MonsterSaaS Boilerplate",
        slug: "monstersaas-boilerplate",
        shortDescription: "A turnkey SaaS starter kit.",
        description: "Full architectural details and tech stack overview...",
        status: "published" as const,
        technologies: ["Astro", "PostgreSQL"],
        features: ["Multi-tenancy", "Stripe billing"],
      };
      const result = productSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject slugs with uppercase letters or special symbols", () => {
      const invalid = {
        title: "Test Product",
        slug: "Invalid_Slug!123",
        shortDescription: "Short desc",
        description: "Full description text here.",
      };
      const result = productSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.slug).toBeDefined();
      }
    });
  });

  describe("FAQ Validation Schema", () => {
    it("should accept valid FAQ inputs", () => {
      const valid = {
        question: "Can I use this product for commercial client work?",
        answer: "Yes, all our commercial templates include commercial usage rights.",
        category: "Licensing",
        sortOrder: 1,
        isPublished: true,
      };
      const result = faqSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("should reject questions or answers that are too short", () => {
      const invalid = {
        question: "Hi",
        answer: "",
      };
      const result = faqSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.question).toBeDefined();
        expect(errors.answer).toBeDefined();
      }
    });
  });
});

