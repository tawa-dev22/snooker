import { useState, useEffect, useRef } from 'react';

import { API_BASE_URL } from '../utils/api';
const ENABLE_SSE = import.meta.env.VITE_ENABLE_SSE !== 'false';

/**
 * Custom React Hook for Real-Time Syncing of League Standings and Matches
 * Implements Path A (SSE) with a seamless fallback to Path B (5s Smart Polling)
 * 
 * @param {string} tournamentId 
 * @returns {Object} { standings, matches, loading, error, realTimeStatus, setMatches, fetchInitialData }
 */
export const useRealTimeSync = (tournamentId) => {
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realTimeStatus, setRealTimeStatus] = useState('connecting'); // 'connecting' | 'sse' | 'polling' | 'disconnected'

  const eventSourceRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Helper to fetch data via traditional REST endpoints
  const fetchInitialData = async () => {
    if (!tournamentId) return;
    try {
      setError(null);
      
      const [standingsRes, matchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/standings`),
        fetch(`${API_BASE_URL}/api/matches/tournament/${tournamentId}`)
      ]);

      if (!standingsRes.ok || !matchesRes.ok) {
        throw new Error('Failed to retrieve league dataset');
      }

      const standingsData = await standingsRes.json();
      const matchesData = await matchesRes.json();

      setStandings(standingsData);
      setMatches(matchesData);
    } catch (err) {
      console.error('Error fetching league dataset:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch to Path B: Polling Fallback
  const startPollingFallback = () => {
    if (pollingIntervalRef.current) return; // Already polling

    setRealTimeStatus('polling');
    console.log('Real-Time Sync: Activating Path B (5s Smart Polling Fallback)');

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const [standingsRes, matchesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/standings`),
          fetch(`${API_BASE_URL}/api/matches/tournament/${tournamentId}`)
        ]);

        if (standingsRes.ok && matchesRes.ok) {
          const standingsData = await standingsRes.json();
          const matchesData = await matchesRes.json();
          
          setStandings(standingsData);
          setMatches(matchesData);
        }
      } catch (err) {
        console.warn('Polling fallback encountered a fetch issue:', err.message);
      }
    }, 5000);
  };

  const stopPollingFallback = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      setStandings([]);
      setMatches([]);
      setRealTimeStatus('disconnected');
      return;
    }

    // 1. Load initial data
    fetchInitialData();

    // 2. Setup Real-time Connection Channel
    if (ENABLE_SSE) {
      console.log('Real-Time Sync: Initializing Path A (Server-Sent Events Stream)');
      
      try {
        const sseUrl = `${API_BASE_URL}/api/matches/live/stream`;
        const es = new EventSource(sseUrl, { withCredentials: false });
        eventSourceRef.current = es;

        es.onopen = () => {
          console.log('Real-Time Sync: SSE connection successfully established');
          setRealTimeStatus('sse');
          stopPollingFallback(); // Disable polling since stream is active
        };

        // Handle incoming broadcast events
        es.addEventListener('match_update', (event) => {
          try {
            const data = JSON.parse(event.data);
            const { match: updatedMatch, standings: updatedStandings } = data;

            console.log('Real-Time Sync: Match Score change received', updatedMatch);

            // Verify if the update belongs to our active tournament
            if (updatedMatch.tournamentId === tournamentId) {
              // 1. Update the standings table
              if (updatedStandings) {
                setStandings(updatedStandings);
              }

              // 2. Update matches grid
              setMatches((prevMatches) =>
                prevMatches.map((m) => (m._id === updatedMatch._id ? updatedMatch : m))
              );
            }
          } catch (parseErr) {
            console.error('Error parsing broadcast stream data:', parseErr);
          }
        });

        es.onerror = (err) => {
          console.warn('Real-Time Sync: SSE connection dropped or blocked. Error:', err);
          es.close();
          setRealTimeStatus('disconnected');
          // Instantly active polling fallback
          startPollingFallback();
        };

      } catch (sseInitErr) {
        console.error('Failed to instantiate EventSource:', sseInitErr);
        startPollingFallback();
      }
    } else {
      // SSE explicitly disabled, default to polling
      startPollingFallback();
    }

    // Cleanup channels on hook unmount or tournament change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopPollingFallback();
    };
  }, [tournamentId]);

  return {
    standings,
    matches,
    loading,
    error,
    realTimeStatus,
    setMatches,
    fetchInitialData
  };
};
