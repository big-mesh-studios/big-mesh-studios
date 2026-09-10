import{c as A,b as N,M as g}from"./index-15chYpX_.js";const m=(o,t)=>o<t?-1:o>t?1:0,T=(o,t)=>o.at-t.at||m(o.producer,t.producer)||m(o.id,t.id);class I{events=new Map;get size(){return this.events.size}has(t){return this.events.has(t)}get(t){return this.events.get(t)}add(t){return this.events.has(t.id)?!1:(this.events.set(t.id,t),!0)}apply(t){let e=0;for(const s of t)this.add(s)&&e++;return e}inOrder(){return[...this.events.values()].sort(T)}snapshot(){return[...this.events.values()]}}const P=1e6,y=40,v=128,E=64,u=40,S=64,M=9999,O=500,_=8,$=80,x=300,z=80,L=1e3,f=500,i=(o,t)=>typeof o=="string"&&o.length>=1&&o.length<=t,h=o=>typeof o=="string"&&o.length<=256,d=o=>typeof o=="number"&&Number.isFinite(o)&&Math.abs(o)<=P,k=o=>Array.isArray(o)&&o.length===3&&o.every(d),D=(o,t)=>{if(typeof t!="object"||t===null)return!1;const e=t;switch(o){case"npc":return i(e.id,64)&&d(e.x)&&d(e.z)&&(e.y===void 0||d(e.y))&&(e.name===void 0||i(e.name,y))&&(e.model===void 0||i(e.model,v));case"npc-remove":return i(e.id,64);case"prop":return i(e.id,64)&&i(e.model,v)&&d(e.x)&&d(e.z)&&(e.y===void 0||d(e.y))&&(e.name===void 0||i(e.name,y))&&(e.yaw===void 0||d(e.yaw))&&(e.height===void 0||typeof e.height=="number"&&Number.isFinite(e.height)&&e.height>0&&e.height<=E)&&(e.solid===void 0||typeof e.solid=="boolean");case"prop-remove":return i(e.id,64);case"zone":{const{min:s,max:n}=e;return i(e.id,64)&&(e.name===void 0||i(e.name,y))&&k(s)&&k(n)&&s[0]<=n[0]&&s[1]<=n[1]&&s[2]<=n[2]}case"zone-remove":return i(e.id,64);case"item-define":return i(e.id,u)&&i(e.name,u)&&(e.sprite===""||i(e.sprite,S))&&typeof e.stackable=="boolean";case"item-give":case"item-take":return h(e.player)&&i(e.item,u)&&typeof e.count=="number"&&Number.isInteger(e.count)&&e.count>=1&&e.count<=M;case"item-hold":return h(e.player)&&(e.item===""||i(e.item,u));case"toast":return h(e.player)&&i(e.text,x);case"dialog":return h(e.player)&&i(e.npcId,64)&&i(e.prompt,O)&&Array.isArray(e.options)&&e.options.length>=1&&e.options.length<=_&&e.options.every(s=>i(s,$));case"dialog-close":return h(e.player)&&i(e.npcId,64);case"narrate":return h(e.player)&&i(e.name,f)&&i(e.text,f);case"ending":return h(e.player)&&i(e.title,z)&&i(e.text,L);case"restart":return h(e.player);case"time":return(e.seconds===void 0||typeof e.seconds=="number"&&Number.isFinite(e.seconds)&&e.seconds>=0)&&(e.speed===void 0||typeof e.speed=="number"&&Number.isFinite(e.speed))&&(e.clear===void 0||typeof e.clear=="boolean")&&(e.seconds!==void 0||e.speed!==void 0||e.clear===!0)}},R=o=>{let t;try{t=JSON.parse(o.payload)}catch{return null}return D(o.tag,t)?{tag:o.tag,payload:t}:null};class G{onChange=null;definitions=new Map;counts=new Map;held=null;define(t){this.definitions.set(t.id,t),this.emit()}definition(t){return this.definitions.get(t)??null}definitionsList(){return[...this.definitions.values()]}give(t,e=1){const s=this.definitions.get(t),n=this.counts.get(t)??0;this.counts.set(t,s!==void 0&&!s.stackable?1:n+e),this.emit()}take(t,e=1){const s=this.counts.get(t)??0;if(s<e)return!1;const n=s-e;return n===0?(this.counts.delete(t),this.held===t&&(this.held=null)):this.counts.set(t,n),this.emit(),!0}count(t){return this.counts.get(t)??0}get heldId(){return this.held}heldItem(){return this.held===null?null:this.definitions.get(this.held)??null}hold(t){this.held=t!==null&&this.count(t)>0?t:null,this.emit()}clear(){this.definitions.clear(),this.counts.clear(),this.held=null,this.emit()}emit(){this.onChange?.()}}class H{ready;heightAt;now;onToast;onDialog;onNotice;onEnding;onRestart;onTime;onNarrate;inventory=new G;log=new I;sent=new Set;npcs=new Map;props=new Map;zones=new Map;playerZones=new Map;dialogs=new Map;loaded=!1;sequence=0;problem;disposed=!1;constructor(t){this.now=t.now,this.heightAt=t.heightAt,this.onToast=t.onToast,this.onDialog=t.onDialog,this.onNotice=t.onNotice,this.onEnding=t.onEnding,this.onRestart=t.onRestart,this.onTime=t.onTime,this.onNarrate=t.onNarrate,this.ready=A({seed:t.seed,now:t.now})}get npcList(){return[...this.npcs.values()]}npc(t){return this.npcs.get(t)??null}get propList(){return[...this.props.values()]}prop(t){return this.props.get(t)??null}dialogFor(t){return this.dialogs.get(t)??null}get lastError(){return this.problem}async loadProject(t,e){const s=await this.ready;this.assertAlive();const n=await N(t,e);s.load(n),this.loaded=!0,await this.drain(s),await this.step()}async talk(t,e){this.assertAlive(),this.dialogs.delete(e),this.notifyDialog(e,null),this.author({kind:"npc-talk",npcId:t},e),await this.step()}async choose(t,e,s){const n=this.dialogs.get(s);n===void 0||n.npcId!==t||(this.author({kind:"npc-choose",npcId:t,option:e},s),await this.step())}async leave(t,e){this.assertAlive(),this.author({kind:"npc-leave",npcId:t},e),this.dialogs.delete(e),this.notifyDialog(e,null),await this.step()}async use(t,e,s=""){this.assertAlive(),this.author({kind:"entity-used",entityId:t,item:s},e),await this.step()}async useItem(t,e){this.assertAlive(),this.author({kind:"item-used",item:t},e),await this.step()}async movePlayer(t,e,s,n){this.assertAlive();const a=new Set;for(const r of this.zones.values())e>=r.min[0]&&e<=r.max[0]&&s>=r.min[1]&&s<=r.max[1]&&n>=r.min[2]&&n<=r.max[2]&&a.add(r.id);const l=this.playerZones.get(t)??new Set,c=[...a].filter(r=>!l.has(r)),p=[...l].filter(r=>!a.has(r));if(!(c.length===0&&p.length===0)){this.playerZones.set(t,a);for(const r of p)this.author({kind:"zone-left",zoneId:r},t);for(const r of c)this.author({kind:"zone-entered",zoneId:r},t);await this.step()}}describe(){return`script: ${this.loaded?"loaded":"not loaded"} · ${this.npcs.size} NPC(s), ${this.props.size} prop(s), ${this.dialogs.size} dialog(s)${this.problem===void 0?"":` — ${this.problem}`}`}dispose(){this.disposed||(this.disposed=!0,this.ready.then(t=>t.dispose()))}async step(){if(!this.loaded)return;const t=await this.ready,e=this.log.inOrder().filter(s=>!this.sent.has(s.id));for(const s of e)this.sent.add(s.id);this.problem=void 0;try{t.tick(this.now(),JSON.stringify(e))}catch(s){this.problem=s instanceof Error?s.message:String(s),this.onNotice?.(this.problem)}finally{await this.drain(t)}}async drain(t){const{effects:e,logs:s}=t.drain();for(const n of s)this.onNotice?.(n);for(const n of e){const a=R(n);a!==null&&this.apply(a)}}author(t,e){const s=this.now();this.sequence+=1,this.log.add({...t,id:`${e===""?"local":e}:${s}:${this.sequence}`,at:s,producer:e})}apply(t){switch(t.tag){case"npc":{const{id:e,x:s,y:n,z:a,name:l,model:c}=t.payload;this.npcs.set(e,{id:e,name:l??"NPC",model:c??"",x:s,y:n??this.heightAt(s,a),z:a});break}case"npc-remove":this.npcs.delete(t.payload.id);break;case"prop":{const{id:e,model:s,x:n,y:a,z:l,name:c,yaw:p,height:r,solid:b}=t.payload;this.props.set(e,{id:e,model:s,name:c??e,x:n,y:a??this.heightAt(n,l),z:l,yaw:p??0,height:r??2,solid:b??!1});break}case"prop-remove":this.props.delete(t.payload.id);break;case"item-define":this.inventory.define(t.payload);break;case"item-give":this.inventory.give(t.payload.item,t.payload.count);break;case"item-take":this.inventory.take(t.payload.item,t.payload.count);break;case"item-hold":this.inventory.hold(t.payload.item===""?null:t.payload.item);break;case"toast":this.onToast?.(t.payload.player,t.payload.text);break;case"dialog":{const{player:e,npcId:s,prompt:n,options:a}=t.payload,l={npcId:s,name:this.npcs.get(s)?.name??s,prompt:n,options:a};this.dialogs.set(e,l),this.notifyDialog(e,l);break}case"dialog-close":this.dialogs.delete(t.payload.player),this.notifyDialog(t.payload.player,null);break;case"zone":{const{id:e,name:s,min:n,max:a}=t.payload;this.zones.set(e,{id:e,name:s??e,min:n,max:a});break}case"zone-remove":this.zones.delete(t.payload.id);break;case"narrate":this.onNarrate?.(t.payload.player,{name:t.payload.name,text:t.payload.text});break;case"ending":this.onEnding?.(t.payload.player,{title:t.payload.title,text:t.payload.text});break;case"restart":this.onRestart?.(t.payload.player);break;case"time":this.onTime?.({seconds:t.payload.seconds,speed:t.payload.speed,clear:t.payload.clear});break}}notifyDialog(t,e){this.onDialog!==void 0&&this.onDialog(t,e)}assertAlive(){if(this.disposed)throw new Error("script host disposed")}}const C=String.raw`
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
`,w=o=>o.options.map((t,e)=>`  ${e+1}. ${t}`).join(`
`);class F{heightAt;report;onDialog;onEnding;onRestart;onTime;onNarrate;host=null;last=null;constructor(t){this.heightAt=t.heightAt,this.report=t.report??(()=>{}),this.onDialog=t.onDialog??(()=>{}),this.onEnding=t.onEnding??(()=>{}),this.onRestart=t.onRestart??(()=>{}),this.onTime=t.onTime??(()=>{}),this.onNarrate=t.onNarrate??(()=>{})}get running(){return this.host!==null}npcs(){return this.host?.npcList??[]}npc(t){return this.host?.npc(t)??null}props(){return this.host?.propList??[]}prop(t){return this.host?.prop(t)??null}async use(t,e=""){await this.host?.use(t,"",e)}async updatePosition(t,e,s){await this.host?.movePlayer("",t,e,s)}async useItem(t){await this.host?.useItem(t,"")}heldItem(){return this.host?.inventory.heldItem()??null}async talkTo(t){await this.host?.talk(t,"")}async chooseOption(t){const e=this.host?.dialogFor("")??null;e!==null&&await this.host?.choose(e.npcId,t,"")}async leaveTalk(){const t=this.host?.dialogFor("")??null;t!==null&&await this.host?.leave(t.npcId,"")}async loadSample(){return await this.loadProject({[g]:C},g,12345),`sample script loaded — ${this.loadedLine()}`}async loadProject(t,e,s){return this.last={files:t,entry:e,seed:s},await(await this.freshHost(s)).loadProject(t,e),`script loaded — ${this.loadedLine()}`}async restart(){this.last!==null&&await this.loadProject(this.last.files,this.last.entry,this.last.seed)}async describe(){const t=this.host;if(t===null)return"no script loaded — use /script:demo";const e=t.dialogFor("");return t.describe()+(e===null?"":`
${t.npc(e.npcId)?.name??e.npcId}: ${e.prompt}
${w(e)}`)}async talk(t){const e=this.host;if(e===null)return"no script loaded — use /script:demo";const s=e.npc(t);return s===null?`there is no NPC "${t}" — /script:state lists them`:(await e.talk(t,""),this.dialogLine()??`talking to ${s.name}, who says nothing yet`)}async choose(t){const e=this.host;if(e===null)return"no script loaded — use /script:demo";const s=e.dialogFor("");return s===null?"nobody is talking — /script:talk <id> first":t<1||t>s.options.length?`choose 1..${s.options.length}`:(await e.choose(s.npcId,t-1,""),this.dialogLine()??"the conversation is over")}async leave(){const t=this.host;if(t===null)return"no script loaded — use /script:demo";const e=t.dialogFor("");return e===null?"nobody is talking":(await t.leave(e.npcId,""),"conversation ended")}dispose(){this.host?.dispose(),this.host=null}async freshHost(t){return this.host?.dispose(),this.host=new H({seed:t,now:()=>Date.now(),heightAt:this.heightAt,onToast:(e,s)=>{e===""&&this.report(s)},onDialog:(e,s)=>this.onDialog(e,s),onNotice:this.report,onEnding:(e,s)=>this.onEnding(e,s),onRestart:e=>this.onRestart(e),onTime:e=>this.onTime(e),onNarrate:(e,s)=>this.onNarrate(e,s)}),this.host}loadedLine(){const t=this.host?.npcList??[],e=t.map(a=>`${a.name} at (${a.x}, ${a.z})`).join(", "),s=t.map(a=>a.id).join(" or "),n=t.length===0?"no NPCs placed yet":`Talk with /script:talk <id> (${s})`;return`${e}. ${n}`}dialogLine(){const t=this.host;if(t===null)return null;const e=t.dialogFor("");return e===null?null:`${t.npc(e.npcId)?.name??e.npcId}: ${e.prompt}
${w(e)}`}}export{F as ScriptConsole};
