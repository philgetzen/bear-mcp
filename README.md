# Bear MCP Server

![CI/CD](https://github.com/philgetzen/bear-mcp/workflows/CI%2FCD%20Pipeline/badge.svg)
![License](https://img.shields.io/github/license/philgetzen/bear-mcp)
![npm version](https://img.shields.io/npm/v/bear-mcp)

An MCP (Model Context Protocol) server for integrating Bear Note Taking App with Claude Desktop. This server allows Claude to read, create, and search your Bear notes directly.

## ✨ Features (v4.0.0)

**Full data retrieval restored!** Claude can now:
- 🔍 **Search notes** and get full results with metadata
- 🏷️ **Retrieve all tags** from your Bear database
- 📖 **Read note content** for analysis
- ✏️ **Create notes** and get their IDs back
- 📝 **Add text** to existing notes

### What's New in v4.0.0
- ✅ **Fixed browser popup issues** - No more lingering browser windows!
- ✅ **Improved HTTP callback handling** - Auto-closing responses
- ✅ **Better error handling** - Clear error messages and recovery
- ✅ **Silent operation** - Bear stays in background during operations

## Available Tools

| Tool | Functionality | Returns |
|------|---------------|---------|
| `create_note` | Creates new notes | ✅ Note ID and title |
| `get_note` | Retrieves note content | ✅ Full note text, tags, dates |
| `search_notes` | Searches notes | ✅ List with titles, IDs, tags |
| `get_tags` | Lists all tags | ✅ Complete tag list |
| `add_text` | Adds text to notes | ✅ Success confirmation |
| `check_bear_setup` | Tests configuration | ✅ Setup status and sample data |

## Installation

1. Clone the repository:
```bash
git clone https://github.com/philgetzen/bear-mcp.git
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

## Bear Configuration

### Required Settings:
1. **Enable x-callback-url**:
   - Open Bear → Settings (⌘,)
   - Go to "Advanced" tab
   - Enable "Allow x-callback-url"

2. **Generate API Token** (for search and tags):
   - Open Bear → Help → Advanced → API Token
   - Click "Copy Token"
   - In Claude, use: `set_bear_token` with your token

## Usage Examples

### Setup and Testing
```
Check my Bear setup and show me a summary of what's available
```

### Creating and Reading Notes
```
Create a new Bear note titled "Project Ideas" with content about machine learning applications

Get the content of my Bear note titled "Meeting Notes" so you can summarize it
```

### Searching and Organizing
```
Search my Bear notes for "project roadmap" and show me what you find

Get all my Bear tags and identify which ones might be redundant
```

### Working with Content
```
Add "## Action Items\n- Follow up with team" to my Bear note titled "Weekly Review"
```

## Technical Details

### HTTP Callback Handling
The server uses a local HTTP server (port 51234) to receive Bear's x-callback-url responses. When Bear completes an operation, it sends the results back to this server. The new implementation:

- Sends proper CORS headers for browser compatibility
- Returns auto-closing HTML pages to prevent lingering windows
- Implements request timeouts for reliability
- Cleans up connections immediately after use

### Browser Window Behavior
If you see a browser window flash briefly when using the tools, this is normal. The window should close automatically within a second. If windows persist, check your browser's popup settings.

## Troubleshooting

### "No token configured"
Get your token from Bear → Help → Advanced → API Token, then use the `set_bear_token` tool.

### "Bear not found"
Make sure Bear is installed and has been opened at least once.

### Browser windows not closing
- Check your browser allows JavaScript to close windows
- The window should show "✓ Success! This window will close automatically..."
- If issues persist, you can safely close these windows manually

### No search results
- Ensure your search term exists in your notes
- Check that your token is valid using `check_bear_setup`
- Try a simpler search term

## Development

To run in development mode:
```bash
npm run dev
```

To test the server:
```bash
npm run build
node dist/index.js
```

To run the test script:
```bash
node test-restored.js
```

## Requirements

- Node.js 18 or higher
- Bear app installed on your system
- Claude Desktop application
- macOS (Bear is macOS-only)

## License

MIT