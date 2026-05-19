import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Share2, MessageCircle, ExternalLink, Gavel, Scale, Link as LinkIcon, Hash, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  copyText,
  nativeShare,
  trialMessagePlain,
  trialMessageWhatsApp,
  trialMessageDiscord,
} from "@/lib/share";
import { CourtroomStage } from "@/components/courtroom3d/CourtroomStage";

type Trial = {
  id: string; slug: string; accused_name: string; crime_text: string;
  closes_at: string; status: string;
};

export default function TrialShare() {
  const { slug } = useParams();
  const [trial, setTrial] = useState<Trial | null>(null);
  const [joined, setJoined] = useState(0);
  const [voted, setVoted] = useState(0);

  // Initial trial load
  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("instant_trials")
        .select("id,slug,accused_name,crime_text,closes_at,status")
        .eq("slug", slug)
        .maybeSingle();
      setTrial(data as any);
    })();
  }, [slug]);

  // Poll live court status
  useEffect(() => {
    if (!trial?.id) return;
    let cancelled = false;
    const tick = async () => {
      const [{ count: jCount }, { count: vCount }, { data: t }] = await Promise.all([
        supabase.from("instant_jurors").select("id", { count: "exact", head: true }).eq("trial_id", trial.id),
        supabase.from("instant_votes").select("id", { count: "exact", head: true }).eq("trial_id", trial.id),
        supabase.from("instant_trials").select("status").eq("id", trial.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setJoined(jCount ?? 0);
      setVoted(vCount ?? 0);
      if (t && (t as any).status !== trial.status) {
        setTrial({ ...trial, status: (t as any).status });
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [trial?.id]);

  if (!trial) {
    return (
      <main className="min-h-dvh px-5 max-w-md mx-auto pt-20 text-center text-muted-foreground">
        Preparing the courtroom...
      </main>
    );
  }

  const url = `${window.location.origin}/t/${trial.slug}`;
  const waMsg = trialMessageWhatsApp(url);
  const discordMsg = trialMessageDiscord(url);
  const plainMsg = trialMessagePlain(url);

  const verdictDelivered = trial.status === "verdict_delivered" || trial.status === "closed";
  const phase: "summons" | "waiting" = joined > 0 || verdictDelivered ? "waiting" : "summons";
  const variant: "hero" | "waiting" = joined > 0 ? "waiting" : "hero";

  let statusLine: string;
  let statusTone: "idle" | "forming" | "active" | "done" = "idle";
  if (verdictDelivered) { statusLine = "Verdict delivered."; statusTone = "done"; }
  else if (voted > 0) { statusLine = "The court is active."; statusTone = "active"; }
  else if (joined > 0) { statusLine = "The jury is forming."; statusTone = "forming"; }
  else { statusLine = "Awaiting jury."; statusTone = "idle"; }

  return (
    <div className="min-h-dvh relative">
      <main className="relative z-10 px-5 pt-6 pb-20 max-w-md mx-auto">
        <div className="pointer-events-none absolute -inset-x-8 sm:-inset-x-16 top-0 bottom-0 z-0">
          <CourtroomStage
            phase={phase}
            variant={variant}
            joinedCount={joined}
            votedCount={voted}
            juryComplete={joined > 0 && voted >= joined}
            className="absolute inset-0"
          />
        </div>
        <div className="relative z-10">

        {/* Top headline — what's happening right now */}
        <section className="text-center pt-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent">
            {verdictDelivered ? "⚖ Verdict in" : "⚖ Summons live"}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mt-2 text-balance">
            {verdictDelivered ? "Verdict delivered." : "Summons issued."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {verdictDelivered ? "The court has ruled." : "The group chat must decide."}
          </p>
        </section>

        {/* Live court status pill */}
        <div className="mt-4 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 border border-border text-xs">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                statusTone === "done"
                  ? "bg-[hsl(var(--stamp))]"
                  : statusTone === "active"
                  ? "bg-accent animate-pulse"
                  : statusTone === "forming"
                  ? "bg-accent/80 animate-pulse"
                  : "bg-muted-foreground/50"
              }`}
            />
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground/90 font-medium tabular-nums">{joined}</span>
            <span className="text-muted-foreground">joined ·</span>
            <span className="text-foreground/90 font-medium tabular-nums">{voted}</span>
            <span className="text-muted-foreground">voted</span>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {statusLine}
        </p>

        {/* Screenshot-friendly summons card — generic */}
        <div id="summons-card" className="relative mt-5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] tracking-[0.3em] font-stamp bg-[hsl(var(--stamp))] text-primary-foreground shadow-[var(--shadow-stamp)] uppercase">
              {verdictDelivered ? "Verdict In" : "Summons Issued"}
            </span>
          </div>

          <div className="paper rounded-3xl p-5 pt-7 animate-rise text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[hsl(var(--stamp))] text-primary-foreground">
                <Scale className="w-3.5 h-3.5" />
              </span>
              <span className="font-stamp tracking-widest text-[hsl(var(--paper-ink))] text-sm">OBJECTION!</span>
            </div>

            <div className="gavel-line mt-3" />

            <h2 className="font-display text-2xl sm:text-3xl mt-4 text-[hsl(var(--paper-ink))] text-balance leading-tight uppercase tracking-wide">
              You've been summoned
            </h2>

            <p className="mt-2 font-display text-base text-[hsl(var(--paper-ink))] text-balance">
              The group chat must decide.
            </p>

            <div className="mt-3 flex items-center justify-center">
              <div className="stamp font-stamp text-base sm:text-lg">
                {verdictDelivered ? "VERDICT IN" : "PENDING JURY"}
              </div>
            </div>

            <div className="gavel-line mt-4" />
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">
              Enter the courtroom
            </p>
          </div>
        </div>

        {/* Primary CTAs — react to state */}
        <div className="mt-5 space-y-2.5">
          {verdictDelivered ? (
            <>
              <Link to={`/t/${trial.slug}`} className="btn-hero w-full text-lg animate-pulse-glow">
                <Gavel className="w-5 h-5" /> Open Verdict
              </Link>
              <Link to="/" className="btn-ghost-court w-full">
                <Scale className="w-4 h-4" /> File another case
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => nativeShare({ title: "OBJECTION!", text: plainMsg, url }, plainMsg)}
                className="btn-hero w-full text-lg animate-pulse-glow"
              >
                <Share2 className="w-5 h-5" /> Share Summons
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => copyText(url, "Link copied")} className="btn-ghost-court text-sm">
                  <LinkIcon className="w-4 h-4" /> Copy Link
                </button>
                <Link
                  to={`/t/${trial.slug}`}
                  className={`btn-ghost-court text-sm ${joined > 0 ? "ring-1 ring-accent/60 text-accent" : ""}`}
                >
                  <ExternalLink className="w-4 h-4" />
                  {joined > 0 ? "Open Live Courtroom" : "Open Courtroom"}
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Platform-specific copy — quieter, hidden after verdict */}
        {!verdictDelivered && (
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-2 text-center">
              Or copy for
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => copyText(waMsg, "WhatsApp summons copied")} className="btn-ghost-court text-xs">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button onClick={() => copyText(discordMsg, "Discord summons copied")} className="btn-ghost-court text-xs">
                <Hash className="w-3.5 h-3.5" /> Discord
              </button>
              <button onClick={() => copyText(plainMsg, "Plain summons copied")} className="btn-ghost-court text-xs">
                <Copy className="w-3.5 h-3.5" /> Plain
              </button>
            </div>
          </div>
        )}

        {/* Creator-only case details — small */}
        <details className="mt-5 group">
          <summary className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 cursor-pointer select-none hover:text-foreground/80 list-none text-center">
            <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/60 group-open:bg-accent mr-1.5 align-middle" />
            Your case (only you see this)
          </summary>
          <div className="mt-2 court-card p-3 text-xs">
            <p className="text-muted-foreground">Subject: <span className="text-foreground font-medium">{trial.accused_name}</span></p>
            <p className="text-muted-foreground mt-1">Charge: <span className="text-foreground font-medium">{trial.crime_text}</span></p>
          </div>
        </details>

        {!verdictDelivered && (
          <Link
            to="/"
            className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Gavel className="w-3.5 h-3.5" /> File another case
          </Link>
        )}
        </div>
      </main>
    </div>
  );
}
