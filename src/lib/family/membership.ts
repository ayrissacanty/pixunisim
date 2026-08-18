import { supabase } from "@/integrations/supabase/client";

type RpcFn = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const rpc = supabase.rpc.bind(supabase) as unknown as RpcFn;

/** Creates a household, makes the current user its parent, returns the family code. */
export async function createFamily(familyName: string): Promise<string> {
  const { data, error } = await rpc("create_family", { _family_name: familyName });
  if (error) throw new Error(error.message);
  return String(data);
}

/** Joins an existing household by code. Throws when the code is unknown. */
export async function joinFamily(
  familyCode: string,
  role: "student" | "parent" = "student",
): Promise<string> {
  const { data, error } = await rpc("join_family", {
    _family_code: familyCode,
    _role: role,
  });
  if (error) throw new Error(error.message);
  return String(data);
}
