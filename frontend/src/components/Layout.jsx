import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, History, Download } from "lucide-react";

const NAV = [
  { to: "/", label: "Upload & Dashboard", icon: LayoutDashboard, end: true },
  { to: "/history", label: "Document History", icon: History },
  { to: "/export", label: "Export Data", icon: Download },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-canvas-subtle">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white md:flex">
        <div className="flex items-center gap-3 border-b border-line px-6 py-5">
          <img src="/logo.webp" alt="Logo" className="h-9 w-9 rounded-sm object-contain" />
          <div className="leading-tight">
            <div className="font-heading text-sm font-bold tracking-tight text-ink">
              Lease Abstraction
            </div>
            <div className="text-xs text-[#9CA3AF]">Assistant</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-ink text-white"
                      : "text-[#4B5563] hover:bg-canvas-muted hover:text-ink"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-line px-6 py-4 text-xs text-[#9CA3AF]">
          AI Provider: <span className="font-mono text-[#4B5563]">Gemini Flash</span>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-64">
        <main className="p-6 md:p-12">{children}</main>
      </div>
    </div>
  );
}
