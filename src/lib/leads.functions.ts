import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255),
  consent: z.boolean(),
  calc_type: z.string().max(64).optional(),
  calc_payload: z.unknown().optional(),
});

export const submitCalcLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    if (!data.consent) throw new Error("Zustimmung erforderlich");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("calc_email_leads").insert({
      email: data.email,
      consent: data.consent,
      calc_type: data.calc_type ?? null,
      calc_payload: (data.calc_payload as any) ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
