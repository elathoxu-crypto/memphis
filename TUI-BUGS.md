# TUI Bug Report - Memphis v1.7.6

**Date:** 2026-03-02  
**Reporter:** Watra (2nd PC)  
**Environment:** Ubuntu, Node v24.14.0, Memphis v1.7.6

---

## 🚨 CRITICAL BUGS

### Bug #1: 'q' Key Not Working (Exit Failure)

**Severity:** CRITICAL  
**Impact:** User cannot exit TUI normally

**Steps to Reproduce:**
1. Launch TUI: `node dist/cli/index.js tui`
2. Press 'q' to quit
3. Nothing happens

**Expected Behavior:**
- TUI should exit cleanly when 'q' is pressed
- Return to normal terminal

**Actual Behavior:**
- 'q' key is ignored
- User trapped in TUI
- Must kill process externally: `pkill -9 -f "node.*tui"`

**Workaround:**
```bash
# New terminal
pkill -9 -f "node.*tui"
```

**Root Cause:**
- Key binding not registered in pi-tui
- Event handler missing for 'q' key
- Process signal handling broken

**Suggested Fix:**
```typescript
// src/tui/nexus-poc.ts
// Check key binding registration
tui.on('key', (key) => {
  if (key === 'q' || key === 'Q') {
    process.exit(0);
  }
});
```

---

### Bug #2: DEBUG Output Corrupts Display

**Severity:** HIGH  
**Impact:** Unusable interface, text unreadable

**Steps to Reproduce:**
1. Launch TUI: `node dist/cli/index.js tui`
2. Type message and press Enter
3. DEBUG output appears in middle of screen

**Expected Behavior:**
- Clean interface
- No debug messages in TUI
- Messages saved silently

**Actual Behavior:**
```
[Nexus] Saved to chain: journal#9
[DEBUG] Active handles (exit): [ 'Socket', 'Socket', 'Socket' ]
[DEBUG] Active requests (exit): []
[DEBUG] stdin: isTTY=undefined readable=true
```

**Output corrupts TUI display:**
- Text overlaps
- Prompt line jumps to top
- Interface becomes unreadable

**Workaround:**
```bash
DEBUG="" node dist/cli/index.js tui
```

**Root Cause:**
- `execSync()` to journal command inherits DEBUG env
- Child process outputs debug info
- TUI doesn't suppress stdout from subprocesses

**Suggested Fix:**
```typescript
// src/tui/nexus-poc.ts
// Line ~1250
const result = execSync(
  `node dist/cli/index.js journal "${taggedContent}" --tags nexus,chat,${from.toLowerCase()}`,
  { 
    encoding: "utf-8", 
    cwd: process.cwd(),
    env: { ...process.env, DEBUG: "" }  // ← ADD THIS
  }
);
```

**Alternative Fix (config):**
```yaml
# ~/.memphis/config.yaml
debug: false
logLevel: error
```

---

### Bug #3: Terminal Corruption on Exit

**Severity:** HIGH  
**Impact:** Terminal unusable after TUI crash

**Steps to Reproduce:**
1. Launch TUI: `node dist/cli/index.js tui`
2. Use TUI for a while
3. Kill process: `Ctrl+C` or `pkill`
4. Terminal display corrupted

**Expected Behavior:**
- Clean exit
- Terminal restored to normal state
- No display artifacts

**Actual Behavior:**
- Prompt line jumps to top of screen
- Text unreadable
- Alternate screen buffer not cleared
- Terminal in raw mode

**Evidence:**
- Screenshot shows corrupted display
- Prompt at wrong position
- Text overlapping

**Workaround:**
```bash
reset
# or close terminal and open new one
```

**Root Cause:**
- pi-tui doesn't properly restore terminal on exit
- Alternate screen buffer not cleared
- Terminal settings not restored (stty)
- Process exit without cleanup

