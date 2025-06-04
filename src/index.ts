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
const CALLBACK_TIMEOUT = 5000;

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

const APP_TOKEN = loadToken() || process.env.BEAR_TOKEN || null;

class BearCallbackHandler {
  private server: http.Server | null = null;
  private responsePromise: Promise<BearResponse> | null = null;
  private responseResolve: ((value: BearResponse) => void) | null = null;

  async startServer(): Promise<void> {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      
      if (url.pathname === "/bear-callback") {
        const response: BearResponse = {};
        
        url.searchParams.forEach((value, key) => {
          try {
            // Try to parse as JSON (for arrays)
            response[key] = JSON.parse(decodeURIComponent(value));
          } catch {
            // If not JSON, treat as string
            response[key] = decodeURIComponent(value);
          }
        });

        if (this.responseResolve) {
          this.responseResolve(response);
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Success!</h1><p>You can close this window.</p><script>window.close();</script></body></html>");
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(CALLBACK_PORT, () => {
        resolve();
      });
    });
  }

  async waitForCallback(): Promise<BearResponse> {
    this.responsePromise = new Promise<BearResponse>((resolve, reject) => {
      this.responseResolve = resolve;
      
      setTimeout(() => {
        reject(new Error("Callback timeout"));
      }, CALLBACK_TIMEOUT);
    });

    return this.responsePromise;
  }

  stopServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

async function executeBearURL(action: string, params: BearParams, expectResponse: boolean = false, requiresToken: boolean = false): Promise<BearResponse | null> {
  const callbackHandler = new BearCallbackHandler();
  
  try {
    // Add token if required and available
    if (requiresToken && APP_TOKEN) {
      params.token = APP_TOKEN;
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

    // Use AppleScript to open the URL (more reliable than 'open' command)
    const script = `open location "${url.toString()}"`;
    execSync(`osascript -e '${script}'`);

    // Wait for callback if expected
    if (expectResponse) {
      try {
        const response = await callbackHandler.waitForCallback();
        return response;
      } catch (error) {
        // Timeout or error - Bear might not support callback for this action
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
    version: "2.1.0",
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
            open_note: {
              type: "boolean",
              description: "Open the note in Bear after creation",
              default: false,
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
            open_note: {
              type: "boolean",
              description: "Also open the note in Bear",
              default: false,
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
            show_window: {
              type: "boolean",
              description: "Show search results in Bear",
              default: false,
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
          properties: {
            show_window: {
              type: "boolean",
              description: "Also show tags in Bear window",
              default: false,
            },
          },
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
            open_note: {
              type: "boolean",
              description: "Open the note after adding text",
              default: false,
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
        
        // Reload the token
        const newToken = loadToken();
        
        return {
          content: [
            {
              type: "text",
              text: `Bear token has been saved successfully. You can now use search and tag operations.`,
            },
          ],
        };
      }

      case "create_note": {
        const params: BearParams = {};
        if (args.title) params.title = String(args.title);
        if (args.text) params.text = String(args.text);
        if (args.tags) params.tags = String(args.tags);
        if (!args.open_note) params["open_note"] = "no";
        
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
        const params: BearParams = {};
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        if (!args.open_note) params["open_note"] = "no";
        
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
        } else if (args.open_note) {
          return {
            content: [
              {
                type: "text",
                text: "Note opened in Bear (content retrieval requires Bear's advanced settings to be enabled)",
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
        if (!APP_TOKEN && !loadToken()) {
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
        if (!args.show_window) params["show_window"] = "no";
        
        const response = await executeBearURL("search", params, true, true);
        
        if (response && response.notes) {
          const notes = response.notes;
          let resultText = `Found ${notes.length} notes matching "${args.term}":\n\n`;
          
          notes.forEach((note: any, index: number) => {
            resultText += `${index + 1}. ${note.title || "Untitled"}\n`;
            resultText += `   ID: ${note.identifier}\n`;
            resultText += `   Tags: ${note.tags || "none"}\n`;
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
        } else if (args.show_window) {
          return {
            content: [
              {
                type: "text",
                text: "Search results shown in Bear window",
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Search completed but no results returned. This might mean:\n1. No notes match your search\n2. Token is invalid (regenerate in Bear → Help → Advanced → API Token)\n3. Bear's x-callback-url setting is disabled",
              },
            ],
          };
        }
      }

      case "get_tags": {
        if (!APP_TOKEN && !loadToken()) {
          return {
            content: [
              {
                type: "text",
                text: "Getting tags requires a Bear app token. Please:\n1. Open Bear → Help → Advanced → API Token → Copy Token\n2. Use the set_bear_token tool to save it",
              },
            ],
          };
        }

        const params: BearParams = {};
        if (!args.show_window) params["show_window"] = "no";
        
        const response = await executeBearURL("tags", params, true, true);
        
        if (response && response.tags) {
          const tags = response.tags;
          return {
            content: [
              {
                type: "text",
                text: `Found ${tags.length} tags:\n\n${tags.join("\n")}`,
              },
            ],
          };
        } else if (args.show_window) {
          return {
            content: [
              {
                type: "text",
                text: "Tags shown in Bear window",
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Unable to retrieve tags. This might mean:\n1. No tags exist\n2. Token is invalid (regenerate in Bear → Help → Advanced → API Token)\n3. Bear's x-callback-url setting is disabled",
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
        if (!args.open_note) params["open_note"] = "no";
        
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
  
  if (!APP_TOKEN) {
    console.error("Bear MCP server v2.1 running - No token configured");
    console.error("To access existing notes, set token with 'set_bear_token' tool");
  } else {
    console.error("Bear MCP server v2.1 running with token authentication");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});