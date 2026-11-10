# SuperSudoku Generator

A local app to generate and play supersudokus on computers and phones: eight variants, 576 cells, shared overlaps and verified unique solutions.

[Documentazione italiana](README.md)

## First game

Requires Node.js 22 or later. In a terminal opened in Supersudoku:

```powershell
node server.js
```

Open **http://localhost:5173**. No dependencies need installing to play. Keep the terminal open; Ctrl+C stops the server.

A verified first game is ready immediately. **New game** generates another puzzle: choose 320 or 400 empty cells and optionally a code to reproduce it. Given counts are not certified difficulty ratings.

On a phone, join the same Wi-Fi as the computer and open one of the `Telefono / Phone` addresses printed in the terminal. Keep the computer and server on. If Windows requests network access for Node, allow the private network to connect from your phone. The project is not published online.

## Controls

- Select a cell and use the number pad or keyboard. Arrow keys move the selection.
- **Focus on sudoku** enlarges a board; tap names in the list to switch. **Full puzzle** shows all overlaps. Use + and − for additional zoom; scroll the board to move around.
- Every board has a name and **Rules** button beside the full puzzle and in the list. Shared cells have one value and follow both boards' rules.
- **Notes** (N), **Erase** (Backspace/Delete), **Undo** (Ctrl/Cmd+Z), **Redo** (Ctrl/Cmd+Shift+Z).
- Checking defaults to comparison with the solution. Choose rule violations only, or turn checking off. Incorrect numbers are kept and highlighted for correction or undo.
- Entries, notes and time save automatically in this browser. Undo/redo history lasts for the current open session. Devices do not synchronize.
- **Show solution** does not overwrite your game; press again to return. **Restart** clears progress after confirmation.
- Italiano / English changes all text without altering the game and remembers your preference.
- **Print** uses the full puzzle. A manifest and service worker support installation and offline use in compatible browsers on localhost or HTTPS after the first load. Phones can play over the computer's HTTP address, but installation and offline support are unavailable there.

## Generation

The variants are Classic, Inequality, Addition, Killer, Consecutive, X, Irregular and Offset. Their ring positions are shuffled, changing neighbours while preserving 72 shared cells.

The generator constructs a solution for the arrangement, creates connected irregular regions and clues, then removes givens only after checking uniqueness. Missing consecutive bridges also impose constraints. In Addition Sudoku, two blue cells add up to the orange cell underneath; letters identify groups. Killer cages do not allow repetitions.

Generation uses a Web Worker to keep the interface responsive. Cancel without losing your game. Searches have computation limits: if generation fails, retry while preserving the current puzzle. A game code reproduces a puzzle within the same generator version.

`Supersudoku.webp` is a reference for the variants and is not served by the app. The generator creates fresh clues and regions rather than transcribing the photo. Image credits: Carykh and Yessoan.

## Checks and development

```powershell
node --test
node scripts/check.js
```

For browser tests, dependencies, caches and browsers stay inside the project:

```powershell
npm.cmd ci --cache .cache/npm
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/browsers'
node node_modules/playwright/cli.js install chromium
npm.cmd run test:e2e
```

Playwright checks desktop and a simulated phone: entry, errors, language changes, saving, generation, completion and offline use. Phone simulation uses Chromium and does not replace real Safari/iOS testing. Tests start and stop their own server on port 5173; stop your game server first.

`node scripts/create-starter.js` regenerates the first game in `data/starter.json`. `src/i18n.js` centralizes visible text in both languages; engine errors are internal developer diagnostics.

Logical hints and human-technique difficulty ratings are not implemented yet. Saving requires the browser to allow local storage.
