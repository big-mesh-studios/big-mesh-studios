/** A text and progress panel as positioned by the place host for the world renderer. */
export interface HudPanelPose {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  width: number;
  height: number;
  label: string;
  value: number;
  max: number;
}
