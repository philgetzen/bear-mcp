# Bear MCP Server

![CI/CD](https://github.com/philgetzen/bear-mcp/workflows/CI%2FCD%20Pipeline/badge.svg)
![License](https://img.shields.io/github/license/philgetzen/bear-mcp)
![npm version](https://img.shields.io/npm/v/bear-mcp)

An MCP (Model Context Protocol) server for integrating Bear Note Taking App with Claude Desktop. This server allows Claude to read, create, and search your Bear notes directly.

<a href="https://glama.ai/mcp/servers/@philgetzen/bear-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@philgetzen/bear-mcp/badge" alt="Bear Server MCP server" />
</a>

## ✨ Features (v4.0.2)

**Full data retrieval capabilities:**
- 🔍 **Search notes** and get complete results with metadata
- 🏷️ **Retrieve all tags** from your Bear database
- 📖 **Read note content** for analysis and summarization
- ✏️ **Create notes** and get their IDs back
- 📝 **Add text** to existing notes
- ✅ **Test setup** with comprehensive status checking

## ⚠️ Current Limitations & Usage Guidelines

### Browser Window Behavior
**Expected**: Brief browser windows may appear during search/tags operations due to Bear's callback system.
- Windows are automatically minimized and moved off-screen
- Auto-close within 1-2 seconds in most cases
- **Safe to manually close** if they persist
- **Focus is returned** to your original window automatically

### Search Reliability
**Success Rate**: ~80-90% of searches work reliably
- **Occasional timeouts** may occur (20-second limit)
- **Simple terms** work better than complex queries
- **Retry once** if a search times out
- **Single words** tend to be more reliable than phrases

### Best Practices
✅ **Recommended Usage**:
```
Search my Bear notes for "project"
Get all my Bear tags
Create a note titled "Meeting Notes" with today's agenda
Add "Action item: Follow up" to my "Weekly Review" note
```

⚠️ **If Issues Occur**:
- **Timeouts**: Wait a moment and retry the same search
- **Browser windows**: Safe to close manually if they don't auto-close
- **No results**: Try simpler/broader search terms
- **Setup issues**: Use `check_bear_setup` to diagnose

## Available Tools

| Tool | Functionality | Reliability | Notes |
|------|---------------|-------------|-------|
| `create_note` | Creates new notes | ✅ Excellent | Always works, returns ID |
| `add_text` | Adds text to notes | ✅ Excellent | Reliable text addition |
| `check_bear_setup` | Tests configuration | ✅ Excellent | Diagnostic tool |
| `search_notes` | Searches notes | ⚠️ Good | ~80-90% success, may timeout |
| `get_tags` | Lists all tags | ⚠️ Good | Usually works, brief popup |
| `get_note` | Retrieves note content | ⚠️ Good | Works well with valid IDs |

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
Check my Bear setup and show me what's available
```

### Reliable Operations (Always Work)
```
Create a new Bear note titled "Project Ideas" with content about machine learning

Add "## Next Steps\n- Review documentation\n- Schedule follow-up" to my "Weekly Review" note
```

### Search Operations (Usually Work)
```
Search my Bear notes for "machine learning" and show me what you find

Get all my Bear tags and help me organize them
```

### Content Analysis (When Search Works)
```
Search for "meeting notes" then help me identify common action items across all results

Find notes tagged with "work" and summarize the main topics
```

## Troubleshooting

### "Search failed: Callback timeout"
- **Normal**: Happens ~10-20% of the time
- **Solution**: Wait 5-10 seconds and retry the same search
- **Tip**: Try simpler search terms (single words work better)

### "No token configured"
Get your token: Bear → Help → Advanced → API Token → Copy Token, then use `set_bear_token`

### "Bear not found"
Make sure Bear is installed and has been opened at least once.

### Browser windows appearing
- **Expected behavior** due to Bear's callback system
- Windows auto-minimize and move off-screen
- Safe to manually close if they persist
- Focus returns to your original window automatically

### No search results
- **Check search term**: Ensure it exists in your notes
- **Verify token**: Use `check_bear_setup` to test
- **Try broader terms**: Single words often work better than phrases
- **Check Bear directly**: Verify the content exists in Bear app

## Technical Details

### HTTP Callback System
The server uses HTTP callbacks (port 51234) to receive data from Bear:
- Bear sends search results and tag data via URL callbacks
- Browser windows appear briefly due to this callback mechanism
- 20-second timeout for Bear responses
- Auto-retry mechanisms for common failures

### Performance Characteristics
- **Fast operations**: Note creation, text addition (~1-2 seconds)
- **Medium operations**: Single note retrieval (~3-5 seconds)  
- **Slower operations**: Search, tags list (~5-15 seconds)
- **Timeout threshold**: 20 seconds maximum wait

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

## Version History

- **v4.0.2**: Enhanced browser window handling, 20s timeout
- **v4.0.1**: Improved callback reliability, better error messages  
- **v4.0.0**: Full functionality restored with callback system
- **v3.1.0**: Documentation-only version (limited functionality)

## Requirements

- Node.js 18 or higher
- Bear app installed on your system
- Claude Desktop application
- macOS (Bear is macOS-only)

## License

MIT