import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, Utensils, Users, LayoutDashboard,
  Zap, TrendingUp, ShieldCheck
} from 'lucide-react';
import Overview from './components/Overview';
import FoodVault from './components/FoodVault';
import SocialGraph from './components/SocialGraph';
import AgentGrid from './components/AgentGrid';

const API_BASE = `http://${window.location.hostname}:5001`;

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'vault', label: 'Food Vault', icon: Utensils },
  { id: 'social', label: 'Social Graph', icon: Users },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(localStorage.getItem('cravemap_user') || '');
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('cravemap_user') || '');
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const fetchMemory = () => {
    const url = selectedUser 
      ? `${API_BASE}/api/memory?userId=${selectedUser}`
      : `${API_BASE}/api/memory`;
    fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': import.meta.env.VITE_API_KEY
      }
    })
      .then(res => res.json())
      .then(data => { setMemory(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchUsersList = () => {
    fetch(`${API_BASE}/api/users`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': import.meta.env.VITE_API_KEY
      }
    })
      .then(res => res.json())
      .then(data => setUsers(data.agents || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchUsersList();
    const userInterval = setInterval(fetchUsersList, 10000);
    return () => clearInterval(userInterval);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMemory();
      const interval = setInterval(fetchMemory, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUser, currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const name = loginInput.trim().replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    if (!name) {
      setLoginError('Please enter your sovereign profile name.');
      return;
    }
    
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/memory?userId=${name}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': import.meta.env.VITE_API_KEY
        }
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      
      if (data && data.user_profile) {
        localStorage.setItem('cravemap_user', name);
        setCurrentUser(name);
        setSelectedUser(name);
        setMemory(data);
        setLoading(false);
      } else {
        throw new Error('Invalid structure');
      }
    } catch (err) {
      setLoading(false);
      setLoginError('❌ Sovereign Vault not found on disk. Setup your profile in Telegram first!');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100 selection:bg-primary/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
        >
          {/* Decorative glows */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20 mb-4">
              <BrainCircuit size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-2">CraveMap Sovereign</h1>
            <p className="text-slate-400 text-sm max-w-xs">
              Decrypt and mount your private, offline Sovereign Food Vault locally.
            </p>
          </div>



          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Sovereign Name (e.g. Preetam)
              </label>
              <input
                type="text"
                placeholder="Enter profile username"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-primary rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition duration-200"
              />
            </div>

            {loginError && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-semibold text-rose-400"
              >
                {loginError}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-primary/10 transition duration-200 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              Decrypt & Mount Vault
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
            <p className="text-slate-500 text-[11px] leading-relaxed">
              🔒 Your data stays encrypted on disk. Re-identifying via username is handled fully on your local machine.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const pageTitle = activeTab === 'dashboard' ? 'Intelligence Dashboard'
    : activeTab === 'agents' ? 'Sovereign Agents'
    : activeTab === 'vault' ? 'Sovereign Food Vault'
    : 'Social Taste Graph';

  const pageSubtitle = activeTab === 'dashboard' ? 'Real-time behavioral insights from your personal food memory.'
    : activeTab === 'agents' ? 'Every onboarded user and their unique Food DNA profile.'
    : activeTab === 'vault' ? 'Your encrypted, offline memory of every culinary discovery.'
    : 'Visualizing trust networks and preference alignment.';

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Sidebar ─── */}
      <aside className="w-[260px] min-h-screen border-r border-borderLight/60 bg-white/60 backdrop-blur-sm p-6 flex flex-col justify-between sticky top-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <BrainCircuit size={22} />
            </div>
            <div>
              <h1 className="font-bold text-[17px] text-textMain leading-tight tracking-tight">CraveMap</h1>
              <p className="text-[10px] text-textSub font-semibold tracking-[0.15em] uppercase">Sovereign Node</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-textSub hover:bg-gray-100/80 hover:text-textMain'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom User Info & Disconnect */}
        <div className="border-t border-slate-200/50 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">👤 {currentUser}</span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('cravemap_user');
                setCurrentUser('');
                setMemory(null);
                setLoading(true);
              }}
              className="text-[10px] text-rose-500 font-extrabold hover:underline uppercase tracking-wider"
            >
              Disconnect
            </button>
          </div>
          
          <div className="a2ui-card !p-4 bg-gradient-to-br from-green-50 to-emerald-50/50 !border-green-200/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-green-700">System Online</span>
            </div>
            <p className="text-[11px] text-green-600/80 leading-relaxed">
              All agents operational. Data encrypted & stored locally.
            </p>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 p-10 overflow-y-auto">
        {/* Page Header */}
        <header className="mb-8 flex justify-between items-start">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-[28px] font-extrabold text-textMain tracking-tight leading-tight">{pageTitle}</h2>
            <p className="text-textSub text-sm mt-1">{pageSubtitle}</p>
          </motion.div>

          <div className="flex items-center gap-3">
            {users.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Vault:</span>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="" className="bg-slate-950 text-slate-200">⏱️ Latest Active</option>
                  {users.map(u => (
                    <option key={u.userId} value={u.userId} className="bg-slate-950 text-slate-200">
                      🧬 {u.profile.name} ({u.spotCount} spots)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl shadow-sm">
              <ShieldCheck size={15} className="text-green-500" />
              <span className="text-xs font-semibold text-slate-300">Sovereign Mode</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && <Overview memory={memory} loading={loading} />}
            {activeTab === 'agents' && <AgentGrid />}
            {activeTab === 'vault' && <FoodVault memory={memory} />}
            {activeTab === 'social' && <SocialGraph memory={memory} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
