export interface RawImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface SpriteStack2DOptions {
  pixelated?: boolean;
  directions?: number;
  yRotations?: number;
  xRotations?: number;
  autoRotate?: boolean;
  rotateSpeed?: number;
  zDistance?: number;
  sliceCount?: number;
  flipSideView?: boolean;
  centered?: boolean;
  offsetX?: number;
  offsetY?: number;
  enableShadow?: boolean;
  shadowColor?: [number, number, number, number];
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  debugShowSingleLayer?: boolean;
  debugLayerIndex?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fposmod(v: number, n: number): number {
  return ((v % n) + n) % n;
}

function degToRad(d: number): number {
  return d * Math.PI / 180;
}

function isInvisible(img: RawImage): boolean {
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
  return true;
}

function rotate90CCW(img: RawImage): RawImage {
  const W = img.width, H = img.height, data = img.data;
  const nw = H, nh = W;
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let dy = 0; dy < nh; dy++) {
    for (let dx = 0; dx < nw; dx++) {
      const si = (dx * W + (W - 1 - dy)) * 4;
      const di = (dy * nw + dx) * 4;
      out[di] = data[si]; out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3];
    }
  }
  return { width: nw, height: nh, data: out };
}

function putPixel(dst: Uint8ClampedArray, di4: number, src: Uint8ClampedArray, si4: number): boolean {
  if (src[si4 + 3] === 0) return false;
  dst[di4] = src[si4];
  dst[di4 + 1] = src[si4 + 1];
  dst[di4 + 2] = src[si4 + 2];
  dst[di4 + 3] = src[si4 + 3];
  return true;
}

export class SpriteStack2D {
  private opts: Required<SpriteStack2DOptions>;
  private sourceDirty = true;
  private texData: RawImage | null = null;

  private sliceImages: RawImage[] = [];
  private sliceImagesBack: RawImage[] = [];
  private sliceData: Uint8ClampedArray[] = [];
  private sliceDataBack: Uint8ClampedArray[] = [];
  private src: Record<string, any> = {};

  constructor(texture: RawImage | null = null, options?: SpriteStack2DOptions) {
    this.opts = {
      pixelated: true,
      directions: 360,
      yRotations: 0,
      xRotations: 90,
      autoRotate: false,
      rotateSpeed: 100,
      zDistance: 1,
      sliceCount: 0,
      flipSideView: false,
      centered: true,
      offsetX: 0,
      offsetY: 0,
      enableShadow: false,
      shadowColor: [0, 0, 0, 0.35],
      shadowOffsetX: -4,
      shadowOffsetY: -2,
      shadowBlur: 0,
      debugShowSingleLayer: false,
      debugLayerIndex: 0,
      ...options,
    } as Required<SpriteStack2DOptions>;
    if (texture) this.texData = texture;
  }

  setTexture(img: RawImage): void {
    this.texData = img;
    this.sourceDirty = true;
  }

  updateOptions(opt: Partial<SpriteStack2DOptions>): void {
    Object.assign(this.opts, opt);
    const rebuildTriggers = [
      'sliceCount', 'flipSideView', 'xRotations', 'zDistance',
      'enableShadow', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
      'debugShowSingleLayer', 'debugLayerIndex',
    ] as const;
    for (const k of rebuildTriggers) if (k in opt) { this.sourceDirty = true; break; }
  }

  getCurrentDirection(): number {
    const step = 360 / this.opts.directions;
    return Math.round(fposmod(this.opts.yRotations, 360) / step) % this.opts.directions;
  }

  render(angleDeg?: number): ImageData | null {
    const angle = angleDeg ?? this.opts.yRotations;
    this.ensureSource();
    const n = this.sliceImages.length;
    if (n === 0) return null;
    const sw = this.sliceImages[0].width;
    const sh = this.sliceImages[0].height;
    const [tw, th] = this.canvasSize();
    const z = this.opts.zDistance;
    const posY = Math.floor(n * z / 2);
    const frame = new Uint8ClampedArray(tw * th * 4);

    if (this.opts.enableShadow && !this.opts.debugShowSingleLayer) {
      this.rasterShadow(frame, tw, th, fposmod(angle, 360), posY);
    }

    const data = this.sliceData;
    if (this.isBackHemisphere(angle) && this.src.dataBack) {
      data = this.src.dataBack;
    }

    const pairs = this.buildMapping(degToRad(angle), sw, sh, tw, th);

    if (this.opts.debugShowSingleLayer) {
      const idx = clamp(this.opts.debugLayerIndex, 0, n - 1);
      this.blitPairs(frame, tw, th, pairs, data[idx], posY - (idx + 1) * z);
    } else {
      for (let i = 1; i <= n; i++) {
        this.blitPairs(frame, tw, th, pairs, data[i - 1], posY - i * z);
      }
    }

    return new ImageData(frame, tw, th);
  }

