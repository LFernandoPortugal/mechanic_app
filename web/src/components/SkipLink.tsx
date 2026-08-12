"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export function SkipLink() {
  const { t } = useLanguage();

  return (
    <a
      href="#main-content"
      onClick={(event) => {
        const main = document.getElementById("main-content");
        if (!main) return;
        event.preventDefault();
        main.focus();
        main.scrollIntoView({ block: "start" });
        window.history.replaceState(null, "", "#main-content");
      }}
      className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg focus:not-sr-only"
    >
      {t("skipToContent")}
    </a>
  );
}
