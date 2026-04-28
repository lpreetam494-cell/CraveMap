import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap, TrendingUp, Wallet, MapPin, Eye,
  ArrowUpRight, Activity, Coffee, Pizza, Flame
} from 'lucide-react';

const CRAVING_ICONS = { biryani: Flame, pizza: Pizza, coffee: Coffee, breakfast: Zap };
const CRAVING_COLORS = {
  biryani: { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', border: 'border-orange-200' },
  pizza:   { bg: 'bg-red-50',    text: 'text-red-500',    bar: 'bg-red-400',    border: 'border-red-200' },
  coffee:  { bg: 'bg-amber-50',  text: 'text-amber-600',  bar: 'bg-amber-500',  border: 'border-amber-200' },
  breakfast: { bg: 'bg-blue-50', text: 'text-blue-600',   bar: 'bg-blue-500',   border: 'border-blue-200' },
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
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => {
                fetch('http://localhost:5001/api/group-decision', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ groupPrefs: ['Spicy', 'South Indian'] })
                });
              }}
              className="a2ui-button flex items-center gap-2"
            >
              <Zap size={15} /> Trigger Consensus
            </button>
            <button className="a2ui-button-ghost flex items-center gap-2">
              <Activity size={15} /> Force Heartbeat
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
          <div className="space-y-4">
            {Object.entries(cravings).map(([name, data]) => {
              const colors = CRAVING_COLORS[name] || CRAVING_COLORS.biryani;
              const Icon = CRAVING_ICONS[name] || Flame;
              const lastHad = new Date(data.last_had);
              const daysSince = Math.ceil((today - lastHad) / (1000 * 60 * 60 * 24));
              const progress = Math.min((daysSince / data.avg_cycle_days) * 100, 100);
              const overdue = daysSince >= data.avg_cycle_days;

              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={colors.text} />
                      <span className="font-semibold text-sm capitalize">{name}</span>
                    </div>
                    {overdue ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text} ${colors.border} border`}>
                        Overdue ({daysSince}d)
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-green-600">{data.avg_cycle_days - daysSince}d left</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`${colors.bar} h-1.5 rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
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
