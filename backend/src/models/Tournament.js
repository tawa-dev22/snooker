import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
    },
    season: {
      type: String,
      required: [true, 'Season label is required (e.g. 2026/27)'],
      trim: true,
      default: '2026/27',
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'completed'],
        message: '{VALUE} is not a valid tournament status. Must be draft, active, or completed.',
      },
      default: 'draft',
    },
    pointsForWin: {
      type: Number,
      default: 3,
      min: [0, 'Points for a win cannot be negative'],
    },
    pointsForLoss: {
      type: Number,
      default: 0,
      min: [0, 'Points for a loss cannot be negative'],
    },
    doubleRoundRobin: {
      type: Boolean,
      default: true,
      description: 'If true, play each other twice (Home & Away). If false, play once.',
    },
    players: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for lightning-fast listings of leagues by season and status
tournamentSchema.index({ season: 1, status: 1 });

const Tournament = mongoose.model('Tournament', tournamentSchema);
export default Tournament;
