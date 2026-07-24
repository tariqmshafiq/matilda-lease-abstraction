import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, History, Download, Compass, Settings2 } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/history", label: "History", icon: History },
  { to: "/export", label: "Export", icon: Download },
  { to: "/get-started", label: "Start Here", icon: Compass },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white/70 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <img src="/logo.webp" alt="MatildaCLA" className="h-9 w-9 rounded-xl object-contain" />
          <div className="font-heading text-xl tracking-tight text-ink">MatildaCLA</div>
        </div>
        <nav className="flex-1 px-3 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-brand-soft text-brand-ink"
                      : "text-ink-soft hover:bg-brand-softer hover:text-brand-ink"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="md:pl-64">
        <main className="mx-auto max-w-6xl p-6 md:p-12">{children}</main>
      </div>
    </div>
  );
}
