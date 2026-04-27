import React from 'react';
import { Users, CheckCircle, AlertTriangle } from 'lucide-react';

const GroupConflictResolver = () => {
  const mockGroup = [
    { name: 'You', status: 'ready', pref: 'Non-Veg, Spicy' },
    { name: 'Rohan', status: 'ready', pref: 'Veg, South Indian' },
    { name: 'Priya', status: 'waiting', pref: 'Healthy, Cafe' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-8">Group Conflict Resolver</h2>
      
      <div className="glass-card mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users size={20} className="text-accent" />
          Active Group: Dinner Friday
        </h3>
        <div className="space-y-4">
          {mockGroup.map(member => (
            <div key={member.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${member.status === 'ready' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <div className="font-semibold">{member.name}</div>
                  <div className="text-xs text-dim">{member.pref}</div>
                </div>
              </div>
              {member.status === 'ready' ? <CheckCircle size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-yellow-500" />}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card bg-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-primary/20 text-primary">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Taste Alchemist Recommendation</h3>
            <p className="text-sm text-dim mb-4">
              Conflict detected: Rohan is Veg, You are Non-Veg. 
              Searching for "South Indian Heritage" spots with Veg options...
            </p>
            <div className="p-4 rounded-xl bg-black/40 border border-white/10">
              <div className="text-primary font-bold">TOP PICK: Vidyarthi Bhavan</div>
              <div className="text-xs text-dim mt-1">92% Compatibility Score</div>
              <button className="mt-4 w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/80 transition-colors">
                Draft Group Poll
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupConflictResolver;
