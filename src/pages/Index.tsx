import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Gavel, Users, KeyRound, Repeat2, Check } from "lucide-react";
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

  useEffect(() => {
    if (revengeOf) {
      setAccused(revengeOf);
      setCrime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revengeOf]);

  const accusedDone = accused.trim().length > 0;
  const crimeDone = crime.trim().length >= 3;
  const formReady = accusedDone && crimeDone;

  const { badge, status } = useMemo(() => {
    if (loading) return { badge: "Summoning…", status: "Summons being issued." };
    if (formReady) return { badge: "Ready to summon", status: "Ready to summon." };
    if (crimeDone) return { badge: "Charge written", status: "Charge filed." };
    if (accusedDone) return { badge: "Subject named", status: "Subject entered." };
    return { badge: "Case File", status: "Court waiting." };
  }, [loading, formReady, crimeDone, accusedDone]);

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

  const stageVariant: "ambient" | "hero" = loading || formReady ? "hero" : "ambient";

  return (
    <div className="min-h-dvh relative overflow-hidden">
      <CourtHeader />

      <main className="relative px-5 pb-16 max-w-md mx-auto">
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
                  <span className="text-primary">{revengeOf}</span> appeals.
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">The group chat decides.</p>
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.3em] text-accent">⚖ Court is in session</p>
                <h1 className="font-display text-5xl sm:text-6xl leading-[1] mt-2 text-balance">
                  File the case.
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">The group chat decides.</p>
              </>
            )}
          </section>

          <section
            className={`mt-6 court-card p-5 sm:p-6 animate-rise relative transition-all duration-500 ${
              formReady ? "shadow-[var(--shadow-stamp)] ring-1 ring-[hsl(var(--stamp)/0.5)]" : ""
            } ${crimeDone && !formReady ? "ring-1 ring-[hsl(var(--stamp)/0.25)]" : ""} ${
              loading ? "animate-pulse-glow" : ""
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span
                key={badge}
                className={`inline-block px-3 py-1 rounded-full text-[10px] tracking-[0.3em] font-stamp uppercase shadow-[var(--shadow-stamp)] animate-scale-in ${
                  formReady || loading
                    ? "bg-[hsl(var(--stamp))] text-primary-foreground"
                    : "bg-secondary text-foreground/90 border border-border"
                }`}
              >
                {badge}
              </span>
            </div>

            <div className="space-y-3.5 mt-2">
              <Field label="Subject" done={accusedDone}>
                <input
                  value={accused}
                  onChange={(e) => setAccused(e.target.value)}
                  placeholder="Marcus, the flat, the group chat…"
                  maxLength={40}
                  className={`court-input ${accusedDone ? "court-input--done" : ""}`}
                />
              </Field>

              <Field label={revengeOf ? "Appeal" : "Charge"} done={crimeDone}>
                <textarea
                  value={crime}
                  onChange={(e) => setCrime(e.target.value)}
                  placeholder={
                    revengeOf
                      ? "Why the verdict was wrong…"
                      : "What did they do?"
                  }
                  maxLength={140}
                  rows={2}
                  className={`court-input court-statement resize-none ${crimeDone ? "court-input--done" : ""}`}
                />
                <div className="text-[10px] text-muted-foreground/70 text-right mt-1">{crime.length}/140</div>
              </Field>

              <details className="group">
                <summary className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 cursor-pointer select-none hover:text-foreground/80 transition-colors list-none flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/60 group-open:bg-accent transition-colors" />
                  Suggest a sentence
                  <span className="text-[9px] opacity-60">(optional)</span>
                </summary>
                <input
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  placeholder="Buys snacks next time."
                  maxLength={120}
                  className="court-input court-input--quiet mt-2 text-sm"
                />
              </details>

              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Court timer</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["2m", "10m", "1h", "24h"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLength(opt)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                        length === opt
                          ? "bg-accent text-accent-foreground border-accent shadow-[var(--shadow-gold)] scale-[1.03]"
                          : "bg-secondary/40 border-border text-foreground/80 hover:bg-secondary/70"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] pt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      loading
                        ? "bg-accent animate-pulse"
                        : formReady
                        ? "bg-[hsl(var(--stamp))] animate-pulse"
                        : accusedDone
                        ? "bg-accent/70"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className="text-muted-foreground">{status}</span>
                </span>
              </div>

              <button
                onClick={summon}
                disabled={loading}
                className={`btn-hero w-full text-lg disabled:opacity-60 transition-all ${
                  formReady ? "animate-pulse-glow scale-[1.01]" : "opacity-80"
                }`}
              >
                <Gavel className={`w-5 h-5 ${loading ? "animate-gavel-slam" : ""}`} />
                {loading ? "Summoning…" : revengeOf ? "File Revenge Case" : "Summon the Jury"}
              </button>
            </div>
          </section>

          <section className="mt-3.5 grid grid-cols-2 gap-2 opacity-70 hover:opacity-100 transition-opacity">
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

          <p className="mt-8 text-center text-[11px] text-muted-foreground/80">
            Private group court.{" "}
            <Link to="/about" className="underline underline-offset-2">Rules</Link>.
          </p>
        </div>
      </main>

      <style>{`
        .court-input {
          width: 100%;
          background: hsl(var(--secondary) / 0.5);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 0.75rem;
          padding: 0.7rem 0.9rem;
          font-size: 0.95rem;
          outline: none;
          transition: border-color .15s, background .15s, box-shadow .2s, transform .2s;
        }
        .court-input::placeholder { color: hsl(var(--muted-foreground) / 0.8); }
        .court-input:focus {
          border-color: hsl(var(--accent));
          background: hsl(var(--secondary) / 0.85);
          box-shadow: 0 0 0 3px hsl(var(--accent) / 0.18);
          transform: translateY(-1px);
        }
        .court-input--done {
          border-color: hsl(var(--stamp) / 0.55);
          background: hsl(var(--secondary) / 0.75);
        }
        .court-input--quiet {
          background: hsl(var(--secondary) / 0.3);
          font-size: 0.85rem;
          padding: 0.55rem 0.8rem;
        }
        .court-statement {
          font-family: var(--font-serif, Georgia, serif);
          line-height: 1.4;
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  done,
  children,
}: {
  label: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground inline-flex items-center gap-1.5">
          {label}
          {done && (
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[hsl(var(--stamp))] text-primary-foreground animate-scale-in">
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
            </span>
          )}
        </span>
      </div>
      {children}
    </label>
  );
}
