import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Gavel, Users, KeyRound, Sparkles, Repeat2 } from "lucide-react";
import { CourtHeader } from "@/components/CourtHeader";
import { CourtroomStage } from "@/components/courtroom3d/CourtroomStage";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserToken, randomSlug } from "@/lib/browserToken";
import { toast } from "sonner";

const schema = z.object({
  accused: z.string().trim().min(1, "Who's on trial?").max(40, "Keep it short."),
  crime: z.string().trim().min(3, "Tell the court what happened.").max(140),
  sentence: z.string().trim().max(120).optional(),
  length: z.enum(["2m", "10m", "1h", "24h"]),
});

const LENGTH_MS: Record<string, number> = {
  "2m": 2 * 60_000,
  "10m": 10 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
};

export default function Index() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const revengeOf = params.get("revenge")?.trim() || "";
  const [accused, setAccused] = useState("");
  const [crime, setCrime] = useState("");
  const [sentence, setSentence] = useState("");
  const [length, setLength] = useState<"2m" | "10m" | "1h" | "24h">("2m");
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Prefill from revenge param exactly once
  useEffect(() => {
    if (revengeOf) {
      setAccused(revengeOf);
      setCrime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revengeOf]);

  const summon = async () => {
    const parsed = schema.safeParse({ accused, crime, sentence: sentence || undefined, length });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const slug = randomSlug(6);
    const token = getBrowserToken();
    const { data, error } = await supabase
      .from("instant_trials")
      .insert({
        slug,
        accused_name: parsed.data.accused,
        crime_text: parsed.data.crime,
        suggested_sentence: parsed.data.sentence ?? null,
        closes_at: new Date(Date.now() + LENGTH_MS[length]).toISOString(),
        creator_browser_token: token,
      })
      .select("id,slug")
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error("Court is offline. Try again.");
      return;
    }
    const { markMyTrial } = await import("@/lib/browserToken");
    markMyTrial((data as any).id);
    markMyTrial((data as any).slug);
    nav(`/t/${data.slug}/share`);

  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    nav(`/r/${c}`);
  };

  const formReady = accused.trim().length > 0 && crime.trim().length >= 3;
  const stageVariant: "ambient" | "hero" = loading || formReady ? "hero" : "ambient";

  return (
    <div className="min-h-dvh relative overflow-hidden">
      <CourtHeader />

      <main className="relative px-5 pb-16 max-w-md mx-auto">
        {/* Cinematic courtroom stage behind the filing */}
        <div className="pointer-events-none absolute -inset-x-8 sm:-inset-x-20 top-0 bottom-0 z-0">
          <CourtroomStage
            phase="summons"
            variant={stageVariant}
            joinedCount={0}
            votedCount={loading ? 1 : 0}
            juryComplete={false}
            className="absolute inset-0"
          />
        </div>

        <div className="relative z-10">
        <section className="pt-4">
          {revengeOf ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.3em] text-accent inline-flex items-center gap-2">
                <Repeat2 className="w-3.5 h-3.5" /> Revenge case
              </p>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mt-2 text-balance">
                <span className="text-primary">{revengeOf}</span> is appealing the verdict.
              </h1>
              <p className="mt-3 text-muted-foreground text-balance">
                File the counter-case. The group decides this one too.
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.3em] text-accent">⚖ Court is in session</p>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mt-2 text-balance">
                File a case against <span className="text-primary">the group chat.</span>
              </h1>
              <p className="mt-3 text-muted-foreground text-balance">
                Private courtroom. Summon the jury, watch the verdict drop live.
              </p>
            </>
          )}
        </section>

        <section
          className={`mt-7 court-card p-5 sm:p-6 animate-rise relative transition-all duration-500 ${
            formReady ? "shadow-[var(--shadow-stamp)] ring-1 ring-[hsl(var(--stamp)/0.4)]" : ""
          } ${loading ? "animate-pulse-glow" : ""}`}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] tracking-[0.3em] font-stamp bg-[hsl(var(--stamp))] text-primary-foreground shadow-[var(--shadow-stamp)] uppercase">
              {loading ? "Filing case…" : "Case File"}
            </span>
          </div>

          <div className="space-y-4 mt-2">
            <Field label="Who / what is on trial?" hint="Nicknames work best. Keep it private.">
              <input
                value={accused}
                onChange={(e) => setAccused(e.target.value)}
                placeholder="e.g. Marcus, the flat, someone, the group chat"
                maxLength={40}
                className="court-input"
              />
            </Field>
            <Field label={revengeOf ? "What are they appealing?" : "What's the charge?"}>
              <textarea
                value={crime}
                onChange={(e) => setCrime(e.target.value)}
                placeholder={
                  revengeOf
                    ? "e.g. Now they're appealing the verdict — claims the jury was biased."
                    : "e.g. Said they were 5 minutes away while still in bed."
                }
                maxLength={140}
                rows={3}
                className="court-input resize-none"
              />
              <div className="text-[11px] text-muted-foreground text-right mt-1">{crime.length}/140</div>
            </Field>
            <Field label="Suggested sentence" hint="Optional. We'll invent one if you don't.">
              <input
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="e.g. Buys snacks next time."
                maxLength={120}
                className="court-input"
              />
            </Field>
            <Field label="How long should court stay open?">
              <div className="grid grid-cols-4 gap-2">
                {(["2m", "10m", "1h", "24h"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLength(opt)}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      length === opt
                        ? "bg-accent text-accent-foreground border-accent shadow-[var(--shadow-gold)]"
                        : "bg-secondary/40 border-border text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </Field>

            <button
              onClick={summon}
              disabled={loading}
              className={`btn-hero w-full text-lg disabled:opacity-60 transition-all ${
                formReady ? "animate-pulse-glow scale-[1.01]" : ""
              }`}
            >
              <Gavel className={`w-5 h-5 ${loading ? "animate-gavel-slam" : ""}`} />
              {loading ? "Summoning…" : revengeOf ? "File Revenge Case" : "Summon the Jury"}
            </button>
          </div>
        </section>

        {/* Secondary: Party Court + join code, visually quieter */}
        <section className="mt-4 grid grid-cols-2 gap-2.5 opacity-90">
          <Link to="/party/new" className="btn-ghost-court text-xs">
            <Users className="w-3.5 h-3.5" /> Party Court
          </Link>
          <form onSubmit={join} className="flex">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={6}
              className="court-input rounded-r-none uppercase tracking-widest text-center text-xs"
            />
            <button className="btn-ghost-court rounded-l-none px-3" type="submit" aria-label="Join with code">
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">How it works</p>
          <ol className="space-y-2">
            {[
              "File the case.",
              "Send the summons.",
              "The group decides.",
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-3 court-card p-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-accent to-[hsl(var(--gold-deep))] text-accent-foreground font-bold flex items-center justify-center text-sm">
                  {i + 1}
                </span>
                <span className="text-sm pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 court-card p-4">
          <div className="flex items-center gap-2 text-accent">
            <Sparkles className="w-4 h-4" />
            <p className="text-xs uppercase tracking-[0.25em]">Coming later</p>
          </div>
          <p className="text-sm mt-2 text-muted-foreground">
            Premium case packs · Custom verdict card themes · Saved group history · Big-screen host view · Community court packs.
          </p>
        </section>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Private group court. Keep it in the group. No private details, threats, or serious claims.{" "}
          <Link to="/about" className="underline underline-offset-2">Read the rules</Link>.
        </p>
        </div>
      </main>

      <style>{`
        .court-input {
          width: 100%;
          background: hsl(var(--secondary) / 0.5);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 0.875rem;
          padding: 0.75rem 0.9rem;
          font-size: 0.95rem;
          outline: none;
          transition: border-color .15s, background .15s;
        }
        .court-input::placeholder { color: hsl(var(--muted-foreground)); }
        .court-input:focus { border-color: hsl(var(--accent)); background: hsl(var(--secondary) / 0.8); }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground/80">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
