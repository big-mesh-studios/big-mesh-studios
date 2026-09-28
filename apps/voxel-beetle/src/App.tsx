// What holds the whole application: the model being edited, and the page that
// shows it.
//
// The model is created here, above the router, rather than inside the page. The
// page draws it, and creating it there would mean the drawing, the undo history
// and the preview's graphics context all being thrown away and rebuilt every
// time somebody came back to their work.
import { Component, Loading } from "solid-js";
import { createBeetle } from "./beetle-store";
import { BeetleContext } from "./context";
import { Router } from "./routes";

const App: Component = () => {
  const beetle = createBeetle();
  return (
    <BeetleContext value={beetle}>
      {/* The model is read back out of this browser before either view has
          anything to draw, so the page waits for it rather than showing the
          empty model the editor opens on. */}
      <Loading fallback={<div class="loading" />}>
        <Router />
      </Loading>
    </BeetleContext>
  );
};

export default App;
