import { CourtHeader } from "@/components/CourtHeader";
import { Link } from "react-router-dom";

const RULES = [
  "Keep it petty and playful.",
  "Do not include private personal details.",
  "Do not include serious allegations.",
  "No threats, harassment, explicit or hateful content.",
  "Do not use full real names.",
  "Don't use this for real disputes or accusations.",
];

export default function About() {
  return (
    <div className="min-h-dvh">
      <CourtHeader />
      <main className="px-5 pb-16 max-w-md mx-auto">
        <h1 className="font-display text-3xl mt-2 text-balance">Court is now in session.</h1>
        <p className="text-muted-foreground mt-2">OBJECTION! is a 2-minute group-chat party game. Tiny unserious crimes only.</p>

        <section className="mt-6 court-card p-5">
          <h2 className="font-display text-xl">The rules</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {RULES.map((r) => (
              <li key={r} className="flex gap-2"><span className="text-primary">•</span><span>{r}</span></li>
            ))}
          </ul>
        </section>

        <section className="mt-5 court-card p-5">
          <h2 className="font-display text-xl">How it works</h2>
          <ol className="mt-3 space-y-2 text-sm list-decimal pl-5">
            <li>Create an Instant Trial — accused, crime, optional sentence.</li>
            <li>Share the link into your group chat.</li>
            <li>Friends vote Guilty, Not Guilty, or Everyone Is Wrong.</li>
            <li>Verdict drops with a dramatic animated reveal.</li>
            <li>Share the verdict back — or file a Revenge Case.</li>
          </ol>
        </section>

        <section className="mt-5 court-card p-5">
          <h2 className="font-display text-xl">Party Court</h2>
          <p className="mt-2 text-sm text-muted-foreground">For groups who want full sessions: rooms, avatars, ready cases, a secret Chaos Lawyer, and a running group record.</p>
          <Link to="/party/new" className="btn-gold mt-4 inline-flex">Start Party Court</Link>
        </section>

        <Link to="/" className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">← Back to the courtroom</Link>
      </main>
    </div>
  );
}
