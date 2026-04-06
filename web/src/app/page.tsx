"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_ROUTE_MAP, ROLE_META } from '@/types';
import { ClipboardList, Wrench, DollarSign, BarChart3, ShieldCheck } from 'lucide-react';

interface NavCard {
  href: string;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  hoverBorder: string;
  hoverShadow: string;
  titleColor: string;
}

const allCards: NavCard[] = [
  {
    href: '/reception',
    titleKey: 'reception',
    descKey: 'receptionDesc',
    icon: <ClipboardList className="w-6 h-6 text-emerald-400 mb-3" />,
    hoverBorder: 'hover:border-emerald-500/50',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]',
    titleColor: 'text-emerald-400',
  },
  {
    href: '/technician',
    titleKey: 'technician',
    descKey: 'technicianDesc',
    icon: <Wrench className="w-6 h-6 text-orange-400 mb-3" />,
    hoverBorder: 'hover:border-orange-500/50',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    titleColor: 'text-orange-400',
  },
  {
    href: '/advisor',
    titleKey: 'advisor',
    descKey: 'advisorDesc',
    icon: <DollarSign className="w-6 h-6 text-blue-400 mb-3" />,
    hoverBorder: 'hover:border-blue-500/50',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    titleColor: 'text-blue-400',
  },
  {
    href: '/analytics',
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    icon: <BarChart3 className="w-6 h-6 text-purple-400 mb-3" />,
    hoverBorder: 'hover:border-purple-500/50',
    hoverShadow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    titleColor: 'text-purple-400',
  },
];

export default function Home() {
  const { t } = useLanguage();
  const { user, userProfile, hasAnyRole, hasRole, loading } = useAuth();

  const visibleCards = user && userProfile
    ? allCards.filter((card) => {
        const requiredRoles = ROLE_ROUTE_MAP[card.href];
        if (!requiredRoles) return true;
        return hasAnyRole(requiredRoles);
      })
    : allCards;

  return (
    <div className="min-h-screen page-bg text-foreground p-8 flex flex-col items-center justify-center">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 mb-2 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{t('appTitle')}</h1>
      <p className="text-muted-foreground mb-4 max-w-sm text-center">{t('appSubtitle')}</p>

      {userProfile && (
        <div className="flex items-center gap-2 mb-8">
          {userProfile.roles.map((role) => {
            const meta = ROLE_META[role];
            return (
              <span key={role} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${meta.color}`}>
                {meta.emoji} {t(meta.labelKey)}
              </span>
            );
          })}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`block p-6 glass-panel rounded-xl ${card.hoverBorder} ${card.hoverShadow} transition-all`}
          >
            {card.icon}
            <h2 className={`text-xl font-semibold mb-2 ${card.titleColor}`}>{t(card.titleKey)}</h2>
            <p className="text-muted-foreground text-sm">{t(card.descKey)}</p>
          </Link>
        ))}

        {hasRole('ADMIN') && (
          <Link
            href="/admin/users"
            className="block p-6 glass-panel rounded-xl hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all"
          >
            <ShieldCheck className="w-6 h-6 text-purple-400 mb-3" />
            <h2 className="text-xl font-semibold mb-2 text-purple-400">{t('userManagement')}</h2>
            <p className="text-muted-foreground text-sm">{t('userManagementDesc')}</p>
          </Link>
        )}
      </div>

      {!user && !loading && (
        <p className="mt-8 text-muted-foreground text-sm">
          <Link href="/login" className="text-emerald-400 hover:underline">{t('loginPrompt')}</Link> {t('loginPromptSuffix')}
        </p>
      )}
    </div>
  );
}
