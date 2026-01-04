// Simple HTTP test to validate the application is running and responsive
const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'http://localhost';

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data
        });
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testApplicationHealth() {
  console.log('🏥 Testing application health...');
  
  try {
    const response = await makeRequest(BASE_URL);
    
    if (response.statusCode === 200) {
      console.log('✅ Application is responding (HTTP 200)');
      
      // Check if the response contains expected Game of Life elements
      const body = response.body;
      const hasReactApp = body.includes('react') || body.includes('React');
      const hasGameElements = body.includes('game') || body.includes('script') || body.includes('canvas');
      
      console.log(`React app detected: ${hasReactApp}`);
      console.log(`Game elements detected: ${hasGameElements}`);
      
      // Check for specific features we added
      const hasScriptFeatures = body.includes('scriptingInterpreter') || 
                               body.includes('SimpleScriptPanel') ||
                               body.includes('Script Panel');
      
      console.log(`Script features detected: ${hasScriptFeatures}`);
      
      return {
        healthy: true,
        statusCode: response.statusCode,
        hasReactApp,
        hasGameElements,
        hasScriptFeatures
      };
    } else {
      console.log(`❌ Application responded with status: ${response.statusCode}`);
      return {
        healthy: false,
        statusCode: response.statusCode
      };
    }
  } catch (error) {
    console.error('❌ Application health check failed:', error.message);
    return {
      healthy: false,
      error: error.message
    };
  }
}

async function checkAPIEndpoints() {
  console.log('🔍 Checking API endpoints...');
  
  const endpoints = [
    '/api/v1/shapes',
    '/api/health',
    '/api/status'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const response = await makeRequest(url);
      console.log(`${endpoint}: ${response.statusCode}`);
    } catch (error) {
      console.log(`${endpoint}: Error - ${error.message}`);
    }
  }
}

async function runBasicTests() {
  console.log('🧪 Starting basic application tests...');
  console.log(`Target URL: ${BASE_URL}`);
  
  const healthResult = await testApplicationHealth();
  await checkAPIEndpoints();
  
  if (healthResult.healthy) {
    console.log('🎉 Application appears to be running correctly!');
    if (healthResult.hasScriptFeatures) {
      console.log('✨ Script features appear to be deployed!');
    }
  } else {
    console.log('💥 Application health check failed');
  }
  
  return healthResult;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runBasicTests().catch(console.error);
}

module.exports = { runBasicTests, testApplicationHealth };