import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';
import Player from './models/Player.js';
import Tournament from './models/Tournament.js';
import Match from './models/Match.js';

dotenv.config();

const playersSeed = [
  { name: "Ronnie O'Sullivan", club: "Chigwell Snooker Club", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Ronnie" },
  { name: "Judd Trump", club: "Bristol Snooker Centre", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Judd" },
  { name: "Mark Selby", club: "Leicester Snooker Academy", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Mark" },
  { name: "Neil Robertson", club: "Melbourne Snooker Hall", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Neil" },
  { name: "John Higgins", club: "Glasgow Snooker Club", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=John" },
  { name: "Kyren Wilson", club: "Kettering Snooker Academy", avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Kyren" }
];

const seedDatabase = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      console.error('MONGODB_URI not defined in environment variables.');
      process.exit(1);
    }

    console.log('Connecting to database for seeding...');
    await mongoose.connect(connStr);

    // 1. Clean existing records (optional, but good for clean initial test runs)
    console.log('Clearing old collections...');
    await User.deleteMany({});
    await Player.deleteMany({});
    await Tournament.deleteMany({});
    await Match.deleteMany({});

    // 2. Seed Admin User
    console.log('Seeding Admin User...');
    const adminUser = new User({
      username: 'admin',
      password: 'password123',
      role: 'admin'
    });
    await adminUser.save();
    console.log('Admin user created successfully! Username: admin, Password: password123');

    // 3. Seed Players
    console.log('Seeding Players...');
    const insertedPlayers = await Player.insertMany(playersSeed);
    console.log(`${insertedPlayers.length} players seeded successfully.`);

    // 4. Create Draft Tournament
    console.log('Creating Initial Tournament...');
    const playerIds = insertedPlayers.map(p => p._id);
    const tournament = new Tournament({
      name: 'Championship Premier League Snooker',
      season: '2026/27',
      pointsForWin: 3,
      pointsForLoss: 0,
      doubleRoundRobin: true,
      players: playerIds,
      status: 'draft'
    });
    await tournament.save();
    console.log('Draft tournament created. Fixtures ready to be generated in admin dashboard.');

    console.log('=========================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('You can now start the backend and frontend dev servers.');
    console.log('=========================================');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
