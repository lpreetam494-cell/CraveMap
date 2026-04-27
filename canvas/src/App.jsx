import React, { useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Zap } from 'lucide-react';
import SovereignHome from './components/SovereignHome';
import SovereignBucket from './components/SovereignBucket';
import IntelligenceDashboard from './components/IntelligenceDashboard';
import SovereignGroups from './components/SovereignGroups';
import OpenClawOperations from './components/OpenClawOperations';

const socket = io('http://localhost:5000');

// Mock Profile Component (Enhanced to match Image 7)
const ProfileSettings = () => (
  <div className="sovereign-layout bg-[#0d1117]">
    <main className="main-content">
      <div className="px-5 pt-8 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full border-2 border-cyan-primary p-1 mb-4 relative">
           <img src="https://i.pravatar.cc/200?u=elena" className="w-full h-full rounded-full object-cover" alt="elena" />
           <div className="absolute bottom-0 right-0 bg-cyan-primary rounded-full p-1 border-2 border-bg-midnight">
              <Zap size={10} fill="black" className="text-black" />
           </div>
        </div>
        <h1 className="text-3xl font-bold">Elena Rostova</h1>
        <p className="text-dim text-sm">San Francisco, CA</p>
        
        <div className="flex gap-2 mt-4">
           <div className="bg-orange-900/20 text-orange-400 px-3 py-1 rounded-full text-[10px] font-bold border border-orange-900/30">★ Elite Food Critic</div>
           <div className="bg-white/5 text-dim px-3 py-1 rounded-full text-[10px] font-bold border border-white/10">Level 42 Taster</div>
        </div>
      </div>

      <div className="px-5 mt-10 space-y-6">
        <div className="bg-card rounded-2xl p-6 border border-border-subtle">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Zap size={18} className="text-cyan-primary" />
                Dietary Protocol
              </h3>
              <button className="text-cyan-primary text-[10px] font-bold uppercase tracking-widest">Edit</button>
           </div>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-cyan-primary/5 border border-cyan-primary/20 rounded-xl p-4">
                 <Zap size={16} className="text-cyan-primary mb-2" />
                 <div className="font-bold text-sm">Vegetarian</div>
                 <div className="text-[10px] text-dim">Strict</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                 <Zap size={16} className="text-white/40 mb-2" />
                 <div className="font-bold text-sm">Gluten-Free</div>
                 <div className="text-[10px] text-dim">Intolerance</div>
              </div>
           </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border-subtle">
           <h3 className="text-xl font-bold mb-4">Data Vault</h3>
           <p className="text-dim text-sm leading-relaxed mb-6">
             Your food memory is stored locally. You have full control over who sees your culinary history.
           </p>
           <button className="w-full py-4 bg-red-900/10 text-red-400 border border-red-900/20 rounded-xl font-bold uppercase text-[10px] tracking-widest">
             Purge Local Cache
           </button>
        </div>
      </div>
    </main>

    <nav className="bottom-nav">
      <div className="nav-item">
        <Zap size={20} />
        <span>Home</span>
      </div>
      <div className="nav-item">
        <Zap size={20} />
        <span>Bucket</span>
      </div>
      <div className="nav-item">
        <Zap size={20} />
        <span>Groups</span>
      </div>
      <div className="nav-item">
        <Zap size={20} />
        <span>AI Feed</span>
      </div>
      <div className="nav-item active">
        <Zap size={20} />
        <span>Profile</span>
      </div>
    </nav>
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [thoughts, setThoughts] = useState([]);

  React.useEffect(() => {
    socket.on('agent_thought', (thought) => {
      setThoughts(prev => [thought, ...prev].slice(0, 10)); // Keep last 10 thoughts
    });
    return () => socket.off('agent_thought');
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <SovereignHome />;
      case 'bucket': return <SovereignBucket restaurants={[]} />;
      case 'groups': return <SovereignGroups />;
      case 'intelligence': return <OpenClawOperations thoughts={thoughts} />;
      case 'profile': return <ProfileSettings />;
      default: return <SovereignHome />;
    }
  };

  return (
    <div className="h-screen bg-[#0d1117] flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full max-w-[450px]">
        {renderContent()}
        
        {/* Navigation Overlays */}
        <div className="absolute bottom-0 w-full h-20 flex justify-around items-center z-50">
          <div onClick={() => setActiveTab('home')} className="flex-1 h-full cursor-pointer"></div>
          <div onClick={() => setActiveTab('bucket')} className="flex-1 h-full cursor-pointer"></div>
          <div onClick={() => setActiveTab('groups')} className="flex-1 h-full cursor-pointer"></div>
          <div onClick={() => setActiveTab('intelligence')} className="flex-1 h-full cursor-pointer"></div>
          <div onClick={() => setActiveTab('profile')} className="flex-1 h-full cursor-pointer"></div>
        </div>
      </div>
    </div>
  );
};

export default App;
