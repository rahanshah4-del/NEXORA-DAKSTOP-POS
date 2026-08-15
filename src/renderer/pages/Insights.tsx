import { useCurrencySymbol } from '@/hooks/useCurrency';
import { useSettingsStore } from '@/stores/settings-store';
import { getCurrencySymbol } from '@/utils/formatters';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { IconBar } from '@/components/layout/IconBar';
import {
  ChefHat, TrendingUp, ChevronDown, X, User, Users, Clock, Bell,
  RotateCw, Download, IndianRupee, ShoppingCart, Star, Zap, Target,
  Award, ArrowUpRight, TrendingDown, Activity,
} from 'lucide-react';

const salesData = [
  { day: 'Mon', value: 12500 }, { day: 'Tue', value: 18200 }, { day: 'Wed', value: 15800 },
  { day: 'Thu', value: 22100 }, { day: 'Fri', value: 28450 }, { day: 'Sat', value: 35200 },
  { day: 'Sun', value: 19800 },
];

const topPerformers = [
  { name: 'Butter Chicken', sales: 142, revenue: '₹78,100', growth: '+18%', trend: 'up' },
  { name: 'Garlic Naan', sales: 210, revenue: '₹11,550', growth: '+25%', trend: 'up' },
  { name: 'Dal Makhani', sales: 98, revenue: '₹31,360', growth: '+8%', trend: 'up' },
  { name: 'Biryani', sales: 87, revenue: '₹26,100', growth: '-3%', trend: 'down' },
  { name: 'Paneer Tikka', sales: 76, revenue: '₹21,280', growth: '+12%', trend: 'up' },
];

const insights = [
  { icon: TrendingUp, title: 'Peak Hour', value: '1:00 PM - 2:30 PM', desc: '45% of daily orders', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: Target, title: 'Top Category', value: 'Main Course', desc: '62% of revenue', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Award, title: 'Best Day', value: 'Saturday', desc: 'Avg ₹35,200/day', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Activity, title: 'Avg Table Time', value: '42 minutes', desc: '-8% from last month', color: 'text-purple-500', bg: 'bg-purple-50' },
];

