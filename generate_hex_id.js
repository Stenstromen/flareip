const fs = require('fs');

/**
 * Generate a random 4-character hex ID
 * @returns {string} 4-character hex string
 */
function generateHexId() {
  return Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
}

/**
 * Check if hex ID already exists in the mappings
 * @param {string} hexId 
 * @param {object} mappings 
 * @returns {boolean}
 */
function hexIdExists(hexId, mappings) {
  return mappings.hasOwnProperty(hexId);
}

/**
 * Generate a unique hex ID that doesn't exist in current mappings
 * @param {object} mappings 
 * @returns {string}
 */
function generateUniqueHexId(mappings) {
  let hexId;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  do {
    hexId = generateHexId();
    attempts++;
  } while (hexIdExists(hexId, mappings) && attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    throw new Error('Unable to generate unique hex ID after 100 attempts');
  }
  
  return hexId;
}

/**
 * Add a new URL to the mappings file
 * @param {string} url - The URL to shorten
 */
function addUrl(url) {
  try {
    // Read current mappings
    const mappingsData = fs.readFileSync('url_mappings.json', 'utf8');
    const mappings = JSON.parse(mappingsData);
    
    // Generate unique hex ID
    const hexId = generateUniqueHexId(mappings);
    
    // Add new mapping
    mappings[hexId] = url;
    
    // Write back to file
    fs.writeFileSync('url_mappings.json', JSON.stringify(mappings, null, 2));
    
    console.log(`Added: ${hexId} -> ${url}`);
    console.log(`Short URL: /ln/${hexId}`);
    
  } catch (error) {
    console.error('Error adding URL:', error.message);
  }
}

// Command line usage
if (require.main === module) {
  const url = process.argv[2];
  
  if (!url) {
    console.log('Usage: node generate_hex_id.js <url>');
    console.log('Example: node generate_hex_id.js https://www.example.com');
    process.exit(1);
  }
  
  addUrl(url);
}

module.exports = { generateHexId, generateUniqueHexId, addUrl }; 