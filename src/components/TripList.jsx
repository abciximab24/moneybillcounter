import React from 'react';
import { Plus, Users } from 'lucide-react';

export default function TripList({ trips, onSelectTrip, onCreateTrip, onJoinTrip }) {
  return (
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black">My Trips</h2>
        <button
          onClick={onJoinTrip}
          className="bg-indigo-100 text-indigo-600 px-4 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-200 transition-colors"
        >
          <Users size={18} />
          Join
        </button>
      </div>

      <div className="space-y-4 mt-8">
        {trips.map((trip) => (
          <div
            key={trip.id}
            onClick={() => onSelectTrip(trip)}
            className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-bold">{trip.name}</h3>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-tighter">
              {trip.members.length} Members • Code: {trip.inviteCode}
            </p>
            {trip.baseCurrency && (
              <div className="mt-3 flex gap-2">
                <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-lg font-bold">
                  {trip.baseCurrency}
                </span>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={onCreateTrip}
          className="w-full py-10 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors"
        >
          <Plus size={32} />
          <span className="font-bold mt-2">New Trip</span>
        </button>
      </div>

      {trips.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 font-medium">No trips yet</p>
          <p className="text-slate-300 text-sm mt-1">Create your first trip to get started!</p>
        </div>
      )}
    </main>
  );
}