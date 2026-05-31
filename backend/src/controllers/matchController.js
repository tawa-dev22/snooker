import Match from '../models/Match.js';
import Tournament from '../models/Tournament.js';
import { sseManager } from '../config/sse.js';
import mongoose from 'mongoose';

// Helper to compute standings inside controller for broadcasting
const fetchCalculatedStandings = async (tournamentId) => {
  const standings = await Tournament.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(tournamentId) } },
    { $unwind: '$players' },
    {
      $lookup: {
        from: 'players',
        localField: 'players',
        foreignField: '_id',
        as: 'playerInfo',
      },
    },
    { $unwind: '$playerInfo' },
    {
      $lookup: {
        from: 'matches',
        let: { playerId: '$players', tId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tournamentId', '$$tId'] },
                  { $eq: ['$status', 'completed'] },
                  {
                    $or: [
                      { $eq: ['$player1Id', '$$playerId'] },
                      { $eq: ['$player2Id', '$$playerId'] },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: 'playerMatches',
      },
    },
    {
      $project: {
        _id: 0,
        playerId: '$players',
        name: '$playerInfo.name',
        club: '$playerInfo.club',
        avatarUrl: '$playerInfo.avatarUrl',
        pointsForWin: '$pointsForWin',
        pointsForLoss: '$pointsForLoss',
        matches: {
          $map: {
            input: '$playerMatches',
            as: 'm',
            in: {
              isPlayer1: { $eq: ['$$m.player1Id', '$players'] },
              playerScore: {
                $cond: [{ $eq: ['$$m.player1Id', '$players'] }, '$$m.player1Score', '$$m.player2Score'],
              },
              opponentScore: {
                $cond: [{ $eq: ['$$m.player1Id', '$players'] }, '$$m.player2Score', '$$m.player1Score'],
              },
            },
          },
        },
      },
    },
    {
      $project: {
        playerId: 1,
        name: 1,
        club: 1,
        avatarUrl: 1,
        Played: { $size: '$matches' },
        Won: {
          $size: {
            $filter: {
              input: '$matches',
              as: 'm',
              cond: { $gt: ['$$m.playerScore', '$$m.opponentScore'] },
            },
          },
        },
        Lost: {
          $size: {
            $filter: {
              input: '$matches',
              as: 'm',
              cond: { $lt: ['$$m.playerScore', '$$m.opponentScore'] },
            },
          },
        },
        framesWon: { $sum: '$matches.playerScore' },
        framesLost: { $sum: '$matches.opponentScore' },
        pointsForWin: 1,
        pointsForLoss: 1,
      },
    },
    {
      $project: {
        playerId: 1,
        name: 1,
        club: 1,
        avatarUrl: 1,
        Played: 1,
        Won: 1,
        Lost: 1,
        FrameDifference: { $subtract: ['$framesWon', '$framesLost'] },
        TotalFramesWon: '$framesWon',
        Points: {
          $add: [
            { $multiply: ['$Won', '$pointsForWin'] },
            { $multiply: ['$Lost', '$pointsForLoss'] },
          ],
        },
      },
    },
  ]);

  const completedMatches = await Match.find({ tournamentId, status: 'completed' });

  const sortedStandings = standings.sort((a, b) => {
    if (b.Points !== a.Points) return b.Points - a.Points;
    if (b.FrameDifference !== a.FrameDifference) return b.FrameDifference - a.FrameDifference;
    if (b.TotalFramesWon !== a.TotalFramesWon) return b.TotalFramesWon - a.TotalFramesWon;

    // H2H
    const matchesBetween = completedMatches.filter(
      (m) =>
        (m.player1Id.toString() === a.playerId.toString() && m.player2Id.toString() === b.playerId.toString()) ||
        (m.player1Id.toString() === b.playerId.toString() && m.player2Id.toString() === a.playerId.toString())
    );

    let aWins = 0;
    let bWins = 0;
    matchesBetween.forEach((m) => {
      const p1 = m.player1Id.toString();
      if (m.player1Score > m.player2Score) {
        if (p1 === a.playerId.toString()) aWins++;
        else bWins++;
      } else if (m.player2Score > m.player1Score) {
        if (p1 === b.playerId.toString()) aWins++;
        else bWins++;
      }
    });

    if (bWins !== aWins) return bWins - aWins;
    return a.name.localeCompare(b.name);
  });

  return sortedStandings.map((item, idx) => ({
    Pos: idx + 1,
    ...item,
  }));
};

export const matchController = {
  /**
   * List all matches for a tournament, optionally filtered by Round
   */
  async listMatches(req, res) {
    try {
      const { tournamentId } = req.params;
      const { round } = req.query;

      const filter = { tournamentId };
      if (round) {
        filter.round = parseInt(round, 10);
      }

      const matches = await Match.find(filter)
        .populate('player1Id')
        .populate('player2Id')
        .populate('winnerId')
        .sort({ round: 1, scheduledTime: 1 });

      res.json(matches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Update match frame scores and status (Scheduled -> Live -> Completed)
   * Instant broadcast on score change
   */
  async updateMatchScore(req, res) {
    try {
      const { id } = req.params;
      const { player1Score, player2Score, status } = req.body;

      const match = await Match.findById(id);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Prohibit changing a tournament match that has been completed unless explicitly changing the score again
      if (player1Score !== undefined) match.player1Score = parseInt(player1Score, 10);
      if (player2Score !== undefined) match.player2Score = parseInt(player2Score, 10);
      if (status !== undefined) match.status = status;

      // Handle match finalization logic
      if (match.status === 'completed') {
        if (match.player1Score > match.player2Score) {
          match.winnerId = match.player1Id;
        } else if (match.player2Score > match.player1Score) {
          match.winnerId = match.player2Id;
        } else {
          // Snooker matches must have a winner (no draws in standard tournament play)
          return res.status(400).json({ error: 'Snooker matches cannot end in a draw. Must determine a winner.' });
        }
      } else {
        match.winnerId = null; // Reset winner if status changes back
      }

      await match.save();

      // Retrieve full match details with populated players
      const populatedMatch = await Match.findById(match._id)
        .populate('player1Id')
        .populate('player2Id')
        .populate('winnerId');

      // Fetch the updated standings table
      const updatedStandings = await fetchCalculatedStandings(match.tournamentId);

      // Broadcast changes to all connected SSE clients instantly
      sseManager.broadcast('match_update', {
        match: populatedMatch,
        standings: updatedStandings,
      });

      res.json({
        message: 'Match score updated successfully.',
        match: populatedMatch,
        standings: updatedStandings,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Quick player registrations helper for the backend setup
   */
  async createPlayer(req, res) {
    try {
      const { name, club, avatarUrl } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Player name is required.' });
      }

      const player = new Player({ name, club, avatarUrl });
      await player.save();
      res.status(201).json(player);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ error: 'A player with this name already exists.' });
      }
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * List all registered players in the system
   */
  async listPlayers(req, res) {
    try {
      const players = await Player.find().sort({ name: 1 });
      res.json(players);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};
