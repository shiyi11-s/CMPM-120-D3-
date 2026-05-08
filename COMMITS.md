# Suggested incremental commit sequence

The D3 process requirement asks for a history of incremental commits tracing
back to an empty repo. Since the working tree was built up in one Cowork
session, here is a clean way to recreate that history with `git add -p` /
staged adds. Run from the repo root.

```bash
# 1) The Phaser library was already in place — that was the pre-existing
#    starter you copied across from D2.  No new commit needed here unless
#    you want to track its addition explicitly.

# 2) Pixel-art asset pack.
git add assets/
git commit -m "Add hand-generated pixel-art assets (marble, walls, hole, etc.)"

# 3) Phaser bootstrap — minimal page + entry script + Boot/Menu scenes.
git add index.html game.js src/scenes/BootScene.js src/scenes/MenuScene.js
git commit -m "Bootstrap Phaser game with Boot and Menu scenes"

# 4) Maze generator (recursive backtracker + loop carving).
git add src/MazeGen.js
git commit -m "Add recursive-backtracker maze generator with loop carving"

# 5) Core physics gameplay scene.
git add src/scenes/GameScene.js
git commit -m "Implement GameScene: marble physics + tilt + R/Y inputs"

# 6) Summary scenes.
git add src/scenes/SummaryScene.js src/scenes/EndScene.js
git commit -m "Add per-level Summary and final End scenes"

# 7) README with experience-requirement explanations.
git add README.md
git commit -m "Add README explaining design and experience requirements"

# 8) Optional: this notes file itself.
git add COMMITS.md
git commit -m "Add commit-history notes"
```

If you want a *truly* empty starting point, the very first commit on the
branch can be `git commit --allow-empty -m "Initial empty repo"` before the
ones above.
