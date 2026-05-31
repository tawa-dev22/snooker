import express from 'express';
import { matchController } from '../controllers/matchController.js';
import { sseManager } from '../config/sse.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/matches/live/stream
 * @desc Server-Sent Events live dashboard observer registration endpoint
 */
router.get('/live/stream', (req, res) => {
  sseManager.addClient(req, res);
});

/**
 * @route GET /api/matches/tournament/:tournamentId
 * @desc Fetch matches/fixtures for a specific tournament (optional ?round filter)
 */
router.get('/tournament/:tournamentId', matchController.listMatches);

/**
 * @route PUT /api/matches/:id
 * @desc Edit live score/finalization details for a match (Admin only)
 */
router.put('/:id', requireAuth, requireAdmin, matchController.updateMatchScore);

/**
 * @route GET /api/players
 * @desc List all players registered in the system
 */
router.get('/players', matchController.listPlayers);

/**
 * @route POST /api/players
 * @desc Register a new player (Admin only)
 */
router.post('/players', requireAuth, requireAdmin, matchController.createPlayer);

export default router;
