# What voxelscape is made of

Drawn from the imports under `src` at e71eb76 by `pnpm architecture`.
Nothing here is written by hand: change the code and run it again.

```mermaid
graph TD
  shell["shell<br/>6 files · 1973 lines"]
  voxelscape["voxelscape<br/>3 files · 2946 lines"]
  world["world<br/>26 files · 6944 lines"]
  renderers["renderers<br/>15 files · 5429 lines"]
  render["render<br/>4 files · 1143 lines"]
  player["player<br/>16 files · 3485 lines"]
  multiplayer["multiplayer<br/>14 files · 3483 lines"]
  places["places<br/>32 files · 12251 lines"]
  environment["environment<br/>6 files · 1879 lines"]
  atproto["atproto<br/>7 files · 1369 lines"]
  ui["ui<br/>15 files · 3097 lines"]
  level-editor["level-editor<br/>23 files · 3425 lines"]
  atproto --> places
  atproto --> world
  level-editor --> places
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
| `shell`        | the page, the console, and what wires a world into them                | 6     | 1973  |
| `voxelscape`   | one world: its frame, and every part below it                          | 3     | 2946  |
| `world`        | voxels, light, the streaming window, and the workers that fill it      | 26    | 6944  |
| `renderers`    | turning voxels into geometry, and drawing it                           | 15    | 5429  |
| `render`       | the frame loop, the resolution scaler, and the probe that times them   | 4     | 1143  |
| `player`       | the body, its input, its tools and what they do to the world           | 16    | 3485  |
| `multiplayer`  | other players, over a peer connection                                  | 14    | 3483  |
| `places`       | a published place: its script, its people, and the sandbox they run in | 32    | 12251 |
| `environment`  | the sky, the clock, the weather and the sound                          | 6     | 1879  |
| `atproto`      | being signed in, and reading and writing published records             | 7     | 1369  |
| `ui`           | what is drawn over the world in the page                               | 15    | 3097  |
| `level-editor` | editing the running world's structures, as an overlay on its canvas    | 23    | 3425  |

## What reaches into what

| area           | imports from   | modules doing it |
| -------------- | -------------- | ---------------- |
| `atproto`      | `places`       | 2                |
| `atproto`      | `world`        | 2                |
| `level-editor` | `places`       | 1                |
| `level-editor` | `ui`           | 1                |
| `level-editor` | `voxelscape`   | 1                |
| `level-editor` | `world`        | 6                |
| `multiplayer`  | `places`       | 4                |
| `multiplayer`  | `player`       | 1                |
| `places`       | `environment`  | 1                |
| `places`       | `world`        | 4                |
| `player`       | `environment`  | 1                |
| `player`       | `places`       | 2                |
| `player`       | `renderers`    | 1                |
| `player`       | `shell`        | 4                |
| `player`       | `world`        | 8                |
| `renderers`    | `environment`  | 1                |
| `renderers`    | `render`       | 2                |
| `renderers`    | `world`        | 7                |
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
| `ui`           | `places`       | 3                |
| `ui`           | `player`       | 2                |
| `ui`           | `renderers`    | 1                |
| `ui`           | `shell`        | 1                |
| `ui`           | `voxelscape`   | 8                |
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
