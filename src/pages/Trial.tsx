import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CourtHeader } from "@/components/CourtHeader";
import { VerdictReveal } from "@/components/VerdictReveal";
import { VerdictCard } from "@/components/VerdictCard";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserToken, getStoredNickname, setStoredNickname, isMyTrial, markMyVote } from "@/lib/browserToken";
import {
  copyText,
  nativeShare,
  verdictMessagePlain,
  verdictMessageWhatsApp,
  verdictMessageDiscord,
} from "@/lib/share";
import { pickSentence, tallyVotes, VOTE_LABEL, VOTE_SHORT, type VoteValue } from "@/lib/verdict";
import { toast } from "sonner";
import { Clock, Gavel, Copy, Share2, MessageCircle, Repeat2, ScrollText, Flame, Hash, Link as LinkIcon, Download, Users, CheckCircle2, AlertTriangle } from "lucide-react";

type Trial = {
  id: string; slug: string; accused_name: string; crime_text: string;
  suggested_sentence: string | null; closes_at: string; status: string;
  result: string | null; verdict_sentence: string | null; best_evidence_id: string | null;
};
type Vote = { id: string; trial_id: string; voter_nickname: string; vote: string; evidence_text: string | null; created_at: string; browser_token: string };
type Juror = { id: string; trial_id: string; browser_token: string; nickname: string; joined_at: string };


const VOTE_OPTIONS: { v: VoteValue; label: string; tag: string; color: string }[] = [
  { v: "guilty", label: "GUILTY", tag: "Throw the book.", color: "from-red-500 to-red-700" },
  { v: "not_guilty", label: "NOT GUILTY", tag: "Let them walk.", color: "from-emerald-500 to-emerald-700" },
  { v: "everyone_wrong", label: "EVERYONE IS WRONG", tag: "Burn it all down.", color: "from-amber-400 to-amber-600" },
];

function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return { label: "", urgent: false, closed: false };
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { label: "CLOSED", urgent: false, closed: true };
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const urgent = ms < 60_000;
  if (h) return { label: `${h}h ${m}m left`, urgent: false, closed: false };
  return { label: `${m}:${sec.toString().padStart(2, "0")} left`, urgent, closed: false };
}

