import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AVATAR, type CharacterId } from "@/lib/characters";

export interface Profile {
  id: string;
  display_name: string;
  avatar: CharacterId;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar")
        .eq("id", uid)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        display_name: data.display_name,
        avatar: (data.avatar as CharacterId) ?? DEFAULT_AVATAR,
      };
    },
  });
}

/** The student's chosen character, with a safe default before the fetch lands. */
export function useAvatar(): CharacterId {
  const { data } = useProfile();
  return data?.avatar ?? DEFAULT_AVATAR;
}

export function useSaveAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (avatar: CharacterId) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ avatar }).eq("id", uid);
      if (error) throw error;
      return avatar;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
