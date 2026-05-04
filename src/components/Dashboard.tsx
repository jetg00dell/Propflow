"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Users, FileText, Wrench, DollarSign,
  BarChart3, TrendingUp, Bell, Settings, ChevronRight,
  Building2, Menu, X, LogOut, Search, Plus,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";

const navItems = [
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Properties", href: "/properties" },
  { icon: Users, label: "Tenants", href: "/tenants" },
  { icon: FileText, label: "Leases", href: "/leases" },
  { icon: DollarSign, label: "Payments", href: "/payments" },
  { icon: TrendingUp, label: "Financials", href: "/financials" },
  { icon: Wrench, label: "Maintenance", href: "/maintenance" },
  { icon: BarChart3, label: "Reports", href: "/reports" },
];

function StatCard({ label, value, sub, trend, trendVal, accent }: any) {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="relative bg-[#0F1117] border border-white/[0.06] rounded-2xl p-6 overflow-hidden group hover:border-white/[0.12] transition-all duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: accent, transform: "translate(30%, -30%)" }} />
      <p className="text-xs font-medium tracking-widest uppercase text-white/40 mb-3">{label}</p>
      <p className="text-4xl font-bold text-white mb-1" style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {trend === "up" && <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-semibold"><ArrowUpRight size={12} />{trendVal}</span>}
        {trend === "down" && <span className="flex items-center gap-0.5 text-rose-400 text-xs font-semibold"><ArrowDownRight size={12} />{trendVal}</span>}
        <span className="text-white/30 text-xs">{sub}</span>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] w-12 rounded-full" style={{ background: accent }} />
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    failed: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    overdue: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#6B7280" };
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[priority] ?? "#6B7280" }} />;
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Dashboard({ units, recentPayments, maintenanceItems, expiringLeases }: {
  units: any[];
  recentPayments: any[];
  maintenanceItems: any[];
  expiringLeases: any[];
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("/dashboard");
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Compute stats from real data
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0";
  const monthlyRevenue = units
    .filter(u => u.status === "occupied")
    .reduce((sum, u) => sum + (u.market_rent ?? 0), 0);
  const openMaintenance = maintenanceItems.length;
  const expiringCount = expiringLeases.length;

  const stats = [
    {
      label: "Monthly Revenue", value: `$${monthlyRevenue.toLocaleString()}`,
      sub: `${occupiedUnits} of ${totalUnits} units paying`, trend: "up", trendVal: "", accent: "#00C896"
    },
    {
      label: "Occupancy Rate", value: `${occupancyRate}%`,
      sub: `${occupiedUnits} / ${totalUnits} units occupied`, trend: "neutral", trendVal: "", accent: "#F59E0B"
    },
    {
      label: "Open Maintenance", value: String(openMaintenance),
      sub: `${maintenanceItems.filter(m => m.priority === "high").length} high priority`, trend: "neutral", trendVal: "", accent: "#EF4444"
    },
    {
      label: "Leases Expiring", value: String(expiringCount),
      sub: "Within 90 days", trend: "neutral", trendVal: "", accent: "#8B5CF6"
    },
  ];

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .nav-item { transition: all 0.15s ease; }
        .nav-item:hover { background: rgba(255,255,255,0.04); }
        .nav-item.active { background: rgba(0, 200, 150, 0.08); }
      `}</style>

      <div className="flex h-screen bg-[#080A0E] text-white overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}>

        <aside className={`flex-shrink-0 flex flex-col border-r border-white/[0.05] transition-all duration-300 ${sidebarOpen ? "w-60" : "w-16"}`}
          style={{ background: "linear-gradient(180deg, #0C0E14 0%, #080A0E 100%)" }}>
          <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.05]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00C896 0%, #00A878 100%)" }}>
              <Home size={15} color="white" strokeWidth={2.5} />
            </div>
            {sidebarOpen && (
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: "17px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Prop<span style={{ color: "#00C896" }}>Flow</span>
              </span>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto text-white/30 hover:text-white/70 transition-colors">
              {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map(({ icon: Icon, label, href }: any) => (
              <button key={href} onClick={() => { setActiveNav(href); router.push(href); }}
                className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left ${activeNav === href ? "active" : ""}`}>
                <Icon size={16} className={activeNav === href ? "text-[#00C896]" : "text-white/40"} strokeWidth={activeNav === href ? 2.5 : 1.5} />
                {sidebarOpen && (
                  <span className={`text-sm font-medium flex-1 ${activeNav === href ? "text-[#00C896]" : "text-white/50"}`}>{label}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-white/[0.05] space-y-0.5">
            <button className="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <Settings size={16} className="text-white/30" strokeWidth={1.5} />
              {sidebarOpen && <span className="text-sm font-medium text-white/40">Settings</span>}
            </button>
            <button onClick={handleSignOut} className="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <LogOut size={16} className="text-white/30" strokeWidth={1.5} />
              {sidebarOpen && <span className="text-sm font-medium text-white/40">Sign Out</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between px-8 py-4 border-b border-white/[0.05] flex-shrink-0">
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                {greeting} ✦
              </h1>
              <p className="text-white/30 text-xs mt-0.5">{dateStr}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 w-52">
                <Search size={13} className="text-white/30" />
                <input placeholder="Search..." className="bg-transparent text-sm text-white/60 placeholder-white/20 outline-none w-full" />
              </div>
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/70 transition-colors">
                <Bell size={15} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold">
                JG
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-4 gap-4 mb-8">
              {stats.map((s) => <StatCard key={s.label} {...s} />)}
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Recent Payments */}
              <div className="col-span-2 bg-[#0F1117] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold text-white">Recent Payments</h2>
                  <button className="text-xs text-[#00C896] flex items-center gap-1 hover:opacity-80 transition-opacity">
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                {recentPayments.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-8">No payments recorded yet</p>
                ) : (
                  <div className="space-y-1">
                    {recentPayments.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-xs font-bold text-white/50 flex-shrink-0">
                          $
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/80 truncate">{p.type ?? "Payment"}</p>
                          <p className="text-xs text-white/30 truncate">{p.paid_date ? new Date(p.paid_date).toLocaleDateString() : p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">${Number(p.amount).toLocaleString()}</p>
                        </div>
                        <PaymentBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Occupancy */}
                <div className="bg-[#0F1117] border border-white/[0.06] rounded-2xl p-6">
                  <h2 className="text-sm font-semibold text-white mb-4">Occupancy</h2>
                  <div className="flex items-center justify-center">
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#00C896" strokeWidth="12"
                          strokeDasharray={`${Number(occupancyRate) * 2.513} ${(100 - Number(occupancyRate)) * 2.513}`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>{occupancyRate}%</span>
                        <span className="text-[10px] text-white/30">occupied</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{occupiedUnits}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Occupied</p>
                    </div>
                    <div className="w-px bg-white/[0.06]" />
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{totalUnits - occupiedUnits}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Vacant</p>
                    </div>
                  </div>
                </div>

                {/* Expiring Leases */}
                <div className="bg-[#0F1117] border border-white/[0.06] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-white">Expiring Leases</h2>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">{expiringCount}</span>
                  </div>
                  {expiringLeases.length === 0 ? (
                    <p className="text-white/30 text-xs text-center py-4">No leases expiring soon</p>
                  ) : (
                    <div className="space-y-3">
                      {expiringLeases.map((l, i) => {
                        const days = daysUntil(l.end_date);
                        return (
                          <div key={i} className="flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className={`w-1 h-1 rounded-full mt-2 flex-shrink-0 ${days < 45 ? "bg-rose-400" : "bg-amber-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white/70 truncate">Unit {l.unit_id?.slice(0, 8)}</p>
                              <p className="text-[10px] text-white/30">{new Date(l.end_date).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-[10px] font-bold flex-shrink-0 ${days < 45 ? "text-rose-400" : "text-amber-400"}`}>
                              {days}d
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Maintenance */}
              <div className="col-span-3 bg-[#0F1117] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold text-white">Open Maintenance</h2>
                  <button className="text-xs text-[#00C896] flex items-center gap-1 hover:opacity-80 transition-opacity">
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                {maintenanceItems.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-8">No open maintenance requests</p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {maintenanceItems.map((m, i) => (
                      <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:border-white/[0.1] transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 mb-3">
                          <PriorityDot priority={m.priority} />
                          <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">{m.priority}</span>
                          <span className="ml-auto text-[10px] text-white/20">{timeAgo(m.created_at)}</span>
                        </div>
                        <p className="text-sm font-medium text-white/80 mb-1 leading-tight">{m.title}</p>
                        <p className="text-xs text-white/30">{m.category ?? ""}</p>
                        <div className="mt-3 pt-3 border-t border-white/[0.05]">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-white/40">
                            {m.status?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}