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
import sqlite3 from "sqlite3";

const BEAR_URL_SCHEME = "bear://x-callback-url";

// Token configuration
const CONFIG_DIR = path.join(os.homedir(), '.bear-mcp');
const TOKEN_FILE = path.join(CONFIG_DIR, 'token');

// Bear database path
const BEAR_CLOUDKIT_DB = path.join(
  os.homedir(),
  'Library/Containers/net.shinyfrog.bear/Data/CloudKit/c92f39c6ea98f57c13f84f9b283e7a7613347d0b/Records/Records.db'
);

interface BearParams {
  [key: string]: string | undefined;
}

interface BearNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  modificationDate: Date;
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
    fs.chmodSync(TOKEN_FILE, 0o600);
  } catch (error) {
    console.error("Error saving token:", error);
  }
}

// Simple Bear URL execution without callbacks
async function executeBearURL(action: string, params: BearParams): Promise<void> {
  const url = new URL(`${BEAR_URL_SCHEME}/${action}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  });

  console.error(`[DEBUG] Opening Bear URL: ${url.toString()}`);
  const script = `open location "${url.toString()}"`;
  execSync(`osascript -e '${script}'`);
}

// Database access functions
function checkDatabaseAccess(): boolean {
  try {
    return fs.existsSync(BEAR_CLOUDKIT_DB);
  } catch {
    return false;
  }
}

function getDatabaseStats(): Promise<{ recordCount: number; notesCount: number }> {
  return new Promise((resolve, reject) => {
    if (!checkDatabaseAccess()) {
      reject(new Error("Bear database not accessible"));
      return;
    }

    const db = new sqlite3.Database(BEAR_CLOUDKIT_DB, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.get("SELECT COUNT(*) as total FROM Record", (err, totalRow: any) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }

        db.get("SELECT COUNT(*) as notes FROM Record WHERE zoneIdentifier LIKE '%Notes%'", (err, notesRow: any) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve({
              recordCount: totalRow.total,
              notesCount: notesRow.notes
            });
          }
        });
      });
    });
  });
}

// Experimental: Try to extract basic info from CloudKit records
function getNotesBasicInfo(): Promise<Array<{ id: string; modifiedDate: Date; dataSize: number }>> {
  return new Promise((resolve, reject) => {
    if (!checkDatabaseAccess()) {
      reject(new Error("Bear database not accessible"));
      return;
    }

    const db = new sqlite3.Database(BEAR_CLOUDKIT_DB, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        reject(err);
        return;
      }

      const query = `
        SELECT recordID, modificationTime, size 
        FROM Record 
        WHERE zoneIdentifier LIKE '%Notes%' 
        ORDER BY modificationTime DESC
      `;

      db.all(query, (err, rows: any[]) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          const notes = rows.map(row => ({
            id: row.recordID.split('-')[0], // Simplified ID
            modifiedDate: new Date(row.modificationTime * 1000),
            dataSize: row.size
          }));
          resolve(notes);
        }
      });
    });
  });
}

const server = new Server(
  {
    name: "bear-mcp-db",
    version: "4.0.0-experimental",
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
        description: "Set the Bear app token for accessing existing notes",
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
        name: "check_bear_database",
        description: "Check Bear database accessibility and get basic stats",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "list_notes_basic",
        description: "Get basic information about notes from database (experimental)",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "experimental_search",
        description: "Experimental database search (limited functionality)",
        inputSchema: {
          type: "object",
          properties: {
            term: {
              type: "string",
              description: "Search term (functionality limited due to data encoding)",
            },
          },
          required: ["term"],
        },
      },
      {
        name: "create_note",
        description: "Create a new note in Bear",
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
              description: "Comma separated tags",
            },
          },
          required: [],
        },
      },
      {
        name: "open_bear_search",
        description: "Open Bear with a search query",
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
        description: "Open Bear's tags view",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
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
              text: `Bear token saved. This experimental version attempts direct database access.`,
            },
          ],
        };
      }

      case "check_bear_database": {
        let statusMessage = "Bear Database Analysis (Experimental):\n\n";
        
        const hasDB = checkDatabaseAccess();
        if (!hasDB) {
          statusMessage += "❌ Bear database not found or not accessible\n";
          statusMessage += "Expected location: ~/Library/Containers/net.shinyfrog.bear/Data/CloudKit/.../Records.db\n";
          return {
            content: [{ type: "text", text: statusMessage }],
          };
        }
        
        statusMessage += "✅ Bear CloudKit database found\n";
        
        try {
          const stats = await getDatabaseStats();
          statusMessage += `📊 Total records: ${stats.recordCount}\n`;
          statusMessage += `📝 Note records: ${stats.notesCount}\n\n`;
          
          statusMessage += "⚠️ Limitation: Note content is stored in binary CloudKit format\n";
          statusMessage += "🔬 This is an experimental approach to read Bear's data directly\n";
          statusMessage += "💡 For reliable searching, use open_bear_search instead\n";
          
        } catch (error) {
          statusMessage += `❌ Database access error: ${error instanceof Error ? error.message : String(error)}\n`;
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

      case "list_notes_basic": {
        try {
          const notes = await getNotesBasicInfo();
          let resultText = `Found ${notes.length} notes in database:\n\n`;
          
          notes.slice(0, 10).forEach((note, index) => {
            resultText += `${index + 1}. ID: ${note.id}\n`;
            resultText += `   Modified: ${note.modifiedDate.toISOString()}\n`;
            resultText += `   Size: ${note.dataSize} bytes\n\n`;
          });
          
          if (notes.length > 10) {
            resultText += `... and ${notes.length - 10} more notes\n\n`;
          }
          
          resultText += "⚠️ Note: Cannot extract titles/content due to CloudKit binary encoding\n";
          resultText += "Use open_bear_search for actual note searching\n";
          
          return {
            content: [
              {
                type: "text",
                text: resultText,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Database access failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      }

      case "experimental_search": {
        return {
          content: [
            {
              type: "text",
              text: `❌ Experimental search for "${args.term}" is not yet functional.\n\nThe Bear database stores note content in binary CloudKit format that requires complex decoding.\n\nFor now, use 'open_bear_search' to search within Bear app.`,
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
              text: `Note created in Bear: "${args.title || "Untitled"}"`,
            },
          ],
        };
      }

      case "open_bear_search": {
        const params: BearParams = {
          term: String(args.term),
        };
        const token = loadToken();
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
        const token = loadToken();
        if (token) {
          params.token = token;
        }
        
        await executeBearURL("tags", params);
        
        return {
          content: [
            {
              type: "text",
              text: "Opened Bear's tags view",
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
  
  console.error("Bear MCP v4.0 (Database Experimental) running");
  console.error("Note: This version attempts direct database access but is limited by CloudKit encoding");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});