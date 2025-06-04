# Bear MCP Server

![CI/CD](https://github.com/philgetzen/bear-mcp/workflows/CI%2FCD%20Pipeline/badge.svg)
![License](https://img.shields.io/github/license/philgetzen/bear-mcp)
![npm version](https://img.shields.io/npm/v/bear-mcp)

An MCP (Model Context Protocol) server for integrating Bear Note Taking App with Claude Desktop. This server provides tools to create notes and interact with Bear directly.

## ⚠️ Important Limitations (v3.0.0)

**Bear's API Design**: Bear's x-callback-url system is designed for app-to-app communication, not data retrieval. This creates fundamental limitations in what this MCP server can accomplish.

### What Works ✅
- **Creating notes** - Works perfectly, note is created in Bear
- **Opening Bear with search** - Opens Bear app with your search term
- **Opening Bear's tags view** - Opens Bear's tag management interface
- **Adding text to notes** - Appends/prepends text to existing notes

### What Doesn't Work ❌
- **Reading note content** - Cannot retrieve note text due to Bear API limitations
- **Search results** - Cannot get search results, only opens Bear with search
- **Tag lists** - Cannot retrieve tag lists, only opens Bear's tag view
- **Note metadata** - Cannot get note titles, modification dates, etc.

## Available Tools

### Core Operations
| Tool | Functionality | Behavior |
|------|---------------|----------|
| `create_note` | Creates new notes | ✅ **Works**: Creates note in Bear |
| `add_text` | Adds text to existing notes | ✅ **Works**: Modifies notes in Bear |
| `open_bear_search` | Search within Bear | ✅ **Works**: Opens Bear with search term |
| `open_bear_tags` | View tags in Bear | ✅ **Works**: Opens Bear's tag interface |

### Limited Operations
| Tool | What It Does | Limitation |
|------|--------------|------------|
| `get_note` | Attempts to open note | ⚠️ **Limited**: Only opens note in Bear, cannot return content |
| `search_notes` | Attempts to search | ⚠️ **Limited**: Recommends using `open_bear_search` instead |
| `get_tags` | Attempts to list tags | ⚠️ **Limited**: Recommends using `open_bear_tags` instead |

## User Experience Expectations

### ✅ Excellent for:
- **Note Creation**: "Create a note about today's meeting with agenda items"
- **Content Addition**: "Add these action items to my project planning note"
- **Guided Search**: "Help me search for notes about machine learning" (opens Bear with search)

### ⚠️ Limited for:
- **Content Analysis**: Cannot read existing notes to analyze or summarize
- **Automated Search**: Cannot retrieve search results for processing
- **Data Export**: Cannot extract note data for external use

### ❌ Not Suitable for:
- **Content Retrieval**: Reading existing note content
- **Bulk Operations**: Processing multiple notes at once
- **Data Analytics**: Analyzing note patterns or tag usage

## Why These Limitations Exist

Bear's x-callback-url API was designed for **app-to-app communication** where:
1. One app sends a command to Bear
2. Bear performs the action
3. Bear optionally opens a callback URL in the requesting app

This works great for mobile apps but doesn't work for command-line tools like MCP servers because:
- Callbacks require HTTP servers (causes browser windows to open)
- Bear expects to send responses via URL schemes
- No direct data return mechanism exists

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

2. **Generate API Token** (recommended):
   - Open Bear → Help → Advanced → API Token
   - Click "Copy Token"
   - In Claude, use: `set_bear_token` with your token

## Usage Examples

### ✅ Recommended Usage Patterns

**Creating Content:**
```
Create a new Bear note titled "Weekly Planning" with sections for goals, tasks, and notes
```

**Adding to Existing Notes:**
```
Add these meeting notes to my "Project Alpha" note: [your content here]
```

**Guided Search:**
```
Help me search my Bear notes for information about "quarterly planning" - open Bear with the search
```

### ⚠️ Adjust Expectations

**Instead of:** "Search my Bear notes and summarize what you find about project management"
**Try:** "Open Bear to search for project management notes, then I'll copy relevant content for you to analyze"

**Instead of:** "Get my Bear note titled 'Ideas' and add more brainstorming points"
**Try:** "Add these brainstorming points to my Bear note titled 'Ideas': [your points]"

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

## Alternative Approaches Investigated

We explored direct database access to Bear's CloudKit storage but found:
- Bear stores data in binary CloudKit format (protobuf-like encoding)
- Note content is heavily encoded and not extractable
- Only metadata (record IDs, timestamps) are readable
- This approach is not viable for content retrieval

## Requirements

- Node.js 18 or higher
- Bear app installed on your system
- Claude Desktop application
- macOS (Bear is macOS-only)

## License

MIT