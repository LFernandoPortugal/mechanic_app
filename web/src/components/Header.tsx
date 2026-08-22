"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sun, Moon, Globe, LogOut, Users, Crown, Cog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_BADGE_CLASSES, ROLE_META } from "@/types";
import Link from "next/link";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const { user, userProfile, signOut, hasRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const primaryRole = userProfile?.roles?.includes('SUPER_ADMIN') ? 'SUPER_ADMIN'
    : userProfile?.roles?.includes('ADMIN') ? 'ADMIN'
    : userProfile?.roles?.includes('ADVISOR') ? 'ADVISOR'
    : userProfile?.roles?.includes('TECHNICIAN') ? 'TECHNICIAN'
    : userProfile?.roles?.includes('RECEPTION') ? 'RECEPTION'
    : null;

  const roleMeta = primaryRole ? ROLE_META[primaryRole] : null;

  if (pathname === "/" && hasRole("ADMIN")) return null;

  return (
    <header className="w-full sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 flex items-center justify-between h-14">
        {/* Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-lg font-bold tracking-tight text-foreground sm:gap-2 sm:text-xl"
        >
          <Cog className="text-primary" size={18} aria-hidden="true" /> SGA
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Super Admin link */}
          {user && hasRole('SUPER_ADMIN') && (
            <Link
              href="/super-admin"
              className="header-tool-btn h-11 w-11 text-destructive/80 hover:border-destructive/40 hover:text-destructive"
              title="Super Admin"
              aria-label="Super Admin"
            >
              <Crown size={16} />
            </Link>
          )}

          {/* Admin users link */}
          {user && hasRole('ADMIN') && (
            <Link
              href="/admin/users"
              className="header-tool-btn h-11 w-11 hover:border-primary/40 hover:text-primary"
              title={t('userManagement')}
              aria-label={t('userManagement')}
            >
              <Users size={16} />
            </Link>
          )}

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(lang === 'es' ? 'en' : 'es')}
            className="header-tool-btn h-11 w-11 gap-0 px-0 font-mono text-sm hover:border-primary/40 hover:text-primary sm:w-auto sm:gap-2 sm:px-3"
            title="Toggle Language"
            aria-label="Cambiar idioma"
          >
            <Globe size={15} />
            <span className="hidden sm:inline">{lang.toUpperCase()}</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="header-tool-btn h-11 w-11 hover:border-primary/40 hover:text-primary"
            title="Toggle Theme"
            aria-label="Cambiar tema"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User info + sign out */}
          {user && (
            <div className="flex items-center gap-1 sm:gap-2 pl-2 sm:pl-3 border-l border-border ml-0.5 sm:ml-1">
              {roleMeta && (
                <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${ROLE_BADGE_CLASSES[primaryRole!]}`}>
                  <span>{roleMeta.emoji}</span>
                  {t(roleMeta.labelKey)}
                </span>
              )}
              <span className="text-sm font-medium text-foreground hidden md:inline-block max-w-[150px] truncate">
                {userProfile?.displayName || user.email || 'Staff'}
              </span>
              <button
                onClick={handleSignOut}
                className="header-tool-btn h-11 w-11 hover:border-destructive/40 hover:text-destructive"
                title={t('signOut')}
                aria-label={t('signOut')}
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