  exportAllDirections(): ImageData[] {
    this.ensureSource();
    const frames: ImageData[] = [];
    const step = 360 / this.opts.directions;
    for (let d = 0; d < this.opts.directions; d++) {
      const f = this.render(d * step);
      if (!f) break;
      frames.push(f);
    }
    return frames;
  }

  static async fromImageSource(src: HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas): Promise<RawImage> {
    const cvs = new OffscreenCanvas(src.width, src.height);
    const ctx = cvs.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const id = ctx.getImageData(0, 0, src.width, src.height);
    return { width: src.width, height: src.height, data: id.data };
  }

  // --- private ----------------------------------------------------------------

  private yScale(): number {
    return Math.sin(degToRad(this.opts.xRotations));
  }

  private cutSheetFrames(): RawImage[] {
    const frames: RawImage[] = [];
    if (!this.texData) return frames;
    const img = this.texData;
    const fw = Math.floor(img.width / 2);
    const fh = Math.floor(img.height / 2);
    if (fw <= 0 || fh <= 0) return frames;
    const n = 4;
    if (this.opts.sliceCount > 0) n = Math.min(this.opts.sliceCount, n);
    for (let i = 0; i < n; i++) {
      const ox = (i % 2) * fw, oy = Math.floor(i / 2) * fh;
      const buf = new Uint8ClampedArray(fw * fh * 4);
      for (let row = 0; row < fh; row++) {
        for (let col = 0; col < fw; col++) {
          const si = ((oy + row) * img.width + (ox + col)) * 4;
          const di = (row * fw + col) * 4;
          buf[di] = img.data[si]; buf[di + 1] = img.data[si + 1];
          buf[di + 2] = img.data[si + 2]; buf[di + 3] = img.data[si + 3];
        }
      }
      frames.push({ width: fw, height: fh, data: buf });
    }
    return frames;
  }

  private ensureSource(): void {
    if (!this.sourceDirty) return;
    this.sourceDirty = false;
    this.sliceImages = [];
    this.sliceImagesBack = [];
    this.sliceData = [];
    this.sliceDataBack = [];
    this.src = {};
    if (!this.texData) return;
    const entry = this.buildSourceEntry();
    this.src = entry;
    this.sliceImages = entry.slices;
    this.sliceImagesBack = entry.slicesBack;
    this.sliceData = entry.slices.map((s: RawImage) => s.data);
    this.sliceDataBack = entry.slicesBack.map((s: RawImage) => s.data);
  }

  private buildSourceEntry(): Record<string, any> {
    const frames = this.cutSheetFrames();
    const result: { slices: RawImage[]; slicesBack: RawImage[] } = { slices: [], slicesBack: [] };
    if (frames.length > 0) {
      const last = frames.length - 1;
      const topRotated = rotate90CCW(frames[0]);
      const faces: RawImage[] = [
        topRotated,
        frames[Math.min(1, last)],
        frames[Math.min(2, last)],
        frames.length === 3 ? frames[1] : frames[Math.min(3, last)],
      ];
      const hasBack = frames.length >= 4 && !isInvisible(frames[3]);
      const carved = this.buildCarvedSlices(faces, hasBack);
      result.slices = carved.front;
      result.slicesBack = carved.back;
    }
    return {
      slices: result.slices,
      slicesBack: result.slicesBack,
      data: result.slices.map((s: RawImage) => s.data),
      dataBack: result.slicesBack.map((s: RawImage) => s.data),
    };
  }

