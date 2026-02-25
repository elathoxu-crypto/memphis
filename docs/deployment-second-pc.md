# Deployment: Second PC (Ubuntu + GTX 1060)

Plan przeniesienia Memphis na drugi komputer z Ubuntu oraz GPU GTX 1060 (3 GB). Celem jest pełna synchronizacja pamięci, przygotowanie Style (OpenClaw) do pracy na `o3:mini` oraz zachowanie zasad bezpieczeństwa (vault via TUI, offline toggle).

## Checklist

### System & środowisko
- [ ] `sudo apt update && sudo apt upgrade`
- [ ] `sudo apt install build-essential curl git python3 python3-pip zip unzip`
- [ ] `sudo ubuntu-drivers autoinstall` + restart

### GPU / CUDA
- [ ] Zweryfikuj kompatybilność CUDA (np. CUDA 12) i zainstaluj toolchain
- [ ] `nvidia-smi` + `nvcc --version`

### Repo & zależności
- [ ] `git clone https://github.com/memphis-chains/memphis.git ~/memphis`
- [ ] `npm install` (ew. dodatkowe `pip install -r requirements.txt`)
- [ ] Skonfiguruj `.memphis` (przenieś z głównego hosta lub `memphis init`)

### Modele & offline toggle
- [ ] Zainstaluj Ollamę / lokalny LLM kompatybilny z GTX 1060 (`curl https://ollama.com/install.sh | sh`)
- [ ] `ollama pull qwen2.5-coder:3b` (rekomendowany model do offline)
- [ ] Ustaw `qwen2.5-coder:3b` jako primary (Ollama), `o3:mini` jako fallback dla Style
- [ ] Ustaw `status: "offline"` w `config/offline-toggle.json` i loguj każdy toggle tagiem `offline-toggle`

### Synchronizacja pamięci
- [ ] `rsync ~/.memphis/` z głównego hosta
- [ ] `memphis status`, `memphis recall` – weryfikacja integralności
- [ ] Dodaj tagi `agent:style`, `model:o3-mini` tam gdzie trzeba

### Vault & bezpieczeństwo
- [ ] `memphis vault init` (jeśli potrzeba)
- [ ] Import kluczy/SSI tylko przez TUI
- [ ] Tagi: `security`, `vault`, `workflow`; przypomnienie o rotacji kluczy

### Monitoring & backup
- [ ] Watchdog (cron z `memphis status` i logowaniem do `ops`)
- [ ] Backupy (`rsync`/`zip`) + manifest
- [ ] Pakiet dokumentacji (notes, memory) przekazany operatorom

## Notatki
- Style na obu maszynach powinny mieć spójne tagi i zasady (vault-only secrets).
- OpenClaw służy do narracji i orkiestracji; sekrety tylko przez Memphis TUI.
