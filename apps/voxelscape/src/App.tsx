import { Component, createEffect, createStore } from "solid-js";
import {
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "@random-mesh/rmsl/scene";
import { LevelChunkMaterial, makeLevelChunk } from "./level";

const App: Component<{}> = () => {
  let [ state, setState, ] = createStore<{
    canvas: HTMLCanvasElement | undefined,
    renderer: WebGLRenderer | undefined,
  }>({
    canvas: undefined,
    renderer: undefined,
  });
  const scene = new Scene();
  {
    let sun = new DirectionalLight();
    sun.position.set(2, 1, 1);
    scene.add(sun);
  }
  {
    let geometry = new BoxGeometry(1, 1, 1);
    let material = new LevelChunkMaterial();
    material.setLevelChunk(makeLevelChunk(64, 64, 64));
    let mesh = new Mesh(geometry, material);
    scene.add(mesh);
  }
  const camera = new PerspectiveCamera(50, 1.0, 0.1, 1000.0);
  camera.position.set(3, 3, 3);
  camera.lookAt(new Vector3(0, 0, 0));
  createEffect(
    () => state.canvas,
    (canvas) => {
      if (canvas === undefined) {
        return;
      }
      let renderer = new WebGLRenderer(canvas);
      setState((s) => { s.renderer = renderer; });
      let resizeObserver = new ResizeObserver(() => {
        let rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        render();
      });
      resizeObserver.observe(canvas);
      return () => {
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
      };
    },
  );
  const render = () => {
    let renderer = state.renderer;
    if (renderer === undefined) {
      return;
    }
    renderer.render(scene, camera);
  };
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={(canvas) => setState((s) => { s.canvas = canvas; })}
        style={{
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

export default App;

