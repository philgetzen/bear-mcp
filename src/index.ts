#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import * as http from "http";
import { URL } from "url";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const BEAR_URL_SCHEME = "bear://x-callback-url";
const CALLBACK_PORT = 51234;
const CALLBACK_TIMEOUT = 20000; // Increased to 20 seconds

// Token configuration
const CONFIG_DIR = path.join(os.homedir(), '.bear-mcp');
const TOKEN_FILE = path.join(CONFIG_DIR, 'token');

interface BearParams {
  [key: string]: string | undefined;
}

interface BearResponse {
  [key: string]: any;
}

// Load token from file if it exists
function loadToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    }
  } catch (error) {
    console.error("Error loading token:", error);
  }
  return null;
}

// Save token to file
function saveToken(token: string): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(TOKEN_FILE, token, 'utf8');
    fs.chmodSync(TOKEN_FILE, 0o600); // Secure the token file
  } catch (error) {
    console.error("Error saving token:", error);
  }
}

// Global token - reload on each use to pick up changes
function getCurrentToken(): string | null {
  return loadToken() || process.env.BEAR_TOKEN || null;
}

class BearCallbackHandler {
  private server: http.Server | null = null;
  private responsePromise: Promise<BearResponse> | null = null;
  private responseResolve: ((value: BearResponse) => void) | null = null;
  private responseReject: ((error: Error) => void) | null = null;

  async startServer(): Promise<void> {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      // Set CORS headers for all responses
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      console.error(`[DEBUG] Received callback: ${req.method} ${req.url}`);
      
      if (!req.url) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
      }

      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      
      if (url.pathname === "/bear-callback") {
        const response: BearResponse = {};
        
        // Parse all query parameters
        url.searchParams.forEach((value, key) => {
          console.error(`[DEBUG] Processing param: ${key} = ${value}`);
          try {
            // Try to parse as JSON first
            const decoded = decodeURIComponent(value);
            try {
              response[key] = JSON.parse(decoded);
            } catch {
              // Not JSON, use as string
              response[key] = decoded;
            }
          } catch (e) {
            // Fallback to raw value
            response[key] = value;
          }
        });

        console.error(`[DEBUG] Parsed response:`, response);

        // Resolve the promise with the response
        if (this.responseResolve) {
          this.responseResolve(response);
          this.responseResolve = null;
          this.responseReject = null;
        }

        // Send HTML response that auto-closes the window
        res.writeHead(200, { 
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff'
        });
        
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bear MCP - Success</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: none; /* Hide content immediately */
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: transparent;
            opacity: 0;
        }
        .message {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success {
            color: #4CAF50;
            font-size: 48px;
            margin-bottom: 10px;
        }
        .text {
            color: #666;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="message">
        <div class="success">✓</div>
        <div class="text">Request completed successfully</div>
        <div class="text" style="font-size: 14px; margin-top: 10px;">This window will close automatically...</div>
    </div>
    <script>
        // Prevent focus stealing immediately
        try { 
            window.blur(); 
            if (window.opener && window.opener.focus) {
                window.opener.focus();
            }
        } catch(e) {}
        
        // Immediately try to close (most aggressive approach)
        try { window.close(); } catch(e) {}
        try { self.close(); } catch(e) {}
        
        // Minimize and hide window ASAP to prevent visibility
        try {
            window.resizeTo(1, 1);
            window.moveTo(-1000, -1000);
            window.blur();
        } catch(e) {}
        
        // Multiple close attempts with very short delays
        for (let i = 0; i < 10; i++) {
            setTimeout(function() {
                try { window.close(); } catch(e) {}
                try { self.close(); } catch(e) {}
                
                // Keep blurring to prevent focus stealing
                try { window.blur(); } catch(e) {}
                
                // Try closing via opener
                if (window.opener && window.opener !== window) {
                    try {
                        window.opener.focus(); // Give focus back to opener
                        window.opener = null;
                        window.close();
                    } catch(e) {}
                }
            }, i * 50); // Every 50ms for 500ms total
        }
        
        // Final desperate attempts
        setTimeout(function() {
            try {
                window.location.href = 'about:blank';
                window.close();
            } catch(e) {}
            
            // Hide completely if we can't close
            document.documentElement.style.display = 'none';
            document.body.style.display = 'none';
        }, 600);
        
        // Listen for any events to close immediately
        ['click', 'focus', 'mouseover', 'keydown'].forEach(function(event) {
            document.addEventListener(event, function() {
                try { window.close(); } catch(e) {}
            });
        });
        
        // Last resort: periodic close attempts
        const closeInterval = setInterval(function() {
            try { 
                window.close(); 
                clearInterval(closeInterval);
            } catch(e) {}
        }, 100);
        
        // Clear interval after 5 seconds
        setTimeout(function() {
            clearInterval(closeInterval);
        }, 5000);
    </script>
</body>
</html>`);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    // Handle server errors
    this.server.on('error', (err) => {
      console.error('[DEBUG] HTTP server error:', err);
      if (this.responseReject) {
        this.responseReject(new Error(`Server error: ${err.message}`));
      }
    });

    // Start the server
    await new Promise<void>((resolve, reject) => {
      this.server!.listen(CALLBACK_PORT, '127.0.0.1', () => {
        console.error(`[DEBUG] Callback server listening on http://127.0.0.1:${CALLBACK_PORT}`);
        resolve();
      }).on('error', reject);
    });
  }

  async waitForCallback(): Promise<BearResponse> {
    return new Promise<BearResponse>((resolve, reject) => {
      this.responseResolve = resolve;
      this.responseReject = reject;
      
      // Set a timeout with better error information
      const timeoutId = setTimeout(() => {
        if (this.responseResolve) {
          console.error(`[DEBUG] Callback timeout reached after ${CALLBACK_TIMEOUT}ms`);
          console.error(`[DEBUG] Callback server still running on port ${CALLBACK_PORT}`);
          this.responseResolve = null;
          this.responseReject = null;
          reject(new Error(`Callback timeout after ${CALLBACK_TIMEOUT/1000}s - Bear may be slow to respond or the search returned no results. Try again or check Bear's status.`));
        }
      }, CALLBACK_TIMEOUT);
    });
  }

  stopServer(): void {
    if (this.server) {
      this.server.close((err) => {
        if (err) {
          console.error('[DEBUG] Error closing server:', err);
        }
      });
      // Force close all connections
      this.server.closeAllConnections();
      this.server = null;
      this.responseResolve = null;
      this.responseReject = null;
      console.error("[DEBUG] Callback server stopped");
    }
  }
}