export default function Insights() {
  const currSymbol = useCurrencySymbol();
  const maxSales = Math.max(...salesData.map((d) => d.value));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f0f0f1] select-none font-sans">
      <IconBar />

      <div className="flex flex-1 flex-col min-w-0 ml-[56px]">
        <header className="flex items-center h-[48px] px-4 bg-white border-b border-[#e2e8e4] shrink-0">
          <h1 className="text-[14px] font-bold text-[#111814] tracking-tight">Nexora Solution</h1><span className="h-4 w-px bg-[#dee2e6] mx-2.5" /><span className="text-[11px] text-[#94a399] font-medium">Business Insights</span>
          <div className="flex-1 drag-region h-full" />
          <div className="flex items-center gap-3 no-drag"><span className="text-[11px] text-[#47554d] flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#94a399]" />02:45 PM</span><div className="flex items-center gap-1.5 text-[11px] text-[#47554d]"><div className="h-6 w-6 rounded-full bg-[#cceddb] flex items-center justify-center"><User className="h-3 w-3 text-[#0f7b47]" /></div>Admin <ChevronDown className="h-3 w-3 text-[#94a399]" /></div><div className="flex items-center ml-1"><button className="h-7 w-9 flex items-center justify-center text-[#94a399] hover:text-[#47554d] hover:bg-[#f1f5f2] rounded transition-colors">─</button><button className="h-7 w-9 flex items-center justify-center text-[#94a399] hover:text-[#47554d] hover:bg-[#f1f5f2] rounded transition-colors">□</button><button className="h-7 w-9 flex items-center justify-center text-[#94a399] hover:text-white hover:bg-[#da3849] rounded transition-colors"><X className="h-3.5 w-3.5" /></button></div></div>
        </header>

        <div className="flex items-center h-[40px] px-4 bg-white border-b border-[#dee2e6] shrink-0 gap-2">
          <h2 className="text-[13px] font-semibold text-[#333333]">Performance Analytics</h2><span className="text-[11px] text-[#94a399]">Last 7 days</span>
          <div className="flex-1" />
          <button className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#47554d] hover:text-[#111814] hover:bg-[#f1f5f2] rounded transition-colors"><Download className="h-3 w-3" />Export</button>
          <button className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#47554d] hover:text-[#111814] hover:bg-[#f1f5f2] rounded transition-colors"><RotateCw className="h-3 w-3" />Refresh</button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { t: 'Weekly Revenue', v: '₹1,52,050', c: '+22.5%', icon: IndianRupee, col: 'text-emerald-600', bg: 'bg-emerald-50' },
              { t: 'Total Orders', v: '684', c: '+15.8%', icon: ShoppingCart, col: 'text-blue-600', bg: 'bg-blue-50' },
              { t: 'Avg Rating', v: '4.8 ⭐', c: '+0.2', icon: Star, col: 'text-amber-600', bg: 'bg-amber-50' },
              { t: 'Repeat Customers', v: '62%', c: '+8.1%', icon: Users, col: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e2e8e4] shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-semibold text-[#757575] uppercase tracking-wider">{k.t}</span><div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', k.bg)}><k.icon className={cn('h-4 w-4', k.col)} /></div></div>
                <p className="text-[20px] font-bold text-[#111814]">{k.v}</p>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-1"><TrendingUp className="h-3 w-3" />{k.c}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Sales Chart */}
            <div className="col-span-2 bg-white rounded-xl border border-[#e2e8e4] shadow-sm p-5">
              <h3 className="text-[12px] font-semibold text-[#333333] mb-4">Weekly Sales Trend</h3>
              <div className="flex items-end gap-2 h-[180px]">
                {salesData.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-[#47554d]">{currSymbol}{(d.value / 1000).toFixed(1)}k</span>
                    <div className="w-full rounded-t-md transition-all hover:opacity-80 cursor-pointer relative group"
                      style={{ height: `${(d.value / maxSales) * 140}px`, background: 'linear-gradient(180deg, #5dc596 0%, #23b883 100%)' }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#111814] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">{currSymbol}{d.value.toLocaleString('en-IN')}</div>
                    </div>
                    <span className="text-[9px] text-[#94a399]">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights Cards */}
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#e2e8e4] shadow-sm p-3.5 flex items-start gap-3">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', ins.bg)}><ins.icon className={cn('h-4 w-4', ins.color)} /></div>
                  <div><p className="text-[10px] font-semibold text-[#757575] uppercase">{ins.title}</p><p className="text-[13px] font-bold text-[#111814]">{ins.value}</p><p className="text-[9px] text-[#94a399] mt-0.5">{ins.desc}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products + Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[#e2e8e4] shadow-sm p-4">
              <h3 className="text-[12px] font-semibold text-[#333333] mb-3">Top Performing Items</h3>
              <div className="space-y-1">
                {topPerformers.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-[#f0f0f0] last:border-0">
                    <span className="text-[11px] font-bold text-[#94a399] w-4">{i + 1}</span>
                    <div className="flex-1"><p className="text-[11px] font-medium text-[#111814]">{p.name}</p><p className="text-[9px] text-[#94a399]">{p.sales} orders</p></div>
                    <div className="text-right"><p className="text-[11px] font-semibold">{p.revenue}</p><span className={cn('text-[9px] font-semibold', p.trend === 'up' ? 'text-emerald-600' : 'text-red-500')}>{p.growth}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#e2e8e4] shadow-sm p-4">
              <h3 className="text-[12px] font-semibold text-[#333333] mb-3">Customer Satisfaction</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Food Quality', v: '4.9', pct: 98 }, { l: 'Service', v: '4.7', pct: 94 },
                  { l: 'Ambience', v: '4.6', pct: 92 }, { l: 'Value', v: '4.8', pct: 96 },
                ].map((m, i) => (
                  <div key={i} className="bg-[#f8faf9] rounded-lg p-3">
                    <p className="text-[10px] text-[#757575]">{m.l}</p>
                    <p className="text-[16px] font-bold text-[#111814] mt-0.5">{m.v}</p>
                    <div className="mt-2 h-1.5 bg-[#e2e8e0] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#5dc596] to-[#23b883] rounded-full" style={{ width: `${m.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between h-[32px] px-3 bg-[#204937] shrink-0">
          <div className="text-[9px] text-white/70">Data refreshed: Just now</div>
          <div className="flex items-center gap-1 text-[9px] text-white/60"><Activity className="h-3 w-3" />Real-time analytics</div>
        </footer>
      </div>
    </div>
  );
}
