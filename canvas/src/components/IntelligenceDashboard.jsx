import React from 'react';
import { TrendingUp, Compass, PieChart, Clock, Coffee, Pizza, Home, ShoppingBag, Users, Zap, User } from 'lucide-react';

const IntelligenceDashboard = () => {
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
          <h1 className="text-4xl font-bold mt-1">Intelligence</h1>
          <p className="text-dim text-sm font-medium">Food Memory & Behavioral Insights</p>
        </div>

        {/* Insights Scroller */}
        <div className="px-5 mt-8 space-y-4">
          <div className="insight-card mx-0 bg-[#12161b]">
            <div className="flex justify-between items-start mb-4">
              <TrendingUp size={20} className="text-dim" />
              <div className="text-[10px] font-bold uppercase text-orange-400 bg-orange-400/10 px-2 py-1 rounded">Variance</div>
            </div>
            <div className="text-4xl font-bold">+40%</div>
            <p className="text-dim text-sm mt-3 leading-relaxed">
              You spend significantly more on culinary experiences during weekends compared to weekdays.
            </p>
          </div>

          <div className="insight-card mx-0 bg-[#12161b]">
            <div className="flex justify-between items-start mb-4">
              <Compass size={20} className="text-dim" />
              <div className="text-[10px] font-bold uppercase text-purple-400 bg-purple-400/10 px-2 py-1 rounded">Discovery</div>
            </div>
            <div className="text-2xl font-bold">Saturday</div>
            <p className="text-dim text-sm mt-3 leading-relaxed">
              This is your designated "New Spot" day. 85% of your unexplored restaurant visits occur here.
            </p>
          </div>

          <div className="insight-card mx-0 bg-[#12161b]">
            <div className="flex justify-between items-start mb-4">
              <PieChart size={20} className="text-dim" />
              <div className="text-[10px] font-bold uppercase text-pink-400 bg-pink-400/10 px-2 py-1 rounded">Dominant</div>
            </div>
            <div className="text-2xl font-bold text-pink-200">Japanese</div>
            <p className="text-dim text-sm mt-3 leading-relaxed">
              Your most frequent craving cycle points heavily towards Asian noodle variants.
            </p>
          </div>
        </div>

        {/* Craving Cycles Timeline */}
        <div className="px-5 mt-12 pb-10">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={18} className="text-cyan-primary" />
            <h2 className="text-lg font-bold">Craving Cycles</h2>
          </div>

          <div className="space-y-8 relative pl-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-white/10" />
            
            <div className="relative">
              <div className="absolute -left-10 w-6 h-6 rounded-full bg-bg-midnight border border-white/20 flex items-center justify-center">
                <Coffee size={12} className="text-dim" />
              </div>
              <div className="bg-card p-4 rounded-xl border border-border-subtle">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold">The Ramen Den</h4>
                  <span className="text-[8px] font-bold uppercase bg-white/10 px-2 py-1 rounded">High Predictability</span>
                </div>
                <p className="text-xs text-dim mt-2">You revisit this location approximately every 8 days. Next predicted craving: Tomorrow.</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-10 w-6 h-6 rounded-full bg-bg-midnight border border-white/20 flex items-center justify-center">
                <Pizza size={12} className="text-dim" />
              </div>
              <div className="bg-card p-4 rounded-xl border border-border-subtle">
                <h4 className="font-bold">Late Night Slice</h4>
                <p className="text-xs text-dim mt-2">Usually follows a late Friday event. Average spend drops by 20% compared to daytime dining.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="nav-item">
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
        <div className="nav-item active">
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

export default IntelligenceDashboard;
