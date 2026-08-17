"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, Building2, CarFront, CircleHelp, Globe2, Home, LogOut, Menu, Moon, Package, Settings, Sun, Users, Wrench, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

const labels = {
 es:{home:"Inicio",orders:"Órdenes",clients:"Clientes",employees:"Empleados",inventory:"Inventario",analytics:"Analítica",settings:"Configuración",help:"Ayuda",soon:"Próximamente",more:"Más",signout:"Cerrar sesión",theme:"Tema",system:"Sistema"},
 en:{home:"Home",orders:"Orders",clients:"Clients",employees:"Employees",inventory:"Inventory",analytics:"Analytics",settings:"Settings",help:"Help",soon:"Coming soon",more:"More",signout:"Sign out",theme:"Theme",system:"System"}
} as const;

export function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname(); const router=useRouter(); const {lang,setLanguage}=useLanguage(); const c=labels[lang];
 const {user,userProfile,workshopSettings,signOut}=useAuth(); const {preference,setTheme}=useTheme(); const [more,setMore]=useState(false);
 const primary=[["/",c.home,Home],["/advisor",c.orders,CarFront],["/clients",c.clients,Users],["/inventory",c.inventory,Package]] as const;
 const secondary=[["/admin/users",c.employees,Wrench],["/analytics",c.analytics,BarChart3],["/admin/settings",c.settings,Settings]] as const;
 const active=(href:string)=>href==="/"?pathname==="/":pathname.startsWith(href);
 const logout=async()=>{await signOut();router.push("/login")};
 return <div className="app-shell min-h-screen bg-background text-foreground">
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
   <Link href="/" className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5"><span className="brand-mark"><Building2 size={20}/></span><span><strong className="block tracking-tight">Mechanic OS</strong><small className="text-muted-foreground">{workshopSettings?.workshopName||"SGA"}</small></span></Link>
   <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">{[...primary,...secondary].map(([href,label,Icon])=><Link key={href} href={href} aria-current={active(href)?"page":undefined} className={`sidebar-link dark:text-slate-300 dark:hover:bg-[#172943] dark:hover:text-white ${active(href)?"sidebar-link-active dark:bg-[#172943] dark:text-white":""}`}><Icon size={18}/><span>{label}</span></Link>)}<button disabled className="sidebar-link w-full opacity-55 dark:text-slate-400"><CircleHelp size={18}/><span>{c.help}</span><small className="ml-auto text-[10px]">{c.soon}</small></button></nav>
   <div className="border-t border-sidebar-border p-3"><button onClick={logout} className="sidebar-link w-full"><LogOut size={18}/>{c.signout}</button></div>
  </aside>
  <div className="lg:pl-60">
   <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
    <div className="min-w-0"><p className="truncate text-sm font-semibold">{workshopSettings?.workshopName||"Mechanic OS"}</p><p className="truncate text-xs text-muted-foreground">{userProfile?.displayName||user?.email}</p></div>
    <div className="flex items-center gap-2"><button className="tool-button" onClick={()=>setLanguage(lang==="es"?"en":"es")} aria-label="Change language"><Globe2 size={17}/><span className="hidden sm:inline">{lang.toUpperCase()}</span></button><div className="theme-switch" role="group" aria-label={c.theme}>{(["light","system","dark"] as const).map(value=><button key={value} aria-label={`${c.theme}: ${value==="system"?c.system:value}`} aria-pressed={preference===value} onClick={()=>setTheme(value)} title={value==="system"?c.system:value}>{value==="light"?<Sun size={15}/>:value==="dark"?<Moon size={15}/>:<span className="text-[10px] font-bold">A</span>}</button>)}</div><button className="tool-button hidden sm:inline-flex" disabled title={c.soon}><CircleHelp size={17}/></button></div>
   </header>
   <div className="mx-auto max-w-[1600px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">{children}</div>
  </div>
  <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label="Mobile navigation">{primary.map(([href,label,Icon])=><Link key={href} href={href} aria-current={active(href)?"page":undefined} className={`mobile-nav-link ${active(href)?"text-primary":""}`}><Icon size={20}/><span>{label}</span></Link>)}<button onClick={()=>setMore(!more)} aria-expanded={more} className="mobile-nav-link"><Menu size={20}/><span>{c.more}</span></button></nav>
  {more&&<div className="fixed inset-0 z-50 bg-black/35 lg:hidden" onClick={()=>setMore(false)}><section role="dialog" aria-modal="true" aria-label={c.more} onClick={e=>e.stopPropagation()} className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-card p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"><div className="mb-3 flex items-center justify-between"><strong>{c.more}</strong><button className="tool-button" onClick={()=>setMore(false)} aria-label="Close"><X size={18}/></button></div>{secondary.map(([href,label,Icon])=><Link key={href} href={href} onClick={()=>setMore(false)} className="sidebar-link"><Icon size={18}/>{label}</Link>)}<button disabled className="sidebar-link w-full opacity-55"><CircleHelp size={18}/>{c.help}<small className="ml-auto">{c.soon}</small></button><button onClick={logout} className="sidebar-link w-full text-destructive"><LogOut size={18}/>{c.signout}</button></section></div>}
 </div>
}
