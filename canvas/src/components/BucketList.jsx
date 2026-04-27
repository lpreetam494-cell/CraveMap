import React from 'react';
import { ExternalLink, Clock, Tag } from 'lucide-react';

const BucketList = ({ restaurants }) => {
  const unvisited = restaurants.filter(r => !r.visited);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-8">Sovereign Bucket List</h2>
      <div className="grid grid-cols-2 gap-4">
        {unvisited.map(spot => (
          <div key={spot.id} className="glass-card flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold">{spot.name}</h3>
                <ExternalLink size={18} className="text-dim hover:text-white cursor-pointer" />
              </div>
              <p className="text-primary text-sm font-semibold mb-4">{spot.cuisine}</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-dim">
                  <Clock size={14} />
                  <span>Saved {spot.saved_at}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dim">
                  <Tag size={14} />
                  <span>Source: {spot.source}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">
                {spot.area}
              </span>
              <span className="text-secondary font-bold">₹{spot.budget}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BucketList;
