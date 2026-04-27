import React from 'react';
import { Bell, MapPin, Search, Mic, Home, ShoppingBag, Users, Zap, User } from 'lucide-react';

const SovereignHome = ({ memory }) => {
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
          <p className="text-dim text-sm font-medium">Good Evening,</p>
          <h1 className="text-4xl font-bold mt-1">Marcus.</h1>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 px-5 mt-6">
          <div className="flex-1 bg-card p-4 rounded-xl border border-border-subtle">
            <div className="text-cyan-primary text-xl font-bold">128</div>
            <div className="text-dim text-[10px] font-bold uppercase tracking-wider">Saved Spots</div>
          </div>
          <div className="flex-1 bg-card p-4 rounded-xl border border-border-subtle">
            <div className="text-primary-orange text-xl font-bold">14</div>
            <div className="text-dim text-[10px] font-bold uppercase tracking-wider">Intelligence Alerts</div>
          </div>
        </div>

        {/* Crave Match Circle */}
        <div className="match-circle-container">
          <div className="match-circle">
            <div className="match-percentage">94%</div>
            <div className="match-label">Crave Match</div>
            
            <button className="btn-primary mt-8 w-4/5">
              <Zap size={16} fill="black" />
              What should we eat?
            </button>
          </div>
        </div>

        {/* Agent Insights Section */}
        <div className="px-5 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-cyan-primary" />
            <h2 className="text-lg font-bold">Agent Insights</h2>
          </div>

          <div className="insight-card mx-0">
            <div className="insight-tag">
              <Zap size={10} fill="currentColor" className="mr-1" />
              Time Alert
            </div>
            <p className="text-sm font-medium">You haven't had <span className="text-primary-orange">biryani</span> in 6 days.</p>
            <button className="text-dim text-xs mt-3 font-bold hover:text-white">Find nearby spots →</button>
          </div>

          <div className="insight-card mx-0">
            <div className="insight-tag context">
              <Zap size={10} fill="currentColor" className="mr-1" />
              Context Sync
            </div>
            <p className="text-sm font-medium">Rainy weather detected. <span className="text-cyan-primary">Ramen</span> recommended nearby.</p>
            <button className="text-dim text-xs mt-3 font-bold hover:text-white">View 3 matches →</button>
          </div>
        </div>

        {/* High Probability Matches */}
        <div className="px-5 mt-8 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">High Probability Matches</h2>
          <button className="text-cyan-primary text-[10px] font-bold uppercase tracking-widest">View All</button>
        </div>

        <div className="px-5 space-y-4 pb-10">
          <div className="bg-card rounded-2xl overflow-hidden border border-border-subtle group">
            <div className="h-48 bg-slate-800 relative">
              <img src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800" alt="ramen" className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold">
                ⭐ 98%
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg">Kintaro Ramen</h3>
              <div className="flex items-center gap-1 text-dim text-xs mt-1">
                <MapPin size={12} />
                <span>1.2 miles away</span>
              </div>
              <div className="flex gap-2 mt-3">
                <span className="bg-white/5 border border-border-subtle px-2 py-1 rounded text-[10px] font-bold uppercase text-dim">Japanese</span>
                <span className="bg-white/5 border border-border-subtle px-2 py-1 rounded text-[10px] font-bold uppercase text-dim">Comfort</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Input Bar */}
      <div className="absolute bottom-20 left-5 right-5 h-14 bg-[#1a212a]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-4 gap-3 z-20">
        <div className="p-2 bg-cyan-primary/20 rounded-full">
          <Mic size={18} className="text-cyan-primary" />
        </div>
        <input type="text" placeholder="Command Sovereign Agent" className="bg-transparent border-none flex-1 text-sm outline-none placeholder:text-dim" />
        <Search size={18} className="text-dim" />
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="nav-item active">
          <Home size={20} />
          <span>Home</span>
        </div>
        <div className="nav-item">
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

export default SovereignHome;