  private buildCarvedSlices(faces: RawImage[], hasBack: boolean): { front: RawImage[]; back: RawImage[] } {
    const FI = [0, 1, 2, 3] as const;
    const top = faces[FI[0]], front = faces[FI[1]], side = faces[FI[2]], back = faces[FI[3]];
    const w = top.width, d = top.height, h = front.height;
    const slices: RawImage[] = [], slicesBack: RawImage[] = [];
    if (w <= 0 || d <= 0 || h <= 0) return { front: slices, back: slicesBack };

    const td = top.data, fd = front.data, sd = side.data, fw = front.width, sw = side.width;
    const bd = hasBack ? back.data : fd;
    const bw = hasBack ? back.width : fw;
    const useFront = !isInvisible(front);
    const useSide = !isInvisible(side);

    const uOfY = new Int32Array(d);
    for (let y = 0; y < d; y++) {
      const u = clamp(d - 1 - y, 0, sw - 1);
      uOfY[y] = this.opts.flipSideView ? clamp(y, 0, sw - 1) : u;
    }
    const fxOfX = new Int32Array(w);
    const bxOfX = new Int32Array(w);
    for (let x = 0; x < w; x++) {
      fxOfX[x] = Math.min(x, fw - 1);
      bxOfX[x] = Math.min(w - 1 - x, bw - 1);
    }

    const zTop = new Int32Array(w * d).fill(-1);
    for (let y = 0; y < d; y++) {
      const u = uOfY[y], row = y * w;
      for (let x = 0; x < w; x++) {
        if (td[(row + x) * 4 + 3] === 0) continue;
        for (let r = 0; r < h; r++) {
          if (useFront && fd[(r * fw + fxOfX[x]) * 4 + 3] === 0) continue;
          if (useSide && sd[(r * sw + u) * 4 + 3] === 0) continue;
          if (hasBack && bd[(r * bw + bxOfX[x]) * 4 + 3] === 0) continue;
          zTop[row + x] = h - 1 - r;
          break;
        }
      }
    }

    const mask = new Uint8Array(w * d);
    const distL = new Int32Array(w * d);
    const distR = new Int32Array(w * d);
    const distB = new Int32Array(w * d);
    const distF = new Int32Array(w * d);

    for (let z = 0; z < h; z++) {
      const r = h - 1 - z;
      mask.fill(0);
      let anyPixel = false;
      for (let y = 0; y < d; y++) {
        const u = uOfY[y], row = y * w;
        for (let x = 0; x < w; x++) {
          if (td[(row + x) * 4 + 3] === 0) continue;
          if (useFront && fd[(r * fw + fxOfX[x]) * 4 + 3] === 0) continue;
          if (useSide && sd[(r * sw + u) * 4 + 3] === 0) continue;
          if (hasBack && bd[(r * bw + bxOfX[x]) * 4 + 3] === 0) continue;
          mask[row + x] = 1;
          anyPixel = true;
        }
      }

      const buf = new Uint8ClampedArray(w * d * 4);
      const bufBack = new Uint8ClampedArray(w * d * 4);
      if (!anyPixel) {
        slices.push({ width: w, height: d, data: buf });
        slicesBack.push({ width: w, height: d, data: bufBack });
        continue;
      }

      for (let y = 0; y < d; y++) {
        const row = y * w;
        let lo = -1;
        for (let x = 0; x < w; x++) {
          if (mask[row + x] === 0) lo = x; else distL[row + x] = x - lo;
        }
        lo = w;
        for (let x = w - 1; x >= 0; x--) {
          if (mask[row + x] === 0) lo = x; else distR[row + x] = lo - x;
        }
      }
      for (let x = 0; x < w; x++) {
        let lo = -1;
        for (let y = 0; y < d; y++) {
          const i = y * w + x;
          if (mask[i] === 0) lo = y; else distB[i] = y - lo;
        }
        lo = d;
        for (let y = d - 1; y >= 0; y--) {
          const i = y * w + x;
          if (mask[i] === 0) lo = y; else distF[i] = lo - y;
        }
      }

      for (let y = 0; y < d; y++) {
        const u = uOfY[y], s4 = (r * sw + u) * 4, row = y * w;
        for (let x = 0; x < w; x++) {
          const i = row + x;
          if (mask[i] === 0) continue;
          const di4 = i * 4;
          if (z === zTop[i]) {
            putPixel(buf, di4, td, di4);
            putPixel(bufBack, di4, td, di4);
            continue;
          }
          const f4 = (r * fw + fxOfX[x]) * 4;
          const b4 = (r * bw + bxOfX[x]) * 4;
          const sideOk = useSide && sd[s4 + 3] !== 0;
          let done = false;
          if (sideOk && (distL[i] < distF[i] || distR[i] < distF[i])) done = putPixel(buf, di4, sd, s4);
          if (!done && useFront) done = putPixel(buf, di4, fd, f4);
          if (!done && sideOk) done = putPixel(buf, di4, sd, s4);
          if (!done) putPixel(buf, di4, td, di4);
          done = false;
          if (sideOk && (distL[i] < distB[i] || distR[i] < distB[i])) done = putPixel(bufBack, di4, sd, s4);
          if (!done) done = putPixel(bufBack, di4, bd, b4);
          if (!done && sideOk) done = putPixel(bufBack, di4, sd, s4);
          if (!done) putPixel(bufBack, di4, td, di4);
        }
      }

      slices.push({ width: w, height: d, data: buf });
      slicesBack.push({ width: w, height: d, data: bufBack });
    }
    return { front: slices, back: slicesBack };
  }

