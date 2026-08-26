// One simulated player in the mesh harness: a mutable pose, a real
// `MultiplayerController` wired to the in-memory atproto harness and the fake
// transport, and a pose log populated by `onRemotePose` so tests can assert
// what actually arrived over the mesh.
import { MultiplayerController } from "../multiplayer-controller";
import type { Pose, PoseMessage } from "../pose";
import type { ClusterOptions } from "../roster";
import type { AtprotoHarness } from "./atproto-harness";
import type { TransportHarness } from "./transport-harness";

export interface PlayerSim {
  did: string;
  controller: MultiplayerController;
  /** The sim's mutable pose; move it to simulate movement. */
  pose: Pose;
  start(): Promise<string>;
  stop(): Promise<string>;
  /** The latest pose message received from `from`, or undefined before any arrives. */
  latestPose(from: string): PoseMessage | undefined;
  /** How many poses were received from `from`. */
  poseCountFor(from: string): number;
}

export interface PlayerSimParams {
  did: string;
  harness: AtprotoHarness;
  transport: TransportHarness;
  x?: number;
  y?: number;
  z?: number;
  seed?: number | null;
  clusterOptions?: Partial<ClusterOptions>;
}

export const createPlayerSim = (params: PlayerSimParams): PlayerSim => {
  const pose: Pose = {
    x: params.x ?? 0,
    y: params.y ?? 0,
    z: params.z ?? 0,
    yaw: 0,
    pitch: 0,
  };
  const latestByPeer = new Map<string, PoseMessage>();
  const counts = new Map<string, number>();
  const repoClient = params.harness.repoClient();
  const controller = new MultiplayerController({
    getRepoClient: () => repoClient,
    getDid: () => params.did,
    seed: params.seed ?? null,
    getPose: () => pose,
    createPeer: params.transport.createPeer,
    fetchDirectory: (collection) =>
      Promise.resolve(params.harness.listReposByCollection(collection)),
    clusterOptions: params.clusterOptions,
    onRemotePose: (from, received) => {
      latestByPeer.set(from, received);
      counts.set(from, (counts.get(from) ?? 0) + 1);
    },
  });
  return {
    did: params.did,
    controller,
    pose,
    start: () => controller.start(),
    stop: () => controller.stop(),
    latestPose: (from) => latestByPeer.get(from),
    poseCountFor: (from) => counts.get(from) ?? 0,
  };
};
