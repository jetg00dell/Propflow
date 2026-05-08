"use client";

import { ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";

function StatCard({ label, value, sub, trend, trendVal }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[#1A2B4A] text-xl font-semibold">{value}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {trend === "up" && trendVal && (
          <span className="flex items-center gap-0.5 text-[#1C7BC0] text-xs font-medium">
            <ArrowUpRight size={11} />{trendVal}
          </span>
        )}
        {trend === "down" && trendVal && (
          <span className="flex items-center gap-0.5 text-red-600 text-xs font-medium">
            <ArrowDownRight size={11} />{trendVal}
          </span>
        )}
        {sub && <span className="text-gray-400 text-xs">{sub}</span>}
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-[#F0F7FF] text-[#1C7BC0]",
    pending: "bg-amber-50 text-amber-500",
    failed: "bg-red-50 text-red-600",
    overdue: "bg-red-50 text-red-600",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { high: "#DC2626", medium: "#F59E0B", low: "#9CA3AF" };
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[priority] ?? "#9CA3AF" }} />;
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr: string) {
  const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type ExpiringLease = {
  id: string
  end_date: string
  unit_number: string | null
  property_name: string | null
}

export default function DashboardHome({ units, activeLeases, recentPayments, maintenanceItems, expiringLeases }: {
  units: any[];
  activeLeases: any[];
  recentPayments: any[];
  maintenanceItems: any[];
  expiringLeases: ExpiringLease[];
}) {
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === "occupied").length;
  const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0";
  const monthlyRevenue = activeLeases.reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0);
  const openMaintenance = maintenanceItems.length;
  const expiringCount = expiringLeases.length;

  const stats = [
    {
      label: "Monthly Revenue", value: `$${monthlyRevenue.toLocaleString()}`,
      sub: `${occupiedUnits} of ${totalUnits} units paying`, trend: "up", trendVal: "",
    },
    {
      label: "Occupancy Rate", value: `${occupancyRate}%`,
      sub: `${occupiedUnits} / ${totalUnits} units`, trend: "neutral", trendVal: "",
    },
    {
      label: "Open Maintenance", value: String(openMaintenance),
      sub: `${maintenanceItems.filter(m => m.urgency === "high").length} high priority`, trend: "neutral", trendVal: "",
    },
    {
      label: "Leases Expiring", value: String(expiringCount),
      sub: "Within 90 days", trend: "neutral", trendVal: "",
    },
  ];

  return (
    <div className="p-8">
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-[#1A2B4A]">Recent Payments</h2>
            <button className="text-xs text-[#1C7BC0] flex items-center gap-1 hover:opacity-80 transition-opacity">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No payments recorded yet</p>
          ) : (
            <div className="space-y-1">
              {recentPayments.map((p, i) => (
                <div key={i} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-[#F0F7FF] transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F6FA] border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    $
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A2B4A] truncate">{p.type ?? "Payment"}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.paid_date ? new Date(p.paid_date).toLocaleDateString() : p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#1A2B4A]">${Number(p.amount).toLocaleString()}</p>
                  <PaymentBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Occupancy */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#1A2B4A] mb-4">Occupancy</h2>
            <div className="flex items-center justify-center">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1C7BC0" strokeWidth="12"
                    strokeDasharray={`${Number(occupancyRate) * 2.513} ${(100 - Number(occupancyRate)) * 2.513}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-[#1A2B4A]">{occupancyRate}%</span>
                  <span className="text-[10px] text-gray-400">occupied</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-[#1A2B4A]">{occupiedUnits}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Occupied</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-[#1A2B4A]">{totalUnits - occupiedUnits}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Vacant</p>
              </div>
            </div>
          </div>

          {/* Expiring Leases */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#1A2B4A]">Expiring Leases</h2>
              <span className="text-[10px] bg-amber-50 text-amber-500 px-2 py-0.5 rounded-full font-semibold">{expiringCount}</span>
            </div>
            {expiringLeases.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-4">No leases expiring soon</p>
            ) : (
              <div className="space-y-3">
                {expiringLeases.map((lease, i) => {
                  const days = daysUntil(lease.end_date);
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${days < 45 ? "bg-red-600" : "bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{lease.property_name} — Unit {lease.unit_number}</p>
                        <p className="text-[10px] text-gray-400">{new Date(lease.end_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-[10px] font-bold flex-shrink-0 ${days < 45 ? "text-red-600" : "text-amber-500"}`}>
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
        <div className="col-span-3 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-[#1A2B4A]">Open Maintenance</h2>
            <button className="text-xs text-[#1C7BC0] flex items-center gap-1 hover:opacity-80 transition-opacity">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {maintenanceItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No open maintenance requests</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {maintenanceItems.map((m, i) => (
                <div key={i} className="bg-[#F5F6FA] border border-gray-200 rounded-xl p-4 hover:border-[#1C7BC0] transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-3">
                    <PriorityDot priority={m.urgency} />
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{m.urgency}</span>
                    <span className="ml-auto text-[10px] text-gray-400">{timeAgo(m.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium text-[#1A2B4A] mb-1 leading-tight">{m.title}</p>
                  <p className="text-xs text-gray-500">{m.category ?? ""}</p>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
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
  );
}
