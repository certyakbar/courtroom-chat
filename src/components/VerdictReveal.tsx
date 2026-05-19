import { useEffect, useMemo, useState } from "react";
import type { VoteValue } from "@/lib/verdict";
import { VOTE_LABEL } from "@/lib/verdict";
import type { RevealStep } from "@/components/courtroom3d/CourtroomStage";

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
  onStepChange?: (step: RevealStep) => void;
  settled?: boolean;
}

const DRAMATIC_TAGS: Record<VoteValue, string> = {
  guilty: "The gavel has fallen.",
  not_guilty: "Walks free. For now.",
  everyone_wrong: "Court has failed society.",
};

type ToneCfg = {
  bg: string;
  glow: string;
  flash: string;
  stampColor: string;
  stampBorder: string;
  stampShadow: string;
  dot: string;
  headColor: string;
  headGlow: string;
  rotateImpact: string;
  chaos?: boolean;
};

const TONE: Record<VoteValue, ToneCfg> = {
  guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(0_84%_32%/0.75),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(0_90%_55%/0.7),_transparent_70%)]",
    flash: "bg-[hsl(0_95%_55%/0.85)]",
    stampColor: "text-[hsl(0_95%_60%)]",
    stampBorder: "border-[hsl(0_95%_55%)]",
    stampShadow: "shadow-[0_0_60px_hsl(0_95%_55%/0.65),inset_0_0_24px_hsl(0_95%_50%/0.45)]",
    dot: "bg-[hsl(0_84%_60%)] shadow-[0_0_18px_hsl(0_90%_55%/0.75)]",
    headColor: "from-[hsl(0_84%_38%)] via-[hsl(0_84%_50%)] to-[hsl(0_70%_28%)]",
    headGlow: "drop-shadow-[0_30px_40px_hsl(0_95%_45%/0.7)]",
    rotateImpact: "-rotate-[8deg]",
  },
  not_guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(142_65%_25%/0.7),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(142_70%_45%/0.6),_transparent_70%)]",
    flash: "bg-[hsl(142_80%_55%/0.7)]",
    stampColor: "text-[hsl(142_70%_60%)]",
    stampBorder: "border-[hsl(142_70%_55%)]",
    stampShadow: "shadow-[0_0_60px_hsl(142_70%_50%/0.55),inset_0_0_24px_hsl(142_70%_45%/0.4)]",
    dot: "bg-emerald-400 shadow-[0_0_18px_hsl(142_70%_50%/0.75)]",
    headColor: "from-[hsl(142_55%_35%)] via-[hsl(142_60%_45%)] to-[hsl(142_55%_25%)]",
    headGlow: "drop-shadow-[0_30px_40px_hsl(142_70%_40%/0.6)]",
    rotateImpact: "-rotate-[3deg]",
  },
  everyone_wrong: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(38_92%_34%/0.7),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(42_92%_56%/0.65),_transparent_70%)]",
    flash: "bg-[hsl(42_95%_60%/0.75)]",
    stampColor: "text-[hsl(42_95%_62%)]",
    stampBorder: "border-[hsl(42_92%_55%)]",
    stampShadow: "shadow-[0_0_60px_hsl(42_92%_55%/0.6),inset_0_0_24px_hsl(38_92%_50%/0.4)]",
    dot: "bg-amber-400 shadow-[0_0_18px_hsl(42_92%_55%/0.75)]",
    headColor: "from-[hsl(38_92%_38%)] via-[hsl(42_92%_52%)] to-[hsl(34_92%_26%)]",
    headGlow: "drop-shadow-[0_30px_40px_hsl(42_92%_45%/0.65)]",
    rotateImpact: "rotate-[12deg]",
    chaos: true,
  },
};

const STEP_NAMES: RevealStep[] = [
  "silent",       // 0
  "silent",       // 1 — "jury reached a verdict…"
  "jury_locking", // 2
  "accused",      // 3
  "gavel_rise",   // 4
  "impact",       // 5
  "sentence",     // 6
  "settled",      // 7
];

/* ---------------- Toy Gavel (CSS, depth + shadow) ---------------- */

