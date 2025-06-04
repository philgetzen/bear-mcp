#!/usr/bin/env node

// Test script for the restored Bear MCP server
// This tests the HTTP callback functionality

const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Bear MCP Server Test - Restored Callback Functionality');
console.log('=====================================================\n');

// Start the server
const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;

// Handle server output
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[Server Output]:', output.trim());
  
  if (output.includes('Bear MCP server') && !serverReady) {
    serverReady = true;
    console.log('\n✅ Server is ready!\n');
    showMenu();
  }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  if (output.includes('[DEBUG]')) {
    console.log('[Debug]:', output.trim());
  } else {
    console.log('[Server Log]:', output.trim());
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\nServer exited with code ${code}`);
  rl.close();
  process.exit(code);
});

// Send request to server
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: Date.now()
  };
  
  console.log('\n📤 Sending request:', JSON.stringify(request, null, 2));
  server.stdin.write(JSON.stringify(request) + '\n');
}

function showMenu() {
  console.log('\nChoose a test:');
  console.log('1. Check Bear setup');
  console.log('2. Get tags (requires token)');
  console.log('3. Search notes (requires token)');
  console.log('4. Create a test note');
  console.log('5. Exit\n');
  
  rl.question('Enter your choice (1-5): ', (choice) => {
    handleChoice(choice);
  });
}

async function handleChoice(choice) {
  switch (choice) {
    case '1':
      console.log('\n🔍 Testing Bear setup...');
      sendRequest('tools/call', {
        name: 'check_bear_setup',
        arguments: {}
      });
      break;
      
    case '2':
      console.log('\n🏷️ Getting tags from Bear...');
      sendRequest('tools/call', {
        name: 'get_tags',
        arguments: {}
      });
      break;
      
    case '3':
      rl.question('Enter search term: ', (term) => {
        console.log(`\n🔍 Searching for "${term}"...`);
        sendRequest('tools/call', {
          name: 'search_notes',
          arguments: { term: term }
        });
      });
      return;
      
    case '4':
      console.log('\n📝 Creating test note...');
      const timestamp = new Date().toISOString();
      sendRequest('tools/call', {
        name: 'create_note',
        arguments: {
          title: `Test Note - ${timestamp}`,
          text: `This is a test note created by the restored Bear MCP server.\n\nCreated at: ${timestamp}\n\nThe HTTP callback functionality has been restored!`,
          tags: 'test,mcp-server'
        }
      });
      break;
      
    case '5':
      console.log('\nExiting...');
      server.kill();
      return;
      
    default:
      console.log('\n❌ Invalid choice');
      showMenu();
      return;
  }
  
  // Show menu again after a delay
  setTimeout(showMenu, 3000);
}

// Handle response parsing
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Try to parse complete JSON-RPC messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim() && line.includes('"jsonrpc"')) {
      try {
        const response = JSON.parse(line);
        if (response.result) {
          console.log('\n📥 Response received:');
          if (response.result.content && response.result.content[0]) {
            console.log(response.result.content[0].text);
          } else {
            console.log(JSON.stringify(response.result, null, 2));
          }
        } else if (response.error) {
          console.log('\n❌ Error:', response.error.message);
        }
      } catch (e) {
        // Not a complete JSON message yet
      }
    }
  }
});

// Start by listing available tools
console.log('🚀 Starting Bear MCP server...\n');

// Send initial request to list tools
setTimeout(() => {
  if (!serverReady) {
    console.log('Waiting for server to start...');
  }
}, 1000);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  server.kill();
  process.exit(0);
});