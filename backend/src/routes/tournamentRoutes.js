import express from 'express';
import { tournamentController } from '../controllers/tournamentController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/tournaments
 * @desc Get all tournaments
 */
router.get('/', tournamentController.listTournaments);

/**
 * @route POST /api/tournaments
 * @desc Create new tournament (Admin only)
 */
router.post('/', requireAuth, requireAdmin, tournamentController.createTournament);

/**
 * @route GET /api/tournaments/:id
 * @desc Get single tournament profile
 */
router.get('/:id', tournamentController.getTournamentDetails);

/**
 * @route POST /api/tournaments/:id/players
 * @desc Associate players to a draft tournament (Admin only)
 */
router.post('/:id/players', requireAuth, requireAdmin, tournamentController.registerPlayers);

/**
 * @route POST /api/tournaments/:id/fixtures
 * @desc Generate fixtures & activate tournament (Admin only)
 */
router.post('/:id/fixtures', requireAuth, requireAdmin, tournamentController.generateFixtures);

/**
 * @route GET /api/tournaments/:id/standings
 * @desc Compute the EPL standing table (Real-time aggregation pipeline)
 */
router.get('/:id/standings', tournamentController.getStandings);

export default router;
