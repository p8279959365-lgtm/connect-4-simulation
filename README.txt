# Connect Four AI — AISC Project

## Files
- `index.html`: page structure
- `style.css`: responsive visual design
- `script.js`: Connect Four rules and heuristic AI

## Run
1. Keep all three files in the same folder.
2. Open `index.html` in Chrome, Edge, or Firefox.
3. Click a numbered arrow above the board to drop a red disc.
4. The AI responds with a yellow disc and explains its choice.

No installation, server, API key, or external JavaScript library is required. Google Fonts are optional; if offline, the page uses fallback fonts.

## AI method (no Minimax)
The AI evaluates legal moves using a heuristic:
1. Play an immediate winning move if available.
2. Block an immediate human winning move.
3. For other moves, score center control and every group of four cells.
4. Reward AI patterns of two or three discs and penalize opponent threats.
5. Select the legal move with the highest score.

The AI does not recursively search future game states, so it is a heuristic agent rather than a Minimax agent.
