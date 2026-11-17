# Diamond Baseball Career — Unreal Engine

This directory contains the native PC game project. The existing browser game at the repository root remains intact as a legacy reference until its systems have been audited and migrated.

## Project baseline

- Engine line: Unreal Engine 5.8
- Project type: standalone desktop game
- Runtime: local player PC; no dedicated server required for offline play
- Primary implementation: C++ for deterministic baseball rules, simulation and core state; Blueprint for presentation, animation, camera, UI and iteration
- Initial target: a genuinely playable baseball inning, not a visual-only stadium demo

UE 5.9 is currently a preview line, so this project is pinned to the 5.8 release line for a more stable foundation. Update to a later stable release only after checking project and plugin compatibility.

## Repository boundaries

- Do not delete or move the existing web game while migration is in progress.
- Keep this project under `Unreal/DiamondBaseballCareer`.
- Keep portable game data (teams, players, cards, progression and career records) separate from engine-specific presentation assets.
- Do not commit generated `Binaries/`, `Intermediate/`, `Saved/`, or `DerivedDataCache/` folders.
- Binary Unreal assets (`.uasset`, `.umap`) must be created and validated in Unreal Editor; text-only repository operations cannot produce valid editor-authored assets.

## Planned runtime modules

- Core: match state, innings, outs, count, score and game flow
- Baseball: batting, pitching, fielding, baserunning and ball flight
- AI: pitcher, batter, fielders, baserunners and manager decisions
- Career: player identity, roster, cards, training, contracts, transfers, awards and retirement
- Presentation: camera, animation, stadium, crowd, audio and UI

## First playable milestone: Prototype 0.1

1. Load a test stadium and spawn batter, pitcher, catcher and fielders.
2. Start a legal at-bat with balls, strikes, fouls and outs tracked correctly.
3. Let the user time and direct a swing; calculate contact and launch trajectory.
4. Let the user control the relevant fielder, field the ball and make a throw.
5. Resolve runner advancement, safe/out calls and score changes.
6. Complete at least one inning and show a final state.

## Testing status

The project descriptor and source scaffolding are repository files only. They have **not** been compiled or opened in Unreal Editor in this environment. The first local validation will require the Epic Games Launcher / Unreal Engine 5.8 installation and the platform's C++ toolchain. Ask the user to run a test only when a concrete editor or packaged-build checkpoint is ready.

## Current migration policy

The old browser implementation is a source of design and data references, not a codebase to mechanically translate. Preserve its career/card rules where they match the current design; rebuild the real-time baseball gameplay around Unreal's physics, animation and input systems.