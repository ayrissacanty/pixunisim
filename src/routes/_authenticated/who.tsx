import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFamilyMembers, type FamilyMemberRow } from "@/lib/planner";
import { clearCampusSnapshot } from "@/lib/campus/store";

export const Route = createFileRoute("/_authenticated/who")({
  head: () => ({
    meta: [
      { title: "Who's learning? — Unify University" },
      { name: "description", content: "Pick your family profile to continue your own lessons, quests and Backpack." },
      { property: "og:title", content: "Who's learning? — Unify University" },
      { property: "og:description", content: "Pick your family profile to continue your own lessons, quests and Backpack." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhoPage,
});

function WhoPage() {
  const { data } = useFamilyMembers();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<FamilyMemberRow | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (m: FamilyMemberRow) => {
    setError(null);
    setPassword("");
    if (m.id === data?.me?.id) {
      void navigate({ to: "/campus" });
      return;
    }
    setPicked(m);
  };

  const switchTo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked?.login_email) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: picked.login_email, password });
    if (err) {
      setError("That password didn't match. Try again.");
      setBusy(false);
      return;
    }
    // Nothing from the previous person may linger on this device.
    await qc.cancelQueries();
    qc.clear();
    clearCampusSnapshot();
    setBusy(false);
    void navigate({ to: "/campus", replace: true });
  };

  return (
    <main className="academy grid min-h-screen place-items-center bg-sidebar px-4 py-10">
      <div className="block-panel-lg w-full max-w-xl bg-card p-6 text-card-foreground">
        <h1 className="font-display text-3xl">Who's learning?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everyone keeps their own lessons, quests and Backpack.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(data?.members ?? []).map((m) => (
            <button
              key={m.id}
              type="button"
              data-testid="who-member"
              onClick={() => choose(m)}
              className={`block-btn flex flex-col items-center gap-2 border-border bg-background p-4 ${picked?.id === m.id ? "border-primary" : ""}`}
            >
              <span className="grid size-14 place-items-center bg-primary font-display text-3xl text-primary-foreground">
                {m.display_name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-bold">{m.display_name}</span>
              <span className="text-[11px] uppercase text-muted-foreground">
                {m.id === data?.me?.id ? "You" : m.family_role ?? "member"}
              </span>
            </button>
          ))}
        </div>

        {picked && (
          <form onSubmit={switchTo} className="mt-5 space-y-2">
            <p className="text-sm">Enter {picked.display_name}'s password</p>
            <Input type="password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || !picked.login_email}>
              {busy ? "Switching…" : `Continue as ${picked.display_name}`}
            </Button>
          </form>
        )}

        <div className="mt-6 flex gap-3 text-sm">
          <Link to="/family" className="underline">Family dashboard</Link>
          <Link to="/campus" className="underline">Back to campus</Link>
        </div>
      </div>
    </main>
  );
}
