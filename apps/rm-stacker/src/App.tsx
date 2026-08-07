import { Component, createMemo, onSettled, untrack } from "solid-js";
import * as THREE from "three";
import PixelEditorView from "./PixelEditorView";
import VoxelPreviewView from "./VoxelPreviewView";
import { StackerContext } from "./stacker-context";
import { createStackerStore } from "./stacker-store";
import { Command } from "./Command";
import { byteTo2DigitHex, findCollidingSide } from "./utils";
import { load, loadFromIndexedDB, save, saveToIndexedDB } from "./load-save";

const App: Component = () => {
  const stackerStore = createStackerStore();
  let store = stackerStore.store;
  let setStore = stackerStore.setStore;

  onSettled(() => {
    (async () => {
      let result = await loadFromIndexedDB();
      if (result === null) {
        return;
      }
      let { sides, undoStack, redoStack } = result;
      setStore(s => {
        s.sides = sides;
      });
      stackerStore.undoRedoManager.setStacks({
        undoStack,
        redoStack,
      });
      onSettled(() => {
        stackerStore.updateVoxels();
        store.render();
      });
    })();
  });

  let requestAutoSave = (() => {
    let aboutToSave = false;
    let saving = false;
    let trySaveAgain = false;
    return () => {
      if (aboutToSave) {
        return;
      }
      if (saving) {
        trySaveAgain = true;
        return;
      }
      aboutToSave = true;
      setTimeout(() => {
        aboutToSave = false;
        saving = true;
        (async () => {
          do {
            trySaveAgain = false;
            let { undoStack, redoStack } = stackerStore.undoRedoManager.getStacks();
            await saveToIndexedDB({
              sides: store.sides,
              undoStack,
              redoStack,
            });
          } while (trySaveAgain);
          saving = false;
        })();
      }, 1000);
    };
  })();

  const PADDING = 6;
  const coordinates = createMemo(() => {
    return {
      front: new THREE.Vector2(0.0, 0.0),
      left: new THREE.Vector2(-(store.dimensions.depth + PADDING), 0.0),
      right: new THREE.Vector2(store.dimensions.width + PADDING, 0.0),
      back: new THREE.Vector2(store.dimensions.width + store.dimensions.depth + PADDING * 2, 0.0),
      top: new THREE.Vector2(0.0, -(store.dimensions.depth + PADDING)),
      bottom: new THREE.Vector2(0.0, store.dimensions.height + PADDING),
    };
  });

  let requestRenderAndUpdateVoxels = false;
  const enqueue = (() => {
    let queue: Promise<unknown> = Promise.resolve();
    return (task: () => Promise<Command>): Promise<Command> => {
      const result = queue.then(task);
      queue = result;
      return result;
    };
  })();
  const doCommand_ = async (effect: Command): Promise<Command> => {
    queueMicrotask(() => requestAutoSave());
    return untrack(async () => {
      switch (effect.type) {
        case "NoOperation": {
          return Command.noOperation();
        }
        case "Sequence": {
          let commands = effect.commands;
          let reverseCommands = Array(commands.length);
          for (let i = 0; i < commands.length; ++i) {
            reverseCommands[reverseCommands.length - 1 - i] = await doCommand_(commands[i]);
          }
          return Command.sequence(reverseCommands);
        }
        case "WritePixel": {
          const result = findCollidingSide(effect, store.sides, coordinates());
          if (!result) {
            return Command.noOperation();
          }

          const { x, y, colour } = effect;
          const { coordinate, side } = result;

          const colour2 = new THREE.Color(colour);
          colour2.convertLinearToSRGB();

          const r = Math.max(0, Math.min(255, Math.round(colour2.r * 255.0)));
          const g = Math.max(0, Math.min(255, Math.round(colour2.g * 255.0)));
          const b = Math.max(0, Math.min(255, Math.round(colour2.b * 255.0)));

          const localX = x - coordinate.x;
          const localY = y - coordinate.y;
          const offset = (localY * side.width + localX) << 2;
          let oldR = side.data[offset + 0];
          let oldG = side.data[offset + 1];
          let oldB = side.data[offset + 2];
          let oldA = side.data[offset + 3];
          side.data[offset + 0] = r;
          side.data[offset + 1] = g;
          side.data[offset + 2] = b;
          side.data[offset + 3] = 255;

          requestRenderAndUpdateVoxels = true;

          if (oldA) {
            let oldColour: THREE.ColorRepresentation = `#${byteTo2DigitHex(oldR)}${byteTo2DigitHex(
              oldG,
            )}${byteTo2DigitHex(oldB)}`;
            return Command.writePixel(x, y, oldColour);
          } else {
            return Command.erasePixel(x, y);
          }
        }
        case "ErasePixel": {
          const { x, y } = effect;

          const result = findCollidingSide(effect, store.sides, coordinates());
          if (!result) {
            return Command.noOperation();
          }

          const { coordinate, side } = result;

          const localX = x - coordinate.x;
          const localY = y - coordinate.y;
          const offset = (localY * side.width + localX) << 2;
          if (side.data[offset + 3] === 0) {
            return Command.noOperation();
          }
          let oldR = side.data[offset + 0];
          let oldG = side.data[offset + 1];
          let oldB = side.data[offset + 2];
          side.data[offset + 0] = 0;
          side.data[offset + 1] = 0;
          side.data[offset + 2] = 0;
          side.data[offset + 3] = 0;

          requestRenderAndUpdateVoxels = true;

          let oldColour: THREE.ColorRepresentation = `#${byteTo2DigitHex(oldR)}${byteTo2DigitHex(
            oldG,
          )}${byteTo2DigitHex(oldB)}`;
          return Command.writePixel(x, y, oldColour);
        }
        case "LoadData": {
          let undoCommand = await stackerStore.snapshot();
          let data = await effect.data;
          let sides = await load(data);
          setStore(s => {
            s.sides = sides;
          });
          store.render();
          stackerStore.updateVoxels();
          return undoCommand;
        }
        case "Async": {
          let command = await effect.command;
          return doCommand_(command);
        }
        default: {
          const x: never = effect;
          throw new Error(`Unreachable ${x}`);
        }
      }
    });
  };
  const doCommand = (command: Command): Command => {
    return Command.async(
      enqueue(() => {
        requestRenderAndUpdateVoxels = false;
        try {
          return doCommand_(command).then(result => {
            if (requestRenderAndUpdateVoxels) {
              store.render();
              stackerStore.updateVoxels();
            }
            return result;
          });
        } finally {
          requestRenderAndUpdateVoxels = false;
        }
      }),
    );
  };

  queueMicrotask(() =>
    setStore(s => {
      s.doCommand = doCommand;
    }),
  );

  return (
    <StackerContext value={stackerStore}>
      <div
        class="flex-col md:flex-row"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div
          class="bg-base-300"
          style={{
            "flex-grow": "1",
            "flex-shrink": "1",
            "flex-basis": "0",
            overflow: "hidden",
          }}
        >
          <PixelEditorView coordinates={coordinates} />
        </div>
        <div
          style={{
            width: "5px",
          }}
        />
        <div
          style={{
            "flex-grow": "1",
            "flex-shrink": "1",
            "flex-basis": "0",
            overflow: "hidden",
            display: "flex",
            "flex-direction": "column",
          }}
        >
          <div style="flex-grow: 1; overflow: hidden;">
            <VoxelPreviewView />
          </div>
        </div>
      </div>
    </StackerContext>
  );
};

export default App;
