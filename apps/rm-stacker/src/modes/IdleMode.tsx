import { Mode, ModeParams } from "../Mode";

export function createIdleMode(_modeParams: ModeParams): Mode {
  return {
    activeModeButton: () => "Idle",
  };
}
