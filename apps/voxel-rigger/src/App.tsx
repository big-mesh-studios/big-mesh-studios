import { createRig } from "./rig-store";
import { RigContext } from "./context";
import EditorPage from "./EditorPage";

export default function App() {
  const rig = createRig();

  return (
    <RigContext value={rig}>
      <EditorPage />
    </RigContext>
  );
}
