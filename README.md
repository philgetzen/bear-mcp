# Bear MCP Server

An MCP (Model Context Protocol) server for integrating Bear Note Taking App with Claude Desktop.

## Features

This MCP server provides the following tools to interact with Bear:

### Note Operations
- **create_note** - Create a new note with title, text, and tags
- **open_note** - Open a specific note by ID or title
- **add_text** - Append, prepend, or replace text in existing notes
- **search_notes** - Search for notes by term or within specific tags

### Tag Management
- **get_tags** - List all tags in Bear
- **open_tag** - View notes with specific tag(s)
- **rename_tag** - Rename an existing tag
- **delete_tag** - Remove a tag from all notes

### Note Management
- **trash_note** - Move a note to trash
- **archive_note** - Archive a note
- **grab_url** - Create a note from a webpage

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

### Creating a Note
```
Use the bear create_note tool to create a new note titled "Meeting Notes" with the text "Discussion points for today's meeting" and tag it with "work,meetings"
```

### Searching Notes
```
Use the bear search_notes tool to find all notes containing "project roadmap"
```

### Managing Tags
```
Use the bear rename_tag tool to rename the tag "todo" to "tasks"
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