import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Player name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    club: {
      type: String,
      trim: true,
      default: 'Independent',
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Optimize queries listing players

const Player = mongoose.model('Player', playerSchema);
export default Player;
