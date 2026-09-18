// Reading and writing the files a rig is moved between computers in: a voxel
// model zip made by the stacker editor, a glTF or GLB of a skeleton and its
// motions, and this app's own project archive that keeps the whole rig.
import { loadFigure, saveFigure } from "@big-mesh-studios/stacker/format";
import type { Figure } from "@big-mesh-studios/stacker/renderer";
import JSZip from "jszip";
import { importGlb, type ImportedRig } from "../animation/gltf-import";
import { DEFAULT_PALETTE } from "../rig/palette";
import type { Binding, BoneMotion, Skeleton } from "../skeleton/types";

/** Everything a saved project holds. */
export interface Project {
  skeleton: Skeleton;
  bindings: Binding[];
  motions: BoneMotion[];
  figure: Figure;
}

/** The voxel figure inside `file`, as the stacker editor writes it. */
export async function readModelFile(file: File): Promise<Figure> {
  const loaded = await loadFigure(file, DEFAULT_PALETTE);
  return { parts: loaded.parts, palette: loaded.palette };
}

/** The voxel figure behind `url`, for a bundled sample model. */
export async function readModelUrl(url: string): Promise<Figure> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}`);
  }
  const loaded = await loadFigure(await response.blob(), DEFAULT_PALETTE);
  return { parts: loaded.parts, palette: loaded.palette };
}

/** The skeleton and motions inside a glTF or GLB `file`. */
export async function readRigFile(file: File): Promise<ImportedRig> {
  const data = await file.arrayBuffer();
  return importGlb(data, { name: file.name.replace(/\.[^.]+$/, "") });
}

/** The skeleton and motions behind `url`, for a bundled animation. */
export async function readRigUrl(
  url: string,
  name: string,
): Promise<ImportedRig> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}`);
  }
  return importGlb(await response.arrayBuffer(), { name });
}

/** The project `project` written as a `.rig.zip`. */
export async function writeProject(project: Project): Promise<Blob> {
  const zip = new JSZip();
  const figure = await saveFigure(project.figure);

  zip.file(
    "rig.json",
    JSON.stringify({
      skeleton: project.skeleton,
      bindings: project.bindings,
      motions: project.motions,
    }),
  );
  zip.file("figure.zip", figure);

  return zip.generateAsync({ type: "blob" });
}

/** The project held in `file`, read back from a `.rig.zip`. */
export async function readProject(file: File): Promise<Project> {
  const zip = await JSZip.loadAsync(file);
  const rigFile = zip.file("rig.json");
  const figureFile = zip.file("figure.zip");

  if (rigFile === null || figureFile === null) {
    throw new Error("Not a rig project.");
  }

  const json = JSON.parse(await rigFile.async("string")) as {
    skeleton: Skeleton;
    bindings: Binding[];
    motions: BoneMotion[];
  };

  const figure = await loadFigure(
    await figureFile.async("blob"),
    DEFAULT_PALETTE,
  );

  return {
    skeleton: json.skeleton,
    bindings: json.bindings,
    motions: json.motions,
    figure: { parts: figure.parts, palette: figure.palette },
  };
}

/** A short address for `file` to show while it is read. */
export function fileLabel(file: File): string {
  return file.name.replace(/\.[^.]+$/, "") || "rig";
}
