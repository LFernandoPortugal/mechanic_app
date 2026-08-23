"use client";

import Link from "next/link";
import { Building2, CircleHelp, Crown, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandMark";

const items = [
  { href: "#overview", label: "Resumen", icon: LayoutDashboard },
  { href: "#workshops", label: "Talleres", icon: Building2 },
  { href: "#create-workshop", label: "Nuevo taller", icon: Crown },
  { href: "#user-audit", label: "Auditoría", icon: Users },
] as const;

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border px-4 py-6 lg:block">
        <div className="sticky top-20">
          <div className="mb-6 border-b border-border px-2 pb-5">
            <BrandLockup compact />
            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck size={14}/>Control global</p>
          </div>
          <nav className="space-y-1" aria-label="Consola global">
            {items.map(({ href, label, icon: Icon }) => <a key={href} href={href} className="sidebar-link"><Icon size={18}/>{label}</a>)}
            <Link href="/help" className="sidebar-link"><CircleHelp size={18}/>Ayuda</Link>
          </nav>
        </div>
      </aside>
      <div className="min-w-0">
        <nav className="sticky top-14 z-20 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden" aria-label="Consola global">
          {items.map(({ href, label, icon: Icon }) => <a key={href} href={href} className="tool-button shrink-0"><Icon size={16}/>{label}</a>)}
        </nav>
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
