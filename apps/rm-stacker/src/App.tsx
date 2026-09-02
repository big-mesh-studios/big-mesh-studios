// What holds the whole application: the model being edited, and the pages that
// show it.
//
// The model is created here, above the router, rather than inside either page.
// Both pages read it — the editor draws it, the profile publishes and reopens
// it — and creating it per page would mean the drawing, the undo history, the
// preview's WebGL context and the signed-in session all being thrown away and
// rebuilt every time somebody looked at their work and came back.
import { Component, Loading } from "solid-js";
import { StackerContext } from "./context";
import { Router } from "./routes";
import { createStacker } from "./stacker-store";

const App: Component = () => {
  const stacker = createStacker();

  return (
    <StackerContext value={stacker}>
      <Loading>
        <Router>{(props) => props.children}</Router>
      </Loading>
    </StackerContext>
  );
};

export default App;
