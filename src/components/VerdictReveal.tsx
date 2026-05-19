import { useEffect, useMemo, useState } from "react";
import { Gavel, Scale } from "lucide-react";
import type { VoteValue } from "@/lib/verdict";
import { VOTE_LABEL } from "@/lib/verdict";

interface Props {
  counts: Record<VoteValue, number>;
  total: number;
  winner: VoteValue;
  confidence: number;
  caseTitle: string;
  accused: string;
  sentence: string;
  bestEvidence?: string | null;
  onDone?: () => void;
  settled?: boolean;
}

const DRAMATIC_TAGS: Record<VoteValue, string> = {
  guilty: "The gavel has fallen.",
  not_guilty: "Walks free. For now.",
  everyone_wrong: "Court has failed society.",
};

const TONE: Record<
  VoteValue,
  { bg: string; glow: string; flash: string; stampColor: string; dot: string; chaos?: boolean }
> = {
  guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(0_84%_32%/0.65),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(var(--stamp)/0.55),_transparent_70%)]",
    flash: "bg-[hsl(0_95%_55%/0.7)]",
    stampColor: "",
    dot: "bg-[hsl(0_84%_60%)] shadow-[0_0_18px_hsl(0_90%_55%/0.75)]",
  },
  not_guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(142_65%_25%/0.6),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(142_70%_45%/0.45),_transparent_70%)]",
    flash: "bg-[hsl(142_80%_55%/0.5)]",
    stampColor: "text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_18px_hsl(142_70%_50%/0.75)]",
  },
  everyone_wrong: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(38_92%_34%/0.6),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(42_92%_56%/0.5),_transparent_70%)]",
    flash: "bg-[hsl(42_95%_60%/0.55)]",
    stampColor: "text-amber-300",
    dot: "bg-amber-400 shadow-[0_0_18px_hsl(42_92%_55%/0.75)]",
    chaos: true,
  },
};

/* Phases:
 0 — court silent (lights down)
 1 — "The jury has reached a verdict…"
 2 — jury locks in one by one (dots flip neutral → locked, no winner yet)
 3 — accused called out (spotlight + shake)
 4 — gavel rises (huge)
 5 — IMPACT (slam + shake + double flash + stamp explosion)
 6 — sentence drops + best evidence
 7 — settled (final screenshot state)
*/

