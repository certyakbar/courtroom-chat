import { useEffect, useState } from "react";
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
}

const DRAMATIC_TAGS: Record<VoteValue, string> = {
  guilty: "The gavel has fallen.",
  not_guilty: "Walks free. For now.",
  everyone_wrong: "Court has failed society.",
};

export function VerdictReveal({ counts, total, winner, confidence, caseTitle, accused, sentence, bestEvidence, onDone }: Props) {
  const [step, setStep] = useState(0);
  // 0: dark, 1: "jury has reached a verdict", 2: bars, 3: stamp, 4: details

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 200),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2900),
      setTimeout(() => setStep(4), 3900),
      setTimeout(() => onDone?.(), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-[hsl(220_30%_4%)] p-6 sm:p-10 min-h-[600px] flex flex-col grain">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_hsl(0_84%_30%/0.3),_transparent_60%)]" />
      {step >= 3 && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_hsl(var(--stamp)/0.18),_transparent_70%)] animate-rise" />
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        <p className="text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Case</p>
        <h2 className="text-center font-display text-xl sm:text-2xl mt-1 text-balance">{caseTitle}</h2>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Accused: <span className={`text-foreground font-medium inline-block ${step >= 3 ? "animate-shake text-primary" : ""}`}>{accused}</span>
        </p>

        <div className="flex-1 flex flex-col items-center justify-center mt-6 gap-6">
          {step >= 1 && step < 3 && (
            <p className="font-display text-2xl sm:text-3xl text-center text-foreground/90 animate-rise px-4">
              The jury has reached a verdict<span className="animate-pulse">…</span>
            </p>
          )}

          {step >= 2 && step < 3 && (
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

          {step >= 3 && (
            <div className="flex flex-col items-center gap-5 animate-rise">
              <div className="stamp font-stamp text-5xl sm:text-7xl animate-stamp px-6 py-4 leading-none">
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

          {step >= 4 && (
            <div className="w-full max-w-md space-y-3 animate-rise">
              <div className="court-card p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Sentence</p>
                <p className="font-display text-lg mt-1 text-balance">{sentence}</p>
              </div>
              {bestEvidence && (
                <div className="court-card p-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Best evidence</p>
                  <p className="mt-1 italic text-balance">"{bestEvidence}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
