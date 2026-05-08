import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, TrendingUp, Wallet, MapPin, Eye,
  ArrowUpRight, Activity, Coffee, Pizza, Flame, Loader
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CRAVING_ICONS = { biryani: Flame, pizza: Pizza, coffee: Coffee, breakfast: Zap };
const CRAVING_COLORS = {
  biryani: { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', border: 'border-orange-200' },
  pizza:   { bg: 'bg-red-50',    text: 'text-red-500',    bar: 'bg-red-400',    border: 'border-red-200' },
  coffee:  { bg: 'bg-amber-50',  text: 'text-amber-600',  bar: 'bg-amber-500',  border: 'border-amber-200' },
  breakfast: { bg: 'bg-blue-50', text: 'text-blue-600',   bar: 'bg-blue-500',   border: 'border-blue-200' },
};

const CRAVING_HEX = {
  biryani: '#f97316',
  pizza: '#ef4444',
  coffee: '#f59e0b',
  breakfast: '#3b82f6'
};

// Simulated agent thoughts for the Operations Feed
const AGENT_THOUGHTS = [
  { agent: 'Social Hunter', action: 'EXTRACTION', message: 'Parsed metadata for Chinita (Mexican/Tacos, Indiranagar)', time: 'Just now', color: 'bg-blue-500' },
  { agent: 'Taste Alchemist', action: 'CYCLE_CHECK', message: 'Biryani craving overdue by 6 days — triggering priority flag', time: '2 min ago', color: 'bg-purple-500' },
  { agent: 'Lifestyle Operator', action: 'WEATHER_CHECK', message: 'Clear skies detected — outdoor dining recommended', time: '5 min ago', color: 'bg-green-500' },
  { agent: 'Memory Node', action: 'SYNC', message: 'Sovereign Vault synced — 8 entries encrypted locally', time: '12 min ago', color: 'bg-gray-400' },
];

export default function Overview({ memory, loading }) {
  const restaurants = memory?.restaurants || [];
  const analytics = memory?.analytics || {};
  const cravings = memory?.craving_patterns || {};
  const visitedCount = restaurants.filter(r => r.visited).length;
  const bucketCount = restaurants.filter(r => !r.visited).length;

  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensusResult, setConsensusResult] = useState(null);
  const [heartbeatLoading, setHeartbeatLoading] = useState(false);
  const [heartbeatResult, setHeartbeatResult] = useState(null);

  const handleConsensus = async () => {
    setConsensusLoading(true);
    setConsensusResult(null);
    try {
      const res = await fetch('http://localhost:5001/api/group-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ constraints: {} })
      });
      const data = await res.json();
      if (data.best_option) {
        setConsensusResult({ ok: true, text: `🏆 ${data.best_option.name} — ${data.best_option.cuisine || '?'} (${data.best_option.area || '?'})\n\n${data.reasoning}` });
      } else {
        setConsensusResult({ ok: false, text: 'No consensus found. Add more spots to your vault!' });
      }
    } catch (e) {
      setConsensusResult({ ok: false, text: 'Failed to reach consensus engine.' });
    }
    setConsensusLoading(false);
  };

  const handleHeartbeat = async () => {
    setHeartbeatLoading(true);
    setHeartbeatResult(null);
    try {
      const res = await fetch('http://localhost:5001/api/heartbeat', { method: 'POST' });
      const data = await res.json();
      setHeartbeatResult({ ok: data.success, text: data.message });
    } catch (e) {
      setHeartbeatResult({ ok: false, text: 'Heartbeat failed — is the server running?' });
    }
    setHeartbeatLoading(false);
  };

  const today = new Date();

  return (
    <div className="space-y-6">
      {/* ─── Top Stats Row ─── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={MapPin} label="Saved Spots" value={restaurants.length} accent="blue" />
        <StatCard icon={Eye} label="Visited" value={visitedCount} accent="green" />
        <StatCard icon={TrendingUp} label="Bucket List" value={bucketCount} accent="purple" />
        <StatCard icon={Wallet} label="Weekly Spend" value={`₹${analytics.weekly_spend || 0}`} accent="orange" />
      </div>

      {/* ─── Sovereign Food Persona ─── */}
      {memory?.user_profile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="a2ui-card bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl shadow-slate-900/20 relative overflow-hidden"
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl mix-blend-screen" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl mix-blend-screen" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                <span className="text-4xl">🧬</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-black tracking-tight">{memory.user_profile.persona_name || "Synthesizing Persona..."}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary text-white">Food DNA Active</span>
                </div>
                <p className="text-slate-300 font-medium">Primary Identity: {memory.user_profile.name}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Vibe</span>
                <span className="font-semibold text-sm">{memory.user_profile.vibe}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Budget</span>
                <span className="font-semibold text-sm text-green-400">{memory.user_profile.budget}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Heat Index</span>
                <span className="font-semibold text-sm text-orange-400">{memory.user_profile.heat}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Dietary</span>
                <span className="font-semibold text-sm text-blue-300">{(memory.user_profile.dietary || []).join(', ') || 'None'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sovereign Memory Status — spans 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="a2ui-card col-span-2 flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-5">
              <h3 className="font-bold text-lg text-textMain">Sovereign Memory</h3>
              <span className="a2ui-badge bg-green-50 text-green-600 border border-green-200">
                ● Online & Encrypted
              </span>
            </div>
            <p className="text-textSub text-sm leading-relaxed max-w-lg">
              Your cognitive food brain holds <strong className="text-textMain font-bold">{restaurants.length}</strong> extracted restaurants
              across <strong className="text-textMain font-bold">{[...new Set(restaurants.map(r => r.area))].length}</strong> areas in Bangalore.
              All behavioral data is stored in your <span className="text-primary font-semibold">Sovereign Data Vault</span> — no cloud, no corporate tracking.
            </p>

            {/* Consensus result banner */}
            {consensusResult && (
              <div className={`mt-4 p-3 rounded-xl text-sm whitespace-pre-line border ${consensusResult.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {consensusResult.text}
              </div>
            )}
            {/* Heartbeat result banner */}
            {heartbeatResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm border ${heartbeatResult.ok ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                ⚡ {heartbeatResult.text}
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleConsensus}
              disabled={consensusLoading}
              className="a2ui-button flex items-center gap-2 disabled:opacity-60"
            >
              {consensusLoading ? <Loader size={15} className="animate-spin" /> : <Zap size={15} />}
              {consensusLoading ? 'Calculating...' : 'Trigger Consensus'}
            </button>
            <button
              onClick={handleHeartbeat}
              disabled={heartbeatLoading}
              className="a2ui-button-ghost flex items-center gap-2 disabled:opacity-60"
            >
              {heartbeatLoading ? <Loader size={15} className="animate-spin" /> : <Activity size={15} />}
              {heartbeatLoading ? 'Running...' : 'Force Heartbeat'}
            </button>
          </div>
        </motion.div>

        {/* Active Craving Cycles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="a2ui-card"
        >
          <h3 className="font-bold text-lg mb-1">Craving Cycles</h3>
          <p className="text-[11px] text-textSub mb-5">Based on your historical patterns.</p>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(cravings).map(([name, data]) => {
                  const lastHad = new Date(data.last_satisfied || data.last_had || new Date());
                  const cycleDays = data.cooldown_days || data.avg_cycle_days || 5;
                  const daysSince = Math.ceil((today - lastHad) / (1000 * 60 * 60 * 24));
                  return {
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    Progress: Math.min((daysSince / cycleDays) * 100, 100),
                    fill: CRAVING_HEX[name.toLowerCase()] || '#6366f1'
                  };
                })} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }} />
                  <Bar dataKey="Progress" radius={[0, 4, 4, 0]} barSize={16}>
                    {
                      Object.entries(cravings).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CRAVING_HEX[entry[0].toLowerCase()] || '#6366f1'} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
        </motion.div>
      </div>

      {/* ─── OpenClaw Operations Feed ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="a2ui-card"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-bold text-lg">OpenClaw Operations</h3>
            <p className="text-[11px] text-textSub">Live feed of agent reasoning and autonomous actions.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-600">Live</span>
          </div>
        </div>

        <div className="space-y-0">
          {AGENT_THOUGHTS.map((thought, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + idx * 0.1 }}
              className="flex items-start gap-4 py-3.5 border-b border-borderLight/40 last:border-0"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${thought.color} mt-1.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-sm text-textMain">{thought.agent}</span>
                  <span className="text-[10px] font-semibold text-textSub bg-gray-100 px-2 py-0.5 rounded">{thought.action}</span>
                </div>
                <p className="text-sm text-textSub">{thought.message}</p>
              </div>
              <span className="text-[11px] text-textSub shrink-0">{thought.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  const accents = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-500',   border: 'border-blue-100' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-500',  border: 'border-green-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-500', border: 'border-orange-100' },
  };
  const c = accents[accent] || accents.blue;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`a2ui-card !p-5 flex items-center gap-4 ${c.border}`}
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
        <Icon size={20} className={c.icon} />
      </div>
      <div className="a2ui-stat">
        <span className="a2ui-stat-value text-2xl">{value}</span>
        <span className="a2ui-stat-label">{label}</span>
      </div>
    </motion.div>
  );
}
