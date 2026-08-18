import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AVATAR, type CharacterId } from "@/lib/characters";
import { DEFAULT_PORTRAIT, normalizePortrait, type Portrait } from "@/lib/portrait";
import {
  DEFAULT_MASCOT,
  normalizeMascot,
  useMascotStore,
  type Mascot,
} from "@/lib/mascot";

export interface Profile {
  id: string;
  display_name: string;
  avatar: CharacterId;
  portrait: Portrait;
  mascot: Mascot;
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
        .select("id, display_name, avatar, portrait, mascot_color, mascot_accessory")
        .eq("id", uid)
        .maybeSingle();
      if (!data) return null;
      const mascot = normalizeMascot(data.mascot_color, data.mascot_accessory);
      // Mirror into the store so the Phaser scene can read it synchronously.
      useMascotStore.getState().setMascot(mascot);
      return {
        id: data.id,
        display_name: data.display_name,
        avatar: (data.avatar as CharacterId) ?? DEFAULT_AVATAR,
        portrait: normalizePortrait(data.portrait),
        mascot,
      };
    },
  });
}

/** The student's chosen character, with a safe default before the fetch lands. */
export function useAvatar(): CharacterId {
  const { data } = useProfile();
  return data?.avatar ?? DEFAULT_AVATAR;
}

/** The student's 2D dialogue portrait selection. */
export function usePortrait(): Portrait {
  const { data } = useProfile();
  return data?.portrait ?? DEFAULT_PORTRAIT;
}

/** The student's mascot personalization (base colour + one accessory). */
export function useMascot(): Mascot {
  const { data } = useProfile();
  return data?.mascot ?? DEFAULT_MASCOT;
}

export function useSaveMascot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mascot: Mascot) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ mascot_color: mascot.color, mascot_accessory: mascot.accessory })
        .eq("id", uid);
      if (error) throw error;
      useMascotStore.getState().setMascot(mascot);
      return mascot;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}


export function useSavePortrait() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (portrait: Portrait) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ portrait }).eq("id", uid);
      if (error) throw error;
      return portrait;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["profile"] }),
  });
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
