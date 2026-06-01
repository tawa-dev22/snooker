import React, { useState, useEffect } from 'react';
import { Trophy, Users, PlusCircle, AlertCircle, Sparkles, Check, CheckSquare, Square } from 'lucide-react';

import { API_BASE_URL } from '../utils/api';

const TournamentCreator = ({ token, onTournamentCreated }) => {
  // State for tournament creation form
  const [name, setName] = useState('');
  const [season, setSeason] = useState('2026/27');
  const [pointsForWin, setPointsForWin] = useState(3);
  const [pointsForLoss, setPointsForLoss] = useState(0);
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(true);
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  // State for fetching available players in system
  const [allPlayers, setAllPlayers] = useState([]);
  const [fetchingPlayers, setFetchingPlayers] = useState(false);

  // State for creating a new player profile
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerClub, setNewPlayerClub] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState('');
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  // Feedback states
  const [statusMsg, setStatusMsg] = useState(null);
  const [statusType, setStatusType] = useState('info'); // 'info' | 'error' | 'success'

  const fetchAvailablePlayers = async () => {
    setFetchingPlayers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/players`);
      if (res.ok) {
        const data = await res.json();
        setAllPlayers(data);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setFetchingPlayers(false);
    }
  };

  useEffect(() => {
    fetchAvailablePlayers();
  }, []);

  const handleTogglePlayer = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter((id) => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  // Action to submit a brand new player
  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setCreatingPlayer(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPlayerName.trim(),
          club: newPlayerClub.trim() || 'Independent',
          avatarUrl: newPlayerAvatar.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${newPlayerName}`,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMsg(`Player ${data.name} registered successfully!`);
        setStatusType('success');
        setNewPlayerName('');
        setNewPlayerClub('');
        setNewPlayerAvatar('');
        // Automatically select the new player
        setSelectedPlayers([...selectedPlayers, data._id]);
        // Refresh listings
        fetchAvailablePlayers();
      } else {
        setStatusMsg(data.error || 'Failed to register player');
        setStatusType('error');
      }
    } catch (err) {
      setStatusMsg(err.message);
      setStatusType('error');
    } finally {
      setCreatingPlayer(false);
    }
  };

  // Full chain action: Create Tournament -> Register Players -> Generate Fixtures
  const handleLaunchLeague = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMsg('Please provide a name for the League');
      setStatusType('error');
      return;
    }
    if (selectedPlayers.length < 2) {
      setStatusMsg('You must select at least 2 players to schedule a league');
      setStatusType('error');
      return;
    }

    setStatusMsg('Creating league configuration...');
    setStatusType('info');

    try {
      // 1. Create Tournament Document
      const tRes = await fetch(`${API_BASE_URL}/api/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          season: season.trim(),
          pointsForWin: parseInt(pointsForWin, 10),
          pointsForLoss: parseInt(pointsForLoss, 10),
          doubleRoundRobin,
          playerIds: selectedPlayers,
        }),
      });

      const tournament = await tRes.json();
      if (!tRes.ok) {
        throw new Error(tournament.error || 'Failed to create tournament document');
      }

      // 2. Generate Fixtures (This sets status to active & bulk-saves matches)
      setStatusMsg('Generating round-robin pairings & fixtures...');
      const fRes = await fetch(`${API_BASE_URL}/api/tournaments/${tournament._id}/fixtures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const fixturesData = await fRes.json();
      if (!fRes.ok) {
        throw new Error(fixturesData.error || 'Failed to generate pairings');
      }

      setStatusMsg('League activated! All round-robin fixtures scheduled successfully.');
      setStatusType('success');

      // Reset Form
      setName('');
      setSelectedPlayers([]);

      // Notify parent app
      if (onTournamentCreated) {
        onTournamentCreated(tournament._id);
      }
    } catch (err) {
      setStatusMsg(err.message);
      setStatusType('error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Col 1 & 2: Setup League Rules & Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold font-sans text-white">Setup New League Tournament</h2>
          </div>

          <form onSubmit={handleLaunchLeague} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">League Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Premier League Snooker"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Season</label>
                <input
                  type="text"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g. 2026/27"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {/* Custom Rules Setup */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-slate-800/60 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Win Points</label>
                <input
                  type="number"
                  value={pointsForWin}
                  onChange={(e) => setPointsForWin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Loss Points</label>
                <input
                  type="number"
                  value={pointsForLoss}
                  onChange={(e) => setPointsForLoss(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  min="0"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setDoubleRoundRobin(!doubleRoundRobin)}
                  className={`w-full text-left flex items-center justify-between bg-slate-900 border rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    doubleRoundRobin 
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/5' 
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span>Home/Away (Double RR)</span>
                  {doubleRoundRobin ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Select Active Players List */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Select Players ({selectedPlayers.length} selected)
                </label>
                <span className="text-[10px] text-slate-400">Must select at least 2</span>
              </div>

              {fetchingPlayers ? (
                <p className="text-sm text-slate-400">Loading players registry...</p>
              ) : allPlayers.length === 0 ? (
                <p className="text-sm text-slate-400">No players registered. Add players on the right panel first!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                  {allPlayers.map((player) => {
                    const isSelected = selectedPlayers.includes(player._id);
                    return (
                      <button
                        key={player._id}
                        type="button"
                        onClick={() => handleTogglePlayer(player._id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-950/10 text-white'
                            : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className={`h-5 w-5 rounded flex items-center justify-center border transition ${
                          isSelected 
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                            : 'border-slate-700 bg-slate-800'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{player.name}</div>
                          <div className="text-[10px] text-slate-400">{player.club || 'Independent'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notification messages */}
            {statusMsg && (
              <div className={`flex items-start gap-2.5 p-4 rounded-xl text-xs border ${
                statusType === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : statusType === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium leading-normal">{statusMsg}</span>
              </div>
            )}

            {/* Submit Launch button */}
            <button
              type="submit"
              disabled={selectedPlayers.length < 2 || !name.trim()}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Schedule & Launch EPL League
            </button>
          </form>
        </div>
      </div>

      {/* Col 3: Register New Player Profile */}
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold font-sans text-white">Add New Player Profile</h2>
          </div>

          <form onSubmit={handleCreatePlayer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Player Full Name</label>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="e.g. Ronnie O'Sullivan"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Club Affiliation</label>
              <input
                type="text"
                value={newPlayerClub}
                onChange={(e) => setNewPlayerClub(e.target.value)}
                placeholder="e.g. Sheffield Academy"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Avatar URL (Optional)</label>
              <input
                type="text"
                value={newPlayerAvatar}
                onChange={(e) => setNewPlayerAvatar(e.target.value)}
                placeholder="Image path or blank for generated initials"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={creatingPlayer || !newPlayerName.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <PlusCircle className="h-4 w-4" />
              {creatingPlayer ? 'Saving...' : 'Register Player'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TournamentCreator;
