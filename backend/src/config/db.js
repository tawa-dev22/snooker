import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Cloud environment variable injects MONGO_URI
    const connStr = process.env.MONGO_URI;
    if (!connStr) {
      console.error('CRITICAL: MONGO_URI is not defined in environment variables.');
      process.exit(1);
    }

    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error during startup: ${error.message}`);
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
