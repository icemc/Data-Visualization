const duckdb = require('duckdb');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/economic.duckdb');
    this.db = null;
    this.connection = null;
    this.connectionPromise = null;
    this.isConnecting = false;
    this.connect();
  }

  async connect() {
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.isConnecting = true;
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Close existing connections
        if (this.connection) {
          try {
            this.connection.close();
          } catch (err) {
            console.log('Error closing existing connection:', err.message);
          }
        }
        if (this.db) {
          try {
            this.db.close();
          } catch (err) {
            console.log('Error closing existing database:', err.message);
          }
        }

        // Create new database and connection
        this.db = new duckdb.Database(this.dbPath, duckdb.OPEN_READONLY, (err) => {
          if (err) {
            console.error('Failed to open DuckDB:', err);
            this.isConnecting = false;
            reject(err);
            return;
          }

          this.connection = this.db.connect();
          
          // Set connection options to avoid transaction conflicts
          this.connection.run("SET autocommit = true", (err) => {
            if (err) {
              console.log('Warning: Could not set autocommit:', err.message);
            }
          });
          
          console.log(`Connected to DuckDB at: ${this.dbPath}`);
          this.isConnecting = false;
          resolve();
        });
      } catch (error) {
        console.error('Failed to connect to DuckDB:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
    
    return this.connectionPromise;
  }

  async ensureConnection() {
    if (!this.connection || !this.db) {
      console.log('Reconnecting to DuckDB...');
      await this.connect();
    }
  }

  /**
   * Execute a query and return results
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(query, params = []) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      if (!this.connection) {
        reject(new Error('No database connection available'));
        return;
      }

      // Add a small delay between queries to avoid transaction conflicts
      setTimeout(() => {
        try {
          // Use the all method with proper parameter passing
          if (params && params.length > 0) {
            this.connection.all(query, params, (err, rows) => {
              this.handleQueryResult(err, rows, resolve, reject, query, params);
            });
          } else {
            this.connection.all(query, (err, rows) => {
              this.handleQueryResult(err, rows, resolve, reject, query, params);
            });
          }
        } catch (error) {
          console.error('Query execution error:', error);
          reject(error);
        }
      }, 10); // 10ms delay
    });
  }

  handleQueryResult(err, rows, resolve, reject, query, params) {
    if (err) {
      console.error('Database query error:', err);
      
      // Try to reconnect on connection errors
      if (err.code === 'DUCKDB_NODEJS_ERROR' && err.errorType === 'Connection') {
        console.log('Attempting to reconnect to database...');
        this.connect()
          .then(() => {
            // Retry the query once
            if (params && params.length > 0) {
              this.connection.all(query, params, (retryErr, retryRows) => {
                if (retryErr) {
                  console.error('Retry query failed:', retryErr);
                  reject(retryErr);
                } else {
                  resolve(retryRows || []);
                }
              });
            } else {
              this.connection.all(query, (retryErr, retryRows) => {
                if (retryErr) {
                  console.error('Retry query failed:', retryErr);
                  reject(retryErr);
                } else {
                  resolve(retryRows || []);
                }
              });
            }
          })
          .catch(reconnectErr => {
            console.error('Reconnection failed:', reconnectErr);
            reject(err);
          });
      } else {
        reject(err);
      }
    } else {
      resolve(rows || []);
    }
  }

  /**
   * Execute a query and return a single row
   * @param {string} query - SQL query to execute
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single row result
   */
  async queryOne(query, params = []) {
    const results = await this.query(query, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Check if database connection is healthy
   * @returns {Promise<boolean>} Connection status
   */
  async healthCheck() {
    try {
      await this.query('SELECT 1 as health');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get list of available tables
   * @returns {Promise<Array>} List of table names
   */
  async getTables() {
    try {
      const results = await this.query(`
        SELECT table_name, table_schema 
        FROM information_schema.tables 
        WHERE table_schema IN ('business', 'financial', 'employment', 'summaries')
        ORDER BY table_schema, table_name
      `);
      return results;
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  close() {
    try {
      if (this.connection) {
        this.connection.close();
        this.connection = null;
      }
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Singleton instance
let dbInstance = null;

/**
 * Get database instance (singleton pattern)
 * @returns {DatabaseManager} Database manager instance
 */
function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
}

module.exports = {
  DatabaseManager,
  getDatabase
};