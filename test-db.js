// Simple database test script
import { database } from './lib/database.js';
import { profile, projects } from './schema.js';

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    // Test profile table
    const profiles = await database.select().from(profile);
    console.log('Profiles found:', profiles.length);
    
    // Test projects table
    const projectCount = await database.select().from(projects);
    console.log('Projects found:', projectCount.length);
    
    console.log('Database connection successful!');
  } catch (error) {
    console.error('Database error:', error);
  }
}

testDB();
