// Minimal two-page WebRTC smoke test: does a real ICE connection establish
// between two Playwright Chromium contexts at all, using the same STUN servers
// and mDNS flag the harness uses? Independent of the app's signal-m mailbox.
import { chromium } from "playwright";

const server = "http://127.0.0.1:5173";
const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];
const launchArgs = [
  "--disable-blink-features=AutomationControlled",
  "--disable-features=WebRtcHideLocalIpsWithMdns",
];

const initiatorScript = () => `
  window.__result = new Promise((resolve) => {
    const pc = new RTCPeerConnection({ iceServers: ${JSON.stringify(ICE_SERVERS)} });
    window.__pc = pc;
    const dc = pc.createDataChannel("smoke");
    dc.onopen = () => resolve({ opened: "initiator", state: pc.iceConnectionState });
    dc.onerror = () => resolve({ error: "datachannel error" });
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "failed") resolve({ error: "ice failed", state: s });
    };
    pc.createOffer().then((offer) => pc.setLocalDescription(offer));
  });
  window.__getOffer = () => {
    const pcs = window.__pc.localDescription.sdp;
    const cands = (window.__pc.localDescription.sdp.match(/a=candidate:/g) || []).length;
    return { type: "offer", sdp: pcs, cands };
  };
  window.__setAnswer = async (answer) => {
    await window.__pc.setRemoteDescription(new RTCSessionDescription(answer));
  };
  window.__offerReady = new Promise((resolve) => {
    window.__pc.onicegatheringstatechange = () => {
      if (window.__pc.iceGatheringState === "complete") resolve(true);
    };
  });
`;

const responderScript = () => `
  window.__result = new Promise((resolve) => {
    const pc = new RTCPeerConnection({ iceServers: ${JSON.stringify(ICE_SERVERS)} });
    window.__pc = pc;
    pc.ondatachannel = (e) => {
      e.channel.onopen = () => resolve({ opened: "responder", state: pc.iceConnectionState });
      e.channel.onerror = () => resolve({ error: "datachannel error" });
    };
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "failed") resolve({ error: "ice failed", state: s });
    };
  });
  window.__setRemote = async (offer) => {
    await window.__pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await window.__pc.createAnswer();
    await window.__pc.setLocalDescription(answer);
    return { type: "answer", sdp: window.__pc.localDescription.sdp, cands: (window.__pc.localDescription.sdp.match(/a=candidate:/g) || []).length };
  };
`;

async function main() {
  const ctxA = await chromium.launchPersistentContext(
    "/tmp/opencode/wrtc-smoke-a",
    {
      headless: false,
      viewport: { width: 480, height: 360 },
      args: launchArgs,
    },
  );
  const ctxB = await chromium.launchPersistentContext(
    "/tmp/opencode/wrtc-smoke-b",
    {
      headless: false,
      viewport: { width: 480, height: 360 },
      args: launchArgs,
    },
  );
  const a = ctxA.pages()[0] ?? (await ctxA.newPage());
  const b = ctxB.pages()[0] ?? (await ctxB.newPage());
  await a.goto(server, { waitUntil: "domcontentloaded" });
  await b.goto(server, { waitUntil: "domcontentloaded" });

  await a.evaluate(initiatorScript());
  await b.evaluate(responderScript());

  await a.evaluate("window.__offerReady");
  const offer = await a.evaluate("window.__getOffer()");
  const answer = await b.evaluate(
    `window.__setRemote(${JSON.stringify(offer)})`,
  );
  await a.evaluate(`window.__setAnswer(${JSON.stringify(answer)})`);

  const winner = await Promise.race([
    a.evaluate("window.__result").catch((e) => ({ error: String(e) })),
    b.evaluate("window.__result").catch((e) => ({ error: String(e) })),
  ]);
  const timeout = await Promise.race([
    new Promise((r) => setTimeout(() => r(true), 15000)),
    Promise.resolve(false),
  ]);
  console.log("smoke outcome:", JSON.stringify(winner));
  if (timeout) console.log("(note: 15s watchdog elapsed)");
  console.log(
    "offer candidate count:",
    offer.cands,
    " answer candidate count:",
    answer.cands,
  );
  console.log(
    "A iceState:",
    await a.evaluate("window.__pc.iceConnectionState").catch(() => "?"),
  );
  console.log(
    "B iceState:",
    await b.evaluate("window.__pc.iceConnectionState").catch(() => "?"),
  );

  await ctxA.close();
  await ctxB.close();
}

main().catch((e) => {
  console.error("smoke failed:", e);
  process.exit(1);
});
