# Memphis TUI Test Guide

## Quick Start

```bash
cd ~/memphis
node dist/cli/index.js tui
```

---

## Phase 3 Features (4/4)

### 1. Search Integration

**Commands:**
```
/search <query>
/recall <query>
/s <query>
```

**Test:**
1. Type `/search meeting`
2. Press Enter
3. Should show results with relevance scores:
   - 🎯 [89%] - High relevance
   - ✓ [75%] - Medium relevance
   - ○ [60%] - Low relevance

### 2. Tab Autocomplete

**Test:**
1. Type `/` in the editor
2. Press `Tab`
3. Should show dropdown with commands:
   - /j - Quick journal entry
   - /a - Ask Memphis a question
   - /search - Search memories
   - /theme - Toggle theme
   - /sidebar - Toggle journal sidebar
   - /history - Show command history
   - /config - Show TUI configuration
   - /export-config - Export config
   - /import-config - Import config
   - etc.

4. Use arrow keys to select
5. Press Enter to complete

### 3. Recall Widget

**Test:**
1. Type a message longer than 10 characters
2. Similar messages should appear inline
3. Shows relevance score [75%]
4. Press ESC to dismiss

### 4. Sync Status

**Commands:**
```
/sync
```

**Status Bar Indicators:**
- 🔄 Syncing - Active sync
- ✅ Synced - Recently synced
- ○ Not configured - No network

---

## Phase 4 Features (4/4)

### 1. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+J | Quick journal mode |
| Ctrl+R | Search/Recall mode |
| Ctrl+S | Toggle journal sidebar |
| Ctrl+T | Toggle theme (dark/light) |
| Tab | Autocomplete |
| ↑/↓ | Command history |
| q | Quit |

**Test:**
1. Press `Ctrl+J` - should pre-fill `/j `
2. Press `Ctrl+R` - should pre-fill `/search `
3. Press `Ctrl+S` - should toggle sidebar
4. Press `Ctrl+T` - should toggle theme

### 2. Theme System

**Commands:**
```
/theme
```

**Test:**
1. Press `Ctrl+T` or type `/theme`
2. Status bar should show 🌙 (dark) or ☀️ (light)
3. UI colors should change

**Themes:**
- **Dark**: Cyan primary
- **Light**: Blue primary

### 3. Command History

**Commands:**
```
/history
```

**Test:**
1. Run a few commands (`/status`, `/sync`, etc.)
2. Type `/history`
3. Should show last 10 commands
4. Press ↑ to navigate history in editor

### 4. Help System

**Commands:**
```
/help
```

**Test:**
1. Type `/help`
2. Should show:
   - Keyboard shortcuts
   - All commands with descriptions
   - Current theme mode
   - Sidebar status

---

## Phase 5 Features (4/4)

### 1. Journal Sidebar

**Commands:**
```
/sidebar
Ctrl+S
```

