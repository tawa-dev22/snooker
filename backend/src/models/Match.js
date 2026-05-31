import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament reference is required'],
      index: true,
    },
    player1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player 1 is required'],
    },
    player2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player 2 is required'],
    },
    player1Score: {
      type: Number,
      default: 0,
      min: [0, 'Score cannot be negative'],
    },
    player2Score: {
      type: Number,
      default: 0,
      min: [0, 'Score cannot be negative'],
    },
    round: {
      type: Number,
      required: [true, 'Gameweek / Round number is required'],
      min: [1, 'Round number must be at least 1'],
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'live', 'completed'],
        message: '{VALUE} is not a valid match status. Must be scheduled, live, or completed.',
      },
      default: 'scheduled',
      index: true,
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    scheduledTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexing strategy:
// 1. Speeds up standings calculations filtering by tournament
// 2. Helps queries finding all games for a specific round in a tournament
matchSchema.index({ tournamentId: 1, round: 1 });
matchSchema.index({ tournamentId: 1, status: 1 });
matchSchema.index({ player1Id: 1, player2Id: 1 });

const Match = mongoose.model('Match', matchSchema);
export default Match;
