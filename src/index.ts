#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const BEAR_URL_SCHEME = "bear://x-callback-url";

// Token configuration
const CONFIG_DIR = path.join(os.homedir(), '.bear-mcp');
const TOKEN_FILE = path.join(CONFIG_DIR, 'token');

interface BearParams {
  [key: string]: string | undefined;
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

// Simple Bear URL execution without callbacks
async function executeBearURL(action: string, params: BearParams): Promise<void> {
  // Build the URL
  const url = new URL(`${BEAR_URL_SCHEME}/${action}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  });

  console.error(`[DEBUG] Opening Bear URL: ${url.toString()}`);

  // Use AppleScript to open the URL
  const script = `open location "${url.toString()}"`;
  execSync(`osascript -e '${script}'`);
}

// AppleScript-based search function
async function searchBearNotes(searchTerm: string, tag?: string): Promise<any[]> {
  const token = getCurrentToken();
  if (!token) {
    throw new Error("Token required for search");
  }

  try {
    // Create a temporary AppleScript file to handle the search
    const tempFile = path.join(os.tmpdir(), `bear_search_${Date.now()}.scpt`);
    
    let searchScript = `
tell application "Bear"
    set searchResults to {}
    -- Note: This is a simplified approach
    -- Bear doesn't expose direct AppleScript APIs for search
    -- We'll fall back to using the x-callback-url method with file output
end tell
`;

    // Since Bear doesn't have direct AppleScript APIs, we'll use a file-based approach
    const outputFile = path.join(os.tmpdir(), `bear_search_${Date.now()}.json`);
    
    // Try using Bear's search URL with file output
    const searchUrl = new URL(`${BEAR_URL_SCHEME}/search`);
    searchUrl.searchParams.append("term", searchTerm);
    if (tag) searchUrl.searchParams.append("tag", tag);
    searchUrl.searchParams.append("token", token);
    searchUrl.searchParams.append("show_window", "no");
    
    // Use a different approach - let's try the grab-url method to see if we can get data
    console.error(`[DEBUG] Attempting search without callbacks for: ${searchTerm}`);
    
    // For now, return a simulated response indicating the limitation
    return [];
    
  } catch (error) {
    console.error("[DEBUG] AppleScript search failed:", error);
    throw error;
  }
}

// AppleScript-based tags function
async function getBearTags(): Promise<string[]> {
  const token = getCurrentToken();
  if (!token) {
    throw new Error("Token required for tags");
  }

  try {
    // For now, return empty array - we'll implement a workaround
    console.error("[DEBUG] Attempting to get tags without callbacks");
    return [];
  } catch (error) {
    console.error("[DEBUG] AppleScript tags failed:", error);
    throw error;
  }
}

const server = new Server(
  {
    name: "bear-mcp",
    version: "3.1.0",
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
        description: "Search for notes in Bear (currently limited due to Bear API constraints)",
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
        description: "Get all tags from Bear (currently limited due to Bear API constraints)",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "open_bear_search",
        description: "Open Bear with a search query (will open Bear app)",
        inputSchema: {
          type: "object",
          properties: {
            term: {
              type: "string",
              description: "Search term",
            },
          },
          required: ["term"],
        },
      },
      {
        name: "open_bear_tags",
        description: "Open Bear's tags view (will open Bear app)",
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
              text: `Bear token has been saved successfully. Note: Due to Bear API limitations, search functionality is currently limited. Use 'open_bear_search' to search within Bear app.`,
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
          statusMessage += "⚠️ Note: Due to Bear's x-callback-url limitations, direct search/tags retrieval is not fully functional\n";
          statusMessage += "✅ You can use 'open_bear_search' and 'open_bear_tags' to interact with Bear directly";
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
          open_note: "no",
        };
        if (args.title) params.title = String(args.title);
        if (args.text) params.text = String(args.text);
        if (args.tags) params.tags = String(args.tags);
        
        await executeBearURL("create", params);
        
        return {
          content: [
            {
              type: "text",
              text: `Note created in Bear with title: "${args.title || "Untitled"}"`,
            },
          ],
        };
      }

      case "get_note": {
        const params: BearParams = {
          open_note: "yes", // We need to open it since we can't get content back
        };
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        
        await executeBearURL("open-note", params);
        
        return {
          content: [
            {
              type: "text",
              text: `Note opened in Bear. Due to Bear API limitations, I cannot retrieve the content directly. The note is now open in Bear for you to view.`,
            },
          ],
        };
      }

      case "search_notes": {
        const token = getCurrentToken();
        if (!token) {
          return {
            content: [
              {
                type: "text",
                text: "Search requires a Bear app token. Please:\n1. Open Bear → Help → Advanced → API Token → Copy Token\n2. Use the set_bear_token tool to save it\n\nNote: Due to Bear API limitations, use 'open_bear_search' for interactive searching.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `I cannot retrieve search results directly due to Bear's API limitations. However, I can open Bear with your search query.\n\nTo search for "${args.term}", I recommend using the 'open_bear_search' tool which will open Bear with your search term.`,
            },
          ],
        };
      }

      case "get_tags": {
        const token = getCurrentToken();
        if (!token) {
          return {
            content: [
              {
                type: "text",
                text: "Getting tags requires a Bear app token. Please:\n1. Open Bear → Help → Advanced → API Token → Copy Token\n2. Use the set_bear_token tool to save it\n\nNote: Due to Bear API limitations, use 'open_bear_tags' to view tags in Bear.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: "I cannot retrieve the tags list directly due to Bear's API limitations. However, I can open Bear's tags view for you.\n\nUse the 'open_bear_tags' tool to open Bear's tags interface where you can see all your tags.",
            },
          ],
        };
      }

      case "open_bear_search": {
        const params: BearParams = {
          term: String(args.term),
        };
        const token = getCurrentToken();
        if (token) {
          params.token = token;
        }
        
        await executeBearURL("search", params);
        
        return {
          content: [
            {
              type: "text",
              text: `Opened Bear with search for: "${args.term}"`,
            },
          ],
        };
      }

      case "open_bear_tags": {
        const params: BearParams = {};
        const token = getCurrentToken();
        if (token) {
          params.token = token;
        }
        
        await executeBearURL("tags", params);
        
        return {
          content: [
            {
              type: "text",
              text: "Opened Bear's tags view. You can see all your tags in the Bear app.",
            },
          ],
        };
      }

      case "add_text": {
        const params: BearParams = {
          text: String(args.text),
          open_note: "no",
        };
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        if (args.mode) params.mode = String(args.mode);
        
        await executeBearURL("add-text", params);
        
        return {
          content: [
            {
              type: "text",
              text: `Text added to note: ${args.title || args.id || "specified note"}`,
            },
          ],
        };
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
    console.error("Bear MCP server v3.0 running - No token configured");
    console.error("Note: This version eliminates HTTP callbacks to prevent browser issues");
  } else {
    console.error("Bear MCP server v3.0 running with simplified Bear integration");
    console.error("Note: Search/tags work by opening Bear due to API limitations");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});