/**
 * The renderer-owned visuals for portable place effects.
 *
 * The place host owns validated records; this layer turns those records into meshes. Keeping
 * the conversion here lets the guest API and its transport stay independent of RMSL objects.
 */

import {
  Blending,
  Color,
  InstancedMesh,
  Line2NodeMaterial,
  LineSegments2,
  LineSegmentsGeometry,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from "@random-mesh/rmsl/scene";
import type { Scene } from "@random-mesh/rmsl/scene";

import type { BeamPose, ParticlePose } from "@big-mesh-studios/place-api";

const PARTICLES_PER_EMITTER = 12;

interface BeamBatch {
  readonly geometry: LineSegmentsGeometry;
  readonly lines: LineSegments2;
}

export interface PlaceEffectVisuals {
  update(beams: readonly BeamPose[], particles: readonly ParticlePose[], now: number): void;
  dispose(): void;
}

const stableUnit = (text: string, n: number): number => {
  let hash = 2166136261 ^ n;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
};

export const createPlaceEffectVisuals = (scene: Scene): PlaceEffectVisuals => {
  const beamBatches = new Map<number, BeamBatch>();
  const particleGeometry = new SphereGeometry(1, 6, 4);
  const particleMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  particleMaterial.depthWrite = false;
  particleMaterial.blending = Blending.AdditiveBlending;
  let particles = new InstancedMesh(
    particleGeometry,
    particleMaterial,
    PARTICLES_PER_EMITTER,
  );
  particles.count = 0;
  scene.add(particles);

  return {
    update(beams, emitters, now): void {
      const byWidth = new Map<number, BeamPose[]>();
      for (const beam of beams) {
        const items = byWidth.get(beam.width) ?? [];
        items.push(beam);
        byWidth.set(beam.width, items);
      }

      for (const [width, items] of byWidth) {
        let batch = beamBatches.get(width);
        if (batch === undefined) {
          const geometry = new LineSegmentsGeometry();
          const material = new Line2NodeMaterial({
            color: 0xffffff,
            linewidth: width,
            worldUnits: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
          });
          material.depthWrite = false;
          const lines = new LineSegments2(geometry, material);
          scene.add(lines);
          batch = { geometry, lines };
          beamBatches.set(width, batch);
        }
        const positions = new Float32Array(items.length * 6);
        const colors = new Float32Array(items.length * 6);
        items.forEach((beam, index) => {
          const offset = index * 6;
          positions.set(
            [beam.ax, beam.ay, beam.az, beam.bx, beam.by, beam.bz],
            offset,
          );
          colors.set([...beam.color, ...beam.color], offset);
        });
        batch.geometry.setPositions(positions);
        batch.geometry.setColors(colors);
      }
      for (const [width, batch] of beamBatches) {
        if (!byWidth.has(width)) batch.geometry.setPositions([]);
      }

      const requiredInstances = emitters.length * PARTICLES_PER_EMITTER;
      if (requiredInstances > particles.instanceMatrix.count) {
        const capacity = Math.max(
          PARTICLES_PER_EMITTER,
          2 ** Math.ceil(Math.log2(requiredInstances)),
        );
        scene.remove(particles);
        particles = new InstancedMesh(particleGeometry, particleMaterial, capacity);
        scene.add(particles);
      }

      let instance = 0;
      const matrix = new Matrix4();
      const point = new Vector3();
      const tint = new Color();
      for (const emitter of emitters) {
        for (let i = 0; i < PARTICLES_PER_EMITTER; i++) {
          const elapsed = Math.max(0, now - emitter.at);
          if (!emitter.loop && elapsed > emitter.lifeMs) continue;
          const phase = emitter.loop
            ? ((elapsed + (i / PARTICLES_PER_EMITTER) * emitter.lifeMs) % emitter.lifeMs) /
              emitter.lifeMs
            : Math.min(1, elapsed / emitter.lifeMs);
          const angle = stableUnit(emitter.id, i) * Math.PI * 2;
          const drift = emitter.spread * phase;
          const rise = emitter.upward ? drift : Math.cos(angle) * drift * 0.45;
          const x = emitter.x + Math.cos(angle) * drift * 0.65;
          const y = emitter.y + rise;
          const z = emitter.z + Math.sin(angle) * drift * 0.65;
          const size = emitter.size * Math.max(0.04, 1 - phase * 0.75);
          matrix.makeScale(size, size, size).setPosition(point.set(x, y, z));
          particles.setMatrixAt(instance, matrix);
          tint.setRGB(emitter.color[0], emitter.color[1], emitter.color[2]);
          particles.setColorAt(instance, tint);
          instance++;
        }
      }
      particles.count = instance;
      particles.instanceMatrix.needsUpdate = true;
      if (particles.instanceColor !== null) particles.instanceColor.needsUpdate = true;
    },

    dispose(): void {
      scene.remove(particles);
      particleGeometry.dispose();
      for (const batch of beamBatches.values()) {
        scene.remove(batch.lines);
        batch.geometry.dispose();
      }
      beamBatches.clear();
    },
  };
};
