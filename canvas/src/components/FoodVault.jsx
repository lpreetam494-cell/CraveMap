import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, UtensilsCrossed, IndianRupee, Star,
  Sparkles, Search, SlidersHorizontal, ExternalLink
} from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unvisited', label: 'Bucket List' },
  { id: 'visited', label: 'Visited' },
];

export default function FoodVault({ memory }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const restaurants = memory?.restaurants || [];

  const filtered = restaurants.filter(r => {
    if (!r.name || r.name === 'Unknown') return false;
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.area && r.area.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'visited' ? r.visited : !r.visited;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-textSub" />
          <input
            type="text"
            placeholder="Search by name, cuisine, or area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface border border-borderLight/60 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex bg-surface border border-borderLight/60 rounded-xl p-1 shadow-sm">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                filter === f.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-textSub hover:text-textMain hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 text-textSub"
        >
          <UtensilsCrossed size={48} className="mb-4 opacity-15" />
          <p className="font-medium">No culinary memories found.</p>
          <p className="text-xs mt-1">Try a different search or filter.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((spot, idx) => (
            <RestaurantCard key={spot.id} spot={spot} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantCard({ spot, idx }) {
  const vibeColors = {
    'Casual': 'bg-sky-50 text-sky-600',
    'Heritage': 'bg-amber-50 text-amber-700',
    'Energetic': 'bg-pink-50 text-pink-600',
    'Work-friendly': 'bg-indigo-50 text-indigo-600',
    'Bustling': 'bg-orange-50 text-orange-600',
    'Vibrant': 'bg-purple-50 text-purple-600',
    'Authentic': 'bg-emerald-50 text-emerald-700',
  };

  const vibe = spot.vibe?.split('/')[0]?.trim() || '';
  const vibeClass = vibeColors[vibe] || 'bg-gray-50 text-gray-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.06 }}
      className="a2ui-card group relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-3xl opacity-30 transition-opacity group-hover:opacity-50 ${
        spot.visited ? 'bg-green-400' : 'bg-primary'
      }`} />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-textMain truncate group-hover:text-primary transition-colors">
            {spot.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <UtensilsCrossed size={12} className="text-textSub" />
            <span className="text-xs text-textSub truncate">{spot.cuisine || 'Unknown'}</span>
          </div>
        </div>
        <span className={`shrink-0 ml-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
          spot.visited
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-blue-50 text-primary border-blue-200'
        }`}>
          {spot.visited ? '✓ Visited' : 'Saved'}
        </span>
      </div>

      {/* Vibe Tag */}
      {spot.vibe && (
        <div className="relative z-10 mb-4">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${vibeClass}`}>
            <Sparkles size={11} /> {spot.vibe}
          </span>
        </div>
      )}

      {/* Details */}
      <div className="relative z-10 space-y-2.5 border-t border-borderLight/40 pt-4">
        <DetailRow icon={MapPin} label="Area" value={spot.area} />
        <DetailRow icon={IndianRupee} label="Budget" value={`₹${spot.budget || 'N/A'}`} />
        {spot.visited && spot.rating && (
          <DetailRow icon={Star} label="Rating" value={`${spot.rating} / 5`} iconClass="text-yellow-500" />
        )}
        {spot.source && (
          <DetailRow icon={ExternalLink} label="Source" value={spot.source} />
        )}
      </div>
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, value, iconClass = 'text-textSub' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-textSub">
        <Icon size={14} className={iconClass} /> {label}
      </span>
      <span className="font-medium text-textMain text-right">{value}</span>
    </div>
  );
}
