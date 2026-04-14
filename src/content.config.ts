import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const services = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "./src/content/services" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		icon: z.string(),
		color: z.string(),
		delay: z.number().optional(),
	}),
});

const team = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "./src/content/team" }),
	schema: z.object({
		name: z.string(),
		role: z.string(),
		img: z.string(),
		color: z.string(),
	}),
});

const testimonials = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "./src/content/testimonials" }),
	schema: z.object({
		name: z.string(),
		role: z.string(),
		quote: z.string(),
		delay: z.number().optional(),
		color: z.string().optional(),
	}),
});

const workflow = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "./src/content/workflow" }),
	schema: z.object({
		step: z.string(),
		title: z.string(),
		description: z.string(),
		icon: z.string(),
		delay: z.number().optional(),
		color: z.string().optional(),
	}),
});

export const collections = { services, team, testimonials, workflow };
