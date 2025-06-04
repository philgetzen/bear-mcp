# Bear MCP Server

![CI/CD](https://github.com/philgetzen/bear-mcp/workflows/CI%2FCD%20Pipeline/badge.svg)
![License](https://img.shields.io/github/license/philgetzen/bear-mcp)
![npm version](https://img.shields.io/npm/v/bear-mcp)

An MCP (Model Context Protocol) server for integrating Bear Note Taking App with Claude Desktop. This server allows Claude to read, create, and search your Bear notes directly.

## Features

**v0.2.0 Update**: Now with full data retrieval! Claude can read and analyze your note content directly.

### Core Operations
- **create_note** - Create a new note and get its ID back
- **get_note** - Retrieve full note content for analysis
- **search_notes** - Search and get results with metadata
- **get_tags** - List all tags in your Bear database
- **add_text** - Append, prepend, or replace text in notes

### Key Improvements in v0.2.0
- 📖 **Content Retrieval**: Tools now return actual note content
- 🔍 **Search Results**: Get note metadata without opening Bear
- 🏷️ **Tag Lists**: Retrieve all tags programmatically
- 🆔 **Note IDs**: Create operations return note identifiers

## Important: Bear Configuration

### Required Settings:
1. **Enable x-callback-url**:
   - Open Bear → Settings (⌘,)
   - Go to "Advanced" tab
   - Enable "Allow x-callback-url"

2. **Generate API Token** (for search and tags):
   - Open Bear → Help → Advanced → API Token
   - Click "Copy Token"
   - In Claude, use: `set_bear_token` with your token

Without these settings, tools will have limited functionality.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bear-mcp.git
cd bear-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration in Claude Desktop

Add the server to your Claude Desktop configuration file:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bear": {
      "command": "node",
      "args": ["/path/to/bear-mcp/dist/index.js"]
    }
  }
}
```

### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bear": {
      "command": "node",
      "args": ["C:\\path\\to\\bear-mcp\\dist\\index.js"]
    }
  }
}
```

## Usage Examples

Once configured, you can use Bear tools in Claude Desktop:

### Creating and Getting Notes
```
Create a new Bear note titled "Project Ideas" with content about machine learning applications

Get the content of my Bear note titled "Meeting Notes" so you can summarize it
```

### Searching and Analyzing
```
Search my Bear notes for "project roadmap" and show me what you find

Get all my Bear tags and identify which ones might be redundant
```

### Working with Content
```
Add "## Action Items\n- Follow up with team" to my Bear note titled "Weekly Review"
```

## Development

To run in development mode:
```bash
npm run dev
```

## Requirements

- Node.js 18 or higher
- Bear app installed on your system
- Claude Desktop application

## License

MIT