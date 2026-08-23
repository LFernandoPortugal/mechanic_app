"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, CarFront, ChevronDown, CircleHelp, ClipboardPlus, Globe2, Home, LogOut, Menu, Moon, Package, ReceiptText, Settings, ShieldCheck, Sun, Users, Wrench, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { UserRole } from "@/types";
import { BrandMark } from "@/components/brand/BrandMark";

const copy = {
  es: { home:"Inicio", operation:"Operación", management:"Gestión", reception:"Recepción", technician:"Técnico", advisor:"Órdenes", qc:"Control QC", payments:"Pagos", clients:"Clientes", employees:"Empleados", inventory:"Inventario", analytics:"Analítica", settings:"Configuración", help:"Ayuda", more:"Más", signout:"Cerrar sesión", theme:"Tema", system:"Sistema", close:"Cerrar menú", language:"Cambiar idioma", nav:"Navegación principal", mobileNav:"Navegación móvil", workshop:"Taller" },
  en: { home:"Home", operation:"Operations", management:"Management", reception:"Reception", technician:"Technician", advisor:"Orders", qc:"Quality check", payments:"Payments", clients:"Clients", employees:"Employees", inventory:"Inventory", analytics:"Analytics", settings:"Settings", help:"Help", more:"More", signout:"Sign out", theme:"Theme", system:"System", close:"Close menu", language:"Change language", nav:"Main navigation", mobileNav:"Mobile navigation", workshop:"Workshop" },
} as const;

