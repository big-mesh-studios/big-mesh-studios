import{r as o,J as i,P as p,a as l}from"./index-B4JD7M9m.js";const r="main.ts",d=`// Your place's script. Export a bmsTick function and the world will call it
// each step with the shared clock and the events since the last step. The
// TypeScript types are stripped when the script loads, so the panel's
// squiggles are the whole of the type-check; imports may only reach this
// place's own script files. Run /script:demo for a working sample.
declare const engine: {
  dispatch(tag: string, payload: string): void;
  log(line: string): void;
  now(): number;
};

let started = false;

export function bmsTick(clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    engine.dispatch(
      "npc",
      JSON.stringify({ id: "guide", x: 8, z: 8, name: "Guide" }),
    );
    engine.log("your place started");
  }
  const events = JSON.parse(
    eventsJson,
  ) as Array<{ kind: string; producer: string }>;
  for (const event of events) {
    if (event.kind === "npc-talk") {
      engine.dispatch(
        "toast",
        JSON.stringify({ player: event.producer, text: "Hello, traveller." }),
      );
    }
  }
}
`,y=e=>({manifest:{name:"",seed:e,spawn:[0,0,0],scripts:[r]},scripts:{[r]:d}}),g=async e=>{const t=new i,a={...e.manifest,scripts:Object.keys(e.scripts)};t.file(p,JSON.stringify(a));for(const[n,c]of Object.entries(e.scripts))t.file(n,c);const s=await t.generateAsync({type:"arraybuffer"});return new Blob([s],{type:l})},h=async e=>{const t=await o(e),a=await i.loadAsync(await e.arrayBuffer()),s={};for(const n of t.scripts??[])s[n]=await a.file(n).async("text");return{manifest:t,scripts:s}};export{r as M,y as e,h as r,g as w};
