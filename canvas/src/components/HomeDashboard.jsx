import React from 'react';
import { Utensils, Zap, MapPin, Heart, TrendingUp } from 'lucide-react';

const HomeDashboard = ({ memory }) => {
  if (!memory) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CraveMap Dashboard</h1>
          <p className="text-dim">Your Sovereign Food Intelligence is active.</p>
        </div>
        <div className="agent-thinking">
          <Zap size={16} />
          <span>Taste Alchemist is reasoning...</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="text-primary" />
            <h3 className="text-lg">Bucket List</h3>
          </div>
          <div className="text-4xl font-bold">{memory.restaurants.filter(r => !r.visited).length}</div>
          <p className="text-dim text-sm mt-2">Unvisited recommendations</p>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-secondary" />
            <h3 className="text-lg">Weekly Spend</h3>
          </div>
          <div className="text-4xl font-bold">₹{memory.analytics.weekly_spend}</div>
          <p className="text-dim text-sm mt-2">Within budget limit</p>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-3 mb-4">
            <Utensils className="text-accent" />
            <h3 className="text-lg">Cravings</h3>
          </div>
          <div className="text-4xl font-bold">Biryani</div>
          <p className="text-dim text-sm mt-2">5-day cycle overdue!</p>
        </div>
      </div>

      <div className="glass-card mt-8">
        <h3 className="text-xl font-bold mb-6">Recent Agent Actions</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <MapPin size={20} />
            </div>
            <div>
              <div className="font-semibold">Social Hunter extracted "Toit"</div>
              <p className="text-sm text-dim">Added to Indiranagar bucket list via Rohan's recommendation.</p>
              <span className="text-xs text-dim mt-2 block">2 hours ago</span>
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="p-2 rounded-lg bg-accent/20 text-accent">
              <Zap size={20} />
            </div>
            <div>
              <div className="font-semibold">Taste Alchemist detected conflict</div>
              <p className="text-sm text-dim">"Meghana Biryani" matches Rohan but you rated it 2/5 last time.</p>
              <span className="text-xs text-dim mt-2 block">5 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;