type NavItem = { href: string; label: string; icon: typeof Home; roles: UserRole[] };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLanguage } = useLanguage();
  const c = copy[lang];
  const { user, userProfile, workshopSettings, signOut, hasAnyRole } = useAuth();
  const { preference, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [moreOpen]);

  const items: NavItem[] = [
    { href:"/", label:c.home, icon:Home, roles:["ADMIN","RECEPTION","TECHNICIAN","ADVISOR"] },
    { href:"/reception", label:c.reception, icon:ClipboardPlus, roles:["ADMIN","RECEPTION"] },
    { href:"/technician", label:c.technician, icon:Wrench, roles:["ADMIN","TECHNICIAN"] },
    { href:"/advisor", label:c.advisor, icon:CarFront, roles:["ADMIN","ADVISOR"] },
    { href:"/qc", label:c.qc, icon:ShieldCheck, roles:["ADMIN","ADVISOR","TECHNICIAN"] },
    { href:"/advisor/payments", label:c.payments, icon:ReceiptText, roles:["ADMIN","ADVISOR"] },
    { href:"/clients", label:c.clients, icon:Users, roles:["ADMIN","ADVISOR","RECEPTION"] },
    { href:"/inventory", label:c.inventory, icon:Package, roles:["ADMIN","ADVISOR"] },
    { href:"/admin/users", label:c.employees, icon:Users, roles:["ADMIN"] },
    { href:"/analytics", label:c.analytics, icon:BarChart3, roles:["ADMIN"] },
    { href:"/admin/settings", label:c.settings, icon:Settings, roles:["ADMIN"] },
    { href:"/help", label:c.help, icon:CircleHelp, roles:["ADMIN","RECEPTION","TECHNICIAN","ADVISOR"] },
  ];
  const visible = items.filter((item) => hasAnyRole(item.roles));
  const isAdmin = hasAnyRole(["ADMIN"]);
  const operationItems = visible.filter((item) => ["/reception", "/technician", "/advisor", "/qc", "/advisor/payments"].includes(item.href));
  const managementItems = visible.filter((item) => ["/clients", "/inventory", "/admin/users", "/analytics", "/admin/settings"].includes(item.href));
  const mobilePriority = isAdmin ? ["/", "/reception", "/advisor", "/clients"] : ["/", "/reception", "/technician", "/advisor", "/qc", "/clients"];
  const mobilePrimary = visible.filter((item) => mobilePriority.includes(item.href)).slice(0, 4);
  const mobileMore = visible.filter((item) => !mobilePrimary.includes(item));
  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const logout = async () => { await signOut(); router.push("/login"); };

  const renderLink = (item: NavItem, onClick?: () => void) => {
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} onClick={onClick} aria-current={active(item.href) ? "page" : undefined} className={`sidebar-link ${active(item.href) ? "sidebar-link-active" : ""}`}><Icon size={18} strokeWidth={1.8}/><span>{item.label}</span></Link>;
  };

  const renderGroup = (label: string, icon: typeof Home, groupItems: NavItem[]) => {
    const Icon = icon;
    const groupActive = groupItems.some((item) => active(item.href));
    return <details key={label} className="nav-group" open={groupActive || undefined}><summary className={`sidebar-link cursor-pointer list-none ${groupActive ? "text-sidebar-accent-foreground" : ""}`}><Icon size={18} strokeWidth={1.8}/><span className="flex-1">{label}</span><ChevronDown className="nav-group-chevron" size={15}/></summary><div className="nav-group-items">{groupItems.map((item) => renderLink(item))}</div></details>;
  };

  return <div className="app-shell min-h-[100dvh] bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <Link href="/" className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5"><span className="brand-mark"><BrandMark className="h-10 w-10" /></span><span className="min-w-0"><strong className="block font-black tracking-[-0.04em]">SGA</strong><small className="block truncate text-muted-foreground">{workshopSettings?.workshopName || c.workshop}</small></span></Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={c.nav}>{isAdmin ? <>{renderLink(visible.find((item) => item.href === "/")!)}{renderGroup(c.operation, CarFront, operationItems)}{renderGroup(c.management, Settings, managementItems)}{renderLink(visible.find((item) => item.href === "/help")!)}</> : visible.map((item) => renderLink(item))}</nav>
      <div className="border-t border-sidebar-border p-3"><button onClick={logout} className="sidebar-link w-full"><LogOut size={18}/>{c.signout}</button></div>
    </aside>
    <div className="lg:pl-60">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{workshopSettings?.workshopName || c.workshop}</p><p className="truncate text-xs text-muted-foreground">{userProfile?.displayName || user?.email}</p></div>
        <div className="flex items-center gap-2"><button className="tool-button" onClick={() => setLanguage(lang === "es" ? "en" : "es")} aria-label={c.language}><Globe2 size={17}/><span className="hidden sm:inline">{lang.toUpperCase()}</span></button><div className="theme-switch" role="group" aria-label={c.theme}>{(["light","system","dark"] as const).map((value) => <button key={value} aria-label={`${c.theme}: ${value === "system" ? c.system : value}`} aria-pressed={preference === value} onClick={() => setTheme(value)}>{value === "light" ? <Sun size={15}/> : value === "dark" ? <Moon size={15}/> : <span className="text-[10px] font-bold">A</span>}</button>)}</div><Link href="/help" className="tool-button hidden sm:inline-flex" aria-label={c.help}><CircleHelp size={17}/></Link></div>
      </header>
      <div className="mx-auto max-w-[1600px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">{children}</div>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label={c.mobileNav}>{mobilePrimary.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={`mobile-nav-link ${active(item.href) ? "text-primary" : ""}`}><Icon size={20}/><span>{item.label}</span></Link>; })}<button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className="mobile-nav-link"><Menu size={20}/><span>{c.more}</span></button></nav>
    {moreOpen && <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden" onClick={() => setMoreOpen(false)}><section role="dialog" aria-modal="true" aria-label={c.more} onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-card p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"><div className="mb-3 flex items-center justify-between"><strong>{c.more}</strong><button className="tool-button" onClick={() => setMoreOpen(false)} aria-label={c.close}><X size={18}/></button></div>{mobileMore.map((item) => renderLink(item))}<button onClick={logout} className="sidebar-link w-full text-destructive"><LogOut size={18}/>{c.signout}</button></section></div>}
  </div>;
}
