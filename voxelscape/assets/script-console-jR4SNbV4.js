import{c as b,b as T,M as g}from"./index-kxL2m02D.js";const m=(i,t)=>i<t?-1:i>t?1:0,A=(i,t)=>i.at-t.at||m(i.producer,t.producer)||m(i.id,t.id);class I{events=new Map;get size(){return this.events.size}has(t){return this.events.has(t)}get(t){return this.events.get(t)}add(t){return this.events.has(t.id)?!1:(this.events.set(t.id,t),!0)}apply(t){let e=0;for(const s of t)this.add(s)&&e++;return e}inOrder(){return[...this.events.values()].sort(A)}snapshot(){return[...this.events.values()]}}const N=1e6,y=40,f=128,M=64,u=40,E=64,S=9999,O=500,_=8,x=80,z=300,$=80,F=1e3,v=500,L=864e5,o=(i,t)=>typeof i=="string"&&i.length>=1&&i.length<=t,d=i=>typeof i=="string"&&i.length<=256,l=i=>typeof i=="number"&&Number.isFinite(i)&&Math.abs(i)<=N,w=i=>Array.isArray(i)&&i.length===3&&i.every(l),D=(i,t)=>{if(typeof t!="object"||t===null)return!1;const e=t;switch(i){case"npc":return o(e.id,64)&&l(e.x)&&l(e.z)&&(e.y===void 0||l(e.y))&&(e.name===void 0||o(e.name,y))&&(e.model===void 0||o(e.model,f))&&(e.yaw===void 0||l(e.yaw));case"npc-remove":return o(e.id,64);case"prop":return o(e.id,64)&&o(e.model,f)&&l(e.x)&&l(e.z)&&(e.y===void 0||l(e.y))&&(e.name===void 0||o(e.name,y))&&(e.yaw===void 0||l(e.yaw))&&(e.height===void 0||typeof e.height=="number"&&Number.isFinite(e.height)&&e.height>0&&e.height<=M)&&(e.solid===void 0||typeof e.solid=="boolean");case"prop-remove":return o(e.id,64);case"zone":{const{min:s,max:n}=e;return o(e.id,64)&&(e.name===void 0||o(e.name,y))&&w(s)&&w(n)&&s[0]<=n[0]&&s[1]<=n[1]&&s[2]<=n[2]}case"zone-remove":return o(e.id,64);case"item-define":return o(e.id,u)&&o(e.name,u)&&(e.sprite===""||o(e.sprite,E))&&typeof e.stackable=="boolean";case"item-give":case"item-take":return d(e.player)&&o(e.item,u)&&typeof e.count=="number"&&Number.isInteger(e.count)&&e.count>=1&&e.count<=S;case"item-hold":return d(e.player)&&(e.item===""||o(e.item,u));case"toast":return d(e.player)&&o(e.text,z);case"dialog":return d(e.player)&&o(e.npcId,64)&&o(e.prompt,O)&&Array.isArray(e.options)&&e.options.length>=1&&e.options.length<=_&&e.options.every(s=>o(s,x));case"dialog-close":return d(e.player)&&o(e.npcId,64);case"narrate":return d(e.player)&&o(e.name,v)&&o(e.text,v);case"ending":return d(e.player)&&o(e.title,$)&&o(e.text,F);case"restart":return d(e.player);case"time":return(e.seconds===void 0||typeof e.seconds=="number"&&Number.isFinite(e.seconds)&&e.seconds>=0)&&(e.speed===void 0||typeof e.speed=="number"&&Number.isFinite(e.speed))&&(e.clear===void 0||typeof e.clear=="boolean")&&(e.seconds!==void 0||e.speed!==void 0||e.clear===!0);case"timer":return o(e.id,64)&&typeof e.afterMs=="number"&&Number.isFinite(e.afterMs)&&e.afterMs>=0&&e.afterMs<=L;case"player-place":return d(e.player)&&l(e.x)&&l(e.z)&&(e.y===void 0||l(e.y))&&(e.yaw===void 0||l(e.yaw));case"player-face":return d(e.player)&&l(e.x)&&l(e.z)}},R=i=>{let t;try{t=JSON.parse(i.payload)}catch{return null}return D(i.tag,t)?{tag:i.tag,payload:t}:null};class G{onChange=null;definitions=new Map;counts=new Map;held=null;define(t){this.definitions.set(t.id,t),this.emit()}definition(t){return this.definitions.get(t)??null}definitionsList(){return[...this.definitions.values()]}give(t,e=1){const s=this.definitions.get(t),n=this.counts.get(t)??0;this.counts.set(t,s!==void 0&&!s.stackable?1:n+e),this.emit()}take(t,e=1){const s=this.counts.get(t)??0;if(s<e)return!1;const n=s-e;return n===0?(this.counts.delete(t),this.held===t&&(this.held=null)):this.counts.set(t,n),this.emit(),!0}count(t){return this.counts.get(t)??0}get heldId(){return this.held}heldItem(){return this.held===null?null:this.definitions.get(this.held)??null}hold(t){this.held=t!==null&&this.count(t)>0?t:null,this.emit()}clear(){this.definitions.clear(),this.counts.clear(),this.held=null,this.emit()}emit(){this.onChange?.()}}class H{ready;heightAt;now;onToast;onDialog;onNotice;onEnding;onRestart;onTime;onNarrate;onPlayerPlace;onPlayerFace;inventory=new G;log=new I;sent=new Set;npcs=new Map;props=new Map;zones=new Map;playerZones=new Map;dialogs=new Map;pendingTimers=new Map;pumping=!1;loaded=!1;sequence=0;problem;disposed=!1;constructor(t){this.now=t.now,this.heightAt=t.heightAt,this.onToast=t.onToast,this.onDialog=t.onDialog,this.onNotice=t.onNotice,this.onEnding=t.onEnding,this.onRestart=t.onRestart,this.onTime=t.onTime,this.onNarrate=t.onNarrate,this.onPlayerPlace=t.onPlayerPlace,this.onPlayerFace=t.onPlayerFace,this.ready=b({seed:t.seed,now:t.now})}get npcList(){return[...this.npcs.values()]}npc(t){return this.npcs.get(t)??null}get propList(){return[...this.props.values()]}prop(t){return this.props.get(t)??null}dialogFor(t){return this.dialogs.get(t)??null}get lastError(){return this.problem}async loadProject(t,e){const s=await this.ready;this.assertAlive();const n=await T(t,e);s.load(n),this.loaded=!0,await this.drain(s),await this.step()}async talk(t,e){this.assertAlive(),this.dialogs.delete(e),this.notifyDialog(e,null),this.author({kind:"npc-talk",npcId:t},e),await this.step()}async choose(t,e,s){const n=this.dialogs.get(s);n===void 0||n.npcId!==t||(this.author({kind:"npc-choose",npcId:t,option:e},s),await this.step())}async leave(t,e){this.assertAlive(),this.author({kind:"npc-leave",npcId:t},e),this.dialogs.delete(e),this.notifyDialog(e,null),await this.step()}async use(t,e,s=""){this.assertAlive(),this.author({kind:"entity-used",entityId:t,item:s},e),await this.step()}async useItem(t,e){this.assertAlive(),this.author({kind:"item-used",item:t},e),await this.step()}async movePlayer(t,e,s,n){this.assertAlive();const a=new Set;for(const r of this.zones.values())e>=r.min[0]&&e<=r.max[0]&&s>=r.min[1]&&s<=r.max[1]&&n>=r.min[2]&&n<=r.max[2]&&a.add(r.id);const h=this.playerZones.get(t)??new Set,c=[...a].filter(r=>!h.has(r)),p=[...h].filter(r=>!a.has(r));if(!(c.length===0&&p.length===0)){this.playerZones.set(t,a);for(const r of p)this.author({kind:"zone-left",zoneId:r},t);for(const r of c)this.author({kind:"zone-entered",zoneId:r},t);await this.step()}}async pump(){if(!this.loaded||this.pendingTimers.size===0||this.pumping)return;const t=this.now(),e=[...this.pendingTimers].filter(([,s])=>s<=t).map(([s])=>s).sort();if(e.length!==0){this.pumping=!0;try{for(const s of e)this.pendingTimers.delete(s),this.author({kind:"timer",timerId:s},"");await this.step()}finally{this.pumping=!1}}}describe(){return`script: ${this.loaded?"loaded":"not loaded"} · ${this.npcs.size} NPC(s), ${this.props.size} prop(s), ${this.dialogs.size} dialog(s)${this.problem===void 0?"":` — ${this.problem}`}`}dispose(){this.disposed||(this.disposed=!0,this.ready.then(t=>t.dispose()))}async step(){if(!this.loaded)return;const t=await this.ready,e=this.log.inOrder().filter(s=>!this.sent.has(s.id));for(const s of e)this.sent.add(s.id);this.problem=void 0;try{t.tick(this.now(),JSON.stringify(e))}catch(s){this.problem=s instanceof Error?s.message:String(s),this.onNotice?.(this.problem)}finally{await this.drain(t)}}async drain(t){const{effects:e,logs:s}=t.drain();for(const n of s)this.onNotice?.(n);for(const n of e){const a=R(n);a!==null&&this.apply(a)}}author(t,e){const s=this.now();this.sequence+=1,this.log.add({...t,id:`${e===""?"local":e}:${s}:${this.sequence}`,at:s,producer:e})}apply(t){switch(t.tag){case"npc":{const{id:e,x:s,y:n,z:a,name:h,model:c,yaw:p}=t.payload;this.npcs.set(e,{id:e,name:h??"NPC",model:c??"",x:s,y:n??this.heightAt(s,a),z:a,yaw:p??0});break}case"npc-remove":this.npcs.delete(t.payload.id);break;case"prop":{const{id:e,model:s,x:n,y:a,z:h,name:c,yaw:p,height:r,solid:P}=t.payload;this.props.set(e,{id:e,model:s,name:c??e,x:n,y:a??this.heightAt(n,h),z:h,yaw:p??0,height:r??2,solid:P??!1});break}case"prop-remove":this.props.delete(t.payload.id);break;case"item-define":this.inventory.define(t.payload);break;case"item-give":this.inventory.give(t.payload.item,t.payload.count);break;case"item-take":this.inventory.take(t.payload.item,t.payload.count);break;case"item-hold":this.inventory.hold(t.payload.item===""?null:t.payload.item);break;case"toast":this.onToast?.(t.payload.player,t.payload.text);break;case"dialog":{const{player:e,npcId:s,prompt:n,options:a}=t.payload,h={npcId:s,name:this.npcs.get(s)?.name??s,prompt:n,options:a};this.dialogs.set(e,h),this.notifyDialog(e,h);break}case"dialog-close":this.dialogs.delete(t.payload.player),this.notifyDialog(t.payload.player,null);break;case"zone":{const{id:e,name:s,min:n,max:a}=t.payload;this.zones.set(e,{id:e,name:s??e,min:n,max:a});break}case"zone-remove":this.zones.delete(t.payload.id);break;case"narrate":this.onNarrate?.(t.payload.player,{name:t.payload.name,text:t.payload.text});break;case"ending":this.onEnding?.(t.payload.player,{title:t.payload.title,text:t.payload.text});break;case"restart":this.onRestart?.(t.payload.player);break;case"time":this.onTime?.({seconds:t.payload.seconds,speed:t.payload.speed,clear:t.payload.clear});break;case"timer":this.pendingTimers.set(t.payload.id,this.now()+t.payload.afterMs);break;case"player-place":{const{player:e,x:s,y:n,z:a,yaw:h}=t.payload;this.onPlayerPlace?.(e,{x:s,z:a,y:n,yaw:h});break}case"player-face":{const{player:e,x:s,z:n}=t.payload;this.onPlayerFace?.(e,{x:s,z:n});break}}}notifyDialog(t,e){this.onDialog!==void 0&&this.onDialog(t,e)}assertAlive(){if(this.disposed)throw new Error("script host disposed")}}const C=String.raw`
var started = false;
var state = {};
var SHOP = "sable";
var GATE = "rook";

function key(player, npcId) { return player + "|" + npcId; }

function reply(player, npcId, prompt, options) {
  engine.dispatch("dialog", JSON.stringify({ player: player, npcId: npcId, prompt: prompt, options: options }));
}

function end(player, npcId, text) {
  engine.dispatch("dialog-close", JSON.stringify({ player: player, npcId: npcId }));
  engine.dispatch("toast", JSON.stringify({ player: player, text: text }));
}

function spawn() {
  engine.dispatch("npc", JSON.stringify({ id: SHOP, x: 40, z: 12, name: "Sable" }));
  engine.dispatch("npc", JSON.stringify({ id: GATE, x: -40, z: 12, name: "Rook" }));
}

// The shop's tree: greetings loop until an option that ends the talk.
function shopNode(player, node, option) {
  var k = key(player, SHOP);
  if (node === "greeting") {
    if (option === 0) {
      state[k] = "offer";
      reply(player, SHOP, "The potions are behind me... for a price.", ["I'll take a potion.", "Never mind."]);
      return;
    }
    end(player, SHOP, "Come back when your pockets are full.");
    return;
  }
  if (node === "offer") {
    if (option === 0) {
      end(player, SHOP, "Sold! A potion of courage, fresh from the cellar.");
      return;
    }
    state[k] = "greeting";
    reply(player, SHOP, "The shelves will still be here.", ["Buy a potion.", "Goodbye."]);
    return;
  }
}

function gateNode(player, node, option) {
  var k = key(player, GATE);
  if (node === "greeting") {
    if (option === 0) {
      state[k] = "lore";
      reply(player, GATE, "Beyond lies the broken mesa. Few come back.", ["What do you guard?", "Thanks, farewell."]);
      return;
    }
    end(player, GATE, "Mind the fog.");
    return;
  }
  if (node === "lore") {
    if (option === 0) {
      end(player, GATE, "A key of cloudstone, they say. I have seen neither.");
      return;
    }
    reply(player, GATE, "The mesa keeps its own counsel.", ["What do you guard?", "Thanks, farewell."]);
    return;
  }
}

export function bmsTick(clockMs, eventsJson) {
  if (!started) {
    started = true;
    spawn();
  }
  var events = JSON.parse(eventsJson);
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var k = key(e.producer, e.npcId);
    if (e.kind === "npc-talk") {
      state[k] = "greeting";
      if (e.npcId === SHOP) {
        reply(e.producer, SHOP, "Welcome, traveller. My wares are humble.", ["Buy a potion.", "Goodbye."]);
      } else {
        reply(e.producer, GATE, "The way is shut until the mist lifts.", ["What lies beyond?", "Farewell."]);
      }
    } else if (e.kind === "npc-choose") {
      var node = state[k];
      if (!node) { continue; }
      if (e.npcId === SHOP) { shopNode(e.producer, node, e.option); }
      else { gateNode(e.producer, node, e.option); }
    } else if (e.kind === "npc-leave") {
      delete state[k];
    }
  }
}
`,k=i=>i.options.map((t,e)=>`  ${e+1}. ${t}`).join(`
`);class J{heightAt;report;onDialog;onEnding;onRestart;onTime;onNarrate;onPlayerPlace;onPlayerFace;host=null;last=null;constructor(t){this.heightAt=t.heightAt,this.report=t.report??(()=>{}),this.onDialog=t.onDialog??(()=>{}),this.onEnding=t.onEnding??(()=>{}),this.onRestart=t.onRestart??(()=>{}),this.onTime=t.onTime??(()=>{}),this.onNarrate=t.onNarrate??(()=>{}),this.onPlayerPlace=t.onPlayerPlace??(()=>{}),this.onPlayerFace=t.onPlayerFace??(()=>{})}get running(){return this.host!==null}npcs(){return this.host?.npcList??[]}npc(t){return this.host?.npc(t)??null}props(){return this.host?.propList??[]}prop(t){return this.host?.prop(t)??null}async use(t,e=""){await this.host?.use(t,"",e)}async updatePosition(t,e,s){await this.host?.movePlayer("",t,e,s)}async pump(){await this.host?.pump()}async useItem(t){await this.host?.useItem(t,"")}heldItem(){return this.host?.inventory.heldItem()??null}async talkTo(t){await this.host?.talk(t,"")}async chooseOption(t){const e=this.host?.dialogFor("")??null;e!==null&&await this.host?.choose(e.npcId,t,"")}async leaveTalk(){const t=this.host?.dialogFor("")??null;t!==null&&await this.host?.leave(t.npcId,"")}async loadSample(){return await this.loadProject({[g]:C},g,12345),`sample script loaded — ${this.loadedLine()}`}async loadProject(t,e,s){return this.last={files:t,entry:e,seed:s},await(await this.freshHost(s)).loadProject(t,e),`script loaded — ${this.loadedLine()}`}async restart(){this.last!==null&&await this.loadProject(this.last.files,this.last.entry,this.last.seed)}async describe(){const t=this.host;if(t===null)return"no script loaded — use /script:demo";const e=t.dialogFor("");return t.describe()+(e===null?"":`
${t.npc(e.npcId)?.name??e.npcId}: ${e.prompt}
${k(e)}`)}async talk(t){const e=this.host;if(e===null)return"no script loaded — use /script:demo";const s=e.npc(t);return s===null?`there is no NPC "${t}" — /script:state lists them`:(await e.talk(t,""),this.dialogLine()??`talking to ${s.name}, who says nothing yet`)}async choose(t){const e=this.host;if(e===null)return"no script loaded — use /script:demo";const s=e.dialogFor("");return s===null?"nobody is talking — /script:talk <id> first":t<1||t>s.options.length?`choose 1..${s.options.length}`:(await e.choose(s.npcId,t-1,""),this.dialogLine()??"the conversation is over")}async leave(){const t=this.host;if(t===null)return"no script loaded — use /script:demo";const e=t.dialogFor("");return e===null?"nobody is talking":(await t.leave(e.npcId,""),"conversation ended")}dispose(){this.host?.dispose(),this.host=null}async freshHost(t){return this.host?.dispose(),this.host=new H({seed:t,now:()=>Date.now(),heightAt:this.heightAt,onToast:(e,s)=>{e===""&&this.report(s)},onDialog:(e,s)=>this.onDialog(e,s),onNotice:this.report,onEnding:(e,s)=>this.onEnding(e,s),onRestart:e=>this.onRestart(e),onTime:e=>this.onTime(e),onNarrate:(e,s)=>this.onNarrate(e,s),onPlayerPlace:(e,s)=>this.onPlayerPlace(e,s),onPlayerFace:(e,s)=>this.onPlayerFace(e,s)}),this.host}loadedLine(){const t=this.host?.npcList??[],e=t.map(a=>`${a.name} at (${a.x}, ${a.z})`).join(", "),s=t.map(a=>a.id).join(" or "),n=t.length===0?"no NPCs placed yet":`Talk with /script:talk <id> (${s})`;return`${e}. ${n}`}dialogLine(){const t=this.host;if(t===null)return null;const e=t.dialogFor("");return e===null?null:`${t.npc(e.npcId)?.name??e.npcId}: ${e.prompt}
${k(e)}`}}export{J as ScriptConsole};
