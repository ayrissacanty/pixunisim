import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFamily, joinFamily } from "@/lib/family/membership";
import alleyMascot from "@/assets/alley-mascot.png";

type Intent = "create" | "join" | "signin";

const isIntent = (value: unknown): value is Intent =>
  value === "create" || value === "join" || value === "signin";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { intent?: Intent } =>
    isIntent(search["intent"]) ? { intent: search["intent"] } : {},
  head: () => ({
    meta: [
      { title: "Create or join a family — Unify University" },
      {
        name: "description",
        content:
          "Start a homeschool household or join one with a family code, then step onto the Unify University campus.",
      },
      { property: "og:title", content: "Create or join a family — Unify University" },
      {
        property: "og:description",
        content:
          "Start a homeschool household or join one with a family code, then step onto the Unify University campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const COPY: Record<Intent, { title: string; blurb: string; cta: string }> = {
  create: {
    title: "Create a Family",
    blurb: "You'll be the parent account: you hold the roster, the reports and the family code.",
    cta: "Create family account",
  },
  join: {
    title: "Join a Family",
    blurb: "Enter the family code a parent shared with you to join their household on campus.",
    cta: "Join with code",
  },
  signin: {
    title: "Return to campus",
    blurb: "Your student record follows you across the campus world and the workspace.",
    cta: "Sign in",
  },
};

function AuthPage() {
  const navigate = useNavigate();
  const { intent: initialIntent } = Route.useSearch();
  const [intent, setIntent] = useState<Intent>(initialIntent ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = COPY[intent];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (intent === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        void navigate({ to: "/campus" });
        return;
      }

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/campus`,
          data: { display_name: name || email.split("@")[0] },
        },
      });
      if (err) throw err;

      if (!data.session) {
        setNotice(
          "Check your email to confirm the account, then sign in — we'll finish setting up the family right after.",
        );
        return;
      }

      if (intent === "create") {
        const code = await createFamily(familyName);
        setNotice(`Family created. Your family code is ${code}.`);
        void navigate({ to: "/family" });
      } else {
        await joinFamily(familyCode, "student");
        void navigate({ to: "/campus" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/campus" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-sidebar px-4 py-10">
      <div className="block-panel-lg w-full max-w-md border-accent/60 bg-card p-6 text-card-foreground">
        <Link to="/" className="text-[11px] uppercase tracking-widest text-muted-foreground">
          ← Unify University
        </Link>

        <div className="mt-3 flex items-start gap-3">
          <img
            src={alleyMascot}
            alt="Alley the AI teacher mascot"
            width={816}
            height={816}
            className="h-12 w-12 shrink-0 [image-rendering:pixelated]"
          />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{copy.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{copy.blurb}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {(["create", "join", "signin"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setIntent(value)}
              aria-pressed={intent === value}
              className={`block-chip px-2 py-2 text-[11px] font-bold uppercase tracking-wide ${
                intent === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {value === "create" ? "Create" : value === "join" ? "Join" : "Sign in"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {intent === "create" && (
            <div>
              <Label htmlFor="familyName">Family name</Label>
              <Input
                id="familyName"
                required
                placeholder="The Canty Family"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>
          )}
          {intent === "join" && (
            <div>
              <Label htmlFor="familyCode">Family code</Label>
              <Input
                id="familyCode"
                required
                autoCapitalize="characters"
                placeholder="ABC123"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
              />
            </div>
          )}
          {intent !== "signin" && (
            <div>
              <Label htmlFor="name">{intent === "create" ? "Your name" : "Student name"}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : copy.cta}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={() => void google()}>
          Continue with Google
        </Button>
      </div>
    </main>
  );
}
