# Migration Guide: v0.1.0 to v0.2.0

## Overview

Version 0.2.0 introduces significant improvements to the Bear MCP server:

- **Data Retrieval**: Tools now return actual note content and metadata instead of just opening Bear
- **Callback Support**: Implements x-callback-url response handling
- **Better Integration**: Claude can now analyze and work with your note content directly

## Important: Bear Configuration Required

To use the new data retrieval features, you must enable x-callback-url responses in Bear:

1. Open Bear app
2. Go to Bear → Settings (⌘,)
3. Navigate to the "Advanced" tab
4. Enable "Allow x-callback-url"
5. **Important**: You may need to generate an app token for some features

## Breaking Changes

### Tool Updates

1. **`create_note`**
   - Now returns the created note's ID
   - Added `open_note` parameter (default: false)

2. **`open_note` → `get_note`**
   - Renamed for clarity
   - Returns actual note content
   - Added `open_note` parameter to optionally show in Bear

3. **`search_notes`**
   - Returns search results with metadata
   - Added `show_window` parameter (default: false)

4. **`get_tags`**
   - Returns list of all tags as data
   - Added `show_window` parameter

5. **Removed Tools** (temporarily):
   - `open_tag`, `rename_tag`, `delete_tag`
   - `trash_note`, `archive_note`, `grab_url`
   - These will be re-added in v0.3.0

## Usage Examples

### Before (v0.1.0)
```
"Search for notes about project" → Opens Bear with search results
```

### After (v0.2.0)
```
"Search for notes about project" → Returns:
Found 3 notes matching "project":

1. Project Roadmap 2024
   ID: ABC123
   Tags: work, planning
   Modified: 2024-01-15

2. Project Meeting Notes
   ID: DEF456
   Tags: work, meetings
   Modified: 2024-01-14
```

## Troubleshooting

If tools are not returning data:

1. **Check Bear Settings**: Ensure x-callback-url is enabled in Bear's Advanced settings
2. **Restart Claude Desktop**: After updating the MCP server
3. **Check Logs**: Look for timeout errors which may indicate Bear isn't configured properly

## Future Improvements

Version 0.3.0 will add:
- Token-based authentication for enhanced features
- All missing tools from v0.1.0
- Batch operations support
- Note export capabilities