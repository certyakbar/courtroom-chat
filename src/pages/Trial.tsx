import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CourtHeader } from "@/components/CourtHeader";
import { VerdictReveal } from "@/components/VerdictReveal";
import { VerdictCard } from "@/components/VerdictCard";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserToken, getStoredNickname, setStoredNickname } from "@/lib/browserToken";
import { copyText, nativeShare, verdictShareText, whatsappUrl } from "@/lib/share";
import { pickSentence, tallyVotes, VOTE_LABEL, VOTE_SHORT, type VoteValue } from "@/lib/verdict";
import { toast } from "sonner";
import { Clock, Gavel, Copy, Share2, MessageCircle, Repeat2, ScrollText } from "lucide-react";

type Trial = {
  id: string; slug: string; accused_name: string; crime_text: string;
  suggested_sentence: string | null; closes_at: string; status: string;
  result: string | null; verdict_sentence: string | null; best_evidence_id: string | null;
  creator_browser_token: string;
};
type Vote = { id: string; trial_id: string; voter_nickname: string; browser_token: string; vote: string; evidence_text: string | null; created_at: string; };

const VOTE_OPTIONS: { v: VoteValue; label: string; color: string }[] = [
  { v: "guilty", label: "Guilty", color: "from-red-500 to-red-700" },
  { v: "not_guilty", label: "Not Guilty", color: "from-emerald-500 to-emerald-700" },
  { v: "everyone_wrong", label: "Everyone Is Wrong", color: "from-amber-400 to-amber-600" },
];

