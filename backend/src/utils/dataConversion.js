/**
 * Utility functions for data conversion and formatting
 */

/**
 * Convert BigInt values to numbers for JSON serialization
 * @param {any} obj - Object to convert
 * @returns {any} Object with BigInt values converted to numbers
 */
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  
  return obj;
}

module.exports = {
  convertBigIntToNumber
};