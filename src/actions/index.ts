import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const server = {
  sendEmail: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().min(2, "Name must be at least 2 characters."),
      email: z.string().email("Please enter a valid email address."),
      service: z.string(),
      message: z.string().min(10, "Message must be at least 10 characters long."),
    }),

    handler: async (input) => {
      const { name, email, service, message } = input;

      try {
        const { data, error } = await resend.emails.send({
          from: 'Source Monster <contact@sourcemonster.in>', // Update this with your verified domain
          to: [import.meta.env.CONTACT_EMAIL || 'contact@sourcemonster.in'],
          subject: `New Project Hunt: ${service} from ${name}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #FF4D1C;">New Mission Request</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Service:</strong> ${service}</p>
              <p><strong>Message:</strong></p>
              <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #FF4D1C;">${message}</p>
            </div>
          `,
        });

        if (error) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        return { success: true, id: data?.id };
      } catch (err) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to send email",
        });
      }
    },
  }),
};
