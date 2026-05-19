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
import { CourtroomStage, type Phase, type Result } from "@/components/courtroom3d/CourtroomStage";

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
  if (!target) return { label: "", urgent: false, critical: false, closed: false, ms: 0 };
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { label: "CLOSED", urgent: false, critical: false, closed: true, ms: 0 };
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const urgent = ms < 60_000;
  const critical = ms < 15_000;
  if (h) return { label: `${h}h ${m}m left`, urgent: false, critical: false, closed: false, ms };
  return { label: `${m}:${sec.toString().padStart(2, "0")} left`, urgent, critical, closed: false, ms };
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
  const [revealComplete, setRevealComplete] = useState(false);
  const [revealStep, setRevealStep] = useState<import("@/components/courtroom3d/CourtroomStage").RevealStep | undefined>(undefined);
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

  // Flash counts when they change
  const [joinedFlash, setJoinedFlash] = useState(0);
  const [votedFlash, setVotedFlash] = useState(0);
  const prevJoined = useRef(joinedCount);
  const prevVoted = useRef(votedCount);
  useEffect(() => {
    if (joinedCount > prevJoined.current) setJoinedFlash((n) => n + 1);
    prevJoined.current = joinedCount;
  }, [joinedCount]);
  useEffect(() => {
    if (votedCount > prevVoted.current) setVotedFlash((n) => n + 1);
    prevVoted.current = votedCount;
  }, [votedCount]);

  const tally = useMemo(() => tallyVotes(votes), [votes]);

  const MICROCOPY = [
    "The accused is sweating…",
    "The jury is whispering…",
    "Evidence is being reviewed…",
    "Someone is definitely lying…",
    "The group chat is deciding…",
    "The verdict is loading dramatically…",
  ];


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

  // Stage props
  const stagePhase: Phase = showReveal
    ? "reveal"
    : myVote
    ? "waiting"
    : "voting";
  const stageResult: Result = showReveal
    ? ((trial.result as Result) || (tally.winner as Result))
    : null;
  const stageVariant: "ambient" | "waiting" | "reveal" = showReveal
    ? "reveal"
    : myVote
    ? "waiting"
    : "ambient";

  const Stage = (
    <div className="pointer-events-none absolute -inset-x-8 sm:-inset-x-20 top-0 bottom-0 z-0">
      <CourtroomStage
        phase={stagePhase}
        result={stageResult}
        variant={stageVariant}
        joinedCount={joinedCount}
        votedCount={votedCount}
        juryComplete={juryComplete}
        countdownUrgent={countdown.urgent}
        countdownCritical={countdown.critical}
        className="absolute inset-0"
      />
    </div>
  );

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
      <div className="min-h-dvh relative">
        <CourtHeader />
        <main className="relative z-10 px-5 pb-10 max-w-md mx-auto">
          {Stage}
          <div className="relative z-10 space-y-3">
          <VerdictReveal
            counts={tally.counts}
            total={tally.total}
            winner={result}
            confidence={confidence}
            caseTitle={trial.crime_text}
            accused={trial.accused_name}
            sentence={sentence}
            bestEvidence={best?.evidence_text || null}
            onDone={() => setRevealComplete(true)}
            settled={revealComplete}
          />

          {/* Hidden VerdictCard kept mounted purely for PNG export */}
          <div className="absolute -left-[10000px] top-0 pointer-events-none" aria-hidden="true">
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
          </div>

          {/* Primary CTA — keep the loop alive */}
          <Link
            to={`/?revenge=${encodeURIComponent(trial.accused_name)}`}
            className="btn-gold w-full text-lg animate-pulse-glow"
          >
            <Repeat2 className="w-5 h-5" /> File Revenge Case
          </Link>

          {/* Secondary CTA */}
          <Link to="/" className="btn-ghost-court w-full">
            <Gavel className="w-4 h-4" /> Start New Trial
          </Link>

          {/* Compact share/save row */}
          <details className="court-card p-3 group">
            <summary className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground cursor-pointer flex items-center justify-between list-none">
              <span>Share or save</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => nativeShare({ title: "OBJECTION! Verdict", text: plainMsg, url }, plainMsg)} className="btn-ghost-court text-xs py-2">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <button onClick={saveCard} className="btn-ghost-court text-xs py-2">
                <Download className="w-3.5 h-3.5" /> Save PNG
              </button>
              <button onClick={() => copyText(waMsg, "WhatsApp verdict copied")} className="btn-ghost-court text-xs py-2">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button onClick={() => copyText(discordMsg, "Discord verdict copied")} className="btn-ghost-court text-xs py-2">
                <Hash className="w-3.5 h-3.5" /> Discord
              </button>
              <button onClick={() => copyText(plainMsg, "Plain verdict copied")} className="btn-ghost-court text-xs py-2">
                <Copy className="w-3.5 h-3.5" /> Plain
              </button>
              <button onClick={() => copyText(url, "Link copied")} className="btn-ghost-court text-xs py-2">
                <LinkIcon className="w-3.5 h-3.5" /> Link
              </button>
            </div>
          </details>
          </div>
        </main>
      </div>
    );
  }

  // Jury status copy
  let juryStatusLine = "Waiting for the jury to arrive.";
  if (joinedCount > 0 && juryComplete) juryStatusLine = "Jury complete. Verdict incoming.";
  else if (joinedCount > 0) juryStatusLine = `Waiting on ${waitingOn} juror${waitingOn === 1 ? "" : "s"}.`;

  const locked = !!myVote;

  return (
    <div className={`min-h-dvh relative ${countdown.critical ? "animate-screen-shake" : ""}`}>
      <CourtHeader />
      <main className="relative z-10 px-5 pb-16 max-w-md mx-auto perspective-stage">
        {Stage}
        <div className="relative z-10">
        {/* Case header — compresses after vote so the live court takes focus */}
        <div
          className={`court-card relative overflow-hidden transition-all duration-500 ${
            locked ? "p-3.5" : "p-5"
          } ${countdown.urgent && !locked ? "animate-breathe" : ""}`}
        >
          {!locked && (
            <>
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_hsl(0_84%_30%/0.18),_transparent_60%)]" />
              <div className="spotlight-layer animate-spotlight" />
            </>
          )}
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.35em] text-accent font-stamp">
                {locked ? "⚖ In session" : "⚖ Court in session"}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                  countdown.closed
                    ? "border-border bg-secondary/60 text-muted-foreground"
                    : countdown.critical
                    ? "border-[hsl(var(--stamp))] bg-[hsl(var(--stamp)/0.28)] text-[hsl(0_95%_80%)] animate-urgent-pulse"
                    : countdown.urgent
                    ? "border-[hsl(var(--stamp))] bg-[hsl(var(--stamp)/0.18)] text-[hsl(0_90%_72%)] animate-pulse"
                    : "border-border bg-secondary/60 text-muted-foreground"
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> {countdown.label}
              </span>
            </div>
            {locked ? (
              <div className="mt-2 flex items-baseline gap-2 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground shrink-0">Accused</p>
                <h1 className="font-display text-xl text-primary truncate">{trial.accused_name}</h1>
              </div>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-4">The accused</p>
                <h1 className="font-display text-4xl mt-1 text-balance leading-tight">
                  <span className="text-primary">{trial.accused_name}</span>
                </h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-4">Charged with</p>
                <p className="mt-1 text-foreground/95 text-balance text-lg font-display">{trial.crime_text}</p>
                {countdown.critical && !countdown.closed && (
                  <p className="text-[11px] mt-3 text-[hsl(0_95%_78%)] uppercase tracking-[0.25em] font-stamp">Final votes now.</p>
                )}
                {countdown.urgent && !countdown.critical && !countdown.closed && (
                  <p className="text-[11px] mt-3 text-[hsl(0_85%_72%)] uppercase tracking-[0.25em]">Court is closing soon.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Locked stamp — the impact moment right after voting */}
        {locked && (
          <div className="mt-3 text-center animate-rise">
            <div className="inline-flex flex-col items-center gap-1">
              <div className="stamp font-stamp text-xl sm:text-2xl px-4 py-1.5 animate-stamp">
                {VOTE_SHORT[myVote!.vote as VoteValue].toUpperCase()} — LOCKED
              </div>
              {myVote!.evidence_text && (
                <p className="text-xs italic text-muted-foreground/90 mt-1.5 max-w-xs">"{myVote!.evidence_text}"</p>
              )}
            </div>
          </div>
        )}

        {/* Jury status — the live courtroom, foregrounded after vote */}
        <div className={`mt-3 court-card p-4 ${locked ? "ring-1 ring-accent/30" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-accent" />
              <span className="font-stamp tracking-wide">
                Jury: <span key={`j-${joinedFlash}`} className="animate-count-flash">{joinedCount}</span> joined ·{" "}
                <span key={`v-${votedFlash}`} className="animate-count-flash">{votedCount}</span> voted
              </span>
            </div>
            {juryComplete && <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-chip-lock" />}
          </div>
          <p className={`text-xs mt-1.5 ${juryComplete ? "text-emerald-400" : "text-muted-foreground"}`}>
            {juryStatusLine}
          </p>
          {jurors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 perspective-stage">
              {jurors.map((j) => {
                const voted = votes.some((v) => v.browser_token === j.browser_token);
                return (
                  <span
                    key={j.id}
                    className={`text-[11px] rounded-full px-2.5 py-1 border animate-chip-pop ${voted ? "animate-chip-lock" : "animate-breathe"} ${
                      voted
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_4px_14px_-4px_hsl(142_70%_45%/0.45)]"
                        : "bg-secondary/60 border-border text-muted-foreground"
                    }`}
                  >
                    {voted ? "✓ " : "… "}{j.nickname}
                  </span>
                );
              })}
            </div>
          )}
          {locked && !juryComplete && (
            <p key={microIdx} className="text-xs italic text-muted-foreground/80 mt-3 text-center animate-rise">
              {MICROCOPY[microIdx % MICROCOPY.length]}
            </p>
          )}
        </div>


        {!myVote && (
          <div className="mt-5 space-y-4 animate-rise">
            <div className="text-center">
              <p className="font-display text-2xl text-balance">Your vote decides this.</p>
              <p className="text-sm text-muted-foreground mt-1">Pick a verdict. Lock it in.</p>
            </div>

            <div className="court-card p-4">
              <label className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Your nickname</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="What the jury should call you"
                maxLength={30}
                className="court-input mt-1.5"
              />
            </div>

            <div className="grid gap-2.5 perspective-stage">
              {VOTE_OPTIONS.map((o) => {
                const selected = vote === o.v;
                const dimmed = vote && !selected;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setVote(o.v)}
                    className={`text-left rounded-2xl px-5 py-4 border-2 tilt-press transition-all ${
                      selected
                        ? "border-accent bg-gradient-to-r " + o.color + " text-white shadow-[var(--shadow-gold)] tilt-press-selected animate-pulse-gold scale-[1.02]"
                        : dimmed
                        ? "border-border bg-card opacity-45 scale-[0.97] hover:opacity-75"
                        : "border-border bg-card hover:bg-secondary/70 active:scale-[0.99]"
                    }`}
                  >
                    <div className="font-stamp text-xl tracking-wide">{o.label}</div>
                    <div className={`text-xs mt-0.5 ${selected ? "text-white/85" : "text-muted-foreground"}`}>{o.tag}</div>
                  </button>
                );
              })}
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
              disabled={submitting || !vote || !nickname.trim() || isExpired}
              className={`btn-hero w-full text-lg disabled:opacity-60 transition-all ${vote && !submitting ? "animate-pulse-glow scale-[1.02]" : ""}`}
            >
              <Gavel className={`w-5 h-5 ${submitting ? "animate-gavel-slam" : ""}`} /> {submitting ? "Locking..." : vote ? "Lock my verdict" : "Choose a verdict"}
            </button>
          </div>
        )}

        {isCreator && (() => {
          const noVotes = votedCount === 0;
          const ready = juryComplete || isExpired;
          const partial = !ready && votedCount > 0;
          const label = isExpired
            ? "Deliver Final Verdict"
            : ready
            ? "Drop the Verdict"
            : noVotes
            ? "Waiting for jury"
            : "Deliver Early";
          const cardTone = isExpired
            ? "border-[hsl(var(--stamp))]/60 shadow-[0_0_30px_-10px_hsl(var(--stamp)/0.6)]"
            : ready
            ? "border-emerald-500/50 shadow-[0_0_30px_-10px_hsl(142_70%_45%/0.55)]"
            : partial
            ? "border-amber-500/40"
            : "border-accent/30";
          return (
            <div className={`mt-5 court-card p-4 space-y-2 border-2 ${cardTone} ${partial ? "animate-breathe" : ""}`}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-stamp">Host controls</p>
              <p className="text-xs text-muted-foreground">You created this trial. You control the verdict.</p>
              <button
                onClick={deliverVerdict}
                disabled={noVotes && !isExpired}
                className={
                  ready
                    ? "btn-hero w-full text-lg animate-pulse-gold"
                    : partial
                    ? "btn-gold w-full animate-pulse"
                    : "btn-gold w-full disabled:opacity-60"
                }
              >
                <ScrollText className="w-4 h-4" /> {label}
              </button>
              {partial && (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not all jurors have voted yet.
                </p>
              )}
              {noVotes && !isExpired && (
                <p className="text-center text-[11px] text-muted-foreground">
                  No votes yet. Share the link to summon the jury.
                </p>
              )}
            </div>
          );
        })()}

        {!isCreator && isExpired && !hasVerdict && (
          <div className="mt-5 court-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Time's up. Waiting for the host to drop the verdict.</p>
          </div>
        )}
        </div>
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
