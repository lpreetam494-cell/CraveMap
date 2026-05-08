import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, Utensils, Users, LayoutDashboard,
  Zap, TrendingUp, ShieldCheck
} from 'lucide-react';
import Overview from './components/Overview';
import FoodVault from './components/FoodVault';
import SocialGraph from './components/SocialGraph';

const API_BASE = 'http://localhost:5001';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'vault', label: 'Food Vault', icon: Utensils },
  { id: 'social', label: 'Social Graph', icon: Users },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/memory`)
      .then(res => res.json())
      .then(data => { setMemory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const pageTitle = activeTab === 'dashboard' ? 'Intelligence Dashboard'
    : activeTab === 'vault' ? 'Sovereign Food Vault'
    : 'Social Taste Graph';

  const pageSubtitle = activeTab === 'dashboard' ? 'Real-time behavioral insights from your personal food memory.'
    : activeTab === 'vault' ? 'Your encrypted, offline memory of every culinary discovery.'
    : 'Visualizing trust networks and preference alignment.';

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Sidebar ─── */}
      <aside className="w-[260px] min-h-screen border-r border-borderLight/60 bg-white/60 backdrop-blur-sm p-6 flex flex-col justify-between sticky top-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <BrainCircuit size={22} />
            </div>
            <div>
              <h1 className="font-bold text-[17px] text-textMain leading-tight tracking-tight">CraveMap</h1>
              <p className="text-[10px] text-textSub font-semibold tracking-[0.15em] uppercase">Sovereign Node</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-textSub hover:bg-gray-100/80 hover:text-textMain'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Status */}
        <div className="a2ui-card !p-4 bg-gradient-to-br from-green-50 to-emerald-50/50 !border-green-200/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-green-700">System Online</span>
          </div>
          <p className="text-[11px] text-green-600/80 leading-relaxed">
            All agents operational. Data encrypted & stored locally.
          </p>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 p-10 overflow-y-auto">
        {/* Page Header */}
        <header className="mb-8 flex justify-between items-start">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-[28px] font-extrabold text-textMain tracking-tight leading-tight">{pageTitle}</h2>
            <p className="text-textSub text-sm mt-1">{pageSubtitle}</p>
          </motion.div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface px-4 py-2 rounded-xl border border-borderLight/50 shadow-sm">
              <ShieldCheck size={15} className="text-green-500" />
              <span className="text-xs font-semibold text-textSub">Sovereign Mode</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && <Overview memory={memory} loading={loading} />}
            {activeTab === 'vault' && <FoodVault memory={memory} />}
            {activeTab === 'social' && <SocialGraph memory={memory} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
