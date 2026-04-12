"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_ROUTE_MAP, ROLE_META } from '@/types';
import { ClipboardList, Wrench, DollarSign, BarChart3, ShieldCheck, Package, ArrowRight } from 'lucide-react';

interface NavCard {
  href: string;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  hoverBorder: string;
  hoverShadow: string;
  titleColor: string;
  accentBg: string;
}

const allCards: NavCard[] = [
  {
    href: '/reception',
    titleKey: 'reception',
    descKey: 'receptionDesc',
    icon: <ClipboardList className="w-7 h-7 text-emerald-400" />,
    hoverBorder: 'hover:border-emerald-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.12)]',
    titleColor: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
  },
  {
    href: '/technician',
    titleKey: 'technician',
    descKey: 'technicianDesc',
    icon: <Wrench className="w-7 h-7 text-orange-400" />,
    hoverBorder: 'hover:border-orange-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]',
    titleColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10 group-hover:bg-orange-500/20',
  },
  {
    href: '/advisor',
    titleKey: 'advisor',
    descKey: 'advisorDesc',
    icon: <DollarSign className="w-7 h-7 text-blue-400" />,
    hoverBorder: 'hover:border-blue-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.12)]',
    titleColor: 'text-blue-400',
    accentBg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
  },
  {
    href: '/analytics',
    titleKey: 'analytics',
    descKey: 'analyticsDesc',
    icon: <BarChart3 className="w-7 h-7 text-purple-400" />,
    hoverBorder: 'hover:border-purple-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]',
    titleColor: 'text-purple-400',
    accentBg: 'bg-purple-500/10 group-hover:bg-purple-500/20',
  },
  {
    href: '/inventory',
    titleKey: 'inventory',
    descKey: 'inventoryDesc',
    icon: <Package className="w-7 h-7 text-teal-400" />,
    hoverBorder: 'hover:border-teal-500/60',
    hoverShadow: 'hover:shadow-[0_0_30px_rgba(20,184,166,0.12)]',
    titleColor: 'text-teal-400',
    accentBg: 'bg-teal-500/10 group-hover:bg-teal-500/20',
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
    <div className="min-h-screen page-bg text-foreground flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 mb-3 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)] leading-tight">
          {t('appTitle')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('appSubtitle')}</p>
      </div>

      {/* Role badges */}
      {userProfile && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
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

      {/* Navigation grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full max-w-5xl">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative flex flex-col p-6 glass-panel rounded-2xl ${card.hoverBorder} ${card.hoverShadow} transition-all duration-300 hover:-translate-y-1`}
          >
            {/* Icon badge */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 ${card.accentBg}`}>
              {card.icon}
            </div>
            <h2 className={`text-lg font-bold mb-2 ${card.titleColor}`}>{t(card.titleKey)}</h2>
            <p className="text-muted-foreground text-sm flex-1 leading-relaxed">{t(card.descKey)}</p>
            {/* Arrow */}
            <div className={`mt-4 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${card.titleColor}`}>
              <span>Abrir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}

        {hasRole('ADMIN') && (
          <Link
            href="/admin/users"
            className="group relative flex flex-col p-6 glass-panel rounded-2xl hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] transition-all duration-300 hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-purple-500/10 group-hover:bg-purple-500/20 transition-all duration-300">
              <ShieldCheck className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold mb-2 text-purple-400">{t('userManagement')}</h2>
            <p className="text-muted-foreground text-sm flex-1 leading-relaxed">{t('userManagementDesc')}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-purple-400">
              <span>Abrir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}
      </div>

      {!user && !loading && (
        <p className="mt-10 text-muted-foreground text-sm">
          <Link href="/login" className="text-emerald-400 hover:underline">{t('loginPrompt')}</Link> {t('loginPromptSuffix')}
        </p>
      )}
    </div>
  );
}
