import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Share2, MessageCircle, ExternalLink, Gavel, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { copyText, nativeShare, trialShareText, whatsappUrl } from "@/lib/share";

type Trial = {
  id: string; slug: string; accused_name: string; crime_text: string; closes_at: string;
};

export default function TrialShare() {
  const { slug } = useParams();
  const [trial, setTrial] = useState<Trial | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data } = await supabase.from("instant_trials").select("id,slug,accused_name,crime_text,closes_at").eq("slug", slug).maybeSingle();
      setTrial(data as any);
    })();
  }, [slug]);

  if (!trial) {
    return (
      <main className="min-h-dvh px-5 max-w-md mx-auto pt-20 text-center text-muted-foreground">
        Preparing the courtroom...
      </main>
    );
  }

  const url = `${window.location.origin}/t/${trial.slug}`;
  const shareText = trialShareText(trial.accused_name, trial.crime_text, url);

  return (
    <div className="min-h-dvh">
      <main className="px-5 pt-6 pb-20 max-w-md mx-auto">
        {/* Verdict-style summons card — make it screenshot-worthy */}
        <div className="relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] tracking-[0.3em] font-stamp bg-[hsl(var(--stamp))] text-primary-foreground shadow-[var(--shadow-stamp)] uppercase">
              Summons Issued
            </span>
          </div>

          <div className="paper rounded-3xl p-6 pt-8 animate-rise">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[hsl(var(--stamp))] text-primary-foreground">
                  <Scale className="w-4 h-4" />
                </span>
                <span className="font-stamp tracking-widest text-[hsl(var(--paper-ink))]">OBJECTION!</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[hsl(24_20%_30%)]">Case #{trial.slug.toUpperCase()}</span>
            </div>

            <div className="gavel-line mt-4" />

            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">The accused</p>
              <h1 className="font-display text-4xl mt-1 text-[hsl(var(--paper-ink))] text-balance leading-tight">
                {trial.accused_name}
              </h1>
            </div>

            <div className="mt-5 rounded-xl bg-[hsl(36_30%_88%)] border border-[hsl(30_24%_78%)] p-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">Charged with</p>
              <p className="font-display text-lg mt-1 text-[hsl(var(--paper-ink))] text-balance">
                {trial.crime_text}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <div className="stamp font-stamp text-lg sm:text-xl">PENDING JURY</div>
            </div>

            <div className="gavel-line mt-6" />
            <p className="mt-3 text-center text-[11px] uppercase tracking-[0.3em] text-[hsl(24_20%_35%)]">
              The group chat must decide
            </p>
          </div>
        </div>

        {/* Headline copy */}
        <div className="mt-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl leading-tight text-balance">
            Send this to the group chat.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground text-balance">
            The accused has been summoned. The jury hasn't arrived yet.
          </p>
        </div>

        {/* Dominant share actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => nativeShare({ title: "OBJECTION!", text: shareText, url }, shareText)}
            className="btn-hero w-full text-lg animate-pulse-glow"
          >
            <Share2 className="w-5 h-5" /> Send to the chat
          </button>
          <a href={whatsappUrl(shareText)} target="_blank" rel="noreferrer" className="btn-gold w-full">
            <MessageCircle className="w-5 h-5" /> Drop in WhatsApp
          </a>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => copyText(shareText, "Summons copied")} className="btn-ghost-court">
              <Copy className="w-4 h-4" /> Copy summons
            </button>
            <button onClick={() => copyText(url, "Link copied")} className="btn-ghost-court">
              <Copy className="w-4 h-4" /> Copy link
            </button>
          </div>
        </div>

        {/* Secondary */}
        <Link
          to={`/t/${trial.slug}`}
          className="mt-6 flex items-center justify-center gap-2 text-sm text-accent hover:underline"
        >
          <ExternalLink className="w-4 h-4" /> Open the courtroom
        </Link>

        <Link to="/" className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Gavel className="w-3.5 h-3.5" /> File another case
        </Link>
      </main>
    </div>
  );
}
