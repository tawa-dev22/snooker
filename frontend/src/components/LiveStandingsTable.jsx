import React from 'react';
import { Award, Zap, RefreshCw, AlertCircle } from 'lucide-react';

const LiveStandingsTable = ({ standings, realTimeStatus, onRefresh }) => {
  // Translate connection status to visual tags
  const renderStatusBadge = () => {
    switch (realTimeStatus) {
      case 'sse':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Stream
          </span>
        );
      case 'polling':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Zap className="h-3.3 w-3.3 animate-bounce" />
            Auto-Polling (5s)
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Connecting Stream...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <AlertCircle className="h-3 w-3" />
            Offline
          </span>
        );
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 overflow-hidden">
      {/* Table Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            League Table Standings
          </h2>
          <p className="text-xs text-slate-400 mt-1">EPL Structure. Ordered by Points → Frame Diff → Frames Won → Head-to-Head</p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
          {renderStatusBadge()}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Manual Table Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Standings Grid */}
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="glass-table min-w-full">
            <thead>
              <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider text-left">
                <th className="py-4 px-4 text-center w-12 rounded-tl-xl">Pos</th>
                <th className="py-4 px-4 min-w-[180px]">Player / Club</th>
                <th className="py-4 px-3 text-center">P</th>
                <th className="py-4 px-3 text-center">W</th>
                <th className="py-4 px-3 text-center">L</th>
                <th className="py-4 px-3 text-center">FD</th>
                <th className="py-4 px-3 text-center">FW</th>
                <th className="py-4 px-4 text-center rounded-tr-xl w-16">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {standings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No active players or matches played in this league yet.
                  </td>
                </tr>
              ) : (
                standings.map((row) => {
                  const fdGlow = row.FrameDifference > 0 
                    ? 'text-emerald-400 font-semibold' 
                    : row.FrameDifference < 0 
                      ? 'text-rose-400 font-semibold' 
                      : 'text-slate-400';

                  const posStyle = row.Pos === 1 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                    : row.Pos === 2 
                      ? 'bg-slate-300/10 text-slate-300 border border-slate-300/30' 
                      : row.Pos === 3 
                        ? 'bg-amber-700/10 text-amber-600 border border-amber-700/30' 
                        : 'text-slate-400 border border-slate-800';

                  return (
                    <tr key={row.playerId} className="hover:bg-slate-800/25 transition">
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${posStyle}`}>
                          {row.Pos}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {row.avatarUrl ? (
                            <img
                              src={row.avatarUrl}
                              alt={row.name}
                              className="h-9 w-9 rounded-full object-cover border border-slate-700 bg-slate-800"
                              onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${row.name}`; }}
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-800 to-slate-900 flex items-center justify-center text-xs font-bold text-emerald-400 border border-emerald-500/20">
                              {row.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white tracking-wide">{row.name}</div>
                            <div className="text-xs text-slate-400">{row.club || 'Independent'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center font-medium text-slate-200">{row.Played}</td>
                      <td className="py-4 px-3 text-center text-emerald-400/90">{row.Won}</td>
                      <td className="py-4 px-3 text-center text-rose-400/90">{row.Lost}</td>
                      <td className={`py-4 px-3 text-center ${fdGlow}`}>
                        {row.FrameDifference > 0 ? `+${row.FrameDifference}` : row.FrameDifference}
                      </td>
                      <td className="py-4 px-3 text-center text-slate-300">{row.TotalFramesWon}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-base font-bold text-amber-500 tracking-wider">
                          {row.Points}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveStandingsTable;
