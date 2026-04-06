"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sun, Moon, Globe, LogOut, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ROLE_META } from "@/types";
import Link from "next/link";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const { user, userProfile, signOut, hasRole } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const primaryRole = userProfile?.roles?.includes('ADMIN') ? 'ADMIN'
    : userProfile?.roles?.includes('ADVISOR') ? 'ADVISOR'
    : userProfile?.roles?.includes('TECHNICIAN') ? 'TECHNICIAN'
    : userProfile?.roles?.includes('RECEPTION') ? 'RECEPTION'
    : null;

  const roleMeta = primaryRole ? ROLE_META[primaryRole] : null;

  return (
    <header className="w-full sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)] flex items-center gap-2"
        >
          <span className="text-emerald-400">⚙</span> SGA
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Admin users link */}
          {user && hasRole('ADMIN') && (
            <Link
              href="/admin/users"
              className="header-tool-btn w-9 h-9 hover:text-purple-400 hover:border-purple-500/40 hover:shadow-[0_0_10px_rgba(168,85,247,0.15)]"
              title={t('userManagement')}
            >
              <Users size={16} />
            </Link>
          )}

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(lang === 'es' ? 'en' : 'es')}
            className="header-tool-btn gap-2 px-3 h-9 hover:text-amber-400 hover:border-amber-500/40 hover:shadow-[0_0_10px_rgba(251,191,36,0.15)] font-mono text-sm"
            title="Toggle Language"
          >
            <Globe size={15} />
            {lang.toUpperCase()}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="header-tool-btn w-9 h-9 hover:text-emerald-400 hover:border-emerald-500/40 hover:shadow-[0_0_10px_rgba(52,211,153,0.15)]"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User info + sign out */}
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-border ml-1">
              {roleMeta && (
                <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleMeta.color}`}>
                  <span>{roleMeta.emoji}</span>
                  {t(roleMeta.labelKey)}
                </span>
              )}
              <span className="text-sm font-medium text-foreground hidden md:inline-block max-w-[150px] truncate">
                {userProfile?.displayName || user.email || 'Staff'}
              </span>
              <button
                onClick={handleSignOut}
                className="header-tool-btn w-9 h-9 hover:text-red-400 hover:border-red-500/40 hover:shadow-[0_0_10px_rgba(248,113,113,0.15)]"
                title={t('signOut')}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
