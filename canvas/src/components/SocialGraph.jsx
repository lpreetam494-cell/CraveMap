import React from 'react';
import { motion } from 'framer-motion';
import {
  Users, Heart, TrendingUp, Percent, Award,
  ArrowUpRight, Utensils
} from 'lucide-react';

const FRIEND_COLORS = [
  { gradient: 'from-blue-500 to-cyan-400',   bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
  { gradient: 'from-purple-500 to-pink-400', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  { gradient: 'from-orange-500 to-amber-400', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
];

export default function SocialGraph({ memory }) {
  const graph = memory?.social_graph || {};
  const friends = Object.entries(graph);

  // Calculate network-level stats
  const totalRecs = friends.reduce((acc, [_, f]) => acc + f.recommendations, 0);
  const avgMatch = friends.length > 0
    ? (friends.reduce((acc, [_, f]) => acc + f.match_score, 0) / friends.length * 100).toFixed(0)
    : 0;
  const totalVisited = friends.reduce((acc, [_, f]) => acc + f.you_visited, 0);

  return (
    <div className="space-y-6">
      {/* Network Stats */}
      <div className="grid grid-cols-3 gap-4">
        <NetworkStat icon={Users} label="Network Reach" value={totalRecs} suffix=" recs" accent="blue" />
        <NetworkStat icon={Heart} label="Avg. Taste Match" value={`${avgMatch}%`} accent="pink" />
        <NetworkStat icon={TrendingUp} label="Trust Actions" value={totalVisited} suffix=" visited" accent="green" />
      </div>

      {/* Friend Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {friends.map(([name, data], idx) => (
          <FriendCard key={name} name={name} data={data} colors={FRIEND_COLORS[idx % FRIEND_COLORS.length]} idx={idx} />
        ))}
      </div>

      {/* Preference Topology */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="a2ui-card"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-lg">Preference Topology</h3>
            <p className="text-[11px] text-textSub">Overlapping taste preferences across your social network.</p>
          </div>
          <span className="a2ui-badge bg-primary/10 text-primary border border-primary/20">Consensus Engine</span>
        </div>

        {/* Topology Visualization */}
        <div className="relative h-64 flex items-center justify-center">
          {/* Center Node (You) */}
          <div className="absolute z-20 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/30 flex items-center justify-center">
            <span className="text-white font-bold text-xs">YOU</span>
          </div>

          {/* Connection Lines + Friend Nodes */}
          {friends.map(([name, data], idx) => {
            const angle = (idx * 120) - 90;
            const radius = 100;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            const colors = FRIEND_COLORS[idx % FRIEND_COLORS.length];

            return (
              <React.Fragment key={name}>
                {/* Connection Line */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
                  <line
                    x1="50%" y1="50%"
                    x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                    stroke="#E5E5EA" strokeWidth="2" strokeDasharray="6 4"
                  />
                </svg>

                {/* Friend Node */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 + idx * 0.15 }}
                  className="absolute z-10 flex flex-col items-center"
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors.gradient} shadow-md flex items-center justify-center`}>
                    <span className="text-white font-bold text-[11px]">{name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span className="mt-1.5 text-[11px] font-bold text-textMain">{name}</span>
                  <span className="text-[10px] text-textSub">{(data.match_score * 100).toFixed(0)}% match</span>
                </motion.div>
              </React.Fragment>
            );
          })}

          {/* Overlap Circle */}
          <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-borderLight/60 z-0" />
        </div>
      </motion.div>
    </div>
  );
}

function FriendCard({ name, data, colors, idx }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.1 }}
      className="a2ui-card relative overflow-hidden group"
    >
      {/* Ambient glow */}
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${colors.gradient}`} />

      <div className="relative z-10">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md`}>
            <span className="text-white font-bold text-sm">{name[0]}</span>
          </div>
          <div>
            <h4 className="font-bold text-base text-textMain">{name}</h4>
            <p className="text-[11px] text-textSub">Taste Influence Score: {(data.match_score * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Match Score Bar */}
        <div className="mb-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-textSub">Taste Alignment</span>
            <span className={`text-[11px] font-bold ${colors.text}`}>{(data.match_score * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.match_score * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className={`h-2 rounded-full bg-gradient-to-r ${colors.gradient}`}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`${colors.bg} rounded-xl p-3 text-center`}>
            <span className={`text-lg font-extrabold ${colors.text}`}>{data.recommendations}</span>
            <p className="text-[10px] text-textSub font-medium mt-0.5">Recs Given</p>
          </div>
          <div className={`${colors.bg} rounded-xl p-3 text-center`}>
            <span className={`text-lg font-extrabold ${colors.text}`}>{data.you_visited}</span>
            <p className="text-[10px] text-textSub font-medium mt-0.5">You Visited</p>
          </div>
        </div>

        {/* Preference Tags */}
        <div className="flex flex-wrap gap-1.5">
          {data.preferences.map(pref => (
            <span key={pref} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
              {pref}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function NetworkStat({ icon: Icon, label, value, suffix = '', accent }) {
  const accents = {
    blue:  { bg: 'bg-blue-50',  icon: 'text-blue-500' },
    pink:  { bg: 'bg-pink-50',  icon: 'text-pink-500' },
    green: { bg: 'bg-green-50', icon: 'text-green-500' },
  };
  const c = accents[accent];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="a2ui-card !p-5 flex items-center gap-4"
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
        <Icon size={20} className={c.icon} />
      </div>
      <div>
        <span className="text-2xl font-extrabold text-textMain">{value}{suffix && <span className="text-xs font-medium text-textSub ml-1">{suffix}</span>}</span>
        <p className="text-[10px] font-semibold text-textSub uppercase tracking-widest">{label}</p>
      </div>
    </motion.div>
  );
}
