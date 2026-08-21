import { useQuery } from "@tanstack/react-query";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Shows the household's join code so a parent can invite students. */
export function FamilyCode() {
  const { data } = useQuery({
    queryKey: ["family-code"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("families")
        .select("family_name, family_code")
        .limit(1);
      return (rows?.[0] ?? null) as { family_name: string; family_code: string } | null;
    },
  });

  if (!data) return null;

  return (
    <section
      data-testid="family-code"
      className="block-panel border-border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" /> {data.family_name} · join code
        </p>
        <p className="mt-1 font-display text-2xl font-black tracking-[0.2em]">
          {data.family_code}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => {
          void navigator.clipboard?.writeText(data.family_code);
          toast.success("Family code copied");
        }}
      >
        <Copy className="size-4" /> Copy code
      </Button>
    </section>
  );
}
