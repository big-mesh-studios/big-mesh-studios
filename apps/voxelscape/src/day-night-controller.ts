import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
} from "@random-mesh/rmsl/scene";
import {
  dayNightState,
  phaseAt,
  VISIBLE_ELEVATION,
  type DayNightState,
} from "./day-night";

export interface DayNightControllerParams {
  scene: Scene;
  /**
   * Distance from the camera at which the sun/moon squares orbit, inside
   * the camera's far plane, so the raymarched terrain occludes them at the
   * horizon and they hide once they dip a few degrees below it.
   */
  skyDistance?: number;
  sunSize?: number;
  moonSize?: number;
}

/**
 * Applies the day-night cycle (`./day-night`) to the scene: the sun and
 * ambient lights, the sun/moon billboards, and the clock itself (elapsed
 * time, an optional override, and a speed multiplier).
 */
export class DayNightController {
  private readonly sun: DirectionalLight;
  private readonly ambient: AmbientLight;
  private readonly sunMesh: Mesh;
  private readonly moonMesh: Mesh;
  private readonly skyDistance: number;

  // day-night clock: accumulates real time so the 20-minute cycle runs live.
  // Console commands can pin `timeOverride` (freezing the cycle at a chosen
  // moment) and scale the speed for fast-forwarding.
  private elapsed = 0;
  private timeOverride: number | null = null;
  private timeSpeed = 1;

  constructor(params: DayNightControllerParams) {
    const { scene, skyDistance = 600, sunSize = 48, moonSize = 32 } = params;
    this.skyDistance = skyDistance;
    // Lights for the standard materials (the player cube). Position/direction,
    // colour and intensity are re-derived from the day-night clock each frame
    // (`tick`), since the raymarched terrain lights itself in-shader.
    this.sun = new DirectionalLight();
    this.sun.position.set(2, 1, 1);
    scene.add(this.sun);
    this.ambient = new AmbientLight(0xffffff, 0.6);
    scene.add(this.ambient);
    // Square sun/moon billboards, drawn before the terrain so the raymarcher
    // overdraws them wherever solid ground lies (occluding the horizon).
    const sunMaterial = new MeshBasicMaterial({ color: 0xfff2a0 });
    sunMaterial.depthWrite = false;
    this.sunMesh = new Mesh(new PlaneGeometry(sunSize, sunSize), sunMaterial);
    scene.add(this.sunMesh);
    const moonMaterial = new MeshBasicMaterial({ color: 0xcfd6e6 });
    moonMaterial.depthWrite = false;
    this.moonMesh = new Mesh(
      new PlaneGeometry(moonSize, moonSize),
      moonMaterial,
    );
    scene.add(this.moonMesh);
  }

  private shownTime(): number {
    return this.timeOverride ?? this.elapsed;
  }

  /**
   * Advances the clock, re-derives every light and the sun/moon billboards,
   * and returns the computed state.
   *
   * @param dt - Time elapsed since the last tick, in seconds.
   * @param camera - The camera the sun/moon billboards face and orbit.
   * @returns The day-night state, for the caller to also feed into the
   * renderer's lighting and clear colour.
   */
  tick(dt: number, camera: PerspectiveCamera): DayNightState {
    this.elapsed += dt * this.timeSpeed;
    const dayNight = dayNightState(this.timeOverride ?? this.elapsed);
    // The player cube is a standard material; point the directional light at
    // the sun and tint the fill light to match the phase.
    this.sun.color.set(
      dayNight.sunLight[0],
      dayNight.sunLight[1],
      dayNight.sunLight[2],
    );
    this.sun.position.set(
      dayNight.sunDir[0],
      dayNight.sunDir[1],
      dayNight.sunDir[2],
    );
    this.ambient.color.set(
      dayNight.ambient[0],
      dayNight.ambient[1],
      dayNight.ambient[2],
    );
    this.ambient.intensity = 1;
    const cam = camera.position;
    this.sunMesh.position.set(
      cam.x + dayNight.sunDir[0] * this.skyDistance,
      cam.y + dayNight.sunDir[1] * this.skyDistance,
      cam.z + dayNight.sunDir[2] * this.skyDistance,
    );
    this.sunMesh.lookAt(cam.x, cam.y, cam.z);
    this.sunMesh.visible = dayNight.sunElevation > VISIBLE_ELEVATION;
    this.moonMesh.position.set(
      cam.x + dayNight.moonDir[0] * this.skyDistance,
      cam.y + dayNight.moonDir[1] * this.skyDistance,
      cam.z + dayNight.moonDir[2] * this.skyDistance,
    );
    this.moonMesh.lookAt(cam.x, cam.y, cam.z);
    this.moonMesh.visible = dayNight.moonElevation > VISIBLE_ELEVATION;
    return dayNight;
  }

  jumpTo(seconds: number): void {
    this.timeOverride = seconds;
  }

  clearOverride(): void {
    this.timeOverride = null;
  }

  setSpeed(multiplier: number): void {
    this.timeSpeed = multiplier;
  }

  describe(): string {
    const t = this.shownTime();
    return `phase: ${phaseAt(t)} | t=${t.toFixed(1)}s | speed=${this.timeSpeed}× | live=${this.timeOverride === null}`;
  }
}
