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
    <div className="paper rounded-3xl p-6 sm:p-8 w-full max-w-sm mx-auto relative aspect-[9/16] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--stamp))] text-[hsl(var(--primary-foreground))]">
            <Scale className="w-5 h-5" />
          </span>
          <span className="font-stamp tracking-widest text-[hsl(var(--paper-ink))] text-lg">OBJECTION!</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[hsl(24_20%_30%)]">Verdict</span>
      </div>

      <div className="gavel-line mt-4" />

      {/* Case */}
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">Case</p>
        <h3 className="font-display text-lg mt-1 text-balance text-[hsl(var(--paper-ink))] leading-tight">{caseTitle}</h3>
        <p className="text-sm text-[hsl(24_20%_30%)] mt-2">
          Accused: <span className="font-semibold text-[hsl(var(--paper-ink))]">{accused}</span>
        </p>
      </div>

      {/* Stamp — hero of the card */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        <div className="stamp font-stamp text-3xl sm:text-4xl text-center leading-none">
          {VOTE_LABEL[result]}
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[hsl(24_20%_35%)]">
          Jury confidence
        </p>
        <p className="font-display text-2xl text-[hsl(var(--paper-ink))]">{confidence}%</p>
      </div>

      {/* Sentence + Evidence */}
      <div className="space-y-2">
        <div className="rounded-xl bg-[hsl(36_30%_88%)] border border-[hsl(30_24%_78%)] p-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">Sentence</p>
          <p className="font-display text-sm mt-1 text-[hsl(var(--paper-ink))] text-balance leading-snug">{sentence}</p>
        </div>
        {bestEvidence && (
          <div className="rounded-xl bg-[hsl(36_30%_88%)] border border-[hsl(30_24%_78%)] p-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">Best evidence</p>
            <p className="italic mt-1 text-xs text-[hsl(var(--paper-ink))] text-balance">"{bestEvidence}"</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="gavel-line mt-5" />
      <div className="mt-3 text-center">
        <p className="font-stamp text-sm tracking-[0.2em] text-[hsl(var(--stamp))] uppercase">
          Start your own trial
        </p>
        <p className="text-[10px] uppercase tracking-[0.4em] text-[hsl(24_20%_35%)] mt-1">
          objection · the group chat court
        </p>
      </div>
    </div>
  );
}
