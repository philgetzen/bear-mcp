// Quick test to verify Bear MCP functionality
const http = require('http');

// Test the HTTP callback server
const testPort = 51234;
const testUrl = `http://127.0.0.1:${testPort}/bear-callback?tags=%5B%22work%22%2C%22personal%22%2C%22ideas%22%5D`;

console.log('Testing HTTP callback server...');
console.log(`Attempting to connect to: http://127.0.0.1:${testPort}`);

const req = http.get(testUrl, (res) => {
  console.log(`✅ Server responded with status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Response body preview: ${data.substring(0, 200)}...`);
    console.log('\n✅ HTTP callback server is working!');
    process.exit(0);
  });
});

req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('❌ Could not connect to callback server');
    console.log('The Bear MCP server may not be running or the callback handler is not active');
  } else {
    console.log(`❌ Error: ${err.message}`);
  }
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.log('❌ Request timed out');
  req.destroy();
  process.exit(1);
});