function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return "";
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "Closed";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function Trial() {
  const { slug } = useParams();
  const token = useMemo(getBrowserToken, []);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [nickname, setNickname] = useState(getStoredNickname());
  const [vote, setVote] = useState<VoteValue | null>(null);
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!slug) return;
    const { data: t } = await supabase.from("instant_trials").select("*").eq("slug", slug).maybeSingle();
    if (!t) { setLoading(false); return; }
    setTrial(t as any);
    const { data: vs } = await supabase.from("instant_votes").select("*").eq("trial_id", (t as any).id).order("created_at", { ascending: true });
    setVotes((vs as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [slug]);
  // Poll every 4s for updates
  useEffect(() => {
    const i = setInterval(fetchAll, 4000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const countdown = useCountdown(trial?.closes_at);
  const myVote = votes.find((v) => v.browser_token === token);
  const isCreator = trial && trial.creator_browser_token === token;
  const closesAtMs = trial ? new Date(trial.closes_at).getTime() : 0;
  const isExpired = trial && Date.now() >= closesAtMs;
  const hasVerdict = trial && (trial.status === "verdict_delivered" || trial.result);
  const showReveal = !!hasVerdict || revealing;

  const tally = useMemo(() => tallyVotes(votes), [votes]);

  const submitVote = async () => {
    if (!trial || !vote) return;
    if (!nickname.trim()) { toast.error("Add a nickname first."); return; }
    if (evidence.length > 80) { toast.error("Evidence max 80 chars."); return; }
    setSubmitting(true);
    setStoredNickname(nickname.trim());
    const { error } = await supabase.from("instant_votes").insert({
      trial_id: trial.id,
      voter_nickname: nickname.trim().slice(0, 30),
      browser_token: token,
      vote,
      evidence_text: evidence.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") toast.error("You already voted on this trial.");
      else toast.error("Couldn't lock your vote.");
      return;
    }
    toast.success("Vote locked.");
    fetchAll();
  };

  const deliverVerdict = async () => {
    if (!trial) return;
    setRevealing(true);
    const t = tallyVotes(votes);
    const result: VoteValue = t.total === 0 ? "everyone_wrong" : t.winner;
    const sentence = pickSentence(result, trial.suggested_sentence);
    const best = [...votes]
      .filter((v) => v.evidence_text && v.evidence_text.trim().length > 0)
      .sort((a, b) => (b.evidence_text!.length - a.evidence_text!.length))[0];
    await supabase.from("instant_trials").update({
      status: "verdict_delivered",
      result,
      verdict_sentence: sentence,
      best_evidence_id: best?.id ?? null,
    }).eq("id", trial.id);
    await supabase.from("verdicts").insert({
      instant_trial_id: trial.id, result, sentence, best_evidence_id: best?.id ?? null,
    });
    fetchAll();
  };

  if (loading) {
    return <div className="min-h-dvh"><CourtHeader /><div className="px-5 max-w-md mx-auto pt-10 text-center text-muted-foreground">Calling the court to order...</div></div>;
  }
  if (!trial) {
    return <div className="min-h-dvh"><CourtHeader /><div className="px-5 max-w-md mx-auto pt-10 text-center text-muted-foreground">This trial doesn't exist. <Link to="/" className="underline">Start one</Link>.</div></div>;
  }

  if (showReveal) {
    const result = (trial.result as VoteValue) || tally.winner;
    const sentence = trial.verdict_sentence || pickSentence(result, trial.suggested_sentence);
    const best = votes.find((v) => v.id === trial.best_evidence_id);
    const url = `${window.location.origin}/t/${trial.slug}`;
    const shareText = verdictShareText(trial.crime_text, trial.accused_name, VOTE_LABEL[result], sentence, tally.confidence || 100, url);

    return (
      <div className="min-h-dvh">
        <CourtHeader />
        <main className="px-5 pb-16 max-w-md mx-auto space-y-5">
          <VerdictReveal
            counts={tally.counts}
            total={tally.total}
            winner={result}
            confidence={tally.confidence || 100}
            caseTitle={trial.crime_text}
            accused={trial.accused_name}
            sentence={sentence}
            bestEvidence={best?.evidence_text || null}
          />

          <VerdictCard
            caseTitle={trial.crime_text}
            accused={trial.accused_name}
            result={result}
            sentence={sentence}
            confidence={tally.confidence || 100}
            bestEvidence={best?.evidence_text || null}
          />

          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => nativeShare({ title: "OBJECTION! Verdict", text: shareText, url }, shareText)} className="btn-hero">
              <Share2 className="w-5 h-5" /> Share Verdict
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => copyText(shareText, "Verdict text copied")} className="btn-ghost-court"><Copy className="w-4 h-4" /> Copy text</button>
              <button onClick={() => copyText(url, "Link copied")} className="btn-ghost-court"><Copy className="w-4 h-4" /> Copy link</button>
            </div>
            <a href={whatsappUrl(shareText)} target="_blank" rel="noreferrer" className="btn-ghost-court">
              <MessageCircle className="w-4 h-4" /> Share to WhatsApp
            </a>
            <Link to={`/?revenge=${encodeURIComponent(trial.accused_name)}`} className="btn-gold">
              <Repeat2 className="w-4 h-4" /> File Revenge Case
            </Link>
            <Link to="/" className="btn-ghost-court"><Gavel className="w-4 h-4" /> Start a new trial</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <CourtHeader />
      <main className="px-5 pb-16 max-w-md mx-auto">
        <div className="court-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.3em] text-accent">⚖ On trial</p>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {countdown}
            </span>
          </div>
          <h1 className="font-display text-3xl mt-2 text-balance">
            <span className="text-primary">{trial.accused_name}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crime</p>
          <p className="mt-1 text-foreground/95 text-balance">{trial.crime_text}</p>
          <div className="mt-3 text-xs text-muted-foreground">Jury so far: {votes.length}</div>
        </div>

        {!myVote ? (
          <div className="mt-5 court-card p-5 space-y-4 animate-rise">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your nickname</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Judge Jules"
                maxLength={30}
                className="court-input mt-1.5"
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Your verdict</p>
              <div className="grid gap-2">
                {VOTE_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setVote(o.v)}
                    className={`text-left rounded-2xl px-4 py-3 border transition-all ${
                      vote === o.v
                        ? "border-accent bg-gradient-to-r " + o.color + " text-white shadow-[var(--shadow-gold)]"
                        : "border-border bg-secondary/40 hover:bg-secondary/70"
                    }`}
                  >
                    <span className="font-semibold tracking-wide">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Evidence (optional)</label>
              <input
                value={evidence}
                onChange={(e) => setEvidence(e.target.value.slice(0, 80))}
                placeholder="One line, max 80 chars"
                maxLength={80}
                className="court-input mt-1.5"
              />
              <div className="text-[11px] text-muted-foreground text-right mt-1">{evidence.length}/80</div>
            </div>

            <button onClick={submitVote} disabled={submitting || !vote || isExpired} className="btn-hero w-full disabled:opacity-60">
              <Gavel className="w-5 h-5" /> {submitting ? "Locking..." : "Lock my vote"}
            </button>
          </div>
        ) : (
          <div className="mt-5 court-card p-5 animate-rise">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your vote</p>
            <p className="font-display text-2xl mt-1">{VOTE_SHORT[myVote.vote as VoteValue]}</p>
            {myVote.evidence_text && <p className="text-sm italic mt-1 text-muted-foreground">“{myVote.evidence_text}”</p>}
            <p className="text-sm text-muted-foreground mt-3">Locked. Waiting for the verdict...</p>
          </div>
        )}

        {votes.length > 0 && (
          <div className="mt-5 court-card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">The jury</p>
            <div className="flex flex-wrap gap-2">
              {votes.map((v) => (
                <span key={v.id} className="text-xs bg-secondary/60 border border-border rounded-full px-2.5 py-1">
                  {v.voter_nickname}
                </span>
              ))}
            </div>
          </div>
        )}

        {(isCreator || isExpired) && (
          <button onClick={deliverVerdict} className="btn-gold w-full mt-5">
            <ScrollText className="w-4 h-4" /> Reveal verdict now
          </button>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          One vote per device. Keep it petty and playful.
        </p>
      </main>

      <style>{`
        .court-input {
          width: 100%;
          background: hsl(var(--secondary) / 0.5);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          border-radius: 0.875rem;
          padding: 0.7rem 0.9rem;
          font-size: 0.95rem;
          outline: none;
        }
        .court-input:focus { border-color: hsl(var(--accent)); }
      `}</style>
    </div>
  );
}