export function VerdictReveal({
  counts,
  total,
  winner,
  confidence,
  caseTitle,
  accused,
  sentence,
  bestEvidence,
  onDone,
  settled,
}: Props) {
  const [step, setStep] = useState(settled ? 7 : 0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [flash2, setFlash2] = useState(false);
  const [lockedDots, setLockedDots] = useState(0);

  const dotCount = useMemo(() => Math.max(3, Math.min(12, total || 5)), [total]);

  useEffect(() => {
    if (settled) {
      setStep(7);
      setLockedDots(dotCount);
      return;
    }
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStep(1), 400));
    timers.push(window.setTimeout(() => setStep(2), 1500));

    // Stagger jury dots locking in
    for (let i = 0; i < dotCount; i++) {
      timers.push(window.setTimeout(() => setLockedDots((n) => Math.max(n, i + 1)), 1700 + i * 110));
    }
    const afterDots = 1700 + dotCount * 110 + 200;

    timers.push(window.setTimeout(() => setStep(3), afterDots));            // accused
    timers.push(window.setTimeout(() => setStep(4), afterDots + 1100));     // gavel rises
    timers.push(window.setTimeout(() => {                                   // IMPACT
      setStep(5);
      setShake(true);
      setFlash(true);
    }, afterDots + 1900));
    timers.push(window.setTimeout(() => setFlash(false), afterDots + 2200));
    timers.push(window.setTimeout(() => setFlash2(true), afterDots + 2280));
    timers.push(window.setTimeout(() => setFlash2(false), afterDots + 2500));
    timers.push(window.setTimeout(() => setShake(false), afterDots + 2500));
    timers.push(window.setTimeout(() => setStep(6), afterDots + 2750));     // sentence
    timers.push(window.setTimeout(() => {                                   // settle
      setStep(7);
      onDone?.();
    }, afterDots + 4200));

    return () => timers.forEach((t) => clearTimeout(t));
  }, [onDone, settled, dotCount]);

  const tone = TONE[winner];
  const isChaos = !!tone.chaos;
  const cinematic = !settled && step < 7;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border bg-[hsl(220_38%_3%)] grain perspective-stage transition-all duration-700 ${
        cinematic ? "p-5 sm:p-10 min-h-[720px] sm:min-h-[760px]" : "p-5 sm:p-7 min-h-0"
      } flex flex-col ${shake ? "animate-screen-shake" : ""} ${isChaos && step >= 5 ? "rotate-[0.5deg]" : ""}`}
    >
      {/* Base tone wash */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${tone.bg} ${
          step >= 3 ? "opacity-100" : "opacity-50"
        }`}
      />
      {/* Result glow on impact */}
      {step >= 5 && (
        <div className={`absolute inset-0 pointer-events-none ${tone.glow} ${cinematic ? "animate-rise" : ""}`} />
      )}
      {/* Lights-down dim during stage 0–1 */}
      {step <= 1 && !settled && (
        <div className="absolute inset-0 pointer-events-none bg-[hsl(220_45%_2%/0.88)]" />
      )}
      {/* Sweeping spotlight */}
      {cinematic && <div className="spotlight-layer animate-spotlight" />}
      {/* Double flash on impact */}
      {flash && <div className={`absolute inset-0 pointer-events-none ${tone.flash} animate-rise mix-blend-screen`} />}
      {flash2 && <div className={`absolute inset-0 pointer-events-none ${tone.flash} animate-rise mix-blend-screen opacity-70`} />}

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Top wordmark — always visible, builds identity */}
        <div className="flex items-center justify-center gap-2 opacity-90">
          <Scale className="w-3.5 h-3.5 text-accent" />
          <span className="font-stamp text-[10px] tracking-[0.5em] text-accent uppercase">⚖ Objection!</span>
        </div>

        {/* Case header */}
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground mt-4">Case</p>
        <h2 className={`text-center font-display ${cinematic ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"} mt-1 text-balance px-2`}>
          {caseTitle}
        </h2>

        <div className={`flex-1 flex flex-col items-center justify-center ${cinematic ? "mt-6 gap-5" : "mt-4 gap-3"}`}>
          {/* PHASE 1 — Jury reached a verdict */}
          {step === 1 && (
            <p className="font-display text-2xl sm:text-3xl text-center text-foreground/95 animate-rise px-4">
              The jury has reached a verdict<span className="animate-pulse">…</span>
            </p>
          )}

          {/* PHASE 2 — Jury locks in (dots fill, no winner yet) */}
          {step === 2 && (
            <div className="w-full max-w-sm text-center animate-rise">
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-4">
                Jury locking in
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {Array.from({ length: dotCount }).map((_, i) => {
                  const locked = i < lockedDots;
                  return (
                    <span
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        locked ? tone.dot + " scale-110" : "bg-secondary border border-border"
                      } ${locked ? "animate-chip-pop" : "animate-breathe"}`}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4 tabular-nums">
                {lockedDots} / {dotCount} locked
              </p>
            </div>
          )}

          {/* PHASE 3 — Accused spotlight */}
          {step === 3 && (
            <div className="text-center animate-rise px-4">
              <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-stamp">The court calls</p>
              <p className="font-display text-4xl sm:text-5xl mt-3 text-primary animate-shake leading-tight text-balance">
                {accused}
              </p>
              <p className="mt-3 text-sm text-foreground/85 italic">stands before the court.</p>
            </div>
          )}

          {/* PHASE 4 — Gavel rises (anticipation) */}
          {step === 4 && (
            <div
              className="animate-gavel-slam text-accent"
              style={{ filter: "drop-shadow(0 22px 36px hsl(var(--stamp)/0.7))" }}
            >
              <Gavel className="w-40 h-40 sm:w-56 sm:h-56" strokeWidth={1.3} />
            </div>
          )}

          {/* PHASE 5+ — Impact stamp */}
          {step >= 5 && (
            <div className={`flex flex-col items-center ${cinematic ? "gap-5" : "gap-3"}`}>
              <div
                className={`stamp font-stamp leading-none ${tone.stampColor} ${isChaos ? "rotate-[5deg]" : ""} ${
                  cinematic
                    ? "text-5xl sm:text-7xl animate-stamp px-7 py-5 border-[6px]"
                    : "text-4xl sm:text-6xl px-5 py-3"
                }`}
              >
                {VOTE_LABEL[winner]}
              </div>

              <p
                className={`font-display text-foreground/95 text-center text-balance ${
                  cinematic ? "text-xl sm:text-2xl animate-rise" : "text-base sm:text-lg"
                }`}
              >
                {DRAMATIC_TAGS[winner]}
              </p>

              <p className="text-sm text-muted-foreground">
                Accused: <span className="text-primary font-medium">{accused}</span>
              </p>

              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Jury confidence <span className="text-accent font-semibold">{confidence}%</span>
                <span className="text-muted-foreground/60"> · {total} vote{total === 1 ? "" : "s"}</span>
              </p>
            </div>
          )}

          {/* PHASE 6+ — Sentence + evidence */}
          {step >= 6 && (
            <div className={`w-full max-w-md space-y-2.5 ${cinematic ? "animate-tilt-in" : ""}`}>
              <div className={`court-card border-2 border-accent/30 ${cinematic ? "p-4" : "p-3"} shadow-[var(--shadow-gold)]`}>
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-stamp">Sentence</p>
                <p className={`font-display ${cinematic ? "text-lg sm:text-xl" : "text-base"} mt-1 text-balance leading-snug`}>
                  {sentence}
                </p>
              </div>
              {bestEvidence && (
                <div className="paper rounded-2xl p-4 animate-rise relative">
                  <div className="absolute -top-2.5 left-4">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] tracking-[0.3em] font-stamp uppercase bg-[hsl(var(--stamp))] text-primary-foreground shadow-[var(--shadow-stamp)]">
                      Evidence
                    </span>
                  </div>
                  <p className="mt-1 italic text-balance text-[hsl(var(--paper-ink))]">"{bestEvidence}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom wordmark — only in settled state, makes it screenshot-worthy */}
        {step >= 7 && (
          <div className="mt-5 text-center">
            <div className="gavel-line mx-auto w-24 mb-2" />
            <p className="text-[10px] uppercase tracking-[0.5em] text-accent font-stamp">⚖ OBJECTION!</p>
            <p className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground/70 mt-0.5">
              the group chat court
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