export default function Trial() {
  const { slug } = useParams();
  const token = useMemo(getBrowserToken, []);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [jurors, setJurors] = useState<Juror[]>([]);
  const [nickname, setNickname] = useState(getStoredNickname());
  const [vote, setVote] = useState<VoteValue | null>(null);
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [microIdx, setMicroIdx] = useState(0);
  const verdictCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = setInterval(() => setMicroIdx((n) => n + 1), 2600);
    return () => clearInterval(i);
  }, []);

  const fetchAll = async () => {
    if (!slug) return;
    const { data: t } = await supabase
      .from("instant_trials")
      .select("id,slug,accused_name,crime_text,suggested_sentence,closes_at,status,result,verdict_sentence,best_evidence_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!t) { setLoading(false); return; }
    setTrial(t as any);
    const [{ data: vs }, { data: js }] = await Promise.all([
      supabase
        .from("instant_votes")
        .select("id,trial_id,voter_nickname,vote,evidence_text,created_at,browser_token")
        .eq("trial_id", (t as any).id)
        .order("created_at", { ascending: true }),
      supabase
        .from("instant_jurors")
        .select("id,trial_id,browser_token,nickname,joined_at")
        .eq("trial_id", (t as any).id)
        .order("joined_at", { ascending: true }),
    ]);
    setVotes((vs as any) ?? []);
    setJurors((js as any) ?? []);
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
  const myVote = useMemo(
    () => votes.find((v) => v.browser_token === token),
    [votes, token]
  );
  const hasJoined = useMemo(
    () => jurors.some((j) => j.browser_token === token),
    [jurors, token]
  );
  const isCreator = trial && (isMyTrial(trial.id) || isMyTrial(trial.slug));

  const closesAtMs = trial ? new Date(trial.closes_at).getTime() : 0;
  const isExpired = !!trial && Date.now() >= closesAtMs;
  const hasVerdict = !!trial && (trial.status === "verdict_delivered" || !!trial.result);
  const showReveal = hasVerdict || revealing;

  const joinedCount = jurors.length;
  const votedCount = votes.length;
  const waitingOn = Math.max(0, joinedCount - votedCount);
  const juryComplete = joinedCount > 0 && votedCount >= joinedCount;

  const tally = useMemo(() => tallyVotes(votes), [votes]);

  const joinJury = async () => {
    if (!trial) return;
    const nick = nickname.trim();
    if (!nick) { toast.error("Pick a nickname to join the jury."); return; }
    setJoining(true);
    setStoredNickname(nick);
    const { error } = await supabase.from("instant_jurors").insert({
      trial_id: trial.id,
      browser_token: token,
      nickname: nick.slice(0, 30),
    });
    setJoining(false);
    if (error && error.code !== "23505") {
      toast.error("Couldn't join the jury.");
      return;
    }
    toast.success("You're on the jury.");
    fetchAll();
  };

  const submitVote = async () => {
    if (!trial || !vote) return;
    if (!nickname.trim()) { toast.error("Add a nickname first."); return; }
    if (evidence.length > 80) { toast.error("Evidence max 80 chars."); return; }
    setSubmitting(true);
    setStoredNickname(nickname.trim());

    // Ensure juror row exists (idempotent)
    if (!hasJoined) {
      await supabase.from("instant_jurors").insert({
        trial_id: trial.id,
        browser_token: token,
        nickname: nickname.trim().slice(0, 30),
      });
    }

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
    markMyVote(trial.id);
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
    const verdictLabel = VOTE_LABEL[result];
    const confidence = tally.confidence || 100;
    const waMsg = verdictMessageWhatsApp(trial.crime_text, trial.accused_name, verdictLabel, sentence, confidence, url);
    const discordMsg = verdictMessageDiscord(trial.crime_text, trial.accused_name, verdictLabel, sentence, confidence, url);
    const plainMsg = verdictMessagePlain(trial.crime_text, trial.accused_name, verdictLabel, sentence, confidence, url);

    const saveCard = async () => {
      const node = verdictCardRef.current;
      if (!node) return;
      try {
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(node, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#0a0d14",
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `objection-verdict-${trial.slug}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Verdict card saved");
      } catch (e) {
        toast.error("Couldn't save card. Try a screenshot instead.");
      }
    };

    return (
      <div className="min-h-dvh">
        <CourtHeader />
        <main className="px-5 pb-16 max-w-md mx-auto space-y-5">
          <VerdictReveal
            counts={tally.counts}
            total={tally.total}
            winner={result}
            confidence={confidence}
            caseTitle={trial.crime_text}
            accused={trial.accused_name}
            sentence={sentence}
            bestEvidence={best?.evidence_text || null}
          />

          <div ref={verdictCardRef}>
            <VerdictCard
              caseTitle={trial.crime_text}
              accused={trial.accused_name}
              result={result}
              sentence={sentence}
              confidence={confidence}
              bestEvidence={best?.evidence_text || null}
            />
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            ↑ Screenshot this card or save it below.
          </p>

          {/* Dominant CTA — drop verdict back into chat */}
          <button
            onClick={() => nativeShare({ title: "OBJECTION! Verdict", text: plainMsg, url }, plainMsg)}
            className="btn-hero w-full text-lg animate-pulse-glow"
          >
            <Share2 className="w-5 h-5" /> Drop Verdict in Chat
          </button>

          {/* Platform-specific verdict copies */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2 text-center">
              Or copy the verdict
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => copyText(waMsg, "WhatsApp verdict copied")} className="btn-ghost-court">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              <button onClick={() => copyText(discordMsg, "Discord verdict copied")} className="btn-ghost-court">
                <Hash className="w-4 h-4" /> Discord
              </button>
              <button onClick={() => copyText(plainMsg, "Plain verdict copied")} className="btn-ghost-court">
                <Copy className="w-4 h-4" /> Plain text
              </button>
              <button onClick={() => copyText(url, "Link copied")} className="btn-ghost-court">
                <LinkIcon className="w-4 h-4" /> Link
              </button>
            </div>
          </div>

          {/* Save card + revenge — keep chat loop alive */}
          <button onClick={saveCard} className="btn-ghost-court w-full">
            <Download className="w-4 h-4" /> Save Verdict Card (PNG)
          </button>

          <Link
            to={`/?revenge=${encodeURIComponent(trial.accused_name)}`}
            className="btn-gold w-full"
          >
            <Repeat2 className="w-4 h-4" /> File Revenge Case
          </Link>

          <Link to="/" className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <Gavel className="w-3.5 h-3.5" /> Start a new trial
          </Link>
        </main>
      </div>
    );
  }

  // Jury status copy
  let juryStatusLine = "Waiting for the jury to arrive.";
  if (joinedCount > 0 && juryComplete) juryStatusLine = "The jury is complete. Verdict ready.";
  else if (joinedCount > 0) juryStatusLine = `Waiting on ${waitingOn} juror${waitingOn === 1 ? "" : "s"}.`;

  return (
    <div className="min-h-dvh">
      <CourtHeader />
      <main className="px-5 pb-16 max-w-md mx-auto">
        {/* Case header — dramatic */}
        <div className="court-card p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_hsl(0_84%_30%/0.18),_transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.35em] text-accent font-stamp">⚖ Court in session</p>
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                  countdown.closed
                    ? "border-border bg-secondary/60 text-muted-foreground"
                    : countdown.urgent
                    ? "border-[hsl(var(--stamp))] bg-[hsl(var(--stamp)/0.18)] text-[hsl(0_90%_72%)] animate-pulse"
                    : "border-border bg-secondary/60 text-muted-foreground"
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> {countdown.label}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-4">The accused</p>
            <h1 className="font-display text-4xl mt-1 text-balance leading-tight">
              <span className="text-primary">{trial.accused_name}</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-4">Charged with</p>
            <p className="mt-1 text-foreground/95 text-balance text-lg font-display">{trial.crime_text}</p>
          </div>
        </div>

        {/* Jury status */}
        <div className="mt-4 court-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-accent" />
              <span className="font-stamp tracking-wide">
                Jury: {joinedCount} joined · {votedCount} voted
              </span>
            </div>
            {juryComplete && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className={`text-xs mt-1.5 ${juryComplete ? "text-emerald-400" : "text-muted-foreground"}`}>
            {juryStatusLine}
          </p>
          {jurors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {jurors.map((j) => {
                const voted = votes.some((v) => v.browser_token === j.browser_token);
                return (
                  <span
                    key={j.id}
                    className={`text-[11px] rounded-full px-2.5 py-1 border ${
                      voted
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-secondary/60 border-border text-muted-foreground"
                    }`}
                  >
                    {voted ? "✓ " : "… "}{j.nickname}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {!hasJoined && !myVote ? (
          // Join the jury first
          <div className="mt-5 space-y-4 animate-rise">
            <div className="text-center">
              <p className="font-display text-2xl text-balance">You've been summoned as jury.</p>
              <p className="text-sm text-muted-foreground mt-1">Join the jury to cast your verdict.</p>
            </div>
            <div className="court-card p-4">
              <label className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Sign as</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                maxLength={30}
                className="court-input mt-1.5"
              />
            </div>
            <button
              onClick={joinJury}
              disabled={joining || !nickname.trim() || isExpired}
              className="btn-hero w-full text-lg disabled:opacity-60"
            >
              <Users className="w-5 h-5" /> {joining ? "Joining..." : "Join the Jury"}
            </button>
          </div>
        ) : !myVote ? (
          <div className="mt-5 space-y-4 animate-rise">
            <div className="text-center">
              <p className="font-display text-2xl text-balance">Your vote decides this.</p>
              <p className="text-sm text-muted-foreground mt-1">One tap. No takebacks.</p>
            </div>

            <div className="grid gap-2.5">
              {VOTE_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setVote(o.v)}
                  className={`text-left rounded-2xl px-5 py-4 border-2 transition-all ${
                    vote === o.v
                      ? "border-accent bg-gradient-to-r " + o.color + " text-white shadow-[var(--shadow-gold)] scale-[1.01]"
                      : "border-border bg-card hover:bg-secondary/70 active:scale-[0.99]"
                  }`}
                >
                  <div className="font-stamp text-xl tracking-wide">{o.label}</div>
                  <div className={`text-xs mt-0.5 ${vote === o.v ? "text-white/85" : "text-muted-foreground"}`}>{o.tag}</div>
                </button>
              ))}
            </div>

            <div className="court-card p-4">
              <label className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">One-line evidence (optional)</label>
              <input
                value={evidence}
                onChange={(e) => setEvidence(e.target.value.slice(0, 80))}
                placeholder="Tell the court what you saw."
                maxLength={80}
                className="court-input mt-1.5"
              />
            </div>

            <button
              onClick={submitVote}
              disabled={submitting || !vote || isExpired}
              className="btn-hero w-full text-lg disabled:opacity-60"
            >
              <Gavel className="w-5 h-5" /> {submitting ? "Locking..." : vote ? "Lock my verdict" : "Choose a verdict"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              One vote per device. The jury is watching.
            </p>
          </div>
        ) : (
          <div className="mt-5 court-card p-5 animate-rise text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Your verdict is locked</p>
            <p className="font-stamp text-3xl mt-2 text-accent">{VOTE_SHORT[myVote.vote as VoteValue]}</p>
            {myVote.evidence_text && <p className="text-sm italic mt-2 text-muted-foreground">"{myVote.evidence_text}"</p>}
            <p className="text-xs text-muted-foreground mt-4">
              {juryComplete ? "The jury is complete." : "Waiting for the rest of the jury…"}
            </p>
          </div>
        )}

        {(isCreator || isExpired) && (
          <div className="mt-5 space-y-2">
            <button
              onClick={deliverVerdict}
              className={juryComplete || isExpired ? "btn-hero w-full text-lg animate-pulse-glow" : "btn-gold w-full"}
            >
              <ScrollText className="w-4 h-4" /> Deliver the Verdict
            </button>
            {!juryComplete && !isExpired && joinedCount > 0 && (
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Not all jurors have voted yet.
              </p>
            )}
            {joinedCount === 0 && !isExpired && (
              <p className="text-center text-[11px] text-muted-foreground">
                No one has joined the jury yet.
              </p>
            )}
          </div>
        )}
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
