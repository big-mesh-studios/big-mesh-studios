import JSZip from "jszip";
import { SideKind, sideKindSet, Sides } from "./types";

export async function load(blob: Blob): Promise<Sides> {
  let zip = await JSZip.loadAsync(blob);
  let result: Partial<Sides> = {};
  let seenSize: number | undefined = undefined;
  for (let [_path, entry] of Object.entries(zip.files)) {
    let m = /^(.*)\.png$/.exec(entry.name.toLowerCase());
    if (m !== null) {
      let side = m[1];
      if (sideKindSet[side as SideKind]) {
        let side2 = side as SideKind;
        let blob = await entry.async("blob");
        let url = URL.createObjectURL(blob);
        let image = new Image();
        let resolve = () => {};
        let reject = (e: any) => {};
        let waitForLoad = new Promise<void>((resolve2, reject2) => {
          resolve = resolve2;
          reject = reject2;
        });
        image.onload = () => {
          URL.revokeObjectURL(url);
          let canvas = new OffscreenCanvas(image.naturalWidth, image.naturalHeight);
          let ctx = canvas.getContext("2d");
          if (ctx === null) {
            reject(new Error("failed to make 2d ctx"));
            return;
          }
          seenSize = image.naturalWidth;
          ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
          let imageData = ctx.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
          result[side2] = imageData;
          resolve();
        };
        image.onerror = e => {
          URL.revokeObjectURL(url);
          reject(e);
        };
        image.src = url;
        await waitForLoad;
      }
    }
  }
  if (seenSize == undefined) {
    seenSize = 32;
  }
  for (let side of Object.keys(sideKindSet)) {
    let side2 = side as SideKind;
    if (result[side2] === undefined) {
      result[side2] = new ImageData(seenSize, seenSize);
    }
  }
  return result as Sides;
}

export async function save(sides: Sides): Promise<Blob> {
  let zip = new JSZip();
  for (let side of Object.keys(sideKindSet)) {
    let side2 = side as SideKind;
    let imageData = sides[side2];
    let canvas = new OffscreenCanvas(imageData.width, imageData.height);
    let ctx = canvas.getContext("2d");
    if (ctx === null) {
      throw new Error("failed to make 2d ctx");
    }
    ctx.putImageData(imageData, 0, 0);
    let blob = canvas.convertToBlob({ type: "image/png" });
    zip.file(`${side}.png`, blob);
  }
  return zip.generateAsync({ type: "blob" });
}
