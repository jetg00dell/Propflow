"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Users, FileText, Wrench, DollarSign,
  BarChart3, TrendingUp, Bell, Settings,
  Building2, Menu, X, LogOut, Search, Receipt, FileWarning,
} from "lucide-react";

const navItems = [
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Properties", href: "/properties" },
  { icon: Users, label: "Tenants", href: "/tenants" },
  { icon: FileText, label: "Leases", href: "/leases" },
  { icon: DollarSign, label: "Payments", href: "/payments" },
  { icon: Receipt, label: "Expenses", href: "/expenses" },
  { icon: TrendingUp, label: "Financials", href: "/financials" },
  { icon: Wrench, label: "Maintenance", href: "/maintenance" },
  { icon: FileWarning, label: "Notices", href: "/notices" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
  { icon: BarChart3, label: "CPA Report", href: "/reports/cpa" },
];

export default function Dashboard({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const activeHref = navItems.find(item => pathname.startsWith(item.href))?.href ?? "";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex h-screen bg-[#F5F6FA] overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${sidebarOpen ? "w-60" : "w-16"}`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#1C7BC0]">
            <Home size={15} color="white" strokeWidth={2.5} />
          </div>
          {sidebarOpen && (
            <span className="text-[#1A2B4A] font-bold text-lg tracking-tight">PropFlow</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
          >
            {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, href }) => {
            const active = activeHref === href;
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active
                    ? "bg-[#F0F7FF] text-[#1C7BC0] font-medium"
                    : "text-gray-600 hover:bg-[#F0F7FF] hover:text-[#1C7BC0]"
                }`}
              >
                <Icon
                  size={16}
                  className={active ? "text-[#1C7BC0]" : "text-gray-400"}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                {sidebarOpen && <span className="text-sm flex-1">{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-0.5">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-[#F0F7FF] hover:text-[#1C7BC0] transition-colors">
            <Settings size={16} className="text-gray-400" strokeWidth={1.5} />
            {sidebarOpen && <span className="text-sm">Settings</span>}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-[#F0F7FF] hover:text-[#1C7BC0] transition-colors"
          >
            <LogOut size={16} className="text-gray-400" strokeWidth={1.5} />
            {sidebarOpen && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-[#1A2B4A]">{greeting}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{dateStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F5F6FA] border border-gray-200 rounded-lg px-3 py-2 w-52">
              <Search size={13} className="text-gray-400" />
              <input
                placeholder="Search..."
                className="bg-transparent text-sm text-[#1A2B4A] placeholder-gray-400 outline-none w-full"
              />
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-[#F5F6FA] border border-gray-200 text-gray-500 hover:text-[#1C7BC0] transition-colors">
              <Bell size={15} />
            </button>
            <div className="w-9 h-9 rounded-lg bg-[#1C7BC0] flex items-center justify-center text-xs font-bold text-white">
              JG
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
