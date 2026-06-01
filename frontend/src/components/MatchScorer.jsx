import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, ChevronUp, ChevronDown, Save, Loader2, AlertCircle } from 'lucide-react';

import { API_BASE_URL } from '../utils/api';

const MatchScorer = ({ match, token, onScoreUpdated, onCancel }) => {
  const [player1Score, setPlayer1Score] = useState(match.player1Score);
  const [player2Score, setPlayer2Score] = useState(match.player2Score);
  const [status, setStatus] = useState(match.status);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const incrementScore = (playerNum) => {
    if (status === 'scheduled') {
      setStatus('live'); // Automatically move to live if scores start changing
    }
    if (playerNum === 1) {
      setPlayer1Score(prev => prev + 1);
    } else {
      setPlayer2Score(prev => prev + 1);
    }
  };

  const decrementScore = (playerNum) => {
    if (playerNum === 1) {
      if (player1Score > 0) setPlayer1Score(prev => prev - 1);
    } else {
      if (player2Score > 0) setPlayer2Score(prev => prev - 1);
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    if (newStatus === 'scheduled') {
      setPlayer1Score(0);
      setPlayer2Score(0);
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    
    // Snooker matches cannot end in a draw in standard bracket or round robin play
    if (status === 'completed' && player1Score === player2Score) {
      setErrorMsg('Snooker matches must have a clear winner. A draw is not permitted.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/matches/${match._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          player1Score,
          player2Score,
          status
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update match score');
      }

      console.log('Match successfully updated & broadcasted:', data.match);
      if (onScoreUpdated) {
        onScoreUpdated(data.match);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border-emerald-500/30 shadow-lg max-w-xl mx-auto">
      {/* Scorer Header */}
      <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold font-sans text-white">Live Match Scorer Console</h2>
          <p className="text-xs text-slate-400 mt-0.5">Round {match.round} • Match Fixture ID: {match._id.substring(18)}</p>
        </div>
        <button 
          onClick={onCancel}
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Cancel / Close
        </button>
      </div>

      {/* Match Status Controller Buttons */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Fixture Phase Status</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleStatusChange('scheduled')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
              status === 'scheduled'
                ? 'bg-slate-800 border-slate-650 text-slate-300'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            Scheduled
          </button>
          
          <button
            type="button"
            onClick={() => handleStatusChange('live')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
              status === 'live'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'
            }`}
          >
            <Play className="h-3.5 w-3.5 animate-pulse" />
            Go Live
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('completed')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
              status === 'completed'
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </button>
        </div>
      </div>

      {/* Frame Counter Scoring Board */}
      <div className="flex items-center justify-between gap-6 py-6 bg-slate-950/50 border border-slate-800 rounded-2xl px-6 mb-6">
        
        {/* Player 1 Console */}
        <div className="flex flex-col items-center flex-1">
          <span className="text-sm font-bold text-slate-200 truncate max-w-[120px] text-center mb-1">
            {match.player1Id?.name}
          </span>
          <span className="text-[10px] text-slate-400 mb-4">{match.player1Id?.club || 'Independent'}</span>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={player1Score <= 0}
              onClick={() => decrementScore(1)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <span className="text-4xl font-extrabold text-white w-12 text-center select-none font-mono">
              {player1Score}
            </span>
            <button
              type="button"
              onClick={() => incrementScore(1)}
              className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white shadow shadow-emerald-900/40 transition"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* VS Separator */}
        <div className="text-slate-650 text-xs font-bold uppercase tracking-wider">
          vs
        </div>

        {/* Player 2 Console */}
        <div className="flex flex-col items-center flex-1">
          <span className="text-sm font-bold text-slate-200 truncate max-w-[120px] text-center mb-1">
            {match.player2Id?.name}
          </span>
          <span className="text-[10px] text-slate-400 mb-4">{match.player2Id?.club || 'Independent'}</span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={player2Score <= 0}
              onClick={() => decrementScore(2)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <span className="text-4xl font-extrabold text-white w-12 text-center select-none font-mono">
              {player2Score}
            </span>
            <button
              type="button"
              onClick={() => incrementScore(2)}
              className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white shadow shadow-emerald-900/40 transition"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Error alert banner */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl text-xs bg-rose-500/10 border border-rose-500/25 text-rose-400 mb-4 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-semibold leading-normal">{errorMsg}</span>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
        >
          Cancel Changes
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex-1 btn-primary text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Broadcasting Live...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save & Broadcast Score
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MatchScorer;