**Suggested Fix:**
```typescript
// src/tui/nexus-poc.ts
// Add cleanup on exit
process.on('exit', () => {
  tui.destroy();
  process.stdout.write('\x1B[?1049l'); // Exit alternate screen
});

process.on('SIGINT', () => {
  tui.destroy();
  process.stdout.write('\x1B[?1049l');
  process.exit(0);
});
```

---

### Bug #4: Terminal Hang (Freeze)

**Severity:** CRITICAL  
**Impact:** Complete system hang

**Steps to Reproduce:**
1. Launch TUI: `node dist/cli/index.js tui`
2. Use for extended period
3. Try to exit with 'q' (doesn't work)
4. Try Ctrl+C (may not work)
5. Terminal freezes

**Expected Behavior:**
- Responsive exit
- No hangs

**Actual Behavior:**
- Terminal unresponsive
- No input accepted
- Must kill from another terminal

**Workaround:**
```bash
# From another terminal
pkill -9 -f "node.*tui"
```

**Root Cause:**
- Event loop blocked
- stdin in wrong mode
- Process not handling signals

---

## 📊 ENVIRONMENT DETAILS

**System:**
```
OS: Ubuntu (WSL2)
Node: v24.14.0
Memphis: v1.7.6
Machine: Watra (2nd PC)
```

**Memphis Config:**
```yaml
provider:
  name: ollama
  model: qwen2.5-coder:3b
embeddings:
  backend: ollama
  model: nomic-embed-text
```

**Chains:**
```
journal: 17 blocks
decisions: 1 block
vault: 1 block
```

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1: Fix DEBUG Output (Quick Win)
**Time:** 10 minutes  
**Impact:** Immediate UX improvement

```typescript
// src/tui/nexus-poc.ts
// Add env: { ...process.env, DEBUG: "" } to ALL execSync calls
```

### Priority 2: Fix 'q' Key Handler
**Time:** 15 minutes  
**Impact:** Users can exit normally

```typescript
// Check pi-tui key binding
// Ensure process.exit() called on 'q'
```

### Priority 3: Fix Terminal Cleanup
**Time:** 20 minutes  
**Impact:** No terminal corruption

```typescript
// Add cleanup handlers
// Restore terminal settings
// Clear alternate screen buffer
```

### Priority 4: Add Graceful Exit
**Time:** 10 minutes  
**Impact:** Prevent hangs

```typescript
// Handle SIGINT, SIGTERM
// Cleanup resources
// Exit cleanly
```

---

## 🧪 TESTING CHECKLIST

After fixes:

- [ ] Launch TUI
- [ ] Type message, save
- [ ] No DEBUG output visible
- [ ] Press 'q' - exits cleanly
- [ ] Terminal restored normally
- [ ] No corruption
- [ ] Ctrl+C works as backup exit
- [ ] No hangs

---

## 📝 NOTES

**Good News:**
- TUI DOES save entries (journal: 9 → 17 blocks)
- Core functionality works
- Only UX/display issues

**Bad News:**
- Unusable in current state
- Blocks adoption
- Requires terminal skills to recover

**Workaround:**
- Use CLI instead: `node dist/cli/index.js journal "msg"`
- Avoid TUI until fixed

---

## 🚀 NEXT STEPS

1. **Fix on Style (main PC):**
   ```bash
   cd ~/memphis
   # Edit src/tui/nexus-poc.ts
   # Apply fixes above
   npm run build
   node dist/cli/index.js tui  # Test
   ```

2. **Commit & Push:**
   ```bash
   git add src/tui/nexus-poc.ts
   git commit -m "fix(tui): critical bugs - debug output, q key, terminal cleanup"
   git push
   ```

3. **Pull on Watra:**
   ```bash
   cd ~/memphis
   git pull
   npm run build
   node dist/cli/index.js tui  # Verify fixes
   ```

---

**Report Generated:** 2026-03-02 14:25 CET  
**Status:** CRITICAL - Blocks TUI Usage  
**Assignee:** Style (main PC dev environment)
