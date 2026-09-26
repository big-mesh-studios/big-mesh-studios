# What voxelscape is made of

Drawn from the imports under `src` at 043f65b by `pnpm architecture`.
Nothing here is written by hand: change the code and run it again.

```mermaid
graph TD
  shell["shell<br/>6 files · 2038 lines"]
  voxelscape["voxelscape<br/>3 files · 3695 lines"]
  world["world<br/>35 files · 8467 lines"]
  renderers["renderers<br/>25 files · 7426 lines"]
  render["render<br/>4 files · 1145 lines"]
  player["player<br/>17 files · 4441 lines"]
  multiplayer["multiplayer<br/>14 files · 3663 lines"]
  places["places<br/>52 files · 26677 lines"]
  environment["environment<br/>6 files · 1952 lines"]
  atproto["atproto<br/>8 files · 1863 lines"]
  ui["ui<br/>19 files · 4582 lines"]
  level-editor["level-editor<br/>25 files · 4453 lines"]
  atproto --> places
  atproto --> world
  level-editor --> places
  level-editor --> player
  level-editor --> ui
  level-editor --> voxelscape
  level-editor --> world
  multiplayer --> places
  multiplayer --> player
  places --> environment
  places --> world
  player --> environment
  player --> places
  player --> renderers
  player --> shell
  player --> world
  renderers --> environment
  renderers --> render
  renderers --> world
  shell --> atproto
  shell --> environment
  shell --> level-editor
  shell --> multiplayer
  shell --> places
  shell --> player
  shell --> render
  shell --> renderers
  shell --> ui
  shell --> voxelscape
  shell --> world
  ui --> places
  ui --> player
  ui --> renderers
  ui --> shell
  ui --> voxelscape
  voxelscape --> atproto
  voxelscape --> environment
  voxelscape --> level-editor
  voxelscape --> multiplayer
  voxelscape --> places
  voxelscape --> player
  voxelscape --> render
  voxelscape --> renderers
  voxelscape --> shell
  voxelscape --> world
  world --> render
  world --> renderers
```

## The areas

| area           | what it is for                                                         | files | lines |
| -------------- | ---------------------------------------------------------------------- | ----- | ----- |
| `shell`        | the page, the console, and what wires a world into them                | 6     | 2038  |
| `voxelscape`   | one world: its frame, and every part below it                          | 3     | 3695  |
| `world`        | voxels, light, the streaming window, and the workers that fill it      | 35    | 8467  |
| `renderers`    | turning voxels into geometry, and drawing it                           | 25    | 7426  |
| `render`       | the frame loop, the resolution scaler, and the probe that times them   | 4     | 1145  |
| `player`       | the body, its input, its tools and what they do to the world           | 17    | 4441  |
| `multiplayer`  | other players, over a peer connection                                  | 14    | 3663  |
| `places`       | a published place: its script, its people, and the sandbox they run in | 52    | 26677 |
| `environment`  | the sky, the clock, the weather and the sound                          | 6     | 1952  |
| `atproto`      | being signed in, and reading and writing published records             | 8     | 1863  |
| `ui`           | what is drawn over the world in the page                               | 19    | 4582  |
| `level-editor` | editing the running world's structures, as an overlay on its canvas    | 25    | 4453  |

## What reaches into what

| area           | imports from   | modules doing it |
| -------------- | -------------- | ---------------- |
| `atproto`      | `places`       | 3                |
| `atproto`      | `world`        | 2                |
| `level-editor` | `places`       | 3                |
| `level-editor` | `player`       | 1                |
| `level-editor` | `ui`           | 1                |
| `level-editor` | `voxelscape`   | 4                |
| `level-editor` | `world`        | 6                |
| `multiplayer`  | `places`       | 4                |
| `multiplayer`  | `player`       | 1                |
| `places`       | `environment`  | 1                |
| `places`       | `world`        | 12               |
| `player`       | `environment`  | 1                |
| `player`       | `places`       | 2                |
| `player`       | `renderers`    | 1                |
| `player`       | `shell`        | 4                |
| `player`       | `world`        | 9                |
| `renderers`    | `environment`  | 1                |
| `renderers`    | `render`       | 2                |
| `renderers`    | `world`        | 14               |
| `shell`        | `atproto`      | 4                |
| `shell`        | `environment`  | 2                |
| `shell`        | `level-editor` | 1                |
| `shell`        | `multiplayer`  | 2                |
| `shell`        | `places`       | 3                |
| `shell`        | `player`       | 2                |
| `shell`        | `render`       | 2                |
| `shell`        | `renderers`    | 2                |
| `shell`        | `ui`           | 2                |
| `shell`        | `voxelscape`   | 2                |
| `shell`        | `world`        | 3                |
| `ui`           | `places`       | 5                |
| `ui`           | `player`       | 5                |
| `ui`           | `renderers`    | 1                |
| `ui`           | `shell`        | 3                |
| `ui`           | `voxelscape`   | 12               |
| `voxelscape`   | `atproto`      | 1                |
| `voxelscape`   | `environment`  | 1                |
| `voxelscape`   | `level-editor` | 1                |
| `voxelscape`   | `multiplayer`  | 1                |
| `voxelscape`   | `places`       | 1                |
| `voxelscape`   | `player`       | 1                |
| `voxelscape`   | `render`       | 2                |
| `voxelscape`   | `renderers`    | 1                |
| `voxelscape`   | `shell`        | 1                |
| `voxelscape`   | `world`        | 1                |
| `world`        | `render`       | 2                |
| `world`        | `renderers`    | 5                |

## Areas that reach both ways

- `level-editor` and `voxelscape`
- `player` and `shell`
- `renderers` and `world`
- `shell` and `ui`
- `shell` and `voxelscape`
