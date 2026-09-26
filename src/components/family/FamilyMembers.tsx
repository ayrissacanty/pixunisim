import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFamilyMember } from "@/lib/family/members.functions";
import { useFamilyMembers } from "@/lib/planner";

/** Parent-only roster: add a spouse or child with their own login. */
export function FamilyMembers() {
  const { data } = useFamilyMembers();
  const qc = useQueryClient();
  const add = useServerFn(addFamilyMember);
  const [form, setForm] = useState({ displayName: "", email: "", password: "", role: "student" as "student" | "parent" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isParent = data?.me?.family_role === "parent";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await add({ data: form });
      setMsg(`${form.displayName} can now sign in with ${form.email}.`);
      setForm({ displayName: "", email: "", password: "", role: "student" });
      void qc.invalidateQueries({ queryKey: ["family-members"] });
      void qc.invalidateQueries({ queryKey: ["family-report"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not add that person.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="block-panel bg-card p-4" data-testid="family-members">
      <h2 className="text-lg font-bold">Family members</h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {(data?.members ?? []).map((m) => (
          <li key={m.id} className="flex items-center justify-between border-2 border-border bg-background px-3 py-2 text-sm">
            <span className="font-semibold">{m.display_name}</span>
            <span className="text-xs uppercase text-muted-foreground">{m.family_role ?? "member"}</span>
          </li>
        ))}
      </ul>

      {isParent ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fm-name">Name</Label>
            <Input id="fm-name" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="fm-role">Role</Label>
            <select
              id="fm-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as "student" | "parent" })}
              className="h-9 w-full border border-input bg-background px-2 text-sm"
            >
              <option value="student">Child (student)</option>
              <option value="parent">Spouse (parent)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="fm-email">Email</Label>
            <Input id="fm-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="fm-pw">Password</Label>
            <Input id="fm-pw" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              <UserPlus className="size-4" /> {busy ? "Adding…" : "Add family member"}
            </Button>
            {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Only a parent can add family members.</p>
      )}
    </section>
  );
}
