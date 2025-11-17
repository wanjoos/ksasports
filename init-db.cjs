// Initialize local D1 database with migrations
const fs = require('fs');
const path = require('path');
const sqlite3 = require('better-sqlite3');

// Wait for wrangler to create the database file
setTimeout(() => {
  const wranglerDir = path.join(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  
  if (!fs.existsSync(wranglerDir)) {
    console.log('Wrangler DB directory not found yet, waiting...');
    process.exit(1);
  }
  
  // Find the SQLite file
  const files = fs.readdirSync(wranglerDir);
  const dbFile = files.find(f => f.endsWith('.sqlite'));
  
  if (!dbFile) {
    console.log('No SQLite file found yet');
    process.exit(1);
  }
  
  const dbPath = path.join(wranglerDir, dbFile);
  console.log('Found database:', dbPath);
  
  // Open database
  const db = sqlite3(dbPath);
  
  // Check if tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Existing tables:', tables.map(t => t.name));
  
  if (tables.length === 0 || !tables.find(t => t.name === 'users')) {
    console.log('Applying migrations...');
    
    // Read migration file
    const migration = fs.readFileSync(path.join(__dirname, 'migrations/0001_initial_schema.sql'), 'utf8');
    
    // Execute migration
    db.exec(migration);
    
    // Verify
    const newTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables after migration:', newTables.map(t => t.name));
    console.log('✓ Migration applied successfully!');
  } else {
    console.log('✓ Tables already exist');
  }
  
  db.close();
}, 2000);