function ToyGavel({
  tone,
  state,
}: {
  tone: ToneCfg;
  state: "rise" | "impact" | "settled";
}) {
  // 3D-ish CSS gavel. Handle + chunky head + end caps + shadow.
  const animation =
    state === "rise"
      ? "gavelRise 0.9s cubic-bezier(.2,.7,.3,1) both"
      : state === "impact"
      ? "gavelSlam3D 0.55s cubic-bezier(.2,.9,.3,1.1) both"
      : "none";
  const settledTransform =
    state === "settled" ? "rotate(-14deg) translateY(0)" : undefined;

  return (
    <div
      className="relative"
      style={{
        width: "min(72vw, 320px)",
        height: "min(40vw, 180px)",
        perspective: "900px",
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className={tone.headGlow}
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "70% 65%",
          animation,
          transform: settledTransform,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Handle */}
        <div
          className="absolute rounded-full bg-gradient-to-r from-[#2a160a] via-[#5a2e14] to-[#2a160a]"
          style={{
            left: "4%",
            top: "44%",
            width: "60%",
            height: "14%",
            transform: "rotate(-8deg)",
            boxShadow:
              "inset 0 -6px 10px hsl(0 0% 0% / 0.55), inset 0 4px 8px hsl(28 60% 55% / 0.35), 0 18px 24px hsl(0 0% 0% / 0.55)",
          }}
        />
        {/* Grip ring */}
        <div
          className="absolute rounded-full bg-[hsl(20_50%_12%)]"
          style={{
            left: "10%",
            top: "42%",
            width: "8%",
            height: "18%",
            transform: "rotate(-8deg)",
            boxShadow: "inset 0 -4px 6px hsl(0 0% 0% / 0.6)",
          }}
        />
        {/* Head — chunky toy cylinder */}
        <div
          className={`absolute rounded-[28px] bg-gradient-to-br ${tone.headColor}`}
          style={{
            right: "2%",
            top: "20%",
            width: "44%",
            height: "62%",
            transform: "rotate(-8deg)",
            boxShadow:
              "inset 0 -14px 22px hsl(0 0% 0% / 0.55), inset 0 10px 14px hsl(0 0% 100% / 0.18), 0 28px 36px hsl(0 0% 0% / 0.55)",
            borderRadius: "32% / 50%",
          }}
        >
          {/* Highlight */}
          <div
            className="absolute rounded-full bg-white/25 blur-sm"
            style={{ left: "12%", top: "16%", width: "30%", height: "12%" }}
          />
          {/* End cap rings */}
          <div
            className="absolute inset-y-0 left-0 w-[14%] bg-gradient-to-r from-black/35 to-transparent"
            style={{ borderRadius: "32% / 50%" }}
          />
          <div
            className="absolute inset-y-0 right-0 w-[14%] bg-gradient-to-l from-black/35 to-transparent"
            style={{ borderRadius: "32% / 50%" }}
          />
        </div>
      </div>

      {/* Strike block */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-md bg-gradient-to-b from-[#3a2418] to-[#1c0f08]"
        style={{
          bottom: "-2%",
          width: "46%",
          height: "12%",
          boxShadow:
            "0 18px 24px hsl(0 0% 0% / 0.6), inset 0 -4px 6px hsl(0 0% 0% / 0.7), inset 0 3px 4px hsl(30 50% 40% / 0.4)",
        }}
      />
    </div>
  );
}

/* ---------------- Component ---------------- */

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
  onStepChange,
  settled,
}: Props) {
  const [step, setStep] = useState(settled ? 7 : 0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [flash2, setFlash2] = useState(false);
  const [lockedDots, setLockedDots] = useState(0);

  const dotCount = useMemo(() => Math.max(3, Math.min(12, total || 5)), [total]);

  // Emit step name to parent so the 3D stage can react.
  useEffect(() => {
    onStepChange?.(STEP_NAMES[Math.min(step, STEP_NAMES.length - 1)]);
  }, [step, onStepChange]);

  useEffect(() => {
    if (settled) {
      setStep(7);
      setLockedDots(dotCount);
      return;
    }
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStep(1), 400));
    timers.push(window.setTimeout(() => setStep(2), 1500));

    for (let i = 0; i < dotCount; i++) {
      timers.push(
        window.setTimeout(() => setLockedDots((n) => Math.max(n, i + 1)), 1700 + i * 110),
      );
    }
    const afterDots = 1700 + dotCount * 110 + 200;

    timers.push(window.setTimeout(() => setStep(3), afterDots));               // accused
    timers.push(window.setTimeout(() => setStep(4), afterDots + 1200));        // gavel rises
    timers.push(window.setTimeout(() => {                                      // IMPACT
      setStep(5);
      setShake(true);
      setFlash(true);
    }, afterDots + 2200));
    timers.push(window.setTimeout(() => setFlash(false), afterDots + 2450));
    timers.push(window.setTimeout(() => setFlash2(true), afterDots + 2520));
    timers.push(window.setTimeout(() => setFlash2(false), afterDots + 2780));
    timers.push(window.setTimeout(() => setShake(false), afterDots + 2800));
    timers.push(window.setTimeout(() => setStep(6), afterDots + 3000));        // sentence
    timers.push(window.setTimeout(() => {
      setStep(7);
      onDone?.();
    }, afterDots + 4500));

    return () => timers.forEach((t) => clearTimeout(t));
  }, [onDone, settled, dotCount]);

  const tone = TONE[winner];
  const isChaos = !!tone.chaos;
  const cinematic = !settled && step < 7;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border bg-transparent grain perspective-stage transition-all duration-700 ${
        cinematic ? "p-5 sm:p-10 min-h-[760px] sm:min-h-[820px]" : "p-5 sm:p-7 min-h-0"
      } flex flex-col ${shake ? "animate-screen-shake" : ""} ${
        isChaos && step >= 5 ? "rotate-[0.5deg]" : ""
      }`}
      style={{
        // Don't fully cover the 3D stage — let it bleed through.
        background:
          cinematic
            ? "linear-gradient(180deg, hsl(220 38% 3% / 0.55), hsl(220 38% 3% / 0.85))"
            : "hsl(220 38% 3% / 0.92)",
      }}
    >
      {/* Tone wash strengthens with step */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${tone.bg} ${
          step >= 3 ? "opacity-100" : step >= 2 ? "opacity-60" : "opacity-30"
        }`}
      />
      {/* Glow burst on impact */}
      {step >= 5 && (
        <div className={`absolute inset-0 pointer-events-none ${tone.glow} ${cinematic ? "animate-rise" : ""}`} />
      )}
      {/* Lights-down during silent phases */}
      {step <= 1 && !settled && (
        <div className="absolute inset-0 pointer-events-none bg-[hsl(220_45%_2%/0.7)]" />
      )}
      {/* Sweeping spotlight */}
      {cinematic && <div className="spotlight-layer animate-spotlight" />}
      {/* Double flash on impact */}
      {flash && <div className={`absolute inset-0 pointer-events-none ${tone.flash} mix-blend-screen`} />}
      {flash2 && <div className={`absolute inset-0 pointer-events-none ${tone.flash} mix-blend-screen opacity-70`} />}

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Top wordmark */}
        <div className="flex items-center justify-center gap-2 opacity-90">
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

          {/* PHASE 2 — Jury locks in */}
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

          {/* PHASE 4 — Toy gavel rises (CSS object, not icon) */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center">
              <ToyGavel tone={tone} state="rise" />
              <p className="mt-4 text-[11px] uppercase tracking-[0.4em] text-accent/80 font-stamp">
                Order.
              </p>
            </div>
          )}

          {/* PHASE 5+ — IMPACT: toy gavel slams + giant stamp */}
          {step >= 5 && (
            <div className={`flex flex-col items-center ${cinematic ? "gap-6" : "gap-3"}`}>
              {/* Big toy gavel still in scene during impact for physical feel */}
              {step === 5 && (
                <div className="-mb-4">
                  <ToyGavel tone={tone} state="impact" />
                </div>
              )}

              {/* Giant slammed stamp — the impact */}
              <div
                className={`relative font-stamp leading-none uppercase border-[6px] bg-[hsl(220_38%_3%/0.4)] backdrop-blur-sm ${tone.stampColor} ${tone.stampBorder} ${tone.stampShadow} ${
                  isChaos ? "rotate-[6deg]" : "-rotate-[4deg]"
                } ${
                  cinematic
                    ? "text-6xl sm:text-8xl animate-stamp px-8 py-6"
                    : "text-5xl sm:text-7xl px-6 py-4"
                }`}
                style={{
                  textShadow:
                    "0 0 24px currentColor, 0 6px 0 hsl(220 38% 3% / 0.7), 0 12px 30px hsl(0 0% 0% / 0.6)",
                  borderRadius: "14px",
                }}
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
