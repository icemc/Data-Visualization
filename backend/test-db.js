const duckdb = require('duckdb');
const path = require('path');

const dbPath = path.join(__dirname, '../data/economic.duckdb');

console.log('Testing DuckDB connection...');
console.log('Database path:', dbPath);

try {
  const db = new duckdb.Database(dbPath, duckdb.OPEN_READONLY);
  const conn = db.connect();
  
  console.log('Database connected successfully');
  
  // Test a simple query
  conn.all("SELECT name FROM sqlite_master WHERE type='table' LIMIT 5;", (err, rows) => {
    if (err) {
      console.error('Query error:', err);
    } else {
      console.log('Tables found:', rows);
    }
    
    // Test our specific tables
    conn.all("SHOW TABLES;", (err2, tables) => {
      if (err2) {
        console.error('SHOW TABLES error:', err2);
      } else {
        console.log('All tables:', tables);
      }
      
      // Clean up
      conn.close();
      db.close();
      console.log('Test completed');
    });
  });
  
} catch (error) {
  console.error('Connection error:', error);
}