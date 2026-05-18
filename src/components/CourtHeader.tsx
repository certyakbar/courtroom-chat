import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

export function CourtHeader({ subtle = false }: { subtle?: boolean }) {
  return (
    <header className={`w-full px-5 pt-5 pb-3 flex items-center justify-between ${subtle ? "" : ""}`}>
      <Link to="/" className="group flex items-center gap-2">
        <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[hsl(355_70%_38%)] shadow-[0_8px_24px_-8px_hsl(var(--stamp)/0.7)]">
          <Scale className="w-5 h-5 text-primary-foreground" />
        </span>
        <span className="font-stamp text-xl tracking-wider text-foreground">
          OBJECTION<span className="text-primary">!</span>
        </span>
      </Link>
      <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Rules
      </Link>
    </header>
  );
}
