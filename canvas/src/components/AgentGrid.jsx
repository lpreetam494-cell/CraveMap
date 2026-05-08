import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Utensils, Flame, Compass, ShieldCheck, Zap } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5001`;

const DIET_COLORS = {
  'Vegetarian': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  'Non-Veg': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  'Vegan': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Eggetarian': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
};

const SPICE_ICONS = { 'Extreme': '🔥🔥🔥', 'Medium': '🌶️🌶️', 'Mild': '🍦' };

export default function AgentGrid() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = () => {
    fetch(`${API_BASE}/api/users`)
      .then(res => res.json())
      .then(data => { setAgents(data.agents || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="a2ui-card !p-5 flex items-center gap-4 border-blue-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users size={20} className="text-blue-500" />
          </div>
          <div className="a2ui-stat">
            <span className="a2ui-stat-value text-2xl">{agents.length}</span>
            <span className="a2ui-stat-label">Total Agents</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="a2ui-card !p-5 flex items-center gap-4 border-green-100">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <ShieldCheck size={20} className="text-green-500" />
          </div>
          <div className="a2ui-stat">
            <span className="a2ui-stat-value text-2xl">{agents.length}</span>
            <span className="a2ui-stat-label">Sovereign Vaults</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="a2ui-card !p-5 flex items-center gap-4 border-purple-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Utensils size={20} className="text-purple-500" />
          </div>
          <div className="a2ui-stat">
            <span className="a2ui-stat-value text-2xl">{agents.reduce((sum, a) => sum + (a.spotCount || 0), 0)}</span>
            <span className="a2ui-stat-label">Total Spots</span>
          </div>
        </motion.div>
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="a2ui-card text-center py-16">
          <div className="text-5xl mb-4">🧬</div>
          <h3 className="font-bold text-lg text-textMain mb-2">No Agents Onboarded Yet</h3>
          <p className="text-textSub text-sm max-w-md mx-auto">
            Send <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">/start</code> to the Telegram bot to begin
            capturing Food DNA. Profiles will appear here in real-time.
          </p>
        </motion.div>
      )}

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-2 gap-5">
        <AnimatePresence>
          {agents.map((agent, idx) => {
            const p = agent.profile;
            const dietColor = DIET_COLORS[p.diet_type] || DIET_COLORS['Non-Veg'];
            const spiceIcon = SPICE_ICONS[p.spice_tolerance] || '🌶️';

            return (
              <motion.div
                key={agent.userId}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="a2ui-card relative overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300"
              >
                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />

                {/* Header */}
                <div className="flex items-center gap-4 mb-4 pt-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-2xl shadow-md">
                    🧬
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-[15px] text-textMain truncate">
                      {p.persona_name || p.name}
                    </h3>
                    <p className="text-xs text-textSub">
                      {p.name} {p.telegram_username !== 'Unknown' ? `@${p.telegram_username}` : ''}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${dietColor.dot} ring-4 ring-white`} />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${dietColor.bg} ${dietColor.text} border ${dietColor.border}`}>
                    {p.diet_type}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                    {spiceIcon} {p.spice_tolerance}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    {p.eating_style === 'Explorer' ? '🧭' : '🏡'} {p.eating_style}
                  </span>
                </div>

                {/* Cuisines */}
                {p.favorite_cuisines && p.favorite_cuisines.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] font-bold text-textSub uppercase tracking-wider block mb-1.5">Favorite Cuisines</span>
                    <div className="flex flex-wrap gap-1">
                      {p.favorite_cuisines.map(c => (
                        <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-textMain">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-borderLight/40">
                  <span className="text-[11px] text-textSub">
                    <Utensils size={12} className="inline mr-1" />
                    {agent.spotCount} saved spots
                  </span>
                  <span className="text-[10px] font-semibold text-green-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Sovereign
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
