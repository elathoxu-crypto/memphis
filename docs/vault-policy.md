# Vault Access Policy

Cel: wszystkie sekrety (API keys, SSI, klucze osobiste) są zarządzane wyłącznie przez Memphis TUI. OpenClaw (Style) służy do narracji i orkiestracji, ale nie przechowuje tajnych danych.

## Kroki
1. Zarejestrować w `journal`/`decision`, że polityka jest obowiązująca (tagi `security`, `vault`, `workflow`).
2. Utworzyć wpis w `project_task` z checklistą:
   - [ ] Instrukcja w TUI (np. sekcja Vault > Notes) jak dodawać sekrety.
   - [ ] Style nie zapisuje sekretów w łańcuchach OpenClaw; jeśli ktoś spróbuje, logujemy ostrzeżenie.
   - [ ] Alert w `ops`/`journal`, gdyby sekret miał zostać wprowadzony poza TUI.
3. Sekrety dodajemy komendami:
   ```bash
   memphis vault init
   memphis vault add OPENAI_API_KEY sk-...
   memphis vault list
   ```
4. Zachowujemy przypomnienia o rotacji kluczy (np. via `journal` + tag `rotation`).

## Tagi
`role:assistant`, `role:user`, `security`, `vault`, `workflow`, `policy`

## Definicja sukcesu
- Każda zmiana sekretów odbywa się w Memphis TUI i jest zapisana w `vault` chainie.
- Style/OpenClaw nie przechowuje wrażliwych danych.
- `memphis recall --tag security` przypomina zasady polityki.
