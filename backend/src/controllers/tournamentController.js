import Tournament from '../models/Tournament.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import mongoose from 'mongoose';

/**
 * Helper to generate Round Robin pairings (Circle Rotation Algorithm)
 * Handles odd numbers of players by adding a virtual "BYE" player
 */
const generateRoundRobinPairings = (playerIds, doubleRoundRobin = true) => {
  const list = [...playerIds];
  if (list.length % 2 !== 0) {
    list.push(null); // Virtual BYE player
  }

  const numPlayers = list.length;
  const numRounds = numPlayers - 1;
  const half = numPlayers / 2;
  const fixtures = [];

  for (let r = 0; r < numRounds; r++) {
    const roundFixtures = [];
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[numPlayers - 1 - i];

      // Exclude matches involving the virtual BYE player
      if (home !== null && away !== null) {
        roundFixtures.push({ home, away });
      }
    }
    fixtures.push({ round: r + 1, matches: roundFixtures });

    // Rotate array: keep first fixed, rotate others clockwise
    list.splice(1, 0, list.pop());
  }

  // If double round-robin, swap home/away and append as second half of the season
  if (doubleRoundRobin) {
    const secondHalf = [];
    const rotationOffset = numRounds;
    fixtures.forEach((roundObj) => {
      const swappedMatches = roundObj.matches.map((m) => ({
        home: m.away,
        away: m.home,
      }));
      secondHalf.push({
        round: roundObj.round + rotationOffset,
        matches: swappedMatches,
      });
    });
    fixtures.push(...secondHalf);
  }

  return fixtures;
};

export const tournamentController = {
  /**
   * Create a new tournament / league draft
   */
  async createTournament(req, res) {
    try {
      const { name, season, pointsForWin, pointsForLoss, doubleRoundRobin, playerIds } = req.body;

      if (!name || !season) {
        return res.status(400).json({ error: 'Name and season are required.' });
      }

      const tournament = new Tournament({
        name,
        season,
        pointsForWin: pointsForWin ?? 3,
        pointsForLoss: pointsForLoss ?? 0,
        doubleRoundRobin: doubleRoundRobin ?? true,
        players: playerIds ?? [],
      });

      await tournament.save();
      res.status(201).json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * List all tournaments
   */
  async listTournaments(req, res) {
    try {
      const tournaments = await Tournament.find().populate('players').sort({ createdAt: -1 });
      res.json(tournaments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Get single tournament details
   */
  async getTournamentDetails(req, res) {
    try {
      const tournament = await Tournament.findById(req.params.id).populate('players');
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Add players to a draft tournament
   */
  async registerPlayers(req, res) {
    try {
      const { playerIds } = req.body;
      const tournament = await Tournament.findById(req.params.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: 'Cannot add players to an active or completed tournament' });
      }

      tournament.players = playerIds;
      await tournament.save();

      const updatedTournament = await Tournament.findById(tournament._id).populate('players');
      res.json(updatedTournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Generate fixtures & activate the tournament
   */
  async generateFixtures(req, res) {
    try {
      const tournament = await Tournament.findById(req.params.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: 'Fixtures have already been generated' });
      }
      if (tournament.players.length < 2) {
        return res.status(400).json({ error: 'A tournament must have at least 2 players' });
      }

      // Generate pairings
      const pairings = generateRoundRobinPairings(tournament.players, tournament.doubleRoundRobin);

      const matchesToSave = [];
      pairings.forEach((roundObj) => {
        roundObj.matches.forEach((m) => {
          matchesToSave.push({
            tournamentId: tournament._id,
            player1Id: m.home,
            player2Id: m.away,
            round: roundObj.round,
            player1Score: 0,
            player2Score: 0,
            status: 'scheduled',
          });
        });
      });

      // Bulk insert matches
      await Match.insertMany(matchesToSave);

      // Change status to active
      tournament.status = 'active';
      await tournament.save();

      res.json({
        message: `Fixtures generated. ${matchesToSave.length} matches scheduled successfully.`,
        tournament,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Calculate standings table using aggregated MongoDB pipeline & Head-to-Head resolving
   */
  async getStandings(req, res) {
    try {
      const tournamentId = req.params.id;
      const tournamentObj = await Tournament.findById(tournamentId);
      if (!tournamentObj) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Aggregation Pipeline
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

      // Fetch all completed matches to do Head-to-Head resolving if there are ties
      const completedMatches = await Match.find({ tournamentId, status: 'completed' });

      // Sort standing records
      const sortedStandings = standings.sort((a, b) => {
        // 1. Points (descending)
        if (b.Points !== a.Points) return b.Points - a.Points;

        // 2. Frame Difference (descending)
        if (b.FrameDifference !== a.FrameDifference) return b.FrameDifference - a.FrameDifference;

        // 3. Total Frames Won (descending)
        if (b.TotalFramesWon !== a.TotalFramesWon) return b.TotalFramesWon - a.TotalFramesWon;

        // 4. Head-to-Head
        const matchesBetween = completedMatches.filter(
          (m) =>
            (m.player1Id.toString() === a.playerId.toString() && m.player2Id.toString() === b.playerId.toString()) ||
            (m.player1Id.toString() === b.playerId.toString() && m.player2Id.toString() === a.playerId.toString())
        );

        let aWins = 0;
        let bWins = 0;

        matchesBetween.forEach((m) => {
          const p1 = m.player1Id.toString();
          const score1 = m.player1Score;
          const score2 = m.player2Score;

          if (score1 > score2) {
            if (p1 === a.playerId.toString()) aWins++;
            else bWins++;
          } else if (score2 > score1) {
            if (p1 === b.playerId.toString()) aWins++;
            else bWins++;
          }
        });

        if (bWins !== aWins) return bWins - aWins;

        // 5. Secondary fallback: Alphabetical
        return a.name.localeCompare(b.name);
      });

      // Add Position (Pos) field to standings
      const finalStandings = sortedStandings.map((item, idx) => ({
        Pos: idx + 1,
        ...item,
      }));

      res.json(finalStandings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};
