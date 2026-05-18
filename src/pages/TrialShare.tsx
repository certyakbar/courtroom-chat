import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Share2, MessageCircle, ExternalLink, Gavel } from "lucide-react";
import { CourtHeader } from "@/components/CourtHeader";
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
      <div className="min-h-dvh">
        <CourtHeader />
        <div className="px-5 max-w-md mx-auto pt-10 text-center text-muted-foreground">Preparing the courtroom...</div>
      </div>
    );
  }

  const url = `${window.location.origin}/t/${trial.slug}`;
  const shareText = trialShareText(trial.accused_name, trial.crime_text, url);

  return (
    <div className="min-h-dvh">
      <CourtHeader />
      <main className="px-5 pb-16 max-w-md mx-auto">
        <p className="text-[11px] uppercase tracking-[0.3em] text-accent">⚖ Summons issued</p>
        <h1 className="font-display text-3xl mt-2 text-balance">
          Send this to the group chat.
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">The group chat has entered the courtroom.</p>

        <div className="mt-5 court-card p-4 animate-rise">
          <div className="rounded-xl bg-[hsl(220_30%_4%)] border border-border p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Preview</div>
            <p className="font-display text-lg mt-2 text-balance">
              <span className="text-primary">{trial.accused_name}</span> has been summoned to OBJECTION!
            </p>
            <p className="text-sm text-muted-foreground mt-1 text-balance">Crime: {trial.crime_text}</p>
            <p className="text-xs mt-3 text-accent break-all">{url}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <button onClick={() => nativeShare({ title: "OBJECTION!", text: shareText, url }, shareText)} className="btn-hero w-full">
            <Share2 className="w-5 h-5" /> Native Share
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => copyText(url, "Link copied")} className="btn-ghost-court">
              <Copy className="w-4 h-4" /> Copy link
            </button>
            <button onClick={() => copyText(shareText, "Share text copied")} className="btn-ghost-court">
              <Copy className="w-4 h-4" /> Copy text
            </button>
          </div>
          <a href={whatsappUrl(shareText)} target="_blank" rel="noreferrer" className="btn-ghost-court">
            <MessageCircle className="w-4 h-4" /> Share to WhatsApp
          </a>
          <Link to={`/t/${trial.slug}`} className="btn-gold">
            <ExternalLink className="w-4 h-4" /> Open Trial
          </Link>
        </div>

        <div className="mt-6 court-card p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Suggested message</p>
          <pre className="whitespace-pre-wrap text-sm mt-2 font-sans">{shareText}</pre>
        </div>

        <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Gavel className="w-4 h-4" /> File another case
        </Link>
      </main>
    </div>
  );
}
