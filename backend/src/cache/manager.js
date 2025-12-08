const redis = require('redis');

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes default cache time
    
    this.connect();
  }

  async connect() {
    try {
      if (process.env.REDIS_URL) {
        this.client = redis.createClient({
          url: process.env.REDIS_URL
        });
      } else {
        this.client = redis.createClient({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        });
      }

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.warn('Redis connection failed, falling back to in-memory cache:', error.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key from request parameters
   * @param {string} prefix - Key prefix (e.g., 'business', 'financial')
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   */
  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, data, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cached data with a specific prefix
   * @param {string} prefix - Key prefix to clear
   * @returns {Promise<boolean>} Success status
   */
  async clearPrefix(prefix) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const keys = await this.client.keys(`${prefix}:*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache clear prefix error:', error);
      return false;
    }
  }

  /**
   * Check if cache is available
   * @returns {boolean} Cache availability status
   */
  isAvailable() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Close cache connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      console.log('Cache connection closed');
    }
  }
}

// Singleton instance
let cacheInstance = null;

/**
 * Get cache instance (singleton pattern)
 * @returns {CacheManager} Cache manager instance
 */
function getCache() {
  if (!cacheInstance) {
    cacheInstance = new CacheManager();
  }
  return cacheInstance;
}

module.exports = {
  CacheManager,
  getCache
};