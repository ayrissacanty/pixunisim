import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  displayName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  role: z.enum(["student", "parent"]),
});

/**
 * A household parent creates a login for a spouse or child. The new account
 * joins the caller's family through the signup trigger (family_code metadata),
 * so each person gets their own profile, lessons, quests and Backpack.
 */
export const addFamilyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: me } = await context.supabase
      .from("profiles")
      .select("family_id, family_role")
      .eq("id", context.userId)
      .maybeSingle();
    if (!me?.family_id || me.family_role !== "parent") {
      throw new Error("Only a family parent can add members.");
    }
    const { data: fam } = await context.supabase
      .from("families")
      .select("family_code")
      .eq("id", me.family_id)
      .maybeSingle();
    if (!fam?.family_code) throw new Error("Family not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.displayName,
        family_code: fam.family_code,
        family_role: data.role,
      },
    });
    if (error) throw new Error(error.message);
    return { id: created.user?.id ?? null };
  });
