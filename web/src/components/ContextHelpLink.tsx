import Link from "next/link";
import { CircleHelp } from "lucide-react";

export function ContextHelpLink({ section, compact = false, lang = "es" }: { section: string; compact?: boolean; lang?: "es" | "en" }) {
  const label = lang === "es" ? "Ver ayuda de esta pantalla" : "View help for this screen";

  return (
    <Link
      href={`/help#${section}`}
      aria-label={label}
      className={compact ? "tool-button" : "app-button-secondary gap-2"}
    >
      <CircleHelp size={17} />
      {!compact && <span>{lang === "es" ? "Cómo funciona" : "How it works"}</span>}
    </Link>
  );
}
