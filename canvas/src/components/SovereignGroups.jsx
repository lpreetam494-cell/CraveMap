import React from 'react';
import axios from 'axios';
import { Users, Triangle, CheckCircle2, MapPin, Home, ShoppingBag, Zap, User } from 'lucide-react';

const SovereignGroups = () => {
  const [isLocked, setIsLocked] = React.useState(false);

  const handleLockIn = async () => {
    try {
      await axios.post('http://localhost:5000/api/group-decision', {
        groupPrefs: [
          { preferredCuisines: ['Japanese'], maxBudget: 50, maxDistance: 10 },
          { preferredCuisines: ['Italian'], maxBudget: 40, maxDistance: 5 }
        ]
      });
      setIsLocked(true);
    } catch (err) {
      console.error("Failed to lock in decision");
    }
  };

  return (
    <div className="sovereign-layout">
      {/* ... header and topology ... */}
      {/* Header */}
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
          <h1 className="text-4xl font-bold">Friday Night Crave</h1>
          <div className="flex items-center gap-2 text-dim text-sm mt-2">
            <Users size={16} />
            <span>Resolving conflicts for 5 members</span>
          </div>
          
          <div className="flex -space-x-3 mt-4">
            <img src="https://i.pravatar.cc/100?u=1" className="w-8 h-8 rounded-full border-2 border-bg-midnight" alt="u1" />
            <img src="https://i.pravatar.cc/100?u=2" className="w-8 h-8 rounded-full border-2 border-bg-midnight" alt="u2" />
            <img src="https://i.pravatar.cc/100?u=3" className="w-8 h-8 rounded-full border-2 border-bg-midnight" alt="u3" />
            <img src="https://i.pravatar.cc/100?u=4" className="w-8 h-8 rounded-full border-2 border-bg-midnight" alt="u4" />
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-bg-midnight flex items-center justify-center text-[10px] font-bold">+1</div>
          </div>
        </div>

        {/* Preference Topology */}
        <div className="px-5 mt-10">
          <div className="bg-[#1c2128] rounded-3xl p-8 border border-white/5 relative overflow-hidden">
             <h3 className="text-xl font-bold mb-10">Preference Topology</h3>
             
             <div className="flex justify-center mb-10">
                <div className="relative w-48 h-48">
                  {/* The Triangle UI */}
                  <svg viewBox="0 0 100 100" className="w-full h-full text-white/5">
                    <path d="M50 10 L90 85 L10 85 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
                  </svg>
                  
                  {/* Consensus Points */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 flex flex-col items-center">
                    <Utensils size={14} className="text-primary-orange" />
                    <span className="text-[10px] font-bold uppercase mt-1">Cuisine</span>
                  </div>
                  <div className="absolute bottom-0 left-0 -translate-x-6 translate-y-6 flex flex-col items-center">
                    <MapPin size={14} className="text-cyan-primary" />
                    <span className="text-[10px] font-bold uppercase mt-1">Distance</span>
                  </div>
                  <div className="absolute bottom-0 right-0 translate-x-6 translate-y-6 flex flex-col items-center">
                    <CreditCard size={14} className="text-orange-400" />
                    <span className="text-[10px] font-bold uppercase mt-1">Budget</span>
                  </div>

                  {/* The Inner Triangle (Consensus Area) */}
                  <div className="absolute inset-4">
                     <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-primary">
                        <path d="M50 30 L75 75 L25 75 Z" fill="var(--cyan-glow)" stroke="currentColor" strokeWidth="4" />
                     </svg>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-primary rounded-full shadow-[0_0_20px_var(--cyan-primary)]" />
                  </div>
                </div>
             </div>

             <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-primary" />
                  <span className="text-[10px] font-bold uppercase text-dim">Consensus</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary-orange" />
                  <span className="text-[10px] font-bold uppercase text-dim">Friction</span>
                </div>
             </div>
          </div>
        </div>

        {/* The Sweet Spot Card */}
        <div className="px-5 mt-8 pb-32">
          <div className="bg-gradient-to-br from-[#1c2128] to-[#0d1117] rounded-3xl p-8 border border-cyan-primary/20 shadow-[0_0_40px_rgba(0,242,255,0.05)]">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-6 h-6 rounded-full bg-cyan-primary flex items-center justify-center text-black">
                 <Zap size={14} fill="black" />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-primary">The Sweet Spot</span>
             </div>
             
             <h2 className="text-4xl font-bold leading-tight">Oasi Vegan Japanese</h2>
             <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 bg-cyan-primary/10 px-3 py-1.5 rounded-full border border-cyan-primary/20">
                  <Zap size={14} className="text-cyan-primary" />
                  <span className="text-cyan-primary text-[10px] font-bold uppercase">92% Group Harmony</span>
                </div>
                <span className="text-dim text-xs">$$</span>
             </div>

             <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-cyan-primary mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">Budget Alignment</div>
                    <p className="text-xs text-dim">Fits everyone's budget requirements.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-cyan-primary mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">Dietary Matrix</div>
                    <p className="text-xs text-dim">Ramen for Marcus, with 4 robust vegan options for Sarah.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-cyan-primary mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">Logistics</div>
                    <p className="text-xs text-dim">Central point: 12 min average transit time.</p>
                  </div>
                </div>
             </div>

             <button 
               onClick={handleLockIn}
               disabled={isLocked}
               className={`w-full font-bold py-4 rounded-xl mt-10 uppercase tracking-widest transition-all ${
                 isLocked 
                 ? 'bg-slate-800 text-dim cursor-default' 
                 : 'bg-cyan-primary text-black shadow-[0_0_20px_var(--cyan-glow)] active:scale-95'
               }`}
             >
               {isLocked ? 'Poll Drafted to Group' : 'Lock It In'}
             </button>
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
        <div className="nav-item active">
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

// Internal icon helpers
const Utensils = ({size, className}) => <Zap size={size} className={className} />;
const CreditCard = ({size, className}) => <Zap size={size} className={className} />;

export default SovereignGroups;
