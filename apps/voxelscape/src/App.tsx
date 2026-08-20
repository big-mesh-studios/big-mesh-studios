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
import { LevelChunkMaterial, makeLevel } from "./level";

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
    // The volume is 1024 world units on a side (matching the material's
    // "dimension" uniform), centered at the origin, so the bounding box that
    // feeds a ray to every fragment must span it (plus one cell of padding,
    // matching the box the marcher intersects).
    let geometry = new BoxGeometry(1026, 1026, 1026);
    let material = new LevelChunkMaterial();
    material.transparent = true;
    material.depthWrite = true;
    material.setLevel(makeLevel());
    let mesh = new Mesh(geometry, material);
    scene.add(mesh);
  }
  const camera = new PerspectiveCamera(50, 1.0, 0.1, 20000.0);
  camera.position.set(150*5, 130*3, 150*5);
  camera.lookAt(new Vector3(0, 0, 0));
  let animate = (t: number) => {
    let ca = Math.cos(t*0.0005);
    let sa = Math.sin(t*0.0005);
    camera.position.set(150*5*ca, 130*3, 150*5*sa);
    camera.lookAt(new Vector3(0, 0, 0));
    render();
  };
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
        let aspect = rect.width / rect.height;
        if (!Number.isFinite(aspect) || aspect <= 0) {
          return;
        }
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(canvas);
      renderer.setAnimationLoop((t) => {
        animate(t);
      });
      return () => {
        resizeObserver.unobserve(canvas);
        resizeObserver.disconnect();
        renderer.setAnimationLoop(null);
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

