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
const CALLBACK_TIMEOUT = 10000;

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

  async startServer(): Promise<void> {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      // Handle CORS and preflight requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      console.error(`[DEBUG] Received callback: ${req.method} ${req.url}`);
      
      if (!req.url) {
        res.writeHead(400);
        res.end('Bad Request');
        return;
      }

      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      
      if (url.pathname === "/bear-callback") {
        const response: BearResponse = {};
        
        // Log all search params for debugging
        console.error(`[DEBUG] Search params:`, Object.fromEntries(url.searchParams));
        
        url.searchParams.forEach((value, key) => {
          console.error(`[DEBUG] Processing: ${key} = ${value}`);
          try {
            // Try to parse as JSON (for arrays and objects)
            const parsed = JSON.parse(decodeURIComponent(value));
            response[key] = parsed;
            console.error(`[DEBUG] Parsed as JSON: ${key} =`, parsed);
          } catch {
            // If not JSON, treat as string
            response[key] = decodeURIComponent(value);
            console.error(`[DEBUG] Parsed as string: ${key} = ${response[key]}`);
          }
        });

        console.error(`[DEBUG] Final response:`, response);

        if (this.responseResolve) {
          this.responseResolve(response);
        }

        // Return a minimal response that closes immediately
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>Bear MCP</title></head>
            <body>
              <script>
                // Close immediately without user interaction
                window.close();
                // If that doesn't work, try to minimize
                try { window.blur(); } catch(e) {}
              </script>
              <p style="font-family: Arial; color: #666;">Success! This window should close automatically.</p>
            </body>
          </html>
        `);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Handle server errors
    this.server.on('error', (err) => {
      console.error('[DEBUG] HTTP server error:', err);
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(CALLBACK_PORT, () => {
        console.error(`[DEBUG] Callback server listening on port ${CALLBACK_PORT}`);
        resolve();
      }).on('error', reject);
    });
  }

  async waitForCallback(): Promise<BearResponse> {
    this.responsePromise = new Promise<BearResponse>((resolve, reject) => {
      this.responseResolve = resolve;
      
      setTimeout(() => {
        console.error("[DEBUG] Callback timeout reached");
        reject(new Error("Callback timeout"));
      }, CALLBACK_TIMEOUT);
    });

    return this.responsePromise;
  }

  stopServer(): void {
    if (this.server) {
      this.server.close((err) => {
        if (err) {
          console.error('[DEBUG] Error closing server:', err);
        }
      });
      this.server = null;
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
        throw new Error("Token required but not available");
      }
    }

    // Start callback server if we expect a response
    if (expectResponse) {
      await callbackHandler.startServer();
      params["x-success"] = `http://localhost:${CALLBACK_PORT}/bear-callback`;
      params["x-error"] = `http://localhost:${CALLBACK_PORT}/bear-callback`;
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
    execSync(`osascript -e '${script}'`);

    // Wait for callback if expected
    if (expectResponse) {
      try {
        const response = await callbackHandler.waitForCallback();
        
        // Check for errors in response
        if (response['error-Code'] || response.errorMessage) {
          throw new Error(`Bear API Error: ${response.errorMessage || 'Unknown error'} (Code: ${response['error-Code'] || 'unknown'})`);
        }
        
        return response;
      } catch (error) {
        if (error instanceof Error && error.message.includes("Bear API Error")) {
          throw error;
        }
        // Timeout or other error
        console.error(`[DEBUG] Callback failed:`, error);
        return null;
      }
    }

    return null;
  } finally {
    callbackHandler.stopServer();
  }
}

const server = new Server(
  {
    name: "bear-mcp",
    version: "2.4.0",
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
          execSync('osascript -e \'tell application "Bear" to activate\'', { stdio: 'ignore' });
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
          
          // Test token by trying to get tags (without opening Bear window)
          try {
            const response = await executeBearURL("tags", { show_window: "no" }, true, true);
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
        const params: BearParams = {
          open_note: "no", // Don't open Bear
        };
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
                text: "Note created in Bear (ID not returned - you may need to enable Bear's advanced settings)",
              },
            ],
          };
        }
      }

      case "get_note": {
        const params: BearParams = {
          open_note: "no", // Don't open Bear
        };
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        
        const response = await executeBearURL("open-note", params, true);
        
        if (response && response.note) {
          return {
            content: [
              {
                type: "text",
                text: `# ${response.title || "Note"}\n\n${response.note}\n\n---\nID: ${response.identifier}\nTags: ${response.tags || "none"}\nModified: ${response.modificationDate}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Unable to retrieve note content. Make sure Bear's advanced settings allow x-callback-url responses.",
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
                text: "Search requires a Bear app token. Please:\n1. Open Bear → Help → Advanced → API Token → Copy Token\n2. Use the set_bear_token tool to save it\n3. Use check_bear_setup to verify",
              },
            ],
          };
        }

        const params: BearParams = {
          term: String(args.term),
          show_window: "no", // Don't open Bear window
        };
        if (args.tag) params.tag = String(args.tag);
        
        try {
          const response = await executeBearURL("search", params, true, true);
          console.error("[DEBUG] Search response:", response);
          
          if (response && response.notes && Array.isArray(response.notes)) {
            const notes = response.notes;
            let resultText = `Found ${notes.length} notes matching "${args.term}":\n\n`;
            
            notes.forEach((note: any, index: number) => {
              resultText += `${index + 1}. ${note.title || "Untitled"}\n`;
              resultText += `   ID: ${note.identifier}\n`;
              
              // Handle tags properly
              if (note.tags && Array.isArray(note.tags)) {
                resultText += `   Tags: ${note.tags.join(", ")}\n`;
              } else {
                resultText += `   Tags: none\n`;
              }
              
              resultText += `   Modified: ${note.modificationDate}\n\n`;
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
                  text: `No notes found matching "${args.term}". This could mean:\n1. No notes match your search term\n2. Try a different search term\n3. Use check_bear_setup to verify your configuration`,
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Search failed: ${error instanceof Error ? error.message : String(error)}\n\nTry using check_bear_setup to diagnose the issue.`,
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
                text: "Getting tags requires a Bear app token. Please:\n1. Open Bear → Help → Advanced → API Token → Copy Token\n2. Use the set_bear_token tool to save it\n3. Use check_bear_setup to verify",
              },
            ],
          };
        }

        const params: BearParams = {
          show_window: "no", // Don't open Bear window
        };
        
        try {
          const response = await executeBearURL("tags", params, true, true);
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
                  text: "No tags found. This could mean:\n1. You have no tags in Bear\n2. Try creating some notes with tags first\n3. Use check_bear_setup to verify your configuration",
                },
              ],
            };
          }
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Getting tags failed: ${error instanceof Error ? error.message : String(error)}\n\nTry using check_bear_setup to diagnose the issue.`,
              },
            ],
          };
        }
      }

      case "add_text": {
        const params: BearParams = {
          text: String(args.text),
          open_note: "no", // Don't open Bear
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
    console.error("Bear MCP server v2.4 running - No token configured");
    console.error("Use 'set_bear_token' tool to configure authentication");
  } else {
    console.error("Bear MCP server v2.4 running with token authentication");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});