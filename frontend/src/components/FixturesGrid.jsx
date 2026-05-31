import React, { useState } from 'react';
import { Calendar, Play, CheckCircle2, ChevronRight, Edit2 } from 'lucide-react';

const FixturesGrid = ({ matches, isAdmin, onEditMatch }) => {
  const [selectedRound, setSelectedRound] = useState(1);

  // Group matches by round numbers
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);

  // Filter matches for the currently selected round/gameweek
  const activeMatches = matches.filter((m) => m.round === selectedRound);

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="space-y-6">
      {/* Gameweek Selector Tabs */}
      {rounds.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 border-bottom border-slate-800 pb-2">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Select Gameweek / Round</h3>
            <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              {rounds.length} Total Rounds
            </span>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {rounds.map((roundNum) => (
              <button
                key={roundNum}
                onClick={() => setSelectedRound(roundNum)}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition shrink-0 ${
                  selectedRound === roundNum
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white'
                }`}
              >
                Round {roundNum}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixtures Listings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeMatches.length === 0 ? (
          <div className="col-span-full glass-card rounded-2xl p-8 text-center text-slate-400">
            No matches scheduled for this round.
          </div>
        ) : (
          activeMatches.map((match) => {
            const isLive = match.status === 'live';
            const isCompleted = match.status === 'completed';
            
            const p1Won = isCompleted && match.winnerId?._id === match.player1Id?._id;
            const p2Won = isCompleted && match.winnerId?._id === match.player2Id?._id;

            return (
              <div
                key={match._id}
                className={`glass-card rounded-2xl p-5 flex flex-col justify-between border relative overflow-hidden transition ${
                  isLive 
                    ? 'border-emerald-500/40 bg-emerald-950/5' 
                    : isCompleted 
                      ? 'border-slate-800 bg-slate-900/20' 
                      : 'border-slate-800/60'
                }`}
              >
                {/* Visual Glow for live matches */}
                {isLive && (
                  <div className="absolute top-0 right-0 h-1 w-24 bg-emerald-500 rounded-bl-xl shadow-[0_0_8px_#10b981]" />
                )}

                {/* Card Top: Round & Status Badges */}
                <div className="flex justify-between items-center mb-4 text-xs">
                  <span className="text-slate-400 font-medium">Round {match.round} • Gameweek Match</span>
                  
                  {isLive && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/25 uppercase tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-fast inline-block" />
                      Live Score
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                      <CheckCircle2 className="h-3 w-3 text-slate-400" />
                      Final Score
                    </span>
                  )}
                  {match.status === 'scheduled' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/40 text-slate-400 border border-slate-800">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      {formatDate(match.scheduledTime)}
                    </span>
                  )}
                </div>

                {/* Card Middle: Match Scoring Grid */}
                <div className="flex items-center justify-between gap-4 py-2">
                  {/* Player 1 Row */}
                  <div className="flex flex-col items-center flex-1 text-center">
                    <div className="relative">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold border text-sm overflow-hidden ${
                        p1Won 
                          ? 'border-amber-500 bg-amber-500/10' 
                          : 'border-slate-700 bg-slate-800'
                      }`}>
                        {match.player1Id?.avatarUrl ? (
                          <img src={match.player1Id?.avatarUrl} alt={match.player1Id?.name} className="h-full w-full object-cover" />
                        ) : (
                          match.player1Id?.name?.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      {p1Won && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full" title="Winner">
                          🏆
                        </span>
                      )}
                    </div>
                    <span className={`mt-2 text-sm font-semibold tracking-wide truncate max-w-[120px] ${p1Won ? 'text-amber-500 font-bold' : 'text-slate-100'}`}>
                      {match.player1Id?.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{match.player1Id?.club || 'Independent'}</span>
                  </div>

                  {/* Frame Counter / Score Display */}
                  <div className="flex flex-col items-center px-4">
                    <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2">
                      <span className={`text-xl font-bold tracking-tight ${p1Won ? 'text-amber-500' : 'text-white'}`}>
                        {match.player1Score}
                      </span>
                      <span className="text-slate-500 text-xs font-semibold">vs</span>
                      <span className={`text-xl font-bold tracking-tight ${p2Won ? 'text-amber-500' : 'text-white'}`}>
                        {match.player2Score}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-2 font-medium">Frames Score</span>
                  </div>

                  {/* Player 2 Row */}
                  <div className="flex flex-col items-center flex-1 text-center">
                    <div className="relative">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold border text-sm overflow-hidden ${
                        p2Won 
                          ? 'border-amber-500 bg-amber-500/10' 
                          : 'border-slate-700 bg-slate-800'
                      }`}>
                        {match.player2Id?.avatarUrl ? (
                          <img src={match.player2Id?.avatarUrl} alt={match.player2Id?.name} className="h-full w-full object-cover" />
                        ) : (
                          match.player2Id?.name?.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      {p2Won && (
                        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full" title="Winner">
                          🏆
                        </span>
                      )}
                    </div>
                    <span className={`mt-2 text-sm font-semibold tracking-wide truncate max-w-[120px] ${p2Won ? 'text-amber-500 font-bold' : 'text-slate-100'}`}>
                      {match.player2Id?.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{match.player2Id?.club || 'Independent'}</span>
                  </div>
                </div>

                {/* Admin Live Scoring Button */}
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-end">
                    <button
                      onClick={() => onEditMatch(match)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-slate-650 transition"
                    >
                      <Edit2 className="h-3 w-3" />
                      Live Scorer Dashboard
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FixturesGrid;
