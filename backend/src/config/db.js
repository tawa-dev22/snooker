import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
      process.exit(1);
    }

    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Monitor connection events for production resiliency
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected. Retrying...');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB Active Connection Error: ${err}`);
});

export default connectDB;