**Test:**
1. Press `Ctrl+S` or type `/sidebar`
2. Should see:
   - "📖 Recent Journal" header
   - Last 10 journal entries
   - Entry index (#123)
   - Timestamp
   - 50-char preview

3. Status bar should show 📖 indicator
4. Press `Ctrl+S` again to hide

### 2. Configuration Persistence

**Config File:** `~/.memphis/tui-config.json`

**Test:**
1. Change theme: `/theme`
2. Enable sidebar: `/sidebar`
3. Quit TUI: `q`
4. Restart TUI
5. Settings should persist

**Config Contents:**
```json
{
  "theme": "dark",
  "sidebarEnabled": true,
  "sidebarWidth": 35,
  "keybindings": {
    "quickJournal": "Ctrl+J",
    "search": "Ctrl+R",
    "toggleSidebar": "Ctrl+S",
    "toggleTheme": "Ctrl+T"
  },
  "maxHistorySize": 100
}
```

### 3. Export/Import Config

**Commands:**
```
/config         - Show current config
/export-config  - Export to file
/import-config  - Import from file
/reset-config   - Reset to defaults
```

**Test Export:**
1. Type `/export-config`
2. Should show: `✓ Config exported to: ~/.memphis/tui-config-export.json`
3. File should include command history

**Test Import:**
1. Edit exported file
2. Type `/import-config`
3. Should apply imported settings

**Test Reset:**
1. Type `/reset-config`
2. Should show: `✓ Config reset to defaults`
3. Theme should be dark
4. Sidebar should be disabled

### 4. Status Bar Enhancements

**Indicators:**
```
📚 834 journal │ Last: 17m ago │ ✓ ollama/qwen2.5-coder │ 🧠 54 learned │ 💡 2 │ ✅ │ 📖 │ 🌙 │ Ctrl+J journal Ctrl+R search [q] quit │ ⏱️ 12:05
```

**Elements:**
- 📚 Journal count
- Last activity time
- ✓ Provider/model
- 🧠 Learned patterns
- 💡 Suggestions count
- ✅ Sync status
- 📖 Sidebar indicator
- 🌙/☀️ Theme indicator
- Keyboard hints
- Current time

---

## Complete Command Reference

### Memory Commands
- `/j <text>` - Quick journal entry
- `/a <question>` - Ask Memphis
- `/d <decision>` - Record a decision

### Search Commands
- `/search <query>` - Search memories
- `/recall <query>` - Recall from chains
- `/s <query>` - Short search alias

### TUI Commands
- `/theme` - Toggle theme
- `/sidebar` - Toggle journal sidebar
- `/history` - Show command history
- `/config` - Show TUI configuration
- `/export-config` - Export config
- `/import-config` - Import config
- `/reset-config` - Reset to defaults

### System Commands
- `/sync` - Show network sync status
- `/status` - Show system status
- `/agents` - Show connected agents
- `/suggestions` - Show pending suggestions
- `/clear` - Clear chat
- `/help` - Show help
- `/quit` - Exit TUI

### Keyboard Shortcuts
- `Ctrl+J` - Quick journal
- `Ctrl+R` - Search
- `Ctrl+S` - Toggle sidebar
- `Ctrl+T` - Toggle theme
- `Tab` - Autocomplete
- `↑/↓` - History navigation
- `q` - Quit

---

## Test Checklist

### Phase 3
- [ ] Search returns results
- [ ] Search shows relevance scores
- [ ] Tab triggers autocomplete
- [ ] Autocomplete shows descriptions
- [ ] Recall widget appears
- [ ] Sync status shows in bar
- [ ] /sync shows details

### Phase 4
- [ ] Ctrl+J pre-fills /j
- [ ] Ctrl+R pre-fills /search
- [ ] Ctrl+S toggles sidebar
- [ ] Ctrl+T toggles theme
- [ ] /theme works
- [ ] /history shows commands
- [ ] ↑/↓ navigate history
- [ ] /help shows all info

### Phase 5
- [ ] Sidebar shows journal entries
- [ ] Sidebar shows timestamps
- [ ] 📖 indicator appears
- [ ] /config shows settings
- [ ] /export-config creates file
- [ ] /import-config loads file
- [ ] /reset-config resets
- [ ] Settings persist on restart

---

## Troubleshooting

### TUI doesn't start
```bash
# Check if dist exists
ls -la dist/cli/index.js

# Rebuild
npm run build
```

### Sidebar doesn't show journal
```bash
# Check if journal has entries
ls ~/.memphis/chains/journal/ | head

# Check chain stats
node dist/cli/index.js status
```

### Config not persisting
```bash
# Check config file
cat ~/.memphis/tui-config.json

# Check permissions
ls -la ~/.memphis/tui-config.json
```

### Theme not changing
```bash
# Check if config file is writable
touch ~/.memphis/test && rm ~/.memphis/test

# Try reset
# In TUI: /reset-config
```

---

## Performance Notes

- Journal sidebar loads 15 entries
- Command history stores 100 items
- Config file is ~500 bytes
- Export file includes 50 history items

---

## Version

- TUI Version: v1.7.5
- Phases Complete: 3, 4, 5 (12/12 features)
- Last Updated: 2026-03-02
