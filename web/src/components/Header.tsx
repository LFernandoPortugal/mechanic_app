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
    <header className="w-full flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
          SGA
        </Link>
      </div>
      
      <div className="flex items-center gap-3">
        {user && hasRole('ADMIN') && (
          <Link
            href="/admin/users"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary border border-border text-muted-foreground hover:text-purple-400 hover:border-purple-500/50 transition-all"
            title={t('userManagement')}
          >
            <Users size={16} />
          </Link>
        )}

        <button 
          onClick={() => setLanguage(lang === 'es' ? 'en' : 'es')}
          className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-amber-400 hover:border-amber-500/50 transition-all font-mono text-sm"
          title="Toggle Language"
        >
          <Globe size={16} />
          {lang.toUpperCase()}
        </button>

        <button 
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary border border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-border ml-1">
             {roleMeta && (
               <span className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleMeta.color}`}>
                 <span>{roleMeta.emoji}</span>
                 {t(roleMeta.labelKey)}
               </span>
             )}
             <span className="text-sm font-medium text-foreground hidden md:inline-block max-w-[160px] truncate">
               {userProfile?.displayName || user.email || 'Staff'}
             </span>
             <button 
               onClick={handleSignOut}
               className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/50 transition-all"
               title={t('signOut')}
             >
               <LogOut size={16} />
             </button>
          </div>
        )}
      </div>
    </header>
  );
}
