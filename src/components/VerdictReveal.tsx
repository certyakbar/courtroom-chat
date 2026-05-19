import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";
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

const ACCUSED_TAGS: Record<VoteValue, string> = {
  guilty: "stands accused.",
  not_guilty: "awaits the jury.",
  everyone_wrong: "is dragged into chaos.",
};

const TONE: Record<
  VoteValue,
  { bg: string; glow: string; flash: string; stampColor: string; chaos?: boolean }
> = {
  guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(0_84%_30%/0.55),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(var(--stamp)/0.4),_transparent_70%)]",
    flash: "bg-[hsl(0_90%_55%/0.55)]",
    stampColor: "",
  },
  not_guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(142_65%_25%/0.5),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(142_70%_45%/0.35),_transparent_70%)]",
    flash: "bg-[hsl(142_75%_50%/0.4)]",
    stampColor: "text-emerald-300",
  },
  everyone_wrong: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(38_92%_32%/0.5),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(42_92%_56%/0.38),_transparent_70%)]",
    flash: "bg-[hsl(42_95%_55%/0.45)]",
    stampColor: "text-amber-300",
    chaos: true,
  },
};

// Stages:
// 0 silence (lights down)
// 1 "Jury has reached a verdict..."
// 2 vote bars build (no winner highlighted yet)
// 3 accused spotlight ("X stands accused.")
// 4 gavel slam + screen shake
// 5 stamp explosion + flash + dramatic tag
// 6 sentence + best evidence drop in
// 7 settled (final state, still big)

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

  useEffect(() => {
    if (settled) {
      setStep(7);
      return;
    }
    const timers = [
      setTimeout(() => setStep(1), 350),      // jury reached verdict
      setTimeout(() => setStep(2), 1700),     // bars build
      setTimeout(() => setStep(3), 3000),     // accused spotlight
      setTimeout(() => setStep(4), 4100),     // gavel slam
      setTimeout(() => {                       // stamp impact + flash + shake
        setStep(5);
        setShake(true);
        setFlash(true);
      }, 4750),
      setTimeout(() => setFlash(false), 5050),
      setTimeout(() => setShake(false), 5250),
      setTimeout(() => setStep(6), 5500),     // sentence + evidence
      setTimeout(() => {                       // settle
        setStep(7);
        onDone?.();
      }, 6800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone, settled]);

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const tone = TONE[winner];
  const isChaos = !!tone.chaos;
  const cinematic = !settled && step < 7;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border bg-[hsl(220_35%_3%)] ${
        cinematic ? "p-6 sm:p-10 min-h-[640px]" : "p-5 sm:p-7 min-h-0"
      } flex flex-col grain perspective-stage transition-all duration-700 ${
        shake ? "animate-screen-shake" : ""
      } ${isChaos && step >= 5 ? "rotate-[0.4deg]" : ""}`}
    >
      {/* Base tone */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${tone.bg} ${
          step >= 3 ? "opacity-100" : "opacity-60"
        }`}
      />

      {/* Result glow on impact */}
      {step >= 5 && (
        <div
          className={`absolute inset-0 pointer-events-none ${tone.glow} ${cinematic ? "animate-rise" : ""}`}
        />
      )}

      {/* Stage-1 dim: lights down */}
      {step === 0 && (
        <div className="absolute inset-0 pointer-events-none bg-[hsl(220_40%_2%/0.85)]" />
      )}

      {/* Sweeping spotlight while cinematic */}
      {cinematic && <div className="spotlight-layer animate-spotlight" />}

      {/* Impact flash */}
      {flash && (
        <div
          className={`absolute inset-0 pointer-events-none ${tone.flash} animate-rise mix-blend-screen`}
        />
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header: case */}
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Case
        </p>
        <h2
          className={`text-center font-display ${
            cinematic ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
          } mt-1 text-balance`}
        >
          {caseTitle}
        </h2>

        {/* Accused */}
        <p className="text-center text-sm text-muted-foreground mt-2">
          Accused:{" "}
          <span
            className={`inline-block font-medium ${
              step === 3 && !settled
                ? "text-primary animate-shake text-2xl sm:text-3xl font-display"
                : step >= 5
                ? "text-foreground text-base"
                : "text-primary"
            } transition-all duration-300`}
          >
            {accused}
          </span>
        </p>

        <div
          className={`flex-1 flex flex-col items-center justify-center ${
            cinematic ? "mt-6 gap-6" : "mt-4 gap-3"
          }`}
        >
          {/* STAGE 1 — Jury reached a verdict */}
          {step === 1 && (
            <p className="font-display text-2xl sm:text-3xl text-center text-foreground/90 animate-rise px-4">
              The jury has reached a verdict
              <span className="animate-pulse">…</span>
            </p>
          )}

          {/* STAGE 2 — bars build (neutral; no winner shown yet) */}
          {step === 2 && (
            <div className="w-full max-w-sm space-y-3 animate-rise">
              <p className="text-center text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                Tallying the group chat
              </p>
              {(["guilty", "not_guilty", "everyone_wrong"] as VoteValue[]).map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-[10px] uppercase tracking-[0.25em] mb-1">
                    <span className="text-muted-foreground">{VOTE_LABEL[k]}</span>
                    <span className="text-foreground">{pct(counts[k])}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className="h-full bar-fill rounded-full"
                      style={{
                        ["--bar-w" as any]: `${pct(counts[k])}%`,
                        background: "hsl(var(--muted-foreground)/0.7)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STAGE 3 — accused spotlight */}
          {step === 3 && (
            <div className="text-center animate-rise px-4">
              <p className="text-[11px] uppercase tracking-[0.35em] text-accent font-stamp">
                The court calls
              </p>
              <p className="font-display text-3xl sm:text-4xl mt-2 text-primary animate-shake">
                {accused}
              </p>
              <p className="mt-3 text-sm text-foreground/80">
                {accused} {ACCUSED_TAGS[winner]}
              </p>
            </div>
          )}

          {/* STAGE 4 — gavel slam */}
          {step === 4 && (
            <div
              className="animate-gavel-slam text-accent"
              style={{ filter: "drop-shadow(0 18px 28px hsl(var(--stamp)/0.6))" }}
            >
              <Gavel className="w-28 h-28 sm:w-36 sm:h-36" strokeWidth={1.4} />
            </div>
          )}

          {/* STAGE 5+ — stamp explosion / settled */}
          {step >= 5 && (
            <div className={`flex flex-col items-center ${cinematic ? "gap-4" : "gap-3"}`}>
              <div
                className={`stamp font-stamp leading-none ${tone.stampColor} ${
                  isChaos ? "rotate-3" : ""
                } ${
                  cinematic
                    ? "text-5xl sm:text-7xl animate-stamp px-6 py-4"
                    : "text-4xl sm:text-6xl px-5 py-3"
                }`}
              >
                {VOTE_LABEL[winner]}
              </div>

              {(step >= 5) && (
                <p
                  className={`font-display text-foreground/90 text-center text-balance ${
                    cinematic ? "text-lg sm:text-xl animate-rise" : "text-sm sm:text-base"
                  }`}
                >
                  {DRAMATIC_TAGS[winner]}
                </p>
              )}

              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Jury confidence{" "}
                <span className="text-accent font-semibold">{confidence}%</span>
              </p>
            </div>
          )}

          {/* STAGE 6+ — sentence + evidence */}
          {step >= 6 && (
            <div
              className={`w-full max-w-md space-y-2 ${cinematic ? "animate-tilt-in" : ""}`}
            >
              <div className={`court-card ${cinematic ? "p-4" : "p-3"}`}>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Sentence
                </p>
                <p
                  className={`font-display ${
                    cinematic ? "text-lg" : "text-base"
                  } mt-1 text-balance`}
                >
                  {sentence}
                </p>
              </div>
              {bestEvidence && (
                <div className="paper rounded-2xl p-4 animate-rise">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">
                    Best evidence
                  </p>
                  <p className="mt-1 italic text-balance text-[hsl(var(--paper-ink))]">
                    "{bestEvidence}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom mark — only in settled state, makes it screenshot-worthy */}
        {step >= 7 && (
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.45em] text-accent font-stamp">
            ⚖ OBJECTION!
          </p>
        )}
      </div>
    </div>
  );
}
