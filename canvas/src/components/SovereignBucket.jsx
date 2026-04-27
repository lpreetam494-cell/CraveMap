import React from 'react';
import { Search, List, Map as MapIcon, Share2, Bookmark, Home, ShoppingBag, Users, Zap, User } from 'lucide-react';

const SovereignBucket = ({ restaurants }) => {
  return (
    <div className="sovereign-layout">
      {/* Header */}
      <header className="sov-header">
        <div className="logo-container">
          <Zap size={18} className="text-cyan-primary fill-cyan-primary" />
          <span className="logo-text">Sovereign</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-700 border border-border-subtle overflow-hidden">
          <img src="https://i.pravatar.cc/100?u=marcus" alt="profile" />
        </div>
      </header>

      <main className="main-content">
        <div className="px-5 pt-8">
          <h1 className="text-4xl font-bold mt-1">Food Bucket List</h1>
          <p className="text-dim text-sm font-medium mt-2 leading-relaxed">
            Your curated collection of sovereign culinary targets. Prioritized by ambient intelligence.
          </p>
        </div>

        {/* Search & Tabs */}
        <div className="px-5 mt-8 flex gap-3">
          <div className="flex-1 h-12 bg-card border border-border-subtle rounded-xl flex items-center px-4 gap-3">
            <Search size={18} className="text-dim" />
            <input type="text" placeholder="Search by..." className="bg-transparent border-none outline-none text-sm w-full" />
            <div className="w-2 h-2 rounded-full bg-cyan-primary" />
          </div>
          <div className="bg-card border border-border-subtle rounded-xl flex items-center p-1">
            <button className="h-10 px-4 rounded-lg bg-cyan-primary/10 text-cyan-primary flex items-center gap-2">
              <List size={16} />
              <span className="text-[10px] font-bold uppercase">List</span>
            </button>
            <button className="h-10 px-4 rounded-lg text-dim flex items-center gap-2">
              <MapIcon size={16} />
              <span className="text-[10px] font-bold uppercase">Map</span>
            </button>
          </div>
        </div>

        {/* Restaurant Cards */}
        <div className="px-5 mt-8 space-y-6 pb-24">
          {/* Wishlist Card */}
          <div className="bg-card rounded-3xl overflow-hidden border border-border-subtle">
            <div className="h-64 relative">
              <img src="https://images.unsplash.com/photo-1550966842-282412826ad7?q=80&w=800" alt="osteria" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Wishlist</span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-bold">Osteria Delle Arti</h3>
                <Bookmark size={20} className="text-dim" />
              </div>
              <div className="flex gap-2 mt-3">
                <span className="bg-orange-900/30 text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold">Italian</span>
                <span className="bg-white/5 text-dim px-3 py-1 rounded-full text-[10px] font-bold">$$$</span>
                <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-[10px] font-bold">Intimate Vibe</span>
              </div>
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-dim text-xs">
                  <Share2 size={14} />
                  <span>Saved via Instagram</span>
                </div>
                <span className="text-dim text-xs">Added 2d ago</span>
              </div>
            </div>
          </div>

          {/* Visited Card */}
          <div className="bg-card rounded-3xl overflow-hidden border border-border-subtle p-6">
             <div className="flex justify-between items-start mb-6">
               <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                  <div className="w-4 h-4 rounded-full bg-cyan-primary/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Visited</span>
               </div>
             </div>
             <h3 className="text-2xl font-bold">Neon Ramen Alley</h3>
             <div className="flex gap-2 mt-3 mb-6">
                <span className="bg-white/5 text-dim px-3 py-1 rounded-full text-[10px] font-bold">Japanese</span>
                <span className="bg-white/5 text-dim px-3 py-1 rounded-full text-[10px] font-bold">$$</span>
                <span className="bg-white/5 text-dim px-3 py-1 rounded-full text-[10px] font-bold">Cyberpunk</span>
             </div>
             <div className="h-32 bg-slate-800 rounded-2xl overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1591814468924-caf88d1232e1?q=80&w=800" alt="ramen" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs flex items-center gap-1">
                  ⭐ 4.8
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <button className="absolute bottom-24 right-5 bg-cyan-100 text-bg-midnight px-6 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 z-30">
        <MapIcon size={20} />
        Save New Spot
      </button>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="nav-item">
          <Home size={20} />
          <span>Home</span>
        </div>
        <div className="nav-item active">
          <ShoppingBag size={20} />
          <span>Bucket</span>
        </div>
        <div className="nav-item">
          <Users size={20} />
          <span>Groups</span>
        </div>
        <div className="nav-item">
          <Zap size={20} />
          <span>AI Feed</span>
        </div>
        <div className="nav-item">
          <User size={20} />
          <span>Profile</span>
        </div>
      </nav>
    </div>
  );
};

export default SovereignBucket;