async function executeBearURL(action: string, params: BearParams, expectResponse: boolean = false, requiresToken: boolean = false): Promise<BearResponse | null> {
  const callbackHandler = new BearCallbackHandler();
  
  try {
    // Add token if required and available
    if (requiresToken) {
      const token = getCurrentToken();
      if (token) {
        params.token = token;
      } else {
        throw new Error("Token required but not available. Use set_bear_token to configure.");
      }
    }

    // Always use show_window=no to prevent Bear from opening
    if (!params.hasOwnProperty('show_window')) {
      params.show_window = "no";
    }

    // Start callback server if we expect a response
    if (expectResponse) {
      await callbackHandler.startServer();
      params["x-success"] = `http://127.0.0.1:${CALLBACK_PORT}/bear-callback`;
      params["x-error"] = `http://127.0.0.1:${CALLBACK_PORT}/bear-callback`;
    }

    // Build the URL
    const url = new URL(`${BEAR_URL_SCHEME}/${action}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    console.error(`[DEBUG] Opening Bear URL: ${url.toString()}`);

    // Use AppleScript to open the URL (more reliable than 'open' command)
    const script = `open location "${url.toString()}"`;
    try {
      execSync(`osascript -e '${script}'`, { stdio: 'pipe' });
    } catch (execError) {
      console.error(`[DEBUG] Error executing AppleScript:`, execError);
      throw new Error(`Failed to open Bear URL: ${execError}`);
    }

    // Wait for callback if expected
    if (expectResponse) {
      try {
        const response = await callbackHandler.waitForCallback();
        
        // Check for errors in response
        if (response.errorCode || response['error-Code'] || response.errorMessage) {
          const errorCode = response.errorCode || response['error-Code'] || 'unknown';
          const errorMessage = response.errorMessage || response.errorMessage || 'Unknown error';
          throw new Error(`Bear API Error ${errorCode}: ${errorMessage}`);
        }
        
        return response;
      } catch (error) {
        console.error(`[DEBUG] Callback error:`, error);
        throw error;
      }
    }

    return null;
  } finally {
    // Always stop the server
    callbackHandler.stopServer();
  }
}

const server = new Server(
  {
    name: "bear-mcp",
    version: "4.0.2",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "set_bear_token",
        description: "Set the Bear app token for accessing existing notes. Get your token from Bear → Help → Advanced → API Token",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "Your Bear app token",
            },
          },
          required: ["token"],
        },
      },
      {
        name: "check_bear_setup",
        description: "Check if Bear is properly configured and test the connection",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "create_note",
        description: "Create a new note in Bear and return its ID",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Note title",
            },
            text: {
              type: "string",
              description: "Note content",
            },
            tags: {
              type: "string",
              description: "Comma separated tags (e.g., 'work,ideas')",
            },
          },
          required: [],
        },
      },
      {
        name: "get_note",
        description: "Get the content of a specific note",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Note unique identifier",
            },
            title: {
              type: "string",
              description: "Note title (used if id is not provided)",
            },
          },
          required: [],
        },
      },
      {
        name: "search_notes",
        description: "Search for notes and return results with metadata (requires token)",
        inputSchema: {
          type: "object",
          properties: {
            term: {
              type: "string",
              description: "Search term",
            },
            tag: {
              type: "string",
              description: "Tag to search within",
            },
          },
          required: ["term"],
        },
      },
      {
        name: "get_tags",
        description: "Get all tags from Bear (requires token)",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "add_text",
        description: "Append or prepend text to an existing note",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Note unique identifier",
            },
            title: {
              type: "string",
              description: "Note title (ignored if id is provided)",
            },
            text: {
              type: "string",
              description: "Text to add",
            },
            mode: {
              type: "string",
              enum: ["append", "prepend", "replace", "replace_all"],
              description: "How to add the text (default: append)",
            },
          },
          required: ["text"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("No arguments provided");
  }

  try {
    switch (name) {
      case "set_bear_token": {
        const token = String(args.token);
        saveToken(token);
        
        return {
          content: [
            {
              type: "text",
              text: `Bear token has been saved successfully. Use check_bear_setup to test the connection.`,
            },
          ],
        };
      }

      case "check_bear_setup": {
        let statusMessage = "Bear Setup Status:\n\n";
        
        // Check if Bear app is available
        try {
          // Check if Bear is installed without activating it
          const checkScript = `tell application "System Events" to return exists application process "Bear"`;
          execSync(`osascript -e '${checkScript}'`, { stdio: 'pipe' });
          statusMessage += "✅ Bear app is installed and accessible\n";
        } catch {
          statusMessage += "❌ Bear app not found or not accessible\n";
          return {
            content: [{ type: "text", text: statusMessage }],
          };
        }
        
        // Check token
        const token = getCurrentToken();
        if (token) {
          statusMessage += "✅ Token is configured\n";
          
          // Test token by trying to get tags
          try {
            const response = await executeBearURL("tags", {}, true, true);
            console.error("[DEBUG] Tags response:", response);
            
            if (response && response.tags) {
              let tagNames: string[] = [];
              if (Array.isArray(response.tags)) {
                tagNames = response.tags.map((tag: any) => {
                  if (typeof tag === 'string') {
                    return tag;
                  } else if (tag && tag.name) {
                    return tag.name;
                  } else {
                    return String(tag);
                  }
                });
              }
              
              statusMessage += `✅ Token is valid - found ${tagNames.length} tags\n`;
              if (tagNames.length > 0) {
                statusMessage += `📋 Sample tags: ${tagNames.slice(0, 5).join(", ")}${tagNames.length > 5 ? "..." : ""}`;
              }
            } else {
              statusMessage += "⚠️ Token test returned no data (you might have no tags)";
            }
          } catch (error) {
            statusMessage += `❌ Token test failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        } else {
          statusMessage += "❌ No token configured\n";
          statusMessage += "\nTo fix: Get token from Bear → Help → Advanced → API Token → Copy Token\nThen use set_bear_token tool";
        }
        
        return {
          content: [
            {
              type: "text",
              text: statusMessage,
            },
          ],
        };
      }

      case "create_note": {
        const params: BearParams = {};
        if (args.title) params.title = String(args.title);
        if (args.text) params.text = String(args.text);
        if (args.tags) params.tags = String(args.tags);
        
        const response = await executeBearURL("create", params, true);
        
        if (response && response.identifier) {
          return {
            content: [
              {
                type: "text",
                text: `Note created successfully\nID: ${response.identifier}\nTitle: ${response.title || args.title || "Untitled"}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Note created in Bear (ID not returned - check Bear's x-callback-url settings)",
              },
            ],
          };
        }
      }

      case "get_note": {
        const params: BearParams = {};
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        
        const response = await executeBearURL("open-note", params, true);
        
        if (response && response.note) {
          return {
            content: [
              {
                type: "text",
                text: `# ${response.title || "Note"}\n\n${response.note}\n\n---\nID: ${response.identifier || "N/A"}\nTags: ${response.tags || "none"}\nModified: ${response.modificationDate || "N/A"}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Unable to retrieve note content. Make sure Bear's x-callback-url is enabled in preferences.",
              },
            ],
          };
        }
      }

      case "search_notes": {
        const token = getCurrentToken();
        if (!token) {
          return {
            content: [
              {
                type: "text",
                text: "Search requires a Bear app token. Please:\n1. Open Bear → Help → Advanced → API Token → Copy Token\n2. Use the set_bear_token tool to save it",
              },
            ],
          };
        }

        const params: BearParams = {
          term: String(args.term),
        };
        if (args.tag) params.tag = String(args.tag);
        
        try {
          console.error(`[DEBUG] Searching for "${args.term}"${args.tag ? ` in tag "${args.tag}"` : ''}`);
          const response = await executeBearURL("search", params, true, true);
          console.error("[DEBUG] Search response:", response);
          
          if (response && response.notes && Array.isArray(response.notes)) {
            const notes = response.notes;
            let resultText = `Found ${notes.length} notes matching "${args.term}":\n\n`;
            
            notes.forEach((note: any, index: number) => {
              resultText += `${index + 1}. ${note.title || "Untitled"}\n`;
              resultText += `   ID: ${note.identifier}\n`;
              
              // Handle tags properly
              if (note.tags) {
                if (Array.isArray(note.tags)) {
                  resultText += `   Tags: ${note.tags.join(", ")}\n`;
                } else {
                  resultText += `   Tags: ${note.tags}\n`;
                }
              } else {
                resultText += `   Tags: none\n`;
              }
              
              if (note.modificationDate) {
                resultText += `   Modified: ${note.modificationDate}\n`;
              }
              
              resultText += `\n`;
            });
            
            return {
              content: [
                {
                  type: "text",
                  text: resultText,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `No notes found matching "${args.term}". This could mean:\n1. No notes match your search term\n2. Try a different search term\n3. Check that Bear's x-callback-url is enabled`,
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      case "get_tags": {
        const token = getCurrentToken();
        if (!token) {
          return {
            content: [
              {
                type: "text",
                text: "Getting tags requires a Bear app token. Please:\n1. Open Bear → Help → Advanced → API Token → Copy Token\n2. Use the set_bear_token tool to save it",
              },
            ],
          };
        }

        try {
          const response = await executeBearURL("tags", {}, true, true);
          console.error("[DEBUG] Get tags response:", response);
          
          if (response && response.tags && Array.isArray(response.tags)) {
            let tagNames: string[] = [];
            tagNames = response.tags.map((tag: any) => {
              if (typeof tag === 'string') {
                return tag;
              } else if (tag && tag.name) {
                return tag.name;
              } else {
                return String(tag);
              }
            });
            
            return {
              content: [
                {
                  type: "text",
                  text: `Found ${tagNames.length} tags:\n\n${tagNames.join("\n")}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: "No tags found in Bear. This could mean:\n1. You have no tags in any notes\n2. Create some notes with tags first",
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Getting tags failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      case "add_text": {
        const params: BearParams = {
          text: String(args.text),
        };
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        if (args.mode) params.mode = String(args.mode);
        
        const response = await executeBearURL("add-text", params, true);
        
        if (response && response.identifier) {
          return {
            content: [
              {
                type: "text",
                text: `Text added successfully to note: ${response.title || "Untitled"} (ID: ${response.identifier})`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Text added to note in Bear",
              },
            ],
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  const token = getCurrentToken();
  if (!token) {
    console.error("Bear MCP server v2.5.0 running - No token configured");
    console.error("Use 'set_bear_token' tool to configure authentication");
  } else {
    console.error("Bear MCP server v2.5.0 running with token authentication");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});