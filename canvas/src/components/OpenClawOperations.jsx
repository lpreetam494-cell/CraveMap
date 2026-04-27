import React from 'react';
import { Target, Terminal, Database, AlertCircle, Home, ShoppingBag, Users, Zap, User } from 'lucide-react';

const OpenClawOperations = ({ thoughts }) => {
  return (
    <div className="sovereign-layout bg-[#0d1117]">
      {/* Header code stays the same... */}
      <header className="sov-header">
        <div className="logo-container">
          <Zap size={18} className="text-cyan-primary fill-cyan-primary" />
          <span className="logo-text">Sovereign</span>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
           <img src="https://i.pravatar.cc/100?u=marcus" alt="marcus" />
        </div>
      </header>

      <main className="main-content">
        <div className="px-5 pt-8">
          <h1 className="text-4xl font-bold">OpenClaw Operations</h1>
          <p className="text-dim text-sm mt-1">Real-time agent activity & intelligence feed</p>
        </div>

        {/* System Live Indicator */}
        <div className="mx-5 mt-6 px-4 py-2 bg-cyan-primary/5 border border-cyan-primary/20 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-primary animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-primary">System Live</span>
        </div>

        {/* Event Logs - Real-time */}
        <div className="px-5 mt-8 space-y-6">
          {thoughts.length === 0 ? (
            <div className="text-dim text-center py-20 italic">Waiting for agent activity...</div>
          ) : (
            thoughts.map((thought, idx) => (
              <div key={idx} className={`bg-[#1c2128] rounded-2xl border-l-4 p-6 shadow-xl animate-in slide-in-from-right duration-500 ${
                thought.agent === 'Social Hunter' ? 'border-cyan-primary' : 
                thought.agent === 'Taste Alchemist' ? 'border-purple-500' : 'border-orange-500'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <Zap size={20} className={
                        thought.agent === 'Social Hunter' ? 'text-cyan-primary' : 
                        thought.agent === 'Taste Alchemist' ? 'text-purple-500' : 'text-orange-500'
                      } />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{thought.agent}</h4>
                      <p className="text-[10px] text-dim font-bold uppercase">{thought.action}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-dim">
                    {new Date(thought.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <p className="text-sm font-medium mb-4">{thought.message}</p>
                {thought.data && Object.keys(thought.data).length > 0 && (
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-[11px] text-cyan-primary/80 space-y-1">
                    {Object.entries(thought.data).map(([key, val]) => (
                      <div key={key}>&gt; {key}: {JSON.stringify(val)}</div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Neural Activity Graph stays the same... */}

        {/* Neural Activity Graph */}
        <div className="px-5 mt-12 pb-24">
          <h4 className="text-[10px] font-bold uppercase text-dim tracking-widest mb-4">Neural Activity</h4>
          <div className="flex items-end gap-1 h-12">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="flex-1 bg-cyan-primary/40 rounded-t" 
                style={{ height: `${Math.random() * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[8px] font-bold text-dim uppercase">
            <span>T-60s</span>
            <span>Now</span>
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

export default OpenClawOperations;
