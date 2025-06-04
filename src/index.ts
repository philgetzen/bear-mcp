#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import open from "open";

const BEAR_URL_SCHEME = "bear://x-callback-url";

interface BearParams {
  [key: string]: string | undefined;
}

async function openBearURL(action: string, params: BearParams): Promise<void> {
  const url = new URL(`${BEAR_URL_SCHEME}/${action}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  });

  await open(url.toString());
}

const server = new Server(
  {
    name: "bear-mcp",
    version: "1.0.0",
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
              description: "Comma separated tags (e.g., 'work,ideas')",
            },
            clipboard: {
              type: "boolean",
              description: "Append clipboard content",
            },
            timestamp: {
              type: "boolean",
              description: "Prepend timestamp",
            },
          },
          required: [],
        },
      },
      {
        name: "open_note",
        description: "Open a specific note in Bear",
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
            header: {
              type: "string",
              description: "Header inside the note to jump to",
            },
            exclude_trashed: {
              type: "boolean",
              description: "Exclude trashed notes",
            },
            new_window: {
              type: "boolean",
              description: "Open in new window",
            },
            edit: {
              type: "boolean",
              description: "Open note in edit mode",
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
            new_line: {
              type: "boolean",
              description: "Add newline before text when appending",
            },
            tags: {
              type: "string",
              description: "Comma separated tags to add",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "search_notes",
        description: "Search for notes in Bear",
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
        description: "Get all tags in Bear",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "open_tag",
        description: "Show notes with specific tag(s)",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Tag name(s), comma separated for multiple",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "rename_tag",
        description: "Rename an existing tag",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Current tag name",
            },
            new_name: {
              type: "string",
              description: "New tag name",
            },
          },
          required: ["name", "new_name"],
        },
      },
      {
        name: "delete_tag",
        description: "Delete a tag from all notes",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Tag name to delete",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "trash_note",
        description: "Move a note to trash",
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
          },
          required: [],
        },
      },
      {
        name: "archive_note",
        description: "Archive a note",
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
          },
          required: [],
        },
      },
      {
        name: "grab_url",
        description: "Create a note from a webpage",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Webpage URL to grab",
            },
            tags: {
              type: "string",
              description: "Comma separated tags",
            },
          },
          required: ["url"],
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
      case "create_note": {
        const params: BearParams = {};
        if (args.title) params.title = String(args.title);
        if (args.text) params.text = String(args.text);
        if (args.tags) params.tags = String(args.tags);
        if (args.clipboard) params.clipboard = "yes";
        if (args.timestamp) params.timestamp = "yes";
        
        await openBearURL("create", params);
        return {
          content: [
            {
              type: "text",
              text: "Note created successfully",
            },
          ],
        };
      }

      case "open_note": {
        const params: BearParams = {};
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        if (args.header) params.header = String(args.header);
        if (args.exclude_trashed) params.exclude_trashed = "yes";
        if (args.new_window) params.new_window = "yes";
        if (args.edit) params.edit = "yes";
        
        await openBearURL("open-note", params);
        return {
          content: [
            {
              type: "text",
              text: "Note opened successfully",
            },
          ],
        };
      }

      case "add_text": {
        const params: BearParams = {
          text: String(args.text),
        };
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        if (args.mode) params.mode = String(args.mode);
        if (args.new_line) params.new_line = "yes";
        if (args.tags) params.tags = String(args.tags);
        
        await openBearURL("add-text", params);
        return {
          content: [
            {
              type: "text",
              text: "Text added successfully",
            },
          ],
        };
      }

      case "search_notes": {
        const params: BearParams = {
          term: String(args.term),
        };
        if (args.tag) params.tag = String(args.tag);
        
        await openBearURL("search", params);
        return {
          content: [
            {
              type: "text",
              text: "Search opened in Bear",
            },
          ],
        };
      }

      case "get_tags": {
        await openBearURL("tags", {});
        return {
          content: [
            {
              type: "text",
              text: "Tags list opened in Bear",
            },
          ],
        };
      }

      case "open_tag": {
        const params: BearParams = {
          name: String(args.name),
        };
        
        await openBearURL("open-tag", params);
        return {
          content: [
            {
              type: "text",
              text: "Tag notes opened successfully",
            },
          ],
        };
      }

      case "rename_tag": {
        const params: BearParams = {
          name: String(args.name),
          new_name: String(args.new_name),
        };
        
        await openBearURL("rename-tag", params);
        return {
          content: [
            {
              type: "text",
              text: "Tag renamed successfully",
            },
          ],
        };
      }

      case "delete_tag": {
        const params: BearParams = {
          name: String(args.name),
        };
        
        await openBearURL("delete-tag", params);
        return {
          content: [
            {
              type: "text",
              text: "Tag deleted successfully",
            },
          ],
        };
      }

      case "trash_note": {
        const params: BearParams = {};
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        
        await openBearURL("trash", params);
        return {
          content: [
            {
              type: "text",
              text: "Note moved to trash",
            },
          ],
        };
      }

      case "archive_note": {
        const params: BearParams = {};
        if (args.id) params.id = String(args.id);
        if (args.title) params.title = String(args.title);
        
        await openBearURL("archive", params);
        return {
          content: [
            {
              type: "text",
              text: "Note archived successfully",
            },
          ],
        };
      }

      case "grab_url": {
        const params: BearParams = {
          url: String(args.url),
        };
        if (args.tags) params.tags = String(args.tags);
        
        await openBearURL("grab-url", params);
        return {
          content: [
            {
              type: "text",
              text: "URL content grabbed successfully",
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
  console.error("Bear MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});