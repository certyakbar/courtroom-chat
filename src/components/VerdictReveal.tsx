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

const TONE: Record<VoteValue, { bg: string; glow: string; stampColor: string; }> = {
  guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(0_84%_28%/0.45),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(var(--stamp)/0.32),_transparent_70%)]",
    stampColor: "",
  },
  not_guilty: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(142_60%_25%/0.4),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(142_70%_45%/0.28),_transparent_70%)]",
    stampColor: "text-emerald-300",
  },
  everyone_wrong: {
    bg: "bg-[radial-gradient(ellipse_at_top,_hsl(38_92%_30%/0.4),_transparent_60%)]",
    glow: "bg-[radial-gradient(ellipse_at_center,_hsl(42_92%_56%/0.3),_transparent_70%)]",
    stampColor: "text-amber-300",
  },
};

export function VerdictReveal({ counts, total, winner, confidence, caseTitle, accused, sentence, bestEvidence, onDone, settled }: Props) {
  const [step, setStep] = useState(settled ? 5 : 0);
  // 0: dark, 1: jury reached verdict, 2: bars + accused shake, 3: gavel falls, 4: stamp + shake, 5: sentence/evidence
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (settled) { setStep(5); return; }
    const timers = [
      setTimeout(() => setStep(1), 250),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2700),
      setTimeout(() => { setStep(4); setShake(true); }, 3400),
      setTimeout(() => setShake(false), 3950),
      setTimeout(() => setStep(5), 4200),
      setTimeout(() => onDone?.(), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone, settled]);

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const tone = TONE[winner];
  const isGuilty = winner === "guilty";
  const isChaos = winner === "everyone_wrong";

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-[hsl(220_30%_4%)] ${settled ? "p-5 sm:p-6 min-h-0" : "p-6 sm:p-10 min-h-[640px]"} flex flex-col grain perspective-stage transition-all duration-500 ${shake ? "animate-screen-shake" : ""}`}>
      <div className={`absolute inset-0 pointer-events-none ${tone.bg}`} />
      {step >= 4 && (
        <div className={`absolute inset-0 pointer-events-none ${tone.glow} ${settled ? "" : "animate-rise"}`} />
      )}
      {!settled && <div className="spotlight-layer animate-spotlight" />}

      <div className="relative z-10 flex-1 flex flex-col">
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Case</p>
        <h2 className={`text-center font-display ${settled ? "text-base sm:text-lg" : "text-xl sm:text-2xl"} mt-1 text-balance`}>{caseTitle}</h2>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Accused:{" "}
          <span className={`text-foreground font-medium inline-block ${step >= 3 && !settled ? "animate-shake text-primary" : "text-primary"}`}>
            {accused}
          </span>
        </p>

        <div className={`flex-1 flex flex-col items-center justify-center ${settled ? "mt-4 gap-3" : "mt-6 gap-6"}`}>
          {step >= 1 && step < 3 && (
            <p className="font-display text-2xl sm:text-3xl text-center text-foreground/90 animate-rise px-4">
              The jury has reached a verdict<span className="animate-pulse">…</span>
            </p>
          )}

          {step >= 2 && step < 4 && (
            <div className="w-full max-w-sm space-y-3 animate-rise">
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
                        background: k === winner ? "var(--gradient-stamp)" : "hsl(var(--muted-foreground)/0.7)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="animate-gavel-slam text-accent" style={{ filter: "drop-shadow(0 16px 24px hsl(var(--stamp)/0.55))" }}>
              <Gavel className="w-24 h-24 sm:w-32 sm:h-32" strokeWidth={1.4} />
            </div>
          )}

          {step >= 4 && (
            <div className="flex flex-col items-center gap-5 animate-rise">
              <div className={`stamp font-stamp text-5xl sm:text-7xl animate-stamp px-6 py-4 leading-none ${tone.stampColor} ${isGuilty ? "" : ""} ${isChaos ? "rotate-3" : ""}`}>
                {VOTE_LABEL[winner]}
              </div>
              <p className="font-display text-lg sm:text-xl text-foreground/90 text-center text-balance">
                {DRAMATIC_TAGS[winner]}
              </p>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Jury confidence <span className="text-accent font-semibold">{confidence}%</span>
              </p>
            </div>
          )}

          {step >= 5 && (
            <div className="w-full max-w-md space-y-3 animate-tilt-in">
              <div className="court-card p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Sentence</p>
                <p className="font-display text-lg mt-1 text-balance">{sentence}</p>
              </div>
              {bestEvidence && (
                <div className="paper rounded-2xl p-4 animate-rise">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">Best evidence</p>
                  <p className="mt-1 italic text-balance text-[hsl(var(--paper-ink))]">"{bestEvidence}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