  private isBackHemisphere(angleDeg: number): boolean {
    return Math.cos(degToRad(angleDeg)) < 0;
  }

  private canvasSize(): [number, number] {
    if (this.sliceImages.length === 0) return [0, 0];
    const w = this.sliceImages[0].width, d = this.sliceImages[0].height;
    let tw = Math.ceil(Math.sqrt(w * w + d * d));
    let th = tw + this.sliceImages.length * this.opts.zDistance + 1;
    if (this.opts.enableShadow) {
      const bp = Math.ceil(this.opts.shadowBlur) * 2;
      tw += 2 * (Math.ceil(Math.abs(this.opts.shadowOffsetX)) + bp);
      th += 2 * (Math.ceil(Math.abs(this.opts.shadowOffsetY)) + bp);
    }
    return [tw, th];
  }

  private buildMapping(angleRad: number, sw: number, sh: number, tw: number, th: number): Int32Array {
    const pairs: number[] = [];
    const c = Math.cos(angleRad), s = Math.sin(angleRad);
    const pivotX = tw / 2, pivotY = th / 2;
    const shiftX = sw / 2, shiftY = sh / 2;
    const yScale = this.yScale();
    const reach = Math.sqrt(sw * sw + sh * sh) / 2 * yScale + 2;
    const y0 = Math.max(0, Math.floor(pivotY - reach));
    const y1 = Math.min(th - 1, Math.floor(pivotY + reach) + 1);
    for (let y = y0; y <= y1; y++) {
      const dy = (y - pivotY) / yScale;
      const row = y * tw;
      for (let x = 0; x < tw; x++) {
        const dx = x - pivotX;
        const sx = dx * c - dy * s + shiftX;
        const sy = dx * s + dy * c + shiftY;
        if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
          pairs.push(row + x, Math.floor(sy) * sw + Math.floor(sx));
        }
      }
    }
    return new Int32Array(pairs);
  }

  private blitPairs(frame: Uint8ClampedArray, tw: number, th: number, pairs: Int32Array, src: Uint8ClampedArray, rowOff: number): void {
    const shift = rowOff * tw;
    const total = tw * th;
    for (let k = 0; k < pairs.length; k += 2) {
      const di = pairs[k] + shift;
      if (di < 0 || di >= total) continue;
      const si4 = pairs[k + 1] * 4;
      const a = src[si4 + 3];
      if (a === 0) continue;
      const di4 = di * 4;
      if (a === 255) {
        frame[di4] = src[si4]; frame[di4 + 1] = src[si4 + 1];
        frame[di4 + 2] = src[si4 + 2]; frame[di4 + 3] = 255;
      } else {
        const inv = 255 - a;
        frame[di4] = (src[si4] * a + frame[di4] * inv) / 255;
        frame[di4 + 1] = (src[si4 + 1] * a + frame[di4 + 1] * inv) / 255;
        frame[di4 + 2] = (src[si4 + 2] * a + frame[di4 + 2] * inv) / 255;
        frame[di4 + 3] = a + frame[di4 + 3] * inv / 255;
      }
    }
  }

  private shadowRGB(): [number, number, number] {
    return [
      Math.round(this.opts.shadowColor[0] * 255),
      Math.round(this.opts.shadowColor[1] * 255),
      Math.round(this.opts.shadowColor[2] * 255),
    ];
  }

  private boxBlur(src: Float32Array, w: number, h: number, radius: number, horiz: boolean): Float32Array {
    const dst = new Float32Array(w * h);
    const inv = 1 / (2 * radius + 1);
    const outer = horiz ? h : w;
    const inner = horiz ? w : h;
    const idx = (o: number, k: number) => horiz ? o * w + k : k * w + o;
    for (let o = 0; o < outer; o++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += src[idx(o, clamp(k, 0, inner - 1))];
      for (let k = 0; k < inner; k++) {
        dst[idx(o, k)] = sum * inv;
        sum += src[idx(o, clamp(k + radius + 1, 0, inner - 1))]
             - src[idx(o, clamp(k - radius, 0, inner - 1))];
      }
    }
    return dst;
  }

  private getFootprint(): RawImage | null {
    if (!this.src || this.sliceImages.length === 0) return null;
    if (this.src.footprint) return this.src.footprint;
    const w = this.sliceImages[0].width, d = this.sliceImages[0].height;
    const buf = new Uint8ClampedArray(w * d * 4);
    for (const sd of this.sliceData) {
      for (let i = 0; i < w * d; i++) {
        if (sd[i * 4 + 3] !== 0) {
          buf[i * 4] = 255; buf[i * 4 + 1] = 255;
          buf[i * 4 + 2] = 255; buf[i * 4 + 3] = 255;
        }
      }
    }
    const fp: RawImage = { width: w, height: d, data: buf };
    this.src.footprint = fp;
    return fp;
  }

  private getShadowSilhouette(): RawImage | null {
    const radius = Math.ceil(this.opts.shadowBlur);
    if (radius <= 0) return this.getFootprint();
    const fp = this.getFootprint();
    if (!fp) return null;
    const w = fp.width, d = fp.height, pad = radius * 2;
    const bw = w + pad * 2, bh = d + pad * 2;
    let alpha: Float32Array<ArrayBufferLike> = new Float32Array(bw * bh);
    const fpd = fp.data;
    for (let y = 0; y < d; y++) {
      for (let x = 0; x < w; x++) {
        if (fpd[(y * w + x) * 4 + 3] !== 0) alpha[(y + pad) * bw + (x + pad)] = 1;
      }
    }
    for (let i = 0; i < 2; i++) {
      alpha = this.boxBlur(alpha, bw, bh, radius, true);
      alpha = this.boxBlur(alpha, bw, bh, radius, false);
    }
    const buf = new Uint8ClampedArray(bw * bh * 4);
    for (let i = 0; i < bw * bh; i++) {
      const a = Math.round(alpha[i] * 255);
      if (a > 0) { buf[i * 4] = 255; buf[i * 4 + 1] = 255; buf[i * 4 + 2] = 255; buf[i * 4 + 3] = a; }
    }
    return { width: bw, height: bh, data: buf };
  }

  private rasterShadow(frame: Uint8ClampedArray, tw: number, th: number, angleDeg: number, posY: number): void {
    const sil = this.getShadowSilhouette();
    if (!sil) return;
    const sd = sil.data;
    const pairs = this.buildMapping(degToRad(angleDeg), sil.width, sil.height, tw, th);
    const rgb = this.shadowRGB();
    const shadowA = Math.round(this.opts.shadowColor[3] * 255);
    const offX = Math.round(this.opts.shadowOffsetX);
    const offY = Math.round(this.opts.shadowOffsetY) + posY;
    for (let k = 0; k < pairs.length; k += 2) {
      const di = pairs[k];
      const si4 = pairs[k + 1] * 4;
      const a = sd[si4 + 3];
      if (a === 0) continue;
      const col = (di % tw) + offX;
      const row = Math.floor(di / tw) + offY;
      if (col < 0 || col >= tw || row < 0 || row >= th) continue;
      const di4 = (row * tw + col) * 4;
      frame[di4] = rgb[0]; frame[di4 + 1] = rgb[1];
      frame[di4 + 2] = rgb[2]; frame[di4 + 3] = Math.round(a * shadowA / 255);
    }
  }
}
