import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Settings, ShieldCheck, LogIn, LogOut, Loader2, Sparkles, RefreshCcw } from 'lucide-react';
import LiveStandingsTable from './components/LiveStandingsTable';
import FixturesGrid from './components/FixturesGrid';
import TournamentCreator from './components/TournamentCreator';
import MatchScorer from './components/MatchScorer';
import { useRealTimeSync } from './hooks/useRealTimeSync';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('standings'); // 'standings' | 'fixtures' | 'admin'
  
  // Tournament lists & selection
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [loadingLeagues, setLoadingLeagues] = useState(true);

  // Authentication session
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [username, setUsername] = useState(localStorage.getItem('admin_username') || '');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Live Match Scorer modal trigger
  const [activeScoringMatch, setActiveScoringMatch] = useState(null);

  // Load available leagues/tournaments initially
  const fetchLeagues = async (autoSelectId = '') => {
    try {
      setLoadingLeagues(true);
      const res = await fetch(`${API_BASE_URL}/api/tournaments`);
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
        
        if (data.length > 0) {
          // If we passed an autoSelectId, choose it. Otherwise select the latest
          if (autoSelectId) {
            setSelectedTournamentId(autoSelectId);
          } else if (!selectedTournamentId) {
            setSelectedTournamentId(data[0]._id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load tournaments list:', err);
    } finally {
      setLoadingLeagues(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, []);

  // Hook up our real-time sync stream for the selected tournament
  const { 
    standings, 
    matches, 
    loading: datasetLoading, 
    error: datasetError, 
    realTimeStatus,
    fetchInitialData 
  } = useRealTimeSync(selectedTournamentId);

  // Admin login trigger
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoggingIn(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save credentials in session storage
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_username', data.user.username);
      
      setToken(data.token);
      setUsername(data.user.username);
      setLoginUser('');
      setLoginPass('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  // Sign out trigger
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    setToken('');
    setUsername('');
  };

  // After scoring completes, close Scorer overlay
  const handleScoreUpdated = () => {
    setActiveScoringMatch(null);
  };

  const handleLeagueCreated = (newId) => {
    fetchLeagues(newId);
    setActiveTab('standings');
  };

  const currentLeagueName = tournaments.find(t => t._id === selectedTournamentId)?.name || 'Championship League';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-emerald-700 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Main Broadcast Header */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-950/30">
              <span className="text-xl">🎱</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight font-sans text-white flex items-center gap-1.5">
                Championship Snooker
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  EPL-Style
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Real-Time Tournament & standings Manager</p>
            </div>
          </div>

          {/* Tournament Selection Dropdown selector */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {loadingLeagues ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : tournaments.length === 0 ? (
              <span className="text-xs text-slate-400">No active leagues</span>
            ) : (
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500 transition cursor-pointer flex-1 sm:flex-initial"
              >
                {tournaments.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.season})
                  </option>
                ))}
              </select>
            )}

            {/* Quick Admin Profile Tag */}
            {token && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-300 truncate max-w-[80px]" title={username}>
                  {username}
                </span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Navigation Sub-header Tabs */}
      <div className="border-b border-slate-900/60 bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('standings')}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                activeTab === 'standings'
                  ? 'border-emerald-500 text-white font-extrabold bg-slate-900/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Live Standings
            </button>

            <button
              onClick={() => setActiveTab('fixtures')}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                activeTab === 'fixtures'
                  ? 'border-emerald-500 text-white font-extrabold bg-slate-900/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Fixtures & Results
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                activeTab === 'admin'
                  ? 'border-emerald-500 text-white font-extrabold bg-slate-900/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="h-4 w-4" />
              Admin Portal
            </button>
          </div>
        </div>
      </div>

      {/* Main Page Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* If live scorer modal overlay is active, render it */}
        {activeScoringMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto py-8">
            <div className="w-full max-w-xl animate-scale-in">
              <MatchScorer
                match={activeScoringMatch}
                token={token}
                onScoreUpdated={handleScoreUpdated}
                onCancel={() => setActiveScoringMatch(null)}
              />
            </div>
          </div>
        )}

        {/* Dynamic content sections */}
        {loadingLeagues || datasetLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Retrieving League Statistics...</span>
          </div>
        ) : datasetError ? (
          <div className="glass-card rounded-2xl p-8 text-center border-rose-500/20 max-w-lg mx-auto">
            <div className="text-rose-400 text-3xl mb-3">⚠️</div>
            <h3 className="text-base font-bold text-white mb-2">Failed to retrieve data</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">{datasetError}</p>
            <button
              onClick={fetchInitialData}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition inline-flex items-center gap-1.5"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry Connection
            </button>
          </div>
        ) : (
          <div>
            {/* TAB 1: Live EPL Standings Table */}
            {activeTab === 'standings' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans">
                      {currentLeagueName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Live standings auto-computed from match logs.</p>
                  </div>
                </div>
                
                <LiveStandingsTable
                  standings={standings}
                  realTimeStatus={realTimeStatus}
                  onRefresh={fetchInitialData}
                />
              </div>
            )}

            {/* TAB 2: Grouped Fixtures Grid */}
            {activeTab === 'fixtures' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans">
                    Matches Schedule
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Select a gameweek to view scoreboards and upcoming schedule pairings.</p>
                </div>

                <FixturesGrid
                  matches={matches}
                  isAdmin={!!token}
                  onEditMatch={(match) => setActiveScoringMatch(match)}
                />
              </div>
            )}

            {/* TAB 3: Secure Admin Portal */}
            {activeTab === 'admin' && (
              <div>
                {!token ? (
                  /* Authentication login Gateway */
                  <div className="max-w-md mx-auto glass-card rounded-2xl p-6 border-emerald-500/20">
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                        <LogIn className="h-6 w-6 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Administrator Gateway</h2>
                      <p className="text-xs text-slate-400 mt-1">Sign in to schedule fixtures and submit live match scores.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                        <input
                          type="text"
                          value={loginUser}
                          onChange={(e) => setLoginUser(e.target.value)}
                          placeholder="e.g. admin"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                        <input
                          type="password"
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition"
                          required
                        />
                      </div>

                      {authError && (
                        <p className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                          ⚠️ {authError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={loggingIn}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                      >
                        {loggingIn ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying Credentials...
                          </>
                        ) : (
                          <>
                            <LogIn className="h-4 w-4" />
                            Sign In to Dashboard
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Admin Panel Contents */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                        <div>
                          <h3 className="text-sm font-bold text-white">Administrative Actions Unlocked</h3>
                          <p className="text-[10px] text-slate-400">Authenticated as: <span className="font-semibold text-emerald-400">{username}</span></p>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-rose-400 border border-slate-850 transition rounded-xl text-xs font-bold"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>

                    <TournamentCreator 
                      token={token} 
                      onTournamentCreated={handleLeagueCreated} 
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Broadcast Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          <p>© 2026 Championship Snooker Association. Structured structurally after the English Premier League (EPL).</p>
          <p className="mt-1.5 text-[10px] text-slate-600">Built using React (Vite) + Tailwind CSS + Node.js/Express + MongoDB. Engineered by Antigravity.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
