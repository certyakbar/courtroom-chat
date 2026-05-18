import { Scale } from "lucide-react";
import type { VoteValue } from "@/lib/verdict";
import { VOTE_LABEL } from "@/lib/verdict";

interface Props {
  caseTitle: string;
  accused: string;
  result: VoteValue;
  sentence: string;
  confidence: number;
  bestEvidence?: string | null;
}

export function VerdictCard({ caseTitle, accused, result, sentence, confidence, bestEvidence }: Props) {
  return (
    <div className="paper rounded-3xl p-6 sm:p-8 max-w-md mx-auto relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--stamp))] text-[hsl(var(--primary-foreground))]">
            <Scale className="w-4 h-4" />
          </span>
          <span className="font-stamp tracking-widest text-[hsl(var(--paper-ink))]">OBJECTION!</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[hsl(24_20%_30%)]">Verdict</span>
      </div>

      <div className="gavel-line mt-4" />

      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[hsl(24_20%_35%)]">Case</p>
        <h3 className="font-display text-xl mt-1 text-balance text-[hsl(var(--paper-ink))]">{caseTitle}</h3>
        <p className="text-sm text-[hsl(24_20%_30%)] mt-1">Accused: <span className="font-semibold">{accused}</span></p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="stamp font-stamp text-2xl sm:text-3xl">{VOTE_LABEL[result]}</div>
        <p className="mt-3 text-sm text-[hsl(24_20%_30%)]">Jury confidence: <span className="font-semibold text-[hsl(var(--paper-ink))]">{confidence}%</span></p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="rounded-xl bg-[hsl(36_30%_88%)] border border-[hsl(30_24%_78%)] p-3">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[hsl(24_20%_35%)]">Sentence</p>
          <p className="font-display text-base mt-1 text-[hsl(var(--paper-ink))]">{sentence}</p>
        </div>
        {bestEvidence && (
          <div className="rounded-xl bg-[hsl(36_30%_88%)] border border-[hsl(30_24%_78%)] p-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[hsl(24_20%_35%)]">Best evidence</p>
            <p className="italic mt-1 text-[hsl(var(--paper-ink))]">“{bestEvidence}”</p>
          </div>
        )}
      </div>

      <div className="gavel-line mt-6" />
      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">
        Start your own trial · objection
      </p>
    </div>
  );
}
