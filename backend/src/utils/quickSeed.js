import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const basicUsers = [
  {
    name: 'Admin User',
    email: 'admin@resumerag.com',
    password: 'admin123',
    role: 'admin',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'Sarah Mitchell',
    email: 'recruiter@resumerag.com',
    password: 'test123',
    role: 'recruiter',
    company: 'TechCorp Inc.',
    phone: '+1-555-0123',
    isActive: true,
    emailVerified: true
  },
  {
    name: 'John Candidate',
    email: 'candidate@resumerag.com',
    password: 'test123',
    role: 'candidate',
    isActive: true,
    emailVerified: true
  }
];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB for quick seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function quickSeed() {
  try {
    console.log('🌱 Quick seeding basic users...');
    
    await connectDB();

    // Create users
    console.log('👥 Creating users...');
    
    for (const userData of basicUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`⏩ User already exists: ${userData.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });
      console.log(`✅ Created user: ${user.name} (${user.role}) - ${user.email}`);
    }

    console.log(`\n🎉 Quick seeding completed successfully!`);
    console.log(`\n🔑 Test Credentials:`);
    console.log(`   Admin: admin@resumerag.com / admin123`);
    console.log(`   Recruiter: recruiter@resumerag.com / test123`);
    console.log(`   Candidate: candidate@resumerag.com / test123`);

  } catch (error) {
    console.error('❌ Quick seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  quickSeed();
}

export default quickSeed;