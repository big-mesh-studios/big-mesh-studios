function fw(t,e){for(var n=0;n<e.length;n++){const r=e[n];if(typeof r!="string"&&!Array.isArray(r)){for(const s in r)if(s!=="default"&&!(s in t)){const i=Object.getOwnPropertyDescriptor(r,s);i&&Object.defineProperty(t,s,i.get?i:{enumerable:!0,get:()=>r[s]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();class Rt extends Error{source;constructor(e){const n=Error,r=n.stackTraceLimit;r!==void 0&&(n.stackTraceLimit=0),super(),r!==void 0&&(n.stackTraceLimit=r),this.source=e}}class nl extends Error{source;constructor(e,n){super(n instanceof Error?n.message:String(n),{cause:n}),this.source=e}}function Ho(t){return t instanceof nl?t.cause:t}class Pg extends Error{constructor(){super("")}}class pw extends Error{constructor(){super("")}}const Ig=0,xi=1,Zr=2,Ol=4,Er=8,Li=16,ws=32,Zn=64,Bs=128,vd=256,rl=512,Us=1024,mw=2048,wd=1,Og=2,zl=4,gw=8,zg=16,hr=32,_d=64,Ue=1,ct=2,Lt=4,ki=1,Kn=2,Ll=3,Ge={},xd={};function ji(t){return t===xd?void 0:t}const yw=typeof Proxy=="function",kd={},bw=Symbol("refresh"),sl=new WeakMap,Rn=new Set;function vw(t){let e=sl.get(t);if(e)return en(e);const n=t.nn,r=n?.Me?en(n.Me):null;return e={en:t,Ne:new Set,rn:[[],[]],tn:null,Ie:Te,an:r},sl.set(t,e),Rn.add(e),Kh(t.he,e),Kh(t.pe,e),e}function Kh(t,e){if(!t)return;const n=sl.get(t);if(!n)return;const r=en(n);r!==e&&r.en===t&&!r.an&&(r.an=e)}function en(t){for(;t.tn;)t=t.tn;return t}function ww(t,e){if(t=en(t),e=en(e),t===e)return t;e.tn=t;for(const n of e.Ne)t.Ne.add(n);return e.Ne.clear(),t.rn[0].push(...e.rn[0]),t.rn[1].push(...e.rn[1]),e.rn[0].length=0,e.rn[1].length=0,t}function Mo(t){const e=t.Me;if(!e)return;const n=en(e);if(Rn.has(n))return n;t.Me=void 0}function go(t){if(Kr(t)&&t.sn){const e=t.sn=$l(t.sn);if(e.fn!==!0)return e;t.sn=null}return Mo(t)?.Ie??t.Ie}function Kr(t){return t.Ae!==void 0&&t.Ae!==Ge}function Sd(t,e){const n=en(e),r=t.Me;if(r){if(r.tn){t.Me=e;return}const s=en(r);if(Rn.has(s)){s!==n&&!Kr(t)&&(n.an&&en(n.an)===s?t.Me=e:s.an&&en(s.an)===n||ww(n,s));return}}t.Me=e}const io=new Set,Mn={eE:new Array(2e3).fill(void 0),tE:!1,He:0,EE:0},Si={eE:new Array(2e3).fill(void 0),tE:!1,He:0,EE:0};let zt=0,Te=null,Ro=!1,il=!1,Jh=!1,Au=0;const oo=new Set;function _w(t){const e=t.m;return io.size===0&&Rn.size===0&&t.vt.length===0&&e.je.length===0&&e.A.length===0&&e.cn.size===0&&oo.size===0}function xw(){if(oo.size!==0)for(const t of oo){if(t.o!==null){oo.delete(t);continue}t.De===Ge&&(t.Ae!==void 0&&t.Ae!==Ge||t.t||(oo.delete(t),t.ut?.()))}}function ea(){return{Se:zt,Qt:[],Ee:new Map,je:[],A:[],cn:new Set,ie:[],yt:{gt:[[],[]],vt:[]},fn:!1,ln:new Set}}function kw(t,e){e.fn=t,t.ie.push(...e.ie);for(const n of Rn)n.Ie===e&&(n.Ie=t);e.je.length&&(t.je.push(...e.je),e.je.length=0),e.A.length&&(t.A.push(...e.A),e.A.length=0);for(const n of e.cn)t.cn.add(n);for(const[n,r]of e.Ee){let s=t.Ee.get(n);s||t.Ee.set(n,s=new Set);for(const i of r)s.add(i)}for(const n of e.ln)t.ln.add(n)}function In(){if(il){Sw();return}Ro||(Ro=!0,!Au&&!At.bt&&queueMicrotask(Hs))}function Po(t){if(il)return;il=!0;let e="[REACTIVITY_HALTED]";t===void 0?console.error(e):console.error(e,t)}function Sw(){Jh||(Jh=!0,console.error("[REACTIVITY_HALTED]"))}let Ew=0;class Lg{ve=null;gt=[[],[]];vt=[];kt=0;created=zt;addChild(e){this.vt.push(e),e.ve=this}removeChild(e){const n=this.vt.indexOf(e);n>=0&&(this.vt.splice(n,1),e.ve=null)}notify(e,n,r,s){return this.ve?this.ve.notify(e,n,r,s):!1}run(e){if(this.gt[e-1].length){const s=this.gt[e-1];this.gt[e-1]=[],Tw(s,e)}const n=this.vt,r=++Ew;for(let s=0;s<n.length;){const i=n[s];if(i.kt!==r&&(i.kt=r,i.run?.(e),n[s]!==i)){s=0;continue}s++}}enqueue(e,n){e&&(Jt?en(Jt).rn[e-1].push(n):this.gt[e-1].push(n)),In()}stashQueues(e){e.gt[0].push(...this.gt[0]),e.gt[1].push(...this.gt[1]),this.gt=[[],[]];for(let n=0;n<this.vt.length;n++){let r=this.vt[n],s=e.vt[n];s||(s={gt:[[],[]],vt:[]},e.vt[n]=s),r.stashQueues(s)}}restoreQueues(e){this.gt[0].push(...e.gt[0]),this.gt[1].push(...e.gt[1]);for(let n=0;n<e.vt.length;n++){const r=e.vt[n];let s=this.vt[n];s&&s.restoreQueues(r)}}}class ue extends Lg{bt=!1;m=ea();static Ce;static me;static Xe;static Dt=null;static p=null;static G=null;static M=null;static h=null;static dt=null;static It=null;static _e=null;static ce=null;static Ge=null;static un=null;static St=null;static At=null;static Pt=null;static $e=null;static k=null;static Lt=null;static ht=null;static En=null;static dn=null;static Tn=null;static In=null;static Ot=null;static Ct=null;static Rt=null;static Ze=null;static ze=null;static Ke=null;static Nn=null;flush(){if(!this.bt){this.bt=!0;try{if(ao(Mn,ue.Ce),Te){if(!Mw(Te)){const s=Te;ao(Si,ue.Ce),this.m===s&&(yo=this.m=ea()),Rn.size&&(ue.In(ki),ue.In(Kn)),this.stashQueues(s.yt),zt++,Ro=Mn.EE>=Mn.He||this.m.Qt.length>0,Qh(s.Qt),Te=null,mc(null,!0);return}const n=Te,r=this.m;if(r!==n&&r.Qt.push(...n.Qt),this.restoreQueues(n.yt),io.delete(n),Te=null,Qh(r.Qt),mc(n),r===n){const s=ea();s.Qt=r.Qt,s.je=r.je,s.A=r.A,s.cn=r.cn,yo=this.m=s}}else _w(this)?(ol(),Mn.EE>=Mn.He&&(ao(Mn,ue.Ce),ol())):(io.size&&ao(Si,ue.Ce),mc());zt++,Ro=Mn.EE>=Mn.He,Rn.size&&ue.In(ki),this.run(ki),Rn.size&&ue.In(Kn),this.run(Kn)}finally{this.bt=!1}}}notify(e,n,r,s){if(n&Ue){if(r&Ue){const i=s!==void 0?s:e._;if(i?.l)return!0;if(Te&&i){const o=i.source;let a=Te.Ee.get(o);a||Te.Ee.set(o,a=new Set);const l=a.size;a.add(e),a.size!==l&&In()}}return!0}return!1}initTransition(e){if(e&&(e=$l(e)),e&&e===Te||!e&&Te&&Te.Se===zt)return;if(!Te)Te=e??ea();else if(e){const r=Te;kw(e,r),io.delete(r),Te=e}io.add(Te),Te.Se=zt;const n=this.m;if(n!==Te){for(let r=0;r<n.Qt.length;r++){const s=n.Qt[r];s.Ie=Te,Te.Qt.push(s)}for(let r=0;r<n.je.length;r++){const s=n.je[r];s.Ie=Te,Te.je.push(s)}n.A.length&&Te.A.push(...n.A);for(const r of n.cn)Te.cn.add(r);yo=this.m=Te}for(const r of Rn)r.Ie||(r.Ie=Te)}}function $i(t){yo.Qt.push(t)}function _s(t,e=!1){const n=t.Me||Jt,r=t.xe!==void 0;for(let s=t.o;s!==null;s=s.ue){if(r&&s.le.T&gw){s.le.se|=vd;continue}e&&n?(s.le.se|=Bs,Sd(s.le,n)):e&&(s.le.se|=Bs,s.le.Me=void 0),jo(s.le)}}function Aw(t){const e=t;if(!e.ae){t.De!==Ge&&(t.Ue=t.De,t.De=Ge),(t.he||t.pe)&&ue.un(t);return}t.De!==Ge&&(t.Ue=t.De,t.De=Ge,t.Pe&&t.Pe!==Ll&&(t.Be=!0)),e.se&=~Us,e.S&Ue||(e.S&=~Lt),(e.Qe!==null||e.ye!==null)&&ue.me(e,!1,!0),(t.he||t.pe)&&ue.un(t)}function ol(){const t=yo.Qt;for(let e=0;e<t.length;e++)Aw(t[e]);t.length=0}function mc(t=null,e=!1){const n=!e;n&&ol(),!e&&At.vt.length&&Tu(At);const r=Mn.EE>=Mn.He;if(r&&ao(Mn,ue.Ce),n){r&&ol();const s=t??At.m;if(s.je.length&&ue.En(s.je),t&&t.ln.size){for(const i of t.ln)i.se&Zn||jo(i);t.ln.clear()}s.A.length&&(ue.G(s.A),At.vt.length&&Tu(At)),s.cn.size&&ue.Dt(s.cn,t),xw(),Rn.size&&ue.Tn(t)}}function Tu(t){for(const e of t.vt)e.ne?.(),Tu(e)}function Qh(t){for(let e=0;e<t.length;e++)t[e].Ie=Te}const At=new ue;let yo=At.m;function Hs(t){if(t){Au++;try{return t()}finally{try{Hs()}finally{Au--}}}if(!At.bt&&!il)for(;Ro||Te;)At.flush()}function Tw(t,e){for(let n=0;n<t.length;n++)t[n](e)}function Cw(t,e){if(t.se&(ws|Zn))return!1;if(t.oe?.has(e))return!0;for(let n=t.et;n;n=n.tt){let r=n.nt;for(;r;){if(r===e||r.it===e)return!0;r=r.nn}}return!!(t.S&Ue&&t._ instanceof Rt&&t._.source===e)}function Mw(t){if(t.fn)return!0;if(t.ie.length)return!1;let e=!0;for(const[n,r]of t.Ee){let s=!1;for(const i of r){if(Cw(i,n)){s=!0;break}r.delete(i)}if(!s)t.Ee.delete(n);else if(n.S&Ue&&n._?.source===n){e=!1;break}}return e&&ue.dn?.(t)&&(e=!1),e&&(t.fn=!0),e}function $l(t){for(;t.fn&&typeof t.fn=="object";)t=t.fn;return t}function Rw(t,e){const n=Te;try{return Te=$l(t),e()}finally{Te=n}}function Mr(t){return t.se&ws?Si:Mn}function jo(t){if(t.Pe===Ll){const n=t;n.Be||(n.Be=!0,n.C.enqueue(Kn,n.Ft));return}const e=Mr(t);e.He>t.Ve&&(e.He=t.Ve),Ed(t,e)}function $g(t,e){const n=(t.ve?.Nt?t.ve.Tt?.Ve:t.ve?.Ve)??-1;n>=t.Ve&&(t.Ve=n+1);const r=t.Ve,s=e.eE[r];if(s===void 0)e.eE[r]=t;else{const i=s.ot;i.lt=t,t.ot=i,s.ot=t}r>e.EE&&(e.EE=r)}function Ed(t,e){let n=t.se;n&(Er|Ol|Us)||(n&xi?t.se=n&-4|Zr|Er:(t.se=n|Er,e.tE&&!(n&Zr)&&(e.tE=!1)),n&Li||$g(t,e))}function Ad(t,e){let n=t.se;n&(Er|Ol|Li|Us)||(t.se=n|Li,$g(t,e))}function Wi(t,e){const n=t.se;if(!(n&(Er|Li)))return;t.se=n&-25;const r=t.Ve;if(t.ot===t)e.eE[r]=void 0;else{const s=t.lt,i=e.eE[r],o=s??i;t===i?e.eE[r]=s:t.ot.lt=s,o.ot=t.ot}t.ot=t,t.lt=void 0}function Dg(t){if(!t.tE){t.tE=!0;for(let e=0;e<=t.EE;e++)for(let n=t.eE[e];n!==void 0;n=n.lt)n.se&Er&&al(n)}}function al(t,e=Zr){const n=t.se;if(!((n&(xi|Zr))>=e)){t.se=n&-4|e;for(let r=t.o;r!==null;r=r.ue)al(r.le,xi);if(t.u!==null)for(let r=t.u;r!==null;r=r.fe)for(let s=r.o;s!==null;s=s.ue)al(s.le,xi)}}function ao(t,e){for(t.tE=!1,t.He=0;t.He<=t.EE;t.He++){let n=t.eE[t.He];for(;n!==void 0;)n.se&Er?e(n):Pw(n,t),n=t.eE[t.He]}t.EE=0}function Pw(t,e){Wi(t,e);let n=t.Ve;for(let r=t.et;r;r=r.tt){const s=r.nt,i=s.it||s;i.ae&&i.Ve>=n&&(n=i.Ve+1)}if(t.Ve!==n){t.Ve=n;for(let r=t.o;r!==null;r=r.ue)Ad(r.le,Mr(r.le))}}const Iw={};function Ng(t){let e=t.ke;for(;e;){const n=e.se;e.se=n|ws,n&(Er|Li)&&(Wi(e,n&ws?Si:Mn),n&Er?Ed(e,Si):Ad(e,Si)),Ng(e),e=e.Fe}}function Wo(t,e=!1,n){const r=t.se;if(r&Zn)return;if(e){t.se=r|Zn;const i=t;(i.he||i.pe)&&ue.un(i)}e&&t.ae&&(t.Te=null);let s=n?t.Qe:t.ke;for(;s;){const i=s.Fe;if(s.et){const o=s;Wi(o,Mr(o));let a=o.et;do a=Md(a);while(a!==null);o.et=null,o.We=null}Wo(s,!0),s=i}if(n?t.Qe=null:(t.ke=null,t.qe=0),e&&!n&&!(r&ws)&&t.ve!==null&&!(t.ve.se&Zn)){const i=t.rt,o=t.Fe;i!==null?i.Fe=o:t.ve.ke=o,o!==null&&(o.rt=i),t.rt=null}if(Ow(t,n),e&&t.Et){const i=t.Et;t.Et=void 0,i()}}function Ow(t,e){let n=e?t.ye:t.Le;if(n){if(Array.isArray(n))for(let r=0;r<n.length;r++){const s=n[r];s.call(s)}else n.call(n);e?t.ye=null:t.Le=null}}function zw(t,e){let n=t;for(;n.T&zl&&n.ve;)n=n.ve;if(n.id!=null)return $w(n.id,n.qe++);throw new Error("")}function Lw(t){return zw(t)}function Td(t,e,n){return t?.id??(e?n?.id:n?.id!=null?Lw(n):void 0)}function $w(t,e){const n=e.toString(36),r=n.length-1;return t+(r?String.fromCharCode(64+r):"")+n}function TN(){return cs||Yr?Iw:Wt?Ve:null}function Ss(){return Ve}function Cd(t){return Ve&&(Ve.Le?Array.isArray(Ve.Le)?Ve.Le.push(t):Ve.Le=[Ve.Le,t]:Ve.Le=t),t}function Dw(t=!0){Wo(this,t)}function $s(t){const e=Ve,n=t?.transparent??!1,r={id:Td(t,n,e),T:n?zl:0,Nt:!0,Tt:e?.Nt?e.Tt:e,ke:null,Fe:null,rt:null,Le:null,C:e?.C??At,we:e?.we||kd,qe:0,ye:null,Qe:null,ve:e,dispose:Dw};if(e){const s=e.ke;s===null||(r.Fe=s,s.rt=r),e.ke=r}return r}function Dl(t,e){const n=$s(e);return Gn(n,()=>t(()=>n.dispose()))}function Md(t){const e=t.nt,n=t.tt,r=t.ue,s=t.ll;if(r!==null?r.ll=s:e.st=s,s!==null)s.ue=r;else if(e.o=r,r===null){e.ut?.();const i=e;i.ae&&i.T&hr&&!(i.se&ws)&&!(i.S&Ue)&&Nl(i)}return n}function Fg(t){const e=t.We;let n=e!==null?e.tt:t.et;if(n!==null){do n=Md(n);while(n!==null);e!==null?e.tt=null:t.et=null}}function Nl(t){Wi(t,Mr(t));let e=t.et;for(;e!==null;)e=Md(e);t.et=null,t.We=null,Wo(t,!0)}function lo(t,e,n=!1){const r=e.We;if(r!==null&&r.nt===t){r.Oe&&=n;return}let s=null;const i=e.se&Ol;if(i&&(s=r!==null?r.tt:e.et,s!==null&&s.nt===t)){s.nl=e.Ye,e.We=s,s.Oe=n;return}const o=t.st;if(o!==null&&o.le===e&&(!i||o.nl===e.Ye)){i?o.Oe&&=n:o.Oe=n;return}const a=e.We=t.st={nt:t,le:e,tt:s,ll:o,ue:null,nl:e.Ye,Oe:n};r!==null?r.tt=a:e.et=a,o!==null?o.ue=a:t.o=a}function Nw(t,e){return t.oe?.has(e)?!1:((t.oe??=new Set).add(e),!0)}function Fw(t,e){return t.oe?.delete(e)?(t.oe.size===0&&(t.oe=void 0),!0):!1}function Bg(t){t.oe?.clear(),t.oe=void 0}function ll(t,e,n){if(!e){t._=null;return}if(n instanceof Rt&&n.source===e){t._=n;return}const r=t._;(!(r instanceof Rt)||r.source!==e)&&(t._=new Rt(e))}function js(t,e){for(let n=t.o;n!==null;n=n.ue)e(n.le,n);for(let n=t.u??null;n!==null;n=n.fe)for(let r=n.o;r!==null;r=r.ue)e(r.le,r)}function Ug(t){t.ae&&t.T&hr&&!t.o&&!(t.se&ws)&&!(t.S&Ue)&&Nl(t)}function Bw(t){let e;const n=new Set,r=s=>{n.has(s)||(n.add(s),!s.o&&s.T&hr&&(e??=[]).push(s),js(s,r))};if(js(t,r),e)for(const s of e)Ug(s)}function Uw(t,e){let n=!1;const r=new Set,s=i=>{r.has(i)||(r.add(i),i._===e&&(jo(i),n=!0),js(i,s))};js(t,s),n&&In()}function Hw(t){let e=!1,n;const r=new Set,s=ue.ce,i=o=>{if(r.has(o)||!Fw(o,t))return;r.add(o),o.Se=zt;const a=o.oe?.values().next().value;a?(ll(o,a),s!==null&&s(o)):(o.S&=~Ue,ll(o),s!==null&&s(o),o.de&&(jo(o),e=!0),o.de=!1,!o.o&&o.T&hr&&(n??=[]).push(o)),js(o,i)};if(js(t,i),n)for(const o of n)Ug(o);e&&In()}function ef(t){return t!=null&&typeof t=="object"&&typeof t.then=="function"}function jw(t,e,n){let r=!1,s=!1;if(typeof e=="object"&&e!==null&&Nt(()=>{r=e[Symbol.asyncIterator],s=!r&&ef(e)}),!s&&!r)return t.Te=null,e;t.Te=e;let i;const o=()=>{const u=go(t);if(u&&t.S&Lt&&!$l(u).Ee.has(t)){t.Ie=null;return}At.initTransition(u)},a=u=>{if(t.Te!==e)return;o();const d=u instanceof Rt;Ei(t,d?Ue:ct,u),t.Se=zt,d||Bw(t)},l=(u,d)=>{if(t.Te!==e||t.se&(Zr|Bs))return;o();const h=!!(t.S&Lt);Fg(t),Hg(t);const f=Mo(t);if(f&&f.Ne.delete(t),t.Ae!==void 0)t.De===Ge&&$i(t),t.De=u,ue._e!==null&&ue._e(t,u),Kr(t)||_s(t),t.Se=zt;else if(f){const m=t.Pe,p=t.Ue,y=t.be;try{(!m&&h||!y||!y(u,p))&&(t.Ue=u,t.Se=zt,ue._e!==null&&ue._e(t,u),_s(t,!0))}catch(g){Ei(t,ct,g)}}else try{wn(t,()=>u)}catch(m){Ei(t,ct,m)}Hw(t),In(),Hs(),d?.()},c=()=>t.T&hr&&!t.o&&!(t.S&Ue)?(Nl(t),!0):!1;if(s){let u=!1,d=!1,h,f=!0;if(e.then(m=>{f?(i=m,u=!0):(l(m),c())},m=>{f?(h=m,d=!0):(a(m),c())}),f=!1,d)throw a(h),h;if(!u)throw At.initTransition(go(t)),new Rt(Ve)}if(r){const u=e[Symbol.asyncIterator]();let d=!1,h=!1,f=!0;Cd(()=>{if(!h){h=!0;try{const g=u.return?.();ef(g)&&g.then(void 0,()=>{})}catch{}}});const m=()=>{c()||p()},p=()=>{let g,b,v=!1,x=!1,k=!0;if(u.next().then(C=>{if(k)g=C,v=!0,C.done&&(h=!0);else{if(t.Te!==e)return;C.done?(h=!0,d?(In(),Hs()):l(void 0),c()):(d=!0,l(C.value,m))}},C=>{k?(b=C,x=!0):t.Te===e&&(h=!0,a(C),c())}),k=!1,x){if(h=!0,a(b),f)throw b;return!0}return v&&!g.done?(i=g.value,d=!0,p()):v&&g.done},y=p();if(f=!1,!d&&!y)throw At.initTransition(go(t)),new Rt(Ve)}return i}function Hg(t,e=!1){t.oe&&Bg(t),t.de&&(t.de=!1),t.Re=!1,t.S=e?0:t.S&Lt,t._&&ll(t),(t.he||t.pe)&&ue.ce(t),t.u&&ue.Ge!==null&&ue.Ge(t),t.i&&t.i()}function Ei(t,e,n,r,s){e===ct&&!(n instanceof nl)&&!(n instanceof Rt)&&(n=new nl(t,n));const i=e===Ue&&n instanceof Rt?n.source:void 0,o=i===t,a=e===Ue&&t.Ae!==void 0&&!o,l=a&&Kr(t);r||(e===Ue&&i?(Nw(t,i),t.S=Ue|t.S&Lt,ll(t,i,n)):(Bg(t),t.S=e|(e!==ct?t.S&Lt:0),t._=n),ue.ce!==null&&ue.ce(t),t.u&&ue.Ge!==null&&ue.Ge(t)),s&&!r&&Sd(t,s);const c=r||l,u=r||a?void 0:s;if(t.i){if(r&&e===Ue)return;c?t.i(e,n):t.i();return}js(t,(d,h)=>{if(d.Se=zt,e===Ue&&i&&!d.oe?.has(i)||e!==Ue&&(d._!==n||d.oe)){if(h.Oe&&e!==Ue&&!(n instanceof Rt)){jo(d),In();return}!c&&!d.Ie&&$i(d),Ei(d,e,n,c,u)}})}ue.Ce=Rr;ue.me=Wo;let Wt=!1;function Wr(t){cs=t}function cl(t){Yr=t}function tf(t){Ve=t}let lr=!1,cs=!1,Yr=!1,Ve=null,Jt=null;function Rr(t,e=!1){const n=t.Pe;e||(t.Ie&&(!n||Te)&&Te!==t.Ie&&At.initTransition(t.Ie),Wi(t,Mr(t)),t.Te=null,t.Ie||n===Ll?Wo(t):(t.ke!==null||t.Le!==null)&&(Ng(t),t.ye=t.Le,t.Qe=t.ke,t.Le=null,t.ke=null,t.qe=0));let r=!!(t.se&Bs);const s=t.Ae!==void 0&&t.Ae!==Ge,i=!!(t.S&Lt),o=t.S&ct?t._:void 0,a=(t.se&mw)!==0,l=Ve;Ve=t,t.We=null,t.Ye++,t.se=Ol,t.Se=zt;let c=t.De===Ge?t.Ue:t.De,u=t.Ve,d=Wt,h=Jt;Wt=!0;const f=Yr;if(Yr=!1,r){const g=ue.Ze(t,!0);g&&(Jt=g)}else if(Te&&!e&&Te.je.length){const g=ue.Ze(t,!1);g&&(r=!0,Jt=g)}const m=n&&n!==Kn,p=lr;m&&(lr=!0);try{if(t.T&_d)c=t.ae(c),t.Te=null;else{const g=t.Te,b=t.ae(c),v=typeof b=="object"&&b!==null,x=t.Te!==g;c=x||!v?b:jw(t,b),!x&&!v&&(t.Te=null)}(t.S!==0||t.i!==void 0||t._||t.Re||t.de||t.oe!==void 0||t.he!==void 0||t.pe!==void 0||t.u!==null)&&Hg(t,e),t.Me&&ue.Ke(t)}catch(g){g instanceof Rt&&Jt&&ue.ze(t);let b=!1;g instanceof Rt&&(t.de=!0,ue.$e!==null&&(b=ue.$e(t,a))),Ei(t,g instanceof Rt?Ue:ct,g,void 0,g instanceof Rt?t.Me:void 0),b&&ue.k(t)}finally{Wt=d,Yr=f,m&&(lr=p),t.se=Ig|(e?t.se&vd:0),Ve=l}if(!t._){Fg(t);const g=s?ji(t.Ae):t.De===Ge?t.Ue:t.De;let b=!1;try{b=!n&&i||!t.be||!t.be(g,c)}catch(v){Ei(t,ct,v)}if(n&&b&&(t.Be=!t._,e||t.C.enqueue(n,t.Je??=ue.Xe.bind(null,t))),!t._){if(b){const v=s?t.Ae:void 0;e||n&&(Te!==t.Ie||Te===null)||r?(t.Ue=c,s&&r&&(t.Ae=c===void 0?xd:c,t.De=Ge)):(t.De=c,(Te||t.Ie)&&ue._e!==null&&ue._e(t,c)),t.o!==null&&(!s||r||t.Ae!==v)&&_s(t,r||s)}else if(s)t.De===Ge&&$i(t),t.De=c;else if(t.Ve!=u)for(let v=t.o;v!==null;v=v.ue)Ad(v.le,Mr(v.le))}o!==void 0&&!b&&!t._&&Uw(t,o)}Jt=h,(t.De!==Ge||t.Qe!==null||t.ye!==null||(t.S&(Ue|Lt))!==0)&&(!e||t.S&Ue)&&(!t.Ie||s)&&$i(t),t.Ie&&n&&Te!==t.Ie&&Rw(t.Ie,()=>Rr(t))}function Rd(t){if(t.se&xi)for(let e=t.et;e;e=e.tt){const n=e.nt,r=n.it||n;if(r.ae&&Rd(r),t.se&Zr)break}(t.se&(Zr|Bs)||t._&&t.Se<zt&&!t.Te)&&Rr(t),t.se=t.se&(vd|Er|Li)}function Es(t,e){const n=e?.transparent??!1,r={id:Td(e,n,Ve),T:(n?zl:0)|(e?.ownedWrite?wd:0)|(!Ve||e?.lazy?hr:0)|(e?.sync?_d:0)|(e?.V?Og:0)|0,be:e?.equals!=null?e.equals:Wg,ut:e?.unobserved,Le:null,C:Ve?.C??At,we:Ve?.we??kd,qe:0,ae:t,Ue:void 0,Ve:0,u:null,lt:void 0,ot:null,et:null,We:null,Ye:0,o:null,st:null,ve:Ve,Fe:null,rt:null,ke:null,se:e?.lazy?rl:Ig,S:Lt,Se:zt,De:Ge,ye:null,Qe:null,Te:null,Ie:null,Re:!1};return jg(r,e),r}function Ww(t,e,n,r,s,i){const o=i?.transparent??!1,a={id:Td(i,o,Ve),T:(o?zl:0)|(i?.ownedWrite?wd:0)|(i?.sync?_d:0)|0,be:!1,ut:i?.unobserved,Le:null,C:Ve?.C??At,we:Ve?.we??kd,qe:0,ae:t,Ue:void 0,Ve:0,u:null,lt:void 0,ot:null,et:null,We:null,Ye:0,o:null,st:null,ve:Ve,Fe:null,rt:null,ke:null,se:rl,S:Lt,Se:zt,De:Ge,ye:null,Qe:null,Te:null,Ie:null,Re:!1,Be:!1,ct:void 0,_t:e,ft:n,Et:void 0,Pe:r,i:s};return jg(a,Vw),a}const Vw={lazy:!0};function jg(t,e){t.ot=t;const n=Ve?.Nt?Ve.Tt:Ve;if(Ve){const r=Ve.ke;r===null||(t.Fe=r,r.rt=t),Ve.ke=t}n&&(t.Ve=n.Ve+1),ue.dt!==null&&ue.dt(t),!e?.lazy&&Rr(t,!0)}function us(t,e,n=null){const r={be:e?.equals!=null?e.equals:Wg,T:(e?.ownedWrite?wd:0)|(e?.V?Og:0),ut:e?.unobserved,Ue:t,o:null,st:null,Se:zt,it:n,fe:n?.u||null,De:Ge};return n&&(n.u=r),r}function Gw(t,e){const n=us(t,e);return n.Ae=Ge,n}function Yw(t,e){const n=Es(t,e);return n.Ae=Ge,n}function Wg(t,e){return t===e}function Nt(t,e){if(ue.It===null&&!Wt)return t();const n=Wt;Wt=!1;try{return ue.It!==null?ue.It(t):t()}finally{Wt=n}}function Pd(t,e){t.se&rl?(t.se&=~rl,Rr(t,!0)):t.se&Zn?Rr(t,!0):e&&Rd(t)}function ar(t){if(Yr)return ue.St(t);let e=Ve;e?.Nt&&(e=e.Tt);const n=t,r=t.it,s=r||t;if(cs?ue.At(t,e,s,r):typeof n.ae=="function"&&Pd(t,!1),!n.ae&&s===t&&t.Ae===void 0&&t.xe===void 0&&Te===null&&Jt===null)return e&&Wt&&lo(t,e),!e||t.De===Ge?t.Ue:t.De;if(e&&Wt&&(lo(t,e,cs),s.ae)){const o=Mr(t);s.Ve>=o.He&&(al(e),Dg(o),Rd(s));const a=s.Ve;a>=e.Ve&&t.ve!==e&&(e.Ve=a+1)}if(s.S&Ue)if(e&&!(lr&&s.Ie&&Te!==s.Ie)){if(Jt===null||ue.Ct(s))throw!Wt&&t!==e&&lo(t,e),s._}else{if(e&&s!==t&&s.S&Lt)throw!Wt&&t!==e&&lo(t,e),s._;if(!e&&s.S&Lt)throw s._}if(s.ae&&s.S&ct){if(Wt&&!cs&&s.Se<zt)return Rr(s),ar(t);throw s._}if(t.Ae!==void 0&&t.Ae!==Ge)return ji(t.Ae);if(Jt!==null&&Te!==null&&e!==null&&ue.Ot(t,s,e))return t.Ue;const i=!e||Jt!==null&&ue.Rt(t,s,e)||t.De===Ge||lr&&t.Ie&&Te!==t.Ie?t.Ue:t.De;return cs&&ue.Pt(t,i),!e&&s===t&&typeof n.ae=="function"&&t.T&hr&&!(s.S&Ue)&&!t.o&&Nl(t),i}function wn(t,e){if(t.Ie&&Te!==t.Ie&&At.initTransition(t.Ie),t.Ae!==void 0)return ue.ht(t,e);const n=t.De===Ge?t.Ue:t.De;return typeof e=="function"&&(e=e(n)),(!!(t.S&Lt)||!t.be||!t.be(n,e))&&(t.De===Ge&&$i(t),t.De=e,(t.he!==void 0||t.pe!==void 0)&&ue._e!==null&&ue._e(t,e),t.Se=zt,_s(t),In()),e}function Xw(t){Wi(t,Mr(t)),!(t.se&Us)&&t.De===Ge&&($i(t),In()),t.se=t.se&-4|Us}function qw(t,e){const n=wn(t,e);return Xw(t),n}function Gn(t,e){const n=Ve,r=Wt;Ve=t,Wt=!1;try{return e()}finally{Ve=n,Wt=r}}function Zw(t,e=!0){const n=lr;lr=e;try{return t()}finally{lr=n}}function Kw(t,e=Ss()){if(!e)throw new Pg;const n=Qw(t,e)?e.we[t.id]:t.defaultValue;if(Id(n))throw new pw;return n}function Jw(t,e,n=Ss()){if(!n)throw new Pg;n.we={...n.we,[t.id]:Id(e)?t.defaultValue:e}}function Qw(t,e){return!Id(e?.we[t.id])}function Id(t){return typeof t>"u"}function e1(t,e){const n=t.Ae!==Ge,r=n?ji(t.Ae):t.Ue;if(typeof e=="function"&&(e=e(r)),!(!!(t.S&Lt)||!t.be||!t.be(r,e))){if(n){const o=go(t);o&&Te!==o&&At.initTransition(o)}return e}n?At.initTransition(go(t)):At.m.je.push(t),t.sn=Te;const i=vw(t);return t.Me=i,t.Ae=e===void 0?xd:e,(t.he!==void 0||t.pe!==void 0)&&ue._e!==null&&ue._e(t,e),t.Se=zt,_s(t,!0),In(),e}function t1(t){for(let e=0;e<t.je.length;e++){const n=t.je[e];if(Kr(n)&&"S"in n&&n.S&Ue&&n._ instanceof Rt)return!0}return!1}function n1(t){const e=t.length;for(let n=0;n<e;n++){const r=t[n];r.Me=void 0,r.S&Ue||(r.S&=~Lt);const s=r.Ae;r.Ae=Ge,s!==Ge&&r.Ue!==ji(s)&&_s(r,!0),r.Ie=null,r.sn=null}for(let n=0;n<e;n++){const r=t[n];(r.he||r.pe)&&ue.un(r);const s=r.nn;s&&(s.he===r||s.pe===r)&&ue.un(s)}t.splice(0,e)}function Cu(t,e){for(let n=0;n<t.length;n++)t[n](e)}function r1(t){for(const e of Rn){if(e.tn||e.Ne.size>0)continue;const n=e.rn[t-1];n.length&&(e.rn[t-1]=[],Cu(n,t))}}function s1(t){for(const e of Rn)(t?e.Ie===t:!e.Ie)&&(e.tn||(e.rn[0].length&&Cu(e.rn[0],ki),e.rn[1].length&&Cu(e.rn[1],Kn)),e.en.Me===e&&(e.en.Me=void 0),e.Ne.clear(),e.rn[0].length=0,e.rn[1].length=0,Rn.delete(e),sl.delete(e.en))}function i1(t){const e=t.Me;return e?en(e)===en(Jt)&&!Kr(t):!1}function o1(t,e,n){return Yr||t.De===Ge||t.ae||e!==t&&!(e.se&Us)?!1:(Te.ln.add(n),!0)}function a1(t,e,n){return t.Ae!==void 0||!!t.Me||e===t&&lr&&n.nn!==t||!!(e.S&Ue)}function l1(t,e){if(e)return Mo(t)??null;for(let n=t.et;n;n=n.tt){const r=n.nt;if(r.se&Bs){const s=Mo(r);if(s)return t.se|=Bs,Sd(t,s),s}}return null}function c1(t){const e=en(Jt);e.en!==t&&(e.Ne.add(t),t.Me=e,ue.ce!==null&&ue.ce(e.en))}function u1(t){const e=Mo(t);e&&(e.Ne.delete(t),ue.ce!==null&&ue.ce(e.en))}function d1(t){At.m.cn.add(t),In()}function h1(){ue.ht===null&&(ue.ht=e1,ue.En=n1,ue.dn=t1,ue.Tn=s1,ue.In=r1,ue.Ot=o1,ue.Ct=i1,ue.Rt=a1,ue.Ze=l1,ue.ze=c1,ue.Ke=u1,ue.Nn=d1)}h1();let Xr=null;function f1(t){return t.he||(t.he=Gw(!1,{ownedWrite:!0}),t.he.nn=t,Od(t)&&wn(t.he,!0)),t.he}function nf(t){if(!Xr)return;Xr.sources.add(t);const e=t.it||t;e!==t&&Xr.sources.add(e)}function p1(t){Xr?.sources.add(t)}function Vg(t){if(t.oe){for(const e of t.oe)if(!e.Re)return!1;return!0}return t.Re}function rf(t){return!!(t.S&Ue)&&!(t.S&Lt)&&!Vg(t)}function Od(t){const e=t;if(e.se&Zn)return!1;const n=t.it;if(t.nn){const r=t.nn,s=r.it||r;return rf(s)}return n&&t.De!==Ge&&!Kr(t)?!!(n.se&Us)||!n.Te&&!(n.S&Ue)||!!(n.S&Ue)&&Vg(n):t.De!==Ge&&!(e.S&Lt)?Kr(t)?!t.be||!t.be(t.De,ji(t.Ae)):!0:rf(e)}function m1(t,e){t.he&&Vo(t),t.pe&&wn(t.pe,e)}function Vo(t){t.he&&wn(t.he,Od(t)),t.pe&&Vo(t.pe)}function g1(t){for(let e=t.u;e!==null;e=e.fe)(e.he||e.pe)&&Vo(e)}function y1(t,e=!1){const n=e?zd:Vo,r=new Set,s=i=>{if(!r.has(i)){r.add(i),(i.he||i.pe)&&n(i);for(let o=i.o;o!==null;o=o.ue)s(o.le);for(let o=i.u??null;o!==null;o=o.fe)s(o)}};s(t)}function zd(t){const e=t.he;if(e&&(e.Ae===void 0||e.Ae===Ge)){const r=Od(t);(e.Ue!==r||e.De!==Ge)&&(e.Ue=r,e.De=Ge,e.Se=zt,_s(e),In())}const n=t.pe;n&&!(n.se&Zn)&&((n.Ae===void 0||n.Ae===Ge)&&n.De===Ge&&!Object.is(n.Ue,t.Ue)&&!(n.se&(Zr|xi))&&(n.se|=Zr,Ed(n,Mr(n)),_s(n),In()),zd(n))}function b1(t){if(!t.pe){const e=Yr;cl(!1);const n=cs;Wr(!1);const r=Ve;tf(null),t.pe=Yw(()=>ar(t)),t.pe.nn=t,tf(r),Wr(n),cl(e)}return t.pe}function v1(t){const e=b1(t),n=Yr;cl(!1);const r=t.Ae!==void 0&&t.Ae!==Ge?ji(t.Ae):t.Ue;let s;try{const i=Mr(e);e.Ve>=i.He&&!(e.se&(Zn|ws))&&(Dg(i),Pd(e,!0)),s=ar(e)}catch(i){if(i instanceof Rt&&(!Ve||!(t.S&Lt)))return r;throw i}finally{cl(n)}if(e.S&Ue)return r;if(lr&&Jt&&e.Me){const i=en(e.Me),o=en(Jt);if(i!==o&&i.Ne.size>0)return r}return e.De!==Ge&&!Kr(e)&&!(lr&&e.Ie&&Te!==e.Ie)?e.De:s}function w1(t,e,n,r){Wr(!1),typeof t.ae=="function"&&Pd(t,!0);const s=n.S;if(e&&s&Ue&&s&Lt)throw Wt&&t!==e&&lo(t,e),Wr(!0),n._;nf(t),r&&nf(r),Wr(!0)}function _1(t,e){Xr!==null&&t.De!==Ge&&e===t.De&&Xr.freshReads.add(t)}function x1(t,e){const n=!!(t.S&Ue),r=e&&!(n&&!t.Re),s=n&&t.Re!==r;return t.Re=r,s}function k1(t){const e=cs,n=Xr;Wr(!0);const r=Xr={found:!1,sources:new Set,freshReads:new Set},s=()=>{Wr(!1);try{r.sources.forEach(i=>{ar(f1(i))&&!r.freshReads.has(i)&&(r.found=!0)})}finally{Wr(!0)}};try{return t(),s(),r.found}catch(i){if(s(),i instanceof Rt){const o=!!(i.source?.S&Lt);if(r.found&&!o)return!0;if(Ve&&o)throw i}return r.found}finally{Wr(e),Xr=n}}ue._e=m1;ue.ce=Vo;ue.Ge=g1;ue.un=zd;ue.St=v1;ue.At=w1;ue.Pt=_1;ue.$e=x1;ue.k=y1;ue.Lt=p1;function Gg(t,e,n,r){const s=!!r?.user,i=Ww(t,e,n,s?Kn:ki,S1,r);Rr(i,!0),!r?.defer&&(i.Pe===Kn||r?.schedule?i.C.enqueue(i.Pe,ul.bind(null,i)):ul(i))}function S1(t,e){const n=t!==void 0?t:this.S,r=e!==void 0?e:this._;if(n&ct){if(this.C.notify(this,Ue,0),this.Pe===Kn){this.S&ct&&(this.Be=!0,this.C.enqueue(this.Pe,this.Je??=ul.bind(null,this)));return}if(!this.C.notify(this,ct,ct))throw Po(Ho(r)),r}else this.Pe===ki&&this.C.notify(this,Ue|ct,n,r)}function ul(t){if(!t.Be||t.se&Zn)return;if(t.S&ct&&t.Pe===Kn){const n=Ho(t._);t.ct=t.Ue,t.Be=!1;try{t.ft?t.ft(n,()=>{const r=t.Et;t.Et=void 0,r?.()}):console.error(n)}catch(r){if(!t.C.notify(t,ct,ct))throw Po(r),r}return}const e=t.Et;t.Et=void 0;try{e?.();const n=t._t(t.Ue,t.ct);t.Et=n}catch(n){if(t._=new nl(t,n),t.S|=ct,!t.C.notify(t,ct,ct))throw Po(n),n}finally{t.ct=t.Ue,t.Be=!1}}ue.Xe=ul;function E1(t,e){const n=()=>{!r.Be||r.se&Zn||(r.Be=!1,Rr(r))},r=Es(()=>{const s=r.Et;r.Et=void 0,s?.();const i=Zw(t);r.Et=i},{...e,lazy:!0});r.Et=void 0,r.T=r.T&~hr|zg,r.Be=!0,r.Pe=Ll,r.i=(s,i)=>{if((s!==void 0?s:r.S)&ct){r.C.notify(r,Ue,0);const a=i!==void 0?i:r._;if(!r.C.notify(r,ct,ct))throw Po(Ho(a)),a}},r.Ft=n,r.C.enqueue(Kn,n)}function On(t){return Cd(t)}function Vr(t){const e=ar.bind(null,t);return e[bw]=t,e}function A1(t,e){if(typeof t=="function"){const r=Es(t,e);return r.T&=~hr,[Vr(r),qw.bind(null,r)]}const n=us(t,e);return[Vr(n),wn.bind(null,n)]}function qr(t,e){return Vr(Es(t,e))}function T1(t,e,n){Gg(t,e.effect||e,e.error,{user:!0,...n})}function C1(t,e,n){Gg(t,e,void 0,n)}function M1(t,e){E1(t,e)}function Ws(t){const e=Ss();e&&!(e.T&zg)?M1(()=>Nt(t),void 0):At.enqueue(Kn,()=>{t()})}const R1=Symbol(0),Mu=Symbol(0);function P1(t){return Reflect.ownKeys(t).filter(e=>Object.prototype.propertyIsEnumerable.call(t,e))}function I1(t,e,n){const r=typeof n?.keyed=="function"?n.keyed:void 0,s=e.length>1,i=e,o={wt:$s(),jt:0,Wt:t,Mt:[],Kt:i,xt:[],Gt:[],Ut:r,$t:r||n?.keyed===!1?[]:void 0,qt:s&&n?.keyed!==!1?[]:void 0,zt:n?.keyed===!1,Bt:n?.fallback},a=Es(O1.bind(o));return o.wt.Tt=a,a.T&=~hr,Vr(a)}const ta={ownedWrite:!0};function O1(){const t=this.Wt()||[],e=t.length;return t[R1],Gn(this.wt,()=>{let n,r,s,i,o=this.$t?this.zt?()=>(s[r]=us(t[r],ta),this.Kt(Vr(s[r]),r)):()=>(s[r]=us(t[r],ta),i&&(i[r]=us(r,ta)),this.Kt(Vr(s[r]),i?Vr(i[r]):void 0)):this.qt?()=>{const a=t[r];return i[r]=us(r,ta),this.Kt(a,Vr(i[r]))}:()=>{const a=t[r];return this.Kt(a)};if(e===0)this.jt!==0&&(this.wt.dispose(!1),this.Gt=[],this.Mt=[],this.xt=[],this.jt=0,this.$t&&(this.$t=[]),this.qt&&(this.qt=[])),this.Bt&&!this.xt[0]&&(this.Gt[0]?.dispose(),this.xt[0]=Gn(this.Gt[0]=$s(),this.Bt));else if(this.jt===0){const a=new Array(e),l=new Array(e);s=this.$t&&new Array(e),i=this.qt&&new Array(e);try{for(r=0;r<e;r++)a[r]=Gn(l[r]=$s(),o)}catch(c){for(n=0;n<=r;n++)l[n]?.dispose();throw c}this.Gt[0]&&this.Gt[0].dispose(),this.xt=a,this.Gt=l,s&&(this.$t=s),i&&(this.qt=i),this.Mt=t.slice(0),this.jt=e}else{let a,l,c,u,d,h,f,m,p;for(a=0,l=Math.min(this.jt,e);a<l&&(this.Mt[a]===t[a]||this.$t&&sf(this.Ut,this.Mt[a],t[a]));a++)this.$t&&wn(this.$t[a],t[a]);for(l=this.jt-1,c=e-1;l>=a&&c>=a&&(this.Mt[l]===t[c]||this.$t&&sf(this.Ut,this.Mt[l],t[c]));l--,c--);if(a===e&&this.jt===e){this.Mt=t.slice(0);return}const y=e-this.jt,g=new Array(e),b=new Array(e);for(s=this.$t?new Array(e):void 0,i=this.qt?new Array(e):void 0,h=new Map,f=new Array(c+1),r=c;r>=a;r--)u=t[r],d=this.Ut?this.Ut(u):u,n=h.get(d),f[r]=n===void 0?-1:n,h.set(d,r);for(n=a;n<=l;n++)u=this.Mt[n],d=this.Ut?this.Ut(u):u,r=h.get(d),r!==void 0&&r!==-1?(g[r]=this.xt[n],b[r]=this.Gt[n],s&&(s[r]=this.$t[n]),i&&(i[r]=this.qt[n]),r=f[r],h.set(d,r)):(m??=[]).push(this.Gt[n]);try{for(r=a;r<=c;r++)b[r]===void 0&&((p??=[]).push(b[r]=$s()),g[r]=Gn(b[r],o))}catch(v){if(p)for(n=0;n<p.length;n++)p[n].dispose();throw v}for(n=0;n<a;n++)g[n]=this.xt[n],b[n]=this.Gt[n],s&&(s[n]=this.$t[n]),i&&(i[n]=this.qt[n]);for(r=a;r<=c;r++)s&&wn(s[r],t[r]),i&&wn(i[r],r);for(r=c+1;r<e;r++)g[r]=this.xt[r-y],b[r]=this.Gt[r-y],s&&(s[r]=this.$t[r-y],wn(s[r],t[r])),i&&(i[r]=this.qt[r-y],y!==0&&wn(i[r],r));if(this.xt=g,this.Gt=b,s&&(this.$t=s),i&&(this.qt=i),this.jt=e,this.Mt=t.slice(0),m)for(n=0;n<m.length;n++)m[n].dispose()}}),this.xt}function sf(t,e,n){return t?t(e)===t(n):!0}function na(){return!0}const z1={get(t,e,n){return e===Mu?n:t.get(e)},has(t,e){return e===Mu?!0:t.has(e)},set:na,deleteProperty:na,getOwnPropertyDescriptor(t,e){return{configurable:!0,enumerable:!0,get(){return t.get(e)},set:na,deleteProperty:na}},ownKeys(t){return t.keys()}};function gc(t){return(t=typeof t=="function"?t():t)?t:{}}const yc=Symbol(0);function L1(...t){if(t.length===1&&typeof t[0]!="function")return t[0];let e=!1;const n=[];for(let l=0;l<t.length;l++){const c=t[l];e=e||!!c&&Mu in c;const u=!!c&&c[yc];if(u)for(let d=0;d<u.length;d++)n.push(u[d]);else n.push(typeof c=="function"?(e=!0,qr(c)):c)}if(yw&&e)return new Proxy({get(l){if(l===yc)return n;for(let c=n.length-1;c>=0;c--){const u=gc(n[c]);if(l in u)return u[l]}},has(l){for(let c=n.length-1;c>=0;c--)if(l in gc(n[c]))return!0;return!1},keys(){const l=new Set;for(let c=0;c<n.length;c++){const u=P1(gc(n[c]));for(let d=0;d<u.length;d++)l.add(u[d])}return[...l]}},z1);const r=Object.create(null);let s=!1,i=n.length-1;for(let l=i;l>=0;l--){const c=n[l];if(!c){l===i&&i--;continue}const u=Object.getOwnPropertyNames(c);for(let d=u.length-1;d>=0;d--){const h=u[d];if(!(h==="__proto__"||h==="constructor")&&!r[h]){s=s||l!==i;const f=Object.getOwnPropertyDescriptor(c,h);r[h]=f.get?{enumerable:!0,configurable:!0,get:f.get.bind(c)}:f}}}if(!s)return n[i];const o={},a=Object.keys(r);for(let l=a.length-1;l>=0;l--){const c=a[l],u=r[c];u.get?Object.defineProperty(o,c,u):o[c]=u.value}return o[yc]=n,o}function $1(t,e){const n=Es(t,{lazy:!0});return n.i=(r,s)=>{const i=r!==void 0?r:n.S,o=s!==void 0?s:n._;n.S&=~n.R;const a=n.C.notify(n,Ue|ct,i,o),l=i&~n.R&(Ue|ct);if(l&&(n.S&=~l,n._===o&&!(n.S&(Ue|ct))&&(n._=void 0)),!a&&i&ct)throw Po(Ho(o)),o},n.R=e,n.T&=~hr,Rr(n,!0),n}function D1(t,e,n,r){const s=t.C;return s.addChild(t.C=n),Cd(()=>s.removeChild(t.C)),Gn(t,()=>{const i=Es(e);return $1(()=>Fl(ar(i)),r)})}const of=Symbol();class N1 extends Lg{$;v=new Set;ee;N=!0;I=us(!1,{ownedWrite:!0,V:!0});_;D=us(!1,{ownedWrite:!0,V:!0});B;W=!1;te;re=of;constructor(e){super(),this.$=e}run(e){if(!(!e||ar(this.I)))return super.run(e)}notify(e,n,r,s){if(!(n&this.$))return super.notify(e,n,r,s);if(this.W&&this.te){const i=Nt(()=>{try{return this.te()}catch{return of}});i!==this.re&&(this.re=i,this.W=!1,this.v.clear())}if(this.$&Ue&&this.W)return super.notify(e,n,r,s);if(r&this.$){this.N=!0;const i=s?.source||e._?.source;if(i){const o=this.v.size===0;this.v.add(i),o&&wn(this.I,!0),this.$&ct&&wn(this._,Ho(i._))}}return n&=~this.$,n?super.notify(e,n,r,s):!0}ne(){for(const e of this.v)(e.se&Zn||!e.t&&!(e.S&this.$)&&!(this.$&ct&&e.S&Ue))&&this.v.delete(e);if(!this.v.size&&(this.$&Ue&&this.N&&!this.W&&this.ee?this.N=!!(this.ee.S&this.$):this.N=!1,!this.N&&(wn(this.I,!1),this.te)))try{this.re=Nt(()=>this.te())}catch{}}}function F1(t,e,n,r){const s=$s(),i=new N1(t);r&&(i.te=r);const o=i.ee=D1(s,e,i,t);return Nt(()=>{let a=!1;try{ar(o)}catch(l){if(l instanceof Rt)a=!0;else throw l}i.N=a||!!(o.S&t)||o._ instanceof Rt}),Vr(Es(()=>{if(!ar(i.I)){const a=ar(o);if(!Nt(()=>ar(i.I)))return i.W=!0,a}return n(i)},{V:!0}))}function B1(t,e,n){return F1(Ue,t,()=>e(),n?.on)}function Fl(t,e){if(typeof t=="function"&&!t.length){if(e?.doNotUnwrap)return t;do t=t();while(typeof t=="function"&&!t.length)}if(!(e?.skipNonRendered&&(t==null||t===!0||t===!1||t===""))){if(Array.isArray(t)){let n=[];return Ru(t,n,e)?()=>{let r=[];return Ru(n,r,{...e,doNotUnwrap:!1}),r}:n}return t}}function Ru(t,e=[],n){let r=null,s=!1;for(let i=0;i<t.length;i++)try{let o=t[i];if(typeof o=="function"&&!o.length){if(n?.doNotUnwrap){e.push(o),s=!0;continue}do o=o();while(typeof o=="function"&&!o.length)}Array.isArray(o)?s=Ru(o,e,n):n?.skipNonRendered&&(o==null||o===!0||o===!1||o==="")||e.push(o)}catch(o){if(!(o instanceof Rt))throw o;r=o}if(r)throw r;return s}function Bl(t,e){const n=Symbol("");function r(s){return Dl(()=>(Jw(r,s.value),U1(()=>s.children)))}return r.id=n,r.defaultValue=t,r}function Ul(t){return Kw(t)}function U1(t){const e=qr(t,{lazy:!0}),n=qr(()=>Fl(e()),{lazy:!0,sync:!0});return n.toArray=()=>{const r=n();return Array.isArray(r)?r:r!=null?[r]:[]},n}const Ar={hydrating:!1,registry:void 0,done:!1,isHydrationInProgress:H1,onHydrationEnd:j1};let bc=null,Yg=0;function H1(){return Ar.hydrating||Yg>0}function j1(t){if(!Ar.hydrating&&Yg===0){queueMicrotask(t);return}bc||(bc=[]),bc.push(t)}let W1;const Bt=(...t)=>qr(...t),ye=(...t)=>A1(...t),Ld=(...t)=>C1(...t),zn=(...t)=>T1(...t),V1=(t,e,n)=>B1(t,e,n);function te(t,e){return Nt(()=>t(e||{}))}function G1(t,e){let n,r;const s=i=>{Ar.hydrating&&(n=W1(n,e));let o=n;o||(r||(r=t()),r.then(l=>{n=()=>l.default}),o=qr(()=>r.then(l=>l.default)));let a;return qr(()=>(a=(n||o)())?Nt(()=>a(i)):"",{sync:!0})};return s.preload=()=>r||((r=t()).then(i=>n=()=>i.default),r),s.moduleUrl=e,s}const Y1=t=>`Stale read from <${t}>.`;function cn(t){const e="fallback"in t?{keyed:t.keyed,fallback:()=>t.fallback}:{keyed:t.keyed};return I1(()=>t.each,t.children,e)}function $e(t){const e=t.keyed,n=qr(()=>t.when,void 0),r=e?n:qr(n,{equals:(s,i)=>!s==!i,sync:!0});return qr(()=>{const s=r();if(s){const i=t.children;return typeof i=="function"&&i.length>0?Nt(e?()=>i(s):()=>i(()=>{if(!Nt(r))throw Y1("Show");return n()})):i}return t.fallback},{sync:!0})}function X1(t){const e="on"in t?{on:()=>t.on}:void 0;return V1(()=>t.children,()=>t.fallback,e)}const af={INPUT:{value:1,defaultValue:2,checked:1,defaultChecked:2},SELECT:{value:1},OPTION:{value:1,selected:1,defaultSelected:2},TEXTAREA:{value:1,defaultValue:2},VIDEO:{muted:1,defaultMuted:2},AUDIO:{muted:1,defaultMuted:2}},q1=new Set(["innerHTML","textContent","innerText","children"]),on=Symbol("slot"),lf=Symbol("host"),Z1=new Set(["beforeinput","click","dblclick","contextmenu","focusin","focusout","input","keydown","keyup","mousedown","mousemove","mouseout","mouseover","mouseup","pointerdown","pointermove","pointerout","pointerover","pointerup","touchend","touchmove","touchstart"]),K1={svg:"http://www.w3.org/2000/svg",mathml:"http://www.w3.org/1998/Math/MathML",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace"},J1={transparent:!0,sync:!0},Q1={sync:!0},de=(t,e,n)=>Ld(t,e,n?{sync:!0,...n,transparent:!n.scope}:J1),Qt=t=>Bt(()=>t(),Q1);function e_(t,e,n,r){let s=n.length,i=e.length,o=s,a=0,l=0,c=e[i-1],u=c[on],d=c.parentNode===t&&(!u||u===r)?c.nextSibling:r||null,h=null,f,m;for(;a<i||l<o;){if(e[a]===n[l]){a++,l++;continue}for(;e[i-1]===n[o-1];)i--,o--;if(i===a){let p;if(o<s)if(l){const y=n[l-1],g=y[on];p=y.parentNode===t&&(!g||g===r)?y.nextSibling:d}else p=n[o-l];else p=d;for(;l<o;){const y=n[l++];t.insertBefore(y,p),r&&(y[on]=r)}}else if(o===l)for(;a<i;){const p=e[a++];if(!h||!h.has(p)){const y=p[on];p.parentNode===t&&(!y||y===r)&&p.remove()}}else if((f=e[a])===n[o-1]&&n[l]===e[i-1]&&f.parentNode===t&&(!(m=f[on])||m===r))if(r)do{const p=e[--i];if(t.insertBefore(p,f),p[on]=r,l++,a>=i-1||l>=o)break}while(e[a]===n[o-1]&&n[l]===e[i-1]);else do if(t.insertBefore(e[--i],f),l++,a>=i-1||l>=o)break;while(e[a]===n[o-1]&&n[l]===e[i-1]);else{if(!h){h=new Map;let y=l;for(;y<o;)h.set(n[y],y++)}const p=h.get(e[a]);if(p!=null)if(l<p&&p<o){let y=a,g=1,b;for(;++y<i&&y<o&&!((b=h.get(e[y]))==null||b!==p+g);)g++;if(g>p-l){const v=e[a],x=v[on],k=v.parentNode===t&&(!x||x===r)?v:d;for(;l<p;){const C=n[l++];t.insertBefore(C,k),r&&(C[on]=r)}}else{const v=e[a++],x=n[l++],k=v[on];v.parentNode===t&&(!k||k===r)?t.replaceChild(x,v):t.insertBefore(x,d),r&&(x[on]=r)}}else a++;else{const y=e[a++],g=y[on];y.parentNode===t&&(!g||g===r)&&y.remove()}}}}const cf="_$DX_EVENT_OWNER",uf={},Pu=new Set,Vs=new Map;function t_(t,e,n,r={}){let s;n_(e);try{Dl(i=>{if(s=i,e===document){const o=t();de(()=>Fl(o),()=>{})}else{const o=t();ne(e,()=>o,e.firstChild?null:void 0,n,r.insertOptions)}},{id:r.renderId})}catch(i){throw s&&s(),hf(e),i}return()=>{s(),hf(e),e.textContent=""}}function df(t,e,n){const r=document.createElement("template");return r.innerHTML=t,n===2?r.content.firstChild.firstChild:r.content.firstChild}function pe(t,e){let n;return e===1?s=>document.importNode(n||(n=df(t,s,e)),!0):s=>(n||(n=df(t,s,e))).cloneNode(!0)}function zr(t){for(let e=0,n=t.length;e<n;e++){const r=t[e];Pu.has(r)||(Pu.add(r),Vs.forEach((s,i)=>Zg(r,i,s)))}}function n_(t){const e=Xg(t,t);e&&(e.roots=(e.roots||0)+1)}function hf(t){const e=Vs.get(t);e&&(e.roots>1?e.roots--:delete e.roots),qg(t,t)}function Xg(t,e=t){if(!t||!e)return;let n=Vs.get(t);return n||Vs.set(t,n={owners:new Map,handlers:new Map}),n.owners.set(e,(n.owners.get(e)||0)+1),Pu.forEach(r=>Zg(r,t,n)),n}function qg(t,e=t){const n=Vs.get(t);if(!n)return;const r=n.owners.get(e);r>1?n.owners.set(e,r-1):n.owners.delete(e),!n.owners.size&&(n.handlers.forEach((s,i)=>t.removeEventListener(i,s)),Vs.delete(t))}function Zg(t,e,n){if(n.handlers.has(t))return;const r=s=>f_(s,e,n);n.handlers.set(t,r),e.addEventListener(t,r)}function r_(t){for(;t;){if(Vs.get(t)?.roots)return t;t=t._$host||t.parentNode||t.host}}function s_(t,e){let n=t,r=0;for(;n;){if(e.owners.has(n))return{owner:n,distance:r};r++,n=n._$host||n.parentNode||n.host}}let ds=null;const i_=Symbol.for("dom-expressions.element-claims");function o_(t){return(ds||(ds=globalThis[i_]=[])).push(t),()=>{const e=ds.indexOf(t);e>-1&&ds.splice(e,1)}}function a_(t){if(ds!==null)for(let e=0;e<ds.length;e++)ds[e](t);return t}function lt(t,e,n){Hl(t)||(n==null||n===!1?t.removeAttribute(e):t.setAttribute(e,n===!0?"":n),ds!==null&&(e==="href"||e==="action")&&a_(t))}function l_(t,e,n,r){Hl(t)||(r==null||r===!1?t.removeAttributeNS(e,n.indexOf(":")>-1?n.split(":").pop():n):t.setAttributeNS(e,n,r===!0?"":r))}function X(t,e,n){if(Hl(t))return;if(e==null||e===!1){n&&t.removeAttribute("class");return}if(typeof e=="string"){e!==n&&t.setAttribute("class",e);return}typeof n=="string"?(n={},t.removeAttribute("class")):n=ff(n||{}),e=ff(e);const r=Object.keys(e||{}),s=Object.keys(n);let i,o;for(i=0,o=s.length;i<o;i++){const a=s[i];!a||a==="undefined"||e[a]||t.classList.remove(a)}for(i=0,o=r.length;i<o;i++){const a=r[i],l=!!e[a];!a||a==="undefined"||n[a]===l||!l||t.classList.add(a)}}function Kg(t,e,n,r){if(r)Array.isArray(n)?(t[`$$${e}`]=n[0],t[`$$${e}Data`]=n[1]):t[`$$${e}`]=n;else if(Array.isArray(n)){const s=n[0];t.addEventListener(e,n[0]=i=>s.call(t,n[1],i))}else t.addEventListener(e,n,typeof n!="function"&&n)}function $d(t,e,n){if(!e){(n||t._$styles)&&(lt(t,"style"),t._$styles=void 0);return}const r=t.style;if(typeof e=="string")return t._$styles=void 0,r.cssText=e;typeof n=="string"&&(r.cssText="",n=void 0);let s=t._$styles;s||(s=t._$styles=n?{...n}:{});let i,o;for(o in s)e[o]==null&&(r.removeProperty(o),delete s[o]);for(o in e)i=e[o],i!=null&&i!==s[o]&&(r.setProperty(o,i),s[o]=i)}function Mt(t,e,n){n!=null?t.style.setProperty(e,n):t.style.removeProperty(e)}function c_(t,e={},n){const r={};return ne(t,()=>e.children),de(()=>{const s=e.ref;(typeof s=="function"||Array.isArray(s))&&Qn(()=>s,t)},()=>{}),de(()=>{const s={};for(const i in e)i==="children"||i==="ref"||(s[i]=e[i]);return s},s=>h_(t,s,!0,r,!0)),r}function u_(t,e){Array.isArray(t)?t.flat(1/0).forEach(n=>n&&n(e)):t(e)}function Qn(t,e){const n=Nt(t);Gn(null,()=>u_(n,e))}const d_={scope:!0};function ne(t,e,n,r,s){const i=n!==void 0,o=s&&s.host;if(i&&!r&&(r=[]),typeof e!="function"&&(e=wc(e,r,i,!0),typeof e!="function")){vc(t,e,r,n),o&&Ta(e,o);return}if(i&&r.length===0){const l=document.createTextNode("");t.insertBefore(l,n),r=[l]}let a=r;de(l=>{const c=wc(e(),a,i,!0);return typeof c!="function"?c:(de(()=>wc(c,a,i),u=>{vc(t,u,a,n),a=u,o&&Ta(a,o)},l!==void 0&&!(s&&s.schedule)?{...s,schedule:!0}:s),uf)},l=>{l!==uf&&(vc(t,l,a,n),a=l,o&&Ta(a,o))},e.$s?s?{...s,scope:!0}:d_:s)}function h_(t,e,n,r={},s=!1){const i=t.nodeName;e||(e={});for(const o in r)if(!(o in e)){if(o==="children")continue;r[o]=pf(t,o,null,r[o],s,i)}for(const o in e)o!=="children"&&(r[o]=pf(t,o,e[o],r[o],s,i))}function Hl(t){if(!Ar.hydrating)return!1;if(!t||t.isConnected)return!0;const e=Ar.claimRoots;if(e){for(let n=0;n<e.length;n++)if(e[n].contains(t))return!0}return!1}function ff(t){if(Array.isArray(t)){const e={};Jg(t,e),t=e}if(t&&typeof t=="object"){const e={},n=Object.keys(t);for(let r=0,s=n.length;r<s;r++){const i=n[r];if(!t[i])continue;const o=i.trim().split(/\s+/);for(let a=0,l=o.length;a<l;a++)o[a]&&(e[o[a]]=!0)}return e}return t}function Jg(t,e){for(let n=0,r=t.length;n<r;n++){const s=t[n];Array.isArray(s)?Jg(s,e):typeof s=="object"&&s!=null?Object.assign(e,s):(s||s===0)&&(e[s]=!0)}}function pf(t,e,n,r,s,i){if(e==="style")return $d(t,n,r),n;if(e==="class")return X(t,n,r),n;if(n===r&&af[i]?.[e]!==1)return r;if(e==="ref")return!s&&n&&Qn(()=>n,t),n;const o=e.indexOf(":")>-1;if(!o&&e.slice(0,2)==="on"){const a=e.slice(2).toLowerCase(),l=Z1.has(a);if(!l&&r){const c=Array.isArray(r)?r[0]:r;t.removeEventListener(a,c)}(l||n)&&(Kg(t,a,n,l),l&&zr([a]))}else if(o&&e.slice(0,5)==="prop:"||q1.has(e)||af[i]?.[e]){if(o)e=e.slice(5);else if(Hl(t))return n;e==="value"&&i==="SELECT"?queueMicrotask(()=>t.value=n)||(t.value=n):(e==="value"||e==="defaultValue")&&(i==="INPUT"||i==="TEXTAREA")?t[e]=n??"":t[e]=n}else{const a=o&&K1[e.split(":")[0]];a?l_(t,a,e,n):lt(t,e,n)}return n}function f_(t,e,n){const r=t[cf];let s;if(r){if(r===!0||r===e||!e.contains(r))return;s=r}const i=n&&(n.owners.size===1&&n.owners.has(e)?e:s_(t.target,n)?.owner);if(n&&!i)return;t[cf]=i||!0;let o=s||t.target;const a=`$$${t.type}`,l=t.target,c=i||e||t.currentTarget,u=f=>Object.defineProperty(t,"target",{configurable:!0,value:f}),d=()=>{const f=o[a];if(f&&!o.disabled){const m=o[`${a}Data`];if(m!==void 0?f.call(o,m,t):f.call(o,t),t.cancelBubble)return}return o.host&&typeof o.host!="string"&&!o.host._$host&&o.contains(t.target)&&u(o.host),!0},h=()=>{for(;d()&&!(o===c||o.parentNode===c);)o=o._$host||o.parentNode||o.host};if(Object.defineProperty(t,"currentTarget",{configurable:!0,get(){return o||c||document}}),s)s===t.target&&(o=s._$host||s.parentNode||s.host),o&&o!==c&&h();else if(t.composedPath){const f=t.composedPath();if(f.length){u(f[0]);for(let m=0;m<f.length&&(o=f[m],!!d());m++){if(o._$host){o=o._$host,h();break}if(o===c||o.parentNode===c)break}}else h()}else h();u(l)}function vc(t,e,n,r){if(e===n)return;const s=typeof e,i=r!==void 0;if(s==="string"||s==="number"){const o=typeof n;o==="string"||o==="number"?t.firstChild.data=e:Qg(t,n)?t.textContent=e:(ey(t,n),t.insertBefore(document.createTextNode(e),t.firstChild))}else if(e===void 0)ra(t,n,r);else if(e.nodeType)Array.isArray(n)?ra(t,n,i?r:null,e):n&&n.nodeType?n.parentNode===t?t.replaceChild(e,n):t.appendChild(e):n&&t.firstChild?t.replaceChild(e,t.firstChild):t.appendChild(e),r&&(e[on]=r);else if(Array.isArray(e)){const o=n&&Array.isArray(n);e.length===0?ra(t,n,r):o?n.length===0?mf(t,e,r):e_(t,n,e,r):(n&&ra(t,n),mf(t,e))}}function wc(t,e,n,r){if(t=Fl(t,{skipNonRendered:!0,doNotUnwrap:r}),r&&typeof t=="function")return t;if(n&&!Array.isArray(t)&&(t=[t??""]),Array.isArray(t))for(let s=0,i=t.length;s<i;s++){const o=t[s],a=e&&e[s],l=typeof o;(l==="string"||l==="number")&&(t[s]=a&&a.nodeType===3&&(Ar.hydrating||a.data===""+o)?a:document.createTextNode(o))}return t}function Ta(t,e){if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)Ta(t[n],e);else t&&t.nodeType&&t[lf]!==e&&(t[lf]=e,Object.defineProperty(t,"_$host",{get:e,configurable:!0}))}function mf(t,e,n=null){for(let r=0,s=e.length;r<s;r++){const i=e[r];t.insertBefore(i,n),n&&(i[on]=n)}}function Qg(t,e){if(e==null)return!0;if(Array.isArray(e))return e.length?t.firstChild===e[0]&&t.lastChild===e[e.length-1]:t.firstChild===null;if(e==="")return t.firstChild===null;if(e.nodeType)return t.firstChild===e&&t.lastChild===e;const n=t.firstChild;return n!==null&&n.nodeType===3&&t.lastChild===n}function ey(t,e){if(Array.isArray(e))for(let n=0;n<e.length;n++){const r=e[n];r.parentNode===t&&r.remove()}else if(e.nodeType)e.parentNode===t&&e.remove();else{const n=t.firstChild;n&&n.nodeType===3&&n.remove()}}function ra(t,e,n,r){if(n===void 0)return Qg(t,e)?t.textContent="":ey(t,e);if(e.length){let s=!1;for(let i=e.length-1;i>=0;i--){const o=e[i];if(r!==o){const a=o[on],l=o.parentNode===t&&(!a||a===n);r&&!s&&!i?l?t.replaceChild(r,o):t.insertBefore(r,n):l&&o.remove()}else s=!0}}else r&&t.insertBefore(r,n);r&&n&&(r[on]=n)}const p_=Symbol.for("solid.ResponseEnvelope");function CN(t){return!!(t&&typeof t=="object"&&t[p_])}const MN="X-Revalidate",m_=L1,g_=!1;function y_(t,e,n,r={}){{const s=t_(t,e,n,{...r,insertOptions:{schedule:!0}});return Hs(),s}}function b_(t){return Gn($s(),()=>v_(t))}function v_(t){const e=document.createTextNode(""),n=document.createTextNode(""),r=document.createTextNode(""),s=()=>t.mount||document.body,i=Bt(()=>[n,t.children],{ssrSource:"client"});return Ld(()=>[s(),i(),Ss()],([,o,a])=>{const l=Nt(s);l.appendChild(r);const c=Gn(a,()=>Dl(u=>(ne(l,o,r,void 0,{host:()=>e.parentNode}),u)));return()=>{c();let u=n;for(;u;){const d=u.nextSibling;if(l.removeChild(u),u===r)break;u=d}}},{schedule:!0,ssrSource:"client"}),zn(s,()=>{const o=Nt(s),a=r_(e);if(!(!a||a.contains(o)))return Xg(o,a),()=>qg(o,a)},{ssrSource:"client"}),Ar.hydrating?Bt(()=>e,{ssrSource:"client"}):e}const w_=/^(?:[a-z0-9]+:)?\/\//i,__=/^\/+|(\/)\/+$/g,Io="http://sr";function Ds(t,e=!1){const n=t.replace(__,"$1");return n?e||/^[?#]/.test(n)?n:"/"+n:""}const _c=t=>Ds(t.split(/[?#]/,1)[0]).toLowerCase().replace(/\/$/,"");function Ca(t,e,n){if(w_.test(e))return;const r=Ds(t),s=n&&Ds(n);let i="";return!s||e.startsWith("/")?i=r:s.toLowerCase().indexOf(r.toLowerCase())!==0?i=r+s:i=s,(i||"/")+Ds(e,!i)}function x_(t,e){if(t==null)throw new Error(e);return t}function k_(t,e){return Ds(t).replace(/\/*(\*.*)?$/g,"")+Ds(e)}function ty(t){const e={};return t.searchParams.forEach((n,r)=>{r in e?Array.isArray(e[r])?e[r].push(n):e[r]=[e[r],n]:e[r]=n}),e}function ny(t,e,n){const[r,s]=t.split("/*",2),i=r.split("/").filter(Boolean),o=i.length;return a=>{const l=a.split("/");if(l[0]===""&&l.shift(),l.length&&l[l.length-1]===""&&l.pop(),l.includes(""))return null;const c=l.length-o;if(c<0||c>0&&s===void 0&&!e)return null;const u={path:o?"":"/",params:{}},d=h=>n===void 0?void 0:n[h];for(let h=0;h<o;h++){const f=i[h],m=f[0]===":",p=m?l[h]:l[h].toLowerCase(),y=m?f.slice(1):f.toLowerCase();if(m&&xc(p,d(y)))u.params[y]=p;else if(m||!xc(p,y))return null;u.path+=`/${p}`}if(s){const h=c?l.slice(-c).join("/"):"";if(xc(h,d(s)))u.params[s]=h;else return null}return u}}function xc(t,e){const n=r=>r===t;return e===void 0?!0:typeof e=="string"?n(e):typeof e=="function"?e(t):Array.isArray(e)?e.some(n):e instanceof RegExp?e.test(t):!1}function S_(t){const[e,n]=t.pattern.split("/*",2),r=e.split("/").filter(Boolean);return r.reduce((s,i)=>s+(i.startsWith(":")?2:3),r.length-(n===void 0?0:1))}function ry(t){const e=new Map,n=Ss();return new Proxy({},{get(r,s){return e.has(s)||Gn(n,()=>e.set(s,Bt(()=>t()[s]))),e.get(s)()},getOwnPropertyDescriptor(){return{enumerable:!0,configurable:!0}},ownKeys(){return Reflect.ownKeys(t())},has(r,s){return s in t()}})}function E_(t,e){const n=new URLSearchParams(t);Object.entries(e).forEach(([s,i])=>{i==null||i===""||i instanceof Array&&!i.length?n.delete(s):i instanceof Array?(n.delete(s),i.forEach(o=>{n.append(s,String(o))})):n.set(s,String(i))});const r=n.toString();return r?`?${r}`:""}function sy(t){let e=/(\/?\:[^\/]+)\?/.exec(t);if(!e)return[t];let n=t.slice(0,e.index),r=t.slice(e.index+e[0].length);const s=[n,n+=e[1]];for(;e=/^(\/\:[^\/]+)\?/.exec(r);)s.push(n+=e[1]),r=r.slice(e[0].length);return sy(r).reduce((i,o)=>[...i,...s.map(a=>a+o)],[])}function RN(t,e){return Object.defineProperty(t,"name",{value:e,writable:!1,configurable:!1}),t}function A_(t,e){const n=t.base.path(),r=new WeakMap,s=new Set;function i(u){return u.namespaceURI==="http://www.w3.org/2000/svg"}function o(u){if(e&&!u.hasAttribute("link"))return;const d=i(u),h=d?u.href.baseVal:u.getAttribute("href");if((d?u.target.baseVal:u.target)||!h)return;const m=(u.getAttribute("rel")||"").split(/\s+/);if(u.hasAttribute("download")||m.includes("external"))return;let p;try{p=new URL(h,document.baseURI)}catch{return}if(!(p.origin!==window.location.origin||n&&p.pathname&&!p.pathname.toLowerCase().startsWith(n.toLowerCase())))return _c(p.pathname)}function a(u){const d=decodeURI(_c(t.location.pathname)),h=t.isRouting(),f=o(u),m=y=>f!==void 0&&(y===f||f!==""&&y.startsWith(f+"/")),p=h&&!!t.pendingTarget&&m(decodeURI(_c(t.pendingTarget.value)));return{active:m(d),pending:p,exact:f!==void 0&&d===f}}function l(u,d,{active:h,pending:f,exact:m}){h?u.setAttribute("data-active",""):u.removeAttribute("data-active"),f?u.setAttribute("data-pending",""):u.removeAttribute("data-pending"),m!==d.current&&(m?u.setAttribute("aria-current","page"):u.removeAttribute("aria-current"),d.current=m)}const c=(u,d)=>Nt(()=>l(u,d,a(u)));Ld(()=>(t.location.pathname,t.isRouting()),()=>s.forEach(u=>c(u,r.get(u))),{transparent:!0}),On(o_(u=>{if(u.nodeName.toUpperCase()!=="A")return;const d=u,h=r.get(d);if(h)return c(d,h);const f={current:!1};r.set(d,f),Ss()&&(s.add(d),On(()=>s.delete(d))),c(d,f)}))}const T_="modulepreload",C_=function(t){return"/big-mesh-studios/voxelscape/"+t},gf={},Sr=function(e,n,r){let s=Promise.resolve();if(n&&n.length>0){let l=function(c){return Promise.all(c.map(u=>Promise.resolve(u).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");s=l(n.map(c=>{if(c=C_(c),c in gf)return;gf[c]=!0;const u=c.endsWith(".css"),d=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${d}`))return;const h=document.createElement("link");if(h.rel=u?"stylesheet":T_,u||(h.as="script"),h.crossOrigin="",h.href=c,a&&h.setAttribute("nonce",a),document.head.appendChild(h),u)return new Promise((f,m)=>{h.addEventListener("load",f),h.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${c}`)))})}))}function i(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return s.then(o=>{for(const a of o||[])a.status==="rejected"&&i(a.reason);return e().catch(i)})};let Iu;function PN(t){Iu=t}function M_({preload:t=!0,explicitLinks:e=!1,actionBase:n="/_server",transformUrl:r}={}){return s=>{const i=s.base.path(),o=s.navigatorFactory(s.base);let a,l;function c(p){return p.namespaceURI==="http://www.w3.org/2000/svg"}function u(p){if(p.defaultPrevented||p.button!==0||p.metaKey||p.altKey||p.ctrlKey||p.shiftKey)return;const y=p.composedPath().find(C=>C instanceof Node&&C.nodeName.toUpperCase()==="A");if(!y||e&&!y.hasAttribute("link"))return;const g=c(y),b=g?y.href.baseVal:y.href;if((g?y.target.baseVal:y.target)||!b&&!y.hasAttribute("state"))return;const x=(y.getAttribute("rel")||"").split(/\s+/);if(y.hasAttribute("download")||x&&x.includes("external"))return;const k=g?new URL(b,document.baseURI):new URL(b);if(!(k.origin!==window.location.origin||i&&k.pathname&&!k.pathname.toLowerCase().startsWith(i.toLowerCase())))return[y,k]}function d(p){const y=u(p);if(!y)return;const[g,b]=y,v=s.parsePath(b.pathname+b.search+b.hash),x=g.getAttribute("state");p.preventDefault(),o(v,{resolve:!1,replace:g.hasAttribute("replace"),scroll:!g.hasAttribute("noscroll"),state:x?JSON.parse(x):void 0})}function h(p){const y=u(p);if(!y)return;const[g,b]=y;r&&(b.pathname=r(b.pathname)),s.preloadRoute(b,g.getAttribute("preload")!=="false")}function f(p){clearTimeout(a);const y=u(p);if(!y)return l=null;const[g,b]=y;l!==g&&(r&&(b.pathname=r(b.pathname)),a=setTimeout(()=>{s.preloadRoute(b,g.getAttribute("preload")!=="false"),l=g},20))}function m(p){if(Iu)return Iu(p,s,n);if(p.defaultPrevented)return;const y=p.target,g=p.submitter&&p.submitter.hasAttribute("formaction")?p.submitter.getAttribute("formaction"):y.getAttribute("action");if(!g||g.startsWith("https://action/"))return;const b=new URL(g,document.baseURI),v=s.parsePath(b.pathname+b.search);if(!v.startsWith(n)||y.method.toUpperCase()!=="POST")return;p.preventDefault();const x=new FormData(y,p.submitter);Sr(()=>import("./serverForms-D5Jg7eCM.js"),[]).then(k=>k.submitServerForm(s,v,y,x))}zr(["click","submit"]),document.addEventListener("click",d),t&&(document.addEventListener("mousemove",f,{passive:!0}),document.addEventListener("focusin",h,{passive:!0}),document.addEventListener("touchstart",h,{passive:!0})),document.addEventListener("submit",m),On(()=>{document.removeEventListener("click",d),t&&(document.removeEventListener("mousemove",f),document.removeEventListener("focusin",h),document.removeEventListener("touchstart",h)),document.removeEventListener("submit",m)})}}const R_=t=>String(t).split("/").map(encodeURIComponent).join("/");function P_(t=n=>n,e=""){const n=(s,i="")=>t(s||"/")+i;function r(s){const i=(...o)=>{let a=s;for(let l=0;l<o.length;l++){const c=o[l];if(typeof c=="object"&&c!==null){const u=typeof o[l+1]=="string"?`#${o[l+1]}`:"";return n(a,E_("",c)+u)}a+=`/${R_(c)}`}return o.length?r(a):n(a)};return new Proxy(i,{get(o,a){return a==="toString"?()=>n(s):typeof a=="symbol"?a===Symbol.toPrimitive?()=>n(s):void 0:r(`${s}/${a}`)}})}return r(Ds(e))}const I_=100,Ou=Bl(),Dd=Bl();function Nd(t){try{return Ul(t)}catch{return}}const iy=()=>x_(Ul(Ou),"<A> and 'use' router primitives can be only used inside a Route."),O_=()=>Nd(Dd)||iy().base,z_=()=>iy().navigatorFactory();function L_(t){return O_().params}const $_=t=>encodeURIComponent(t).replace(/%(2B|40|3A|24|26|2C|3B|3D)/g,e=>decodeURIComponent(e)),yf=new WeakMap,[D_,N_]=ye(0);function F_(){return D_()}function B_(t){let e=yf.get(t);return e||yf.set(t,e={thunk:t}),e}function bf(t){return t.resolved?t.resolved:t.promise||=Promise.resolve(t.thunk()).then(e=>{const n=Array.isArray(e)?e:e.default||e.routes||[];return t.resolved=n,N_(r=>r+1),t.resolved})}function U_(t){const e=[];for(const n of t)n.route.lazy&&!n.route.lazy.resolved&&e.push(n.route.lazy);return e}function H_(t,e){const n=t+"/*";return{key:e,originalPath:"*",pattern:n,matcher:ny(n),lazy:e}}function j_(t,e=""){const{component:n,preload:r,children:s,info:i}=t,o=!s||Array.isArray(s)&&!s.length,a={key:t,component:n,preload:r,info:i};return oy(t.path).reduce((l,c)=>{for(const u of sy(c)){const d=k_(e,u);let h=o?d:d.split("/*",1)[0];h=h.split("/").map(f=>f.startsWith(":")||f.startsWith("*")?f:$_(f)).join("/"),l.push({...a,originalPath:c,pattern:h,matcher:ny(h,!o,t.matchFilters)})}return l},[])}function vf(t,e=0){return{routes:t,score:S_(t[t.length-1])*1e4-e,matcher(n){const r=[];for(let s=t.length-1;s>=0;s--){const i=t[s],o=i.matcher(n);if(!o)return null;r.unshift({...o,route:i})}return r}}}function oy(t){return Array.isArray(t)?t:[t]}function ay(t,e="",n=[],r=[]){const s=oy(t);for(let i=0,o=s.length;i<o;i++){const a=s[i];if(a&&typeof a=="object"){a.hasOwnProperty("path")||(a.path="");const l=j_(a,e);for(const c of l){n.push(c);let u=a.children;if(typeof u=="function"){const h=B_(u);if(h.resolved)u=h.resolved;else{n.push(H_(c.pattern,h)),r.push(vf([...n],r.length)),n.pop(),n.pop();continue}}const d=Array.isArray(u)&&u.length===0;if(u&&!d)ay(u,c.pattern,n,r);else{const h=vf([...n],r.length);r.push(h)}n.pop()}}}return n.length?r:r.sort((i,o)=>o.score-i.score)}function zu(t,e){for(let n=0,r=t.length;n<r;n++){const s=t[n].matcher(e);if(s)return s}return[]}function ly(t){const e={};for(let n=0;n<t.length;n++)Object.assign(e,t[n].params);return e}function W_(t,e,n){const r=new URL(Io),s=Bt((u=r)=>{const d=t();try{return new URL(d[0]==="/"?Io+d:d,r)}catch{return console.error(`Invalid path ${d}`),u}},{equals:(u,d)=>u.href===d.href}),i=Bt(()=>s().pathname),o=Bt(()=>s().search),a=Bt(()=>s().hash),l=()=>"",c=Bt(()=>ty(s()));return{get pathname(){return i()},get search(){return o()},get hash(){return a()},get state(){return e()},get key(){return l()},query:n?n(c):ry(c)}}let dl;const bo=new Map;function V_(t){return bo.set(t,dl&&dl(t)),()=>{const e=bo.get(t);bo.delete(t),e&&e()}}function IN(t){if(!dl){dl=t;for(const[e,n]of bo)n||bo.set(e,t(e))}}let zs;function G_(){return zs}let Di=!1;function ON(){return Di}function wf(t){Di=t}function Y_(t,e,n,r={}){const{signal:[s,i],utils:o={}}=t,a=o.parsePath||(R=>R),l=o.renderPath||(R=>R),c=o.beforeLeave||{},u=Ca("",r.base||""),d=Nt(s);if(u===void 0)throw new Error(`${u} is not a valid base path`);u&&!d.value&&i({value:u,replace:!0,scroll:!1});const[h,f]=ye(!1,{ownedWrite:!0}),[m,p]=ye(void 0,{ownedWrite:!0});let y;const g=Bt(()=>m()??s()),b=W_(()=>g().value,()=>g().state,o.queryWrapper),v=[];let x;const k=Bt(()=>{const R=typeof r.transformUrl=="function"?r.transformUrl(b.pathname):b.pathname,F=zu(e(),R),D=U_(F);if(D.length)throw new Rt(Promise.all(D.map(bf)));return F}),C=Bt(()=>h()||k1(()=>(k(),b.search,b.hash))),E=()=>ly(k()),T=o.paramsWrapper?R=>o.paramsWrapper(R,e):R=>ry(R),A=T(E),M={pattern:u,params:A,path:()=>u,outlet:()=>null,resolvePath(R){return Ca(u,R)}};return{base:M,location:b,params:A,wrapParams:T,isRouting:C,get pendingTarget(){return y},leaving(R){const F=y;if(!F||!R.retained)return!1;const D=F.value.split(/[?#]/,1)[0];return!R.retained(r.transformUrl?r.transformUrl(D):D)},renderPath:l,parsePath:a,navigatorFactory:S,matches:k,beforeLeave:c,preloadRoute:w,singleFlight:r.singleFlight===void 0?!0:r.singleFlight,get submissions(){return x||=ye([],{ownedWrite:!0})}};function O(R,F,D){Nt(()=>{if(typeof F=="number"){F&&(o.go?o.go(F):console.warn("Router integration does not support relative routing"));return}typeof F!="string"&&(F=F.toString());const{replace:Q,resolve:H,scroll:J,state:N}={replace:!1,resolve:!0,scroll:!0,...D};let U;if(!H)U=Ca((!F||F[0]==="?")&&b.pathname||"",F);else if(F[0]==="/")U=R.resolvePath(F);else{const ie=new URL(F,Io+b.pathname+b.search+b.hash);U=ie.origin===Io?ie.pathname+ie.search+ie.hash:void 0}if(U===void 0)throw new Error(`Path '${F}' is not a routable path`);if(v.length>=I_)throw new Error("Too many redirects");const ae=g();if((U!==ae.value||N!==ae.state)&&!g_){if(!c.current||c.current.confirm(U,D)){v.push({value:ae.value,replace:Q,scroll:J,state:ae.state});const ie={value:U,state:N},q=y===void 0;zs="navigate",y=ie,q&&(f(!0),Hs()),y===ie&&(p({...y}),queueMicrotask(()=>{y===ie&&(zs=void 0,z(y),p(void 0),f(!1),y=void 0)}))}}})}function S(R){return R=R||Nd(Dd)||M,(F,D)=>O(R,F,D)}function z(R){const F=v[0];F&&(i({...R,replace:F.replace,scroll:F.scroll}),v.length=0)}function w(R,F){const D=zu(e(),R.pathname),Q=D.find(J=>J.route.lazy&&!J.route.lazy.resolved);Q&&bf(Q.route.lazy).then(()=>w(R,F));const H=zs;zs="preload";for(let J in D){const{route:N,params:U}=D[J];N.component&&N.component.preload&&N.component.preload();const{preload:ae}=N;Di=!0,F&&ae&&Gn(n(),()=>ae({params:U,location:{pathname:R.pathname,search:R.search,hash:R.hash,query:ty(R),state:null,key:""},intent:"preload"})),Di=!1}zs=H}}function X_(t,e,n,r,s=()=>[r()]){const{base:i,location:o,wrapParams:a}=t,{pattern:l,component:c,preload:u}=r().route,d=Bt(()=>r().path),h=a(()=>ly(s()));c&&c.preload&&c.preload(),Di=!0;const f=u?u({params:h,location:o,intent:zs||"initial"}):void 0;return Di=!1,{parent:e,pattern:l,params:h,path:d,retained(p){const y=r(),g=y.route.matcher(p);return!!g&&g.path===y.path},outlet:()=>c?te(c,{params:h,location:o,data:f,get children(){return n()}}):n(),resolvePath(p){return Ca(i.path(),p,d())}}}function q_(t){const e=t.routerState.location,n=t.routerState.params,r=Bt(()=>t.preload&&Nt(()=>{wf(!0);try{return t.preload({params:n,location:e,intent:G_()||"initial"})}finally{wf(!1)}})),s=t.root;return s?te(s,{params:n,location:e,get data(){return r()},get children(){return t.children}}):t.children}function Z_(t){const e=[];let n,r;On(()=>e.forEach(a=>a()));const s=Ss(),i=Bt(a=>{const l=t.routerState.matches(),c=r;let u=c&&l.length===c.length;const d=[];for(let h=0,f=l.length;h<f;h++){const m=c&&c[h],p=l[h];a&&m&&p.route.key===m.route.key?d[h]=a[h]:(u=!1,e[h]&&e[h](),Gn(s,()=>Dl(y=>{e[h]=y;const g=p.route.key,b=Bt(v=>{const x=t.routerState.matches(),k=x[h];return k&&k.route.key===g?x:v||l});d[h]=X_(t.routerState,d[h-1]||t.routerState.base,_f(()=>i()?.[h+1]),()=>b()[h],b)})))}return e.splice(l.length).forEach(h=>h()),a&&u?(r=l,a):(n=d[0],r=l,d)}),o=_f(()=>i()&&n);return Qt(o)}const _f=t=>()=>{const e=t();if(e)return te(Dd,{value:e,get children(){return e.outlet()}})};function hl(t,e,n){return t.addEventListener(e,n),()=>t.removeEventListener(e,n)}let Lu;function Ni(){(!window.history.state||window.history.state._depth==null)&&window.history.replaceState({...window.history.state,_depth:window.history.length-1},""),Lu=window.history.state._depth}function cy(t){return{...t,_depth:window.history.state&&window.history.state._depth}}function uy(t,e){let n=!1;return()=>{const r=Lu;Ni();const s=r==null?null:Lu-r;if(n){n=!1;return}s&&e(s)?(n=!0,window.history.go(-s)):t()}}function dy(t,e){const n=t&&document.getElementById(t);n?n.scrollIntoView():e&&window.scrollTo(0,0)}function xf(){const t=()=>{const n=window.location.pathname+window.location.search,r=window.history.state&&window.history.state._depth&&Object.keys(window.history.state).length===1?void 0:window.history.state;return{value:n+window.location.hash,state:r}},e={};return Ni(),{get:t,set({value:n,replace:r,scroll:s,state:i}){r?window.history.replaceState(cy(i),"",n):window.history.pushState(i,"",n),dy(decodeURIComponent(window.location.hash.slice(1)),s),Ni()},init:n=>hl(window,"popstate",uy(n,r=>{const s=e.current;if(!s)return!1;if(r)return!s.confirm(r);{const i=t();return!s.confirm(i.value,{state:i.state})}})),utils:{go:n=>window.history.go(n),beforeLeave:e}}}function K_(t){const e=t.replace(/^.*?#/,"");if(!e.startsWith("/")){const[,n="/"]=window.location.hash.split("#",2);return`${n}#${e}`}return e}function J_(){const t=()=>window.location.hash.slice(1),e={};return Ni(),{get:t,set({value:n,replace:r,scroll:s,state:i}){r?window.history.replaceState(cy(i),"","#"+n):window.history.pushState(i,"","#"+n);const o=n.indexOf("#"),a=o>=0?n.slice(o+1):"";dy(a,s),Ni()},init:n=>hl(window,"hashchange",uy(n,r=>{const s=e.current;return!!s&&!s.confirm(r&&r<0?r:t())})),utils:{go:n=>window.history.go(n),renderPath:n=>`#${n}`,parsePath:K_,beforeLeave:e}}}const kf="solid-router:scroll";function Q_(){window.history.scrollRestoration="manual",Ni();let t={};try{t=JSON.parse(sessionStorage.getItem(kf))||{}}catch{}const e=()=>window.history.state&&window.history.state._depth;let n=!1,r;const s=[hl(window,"scroll",()=>{const o=e();o!=null&&(t[o]=window.scrollY),n||(r=void 0)}),hl(window,"pagehide",()=>{try{sessionStorage.setItem(kf,JSON.stringify(t))}catch{}})],i=()=>{if(r==null)return;const o=t[r];r=void 0,o!=null&&(n=!0,window.scrollTo(0,o),n=!1)};return{onPop(){r=e()},onPush(){const o=e();if(o!=null)for(const a in t)+a>=o&&delete t[a]},create(o){zn(()=>({url:o.location.pathname+o.location.search+o.location.hash,routing:o.isRouting()}),l=>{l.routing||i()},{transparent:!0}),On(()=>s.forEach(l=>l()));const[a]=performance.getEntriesByType&&performance.getEntriesByType("navigation");a&&a.type!=="navigate"&&(r=e())}}}function ex(t,e){return{...t,set(n){t.set(n),n.replace||e.onPush()},init:t.init&&(n=>t.init(r=>{e.onPop(),n(r)}))}}function tx(t){let e=!1;const n=o=>typeof o=="string"?{value:o}:o,[r,s]=ye(n(t.get()),{equals:(o,a)=>o.value===a.value&&o.state===a.state,ownedWrite:!0}),i=[r,o=>{!e&&t.set(o),Ar.registry&&!Ar.done&&(Ar.done=!0),s(o)}];return t.init&&On(t.init((o=t.get())=>{e=!0,i[1](n(o)),e=!1})),{signal:i,utils:t.utils}}function nx(t){const e=t.base||"";let n,r=-1;const s=()=>{const c=F_();return(!n||r!==c)&&(n=ay(t.routes,e),r=c),n},i=t.history&&t.history.utils&&t.history.utils.renderPath||void 0;function o(c){Nd(Ou)&&console.warn("Mounting a router inside another router is not supported. Compose route trees in one createRouter config instead.");const u=Nt(()=>c.children);let d,h=t.history;(t.scrollRestoration??!h)&&(d=Q_(),h=ex(h||xf(),d));const f=tx(h||xf());let m;const p=Y_(f,s,()=>m,{base:e,singleFlight:t.singleFlight,transformUrl:t.transformUrl});return M_({preload:t.preloadLinks,explicitLinks:t.explicitLinks,actionBase:t.actionBase,transformUrl:t.transformUrl})(p),A_(p,t.explicitLinks),p.singleFlight&&On(V_(p)),d&&d.create(p),te(Ou,{value:p,get children(){return te(q_,{routerState:p,root:u,get preload(){return t.preload},get children(){return[Qt(()=>(m=Ss())&&null),te(Z_,{routerState:p,branches:s})]}})}})}const a=Object.assign(o,{routes:t.routes,config:t,match(c){const u=new URL(c,Io),d=t.transformUrl?t.transformUrl(u.pathname):u.pathname;return zu(s(),d).map(({route:h,path:f,params:m})=>({path:h.originalPath,pattern:h.pattern,match:f,params:m,info:h.info}))}});let l;return Object.defineProperty(a,"paths",{get:()=>l||(l=P_(i,e))}),a}const rx="_canvas_1p9qu_1",sx="_container_1p9qu_12",ix="_joining_1p9qu_17",ox="_ending_1p9qu_26",wr={canvas:rx,"debug-perf":"_debug-perf_1p9qu_9",container:sx,joining:ix,ending:ox,"ending-panel":"_ending-panel_1p9qu_35","ending-title":"_ending-title_1p9qu_41","ending-text":"_ending-text_1p9qu_45","ending-button":"_ending-button_1p9qu_50"},ax=new TextEncoder;new TextDecoder("utf-8",{fatal:!0,ignoreBOM:!0});const lx=crypto.subtle,Fd=t=>ax.encode(t),cx=t=>t>=56320&&t<=57343,ux=(t,e,n)=>{const r=t.length;if(r*3<e)return!1;if(r>=e&&r*3<=n)return!0;let s=0,i=0;for(;s<r;){const o=t.charCodeAt(s);if(o<128?(s+=1,i+=1):o<2048?(s+=1,i+=2):o<55296||o>56319?(s+=1,i+=3):cx(t.charCodeAt(s+1))?(s+=2,i+=4):(s+=1,i+=3),i>n)return!1}return i>=e},dx=async t=>new Uint8Array(await lx.digest("SHA-256",t)),hx=/^did:([a-z]+):([a-zA-Z0-9._:%-]*[a-zA-Z0-9._-])$/,Bd=t=>typeof t=="string"&&t.length>=7&&t.length<=2048&&hx.test(t),hy=t=>t>=65&&t<=90||t>=97&&t<=122,kc=t=>hy(t)||t>=48&&t<=57,fx=(t,e,n)=>{const r=n-e;if(r===0||r>63)return!1;const s=t.charCodeAt(e);if(!kc(s))return!1;if(r>1){if(!kc(t.charCodeAt(n-1)))return!1;for(let i=e+1;i<n-1;i++){const o=t.charCodeAt(i);if(!kc(o)&&o!==45)return!1}}return!0},fy=t=>{if(typeof t!="string")return!1;const e=t.length;if(e<3||e>253)return!1;let n=0,r=0,s=0;for(let i=0;i<=e;i++)if(i===e||t.charCodeAt(i)===46){if(!fx(t,n,i))return!1;s=n,n=i+1,r++}return r<2?!1:hy(t.charCodeAt(s))},px=t=>Bd(t)||fy(t),mx=/^((?!0{4})\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))T((?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d))(\.\d+)?(Z|(?!-00:00)[+-](?:[01]\d|2[0-3]):(?:[0-5]\d))$/,gx=t=>typeof t=="string"&&t.length>=20&&t.length<=64&&mx.test(t),yx=/^\w+:(?:\/\/)?[^\s/][^\s]*$/,bx=t=>typeof t!="string"||!ux(t,3,8192)?!1:yx.test(t),Pn=(t,e,n)=>(Object.defineProperty(t,e,{value:n}),n),Ud=t=>({get value(){const e=t();return Pn(this,"value",e)}}),py=Array.isArray,Sf=t=>typeof t=="object"&&t!==null&&!py(t),vx=Ud(()=>{if(typeof navigator<"u"&&navigator?.userAgent?.includes("Cloudflare"))return!1;try{const t=Function;return new t(""),!0}catch{return!1}}),Ma=(t,e)=>t?{ok:!1,code:"join",left:t,right:e}:e,vo=(t,e)=>({ok:!1,code:"prepend",key:t,tree:e}),$u=t=>({ok:!0,value:t}),wx=0,co=1,_x=t=>JSON.stringify(t),my=(t,e=[],n=[])=>{for(;;)switch(t.code){case"join":{my(t.left,e.slice(),n),t=t.right;continue}case"prepend":{e.push(t.key),t=t.tree;continue}default:return n.push({message:t.msg(),path:e.length>0?e:void 0}),n}},Ks=t=>({version:1,vendor:"@atcute/lexicons",validate(e){const n=t["~run"](e,wx);return n===void 0?{value:e}:n.ok?{value:n.value}:{issues:my(n)}}}),Du=t=>{const e={ok:!1,code:"invalid_literal",expected:[t],msg(){return`expected ${_x(t)}`}};return{kind:"schema",type:"literal",expected:t,"~run"(n,r){if(n!==t)return e},get"~standard"(){return Pn(this,"~standard",Ks(this))}}},Ef={ok:!1,code:"invalid_type",expected:"integer",msg(){return"expected integer"}},xx={kind:"schema",type:"integer","~run"(t,e){if(typeof t!="number"||!Number.isSafeInteger(t))return Ef},get"~standard"(){return Pn(this,"~standard",Ks(this))}},_r=()=>xx,kx={ok:!1,code:"invalid_type",expected:"string",msg(){return"expected string"}},gy=(t,e)=>{const n={ok:!1,code:"invalid_string_format",expected:t,msg(){return`expected a ${t} formatted string`}},r={kind:"schema",type:"string",format:t,"~run"(s,i){if(typeof s!="string")return kx;if(!e(s))return n},get"~standard"(){return Pn(this,"~standard",Ks(this))}};return()=>r},yy=gy("datetime",gx),by=gy("uri",bx),Nu=t=>({kind:"schema",type:"nullable",wrapped:t,"~run"(e,n){if(e!==null)return t["~run"](e,n)},get"~standard"(){return Pn(this,"~standard",Ks(this))}}),vy=(t,e)=>({kind:"schema",type:"optional",wrapped:t,default:e,"~run"(n,r){if(n!==void 0)return t["~run"](n,r)},get"~standard"(){return Pn(this,"~standard",Ks(this))}}),Sx=t=>t.type==="optional",Ex={ok:!1,code:"invalid_type",expected:"array",msg(){return"expected array"}},wy=t=>{const e=Ud(()=>typeof t=="function"?t():t);return{kind:"schema",type:"array",get item(){return Pn(this,"item",e.value)},get"~run"(){const n=e.value;return Pn(this,"~run",(s,i)=>{if(!py(s))return Ex;let o,a;for(let l=0,c=s.length;l<c;l++){const u=s[l],d=n["~run"](u,i);if(d!==void 0)if(d.ok)a===void 0&&(a=s.slice()),a[l]=d.value;else{if(i&co)return vo(l,d);o=Ma(o,vo(l,d))}}if(o!==void 0)return o;if(a!==void 0)return $u(a)})},get"~standard"(){return Pn(this,"~standard",Ks(this))}}},Af={ok:!1,code:"invalid_type",expected:"object",msg(){return"expected object"}},Ax={ok:!1,code:"missing_value",msg(){return"missing value"}},Tx=(t,e,n)=>{e==="__proto__"?Object.defineProperty(t,e,{value:n}):t[e]=n},jl=t=>{const e=Ud(()=>{const n=[];for(const r in t){const s=t[r];n.push({key:r,schema:s,optional:Sx(s),missing:vo(r,Ax)})}return n});return{kind:"schema",type:"object",get shape(){const n=e.value,r={};for(const s of n)r[s.key]=s.schema;return Pn(this,"shape",r)},get"~run"(){const n=e.value,r=n.length,s=()=>{const o=[["$ok",$u],["$joinIssues",Ma],["$prependPath",vo]];let a="let $iss,$out;";for(let c=0;c<r;c++){const u=n[c],d=u.key,h=JSON.stringify(d),f=`_${c}`;if(a+=`{const $val=$in[${h}];`,u.optional?a+="if($val!==undefined){":a+=`if($val!==undefined||${h} in $in){`,a+=`const $res=${f}$schema["~run"]($val,$flags);if($res!==undefined)if($res.ok)${d!=="__proto__"?`($out??={...$in})[${h}]=$res.value`:`Object.defineProperty($out??={...$in},${h},{value:$res.value})`};else if((($iss=$joinIssues($iss,$prependPath(${h},$res))),$flags&${co}))return $iss;}`,u.optional){const m=u.schema,p=m.wrapped,y=m.default;if(o.push([`${f}$schema`,p]),y!==void 0){const g=typeof y=="function"?`${f}$default()`:`${f}$default`;o.push([`${f}$default`,y]),a+=d!=="__proto__"?`else($out??={...$in})[${h}]=${g};`:`else Object.defineProperty($out??={...$in},${h},{value:${g}});`}}else o.push([`${f}$schema`,u.schema]),o.push([`${f}$missing`,u.missing]),a+=`else if((($iss=$joinIssues($iss,${f}$missing)),$flags&${co}))return $iss;`;a+="}"}return a+="if($iss!==undefined)return $iss;if($out!==undefined)return $ok($out);",new Function(`[${o.map(([c])=>c).join(",")}]`,`return function matcher($in,$flags){${a}}`)(o.map(([,c])=>c))};if(vx.value){const o=s();return Pn(this,"~run",(l,c)=>Sf(l)?o(l,c):Af)}return Pn(this,"~run",(o,a)=>{if(!Sf(o))return Af;let l,c;for(let u=0;u<r;u++){const d=n[u],h=d.key,f=o[h];if(!d.optional&&f===void 0&&!(h in o)){if(l=Ma(l,d.missing),a&co)return l;continue}const m=d.schema["~run"](f,a);if(m!==void 0){if(m.ok)c===void 0&&(c={...o}),Tx(c,h,m.value);else if(l=Ma(l,vo(h,m)),a&co)return l}}if(l!==void 0)return l;if(c!==void 0)return $u(c)})},get"~standard"(){return Pn(this,"~standard",Ks(this))}}},Cx=t=>typeof t=="object"?t.handle.bind(t):t,Oo=({service:t,fetch:e=fetch})=>async(n,r)=>{const s=new URL(n,t);return await e(s.href,r)},Tf=/\bapplication\/json\b/;class Gs{constructor({handler:e,proxy:n=null}){this.handler=Cx(e),this.proxy=n}clone({handler:e=this.handler,proxy:n=this.proxy}={}){return new Gs({handler:e,proxy:n})}get(e,n={}){return this.#e("get",e,n)}post(e,n={}){return this.#e("post",e,n)}async call(e,n={}){}async#e(e,n,{signal:r,as:s="json",headers:i,input:o,params:a}){const l=o&&(o instanceof Blob||ArrayBuffer.isView(o)||o instanceof ArrayBuffer||o instanceof ReadableStream),c=`/xrpc/${n}`+Mx(a),u=await this.handler(c,{method:e,signal:r,body:o&&!l?JSON.stringify(o):o,headers:Rx(i,{"content-type":o&&!l?"application/json":null,"atproto-proxy":this.proxy}),duplex:o instanceof ReadableStream?"half":void 0});{const d=u.status,h=u.headers,f=h.get("content-type");if(d!==200){let m;if(f!=null&&Tf.test(f))try{const p=await u.json();Px(p)&&(m=p)}catch{}else await u.body?.cancel();return{ok:!1,status:d,headers:h,data:m??{error:"UnknownXRPCError",message:`Request failed with status code ${d}`}}}{let m;switch(s){case"json":{if(f!=null&&Tf.test(f))m=await u.json();else throw await u.body?.cancel(),new TypeError(`Invalid response content-type (got ${f})`);break}case null:{m=null,await u.body?.cancel();break}case"blob":{m=await u.blob();break}case"bytes":{m=new Uint8Array(await u.arrayBuffer());break}case"stream":{m=u.body;break}}return{ok:!0,status:d,headers:h,data:m}}}}}const Mx=t=>{let e;for(const n in t){const r=t[n];if(r!==void 0)if(e??=new URLSearchParams,Array.isArray(r))for(let s=0,i=r.length;s<i;s++){const o=r[s];e.append(n,""+o)}else e.set(n,""+r)}return e?"?"+e.toString():""},Rx=(t,e)=>{let n;for(const r in e){const s=e[r];s!==null&&(n??=new Headers(t),n.has(r)||n.set(r,s))}return n??t},Px=t=>{const e=t;if(typeof e!="object"||e==null)return!1;const n=typeof e.error,r=typeof e.message;return n==="string"&&(r==="undefined"||r==="string")},Vn=t=>{if(t instanceof Promise)return t.then(Vn);if(t.ok)return t.data;throw new Ix(t)};class Ix extends Error{constructor({status:e,headers:n=new Headers,data:r}){super(`${r.error} > ${r.message??"(unspecified description)"}`),this.name="ClientResponseError",this.error=r.error,this.description=r.message,this.status=e,this.headers=n}}function Ox(t){const e="at://";for(const n of t.alsoKnownAs??[])if(n.startsWith(e)){const r=n.slice(e.length);return r===""?null:r}return null}async function zx(t){const e=Ox(t.document);if(e===null)return null;try{return await t.resolveDid(e)===t.did?e:null}catch{return null}}const Lx="app.bsky.actor.profile",$x="self",Dx=t=>{if(typeof t!="object"||t===null)return null;const e=t.avatar;if(typeof e!="object"||e===null)return null;const n=e.ref;if(typeof n!="object"||n===null)return null;const r=n.$link;return typeof r=="string"&&r!==""?r:null},Nx=(t,e,n)=>`${t}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(e)}&cid=${encodeURIComponent(n)}`,Fx={lang:void 0,message:void 0,abortEarly:void 0,abortPipeEarly:void 0};function _y(t){return Fx}let Bx;function Ux(t){return Bx?.get(t)}let Hx;function jx(t){return Hx?.get(t)}let Wx;function Vx(t,e){return Wx?.get(t)?.get(e)}function xy(t){const e=typeof t;return e==="string"?`"${t}"`:e==="number"||e==="bigint"||e==="boolean"?`${t}`:e==="object"||e==="function"?(t&&Object.getPrototypeOf(t)?.constructor?.name)??"null":e}function _n(t,e,n,r,s){const i=s&&"input"in s?s.input:n.value,o=s?.expected??t.expects??null,a=s?.received??xy(i),l={kind:t.kind,type:t.type,input:i,expected:o,received:a,message:`Invalid ${e}: ${o?`Expected ${o} but r`:"R"}eceived ${a}`,requirement:t.requirement,path:s?.path,issues:s?.issues,lang:r.lang,abortEarly:r.abortEarly,abortPipeEarly:r.abortPipeEarly},c=t.kind==="schema",u=s?.message??t.message??Vx(t.reference,l.lang)??(c?jx(l.lang):null)??r.message??Ux(l.lang);u!==void 0&&(l.message=typeof u=="function"?u(l):u),c&&(n.typed=!1),n.issues?n.issues.push(l):n.issues=[l]}function Gx(t,e){return t===e||Number.isNaN(t)&&Number.isNaN(e)}function ky(t,e){return Object.prototype.hasOwnProperty.call(t,e)&&e!=="__proto__"&&e!=="prototype"&&e!=="constructor"}function Yx(t,e){const n=[...new Set(t)];return n.length>1?`(${n.join(` ${e} `)})`:n[0]??"never"}function Ln(t){return t["~standard"]={version:1,vendor:"valibot",validate:e=>t["~run"]({value:e},_y())},t}var Xx=class extends Error{constructor(t){super(t[0].message),this.name="ValiError",this.issues=t}};function ys(t,e){return{kind:"validation",type:"check",reference:ys,async:!1,expects:null,requirement:t,message:e,"~run"(n,r){return n.typed&&!this.requirement(n.value)&&_n(this,"input",n,r),n}}}function Sy(t,e){return{kind:"validation",type:"regex",reference:Sy,async:!1,expects:`${t}`,requirement:t,message:e,"~run"(n,r){return n.typed&&!this.requirement.test(n.value)&&_n(this,"format",n,r),n}}}function Hd(t){return{kind:"transformation",type:"transform",reference:Hd,async:!1,operation:t,"~run"(e){return e.value=this.operation(e.value),e}}}function qx(t,e,n){return typeof t.fallback=="function"?t.fallback(e,n):t.fallback}function Zx(t,e){return{...t,"~run"(n,r){const s=n.issues&&[...n.issues];if(n=t["~run"](n,r),n.issues){for(const i of n.issues)if(!s?.includes(i)){let o=n.value;for(const a of e){const l=o[a],c={type:"unknown",origin:"value",input:o,key:a,value:l};if(i.path?i.path.push(c):i.path=[c],!l)break;o=l}}}return n}}}function Ey(t,e,n){return typeof t.default=="function"?t.default(e,n):t.default}function Bn(t,e){return Ln({kind:"schema",type:"array",reference:Bn,expects:"Array",async:!1,item:t,message:e,"~run"(n,r){const s=n.value;if(Array.isArray(s)){n.typed=!0,n.value=[];for(let i=0;i<s.length;i++){const o=s[i],a=this.item["~run"]({value:o},r);if(a.issues){const l={type:"array",origin:"value",input:s,key:i,value:o};for(const c of a.issues)c.path?c.path.unshift(l):c.path=[l],n.issues?.push(c);if(n.issues||(n.issues=a.issues),r.abortEarly){n.typed=!1;break}}a.typed||(n.typed=!1),n.value.push(a.value)}}else _n(this,"type",n,r);return n}})}function gi(t){return Ln({kind:"schema",type:"boolean",reference:gi,expects:"boolean",async:!1,message:t,"~run"(e,n){return typeof e.value=="boolean"?e.typed=!0:_n(this,"type",e,n),e}})}function Ay(t,e){return Ln({kind:"schema",type:"custom",reference:Ay,expects:"unknown",async:!1,check:t,message:e,"~run"(n,r){return this.check(n.value)?n.typed=!0:_n(this,"type",n,r),n}})}function Ty(t,e){return Ln({kind:"schema",type:"literal",reference:Ty,expects:xy(t),async:!1,literal:t,message:e,"~run"(n,r){return Gx(n.value,this.literal)?n.typed=!0:_n(this,"type",n,r),n}})}function As(t,e){return Ln({kind:"schema",type:"loose_object",reference:As,expects:"Object",async:!1,entries:t,message:e,"~run"(n,r){const s=n.value;if(s&&typeof s=="object"){n.typed=!0,n.value={};for(const i in this.entries){const o=this.entries[i];if(i in s||(o.type==="exact_optional"||o.type==="optional"||o.type==="nullish")&&o.default!==void 0){const a=i in s?s[i]:Ey(o),l=o["~run"]({value:a},r);if(l.issues){const c={type:"object",origin:"value",input:s,key:i,value:a};for(const u of l.issues)u.path?u.path.unshift(c):u.path=[c],n.issues?.push(u);if(n.issues||(n.issues=l.issues),r.abortEarly){n.typed=!1;break}}l.typed||(n.typed=!1),n.value[i]=l.value}else if(o.fallback!==void 0)n.value[i]=qx(o);else if(o.type!=="exact_optional"&&o.type!=="optional"&&o.type!=="nullish"&&(_n(this,"key",n,r,{input:void 0,expected:`"${i}"`,path:[{type:"object",origin:"key",input:s,key:i,value:s[i]}]}),r.abortEarly))break}if(!n.issues||!r.abortEarly)for(const i in s)ky(s,i)&&!Object.prototype.hasOwnProperty.call(this.entries,i)&&(n.value[i]=s[i])}else _n(this,"type",n,r);return n}})}function Cy(t){return Ln({kind:"schema",type:"number",reference:Cy,expects:"number",async:!1,message:t,"~run"(e,n){return typeof e.value=="number"&&!isNaN(e.value)?e.typed=!0:_n(this,"type",e,n),e}})}function Un(t,e){return Ln({kind:"schema",type:"optional",reference:Un,expects:`(${t.expects} | undefined)`,async:!1,wrapped:t,default:e,"~run"(n,r){return n.value===void 0&&(this.default!==void 0&&(n.value=Ey(this,n,r)),n.value===void 0)?(n.typed=!0,n):this.wrapped["~run"](n,r)}})}function fl(t,e,n){return Ln({kind:"schema",type:"record",reference:fl,expects:"Object",async:!1,key:t,value:e,message:n,"~run"(r,s){const i=r.value;if(i&&typeof i=="object"){r.typed=!0,r.value={};for(const o in i)if(ky(i,o)){const a=i[o],l=this.key["~run"]({value:o},s);if(l.issues){const u={type:"object",origin:"key",input:i,key:o,value:a};for(const d of l.issues)d.path=[u],r.issues?.push(d);if(r.issues||(r.issues=l.issues),s.abortEarly){r.typed=!1;break}}const c=this.value["~run"]({value:a},s);if(c.issues){const u={type:"object",origin:"value",input:i,key:o,value:a};for(const d of c.issues)d.path?d.path.unshift(u):d.path=[u],r.issues?.push(d);if(r.issues||(r.issues=c.issues),s.abortEarly){r.typed=!1;break}}(!l.typed||!c.typed)&&(r.typed=!1),l.typed&&(r.value[l.value]=c.value)}}else _n(this,"type",r,s);return r}})}function Gt(t){return Ln({kind:"schema",type:"string",reference:Gt,expects:"string",async:!1,message:t,"~run"(e,n){return typeof e.value=="string"?e.typed=!0:_n(this,"type",e,n),e}})}function My(t,e){return Ln({kind:"schema",type:"tuple",reference:My,expects:"Array",async:!1,items:t,message:e,"~run"(n,r){const s=n.value;if(Array.isArray(s)){n.typed=!0,n.value=[];for(let i=0;i<this.items.length;i++){const o=s[i],a=this.items[i]["~run"]({value:o},r);if(a.issues){const l={type:"array",origin:"value",input:s,key:i,value:o};for(const c of a.issues)c.path?c.path.unshift(l):c.path=[l],n.issues?.push(c);if(n.issues||(n.issues=a.issues),r.abortEarly){n.typed=!1;break}}a.typed||(n.typed=!1),n.value.push(a.value)}}else _n(this,"type",n,r);return n}})}function Cf(t){let e;if(t)for(const n of t)if(e)for(const r of n.issues)e.push(r);else e=n.issues;return e}function Ns(t,e){return Ln({kind:"schema",type:"union",reference:Ns,expects:Yx(t.map(n=>n.expects),"|"),async:!1,options:t,message:e,"~run"(n,r){let s,i,o;for(const a of this.options){const l=a["~run"]({value:n.value},r);if(l.typed)if(l.issues)i?i.push(l):i=[l];else{s=l;break}else o?o.push(l):o=[l]}if(s)return s;if(i){if(i.length===1)return i[0];_n(this,"type",n,r,{issues:Cf(i)}),n.typed=!0}else{if(o?.length===1)return o[0];_n(this,"type",n,r,{issues:Cf(o)})}return n}})}function Ry(){return Ln({kind:"schema",type:"unknown",reference:Ry,expects:"unknown",async:!1,"~run"(t){return t.typed=!0,t}})}function Kx(t,e,n){const r=t["~run"]({value:e},_y());if(r.issues)throw new Xx(r.issues);return r.value}function Tr(...t){return Ln({...t[0],pipe:t,"~run"(e,n){for(const r of t)if(r.kind!=="metadata"){if(e.issues&&(r.kind==="schema"||r.kind==="transformation")){e.typed=!1;break}(!e.issues||!n.abortEarly&&!n.abortPipeEarly)&&(e=r["~run"](e,n))}return e}})}const Jx=/^#[^#]+$/,Qx=/^z[a-km-zA-HJ-NP-Z1-9]+$/,yi=Tr(Gt(),ys(t=>URL.canParse(t),"must be a url")),jd=Tr(Gt(),ys(t=>Jx.test(t)||URL.canParse(t),"must be a did relative uri")),ek=Tr(Gt(),Sy(Qx,"must be a base58 multibase")),Ra=Ay(Bd,"must be a did"),Mf=Tr(As({id:jd,type:Gt(),controller:Ra,publicKeyMultibase:Un(ek),publicKeyJwk:Un(fl(Gt(),Ry()))}),Zx(ys(t=>{switch(t.type){case"Multikey":case"EcdsaSecp256k1VerificationKey2019":case"EcdsaSecp256r1VerificationKey2019":return t.publicKeyMultibase!==void 0}return!0},"missing public key multibase"),["publicKeyMultibase"])),tk=As({id:jd,type:Ns([Gt(),Bn(Gt())]),serviceEndpoint:Ns([yi,fl(Gt(),yi),Bn(Ns([yi,fl(Gt(),yi)]))])}),Sc=(t,e=n=>n)=>{const n=new Set;for(const r of t){const s=e(r);if(n.has(s))return!0;n.add(s)}return!1},nk=Tr(As({"@context":Un(Bn(yi)),id:Ra,alsoKnownAs:Un(Tr(Bn(yi),ys(t=>!Sc(t),"duplicate aka entries"))),verificationMethod:Un(Tr(Bn(Mf),ys(t=>!Sc(t,e=>e.id),"duplicate verification method ids"))),service:Un(Bn(tk)),controller:Un(Ns([Ra,Bn(Ra)])),authentication:Un(Bn(Ns([jd,Mf])))}),ys(t=>{const e=t.service;if(!e?.length)return!0;const n=t.id,r=e.map(s=>s.id[0]==="#"?n+s.id:s.id);return!Sc(r)},"duplicate service ids")),rk="parse"in URL,sk=t=>{let e=null;if(rk)e=URL.parse(t);else try{e=new URL(t)}catch{}return e!==null&&(e.protocol==="https:"||e.protocol==="http:")&&e.pathname==="/"&&e.search===""&&e.hash===""},Rf=t=>{const e=t.alsoKnownAs;if(!e)return null;const n="at://";for(let r=0,s=e.length;r<s;r++){const i=e[r];if(!i.startsWith(n))continue;const o=i.slice(n.length);return fy(o)?o:void 0}return null},ik=(t,e)=>{const n=t.service;if(n)for(let r=0,s=n.length;r<s;r++){const{id:i,type:o,serviceEndpoint:a}=n[r];if(!(i!==e.id&&i!==t.id+e.id)){if(e.type!==void 0){if(Array.isArray(o)){if(!o.includes(e.type))continue}else if(o!==e.type)continue}if(!(typeof a!="string"||!sk(a)))return a}}},ok=t=>ik(t,{id:"#atproto_pds",type:"AtprotoPersonalDataServer"}),ak=/^did:plc:([a-z2-7]{24})$/,lk=t=>typeof t=="string"&&t.length===32&&ak.test(t),ck=/^did:web:([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:\.[a-zA-Z]{2,})|localhost(?:%3[aA]\d+)?)$/,uk=t=>typeof t=="string"&&t.length>=12&&ck.test(t),dk=t=>{const[e,...n]=t.slice(8).split(":").map(decodeURIComponent);let r="/"+n.join("/");r==="/"?r="/.well-known/did.json":r+="/did.json";const s=new URL(`https://${e}${r}`);return s.hostname==="localhost"&&(s.protocol="http:"),s},Py=t=>lk(t)||uk(t),hk=t=>{const e=t.indexOf(":",4);return t.slice(4,e)};class Wd extends Error{name="DidResolutionError"}class Vd extends Wd{name="UnsupportedDidMethodError";did;constructor(e){super(`unsupported did method; did=${e}`),this.did=e}}class Iy extends Wd{name="DocumentNotFoundError";did;constructor(e){super(`did document not found; did=${e}`),this.did=e}}class Oy extends Wd{name="FailedDocumentResolutionError";did;constructor(e,n){super(`failed to resolve did document; did=${e}`,n),this.did=e}}class Wl extends Error{name="HandleResolutionError"}class Fu extends Wl{name="DidNotFoundError";handle;constructor(e){super(`handle returned no did; handle=${e}`),this.handle=e}}class Bu extends Wl{name="FailedHandleResolutionError";handle;constructor(e,n){super(`failed to resolve handle; handle=${e}`,n),this.handle=e}}class zy extends Wl{name="InvalidResolvedHandleError";handle;did;constructor(e,n){super(`handle returned invalid did; handle=${e}; did=${n}`),this.handle=e,this.did=n}}class Ly extends Wl{name="AmbiguousHandleError";constructor(e){super(`handle returned multiple did values; handle=${e}`)}}class Ec extends Error{name="ActorResolutionError"}class fk{handleResolver;didDocumentResolver;constructor(e){this.handleResolver=e.handleResolver,this.didDocumentResolver=e.didDocumentResolver}async resolve(e,n){const r=Bd(e);let s;if(r)s=e;else try{s=await this.handleResolver.resolve(e,n)}catch(l){throw new Ec("failed to resolve handle",{cause:l})}let i;try{i=await this.didDocumentResolver.resolve(s,n)}catch(l){throw new Ec("failed to resolve did document",{cause:l})}const o=ok(i);if(!o)throw new Ec("missing pds endpoint");let a="handle.invalid";if(r){const l=Rf(i);if(l)try{await this.handleResolver.resolve(l,n)===s&&(a=l)}catch{}}else Rf(i)===e&&(a=e);return{did:s,handle:a,pds:new URL(o).href}}}class pk{#e;constructor({methods:e}){this.#e=new Map(Object.entries(e))}async resolve(e,n){const r=hk(e),s=this.#e.get(r);if(s===void 0)throw new Vd(e);return await s.resolve(e,n)}}function Gd(...t){return t.reduce(mk)}const mk=(t,e)=>n=>t(n).then(e);let Vl=class extends Error{name="FetchResponseError"};class Gl extends Vl{name="FailedResponseError";response;constructor(e){super(`got http ${e.status}`),this.response=e}get status(){return this.response.status}}class Pf extends Vl{name="ImproperContentTypeError";contentType;constructor(e,n){super(n),this.contentType=e}}class Uu extends Vl{name="ImproperContentLengthError";expectedSize;actualSize;constructor(e,n,r){super(r),this.expectedSize=e,this.actualSize=n}}class gk extends Vl{name="ImproperResponseError"}class yk extends TransformStream{constructor(e){let n=0;super({transform(r,s){if(n+=r.length,n>e){s.error(new Uu(e,n,"response content-length too large"));return}s.enqueue(r)}})}}const Yd=async t=>{if(t.ok)return t;throw new Gl(t)},bk=t=>async e=>{const n=await Ny(e,t);return{response:e,text:n}},$y=(t,e)=>async n=>{await vk(n,t);const r=await Ny(n,e);try{const s=JSON.parse(r);return{response:n,json:s}}catch(s){throw new gk("unexpected json data",{cause:s})}},Dy=t=>async e=>{const n=Kx(t,e.json);return{response:e.response,json:n}},vk=async(t,e)=>{const n=t.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase();if(n===void 0)throw t.body&&await t.body.cancel(),new Pf(null,"missing response content-type");if(!e.test(n))throw t.body&&await t.body.cancel(),new Pf(n,"unexpected response content-type")},Ny=async(t,e)=>{const n=t.headers.get("content-length");if(n!==null){const i=Number(n);if(!/^\d+$/.test(n)||!Number.isSafeInteger(i))throw t.body?.cancel(),new Uu(e,null,"invalid response content-length");if(i>e)throw t.body?.cancel(),new Uu(e,i,"response content-length too large")}if(t.body===null)return"";const r=t.body.pipeThrough(new yk(e)).pipeThrough(new TextDecoderStream);let s="";for await(const i of wk(r))s+=i;return s},wk=Symbol.asyncIterator in ReadableStream.prototype?t=>t[Symbol.asyncIterator]():t=>{const e=t.getReader();return{[Symbol.asyncIterator](){return this},next(){return e.read()},async return(){return await e.cancel(),{done:!0,value:void 0}},async throw(n){return await e.cancel(n),{done:!0,value:void 0}}}},zo=Tr(Cy(),ys(t=>Number.isInteger(t)&&t>=0&&t<=2**32-1)),_k=As({name:Gt(),type:Ty(16)}),xk=As({name:Gt(),type:zo,TTL:zo,data:Tr(Gt(),Hd(t=>t.replace(/^"|"$/g,"").replace(/\\"/g,'"')))}),kk=As({name:Gt(),type:zo,TTL:zo,data:Gt()}),Sk=As({Status:zo,TC:gi(),RD:gi(),RA:gi(),AD:gi(),CD:gi(),Question:My([_k]),Answer:Un(Tr(Bn(xk),Hd(t=>t.filter(e=>e.type===16))),()=>[]),Authority:Un(Bn(kk)),Comment:Un(Ns([Gt(),Bn(Gt())]))}),Ek=Gd(Yd,$y(/^application\/(dns-)?json$/,16*1024),Dy(Sk)),Fy=Gd(Yd,$y(/^application\/(did\+ld\+)?json$/,20*1024),Dy(nk));class Ak{apiUrl;#e;constructor({apiUrl:e="https://plc.directory",fetch:n=fetch}={}){this.apiUrl=e,this.#e=n}async resolve(e,n){if(!e.startsWith("did:plc:"))throw new Vd(e);let r;try{const s=new URL(`/${encodeURIComponent(e)}`,this.apiUrl),i=await(0,this.#e)(s,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,redirect:"manual",headers:{accept:"application/did+ld+json,application/json"}});if(i.status>=300&&i.status<400)throw new TypeError("unexpected redirect");r=(await Fy(i)).json}catch(s){throw s instanceof Gl&&s.status===404?new Iy(e):new Oy(e,{cause:s})}return r}}class Tk{#e;constructor({fetch:e=fetch}={}){this.#e=e}async resolve(e,n){if(!e.startsWith("did:web:"))throw new Vd(e);let r;try{const s=dk(e),i=await(0,this.#e)(s,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,redirect:"manual",headers:{accept:"application/did+ld+json,application/json"}});if(i.status>=300&&i.status<400)throw new TypeError("unexpected redirect");r=(await Fy(i)).json}catch(s){throw s instanceof Gl&&s.status===404?new Iy(e):new Oy(e,{cause:s})}return r}}class Ck{#e;strategy;constructor({methods:e,strategy:n="race"}){this.#e=e,this.strategy=n}async resolve(e,n){const{http:r,dns:s}=this.#e,i=n?.signal,o=new AbortController;i&&i.addEventListener("abort",()=>o.abort(),{signal:o.signal});const a=s.resolve(e,{...n,signal:o.signal}),l=r.resolve(e,{...n,signal:o.signal});switch(this.strategy){case"race":return new Promise(c=>{a.then(u=>{o.abort(),c(u)},()=>c(l)),l.then(u=>{o.abort(),c(u)},()=>c(a))});case"dns-first":{l.catch(sa);const c=await a.catch(sa);return c?(o.abort(),c):l}case"http-first":{a.catch(sa);const c=await l.catch(sa);return c?(o.abort(),c):a}case"both":{const[c,u]=await Promise.allSettled([a,l]),d=c.status==="fulfilled"?c.value:void 0,h=u.status==="fulfilled"?u.value:void 0;if(d&&h&&d!==h)throw new Ly(e);return d||h||a}}}}const sa=()=>{},Mk="_atproto",Ac="did=";class Rk{dohUrl;#e;constructor({dohUrl:e,fetch:n=fetch}){this.dohUrl=e,this.#e=n}async resolve(e,n){let r;try{const o=new URL(this.dohUrl);o.searchParams.set("name",`${Mk}.${e}`),o.searchParams.set("type","TXT");const a=await(0,this.#e)(o,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,headers:{accept:"application/dns-json"}});r=(await Ek(a)).json}catch(o){throw new Bu(e,{cause:o})}const s=r.Status,i=r.Answer;if(s!==0)throw s===3?new Fu(e):new Bu(e,{cause:new TypeError(`dns returned ${s}`)});for(let o=0,a=i.length;o<a;o++){const c=i[o].data;if(!c.startsWith(Ac))continue;for(let d=o+1;d<a;d++)if(i[d].data.startsWith(Ac))throw new Ly(e);const u=c.slice(Ac.length);if(!Py(u))throw new zy(e,u);return u}throw new Fu(e)}}const Pk=Gd(Yd,bk(2064));class Ik{#e;constructor({fetch:e=fetch}={}){this.#e=e}async resolve(e,n){let r;try{const i=new URL("/.well-known/atproto-did",`https://${e}`),o=await(0,this.#e)(i,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,redirect:"manual"});if(o.status>=300&&o.status<400)throw new TypeError("unexpected redirect");r=(await Pk(o)).text}catch(i){throw i instanceof Gl&&i.status===404?new Fu(e):new Bu(e,{cause:i})}const s=r.split(`
`)[0].trim();if(!Py(s))throw new zy(e,s);return s}}const Ok="https://cloudflare-dns.com/dns-query";function Go(){return new pk({methods:{plc:new Ak,web:new Tk}})}function Yl(){return new Ck({strategy:"race",methods:{dns:new Rk({dohUrl:Ok}),http:new Ik}})}function Xl(t){const e=t.service?.find(r=>r.id==="#atproto"||r.id==="#atproto_pds")??t.service?.find(r=>(Array.isArray(r.type)?r.type:[r.type]).includes("AtprotoPersonalDataServer")),n=typeof e?.serviceEndpoint=="string"?e.serviceEndpoint.replace(/\/+$/,""):void 0;if(n===void 0)throw new Error(`no personal data server in the account document for ${t.id}`);return n}function zk(t){const e=Go(),n=Yl(),r=((...u)=>globalThis.fetch(...u)),s=new Map,i=new Map,o=new Map,a=new Map,l=(u,d,h)=>{const f=u.get(d);if(f!==void 0)return f;const m=h();return u.set(d,m),m},c={document(u){return l(s,u,()=>e.resolve(u))},async service(u){return Xl(await c.document(u))},handle(u){return l(i,u,async()=>{const d=await zx({did:u,document:await c.document(u),resolveDid:h=>n.resolve(h)});return o.set(u,d),d})},knownHandle(u){return o.get(u)},picture(u){return l(a,u,async()=>{const d=await c.service(u),h=await r(`${d}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(u)}&collection=${Lx}&rkey=${$x}`);if(!h.ok)return null;const f=Dx((await h.json()).value);if(f===null)return null;const m=await r(Nx(d,u,f));return m.ok?m.blob():null})},async name(u){try{return await c.handle(u)??u}catch{return u}}};return c}var ia=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function By(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}function oa(t){throw new Error('Could not dynamically require "'+t+'". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.')}var Tc={exports:{}};var If;function Lk(){return If||(If=1,(function(t,e){(function(n){t.exports=n()})(function(){return(function n(r,s,i){function o(c,u){if(!s[c]){if(!r[c]){var d=typeof oa=="function"&&oa;if(!u&&d)return d(c,!0);if(a)return a(c,!0);var h=new Error("Cannot find module '"+c+"'");throw h.code="MODULE_NOT_FOUND",h}var f=s[c]={exports:{}};r[c][0].call(f.exports,function(m){var p=r[c][1][m];return o(p||m)},f,f.exports,n,r,s,i)}return s[c].exports}for(var a=typeof oa=="function"&&oa,l=0;l<i.length;l++)o(i[l]);return o})({1:[function(n,r,s){var i=n("./utils"),o=n("./support"),a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";s.encode=function(l){for(var c,u,d,h,f,m,p,y=[],g=0,b=l.length,v=b,x=i.getTypeOf(l)!=="string";g<l.length;)v=b-g,d=x?(c=l[g++],u=g<b?l[g++]:0,g<b?l[g++]:0):(c=l.charCodeAt(g++),u=g<b?l.charCodeAt(g++):0,g<b?l.charCodeAt(g++):0),h=c>>2,f=(3&c)<<4|u>>4,m=1<v?(15&u)<<2|d>>6:64,p=2<v?63&d:64,y.push(a.charAt(h)+a.charAt(f)+a.charAt(m)+a.charAt(p));return y.join("")},s.decode=function(l){var c,u,d,h,f,m,p=0,y=0,g="data:";if(l.substr(0,g.length)===g)throw new Error("Invalid base64 input, it looks like a data url.");var b,v=3*(l=l.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(l.charAt(l.length-1)===a.charAt(64)&&v--,l.charAt(l.length-2)===a.charAt(64)&&v--,v%1!=0)throw new Error("Invalid base64 input, bad content length.");for(b=o.uint8array?new Uint8Array(0|v):new Array(0|v);p<l.length;)c=a.indexOf(l.charAt(p++))<<2|(h=a.indexOf(l.charAt(p++)))>>4,u=(15&h)<<4|(f=a.indexOf(l.charAt(p++)))>>2,d=(3&f)<<6|(m=a.indexOf(l.charAt(p++))),b[y++]=c,f!==64&&(b[y++]=u),m!==64&&(b[y++]=d);return b}},{"./support":30,"./utils":32}],2:[function(n,r,s){var i=n("./external"),o=n("./stream/DataWorker"),a=n("./stream/Crc32Probe"),l=n("./stream/DataLengthProbe");function c(u,d,h,f,m){this.compressedSize=u,this.uncompressedSize=d,this.crc32=h,this.compression=f,this.compressedContent=m}c.prototype={getContentWorker:function(){var u=new o(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new l("data_length")),d=this;return u.on("end",function(){if(this.streamInfo.data_length!==d.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),u},getCompressedWorker:function(){return new o(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},c.createWorkerFrom=function(u,d,h){return u.pipe(new a).pipe(new l("uncompressedSize")).pipe(d.compressWorker(h)).pipe(new l("compressedSize")).withStreamInfo("compression",d)},r.exports=c},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(n,r,s){var i=n("./stream/GenericWorker");s.STORE={magic:"\0\0",compressWorker:function(){return new i("STORE compression")},uncompressWorker:function(){return new i("STORE decompression")}},s.DEFLATE=n("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(n,r,s){var i=n("./utils"),o=(function(){for(var a,l=[],c=0;c<256;c++){a=c;for(var u=0;u<8;u++)a=1&a?3988292384^a>>>1:a>>>1;l[c]=a}return l})();r.exports=function(a,l){return a!==void 0&&a.length?i.getTypeOf(a)!=="string"?(function(c,u,d,h){var f=o,m=h+d;c^=-1;for(var p=h;p<m;p++)c=c>>>8^f[255&(c^u[p])];return-1^c})(0|l,a,a.length,0):(function(c,u,d,h){var f=o,m=h+d;c^=-1;for(var p=h;p<m;p++)c=c>>>8^f[255&(c^u.charCodeAt(p))];return-1^c})(0|l,a,a.length,0):0}},{"./utils":32}],5:[function(n,r,s){s.base64=!1,s.binary=!1,s.dir=!1,s.createFolders=!0,s.date=null,s.compression=null,s.compressionOptions=null,s.comment=null,s.unixPermissions=null,s.dosPermissions=null},{}],6:[function(n,r,s){var i=null;i=typeof Promise<"u"?Promise:n("lie"),r.exports={Promise:i}},{lie:37}],7:[function(n,r,s){var i=typeof Uint8Array<"u"&&typeof Uint16Array<"u"&&typeof Uint32Array<"u",o=n("pako"),a=n("./utils"),l=n("./stream/GenericWorker"),c=i?"uint8array":"array";function u(d,h){l.call(this,"FlateWorker/"+d),this._pako=null,this._pakoAction=d,this._pakoOptions=h,this.meta={}}s.magic="\b\0",a.inherits(u,l),u.prototype.processChunk=function(d){this.meta=d.meta,this._pako===null&&this._createPako(),this._pako.push(a.transformTo(c,d.data),!1)},u.prototype.flush=function(){l.prototype.flush.call(this),this._pako===null&&this._createPako(),this._pako.push([],!0)},u.prototype.cleanUp=function(){l.prototype.cleanUp.call(this),this._pako=null},u.prototype._createPako=function(){this._pako=new o[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var d=this;this._pako.onData=function(h){d.push({data:h,meta:d.meta})}},s.compressWorker=function(d){return new u("Deflate",d)},s.uncompressWorker=function(){return new u("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(n,r,s){function i(f,m){var p,y="";for(p=0;p<m;p++)y+=String.fromCharCode(255&f),f>>>=8;return y}function o(f,m,p,y,g,b){var v,x,k=f.file,C=f.compression,E=b!==c.utf8encode,T=a.transformTo("string",b(k.name)),A=a.transformTo("string",c.utf8encode(k.name)),M=k.comment,O=a.transformTo("string",b(M)),S=a.transformTo("string",c.utf8encode(M)),z=A.length!==k.name.length,w=S.length!==M.length,R="",F="",D="",Q=k.dir,H=k.date,J={crc32:0,compressedSize:0,uncompressedSize:0};m&&!p||(J.crc32=f.crc32,J.compressedSize=f.compressedSize,J.uncompressedSize=f.uncompressedSize);var N=0;m&&(N|=8),E||!z&&!w||(N|=2048);var U=0,ae=0;Q&&(U|=16),g==="UNIX"?(ae=798,U|=(function(q,be){var De=q;return q||(De=be?16893:33204),(65535&De)<<16})(k.unixPermissions,Q)):(ae=20,U|=(function(q){return 63&(q||0)})(k.dosPermissions)),v=H.getUTCHours(),v<<=6,v|=H.getUTCMinutes(),v<<=5,v|=H.getUTCSeconds()/2,x=H.getUTCFullYear()-1980,x<<=4,x|=H.getUTCMonth()+1,x<<=5,x|=H.getUTCDate(),z&&(F=i(1,1)+i(u(T),4)+A,R+="up"+i(F.length,2)+F),w&&(D=i(1,1)+i(u(O),4)+S,R+="uc"+i(D.length,2)+D);var ie="";return ie+=`
\0`,ie+=i(N,2),ie+=C.magic,ie+=i(v,2),ie+=i(x,2),ie+=i(J.crc32,4),ie+=i(J.compressedSize,4),ie+=i(J.uncompressedSize,4),ie+=i(T.length,2),ie+=i(R.length,2),{fileRecord:d.LOCAL_FILE_HEADER+ie+T+R,dirRecord:d.CENTRAL_FILE_HEADER+i(ae,2)+ie+i(O.length,2)+"\0\0\0\0"+i(U,4)+i(y,4)+T+R+O}}var a=n("../utils"),l=n("../stream/GenericWorker"),c=n("../utf8"),u=n("../crc32"),d=n("../signature");function h(f,m,p,y){l.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=m,this.zipPlatform=p,this.encodeFileName=y,this.streamFiles=f,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}a.inherits(h,l),h.prototype.push=function(f){var m=f.meta.percent||0,p=this.entriesCount,y=this._sources.length;this.accumulate?this.contentBuffer.push(f):(this.bytesWritten+=f.data.length,l.prototype.push.call(this,{data:f.data,meta:{currentFile:this.currentFile,percent:p?(m+100*(p-y-1))/p:100}}))},h.prototype.openedSource=function(f){this.currentSourceOffset=this.bytesWritten,this.currentFile=f.file.name;var m=this.streamFiles&&!f.file.dir;if(m){var p=o(f,m,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:p.fileRecord,meta:{percent:0}})}else this.accumulate=!0},h.prototype.closedSource=function(f){this.accumulate=!1;var m=this.streamFiles&&!f.file.dir,p=o(f,m,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(p.dirRecord),m)this.push({data:(function(y){return d.DATA_DESCRIPTOR+i(y.crc32,4)+i(y.compressedSize,4)+i(y.uncompressedSize,4)})(f),meta:{percent:100}});else for(this.push({data:p.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},h.prototype.flush=function(){for(var f=this.bytesWritten,m=0;m<this.dirRecords.length;m++)this.push({data:this.dirRecords[m],meta:{percent:100}});var p=this.bytesWritten-f,y=(function(g,b,v,x,k){var C=a.transformTo("string",k(x));return d.CENTRAL_DIRECTORY_END+"\0\0\0\0"+i(g,2)+i(g,2)+i(b,4)+i(v,4)+i(C.length,2)+C})(this.dirRecords.length,p,f,this.zipComment,this.encodeFileName);this.push({data:y,meta:{percent:100}})},h.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},h.prototype.registerPrevious=function(f){this._sources.push(f);var m=this;return f.on("data",function(p){m.processChunk(p)}),f.on("end",function(){m.closedSource(m.previous.streamInfo),m._sources.length?m.prepareNextSource():m.end()}),f.on("error",function(p){m.error(p)}),this},h.prototype.resume=function(){return!!l.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},h.prototype.error=function(f){var m=this._sources;if(!l.prototype.error.call(this,f))return!1;for(var p=0;p<m.length;p++)try{m[p].error(f)}catch{}return!0},h.prototype.lock=function(){l.prototype.lock.call(this);for(var f=this._sources,m=0;m<f.length;m++)f[m].lock()},r.exports=h},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(n,r,s){var i=n("../compressions"),o=n("./ZipFileWorker");s.generateWorker=function(a,l,c){var u=new o(l.streamFiles,c,l.platform,l.encodeFileName),d=0;try{a.forEach(function(h,f){d++;var m=(function(b,v){var x=b||v,k=i[x];if(!k)throw new Error(x+" is not a valid compression method !");return k})(f.options.compression,l.compression),p=f.options.compressionOptions||l.compressionOptions||{},y=f.dir,g=f.date;f._compressWorker(m,p).withStreamInfo("file",{name:h,dir:y,date:g,comment:f.comment||"",unixPermissions:f.unixPermissions,dosPermissions:f.dosPermissions}).pipe(u)}),u.entriesCount=d}catch(h){u.error(h)}return u}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(n,r,s){function i(){if(!(this instanceof i))return new i;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var o=new i;for(var a in this)typeof this[a]!="function"&&(o[a]=this[a]);return o}}(i.prototype=n("./object")).loadAsync=n("./load"),i.support=n("./support"),i.defaults=n("./defaults"),i.version="3.10.1",i.loadAsync=function(o,a){return new i().loadAsync(o,a)},i.external=n("./external"),r.exports=i},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(n,r,s){var i=n("./utils"),o=n("./external"),a=n("./utf8"),l=n("./zipEntries"),c=n("./stream/Crc32Probe"),u=n("./nodejsUtils");function d(h){return new o.Promise(function(f,m){var p=h.decompressed.getContentWorker().pipe(new c);p.on("error",function(y){m(y)}).on("end",function(){p.streamInfo.crc32!==h.decompressed.crc32?m(new Error("Corrupted zip : CRC32 mismatch")):f()}).resume()})}r.exports=function(h,f){var m=this;return f=i.extend(f||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:a.utf8decode}),u.isNode&&u.isStream(h)?o.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):i.prepareContent("the loaded zip file",h,!0,f.optimizedBinaryString,f.base64).then(function(p){var y=new l(f);return y.load(p),y}).then(function(p){var y=[o.Promise.resolve(p)],g=p.files;if(f.checkCRC32)for(var b=0;b<g.length;b++)y.push(d(g[b]));return o.Promise.all(y)}).then(function(p){for(var y=p.shift(),g=y.files,b=0;b<g.length;b++){var v=g[b],x=v.fileNameStr,k=i.resolve(v.fileNameStr);m.file(k,v.decompressed,{binary:!0,optimizedBinaryString:!0,date:v.date,dir:v.dir,comment:v.fileCommentStr.length?v.fileCommentStr:null,unixPermissions:v.unixPermissions,dosPermissions:v.dosPermissions,createFolders:f.createFolders}),v.dir||(m.file(k).unsafeOriginalName=x)}return y.zipComment.length&&(m.comment=y.zipComment),m})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(n,r,s){var i=n("../utils"),o=n("../stream/GenericWorker");function a(l,c){o.call(this,"Nodejs stream input adapter for "+l),this._upstreamEnded=!1,this._bindStream(c)}i.inherits(a,o),a.prototype._bindStream=function(l){var c=this;(this._stream=l).pause(),l.on("data",function(u){c.push({data:u,meta:{percent:0}})}).on("error",function(u){c.isPaused?this.generatedError=u:c.error(u)}).on("end",function(){c.isPaused?c._upstreamEnded=!0:c.end()})},a.prototype.pause=function(){return!!o.prototype.pause.call(this)&&(this._stream.pause(),!0)},a.prototype.resume=function(){return!!o.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},r.exports=a},{"../stream/GenericWorker":28,"../utils":32}],13:[function(n,r,s){var i=n("readable-stream").Readable;function o(a,l,c){i.call(this,l),this._helper=a;var u=this;a.on("data",function(d,h){u.push(d)||u._helper.pause(),c&&c(h)}).on("error",function(d){u.emit("error",d)}).on("end",function(){u.push(null)})}n("../utils").inherits(o,i),o.prototype._read=function(){this._helper.resume()},r.exports=o},{"../utils":32,"readable-stream":16}],14:[function(n,r,s){r.exports={isNode:typeof Buffer<"u",newBufferFrom:function(i,o){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(i,o);if(typeof i=="number")throw new Error('The "data" argument must not be a number');return new Buffer(i,o)},allocBuffer:function(i){if(Buffer.alloc)return Buffer.alloc(i);var o=new Buffer(i);return o.fill(0),o},isBuffer:function(i){return Buffer.isBuffer(i)},isStream:function(i){return i&&typeof i.on=="function"&&typeof i.pause=="function"&&typeof i.resume=="function"}}},{}],15:[function(n,r,s){function i(k,C,E){var T,A=a.getTypeOf(C),M=a.extend(E||{},u);M.date=M.date||new Date,M.compression!==null&&(M.compression=M.compression.toUpperCase()),typeof M.unixPermissions=="string"&&(M.unixPermissions=parseInt(M.unixPermissions,8)),M.unixPermissions&&16384&M.unixPermissions&&(M.dir=!0),M.dosPermissions&&16&M.dosPermissions&&(M.dir=!0),M.dir&&(k=g(k)),M.createFolders&&(T=y(k))&&b.call(this,T,!0);var O=A==="string"&&M.binary===!1&&M.base64===!1;E&&E.binary!==void 0||(M.binary=!O),(C instanceof d&&C.uncompressedSize===0||M.dir||!C||C.length===0)&&(M.base64=!1,M.binary=!0,C="",M.compression="STORE",A="string");var S=null;S=C instanceof d||C instanceof l?C:m.isNode&&m.isStream(C)?new p(k,C):a.prepareContent(k,C,M.binary,M.optimizedBinaryString,M.base64);var z=new h(k,S,M);this.files[k]=z}var o=n("./utf8"),a=n("./utils"),l=n("./stream/GenericWorker"),c=n("./stream/StreamHelper"),u=n("./defaults"),d=n("./compressedObject"),h=n("./zipObject"),f=n("./generate"),m=n("./nodejsUtils"),p=n("./nodejs/NodejsStreamInputAdapter"),y=function(k){k.slice(-1)==="/"&&(k=k.substring(0,k.length-1));var C=k.lastIndexOf("/");return 0<C?k.substring(0,C):""},g=function(k){return k.slice(-1)!=="/"&&(k+="/"),k},b=function(k,C){return C=C!==void 0?C:u.createFolders,k=g(k),this.files[k]||i.call(this,k,null,{dir:!0,createFolders:C}),this.files[k]};function v(k){return Object.prototype.toString.call(k)==="[object RegExp]"}var x={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(k){var C,E,T;for(C in this.files)T=this.files[C],(E=C.slice(this.root.length,C.length))&&C.slice(0,this.root.length)===this.root&&k(E,T)},filter:function(k){var C=[];return this.forEach(function(E,T){k(E,T)&&C.push(T)}),C},file:function(k,C,E){if(arguments.length!==1)return k=this.root+k,i.call(this,k,C,E),this;if(v(k)){var T=k;return this.filter(function(M,O){return!O.dir&&T.test(M)})}var A=this.files[this.root+k];return A&&!A.dir?A:null},folder:function(k){if(!k)return this;if(v(k))return this.filter(function(A,M){return M.dir&&k.test(A)});var C=this.root+k,E=b.call(this,C),T=this.clone();return T.root=E.name,T},remove:function(k){k=this.root+k;var C=this.files[k];if(C||(k.slice(-1)!=="/"&&(k+="/"),C=this.files[k]),C&&!C.dir)delete this.files[k];else for(var E=this.filter(function(A,M){return M.name.slice(0,k.length)===k}),T=0;T<E.length;T++)delete this.files[E[T].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(k){var C,E={};try{if((E=a.extend(k||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:o.utf8encode})).type=E.type.toLowerCase(),E.compression=E.compression.toUpperCase(),E.type==="binarystring"&&(E.type="string"),!E.type)throw new Error("No output type specified.");a.checkSupport(E.type),E.platform!=="darwin"&&E.platform!=="freebsd"&&E.platform!=="linux"&&E.platform!=="sunos"||(E.platform="UNIX"),E.platform==="win32"&&(E.platform="DOS");var T=E.comment||this.comment||"";C=f.generateWorker(this,E,T)}catch(A){(C=new l("error")).error(A)}return new c(C,E.type||"string",E.mimeType)},generateAsync:function(k,C){return this.generateInternalStream(k).accumulate(C)},generateNodeStream:function(k,C){return(k=k||{}).type||(k.type="nodebuffer"),this.generateInternalStream(k).toNodejsStream(C)}};r.exports=x},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(n,r,s){r.exports=n("stream")},{stream:void 0}],17:[function(n,r,s){var i=n("./DataReader");function o(a){i.call(this,a);for(var l=0;l<this.data.length;l++)a[l]=255&a[l]}n("../utils").inherits(o,i),o.prototype.byteAt=function(a){return this.data[this.zero+a]},o.prototype.lastIndexOfSignature=function(a){for(var l=a.charCodeAt(0),c=a.charCodeAt(1),u=a.charCodeAt(2),d=a.charCodeAt(3),h=this.length-4;0<=h;--h)if(this.data[h]===l&&this.data[h+1]===c&&this.data[h+2]===u&&this.data[h+3]===d)return h-this.zero;return-1},o.prototype.readAndCheckSignature=function(a){var l=a.charCodeAt(0),c=a.charCodeAt(1),u=a.charCodeAt(2),d=a.charCodeAt(3),h=this.readData(4);return l===h[0]&&c===h[1]&&u===h[2]&&d===h[3]},o.prototype.readData=function(a){if(this.checkOffset(a),a===0)return[];var l=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./DataReader":18}],18:[function(n,r,s){var i=n("../utils");function o(a){this.data=a,this.length=a.length,this.index=0,this.zero=0}o.prototype={checkOffset:function(a){this.checkIndex(this.index+a)},checkIndex:function(a){if(this.length<this.zero+a||a<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+a+"). Corrupted zip ?")},setIndex:function(a){this.checkIndex(a),this.index=a},skip:function(a){this.setIndex(this.index+a)},byteAt:function(){},readInt:function(a){var l,c=0;for(this.checkOffset(a),l=this.index+a-1;l>=this.index;l--)c=(c<<8)+this.byteAt(l);return this.index+=a,c},readString:function(a){return i.transformTo("string",this.readData(a))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var a=this.readInt(4);return new Date(Date.UTC(1980+(a>>25&127),(a>>21&15)-1,a>>16&31,a>>11&31,a>>5&63,(31&a)<<1))}},r.exports=o},{"../utils":32}],19:[function(n,r,s){var i=n("./Uint8ArrayReader");function o(a){i.call(this,a)}n("../utils").inherits(o,i),o.prototype.readData=function(a){this.checkOffset(a);var l=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(n,r,s){var i=n("./DataReader");function o(a){i.call(this,a)}n("../utils").inherits(o,i),o.prototype.byteAt=function(a){return this.data.charCodeAt(this.zero+a)},o.prototype.lastIndexOfSignature=function(a){return this.data.lastIndexOf(a)-this.zero},o.prototype.readAndCheckSignature=function(a){return a===this.readData(4)},o.prototype.readData=function(a){this.checkOffset(a);var l=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./DataReader":18}],21:[function(n,r,s){var i=n("./ArrayReader");function o(a){i.call(this,a)}n("../utils").inherits(o,i),o.prototype.readData=function(a){if(this.checkOffset(a),a===0)return new Uint8Array(0);var l=this.data.subarray(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./ArrayReader":17}],22:[function(n,r,s){var i=n("../utils"),o=n("../support"),a=n("./ArrayReader"),l=n("./StringReader"),c=n("./NodeBufferReader"),u=n("./Uint8ArrayReader");r.exports=function(d){var h=i.getTypeOf(d);return i.checkSupport(h),h!=="string"||o.uint8array?h==="nodebuffer"?new c(d):o.uint8array?new u(i.transformTo("uint8array",d)):new a(i.transformTo("array",d)):new l(d)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(n,r,s){s.LOCAL_FILE_HEADER="PK",s.CENTRAL_FILE_HEADER="PK",s.CENTRAL_DIRECTORY_END="PK",s.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK\x07",s.ZIP64_CENTRAL_DIRECTORY_END="PK",s.DATA_DESCRIPTOR="PK\x07\b"},{}],24:[function(n,r,s){var i=n("./GenericWorker"),o=n("../utils");function a(l){i.call(this,"ConvertWorker to "+l),this.destType=l}o.inherits(a,i),a.prototype.processChunk=function(l){this.push({data:o.transformTo(this.destType,l.data),meta:l.meta})},r.exports=a},{"../utils":32,"./GenericWorker":28}],25:[function(n,r,s){var i=n("./GenericWorker"),o=n("../crc32");function a(){i.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}n("../utils").inherits(a,i),a.prototype.processChunk=function(l){this.streamInfo.crc32=o(l.data,this.streamInfo.crc32||0),this.push(l)},r.exports=a},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(n,r,s){var i=n("../utils"),o=n("./GenericWorker");function a(l){o.call(this,"DataLengthProbe for "+l),this.propName=l,this.withStreamInfo(l,0)}i.inherits(a,o),a.prototype.processChunk=function(l){if(l){var c=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=c+l.data.length}o.prototype.processChunk.call(this,l)},r.exports=a},{"../utils":32,"./GenericWorker":28}],27:[function(n,r,s){var i=n("../utils"),o=n("./GenericWorker");function a(l){o.call(this,"DataWorker");var c=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,l.then(function(u){c.dataIsReady=!0,c.data=u,c.max=u&&u.length||0,c.type=i.getTypeOf(u),c.isPaused||c._tickAndRepeat()},function(u){c.error(u)})}i.inherits(a,o),a.prototype.cleanUp=function(){o.prototype.cleanUp.call(this),this.data=null},a.prototype.resume=function(){return!!o.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,i.delay(this._tickAndRepeat,[],this)),!0)},a.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(i.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},a.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var l=null,c=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":l=this.data.substring(this.index,c);break;case"uint8array":l=this.data.subarray(this.index,c);break;case"array":case"nodebuffer":l=this.data.slice(this.index,c)}return this.index=c,this.push({data:l,meta:{percent:this.max?this.index/this.max*100:0}})},r.exports=a},{"../utils":32,"./GenericWorker":28}],28:[function(n,r,s){function i(o){this.name=o||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}i.prototype={push:function(o){this.emit("data",o)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(o){this.emit("error",o)}return!0},error:function(o){return!this.isFinished&&(this.isPaused?this.generatedError=o:(this.isFinished=!0,this.emit("error",o),this.previous&&this.previous.error(o),this.cleanUp()),!0)},on:function(o,a){return this._listeners[o].push(a),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(o,a){if(this._listeners[o])for(var l=0;l<this._listeners[o].length;l++)this._listeners[o][l].call(this,a)},pipe:function(o){return o.registerPrevious(this)},registerPrevious:function(o){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=o.streamInfo,this.mergeStreamInfo(),this.previous=o;var a=this;return o.on("data",function(l){a.processChunk(l)}),o.on("end",function(){a.end()}),o.on("error",function(l){a.error(l)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var o=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),o=!0),this.previous&&this.previous.resume(),!o},flush:function(){},processChunk:function(o){this.push(o)},withStreamInfo:function(o,a){return this.extraStreamInfo[o]=a,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var o in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,o)&&(this.streamInfo[o]=this.extraStreamInfo[o])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var o="Worker "+this.name;return this.previous?this.previous+" -> "+o:o}},r.exports=i},{}],29:[function(n,r,s){var i=n("../utils"),o=n("./ConvertWorker"),a=n("./GenericWorker"),l=n("../base64"),c=n("../support"),u=n("../external"),d=null;if(c.nodestream)try{d=n("../nodejs/NodejsStreamOutputAdapter")}catch{}function h(m,p){return new u.Promise(function(y,g){var b=[],v=m._internalType,x=m._outputType,k=m._mimeType;m.on("data",function(C,E){b.push(C),p&&p(E)}).on("error",function(C){b=[],g(C)}).on("end",function(){try{var C=(function(E,T,A){switch(E){case"blob":return i.newBlob(i.transformTo("arraybuffer",T),A);case"base64":return l.encode(T);default:return i.transformTo(E,T)}})(x,(function(E,T){var A,M=0,O=null,S=0;for(A=0;A<T.length;A++)S+=T[A].length;switch(E){case"string":return T.join("");case"array":return Array.prototype.concat.apply([],T);case"uint8array":for(O=new Uint8Array(S),A=0;A<T.length;A++)O.set(T[A],M),M+=T[A].length;return O;case"nodebuffer":return Buffer.concat(T);default:throw new Error("concat : unsupported type '"+E+"'")}})(v,b),k);y(C)}catch(E){g(E)}b=[]}).resume()})}function f(m,p,y){var g=p;switch(p){case"blob":case"arraybuffer":g="uint8array";break;case"base64":g="string"}try{this._internalType=g,this._outputType=p,this._mimeType=y,i.checkSupport(g),this._worker=m.pipe(new o(g)),m.lock()}catch(b){this._worker=new a("error"),this._worker.error(b)}}f.prototype={accumulate:function(m){return h(this,m)},on:function(m,p){var y=this;return m==="data"?this._worker.on(m,function(g){p.call(y,g.data,g.meta)}):this._worker.on(m,function(){i.delay(p,arguments,y)}),this},resume:function(){return i.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(m){if(i.checkSupport("nodestream"),this._outputType!=="nodebuffer")throw new Error(this._outputType+" is not supported by this method");return new d(this,{objectMode:this._outputType!=="nodebuffer"},m)}},r.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(n,r,s){if(s.base64=!0,s.array=!0,s.string=!0,s.arraybuffer=typeof ArrayBuffer<"u"&&typeof Uint8Array<"u",s.nodebuffer=typeof Buffer<"u",s.uint8array=typeof Uint8Array<"u",typeof ArrayBuffer>"u")s.blob=!1;else{var i=new ArrayBuffer(0);try{s.blob=new Blob([i],{type:"application/zip"}).size===0}catch{try{var o=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);o.append(i),s.blob=o.getBlob("application/zip").size===0}catch{s.blob=!1}}}try{s.nodestream=!!n("readable-stream").Readable}catch{s.nodestream=!1}},{"readable-stream":16}],31:[function(n,r,s){for(var i=n("./utils"),o=n("./support"),a=n("./nodejsUtils"),l=n("./stream/GenericWorker"),c=new Array(256),u=0;u<256;u++)c[u]=252<=u?6:248<=u?5:240<=u?4:224<=u?3:192<=u?2:1;c[254]=c[254]=1;function d(){l.call(this,"utf-8 decode"),this.leftOver=null}function h(){l.call(this,"utf-8 encode")}s.utf8encode=function(f){return o.nodebuffer?a.newBufferFrom(f,"utf-8"):(function(m){var p,y,g,b,v,x=m.length,k=0;for(b=0;b<x;b++)(64512&(y=m.charCodeAt(b)))==55296&&b+1<x&&(64512&(g=m.charCodeAt(b+1)))==56320&&(y=65536+(y-55296<<10)+(g-56320),b++),k+=y<128?1:y<2048?2:y<65536?3:4;for(p=o.uint8array?new Uint8Array(k):new Array(k),b=v=0;v<k;b++)(64512&(y=m.charCodeAt(b)))==55296&&b+1<x&&(64512&(g=m.charCodeAt(b+1)))==56320&&(y=65536+(y-55296<<10)+(g-56320),b++),y<128?p[v++]=y:(y<2048?p[v++]=192|y>>>6:(y<65536?p[v++]=224|y>>>12:(p[v++]=240|y>>>18,p[v++]=128|y>>>12&63),p[v++]=128|y>>>6&63),p[v++]=128|63&y);return p})(f)},s.utf8decode=function(f){return o.nodebuffer?i.transformTo("nodebuffer",f).toString("utf-8"):(function(m){var p,y,g,b,v=m.length,x=new Array(2*v);for(p=y=0;p<v;)if((g=m[p++])<128)x[y++]=g;else if(4<(b=c[g]))x[y++]=65533,p+=b-1;else{for(g&=b===2?31:b===3?15:7;1<b&&p<v;)g=g<<6|63&m[p++],b--;1<b?x[y++]=65533:g<65536?x[y++]=g:(g-=65536,x[y++]=55296|g>>10&1023,x[y++]=56320|1023&g)}return x.length!==y&&(x.subarray?x=x.subarray(0,y):x.length=y),i.applyFromCharCode(x)})(f=i.transformTo(o.uint8array?"uint8array":"array",f))},i.inherits(d,l),d.prototype.processChunk=function(f){var m=i.transformTo(o.uint8array?"uint8array":"array",f.data);if(this.leftOver&&this.leftOver.length){if(o.uint8array){var p=m;(m=new Uint8Array(p.length+this.leftOver.length)).set(this.leftOver,0),m.set(p,this.leftOver.length)}else m=this.leftOver.concat(m);this.leftOver=null}var y=(function(b,v){var x;for((v=v||b.length)>b.length&&(v=b.length),x=v-1;0<=x&&(192&b[x])==128;)x--;return x<0||x===0?v:x+c[b[x]]>v?x:v})(m),g=m;y!==m.length&&(o.uint8array?(g=m.subarray(0,y),this.leftOver=m.subarray(y,m.length)):(g=m.slice(0,y),this.leftOver=m.slice(y,m.length))),this.push({data:s.utf8decode(g),meta:f.meta})},d.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=d,i.inherits(h,l),h.prototype.processChunk=function(f){this.push({data:s.utf8encode(f.data),meta:f.meta})},s.Utf8EncodeWorker=h},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(n,r,s){var i=n("./support"),o=n("./base64"),a=n("./nodejsUtils"),l=n("./external");function c(p){return p}function u(p,y){for(var g=0;g<p.length;++g)y[g]=255&p.charCodeAt(g);return y}n("setimmediate"),s.newBlob=function(p,y){s.checkSupport("blob");try{return new Blob([p],{type:y})}catch{try{var g=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return g.append(p),g.getBlob(y)}catch{throw new Error("Bug : can't construct the Blob.")}}};var d={stringifyByChunk:function(p,y,g){var b=[],v=0,x=p.length;if(x<=g)return String.fromCharCode.apply(null,p);for(;v<x;)y==="array"||y==="nodebuffer"?b.push(String.fromCharCode.apply(null,p.slice(v,Math.min(v+g,x)))):b.push(String.fromCharCode.apply(null,p.subarray(v,Math.min(v+g,x)))),v+=g;return b.join("")},stringifyByChar:function(p){for(var y="",g=0;g<p.length;g++)y+=String.fromCharCode(p[g]);return y},applyCanBeUsed:{uint8array:(function(){try{return i.uint8array&&String.fromCharCode.apply(null,new Uint8Array(1)).length===1}catch{return!1}})(),nodebuffer:(function(){try{return i.nodebuffer&&String.fromCharCode.apply(null,a.allocBuffer(1)).length===1}catch{return!1}})()}};function h(p){var y=65536,g=s.getTypeOf(p),b=!0;if(g==="uint8array"?b=d.applyCanBeUsed.uint8array:g==="nodebuffer"&&(b=d.applyCanBeUsed.nodebuffer),b)for(;1<y;)try{return d.stringifyByChunk(p,g,y)}catch{y=Math.floor(y/2)}return d.stringifyByChar(p)}function f(p,y){for(var g=0;g<p.length;g++)y[g]=p[g];return y}s.applyFromCharCode=h;var m={};m.string={string:c,array:function(p){return u(p,new Array(p.length))},arraybuffer:function(p){return m.string.uint8array(p).buffer},uint8array:function(p){return u(p,new Uint8Array(p.length))},nodebuffer:function(p){return u(p,a.allocBuffer(p.length))}},m.array={string:h,array:c,arraybuffer:function(p){return new Uint8Array(p).buffer},uint8array:function(p){return new Uint8Array(p)},nodebuffer:function(p){return a.newBufferFrom(p)}},m.arraybuffer={string:function(p){return h(new Uint8Array(p))},array:function(p){return f(new Uint8Array(p),new Array(p.byteLength))},arraybuffer:c,uint8array:function(p){return new Uint8Array(p)},nodebuffer:function(p){return a.newBufferFrom(new Uint8Array(p))}},m.uint8array={string:h,array:function(p){return f(p,new Array(p.length))},arraybuffer:function(p){return p.buffer},uint8array:c,nodebuffer:function(p){return a.newBufferFrom(p)}},m.nodebuffer={string:h,array:function(p){return f(p,new Array(p.length))},arraybuffer:function(p){return m.nodebuffer.uint8array(p).buffer},uint8array:function(p){return f(p,new Uint8Array(p.length))},nodebuffer:c},s.transformTo=function(p,y){if(y=y||"",!p)return y;s.checkSupport(p);var g=s.getTypeOf(y);return m[g][p](y)},s.resolve=function(p){for(var y=p.split("/"),g=[],b=0;b<y.length;b++){var v=y[b];v==="."||v===""&&b!==0&&b!==y.length-1||(v===".."?g.pop():g.push(v))}return g.join("/")},s.getTypeOf=function(p){return typeof p=="string"?"string":Object.prototype.toString.call(p)==="[object Array]"?"array":i.nodebuffer&&a.isBuffer(p)?"nodebuffer":i.uint8array&&p instanceof Uint8Array?"uint8array":i.arraybuffer&&p instanceof ArrayBuffer?"arraybuffer":void 0},s.checkSupport=function(p){if(!i[p.toLowerCase()])throw new Error(p+" is not supported by this platform")},s.MAX_VALUE_16BITS=65535,s.MAX_VALUE_32BITS=-1,s.pretty=function(p){var y,g,b="";for(g=0;g<(p||"").length;g++)b+="\\x"+((y=p.charCodeAt(g))<16?"0":"")+y.toString(16).toUpperCase();return b},s.delay=function(p,y,g){setImmediate(function(){p.apply(g||null,y||[])})},s.inherits=function(p,y){function g(){}g.prototype=y.prototype,p.prototype=new g},s.extend=function(){var p,y,g={};for(p=0;p<arguments.length;p++)for(y in arguments[p])Object.prototype.hasOwnProperty.call(arguments[p],y)&&g[y]===void 0&&(g[y]=arguments[p][y]);return g},s.prepareContent=function(p,y,g,b,v){return l.Promise.resolve(y).then(function(x){return i.blob&&(x instanceof Blob||["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(x))!==-1)&&typeof FileReader<"u"?new l.Promise(function(k,C){var E=new FileReader;E.onload=function(T){k(T.target.result)},E.onerror=function(T){C(T.target.error)},E.readAsArrayBuffer(x)}):x}).then(function(x){var k=s.getTypeOf(x);return k?(k==="arraybuffer"?x=s.transformTo("uint8array",x):k==="string"&&(v?x=o.decode(x):g&&b!==!0&&(x=(function(C){return u(C,i.uint8array?new Uint8Array(C.length):new Array(C.length))})(x))),x):l.Promise.reject(new Error("Can't read the data of '"+p+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(n,r,s){var i=n("./reader/readerFor"),o=n("./utils"),a=n("./signature"),l=n("./zipEntry"),c=n("./support");function u(d){this.files=[],this.loadOptions=d}u.prototype={checkSignature:function(d){if(!this.reader.readAndCheckSignature(d)){this.reader.index-=4;var h=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+o.pretty(h)+", expected "+o.pretty(d)+")")}},isSignature:function(d,h){var f=this.reader.index;this.reader.setIndex(d);var m=this.reader.readString(4)===h;return this.reader.setIndex(f),m},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var d=this.reader.readData(this.zipCommentLength),h=c.uint8array?"uint8array":"array",f=o.transformTo(h,d);this.zipComment=this.loadOptions.decodeFileName(f)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var d,h,f,m=this.zip64EndOfCentralSize-44;0<m;)d=this.reader.readInt(2),h=this.reader.readInt(4),f=this.reader.readData(h),this.zip64ExtensibleData[d]={id:d,length:h,value:f}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var d,h;for(d=0;d<this.files.length;d++)h=this.files[d],this.reader.setIndex(h.localHeaderOffset),this.checkSignature(a.LOCAL_FILE_HEADER),h.readLocalPart(this.reader),h.handleUTF8(),h.processAttributes()},readCentralDir:function(){var d;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER);)(d=new l({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(d);if(this.centralDirRecords!==this.files.length&&this.centralDirRecords!==0&&this.files.length===0)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var d=this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);if(d<0)throw this.isSignature(0,a.LOCAL_FILE_HEADER)?new Error("Corrupted zip: can't find end of central directory"):new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");this.reader.setIndex(d);var h=d;if(this.checkSignature(a.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===o.MAX_VALUE_16BITS||this.diskWithCentralDirStart===o.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===o.MAX_VALUE_16BITS||this.centralDirRecords===o.MAX_VALUE_16BITS||this.centralDirSize===o.MAX_VALUE_32BITS||this.centralDirOffset===o.MAX_VALUE_32BITS){if(this.zip64=!0,(d=this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(d),this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,a.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var f=this.centralDirOffset+this.centralDirSize;this.zip64&&(f+=20,f+=12+this.zip64EndOfCentralSize);var m=h-f;if(0<m)this.isSignature(h,a.CENTRAL_FILE_HEADER)||(this.reader.zero=m);else if(m<0)throw new Error("Corrupted zip: missing "+Math.abs(m)+" bytes.")},prepareReader:function(d){this.reader=i(d)},load:function(d){this.prepareReader(d),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},r.exports=u},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(n,r,s){var i=n("./reader/readerFor"),o=n("./utils"),a=n("./compressedObject"),l=n("./crc32"),c=n("./utf8"),u=n("./compressions"),d=n("./support");function h(f,m){this.options=f,this.loadOptions=m}h.prototype={isEncrypted:function(){return(1&this.bitFlag)==1},useUTF8:function(){return(2048&this.bitFlag)==2048},readLocalPart:function(f){var m,p;if(f.skip(22),this.fileNameLength=f.readInt(2),p=f.readInt(2),this.fileName=f.readData(this.fileNameLength),f.skip(p),this.compressedSize===-1||this.uncompressedSize===-1)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if((m=(function(y){for(var g in u)if(Object.prototype.hasOwnProperty.call(u,g)&&u[g].magic===y)return u[g];return null})(this.compressionMethod))===null)throw new Error("Corrupted zip : compression "+o.pretty(this.compressionMethod)+" unknown (inner file : "+o.transformTo("string",this.fileName)+")");this.decompressed=new a(this.compressedSize,this.uncompressedSize,this.crc32,m,f.readData(this.compressedSize))},readCentralPart:function(f){this.versionMadeBy=f.readInt(2),f.skip(2),this.bitFlag=f.readInt(2),this.compressionMethod=f.readString(2),this.date=f.readDate(),this.crc32=f.readInt(4),this.compressedSize=f.readInt(4),this.uncompressedSize=f.readInt(4);var m=f.readInt(2);if(this.extraFieldsLength=f.readInt(2),this.fileCommentLength=f.readInt(2),this.diskNumberStart=f.readInt(2),this.internalFileAttributes=f.readInt(2),this.externalFileAttributes=f.readInt(4),this.localHeaderOffset=f.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");f.skip(m),this.readExtraFields(f),this.parseZIP64ExtraField(f),this.fileComment=f.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var f=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),f==0&&(this.dosPermissions=63&this.externalFileAttributes),f==3&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||this.fileNameStr.slice(-1)!=="/"||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var f=i(this.extraFields[1].value);this.uncompressedSize===o.MAX_VALUE_32BITS&&(this.uncompressedSize=f.readInt(8)),this.compressedSize===o.MAX_VALUE_32BITS&&(this.compressedSize=f.readInt(8)),this.localHeaderOffset===o.MAX_VALUE_32BITS&&(this.localHeaderOffset=f.readInt(8)),this.diskNumberStart===o.MAX_VALUE_32BITS&&(this.diskNumberStart=f.readInt(4))}},readExtraFields:function(f){var m,p,y,g=f.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});f.index+4<g;)m=f.readInt(2),p=f.readInt(2),y=f.readData(p),this.extraFields[m]={id:m,length:p,value:y};f.setIndex(g)},handleUTF8:function(){var f=d.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=c.utf8decode(this.fileName),this.fileCommentStr=c.utf8decode(this.fileComment);else{var m=this.findExtraFieldUnicodePath();if(m!==null)this.fileNameStr=m;else{var p=o.transformTo(f,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(p)}var y=this.findExtraFieldUnicodeComment();if(y!==null)this.fileCommentStr=y;else{var g=o.transformTo(f,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(g)}}},findExtraFieldUnicodePath:function(){var f=this.extraFields[28789];if(f){var m=i(f.value);return m.readInt(1)!==1||l(this.fileName)!==m.readInt(4)?null:c.utf8decode(m.readData(f.length-5))}return null},findExtraFieldUnicodeComment:function(){var f=this.extraFields[25461];if(f){var m=i(f.value);return m.readInt(1)!==1||l(this.fileComment)!==m.readInt(4)?null:c.utf8decode(m.readData(f.length-5))}return null}},r.exports=h},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(n,r,s){function i(m,p,y){this.name=m,this.dir=y.dir,this.date=y.date,this.comment=y.comment,this.unixPermissions=y.unixPermissions,this.dosPermissions=y.dosPermissions,this._data=p,this._dataBinary=y.binary,this.options={compression:y.compression,compressionOptions:y.compressionOptions}}var o=n("./stream/StreamHelper"),a=n("./stream/DataWorker"),l=n("./utf8"),c=n("./compressedObject"),u=n("./stream/GenericWorker");i.prototype={internalStream:function(m){var p=null,y="string";try{if(!m)throw new Error("No output type specified.");var g=(y=m.toLowerCase())==="string"||y==="text";y!=="binarystring"&&y!=="text"||(y="string"),p=this._decompressWorker();var b=!this._dataBinary;b&&!g&&(p=p.pipe(new l.Utf8EncodeWorker)),!b&&g&&(p=p.pipe(new l.Utf8DecodeWorker))}catch(v){(p=new u("error")).error(v)}return new o(p,y,"")},async:function(m,p){return this.internalStream(m).accumulate(p)},nodeStream:function(m,p){return this.internalStream(m||"nodebuffer").toNodejsStream(p)},_compressWorker:function(m,p){if(this._data instanceof c&&this._data.compression.magic===m.magic)return this._data.getCompressedWorker();var y=this._decompressWorker();return this._dataBinary||(y=y.pipe(new l.Utf8EncodeWorker)),c.createWorkerFrom(y,m,p)},_decompressWorker:function(){return this._data instanceof c?this._data.getContentWorker():this._data instanceof u?this._data:new a(this._data)}};for(var d=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],h=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<d.length;f++)i.prototype[d[f]]=h;r.exports=i},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(n,r,s){(function(i){var o,a,l=i.MutationObserver||i.WebKitMutationObserver;if(l){var c=0,u=new l(m),d=i.document.createTextNode("");u.observe(d,{characterData:!0}),o=function(){d.data=c=++c%2}}else if(i.setImmediate||i.MessageChannel===void 0)o="document"in i&&"onreadystatechange"in i.document.createElement("script")?function(){var p=i.document.createElement("script");p.onreadystatechange=function(){m(),p.onreadystatechange=null,p.parentNode.removeChild(p),p=null},i.document.documentElement.appendChild(p)}:function(){setTimeout(m,0)};else{var h=new i.MessageChannel;h.port1.onmessage=m,o=function(){h.port2.postMessage(0)}}var f=[];function m(){var p,y;a=!0;for(var g=f.length;g;){for(y=f,f=[],p=-1;++p<g;)y[p]();g=f.length}a=!1}r.exports=function(p){f.push(p)!==1||a||o()}}).call(this,typeof ia<"u"?ia:typeof self<"u"?self:typeof window<"u"?window:{})},{}],37:[function(n,r,s){var i=n("immediate");function o(){}var a={},l=["REJECTED"],c=["FULFILLED"],u=["PENDING"];function d(g){if(typeof g!="function")throw new TypeError("resolver must be a function");this.state=u,this.queue=[],this.outcome=void 0,g!==o&&p(this,g)}function h(g,b,v){this.promise=g,typeof b=="function"&&(this.onFulfilled=b,this.callFulfilled=this.otherCallFulfilled),typeof v=="function"&&(this.onRejected=v,this.callRejected=this.otherCallRejected)}function f(g,b,v){i(function(){var x;try{x=b(v)}catch(k){return a.reject(g,k)}x===g?a.reject(g,new TypeError("Cannot resolve promise with itself")):a.resolve(g,x)})}function m(g){var b=g&&g.then;if(g&&(typeof g=="object"||typeof g=="function")&&typeof b=="function")return function(){b.apply(g,arguments)}}function p(g,b){var v=!1;function x(E){v||(v=!0,a.reject(g,E))}function k(E){v||(v=!0,a.resolve(g,E))}var C=y(function(){b(k,x)});C.status==="error"&&x(C.value)}function y(g,b){var v={};try{v.value=g(b),v.status="success"}catch(x){v.status="error",v.value=x}return v}(r.exports=d).prototype.finally=function(g){if(typeof g!="function")return this;var b=this.constructor;return this.then(function(v){return b.resolve(g()).then(function(){return v})},function(v){return b.resolve(g()).then(function(){throw v})})},d.prototype.catch=function(g){return this.then(null,g)},d.prototype.then=function(g,b){if(typeof g!="function"&&this.state===c||typeof b!="function"&&this.state===l)return this;var v=new this.constructor(o);return this.state!==u?f(v,this.state===c?g:b,this.outcome):this.queue.push(new h(v,g,b)),v},h.prototype.callFulfilled=function(g){a.resolve(this.promise,g)},h.prototype.otherCallFulfilled=function(g){f(this.promise,this.onFulfilled,g)},h.prototype.callRejected=function(g){a.reject(this.promise,g)},h.prototype.otherCallRejected=function(g){f(this.promise,this.onRejected,g)},a.resolve=function(g,b){var v=y(m,b);if(v.status==="error")return a.reject(g,v.value);var x=v.value;if(x)p(g,x);else{g.state=c,g.outcome=b;for(var k=-1,C=g.queue.length;++k<C;)g.queue[k].callFulfilled(b)}return g},a.reject=function(g,b){g.state=l,g.outcome=b;for(var v=-1,x=g.queue.length;++v<x;)g.queue[v].callRejected(b);return g},d.resolve=function(g){return g instanceof this?g:a.resolve(new this(o),g)},d.reject=function(g){var b=new this(o);return a.reject(b,g)},d.all=function(g){var b=this;if(Object.prototype.toString.call(g)!=="[object Array]")return this.reject(new TypeError("must be an array"));var v=g.length,x=!1;if(!v)return this.resolve([]);for(var k=new Array(v),C=0,E=-1,T=new this(o);++E<v;)A(g[E],E);return T;function A(M,O){b.resolve(M).then(function(S){k[O]=S,++C!==v||x||(x=!0,a.resolve(T,k))},function(S){x||(x=!0,a.reject(T,S))})}},d.race=function(g){var b=this;if(Object.prototype.toString.call(g)!=="[object Array]")return this.reject(new TypeError("must be an array"));var v=g.length,x=!1;if(!v)return this.resolve([]);for(var k=-1,C=new this(o);++k<v;)E=g[k],b.resolve(E).then(function(T){x||(x=!0,a.resolve(C,T))},function(T){x||(x=!0,a.reject(C,T))});var E;return C}},{immediate:36}],38:[function(n,r,s){var i={};(0,n("./lib/utils/common").assign)(i,n("./lib/deflate"),n("./lib/inflate"),n("./lib/zlib/constants")),r.exports=i},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(n,r,s){var i=n("./zlib/deflate"),o=n("./utils/common"),a=n("./utils/strings"),l=n("./zlib/messages"),c=n("./zlib/zstream"),u=Object.prototype.toString,d=0,h=-1,f=0,m=8;function p(g){if(!(this instanceof p))return new p(g);this.options=o.assign({level:h,method:m,chunkSize:16384,windowBits:15,memLevel:8,strategy:f,to:""},g||{});var b=this.options;b.raw&&0<b.windowBits?b.windowBits=-b.windowBits:b.gzip&&0<b.windowBits&&b.windowBits<16&&(b.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new c,this.strm.avail_out=0;var v=i.deflateInit2(this.strm,b.level,b.method,b.windowBits,b.memLevel,b.strategy);if(v!==d)throw new Error(l[v]);if(b.header&&i.deflateSetHeader(this.strm,b.header),b.dictionary){var x;if(x=typeof b.dictionary=="string"?a.string2buf(b.dictionary):u.call(b.dictionary)==="[object ArrayBuffer]"?new Uint8Array(b.dictionary):b.dictionary,(v=i.deflateSetDictionary(this.strm,x))!==d)throw new Error(l[v]);this._dict_set=!0}}function y(g,b){var v=new p(b);if(v.push(g,!0),v.err)throw v.msg||l[v.err];return v.result}p.prototype.push=function(g,b){var v,x,k=this.strm,C=this.options.chunkSize;if(this.ended)return!1;x=b===~~b?b:b===!0?4:0,typeof g=="string"?k.input=a.string2buf(g):u.call(g)==="[object ArrayBuffer]"?k.input=new Uint8Array(g):k.input=g,k.next_in=0,k.avail_in=k.input.length;do{if(k.avail_out===0&&(k.output=new o.Buf8(C),k.next_out=0,k.avail_out=C),(v=i.deflate(k,x))!==1&&v!==d)return this.onEnd(v),!(this.ended=!0);k.avail_out!==0&&(k.avail_in!==0||x!==4&&x!==2)||(this.options.to==="string"?this.onData(a.buf2binstring(o.shrinkBuf(k.output,k.next_out))):this.onData(o.shrinkBuf(k.output,k.next_out)))}while((0<k.avail_in||k.avail_out===0)&&v!==1);return x===4?(v=i.deflateEnd(this.strm),this.onEnd(v),this.ended=!0,v===d):x!==2||(this.onEnd(d),!(k.avail_out=0))},p.prototype.onData=function(g){this.chunks.push(g)},p.prototype.onEnd=function(g){g===d&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=g,this.msg=this.strm.msg},s.Deflate=p,s.deflate=y,s.deflateRaw=function(g,b){return(b=b||{}).raw=!0,y(g,b)},s.gzip=function(g,b){return(b=b||{}).gzip=!0,y(g,b)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(n,r,s){var i=n("./zlib/inflate"),o=n("./utils/common"),a=n("./utils/strings"),l=n("./zlib/constants"),c=n("./zlib/messages"),u=n("./zlib/zstream"),d=n("./zlib/gzheader"),h=Object.prototype.toString;function f(p){if(!(this instanceof f))return new f(p);this.options=o.assign({chunkSize:16384,windowBits:0,to:""},p||{});var y=this.options;y.raw&&0<=y.windowBits&&y.windowBits<16&&(y.windowBits=-y.windowBits,y.windowBits===0&&(y.windowBits=-15)),!(0<=y.windowBits&&y.windowBits<16)||p&&p.windowBits||(y.windowBits+=32),15<y.windowBits&&y.windowBits<48&&(15&y.windowBits)==0&&(y.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new u,this.strm.avail_out=0;var g=i.inflateInit2(this.strm,y.windowBits);if(g!==l.Z_OK)throw new Error(c[g]);this.header=new d,i.inflateGetHeader(this.strm,this.header)}function m(p,y){var g=new f(y);if(g.push(p,!0),g.err)throw g.msg||c[g.err];return g.result}f.prototype.push=function(p,y){var g,b,v,x,k,C,E=this.strm,T=this.options.chunkSize,A=this.options.dictionary,M=!1;if(this.ended)return!1;b=y===~~y?y:y===!0?l.Z_FINISH:l.Z_NO_FLUSH,typeof p=="string"?E.input=a.binstring2buf(p):h.call(p)==="[object ArrayBuffer]"?E.input=new Uint8Array(p):E.input=p,E.next_in=0,E.avail_in=E.input.length;do{if(E.avail_out===0&&(E.output=new o.Buf8(T),E.next_out=0,E.avail_out=T),(g=i.inflate(E,l.Z_NO_FLUSH))===l.Z_NEED_DICT&&A&&(C=typeof A=="string"?a.string2buf(A):h.call(A)==="[object ArrayBuffer]"?new Uint8Array(A):A,g=i.inflateSetDictionary(this.strm,C)),g===l.Z_BUF_ERROR&&M===!0&&(g=l.Z_OK,M=!1),g!==l.Z_STREAM_END&&g!==l.Z_OK)return this.onEnd(g),!(this.ended=!0);E.next_out&&(E.avail_out!==0&&g!==l.Z_STREAM_END&&(E.avail_in!==0||b!==l.Z_FINISH&&b!==l.Z_SYNC_FLUSH)||(this.options.to==="string"?(v=a.utf8border(E.output,E.next_out),x=E.next_out-v,k=a.buf2string(E.output,v),E.next_out=x,E.avail_out=T-x,x&&o.arraySet(E.output,E.output,v,x,0),this.onData(k)):this.onData(o.shrinkBuf(E.output,E.next_out)))),E.avail_in===0&&E.avail_out===0&&(M=!0)}while((0<E.avail_in||E.avail_out===0)&&g!==l.Z_STREAM_END);return g===l.Z_STREAM_END&&(b=l.Z_FINISH),b===l.Z_FINISH?(g=i.inflateEnd(this.strm),this.onEnd(g),this.ended=!0,g===l.Z_OK):b!==l.Z_SYNC_FLUSH||(this.onEnd(l.Z_OK),!(E.avail_out=0))},f.prototype.onData=function(p){this.chunks.push(p)},f.prototype.onEnd=function(p){p===l.Z_OK&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=p,this.msg=this.strm.msg},s.Inflate=f,s.inflate=m,s.inflateRaw=function(p,y){return(y=y||{}).raw=!0,m(p,y)},s.ungzip=m},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(n,r,s){var i=typeof Uint8Array<"u"&&typeof Uint16Array<"u"&&typeof Int32Array<"u";s.assign=function(l){for(var c=Array.prototype.slice.call(arguments,1);c.length;){var u=c.shift();if(u){if(typeof u!="object")throw new TypeError(u+"must be non-object");for(var d in u)u.hasOwnProperty(d)&&(l[d]=u[d])}}return l},s.shrinkBuf=function(l,c){return l.length===c?l:l.subarray?l.subarray(0,c):(l.length=c,l)};var o={arraySet:function(l,c,u,d,h){if(c.subarray&&l.subarray)l.set(c.subarray(u,u+d),h);else for(var f=0;f<d;f++)l[h+f]=c[u+f]},flattenChunks:function(l){var c,u,d,h,f,m;for(c=d=0,u=l.length;c<u;c++)d+=l[c].length;for(m=new Uint8Array(d),c=h=0,u=l.length;c<u;c++)f=l[c],m.set(f,h),h+=f.length;return m}},a={arraySet:function(l,c,u,d,h){for(var f=0;f<d;f++)l[h+f]=c[u+f]},flattenChunks:function(l){return[].concat.apply([],l)}};s.setTyped=function(l){l?(s.Buf8=Uint8Array,s.Buf16=Uint16Array,s.Buf32=Int32Array,s.assign(s,o)):(s.Buf8=Array,s.Buf16=Array,s.Buf32=Array,s.assign(s,a))},s.setTyped(i)},{}],42:[function(n,r,s){var i=n("./common"),o=!0,a=!0;try{String.fromCharCode.apply(null,[0])}catch{o=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch{a=!1}for(var l=new i.Buf8(256),c=0;c<256;c++)l[c]=252<=c?6:248<=c?5:240<=c?4:224<=c?3:192<=c?2:1;function u(d,h){if(h<65537&&(d.subarray&&a||!d.subarray&&o))return String.fromCharCode.apply(null,i.shrinkBuf(d,h));for(var f="",m=0;m<h;m++)f+=String.fromCharCode(d[m]);return f}l[254]=l[254]=1,s.string2buf=function(d){var h,f,m,p,y,g=d.length,b=0;for(p=0;p<g;p++)(64512&(f=d.charCodeAt(p)))==55296&&p+1<g&&(64512&(m=d.charCodeAt(p+1)))==56320&&(f=65536+(f-55296<<10)+(m-56320),p++),b+=f<128?1:f<2048?2:f<65536?3:4;for(h=new i.Buf8(b),p=y=0;y<b;p++)(64512&(f=d.charCodeAt(p)))==55296&&p+1<g&&(64512&(m=d.charCodeAt(p+1)))==56320&&(f=65536+(f-55296<<10)+(m-56320),p++),f<128?h[y++]=f:(f<2048?h[y++]=192|f>>>6:(f<65536?h[y++]=224|f>>>12:(h[y++]=240|f>>>18,h[y++]=128|f>>>12&63),h[y++]=128|f>>>6&63),h[y++]=128|63&f);return h},s.buf2binstring=function(d){return u(d,d.length)},s.binstring2buf=function(d){for(var h=new i.Buf8(d.length),f=0,m=h.length;f<m;f++)h[f]=d.charCodeAt(f);return h},s.buf2string=function(d,h){var f,m,p,y,g=h||d.length,b=new Array(2*g);for(f=m=0;f<g;)if((p=d[f++])<128)b[m++]=p;else if(4<(y=l[p]))b[m++]=65533,f+=y-1;else{for(p&=y===2?31:y===3?15:7;1<y&&f<g;)p=p<<6|63&d[f++],y--;1<y?b[m++]=65533:p<65536?b[m++]=p:(p-=65536,b[m++]=55296|p>>10&1023,b[m++]=56320|1023&p)}return u(b,m)},s.utf8border=function(d,h){var f;for((h=h||d.length)>d.length&&(h=d.length),f=h-1;0<=f&&(192&d[f])==128;)f--;return f<0||f===0?h:f+l[d[f]]>h?f:h}},{"./common":41}],43:[function(n,r,s){r.exports=function(i,o,a,l){for(var c=65535&i|0,u=i>>>16&65535|0,d=0;a!==0;){for(a-=d=2e3<a?2e3:a;u=u+(c=c+o[l++]|0)|0,--d;);c%=65521,u%=65521}return c|u<<16|0}},{}],44:[function(n,r,s){r.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(n,r,s){var i=(function(){for(var o,a=[],l=0;l<256;l++){o=l;for(var c=0;c<8;c++)o=1&o?3988292384^o>>>1:o>>>1;a[l]=o}return a})();r.exports=function(o,a,l,c){var u=i,d=c+l;o^=-1;for(var h=c;h<d;h++)o=o>>>8^u[255&(o^a[h])];return-1^o}},{}],46:[function(n,r,s){var i,o=n("../utils/common"),a=n("./trees"),l=n("./adler32"),c=n("./crc32"),u=n("./messages"),d=0,h=4,f=0,m=-2,p=-1,y=4,g=2,b=8,v=9,x=286,k=30,C=19,E=2*x+1,T=15,A=3,M=258,O=M+A+1,S=42,z=113,w=1,R=2,F=3,D=4;function Q(_,K){return _.msg=u[K],K}function H(_){return(_<<1)-(4<_?9:0)}function J(_){for(var K=_.length;0<=--K;)_[K]=0}function N(_){var K=_.state,Z=K.pending;Z>_.avail_out&&(Z=_.avail_out),Z!==0&&(o.arraySet(_.output,K.pending_buf,K.pending_out,Z,_.next_out),_.next_out+=Z,K.pending_out+=Z,_.total_out+=Z,_.avail_out-=Z,K.pending-=Z,K.pending===0&&(K.pending_out=0))}function U(_,K){a._tr_flush_block(_,0<=_.block_start?_.block_start:-1,_.strstart-_.block_start,K),_.block_start=_.strstart,N(_.strm)}function ae(_,K){_.pending_buf[_.pending++]=K}function ie(_,K){_.pending_buf[_.pending++]=K>>>8&255,_.pending_buf[_.pending++]=255&K}function q(_,K){var Z,P,I=_.max_chain_length,B=_.strstart,re=_.prev_length,se=_.nice_match,G=_.strstart>_.w_size-O?_.strstart-(_.w_size-O):0,j=_.window,he=_.w_mask,oe=_.prev,_e=_.strstart+M,Re=j[B+re-1],He=j[B+re];_.prev_length>=_.good_match&&(I>>=2),se>_.lookahead&&(se=_.lookahead);do if(j[(Z=K)+re]===He&&j[Z+re-1]===Re&&j[Z]===j[B]&&j[++Z]===j[B+1]){B+=2,Z++;do;while(j[++B]===j[++Z]&&j[++B]===j[++Z]&&j[++B]===j[++Z]&&j[++B]===j[++Z]&&j[++B]===j[++Z]&&j[++B]===j[++Z]&&j[++B]===j[++Z]&&j[++B]===j[++Z]&&B<_e);if(P=M-(_e-B),B=_e-M,re<P){if(_.match_start=K,se<=(re=P))break;Re=j[B+re-1],He=j[B+re]}}while((K=oe[K&he])>G&&--I!=0);return re<=_.lookahead?re:_.lookahead}function be(_){var K,Z,P,I,B,re,se,G,j,he,oe=_.w_size;do{if(I=_.window_size-_.lookahead-_.strstart,_.strstart>=oe+(oe-O)){for(o.arraySet(_.window,_.window,oe,oe,0),_.match_start-=oe,_.strstart-=oe,_.block_start-=oe,K=Z=_.hash_size;P=_.head[--K],_.head[K]=oe<=P?P-oe:0,--Z;);for(K=Z=oe;P=_.prev[--K],_.prev[K]=oe<=P?P-oe:0,--Z;);I+=oe}if(_.strm.avail_in===0)break;if(re=_.strm,se=_.window,G=_.strstart+_.lookahead,j=I,he=void 0,he=re.avail_in,j<he&&(he=j),Z=he===0?0:(re.avail_in-=he,o.arraySet(se,re.input,re.next_in,he,G),re.state.wrap===1?re.adler=l(re.adler,se,he,G):re.state.wrap===2&&(re.adler=c(re.adler,se,he,G)),re.next_in+=he,re.total_in+=he,he),_.lookahead+=Z,_.lookahead+_.insert>=A)for(B=_.strstart-_.insert,_.ins_h=_.window[B],_.ins_h=(_.ins_h<<_.hash_shift^_.window[B+1])&_.hash_mask;_.insert&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[B+A-1])&_.hash_mask,_.prev[B&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=B,B++,_.insert--,!(_.lookahead+_.insert<A)););}while(_.lookahead<O&&_.strm.avail_in!==0)}function De(_,K){for(var Z,P;;){if(_.lookahead<O){if(be(_),_.lookahead<O&&K===d)return w;if(_.lookahead===0)break}if(Z=0,_.lookahead>=A&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart),Z!==0&&_.strstart-Z<=_.w_size-O&&(_.match_length=q(_,Z)),_.match_length>=A)if(P=a._tr_tally(_,_.strstart-_.match_start,_.match_length-A),_.lookahead-=_.match_length,_.match_length<=_.max_lazy_match&&_.lookahead>=A){for(_.match_length--;_.strstart++,_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart,--_.match_length!=0;);_.strstart++}else _.strstart+=_.match_length,_.match_length=0,_.ins_h=_.window[_.strstart],_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+1])&_.hash_mask;else P=a._tr_tally(_,0,_.window[_.strstart]),_.lookahead--,_.strstart++;if(P&&(U(_,!1),_.strm.avail_out===0))return w}return _.insert=_.strstart<A-1?_.strstart:A-1,K===h?(U(_,!0),_.strm.avail_out===0?F:D):_.last_lit&&(U(_,!1),_.strm.avail_out===0)?w:R}function Se(_,K){for(var Z,P,I;;){if(_.lookahead<O){if(be(_),_.lookahead<O&&K===d)return w;if(_.lookahead===0)break}if(Z=0,_.lookahead>=A&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart),_.prev_length=_.match_length,_.prev_match=_.match_start,_.match_length=A-1,Z!==0&&_.prev_length<_.max_lazy_match&&_.strstart-Z<=_.w_size-O&&(_.match_length=q(_,Z),_.match_length<=5&&(_.strategy===1||_.match_length===A&&4096<_.strstart-_.match_start)&&(_.match_length=A-1)),_.prev_length>=A&&_.match_length<=_.prev_length){for(I=_.strstart+_.lookahead-A,P=a._tr_tally(_,_.strstart-1-_.prev_match,_.prev_length-A),_.lookahead-=_.prev_length-1,_.prev_length-=2;++_.strstart<=I&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart),--_.prev_length!=0;);if(_.match_available=0,_.match_length=A-1,_.strstart++,P&&(U(_,!1),_.strm.avail_out===0))return w}else if(_.match_available){if((P=a._tr_tally(_,0,_.window[_.strstart-1]))&&U(_,!1),_.strstart++,_.lookahead--,_.strm.avail_out===0)return w}else _.match_available=1,_.strstart++,_.lookahead--}return _.match_available&&(P=a._tr_tally(_,0,_.window[_.strstart-1]),_.match_available=0),_.insert=_.strstart<A-1?_.strstart:A-1,K===h?(U(_,!0),_.strm.avail_out===0?F:D):_.last_lit&&(U(_,!1),_.strm.avail_out===0)?w:R}function Me(_,K,Z,P,I){this.good_length=_,this.max_lazy=K,this.nice_length=Z,this.max_chain=P,this.func=I}function nt(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=b,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new o.Buf16(2*E),this.dyn_dtree=new o.Buf16(2*(2*k+1)),this.bl_tree=new o.Buf16(2*(2*C+1)),J(this.dyn_ltree),J(this.dyn_dtree),J(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new o.Buf16(T+1),this.heap=new o.Buf16(2*x+1),J(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new o.Buf16(2*x+1),J(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function Ne(_){var K;return _&&_.state?(_.total_in=_.total_out=0,_.data_type=g,(K=_.state).pending=0,K.pending_out=0,K.wrap<0&&(K.wrap=-K.wrap),K.status=K.wrap?S:z,_.adler=K.wrap===2?0:1,K.last_flush=d,a._tr_init(K),f):Q(_,m)}function ot(_){var K=Ne(_);return K===f&&(function(Z){Z.window_size=2*Z.w_size,J(Z.head),Z.max_lazy_match=i[Z.level].max_lazy,Z.good_match=i[Z.level].good_length,Z.nice_match=i[Z.level].nice_length,Z.max_chain_length=i[Z.level].max_chain,Z.strstart=0,Z.block_start=0,Z.lookahead=0,Z.insert=0,Z.match_length=Z.prev_length=A-1,Z.match_available=0,Z.ins_h=0})(_.state),K}function mt(_,K,Z,P,I,B){if(!_)return m;var re=1;if(K===p&&(K=6),P<0?(re=0,P=-P):15<P&&(re=2,P-=16),I<1||v<I||Z!==b||P<8||15<P||K<0||9<K||B<0||y<B)return Q(_,m);P===8&&(P=9);var se=new nt;return(_.state=se).strm=_,se.wrap=re,se.gzhead=null,se.w_bits=P,se.w_size=1<<se.w_bits,se.w_mask=se.w_size-1,se.hash_bits=I+7,se.hash_size=1<<se.hash_bits,se.hash_mask=se.hash_size-1,se.hash_shift=~~((se.hash_bits+A-1)/A),se.window=new o.Buf8(2*se.w_size),se.head=new o.Buf16(se.hash_size),se.prev=new o.Buf16(se.w_size),se.lit_bufsize=1<<I+6,se.pending_buf_size=4*se.lit_bufsize,se.pending_buf=new o.Buf8(se.pending_buf_size),se.d_buf=1*se.lit_bufsize,se.l_buf=3*se.lit_bufsize,se.level=K,se.strategy=B,se.method=Z,ot(_)}i=[new Me(0,0,0,0,function(_,K){var Z=65535;for(Z>_.pending_buf_size-5&&(Z=_.pending_buf_size-5);;){if(_.lookahead<=1){if(be(_),_.lookahead===0&&K===d)return w;if(_.lookahead===0)break}_.strstart+=_.lookahead,_.lookahead=0;var P=_.block_start+Z;if((_.strstart===0||_.strstart>=P)&&(_.lookahead=_.strstart-P,_.strstart=P,U(_,!1),_.strm.avail_out===0)||_.strstart-_.block_start>=_.w_size-O&&(U(_,!1),_.strm.avail_out===0))return w}return _.insert=0,K===h?(U(_,!0),_.strm.avail_out===0?F:D):(_.strstart>_.block_start&&(U(_,!1),_.strm.avail_out),w)}),new Me(4,4,8,4,De),new Me(4,5,16,8,De),new Me(4,6,32,32,De),new Me(4,4,16,16,Se),new Me(8,16,32,32,Se),new Me(8,16,128,128,Se),new Me(8,32,128,256,Se),new Me(32,128,258,1024,Se),new Me(32,258,258,4096,Se)],s.deflateInit=function(_,K){return mt(_,K,b,15,8,0)},s.deflateInit2=mt,s.deflateReset=ot,s.deflateResetKeep=Ne,s.deflateSetHeader=function(_,K){return _&&_.state?_.state.wrap!==2?m:(_.state.gzhead=K,f):m},s.deflate=function(_,K){var Z,P,I,B;if(!_||!_.state||5<K||K<0)return _?Q(_,m):m;if(P=_.state,!_.output||!_.input&&_.avail_in!==0||P.status===666&&K!==h)return Q(_,_.avail_out===0?-5:m);if(P.strm=_,Z=P.last_flush,P.last_flush=K,P.status===S)if(P.wrap===2)_.adler=0,ae(P,31),ae(P,139),ae(P,8),P.gzhead?(ae(P,(P.gzhead.text?1:0)+(P.gzhead.hcrc?2:0)+(P.gzhead.extra?4:0)+(P.gzhead.name?8:0)+(P.gzhead.comment?16:0)),ae(P,255&P.gzhead.time),ae(P,P.gzhead.time>>8&255),ae(P,P.gzhead.time>>16&255),ae(P,P.gzhead.time>>24&255),ae(P,P.level===9?2:2<=P.strategy||P.level<2?4:0),ae(P,255&P.gzhead.os),P.gzhead.extra&&P.gzhead.extra.length&&(ae(P,255&P.gzhead.extra.length),ae(P,P.gzhead.extra.length>>8&255)),P.gzhead.hcrc&&(_.adler=c(_.adler,P.pending_buf,P.pending,0)),P.gzindex=0,P.status=69):(ae(P,0),ae(P,0),ae(P,0),ae(P,0),ae(P,0),ae(P,P.level===9?2:2<=P.strategy||P.level<2?4:0),ae(P,3),P.status=z);else{var re=b+(P.w_bits-8<<4)<<8;re|=(2<=P.strategy||P.level<2?0:P.level<6?1:P.level===6?2:3)<<6,P.strstart!==0&&(re|=32),re+=31-re%31,P.status=z,ie(P,re),P.strstart!==0&&(ie(P,_.adler>>>16),ie(P,65535&_.adler)),_.adler=1}if(P.status===69)if(P.gzhead.extra){for(I=P.pending;P.gzindex<(65535&P.gzhead.extra.length)&&(P.pending!==P.pending_buf_size||(P.gzhead.hcrc&&P.pending>I&&(_.adler=c(_.adler,P.pending_buf,P.pending-I,I)),N(_),I=P.pending,P.pending!==P.pending_buf_size));)ae(P,255&P.gzhead.extra[P.gzindex]),P.gzindex++;P.gzhead.hcrc&&P.pending>I&&(_.adler=c(_.adler,P.pending_buf,P.pending-I,I)),P.gzindex===P.gzhead.extra.length&&(P.gzindex=0,P.status=73)}else P.status=73;if(P.status===73)if(P.gzhead.name){I=P.pending;do{if(P.pending===P.pending_buf_size&&(P.gzhead.hcrc&&P.pending>I&&(_.adler=c(_.adler,P.pending_buf,P.pending-I,I)),N(_),I=P.pending,P.pending===P.pending_buf_size)){B=1;break}B=P.gzindex<P.gzhead.name.length?255&P.gzhead.name.charCodeAt(P.gzindex++):0,ae(P,B)}while(B!==0);P.gzhead.hcrc&&P.pending>I&&(_.adler=c(_.adler,P.pending_buf,P.pending-I,I)),B===0&&(P.gzindex=0,P.status=91)}else P.status=91;if(P.status===91)if(P.gzhead.comment){I=P.pending;do{if(P.pending===P.pending_buf_size&&(P.gzhead.hcrc&&P.pending>I&&(_.adler=c(_.adler,P.pending_buf,P.pending-I,I)),N(_),I=P.pending,P.pending===P.pending_buf_size)){B=1;break}B=P.gzindex<P.gzhead.comment.length?255&P.gzhead.comment.charCodeAt(P.gzindex++):0,ae(P,B)}while(B!==0);P.gzhead.hcrc&&P.pending>I&&(_.adler=c(_.adler,P.pending_buf,P.pending-I,I)),B===0&&(P.status=103)}else P.status=103;if(P.status===103&&(P.gzhead.hcrc?(P.pending+2>P.pending_buf_size&&N(_),P.pending+2<=P.pending_buf_size&&(ae(P,255&_.adler),ae(P,_.adler>>8&255),_.adler=0,P.status=z)):P.status=z),P.pending!==0){if(N(_),_.avail_out===0)return P.last_flush=-1,f}else if(_.avail_in===0&&H(K)<=H(Z)&&K!==h)return Q(_,-5);if(P.status===666&&_.avail_in!==0)return Q(_,-5);if(_.avail_in!==0||P.lookahead!==0||K!==d&&P.status!==666){var se=P.strategy===2?(function(G,j){for(var he;;){if(G.lookahead===0&&(be(G),G.lookahead===0)){if(j===d)return w;break}if(G.match_length=0,he=a._tr_tally(G,0,G.window[G.strstart]),G.lookahead--,G.strstart++,he&&(U(G,!1),G.strm.avail_out===0))return w}return G.insert=0,j===h?(U(G,!0),G.strm.avail_out===0?F:D):G.last_lit&&(U(G,!1),G.strm.avail_out===0)?w:R})(P,K):P.strategy===3?(function(G,j){for(var he,oe,_e,Re,He=G.window;;){if(G.lookahead<=M){if(be(G),G.lookahead<=M&&j===d)return w;if(G.lookahead===0)break}if(G.match_length=0,G.lookahead>=A&&0<G.strstart&&(oe=He[_e=G.strstart-1])===He[++_e]&&oe===He[++_e]&&oe===He[++_e]){Re=G.strstart+M;do;while(oe===He[++_e]&&oe===He[++_e]&&oe===He[++_e]&&oe===He[++_e]&&oe===He[++_e]&&oe===He[++_e]&&oe===He[++_e]&&oe===He[++_e]&&_e<Re);G.match_length=M-(Re-_e),G.match_length>G.lookahead&&(G.match_length=G.lookahead)}if(G.match_length>=A?(he=a._tr_tally(G,1,G.match_length-A),G.lookahead-=G.match_length,G.strstart+=G.match_length,G.match_length=0):(he=a._tr_tally(G,0,G.window[G.strstart]),G.lookahead--,G.strstart++),he&&(U(G,!1),G.strm.avail_out===0))return w}return G.insert=0,j===h?(U(G,!0),G.strm.avail_out===0?F:D):G.last_lit&&(U(G,!1),G.strm.avail_out===0)?w:R})(P,K):i[P.level].func(P,K);if(se!==F&&se!==D||(P.status=666),se===w||se===F)return _.avail_out===0&&(P.last_flush=-1),f;if(se===R&&(K===1?a._tr_align(P):K!==5&&(a._tr_stored_block(P,0,0,!1),K===3&&(J(P.head),P.lookahead===0&&(P.strstart=0,P.block_start=0,P.insert=0))),N(_),_.avail_out===0))return P.last_flush=-1,f}return K!==h?f:P.wrap<=0?1:(P.wrap===2?(ae(P,255&_.adler),ae(P,_.adler>>8&255),ae(P,_.adler>>16&255),ae(P,_.adler>>24&255),ae(P,255&_.total_in),ae(P,_.total_in>>8&255),ae(P,_.total_in>>16&255),ae(P,_.total_in>>24&255)):(ie(P,_.adler>>>16),ie(P,65535&_.adler)),N(_),0<P.wrap&&(P.wrap=-P.wrap),P.pending!==0?f:1)},s.deflateEnd=function(_){var K;return _&&_.state?(K=_.state.status)!==S&&K!==69&&K!==73&&K!==91&&K!==103&&K!==z&&K!==666?Q(_,m):(_.state=null,K===z?Q(_,-3):f):m},s.deflateSetDictionary=function(_,K){var Z,P,I,B,re,se,G,j,he=K.length;if(!_||!_.state||(B=(Z=_.state).wrap)===2||B===1&&Z.status!==S||Z.lookahead)return m;for(B===1&&(_.adler=l(_.adler,K,he,0)),Z.wrap=0,he>=Z.w_size&&(B===0&&(J(Z.head),Z.strstart=0,Z.block_start=0,Z.insert=0),j=new o.Buf8(Z.w_size),o.arraySet(j,K,he-Z.w_size,Z.w_size,0),K=j,he=Z.w_size),re=_.avail_in,se=_.next_in,G=_.input,_.avail_in=he,_.next_in=0,_.input=K,be(Z);Z.lookahead>=A;){for(P=Z.strstart,I=Z.lookahead-(A-1);Z.ins_h=(Z.ins_h<<Z.hash_shift^Z.window[P+A-1])&Z.hash_mask,Z.prev[P&Z.w_mask]=Z.head[Z.ins_h],Z.head[Z.ins_h]=P,P++,--I;);Z.strstart=P,Z.lookahead=A-1,be(Z)}return Z.strstart+=Z.lookahead,Z.block_start=Z.strstart,Z.insert=Z.lookahead,Z.lookahead=0,Z.match_length=Z.prev_length=A-1,Z.match_available=0,_.next_in=se,_.input=G,_.avail_in=re,Z.wrap=B,f},s.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(n,r,s){r.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(n,r,s){r.exports=function(i,o){var a,l,c,u,d,h,f,m,p,y,g,b,v,x,k,C,E,T,A,M,O,S,z,w,R;a=i.state,l=i.next_in,w=i.input,c=l+(i.avail_in-5),u=i.next_out,R=i.output,d=u-(o-i.avail_out),h=u+(i.avail_out-257),f=a.dmax,m=a.wsize,p=a.whave,y=a.wnext,g=a.window,b=a.hold,v=a.bits,x=a.lencode,k=a.distcode,C=(1<<a.lenbits)-1,E=(1<<a.distbits)-1;e:do{v<15&&(b+=w[l++]<<v,v+=8,b+=w[l++]<<v,v+=8),T=x[b&C];t:for(;;){if(b>>>=A=T>>>24,v-=A,(A=T>>>16&255)===0)R[u++]=65535&T;else{if(!(16&A)){if((64&A)==0){T=x[(65535&T)+(b&(1<<A)-1)];continue t}if(32&A){a.mode=12;break e}i.msg="invalid literal/length code",a.mode=30;break e}M=65535&T,(A&=15)&&(v<A&&(b+=w[l++]<<v,v+=8),M+=b&(1<<A)-1,b>>>=A,v-=A),v<15&&(b+=w[l++]<<v,v+=8,b+=w[l++]<<v,v+=8),T=k[b&E];n:for(;;){if(b>>>=A=T>>>24,v-=A,!(16&(A=T>>>16&255))){if((64&A)==0){T=k[(65535&T)+(b&(1<<A)-1)];continue n}i.msg="invalid distance code",a.mode=30;break e}if(O=65535&T,v<(A&=15)&&(b+=w[l++]<<v,(v+=8)<A&&(b+=w[l++]<<v,v+=8)),f<(O+=b&(1<<A)-1)){i.msg="invalid distance too far back",a.mode=30;break e}if(b>>>=A,v-=A,(A=u-d)<O){if(p<(A=O-A)&&a.sane){i.msg="invalid distance too far back",a.mode=30;break e}if(z=g,(S=0)===y){if(S+=m-A,A<M){for(M-=A;R[u++]=g[S++],--A;);S=u-O,z=R}}else if(y<A){if(S+=m+y-A,(A-=y)<M){for(M-=A;R[u++]=g[S++],--A;);if(S=0,y<M){for(M-=A=y;R[u++]=g[S++],--A;);S=u-O,z=R}}}else if(S+=y-A,A<M){for(M-=A;R[u++]=g[S++],--A;);S=u-O,z=R}for(;2<M;)R[u++]=z[S++],R[u++]=z[S++],R[u++]=z[S++],M-=3;M&&(R[u++]=z[S++],1<M&&(R[u++]=z[S++]))}else{for(S=u-O;R[u++]=R[S++],R[u++]=R[S++],R[u++]=R[S++],2<(M-=3););M&&(R[u++]=R[S++],1<M&&(R[u++]=R[S++]))}break}}break}}while(l<c&&u<h);l-=M=v>>3,b&=(1<<(v-=M<<3))-1,i.next_in=l,i.next_out=u,i.avail_in=l<c?c-l+5:5-(l-c),i.avail_out=u<h?h-u+257:257-(u-h),a.hold=b,a.bits=v}},{}],49:[function(n,r,s){var i=n("../utils/common"),o=n("./adler32"),a=n("./crc32"),l=n("./inffast"),c=n("./inftrees"),u=1,d=2,h=0,f=-2,m=1,p=852,y=592;function g(S){return(S>>>24&255)+(S>>>8&65280)+((65280&S)<<8)+((255&S)<<24)}function b(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new i.Buf16(320),this.work=new i.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function v(S){var z;return S&&S.state?(z=S.state,S.total_in=S.total_out=z.total=0,S.msg="",z.wrap&&(S.adler=1&z.wrap),z.mode=m,z.last=0,z.havedict=0,z.dmax=32768,z.head=null,z.hold=0,z.bits=0,z.lencode=z.lendyn=new i.Buf32(p),z.distcode=z.distdyn=new i.Buf32(y),z.sane=1,z.back=-1,h):f}function x(S){var z;return S&&S.state?((z=S.state).wsize=0,z.whave=0,z.wnext=0,v(S)):f}function k(S,z){var w,R;return S&&S.state?(R=S.state,z<0?(w=0,z=-z):(w=1+(z>>4),z<48&&(z&=15)),z&&(z<8||15<z)?f:(R.window!==null&&R.wbits!==z&&(R.window=null),R.wrap=w,R.wbits=z,x(S))):f}function C(S,z){var w,R;return S?(R=new b,(S.state=R).window=null,(w=k(S,z))!==h&&(S.state=null),w):f}var E,T,A=!0;function M(S){if(A){var z;for(E=new i.Buf32(512),T=new i.Buf32(32),z=0;z<144;)S.lens[z++]=8;for(;z<256;)S.lens[z++]=9;for(;z<280;)S.lens[z++]=7;for(;z<288;)S.lens[z++]=8;for(c(u,S.lens,0,288,E,0,S.work,{bits:9}),z=0;z<32;)S.lens[z++]=5;c(d,S.lens,0,32,T,0,S.work,{bits:5}),A=!1}S.lencode=E,S.lenbits=9,S.distcode=T,S.distbits=5}function O(S,z,w,R){var F,D=S.state;return D.window===null&&(D.wsize=1<<D.wbits,D.wnext=0,D.whave=0,D.window=new i.Buf8(D.wsize)),R>=D.wsize?(i.arraySet(D.window,z,w-D.wsize,D.wsize,0),D.wnext=0,D.whave=D.wsize):(R<(F=D.wsize-D.wnext)&&(F=R),i.arraySet(D.window,z,w-R,F,D.wnext),(R-=F)?(i.arraySet(D.window,z,w-R,R,0),D.wnext=R,D.whave=D.wsize):(D.wnext+=F,D.wnext===D.wsize&&(D.wnext=0),D.whave<D.wsize&&(D.whave+=F))),0}s.inflateReset=x,s.inflateReset2=k,s.inflateResetKeep=v,s.inflateInit=function(S){return C(S,15)},s.inflateInit2=C,s.inflate=function(S,z){var w,R,F,D,Q,H,J,N,U,ae,ie,q,be,De,Se,Me,nt,Ne,ot,mt,_,K,Z,P,I=0,B=new i.Buf8(4),re=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!S||!S.state||!S.output||!S.input&&S.avail_in!==0)return f;(w=S.state).mode===12&&(w.mode=13),Q=S.next_out,F=S.output,J=S.avail_out,D=S.next_in,R=S.input,H=S.avail_in,N=w.hold,U=w.bits,ae=H,ie=J,K=h;e:for(;;)switch(w.mode){case m:if(w.wrap===0){w.mode=13;break}for(;U<16;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(2&w.wrap&&N===35615){B[w.check=0]=255&N,B[1]=N>>>8&255,w.check=a(w.check,B,2,0),U=N=0,w.mode=2;break}if(w.flags=0,w.head&&(w.head.done=!1),!(1&w.wrap)||(((255&N)<<8)+(N>>8))%31){S.msg="incorrect header check",w.mode=30;break}if((15&N)!=8){S.msg="unknown compression method",w.mode=30;break}if(U-=4,_=8+(15&(N>>>=4)),w.wbits===0)w.wbits=_;else if(_>w.wbits){S.msg="invalid window size",w.mode=30;break}w.dmax=1<<_,S.adler=w.check=1,w.mode=512&N?10:12,U=N=0;break;case 2:for(;U<16;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(w.flags=N,(255&w.flags)!=8){S.msg="unknown compression method",w.mode=30;break}if(57344&w.flags){S.msg="unknown header flags set",w.mode=30;break}w.head&&(w.head.text=N>>8&1),512&w.flags&&(B[0]=255&N,B[1]=N>>>8&255,w.check=a(w.check,B,2,0)),U=N=0,w.mode=3;case 3:for(;U<32;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}w.head&&(w.head.time=N),512&w.flags&&(B[0]=255&N,B[1]=N>>>8&255,B[2]=N>>>16&255,B[3]=N>>>24&255,w.check=a(w.check,B,4,0)),U=N=0,w.mode=4;case 4:for(;U<16;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}w.head&&(w.head.xflags=255&N,w.head.os=N>>8),512&w.flags&&(B[0]=255&N,B[1]=N>>>8&255,w.check=a(w.check,B,2,0)),U=N=0,w.mode=5;case 5:if(1024&w.flags){for(;U<16;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}w.length=N,w.head&&(w.head.extra_len=N),512&w.flags&&(B[0]=255&N,B[1]=N>>>8&255,w.check=a(w.check,B,2,0)),U=N=0}else w.head&&(w.head.extra=null);w.mode=6;case 6:if(1024&w.flags&&(H<(q=w.length)&&(q=H),q&&(w.head&&(_=w.head.extra_len-w.length,w.head.extra||(w.head.extra=new Array(w.head.extra_len)),i.arraySet(w.head.extra,R,D,q,_)),512&w.flags&&(w.check=a(w.check,R,q,D)),H-=q,D+=q,w.length-=q),w.length))break e;w.length=0,w.mode=7;case 7:if(2048&w.flags){if(H===0)break e;for(q=0;_=R[D+q++],w.head&&_&&w.length<65536&&(w.head.name+=String.fromCharCode(_)),_&&q<H;);if(512&w.flags&&(w.check=a(w.check,R,q,D)),H-=q,D+=q,_)break e}else w.head&&(w.head.name=null);w.length=0,w.mode=8;case 8:if(4096&w.flags){if(H===0)break e;for(q=0;_=R[D+q++],w.head&&_&&w.length<65536&&(w.head.comment+=String.fromCharCode(_)),_&&q<H;);if(512&w.flags&&(w.check=a(w.check,R,q,D)),H-=q,D+=q,_)break e}else w.head&&(w.head.comment=null);w.mode=9;case 9:if(512&w.flags){for(;U<16;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(N!==(65535&w.check)){S.msg="header crc mismatch",w.mode=30;break}U=N=0}w.head&&(w.head.hcrc=w.flags>>9&1,w.head.done=!0),S.adler=w.check=0,w.mode=12;break;case 10:for(;U<32;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}S.adler=w.check=g(N),U=N=0,w.mode=11;case 11:if(w.havedict===0)return S.next_out=Q,S.avail_out=J,S.next_in=D,S.avail_in=H,w.hold=N,w.bits=U,2;S.adler=w.check=1,w.mode=12;case 12:if(z===5||z===6)break e;case 13:if(w.last){N>>>=7&U,U-=7&U,w.mode=27;break}for(;U<3;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}switch(w.last=1&N,U-=1,3&(N>>>=1)){case 0:w.mode=14;break;case 1:if(M(w),w.mode=20,z!==6)break;N>>>=2,U-=2;break e;case 2:w.mode=17;break;case 3:S.msg="invalid block type",w.mode=30}N>>>=2,U-=2;break;case 14:for(N>>>=7&U,U-=7&U;U<32;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if((65535&N)!=(N>>>16^65535)){S.msg="invalid stored block lengths",w.mode=30;break}if(w.length=65535&N,U=N=0,w.mode=15,z===6)break e;case 15:w.mode=16;case 16:if(q=w.length){if(H<q&&(q=H),J<q&&(q=J),q===0)break e;i.arraySet(F,R,D,q,Q),H-=q,D+=q,J-=q,Q+=q,w.length-=q;break}w.mode=12;break;case 17:for(;U<14;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(w.nlen=257+(31&N),N>>>=5,U-=5,w.ndist=1+(31&N),N>>>=5,U-=5,w.ncode=4+(15&N),N>>>=4,U-=4,286<w.nlen||30<w.ndist){S.msg="too many length or distance symbols",w.mode=30;break}w.have=0,w.mode=18;case 18:for(;w.have<w.ncode;){for(;U<3;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}w.lens[re[w.have++]]=7&N,N>>>=3,U-=3}for(;w.have<19;)w.lens[re[w.have++]]=0;if(w.lencode=w.lendyn,w.lenbits=7,Z={bits:w.lenbits},K=c(0,w.lens,0,19,w.lencode,0,w.work,Z),w.lenbits=Z.bits,K){S.msg="invalid code lengths set",w.mode=30;break}w.have=0,w.mode=19;case 19:for(;w.have<w.nlen+w.ndist;){for(;Me=(I=w.lencode[N&(1<<w.lenbits)-1])>>>16&255,nt=65535&I,!((Se=I>>>24)<=U);){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(nt<16)N>>>=Se,U-=Se,w.lens[w.have++]=nt;else{if(nt===16){for(P=Se+2;U<P;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(N>>>=Se,U-=Se,w.have===0){S.msg="invalid bit length repeat",w.mode=30;break}_=w.lens[w.have-1],q=3+(3&N),N>>>=2,U-=2}else if(nt===17){for(P=Se+3;U<P;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}U-=Se,_=0,q=3+(7&(N>>>=Se)),N>>>=3,U-=3}else{for(P=Se+7;U<P;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}U-=Se,_=0,q=11+(127&(N>>>=Se)),N>>>=7,U-=7}if(w.have+q>w.nlen+w.ndist){S.msg="invalid bit length repeat",w.mode=30;break}for(;q--;)w.lens[w.have++]=_}}if(w.mode===30)break;if(w.lens[256]===0){S.msg="invalid code -- missing end-of-block",w.mode=30;break}if(w.lenbits=9,Z={bits:w.lenbits},K=c(u,w.lens,0,w.nlen,w.lencode,0,w.work,Z),w.lenbits=Z.bits,K){S.msg="invalid literal/lengths set",w.mode=30;break}if(w.distbits=6,w.distcode=w.distdyn,Z={bits:w.distbits},K=c(d,w.lens,w.nlen,w.ndist,w.distcode,0,w.work,Z),w.distbits=Z.bits,K){S.msg="invalid distances set",w.mode=30;break}if(w.mode=20,z===6)break e;case 20:w.mode=21;case 21:if(6<=H&&258<=J){S.next_out=Q,S.avail_out=J,S.next_in=D,S.avail_in=H,w.hold=N,w.bits=U,l(S,ie),Q=S.next_out,F=S.output,J=S.avail_out,D=S.next_in,R=S.input,H=S.avail_in,N=w.hold,U=w.bits,w.mode===12&&(w.back=-1);break}for(w.back=0;Me=(I=w.lencode[N&(1<<w.lenbits)-1])>>>16&255,nt=65535&I,!((Se=I>>>24)<=U);){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(Me&&(240&Me)==0){for(Ne=Se,ot=Me,mt=nt;Me=(I=w.lencode[mt+((N&(1<<Ne+ot)-1)>>Ne)])>>>16&255,nt=65535&I,!(Ne+(Se=I>>>24)<=U);){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}N>>>=Ne,U-=Ne,w.back+=Ne}if(N>>>=Se,U-=Se,w.back+=Se,w.length=nt,Me===0){w.mode=26;break}if(32&Me){w.back=-1,w.mode=12;break}if(64&Me){S.msg="invalid literal/length code",w.mode=30;break}w.extra=15&Me,w.mode=22;case 22:if(w.extra){for(P=w.extra;U<P;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}w.length+=N&(1<<w.extra)-1,N>>>=w.extra,U-=w.extra,w.back+=w.extra}w.was=w.length,w.mode=23;case 23:for(;Me=(I=w.distcode[N&(1<<w.distbits)-1])>>>16&255,nt=65535&I,!((Se=I>>>24)<=U);){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if((240&Me)==0){for(Ne=Se,ot=Me,mt=nt;Me=(I=w.distcode[mt+((N&(1<<Ne+ot)-1)>>Ne)])>>>16&255,nt=65535&I,!(Ne+(Se=I>>>24)<=U);){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}N>>>=Ne,U-=Ne,w.back+=Ne}if(N>>>=Se,U-=Se,w.back+=Se,64&Me){S.msg="invalid distance code",w.mode=30;break}w.offset=nt,w.extra=15&Me,w.mode=24;case 24:if(w.extra){for(P=w.extra;U<P;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}w.offset+=N&(1<<w.extra)-1,N>>>=w.extra,U-=w.extra,w.back+=w.extra}if(w.offset>w.dmax){S.msg="invalid distance too far back",w.mode=30;break}w.mode=25;case 25:if(J===0)break e;if(q=ie-J,w.offset>q){if((q=w.offset-q)>w.whave&&w.sane){S.msg="invalid distance too far back",w.mode=30;break}be=q>w.wnext?(q-=w.wnext,w.wsize-q):w.wnext-q,q>w.length&&(q=w.length),De=w.window}else De=F,be=Q-w.offset,q=w.length;for(J<q&&(q=J),J-=q,w.length-=q;F[Q++]=De[be++],--q;);w.length===0&&(w.mode=21);break;case 26:if(J===0)break e;F[Q++]=w.length,J--,w.mode=21;break;case 27:if(w.wrap){for(;U<32;){if(H===0)break e;H--,N|=R[D++]<<U,U+=8}if(ie-=J,S.total_out+=ie,w.total+=ie,ie&&(S.adler=w.check=w.flags?a(w.check,F,ie,Q-ie):o(w.check,F,ie,Q-ie)),ie=J,(w.flags?N:g(N))!==w.check){S.msg="incorrect data check",w.mode=30;break}U=N=0}w.mode=28;case 28:if(w.wrap&&w.flags){for(;U<32;){if(H===0)break e;H--,N+=R[D++]<<U,U+=8}if(N!==(4294967295&w.total)){S.msg="incorrect length check",w.mode=30;break}U=N=0}w.mode=29;case 29:K=1;break e;case 30:K=-3;break e;case 31:return-4;default:return f}return S.next_out=Q,S.avail_out=J,S.next_in=D,S.avail_in=H,w.hold=N,w.bits=U,(w.wsize||ie!==S.avail_out&&w.mode<30&&(w.mode<27||z!==4))&&O(S,S.output,S.next_out,ie-S.avail_out)?(w.mode=31,-4):(ae-=S.avail_in,ie-=S.avail_out,S.total_in+=ae,S.total_out+=ie,w.total+=ie,w.wrap&&ie&&(S.adler=w.check=w.flags?a(w.check,F,ie,S.next_out-ie):o(w.check,F,ie,S.next_out-ie)),S.data_type=w.bits+(w.last?64:0)+(w.mode===12?128:0)+(w.mode===20||w.mode===15?256:0),(ae==0&&ie===0||z===4)&&K===h&&(K=-5),K)},s.inflateEnd=function(S){if(!S||!S.state)return f;var z=S.state;return z.window&&(z.window=null),S.state=null,h},s.inflateGetHeader=function(S,z){var w;return S&&S.state?(2&(w=S.state).wrap)==0?f:((w.head=z).done=!1,h):f},s.inflateSetDictionary=function(S,z){var w,R=z.length;return S&&S.state?(w=S.state).wrap!==0&&w.mode!==11?f:w.mode===11&&o(1,z,R,0)!==w.check?-3:O(S,z,R,R)?(w.mode=31,-4):(w.havedict=1,h):f},s.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(n,r,s){var i=n("../utils/common"),o=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],a=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],l=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],c=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];r.exports=function(u,d,h,f,m,p,y,g){var b,v,x,k,C,E,T,A,M,O=g.bits,S=0,z=0,w=0,R=0,F=0,D=0,Q=0,H=0,J=0,N=0,U=null,ae=0,ie=new i.Buf16(16),q=new i.Buf16(16),be=null,De=0;for(S=0;S<=15;S++)ie[S]=0;for(z=0;z<f;z++)ie[d[h+z]]++;for(F=O,R=15;1<=R&&ie[R]===0;R--);if(R<F&&(F=R),R===0)return m[p++]=20971520,m[p++]=20971520,g.bits=1,0;for(w=1;w<R&&ie[w]===0;w++);for(F<w&&(F=w),S=H=1;S<=15;S++)if(H<<=1,(H-=ie[S])<0)return-1;if(0<H&&(u===0||R!==1))return-1;for(q[1]=0,S=1;S<15;S++)q[S+1]=q[S]+ie[S];for(z=0;z<f;z++)d[h+z]!==0&&(y[q[d[h+z]]++]=z);if(E=u===0?(U=be=y,19):u===1?(U=o,ae-=257,be=a,De-=257,256):(U=l,be=c,-1),S=w,C=p,Q=z=N=0,x=-1,k=(J=1<<(D=F))-1,u===1&&852<J||u===2&&592<J)return 1;for(;;){for(T=S-Q,M=y[z]<E?(A=0,y[z]):y[z]>E?(A=be[De+y[z]],U[ae+y[z]]):(A=96,0),b=1<<S-Q,w=v=1<<D;m[C+(N>>Q)+(v-=b)]=T<<24|A<<16|M|0,v!==0;);for(b=1<<S-1;N&b;)b>>=1;if(b!==0?(N&=b-1,N+=b):N=0,z++,--ie[S]==0){if(S===R)break;S=d[h+y[z]]}if(F<S&&(N&k)!==x){for(Q===0&&(Q=F),C+=w,H=1<<(D=S-Q);D+Q<R&&!((H-=ie[D+Q])<=0);)D++,H<<=1;if(J+=1<<D,u===1&&852<J||u===2&&592<J)return 1;m[x=N&k]=F<<24|D<<16|C-p|0}}return N!==0&&(m[C+N]=S-Q<<24|64<<16|0),g.bits=F,0}},{"../utils/common":41}],51:[function(n,r,s){r.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(n,r,s){var i=n("../utils/common"),o=0,a=1;function l(I){for(var B=I.length;0<=--B;)I[B]=0}var c=0,u=29,d=256,h=d+1+u,f=30,m=19,p=2*h+1,y=15,g=16,b=7,v=256,x=16,k=17,C=18,E=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],T=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],A=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],M=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],O=new Array(2*(h+2));l(O);var S=new Array(2*f);l(S);var z=new Array(512);l(z);var w=new Array(256);l(w);var R=new Array(u);l(R);var F,D,Q,H=new Array(f);function J(I,B,re,se,G){this.static_tree=I,this.extra_bits=B,this.extra_base=re,this.elems=se,this.max_length=G,this.has_stree=I&&I.length}function N(I,B){this.dyn_tree=I,this.max_code=0,this.stat_desc=B}function U(I){return I<256?z[I]:z[256+(I>>>7)]}function ae(I,B){I.pending_buf[I.pending++]=255&B,I.pending_buf[I.pending++]=B>>>8&255}function ie(I,B,re){I.bi_valid>g-re?(I.bi_buf|=B<<I.bi_valid&65535,ae(I,I.bi_buf),I.bi_buf=B>>g-I.bi_valid,I.bi_valid+=re-g):(I.bi_buf|=B<<I.bi_valid&65535,I.bi_valid+=re)}function q(I,B,re){ie(I,re[2*B],re[2*B+1])}function be(I,B){for(var re=0;re|=1&I,I>>>=1,re<<=1,0<--B;);return re>>>1}function De(I,B,re){var se,G,j=new Array(y+1),he=0;for(se=1;se<=y;se++)j[se]=he=he+re[se-1]<<1;for(G=0;G<=B;G++){var oe=I[2*G+1];oe!==0&&(I[2*G]=be(j[oe]++,oe))}}function Se(I){var B;for(B=0;B<h;B++)I.dyn_ltree[2*B]=0;for(B=0;B<f;B++)I.dyn_dtree[2*B]=0;for(B=0;B<m;B++)I.bl_tree[2*B]=0;I.dyn_ltree[2*v]=1,I.opt_len=I.static_len=0,I.last_lit=I.matches=0}function Me(I){8<I.bi_valid?ae(I,I.bi_buf):0<I.bi_valid&&(I.pending_buf[I.pending++]=I.bi_buf),I.bi_buf=0,I.bi_valid=0}function nt(I,B,re,se){var G=2*B,j=2*re;return I[G]<I[j]||I[G]===I[j]&&se[B]<=se[re]}function Ne(I,B,re){for(var se=I.heap[re],G=re<<1;G<=I.heap_len&&(G<I.heap_len&&nt(B,I.heap[G+1],I.heap[G],I.depth)&&G++,!nt(B,se,I.heap[G],I.depth));)I.heap[re]=I.heap[G],re=G,G<<=1;I.heap[re]=se}function ot(I,B,re){var se,G,j,he,oe=0;if(I.last_lit!==0)for(;se=I.pending_buf[I.d_buf+2*oe]<<8|I.pending_buf[I.d_buf+2*oe+1],G=I.pending_buf[I.l_buf+oe],oe++,se===0?q(I,G,B):(q(I,(j=w[G])+d+1,B),(he=E[j])!==0&&ie(I,G-=R[j],he),q(I,j=U(--se),re),(he=T[j])!==0&&ie(I,se-=H[j],he)),oe<I.last_lit;);q(I,v,B)}function mt(I,B){var re,se,G,j=B.dyn_tree,he=B.stat_desc.static_tree,oe=B.stat_desc.has_stree,_e=B.stat_desc.elems,Re=-1;for(I.heap_len=0,I.heap_max=p,re=0;re<_e;re++)j[2*re]!==0?(I.heap[++I.heap_len]=Re=re,I.depth[re]=0):j[2*re+1]=0;for(;I.heap_len<2;)j[2*(G=I.heap[++I.heap_len]=Re<2?++Re:0)]=1,I.depth[G]=0,I.opt_len--,oe&&(I.static_len-=he[2*G+1]);for(B.max_code=Re,re=I.heap_len>>1;1<=re;re--)Ne(I,j,re);for(G=_e;re=I.heap[1],I.heap[1]=I.heap[I.heap_len--],Ne(I,j,1),se=I.heap[1],I.heap[--I.heap_max]=re,I.heap[--I.heap_max]=se,j[2*G]=j[2*re]+j[2*se],I.depth[G]=(I.depth[re]>=I.depth[se]?I.depth[re]:I.depth[se])+1,j[2*re+1]=j[2*se+1]=G,I.heap[1]=G++,Ne(I,j,1),2<=I.heap_len;);I.heap[--I.heap_max]=I.heap[1],(function(He,_t){var W,ee,ce,fe,at,dt,Xe=_t.dyn_tree,yt=_t.max_code,xt=_t.stat_desc.static_tree,hn=_t.stat_desc.has_stree,Yt=_t.stat_desc.extra_bits,Fe=_t.stat_desc.extra_base,Ee=_t.stat_desc.max_length,qe=0;for(fe=0;fe<=y;fe++)He.bl_count[fe]=0;for(Xe[2*He.heap[He.heap_max]+1]=0,W=He.heap_max+1;W<p;W++)Ee<(fe=Xe[2*Xe[2*(ee=He.heap[W])+1]+1]+1)&&(fe=Ee,qe++),Xe[2*ee+1]=fe,yt<ee||(He.bl_count[fe]++,at=0,Fe<=ee&&(at=Yt[ee-Fe]),dt=Xe[2*ee],He.opt_len+=dt*(fe+at),hn&&(He.static_len+=dt*(xt[2*ee+1]+at)));if(qe!==0){do{for(fe=Ee-1;He.bl_count[fe]===0;)fe--;He.bl_count[fe]--,He.bl_count[fe+1]+=2,He.bl_count[Ee]--,qe-=2}while(0<qe);for(fe=Ee;fe!==0;fe--)for(ee=He.bl_count[fe];ee!==0;)yt<(ce=He.heap[--W])||(Xe[2*ce+1]!==fe&&(He.opt_len+=(fe-Xe[2*ce+1])*Xe[2*ce],Xe[2*ce+1]=fe),ee--)}})(I,B),De(j,Re,I.bl_count)}function _(I,B,re){var se,G,j=-1,he=B[1],oe=0,_e=7,Re=4;for(he===0&&(_e=138,Re=3),B[2*(re+1)+1]=65535,se=0;se<=re;se++)G=he,he=B[2*(se+1)+1],++oe<_e&&G===he||(oe<Re?I.bl_tree[2*G]+=oe:G!==0?(G!==j&&I.bl_tree[2*G]++,I.bl_tree[2*x]++):oe<=10?I.bl_tree[2*k]++:I.bl_tree[2*C]++,j=G,Re=(oe=0)===he?(_e=138,3):G===he?(_e=6,3):(_e=7,4))}function K(I,B,re){var se,G,j=-1,he=B[1],oe=0,_e=7,Re=4;for(he===0&&(_e=138,Re=3),se=0;se<=re;se++)if(G=he,he=B[2*(se+1)+1],!(++oe<_e&&G===he)){if(oe<Re)for(;q(I,G,I.bl_tree),--oe!=0;);else G!==0?(G!==j&&(q(I,G,I.bl_tree),oe--),q(I,x,I.bl_tree),ie(I,oe-3,2)):oe<=10?(q(I,k,I.bl_tree),ie(I,oe-3,3)):(q(I,C,I.bl_tree),ie(I,oe-11,7));j=G,Re=(oe=0)===he?(_e=138,3):G===he?(_e=6,3):(_e=7,4)}}l(H);var Z=!1;function P(I,B,re,se){ie(I,(c<<1)+(se?1:0),3),(function(G,j,he,oe){Me(G),ae(G,he),ae(G,~he),i.arraySet(G.pending_buf,G.window,j,he,G.pending),G.pending+=he})(I,B,re)}s._tr_init=function(I){Z||((function(){var B,re,se,G,j,he=new Array(y+1);for(G=se=0;G<u-1;G++)for(R[G]=se,B=0;B<1<<E[G];B++)w[se++]=G;for(w[se-1]=G,G=j=0;G<16;G++)for(H[G]=j,B=0;B<1<<T[G];B++)z[j++]=G;for(j>>=7;G<f;G++)for(H[G]=j<<7,B=0;B<1<<T[G]-7;B++)z[256+j++]=G;for(re=0;re<=y;re++)he[re]=0;for(B=0;B<=143;)O[2*B+1]=8,B++,he[8]++;for(;B<=255;)O[2*B+1]=9,B++,he[9]++;for(;B<=279;)O[2*B+1]=7,B++,he[7]++;for(;B<=287;)O[2*B+1]=8,B++,he[8]++;for(De(O,h+1,he),B=0;B<f;B++)S[2*B+1]=5,S[2*B]=be(B,5);F=new J(O,E,d+1,h,y),D=new J(S,T,0,f,y),Q=new J(new Array(0),A,0,m,b)})(),Z=!0),I.l_desc=new N(I.dyn_ltree,F),I.d_desc=new N(I.dyn_dtree,D),I.bl_desc=new N(I.bl_tree,Q),I.bi_buf=0,I.bi_valid=0,Se(I)},s._tr_stored_block=P,s._tr_flush_block=function(I,B,re,se){var G,j,he=0;0<I.level?(I.strm.data_type===2&&(I.strm.data_type=(function(oe){var _e,Re=4093624447;for(_e=0;_e<=31;_e++,Re>>>=1)if(1&Re&&oe.dyn_ltree[2*_e]!==0)return o;if(oe.dyn_ltree[18]!==0||oe.dyn_ltree[20]!==0||oe.dyn_ltree[26]!==0)return a;for(_e=32;_e<d;_e++)if(oe.dyn_ltree[2*_e]!==0)return a;return o})(I)),mt(I,I.l_desc),mt(I,I.d_desc),he=(function(oe){var _e;for(_(oe,oe.dyn_ltree,oe.l_desc.max_code),_(oe,oe.dyn_dtree,oe.d_desc.max_code),mt(oe,oe.bl_desc),_e=m-1;3<=_e&&oe.bl_tree[2*M[_e]+1]===0;_e--);return oe.opt_len+=3*(_e+1)+5+5+4,_e})(I),G=I.opt_len+3+7>>>3,(j=I.static_len+3+7>>>3)<=G&&(G=j)):G=j=re+5,re+4<=G&&B!==-1?P(I,B,re,se):I.strategy===4||j===G?(ie(I,2+(se?1:0),3),ot(I,O,S)):(ie(I,4+(se?1:0),3),(function(oe,_e,Re,He){var _t;for(ie(oe,_e-257,5),ie(oe,Re-1,5),ie(oe,He-4,4),_t=0;_t<He;_t++)ie(oe,oe.bl_tree[2*M[_t]+1],3);K(oe,oe.dyn_ltree,_e-1),K(oe,oe.dyn_dtree,Re-1)})(I,I.l_desc.max_code+1,I.d_desc.max_code+1,he+1),ot(I,I.dyn_ltree,I.dyn_dtree)),Se(I),se&&Me(I)},s._tr_tally=function(I,B,re){return I.pending_buf[I.d_buf+2*I.last_lit]=B>>>8&255,I.pending_buf[I.d_buf+2*I.last_lit+1]=255&B,I.pending_buf[I.l_buf+I.last_lit]=255&re,I.last_lit++,B===0?I.dyn_ltree[2*re]++:(I.matches++,B--,I.dyn_ltree[2*(w[re]+d+1)]++,I.dyn_dtree[2*U(B)]++),I.last_lit===I.lit_bufsize-1},s._tr_align=function(I){ie(I,2,3),q(I,v,O),(function(B){B.bi_valid===16?(ae(B,B.bi_buf),B.bi_buf=0,B.bi_valid=0):8<=B.bi_valid&&(B.pending_buf[B.pending++]=255&B.bi_buf,B.bi_buf>>=8,B.bi_valid-=8)})(I)}},{"../utils/common":41}],53:[function(n,r,s){r.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(n,r,s){(function(i){(function(o,a){if(!o.setImmediate){var l,c,u,d,h=1,f={},m=!1,p=o.document,y=Object.getPrototypeOf&&Object.getPrototypeOf(o);y=y&&y.setTimeout?y:o,l={}.toString.call(o.process)==="[object process]"?function(x){process.nextTick(function(){b(x)})}:(function(){if(o.postMessage&&!o.importScripts){var x=!0,k=o.onmessage;return o.onmessage=function(){x=!1},o.postMessage("","*"),o.onmessage=k,x}})()?(d="setImmediate$"+Math.random()+"$",o.addEventListener?o.addEventListener("message",v,!1):o.attachEvent("onmessage",v),function(x){o.postMessage(d+x,"*")}):o.MessageChannel?((u=new MessageChannel).port1.onmessage=function(x){b(x.data)},function(x){u.port2.postMessage(x)}):p&&"onreadystatechange"in p.createElement("script")?(c=p.documentElement,function(x){var k=p.createElement("script");k.onreadystatechange=function(){b(x),k.onreadystatechange=null,c.removeChild(k),k=null},c.appendChild(k)}):function(x){setTimeout(b,0,x)},y.setImmediate=function(x){typeof x!="function"&&(x=new Function(""+x));for(var k=new Array(arguments.length-1),C=0;C<k.length;C++)k[C]=arguments[C+1];var E={callback:x,args:k};return f[h]=E,l(h),h++},y.clearImmediate=g}function g(x){delete f[x]}function b(x){if(m)setTimeout(b,0,x);else{var k=f[x];if(k){m=!0;try{(function(C){var E=C.callback,T=C.args;switch(T.length){case 0:E();break;case 1:E(T[0]);break;case 2:E(T[0],T[1]);break;case 3:E(T[0],T[1],T[2]);break;default:E.apply(a,T)}})(k)}finally{g(x),m=!1}}}}function v(x){x.source===o&&typeof x.data=="string"&&x.data.indexOf(d)===0&&b(+x.data.slice(d.length))}})(typeof self>"u"?i===void 0?this:i:self)}).call(this,typeof ia<"u"?ia:typeof self<"u"?self:typeof window<"u"?window:{})},{}]},{},[10])(10)})})(Tc)),Tc.exports}var $k=Lk();const ql=By($k),Ys="app.bms.voxelscape.place",Hu="application/zip",uo="manifest.json",Dk=256,Nk=1e7,Fk=64,Bk=256,Uk=64,Hk=256,Xd="https://big-mesh-studios.github.io/big-mesh-studios/voxelscape/",Is=["solo","solo:edit","multi","multi:edit"],Uy=t=>!Array.isArray(t)||t.length!==3?!1:t.every(e=>typeof e=="number"&&Number.isFinite(e)&&Math.abs(e)<=Nk),Hy=t=>typeof t=="string"&&t.length>=1&&t.length<=Dk,jy=t=>t===void 0||Is.includes(t),jk=t=>{if(typeof t!="object"||t===null)return!1;const{ref:e,mimeType:n}=t;return typeof n=="string"&&typeof e=="object"&&e!==null&&typeof e.$link=="string"},Wk=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return!Hy(e.name)||typeof e.seed!="number"||!Number.isFinite(e.seed)||!Uy(e.spawn)||!jy(e.mode)?!1:Of(e.scripts,Fk,Bk)&&Of(e.models,Uk,Hk)},Of=(t,e,n)=>t===void 0?!0:Array.isArray(t)&&t.length<=e&&t.every(r=>typeof r=="string"&&r.length>=1&&r.length<=n&&!r.startsWith("/")&&!r.includes("..")),zf=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return e.$type===Ys&&Hy(e.name)&&typeof e.seed=="number"&&Number.isFinite(e.seed)&&Uy(e.spawn)&&typeof e.createdAt=="string"&&jk(e.file)&&jy(e.mode)};function Wy(t){const e=t.toLowerCase().replace(/[^a-z0-9.\-_~]+/g,"-").replace(/-+/g,"-").replace(/^[-.]+|[-.]+$/g,"").slice(0,512);if(e==="")throw new Error(`"${t}" holds no letters or digits to name a place by`);return e}const Vk=(t,e,n)=>({$type:Ys,name:t.name,seed:t.seed,spawn:t.spawn,createdAt:e,file:n,...t.mode!==void 0?{mode:t.mode}:{}}),Vy=(t,e)=>`at://${t}/${Ys}/${e}`,Fs=t=>{const e=/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(t);return e===null||e[2]!==Ys?null:{repo:e[1],rkey:e[3]}},Gy=async t=>{let e;try{e=await ql.loadAsync(await t.arrayBuffer())}catch{throw new Error("not a zip a place was saved as")}const n=e.file(uo);if(n===null)throw new Error(`no ${uo} at the zip's root`);let r;try{r=JSON.parse(await n.async("text"))}catch{throw new Error(`${uo} is not valid JSON`)}if(!Wk(r))throw new Error(`${uo} is not a place manifest this can open`);for(const s of[...r.scripts??[],...r.models??[]])if(e.file(s)===null)throw new Error(`the manifest names "${s}", which the zip does not hold`);return r},wo="app.bms.stacker.model";function Gk(t){const e=t.toLowerCase().replace(/[^a-z0-9.\-_~]+/g,"-").replace(/-+/g,"-").replace(/^[-.]+|[-.]+$/g,"").slice(0,512);if(e==="")throw new Error(`"${t}" holds no letters or digits to name a record by`);return e}function Yk(t){if(typeof t!="object"||t===null)return!1;const{width:e,height:n,depth:r}=t;return typeof e=="number"&&typeof n=="number"&&typeof r=="number"}function ju(t){if(typeof t!="object"||t===null)return!1;const{ref:e,mimeType:n}=t;return typeof n=="string"&&typeof e=="object"&&e!==null&&typeof e.$link=="string"}function Wu(t){if(typeof t!="object"||t===null)return!1;const e=t;return e.$type===wo&&typeof e.name=="string"&&typeof e.createdAt=="string"&&ju(e.file)&&Yk(e.dimensions)&&(e.thumbnail===void 0||ju(e.thumbnail))}function Xk(t){return t.file.ref.$link}function qk(t){return ju(t.thumbnail)?t.thumbnail.ref.$link:null}function Vu(t,e,n){return`${t}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(e)}&cid=${encodeURIComponent(n)}`}function Zk(t){const e=/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(t);return e===null||e[2]!==wo?null:{repo:e[1],rkey:e[3]}}const Yy=t=>{const e=eS,n=globalThis.fetch.bind(globalThis),r=new Map,s=a=>{const l=r.get(a)??e(a);return r.set(a,l),l},i=async a=>{const l=await s(a);return{location:l,client:new Gs({handler:Oo({service:l.service,fetch:n})})}},o=async(a,l)=>{const c=new Gs({handler:Oo({service:a.service,fetch:n})}),u=await Vn(c.get("com.atproto.repo.getRecord",{params:{repo:a.did,collection:Ys,rkey:l}}));if(!zf(u.value))throw new Error(`"${l}" is not a place this can open`);return{repo:a.did,rkey:l,record:u.value}};return{async list(a){const{location:l,client:c}=await i(a),u=[];let d;do{const h=await Vn(c.get("com.atproto.repo.listRecords",{params:{repo:l.did,collection:Ys,cursor:d,limit:100}}));d=h.cursor;for(const{uri:f,value:m}of h.records){if(!zf(m))continue;const p=f.slice(f.lastIndexOf("/")+1);u.push({repo:l.did,rkey:p,record:m})}}while(d!==void 0);return u},async find(a,l){const c=await s(a);return o(c,Wy(l))},async recordAtUri(a){const l=Fs(a);if(l===null)throw new Error(`"${a}" is not a place address`);const c=await s(l.repo);return o(c,l.rkey)},async file(a){const l=await s(a.repo),c=Vu(l.service,a.repo,a.record.file.ref.$link),u=await n(c);if(!u.ok)throw new Error(`the server holding ${a.repo} would not serve "${a.record.name}" (${u.status})`);return u.blob()}}},Kk=t=>({async publish(e){const n=t.getClient(),r=t.getRepo();if(n===void 0||r===null)throw new Error("not connected — use /account:login first");const s=await Gy(e),i=await n.uploadBlob(e.type===Hu?e:new Blob([e],{type:Hu})),o=Wy(s.name),a=Vk(s,new Date().toISOString(),i);return await n.putRecord({repo:r,collection:Ys,rkey:o,record:a}),Vy(r,o)}}),Jk=Yl(),Qk=Go(),eS=async t=>{const e=t.startsWith("did:")?t:await Jk.resolve(t),n=await Qk.resolve(e);return{did:e,service:Xl(n)}},tS=`// The \`"voxelscape"\` module's ambient types: the one place every function
// \`quickjs-sandbox.ts\` binds is typed, whether or not a given script calls
// it, alongside \`createNpc\`/\`createProp\` (ADR 0050) for placing and moving a
// figure wearing an attached model. \`tsc\` sees this file as part of the app's
// own program, so every demo script that imports "voxelscape" type-checks
// against it directly; \`project.ts\` reads it back as text
// (\`VOXELSCAPE_TYPES\`) to feed the editor's language worker the same
// declaration for a creator's own scripts. \`PlaceEditorPanes.tsx\` feeds the
// worker \`effects.ts\`, \`cutscene.ts\`, and \`motion.ts\` too, so \`dispatch\`'s
// payload type resolves the same way there as it does for \`tsc\`.
//
// \`ModelsByName\` starts empty here and is filled in two different ways for
// two different readers of this same declaration: a place's own attached
// models augment it live, generated by \`model-dts.ts\` into \`models.d.ts\`
// (never a project file a creator can open); this app's own demo scripts
// augment it with a small checked-in file per model they use (e.g.
// \`demo-scripts/models.d.ts\`), so \`tsc\` can check them the same way.
// Declaration merging is what makes both of those additive rather than
// something this file has to know about in advance.
//
// This file carries no top-level \`import\` of its own — an inline
// \`import("./effects")\` type reaches the same file without one — because a
// top-level import would turn \`declare module "voxelscape"\` below from a
// fresh ambient module declaration into an augmentation of one that would
// then need to already exist elsewhere.
declare module "voxelscape" {
  type EffectTag = import("./effects").EffectTag;
  type ParsedEffect = import("./effects").ParsedEffect;
  /** One parsed fact \`onTick\` hands a script, exactly as the trusted side authored it. */
  export type ScriptEvent = import("./events").ScriptEvent;

  /** The shape \`tag\` validates against, per \`effects.ts\`'s own \`ParsedEffect\`. */
  type PayloadFor<T extends EffectTag> = Extract<
    ParsedEffect,
    { tag: T }
  >["payload"];

  /**
   * Queues one effect for the trusted side to validate and apply. \`payload\`
   * is typed to the shape \`tag\` itself validates against — \`dispatch\`
   * stringifies it before it crosses the sandbox boundary.
   */
  export function dispatch<T extends EffectTag>(
    tag: T,
    payload: PayloadFor<T>,
  ): void;
  export function log(line: string): void;
  export function now(): number;
  export function endings(): string;
  /** Every player's live position: the local player first, then connected peers. */
  export function players(): string;
  /** The terrain surface at (x, z). */
  export function heightAt(x: number, z: number): number;
  /** Whether (x, y, z) is inside solid ground. */
  export function solidAt(x: number, y: number, z: number): boolean;
  /** Whether (x, y, z) is water. */
  export function waterAt(x: number, y: number, z: number): boolean;
  /**
   * Registers a handler the world calls each step with the shared clock and
   * the facts since the last step, already parsed — \`events\` is the exact
   * \`ScriptEvent[]\` the trusted side authored, not the JSON text it crossed
   * the sandbox boundary as.
   */
  export function onTick(
    fn: (clockMs: number, events: ScriptEvent[]) => void,
  ): void;
  export function onPlan(fn: (contextJson: string) => string): void;
  export const blocks: Record<string, number>;

  /** What a model is made of, keyed by name in \`ModelsByName\`. */
  export interface ModelDescriptor {
    readonly name: string;
    readonly file: string;
    readonly parts: readonly string[];
    readonly motions: readonly string[];
  }

  /** Every model this place carries, keyed by the bare name \`createNpc\`/\`createProp\` take — empty until augmented. */
  export interface ModelsByName {}

  /** Where a figure stands and faces, over the id/model a create call also takes. */
  interface FigurePlacement {
    x: number;
    z: number;
    y?: number;
    yaw?: number;
  }

  /** A figure's placement, re-sent on \`move\`. \`live\` marks a position the script computed itself as the figure's current owner, to broadcast to other peers rather than leave for each of them to compute independently — see the "npc" effect's own \`live\` field, which this passes straight through, and defaults to true. A prop, which has no such field, ignores it. */
  interface FigureMove extends FigurePlacement {
    live?: boolean;
  }

  /**
   * An NPC placed and moved through the "npc"/"npc-remove"/"npc-die"
   * effects, as \`createNpc\` hands it back. Owns only where it stands and
   * dispatching its own placement — a script's own bookkeeping (health, AI
   * state, and the rest) stays the script's own. \`model\` is \`undefined\` for
   * an NPC \`createNpc\` placed with no \`model\` option, left for the world to
   * draw with its own default figure.
   */
  export interface NpcHandle<M extends ModelDescriptor | undefined> {
    readonly model: M;
    readonly id: string;
    /** Where the figure currently stands — set by \`createNpc\` and by \`move\`, never by anything else. */
    readonly x: number;
    readonly z: number;
    /** Feet height in world units, or undefined to leave it grounded. */
    readonly y?: number;
    /** Which way the figure currently faces, in radians. */
    readonly yaw: number;
    /** Moves the figure and re-dispatches its placement. */
    move(options: FigureMove): void;
    /** Removes the NPC outright — no death fall. */
    remove(): void;
    /** Plays a death fall in place of an outright removal, then forgets it the same way. */
    die(): void;
  }

  interface CreateNpcOptions<
    K extends keyof ModelsByName | undefined,
  > extends FigurePlacement {
    /** Which model this NPC wears; omit it to leave the world drawing its own default figure. */
    model?: K;
    id: string;
    /** Shown to players, e.g. "Zombie" — the model it wears is a separate thing from what it is called. */
    name?: string;
    /** Reads the model live from its own \`at://\` address instead of the place's bundled files. */
    modelUri?: string;
  }

  /**
   * Places an NPC wearing the model named \`options.model\` — a name
   * \`ModelsByName\` does not carry is refused at the type level; a name this
   * place does not actually attach is refused at run time, inside
   * \`createNpc\` itself, the moment a script calls it. Omitting \`model\`
   * entirely leaves the world drawing its own default figure, the same way
   * omitting it from a hand-written "npc" effect already does. \`id\` is never
   * generated: every peer replaying the same script must compute the exact
   * same id independently (ADR 0026), so it has to come from the caller's
   * own deterministic address, the way the Zombies demo derives one from its
   * population seed and spawn cell.
   */
  export function createNpc<
    K extends keyof ModelsByName | undefined = undefined,
  >(
    options: CreateNpcOptions<K>,
  ): NpcHandle<K extends keyof ModelsByName ? ModelsByName[K] : undefined>;

  /** A prop placed through the "prop"/"prop-remove" effects, as \`createProp\` hands it back. */
  export interface PropHandle<M extends ModelDescriptor> {
    readonly model: M;
    readonly id: string;
    readonly x: number;
    readonly z: number;
    readonly y?: number;
    readonly yaw: number;
    move(options: FigureMove): void;
    remove(): void;
  }

  interface CreatePropOptions<
    K extends keyof ModelsByName,
  > extends FigurePlacement {
    model: K;
    id: string;
    name?: string;
    height?: number;
    solid?: boolean;
    hazard?: boolean;
    conveyor?: { vx: number; vz: number };
    /** A path and spin the prop follows over the shared clock, in place of \`move\`. */
    motion?: import("./motion").MotionSpec;
  }

  /** Places a prop wearing the model named \`options.model\`; see \`createNpc\` for how a name resolves and why \`id\` is never generated. */
  export function createProp<K extends keyof ModelsByName>(
    options: CreatePropOptions<K>,
  ): PropHandle<ModelsByName[K]>;
}
`,nS=`// The effect vocabulary a place script speaks: what its \`engine.dispatch(tag,
// payload)\` calls mean once the trusted side has applied them. A script never
// performs an effect — it queues one as a JSON payload, and this module is
// where a tag's shape and its bounds are decided, the same way
// \`multiplayer/messages.ts\` bounds every wire field. Anything a script asks for
// that is not a well-formed effect here is dropped, never applied.
import type { CameraShot } from "./cutscene";
import type { MotionSpec } from "./motion";
import type { ScriptEffect } from "./sandbox";

/** Every effect tag a place script may dispatch. */
export type EffectTag =
  | "npc"
  | "npc-remove"
  | "npc-die"
  | "prop"
  | "prop-remove"
  | "fire"
  | "field"
  | "field-remove"
  | "zone"
  | "zone-remove"
  | "item-define"
  | "item-give"
  | "item-take"
  | "item-hold"
  | "toast"
  | "dialog"
  | "dialog-close"
  | "narrate"
  | "ending"
  | "restart"
  | "time"
  | "timer"
  | "player-place"
  | "player-face"
  | "player-speed"
  | "player-jump"
  | "player-damage"
  | "player-checkpoint"
  | "player-kill"
  | "player-respawn"
  | "void"
  | "cutscene"
  | "camera"
  | "player-control"
  | "hud"
  | "hud-remove"
  | "explosion";

/** The furthest an NPC or prop may stand from the origin, in world units. */
export const MAX_NPC_COORD = 1_000_000;
/** The longest an NPC or prop's name may be. */
export const MAX_NPC_NAME = 40;
/** The longest a prop's model file name may be. */
export const MAX_PROP_MODEL = 128;
/** The tallest a prop may be drawn, in world units. */
export const MAX_PROP_HEIGHT = 64;
/** The most waypoints one motion's path may hold. */
export const MAX_MOTION_POINTS = 64;
/** The longest one motion traversal may take, in milliseconds. */
export const MAX_MOTION_MS = 86_400_000;
/** The largest spin rate a motion may ask for, per second or per metre. */
export const MAX_SPIN_RATE = 1_000;
/** The most shots one cutscene may hold. */
export const MAX_CUTSCENE_SHOTS = 64;
/** The longest one camera move or hold may last, in milliseconds. */
export const MAX_CAMERA_MS = 86_400_000;
/** The longest one HUD readout's id or label may be. */
export const MAX_HUD_LABEL = 64;
/** The longest one HUD readout's text may be. */
export const MAX_HUD_TEXT = 200;
/** The largest HUD value or maximum may read. */
export const MAX_HUD_VALUE = 1_000_000_000;
/** The longest a script item's id or name may be. */
export const MAX_ITEM_NAME = 40;
/** The longest an items-spritesheet sprite name may be. */
export const MAX_ITEM_SPRITE = 64;
/** The most of one item a \`give\`/\`take\` may move. */
export const MAX_ITEM_COUNT = 9_999;

/** One item a place script defines for its own game. */
export interface ScriptItemDefinition {
  id: string;
  name: string;
  /** The items-spritesheet sprite the HUD shows, or "" for none. */
  sprite: string;
  stackable: boolean;
}
/** The longest a dialog prompt may be. */
export const MAX_DIALOG_PROMPT = 500;
/** The most options one dialog may offer. */
export const MAX_DIALOG_OPTIONS = 8;
/** The longest one option's text may be. */
export const MAX_OPTION_LENGTH = 80;
/** The longest a toast line may be. */
export const MAX_TOAST_LENGTH = 300;
/** The longest an ending's title may be. */
export const MAX_ENDING_TITLE = 80;
/** The longest an ending's body may be. */
export const MAX_ENDING_TEXT = 1_000;
/** The longest a narration line or its speaker's name may be. */
export const MAX_NARRATION = 500;
/** The furthest ahead, in milliseconds, a timer may be set. */
export const MAX_TIMER_MS = 86_400_000;
/** The largest multiplier a script may apply to a player's move speed or jump. */
export const MAX_PLAYER_MULTIPLIER = 100;
/** The most hit points one \`player-damage\` effect may take off. */
export const MAX_PLAYER_DAMAGE = 1_000;
/** The widest an explosion may read, in world units. */
export const MAX_EXPLOSION_RADIUS = 64;
/** The longest a model's \`at://\` address may be. */
export const MAX_MODEL_URI = 256;
/** The furthest a field's push may pull a player, per axis, in units per second. */
export const MAX_FIELD_SPEED = 100;
/** The fastest a field's quicksand may sink a player, in units per second. */
export const MAX_FIELD_SINK = 100;
/** The fastest a conveyor may carry a player, per axis, in units per second. */
export const MAX_CONVEYOR_SPEED = 100;

export type ParsedEffect =
  | {
      tag: "npc";
      payload: {
        id: string;
        /** The NPC's feet, in world units; the host grounds the figure's height. */
        x: number;
        z: number;
        /** The NPC's feet height in world units; defaults to the ground. */
        y?: number;
        name?: string;
        /** The place model file the NPC wears; the world picks one when absent. */
        model?: string;
        /**
         * The NPC's model, read live from its own \`at://\` address instead of
         * the place's bundled files — takes precedence over \`model\` when set.
         */
        modelUri?: string;
        /** Heading in radians, turning the figure to face somewhere. */
        yaw?: number;
        /**
         * Marks this update as the position a script has computed itself as
         * the entity's current owner, to be broadcast to other peers rather
         * than left for each of them to compute independently. Absent or
         * false means the position is left to each peer's own deterministic
         * replay, the way every other NPC already works.
         */
        live?: boolean;
        /** A path and spin the NPC follows over the shared clock. */
        motion?: MotionSpec;
      };
    }
  | { tag: "npc-remove"; payload: { id: string } }
  | {
      tag: "npc-die";
      /** The NPC to play a death fall for, rather than removing outright —
       * left standing in the world a moment longer, lying flat, before it
       * is gone the same way \`npc-remove\` takes one away instantly. */
      payload: { id: string };
    }
  | {
      tag: "prop";
      payload: {
        id: string;
        /** The place model file the prop wears, as the manifest names it. */
        model: string;
        /** The prop's feet, in world units; the host grounds the figure's height. */
        x: number;
        z: number;
        /** The prop's feet height in world units; defaults to the ground. */
        y?: number;
        name?: string;
        /** Heading in radians. */
        yaw?: number;
        /** Drawn height in world units. */
        height?: number;
        /** Whether the prop blocks the player; defaults to false. */
        solid?: boolean;
        /** Whether touching the prop counts as a hazard the script hears about. */
        hazard?: boolean;
        /** A path and spin the prop follows over the shared clock. */
        motion?: MotionSpec;
        /**
         * The horizontal velocity the prop's surface carries a player standing
         * on it, in units per second. It takes the place of a \`motion\` — a
         * static treadmill, a rolling walkway — so the two may not both be set.
         */
        conveyor?: { vx: number; vz: number };
      };
    }
  | { tag: "prop-remove"; payload: { id: string } }
  | {
      tag: "fire";
      payload: {
        id: string;
        /** The blaze's base, in world units; the host grounds the ember. */
        x: number;
        z: number;
        /** The blaze's base height in world units; defaults to the ground. */
        y?: number;
        /** Drawn height of the flame in world units. */
        height?: number;
      };
    }
  | {
      tag: "field";
      payload: {
        id: string;
        /** What the box does to a player inside it. */
        kind: "push" | "quicksand";
        /** The box a player must stand in, in world units, inclusive. */
        min: [number, number, number];
        max: [number, number, number];
        /**
         * For a push: the target horizontal velocity the box pulls a player's
         * movement toward, in units per second each axis; at least one of
         * \`vx\`, \`vy\`, \`vz\` must be present.
         */
        vx?: number;
        /** For a push: the target upward velocity pulled toward; absent leaves falling alone. */
        vy?: number;
        vz?: number;
        /**
         * For quicksand: what a player's walk speed is multiplied by while
         * stuck, from just above 0 (unmoving) to 1 (no effect).
         */
        speedScale?: number;
        /** For quicksand: the fastest a player may fall through it, units per second. */
        sink?: number;
      };
    }
  | { tag: "field-remove"; payload: { id: string } }
  | {
      tag: "zone";
      payload: {
        id: string;
        name?: string;
        /** The box a player must stand in, in world units, inclusive. */
        min: [number, number, number];
        max: [number, number, number];
      };
    }
  | { tag: "zone-remove"; payload: { id: string } }
  | { tag: "item-define"; payload: ScriptItemDefinition }
  | {
      tag: "item-give";
      payload: { player: string; item: string; count: number };
    }
  | {
      tag: "item-take";
      payload: { player: string; item: string; count: number };
    }
  | {
      tag: "item-hold";
      payload: { player: string; item: string };
    }
  | { tag: "toast"; payload: { player: string; text: string } }
  | {
      tag: "dialog";
      payload: {
        player: string;
        npcId: string;
        prompt: string;
        options: string[];
      };
    }
  | { tag: "dialog-close"; payload: { player: string; npcId: string } }
  | {
      tag: "narrate";
      payload: { player: string; name: string; text: string };
    }
  | {
      tag: "ending";
      payload: { player: string; title: string; text: string };
    }
  | { tag: "restart"; payload: { player: string } }
  | {
      tag: "time";
      payload: {
        /** The moment on the day-night clock to jump to, in seconds. */
        seconds?: number;
        /** How fast the clock runs; 0 pins it. */
        speed?: number;
        /** Clears any override, returning the clock to its own cycle. */
        clear?: boolean;
      };
    }
  | {
      tag: "timer";
      payload: {
        /** Names the deadline, so the \`timer\` event it produces can be matched. */
        id: string;
        /** How long from now, in milliseconds on the shared clock, to fire. */
        afterMs: number;
      };
    }
  | {
      tag: "player-place";
      payload: {
        player: string;
        /** Where the player's feet are put, in world units. */
        x: number;
        z: number;
        /** The feet height to set; the current height is kept when absent. */
        y?: number;
        /** The heading to turn the player to, in radians. */
        yaw?: number;
      };
    }
  | {
      tag: "player-face";
      payload: {
        player: string;
        /** The world point the player is turned to look at, in world units. */
        x: number;
        z: number;
      };
    }
  | {
      tag: "player-speed";
      payload: {
        player: string;
        /** What to multiply the player's walk speed by; 0.01 is a crawl. */
        multiplier: number;
      };
    }
  | {
      tag: "player-jump";
      payload: {
        player: string;
        /** What to multiply the player's jump speed by. */
        multiplier: number;
      };
    }
  | {
      tag: "player-damage";
      payload: {
        player: string;
        /** Hit points to take off, before the player's own guard reduces it. */
        amount: number;
        /** The entity dealing it, if any one entity is — a diagnostic trail
         * back to what actually hit the player, not something a script's own
         * behavior depends on. */
        source?: string;
      };
    }
  | {
      tag: "player-checkpoint";
      payload: {
        player: string;
        /** Where this player respawns, in world units. */
        x: number;
        z: number;
        /** The feet height to respawn at; the current height is kept when absent. */
        y?: number;
        /** The heading to respawn facing, in radians. */
        yaw?: number;
      };
    }
  | {
      tag: "player-kill";
      payload: {
        player: string;
        /** A label the \`player-died\` event carries, or "" for none. */
        cause?: string;
      };
    }
  | { tag: "player-respawn"; payload: { player: string } }
  | {
      tag: "void";
      payload: {
        /** The height below which the player is killed, in world units. */
        y: number;
      };
    }
  | {
      tag: "cutscene";
      payload: {
        player: string;
        /** The camera moves to play in order. */
        shots: CameraShot[];
      };
    }
  | {
      tag: "camera";
      payload: {
        player: string;
        /** Where the camera moves to, in world units. */
        at: [number, number, number];
        /** The world point to look at; the current look is kept when absent. */
        look?: [number, number, number];
        /** How long the move takes, in milliseconds; 0 snaps. */
        durationMs?: number;
        /** How long to hold after arriving, in milliseconds. */
        holdMs?: number;
        ease?: "linear" | "smooth";
      };
    }
  | {
      tag: "player-control";
      payload: {
        player: string;
        /** Whether the script takes the player's movement and tools away. */
        locked: boolean;
      };
    }
  | {
      tag: "hud";
      payload: {
        player: string;
        /** Names the readout, so a later \`hud\` or \`hud-remove\` reaches it. */
        id: string;
        kind: "bar" | "text";
        /** The readout's caption, or "" for none. */
        label?: string;
        /** A bar's filled amount. */
        value?: number;
        /** A bar's full amount; required for a bar. */
        max?: number;
        /** A text readout's body. */
        text?: string;
      };
    }
  | { tag: "hud-remove"; payload: { player: string; id: string } }
  | {
      tag: "explosion";
      payload: {
        id: string;
        /** The blast's centre, in world units; the host grounds it. */
        x: number;
        z: number;
        /** The centre height in world units; defaults to the ground. */
        y?: number;
        /** How wide the blast reads, in world units; defaults to 4. */
        radius?: number;
      };
    };

const isShort = (v: unknown, max: number): boolean =>
  typeof v === "string" && v.length >= 1 && v.length <= max;

const isPlayer = (v: unknown): boolean =>
  typeof v === "string" && v.length <= 256;

const isCoord = (v: unknown): boolean =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= MAX_NPC_COORD;

const isVector = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every(isCoord);

const isNumberIn = (v: unknown, min: number, max: number): boolean =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Whether a value is a path and spin this world can sample. */
const isMotion = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const m = v as Record<string, unknown>;
  if (
    !Array.isArray(m.path) ||
    m.path.length < 1 ||
    m.path.length > MAX_MOTION_POINTS ||
    !m.path.every(isVector)
  ) {
    return false;
  }
  if (m.loop !== "once" && m.loop !== "loop" && m.loop !== "pingpong") {
    return false;
  }
  if (!isNumberIn(m.durationMs, 1, MAX_MOTION_MS)) {
    return false;
  }
  if (
    m.startAfterMs !== undefined &&
    !isNumberIn(m.startAfterMs, 0, MAX_MOTION_MS)
  ) {
    return false;
  }
  if (m.ease !== undefined && m.ease !== "linear" && m.ease !== "smooth") {
    return false;
  }
  if (m.spin === undefined) {
    return true;
  }
  if (typeof m.spin !== "object" || m.spin === null) {
    return false;
  }
  const s = m.spin as Record<string, unknown>;
  if (!isVector(s.axis)) {
    return false;
  }
  if (s.turnsPerSecond === undefined && s.degreesPerMeter === undefined) {
    return false;
  }
  if (
    s.turnsPerSecond !== undefined &&
    !isNumberIn(s.turnsPerSecond, -MAX_SPIN_RATE, MAX_SPIN_RATE)
  ) {
    return false;
  }
  if (
    s.degreesPerMeter !== undefined &&
    !isNumberIn(s.degreesPerMeter, -MAX_SPIN_RATE, MAX_SPIN_RATE)
  ) {
    return false;
  }
  return true;
};

/** Whether a value is one camera move this world can play. */
const isShot = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const s = v as Record<string, unknown>;
  if (!isVector(s.at)) {
    return false;
  }
  if (s.look !== undefined && !isVector(s.look)) {
    return false;
  }
  if (
    s.durationMs !== undefined &&
    !isNumberIn(s.durationMs, 0, MAX_CAMERA_MS)
  ) {
    return false;
  }
  if (s.holdMs !== undefined && !isNumberIn(s.holdMs, 0, MAX_CAMERA_MS)) {
    return false;
  }
  if (s.ease !== undefined && s.ease !== "linear" && s.ease !== "smooth") {
    return false;
  }
  return true;
};

/** Whether a value is a surface velocity a prop carries its rider at. */
const isConveyor = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const c = v as Record<string, unknown>;
  return (
    isNumberIn(c.vx, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED) &&
    isNumberIn(c.vz, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED)
  );
};

/** Whether a value is a field box this world can sample on a player. */
const isField = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const p = v as Record<string, unknown>;
  if (isShort(p.id, 64) === false) {
    return false;
  }
  if (p.kind === "push") {
    if (p.speedScale !== undefined || p.sink !== undefined) {
      return false;
    }
    if (p.vx === undefined && p.vy === undefined && p.vz === undefined) {
      return false;
    }
    return (
      (p.vx === undefined ||
        isNumberIn(p.vx, -MAX_FIELD_SPEED, MAX_FIELD_SPEED)) &&
      (p.vy === undefined ||
        isNumberIn(p.vy, -MAX_FIELD_SPEED, MAX_FIELD_SPEED)) &&
      (p.vz === undefined ||
        isNumberIn(p.vz, -MAX_FIELD_SPEED, MAX_FIELD_SPEED)) &&
      ((p.vx ?? 0) !== 0 || (p.vy ?? 0) !== 0 || (p.vz ?? 0) !== 0)
    );
  }
  if (p.kind === "quicksand") {
    if (p.vx !== undefined || p.vy !== undefined || p.vz !== undefined) {
      return false;
    }
    const scaleOk =
      p.speedScale === undefined ||
      (typeof p.speedScale === "number" &&
        Number.isFinite(p.speedScale) &&
        p.speedScale > 0 &&
        p.speedScale <= 1);
    const sinkOk =
      p.sink === undefined || isNumberIn(p.sink, 0, MAX_FIELD_SINK);
    return (
      scaleOk && sinkOk && (p.speedScale !== undefined || p.sink !== undefined)
    );
  }
  return false;
};

/** Whether a value is a box its two corners bound, small corner first. */
const isFieldBox = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const p = v as Record<string, unknown>;
  if (!isVector(p.min) || !isVector(p.max)) {
    return false;
  }
  return p.min[0] <= p.max[0] && p.min[1] <= p.max[1] && p.min[2] <= p.max[2];
};

/** Whether a JSON-parsed payload fits the shape of its tag. */
const isPayload = (tag: EffectTag, value: unknown): boolean => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const p = value as Record<string, unknown>;
  switch (tag) {
    case "npc":
      return (
        isShort(p.id, 64) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.name === undefined || isShort(p.name, MAX_NPC_NAME)) &&
        (p.model === undefined || isShort(p.model, MAX_PROP_MODEL)) &&
        (p.modelUri === undefined || isShort(p.modelUri, MAX_MODEL_URI)) &&
        (p.yaw === undefined || isCoord(p.yaw)) &&
        (p.live === undefined || typeof p.live === "boolean") &&
        (p.motion === undefined || isMotion(p.motion))
      );
    case "npc-remove":
    case "npc-die":
      return isShort(p.id, 64);
    case "prop":
      return (
        isShort(p.id, 64) &&
        isShort(p.model, MAX_PROP_MODEL) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.name === undefined || isShort(p.name, MAX_NPC_NAME)) &&
        (p.yaw === undefined || isCoord(p.yaw)) &&
        (p.height === undefined ||
          (typeof p.height === "number" &&
            Number.isFinite(p.height) &&
            p.height > 0 &&
            p.height <= MAX_PROP_HEIGHT)) &&
        (p.solid === undefined || typeof p.solid === "boolean") &&
        (p.hazard === undefined || typeof p.hazard === "boolean") &&
        (p.motion === undefined || isMotion(p.motion)) &&
        (p.conveyor === undefined ||
          (p.motion === undefined && isConveyor(p.conveyor)))
      );
    case "prop-remove":
      return isShort(p.id, 64);
    case "fire":
      return (
        isShort(p.id, 64) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.height === undefined ||
          (typeof p.height === "number" &&
            Number.isFinite(p.height) &&
            p.height > 0 &&
            p.height <= MAX_PROP_HEIGHT))
      );
    case "zone": {
      const { min, max } = p;
      return (
        isShort(p.id, 64) &&
        (p.name === undefined || isShort(p.name, MAX_NPC_NAME)) &&
        isVector(min) &&
        isVector(max) &&
        min[0] <= max[0] &&
        min[1] <= max[1] &&
        min[2] <= max[2]
      );
    }
    case "zone-remove":
      return isShort(p.id, 64);
    case "field":
      return isField(p) && isFieldBox(p);
    case "field-remove":
      return isShort(p.id, 64);
    case "item-define":
      return (
        isShort(p.id, MAX_ITEM_NAME) &&
        isShort(p.name, MAX_ITEM_NAME) &&
        (p.sprite === "" || isShort(p.sprite, MAX_ITEM_SPRITE)) &&
        typeof p.stackable === "boolean"
      );
    case "item-give":
    case "item-take":
      return (
        isPlayer(p.player) &&
        isShort(p.item, MAX_ITEM_NAME) &&
        typeof p.count === "number" &&
        Number.isInteger(p.count) &&
        p.count >= 1 &&
        p.count <= MAX_ITEM_COUNT
      );
    case "item-hold":
      return (
        isPlayer(p.player) && (p.item === "" || isShort(p.item, MAX_ITEM_NAME))
      );
    case "toast":
      return isPlayer(p.player) && isShort(p.text, MAX_TOAST_LENGTH);
    case "dialog":
      return (
        isPlayer(p.player) &&
        isShort(p.npcId, 64) &&
        isShort(p.prompt, MAX_DIALOG_PROMPT) &&
        Array.isArray(p.options) &&
        p.options.length >= 1 &&
        p.options.length <= MAX_DIALOG_OPTIONS &&
        p.options.every((o) => isShort(o, MAX_OPTION_LENGTH))
      );
    case "dialog-close":
      return isPlayer(p.player) && isShort(p.npcId, 64);
    case "narrate":
      return (
        isPlayer(p.player) &&
        isShort(p.name, MAX_NARRATION) &&
        isShort(p.text, MAX_NARRATION)
      );
    case "ending":
      return (
        isPlayer(p.player) &&
        isShort(p.title, MAX_ENDING_TITLE) &&
        isShort(p.text, MAX_ENDING_TEXT)
      );
    case "restart":
      return isPlayer(p.player);
    case "time":
      return (
        (p.seconds === undefined ||
          (typeof p.seconds === "number" &&
            Number.isFinite(p.seconds) &&
            p.seconds >= 0)) &&
        (p.speed === undefined ||
          (typeof p.speed === "number" && Number.isFinite(p.speed))) &&
        (p.clear === undefined || typeof p.clear === "boolean") &&
        (p.seconds !== undefined || p.speed !== undefined || p.clear === true)
      );
    case "timer":
      return (
        isShort(p.id, 64) &&
        typeof p.afterMs === "number" &&
        Number.isFinite(p.afterMs) &&
        p.afterMs >= 0 &&
        p.afterMs <= MAX_TIMER_MS
      );
    case "player-place":
      return (
        isPlayer(p.player) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.yaw === undefined || isCoord(p.yaw))
      );
    case "player-face":
      return isPlayer(p.player) && isCoord(p.x) && isCoord(p.z);
    case "player-speed":
    case "player-jump":
      return (
        isPlayer(p.player) &&
        typeof p.multiplier === "number" &&
        Number.isFinite(p.multiplier) &&
        p.multiplier > 0 &&
        p.multiplier <= MAX_PLAYER_MULTIPLIER
      );
    case "player-checkpoint":
      return (
        isPlayer(p.player) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.yaw === undefined || isCoord(p.yaw))
      );
    case "player-kill":
      return (
        isPlayer(p.player) &&
        (p.cause === undefined || p.cause === "" || isShort(p.cause, 64))
      );
    case "player-respawn":
      return isPlayer(p.player);
    case "void":
      return isCoord(p.y);
    case "cutscene":
      return (
        isPlayer(p.player) &&
        Array.isArray(p.shots) &&
        p.shots.length >= 1 &&
        p.shots.length <= MAX_CUTSCENE_SHOTS &&
        p.shots.every(isShot)
      );
    case "camera":
      return (
        isPlayer(p.player) &&
        isVector(p.at) &&
        (p.look === undefined || isVector(p.look)) &&
        (p.durationMs === undefined ||
          isNumberIn(p.durationMs, 0, MAX_CAMERA_MS)) &&
        (p.holdMs === undefined || isNumberIn(p.holdMs, 0, MAX_CAMERA_MS)) &&
        (p.ease === undefined || p.ease === "linear" || p.ease === "smooth")
      );
    case "player-control":
      return isPlayer(p.player) && typeof p.locked === "boolean";
    case "hud":
      return (
        isPlayer(p.player) &&
        isShort(p.id, MAX_HUD_LABEL) &&
        (p.kind === "bar" || p.kind === "text") &&
        (p.label === undefined ||
          p.label === "" ||
          isShort(p.label, MAX_HUD_LABEL)) &&
        (p.value === undefined ||
          isNumberIn(p.value, -MAX_HUD_VALUE, MAX_HUD_VALUE)) &&
        (p.max === undefined || isNumberIn(p.max, 1, MAX_HUD_VALUE)) &&
        (p.text === undefined ||
          p.text === "" ||
          isShort(p.text, MAX_HUD_TEXT)) &&
        (p.kind !== "bar" || p.max !== undefined)
      );
    case "hud-remove":
      return isPlayer(p.player) && isShort(p.id, MAX_HUD_LABEL);
    case "explosion":
      return (
        isShort(p.id, 64) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.radius === undefined ||
          (typeof p.radius === "number" &&
            Number.isFinite(p.radius) &&
            p.radius > 0 &&
            p.radius <= MAX_EXPLOSION_RADIUS))
      );
    case "player-damage":
      return (
        isPlayer(p.player) &&
        typeof p.amount === "number" &&
        Number.isFinite(p.amount) &&
        p.amount > 0 &&
        p.amount <= MAX_PLAYER_DAMAGE &&
        (p.source === undefined || isShort(p.source, 64))
      );
  }
};

/**
 * Parses and validates one queued effect. An effect whose tag is unknown or
 * whose payload does not fit its tag is refused, so a broken or hostile script
 * cannot slip anything past the boundary.
 */
export const parseEffect = (effect: ScriptEffect): ParsedEffect | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(effect.payload);
  } catch {
    return null;
  }
  if (!isPayload(effect.tag as EffectTag, parsed)) {
    return null;
  }
  return { tag: effect.tag as EffectTag, payload: parsed } as ParsedEffect;
};
`,rS=`// The camera shots a place script plays: an ordered list of moves over the
// shared clock, sampled by the world that owns the camera rather than stepped
// by the guest. A cutscene is voice-tier — it changes what one player sees —
// so nothing here is replicated, and the guest only declares the sequence.

/** One camera move: where the view goes, where it looks, and how long it takes. */
export interface CameraShot {
  /** Where the camera moves to, in world units. */
  at: [number, number, number];
  /** The world point the camera looks at; the previous look is kept when absent. */
  look?: [number, number, number];
  /** How long the move takes, in milliseconds; 0 or absent snaps. */
  durationMs?: number;
  /** How long the view holds on the shot after arriving, in milliseconds. */
  holdMs?: number;
  ease?: "linear" | "smooth";
}

/** A camera sequence a script has started, with the moment it began. */
export interface CutsceneState {
  /** The shared-clock moment the sequence began, in milliseconds. */
  startMs: number;
  shots: CameraShot[];
}

/** Where a camera is before a sequence begins: its eye and what it looks at. */
export interface CameraStart {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}

/** Where a camera is at a moment: its eye, what it looks at, and whether it is done. */
export interface CameraPose extends CameraStart {
  done: boolean;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

/** How long one shot takes, move and hold together, in milliseconds. */
const shotLength = (shot: CameraShot): number =>
  Math.max(0, shot.durationMs ?? 0) + Math.max(0, shot.holdMs ?? 0);

/** How long a whole sequence takes, in milliseconds. */
export const cutsceneDuration = (state: CutsceneState): number =>
  state.shots.reduce((total, shot) => total + shotLength(shot), 0);

const poseOf = (
  at: [number, number, number],
  look: [number, number, number],
): CameraStart => ({
  x: at[0],
  y: at[1],
  z: at[2],
  lookX: look[0],
  lookY: look[1],
  lookZ: look[2],
});

/**
 * Where a camera playing \`state\` is at \`clockMs\`, given the pose it started
 * from. The first shot moves out of \`from\`; each later shot moves out of where
 * the shot before it ended. A sequence whose time is up reports \`done\` with the
 * last shot's pose.
 */
export const cutscenePoseAt = (
  state: CutsceneState,
  clockMs: number,
  from: CameraStart,
): CameraPose => {
  const elapsed = Math.max(0, clockMs - state.startMs);
  let cursor = 0;
  let previous: CameraStart = from;
  for (const shot of state.shots) {
    const move = Math.max(0, shot.durationMs ?? 0);
    const hold = Math.max(0, shot.holdMs ?? 0);
    const look: [number, number, number] = shot.look ?? [
      previous.lookX,
      previous.lookY,
      previous.lookZ,
    ];
    if (elapsed < cursor + move) {
      const raw = move <= 0 ? 1 : (elapsed - cursor) / move;
      const t = shot.ease === "smooth" ? smooth(Math.min(1, raw)) : raw;
      return {
        x: lerp(previous.x, shot.at[0], t),
        y: lerp(previous.y, shot.at[1], t),
        z: lerp(previous.z, shot.at[2], t),
        lookX: lerp(previous.lookX, look[0], t),
        lookY: lerp(previous.lookY, look[1], t),
        lookZ: lerp(previous.lookZ, look[2], t),
        done: false,
      };
    }
    const arrived = poseOf(shot.at, look);
    if (elapsed < cursor + move + hold) {
      return { ...arrived, done: false };
    }
    cursor += move + hold;
    previous = arrived;
  }
  return { ...previous, done: true };
};
`,sS=`// The motion a place script gives a prop or NPC: a path walked over the shared
// clock, sampled into a pose rather than stepped by the guest. Determinism is
// the point — two peers with the same spec and the same clock reach the same
// offset — so a platform a player stands on is where its script says it is.
// The guest declares the motion once; the trusted side samples it every frame.

/** How a motion's path is walked and repeated. */
export type MotionLoop = "once" | "loop" | "pingpong";

/** How a motion's progress is paced along its path. */
export type MotionEase = "linear" | "smooth";

/** A turn a moving figure takes about a world-space axis. */
export interface MotionSpin {
  /** The axis the figure turns about; it need not be normalized. */
  axis: [number, number, number];
  /** Revolutions per second, or absent when the spin is driven by distance. */
  turnsPerSecond?: number;
  /** Degrees of turn per world unit travelled, or absent when driven by time. */
  degreesPerMeter?: number;
}

/** The path and spin a prop or NPC follows, as its script declares it. */
export interface MotionSpec {
  /** Offsets from the figure's declared position, in world units. */
  path: Array<[number, number, number]>;
  loop: MotionLoop;
  /** How long one traversal takes, in milliseconds on the shared clock. */
  durationMs: number;
  /** How long the figure stands still before the path begins. */
  startAfterMs?: number;
  ease?: MotionEase;
  spin?: MotionSpin;
}

/** Where a moving figure is at a moment, as an offset from its declared pose. */
export interface MotionPose {
  dx: number;
  dy: number;
  dz: number;
  /** The vertical-axis part of the spin, in radians, for a solid's collision. */
  yaw: number;
  /** The axis the full visual spin turns about. */
  spinAxis: [number, number, number];
  /** The full visual spin, in radians. */
  spinAngle: number;
  /** How fast the offset is changing, in world units per second. */
  vx: number;
  vy: number;
  vz: number;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

/** How far along its path a motion is at \`clockMs\`, before easing. */
const progressAt = (motion: MotionSpec, clockMs: number): number => {
  const elapsed = clockMs - (motion.startAfterMs ?? 0);
  if (elapsed <= 0 || motion.durationMs <= 0) {
    return 0;
  }
  const raw = elapsed / motion.durationMs;
  if (motion.loop === "once") {
    return Math.min(raw, 1);
  }
  if (motion.loop === "pingpong") {
    const cycle = raw % 2;
    return cycle <= 1 ? cycle : 2 - cycle;
  }
  return raw - Math.floor(raw);
};

/** The eased path position at \`clockMs\`. */
const easedAt = (motion: MotionSpec, clockMs: number): number => {
  const u = progressAt(motion, clockMs);
  return motion.ease === "smooth" ? smooth(u) : u;
};

/** The offset at \`u\` along a polyline, clamped to its ends. */
const pointAt = (
  path: ReadonlyArray<[number, number, number]>,
  u: number,
): [number, number, number] => {
  if (path.length === 0) {
    return [0, 0, 0];
  }
  if (path.length === 1) {
    return path[0];
  }
  const segments = path.length - 1;
  const scaled = Math.max(0, Math.min(1, u)) * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const t = scaled - index;
  const from = path[index];
  const to = path[index + 1];
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
};

/** The total length of a polyline, in world units. */
const lengthOf = (path: ReadonlyArray<[number, number, number]>): number => {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return total;
};

/** A unit axis, or \`null\` when the given one has no length. */
const unitAxis = (
  axis: [number, number, number],
): [number, number, number] | null => {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (length === 0) {
    return null;
  }
  return [axis[0] / length, axis[1] / length, axis[2] / length];
};

/**
 * Where a moving figure is at \`clockMs\`: its offset from the declared position,
 * the vertical-axis part of its spin for collision, and the full spin for the
 * renderer. A figure with no path stands at its declared pose.
 */
export const poseAt = (motion: MotionSpec, clockMs: number): MotionPose => {
  const u = easedAt(motion, clockMs);
  const [dx, dy, dz] = pointAt(motion.path, u);

  // A central difference over a millisecond, so a constant-speed path reports a
  // velocity and a still one reports zero.
  const before = pointAt(motion.path, easedAt(motion, clockMs - 1));
  const after = pointAt(motion.path, easedAt(motion, clockMs + 1));
  const vx = ((after[0] - before[0]) / 2) * 1_000;
  const vy = ((after[1] - before[1]) / 2) * 1_000;
  const vz = ((after[2] - before[2]) / 2) * 1_000;

  const spin = motion.spin;
  let angle = 0;
  let yaw = 0;
  let axis: [number, number, number] = [0, 1, 0];
  if (spin !== undefined) {
    const unit = unitAxis(spin.axis);
    if (unit !== null) {
      axis = unit;
      if (spin.turnsPerSecond !== undefined) {
        const elapsed = Math.max(0, clockMs - (motion.startAfterMs ?? 0));
        angle = (elapsed / 1_000) * spin.turnsPerSecond * Math.PI * 2;
      } else if (spin.degreesPerMeter !== undefined) {
        angle =
          lengthOf(motion.path) * u * spin.degreesPerMeter * (Math.PI / 180);
      }
      if (Math.abs(unit[1]) > 0.999) {
        yaw = angle * Math.sign(unit[1]);
      }
    }
  }
  return {
    dx,
    dy,
    dz,
    yaw,
    spinAxis: axis,
    spinAngle: angle,
    vx,
    vy,
    vz,
  };
};
`,iS=`// The seam a place's creator code runs behind, and the vocabulary its inputs
// and outputs cross in. A sandbox isolates one script: the code is loaded once,
// then stepped deterministically — every peer hands it the same shared clock
// and the same event batch each step — and anything it wants to do to the world
// is spoken, never performed: effects are queued as JSON payloads for the
// trusted side to validate and apply. The sandbox itself has no access to the
// world; it only has the handful of functions this module declares.

/** One effect a script asked for, still to be validated and applied. */
export interface ScriptEffect {
  /** What the effect is, in the world host's vocabulary. */
  tag: string;
  /** The effect's arguments, as a JSON string. */
  payload: string;
}

/** What a step left behind for the trusted side to read. */
export interface ScriptOutput {
  effects: ScriptEffect[];
  /** Lines the script asked to be logged, in the order it logged them. */
  logs: string[];
}

/** Why a step or a load failed inside the sandbox. */
export type ScriptErrorKind = "interrupt" | "memory" | "exception" | "fatal";

/** A step or load that failed, with the sandbox's own word for why. */
export class ScriptExecutionError extends Error {
  readonly kind: ScriptErrorKind;

  constructor(kind: ScriptErrorKind, message: string) {
    super(message);
    this.name = "ScriptExecutionError";
    this.kind = kind;
  }
}

/**
 * One isolated script. Implementations pair a real sandbox (today the QuickJS
 * interpreter compiled to WASM) with the deterministic contract every peer must
 * be able to reproduce.
 */
export interface ScriptSandbox {
  /**
   * Loads the script's source. The code runs with the deterministic globals in
   * place and registers its hooks by importing \`engine\` and calling
   * \`engine.onTick(fn)\` — \`fn\` is then called each step with the shared clock
   * and a JSON array of the events added since the last step — and, if it
   * wants one, \`engine.onPlan(fn)\`.
   *
   * @throws {ScriptExecutionError} When the code throws, overruns its step
   * budget while loading, or exceeds its memory.
   */
  load(source: string): void;
  /**
   * Advances the script one step: calls every function registered with
   * \`engine.onTick\`, in the order it was registered, with \`clockMs\` and
   * \`eventsJson\`. Both are supplied by the caller and must be identical on
   * every peer for the script to converge.
   *
   * @throws {ScriptExecutionError} When a handler throws, overruns the step
   * budget, or exceeds the memory limit. A handler after the one that threw
   * does not run.
   */
  tick(clockMs: number, eventsJson: string): void;
  /**
   * Runs the function most recently registered with \`engine.onPlan(fn)\`,
   * called with \`contextJson\`, and returns the string it returns — the
   * structure plan a world is generated with. A script that never calls
   * \`engine.onPlan\` returns an empty string, which the caller reads as no
   * structures.
   *
   * @throws {ScriptExecutionError} When the handler throws, overruns the step
   * budget, or exceeds the memory limit.
   */
  plan(contextJson: string): string;
  /** Whatever the script emitted since the last drain, cleared by the call. */
  drain(): ScriptOutput;
  /** Releases the interpreter and its memory. A disposed sandbox is unusable. */
  dispose(): void;
}

/** How a sandbox is told what time it is, kept injectable for determinism. */
export interface SandboxClock {
  /** The shared time source for this sandbox, in milliseconds. */
  now(): number;
}
`,oS=`// Script events: the replicated fact vocabulary a place's derived rules fold
// over. Each event is an immutable fact — an id, the moment on a clock every
// peer in the place shares, the peer that produced it, and the kind's own
// payload — so any peer can replay the same event set in the same total order
// and compute the same rule state. An event is created once, on the peer that
// observed it, and travels with its id so a duplicate arrival is dropped
// rather than re-applied. The payload keys and their bounds are the contract
// the mesh broadcast and the atproto record both validate against, the same
// way \`multiplayer/messages.ts\` bounds every wire field.

/** One script event kind; the vocabulary of facts a rule may react to. */
export type ScriptEventPayload =
  | {
      kind: "block-broken";
      /** The LOD-0 world voxel that was broken. */
      voxel: [number, number, number];
      /** The voxel id that was there before the break. */
      blockId: number;
    }
  | {
      kind: "block-placed";
      /** The LOD-0 world voxel that was filled. */
      voxel: [number, number, number];
      /** The voxel id that was placed there. */
      blockId: number;
    }
  | {
      kind: "entity-killed";
      /** The id of the entity that died. */
      entityId: string;
      /** The DID of the player whose action killed it, or "" for a hazard kill. */
      by: string;
    }
  | {
      kind: "player-joined";
      /** The DID of the player who joined the place. */
      player: string;
    }
  | {
      kind: "player-left";
      /** The DID of the player who left the place. */
      player: string;
    }
  | {
      kind: "entity-used";
      /** The id of the NPC or prop the player used. */
      entityId: string;
      /** The item id the player used on it, or "" for a bare use. */
      item: string;
    }
  | {
      kind: "entity-hit";
      /** The id of the NPC a weapon struck. */
      entityId: string;
      /** Hit points the strike carried. */
      amount: number;
      /** Where the attacker stood when the strike landed, in world units. */
      attackerX: number;
      attackerZ: number;
    }
  | {
      kind: "item-used";
      /** The id of the item the player used on its own. */
      item: string;
    }
  | {
      kind: "zone-entered";
      /** The id of the zone a player stepped into. */
      zoneId: string;
    }
  | {
      kind: "zone-left";
      /** The id of the zone a player stepped out of. */
      zoneId: string;
    }
  | {
      kind: "npc-talk";
      /** The id of the NPC the player started talking to. */
      npcId: string;
    }
  | {
      kind: "npc-choose";
      /** The id of the NPC the player was talking to. */
      npcId: string;
      /** The index into the options the dialog showed, so a rule can tell one choice from another. */
      option: number;
    }
  | {
      kind: "npc-leave";
      /** The id of the NPC the player stopped talking to. */
      npcId: string;
    }
  | {
      kind: "timer";
      /** The id a script gave the deadline it set with a \`timer\` effect. */
      timerId: string;
    }
  | {
      kind: "player-touched";
      /** The id of the hazardous prop a player came into contact with. */
      entityId: string;
    }
  | {
      kind: "player-died";
      /** The id of the hazard that killed the player, or "" for a fall or void. */
      cause: string;
    };

/** One immutable script fact, stamped with where it came from and when. */
export type ScriptEvent = ScriptEventPayload & {
  /** Producer-unique event id; duplicates of an id are dropped on merge. */
  id: string;
  /** Milliseconds on the clock shared by every peer, which drives total order. */
  at: number;
  /** DID of the client the event originated on. */
  producer: string;
};

/** Distance from the origin an event may address a voxel, in LOD-0 grid units. */
export const MAX_EVENT_COORD = 100_000;
/** Voxel ids live in a \`Uint8Array\` store, so 0..255 covers every id. */
export const MAX_EVENT_BLOCK_ID = 255;
/** Longest event id and entity id a fact may name. */
export const MAX_EVENT_ID = 64;
/** Longest item id an event may name. */
export const MAX_EVENT_ITEM = 64;
/** Longest producer or player string an event may carry (a DID). */
export const MAX_EVENT_PLAYER = 256;
/** The highest option index an \`npc-choose\` may carry. */
export const MAX_NPC_CHOICE = 32;
/** The most hit points one \`entity-hit\` may carry. */
export const MAX_ENTITY_HIT_AMOUNT = 1_000;
/** The furthest an \`entity-hit\`'s attacker position may read, in world units. */
export const MAX_ENTITY_HIT_COORD = 1_000_000;

const isVoxel = (v: unknown): v is [number, number, number] => {
  if (!Array.isArray(v) || v.length !== 3) {
    return false;
  }
  return v.every(
    (n) =>
      typeof n === "number" &&
      Number.isInteger(n) &&
      Math.abs(n) <= MAX_EVENT_COORD,
  );
};

const isShortString = (v: unknown, max: number): boolean =>
  typeof v === "string" && v.length >= 1 && v.length <= max;

const isEntityCoord = (v: unknown): boolean =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  Math.abs(v) <= MAX_ENTITY_HIT_COORD;

const isPlayer = (v: unknown): boolean => isShortString(v, MAX_EVENT_PLAYER);

/**
 * Whether \`v\` is a well-formed script event. A peer's event bytes are
 * untrusted input that gets applied straight to the shared log, so every field
 * is bounded the way \`multiplayer/messages.ts\` bounds its wire types.
 */
export const isScriptEvent = (v: unknown): v is ScriptEvent => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  if (!isShortString(r.id, MAX_EVENT_ID)) {
    return false;
  }
  if (!isPlayer(r.producer)) {
    return false;
  }
  if (typeof r.at !== "number" || !Number.isFinite(r.at) || r.at < 0) {
    return false;
  }
  if (r.kind === "block-broken" || r.kind === "block-placed") {
    return (
      isVoxel(r.voxel) &&
      typeof r.blockId === "number" &&
      Number.isInteger(r.blockId) &&
      r.blockId >= 0 &&
      r.blockId <= MAX_EVENT_BLOCK_ID
    );
  }
  if (r.kind === "entity-killed") {
    return (
      isShortString(r.entityId, MAX_EVENT_ID) && (r.by === "" || isPlayer(r.by))
    );
  }
  if (r.kind === "player-joined" || r.kind === "player-left") {
    return isPlayer(r.player);
  }
  if (r.kind === "entity-used") {
    return (
      isShortString(r.entityId, MAX_EVENT_ID) &&
      (r.item === "" || isShortString(r.item, MAX_EVENT_ITEM))
    );
  }
  if (r.kind === "entity-hit") {
    return (
      isShortString(r.entityId, MAX_EVENT_ID) &&
      typeof r.amount === "number" &&
      Number.isFinite(r.amount) &&
      r.amount > 0 &&
      r.amount <= MAX_ENTITY_HIT_AMOUNT &&
      isEntityCoord(r.attackerX) &&
      isEntityCoord(r.attackerZ)
    );
  }
  if (r.kind === "item-used") {
    return isShortString(r.item, MAX_EVENT_ITEM);
  }
  if (r.kind === "zone-entered" || r.kind === "zone-left") {
    return isShortString(r.zoneId, MAX_EVENT_ID);
  }
  if (r.kind === "npc-talk" || r.kind === "npc-leave") {
    return isShortString(r.npcId, MAX_EVENT_ID);
  }
  if (r.kind === "timer") {
    return isShortString(r.timerId, MAX_EVENT_ID);
  }
  if (r.kind === "player-touched") {
    return isShortString(r.entityId, MAX_EVENT_ID);
  }
  if (r.kind === "player-died") {
    return r.cause === "" || isShortString(r.cause, MAX_EVENT_ID);
  }
  if (r.kind === "npc-choose") {
    return (
      isShortString(r.npcId, MAX_EVENT_ID) &&
      typeof r.option === "number" &&
      Number.isInteger(r.option) &&
      r.option >= 0 &&
      r.option <= MAX_NPC_CHOICE
    );
  }
  return false;
};

/** Serializes a batch of events to the compact JSON form they travel in. */
export const encodeScriptEvents = (events: ScriptEvent[]): string =>
  JSON.stringify(events);

/**
 * Parses a serialized batch back into validated events, or null when the chunk
 * is malformed or holds an event that fails validation. The wire chunk and the
 * atproto record body both arrive here before anything applies them.
 */
export const decodeScriptEvents = (chunk: unknown): ScriptEvent[] | null => {
  let parsed: unknown;
  if (typeof chunk === "string" || chunk instanceof Uint8Array) {
    try {
      parsed = JSON.parse(
        typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk),
      );
    } catch {
      return null;
    }
  } else {
    parsed = chunk;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }
  return parsed.every(isScriptEvent) ? (parsed as ScriptEvent[]) : null;
};

const orderBy = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The deterministic total order events are folded over: by moment on the shared
 * clock, ties by producer DID, then by id, so any peer ordering the same event
 * set arrives at the same sequence.
 */
export const compareScriptEvents = (a: ScriptEvent, b: ScriptEvent): number =>
  a.at - b.at || orderBy(a.producer, b.producer) || orderBy(a.id, b.id);
`,Pr="main.ts",aS="voxelscape.d.ts",lS=tS,LN={[aS]:lS,"effects.ts":nS,"cutscene.ts":rS,"motion.ts":sS,"sandbox.ts":iS,"events.ts":oS},cS=`import { createNpc, dispatch, log, onTick } from "voxelscape";

let started = false;

onTick((clockMs, events) => {
  if (!started) {
    started = true;
    createNpc({ id: "guide", x: 8, z: 8, name: "Guide" });
    log("your place started");
  }
  for (const event of events) {
    if (event.kind === "npc-talk") {
      dispatch("toast", { player: event.producer, text: "Hello, traveller." });
    }
  }
});
`,Gu=t=>({manifest:{name:"",seed:t,spawn:[0,0,0],scripts:[Pr],mode:"solo:edit"},scripts:{[Pr]:cS},models:{}}),Pa=async t=>{const e=new ql,n=Object.keys(t.scripts),r=Object.keys(t.models),s={...t.manifest,scripts:n};r.length>0&&(s.models=r),e.file(uo,JSON.stringify(s));for(const[o,a]of Object.entries(t.scripts))e.file(o,a);for(const[o,a]of Object.entries(t.models))e.file(o,a);const i=await e.generateAsync({type:"arraybuffer"});return new Blob([i],{type:Hu})},qd=async t=>{const e=await Gy(t),n=await ql.loadAsync(await t.arrayBuffer()),r={};for(const i of e.scripts??[])r[i]=await n.file(i).async("text");const s={};for(const i of e.models??[])s[i]=new Uint8Array(await n.file(i).async("arraybuffer"));return{manifest:e,scripts:r,models:s}},uS=`// A data table driving many props of different models (\`FURNITURE\`,
// \`PICKUPS\`, \`ITEM_MODELS\`) types its model column as the whole
// \`keyof ModelsByName\` union rather than one specific literal, since which
// model a given row names is itself the data.
import {
  blocks,
  createNpc,
  createProp,
  dispatch,
  onPlan,
  onTick,
  type ModelsByName,
} from "voxelscape";

// The structure plan is drawn in LOD-0 voxel coordinates, so \`GROUND\` is a
// voxel row: 30 voxels down the world puts the walkable surface at world y 60
// and the player's feet at 62. Every prop and item below is placed in world
// units, which is why \`FLOOR\` is 62.
const GROUND = 30;
const FLOOR = 62;

const BEDROOM = "bedroom";
const BATHROOM = "bathroom";
const LIVING = "living";
const KITCHEN = "kitchen";
const STORE = "store";

const DAD = "dad";
const CASHIER = "cashier";

let started = false;
let cash = 0;
let chipsEaten = false;
/** Whether Dad was woken by the chips and is now looking for the player. */
let dadAwake = false;
let fridgeUsed = false;
let sodas = 0;
let plateA: string | null = null;
let plateB: string | null = null;
/** The item the script last told the world the player is holding. */
let held = "";
/** What rests on the stove, whether it is on, and whether the egg is cooked. */
let stoveItem: string | null = null;
let stoveOn = false;
let stoveCooked = false;
let fireLit = false;
/** The store good sitting on the counter waiting to be bought. */
let counterItem: string | null = null;
let cashierOnBreak = false;
/** The store goods the player has paid for, so they are no longer stolen. */
const paid = new Set<string>();
const inZone: Record<string, boolean> = {};
const hinted: Record<string, boolean> = {};

/**
 * The rooms as \`[id, minX, minZ, maxX, maxZ]\` in world units, in the order the
 * script declares their zones. The first the player stands in is their room.
 */
const ROOMS: Array<[string, number, number, number, number]> = [
  [BEDROOM, -28, -24, 0, 0],
  [BATHROOM, -28, 0, 0, 24],
  [LIVING, 0, -24, 28, 0],
  [KITCHEN, 0, 0, 28, 24],
  [STORE, 52, -16, 72, 16],
];

/** The house and store: floor, walls, doorways, and a wood roof. */
function walls(): unknown[] {
  const b = blocks;
  const w = (
    id: number,
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
  ): unknown => ({
    kind: "box",
    min: [minX, GROUND + 1, minZ],
    max: [maxX, GROUND + 3, maxZ],
    id,
  });
  return [
    // house shell in red brick, front door on the east wall
    w(b.brick, -14, -12, -14, 12),
    w(b.brick, -14, 12, 14, 12),
    w(b.brick, -14, -12, 14, -12),
    w(b.brick, 14, -12, 14, -8),
    w(b.brick, 14, -5, 14, 12),
    // interior cross in a lighter stone, a doorway on each arm
    w(b.greystone, 0, -12, 0, -7),
    w(b.greystone, 0, -5, 0, 5),
    w(b.greystone, 0, 7, 0, 12),
    w(b.greystone, -14, 0, -7, 0),
    w(b.greystone, -5, 0, 5, 0),
    w(b.greystone, 7, 0, 14, 0),
    // store shell in grey stone, door on the west wall
    w(b.greystone, 26, -8, 26, -7),
    w(b.greystone, 26, -5, 26, 8),
    w(b.greystone, 36, -8, 36, 8),
    w(b.greystone, 26, -8, 36, -8),
    w(b.greystone, 26, 8, 36, 8),
  ];
}

onPlan(() => {
  const b = blocks;
  const shapes: unknown[] = [
    { kind: "box", min: [-80, 0, -80], max: [80, GROUND - 1, 80], id: b.dirt },
    {
      kind: "box",
      min: [-80, GROUND, -80],
      max: [80, GROUND, 80],
      id: b.grass,
    },
    // raze whatever the terrain raised over the neighbourhood
    { kind: "box", min: [-80, GROUND + 1, -80], max: [80, 160, 80], id: 0 },
    // floors and the path from the house to the store
    {
      kind: "box",
      min: [-14, GROUND, -12],
      max: [14, GROUND, 12],
      id: b.ice,
    },
    {
      kind: "box",
      min: [26, GROUND, -8],
      max: [36, GROUND, 8],
      id: b.greystone,
    },
    {
      kind: "road",
      from: [14, GROUND, -6],
      to: [26, GROUND, -6],
      width: 5,
      id: b.greystone,
    },
    ...walls(),
    // roofs
    {
      kind: "box",
      min: [-14, GROUND + 4, -12],
      max: [14, GROUND + 4, 12],
      id: b.wood,
    },
    {
      kind: "box",
      min: [26, GROUND + 4, -8],
      max: [36, GROUND + 4, 8],
      id: b.wood,
    },
  ];
  return JSON.stringify(shapes);
});

function say(text: string): void {
  dispatch("toast", { player: "", text });
}

function narrate(name: string, text: string): void {
  dispatch("narrate", { player: "", name, text });
}

function hold(item: string): void {
  dispatch("item-hold", { player: "", item });
  held = item;
}

function give(item: string, text: string): void {
  dispatch("item-give", { player: "", item, count: 1 });
  hold(item);
  if (text !== "") {
    say(text);
  }
}

function ending(title: string, text: string): void {
  dispatch("ending", { player: "", title, text });
}

function room(): string {
  for (const [id] of ROOMS) {
    if (inZone[id]) {
      return id;
    }
  }
  return "outside";
}

const ITEM_NAMES: Record<string, string> = {
  chips: "Chips",
  orange: "Orange",
  colgate: "Colgate",
  cola: "Bloxy Cola",
  egg: "Egg",
  friedegg: "Fried Egg",
  juice: "Orange Juice",
  milk: "Milk",
};

/** The rm-stacker model each item wears when it rests somewhere. */
const ITEM_MODELS: Record<string, keyof ModelsByName> = {
  chips: "chips",
  orange: "orange",
  colgate: "colgate",
  cola: "cola",
  egg: "egg",
  friedegg: "friedegg",
  juice: "juice",
  milk: "milk",
};

/** What the store sells, and for how much cash. */
const STORE_PRICES: Record<string, number> = {
  cola: 5,
  egg: 25,
  juice: 30,
  milk: 30,
};
const STORE_GOODS = new Set(Object.keys(STORE_PRICES));

/** The store pickup props, and which good each one puts in the player's hands. */
const STORE_PICKUPS: Record<string, string> = {
  "buy-cola": "cola",
  "buy-egg": "egg",
  "buy-juice": "juice",
  "buy-milk": "milk",
};

/** Where Dad comes to when the chips wake him, per room, as \`[x, z, yaw]\`. */
const DAD_SPOTS: Record<string, [number, number, number]> = {
  [KITCHEN]: [8, 14, Math.PI],
  [BATHROOM]: [-22, 10, Math.PI],
  [LIVING]: [8, -6, Math.PI],
};

/** Where fire climbs the kitchen once something on the stove catches. */
const FIRE_SPOTS: Array<[number, number, number]> = [
  [10, 18, 3.5],
  [14, 18, 3],
  [12, 22, 4],
  [8, 20, 2.5],
  [16, 20, 3],
  [12, 16, 2.5],
];

/** The good a store item is a form of, so a cooked egg is still "the egg". */
function goodOf(item: string): string {
  return item === "friedegg" ? "egg" : item;
}

/** Whether the player is carrying a store good they never paid for. */
function stealing(item: string): boolean {
  return item !== "" && STORE_GOODS.has(item) && !paid.has(goodOf(item));
}

/** What a full pair of plates means, as \`[ending title, ending text]\`. */
function plateResult(a: string, b: string): [string, string] {
  const pair = [a, b].sort().join("+");
  if (pair === "friedegg+juice") {
    return [
      "Breakfast",
      "Perfect Breakfast. A fried egg with a glass of orange juice.",
    ];
  }
  if (pair === "egg+juice") {
    return [
      "Breakfast",
      "Decent Breakfast. A raw egg and orange juice. The notes said to cook it.",
    ];
  }
  if (pair === "chips+cola") {
    return ["Breakfast", "Epic Breakfast. Chips and a soda."];
  }
  if (pair === "cola+friedegg") {
    return ["Breakfast", "Almost Breakfast. A fried egg and a soda."];
  }
  if (pair === "colgate+juice") {
    return ["Breakfast", "NO!!! Toothpaste and orange juice."];
  }
  if (pair === "cola+cola") {
    return ["Breakfast", "Literally just sodas."];
  }
  return ["Breakfast", "Breakfast? ...It is food, at least."];
}

/** The furniture and fixtures: solid props the player walks around and onto. */
const FURNITURE: Array<
  [string, keyof ModelsByName, number, number, number, string]
> = [
  ["bed", "bed", -22, -14, 0.5, "Bed"],
  ["bathtub", "bathtub", -22, 14, 1, "Bathtub"],
  ["sofa", "sofa", 20, -20, 1.2, "Sofa"],
  ["tv", "tv", 26, -20, 1.2, "TV"],
  ["living-table", "table", 20, -8, 1, "Table"],
  ["counter", "counter", 20, 6, 1.5, "Counter"],
  ["stove", "stove", 12, 20, 1.5, "Stove"],
  ["fridge", "fridge", 26, 20, 3, "Fridge"],
  ["kitchen-table", "table", 8, 10, 1, "Table"],
  ["bench", "bench", 44, 12, 0.8, "Bench"],
  ["vending", "vending", 48, -12, 3.5, "Vending Machine"],
  ["manhole", "manhole", 30, -12, 0.2, "Manhole"],
  ["trash", "trash", 46, -8, 1.2, "Trash Can"],
  ["register", "register", 62, 2, 1, "Register"],
  ["store-counter", "counter", 60, 2, 1.5, "Counter"],
  ["shelf-1", "shelf", 68, -6, 3, "Shelf"],
  ["shelf-2", "shelf", 68, 4, 3, "Shelf"],
];

/** Small things lying about: pickups and the plates, none of them solid. */
const PICKUPS: Array<
  [string, keyof ModelsByName, number, number, number, number]
> = [
  ["chips", "chips", 20, 6, 63.5, 0.6],
  ["orange", "orange", 8, 10, 63, 0.4],
  ["colgate", "colgate", -22, 8, FLOOR, 0.6],
  ["cola", "cola", 24, 18, FLOOR, 0.7],
  ["plate1", "plate", 19, 6, 63.5, 0.15],
  ["plate2", "plate", 21, 6, 63.5, 0.15],
  ["buy-cola", "cola", 66, -6, FLOOR, 0.7],
  ["buy-egg", "egg", 66, -4, FLOOR, 0.4],
  ["buy-juice", "juice", 66, -2, FLOOR, 0.7],
  ["buy-milk", "milk", 66, 0, FLOOR, 0.7],
  // cash: Tix are a dollar, Robux five. Enough here to afford an egg and a
  // full breakfast, with the hundred-cash milestone reachable by picking up all.
  ["tix-1", "tix", -24, -20, FLOOR, 0.3],
  ["tix-2", "tix", -20, -20, FLOOR, 0.3],
  ["tix-3", "tix", -2, -2, FLOOR, 0.3],
  ["tix-4", "tix", 2, -2, FLOOR, 0.3],
  ["tix-5", "tix", -2, 2, FLOOR, 0.3],
  ["tix-6", "tix", 2, 2, FLOOR, 0.3],
  ["tix-7", "tix", -24, 4, FLOOR, 0.3],
  ["tix-8", "tix", -20, 4, FLOOR, 0.3],
  ["tix-9", "tix", -16, 4, FLOOR, 0.3],
  ["tix-10", "tix", -24, 8, FLOOR, 0.3],
  ["tix-11", "tix", 4, -20, FLOOR, 0.3],
  ["tix-12", "tix", 8, -20, FLOOR, 0.3],
  ["tix-13", "tix", 12, -20, FLOOR, 0.3],
  ["tix-14", "tix", 16, -20, FLOOR, 0.3],
  ["robux-1", "robux", -8, 20, FLOOR, 0.3],
  ["robux-2", "robux", -12, 20, FLOOR, 0.3],
  ["robux-3", "robux", 4, -4, FLOOR, 0.3],
  ["robux-4", "robux", 8, -4, FLOOR, 0.3],
  ["robux-5", "robux", 12, -4, FLOOR, 0.3],
  ["robux-6", "robux", 16, -4, FLOOR, 0.3],
  ["robux-7", "robux", 4, 4, FLOOR, 0.3],
  ["robux-8", "robux", 8, 4, FLOOR, 0.3],
  ["robux-9", "robux", 12, 4, FLOOR, 0.3],
  ["robux-10", "robux", 16, 4, FLOOR, 0.3],
];

function open(): void {
  dispatch("time", { seconds: 900, speed: 0 });
  for (const [id, name] of Object.entries(ITEM_NAMES)) {
    dispatch("item-define", { id, name, sprite: "", stackable: true });
  }
  for (const [id, minX, minZ, maxX, maxZ] of ROOMS) {
    dispatch("zone", {
      id,
      name: id,
      min: [minX, FLOOR, minZ],
      max: [maxX, FLOOR + 12, maxZ],
    });
  }
  for (const [id, model, x, z, height, name] of FURNITURE) {
    // Every fixture stands on the floor: grounded by \`heightAt\` it would land
    // on the roof once the house is built, which is what a restart showed.
    createProp({
      id,
      model,
      x,
      z,
      y: FLOOR,
      name,
      height,
      solid: true,
    });
  }
  for (const [id, model, x, z, y, height] of PICKUPS) {
    createProp({
      id,
      model,
      x,
      z,
      y,
      name: ITEM_NAMES[id] ?? id,
      height,
      solid: false,
    });
  }
  createNpc({
    id: DAD,
    x: -20,
    z: 16,
    y: FLOOR,
    name: "Father Figure",
    model: "npc-sable",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: CASHIER,
    x: 63,
    z: 3,
    y: FLOOR,
    name: "Cashier",
    model: "npc-rook",
    yaw: Math.atan2(60 - 63, 2 - 3),
  });
  // The cashier works for a while, then takes an indefinite break outside. Once
  // he is gone the shelves are unattended and nothing counts as theft.
  dispatch("timer", { id: "cashier-break", afterMs: 120_000 });
}

function hintFor(zone: string): void {
  if (zone === BEDROOM) {
    narrate(
      "You",
      "It is 4 AM and I am starving. Find a snack... and try not to wake Dad.",
    );
  } else if (zone === BATHROOM) {
    narrate("You", "Dad is asleep in the bathtub. Keep it down.");
  } else if (zone === KITCHEN) {
    narrate(
      "You",
      "The kitchen. Chips on the counter, an orange on the table, and a stove.",
    );
  } else if (zone === LIVING) {
    narrate("You", "The front door is open. The store is down the path.");
  } else if (zone === STORE) {
    narrate(
      "Cashier",
      "Welcome to a generic convenience store. We are open 24 hours.",
    );
  }
}

/** Picks a store good up; it is still unpaid until the cashier rings it up. */
function takeStoreGood(entityId: string): void {
  const item = STORE_PICKUPS[entityId];
  dispatch("prop-remove", { id: entityId });
  give(
    item,
    "You take the " + ITEM_NAMES[item] + ". Set it on the counter to pay.",
  );
}

/** Sets the held store good on the counter, ready for the cashier to ring up. */
function useStoreCounter(item: string): void {
  if (item === "") {
    narrate("You", "The counter is empty.");
    return;
  }
  if (!STORE_GOODS.has(item)) {
    say("The cashier only rings up store items.");
    return;
  }
  if (counterItem !== null) {
    say("There is already something on the counter.");
    return;
  }
  dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  createProp({
    id: "counter-item",
    model: ITEM_MODELS[item],
    x: 60,
    z: 2,
    y: FLOOR + 1.5,
    name: ITEM_NAMES[item],
    height: 0.5,
    solid: false,
  });
  counterItem = item;
  say(
    "You set the " + ITEM_NAMES[item] + " on the counter. Talk to the cashier.",
  );
}

/** Rings up whatever sits on the counter, if the player can afford it. */
function purchase(): void {
  const good = counterItem;
  if (good === null) {
    return;
  }
  const price = STORE_PRICES[good];
  if (cash < price) {
    dispatch("dialog-close", { player: "", npcId: CASHIER });
    say("You do not have enough cash for the " + ITEM_NAMES[good] + ".");
    return;
  }
  cash -= price;
  paid.add(good);
  counterItem = null;
  dispatch("prop-remove", { id: "counter-item" });
  dispatch("dialog-close", { player: "", npcId: CASHIER });
  give(
    good,
    "The cashier takes your money. (-$" + price + ", $" + cash + " left)",
  );
}

/** Places a held item on a plate, or takes one back off an empty plate. */
function usePlate(slot: number, item: string): void {
  const current = slot === 0 ? plateA : plateB;
  const propId = "plate-item-" + slot;
  const x = slot === 0 ? 19 : 21;
  if (item === "") {
    if (current === null) {
      narrate("You", "That plate is empty.");
      return;
    }
    dispatch("prop-remove", { id: propId });
    if (slot === 0) {
      plateA = null;
    } else {
      plateB = null;
    }
    give(current, "You take the " + ITEM_NAMES[current] + " off the plate.");
    return;
  }
  if (current !== null) {
    say("There is already " + ITEM_NAMES[current] + " on that plate.");
    return;
  }
  dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  createProp({
    id: propId,
    model: ITEM_MODELS[item],
    x,
    z: 6,
    y: 63.6,
    name: ITEM_NAMES[item],
    height: 0.5,
    solid: false,
  });
  if (slot === 0) {
    plateA = item;
  } else {
    plateB = item;
  }
  say("You set the " + ITEM_NAMES[item] + " on the plate.");
  if (plateA !== null && plateB !== null) {
    const [title, text] = plateResult(plateA, plateB);
    ending(title, text);
  }
}

/** Puts a held item on the stove, turns it on, or takes a cooked one back. */
function useStove(item: string): void {
  if (item !== "") {
    if (stoveItem !== null) {
      say("There is already something on the stove.");
      return;
    }
    dispatch("item-take", { player: "", item, count: 1 });
    hold("");
    createProp({
      id: "stove-item",
      model: ITEM_MODELS[item],
      x: 12,
      z: 20,
      y: 63.5,
      name: ITEM_NAMES[item],
      height: 0.5,
      solid: false,
    });
    stoveItem = item;
    stoveCooked = false;
    stoveOn = true;
    narrate(
      "You",
      "You set the " + ITEM_NAMES[item] + " on the stove and turn it on.",
    );
    // An egg cooks; anything else eventually catches and takes the kitchen.
    dispatch("timer", {
      id: item === "egg" ? "cook" : "fire",
      afterMs: item === "egg" ? 6_000 : 5_000,
    });
    return;
  }
  if (stoveOn) {
    stoveOn = false;
    narrate("You", "You turn the stove off.");
    return;
  }
  if (stoveItem !== null) {
    const picked = stoveCooked ? "friedegg" : stoveItem;
    dispatch("prop-remove", { id: "stove-item" });
    stoveItem = null;
    stoveCooked = false;
    give(picked, "You take the " + ITEM_NAMES[picked] + " off the stove.");
    return;
  }
  narrate("You", "The stove is off and empty.");
}

/** The egg has been on long enough: swap it for the cooked model. */
function cookEgg(): void {
  if (!stoveOn || stoveItem !== "egg" || stoveCooked) {
    return;
  }
  stoveCooked = true;
  createProp({
    id: "stove-item",
    model: ITEM_MODELS.friedegg,
    x: 12,
    z: 20,
    y: 63.5,
    name: ITEM_NAMES.friedegg,
    height: 0.5,
    solid: false,
  });
  narrate("You", "The egg sizzles and fries.");
}

/** The stove has been on long enough: the kitchen catches fire. */
function ignite(): void {
  if (!stoveOn || stoveItem === null || stoveItem === "egg") {
    return;
  }
  dispatch("prop-remove", { id: "stove-item" });
  stoveItem = null;
  stoveCooked = false;
  fireLit = true;
  for (const [index, [x, z, height]] of FIRE_SPOTS.entries()) {
    dispatch("fire", {
      id: "fire-" + index,
      x,
      z,
      y: FLOOR,
      height,
    });
  }
  narrate("You", "The kitchen catches fire!");
  dispatch("timer", { id: "burn", afterMs: 8_000 });
}

/** What the fire reaches depends on how far the player got. */
function burn(): void {
  if (!fireLit) {
    return;
  }
  if (inZone[STORE]) {
    narrate(
      "Cashier",
      "Is that smoke? Did you leave the stove on? ...Of course you did.",
    );
    return;
  }
  if (
    inZone[KITCHEN] ||
    inZone[LIVING] ||
    inZone[BATHROOM] ||
    inZone[BEDROOM]
  ) {
    ending("Fire", "You were caught in the fire.");
    return;
  }
  ending("Fire", "You watched the house burn down from outside.");
}

/** The cashier leaves the counter for an indefinite break. */
function cashierBreak(): void {
  cashierOnBreak = true;
  createNpc({
    id: CASHIER,
    x: 50,
    z: -14,
    y: FLOOR,
    name: "Cashier",
    model: "npc-rook",
    yaw: Math.PI / 2,
  });
  narrate(
    "You",
    "An alarm sounds. The cashier steps outside for an indefinite break.",
  );
}

/** Wakes Dad and brings him into the room the player just ate in. */
function wakeDad(): void {
  dadAwake = true;
  const [x, z, yaw] = DAD_SPOTS[room()] ?? DAD_SPOTS[KITCHEN];
  createNpc({
    id: DAD,
    x,
    z,
    y: FLOOR,
    name: "Father Figure",
    model: "npc-sable",
    yaw,
  });
  // The script cannot read the player's exact spot, but it can turn them to
  // face where Dad now stands — the cutscene's whole point.
  dispatch("player-face", { player: "", x, z });
  narrate(
    "Father Figure",
    '"You woke me up. I could hear you eating those chips!"',
  );
}

function used(entityId: string, item: string): void {
  if (entityId === "bed") {
    if (dadAwake) {
      ending(
        "Chips",
        'Dad got mad. "You woke me up. I could hear you eating those chips!"',
      );
    } else if (chipsEaten) {
      ending("Sleep", "you succesfully went to sleep :)");
    } else {
      narrate("You", "I am not tired yet. I need a snack first.");
    }
    return;
  }
  if (entityId === "fridge") {
    if (fridgeUsed) {
      say("The fridge is empty now.");
    } else {
      fridgeUsed = true;
      give("cola", "You take a bloxy cola from the fridge.");
    }
    return;
  }
  if (entityId === "stove") {
    useStove(item);
    return;
  }
  if (entityId === "plate1") {
    usePlate(0, item);
    return;
  }
  if (entityId === "plate2") {
    usePlate(1, item);
    return;
  }
  if (entityId === "store-counter") {
    useStoreCounter(item);
    return;
  }
  if (entityId in STORE_PICKUPS) {
    takeStoreGood(entityId);
    return;
  }
  if (entityId === "chips") {
    dispatch("prop-remove", { id: "chips" });
    give("chips", "You pick up the bag of chips.");
    return;
  }
  if (entityId === "orange") {
    narrate("You", "This isn't an ordinary orange...");
    ending("Orange", "uh oh.");
    return;
  }
  if (entityId === "colgate") {
    dispatch("prop-remove", { id: "colgate" });
    give("colgate", "You take the colgate.");
    return;
  }
  if (entityId === "cola") {
    dispatch("prop-remove", { id: "cola" });
    give("cola", "You take the bloxy cola.");
    return;
  }
  if (entityId.startsWith("tix")) {
    dispatch("prop-remove", { id: entityId });
    cash += 1;
    say("You pocket a Tix. ($" + cash + ")");
    return;
  }
  if (entityId.startsWith("robux")) {
    dispatch("prop-remove", { id: entityId });
    cash += 5;
    say("You pocket some Robux. ($" + cash + ")");
    return;
  }
  if (entityId === "vending") {
    if (item === "cola") {
      dispatch("item-take", { player: "", item: "cola", count: 1 });
      hold("");
      sodas += 1;
      say("The machine gurgles happily. (" + sodas + "/8)");
    } else {
      say('The broken machine has a sign taped to it: "feed me sodas".');
    }
    return;
  }
  if (entityId === "manhole") {
    narrate("You", "Someone is down there. Not tonight.");
    return;
  }
  if (entityId === "trash") {
    narrate("You", "A magic trash can. Nothing in here.");
  }
}

/** Eats or drinks the held item, taking it out of the inventory and hand. */
function consume(item: string, text: string): void {
  dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  narrate("You", text);
}

function usedItem(item: string): void {
  if (item === "chips") {
    dispatch("item-take", { player: "", item, count: 1 });
    hold("");
    chipsEaten = true;
    const where = room();
    if (where === BEDROOM || where === "outside") {
      narrate("You", "Not bad. I should get back to sleep.");
    } else {
      wakeDad();
    }
    return;
  }
  if (item === "colgate") {
    ending("Toothpaste", "You consumed the colgate. Do not do that.");
    return;
  }
  if (item === "cola") {
    consume("cola", "Cold, sweet, and full of regret.");
    return;
  }
  if (item === "juice") {
    consume("juice", "A glass of orange juice. Suspiciously fresh.");
    return;
  }
  if (item === "milk") {
    consume("milk", "You drink the milk. It was a long walk for this.");
    return;
  }
  if (item === "egg" || item === "friedegg") {
    narrate("You", "I should put that on a plate, not in my mouth.");
  }
}

function talked(npcId: string, player: string): void {
  if (npcId === DAD) {
    if (dadAwake) {
      narrate("Father Figure", '"Go to bed. Now."');
    } else {
      ending("Wake up Dad", '"no."');
    }
    return;
  }
  if (cashierOnBreak) {
    dispatch("dialog", {
      player,
      npcId: CASHIER,
      prompt:
        "I'm on break. Indefinite. If you wanted to buy something, you should have come earlier.",
      options: ["Understood."],
    });
    return;
  }
  if (counterItem !== null) {
    const price = STORE_PRICES[counterItem];
    dispatch("dialog", {
      player,
      npcId: CASHIER,
      prompt:
        "Do you want to buy this " +
        ITEM_NAMES[counterItem] +
        " for $" +
        price +
        "?",
      options: ["Buy it. ($" + price + ")", "Not right now."],
    });
    return;
  }
  dispatch("dialog", {
    player,
    npcId: CASHIER,
    prompt: "welcome to 'a generic convenience store'. we are open 24 hours.",
    options: ["Where is the food?", "Just looking."],
  });
}

function chose(npcId: string, option: number, player: string): void {
  if (npcId !== CASHIER) {
    return;
  }
  if (counterItem !== null) {
    if (option === 0) {
      purchase();
    } else {
      dispatch("dialog-close", { player, npcId: CASHIER });
    }
    return;
  }
  if (option === 0) {
    say("The cashier points at the shelves on the right.");
  }
  dispatch("dialog-close", { player, npcId: CASHIER });
}

/** Answers a timer the shared clock reached, by the id the script gave it. */
function timer(id: string): void {
  if (id === "cook") {
    cookEgg();
  } else if (id === "fire") {
    ignite();
  } else if (id === "burn") {
    burn();
  } else if (id === "cashier-break") {
    cashierBreak();
  }
}

onTick((_clockMs, events) => {
  if (!started) {
    started = true;
    open();
  }
  for (const event of events) {
    if (event.kind === "zone-entered" && event.zoneId !== undefined) {
      inZone[event.zoneId] = true;
      if (hinted[event.zoneId] !== true) {
        hinted[event.zoneId] = true;
        hintFor(event.zoneId);
      }
    } else if (event.kind === "zone-left" && event.zoneId !== undefined) {
      delete inZone[event.zoneId];
      // Theft is leaving the store with a good that was never rung up.
      if (
        event.zoneId === STORE &&
        !cashierOnBreak &&
        !fireLit &&
        stealing(held)
      ) {
        ending(
          "Shoplifting",
          'The cashier appears in front of you. "You forgot to pay."',
        );
      }
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      used(event.entityId, event.item ?? "");
    } else if (event.kind === "item-used" && event.item !== undefined) {
      usedItem(event.item);
    } else if (event.kind === "npc-talk" && event.npcId !== undefined) {
      talked(event.npcId, event.producer);
    } else if (
      event.kind === "npc-choose" &&
      event.npcId !== undefined &&
      event.option !== undefined
    ) {
      chose(event.npcId, event.option, event.producer);
    } else if (event.kind === "timer" && event.timerId !== undefined) {
      timer(event.timerId);
    }
  }
});
`,dS=`import {
  blocks,
  createNpc,
  createProp,
  dispatch,
  endings,
  onPlan,
  onTick,
} from "voxelscape";

// The structure plan is drawn in LOD-0 voxel coordinates, so \`GROUND\` is a
// voxel row: 30 voxels down the world puts the walkable surface at world y 60
// and the player's feet at 62. Every prop and item below is placed in world
// units, which is why \`FLOOR\` is 62.
const GROUND = 30;
const FLOOR = 62;
/**
 * The LOD-0 voxel row the corrupted dimension is built from, far south of the
 * neighborhood so its ruins never touch the living block.
 */
const CORRUPT_Z = 110;

/** The neighborhood's rooms and buildings, as zone ids. */
const PLAYER_HOUSE = "player-house";
const LAUGH_HOUSE = "laugh-house";
const ALEX_HOUSE = "alex-house";
const JAMES_HOUSE = "james-house";
const STREET = "street";
const SCHOOL = "school";
const CLASSROOM = "classroom";
const CAFETERIA = "cafeteria";
const BEAN_BROS = "bean-bros";
const ARCADE = "arcade";

const LAUGH = "laugh";
const ALEX = "alex";
const JAMES = "james";
const LITTLE_BRO = "littlebro";
const HOMELESS = "homeless";
const BULLY = "bully";
const NERD = "nerd";
const BRIT = "brit";
const BRETT = "brett";
const BRAD = "brad";
const SLEEPA = "sleepa";
const CHAMP = "champ";
const TEACHER = "teacher";
const LEMONADE = "lemonade";
const POTHEAD = "pothead";
const SANTA = "santa";
const OBBY = "obby";
const ANOMALY = "anomaly";

/** The order the corrupted dimension's four house buttons must be pressed in. */
const BUTTON_ORDER = ["blue", "red", "green", "purple"];

/** The dollar value one cash pickup is worth. */
const CASH = 10;
/** What a slushie, a hot dog, and an arcade token cost. */
const SLUSHIE_PRICE = 5;
const HOTDOG_PRICE = 5;
const TOKEN_PRICE = 10;
const LEMONADE_PRICE = 25;
/**
 * The classroom opens once this many endings have been reached. The game asks
 * for fifteen; the demo asks for three, so a newcomer can reach the classroom
 * ending in a single session while the collection is still what gates it.
 */
const CLASSROOM_ENDINGS = 3;

let started = false;
let money = 0;
/** The item the script last told the world the player is holding. */
let held = "";
/** The ending titles this place has remembered from earlier runs. */
let collected: string[] = [];
/** The first food on the cafeteria plate, and the second. */
let plateA: string | null = null;
let plateB: string | null = null;
/** How many times the player has struck Champ with the roaster. */
let champHits = 0;
/** How many of the corrupted gate's buttons have been pressed in order. */
let buttonProgress = 0;
/** How many times the player has struck The Anomaly with the roaster. */
let anomalyHits = 0;
/** How far through the Nerd's three-question quiz the player is; 0 is not started. */
let quizStage = 0;
/** The food Pot Head is cooking, or "" when nothing is on the grill. */
let cookingFood = "";
/** The three foods Sleepa asked for, and which of them have arrived. */
const sleepaFoods: string[] = [];
const flags: Record<string, boolean> = {};
const inZone: Record<string, boolean> = {};
const hinted: Record<string, boolean> = {};

/** The room and building boxes, as \`[id, minX, minZ, maxX, maxZ]\` in world units. */
const ZONES: Array<[string, number, number, number, number]> = [
  [PLAYER_HOUSE, -24, 4, 0, 28],
  [LAUGH_HOUSE, 4, 4, 28, 28],
  [ALEX_HOUSE, 32, 4, 56, 28],
  [JAMES_HOUSE, 60, 4, 84, 28],
  [STREET, -60, -8, 200, 4],
  [BEAN_BROS, 4, -36, 28, -12],
  [ARCADE, 32, -36, 56, -12],
  [SCHOOL, 68, -44, 116, -4],
  [CLASSROOM, 72, -40, 92, -20],
  [CAFETERIA, 94, -40, 112, -20],
];

/** What each script item is called in the HUD and in the world. */
const ITEM_NAMES: Record<string, string> = {
  plush: "Plush",
  banana: "Banana",
  slushie: "Slushie",
  pizza: "Pizza",
  hotdog: "Hot Dog",
  salad: "Salad",
  taco: "Taco",
  historybook: "History Book",
  key: "Key",
  roaster: "Marshmallow Roaster",
  matches: "Matches",
  litmatches: "Lit Matches",
  hat: "Hat",
  lemonade: "Lemonade",
  foodbag: "Food Bag",
  bean: "Bean",
  token: "Arcade Token",
  cola: "Bloxy Cola",
  chips: "Chips",
};

/** Every item that counts as food, for the homeless kid and the plate. */
const FOODS = ["chips", "pizza", "hotdog", "salad", "taco", "bean"];

function say(text: string): void {
  dispatch("toast", { player: "", text });
}

function narrate(name: string, text: string): void {
  dispatch("narrate", { player: "", name, text });
}

function hold(item: string): void {
  dispatch("item-hold", { player: "", item });
  held = item;
}

function give(item: string, text: string): void {
  dispatch("item-give", { player: "", item, count: 1 });
  hold(item);
  if (text !== "") {
    say(text);
  }
}

function take(item: string, count: number): void {
  dispatch("item-take", { player: "", item, count });
  if (held === item) {
    hold("");
  }
}

function ending(title: string, text: string): void {
  dispatch("ending", { player: "", title, text });
}

function timer(id: string, afterMs: number): void {
  dispatch("timer", { id, afterMs });
}

function dialog(npcId: string, prompt: string, options: string[]): void {
  dispatch("dialog", { player: "", npcId, prompt, options });
}

/** One filled box in LOD-0 voxel coordinates, as the plan speaks it. */
function box(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  id: number,
): unknown {
  return { kind: "box", min: [minX, minY, minZ], max: [maxX, maxY, maxZ], id };
}

/**
 * A one-story building: a floor, a wood roof, four walls, and a two-voxel door
 * carved in the middle of \`door\`. All coordinates are LOD-0 voxels.
 */
function building(
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  floorId: number,
  door: "north" | "south" | "east" | "west",
): unknown[] {
  const b = blocks;
  const roof = GROUND + 4;
  const w0 = GROUND + 1;
  const w1 = GROUND + 3;
  const shapes: unknown[] = [
    box(minX, GROUND, minZ, maxX, GROUND, maxZ, floorId),
    box(minX, roof, minZ, maxX, roof, maxZ, b.wood),
    box(minX, w0, minZ, maxX, w1, minZ, b.brick),
    box(minX, w0, maxZ, maxX, w1, maxZ, b.brick),
    box(minX, w0, minZ + 1, minX, w1, maxZ - 1, b.brick),
    box(maxX, w0, minZ + 1, maxX, w1, maxZ - 1, b.brick),
  ];
  const midX = Math.floor((minX + maxX) / 2);
  const midZ = Math.floor((minZ + maxZ) / 2);
  if (door === "south") {
    shapes.push(box(midX, w0, minZ, midX + 1, w0 + 1, minZ, 0));
  } else if (door === "north") {
    shapes.push(box(midX, w0, maxZ, midX + 1, w0 + 1, maxZ, 0));
  } else if (door === "west") {
    shapes.push(box(minX, w0, midZ, minX, w0 + 1, midZ + 1, 0));
  } else {
    shapes.push(box(maxX, w0, midZ, maxX, w0 + 1, midZ + 1, 0));
  }
  return shapes;
}

onPlan(() => {
  const b = blocks;
  const shapes: unknown[] = [
    // A flat neighborhood over the noise, razed clear above it, reaching south
    // far enough to carry the corrupted dimension too.
    box(-160, 0, -80, 160, GROUND - 1, 140, b.dirt),
    box(-160, GROUND, -80, 160, GROUND, 140, b.grass),
    box(-160, GROUND + 1, -80, 160, 200, 140, 0),
    // The street, running the length of the block.
    {
      kind: "road",
      from: [-60, GROUND, -2],
      to: [200, GROUND, -2],
      width: 4,
      id: b.greystone,
    },
  ];
  // The four houses on the north side, each door facing the street.
  shapes.push(...building(-12, 2, 0, 14, b.ice, "south"));
  shapes.push(...building(2, 2, 14, 14, b.wood, "south"));
  shapes.push(...building(16, 2, 28, 14, b.greystone, "south"));
  shapes.push(...building(30, 2, 42, 14, b.ice, "south"));
  // Bean Bros., the arcade, and the school on the south side.
  shapes.push(...building(2, -18, 14, -6, b.wood, "north"));
  shapes.push(...building(16, -18, 28, -6, b.greystone, "north"));
  shapes.push(...building(34, -22, 58, -2, b.greystone, "north"));
  // The corrupted dimension: the same four houses and school, built in bare
  // stone far to the south, where the true ending's finale plays out.
  shapes.push(
    ...building(-12, CORRUPT_Z + 2, 0, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(2, CORRUPT_Z + 2, 14, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(16, CORRUPT_Z + 2, 28, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(30, CORRUPT_Z + 2, 42, CORRUPT_Z + 14, b.stone, "south"),
  );
  shapes.push(
    ...building(70, CORRUPT_Z + 2, 94, CORRUPT_Z + 14, b.stone, "south"),
  );
  return JSON.stringify(shapes);
});

/** Places the fixtures, pickups, NPCs, and zones the world opens with. */
function open(): void {
  dispatch("time", { seconds: 60, speed: 0 });
  for (const [id, name] of Object.entries(ITEM_NAMES)) {
    dispatch("item-define", { id, name, sprite: "", stackable: true });
  }
  for (const [id, minX, minZ, maxX, maxZ] of ZONES) {
    dispatch("zone", {
      id,
      name: id,
      min: [minX, FLOOR, minZ],
      max: [maxX, FLOOR + 12, maxZ],
    });
  }

  // The player's house: somewhere to sleep, a phone, and the day's things.
  createProp({
    id: "bed",
    model: "bed",
    x: -20,
    z: 22,
    y: FLOOR,
    name: "Bed",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "phone",
    model: "phone",
    x: -2,
    z: 10,
    y: FLOOR,
    name: "Phone",
    height: 1.5,
    solid: false,
  });
  createProp({
    id: "mirror",
    model: "mirror",
    x: -20,
    z: 6,
    y: FLOOR,
    name: "Mirror",
    height: 1.6,
    solid: false,
  });
  createProp({
    id: "bookshelf",
    model: "bookshelf",
    x: -6,
    z: 26,
    y: FLOOR,
    name: "Bookshelf",
    height: 2,
    solid: true,
  });
  createProp({
    id: "player-counter",
    model: "counter",
    x: -2,
    z: 24,
    y: FLOOR,
    name: "Counter",
    height: 1.5,
    solid: true,
  });
  createProp({
    id: "player-fridge",
    model: "fridge",
    x: -6,
    z: 24,
    y: FLOOR,
    name: "Fridge",
    height: 3,
    solid: true,
  });
  createProp({
    id: "player-tv",
    model: "tv",
    x: -16,
    z: 24,
    y: FLOOR,
    name: "TV",
    height: 1.4,
    solid: true,
  });
  createProp({
    id: "player-sofa",
    model: "sofa",
    x: -18,
    z: 18,
    y: FLOOR,
    name: "Sofa",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "player-door",
    model: "door",
    x: -6,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "locked-door",
    model: "door",
    x: -2,
    z: 26,
    y: FLOOR,
    name: "Locked Room",
    height: 2,
    solid: false,
  });
  createProp({
    id: "mailbox",
    model: "mailbox",
    x: -12,
    z: 0,
    y: FLOOR,
    name: "Mailbox",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "historybook",
    model: "historybook",
    x: -4,
    z: 26,
    y: FLOOR + 1.5,
    name: "History Book",
    height: 0.4,
    solid: false,
  });

  // Laugh's house: the fridge, the bed, and the present.
  createProp({
    id: "laugh-fridge",
    model: "fridge",
    x: 24,
    z: 24,
    y: FLOOR,
    name: "Fridge",
    height: 3,
    solid: true,
  });
  createProp({
    id: "laugh-bed",
    model: "bed",
    x: 6,
    z: 24,
    y: FLOOR,
    name: "Bed",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "chair",
    model: "chair",
    x: 10,
    z: 24,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "laugh-door",
    model: "door",
    x: 8,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "alex-door",
    model: "door",
    x: 22,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "james-door",
    model: "door",
    x: 36,
    z: 4.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });

  // The street's furniture.
  createProp({
    id: "lemonade-stand",
    model: "lemonade-stand",
    x: -30,
    z: 2,
    y: FLOOR,
    name: "Lemonade Stand",
    height: 1.6,
    solid: true,
  });
  createProp({
    id: "bus-stop",
    model: "bus-stop",
    x: 60,
    z: 0,
    y: FLOOR,
    name: "Bus Stop",
    height: 1.6,
    solid: false,
  });
  createProp({
    id: "flower",
    model: "flower",
    x: 80,
    z: -2,
    y: FLOOR,
    name: "Flower",
    height: 1,
    solid: false,
  });
  createProp({
    id: "gate",
    model: "gate",
    x: 150,
    z: -2,
    y: FLOOR,
    name: "Gate",
    height: 2,
    solid: true,
  });

  // Bean Bros.: a counter, shelves, and the slushie machine.
  createProp({
    id: "bean-counter",
    model: "counter",
    x: 8,
    z: -16,
    y: FLOOR,
    name: "Counter",
    height: 1.5,
    solid: true,
  });
  createProp({
    id: "bean-shelf-1",
    model: "shelf",
    x: 2,
    z: -14,
    y: FLOOR,
    name: "Shelf",
    height: 2,
    solid: true,
  });
  createProp({
    id: "bean-shelf-2",
    model: "shelf",
    x: 14,
    z: -14,
    y: FLOOR,
    name: "Shelf",
    height: 2,
    solid: true,
  });
  createProp({
    id: "slushie-machine",
    model: "slushie-machine",
    x: 12,
    z: -16,
    y: FLOOR,
    name: "Slushie Machine",
    height: 2.2,
    solid: true,
  });
  createProp({
    id: "bean-door",
    model: "door",
    x: 8,
    z: -6.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });

  // The arcade: cabinets, the boarded machine, and a dumpster outside.
  createProp({
    id: "arcade-1",
    model: "arcade",
    x: 20,
    z: -16,
    y: FLOOR,
    name: "Arcade Machine",
    height: 2.4,
    solid: true,
  });
  createProp({
    id: "arcade-2",
    model: "arcade",
    x: 26,
    z: -16,
    y: FLOOR,
    name: "Arcade Machine",
    height: 2.4,
    solid: true,
  });
  createProp({
    id: "broken-machine",
    model: "boarded-machine",
    x: 23,
    z: -8,
    y: FLOOR,
    name: "Broken Machine",
    height: 2.4,
    solid: true,
  });
  createProp({
    id: "token-atm",
    model: "vending",
    x: 46,
    z: -16,
    y: FLOOR,
    name: "Token ATM",
    height: 2.2,
    solid: true,
  });
  createProp({
    id: "dumpster",
    model: "dumpster",
    x: 30,
    z: -4,
    y: FLOOR,
    name: "Dumpster",
    height: 1.8,
    solid: true,
  });
  createProp({
    id: "arcade-door",
    model: "door",
    x: 22,
    z: -6.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "bench",
    model: "bench",
    x: 50,
    z: -4,
    y: FLOOR,
    name: "Bench",
    height: 1,
    solid: true,
  });

  // The school: desks, lockers, cafeteria tables, and the fighting poster.
  createProp({
    id: "school-door",
    model: "door",
    x: 46,
    z: -2.5,
    y: FLOOR,
    name: "Door",
    height: 2,
    solid: false,
  });
  createProp({
    id: "classroom-door",
    model: "door",
    x: 82,
    z: -20,
    y: FLOOR,
    name: "Classroom",
    height: 2,
    solid: false,
  });
  createProp({
    id: "desk-1",
    model: "desk",
    x: 76,
    z: -30,
    y: FLOOR,
    name: "Desk",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "desk-2",
    model: "desk",
    x: 82,
    z: -30,
    y: FLOOR,
    name: "Desk",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "desk-3",
    model: "desk",
    x: 88,
    z: -30,
    y: FLOOR,
    name: "Desk",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "chair-1",
    model: "chair",
    x: 76,
    z: -26,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "chair-2",
    model: "chair",
    x: 82,
    z: -26,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "chair-3",
    model: "chair",
    x: 88,
    z: -26,
    y: FLOOR,
    name: "Chair",
    height: 1,
    solid: false,
  });
  createProp({
    id: "locker-1",
    model: "locker",
    x: 72,
    z: -34,
    y: FLOOR,
    name: "Locker",
    height: 2,
    solid: true,
  });
  createProp({
    id: "locker-2",
    model: "locker",
    x: 76,
    z: -34,
    y: FLOOR,
    name: "Locker",
    height: 2,
    solid: true,
  });
  createProp({
    id: "cafeteria-table-1",
    model: "cafeteria-table",
    x: 98,
    z: -30,
    y: FLOOR,
    name: "Table",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "cafeteria-table-2",
    model: "cafeteria-table",
    x: 106,
    z: -30,
    y: FLOOR,
    name: "Table",
    height: 1.2,
    solid: true,
  });
  createProp({
    id: "cafeteria-plate",
    model: "plate",
    x: 102,
    z: -26,
    y: FLOOR,
    name: "Plate",
    height: 0.15,
    solid: false,
  });
  createProp({
    id: "fighting-poster",
    model: "poster",
    x: 94,
    z: -20,
    y: FLOOR,
    name: "Fighting Contest",
    height: 1.4,
    solid: false,
  });

  // The finale: the Dimensionator at the arcade, and the corrupted dimension's
  // four house buttons, gate, history book, and portal, far to the south.
  createProp({
    id: "dimensionator",
    model: "arcade",
    x: 40,
    z: -10,
    y: FLOOR,
    name: "Dimensionator",
    height: 2.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-blue",
    model: "poster",
    x: -12,
    z: 240,
    y: FLOOR,
    name: "Blue Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-red",
    model: "poster",
    x: 16,
    z: 240,
    y: FLOOR,
    name: "Red Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-green",
    model: "poster",
    x: 44,
    z: 240,
    y: FLOOR,
    name: "Green Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-button-purple",
    model: "poster",
    x: 72,
    z: 240,
    y: FLOOR,
    name: "Purple Button",
    height: 1.4,
    solid: false,
  });
  createProp({
    id: "corrupt-gate",
    model: "gate",
    x: 150,
    z: 236,
    y: FLOOR,
    name: "Gate",
    height: 2,
    solid: true,
  });
  createProp({
    id: "corrupt-book",
    model: "historybook",
    x: 164,
    z: 236,
    y: FLOOR,
    name: "History Book",
    height: 0.4,
    solid: false,
  });
  createProp({
    id: "corrupt-portal",
    model: "gate",
    x: 200,
    z: 236,
    y: FLOOR,
    name: "Portal",
    height: 2,
    solid: false,
  });

  // The pickups the day begins with.
  createProp({
    id: "plush",
    model: "plush",
    x: -22,
    z: 18,
    y: FLOOR,
    name: "Plush",
    height: 0.6,
    solid: false,
  });
  createProp({
    id: "banana",
    model: "banana",
    x: -20,
    z: -6,
    y: FLOOR,
    name: "Banana",
    height: 0.4,
    solid: false,
  });
  createProp({
    id: "chips",
    model: "chips",
    x: -4,
    z: 22,
    y: FLOOR + 1.5,
    name: "Chips",
    height: 0.5,
    solid: false,
  });
  createProp({
    id: "key",
    model: "key",
    x: -22,
    z: 10,
    y: FLOOR,
    name: "Key",
    height: 0.3,
    solid: false,
  });
  createProp({
    id: "matches",
    model: "matches",
    x: 20,
    z: -20,
    y: FLOOR,
    name: "Matches",
    height: 0.3,
    solid: false,
  });
  const cashSpots: Array<[number, number]> = [
    [-4, 22],
    [72, -34],
    [76, -34],
    [50, -4],
    [98, -30],
    [106, -30],
    [20, -16],
    [2, -14],
  ];
  for (const [index, [x, z]] of cashSpots.entries()) {
    createProp({
      id: \`cash-\${index + 1}\`,
      model: "tix",
      x: x,
      z: z,
      y: FLOOR,
      name: "Cash",
      height: 0.3,
      solid: false,
    });
  }

  createNpc({
    id: LITTLE_BRO,
    x: -16,
    z: 20,
    y: FLOOR,
    name: "Little Brother",
    model: "npc-littlebro",
    yaw: 0,
  });
  createNpc({
    id: LAUGH,
    x: 8,
    z: 20,
    y: FLOOR,
    name: "Laugh",
    model: "npc-laugh",
    yaw: Math.PI,
  });
  createNpc({
    id: ALEX,
    x: 22,
    z: 20,
    y: FLOOR,
    name: "Alex",
    model: "npc-alex",
    yaw: Math.PI,
  });
  createNpc({
    id: JAMES,
    x: 36,
    z: 20,
    y: FLOOR,
    name: "James",
    model: "npc-james",
    yaw: Math.PI,
  });
  createNpc({
    id: BRIT,
    x: 6,
    z: -18,
    y: FLOOR,
    name: "Brit",
    model: "npc-brit",
    yaw: 0,
  });
  createNpc({
    id: BRETT,
    x: 10,
    z: -18,
    y: FLOOR,
    name: "Brett",
    model: "npc-brett",
    yaw: 0,
  });
  createNpc({
    id: BRAD,
    x: 24,
    z: -18,
    y: FLOOR,
    name: "Brad",
    model: "npc-brad",
    yaw: 0,
  });
  createNpc({
    id: HOMELESS,
    x: -6,
    z: 2,
    y: FLOOR,
    name: "Homeless Kid",
    model: "npc-homeless",
    yaw: Math.PI,
  });
  createNpc({
    id: LEMONADE,
    x: -30,
    z: 4,
    y: FLOOR,
    name: "Lemonade Salesperson",
    model: "npc-lemonade",
    yaw: 0,
  });
  createNpc({
    id: SLEEPA,
    x: 50,
    z: -6,
    y: FLOOR,
    name: "Sleepa",
    model: "npc-sleepa",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: BULLY,
    x: 80,
    z: -20,
    y: FLOOR,
    name: "Bully",
    model: "npc-bully",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: NERD,
    x: 84,
    z: -20,
    y: FLOOR,
    name: "Nerd",
    model: "npc-nerd",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: TEACHER,
    x: 80,
    z: -32,
    y: FLOOR,
    name: "Teacher",
    model: "npc-teacher",
    yaw: Math.PI,
  });
  createNpc({
    id: POTHEAD,
    x: 100,
    z: -22,
    y: FLOOR,
    name: "Pot Head",
    model: "npc-pothead",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: CHAMP,
    x: 106,
    z: -34,
    y: FLOOR,
    name: "Champ",
    model: "npc-champ",
    yaw: Math.PI,
  });
  createNpc({
    id: SANTA,
    x: 120,
    z: -10,
    y: FLOOR,
    name: "Santa Claus",
    model: "npc-santa",
    yaw: Math.PI,
  });
  createNpc({
    id: OBBY,
    x: 24,
    z: -10,
    y: FLOOR,
    name: "Obby Master",
    model: "npc-obby",
    yaw: 0,
  });

  if (collected.length > 0) {
    say("Endings found so far: " + collected.join(", ") + ".");
  }
  // The true ending opens once both classroom endings are in the collection,
  // the way the game asks for every ending before the finale.
  flags.finaleReady =
    collected.indexOf("Good Ending") >= 0 &&
    collected.indexOf("Bad Ending") >= 0;
  // The school bell: wait too long and the classroom ending turns bad.
  timer("late", 120_000);
}

function hintFor(zone: string): void {
  if (zone === PLAYER_HOUSE) {
    narrate(
      "You",
      "It is 7:58 AM and school starts at 8. I am going to be late... unless I just go back to sleep.",
    );
  } else if (zone === STREET) {
    narrate(
      "You",
      "The block. My friends' houses, the shops, and school down the road.",
    );
  } else if (zone === BEAN_BROS) {
    narrate(
      "Brett",
      "Welcome to Bean Bros. We sell beans, and drinks with abilities.",
    );
  } else if (zone === ARCADE) {
    narrate(
      "Brad",
      "Welcome to Gamer Zone Arcade. Don't bother me, I'm on break.",
    );
  } else if (zone === SCHOOL) {
    narrate("You", "Y U Dumb Elementary. The classroom door wants endings.");
  }
}

// --- the bed, and the two endings it can hold -----------------------------

/** Uses the bed: sleep is the game's easiest ending, or the chair's. */
function useBed(): void {
  if (flags.sleepy === true) {
    ending(
      "Sit in a Chair",
      "You don't know what Sit in a Chair is? It's a game.",
    );
    return;
  }
  ending(
    "Sleep",
    "You probably wouldn't have been so tired if you didn't stay up all night playing games.",
  );
}

// --- the mailbox and the flower -------------------------------------------

/** The mailbox: the game's rare bomb letter, and the finale's address note. */
function useMailbox(): void {
  if (Math.random() < 0.07) {
    ending("Bombed", "The letter shows a picture of a bomb. ...tsssk.");
    return;
  }
  narrate("You", "A letter: 'Yo, got games on your phone?' Not today.");
}

function useFlower(): void {
  ending(
    "Flowey",
    '"YOU IDIOT!!! YOU HAVE TRIGGERED MY TRUE POWER!!!" The golden flower ascends.',
  );
}

// --- the classroom: the good and bad endings ------------------------------

/** Enters the classroom, good if the collection is large enough and not late. */
function enterClassroom(): void {
  if (flags.late === true) {
    ending(
      "Bad Ending",
      "You're too late. The principal just expelled you for being late for the tenth time in a row.",
    );
    return;
  }
  if (collected.length >= CLASSROOM_ENDINGS) {
    ending(
      "Good Ending",
      "Sorry I took so long. Am I late or what? ...You aren't late. You are early for once.",
    );
    return;
  }
  narrate(
    "Teacher",
    "To enter my class you must have " +
      CLASSROOM_ENDINGS +
      " endings. You have " +
      collected.length +
      ".",
  );
}

// --- the neighborhood quests ----------------------------------------------

/** The Nerd's quiz: three questions, a wait, then the big-brained ending. */
function nerdTalk(): void {
  if (flags.quizReady === true) {
    ending("Big Brained", "You big brain. Straight A students be like.");
    return;
  }
  if (quizStage === 0) {
    dialog(NERD, "Would you like to take my quiz?", ["Sure.", "No, I'm late."]);
    return;
  }
  narrate(
    "Nerd",
    "I'm still looking over your test results. Please be patient.",
  );
}

function nerdChoose(option: number): void {
  // Each question's correct answer sits at a fixed index; a wrong pick resets.
  const answers = [0, 1, 0];
  if (quizStage === 0) {
    if (option === 0) {
      quizStage = 1;
      dialog(NERD, "What is the name of this experience?", [
        "Late to School",
        "The Neighborhood",
        "Piggy",
      ]);
    }
    return;
  }
  if (answers[quizStage - 1] !== option) {
    narrate("Nerd", "Wrong. Come back when you are a little smarter.");
    quizStage = 0;
    return;
  }
  if (quizStage === 3) {
    quizStage = 0;
    narrate(
      "Nerd",
      "You passed without cheating. Take your results and get out.",
    );
    timer("quiz-wait", 8_000);
    return;
  }
  quizStage += 1;
  if (quizStage === 2) {
    dialog(NERD, "Who is the smartest person in this experience?", [
      "Nerd",
      "You",
    ]);
    return;
  }
  dialog(NERD, "What experience is this experience based off of?", [
    "GASA4",
    "Piggy",
  ]);
}

/** The homeless kid: bring any food and the good-person ending lands. */
function homelessTalk(): void {
  if (FOODS.indexOf(held) >= 0) {
    take(held, 1);
    ending(
      "Just being a Good Person!",
      "No one has ever been this nice to me. Like Papris once said, everyone can be a good person if they just try.",
    );
    return;
  }
  if (flags.helping === true) {
    narrate("Homeless Kid", "I'm still hungry. Please, some food?");
    return;
  }
  dialog(
    HOMELESS,
    "I have nowhere else to go. I've lost everyone and everything.",
    ["I'll find you some food.", "Sorry, I'm late for school."],
  );
}

/** Laugh's house: the chair, or the Bean Bros. job, branches here. */
function laughTalk(): void {
  if (flags.chairQuest === true) {
    narrate(
      "Laugh",
      "Go on into my bedroom. It's a surprise from yours truly.",
    );
    return;
  }
  if (flags.attorneyQuest === true) {
    narrate("Laugh", "Let's go to Bean Bros. Follow me.");
    return;
  }
  dialog(LAUGH, "Glad you could come over. So, why did I call you again?", [
    "You wanted to show me something.",
    "We were gonna hang out.",
  ]);
}

function laughChoose(option: number): void {
  if (option === 0) {
    flags.chairQuest = true;
    narrate("Laugh", "Go into my bedroom. It's a present from yours truly.");
    return;
  }
  flags.attorneyQuest = true;
  narrate("Laugh", "Right, we were going to hang out. Let's go to Bean Bros.");
}

/** Brett's shop: buying, the job offer, and the delivery shift. */
function brettTalk(): void {
  if (flags.employeeQuest === true && flags.beanOutfit === true) {
    if (flags.delivering !== true) {
      flags.delivering = true;
      narrate(
        "Brett",
        "Deliver these orders to the arcade owner, the nerd, and your little brother. You have two minutes.",
      );
      timer("deliver", 120_000);
      return;
    }
    if (
      flags.deliveredBrad === true &&
      flags.deliveredNerd === true &&
      flags.deliveredBro === true
    ) {
      ending(
        "Excellent Employee",
        "You did it. Here, take this ending and get out of here.",
      );
      return;
    }
    narrate("Brett", "You still have deliveries to make.");
    return;
  }
  if (flags.attorneyQuest === true && flags.attorneyDone !== true) {
    dialog(BRETT, "What do you want?", [
      "I can work for Bean Bros.",
      "Never mind.",
    ]);
    return;
  }
  dialog(BRETT, "Are you sure you want to buy this item?", [
    "Buy a hot dog. ($" + HOTDOG_PRICE + ")",
    "Buy a slushie. ($" + SLUSHIE_PRICE + ")",
    "Nothing.",
  ]);
}

function brettChoose(option: number): void {
  if (flags.attorneyQuest === true && flags.attorneyDone !== true) {
    if (option === 0) {
      flags.attorneyDone = true;
      flags.employeeQuest = true;
      ending(
        "Certified Attorney",
        "You won an argument, but next time you play you have to work for Bean Bros.",
      );
    }
    return;
  }
  if (option === 0 && money >= HOTDOG_PRICE) {
    money -= HOTDOG_PRICE;
    flags.unpaid = false;
    give("hotdog", "One hot dog. Thanks, I guess.");
  } else if (option === 1 && money >= SLUSHIE_PRICE) {
    money -= SLUSHIE_PRICE;
    flags.unpaid = false;
    give("slushie", "One slushie. It'll help you jump.");
  } else if (option === 0 || option === 1) {
    say("You don't have enough cash.");
  }
}

/** Pot Head's cafeteria counter: order a food, wait, and it arrives. */
function potheadTalk(): void {
  dialog(POTHEAD, "Would you like to place an order for some food?", [
    "A pizza, please.",
    "A salad, please.",
    "A taco, please.",
    "Nothing.",
  ]);
}

function potheadChoose(option: number): void {
  const foods = ["pizza", "salad", "taco"];
  if (option < 0 || option >= foods.length) {
    return;
  }
  cookingFood = foods[option];
  narrate(
    "Pot Head",
    "This will take a moment. When you hear the sound, it's ready.",
  );
  timer("cook", 4_000);
}

/** Sleepa: wake her, gather the three foods, and get scammed. */
function sleepaTalk(): void {
  if (flags.sleepaAwake !== true) {
    flags.sleepaAwake = true;
    narrate(
      "Sleepa",
      "I forgot to buy my food yesterday. Get me a pizza, a bean, and a taco!",
    );
    return;
  }
  if (FOODS.indexOf(held) >= 0 && sleepaFoods.indexOf(held) < 0) {
    sleepaFoods.push(held);
    take(held, 1);
    say(
      "You put the " +
        ITEM_NAMES[held] +
        " in the bag. (" +
        sleepaFoods.length +
        "/3)",
    );
    if (sleepaFoods.length >= 3) {
      ending("Instant Regret", "I was joking. ...You got scammed.");
    }
    return;
  }
  narrate(
    "Sleepa",
    "Pizza, bean, and taco. I'll give you double what they're worth.",
  );
}

/** Champ: strike him with the roaster until he falls. */
function champTalk(): void {
  if (held !== "roaster") {
    narrate(
      "Champ",
      "You think you're scaring me? Use the marshmallow holder.",
    );
    return;
  }
  champHits += 1;
  if (champHits >= 5) {
    ending(
      "Champion",
      "I think it's over, buddy, because I am the new champion.",
    );
    return;
  }
  narrate("Champ", "What's up, Brody? That all you got? (" + champHits + "/5)");
}

/** The lemonade seller: buy the drink and its ending. */
function lemonadeTalk(): void {
  dialog(
    LEMONADE,
    "May I interest you in some totally real lemonade? It's only $" +
      LEMONADE_PRICE +
      ".",
    ["Buy it. ($" + LEMONADE_PRICE + ")", "No thanks."],
  );
}

function lemonadeChoose(option: number): void {
  if (option !== 0) {
    return;
  }
  if (money < LEMONADE_PRICE) {
    say("You can't afford the lemonade.");
    return;
  }
  money -= LEMONADE_PRICE;
  give("lemonade", "Pleasure doing business with you, good sir.");
}

// --- the true ending finale -----------------------------------------------

/** James appears outside the house once the collection is ready for the finale. */
function maybeStartFinale(): void {
  if (flags.finaleReady !== true || flags.jamesAppeared === true) {
    return;
  }
  flags.jamesAppeared = true;
  createNpc({
    id: JAMES,
    x: -12,
    z: 2,
    y: FLOOR,
    name: "James",
    model: "npc-james",
    yaw: Math.PI,
  });
  narrate(
    "James",
    "I've been expecting you. Your history book is the key to the perfect ending. Go to the arcade — something is waiting outside.",
  );
}

/** Opens the Dimensionator and drops the party into the corrupted dimension. */
function startCorruption(): void {
  flags.portalOpen = true;
  dispatch("explosion", { id: "portal-boom", x: 40, z: -10, radius: 5 });
  narrate("Laugh", "Do you realize what you have done?");
  narrate(
    "James",
    "It's the only way to stop the Anomaly. Find your history book, then run for the portal.",
  );
  dispatch("player-place", { player: "", x: 0, z: 236, y: FLOOR });
  flags.corrupt = true;
  narrate("You", "The corrupted dimension. It looks like home, but ruined.");
}

/** Presses one of the four house buttons, which must come in the gate's order. */
function useButton(color: string): void {
  if (color !== BUTTON_ORDER[buttonProgress]) {
    buttonProgress = 0;
    narrate("You", "The button goes dark. Wrong order.");
    return;
  }
  buttonProgress += 1;
  if (buttonProgress < BUTTON_ORDER.length) {
    say("The " + color + " button lights up. (" + buttonProgress + "/4)");
    return;
  }
  flags.gateOpen = true;
  dispatch("prop-remove", { id: "corrupt-gate" });
  narrate("You", "The gate drops. The way to the school is open.");
}

/** The Anomaly in the arena: strike it with the roaster to finish the game. */
function anomalyTalk(): void {
  if (flags.arena !== true) {
    narrate("The Anomaly", "You are weak. Run.");
    return;
  }
  if (held !== "roaster") {
    narrate("The Anomaly", "You cannot beat me without the roaster.");
    return;
  }
  anomalyHits += 1;
  if (anomalyHits >= 5) {
    ending(
      "True Ending",
      "You look at your history book. You strangely feel the power of many different alternate realities. Class begins on page 1987.",
    );
    return;
  }
  narrate("The Anomaly", "You can't stop me. (" + anomalyHits + "/5)");
}

// --- using props ----------------------------------------------------------

/** Takes a store good without paying, which is the shoplifter's first step. */
function takeStoreGood(item: string, text: string): void {
  give(item, text);
  flags.unpaid = true;
}

function usePlate(item: string): void {
  const slot = plateA === null ? 0 : plateB === null ? 1 : -1;
  if (item === "") {
    const current = plateB !== null ? plateB : plateA;
    if (current === null) {
      narrate("You", "The plate is empty.");
      return;
    }
    if (plateB !== null) {
      plateB = null;
    } else {
      plateA = null;
    }
    give(current, "You take the " + ITEM_NAMES[current] + " off the plate.");
    return;
  }
  if (FOODS.indexOf(item) < 0) {
    say("Only food goes on the plate.");
    return;
  }
  if (slot < 0) {
    say("The plate already holds two things.");
    return;
  }
  take(item, 1);
  if (slot === 0) {
    plateA = item;
  } else {
    plateB = item;
  }
  say("You set the " + ITEM_NAMES[item] + " on the plate.");
  if (plateA !== null && plateB !== null) {
    ending("Breakfast", "Yum. That was the easiest ending of them all.");
  }
}

/** Throws a held thing into the dumpster, which can start a fire. */
function useDumpster(item: string): void {
  if (item === "banana" && flags.monke === true) {
    take("banana", 1);
    flags.monkeArmed = true;
    narrate(
      "Monke",
      "Throw away banana. Now light the matches and blow up the arcade.",
    );
    return;
  }
  if (item === "litmatches") {
    take("litmatches", 1);
    dispatch("explosion", {
      id: "arcade-boom",
      x: 24,
      z: -8,
      radius: 8,
    });
    flags.boom = true;
    if (flags.monkeArmed === true) {
      narrate("Monke", "The monkey takeover has begun. Run for the tunnel!");
      timer("monke", 10_000);
    } else {
      narrate("You", "The arcade is on fire. You have 30 seconds to get home.");
      timer("escape", 30_000);
    }
    return;
  }
  narrate("You", "Nothing happens.");
}

function used(entityId: string, item: string): void {
  if (entityId === "bed") {
    useBed();
    return;
  }
  if (entityId === "mailbox") {
    useMailbox();
    return;
  }
  if (entityId === "flower") {
    useFlower();
    return;
  }
  if (entityId === "classroom-door") {
    enterClassroom();
    return;
  }
  if (entityId === "dimensionator") {
    if (flags.finaleReady !== true) {
      narrate("You", "The Dimensionator is locked. A code might open it.");
      return;
    }
    dialog("dimensionator", "Enter the code.", ["2546", "0000"]);
    return;
  }
  const buttons: Record<string, string> = {
    "corrupt-button-blue": "blue",
    "corrupt-button-red": "red",
    "corrupt-button-green": "green",
    "corrupt-button-purple": "purple",
  };
  if (buttons[entityId] !== undefined) {
    useButton(buttons[entityId]);
    return;
  }
  if (entityId === "corrupt-book") {
    dispatch("prop-remove", { id: "corrupt-book" });
    flags.gotBook = true;
    give(
      "roaster",
      "You grab the history book. The Anomaly is coming — run to the portal!",
    );
    createNpc({
      id: ANOMALY,
      x: 92,
      z: 236,
      y: FLOOR,
      name: "The Anomaly",
      model: "npc-anomaly",
      yaw: Math.PI,
    });
    flags.chase = true;
    timer("chase", 30_000);
    return;
  }
  if (entityId === "corrupt-portal") {
    if (flags.chase !== true) {
      narrate("You", "The portal isn't open yet.");
      return;
    }
    flags.chase = false;
    flags.arena = true;
    dispatch("player-place", { player: "", x: 280, z: 236, y: FLOOR });
    createNpc({
      id: ANOMALY,
      x: 284,
      z: 236,
      y: FLOOR,
      name: "The Anomaly",
      model: "npc-anomaly",
      yaw: Math.PI,
    });
    narrate(
      "James",
      "This is his domain. Look through your memories for the key to defeating him.",
    );
    return;
  }
  if (entityId === "lemonade-stand" && item === "lemonade") {
    take("lemonade", 1);
    ending("Ded", "I don't feel so good... What was in that lemonade?");
    return;
  }
  if (entityId === "phone") {
    flags.messageHeard = true;
    narrate(
      "Phone",
      "Hey pal. Come over to my place. My house is next door to yours.",
    );
    return;
  }
  if (entityId === "laugh-fridge") {
    if (flags.sodaTaken === true) {
      say("Only take one. Laugh is saving the other.");
      return;
    }
    flags.sodaTaken = true;
    give("cola", "You take one Bloxy Cola. Only one.");
    return;
  }
  if (entityId === "chair") {
    if (flags.chairQuest !== true) {
      narrate("You", "A comically small chair. I shouldn't take it.");
      return;
    }
    flags.sleepy = true;
    narrate("You", "Here's your gift, cuz. ...Why do I feel so sleepy?");
    dispatch("player-speed", { player: "", multiplier: 0.2 });
    return;
  }
  if (entityId === "mirror") {
    flags.beanOutfit = true;
    narrate("You", "You change into the Bean Bros. outfit.");
    return;
  }
  if (entityId === "locked-door") {
    if (item !== "key") {
      narrate("You", "The door is locked. I need a key.");
      return;
    }
    take("key", 1);
    give("roaster", "A marshmallow roaster. Definitely only for marshmallows.");
    return;
  }
  if (entityId === "slushie-machine") {
    if (money < SLUSHIE_PRICE) {
      say("It costs $" + SLUSHIE_PRICE + ".");
      return;
    }
    money -= SLUSHIE_PRICE;
    give("slushie", "One banana slushie.");
    return;
  }
  if (entityId === "token-atm") {
    if (money < TOKEN_PRICE) {
      say("It costs $" + TOKEN_PRICE + ".");
      return;
    }
    money -= TOKEN_PRICE;
    give("token", "The machine spits out an arcade token.");
    return;
  }
  if (entityId === "broken-machine") {
    if (item !== "token") {
      narrate("You", "It wants an arcade token.");
      return;
    }
    take("token", 1);
    narrate("You", "You're inside the game. Beat the obby to claim the prize.");
    timer("obby", 6_000);
    return;
  }
  if (entityId === "dumpster") {
    useDumpster(item);
    return;
  }
  if (entityId === "fighting-poster") {
    if (item !== "roaster") {
      narrate("You", "You must use a marshmallow holder as a melee weapon.");
      return;
    }
    narrate("You", "You sign up for the fighting contest. Champ is waiting.");
    return;
  }
  if (entityId === "cafeteria-plate") {
    usePlate(item);
    return;
  }
  if (entityId === "bean-shelf-1") {
    takeStoreGood("hotdog", "You take a hot dog off the shelf.");
    return;
  }
  if (entityId === "bean-shelf-2") {
    takeStoreGood("bean", "You take a can of beans off the shelf.");
    return;
  }
  if (entityId.indexOf("cash-") === 0) {
    dispatch("prop-remove", { id: entityId });
    money += CASH;
    say("You pocket some cash. ($" + money + ")");
    return;
  }
  const pickups: Record<string, string> = {
    plush: "plush",
    banana: "banana",
    chips: "chips",
    key: "key",
    matches: "matches",
    historybook: "historybook",
  };
  if (pickups[entityId] !== undefined) {
    dispatch("prop-remove", { id: entityId });
    const item = pickups[entityId];
    if (item === "banana") {
      flags.hasBanana = true;
    }
    give(item, "You take the " + ITEM_NAMES[item] + ".");
    return;
  }
  narrate("You", "Nothing happens.");
}

// --- using items ----------------------------------------------------------

function usedItem(item: string): void {
  if (
    item === "chips" ||
    item === "pizza" ||
    item === "hotdog" ||
    item === "salad" ||
    item === "taco"
  ) {
    take(item, 1);
    narrate("You", "Not bad. But I should get to school.");
    return;
  }
  if (item === "lemonade") {
    take(item, 1);
    ending("Ded", "I don't feel so good... What was in that lemonade?");
    return;
  }
  if (item === "matches") {
    take("matches", 1);
    give("litmatches", "The matches are lit.");
    return;
  }
  if (item === "slushie") {
    take("slushie", 1);
    if (flags.hasBanana === true || flags.monke === true) {
      flags.monke = true;
      narrate("Monke", "You are now one with the monkey.");
      return;
    }
    dispatch("player-jump", { player: "", multiplier: 1.6 });
    narrate("You", "The banana slushie gives you a jump ability.");
    return;
  }
  narrate("You", "I shouldn't use that here.");
}

// --- talking --------------------------------------------------------------

function talked(npcId: string, player: string): void {
  void player;
  if (npcId === LITTLE_BRO) {
    if (flags.delivering === true && flags.deliveredBro !== true) {
      flags.deliveredBro = true;
      narrate(
        "Little Brother",
        "Thanks, big bro. Since when did you work for Bean Bros?",
      );
      return;
    }
    narrate(
      "Little Brother",
      "Oh, hi big bro. You're probably too busy to play with me.",
    );
    return;
  }
  if (npcId === LAUGH) {
    laughTalk();
    return;
  }
  if (npcId === HOMELESS) {
    homelessTalk();
    return;
  }
  if (npcId === BULLY) {
    if (held === "plush") {
      ending(
        "Bullied",
        "Is that a plushie in your hand? Wow, you really are a loser. Lesson learned: don't bring your kitty toys to school.",
      );
      return;
    }
    narrate(
      "Bully",
      "Oh, it's you. Get out of my personal space before I invade yours.",
    );
    return;
  }
  if (npcId === NERD) {
    if (flags.delivering === true && flags.deliveredNerd !== true) {
      flags.deliveredNerd = true;
      narrate(
        "Nerd",
        "You work for Bean Bros. You're such a loser. Thanks for my food.",
      );
      return;
    }
    nerdTalk();
    return;
  }
  if (npcId === BRETT) {
    brettTalk();
    return;
  }
  if (npcId === BRAD) {
    if (flags.delivering === true && flags.deliveredBrad !== true) {
      flags.deliveredBrad = true;
      narrate("Brad", "Thanks for my delivery, fella.");
      return;
    }
    narrate(
      "Brad",
      "Welcome to Gamer Zone Arcade. Don't bother me, I'm on break.",
    );
    return;
  }
  if (npcId === SLEEPA) {
    sleepaTalk();
    return;
  }
  if (npcId === CHAMP) {
    champTalk();
    return;
  }
  if (npcId === LEMONADE) {
    lemonadeTalk();
    return;
  }
  if (npcId === POTHEAD) {
    potheadTalk();
    return;
  }
  if (npcId === TEACHER) {
    narrate("Teacher", "To enter my class you must have endings.");
    return;
  }
  if (npcId === SANTA) {
    narrate("Santa", "Ho ho ho. Could you help get me out of this tree?");
    return;
  }
  if (npcId === OBBY) {
    narrate("Obby Master", "Dare to beat my obby and claim the Robux prize.");
    return;
  }
  if (npcId === BRIT) {
    narrate(
      "Brit",
      "I'm busy sorting sodas. If you want to buy something, ask Brett.",
    );
    return;
  }
  if (npcId === JAMES) {
    if (flags.finaleQuest === true) {
      narrate(
        "James",
        "The Dimensionator is outside the arcade. The code is your address.",
      );
      return;
    }
    flags.finaleQuest = true;
    narrate(
      "James",
      "Your history book has the power to stop the Anomaly. Go to the arcade and unlock the Dimensionator.",
    );
    return;
  }
  if (npcId === ANOMALY) {
    anomalyTalk();
    return;
  }
  if (npcId === ALEX || npcId === JAMES) {
    narrate("You", "They aren't home right now.");
    return;
  }
}

function chose(npcId: string, option: number, player: string): void {
  dispatch("dialog-close", { player, npcId });
  if (npcId === "dimensionator") {
    if (option === 0) {
      startCorruption();
    } else {
      narrate("You", "Access denied.");
    }
    return;
  }
  if (npcId === LAUGH) {
    laughChoose(option);
  } else if (npcId === BRETT) {
    brettChoose(option);
  } else if (npcId === NERD) {
    nerdChoose(option);
  } else if (npcId === HOMELESS && option === 0) {
    flags.helping = true;
    narrate("You", "I'll see what I can do.");
  } else if (npcId === LEMONADE) {
    lemonadeChoose(option);
  } else if (npcId === POTHEAD) {
    potheadChoose(option);
  }
}

// --- timers ---------------------------------------------------------------

function timerFired(id: string): void {
  if (id === "quiz-wait") {
    flags.quizReady = true;
    narrate("Nerd", "I've finished looking over your results. Come back.");
    return;
  }
  if (id === "cook") {
    if (cookingFood !== "") {
      give(cookingFood, "Your " + ITEM_NAMES[cookingFood] + " is ready.");
      cookingFood = "";
    }
    return;
  }
  if (id === "late") {
    flags.late = true;
    narrate("You", "There's the school bell. I'm officially late.");
    return;
  }
  if (id === "escape") {
    if (inZone[PLAYER_HOUSE] === true) {
      ending(
        "Criminal",
        "You managed to escape the law, but at what cost? You are now wanted by the police.",
      );
    } else {
      narrate("You", "The police caught you before you got home.");
    }
    return;
  }
  if (id === "monke") {
    ending("Monke Takeover", "Reject humanity. Become monkey.");
    return;
  }
  if (id === "obby") {
    ending("Arcade Master", "The prize is gone, but take this ending instead.");
    return;
  }
  if (id === "deliver") {
    narrate("Brett", "You're out of time. The shift is over.");
    return;
  }
  if (id === "chase") {
    if (flags.chase === true) {
      narrate("The Anomaly", "You can't escape. Try again.");
    }
    return;
  }
}

onTick((_clockMs, events) => {
  if (!started) {
    started = true;
    collected = JSON.parse(endings()) as string[];
    open();
  }
  for (const event of events) {
    if (event.kind === "zone-entered" && event.zoneId !== undefined) {
      inZone[event.zoneId] = true;
      if (hinted[event.zoneId] !== true) {
        hinted[event.zoneId] = true;
        hintFor(event.zoneId);
      }
    } else if (event.kind === "zone-left" && event.zoneId !== undefined) {
      delete inZone[event.zoneId];
      if (event.zoneId === PLAYER_HOUSE) {
        maybeStartFinale();
      }
      if (event.zoneId === BEAN_BROS && flags.unpaid === true) {
        ending(
          "Shoplifter",
          "You think you can steal on my watch? Brit pulls out a shotgun. You are a disgrace.",
        );
      }
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      used(event.entityId, event.item ?? "");
    } else if (event.kind === "item-used" && event.item !== undefined) {
      usedItem(event.item);
    } else if (event.kind === "npc-talk" && event.npcId !== undefined) {
      talked(event.npcId, event.producer);
    } else if (
      event.kind === "npc-choose" &&
      event.npcId !== undefined &&
      event.option !== undefined
    ) {
      chose(event.npcId, event.option, event.producer);
    } else if (event.kind === "timer" && event.timerId !== undefined) {
      timerFired(event.timerId);
    }
  }
});
`,hS=`import {
  createNpc,
  dispatch,
  heightAt,
  log,
  now as clockNow,
  onTick,
  players as livePlayers,
  solidAt,
  waterAt,
  type ModelsByName,
  type NpcHandle,
} from "voxelscape";

const GUIDE = "guide";
const SWORD = "sword";

// A whole population of zombies materializes procedurally around wherever
// players explore, rather than one fixed encounter: only the cells near a
// player are ever populated, so the tuning below governs density and pacing
// across an effectively unbounded map.
const SPAWN_CELL = 32;
const SLOTS_PER_CELL = 2;
/** Fraction of (cell, slot) addresses that actually hold a zombie. */
const MONSTER_DENSITY = 0.15;
/** Cells within this of any player are materialized. */
const MATERIALIZE_RADIUS = 56;
/** Most zombies this place keeps alive at once. */
const MONSTER_CAP = 40;
/** This place's own population seed — arbitrary, just fixed, so every peer
 * agrees on which (cell, slot) addresses hold a zombie. */
const POPULATION_SEED = 0x2a5f3c17;

// Every materialized zombie is already close enough to some player to exist
// at all — that is what materializing means — so there is no separate
// "asleep" range below the aggro radius; a zombie always wanders rather than
// standing still as a prop until someone gets close.
const AGGRO_RADIUS = 18;
const ATTACK_RADIUS = 2.4;
/** Seconds between swings while a player stays in melee range, in milliseconds. */
const ATTACK_INTERVAL_MS = 1000;
const ZOMBIE_DAMAGE = 2;
const ZOMBIE_SPEED = 2.4; // world units per second, while chasing
const ZOMBIE_WANDER_SPEED = 1; // world units per second, while wandering
const ZOMBIE_MAX_HP = 20; // three sword swings at 8 damage each
const TICK_MS = 120;
/** Ground-height rise a step will not climb, in world units. */
const STEP_LIMIT = 1.3;
/** Height above the ground a wall or water is sampled at. */
const BODY_Y = 0.6;
const WANDER_MIN_MS = 3000;
const WANDER_SPREAD_MS = 4000;
/** How much closer a new player has to be before ownership moves to them,
 * so two players near each other don't make it flicker between owners. */
const OWNER_HYSTERESIS = 2;
/** How far a landed hit shoves a zombie away from whoever swung. */
const KNOCKBACK = 1.2;
/** Closest a zombie ever stands to whoever it is attacking, so a player
 * cannot walk into its model's own geometry mid-fight — which reads as the
 * zombie not being there at all, a stronger effect than merely standing
 * close. */
const MIN_ATTACK_DISTANCE = 1.4;
/** How often a wandering zombie's position is broadcast to other peers; a
 * chasing or attacking one broadcasts every tick instead, since a stale
 * position there is what would let a player walk unnoticed into melee range.
 * The owner still moves and renders it every tick either way — only what
 * other peers are told slows down. */
const WANDER_BROADCAST_INTERVAL_MS = 2000;

// This place's spawn point, and how far around it stays free of zombies
// entirely: a population materializing wherever a player happens to be would
// otherwise let a new arrival spawn with one already standing on top of them.
// The radius sits well past the aggro radius, so a zombie that wanders toward
// its edge is nowhere near close enough to notice someone standing right at
// the line.
const SPAWN_X = 0;
const SPAWN_Z = 0;
const SPAWN_SAFE_RADIUS = 48;

type ZombieState = "wander" | "chase" | "attack";

interface Player {
  did: string;
  x: number;
  y: number;
  z: number;
}

interface Zombie {
  npc: NpcHandle<ModelsByName["zombie"]>;
  hp: number;
  lastAttackAt: number;
  state: ZombieState;
  /** Which player this peer currently believes owns (simulates) it, or ""
   * before anyone has. Only meaningful on the peer that is the owner — see
   * \`stepZombie\`. */
  ownerDid: string;
  wanderHeading: number;
  /** Clock moment the current wander heading may next change. */
  wanderUntil: number;
  /** Clock moment this zombie's position was last broadcast to other peers. */
  lastBroadcastAt: number;
  /** The spawn cell this zombie belongs to, "cx_cz" — forgetting is decided
   * by whether this cell is still near a player, not by where it has since
   * wandered or chased to. */
  cellKey: string;
  /** Where this zombie first stood — wandering has nothing else keeping it
   * from walking anywhere over enough time, so this is what a stray heading
   * gets pulled back toward once it's drifted far from it. */
  homeX: number;
  homeZ: number;
}

/** How far a zombie's own wander may drift from where it first stood. */
const WANDER_LEASH_RADIUS = 20;

let started = false;
const zombies = new Map<string, Zombie>();
/** Zombie ids that have died — permanent for the life of this session: a
 * killed zombie's address never spawns another one in its place. */
const deadIds = new Set<string>();

const dist2D = (ax: number, az: number, bx: number, bz: number): number =>
  Math.hypot(ax - bx, az - bz);

/** A small, fast, seedable generator — deterministic given the same seed,
 * which is what lets every peer agree on the same population and the same
 * wander choices without comparing notes. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable 32-bit hash of four integers, for deriving a cell's population
 * and a zombie's own wander stream from it. */
function hashInt(a: number, b: number, c: number, d: number): number {
  let h =
    (a ^
      Math.imul(b, 0x9e3779b1) ^
      Math.imul(c, 0x85ebca6b) ^
      Math.imul(d, 0xc2b2ae35)) |
    0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return h | 0;
}

/** Whether (cx, cz, slot) holds a zombie, and its id and rng seed if so —
 * a pure function of the address, so every peer computes the same answer. */
function zombieAt(
  cx: number,
  cz: number,
  slot: number,
): { id: string; rngSeed: number } | null {
  const rngSeed = hashInt(POPULATION_SEED, cx, cz, slot);
  if (mulberry32(rngSeed)() >= MONSTER_DENSITY) {
    return null;
  }
  return { id: "zombie-" + cx + "_" + cz + "_" + slot, rngSeed };
}

/** Where a freshly materialized zombie stands within its cell, grounded on
 * the terrain there. */
function spawnPose(
  rngSeed: number,
  cx: number,
  cz: number,
): { x: number; z: number; yaw: number } {
  const rng = mulberry32(rngSeed ^ 0x9e3779b9);
  const x = cx * SPAWN_CELL + rng() * SPAWN_CELL;
  const z = cz * SPAWN_CELL + rng() * SPAWN_CELL;
  return { x, z, yaw: rng() * Math.PI * 2 };
}

/** The cell keys within \`MATERIALIZE_RADIUS\` of (x, z) — a conservative
 * superset that includes every cell whose nearest point could be in range. */
function cellsNear(x: number, z: number): string[] {
  const cx0 = Math.floor((x - MATERIALIZE_RADIUS) / SPAWN_CELL);
  const cx1 = Math.floor((x + MATERIALIZE_RADIUS) / SPAWN_CELL);
  const cz0 = Math.floor((z - MATERIALIZE_RADIUS) / SPAWN_CELL);
  const cz1 = Math.floor((z + MATERIALIZE_RADIUS) / SPAWN_CELL);
  const halfDiagonal = (SPAWN_CELL * Math.SQRT2) / 2;
  const keys: string[] = [];
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cz = cz0; cz <= cz1; cz++) {
      const centerX = cx * SPAWN_CELL + SPAWN_CELL / 2;
      const centerZ = cz * SPAWN_CELL + SPAWN_CELL / 2;
      if (
        Math.hypot(centerX - x, centerZ - z) <=
        MATERIALIZE_RADIUS + halfDiagonal
      ) {
        keys.push(cx + "_" + cz);
      }
    }
  }
  return keys;
}

/** Materializes a zombie for every windowed cell that holds one and is not
 * yet tracked — the window being every cell near any current player. */
function materialize(players: Player[]): void {
  if (zombies.size >= MONSTER_CAP) {
    return;
  }
  const window = new Set<string>();
  for (const p of players) {
    for (const key of cellsNear(p.x, p.z)) {
      window.add(key);
    }
  }
  for (const key of window) {
    const parts = key.split("_");
    const cx = Number(parts[0]);
    const cz = Number(parts[1]);
    for (let slot = 0; slot < SLOTS_PER_CELL; slot++) {
      const spawn = zombieAt(cx, cz, slot);
      if (spawn === null || zombies.has(spawn.id) || deadIds.has(spawn.id)) {
        continue;
      }
      if (zombies.size >= MONSTER_CAP) {
        return;
      }
      const pose = spawnPose(spawn.rngSeed, cx, cz);
      // Checked on the actual randomized-within-cell spot, not the cell's
      // own centre: a cell just past the safe radius can still place a
      // zombie most of a cell width closer than that.
      if (dist2D(pose.x, pose.z, SPAWN_X, SPAWN_Z) <= SPAWN_SAFE_RADIUS) {
        continue;
      }
      const npc = createNpc({
        model: "zombie",
        id: spawn.id,
        x: pose.x,
        z: pose.z,
        name: "Zombie",
        yaw: pose.yaw,
        y: heightAt(pose.x, pose.z),
      });
      zombies.set(spawn.id, {
        npc,
        hp: ZOMBIE_MAX_HP,
        lastAttackAt: 0,
        state: "wander",
        ownerDid: "",
        wanderHeading: 0,
        wanderUntil: 0,
        lastBroadcastAt: clockNow(),
        cellKey: key,
        homeX: pose.x,
        homeZ: pose.z,
      });
    }
  }
}

/** Drops zombies whose spawn cell is no longer near any player — the
 * zombie's own current position (which may be well outside it, mid-chase)
 * is not what decides this, its spawn cell is. */
function forget(players: Player[]): void {
  const window = new Set<string>();
  for (const p of players) {
    for (const key of cellsNear(p.x, p.z)) {
      window.add(key);
    }
  }
  for (const [id, z] of zombies) {
    if (!window.has(z.cellKey)) {
      zombies.delete(id);
      z.npc.remove();
    }
  }
}

/** Whether stepping from the current ground to (x, z) is walkable: not too
 * steep a rise, and neither solid nor water at body height once there. */
function walkable(fromX: number, fromZ: number, x: number, z: number): boolean {
  const ground = heightAt(x, z);
  if (Math.abs(ground - heightAt(fromX, fromZ)) > STEP_LIMIT) {
    return false;
  }
  const y = ground + BODY_Y;
  return !solidAt(x, y, z) && !waterAt(x, y, z);
}

/** Moves (x, z) one step toward yaw at speed, sliding along whichever axis
 * is still free when the direct line is blocked. */
function moveStep(
  x: number,
  z: number,
  yaw: number,
  speed: number,
  dtMs: number,
): { x: number; z: number; blocked: boolean } {
  const dt = dtMs / 1000;
  const stepX = Math.sin(yaw) * speed * dt;
  const stepZ = Math.cos(yaw) * speed * dt;
  let nx = x;
  let nz = z;
  let blocked = true;
  if (walkable(x, z, x + stepX, z)) {
    nx = x + stepX;
    blocked = false;
  }
  if (walkable(x, z, x, z + stepZ)) {
    nz = z + stepZ;
    blocked = false;
  }
  return { x: nx, z: nz, blocked };
}

/** A heading to wander off in next: fully random near home, biased back
 * toward it — in a wide cone, not a robotic beeline — once it has strayed
 * past the leash. Without this, a symmetric random walk has no reason not
 * to drift arbitrarily far given enough time. */
function pickWanderHeading(
  x: number,
  z: number,
  homeX: number,
  homeZ: number,
): number {
  if (dist2D(x, z, homeX, homeZ) <= WANDER_LEASH_RADIUS) {
    return Math.random() * Math.PI * 2;
  }
  const towardHome = Math.atan2(homeX - x, homeZ - z);
  return towardHome + (Math.random() - 0.5) * (Math.PI / 2);
}

/**
 * Advances one zombie one tick. Every peer runs this from the same live
 * positions, but ownership decides whose result actually counts: the
 * nearest player owns it, kept while the current owner is only marginally
 * farther. Only the owner moves it and dispatches the live update — a peer
 * that isn't the owner leaves its own copy exactly where it last stood until
 * a broadcast from the real owner moves it.
 */
function stepZombie(z: Zombie, players: Player[], now: number): void {
  if (players.length === 0) {
    return;
  }
  const self = players[0].did;
  let x = z.npc.x;
  let zPos = z.npc.z;
  let yaw = z.npc.yaw;

  let nearest = players[0];
  let nearestDistance = dist2D(x, zPos, nearest.x, nearest.z);
  for (let i = 1; i < players.length; i++) {
    const p = players[i];
    const d = dist2D(x, zPos, p.x, p.z);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = p;
    }
  }
  let owner = nearest;
  let ownerDistance = nearestDistance;
  if (z.ownerDid !== "" && z.ownerDid !== nearest.did) {
    const current = players.find((p) => p.did === z.ownerDid);
    if (current !== undefined) {
      const currentDistance = dist2D(x, zPos, current.x, current.z);
      if (currentDistance <= nearestDistance + OWNER_HYSTERESIS) {
        owner = current;
        ownerDistance = currentDistance;
      }
    }
  }
  z.ownerDid = owner.did;
  if (owner.did !== self) {
    return;
  }

  const state: ZombieState =
    ownerDistance <= ATTACK_RADIUS
      ? "attack"
      : ownerDistance <= AGGRO_RADIUS
        ? "chase"
        : "wander";
  z.state = state;

  if (state === "attack") {
    yaw = Math.atan2(owner.x - x, owner.z - zPos);
    // There's a nearest range as well as a furthest one: nothing stops a
    // player walking straight into it mid-fight otherwise, and standing
    // inside its own model's geometry is indistinguishable from it not
    // being there at all. Backing off is silent — no re-dispatch here — the
    // tick's own \`move\` below still sends wherever it ends up.
    if (ownerDistance < MIN_ATTACK_DISTANCE) {
      const away = yaw + Math.PI;
      const moved = moveStep(x, zPos, away, ZOMBIE_SPEED, TICK_MS);
      x = moved.x;
      zPos = moved.z;
    }
    if (now - z.lastAttackAt >= ATTACK_INTERVAL_MS) {
      z.lastAttackAt = now;
      dispatch("player-damage", {
        player: owner.did,
        amount: ZOMBIE_DAMAGE,
        source: z.npc.id,
      });
    }
  } else if (state === "chase") {
    yaw = Math.atan2(owner.x - x, owner.z - zPos);
    const moved = moveStep(x, zPos, yaw, ZOMBIE_SPEED, TICK_MS);
    x = moved.x;
    zPos = moved.z;
  } else {
    if (now >= z.wanderUntil) {
      z.wanderHeading = pickWanderHeading(x, zPos, z.homeX, z.homeZ);
      z.wanderUntil = now + WANDER_MIN_MS + Math.random() * WANDER_SPREAD_MS;
    }
    // The leash is enforced on every step, not only when a heading is
    // picked — a heading chosen while still within it can point outward, and
    // only checking at the next pick would let a full multi-second leg carry
    // it well past the leash before anything pulled it back.
    const beyondLeash = dist2D(x, zPos, z.homeX, z.homeZ) > WANDER_LEASH_RADIUS;
    const heading = beyondLeash
      ? Math.atan2(z.homeX - x, z.homeZ - zPos)
      : z.wanderHeading;
    const moved = moveStep(x, zPos, heading, ZOMBIE_WANDER_SPEED, TICK_MS);
    x = moved.x;
    zPos = moved.z;
    yaw = heading;
    if (moved.blocked) {
      z.wanderHeading = pickWanderHeading(x, zPos, z.homeX, z.homeZ);
      z.wanderUntil = now + 500 + Math.random() * 1000;
    }
  }

  const dueToBroadcast =
    state !== "wander" ||
    now - z.lastBroadcastAt >= WANDER_BROADCAST_INTERVAL_MS;
  if (dueToBroadcast) {
    z.lastBroadcastAt = now;
  }
  z.npc.move({
    x,
    z: zPos,
    yaw,
    y: heightAt(x, zPos),
    live: dueToBroadcast,
  });
}

/** Where a zombie lands after being shoved away from whoever struck it,
 * unless the shove would land it in a wall or water, which would only stick
 * it there. */
function knockedBack(
  x: number,
  z: number,
  attacker: { x: number; z: number },
): { x: number; z: number } {
  const dx = x - attacker.x;
  const dz = z - attacker.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-6) {
    return { x, z };
  }
  const push = Math.min(KNOCKBACK, distance);
  const nx = x + (dx / distance) * push;
  const nz = z + (dz / distance) * push;
  return walkable(x, z, nx, nz) ? { x: nx, z: nz } : { x, z };
}

function armTick(): void {
  dispatch("timer", { id: "zombie-tick", afterMs: TICK_MS });
}

onTick((_clockMs, events) => {
  const now = clockNow();
  if (!started) {
    started = true;
    createNpc({ id: GUIDE, x: 8, z: 8, name: "Guide" });
    log("your place started");
    // The sword is given and equipped once, for good: this place has nothing
    // else to hold, and a bare-handed touch stays how every other entity is
    // greeted.
    dispatch("item-define", {
      id: SWORD,
      name: "Sword",
      sprite: "",
      stackable: false,
    });
    dispatch("item-give", { player: "", item: SWORD, count: 1 });
    dispatch("item-hold", { player: "", item: SWORD });
    armTick();
  }

  const players = JSON.parse(livePlayers()) as Player[];

  let ticked = false;
  for (const e of events) {
    if (
      (e.kind === "npc-talk" && e.npcId === GUIDE) ||
      (e.kind === "entity-used" && e.entityId === GUIDE)
    ) {
      dispatch("toast", {
        player: e.producer,
        text: "Hello, traveller.",
      });
    } else if (e.kind === "entity-used" && e.entityId !== undefined) {
      // A bare touch only ever gets a rise out of it — killing one takes an
      // actual swing, over the sword's own reach and reported strike.
      if (zombies.has(e.entityId)) {
        dispatch("toast", {
          player: e.producer,
          text: "The zombie snarls.",
        });
      }
    } else if (
      e.kind === "entity-hit" &&
      e.entityId !== undefined &&
      e.amount !== undefined
    ) {
      const target = zombies.get(e.entityId);
      if (target !== undefined) {
        const pushed = knockedBack(target.npc.x, target.npc.z, {
          x: e.attackerX ?? target.npc.x,
          z: e.attackerZ ?? target.npc.z,
        });
        target.hp -= e.amount;
        if (target.hp <= 0) {
          zombies.delete(target.npc.id);
          deadIds.add(target.npc.id);
          target.npc.die();
          dispatch("toast", {
            player: e.producer,
            text: "The zombie falls.",
          });
        } else {
          target.npc.move({
            x: pushed.x,
            z: pushed.z,
            y: heightAt(pushed.x, pushed.z),
            live: true,
          });
          dispatch("toast", {
            player: e.producer,
            text: "The zombie reels.",
          });
        }
      }
    } else if (e.kind === "timer" && e.timerId === "zombie-tick") {
      ticked = true;
    }
  }

  if (ticked) {
    materialize(players);
    forget(players);
    for (const z of zombies.values()) {
      stepZombie(z, players, now);
    }
    armTick();
  }
});
`,fS=`// The "Don't Poop Yourself at School" demo's place script — a faithful port
// of the Roblox obby. The course runs west → east through the school building:
//
//   Yard → Lobby → Stairs → Hallway → Cafeteria → Gym → Library → Mud Room
//   → Final Pads → Bathroom
//
// New sections use quicksand (the muddy room that slows the player) and
// conveyor belts (the cafeteria lunch trays that carry the player forward).
//
// ALL voxel coordinates × 2 = world coordinates. The plan handler registered
// with onPlan takes voxel coordinates; zones, props, and fields take
// world coordinates.
import {
  blocks,
  createNpc,
  createProp,
  dispatch,
  onPlan,
  onTick,
} from "voxelscape";

// ---------------------------------------------------------------------------
// Layout constants (voxel coordinates unless noted "W" for world units)
// ---------------------------------------------------------------------------
const GROUND = 30;
const LOBBY_VOXEL = 100;
// World-unit heights for the course elevations:
//   Lobby floor surface = (LOBBY_VOXEL + 1) * 2 = 202 W
//   After 8-step staircase (+8 voxels): surface = (108 + 1) * 2 = 218 W
const LOBBY = (LOBBY_VOXEL + 1) * 2; // 202 W
const VOID_Y = 150; // W — below this is fatal

// The 8-step staircase rises from voxel y=100 to y=108.
// Each section from the pedestal onward is at surface 218 W (voxel y=108).
// The cafeteria step-up is voxel y=109 → surface 220 W.

// Zone name constants.
const YARD = "yard";
const LOBBY_ZONE = "lobby";
const STAIRS = "stairs";
const HALLWAY = "hallway";
const CAFETERIA = "cafeteria";
const GYM = "gym";
const LIBRARY = "library";
const MUD_ROOM = "mud-room";
const FINAL = "final";
const BATHROOM = "bathroom";

// NPC ids.
const JANITOR = "janitor";
const TEACHER = "teacher";
const BULLY = "bully";
const PRINCIPAL = "principal";

const BLADDER_MAX = 12;
const BLADDER_STEP_MS = 8_000;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let started = false;
let deaths = 0;
let bladder = 0;
let held = "";
const inZone: Record<string, boolean> = {};
const hinted: Record<string, boolean> = {};
const flags: Record<string, boolean> = {};

// ---------------------------------------------------------------------------
// Zones (world units)
// ---------------------------------------------------------------------------
// Voxel Z → World Z mapping for the plan:
//   Lobby voxel:      z=-40..-8   → world z=-80..-16
//   Stairs voxel:     z=-8..16    → world z=-16..32
//   Hallway voxel:    z=18..30    → world z=36..60
//   Cafeteria voxel:  z=32..56    → world z=64..112
//   Gym voxel:        z=58..86    → world z=116..172
//   Library voxel:    z=88..108   → world z=176..216
//   Mud Room voxel:   z=110..122  → world z=220..244
//   Final Pads voxel: z=124..132  → world z=248..264
//   Bathroom voxel:   z=134..154  → world z=268..308
const ZONES: Array<[string, number, number, number, number, number, number]> = [
  [YARD, -120, 0, -120, 120, 120, 120],
  [LOBBY_ZONE, -30, 200, -80, 30, 210, -16],
  [STAIRS, -16, 200, -20, 16, 222, 34], // wide enough to catch z=-18 test
  [HALLWAY, -14, 214, 36, 14, 224, 62],
  [CAFETERIA, -22, 214, 64, 22, 224, 114],
  [GYM, -18, 214, 116, 18, 224, 174],
  [LIBRARY, -16, 214, 176, 16, 224, 218],
  [MUD_ROOM, -16, 214, 220, 16, 226, 246],
  [FINAL, -14, 214, 248, 14, 230, 266],
  [BATHROOM, -20, 214, 268, 20, 230, 310],
];

const CHECKPOINT_LABELS: Record<string, string> = {
  [LOBBY_ZONE]: "Stage 1: Classroom 1A",
  [STAIRS]: "Stage 2: Grand Staircase",
  [HALLWAY]: "Stage 3: Locker Corridor",
  [CAFETERIA]: "Stage 4: Cafeteria Conveyors",
  [GYM]: "Stage 5: Gymnasium Court",
  [LIBRARY]: "Stage 6: Library Bookstacks",
  [MUD_ROOM]: "Stage 7: Mud Room Sludge",
  [FINAL]: "Stage 8: Upper Hallway",
  [BATHROOM]: "Stage 9: Restroom & Golden Toilet",
};

// Checkpoints in world units [x, z, y].
const CHECKPOINTS: Record<string, [number, number, number]> = {
  [LOBBY_ZONE]: [0, -40, LOBBY],
  [STAIRS]: [0, 16, 218],
  [HALLWAY]: [0, 42, 218],
  [CAFETERIA]: [0, 80, 218],
  [GYM]: [0, 134, 218],
  [LIBRARY]: [0, 178, 218],
  [MUD_ROOM]: [0, 232, 218],
  [FINAL]: [0, 256, 218],
  [BATHROOM]: [0, 285, 220],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function say(text: string): void {
  dispatch("toast", { player: "", text });
}
function narrate(name: string, text: string): void {
  dispatch("narrate", { player: "", name, text });
}
function hold(item: string): void {
  dispatch("item-hold", { player: "", item });
  held = item;
}
function give(item: string, text: string): void {
  dispatch("item-give", { player: "", item, count: 1 });
  hold(item);
  if (text !== "") {
    say(text);
  }
}
function take(item: string, count: number): void {
  dispatch("item-take", { player: "", item, count });
  if (held === item) {
    hold("");
  }
}
function ending(title: string, text: string): void {
  flags.finished = true;
  dispatch("ending", { player: "", title, text });
}
function showBladder(): void {
  dispatch("hud", {
    player: "",
    id: "bladder",
    kind: "bar",
    label: "Bladder",
    value: bladder,
    max: BLADDER_MAX,
  });
}
function bladderBeat(): void {
  if (flags.finished === true || bladder >= BLADDER_MAX) {
    return;
  }
  bladder += 1;
  showBladder();
  if (bladder >= BLADDER_MAX) {
    ending(
      "Accident",
      "You did not make it to the restroom in time. The whole school saw.",
    );
    return;
  }
  if (bladder === Math.floor(BLADDER_MAX * 0.75)) {
    narrate("You", "Getting desperate. I need to hurry.");
  }
  dispatch("timer", { id: "bladder", afterMs: BLADDER_STEP_MS });
}
function showCheckpoint(name: string): void {
  dispatch("hud", {
    player: "",
    id: "checkpoint",
    kind: "text",
    label: "Checkpoint",
    text: CHECKPOINT_LABELS[name] ?? name,
  });
}

// ---------------------------------------------------------------------------
// Plan (voxel coordinates)
// ---------------------------------------------------------------------------
function box(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  id: number,
): unknown {
  return { kind: "box", min: [minX, minY, minZ], max: [maxX, maxY, maxZ], id };
}

onPlan(() => {
  const b = blocks;
  const shapes: unknown[] = [
    // Ground
    box(-160, 0, -160, 160, GROUND - 1, 160, b.dirt),
    box(-160, GROUND, -160, 160, GROUND, 160, b.grass),
    box(-160, GROUND + 1, -160, 160, 90, 160, 0),

    // Outdoor Football Field (Yard z=-120..-45)
    box(-60, GROUND, -120, 60, GROUND, -45, b.grass),
    // Football yard line markings
    box(-55, GROUND, -110, 55, GROUND, -110, b.greystone),
    box(-55, GROUND, -95, 55, GROUND, -95, b.greystone),
    box(-55, GROUND, -80, 55, GROUND, -80, b.greystone),
    box(-55, GROUND, -65, 55, GROUND, -65, b.greystone),
    box(-55, GROUND, -50, 55, GROUND, -50, b.greystone),
    // Football Goalposts (Yellow/wood frame at endzone z=-115)
    box(-8, GROUND + 1, -115, -8, GROUND + 6, -115, b.wood),
    box(8, GROUND + 1, -115, 8, GROUND + 6, -115, b.wood),
    box(-8, GROUND + 4, -115, 8, GROUND + 4, -115, b.wood),

    // Classroom Starting Room (Indoor Lobby voxel z=-40..-8, world z=-80..-16)
    box(-15, LOBBY_VOXEL, -40, 15, LOBBY_VOXEL, -8, b.wood), // indoor classroom floor
    box(-16, LOBBY_VOXEL + 1, -41, -16, LOBBY_VOXEL + 7, -8, b.greystone), // left wall
    box(16, LOBBY_VOXEL + 1, -41, 16, LOBBY_VOXEL + 7, -8, b.greystone), // right wall
    box(-16, LOBBY_VOXEL + 1, -41, 16, LOBBY_VOXEL + 7, -41, b.greystone), // rear back wall
    box(-16, LOBBY_VOXEL + 8, -41, 16, LOBBY_VOXEL + 8, -8, b.greystone), // classroom roof / ceiling

    // Staircase & Tower Enclosure: 8 steps from voxel z=-8, then pedestal top
    {
      kind: "stairs",
      at: [-7, LOBBY_VOXEL + 1, -8],
      along: "z",
      steps: 8,
      rise: 1,
      run: 2,
      width: 15,
      id: b.greystone,
    },
    // Staircase pedestal (voxel z=8..16, world z=16..32)
    box(-7, 108, 8, 7, 108, 16, b.greystone),
    // Staircase side walls & roof
    box(-8, 101, -8, -8, 114, 16, b.greystone),
    box(8, 101, -8, 8, 114, 16, b.greystone),
    box(-8, 115, -8, 8, 115, 16, b.greystone), // roof over staircase

    // Hallway (voxel z=18..30, world z=36..60) — wood corridor with blue lockers
    box(-7, 108, 18, 7, 108, 30, b.wood),
    box(-8, 109, 18, -8, 114, 30, b.greystone), // left corridor wall
    box(8, 109, 18, 8, 114, 30, b.greystone), // right corridor wall
    box(-8, 115, 18, 8, 115, 30, b.greystone), // hallway roof ceiling
    // Blue school lockers along hallway walls
    box(-7, 109, 20, -7, 111, 28, b.ice),
    box(7, 109, 20, 7, 111, 28, b.ice),

    // Cafeteria (voxel z=32..56, world z=64..112) — wide floor for conveyors
    box(-11, 108, 32, 11, 108, 56, b.wood),
    box(-11, 109, 32, 11, 109, 33, b.greystone), // entrance step
    box(-12, 109, 32, -12, 114, 56, b.greystone), // cafeteria left wall
    box(12, 109, 32, 12, 114, 56, b.greystone), // cafeteria right wall
    box(-12, 115, 32, 12, 115, 56, b.greystone), // cafeteria roof ceiling

    // Gym (voxel z=58..86, world z=116..172)
    box(-8, 108, 58, 8, 108, 62, b.greystone), // entry pad
    box(-5, 109, 65, 5, 109, 70, b.wood), // first pillar
    box(-5, 110, 74, 5, 110, 79, b.wood), // second pillar
    box(-5, 109, 83, 5, 109, 87, b.wood), // third pillar — gym-bounce prop above it
    box(-7, 108, 82, 7, 108, 87, b.greystone), // gym checkpoint pedestal
    box(-9, 109, 58, -9, 114, 87, b.greystone), // gym left wall
    box(9, 109, 58, 9, 114, 87, b.greystone), // gym right wall
    box(-9, 115, 58, 9, 115, 87, b.greystone), // gym roof ceiling

    // Library (voxel z=88..108, world z=176..216)
    box(-5, 108, 90, 5, 108, 94, b.wood),
    box(-4, 109, 98, 4, 109, 103, b.wood),
    box(-5, 110, 107, 5, 110, 110, b.wood), // globe hovering at top
    box(-6, 108, 102, 6, 108, 108, b.greystone), // library checkpoint
    box(-7, 109, 88, -7, 114, 108, b.greystone), // library left wall
    box(7, 109, 88, 7, 114, 108, b.greystone), // library right wall
    box(-7, 115, 88, 7, 115, 108, b.greystone), // library roof ceiling

    // Mud Room (voxel z=110..122, world z=220..244) — dirt floor
    box(-7, 108, 110, 7, 108, 122, b.dirt),
    box(-8, 109, 110, -8, 114, 122, b.greystone), // mud room left wall
    box(8, 109, 110, 8, 114, 122, b.greystone), // mud room right wall
    box(-8, 115, 110, 8, 115, 122, b.greystone), // mud room roof ceiling

    // Final Pads (voxel z=124..132, world z=248..264)
    box(-5, 109, 124, 5, 109, 128, b.wood),
    box(-4, 110, 130, 4, 110, 133, b.wood),
    box(-5, 109, 132, 5, 109, 135, b.greystone),
    box(-7, 109, 124, -7, 114, 133, b.greystone), // final hall left wall
    box(7, 109, 124, 7, 114, 133, b.greystone), // final hall right wall
    box(-7, 115, 124, 7, 115, 133, b.greystone), // final hall roof ceiling

    // Bathroom (voxel z=134..154, world z=268..308) — tiled floor, walls and roof
    box(-9, 109, 134, 9, 109, 154, b.greystone),
    box(-10, 110, 134, -10, 114, 154, b.greystone), // bathroom left wall
    box(10, 110, 134, 10, 114, 154, b.greystone), // bathroom right wall
    box(-10, 110, 154, 10, 114, 154, b.greystone), // bathroom back wall
    box(-10, 115, 134, 10, 115, 154, b.greystone), // bathroom roof ceiling
    // Restroom doorway arch header (world z=268, voxel z=134)
    box(-4, 112, 134, 4, 113, 134, b.greystone),
  ];
  return JSON.stringify(shapes);
});

// ---------------------------------------------------------------------------
// Open (world units for props, zones, fields)
// ---------------------------------------------------------------------------
function open(): void {
  dispatch("time", { seconds: 480, speed: 0 });

  dispatch("item-define", {
    id: "soap",
    name: "Soap",
    sprite: "",
    stackable: false,
  });
  dispatch("item-define", {
    id: "hall-pass",
    name: "Hall Pass",
    sprite: "",
    stackable: false,
  });
  dispatch("item-define", {
    id: "toilet-paper",
    name: "Toilet Paper",
    sprite: "",
    stackable: false,
  });

  for (const [id, minX, minY, minZ, maxX, maxY, maxZ] of ZONES) {
    dispatch("zone", {
      id,
      name: id,
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });
  }

  // Quicksand over the Mud Room floor (world z=220..244, world y=218..226)
  dispatch("field", {
    id: "mud",
    kind: "quicksand",
    min: [-14, 218, 220],
    max: [14, 226, 244],
    speedScale: 0.25,
    sink: 2,
  });

  // Soap pickup on lobby floor (world y=202)
  createProp({
    id: "soap",
    model: "soap",
    x: -10,
    z: -50,
    y: LOBBY,
    name: "Soap",
    height: 0.4,
    solid: false,
  });

  // Wet-floor sign in the hallway (world z=48 = roughly mid-hallway)
  createProp({
    id: "wet-floor",
    model: "wet-floor",
    x: 3,
    z: 48,
    y: 218,
    name: "Wet Floor",
    height: 1.5,
    solid: false,
    hazard: true,
  });

  // RESTROOM Sign above the bathroom doorway (world z=268, y=225)
  createProp({
    id: "restroom-sign",
    model: "platform",
    x: 0,
    z: 268,
    y: 225,
    name: "RESTROOM Sign",
    height: 1.2,
    solid: false,
  });

  // First toilet roll tumbling down the stairs (world z=14, y=220)
  createProp({
    id: "toilet-roll",
    model: "toilet-roll",
    x: 2,
    z: 14,
    y: 220,
    name: "Toilet Roll",
    height: 1,
    solid: false,
    motion: {
      path: [
        [0, 0, 0],
        [0, -14, -52],
      ],
      loop: "loop",
      durationMs: 5_000,
      ease: "smooth",
      spin: { axis: [1, 0, 0], degreesPerMeter: 120 },
    },
  });

  // Second toilet roll — offset 2.5s so they come in waves
  createProp({
    id: "toilet-roll-2",
    model: "toilet-roll",
    x: -2,
    z: 14,
    y: 220,
    name: "Toilet Roll",
    height: 1,
    solid: false,
    motion: {
      path: [
        [0, 0, 0],
        [0, -14, -52],
      ],
      loop: "loop",
      durationMs: 5_000,
      startAfterMs: 2_500,
      ease: "smooth",
      spin: { axis: [1, 0, 0], degreesPerMeter: 120 },
    },
  });

  // Moving plank bridging pedestal to hallway (world z=22..32, ping-pong)
  createProp({
    id: "moving-plank",
    model: "platform",
    x: 0,
    z: 26,
    y: 216,
    name: "Moving Plank",
    height: 2,
    solid: true,
    motion: {
      path: [
        [0, 0, 0],
        [0, 0, 10],
      ],
      loop: "pingpong",
      durationMs: 3_500,
      ease: "smooth",
    },
  });

  // Cafeteria: three conveyor-belt lunch trays (world z=70, 86, 102)
  createProp({
    id: "tray-a",
    model: "platform",
    x: 0,
    z: 70,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });
  createProp({
    id: "tray-b",
    model: "platform",
    x: 0,
    z: 86,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });
  createProp({
    id: "tray-c",
    model: "platform",
    x: 0,
    z: 102,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });

  // Gym: side-sliding platform (world z=130)
  createProp({
    id: "gym-slide",
    model: "platform",
    x: 0,
    z: 130,
    y: 220,
    name: "Gym Platform",
    height: 2,
    solid: true,
    motion: {
      path: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      loop: "pingpong",
      durationMs: 2_800,
      ease: "smooth",
    },
  });

  // Gym: classic spinning turntable (world z=148)
  createProp({
    id: "turntable",
    model: "platform",
    x: 0,
    z: 148,
    y: 220,
    name: "Turntable",
    height: 2,
    solid: true,
    motion: {
      path: [[0, 0, 0]],
      loop: "loop",
      durationMs: 1_000,
      spin: { axis: [0, 1, 0], turnsPerSecond: 0.1 },
    },
  });

  // Gym: falling-rising platform (world z=166)
  createProp({
    id: "gym-bounce",
    model: "platform",
    x: 0,
    z: 166,
    y: 220,
    name: "Falling Platform",
    height: 2,
    solid: true,
    motion: {
      path: [
        [0, 0, 0],
        [0, -6, 0],
      ],
      loop: "pingpong",
      durationMs: 2_000,
      ease: "smooth",
    },
  });

  // Library: rolling globe hazard (world z=196)
  createProp({
    id: "globe",
    model: "toilet-roll",
    x: 0,
    z: 196,
    y: 222,
    name: "Globe",
    height: 1.2,
    solid: false,
    hazard: true,
    motion: {
      path: [
        [-5, 0, 0],
        [5, 0, 0],
      ],
      loop: "pingpong",
      durationMs: 3_000,
      ease: "smooth",
      spin: { axis: [0, 0, 1], turnsPerSecond: 0.5 },
    },
  });

  // NPCs
  createNpc({
    id: JANITOR,
    x: -18,
    z: -50,
    y: LOBBY,
    name: "Janitor",
    model: "npc-sable",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: BULLY,
    x: 0,
    z: 40,
    y: 218,
    name: "Bully",
    model: "npc-bully",
    yaw: Math.PI,
  });
  createNpc({
    id: PRINCIPAL,
    x: -14,
    z: 88,
    y: 218,
    name: "Principal",
    model: "npc-brad",
    yaw: Math.PI / 2,
  });
  createNpc({
    id: TEACHER,
    x: 0,
    z: 278,
    y: 220,
    name: "Teacher",
    model: "npc-teacher",
    yaw: Math.PI,
  });

  dispatch("player-place", { player: "", x: 0, z: -50, y: LOBBY });
  dispatch("void", { y: VOID_Y });

  showBladder();
  dispatch("timer", { id: "bladder", afterMs: BLADDER_STEP_MS });

  dispatch("cutscene", {
    player: "",
    shots: [
      { at: [-60, 268, -140], look: [0, 210, 0], durationMs: 0, holdMs: 1_200 },
      {
        at: [0, 236, -80],
        look: [0, 210, 30],
        durationMs: 3_500,
        holdMs: 600,
        ease: "smooth",
      },
    ],
  });

  narrate(
    "You",
    "I drank three juice boxes at lunch and the teacher won't give me a hall pass. " +
      "The bathroom is all the way at the other end of the school. I have to make it.",
  );
}

// ---------------------------------------------------------------------------
// Hints
// ---------------------------------------------------------------------------
function hintFor(zone: string): void {
  if (zone === LOBBY_ZONE) {
    narrate(
      "You",
      "Stage 1: Classroom 1A. The staircase is at the end of the lobby. Watch out — toilet paper rolls tumble down!",
    );
  } else if (zone === STAIRS) {
    narrate(
      "You",
      "Stage 2: Grand Staircase. Climbing up! There is a moving plank at the top — wait for it to swing.",
    );
  } else if (zone === HALLWAY) {
    narrate(
      "You",
      "Stage 3: Locker Corridor! The janitor left the floor wet. Do NOT touch the wet floor sign.",
    );
  } else if (zone === CAFETERIA) {
    narrate(
      "You",
      "Stage 4: Cafeteria! Lunch trays are moving on conveyor belts — ride them across.",
    );
  } else if (zone === GYM) {
    narrate(
      "You",
      "Stage 5: Gymnasium! Spinning turntables and moving platforms ahead.",
    );
  } else if (zone === LIBRARY) {
    narrate(
      "You",
      "Stage 6: Library! Hop across book stacks and dodge the rolling globe hazard.",
    );
  } else if (zone === MUD_ROOM) {
    narrate(
      "You",
      "Stage 7: Mud Room! The floor is thick quicksand. Use soap to slide across.",
    );
  } else if (zone === FINAL) {
    narrate("You", "Stage 8: Upper Hallway! Almost at the restroom door.");
  }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
function useSoap(): void {
  if (held !== "soap") {
    narrate("You", "My hands are empty.");
    return;
  }
  take("soap", 1);
  dispatch("player-jump", { player: "", multiplier: 1.5 });
  narrate("You", "Slippery! But I can jump higher now.");
}

function useHallPass(): void {
  if (held !== "hall-pass") {
    narrate("You", "I do not have a hall pass.");
    return;
  }
  narrate("You", "The hall pass makes me feel slightly more legitimate.");
}

function used(entityId: string, _item: string): void {
  if (entityId === "soap") {
    dispatch("prop-remove", { id: "soap" });
    give("soap", "You pocket the soap bar.");
    return;
  }
  if (entityId === "wet-floor") {
    narrate("You", "That sign is not there to be touched.");
    return;
  }
  if (entityId === "globe") {
    narrate("You", "Ouch — that was the library globe.");
    return;
  }
  if (entityId === "tray-a" || entityId === "tray-b" || entityId === "tray-c") {
    narrate("You", "Leftover lunch. No time to eat.");
  }
}

function usedItem(item: string): void {
  if (item === "soap") {
    useSoap();
    return;
  }
  if (item === "hall-pass") {
    useHallPass();
    return;
  }
  narrate("You", "Now is not the time.");
}

// ---------------------------------------------------------------------------
// NPC dialogue
// ---------------------------------------------------------------------------
function talked(npcId: string): void {
  if (npcId === JANITOR) {
    narrate(
      "Janitor",
      "Wet floor ahead, kid. I just mopped it. Mind the sign.",
    );
    return;
  }
  if (npcId === BULLY) {
    if (flags.bullyTalked !== true) {
      flags.bullyTalked = true;
      narrate(
        "Bully",
        "Where do you think you're going? You better not make it.",
      );
    } else {
      narrate("Bully", "Still here. Still judging you.");
    }
    return;
  }
  if (npcId === PRINCIPAL) {
    if (held === "hall-pass") {
      narrate("Principal", "I see you have a hall pass. Very well — carry on.");
    } else {
      narrate(
        "Principal",
        "Running in the halls? This is not acceptable. Where is your hall pass?",
      );
      if (flags.principalGavePass !== true) {
        flags.principalGavePass = true;
        give("hall-pass", "The principal sighs and hands you a hall pass.");
      }
    }
    return;
  }
  if (npcId === TEACHER) {
    narrate(
      "Teacher",
      "You made it. Through that door — now. I will handle the paperwork.",
    );
  }
}

// ---------------------------------------------------------------------------
// Zone entry
// ---------------------------------------------------------------------------
function entered(zone: string): void {
  if (flags.finished === true) {
    return;
  }

  if (zone === BATHROOM) {
    ending(
      "Relieved",
      "You made it to the restroom just in time. " +
        "The teacher's expression when you walked back into class was priceless.",
    );
    return;
  }

  const spot = CHECKPOINTS[zone];
  if (spot !== undefined) {
    dispatch("player-checkpoint", {
      player: "",
      x: spot[0],
      z: spot[1],
      y: spot[2],
    });
    showCheckpoint(zone);
  }

  if (zone === STAIRS && flags.stairBeat !== true) {
    flags.stairBeat = true;
    dispatch("camera", {
      player: "",
      at: [30, 234, -8],
      look: [0, 210, -40],
      durationMs: 2_000,
      holdMs: 600,
      ease: "smooth",
    });
  }
  if (zone === CAFETERIA && flags.cafeBeat !== true) {
    flags.cafeBeat = true;
    dispatch("camera", {
      player: "",
      at: [30, 228, 88],
      look: [0, 218, 88],
      durationMs: 1_500,
      holdMs: 500,
      ease: "smooth",
    });
  }
  if (zone === MUD_ROOM && flags.mudBeat !== true) {
    flags.mudBeat = true;
    dispatch("camera", {
      player: "",
      at: [20, 228, 232],
      look: [0, 218, 232],
      durationMs: 1_500,
      holdMs: 500,
      ease: "smooth",
    });
  }
  if (zone === BATHROOM && flags.bathBeat !== true) {
    flags.bathBeat = true;
    dispatch("camera", {
      player: "",
      at: [30, 230, 280],
      look: [0, 218, 280],
      durationMs: 1_200,
      holdMs: 800,
      ease: "smooth",
    });
  }
}

// ---------------------------------------------------------------------------
// Hazard touches
// ---------------------------------------------------------------------------
function touched(entityId: string): void {
  if (entityId === "wet-floor") {
    dispatch("player-kill", { player: "", cause: "wet-floor" });
    return;
  }
  if (entityId === "globe") {
    dispatch("player-kill", { player: "", cause: "globe" });
  }
}

// ---------------------------------------------------------------------------
// Player death
// ---------------------------------------------------------------------------
function died(cause: string): void {
  deaths += 1;
  if (cause === "void") {
    narrate("You", "Fell all the way to the yard. That did not help.");
  } else if (cause === "wet-floor") {
    narrate("You", "The wet floor got me. Deaths so far: " + deaths + ".");
  } else if (cause === "globe") {
    narrate("You", "Knocked off by a library globe. Deaths: " + deaths + ".");
  } else {
    narrate("You", "Down again. Deaths: " + deaths + ".");
  }
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------
onTick((_clockMs, events) => {
  if (!started) {
    started = true;
    open();
  }
  for (const event of events) {
    if (event.kind === "zone-entered" && event.zoneId !== undefined) {
      inZone[event.zoneId] = true;
      entered(event.zoneId);
      if (hinted[event.zoneId] !== true) {
        hinted[event.zoneId] = true;
        hintFor(event.zoneId);
      }
    } else if (event.kind === "zone-left" && event.zoneId !== undefined) {
      delete inZone[event.zoneId];
    } else if (event.kind === "entity-used" && event.entityId !== undefined) {
      used(event.entityId, event.item ?? "");
    } else if (event.kind === "item-used" && event.item !== undefined) {
      usedItem(event.item);
    } else if (event.kind === "npc-talk" && event.npcId !== undefined) {
      talked(event.npcId);
    } else if (
      event.kind === "player-touched" &&
      event.entityId !== undefined
    ) {
      touched(event.entityId);
    } else if (event.kind === "player-died") {
      died(event.cause ?? "");
    } else if (event.kind === "timer" && event.timerId === "bladder") {
      bladderBeat();
    }
  }
});
`,pS=`// The "Home" demo's place script: a guide standing near the spawn who says
// hello back once talked to. It is the world a first-time visitor lands in
// before they have heard of a demo, a place, or an account at all.
import { createNpc, dispatch, log, onTick } from "voxelscape";

const GUIDE = "guide";

let started = false;

onTick((_clockMs, events) => {
  if (!started) {
    started = true;
    createNpc({ id: GUIDE, x: 8, z: 8, name: "Guide" });
    log("your place started");
  }
  for (const event of events) {
    if (event.kind === "npc-talk") {
      dispatch("toast", {
        player: event.producer,
        text: "Hello, traveller.",
      });
    }
  }
});
`,mS=["bed.zip","bathtub.zip","sofa.zip","tv.zip","table.zip","counter.zip","stove.zip","fridge.zip","bench.zip","manhole.zip","trash.zip","register.zip","shelf.zip","vending.zip","chips.zip","orange.zip","colgate.zip","cola.zip","egg.zip","friedegg.zip","juice.zip","milk.zip","tix.zip","robux.zip","plate.zip","npc-sable.zip","npc-rook.zip"],gS=["npc-laugh.zip","npc-alex.zip","npc-james.zip","npc-bully.zip","npc-nerd.zip","npc-homeless.zip","npc-brit.zip","npc-brett.zip","npc-brad.zip","npc-sleepa.zip","npc-champ.zip","npc-teacher.zip","npc-lemonade.zip","npc-pothead.zip","npc-santa.zip","npc-obby.zip","npc-littlebro.zip","npc-anomaly.zip","bed.zip","phone.zip","mirror.zip","bookshelf.zip","counter.zip","fridge.zip","tv.zip","sofa.zip","door.zip","mailbox.zip","lemonade-stand.zip","bus-stop.zip","flower.zip","gate.zip","shelf.zip","vending.zip","slushie-machine.zip","arcade.zip","boarded-machine.zip","dumpster.zip","bench.zip","desk.zip","chair.zip","locker.zip","cafeteria-table.zip","plate.zip","poster.zip","plush.zip","banana.zip","chips.zip","key.zip","matches.zip","slushie.zip","pizza.zip","hotdog.zip","salad.zip","taco.zip","historybook.zip","roaster.zip","hat.zip","lemonade.zip","foodbag.zip","bean.zip","cola.zip","tix.zip"],yS=["zombie.zip"],bS=["soap.zip","wet-floor.zip","platform.zip","toilet-roll.zip","npc-sable.zip","npc-bully.zip","npc-brad.zip","npc-teacher.zip"],vS={id:"get-a-snack-at-4-am",manifest:{name:"Get a Snack at 4 AM",seed:4004,spawn:[-14,0,-12],models:mS},scripts:{[Pr]:uS}},wS={id:"late-to-school",manifest:{name:"Late to School",seed:2546,spawn:[-12,0,16],models:gS},scripts:{[Pr]:dS}},_S={id:"zombies",manifest:{name:"Zombies",seed:90210,spawn:[0,0,0],mode:"multi",models:yS},scripts:{[Pr]:hS}},xS={id:"dont-poop-yourself-at-school",manifest:{name:"Don't Poop Yourself at School",seed:4202,spawn:[0,0,0],models:bS},scripts:{[Pr]:fS}},kS={id:"home",manifest:{name:"home",seed:54321,spawn:[0,0,0],mode:"multi:edit"},scripts:{[Pr]:pS}},Yu=[vS,wS,_S,xS,kS],Xu=t=>Yu.find(e=>e.id===t)??null,Xy=async t=>{const e={};for(const n of t.manifest.models??[])try{const r=await fetch(`/big-mesh-studios/voxelscape/models/${n}`);r.ok&&(e[n]=new Uint8Array(await r.arrayBuffer()))}catch{}return{manifest:{...t.manifest,scripts:Object.keys(t.scripts)},scripts:t.scripts,models:e}},SS="https://esm.sh/typescript@5.9.3",ES="typescript";let Lf;function AS(){return Lf??=typeof globalThis<"u"&&"process"in globalThis?import(ES):import(SS).then(t=>t.default??t),Lf}var ln=Uint8Array,bi=Uint16Array,TS=Int32Array,qy=new ln([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),Zy=new ln([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),CS=new ln([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Ky=function(t,e){for(var n=new bi(31),r=0;r<31;++r)n[r]=e+=1<<t[r-1];for(var s=new TS(n[30]),r=1;r<30;++r)for(var i=n[r];i<n[r+1];++i)s[i]=i-n[r]<<5|r;return{b:n,r:s}},Jy=Ky(qy,2),Qy=Jy.b,MS=Jy.r;Qy[28]=258,MS[258]=28;var RS=Ky(Zy,0),PS=RS.b,qu=new bi(32768);for(var pt=0;pt<32768;++pt){var ns=(pt&43690)>>1|(pt&21845)<<1;ns=(ns&52428)>>2|(ns&13107)<<2,ns=(ns&61680)>>4|(ns&3855)<<4,qu[pt]=((ns&65280)>>8|(ns&255)<<8)>>1}var _o=(function(t,e,n){for(var r=t.length,s=0,i=new bi(e);s<r;++s)t[s]&&++i[t[s]-1];var o=new bi(e);for(s=1;s<e;++s)o[s]=o[s-1]+i[s-1]<<1;var a;if(n){a=new bi(1<<e);var l=15-e;for(s=0;s<r;++s)if(t[s])for(var c=s<<4|t[s],u=e-t[s],d=o[t[s]-1]++<<u,h=d|(1<<u)-1;d<=h;++d)a[qu[d]>>l]=c}else for(a=new bi(r),s=0;s<r;++s)t[s]&&(a[s]=qu[o[t[s]-1]++]>>15-t[s]);return a}),Yo=new ln(288);for(var pt=0;pt<144;++pt)Yo[pt]=8;for(var pt=144;pt<256;++pt)Yo[pt]=9;for(var pt=256;pt<280;++pt)Yo[pt]=7;for(var pt=280;pt<288;++pt)Yo[pt]=8;var e0=new ln(32);for(var pt=0;pt<32;++pt)e0[pt]=5;var IS=_o(Yo,9,1),OS=_o(e0,5,1),Cc=function(t){for(var e=t[0],n=1;n<t.length;++n)t[n]>e&&(e=t[n]);return e},tr=function(t,e,n){var r=e/8|0;return(t[r]|t[r+1]<<8)>>(e&7)&n},Mc=function(t,e){var n=e/8|0;return(t[n]|t[n+1]<<8|t[n+2]<<16)>>(e&7)},zS=function(t){return(t+7)/8|0},Ia=function(t,e,n){return(e==null||e<0)&&(e=0),(n==null||n>t.length)&&(n=t.length),new ln(t.subarray(e,n))},LS=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],bn=function(t,e,n){var r=new Error(e||LS[t]);if(r.code=t,Error.captureStackTrace&&Error.captureStackTrace(r,bn),!n)throw r;return r},t0=function(t,e,n,r){var s=t.length,i=0;if(!s||e.f&&!e.l)return n||new ln(0);var o=!n,a=o||e.i!=2,l=e.i;o&&(n=new ln(s*3));var c=function(Ne){var ot=n.length;if(Ne>ot){var mt=new ln(Math.max(ot*2,Ne));mt.set(n),n=mt}},u=e.f||0,d=e.p||0,h=e.b||0,f=e.l,m=e.d,p=e.m,y=e.n,g=s*8;do{if(!f){u=tr(t,d,1);var b=tr(t,d+1,3);if(d+=3,b)if(b==1)f=IS,m=OS,p=9,y=5;else if(b==2){var C=tr(t,d,31)+257,E=tr(t,d+10,15)+4,T=C+tr(t,d+5,31)+1;d+=14;for(var A=new ln(T),M=new ln(19),O=0;O<E;++O)M[CS[O]]=tr(t,d+O*3,7);d+=E*3;for(var S=Cc(M),z=(1<<S)-1,w=_o(M,S,1),O=0;O<T;){var R=w[tr(t,d,z)];d+=R&15;var v=R>>4;if(v<16)A[O++]=v;else{var F=0,D=0;for(v==16?(D=3+tr(t,d,3),d+=2,F=A[O-1]):v==17?(D=3+tr(t,d,7),d+=3):v==18&&(D=11+tr(t,d,127),d+=7);D--;)A[O++]=F}}var Q=A.subarray(0,C),H=A.subarray(C);p=Cc(Q),y=Cc(H),f=_o(Q,p,1),m=_o(H,y,1)}else bn(1);else{var v=zS(d)+4,x=t[v-4]|t[v-3]<<8,k=v+x;if(k>s){l&&bn(0);break}a&&c(h+x),n.set(t.subarray(v,k),h),e.b=h+=x,e.p=d=k*8,e.f=u;continue}if(d>g){l&&bn(0);break}}a&&c(h+131072);for(var J=(1<<p)-1,N=(1<<y)-1,U=d;;U=d){var F=f[Mc(t,d)&J],ae=F>>4;if(d+=F&15,d>g){l&&bn(0);break}if(F||bn(2),ae<256)n[h++]=ae;else if(ae==256){U=d,f=null;break}else{var ie=ae-254;if(ae>264){var O=ae-257,q=qy[O];ie=tr(t,d,(1<<q)-1)+Qy[O],d+=q}var be=m[Mc(t,d)&N],De=be>>4;be||bn(3),d+=be&15;var H=PS[De];if(De>3){var q=Zy[De];H+=Mc(t,d)&(1<<q)-1,d+=q}if(d>g){l&&bn(0);break}a&&c(h+131072);var Se=h+ie;if(h<H){var Me=i-H,nt=Math.min(H,Se);for(Me+h<0&&bn(3);h<nt;++h)n[h]=r[Me+h]}for(;h<Se;++h)n[h]=n[h-H]}}e.l=f,e.p=U,e.b=h,e.f=u,f&&(u=1,e.m=p,e.d=m,e.n=y)}while(!u);return h!=n.length&&o?Ia(n,0,h):n.subarray(0,h)},$S=new ln(0),n0=function(t,e){return((t[0]&15)!=8||t[0]>>4>7||(t[0]<<8|t[1])%31)&&bn(6,"invalid zlib data"),(t[1]>>5&1)==+!e&&bn(6,"invalid zlib data: "+(t[1]&32?"need":"unexpected")+" dictionary"),(t[1]>>3&4)+2},Rc=(function(){function t(e,n){typeof e=="function"&&(n=e,e={}),this.ondata=n;var r=e&&e.dictionary&&e.dictionary.subarray(-32768);this.s={i:0,b:r?r.length:0},this.o=new ln(32768),this.p=new ln(0),r&&this.o.set(r)}return t.prototype.e=function(e){if(this.ondata||bn(5),this.d&&bn(4),!this.p.length)this.p=e;else if(e.length){var n=new ln(this.p.length+e.length);n.set(this.p),n.set(e,this.p.length),this.p=n}},t.prototype.c=function(e){this.s.i=+(this.d=e||!1);var n=this.s.b,r=t0(this.p,this.s,this.o);this.ondata(Ia(r,n,this.s.b),this.d),this.o=Ia(r,this.s.b-32768),this.s.b=this.o.length,this.p=Ia(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(e,n){this.e(e),this.c(n)},t})(),$f=(function(){function t(e,n){Rc.call(this,e,n),this.v=e&&e.dictionary?2:1}return t.prototype.push=function(e,n){if(Rc.prototype.e.call(this,e),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(n0(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&bn(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),Rc.prototype.c.call(this,n)},t})();function DS(t,e){return t0(t.subarray(n0(t,e),-4),{i:2},e,e)}var NS=typeof TextDecoder<"u"&&new TextDecoder,FS=0;try{NS.decode($S,{stream:!0}),FS=1}catch{}function Df(t,e="utf8"){return new TextDecoder(e).decode(t)}const BS=new TextEncoder;function US(t){return BS.encode(t)}const HS=1024*8,jS=(()=>{const t=new Uint8Array(4),e=new Uint32Array(t.buffer);return!((e[0]=1)&t[0])})(),Pc={int8:globalThis.Int8Array,uint8:globalThis.Uint8Array,int16:globalThis.Int16Array,uint16:globalThis.Uint16Array,int32:globalThis.Int32Array,uint32:globalThis.Uint32Array,uint64:globalThis.BigUint64Array,int64:globalThis.BigInt64Array,float32:globalThis.Float32Array,float64:globalThis.Float64Array};class Zd{buffer;byteLength;byteOffset;length;offset;lastWrittenByte;littleEndian;_data;_mark;_marks;constructor(e=HS,n={}){let r=!1;typeof e=="number"?e=new ArrayBuffer(e):(r=!0,this.lastWrittenByte=e.byteLength);const s=n.offset?n.offset>>>0:0,i=e.byteLength-s;let o=s;(ArrayBuffer.isView(e)||e instanceof Zd)&&(e.byteLength!==e.buffer.byteLength&&(o=e.byteOffset+s),e=e.buffer),r?this.lastWrittenByte=i:this.lastWrittenByte=0,this.buffer=e,this.length=i,this.byteLength=i,this.byteOffset=o,this.offset=0,this.littleEndian=!0,this._data=new DataView(this.buffer,o,i),this._mark=0,this._marks=[]}available(e=1){return this.offset+e<=this.length}isLittleEndian(){return this.littleEndian}setLittleEndian(){return this.littleEndian=!0,this}isBigEndian(){return!this.littleEndian}setBigEndian(){return this.littleEndian=!1,this}skip(e=1){return this.offset+=e,this}back(e=1){return this.offset-=e,this}seek(e){return this.offset=e,this}mark(){return this._mark=this.offset,this}reset(){return this.offset=this._mark,this}pushMark(){return this._marks.push(this.offset),this}popMark(){const e=this._marks.pop();if(e===void 0)throw new Error("Mark stack empty");return this.seek(e),this}rewind(){return this.offset=0,this}ensureAvailable(e=1){if(!this.available(e)){const r=(this.offset+e)*2,s=new Uint8Array(r);s.set(new Uint8Array(this.buffer)),this.buffer=s.buffer,this.length=r,this.byteLength=r,this._data=new DataView(this.buffer)}return this}readBoolean(){return this.readUint8()!==0}readInt8(){return this._data.getInt8(this.offset++)}readUint8(){return this._data.getUint8(this.offset++)}readByte(){return this.readUint8()}readBytes(e=1){return this.readArray(e,"uint8")}readArray(e,n){const r=Pc[n].BYTES_PER_ELEMENT*e,s=this.byteOffset+this.offset,i=this.buffer.slice(s,s+r);if(this.littleEndian===jS&&n!=="uint8"&&n!=="int8"){const a=new Uint8Array(this.buffer.slice(s,s+r));a.reverse();const l=new Pc[n](a.buffer);return this.offset+=r,l.reverse(),l}const o=new Pc[n](i);return this.offset+=r,o}readInt16(){const e=this._data.getInt16(this.offset,this.littleEndian);return this.offset+=2,e}readUint16(){const e=this._data.getUint16(this.offset,this.littleEndian);return this.offset+=2,e}readInt32(){const e=this._data.getInt32(this.offset,this.littleEndian);return this.offset+=4,e}readUint32(){const e=this._data.getUint32(this.offset,this.littleEndian);return this.offset+=4,e}readFloat32(){const e=this._data.getFloat32(this.offset,this.littleEndian);return this.offset+=4,e}readFloat64(){const e=this._data.getFloat64(this.offset,this.littleEndian);return this.offset+=8,e}readBigInt64(){const e=this._data.getBigInt64(this.offset,this.littleEndian);return this.offset+=8,e}readBigUint64(){const e=this._data.getBigUint64(this.offset,this.littleEndian);return this.offset+=8,e}readChar(){return String.fromCharCode(this.readInt8())}readChars(e=1){let n="";for(let r=0;r<e;r++)n+=this.readChar();return n}readUtf8(e=1){return Df(this.readBytes(e))}decodeText(e=1,n="utf8"){return Df(this.readBytes(e),n)}writeBoolean(e){return this.writeUint8(e?255:0),this}writeInt8(e){return this.ensureAvailable(1),this._data.setInt8(this.offset++,e),this._updateLastWrittenByte(),this}writeUint8(e){return this.ensureAvailable(1),this._data.setUint8(this.offset++,e),this._updateLastWrittenByte(),this}writeByte(e){return this.writeUint8(e)}writeBytes(e){this.ensureAvailable(e.length);for(let n=0;n<e.length;n++)this._data.setUint8(this.offset++,e[n]);return this._updateLastWrittenByte(),this}writeInt16(e){return this.ensureAvailable(2),this._data.setInt16(this.offset,e,this.littleEndian),this.offset+=2,this._updateLastWrittenByte(),this}writeUint16(e){return this.ensureAvailable(2),this._data.setUint16(this.offset,e,this.littleEndian),this.offset+=2,this._updateLastWrittenByte(),this}writeInt32(e){return this.ensureAvailable(4),this._data.setInt32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeUint32(e){return this.ensureAvailable(4),this._data.setUint32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeFloat32(e){return this.ensureAvailable(4),this._data.setFloat32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeFloat64(e){return this.ensureAvailable(8),this._data.setFloat64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeBigInt64(e){return this.ensureAvailable(8),this._data.setBigInt64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeBigUint64(e){return this.ensureAvailable(8),this._data.setBigUint64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeChar(e){return this.writeUint8(e.charCodeAt(0))}writeChars(e){for(let n=0;n<e.length;n++)this.writeUint8(e.charCodeAt(n));return this}writeUtf8(e){return this.writeBytes(US(e))}toArray(){return new Uint8Array(this.buffer,this.byteOffset,this.lastWrittenByte)}getWrittenByteLength(){return this.lastWrittenByte-this.byteOffset}_updateLastWrittenByte(){this.offset>this.lastWrittenByte&&(this.lastWrittenByte=this.offset)}}const r0=[];for(let t=0;t<256;t++){let e=t;for(let n=0;n<8;n++)e&1?e=3988292384^e>>>1:e=e>>>1;r0[t]=e}const Nf=4294967295;function WS(t,e,n){let r=t;for(let s=0;s<n;s++)r=r0[(r^e[s])&255]^r>>>8;return r}function VS(t,e){return(WS(Nf,t,e)^Nf)>>>0}function Ff(t,e,n){const r=t.readUint32(),s=VS(new Uint8Array(t.buffer,t.byteOffset+t.offset-e-4,e),e);if(s!==r)throw new Error(`CRC mismatch for chunk ${n}. Expected ${r}, found ${s}`)}function s0(t,e,n){for(let r=0;r<n;r++)e[r]=t[r]}function i0(t,e,n,r){let s=0;for(;s<r;s++)e[s]=t[s];for(;s<n;s++)e[s]=t[s]+e[s-r]&255}function o0(t,e,n,r){let s=0;if(n.length===0)for(;s<r;s++)e[s]=t[s];else for(;s<r;s++)e[s]=t[s]+n[s]&255}function a0(t,e,n,r,s){let i=0;if(n.length===0){for(;i<s;i++)e[i]=t[i];for(;i<r;i++)e[i]=t[i]+(e[i-s]>>1)&255}else{for(;i<s;i++)e[i]=t[i]+(n[i]>>1)&255;for(;i<r;i++)e[i]=t[i]+(e[i-s]+n[i]>>1)&255}}function l0(t,e,n,r,s){let i=0;if(n.length===0){for(;i<s;i++)e[i]=t[i];for(;i<r;i++)e[i]=t[i]+e[i-s]&255}else{for(;i<s;i++)e[i]=t[i]+n[i]&255;for(;i<r;i++)e[i]=t[i]+GS(e[i-s],n[i],n[i-s])&255}}function GS(t,e,n){const r=t+e-n,s=Math.abs(r-t),i=Math.abs(r-e),o=Math.abs(r-n);return s<=i&&s<=o?t:i<=o?e:n}function YS(t,e,n,r,s,i){switch(t){case 0:s0(e,n,s);break;case 1:i0(e,n,s,i);break;case 2:o0(e,n,r,s);break;case 3:a0(e,n,r,s,i);break;case 4:l0(e,n,r,s,i);break;default:throw new Error(`Unsupported filter: ${t}`)}}const XS=new Uint16Array([255]),qS=new Uint8Array(XS.buffer),ZS=qS[0]===255;function KS(t){const{data:e,width:n,height:r,channels:s,depth:i}=t,o=[{x:0,y:0,xStep:8,yStep:8},{x:4,y:0,xStep:8,yStep:8},{x:0,y:4,xStep:4,yStep:8},{x:2,y:0,xStep:4,yStep:4},{x:0,y:2,xStep:2,yStep:4},{x:1,y:0,xStep:2,yStep:2},{x:0,y:1,xStep:1,yStep:2}],a=Math.ceil(i/8)*s,l=new Uint8Array(r*n*a);let c=0;for(let u=0;u<7;u++){const d=o[u],h=Math.ceil((n-d.x)/d.xStep),f=Math.ceil((r-d.y)/d.yStep);if(h<=0||f<=0)continue;const m=h*a,p=new Uint8Array(m);for(let y=0;y<f;y++){const g=e[c++],b=e.subarray(c,c+m);c+=m;const v=new Uint8Array(m);YS(g,b,v,p,m,a),p.set(v);for(let x=0;x<h;x++){const k=d.x+x*d.xStep,C=d.y+y*d.yStep;if(!(k>=n||C>=r))for(let E=0;E<a;E++)l[(C*n+k)*a+E]=v[x*a+E]}}}if(i===16){const u=new Uint16Array(l.buffer);if(ZS)for(let d=0;d<u.length;d++)u[d]=JS(u[d]);return u}else return l}function JS(t){return(t&255)<<8|t>>8&255}const QS=new Uint16Array([255]),e2=new Uint8Array(QS.buffer),t2=e2[0]===255,n2=new Uint8Array(0);function Bf(t){const{data:e,width:n,height:r,channels:s,depth:i}=t,o=Math.ceil(i/8)*s,a=Math.ceil(i/8*s*n),l=new Uint8Array(r*a);let c=n2,u=0,d,h;for(let f=0;f<r;f++){switch(d=e.subarray(u+1,u+1+a),h=l.subarray(f*a,(f+1)*a),e[u]){case 0:s0(d,h,a);break;case 1:i0(d,h,a,o);break;case 2:o0(d,h,c,a);break;case 3:a0(d,h,c,a,o);break;case 4:l0(d,h,c,a,o);break;default:throw new Error(`Unsupported filter: ${e[u]}`)}c=h,u+=a+1}if(i===16){const f=new Uint16Array(l.buffer);if(t2)for(let m=0;m<f.length;m++)f[m]=r2(f[m]);return f}else return l}function r2(t){return(t&255)<<8|t>>8&255}const Oa=Uint8Array.of(137,80,78,71,13,10,26,10);function Uf(t){if(!s2(t.readBytes(Oa.length)))throw new Error("wrong PNG signature")}function s2(t){if(t.length<Oa.length)return!1;for(let e=0;e<Oa.length;e++)if(t[e]!==Oa[e])return!1;return!0}const i2="tEXt",o2=0,c0=new TextDecoder("latin1");function a2(t){if(c2(t),t.length===0||t.length>79)throw new Error("keyword length must be between 1 and 79")}const l2=/^[\u0000-\u00FF]*$/;function c2(t){if(!l2.test(t))throw new Error("invalid latin1 text")}function u2(t,e,n){const r=u0(e);t[r]=d2(e,n-r.length-1)}function u0(t){for(t.mark();t.readByte()!==o2;);const e=t.offset;t.reset();const n=c0.decode(t.readBytes(e-t.offset-1));return t.skip(1),a2(n),n}function d2(t,e){return c0.decode(t.readBytes(e))}const An={UNKNOWN:-1,GREYSCALE:0,TRUECOLOUR:2,INDEXED_COLOUR:3,GREYSCALE_ALPHA:4,TRUECOLOUR_ALPHA:6},Ic={UNKNOWN:-1,DEFLATE:0},Hf={UNKNOWN:-1,ADAPTIVE:0},Oc={UNKNOWN:-1,NO_INTERLACE:0,ADAM7:1},aa={NONE:0,BACKGROUND:1,PREVIOUS:2},zc={SOURCE:0,OVER:1};class h2 extends Zd{_checkCrc;_inflator;_png;_apng;_end;_hasPalette;_palette;_hasTransparency;_transparency;_compressionMethod;_filterMethod;_interlaceMethod;_colorType;_isAnimated;_numberOfFrames;_numberOfPlays;_frames;_writingDataChunks;_chunks;_inflatorResult;constructor(e,n={}){super(e);const{checkCrc:r=!1}=n;this._checkCrc=r,this._inflator=new $f((s,i)=>{if(this._chunks.push(s),i){const o=this._chunks.reduce((l,c)=>l+c.length,0);this._inflatorResult=new Uint8Array(o);let a=0;for(const l of this._chunks)this._inflatorResult.set(l,a),a+=l.length;this._chunks=[]}}),this._chunks=[],this._png={width:-1,height:-1,channels:-1,data:new Uint8Array(0),depth:1,text:{}},this._apng={width:-1,height:-1,channels:-1,depth:1,numberOfFrames:1,numberOfPlays:0,text:{},frames:[]},this._end=!1,this._hasPalette=!1,this._palette=[],this._hasTransparency=!1,this._transparency=new Uint16Array(0),this._compressionMethod=Ic.UNKNOWN,this._filterMethod=Hf.UNKNOWN,this._interlaceMethod=Oc.UNKNOWN,this._colorType=An.UNKNOWN,this._isAnimated=!1,this._numberOfFrames=1,this._numberOfPlays=0,this._frames=[],this._writingDataChunks=!1,this._inflatorResult=new Uint8Array(0),this.setBigEndian()}decode(){for(Uf(this);!this._end;){const e=this.readUint32(),n=this.readChars(4);this.decodeChunk(e,n)}return this._inflator.push(new Uint8Array(0),!0),this.decodeImage(),this._png}decodeApng(){for(Uf(this);!this._end;){const e=this.readUint32(),n=this.readChars(4);this.decodeApngChunk(e,n)}return this.decodeApngImage(),this._apng}decodeChunk(e,n){const r=this.offset;switch(n){case"IHDR":this.decodeIHDR();break;case"PLTE":this.decodePLTE(e);break;case"IDAT":this.decodeIDAT(e);break;case"IEND":this._end=!0;break;case"tRNS":this.decodetRNS(e);break;case"iCCP":this.decodeiCCP(e);break;case i2:u2(this._png.text,this,e);break;case"pHYs":this.decodepHYs();break;default:this.skip(e);break}if(this.offset-r!==e)throw new Error(`Length mismatch while decoding chunk ${n}`);this._checkCrc?Ff(this,e+4,n):this.skip(4)}decodeApngChunk(e,n){const r=this.offset;switch(n!=="fdAT"&&n!=="IDAT"&&this._writingDataChunks&&this.pushDataToFrame(),n){case"acTL":this.decodeACTL();break;case"fcTL":this.decodeFCTL();break;case"fdAT":this.decodeFDAT(e);break;default:this.decodeChunk(e,n),this.offset=r+e;break}if(this.offset-r!==e)throw new Error(`Length mismatch while decoding chunk ${n}`);this._checkCrc?Ff(this,e+4,n):this.skip(4)}decodeIHDR(){const e=this._png;e.width=this.readUint32(),e.height=this.readUint32(),e.depth=f2(this.readUint8());const n=this.readUint8();this._colorType=n;let r;switch(n){case An.GREYSCALE:r=1;break;case An.TRUECOLOUR:r=3;break;case An.INDEXED_COLOUR:r=1;break;case An.GREYSCALE_ALPHA:r=2;break;case An.TRUECOLOUR_ALPHA:r=4;break;case An.UNKNOWN:default:throw new Error(`Unknown color type: ${n}`)}if(this._png.channels=r,this._compressionMethod=this.readUint8(),this._compressionMethod!==Ic.DEFLATE)throw new Error(`Unsupported compression method: ${this._compressionMethod}`);this._filterMethod=this.readUint8(),this._interlaceMethod=this.readUint8()}decodeACTL(){this._numberOfFrames=this.readUint32(),this._numberOfPlays=this.readUint32(),this._isAnimated=!0}decodeFCTL(){const e={sequenceNumber:this.readUint32(),width:this.readUint32(),height:this.readUint32(),xOffset:this.readUint32(),yOffset:this.readUint32(),delayNumber:this.readUint16(),delayDenominator:this.readUint16(),disposeOp:this.readUint8(),blendOp:this.readUint8(),data:new Uint8Array(0)};this._frames.push(e)}decodePLTE(e){if(e%3!==0)throw new RangeError(`PLTE field length must be a multiple of 3. Got ${e}`);const n=e/3;this._hasPalette=!0;const r=[];this._palette=r;for(let s=0;s<n;s++)r.push([this.readUint8(),this.readUint8(),this.readUint8()])}decodeIDAT(e){this._writingDataChunks=!0;const n=e,r=this.offset+this.byteOffset;try{this._inflator.push(new Uint8Array(this.buffer,r,n),!1)}catch(s){throw new Error("Error while decompressing the data:",{cause:s})}this.skip(e)}decodeFDAT(e){this._writingDataChunks=!0;let n=e,r=this.offset+this.byteOffset;r+=4,n-=4;try{this._inflator.push(new Uint8Array(this.buffer,r,n),!1)}catch(s){throw new Error("Error while decompressing the data:",{cause:s})}this.skip(e)}decodetRNS(e){switch(this._colorType){case An.GREYSCALE:case An.TRUECOLOUR:{if(e%2!==0)throw new RangeError(`tRNS chunk length must be a multiple of 2. Got ${e}`);if(e/2>this._png.width*this._png.height)throw new Error(`tRNS chunk contains more alpha values than there are pixels (${e/2} vs ${this._png.width*this._png.height})`);this._hasTransparency=!0,this._transparency=new Uint16Array(e/2);for(let n=0;n<e/2;n++)this._transparency[n]=this.readUint16();break}case An.INDEXED_COLOUR:{if(e>this._palette.length)throw new Error(`tRNS chunk contains more alpha values than there are palette colors (${e} vs ${this._palette.length})`);let n=0;for(;n<e;n++){const r=this.readByte();this._palette[n].push(r)}for(;n<this._palette.length;n++)this._palette[n].push(255);break}case An.UNKNOWN:case An.GREYSCALE_ALPHA:case An.TRUECOLOUR_ALPHA:default:throw new Error(`tRNS chunk is not supported for color type ${this._colorType}`)}}decodeiCCP(e){const n=u0(this),r=this.readUint8();if(r!==Ic.DEFLATE)throw new Error(`Unsupported iCCP compression method: ${r}`);const s=this.readBytes(e-n.length-2);this._png.iccEmbeddedProfile={name:n,profile:DS(s)}}decodepHYs(){const e=this.readUint32(),n=this.readUint32(),r=this.readByte();this._png.resolution={x:e,y:n,unit:r}}decodeApngImage(){this._apng.width=this._png.width,this._apng.height=this._png.height,this._apng.channels=this._png.channels,this._apng.depth=this._png.depth,this._apng.numberOfFrames=this._numberOfFrames,this._apng.numberOfPlays=this._numberOfPlays,this._apng.text=this._png.text,this._apng.resolution=this._png.resolution;for(let e=0;e<this._numberOfFrames;e++){const n={sequenceNumber:this._frames[e].sequenceNumber,delayNumber:this._frames[e].delayNumber,delayDenominator:this._frames[e].delayDenominator,data:this._apng.depth===8?new Uint8Array(this._apng.width*this._apng.height*this._apng.channels):new Uint16Array(this._apng.width*this._apng.height*this._apng.channels)},r=this._frames.at(e);if(r){if(r.data=Bf({data:r.data,width:r.width,height:r.height,channels:this._apng.channels,depth:this._apng.depth}),this._hasPalette&&(this._apng.palette=this._palette),this._hasTransparency&&(this._apng.transparency=this._transparency),e===0||r.xOffset===0&&r.yOffset===0&&r.width===this._png.width&&r.height===this._png.height)n.data=r.data;else{const s=this._apng.frames.at(e-1);this.disposeFrame(r,s,n),this.addFrameDataToCanvas(n,r)}this._apng.frames.push(n)}}return this._apng}disposeFrame(e,n,r){switch(e.disposeOp){case aa.NONE:break;case aa.BACKGROUND:for(let s=0;s<this._png.height;s++)for(let i=0;i<this._png.width;i++){const o=(s*e.width+i)*this._png.channels;for(let a=0;a<this._png.channels;a++)r.data[o+a]=0}break;case aa.PREVIOUS:r.data.set(n.data);break;default:throw new Error("Unknown disposeOp")}}addFrameDataToCanvas(e,n){const r=1<<this._png.depth,s=(i,o)=>{const a=((i+n.yOffset)*this._png.width+n.xOffset+o)*this._png.channels,l=(i*n.width+o)*this._png.channels;return{index:a,frameIndex:l}};switch(n.blendOp){case zc.SOURCE:for(let i=0;i<n.height;i++)for(let o=0;o<n.width;o++){const{index:a,frameIndex:l}=s(i,o);for(let c=0;c<this._png.channels;c++)e.data[a+c]=n.data[l+c]}break;case zc.OVER:for(let i=0;i<n.height;i++)for(let o=0;o<n.width;o++){const{index:a,frameIndex:l}=s(i,o);for(let c=0;c<this._png.channels;c++){const u=n.data[l+this._png.channels-1]/r,d=c%(this._png.channels-1)===0?1:n.data[l+c],h=Math.floor(u*d+(1-u)*e.data[a+c]);e.data[a+c]+=h}}break;default:throw new Error("Unknown blendOp")}}decodeImage(){const e=this._inflatorResult;if(this._filterMethod!==Hf.ADAPTIVE)throw new Error(`Filter method ${this._filterMethod} not supported`);if(this._interlaceMethod===Oc.NO_INTERLACE)this._png.data=Bf({data:e,width:this._png.width,height:this._png.height,channels:this._png.channels,depth:this._png.depth});else if(this._interlaceMethod===Oc.ADAM7)this._png.data=KS({data:e,width:this._png.width,height:this._png.height,channels:this._png.channels,depth:this._png.depth});else throw new Error(`Interlace method ${this._interlaceMethod} not supported`);this._hasPalette&&(this._png.palette=this._palette),this._hasTransparency&&(this._png.transparency=this._transparency)}pushDataToFrame(){this._inflator.push(new Uint8Array(0),!0);const e=this._inflatorResult,n=this._frames.at(-1);n?n.data=e:this._frames.push({sequenceNumber:0,width:this._png.width,height:this._png.height,xOffset:0,yOffset:0,delayNumber:0,delayDenominator:0,disposeOp:aa.NONE,blendOp:zc.SOURCE,data:e}),this._inflator=new $f((r,s)=>{if(this._chunks.push(r),s){const i=this._chunks.reduce((a,l)=>a+l.length,0);this._inflatorResult=new Uint8Array(i);let o=0;for(const a of this._chunks)this._inflatorResult.set(a,o),o+=a.length;this._chunks=[]}}),this._chunks=[],this._writingDataChunks=!1}}function f2(t){if(t!==1&&t!==2&&t!==4&&t!==8&&t!==16)throw new Error(`invalid bit depth: ${t}`);return t}function Kd(t,e){return new h2(t,e).decode()}var vn;(t=>{t.EMPTY=255;function e(c,u){const d=new Uint8Array(c*u);return d.fill(t.EMPTY),{width:c,height:u,data:d}}t.create=e;function n(c){return{...c,data:new Uint8Array(c.data)}}t.clone=n;function r(c,u,d){return d*c.width+u}t.offset=r;function s(c,u,d){return u>=0&&d>=0&&u<c.width&&d<c.height}t.contains=s;function i(c,u,d){return c.data[r(c,u,d)]}t.get=i;function o(c,u,d,h){c.data[r(c,u,d)]=h}t.set=o;function a(c,u,d){return i(c,u,d)===t.EMPTY}t.isEmpty=a;function l(c,u,d=new ImageData(c.width,c.height)){for(let h=0;h<c.data.length;h++){const f=c.data[h]===t.EMPTY?void 0:u[c.data[h]],m=h<<2;d.data[m+0]=f?.r??0,d.data[m+1]=f?.g??0,d.data[m+2]=f?.b??0,d.data[m+3]=f===void 0?0:f.a}return d}t.toImageData=l})(vn||(vn={}));var Et;(t=>{function e(u=0,d=0,h=0){return{x:u,y:d,z:h}}t.create=e;function n(u,d,h=t.create()){return h.x=u.x+d.x,h.y=u.y+d.y,h.z=u.z+d.z,h}t.add=n;function r(u,d,h=t.create()){return h.x=u.x-d.x,h.y=u.y-d.y,h.z=u.z-d.z,h}t.subtract=r;function s(u,d,h=t.create()){const f=u.y*d.z-u.z*d.y,m=u.z*d.x-u.x*d.z,p=u.x*d.y-u.y*d.x;return h.x=f,h.y=m,h.z=p,h}t.cross=s;function i(u){return Math.hypot(u.x,u.y,u.z)}t.length=i;function o(u,d=t.create()){const h=t.length(u)||1;return d.x=u.x/h,d.y=u.y/h,d.z=u.z/h,d}t.normalize=o;function a(u,d,h=t.create()){return h.x=u.x*d,h.y=u.y*d,h.z=u.z*d,h}t.multiplyScalar=a;function l(u,d,h=t.create()){const{x:f,y:m,z:p,w:y}=d,{x:g,y:b,z:v}=u,x=2*(m*v-p*b),k=2*(p*g-f*v),C=2*(f*b-m*g);return h.x=g+y*x+(m*C-p*k),h.y=b+y*k+(p*x-f*C),h.z=v+y*C+(f*k-m*x),h}t.rotateQuaternion=l;function c(u,d){return u.x===d.x&&u.y===d.y&&u.z===d.z}t.equals=c,t.EMPTY=Object.freeze(t.create())})(Et||(Et={}));var Lo;(t=>{function e(r,s={width:0,height:0,depth:0}){const i=Math.max(r.width,r.height,r.depth);return s.width=r.width/i,s.height=r.height/i,s.depth=r.depth/i,s}t.normalize=e;function n(r,s){return r.width===s.width&&r.height===s.height&&r.depth===s.depth}t.equals=n})(Lo||(Lo={}));class Hn extends Float32Array{}(t=>{function e(u=0,d=0,h=0,f=0,m=0,p=0,y=0,g=0,b=0){return new t([u,d,h,f,m,p,y,g,b])}t.create=e;function n(u=t.create()){return u.set([1,0,0,0,1,0,0,0,1]),u}t.identity=n;function r(u,d,h,f=t.create()){const m=Et.normalize(Et.subtract(u,d)),p=Et.normalize(Et.cross(h,m)),y=Et.cross(m,p);return f[0]=p.x,f[1]=p.y,f[2]=p.z,f[3]=y.x,f[4]=y.y,f[5]=y.z,f[6]=m.x,f[7]=m.y,f[8]=m.z,f}t.orientation=r;function s(u,d=t.create()){const h=Math.cos(u),f=Math.sin(u);return d[0]=1,d[1]=0,d[2]=0,d[3]=0,d[4]=h,d[5]=f,d[6]=0,d[7]=-f,d[8]=h,d}t.rotationX=s;function i(u,d=t.create()){const h=Math.cos(u),f=Math.sin(u);return d[0]=h,d[1]=0,d[2]=-f,d[3]=0,d[4]=1,d[5]=0,d[6]=f,d[7]=0,d[8]=h,d}t.rotationY=i;function o(u,d=t.create()){const h=Math.cos(u),f=Math.sin(u);return d[0]=h,d[1]=f,d[2]=0,d[3]=-f,d[4]=h,d[5]=0,d[6]=0,d[7]=0,d[8]=1,d}t.rotationZ=o;function a(u,d=t.create()){const h=[u[0],u[3],u[6],u[1],u[4],u[7],u[2],u[5],u[8]];return d.set(h),d}t.transpose=a;function l(u,d,h=t.create()){const f=[0,0,0,0,0,0,0,0,0];for(let m=0;m<3;m++)for(let p=0;p<3;p++)f[m*3+p]=u[p]*d[m*3]+u[3+p]*d[m*3+1]+u[6+p]*d[m*3+2];return h.set(f),h}t.multiply=l;function c(u,d,h=Et.create()){const f=u[0]*d.x+u[3]*d.y+u[6]*d.z,m=u[1]*d.x+u[4]*d.y+u[7]*d.z,p=u[2]*d.x+u[5]*d.y+u[8]*d.z;return h.x=f,h.y=m,h.z=p,h}t.transform=c})(Hn||(Hn={}));var xo;(t=>{function e(s=0,i=0,o=0,a=0){return{x:s,y:i,z:o,w:a}}t.create=e;function n({x:s,y:i,z:o},a,l=t.create()){const c=a/2,u=Math.sin(c);return l.x=s*u,l.y=i*u,l.z=o*u,l.w=Math.cos(c),l}t.fromAxisAngle=n;function r(s,i,o=t.create()){return o.x=s.w*i.x+s.x*i.w+s.y*i.z-s.z*i.y,o.y=s.w*i.y-s.x*i.z+s.y*i.w+s.z*i.x,o.z=s.w*i.z+s.x*i.y-s.y*i.x+s.z*i.w,o.w=s.w*i.w-s.x*i.x-s.y*i.y-s.z*i.z,o}t.multiply=r})(xo||(xo={}));var Zu;(t=>{function e(s,i){return s.r===i.r&&s.g===i.g&&s.b===i.b}t.equals=e;function n(s,i={r:0,g:0,b:0}){const o=typeof s=="number"?s:Number(s);if(!Number.isInteger(o)||o<0||o>16777215)throw new Error(`${s} is not a valid 24-bit hex colour`);return i.r=o>>16&255,i.g=o>>8&255,i.b=o&255,i}t.fromHex=n;function r({r:s,g:i,b:o}){return`rgb(${s}, ${i}, ${o})`}t.toCSS=r})(Zu||(Zu={}));var xr;(t=>{function e(h=0,f=0){return{x:h,y:f}}t.create=e;function n(h,f=t.create()){return f.x=Math.round(h.x-.5),f.y=Math.round(h.y-.5),f}t.round=n;function r(h){return Math.hypot(h.x,h.y)}t.length=r;function s(h,f,m=t.create()){return m.x=h.x-f.x,m.y=h.y-f.y,m}t.sub=s;function i(h,f,m=t.create()){return m.x=h.x+f.x,m.y=h.y+f.y,m}t.add=i;function o(h,f,m=t.create()){return m.x=h.x*f.x,m.y=h.y*f.y,m}t.multiply=o;function a(h,f,m=t.create()){return m.x=h.x*f,m.y=h.y*f,m}t.multiplyScalar=a;function l(h,f,m=t.create()){return m.x=Math.max(h.x,f.x),m.y=Math.max(h.y,f.y),m}t.max=l;function c(h,f,m=t.create()){return m.x=Math.min(h.x,f.x),m.y=Math.min(h.y,f.y),m}t.min=c;function u(h,f,m,p=t.create()){return p.x=Math.max(Math.min(h.x,m.x),f.x),p.y=Math.max(Math.min(h.y,m.y),f.y),p}t.clamp=u;function d(h){return t.create(h.x,h.y)}t.clone=d,t.EMPTY=Object.freeze(e())})(xr||(xr={}));const d0={front:!0,left:!0,right:!0,back:!0,top:!0,bottom:!0},Jd=Object.keys(d0),Zl={front:["width","height"],back:["width","height"],left:["depth","height"],right:["depth","height"],top:["width","depth"],bottom:["width","depth"]},h0=["width","height","depth"],za={width:"x",height:"y",depth:"z"},p2={front:"depth",back:"depth",left:"width",right:"width",top:"height",bottom:"height"},m2={front:[!1,!0],back:[!0,!0],left:[!1,!0],right:[!0,!0],top:[!1,!1],bottom:[!1,!0]},f0={width:["left","right"],height:["bottom","top"],depth:["back","front"]};function g2(t){const e=/^section-(\d+)-(before|after)$/.exec(t);return e===null?void 0:{cut:Number(e[1]),face:e[2]}}function y2(t){return Et.create(t.width/2,t.height/2,t.depth/2)}function p0(t){return{width:t.sides.front.width,height:t.sides.front.height,depth:t.sides.left.width}}function b2(t,e=Hn.create()){return Hn.multiply(Hn.multiply(Hn.rotationX(t.x),Hn.rotationY(t.y)),Hn.rotationZ(t.z),e)}function v2(t,e){const n=[],r=new Set;let s=e;for(;s!==void 0&&!r.has(s.name);){r.add(s.name),n.push(s);const l=s.parent;s=l===null?void 0:t.parts.find(c=>c.name===l)}const i=Et.create();let o=Hn.identity(),a=1;for(const l of n.reverse())Et.add(i,Hn.transform(o,Et.multiplyScalar(l.root,a)),i),o=Hn.multiply(o,b2(l.turn)),a*=l.scale;return{at:i,turn:o,scale:a}}const Lc={name:"",framesPerSecond:12,loop:!0},w2="palette.png",as="parts.json",_2="body";function x2(t){const e=Kd(t),n=[];for(let r=0;r<e.width;r++){const s=r<<2;n.push({r:e.data[s+0],g:e.data[s+1],b:e.data[s+2],a:e.data[s+3]})}return n}const pl=32,Qd=(t,e,n)=>t<<16|e<<8|n;function k2(t){const e=new Set;for(const n of t)for(let r=0;r<n.width*n.height*4;r+=4)n.data[r+3]!==0&&e.add(Qd(n.data[r],n.data[r+1],n.data[r+2]));return e}function S2(t,e){const n=Array.from({length:pl},(l,c)=>e[c]??{r:0,g:0,b:0,a:255}),r=n.map(({r:l,g:c,b:u})=>Qd(l,c,u)),s=new Map,i=[];for(let l=0;l<pl;l++)t.has(r[l])?s.set(r[l],s.get(r[l])??l):i.push(l);const o=[...t].filter(l=>!s.has(l)),a=[];for(const l of o){const c=i.shift();if(c===void 0){a.push(l);continue}n[c]={r:l>>16&255,g:l>>8&255,b:l&255,a:255},s.set(l,c)}return{palette:n,indexOf:s,dropped:a}}function E2(t,e){const n=vn.create(t.width,t.height);for(let r=0;r<n.data.length;r++){const s=r<<2;if(t.data[s+3]===0)continue;const i=e.get(Qd(t.data[s],t.data[s+1],t.data[s+2]));i!==void 0&&(n.data[r]=i)}return n}function ko(t){const{x:e,y:n,z:r}=t??{};return Et.create(typeof e=="number"?e:0,typeof n=="number"?n:0,typeof r=="number"?r:0)}const A2=["linear","in","out","in-out","hold"];function T2(t){return Array.isArray(t)?t.map((e,n)=>{const r=e?.name,s=e?.framesPerSecond,i=e?.loop,o=e?.parts;return{name:typeof r=="string"?r:Lc.name,framesPerSecond:typeof s=="number"?s:Lc.framesPerSecond,loop:typeof i=="boolean"?i:Lc.loop,parts:(Array.isArray(o)?o:[]).map(a=>{const l=a?.part;if(typeof l!="string"||l==="")throw new Error(`${as} gives a key of motion ${n} no part to move`);const c=a?.keys;return{part:l,keys:(Array.isArray(c)?c:[]).map(u=>{const d=u?.at;if(typeof d!="number")throw new Error(`${as} gives a key of ${l} in motion ${n} no frame to stand at`);const h=u?.ease,f=u?.scale;return{at:d,ease:A2.includes(h)?h:"linear",root:ko(u?.root),turn:ko(u?.turn),scale:typeof f=="number"&&f>0?f:1}})}})}}):[]}function C2(t){let e;try{e=JSON.parse(t)}catch(r){throw new Error(`${as} is not readable as JSON: ${r}`)}const n=e?.parts;if(!Array.isArray(n))throw new Error(`${as} lists no parts`);return{version:4,parts:n.map((r,s)=>{const i=r?.name;if(typeof i!="string"||i==="")throw new Error(`${as} gives part ${s} no name`);const o=r.parent,a=r.sections,l=r.scale;return{name:i,root:ko(r.root),pivot:ko(r.pivot),turn:ko(r.turn),scale:typeof l=="number"&&l>0?l:1,parent:typeof o=="string"?o:null,sections:(Array.isArray(a)?a:[]).map((c,u)=>{const{axis:d,at:h}=c??{};if(!h0.includes(d))throw new Error(`${as} cuts ${i} across "${d}", which is not one of its axes`);if(typeof h!="number")throw new Error(`${as} gives cut ${u} of ${i} nowhere to stand`);return{axis:d,at:h}})}}),motions:T2(e?.motions)}}async function ml(t,e=[]){const n=await ql.loadAsync(t),r=new Map;let s,i;const o=d=>{let h=r.get(d);return h===void 0&&(h={indexed:{},asColours:{},sectionFaces:new Map},r.set(d,h)),h};for(const[d,h]of Object.entries(n.files)){const f=h.name.toLowerCase();if(f===w2){s=x2(new Uint8Array(await(await h.async("blob")).arrayBuffer()));continue}if(f===as){i=C2(await h.async("text"));continue}const m=/^(?:(.+)\/)?([^/]+)\.png$/i.exec(h.name);if(m===null)continue;const p=m[1]??"",y=m[2].toLowerCase(),g=y,b=g2(y);if(!d0[g]&&b===void 0)continue;const v=await(await h.async("blob")).arrayBuffer(),x=Kd(new Uint8Array(v));if(x.depth!==8)throw new Error(`${h.name} holds ${x.depth} bits per sample, and only eight is read`);const k={width:x.width,height:x.height,data:new Uint8Array(x.data)};if(b!==void 0){if(x.channels===4)throw new Error(`${h.name} holds colours, and a section's face is only read as palette indices`);const C=o(p).sectionFaces;C.set(b.cut,{...C.get(b.cut),[b.face]:k});continue}if(x.channels===4){o(p).asColours[g]=x;continue}o(p).indexed[g]=k}const a=[...r.values()].flatMap(d=>Object.keys(d.asColours).map(h=>d.asColours[h])),l=a.length!==0;if(l){const d=S2(k2(a),s??e);d.dropped.length!==0&&console.error(`This model was drawn in ${d.dropped.length+pl} colours and a palette holds ${pl}. The cells drawn in the ${d.dropped.length} that did not fit have been emptied.`),s=d.palette;for(const h of r.values())for(const f of Object.keys(h.asColours))h.indexed[f]=E2(h.asColours[f],d.indexOf)}return{parts:(i?.parts??[{name:_2,root:Et.create(),turn:Et.create(),scale:1,parent:null,sections:[]}]).map(({name:d,root:h,pivot:f,turn:m,scale:p,parent:y,sections:g})=>{const b=i===void 0?"":d,v=r.get(b)?.indexed??{},x=R2(v,b);for(const k of Jd){const[C,E]=Zl[k];v[k]??=vn.create(x[C],x[E])}return{name:d,sides:v,sections:M2(g,r.get(b),x,d),root:h,pivot:f??y2(x),turn:m,scale:p,parent:y}}),palette:s??e,migrated:l,motions:i?.motions??[]}}function M2(t,e,n,r){const s=[];return t.forEach(({axis:i,at:o},a)=>{const l=e?.sectionFaces.get(a);if(l?.before===void 0||l.after===void 0)return;const[c,u]=Zl[f0[i][0]];for(const d of[l.before,l.after])if(d.width!==n[c]||d.height!==n[u])throw new Error(`${r}'s cut ${a} is drawn ${d.width} by ${d.height}, and the ${i} it cuts across makes it ${n[c]} by ${n[u]}`);s.push({axis:i,at:o,before:l.before,after:l.after})}),s}const $c=32;function R2(t,e){const n={};for(const r of Jd){const s=t[r];if(s===void 0)continue;const[i,o]=Zl[r];for(const[a,l]of[[i,s.width],[o,s.height]]){const c=n[a];if(c===void 0){n[a]={by:r,of:l};continue}if(c.of!==l){const u=e===""?"":`${e}/`;throw new Error(`${u}${r}.png makes the model ${l} ${a==="height"?"high":a==="width"?"wide":"deep"}, and ${u}${c.by}.png makes it ${c.of} — the six sides are not faces of one box`)}}}return{width:n.width?.of??$c,height:n.height?.of??$c,depth:n.depth?.of??$c}}function P2(t){return t.toLowerCase().endsWith(".zip")?t.slice(0,-4):null}async function I2(t,e,n){const r=await ml(n);return{name:t,file:e,parts:r.parts.map(s=>s.name),motions:r.motions.map(s=>s.name)}}const O2=`
import * as host from "engine-host";
export * from "engine-host";

/** Registers \`fn\` with the host's own \`onTick\`, parsing the events it
 * hands back before \`fn\` ever sees them — a script reads real facts, never
 * the JSON text they crossed the sandbox boundary as. */
export function onTick(fn) {
  host.onTick(function (clockMs, eventsJson) {
    fn(clockMs, JSON.parse(eventsJson));
  });
}

function resolveModel(modelName) {
  if (modelName === undefined) {
    return undefined;
  }
  var model = __models[modelName];
  if (model === undefined) {
    throw new Error("this place carries no such model: \\"" + modelName + "\\"");
  }
  return model;
}

function place(model, options, announce) {
  var state = {
    model: model,
    id: options.id,
    x: options.x,
    z: options.z,
    y: options.y,
    yaw: options.yaw === undefined ? 0 : options.yaw,
  };
  state.move = function (moveOptions) {
    state.x = moveOptions.x;
    state.z = moveOptions.z;
    if (moveOptions.y !== undefined) {
      state.y = moveOptions.y;
    }
    if (moveOptions.yaw !== undefined) {
      state.yaw = moveOptions.yaw;
    }
    announce(state, moveOptions.live === undefined ? true : moveOptions.live);
  };
  announce(state, true);
  return state;
}

/**
 * Places an NPC wearing the model named \`options.model\`, through the
 * "npc"/"npc-remove"/"npc-die" effects — or the world's own default figure
 * when \`options.model\` is omitted entirely. \`options.id\` is never
 * generated here — every peer replaying the same script must compute the
 * exact same id independently (ADR 0026), so it has to come from the
 * caller's own deterministic address, the way \`zombies.ts\` derives one from
 * its population seed and spawn cell.
 */
export function createNpc(options) {
  var model = resolveModel(options.model);
  var npc = place(model, options, function (state, live) {
    host.dispatch("npc", {
      id: state.id,
      x: state.x,
      z: state.z,
      y: state.y,
      name: options.name,
      model:
        options.modelUri === undefined && model !== undefined
          ? model.file
          : undefined,
      modelUri: options.modelUri,
      yaw: state.yaw,
      live: live,
    });
  });
  /** Removes the NPC outright — no death fall, just gone, like \`.remove()\` on a prop. */
  npc.remove = function () {
    host.dispatch("npc-remove", { id: npc.id });
  };
  /** Plays a death fall in place of an outright removal, then forgets it the same way. */
  npc.die = function () {
    host.dispatch("npc-die", { id: npc.id });
  };
  return npc;
}

/** Places a prop wearing the model named \`options.model\`, through the "prop"/"prop-remove" effects; see \`createNpc\` for how a name resolves and why \`id\` is never generated. */
export function createProp(options) {
  var model = resolveModel(options.model);
  var prop = place(model, options, function (state) {
    host.dispatch("prop", {
      id: state.id,
      model: model.file,
      x: state.x,
      z: state.z,
      y: state.y,
      name: options.name,
      yaw: state.yaw,
      height: options.height,
      solid: options.solid,
      hazard: options.hazard,
      conveyor: options.conveyor,
      motion: options.motion,
    });
  });
  prop.remove = function () {
    host.dispatch("prop-remove", { id: prop.id });
  };
  return prop;
}
`;class gl extends Error{constructor(e){super(e),this.name="PlaceBundleError"}}const z2=()=>AS(),L2=t=>({target:t.ScriptTarget.ES2019,module:t.ModuleKind.CommonJS,esModuleInterop:!0,isolatedModules:!0,skipLibCheck:!0}),$2=async(t,e,n)=>{const r=t.transpileModule(n,{fileName:e,compilerOptions:L2(t),reportDiagnostics:!0}),s=(r.diagnostics??[]).filter(i=>i.category===t.DiagnosticCategory.Error);if(s.length>0)throw new gl(s.map(i=>D2(t,e,n,i)).join(`
`));return r.outputText},D2=(t,e,n,r)=>{const s=r.start===void 0?{line:0,character:0}:t.getLineAndCharacterOfPosition(t.createSourceFile(e,n,t.ScriptTarget.Latest,!1),r.start),i=r.code,o=t.flattenDiagnosticMessageText(r.messageText," ");return`${e}:${s.line+1}:${s.character+1} — TS${i}: ${o}`},jf=(t,e,n)=>{const r=[],s=t.createSourceFile(e,n,t.ScriptTarget.Latest,!1,t.ScriptKind.TS);for(const i of s.statements)(t.isImportDeclaration(i)&&!i.importClause?.isTypeOnly||t.isExportDeclaration(i)&&!i.isTypeOnly&&i.moduleSpecifier!==void 0)&&r.push(i.moduleSpecifier.text);return r},ho="\0voxelscape",N2=(t,e)=>{if(e==="voxelscape")return ho;if(e==="engine-host")return"engine-host";if(e.includes("://")||e.startsWith("/")||e.includes(".."))return null;const n=e.replace(/^\.\//,""),r=n.endsWith(".js")?`${n.slice(0,-3)}.ts`:`${n}.ts`;for(const s of[n,r,`${n}.js`,`${n}/index.ts`,`${n}/index.js`])if(t.has(s))return s;return null},F2=async t=>{const e={};for(const[n,r]of Object.entries(t)){const s=P2(n);if(s!==null)try{e[s]=await I2(s,n,r)}catch{continue}}return`${O2}
const __models = ${JSON.stringify(e)};
`},B2=async(t,e,n={})=>{const r=await z2();if(t[e]===void 0)throw new gl(`the entry script "${e}" is not a file of this project`);const s=Object.keys(t).sort(),i=new Set(s),o=new Map;let a=!1;for(const f of s){const m=jf(r,f,t[f]);o.set(f,m),m.includes("voxelscape")&&(a=!0)}const l=a?await F2(n):"";a&&o.set(ho,jf(r,ho,l));const c=a?[...s,ho]:s,u=new Map(c.map((f,m)=>[f,m])),d=[];for(const f of c){const m=f===ho?l:t[f],p=await $2(r,f,m),y={};for(const g of o.get(f)){const b=N2(i,g);if(b===null)throw new gl(`${f} imports "${g}" — imports may only come from this place's own script files, or "voxelscape"`);y[g]=b==="engine-host"?"engine-host":u.get(b)}d.push({path:f,code:p,requires:y})}const h=u.get(e);return U2(d,h)},U2=(t,e)=>{const n=t.map(({path:r,code:s,requires:i})=>({path:r,code:s,requires:i}));return`var __modules = ${JSON.stringify(n)};
var __cache = [];
var __engineHost;
function __require(id) {
  if (id === "engine-host") {
    if (__engineHost === undefined) {
      __engineHost = {
        dispatch: function (tag, payload) { engine.dispatch(tag, JSON.stringify(payload)); },
        log: engine.log,
        now: engine.now,
        endings: engine.endings,
        players: engine.players,
        heightAt: engine.heightAt,
        solidAt: engine.solidAt,
        waterAt: engine.waterAt,
        onTick: engine.onTick,
        onPlan: engine.onPlan,
        blocks: engine.blocks,
      };
    }
    return __engineHost;
  }
  var cached = __cache[id];
  if (cached !== undefined) {
    return cached.exports;
  }
  var slot = __modules[id];
  var module = { exports: {} };
  __cache[id] = module;
  new Function("module", "exports", "require", slot.code)(module, module.exports, function (specifier) {
    var target = slot.requires[specifier];
    if (target === undefined) {
      throw new Error("cannot resolve import \\"" + specifier + "\\" from \\"" + slot.path + "\\"");
    }
    return __require(target);
  });
  return module.exports;
}
__require(${e});
`};var ni={JS_EVAL_TYPE_GLOBAL:0,JS_EVAL_TYPE_MODULE:1,JS_EVAL_FLAG_STRICT:8,JS_EVAL_FLAG_STRIP:16,JS_EVAL_FLAG_COMPILE_ONLY:32,JS_EVAL_FLAG_BACKTRACE_BARRIER:64},Wf={BaseObjects:1,Date:2,Eval:4,StringNormalize:8,RegExp:16,RegExpCompiler:32,JSON:64,Proxy:128,MapSet:256,TypedArrays:512,Promise:1024,BigInt:2048,BigFloat:4096,BigDecimal:8192,OperatorOverloading:16384,BignumExt:32768},Dc={Pending:0,Fulfilled:1,Rejected:2},ri={JS_GPN_STRING_MASK:1,JS_GPN_SYMBOL_MASK:2,JS_GPN_PRIVATE_MASK:4,JS_GPN_ENUM_ONLY:16,QTS_GPN_NUMBER_MASK:64,QTS_STANDARD_COMPLIANT_NUMBER:128},la={IsStrictlyEqual:0,IsSameValue:1,IsSameValueZero:2},H2=Object.defineProperty,j2=(t,e)=>{for(var n in e)H2(t,n,{get:e[n],enumerable:!0})};function fo(...t){}var W2={};j2(W2,{QuickJSAsyncifyError:()=>y0,QuickJSAsyncifySuspended:()=>b0,QuickJSEmptyGetOwnPropertyNames:()=>_0,QuickJSEmscriptenModuleError:()=>Qu,QuickJSHostRefInvalid:()=>ls,QuickJSHostRefRangeExceeded:()=>x0,QuickJSMemoryLeakDetected:()=>V2,QuickJSNotImplemented:()=>g0,QuickJSPromisePending:()=>w0,QuickJSUnknownIntrinsic:()=>v0,QuickJSUnwrapError:()=>Ku,QuickJSUseAfterFree:()=>Ju,QuickJSWrongOwner:()=>m0});var Ku=class extends Error{constructor(t,e){let n=typeof t=="object"&&t&&"message"in t?String(t.message):String(t);super(n),this.cause=t,this.context=e,this.name="QuickJSUnwrapError"}},m0=class extends Error{constructor(){super(...arguments),this.name="QuickJSWrongOwner"}},Ju=class extends Error{constructor(){super(...arguments),this.name="QuickJSUseAfterFree"}},g0=class extends Error{constructor(){super(...arguments),this.name="QuickJSNotImplemented"}},y0=class extends Error{constructor(){super(...arguments),this.name="QuickJSAsyncifyError"}},b0=class extends Error{constructor(){super(...arguments),this.name="QuickJSAsyncifySuspended"}},V2=class extends Error{constructor(){super(...arguments),this.name="QuickJSMemoryLeakDetected"}},Qu=class extends Error{constructor(){super(...arguments),this.name="QuickJSEmscriptenModuleError"}},v0=class extends TypeError{constructor(){super(...arguments),this.name="QuickJSUnknownIntrinsic"}},w0=class extends Error{constructor(){super(...arguments),this.name="QuickJSPromisePending"}},_0=class extends Error{constructor(){super(...arguments),this.name="QuickJSEmptyGetOwnPropertyNames"}},x0=class extends Error{constructor(){super(...arguments),this.name="QuickJSHostRefRangeExceeded"}},ls=class extends Error{constructor(){super(...arguments),this.name="QuickJSHostRefInvalid"}};function*k0(t){return yield t}function G2(t){return k0(th(t))}var eh=k0;eh.of=G2;function Vf(t,e){return(...n)=>{let r=e.call(t,eh,...n);return th(r)}}function Y2(t,e){let n=e.call(t,eh);return th(n)}function th(t){function e(n){return n.done?n.value:n.value instanceof Promise?n.value.then(r=>e(t.next(r)),r=>e(t.throw(r))):e(t.next(n.value))}return e(t.next())}var es=class{[Symbol.dispose](){return this.dispose()}},ed=Symbol.dispose??Symbol.for("Symbol.dispose"),Gf=es.prototype;Gf[ed]||(Gf[ed]=function(){return this.dispose()});var un=class S0 extends es{constructor(e,n,r,s){super(),this._value=e,this.copier=n,this.disposer=r,this._owner=s,this._alive=!0,this._constructorStack=void 0}get alive(){return this._alive}get value(){return this.assertAlive(),this._value}get owner(){return this._owner}get dupable(){return!!this.copier}dup(){if(this.assertAlive(),!this.copier)throw new Error("Non-dupable lifetime");return new S0(this.copier(this._value),this.copier,this.disposer,this._owner)}consume(e){this.assertAlive();let n=e(this);return this.dispose(),n}map(e){return this.assertAlive(),e(this)}tap(e){return e(this),this}dispose(){this.assertAlive(),this.disposer&&this.disposer(this._value),this._alive=!1}assertAlive(){if(!this.alive)throw this._constructorStack?new Ju(`Lifetime not alive
${this._constructorStack}
Lifetime used`):new Ju("Lifetime not alive")}},Os=class extends un{constructor(t,e){super(t,void 0,void 0,e)}get dupable(){return!0}dup(){return this}dispose(){}},Yf=class extends un{constructor(t,e,n,r){super(t,e,n,r)}dispose(){this._alive=!1}};function Nc(t,e){let n;try{t.dispose()}catch(r){n=r}if(e&&n)throw Object.assign(e,{message:`${e.message}
 Then, failed to dispose scope: ${n.message}`,disposeError:n}),e;if(e||n)throw e||n}var br=class La extends es{constructor(){super(...arguments),this._disposables=new un(new Set),this.manage=e=>(this._disposables.value.add(e),e)}static withScope(e){let n=new La,r;try{return e(n)}catch(s){throw r=s,s}finally{Nc(n,r)}}static withScopeMaybeAsync(e,n){return Y2(void 0,function*(r){let s=new La,i;try{return yield*r.of(n.call(e,r,s))}catch(o){throw i=o,o}finally{Nc(s,i)}})}static async withScopeAsync(e){let n=new La,r;try{return await e(n)}catch(s){throw r=s,s}finally{Nc(n,r)}}get alive(){return this._disposables.alive}dispose(){let e=Array.from(this._disposables.value.values()).reverse();for(let n of e)n.alive&&n.dispose();this._disposables.dispose()}};function X2(t){let e=t?Array.from(t):[];function n(){return e.forEach(s=>s.alive?s.dispose():void 0)}function r(){return e.some(s=>s.alive)}return Object.defineProperty(e,ed,{configurable:!0,enumerable:!1,value:n}),Object.defineProperty(e,"dispose",{configurable:!0,enumerable:!1,value:n}),Object.defineProperty(e,"alive",{configurable:!0,enumerable:!1,get:r}),e}function yl(t){return!!(t&&(typeof t=="object"||typeof t=="function")&&"alive"in t&&typeof t.alive=="boolean"&&"dispose"in t&&typeof t.dispose=="function")}var nh=class E0 extends es{static success(e){return new q2(e)}static fail(e,n){return new Z2(e,n)}static is(e){return e instanceof E0}},q2=class extends nh{constructor(t){super(),this.value=t}get alive(){return yl(this.value)?this.value.alive:!0}dispose(){yl(this.value)&&this.value.dispose()}unwrap(){return this.value}unwrapOr(t){return this.value}},Z2=class extends nh{constructor(t,e){super(),this.error=t,this.onUnwrap=e}get alive(){return yl(this.error)?this.error.alive:!0}dispose(){yl(this.error)&&this.error.dispose()}unwrap(){throw this.onUnwrap(this),this.error}unwrapOr(t){return t}},Ai=nh,K2=class extends es{constructor(t){super(),this.resolve=e=>{this.resolveHandle.alive&&(this.context.unwrapResult(this.context.callFunction(this.resolveHandle,this.context.undefined,e||this.context.undefined)).dispose(),this.disposeResolvers(),this.onSettled())},this.reject=e=>{this.rejectHandle.alive&&(this.context.unwrapResult(this.context.callFunction(this.rejectHandle,this.context.undefined,e||this.context.undefined)).dispose(),this.disposeResolvers(),this.onSettled())},this.dispose=()=>{this.handle.alive&&this.handle.dispose(),this.disposeResolvers()},this.context=t.context,this.owner=t.context.runtime,this.handle=t.promiseHandle,this.settled=new Promise(e=>{this.onSettled=e}),this.resolveHandle=t.resolveHandle,this.rejectHandle=t.rejectHandle}get alive(){return this.handle.alive||this.resolveHandle.alive||this.rejectHandle.alive}disposeResolvers(){this.resolveHandle.alive&&this.resolveHandle.dispose(),this.rejectHandle.alive&&this.rejectHandle.dispose()}},A0=class{constructor(t){this.module=t}toPointerArray(t){let e=new Int32Array(t.map(s=>s.value)),n=e.length*e.BYTES_PER_ELEMENT,r=this.module._malloc(n);return new Uint8Array(this.module.HEAPU8.buffer,r,n).set(new Uint8Array(e.buffer)),new un(r,void 0,s=>this.module._free(s))}newTypedArray(t,e){let n=new t(new Array(e).fill(0)),r=n.length*n.BYTES_PER_ELEMENT,s=this.module._malloc(r),i=new t(this.module.HEAPU8.buffer,s,e);return i.set(n),new un({typedArray:i,ptr:s},void 0,o=>this.module._free(o.ptr))}newMutablePointerArray(t){return this.newTypedArray(Int32Array,t)}newHeapCharPointer(t){let e=this.module.lengthBytesUTF8(t),n=e+1,r=this.module._malloc(n);return this.module.stringToUTF8(t,r,n),new un({ptr:r,strlen:e},void 0,s=>this.module._free(s.ptr))}newHeapBufferPointer(t){let e=t.byteLength,n=this.module._malloc(e);return this.module.HEAPU8.set(t,n),new un({pointer:n,numBytes:e},void 0,r=>this.module._free(r.pointer))}consumeHeapCharPointer(t){let e=this.module.UTF8ToString(t);return this.module._free(t),e}};function J2(t){if(!t)return 0;let e=0;for(let[n,r]of Object.entries(t)){if(!(n in Wf))throw new v0(n);r&&(e|=Wf[n])}return e}function Q2(t){if(typeof t=="number")return t;if(t===void 0)return 0;let{type:e,strict:n,strip:r,compileOnly:s,backtraceBarrier:i}=t,o=0;return e==="global"&&(o|=ni.JS_EVAL_TYPE_GLOBAL),e==="module"&&(o|=ni.JS_EVAL_TYPE_MODULE),n&&(o|=ni.JS_EVAL_FLAG_STRICT),r&&(o|=ni.JS_EVAL_FLAG_STRIP),s&&(o|=ni.JS_EVAL_FLAG_COMPILE_ONLY),i&&(o|=ni.JS_EVAL_FLAG_BACKTRACE_BARRIER),o}function eE(t){if(typeof t=="number")return t;if(t===void 0)return 0;let{strings:e,symbols:n,quickjsPrivate:r,onlyEnumerable:s,numbers:i,numbersAsStrings:o}=t,a=0;return e&&(a|=ri.JS_GPN_STRING_MASK),n&&(a|=ri.JS_GPN_SYMBOL_MASK),r&&(a|=ri.JS_GPN_PRIVATE_MASK),s&&(a|=ri.JS_GPN_ENUM_ONLY),i&&(a|=ri.QTS_GPN_NUMBER_MASK),o&&(a|=ri.QTS_STANDARD_COMPLIANT_NUMBER),a}function tE(...t){let e=[];for(let n of t)n!==void 0&&(e=e.concat(n));return e}var nE=class extends es{constructor(t,e){super(),this.handle=t,this.context=e,this._isDone=!1,this.owner=e.runtime}[Symbol.iterator](){return this}next(t){if(!this.alive||this._isDone)return{done:!0,value:void 0};let e=this._next??(this._next=this.context.getProp(this.handle,"next"));return this.callIteratorMethod(e,t)}return(t){if(!this.alive)return{done:!0,value:void 0};let e=this.context.getProp(this.handle,"return");if(e===this.context.undefined&&t===void 0)return this.dispose(),{done:!0,value:void 0};let n=this.callIteratorMethod(e,t);return e.dispose(),this.dispose(),n}throw(t){if(!this.alive)return{done:!0,value:void 0};let e=t instanceof un?t:this.context.newError(t),n=this.context.getProp(this.handle,"throw"),r=this.callIteratorMethod(n,t);return e.alive&&e.dispose(),n.dispose(),this.dispose(),r}get alive(){return this.handle.alive}dispose(){this._isDone=!0,this.handle.dispose(),this._next?.dispose()}callIteratorMethod(t,e){let n=e?this.context.callFunction(t,this.handle,e):this.context.callFunction(t,this.handle);if(n.error)return this.dispose(),{value:n};let r=this.context.getProp(n.value,"done").consume(i=>this.context.dump(i)),s=this.context.getProp(n.value,"value");return n.value.dispose(),r&&this.dispose(),{value:Ai.success(s),done:r}}},Xf=-2147483648,qf=2147483647,$a=0;function Fc(t){return t>>8}var rE=class{constructor(){this.nextId=Xf,this.freelist=[],this.groups=new Map}put(t){let e=this.allocateId(),n=Fc(e),r=this.groups.get(n);return r||(r=new Map,this.groups.set(n,r)),r.set(e,t),e}get(t){if(t===$a)throw new ls("no host reference id defined");let e=Fc(t),n=this.groups.get(e);if(!n)throw new ls(`host reference id ${t} is not defined`);let r=n.get(t);if(!r)throw new ls(`host reference id ${t} is not defined`);return r}delete(t){if(t===$a)throw new ls("no host reference id defined");let e=Fc(t),n=this.groups.get(e);if(!n)throw new ls(`host reference id ${t} is not defined`);n.delete(t),n.size===0&&this.groups.delete(e),this.freelist.push(t)}allocateId(){if(this.freelist.length>0)return this.freelist.shift();if(this.nextId===$a&&this.nextId++,this.nextId>qf)throw new x0(`HostRefMap: too many host refs created without disposing. Max simultaneous host refs: ${qf-Xf}`);return this.nextId++}},Zf=class extends es{constructor(t,e,n){if(n===$a)throw new ls("cannot create HostRef with undefined id");super(),this.runtime=t,this.handle=e,this.id=n}get alive(){return this.handle.alive}dispose(){this.handle.dispose()}get value(){return this.runtime.hostRefs.get(this.id)}},sE=class extends A0{constructor(t){super(t.module),this.scope=new br,this.copyJSValue=e=>this.ffi.QTS_DupValuePointer(this.ctx.value,e),this.freeJSValue=e=>{this.ffi.QTS_FreeValuePointer(this.ctx.value,e)},t.ownedLifetimes?.forEach(e=>this.scope.manage(e)),this.owner=t.owner,this.module=t.module,this.ffi=t.ffi,this.rt=t.rt,this.ctx=this.scope.manage(t.ctx)}get alive(){return this.scope.alive}dispose(){return this.scope.dispose()}[Symbol.dispose](){return this.dispose()}manage(t){return this.scope.manage(t)}consumeJSCharPointer(t){let e=this.module.UTF8ToString(t);return this.ffi.QTS_FreeCString(this.ctx.value,t),e}heapValueHandle(t,e){let n=e?r=>{e(),this.freeJSValue(r)}:this.freeJSValue;return new un(t,this.copyJSValue,n,this.owner)}staticHeapValueHandle(t){return this.manage(this.heapValueHandle(t)),new Os(t,this.owner)}},iE=class extends es{constructor(t){super(),this._undefined=void 0,this._null=void 0,this._false=void 0,this._true=void 0,this._global=void 0,this._BigInt=void 0,this._Symbol=void 0,this._SymbolIterator=void 0,this._SymbolAsyncIterator=void 0,this.cToHostCallbacks={callFunction:(e,n,r,s,i)=>{if(e!==this.ctx.value)throw new Error("QuickJSContext instance received C -> JS call with mismatched ctx");let o=this.getFunction(i);return br.withScopeMaybeAsync(this,function*(a,l){let c=l.manage(new Yf(n,this.memory.copyJSValue,this.memory.freeJSValue,this.runtime)),u=new Array(r);for(let d=0;d<r;d++){let h=this.ffi.QTS_ArgvGetJSValueConstPointer(s,d);u[d]=l.manage(new Yf(h,this.memory.copyJSValue,this.memory.freeJSValue,this.runtime))}try{let d=yield*a(o.apply(c,u));if(d){if("error"in d&&d.error)throw this.runtime.debugLog("throw error",d.error),d.error;let h=l.manage(d instanceof un?d:d.value);return this.ffi.QTS_DupValuePointer(this.ctx.value,h.value)}return 0}catch(d){return this.errorToHandle(d).consume(h=>this.ffi.QTS_Throw(this.ctx.value,h.value))}})}},this.runtime=t.runtime,this.module=t.module,this.ffi=t.ffi,this.rt=t.rt,this.ctx=t.ctx,this.memory=new sE({...t,owner:this.runtime}),t.callbacks.setContextCallbacks(this.ctx.value,this.cToHostCallbacks),this.dump=this.dump.bind(this),this.getString=this.getString.bind(this),this.getNumber=this.getNumber.bind(this),this.resolvePromise=this.resolvePromise.bind(this),this.uint32Out=this.memory.manage(this.memory.newTypedArray(Uint32Array,1))}get alive(){return this.memory.alive}dispose(){this.memory.dispose()}get undefined(){if(this._undefined)return this._undefined;let t=this.ffi.QTS_GetUndefined();return this._undefined=new Os(t)}get null(){if(this._null)return this._null;let t=this.ffi.QTS_GetNull();return this._null=new Os(t)}get true(){if(this._true)return this._true;let t=this.ffi.QTS_GetTrue();return this._true=new Os(t)}get false(){if(this._false)return this._false;let t=this.ffi.QTS_GetFalse();return this._false=new Os(t)}get global(){if(this._global)return this._global;let t=this.ffi.QTS_GetGlobalObject(this.ctx.value);return this._global=this.memory.staticHeapValueHandle(t),this._global}newNumber(t){return this.memory.heapValueHandle(this.ffi.QTS_NewFloat64(this.ctx.value,t))}newString(t){let e=this.memory.newHeapCharPointer(t).consume(n=>this.ffi.QTS_NewString(this.ctx.value,n.value.ptr));return this.memory.heapValueHandle(e)}newUniqueSymbol(t){let e=(typeof t=="symbol"?t.description:t)??"",n=this.memory.newHeapCharPointer(e).consume(r=>this.ffi.QTS_NewSymbol(this.ctx.value,r.value.ptr,0));return this.memory.heapValueHandle(n)}newSymbolFor(t){let e=(typeof t=="symbol"?t.description:t)??"",n=this.memory.newHeapCharPointer(e).consume(r=>this.ffi.QTS_NewSymbol(this.ctx.value,r.value.ptr,1));return this.memory.heapValueHandle(n)}getWellKnownSymbol(t){return this._Symbol??(this._Symbol=this.memory.manage(this.getProp(this.global,"Symbol"))),this.getProp(this._Symbol,t)}newBigInt(t){if(!this._BigInt){let r=this.getProp(this.global,"BigInt");this.memory.manage(r),this._BigInt=new Os(r.value,this.runtime)}let e=this._BigInt,n=String(t);return this.newString(n).consume(r=>this.unwrapResult(this.callFunction(e,this.undefined,r)))}newObject(t){t&&this.runtime.assertOwned(t);let e=t?this.ffi.QTS_NewObjectProto(this.ctx.value,t.value):this.ffi.QTS_NewObject(this.ctx.value);return this.memory.heapValueHandle(e)}newArray(){let t=this.ffi.QTS_NewArray(this.ctx.value);return this.memory.heapValueHandle(t)}newArrayBuffer(t){let e=new Uint8Array(t),n=this.memory.newHeapBufferPointer(e),r=this.ffi.QTS_NewArrayBuffer(this.ctx.value,n.value.pointer,e.length);return this.memory.heapValueHandle(r)}newPromise(t){let e=br.withScope(n=>{let r=n.manage(this.memory.newMutablePointerArray(2)),s=this.ffi.QTS_NewPromiseCapability(this.ctx.value,r.value.ptr),i=this.memory.heapValueHandle(s),[o,a]=Array.from(r.value.typedArray).map(l=>this.memory.heapValueHandle(l));return new K2({context:this,promiseHandle:i,resolveHandle:o,rejectHandle:a})});return t&&typeof t=="function"&&(t=new Promise(t)),t&&Promise.resolve(t).then(e.resolve,n=>n instanceof un?e.reject(n):this.newError(n).consume(e.reject)),e}newFunction(t,e){let n=typeof t=="function"?t:e;if(!n)throw new TypeError("Expected a function");return this.newFunctionWithOptions({name:typeof t=="string"?t:void 0,length:n.length,isConstructor:!1,fn:n})}newConstructorFunction(t,e){let n=typeof t=="function"?t:e;if(!n)throw new TypeError("Expected a function");return this.newFunctionWithOptions({name:typeof t=="string"?t:void 0,length:n.length,isConstructor:!0,fn:n})}newFunctionWithOptions(t){let{name:e,length:n,isConstructor:r,fn:s}=t,i=this.runtime.hostRefs.put(s);try{return this.memory.heapValueHandle(this.ffi.QTS_NewFunction(this.ctx.value,e??"",n,r,i))}catch(o){throw this.runtime.hostRefs.delete(i),o}}newError(t){let e=this.memory.heapValueHandle(this.ffi.QTS_NewError(this.ctx.value));return t&&typeof t=="object"?(t.name!==void 0&&this.newString(t.name).consume(n=>this.setProp(e,"name",n)),t.message!==void 0&&this.newString(t.message).consume(n=>this.setProp(e,"message",n))):typeof t=="string"?this.newString(t).consume(n=>this.setProp(e,"message",n)):t!==void 0&&this.newString(String(t)).consume(n=>this.setProp(e,"message",n)),e}newHostRef(t){let e=this.runtime.hostRefs.put(t);try{let n=this.memory.heapValueHandle(this.ffi.QTS_NewHostRef(this.ctx.value,e));return new Zf(this.runtime,n,e)}catch(n){throw this.runtime.hostRefs.delete(e),n}}toHostRef(t){let e=this.ffi.QTS_GetHostRefId(t.value);if(e!==0)return this.runtime.hostRefs.get(e),new Zf(this.runtime,t.dup(),e)}unwrapHostRef(t){let e=this.ffi.QTS_GetHostRefId(t.value);if(e===0)throw new ls("handle is not a HostRef");return this.runtime.hostRefs.get(e)}typeof(t){return this.runtime.assertOwned(t),this.memory.consumeHeapCharPointer(this.ffi.QTS_Typeof(this.ctx.value,t.value))}getNumber(t){return this.runtime.assertOwned(t),this.ffi.QTS_GetFloat64(this.ctx.value,t.value)}getString(t){return this.runtime.assertOwned(t),this.memory.consumeJSCharPointer(this.ffi.QTS_GetString(this.ctx.value,t.value))}getSymbol(t){this.runtime.assertOwned(t);let e=this.memory.consumeJSCharPointer(this.ffi.QTS_GetSymbolDescriptionOrKey(this.ctx.value,t.value));return this.ffi.QTS_IsGlobalSymbol(this.ctx.value,t.value)?Symbol.for(e):Symbol(e)}getBigInt(t){this.runtime.assertOwned(t);let e=this.getString(t);return BigInt(e)}getArrayBuffer(t){this.runtime.assertOwned(t);let e=this.ffi.QTS_GetArrayBufferLength(this.ctx.value,t.value),n=this.ffi.QTS_GetArrayBuffer(this.ctx.value,t.value);if(!n)throw new Error("Couldn't allocate memory to get ArrayBuffer");return new un(this.module.HEAPU8.subarray(n,n+e),void 0,()=>this.module._free(n))}getPromiseState(t){this.runtime.assertOwned(t);let e=this.ffi.QTS_PromiseState(this.ctx.value,t.value);if(e<0)return{type:"fulfilled",value:t,notAPromise:!0};if(e===Dc.Pending)return{type:"pending",get error(){return new w0("Cannot unwrap a pending promise")}};let n=this.ffi.QTS_PromiseResult(this.ctx.value,t.value),r=this.memory.heapValueHandle(n);if(e===Dc.Fulfilled)return{type:"fulfilled",value:r};if(e===Dc.Rejected)return{type:"rejected",error:r};throw r.dispose(),new Error(`Unknown JSPromiseStateEnum: ${e}`)}resolvePromise(t){this.runtime.assertOwned(t);let e=br.withScope(n=>{let r=n.manage(this.getProp(this.global,"Promise")),s=n.manage(this.getProp(r,"resolve"));return this.callFunction(s,r,t)});return e.error?Promise.resolve(e):new Promise(n=>{br.withScope(r=>{let s=r.manage(this.newFunction("resolve",l=>{n(this.success(l&&l.dup()))})),i=r.manage(this.newFunction("reject",l=>{n(this.fail(l&&l.dup()))})),o=r.manage(e.value),a=r.manage(this.getProp(o,"then"));this.callFunction(a,o,s,i).unwrap().dispose()})})}isEqual(t,e,n=la.IsStrictlyEqual){if(t===e)return!0;this.runtime.assertOwned(t),this.runtime.assertOwned(e);let r=this.ffi.QTS_IsEqual(this.ctx.value,t.value,e.value,n);if(r===-1)throw new g0("WASM variant does not expose equality");return!!r}eq(t,e){return this.isEqual(t,e,la.IsStrictlyEqual)}sameValue(t,e){return this.isEqual(t,e,la.IsSameValue)}sameValueZero(t,e){return this.isEqual(t,e,la.IsSameValueZero)}getProp(t,e){this.runtime.assertOwned(t);let n;return typeof e=="number"&&e>=0?n=this.ffi.QTS_GetPropNumber(this.ctx.value,t.value,e):n=this.borrowPropertyKey(e).consume(r=>this.ffi.QTS_GetProp(this.ctx.value,t.value,r.value)),this.memory.heapValueHandle(n)}getLength(t){if(this.runtime.assertOwned(t),!(this.ffi.QTS_GetLength(this.ctx.value,this.uint32Out.value.ptr,t.value)<0))return this.uint32Out.value.typedArray[0]}getOwnPropertyNames(t,e={strings:!0,numbersAsStrings:!0}){this.runtime.assertOwned(t),t.value;let n=eE(e);if(n===0)throw new _0("No options set, will return an empty array");return br.withScope(r=>{let s=r.manage(this.memory.newMutablePointerArray(1)),i=this.ffi.QTS_GetOwnPropertyNames(this.ctx.value,s.value.ptr,this.uint32Out.value.ptr,t.value,n);if(i)return this.fail(this.memory.heapValueHandle(i));let o=this.uint32Out.value.typedArray[0],a=s.value.typedArray[0],l=new Uint32Array(this.module.HEAP8.buffer,a,o),c=Array.from(l).map(u=>this.memory.heapValueHandle(u));return this.ffi.QTS_FreeVoidPointer(this.ctx.value,a),this.success(X2(c))})}getIterator(t){let e=this._SymbolIterator??(this._SymbolIterator=this.memory.manage(this.getWellKnownSymbol("iterator")));return br.withScope(n=>{let r=n.manage(this.getProp(t,e)),s=this.callFunction(r,t);return s.error?s:this.success(new nE(s.value,this))})}setProp(t,e,n){this.runtime.assertOwned(t),this.borrowPropertyKey(e).consume(r=>this.ffi.QTS_SetProp(this.ctx.value,t.value,r.value,n.value))}defineProp(t,e,n){this.runtime.assertOwned(t),br.withScope(r=>{let s=r.manage(this.borrowPropertyKey(e)),i=n.value||this.undefined,o=!!n.configurable,a=!!n.enumerable,l=!!n.value,c=n.get?r.manage(this.newFunction(n.get.name,n.get)):this.undefined,u=n.set?r.manage(this.newFunction(n.set.name,n.set)):this.undefined;this.ffi.QTS_DefineProp(this.ctx.value,t.value,s.value,i.value,c.value,u.value,o,a,l)})}callFunction(t,e,...n){this.runtime.assertOwned(t);let r,s=n[0];s===void 0||Array.isArray(s)?r=s??[]:r=n;let i=this.memory.toPointerArray(r).consume(a=>this.ffi.QTS_Call(this.ctx.value,t.value,e.value,r.length,a.value)),o=this.ffi.QTS_ResolveException(this.ctx.value,i);return o?(this.ffi.QTS_FreeValuePointer(this.ctx.value,i),this.fail(this.memory.heapValueHandle(o))):this.success(this.memory.heapValueHandle(i))}callMethod(t,e,n=[]){return this.getProp(t,e).consume(r=>this.callFunction(r,t,n))}evalCode(t,e="eval.js",n){let r=n===void 0?1:0,s=Q2(n),i=this.memory.newHeapCharPointer(t).consume(a=>this.ffi.QTS_Eval(this.ctx.value,a.value.ptr,a.value.strlen,e,r,s)),o=this.ffi.QTS_ResolveException(this.ctx.value,i);return o?(this.ffi.QTS_FreeValuePointer(this.ctx.value,i),this.fail(this.memory.heapValueHandle(o))):this.success(this.memory.heapValueHandle(i))}throw(t){return this.errorToHandle(t).consume(e=>this.ffi.QTS_Throw(this.ctx.value,e.value))}borrowPropertyKey(t){return typeof t=="number"?this.newNumber(t):typeof t=="string"?this.newString(t):new Os(t.value,this.runtime)}getMemory(t){if(t===this.rt.value)return this.memory;throw new Error("Private API. Cannot get memory from a different runtime")}dump(t){this.runtime.assertOwned(t);let e=this.typeof(t);if(e==="string")return this.getString(t);if(e==="number")return this.getNumber(t);if(e==="bigint")return this.getBigInt(t);if(e==="undefined")return;if(e==="symbol")return this.getSymbol(t);let n=this.getPromiseState(t);if(n.type==="fulfilled"&&!n.notAPromise)return t.dispose(),{type:n.type,value:n.value.consume(this.dump)};if(n.type==="pending")return t.dispose(),{type:n.type};if(n.type==="rejected")return t.dispose(),{type:n.type,error:n.error.consume(this.dump)};let r=this.memory.consumeJSCharPointer(this.ffi.QTS_Dump(this.ctx.value,t.value));try{return JSON.parse(r)}catch{return r}}unwrapResult(t){if(t.error){let e="context"in t.error?t.error.context:this,n=t.error.consume(r=>this.dump(r));if(n&&typeof n=="object"&&typeof n.message=="string"){let{message:r,name:s,stack:i,...o}=n,a=new Ku(n,e);typeof s=="string"&&(a.name=n.name),a.message=r;let l=a.stack;throw typeof i=="string"&&(a.stack=`${s}: ${r}
${n.stack}Host: ${l}`),Object.assign(a,o),a}throw new Ku(n)}return t.value}[Symbol.for("nodejs.util.inspect.custom")](){return this.alive?`${this.constructor.name} { ctx: ${this.ctx.value} rt: ${this.rt.value} }`:`${this.constructor.name} { disposed }`}getFunction(t){let e=this.runtime.hostRefs.get(t);if(typeof e!="function")throw new Error(`Host reference ${t} is not a function`);return e}errorToHandle(t){return t instanceof un?t:this.newError(t)}encodeBinaryJSON(t){let e=this.ffi.QTS_bjson_encode(this.ctx.value,t.value);return this.memory.heapValueHandle(e)}decodeBinaryJSON(t){let e=this.ffi.QTS_bjson_decode(this.ctx.value,t.value);return this.memory.heapValueHandle(e)}success(t){return Ai.success(t)}fail(t){return Ai.fail(t,e=>this.unwrapResult(e))}},oE=class extends es{constructor(t){super(),this.scope=new br,this.contextMap=new Map,this.hostRefs=new rE,this._debugMode=!1,this.cToHostCallbacks={freeHostRef:(e,n)=>{if(e!==this.rt.value)throw new Error("Runtime pointer mismatch");this.hostRefs.delete(n)},shouldInterrupt:e=>{if(e!==this.rt.value)throw new Error("QuickJSContext instance received C -> JS interrupt with mismatched rt");let n=this.interruptHandler;if(!n)throw new Error("QuickJSContext had no interrupt handler");return n(this)?1:0},loadModuleSource:Vf(this,function*(e,n,r,s){let i=this.moduleLoader;if(!i)throw new Error("Runtime has no module loader");if(n!==this.rt.value)throw new Error("Runtime pointer mismatch");let o=this.contextMap.get(r)??this.newContext({contextPointer:r});try{let a=yield*e(i(s,o));if(typeof a=="object"&&"error"in a&&a.error)throw this.debugLog("cToHostLoadModule: loader returned error",a.error),a.error;let l=typeof a=="string"?a:"value"in a?a.value:a;return this.memory.newHeapCharPointer(l).value.ptr}catch(a){return this.debugLog("cToHostLoadModule: caught error",a),o.throw(a),0}}),normalizeModule:Vf(this,function*(e,n,r,s,i){let o=this.moduleNormalizer;if(!o)throw new Error("Runtime has no module normalizer");if(n!==this.rt.value)throw new Error("Runtime pointer mismatch");let a=this.contextMap.get(r)??this.newContext({contextPointer:r});try{let l=yield*e(o(s,i,a));if(typeof l=="object"&&"error"in l&&l.error)throw this.debugLog("cToHostNormalizeModule: normalizer returned error",l.error),l.error;let c=typeof l=="string"?l:l.value;return a.getMemory(this.rt.value).newHeapCharPointer(c).value.ptr}catch(l){return this.debugLog("normalizeModule: caught error",l),a.throw(l),0}})},t.ownedLifetimes?.forEach(e=>this.scope.manage(e)),this.module=t.module,this.memory=new A0(this.module),this.ffi=t.ffi,this.rt=t.rt,this.callbacks=t.callbacks,this.scope.manage(this.rt),this.callbacks.setRuntimeCallbacks(this.rt.value,this.cToHostCallbacks),this.executePendingJobs=this.executePendingJobs.bind(this)}get alive(){return this.scope.alive}dispose(){return this.scope.dispose()}newContext(t={}){let e=J2(t.intrinsics),n=new un(t.contextPointer||this.ffi.QTS_NewContext(this.rt.value,e),void 0,s=>{this.contextMap.delete(s),this.callbacks.deleteContext(s),this.ffi.QTS_FreeContext(s)}),r=new iE({module:this.module,ctx:n,ffi:this.ffi,rt:this.rt,ownedLifetimes:t.ownedLifetimes,runtime:this,callbacks:this.callbacks});return this.contextMap.set(n.value,r),r}setModuleLoader(t,e){this.moduleLoader=t,this.moduleNormalizer=e,this.ffi.QTS_RuntimeEnableModuleLoader(this.rt.value,this.moduleNormalizer?1:0)}removeModuleLoader(){this.moduleLoader=void 0,this.ffi.QTS_RuntimeDisableModuleLoader(this.rt.value)}hasPendingJob(){return!!this.ffi.QTS_IsJobPending(this.rt.value)}setInterruptHandler(t){let e=this.interruptHandler;this.interruptHandler=t,e||this.ffi.QTS_RuntimeEnableInterruptHandler(this.rt.value)}removeInterruptHandler(){this.interruptHandler&&(this.ffi.QTS_RuntimeDisableInterruptHandler(this.rt.value),this.interruptHandler=void 0)}executePendingJobs(t=-1){let e=this.memory.newMutablePointerArray(1),n=this.ffi.QTS_ExecutePendingJob(this.rt.value,t??-1,e.value.ptr),r=e.value.typedArray[0];if(e.dispose(),r===0)return this.ffi.QTS_FreeValuePointerRuntime(this.rt.value,n),Ai.success(0);let s=this.contextMap.get(r)??this.newContext({contextPointer:r}),i=s.getMemory(this.rt.value).heapValueHandle(n);if(s.typeof(i)==="number"){let o=s.getNumber(i);return i.dispose(),Ai.success(o)}else{let o=Object.assign(i,{context:s});return Ai.fail(o,a=>s.unwrapResult(a))}}setMemoryLimit(t){if(t<0&&t!==-1)throw new Error("Cannot set memory limit to negative number. To unset, pass -1");this.ffi.QTS_RuntimeSetMemoryLimit(this.rt.value,t)}computeMemoryUsage(){let t=this.getSystemContext().getMemory(this.rt.value);return t.heapValueHandle(this.ffi.QTS_RuntimeComputeMemoryUsage(this.rt.value,t.ctx.value))}dumpMemoryUsage(){return this.memory.consumeHeapCharPointer(this.ffi.QTS_RuntimeDumpMemoryUsage(this.rt.value))}setMaxStackSize(t){if(t<0)throw new Error("Cannot set memory limit to negative number. To unset, pass 0.");this.ffi.QTS_RuntimeSetMaxStackSize(this.rt.value,t)}assertOwned(t){if(t.owner&&t.owner.rt!==this.rt)throw new m0(`Handle is not owned by this runtime: ${t.owner.rt.value} != ${this.rt.value}`)}setDebugMode(t){this._debugMode=t,this.ffi.DEBUG&&this.rt.alive&&this.ffi.QTS_SetDebugLogEnabled(this.rt.value,t?1:0)}isDebugMode(){return this._debugMode}debugLog(...t){this._debugMode&&console.log("quickjs-emscripten:",...t)}[Symbol.for("nodejs.util.inspect.custom")](){return this.alive?`${this.constructor.name} { rt: ${this.rt.value} }`:`${this.constructor.name} { disposed }`}getSystemContext(){return this.context||(this.context=this.scope.manage(this.newContext())),this.context}},aE=class{constructor(t){this.freeHostRef=t.freeHostRef,this.callFunction=t.callFunction,this.shouldInterrupt=t.shouldInterrupt,this.loadModuleSource=t.loadModuleSource,this.normalizeModule=t.normalizeModule}},T0=class{constructor(t){this.contextCallbacks=new Map,this.runtimeCallbacks=new Map,this.suspendedCount=0,this.cToHostCallbacks=new aE({freeHostRef:(e,n,r)=>{let s=this.runtimeCallbacks.get(n);if(!s)throw new Error(`QuickJSRuntime(rt = ${n}) not found when trying to free HostRef(id = ${r})`);s.freeHostRef(n,r)},callFunction:(e,n,r,s,i,o)=>this.handleAsyncify(e,()=>{try{let a=this.contextCallbacks.get(n);if(!a)throw new Error(`QuickJSContext(ctx = ${n}) not found for C function call "${o}"`);return a.callFunction(n,r,s,i,o)}catch(a){return console.error("[C to host error: returning null]",a),0}}),shouldInterrupt:(e,n)=>this.handleAsyncify(e,()=>{try{let r=this.runtimeCallbacks.get(n);if(!r)throw new Error(`QuickJSRuntime(rt = ${n}) not found for C interrupt`);return r.shouldInterrupt(n)}catch(r){return console.error("[C to host interrupt: returning error]",r),1}}),loadModuleSource:(e,n,r,s)=>this.handleAsyncify(e,()=>{try{let i=this.runtimeCallbacks.get(n);if(!i)throw new Error(`QuickJSRuntime(rt = ${n}) not found for C module loader`);let o=i.loadModuleSource;if(!o)throw new Error(`QuickJSRuntime(rt = ${n}) does not support module loading`);return o(n,r,s)}catch(i){return console.error("[C to host module loader error: returning null]",i),0}}),normalizeModule:(e,n,r,s,i)=>this.handleAsyncify(e,()=>{try{let o=this.runtimeCallbacks.get(n);if(!o)throw new Error(`QuickJSRuntime(rt = ${n}) not found for C module loader`);let a=o.normalizeModule;if(!a)throw new Error(`QuickJSRuntime(rt = ${n}) does not support module loading`);return a(n,r,s,i)}catch(o){return console.error("[C to host module loader error: returning null]",o),0}})}),this.module=t,this.module.callbacks=this.cToHostCallbacks}setRuntimeCallbacks(t,e){this.runtimeCallbacks.set(t,e)}deleteRuntime(t){this.runtimeCallbacks.delete(t)}setContextCallbacks(t,e){this.contextCallbacks.set(t,e)}deleteContext(t){this.contextCallbacks.delete(t)}handleAsyncify(t,e){if(t)return t.handleSleep(r=>{try{let s=e();if(!(s instanceof Promise)){fo("asyncify.handleSleep: not suspending:",s),r(s);return}if(this.suspended)throw new y0(`Already suspended at: ${this.suspended.stack}
Attempted to suspend at:`);this.suspended=new b0(`(${this.suspendedCount++})`),fo("asyncify.handleSleep: suspending:",this.suspended),s.then(i=>{this.suspended=void 0,fo("asyncify.handleSleep: resolved:",i),r(i)},i=>{fo("asyncify.handleSleep: rejected:",i),console.error("QuickJS: cannot handle error in suspended function",i),this.suspended=void 0})}catch(s){throw this.suspended=void 0,s}});let n=e();if(n instanceof Promise)throw new Error("Promise return value not supported in non-asyncify context.");return n}};function C0(t,e){e.interruptHandler&&t.setInterruptHandler(e.interruptHandler),e.maxStackSizeBytes!==void 0&&t.setMaxStackSize(e.maxStackSizeBytes),e.memoryLimitBytes!==void 0&&t.setMemoryLimit(e.memoryLimitBytes)}function M0(t,e){e.moduleLoader&&t.setModuleLoader(e.moduleLoader),e.shouldInterrupt&&t.setInterruptHandler(e.shouldInterrupt),e.memoryLimitBytes!==void 0&&t.setMemoryLimit(e.memoryLimitBytes),e.maxStackSizeBytes!==void 0&&t.setMaxStackSize(e.maxStackSizeBytes)}var lE=class{constructor(t,e){this.module=t,this.ffi=e,this.callbacks=new T0(t)}newRuntime(t={}){let e=new un(this.ffi.QTS_NewRuntime(),void 0,r=>{this.ffi.QTS_FreeRuntime(r),this.callbacks.deleteRuntime(r)}),n=new oE({module:this.module,callbacks:this.callbacks,ffi:this.ffi,rt:e});return C0(n,t),t.moduleLoader&&n.setModuleLoader(t.moduleLoader),n}newContext(t={}){let e=this.newRuntime(),n=e.newContext({...t,ownedLifetimes:tE(e,t.ownedLifetimes)});return e.context=n,n}evalCode(t,e={}){return br.withScope(n=>{let r=n.manage(this.newContext());M0(r.runtime,e);let s=r.evalCode(t,"eval.js");if(e.memoryLimitBytes!==void 0&&r.runtime.setMemoryLimit(-1),s.error)throw r.dump(n.manage(s.error));return r.dump(n.manage(s.value))})}getWasmMemory(){let t=this.module.quickjsEmscriptenInit?.(()=>{})?.getWasmMemory?.();if(!t)throw new Error("Variant does not support getting WebAssembly.Memory");return t}getFFI(){return this.ffi}};async function Kf(t){let e=Da(await t),[n,r,{QuickJSWASMModule:s}]=await Promise.all([e.importModuleLoader().then(Da),e.importFFI(),Sr(()=>Promise.resolve().then(()=>EN),[]).then(Da)]),i=await n();i.type="sync";let o=new r(i);return new s(i,o)}function Da(t){return t&&"default"in t&&t.default?t.default&&"default"in t.default&&t.default.default?t.default.default:t.default:t}function cE(t,e){return{...t,async importModuleLoader(){let n=Da(await t.importModuleLoader());return async function(){let r=e.emscriptenModule?{...e.emscriptenModule}:{},s=e.log??((...d)=>fo("newVariant moduleLoader:",...d)),i=(d,h)=>(s(...d,h),h),o=d=>typeof d=="function"?d():d;(e.wasmLocation||e.wasmSourceMapLocation||e.locateFile)&&(r.locateFile=(d,h)=>{let f={fileName:d,relativeTo:h};if(d.endsWith(".wasm")&&e.wasmLocation!==void 0)return i(["locateFile .wasm: provide wasmLocation",f],e.wasmLocation);if(d.endsWith(".map")){if(e.wasmSourceMapLocation!==void 0)return i(["locateFile .map: provide wasmSourceMapLocation",f],e.wasmSourceMapLocation);if(e.wasmLocation&&!e.locateFile)return i(["locateFile .map: infer from wasmLocation",f],e.wasmLocation+".map")}return e.locateFile?i(["locateFile: use provided fn",f],e.locateFile(d,h)):i(["locateFile: unhandled, passthrough",f],d)}),e.wasmBinary&&(r.wasmBinary=await o(e.wasmBinary)),e.wasmMemory&&(r.wasmMemory=await o(e.wasmMemory));let a=e.wasmModule,l;a&&(r.instantiateWasm=async(d,h)=>{l??(l=Promise.resolve(o(a)));let f=await l;if(!f)throw new Qu(`options.wasmModule returned ${String(f)}`);let m=await WebAssembly.instantiate(f,d);return h(m),m.exports}),r.monitorRunDependencies=d=>{s("monitorRunDependencies:",d)},r.quickjsEmscriptenInit=()=>uE(s);let c=n(r),u=r.quickjsEmscriptenInit?.(s);if(a&&u?.receiveWasmOffsetConverter&&!u.existingWasmOffsetConverter){let d=await o(e.wasmBinary)??new ArrayBuffer(0);l??(l=Promise.resolve(o(a)));let h=await l;if(!h)throw new Qu(`options.wasmModule returned ${String(h)}`);u.receiveWasmOffsetConverter(d,h)}if(u?.receiveSourceMapJSON){let d=await o(e.wasmSourceMapData);typeof d=="string"?u.receiveSourceMapJSON(JSON.parse(d)):d?u.receiveSourceMapJSON(d):u.receiveSourceMapJSON({version:3,names:[],sources:[],mappings:""})}return c}}}}function uE(t){let e="mock called, emscripten module may not be initialized yet";return{mock:!0,removeRunDependency(n){t(`${e}: removeRunDependency called:`,n)},receiveSourceMapJSON(n){t(`${e}: receiveSourceMapJSON called:`,n)},WasmOffsetConverter:void 0,receiveWasmOffsetConverter(n,r){t(`${e}: receiveWasmOffsetConverter called:`,n,r)}}}var dE={type:"sync",importFFI:()=>Sr(()=>import("./ffi-Boa1QuFa.js"),[]).then(t=>t.QuickJSFFI),importModuleLoader:()=>Sr(()=>import("./emscripten-module.browser-DSSLSMvU.js"),[]).then(t=>t.default)},hE=dE;class fE{perm=[];constructor(e=0){const n=[];for(let s=0;s<256;s++)n[s]=s;let r=e;for(let s=255;s>0;s--){r=r*1103515245+12345&2147483647;const i=r%(s+1);[n[s],n[i]]=[n[i],n[s]]}for(let s=0;s<512;s++)this.perm[s]=n[s&255]}fade(e){return e*e*e*(e*(e*6-15)+10)}lerp(e,n,r){return e+r*(n-e)}grad(e,n,r){const s=e&3,i=s<2?n:r,o=s<2?r:n;return((s&1)===0?i:-i)+((s&2)===0?o:-o)}noise(e,n){const r=Math.floor(e)&255,s=Math.floor(n)&255;e-=Math.floor(e),n-=Math.floor(n);const i=this.fade(e),o=this.fade(n),a=this.perm[r]+s,l=this.perm[r+1]+s;return this.lerp(this.lerp(this.grad(this.perm[a],e,n),this.grad(this.perm[l],e-1,n),i),this.lerp(this.grad(this.perm[a+1],e,n-1),this.grad(this.perm[l+1],e-1,n-1),i),o)}fbm(e,n,r=4){let s=0,i=1,o=1,a=0;for(let l=0;l<r&&!(i<.001);l++)s+=i*this.noise(e*o,n*o),a+=i,i*=.5,o*=2;return s/a}}class rh{constructor(e=0,n=256){this.period=n;const r=[];for(let i=0;i<256;i++)r[i]=i;let s=e;for(let i=255;i>0;i--){s=s*1103515245+12345&2147483647;const o=s%(i+1);[r[i],r[o]]=[r[o],r[i]]}for(let i=0;i<513;i++)this.perm[i]=r[i&255]}period;perm=[];fade(e){return e*e*e*(e*(e*6-15)+10)}lerp(e,n,r){return e+r*(n-e)}grad(e,n,r,s){const i=e&15,o=i<8?n:r,a=i<4?r:i===12||i===14?n:s;return((i&1)===0?o:-o)+((i&2)===0?a:-a)}noise(e,n,r){const s=this.period,i=Math.floor(e),o=Math.floor(n),a=Math.floor(r),l=(i%s+s)%s,c=(o%s+s)%s,u=(a%s+s)%s,d=e-i,h=n-o,f=r-a,m=this.fade(d),p=this.fade(h),y=this.fade(f),g=this.perm[l]+c,b=this.perm[(l+1)%s]+c,v=this.perm[l]+(c+1)%s,x=this.perm[(l+1)%s]+(c+1)%s,k=this.perm[g]+u,C=this.perm[b]+u,E=this.perm[v]+u,T=this.perm[x]+u,A=(u+1)%s,M=this.perm[g]+A,O=this.perm[b]+A,S=this.perm[v]+A,z=this.perm[x]+A;return this.lerp(this.lerp(this.lerp(this.grad(this.perm[k],d,h,f),this.grad(this.perm[C],d-1,h,f),m),this.lerp(this.grad(this.perm[E],d,h-1,f),this.grad(this.perm[T],d-1,h-1,f),m),p),this.lerp(this.lerp(this.grad(this.perm[M],d,h,f-1),this.grad(this.perm[O],d-1,h,f-1),m),this.lerp(this.grad(this.perm[S],d,h-1,f-1),this.grad(this.perm[z],d-1,h-1,f-1),m),p),y)}fbm(e,n,r,s=3){let i=0,o=1,a=1,l=0;for(let c=0;c<s&&!(o<.001);c++)i+=o*this.noise(e*a,n*a,r*a),l+=o,o*=.5,a*=2;return i/l}}const Fi={seed:54321,frequency:.008,amplitude:80,octaves:4,base:64,plains:{seed:24680,cell:48,threshold:-.1,edge:.2,plateauFrequency:5e-4,plateauOctaves:2},seaLevel:56},Jf=new Map,sh=t=>{let e=Jf.get(t);return e===void 0&&(e=new fE(t),Jf.set(t,e)),e},pE=(t,e,n)=>{const r=Math.max(0,Math.min(1,(n-t)/(e-t)));return r*r*(3-2*r)},Na=(t,e,n)=>t+n*(e-t),Qf=(t,e,n)=>{const r=Math.floor(t),s=Math.floor(e),i=t-r,o=e-s,a=n(r,s),l=n(r+1,s),c=n(r,s+1),u=n(r+1,s+1);return Na(Na(a,l,i),Na(c,u,i),o)},mE=(t,e,n)=>{const r=sh(n.seed);return n.base+r.fbm(t*n.frequency,e*n.frequency,n.octaves)*n.amplitude},ep=new Map,gE=(t,e,n)=>{const r=`${t.seed}|${e}|${n}`;let s=ep.get(r);return s===void 0&&(s=sh(t.seed).noise(e+.5,n+.5),ep.set(r,s)),s},tp=new Map,yE=(t,e,n,r)=>{const s=e.plateauFrequency??5e-4,i=e.plateauOctaves??2,o=`${t.seed}|${e.cell}|${s}|${i}|${n}|${r}`;let a=tp.get(o);if(a===void 0){const l=sh(t.seed);a=t.base+l.fbm((n+.5)*e.cell*s,(r+.5)*e.cell*s,i)*t.amplitude,tp.set(o,a)}return a},$o=(t,e,n=Fi)=>{const r=mE(t,e,n);if(n.plains===void 0)return r;const{cell:s,threshold:i,edge:o}=n.plains,a=t/s,l=e/s,c=Qf(a,l,(h,f)=>gE(n.plains,h,f)),u=Qf(a,l,(h,f)=>yE(n,n.plains,h,f)),d=pE(i-o,i+o,c);return Na(r,u,d)},bE=1024,R0=8,vE=220,wE=64,_E=R0/bE,xE=5,kE=2,SE=.52,EE=.15,AE=.8,TE=790741,Kl={y:vE,halfHeight:wE,flatness:xE,frequency:_E,period:R0,octaves:kE,threshold:SE,coverageThreshold:EE,coverageDrive:AE},np=new Map,CE=t=>{let e=np.get(t);return e===void 0&&(e=new rh(t^TE,Kl.period),np.set(t,e)),e},rp=(t,e,n,r=Kl)=>t.fbm(e*r.frequency,r.y*r.frequency,n*r.frequency,r.octaves),Bc=(t,e,n,r,s,i=Kl)=>t.fbm(e*i.frequency,n*i.frequency*i.flatness,r*i.frequency,i.octaves)>i.threshold-Math.max(0,s)*i.coverageDrive,ME=829413,RE=1/200,sp=1,PE=.004,ca=6,ip=new Map,IE=t=>{let e=ip.get(t);return e===void 0&&(e=new rh(t^ME,256),ip.set(t,e)),e},Yi=(t,e,n,r,s,i)=>{if(i===0||n>s+4)return!1;const o=RE,a=2,l=t.fbm(e*o,n*o*a,r*o,sp),c=t.fbm((e+317)*o,(n+317)*o*a,(r+317)*o,sp);let u=l*l+c*c;if(n>s-4){const d=n-(s-4);u+=d*.005}return u<PE},OE=108449,op=1/1500,zE=2,LE=.02,$E=30,ap=new Map,DE=t=>{let e=ap.get(t);return e===void 0&&(e=new rh(t^OE,256),ap.set(t,e)),e},NE=(t,e,n)=>t.fbm(e*op,0,n*op,zE)>LE,xe=0,Ti=1,hs=2,an=3,fs=4,bs=5,Cr=6,P0=7,I0=8,ih=25,oh=26,FE=27,BE=28,Fa=29,bl=9,O0=15,Do=16,ah=22,z0=23,lh=24,vl=7,Ut=t=>t===an||t>=bl&&t<=O0||t===z0,Ir=t=>t===Cr||t>=Do&&t<=ah||t===lh,kt=t=>Ut(t)||Ir(t),Ba=t=>Ut(t)||Ir(t)?t>=bl&&t<=O0?t-bl+1:t>=Do&&t<=ah?t-Do+1:0:0,Jl=1,ch=(t,e=Jl)=>(t[0]+2*e)*(t[1]+2*e)*(t[2]+2*e);class UE{dims;scale;voxels;padding=Jl;data;mightHaveVoxels=!1;hasWater=!1;hasFlowing=!1;constructor(e){this.dims=e.dims,this.voxels=e.voxels,this.scale=e.scale,this.data=e.data??new Uint8Array(ch(e.voxels,this.padding))}index(e,n,r){const[s,i]=this.voxels,o=this.padding;return((r+o)*(i+2*o)+(n+o))*(s+2*o)+(e+o)}paddedIndex(e,n,r){const[s,i]=this.voxels,o=this.padding;return((r+o)*(i+2*o)+(n+o))*(s+2*o)+(e+o)}atPadded(e,n,r){return this.data[this.paddedIndex(e,n,r)]}inBoundsPadded(e,n,r){const s=this.padding;return e>=-s&&n>=-s&&r>=-s&&e<this.voxels[0]+s&&n<this.voxels[1]+s&&r<this.voxels[2]+s}inBounds(e,n,r){return e>=0&&n>=0&&r>=0&&e<this.voxels[0]&&n<this.voxels[1]&&r<this.voxels[2]}get(e,n,r){return this.inBounds(e,n,r)?this.data[this.index(e,n,r)]:xe}set(e,n,r,s){this.inBounds(e,n,r)&&(this.data[this.index(e,n,r)]=s,Ut(s)?this.hasWater=!0:s!==xe&&(this.mightHaveVoxels=!0),kt(s)&&(this.hasFlowing=!0))}reset(){this.data.fill(xe),this.mightHaveVoxels=!1,this.hasWater=!1,this.hasFlowing=!1}}const HE=(t,e,n,r)=>{t.reset();const s=t.scale,[i,o,a]=t.voxels,l=t.padding,c=o/2,u=t.dims[1],d=n.seaLevel,h=8,f=Kl,m=f.y-f.halfHeight,p=f.y+f.halfHeight,y=e[1]+(-l+.5-o/2)*s,b=e[1]+(o+l-.5-o/2)*s>=m&&y<=p?CE(n.seed):void 0,v=IE(n.seed),x=E=>Math.round((E-e[1])/s+c),k=(E,T,A,M)=>{const O=Math.max(s,M),S=Math.min(s,M),z=Math.round(O/S),w=Math.floor(E/O)*O+O/2,R=Math.floor(T/O)*O+O/2,F=Math.floor(A/O)*O+O/2,D=w+(.5-z/2)*S,Q=R+(.5-z/2)*S,H=F+(.5-z/2)*S,J=u/2/S;let N;for(let U=0;U<z;U++){const ae=D+U*S;for(let ie=0;ie<z;ie++){const q=H+ie*S,be=$o(ae,q,n),De=Math.round((be-e[1])/S+J),Se=b===void 0?-1/0:rp(b,ae,q),Me=Se>=f.coverageThreshold;for(let nt=0;nt<z;nt++){const Ne=Q+nt*S,ot=Math.round((Ne-e[1])/S+J-.5),mt=Yi(v,ae,Ne,q,be,n.amplitude);let _;if(mt?_=d!==void 0&&ot>=De+1&&ot<=Math.round((d-e[1])/S+J)?an:xe:ot===De?_=Ti:ot<De?_=Ne>=be-ca?hs:fs:d!==void 0&&ot>=De+1&&ot<=Math.round((d-e[1])/S+J)?_=an:_=xe,_===xe&&Me&&b!==void 0&&Ne>=m&&Ne<=p&&Bc(b,ae,Ne,q,Se)&&(_=bs),_===xe)return xe;const K=_===an?"water":"solid";if(N===void 0)N=K;else if(K!==N)return xe}}}return N==="water"?an:hs},C=(E,T)=>{const A=e[0]+(E+.5-i/2)*s,M=e[2]+(T+.5-a/2)*s,O=E<0?r?.nx??s:E>=i?r?.px??s:void 0,S=T<0?r?.nz??s:T>=a?r?.pz??s:void 0,z=$o(A,M,n),w=x(z),R=d===void 0?-1/0:x(d),F=b===void 0?-1/0:rp(b,A,M),D=F>=f.coverageThreshold,Q=(()=>{if(!NE(DE(n.seed),A,M))return-1/0;const q=z-$E;for(let be=-l;be<o+l-1;be++){const De=e[1]+(be+.5-o/2)*s;if(De>q)break;if(!Yi(v,A,De,M,z,n.amplitude))continue;const Se=e[1]+(be+1+.5-o/2)*s;if(Yi(v,A,Se,M,z,n.amplitude))return be}return-1/0})(),H=w,J=H-ca,N=H+h,U=(q,be)=>q===H?Ti:q<H?be>=z-ca?hs:fs:d!==void 0&&q>=H+1&&q<=R?an:D&&b!==void 0&&be>=m&&be<=p&&Bc(b,A,be,M,F)?bs:xe,ae=(q,be)=>Yi(v,A,be,M,z,n.amplitude)?q===Q?Cr:d!==void 0&&q>=H+1&&q<=R?an:xe:fs,ie=(q,be)=>{if(Yi(v,A,be,M,z,n.amplitude)){const Se=d!==void 0&&q>=H+1&&q<=R;return q===Q&&!Se?Cr:Se?an:xe}return q===H?Ti:q<H?be>=z-ca?hs:fs:d!==void 0&&q>=H+1&&q<=R?an:D&&b!==void 0&&be>=m&&be<=p&&Bc(b,A,be,M,F)?bs:xe};for(let q=-l;q<o+l;++q){const be=e[1]+(q+.5-o/2)*s,De=q<0?r?.ny??s:q>=o?r?.py??s:void 0;let Se;if(O!==void 0||De!==void 0||S!==void 0){const Me=[];O!==void 0&&Me.push(O),De!==void 0&&Me.push(De),S!==void 0&&Me.push(S),Se=Me.some(nt=>nt!==s)?k(A,be,M,Math.max(...Me)):q>N?U(q,be):q<J?ae(q,be):ie(q,be)}else Se=q>N?U(q,be):q<J?ae(q,be):ie(q,be);t.data[t.paddedIndex(E,q,T)]=Se,Ut(Se)?t.hasWater=!0:Se!==xe&&(t.mightHaveVoxels=!0)}};for(let E=-l;E<a+l;++E)for(let T=-l;T<i+l;++T)C(T,E)};class ua extends Error{kind;constructor(e,n){super(n),this.name="ScriptExecutionError",this.kind=e}}class jE{context;runtime;effects=[];logs=[];timeLimitMs;tickHandlers=[];planHandler;engine;deadline=1/0;disposed=!1;constructor(e){this.runtime=e.runtime,this.context=e.context,this.timeLimitMs=e.timeLimitMs,e.runtime.setInterruptHandler(()=>Date.now()>this.deadline),this.engine=this.installEngine(e.context,e),this.installDeterministicGlobals(e.context,e)}load(e){this.assertAlive(),this.withBudget(()=>{const n=this.context.evalCode(`(function (engine) {
${e}
});`,"place.js");if(n.error!==void 0){const{name:i,message:o}=this.describeError(n.error);throw n.dispose(),new ua(Uc(i,o),o===""?i:`${i}: ${o}`)}const r=n.value,s=this.context.callFunction(r,this.context.undefined,this.engine);r.dispose(),this.readResult(s)})}tick(e,n){this.assertAlive(),this.withBudget(()=>{const r=this.context.newNumber(e),s=this.context.newString(n);try{for(const i of this.tickHandlers){const o=this.context.callFunction(i,this.context.undefined,r,s);this.readResult(o)}}finally{s.dispose(),r.dispose()}})}plan(e){this.assertAlive();let n="";return this.withBudget(()=>{if(this.planHandler===void 0)return;const r=this.context,s=r.newString(e);try{const i=r.callFunction(this.planHandler,r.undefined,s);if(i.error!==void 0){const{name:o,message:a}=this.describeError(i.error);throw i.dispose(),new ua(Uc(o,a),a===""?o:`${o}: ${a}`)}r.typeof(i.value)==="string"&&(n=r.getString(i.value)),i.dispose()}finally{s.dispose()}}),n}drain(){return{effects:this.effects.splice(0,this.effects.length),logs:this.logs.splice(0,this.logs.length)}}dispose(){if(!this.disposed){this.disposed=!0;for(const e of this.tickHandlers)e.dispose();this.planHandler?.dispose(),this.engine.dispose(),this.context.dispose(),this.runtime.dispose()}}withBudget(e){this.deadline=Date.now()+this.timeLimitMs;try{e()}finally{this.deadline=1/0}}installEngine(e,n){const r=e.newObject(),s=(a,l)=>{const c=e.newFunction(a,l);e.setProp(r,a,c),c.dispose()};s("dispatch",(a,l)=>(this.effects.push({tag:e.getString(a),payload:e.getString(l)}),e.undefined)),s("log",a=>(this.logs.push(e.getString(a)),e.undefined)),s("now",()=>e.newNumber(n.now())),s("endings",()=>e.newString(JSON.stringify(n.endings?.()??[]))),s("players",()=>e.newString(JSON.stringify(n.getPlayers?.()??[]))),s("heightAt",(a,l)=>e.newNumber(n.heightAt?.(e.getNumber(a),e.getNumber(l))??0)),s("solidAt",(a,l,c)=>n.solidAt?.(e.getNumber(a),e.getNumber(l),e.getNumber(c))?e.true:e.false),s("waterAt",(a,l,c)=>n.waterAt?.(e.getNumber(a),e.getNumber(l),e.getNumber(c))?e.true:e.false),s("onTick",a=>(this.tickHandlers.push(a.dup()),e.undefined)),s("onPlan",a=>(this.planHandler?.dispose(),this.planHandler=a.dup(),e.undefined));const i=e.newObject(),o={air:xe,grass:Ti,dirt:hs,water:an,stone:fs,cloud:bs,lava:Cr,log:P0,leaves:I0,brick:ih,wood:oh,ice:FE,greystone:BE};for(const[a,l]of Object.entries(o)){const c=e.newNumber(l);e.setProp(i,a,c),c.dispose()}return e.setProp(r,"blocks",i),i.dispose(),r}installDeterministicGlobals(e,n){const r=e.newFunction("random",()=>e.newNumber(n.random())),s=e.getProp(e.global,"Math");e.setProp(s,"random",r),r.dispose(),s.dispose();const i=e.newFunction("now",()=>e.newNumber(n.now())),o=e.getProp(e.global,"Date");e.setProp(o,"now",i),i.dispose(),o.dispose()}readResult(e){if(e.error!==void 0){const{name:n,message:r}=this.describeError(e.error);throw e.dispose(),new ua(Uc(n,r),r===""?n:`${n}: ${r}`)}e.dispose()}describeError(e){const n=r=>{const s=this.context.getProp(e,r),i=this.context.typeof(s)==="string"?this.context.getString(s):"";return s.dispose(),i};return{name:n("name"),message:n("message")}}assertAlive(){if(this.disposed)throw new ua("fatal","sandbox disposed")}}const WE=t=>{let e=t|0;return()=>{e=e+1831565813|0;let n=Math.imul(e^e>>>15,1|e);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}},Uc=(t,e)=>{if(t==="InternalError"){if(e==="interrupted")return"interrupt";if(e==="out of memory")return"memory"}return"exception"};let lp;const VE=()=>typeof process<"u"&&process.versions?.node!==void 0,GE=()=>VE()?(async()=>{const{createRequire:t}=await Sr(async()=>{const{createRequire:o}=await Promise.resolve().then(()=>Eu);return{createRequire:o}},void 0),{dirname:e,join:n}=await Sr(async()=>{const{dirname:o,join:a}=await Promise.resolve().then(()=>Eu);return{dirname:o,join:a}},void 0),{pathToFileURL:r}=await Sr(async()=>{const{pathToFileURL:o}=await Promise.resolve().then(()=>Eu);return{pathToFileURL:o}},void 0),s=t(import.meta.url),i=e(s.resolve("@jitl/quickjs-wasmfile-release-sync/package.json"));return Kf({type:"sync",importFFI:()=>import(r(n(i,"dist","ffi.mjs")).href).then(o=>o.QuickJSFFI),importModuleLoader:()=>import(r(n(i,"dist","emscripten-module.mjs")).href).then(o=>o.default)})})():(async()=>{const{default:t}=await Sr(async()=>{const{default:e}=await import("./emscripten-module-8No0DIiv.js");return{default:e}},[]);return Kf(cE(hE,{wasmLocation:t}))})(),YE=async t=>{lp??=GE();const n=(await lp).newRuntime();n.setMemoryLimit(t.memoryLimitBytes??16*1024*1024);const r=n.newContext(),s=WE(t.seed|0);return new jE({runtime:n,context:r,now:t.now,random:s,timeLimitMs:t.timeLimitMs??250,endings:t.endings,heightAt:t.heightAt,solidAt:t.solidAt,waterAt:t.waterAt,getPlayers:t.getPlayers})},Fn=(t,e,n)=>({kind:"box",min:t,max:e,id:n}),XE=({at:t,size:e,wall:n,roof:r,floor:s})=>{const[i,o,a]=t,[l,c,u]=e,d=i+l-1,h=o+c-1,f=a+u-1,m=[];m.push(Fn([i,o,a],[d,o,f],s)),m.push(Fn([i,h,a],[d,h,f],r));const p=o+1,y=h-1;if(y>=p&&l>=3&&u>=3){m.push(Fn([i,p,a],[d,y,a],n)),m.push(Fn([i,p,f],[d,y,f],n)),m.push(Fn([i,p,a+1],[i,y,f-1],n)),m.push(Fn([d,p,a+1],[d,y,f-1],n));const g=i+Math.floor(l/2),b=Math.min(p+1,y);m.push(Fn([g,p,a],[g,b,a],xe))}return m},qE=({from:t,to:e,width:n,id:r})=>{const[s,i,o]=t,[a,,l]=e,c=Math.abs(a-s)>=Math.abs(l-o),u=Math.floor(Math.max(1,n)/2),[d,h]=c?[Math.min(s,a),Math.max(s,a)]:[s-u,s+u],[f,m]=c?[o-u,o+u]:[Math.min(o,l),Math.max(o,l)];return[Fn([d,i,f],[h,i,m],r)]},ZE=({at:t,along:e,steps:n,rise:r,run:s,width:i,id:o})=>{const[a,l,c]=t,u=[];for(let d=0;d<n;d++){const h=l+(d+1)*r-1;if(e==="x"){const f=a+d*s;u.push(Fn([f,l,c],[f+s-1,h,c+i-1],o))}else{const f=c+d*s;u.push(Fn([a,l,f],[a+i-1,h,f+s-1],o))}}return u},KE=({from:t,to:e,width:n,id:r})=>{const[s,i,o]=t,[a,l,c]=e,u=Math.abs(a-s)>=Math.abs(c-o),d=Math.max(1,Math.abs(u?a-s:c-o)),h=Math.min(i,l),f=Math.floor(Math.max(1,n)/2),m=[];for(let p=0;p<=d;p++){const y=Math.max(h,Math.round(i+(l-i)*p/d));if(u){const g=Math.min(s,a)+p;m.push(Fn([g,h,o-f],[g,y,o+f],r))}else{const g=Math.min(o,c)+p;m.push(Fn([s-f,h,g],[s+f,y,g],r))}}return m},L0=t=>t.kind==="box"?[t]:t.kind==="road"?qE(t):t.kind==="stairs"?ZE(t):t.kind==="ramp"?KE(t):XE(t),JE=(t,e,n)=>{if(n.length===0)return;const r=t.scale,[s,i,o]=t.voxels,a=[s,i,o],l=t.padding;for(const c of n)for(const u of L0(c)){const d=u.id;if(!Number.isInteger(d)||d<0||d>255)continue;const h=[0,0,0],f=[0,0,0];for(let m=0;m<3;m++){const p=u.min[m]*ft,y=(u.max[m]+1)*ft;h[m]=Math.max(-l,Math.floor((p-e[m])/r+a[m]/2)),f[m]=Math.min(a[m]+l-1,Math.ceil((y-e[m])/r+a[m]/2)-1)}for(let m=h[2];m<=f[2];m++)for(let p=h[1];p<=f[1];p++)for(let y=h[0];y<=f[0];y++)t.data[t.paddedIndex(y,p,m)]=d,Ut(d)?t.hasWater=!0:d!==xe&&(t.mightHaveVoxels=!0)}},Gr=15,vi=15,QE=0,td=4,$0=(()=>{const t={[Cr]:Gr,[Fa]:Gr};for(let e=Do;e<=ah;e++)t[e]=Gr;return t[lh]=Gr,t})(),D0=t=>t*(1/Gr),eA=t=>t==="skylight"?QE:td;class cp{constructor(e,n){this.voxels=e,this.data=n??new Uint8Array(ch(e,this.padding))}voxels;data;padding=Jl;paddedIndex(e,n,r){const[s,i]=this.voxels,o=this.padding;return((r+o)*(i+2*o)+(n+o))*(s+2*o)+(e+o)}skylightAt(e){return this.data[e]&vi}blocklightAt(e){return this.data[e]>>>td}setSkylightAt(e,n){this.data[e]=this.data[e]&~vi|n}setBlocklightAt(e,n){this.data[e]=this.data[e]&vi|n<<td}clearBlocklight(){const e=this.data;for(let n=0;n<e.length;n++)e[n]&=vi}}const N0=t=>t===xe||Ut(t)||t===bs,up=(t,e,n,r)=>t.paddedIndex(e,n,r),uh=(t,e,n,r,s)=>{const[i,o,a]=t.voxels,l=t.padding,c=e.data,u=eA(r),d=~(vi<<u),h=y=>c[y]>>>u&vi,f=(y,g)=>{c[y]=c[y]&d|g<<u},m=[];for(const y of n){const g=up(e,y.x,y.y,y.z);y.level>h(g)&&f(g,y.level),m.push(y)}const p=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]];for(let y=0;y<m.length;y++){const g=m[y];for(const[b,v,x]of p){const k=g.x+b,C=g.y+v,E=g.z+x;if(k<-l||k>=i+l||C<-l||C>=o+l||E<-l||E>=a+l||!N0(t.atPadded(k,C,E)))continue;const T=up(e,k,C,E),A=h(T),M=s&&g.fullSky&&v!==0?Gr:g.level-1;M<=A||(f(T,M),m.push({x:k,y:C,z:E,level:M,fullSky:M===Gr}))}}},F0=(t,e,n,r)=>{const[s,i,o]=t.voxels,a=t.scale,l=t.padding,c=t.voxels.map(m=>m/2),u=m=>n[0]+(m+.5-c[0])*a,d=m=>n[1]+(m+.5-c[1])*a,h=m=>n[2]+(m+.5-c[2])*a,f=[];for(let m=-l;m<o+l;m++){const p=h(m);for(let y=-l;y<s+l;y++){const g=u(y),b=$o(g,p,r);for(let v=-l;v<i+l;v++){const x=e.paddedIndex(y,v,m);if(e.skylightAt(x)!==0)continue;N0(t.atPadded(y,v,m))&&d(v)>=b&&(e.setSkylightAt(x,Gr),f.push({x:y,y:v,z:m,level:Gr,fullSky:!0}))}}}return uh(t,e,f,"skylight",!0),e},Ql=(t,e)=>{e.clearBlocklight();const[n,r,s]=t.voxels,i=t.padding,o=[];for(let a=-i;a<s+i;a++)for(let l=-i;l<r+i;l++)for(let c=-i;c<n+i;c++){const u=t.atPadded(c,l,a);if(u===xe)continue;const d=$0[u];d!==void 0&&o.push({x:c,y:l,z:a,level:d,fullSky:!1})}return uh(t,e,o,"blocklight",!1),e},ft=2,wl=t=>{const e=ft*(1<<t);return{voxels:[Je[0]/e,Je[1]/e,Je[2]/e],dimensions:Je,voxelSize:e}},Ci=64,Je=[Ci*ft,Ci*ft,Ci*ft],dp=t=>{const e=t.lod??0,{dimensions:n,voxels:r,voxelSize:s}=wl(e),i=t.into;return i!==void 0&&(i.storeData.fill(0),i.light.fill(0)),{center:t.center,store:new UE({dims:n,voxels:r,scale:s,data:i?.storeData}),light:i===void 0?new cp(r):new cp(r,i.light),targetLod:e}},So=(t,e,n)=>[Math.floor((t+Je[0]/2)/Je[0]),Math.floor((e+Je[1]/2)/Je[1]),Math.floor((n+Je[2]/2)/Je[2])],tA=(t,e,n)=>{const r=t.store,s=r.scale,[i,o,a]=r.voxels,l=(d,h)=>Math.max(0,Math.min(h-1,d)),c=l(Math.floor((e-t.center[0])/s+i/2),i),u=l(Math.floor((n-t.center[2])/s+a/2),a);for(let d=o-1;d>=0;--d){const h=r.get(c,d,u);if(h!==0&&!kt(h)&&h!==bs)return t.center[1]+(d+1-o/2)*s}return-1/0},nA=(t,e,n,r=Fi)=>{const s=So(e,$o(e,n,r),n)[1];for(let i=24;i>=-32;i--){const a=(s+i)*Je[1],l=t(e,a,n);if(l===void 0)continue;const c=tA(l,e,n);if(c!==-1/0)return c}return-1/0},rA=(t,e,n,r)=>{const s=So(e,n,r);for(let i=0;i<4;i++){const o=s[1]*Je[1],a=t(e,o,r);if(a===void 0)return-1/0;const l=a.store,c=l.scale,[u,d,h]=l.voxels,f=(g,b)=>Math.max(0,Math.min(b-1,g)),m=f(Math.floor((e-a.center[0])/c+u/2),u),p=f(Math.floor((r-a.center[2])/c+h/2),h),y=f(Math.floor((n-a.center[1])/c+d/2),d);for(let g=y;g>=0;--g){const b=l.get(m,g,p);if(b!==0&&!kt(b))return a.center[1]+(g+1-d/2)*c}s[1]--}return-1/0},dh=(t,e,n,r)=>{const s=t(e,n,r);if(s===void 0)return xe;const i=s.store,o=i.scale,[a,l,c]=i.voxels;return i.get(Math.floor((e-s.center[0])/o+a/2),Math.floor((n-s.center[1])/o+l/2),Math.floor((r-s.center[2])/o+c/2))},sA=(t,e,n,r)=>{const s=dh(t,e,n,r);return s!==xe&&!kt(s)},iA=(t,e,n,r)=>Ut(dh(t,e,n,r)),oA=(t,e,n,r)=>Ir(dh(t,e,n,r)),Hc=(t,e=Fi)=>{F0(t.store,t.light,t.center,e),Ql(t.store,t.light)},hp=(t,e)=>{const{dimensions:n,voxels:r,voxelSize:s}=wl(e.lod);t.store.dims=n,t.store.voxels=r,t.store.scale=s,t.store.data=e.storeData,t.store.mightHaveVoxels=e.mightHaveVoxels,t.store.hasWater=e.hasWater,t.light.voxels=r,t.light.data=e.light,t.targetLod=e.lod},aA=8,B0=t=>{const e=aA*Ci,n=r=>Math.floor(r/ft);return{min:[n(t[0])-e,n(t[1])-e,n(t[2])-e],max:[n(t[0])+e,n(t[1])+e,n(t[2])+e]}},lA=4096,fp=1e6,cA=255,uA=256,jc=64,dA=128,hA=64,fA=64,pA=256,Hr=(t,e,n)=>typeof t=="number"&&Number.isInteger(t)&&t>=e&&t<=n,mA=t=>Hr(t,-fp,fp),$r=t=>Array.isArray(t)&&t.length===3&&t.every(mA),Ms=t=>Hr(t,0,cA),gA=t=>{if(typeof t!="object"||t===null)return!1;const e=t;if(e.kind==="box")return!$r(e.min)||!$r(e.max)||!Ms(e.id)?!1:e.min.every((n,r)=>n<=e.max[r]);if(e.kind==="road")return $r(e.from)&&$r(e.to)&&Hr(e.width,1,jc)&&Ms(e.id);if(e.kind==="house")return $r(e.at)&&$r(e.size)&&e.size.every(n=>Hr(n,1,uA))&&Ms(e.wall)&&Ms(e.roof)&&Ms(e.floor);if(e.kind==="stairs")return $r(e.at)&&(e.along==="x"||e.along==="z")&&Hr(e.steps,1,dA)&&Hr(e.rise,1,hA)&&Hr(e.run,1,fA)&&Hr(e.width,1,jc)&&Ms(e.id);if(e.kind==="ramp"){if(!$r(e.from)||!$r(e.to)||!Hr(e.width,1,jc)||!Ms(e.id))return!1;const[n,,r]=e.from,[s,,i]=e.to;return Math.max(Math.abs(s-n),Math.abs(i-r))<=pA}return!1},yA=t=>Array.isArray(t)&&t.length<=lA&&t.every(gA),bA=t=>{if(t.trim()==="")return[];let e;try{e=JSON.parse(t)}catch{return null}return yA(e)?e:null},U0=async t=>{const e=await B2(t.files,t.entry,t.models??{}),n=await YE({seed:t.seed,now:()=>0});try{n.load(e);const r={seed:t.seed,region:t.region},s=n.plan(JSON.stringify(r)),i=bA(s);if(i===null)throw new gl("the plan handler did not return a structure plan this world can generate");return i}finally{n.dispose()}},vA="_overlay_15awv_6",wA="_control_15awv_12",da={overlay:vA,control:wA};const H0="183";function _A(t){const e=t[0];if(typeof e=="string"&&e.startsWith("TSL:")){const n=t[1];n&&n.isStackTrace?t[0]+=" "+n.getLocation():t[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return t}function xA(...t){t=_A(t);const e="THREE."+t.shift();{const n=t[0];n&&n.isStackTrace?console.warn(n.getError(e)):console.warn(e,...t)}}function si(t,e,n){return Math.max(e,Math.min(n,t))}class _l{constructor(e=0,n=0){_l.prototype.isVector2=!0,this.x=e,this.y=n}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,n){return this.x=e,this.y=n,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const n=this.x,r=this.y,s=e.elements;return this.x=s[0]*n+s[3]*r+s[6],this.y=s[1]*n+s[4]*r+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,n){return this.x=si(this.x,e.x,n.x),this.y=si(this.y,e.y,n.y),this}clampScalar(e,n){return this.x=si(this.x,e,n),this.y=si(this.y,e,n),this}clampLength(e,n){const r=this.length();return this.divideScalar(r||1).multiplyScalar(si(r,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;const r=this.dot(e)/n;return Math.acos(si(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,r=this.y-e.y;return n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this}lerpVectors(e,n,r){return this.x=e.x+(n.x-e.x)*r,this.y=e.y+(n.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this}rotateAround(e,n){const r=Math.cos(n),s=Math.sin(n),i=this.x-e.x,o=this.y-e.y;return this.x=i*r-o*s+e.x,this.y=i*s+o*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:H0}}));typeof window<"u"&&(window.__THREE__?xA("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=H0);const j0=Bl(),fr=()=>Ul(j0),Wc=new Map;function hh(t,e,n){const{promise:r,resolve:s}=Promise.withResolvers();let i={x:0,y:0},o={x:t.clientX,y:t.clientY};const a=performance.now(),l=new AbortController,c=t.pointerId,u=t.currentTarget;u.setPointerCapture(c);const d=Wc.get(u)??new Map;Wc.set(u,d),d.set(c,t);function h(p){const y=xr.create(p.clientX,p.clientY),g=xr.sub(y,o);return o=y,i=xr.add(i,g),d.set(p.pointerId,p),{delta:g,totalDelta:i,event:p,timespan:performance.now()-a,pointers:d}}function f(p){const y=h(p);u.hasPointerCapture(c)&&(u.releasePointerCapture(c),d.delete(p.pointerId),d.size===0&&Wc.delete(u)),e?.(y),s(y),l.abort()}const m=p=>y=>{y.pointerId===c&&p(y)};return e&&u.addEventListener("pointermove",m(p=>e(h(p))),l),u.addEventListener("pointercancel",m(f),l),u.addEventListener("pointerup",m(f),l),r}const kA={"action-button":"_action-button_c115i_1"};var SA=pe("<button>");const EA=Object.freeze({r:255,g:255,b:255});function pp(t){const[e,n]=ye(!1),r={r:0,g:0,b:0},s=Bt(()=>{const a=t.colour;return a===void 0?EA:typeof a=="object"?a:Zu.fromHex(a,r)},{equals:!1}),i=async a=>{n(!0),await hh(a),n(!1)};zn(e,a=>t.onPressed?.(a));var o=SA();return o.$$contextmenu=a=>a.preventDefault(),o.$$pointerdown=i,de(()=>({e:`${t.left}px`,t:`${t.top}px`,a:`${t.size}px`,o:`${t.size}px`,i:`${.5*t.size}px`,n:`rgba(${s().r}, ${s().g}, ${s().b}, ${e()?"0.8":"0.5"})`,s:kA["action-button"]}),({e:a,t:l,a:c,o:u,i:d,n:h,s:f},m)=>{a!==m?.e&&Mt(o,"left",a),l!==m?.t&&Mt(o,"top",l),c!==m?.a&&Mt(o,"width",c),u!==m?.o&&Mt(o,"height",u),d!==m?.i&&Mt(o,"border-radius",d),h!==m?.n&&Mt(o,"background-color",h),X(o,f,m?.s)}),o}zr(["pointerdown","contextmenu"]);const AA="_underlay_hl8f5_1",TA="_knob_hl8f5_13",Vc={underlay:AA,"outer-ring":"_outer-ring_hl8f5_6",knob:TA};var CA=pe("<div><div><div>");function MA(t){const[e,n]=ye(),[r,s]=ye();async function i(c){const u=c.currentTarget.getBoundingClientRect();s(xr.create(c.clientX-u.left,c.clientY-u.top)),await hh(c,({totalDelta:d})=>{const h=xr.clone(d),f=xr.length(h);f>.5*t.outerRingSize&&xr.multiplyScalar(h,.5*t.outerRingSize/f,h),n(h),t.onValue(xr.multiplyScalar(h,1/t.outerRingSize))}),n(void 0),s(void 0),t.onValue({x:0,y:0})}var o=CA(),a=o.firstChild,l=a.firstChild;return o.$$contextmenu=c=>c.preventDefault(),o.$$pointerdown=i,de(()=>({e:`${t.left}px`,t:`${t.top}px`,a:`${t.hitAreaSize}px`,o:`${t.hitAreaSize}px`,i:Vc.underlay,n:`${r()?.x??.5*t.hitAreaSize}px`,s:`${r()?.y??.5*t.hitAreaSize}px`,h:`${t.outerRingSize}px`,r:`${t.outerRingSize}px`,d:Vc["outer-ring"],l:`calc(50% + ${e()?.x??0}px)`,u:`calc(50% + ${e()?.y??0}px)`,c:`${t.knobSize}px`,w:`${t.knobSize}px`,m:Vc.knob}),({e:c,t:u,a:d,o:h,i:f,n:m,s:p,h:y,r:g,d:b,l:v,u:x,c:k,w:C,m:E},T)=>{c!==T?.e&&Mt(o,"left",c),u!==T?.t&&Mt(o,"top",u),d!==T?.a&&Mt(o,"width",d),h!==T?.o&&Mt(o,"height",h),X(o,f,T?.i),m!==T?.n&&Mt(a,"left",m),p!==T?.s&&Mt(a,"top",p),y!==T?.h&&Mt(a,"width",y),g!==T?.r&&Mt(a,"height",g),X(a,b,T?.d),v!==T?.l&&Mt(l,"left",v),x!==T?.u&&Mt(l,"top",x),k!==T?.c&&Mt(l,"width",k),C!==T?.w&&Mt(l,"height",C),X(l,E,T?.m)}),o}zr(["pointerdown","contextmenu"]);var RA=pe("<div style=-webkit-tap-highlight-color:transparent><div></div><div></div><div>");const Gc=150,ii=100,Yc=84,oi=24,PA=()=>{const{input:t}=fr(),[e,n]=ye(new _l(window.innerWidth,window.innerHeight)),r=new AbortController;window.addEventListener("resize",()=>n(new _l(window.innerWidth,window.innerHeight)),{signal:r.signal}),On(()=>r.abort());var s=RA(),i=s.firstChild,o=i.nextSibling,a=o.nextSibling;return ne(i,te(MA,{left:oi,get top(){return e().y-oi-Gc},hitAreaSize:Gc,outerRingSize:.8*Gc,knobSize:70,onValue:l=>t.setTouchMove(l.x*2,-l.y*2)})),ne(o,te(pp,{get left(){return e().x-oi-ii},get top(){return e().y-oi-ii},size:ii,onPressed:l=>{t.setTouchJump(l),l&&t.queueJump()}})),a.addEventListener("pointercancel",l=>{l.stopPropagation(),t.setTouchSecondary(!1)}),a.$$pointerup=l=>{l.stopPropagation(),t.setTouchSecondary(!1)},a.$$pointerdown=l=>{l.stopPropagation(),t.setTouchSecondary(!0)},ne(a,te(pp,{get left(){return e().x-oi-ii-Yc-12},get top(){return e().y-oi-ii+(ii-Yc)/2},size:Yc,colour:"0x35b06b"})),de(()=>({e:da.overlay,t:da.control,a:da.control,o:da.control}),({e:l,t:c,a:u,o:d},h)=>{X(s,l,h?.e),X(i,c,h?.t),X(o,u,h?.a),X(a,d,h?.o)}),s};zr(["pointerdown","pointerup"]);function ec(t){const e=window.matchMedia(t),n=new AbortController,[r,s]=ye(i(e));function i(o){return!!o.matches}return e.addEventListener("change",o=>s(i(o)),{signal:n.signal}),On(()=>n.abort()),r}function Ua(t){const e=t.target;if(e===null)return!1;const n=e.tagName;return n==="INPUT"||n==="TEXTAREA"||n==="SELECT"||e.isContentEditable}const Xs=(t,e,n)=>Math.max(e,Math.min(n,t));function IA(...t){return t.filter(e=>e!==void 0)}var OA=pe("<button>"),zA=pe("<div>");let LA=0;function Xi(){let t=null;const e=`popover-${LA++}`,[n,r]=ye(!1);return{isOpen:n,open(){t?.togglePopover(!0)},close(){t?.togglePopover(!1)},Trigger(s){var i=OA();return Mt(i,"anchor-name",`--${e}`),lt(i,"popovertarget",e),ne(i,()=>s.children),de(()=>({e:n()?"true":"false",t:s.class,a:s.title}),({e:o,t:a,a:l},c)=>{o!==c?.e&&lt(i,"aria-selected",o),X(i,a,c?.t),l!==c?.a&&lt(i,"title",l)}),i},PopOver(s){return te(b_,{get children(){var i=zA();i.addEventListener("toggle",a=>{const l=a.newState==="open";r(l),s.onToggle?.(l)});var o=IA(s.ref,a=>t=a);return(typeof o=="function"||Array.isArray(o))&&Qn(()=>o,i),lt(i,"id",e),ne(i,()=>s.children),de(()=>({e:{"position-anchor":`--${e}`,...s.style},t:s.popover??"auto",a:s.class}),({e:a,t:l,a:c},u)=>{$d(i,a,u?.e),l!==u?.t&&lt(i,"popover",l),X(i,c,u?.a)}),i}})}}}const $A="_content_pxmsz_4",DA="_loading_pxmsz_13",NA="_header_pxmsz_19",FA="_fields_pxmsz_29",BA="_field_pxmsz_29",UA="_text_pxmsz_45",HA="_number_pxmsz_46",jA="_actions_pxmsz_66",WA="_button_pxmsz_72",VA="_primary_pxmsz_91",GA="_clonePopover_pxmsz_114",YA="_clonePopoverText_pxmsz_133",XA="_clonePopoverOk_pxmsz_139",qA="_clonePopoverError_pxmsz_143",ZA="_pick_pxmsz_147",KA="_tabs_pxmsz_197",JA="_tab_pxmsz_197",QA="_tabActive_pxmsz_221",eT="_tabMain_pxmsz_227",tT="_tabRemove_pxmsz_235",nT="_add_pxmsz_248",rT="_panes_pxmsz_266",sT="_pane_pxmsz_266",iT="_paneActive_pxmsz_278",oT="_modelsToggle_pxmsz_289",aT="_models_pxmsz_289",lT="_modelsAttached_pxmsz_338",cT="_modelsBrowse_pxmsz_349",uT="_modelsAttachedHeader_pxmsz_366",dT="_modelsHeading_pxmsz_373",hT="_modelsEmpty_pxmsz_400",fT="_modelsCards_pxmsz_414",pT="_modelsFromFile_pxmsz_422",mT="_modelsSearch_pxmsz_439",gT="_modelsCard_pxmsz_414",yT="_modelsCardPreview_pxmsz_480",bT="_modelsCardThumbnail_pxmsz_490",vT="_modelsCardPlaceholder_pxmsz_497",wT="_modelsCardName_pxmsz_503",_T="_modelsCardDims_pxmsz_511",xT="_modelsCardAction_pxmsz_517",ge={content:$A,loading:DA,header:NA,fields:FA,field:BA,text:UA,number:HA,actions:jA,button:WA,primary:VA,clonePopover:GA,clonePopoverText:YA,clonePopoverOk:XA,clonePopoverError:qA,pick:ZA,tabs:KA,tab:JA,tabActive:QA,tabMain:eT,tabRemove:tT,add:nT,panes:rT,pane:sT,paneActive:iT,modelsToggle:oT,models:aT,modelsAttached:lT,modelsBrowse:cT,modelsAttachedHeader:uT,modelsHeading:dT,modelsEmpty:hT,modelsCards:fT,modelsFromFile:pT,modelsSearch:mT,modelsCard:gT,modelsCardPreview:yT,modelsCardThumbnail:bT,modelsCardPlaceholder:vT,modelsCardName:wT,modelsCardDims:_T,modelsCardAction:xT};var mp=pe("<p>"),kT=pe("<button>"),ST=pe("<i>"),ET=pe("<button>Open…"),AT=pe("<button>Run"),TT=pe("<button>Publish"),CT=pe("<header><div><label>name<input></label><label>seed<input type=number></label><label>spawn<input></label></div><div><button>New</button><!><!><button>Close</button></div><!><!>"),MT=pe("<nav><button>+ script</button><button>models"),RT=pe('<button type=button title="add rm-stacker model files">+ from a file'),gp=pe("<ul>"),PT=pe('<div><section><div><h3>attached to this place</h3><input type=file accept=.zip,application/zip multiple hidden></div></section><section><h3>browse published models</h3><div><input placeholder="a handle, e.g. alice.bsky.social"><button>Search'),IT=pe("<div>"),OT=pe("<div>loading draft…"),zT=pe("<select><option value disabled selected>pick a place…"),LT=pe("<option>"),$T=pe('<div><button title="double-click to rename"></button><button>✕'),DT=pe("<div>loading editor…"),NT=pe("<p>nothing attached yet"),FT=pe("<button>remove"),BT=pe("<li><div></div><span>"),yp=pe("<span>▢"),bp=pe("<img loading=lazy>",1),UT=pe("<button>mine"),HT=pe("<button>attach"),jT=pe("<li><div></div><span></span><span>×<!>×<!>");const WT=G1(()=>Sr(()=>import("./PlaceEditorPanes-RUW7dIsh.js"),[]),"src/ui/PlaceEditorPanes.tsx"),ai=t=>t instanceof Error?t.message:String(t);let Xc=null,vp=null;const wp=t=>t.manifest.scripts?.[0]??Object.keys(t.scripts)[0]??Pr,VT=t=>{const e=t.voxelscape,[n,r]=ye(Xc),[s,i]=ye(Pr),[o,a]=ye(!1),[l,c]=ye(!1),[u,d]=ye([]),[h,f]=ye(0),m=new Map,p=W=>{Xc=W,r(W)},[y,g]=ye(null);zn(()=>e(),W=>{if(W.placeEditor.isMine){g(null);return}const ee=W.placeEditor.owner;if(ee===null){g(null);return}W.placeEditor.resolveHandle(ee).then(g)}),zn(()=>e(),W=>{if(W===vp)return;const ce=W.placeEditor.activeProject??Gu(W.placeEditor.defaultSeed);Xc=ce,vp=W,r(ce),i(wp(ce)),f(fe=>fe+1)});const b=()=>{const W=n();return W===null?[]:Object.keys(W.scripts)},v=W=>{a(!1),i(W),m.get(W)?.requestMeasure()},x=W=>{const ee=n();ee!==null&&p({...ee,manifest:{...ee.manifest,...W}})},k=W=>{const ee=W.split(/[,\s]+/).map(Number);ee.length===3&&ee.every(ce=>Number.isFinite(ce))&&x({spawn:[ee[0],ee[1],ee[2]]})},C=(W,ee)=>{const ce=n();ce!==null&&p({...ce,scripts:{...ce.scripts,[W]:ee}})},E=()=>{const W=n();if(W===null)return;let ee="script.js";for(let ce=2;W.scripts[ee]!==void 0;ce++)ee=`script${ce}.js`;p({...W,manifest:{...W.manifest,scripts:[...W.manifest.scripts??[],ee]},scripts:{...W.scripts,[ee]:""}}),i(ee)},T=W=>{const ee=n();if(ee===null)return;const ce={...ee.scripts};delete ce[W];const fe=Object.keys(ce);p({...ee,manifest:{...ee.manifest,scripts:fe},scripts:ce}),s()===W&&i(fe[0]??"")},A=W=>{const ee=n();if(ee===null)return;const ce=window.prompt("rename the script file to:",W);if(ce===null||ce.trim()===""||ce===W)return;if(/[/\\]|\.\./.test(ce)){t.onStatus(`"${ce}" cannot be a script file name`);return}if(ee.scripts[ce]!==void 0){t.onStatus(`"${ce}" is already a script file`);return}const fe={...ee.scripts};fe[ce]=fe[W]??"",delete fe[W],p({...ee,manifest:{...ee.manifest,scripts:(ee.manifest.scripts??Object.keys(ee.scripts)).map(at=>at===W?ce:at)},scripts:fe}),s()===W&&i(ce)},M=()=>Object.keys(n()?.models??{}),O=(W,ee)=>{const ce=n();if(ce===null)return;const fe={...ce.models,[W]:ee};p({...ce,manifest:{...ce.manifest,models:Object.keys(fe)},models:fe})},S=async W=>{if(W===null)return;const ee=[];let ce=0;for(const fe of Array.from(W)){if(/[/\\]|\.\./.test(fe.name)){ee.push(fe.name);continue}O(fe.name,new Uint8Array(await fe.arrayBuffer())),ce++}t.onStatus(ee.length===0?`added ${ce} model(s)`:`refused ${ee.join(", ")} — a model name cannot hold a path`)},z=W=>{const ee=n();if(ee===null)return;const ce={...ee.models};delete ce[W];const fe=Object.keys(ce);p({...ee,manifest:{...ee.manifest,models:fe.length>0?fe:void 0},models:ce})},[w,R]=ye(""),[F,D]=ye([]),[Q,H]=ye(!1),[J,N]=ye({}),U=W=>`${W.repo}/${W.rkey}`,ae=async(W,ee)=>{try{const ce=await e().placeEditor.models.thumbnailUrl(ee);ce!==null&&N(fe=>({...fe,[W]:ce}))}catch{}},ie=async W=>{if(W.trim()!==""){H(!0);try{const ee=await e().placeEditor.models.list(W.trim());D(ee);for(const ce of ee)ae(U(ce),ce)}catch(ee){D([]),t.onStatus(`could not list ${W}'s models — ${ai(ee)}`)}finally{H(!1)}}},q=async W=>{R(await e().placeEditor.resolveHandle(W)),ie(W)},be=async W=>{const ee=`${W.rkey}.zip`;if(n()?.models[ee]!==void 0){t.onStatus(`"${W.record.name}" is already attached`);return}c(!0);try{const ce=new Uint8Array(await(await e().placeEditor.models.file(W)).arrayBuffer());O(ee,ce);const fe=J()[U(W)];fe!==void 0&&N(at=>({...at,[ee]:fe})),t.onStatus(`attached "${W.record.name}"`)}catch(ce){t.onStatus(`could not attach "${W.record.name}" — ${ai(ce)}`)}finally{c(!1)}},De=()=>{p(Gu(e().placeEditor.defaultSeed)),i(Pr),d([]),t.onStatus("new place started — name it, write its script, then publish")},Se=async()=>{const W=e().placeEditor.accountDid;if(W===null){t.onStatus("not signed in — use /account:login first");return}c(!0);try{const ee=await e().placeEditor.places.list(W);d(ee),t.onStatus(ee.length===0?"you have published no places yet":"pick one of your places to open and edit")}catch(ee){t.onStatus(`could not list your places — ${ai(ee)}`)}finally{c(!1)}},Me=async W=>{c(!0);try{const ee=await qd(await e().placeEditor.places.file(W));p(ee),i(wp(ee)),d([]),t.onStatus(`opened "${ee.manifest.name}" — publishing again under the same name updates the place`)}catch(ee){t.onStatus(`could not open that place — ${ai(ee)}`)}finally{c(!1)}},nt=async()=>{const W=n();if(W===null)return;const ee=W.manifest.scripts?.[0];if(ee===void 0||W.scripts[ee]===void 0){t.onStatus("name a first script in the manifest to run it");return}c(!0);try{const ce=await e().placeEditor.runScript(W.scripts,ee,W.manifest.seed,W.models,W.manifest.spawn);t.onStatus(ce)}catch(ce){t.onStatus(`run failed — ${ai(ce)}`)}finally{c(!1)}},Ne=async()=>{const W=n();if(W===null)return{ok:!1,error:"no draft to publish"};if(W.manifest.name.trim()===""){const ee="name the place before publishing";return t.onStatus(ee),{ok:!1,error:ee}}c(!0);try{const ee=await e().placeEditor.publisher.publish(await Pa(W));return d([]),t.onStatus(`published — ${ee}`),{ok:!0,atUri:ee}}catch(ee){const ce=`publish failed — ${ai(ee)}`;return t.onStatus(ce),{ok:!1,error:ce}}finally{c(!1)}},ot=()=>e().placeEditor.isMine,mt=Xi(),_=Xi(),K=1400,[Z,P]=ye(null),[I,B]=ye(null),re=async()=>{P(null);const W=await Ne();if(!W.ok){P({ok:!1,text:W.error});return}P({ok:!0,text:"Cloned — running your copy"}),await nt(),await e().placeEditor.claim(W.atUri),setTimeout(()=>{mt.close(),P(null)},K)},se=async()=>{B(null);const W=await Ne();if(!W.ok){B({ok:!1,text:W.error});return}B({ok:!0,text:"Cloned — published"}),await e().placeEditor.claim(W.atUri),setTimeout(()=>{_.close(),B(null)},K)},G=W=>W.endsWith("s")?"'":"'s",j=(W,ee,ce,fe,at,dt)=>te(W.PopOver,{popover:"auto",get class(){return ge.clonePopover},onToggle:Xe=>{Xe||at(null)},get children(){return[(()=>{var Xe=mp();return ne(Xe,te($e,{get when(){return fe()},get fallback(){return te($e,{get when(){return e().placeEditor.owner},get fallback(){return["This is a demo — clone it to ",ee," your own copy."]},children:yt=>["This is ",(()=>{var xt=ST();return ne(xt,()=>y()??yt()),xt})(),Qt(()=>G(y()??yt()))," place — clone it to ",ee," your own copy."]})},children:yt=>yt().text})),de(()=>[ge.clonePopoverText,fe()!==null&&(fe().ok?ge.clonePopoverOk:ge.clonePopoverError)],(yt,xt)=>{X(Xe,yt,xt)}),Xe})(),te($e,{get when(){return!fe()?.ok},get children(){var Xe=kT();return Kg(Xe,"click",dt,!0),ne(Xe,ce),de(()=>({e:[ge.button,ge.primary],t:l()}),({e:yt,t:xt},hn)=>{X(Xe,yt,hn?.e),xt!==hn?.t&&lt(Xe,"disabled",xt)}),Xe}})]}});let he;const oe=Xi(),[_e,Re]=ye(null),He=async()=>{Re(null);const W=await Ne();if(!W.ok){Re({ok:!1,text:W.error});return}Re({ok:!0,text:"Cloned — choose files to attach"}),await e().placeEditor.claim(W.atUri),setTimeout(()=>{oe.close(),Re(null),he?.click()},K)};var _t=IT();return Qn(()=>W=>t.ref?.(W),_t),ne(_t,te($e,{get when(){return n()},get fallback(){var W=OT();return de(()=>ge.loading,(ee,ce)=>{X(W,ee,ce)}),W},get children(){return[(()=>{var W=CT(),ee=W.firstChild,ce=ee.firstChild,fe=ce.firstChild,at=fe.nextSibling,dt=ce.nextSibling,Xe=dt.firstChild,yt=Xe.nextSibling,xt=dt.nextSibling,hn=xt.firstChild,Yt=hn.nextSibling,Fe=ee.nextSibling,Ee=Fe.firstChild,qe=Ee.nextSibling,rn=qe.nextSibling,bt=rn.nextSibling,$n=Fe.nextSibling,sn=$n.nextSibling;return at.$$input=Be=>x({name:Be.currentTarget.value}),yt.$$input=Be=>{const rt=Number(Be.currentTarget.value);Number.isFinite(rt)&&x({seed:rt})},Yt.$$input=Be=>k(Be.currentTarget.value),Ee.$$click=()=>De(),ne(Fe,te($e,{get when(){return u().length===0},get fallback(){var Be=zT();return Be.firstChild,Be.addEventListener("change",rt=>{const Pe=u()[Number(rt.currentTarget.value)];Pe!==void 0&&Me(Pe)}),ne(Be,te(cn,{get each(){return u()},children:(rt,Pe)=>(()=>{var ke=LT();return ne(ke,()=>rt.record.name),de(()=>Pe(),Ye=>{ke.value=Ye}),ke})()}),null),de(()=>ge.pick,(rt,Pe)=>{X(Be,rt,Pe)}),Be},get children(){var Be=ET();return Be.$$click=()=>{Se()},de(()=>({e:ge.button,t:l()}),({e:rt,t:Pe},ke)=>{X(Be,rt,ke?.e),Pe!==ke?.t&&lt(Be,"disabled",Pe)}),Be}}),qe),ne(Fe,te($e,{get when(){return ot()},get fallback(){return te(mt.Trigger,{get class(){return[ge.button,ge.primary]},title:"This place isn't yours — clone it to run your own copy",children:"Run"})},get children(){var Be=AT();return Be.$$click=()=>{nt()},de(()=>({e:[ge.button,ge.primary],t:l()||b().length===0}),({e:rt,t:Pe},ke)=>{X(Be,rt,ke?.e),Pe!==ke?.t&&lt(Be,"disabled",Pe)}),Be}}),rn),ne(Fe,te($e,{get when(){return ot()},get fallback(){return te(_.Trigger,{get class(){return[ge.button,ge.primary]},title:"This place isn't yours — clone it to publish your own copy",children:"Publish"})},get children(){var Be=TT();return Be.$$click=()=>{Ne()},de(()=>({e:[ge.button,ge.primary],t:l()}),({e:rt,t:Pe},ke)=>{X(Be,rt,ke?.e),Pe!==ke?.t&&lt(Be,"disabled",Pe)}),Be}}),bt),bt.$$click=()=>e().placeEditor.setOpen(!1),ne(W,()=>j(mt,"run","Clone & Run",Z,P,()=>{re()}),$n),ne(W,()=>j(_,"publish","Clone & Publish",I,B,()=>{se()}),sn),de(()=>({e:ge.header,t:ge.fields,a:ge.field,o:ge.text,i:n().manifest.name,n:ge.field,s:ge.number,h:n().manifest.seed,r:ge.field,d:ge.text,l:n().manifest.spawn.join(", "),u:ge.actions,c:ge.button,w:ge.button}),({e:Be,t:rt,a:Pe,o:ke,i:Ye,n:fn,s:ts,h:Pt,r:Xt,d:pn,l:Dn,u:Lr,c:mn,w:Ts},qt)=>{X(W,Be,qt?.e),X(ee,rt,qt?.t),X(ce,Pe,qt?.a),X(at,ke,qt?.o),at.value=Ye??"",X(dt,fn,qt?.n),X(yt,ts,qt?.s),yt.value=Pt??"",X(xt,Xt,qt?.r),X(Yt,pn,qt?.d),Yt.value=Dn??"",X(Fe,Lr,qt?.u),X(Ee,mn,qt?.c),X(bt,Ts,qt?.w)}),W})(),(()=>{var W=MT(),ee=W.firstChild,ce=ee.nextSibling;return ce.firstChild,ne(W,te(cn,{get each(){return b()},children:fe=>(()=>{var at=$T(),dt=at.firstChild,Xe=dt.nextSibling;return dt.$$dblclick=()=>A(fe),dt.$$click=()=>v(fe),ne(dt,fe),Xe.$$click=()=>T(fe),lt(Xe,"title",`remove ${fe}`),de(()=>({e:[ge.tab,!o()&&s()===fe&&ge.tabActive],t:ge.tabMain,a:ge.tabRemove}),({e:yt,t:xt,a:hn},Yt)=>{X(at,yt,Yt?.e),X(dt,xt,Yt?.t),X(Xe,hn,Yt?.a)}),at})()}),ee),ee.$$click=()=>E(),ce.$$click=()=>a(!0),ne(ce,te($e,{get when(){return M().length>0},get children(){return[" (",Qt(()=>M().length),")"]}}),null),de(()=>({e:ge.tabs,t:ge.add,a:[ge.modelsToggle,o()&&ge.tabActive]}),({e:fe,t:at,a:dt},Xe)=>{X(W,fe,Xe?.e),X(ee,at,Xe?.t),X(ce,dt,Xe?.a)}),W})(),te($e,{get when(){return!o()},get children(){return te($e,{get when(){return b().length>0},get children(){return te($e,{get when(){return h()},keyed:!0,get children(){return te(X1,{get fallback(){var W=DT();return de(()=>ge.loading,(ee,ce)=>{X(W,ee,ce)}),W},get children(){return te(WT,{get project(){return n()},get active(){return s()},onEditor:(W,ee)=>m.set(W,ee),onInput:C})}})}})}})}}),te($e,{get when(){return o()},get children(){var W=PT(),ee=W.firstChild,ce=ee.firstChild,fe=ce.firstChild,at=fe.nextSibling,dt=ee.nextSibling,Xe=dt.firstChild,yt=Xe.nextSibling,xt=yt.firstChild,hn=xt.nextSibling;at.addEventListener("change",Fe=>{S(Fe.currentTarget.files),Fe.currentTarget.value=""});var Yt=he;return typeof Yt=="function"||Array.isArray(Yt)?Qn(()=>Yt,at):he=at,ne(ce,te($e,{get when(){return ot()},get fallback(){return[te(oe.Trigger,{get class(){return ge.modelsFromFile},title:"this place isn't yours — clone it to attach your own files",children:"+ from a file"}),Qt(()=>j(oe,"attach","Clone & Attach",_e,Re,()=>{He()}))]},get children(){var Fe=RT();return Fe.$$click=()=>he?.click(),de(()=>ge.modelsFromFile,(Ee,qe)=>{X(Fe,Ee,qe)}),Fe}}),null),ne(ee,te($e,{get when(){return M().length>0},get fallback(){var Fe=NT();return de(()=>ge.modelsEmpty,(Ee,qe)=>{X(Fe,Ee,qe)}),Fe},get children(){var Fe=gp();return ne(Fe,te(cn,{get each(){return M()},children:Ee=>{const qe=Xi(),[rn,bt]=ye(null),$n=async()=>{bt(null);const Pe=await Ne();if(!Pe.ok){bt({ok:!1,text:Pe.error});return}z(Ee),bt({ok:!0,text:"Cloned — removed"}),await e().placeEditor.claim(Pe.atUri),setTimeout(()=>{qe.close(),bt(null)},K)};var sn=BT(),Be=sn.firstChild,rt=Be.nextSibling;return ne(Be,te($e,{get when(){return J()[Ee]},get fallback(){var Pe=yp();return de(()=>ge.modelsCardPlaceholder,(ke,Ye)=>{X(Pe,ke,Ye)}),Pe},children:Pe=>(()=>{var ke=bp();return lt(ke,"alt",Ee),de(()=>({e:ge.modelsCardThumbnail,t:Pe()}),({e:Ye,t:fn},ts)=>{X(ke,Ye,ts?.e),fn!==ts?.t&&lt(ke,"src",fn)}),ke})()})),lt(rt,"title",Ee),ne(rt,Ee),ne(sn,te($e,{get when(){return ot()},get fallback(){return[te(qe.Trigger,{get class(){return ge.modelsCardAction},title:`this place isn't yours — clone it to remove ${Ee} from your own copy`,children:"remove"}),Qt(()=>j(qe,"remove models from","Clone & Remove",rn,bt,()=>{$n()}))]},get children(){var Pe=FT();return Pe.$$click=()=>z(Ee),lt(Pe,"title",`remove ${Ee}`),de(()=>ge.modelsCardAction,(ke,Ye)=>{X(Pe,ke,Ye)}),Pe}}),null),de(()=>({e:ge.modelsCard,t:ge.modelsCardPreview,a:ge.modelsCardName}),({e:Pe,t:ke,a:Ye},fn)=>{X(sn,Pe,fn?.e),X(Be,ke,fn?.t),X(rt,Ye,fn?.a)}),sn}})),de(()=>ge.modelsCards,(Ee,qe)=>{X(Fe,Ee,qe)}),Fe}}),null),xt.$$keydown=Fe=>{Fe.key==="Enter"&&ie(w())},xt.$$input=Fe=>R(Fe.currentTarget.value),hn.$$click=()=>{ie(w())},ne(yt,te($e,{get when(){return e().placeEditor.accountDid},children:Fe=>(()=>{var Ee=UT();return Ee.$$click=()=>{q(Fe())},de(()=>({e:ge.button,t:Q()}),({e:qe,t:rn},bt)=>{X(Ee,qe,bt?.e),rn!==bt?.t&&lt(Ee,"disabled",rn)}),Ee})()}),null),ne(dt,te($e,{get when(){return F().length>0},get fallback(){var Fe=mp();return ne(Fe,()=>Q()?"searching…":"no results yet"),de(()=>ge.modelsEmpty,(Ee,qe)=>{X(Fe,Ee,qe)}),Fe},get children(){var Fe=gp();return ne(Fe,te(cn,{get each(){return F()},children:Ee=>{const qe=Xi(),[rn,bt]=ye(null),$n=async()=>{bt(null);const Pt=await Ne();if(!Pt.ok){bt({ok:!1,text:Pt.error});return}await be(Ee),bt({ok:!0,text:"Cloned — attached"}),await e().placeEditor.claim(Pt.atUri),setTimeout(()=>{qe.close(),bt(null)},K)};var sn=jT(),Be=sn.firstChild,rt=Be.nextSibling,Pe=rt.nextSibling,ke=Pe.firstChild,Ye=ke.nextSibling,fn=Ye.nextSibling,ts=fn.nextSibling;return ne(Be,te($e,{get when(){return J()[U(Ee)]},get fallback(){var Pt=yp();return de(()=>ge.modelsCardPlaceholder,(Xt,pn)=>{X(Pt,Xt,pn)}),Pt},children:Pt=>(()=>{var Xt=bp();return de(()=>({e:ge.modelsCardThumbnail,t:Pt(),a:Ee.record.name}),({e:pn,t:Dn,a:Lr},mn)=>{X(Xt,pn,mn?.e),Dn!==mn?.t&&lt(Xt,"src",Dn),Lr!==mn?.a&&lt(Xt,"alt",Lr)}),Xt})()})),ne(rt,()=>Ee.record.name),ne(Pe,()=>Ee.record.dimensions.width,ke),ne(Pe,()=>Ee.record.dimensions.height,Ye),ne(Pe,()=>Ee.record.dimensions.depth,ts),ne(sn,te($e,{get when(){return ot()},get fallback(){return[te(qe.Trigger,{get class(){return ge.modelsCardAction},title:"this place isn't yours — clone it to attach models to your own copy",children:"attach"}),Qt(()=>j(qe,"attach","Clone & Attach",rn,bt,()=>{$n()}))]},get children(){var Pt=HT();return Pt.$$click=()=>{be(Ee)},de(()=>({e:ge.modelsCardAction,t:l()}),({e:Xt,t:pn},Dn)=>{X(Pt,Xt,Dn?.e),pn!==Dn?.t&&lt(Pt,"disabled",pn)}),Pt}}),null),de(()=>({e:ge.modelsCard,t:ge.modelsCardPreview,a:ge.modelsCardName,o:Ee.record.name,i:ge.modelsCardDims}),({e:Pt,t:Xt,a:pn,o:Dn,i:Lr},mn)=>{X(sn,Pt,mn?.e),X(Be,Xt,mn?.t),X(rt,pn,mn?.a),Dn!==mn?.o&&lt(rt,"title",Dn),X(Pe,Lr,mn?.i)}),sn}})),de(()=>ge.modelsCards,(Ee,qe)=>{X(Fe,Ee,qe)}),Fe}}),null),de(()=>({e:ge.models,t:ge.modelsAttached,a:ge.modelsAttachedHeader,o:ge.modelsHeading,i:ge.modelsBrowse,n:ge.modelsHeading,s:ge.modelsSearch,h:ge.text,r:w(),d:ge.button,l:Q()}),({e:Fe,t:Ee,a:qe,o:rn,i:bt,n:$n,s:sn,h:Be,r:rt,d:Pe,l:ke},Ye)=>{X(W,Fe,Ye?.e),X(ee,Ee,Ye?.t),X(ce,qe,Ye?.a),X(fe,rn,Ye?.o),X(dt,bt,Ye?.i),X(Xe,$n,Ye?.n),X(yt,sn,Ye?.s),X(xt,Be,Ye?.h),xt.value=rt??"",X(hn,Pe,Ye?.d),ke!==Ye?.l&&lt(hn,"disabled",ke)}),W}})]}})),de(()=>ge.content,(W,ee)=>{X(_t,W,ee)}),_t};zr(["click","input","keydown","dblclick"]);const GT="_underlay_5etxy_1",YT="_anchor_5etxy_7",XT="_scrim_5etxy_30",qT="_panel_5etxy_44",ZT="_editorOpen_5etxy_77",KT="_terminal_5etxy_87",JT="_output_5etxy_114",QT="_help_5etxy_124",eC="_name_5etxy_137",tC="_args_5etxy_141",nC="_prompt_5etxy_145",rC="_prefix_5etxy_155",sC="_field_5etxy_160",iC="_input_5etxy_149",oC="_completion_5etxy_181",aC="_typed_5etxy_193",lC="_suggestions_5etxy_200",cC="_suggestion_5etxy_200",uC="_selected_5etxy_235",dC="_dockHeader_5etxy_240",hC="_dockLabel_5etxy_267",fC="_dockChevron_5etxy_275",ut={underlay:GT,anchor:YT,scrim:XT,panel:qT,editorOpen:ZT,terminal:KT,output:JT,help:QT,name:eC,args:tC,prompt:nC,"input-container":"_input-container_5etxy_149",prefix:rC,field:sC,input:iC,completion:oC,typed:aC,suggestions:lC,suggestion:cC,selected:uC,dockHeader:dC,dockLabel:hC,dockChevron:fC};var pC=pe('<div><input placeholder="type a command (/help)"><!><ul popover=manual>'),_p=pe("<div aria-hidden=true><span>"),mC=pe("<li>"),gC=pe("<div><span>> </span><span></span><span>"),yC=pe("<dl>"),bC=pe("<dt>"),vC=pe("<span> "),wC=pe("<dd><!><!>"),_C=pe("<output>"),W0=pe("<div>"),xC=pe("<span>"),kC=pe("<button type=button><span>>_</span><span>terminal"),SC=pe("<div><span>>"),EC=pe("<div><div>"),AC=pe("<div><button>>_</button><!><!>");const TC=t=>{let e=null,n=null;const r=[],[s,i]=ye(-1),[o,a]=ye(()=>r[s()]),[l,c]=ye(0),u=O=>{if(!O.startsWith("/")||O.includes(" "))return[];const S=t.commands.map(z=>z.name).map(z=>[z,d(O,z)]).filter(z=>z[1]!==void 0).sort(([z,w],[R,F])=>F-w||z.length-R.length).map(([z])=>z);return S.length>1?S:S.filter(z=>z!==O)},d=(O,S)=>{let z=0,w=0,R=0;for(const F of O){const D=S.indexOf(F,z);if(D===-1)return;w=D===z?w+1:0,R+=w-(D-z),z=D+1}return R},h=(O,S)=>{const z=O.indexOf(":",S.length);return z===-1?O:O.slice(0,z+1)},f=()=>o()??"",m=()=>{const O=f(),S=t.commands.find(z=>z.name===O.trimEnd());return S?.args===void 0?"":`${O.endsWith(" ")?"":" "}${S.args}`},p=()=>u(f()),y=()=>p()[l()],g=O=>t.commands.some(S=>S.name===O),b=()=>{if(g(f()))return;const O=y();return O?.startsWith(f())?O:void 0};zn(()=>t.open&&p().length>0,O=>{n.togglePopover(O)}),zn(()=>l(),O=>{n.children[O]?.scrollIntoView({block:"nearest"})});const v=O=>{a(O),c(0),e.value=O,e.focus(),e.setSelectionRange(O.length,O.length)},x=O=>{switch(O.key){case"Enter":{const S=O.currentTarget.value.trim(),z=g(S)?S:u(S)[l()]??S;if(z==="")return;t.onCommand(z),r.push(z),c(0),a("");return}case"Tab":{const S=y();if(S===void 0)return;O.preventDefault();const z=S.startsWith(f())?h(S,f()):S;v(z),c(Math.max(0,u(z).indexOf(S)));return}case"ArrowUp":{const S=p().length;if(S>0){O.preventDefault(),c(z=>(z+S-1)%S);return}i(z=>z===-1?r.length-1:z-1);return}case"ArrowDown":{const S=p().length;if(S>0){O.preventDefault(),c(z=>(z+1)%S);return}i(z=>z===r.length-1?-1:z+1);return}}};t.ref({prefill:v});var k=pC(),C=k.firstChild,E=C.nextSibling,T=E.nextSibling;C.$$keydown=x,C.$$input=O=>{i(-1),c(0),a(O.currentTarget.value)};var A=e;typeof A=="function"||Array.isArray(A)?Qn(()=>A,C):e=C,ne(k,te($e,{get when(){return b()},children:O=>(()=>{var S=_p(),z=S.firstChild;return ne(z,f),ne(S,()=>O().slice(f().length),null),de(()=>({e:ut.completion,t:ut.typed}),({e:w,t:R},F)=>{X(S,w,F?.e),X(z,R,F?.t)}),S})()}),E),ne(k,te($e,{get when(){return m()},children:O=>(()=>{var S=_p(),z=S.firstChild;return ne(z,f),ne(S,O,null),de(()=>({e:ut.completion,t:ut.typed}),({e:w,t:R},F)=>{X(S,w,F?.e),X(z,R,F?.t)}),S})()}),T);var M=n;return typeof M=="function"||Array.isArray(M)?Qn(()=>M,T):n=T,ne(T,te(cn,{get each(){return p()},children:(O,S)=>(()=>{var z=mC();return z.$$click=()=>v(O),z.$$mousedown=w=>w.preventDefault(),ne(z,O),de(()=>[ut.suggestion,{[ut.selected]:S()===l()}],(w,R)=>{X(z,w,R)}),z})()})),de(()=>({e:ut.field,t:o(),a:t.autofocus,o:ut.input,i:ut.suggestions}),({e:O,t:S,a:z,o:w,i:R},F)=>{X(k,O,F?.e),C.value=S??"",z!==F?.a&&lt(C,"autofocus",z),X(C,w,F?.o),X(T,R,F?.i)}),k},CC=t=>{const e=()=>t.command.split(/\s/)[0],n=()=>t.command.slice(e().length);var r=gC(),s=r.firstChild,i=s.nextSibling,o=i.nextSibling;return ne(i,e),ne(o,n),de(()=>({e:ut.prompt,t:ut.name,a:ut.args}),({e:a,t:l,a:c},u)=>{X(s,a,u?.e),X(i,l,u?.t),X(o,c,u?.a)}),r},MC=t=>(()=>{var e=yC();return ne(e,te(cn,{get each(){return t.commands},children:n=>[(()=>{var r=bC();return ne(r,()=>n.name),de(()=>ut.name,(s,i)=>{X(r,s,i)}),r})(),(()=>{var r=wC(),s=r.firstChild,i=s.nextSibling;return ne(r,te($e,{get when(){return n.args},get children(){var o=vC(),a=o.firstChild;return ne(o,()=>n.args,a),de(()=>ut.args,(l,c)=>{X(o,l,c)}),o}}),s),ne(r,()=>n.description,i),r})()]})),de(()=>ut.help,(n,r)=>{X(e,n,r)}),e})(),RC=t=>{let e=null;zn(()=>t.entries,()=>{e.scrollTop=e.scrollHeight});var n=_C(),r=e;return typeof r=="function"||Array.isArray(r)?Qn(()=>r,n):e=n,ne(n,te(cn,{get each(){return t.entries},children:s=>{switch(s.kind){case"echo":return te(CC,{get command(){return s.command}});case"help":return te(MC,{get commands(){return s.commands}});default:var i=W0();return ne(i,()=>s.text),i}}})),de(()=>ut.output,(s,i)=>{X(n,s,i)}),n};function PC(t){const[e,n]=ye([]),r=(...a)=>{n(l=>[...l,...a])},s=a=>typeof a=="string"?a.split(`
`).map(l=>({kind:"line",text:l})):[{kind:"help",commands:a}];t.notice!==void 0&&zn(()=>t.notice(),a=>{a!==void 0&&r({kind:"line",text:a})});async function i(a){if(a==="/clear"){n([]);return}const l=t.onCommand(a);if(!(l instanceof Promise)){r({kind:"echo",command:a},...s(l));return}r({kind:"echo",command:a},{kind:"line",text:"…"});try{r(...s(await l))}catch(c){r({kind:"line",text:`command failed: ${String(c)}`})}}const o=a=>{r({kind:"line",text:a})};return{entries:e,commands:t.commands,onCommand:i,print:o}}const IC=t=>[(()=>{var e=kC(),n=e.firstChild,r=n.nextSibling;return e.$$click=()=>t.onToggle(),ne(e,te($e,{get when(){return t.minimizable},get children(){var s=xC();return ne(s,()=>t.expanded?"▾":"▸"),de(()=>ut.dockChevron,(i,o)=>{X(s,i,o)}),s}}),null),de(()=>({e:ut.dockHeader,t:!t.minimizable,a:t.expanded?"true":"false",o:t.expanded?"collapse terminal":"expand terminal",i:ut.prompt,n:ut.dockLabel}),({e:s,t:i,a:o,o:a,i:l,n:c},u)=>{X(e,s,u?.e),i!==u?.t&&lt(e,"disabled",i),o!==u?.a&&lt(e,"aria-expanded",o),a!==u?.o&&lt(e,"aria-label",a),X(n,l,u?.i),X(r,c,u?.n)}),e})(),te($e,{get when(){return t.expanded},get children(){return te(RC,{get entries(){return t.terminal.entries()}})}}),(()=>{var e=SC(),n=e.firstChild;return ne(e,te(TC,{get commands(){return t.terminal.commands()},open:!0,autofocus:!0,get onCommand(){return t.terminal.onCommand},ref:r=>t.ref(r)}),null),de(()=>({e:ut["input-container"],t:ut.prefix}),({e:r,t:s},i)=>{X(e,r,i?.e),X(n,s,i?.t)}),e})()],OC=t=>{const e=t.voxelscape,n=ec("(any-pointer: coarse)"),r=()=>e().placeEditor.open(),[s,i]=ye(!1),[o,a]=ye(!n()),l=()=>s()||r();let c=null,u=null,d=null,h=null;zn(()=>r(),v=>{v&&document.pointerLockElement!==null&&document.exitPointerLock()}),zn(()=>r(),v=>{v&&a(!1)});const f=new AbortController;On(()=>f.abort()),window.addEventListener("keydown",v=>{if(v.key==="/"&&!v.ctrlKey&&!v.metaKey&&!v.altKey&&!Ua(v)){v.preventDefault(),i(!0),Hs(),d.prefill("/");return}if(v.key==="Escape"){if(r()){h!==null&&v.target instanceof Node&&h.contains(v.target)||e().placeEditor.setOpen(!1);return}s()&&i(!1)}},{signal:f.signal}),window.addEventListener("pointerdown",v=>{!s()||r()||v.target instanceof Node&&!c.contains(v.target)&&!u.contains(v.target)&&i(!1)},{signal:f.signal});var m=AC(),p=m.firstChild,y=p.nextSibling,g=y.nextSibling;p.$$click=()=>i(v=>!v);var b=u;return typeof b=="function"||Array.isArray(b)?Qn(()=>b,p):u=p,ne(m,te($e,{get when(){return r()},get children(){var v=W0();return v.$$click=x=>{x.target===x.currentTarget&&e().placeEditor.setOpen(!1)},de(()=>ut.scrim,(x,k)=>{X(v,x,k)}),v}}),y),ne(m,te($e,{get when(){return l()},get children(){var v=EC(),x=v.firstChild,k=c;return typeof k=="function"||Array.isArray(k)?Qn(()=>k,v):c=v,ne(v,te($e,{get when(){return r()},get children(){return te(VT,{ref:C=>{h=C},voxelscape:e,onStatus:C=>{t.terminal.print(C),a(!0)}})}}),x),ne(x,te(IC,{get terminal(){return t.terminal},get expanded(){return Qt(()=>!!r())()?o():!0},onToggle:()=>a(C=>!C),get minimizable(){return r()},ref:C=>{d=C}})),de(()=>({e:[ut.panel,r()&&ut.editorOpen],t:r()?"dialog":void 0,a:r()?"place script editor":void 0,o:ut.terminal}),({e:C,t:E,a:T,o:A},M)=>{X(v,C,M?.e),E!==M?.t&&lt(v,"role",E),T!==M?.a&&lt(v,"aria-label",T),X(x,A,M?.o)}),v}}),g),de(()=>({e:ut.underlay,t:ut.anchor}),({e:v,t:x},k)=>{X(m,v,k?.e),X(p,x,k?.t)}),m};zr(["input","keydown","mousedown","click"]);const zC="_overlay_9y4mt_1",LC="_hint_9y4mt_11",$C="_bubble_9y4mt_20",DC="_speaker_9y4mt_31",NC="_prompt_9y4mt_39",FC="_actions_9y4mt_46",BC="_option_9y4mt_53",UC="_leave_9y4mt_67",HC="_hud_9y4mt_96",jC="_narration_9y4mt_140",$t={overlay:zC,hint:LC,bubble:$C,speaker:DC,prompt:NC,actions:FC,option:BC,leave:UC,"letterbox-top":"_letterbox-top_9y4mt_78","letterbox-bottom":"_letterbox-bottom_9y4mt_79",hud:HC,"hud-item":"_hud-item_9y4mt_107","hud-label":"_hud-label_9y4mt_113","hud-bar":"_hud-bar_9y4mt_121","hud-bar-fill":"_hud-bar-fill_9y4mt_129","hud-text":"_hud-text_9y4mt_134",narration:jC,"narration-name":"_narration-name_9y4mt_154","narration-text":"_narration-text_9y4mt_162"},WC="/big-mesh-studios/voxelscape/audio/letter-tick.ogg",VC=.6;class GC{context=null;buffer=null;bytes=null;constructor(){this.bytes=fetch(WC).then(e=>e.ok?e.arrayBuffer():null).catch(()=>null),window.addEventListener("pointerdown",()=>this.unlock(),{once:!0}),window.addEventListener("keydown",()=>this.unlock(),{once:!0})}unlock(){if(this.context!==null){this.context.resume(),this.decode();return}const e=window.AudioContext??window.webkitAudioContext;e!==void 0&&(this.context=new e,this.decode())}async decode(){if(this.context===null||this.buffer!==null||this.bytes===null)return;const e=await this.bytes;if(!(e===null||this.context===null))try{this.buffer=await this.context.decodeAudioData(e)}catch{this.buffer=null}}play(){this.unlock();const e=this.context;if(e===null)return;e.state==="suspended"&&e.resume();const n=e.createGain();if(n.gain.value=VC,n.connect(e.destination),this.buffer!==null){const r=e.createBufferSource();r.buffer=this.buffer,r.connect(n),r.start();return}this.synthesize(e,n)}synthesize(e,n){const r=e.createOscillator();r.type="triangle";const s=e.currentTime;r.frequency.setValueAtTime(1250,s),r.frequency.exponentialRampToValueAtTime(700,s+.03),n.gain.setValueAtTime(.4,s),n.gain.exponentialRampToValueAtTime(.001,s+.035),r.connect(n),r.start(s),r.stop(s+.04)}}const YC=new GC;var Ha=pe("<div>"),xp=pe("<span>"),XC=pe("<div><div>"),qC=pe("<div><!><!>"),V0=pe("<div><div></div><div>"),ZC=pe("<div> — tap to <!>"),KC=pe('<button aria-label="walk away">✕'),JC=pe("<div><!><!><!><!><!>"),QC=pe("<button>");const eM=36,tM=6e3,nM=t=>t.max<=0?0:Math.max(0,Math.min(100,t.value/t.max*100)),rM=()=>{const t=fr(),[e,n]=ye([]);return Ws(()=>{let r=0,s="";const i=()=>{const o=t.hud(),a=JSON.stringify(o);a!==s&&(s=a,n(o)),r=requestAnimationFrame(i)};return r=requestAnimationFrame(i),()=>cancelAnimationFrame(r)}),te($e,{get when(){return e().length>0},get children(){var r=Ha();return ne(r,te(cn,{get each(){return e()},children:s=>(()=>{var i=qC(),o=i.firstChild,a=o.nextSibling;return ne(i,te($e,{get when(){return s.label!==""},get children(){var l=xp();return ne(l,()=>s.label),de(()=>$t["hud-label"],(c,u)=>{X(l,c,u)}),l}}),o),ne(i,te($e,{get when(){return s.kind==="bar"},get fallback(){var l=xp();return ne(l,()=>s.text),de(()=>$t["hud-text"],(c,u)=>{X(l,c,u)}),l},get children(){var l=XC(),c=l.firstChild;return de(()=>({e:$t["hud-bar"],t:$t["hud-bar-fill"],a:`${nM(s)}%`}),({e:u,t:d,a:h},f)=>{X(l,u,f?.e),X(c,d,f?.t),h!==f?.a&&Mt(c,"width",h)}),l}}),a),de(()=>$t["hud-item"],(l,c)=>{X(i,l,c)}),i})()})),de(()=>$t.hud,(s,i)=>{X(r,s,i)}),r}})},sM=()=>{const t=fr(),[e,n]=ye(null);return Ws(()=>{let r=null,s,i=0;const o=()=>{const a=t.narration();a!==r&&(r=a,n(a),s!==void 0&&(clearTimeout(s),s=void 0),a!==null&&(s=setTimeout(()=>t.dismissNarration(),tM))),i=requestAnimationFrame(o)};return i=requestAnimationFrame(o),()=>{cancelAnimationFrame(i),s!==void 0&&clearTimeout(s)}}),te($e,{get when(){return e()!==null},get children(){var r=V0(),s=r.firstChild,i=s.nextSibling;return ne(s,()=>e().name),ne(i,()=>e().text),de(()=>({e:$t.narration,t:$t["narration-name"],a:$t["narration-text"]}),({e:o,t:a,a:l},c)=>{X(r,o,c?.e),X(s,a,c?.t),X(i,l,c?.a)}),r}})},iM=()=>{const t=fr(),[e,n]=ye(""),[r,s]=ye(""),[i,o]=ye(!1),[a,l]=ye([]),[c,u]=ye("");Ws(()=>{let b=0,v="",x=0,k=0;const C=E=>{const T=t.dialog(),A=T?.prompt??"",M=T===null?"":`${T.npcId}\0${A}`;if(M!==v&&(v=M,T===null?(n(""),s(""),u(""),l([]),o(!1)):(n(T.name),u(A),l(T.options),x=0,k=E,s(""),o(!1))),T!==null&&!i()){const O=Math.floor((E-k)/eM),S=Math.min(A.length,1+O);for(;x<S;){x++;const z=A[x-1];z!==void 0&&z!==" "&&YC.play()}s(A.slice(0,x)),x>=A.length&&o(!0)}b=requestAnimationFrame(C)};return b=requestAnimationFrame(C),()=>cancelAnimationFrame(b)});const d=()=>{i()||(s(c()),o(!0))};var h=JC(),f=h.firstChild,m=f.nextSibling,p=m.nextSibling,y=p.nextSibling,g=y.nextSibling;return ne(h,te($e,{get when(){return t.cutscene()},get children(){return[(()=>{var b=Ha();return de(()=>$t["letterbox-top"],(v,x)=>{X(b,v,x)}),b})(),(()=>{var b=Ha();return de(()=>$t["letterbox-bottom"],(v,x)=>{X(b,v,x)}),b})()]}}),f),ne(h,te(rM,{}),m),ne(h,te(sM,{}),p),ne(h,te($e,{get when(){return Qt(()=>t.dialog()===null)()&&t.npcAim()!==null},get children(){var b=ZC(),v=b.firstChild,x=v.nextSibling;return ne(b,()=>t.npcAim().name,v),ne(b,()=>t.npcAim().action,x),de(()=>$t.hint,(k,C)=>{X(b,k,C)}),b}}),y),ne(h,te($e,{get when(){return t.dialog()!==null},get children(){var b=V0(),v=b.firstChild,x=v.nextSibling;return ne(v,e),x.$$pointerdown=d,ne(x,r),ne(b,te($e,{get when(){return i()},get children(){return[(()=>{var k=Ha();return ne(k,te(cn,{get each(){return a()},children:(C,E)=>(()=>{var T=QC();return T.$$pointerdown=()=>t.choose(E()),ne(T,C),de(()=>$t.option,(A,M)=>{X(T,A,M)}),T})()})),de(()=>$t.actions,(C,E)=>{X(k,C,E)}),k})(),(()=>{var k=KC();return k.$$pointerdown=()=>t.leaveDialog(),de(()=>$t.leave,(C,E)=>{X(k,C,E)}),k})()]}}),null),de(()=>({e:$t.bubble,t:$t.speaker,a:$t.prompt}),({e:k,t:C,a:E},T)=>{X(b,k,T?.e),X(v,C,T?.t),X(x,E,T?.a)}),b}}),g),de(()=>$t.overlay,(b,v)=>{X(h,b,v)}),h};zr(["pointerdown"]);const oM="_hud_1k1rj_1",aM="_crosshair_1k1rj_7",lM="_voxel_1k1rj_21",cM="_strikeable_1k1rj_25",uM="_hotbar_1k1rj_42",dM="_item_1k1rj_50",hM="_active_1k1rj_68",fM="_name_1k1rj_72",pM="_icon_1k1rj_75",mM="_count_1k1rj_80",gM="_status_1k1rj_86",gn={hud:oM,crosshair:aM,voxel:lM,strikeable:cM,"vertical-stroke":"_vertical-stroke_1k1rj_29","horizontal-stroke":"_horizontal-stroke_1k1rj_34",hotbar:uM,item:dM,active:hM,name:fM,icon:pM,count:mM,status:gM};let gt=class G0{x;y;z;constructor(e=0,n=0,r=0){this.x=e,this.y=n,this.z=r}set(e,n,r){return this.x=e,this.y=n,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error(`index is out of range: ${e}`)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error(`index is out of range: ${e}`)}}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}clone(){return new G0(this.x,this.y,this.z)}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}divideScalar(e){return this.multiplyScalar(1/e)}negate(){return this.multiplyScalar(-1)}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}cross(e){return this.crossVectors(this,e)}crossVectors(e,n){const r=e.x,s=e.y,i=e.z,o=n.x,a=n.y,l=n.z;return this.x=s*l-i*a,this.y=i*o-r*l,this.z=r*a-s*o,this}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.lengthSq())}lengthManhattan(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,r=this.y-e.y,s=this.z-e.z;return n*n+r*r+s*s}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this}applyMatrix3(e){const n=this.x,r=this.y,s=this.z,i=e.elements;return this.x=i[0]*n+i[3]*r+i[6]*s,this.y=i[1]*n+i[4]*r+i[7]*s,this.z=i[2]*n+i[5]*r+i[8]*s,this}applyMatrix4(e){const n=this.x,r=this.y,s=this.z,i=e.elements,o=1/(i[3]*n+i[7]*r+i[11]*s+i[15]);return this.x=(i[0]*n+i[4]*r+i[8]*s+i[12])*o,this.y=(i[1]*n+i[5]*r+i[9]*s+i[13])*o,this.z=(i[2]*n+i[6]*r+i[10]*s+i[14])*o,this}applyQuaternion(e){const n=this.x,r=this.y,s=this.z,i=e.x,o=e.y,a=e.z,l=e.w,c=l*n+o*s-a*r,u=l*r+a*n-i*s,d=l*s+i*r-o*n,h=-i*n-o*r-a*s;return this.x=c*l+h*-i+u*-a-d*-o,this.y=u*l+h*-o+d*-i-c*-a,this.z=d*l+h*-a+c*-o-u*-i,this}transformDirection(e){const n=this.x,r=this.y,s=this.z,i=e.elements;return this.x=i[0]*n+i[4]*r+i[8]*s,this.y=i[1]*n+i[5]*r+i[9]*s,this.z=i[2]*n+i[6]*r+i[10]*s,this.normalize()}projectOnVector(e){const n=e.lengthSq();return n===0?this.set(0,0,0):this.copy(e).multiplyScalar(this.dot(e)/n)}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}setFromSphericalCoords(e,n,r){const s=Math.sin(n)*e;return this.x=s*Math.sin(r),this.y=Math.cos(n)*e,this.z=s*Math.cos(r),this}setFromMatrixPosition(e){const n=e.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e}},yM=class Y0{elements;constructor(e=1,n=0,r=0,s=0,i=1,o=0,a=0,l=0,c=1){this.elements=[e,n,r,s,i,o,a,l,c]}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}clone(){return new Y0().fromArray(this.elements)}copy(e){return this.fromArray(e.elements),this}set(e,n,r,s,i,o,a,l,c){const u=this.elements;return u[0]=e,u[3]=s,u[6]=a,u[1]=n,u[4]=i,u[7]=l,u[2]=r,u[5]=o,u[8]=c,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){const r=e.elements,s=n.elements,i=this.elements,o=r[0],a=r[3],l=r[6],c=r[1],u=r[4],d=r[7],h=r[2],f=r[5],m=r[8],p=s[0],y=s[3],g=s[6],b=s[1],v=s[4],x=s[7],k=s[2],C=s[5],E=s[8];return i[0]=o*p+a*b+l*k,i[3]=o*y+a*v+l*C,i[6]=o*g+a*x+l*E,i[1]=c*p+u*b+d*k,i[4]=c*y+u*v+d*C,i[7]=c*g+u*x+d*E,i[2]=h*p+f*b+m*k,i[5]=h*y+f*v+m*C,i[8]=h*g+f*x+m*E,this}determinant(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return n*o*u-n*a*c-r*i*u+r*a*l+s*i*c-s*o*l}invert(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],d=o*u-a*c,h=a*l-i*u,f=i*c-o*l,m=n*d+r*h+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const p=1/m;return e[0]=d*p,e[1]=(s*c-r*u)*p,e[2]=(r*a-s*o)*p,e[3]=h*p,e[4]=(n*u-s*l)*p,e[5]=(s*i-n*a)*p,e[6]=f*p,e[7]=(r*l-n*c)*p,e[8]=(n*o-r*i)*p,this}transpose(){let e;const n=this.elements;return e=n[1],n[1]=n[3],n[3]=e,e=n[2],n[2]=n[6],n[6]=e,e=n[5],n[5]=n[7],n[7]=e,this}setFromMatrix4(e){const n=e.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}fromArray(e,n=0){for(let r=0;r<9;r++)this.elements[r]=e[n+r];return this}toArray(e=[],n=0){for(let r=0;r<9;r++)e[n+r]=this.elements[r];return e}equals(e){const n=this.elements,r=e.elements;for(let s=0;s<9;s++)if(n[s]!==r[s])return!1;return!0}},cr=class X0{elements;constructor(e=1,n=0,r=0,s=0,i=0,o=1,a=0,l=0,c=0,u=0,d=1,h=0,f=0,m=0,p=0,y=1){this.elements=[e,i,c,f,n,o,u,m,r,a,d,p,s,l,h,y]}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new X0().fromArray(this.elements)}copy(e){return this.fromArray(e.elements),this}set(e,n,r,s,i,o,a,l,c,u,d,h,f,m,p,y){const g=this.elements;return g[0]=e,g[4]=n,g[8]=r,g[12]=s,g[1]=i,g[5]=o,g[9]=a,g[13]=l,g[2]=c,g[6]=u,g[10]=d,g[14]=h,g[3]=f,g[7]=m,g[11]=p,g[15]=y,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){const r=e.elements,s=n.elements,i=this.elements,o=r[0],a=r[4],l=r[8],c=r[12],u=r[1],d=r[5],h=r[9],f=r[13],m=r[2],p=r[6],y=r[10],g=r[14],b=r[3],v=r[7],x=r[11],k=r[15],C=s[0],E=s[4],T=s[8],A=s[12],M=s[1],O=s[5],S=s[9],z=s[13],w=s[2],R=s[6],F=s[10],D=s[14],Q=s[3],H=s[7],J=s[11],N=s[15];return i[0]=o*C+a*M+l*w+c*Q,i[4]=o*E+a*O+l*R+c*H,i[8]=o*T+a*S+l*F+c*J,i[12]=o*A+a*z+l*D+c*N,i[1]=u*C+d*M+h*w+f*Q,i[5]=u*E+d*O+h*R+f*H,i[9]=u*T+d*S+h*F+f*J,i[13]=u*A+d*z+h*D+f*N,i[2]=m*C+p*M+y*w+g*Q,i[6]=m*E+p*O+y*R+g*H,i[10]=m*T+p*S+y*F+g*J,i[14]=m*A+p*z+y*D+g*N,i[3]=b*C+v*M+x*w+k*Q,i[7]=b*E+v*O+x*R+k*H,i[11]=b*T+v*S+x*F+k*J,i[15]=b*A+v*z+x*D+k*N,this}determinant(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],d=e[9],h=e[10],f=e[11],m=e[12],p=e[13],y=e[14],g=e[15],b=d*y*c-p*h*c+p*l*f-a*y*f-d*l*g+a*h*g,v=m*h*c-u*y*c-m*l*f+o*y*f+u*l*g-o*h*g,x=u*p*c-m*d*c+m*a*f-o*p*f-u*a*g+o*d*g,k=m*d*l-u*p*l-m*a*h+o*p*h+u*a*y-o*d*y;return n*b+r*v+s*x+i*k}invert(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],d=e[9],h=e[10],f=e[11],m=e[12],p=e[13],y=e[14],g=e[15],b=d*y*c-p*h*c+p*l*f-a*y*f-d*l*g+a*h*g,v=m*h*c-u*y*c-m*l*f+o*y*f+u*l*g-o*h*g,x=u*p*c-m*d*c+m*a*f-o*p*f-u*a*g+o*d*g,k=m*d*l-u*p*l-m*a*h+o*p*h+u*a*y-o*d*y,C=n*b+r*v+s*x+i*k;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/C;return e[0]=b*E,e[1]=(p*h*i-d*y*i-p*s*f+r*y*f+d*s*g-r*h*g)*E,e[2]=(a*y*i-p*l*i+p*s*c-r*y*c-a*s*g+r*l*g)*E,e[3]=(d*l*i-a*h*i-d*s*c+r*h*c+a*s*f-r*l*f)*E,e[4]=v*E,e[5]=(u*y*i-m*h*i+m*s*f-n*y*f-u*s*g+n*h*g)*E,e[6]=(m*l*i-o*y*i-m*s*c+n*y*c+o*s*g-n*l*g)*E,e[7]=(o*h*i-u*l*i+u*s*c-n*h*c-o*s*f+n*l*f)*E,e[8]=x*E,e[9]=(m*d*i-u*p*i-m*r*f+n*p*f+u*r*g-n*d*g)*E,e[10]=(o*p*i-m*a*i+m*r*c-n*p*c-o*r*g+n*a*g)*E,e[11]=(u*a*i-o*d*i-u*r*c+n*d*c+o*r*f-n*a*f)*E,e[12]=k*E,e[13]=(u*p*s-m*d*s+m*r*h-n*p*h-u*r*y+n*d*y)*E,e[14]=(m*a*s-o*p*s-m*r*l+n*p*l+o*r*y-n*a*y)*E,e[15]=(o*d*s-u*a*s+u*r*l-n*d*l-o*r*h+n*a*h)*E,this}transpose(){let e;const n=this.elements;return e=n[1],n[1]=n[4],n[4]=e,e=n[2],n[2]=n[8],n[8]=e,e=n[6],n[6]=n[9],n[9]=e,e=n[3],n[3]=n[12],n[12]=e,e=n[7],n[7]=n[13],n[13]=e,e=n[11],n[11]=n[14],n[14]=e,this}setPosition(e){const n=Array.isArray(e)?e[0]:e.x,r=Array.isArray(e)?e[1]:e.y,s=Array.isArray(e)?e[2]:e.z,i=this.elements;return i[12]=n,i[13]=r,i[14]=s,this}setFromMatrixPosition(e){const n=e.elements;return this.set(1,0,0,n[12],0,1,0,n[13],0,0,1,n[14],0,0,0,1),this}extractRotation(e){const n=this.elements,r=e.elements,s=1/li.set(r[0],r[1],r[2]).length(),i=1/li.set(r[4],r[5],r[6]).length(),o=1/li.set(r[8],r[9],r[10]).length();return n[0]=r[0]*s,n[1]=r[1]*s,n[2]=r[2]*s,n[4]=r[4]*i,n[5]=r[5]*i,n[6]=r[6]*i,n[8]=r[8]*o,n[9]=r[9]*o,n[10]=r[10]*o,n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeTranslation(e,n,r){return this.set(1,0,0,e,0,1,0,n,0,0,1,r,0,0,0,1)}makeRotationX(e){const n=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,n,-r,0,0,r,n,0,0,0,0,1)}makeRotationY(e){const n=Math.cos(e),r=Math.sin(e);return this.set(n,0,r,0,0,1,0,0,-r,0,n,0,0,0,0,1)}makeRotationZ(e){const n=Math.cos(e),r=Math.sin(e);return this.set(n,-r,0,0,r,n,0,0,0,0,1,0,0,0,0,1)}makeRotationFromQuaternion(e){return this.compose(bM,e,vM)}makeScale(e,n,r){return this.set(e,0,0,0,0,n,0,0,0,0,r,0,0,0,0,1)}makePerspective(e,n,r,s,i,o){const a=this.elements,l=2*i/(n-e),c=2*i/(r-s),u=(n+e)/(n-e),d=(r+s)/(r-s),h=-(o+i)/(o-i),f=-2*o*i/(o-i);return a[0]=l,a[4]=0,a[8]=u,a[12]=0,a[1]=0,a[5]=c,a[9]=d,a[13]=0,a[2]=0,a[6]=0,a[10]=h,a[14]=f,a[3]=0,a[7]=0,a[11]=-1,a[15]=0,this}makeOrthographic(e,n,r,s,i,o){const a=this.elements,l=1/(n-e),c=1/(r-s),u=1/(o-i),d=(n+e)*l,h=(r+s)*c,f=(o+i)*u;return a[0]=2*l,a[4]=0,a[8]=0,a[12]=-d,a[1]=0,a[5]=2*c,a[9]=0,a[13]=-h,a[2]=0,a[6]=0,a[10]=-2*u,a[14]=-f,a[3]=0,a[7]=0,a[11]=0,a[15]=1,this}lookAt(e,n,r){const s=this.elements;return Tn.subVectors(e,n),Tn.lengthSq()===0&&(Tn.z=1),Tn.normalize(),rs.crossVectors(r,Tn),rs.lengthSq()===0&&(Math.abs(r.z)===1?Tn.x+=1e-4:Tn.z+=1e-4,Tn.normalize(),rs.crossVectors(r,Tn)),rs.normalize(),ha.crossVectors(Tn,rs),s[0]=rs.x,s[4]=ha.x,s[8]=Tn.x,s[1]=rs.y,s[5]=ha.y,s[9]=Tn.y,s[2]=rs.z,s[6]=ha.z,s[10]=Tn.z,this}compose(e,n,r){const s=this.elements,i=n.x,o=n.y,a=n.z,l=n.w,c=i+i,u=o+o,d=a+a,h=i*c,f=i*u,m=i*d,p=o*u,y=o*d,g=a*d,b=l*c,v=l*u,x=l*d,k=r.x,C=r.y,E=r.z;return s[0]=(1-(p+g))*k,s[1]=(f+x)*k,s[2]=(m-v)*k,s[3]=0,s[4]=(f-x)*C,s[5]=(1-(h+g))*C,s[6]=(y+b)*C,s[7]=0,s[8]=(m+v)*E,s[9]=(y-b)*E,s[10]=(1-(h+p))*E,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,n,r){const s=this.elements;let i=li.set(s[0],s[1],s[2]).length();const o=li.set(s[4],s[5],s[6]).length(),a=li.set(s[8],s[9],s[10]).length();this.determinant()<0&&(i=-i),e.x=s[12],e.y=s[13],e.z=s[14],nr.copy(this);const l=1/i,c=1/o,u=1/a;return nr.elements[0]*=l,nr.elements[1]*=l,nr.elements[2]*=l,nr.elements[4]*=c,nr.elements[5]*=c,nr.elements[6]*=c,nr.elements[8]*=u,nr.elements[9]*=u,nr.elements[10]*=u,n.setFromRotationMatrix(nr),r.x=i,r.y=o,r.z=a,this}equals(e){const n=this.elements,r=e.elements;for(let s=0;s<16;s++)if(n[s]!==r[s])return!1;return!0}fromArray(e,n=0){for(let r=0;r<16;r++)this.elements[r]=e[n+r];return this}toArray(e=[],n=0){for(let r=0;r<16;r++)e[n+r]=this.elements[r];return e}};const bM=new gt(0,0,0),vM=new gt(1,1,1),rs=new gt,ha=new gt,Tn=new gt,li=new gt,nr=new cr;let No=class q0{x;y;z;w;constructor(e=0,n=0,r=0,s=1){this.x=e,this.y=n,this.z=r,this.w=s}set(e,n,r,s){return this.x=e,this.y=n,this.z=r,this.w=s,this}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w,this}clone(){return new q0(this.x,this.y,this.z,this.w)}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,n){const r=e.x,s=e.y,i=e.z,o=e.w,a=n.x,l=n.y,c=n.z,u=n.w;return this.x=r*u+o*a+s*c-i*l,this.y=s*u+o*l+i*a-r*c,this.z=i*u+o*c+r*l-s*a,this.w=o*u-r*a-s*l-i*c,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.lengthSq())}normalize(){let e=this.length();return e===0?(this.x=0,this.y=0,this.z=0,this.w=1):(e=1/e,this.x*=e,this.y*=e,this.z*=e,this.w*=e),this}conjugate(){return this.x*=-1,this.y*=-1,this.z*=-1,this}invert(){return this.conjugate().normalize()}setFromEuler(e){const n=e.x,r=e.y,s=e.z,i=e.order,o=Math.cos(n/2),a=Math.cos(r/2),l=Math.cos(s/2),c=Math.sin(n/2),u=Math.sin(r/2),d=Math.sin(s/2);switch(i){case"XYZ":this.x=c*a*l+o*u*d,this.y=o*u*l-c*a*d,this.z=o*a*d+c*u*l,this.w=o*a*l-c*u*d;break;case"YXZ":this.x=c*a*l+o*u*d,this.y=o*u*l-c*a*d,this.z=o*a*d-c*u*l,this.w=o*a*l+c*u*d;break;case"ZXY":this.x=c*a*l-o*u*d,this.y=o*u*l+c*a*d,this.z=o*a*d+c*u*l,this.w=o*a*l-c*u*d;break;case"ZYX":this.x=c*a*l-o*u*d,this.y=o*u*l+c*a*d,this.z=o*a*d-c*u*l,this.w=o*a*l+c*u*d;break;case"YZX":this.x=c*a*l+o*u*d,this.y=o*u*l+c*a*d,this.z=o*a*d-c*u*l,this.w=o*a*l-c*u*d;break;case"XZY":this.x=c*a*l-o*u*d,this.y=o*u*l-c*a*d,this.z=o*a*d+c*u*l,this.w=o*a*l+c*u*d;break;default:throw new Error(`unsupported euler order: ${i}`)}return this}setFromAxisAngle(e,n){const r=n/2,s=Math.sin(r);return this.x=e.x*s,this.y=e.y*s,this.z=e.z*s,this.w=Math.cos(r),this}setFromRotationMatrix(e){const n=e.elements,r=n[0],s=n[4],i=n[8],o=n[1],a=n[5],l=n[9],c=n[2],u=n[6],d=n[10],h=r+a+d;if(h>0){const f=.5/Math.sqrt(h+1);this.w=.25/f,this.x=(u-l)*f,this.y=(i-c)*f,this.z=(o-s)*f}else if(r>a&&r>d){const f=2*Math.sqrt(1+r-a-d);this.w=(u-l)/f,this.x=.25*f,this.y=(s+o)/f,this.z=(i+c)/f}else if(a>d){const f=2*Math.sqrt(1+a-r-d);this.w=(i-c)/f,this.x=(s+o)/f,this.y=.25*f,this.z=(l+u)/f}else{const f=2*Math.sqrt(1+d-r-a);this.w=(o-s)/f,this.x=(i+c)/f,this.y=(l+u)/f,this.z=.25*f}return this}slerp(e,n){if(n===0)return this;if(n===1)return this.copy(e);const r=this.x,s=this.y,i=this.z,o=this.w;let a=o*e.w+r*e.x+s*e.y+i*e.z;if(a<0?(this.w=-e.w,this.x=-e.x,this.y=-e.y,this.z=-e.z,a=-a):this.copy(e),a>=1)return this.w=o,this.x=r,this.y=s,this.z=i,this;const l=1-a*a;if(l<=Number.EPSILON){const f=1-n;return this.w=f*o+n*this.w,this.x=f*r+n*this.x,this.y=f*s+n*this.y,this.z=f*i+n*this.z,this.normalize()}const c=Math.sqrt(l),u=Math.atan2(c,a),d=Math.sin((1-n)*u)/c,h=Math.sin(n*u)/c;return this.w=o*d+this.w*h,this.x=r*d+this.x*h,this.y=s*d+this.y*h,this.z=i*d+this.z*h,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this.w=e[n+3],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.w,e}},wM=class Z0{_x;_y;_z;_onChangeCallback=null;order;constructor(e=0,n=0,r=0,s="XYZ"){this._x=e,this._y=n,this._z=r,this.order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback?.()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback?.()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback?.()}_onChange(e){this._onChangeCallback=e}setXYZ(e,n,r){return this._x=e,this._y=n,this._z=r,this._onChangeCallback?.(),this}set(e,n,r,s=this.order){return this._x=e,this._y=n,this._z=r,this.order=s,this._onChangeCallback?.(),this}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this.order=e.order,this._onChangeCallback?.(),this}clone(){return new Z0(this.x,this.y,this.z,this.order)}setFromRotationMatrix(e,n=this.order){const r=e.elements,s=r[0],i=r[4],o=r[8],a=r[1],l=r[5],c=r[9],u=r[2],d=r[6],h=r[10];switch(n){case"XYZ":this.y=Math.asin(Math.min(1,Math.max(-1,o))),Math.abs(o)<.9999999?(this.x=Math.atan2(-c,h),this.z=Math.atan2(-i,s)):(this.x=Math.atan2(d,l),this.z=0);break;case"YXZ":this.x=Math.asin(-Math.min(1,Math.max(-1,c))),Math.abs(c)<.9999999?(this.y=Math.atan2(o,h),this.z=Math.atan2(a,l)):(this.y=Math.atan2(-u,s),this.z=0);break;case"ZXY":this.x=Math.asin(Math.min(1,Math.max(-1,d))),Math.abs(d)<.9999999?(this.y=Math.atan2(-u,h),this.z=Math.atan2(-i,l)):(this.y=0,this.z=Math.atan2(a,s));break;case"ZYX":this.y=Math.asin(-Math.min(1,Math.max(-1,u))),Math.abs(u)<.9999999?(this.x=Math.atan2(d,h),this.z=Math.atan2(a,s)):(this.x=0,this.z=Math.atan2(-i,l));break;case"YZX":this.z=Math.asin(Math.min(1,Math.max(-1,a))),Math.abs(a)<.9999999?(this.x=Math.atan2(-c,l),this.y=Math.atan2(-u,s)):(this.x=0,this.y=Math.atan2(o,h));break;case"XZY":this.z=Math.asin(-Math.min(1,Math.max(-1,i))),Math.abs(i)<.9999999?(this.x=Math.atan2(d,l),this.y=Math.atan2(o,s)):(this.x=Math.atan2(-c,h),this.y=0);break;default:throw new Error(`unsupported euler order: ${n}`)}return this.order=n,this._onChangeCallback?.(),this}setFromQuaternion(e,n=this.order){return kp.makeRotationFromQuaternion(e),this.setFromRotationMatrix(kp,n)}reorder(e){return Sp.setFromEuler(this),this.setFromQuaternion(Sp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e.order===this.order}fromArray(e){return this.x=e[0],this.y=e[1],this.z=e[2],e[3]!==void 0&&(this.order=e[3]),this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.order,e}};const kp=new cr,Sp=new No;class tn{r;g;b;constructor(e=1,n=1,r=1){this.r=e,this.g=n,this.b=r}set(e,n,r){return this.r=e,this.g=n,this.b=r,this}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}clone(){return new tn(this.r,this.g,this.b)}setRGB(e,n,r){return this.r=e,this.g=n,this.b=r,this}setHex(e){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,this}getHex(){return Math.round(this.r*255)<<16|Math.round(this.g*255)<<8|Math.round(this.b*255)}setStyle(e){if(/^#([0-9a-fA-F]{6})$/.test(e))return this.setHex(parseInt(e.slice(1),16));if(/^#([0-9a-fA-F]{3})$/.test(e)){const n=e.slice(1);return this.setHex(parseInt(n[0]+n[0]+n[1]+n[1]+n[2]+n[2],16))}if(/^(rgb|rgba)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.test(e)){const n=/^rgb\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(e);return this.setRGB(+n[1]/255,+n[2]/255,+n[3]/255)}throw new Error(`unsupported color style: ${e}`)}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}lerp(e,n){return this.r+=(e.r-this.r)*n,this.g+=(e.g-this.g)*n,this.b+=(e.b-this.b)*n,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}toArray(e=[],n=0){return e[n]=this.r,e[n+1]=this.g,e[n+2]=this.b,e}}class fh{listeners=new Map;addEventListener(e,n){const r=this.listeners.get(e);r?r.includes(n)||r.push(n):this.listeners.set(e,[n])}hasEventListener(e,n){return this.listeners.get(e)?.includes(n)??!1}removeEventListener(e,n){const r=this.listeners.get(e);if(!r)return;const s=r.indexOf(n);s!==-1&&r.splice(s,1)}dispatchEvent(e){const n=this.listeners.get(e.type);if(n){e.target=this;for(const r of[...n])r(e);e.target=null}}}let Vi=class extends fh{isObject3D=!0;isCamera=!1;isLight=!1;isMesh=!1;name="";parent=null;children=[];visible=!0;position=new gt;quaternion=new No;rotation=new wM;scale=new gt(1,1,1);up=new gt(0,1,0);matrix=new cr;matrixWorld=new cr;matrixAutoUpdate=!0;matrixWorldNeedsUpdate=!0;constructor(){super(),this.rotation._onChange(()=>{this.quaternion.setFromEuler(this.rotation)})}onBeforeRender;add(...e){for(const n of e){if(n===this)throw new Error("[RMSL/scene] an object cannot be added to itself");n.parent!==null&&n.parent.remove(n),n.parent=this,this.children.push(n),n.dispatchEvent({type:"added",object:n})}return this}remove(...e){for(const n of e){const r=this.children.indexOf(n);r!==-1&&(n.parent=null,this.children.splice(r,1),n.dispatchEvent({type:"removed",object:n}))}return this}clear(){for(const e of this.children)e.parent=null,e.dispatchEvent({type:"removed",child:e});return this.children.length=0,this}getObjectByName(e){if(this.name===e)return this;for(const n of this.children){const r=n.getObjectByName(e);if(r!==void 0)return r}}traverse(e){e(this);for(const n of this.children)n.traverse(e)}traverseVisible(e){if(this.visible){e(this);for(const n of this.children)n.traverseVisible(e)}}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e=!1){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);for(const n of this.children)n.updateMatrixWorld(e)}updateWorldMatrix(e,n){const r=this.parent;if(e&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,n)for(const s of this.children)s.updateWorldMatrix(!1,!0)}applyMatrix4(e){return this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this}getWorldPosition(e=new gt){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e=new No){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(qi,e,xM),e}getWorldScale(e=new gt){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(qi,_M,e),e}getWorldDirection(e=new gt){this.updateWorldMatrix(!0,!1);const n=this.matrixWorld.elements;return e.set(-n[8],-n[9],-n[10]).normalize()}lookAt(e,n,r){e instanceof gt?fa.copy(e):fa.set(e,n,r),this.updateWorldMatrix(!0,!1),qi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Zi.lookAt(qi,fa,this.up):Zi.lookAt(fa,qi,this.up),this.quaternion.setFromRotationMatrix(Zi);const s=this.parent;return s!==null&&(Ep.extractRotation(s.matrixWorld),Zi.premultiply(Ep.invert()),this.quaternion.setFromRotationMatrix(Zi)),this}};const qi=new gt,fa=new gt,_M=new No,xM=new gt,Zi=new cr,Ep=new cr;let ph=class extends Vi{isLight=!0;color;intensity;constructor(e=16777215,n=1){super(),this.color=new tn,typeof e=="number"?this.color.setHex(e):this.color.copy(e),this.intensity=n}},mh=class extends ph{isAmbientLight=!0;constructor(e,n){super(e,n)}},gh=class extends ph{isDirectionalLight=!0;target=new Vi;constructor(e,n){super(e,n)}};class K0 extends ph{isPointLight=!0;distance;decay;constructor(e,n,r=0,s=2){super(e,n),this.distance=r,this.decay=s}}const kM=1023,SM=36244,EM=1009,AM=1e3,qc=1001,TM=1002,CM=1003,Ap=1006,MM=1004,RM=1005;function PM(t,e){return t.precision??e}function IM(t,e){switch(t){case"projectionMatrix":return e.projectionMatrix.elements;case"viewMatrix":return e.matrixWorldInverse.elements;case"cameraPosition":return e.getWorldPosition().toArray();default:return[]}}function OM(t,e){switch(t){case"modelMatrix":return e.matrixWorld.elements;case"normalMatrix":return LM.getNormalMatrix(e.matrixWorld).toArray();default:return[]}}function zM(t,e,n){const r=e.attributes[n];if(r)return r;if(n==="instanceMatrix")return t.instanceMatrix;if(n==="instanceColor")return t.instanceColor??void 0}const LM=new yM;function $M(t,e,n){return t==="resolution"?[e,n]:[]}function DM(t){let e="";return t.traverseVisible(n=>{n instanceof mh?e+="a":n instanceof gh?e+="d":n instanceof K0&&(e+="p")}),e}function NM(t,e,n){return`${t}|${e?"i":""}${n?"c":""}`}function FM(t,e){const n=!J0(e);return{magFilter:n?Tp(t.magFilter):"nearest",minFilter:n?Tp(t.minFilter):"nearest",wrapS:Zc(t.wrapS),wrapT:Zc(t.wrapT),wrapR:Zc(t.wrapR)}}function BM(t){return t.format===SM?1:4}function Tp(t){switch(t){case CM:case MM:case RM:return"nearest";default:return"linear"}}function Zc(t){switch(t){case AM:return"repeat";case TM:return"mirror";default:return"clamp"}}function J0(t){return t.startsWith("isampler")||t.startsWith("usampler")}function Kc(t,e=!1){if(ArrayBuffer.isView(t))return t;if(e){let n=-1/0;for(let r=0;r<t.length;r++)t[r]>n&&(n=t[r]);return n>65535?new Uint32Array(t):new Uint16Array(t)}return new Float32Array(t)}const Q0={float32:{count:1,bytes:4,normalized:!1,gl:"FLOAT"},float32x2:{count:2,bytes:4,normalized:!1,gl:"FLOAT"},float32x3:{count:3,bytes:4,normalized:!1,gl:"FLOAT"},float32x4:{count:4,bytes:4,normalized:!1,gl:"FLOAT"},float16x2:{count:2,bytes:2,normalized:!1,gl:"HALF_FLOAT"},float16x4:{count:4,bytes:2,normalized:!1,gl:"HALF_FLOAT"},snorm8x4:{count:4,bytes:1,normalized:!0,gl:"BYTE"},unorm8x4:{count:4,bytes:1,normalized:!0,gl:"UNSIGNED_BYTE"},snorm16x2:{count:2,bytes:2,normalized:!0,gl:"SHORT"},snorm16x4:{count:4,bytes:2,normalized:!0,gl:"SHORT"},unorm16x2:{count:2,bytes:2,normalized:!0,gl:"UNSIGNED_SHORT"},unorm16x4:{count:4,bytes:2,normalized:!0,gl:"UNSIGNED_SHORT"}};function UM(t,e){if(!ArrayBuffer.isView(t)||t instanceof Float32Array)return"float32";if(typeof Float16Array<"u"&&t instanceof Float16Array)return"float16";if(e){if(t instanceof Int8Array)return"snorm8";if(t instanceof Uint8Array)return"unorm8";if(t instanceof Int16Array)return"snorm16";if(t instanceof Uint16Array)return"unorm16"}}function HM(t,e=t.itemSize){if(t.format!==void 0)return t.format;const n=UM(t.array,t.normalized);if(n===void 0)throw new Error(`rmsl: a ${Cp(t.array)} attribute has no vertex format. An integer array reaches a float attribute only when it is scaled on the way in: set \`normalized: true\`, or set \`format\` to say what its bytes hold.`);const r=n==="float32"&&e===1?"float32":`${n}x${e}`;if(!(r in Q0))throw new Error(`rmsl: no vertex format "${r}" for a ${Cp(t.array)} attribute of ${e} component${e===1?"":"s"}. A buffer carrying one attribute must have a stride that is a multiple of four, so a narrow attribute packs into the spare lanes of a four-component one rather than taking a buffer of its own.`);return r}function Cp(t){return ArrayBuffer.isView(t)?t.constructor.name:"number[]"}class Bi{_t;type;params;value;constructor(e){this._t=e._t,this.type=e.type,this.params=e.params,this.value=e.value}add(e){return ze("add",this,e)}sub(e){return ze("sub",this,e)}mul(e){let n=Or[this._t],r=e?._t;if(n!==void 0&&typeof r=="string"&&r.startsWith("vec")){let s=Ft[r],i=n[0],o=n[1];if(s===i)return le({_t:`vec${o}`,type:"matVecMul",params:[this,We(e)]});if(s===i-1)return le({_t:`vec${Math.min(o,s)}`,type:"matVecMul",params:[this,We(e)]});throw new Error(`[RMSL] A ${this._t} cannot multiply a ${r}: the vector must have the matrix's column width or one fewer component (a position with its homogeneous coordinate implied).`)}return ze("mul",this,e)}div(e){return ze("div",this,e)}negate(){return ze("negate",this)}sin(){return Ze("sin",this)}cos(){return Ze("cos",this)}tan(){return Ze("tan",this)}asin(){return Ze("asin",this)}acos(){return Ze("acos",this)}atan(e){return e===void 0?Ze("atan",this):ze("atan2",this,e)}sinh(){return Ze("sinh",this)}cosh(){return Ze("cosh",this)}tanh(){return Ze("tanh",this)}asinh(){return Ze("asinh",this)}acosh(){return Ze("acosh",this)}atanh(){return Ze("atanh",this)}abs(){return Ze("abs",this)}sign(){return Ze("sign",this)}floor(){return Ze("floor",this)}ceil(){return Ze("ceil",this)}fract(){return Ze("fract",this)}round(){return Ze("round",this)}trunc(){return Ze("trunc",this)}radians(){return ze("mul",this,.017453292519943295)}degrees(){return ze("mul",this,57.29577951308232)}sqrt(){return Ze("sqrt",this)}inverseSqrt(){return Ze("inverseSqrt",this)}inversesqrt(){return Ze("inverseSqrt",this)}exp(){return Ze("exp",this)}log(){return Ze("log",this)}exp2(){return Ze("exp2",this)}log2(){return Ze("log2",this)}cbrt(){return ze("mul",this.sign(),ze("pow",this.abs(),1/3))}reciprocal(){return ze("div",1,this)}oneMinus(){return ze("sub",1,this)}difference(e){return Ze("abs",ze("sub",this,e))}lengthSq(){return(Ft[this._t]??1)>1?ze("dot",this,this):ze("mul",this,this)}saturate(){return ze("clamp",this,0,1)}pow(e){return ze("pow",this,e)}pow2(){return ze("mul",this,this)}pow3(){return ze("mul",this,this,this)}pow4(){return ze("mul",this,this,this,this)}min(e){return ze("min",this,e)}max(e){return ze("max",this,e)}mod(e){return ze("mod",this,e)}dFdx(){return Ze("dFdx",this)}dFdy(){return Ze("dFdy",this)}lessThan(e){return ci("lessThan",this,e)}greaterThan(e){return ci("greaterThan",this,e)}lessThanEqual(e){return ci("lessThanEqual",this,e)}greaterThanEqual(e){return ci("greaterThanEqual",this,e)}equal(e){return ci("equal",this,e)}notEqual(e){return ci("notEqual",this,e)}dot(e){return ze("dot",this,e)}length(){return Ze("length",this)}normalize(){return Ze("normalize",this)}distance(e){return ze("distance",this,e)}reflect(e){return ze("reflect",this,e)}refract(e,n){return ze("refract",this,e,n)}faceForward(e,n){return ze("faceForward",this,e,n)}clamp(e,n){return ze("clamp",this,e,n)}mix(e,n){return ze("mix",this,e,n)}step(e){return ze("step",e,this)}smoothstep(e,n){return ze("smoothstep",e,n,this)}fwidth(){return Ze("fwidth",this)}cross(e){return ze("cross",this,e)}element(e){let n=typeof e=="number"?le({_t:"int",type:"int",value:e|0}):e,r=/^(vec|ivec|uvec|bvec)[234]$/.test(this._t);return ze(r?"vectorElement":"matrixElement",this,n)}inverse(){return Ze("inverse",this)}transpose(){return Ze("transpose",this)}determinant(){return Ze("determinant",this)}bitAnd(e){return ze("bitAnd",this,e)}bitOr(e){return ze("bitOr",this,e)}bitXor(e){return ze("bitXor",this,e)}shiftLeft(e){return ze("shiftLeft",this,e)}shiftRight(e){return ze("shiftRight",this,e)}bitNot(){return le({_t:this._t,type:"bitNot",params:[this]})}texture(e){return le({_t:Mp(this._t),type:"texture",params:[this,We(e)]})}textureLod(e,n){return le({_t:Mp(this._t),type:"textureLod",params:[this,We(e),We(n)]})}and(e){return ze("and",this,e)}or(e){return ze("or",this,e)}not(){return Ze("not",this)}xor(e){return ze("and",ze("or",this,e),Ze("not",ze("and",this,e)))}all(){return le({_t:"bool",type:"all",params:[this]})}any(){return le({_t:"bool",type:"any",params:[this]})}assign(e){Ui("assign",n=>{n.push(new Bi({_t:"void",type:"assign",params:[this,e]}))})}toVar(e){let n;return Ui("toVar",r=>{let s=YM(e);n=jM(s,this._t),r.push(new Bi({_t:"void",type:"let",params:[n,this]}))}),n}var(e){return this.toVar(e)}addAssign(e){this.assign(this.add(e))}subAssign(e){this.assign(this.sub(e))}mulAssign(e){this.assign(this.mul(e))}divAssign(e){this.assign(this.div(e))}modAssign(e){this.assign(this.mod(e))}toFloat(){return le({_t:"float",type:"construct",params:[this]})}toInt(){return le({_t:"int",type:"construct",params:[this]})}toUint(){return le({_t:"uint",type:"construct",params:[this]})}toBool(){return le({_t:"bool",type:"construct",params:[this]})}toVec2(){return le({_t:"vec2",type:"construct",params:[this]})}toVec3(){return le({_t:"vec3",type:"construct",params:[this]})}toVec4(){return le({_t:"vec4",type:"construct",params:[this]})}toIVec2(){return le({_t:"ivec2",type:"construct",params:[this]})}toIVec3(){return le({_t:"ivec3",type:"construct",params:[this]})}toIVec4(){return le({_t:"ivec4",type:"construct",params:[this]})}toUVec2(){return le({_t:"uvec2",type:"construct",params:[this]})}toUVec3(){return le({_t:"uvec3",type:"construct",params:[this]})}toUVec4(){return le({_t:"uvec4",type:"construct",params:[this]})}toBVec2(){return le({_t:"bvec2",type:"construct",params:[this]})}toBVec3(){return le({_t:"bvec3",type:"construct",params:[this]})}toBVec4(){return le({_t:"bvec4",type:"construct",params:[this]})}toMat2(){return le({_t:"mat2",type:"construct",params:[this]})}toMat3(){return le({_t:"mat3",type:"construct",params:[this]})}toMat4(){return le({_t:"mat4",type:"construct",params:[this]})}convert(e){return le({_t:e,type:"construct",params:[this]})}select(e,n){let r=We(e),s=We(n),i=r?._t||s?._t||this._t;return le({_t:i,type:"select",params:[this,r,s]})}get x(){return Tt(this,"x")}get y(){return Tt(this,"y")}get z(){return Tt(this,"z")}get w(){return Tt(this,"w")}get r(){return Tt(this,"r")}get g(){return Tt(this,"g")}get b(){return Tt(this,"b")}get a(){return Tt(this,"a")}get xy(){return Tt(this,"xy")}get xz(){return Tt(this,"xz")}get xw(){return Tt(this,"xw")}get yz(){return Tt(this,"yz")}get yw(){return Tt(this,"yw")}get zw(){return Tt(this,"zw")}get xyz(){return Tt(this,"xyz")}get xyw(){return Tt(this,"xyw")}get xzw(){return Tt(this,"xzw")}get yzw(){return Tt(this,"yzw")}get rgba(){return Tt(this,"rgba")}get rgb(){return Tt(this,"rgb")}}for(const t of["s","t","p","q","st","sp","sq","tp","tq","pq","stp","stq","spq","tpq","stpq"])Object.defineProperty(Bi.prototype,t,{get(){return Tt(this,t)}});const eb=Bi;function le(t){let e=new eb({_t:t._t??t.type,...t});return t.name!==void 0&&(e.name=t.name),e}function jM(t,e){return new eb({_t:e,type:"var",value:{varName:t,varType:e}})}function dr(t){return typeof t=="object"&&t!==null&&"_t"in t&&"type"in t}function Mp(t){return t.startsWith("isampler")?"ivec4":t.startsWith("usampler")?"uvec4":"vec4"}function We(t){return t==null?le({_t:"void",type:"void"}):typeof t=="boolean"?le({_t:"bool",type:"bool",value:t}):typeof t=="number"?le({_t:"float",type:"float",value:t}):Array.isArray(t)?t.length===3?le({_t:"vec3",type:"vec3",value:t}):t.length===4?le({_t:"vec4",type:"vec4",value:t}):t.length===2?le({_t:"vec2",type:"vec2",value:t}):t.length===9?le({_t:"mat3",type:"mat3",value:t}):t.length===16?le({_t:"mat4",type:"mat4",value:t}):le({_t:"float",type:"float",value:t[0]}):t}const WM={dot:"float",length:"float",distance:"float",determinant:"float",transpose:t=>{let e=Or[t];if(e===void 0)return t;let[n,r]=e;return n===r?t:`mat${r}x${n}`},matrixElement:t=>{let e=Or[t];return e===void 0?"float":`vec${e[1]}`},vectorElement:t=>t.startsWith("ivec")?"int":t.startsWith("uvec")?"uint":"float"};function tb(t,e){let n=WM[t];return n===void 0?e:typeof n=="function"?n(e):n}const Ft={float:1,int:1,uint:1,bool:1,vec2:2,vec3:3,vec4:4,ivec2:2,ivec3:3,ivec4:4,uvec2:2,uvec3:3,uvec4:4,bvec2:2,bvec3:3,bvec4:4},VM={step:1,smoothstep:2},GM=new Set(["step","smoothstep","clamp","min","max","pow","mod"]);function nb(t,e){let n=/^ivec/.test(e)?"int":/^uvec/.test(e)?"uint":e;if(typeof t!="number"||!(n==="int"||n==="uint"))return We(t);if(!Number.isInteger(t))throw new Error(`[RMSL] ${t} is not a whole number, but the operand beside it is an ${e}. Convert the operand to a float, or use a whole number.`);if(n==="uint"&&t<0)throw new Error(`[RMSL] ${t} is negative, but the operand beside it is unsigned. Use a signed operand, or a literal that is not negative.`);return le({_t:n,type:n,value:t})}function ze(t,...e){let n=We(e[0]),r=n?._t||"float",s=[n,...e.slice(1).map(c=>nb(c,r))],i=VM[t]??0,o=s[i]?._t??r,a=c=>Ft[c?._t]??(Or[c?._t]?16:1),l=s[0];for(const c of s)a(c)>a(l)&&(l=c);return o=l?._t??o,GM.has(t)&&(Ft[o]??1)>1&&(s=s.map(c=>(Ft[c?._t]??1)===1?le({_t:o,type:"construct",params:[c]}):c)),le({_t:tb(t,o),type:t,params:s})}function Ze(t,e){let n=We(e),r=n?._t||"float";return le({_t:tb(t,r),type:t,params:[n]})}function ci(t,e,n){let r=We(e),s=[r,nb(n,r?._t||"float")],i=s.map(a=>Ft[a?._t]??1),o=Math.max(i[0],i[1]);if(o>1){let a=s[i[0]>=i[1]?0:1]._t;s=s.map((l,c)=>i[c]===1?le({_t:a,type:"construct",params:[l]}):l)}return le({_t:o>1?`bvec${o}`:"bool",type:t,params:s})}function Tt(t,e){let n=t?._t||"float",r=/^ivec/.test(n)?"i":/^uvec/.test(n)?"u":"",s=e.length===1?r==="i"?"int":r==="u"?"uint":"float":r==="i"?`ivec${e.length}`:r==="u"?`uvec${e.length}`:`vec${e.length}`;return le({_t:s,type:"swizzle",params:[t],value:e})}let Yn,Rp=0,po=new Set;const Pp="_rmsl_";function YM(t){if(t!==void 0){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(t))throw new Error(`toVar("${t}") must be a valid identifier (letters, digits and underscore, not starting with a digit).`);if(t.startsWith(Pp))throw new Error(`toVar("${t}") uses the reserved "${Pp}" prefix, which the compiler keeps for its own names.`);let n=t;for(let r=1;po.has(n);r++)n=`${t}${r}`;return po.add(n),n}let e=`_rmsl_${Rp++}`;for(;po.has(e);)e=`_rmsl_${Rp++}`;return po.add(e),e}function Ui(t,e){if(Yn===void 0)throw new Error(`${t} must be called inside an Fn(() => { ... }) scope.`);e(Yn)}function Ip(t){return((...e)=>{let n=Yn;n===void 0&&po.clear();try{let r=[];Yn=r;let s=t(...e);if(Array.isArray(s))return s.map((a,l)=>{let c=We(s[l]);return le({_t:c._t||"void",type:"seq",params:[...r,c]})});let i=We(s),o=i._t||"void";return le({_t:o,type:"seq",params:[...r,i]})}finally{Yn=n}})}function Eo(t){let e=Yn;Yn=[];try{return t(),le({_t:"void",type:"seq",params:[...Yn]})}finally{Yn=e}}function V(t){return dr(t)?le({_t:"float",type:"construct",params:[t]}):le({_t:"float",type:"float",value:t})}function Vt(t,e){if(t===void 0)return le({_t:"vec2",type:"construct",params:[We(0)]});if(dr(t)){let n=[t];return e!==void 0&&n.push(We(e)),le({_t:"vec2",type:"construct",params:n})}return le(e===void 0?{_t:"vec2",type:"construct",params:[We(t)]}:typeof e=="number"?{_t:"vec2",type:"vec2",value:[t,e]}:{_t:"vec2",type:"construct",params:[We(t),e]})}function Oe(t,e,n){if(t===void 0)return le({_t:"vec3",type:"construct",params:[We(0)]});if(dr(t)){let s=[t];return e!==void 0&&s.push(We(e)),n!==void 0&&s.push(We(n)),le({_t:"vec3",type:"construct",params:s})}if(e===void 0)return le({_t:"vec3",type:"construct",params:[We(t)]});if(typeof e=="number"&&(n===void 0||typeof n=="number")){let s=[t,e];return n!==void 0&&s.push(n),le({_t:"vec3",type:"vec3",value:s})}let r=[We(t)];return e!==void 0&&r.push(We(e)),n!==void 0&&r.push(We(n)),le({_t:"vec3",type:"construct",params:r})}function Ie(t,e,n,r){if(t===void 0)return le({_t:"vec4",type:"construct",params:[We(0)]});if(dr(t)){let i=[t];return e!==void 0&&i.push(We(e)),n!==void 0&&i.push(We(n)),r!==void 0&&i.push(We(r)),le({_t:"vec4",type:"construct",params:i})}if(e===void 0)return le({_t:"vec4",type:"construct",params:[We(t)]});if(typeof e=="number"&&(n===void 0||typeof n=="number")&&(r===void 0||typeof r=="number")){let i=[t,e];return n!==void 0&&i.push(n),r!==void 0&&i.push(r),le({_t:"vec4",type:"vec4",value:i})}let s=[We(t)];return e!==void 0&&s.push(We(e)),n!==void 0&&s.push(We(n)),r!==void 0&&s.push(We(r)),le({_t:"vec4",type:"construct",params:s})}function XM(t){return dr(t)?le({_t:"int",type:"construct",params:[t]}):le({_t:"int",type:"int",value:t|0})}function qM(t){return dr(t)?le({_t:"uint",type:"construct",params:[t]}):le({_t:"uint",type:"uint",value:t|0})}function ZM(t,e,n){return(...r)=>{if(r.length===0)return le({_t:t,type:"construct",params:[le({_t:n,type:n,value:0})]});if(r.length===1&&dr(r[0]))return le({_t:t,type:"construct",params:[r[0]]});if(r.length===1&&typeof r[0]=="number")return le({_t:t,type:"construct",params:[le({_t:n,type:n,value:r[0]|0})]});if(r.length<=e&&r.every(s=>typeof s=="number")){if(n==="uint"){for(let s of r)if(s<0)throw new Error(`[RMSL] ${s} is negative, but ${t} components are unsigned. Use a signed vector, or values that are not negative.`)}return le({_t:t,type:t,value:r.map(s=>s|0)})}return le({_t:t,type:"construct",params:r.map(s=>dr(s)?s:We(s))})}}const KM=ZM("ivec3",3,"int");function Op(t){return dr(t)?le({_t:"bool",type:"construct",params:[t]}):le({_t:"bool",type:"bool",value:t})}function yh(...t){return t.length===1&&dr(t[0])?le({_t:"mat3",type:"construct",params:[t[0]]}):t.length===3&&t.every(e=>dr(e))?le({_t:"mat3",type:"construct",params:t.map(e=>e)}):t.length===1&&typeof t[0]=="number"?le({_t:"mat3",type:"construct",params:[We(t[0])]}):t.length===0?le({_t:"mat3",type:"mat3",value:[1,0,0,0,1,0,0,0,1]}):le({_t:"mat3",type:"mat3",value:t})}function Js(t){return We(t)}function ja(t,e){return Js(t).mod(e)}function xl(t){return Js(t).sin()}function JM(t){return Js(t).cos()}function QM(t,e){return Js(t).pow(e)}function kr(t,e,n){return Js(t).mix(e,n)}function Xn(t,e,n){return Js(n).smoothstep(t,e)}function wi(t,e){return Js(t).element(e)}const zp=V(Math.PI);V(Math.PI*2);V(Math.PI*2);V(Math.PI*.5);V(1e-6);V(1e6);let eR=0,tR=0,nR=0;function Lp(t,e){let n=eR++;return le({_t:e,type:"uniform",value:{id:n,slot:t,shaderType:e},name:t})}function rR(t){let e=tR++;return le({_t:t,type:"attribute",value:{id:e,slot:`_rmsl_a${e}`,shaderType:t},name:`_rmsl_a${e}`})}function sR(t){let e=nR++;return le({_t:t,type:"varying",value:{id:e,slot:`_rmsl_v${e}`,shaderType:t},name:`_rmsl_v${e}`})}let iR=0;function oR(t){let e=iR++;return le({_t:t,type:"output",value:{id:e,slot:`_rmsl_o${e}`,shaderType:t,location:e}})}function aR(){return le({_t:"float",type:"builtinFragDepth"})}function wt(t,e){let n=le({_t:"void",type:"if",params:[We(t),Eo(e)]});Ui("If",i=>{i.push(n)});let r=n;const s={ElseIf:(i,o)=>{let a=le({_t:"void",type:"if",params:[We(i),Eo(o)]});return r.params[2]=a,r=a,s},Else:i=>{r.params[2]=Eo(i)}};return s}function lR(t,e,n,r){Ui("For",s=>{let i=Yn,o=[];Yn=o;let a;try{a=t()}finally{Yn=i}let l=le({_t:"void",type:"seq",params:[...o]}),c=We(e(a)),u=Eo(()=>n(a)),d=Eo(()=>r(a));s.push(le({_t:"void",type:"for",params:[l,c,u,d]}))})}function pa(){Ui("Discard",t=>{t.push(le({_t:"void",type:"discard"}))})}function $p(){Ui("Break",t=>{t.push(le({_t:"void",type:"break"}))})}const xs={select:5,or:10,and:20,bitOr:30,bitXor:40,bitAnd:50,equal:60,notEqual:60,lessThan:60,greaterThan:60,lessThanEqual:60,greaterThanEqual:60,shiftLeft:70,shiftRight:70,add:80,sub:80,mul:90,div:90,mod:90},jn=100,et=200;function St(t,e,n){return(t??et)<=e?`(${n})`:n}let cR={float:"float",vec2:"vec2",vec3:"vec3",vec4:"vec4",int:"int",uint:"uint",bool:"bool",ivec2:"ivec2",ivec3:"ivec3",ivec4:"ivec4",uvec2:"uvec2",uvec3:"uvec3",uvec4:"uvec4",bvec2:"bvec2",bvec3:"bvec3",bvec4:"bvec4",mat2:"mat2",mat2x3:"mat2x3",mat2x4:"mat2x4",mat3x2:"mat3x2",mat3:"mat3",mat3x4:"mat3x4",mat4x2:"mat4x2",mat4x3:"mat4x3",mat4:"mat4",sampler2D:"sampler2D",sampler3D:"sampler3D",samplerCube:"samplerCube",isampler2D:"isampler2D",isampler3D:"isampler3D",isamplerCube:"isamplerCube",usampler2D:"usampler2D",usampler3D:"usampler3D",usamplerCube:"usamplerCube",void:"void"};function Rs(t){return cR[t]??"float"}function Dp(t){return(t.type==="float"||t.type==="int"||t.type==="uint"||t.type==="bool")&&!t.params}function rb(t){if(t.type==="select"){let i=t.params?.[0];if(i&&Dp(i))return(i.value?t.params[1]:t.params[2])??null}let e=t.params??[];if(!e.every(Dp))return null;let n=e[0]?.value,r=e[1]?.value,s=t._t;if(s==="float"||s==="int"||s==="uint"){let i=n,o=r;switch(t.type){case"add":return Ke({_t:s,type:s,value:s==="int"||s==="uint"?i+o|0:i+o});case"sub":return Ke({_t:s,type:s,value:s==="int"||s==="uint"?i-o|0:i-o});case"mul":return Ke({_t:s,type:s,value:s==="int"||s==="uint"?i*o|0:i*o});case"div":return Ke({_t:s,type:s,value:s==="int"||s==="uint"?i/o|0:i/o});case"negate":return Ke({_t:s,type:s,value:s==="int"||s==="uint"?-i|0:-i});case"mod":return Ke({_t:s,type:s,value:s==="int"||s==="uint"?i%o|0:i-o*Math.floor(i/o)});case"sin":return Ke({_t:s,type:s,value:Math.sin(i)});case"cos":return Ke({_t:s,type:s,value:Math.cos(i)});case"tan":return Ke({_t:s,type:s,value:Math.tan(i)});case"asin":return Ke({_t:s,type:s,value:Math.asin(i)});case"acos":return Ke({_t:s,type:s,value:Math.acos(i)});case"atan":return Ke({_t:s,type:s,value:Math.atan(i)});case"sinh":return Ke({_t:s,type:s,value:Math.sinh(i)});case"cosh":return Ke({_t:s,type:s,value:Math.cosh(i)});case"tanh":return Ke({_t:s,type:s,value:Math.tanh(i)});case"asinh":return Ke({_t:s,type:s,value:Math.asinh(i)});case"acosh":return Ke({_t:s,type:s,value:Math.acosh(i)});case"atanh":return Ke({_t:s,type:s,value:Math.atanh(i)});case"abs":return Ke({_t:s,type:s,value:Math.abs(i)});case"sign":return Ke({_t:s,type:s,value:Math.sign(i)});case"floor":return Ke({_t:s,type:s,value:Math.floor(i)});case"ceil":return Ke({_t:s,type:s,value:Math.ceil(i)});case"round":return Ke({_t:s,type:s,value:Math.round(i)});case"trunc":return Ke({_t:s,type:s,value:Math.trunc(i)});case"fract":return Ke({_t:s,type:s,value:i-Math.floor(i)});case"sqrt":return Ke({_t:s,type:s,value:Math.sqrt(i)});case"inverseSqrt":return Ke({_t:s,type:s,value:1/Math.sqrt(i)});case"atan2":return Ke({_t:s,type:s,value:Math.atan2(i,o)});case"exp":return Ke({_t:s,type:s,value:Math.exp(i)});case"log":return Ke({_t:s,type:s,value:Math.log(i)});case"exp2":return Ke({_t:s,type:s,value:Math.pow(2,i)});case"log2":return Ke({_t:s,type:s,value:Math.log2(i)});case"pow":return Ke({_t:s,type:s,value:Math.pow(i,o)});case"min":return Ke({_t:s,type:s,value:Math.min(i,o)});case"max":return Ke({_t:s,type:s,value:Math.max(i,o)});case"dot":return Ke({_t:s,type:s,value:i*o})}}return null}function Ke(t){return new Bi({_t:t._t??t.type,type:t.type,params:t.params,value:t.value})}function sb(t){if(t.body.some(e=>e.includes("{")))throw new Error("[RMSL] A for-loop's update cannot contain a block. Move the branch into the loop body, or write the loop with While.");return t.body}function ib(t){return t.endsWith(";")?t.slice(0,-1):t}function ob(t,e,n){if(t==="vertex"&&!n&&e!=="vec4")throw new Error("[RMSL] A vertex shader has to produce a position. This one "+(e===void 0||e==="void"?"returns nothing and never assigns builtinPosition(). Return a vec4, or assign builtinPosition() yourself.":`returns ${e}, which cannot become one. Wrap it — for example vec4(value, 1.0).`))}const uR={x:0,y:1,z:2,w:3,r:0,g:1,b:2,a:3,s:0,t:1,p:2,q:3};function dR(t){let e=t.value,n=t.params[0];for(;n?.type==="swizzle";){let r=n.value;e=[...e].map(s=>r[uR[s]]).join(""),n=n.params[0]}return{base:n,pattern:e}}function ab(t){let e=Or[t];if(e===void 0||e[0]!==e[1])throw new Error(`[RMSL] inverse() needs a square matrix, but this one is ${t??"untyped"}.`);return e[0]}function lb(t){if(t.shaderStage!=="vertex")throw new Error("[RMSL] builtinPosition() is the vertex stage's output position, and a fragment stage cannot read it. Pass the value you need through a varying() instead.")}function Ce(t,e){if(t==null)return{decls:[],body:[],expr:"0.0"};if(typeof t=="boolean")return{decls:[],body:[],expr:t?"true":"false"};if(typeof t=="number")return{decls:[],body:[],expr:t.toString()};if(Array.isArray(t))return{decls:[],body:[],expr:`vec3(${t.join(", ")})`};let n=e.memo.get(t);if(n)return{decls:[],body:[],expr:n.expr,prec:n.prec};let r=hR(t,e);return e.memo.set(t,r),r}function hR(t,e){let n=rb(t);switch(n&&(t=n),t.type){case"float":{let r=String(t.value);return!r.includes(".")&&!r.includes("e")&&(r+=".0"),{decls:[],body:[],expr:r}}case"int":return{decls:[],body:[],expr:String(t.value)};case"uint":return{decls:[],body:[],expr:String(t.value)+"u"};case"bool":return{decls:[],body:[],expr:t.value?"true":"false"};case"vec2":return{decls:[],body:[],expr:`vec2(${t.value.join(", ")})`};case"vec3":return{decls:[],body:[],expr:`vec3(${t.value.join(", ")})`};case"vec4":return{decls:[],body:[],expr:`vec4(${t.value.join(", ")})`};case"ivec2":return{decls:[],body:[],expr:`ivec2(${t.value.join(", ")})`};case"ivec3":return{decls:[],body:[],expr:`ivec3(${t.value.join(", ")})`};case"ivec4":return{decls:[],body:[],expr:`ivec4(${t.value.join(", ")})`};case"uvec2":return{decls:[],body:[],expr:`uvec2(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec3":return{decls:[],body:[],expr:`uvec3(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec4":return{decls:[],body:[],expr:`uvec4(${t.value.map(r=>`${r}u`).join(", ")})`};case"bvec2":return{decls:[],body:[],expr:`bvec2(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec3":return{decls:[],body:[],expr:`bvec3(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec4":return{decls:[],body:[],expr:`bvec4(${t.value.map(r=>r?"true":"false").join(", ")})`};case"mat2":return{decls:[],body:[],expr:`mat2(${t.value.join(", ")})`};case"mat2x3":return{decls:[],body:[],expr:`mat2x3(${t.value.join(", ")})`};case"mat2x4":return{decls:[],body:[],expr:`mat2x4(${t.value.join(", ")})`};case"mat3x2":return{decls:[],body:[],expr:`mat3x2(${t.value.join(", ")})`};case"mat3":return{decls:[],body:[],expr:`mat3(${t.value.join(", ")})`};case"mat3x4":return{decls:[],body:[],expr:`mat3x4(${t.value.join(", ")})`};case"mat4x2":return{decls:[],body:[],expr:`mat4x2(${t.value.join(", ")})`};case"mat4x3":return{decls:[],body:[],expr:`mat4x3(${t.value.join(", ")})`};case"mat4":return{decls:[],body:[],expr:`mat4(${t.value.join(", ")})`};case"void":return{decls:[],body:[],expr:"0.0"};case"construct":{let r=(t.params??[]).map(o=>Ce(o,e)),s=Rs(t._t),i=r.map(o=>o.expr).join(", ");return{decls:r.flatMap(o=>o.decls),body:r.flatMap(o=>o.body),expr:`${s}(${i})`}}case"var":{let r=t.value,s=r?.varName;return s&&!e.varDefs.has(s)&&e.varDefs.set(s,r?.varType||"float"),{decls:[],body:[],expr:s}}case"uniform":{let r=t.value;return e.uniforms.has(r.id)||e.uniforms.set(r.id,{type:Rs(r.shaderType),slot:r.slot}),{decls:[],body:[],expr:r.slot}}case"uniformArray":{let r=t.value;return e.uniforms.has(r.id)||e.uniforms.set(r.id,{type:Rs(r.shaderType),slot:r.slot,length:r.length}),{decls:[],body:[],expr:r.slot}}case"uniformArrayElement":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=t.params[1]?._t,o=i==="int"||i==="uint"?s.expr:`int(${s.expr})`;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${r.expr}[${o}]`}}case"attribute":{let r=t.value;return e.attributes.has(r.id)||e.attributes.set(r.id,{type:Rs(r.shaderType),slot:r.slot}),{decls:[],body:[],expr:r.slot}}case"varying":{let r=t.value;return e.varyings.has(r.id)||e.varyings.set(r.id,{id:r.id,type:Rs(r.shaderType),slot:r.slot}),{decls:[],body:[],expr:r.slot}}case"output":{let r=t.value;return e.outputs.has(r.id)||e.outputs.set(r.id,{type:Rs(r.shaderType),slot:r.slot,location:r.location}),{decls:[],body:[],expr:r.slot}}case"builtinPosition":return lb(e),{decls:[],body:[],expr:"gl_Position"};case"builtinFragDepth":{if(e.shaderStage!=="fragment")throw new Error("builtinFragDepth() can only be used in fragment shaders");return{decls:[],body:[],expr:"gl_FragDepth"}}case"fragCoord":{if(e.shaderStage!=="fragment")throw new Error("fragCoord() can only be used in fragment shaders");return{decls:[],body:[],expr:"gl_FragCoord.xy"}}case"swizzle":{let r=Ce(t.params[0],e),s=t.value,i=(r.prec??et)<et?`(${r.expr})`:r.expr;return{decls:r.decls,body:r.body,expr:`${i}.${s}`,prec:et}}case"negate":{let r=Ce(t.params[0],e),s=St(r.prec,jn,r.expr);return{decls:r.decls,body:r.body,expr:`-${s}`,prec:jn}}case"not":{let r=Ce(t.params[0],e),s=t.params[0]?._t;if(s==="bvec2"||s==="bvec3"||s==="bvec4")return{decls:r.decls,body:r.body,expr:`not(${r.expr})`,prec:et};let i=St(r.prec,jn,r.expr);return{decls:r.decls,body:r.body,expr:`!${i}`,prec:jn}}case"all":{let r=Ce(t.params[0],e);return{decls:r.decls,body:r.body,expr:`all(${r.expr})`}}case"any":{let r=Ce(t.params[0],e);return{decls:r.decls,body:r.body,expr:`any(${r.expr})`}}case"add":return vt(t,e,"+");case"sub":return vt(t,e,"-");case"mul":return vt(t,e,"*");case"div":return vt(t,e,"/");case"atan2":return vt(t,e,"atan",!0);case"mod":{let r=t.params[0]?._t;return r==="int"||r==="uint"?vt(t,e,"%"):vt(t,e,"mod",!0)}case"pow":return vt(t,e,"pow",!0);case"min":return vt(t,e,"min",!0);case"max":return vt(t,e,"max",!0);case"dot":return vt(t,e,"dot",!0);case"cross":return vt(t,e,"cross",!0);case"distance":return vt(t,e,"distance",!0);case"reflect":return vt(t,e,"reflect",!0);case"refract":return Ki(t,e,"refract");case"mix":return Ki(t,e,"mix");case"step":return vt(t,e,"step",!0);case"smoothstep":return Ki(t,e,"smoothstep");case"clamp":return Ki(t,e,"clamp");case"select":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=Ce(t.params[2],e),o=t.params[0]?._t||"bool";if(o!=="bool"){let d=Ft[t.params[1]?._t]??3,h=s.expr,f=i.expr,m=r.expr,p=Ft[t.params[1]?._t]??1,y=Ft[t.params[2]?._t]??1,g=Math.max(p,y,d);p===1&&g>1&&(h=`vec${g}(${h})`),y===1&&g>1&&(f=`vec${g}(${f})`);let b=o.startsWith("bvec")||o.startsWith("vec")?`vec${g}(${m})`:m;return{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`mix(${f}, ${h}, ${b})`,prec:et}}let a=xs[t.type]??0,l=St(r.prec,a,r.expr),c=St(s.prec,a,s.expr),u=St(i.prec,a,i.expr);return{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`${l} ? ${c} : ${u}`,prec:a}}case"lessThan":return ui(t,e,"<","lessThan");case"greaterThan":return ui(t,e,">","greaterThan");case"lessThanEqual":return ui(t,e,"<=","lessThanEqual");case"greaterThanEqual":return ui(t,e,">=","greaterThanEqual");case"equal":return ui(t,e,"==","equal");case"notEqual":return ui(t,e,"!=","notEqual");case"and":return vt(t,e,"&&");case"or":return vt(t,e,"||");case"bitAnd":return vt(t,e,"&");case"bitOr":return vt(t,e,"|");case"bitXor":return vt(t,e,"^");case"shiftLeft":return vt(t,e,"<<");case"shiftRight":return vt(t,e,">>");case"matVecMul":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=t.params[0]?._t||"mat4",o=t.params[1]?._t||"vec3",a=xs.mul,l=St(r.prec,a,r.expr),c=St(s.prec,a,s.expr),u=Or[i],d=Ft[o]??0;if(u!==void 0&&d===u[0]-1){let h=`(${l} * vec${u[0]}(${c}, 1.0))`;return d<u[1]&&(h+=`.${"xyzw".slice(0,d)}`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:h,prec:et}}return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${l} * ${c}`,prec:a}}case"sin":return tt(t,e,"sin");case"cos":return tt(t,e,"cos");case"tan":return tt(t,e,"tan");case"asin":return tt(t,e,"asin");case"acos":return tt(t,e,"acos");case"atan":return tt(t,e,"atan");case"sinh":return tt(t,e,"sinh");case"cosh":return tt(t,e,"cosh");case"tanh":return tt(t,e,"tanh");case"asinh":return tt(t,e,"asinh");case"acosh":return tt(t,e,"acosh");case"atanh":return tt(t,e,"atanh");case"abs":return tt(t,e,"abs");case"sign":return tt(t,e,"sign");case"floor":return tt(t,e,"floor");case"ceil":return tt(t,e,"ceil");case"fract":return tt(t,e,"fract");case"round":return tt(t,e,"round");case"trunc":return tt(t,e,"trunc");case"sqrt":return tt(t,e,"sqrt");case"inverseSqrt":return tt(t,e,"inversesqrt");case"exp":return tt(t,e,"exp");case"log":return tt(t,e,"log");case"exp2":return tt(t,e,"exp2");case"log2":return tt(t,e,"log2");case"normalize":return tt(t,e,"normalize");case"length":return tt(t,e,"length");case"transpose":return tt(t,e,"transpose");case"inverse":return ab(t.params[0]?._t),tt(t,e,"inverse");case"determinant":return tt(t,e,"determinant");case"fwidth":return tt(t,e,"fwidth");case"dFdx":return tt(t,e,"dFdx");case"dFdy":return tt(t,e,"dFdy");case"faceForward":return Ki(t,e,"faceforward");case"bitNot":{let r=Ce(t.params[0],e),s=St(r.prec,jn,r.expr);return{decls:r.decls,body:r.body,expr:`~${s}`,prec:jn}}case"matrixElement":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`int(${i})`);let o=(r.prec??et)<et?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:et}}case"vectorElement":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`int(${i})`);let o=(r.prec??et)<et?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:et}}case"texture":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=t.params[0]?._t||"sampler2D";if(!(i.startsWith("isampler")||i.startsWith("usampler")))return vt(t,e,"texture",!0);let o=i.endsWith("2D")?2:3,a=s.expr;return(t.params[1]?._t||"float")!=="int"&&(a=`ivec${o}(${a})`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`texelFetch(${r.expr}, ${a}, 0)`,prec:et}}case"textureLod":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=Ce(t.params[2],e),o=t.params[0]?._t||"sampler2D";if(!(o.startsWith("isampler")||o.startsWith("usampler")))return{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`textureLod(${r.expr}, ${s.expr}, ${i.expr})`};let a=o.endsWith("2D")?2:3,l=i.expr;(t.params[2]?._t||"float")==="float"&&(l=`int(${l})`);let c=s.expr;return(t.params[1]?._t||"float")!=="int"&&(c=`ivec${a}(${c})`),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`texelFetch(${r.expr}, ${c}, ${l})`}}case"textureLoad":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=(t.params[0]?._t||"sampler2D").endsWith("2D")?2:3,o=s.expr,a=t.params[1]?._t||"ivec2";return a!==`ivec${i}`&&a!==`uvec${i}`&&(o=`ivec${i}(${o})`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`texelFetch(${r.expr}, ${o}, 0)`,prec:et}}case"textureSize":{let r=Ce(t.params[0],e);return{decls:r.decls,body:r.body,expr:`textureSize(${r.expr}, 0)`,prec:et}}case"let":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=t.params[0]._t||"float",o=t.params[1]?._t||"float",a=Rs(i),l=s.expr;return i==="float"&&(o==="int"||o==="uint")&&(l=`float(${l})`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body,`${a} ${r.expr} = ${l};`],expr:r.expr}}case"assign":{t.params[0]?.type==="builtinPosition"&&(e.positionWritten=!0);let r=Ce(t.params[0],e),s=Ce(t.params[1],e);return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body,`${r.expr} = ${s.expr};`],expr:r.expr}}case"seq":{let r=t.params??[],s=[],i=[],o="0.0";for(let a of r){let l=Ce(a,e);s.push(...l.decls),i.push(...l.body),o=l.expr}return{decls:s,body:i,expr:o}}case"if":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=t.params.length>=3&&t.params[2]!==void 0?Ce(t.params[2],e):{decls:[],body:[]},o=[...r.body,`if (${r.expr}) {`,...s.body.map(a=>"  "+a),"}"];return i.body.length>0&&(o.push("else {"),o.push(...i.body.map(a=>"  "+a)),o.push("}")),{decls:[...r.decls,...s.decls,...i.decls],body:o,expr:"0.0"}}case"for":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=Ce(t.params[2],e),o=Ce(t.params[3],e),a=r.expr,l=r.body;if(r.body.length>0){let c=r.body[r.body.length-1];c.endsWith(";")&&(a=c.slice(0,-1),l=r.body.slice(0,-1))}return{decls:[...r.decls,...s.decls,...i.decls,...o.decls],body:[...l,...s.body,`for (${a}; ${s.expr}; ${sb(i).map(ib).join(", ")}) {`,...o.body.map(c=>"  "+c),"}"],expr:"0.0"}}case"while":{let r=Ce(t.params[0],e),s=Ce(t.params[1],e);return{decls:[...r.decls,...s.decls],body:[...r.body,`while (${r.expr}) {`,...s.body.map(i=>"  "+i),"}"],expr:"0.0"}}case"discard":return{decls:[],body:["discard;"],expr:"0.0"};case"break":return{decls:[],body:["break;"],expr:"0.0"};case"continue":return{decls:[],body:["continue;"],expr:"0.0"};case"return":return{decls:[],body:["return;"],expr:"0.0"};default:throw new Error(`[RMSL] Unsupported node type in GLSL compiler: "${t.type}"`)}}function vt(t,e,n,r){let s=Ce(t.params[0],e),i=Ce(t.params[1],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=s.expr,c=i.expr;if(o==="float"&&(a==="int"||a==="uint")?c=`float(${c})`:(o==="int"||o==="uint")&&a==="float"?l=`float(${l})`:(o==="int"||o==="uint")&&(a==="int"||a==="uint")&&(o==="int"&&a==="uint"&&(c=`int(${c})`),o==="uint"&&a==="int"&&(l=`uint(${l})`)),r)return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${n}(${l}, ${c})`,prec:et};let u=xs[t.type]??0;return l=St(s.prec,u,l),c=St(i.prec,u,c),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${l} ${n} ${c}`,prec:u}}function ui(t,e,n,r){let s=Ce(t.params[0],e),i=Ce(t.params[1],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=(Ft[o]??1)>1,c=s.expr,u=i.expr;if(!l&&o==="float"&&(a==="int"||a==="uint")?u=`float(${u})`:!l&&(o==="int"||o==="uint")&&a==="float"&&(c=`float(${c})`),l)return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${r}(${c}, ${u})`,prec:et};let d=xs[t.type]??0;return c=St(s.prec,d,c),u=St(i.prec,d,u),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${c} ${n} ${u}`,prec:d}}function Ki(t,e,n){let r=Ce(t.params[0],e),s=Ce(t.params[1],e),i=Ce(t.params[2],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=t.params[2]?._t||"float",c=r.expr,u=s.expr,d=i.expr;return o==="float"?((a==="int"||a==="uint")&&(u=`float(${u})`),(l==="int"||l==="uint")&&(d=`float(${d})`)):(o==="int"||o==="uint")&&a==="float"&&(c=`float(${c})`),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`${n}(${c}, ${u}, ${d})`}}function tt(t,e,n){let r=Ce(t.params[0],e);return{decls:r.decls,body:r.body,expr:`${n}(${r.expr})`}}function Jc(t,e,n={}){const r=n.precision??"highp";if(r!=="lowp"&&r!=="mediump"&&r!=="highp")throw new Error(`[RMSL] unknown precision "${r}" — use "lowp", "mediump" or "highp".`);let s={shaderStage:e,uniforms:new Map,attributes:new Map,varyings:new Map,outputs:new Map,varDefs:new Map,memo:new Map,positionWritten:!1},i=Array.isArray(t)?t:[t],o=i.map(p=>Ce(p,s)),a=[],l="0.0",c;for(let p=0;p<o.length;p++)a.push(...o[p].decls,...o[p].body),l=o[p].expr,c=i[p]?._t;ob(e,c,s.positionWritten);let u=c==="vec4"&&!s.positionWritten,d=e==="fragment"&&s.outputs.size===0&&u,h=[];h.push("#version 300 es"),h.push(`precision ${r} float;`);let f=[...new Set([...s.uniforms.values()].map(p=>p.type).filter(p=>/^(i|u)?sampler2D$|^(i|u)?sampler3D$|^(i|u)?samplerCube$/.test(p)))].sort();for(let p of f)h.push(`precision ${r} ${p};`);h.push(""),s.uniforms.forEach(p=>{h.push(p.length!==void 0?`uniform ${p.type} ${p.slot}[${p.length}];`:`uniform ${p.type} ${p.slot};`)}),s.attributes.forEach(p=>{h.push(`in ${p.type} ${p.slot};`)}),s.varyings.forEach(p=>{e==="vertex"?h.push(`out ${p.type} ${p.slot};`):h.push(`in ${p.type} ${p.slot};`)});let m=0;if(s.outputs.forEach(p=>{p&&p.slot&&p.type&&h.push(e==="fragment"?`layout(location=${m++}) out ${p.type} ${p.slot};`:`out ${p.type} ${p.slot};`)}),d&&h.push("layout(location=0) out vec4 _rmsl_fragColor;"),(s.uniforms.size>0||s.attributes.size>0||s.outputs.size>0||d)&&h.push(""),e==="vertex"){h.push("void main(void) {");for(let p of a)h.push("  "+p);u&&h.push(`  gl_Position = ${l};`),h.push("}")}else{h.push("void main(void) {");for(let p of a)h.push("  "+p);d&&h.push(`  _rmsl_fragColor = ${l};`),h.push("}")}return h.join(`
`)}const Np=Object.assign((t,e)=>Jc(t,"fragment",e),{vertex:(t,e)=>Jc(t,"vertex",e),fragment:(t,e)=>Jc(t,"fragment",e)});let fR={float:"f32",vec2:"vec2<f32>",vec3:"vec3<f32>",vec4:"vec4<f32>",int:"i32",uint:"u32",bool:"bool",ivec2:"vec2<i32>",ivec3:"vec3<i32>",ivec4:"vec4<i32>",uvec2:"vec2<u32>",uvec3:"vec3<u32>",uvec4:"vec4<u32>",bvec2:"vec2<bool>",bvec3:"vec3<bool>",bvec4:"vec4<bool>",mat2:"mat2x2<f32>",mat2x3:"mat2x3<f32>",mat2x4:"mat2x4<f32>",mat3x2:"mat3x2<f32>",mat3:"mat3x3<f32>",mat3x4:"mat3x4<f32>",mat4x2:"mat4x2<f32>",mat4x3:"mat4x3<f32>",mat4:"mat4x4<f32>",sampler2D:"texture_2d<f32>",sampler3D:"texture_3d<f32>",samplerCube:"texture_cube<f32>",isampler2D:"texture_2d<i32>",isampler3D:"texture_3d<i32>",isamplerCube:"texture_cube<i32>",usampler2D:"texture_2d<u32>",usampler3D:"texture_3d<u32>",usamplerCube:"texture_cube<u32>",void:"void"};const Or={mat2:[2,2],mat2x3:[2,3],mat2x4:[2,4],mat3x2:[3,2],mat3:[3,3],mat3x4:[3,4],mat4x2:[4,2],mat4x3:[4,3],mat4:[4,4]};function pR(t){return kl(t)?.count??1}function kl(t){const e=/^mat(\d)x(\d)<(.+)>$/.exec(t);return e?{count:Number(e[1]),columnType:`vec${e[2]}<${e[3]}>`}:null}function Fp(t,e){return`${t}_${e}`}function mR(t,e){const n=Or[t],r=e===void 0?void 0:Or[e];if(n===void 0||r===void 0||n[0]>=r[0]||n[1]>=r[1])return null;const s=`_rmsl_${t}_from_${e}`;return s in vh?s:null}function gR(t,e,n){let r=Or[t];if(r===void 0||e.length!==1||Ft[n]!==1)return e;let[s,i]=r,o=e[0],a=[];for(let l=0;l<s;l++)for(let c=0;c<i;c++)a.push(c===l?o:"0f");return a}const Bp="_RmslUniforms",nd="_rmsl_uniforms",yR={f32:{size:4,align:4},i32:{size:4,align:4},u32:{size:4,align:4},"vec2<f32>":{size:8,align:8},"vec3<f32>":{size:12,align:16},"vec4<f32>":{size:16,align:16},"vec2<u32>":{size:8,align:8},"vec3<u32>":{size:12,align:16},"vec4<u32>":{size:16,align:16},"vec2<i32>":{size:8,align:8},"vec3<i32>":{size:12,align:16},"vec4<i32>":{size:16,align:16},"mat2x2<f32>":{size:16,align:8},"mat2x3<f32>":{size:32,align:16},"mat2x4<f32>":{size:32,align:16},"mat3x2<f32>":{size:24,align:8},"mat3x3<f32>":{size:48,align:16},"mat3x4<f32>":{size:48,align:16},"mat4x2<f32>":{size:32,align:8},"mat4x3<f32>":{size:64,align:16},"mat4x4<f32>":{size:64,align:16}},bh={f32:{stored:"vec4<f32>",read:t=>`${t}.x`},i32:{stored:"vec4<i32>",read:t=>`${t}.x`},u32:{stored:"vec4<u32>",read:t=>`${t}.x`},"vec2<f32>":{stored:"vec4<f32>",read:t=>`${t}.xy`},"vec2<i32>":{stored:"vec4<i32>",read:t=>`${t}.xy`},"vec2<u32>":{stored:"vec4<u32>",read:t=>`${t}.xy`},bool:{stored:"vec4<u32>",read:t=>`(${t}.x != 0u)`},"vec2<bool>":{stored:"vec4<u32>",read:t=>`(${t}.xy != vec2<u32>(0u))`},"vec3<bool>":{stored:"vec4<u32>",read:t=>`(${t}.xyz != vec3<u32>(0u))`},"vec4<bool>":{stored:"vec4<u32>",read:t=>`(${t} != vec4<u32>(0u))`}};function bR(t){return t.length===void 0?t.type:`array<${bh[t.type]?.stored??t.type}, ${t.length}>`}function vR(t){return/^(i|u)?sampler(2D|3D|Cube)$/.test(t)}function Up(t){return t==="texture_2d<f32>"||t==="texture_3d<f32>"||t==="texture_cube<f32>"||t==="texture_2d<i32>"||t==="texture_3d<i32>"||t==="texture_cube<i32>"||t==="texture_2d<u32>"||t==="texture_3d<u32>"||t==="texture_cube<u32>"}function wR(t){const e=o=>{const a=o.length===void 0?o.type:bh[o.type]?.stored??o.type,l=yR[a];if(l===void 0)throw new Error(`[RMSL] no uniform layout is known for ${o.type}. Its size and alignment have to be added to WGSL_LAYOUT before it can be packed into a uniform buffer.`);if(o.length===void 0)return{...l,stride:l.size};const c=Math.ceil(l.size/16)*16;return{size:c*o.length,align:Math.max(l.align,16),stride:c}},n=t.map((o,a)=>({m:o,declaredAt:a})).sort((o,a)=>{const l=e(a.m).align-e(o.m).align;return l!==0?l:o.declaredAt-a.declaredAt}).map(({m:o})=>o),r=[];let s=0;for(const o of n){const{size:a,align:l,stride:c}=e(o);s=Math.ceil(s/l)*l,r.push({name:o.slot,type:o.type,offset:s,size:a,...o.length!==void 0?{length:o.length,stride:c}:{}}),s+=a}const i=n.reduce((o,a)=>Math.max(o,e(a).align),4);return{members:r,size:Math.ceil(s/i)*i}}function rr(t){return fR[t]??"f32"}function _R(t){let e="";for(const n of t)e+=n==="s"?"x":n==="t"?"y":n==="p"?"z":n==="q"?"w":n;return e}function Qc(t){return t.id??Number(/^_rmsl_v(\d+)$/.exec(t.slot)?.[1]??0)}function Ae(t,e){if(t==null)return{decls:[],body:[],expr:"0.0"};if(typeof t=="boolean")return{decls:[],body:[],expr:t?"true":"false"};if(typeof t=="number")return{decls:[],body:[],expr:Number.isInteger(t)?`${t}i`:`${t}f`};if(Array.isArray(t))return{decls:[],body:[],expr:`vec3<f32>(${t.join(", ")})`};let n=e.memo.get(t);if(n)return{decls:[],body:[],expr:n.expr,prec:n.prec};let r=xR(t,e);return e.memo.set(t,r),r}function xR(t,e){let n=rb(t);switch(n&&(t=n),t.type){case"float":return{decls:[],body:[],expr:`${t.value}f`};case"int":return{decls:[],body:[],expr:`${t.value}i`};case"uint":return{decls:[],body:[],expr:`${t.value}u`};case"bool":return{decls:[],body:[],expr:t.value?"true":"false"};case"vec2":return{decls:[],body:[],expr:`vec2<f32>(${t.value.join(", ")})`};case"vec3":return{decls:[],body:[],expr:`vec3<f32>(${t.value.join(", ")})`};case"vec4":return{decls:[],body:[],expr:`vec4<f32>(${t.value.join(", ")})`};case"ivec2":return{decls:[],body:[],expr:`vec2<i32>(${t.value.map(r=>`${r}i`).join(", ")})`};case"ivec3":return{decls:[],body:[],expr:`vec3<i32>(${t.value.map(r=>`${r}i`).join(", ")})`};case"ivec4":return{decls:[],body:[],expr:`vec4<i32>(${t.value.map(r=>`${r}i`).join(", ")})`};case"uvec2":return{decls:[],body:[],expr:`vec2<u32>(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec3":return{decls:[],body:[],expr:`vec3<u32>(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec4":return{decls:[],body:[],expr:`vec4<u32>(${t.value.map(r=>`${r}u`).join(", ")})`};case"bvec2":return{decls:[],body:[],expr:`vec2<bool>(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec3":return{decls:[],body:[],expr:`vec3<bool>(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec4":return{decls:[],body:[],expr:`vec4<bool>(${t.value.map(r=>r?"true":"false").join(", ")})`};case"mat2":return{decls:[],body:[],expr:`mat2x2<f32>(${t.value.join(", ")})`};case"mat2x3":return{decls:[],body:[],expr:`mat2x3<f32>(${t.value.join(", ")})`};case"mat2x4":return{decls:[],body:[],expr:`mat2x4<f32>(${t.value.join(", ")})`};case"mat3x2":return{decls:[],body:[],expr:`mat3x2<f32>(${t.value.join(", ")})`};case"mat3":return{decls:[],body:[],expr:`mat3x3<f32>(${t.value.join(", ")})`};case"mat3x4":return{decls:[],body:[],expr:`mat3x4<f32>(${t.value.join(", ")})`};case"mat4x2":return{decls:[],body:[],expr:`mat4x2<f32>(${t.value.join(", ")})`};case"mat4x3":return{decls:[],body:[],expr:`mat4x3<f32>(${t.value.join(", ")})`};case"mat4":return{decls:[],body:[],expr:`mat4x4<f32>(${t.value.join(", ")})`};case"void":return{decls:[],body:[],expr:"0.0"};case"construct":{let r=(t.params??[]).map(u=>Ae(u,e)),s=rr(t._t),i=Ft[t._t],o=t.params?.[0]?._t,a=Ft[o];if(r.length===1&&i!==void 0&&a!==void 0&&a>i&&i>=1&&/^(vec|ivec|uvec|bvec)/.test(o??"")){let u=`${r[0].expr}.${"xyzw".slice(0,i)}`;return{decls:r[0].decls,body:r[0].body,expr:i===1?`${s}(${u})`:u}}let l=r.length===1?mR(t._t,o):null;if(l)return e.wgslHelpers.add(l),{decls:r[0].decls,body:r[0].body,expr:`${l}(${r[0].expr})`};let c=gR(t._t,r.map(u=>u.expr),o).join(", ");return{decls:r.flatMap(u=>u.decls),body:r.flatMap(u=>u.body),expr:`${s}(${c})`}}case"var":{let r=t.value,s=r?.varName;return s&&!e.varDefs.has(s)&&e.varDefs.set(s,rr(r?.varType||"float")),{decls:[],body:[],expr:s}}case"uniform":{let r=t.value,s=Ft[r?.shaderType]??1,i=r?.shaderType==="bool"||r?.shaderType?.startsWith("bvec"),o=s===1?"u32":`vec${s}<u32>`,a=s===1?"0u":`${o}(0u)`;if(r&&r.id!=null&&!e.uniforms.has(r.id)&&e.uniforms.set(r.id,{type:i?o:rr(r.shaderType),slot:r.slot}),!r?.slot)return{decls:[],body:[],expr:"uniform<f32>"};let l=vR(r.shaderType)?r.slot:`${nd}.${r.slot}`;return{decls:[],body:[],expr:i?`(${l} != ${a})`:l}}case"uniformArray":{let r=t.value;return r&&r.id!=null&&!e.uniforms.has(r.id)&&e.uniforms.set(r.id,{type:rr(r.shaderType),slot:r.slot,length:r.length}),{decls:[],body:[],expr:`${nd}.${r.slot}`}}case"uniformArrayElement":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=t.params[1]?._t,o=i==="int"||i==="uint"?s.expr:`i32(${s.expr})`,a=rr(t.params[0]?._t),l=`${r.expr}[${o}]`,c=bh[a]?.read;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:c?c(l):l}}case"attribute":{let r=t.value;if(r&&r.id!=null&&!e.attributes.has(r.id)&&e.attributes.set(r.id,{type:rr(r.shaderType),slot:r.slot}),e.shaderStage!=="vertex")return{decls:[],body:[],expr:r.slot};const s=kl(rr(r.shaderType))!==null;return{decls:[],body:[],expr:s?r.slot:`input.${r.slot}`}}case"varying":{let r=t.value;r&&r.id!=null&&!e.varyings.has(r.id)&&e.varyings.set(r.id,{id:r.id,type:rr(r.shaderType),slot:r.slot});let s=r?.slot||"vec3<f32>(0.0, 0.0, 0.0)",i=e.shaderStage==="vertex"?`result.${s}`:s;return{decls:[],body:[],expr:i}}case"output":{let r=t.value;return r&&r.id!=null&&!e.outputs.has(r.id)&&e.outputs.set(r.id,{type:rr(r.shaderType),slot:r.slot,location:r.location}),{decls:[],body:[],expr:`result.${r?.slot}`}}case"builtinPosition":return lb(e),{decls:[],body:[],expr:"result.position"};case"builtinFragDepth":{if(e.shaderStage!=="fragment")throw new Error("builtinFragDepth() can only be used in fragment shaders");return e.fragDepthUsed=!0,{decls:[],body:[],expr:"result._rmsl_fragDepth"}}case"fragCoord":{if(e.shaderStage!=="fragment")throw new Error("fragCoord() can only be used in fragment shaders");return e.fragCoordUsed=!0,{decls:[],body:[],expr:"_rmsl_fragCoordInput.xy"}}case"swizzle":{let r=Ae(t.params[0],e),s=_R(t.value),i=(r.prec??et)<et?`(${r.expr})`:r.expr;return{decls:r.decls,body:r.body,expr:`${i}.${s}`,prec:et}}case"negate":{let r=Ae(t.params[0],e),s=St(r.prec,jn,r.expr);return{decls:r.decls,body:r.body,expr:`-${s}`,prec:jn}}case"not":{let r=Ae(t.params[0],e),s=St(r.prec,jn,r.expr);return{decls:r.decls,body:r.body,expr:`!${s}`,prec:jn}}case"all":{let r=Ae(t.params[0],e);return{decls:r.decls,body:r.body,expr:`all(${r.expr})`}}case"any":{let r=Ae(t.params[0],e);return{decls:r.decls,body:r.body,expr:`any(${r.expr})`}}case"add":return ht(t,e,"+");case"sub":return ht(t,e,"-");case"mul":return ht(t,e,"*");case"div":return ht(t,e,"/");case"atan2":return ht(t,e,"atan2",!0);case"mod":{let r=t.params[0]?._t;if(r==="int"||r==="uint")return ht(t,e,"%");let s=`_rmsl_mod_${r}`;return s in vh?(e.wgslHelpers.add(s),ht(t,e,s,!0)):ht(t,e,"%")}case"pow":return ht(t,e,"pow",!0);case"min":return ht(t,e,"min",!0);case"max":return ht(t,e,"max",!0);case"dot":return ht(t,e,"dot",!0);case"cross":return ht(t,e,"cross",!0);case"distance":return ht(t,e,"distance",!0);case"reflect":return ht(t,e,"reflect",!0);case"refract":return Ji(t,e,"refract");case"mix":return Ji(t,e,"mix");case"step":return ht(t,e,"step",!0);case"smoothstep":return Ji(t,e,"smoothstep");case"clamp":return Ji(t,e,"clamp");case"select":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=Ae(t.params[2],e),o=Ft[t.params[1]?._t]??1,a=Ft[t.params[2]?._t]??1,l=Math.max(o,a),c=s.expr,u=i.expr;return o===1&&l>1&&(c=`vec${l}<f32>(${c})`),a===1&&l>1&&(u=`vec${l}<f32>(${u})`),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`select(${u}, ${c}, ${r.expr})`,prec:et}}case"lessThan":return ht(t,e,"<");case"greaterThan":return ht(t,e,">");case"lessThanEqual":return ht(t,e,"<=");case"greaterThanEqual":return ht(t,e,">=");case"equal":return ht(t,e,"==");case"notEqual":return ht(t,e,"!=");case"and":return jp(t,e,"&&");case"or":return jp(t,e,"||");case"bitAnd":return ht(t,e,"&");case"bitOr":return ht(t,e,"|");case"bitXor":return ht(t,e,"^");case"shiftLeft":return Hp(t,e,"<<");case"shiftRight":return Hp(t,e,">>");case"matVecMul":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=t.params[0]?._t||"mat4",o=t.params[1]?._t||"vec3",a=xs.mul,l=St(r.prec,a,r.expr),c=St(s.prec,a,s.expr),u=Or[i],d=Ft[o]??0;if(u!==void 0&&d===u[0]-1){let h=`(${l} * vec${u[0]}<f32>(${c}, 1.0))`;return d<u[1]&&(h+=`.${"xyzw".slice(0,d)}`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:h,prec:et}}return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${l} * ${c}`,prec:a}}case"sin":return st(t,e,"sin");case"cos":return st(t,e,"cos");case"tan":return st(t,e,"tan");case"asin":return st(t,e,"asin");case"acos":return st(t,e,"acos");case"atan":return st(t,e,"atan");case"sinh":return st(t,e,"sinh");case"cosh":return st(t,e,"cosh");case"tanh":return st(t,e,"tanh");case"asinh":return st(t,e,"asinh");case"acosh":return st(t,e,"acosh");case"atanh":return st(t,e,"atanh");case"abs":return st(t,e,"abs");case"sign":return st(t,e,"sign");case"floor":return st(t,e,"floor");case"ceil":return st(t,e,"ceil");case"fract":return st(t,e,"fract");case"round":return st(t,e,"round");case"trunc":return st(t,e,"trunc");case"sqrt":return st(t,e,"sqrt");case"inverseSqrt":return st(t,e,"inverseSqrt");case"exp":return st(t,e,"exp");case"log":return st(t,e,"log");case"exp2":return st(t,e,"exp2");case"log2":return st(t,e,"log2");case"normalize":return st(t,e,"normalize");case"length":return st(t,e,"length");case"transpose":return st(t,e,"transpose");case"inverse":{let r=Ae(t.params[0],e),s=`_rmsl_inverse${ab(t.params[0]?._t)}`;return e.wgslHelpers.add(s),{decls:r.decls,body:r.body,expr:`${s}(${r.expr})`}}case"determinant":return st(t,e,"determinant");case"fwidth":return st(t,e,"fwidth");case"dFdx":return st(t,e,"dpdx");case"dFdy":return st(t,e,"dpdy");case"faceForward":return Ji(t,e,"faceForward");case"bitNot":{let r=Ae(t.params[0],e),s=St(r.prec,jn,r.expr);return{decls:r.decls,body:r.body,expr:`~${s}`,prec:jn}}case"matrixElement":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`i32(${i})`);let o=(r.prec??et)<et?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:et}}case"vectorElement":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`i32(${i})`);let o=(r.prec??et)<et?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:et}}case"texture":case"textureLod":{let r=t.params[0],s=Ae(r,e),i=Ae(t.params[1],e),o=r.value?.slot,a=r?._t||"sampler2D";if(a.startsWith("isampler")||a.startsWith("usampler")){let c=a.endsWith("2D")?2:3,u=t.params[1]?._t||"ivec2",d=i.expr;if(u!==`ivec${c}`&&(d=`vec${c}<i32>(${d})`),t.type==="texture")return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`textureLoad(${s.expr}, ${d}, 0i)`,prec:et};let h=Ae(t.params[2],e),f=h.expr;return(t.params[2]?._t||"float")!=="int"&&(f=`i32(${f})`),{decls:[...s.decls,...i.decls,...h.decls],body:[...s.body,...i.body,...h.body],expr:`textureLoad(${s.expr}, ${d}, ${f})`,prec:et}}o&&!e.wgslSamplers.has(o)&&e.wgslSamplers.set(o,{textureSlot:o,samplerSlot:o+"_s"});let l=o?o+"_s":"sampler";if(t.type==="texture")return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`textureSample(${s.expr}, ${l}, ${i.expr})`};{let c=Ae(t.params[2],e);return{decls:[...s.decls,...i.decls,...c.decls],body:[...s.body,...i.body,...c.body],expr:`textureSampleLevel(${s.expr}, ${l}, ${i.expr}, ${c.expr})`}}}case"textureLoad":{let r=t.params[0],s=Ae(r,e),i=Ae(t.params[1],e),o=(r?._t||"sampler2D").endsWith("2D")?2:3,a=t.params[1]?._t||`ivec${o}`,l=i.expr;return a!==`ivec${o}`&&a!==`uvec${o}`&&(l=`vec${o}<i32>(${l})`),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`textureLoad(${s.expr}, ${l}, 0)`,prec:et}}case"textureSize":{let r=Ae(t.params[0],e);return{decls:r.decls,body:r.body,expr:`textureDimensions(${r.expr})`,prec:et}}case"let":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=t.params[0]._t||"float",o=rr(i),a=t.params[0].varName||r.expr;return e.varDefs.set(a,o),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body,`var ${a}: ${o} = ${s.expr};`],expr:a}}case"assign":{t.params[0]?.type==="builtinPosition"&&(e.positionWritten=!0);let r=Ae(t.params[1],e),s=t.params[0];if(s?.type==="swizzle"){let o=dR(s),a=Ae(o.base,e);if(o.pattern.length===1)return{decls:[...a.decls,...r.decls],body:[...a.body,...r.body,`${a.expr}.${o.pattern} = ${r.expr};`],expr:a.expr};let l=`_rmsl_sw${e.nextId++}`,c=rr(t.params[1]?._t??"float"),u=[...a.body,...r.body,`var ${l}: ${c} = ${r.expr};`,...[...o.pattern].map((d,h)=>`${a.expr}.${d} = ${l}[${h}];`)];return{decls:[...a.decls,...r.decls],body:u,expr:a.expr}}let i=Ae(t.params[0],e);return{decls:[...i.decls,...r.decls],body:[...i.body,...r.body,`${i.expr} = ${r.expr};`],expr:i.expr}}case"seq":{let r=t.params??[],s=[],i=[],o="0.0";for(let a of r){let l=Ae(a,e);s.push(...l.decls),i.push(...l.body),o=l.expr}return{decls:s,body:i,expr:o}}case"if":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=t.params.length>=3&&t.params[2]!==void 0?Ae(t.params[2],e):{decls:[],body:[]},o=[...r.body,`if (${r.expr}) {`,...s.body.map(a=>"  "+a),"}"];return i.body.length>0&&(o.push("else {"),o.push(...i.body.map(a=>"  "+a)),o.push("}")),{decls:[...r.decls,...s.decls,...i.decls],body:o,expr:"0.0"}}case"for":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=Ae(t.params[2],e),o=Ae(t.params[3],e),a=r.expr,l=r.body;if(r.body.length>0){let h=r.body[r.body.length-1];h.endsWith(";")&&(a=h.slice(0,-1),l=r.body.slice(0,-1))}let c=sb(i),u=[...r.decls,...s.decls,...i.decls,...o.decls];if(c.length>1)return{decls:u,body:[...l,"{",`  ${a};`,"  loop {",...s.body.map(h=>"    "+h),`    if (!(${s.expr})) { break; }`,...o.body.map(h=>"    "+h),"    continuing {",...c.map(h=>"      "+h),"    }","  }","}"],expr:"0.0"};let d=c.length===1?ib(c[0]):"";return{decls:u,body:[...l,`for (${a}; ${s.expr}; ${d}) {`,...o.body.map(h=>"  "+h),"}"],expr:"0.0"}}case"while":{let r=Ae(t.params[0],e),s=Ae(t.params[1],e);return{decls:[...r.decls,...s.decls],body:[...r.body,`while (${r.expr}) {`,...s.body.map(i=>"  "+i),"}"],expr:"0.0"}}case"discard":return{decls:[],body:["discard;"],expr:"0.0"};case"break":return{decls:[],body:["break;"],expr:"0.0"};case"continue":return{decls:[],body:["continue;"],expr:"0.0"};case"return":return{decls:[],body:["return;"],expr:"0.0"};default:throw new Error(`[RMSL] Unsupported node type in WGSL compiler: "${t.type}"`)}}const vh={_rmsl_mat3_from_mat4:`fn _rmsl_mat3_from_mat4(m: mat4x4<f32>) -> mat3x3<f32> {
  return mat3x3<f32>(m[0].xyz, m[1].xyz, m[2].xyz);
}`,_rmsl_mat2_from_mat4:`fn _rmsl_mat2_from_mat4(m: mat4x4<f32>) -> mat2x2<f32> {
  return mat2x2<f32>(m[0].xy, m[1].xy);
}`,_rmsl_mat2_from_mat3:`fn _rmsl_mat2_from_mat3(m: mat3x3<f32>) -> mat2x2<f32> {
  return mat2x2<f32>(m[0].xy, m[1].xy);
}`,_rmsl_mod_float:`fn _rmsl_mod_float(x: f32, y: f32) -> f32 {
  return x - y * floor(x / y);
}`,_rmsl_mod_vec2:`fn _rmsl_mod_vec2(x: vec2<f32>, y: vec2<f32>) -> vec2<f32> {
  return x - y * floor(x / y);
}`,_rmsl_mod_vec3:`fn _rmsl_mod_vec3(x: vec3<f32>, y: vec3<f32>) -> vec3<f32> {
  return x - y * floor(x / y);
}`,_rmsl_mod_vec4:`fn _rmsl_mod_vec4(x: vec4<f32>, y: vec4<f32>) -> vec4<f32> {
  return x - y * floor(x / y);
}`,_rmsl_inverse2:`fn _rmsl_inverse2(m: mat2x2<f32>) -> mat2x2<f32> {
  let det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let inv = 1.0 / det;
  return mat2x2<f32>(
    vec2<f32>(m[1][1] * inv, -m[0][1] * inv),
    vec2<f32>(-m[1][0] * inv, m[0][0] * inv),
  );
}`,_rmsl_inverse3:`fn _rmsl_inverse3(m: mat3x3<f32>) -> mat3x3<f32> {
  let a00 = m[0][0]; let a01 = m[0][1]; let a02 = m[0][2];
  let a10 = m[1][0]; let a11 = m[1][1]; let a12 = m[1][2];
  let a20 = m[2][0]; let a21 = m[2][1]; let a22 = m[2][2];
  let b01 = a22 * a11 - a12 * a21;
  let b11 = -a22 * a10 + a12 * a20;
  let b21 = a21 * a10 - a11 * a20;
  let det = a00 * b01 + a01 * b11 + a02 * b21;
  let inv = 1.0 / det;
  return mat3x3<f32>(
    vec3<f32>(b01 * inv, (-a22 * a01 + a02 * a21) * inv, (a12 * a01 - a02 * a11) * inv),
    vec3<f32>(b11 * inv, (a22 * a00 - a02 * a20) * inv, (-a12 * a00 + a02 * a10) * inv),
    vec3<f32>(b21 * inv, (-a21 * a00 + a01 * a20) * inv, (a11 * a00 - a01 * a10) * inv),
  );
}`,_rmsl_inverse4:`fn _rmsl_inverse4(m: mat4x4<f32>) -> mat4x4<f32> {
  let a00 = m[0][0]; let a01 = m[0][1]; let a02 = m[0][2]; let a03 = m[0][3];
  let a10 = m[1][0]; let a11 = m[1][1]; let a12 = m[1][2]; let a13 = m[1][3];
  let a20 = m[2][0]; let a21 = m[2][1]; let a22 = m[2][2]; let a23 = m[2][3];
  let a30 = m[3][0]; let a31 = m[3][1]; let a32 = m[3][2]; let a33 = m[3][3];
  let b00 = a00 * a11 - a01 * a10;
  let b01 = a00 * a12 - a02 * a10;
  let b02 = a00 * a13 - a03 * a10;
  let b03 = a01 * a12 - a02 * a11;
  let b04 = a01 * a13 - a03 * a11;
  let b05 = a02 * a13 - a03 * a12;
  let b06 = a20 * a31 - a21 * a30;
  let b07 = a20 * a32 - a22 * a30;
  let b08 = a20 * a33 - a23 * a30;
  let b09 = a21 * a32 - a22 * a31;
  let b10 = a21 * a33 - a23 * a31;
  let b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  let inv = 1.0 / det;
  return mat4x4<f32>(
    vec4<f32>((a11 * b11 - a12 * b10 + a13 * b09) * inv,
              (-a01 * b11 + a02 * b10 - a03 * b09) * inv,
              (a31 * b05 - a32 * b04 + a33 * b03) * inv,
              (-a21 * b05 + a22 * b04 - a23 * b03) * inv),
    vec4<f32>((-a10 * b11 + a12 * b08 - a13 * b07) * inv,
              (a00 * b11 - a02 * b08 + a03 * b07) * inv,
              (-a30 * b05 + a32 * b02 - a33 * b01) * inv,
              (a20 * b05 - a22 * b02 + a23 * b01) * inv),
    vec4<f32>((a10 * b10 - a11 * b08 + a13 * b06) * inv,
              (-a00 * b10 + a01 * b08 - a03 * b06) * inv,
              (a30 * b04 - a31 * b02 + a33 * b00) * inv,
              (-a20 * b04 + a21 * b02 - a23 * b00) * inv),
    vec4<f32>((-a10 * b09 + a11 * b07 - a12 * b06) * inv,
              (a00 * b09 - a01 * b07 + a02 * b06) * inv,
              (-a30 * b03 + a31 * b01 - a32 * b00) * inv,
              (a20 * b03 - a21 * b01 + a22 * b00) * inv),
  );
}`};function Hp(t,e,n){let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=t.params[1]?._t==="uint"?s.expr:`u32(${s.expr})`,o=xs[t.type]??0,a=St(r.prec,o,r.expr);return i=St(s.prec,o,i),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${a} ${n} ${i}`,prec:o}}function jp(t,e,n){let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=xs[t.type]??0;const o=(a,l)=>l?.type==="and"||l?.type==="or"?`(${a.expr})`:St(a.prec,i,a.expr);return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o(r,t.params[0])} ${n} ${o(s,t.params[1])}`,prec:i}}function ht(t,e,n,r){let s=Ae(t.params[0],e),i=Ae(t.params[1],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=i.expr,c=s.expr;if(o!==a&&(o==="float"&&(a==="int"||a==="uint")?l=`f32(${i.expr})`:(o==="int"||o==="uint")&&a==="float"?l=o==="int"?`i32(${i.expr})`:`u32(${i.expr})`:(o==="int"||o==="uint")&&(a==="int"||a==="uint")&&(l=o==="int"?`i32(${i.expr})`:`u32(${i.expr})`)),r)return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${n}(${c}, ${l})`,prec:et};let u=xs[t.type]??0;return c=St(s.prec,u,c),l=St(i.prec,u,l),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${c} ${n} ${l}`,prec:u}}function Ji(t,e,n){let r=Ae(t.params[0],e),s=Ae(t.params[1],e),i=Ae(t.params[2],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=t.params[2]?._t||"float",c=r.expr,u=s.expr,d=i.expr;return o==="float"&&((a==="int"||a==="uint")&&(u=`f32(${u})`),(l==="int"||l==="uint")&&(d=`f32(${d})`)),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`${n}(${c}, ${u}, ${d})`}}function st(t,e,n){let r=Ae(t.params[0],e);return{decls:r.decls,body:r.body,expr:`${n}(${r.expr})`}}function eu(t,e,n){let r={nextId:0,shaderStage:e,uniforms:new Map,attributes:new Map,varyings:new Map,outputs:new Map,wgslSamplers:new Map,varDefs:new Map,memo:new Map,wgslHelpers:new Set,positionWritten:!1,fragDepthUsed:!1,fragCoordUsed:!1},s=Array.isArray(t)?t:[t],i=s.map(g=>Ae(g,r)),o=[],a="0.0",l;for(let g=0;g<i.length;g++)o.push(...i[g].decls,...i[g].body),a=i[g].expr,l=s[g]?._t;ob(e,l,r.positionWritten);let c=l==="vec4"&&!r.positionWritten,u=[],d=0,h=0,f=[...r.uniforms.entries()].sort((g,b)=>g[1].slot.localeCompare(b[1].slot)),m=f.filter(([,g])=>Up(g.type)),p=f.filter(([,g])=>!Up(g.type));for(let[,g]of m)u.push(`@group(1) @binding(${d++}) var ${g.slot}: ${g.type};`);let y=n?.uniforms?kR(n.uniforms,p.map(([,g])=>g)):p.map(([,g])=>({slot:g.slot,type:g.type,length:g.length}));if(y.length>0){let g=wR(y);u.push(`struct ${Bp} {`);for(let b of g.members)u.push(`  ${b.name}: ${bR(b)},`);u.push("};"),u.push(`@group(0) @binding(0) var<uniform> ${nd}: ${Bp};`)}r.wgslSamplers.forEach(g=>{u.push(`@group(2) @binding(${h++}) var ${g.samplerSlot}: sampler;`)}),(r.uniforms.size>0||r.wgslSamplers.size>0||r.outputs.size>0)&&u.push("");for(const g of[...r.wgslHelpers].sort())u.push(vh[g],"");if(e==="vertex"){if(r.attributes.size>0){u.push("struct VertexInput {");let v=0;const x=[...r.attributes.entries()].sort((k,C)=>k[0]-C[0]);for(const[,k]of x){const C=kl(k.type);if(C)for(let E=0;E<C.count;E++)u.push(`  @location(${v+E}) ${Fp(k.slot,E)}: ${C.columnType},`);else u.push(`  @location(${v}) ${k.slot}: ${k.type},`);v+=pR(k.type)}u.push("};"),u.push("")}u.push("struct VertexOutput {"),u.push("  @builtin(position) position: vec4<f32>,");let g=[...r.varyings.entries()].sort((v,x)=>v[1].slot.localeCompare(x[1].slot)),b=0;for(let[,v]of g)b=Math.max(b,Qc(v)+1),u.push(`  @location(${Qc(v)}) ${v.slot}: ${v.type},`);r.outputs.forEach(v=>{v&&v.slot&&v.type&&u.push(`  @location(${b++}) ${v.slot}: ${v.type},`)}),u.push("};"),u.push(""),u.push("@vertex"),r.attributes.size>0?u.push("fn main(input: VertexInput) -> VertexOutput {"):u.push("fn main() -> VertexOutput {"),u.push("  var result: VertexOutput;");for(const[,v]of[...r.attributes.entries()].sort((x,k)=>x[0]-k[0])){const x=kl(v.type);if(!x)continue;const k=Array.from({length:x.count},(C,E)=>`input.${Fp(v.slot,E)}`);u.push(`  let ${v.slot} = ${v.type}(${k.join(", ")});`)}for(let v of o)u.push("  "+v);c&&u.push(`  result.position = ${a};`),u.push("  return result;"),u.push("}")}else{let g=r.outputs.size===0&&c,b=r.outputs.size>0||g||r.fragDepthUsed;if(b){u.push("struct FragmentOutput {");let k=0;r.outputs.forEach(C=>{C&&C.slot&&C.type&&u.push(`  @location(${k++}) ${C.slot}: ${C.type},`)}),g&&u.push("  @location(0) _rmsl_fragColor: vec4<f32>,"),r.fragDepthUsed&&u.push("  @builtin(frag_depth) _rmsl_fragDepth: f32,"),u.push("};"),u.push("")}u.push("@fragment");let v="",x=[...r.varyings.entries()].sort((k,C)=>k[1].slot.localeCompare(C[1].slot));for(let[,k]of x)v&&(v+=", "),v+=`@location(${Qc(k)}) ${k.slot}: ${k.type}`;r.fragCoordUsed&&(v&&(v+=", "),v+="@builtin(position) _rmsl_fragCoordInput: vec4<f32>"),u.push(`fn main(${v})${b?" -> FragmentOutput":""} {`),b&&u.push("  var result: FragmentOutput;");for(let k of o)u.push("  "+k);g&&u.push(`  result._rmsl_fragColor = ${a};`),r.fragDepthUsed&&!o.some(k=>k.includes("_rmsl_fragDepth ="))&&u.push("  result._rmsl_fragDepth = 1.0;"),b&&u.push("  return result;"),u.push("}")}return u.join(`
`)}Object.assign((t,e)=>eu(t,"fragment",e),{vertex:(t,e)=>eu(t,"vertex",e),fragment:(t,e)=>eu(t,"fragment",e)});function kR(t,e){let n=new Set(t.map(r=>r.slot));for(let r of e)if(!n.has(r.slot))throw new Error(`[RMSL] the uniform "${r.slot}" is read by this stage but missing from the uniforms passed to the compiler. Pass every uniform of the program, so both stages and the host agree on the buffer layout.`);return t}class wh{x;y;constructor(e=0,n=0){this.x=e,this.y=n}set(e,n){return this.x=e,this.y=n,this}setScalar(e){return this.x=e,this.y=e,this}copy(e){return this.x=e.x,this.y=e.y,this}clone(){return new wh(this.x,this.y)}add(e){return this.x+=e.x,this.y+=e.y,this}sub(e){return this.x-=e.x,this.y-=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divideScalar(e){return this.multiplyScalar(1/e)}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.lengthSq())}normalize(){return this.divideScalar(this.length()||1)}dot(e){return this.x*e.x+this.y*e.y}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,r=this.y-e.y;return n*n+r*r}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e}}class tc{x;y;z;w;constructor(e=0,n=0,r=0,s=1){this.x=e,this.y=n,this.z=r,this.w=s}set(e,n,r,s){return this.x=e,this.y=n,this.z=r,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w,this}clone(){return new tc(this.x,this.y,this.z,this.w)}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}divideScalar(e){return this.multiplyScalar(1/e)}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.dot(this)}length(){return Math.sqrt(this.lengthSq())}normalize(){return this.divideScalar(this.length()||1)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this.w+=(e.w-this.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this.w=e[n+3],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.w,e}}function SR(t){return t*Math.PI/180}class Jn extends Vi{isGroup=!0}class cb extends Vi{isScene=!0;background=new tn(0,0,0)}class ER extends Vi{isCamera=!0;matrixWorldInverse=new cr;projectionMatrix=new cr;projectionMatrixInverse=new cr;updateMatrixWorld(e=!1){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}getWorldDirection(e=new gt){return super.getWorldDirection(e)}}class AR extends ER{isPerspectiveCamera=!0;fov;aspect;near;far;constructor(e=50,n=1,r=.1,s=2e3){super(),this.fov=e,this.aspect=n,this.near=r,this.far=s,this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near,n=e*Math.tan(SR(.5*this.fov)),r=2*n,s=this.aspect*r,i=-.5*s;this.projectionMatrix.makePerspective(i,i+s,n,n-r,e,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}}class Le{isBufferAttribute=!0;array;itemSize;normalized;count;stepMode;needsUpdate=!1;format;updateRange={offset:0,count:-1};constructor(e,n,r=!1,s="vertex"){this.array=e,this.itemSize=n,this.normalized=r,this.stepMode=s,this.count=e!==void 0?e.length/n:0}setStepMode(e){return this.stepMode=e,this}setArray(e){return this.array=e,this.count=e.length/this.itemSize,this.needsUpdate=!0,this}getX(e){return this.array[e*this.itemSize]}getY(e){return this.array[e*this.itemSize+1]}getZ(e){return this.array[e*this.itemSize+2]}getW(e){return this.array[e*this.itemSize+3]}clone(){const e=this.array.slice?this.array.slice():Array.from(this.array),n=new Le(e,this.itemSize,this.normalized,this.stepMode);return n.format=this.format,n}}function TR(t){let e=-1/0;for(let n=0;n<t.length;n++){const r=t[n];r>e&&(e=r)}return e}class Jr extends fh{isBufferGeometry=!0;attributes={};index=null;name="";instanceCount=1;setAttribute(e,n){return this.attributes[e]=n,this}getAttribute(e){return this.attributes[e]}hasAttribute(e){return this.attributes[e]!==void 0}deleteAttribute(e){return delete this.attributes[e],this}setIndex(e){if(e===null)this.index=null;else if(e instanceof Le)this.index=e;else{const n=e.length>0&&TR(e)>65535;this.index=new Le(n?new Uint32Array(e):new Uint16Array(e),1)}return this}get position(){return this.attributes.position}set position(e){e===void 0?delete this.attributes.position:this.attributes.position=e}get normal(){return this.attributes.normal}set normal(e){e===void 0?delete this.attributes.normal:this.attributes.normal=e}get uv(){return this.attributes.uv}set uv(e){e===void 0?delete this.attributes.uv:this.attributes.uv=e}get vertexCount(){return this.index?this.index.count:this.attributes.position?.count??0}get drawCount(){return this.index?this.index.count:this.attributes.position?.count??0}dispose(){this.dispatchEvent({type:"dispose"})}}var Qr=(t=>(t[t.FrontSide=0]="FrontSide",t[t.BackSide=1]="BackSide",t[t.DoubleSide=2]="DoubleSide",t))(Qr||{}),qs=(t=>(t[t.NoBlending=0]="NoBlending",t[t.NormalBlending=1]="NormalBlending",t[t.AdditiveBlending=2]="AdditiveBlending",t))(qs||{});class ub{name="";side=0;transparent=!1;opacity=1;depthTest=!0;depthWrite=!0;blending=1;get precision(){return this._precision}set precision(e){this._precision!==e&&(this._precision=e,this.needsUpdate=!0)}_precision=null;needsUpdate=!1;isMaterial=!0}class xn extends Vi{isMesh=!0;geometry;material;castShadow=!1;receiveShadow=!1;drawRange={start:0,count:1/0};constructor(e=new Jr,n=new ub){super(),this.geometry=e,this.material=n}}const CR=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],MR=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],RR=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];class db extends Jr{isLineSegmentsGeometry=!0;type="LineSegmentsGeometry";constructor(){super(),this.setIndex(RR),this.setAttribute("position",new Le(new Float32Array(CR),3)),this.setAttribute("uv",new Le(new Float32Array(MR),2))}setPositions(e){const n=e instanceof Float32Array?e:new Float32Array(e),r=Math.floor(n.length/6),s=new Float32Array(r*3),i=new Float32Array(r*3);for(let o=0;o<r;o++){const a=o*6;s[o*3]=n[a],s[o*3+1]=n[a+1],s[o*3+2]=n[a+2],i[o*3]=n[a+3],i[o*3+1]=n[a+4],i[o*3+2]=n[a+5]}return this.setAttribute("instanceStart",new Le(s,3).setStepMode("instance")),this.setAttribute("instanceEnd",new Le(i,3).setStepMode("instance")),this.instanceCount=r,this}setColors(e){const n=e instanceof Float32Array?e:new Float32Array(e),r=Math.floor(n.length/6),s=new Float32Array(r*3),i=new Float32Array(r*3);for(let o=0;o<r;o++){const a=o*6;s[o*3]=n[a],s[o*3+1]=n[a+1],s[o*3+2]=n[a+2],i[o*3]=n[a+3],i[o*3+1]=n[a+4],i[o*3+2]=n[a+5]}return this.setAttribute("instanceColorStart",new Le(s,3).setStepMode("instance")),this.setAttribute("instanceColorEnd",new Le(i,3).setStepMode("instance")),this}computeLineDistances(){const e=this.attributes.instanceStart,n=this.attributes.instanceEnd;if(!e||!n)return this;const r=e.count,s=new Float32Array(r),i=new Float32Array(r);let o=0;for(let a=0;a<r;a++){s[a]=o;const l=n.getX(a)-e.getX(a),c=n.getY(a)-e.getY(a),u=n.getZ(a)-e.getZ(a);o+=Math.sqrt(l*l+c*c+u*u),i[a]=o}return this.setAttribute("instanceDistanceStart",new Le(s,1).setStepMode("instance")),this.setAttribute("instanceDistanceEnd",new Le(i,1).setStepMode("instance")),this}applyMatrix4(e){const n=this.attributes.instanceStart,r=this.attributes.instanceEnd;if(n&&r){const s=n.array,i=r.array;for(let o=0;o<n.count;o++)ss.set(s[o*3],s[o*3+1],s[o*3+2]).applyMatrix4(e),s[o*3]=ss.x,s[o*3+1]=ss.y,s[o*3+2]=ss.z,ss.set(i[o*3],i[o*3+1],i[o*3+2]).applyMatrix4(e),i[o*3]=ss.x,i[o*3+1]=ss.y,i[o*3+2]=ss.z;n.needsUpdate=!0,r.needsUpdate=!0}return this}}const ss=new gt;class PR{uniforms=new Map;attributes=new Map;varyings=new Map;samplers=new Map;stage="vertex";instancing=!1;instancingColor=!1;attribute(e,n,r="vertex"){let s=this.attributes.get(e);if(!s){const i=rR(n);this.attributes.set(e,{node:i,name:e,stepMode:r}),s=this.attributes.get(e)}return s.node}varying(e,n){let r=this.varyings.get(e);if(!r){const s=sR(n);this.varyings.set(e,{node:s,name:e}),r=this.varyings.get(e)}return r.node}uniform(e,n,r,s){let i=this.uniforms.get(e);if(!i){const o=Lp(e,n);this.uniforms.set(e,{node:o,name:e,scope:r,value:s}),i=this.uniforms.get(e)}return i.node}materialUniform(e,n,r){return this.uniform(e,n,"material",r)}rendererUniform(e,n){return this.uniform(e,n,"renderer")}sampler(e,n,r){const s=typeof n=="string"?n:"sampler2D",i=typeof n=="string"?r:n;let o=this.samplers.get(e);if(!o){const a=Lp(e,s);this.samplers.set(e,{node:a,name:e,type:s,texture:i}),o=this.samplers.get(e)}return o.node}get position(){return this.stage==="vertex"?this.attribute("position","vec3"):this.varying("positionWorld","vec3")}get normal(){return this.stage==="vertex"?this.attribute("normal","vec3"):this.varying("normalWorld","vec3")}get uv(){return this.stage==="vertex"?this.attribute("uv","vec2"):this.varying("uv","vec2")}get instanceMatrix(){return this.attribute("instanceMatrix","mat4","instance")}get instanceColor(){return this.attribute("instanceColor","vec3","instance")}get positionWorld(){return this.varying("positionWorld","vec3")}get normalWorld(){return this.varying("normalWorld","vec3")}get uvVarying(){return this.varying("uv","vec2")}get instanceColorVarying(){return this.varying("instanceColor","vec3")}get cameraPosition(){return this.uniform("cameraPosition","vec3","camera")}get viewMatrix(){return this.uniform("viewMatrix","mat4","camera")}get projectionMatrix(){return this.uniform("projectionMatrix","mat4","camera")}get modelMatrix(){return this.uniform("modelMatrix","mat4","object")}get normalMatrix(){return this.uniform("normalMatrix","mat3","object")}get modelViewMatrix(){return this.viewMatrix.mul(this.modelMatrix)}get viewDirection(){return this.cameraPosition.sub(this.positionWorld).normalize()}}function Wp(t){const e=new Set,n=new Set,r=new Set,s=new Set,i=a=>{if(!a||typeof a!="object"||s.has(a))return;s.add(a);const l=a.type;if(l==="uniform"||l==="uniformArray"?e.add(a):l==="attribute"?n.add(a):l==="varying"&&r.add(a),Array.isArray(a.params))for(const c of a.params)i(c)},o=Array.isArray(t)?t:[t];for(const a of o)i(a);return{uniforms:e,attributes:n,varyings:r}}function Dt(t,e){if(t!==void 0)return typeof t=="function"?t(e):t}class pr extends ub{isNodeMaterial=!0;colorNode;opacityNode;roughnessNode;metalnessNode;emissiveNode;normalNode;positionNode;uvNode;vertexNode;fragmentNode;setup(e,n){}buildVertexBody(e){const n=Dt(this.positionNode,e)??e.position,r=Ie(n,1),s=e.instancing?e.instanceMatrix.mul(r):r,i=e.modelMatrix.mul(s);e.positionWorld.assign(i.xyz);let o=Dt(this.normalNode,e)??e.normal;return e.instancing&&(o=yh(e.instanceMatrix).mul(o)),e.normalWorld.assign(e.normalMatrix.mul(o).normalize()),e.uvVarying.assign(e.uv),e.instancingColor&&e.instanceColorVarying.assign(e.instanceColor),e.projectionMatrix.mul(e.viewMatrix.mul(i))}buildFragmentBody(e){return Ie(1,1,1,1)}build(e,n={}){const r=new PR;r.instancing=n.instancing??!1,r.instancingColor=n.instancingColor??!1,this.setup(r,e),r.stage="vertex";const s=Ip(()=>this.vertexNode?this.vertexNode(r):this.buildVertexBody(r))();r.stage="fragment";const i=Ip(()=>{const d=oR("vec4"),h=this.fragmentNode?this.fragmentNode(r):this.buildFragmentBody(r),f=r.instancingColor?Ie(h.rgb.mul(r.instanceColorVarying),h.a):h;return d.assign(f),d})(),o=Wp(s),a=Wp(i),l=new Set([...o.uniforms,...a.uniforms]),c=new Set([...o.attributes,...a.attributes]),u=new Set([...o.varyings,...a.varyings]);return{vertexRoot:s,fragmentRoot:i,uniforms:[...r.uniforms.values()].filter(d=>l.has(d.node)),attributes:[...r.attributes.values()].filter(d=>c.has(d.node)),varyings:[...r.varyings.values()].filter(d=>u.has(d.node)),samplers:[...r.samplers.values()]}}}class _h extends pr{isLine2NodeMaterial=!0;color=new tn(1,1,1);linewidth=1;dashSize=1;gapSize=1;dashOffset=0;dashScale=1;lineWidthNode;dashSizeNode;gapSizeNode;dashOffsetNode;dashScaleNode;offsetNode;colorUniform;lineWidthUniform;resolutionUniform;dashScaleUniform;dashSizeUniform;gapSizeUniform;dashOffsetUniform;_worldUnits=!1;_dashed=!1;_vertexColors=!1;_alphaToCoverage=!0;constructor(e={}){super(),this.side=Qr.DoubleSide,e.color!==void 0&&(this.color=typeof e.color=="number"?new tn().setHex(e.color):e.color.clone()),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.dashOffset!==void 0&&(this.dashOffset=e.dashOffset),e.dashScale!==void 0&&(this.dashScale=e.dashScale),e.worldUnits!==void 0&&(this._worldUnits=e.worldUnits),e.dashed!==void 0&&(this._dashed=e.dashed),e.vertexColors!==void 0&&(this._vertexColors=e.vertexColors),e.alphaToCoverage!==void 0&&(this._alphaToCoverage=e.alphaToCoverage),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.precision!==void 0&&(this.precision=e.precision)}get worldUnits(){return this._worldUnits}set worldUnits(e){this._worldUnits!==e&&(this._worldUnits=e,this.needsUpdate=!0)}get dashed(){return this._dashed}set dashed(e){this._dashed!==e&&(this._dashed=e,this.needsUpdate=!0)}get vertexColors(){return this._vertexColors}set vertexColors(e){this._vertexColors!==e&&(this._vertexColors=e,this.needsUpdate=!0)}get alphaToCoverage(){return this._alphaToCoverage}set alphaToCoverage(e){this._alphaToCoverage!==e&&(this._alphaToCoverage=e,this.needsUpdate=!0)}setup(e,n){this.colorUniform=e.materialUniform("materialColor","vec3",()=>this.color.toArray()),this.lineWidthUniform=e.materialUniform("materialLineWidth","float",()=>this.linewidth),this.resolutionUniform=e.rendererUniform("resolution","vec2"),this._dashed&&(this.dashScaleUniform=e.materialUniform("materialLineScale","float",()=>this.dashScale),this.dashSizeUniform=e.materialUniform("materialLineDashSize","float",()=>this.dashSize),this.gapSizeUniform=e.materialUniform("materialLineGapSize","float",()=>this.gapSize),this.dashOffsetUniform=e.materialUniform("materialLineDashOffset","float",()=>this.dashOffset))}buildVertexBody(e){const n=e.position,r=n.y.toVar("quadY"),s=n.x.toVar("quadX");e.uvVarying.assign(e.uv);const i=e.attribute("instanceStart","vec3","instance"),o=Ie(e.modelViewMatrix.mul(Ie(i,1))).toVar("start"),a=e.attribute("instanceEnd","vec3","instance"),l=Ie(e.modelViewMatrix.mul(Ie(a,1))).toVar("end");let c,u;this._dashed&&(c=e.attribute("instanceDistanceStart","float","instance").toVar("distanceStart"),u=e.attribute("instanceDistanceEnd","float","instance").toVar("distanceEnd")),this._worldUnits&&(e.varying("worldStart","vec3").assign(o.xyz),e.varying("worldEnd","vec3").assign(l.xyz));const d=wi(wi(e.projectionMatrix,2),3).equal(-1);if(wt(d,()=>{wt(o.z.lessThan(0).and(l.z.greaterThan(0)),()=>{const b=Vp(e,o,l);l.assign(Ie(kr(o.xyz,l.xyz,b),l.w)),c&&u&&u.assign(kr(c,u,b))}).ElseIf(l.z.lessThan(0).and(o.z.greaterThanEqual(0)),()=>{const b=Vp(e,l,o);o.assign(Ie(kr(l.xyz,o.xyz,b),o.w)),c&&u&&c.assign(kr(u,c,b))})}),this._dashed){const b=Dt(this.dashScaleNode,e)??this.dashScaleUniform,v=Dt(this.offsetNode,e)??this.dashOffsetUniform,x=r.lessThan(.5).select(b.mul(c),b.mul(u)).add(v);e.varying("lineDistance","float").assign(x)}const h=e.projectionMatrix.mul(o),f=e.projectionMatrix.mul(l),m=h.xyz.div(h.w),p=f.xyz.div(f.w),y=Dt(this.lineWidthNode,e)??this.lineWidthUniform,g=Ie().toVar("clip");if(this._worldUnits){const b=l.xyz.sub(o.xyz).normalize(),v=kr(o.xyz,l.xyz,.5).normalize(),x=b.cross(v).normalize(),k=b.cross(x),C=e.varying("worldPos","vec4");C.assign(r.lessThan(.5).select(o,l));const E=y.mul(.5);C.assign(C.add(Ie(s.lessThan(0).select(x.mul(E),x.mul(E).negate()),0))),this._dashed||(C.assign(C.add(Ie(r.lessThan(.5).select(b.mul(E).negate(),b.mul(E)),0))),C.assign(C.add(Ie(k.mul(E),0))),wt(r.greaterThan(1).or(r.lessThan(0)),()=>{C.assign(C.sub(Ie(k.mul(2).mul(E),0)))})),g.assign(e.projectionMatrix.mul(C));const T=r.lessThan(.5).select(m,p).toVar("clipPose");g.z.assign(T.z.mul(g.w))}else{const b=this.resolutionUniform.x.div(this.resolutionUniform.y),v=p.xy.sub(m.xy).toVar("dir");v.x.assign(v.x.mul(b)),v.assign(v.normalize());const x=Vt(v.y,v.x.negate()).toVar("offset");v.x.assign(v.x.div(b)),x.x.assign(x.x.div(b)),x.assign(s.lessThan(0).select(x.negate(),x)),wt(r.lessThan(0),()=>{x.assign(x.sub(v))}).ElseIf(r.greaterThan(1),()=>{x.assign(x.add(v))}),x.assign(x.mul(y)),x.assign(x.div(this.resolutionUniform.y)),g.assign(r.lessThan(.5).select(h,f)),x.assign(x.mul(g.w)),g.assign(g.add(Ie(x,0,0)))}if(this._vertexColors){const b=e.attribute("instanceColorStart","vec3","instance"),v=e.attribute("instanceColorEnd","vec3","instance");e.varying("instanceColor","vec3").assign(r.lessThan(.5).select(b,v))}return g}buildFragmentBody(e){const n=e.uv;if(this._dashed){const o=Dt(this.dashSizeNode,e)??this.dashSizeUniform,a=Dt(this.gapSizeNode,e)??this.gapSizeUniform,l=e.varying("lineDistance","float");wt(n.y.lessThan(-1).or(n.y.greaterThan(1)),()=>{pa()}),wt(l.mod(o.add(a)).greaterThan(o),()=>{pa()})}const r=Dt(this.lineWidthNode,e)??this.lineWidthUniform;if(this._worldUnits){const o=e.varying("worldStart","vec3"),a=e.varying("worldEnd","vec3"),l=e.varying("worldPos","vec4").xyz.normalize().mul(1e5),c=a.sub(o),u=IR(o,a,Oe(0,0,0),l),d=o.add(c.mul(u.x)),h=l.mul(u.y),f=d.sub(h).length().div(r);wt(f.greaterThan(.5),()=>{pa()})}else wt(n.y.abs().greaterThan(1),()=>{const o=n.x,a=n.y.greaterThan(0).select(n.y.sub(1),n.y.add(1)),l=o.mul(o).add(a.mul(a));wt(l.greaterThan(1),()=>{pa()})});let s=Dt(this.colorNode,e)??this.colorUniform;this._vertexColors&&(s=s.mul(e.varying("instanceColor","vec3")));const i=Dt(this.opacityNode,e)??V(this.opacity);return Ie(s,i)}}function Vp(t,e,n){const r=wi(wi(t.projectionMatrix,2),2),s=wi(wi(t.projectionMatrix,3),2);return r.greaterThan(0).select(s.negate().div(r.add(1)),s.mul(-.5).div(r)).sub(e.z).div(n.z.sub(e.z))}function IR(t,e,n,r){const s=t.sub(n),i=r.sub(n),o=e.sub(t),a=s.dot(i),l=i.dot(o),c=s.dot(o),u=i.dot(i),d=o.dot(o).mul(u).sub(l.mul(l)),h=a.mul(l).sub(c.mul(u)).div(d).clamp(V(0),V(1)),f=a.add(l.mul(h)).div(u).clamp(V(0),V(1));return Vt(h,f)}class OR extends xn{isLineSegments2=!0;type="LineSegments2";resolution=new wh;constructor(e=new db,n=new _h){super(e,n)}computeLineDistances(){return this.geometry.computeLineDistances(),this}onBeforeRender=e=>{const n=e.getViewport(zR);this.resolution.set(n.z,n.w)}}const zR=new tc;class hb extends db{isLineGeometry=!0;type="LineGeometry";constructor(e){if(super(),e===void 0||e.length===0)return;let n;Array.isArray(e)&&typeof e[0]=="object"&&"x"in e[0]?n=new Float32Array(e.flatMap(o=>[o.x,o.y,o.z])):n=e instanceof Float32Array?e:new Float32Array(e);const r=Math.floor(n.length/3),s=Math.max(r-1,0),i=new Float32Array(s*6);for(let o=0;o<s;o++)i[o*6]=n[o*3],i[o*6+1]=n[o*3+1],i[o*6+2]=n[o*3+2],i[o*6+3]=n[o*3+3],i[o*6+4]=n[o*3+4],i[o*6+5]=n[o*3+5];this.setPositions(i)}}class LR extends OR{isLine2=!0;type="Line2";constructor(e=new hb,n=new _h){super(e,n)}}class Gi extends Jr{constructor(e=1,n=1,r=1){super();const s=1,i=1,o=1,a=[],l=[],c=[],u=[];let d=0;h("z","y","x",-1,-1,r,n,e,o,i),h("z","y","x",1,-1,r,n,-e,o,i),h("x","z","y",1,1,e,r,n,s,o),h("x","z","y",1,-1,e,r,-n,s,o),h("x","y","z",1,-1,e,n,r,s,i),h("x","y","z",-1,-1,e,n,-r,s,i);function h(f,m,p,y,g,b,v,x,k,C){const E=b/k,T=v/C,A=b/2,M=v/2,O=x/2,S=f==="x"?0:f==="y"?1:2,z=m==="x"?0:m==="y"?1:2,w=k+1,R=C+1,F=d;for(let D=0;D<R;D++){const Q=D*T-M;for(let H=0;H<w;H++){const J=H*E-A,N=S===0?J*y:z===0?Q*g:O,U=S===1?J*y:z===1?Q*g:O,ae=S===2?J*y:z===2?Q*g:O,ie=S===0||z===0?0:x>0?1:-1,q=S===1||z===1?0:x>0?1:-1,be=S===2||z===2?0:x>0?1:-1;l.push(N,U,ae),c.push(ie,q,be),u.push(H/k,1-D/C),d++}}for(let D=0;D<C;D++)for(let Q=0;Q<k;Q++){const H=F+Q+w*D,J=F+Q+w*(D+1),N=F+(Q+1)+w*(D+1),U=F+(Q+1)+w*D;a.push(H,J,U,J,N,U)}}this.setAttribute("position",new Le(new Float32Array(l),3)),this.setAttribute("normal",new Le(new Float32Array(c),3)),this.setAttribute("uv",new Le(new Float32Array(u),2)),this.setIndex(a)}}class rd extends Jr{constructor(e=1,n=1,r=1,s=1){super(),r=Math.floor(r),s=Math.floor(s);const i=r,o=s,a=i+1,l=o+1,c=e/i,u=n/o,d=[],h=[],f=[],m=[];for(let p=0;p<l;p++){const y=p*u-n/2;for(let g=0;g<a;g++){const b=g*c-e/2;h.push(b,-y,0),f.push(0,0,1),m.push(g/i,1-p/o)}}for(let p=0;p<o;p++)for(let y=0;y<i;y++){const g=y+a*p,b=y+a*(p+1),v=y+1+a*(p+1),x=y+1+a*p;d.push(g,b,x,b,v,x)}this.setAttribute("position",new Le(new Float32Array(h),3)),this.setAttribute("normal",new Le(new Float32Array(f),3)),this.setAttribute("uv",new Le(new Float32Array(m),2)),this.setIndex(d)}}class Fo extends pr{isMeshBasicMaterial=!0;color=new tn(1,1,1);map=null;colorUniform;opacityUniform;mapUniform;constructor(e={}){super(),e.color!==void 0&&(this.color=typeof e.color=="number"?new tn().setHex(e.color):e.color.clone()),e.map!==void 0&&(this.map=e.map),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.side!==void 0&&(this.side=e.side),e.precision!==void 0&&(this.precision=e.precision)}setup(e,n){this.colorUniform=e.materialUniform("materialColor","vec3",()=>this.color.toArray()),this.opacityUniform=e.materialUniform("materialOpacity","float",()=>this.opacity),this.map&&(this.mapUniform=e.sampler("map",()=>this.map))}buildFragmentBody(e){const n=Dt(this.colorNode,e)??this.colorUniform,r=Dt(this.opacityNode,e)??this.opacityUniform,s=Dt(this.uvNode,e)??e.uvVarying,i=this.mapUniform?n.mul(this.mapUniform.texture(s).rgb):n;return Ie(i,r)}}function $R(t,e){const n=[],r=[],s=[];e.traverseVisible(l=>{l instanceof mh?n.push(l):l instanceof gh?r.push(l):l instanceof K0&&s.push(l)});const i=t.materialUniform("ambientColor","vec3",()=>{let l=0,c=0,u=0;for(const d of n)l+=d.color.r*d.intensity,c+=d.color.g*d.intensity,u+=d.color.b*d.intensity;return[l,c,u]}),o=r.map((l,c)=>({color:t.materialUniform(`directionalColor${c}`,"vec3",()=>{const[u,d,h]=l.color.toArray();return[u*l.intensity,d*l.intensity,h*l.intensity]}),direction:t.materialUniform(`directionalDirection${c}`,"vec3",()=>l.getWorldPosition().sub(l.target.getWorldPosition()).normalize().toArray())})),a=s.map((l,c)=>({color:t.materialUniform(`pointColor${c}`,"vec3",()=>{const[u,d,h]=l.color.toArray();return[u*l.intensity,d*l.intensity,h*l.intensity]}),position:t.materialUniform(`pointPosition${c}`,"vec3",()=>l.getWorldPosition().toArray()),distance:t.materialUniform(`pointDistance${c}`,"float",()=>l.distance),decay:t.materialUniform(`pointDecay${c}`,"float",()=>l.decay)}));return{ambient:i,directionals:o,points:a}}function Gp(t,e,n,r,s,i,o,a){const l=r.add(n).normalize(),c=e.dot(r).clamp(1e-4,1),u=e.dot(l).clamp(1e-4,1),d=e.dot(n).clamp(1e-4,1),h=n.dot(l).clamp(1e-4,1),f=i.pow(4),m=u.pow(2),p=f.div(zp.mul(m.mul(f.sub(1)).add(1).pow(2))),y=c.mul(d.pow(2).mul(f.oneMinus()).add(f).sqrt()),g=d.mul(c.pow(2).mul(f.oneMinus()).add(f).sqrt()),b=y.add(g).reciprocal().mul(.5),v=a.add(a.oneMinus().mul(h.oneMinus().pow(5))),x=v.oneMinus().mul(o.oneMinus()),k=p.mul(b).mul(v);return t.div(zp).mul(x).add(k).mul(s).mul(c)}function DR(t,e,n,r){const s=e.distance(t).max(1e-4).toVar(),i=s.pow(r.negate()).toVar();return wt(n.greaterThan(0),()=>{const o=n.reciprocal().mul(s).pow(4).oneMinus().saturate().pow(2);i.assign(i.mul(o))}),i}class NR extends pr{isMeshStandardMaterial=!0;color=new tn(1,1,1);roughness=1;metalness=0;emissive=new tn(0,0,0);colorUniform;opacityUniform;roughnessUniform;metalnessUniform;emissiveUniform;lights;constructor(e={}){super(),e.color!==void 0&&(this.color=typeof e.color=="number"?new tn().setHex(e.color):e.color.clone()),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.emissive!==void 0&&(this.emissive=typeof e.emissive=="number"?new tn().setHex(e.emissive):e.emissive.clone()),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.side!==void 0&&(this.side=e.side),e.precision!==void 0&&(this.precision=e.precision)}setup(e,n){this.colorUniform=e.materialUniform("materialColor","vec3",()=>this.color.toArray()),this.opacityUniform=e.materialUniform("materialOpacity","float",()=>this.opacity),this.roughnessUniform=e.materialUniform("materialRoughness","float",()=>this.roughness),this.metalnessUniform=e.materialUniform("materialMetalness","float",()=>this.metalness),this.emissiveUniform=e.materialUniform("materialEmissive","vec3",()=>this.emissive.toArray()),this.lights=$R(e,n)}buildFragmentBody(e){const n=Dt(this.colorNode,e)??this.colorUniform,r=Dt(this.opacityNode,e)??this.opacityUniform,s=Dt(this.roughnessNode,e)??this.roughnessUniform,i=Dt(this.metalnessNode,e)??this.metalnessUniform,o=Dt(this.emissiveNode,e)??this.emissiveUniform,a=(Dt(this.normalNode,e)??e.normalWorld).normalize().toVar(),l=e.viewDirection.normalize().toVar(),c=Oe(.04).mix(n,i).toVar(),u=Oe(0).toVar();u.addAssign(o),u.addAssign(n.mul(this.lights.ambient));for(const d of this.lights.directionals){const h=d.direction.normalize();u.addAssign(Gp(n,a,l,h,d.color,s,i,c))}for(const d of this.lights.points){const h=d.position.sub(e.positionWorld).normalize(),f=DR(d.position,e.positionWorld,d.distance,d.decay);u.addAssign(Gp(n,a,l,h,d.color,s,i,c).mul(f))}return Ie(u,r)}}class nc extends fh{isTexture=!0;name="";image=null;needsUpdate=!0;magFilter=Ap;minFilter=Ap;wrapS=qc;wrapT=qc;wrapR=qc;userData={};constructor(e=null){super(),this.image=e}dispose(){this.dispatchEvent({type:"dispose"})}}class Yp extends nc{width;height;depth;format;type;constructor(e=null,n=1,r=1,s=1,i=kM,o=EM){super(),this.image=e,this.width=n,this.height=r,this.depth=s,this.format=i,this.type=o}}class FR{isWebGLRenderer=!0;canvas;gl;programs=new Map;geometryBuffers=new Map;attributeBuffers=new Map;bufferCapacities=new WeakMap;textures=new Map;renderTargets=new Map;clearColor=new tn(0,0,0);clearAlpha=1;animationCallback=null;animationHandle=null;precision;constructor(e,n={}){this.canvas=e??document.createElement("canvas"),this.precision=n.precision??"highp";const r=this.canvas.getContext("webgl2",{antialias:n.antialias??!0,depth:n.depth??!0});if(!r)throw new Error("[RMSL/scene] WebGL2 is not available on this canvas");this.gl=r}setClearColor(e,n=1){typeof e=="number"?this.clearColor.setHex(e):this.clearColor.copy(e),this.clearAlpha=n}setSize(e,n){this.canvas.width=e,this.canvas.height=n}setAnimationLoop(e){if(this.animationCallback=e,e&&this.animationHandle===null){const n=r=>{if(!this.animationCallback){this.animationHandle=null;return}this.animationCallback(r),this.animationHandle=requestAnimationFrame(n)};this.animationHandle=requestAnimationFrame(n)}}render(e,n,r=null){const s=this.gl;e.updateMatrixWorld(!0),n.updateMatrixWorld(!0),n.projectionMatrixInverse.copy(n.projectionMatrix).invert(),r!==null?(s.bindFramebuffer(s.FRAMEBUFFER,this.renderTargetFramebuffer(r,s)),s.viewport(0,0,r.width,r.height)):(s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height));const[i,o,a]=this.clearColor.toArray();s.clearColor(i,o,a,this.clearAlpha),s.clear(s.COLOR_BUFFER_BIT|s.DEPTH_BUFFER_BIT),s.enable(s.DEPTH_TEST),e.traverseVisible(l=>{if(l.isMesh){const c=l;c.onBeforeRender?.(this,e,n),this.drawMesh(c,e,n)}})}getViewport(e=new tc){const n=this.gl;return e.set(0,0,n.drawingBufferWidth,n.drawingBufferHeight),e}renderTargetFramebuffer(e,n=this.gl){const r=this.renderTargets.get(e);if(r!==void 0&&r.width===e.width&&r.height===e.height)return r.framebuffer;r!==void 0&&this.deleteRenderTarget(e,r,n);const s=n.createFramebuffer(),i=n.createTexture();n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,e.width,e.height,0,n.RGBA,n.UNSIGNED_BYTE,null),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,null);const o=n.createRenderbuffer();n.bindRenderbuffer(n.RENDERBUFFER,o),n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_COMPONENT24,e.width,e.height),n.bindRenderbuffer(n.RENDERBUFFER,null),n.bindFramebuffer(n.FRAMEBUFFER,s),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,i,0),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,o),n.bindFramebuffer(n.FRAMEBUFFER,null);const a={framebuffer:s,color:i,depth:o,width:e.width,height:e.height};return this.renderTargets.set(e,a),s}readPixels(e,n){const r=this.gl,s=n??new Uint8Array(e.width*e.height*4);return r.bindFramebuffer(r.READ_FRAMEBUFFER,this.renderTargetFramebuffer(e)),r.readPixels(0,0,e.width,e.height,r.RGBA,r.UNSIGNED_BYTE,s),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),s}readPixelsAsync(e,n){const r=this.gl,s=n??new Uint8Array(e.width*e.height*4),i=r.createBuffer();r.bindBuffer(r.PIXEL_PACK_BUFFER,i),r.bufferData(r.PIXEL_PACK_BUFFER,s.byteLength,r.STREAM_READ),r.bindFramebuffer(r.READ_FRAMEBUFFER,this.renderTargetFramebuffer(e)),r.readPixels(0,0,e.width,e.height,r.RGBA,r.UNSIGNED_BYTE,0),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.bindBuffer(r.PIXEL_PACK_BUFFER,null);const o=r.fenceSync(r.SYNC_GPU_COMMANDS_COMPLETE,0);return r.flush(),new Promise((a,l)=>{const c=()=>{const u=r.clientWaitSync(o,0,0);if(u===r.TIMEOUT_EXPIRED){requestAnimationFrame(c);return}if(r.deleteSync(o),u===r.WAIT_FAILED){r.deleteBuffer(i),l(new Error("[RMSL/scene] readPixelsAsync: GPU sync wait failed"));return}r.bindBuffer(r.PIXEL_PACK_BUFFER,i),r.getBufferSubData(r.PIXEL_PACK_BUFFER,0,s),r.bindBuffer(r.PIXEL_PACK_BUFFER,null),r.deleteBuffer(i),a(s)};c()})}drawMesh(e,n,r){const s=e.material;if(!s.isNodeMaterial)return;const i=e.isInstancedMesh===!0,o=i&&e.instanceColor!==null;this.usedTextureUnits.clear();const a=this.ensureProgram(s,n,i,o),l=this.gl;l.useProgram(a.glProgram),this.setRenderState(s),this.uploadUniforms(a,e,r),this.bindGeometry(e,a,e.geometry);const c=e.geometry,u=i?e.count:c.instanceCount,d=e.drawRange;if(c.index){const h=Kc(c.index.array,!0),f=h instanceof Uint16Array?l.UNSIGNED_SHORT:l.UNSIGNED_INT,m=Number.isFinite(d.count)?d.count:h.length;l.drawElementsInstanced(l.TRIANGLES,m,f,d.start*h.BYTES_PER_ELEMENT,u)}else{const h=Number.isFinite(d.count)?d.count:c.attributes.position?.count??0;l.drawArraysInstanced(l.TRIANGLES,d.start,h,u)}}setRenderState(e){const n=this.gl;switch(e.side){case Qr.FrontSide:n.enable(n.CULL_FACE),n.cullFace(n.BACK);break;case Qr.BackSide:n.enable(n.CULL_FACE),n.cullFace(n.FRONT);break;default:n.disable(n.CULL_FACE);break}e.depthTest?n.enable(n.DEPTH_TEST):n.disable(n.DEPTH_TEST),n.depthMask(e.depthWrite),e.transparent||e.blending!==qs.NormalBlending?(n.enable(n.BLEND),e.blending===qs.AdditiveBlending?n.blendFunc(n.SRC_ALPHA,n.ONE):n.blendFunc(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA)):n.disable(n.BLEND)}uploadUniforms(e,n,r){const s=this.gl;for(const i of e.program.uniforms){const o=e.uniformLocations.get(i.node.name);if(o==null)continue;let a;i.scope==="camera"?a=IM(i.name,r):i.scope==="object"?a=OM(i.name,n):i.scope==="renderer"?a=$M(i.name,this.gl.drawingBufferWidth,this.gl.drawingBufferHeight):a=i.value?.({camera:r,mesh:n})??[],!(Array.isArray(a)&&a.length===0)&&this.setUniform(o,i.node._t,a)}for(const i of e.program.samplers){const o=i.texture(),a=e.uniformLocations.get(i.name);if(!o||a==null)continue;const l=this.bindTexture(o,i.type);s.uniform1i(a,l)}}setUniform(e,n,r){const s=this.gl;if(typeof r=="number"){switch(n){case"float":s.uniform1f(e,r);break;case"int":case"bool":s.uniform1i(e,r);break}return}switch(n){case"float":s.uniform1f(e,r[0]);break;case"int":s.uniform1i(e,r[0]);break;case"bool":s.uniform1i(e,r[0]);break;case"vec2":s.uniform2f(e,r[0],r[1]);break;case"vec3":s.uniform3f(e,r[0],r[1],r[2]);break;case"vec4":s.uniform4f(e,r[0],r[1],r[2],r[3]);break;case"ivec2":s.uniform2i(e,r[0],r[1]);break;case"ivec3":s.uniform3i(e,r[0],r[1],r[2]);break;case"ivec4":s.uniform4i(e,r[0],r[1],r[2],r[3]);break;case"mat2":s.uniformMatrix2fv(e,!1,r);break;case"mat3":s.uniformMatrix3fv(e,!1,r);break;case"mat4":s.uniformMatrix4fv(e,!1,r);break}}bindTexture(e,n){const r=this.gl,s=n.endsWith("3D"),i=s?r.TEXTURE_3D:r.TEXTURE_2D,o=J0(n),a=this.nextTextureUnit();r.activeTexture(r.TEXTURE0+a);let l=this.textures.get(e);if(!l||e.needsUpdate){l||(l=r.createTexture(),this.textures.set(e,l),e.addEventListener("dispose",this.onTextureDispose)),r.bindTexture(i,l);const c=FM(e,n);r.texParameteri(i,r.TEXTURE_WRAP_S,tu(r,c.wrapS)),r.texParameteri(i,r.TEXTURE_WRAP_T,tu(r,c.wrapT)),s&&r.texParameteri(i,r.TEXTURE_WRAP_R,tu(r,c.wrapR)),r.texParameteri(i,r.TEXTURE_MIN_FILTER,Xp(r,c.minFilter)),r.texParameteri(i,r.TEXTURE_MAG_FILTER,Xp(r,c.magFilter));const u=e.image;if(ArrayBuffer.isView(u)){const d=e.width??1,h=e.height??1;if(o){const f=BM(e)===1,{internalFormat:m,format:p,type:y}=BR(r,n.startsWith("isampler"),u,f);if(s){const g=e.depth??1;r.texImage3D(i,0,m,d,h,g,0,p,y,u)}else r.texImage2D(i,0,m,d,h,0,p,y,u)}else if(s){const f=e.depth??1;r.texImage3D(i,0,r.RGBA,d,h,f,0,r.RGBA,r.UNSIGNED_BYTE,u)}else r.texImage2D(i,0,r.RGBA,d,h,0,r.RGBA,r.UNSIGNED_BYTE,u)}else u!=null&&!s&&!o&&r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,u);e.needsUpdate=!1}return r.bindTexture(i,l),a}onTextureDispose=e=>{const n=e.target,r=this.textures.get(n);r&&this.gl.deleteTexture(r),this.textures.delete(n),n.removeEventListener("dispose",this.onTextureDispose)};onGeometryDispose=e=>{const n=e.target,r=this.geometryBuffers.get(n);if(r){for(const s of r.attributes.values())this.gl.deleteBuffer(s);r.index&&this.gl.deleteBuffer(r.index)}this.geometryBuffers.delete(n),n.removeEventListener("dispose",this.onGeometryDispose)};nextTextureUnit(){const e=this.gl,n=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS);for(let r=0;r<n;r++)if(!this.usedTextureUnits.has(r))return this.usedTextureUnits.add(r),r;return 0}usedTextureUnits=new Set;ensureProgram(e,n,r,s){const i=NM(DM(n),r,s);let o=this.programs.get(e);const a=o?.get(i);if(a&&!e.needsUpdate)return a;const l=e.build(n,{instancing:r,instancingColor:s}),c=this.gl,u=PM(e,this.precision),d=this.compileShader(Np.vertex(l.vertexRoot,{precision:u}),c.VERTEX_SHADER),h=this.compileShader(Np.fragment(l.fragmentRoot,{precision:u}),c.FRAGMENT_SHADER),f=c.createProgram();if(c.attachShader(f,d),c.attachShader(f,h),c.linkProgram(f),!c.getProgramParameter(f,c.LINK_STATUS))throw new Error(`[RMSL/scene] program link failed:
${c.getProgramInfoLog(f)}`);const m=new Map;for(const g of l.uniforms)m.set(g.node.name,c.getUniformLocation(f,g.node.name));for(const g of l.samplers)m.set(g.name,c.getUniformLocation(f,g.name));const p=new Map;for(const g of l.attributes)p.set(g.node.name,c.getAttribLocation(f,g.node.name));const y={program:l,glProgram:f,uniformLocations:m,attributeLocations:p};return o||(o=new Map,this.programs.set(e,o)),o.set(i,y),e.needsUpdate=!1,y}compileShader(e,n){const r=this.gl,s=r.createShader(n);if(r.shaderSource(s,e),r.compileShader(s),!r.getShaderParameter(s,r.COMPILE_STATUS))throw new Error(`[RMSL/scene] shader compile failed:
${r.getShaderInfoLog(s)}
---
${e}`);return s}bindGeometry(e,n,r){const s=this.gl;let i=this.geometryBuffers.get(r);i||(i={attributes:new Map,index:null,needsUpload:!0},this.geometryBuffers.set(r,i),r.addEventListener("dispose",this.onGeometryDispose));const o=i.needsUpload||Object.values(r.attributes).some(a=>a.needsUpdate);for(const a of n.program.attributes){const l=zM(e,r,a.name),c=n.attributeLocations.get(a.node.name);if(!l||c==null)continue;const u=r.attributes[a.name]!==void 0;let d=u?i.attributes.get(a.name):this.attributeBuffers.get(l);const h=d===void 0;if(d||(d=s.createBuffer(),u?i.attributes.set(a.name,d):this.attributeBuffers.set(l,d)),h||l.needsUpdate){const g=Kc(l.array);d=this.uploadSlice(s,s.ARRAY_BUFFER,d,g,this.uploadRangeOf(g,l,h)),u?i.attributes.set(a.name,d):this.attributeBuffers.set(l,d),l.needsUpdate=!1}s.bindBuffer(s.ARRAY_BUFFER,d);const f=a.node._t==="mat4"?4:1,m=l.itemSize/f,p=Q0[HM(l,m)],y=l.itemSize*p.bytes;for(let g=0;g<f;g++)s.enableVertexAttribArray(c+g),s.vertexAttribPointer(c+g,m,s[p.gl],p.normalized,y,m*g*p.bytes),s.vertexAttribDivisor(c+g,a.stepMode==="instance"?1:0)}if(r.index){const a=i.index===null,l=i.index??(i.index=s.createBuffer());if(a||o||r.index.needsUpdate){const c=Kc(r.index.array,!0);i.index=this.uploadSlice(s,s.ELEMENT_ARRAY_BUFFER,l,c,this.uploadRangeOf(c,r.index,a)),r.index.needsUpdate=!1}s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,i.index)}i.needsUpload=!1}uploadRangeOf(e,n,r){if(r||n.updateRange.count===-1)return{byteOffset:0,byteEnd:e.byteLength};const s=e.BYTES_PER_ELEMENT,i=Math.min(e.byteLength,Math.max(0,n.updateRange.offset)*s),o=Math.min(e.byteLength,i+Math.max(0,n.updateRange.count)*s);return{byteOffset:i,byteEnd:o}}uploadSlice(e,n,r,s,{byteOffset:i,byteEnd:o}){e.bindBuffer(n,r);const a=this.bufferCapacities.get(r);if(a===void 0)return e.bufferData(n,s,e.STATIC_DRAW),this.bufferCapacities.set(r,s.byteLength),r;if(o>a){const l=Math.max(o,a*2),c=e.createBuffer();return e.bindBuffer(n,c),e.bufferData(n,l,e.STATIC_DRAW),e.bufferSubData(n,0,s),e.deleteBuffer(r),this.bufferCapacities.set(c,l),c}if(o>i){const l=s;e.bufferSubData(n,i,l.subarray(i/l.BYTES_PER_ELEMENT,o/l.BYTES_PER_ELEMENT))}return r}deleteRenderTarget(e,n,r=this.gl){r.deleteFramebuffer(n.framebuffer),r.deleteTexture(n.color),r.deleteRenderbuffer(n.depth),this.renderTargets.delete(e)}dispose(){const e=this.gl;for(const n of this.programs.values())for(const r of n.values())e.deleteProgram(r.glProgram);for(const[n,r]of this.geometryBuffers){for(const s of r.attributes.values())e.deleteBuffer(s);r.index&&e.deleteBuffer(r.index),n.removeEventListener("dispose",this.onGeometryDispose)}for(const n of this.attributeBuffers.values())e.deleteBuffer(n);for(const[n,r]of this.textures)e.deleteTexture(r),n.removeEventListener("dispose",this.onTextureDispose);for(const[n,r]of this.renderTargets)this.deleteRenderTarget(n,r);this.programs.clear(),this.geometryBuffers.clear(),this.attributeBuffers.clear(),this.textures.clear()}}function tu(t,e){switch(e){case"repeat":return t.REPEAT;case"mirror":return t.MIRRORED_REPEAT;default:return t.CLAMP_TO_EDGE}}function Xp(t,e){return e==="nearest"?t.NEAREST:t.LINEAR}function BR(t,e,n,r){const s=n.BYTES_PER_ELEMENT??1;return e?r?{internalFormat:t.R8I,format:t.RED_INTEGER,type:t.BYTE}:s===1?{internalFormat:t.RGBA8I,format:t.RGBA_INTEGER,type:t.BYTE}:s===2?{internalFormat:t.RGBA16I,format:t.RGBA_INTEGER,type:t.SHORT}:{internalFormat:t.RGBA32I,format:t.RGBA_INTEGER,type:t.INT}:r?{internalFormat:t.R8UI,format:t.RED_INTEGER,type:t.UNSIGNED_BYTE}:s===1?{internalFormat:t.RGBA8UI,format:t.RGBA_INTEGER,type:t.UNSIGNED_BYTE}:s===2?{internalFormat:t.RGBA16UI,format:t.RGBA_INTEGER,type:t.UNSIGNED_SHORT}:{internalFormat:t.RGBA32UI,format:t.RGBA_INTEGER,type:t.UNSIGNED_INT}}class UR{isRenderTarget=!0;width;height;constructor(e=1,n=1){this.width=e,this.height=n}}const HR={1:{top:"grass_top",side:"dirt_grass",bottom:"dirt"},2:{top:"dirt",side:"dirt",bottom:"dirt"},4:{top:"stone",side:"stone",bottom:"stone"},5:{top:"snow",side:"snow",bottom:"snow"},6:{top:"lava",side:"lava",bottom:"lava"},7:{top:"trunk_top",side:"trunk_side",bottom:"trunk_bottom"},8:{top:"leaves",side:"leaves",bottom:"leaves"},25:{top:"brick_red",side:"brick_red",bottom:"brick_red"},26:{top:"wood",side:"wood",bottom:"wood"},27:{top:"ice",side:"ice",bottom:"ice"},28:{top:"greystone",side:"greystone",bottom:"greystone"},29:{top:"lava",side:"lava",bottom:"lava"},16:{top:"lava",side:"lava",bottom:"lava"},17:{top:"lava",side:"lava",bottom:"lava"},18:{top:"lava",side:"lava",bottom:"lava"},19:{top:"lava",side:"lava",bottom:"lava"},20:{top:"lava",side:"lava",bottom:"lava"},21:{top:"lava",side:"lava",bottom:"lava"},22:{top:"lava",side:"lava",bottom:"lava"},24:{top:"lava",side:"lava",bottom:"lava"}},fb=t=>{const e=new DOMParser().parseFromString(t,"application/xml"),n=new Map,r=e.querySelectorAll("SubTexture");for(const s of r){const i=s.getAttribute("name");i!==null&&n.set(i.replace(/\.png$/i,""),{x:Number(s.getAttribute("x")),y:Number(s.getAttribute("y")),w:Number(s.getAttribute("width")),h:Number(s.getAttribute("height"))})}return n},jR=(t,e,n)=>{const r=[...t.values()],s=r[0];return s===void 0||!r.every(o=>o.w===s.w&&o.h===s.h&&o.x%s.w===0&&o.y%s.h===0)?null:{columns:Math.round(e/s.w),tilePixels:[s.w,s.h],sheetPixels:[e,n]}},nu=(t,e)=>Math.round(t.y/e.tilePixels[1])*e.columns+Math.round(t.x/e.tilePixels[0]),WR=(t,e,n)=>{const r=[],s={...HR,...n};for(const i of Object.keys(s)){const o=s[Number(i)],a=l=>{const c=t.get(l);if(c===void 0)throw new Error(`[atlas] missing subtexture "${l}"`);return c};r.push({id:Number(i),top:nu(a(o.top),e),side:nu(a(o.side),e),bottom:nu(a(o.bottom),e)})}return r},VR=async t=>{const e=await fetch(t);if(!e.ok)throw new Error(`[atlas] failed to load "${t}": ${e.status}`);const n=await createImageBitmap(await e.blob());return{texture:new nc(n),width:n.width,height:n.height}},je=24,sd="/big-mesh-studios/voxelscape/spritesheets/spritesheet_items.png",qp="/big-mesh-studios/voxelscape/spritesheets/spritesheet_items.xml",GR=1024,YR=1024,Zp=100,XR={r:0,g:0,b:0,a:255},qR=32,ZR=(t,e,n)=>{const r=new Uint8Array(n.w*n.h*4);for(let s=0;s<n.h;s++)for(let i=0;i<n.w;i++){const o=(n.y+s)*t.width+(n.x+i),a=s*n.w+i<<2;if(t.channels===1&&e!==void 0){const l=e[t.data[o]];r[a]=l[0],r[a+1]=l[1],r[a+2]=l[2],r[a+3]=l.length>3?l[3]:255}else{const l=o<<2;r[a]=t.data[l],r[a+1]=t.data[l+1],r[a+2]=t.data[l+2],r[a+3]=t.data[l+3]}}return{width:n.w,height:n.h,data:r}},KR=t=>{const{width:e,height:n,data:r}=t,s=(M,O)=>r[(O*e+M)*4+3];let i=e,o=n,a=-1,l=-1;for(let M=0;M<n;M++)for(let O=0;O<e;O++)s(O,M)<Zp||(O<i&&(i=O),O>a&&(a=O),M<o&&(o=M),M>l&&(l=M));a<0&&(i=0,o=0,a=e-1,l=n-1);const c=a-i+1,u=l-o+1,d=(M,O)=>{const S=i+Math.floor(M*c/je),z=i+Math.floor((M+1)*c/je),w=o+Math.floor(O*u/je),R=o+Math.floor((O+1)*u/je);let F=0,D=0,Q=0,H=0;for(let J=w;J<R;J++)for(let N=S;N<z;N++)s(N,J)<Zp||(F+=r[(J*e+N)*4],D+=r[(J*e+N)*4+1],Q+=r[(J*e+N)*4+2],H++);return H===0?null:{r:Math.round(F/H),g:Math.round(D/H),b:Math.round(Q/H)}},h=M=>Math.min(255,Math.round(M/16)*16),f=new Map,m=[];for(let M=0;M<je;M++)for(let O=0;O<je;O++){const S=d(O,M);if(S===null)continue;m.push({ox:O,oy:M,colour:S});const z=`${h(S.r)},${h(S.g)},${h(S.b)}`;f.set(z,(f.get(z)??0)+1)}const p=[XR];for(const M of[...f.entries()].sort((O,S)=>S[1]-O[1]).slice(0,qR-1).map(([O])=>O)){const[O,S,z]=M.split(",").map(Number);p.push({r:O,g:S,b:z,a:255})}const y=({r:M,g:O,b:S})=>{let z=0,w=1/0;for(let R=0;R<p.length;R++){const F=p[R].r-M,D=p[R].g-O,Q=p[R].b-S,H=F*F+D*D+Q*Q;H<w&&(w=H,z=R)}return z},g=vn.create(je,je);for(const{ox:M,oy:O,colour:S}of m)g.data[O*je+M]=y(S);const b=new Uint8Array(g.data),v=(M,O)=>M>=0&&O>=0&&M<je&&O<je&&b[O*je+M]!==vn.EMPTY;for(let M=0;M<je;M++)for(let O=0;O<je;O++)if(b[M*je+O]===vn.EMPTY)for(let S=M-1;S<=M+1;S++)for(let z=O-1;z<=O+1;z++)v(z,S)&&(g.data[M*je+O]=0);const x=vn.create(je,je);for(let M=0;M<je;M++)for(let O=0;O<je;O++)x.data[M*je+(je-1-O)]=g.data[M*je+O];const k=vn.create(je,je),C=vn.create(je,je),E=vn.create(je,je),T=vn.create(je,je);for(let M=0;M<je;M++)k.data[M*je+12]=0,C.data[M*je+11]=0,E.data[12*je+M]=0,T.data[11*je+M]=0;return{model:{sides:{front:g,back:x,left:k,right:C,top:E,bottom:T},palette:p,dimensions:{width:je,height:je,depth:je}},trim:{x:i,y:o,w:c,h:u}}},Kp=async t=>{const[e,n]=await Promise.all([fetch(sd),fetch(qp)]);if(!e.ok)throw new Error(`failed to load "${sd}": ${e.status}`);if(!n.ok)throw new Error(`failed to load "${qp}": ${n.status}`);const s=fb(await n.text()).get(t);if(s===void 0)throw new Error(`the items spritesheet has no "${t}"`);const i=Kd(new Uint8Array(await e.arrayBuffer()));if(i.depth!==8)throw new Error("the items spritesheet is not an 8-bit png");const{model:o,trim:a}=KR(ZR(i,i.palette,s));return{model:o,bbox:{x:s.x+a.x,y:s.y+a.y,w:a.w,h:a.h}}},ru=46,JR=t=>{const e=ru/Math.max(t.w,t.h),n=t.w*e,r=t.h*e;return{"background-image":`url("${sd}")`,"background-repeat":"no-repeat","background-size":`${GR*e}px ${YR*e}px`,"background-position":`${(ru-n)/2-t.x*e}px ${(ru-r)/2-t.y*e}px`}};var QR=pe("<div><div><div></div><div></div></div><div><div>"),eP=pe("<div><!><!>"),su=pe("<span>");const tP=()=>{const{inventory:t,editStatus:e,target:n,icons:r,scriptItem:s,npcAim:i}=fr(),o=ec("(any-pointer: coarse)"),[a,l]=ye(t.items()),[c,u]=ye(t.selectedId),d=()=>{l(t.items()),u(t.selectedId)};t.onChange=d,On(()=>{t.onChange===d&&(t.onChange=null)});const h=()=>{if(i()?.action==="use")return gn.strikeable;const v=n();if(v!==null)return v.kind==="actor"?gn.strikeable:gn.voxel};var f=QR(),m=f.firstChild,p=m.firstChild,y=p.nextSibling,g=m.nextSibling,b=g.firstChild;return ne(g,te(cn,{get each(){return a()},children:v=>{const x=()=>r()[v.id];var k=eP(),C=k.firstChild,E=C.nextSibling;return k.$$pointerdown=()=>t.setSelected(v.id),ne(k,(()=>{var T=Qt(()=>x()!==void 0);return()=>T()?(()=>{var A=su();return de(()=>({e:gn.icon,t:JR(x())}),({e:M,t:O},S)=>{X(A,M,S?.e),$d(A,O,S?.t)}),A})():(()=>{var A=su();return ne(A,()=>v.name[0]),de(()=>gn.name,(M,O)=>{X(A,M,O)}),A})()})(),C),ne(k,(()=>{var T=Qt(()=>!!v.stackable);return()=>T()?(()=>{var A=su();return ne(A,()=>v.count),de(()=>gn.count,(M,O)=>{X(A,M,O)}),A})():v.stackable})(),E),de(()=>({e:[gn.item,v.id===c()&&gn.active],t:v.name}),({e:T,t:A},M)=>{X(k,T,M?.e),A!==M?.t&&lt(k,"title",A)}),k}}),b),ne(b,()=>e()||(s()!==null?`holding ${s().name} — ${o()?"tap":"press E"} to use`:o()?"hold world to dig  •  tap to strike":"click to strike  •  right-click to use")),de(()=>({e:gn.hud,t:[gn.crosshair,h()],a:gn["vertical-stroke"],o:gn["horizontal-stroke"],i:gn.hotbar,n:gn.status}),({e:v,t:x,a:k,o:C,i:E,n:T},A)=>{X(f,v,A?.e),X(m,x,A?.t),X(p,k,A?.a),X(y,C,A?.o),X(g,E,A?.i),X(b,T,A?.n)}),f};zr(["pointerdown"]);const nP="_health_19jmo_1",rP="_heart_19jmo_15",sP="_hitFlash_19jmo_39",vr={health:nP,"on-coarse":"_on-coarse_19jmo_9",heart:rP,"heart-outline":"_heart-outline_19jmo_21","heart-red":"_heart-red_19jmo_27","heart-empty":"_heart-empty_19jmo_31","heart-glint":"_heart-glint_19jmo_35",hitFlash:sP},Wa=2,iP=3,Jp=.5,oP=.5,aP=.5,Qp=(t,e)=>{const n=Math.ceil(e/Wa),r=Math.max(0,Math.min(e,Math.floor(t))),s=[];let i=r;for(let o=0;o<n;o++)i>=Wa?(s.push(2),i-=Wa):i>0?(s.push(1),i=0):s.push(0);return s};class lP{onChange=null;maxHp=iP*Wa;hp=this.maxHp;dead=!1;guarding=!1;onFallDone;fallSeconds=0;fallDone=!1;constructor(e={}){this.onFallDone=e.onFallDone}setGuarding(e){this.guarding=e}takeDamage(e){const n=this.guarding?Math.ceil(e*aP):e,r=this.hp;this.hp=Math.max(0,this.hp-n);const s=r-this.hp;return s>0&&(this.emit(),r>0&&this.hp===0&&(this.dead=!0,this.fallSeconds=0,this.fallDone=!1)),s}kill(){this.dead||(this.hp!==0&&(this.hp=0,this.emit()),this.dead=!0,this.fallSeconds=0,this.fallDone=!1)}heal(e){const n=Math.min(this.maxHp,this.hp+e);n!==this.hp&&(this.hp=n,this.emit())}get fallProgress(){return Math.min(1,this.fallSeconds/Jp)}tick(e){this.dead&&(this.fallSeconds+=e,!this.fallDone&&this.fallSeconds>=Jp+oP&&(this.fallDone=!0,this.onFallDone?.()))}respawn(){this.dead=!1,this.guarding=!1,this.fallSeconds=0,this.fallDone=!1,this.hp=this.maxHp,this.emit()}emit(){this.onChange?.()}}var cP=pe('<svg viewBox="0 0 32 32"aria-hidden=true><path d="M16 28 C 6 22, 0 16, 0 10 C 0 4.5, 4.5 1, 8.5 1 C 11 1, 14 2.5, 16 6 C 18 2.5, 21 1, 23.5 1 C 27.5 1, 32 4.5, 32 10 C 32 16, 26 22, 16 28 Z"></path><path d="M16 28 C 6 22, 0 16, 0 10 C 0 4.5, 4.5 1, 8.5 1 C 11 1, 14 2.5, 16 6 L 16 28 Z"></path><path d="M16 6 C 18 2.5, 21 1, 23.5 1 C 27.5 1, 32 4.5, 32 10 C 32 16, 26 22, 16 28 L 16 6 Z">'),uP=pe("<svg><circle cx=10 cy=7 r=1.8></svg>",2),em=pe("<div>");const dP=500,hP=t=>(()=>{var e=cP(),n=e.firstChild,r=n.nextSibling,s=r.nextSibling;return ne(e,(()=>{var i=Qt(()=>t.fill>=1);return()=>i()&&(()=>{var o=uP();return de(()=>vr["heart-glint"],(a,l)=>{X(o,a,l)}),o})()})(),null),de(()=>({e:vr.heart,t:vr["heart-outline"],a:t.fill>=1?vr["heart-red"]:vr["heart-empty"],o:t.fill>=2?vr["heart-red"]:vr["heart-empty"]}),({e:i,t:o,a,o:l},c)=>{X(e,i,c?.e),X(n,o,c?.t),X(r,a,c?.a),X(s,l,c?.o)}),e})(),fP=()=>{const{health:t}=fr(),e=ec("(any-pointer: coarse)"),[n,r]=ye(Qp(t.hp,t.maxHp)),[s,i]=ye([]);let o=t.hp,a=0;const l=()=>{if(t.hp<o){const c=a++;i(u=>[...u,c]),setTimeout(()=>i(u=>u.filter(d=>d!==c)),dP)}o=t.hp,r(Qp(t.hp,t.maxHp))};return t.onChange=l,On(()=>{t.onChange===l&&(t.onChange=null)}),[(()=>{var c=em();return ne(c,te(cn,{get each(){return n()},children:u=>te(hP,{fill:u})})),de(()=>[vr.health,e()&&vr["on-coarse"]],(u,d)=>{X(c,u,d)}),c})(),te(cn,{get each(){return s()},children:()=>(()=>{var c=em();return de(()=>vr.hitFlash,(u,d)=>{X(c,u,d)}),c})()})]},pP="_panel_1cusw_1",mP="_row_1cusw_8",gP="_rowDim_1cusw_9",yP="_value_1cusw_21",Va={panel:pP,row:mP,rowDim:gP,value:yP};var bP=pe("<div><span></span><span>"),vP=pe("<div><!><!><!><!><!><!><!><!><!>");const wP=250,ma=t=>(t/1048576).toFixed(1),Dr=t=>(()=>{var e=bP(),n=e.firstChild,r=n.nextSibling;return ne(n,()=>t.name),ne(r,()=>t.value),de(()=>({e:t.dim===!0?Va.rowDim:Va.row,t:Va.value}),({e:s,t:i},o)=>{X(e,s,o?.e),X(r,i,o?.t)}),e})(),_P=()=>{const{player:t,stats:e}=fr(),[n,r]=ye({fps:0,worst:0}),[s,i]=ye(e()),[o,a]=ye({x:0,y:0,z:0});Ws(()=>{let v=0,x=performance.now(),k=x,C=0,E=0;const T=()=>{const A=performance.now(),M=A-x;if(x=A,C++,C>1&&(E=Math.max(E,M)),A-k>=wP){r({fps:C*1e3/(A-k),worst:E}),i(e());const O=t.position;a({x:Math.round(O.x),y:Math.round(O.y),z:Math.round(O.z)}),k=A,C=0,E=0}v=requestAnimationFrame(T)};return v=requestAnimationFrame(T),()=>cancelAnimationFrame(v)});const l=()=>s().voxelBytes+s().mergedGeometryBytes+s().blockGeometryBytes;var c=vP(),u=c.firstChild,d=u.nextSibling,h=d.nextSibling,f=h.nextSibling,m=f.nextSibling,p=m.nextSibling,y=p.nextSibling,g=y.nextSibling,b=g.nextSibling;return ne(c,te(Dr,{name:"frame",get value(){return`${n().fps.toFixed(0)} fps  worst ${n().worst.toFixed(1)}ms`}}),u),ne(c,te(Dr,{name:"heap",get value(){return Qt(()=>s().heapBytes===void 0)()?"not said":`${ma(s().heapBytes)} MiB`}}),d),ne(c,te(Dr,{name:"resident",get value(){return`${ma(l())} MiB`}}),h),ne(c,te(Dr,{name:"voxels + light",get value(){return ma(s().voxelBytes)},dim:!0}),f),ne(c,te(Dr,{name:"geometry",get value(){return ma(s().mergedGeometryBytes+s().blockGeometryBytes)},dim:!0}),m),ne(c,te(Dr,{name:"window",get value(){return`${s().blocks} blocks  r${s().chunkRadius}`}}),p),ne(c,te(Dr,{name:"drawing",get value(){return`${(s().triangles/1e3).toFixed(0)}k triangles`}}),y),ne(c,te(Dr,{name:"waiting",get value(){return`${s().fillsPending} fills  ${s().meshesPending} meshes`}}),g),ne(c,te(Dr,{name:"at",get value(){return`${o().x}  ${o().y}  ${o().z}`}}),b),de(()=>Va.panel,(v,x)=>{X(c,v,x)}),c},xP="_screen_1snf5_1",kP="_spinner_1snf5_20",SP="_track_1snf5_41",EP="_bar_1snf5_49",Ao={screen:xP,spinner:kP,track:SP,bar:EP},AP="_stack_1m3p6_1",TP="_toast_1m3p6_14",pb={stack:AP,toast:TP};var CP=pe("<div>"),MP=pe("<div><!><!>");let RP=0;const Sl=t=>(()=>{var e=CP();return ne(e,()=>t.children),de(()=>pb.toast,(n,r)=>{X(e,n,r)}),e})();function PP(){const[t,e]=ye([]);function n(r){e(s=>s.filter(i=>i.id!==r))}return{show(r,s){const i=RP++;return e(o=>[...o,{id:i,content:r}]),s!==void 0&&setTimeout(()=>n(i),s),()=>n(i)},Stack(r){var s=MP(),i=s.firstChild,o=i.nextSibling;return ne(s,()=>r.children,i),ne(s,te(cn,{get each(){return t()},children:a=>te(Sl,{get children(){return a.content()}})}),o),de(()=>pb.stack,(a,l)=>{X(s,a,l)}),s}}}var IP=pe("<div><div>generating terrain</div><div>"),OP=pe("<div><div>"),zP=pe("<span> blocks to go");const LP=()=>{const{loading:t}=fr();return te($e,{get when(){return!t().spawnDrawn},get children(){var e=IP(),n=e.firstChild,r=n.nextSibling;return de(()=>({e:Ao.screen,t:Ao.title,a:Ao.spinner}),({e:s,t:i,a:o},a)=>{X(e,s,a?.e),X(n,i,a?.t),X(r,o,a?.a)}),e}})},$P=()=>{const{loading:t}=fr(),e=()=>`${t().drawn/t().total*100}%`,n=()=>t().total-t().drawn;return te($e,{get when(){return Qt(()=>!!t().spawnDrawn)()?n()>0:t().spawnDrawn},get children(){return te(Sl,{get children(){return[(()=>{var r=OP(),s=r.firstChild;return de(()=>({e:Ao.track,t:Ao.bar,a:e()}),({e:i,t:o,a},l)=>{X(r,i,l?.e),X(s,o,l?.t),a!==l?.a&&Mt(s,"width",a)}),r})(),(()=>{var r=zP(),s=r.firstChild;return ne(r,n,s),r})()]}})}})},DP=16384,NP=1e3;class FP{constructor(e,n,r=NP){this.probe=e,this.source=n,this.waitMs=r}probe;source;waitMs;startedAt;startedOn="";name="";marks=[];events=[];startPicture;setup={};wanted=[];get recording(){return this.startedAt!==void 0}get marked(){return this.marks.length}start(e){return this.name=e,this.startedAt=performance.now(),this.startedOn=new Date().toISOString(),this.marks=[],this.events=[],this.setup=El(this.source.setup()),this.probe.arm(DP),this.startPicture=void 0,this.wantPicture().then(n=>{this.startPicture=n}),this.setup}mark(e){if(this.startedAt===void 0)return;const n={at:(performance.now()-this.startedAt)/1e3,note:e,pose:this.source.pose()};this.marks.push(n),this.wantPicture().then(r=>{n.picture=r})}event(e,n={}){if(this.startedAt===void 0)return;const r={at:(performance.now()-this.startedAt)/1e3,kind:e,...n,pose:this.source.pose()};this.events.push(r),e==="death"&&this.wantPicture().then(s=>{r.picture=s})}wantPicture(){return new Promise(e=>{let n=!1;const r=s=>{n||(n=!0,e(s))};this.wanted.push(r),setTimeout(()=>{this.wanted=this.wanted.filter(s=>s!==r),r(void 0)},this.waitMs)})}takePicture(e){const n=this.wanted;if(n.length===0)return;this.wanted=[];let r;try{r=e.toDataURL("image/png")}catch{}for(const s of n)s(r)}async snap(e){const n=El(this.source.setup()),r=this.source.pose(),s=await this.wantPicture();return{name:e,startedAt:new Date().toISOString(),seconds:0,setup:n,startPicture:s,marks:[{at:0,note:e,pose:r,picture:s}],events:[],frames:this.probe.drain()}}async stop(){if(this.startedAt===void 0)return;const e=await this.wantPicture(),n=(performance.now()-this.startedAt)/1e3,r=this.probe.drain();return this.probe.disarm(),this.startedAt=void 0,{name:this.name,startedAt:this.startedOn,seconds:n,setup:this.setup,startPicture:this.startPicture,endPicture:e,marks:this.marks,events:this.events,frames:r}}}const El=t=>typeof t=="number"&&!Number.isFinite(t)?t>0?"Infinity":"-Infinity":Array.isArray(t)?t.map(El):t!==null&&typeof t=="object"?Object.fromEntries(Object.entries(t).map(([e,n])=>[e,El(n)])):t,mb=t=>t==null?"unset":Array.isArray(t)?t.join(", "):typeof t=="object"?Object.entries(t).map(([e,n])=>`${e} ${mb(n)}`).join(", "):String(t),BP=t=>Object.entries(t).map(([e,n])=>`${e}: ${mb(n)}`).join(`
`);function UP(t){const{oauth:e,identity:n,store:r}=t;let s={status:"unknown",did:null,error:null},i,o;const a=u=>{s={...s,...u},t.onChange?.(s)},l=u=>a({status:"error",error:u instanceof Error?u.message:String(u)}),c=async u=>{i=await r.adopt({did:u,resolveService:d=>n.service(d)}),a({status:"connected",did:i.did,error:null}),t.onConnected?.(i.did)};return{get state(){return s},get repoClient(){return i?.client},restore(){return o??=(async()=>{try{a({status:"connecting",error:null}),await e.configureOAuthClient();const[u]=r.stored();if(u===void 0){a({status:"anonymous"});return}await c(u)}catch(u){l(u)}})(),o},async signIn(u){const d=u.trim().replace(/^@/,"");if(!px(d)){a({status:s.did===null?"error":"connected",error:`"${u}" is not a handle or an account identifier`});return}try{a({status:"connecting",error:null}),await e.configureOAuthClient(),await c(await e.signInPopup({identifier:d}))}catch(h){l(h)}},async signOut(){await i?.end().catch(()=>{}),i=void 0,o=void 0,a({status:"anonymous",did:null,error:null}),t.onSignedOut?.()},dispose(){i=void 0}}}const gb=()=>{const t=globalThis.navigator?.locks;if(t===void 0)throw new Error("web locks api is unavailable, a secure context is required");return t},tm="2",HP=1e4,Qi=(t,e)=>t.expiresAt!==null&&e>t.expiresAt,jP=({name:t})=>{const e=new AbortController,n=e.signal,r=new BroadcastChannel(`${t}:sync`);n.addEventListener("abort",()=>r.close());const s=`${t}:version`;let i;try{i=localStorage.getItem(s)===tm}catch{i=!0}const o=(l,c,u=!1)=>{const d=`${t}:${l}:`,h=`${t}:${l}`,f=new Map,m=new Set;let p=0;const y=E=>{for(const T of m)T(E)},g=()=>{if(n.aborted)throw new Error("store closed")},b=E=>{let T;try{T=localStorage.getItem(d+E)}catch{return}if(T!==null)try{const A=JSON.parse(T);return A===null||typeof A!="object"?void 0:{...A,revision:A.revision??0}}catch{return}},v=E=>{g();const T=b(E),A=f.get(E);return A===void 0?T:T===void 0||A.revision>T.revision?A.envelope:T},x=(E,T,A)=>{try{r.postMessage({store:l,key:E,envelope:T,revision:A})}catch{}},k=(E,T,A)=>{if(T===null){f.delete(E),y(E);return}const M=f.get(E);M!==void 0&&M.revision>=A||(f.set(E,{envelope:T,revision:A}),y(E))};r.addEventListener("message",E=>{const T=E.data;T!==null&&typeof T=="object"&&T.store===l&&k(T.key,T.envelope,T.revision)},{signal:n}),globalThis.addEventListener("storage",E=>{if(E.key===null||!E.key.startsWith(d))return;const T=E.key.slice(d.length);if(E.newValue===null){k(T,null,0);return}try{const A=JSON.parse(E.newValue);A!==null&&typeof A=="object"&&k(T,A,A.revision??0)}catch{}},{signal:n});const C=()=>{const E=[];try{for(let T=0,A=localStorage.length;T<A;T++){const M=localStorage.key(T);M!==null&&M.startsWith(d)&&E.push(M.slice(d.length))}}catch{}return E};i||WP(h,d);{const E=async T=>{if(!T||n.aborted||(await new Promise(M=>setTimeout(M,HP)),n.aborted))return;const A=Date.now();for(const M of C()){const O=b(M);if(!(O===void 0||!Qi(O,A)))try{localStorage.removeItem(d+M)}catch{}}};gb().request(`${d}cleanup`,{ifAvailable:!0},E)}return{get(E){const T=v(E);if(!(T===void 0||Qi(T,Date.now())))return T.value},getRecord(E){const T=v(E);if(!(T===void 0||Qi(T,Date.now())))return{value:T.value,revision:T.revision}},getWithLapsed(E){const T=v(E),A=Date.now();if(T===void 0||Qi(T,A))return[void 0,1/0];const M=T.updatedAt;return M===void 0?[T.value,1/0]:[T.value,A-M]},set(E,T){const A=v(E),M=Math.max((A?.revision??0)+1,p+1,Date.now());p=M;const O={value:T,expiresAt:c(T),updatedAt:u?Date.now():void 0,revision:M};try{localStorage.setItem(d+E,JSON.stringify(O))}catch(S){throw f.set(E,{envelope:O,revision:O.revision,unpersisted:!0}),y(E),S}return f.set(E,{envelope:O,revision:O.revision}),y(E),x(E,O,O.revision),O.revision},delete(E){g();try{localStorage.removeItem(d+E)}catch{}f.delete(E),y(E),x(E,null,0)},keys(){g();const E=Date.now(),T=new Set(C());for(const[M,O]of f)O.unpersisted&&T.add(M);const A=[];for(const M of T){const O=v(M);O!==void 0&&!Qi(O,E)&&A.push(M)}return A},watch(E){return m.add(E),()=>{m.delete(E)}}}},a={dispose:()=>{e.abort()},sessions:o("sessions",({token:l})=>l.refresh?null:l.expires_at??null),states:o("states",l=>Date.now()+600*1e3),dpopNonces:o("dpopNonces",l=>Date.now()+1440*60*1e3,!0),inflightDpop:new Map};if(!i)try{localStorage.setItem(s,tm)}catch{}return a},WP=(t,e)=>{let n;try{n=localStorage.getItem(t)}catch{return}if(n===null)return;let r;try{r=JSON.parse(n)}catch{return}if(!(r===null||typeof r!="object"))for(const s in r){const i=r[s];if(i===null||typeof i!="object")continue;const o=e+s;try{if(localStorage.getItem(o)!==null)continue;const a={value:i.value,expiresAt:i.expiresAt??null,updatedAt:i.updatedAt,revision:1};localStorage.setItem(o,JSON.stringify(a))}catch{return}}};let xh,kh,id,yb,kn,bb;const VP=t=>{({identityResolver:bb,fetchClientAssertion:id,onPersistError:yb}=t),{client_id:xh,redirect_uri:kh}=t.metadata,kn?.dispose(),kn=jP({name:t.storageName??"atcute-oauth"})};class eo extends Error{name="LoginError"}class GP extends Error{name="AuthorizationError"}class ir extends Error{name="ResolverError"}class Al extends Error{name="TokenRefreshError";sub;constructor(e,n,r){super(n,r),this.sub=e}}class vb extends Error{name="OAuthResponseError";response;data;error;description;constructor(e,n){const r=nm(rm(n)?.error),s=nm(rm(n)?.error_description),i=r?`"${r}"`:"unknown",o=s?`: ${s}`:"",a=`OAuth ${i} error${o}`;super(a),this.response=e,this.data=n,this.error=r,this.description=s}get status(){return this.response.status}get headers(){return this.response.headers}}class YP extends Error{name="FetchResponseError";response;status;constructor(e,n,r){super(r),this.response=e,this.status=n}}const nm=t=>typeof t=="string"?t:void 0,rm=t=>typeof t=="object"&&t!==null&&!Array.isArray(t)?t:void 0;let XP="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict",wb=(t=21)=>{let e="",n=crypto.getRandomValues(new Uint8Array(t|=0));for(;t--;)e+=XP[n[t]&63];return e};const qP=(t,e,n)=>r=>{const s=(1<<e)-1;let i="",o=0,a=0;for(let l=0;l<r.length;++l)for(a=a<<8|r[l],o+=8;o>e;)o-=e,i+=t[s&a>>o];if(o!==0&&(i+=t[s&a<<e-o]),n)for(;(i.length*e&7)!==0;)i+="=";return i},ZP=t=>t.toBase64({alphabet:"base64url",omitPadding:!0}),KP="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",JP=qP(KP,6,!1),QP="fromBase64"in Uint8Array,Sh=QP?ZP:JP,eI={ES256:"SHA-256",ES384:"SHA-384",ES512:"SHA-512",PS256:"SHA-256",PS384:"SHA-384",PS512:"SHA-512",RS256:"SHA-256",RS384:"SHA-384",RS512:"SHA-512"},tI={ES256:"P-256",ES384:"P-384",ES512:"P-521",PS256:null,PS384:null,PS512:null,RS256:null,RS384:null,RS512:null},Mi=t=>eI[t],_b=t=>tI[t],nI=t=>t.startsWith("ES")?{name:"ECDSA",hash:{name:Mi(t)}}:t.startsWith("PS")?{name:"RSA-PSS",hash:{name:Mi(t)},saltLength:iI(Mi(t))}:{name:"RSASSA-PKCS1-v1_5"},rI=(t,e)=>{if(t.startsWith("ES")){const n=e??_b(t);if(!n)throw new Error(`unable to determine curve for ${t}`);return{name:"ECDSA",namedCurve:n}}return t.startsWith("PS")?{name:"RSA-PSS",hash:{name:Mi(t)}}:{name:"RSASSA-PKCS1-v1_5",hash:{name:Mi(t)}}},sI=t=>{const e=_b(t);if(e)return{name:"ECDSA",namedCurve:e};const n={name:Mi(t)};return{name:t.startsWith("PS")?"RSA-PSS":"RSASSA-PKCS1-v1_5",hash:n,modulusLength:2048,publicExponent:new Uint8Array([1,0,1])}},iI=t=>{switch(t){case"SHA-256":return 32;case"SHA-384":return 48;case"SHA-512":return 64}},oI=["ES256","ES384","ES512","PS256","PS384","PS512","RS256","RS384","RS512"],aI=t=>oI.includes(t),xb=(t,e,n)=>{if(t.kty==="EC"){const{crv:r,x:s,y:i}=t;return{kty:"EC",crv:r,x:s,y:i,kid:e,alg:n,use:"sig"}}if(t.kty==="RSA"){const{n:r,e:s}=t;return{kty:"RSA",n:r,e:s,kid:e,alg:n,use:"sig"}}throw new Error("unsupported key type")},lI=async(t,e)=>{if(!("d"in t)||!t.d)throw new Error("expected a private key (missing 'd' parameter)");if(t.kty==="EC"&&!e.startsWith("ES"))throw new Error(`algorithm ${e} does not match ec key`);if(t.kty==="RSA"&&e.startsWith("ES"))throw new Error(`algorithm ${e} does not match rsa key`);const n=rI(e,t.kty==="EC"?t.crv:void 0),r=await crypto.subtle.importKey("jwk",t,n,!0,["sign"]);if(!(r instanceof CryptoKey))throw new Error("expected asymmetric key, got symmetric");return r},cI=async(t,e,n)=>{const r=await crypto.subtle.exportKey("jwk",t);return r.alg=e,r},od=new WeakMap,uI=async t=>{const e=od.get(t);if(e)return e;const{alg:n}=t,r=await lI(t,n),s=xb(t,t.kid,n),i={cryptoKey:r,publicJwk:s};return od.set(t,i),i},dI=(t,e)=>{const n=xb(t,t.kid,t.alg);od.set(t,{cryptoKey:e,publicJwk:n})},hI=async t=>{const{header:e,payload:n,key:r,alg:s}=t,i={...e,alg:s},o=sm(i),a=sm(n),l=`${o}.${a}`,c=await crypto.subtle.sign(nI(s),r,Fd(l)),u=Sh(new Uint8Array(c));return`${l}.${u}`},sm=t=>Sh(Fd(JSON.stringify(t))),kb=async t=>{const e=Fd(t),n=await dx(e);return Sh(n)},Sb=t=>{const e=t.alg;let n;return async(r,s,i,o)=>{n||=uI(t);const{cryptoKey:a,publicJwk:l}=await n,c=Math.floor(Date.now()/1e3);return hI({header:{typ:"dpop+jwt",jwk:l},payload:{htm:r,htu:s,iat:c,jti:wb(24),nonce:i,ath:o},key:a,alg:e})}},im=["ES256","ES384","ES512","PS256","PS384","PS512","RS256","RS384","RS512"],fI=t=>t.toSorted((e,n)=>{const r=im.indexOf(e),s=im.indexOf(n);return r===-1&&s===-1?0:r===-1?1:s===-1?-1:r-s}),pI=async t=>{const e=t?.filter(aI)??[];if(t?.length&&e.length===0)throw new Error("no supported algorithms provided");const n=e.length?fI(e):["ES256"],r=[];for(const s of n)try{const i=await crypto.subtle.generateKey(sI(s),!0,["sign","verify"]),o=await cI(i.privateKey,s);return dI(o,i.privateKey),o}catch(i){r.push(i)}throw new AggregateError(r,`failed to generate DPoP key for any of: ${n.join(", ")}`)},mI=async(t=64)=>{const e=wb(t),n=await kb(e);return{verifier:e,challenge:n,method:"S256"}};let gI="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict",yI=(t=21)=>{let e="",n=crypto.getRandomValues(new Uint8Array(t|=0));for(;t--;)e+=gI[n[t]&63];return e};const rc=t=>t.get("content-type")?.split(";")[0],bI="parse"in URL,vI=t=>{let e=null;if(bI)e=URL.parse(t);else try{e=new URL(t)}catch{}return e!==null?e.protocol==="https:"||e.protocol==="http:":!1},Eb=async t=>{const e=await bb.resolve(t);return{identity:e,metadata:await Tb(e.pds)}},wI=async t=>{try{return{metadata:await Tb(t)}}catch(e){if(e instanceof ir)try{return{metadata:await Ab(t)}}catch{}throw e}},_I=async t=>{const e=new URL("/.well-known/oauth-protected-resource",t),n=await fetch(e.href,{redirect:"manual",headers:{accept:"application/json"}});if(n.status!==200||rc(n.headers)!=="application/json")throw new ir("unexpected response");const r=await n.json();if(r.resource!==e.origin)throw new ir("unexpected issuer");return r},Ab=async t=>{const e=new URL("/.well-known/oauth-authorization-server",t),n=await fetch(e.href,{redirect:"manual",headers:{accept:"application/json"}});if(n.status!==200||rc(n.headers)!=="application/json")throw new ir("unexpected response");const r=await n.json();if(r.issuer!==e.origin)throw new ir("unexpected issuer");if(!vI(r.authorization_endpoint))throw new ir("authorization server provided incorrect authorization endpoint");if(!r.client_id_metadata_document_supported)throw new ir("authorization server does not support 'client_id_metadata_document'");if(!r.pushed_authorization_request_endpoint)throw new ir("authorization server does not support 'pushed_authorization request'");if(r.response_types_supported&&!r.response_types_supported.includes("code"))throw new ir("authorization server does not support 'code' response type");return r},Tb=async t=>{const e=await _I(t);if(e.authorization_servers?.length!==1)throw new ir("expected exactly one authorization server in the listing");const n=e.authorization_servers[0],r=await Ab(n);if(r.protected_resources&&!r.protected_resources.includes(e.resource))throw new ir("server is not in authorization server's jurisdiction");return r},xI=180*1e3,kI=5e3,SI=async(t,e)=>{let n;try{await Promise.race([t,new Promise(r=>{n=setTimeout(r,e)})])}finally{clearTimeout(n)}},ad=(t,e)=>{const n=kn.dpopNonces,r=kn.inflightDpop,s=Sb(t);return async(i,o)=>{const a=o?.body instanceof ReadableStream||i instanceof Request&&o?.body==null&&i.body!==null,l=new Request(i,o),c=l.headers.get("authorization"),u=c?.startsWith("DPoP ")?await kb(c.slice(5)):void 0,{method:d,url:h}=l,{origin:f,pathname:m}=new URL(h),p=f+m;{const x=r.get(f);x&&await SI(x.promise,kI)}let y,g=!1;try{const[x,k]=n.getWithLapsed(f);y=x,g=k>xI}catch{}let b;g&&r.set(f,b=Promise.withResolvers());let v;try{const x=await s(d,p,y,u);l.headers.set("dpop",x);const k=await fetch(l);if(v=k.headers.get("dpop-nonce"),v!==null&&(v!==y||g))try{n.set(f,v)}catch{}if(v===null||v===y||!await EI(k,e)||a)return k}finally{b&&(r.get(f)===b&&r.delete(f),b.resolve())}{const x=await s(d,p,v,u),k=new Request(i,o);k.headers.set("dpop",x);const C=await fetch(k),E=C.headers.get("dpop-nonce");if(E!==null&&E!==v)try{n.set(f,E)}catch{}return C}}},EI=async(t,e)=>{if((e===void 0||e===!1)&&t.status===401){const n=t.headers.get("www-authenticate");if(n?.startsWith("DPoP"))return n.includes('error="use_dpop_nonce"')}if((e===void 0||e===!0)&&t.status===400&&rc(t.headers)==="application/json")try{const n=await t.clone().json();return typeof n=="object"&&n?.error==="use_dpop_nonce"}catch{return!1}return!1},AI=(t,e)=>{const n={};for(let r=0,s=e.length;r<s;r++){const i=e[r];n[i]=t[i]}return n};class sc{#e;#t;#n;constructor(e,n){this.#t=e,this.#n=n,this.#e=ad(n,!0)}async request(e,n){const r=this.#t[`${e}_endpoint`];if(!r)throw new Error(`no endpoint for ${e}`);if((e==="token"||e==="pushed_authorization_request")&&id!==void 0){const o=Sb(this.#n),a=await id({aud:this.#t.issuer,createDpopProof:async(l,c)=>await o("POST",l,c,void 0)});n={...n,...a}}const s=await this.#e(r,{method:"post",headers:{"content-type":"application/json"},body:JSON.stringify({...n,client_id:xh})});if(rc(s.headers)!=="application/json")throw new YP(s,2,"unexpected content-type");const i=await s.json();if(s.ok)return i;throw new vb(s,i)}async revoke(e){try{await this.request("revocation",{token:e})}catch{}}async exchangeCode(e,n){const r=await this.request("token",{grant_type:"authorization_code",redirect_uri:kh,code:e,code_verifier:n});let s;try{s=this.#r(r)}catch(a){throw await this.revoke(r.access_token),a}const i=r.sub,o=await Eb(i);if(o.metadata.issuer!==this.#t.issuer)throw await this.revoke(s.access),new TypeError(`issuer mismatch; got ${o.metadata.issuer}`);return{token:s,info:{sub:i,aud:o.identity.pds,server:AI(o.metadata,["issuer","authorization_endpoint","introspection_endpoint","pushed_authorization_request_endpoint","revocation_endpoint","token_endpoint"])}}}async refresh({sub:e,token:n}){if(!n.refresh)throw new Al(e,"no refresh token available");const r=await this.request("token",{grant_type:"refresh_token",refresh_token:n.refresh});if(e!==r.sub)throw new Al(e,`sub mismatch in token response; got ${r.sub}`);return this.#r(r,n)}#r(e,n){if(!e.sub)throw new TypeError("missing sub field in token response");if(!e.scope)throw new TypeError("missing scope field in token response");if(e.token_type!=="DPoP")throw new TypeError("token response returned a non-dpop token");return{scope:e.scope,refresh:e.refresh_token??n?.refresh,access:e.access_token,type:e.token_type,expires_at:typeof e.expires_in=="number"?Date.now()+e.expires_in*1e3:void 0}}}const ga=new Map,TI=2e3,ld=async(t,e)=>{e?.signal?.throwIfAborted();const n=e?.staleAccessToken;let r=OI;e?.noCache||n!==void 0?r=RI:e?.allowStale&&(r=MI);let s;for(;s=ga.get(t);){try{const{isFresh:l,value:c}=await s;if(l||r(c))return c}catch{}e?.signal?.throwIfAborted()}const i=async()=>{const l=kn.sessions.getRecord(t);if(l===void 0)throw new Al(t,"session deleted by another tab");if(n!==void 0&&l.value.token.access!==n)return{isFresh:!0,value:l.value};if(r(l.value))return{isFresh:!1,value:l.value};const{rotated:c,session:u}=await II(t,l);return c&&Cb(t,u),{isFresh:!0,value:u}};let o=gb().request(`atcute-oauth:${t}`,i);if(o=o.finally(()=>ga.delete(t)),ga.has(t))throw new Error("concurrent request for the same key");ga.set(t,o);const{value:a}=await o;return a},Cb=(t,e)=>{try{kn.sessions.set(t,e)}catch(n){yb?.(t,n)}},Mb=t=>{kn.sessions.delete(t)},CI=()=>kn.sessions.keys(),MI=()=>!0,RI=()=>!1,PI=async(t,e)=>{const n=()=>kn.sessions.getRecord(t)?.revision!==e;if(n())return!0;let r,s;try{return await new Promise(i=>{s=setTimeout(()=>i(!1),TI),r=kn.sessions.watch(o=>{o===t&&n()&&i(!0)})})}finally{clearTimeout(s),r?.()}},II=async(t,e)=>{const{dpopKey:n,info:r,token:s}=e.value,i=new sc(r.server,n);try{const o=await i.refresh({sub:r.sub,token:s});return{rotated:!0,session:{dpopKey:n,info:r,token:o}}}catch(o){if(o instanceof vb&&o.status===400&&o.error==="invalid_grant"){if(await PI(t,e.revision)){const a=kn.sessions.getRecord(t);if(a!==void 0)return{rotated:!1,session:a.value}}throw new Al(t,"session was revoked",{cause:o})}throw o}},OI=({token:t})=>{const e=t.expires_at;return e==null||Date.now()+6e4<=e},zI=async t=>{const{target:e,scope:n,state:r=null,...s}=t;let i;switch(e.type){case"account":{i=await Eb(e.identifier);break}case"pds":i=await wI(e.serviceUrl)}const{identity:o,metadata:a}=i,l=o?o.handle!=="handle.invalid"?o.handle:o.did:void 0,c=yI(24),u=await mI(),d=await pI(["ES256"]),h={display:s.display,ui_locales:s.locale,prompt:s.prompt,redirect_uri:kh,code_challenge:u.challenge,code_challenge_method:u.method,state:c,login_hint:l,response_mode:"fragment",response_type:"code",scope:n};kn.states.set(c,{dpopKey:d,metadata:a,verifier:u.verifier,state:r});const m=await new sc(a,d).request("pushed_authorization_request",h),p=new URL(a.authorization_endpoint);return p.searchParams.set("client_id",xh),p.searchParams.set("request_uri",m.request_uri),p},LI=async t=>{const e=t.get("iss"),n=t.get("state"),r=t.get("code"),s=t.get("error");if(!n||!(r||s))throw new eo("missing parameters");const i=kn.states.get(n);if(i)kn.states.delete(n);else throw new eo("unknown state provided");if(s)throw new GP(t.get("error_description")||s);if(!r)throw new eo("missing code parameter");const o=i.dpopKey,a=i.metadata,l=i.state??null;if(e===null)throw new eo("missing issuer parameter");if(e!==a.issuer)throw new eo("issuer mismatch");const c=new sc(a,o),{info:u,token:d}=await c.exchangeCode(r,i.verifier),h=u.sub,f={dpopKey:o,info:u,token:d};return Cb(h,f),{session:f,state:l}};class $I{#e;#t;session;constructor(e){this.session=e,this.#e=ad(e.dpopKey,!1)}get sub(){return this.session.info.sub}getSession(e){const n=ld(this.session.info.sub,e);return n.then(r=>{this.#n(r)},()=>{}).finally(()=>{this.#t===n&&(this.#t=void 0)}),this.#t=n}async signOut(){const e=this.session.info.sub;try{const{dpopKey:n,info:r,token:s}=await ld(e,{allowStale:!0});await new sc(r.server,n).revoke(s.refresh??s.access)}finally{Mb(e)}}async handle(e,n){await this.#t;const r=new Headers(n?.headers);let s=this.session,i=new URL(e,s.info.aud);r.set("authorization",`${s.token.type} ${s.token.access}`);const o=await this.#e(i.href,{...n,headers:r});if(!DI(o))return o;const a=s.token.access;try{const l=this.#t;s=l?await l:await this.getSession({staleAccessToken:a}),s.token.access===a&&(s=await this.getSession({staleAccessToken:a}))}catch{return o}return n?.body instanceof ReadableStream?o:(i=new URL(e,s.info.aud),r.set("authorization",`${s.token.type} ${s.token.access}`),await this.#e(i.href,{...n,headers:r}))}#n(e){e.dpopKey.d!==this.session.dpopKey.d&&(this.#e=ad(e.dpopKey,!1)),this.session=e}}const DI=t=>{if(t.status!==401)return!1;const e=t.headers.get("www-authenticate");return e!=null&&(e.startsWith("Bearer ")||e.startsWith("DPoP "))&&e.includes('error="invalid_token"')};function NI(t){const{client:e,selfDid:n,resolveService:r}=t,s=async i=>{if(i===n)return e;const o=await r(i);return e.clone({handler:Oo({service:o})})};return{async putRecord({repo:i,collection:o,rkey:a,record:l}){const c=await s(i);await Vn(c.post("com.atproto.repo.putRecord",{input:{repo:i,collection:o,rkey:a,record:l}}))},async getRecord({repo:i,collection:o,rkey:a}){const l=await s(i);return{value:(await Vn(l.get("com.atproto.repo.getRecord",{params:{repo:i,collection:o,rkey:a}}))).value}},async listRecords({repo:i,collection:o,cursor:a,limit:l}){const c=await s(i),u=await Vn(c.get("com.atproto.repo.listRecords",{params:{repo:i,collection:o,cursor:a,limit:l}}));return{records:u.records,cursor:u.cursor}},async deleteRecord({repo:i,collection:o,rkey:a}){const l=await s(i);await Vn(l.post("com.atproto.repo.deleteRecord",{input:{repo:i,collection:o,rkey:a}}))},async uploadBlob(i){return(await Vn(e.post("com.atproto.repo.uploadBlob",{input:i}))).blob}}}const Rb="big-mesh-studios:atproto:session-recency",Pb=()=>{try{const t=localStorage.getItem(Rb),e=t===null?[]:JSON.parse(t);return Array.isArray(e)?e.filter(n=>typeof n=="string"):[]}catch{return[]}},FI=t=>{try{const e=Pb().filter(n=>n!==t);e.unshift(t),localStorage.setItem(Rb,JSON.stringify(e))}catch{}};function BI(){return{stored(){const t=CI(),e=Pb(),n=new Set(t),r=e.filter(i=>n.has(i)),s=t.filter(i=>!r.includes(i));return[...r,...s]},async adopt({did:t,resolveService:e}){const n=new $I(await ld(t,{allowStale:!0}));return FI(n.sub),{did:n.sub,client:NI({client:new Gs({handler:n}),selfDid:n.sub,resolveService:e}),async end(){try{await n.signOut()}catch{Mb(n.sub)}}}}}}const UI=t=>typeof t=="object"&&t!==null&&"version"in t&&typeof t.version=="number"?t.version:0,HI=(t,e)=>{const n=t["~standard"].validate(e);if(n instanceof Promise)throw new Error("versionedRecord only supports schemas that validate synchronously");return n},Ib=(t,e)=>({upgradesTo:(n,r)=>Ib(n,[...e,{schema:t,up:r}]),parse:n=>{const r=UI(n);if(r<0||r>e.length)return null;const s=r===e.length?t:e[r].schema,i=HI(s,n);if(i.issues!==void 0)return null;let o=i.value;for(let a=r;a<e.length;a++)o=e[a].up(o);return o}}),jI=t=>Ib(t,[]);class cd{capacity;mask;count=0;maxLoadFactor=.7;keys;values;occupied;constructor(e=16){this.capacity=this.powerOfTwoAtLeast(e),this.mask=this.capacity-1,this.keys=new Int32Array(this.capacity*3),this.values=new Array(this.capacity),this.occupied=new Uint8Array(this.capacity)}get size(){return this.count}get(e,n,r){let s=this.hash(e,n,r);for(;this.occupied[s]!==0;){const i=s*3;if(this.keys[i]===e&&this.keys[i+1]===n&&this.keys[i+2]===r)return this.values[s];s=s+1&this.mask}}set(e,n,r,s){this.count>=this.capacity*this.maxLoadFactor&&this.resize(this.capacity*2);let i=this.hash(e,n,r);for(;this.occupied[i]!==0;){const a=i*3;if(this.keys[a]===e&&this.keys[a+1]===n&&this.keys[a+2]===r){this.values[i]=s;return}i=i+1&this.mask}const o=i*3;this.keys[o]=e,this.keys[o+1]=n,this.keys[o+2]=r,this.values[i]=s,this.occupied[i]=1,this.count++}delete(e,n,r){let s=this.hash(e,n,r);for(;this.occupied[s]!==0;){const o=s*3;if(this.keys[o]===e&&this.keys[o+1]===n&&this.keys[o+2]===r)break;s=s+1&this.mask}if(this.occupied[s]===0)return!1;this.occupied[s]=0,this.values[s]=void 0,this.count--;let i=s+1&this.mask;for(;this.occupied[i]!==0;){const o=i*3,a=this.hash(this.keys[o],this.keys[o+1],this.keys[o+2]);if(!this.probedFrom(a,s,i)){const l=s*3;this.keys[l]=this.keys[o],this.keys[l+1]=this.keys[o+1],this.keys[l+2]=this.keys[o+2],this.values[s]=this.values[i],this.occupied[s]=1,this.occupied[i]=0,this.values[i]=void 0,s=i}i=i+1&this.mask}return!0}probedFrom(e,n,r){return n<r?e>n&&e<=r:e>n||e<=r}forEach(e){const{keys:n,values:r,occupied:s,capacity:i}=this;for(let o=0;o<i;o++){if(s[o]===0)continue;const a=o*3;e(n[a],n[a+1],n[a+2],r[o])}}hash(e,n,r){let s=2166136261;return s=Math.imul(s^e,16777619),s=Math.imul(s^n,16777619),s=Math.imul(s^r,16777619),(s^s>>>16)&this.mask}resize(e){const n=this.keys,r=this.values,s=this.occupied,i=this.capacity;this.capacity=e,this.mask=e-1,this.count=0,this.keys=new Int32Array(e*3),this.values=new Array(e),this.occupied=new Uint8Array(e);for(let o=0;o<i;o++){if(s[o]===0)continue;const a=o*3;this.set(n[a],n[a+1],n[a+2],r[o])}}powerOfTwoAtLeast(e){let n=1;for(;n<e;)n<<=1;return n}}const WI=(t,e,n)=>{const[r,s,i]=t.voxels,[o,a,l]=e,c=t.scale;return[Math.round(o/c-r/2+n[0]),Math.round(a/c-s/2+n[1]),Math.round(l/c-i/2+n[2])]},ks=(t,e,n)=>{const[r,s,i]=t.voxels,[o,a,l]=e,c=t.scale;return[Math.round(n[0]-o/c+r/2),Math.round(n[1]-a/c+s/2),Math.round(n[2]-l/c+i/2)]},Zs=(t,e=0)=>{const n=[Math.round((t[0]-Je[0]/2)/ft)-e,Math.round((t[1]-Je[1]/2)/ft)-e,Math.round((t[2]-Je[2]/2)/ft)-e],r=[n[0]+Je[0]/ft-1+2*e,n[1]+Je[1]/ft-1+2*e,n[2]+Je[2]/ft-1+2*e];return{min:n,max:r}};class VI{edits;constructor(){this.edits=new cd}get size(){return this.edits.size}set(e,n,r){const s=this.edits.get(e[0],e[1],e[2]);return s!==void 0&&s.id===n?(s.updatedAt=Math.max(s.updatedAt,r),!1):(this.edits.set(e[0],e[1],e[2],{id:n,updatedAt:r}),!0)}get(e){return this.edits.get(e[0],e[1],e[2])}queryRange(e,n){const r=[];return this.edits.forEach((s,i,o,a)=>{s>=e[0]&&s<=n[0]&&i>=e[1]&&i<=n[1]&&o>=e[2]&&o<=n[2]&&r.push({w:[s,i,o],edit:a})}),r}applyToBlock(e){const{min:n,max:r}=Zs(e.center,e.store.padding),s=this.queryRange(n,r);if(s.length===0)return 0;let i=0;for(const{w:o,edit:a}of s){const[l,c,u]=ks(e.store,e.center,o);e.store.inBoundsPadded(l,c,u)&&(e.store.data[e.store.paddedIndex(l,c,u)]=a.id,Ut(a.id)?e.store.hasWater=!0:a.id!==xe&&(e.store.mightHaveVoxels=!0),kt(a.id)&&(e.store.hasFlowing=!0),i++)}return i}snapshot(){const e=[];return this.edits.forEach((n,r,s,i)=>{e.push({w:[n,r,s],edit:i})}),e}}const Ob=(t,e)=>{let n=0;for(const{w:r,edit:s}of e){const i=t.get(r);i!==void 0&&i.updatedAt>s.updatedAt||t.set(r,s.id,s.updatedAt)&&n++}return n},Wn=32,Xo="app.bms.voxelscape.edit",zb=jl({x:_r(),y:_r(),z:_r()}),Lb=jl({x:_r(),y:_r(),z:_r(),id:_r(),ts:vy(_r())}),GI=jl({$type:Du(Xo),chunk:zb,seed:Nu(_r()),place:vy(Nu(by())),createdAt:yy(),edits:wy(Lb)}),YI=jl({$type:Du(Xo),version:Du(1),chunk:zb,seed:Nu(_r()),place:by(),createdAt:yy(),edits:wy(Lb)}),XI=jI(GI).upgradesTo(YI,t=>({...t,version:1,place:t.place??Xd})),qI=t=>XI.parse(t),ZI=t=>({x:Math.floor(t[0]/Wn),y:Math.floor(t[1]/Wn),z:Math.floor(t[2]/Wn)}),KI=t=>({x:t[0]-Math.floor(t[0]/Wn)*Wn,y:t[1]-Math.floor(t[1]/Wn)*Wn,z:t[2]-Math.floor(t[2]/Wn)*Wn}),JI=t=>`${t.x}/${t.y}/${t.z}`,QI=(t,e)=>[t.chunk.x*Wn+e.x,t.chunk.y*Wn+e.y,t.chunk.z*Wn+e.z],eO=(t,e,n,r)=>{const s=new Map;for(const{w:i,edit:o}of t){const a=ZI(i),l=JI(a);let c=s.get(l);c===void 0&&(c={$type:Xo,version:1,chunk:a,seed:e,place:n,createdAt:r,edits:[]},s.set(l,c));const u=KI(i);c.edits.push({x:u.x,y:u.y,z:u.z,id:o.id,ts:o.updatedAt})}return s},tO=t=>{let e=0;for(let n=0;n<t.length;n++)e=Math.imul(e,31)+t.charCodeAt(n)|0;return(e>>>0).toString(36)},nO=(t,e)=>`e_${tO(t)}_${e.x}_${e.y}_${e.z}`,rO=t=>{const e=[];for(const n of t){const r=Date.parse(n.createdAt),s=Number.isFinite(r)?r:0;for(const i of n.edits){const o=typeof i.ts=="number"&&Number.isFinite(i.ts)?i.ts:s;e.push({w:QI(n,i),edit:{id:i.id,updatedAt:o}})}}return e},sO="https://constellation.microcosm.blue",iO="place",oO=100,aO=500,lO=async(t,e,n,r)=>{const s=[];let i;do{const o=new URLSearchParams({subject:t,source:`${e}:${n}`,limit:String(oO)});for(const c of r??[])o.append("did",c);i!==void 0&&o.set("cursor",i);const a=await fetch(`${sO}/xrpc/blue.microcosm.links.getBacklinks?${o.toString()}`);if(!a.ok)throw new Error(`constellation error: ${a.status}`);const l=await a.json();s.push(...l.records),i=l.cursor??void 0}while(i!==void 0&&s.length<aO);return s},cO=Go(),uO=async t=>{const e=await cO.resolve(t.did),n=new Gs({handler:Oo({service:Xl(e)})}),r=await Vn(n.get("com.atproto.repo.getRecord",{params:{repo:t.did,collection:t.collection,rkey:t.rkey}}));return qI(r.value)},dO=async(t,e)=>{try{const n=await lO(t,Xo,iO,e);return(await Promise.all(n.map(s=>uO(s).catch(i=>(console.warn(`[edits] could not fetch an edit chunk from ${s.did}.`,i),null))))).filter(s=>s!==null)}catch(n){return console.warn("[edits] constellation discovery failed.",n),[]}},iu="atproto transition:generic",hO="popup=1,width=600,height=720",fO=5*6e4;function pO(t){function e(){const f=`http://127.0.0.1:${window.location.port||"5173"}${t.loopbackRedirectPath}`;return{clientId:`http://localhost?${new URLSearchParams({redirect_uri:f,scope:iu}).toString()}`,redirectUri:f,scope:iu}}function n(){if(typeof window>"u")return!1;const h=window.location.hostname;return h==="localhost"||h==="127.0.0.1"||h==="[::1]"}async function r(h){const f=await fetch(h,{headers:{accept:"application/json"}});if(!f.ok)throw new Error(`could not load client metadata from ${h} (${f.status})`);const m=await f.json(),p=m.redirect_uris?.[0];if(p===void 0)throw new Error(`client metadata at ${h} lists no redirect_uris`);return{clientId:h,redirectUri:p,scope:m.scope??iu}}async function s(h){return h!==void 0?r(h):n()?e():r(t.clientMetadataUrl())}let i;function o(h){return i??=(async()=>{const f=await s(h);return VP({metadata:{client_id:f.clientId,redirect_uri:f.redirectUri},identityResolver:new fk({handleResolver:Yl(),didDocumentResolver:Go()})}),f})(),i}function a(){const h=new URLSearchParams(window.location.hash.slice(1));return h.has("state")&&(h.has("code")||h.has("error"))}function l(h){const f=new BroadcastChannel(t.popupChannel);f.postMessage(h),f.close()}function c(){return new Promise((h,f)=>{const m=new BroadcastChannel(t.popupChannel);let p;const y=g=>{clearTimeout(p),m.close(),g()};m.onmessage=g=>{const b=g.data;"did"in b?y(()=>h(b.did)):y(()=>f(new Error(b.error)))},p=setTimeout(()=>{y(()=>f(new Error("sign-in was not completed in time")))},fO)})}async function u(h){const f=window.open("about:blank","_blank",hO);if(f===null)throw new Error("sign-in popup was blocked — allow popups for this site");try{const m=await o(h.clientId),p=await zI({target:{type:"account",identifier:h.identifier},scope:m.scope,display:"popup"}),y=c();return f.location.href=p.href,await y}catch(m){throw f.close(),m}}async function d(){try{await o();const h=new URLSearchParams(window.location.hash.slice(1));window.history.replaceState(null,"",window.location.pathname+window.location.search);const{session:f}=await LI(h);return l({did:f.info.sub}),f.info.sub}catch(h){throw l({error:h instanceof Error?h.message:String(h)}),h}}return{configureOAuthClient:o,isOAuthCallback:a,signInPopup:u,completeSignIn:d}}const{configureOAuthClient:mO,isOAuthCallback:$b,signInPopup:gO,completeSignIn:Db}=pO({popupChannel:"bms.voxelscape.oauth",loopbackRedirectPath:"/oauth/callback",clientMetadataUrl:()=>new URL("client-metadata.json",window.location.href).href}),yO=Object.freeze(Object.defineProperty({__proto__:null,completeSignIn:Db,configureOAuthClient:mO,isOAuthCallback:$b,signInPopup:gO},Symbol.toStringTag,{value:"Module"})),bO=6e4;class vO{layer;seed;place;editScope;onMerged;handleInput;identity;session;lastUploadAt=0;syncTimer;syncInFlight=!1;constructor(e){this.layer=e.layer,this.seed=e.seed,this.place=e.place,this.editScope=e.editScope,this.handleInput=e.getHandle,this.onMerged=e.onMerged??(()=>{}),this.identity=zk(),this.session=UP({oauth:yO,identity:this.identity,store:BI(),onConnected:n=>e.onConnected?.(n),onSignedOut:()=>{this.stopSyncLoop(),e.onSignedOut?.()}});try{const n=Number(localStorage.getItem("bms.atproto.lastUploadAt"));Number.isFinite(n)&&(this.lastUploadAt=n)}catch{this.lastUploadAt=0}}get status(){return this.session.state.status}get did(){return this.session.state.did}get ready(){return this.session.repoClient!==void 0}get repoClient(){return this.session.repoClient}resolveHandle(e){return this.identity.name(e)}resolvePicture(e){return this.identity.picture(e)}async init(){await this.session.restore();const{status:e,did:n,error:r}=this.session.state;return e==="error"?`account error: ${r}`:n===null?"not signed in":`restored session for ${await this.identity.name(n)}`}async connect(e){const n=(e??this.handleInput()).trim();if(n==="")return"provide a Bluesky handle (e.g. /account:login you.bsky.social)";await this.session.signIn(n);const{status:r,did:s,error:i}=this.session.state;return r!=="connected"||s===null?`account error: ${i}`:`signed in as ${await this.identity.name(s)}`}async sync(){if(this.syncInFlight)return"sync already running";this.syncInFlight=!0;try{return await this.runSync()}finally{this.syncInFlight=!1}}startSyncLoop(e=bO){this.syncTimer===void 0&&(this.syncTimer=setInterval(()=>{this.sync()},e))}stopSyncLoop(){this.syncTimer!==void 0&&(clearInterval(this.syncTimer),this.syncTimer=void 0)}async runSync(){const e=this.session.repoClient,n=this.session.state.did,r=[];if(e!==void 0&&n!==null){const i=eO(this.layer.snapshot().filter(({edit:o})=>o.updatedAt>this.lastUploadAt),this.seed,this.place,new Date().toISOString());for(const o of i.values())try{await e.putRecord({repo:n,collection:Xo,rkey:nO(this.place,o.chunk),record:o})}catch(a){return`account error: ${a instanceof Error?a.message:String(a)}`}if(i.size>0){this.lastUploadAt=Date.now();try{localStorage.setItem("bms.atproto.lastUploadAt",String(this.lastUploadAt))}catch{}r.push(`uploaded ${i.size} edit chunk(s)`)}}const s=this.editScope==="self"?n!==null?[n]:null:void 0;if(s!==null){const i=await dO(this.place,s),o=Ob(this.layer,rO(i));this.onMerged(o),r.push(`fetched ${i.length} remote record(s), ${o} voxel(s) updated`)}return r.length===0?"not connected — sign in to save or share edits here; this place's shared edits still merge in on their own":r.join(", ")}async signOut(){return await this.session.signOut(),"signed out"}describe(){const{status:e,did:n,error:r}=this.session.state,s=n===null?null:this.identity.knownHandle(n)??n;return`account: ${e}${s!==null?` as ${s}`:""}${e==="error"?` — ${r??"unknown error"}`:""}`}dispose(){this.stopSyncLoop(),this.session.dispose()}}const wO=t=>{const e=EO,n=globalThis.fetch.bind(globalThis),r=new Map,s=o=>{const a=r.get(o)??e(o);return r.set(o,a),a},i=async o=>{const a=await s(o);return{location:a,client:new Gs({handler:Oo({service:a.service,fetch:n})})}};return{async list(o){const{location:a,client:l}=await i(o),c=[];let u;do{const d=await Vn(l.get("com.atproto.repo.listRecords",{params:{repo:a.did,collection:wo,cursor:u,limit:100}}));u=d.cursor,c.push(..._O(a.did,d.records))}while(u!==void 0);return c},async find(o,a){const l=Gk(a),{location:c,client:u}=await i(o),d=await Vn(u.get("com.atproto.repo.getRecord",{params:{repo:c.did,collection:wo,rkey:l}}));if(!Wu(d.value))throw new Error(`"${a}" is not a model this can open`);return{repo:c.did,rkey:l,record:d.value}},async byUri(o){const a=Zk(o);if(a===null)throw new Error(`"${o}" is not a model address`);const{location:l,client:c}=await i(a.repo),u=await Vn(c.get("com.atproto.repo.getRecord",{params:{repo:l.did,collection:wo,rkey:a.rkey}}));if(!Wu(u.value))throw new Error(`"${o}" is not a model this can open`);return{repo:l.did,rkey:a.rkey,record:u.value}},async file(o){const{service:a}=await s(o.repo),l=Vu(a,o.repo,Xk(o.record)),c=await n(l);if(!c.ok)throw new Error(`the server holding ${o.repo} would not serve "${o.record.name}" (${c.status})`);return c.blob()},async thumbnailUrl(o){const a=qk(o.record);if(a===null)return null;const{service:l}=await s(o.repo);return Vu(l,o.repo,a)}}},_O=(t,e)=>e.flatMap(({uri:n,value:r})=>Wu(r)?[{repo:t,rkey:xO(n),record:r}]:[]),xO=t=>t.slice(t.lastIndexOf("/")+1),kO=Yl(),SO=Go(),EO=async t=>{const e=t.startsWith("did:")?t:await kO.resolve(t),n=await SO.resolve(e);return{did:e,service:Xl(n)}},AO=(t,e)=>Jd.map(n=>{const[r,s]=Zl[n],[i,o]=m2[n];return{kind:n,side:e[n],axis:za[p2[n]],fixedCoords:(a,l)=>{const c=Et.create();return c[za[r]]=i?t[r]-1-a:a,c[za[s]]=o?t[s]-1-l:l,c}}}),TO=(t,e,n)=>{const r=new Map(n.map(i=>[i.kind,i])),s=[];for(const i of h0){const[o,a]=f0[i],l=r.get(o),c=r.get(a),u=t[i],d=za[i],h=e.filter(p=>p.axis===i).map(p=>({...p,at:Math.min(Math.max(p.at,0),u)})).sort((p,y)=>p.at-y.at);let f=0,m={fixedCoords:l.fixedCoords,side:l.side};for(const p of h)s.push({axis:d,from:f,to:p.at,faces:[m,{fixedCoords:c.fixedCoords,side:p.before}]}),f=p.at,m={fixedCoords:l.fixedCoords,side:p.after};s.push({axis:d,from:f,to:u,faces:[m,{fixedCoords:c.fixedCoords,side:c.side}]})}return s},ou=(t,e)=>{const n=new Array(t),r=new Array(t);for(const s of e)for(let i=s.from;i<s.to;i++)n[i]=s.faces[0].side,r[i]=s.faces[1].side;return{low:n,high:r}};function Nb(t,e,n=[],r=new Uint8Array(t.width*t.height*t.depth*4)){const{height:s,width:i,depth:o}=t,a=i*s*o*4;if(r.length!==a)throw new Error(`out.length expected to be ${a}`);const l=({x:f,y:m,z:p})=>p*i*s+m*i+f<<2,c={x:4,y:i*4,z:i*s*4},u=AO(t,e);r.fill(255);const d=TO(t,n,u);for(const f of d){const m=c[f.axis];for(const{side:p,fixedCoords:y}of f.faces)for(let g=0;g<p.height;++g){const b=g*p.width;for(let v=0;v<p.width;++v){if(p.data[b+v]!==vn.EMPTY)continue;let x=l(y(v,g))+f.from*m;for(let k=f.from;k<f.to;++k)r[x+3]!==0&&(r[x]=0,r[x+1]=0,r[x+2]=0,r[x+3]=0),x+=m}}}const h={x:ou(i,d.filter(f=>f.axis==="x")),y:ou(s,d.filter(f=>f.axis==="y")),z:ou(o,d.filter(f=>f.axis==="z"))};for(let f=0;f<o;f++)for(let m=0;m<s;m++){const p=s-1-m;for(let y=0;y<i;y++){const g=f*i*s+m*i+y<<2;if(r[g+3]===0)continue;const b=di(h.z.high[f],y,p),v=di(h.z.low[f],i-1-y,p),x=di(h.x.low[y],f,p),k=di(h.x.high[y],o-1-f,p),C=di(h.y.high[m],y,f),E=di(h.y.low[m],y,o-1-f);r[g+0]=b|(v&7)<<5,r[g+1]=v>>3&3|(x&31)<<2|(k&1)<<7,r[g+2]=k>>1&15|(C&15)<<4,r[g+3]=C>>4&1|(E&31)<<1|192}}return r}const di=(t,e,n)=>{const r=t.data[n*t.width+e];return r===vn.EMPTY?0:r};function Fb(t){const e=new Uint8Array(t.length*4);return t.forEach(({r:n,g:r,b:s,a:i},o)=>{const a=o<<2;e[a+0]=n,e[a+1]=r,e[a+2]=s,e[a+3]=i}),e}const CO=(t,e)=>t.add(e).sub(t.sub(e).abs()).mul(V(.5)),MO=(t,e)=>t.add(e).add(t.sub(e).abs()).mul(V(.5)),RO=(t,e)=>t.add(e).sub(t.sub(e).abs()).mul(V(.5)),PO=(t,e)=>t.add(e).add(t.sub(e).abs()).mul(V(.5)),om=(t,e)=>t.texture(e.toUVec3()),IO=(t,e)=>{const n=e.toVec3();return n.greaterThanEqual(Oe(V(0))).all().and(n.lessThan(t).all())},OO=(t,e)=>{const n=e.toVec3();return n.greaterThanEqual(Oe(V(-2))).all().and(n.lessThan(t.add(Oe(V(2)))).all())},zO=t=>t.r.bitAnd(31),LO=t=>t.r.bitAnd(224).shiftRight(5).bitOr(t.g.bitAnd(3).shiftLeft(3)),$O=t=>t.g.bitAnd(124).shiftRight(2),DO=t=>t.g.bitAnd(128).shiftRight(7).bitOr(t.b.bitAnd(15).shiftLeft(1)),NO=t=>t.b.bitAnd(240).shiftRight(4).bitOr(t.a.bitAnd(1).shiftLeft(4)),FO=t=>t.a.bitAnd(62).shiftRight(1),BO=t=>t.a.bitAnd(192).notEqual(0),am=(t,e)=>t.texture(Vt(e.toFloat().div(32).add(V(1/64)),V(.5))),UO=t=>{const{rayOrigin:e,rayDirection:n,voxels:r,palette:s,dimensions:i,voxelCount:o,lightDir:a,lightColour:l,ambientColour:c,unlit:u}=t,d=e.toVar(),h=n.toVar(),f=Ie(V(0),V(0),V(0),V(0)).toVar(),m=KM(0,0,0).toVar(),p=Oe(0,0,0).toVar(),y=Oe(0,0,0).toVar(),g=i.div(o).toVar(),b=i.mul(V(-.5)).sub(g).toVar(),v=i.mul(V(.5)).add(g).toVar(),x=Oe(V(1)).div(h),k=x.mul(b.sub(d)).toVar(),C=x.mul(v.sub(d)).toVar(),E=RO(k,C).toVar(),T=PO(k,C).toVar(),A=MO(Vt(E.x,E.x),Vt(E.y,E.z)).toVar(),M=A.x.max(A.y).max(V(0)).toVar(),O=CO(Vt(T.x,T.x),Vt(T.y,T.z)).toVar(),S=O.x.min(O.y).toVar();return wt(M.lessThanEqual(S),()=>{const z=h.div(g).toVar(),R=d.add(h.mul(M)).toVar().add(i.mul(V(.5))).div(g).add(z.mul(V(.001))).toVar(),F=R.floor().toIVec3().toVar(),D=h.sign().toIVec3().toVar(),Q=Oe(V(1)).div(z.abs().max(V(1e-6))).toVar(),H=D.toVec3().mul(F.toVec3().sub(R)).add(D.toVec3().mul(V(.5)).add(V(.5))).mul(Q).toVar(),J=Oe(V(0)).toVar();wt(E.x.equal(M),()=>{J.assign(Oe(V(1),V(0),V(0)))}).ElseIf(E.y.equal(M),()=>{J.assign(Oe(V(0),V(1),V(0)))}).Else(()=>{J.assign(Oe(V(0),V(0),V(1)))});const N=o.x.max(o.y).max(o.z).mul(V(3)).add(V(8)).toInt(),U=Op(!1).toVar();lR(()=>XM(0).toVar(),ae=>ae.lessThan(N),ae=>ae.assign(ae.add(1)),()=>{wt(OO(o,F).not(),()=>{$p()}),wt(IO(o,F),()=>{wt(BO(om(r,F)),()=>{U.assign(Op(!0)),$p()})}),J.assign(H.lessThanEqual(Oe(H.y.min(H.z),H.z.min(H.x),H.x.min(H.y))).toVec3()),H.assign(H.add(J.mul(Q))),F.assign(F.add(J.toIVec3().mul(D)))}),wt(U,()=>{m.assign(F);const ae=om(r,F),ie=qM(0).toVar();wt(J.x.notEqual(V(0)),()=>{wt(D.x.greaterThan(0),()=>{ie.assign($O(ae))}).Else(()=>{ie.assign(DO(ae))})}).ElseIf(J.y.notEqual(V(0)),()=>{wt(D.y.greaterThan(0),()=>{ie.assign(FO(ae))}).Else(()=>{ie.assign(NO(ae))})}).Else(()=>{wt(D.z.greaterThan(0),()=>{ie.assign(LO(ae))}).Else(()=>{ie.assign(zO(ae))})});const q=V(0).toVar();wt(J.x.notEqual(V(0)),()=>{q.assign(M.add(D.x.greaterThan(0).select(F.x,F.x.add(1)).toFloat().sub(R.x).mul(D.x.toFloat()).mul(Q.x)))}).ElseIf(J.y.notEqual(V(0)),()=>{q.assign(M.add(D.y.greaterThan(0).select(F.y,F.y.add(1)).toFloat().sub(R.y).mul(D.y.toFloat()).mul(Q.y)))}).Else(()=>{q.assign(M.add(D.z.greaterThan(0).select(F.z,F.z.add(1)).toFloat().sub(R.z).mul(D.z.toFloat()).mul(Q.z)))}),y.assign(d.add(h.mul(q))),wt(u.toVar(),()=>{f.rgb.assign(am(s,ie).rgb)}).Else(()=>{p.assign(J.mul(D.toVec3()).negate());const be=p.dot(a).max(V(0));f.rgb.assign(am(s,ie).rgb.mul(c.add(l.mul(be))))}),f.a.assign(V(1))})}),{colour:f,voxelPos:m,normal:p,hitPoint:y}};class Bb extends pr{voxelTexture;paletteTexture;dimensions=[0,0,0];voxelCount=[1,1,1];lightDir=[0,0,1];lightColour=[1,1,1];ambientColour=[0,0,0];unlit=!1;flash=0;depthBias=0;voxelsUniform;paletteUniform;dimensionsUniform;voxelCountUniform;lightDirUniform;lightColourUniform;ambientColourUniform;unlitUniform;flashUniform;depthBiasUniform;constructor(){super(),this.voxelTexture=new Yp(new Uint8Array(4),1,1,1),this.paletteTexture=new Yp(new Uint8Array(4),1,1)}setup(e,n){this.voxelsUniform=e.sampler("uVoxels","usampler3D",()=>this.voxelTexture),this.paletteUniform=e.sampler("uPalette","sampler2D",()=>this.paletteTexture),this.dimensionsUniform=e.materialUniform("uDimensions","vec3",()=>this.dimensions),this.voxelCountUniform=e.materialUniform("uVoxelCount","vec3",()=>this.voxelCount),this.lightDirUniform=e.materialUniform("uLightDir","vec3",()=>this.lightDir),this.lightColourUniform=e.materialUniform("uLightColour","vec3",()=>this.lightColour),this.ambientColourUniform=e.materialUniform("uAmbientColour","vec3",()=>this.ambientColour),this.unlitUniform=e.materialUniform("uUnlit","bool",()=>this.unlit?1:0),this.flashUniform=e.materialUniform("uFlash","float",()=>this.flash),this.depthBiasUniform=e.materialUniform("uDepthBias","float",()=>this.depthBias)}buildVertexBody(e){const n=e.position;e.varying("vModelPos","vec3").assign(n);const r=e.instancing?e.instanceMatrix.inverse():e.modelMatrix.inverse();e.varying("vCamVolume","vec3").assign(r.mul(Ie(e.cameraPosition,V(1))).xyz),e.varying("vLightVolume","vec3").assign(r.mul(Ie(this.lightDirUniform,V(0))).xyz.normalize());const s=e.instancing?e.instanceMatrix.mul(Ie(n,V(1))):Ie(n,V(1)),i=e.projectionMatrix.mul(e.viewMatrix.mul(e.modelMatrix.mul(s)));e.varying("vClipZ","float").assign(i.z),e.varying("vClipW","float").assign(i.w);const o=e.instancing?e.modelMatrix.mul(e.instanceMatrix):e.modelMatrix,a=e.projectionMatrix.mul(e.viewMatrix.mul(o));return e.varying("vRow2","vec4").assign(Ie(a.element(0).element(2),a.element(1).element(2),a.element(2).element(2),a.element(3).element(2))),e.varying("vRow3","vec4").assign(Ie(a.element(0).element(3),a.element(1).element(3),a.element(2).element(3),a.element(3).element(3))),i}buildFragmentBody(e){const n=e.varying("vCamVolume","vec3"),r=e.varying("vModelPos","vec3").sub(n).normalize(),{colour:s,hitPoint:i}=UO({rayOrigin:n,rayDirection:r,voxels:this.voxelsUniform,palette:this.paletteUniform,dimensions:this.dimensionsUniform,voxelCount:this.voxelCountUniform,lightDir:e.varying("vLightVolume","vec3"),lightColour:this.lightColourUniform,ambientColour:this.ambientColourUniform,unlit:this.unlitUniform}),o=Ie(kr(s.xyz,Oe(V(1),V(.15),V(.15)),this.flashUniform),s.a),a=aR();return wt(s.a.greaterThan(V(.5)),()=>{const l=i.sub(e.varying("vModelPos","vec3")),c=e.varying("vClipZ","float").add(e.varying("vRow2","vec4").dot(Ie(l,V(0)))),u=e.varying("vClipW","float").add(e.varying("vRow3","vec4").dot(Ie(l,V(0))));a.assign(c.div(u).mul(V(.5)).add(V(.5)).add(this.depthBiasUniform))}).Else(()=>{a.assign(V(1))}),o}}const Ub=t=>{const e=Lo.normalize(t),n=(r,s)=>r*(1+2/s);return{width:n(e.width,t.width),height:n(e.height,t.height),depth:n(e.depth,t.depth)}},HO=t=>Math.max(t.width,t.height,t.depth),jO=[{axis:"x",extent:"width"},{axis:"y",extent:"height"},{axis:"z",extent:"depth"}];function WO(t){const e=t.parts.map(i=>{const o=p0(i),a=v2(t,i),l=(c,u,d)=>Et.add(a.at,Hn.transform(a.turn,Et.multiplyScalar(Et.subtract(Et.create(c,u,d),i.pivot),a.scale)));return{dimensions:o,pose:a,middle:l(o.width/2,o.height/2,o.depth/2),corners:[0,1].flatMap(c=>[0,1].flatMap(u=>[0,1].map(d=>l(c*o.width,u*o.height,d*o.depth))))}}),n=Et.create(),r={width:0,height:0,depth:0};for(const{axis:i,extent:o}of jO){let a=1/0,l=-1/0;for(const c of e)for(const u of c.corners)a=Math.min(a,u[i]),l=Math.max(l,u[i]);e.length>0&&(n[i]=a,r[o]=l-a)}const s=i=>e.length===0?0:i+2;return{bounds:{low:n,dimensions:r},size:{width:s(r.width),height:s(r.height),depth:s(r.depth)},placements:e.map(i=>({position:i.middle,turn:i.pose.turn,scale:HO(i.dimensions)*i.pose.scale}))}}function VO(t){const e=p0(t);return{name:t.name,dimensions:e,voxels:Nb(e,t.sides,t.sections)}}function GO(t,e,n,r){const s=t.voxelTexture;s.image=n,s.width=e.width,s.height=e.height,s.depth=e.depth,s.needsUpdate=!0;const i=t.paletteTexture;i.image=Fb(r),i.width=r.length,i.height=1,i.needsUpdate=!0;const o=Lo.normalize(e);t.dimensions=[o.width,o.height,o.depth],t.voxelCount=[e.width,e.height,e.depth]}function YO(t,e){const{position:n,turn:r,scale:s}=e;t.position.set(n.x,n.y,n.z),t.scale.set(s,s,s),t.quaternion.setFromRotationMatrix(XO.set(r[0],r[3],r[6],0,r[1],r[4],r[7],0,r[2],r[5],r[8],0,0,0,0,1))}const XO=new cr;function qO(t){const e=Ub(t);return new Gi(e.width,e.height,e.depth)}class ZO{parts;bounds;size;palette;constructor(e){const{bounds:n,size:r,placements:s}=WO(e);this.bounds=n,this.size=r,this.palette=e.palette,this.parts=e.parts.map((i,o)=>{const{name:a,dimensions:l,voxels:c}=VO(i);return{name:a,dimensions:l,voxels:c,geometry:qO(l),placement:s[o]}})}createMaterials(){return this.parts.map(e=>{const n=new Bb;return GO(n,e.dimensions,e.voxels,this.palette),n})}copy(e){return new KO(this.parts,e)}}class KO{group=new Jn;meshes;constructor(e,n){this.meshes=e.map((r,s)=>{const i=new xn(r.geometry,n[s]);return YO(i,r.placement),this.group.add(i),i})}wear(e){this.meshes.forEach((n,r)=>{n.material=e[r]})}}const JO=1,QO=3,lm=8,cm=(t,e,n)=>t+(e-t)*n,um=t=>Math.max(-lm,Math.min(lm,t));class ez{current;previous=null;rendered;constructor(e,n){this.current={...e,at:n},this.rendered={...e}}next(e,n,r){(e.x!==this.current.x||e.z!==this.current.z)&&(this.previous=this.current,this.current={...e,at:n});const s=this.extrapolate(n),i=Math.hypot(s.x-this.rendered.x,s.z-this.rendered.z);return this.rendered=i>QO?s:{x:cm(this.rendered.x,s.x,1-Math.exp(-12*r)),z:cm(this.rendered.z,s.z,1-Math.exp(-12*r))},this.rendered}extrapolate(e){if(this.previous===null)return this.current;const n=(this.current.at-this.previous.at)/1e3;if(n<=0)return this.current;const r=um((this.current.x-this.previous.x)/n),s=um((this.current.z-this.previous.z)/n),i=Math.min((e-this.current.at)/1e3,JO);return{x:this.current.x+r*i,z:this.current.z+s*i}}}const dm=2,tz=.5,nz=180;class hm{group=new Jn;getFigures;modelFor;baked=new Map;meshes=new Map;heights=new Map;hurtUntil=new Map;motion=new Map;spinAxis=new gt;upAxis=new gt(0,1,0);yawTurn=new No;constructor(e){this.getFigures=e.getFigures,this.modelFor=e.modelFor??(()=>"zombie.zip")}get size(){return this.meshes.size}setFigure(e,n){const r=new ZO(n),s=r.size.height,{width:i,depth:o}=r.bounds.dimensions,a=r.createMaterials();for(const l of a)l.flash=1;this.baked.set(e,{baked:r,materials:r.createMaterials(),flashMaterials:a,modelHeight:s,halfRatio:s>0?.5*Math.max(i,o)/s:0});for(const[l,c]of this.meshes)this.modelFor(l)===e&&(this.group.remove(c.group),this.meshes.delete(l),this.heights.delete(l))}flashHit(e){this.hurtUntil.set(e,Date.now()+nz)}async loadModel(e,n){this.setFigure(e,await ml(n))}aimBounds(e){const n=this.baked.get(this.modelFor(e));if(n===void 0)return null;const r=this.heights.get(e)??dm;return{half:n.halfRatio*r,height:r}}applyLighting(e){const n=[e.sunDir[0],e.sunDir[1],e.sunDir[2]],r=[e.sunLight[0],e.sunLight[1],e.sunLight[2]],s=[e.ambient[0],e.ambient[1],e.ambient[2]];for(const{materials:i,flashMaterials:o}of this.baked.values())for(const a of[...i,...o])a.lightDir=n,a.lightColour=r,a.ambientColour=s}tick(e){const n=Date.now(),r=new Set;for(const s of this.getFigures()){r.add(s.id);const i=this.modelFor(s.id),o=this.baked.get(i);if(o===void 0||o.modelHeight<=0)continue;const a=s.height??dm;this.heights.set(s.id,a);let l=this.meshes.get(s.id);l===void 0&&(l=o.baked.copy(o.materials),this.group.add(l.group),this.meshes.set(s.id,l));const c=a/o.modelHeight;l.group.scale.set(c,c,c);const u=s.yaw??0;if(s.dyingAt===void 0){let d=this.motion.get(s.id);d===void 0&&(d=new ez({x:s.x,z:s.z},n),this.motion.set(s.id,d));const h=d.next({x:s.x,z:s.z},n,e);l.group.position.set(h.x,s.y+a/2,h.z),s.spin===void 0?l.group.rotation.set(0,u,0):(this.spinAxis.set(s.spin.axis[0],s.spin.axis[1],s.spin.axis[2]).normalize(),l.group.quaternion.setFromAxisAngle(this.spinAxis,s.spin.angle),this.yawTurn.setFromAxisAngle(this.upAxis,u),l.group.quaternion.multiply(this.yawTurn))}else{const d=Math.min(1,(n-s.dyingAt)/1e3/tz),h=-Math.PI/2*d,f=a/2;l.group.position.set(s.x+f*Math.sin(h)*Math.sin(u),s.y+f*Math.cos(h),s.z+f*Math.sin(h)*Math.cos(u)),l.group.rotation.set(h,u,0)}(this.hurtUntil.get(s.id)??0)>n?l.wear(o.flashMaterials):(l.wear(o.materials),this.hurtUntil.delete(s.id))}for(const[s,i]of this.meshes)r.has(s)||(this.group.remove(i.group),this.meshes.delete(s),this.heights.delete(s),this.hurtUntil.delete(s),this.motion.delete(s))}clear(){for(const e of this.meshes.values())this.group.remove(e.group);this.meshes.clear(),this.heights.clear(),this.hurtUntil.clear(),this.motion.clear()}}const rz=t=>t*t*(3-2*t),hi=(t,e,n)=>t+(e-t)*n,sz=(t,e)=>({x:t[0],y:t[1],z:t[2],lookX:e[0],lookY:e[1],lookZ:e[2]}),iz=(t,e,n)=>{const r=Math.max(0,e-t.startMs);let s=0,i=n;for(const o of t.shots){const a=Math.max(0,o.durationMs??0),l=Math.max(0,o.holdMs??0),c=o.look??[i.lookX,i.lookY,i.lookZ];if(r<s+a){const d=a<=0?1:(r-s)/a,h=o.ease==="smooth"?rz(Math.min(1,d)):d;return{x:hi(i.x,o.at[0],h),y:hi(i.y,o.at[1],h),z:hi(i.z,o.at[2],h),lookX:hi(i.lookX,c[0],h),lookY:hi(i.lookY,c[1],h),lookZ:hi(i.lookZ,c[2],h),done:!1}}const u=sz(o.at,c);if(r<s+a+l)return{...u,done:!1};s+=a+l,i=u}return{...i,done:!0}},oz=(t,e)=>`bms-voxelscape:endings:${t}:${e}`,az=t=>{const e=()=>{try{const n=localStorage.getItem(t);if(n===null)return[];const r=JSON.parse(n);return Array.isArray(r)&&r.every(s=>typeof s=="string")?r:[]}catch{return[]}};return{seen:e,record(n){const r=e();if(!r.includes(n)){r.push(n);try{localStorage.setItem(t,JSON.stringify(r))}catch{}}}}},Hb=t=>[Math.round(t.x/2),Math.floor(t.y/2)-1,Math.round(t.z/2)],lz=t=>{const[e,,n]=Hb(t);return{x:e*2+1,y:t.y,z:n*2+1}},ud=(t,e,n)=>{for(let r=0;r<t.length;r++){const s=t[r],{min:i,max:o}=Zs(s.center);if(e[0]<i[0]||e[0]>o[0]||e[1]<i[1]||e[1]>o[1]||e[2]<i[2]||e[2]>o[2])continue;const[a,l,c]=ks(s.store,s.center,e);s.store.inBoundsPadded(a,l,c)&&n(s,r,a,l,c)}},fm=(t,e)=>{Ut(e)?t.store.hasWater=!0:e!==xe&&(t.store.mightHaveVoxels=!0),kt(e)&&(t.store.hasFlowing=!0)},cz=(t,e)=>{let n=xe;return ud(t,e,(r,s,i,o,a)=>{n=r.store.atPadded(i,o,a)}),n};class uz{constructor(e,n){this.blocks=e,this.onBlocksChanged=n}blocks;onBlocksChanged;kindled=new Map;seed(e){const n=Hb(e),r=n.join(",");if(this.kindled.has(r))return;const s=cz(this.blocks,n),i=$0[Fa],o=[];ud(this.blocks,n,(a,l,c,u,d)=>{a.store.data[a.store.paddedIndex(c,u,d)]=Fa,fm(a,Fa),uh(a.store,a.light,[{x:c,y:u,z:d,level:i,fullSky:!1}],"blocklight",!1),o.push(l)}),o.length!==0&&(this.kindled.set(r,{voxel:n,was:s}),this.onBlocksChanged(o))}clear(){const e=new Set;for(const{voxel:n,was:r}of this.kindled.values())ud(this.blocks,n,(s,i,o,a,l)=>{s.store.data[s.store.paddedIndex(o,a,l)]=r,fm(s,r),Ql(s.store,s.light),e.add(i)});this.kindled.clear(),e.size>0&&this.onBlocksChanged([...e])}}const gr=96,dz=.27,au=[.08,.18],lu=[.08,.14],_i=2.5,hz=.5,fz=t=>Math.max(.1,t/dz),pz=()=>{const t=new Float32Array(gr*4*3),e=new Float32Array(gr*4*2),n=new Float32Array(gr*4*3),r=new Float32Array(gr*4),s=new Float32Array(gr*4),i=new Float32Array(gr*4),o=new Float32Array(gr*4),a=new Float32Array(gr*4*2),l=new Uint16Array(gr*6),c=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let d=0;d<gr;d++){const h=d*4,f=(Math.random()-.5)*.012*_i,m=Math.random()*.01,p=(Math.random()-.5)*.012*_i,y=(Math.random()-.5)*.05*_i,g=lu[0]+Math.random()*(lu[1]-lu[0]),b=(Math.random()-.5)*.05*_i,v=.45+Math.random()*.35,x=Math.random()*v,k=au[0]+Math.random()*(au[1]-au[0]),C=Math.random()*Math.PI*2;for(let E=0;E<4;E++){const T=h+E,A=T*3,M=T*2;t[A]=f,t[A+1]=m,t[A+2]=p,e[M]=c[E][0],e[M+1]=c[E][1],n[A]=y,n[A+1]=g,n[A+2]=b,r[T]=v,s[T]=x,i[T]=k,o[T]=C,a[M]=(c[E][0]+1)/2,a[M+1]=(c[E][1]+1)/2}l[d*6+0]=h,l[d*6+1]=h+1,l[d*6+2]=h+2,l[d*6+3]=h,l[d*6+4]=h+2,l[d*6+5]=h+3}const u=new Jr;return u.setAttribute("particlePos",new Le(t,3)),u.setAttribute("corner",new Le(e,2)),u.setAttribute("drift",new Le(n,3)),u.setAttribute("life",new Le(r,1)),u.setAttribute("offset",new Le(s,1)),u.setAttribute("size",new Le(i,1)),u.setAttribute("spin",new Le(o,1)),u.setAttribute("uv",new Le(a,2)),u.setIndex(l),u};class mz extends pr{time=0;timeUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!1,this.side=Qr.DoubleSide,this.blending=qs.AdditiveBlending}setup(e,n){this.timeUniform=e.materialUniform("time","float",()=>this.time)}buildVertexBody(e){const n=(this.timeUniform??V(0)).mul(V(hz)).toVar(),r=e.attribute("particlePos","vec3"),s=e.attribute("corner","vec2"),i=e.attribute("drift","vec3"),o=e.attribute("life","float"),a=e.attribute("offset","float"),l=e.attribute("size","float"),c=e.attribute("spin","float"),u=e.attribute("uv","vec2"),d=ja(n.add(a),o).div(o).toVar(),h=Xn(V(0),V(.08),d),f=V(1).sub(Xn(V(.35),V(1),d)),m=h.mul(f).toVar(),p=V(1).sub(d).toVar(),y=r.add(i.mul(d)).toVar(),g=xl(n.mul(V(10)).add(c).add(d.mul(V(12)))).mul(V(.012*_i)).mul(V(1).sub(d)),b=xl(n.mul(V(24)).add(c)).mul(V(.004)),v=JM(n.mul(V(8)).add(c).add(d.mul(V(10)))).mul(V(.006*_i)).mul(V(1).sub(d)),x=Oe(y.x.add(g),y.y.add(d.mul(d).mul(V(.12))).add(b),y.z.add(v)).toVar(),k=e.viewMatrix.mul(e.modelMatrix.mul(Ie(x,V(1)))).toVar(),C=s.mul(l.mul(m)).toVar(),E=k.xyz.add(Oe(C.x,C.y,V(0))).toVar();return e.varying("vUv","vec2").assign(u),e.varying("vFade","float").assign(m),e.varying("vHeat","float").assign(p),e.projectionMatrix.mul(Ie(E,k.w))}buildFragmentBody(e){const n=e.varying("vUv","vec2"),r=e.varying("vFade","float"),s=e.varying("vHeat","float"),o=n.sub(Vt(.5)).toVar().length().toVar(),a=o.lessThanEqual(V(.5)).select(V(1),V(0)),l=V(1).sub(Xn(V(0),V(.28),o)),c=V(1).sub(Xn(V(.12),V(.5),o)),u=Oe(1,.22,.02),d=Oe(1,.55,.08),h=Oe(1,.95,.55),f=s.mul(V(1.2)).clamp(V(0),V(1)),m=kr(u,d,f),p=kr(m,h,l),y=c.mul(r).mul(a).toVar();return Ie(p,y)}}class gz{constructor(e){this.fires=e}fires;group=new Jn;material=new mz;geometry=pz();meshes=new Map;time=0;tick(e){this.time+=e,this.material.time=this.time;const n=this.fires();for(const r of n){let s=this.meshes.get(r.id);s===void 0&&(s=new xn(this.geometry,this.material),this.group.add(s),this.meshes.set(r.id,s));const i=fz(r.height),o=lz(r);s.position.set(o.x,o.y,o.z),s.scale.setScalar(i)}for(const[r,s]of this.meshes)n.some(i=>i.id===r)||(this.group.remove(s),this.meshes.delete(r))}clear(){for(const e of this.meshes.values())this.group.remove(e);this.meshes.clear()}}const Nr=160,yz=.85,bz=.8,vz=.15,cu=.5,uu=[.08,.2],wz=8,_z=()=>{const t=Math.random(),e=Math.random(),n=2*Math.PI*t,r=Math.sqrt(e*(1-e));return[2*r*Math.cos(n),2*r*Math.sin(n),2*e-1]},xz=()=>{const t=new Float32Array(Nr*4*3),e=new Float32Array(Nr*4*2),n=new Float32Array(Nr*4*3),r=new Float32Array(Nr*4),s=new Float32Array(Nr*4),i=new Float32Array(Nr*4),o=new Float32Array(Nr*4*2),a=new Uint16Array(Nr*6),l=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let u=0;u<Nr;u++){const[d,h,f]=_z(),m=d*.02,p=h*.02,y=f*.02,g=uu[0]+Math.random()*(uu[1]-uu[0]),b=Math.random()*vz,v=u*4;for(let x=0;x<4;x++){const k=v+x,C=k*3,E=k*2;t[C]=m,t[C+1]=p,t[C+2]=y,e[E]=l[x][0],e[E+1]=l[x][1],n[C]=d*cu,n[C+1]=h*cu,n[C+2]=f*cu,r[k]=bz,s[k]=b,i[k]=g,o[E]=(l[x][0]+1)/2,o[E+1]=(l[x][1]+1)/2}a[u*6+0]=v,a[u*6+1]=v+1,a[u*6+2]=v+2,a[u*6+3]=v,a[u*6+4]=v+2,a[u*6+5]=v+3}const c=new Jr;return c.setAttribute("particlePos",new Le(t,3)),c.setAttribute("corner",new Le(e,2)),c.setAttribute("drift",new Le(n,3)),c.setAttribute("life",new Le(r,1)),c.setAttribute("offset",new Le(s,1)),c.setAttribute("size",new Le(i,1)),c.setAttribute("uv",new Le(o,2)),c.setIndex(a),c};class kz extends pr{time=0;timeUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!1,this.side=Qr.DoubleSide,this.blending=qs.AdditiveBlending}setup(e,n){this.timeUniform=e.materialUniform("time","float",()=>this.time)}buildVertexBody(e){const n=(this.timeUniform??V(0)).toVar(),r=e.attribute("particlePos","vec3"),s=e.attribute("corner","vec2"),i=e.attribute("drift","vec3"),o=e.attribute("life","float"),a=e.attribute("offset","float"),l=e.attribute("size","float"),c=e.attribute("uv","vec2"),u=n.add(a).div(o).clamp(V(0),V(1)).toVar(),d=Xn(V(0),V(.08),u),h=V(1).sub(Xn(V(.35),V(1),u)),f=d.mul(h).toVar(),m=V(1).sub(u).toVar(),p=r.add(i.mul(u)).toVar(),y=e.viewMatrix.mul(e.modelMatrix.mul(Ie(p,V(1)))).toVar(),g=s.mul(l.mul(f)).toVar(),b=y.xyz.add(Oe(g.x,g.y,V(0))).toVar();return e.varying("vUv","vec2").assign(c),e.varying("vFade","float").assign(f),e.varying("vHeat","float").assign(m),e.projectionMatrix.mul(Ie(b,y.w))}buildFragmentBody(e){const n=e.varying("vUv","vec2"),r=e.varying("vFade","float"),s=e.varying("vHeat","float"),o=n.sub(Vt(.5)).toVar().length().toVar(),a=o.lessThanEqual(V(.5)).select(V(1),V(0)),l=V(1).sub(Xn(V(0),V(.28),o)),c=V(1).sub(Xn(V(.12),V(.5),o)),u=Oe(1,.22,.02),d=Oe(1,.55,.08),h=Oe(1,.95,.55),f=s.mul(V(1.2)).clamp(V(0),V(1)),m=kr(u,d,f),p=kr(m,h,l),y=c.mul(r).mul(a).toVar();return Ie(p,y)}}class Sz{constructor(e){this.explosions=e}explosions;group=new Jn;geometry=xz();materials=[];free=[];bursts=new Map;lit=new Map;time=0;tick(e){this.time+=e;const n=this.explosions(),r=new Set;for(const s of n)r.add(s.id),this.lit.get(s.id)!==s.at&&(this.lit.set(s.id,s.at),this.start(s));for(const[s,i]of this.bursts){const o=this.time-i.started;if(o>=yz){this.discard(s);continue}i.material.time=o}for(const s of[...this.lit.keys()])r.has(s)||this.lit.delete(s)}clear(){for(const e of[...this.bursts.keys()])this.discard(e);this.lit.clear()}start(e){this.discard(e.id);const n=this.takeMaterial();n.time=0;const r=new xn(this.geometry,n);r.position.set(e.x,e.y,e.z),r.scale.setScalar(e.radius),this.group.add(r),this.bursts.set(e.id,{mesh:r,material:n,started:this.time})}discard(e){const n=this.bursts.get(e);n!==void 0&&(this.group.remove(n.mesh),this.bursts.delete(e),this.free.push(n.material))}takeMaterial(){const e=this.free.pop();if(e!==void 0)return e;if(this.materials.length<wz){const r=new kz;return this.materials.push(r),r}const n=[...this.bursts.entries()].sort((r,s)=>r[1].started-s[1].started)[0];return n===void 0?this.materials[0]:(this.discard(n[0]),this.free.pop())}}const Ez=5,Az=.6,Tz=2,Cz=(t,e,n)=>{const r=[0,0,0],s=[0,0,0];for(let a=0;a<3;a++){const l=t[a],c=e[a],u=a===0?n.minX:a===1?n.minY:n.minZ,d=a===0?n.maxX:a===1?n.maxY:n.maxZ;if(Math.abs(c)<1e-9){if(l<u||l>d)return null;r[a]=-1/0,s[a]=1/0}else{const h=1/c;if(r[a]=(u-l)*h,s[a]=(d-l)*h,r[a]>s[a]){const f=r[a];r[a]=s[a],s[a]=f}}}const i=Math.max(r[0],r[1],r[2]),o=Math.min(s[0],s[1],s[2]);return i>o||o<0?null:Math.max(0,i)},jb=(t,e,n,r=Ez)=>{let s=null;for(const i of n){const o=i.half??Az,a=i.height??Tz,l=i.yaw??0,c=Math.cos(l),u=Math.sin(l),d=t[0]-i.x,h=t[2]-i.z,f=[d*c-h*u,t[1]-i.y,d*u+h*c],m=[e[0]*c-e[2]*u,e[1],e[0]*u+e[2]*c],p=Cz(f,m,{minX:-o,maxX:o,minY:0,maxY:a,minZ:-o,maxZ:o});p!==null&&p<=r&&(s===null||p<s.distance)&&(s={id:i.id,distance:p})}return s},Wb=4,Mz=8,du=()=>typeof navigator>"u"||typeof navigator.hardwareConcurrency!="number"?2:Math.max(0,Math.min(Wb,navigator.hardwareConcurrency-1));class Eh{_workers=[];messageHandlers=[];lostHandlers=[];addedHandlers=[];createWorker;requestedCount;disposed=!1;constructor(e={}){this.createWorker=e.createWorker,this.requestedCount=e.count;const n=e.count??du();for(let r=0;r<n&&this.spawnOne()!==void 0;r++);}get workers(){return this._workers}get available(){return this._workers.length>0}onMessage(e){this.messageHandlers.push(e);for(const n of this._workers)n.addEventListener("message",e)}onWorkerLost(e){this.lostHandlers.push(e)}onWorkerAdded(e){this.addedHandlers.push(e)}setCount(e){this.requestedCount=Math.min(Mz,Math.max(0,e)),this.ensure(this.requestedCount)}setAuto(){this.requestedCount=void 0,this.ensure(du())}describe(){const e=du(),n=this._workers.length,r=this.requestedCount,s=r===void 0?`auto (${e})`:`fixed at ${r} (auto: ${e})`;return`world workers: ${n} running, ${s}`}dispose(){if(!this.disposed){this.disposed=!0;for(const e of this._workers)e.terminate();this._workers.length=0}}ensure(e){for(;this._workers.length>e;){const n=this._workers.pop();if(n!==void 0){n.terminate();for(const r of this.lostHandlers)r(n)}}for(;this._workers.length<e&&this.spawnOne()!==void 0;);}spawnOne(){let e;try{e=this.createWorker===void 0?new Worker(new URL("/big-mesh-studios/voxelscape/assets/world-worker-B9BfNJFD.js",import.meta.url),{type:"module"}):this.createWorker()}catch{e=void 0}if(e!==void 0){for(const n of this.messageHandlers)e.addEventListener("message",n);e.addEventListener("error",()=>this.drop(e)),this._workers.push(e);for(const n of this.addedHandlers)n(e);return e}}drop(e){const n=this._workers.indexOf(e);n>=0&&this._workers.splice(n,1);for(const r of this.lostHandlers)r(e)}}const Qe={player:0,scroll:1,scrollCells:2,scrollEvict:3,scrollTeleport:4,scrollOrder:5,scrollRequest:6,flow:7,multiplayer:8,figures:9,environment:10,meshDrain:11,merge:12,rendererTick:13,advance:14,occlusion:15,draw:16},Rz=Object.keys(Qe),qn={fillsRequested:0,fillsLanded:1,meshesRequested:2,meshesLanded:3,meshesFromFill:4,merges:5,uploads:6,scrolls:7,blocksStreamed:8},Ct={gapMs:0,gpuMs:1,scale:2,uploadBytes:3,merges:4,triangles:5,occluded:6,visible:7,drawnMeshes:8,fillPending:9,fillInFlight:10,meshPending:11,meshInFlight:12,dirtySuperchunks:13,heapBytes:14,residentBytes:15,voxelBytes:16,mergedGeometryBytes:17,blockGeometryBytes:18,gpuOcclusionMs:19,cellReady:20,playerX:21,playerY:22,playerZ:23},Pz=Object.keys(Ct);Pz.length+Rz.length;const Iz={rows:[],rowStride:0,fieldNames:[],phaseNames:[],counterNames:[],counters:[],framesSeen:0,wrapped:!1,durationMs:0};class Oz{armed=!1;arm(){}disarm(){}reset(){}begin(){}end(){}count(){}gauge(){}frame(){}drain(){return Iz}}const me=new Oz,Vb=4,zz=Vb*Wb,pm=t=>({named:{stores:t.map(e=>e.storeData),lights:t.map(e=>e.light)},buffers:t.flatMap(e=>[e.storeData.buffer,e.light.buffer])});class Lz{fillGen;fillLod;fillBorder;pendingFills=new Set;pendingCenter=new Map;pendingLod=new Map;pendingBorder=new Map;pendingFocus=[0,0,0];workerLoad=new Map;fillInflight=new Set;spares=new Map;blocks;terrain;onBlockChanged;customFillStore;customFillStoreUrl;structures;editLayer;tileRects;fillRects=new Map;pool;warnedWorkerError=!1;pendingSyncFills=new Set;pendingSyncLods=new Map;pendingSyncBorder=new Map;syncFillTimer;constructor(e){this.terrain=e.terrain,this.blocks=e.blocks,this.onBlockChanged=e.onBlockChanged,this.customFillStore=e.customFillStore,this.customFillStoreUrl=e.customFillStoreUrl,this.structures=e.structures,this.editLayer=e.editLayer,this.tileRects=e.tileRects,this.fillGen=new Array(e.blocks.length).fill(0),this.fillLod=new Array(e.blocks.length).fill(0),this.fillBorder=new Array(e.blocks.length).fill(void 0),this.pool=e.pool??new Eh(e.createWorker===void 0?{}:{createWorker:e.createWorker,count:1}),this.pool.onMessage(n=>{this.onWorkerMessage(n.data)}),this.pool.onWorkerLost(()=>{this.onWorkerLost()}),this.pool.onWorkerAdded(n=>{this.sendFillConfig(n),n.addEventListener("message",r=>this.countWorkerResult(n,r))});for(const n of this.pool.workers)this.sendFillConfig(n),n.addEventListener("message",r=>this.countWorkerResult(n,r))}sendFillConfig(e){const n={terrain:this.terrain,customFillStoreUrl:this.customFillStoreUrl,structures:this.structures};e.postMessage({type:"config",config:n})}setStructures(e){this.structures=e;for(const n of this.pool.workers)this.sendFillConfig(n)}onWorkerMessage(e){if(e.type==="fillMesh"){this.applyMeshedFillResult(e);return}if(e.type==="fill")for(let n=0;n<e.indices.length;n++){const r=e.indices[n];if(e.gens[n]!==this.fillGen[r]){this.returnSpare({storeData:e.storeData[n],light:e.light[n]});continue}this.fillInflight.delete(r),me.count(qn.fillsLanded);const s=this.arraysOf(r);hp(this.blocks[r],{storeData:e.storeData[n],mightHaveVoxels:e.mightHaveVoxels[n],hasWater:e.hasWater[n],lod:e.lods[n],light:e.light[n]}),this.returnSpare(s),this.applyEdits(r)>0&&Hc(this.blocks[r],this.terrain),this.onBlockChanged(r)}}applyMeshedFillResult(e){const n=e.index;if(e.gen!==this.fillGen[n]){this.returnSpare({storeData:e.storeData,light:e.light});return}this.fillInflight.delete(n),me.count(qn.fillsLanded);const r=this.tileRects?.()??[],s=this.fillRects.get(n)===r;this.fillRects.delete(n);const i=this.arraysOf(n);if(hp(this.blocks[n],{storeData:e.storeData,mightHaveVoxels:e.mightHaveVoxels,hasWater:e.hasWater,lod:e.lod,light:e.light}),this.returnSpare(i),this.applyEdits(n)>0){Hc(this.blocks[n],this.terrain),this.onBlockChanged(n);return}if(!s){this.onBlockChanged(n);return}me.count(qn.meshesFromFill),this.onBlockChanged(n,{terrain:e.terrain,water:e.water})}countWorkerResult(e,n){const r=n.data;if(r?.type!=="fill"&&r?.type!=="fillMesh")return;const s=(this.workerLoad.get(e)??0)-1;s<=0?this.workerLoad.delete(e):this.workerLoad.set(e,s),this.drainWorkerFills()}onWorkerLost(){this.warnedWorkerError||(this.warnedWorkerError=!0,console.warn("[fills] worker unavailable; falling back to the remaining workers or synchronous fills"));for(const e of this.fillInflight)this.syncFillBlock(e,this.fillLod[e],this.fillBorder[e]);this.fillInflight.clear(),this.workerLoad.clear(),this.drainWorkerFills()}resizeTo(e){for(;this.fillGen.length<e;)this.fillGen.push(0),this.fillLod.push(0),this.fillBorder.push(void 0);this.fillGen.length=e,this.fillLod.length=e,this.fillBorder.length=e;const n=r=>r>=e;for(const r of[this.pendingFills,this.fillInflight,this.pendingSyncFills])for(const s of[...r])n(s)&&r.delete(s);for(const r of[this.pendingCenter,this.pendingLod,this.pendingBorder,this.pendingSyncLods,this.pendingSyncBorder])for(const s of[...r.keys()])n(s)&&r.delete(s)}get pendingCount(){return this.pendingFills.size+this.pendingSyncFills.size}get inFlightCount(){return this.fillInflight.size}fillNow(e,n=0,r){this.fillGen[e]++,this.fillInflight.delete(e),this.fillLod[e]=n,this.fillBorder[e]=r,this.syncFillBlock(e,n,r)}requestFill(e,n,r,s,i){if(me.count(qn.fillsRequested,e.length),this.pool.workers.length===0){for(let o=0;o<e.length;o++){this.pendingSyncFills.add(e[o]),this.pendingSyncLods.set(e[o],r[o]);const a=s?.[o];a!==void 0&&this.pendingSyncBorder.set(e[o],a)}this.drainSyncFills();return}i!==void 0&&(this.pendingFocus=i);for(let o=0;o<e.length;o++){const a=e[o];this.fillGen[a]++,this.fillLod[a]=r[o],this.fillBorder[a]=s?.[o],this.pendingFills.add(a),this.pendingCenter.set(a,n[o]),this.pendingLod.set(a,r[o]),this.pendingBorder.set(a,s?.[o]??{})}this.drainWorkerFills()}drainWorkerFills(){const e=this.pool.workers;if(e.length===0||this.pendingFills.size===0)return;const n=[...this.pendingFills].sort((i,o)=>this.distanceSquaredTo(i)-this.distanceSquaredTo(o)),r=this.tileRects!==void 0;let s=0;for(const i of e){if((this.workerLoad.get(i)??0)>0)continue;const o=n.slice(s,s+Vb);if(o.length===0)return;s+=o.length;for(const u of o)this.pendingFills.delete(u);const a=o.map(u=>this.pendingCenter.get(u)??[0,0,0]),l=o.map(u=>this.pendingLod.get(u)??0),c=o.map(u=>this.pendingBorder.get(u)??{});r?this.sendMeshedFillBatch(o,a,l,c,i):this.sendFillBatch(o,a,l,c,i)}}distanceSquaredTo(e){const[n,r,s]=this.pendingCenter.get(e)??[0,0,0],[i,o,a]=this.pendingFocus;return(n-i)**2+(r-o)**2+(s-a)**2}drainSyncFills(){if(this.syncFillTimer!==void 0)return;const e=this.pendingSyncFills.values().next();if(e.done===!0)return;const n=e.value;this.pendingSyncFills.delete(n);const r=this.pendingSyncLods.get(n)??0;this.pendingSyncLods.delete(n);const s=this.pendingSyncBorder.get(n);this.pendingSyncBorder.delete(n),this.syncFillTimer=setTimeout(()=>{this.syncFillTimer=void 0,this.syncFillBlock(n,r,s),this.drainSyncFills()},0)}syncFillBlock(e,n=0,r){const s=this.blocks[e];if(s===void 0)return;const{dimensions:i,voxels:o,voxelSize:a}=wl(n);s.store.dims=i,s.store.voxels=o,s.store.scale=a,s.targetLod=n,(this.customFillStore??HE)(s.store,s.center,this.terrain,r),this.structures!==void 0&&JE(s.store,s.center,this.structures),this.applyEdits(e),Hc(s,this.terrain),this.onBlockChanged(e)}applyEdits(e){const n=this.editLayer;return n===void 0?0:n.applyToBlock(this.blocks[e])}takeSpare(e){const n=ch(wl(e).voxels);return this.spares.get(n)?.pop()??{storeData:new Uint8Array(n),light:new Uint8Array(n)}}returnSpare(e){const n=e.storeData.length;if(n===0)return;const r=this.spares.get(n)??[];r.length>=zz||(r.push(e),this.spares.set(n,r))}arraysOf(e){const n=this.blocks[e];return{storeData:n.store.data,light:n.light.data}}attachBatch(e,n){for(const r of e)this.fillInflight.add(r);this.workerLoad.set(n,(this.workerLoad.get(n)??0)+e.length)}gensOf(e){return e.map(n=>this.fillGen[n])}sendFillBatch(e,n,r,s,i){this.attachBatch(e,i);const o=pm(e.map((a,l)=>this.takeSpare(r[l])));i.postMessage({type:"fill",indices:e,centers:n,lods:r,borderSizes:s,gens:this.gensOf(e),...o.named},o.buffers)}sendMeshedFillBatch(e,n,r,s,i){this.attachBatch(e,i);const o=this.tileRects?.()??[];for(const l of e)this.fillRects.set(l,o);const a=pm(e.map((l,c)=>this.takeSpare(r[c])));i.postMessage({type:"fillMesh",indices:e,centers:n,lods:r,borderSizes:s,gens:this.gensOf(e),tileRects:o,...a.named},a.buffers)}dispose(){this.pool.dispose()}}const Ga=(t,e,n=e)=>{const r=[];for(let s=-e;s<=e;s++)for(let i=-n;i<=n;i++)for(let o=-e;o<=e;o++){const a={x:t.x+s,y:t.y+i,z:t.z+o};Gb(a,t,e,n)&&r.push(a)}return r},Gb=(t,e,n,r=n)=>{const s=t.x-e.x,i=t.y-e.y,o=t.z-e.z,a=n/r;return s*s+o*o+(i*a)**2<=n*n},Ah=(t,e=t)=>Ga({x:0,y:0,z:0},t,e).length,fi=t=>Math.floor((t+Ci/2)/Ci),mm=t=>{const e=Jl<<2,n=new Set,r=[];for(const s of t??[])for(const i of L0(s)){const o=fi(i.min[0]-e),a=fi(i.max[0]+e),l=fi(i.min[1]-e),c=fi(i.max[1]+e),u=fi(i.min[2]-e),d=fi(i.max[2]+e);for(let h=o;h<=a;h++)for(let f=l;f<=c;f++)for(let m=u;m<=d;m++){const p=`${h},${f},${m}`;n.has(p)||(n.add(p),r.push({x:h,y:f,z:m}))}}return r},$z=(t,e)=>t===e?!0:t===void 0||e===void 0?!1:JSON.stringify(t)===JSON.stringify(e),ic={full:3,coarse:4},Dz={full:Number.POSITIVE_INFINITY,coarse:Number.POSITIVE_INFINITY},Nz=t=>!Number.isFinite(t.full),sr=(t,e,n=ic)=>{const r=t.x-e.x,s=t.y-e.y,i=t.z-e.z,o=r*r+s*s+i*i;return o<=n.full*n.full?0:o<=n.coarse*n.coarse?1:2},ya=(t,e,n=ic)=>{const r=(s,i,o)=>ft*(1<<sr({x:t.x+s,y:t.y+i,z:t.z+o},e,n));return{px:r(1,0,0),nx:r(-1,0,0),py:r(0,1,0),ny:r(0,-1,0),pz:r(0,0,1),nz:r(0,0,-1)}};class Fz{blocks;radius;yRadius;bands=ic;query;cells=[];cellIndex;filled=[];free=[];onBlockReposition;onBlockRelease;fillClient;structures;centerCell={x:0,y:0,z:0};constructor(e){this.radius=e.radius,this.yRadius=e.yRadius??e.radius,this.onBlockReposition=e.onBlockReposition,this.onBlockRelease=e.onBlockRelease;const n=Ga({x:0,y:0,z:0},this.radius,this.yRadius);this.cellIndex=new cd(n.length*2),this.blocks=n.map(r=>{const s=[r.x*Je[0],r.y*Je[1],r.z*Je[2]];return this.cells.push({x:r.x,y:r.y,z:r.z}),this.filled.push(!1),dp({center:s,lod:sr(r,{x:0,y:0,z:0},this.bands)})}),this.query=(r,s,i)=>{const o=this.slotAt(r,s,i);return o===void 0?void 0:this.blocks[o]},this.fillClient=new Lz({terrain:e.terrain,blocks:this.blocks,onBlockChanged:(r,s)=>{this.filled[r]=!0,e.onBlockChanged(r,s)},editLayer:e.editLayer,customFillStore:e.customFillStore,customFillStoreUrl:e.customFillStoreUrl,structures:e.structures,tileRects:e.tileRects,pool:e.pool,createWorker:e.createWorker})}setStructures(e){if($z(e,this.structures))return!1;const n=this.structures;this.structures=e,this.fillClient.setStructures(e);const r=new Set;for(const o of[...mm(n),...mm(e)]){const a=this.cellIndex.get(o.x,o.y,o.z);a!==void 0&&r.add(a)}if(r.size===0)return!0;const s=[this.centerCell.x*Je[0],this.centerCell.y*Je[1],this.centerCell.z*Je[2]],i=[...r].sort((o,a)=>this.distanceSquared(o,s[0],s[1],s[2])-this.distanceSquared(a,s[0],s[1],s[2]));for(const o of i)this.onBlockRelease?.(o),this.blocks[o].targetLod=sr(this.cells[o],this.centerCell,this.bands);return this.fillClient.requestFill(i,i.map(o=>this.blocks[o].center),i.map(o=>sr(this.cells[o],this.centerCell,this.bands)),i.map(o=>ya(this.cells[o],this.centerCell,this.bands)),s),!0}slotAt(e,n,r){const[s,i,o]=So(e,n,r),a=this.cellIndex.get(s,i,o);return a===void 0||!this.filled[a]?void 0:a}hasTerrain(e){return this.filled[e]}get fillPendingCount(){return this.fillClient.pendingCount}get fillInFlightCount(){return this.fillClient.inFlightCount}reshape(e,n,r){const s=Ah(e,n),i=this.blocks.length;for(let a=0;a<i;a++)this.onBlockRelease?.(a);this.radius=e,this.yRadius=n,this.bands=r,this.blocks.length=s,this.cells.length=s,this.filled.length=s;for(let a=i;a<s;a++){const l={x:0,y:0,z:0};this.blocks[a]=dp({center:[0,0,0],lod:sr(l,l,this.bands)}),this.cells[a]=l,this.filled[a]=!1}this.cellIndex=new cd(s*2),this.free.length=0,this.fillClient.resizeTo(s);const o=this.centerCell;return this.fillFrom(o.x*Je[0],o.y*Je[1],o.z*Je[2])}fillFrom(e,n,r){const s=So(e,n,r);this.centerCell={x:s[0],y:s[1],z:s[2]};const i=Ga(this.centerCell,this.radius,this.yRadius);for(let u=0;u<this.blocks.length;u++){this.cells[u]=i[u],this.cellIndex.set(i[u].x,i[u].y,i[u].z,u);const d=[i[u].x*Je[0],i[u].y*Je[1],i[u].z*Je[2]];this.blocks[u].center=d,this.filled[u]=!1,this.onBlockReposition(u,d)}const o=this.blocks.map((u,d)=>d);o.sort((u,d)=>this.distanceSquared(u,e,n,r)-this.distanceSquared(d,e,n,r));const[a,...l]=o,c=sr(this.cells[a],this.centerCell,this.bands);this.blocks[a].targetLod=c,this.fillClient.fillNow(a,c,ya(this.cells[a],this.centerCell,this.bands));for(const u of l)this.blocks[u].targetLod=sr(this.cells[u],this.centerCell,this.bands);return this.fillClient.requestFill(l,l.map(u=>this.blocks[u].center),l.map(u=>sr(this.cells[u],this.centerCell,this.bands)),l.map(u=>ya(this.cells[u],this.centerCell,this.bands)),[e,n,r]),a}distanceSquared(e,n,r,s){const[i,o,a]=this.blocks[e].center;return(i-n)**2+(o-r)**2+(a-s)**2}lodOf(e){return Math.round(Math.log2(this.blocks[e].store.scale/ft))}scrollTo(e,n,r){const[s,i,o]=So(e,n,r);if(s===this.centerCell.x&&i===this.centerCell.y&&o===this.centerCell.z)return;const a={x:s,y:i,z:o};me.begin(Qe.scrollCells);const l=Ga(a,this.radius,this.yRadius);me.end(Qe.scrollCells);const c=[];me.begin(Qe.scrollEvict);for(let f=0;f<this.blocks.length;f++){const m=this.cells[f];if(this.cellIndex.get(m.x,m.y,m.z)!==f)continue;if(!Gb(m,a,this.radius,this.yRadius)){this.onBlockRelease?.(f),this.cellIndex.delete(m.x,m.y,m.z),this.free.push(f);continue}const p=sr(m,a,this.bands);p!==this.lodOf(f)&&p!==this.blocks[f].targetLod&&(this.onBlockRelease?.(f),c.push(f),this.blocks[f].targetLod=p)}me.end(Qe.scrollEvict);const u=[];me.begin(Qe.scrollTeleport);for(const f of l){if(this.cellIndex.get(f.x,f.y,f.z)!==void 0)continue;const m=this.free.pop();if(m===void 0)throw new Error("[ChunkSphere] window pool exhausted");this.cells[m]=f,this.cellIndex.set(f.x,f.y,f.z,m);const p=[f.x*Je[0],f.y*Je[1],f.z*Je[2]];this.blocks[m].center=p,this.blocks[m].targetLod=sr(f,a,this.bands),this.filled[m]=!1,this.onBlockReposition(m,p),u.push(m)}me.end(Qe.scrollTeleport),this.centerCell=a;const d=[...u,...c];if(me.count(qn.scrolls),me.count(qn.blocksStreamed,d.length),d.length===0)return;me.begin(Qe.scrollOrder);const h=d.sort((f,m)=>this.distanceSquared(f,e,n,r)-this.distanceSquared(m,e,n,r));me.end(Qe.scrollOrder),me.begin(Qe.scrollRequest),this.fillClient.requestFill(h,h.map(f=>this.blocks[f].center),h.map(f=>sr(this.cells[f],this.centerCell,this.bands)),h.map(f=>ya(this.cells[f],this.centerCell,this.bands)),[e,n,r]),me.end(Qe.scrollRequest)}dispose(){this.fillClient.dispose()}}const Yb=32,gm=`usage: /world:radius <chunks> [chunks in Y]
chunks is how far the window reaches around the player, from 1 to ${Yb}, a chunk being 128 world units. A second number does the same up and down; smaller than the first it flattens the window, which suits a world with more ground than sky. Every block refills.`,ym=`usage: /world:lod off | auto | <full> <coarser>
full is how far full-resolution blocks reach and coarser how far the tier below it reaches; past that, blocks are coarsest. Each tier doubles the voxel size, so a block one tier out holds an eighth of the voxels and two tiers out a forty-ninth, which is what makes a wide window affordable. off keeps every block at full resolution however far away; auto puts the distances back to 3 and 4. Every block refills.`,pi=t=>{const e=t.lodBands,n=Nz(e)?"every block at full detail":`full detail to ${e.full} chunks, coarser to ${e.coarse}, coarsest beyond`,r=(t.voxelBytes/1048576).toFixed(1);return`window radius ${t.chunkRadius} chunks (${t.chunkRadiusY} in Y), ${t.blocks.length} blocks, ${t.ringRadius} world units of sight; ${n}; ${r}MiB of voxels and light`};class Bz{commands;constructor(e){this.commands=e}run(e){const[n,...r]=e.trim().toLowerCase().split(/\s+/);if(n==="/help")return this.help();const s=this.commands[n];return s===void 0?`unknown command "${e}" — try /help`:s.run(r)}names(){return this.help().map(e=>e.name).sort()}help(){return[{name:"/help",description:"list every command"},...Object.entries(this.commands).map(([e,n])=>({name:e,args:n.args,description:n.description}))]}}const to=t=>t instanceof Error?t.message:String(t),Uz=(t,e)=>{const n=t[0],r=n!==void 0&&(n.includes(".")||n.startsWith("did:")),s=r?t.slice(1):t;return{account:r?n:e,name:s.join(" ").trim()}},Hz=({renderer:t,workerPool:e,world:n,dayNight:r,weather:s,sound:i,atproto:o,multiplayer:a,health:l,places:c,placePublisher:u,defaultSeed:d,placeUri:h,navigate:f,togglePlaceEditor:m,script:p,resolution:y,setView:g,setPlayerVisible:b,setMoveSpeed:v,setLookSensitivity:x,setFlying:k,setNoClip:C,setDebugPerf:E,setShowStats:T,traceStart:A,traceMark:M,traceSnap:O,traceStop:S,setMultisampling:z})=>new Bz({"/clock:day":{description:"jump to noon (t=300s)",run:()=>(r.jumpTo(300),"jumped to noon (t=300s)")},"/clock:sunset":{description:"jump to dusk (t=645s)",run:()=>(r.jumpTo(645),"jumped to dusk (t=645s)")},"/clock:night":{description:"jump to midnight (t=900s)",run:()=>(r.jumpTo(900),"jumped to midnight (t=900s)")},"/clock:sunrise":{description:"jump to dawn (t=1120s)",run:()=>(r.jumpTo(1120),"jumped to dawn (t=1120s)")},"/clock:time":{description:"jump to a second of the 20-minute cycle",args:"<seconds>",run:w=>{const R=Number(w[0]);return!Number.isFinite(R)||R<0?"usage: /clock:time <seconds>  (0..1200, wraps)":(r.jumpTo(R),`time set to ${R}s`)}},"/clock:speed":{description:"run the clock that many times fast (0 pauses)",args:"<multiplier>",run:w=>{const R=Number(w[0]);return!Number.isFinite(R)||R<0?"usage: /clock:speed <multiplier>  (0 pauses, 1 = real time)":(r.setSpeed(R),`clock speed set to ${R}×`)}},"/clock:live":{description:"resume the live clock",run:()=>(r.clearOverride(),"resumed the live clock")},"/clock:state":{description:"show the current clock state",run:()=>r.describe()},"/world:workers":{description:"report, pin, or reset the world's worker count",args:"auto|<0..8>",run:w=>{const R=w[0];if(R===void 0||R==="auto")return R==="auto"&&e.setAuto(),e.describe();const F=Number(R);return Number.isInteger(F)&&F>=0&&F<=8?(e.setCount(F),e.describe()):"usage: /world:workers auto|<0..8>  (0 runs fills and meshes on the main thread)"}},"/world:radius":{description:"how far the streamed block window reaches, in chunks of 128 units",args:"<chunks> [chunks in Y]",run:w=>{if(w.length===0)return`${pi(n)}
${gm}`;const R=Number(w[0]),F=w[1]===void 0?void 0:Number(w[1]),D=Q=>Q===void 0||Number.isInteger(Q)&&Q>=1&&Q<=Yb;return!D(R)||!D(F)?gm:(n.reshape({chunkRadius:R,chunkRadiusY:F}),pi(n))}},"/world:lod":{description:"the distances at which blocks drop to coarser voxels, in chunks",args:"off|auto|<full> <coarser>",run:w=>{const R=w[0];if(R===void 0)return`${pi(n)}
${ym}`;if(R==="off")return n.reshape({lodBands:Dz}),pi(n);if(R==="auto")return n.reshape({lodBands:ic}),pi(n);const F=Number(R),D=Number(w[1]);return!Number.isInteger(F)||!Number.isInteger(D)||F<1||D<F?ym:(n.reshape({lodBands:{full:F,coarse:D}}),pi(n))}},"/render:resolution":{description:"adapt the render resolution, or pin it",args:"auto|<0.1..1>",run:w=>{const R=w[0];if(R===void 0)return y.describe();if(R==="auto")return y.setAuto(),y.describe();const F=Number(R);return Number.isFinite(F)&&F>0&&F<=1?(y.setFixed(F),y.describe()):"usage: /render:resolution auto|<0.1..1>  (1 renders every display pixel)"}},"/trace:start":{description:"record a walk, to hand to somebody who was not there",args:"<what you are looking for>",run:w=>A(w.join(" "))},"/trace:mark":{description:"mark this moment of the walk, and what is wrong with it",args:"<what you see>",run:w=>M(w.join(" "))},"/trace:snap":{description:"write down this one moment, without recording a walk",args:"<what you see>",run:w=>O(w.join(" "))},"/trace:stop":{description:"end the walk being recorded and write it down",run:()=>S()},"/debug:stats":{description:"show or hide the statistics toast",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?T(!0):R==="off"?T(!1):R===void 0?T():"usage: /debug:stats [on|off]"}},"/render:perf":{description:"show or hide the frame-time readout",args:"[on|off]",run:w=>{const R=w[0];return R===void 0?E():R==="on"?E(!0):R==="off"?E(!1):"usage: /render:perf [on|off]  (no argument flips it)"}},"/render:msaa":{description:"turn multisampling on or off, which remakes the canvas and reuploads to it",args:"[on|off]",run:w=>{const R=w[0];return R===void 0?z():R==="on"?z(!0):R==="off"?z(!1):"usage: /render:msaa [on|off]  (no argument flips it)"}},"/render:triangles":{description:"show the current triangle count",run:()=>`triangles: ${t.triangleCount.toLocaleString()}`},"/render:occlusion":{description:"turn the occlusion culler on/off, set its query interval, or force a fresh query",args:"[on|off|force] [<frames>]",run:w=>{const R=w[0];if(R==="off")return t.occlusionEnabled=!1,"occlusion: off";if(R==="on")return t.occlusionEnabled=!0,`occlusion: on, query every ${t.occlusionIntervalFrames} frames`;if(R==="force")return t.forceOcclusionQuery(),`occlusion: a fresh query runs next frame; last query saw ${t.lastVisibleCount} chunks`;if(R!==void 0){const F=Number(R);return Number.isFinite(F)&&F>=1?(t.occlusionIntervalFrames=F,`occlusion: on, query every ${t.occlusionIntervalFrames} frames`):"usage: /render:occlusion [on|off|force] [<frames>]"}return`occlusion: ${t.occlusionEnabled?"on":"off"}, query every ${t.occlusionIntervalFrames} frames, last query saw ${t.lastVisibleCount} chunks, hidden ${t.occlusions}: ${t.occlusionBreakdown}`}},"/render:probe":{description:"draw every chunk in its own colour, showing the occlusion probe view",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?(t.probeDebug=!0,t.forceOcclusionQuery(),"probe view: on — the world shows the occlusion culler's render"):R==="off"?(t.probeDebug=!1,"probe view: off"):R===void 0?(t.probeDebug=!t.probeDebug,t.forceOcclusionQuery(),`probe view: ${t.probeDebug?"on":"off"}`):"usage: /render:probe [on|off]  (no argument flips it)"}},"/sound:volume":{description:"set the sound volume (0 mutes)",args:"<0..1>",run:w=>{const R=Number(w[0]);return Number.isFinite(R)?i.setVolume(R):i.describe()}},"/sound:state":{description:"show the sound state",run:()=>i.describe()},"/player:view":{description:"switch the camera between first and third person",args:"first|third",run:w=>{const R=w[0];return R==="first"||R==="third"?g(R):"usage: /player:view first|third"}},"/player:cube":{description:"show or hide the player cube",args:"show|hide",run:w=>{const R=w[0];return R==="show"?b(!0):R==="hide"?b(!1):"usage: /player:cube show|hide"}},"/player:speed":{description:"set (or show) the player's move speed, in units per second",args:"[n]",run:w=>{const R=Number(w[0]);return v(w[0]===void 0||!Number.isFinite(R)||R<=0?void 0:R)}},"/player:sensitivity":{description:"set (or show) the look sensitivity, in radians per pixel",args:"[n]",run:w=>{const R=Number(w[0]);return x(w[0]===void 0||!Number.isFinite(R)||R<=0?void 0:R)}},"/player:fly":{description:"turn flight on or off (no gravity; W follows the look)",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?k(!0):R==="off"?k(!1):R===void 0?k():"usage: /player:fly [on|off]  (no argument flips it)"}},"/player:no-clip":{description:"turn no-clip on or off (fly through solid blocks)",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?C(!0):R==="off"?C(!1):R===void 0?C():"usage: /player:no-clip [on|off]  (no argument flips it)"}},"/player:heal":{description:"restore the player's hearts to full",run:()=>(l.heal(l.maxHp),`hearts restored to ${l.hp}`)},"/account:login":{description:"sign in through the Bluesky login popup",args:"[handle]",run:async w=>o.connect(w[0])},"/account:logout":{description:"sign out, and revoke the session that was signed in",run:async()=>o.signOut()},"/account:sync":{description:"upload new edits, then fetch and merge remote edit chunks",run:async()=>o.sync()},"/account:state":{description:"show which account is signed in",run:()=>o.describe()},"/multiplayer:start":{description:"bring the multiplayer mesh online",run:async()=>a.start()},"/multiplayer:stop":{description:"take the multiplayer mesh offline",run:async()=>a.stop()},"/multiplayer:state":{description:"show the multiplayer mesh's peers and connection state",run:()=>a.describe()},"/multiplayer:debug":{description:"show what every peer connection is doing",run:()=>a.describeDebug()},"/place:editor":{description:"open (or close) the place script editor",run:()=>m()},"/place:create":{description:`publish a new, empty place under your account, seeded from the world being played, and join it — modes: ${Is.join(", ")} (default solo:edit)`,args:"<name> [mode]",run:async w=>{const R=w[w.length-1],F=Is.find(H=>H===R),D=(F===void 0?w:w.slice(0,-1)).join(" ").trim();if(D==="")return`usage: /place:create <name> [${Is.join("|")}]`;const Q=Gu(d);Q.manifest.name=D,F!==void 0&&(Q.manifest.mode=F);try{const H=await u.publish(await Pa(Q)),J=Fs(H);if(J===null)return`created — ${H}`;const N=await o.resolveHandle(J.repo);return f(`/${N??J.repo}/${J.rkey}`),`created "${D}" — joining its world`}catch(H){return`create failed: ${to(H)}`}}},"/place:mode":{description:`sets this place's mode — modes: ${Is.join(", ")}. Only the place's owner may change it.`,args:"<mode>",run:async w=>{const R=Is.find(F=>F===w[0]);if(R===void 0)return`usage: /place:mode <mode>  (mode is one of ${Is.join(", ")})`;if(Fs(h)===null)return"this isn't a published place — there's no mode to set";if(o.did===null)return"sign in first — use /account:login";try{const F=await c.recordAtUri(h);if(F.repo!==o.did)return"only this place's owner can change its mode";const D=await qd(await c.file(F));return D.manifest.mode=R,await u.publish(await Pa(D)),`"${F.record.name}" is now ${R}`}catch(F){return`could not set mode: ${to(F)}`}}},"/place:publish":{description:"publish a place zip to your account — a file from this device, or a built-in demo by id",args:"[demo id]",run:w=>{const R=H=>u.publish(H).then(async J=>{const N=Fs(J);return N===null?`published — ${J}`:`published — /big-mesh-studios/voxelscape/#/${await o.resolveHandle(N.repo)??N.repo}/${N.rkey}`},J=>`publish failed: ${to(J)}`),F=w[0];if(F!==void 0){const H=Xu(F);return H===null?`no demo "${F}" — /place:demos lists them`:Xy(H).then(Pa).then(R)}let D;const Q=document.createElement("input");return Q.type="file",Q.accept=".zip,application/zip",Q.style.display="none",Q.onchange=()=>{const H=Q.files?.[0];if(Q.remove(),H===void 0){D("no zip picked");return}R(H).then(D)},Q.oncancel=()=>{Q.remove(),D("publish cancelled")},document.body.appendChild(Q),Q.click(),new Promise(H=>{D=H})}},"/place:published":{description:"list the places an account has published",args:"[handle]",run:async w=>{const R=w[0]??o.did;if(R==null)return"name the account whose places to list, or sign in first";try{const F=await c.list(R);return F.length===0?`${R} has published no places`:F.map(({record:D})=>{const[Q,H,J]=D.spawn;return`"${D.name}" — seed ${D.seed}, spawn ${Q},${H},${J}`}).join(`
`)}catch(F){return`nothing to list from ${R} — ${to(F)}`}}},"/place:join":{description:"join a place someone published, playing its world",args:"[handle] [name]",run:async w=>{const{account:R,name:F}=Uz(w,o.did);if(R==null)return"name the account whose place to join, or sign in first";if(F==="")return"usage: /place:join [handle] [name]";try{const D=await c.find(R,F),Q=await o.resolveHandle(D.repo);return f(`/${Q??D.repo}/${D.rkey}`),`joining "${D.record.name}" — loading its world`}catch(D){return`no "${F}" from ${R} — ${to(D)}`}}},"/place:demos":{description:"list the built-in demo places",run:async()=>Yu.map(w=>`${w.id} — ${w.manifest.name}`).join(`
`)||"no built-in demos"},"/place:demo":{description:"play a built-in demo place",args:"[id]",run:async w=>{const R=w[0]??Yu[0]?.id;if(R===void 0)return"no built-in demos";const F=Xu(R);return F===null?`no demo "${R}" — /place:demos lists them`:(f(`/demos/${F.id}`),`opening the demo "${F.manifest.name}" — loading its world`)}},"/script:demo":{description:"load and run the bundled sample place script",run:async()=>p.demo()},"/script:state":{description:"show what the loaded script is doing",run:async()=>p.state()},"/script:talk":{description:"start talking to an NPC the script placed",args:"<id>",run:async w=>p.talk(w[0]??"")},"/script:choose":{description:"pick an option of the current conversation",args:"<1..n>",run:async w=>{const R=Number(w[0]);return Number.isInteger(R)?p.choose(R):"usage: /script:choose <option number>"}},"/script:leave":{description:"end the current conversation",run:async()=>p.leave()},"/weather":{description:"set or resume the weather",args:"clear|rain|thunder|snow|auto",run:w=>{const R=w[0];return R==="clear"||R==="rain"||R==="thunder"||R==="snow"||R==="auto"?(s.setWeather(R),`weather set to ${R}`):s.describe()}},"/fullscreen":{description:"enter or leave fullscreen",args:"true|false",run:async([w])=>{if(!!w||w===void 0&&document.fullscreenElement!==document.body)try{return await document.body.requestFullscreen(),"full screen request succeeded."}catch{return"full screen request failed."}try{return document.exitFullscreen(),"exit screen request succeeded."}catch{return"exit fullscreen failed."}}},"/clear":{description:"clear the console output",run:()=>""}}),Ri=600,Bo=90,Th=420,Xb=90,To=Ri+Bo+Th+Xb,Tl=-8,Fr={sky:[.53,.81,.92],ambient:[.45,.5,.6],sunLight:[1,.98,.9],moonLight:[0,0,0]},is={sky:[.95,.5,.25],ambient:[.28,.2,.18],sunLight:[1,.5,.2],moonLight:[.15,.2,.35]},Br={sky:[.02,.03,.09],ambient:[.05,.07,.15],sunLight:[.05,.08,.15],moonLight:[.3,.4,.65]},Ya=(t,e,n)=>t+(e-t)*n,bm=(t,e,n)=>[Ya(t[0],e[0],n),Ya(t[1],e[1],n),Ya(t[2],e[2],n)],os=(t,e,n,r)=>r<.5?bm(t,e,r*2):bm(e,n,(r-.5)*2),oc=t=>(t%To+To)%To,ps=(t,e,n,r,s)=>Ya(n,s,(t-e)/(r-e)),Ch=t=>{const e=oc(t);return e<Ri?"day":e<Ri+Bo?"sunset":e<Ri+Bo+Th?"night":"sunrise"},jz=t=>{const e=oc(t);return e<300?ps(e,0,35,300,60):e<600?ps(e,300,60,600,35):e<690?ps(e,600,35,690,-25):e<1110?-25:ps(e,1110,-25,1200,35)},Wz=t=>{const e=oc(t);return e<600?ps(e,0,60,600,120):e<690?ps(e,600,120,690,130):e<1110?ps(e,690,130,1110,250):ps(e,1110,250,1200,300)},Vz=t=>{switch(Ch(t)){case"day":return Fr;case"night":return Br;case"sunset":{const e=(t-Ri)/Bo;return{sky:os(Fr.sky,is.sky,Br.sky,e),ambient:os(Fr.ambient,is.ambient,Br.ambient,e),sunLight:os(Fr.sunLight,is.sunLight,Br.sunLight,e),moonLight:os(Fr.moonLight,is.moonLight,Br.moonLight,e)}}case"sunrise":{const e=(t-Ri-Bo-Th)/Xb;return{sky:os(Br.sky,is.sky,Fr.sky,e),ambient:os(Br.ambient,is.ambient,Fr.ambient,e),sunLight:os(Br.sunLight,is.sunLight,Fr.sunLight,e),moonLight:os(Br.moonLight,is.moonLight,Fr.moonLight,e)}}}},Gz=(t,e)=>{const n=t*Math.PI/180,r=e*Math.PI/180;return[Math.cos(n)*Math.cos(r),Math.sin(n),Math.cos(n)*Math.sin(r)]},Yz=t=>{const e=oc(t),n=Vz(e),r=jz(e),s=-r,i=Gz(r,Wz(e)),o=[-i[0],-i[1],-i[2]];return{phase:Ch(e),elapsed:t,sunDir:i,moonDir:o,sunLight:n.sunLight,moonLight:n.moonLight,ambient:n.ambient,skyColor:n.sky,sunElevation:r,moonElevation:s,sunVisible:r>Tl,moonVisible:s>Tl}};class Xz{sun;sky=new Jn;ambient;sunMesh;moonMesh;skyDistance;elapsed=0;timeOverride=null;timeSpeed=1;constructor({skyDistance:e=600,sunSize:n=48,moonSize:r=32}={}){this.skyDistance=e,this.sun=new gh,this.sun.position.set(2,1,1),this.sky.add(this.sun),this.ambient=new mh(16777215,.6),this.sky.add(this.ambient);const s=new Fo({color:16773792});s.depthWrite=!1,this.sunMesh=new xn(new rd(n,n),s),this.sky.add(this.sunMesh);const i=new Fo({color:13620966});i.depthWrite=!1,this.moonMesh=new xn(new rd(r,r),i),this.sky.add(this.moonMesh)}shownTime(){return this.timeOverride??this.elapsed}tick(e,n){this.elapsed+=e*this.timeSpeed;const r=Yz(this.timeOverride??this.elapsed);this.sun.color.set(r.sunLight[0],r.sunLight[1],r.sunLight[2]),this.sun.position.set(r.sunDir[0],r.sunDir[1],r.sunDir[2]),this.ambient.color.set(r.ambient[0],r.ambient[1],r.ambient[2]),this.ambient.intensity=1;const s=n.position;return this.sunMesh.position.set(s.x+r.sunDir[0]*this.skyDistance,s.y+r.sunDir[1]*this.skyDistance,s.z+r.sunDir[2]*this.skyDistance),this.sunMesh.lookAt(s.x,s.y,s.z),this.sunMesh.visible=r.sunElevation>Tl,this.moonMesh.position.set(s.x+r.moonDir[0]*this.skyDistance,s.y+r.moonDir[1]*this.skyDistance,s.z+r.moonDir[2]*this.skyDistance),this.moonMesh.lookAt(s.x,s.y,s.z),this.moonMesh.visible=r.moonElevation>Tl,r}jumpTo(e){this.timeOverride=e}clearOverride(){this.timeOverride=null}setSpeed(e){this.timeSpeed=e}describe(){const e=this.shownTime();return`phase: ${Ch(e)} | t=${e.toFixed(1)}s | speed=${this.timeSpeed}× | live=${this.timeOverride===null}`}}const vm=2,qz=.55,Zz=.18,Kz=.5,Jz=.18,Qz=.3,e3=1.4,ba=.6,t3=343,wm="/big-mesh-studios/voxelscape/audio/rain.ogg",_m="/big-mesh-studios/voxelscape/audio/thunder.ogg",n3=.9,r3=t=>{const e=Math.max(0,t);return{delay:e/t3,gain:Math.exp(-e/160)}},xm=(t,e,n)=>{const r=Math.floor(t.sampleRate*e),s=t.createBuffer(1,r,t.sampleRate),i=s.getChannelData(0);if(n){let o=0;for(let a=0;a<r;a++){const l=Math.random()*2-1;o=(o+.02*l)/1.02,i[a]=o*3.5}}else for(let o=0;o<r;o++)i[o]=Math.random()*2-1;return s};class s3{ctx=null;master=null;whiteBuffer=null;brownBuffer=null;rain=null;rainBody=null;wind=null;rainLoop=null;rainLoopLoaded=!1;thunderBuffer=null;lfo=null;lastCamera=null;volume=1;unlock(){if(this.ctx!==null){this.ctx.state==="suspended"&&this.ctx.resume();return}const e=window.AudioContext??window.webkitAudioContext;if(e===void 0)return;const n=new e;this.ctx=n,this.master=n.createGain(),this.master.gain.value=this.volume,this.master.connect(n.destination),this.whiteBuffer=xm(n,vm,!1),this.brownBuffer=xm(n,vm,!0),this.rain=this.startLoop(n,this.whiteBuffer,"lowpass",2400,.4,0);const r=n.createOscillator();r.frequency.value=.35;const s=n.createGain();s.gain.value=400,r.connect(s),s.connect(this.rain.filter.frequency),r.start(),this.lfo=r,this.rainBody=this.startLoop(n,this.brownBuffer,"lowpass",500,.7,0),this.wind=this.startLoop(n,this.brownBuffer,"bandpass",420,.6,0),this.loadRainLoop(n),this.loadThunder(n)}async loadRainLoop(e){try{const n=await fetch(wm);if(!n.ok)throw new Error(`${wm}: ${n.status}`);const r=await e.decodeAudioData(await n.arrayBuffer());if(this.ctx!==e)return;this.rainLoop=this.startLoop(e,r,"highpass",40,.7,0),this.rainLoopLoaded=!0}catch(n){console.warn("[sound] rain recording not loaded; using procedural bed.",n)}}async loadThunder(e){try{const n=await fetch(_m);if(!n.ok)throw new Error(`${_m}: ${n.status}`);const r=await e.decodeAudioData(await n.arrayBuffer());if(this.ctx!==e)return;this.thunderBuffer=r}catch(n){console.warn("[sound] thunder recording not loaded; using synthesized thunder.",n)}}startLoop(e,n,r,s,i,o){const a=e.createBufferSource();a.buffer=n,a.loop=!0;const l=e.createBiquadFilter();l.type=r,l.frequency.value=s,l.Q.value=i;const c=e.createGain();return c.gain.value=o,a.connect(l),l.connect(c),c.connect(this.master),a.start(),{source:a,filter:l,gain:c}}tick(e,n,r){this.lastCamera=n;const s=this.ctx;if(s===null||this.rain===null||this.rainBody===null||this.wind===null)return;const{weather:i,intensity:o}=r,a=i==="rain"||i==="thunder",l=i==="snow"?e3:1,c=s.currentTime;this.rain.gain.gain.setTargetAtTime(a?o*(this.rainLoopLoaded?Zz:Kz):0,c,ba),this.rainLoop!==null&&this.rainLoop.gain.gain.setTargetAtTime(a?o*qz:0,c,ba),this.rainBody.gain.gain.setTargetAtTime(a?o*Jz:0,c,ba),this.wind.gain.gain.setTargetAtTime(o*Qz*l,c,ba)}thunderStrike(e,n){const r=this.ctx;if(r===null)return;const s=this.lastCamera,i=s===null?60:Math.hypot(e-s.position.x,n-s.position.z),{delay:o,gain:a}=r3(i),l=r.currentTime+o,c=Math.min(1,a*n3);this.thunderBuffer!==null?this.playThunderClap(r,l,c):(this.playCrack(r,l,c),this.playRumble(r,l+.05+Math.random()*.1,c)),this.playSubRumble(r,l,c)}playThunderClap(e,n,r){const s=e.createBufferSource();s.buffer=this.thunderBuffer,s.playbackRate.value=.92+Math.random()*.16;const i=e.createGain();i.gain.setValueAtTime(0,n),i.gain.linearRampToValueAtTime(r,n+.02),s.connect(i),i.connect(this.master);const o=this.thunderBuffer.duration;s.start(n),s.stop(n+o+.05)}playSubRumble(e,n,r){const s=e.createOscillator();s.type="sine",s.frequency.value=42+Math.random()*14;const i=e.createGain(),o=2.5+Math.random()*1.5;i.gain.setValueAtTime(0,n+.15),i.gain.linearRampToValueAtTime(r*.2,n+.25),i.gain.exponentialRampToValueAtTime(.001,n+.15+o),s.connect(i),i.connect(this.master),s.start(n+.15),s.stop(n+.15+o)}playCrack(e,n,r){const s=e.createBufferSource();s.buffer=this.whiteBuffer;const i=e.createBiquadFilter();i.type="highpass",i.frequency.value=1200;const o=e.createGain(),a=.08+Math.random()*.05;o.gain.setValueAtTime(0,n),o.gain.linearRampToValueAtTime(r*.5,n+.005),o.gain.exponentialRampToValueAtTime(.001,n+a),s.connect(i),i.connect(o),o.connect(this.master),s.start(n),s.stop(n+a+.05)}playRumble(e,n,r){const s=2+Math.random()*2,i=e.createBufferSource();i.buffer=this.brownBuffer;const o=e.createBiquadFilter();o.type="lowpass",o.frequency.setValueAtTime(240+Math.random()*160,n),o.frequency.exponentialRampToValueAtTime(60,n+s);const a=e.createGain();a.gain.setValueAtTime(0,n),a.gain.linearRampToValueAtTime(r,n+.04),a.gain.exponentialRampToValueAtTime(.001,n+s),i.connect(o),o.connect(a),a.connect(this.master),i.start(n),i.stop(n+s+.1);const l=e.createOscillator();l.type="sine",l.frequency.value=46+Math.random()*16;const c=e.createGain();c.gain.setValueAtTime(0,n),c.gain.linearRampToValueAtTime(r*.25,n+.05),c.gain.exponentialRampToValueAtTime(.001,n+s*.9),l.connect(c),c.connect(this.master),l.start(n),l.stop(n+s)}setVolume(e){this.volume=Math.max(0,Math.min(1,e));const n=this.ctx;return this.master!==null&&n!==null&&this.master.gain.setTargetAtTime(this.volume,n.currentTime,.1),`volume set to ${this.volume.toFixed(2)}`}describe(){return`sound: ${this.ctx?.state??"locked (waiting for input)"} | volume=${this.volume.toFixed(2)}`}dispose(){this.rain?.source.stop(),this.rainBody?.source.stop(),this.wind?.source.stop(),this.rainLoop?.source.stop(),this.lfo?.stop(),this.rain=null,this.rainBody=null,this.wind=null,this.rainLoop=null,this.rainLoopLoaded=!1,this.thunderBuffer=null,this.lfo=null;const e=this.ctx;this.ctx=null,this.master=null,this.whiteBuffer=null,this.brownBuffer=null,e!==null&&e.close()}}const i3=1.5*To,o3=7*To,km=60,a3=240,l3=t=>{let e=t|0;return()=>{e=e+1831565813|0;let n=Math.imul(e^e>>>15,1|e);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}},c3=(t,e)=>l3(t^Math.imul(e,2654435769)|0),u3=t=>t<.5?"rain":t<.8?"thunder":"snow",d3=(t,e)=>{if(e<0)return{weather:"clear",startedAt:-1/0,endsAt:0};let n=0;for(let r=0;;r++){const s=c3(t,r),i=n+i3+s()*o3;if(e<i)return{weather:"clear",startedAt:n,endsAt:i};const o=km+s()*(a3-km),a=i+o;if(e<a)return{weather:u3(s()),startedAt:i,endsAt:a};n=a}},h3={rain:{skyTint:[.42,.47,.52],ambientScale:.65,sunScale:.55,moonScale:.85},thunder:{skyTint:[.16,.18,.24],ambientScale:.4,sunScale:.25,moonScale:.7},snow:{skyTint:[.68,.74,.78],ambientScale:.85,sunScale:.7,moonScale:1}},f3=t=>t==="clear"?{skyTint:[.53,.81,.92],ambientScale:1,sunScale:1,moonScale:1}:h3[t],p3=(t,e,n)=>[t[0]+(e[0]-t[0])*n,t[1]+(e[1]-t[1])*n,t[2]+(e[2]-t[2])*n],hu=(t,e)=>[t[0]*e,t[1]*e,t[2]*e],m3=(t,e,n)=>{const r=Math.max(0,Math.min(1,n));if(r===0)return t;const s=f3(e);return{...t,skyColor:p3(t.skyColor,s.skyTint,r),ambient:hu(t.ambient,1+(s.ambientScale-1)*r),sunLight:hu(t.sunLight,1+(s.sunScale-1)*r),moonLight:hu(t.moonLight,1+(s.moonScale-1)*r)}},g3=24301,y3=5e3,b3=4e3,v3=5,w3=3.5,Sm=150,_3=.18,Em=.3,x3=.3,Am={count:y3,spreadX:100,spreadZ:100,tileSize:200,minY:-80,maxY:220,fallSpeed:90,windX:4,windZ:1,sizeMin:[.05,.6],sizeMax:[.1,1.8],lifeMin:.8,lifeMax:1.8},Tm={count:b3,spreadX:120,spreadZ:120,tileSize:240,minY:-80,maxY:240,fallSpeed:6,windX:2,windZ:.5,sizeMin:[.1,.1],sizeMax:[.2,.2],lifeMin:6,lifeMax:10},k3=t=>{const e=t.count,n=new Float32Array(e*4*3),r=new Float32Array(e*4*2),s=new Float32Array(e*4*3),i=new Float32Array(e*4),o=new Float32Array(e*4),a=new Float32Array(e*4*2),l=new Float32Array(e*4),c=new Float32Array(e*4*2),u=new Uint16Array(e*6),d=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let h=0;h<e;h++){const f=(Math.random()*2-1)*t.spreadX,m=(Math.random()*2-1)*t.spreadZ,p=t.minY+Math.random()*(t.maxY-t.minY),y=t.lifeMin+Math.random()*(t.lifeMax-t.lifeMin),g=Math.random()*y,b=t.sizeMin[0]+Math.random()*(t.sizeMax[0]-t.sizeMin[0]),v=t.sizeMin[1]+Math.random()*(t.sizeMax[1]-t.sizeMin[1]),x=Math.random()*Math.PI*2,k=t.fallSpeed*(.85+Math.random()*.3),C=(t.windX+(Math.random()*2-1)*2)*y,E=-k*y,T=(t.windZ+(Math.random()*2-1)*2)*y,A=h*4;for(let M=0;M<4;M++){const O=A+M,S=O*3,z=O*2;n[S]=f,n[S+1]=p,n[S+2]=m,s[S]=C,s[S+1]=E,s[S+2]=T,r[z]=d[M][0],r[z+1]=d[M][1],c[z]=(d[M][0]+1)/2,c[z+1]=(d[M][1]+1)/2,i[O]=y,o[O]=g,a[z]=b,a[z+1]=v,l[O]=x}u[h*6+0]=A,u[h*6+1]=A+1,u[h*6+2]=A+2,u[h*6+3]=A,u[h*6+4]=A+2,u[h*6+5]=A+3}return{positions:n,corners:r,drifts:s,lives:i,offsets:o,sizes:a,spins:l,uvs:c,indices:u}},Cm=t=>{const e=k3(t),n=new Jr;return n.setAttribute("particlePos",new Le(e.positions,3)),n.setAttribute("corner",new Le(e.corners,2)),n.setAttribute("drift",new Le(e.drifts,3)),n.setAttribute("life",new Le(e.lives,1)),n.setAttribute("offset",new Le(e.offsets,1)),n.setAttribute("size",new Le(e.sizes,2)),n.setAttribute("spin",new Le(e.spins,1)),n.setAttribute("uv",new Le(e.uvs,2)),n.setIndex(e.indices),n};class Mm extends pr{time=0;intensity=0;tint=[.75,.8,.9];sway=0;disc=!1;tileSize=200;camPos=[0,0,0];timeUniform;intensityUniform;tintUniform;swayUniform;camPosUniform;tileUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!1,this.side=Qr.DoubleSide}setup(e,n){this.timeUniform=e.materialUniform("time","float",()=>this.time),this.intensityUniform=e.materialUniform("intensity","float",()=>this.intensity),this.tintUniform=e.materialUniform("tint","vec3",()=>this.tint),this.swayUniform=e.materialUniform("sway","float",()=>this.sway),this.camPosUniform=e.materialUniform("camPos","vec3",()=>this.camPos),this.tileUniform=e.materialUniform("tileSize","float",()=>this.tileSize)}buildVertexBody(e){const n=this.timeUniform??V(0),r=this.swayUniform??V(0),s=this.camPosUniform??Oe(0),i=this.tileUniform??V(200),o=e.attribute("particlePos","vec3"),a=e.attribute("corner","vec2"),l=e.attribute("drift","vec3"),c=e.attribute("life","float"),u=e.attribute("offset","float"),d=e.attribute("size","vec2"),h=e.attribute("spin","float"),f=e.attribute("uv","vec2"),m=ja(n.add(u),c).div(c).toVar(),p=Xn(V(0),V(.08),m),y=V(1).sub(Xn(V(.8),V(1),m)),g=p.mul(y).toVar(),b=Oe(o.x.add(l.x.mul(m)).add(xl(n.mul(V(1.4)).add(h)).mul(r).mul(V(1).sub(m))),o.y.add(l.y.mul(m)),o.z.add(l.z.mul(m)).add(xl(n.mul(V(1.1)).add(h)).mul(r).mul(V(1).sub(m)))).toVar(),v=i.mul(V(.5)),x=ja(b.x.sub(s.x).add(v),i).sub(v).toVar(),k=ja(b.z.sub(s.z).add(v),i).sub(v).toVar(),C=Oe(s.x.add(x),s.y.add(b.y),s.z.add(k)).toVar(),E=e.viewMatrix.mul(Ie(C,V(1))).toVar(),T=a.mul(d.mul(g)).toVar(),A=E.xyz.add(Oe(T.x,T.y,V(0))).toVar();return e.varying("vUv","vec2").assign(f),e.varying("vFade","float").assign(g),e.projectionMatrix.mul(Ie(A,E.w))}buildFragmentBody(e){const n=e.varying("vUv","vec2"),r=e.varying("vFade","float"),s=this.tintUniform??Oe(1),i=this.intensityUniform??V(0),o=n.sub(Vt(.5)).toVar();let a;if(this.disc){const l=o.length();a=V(1).sub(Xn(V(.42),V(.5),l))}else{const l=Vt(1).sub(Xn(V(.4),V(.5),o.abs().mul(Vt(2))));a=l.x.mul(l.y)}return Ie(s,a.mul(r).mul(i))}}class Rm{mesh;material;level=0;rampSeconds;constructor(e,n,r){this.material=e,this.mesh=new xn(n,e),this.mesh.visible=!1,this.rampSeconds=r}setTarget(e,n){const r=n/this.rampSeconds;this.level=this.level<e?Math.min(e,this.level+r):Math.max(e,this.level-r),this.material.intensity=this.level,this.mesh.visible=this.level>.005}follow(e,n){this.material.time=n,this.material.camPos=[e.position.x,e.position.y,e.position.z],this.mesh.position.copy(e.position)}}const Pm=(t,e,n,r,s,i,o,a)=>{const l=[t,e,n];for(let c=1;c<o;c++){const u=c/o;l.push(t+(r-t)*u+(Math.random()*2-1)*a,e+(s-e)*u,n+(i-n)*u+(Math.random()*2-1)*a)}return l.push(r,s,i),l},Im=(t,e)=>{const n=[];for(let r=0;r+3<=e.length-3;r+=3)n.push(e[r],e[r+1],e[r+2],e[r+3],e[r+4],e[r+5]);t.setPositions(n),t.getAttribute("instanceStart").needsUpdate=!0,t.getAttribute("instanceEnd").needsUpdate=!0};class S3{groundHeight;onStrike;seed;rampSeconds;strikeMean;rain;snow;weather=new Jn;bolts;flashMesh;flashMaterial;forcedWeather=null;intensity=0;time=0;lastClockSeconds=0;inThunder=!1;nextStrikeAt=0;strike=null;flashOpacity=0;scheduleWeather="clear";tintWeather="clear";constructor(e){const{groundHeight:n,onStrike:r,seed:s,rampSeconds:i,strikeInterval:o}=e;this.groundHeight=n,this.onStrike=r,this.seed=s??g3,this.rampSeconds=i??v3,this.strikeMean=o??w3,this.rain=new Rm(new Mm,Cm(Am),this.rampSeconds),this.rain.material.tileSize=Am.tileSize,this.rain.material.tint=[.75,.8,.9],this.rain.material.sway=.4,this.snow=new Rm(new Mm,Cm(Tm),this.rampSeconds),this.snow.material.tileSize=Tm.tileSize,this.snow.material.tint=[.95,.97,1],this.snow.material.sway=1.6,this.snow.material.disc=!0,this.bolts=[this.makeBolt(),this.makeBolt()],this.weather.add(this.rain.mesh,this.snow.mesh,...this.bolts),this.flashMaterial=new Fo({color:16777215,transparent:!0,opacity:0}),this.flashMaterial.blending=qs.AdditiveBlending,this.flashMaterial.depthTest=!1,this.flashMaterial.depthWrite=!1,this.flashMesh=new xn(new Gi(3e3,3e3,3e3),this.flashMaterial),this.flashMesh.visible=!1,this.weather.add(this.flashMesh)}makeBolt(){const e=new _h({color:13623551,linewidth:.7,worldUnits:!0,transparent:!0,opacity:0});e.blending=qs.AdditiveBlending,e.depthWrite=!1;const n=new LR(new hb,e);return n.visible=!1,n}currentState(e){return this.forcedWeather!==null?{weather:this.forcedWeather,startedAt:-1/0,endsAt:1/0}:d3(this.seed,e)}spawnStrike(e,n){const r=this.groundHeight(e,n);Number.isFinite(r)&&(this.onStrike?.(e,n),this.strike={main:this.bolts[0],branch:this.bolts[1],state:"active",timeLeft:_3,x:e,z:n,groundY:r,topY:r+60+Math.random()*40},this.strike.main.material.opacity=1,this.strike.main.visible=!0,this.strike.branch!==null&&(this.strike.branch.material.opacity=.7,this.strike.branch.visible=!0),this.flashOpacity=.9,this.rewriteStrike())}rewriteStrike(){const e=this.strike;if(e===null)return;const n=Math.hypot(e.x,e.z),r=Math.max(3,n*.15),s=Pm(e.x,e.topY,e.z,e.x,e.groundY,e.z,9,r);if(Im(e.main.geometry,s),e.branch!==null){const i=e.x+(Math.random()*2-1)*r*1.5,o=e.z+(Math.random()*2-1)*r*1.5,a=e.groundY+(e.topY-e.groundY)*(.4+Math.random()*.25),l=i+(Math.random()*2-1)*30,c=o+(Math.random()*2-1)*30,u=e.groundY+10+Math.random()*30,d=Pm(i,a,o,l,u,c,5,r*.6);Im(e.branch.geometry,d)}}updateStrike(e){const n=this.strike;if(n!==null)if(n.timeLeft-=e,n.state==="active")n.timeLeft<=0?(n.state="fade",n.timeLeft=Em):this.rewriteStrike();else{const r=1-Math.max(0,n.timeLeft)/Em;n.main.material.opacity=1-r,n.branch!==null&&(n.branch.material.opacity=(1-r)*.7),n.timeLeft<=0&&(n.main.visible=!1,n.branch!==null&&(n.branch.visible=!1),this.strike=null)}}tick(e,n,r){this.time+=e,this.lastClockSeconds=r;const s=this.currentState(r).weather;s!==this.scheduleWeather&&(this.scheduleWeather=s,s!=="clear"&&(this.tintWeather=s));const i=s==="clear"?0:1,o=e/this.rampSeconds;return this.intensity=this.intensity<i?Math.min(i,this.intensity+o):Math.max(i,this.intensity-o),this.intensity<=.001&&(this.tintWeather="clear"),this.rain.setTarget(s==="rain"||s==="thunder"?1:0,e),this.snow.setTarget(s==="snow"?1:0,e),this.rain.follow(n,this.time),this.snow.follow(n,this.time),s==="thunder"&&this.intensity>.4?(this.inThunder||(this.inThunder=!0,this.nextStrikeAt=this.time+.5+Math.random()*1.5),this.strike===null&&this.time>=this.nextStrikeAt&&(this.spawnStrike(n.position.x+(Math.random()*2-1)*Sm,n.position.z+(Math.random()*2-1)*Sm),this.nextStrikeAt=this.time+this.strikeMean*(.4+Math.random()))):this.inThunder=!1,this.updateStrike(e),this.flashOpacity>0&&(this.flashOpacity=Math.max(0,this.flashOpacity-e/x3)),this.flashMesh.position.copy(n.position),this.flashMaterial.opacity=this.flashOpacity,this.flashMesh.visible=this.flashOpacity>.002,{weather:this.tintWeather,intensity:this.intensity}}setWeather(e){this.forcedWeather=e==="auto"?null:e}describe(){const e=this.currentState(this.lastClockSeconds),n=this.forcedWeather===null?"auto":"forced",r=Number.isFinite(e.endsAt)?`until ${e.endsAt.toFixed(0)}s`:"indefinite";return`weather: ${e.weather} (${n}) | intensity=${this.intensity.toFixed(2)} | ${r}`}}const E3=({groundHeightAt:t})=>{const e=new Xz,n=new s3,r=new S3({groundHeight:t,onStrike:(a,l)=>n.thunderStrike(a,l)}),s=new AbortController,i=()=>{n.unlock(),s.abort()},{signal:o}=s;return window.addEventListener("pointerdown",i,{signal:o}),window.addEventListener("keydown",i,{signal:o}),{dayNight:e,weather:r,sound:n,sky:e.sky,weatherEffects:r.weather,tick(a,l){const c=e.tick(a,l),u=r.tick(a,l,c.elapsed);return n.tick(a,l,u),m3(c,u.weather,u.intensity)},dispose(){n.dispose(),s.abort()}}},A3=1440*60*1e3,T3=1e4,C3=8;class M3{wallNow;self=null;rosterDids=new Set;samples=new Map;constructor(e={}){this.wallNow=e.wallNow??(()=>Date.now())}setSelf(e){this.self=e}setRoster(e){this.rosterDids.clear();for(const n of e)this.rosterDids.add(n)}get referenceDid(){const e=this.self;if(e===null)return null;let n=e;for(const r of this.rosterDids)r<n&&(n=r);return n}observe(e,n,r,s){const i=s-n;if(!Number.isFinite(i)||i<0||i>T3||!Number.isFinite(r))return;const o=r-(n+s)/2;if(!Number.isFinite(o)||Math.abs(o)>A3)return;const a=this.samples.get(e)??[];a.push({offset:o,rtt:i}),a.length>C3&&a.shift(),this.samples.set(e,a)}offsetTo(e){const n=this.samples.get(e);if(n===void 0||n.length===0)return null;let r=n[0];for(const s of n)s.rtt<r.rtt&&(r=s);return r.offset}get offset(){const e=this.referenceDid;return e===null?0:this.offsetTo(e)??0}now(){return this.wallNow()+this.offset}forget(e){this.samples.delete(e),this.rosterDids.delete(e)}reset(){this.self=null,this.rosterDids.clear(),this.samples.clear()}describe(){const e=this.referenceDid,n=[...this.samples.entries()].map(([r,s])=>`${r}=${s.map(i=>i.offset).join(",")}`).join(" ");return`reference=${e??"none"} offset=${this.offset}ms ${n}`}}const R3=(t,e)=>t.filter(n=>n.scope===e).map(n=>n.did),P3=1e5,I3=255,yr=64,Om=64,O3=256,z3=32,L3=1e3,$3=1e6,D3=t=>!Array.isArray(t)||t.length!==3?!1:t.every(e=>typeof e=="number"&&Number.isInteger(e)&&Math.abs(e)<=P3),Cn=(t,e)=>typeof t=="string"&&t.length>=1&&t.length<=e,zm=t=>typeof t=="number"&&Number.isFinite(t)&&Math.abs(t)<=$3,fu=t=>Cn(t,O3),N3=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return!Cn(e.id,yr)||!fu(e.producer)||typeof e.at!="number"||!Number.isFinite(e.at)||e.at<0?!1:e.kind==="block-broken"||e.kind==="block-placed"?D3(e.voxel)&&typeof e.blockId=="number"&&Number.isInteger(e.blockId)&&e.blockId>=0&&e.blockId<=I3:e.kind==="entity-killed"?Cn(e.entityId,yr)&&(e.by===""||fu(e.by)):e.kind==="player-joined"||e.kind==="player-left"?fu(e.player):e.kind==="entity-used"?Cn(e.entityId,yr)&&(e.item===""||Cn(e.item,Om)):e.kind==="entity-hit"?Cn(e.entityId,yr)&&typeof e.amount=="number"&&Number.isFinite(e.amount)&&e.amount>0&&e.amount<=L3&&zm(e.attackerX)&&zm(e.attackerZ):e.kind==="item-used"?Cn(e.item,Om):e.kind==="zone-entered"||e.kind==="zone-left"?Cn(e.zoneId,yr):e.kind==="npc-talk"||e.kind==="npc-leave"?Cn(e.npcId,yr):e.kind==="timer"?Cn(e.timerId,yr):e.kind==="player-touched"?Cn(e.entityId,yr):e.kind==="player-died"?e.cause===""||Cn(e.cause,yr):e.kind==="npc-choose"?Cn(e.npcId,yr)&&typeof e.option=="number"&&Number.isInteger(e.option)&&e.option>=0&&e.option<=z3:!1},F3=t=>{let e;if(typeof t=="string"||t instanceof Uint8Array)try{e=JSON.parse(typeof t=="string"?t:new TextDecoder().decode(t))}catch{return null}else e=t;return Array.isArray(e)&&e.every(N3)?e:null},Lm=(t,e)=>t<e?-1:t>e?1:0,BN=(t,e)=>t.at-e.at||Lm(t.producer,e.producer)||Lm(t.id,e.id),Ur=(t,e)=>{const n=10**e;return Math.round(t*n)/n},Pi=1e5,B3=255,U3=512,H3=32,j3=32,W3=100,V3=t=>{const e=t;return e.type==="pose"&&e.v===1&&typeof e.seq=="number"&&typeof e.t=="number"&&typeof e.x=="number"&&typeof e.y=="number"&&typeof e.z=="number"&&typeof e.yaw=="number"&&typeof e.pitch=="number"},G3=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return Number.isInteger(e.x)&&Number.isInteger(e.y)&&Number.isInteger(e.z)&&Math.abs(e.x)<=Pi&&Math.abs(e.y)<=Pi&&Math.abs(e.z)<=Pi&&Number.isInteger(e.id)&&e.id>=0&&e.id<=B3&&typeof e.ts=="number"&&Number.isFinite(e.ts)&&e.ts>=0},Y3=t=>{const e=t;return e.type!=="edit"||e.v!==1||typeof e.seq!="number"||typeof e.t!="number"?!1:Array.isArray(e.edits)&&e.edits.length<=U3&&e.edits.every(G3)},X3=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return typeof e.id=="string"&&e.id.length>=1&&e.id.length<=64&&typeof e.x=="number"&&Number.isFinite(e.x)&&Math.abs(e.x)<=Pi&&typeof e.y=="number"&&Number.isFinite(e.y)&&Math.abs(e.y)<=Pi&&typeof e.z=="number"&&Number.isFinite(e.z)&&Math.abs(e.z)<=Pi&&typeof e.yaw=="number"&&Number.isFinite(e.yaw)},q3=t=>{const e=t;return e.type!=="script-entity"||e.v!==1||typeof e.seq!="number"||typeof e.t!="number"?!1:Array.isArray(e.updates)&&e.updates.length<=H3&&e.updates.every(X3)},Z3=t=>{const e=t;return e.type!=="script-event"||e.v!==1||typeof e.seq!="number"||typeof e.t!="number"||!Array.isArray(e.events)||e.events.length>j3?!1:F3(e.events)!==null},K3=t=>{const e=t;return e.type==="player-damage"&&e.v===1&&typeof e.seq=="number"&&typeof e.t=="number"&&typeof e.target=="string"&&e.target.length>=1&&e.target.length<=256&&Number.isInteger(e.amount)&&e.amount>=1&&e.amount<=W3},J3=1e13,$m=t=>typeof t=="number"&&Number.isFinite(t)&&t>=0&&t<=J3,Q3=t=>{const e=t;return e.type==="time"&&e.v===1&&$m(e.t1)&&(e.t2===void 0||$m(e.t2))},mi=t=>t.type==="pose"?JSON.stringify({v:1,type:"pose",seq:t.seq,t:Math.round(t.t),x:Ur(t.x,2),y:Ur(t.y,2),z:Ur(t.z,2),yaw:Ur(t.yaw,4),pitch:Ur(t.pitch,4)}):t.type==="edit"?JSON.stringify({v:1,type:"edit",seq:t.seq,t:Math.round(t.t),edits:t.edits}):t.type==="player-damage"?JSON.stringify({v:1,type:"player-damage",seq:t.seq,t:Math.round(t.t),target:t.target,amount:t.amount}):t.type==="script-entity"?JSON.stringify({v:1,type:"script-entity",seq:t.seq,t:Math.round(t.t),updates:t.updates.map(e=>({id:e.id,x:Ur(e.x,2),y:Ur(e.y,2),z:Ur(e.z,2),yaw:Ur(e.yaw,4)}))}):t.type==="time"?JSON.stringify({v:1,type:"time",t1:Math.round(t.t1),...t.t2!==void 0?{t2:Math.round(t.t2)}:{}}):JSON.stringify({v:1,type:"script-event",seq:t.seq,t:Math.round(t.t),events:t.events}),eL=t=>{if(typeof t!="string"&&!(t instanceof Uint8Array))return null;let e;try{e=JSON.parse(typeof t=="string"?t:new TextDecoder().decode(t))}catch{return null}if(typeof e!="object"||e===null)return null;const n=e;return V3(n)||Y3(n)||K3(n)||q3(n)||Z3(n)||Q3(n)?n:null},tL=2e4,nL=2e4;class pu{did;selfDid;onOpen;onPose;onEdits;onScriptEntities;onScriptEvents;onPlayerDamage;onTime;onClose;onError;wallNow;role;transport;phase="waiting";destroyed=!1;startedAt=Date.now();timer;lastError=null;constructor(e){this.did=e.did,this.selfDid=e.selfDid,this.onOpen=e.onOpen,this.onPose=e.onPose,this.onEdits=e.onEdits,this.onScriptEntities=e.onScriptEntities,this.onScriptEvents=e.onScriptEvents,this.onPlayerDamage=e.onPlayerDamage,this.onTime=e.onTime,this.onClose=e.onClose,this.onError=e.onError,this.wallNow=e.wallNow??(()=>Date.now()),this.role=this.selfDid<this.did?"initiator":"responder",e.transport!==void 0?this.attach(e.transport):this.armTimer(tL,()=>this.fail("no incoming connection"))}get connected(){return this.phase==="open"}canAttach(){return!this.destroyed&&this.phase==="waiting"}attach(e){if(!this.canAttach()){e.destroy();return}this.clearTimer(),this.transport=e,this.wire()}sendPose(e,n){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(mi({v:1,type:"pose",seq:n,t:Date.now(),...e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendEdits(e,n){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(mi({v:1,type:"edit",seq:n,t:Date.now(),edits:e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendScriptEntities(e,n){if(!(this.destroyed||this.phase!=="open"||e.length===0))try{this.transport?.send(mi({v:1,type:"script-entity",seq:n,t:Date.now(),updates:e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendScriptEvents(e,n){if(!(this.destroyed||this.phase!=="open"||e.length===0))try{this.transport?.send(mi({v:1,type:"script-event",seq:n,t:Date.now(),events:e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendPlayerDamage(e){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(mi(e))}catch(n){this.fail(n instanceof Error?n.message:String(n))}}sendTime(e,n){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(mi({v:1,type:"time",t1:e,...n!==void 0?{t2:n}:{}}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}close(e="closed"){if(!this.destroyed){this.destroyed=!0,this.phase="closed",this.clearTimer();try{this.transport?.destroy()}catch{}this.onClose(this.did)}}describe(){const e=Math.round((Date.now()-this.startedAt)/1e3);return`role=${this.role} phase=${this.phase} up=${e}s${this.lastError!==null?` lastError=${this.lastError}`:""}`}wire(){this.phase="connecting",this.transport?.on("connect",()=>this.handleOpen()),this.transport?.on("data",e=>this.handleData(e)),this.transport?.on("close",()=>this.close("peer closed")),this.transport?.on("error",e=>this.fail(e.message,e.code)),this.armTimer(nL,()=>this.fail("connection did not open"))}handleOpen(){this.destroyed||(this.phase="open",this.clearTimer(),this.onOpen(this.did))}armTimer(e,n){this.clearTimer(),this.timer=setTimeout(n,e)}clearTimer(){this.timer!==void 0&&(clearTimeout(this.timer),this.timer=void 0)}handleData(e){if(this.destroyed)return;const n=eL(e);n!==null&&(n.type==="pose"?this.onPose(this.did,n):n.type==="edit"?this.onEdits(this.did,n.edits):n.type==="player-damage"?this.onPlayerDamage(this.did,n):n.type==="script-entity"?this.onScriptEntities(this.did,n.updates):n.type==="time"?n.t2===void 0?this.sendTime(n.t1,this.wallNow()):this.onTime(this.did,n.t1,n.t2):this.onScriptEvents(this.did,n.events))}fail(e,n){this.lastError=n!==void 0?`${n}: ${e}`:e,this.onError(this.did,e,n),this.close(e)}}const Ls="app.bms.voxelscape.presence",mu="latest",qb=t=>{let e=0;for(let n=0;n<t.length;n++)e=Math.imul(e,31)+t.charCodeAt(n)|0;return(e>>>0).toString(36)},rL=(t,e,n,r,s,i,o)=>({$type:Ls,x:Math.round(t),y:Math.round(e),z:Math.round(n),seed:r,scope:s,...o!==void 0?{joinCode:o}:{},updatedAt:i}),sL=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return e.$type===Ls&&typeof e.x=="number"&&typeof e.y=="number"&&typeof e.z=="number"&&(e.seed===null||typeof e.seed=="number")&&typeof e.scope=="string"&&(e.joinCode===void 0||typeof e.joinCode=="string")&&typeof e.updatedAt=="number"},Dm=128,iL=(t,e)=>{const n=t.getContext("2d");n!==null&&(n.fillStyle=`#${e.toString(16).padStart(6,"0")}`,n.fillRect(0,0,t.width,t.height))},Zb=t=>{const e=document.createElement("canvas");e.width=Dm,e.height=Dm,iL(e,t);const n=new nc(e);n.needsUpdate=!0;const r=new NR({roughness:.8});return r.colorNode=s=>s.sampler("playerSkin",()=>n).texture(s.uv).rgb,{material:r,setPicture(s){const i=e.getContext("2d");if(i===null)return;i.setTransform(1,0,0,-1,0,e.height);const o=Math.min(s.width,s.height);i.drawImage(s,(s.width-o)/2,(s.height-o)/2,o,o,0,0,e.width,e.height),n.needsUpdate=!0}}},va=1,oL=3.2,aL=.8,lL=1.9,Nm=[15022389,2001125,4431943,16485376,9315498,44225,6111287,12634675],cL=t=>t.slice(t.lastIndexOf(":")+1)||t,Fm=40,uL=10,dL=t=>Nm[Math.abs(parseInt(qb(t),36))%Nm.length],Kb=(t,e)=>{const n=t.getContext("2d");if(n===null)return;n.setTransform(1,0,0,-1,0,t.height),n.clearRect(0,0,t.width,t.height),n.fillStyle="rgba(0, 0, 0, 0.55)",n.fillRect(0,12,t.width,52),n.fillStyle="#fff",n.textAlign="center",n.textBaseline="middle",n.font=`bold ${Fm}px monospace`;const r=t.width-uL*2,s=n.measureText(e).width;s>r&&(n.font=`bold ${Math.floor(Fm*r/s)}px monospace`),n.fillText(e,t.width/2,40)},hL=t=>{const e=document.createElement("canvas");e.width=256,e.height=64,Kb(e,t);const n=new nc(e);return n.needsUpdate=!0,n},fL=(t,e,n)=>{let r=(e-t)%(Math.PI*2);return r>Math.PI&&(r-=Math.PI*2),r<-Math.PI&&(r+=Math.PI*2),t+r*n};class pL{avatars=new Jn;camera;players=new Map;handles=new Map;pictures=new Map;constructor(e){this.camera=e.camera}get size(){return this.players.size}positions(){const e=[];for(const[n,r]of this.players)e.push({did:n,x:r.target.x,y:r.target.y,z:r.target.z});return e}update(e,n,r=Date.now()){const s=this.players.get(e)??this.createPlayer(e);s.target=n,s.updatedAt=r,s.cube.visible=!0,s.label.visible=!0}setHandle(e,n){this.handles.set(e,n);const r=this.players.get(e);if(r===void 0)return;const s=r.label.material.map,i=s?.image;s==null||!(i instanceof HTMLCanvasElement)||(Kb(i,n),s.needsUpdate=!0)}setPicture(e,n){this.pictures.set(e,n),this.players.get(e)?.skin.setPicture(n)}remove(e){const n=this.players.get(e);n!==void 0&&(this.avatars.remove(n.cube),this.avatars.remove(n.label),this.players.delete(e))}clear(){for(const e of[...this.players.keys()])this.remove(e)}tick(e){const n=1-Math.exp(-8*e),r=new gt;for(const s of this.players.values()){const{cube:i,label:o,target:a}=s;r.set(a.x,a.y,a.z),i.position.lerp(r,n),i.rotation.y=fL(i.rotation.y,a.yaw,n),o.position.copy(i.position),o.position.y+=va+lL,o.lookAt(this.camera.position)}}createPlayer(e){const n=Zb(dL(e)),r=this.pictures.get(e);r!==void 0&&n.setPicture(r);const s=new xn(new Gi(va*2,va*2,va*2),n.material);s.visible=!1;const i=new xn(new rd(oL,aL),new Fo({map:hL(this.handles.get(e)??cL(e)),transparent:!0}));i.visible=!1,this.avatars.add(s,i);const o={cube:s,skin:n,label:i,target:{x:0,y:0,z:0,yaw:0,pitch:0},updatedAt:0};return this.players.set(e,o),o}}const mL=t=>t.map(({did:e,record:n})=>({did:e,x:n.x,y:n.y,z:n.z,scope:n.scope,...n.joinCode!==void 0?{joinCode:n.joinCode}:{},updatedAt:n.updatedAt})),gL={k:6,ttlMs:6e4,maxDistance:160,buffer:2,hysteresisMs:2500},yL=t=>{const e={...gL,...t.options},{selfDid:n,selfX:r,selfZ:s,selfScope:i,roster:o,nowMs:a,previous:l}=t,c=o.filter(b=>b.did!==n&&b.scope===i&&a-b.updatedAt<=e.ttlMs).map(b=>({e:b,dist2:(b.x-r)**2+(b.z-s)**2})).filter(({dist2:b})=>b<=e.maxDistance**2).sort((b,v)=>b.dist2-v.dist2||(b.e.did<v.e.did?-1:b.e.did>v.e.did?1:0)),u=c.length>e.k,d=new Set(c.slice(0,e.k).map(({e:b})=>b.did)),h=new Set(c.slice(0,e.k+e.buffer).map(({e:b})=>b.did)),f=new Map,m=[];for(const[b,v]of l){if(d.has(b)||h.has(b)){f.set(b,-1);continue}const x=v>=0?v:a;a-x>=e.hysteresisMs?m.push(b):f.set(b,x)}for(const b of d)f.has(b)||f.set(b,-1);const p=[...f.keys()].sort(),y=p.filter(b=>!l.has(b)),g=[...h].sort();return{target:p,candidates:g,connect:y,disconnect:m,links:f,truncated:u}},bL=2e4,vL=2e3,wL=4,Bm=15e3,_L=200,xL="https://bsky.network",kL=150,SL=2e3,EL=1,AL=3e4,TL=2e3,CL=3e4;class ML{getRepoClient;getDid;seed;scope;getPose;createSignaling;relay;fetchDirectory;resolveHandle;resolvePicture;onRemotePose;onRemoteEdits;onRemoteScriptEntities;onRemoteScriptEvents;onRemotePlayerDamage;clusterOptions;wallNow;clock;avatars;remotePlayers;running=!1;status_="off";lastError=null;signaling;joinCode;roster=[];selection;lastDiscovery;peers=new Map;pendingConnections=new Map;failedAt=new Map;peerCount=0;poseSeq=0;editSeq=0;scriptEntitySeq=0;scriptEventSeq=0;playerDamageSeq=0;editsSent=0;editsReceived=0;scriptEntitiesSent=0;scriptEntitiesReceived=0;scriptEventsSent=0;scriptEventsReceived=0;playerDamageSent=0;playerDamageReceived=0;lastPresenceAt=0;lastPresenceX=0;lastPresenceZ=0;lastSendAt=0;lastSendX=0;lastSendZ=0;lastMeasureAt=0;pendingTimes=new Map;presenceTimer;discoverTimer;constructor(e){this.getRepoClient=e.getRepoClient,this.getDid=e.getDid,this.seed=e.seed,this.scope=e.scope,this.getPose=e.getPose,this.createSignaling=e.createSignaling,this.relay=e.relay??xL,this.fetchDirectory=e.fetchDirectory??this.relayFetchDirectory,this.resolveHandle=e.resolveHandle,this.resolvePicture=e.resolvePicture,this.onRemotePose=e.onRemotePose??(()=>{}),this.onRemoteEdits=e.onRemoteEdits??(()=>{}),this.onRemoteScriptEntities=e.onRemoteScriptEntities??(()=>{}),this.onRemoteScriptEvents=e.onRemoteScriptEvents??(()=>{}),this.onRemotePlayerDamage=e.onRemotePlayerDamage??(()=>{}),this.clusterOptions=e.clusterOptions??{},this.wallNow=e.wallNow??(()=>Date.now()),this.clock=new M3({wallNow:this.wallNow}),this.remotePlayers=e.camera!==void 0?new pL({camera:e.camera}):void 0,this.avatars=this.remotePlayers?.avatars??new Jn}get status(){return this.status_}get rosterSize(){return this.roster.length}get connections(){return this.peerCount}now(){return this.clock.now()}connectedDids(){const e=[];for(const[n,r]of this.peers)r.connected&&e.push(n);return e.sort()}peerPositions(){return this.remotePlayers?.positions()??[]}async start(){if(this.running)return`multiplayer already online (${this.describeState()})`;const e=this.getRepoClient(),n=this.getDid();if(e===void 0||n===null)return"multiplayer needs an account — use /account:login first";this.running=!0,this.status_="online",this.lastError=null,this.clock.setSelf(n),this.clock.setRoster(this.placeRoster()),this.signaling=this.createSignaling({selfDid:n}),this.signaling.onOpen(s=>{this.joinCode=s,this.publishPresenceTick()}),this.signaling.onConnection((s,i)=>this.handleIncomingConnection(s,i)),this.signaling.onError(s=>this.fail(s));const r=Date.now();return this.lastPresenceAt=0,await this.publishPresence(e,n,r),this.presenceTimer=setInterval(()=>{this.publishPresenceTick()},bL),await this.refreshDiscovery(r),this.discoverTimer=setInterval(()=>{this.refreshDiscovery(Date.now())},Bm),"multiplayer online — discovering nearby players"}async stop(){if(!this.running)return"multiplayer is off";this.running=!1,this.presenceTimer!==void 0&&(clearInterval(this.presenceTimer),this.presenceTimer=void 0),this.discoverTimer!==void 0&&(clearInterval(this.discoverTimer),this.discoverTimer=void 0);for(const r of this.peers.values())r.close("multiplayer stopped");this.peers.clear();for(const r of this.pendingConnections.values())r.transport.destroy();this.pendingConnections.clear(),this.failedAt.clear(),this.pendingTimes.clear(),this.lastMeasureAt=0,this.clock.reset(),this.peerCount=0,this.roster=[],this.selection=void 0,this.signaling?.destroy(),this.signaling=void 0,this.joinCode=void 0,this.remotePlayers?.clear(),this.status_="off",this.lastError=null;const e=this.getRepoClient(),n=this.getDid();if(e!==void 0&&n!==null)try{await e.deleteRecord({repo:n,collection:Ls,rkey:mu})}catch{}return"multiplayer stopped"}tick(e){if(!this.running)return;const n=Date.now();if(n-this.lastMeasureAt>=TL){this.lastMeasureAt=n;for(const a of this.connectedDids())this.measureClock(a)}for(const[a,l]of this.pendingTimes)n-l.at>CL&&this.pendingTimes.delete(a);const r=this.getPose();(r.x-this.lastPresenceX)**2+(r.z-this.lastPresenceZ)**2>=wL**2&&n-this.lastPresenceAt>=vL&&(this.lastPresenceX=r.x,this.lastPresenceZ=r.z,this.publishPresenceTick(n));const o=(r.x-this.lastSendX)**2+(r.z-this.lastSendZ)**2>=EL**2?kL:SL;if(n-this.lastSendAt>=o){this.lastSendAt=n,this.lastSendX=r.x,this.lastSendZ=r.z;const a=++this.poseSeq;for(const l of this.peers.values())l.sendPose(r,a)}this.remotePlayers?.tick(e)}broadcastEdits(e){if(!this.running||e.length===0)return;const n=++this.editSeq;this.editsSent+=e.length;for(const r of this.peers.values())r.sendEdits(e,n)}broadcastScriptEntities(e){if(!this.running||e.length===0)return;const n=++this.scriptEntitySeq;this.scriptEntitiesSent+=e.length;for(const r of this.peers.values())r.sendScriptEntities(e,n)}broadcastScriptEvents(e){if(!this.running||e.length===0)return;const n=++this.scriptEventSeq;this.scriptEventsSent+=e.length;for(const r of this.peers.values())r.sendScriptEvents(e,n)}broadcastPlayerDamage(e){if(!this.running)return;const n=++this.playerDamageSeq;this.playerDamageSent++;const r={v:1,type:"player-damage",seq:n,t:Date.now(),...e};for(const s of this.peers.values())s.sendPlayerDamage(r)}describe(){return`multiplayer: ${this.describeState()}${this.lastError!==null?` — ${this.lastError}`:""}`}describeDebug(){const e=[];e.push(`state: ${this.describeState()}`),e.push(`did: ${this.getDid()??"none"}  joinCode: ${this.joinCode??"none"}  relay: ${this.relay}  seed: ${this.seed??"none"}  scope: ${this.scope}`);const n=this.lastDiscovery;if(n===void 0)e.push("discovery: no pass yet");else{const s=Math.round((Date.now()-n.at)/1e3);e.push(`discovery: ${s}s ago — relay returned ${n.relayDids.length} DID(s) for ${Ls}`);for(const i of n.relayDids)e.push(`  relay listed: ${i}`);for(const i of n.fetched)if(i.self===!0)e.push(`  fetch: ${i.did} (self, skipped)`);else if(i.ok){const o=i.updatedAt!==void 0?`${Math.round((Date.now()-i.updatedAt)/1e3)}s old`:"?";e.push(`  fetch: ${i.did} ok, ${o}`)}else e.push(`  fetch: ${i.did} FAILED — ${i.error??"unknown"}`)}e.push(`roster (${this.roster.length} other player(s)):`);for(const s of this.roster)e.push(`  ${s.did} at (${s.x}, ${s.z}) ${Math.round((Date.now()-s.updatedAt)/1e3)}s old`);const r=this.selection;r===void 0?e.push("selection: none yet"):e.push(`selection: target=[${r.target.join(", ")}] candidates=[${r.candidates.join(", ")}] connect=[${r.connect.join(", ")}] disconnect=[${r.disconnect.join(", ")}]`),e.push(`peers (${this.peers.size}):`);for(const[s,i]of this.peers)e.push(`  ${s}: ${i.describe()}`);return e.push(`edits: ${this.editsSent} sent, ${this.editsReceived} received`),e.push(`script entities: ${this.scriptEntitiesSent} sent, ${this.scriptEntitiesReceived} received`),e.push(`script events: ${this.scriptEventsSent} sent, ${this.scriptEventsReceived} received`),e.push(`player-damage: ${this.playerDamageSent} sent, ${this.playerDamageReceived} received`),e.push(`clock: ${this.clock.describe()}`),e.push(`lastError: ${this.lastError??"none"}`),e.join(`
`)}dispose(){this.stop()}describeState(){if(!this.running)return"off";const e=this.selection?.target.length??0,n=this.selection?.truncated??!1;return`online, ${this.roster.length} player(s) nearby, ${e} selected${n?"+":""}, ${this.peerCount} connected`}async publishPresenceTick(e=Date.now()){if(!this.running)return;const n=this.getRepoClient(),r=this.getDid();n===void 0||r===null||await this.publishPresence(n,r,e)}async publishPresence(e,n,r){const s=this.getPose();this.lastPresenceAt=r,this.lastPresenceX=s.x,this.lastPresenceZ=s.z;try{await e.putRecord({repo:n,collection:Ls,rkey:mu,record:rL(s.x,s.y,s.z,this.seed,this.scope,r,this.joinCode)})}catch(i){this.fail(i)}}async refreshDiscovery(e){if(this.running)try{const n=await this.fetchPresenceRepos(),r=this.getDid(),s=[],i=[];for(const o of n){if(o===r){s.push({did:o,ok:!0,self:!0});continue}const a=await this.fetchPresence(o);a.ok?(s.push({did:o,ok:!0,updatedAt:a.record.updatedAt}),i.push({did:o,record:a.record})):s.push({did:o,ok:!1,error:a.error})}this.lastDiscovery={at:e,relayDids:n,fetched:s},this.roster=mL(i),this.clock.setRoster(this.placeRoster()),this.applySelection(e)}catch(n){this.fail(n)}}async fetchPresenceRepos(){return this.fetchDirectory(Ls)}relayFetchDirectory=async e=>{const n=`${this.relay}/xrpc/com.atproto.sync.listReposByCollection`,r=[];let s;for(let i=0;i<10&&r.length<_L;i++){const o=new URLSearchParams({collection:e,limit:"100"});s!==void 0&&o.set("cursor",s);const a=await fetch(`${n}?${o.toString()}`);if(!a.ok)throw new Error(`discovery relay replied ${a.status}`);const l=await a.json();for(const c of l.repos??[])r.push(c.did);if(s=l.cursor,s===void 0)break}return r};async fetchPresence(e){const n=this.getRepoClient();if(n===void 0)return{did:e,ok:!1,error:"no signed-in record client"};try{const s=(await n.getRecord({repo:e,collection:Ls,rkey:mu})).value;return sL(s)?{did:e,ok:!0,record:s}:{did:e,ok:!1,error:"record malformed"}}catch(r){return{did:e,ok:!1,error:r instanceof Error?r.message:String(r)}}}applySelection(e){const n=this.getPose(),r=yL({selfDid:this.getDid()??"",selfX:n.x,selfZ:n.z,selfScope:this.scope,roster:this.roster,nowMs:e,previous:this.selection?.links??new Map,options:this.clusterOptions});this.selection=r;const s=new Set([...r.target,...r.candidates]);for(const i of s){if(this.peers.has(i))continue;const o=this.failedAt.get(i);o!==void 0&&e-o<AL||this.openPeer(i)}for(const i of[...this.peers.keys()])s.has(i)||this.peers.get(i)?.close("peer out of range");for(const[i,o]of this.pendingConnections)s.has(i)?(this.pendingConnections.delete(i),this.acceptIncoming(i,o.transport)):e-o.since>=Bm&&(this.pendingConnections.delete(i),o.transport.destroy())}openPeer(e){const n=this.getDid(),r=this.signaling;if(n===null||r===void 0)return;if(n<e){const i=this.roster.find(o=>o.did===e)?.joinCode;if(i===void 0)return;try{const o=r.connect(i,{did:n});this.peers.set(e,new pu({did:e,selfDid:n,transport:o,...this.peerHandlers()}))}catch(o){this.lastError=`${o instanceof Error?o.message:String(o)}`}}else this.peers.set(e,new pu({did:e,selfDid:n,...this.peerHandlers()}))}peerHandlers(){let e=!1;return{onOpen:n=>{e=!0,this.failedAt.delete(n),this.peerCount++,this.clock.setRoster(this.placeRoster()),this.measureClock(n),this.nameAvatar(n),this.faceAvatar(n)},onPose:(n,r)=>{this.remotePlayers?.update(n,r),this.onRemotePose(n,r)},onEdits:(n,r)=>{this.editsReceived+=r.length,this.onRemoteEdits(n,r)},onScriptEntities:(n,r)=>{this.scriptEntitiesReceived+=r.length,this.onRemoteScriptEntities(n,r)},onScriptEvents:(n,r)=>{this.scriptEventsReceived+=r.length,this.onRemoteScriptEvents(n,r)},onPlayerDamage:(n,r)=>{this.playerDamageReceived++,this.onRemotePlayerDamage(n,r)},onTime:(n,r,s)=>{const i=this.pendingTimes.get(n);i===void 0||i.t1!==r||(this.pendingTimes.delete(n),this.clock.observe(n,r,s,this.wallNow()))},onClose:n=>{this.peerCount=Math.max(0,this.peerCount-1),this.remotePlayers?.remove(n),this.pendingTimes.delete(n),this.clock.forget(n),this.clock.setRoster(this.placeRoster()),this.peers.delete(n),e||this.failedAt.set(n,Date.now())},onError:(n,r,s)=>{this.lastError=`${n}: ${r}${s!==void 0?` (${s})`:""}`},wallNow:()=>this.wallNow()}}async nameAvatar(e){const n=this.resolveHandle,r=this.remotePlayers;if(!(n===void 0||r===void 0))try{const s=await n(e);s!==null&&r.setHandle(e,s)}catch(s){this.lastError=`${e}: handle lookup failed — ${s instanceof Error?s.message:String(s)}`}}async faceAvatar(e){const n=this.resolvePicture,r=this.remotePlayers;if(!(n===void 0||r===void 0))try{const s=await n(e);s!==null&&r.setPicture(e,await createImageBitmap(s))}catch(s){this.lastError=`${e}: picture lookup failed — ${s instanceof Error?s.message:String(s)}`}}handleIncomingConnection(e,n){const r=e.did,s=this.getDid();if(r===void 0||r===s||s===null){n.destroy();return}const i=this.peers.get(r);if(i!==void 0){i.canAttach()?i.attach(n):n.destroy();return}if(this.isWanted(r)){this.acceptIncoming(r,n);return}this.pendingConnections.get(r)!==void 0?n.destroy():this.pendingConnections.set(r,{transport:n,since:Date.now()})}isWanted(e){const n=this.selection;return n!==void 0&&(n.target.includes(e)||n.candidates.includes(e))}acceptIncoming(e,n){const r=this.getDid();if(r===null){n.destroy();return}const s=this.peers.get(e);if(s!==void 0){s.canAttach()?s.attach(n):n.destroy();return}this.peers.set(e,new pu({did:e,selfDid:r,transport:n,...this.peerHandlers()}))}fail(e){this.status_="error",this.lastError=e instanceof Error?e.message:String(e)}measureClock(e){const n=this.peers.get(e);if(n===void 0||!n.connected)return;const r=this.wallNow();this.pendingTimes.set(e,{t1:r,at:r}),n.sendTime(r)}placeRoster(){const e=this.getDid();return e===null?[]:[e,...R3(this.roster,this.scope)]}}class RL{constructor(){this.encoder=new TextEncoder,this._pieces=[],this._parts=[]}append_buffer(e){this.flush(),this._parts.push(e)}append(e){this._pieces.push(e)}flush(){if(this._pieces.length>0){const e=new Uint8Array(this._pieces);this._parts.push(e),this._pieces=[]}}toArrayBuffer(){const e=[];for(const n of this._parts)e.push(n);return PL(e).buffer}}function PL(t){let e=0;for(const s of t)e+=s.byteLength;const n=new Uint8Array(e);let r=0;for(const s of t){const i=new Uint8Array(s.buffer,s.byteOffset,s.byteLength);n.set(i,r),r+=s.byteLength}return n}function Jb(t){return new IL(t).unpack()}function Qb(t){const e=new OL,n=e.pack(t);return n instanceof Promise?n.then(()=>e.getBuffer()):e.getBuffer()}class IL{constructor(e){this.index=0,this.dataBuffer=e,this.dataView=new Uint8Array(this.dataBuffer),this.length=this.dataBuffer.byteLength}unpack(){const e=this.unpack_uint8();if(e<128)return e;if((e^224)<32)return(e^224)-32;let n;if((n=e^160)<=15)return this.unpack_raw(n);if((n=e^176)<=15)return this.unpack_string(n);if((n=e^144)<=15)return this.unpack_array(n);if((n=e^128)<=15)return this.unpack_map(n);switch(e){case 192:return null;case 193:return;case 194:return!1;case 195:return!0;case 202:return this.unpack_float();case 203:return this.unpack_double();case 204:return this.unpack_uint8();case 205:return this.unpack_uint16();case 206:return this.unpack_uint32();case 207:return this.unpack_uint64();case 208:return this.unpack_int8();case 209:return this.unpack_int16();case 210:return this.unpack_int32();case 211:return this.unpack_int64();case 212:return;case 213:return;case 214:return;case 215:return;case 216:return n=this.unpack_uint16(),this.unpack_string(n);case 217:return n=this.unpack_uint32(),this.unpack_string(n);case 218:return n=this.unpack_uint16(),this.unpack_raw(n);case 219:return n=this.unpack_uint32(),this.unpack_raw(n);case 220:return n=this.unpack_uint16(),this.unpack_array(n);case 221:return n=this.unpack_uint32(),this.unpack_array(n);case 222:return n=this.unpack_uint16(),this.unpack_map(n);case 223:return n=this.unpack_uint32(),this.unpack_map(n)}}unpack_uint8(){const e=this.dataView[this.index]&255;return this.index++,e}unpack_uint16(){const e=this.read(2),n=(e[0]&255)*256+(e[1]&255);return this.index+=2,n}unpack_uint32(){const e=this.read(4),n=((e[0]*256+e[1])*256+e[2])*256+e[3];return this.index+=4,n}unpack_uint64(){const e=this.read(8),n=((((((e[0]*256+e[1])*256+e[2])*256+e[3])*256+e[4])*256+e[5])*256+e[6])*256+e[7];return this.index+=8,n}unpack_int8(){const e=this.unpack_uint8();return e<128?e:e-256}unpack_int16(){const e=this.unpack_uint16();return e<32768?e:e-65536}unpack_int32(){const e=this.unpack_uint32();return e<2**31?e:e-2**32}unpack_int64(){const e=this.unpack_uint64();return e<2**63?e:e-2**64}unpack_raw(e){if(this.length<this.index+e)throw new Error(`BinaryPackFailure: index is out of range ${this.index} ${e} ${this.length}`);const n=this.dataBuffer.slice(this.index,this.index+e);return this.index+=e,n}unpack_string(e){const n=this.read(e);let r=0,s="",i,o;for(;r<e;)i=n[r],i<160?(o=i,r++):(i^192)<32?(o=(i&31)<<6|n[r+1]&63,r+=2):(i^224)<16?(o=(i&15)<<12|(n[r+1]&63)<<6|n[r+2]&63,r+=3):(o=(i&7)<<18|(n[r+1]&63)<<12|(n[r+2]&63)<<6|n[r+3]&63,r+=4),s+=String.fromCodePoint(o);return this.index+=e,s}unpack_array(e){const n=new Array(e);for(let r=0;r<e;r++)n[r]=this.unpack();return n}unpack_map(e){const n={};for(let r=0;r<e;r++){const s=this.unpack();n[s]=this.unpack()}return n}unpack_float(){const e=this.unpack_uint32(),n=e>>31,r=(e>>23&255)-127,s=e&8388607|8388608;return(n===0?1:-1)*s*2**(r-23)}unpack_double(){const e=this.unpack_uint32(),n=this.unpack_uint32(),r=e>>31,s=(e>>20&2047)-1023,o=(e&1048575|1048576)*2**(s-20)+n*2**(s-52);return(r===0?1:-1)*o}read(e){const n=this.index;if(n+e<=this.length)return this.dataView.subarray(n,n+e);throw new Error("BinaryPackFailure: read index out of range")}}class OL{getBuffer(){return this._bufferBuilder.toArrayBuffer()}pack(e){if(typeof e=="string")this.pack_string(e);else if(typeof e=="number")Math.floor(e)===e?this.pack_integer(e):this.pack_double(e);else if(typeof e=="boolean")e===!0?this._bufferBuilder.append(195):e===!1&&this._bufferBuilder.append(194);else if(e===void 0)this._bufferBuilder.append(192);else if(typeof e=="object")if(e===null)this._bufferBuilder.append(192);else{const n=e.constructor;if(e instanceof Array){const r=this.pack_array(e);if(r instanceof Promise)return r.then(()=>this._bufferBuilder.flush())}else if(e instanceof ArrayBuffer)this.pack_bin(new Uint8Array(e));else if("BYTES_PER_ELEMENT"in e){const r=e;this.pack_bin(new Uint8Array(r.buffer,r.byteOffset,r.byteLength))}else if(e instanceof Date)this.pack_string(e.toString());else{if(e instanceof Blob)return e.arrayBuffer().then(r=>{this.pack_bin(new Uint8Array(r)),this._bufferBuilder.flush()});if(n==Object||n.toString().startsWith("class")){const r=this.pack_object(e);if(r instanceof Promise)return r.then(()=>this._bufferBuilder.flush())}else throw new Error(`Type "${n.toString()}" not yet supported`)}}else throw new Error(`Type "${typeof e}" not yet supported`);this._bufferBuilder.flush()}pack_bin(e){const n=e.length;if(n<=15)this.pack_uint8(160+n);else if(n<=65535)this._bufferBuilder.append(218),this.pack_uint16(n);else if(n<=4294967295)this._bufferBuilder.append(219),this.pack_uint32(n);else throw new Error("Invalid length");this._bufferBuilder.append_buffer(e)}pack_string(e){const n=this._textEncoder.encode(e),r=n.length;if(r<=15)this.pack_uint8(176+r);else if(r<=65535)this._bufferBuilder.append(216),this.pack_uint16(r);else if(r<=4294967295)this._bufferBuilder.append(217),this.pack_uint32(r);else throw new Error("Invalid length");this._bufferBuilder.append_buffer(n)}pack_array(e){const n=e.length;if(n<=15)this.pack_uint8(144+n);else if(n<=65535)this._bufferBuilder.append(220),this.pack_uint16(n);else if(n<=4294967295)this._bufferBuilder.append(221),this.pack_uint32(n);else throw new Error("Invalid length");const r=s=>{if(s<n){const i=this.pack(e[s]);return i instanceof Promise?i.then(()=>r(s+1)):r(s+1)}};return r(0)}pack_integer(e){if(e>=-32&&e<=127)this._bufferBuilder.append(e&255);else if(e>=0&&e<=255)this._bufferBuilder.append(204),this.pack_uint8(e);else if(e>=-128&&e<=127)this._bufferBuilder.append(208),this.pack_int8(e);else if(e>=0&&e<=65535)this._bufferBuilder.append(205),this.pack_uint16(e);else if(e>=-32768&&e<=32767)this._bufferBuilder.append(209),this.pack_int16(e);else if(e>=0&&e<=4294967295)this._bufferBuilder.append(206),this.pack_uint32(e);else if(e>=-2147483648&&e<=2147483647)this._bufferBuilder.append(210),this.pack_int32(e);else if(e>=-9223372036854776e3&&e<=9223372036854776e3)this._bufferBuilder.append(211),this.pack_int64(e);else if(e>=0&&e<=18446744073709552e3)this._bufferBuilder.append(207),this.pack_uint64(e);else throw new Error("Invalid integer")}pack_double(e){let n=0;e<0&&(n=1,e=-e);const r=Math.floor(Math.log(e)/Math.LN2),s=e/2**r-1,i=Math.floor(s*2**52),o=2**32,a=n<<31|r+1023<<20|i/o&1048575,l=i%o;this._bufferBuilder.append(203),this.pack_int32(a),this.pack_int32(l)}pack_object(e){const n=Object.keys(e),r=n.length;if(r<=15)this.pack_uint8(128+r);else if(r<=65535)this._bufferBuilder.append(222),this.pack_uint16(r);else if(r<=4294967295)this._bufferBuilder.append(223),this.pack_uint32(r);else throw new Error("Invalid length");const s=i=>{if(i<n.length){const o=n[i];if(e.hasOwnProperty(o)){this.pack(o);const a=this.pack(e[o]);if(a instanceof Promise)return a.then(()=>s(i+1))}return s(i+1)}};return s(0)}pack_uint8(e){this._bufferBuilder.append(e)}pack_uint16(e){this._bufferBuilder.append(e>>8),this._bufferBuilder.append(e&255)}pack_uint32(e){const n=e&4294967295;this._bufferBuilder.append((n&4278190080)>>>24),this._bufferBuilder.append((n&16711680)>>>16),this._bufferBuilder.append((n&65280)>>>8),this._bufferBuilder.append(n&255)}pack_uint64(e){const n=e/4294967296,r=e%2**32;this._bufferBuilder.append((n&4278190080)>>>24),this._bufferBuilder.append((n&16711680)>>>16),this._bufferBuilder.append((n&65280)>>>8),this._bufferBuilder.append(n&255),this._bufferBuilder.append((r&4278190080)>>>24),this._bufferBuilder.append((r&16711680)>>>16),this._bufferBuilder.append((r&65280)>>>8),this._bufferBuilder.append(r&255)}pack_int8(e){this._bufferBuilder.append(e&255)}pack_int16(e){this._bufferBuilder.append((e&65280)>>8),this._bufferBuilder.append(e&255)}pack_int32(e){this._bufferBuilder.append(e>>>24&255),this._bufferBuilder.append((e&16711680)>>>16),this._bufferBuilder.append((e&65280)>>>8),this._bufferBuilder.append(e&255)}pack_int64(e){const n=Math.floor(e/4294967296),r=e%2**32;this._bufferBuilder.append((n&4278190080)>>>24),this._bufferBuilder.append((n&16711680)>>>16),this._bufferBuilder.append((n&65280)>>>8),this._bufferBuilder.append(n&255),this._bufferBuilder.append((r&4278190080)>>>24),this._bufferBuilder.append((r&16711680)>>>16),this._bufferBuilder.append((r&65280)>>>8),this._bufferBuilder.append(r&255)}constructor(){this._bufferBuilder=new RL,this._textEncoder=new TextEncoder}}let ev=!0,tv=!0;function mo(t,e,n){const r=t.match(e);return r&&r.length>=n&&parseFloat(r[n],10)}function Qs(t,e,n){if(!t.RTCPeerConnection)return;if(!Object.getOwnPropertyDescriptor(EventTarget.prototype,"addEventListener").writable){Mh("Unable to polyfill events");return}const s=t.RTCPeerConnection.prototype,i=s.addEventListener;s.addEventListener=function(a,l){if(a!==e)return i.apply(this,arguments);const c=u=>{const d=n(u);d&&(l.handleEvent?l.handleEvent(d):l(d))};return this._eventMap=this._eventMap||{},this._eventMap[e]||(this._eventMap[e]=new Map),this._eventMap[e].set(l,c),i.apply(this,[a,c])};const o=s.removeEventListener;s.removeEventListener=function(a,l){if(a!==e||!this._eventMap||!this._eventMap[e])return o.apply(this,arguments);if(!this._eventMap[e].has(l))return o.apply(this,arguments);const c=this._eventMap[e].get(l);return this._eventMap[e].delete(l),this._eventMap[e].size===0&&delete this._eventMap[e],Object.keys(this._eventMap).length===0&&delete this._eventMap,o.apply(this,[a,c])},Object.defineProperty(s,"on"+e,{get(){return this["_on"+e]},set(a){this["_on"+e]&&(this.removeEventListener(e,this["_on"+e]),delete this["_on"+e]),a&&this.addEventListener(e,this["_on"+e]=a)},enumerable:!0,configurable:!0})}function zL(t){return typeof t!="boolean"?new Error("Argument type: "+typeof t+". Please use a boolean."):(ev=t,t?"adapter.js logging disabled":"adapter.js logging enabled")}function LL(t){return typeof t!="boolean"?new Error("Argument type: "+typeof t+". Please use a boolean."):(tv=!t,"adapter.js deprecation warnings "+(t?"disabled":"enabled"))}function Mh(){if(typeof window=="object"){if(ev)return;typeof console<"u"&&typeof console.log=="function"&&console.log.apply(console,arguments)}}function Rh(t,e){tv&&console.warn(t+" is deprecated, please use "+e+" instead.")}function $L(t){const e={browser:null,version:null};if(typeof t>"u"||!t.navigator||!t.navigator.userAgent)return e.browser="Not a browser.",e;const{navigator:n}=t;if(n.userAgentData&&n.userAgentData.brands){const r=n.userAgentData.brands.find(s=>s.brand==="Chromium");if(r){const s=parseInt(r.version,10);if(s>=90)return{browser:"chrome",version:s}}}if(n.mozGetUserMedia)e.browser="firefox",e.version=parseInt(mo(n.userAgent,/Firefox\/(\d+)\./,1));else if(n.webkitGetUserMedia||t.isSecureContext===!1&&t.webkitRTCPeerConnection)e.browser="chrome",e.version=parseInt(mo(n.userAgent,/Chrom(e|ium)\/(\d+)\./,2))||null;else if(t.RTCPeerConnection&&n.userAgent.match(/AppleWebKit\/(\d+)\./))e.browser="safari",e.version=parseInt(mo(n.userAgent,/AppleWebKit\/(\d+)\./,1)),e.supportsUnifiedPlan=t.RTCRtpTransceiver&&"currentDirection"in t.RTCRtpTransceiver.prototype,e._safariVersion=mo(n.userAgent,/Version\/(\d+(\.?\d+))/,1);else return e.browser="Not a supported browser.",e;return e}function Um(t){return Object.prototype.toString.call(t)==="[object Object]"}function nv(t){return Um(t)?Object.keys(t).reduce(function(e,n){const r=Um(t[n]),s=r?nv(t[n]):t[n],i=r&&!Object.keys(s).length;return s===void 0||i?e:Object.assign(e,{[n]:s})},{}):t}function dd(t,e,n){!e||n.has(e.id)||(n.set(e.id,e),Object.keys(e).forEach(r=>{r.endsWith("Id")?dd(t,t.get(e[r]),n):r.endsWith("Ids")&&e[r].forEach(s=>{dd(t,t.get(s),n)})}))}function Hm(t,e,n){const r=n?"outbound-rtp":"inbound-rtp",s=new Map;if(e===null)return s;const i=[];return t.forEach(o=>{o.type==="track"&&o.trackIdentifier===e.id&&i.push(o)}),i.forEach(o=>{t.forEach(a=>{a.type===r&&a.trackId===o.id&&dd(t,a,s)})}),s}const jm=Mh;function rv(t,e){if(e.version>=64)return;const n=t&&t.navigator;if(!n.mediaDevices)return;const r=function(a){if(typeof a!="object"||a.mandatory||a.optional)return a;const l={};return Object.keys(a).forEach(c=>{if(c==="require"||c==="advanced"||c==="mediaSource")return;const u=typeof a[c]=="object"?a[c]:{ideal:a[c]};u.exact!==void 0&&typeof u.exact=="number"&&(u.min=u.max=u.exact);const d=function(h,f){return h?h+f.charAt(0).toUpperCase()+f.slice(1):f==="deviceId"?"sourceId":f};if(u.ideal!==void 0){l.optional=l.optional||[];let h={};typeof u.ideal=="number"?(h[d("min",c)]=u.ideal,l.optional.push(h),h={},h[d("max",c)]=u.ideal,l.optional.push(h)):(h[d("",c)]=u.ideal,l.optional.push(h))}u.exact!==void 0&&typeof u.exact!="number"?(l.mandatory=l.mandatory||{},l.mandatory[d("",c)]=u.exact):["min","max"].forEach(h=>{u[h]!==void 0&&(l.mandatory=l.mandatory||{},l.mandatory[d(h,c)]=u[h])})}),a.advanced&&(l.optional=(l.optional||[]).concat(a.advanced)),l},s=function(a,l){if(e.version>=61)return l(a);if(a=JSON.parse(JSON.stringify(a)),a&&typeof a.audio=="object"){const c=function(u,d,h){d in u&&!(h in u)&&(u[h]=u[d],delete u[d])};a=JSON.parse(JSON.stringify(a)),c(a.audio,"autoGainControl","googAutoGainControl"),c(a.audio,"noiseSuppression","googNoiseSuppression"),a.audio=r(a.audio)}if(a&&typeof a.video=="object"){let c=a.video.facingMode;c=c&&(typeof c=="object"?c:{ideal:c});const u=e.version<66;if(c&&(c.exact==="user"||c.exact==="environment"||c.ideal==="user"||c.ideal==="environment")&&!(n.mediaDevices.getSupportedConstraints&&n.mediaDevices.getSupportedConstraints().facingMode&&!u)){delete a.video.facingMode;let d;if(c.exact==="environment"||c.ideal==="environment"?d=["back","rear"]:(c.exact==="user"||c.ideal==="user")&&(d=["front"]),d)return n.mediaDevices.enumerateDevices().then(h=>{h=h.filter(m=>m.kind==="videoinput");let f=h.find(m=>d.some(p=>m.label.toLowerCase().includes(p)));return!f&&h.length&&d.includes("back")&&(f=h[h.length-1]),f&&(a.video.deviceId=c.exact?{exact:f.deviceId}:{ideal:f.deviceId}),a.video=r(a.video),jm("chrome: "+JSON.stringify(a)),l(a)})}a.video=r(a.video)}return jm("chrome: "+JSON.stringify(a)),l(a)},i=function(a){return e.version>=64?a:{name:{PermissionDeniedError:"NotAllowedError",PermissionDismissedError:"NotAllowedError",InvalidStateError:"NotAllowedError",DevicesNotFoundError:"NotFoundError",ConstraintNotSatisfiedError:"OverconstrainedError",TrackStartError:"NotReadableError",MediaDeviceFailedDueToShutdown:"NotAllowedError",MediaDeviceKillSwitchOn:"NotAllowedError",TabCaptureError:"AbortError",ScreenCaptureError:"AbortError",DeviceCaptureError:"AbortError"}[a.name]||a.name,message:a.message,constraint:a.constraint||a.constraintName,toString(){return this.name+(this.message&&": ")+this.message}}},o=function(a,l,c){s(a,u=>{n.webkitGetUserMedia(u,l,d=>{c&&c(i(d))})})};if(n.getUserMedia=o.bind(n),n.mediaDevices.getUserMedia){const a=n.mediaDevices.getUserMedia.bind(n.mediaDevices);n.mediaDevices.getUserMedia=function(l){return s(l,c=>a(c).then(u=>{if(c.audio&&!u.getAudioTracks().length||c.video&&!u.getVideoTracks().length)throw u.getTracks().forEach(d=>{d.stop()}),new DOMException("","NotFoundError");return u},u=>Promise.reject(i(u))))}}}function sv(t){t.MediaStream=t.MediaStream||t.webkitMediaStream}function iv(t,e){if(!(e.version>102))if(typeof t=="object"&&t.RTCPeerConnection&&!("ontrack"in t.RTCPeerConnection.prototype)){Object.defineProperty(t.RTCPeerConnection.prototype,"ontrack",{get(){return this._ontrack},set(r){this._ontrack&&this.removeEventListener("track",this._ontrack),this.addEventListener("track",this._ontrack=r)},enumerable:!0,configurable:!0});const n=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(){return this._ontrackpoly||(this._ontrackpoly=s=>{s.stream.addEventListener("addtrack",i=>{let o;t.RTCPeerConnection.prototype.getReceivers?o=this.getReceivers().find(l=>l.track&&l.track.id===i.track.id):o={track:i.track};const a=new Event("track");a.track=i.track,a.receiver=o,a.transceiver={receiver:o},a.streams=[s.stream],this.dispatchEvent(a)}),s.stream.getTracks().forEach(i=>{let o;t.RTCPeerConnection.prototype.getReceivers?o=this.getReceivers().find(l=>l.track&&l.track.id===i.id):o={track:i};const a=new Event("track");a.track=i,a.receiver=o,a.transceiver={receiver:o},a.streams=[s.stream],this.dispatchEvent(a)})},this.addEventListener("addstream",this._ontrackpoly)),n.apply(this,arguments)}}else Qs(t,"track",n=>(n.transceiver||Object.defineProperty(n,"transceiver",{value:{receiver:n.receiver}}),n))}function ov(t){if(typeof t=="object"&&t.RTCPeerConnection&&!("getSenders"in t.RTCPeerConnection.prototype)&&"createDTMFSender"in t.RTCPeerConnection.prototype){const e=function(s,i){return{track:i,get dtmf(){return this._dtmf===void 0&&(i.kind==="audio"?this._dtmf=s.createDTMFSender(i):this._dtmf=null),this._dtmf},_pc:s}};if(!t.RTCPeerConnection.prototype.getSenders){t.RTCPeerConnection.prototype.getSenders=function(){return this._senders=this._senders||[],this._senders.slice()};const s=t.RTCPeerConnection.prototype.addTrack;t.RTCPeerConnection.prototype.addTrack=function(a,l){let c=s.apply(this,arguments);return c||(c=e(this,a),this._senders.push(c)),c};const i=t.RTCPeerConnection.prototype.removeTrack;t.RTCPeerConnection.prototype.removeTrack=function(a){i.apply(this,arguments);const l=this._senders.indexOf(a);l!==-1&&this._senders.splice(l,1)}}const n=t.RTCPeerConnection.prototype.addStream;t.RTCPeerConnection.prototype.addStream=function(i){this._senders=this._senders||[],n.apply(this,[i]),i.getTracks().forEach(o=>{this._senders.push(e(this,o))})};const r=t.RTCPeerConnection.prototype.removeStream;t.RTCPeerConnection.prototype.removeStream=function(i){this._senders=this._senders||[],r.apply(this,[i]),i.getTracks().forEach(o=>{const a=this._senders.find(l=>l.track===o);a&&this._senders.splice(this._senders.indexOf(a),1)})}}else if(typeof t=="object"&&t.RTCPeerConnection&&"getSenders"in t.RTCPeerConnection.prototype&&"createDTMFSender"in t.RTCPeerConnection.prototype&&t.RTCRtpSender&&!("dtmf"in t.RTCRtpSender.prototype)){const e=t.RTCPeerConnection.prototype.getSenders;t.RTCPeerConnection.prototype.getSenders=function(){const r=e.apply(this,[]);return r.forEach(s=>s._pc=this),r},Object.defineProperty(t.RTCRtpSender.prototype,"dtmf",{get(){return this._dtmf===void 0&&(this.track.kind==="audio"?this._dtmf=this._pc.createDTMFSender(this.track):this._dtmf=null),this._dtmf}})}}function av(t,e){if(e.version>=67||!(typeof t=="object"&&t.RTCPeerConnection&&t.RTCRtpSender&&t.RTCRtpReceiver))return;if(!("getStats"in t.RTCRtpSender.prototype)){const r=t.RTCPeerConnection.prototype.getSenders;r&&(t.RTCPeerConnection.prototype.getSenders=function(){const o=r.apply(this,[]);return o.forEach(a=>a._pc=this),o});const s=t.RTCPeerConnection.prototype.addTrack;s&&(t.RTCPeerConnection.prototype.addTrack=function(){const o=s.apply(this,arguments);return o._pc=this,o}),t.RTCRtpSender.prototype.getStats=function(){const o=this;return this._pc.getStats().then(a=>Hm(a,o.track,!0))}}if(!("getStats"in t.RTCRtpReceiver.prototype)){const r=t.RTCPeerConnection.prototype.getReceivers;r&&(t.RTCPeerConnection.prototype.getReceivers=function(){const i=r.apply(this,[]);return i.forEach(o=>o._pc=this),i}),Qs(t,"track",s=>(s.receiver._pc=s.srcElement,s)),t.RTCRtpReceiver.prototype.getStats=function(){const i=this;return this._pc.getStats().then(o=>Hm(o,i.track,!1))}}if(!("getStats"in t.RTCRtpSender.prototype&&"getStats"in t.RTCRtpReceiver.prototype))return;const n=t.RTCPeerConnection.prototype.getStats;t.RTCPeerConnection.prototype.getStats=function(){if(arguments.length>0&&arguments[0]instanceof t.MediaStreamTrack){const s=arguments[0];let i,o,a;return this.getSenders().forEach(l=>{l.track===s&&(i?a=!0:i=l)}),this.getReceivers().forEach(l=>(l.track===s&&(o?a=!0:o=l),l.track===s)),a||i&&o?Promise.reject(new DOMException("There are more than one sender or receiver for the track.","InvalidAccessError")):i?i.getStats():o?o.getStats():Promise.reject(new DOMException("There is no sender or receiver for the track.","InvalidAccessError"))}return n.apply(this,arguments)}}function lv(t){t.RTCPeerConnection.prototype.getLocalStreams=function(){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},Object.keys(this._shimmedLocalStreams).map(o=>this._shimmedLocalStreams[o][0])};const e=t.RTCPeerConnection.prototype.addTrack;t.RTCPeerConnection.prototype.addTrack=function(o,a){if(!a)return e.apply(this,arguments);this._shimmedLocalStreams=this._shimmedLocalStreams||{};const l=e.apply(this,arguments);return this._shimmedLocalStreams[a.id]?this._shimmedLocalStreams[a.id].indexOf(l)===-1&&this._shimmedLocalStreams[a.id].push(l):this._shimmedLocalStreams[a.id]=[a,l],l};const n=t.RTCPeerConnection.prototype.addStream;t.RTCPeerConnection.prototype.addStream=function(o){this._shimmedLocalStreams=this._shimmedLocalStreams||{},o.getTracks().forEach(c=>{if(this.getSenders().find(d=>d.track===c))throw new DOMException("Track already exists.","InvalidAccessError")});const a=this.getSenders();n.apply(this,arguments);const l=this.getSenders().filter(c=>a.indexOf(c)===-1);this._shimmedLocalStreams[o.id]=[o].concat(l)};const r=t.RTCPeerConnection.prototype.removeStream;t.RTCPeerConnection.prototype.removeStream=function(o){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},delete this._shimmedLocalStreams[o.id],r.apply(this,arguments)};const s=t.RTCPeerConnection.prototype.removeTrack;t.RTCPeerConnection.prototype.removeTrack=function(o){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},o&&Object.keys(this._shimmedLocalStreams).forEach(a=>{const l=this._shimmedLocalStreams[a].indexOf(o);l!==-1&&this._shimmedLocalStreams[a].splice(l,1),this._shimmedLocalStreams[a].length===1&&delete this._shimmedLocalStreams[a]}),s.apply(this,arguments)}}function cv(t,e){if(!t.RTCPeerConnection)return;if(t.RTCPeerConnection.prototype.addTrack&&e.version>=65)return lv(t);const n=t.RTCPeerConnection.prototype.getLocalStreams;t.RTCPeerConnection.prototype.getLocalStreams=function(){const u=n.apply(this);return this._reverseStreams=this._reverseStreams||{},u.map(d=>this._reverseStreams[d.id])};const r=t.RTCPeerConnection.prototype.addStream;t.RTCPeerConnection.prototype.addStream=function(u){if(this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{},u.getTracks().forEach(d=>{if(this.getSenders().find(f=>f.track===d))throw new DOMException("Track already exists.","InvalidAccessError")}),!this._reverseStreams[u.id]){const d=new t.MediaStream(u.getTracks());this._streams[u.id]=d,this._reverseStreams[d.id]=u,u=d}r.apply(this,[u])};const s=t.RTCPeerConnection.prototype.removeStream;t.RTCPeerConnection.prototype.removeStream=function(u){this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{},s.apply(this,[this._streams[u.id]||u]),delete this._reverseStreams[this._streams[u.id]?this._streams[u.id].id:u.id],delete this._streams[u.id]},t.RTCPeerConnection.prototype.addTrack=function(u,d){if(this.signalingState==="closed")throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.","InvalidStateError");const h=[].slice.call(arguments,1);if(h.length!==1||!h[0].getTracks().find(p=>p===u))throw new DOMException("The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.","NotSupportedError");if(this.getSenders().find(p=>p.track===u))throw new DOMException("Track already exists.","InvalidAccessError");this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{};const m=this._streams[d.id];if(m)m.addTrack(u),Promise.resolve().then(()=>{this.dispatchEvent(new Event("negotiationneeded"))});else{const p=new t.MediaStream([u]);this._streams[d.id]=p,this._reverseStreams[p.id]=d,this.addStream(p)}return this.getSenders().find(p=>p.track===u)};function i(c,u){let d=u.sdp;return Object.keys(c._reverseStreams||[]).forEach(h=>{const f=c._reverseStreams[h],m=c._streams[f.id];d=d.replace(new RegExp(m.id,"g"),f.id)}),new RTCSessionDescription({type:u.type,sdp:d})}function o(c,u){let d=u.sdp;return Object.keys(c._reverseStreams||[]).forEach(h=>{const f=c._reverseStreams[h],m=c._streams[f.id];d=d.replace(new RegExp(f.id,"g"),m.id)}),new RTCSessionDescription({type:u.type,sdp:d})}["createOffer","createAnswer"].forEach(function(c){const u=t.RTCPeerConnection.prototype[c],d={[c](){const h=arguments;return arguments.length&&typeof arguments[0]=="function"?u.apply(this,[m=>{const p=i(this,m);h[0].apply(null,[p])},m=>{h[1]&&h[1].apply(null,m)},arguments[2]]):u.apply(this,arguments).then(m=>i(this,m))}};t.RTCPeerConnection.prototype[c]=d[c]});const a=t.RTCPeerConnection.prototype.setLocalDescription;t.RTCPeerConnection.prototype.setLocalDescription=function(){return!arguments.length||!arguments[0].type?a.apply(this,arguments):(arguments[0]=o(this,arguments[0]),a.apply(this,arguments))};const l=Object.getOwnPropertyDescriptor(t.RTCPeerConnection.prototype,"localDescription");Object.defineProperty(t.RTCPeerConnection.prototype,"localDescription",{get(){const c=l.get.apply(this);return c.type===""?c:i(this,c)}}),t.RTCPeerConnection.prototype.removeTrack=function(u){if(this.signalingState==="closed")throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.","InvalidStateError");if(!u._pc)throw new DOMException("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.","TypeError");if(!(u._pc===this))throw new DOMException("Sender was not created by this connection.","InvalidAccessError");this._streams=this._streams||{};let h;Object.keys(this._streams).forEach(f=>{this._streams[f].getTracks().find(p=>u.track===p)&&(h=this._streams[f])}),h&&(h.getTracks().length===1?this.removeStream(this._reverseStreams[h.id]):h.removeTrack(u.track),this.dispatchEvent(new Event("negotiationneeded")))}}function hd(t,e){!t.RTCPeerConnection&&t.webkitRTCPeerConnection&&(t.RTCPeerConnection=t.webkitRTCPeerConnection),t.RTCPeerConnection&&e.version<53&&["setLocalDescription","setRemoteDescription","addIceCandidate"].forEach(function(n){const r=t.RTCPeerConnection.prototype[n],s={[n](){return arguments[0]=new(n==="addIceCandidate"?t.RTCIceCandidate:t.RTCSessionDescription)(arguments[0]),r.apply(this,arguments)}};t.RTCPeerConnection.prototype[n]=s[n]})}function uv(t,e){e.version>102||Qs(t,"negotiationneeded",n=>{const r=n.target;if(!((e.version<72||r.getConfiguration&&r.getConfiguration().sdpSemantics==="plan-b")&&r.signalingState!=="stable"))return n})}const Wm=Object.freeze(Object.defineProperty({__proto__:null,fixNegotiationNeeded:uv,shimAddTrackRemoveTrack:cv,shimAddTrackRemoveTrackWithNative:lv,shimGetSendersWithDtmf:ov,shimGetUserMedia:rv,shimMediaStream:sv,shimOnTrack:iv,shimPeerConnection:hd,shimSenderReceiverGetStats:av},Symbol.toStringTag,{value:"Module"}));function dv(t,e){const n=t&&t.navigator;if(!n.mediaDevices)return;const r=t&&t.MediaStreamTrack;if(n.getUserMedia=function(s,i,o){Rh("navigator.getUserMedia","navigator.mediaDevices.getUserMedia"),n.mediaDevices.getUserMedia(s).then(i,o)},!(e.version>55&&"autoGainControl"in n.mediaDevices.getSupportedConstraints())){const s=function(o,a,l){a in o&&!(l in o)&&(o[l]=o[a],delete o[a])},i=n.mediaDevices.getUserMedia.bind(n.mediaDevices);if(n.mediaDevices.getUserMedia=function(o){return typeof o=="object"&&typeof o.audio=="object"&&(o=JSON.parse(JSON.stringify(o)),s(o.audio,"autoGainControl","mozAutoGainControl"),s(o.audio,"noiseSuppression","mozNoiseSuppression")),i(o)},r&&r.prototype.getSettings){const o=r.prototype.getSettings;r.prototype.getSettings=function(){const a=o.apply(this,arguments);return s(a,"mozAutoGainControl","autoGainControl"),s(a,"mozNoiseSuppression","noiseSuppression"),a}}if(r&&r.prototype.applyConstraints){const o=r.prototype.applyConstraints;r.prototype.applyConstraints=function(a){return this.kind==="audio"&&typeof a=="object"&&(a=JSON.parse(JSON.stringify(a)),s(a,"autoGainControl","mozAutoGainControl"),s(a,"noiseSuppression","mozNoiseSuppression")),o.apply(this,[a])}}}}function DL(t,e){t.navigator.mediaDevices&&(t.navigator.mediaDevices&&"getDisplayMedia"in t.navigator.mediaDevices||(t.navigator.mediaDevices.getDisplayMedia=function(r){if(!(r&&r.video)){const s=new DOMException("getDisplayMedia without video constraints is undefined");return s.name="NotFoundError",s.code=8,Promise.reject(s)}return r.video===!0?r.video={mediaSource:e}:r.video.mediaSource=e,t.navigator.mediaDevices.getUserMedia(r)}))}function hv(t){typeof t=="object"&&t.RTCTrackEvent&&"receiver"in t.RTCTrackEvent.prototype&&!("transceiver"in t.RTCTrackEvent.prototype)&&Object.defineProperty(t.RTCTrackEvent.prototype,"transceiver",{get(){return{receiver:this.receiver}}})}function fd(t,e){typeof t!="object"||!(t.RTCPeerConnection||t.mozRTCPeerConnection)||(!t.RTCPeerConnection&&t.mozRTCPeerConnection&&(t.RTCPeerConnection=t.mozRTCPeerConnection),e.version<53&&["setLocalDescription","setRemoteDescription","addIceCandidate"].forEach(function(n){const r=t.RTCPeerConnection.prototype[n],s={[n](){return arguments[0]=new(n==="addIceCandidate"?t.RTCIceCandidate:t.RTCSessionDescription)(arguments[0]),r.apply(this,arguments)}};t.RTCPeerConnection.prototype[n]=s[n]}))}function fv(t,e){if(typeof t!="object"||!(t.RTCPeerConnection||t.mozRTCPeerConnection)||e.version>=151)return;const n={inboundrtp:"inbound-rtp",outboundrtp:"outbound-rtp",candidatepair:"candidate-pair",localcandidate:"local-candidate",remotecandidate:"remote-candidate"},r=t.RTCPeerConnection.prototype.getStats;t.RTCPeerConnection.prototype.getStats=function(){const[i,o,a]=arguments;return this.signalingState==="closed"?Promise.resolve(new Map):r.apply(this,[i||null]).then(l=>{if(e.version<53&&!o)try{l.forEach(c=>{c.type=n[c.type]||c.type})}catch(c){if(c.name!=="TypeError")throw c;l.forEach((u,d)=>{l.set(d,Object.assign({},u,{type:n[u.type]||u.type}))})}return l}).then(o,a)}}function pv(t){if(!(typeof t=="object"&&t.RTCPeerConnection&&t.RTCRtpSender)||t.RTCRtpSender&&"getStats"in t.RTCRtpSender.prototype)return;const e=t.RTCPeerConnection.prototype.getSenders;e&&(t.RTCPeerConnection.prototype.getSenders=function(){const s=e.apply(this,[]);return s.forEach(i=>i._pc=this),s});const n=t.RTCPeerConnection.prototype.addTrack;n&&(t.RTCPeerConnection.prototype.addTrack=function(){const s=n.apply(this,arguments);return s._pc=this,s}),t.RTCRtpSender.prototype.getStats=function(){return this.track?this._pc.getStats(this.track):Promise.resolve(new Map)}}function mv(t){if(!(typeof t=="object"&&t.RTCPeerConnection&&t.RTCRtpSender)||t.RTCRtpSender&&"getStats"in t.RTCRtpReceiver.prototype)return;const e=t.RTCPeerConnection.prototype.getReceivers;e&&(t.RTCPeerConnection.prototype.getReceivers=function(){const r=e.apply(this,[]);return r.forEach(s=>s._pc=this),r}),Qs(t,"track",n=>(n.receiver._pc=n.srcElement,n)),t.RTCRtpReceiver.prototype.getStats=function(){return this._pc.getStats(this.track)}}function gv(t){!t.RTCPeerConnection||"removeStream"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.removeStream=function(n){Rh("removeStream","removeTrack"),this.getSenders().forEach(r=>{r.track&&n.getTracks().includes(r.track)&&this.removeTrack(r)})})}function yv(t){t.DataChannel&&!t.RTCDataChannel&&(t.RTCDataChannel=t.DataChannel)}function bv(t,e){if(!(typeof t=="object"&&t.RTCPeerConnection)||e.version>=110)return;const n=t.RTCPeerConnection.prototype.addTransceiver;n&&(t.RTCPeerConnection.prototype.addTransceiver=function(){this.setParametersPromises=[];let s=arguments[1]&&arguments[1].sendEncodings;s===void 0&&(s=[]),s=[...s];const i=s.length>0;i&&s.forEach(a=>{if("rid"in a&&!/^[a-z0-9]{0,16}$/i.test(a.rid))throw new TypeError("Invalid RID value provided.");if("scaleResolutionDownBy"in a&&!(parseFloat(a.scaleResolutionDownBy)>=1))throw new RangeError("scale_resolution_down_by must be >= 1.0");if("maxFramerate"in a&&!(parseFloat(a.maxFramerate)>=0))throw new RangeError("max_framerate must be >= 0.0")});const o=n.apply(this,arguments);if(i){const{sender:a}=o,l=a.getParameters();(!("encodings"in l)||l.encodings.length===1&&Object.keys(l.encodings[0]).length===0)&&(l.encodings=s,a.sendEncodings=s,this.setParametersPromises.push(a.setParameters(l).then(()=>{delete a.sendEncodings}).catch(()=>{delete a.sendEncodings})))}return o})}function vv(t,e){if(!(typeof t=="object"&&t.RTCRtpSender)||e.version>=110)return;const n=t.RTCRtpSender.prototype.getParameters;n&&(t.RTCRtpSender.prototype.getParameters=function(){const s=n.apply(this,arguments);return"encodings"in s||(s.encodings=[].concat(this.sendEncodings||[{}])),s})}function wv(t,e){if(!(typeof t=="object"&&t.RTCPeerConnection)||e.version>=110)return;const n=t.RTCPeerConnection.prototype.createOffer;t.RTCPeerConnection.prototype.createOffer=function(){return this.setParametersPromises&&this.setParametersPromises.length?Promise.all(this.setParametersPromises).then(()=>n.apply(this,arguments)).finally(()=>{this.setParametersPromises=[]}):n.apply(this,arguments)}}function _v(t,e){if(!(typeof t=="object"&&t.RTCPeerConnection)||e.version>=110)return;const n=t.RTCPeerConnection.prototype.createAnswer;t.RTCPeerConnection.prototype.createAnswer=function(){return this.setParametersPromises&&this.setParametersPromises.length?Promise.all(this.setParametersPromises).then(()=>n.apply(this,arguments)).finally(()=>{this.setParametersPromises=[]}):n.apply(this,arguments)}}const Vm=Object.freeze(Object.defineProperty({__proto__:null,shimAddTransceiver:bv,shimCreateAnswer:_v,shimCreateOffer:wv,shimGetDisplayMedia:DL,shimGetParameters:vv,shimGetStats:fv,shimGetUserMedia:dv,shimOnTrack:hv,shimPeerConnection:fd,shimRTCDataChannel:yv,shimReceiverGetStats:mv,shimRemoveStream:gv,shimSenderGetStats:pv},Symbol.toStringTag,{value:"Module"}));function xv(t){if(!(typeof t!="object"||!t.RTCPeerConnection)){if("getLocalStreams"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.getLocalStreams=function(){return this._localStreams||(this._localStreams=[]),this._localStreams}),!("addStream"in t.RTCPeerConnection.prototype)){const e=t.RTCPeerConnection.prototype.addTrack;t.RTCPeerConnection.prototype.addStream=function(r){this._localStreams||(this._localStreams=[]),this._localStreams.includes(r)||this._localStreams.push(r),r.getAudioTracks().forEach(s=>e.call(this,s,r)),r.getVideoTracks().forEach(s=>e.call(this,s,r))},t.RTCPeerConnection.prototype.addTrack=function(r,...s){return s&&s.forEach(i=>{this._localStreams?this._localStreams.includes(i)||this._localStreams.push(i):this._localStreams=[i]}),e.apply(this,arguments)}}"removeStream"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.removeStream=function(n){this._localStreams||(this._localStreams=[]);const r=this._localStreams.indexOf(n);if(r===-1)return;this._localStreams.splice(r,1);const s=n.getTracks();this.getSenders().forEach(i=>{s.includes(i.track)&&this.removeTrack(i)})})}}function kv(t){if(!(typeof t!="object"||!t.RTCPeerConnection)&&("getRemoteStreams"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.getRemoteStreams=function(){return this._remoteStreams?this._remoteStreams:[]}),!("onaddstream"in t.RTCPeerConnection.prototype))){Object.defineProperty(t.RTCPeerConnection.prototype,"onaddstream",{get(){return this._onaddstream},set(n){this._onaddstream&&(this.removeEventListener("addstream",this._onaddstream),this.removeEventListener("track",this._onaddstreampoly)),this.addEventListener("addstream",this._onaddstream=n),this.addEventListener("track",this._onaddstreampoly=r=>{r.streams.forEach(s=>{if(this._remoteStreams||(this._remoteStreams=[]),this._remoteStreams.includes(s))return;this._remoteStreams.push(s);const i=new Event("addstream");i.stream=s,this.dispatchEvent(i)})})}});const e=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(){const r=this;return this._onaddstreampoly||this.addEventListener("track",this._onaddstreampoly=function(s){s.streams.forEach(i=>{if(r._remoteStreams||(r._remoteStreams=[]),r._remoteStreams.indexOf(i)>=0)return;r._remoteStreams.push(i);const o=new Event("addstream");o.stream=i,r.dispatchEvent(o)})}),e.apply(r,arguments)}}}function Sv(t){if(typeof t!="object"||!t.RTCPeerConnection)return;const e=t.RTCPeerConnection.prototype,n=e.createOffer,r=e.createAnswer,s=e.setLocalDescription,i=e.setRemoteDescription,o=e.addIceCandidate;e.createOffer=function(c,u){const d=arguments.length>=2?arguments[2]:arguments[0],h=n.apply(this,[d]);return u?(h.then(c,u),Promise.resolve()):h},e.createAnswer=function(c,u){const d=arguments.length>=2?arguments[2]:arguments[0],h=r.apply(this,[d]);return u?(h.then(c,u),Promise.resolve()):h};let a=function(l,c,u){const d=s.apply(this,[l]);return u?(d.then(c,u),Promise.resolve()):d};e.setLocalDescription=a,a=function(l,c,u){const d=i.apply(this,[l]);return u?(d.then(c,u),Promise.resolve()):d},e.setRemoteDescription=a,a=function(l,c,u){const d=o.apply(this,[l]);return u?(d.then(c,u),Promise.resolve()):d},e.addIceCandidate=a}function Ev(t){const e=t&&t.navigator;if(e.mediaDevices&&e.mediaDevices.getUserMedia){const n=e.mediaDevices,r=n.getUserMedia.bind(n);e.mediaDevices.getUserMedia=s=>r(Av(s))}!e.getUserMedia&&e.mediaDevices&&e.mediaDevices.getUserMedia&&(e.getUserMedia=(function(r,s,i){e.mediaDevices.getUserMedia(r).then(s,i)}).bind(e))}function Av(t){return t&&t.video!==void 0?Object.assign({},t,{video:nv(t.video)}):t}function Tv(t){if(!t.RTCPeerConnection)return;const e=t.RTCPeerConnection;t.RTCPeerConnection=function(r,s){if(r&&r.iceServers){const i=[];for(let o=0;o<r.iceServers.length;o++){let a=r.iceServers[o];a.urls===void 0&&a.url?(Rh("RTCIceServer.url","RTCIceServer.urls"),a=JSON.parse(JSON.stringify(a)),a.urls=a.url,delete a.url,i.push(a)):i.push(r.iceServers[o])}r.iceServers=i}return new e(r,s)},t.RTCPeerConnection.prototype=e.prototype,"generateCertificate"in e&&Object.defineProperty(t.RTCPeerConnection,"generateCertificate",{get(){return e.generateCertificate}})}function Cv(t){typeof t=="object"&&t.RTCTrackEvent&&"receiver"in t.RTCTrackEvent.prototype&&!("transceiver"in t.RTCTrackEvent.prototype)&&Object.defineProperty(t.RTCTrackEvent.prototype,"transceiver",{get(){return{receiver:this.receiver}}})}function Mv(t){const e=t.RTCPeerConnection.prototype.createOffer;t.RTCPeerConnection.prototype.createOffer=function(r){if(r){typeof r.offerToReceiveAudio<"u"&&(r.offerToReceiveAudio=!!r.offerToReceiveAudio);const s=this.getTransceivers().find(o=>o.receiver.track.kind==="audio");r.offerToReceiveAudio===!1&&s?s.direction==="sendrecv"?s.setDirection?s.setDirection("sendonly"):s.direction="sendonly":s.direction==="recvonly"&&(s.setDirection?s.setDirection("inactive"):s.direction="inactive"):r.offerToReceiveAudio===!0&&!s&&this.addTransceiver("audio",{direction:"recvonly"}),typeof r.offerToReceiveVideo<"u"&&(r.offerToReceiveVideo=!!r.offerToReceiveVideo);const i=this.getTransceivers().find(o=>o.receiver.track.kind==="video");r.offerToReceiveVideo===!1&&i?i.direction==="sendrecv"?i.setDirection?i.setDirection("sendonly"):i.direction="sendonly":i.direction==="recvonly"&&(i.setDirection?i.setDirection("inactive"):i.direction="inactive"):r.offerToReceiveVideo===!0&&!i&&this.addTransceiver("video",{direction:"recvonly"})}return e.apply(this,arguments)}}function Rv(t){typeof t!="object"||t.AudioContext||(t.AudioContext=t.webkitAudioContext)}const Gm=Object.freeze(Object.defineProperty({__proto__:null,shimAudioContext:Rv,shimCallbacksAPI:Sv,shimConstraints:Av,shimCreateOfferLegacy:Mv,shimGetUserMedia:Ev,shimLocalStreamsAPI:xv,shimRTCIceServerUrls:Tv,shimRemoteStreamsAPI:kv,shimTrackEventTransceiver:Cv},Symbol.toStringTag,{value:"Module"}));var gu={exports:{}},Ym;function NL(){return Ym||(Ym=1,(function(t){const e={};e.generateIdentifier=function(){return Math.random().toString(36).substring(2,12)},e.localCName=e.generateIdentifier(),e.splitLines=function(n){return n.trim().split(`
`).map(r=>r.trim())},e.splitSections=function(n){return n.split(`
m=`).map((s,i)=>(i>0?"m="+s:s).trim()+`\r
`)},e.getDescription=function(n){const r=e.splitSections(n);return r&&r[0]},e.getMediaSections=function(n){const r=e.splitSections(n);return r.shift(),r},e.matchPrefix=function(n,r){return e.splitLines(n).filter(s=>s.indexOf(r)===0)},e.parseCandidate=function(n){let r;n.indexOf("a=candidate:")===0?r=n.substring(12).split(" "):r=n.substring(10).split(" ");const s={foundation:r[0],component:{1:"rtp",2:"rtcp"}[r[1]]||r[1],protocol:r[2].toLowerCase(),priority:parseInt(r[3],10),ip:r[4],address:r[4],port:parseInt(r[5],10),type:r[7]};for(let i=8;i<r.length;i+=2)switch(r[i]){case"raddr":s.relatedAddress=r[i+1];break;case"rport":s.relatedPort=parseInt(r[i+1],10);break;case"tcptype":s.tcpType=r[i+1];break;case"ufrag":s.ufrag=r[i+1],s.usernameFragment=r[i+1];break;default:s[r[i]]===void 0&&(s[r[i]]=r[i+1]);break}return s},e.writeCandidate=function(n){const r=[];r.push(n.foundation);const s=n.component;s==="rtp"?r.push(1):s==="rtcp"?r.push(2):r.push(s),r.push(n.protocol.toUpperCase()),r.push(n.priority),r.push(n.address||n.ip),r.push(n.port);const i=n.type;return r.push("typ"),r.push(i),i!=="host"&&n.relatedAddress&&n.relatedPort!==void 0&&(r.push("raddr"),r.push(n.relatedAddress),r.push("rport"),r.push(n.relatedPort)),n.tcpType&&n.protocol.toLowerCase()==="tcp"&&(r.push("tcptype"),r.push(n.tcpType)),(n.usernameFragment||n.ufrag)&&(r.push("ufrag"),r.push(n.usernameFragment||n.ufrag)),"candidate:"+r.join(" ")},e.parseIceOptions=function(n){return n.substring(14).split(" ")},e.parseRtpMap=function(n){let r=n.substring(9).split(" ");const s={payloadType:parseInt(r.shift(),10)};return r=r[0].split("/"),s.name=r[0],s.clockRate=parseInt(r[1],10),s.channels=r.length===3?parseInt(r[2],10):1,s.numChannels=s.channels,s},e.writeRtpMap=function(n){let r=n.payloadType;n.preferredPayloadType!==void 0&&(r=n.preferredPayloadType);const s=n.channels||n.numChannels||1;return"a=rtpmap:"+r+" "+n.name+"/"+n.clockRate+(s!==1?"/"+s:"")+`\r
`},e.parseExtmap=function(n){const r=n.substring(9).split(" ");return{id:parseInt(r[0],10),direction:r[0].indexOf("/")>0?r[0].split("/")[1]:"sendrecv",uri:r[1],attributes:r.slice(2).join(" ")}},e.writeExtmap=function(n){return"a=extmap:"+(n.id||n.preferredId)+(n.direction&&n.direction!=="sendrecv"?"/"+n.direction:"")+" "+n.uri+(n.attributes?" "+n.attributes:"")+`\r
`},e.parseFmtp=function(n){const r={};let s;const i=n.substring(n.indexOf(" ")+1).split(";");for(let o=0;o<i.length;o++)s=i[o].trim().split("="),r[s[0].trim()]=s[1];return r},e.writeFmtp=function(n){let r="",s=n.payloadType;if(n.preferredPayloadType!==void 0&&(s=n.preferredPayloadType),n.parameters&&Object.keys(n.parameters).length){const i=[];Object.keys(n.parameters).forEach(o=>{n.parameters[o]!==void 0?i.push(o+"="+n.parameters[o]):i.push(o)}),r+="a=fmtp:"+s+" "+i.join(";")+`\r
`}return r},e.parseRtcpFb=function(n){const r=n.substring(n.indexOf(" ")+1).split(" ");return{type:r.shift(),parameter:r.join(" ")}},e.writeRtcpFb=function(n){let r="",s=n.payloadType;return n.preferredPayloadType!==void 0&&(s=n.preferredPayloadType),n.rtcpFeedback&&n.rtcpFeedback.length&&n.rtcpFeedback.forEach(i=>{r+="a=rtcp-fb:"+s+" "+i.type+(i.parameter&&i.parameter.length?" "+i.parameter:"")+`\r
`}),r},e.parseSsrcMedia=function(n){const r=n.indexOf(" "),s={ssrc:parseInt(n.substring(7,r),10)},i=n.indexOf(":",r);return i>-1?(s.attribute=n.substring(r+1,i),s.value=n.substring(i+1)):s.attribute=n.substring(r+1),s},e.parseSsrcGroup=function(n){const r=n.substring(13).split(" ");return{semantics:r.shift(),ssrcs:r.map(s=>parseInt(s,10))}},e.getMid=function(n){const r=e.matchPrefix(n,"a=mid:")[0];if(r)return r.substring(6)},e.parseFingerprint=function(n){const r=n.substring(14).split(" ");return{algorithm:r[0].toLowerCase(),value:r[1].toUpperCase()}},e.getDtlsParameters=function(n,r){return{role:"auto",fingerprints:e.matchPrefix(n+r,"a=fingerprint:").map(e.parseFingerprint)}},e.writeDtlsParameters=function(n,r){let s="a=setup:"+r+`\r
`;return n.fingerprints.forEach(i=>{s+="a=fingerprint:"+i.algorithm+" "+i.value+`\r
`}),s},e.parseCryptoLine=function(n){const r=n.substring(9).split(" ");return{tag:parseInt(r[0],10),cryptoSuite:r[1],keyParams:r[2],sessionParams:r.slice(3)}},e.writeCryptoLine=function(n){return"a=crypto:"+n.tag+" "+n.cryptoSuite+" "+(typeof n.keyParams=="object"?e.writeCryptoKeyParams(n.keyParams):n.keyParams)+(n.sessionParams?" "+n.sessionParams.join(" "):"")+`\r
`},e.parseCryptoKeyParams=function(n){if(n.indexOf("inline:")!==0)return null;const r=n.substring(7).split("|");return{keyMethod:"inline",keySalt:r[0],lifeTime:r[1],mkiValue:r[2]?r[2].split(":")[0]:void 0,mkiLength:r[2]?r[2].split(":")[1]:void 0}},e.writeCryptoKeyParams=function(n){return n.keyMethod+":"+n.keySalt+(n.lifeTime?"|"+n.lifeTime:"")+(n.mkiValue&&n.mkiLength?"|"+n.mkiValue+":"+n.mkiLength:"")},e.getCryptoParameters=function(n,r){return e.matchPrefix(n+r,"a=crypto:").map(e.parseCryptoLine)},e.getIceParameters=function(n,r){const s=e.matchPrefix(n+r,"a=ice-ufrag:")[0],i=e.matchPrefix(n+r,"a=ice-pwd:")[0];return s&&i?{usernameFragment:s.substring(12),password:i.substring(10)}:null},e.writeIceParameters=function(n){let r="a=ice-ufrag:"+n.usernameFragment+`\r
a=ice-pwd:`+n.password+`\r
`;return n.iceLite&&(r+=`a=ice-lite\r
`),r},e.parseRtpParameters=function(n){const r={codecs:[],headerExtensions:[],fecMechanisms:[],rtcp:[]},i=e.splitLines(n)[0].split(" ");r.profile=i[2];for(let a=3;a<i.length;a++){const l=i[a],c=e.matchPrefix(n,"a=rtpmap:"+l+" ")[0];if(c){const u=e.parseRtpMap(c),d=e.matchPrefix(n,"a=fmtp:"+l+" ");switch(u.parameters=d.length?e.parseFmtp(d[0]):{},u.rtcpFeedback=e.matchPrefix(n,"a=rtcp-fb:"+l+" ").map(e.parseRtcpFb),r.codecs.push(u),u.name.toUpperCase()){case"RED":case"ULPFEC":r.fecMechanisms.push(u.name.toUpperCase());break}}}e.matchPrefix(n,"a=extmap:").forEach(a=>{r.headerExtensions.push(e.parseExtmap(a))});const o=e.matchPrefix(n,"a=rtcp-fb:* ").map(e.parseRtcpFb);return r.codecs.forEach(a=>{o.forEach(l=>{a.rtcpFeedback.find(u=>u.type===l.type&&u.parameter===l.parameter)||a.rtcpFeedback.push(l)})}),r},e.writeRtpDescription=function(n,r){let s="";s+="m="+n+" ",s+=r.codecs.length>0?"9":"0",s+=" "+(r.profile||"UDP/TLS/RTP/SAVPF")+" ",s+=r.codecs.map(o=>o.preferredPayloadType!==void 0?o.preferredPayloadType:o.payloadType).join(" ")+`\r
`,s+=`c=IN IP4 0.0.0.0\r
`,s+=`a=rtcp:9 IN IP4 0.0.0.0\r
`,r.codecs.forEach(o=>{s+=e.writeRtpMap(o),s+=e.writeFmtp(o),s+=e.writeRtcpFb(o)});let i=0;return r.codecs.forEach(o=>{o.maxptime>i&&(i=o.maxptime)}),i>0&&(s+="a=maxptime:"+i+`\r
`),r.headerExtensions&&r.headerExtensions.forEach(o=>{s+=e.writeExtmap(o)}),s},e.parseRtpEncodingParameters=function(n){const r=[],s=e.parseRtpParameters(n),i=s.fecMechanisms.indexOf("RED")!==-1,o=s.fecMechanisms.indexOf("ULPFEC")!==-1,a=e.matchPrefix(n,"a=ssrc:").map(h=>e.parseSsrcMedia(h)).filter(h=>h.attribute==="cname"),l=a.length>0&&a[0].ssrc;let c;const u=e.matchPrefix(n,"a=ssrc-group:FID").map(h=>h.substring(17).split(" ").map(m=>parseInt(m,10)));u.length>0&&u[0].length>1&&u[0][0]===l&&(c=u[0][1]),s.codecs.forEach(h=>{if(h.name.toUpperCase()==="RTX"&&h.parameters.apt){let f={ssrc:l,codecPayloadType:parseInt(h.parameters.apt,10)};l&&c&&(f.rtx={ssrc:c}),r.push(f),i&&(f=JSON.parse(JSON.stringify(f)),f.fec={ssrc:l,mechanism:o?"red+ulpfec":"red"},r.push(f))}}),r.length===0&&l&&r.push({ssrc:l});let d=e.matchPrefix(n,"b=");return d.length&&(d[0].indexOf("b=TIAS:")===0?d=parseInt(d[0].substring(7),10):d[0].indexOf("b=AS:")===0?d=parseInt(d[0].substring(5),10)*1e3*.95-2e3*8:d=void 0,r.forEach(h=>{h.maxBitrate=d})),r},e.parseRtcpParameters=function(n){const r={},s=e.matchPrefix(n,"a=ssrc:").map(a=>e.parseSsrcMedia(a)).filter(a=>a.attribute==="cname")[0];s&&(r.cname=s.value,r.ssrc=s.ssrc);const i=e.matchPrefix(n,"a=rtcp-rsize");r.reducedSize=i.length>0,r.compound=i.length===0;const o=e.matchPrefix(n,"a=rtcp-mux");return r.mux=o.length>0,r},e.writeRtcpParameters=function(n){let r="";return n.reducedSize&&(r+=`a=rtcp-rsize\r
`),n.mux&&(r+=`a=rtcp-mux\r
`),n.ssrc!==void 0&&n.cname&&(r+="a=ssrc:"+n.ssrc+" cname:"+n.cname+`\r
`),r},e.parseMsid=function(n){let r;const s=e.matchPrefix(n,"a=msid:");if(s.length===1)return r=s[0].substring(7).split(" "),{stream:r[0],track:r[1]};const i=e.matchPrefix(n,"a=ssrc:").map(o=>e.parseSsrcMedia(o)).filter(o=>o.attribute==="msid");if(i.length>0)return r=i[0].value.split(" "),{stream:r[0],track:r[1]}},e.parseSctpDescription=function(n){const r=e.parseMLine(n),s=e.matchPrefix(n,"a=max-message-size:");let i;s.length>0&&(i=parseInt(s[0].substring(19),10)),isNaN(i)&&(i=65536);const o=e.matchPrefix(n,"a=sctp-port:");if(o.length>0)return{port:parseInt(o[0].substring(12),10),protocol:r.fmt,maxMessageSize:i};const a=e.matchPrefix(n,"a=sctpmap:");if(a.length>0){const l=a[0].substring(10).split(" ");return{port:parseInt(l[0],10),protocol:l[1],maxMessageSize:i}}},e.writeSctpDescription=function(n,r){let s=[];return n.protocol!=="DTLS/SCTP"?s=["m="+n.kind+" 9 "+n.protocol+" "+r.protocol+`\r
`,`c=IN IP4 0.0.0.0\r
`,"a=sctp-port:"+r.port+`\r
`]:s=["m="+n.kind+" 9 "+n.protocol+" "+r.port+`\r
`,`c=IN IP4 0.0.0.0\r
`,"a=sctpmap:"+r.port+" "+r.protocol+` 65535\r
`],r.maxMessageSize!==void 0&&s.push("a=max-message-size:"+r.maxMessageSize+`\r
`),s.join("")},e.generateSessionId=function(){return Math.random().toString().substr(2,22)},e.writeSessionBoilerplate=function(n,r,s){let i;const o=r!==void 0?r:2;return n?i=n:i=e.generateSessionId(),`v=0\r
o=`+(s||"thisisadapterortc")+" "+i+" "+o+` IN IP4 127.0.0.1\r
s=-\r
t=0 0\r
`},e.getDirection=function(n,r){const s=e.splitLines(n);for(let i=0;i<s.length;i++)switch(s[i]){case"a=sendrecv":case"a=sendonly":case"a=recvonly":case"a=inactive":return s[i].substring(2)}return r?e.getDirection(r):"sendrecv"},e.getKind=function(n){return e.splitLines(n)[0].split(" ")[0].substring(2)},e.isRejected=function(n){return n.split(" ",2)[1]==="0"},e.parseMLine=function(n){const s=e.splitLines(n)[0].substring(2).split(" ");return{kind:s[0],port:parseInt(s[1],10),protocol:s[2],fmt:s.slice(3).join(" ")}},e.parseOLine=function(n){const s=e.matchPrefix(n,"o=")[0].substring(2).split(" ");return{username:s[0],sessionId:s[1],sessionVersion:parseInt(s[2],10),netType:s[3],addressType:s[4],address:s[5]}},e.isValidSDP=function(n){if(typeof n!="string"||n.length===0)return!1;const r=e.splitLines(n);for(let s=0;s<r.length;s++)if(r[s].length<2||r[s].charAt(1)!=="=")return!1;return!0},t.exports=e})(gu)),gu.exports}var Pv=NL();const Ii=By(Pv),FL=fw({__proto__:null,default:Ii},[Pv]);function Xa(t){if(!t.RTCIceCandidate||t.RTCIceCandidate&&"foundation"in t.RTCIceCandidate.prototype)return;const e=t.RTCIceCandidate;t.RTCIceCandidate=function(r){if(typeof r=="object"&&r.candidate&&r.candidate.indexOf("a=")===0&&(r=JSON.parse(JSON.stringify(r)),r.candidate=r.candidate.substring(2)),r.candidate&&r.candidate.length){const s=new e(r),i=Ii.parseCandidate(r.candidate);for(const o in i)o in s||Object.defineProperty(s,o,{value:i[o]});return s.toJSON=function(){return{candidate:s.candidate,sdpMid:s.sdpMid,sdpMLineIndex:s.sdpMLineIndex,usernameFragment:s.usernameFragment}},s}return new e(r)},t.RTCIceCandidate.prototype=e.prototype,Qs(t,"icecandidate",n=>(n.candidate&&Object.defineProperty(n,"candidate",{value:new t.RTCIceCandidate(n.candidate),writable:"false"}),n))}function pd(t){!t.RTCIceCandidate||t.RTCIceCandidate&&"relayProtocol"in t.RTCIceCandidate.prototype||Qs(t,"icecandidate",e=>{if(e.candidate){const n=Ii.parseCandidate(e.candidate.candidate);n.type==="relay"&&(e.candidate.relayProtocol={0:"tls",1:"tcp",2:"udp"}[n.priority>>24])}return e})}function qa(t,e){if(!t.RTCPeerConnection||e.browser==="chrome"&&e.version>102||e.browser==="firefox"&&e.version>=113)return;"sctp"in t.RTCPeerConnection.prototype||Object.defineProperty(t.RTCPeerConnection.prototype,"sctp",{get(){return typeof this._sctp>"u"?null:this._sctp}});const n=function(a){if(!a||!a.sdp)return!1;const l=Ii.splitSections(a.sdp);return l.shift(),l.some(c=>{const u=Ii.parseMLine(c);return u&&u.kind==="application"&&u.protocol.indexOf("SCTP")!==-1})},r=function(a){const l=a.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);if(l===null||l.length<2)return-1;const c=parseInt(l[1],10);return c!==c?-1:c},s=function(a){let l=65536;return e.browser==="firefox"&&(e.version<57?a===-1?l=16384:l=2147483637:e.version<60?l=e.version===57?65535:65536:l=2147483637),l},i=function(a,l){let c=65536;e.browser==="firefox"&&e.version===57&&(c=65535);const u=Ii.matchPrefix(a.sdp,"a=max-message-size:");return u.length>0?c=parseInt(u[0].substring(19),10):e.browser==="firefox"&&l!==-1&&(c=2147483637),c},o=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(){if(this._sctp=null,e.browser==="chrome"&&e.version>=76){const{sdpSemantics:l}=this.getConfiguration();l==="plan-b"&&Object.defineProperty(this,"sctp",{get(){return typeof this._sctp>"u"?null:this._sctp},enumerable:!0,configurable:!0})}if(n(arguments[0])){const l=r(arguments[0]),c=s(l),u=i(arguments[0],l);let d;c===0&&u===0?d=Number.POSITIVE_INFINITY:c===0||u===0?d=Math.max(c,u):d=Math.min(c,u);const h={};Object.defineProperty(h,"maxMessageSize",{get(){return d}}),this._sctp=h}return o.apply(this,arguments)}}function Za(t,e){if(!(t.RTCPeerConnection&&"createDataChannel"in t.RTCPeerConnection.prototype)||e.browser==="chrome"&&e.version>=149||e.browser==="firefox"&&e.version>60)return;function n(s,i){const o=s.send;s.send=function(){const l=arguments[0],c=l.length||l.size||l.byteLength;if(s.readyState==="open"&&i.sctp&&c>i.sctp.maxMessageSize)throw new TypeError("Message too large (can send a maximum of "+i.sctp.maxMessageSize+" bytes)");return o.apply(s,arguments)}}const r=t.RTCPeerConnection.prototype.createDataChannel;t.RTCPeerConnection.prototype.createDataChannel=function(){const i=r.apply(this,arguments);return n(i,this),i},Qs(t,"datachannel",s=>(n(s.channel,s.target),s))}function md(t){if(!t.RTCPeerConnection||"connectionState"in t.RTCPeerConnection.prototype)return;const e=t.RTCPeerConnection.prototype;Object.defineProperty(e,"connectionState",{get(){return{completed:"connected",checking:"connecting"}[this.iceConnectionState]||this.iceConnectionState},enumerable:!0,configurable:!0}),Object.defineProperty(e,"onconnectionstatechange",{get(){return this._onconnectionstatechange||null},set(n){this._onconnectionstatechange&&(this.removeEventListener("connectionstatechange",this._onconnectionstatechange),delete this._onconnectionstatechange),n&&this.addEventListener("connectionstatechange",this._onconnectionstatechange=n)},enumerable:!0,configurable:!0}),["setLocalDescription","setRemoteDescription"].forEach(n=>{const r=e[n];e[n]=function(){return this._connectionstatechangepoly||(this._connectionstatechangepoly=s=>{const i=s.target;if(i._lastConnectionState!==i.connectionState){i._lastConnectionState=i.connectionState;const o=new Event("connectionstatechange",s);i.dispatchEvent(o)}return s},this.addEventListener("iceconnectionstatechange",this._connectionstatechangepoly)),r.apply(this,arguments)}})}function gd(t,e){if(!t.RTCPeerConnection||e.browser==="chrome"&&e.version>=71||e.browser==="safari"&&e._safariVersion>=13.1)return;const n=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(s){if(s&&s.sdp&&s.sdp.indexOf(`
a=extmap-allow-mixed`)!==-1){const i=s.sdp.split(`
`).filter(o=>o.trim()!=="a=extmap-allow-mixed").join(`
`);t.RTCSessionDescription&&s instanceof t.RTCSessionDescription?arguments[0]=new t.RTCSessionDescription({type:s.type,sdp:i}):s.sdp=i}return n.apply(this,arguments)}}function Ka(t,e){if(!(t.RTCPeerConnection&&t.RTCPeerConnection.prototype))return;const n=t.RTCPeerConnection.prototype.addIceCandidate;!n||n.length===0||(t.RTCPeerConnection.prototype.addIceCandidate=function(){return arguments[0]?(e.browser==="chrome"&&e.version<78||e.browser==="firefox"&&e.version<68||e.browser==="safari")&&arguments[0]&&arguments[0].candidate===""?Promise.resolve():n.apply(this,arguments):(arguments[1]&&arguments[1].apply(null),Promise.resolve())})}function Ja(t,e){if(!(t.RTCPeerConnection&&t.RTCPeerConnection.prototype))return;const n=t.RTCPeerConnection.prototype.setLocalDescription;!n||n.length===0||(t.RTCPeerConnection.prototype.setLocalDescription=function(){let s=arguments[0]||{};if(typeof s!="object"||s.type&&s.sdp)return n.apply(this,arguments);if(s={type:s.type,sdp:s.sdp},!s.type)switch(this.signalingState){case"stable":case"have-local-offer":case"have-remote-pranswer":s.type="offer";break;default:s.type="answer";break}return s.sdp||s.type!=="offer"&&s.type!=="answer"?n.apply(this,[s]):(s.type==="offer"?this.createOffer:this.createAnswer).apply(this).then(o=>n.apply(this,[o]))})}const BL=Object.freeze(Object.defineProperty({__proto__:null,removeExtmapAllowMixed:gd,shimAddIceCandidateNullOrEmpty:Ka,shimConnectionState:md,shimMaxMessageSize:qa,shimParameterlessSetLocalDescription:Ja,shimRTCIceCandidate:Xa,shimRTCIceCandidateRelayProtocol:pd,shimSendThrowTypeError:Za},Symbol.toStringTag,{value:"Module"}));function UL({window:t}={},e={shimChrome:!0,shimFirefox:!0,shimSafari:!0}){const n=Mh,r=$L(t),s={browserDetails:r,commonShim:BL,extractVersion:mo,disableLog:zL,disableWarnings:LL,sdp:FL};switch(r.browser){case"chrome":if(!Wm||!hd||!e.shimChrome)return n("Chrome shim is not included in this adapter release."),s;if(r.version===null)return n("Chrome shim can not determine version, not shimming."),s;n("adapter.js shimming chrome."),s.browserShim=Wm,Ka(t,r),Ja(t),rv(t,r),sv(t),hd(t,r),iv(t,r),cv(t,r),ov(t),av(t,r),uv(t,r),Xa(t),pd(t),md(t),qa(t,r),Za(t,r),gd(t,r);break;case"firefox":if(!Vm||!fd||!e.shimFirefox)return n("Firefox shim is not included in this adapter release."),s;n("adapter.js shimming firefox."),s.browserShim=Vm,Ka(t,r),Ja(t),dv(t,r),fd(t,r),fv(t,r),hv(t),gv(t),pv(t),mv(t),yv(t),bv(t,r),vv(t,r),wv(t,r),_v(t,r),Xa(t),md(t),qa(t,r),Za(t,r);break;case"safari":if(!Gm||!e.shimSafari)return n("Safari shim is not included in this adapter release."),s;n("adapter.js shimming safari."),s.browserShim=Gm,Ka(t,r),Ja(t),Tv(t),Mv(t),Sv(t),xv(t),kv(t),Cv(t),Ev(t),Rv(t),Xa(t),pd(t),qa(t,r),Za(t,r),gd(t,r);break;default:n("Unsupported browser!");break}return s}const Xm=UL({window:typeof window>"u"?void 0:window});function ei(t,e,n,r){Object.defineProperty(t,e,{get:n,set:r,enumerable:!0,configurable:!0})}class Iv{constructor(){this.chunkedMTU=16300,this._dataCount=1,this.chunk=e=>{const n=[],r=e.byteLength,s=Math.ceil(r/this.chunkedMTU);let i=0,o=0;for(;o<r;){const a=Math.min(r,o+this.chunkedMTU),l=e.slice(o,a),c={__peerData:this._dataCount,n:i,data:l,total:s};n.push(c),o=a,i++}return this._dataCount++,n}}}function HL(t){let e=0;for(const s of t)e+=s.byteLength;const n=new Uint8Array(e);let r=0;for(const s of t)n.set(s,r),r+=s.byteLength;return n}const yu=Xm.default||Xm,no=new class{isWebRTCSupported(){return typeof RTCPeerConnection<"u"}isBrowserSupported(){const t=this.getBrowser(),e=this.getVersion();return this.supportedBrowsers.includes(t)?t==="chrome"?e>=this.minChromeVersion:t==="firefox"?e>=this.minFirefoxVersion:t==="safari"?!this.isIOS&&e>=this.minSafariVersion:!1:!1}getBrowser(){return yu.browserDetails.browser}getVersion(){return yu.browserDetails.version||0}isUnifiedPlanSupported(){const t=this.getBrowser(),e=yu.browserDetails.version||0;if(t==="chrome"&&e<this.minChromeVersion)return!1;if(t==="firefox"&&e>=this.minFirefoxVersion)return!0;if(!window.RTCRtpTransceiver||!("currentDirection"in RTCRtpTransceiver.prototype))return!1;let n,r=!1;try{n=new RTCPeerConnection,n.addTransceiver("audio"),r=!0}catch{}finally{n&&n.close()}return r}toString(){return`Supports:
    browser:${this.getBrowser()}
    version:${this.getVersion()}
    isIOS:${this.isIOS}
    isWebRTCSupported:${this.isWebRTCSupported()}
    isBrowserSupported:${this.isBrowserSupported()}
    isUnifiedPlanSupported:${this.isUnifiedPlanSupported()}`}constructor(){this.isIOS=typeof navigator<"u"?["iPad","iPhone","iPod"].includes(navigator.platform):!1,this.supportedBrowsers=["firefox","chrome","safari"],this.minFirefoxVersion=59,this.minChromeVersion=72,this.minSafariVersion=605}},jL=t=>!t||/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(t),Ov=()=>Math.random().toString(36).slice(2),qm={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:["turn:eu-0.turn.peerjs.com:3478","turn:us-0.turn.peerjs.com:3478"],username:"peerjs",credential:"peerjsp"}],sdpSemantics:"unified-plan"};class WL extends Iv{noop(){}blobToArrayBuffer(e,n){const r=new FileReader;return r.onload=function(s){s.target&&n(s.target.result)},r.readAsArrayBuffer(e),r}binaryStringToArrayBuffer(e){const n=new Uint8Array(e.length);for(let r=0;r<e.length;r++)n[r]=e.charCodeAt(r)&255;return n.buffer}isSecure(){return location.protocol==="https:"}constructor(...e){super(...e),this.CLOUD_HOST="0.peerjs.com",this.CLOUD_PORT=443,this.chunkedBrowsers={Chrome:1,chrome:1},this.defaultConfig=qm,this.browser=no.getBrowser(),this.browserVersion=no.getVersion(),this.pack=Qb,this.unpack=Jb,this.supports=(function(){const n={browser:no.isBrowserSupported(),webRTC:no.isWebRTCSupported(),audioVideo:!1,data:!1,binaryBlob:!1,reliable:!1};if(!n.webRTC)return n;let r;try{r=new RTCPeerConnection(qm),n.audioVideo=!0;let s;try{s=r.createDataChannel("_PEERJSTEST",{ordered:!0}),n.data=!0,n.reliable=!!s.ordered;try{s.binaryType="blob",n.binaryBlob=!no.isIOS}catch{}}catch{}finally{s&&s.close()}}catch{}finally{r&&r.close()}return n})(),this.validateId=jL,this.randomToken=Ov}}const yn=new WL,VL="PeerJS: ";class GL{get logLevel(){return this._logLevel}set logLevel(e){this._logLevel=e}log(...e){this._logLevel>=3&&this._print(3,...e)}warn(...e){this._logLevel>=2&&this._print(2,...e)}error(...e){this._logLevel>=1&&this._print(1,...e)}setLogFunction(e){this._print=e}_print(e,...n){const r=[VL,...n];for(const s in r)r[s]instanceof Error&&(r[s]="("+r[s].name+") "+r[s].message);e>=3?console.log(...r):e>=2?console.warn("WARNING",...r):e>=1&&console.error("ERROR",...r)}constructor(){this._logLevel=0}}var ve=new GL,Ph={},YL=Object.prototype.hasOwnProperty,dn="~";function Uo(){}Object.create&&(Uo.prototype=Object.create(null),new Uo().__proto__||(dn=!1));function XL(t,e,n){this.fn=t,this.context=e,this.once=n||!1}function zv(t,e,n,r,s){if(typeof n!="function")throw new TypeError("The listener must be a function");var i=new XL(n,r||t,s),o=dn?dn+e:e;return t._events[o]?t._events[o].fn?t._events[o]=[t._events[o],i]:t._events[o].push(i):(t._events[o]=i,t._eventsCount++),t}function Qa(t,e){--t._eventsCount===0?t._events=new Uo:delete t._events[e]}function nn(){this._events=new Uo,this._eventsCount=0}nn.prototype.eventNames=function(){var e=[],n,r;if(this._eventsCount===0)return e;for(r in n=this._events)YL.call(n,r)&&e.push(dn?r.slice(1):r);return Object.getOwnPropertySymbols?e.concat(Object.getOwnPropertySymbols(n)):e};nn.prototype.listeners=function(e){var n=dn?dn+e:e,r=this._events[n];if(!r)return[];if(r.fn)return[r.fn];for(var s=0,i=r.length,o=new Array(i);s<i;s++)o[s]=r[s].fn;return o};nn.prototype.listenerCount=function(e){var n=dn?dn+e:e,r=this._events[n];return r?r.fn?1:r.length:0};nn.prototype.emit=function(e,n,r,s,i,o){var a=dn?dn+e:e;if(!this._events[a])return!1;var l=this._events[a],c=arguments.length,u,d;if(l.fn){switch(l.once&&this.removeListener(e,l.fn,void 0,!0),c){case 1:return l.fn.call(l.context),!0;case 2:return l.fn.call(l.context,n),!0;case 3:return l.fn.call(l.context,n,r),!0;case 4:return l.fn.call(l.context,n,r,s),!0;case 5:return l.fn.call(l.context,n,r,s,i),!0;case 6:return l.fn.call(l.context,n,r,s,i,o),!0}for(d=1,u=new Array(c-1);d<c;d++)u[d-1]=arguments[d];l.fn.apply(l.context,u)}else{var h=l.length,f;for(d=0;d<h;d++)switch(l[d].once&&this.removeListener(e,l[d].fn,void 0,!0),c){case 1:l[d].fn.call(l[d].context);break;case 2:l[d].fn.call(l[d].context,n);break;case 3:l[d].fn.call(l[d].context,n,r);break;case 4:l[d].fn.call(l[d].context,n,r,s);break;default:if(!u)for(f=1,u=new Array(c-1);f<c;f++)u[f-1]=arguments[f];l[d].fn.apply(l[d].context,u)}}return!0};nn.prototype.on=function(e,n,r){return zv(this,e,n,r,!1)};nn.prototype.once=function(e,n,r){return zv(this,e,n,r,!0)};nn.prototype.removeListener=function(e,n,r,s){var i=dn?dn+e:e;if(!this._events[i])return this;if(!n)return Qa(this,i),this;var o=this._events[i];if(o.fn)o.fn===n&&(!s||o.once)&&(!r||o.context===r)&&Qa(this,i);else{for(var a=0,l=[],c=o.length;a<c;a++)(o[a].fn!==n||s&&!o[a].once||r&&o[a].context!==r)&&l.push(o[a]);l.length?this._events[i]=l.length===1?l[0]:l:Qa(this,i)}return this};nn.prototype.removeAllListeners=function(e){var n;return e?(n=dn?dn+e:e,this._events[n]&&Qa(this,n)):(this._events=new Uo,this._eventsCount=0),this};nn.prototype.off=nn.prototype.removeListener;nn.prototype.addListener=nn.prototype.on;nn.prefixed=dn;nn.EventEmitter=nn;Ph=nn;var ti={};ei(ti,"ConnectionType",()=>vs);ei(ti,"PeerErrorType",()=>Ot);ei(ti,"BaseConnectionErrorType",()=>yd);ei(ti,"DataConnectionErrorType",()=>Ih);ei(ti,"SerializationType",()=>ac);ei(ti,"SocketEventType",()=>ms);ei(ti,"ServerMessageType",()=>Kt);var vs=(function(t){return t.Data="data",t.Media="media",t})({}),Ot=(function(t){return t.BrowserIncompatible="browser-incompatible",t.Disconnected="disconnected",t.InvalidID="invalid-id",t.InvalidKey="invalid-key",t.Network="network",t.PeerUnavailable="peer-unavailable",t.SslUnavailable="ssl-unavailable",t.ServerError="server-error",t.SocketError="socket-error",t.SocketClosed="socket-closed",t.UnavailableID="unavailable-id",t.WebRTC="webrtc",t})({}),yd=(function(t){return t.NegotiationFailed="negotiation-failed",t.ConnectionClosed="connection-closed",t})({}),Ih=(function(t){return t.NotOpenYet="not-open-yet",t.MessageToBig="message-too-big",t})({}),ac=(function(t){return t.Binary="binary",t.BinaryUTF8="binary-utf8",t.JSON="json",t.None="raw",t})({}),ms=(function(t){return t.Message="message",t.Disconnected="disconnected",t.Error="error",t.Close="close",t})({}),Kt=(function(t){return t.Heartbeat="HEARTBEAT",t.Candidate="CANDIDATE",t.Offer="OFFER",t.Answer="ANSWER",t.Open="OPEN",t.Error="ERROR",t.IdTaken="ID-TAKEN",t.InvalidKey="INVALID-KEY",t.Leave="LEAVE",t.Expire="EXPIRE",t})({});const Lv="1.5.5";class qL extends Ph.EventEmitter{constructor(e,n,r,s,i,o=5e3){super(),this.pingInterval=o,this._disconnected=!0,this._messagesQueue=[];const a=e?"wss://":"ws://";this._baseUrl=a+n+":"+r+s+"peerjs?key="+i}start(e,n){this._id=e;const r=`${this._baseUrl}&id=${e}&token=${n}`;this._socket||!this._disconnected||(this._socket=new WebSocket(r+"&version="+Lv),this._disconnected=!1,this._socket.onmessage=s=>{let i;try{i=JSON.parse(s.data),ve.log("Server message received:",i)}catch{ve.log("Invalid server message",s.data);return}this.emit(ms.Message,i)},this._socket.onclose=s=>{this._disconnected||(ve.log("Socket closed.",s),this._cleanup(),this._disconnected=!0,this.emit(ms.Disconnected))},this._socket.onopen=()=>{this._disconnected||(this._sendQueuedMessages(),ve.log("Socket open"),this._scheduleHeartbeat())})}_scheduleHeartbeat(){this._wsPingTimer=setTimeout(()=>{this._sendHeartbeat()},this.pingInterval)}_sendHeartbeat(){if(!this._wsOpen()){ve.log("Cannot send heartbeat, because socket closed");return}const e=JSON.stringify({type:Kt.Heartbeat});this._socket.send(e),this._scheduleHeartbeat()}_wsOpen(){return!!this._socket&&this._socket.readyState===1}_sendQueuedMessages(){const e=[...this._messagesQueue];this._messagesQueue=[];for(const n of e)this.send(n)}send(e){if(this._disconnected)return;if(!this._id){this._messagesQueue.push(e);return}if(!e.type){this.emit(ms.Error,"Invalid message");return}if(!this._wsOpen())return;const n=JSON.stringify(e);this._socket.send(n)}close(){this._disconnected||(this._cleanup(),this._disconnected=!0)}_cleanup(){this._socket&&(this._socket.onopen=this._socket.onmessage=this._socket.onclose=null,this._socket.close(),this._socket=void 0),clearTimeout(this._wsPingTimer)}}class $v{constructor(e){this.connection=e}startConnection(e){const n=this._startPeerConnection();if(this.connection.peerConnection=n,this.connection.type===vs.Media&&e._stream&&this._addTracksToConnection(e._stream,n),e.originator){const r=this.connection,s={ordered:!!e.reliable},i=n.createDataChannel(r.label,s);r._initializeDataChannel(i),this._makeOffer()}else this.handleSDP("OFFER",e.sdp)}_startPeerConnection(){ve.log("Creating RTCPeerConnection.");const e=new RTCPeerConnection(this.connection.provider.options.config);return this._setupListeners(e),e}_setupListeners(e){const n=this.connection.peer,r=this.connection.connectionId,s=this.connection.type,i=this.connection.provider;ve.log("Listening for ICE candidates."),e.onicecandidate=o=>{!o.candidate||!o.candidate.candidate||(ve.log(`Received ICE candidates for ${n}:`,o.candidate),i.socket.send({type:Kt.Candidate,payload:{candidate:o.candidate,type:s,connectionId:r},dst:n}))},e.oniceconnectionstatechange=()=>{switch(e.iceConnectionState){case"failed":ve.log("iceConnectionState is failed, closing connections to "+n),this.connection.emitError(yd.NegotiationFailed,"Negotiation of connection to "+n+" failed."),this.connection.close();break;case"closed":ve.log("iceConnectionState is closed, closing connections to "+n),this.connection.emitError(yd.ConnectionClosed,"Connection to "+n+" closed."),this.connection.close();break;case"disconnected":ve.log("iceConnectionState changed to disconnected on the connection with "+n);break;case"completed":e.onicecandidate=()=>{};break}this.connection.emit("iceStateChanged",e.iceConnectionState)},ve.log("Listening for data channel"),e.ondatachannel=o=>{ve.log("Received data channel");const a=o.channel;i.getConnection(n,r)._initializeDataChannel(a)},ve.log("Listening for remote stream"),e.ontrack=o=>{ve.log("Received remote stream");const a=o.streams[0],l=i.getConnection(n,r);if(l.type===vs.Media){const c=l;this._addStreamToMediaConnection(a,c)}}}cleanup(){ve.log("Cleaning up PeerConnection to "+this.connection.peer);const e=this.connection.peerConnection;if(!e)return;this.connection.peerConnection=null,e.onicecandidate=e.oniceconnectionstatechange=e.ondatachannel=e.ontrack=()=>{};const n=e.signalingState!=="closed";let r=!1;const s=this.connection.dataChannel;s&&(r=!!s.readyState&&s.readyState!=="closed"),(n||r)&&e.close()}async _makeOffer(){const e=this.connection.peerConnection,n=this.connection.provider;try{const r=await e.createOffer(this.connection.options.constraints);ve.log("Created offer."),this.connection.options.sdpTransform&&typeof this.connection.options.sdpTransform=="function"&&(r.sdp=this.connection.options.sdpTransform(r.sdp)||r.sdp);try{await e.setLocalDescription(r),ve.log("Set localDescription:",r,`for:${this.connection.peer}`);let s={sdp:r,type:this.connection.type,connectionId:this.connection.connectionId,metadata:this.connection.metadata};if(this.connection.type===vs.Data){const i=this.connection;s={...s,label:i.label,reliable:i.reliable,serialization:i.serialization}}n.socket.send({type:Kt.Offer,payload:s,dst:this.connection.peer})}catch(s){s!="OperationError: Failed to set local offer sdp: Called in wrong state: kHaveRemoteOffer"&&(n.emitError(Ot.WebRTC,s),ve.log("Failed to setLocalDescription, ",s))}}catch(r){n.emitError(Ot.WebRTC,r),ve.log("Failed to createOffer, ",r)}}async _makeAnswer(){const e=this.connection.peerConnection,n=this.connection.provider;try{const r=await e.createAnswer();ve.log("Created answer."),this.connection.options.sdpTransform&&typeof this.connection.options.sdpTransform=="function"&&(r.sdp=this.connection.options.sdpTransform(r.sdp)||r.sdp);try{await e.setLocalDescription(r),ve.log("Set localDescription:",r,`for:${this.connection.peer}`),n.socket.send({type:Kt.Answer,payload:{sdp:r,type:this.connection.type,connectionId:this.connection.connectionId},dst:this.connection.peer})}catch(s){n.emitError(Ot.WebRTC,s),ve.log("Failed to setLocalDescription, ",s)}}catch(r){n.emitError(Ot.WebRTC,r),ve.log("Failed to create answer, ",r)}}async handleSDP(e,n){n=new RTCSessionDescription(n);const r=this.connection.peerConnection,s=this.connection.provider;ve.log("Setting remote description",n);const i=this;try{await r.setRemoteDescription(n),ve.log(`Set remoteDescription:${e} for:${this.connection.peer}`),e==="OFFER"&&await i._makeAnswer()}catch(o){s.emitError(Ot.WebRTC,o),ve.log("Failed to setRemoteDescription, ",o)}}async handleCandidate(e){ve.log("handleCandidate:",e);try{await this.connection.peerConnection.addIceCandidate(e),ve.log(`Added ICE candidate for:${this.connection.peer}`)}catch(n){this.connection.provider.emitError(Ot.WebRTC,n),ve.log("Failed to handleCandidate, ",n)}}_addTracksToConnection(e,n){if(ve.log(`add tracks from stream ${e.id} to peer connection`),!n.addTrack)return ve.error("Your browser does't support RTCPeerConnection#addTrack. Ignored.");e.getTracks().forEach(r=>{n.addTrack(r,e)})}_addStreamToMediaConnection(e,n){ve.log(`add stream ${e.id} to media connection ${n.connectionId}`),n.addStream(e)}}class Dv extends Ph.EventEmitter{emitError(e,n){ve.error("Error:",n),this.emit("error",new ZL(`${e}`,n))}}class ZL extends Error{constructor(e,n){typeof n=="string"?super(n):(super(),Object.assign(this,n)),this.type=e}}class Nv extends Dv{get open(){return this._open}constructor(e,n,r){super(),this.peer=e,this.provider=n,this.options=r,this._open=!1,this.metadata=r.metadata}}class Cl extends Nv{static#e=this.ID_PREFIX="mc_";get type(){return vs.Media}get localStream(){return this._localStream}get remoteStream(){return this._remoteStream}constructor(e,n,r){super(e,n,r),this._localStream=this.options._stream,this.connectionId=this.options.connectionId||Cl.ID_PREFIX+yn.randomToken(),this._negotiator=new $v(this),this._localStream&&this._negotiator.startConnection({_stream:this._localStream,originator:!0})}_initializeDataChannel(e){this.dataChannel=e,this.dataChannel.onopen=()=>{ve.log(`DC#${this.connectionId} dc connection success`),this.emit("willCloseOnRemote")},this.dataChannel.onclose=()=>{ve.log(`DC#${this.connectionId} dc closed for:`,this.peer),this.close()}}addStream(e){ve.log("Receiving stream",e),this._remoteStream=e,super.emit("stream",e)}handleMessage(e){const n=e.type,r=e.payload;switch(e.type){case Kt.Answer:this._negotiator.handleSDP(n,r.sdp),this._open=!0;break;case Kt.Candidate:this._negotiator.handleCandidate(r.candidate);break;default:ve.warn(`Unrecognized message type:${n} from peer:${this.peer}`);break}}answer(e,n={}){if(this._localStream){ve.warn("Local stream already exists on this MediaConnection. Are you answering a call twice?");return}this._localStream=e,n&&n.sdpTransform&&(this.options.sdpTransform=n.sdpTransform),this._negotiator.startConnection({...this.options._payload,_stream:e});const r=this.provider._getMessages(this.connectionId);for(const s of r)this.handleMessage(s);this._open=!0}close(){this._negotiator&&(this._negotiator.cleanup(),this._negotiator=null),this._localStream=null,this._remoteStream=null,this.provider&&(this.provider._removeConnection(this),this.provider=null),this.options&&this.options._stream&&(this.options._stream=null),this.open&&(this._open=!1,super.emit("close"))}}class KL{constructor(e){this._options=e}_buildRequest(e){const n=this._options.secure?"https":"http",{host:r,port:s,path:i,key:o}=this._options,a=new URL(`${n}://${r}:${s}${i}${o}/${e}`);return a.searchParams.set("ts",`${Date.now()}${Math.random()}`),a.searchParams.set("version",Lv),fetch(a.href,{referrerPolicy:this._options.referrerPolicy})}async retrieveId(){try{const e=await this._buildRequest("id");if(e.status!==200)throw new Error(`Error. Status:${e.status}`);return e.text()}catch(e){ve.error("Error retrieving ID",e);let n="";throw this._options.path==="/"&&this._options.host!==yn.CLOUD_HOST&&(n=" If you passed in a `path` to your self-hosted PeerServer, you'll also need to pass in that same path when creating a new Peer."),new Error("Could not get an ID from the server."+n)}}async listAllPeers(){try{const e=await this._buildRequest("peers");if(e.status!==200){if(e.status===401){let n="";throw this._options.host===yn.CLOUD_HOST?n="It looks like you're using the cloud server. You can email team@peerjs.com to enable peer listing for your API key.":n="You need to enable `allow_discovery` on your self-hosted PeerServer to use this feature.",new Error("It doesn't look like you have permission to list peers IDs. "+n)}throw new Error(`Error. Status:${e.status}`)}return e.json()}catch(e){throw ve.error("Error retrieving list peers",e),new Error("Could not get list peers from the server."+e)}}}class Ml extends Nv{static#e=this.ID_PREFIX="dc_";static#t=this.MAX_BUFFERED_AMOUNT=8388608;get type(){return vs.Data}constructor(e,n,r){super(e,n,r),this.connectionId=this.options.connectionId||Ml.ID_PREFIX+Ov(),this.label=this.options.label||this.connectionId,this.reliable=!!this.options.reliable,this._negotiator=new $v(this),this._negotiator.startConnection(this.options._payload||{originator:!0,reliable:this.reliable})}_initializeDataChannel(e){this.dataChannel=e,this.dataChannel.onopen=()=>{ve.log(`DC#${this.connectionId} dc connection success`),this._open=!0,this.emit("open")},this.dataChannel.onmessage=n=>{ve.log(`DC#${this.connectionId} dc onmessage:`,n.data)},this.dataChannel.onclose=()=>{ve.log(`DC#${this.connectionId} dc closed for:`,this.peer),this.close()}}close(e){if(e?.flush){this.send({__peerData:{type:"close"}});return}this._negotiator&&(this._negotiator.cleanup(),this._negotiator=null),this.provider&&(this.provider._removeConnection(this),this.provider=null),this.dataChannel&&(this.dataChannel.onopen=null,this.dataChannel.onmessage=null,this.dataChannel.onclose=null,this.dataChannel=null),this.open&&(this._open=!1,super.emit("close"))}send(e,n=!1){if(!this.open){this.emitError(Ih.NotOpenYet,"Connection is not open. You should listen for the `open` event before sending messages.");return}return this._send(e,n)}async handleMessage(e){const n=e.payload;switch(e.type){case Kt.Answer:await this._negotiator.handleSDP(e.type,n.sdp);break;case Kt.Candidate:await this._negotiator.handleCandidate(n.candidate);break;default:ve.warn("Unrecognized message type:",e.type,"from peer:",this.peer);break}}}class Oh extends Ml{get bufferSize(){return this._bufferSize}_initializeDataChannel(e){super._initializeDataChannel(e),this.dataChannel.binaryType="arraybuffer",this.dataChannel.addEventListener("message",n=>this._handleDataMessage(n))}_bufferedSend(e){(this._buffering||!this._trySend(e))&&(this._buffer.push(e),this._bufferSize=this._buffer.length)}_trySend(e){if(!this.open)return!1;if(this.dataChannel.bufferedAmount>Ml.MAX_BUFFERED_AMOUNT)return this._buffering=!0,setTimeout(()=>{this._buffering=!1,this._tryBuffer()},50),!1;try{this.dataChannel.send(e)}catch(n){return ve.error(`DC#:${this.connectionId} Error when sending:`,n),this._buffering=!0,this.close(),!1}return!0}_tryBuffer(){if(!this.open||this._buffer.length===0)return;const e=this._buffer[0];this._trySend(e)&&(this._buffer.shift(),this._bufferSize=this._buffer.length,this._tryBuffer())}close(e){if(e?.flush){this.send({__peerData:{type:"close"}});return}this._buffer=[],this._bufferSize=0,super.close()}constructor(...e){super(...e),this._buffer=[],this._bufferSize=0,this._buffering=!1}}class bu extends Oh{close(e){super.close(e),this._chunkedData={}}constructor(e,n,r){super(e,n,r),this.chunker=new Iv,this.serialization=ac.Binary,this._chunkedData={}}_handleDataMessage({data:e}){const n=Jb(e),r=n.__peerData;if(r){if(r.type==="close"){this.close();return}this._handleChunk(n);return}this.emit("data",n)}_handleChunk(e){const n=e.__peerData,r=this._chunkedData[n]||{data:[],count:0,total:e.total};if(r.data[e.n]=new Uint8Array(e.data),r.count++,this._chunkedData[n]=r,r.total===r.count){delete this._chunkedData[n];const s=HL(r.data);this._handleDataMessage({data:s})}}_send(e,n){const r=Qb(e);if(r instanceof Promise)return this._send_blob(r);if(!n&&r.byteLength>this.chunker.chunkedMTU){this._sendChunks(r);return}this._bufferedSend(r)}async _send_blob(e){const n=await e;if(n.byteLength>this.chunker.chunkedMTU){this._sendChunks(n);return}this._bufferedSend(n)}_sendChunks(e){const n=this.chunker.chunk(e);ve.log(`DC#${this.connectionId} Try to send ${n.length} chunks...`);for(const r of n)this.send(r,!0)}}class JL extends Oh{_handleDataMessage({data:e}){super.emit("data",e)}_send(e,n){this._bufferedSend(e)}constructor(...e){super(...e),this.serialization=ac.None}}class QL extends Oh{_handleDataMessage({data:e}){const n=this.parse(this.decoder.decode(e)),r=n.__peerData;if(r&&r.type==="close"){this.close();return}this.emit("data",n)}_send(e,n){const r=this.encoder.encode(this.stringify(e));if(r.byteLength>=yn.chunkedMTU){this.emitError(Ih.MessageToBig,"Message too big for JSON channel");return}this._bufferedSend(r)}constructor(...e){super(...e),this.serialization=ac.JSON,this.encoder=new TextEncoder,this.decoder=new TextDecoder,this.stringify=JSON.stringify,this.parse=JSON.parse}}class zh extends Dv{static#e=this.DEFAULT_KEY="peerjs";get id(){return this._id}get options(){return this._options}get open(){return this._open}get socket(){return this._socket}get connections(){const e=Object.create(null);for(const[n,r]of this._connections)e[n]=r;return e}get destroyed(){return this._destroyed}get disconnected(){return this._disconnected}constructor(e,n){super(),this._serializers={raw:JL,json:QL,binary:bu,"binary-utf8":bu,default:bu},this._id=null,this._lastServerId=null,this._destroyed=!1,this._disconnected=!1,this._open=!1,this._connections=new Map,this._lostMessages=new Map;let r;if(e&&e.constructor==Object?n=e:e&&(r=e.toString()),n={debug:0,host:yn.CLOUD_HOST,port:yn.CLOUD_PORT,path:"/",key:zh.DEFAULT_KEY,token:yn.randomToken(),config:yn.defaultConfig,referrerPolicy:"strict-origin-when-cross-origin",serializers:{},...n},this._options=n,this._serializers={...this._serializers,...this.options.serializers},this._options.host==="/"&&(this._options.host=window.location.hostname),this._options.path&&(this._options.path[0]!=="/"&&(this._options.path="/"+this._options.path),this._options.path[this._options.path.length-1]!=="/"&&(this._options.path+="/")),this._options.secure===void 0&&this._options.host!==yn.CLOUD_HOST?this._options.secure=yn.isSecure():this._options.host==yn.CLOUD_HOST&&(this._options.secure=!0),this._options.logFunction&&ve.setLogFunction(this._options.logFunction),ve.logLevel=this._options.debug||0,this._api=new KL(n),this._socket=this._createServerConnection(),!yn.supports.audioVideo&&!yn.supports.data){this._delayedAbort(Ot.BrowserIncompatible,"The current browser does not support WebRTC");return}if(r&&!yn.validateId(r)){this._delayedAbort(Ot.InvalidID,`ID "${r}" is invalid`);return}r?this._initialize(r):this._api.retrieveId().then(s=>this._initialize(s)).catch(s=>this._abort(Ot.ServerError,s))}_createServerConnection(){const e=new qL(this._options.secure,this._options.host,this._options.port,this._options.path,this._options.key,this._options.pingInterval);return e.on(ms.Message,n=>{this._handleMessage(n)}),e.on(ms.Error,n=>{this._abort(Ot.SocketError,n)}),e.on(ms.Disconnected,()=>{this.disconnected||(this.emitError(Ot.Network,"Lost connection to server."),this.disconnect())}),e.on(ms.Close,()=>{this.disconnected||this._abort(Ot.SocketClosed,"Underlying socket is already closed.")}),e}_initialize(e){this._id=e,this.socket.start(e,this._options.token)}_handleMessage(e){const n=e.type,r=e.payload,s=e.src;switch(n){case Kt.Open:this._lastServerId=this.id,this._open=!0,this.emit("open",this.id);break;case Kt.Error:this._abort(Ot.ServerError,r.msg);break;case Kt.IdTaken:this._abort(Ot.UnavailableID,`ID "${this.id}" is taken`);break;case Kt.InvalidKey:this._abort(Ot.InvalidKey,`API KEY "${this._options.key}" is invalid`);break;case Kt.Leave:ve.log(`Received leave message from ${s}`),this._cleanupPeer(s),this._connections.delete(s);break;case Kt.Expire:this.emitError(Ot.PeerUnavailable,`Could not connect to peer ${s}`);break;case Kt.Offer:{const i=r.connectionId;let o=this.getConnection(s,i);if(o&&(o.close(),ve.warn(`Offer received for existing Connection ID:${i}`)),r.type===vs.Media){const l=new Cl(s,this,{connectionId:i,_payload:r,metadata:r.metadata});o=l,this._addConnection(s,o),this.emit("call",l)}else if(r.type===vs.Data){const l=new this._serializers[r.serialization](s,this,{connectionId:i,_payload:r,metadata:r.metadata,label:r.label,serialization:r.serialization,reliable:r.reliable});o=l,this._addConnection(s,o),this.emit("connection",l)}else{ve.warn(`Received malformed connection type:${r.type}`);return}const a=this._getMessages(i);for(const l of a)o.handleMessage(l);break}default:{if(!r){ve.warn(`You received a malformed message from ${s} of type ${n}`);return}const i=r.connectionId,o=this.getConnection(s,i);o&&o.peerConnection?o.handleMessage(e):i?this._storeMessage(i,e):ve.warn("You received an unrecognized message:",e);break}}}_storeMessage(e,n){this._lostMessages.has(e)||this._lostMessages.set(e,[]),this._lostMessages.get(e).push(n)}_getMessages(e){const n=this._lostMessages.get(e);return n?(this._lostMessages.delete(e),n):[]}connect(e,n={}){if(n={serialization:"default",...n},this.disconnected){ve.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect, or call reconnect on this peer if you believe its ID to still be available."),this.emitError(Ot.Disconnected,"Cannot connect to new Peer after disconnecting from server.");return}const r=new this._serializers[n.serialization](e,this,n);return this._addConnection(e,r),r}call(e,n,r={}){if(this.disconnected){ve.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect."),this.emitError(Ot.Disconnected,"Cannot connect to new Peer after disconnecting from server.");return}if(!n){ve.error("To call a peer, you must provide a stream from your browser's `getUserMedia`.");return}const s=new Cl(e,this,{...r,_stream:n});return this._addConnection(e,s),s}_addConnection(e,n){ve.log(`add connection ${n.type}:${n.connectionId} to peerId:${e}`),this._connections.has(e)||this._connections.set(e,[]),this._connections.get(e).push(n)}_removeConnection(e){const n=this._connections.get(e.peer);if(n){const r=n.indexOf(e);r!==-1&&n.splice(r,1)}this._lostMessages.delete(e.connectionId)}getConnection(e,n){const r=this._connections.get(e);if(!r)return null;for(const s of r)if(s.connectionId===n)return s;return null}_delayedAbort(e,n){setTimeout(()=>{this._abort(e,n)},0)}_abort(e,n){ve.error("Aborting!"),this.emitError(e,n),this._lastServerId?this.disconnect():this.destroy()}destroy(){this.destroyed||(ve.log(`Destroy peer with ID:${this.id}`),this.disconnect(),this._cleanup(),this._destroyed=!0,this.emit("close"))}_cleanup(){for(const e of this._connections.keys())this._cleanupPeer(e),this._connections.delete(e);this.socket.removeAllListeners()}_cleanupPeer(e){const n=this._connections.get(e);if(n)for(const r of n)r.close()}disconnect(){if(this.disconnected)return;const e=this.id;ve.log(`Disconnect peer with ID:${e}`),this._disconnected=!0,this._open=!1,this.socket.close(),this._lastServerId=e,this._id=null,this.emit("disconnected",e)}reconnect(){if(this.disconnected&&!this.destroyed)ve.log(`Attempting reconnection to server with ID ${this._lastServerId}`),this._disconnected=!1,this._initialize(this._lastServerId);else{if(this.destroyed)throw new Error("This peer cannot reconnect to the server. It has already been destroyed.");if(!this.disconnected&&!this.open)ve.error("In a hurry? We're still trying to make the initial connection!");else throw new Error(`Peer ${this.id} cannot reconnect because it is not disconnected from the server!`)}}listAllPeers(e=n=>{}){this._api.listAllPeers().then(n=>e(n)).catch(n=>this._abort(Ot.ServerError,n))}}var e$=zh;const t$=[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}],n$=new Set(["server-error","network","ssl-unavailable","browser-incompatible"]),Zm=t=>{const e=[];let n=!1;return t.on("open",()=>{n=!0}),t.on("error",r=>{for(const s of[...e])s(r)}),{on(r,s){return r==="connect"?n?queueMicrotask(()=>s()):t.on("open",s):r==="error"?e.push(s):t.on(r,s),this},send(r){t.send(r)},destroy(){t.close()},fail(r){for(const s of[...e])s(new Error(r))}}},r$=({selfDid:t})=>{const e=[],n=[],r=[];let s;const i=new Map,o=()=>{const l=Math.random().toString(36).slice(2,6);return`bms-${qb(t)}-${l}`},a=l=>{s?.destroy(),s=new e$(l,{debug:0,config:{iceServers:t$}}),s.on("open",c=>{for(const u of e)u(c)}),s.on("connection",c=>{const u=c.metadata;for(const d of n)d({joinCode:c.peer,did:u?.did},Zm(c))}),s.on("error",c=>{if(c.type==="unavailable-id"){a(o());return}if(c.type==="peer-unavailable"){const u=c.message.match(/connect to peer (\S+)/)?.[1],d=u!==void 0?i.get(u):void 0;d!==void 0&&d.fail(c.message);return}if(n$.has(c.type))for(const u of r)u(c)})};return a(o()),{onOpen(l){e.push(l)},onConnection(l){n.push(l)},onError(l){r.push(l)},connect(l,c){if(s===void 0)throw new Error("signaling not started");const u=s.connect(l,{metadata:c}),d=Zm(u);return i.set(l,d),d},destroy(){i.clear(),s?.destroy(),s=void 0}}},Km={ArrowUp:[0,1],ArrowDown:[0,-1],ArrowLeft:[-1,0],ArrowRight:[1,0],KeyW:[0,1],KeyS:[0,-1],KeyA:[-1,0],KeyD:[1,0]},s$=.02,i$=6,o$=120,a$=500,Jm=60,l$=()=>{const t={keyMoveX:0,keyMoveY:0,touchMoveX:0,touchMoveY:0,jumpQueued:!1,jumpHeld:!1,lookDx:0,lookDy:0,primaryQueued:!1,clickQueued:!1,tapQueued:!1,secondaryQueued:!1,secondaryHeld:!1,secondaryReleasedQueued:!1,useQueued:!1,selectQueued:null,wheelQueued:0,wheelLastEventAt:-1/0,wheelPendingTimer:void 0};let e=null;const n=(o,a)=>{t.lookDx+=o,t.lookDy+=a};let r=!1;const s={onPointerDown:async o=>{if(o.pointerType==="mouse"&&document.pointerLockElement!==o.currentTarget){await o.currentTarget.requestPointerLock();return}if(o.pointerType==="mouse"){o.button===0?(t.primaryQueued=!0,t.clickQueued=!0):o.button===2&&(t.secondaryQueued=!0,t.secondaryHeld=!0);return}if(r)return;r=!0;const a=Math.max(i$,o.currentTarget.clientWidth*s$);let l=!1,c=!1,u,d;const h=()=>{u!==void 0&&(window.clearTimeout(u),u=void 0),d!==void 0&&(window.clearInterval(d),d=void 0)},f=()=>{c=!0,o.button===0&&(t.primaryQueued=!0)};u=window.setTimeout(()=>{f(),d=window.setInterval(()=>{l||f()},a$)},o$);const m=await hh(o,({delta:p,totalDelta:y})=>{n(p.x,p.y),!l&&Math.hypot(y.x,y.y)>a&&(l=!0,h())});r=!1,h(),!l&&m.event.type!=="pointercancel"&&(c||o.button===0&&(t.tapQueued=!0))},onMouseMove:o=>{document.pointerLockElement===o.currentTarget&&n(o.movementX,o.movementY)},onPointerUp:o=>{o.pointerType==="mouse"&&o.button===2&&t.secondaryHeld&&(t.secondaryHeld=!1,t.secondaryReleasedQueued=!0)},onWheel:o=>{if(Ua(o))return;o.preventDefault();const a=o.deltaY<0?-1:o.deltaY>0?1:0;if(a===0)return;const l=Date.now(),c=l-t.wheelLastEventAt;t.wheelLastEventAt=l,t.wheelPendingTimer!==void 0&&(window.clearTimeout(t.wheelPendingTimer),t.wheelPendingTimer=void 0),!(c<Jm)&&(t.wheelPendingTimer=window.setTimeout(()=>{t.wheelQueued=a,t.wheelPendingTimer=void 0},Jm))}},i=()=>{if(e)return;e=new AbortController;const{signal:o}=e;window.addEventListener("keydown",a=>{if(Ua(a))return;if(a.code==="Space"){a.preventDefault(),t.jumpQueued=!0,t.jumpHeld=!0;return}if(a.code==="KeyE"){a.repeat||(t.useQueued=!0);return}if(a.code.startsWith("Digit")){const c=Number(a.code.slice(5));c>=1&&c<=9&&(t.selectQueued=c-1);return}const l=Km[a.code];l===void 0||a.repeat||(a.preventDefault(),t.keyMoveX+=l[0],t.keyMoveY+=l[1])},{signal:o}),window.addEventListener("keyup",a=>{if(Ua(a))return;if(a.code==="Space"){t.jumpHeld=!1;return}const l=Km[a.code];l!==void 0&&(a.preventDefault(),t.keyMoveX-=l[0],t.keyMoveY-=l[1])},{signal:o}),window.addEventListener("contextmenu",a=>a.preventDefault(),{signal:o})};return i(),{install:i,addLookDelta:n,canvasHandlers:s,dispose(){e?.abort(),e=null,t.wheelPendingTimer!==void 0&&(window.clearTimeout(t.wheelPendingTimer),t.wheelPendingTimer=void 0)},consume(){const o={moveX:Xs(t.keyMoveX+t.touchMoveX,-1,1),moveY:Xs(t.keyMoveY+t.touchMoveY,-1,1),jump:t.jumpQueued,jumpHeld:t.jumpHeld,lookDx:t.lookDx,lookDy:t.lookDy,primary:t.primaryQueued,click:t.clickQueued,tap:t.tapQueued,secondary:t.secondaryQueued,secondaryHeld:t.secondaryHeld,secondaryReleased:t.secondaryReleasedQueued,use:t.useQueued,select:t.selectQueued,wheel:t.wheelQueued};return t.jumpQueued=!1,t.lookDx=0,t.lookDy=0,t.primaryQueued=!1,t.clickQueued=!1,t.tapQueued=!1,t.secondaryQueued=!1,t.secondaryReleasedQueued=!1,t.useQueued=!1,t.selectQueued=null,t.wheelQueued=0,o},queuePrimary(){t.primaryQueued=!0},queueSecondary(){t.secondaryQueued=!0},queueUse(){t.useQueued=!0},queueSelect(o){t.selectQueued=o},queueJump(){t.jumpQueued=!0},setTouchMove(o,a){t.touchMoveX=o,t.touchMoveY=a},setTouchJump(o){t.jumpHeld=o},setTouchSecondary(o){o?(t.secondaryQueued=!0,t.secondaryHeld=!0):t.secondaryHeld&&(t.secondaryHeld=!1,t.secondaryReleasedQueued=!0)}}},Rl={halfSize:1,speed:22.5,acceleration:150,gravity:45,jumpSpeed:14,swimSpeed:10,climbSpeed:10,lookSensitivity:.0025,maxPitch:1.35,followBack:9,followUp:2.5,eyeHeight:.9,stepHeight:2,collisionRadius:.6},c$=(t,e,n,r={})=>({position:new gt(t,e,n),yaw:0,pitch:0,vx:0,vz:0,vy:0,onGround:!1,flying:!1,noclip:!1,config:{...Rl,...r}}),Oi=(t,e,n)=>{const r=e-t;return Math.abs(r)<=n?e:t+Math.sign(r)*n},Fv=[[0,0],[1,0],[-1,0],[0,1],[0,-1]],u$=(t,e,n,r,s)=>{const i=r+t.stepHeight;let o=-1/0,a=1/0;for(const[l,c]of Fv){const u=e(n+l*t.collisionRadius,r,s+c*t.collisionRadius);if(!Number.isFinite(u)||u>i)continue;const d=Math.abs(u-r);d<a&&(a=d,o=u)}return o},d$=(t,e,n,r,s)=>{const i=r+t.stepHeight;let o=-1/0;for(const[a,l]of Fv){const c=e(n+a*t.collisionRadius,r,s+l*t.collisionRadius);Number.isFinite(c)&&c<=i&&c>o&&(o=c)}return o},h$=[[1,1],[1,-1],[-1,1],[-1,-1]],Bv=6,bd=.001,zi=(t,e,n,r,s)=>{const i=r-t.halfSize+bd,o=r+t.halfSize-bd;for(const[a,l]of h$){const c=n+a*t.collisionRadius,u=s+l*t.collisionRadius;if(e(c,i,u)||e(c,o,u))return!0}return!1},Qm=(t,e,n,r)=>{if(r===0)return!1;const s=t.config,i=t.position[n];t.position[n]=Math.max(-e.halfExtent,Math.min(e.halfExtent,i+r));const{x:o,y:a,z:l}=t.position;if(!zi(s,e.solidAt,o,a,l))return!1;const c=d$(s,e.groundHeightAt,o,a-s.halfSize,l),u=c+s.halfSize;if(Number.isFinite(c)&&u>a&&!zi(s,e.solidAt,o,u,l))return t.position.y=u,!1;let d=i,h=t.position[n];for(let f=0;f<Bv;f++){const m=(d+h)/2;t.position[n]=m,zi(s,e.solidAt,t.position.x,a,t.position.z)?h=m:d=m}return t.position[n]=d,!0},vu=(t,e,n,r)=>{if(r===0)return!1;const s=t.config,i=t.position[n];if(t.position[n]=Math.max(-e.halfExtent,Math.min(e.halfExtent,i+r)),!zi(s,e.solidAt,t.position.x,t.position.y,t.position.z))return!1;let o=i,a=t.position[n];for(let l=0;l<Bv;l++){const c=(o+a)/2;t.position[n]=c,zi(s,e.solidAt,t.position.x,t.position.y,t.position.z)?a=c:o=c}return t.position[n]=o,!0},Uv=(t,e,n)=>{const r=t.config,[s,i,o]=Pl(t),a=-Math.cos(t.yaw),l=Math.sin(t.yaw);let c=0,u=0,d=0;if(e.moveX!==0||e.moveY!==0){const f=Math.hypot(e.moveX,e.moveY),m=e.moveX/f,p=e.moveY/f;c=(s*p+a*m)*r.speed,u=i*p*r.speed,d=(o*p+l*m)*r.speed}const h=r.acceleration*n;t.vx=Oi(t.vx,c,h),t.vy=Oi(t.vy,u,h),t.vz=Oi(t.vz,d,h)},f$=(t,e,n,r)=>{Uv(t,e,r),vu(t,n,"x",t.vx*r),vu(t,n,"y",t.vy*r),vu(t,n,"z",t.vz*r),t.onGround=!1},p$=(t,e,n,r)=>{Uv(t,e,r),t.position.x=Math.max(-n.halfExtent,Math.min(n.halfExtent,t.position.x+t.vx*r)),t.position.y=Math.max(-n.halfExtent,Math.min(n.halfExtent,t.position.y+t.vy*r)),t.position.z=Math.max(-n.halfExtent,Math.min(n.halfExtent,t.position.z+t.vz*r)),t.onGround=!1},m$=(t,e,n,r)=>{const s=t.config;if(t.yaw-=n.lookDx*s.lookSensitivity,t.pitch=Math.max(-s.maxPitch,Math.min(s.maxPitch,t.pitch-n.lookDy*s.lookSensitivity)),t.noclip){p$(t,n,r,e);return}if(t.flying){f$(t,n,r,e);return}const i=Math.sin(t.yaw),o=Math.cos(t.yaw),a=i,l=o,c=-o,u=i,d=n.moveX,h=n.moveY,f=r.mediumAt?.(t.position.x,t.position.y,t.position.z)??null;let m=0,p=0;if(d!==0||h!==0){const O=Math.hypot(d,h),S=d/O,z=h/O;m=(a*z+c*S)*s.speed,p=(l*z+u*S)*s.speed}f!==null&&(f.speedScale!==1&&(m*=f.speedScale,p*=f.speedScale),(f.pushVx!==0||f.pushVz!==0)&&(m+=f.pushVx,p+=f.pushVz));const y=s.acceleration*e;t.vx=Oi(t.vx,m,y),t.vz=Oi(t.vz,p,y);const g=t.vx*e,b=t.vz*e,v=r.inWaterAt(t.position.x,t.position.y-s.halfSize+bd,t.position.z);v?(t.vy-=s.gravity*.15*e,n.jumpHeld?t.vy=s.swimSpeed:t.vy*=Math.max(0,1-3*e)):(t.vy-=s.gravity*e,f!==null&&(f.pushVy!==null&&(t.vy=Oi(t.vy,f.pushVy,y)),f.sink>0&&(t.vy=Math.max(t.vy,-f.sink)))),!v&&t.onGround&&n.jump&&(t.vy=s.jumpSpeed);const x=Qm(t,r,"x",g),k=Qm(t,r,"z",b),C=x||k;if(t.onGround&&r.surfaceVelocityAt!==void 0){const O=r.surfaceVelocityAt(t.position.x,t.position.y-s.halfSize,t.position.z);O!==null&&(t.position.x+=O[0]*e,t.position.y+=O[1]*e,t.position.z+=O[2]*e)}C&&n.jumpHeld&&!v&&(t.vy=Math.max(t.vy,s.climbSpeed));const E=t.position.y-s.halfSize,T=t.position.y+t.vy*e;t.vy>0&&zi(s,r.solidAt,t.position.x,T,t.position.z)?t.vy=0:t.position.y=T;const A=u$(s,r.groundHeightAt,t.position.x,E,t.position.z);if(!Number.isFinite(A)){t.position.y=E+s.halfSize,t.vy=0,t.onGround=!0;return}const M=A+s.halfSize;t.position.y<=M?(t.position.y=M,t.vy<0&&(t.vy=0),t.onGround=!0):t.onGround=!1},Pl=t=>{const e=Math.cos(t.pitch);return[e*Math.sin(t.yaw),Math.sin(t.pitch),e*Math.cos(t.yaw)]},eg=(t,e,n=!0)=>{const r=e.config;if(n){t.position.set(e.position.x,e.position.y+r.eyeHeight,e.position.z);const[a,l,c]=Pl(e);t.lookAt(t.position.x+a,t.position.y+l,t.position.z+c);return}const s=Math.sin(e.yaw),i=Math.cos(e.yaw);t.position.set(e.position.x-s*r.followBack,e.position.y+r.followUp,e.position.z-i*r.followBack);const o=e.position.y+Math.sin(e.pitch)*3;t.lookAt(e.position.x,o,e.position.z)},g$=(t,e)=>{const n=Math.max(0,Math.min(1,t)),r=-Math.PI/2*n,s=Math.sin(r),i=Math.cos(r),o=Math.sin(e.yaw),a=Math.cos(e.yaw),l=e.config.eyeHeight,c=e.position.y-e.config.halfSize;return{position:[e.position.x+l*s*o,c+l*i,e.position.z+l*s*a],pitch:e.pitch+Math.PI/2*n}},y$=1e6,b$=16740419,v$=({camera:t,terrain:e,spawn:n,player:r})=>{let s=!0,i=!1;const o={...Rl,...r},a=c$(n[0],e.heightAt(n[0],n[2])+o.halfSize+.1,n[2],o),l={groundHeightAt:(h,f,m)=>e.groundHeightAt(h,f,m),inWaterAt:(h,f,m)=>e.inWaterAt(h,f,m),solidAt:(h,f,m)=>e.solidAt(h,f,m),halfExtent:y$,...e.surfaceVelocityAt!==void 0?{surfaceVelocityAt:e.surfaceVelocityAt}:{},...e.mediumAt!==void 0?{mediumAt:e.mediumAt}:{}},c=Zb(b$),u=new xn(new Gi(a.config.halfSize*2,a.config.halfSize*2,a.config.halfSize*2),c.material);u.position.copy(a.position),u.visible=i;const d=new Jn;return d.add(u),eg(t,a,s),{body:d,player:a,move(h,f){m$(a,h,f,l)},place(){u.position.copy(a.position),u.rotation.y=a.yaw,u.visible=i,eg(t,a,s)},placeDeath(h){if(s){const f=g$(h,a);t.position.set(f.position[0],f.position[1],f.position[2]);const[m,p,y]=Pl({...a,pitch:f.pitch});t.lookAt(f.position[0]+m,f.position[1]+p,f.position[2]+y)}else{const f=Math.max(0,Math.min(1,h)),m=-Math.PI/2*f,p=Math.sin(m),y=Math.cos(m),g=Math.sin(a.yaw),b=Math.cos(a.yaw),v=a.config.halfSize;u.rotation.set(m,a.yaw,0),u.position.set(a.position.x+v*p*g,a.position.y-v+v*y,a.position.z+v*p*b)}},look(){const h=t.position,[f,m,p]=Pl(a);return{origin:[h.x,h.y,h.z],direction:[f,m,p]}},occupiedVoxels(){const h=a.config.halfSize,f=k=>[Math.floor((k-h)/ft),Math.floor((k+h)/ft)],[m,p]=f(a.position.x),[y,g]=f(a.position.y),[b,v]=f(a.position.z),x=[];for(let k=m;k<=p;k++)for(let C=y;C<=g;C++)for(let E=b;E<=v;E++)x.push([k,C,E]);return x},setFirstPerson(h){s=h},get firstPerson(){return s},setCubeVisible(h){i=h},setPicture(h){c.setPicture(h)}}},Hv=.001,Lh=(t,e,n)=>{const r=t.yaw??0;if(r===0)return e>=t.minX&&e<=t.maxX&&n>=t.minZ&&n<=t.maxZ;const s=(t.maxX-t.minX)/2,i=(t.maxZ-t.minZ)/2,o=e-(t.minX+t.maxX)/2,a=n-(t.minZ+t.maxZ)/2,l=Math.cos(r),c=Math.sin(r);return Math.abs(o*l-a*c)<=s&&Math.abs(o*c+a*l)<=i},w$=(t,e,n,r)=>n>=t.minY&&n<=t.maxY&&Lh(t,e,r),_$=(t,e,n,r)=>t.some(s=>w$(s,e,n,r)),x$=(t,e,n,r)=>{let s=-1/0;for(const i of t)Lh(i,e,r)&&i.maxY<=n+Hv&&i.maxY>s&&(s=i.maxY);return s},k$=(t,e,n,r)=>{let s=null,i=-1/0;for(const o of t)Lh(o,e,r)&&o.maxY<=n+Hv&&o.maxY>i&&(i=o.maxY,s=o);return s===null?null:[s.vx??0,s.vy??0,s.vz??0]},jv=9,tg=(t,e)=>{for(let n=0;n<t.length;n++){const{min:r,max:s}=Zs(t[n].center);if(e[0]>=r[0]&&e[0]<=s[0]&&e[1]>=r[1]&&e[1]<=s[1]&&e[2]>=r[2]&&e[2]<=s[2]){const i=ks(t[n].store,t[n].center,e);return t[n].store.get(i[0],i[1],i[2])}}return xe},S$=(t,e,n,r=jv)=>{const s=[e[0]/ft,e[1]/ft,e[2]/ft];let i=Math.floor(s[0]),o=Math.floor(s[1]),a=Math.floor(s[2]);const l=n[0]>0?1:n[0]<0?-1:0,c=n[1]>0?1:n[1]<0?-1:0,u=n[2]>0?1:n[2]<0?-1:0,d=l===0?1/0:Math.abs(1/n[0]),h=c===0?1/0:Math.abs(1/n[1]),f=u===0?1/0:Math.abs(1/n[2]);let m=l===0?1/0:l>0?(i+1-s[0])*d:(s[0]-i)*d,p=c===0?1/0:c>0?(o+1-s[1])*h:(s[1]-o)*h,y=u===0?1/0:u>0?(a+1-s[2])*f:(s[2]-a)*f;const g=r/ft;let b=null,v=0,x=0;const k=Math.ceil(g)+8;for(;tg(t,[i,o,a])!==xe&&x++<k;)if(m<p&&m<y?(v=m,i+=l,m+=d):p<y?(v=p,o+=c,p+=h):(v=y,a+=u,y+=f),v>g)return{target:null,place:b,distance:1/0};for(;;){const C=[i,o,a];if(tg(t,C)!==xe)return{target:C,place:b,distance:v*ft};if(b=C,m<p&&m<y?(v=m,i+=l,m+=d):p<y?(v=p,o+=c,p+=h):(v=y,a+=u,y+=f),v>g)return{target:null,place:b,distance:1/0}}};class ro{ctx;item;voxel;constructor(e,n,r){this.ctx=e,this.item=n,this.voxel=r}pick(){const e=this.ctx.editing.pick();return{primary:e.target===null?null:{kind:"voxel",voxel:e.target,distance:e.distance},secondary:e.place}}primary(e){return this.ctx.editing.breakBlock(ng(e.primary))}secondary(e){return this.ctx.editing.placeBlock(this.item,this.voxel,ng(e.primary),e.secondary)}update(){}pose(){return null}stow(){}}const ng=t=>t!==null&&t.kind==="voxel"?t.voxel:null,E$={x:-5.6/24,y:-6/24},A$={x:Math.sqrt(.5),y:Math.sqrt(.5),z:0},T$=Math.PI/4,Wv=t=>1-(1-t)*(1-t),Vv=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,Co=(t,e,n)=>{const r=Xs(n,0,1),s=t.handle??e.handle,i={x:t.x+(e.x-t.x)*r,y:t.y+(e.y-t.y)*r,z:t.z+(e.z-t.z)*r,roll:t.roll+(e.roll-t.roll)*r};return s!==void 0&&(i.handle=s),i},C$=(t,e)=>{const n=xo.fromAxisAngle(A$,T$),r=xo.fromAxisAngle({x:0,y:0,z:1},t.roll),s=xo.multiply(r,n),i=t.handle??E$,o={x:i.x*e,y:i.y*e,z:0},a=Et.rotateQuaternion(o,s);return{position:{x:t.x-a.x,y:t.y-a.y,z:t.z-a.z},rotation:s}},M$=jv*.6,R$=8,wu={x:.45,y:-.35,z:-.85,roll:0},P$={x:.62,y:-.48,z:-1.05,roll:35*Math.PI/180},rg={x:.38,y:-.18,z:-.68,roll:-50*Math.PI/180},sg=.22,ig=.28,I$=.16,O$=(t,e,n)=>{switch(t){case"idle":return Co(wu,P$,n);case"swing":return Co(wu,rg,Wv(Xs(e,0,1)));case"recover":return Co(rg,wu,Vv(Xs(e,0,1)))}},z$=(t,e)=>t===null?e:e===null||t.distance<=e.distance?t:e;class L${ctx;state="idle";stateTime=0;guard=0;guarding=!1;constructor(e){this.ctx=e}pick(){const{origin:e,direction:n}=this.ctx.look(),r=this.ctx.editing.pick(),s=jb(e,n,this.ctx.strikeables(),M$);return{primary:z$(s===null?null:{kind:"actor",id:s.id,distance:s.distance},r.target===null?null:{kind:"voxel",voxel:r.target,distance:r.distance}),secondary:null}}primary(e){this.state="swing",this.stateTime=0;const n=e.primary;if(n===null)return null;if(n.kind==="voxel")return this.ctx.editing.breakBlock(n.voxel);const r=this.ctx.position();return this.ctx.strike(n.id,R$,r.x,r.z),null}secondary(){return null}update(e,n){this.state!=="idle"&&(this.stateTime+=e,this.state==="swing"&&this.stateTime>=sg?(this.state="recover",this.stateTime=0):this.state==="recover"&&this.stateTime>=ig&&(this.state="idle",this.stateTime=0)),this.raiseGuard(n.secondaryHeld&&this.state==="idle"),this.guard=Xs(this.guard+(this.guarding?e:-e)/I$,0,1)}pose(){const e=this.state==="swing"?this.stateTime/sg:this.state==="recover"?this.stateTime/ig:0;return O$(this.state,e,this.guard)}stow(){this.state="idle",this.stateTime=0,this.guard=0,this.raiseGuard(!1)}raiseGuard(e){e!==this.guarding&&(this.guarding=e,this.ctx.setGuarding(e))}}const wa={x:.5,y:-.3,z:-.9,roll:-.06,handle:{x:0,y:-.42,z:0}},og={x:.46,y:-.22,z:-.72,roll:24*Math.PI/180,handle:{x:0,y:-.42,z:0}},_a=.18,ag=.3;class $${ctx;held=null;onFillChange=null;dipTime=0;dipping=!1;constructor(e){this.ctx=e}get fill(){return this.held}notify(){this.onFillChange?.()}pick(){const e=this.ctx.editing.pick();return{primary:e.target===null?null:{kind:"voxel",voxel:e.target,distance:e.distance},secondary:e.place}}primary(e){return this.secondary(e)}secondary(e){return this.held===null?this.fillFrom(e.primary):this.pourOut(e.secondary)}fillFrom(e){const n=e!==null&&e.kind==="voxel"?e.voxel:null,r=this.ctx.editing.sourceKind(n);return r===null||!this.ctx.editing.isScoopable(n)?"nothing to scoop — fill it at a water or lava source":this.ctx.editing.scoop(n)?(this.held=r,this.dip(),this.notify(),`bucket filled with ${r}`):"couldn't scoop that"}pourOut(e){if(this.held===null)return null;if(!this.ctx.editing.pourFluid(this.held,e))return"can't pour that here";const n=this.held;return this.held=null,this.dip(),this.notify(),`emptied ${n} from the bucket`}dip(){this.dipping=!0,this.dipTime=0}update(e){this.dipping&&(this.dipTime+=e,this.dipTime>=_a+ag&&(this.dipping=!1))}pose(){if(!this.dipping)return wa;if(this.dipTime<_a)return Co(wa,og,Wv(this.dipTime/_a));const e=(this.dipTime-_a)/ag;return e<1?Co(og,wa,Vv(Xs(e,0,1))):wa}stow(){this.dipping=!1}}const or={dirt:{name:"Dirt",stackable:!0,sprite:null,tool:t=>new ro(t,"dirt",hs)},stone:{name:"Stone",stackable:!0,sprite:null,tool:t=>new ro(t,"stone",fs)},cloud:{name:"Cloud",stackable:!0,sprite:null,tool:t=>new ro(t,"cloud",bs)},brick:{name:"Brick",stackable:!0,sprite:null,tool:t=>new ro(t,"brick",ih)},wood:{name:"Wood",stackable:!0,sprite:null,tool:t=>new ro(t,"wood",oh)},bucket:{name:"Bucket",stackable:!1,sprite:"bucket",tool:t=>new $$(t)},sword:{name:"Sword",stackable:!1,sprite:"sword_bronze",tool:t=>new L$(t)}},jr=Object.keys(or),D$={[Ti]:"dirt",[hs]:"dirt",[fs]:"stone",[bs]:"cloud",[P0]:"wood",[I0]:"wood",[ih]:"brick",[oh]:"wood"},_u=(t,e)=>{for(let n=0;n<t.length;n++){const{min:r,max:s}=Zs(t[n].center);if(e[0]>=r[0]&&e[0]<=s[0]&&e[1]>=r[1]&&e[1]<=s[1]&&e[2]>=r[2]&&e[2]<=s[2])return n}return-1};class N${blocks;layer;inventory;onBlocksEdited;onEditRecorded;onEdit;getLook;getPlayerVoxels;onVoxelWritten;terrain;enabled=!0;constructor(e){this.blocks=e.blocks,this.layer=e.layer,this.inventory=e.inventory,this.onBlocksEdited=e.onBlocksEdited,this.onEditRecorded=e.onEditRecorded,this.onEdit=e.onEdit??(()=>{}),this.getLook=e.getLook,this.getPlayerVoxels=e.getPlayerVoxels,this.onVoxelWritten=e.onVoxelWritten??(()=>{}),this.terrain=e.terrain}setEnabled(e){this.enabled=e}pick(){const{origin:e,direction:n}=this.getLook();return S$(this.blocks,e,n)}breakBlock(e){if(!this.enabled)return"this place doesn't allow editing";if(e===null)return null;const[n,r,s]=e,i=D$[this.readVoxel(e)];return i===void 0?null:(this.applyEdit(e,xe),this.inventory.add(i,1),this.onEditRecorded(),`broke ${or[i].name} at ${n},${r},${s}`)}placeBlock(e,n,r,s){if(!this.enabled)return"this place doesn't allow editing";if(this.inventory.count(e)<1)return`no ${or[e].name.toLowerCase()} to place — break some first`;if(r===null)return"point at a block face to place against";if(s===null||_u(this.blocks,s)<0)return"can't build outside the world";if(this.overlapsPlayer(s))return"can't place inside yourself";if(this.readVoxel(s)!==xe&&!kt(this.readVoxel(s)))return"that space is occupied";const[i,o,a]=s,l=n===hs&&this.readVoxel([i,o+1,a])===xe;return this.applyEdit(s,l?Ti:n),this.inventory.remove(e,1),this.onEditRecorded(),`placed ${or[e].name} at ${i},${o},${a}`}isScoopable(e){if(e===null)return!1;const n=this.readVoxel(e);return n===an||n===Cr}sourceKind(e){if(e===null)return null;const n=this.readVoxel(e);return n===an?"water":n===Cr?"lava":null}scoop(e){return!this.enabled||!this.isScoopable(e)?!1:(this.applyEdit(e,xe),this.onEditRecorded(),!0)}pourFluid(e,n){return!this.enabled||n===null||_u(this.blocks,n)<0||this.overlapsPlayer(n)||this.readVoxel(n)!==xe?!1:(this.applyEdit(n,e==="water"?an:Cr),this.onEditRecorded(),!0)}readVoxel(e){const n=_u(this.blocks,e);if(n<0)return xe;const r=this.blocks[n],s=ks(r.store,r.center,e);return r.store.get(s[0],s[1],s[2])}applyEdit(e,n){const r=Date.now();if(!this.layer.set(e,n,r))return;this.onEdit(e,n,r),this.onVoxelWritten(e,n);const s=[];for(let i=0;i<this.blocks.length;i++){const o=this.blocks[i],[a,l,c]=ks(o.store,o.center,e);o.store.inBoundsPadded(a,l,c)&&(o.store.data[o.store.paddedIndex(a,l,c)]=n,Ut(n)?o.store.hasWater=!0:n!==xe&&(o.store.mightHaveVoxels=!0),kt(n)&&(o.store.hasFlowing=!0),Ql(o.store,o.light),this.terrain!==void 0&&F0(o.store,o.light,o.center,this.terrain),s.push(i))}s.length>0&&this.onBlocksEdited(s)}overlapsPlayer(e){const n=this.getPlayerVoxels();return n===null?!1:n.some(r=>r[0]===e[0]&&r[1]===e[1]&&r[2]===e[2])}}const xa=.42;class F${camera;models=new Map;constructor(e){this.camera=e.camera}setModel(e,n){const r=this.models.get(e);r!==void 0&&this.camera.remove(r.mesh);const s=new Bb,i=s.voxelTexture;i.image=Nb(n.dimensions,n.sides),i.width=n.dimensions.width,i.height=n.dimensions.height,i.depth=n.dimensions.depth,i.needsUpdate=!0;const o=s.paletteTexture;o.image=Fb(n.palette),o.width=n.palette.length,o.height=1,o.needsUpdate=!0;const a=Lo.normalize(n.dimensions);s.dimensions=[a.width,a.height,a.depth],s.voxelCount=[n.dimensions.width,n.dimensions.height,n.dimensions.depth];const l=Ub(n.dimensions),c=new xn(new Gi(l.width,l.height,l.depth),s);c.scale.set(xa,xa,xa),c.visible=!1,this.camera.add(c),this.models.set(e,{mesh:c,material:s,cardSize:l.height*xa})}applyLighting(e){for(const{material:n}of this.models.values())n.lightDir=[e.sunDir[0],e.sunDir[1],e.sunDir[2]],n.lightColour=[e.sunLight[0],e.sunLight[1],e.sunLight[2]],n.ambientColour=[e.ambient[0],e.ambient[1],e.ambient[2]]}show(e,n){for(const[r,{mesh:s,cardSize:i}]of this.models){const o=r===e&&n!==null;if(s.visible=o,!o||n===null)continue;const{position:a,rotation:l}=C$(n,i);s.position.set(a.x,a.y,a.z),s.quaternion.set(l.x,l.y,l.z,l.w)}}dispose(){for(const{mesh:e}of this.models.values())this.camera.remove(e);this.models.clear()}}class B${onChange=null;counts=new Map;selected="dirt";add(e,n=1){or[e].stackable&&(this.counts.set(e,(this.counts.get(e)??0)+n),this.emit())}remove(e,n=1){if(!or[e].stackable)return!1;const r=this.counts.get(e)??0;if(r<n)return!1;const s=r-n;return s===0?this.counts.delete(e):this.counts.set(e,s),this.emit(),!0}count(e){return or[e].stackable?this.counts.get(e)??0:1}get selectedId(){return this.selected}setSelected(e){return this.selected===e?!1:(this.selected=e,this.emit(),!0)}items(){return jr.map(e=>({id:e,name:or[e].name,count:this.count(e),stackable:or[e].stackable}))}selectSlot(e){const n=jr[e];return n===void 0?!1:this.setSelected(n)}selectStep(e){if(jr.length<2)return!1;const n=jr.indexOf(this.selected),r=jr[(n+e+jr.length)%jr.length];return this.setSelected(r)}emit(){this.onChange?.()}}const U$={targetMs:1e3/60,missFactor:1.5,outlierMs:1e3,downFrames:30,upFrames:120,missPenalty:4,downStep:.8,upStep:1.25,minScale:.25,settleFrames:10,probeFrames:120,probeCooldownFrames:600,maxProbeBackoff:4,futilityScale:.5,improveFactor:.9,downCooldownFrames:900},H$=.1;class Gv{config;_scale;_mode="auto";missedFrames=0;metFrames=0;settle=0;meanGapMs;probedFrom=null;probeWindow=0;probeCooldown=0;probeFailures=0;descentFrom=null;descentGapMs=0;downCooldown=0;downFailures=0;constructor(e={},n=1){this.config={...U$,...e},this._scale=n,this.meanGapMs=this.config.targetMs}get scale(){return this._scale}get mode(){return this._mode}get framesPerSecond(){return 1e3/this.meanGapMs}setAuto(){this._mode="auto",this.missedFrames=0,this.metFrames=0,this.probedFrom=null,this.probeWindow=0,this.probeCooldown=0,this.probeFailures=0,this.descentFrom=null,this.downCooldown=0,this.downFailures=0,this.hold()}setFixed(e){this._mode="fixed",this._scale=lg(Math.min(1,Math.max(H$,e)))}describe(){const e=Math.round(this._scale*100),n=Math.round(this.framesPerSecond);return this._mode==="fixed"?`resolution: ${e}% of the display resolution, pinned — ${n} frames per second`:this.downCooldown>0?`resolution: ${e}% of the display resolution, not stepping down (lowering it did not make frames any faster) — ${n} frames per second`:`resolution: ${e}% of the display resolution, adapting — ${n} frames per second`}update(e){return this.observe(e,!0)}frame(e){return this.observe(e,!1)}hold(e=this.config.settleFrames){this.settle=Math.max(this.settle,e)}observe(e,n){return this._mode==="fixed"?this._scale:!(e>0)||e>this.config.outlierMs?(this.hold(),this._scale):(this.meanGapMs=this.meanGapMs*.9+e*.1,this.probeCooldown>0&&this.probeCooldown--,this.downCooldown>0&&this.downCooldown--,this.probeWindow>0&&(this.probeWindow--,this.probeWindow===0&&(this.probedFrom=null,this.probeFailures=0)),this.settle>0?(this.settle--,this._scale):(n&&this.adapt(e),this._scale))}adapt(e){if(e>this.config.targetMs*this.config.missFactor){this.metFrames=Math.max(0,this.metFrames-this.config.missPenalty),this.missedFrames++,this.missedFrames>=this.config.downFrames&&this.stepDown();return}this.metFrames++,this.missedFrames>0&&this.missedFrames--,this.metFrames>=this.config.upFrames&&this.stepUp()}stepDown(){if(this.missedFrames=0,this.probedFrom!==null){const e=this.probedFrom;this.probedFrom=null,this.probeWindow=0,this.probeFailures=Math.min(this.probeFailures+1,this.config.maxProbeBackoff),this.probeCooldown=this.config.probeCooldownFrames*2**this.probeFailures,this.setScale(e);return}if(!(this.downCooldown>0)){if(this.descentFrom!==null&&this._scale<=this.descentFrom*this.config.futilityScale){if(this.meanGapMs>this.descentGapMs*this.config.improveFactor){const e=this.descentFrom;this.descentFrom=null,this.downFailures=Math.min(this.downFailures+1,this.config.maxProbeBackoff),this.downCooldown=this.config.downCooldownFrames*2**this.downFailures,this.setScale(e);return}this.descentFrom=this._scale,this.descentGapMs=this.meanGapMs,this.downFailures=0}this.descentFrom===null&&(this.descentFrom=this._scale,this.descentGapMs=this.meanGapMs),this.setScale(Math.max(this.config.minScale,this._scale*this.config.downStep))}}stepUp(){this.metFrames=0,this.descentFrom=null,this.downCooldown=0,this.downFailures=0,!(this._scale>=1||this.probeCooldown>0||this.probedFrom!==null)&&(this.probedFrom=this._scale,this.probeWindow=this.config.probeFrames,this.setScale(Math.min(1,this._scale*this.config.upStep)))}setScale(e){this.missedFrames=0,this.metFrames=0;const n=lg(e);n!==this._scale&&(this._scale=n,this.settle=this.config.settleFrames)}}const lg=t=>Math.round(t*1e3)/1e3;class j${supported=!1;ms=0;answered=!1;begin(){}end(){}poll(){}}const cg=()=>new j$,W$=24,V$=60,G$=({canvas:t,scene:e,camera:n,debugPerf:r,resolution:s,onFrame:i,beforeRender:o,afterRender:a,clearColor:l,describeStats:c,onDebugStats:u,antialias:d})=>{const h=new FR(t,{antialias:d});h.setClearColor(l(),1);let f,m;const p=s??new Gv;let y=0,g=0,b=0,v=0,x=0;const k=()=>{const M=r();if(!M&&!me.armed)return o?.(h,n),h.render(e,n),a?.(t),!1;f??=cg(h.gl),m??=cg(h.gl),m.begin(),me.begin(Qe.occlusion),o?.(h,n),me.end(Qe.occlusion),m.end(),m.poll(),f.begin(),me.begin(Qe.draw),h.render(e,n),me.end(Qe.draw),a?.(t),f.end(),f.poll(),x++;const O=x%W$===0;if(!M)return O;const S=c?.(h.gl,h.canvas.width,h.canvas.height,O);return u?.(`frame: ${f.ms.toFixed(2)} ms | resolution: ${p.scale.toFixed(3)}x | ${S??""}`),O},C=M=>{if(y<=0||g<=0)return;const O=Math.max(1,Math.round(y*M)),S=Math.max(1,Math.round(g*M));(O!==t.width||S!==t.height)&&(t.width=O,t.height=S,t.style.imageRendering=O<y/window.devicePixelRatio?"pixelated":"",k())},E=M=>{const O=v>0?M-v:0,S=v>0?Math.min(.05,(M-v)/1e3):1/60;v=M,me.begin(Qe.advance),i(S),me.end(Qe.advance),h.setClearColor(l(),1);const z=k();if(m!==void 0&&m.answered&&me.gauge(Ct.gpuOcclusionMs,m.ms),me.frame(O,f!==void 0&&f.answered?f.ms:-1,p.scale),b>0&&!document.hidden){const w=M-b;C(z?p.frame(w):p.update(w))}b=M},T=()=>{document.visibilityState==="visible"&&(b=0,v=0,p.hold(V$))};document.addEventListener("visibilitychange",T);const A=new ResizeObserver(()=>{const M=t.getBoundingClientRect(),O=M.width/M.height;!Number.isFinite(O)||O<=0||(y=M.width*window.devicePixelRatio,g=M.height*window.devicePixelRatio,n.aspect=O,n.updateProjectionMatrix(),p.hold(),C(p.scale))});return A.observe(t),h.setAnimationLoop(E),{dispose(){document.removeEventListener("visibilitychange",T),A.disconnect(),h.setAnimationLoop(null),h.dispose()}}},Yv={water:an,lava:Cr},ug={water:z0,lava:lh},Y$={water:bl,lava:Do},Ps=t=>Ut(t)?"water":Ir(t)?"lava":null,ka=(t,e)=>t==="water"?Ut(e):Ir(e),X$=(t,e)=>e<=0?Yv[t]:Y$[t]+Math.min(e,vl)-1,q$=t=>(vl+1-t)/(vl+1),Z$={water:.25,lava:1.5},K$=512,J$=4,Q$=([t,e,n])=>`${t},${e},${n}`,eD=t=>{const[e,n,r]=t.split(",");return[Number(e),Number(n),Number(r)]},so=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];class tD{blocks;resolve;onBlocksEdited;due=new Map;now=0;touched=new Set;emissive=new Set;constructor(e){this.blocks=e.blocks,this.resolve=e.resolve,this.onBlocksEdited=e.onBlocksEdited}wakeVoxel(e,n){kt(n)&&this.schedule(e,Ps(n)),this.wakeNeighbours(e)}wakeNeighbours(e){for(const n of so){const r=[e[0]+n[0],e[1]+n[1],e[2]+n[2]],s=this.read(r);kt(s)&&this.schedule(r,Ps(s))}}wakeBlock(e){const n=this.blocks[e];n.store.hasFlowing&&this.wakeUnstableIn(n);const r=this.blockIndexAtVoxel(n.center[0]/2,n.center[1]/2+64,n.center[2]/2);if(r!==void 0&&r!==e){const s=this.blocks[r];s.store.hasFlowing&&this.wakeBlockBottom(s)}}wakeUnstableIn(e){const n=e.store,[r,s,i]=n.voxels;for(let o=0;o<i;o++)for(let a=0;a<s;a++)for(let l=0;l<r;l++){const c=n.get(l,a,o);if(!kt(c))continue;const u=Ps(c);this.airBelowOrSide(l,a,o,n)&&this.schedule(this.toWorldVoxel(e,l,a,o),u)}}wakeBlockBottom(e){const n=e.store,[r,s]=n.voxels;for(let i=0;i<s;i++)for(let o=0;o<r;o++){const a=n.get(o,0,i);if(!kt(a))continue;const l=this.toWorldVoxel(e,o,0,i);this.read([l[0],l[1]-1,l[2]])===xe&&this.schedule(l,Ps(a))}}airBelowOrSide(e,n,r,s){if(s.atPadded(e,n-1,r)===xe)return!0;const i=[[e-1,n,r],[e+1,n,r],[e,n,r-1],[e,n,r+1]];for(const[o,a,l]of i)if(s.atPadded(o,a,l)===xe)return!0;return!1}blockIndexAtVoxel(e,n,r){return this.resolve!==void 0?this.resolve([e,n,r]):this.findIndexLinear(e,n,r)}isLoaded(e){return this.blockIndexAtVoxel(e[0],e[1],e[2])!==void 0}tick(e){this.now+=e;let n=0;const r=[...this.due.keys()];for(const s of r){if(n>=K$)break;const i=this.due.get(s);if(i===void 0||i>this.now)continue;this.due.delete(s);const o=eD(s),a=this.read(o);kt(a)&&(this.step(o,a),n++)}this.flush()}step(e,n){const r=Ps(n);if(r===null)return;const s=Ba(n),i=nD(e);if(!this.isLoaded(i))return;const a=this.read(i);if(a===xe){s===0&&this.hasKindNeighbour(e,r)?this.write(i,ug[r]):(this.write(e,xe),this.write(i,ug[r]));return}if(kt(a)&&Ps(a)!==r){this.write(i,fs);return}if(!ka(r,a)){if(s===0){this.spread(e,r,0);return}if(r==="water"&&this.sourceNeighbourCount(e,r)>=2){this.write(e,Yv.water);return}if(!this.hasLowerNeighbour(e,r,s)){this.write(e,xe);return}s<vl&&this.spread(e,r,s)}}hasKindNeighbour(e,n){for(const r of so){if(r[1]!==0)continue;const s=[e[0]+r[0],e[1],e[2]+r[2]];if(ka(n,this.read(s)))return!0}return!1}sourceNeighbourCount(e,n){let r=0;for(const s of so){if(s[1]!==0)continue;const i=[e[0]+s[0],e[1],e[2]+s[2]];ka(n,this.read(i))&&Ba(this.read(i))===0&&r++}return r}hasLowerNeighbour(e,n,r){for(const s of so){const i=[e[0]+s[0],e[1]+s[1],e[2]+s[2]];if(ka(n,this.read(i))&&Ba(this.read(i))<r)return!0}return!1}spread(e,n,r){const s=[];for(const a of so){if(a[1]!==0)continue;const l=[e[0]+a[0],e[1],e[2]+a[2]];!this.isLoaded(l)||this.read(l)!==xe||s.push({w:l,weight:this.dropDistance(l)})}if(s.length===0)return;let i=1/0;for(const a of s)i=Math.min(i,a.weight);const o=X$(n,r+1);for(const a of s)a.weight===i&&this.read(a.w)===xe&&this.write(a.w,o)}dropDistance(e){for(let n=1;n<=J$;n++)if(this.read([e[0],e[1]-n,e[2]])===xe)return n;return 1e3}schedule(e,n){this.due.set(Q$(e),this.now+Z$[n])}read(e){const n=this.blockIndexAtVoxel(e[0],e[1],e[2]);if(n===void 0)return xe;const r=this.blocks[n],s=ks(r.store,r.center,e);return r.store.get(s[0],s[1],s[2])}findIndexLinear(e,n,r){for(let s=0;s<this.blocks.length;s++){const{min:i,max:o}=Zs(this.blocks[s].center);if(e>=i[0]&&e<=o[0]&&n>=i[1]&&n<=o[1]&&r>=i[2]&&r<=o[2])return s}}toWorldVoxel(e,n,r,s){const i=e.store.scale,[o,a,l]=e.store.voxels;return[Math.round(e.center[0]/i-o/2+n),Math.round(e.center[1]/i-a/2+r),Math.round(e.center[2]/i-l/2+s)]}write(e,n){let r=xe;const s=[];if(this.resolve!==void 0){const o=new Set;for(let a=-1;a<=1;a++)for(let l=-1;l<=1;l++)for(let c=-1;c<=1;c++){const u=this.resolve([e[0]+c,e[1]+l,e[2]+a]);u!==void 0&&!o.has(u)&&(o.add(u),s.push(u))}}else for(let o=0;o<this.blocks.length;o++)s.push(o);let i=!1;for(const o of s){const a=this.blocks[o],[l,c,u]=ks(a.store,a.center,e);if(!a.store.inBoundsPadded(l,c,u))continue;const d=a.store.paddedIndex(l,c,u),h=a.store.data[d];h!==n&&(r=h,a.store.data[d]=n,Ut(n)?a.store.hasWater=!0:n!==xe&&(a.store.mightHaveVoxels=!0),kt(n)&&(a.store.hasFlowing=!0),this.touched.add(o),(Ir(h)||Ir(n))&&this.emissive.add(o),i=!0)}i&&(kt(n)?this.schedule(e,Ps(n)):kt(r)&&r!==n&&this.wakeNeighbours(e))}flush(){if(this.emissive.size>0){for(const n of this.emissive){const r=this.blocks[n];Ql(r.store,r.light)}this.emissive.clear()}if(this.touched.size===0)return;const e=[...this.touched];this.touched.clear(),this.onBlocksEdited(e)}get pendingCount(){return this.due.size}get active(){return this.due.size>0}}const nD=([t,e,n])=>[t,e-1,n];class gs{buf;ctor;chunk;length=0;constructor(e,n=512){this.ctor=e,this.chunk=n,this.buf=new e(n)}growBy(e){const n=this.length+e;if(n<=this.buf.length)return;let r=this.buf.length;for(;r<n;)r=Math.max(r*2,this.chunk);const s=new this.ctor(r);s.set(this.buf.subarray(0,this.length)),this.buf=s}pushMany(e){this.growBy(e.length),this.buf.set(e,this.length),this.length+=e.length}pushShifted(e,n){this.growBy(e.length);for(let r=0;r<e.length;r++)this.buf[this.length+r]=e[r]+n;this.length+=e.length}pushOffset(e,n,r,s){this.growBy(e.length);for(let i=0;i<e.length;i+=3)this.buf[this.length+i]=e[i]+n,this.buf[this.length+i+1]=e[i+1]+r,this.buf[this.length+i+2]=e[i+2]+s;this.length+=e.length}pushTris(e,n,r,s){const i=s*3;this.growBy(i);for(let o=0;o<s;o++){const a=this.length+o*3;this.buf[a]=e,this.buf[a+1]=n,this.buf[a+2]=r}this.length+=i}get count(){return this.length}get capacityBytes(){return this.buf.byteLength}pushPair(e,n){this.growBy(2),this.buf[this.length]=e,this.buf[this.length+1]=n,this.length+=2}pushTriple(e,n,r){this.growBy(3),this.buf[this.length]=e,this.buf[this.length+1]=n,this.buf[this.length+2]=r,this.length+=3}pushQuad(e,n,r,s){this.growBy(4),this.buf[this.length]=e,this.buf[this.length+1]=n,this.buf[this.length+2]=r,this.buf[this.length+3]=s,this.length+=4}writeManyAt(e,n){this.buf.set(n,e)}writeShiftedAt(e,n,r){for(let s=0;s<n.length;s++)this.buf[e+s]=n[s]+r}writeOffsetAt(e,n,r,s,i){for(let o=0;o<n.length;o+=3)this.buf[e+o]=n[o]+r,this.buf[e+o+1]=n[o+1]+s,this.buf[e+o+2]=n[o+2]+i}clear(){this.length=0}exact(){const e=new this.ctor(this.length);return e.set(this.buf.subarray(0,this.length)),e}array(){return this.buf.subarray(0,this.length)}}const dg=-1,rD=Number.NaN,hg=t=>t.every(e=>e===t[0])?t[0]:null;class sD{constructor(e,n){this.wide=e,this.tall=n,this.ids=new Int32Array(e*n),this.skies=new Float64Array(e*n),this.blocks=new Float64Array(e*n),this.taken=new Uint8Array(e*n),this.clear()}wide;tall;ids;skies;blocks;taken;clear(){this.ids.fill(dg),this.taken.fill(0)}set(e,n,r,s){const i=n*this.wide+e;if(this.ids[i]=r,s===null){this.skies[i]=1,this.blocks[i]=0;return}const o=hg(s.sky),a=hg(s.block);if(o===null||a===null){this.skies[i]=rD;return}this.skies[i]=o,this.blocks[i]=a}eachRectangle(e){for(let n=0;n<this.tall;n++)for(let r=0;r<this.wide;r++){const s=n*this.wide+r,i=this.ids[s];if(i===dg||this.taken[s]===1)continue;const o=this.skies[s];if(Number.isNaN(o)){this.taken[s]=1,e({first:r,second:n,wide:1,tall:1,id:i,sky:null,block:0});continue}const a=this.blocks[s];let l=1;for(;r+l<this.wide&&this.matches(s+l,i,o,a);)l++;let c=1;for(;n+c<this.tall;){const u=s+c*this.wide;let d=!0;for(let h=0;h<l;h++)if(!this.matches(u+h,i,o,a)){d=!1;break}if(!d)break;c++}for(let u=0;u<c;u++)this.taken.fill(1,s+u*this.wide,s+u*this.wide+l);e({first:r,second:n,wide:l,tall:c,id:i,sky:o,block:a})}}matches(e,n,r,s){return this.taken[e]===0&&this.ids[e]===n&&this.skies[e]===r&&this.blocks[e]===s}}const iD=20,fg=255,$h=(t,e)=>t*2+(e>0?0:1),Xv=t=>{const e=t.mul(.5).floor(),n=V(1).sub(t.sub(e.mul(2)).mul(2)),r=s=>V(1).sub(e.sub(V(s)).abs().min(V(1)));return Oe(r(0),r(1),r(2)).mul(n)},pg=t=>{if(t===0)return 0;const e=Math.floor(Math.log2(t)),n=t-2**e<<10-e;return e+15<<10|n};class qv{positions=new gs(Float32Array);packed=new gs(Uint8Array);uvs=new gs(Uint16Array);indices=new gs(Uint32Array);clear(){this.positions.clear(),this.packed.clear(),this.uvs.clear(),this.indices.clear()}pushPacked(e,n,r,s){this.packed.pushQuad(e,Math.round(n*255),s,Math.round(r*255))}pushUv(e,n){this.uvs.pushPair(pg(e),pg(n))}finish(){return{positions:this.positions.exact(),packed:this.packed.exact(),uvs:this.uvs.exact(),indices:this.indices.exact()}}}const oD=()=>({positions:new Float32Array(0),packed:new Uint8Array(0),uvs:new Uint16Array(0),indices:new Uint32Array(0)}),lc=[[[0,0,0,0,1],[0,1,0,0,0],[0,1,1,1,0],[0,0,1,1,1]],[[0,0,0,0,0],[1,0,0,1,0],[1,0,1,1,1],[0,0,1,0,1]],[[0,0,0,0,1],[1,0,0,1,1],[1,1,0,1,0],[0,1,0,0,0]]],aD=(t,e)=>t===1?e===-1:e===1,mg=[!0,!1,!1],Dh=[[1,2],[0,2],[0,1]],lD=(t,e,n,r)=>D0(t.skylightAt(t.paddedIndex(e,n,r))),cD=(t,e,n,r)=>D0(t.blocklightAt(t.paddedIndex(e,n,r))),xu=(t,e,n,r)=>{const s=t.atPadded(e,n,r);return s!==xe&&!Ut(s)},uD=t=>t===xe||kt(t),Nh=(t,e,n,r,s,i,o)=>{if(e===null)return null;const[a,l]=Dh[i],c=[],u=[];for(const d of lc[i]){const h=d[a],f=d[l];let m=0,p=0;for(const E of[h,h-1])for(const T of[f,f-1]){const A=[n,r,s];A[a]+=E,A[l]+=T,A[i]+=o,m=Math.max(m,lD(e,A[0],A[1],A[2])),p=Math.max(p,cD(e,A[0],A[1],A[2]))}const y=h===0?-1:1,g=f===0?-1:1;let b=0;const v=[n,r,s];v[a]+=y,v[i]+=o,b+=xu(t,v[0],v[1],v[2])?1:0;const x=[n,r,s];x[l]+=g,x[i]+=o,b+=xu(t,x[0],x[1],x[2])?1:0;const k=[n,r,s];k[a]+=y,k[l]+=g,k[i]+=o,b+=xu(t,k[0],k[1],k[2])?1:0;const C=(3-b)/3;c.push(m*C),u.push(p*C)}return{sky:c,block:u}},el=0,Fh=(t,e,n,r)=>{aD(n,r)?(t.into.indices.pushTriple(e,e+1,e+2),t.into.indices.pushTriple(e,e+2,e+3)):(t.into.indices.pushTriple(e,e+2,e+1),t.into.indices.pushTriple(e,e+3,e+2))},dD=(t,e,n,r,s,i,o,a,l,c)=>{const{store:u,light:d}=t,f=u.scale/2,m=t.into.positions.count/3,p=lc[s],y=Nh(u,d,a,l,c,s,i);for(let g=0;g<p.length;g++){const[b,v,x,k,C]=p[g];t.into.positions.pushTriple(s===0?e+i*f:e+(b-.5)*2*f,s===1?n+i*f:n+(v-.5)*2*f,s===2?r+i*f:r+(x-.5)*2*f),t.into.pushUv(k,C),t.into.pushPacked($h(s,i),y===null?1:y.sky[g],y===null?0:y.block[g],o)}Fh(t,m,s,i)},hD=(t,e,n,r,s,i,o,a,l,c,u)=>{const{store:d}=t,h=d.scale,f=d.voxels,[m,p]=Dh[e],y=t.into.positions.count/3,g=(r+(n>0?1:0)-f[e]/2)*h,b=mg[e]?a:o,v=mg[e]?o:a;for(const x of lc[e]){const[k,C,E,T,A]=x,M=[k,C,E],O=[0,0,0];O[e]=g,O[m]=(s+M[m]*o-f[m]/2)*h,O[p]=(i+M[p]*a-f[p]/2)*h,t.into.positions.pushTriple(O[0],O[1],O[2]),t.into.pushUv(T*b,A*v),t.into.pushPacked($h(e,n),c,u,l)}Fh(t,y,e,n)},ku=(t,e,n,r,s,i,o,a,l,c,u,d)=>{const{store:h,light:f}=t,m=h.scale,p=m/2,y=t.into.positions.count/3,g=lc[s],b=Nh(h,f,a,l,c,s,i),v=x=>n-p+x*m;for(let x=0;x<g.length;x++){const[k,C,E,T,A]=g[x],M=s===1||C===1?d:u;t.into.positions.pushTriple(s===0?e+i*p:e+(k-.5)*2*p,v(M),s===2?r+i*p:r+(E-.5)*2*p),t.into.pushUv(T,A),t.into.pushPacked($h(s,i),b===null?1:b.sky[x],b===null?0:b.block[x],o)}Fh(t,y,s,i)},gg=(t,e,n,r)=>{const s=t.atPadded(e,n,r),i=t.atPadded(e,n+1,r);return t.atPadded(e,n-1,r)===xe?1:i===xe?q$(Ba(s)):1},Zv=(t,e,n,r,s)=>{const{store:i}=t,[o,a,l]=i.voxels,c=i.scale,u=(k,C,E)=>i.atPadded(k,C,E),d=u(e,n,r),h=Ut(d)?Ut:Ir,f=u(e,n+1,r),m=u(e,n-1,r),p=[[e-1,n,r,0],[e+1,n,r,1],[e,n,r-1,2],[e,n,r+1,3]],y=gg(i,e,n,r),g=(e+.5-o/2)*c,b=(n+.5-a/2)*c,v=(r+.5-l/2)*c,x=s===null?el:s(d);f===xe&&ku(t,g,b,v,1,1,x,e,n,r,y,y),m===xe&&ku(t,g,b,v,1,-1,x,e,n,r,0,0);for(const[k,C,E,T]of p){const A=u(k,C,E);if(A!==xe&&!h(A))continue;const M=h(A)?gg(i,k,C,E):0;if(M>=y)continue;const O=T<2?0:2,S=T%2===0?-1:1;ku(t,g,b,v,O,S,x,e,n,r,M,y)}},fD=(t,e,n=null,r=new qv)=>{r.clear();const s={store:t,light:n,into:r},[i,o,a]=t.voxels,l=t.scale,c=new Map;for(const p of e)c.set(p.id,p);const u=p=>c.get(p)?.side??el,d=(p,y,g)=>t.atPadded(p,y,g);for(let p=0;p<a;++p)for(let y=0;y<o;++y)for(let g=0;g<i;++g)Ir(d(g,y,p))&&Zv(s,g,y,p,u);const h=(p,y,g)=>{const b=c.get(p);return y!==1?b?.side??el:(g>0?b?.top:b?.bottom)??el},f=[0,0,0],m=[0,0,0];for(let p=0;p<3;p++){const[y,g]=Dh[p],b=new sD(t.voxels[y],t.voxels[g]);for(const v of[-1,1])for(let x=0;x<t.voxels[p];x++){b.clear();for(let k=0;k<t.voxels[g];k++)for(let C=0;C<t.voxels[y];C++){f[p]=x,f[y]=C,f[g]=k;const E=d(f[0],f[1],f[2]);E===xe||Ut(E)||Ir(E)||(m[p]=x+v,m[y]=C,m[g]=k,uD(d(m[0],m[1],m[2]))&&b.set(C,k,E,Nh(t,n,f[0],f[1],f[2],p,v)))}b.eachRectangle(k=>{const{first:C,second:E,wide:T,tall:A,id:M,sky:O,block:S}=k,z=h(M,p,v);if(O===null){f[p]=x,f[y]=C,f[g]=E,dD(s,(f[0]+.5-i/2)*l,(f[1]+.5-o/2)*l,(f[2]+.5-a/2)*l,p,v,z,f[0],f[1],f[2]);return}hD(s,p,v,x,C,E,T,A,z,O,S)})}}return r.finish()},pD=(t,e=null,n=new qv)=>{n.clear();const r={store:t,light:e,into:n},[s,i,o]=t.voxels;if(!t.hasWater)return n.finish();for(let a=0;a<o;++a)for(let l=0;l<i;++l)for(let c=0;c<s;++c)Ut(t.atPadded(c,l,a))&&Zv(r,c,l,a,null);return n.finish()},Sa=(t,e,n,r,s=!1)=>{const i=new Le(t,e,s);return i.format=r,n!==void 0&&(i.updateRange={offset:n.first*e,count:n.count*e}),i.needsUpdate=!0,i},mD=(t,e,n)=>{t.setAttribute("position",Sa(e.positions,3,n?.vertices,"float32x3")),t.setAttribute("packed",Sa(e.packed,4,n?.vertices,"unorm8x4",!0)),e.uvs.length>0?t.setAttribute("uv",Sa(e.uvs,2,n?.vertices,"float16x2")):t.deleteAttribute("uv"),t.setIndex(Sa(e.indices,1,n?.indices))},Bh=iD,Uh=4,yg={start:0,count:0},gD=()=>({positions:new gs(Float32Array),packed:new gs(Uint8Array),uvs:new gs(Uint16Array),indices:new gs(Uint32Array)}),Kv=()=>({vertexFirst:1/0,vertexLast:-1,indexFirst:1/0,indexLast:-1}),Il=(t,e)=>e<t?void 0:{first:t,count:e-t+1},yD=(t,e,n,r,s)=>{const i=t.positions.count/3;t.positions.pushOffset(e.positions,n,r,s),t.packed.pushMany(e.packed),t.uvs.pushMany(e.uvs),t.indices.pushShifted(e.indices,i)},bg=t=>t.positions.capacityBytes+t.packed.capacityBytes+t.uvs.capacityBytes+t.indices.capacityBytes,vg=()=>({arrays:gD(),free:[],written:Kv()}),wg=t=>{const e=Il(t.written.vertexFirst,t.written.vertexLast),n=Il(t.written.indexFirst,t.written.indexLast);return(e?.count??0)*Bh+(n?.count??0)*Uh},_g=(t,e,n,r,s)=>{n>0&&(t.written.vertexFirst=Math.min(t.written.vertexFirst,e),t.written.vertexLast=Math.max(t.written.vertexLast,e+n-1)),s>0&&(t.written.indexFirst=Math.min(t.written.indexFirst,r),t.written.indexLast=Math.max(t.written.indexLast,r+s-1))},bD=(t,e,n,r,s)=>{const i=e.positions.length/3,o=e.indices.length,a=t.free.findIndex(d=>d.vertexCount>=i&&d.indexCount>=o);if(a===-1){const d=t.arrays.positions.count/3,h=t.arrays.indices.count;return yD(t.arrays,e,n,r,s),_g(t,d,i,h,o),{indices:{start:h,count:o},vertices:{start:d,count:i}}}const l=t.free[a];t.arrays.positions.writeOffsetAt(l.vertexFirst*3,e.positions,n,r,s),t.arrays.packed.writeManyAt(l.vertexFirst*4,e.packed),t.arrays.uvs.writeManyAt(l.vertexFirst*2,e.uvs),t.arrays.indices.writeShiftedAt(l.indexFirst,e.indices,l.vertexFirst),_g(t,l.vertexFirst,i,l.indexFirst,o);const c=l.vertexCount-i,u=l.indexCount-o;return c>0&&u>0?t.free[a]={vertexFirst:l.vertexFirst+i,vertexCount:c,indexFirst:l.indexFirst+o,indexCount:u}:t.free.splice(a,1),{indices:{start:l.indexFirst,count:o},vertices:{start:l.vertexFirst,count:i}}},vD=(t,e,n,r)=>{e.count===0&&r===0||t.free.push({vertexFirst:n,vertexCount:r,indexFirst:e.start,indexCount:e.count})},xg=t=>t.free.reduce((e,n)=>e+n.vertexCount*Bh+n.indexCount*Uh,0),kg=t=>{for(const[e,n]of Object.entries(t.attributes))t.setAttribute(e,new Le(new Float32Array(0),n.itemSize));t.index!==null&&t.setIndex(new Le(new Uint32Array(0),1))},Ea=t=>t.positions.length/3*Bh+t.indices.length*Uh;class wD{constructor(e,n){this.center=e,this.pair=n}center;pair;joined=new Set;terrainPass=vg();waterPass=vg();terrainRanges=new Map;waterRanges=new Map;terrainVertices=new Map;waterVertices=new Map;get terrain(){return this.pair.terrain}get water(){return this.pair.water}holds(e){return this.joined.has(e)}get members(){return this.joined}join(e,n,r){if(this.joined.has(e))return;const s=n[0]-this.center[0],i=n[1]-this.center[1],o=n[2]-this.center[2];for(const[a,l,c,u]of[[this.terrainPass,r.terrain,this.terrainRanges,this.terrainVertices],[this.waterPass,r.water,this.waterRanges,this.waterVertices]]){const d=bD(a,l,s,i,o);c.set(e,d.indices),u.set(e,d.vertices)}this.joined.add(e)}retire(e){if(this.joined.delete(e))for(const[n,r,s]of[[this.terrainPass,this.terrainRanges,this.terrainVertices],[this.waterPass,this.waterRanges,this.waterVertices]]){const i=r.get(e),o=s.get(e);i!==void 0&&o!==void 0&&vD(n,i,o.start,o.count),r.delete(e),s.delete(e)}}rangeOf(e){return{terrain:this.terrainRangeOf(e),water:this.waterRangeOf(e)}}terrainRangeOf(e){return this.terrainRanges.get(e)??yg}waterRangeOf(e){return this.waterRanges.get(e)??yg}get pendingBytes(){return wg(this.terrainPass)+wg(this.waterPass)}get bytes(){return bg(this.terrainPass.arrays)+bg(this.waterPass.arrays)}get freeBytes(){return xg(this.terrainPass)+xg(this.waterPass)}get indexCount(){return this.terrainPass.arrays.indices.count+this.waterPass.arrays.indices.count}upload(){const e=this.pendingBytes;for(const[n,r]of[[this.terrainPass,this.pair.terrain],[this.waterPass,this.pair.water]]){const s=Il(n.written.vertexFirst,n.written.vertexLast),i=Il(n.written.indexFirst,n.written.indexLast);mD(r,{positions:n.arrays.positions.array(),packed:n.arrays.packed.array(),uvs:n.arrays.uvs.array(),indices:n.arrays.indices.array()},{vertices:s??{first:0,count:0},indices:i??{first:0,count:0}}),n.written=Kv()}return e}release(){return kg(this.pair.terrain),kg(this.pair.water),this.pair}}const Jv=12,_D=2*Jv,Aa=oD();class xD{blocks;onMeshBuilt;buildsPerDrain;generation;pending=new Set;inFlight=new Map;bufferPool=[];tilesById=new Map;rects=[];pool;warnedWorkerError=!1;nextWorker=0;constructor(e){this.blocks=e.blocks,this.onMeshBuilt=e.onMeshBuilt,this.buildsPerDrain=e.buildsPerDrain??Jv,this.generation=new Array(e.blocks.length).fill(0),this.pool=e.pool??new Eh(e.createWorker===void 0?{}:{createWorker:e.createWorker,count:1}),this.pool.onMessage(n=>{this.onWorkerMessage(n.data)}),this.pool.onWorkerLost(()=>{this.onWorkerLost()})}onWorkerMessage(e){if(e.type!=="mesh")return;const n=this.inFlight.get(e.id);if(n!==void 0){if(this.inFlight.delete(e.id),n!==this.generation[e.id]){this.releaseBuffer(e.data),this.releaseBuffer(e.light);return}me.count(qn.meshesLanded),this.onMeshBuilt(e.id,e.terrain,e.water),this.releaseBuffer(e.data),this.releaseBuffer(e.light)}}onWorkerLost(){this.warnedWorkerError||(this.warnedWorkerError=!0,console.warn("[meshes] worker unavailable; falling back to the remaining workers or the main thread"));for(const e of this.inFlight.keys())this.pending.add(e);this.inFlight.clear()}invalidate(e){this.generation[e]++}resizeTo(e){for(;this.generation.length<e;)this.generation.push(0);this.generation.length=e;for(const n of[...this.pending])n>=e&&this.pending.delete(n);for(const n of[...this.inFlight.keys()])n>=e&&this.inFlight.delete(n)}requestBuild(e){this.generation[e]++,this.pending.add(e)}acceptMesh(e,n){this.generation[e]++,this.pending.delete(e),this.onMeshBuilt(e,n.terrain,n.water)}buildNow(e){this.pending.delete(e),this.buildOnThisThread([e])}drain(){if(this.pool.workers.length===0){const n=[...this.pending];this.pending.clear(),this.buildOnThisThread(n);return}let e=0;for(const n of this.pending)if(!this.inFlight.has(n)){if(!this.hasSurfaceData(n)){this.pending.delete(n),this.onMeshBuilt(n,Aa,Aa);continue}if(this.send(n),this.pending.delete(n),++e>=this.buildsPerDrain)break}}setTiles(e){this.tilesById.clear();for(const n of e)this.tilesById.set(n.id,n);this.rects=[...this.tilesById.values()];for(let n=0;n<this.blocks.length;n++)this.requestBuild(n)}get tileRects(){return this.rects}get pendingCount(){return this.pending.size}get inFlightCount(){return this.inFlight.size}buildOnThisThread(e){const n=[...this.tilesById.values()];me.count(qn.meshesRequested,e.length),me.count(qn.meshesLanded,e.length);for(const r of e){if(!this.hasSurfaceData(r)){this.onMeshBuilt(r,Aa,Aa);continue}const s=this.blocks[r].store,i=this.blocks[r].light;this.onMeshBuilt(r,fD(s,n,i),pD(s,i))}}hasSurfaceData(e){return this.blocks[e].store.mightHaveVoxels||this.blocks[e].store.hasWater}send(e){this.generation[e]++,this.inFlight.set(e,this.generation[e]),me.count(qn.meshesRequested);const n=this.blocks[e].store,r=this.blocks[e].light,s=this.acquireBuffer(n.data.byteLength);s.set(n.data);const i=this.acquireBuffer(r.data.byteLength);i.set(r.data);const o={type:"mesh",id:e,voxels:n.voxels,scale:n.scale,data:s,hasWater:n.hasWater,light:i,tileRects:[...this.tilesById.values()]},a=this.pool.workers[this.nextWorker%this.pool.workers.length];this.nextWorker++,a?.postMessage(o,[o.data.buffer,o.light.buffer])}acquireBuffer(e){const n=this.bufferPool.findIndex(r=>r.byteLength===e);return n>=0?this.bufferPool.splice(n,1)[0]:new Uint8Array(e)}releaseBuffer(e){this.bufferPool.length<_D&&this.bufferPool.push(e)}dispose(){this.pool.dispose()}}class kD extends pr{slotColor=[0,0,0];slotColorUniform;setup(e){this.slotColorUniform=e.materialUniform("slotColor","vec3",()=>this.slotColor)}buildVertexBody(e){const n=Ie(e.position,1),r=e.instancing?e.instanceMatrix.mul(n):n,s=e.modelMatrix.mul(r);return e.positionWorld.assign(s.xyz),e.instancingColor&&e.instanceColorVarying.assign(e.instanceColor),e.projectionMatrix.mul(e.viewMatrix.mul(s))}buildFragmentBody(e){const n=this.slotColorUniform??e.materialUniform("slotColor","vec3",()=>this.slotColor),r=n.element(0).mul(255).round(),s=n.element(1).mul(255).round(),i=n.element(2).mul(255).round(),a=r.add(s.mul(256)).add(i.mul(65536)).mul(.6180339887).fract(),l=Oe(a).add(Oe(1,2/3,1/3)).fract().mul(6).sub(3).abs(),c=Oe(.9).mul(Oe(1).mix(l.sub(Oe(1)).clamp(0,1),.8));return Ie(c,1)}}class Sg extends pr{slotColor=[0,0,0];slotColorUniform;setup(e){this.slotColorUniform=e.materialUniform("slotColor","vec3",()=>this.slotColor)}buildVertexBody(e){const n=Ie(e.position,1),r=e.instancing?e.instanceMatrix.mul(n):n,s=e.modelMatrix.mul(r);return e.positionWorld.assign(s.xyz),e.instancingColor&&e.instanceColorVarying.assign(e.instanceColor),e.projectionMatrix.mul(e.viewMatrix.mul(s))}buildFragmentBody(e){return Ie(this.slotColorUniform??e.materialUniform("slotColor","vec3",()=>this.slotColor),1)}}const SD=t=>[t&255,t>>>8&255,t>>>16&255],ED=(t,e,n)=>t|e<<8|n<<16,AD=t=>{const[e,n,r]=SD(t);return[e/255,n/255,r/255]},TD=(t,e,n=t.length)=>{let r=0;for(const a of e)a>r&&(r=a);const s=new Uint8Array(r+1),i=Math.min(n,t.length);for(let a=0;a<i;a+=4){const l=ED(t[a],t[a+1],t[a+2]);l>0&&l<=r&&(s[l]=1)}const o=new Set;for(let a=1;a<=r;a++)s[a]===1&&o.add(a);return o},CD=(t,e,n,r)=>t>=r.intervalFrames||e>=r.moveFastTrack*r.moveFastTrack||n<=r.turnFastTrack,MD=(t,e,n)=>Math.abs(t[0]-e[0])<=n&&Math.abs(t[1]-e[1])<=n&&Math.abs(t[2]-e[2])<=n,Eg=t=>Math.max(64,t>>3);class RD extends pr{tilesTexture=null;atlasGrid={columns:1,tilePixels:[1,1],sheetPixels:[1,1]};maxDistance=480;fogStart=200;fogColor=[.53,.81,.92];sunDirection=[1/Math.sqrt(6),2/Math.sqrt(6),1/Math.sqrt(6)];sunLightColor=[1,1,1];moonDirection=[-1/Math.sqrt(6),-2/Math.sqrt(6),-1/Math.sqrt(6)];moonLightColor=[0,0,0];ambientColor=[.2,.2,.2];maxDistanceUniform;fogStartUniform;fogColorUniform;sunDirectionUniform;sunLightColorUniform;moonDirectionUniform;moonLightColorUniform;ambientColorUniform;atlasColumnsUniform;atlasTileUniform;atlasInsetUniform;tilesSampler;constructor(){super(),this.side=Qr.FrontSide}setup(e,n){e.attribute("packed","vec4"),e.varying("brightness","float"),e.varying("blockLight","float"),e.varying("tileIndex","float"),this.atlasColumnsUniform=e.materialUniform("atlasColumns","float",()=>this.atlasGrid.columns),this.atlasTileUniform=e.materialUniform("atlasTile","vec2",()=>[this.atlasGrid.tilePixels[0]/this.atlasGrid.sheetPixels[0],this.atlasGrid.tilePixels[1]/this.atlasGrid.sheetPixels[1]]),this.atlasInsetUniform=e.materialUniform("atlasInset","vec2",()=>[.5/this.atlasGrid.sheetPixels[0],.5/this.atlasGrid.sheetPixels[1]]),this.maxDistanceUniform=e.materialUniform("maxDistance","float",()=>this.maxDistance),this.fogStartUniform=e.materialUniform("fogStart","float",()=>this.fogStart),this.fogColorUniform=e.materialUniform("fogColor","vec3",()=>this.fogColor),this.sunDirectionUniform=e.materialUniform("sunDirection","vec3",()=>this.sunDirection),this.sunLightColorUniform=e.materialUniform("sunLightColor","vec3",()=>this.sunLightColor),this.moonDirectionUniform=e.materialUniform("moonDirection","vec3",()=>this.moonDirection),this.moonLightColorUniform=e.materialUniform("moonLightColor","vec3",()=>this.moonLightColor),this.ambientColorUniform=e.materialUniform("ambientColor","vec3",()=>this.ambientColor),this.tilesTexture!==null&&(this.tilesSampler=e.sampler("tilesAtlas","sampler2D",()=>this.tilesTexture))}buildVertexBody(e){const n=e.attribute("packed","vec4");e.varying("brightness","float").assign(n.y),e.varying("blockLight","float").assign(n.w),e.varying("tileIndex","float").assign(n.z.mul(255).round());const r=Ie(e.position,1),s=e.instancing?e.instanceMatrix.mul(r):r,i=e.modelMatrix.mul(s);e.positionWorld.assign(i.xyz);let o=Xv(n.x.mul(255).round());return e.instancing&&(o=yh(e.instanceMatrix).mul(o)),e.normalWorld.assign(e.normalMatrix.mul(o).normalize()),e.uvVarying.assign(e.uv),e.projectionMatrix.mul(e.viewMatrix.mul(i))}buildFragmentBody(e){const n=e.normalWorld.normalize().toVar(),r=e.positionWorld.toVar(),s=e.uvVarying.toVar(),i=e.varying("brightness","float").toVar(),o=e.varying("blockLight","float").toVar(),a=this.sunDirectionUniform??Oe(.4,.7,.4).normalize(),l=this.sunLightColorUniform??Oe(1),c=this.moonDirectionUniform??Oe(-.4,-.7,-.4).normalize(),u=this.moonLightColorUniform??Oe(0),d=this.ambientColorUniform??Oe(.2),h=this.fogColorUniform??Oe(.53,.81,.92),f=this.fogStartUniform??V(200),m=this.maxDistanceUniform??V(480),p=n.dot(a).max(V(0)),y=n.dot(c).max(V(0)),g=d.add(l.mul(p)).add(u.mul(y));let b=Oe(0,0,1);if(this.tilesSampler!==void 0){const E=this.atlasColumnsUniform??V(1),T=this.atlasTileUniform??Vt(1,1),A=this.atlasInsetUniform??Vt(0,0),M=e.varying("tileIndex","float").toVar(),O=M.div(E).floor(),S=M.sub(O.mul(E)),z=Vt(s.x.fract(),s.y.fract()),w=Vt(T.x.sub(A.x.mul(2)),T.y.sub(A.y.mul(2))),R=Vt(S.mul(T.x).add(A.x).add(z.x.mul(w.x)),O.mul(T.y).add(A.y).add(z.y.mul(w.y)));b=this.tilesSampler.texture(R).rgb}const v=i.max(V(.1)).min(V(1)).toVar(),x=b.mul(g.mul(v).max(o)).toVar(),C=r.sub(e.cameraPosition).length().toVar().smoothstep(f,m).toVar();return x.assign(x.mix(h,C)),Ie(x,1)}}class PD extends pr{fogColor=[.53,.81,.92];waterColor=[.1,.35,.55];waterOpacity=.5;fogColorUniform;waterColorUniform;waterOpacityUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!0,this.side=Qr.FrontSide}setup(e,n){e.attribute("packed","vec4"),e.varying("brightness","float"),e.varying("blockLight","float"),this.fogColorUniform=e.materialUniform("fogColor","vec3",()=>this.fogColor),this.waterColorUniform=e.materialUniform("waterColor","vec3",()=>this.waterColor),this.waterOpacityUniform=e.materialUniform("waterOpacity","float",()=>this.waterOpacity)}buildVertexBody(e){const n=e.attribute("packed","vec4");e.varying("brightness","float").assign(n.y),e.varying("blockLight","float").assign(n.w);const r=Ie(e.position,1),s=e.instancing?e.instanceMatrix.mul(r):r,i=e.modelMatrix.mul(s);e.positionWorld.assign(i.xyz);let o=Xv(n.x.mul(255).round());return e.instancing&&(o=yh(e.instanceMatrix).mul(o)),e.normalWorld.assign(e.normalMatrix.mul(o).normalize()),e.uvVarying.assign(e.uv),e.projectionMatrix.mul(e.viewMatrix.mul(i))}buildFragmentBody(e){const n=this.fogColorUniform??Oe(.53,.81,.92),r=this.waterColorUniform??Oe(.1,.35,.55),s=this.waterOpacityUniform??V(.5),i=e.varying("brightness","float").max(e.varying("blockLight","float")).toVar(),a=e.positionWorld.toVar().sub(e.cameraPosition).normalize(),l=V(.05).add(V(.95).mul(QM(V(1).sub(a.y.abs()),V(3)))).toVar(),c=i.max(V(.1)).min(V(1)).toVar(),u=r.mix(n,l).mul(c),d=l.add(s).min(V(1));return Ie(u,d)}}const ID=2,ur=ID*Je[0],OD=ur/2,tl=Je[0]/2,Ag=6,zD=2*1024*1024,LD=8,$D=200,DD=1,ND=ur,FD=.75,Tg=t=>[Math.floor(t[0]/ur),Math.floor(t[1]/ur),Math.floor(t[2]/ur)],BD=t=>`${t[0]},${t[1]},${t[2]}`,UD=t=>({center:[t[0]*ur+tl,t[1]*ur+tl,t[2]*ur+tl],half:OD}),Cg=t=>t.positions.byteLength+t.packed.byteLength+t.uvs.byteLength+t.indices.byteLength,HD=t=>{const e=t.elements;return[[e[3]-e[0],e[7]-e[4],e[11]-e[8],e[15]-e[12]],[e[3]+e[0],e[7]+e[4],e[11]+e[8],e[15]+e[12]],[e[3]+e[1],e[7]+e[5],e[11]+e[9],e[15]+e[13]],[e[3]-e[1],e[7]-e[5],e[11]-e[9],e[15]-e[13]],[e[3]-e[2],e[7]-e[6],e[11]-e[10],e[15]-e[14]],[e[3]+e[2],e[7]+e[6],e[11]+e[10],e[15]+e[14]]]},Mg=(t,e,n)=>{for(const[r,s,i,o]of t){const a=r>=0?e[0]+n:e[0]-n,l=s>=0?e[1]+n:e[1]-n,c=i>=0?e[2]+n:e[2]-n;if(r*a+s*l+i*c+o<0)return!1}return!0},jD={start:0,count:0};class WD{triMaterial=new RD;triWaterMaterial=new PD;terrain=new Jn;water=new Jn;underwaterTint=new Jn;waterExtinction;seaLevel;uploadBudgetBytes;uploadBytesThisFrame=0;mergesThisFrame=0;totalTriangles=0;meshes;onBlockMeshed;meshed=new Map;seated=new Map;chunkMeshes=new Map;scMembers=new Map;blockSc=new Map;scChunkTerrain=new Map;scChunkWater=new Map;slotCenter=new Map;superchunks=new Map;geometryPool=[];geometryPoolBytes=0;geometryPoolBudgetBytes;dirty=new Set;scLastUpload=new Map;frame=0;contentSlots=new Set;changedTogether=[];probeTerrainMaterial=new Sg;probeWaterMaterial=new Sg;probeDebugMaterial=new kD;occlusionScene=new cb;scCell=new Map;scProbeTerrain=new Map;scProbeWater=new Map;occlusionTarget=null;occlusionReadback=null;lastVisible=null;lastQueryTested=new Set;lastQueryFrame=Number.NEGATIVE_INFINITY;lastQueryPosition=null;lastQueryForward=null;occlusionPending=!1;occlusionOn=!0;occlusionInterval=$D;showProbe=!1;occludedCount=0;lastTimedOut=0;lastNearExempt=0;lastSaw=0;drawnMeshes=0;runOrder=[];tintMaterial;tintMesh;constructor(e){const{blocks:n,waterExtinction:r,seaLevel:s,onBlockMeshed:i}=e;this.waterExtinction=r,this.seaLevel=s,this.onBlockMeshed=i,this.uploadBudgetBytes=e.uploadBytesPerFrame??zD,this.geometryPoolBudgetBytes=this.uploadBudgetBytes*LD,this.probeWaterMaterial.depthWrite=!1,this.meshes=new xD({blocks:n,pool:e.pool,createWorker:e.createWorker,onMeshBuilt:(o,a,l)=>{this.chunkMeshes.set(o,{terrain:a,water:l}),this.meshed.set(o,a.indices.length>0||l.indices.length>0);const c=this.blockSc.get(o);c!==void 0&&(this.superchunks.get(c)?.retire(o),this.heldForGroup(o,c)||this.dirty.add(c)),this.onBlockMeshed?.(o)}}),this.tintMaterial=new Fo({color:1726860,transparent:!0,opacity:0}),this.tintMaterial.depthTest=!1,this.tintMaterial.depthWrite=!1,this.tintMesh=new xn(new Gi(4e3,4e3,4e3),this.tintMaterial),this.tintMesh.visible=!1,this.underwaterTint.add(this.tintMesh)}ensureSuperchunk(e,n){this.scMembers.has(e)||(this.scMembers.set(e,[]),this.scCell.set(e,n))}removeSuperchunk(e){this.scCell.delete(e);const n=this.scMembers.get(e);if(n!==void 0)for(const s of n)this.dropSlot(s.index);this.scMembers.delete(e);const r=this.superchunks.get(e);r!==void 0&&this.recycleGeometryPair(r),this.superchunks.delete(e),this.dirty.delete(e),this.updateTriCount()}takeGeometryPair(){const e=this.geometryPool.pop();return e!==void 0?(this.geometryPoolBytes-=e.bytes,{terrain:e.terrain,water:e.water}):{terrain:new Jr,water:new Jr}}recycleGeometryPair(e){const n=e.bytes,r=e.release();if(this.geometryPoolBytes+n>this.geometryPoolBudgetBytes){r.terrain.dispose(),r.water.dispose();return}this.geometryPool.push({terrain:r.terrain,water:r.water,bytes:n}),this.geometryPoolBytes+=n}dropSlot(e){for(const n of[this.scChunkTerrain,this.scChunkWater]){const r=n.get(e);r!==void 0&&(this.terrain.remove(r),this.water.remove(r),n.delete(e))}for(const n of[this.scProbeTerrain,this.scProbeWater]){const r=n.get(e);r!==void 0&&(this.occlusionScene.remove(r),n.delete(e))}this.contentSlots.delete(e),this.seated.delete(e),this.slotCenter.delete(e)}rebuildSuperchunk(e,n=!1){const r=this.scMembers.get(e),s=this.scCell.get(e);if(r===void 0||s===void 0)return!1;const i=[s[0]*ur,s[1]*ur,s[2]*ur];let o=this.superchunks.get(e);const a=o===void 0;o===void 0&&(o=new wD(i,this.takeGeometryPair()),this.superchunks.set(e,o));let l=!1;for(const f of r){const m=this.chunkMeshes.get(f.index);m===void 0||o.holds(f.index)||(o.join(f.index,f.center,m),this.chunkMeshes.delete(f.index),l=!0)}const c=r.reduce((f,m)=>f+(this.meshed.has(m.index)?0:1),0),u=this.scLastUpload.get(e),d=u!==void 0&&this.frame-u>=Ag;return n||a||l&&c===0||d?(this.scLastUpload.set(e,this.frame),me.count(qn.uploads),this.uploadBytesThisFrame+=o.upload(),this.syncSlotMeshes(e,i,o),this.updateTriCount(),!0):(l&&this.dirty.add(e),!1)}pendingUploadBytes(e){const n=this.scMembers.get(e);if(n===void 0)return 0;const r=this.superchunks.get(e);if(r===void 0){let i=0;for(const o of n){const a=this.chunkMeshes.get(o.index);a!==void 0&&(i+=Ea(a.terrain)+Ea(a.water))}return i}let s=r.pendingBytes;for(const i of n){if(r.holds(i.index))continue;const o=this.chunkMeshes.get(i.index);o!==void 0&&(s+=Ea(o.terrain)+Ea(o.water))}return s}syncSlotMeshes(e,n,r){for(const s of this.scMembers.get(e)){this.slotCenter.set(s.index,s.center);const{terrain:i,water:o}=r.rangeOf(s.index),a=i.count>0,l=o.count>0;if(a){const c=this.slotMesh(this.scChunkTerrain,this.terrain,s.index);this.seatSlotMesh(c,r.terrain,this.worldTerrainMaterial(),n,i);const u=this.probeMesh(this.scProbeTerrain,s.index);this.seatSlotMesh(u,r.terrain,this.probeTerrainMaterial,n,i)}if(l){const c=this.slotMesh(this.scChunkWater,this.water,s.index);this.seatSlotMesh(c,r.water,this.worldWaterMaterial(),n,o);const u=this.probeMesh(this.scProbeWater,s.index);this.seatSlotMesh(u,r.water,this.probeWaterMaterial,n,o)}this.setSlotRange(this.scChunkTerrain,s.index,i),this.setSlotRange(this.scChunkWater,s.index,o),this.setSlotRange(this.scProbeTerrain,s.index,i),this.setSlotRange(this.scProbeWater,s.index,o),this.seated.set(s.index,{terrain:{start:i.start,count:i.count},water:{start:o.start,count:o.count}}),a||l?this.contentSlots.add(s.index):this.contentSlots.delete(s.index)}}probeMesh(e,n){const r=e.get(n);if(r!==void 0)return r;const s=this.slotMesh(e,this.occlusionScene,n),i=AD(n);return s.onBeforeRender=()=>{s.material.slotColor=i},s}slotMesh(e,n,r){let s=e.get(r);return s===void 0&&(s=new xn,s.drawRange={start:0,count:0},n.add(s),e.set(r,s)),s}seatSlotMesh(e,n,r,s,i){e.geometry=n,e.material=r,e.position.set(s[0],s[1],s[2]),e.drawRange.start=i.start,e.drawRange.count=i.count}setSlotRange(e,n,r){const s=e.get(n);s!==void 0&&(s.drawRange.start=r.start,s.drawRange.count=r.count)}worldTerrainMaterial(){return this.showProbe?this.probeDebugMaterial:this.triMaterial}worldWaterMaterial(){return this.showProbe?this.probeDebugMaterial:this.triWaterMaterial}syncProbeMaterials(){for(const e of this.scChunkTerrain.values())e.material=this.worldTerrainMaterial();for(const e of this.scChunkWater.values())e.material=this.worldWaterMaterial()}meshNow(e){this.meshes.buildNow(e)}updateTriCount(){let e=0;for(const n of this.scChunkTerrain.keys())e+=this.seatedRange(n,!0).count/3;for(const n of this.scChunkWater.keys())e+=this.seatedRange(n,!1).count/3;this.totalTriangles=Math.round(e)}seatedRange(e,n){const r=this.seated.get(e);return r===void 0?jD:n?r.terrain:r.water}applyVisibility(e,n){this.occludedCount=0,this.lastTimedOut=0,this.lastNearExempt=0,this.lastSaw=0,this.drawnMeshes=0;for(const[r,s]of this.scChunkTerrain)s.visible=this.chunkVisible(r,!0,e,n,!0);for(const[r,s]of this.scChunkWater)s.visible=this.chunkVisible(r,!1,e,n,!1);this.drawRuns(this.scChunkTerrain,!0),this.drawRuns(this.scChunkWater,!1)}drawRuns(e,n){if(this.showProbe){for(const s of e.values())s.visible&&this.drawnMeshes++;return}const r=this.runOrder;for(const[s,i]of this.scMembers){if(this.superchunks.get(s)===void 0)continue;r.length=0;for(const u of i)e.get(u.index)?.visible===!0&&r.push(u.index);if(r.length===0)continue;r.sort((u,d)=>this.seatedRange(u,n).start-this.seatedRange(d,n).start);let a=e.get(r[0]),l=this.seatedRange(r[0],n).start,c=this.seatedRange(r[0],n).count;for(let u=1;u<r.length;u++){const d=this.seatedRange(r[u],n);if(d.start===l+c){c+=d.count,e.get(r[u]).visible=!1;continue}a.drawRange.start=l,a.drawRange.count=c,this.drawnMeshes++,a=e.get(r[u]),l=d.start,c=d.count}a.drawRange.start=l,a.drawRange.count=c,this.drawnMeshes++}}chunkVisible(e,n,r,s,i){const o=this.slotCenter.get(e);return o===void 0||this.seatedRange(e,n).count<=0||!Mg(r,o,tl)?!1:this.showProbe?!0:this.lastQueryTested.has(e)?this.slotIsNear(e,s)?(this.lastNearExempt++,!0):this.lastVisible!==null&&!this.lastVisible.has(e)?(i&&this.occludedCount++,!1):(this.lastSaw++,!0):(this.lastTimedOut++,!0)}slotIsNear(e,n){const r=this.blockSc.get(e),s=r===void 0?void 0:this.scCell.get(r);return s!==void 0&&MD(s,n,DD)}slotHiddenByOcclusion(e,n){return!this.lastQueryTested.has(e)||this.slotIsNear(e,n)?!1:this.lastVisible!==null&&!this.lastVisible.has(e)}scOccluded(e,n){const r=this.superchunks.get(e)?.members;if(r!==void 0&&r.size>0){for(const o of r)if(!this.slotHiddenByOcclusion(o,n))return!1;return!0}const s=this.scMembers.get(e);if(s===void 0||s.length===0)return!1;let i=!1;for(const o of s)if(this.meshed.get(o.index)===!0&&(i=!0,!this.slotHiddenByOcclusion(o.index,n)))return!1;return i}get triangleCount(){return this.totalTriangles}get lastTickUploadBytes(){return this.uploadBytesThisFrame}get mergedGeometryBytes(){let e=0;for(const n of this.superchunks.values())e+=n.bytes;return e}get blockGeometryBytes(){let e=0;for(const n of this.chunkMeshes.values())e+=Cg(n.terrain)+Cg(n.water);return e}get lastTickMerges(){return this.mergesThisFrame}get dirtySuperchunkCount(){return this.dirty.size}get meshPendingCount(){return this.meshes.pendingCount}get meshInFlightCount(){return this.meshes.inFlightCount}resizeTo(e){for(const n of[...this.blockSc.keys()]){if(n<e)continue;this.dropSlot(n),this.chunkMeshes.delete(n),this.meshed.delete(n),this.meshes.invalidate(n);const r=this.blockSc.get(n);if(this.blockSc.delete(n),r===void 0)continue;const s=this.scMembers.get(r),i=s?.findIndex(o=>o.index===n)??-1;i>=0&&s.splice(i,1),s!==void 0&&s.length===0?this.removeSuperchunk(r):(this.superchunks.get(r)?.retire(n),this.dirty.add(r))}this.meshes.resizeTo(e)}repositionBlock(e,n){const r=Tg(n),s=BD(r),i=this.blockSc.get(e);this.chunkMeshes.delete(e),this.meshed.delete(e),this.seated.delete(e),this.meshes.invalidate(e);for(const o of[this.scChunkTerrain,this.scChunkWater,this.scProbeTerrain,this.scProbeWater]){const a=o.get(e);a!==void 0&&(a.drawRange.start=0,a.drawRange.count=0)}if(this.slotCenter.delete(e),i!==void 0){const o=this.scMembers.get(i),a=o?.findIndex(l=>l.index===e)??-1;a>=0&&o.splice(a,1),o!==void 0&&o.length===0?this.removeSuperchunk(i):o!==void 0&&(this.superchunks.get(i)?.retire(e),this.dirty.add(i))}this.ensureSuperchunk(s,r),this.blockSc.set(e,s),this.scMembers.get(s).push({index:e,center:n})}heldForGroup(e,n){for(let r=0;r<this.changedTogether.length;r++){const s=this.changedTogether[r];if(s.waitingFor.has(e)){if(s.waitingFor.delete(e),s.keys.add(n),s.waitingFor.size===0){for(const i of s.keys)this.dirty.add(i);this.changedTogether.splice(r,1)}return!0}}return!1}onBlocksChanged(e){e.length>1&&this.changedTogether.push({waitingFor:new Set(e),keys:new Set,since:this.frame});for(const n of e)this.onBlockChanged(n)}onBlockChanged(e,n){if(n!==void 0){this.meshes.acceptMesh(e,n);return}this.meshes.requestBuild(e)}setTiles(e,n,r){for(const s of e){const i=Math.max(s.top,s.side,s.bottom);if(i>fg)throw new Error(`[atlas] tile index ${i} is past the ${fg} a vertex can name`)}this.triMaterial.tilesTexture=n,this.triMaterial.atlasGrid=r,this.triMaterial.needsUpdate=!0,this.meshes.setTiles(e)}get tileRects(){return this.meshes.tileRects}applyLighting(e){this.triMaterial.fogColor=e.skyColor,this.triMaterial.sunDirection=e.sunDir,this.triMaterial.sunLightColor=e.sunLight,this.triMaterial.moonDirection=e.moonDir,this.triMaterial.moonLightColor=e.moonLight,this.triMaterial.ambientColor=e.ambient,this.triWaterMaterial.fogColor=e.skyColor}tick(e,n){me.begin(Qe.meshDrain),this.meshes.drain(),me.end(Qe.meshDrain),this.frame++,this.uploadBytesThisFrame=0,this.mergesThisFrame=0;for(let c=this.changedTogether.length-1;c>=0;c--){const u=this.changedTogether[c];if(!(this.frame-u.since<Ag)){for(const d of u.keys)this.dirty.add(d);this.changedTogether.splice(c,1)}}const r=[...this.dirty];this.dirty.clear(),n.updateMatrixWorld(!0);const s=new cr().copy(n.projectionMatrix).multiply(n.matrixWorldInverse),i=HD(s),o=Tg([n.position.x,n.position.y,n.position.z]),a=[];for(const c of r){const u=this.scCell.get(c);if(u===void 0)continue;const{center:d,half:h}=UD(u);if(!Mg(i,d,h)){this.dirty.add(c);continue}if(this.scOccluded(c,o)){this.dirty.add(c);continue}const f=d[0]-n.position.x,m=d[1]-n.position.y,p=d[2]-n.position.z;a.push({key:c,d2:f*f+m*m+p*p,bytes:this.pendingUploadBytes(c)})}a.sort((c,u)=>c.d2-u.d2);let l=0;me.begin(Qe.merge);for(const c of a){if(l>0&&l+c.bytes>this.uploadBudgetBytes){this.dirty.add(c.key);continue}this.rebuildSuperchunk(c.key)&&(l+=c.bytes,this.mergesThisFrame++,me.count(qn.merges))}if(me.end(Qe.merge),this.applyVisibility(i,o),this.seaLevel!==void 0){const c=this.seaLevel-n.position.y;c>0?(this.tintMesh.visible=!0,this.tintMesh.position.copy(n.position),this.tintMaterial.opacity=Math.min(1,1-Math.exp(-this.waterExtinction*c))):this.tintMesh.visible=!1}else this.tintMesh.visible=!1}occlusionFrame(e,n){if(!this.occlusionOn||this.occlusionPending||this.scProbeTerrain.size===0&&this.scProbeWater.size===0)return;const r=e.gl,s=Eg(r.drawingBufferWidth),i=Eg(r.drawingBufferHeight);n.updateMatrixWorld(!0);const o=n.getWorldDirection(),a=this.lastQueryPosition===null?Number.POSITIVE_INFINITY:(n.position.x-this.lastQueryPosition[0])**2+(n.position.y-this.lastQueryPosition[1])**2+(n.position.z-this.lastQueryPosition[2])**2,l=this.lastQueryForward===null?-1:o.x*this.lastQueryForward[0]+o.y*this.lastQueryForward[1]+o.z*this.lastQueryForward[2];if(!CD(this.frame-this.lastQueryFrame,a,l,{intervalFrames:this.occlusionInterval,moveFastTrack:ND,turnFastTrack:FD}))return;this.occlusionTarget??=new UR,this.occlusionTarget.width=s,this.occlusionTarget.height=i;const c=s*i*4;(this.occlusionReadback===null||this.occlusionReadback.length!==c)&&(this.occlusionReadback=new Uint8Array(c));const u=r.getParameter(r.COLOR_CLEAR_VALUE);e.setClearColor(new tn(0,0,0),1),e.render(this.occlusionScene,n,this.occlusionTarget),e.setClearColor(new tn(u[0],u[1],u[2]),u[3]);const d=new Set([...this.scProbeTerrain.keys(),...this.scProbeWater.keys()]);this.occlusionPending=!0,this.runOcclusionQuery(e,this.occlusionTarget,this.occlusionReadback,d,c),this.lastQueryFrame=this.frame,this.lastQueryPosition=[n.position.x,n.position.y,n.position.z],this.lastQueryForward=[o.x,o.y,o.z]}async runOcclusionQuery(e,n,r,s,i){try{const o=await e.readPixelsAsync(n,r);this.lastQueryTested=s,this.lastVisible=TD(o,s,i)}catch{}finally{this.occlusionPending=!1}}get occlusionEnabled(){return this.occlusionOn}set occlusionEnabled(e){this.occlusionOn=e,e&&this.forceOcclusionQuery()}get occlusionIntervalFrames(){return this.occlusionInterval}set occlusionIntervalFrames(e){this.occlusionInterval=Math.max(1,e)}get occlusions(){return this.occludedCount}forceOcclusionQuery(){this.lastQueryFrame=Number.NEGATIVE_INFINITY,this.lastQueryPosition=null,this.lastQueryForward=null}get lastDrawnMeshes(){return this.drawnMeshes}get lastVisibleCount(){return this.lastVisible===null?0:this.lastVisible.size}get occlusionBreakdown(){const e=[`simple ${this.lastTimedOut}`,`near ${this.lastNearExempt}`,`seen ${this.lastSaw}`];return this.occludedCount>0&&e.push(`occluded ${this.occludedCount}`),e.join(", ")}get probeDebug(){return this.showProbe}set probeDebug(e){this.showProbe!==e&&(this.showProbe=e,this.syncProbeMaterials())}dispose(){this.meshes.dispose();for(const e of this.superchunks.values()){const n=e.release();n.terrain.dispose(),n.water.dispose()}for(const e of this.geometryPool)e.terrain.dispose(),e.water.dispose();this.geometryPool.length=0,this.geometryPoolBytes=0}}const VD="/big-mesh-studios/voxelscape/spritesheets/spritesheet_tiles.png",GD="/big-mesh-studios/voxelscape/spritesheets/spritesheet_tiles.xml",YD=async(t,e)=>{const n=e?.tileUrl??VD,r=e?.xmlUrl??GD;try{const[s,i]=await Promise.all([VR(n),fetch(r)]);if(!i.ok)throw new Error(`failed to load "${r}": ${i.status}`);const o=fb(await i.text()),a=jR(o,s.width,s.height);if(a===null)throw new Error("[atlas] the sheet's tiles are not one size on a grid, which is the only layout a tile index can name");const l=WR(o,a,e?.customVoxelTiles);t.setTiles(l,s.texture,a)}catch(s){console.warn("[atlas] spritesheet not applied; voxels stay flat blue.",s)}},XD="bms-voxelscape",Hi="edits",qD=()=>new Promise((t,e)=>{const n=indexedDB.open(XD,1);n.onupgradeneeded=()=>{const r=n.result;r.objectStoreNames.contains(Hi)||r.createObjectStore(Hi)},n.onsuccess=()=>t(n.result),n.onerror=()=>e(n.error)}),ZD=(t,e)=>new Promise((n,r)=>{const i=t.transaction(Hi,"readonly").objectStore(Hi).get(e);i.onsuccess=()=>n(i.result),i.onerror=()=>r(i.error)}),KD=(t,e,n)=>new Promise((r,s)=>{const i=t.transaction(Hi,"readwrite");i.objectStore(Hi).put(n,e),i.oncomplete=()=>r(),i.onerror=()=>s(i.error)}),JD=(t,e)=>{const n=`overlay:${e??"default"}`;let r,s,i=!1;const o=()=>(r??=qD(),r),a=async()=>{i=!1;try{const l=t.snapshot();await KD(await o(),n,JSON.stringify(l))}catch(l){console.warn("[edits] failed to persist overlay to IndexedDB.",l)}};return{async load(){try{const l=await ZD(await o(),n);if(l!==void 0){const c=JSON.parse(l);for(const{w:u,edit:d}of c)t.set(u,d.id,d.updatedAt)}}catch(l){console.warn("[edits] failed to load overlay from IndexedDB.",l)}return t},scheduleSave(){i=!0,s===void 0&&(s=setTimeout(()=>{s=void 0,i&&a()},250))},async saveNow(){s!==void 0&&(clearTimeout(s),s=void 0),await a()}}},QD=.12,eN=({chunkRadius:t,chunkRadiusY:e=t,terrain:n,customVoxelTiles:r,structures:s,spawn:i,placeUri:o,onInitialDraw:a,createWorker:l})=>{const c=()=>p.radius*Je[0],u=new VI,d=JD(u,o??null),h=[],f=new Eh(l===void 0?{}:{createWorker:l,count:1});let m;const p=new Fz({radius:t,yRadius:e,terrain:n,structures:s,onBlockChanged:(T,A)=>{b.add(T),k.onBlockChanged(T,A);for(const M of h)M(T)},onBlockReposition:(T,A)=>{k.repositionBlock(T,A)},onBlockRelease:T=>m?.(T),editLayer:u,tileRects:()=>k.tileRects,pool:f}),y={blocks:p.blocks};m=T=>{const A=p.blocks[T],M=A.store;if(!M.hasFlowing)return;const{min:O,max:S}=Zs(A.center),z=Date.now();let w=!1;const[R,F,D]=M.voxels;for(let Q=0;Q<D;Q++)for(let H=0;H<F;H++)for(let J=0;J<R;J++){const N=M.get(J,H,Q);if(N===an||N===Cr||!kt(N))continue;const U=WI(M,A.center,[J,H,Q]),ae=u.get(U);(ae===void 0||ae.id!==N)&&(u.set(U,N,z),w=!0)}for(const{w:Q,edit:H}of u.queryRange(O,S)){if(!kt(H.id))continue;const J=ks(M,A.center,Q),N=M.inBounds(J[0],J[1],J[2])?M.get(J[0],J[1],J[2]):xe;N!==H.id&&(N!==xe&&!kt(N)||(kt(N)?u.set(Q,N,z):u.set(Q,xe,z),w=!0))}w&&d.scheduleSave()};const b=new Set,v=new Set;let x=-1;const k=new WD({blocks:y.blocks,waterExtinction:QD,seaLevel:n.seaLevel,pool:f,onBlockMeshed:T=>{!b.has(T)||v.has(T)||(v.add(T),a?.({drawn:v.size,total:y.blocks.length,spawnDrawn:v.has(x)}))}}),C=()=>{const T=[];for(let A=0;A<y.blocks.length;A++){if(!p.hasTerrain(A))continue;const M=y.blocks[A];u.applyToBlock(M)>0&&T.push(A)}for(const A of T)k.onBlockChanged(A)},E=T=>{if(T.length===0)return 0;const A=Ob(u,T);if(A===0)return 0;const M=new Set;for(const{w:S}of T)for(let z=0;z<y.blocks.length;z++){const{min:w,max:R}=Zs(y.blocks[z].center);S[0]>=w[0]&&S[0]<=R[0]&&S[1]>=w[1]&&S[1]<=R[1]&&S[2]>=w[2]&&S[2]<=R[2]&&M.add(z)}const O=[];for(const S of M){const z=y.blocks[S];u.applyToBlock(z)>0&&O.push(S)}for(const S of O)k.onBlockChanged(S);return d.scheduleSave(),A};return x=p.fillFrom(i[0],i[1],i[2]),YD(k,{customVoxelTiles:r}).then(()=>k.meshNow(x)),d.load().then(C),{blocks:y.blocks,renderer:k,get voxelBytes(){let T=0;for(const A of y.blocks)T+=A.store.data.byteLength+A.light.data.byteLength;return T},get fillPendingCount(){return p.fillPendingCount},get fillInFlightCount(){return p.fillInFlightCount},terrain:k.terrain,water:k.water,underwaterTint:k.underwaterTint,editLayer:u,get ringRadius(){return c()},get chunkRadius(){return p.radius},get chunkRadiusY(){return p.yRadius},get lodBands(){return p.bands},reshape({chunkRadius:T,chunkRadiusY:A,lodBands:M}){const O=T??p.radius,S=A??p.yRadius;k.resizeTo(Ah(O,S)),p.reshape(O,S,M??p.bands)},setStructures(T){return p.setStructures(T)},workerPool:f,reapplyEdits:C,applyEdits:E,heightAt(T,A){const M=nA(p.query,T,A,n);return M===-1/0?$o(T,A,n):M},groundHeightAt(T,A,M){return rA(p.query,T,A,M)},inWaterAt(T,A,M){return iA(p.query,T,A,M)},lavaAt(T,A,M){return oA(p.query,T,A,M)},solidAt(T,A,M){return sA(p.query,T,A,M)},scrollTo(T,A,M){p.scrollTo(T,A,M)},cellReady(T,A,M){return p.slotAt(T,A,M)!==void 0},scheduleSave(){d.scheduleSave()},onBlockFilled(T){h.push(T)},blockIndexAtVoxel(T){return p.slotAt((T[0]+.5)*ft,(T[1]+.5)*ft,(T[2]+.5)*ft)},dispose(){p.dispose(),k.dispose(),d.saveNow()}}},tN=8900331,nN={moveX:0,moveY:0,jump:!1,jumpHeld:!1,lookDx:0,lookDy:0,primary:!1,click:!1,tap:!1,secondary:!1,secondaryHeld:!1,secondaryReleased:!1,use:!1,select:null,wheel:0},rN=t=>new Blob([t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength)]),sN=({antialias:t=!1,chunkRadius:e=4,chunkRadiusY:n=2,terrain:r=Fi,customVoxelTiles:s,structures:i,place:o,activeProject:a,placeEditorOpen:l,mode:c,placeUri:u=Xd,spawn:d=[0,0,0],debugPerf:h=!1,navigate:f=g=>{window.location.hash=g},onDebugStats:m,onNotice:p,player:y}={})=>{const g=c===void 0||c==="multi"||c==="multi:edit",b=c===void 0||c==="solo:edit"||c==="multi:edit",v=c==="multi:edit"?"everyone":"self",[x,k]=ye(""),[C,E]=ye(null),[T,A]=ye(null),[M,O]=ye(null),[S,z]=ye(null),[w,R]=ye(null),[F,D]=ye(null),[Q,H]=ye(!1),[J,N]=ye({}),[U,ae]=ye(h),[ie,q]=ye(!1),be=()=>({heapBytes:performance.memory?.usedJSHeapSize,voxelBytes:P.voxelBytes,mergedGeometryBytes:P.renderer.mergedGeometryBytes,blockGeometryBytes:P.renderer.blockGeometryBytes,blocks:P.blocks.length,chunkRadius:P.chunkRadius,triangles:P.renderer.triangleCount,fillsPending:P.fillPendingCount,meshesPending:P.renderer.meshPendingCount}),[De,Se]=ye(t),[Me,nt]=l??ye(!1);let Ne=u,ot=null;const mt=l$(),_=E3({groundHeightAt:(L,$)=>P.heightAt(L,$)}),[K,Z]=ye({drawn:0,total:Ah(e,n),spawnDrawn:!1}),P=eN({chunkRadius:e,chunkRadiusY:n,terrain:r,customVoxelTiles:s,structures:i,spawn:d,placeUri:u,onInitialDraw:Z}),I=new AR(50,1,.1,P.ringRadius+200),B=[],re=[],se=[],j=v$({camera:I,terrain:{heightAt:(L,$)=>P.heightAt(L,$),groundHeightAt:(L,$,Y)=>Math.max(P.groundHeightAt(L,$,Y),x$(B,L,$,Y)),inWaterAt:(L,$,Y)=>P.inWaterAt(L,$,Y),solidAt:(L,$,Y)=>P.solidAt(L,$,Y)||_$(B,L,$,Y),surfaceVelocityAt:(L,$,Y)=>k$(B,L,$,Y),mediumAt:(L,$,Y)=>{let we=0,it=0,Zt=null,Ht=1,er=0,Sn=!1;for(const It of se)L<It.min[0]||L>It.max[0]||$<It.min[1]||$>It.max[1]||Y<It.min[2]||Y>It.max[2]||(Sn=!0,It.kind==="push"?(we+=It.vx,it+=It.vz,It.vy!==void 0&&(Zt=(Zt??0)+It.vy)):(It.speedScale<Ht&&(Ht=It.speedScale),It.sink>er&&(er=It.sink)));return Sn?{pushVx:we,pushVz:it,pushVy:Zt,speedScale:Ht,sink:er}:null}},spawn:d,player:y}),he=j.player.position.y,oe={x:d[0],y:he,z:d[2],yaw:0},_e=()=>{j.player.position.set(oe.x,oe.y,oe.z),j.player.yaw=oe.yaw,j.player.pitch=0,j.player.vx=0,j.player.vy=0,j.player.vz=0,j.player.onGround=!1,j.player.flying=!1,Re.respawn(),mr.event("respawn")},Re=new lP({onFallDone:_e});let He=null;const _t=new Set;let W=null;const ee=o===void 0?null:az(oz(o.seed,o.entry)),ce=new hm({getFigures:()=>{const L=[];for(const $ of W?.npcs()??[]){const Y=W?.npcPose($.id)??null;L.push(Y===null?$:{id:$.id,x:$.x+Y.dx,y:$.y+Y.dy,z:$.z+Y.dz,yaw:$.yaw+Y.yaw,spin:{axis:Y.spinAxis,angle:Y.spinAngle}})}return L},modelFor:L=>{const $=W?.npc(L)??null;return $!==null&&$.modelUri!==""?$.modelUri:$!==null&&$.model!==""?$.model:L==="sable"?"npc-sable.zip":L==="rook"?"npc-rook.zip":"zombie.zip"}}),fe=new hm({getFigures:()=>{const L=[];for(const $ of W?.props()??[]){const Y=W?.propPose($.id)??null;L.push(Y===null?$:{id:$.id,x:$.x+Y.dx,y:$.y+Y.dy,z:$.z+Y.dz,yaw:$.yaw+Y.yaw,height:$.height,spin:{axis:Y.spinAxis,angle:Y.spinAngle}})}return L},modelFor:L=>W?.prop(L)?.model??""}),at=new gz(()=>W?.fires()??[]),dt=new Sz(()=>W?.explosions()??[]),Xe=new uz(P.blocks,L=>P.renderer.onBlocksChanged(L)),yt=()=>{B.length=0,re.length=0;for(const L of W?.props()??[]){if(!L.solid&&!L.hazard)continue;const $=fe.aimBounds(L.id);if($===null)continue;const Y=W?.propPose(L.id)??null,we=L.x+(Y?.dx??0),it=L.y+(Y?.dy??0),Zt=L.z+(Y?.dz??0),Ht={minX:we-$.half,maxX:we+$.half,minY:it,maxY:it+$.height,minZ:Zt-$.half,maxZ:Zt+$.half,...Y!==null?{yaw:L.yaw+Y.yaw,vx:Y.vx,vy:Y.vy,vz:Y.vz}:L.conveyor!==void 0?{vx:L.conveyor.vx,vz:L.conveyor.vz}:{}};L.solid&&B.push(Ht),L.hazard&&re.push({id:L.id,box:Ht})}},xt=()=>{se.length=0;for(const L of W?.fields()??[])se.push(L)},hn=()=>{const L=j.player.position,$=j.player.config.halfSize,Y=new Set;for(const{id:we,box:it}of re)L.x+$>=it.minX&&L.x-$<=it.maxX&&L.y+$>=it.minY&&L.y-$<=it.maxY&&L.z+$>=it.minZ&&L.z-$<=it.maxZ&&(Y.add(we),_t.has(we)||W?.touched(we));_t.clear();for(const we of Y)_t.add(we)},Yt=()=>{const L=[];for(const $ of W?.npcs()??[]){const Y=ce.aimBounds($.id);L.push({id:$.id,x:$.x,y:$.y,z:$.z,half:Y?.half,height:Y?.height,yaw:$.yaw})}return L},Fe=async L=>{for(const[$,Y]of Object.entries(L))try{const we=await ml(rN(Y));ce.setFigure($,we),fe.setFigure($,we)}catch(we){p?.(`model "${$}" did not load — ${we instanceof Error?we.message:String(we)}`)}},Ee=new B$,qe=new F$({camera:I}),rn=new tD({blocks:P.blocks,resolve:L=>P.blockIndexAtVoxel(L),onBlocksEdited:L=>P.renderer.onBlocksChanged(L)});P.onBlockFilled(L=>rn.wakeBlock(L));const bt=new N$({blocks:P.blocks,layer:P.editLayer,inventory:Ee,onBlocksEdited:L=>P.renderer.onBlocksChanged(L),onEditRecorded:()=>P.scheduleSave(),onEdit:(L,$,Y)=>Ye.broadcastEdits([{x:L[0],y:L[1],z:L[2],id:$,ts:Y}]),onVoxelWritten:(L,$)=>rn.wakeVoxel(L,$),getLook:()=>j.look(),getPlayerVoxels:()=>j.occupiedVoxels(),terrain:r}),$n=()=>{bt.setEnabled(b&&(v!=="everyone"||ke.did!==null))},sn={editing:bt,look:()=>j.look(),position:()=>j.player.position,strikeables:()=>Yt(),strike:(L,$,Y,we)=>{ce.flashHit(L),W?.hit(L,$,Y,we)},setGuarding:L=>Re.setGuarding(L)},Be=Object.fromEntries(jr.map(L=>[L,or[L].tool(sn)]));let rt=null;const Pe=L=>{L!==rt&&(rt!==null&&Be[rt].stow(),rt=L)},ke=new vO({layer:P.editLayer,seed:r.seed,place:u,editScope:v,getHandle:()=>"",onMerged:L=>{L>0&&(P.reapplyEdits(),P.scheduleSave())},onConnected:L=>{g&&Ye.start(),$n(),ke.sync(),ke.resolvePicture(L).then(async $=>{$!==null&&j.setPicture(await createImageBitmap($))}).catch(()=>{})},onSignedOut:()=>{Ye.stop(),$n()}});$n(),ke.sync();const Ye=new ML({getRepoClient:()=>ke.repoClient,getDid:()=>ke.did,seed:r.seed,scope:u,getPose:()=>({x:j.player.position.x,y:j.player.position.y,z:j.player.position.z,yaw:j.player.yaw,pitch:j.player.pitch}),resolveHandle:L=>ke.resolveHandle(L),resolvePicture:L=>ke.resolvePicture(L),createSignaling:r$,camera:I,onRemoteEdits:(L,$)=>{P.applyEdits($.map(Y=>({w:[Y.x,Y.y,Y.z],edit:{id:Y.id,updatedAt:Y.ts}})))},onRemoteScriptEntities:(L,$)=>{for(const Y of $)W?.applyRemoteNpc(Y.id,Y.x,Y.y,Y.z,Y.yaw)},onRemoteScriptEvents:(L,$)=>{W?.applyRemoteEvents($)},onRemotePlayerDamage:(L,$)=>{$.target===(ke.did??"")&&dc($.amount,"remote-script")}}),fn=wO(),ts=4e3,Pt=new Set,Xt=new Set,pn=new Map,Dn=L=>{if(L===""||Pt.has(L)||Xt.has(L))return;const $=pn.get(L);$!==void 0&&Date.now()-$<ts||(Xt.add(L),(async()=>{try{const Y=await fn.byUri(L);await ce.loadModel(L,await fn.file(Y)),Pt.add(L),pn.delete(L)}catch(Y){pn.set(L,Date.now()),p?.(`model "${L}" did not load — ${Y instanceof Error?Y.message:String(Y)}`)}finally{Xt.delete(L)}})())},Lr=Yy(),mn=Kk({getClient:()=>ke.repoClient,getRepo:()=>ke.did});let Ts=null,qt=-1;const ew=()=>{const L=W?.cutsceneFor("")??null;if(L===null)return;if(L.startMs!==qt){qt=L.startMs;const Y=I.getWorldDirection(new gt);Ts={x:I.position.x,y:I.position.y,z:I.position.z,lookX:I.position.x+Y.x,lookY:I.position.y+Y.y,lookZ:I.position.z+Y.z},H(!0)}if(Ts===null)return;const $=iz(L,W?.now()??Date.now(),Ts);I.position.set($.x,$.y,$.z),I.lookAt($.lookX,$.lookY,$.lookZ),$.done&&(W?.clearCutscene(""),qt=-1,Ts=null,H(!1),j.place())},Hh=()=>{R(null),O(null),H(!1),qt=-1,Ts=null,oe.x=d[0],oe.y=he,oe.z=d[2],oe.yaw=0,He=null,_t.clear(),j.player.position.set(d[0],he,d[2]),j.player.vx=0,j.player.vy=0,j.player.vz=0,j.player.onGround=!1,j.player.flying=!1,Re.respawn(),Xe.clear(),W?.restart()},Nn=async()=>{if(W===null){const{ScriptConsole:L}=await Sr(async()=>{const{ScriptConsole:$}=await import("./script-console-DpFptnlc.js");return{ScriptConsole:$}},[]);W=new L({heightAt:($,Y)=>P.heightAt($,Y),solidAt:($,Y,we)=>P.solidAt($,Y,we),waterAt:($,Y,we)=>P.inWaterAt($,Y,we),getPlayers:()=>[{did:ke.did??"",x:j.player.position.x,y:j.player.position.y,z:j.player.position.z},...Ye.peerPositions()],now:()=>Ye.now(),report:$=>p?.($),onDialog:($,Y)=>{$===""&&O(Y)},onEnding:($,Y)=>{$===""&&(R(Y),Y!==null&&ee?.record(Y.title))},onRestart:()=>Hh(),onTime:$=>{$.clear===!0&&_.dayNight.clearOverride(),$.seconds!==void 0&&_.dayNight.jumpTo($.seconds),$.speed!==void 0&&_.dayNight.setSpeed($.speed)},onNarrate:($,Y)=>D(Y),onPlayerPlace:($,Y)=>{$!==""&&$!==(ke.did??"")||(j.player.position.set(Y.x,Y.y===void 0?j.player.position.y:Y.y+j.player.config.halfSize,Y.z),Y.yaw!==void 0&&(j.player.yaw=Y.yaw),j.player.vx=0,j.player.vy=0,j.player.vz=0,j.player.onGround=!1,j.place())},onPlayerFace:($,Y)=>{$!==""&&$!==(ke.did??"")||(j.player.yaw=Math.atan2(Y.x-j.player.position.x,Y.z-j.player.position.z),j.place())},onPlayerSpeed:($,Y)=>{$!==""&&$!==(ke.did??"")||(j.player.config.speed=Rl.speed*Y)},onPlayerJump:($,Y)=>{$!==""&&$!==(ke.did??"")||(j.player.config.jumpSpeed=Rl.jumpSpeed*Y)},onPlayerDamage:($,Y,we)=>{$===""||$===(ke.did??"")?dc(Y,"script",we):Ye.broadcastPlayerDamage({target:$,amount:Y})},onEntityMove:$=>{Ye.broadcastScriptEntities([$])},onEvent:$=>{Ye.broadcastScriptEvents([$])},onCheckpoint:($,Y)=>{$===""&&(oe.x=Y.x,oe.z=Y.z,Y.y!==void 0&&(oe.y=Y.y+j.player.config.halfSize),Y.yaw!==void 0&&(oe.yaw=Y.yaw))},onKill:$=>{$===""&&Re.kill()},onRespawn:$=>{$===""&&_e()},onVoid:$=>{He=$},onFire:$=>{Xe.seed($)},endings:()=>ee?.seen()??[]})}return W};o!==void 0&&(Fe(o.models??{}),Nn().then(L=>L.loadProject(o.files,o.entry,o.seed,o.models??{})).then(L=>p?.(L)).catch(L=>p?.(`place script did not load — ${L instanceof Error?L.message:String(L)}`)));const jh=L=>{Nn().then($=>$.talkTo(L)).catch(()=>{})},tw=L=>{const $=W?.heldItem()?.id??"";Nn().then(Y=>Y.use(L,$)).catch(()=>{})},nw=L=>{Nn().then($=>$.useItem(L)).catch(()=>{})},rw=L=>{M()!==null&&Nn().then($=>$.chooseOption(L)).catch(()=>{})},sw=()=>{M()!==null&&Nn().then(L=>L.leaveTalk()).catch(()=>{})},iw={demo:()=>Nn().then(L=>L.loadSample()),state:()=>Nn().then(L=>L.describe()),talk:L=>Nn().then($=>$.talk(L)),choose:L=>Nn().then($=>$.choose(L)),leave:()=>Nn().then(L=>L.leave())};(async()=>{for(const L of["npc-sable.zip","npc-rook.zip","zombie.zip"])try{const $=await fetch(`/big-mesh-studios/voxelscape/models/${L}`);$.ok&&ce.setFigure(L,await ml(await $.blob()))}catch{}})();let Wh;const Vh=new Map,qo=Be.bucket,cc=L=>{const $=L===null?Wh:Vh.get(L);$!==void 0&&(qe.setModel("bucket",$.model),N(Y=>({...Y,bucket:$.bbox})))};qo.onFillChange=()=>cc(qo.fill);for(const L of jr){const $=or[L].sprite;$!==null&&Kp($).then(({model:Y,bbox:we})=>{L==="bucket"&&(Wh={model:Y,bbox:we},cc(qo.fill)),qe.setModel(L,Y),N(it=>({...it,[L]:we}))}).catch(Y=>console.warn(`[${L}] not drawn; the player holds nothing.`,Y))}for(const L of["water","lava"])Kp(`bucket_${L}`).then(({model:$,bbox:Y})=>{Vh.set(L,{model:$,bbox:Y}),cc(qo.fill)}).catch($=>console.warn(`[bucket_${L}] not drawn; the fill shows empty.`,$));const uc=new cb;uc.add(_.sky,P.terrain,j.body,Ye.avatars,ce.group,fe.group,at.group,dt.group,P.water,_.weatherEffects,P.underwaterTint,I),ke.init().then(L=>p?.(L));const Zo=new Gv;let Ko;const mr=new FP(me,{setup:()=>({href:window.location.href,userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,devicePixelRatio:window.devicePixelRatio,viewport:Ko&&{width:Ko.width,height:Ko.height},terrain:r,window:{chunkRadius:P.chunkRadius,chunkRadiusY:P.chunkRadiusY,lodBands:P.lodBands},render:{multisampling:De(),resolution:Zo.describe()},workers:P.workerPool.describe(),clock:_.dayNight.describe(),spawn:d}),pose:()=>{const L=j.player.position,$=I.getWorldDirection(new gt);return{position:[L.x,L.y,L.z],facing:[$.x,$.y,$.z]}}}),dc=(L,$,Y)=>{const we=Re.takeDamage(L);if(we===0)return;const it=Y===void 0?null:W?.npc(Y)??null;mr.event(Re.dead?"death":"damage",{cause:$,amount:we,hp:Re.hp,attacker:it===null?void 0:{id:Y,position:[it.x,it.y,it.z]}})},ow={open:Me,setOpen:nt,get accountDid(){return ke.did},resolveHandle:L=>ke.resolveHandle(L),get isMine(){const L=Fs(Ne);return L!==null&&L.repo===ke.did},get owner(){return Fs(Ne)?.repo??null},activeProject:a??null,defaultSeed:r.seed,places:Lr,publisher:mn,models:fn,runScript:(L,$,Y,we,it)=>(we!==void 0&&Fe(we),(async()=>{const Zt=await Nn();let Ht="";try{const Sn=await U0({files:L,entry:$,models:we??{},seed:Y,region:B0(it??d)}),It=`${Sn.length} structure shape${Sn.length===1?"":"s"}`;Ht=Sn.length===0?"":P.setStructures(Sn)?` — ${It} rebuilt`:` — ${It} already in place`}catch(Sn){Ht=` — structures unchanged (this plan did not compile: ${Sn instanceof Error?Sn.message:String(Sn)})`}return`${await Zt.loadProject(L,$,Y,we??{})}${Ht}`})()),async claim(L){Ne=L;const $=Fs(L);if($===null)return;const Y=await ke.resolveHandle($.repo);f(`/${Y}/${$.rkey}`)}},aw=Hz({renderer:P.renderer,workerPool:P.workerPool,world:P,dayNight:_.dayNight,weather:_.weather,sound:_.sound,atproto:ke,multiplayer:Ye,health:Re,places:Lr,placePublisher:mn,defaultSeed:r.seed,placeUri:u,navigate:f,togglePlaceEditor:()=>{const L=!Me();return nt(L),L?"place editor opened — write your place's scripts, run them, then publish":"place editor closed"},script:iw,resolution:Zo,setView:L=>(j.setFirstPerson(L==="first"),`camera: ${L}-person view`),setPlayerVisible:L=>(j.setCubeVisible(L),L?"player cube shown":"player cube hidden"),setMoveSpeed:L=>(L!==void 0&&(j.player.config.speed=L),`move speed: ${j.player.config.speed} units/sec`),setLookSensitivity:L=>(L!==void 0&&(j.player.config.lookSensitivity=L),`look sensitivity: ${j.player.config.lookSensitivity} rad/px`),setFlying:L=>{const $=L??!j.player.flying;return j.player.flying=$,$&&(j.player.vy=0,j.player.onGround=!1),$?"flying":"walking"},setNoClip:L=>{const $=L??!j.player.noclip;return j.player.noclip=$,$&&(j.player.vy=0,j.player.onGround=!1),$?"no-clip":"collisions on"},setDebugPerf:L=>"performance readout unavailable in this build",traceStart:L=>{if(mr.recording)return"a walk is already being traced; /trace:stop writes it";const $=mr.start(L);return[`tracing "${L}"`,BP($),"/trace:mark what you see, /trace:stop to write it"].join(`
`)},traceMark:L=>mr.recording?(mr.mark(L),`marked ${mr.marked}: ${L||"(no note)"}`):"nothing is being traced; /trace:start first",traceSnap:async L=>{const $=await mr.snap(L);return Yh($,`snapped "${L||"(no note)"}"`)},traceStop:async()=>{const L=await mr.stop();if(L===void 0)return"nothing is being traced";const $=`traced ${L.seconds.toFixed(0)}s, ${L.marks.length} mark${L.marks.length===1?"":"s"}, ${L.events.length} logged event${L.events.length===1?"":"s"}`;return Yh(L,$)},setShowStats:L=>{const $=L??!ie();return q($),$?"stats shown":"stats hidden"},setMultisampling:L=>{const $=L??!De();return $===De()?`multisampling is already ${$?"on":"off"}`:(Se($),$?"multisampling on — remaking the canvas":"multisampling off — remaking the canvas")}}),Gh=new tn(tN);let Jo=null,hc=0;const lw=1,cw=()=>{if(!me.armed)return;const L=P.renderer;me.gauge(Ct.uploadBytes,L.lastTickUploadBytes),me.gauge(Ct.merges,L.lastTickMerges),me.gauge(Ct.triangles,L.triangleCount),me.gauge(Ct.occluded,L.occlusions),me.gauge(Ct.visible,L.lastVisibleCount),me.gauge(Ct.drawnMeshes,L.lastDrawnMeshes),me.gauge(Ct.meshPending,L.meshPendingCount),me.gauge(Ct.meshInFlight,L.meshInFlightCount),me.gauge(Ct.dirtySuperchunks,L.dirtySuperchunkCount),me.gauge(Ct.fillPending,P.fillPendingCount),me.gauge(Ct.fillInFlight,P.fillInFlightCount);const $=P.voxelBytes,Y=L.mergedGeometryBytes,we=L.blockGeometryBytes;me.gauge(Ct.voxelBytes,$),me.gauge(Ct.mergedGeometryBytes,Y),me.gauge(Ct.blockGeometryBytes,we),me.gauge(Ct.residentBytes,$+Y+we);const it=j.player.position;me.gauge(Ct.cellReady,P.cellReady(it.x,it.y,it.z)?1:0),me.gauge(Ct.playerX,it.x),me.gauge(Ct.playerY,it.y),me.gauge(Ct.playerZ,it.z)},uw=L=>{const $=K();if($.drawn<$.total&&Zo.hold(),$.spawnDrawn,$.spawnDrawn&&!Me()&&P.cellReady(j.player.position.x,j.player.position.y,j.player.position.z)){if(Re.tick(L),Re.dead)j.placeDeath(Re.fallProgress),Pe(null),E(null),qe.show(null,null);else{me.begin(Qe.player);const we=mt.consume(),it=W?.controlsLocked("")??!1;if(yt(),xt(),j.move(L,it?nN:we),hn(),me.end(Qe.player),it)E(null),A(null),Pe(null),qe.show(null,null);else{we.select!==null&&Ee.selectSlot(we.select),we.wheel!==0&&Ee.selectStep(we.wheel),Pe(Ee.selectedId);const Ht=Be[Ee.selectedId],er=j.look(),Sn=[er.origin[0],er.origin[1],er.origin[2]],It=[er.direction[0],er.direction[1],er.direction[2]],Xh=Yt();for(const jt of W?.props()??[]){const Zh=fe.aimBounds(jt.id);Xh.push({id:jt.id,x:jt.x,y:jt.y,z:jt.z,half:Zh?.half,height:Zh?.height})}const En=jb(Sn,It,Xh),Qo=En===null?null:W?.npc(En.id)??null,hw=En===null?null:W?.prop(En.id)??null,fc=W?.heldItem()!==null,qh=En===null?null:`${En.id}:${fc}`;qh!==ot&&(ot=qh,A(En===null?null:Qo!==null&&!fc?{id:En.id,name:Qo.name,action:"talk"}:{id:En.id,name:Qo?.name??hw?.name??En.id,action:"use"}));const Cs=Ht.pick();E(Cs.primary);const pc=M()===null&&En!==null&&(we.use||(we.tap||we.click)&&Cs.primary?.kind!=="actor");if(pc)Qo!==null&&!fc?jh(En.id):tw(En.id);else if(we.use||we.tap&&Cs.primary?.kind!=="actor"){const jt=W?.heldItem()??null;jt!==null&&nw(jt.id)}if(we.primary&&!pc){const jt=Ht.primary(Cs);jt!==null&&k(jt)}if(!pc&&we.tap&&Cs.primary?.kind==="actor"){const jt=Ht.primary(Cs);jt!==null&&k(jt)}if(we.secondary){const jt=Ht.secondary(Cs);jt!==null&&k(jt)}Ht.update(L,we),qe.show(j.firstPerson?Ee.selectedId:null,Ht.pose())}me.begin(Qe.scroll),P.scrollTo(j.player.position.x,j.player.position.y,j.player.position.z),me.end(Qe.scroll),j.place(),ew();const Zt=j.player.position;hc-=L,(P.lavaAt(Zt.x,Zt.y,Zt.z)||P.lavaAt(Zt.x,Zt.y+1.5,Zt.z))&&hc<=0&&(dc(lw,"lava"),hc=.5),He!==null&&j.player.position.y-j.player.config.halfSize<He&&(Re.kill(),W?.died("void"))}me.begin(Qe.flow),rn.tick(L),me.end(Qe.flow),me.begin(Qe.multiplayer),Ye.tick(L),me.end(Qe.multiplayer),me.begin(Qe.figures);for(const we of W?.npcs()??[])Dn(we.modelUri);ce.tick(L),fe.tick(L),at.tick(L),dt.tick(L),me.end(Qe.figures),z(W?.heldItem()??null),W?.updatePosition(j.player.position.x,j.player.position.y,j.player.position.z),W?.pump()}me.begin(Qe.environment);const Y=_.tick(L,I);Gh.set(Y.skyColor[0],Y.skyColor[1],Y.skyColor[2]),P.renderer.applyLighting(Y),ce.applyLighting(Y),fe.applyLighting(Y),qe.applyLighting(Y),me.end(Qe.environment),me.begin(Qe.rendererTick),P.renderer.tick(L,I),me.end(Qe.rendererTick),cw()},Yh=async(L,$)=>{try{const Y=await fetch("/__walktrace",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(L)});if(!Y.ok)return`${$}, but the server refused it (${Y.status})`;const{path:we}=await Y.json();return`${$} — written to ${we}`}catch{return`${$}, but there is no development server to write it to`}},dw=L=>{Ko=L;const $=G$({canvas:L,scene:uc,camera:I,antialias:De(),debugPerf:U,resolution:Zo,onDebugStats:m,onFrame:uw,clearColor:()=>Gh,beforeRender:(Y,we)=>P.renderer.occlusionFrame(Y,we),afterRender:Y=>mr.takePicture(Y),describeStats:()=>`tris: ${P.renderer.triangleCount.toLocaleString()} | uploaded: ${P.renderer.lastTickUploadBytes.toLocaleString()} B | occluded: ${P.renderer.occlusions}`});return Jo=()=>{Jo=null,$.dispose()},Jo};return{scene:uc,camera:I,player:j.player,input:mt,inventory:Ee,health:Re,commands:aw,placeEditor:ow,debugPerf:U,showStats:ie,stats:be,editStatus:x,target:C,npcAim:T,dialog:M,scriptItem:S,ending:w,narration:F,dismissNarration:()=>D(null),cutscene:Q,hud:()=>W?.hud()??[],restart:Hh,talkTo:jh,choose:rw,leaveDialog:sw,icons:J,loading:K,multisampling:De,mount:dw,dispose(){Jo?.(),W?.dispose(),W=null,P.dispose(),Ye.dispose(),ke.dispose(),_.dispose(),ce.clear(),fe.clear(),at.clear(),dt.clear(),qe.dispose(),mt.dispose()}}};var iN=pe("<div>"),oN=pe("<div><!><!><!><!><!><!><!><!>"),aN=pe("<canvas>"),lN=pe("<div role=dialog aria-label=ending><div><h1></h1><p></p><button>Play again"),cN=pe("<div><div>");const Rg=6,uN="home",Qv=Bl(),dN=t=>{const[e,n]=ye(null),r=ye(!1),s=PC({onCommand:i=>e()?.commands.run(i)??"the world is still loading — try again in a moment",commands:()=>e()?.commands.help()??[]});return te(Qv,{value:{terminal:s,setCurrentVoxelscape:n,placeEditorOpen:r},get children(){return[Qt(()=>t.children),te($e,{get when(){return e()},children:i=>te(OC,{terminal:s,voxelscape:i})})]}})},hN=t=>{let e;const n=ec("(any-pointer: coarse)"),r=PP(),s=sN({terrain:t.launch.terrain,spawn:t.launch.spawn,structures:t.launch.structures,place:t.launch.place,activeProject:t.launch.project,placeEditorOpen:t.placeEditorOpen,mode:t.launch.mode,placeUri:t.launch.placeUri,chunkRadius:yN(),antialias:gN(),navigate:t.navigate,onDebugStats:i=>{e!==void 0&&(e.textContent=i)},onNotice:i=>{t.terminal.print(i),r.show(()=>i,Rg*1e3)}});return Ws(()=>{t.setCurrent(s)}),Ws(()=>{t.launch.notice!==void 0&&r.show(()=>t.launch.notice,Rg*1e3)}),On(s.dispose),te(j0,{value:s,get children(){var i=oN(),o=i.firstChild,a=o.nextSibling,l=a.nextSibling,c=l.nextSibling,u=c.nextSibling,d=u.nextSibling,h=d.nextSibling,f=h.nextSibling;return ne(i,te(cn,{get each(){return[s.multisampling()]},children:()=>te(fN,{})}),o),ne(i,te($e,{get when(){return n()},get children(){return te(PA,{})}}),a),ne(i,te(tP,{}),l),ne(i,te(fP,{}),c),ne(i,te(iM,{}),u),ne(i,te(pN,{}),d),ne(i,te(LP,{}),h),ne(i,te(r.Stack,{get children(){return[te($e,{get when(){return s.showStats()},get children(){return te(Sl,{get children(){return te(_P,{})}})}}),te($e,{get when(){return s.debugPerf()},get children(){return te(Sl,{get children(){var m=iN();return Qn(()=>p=>{e=p},m),de(()=>wr["debug-perf"],(p,y)=>{X(m,p,y)}),m}})}}),te($P,{})]}}),f),de(()=>wr.container,(m,p)=>{X(i,m,p)}),i}})},fN=()=>{const t=fr();let e;Ws(()=>t.mount(e));var n=aN();return Qn(()=>r=>{e=r},n),c_(n,m_({get class(){return wr.canvas}},()=>t.input.canvasHandlers)),n},pN=()=>{const t=fr();return te($e,{get when(){return t.ending()!==null},get children(){var e=lN(),n=e.firstChild,r=n.firstChild,s=r.nextSibling,i=s.nextSibling;return ne(r,()=>t.ending().title),ne(s,()=>t.ending().text),i.$$click=()=>t.restart(),de(()=>({e:wr.ending,t:wr["ending-panel"],a:wr["ending-title"],o:wr["ending-text"],i:wr["ending-button"]}),({e:o,t:a,a:l,o:c,i:u},d)=>{X(e,o,d?.e),X(n,a,d?.t),X(r,l,d?.a),X(s,c,d?.o),X(i,u,d?.i)}),e}})},mN=t=>(()=>{var e=cN(),n=e.firstChild;return ne(n,()=>t.line),de(()=>({e:wr.container,t:wr.joining}),({e:r,t:s},i)=>{X(e,r,i?.e),X(n,s,i?.t)}),e})(),gN=()=>{const t=new URLSearchParams(window.location.search).get("antialias");if(t!==null)return t!=="0"&&t!=="false"},yN=()=>{const t=new URLSearchParams(window.location.search).get("radius");if(t===null)return;const e=Number(t);return Number.isInteger(e)&&e>=1&&e<=8?e:void 0},Su=()=>{const{terminal:t,setCurrentVoxelscape:e,placeEditorOpen:n}=Ul(Qv),[r,s]=ye(null),[i,o]=ye("joining world…"),a=Yy(),l=L_(),c=z_(),[u,d]=ye(0),h=m=>{d(p=>p+1),c(m)},f=async(m,p,y)=>{const g=m.manifest.scripts?.[0];if(g===void 0)return{terrain:{...Fi,seed:m.manifest.seed},spawn:m.manifest.spawn,project:m,mode:m.manifest.mode,placeUri:y,notice:`${p} names no scripts — playing its terrain`};let b,v="";try{b=await U0({files:m.scripts,entry:g,models:m.models,seed:m.manifest.seed,region:B0(m.manifest.spawn)}),v=` · ${b.length} structure shape(s)`}catch(x){v=` · its plan did not compile (${x instanceof Error?x.message:String(x)})`}return{terrain:{...Fi,seed:m.manifest.seed},spawn:m.manifest.spawn,structures:b,place:{files:m.scripts,entry:g,seed:m.manifest.seed,models:m.models},project:m,mode:m.manifest.mode,placeUri:y,notice:`${p}${v}`}};return zn(()=>({demoId:l.id,handle:l.handle,worldName:l.worldName,generation:u()}),({demoId:m,handle:p,worldName:y})=>{let g=!0;return s(null),o("joining world…"),(async()=>{const b=p===void 0&&y===void 0?m??uN:m;if(b!==void 0){const v=Xu(b);if(v===null){g&&s({notice:`there is no demo "${b}" — /place:demos lists them`});return}g&&o(`opening "${v.manifest.name}"…`);try{const x=await f(await Xy(v),`playing the demo "${v.manifest.name}"`,`${Xd}#/demos/${v.id}`);g&&s(x)}catch(x){const k=x instanceof Error?x.message:String(x);g&&(o(`could not open the demo — ${k}`),s({notice:`could not open the demo (${k})`}))}return}g&&o(`joining ${p}/${y}…`);try{const v=await a.find(p,y);g&&o("opening the place's scripts…");const x=await f(await qd(await a.file(v)),`joined "${v.record.name}" — playing its world`,Vy(v.repo,v.rkey));g&&s(x)}catch(v){const x=v instanceof Error?v.message:String(v);g&&(o(`could not join — ${x}`),s({notice:`could not join ${p}/${y} (${x}) — playing this world instead`}))}})(),()=>{g=!1}}),te(cn,{get each(){return Qt(()=>!!r())()?[r()]:[]},get fallback(){return te(mN,{get line(){return i()}})},children:m=>te(hN,{launch:m,navigate:h,terminal:t,setCurrent:e,placeEditorOpen:n})})};zr(["click"]);const bN=[{path:"/",component:Su},{path:"/demos/:id",component:Su},{path:"/:handle/:worldName",component:Su}],vN=nx({routes:bN,history:J_()}),wN="_status_od5f2_1",_N={status:wN};var xN=pe("<output>");const kN=500,SN=()=>{const[t,e]=ye("finishing sign-in…"),n=Bt(Db);zn(n,s=>{e("signed in — closing…"),window.close(),setTimeout(()=>e(`signed in as ${s} — you can close this window`),kN)});var r=xN();return ne(r,t),de(()=>_N.status,(s,i)=>{X(r,s,i)}),r};if(window.location.hostname==="localhost"){const t=new URL(window.location.href);t.hostname="127.0.0.1",window.location.replace(t.href)}else{const t=$b();y_(()=>t?te(SN,{}):te(vN,{children:e=>te(dN,{get children(){return e.children}})}),document.getElementById("root"))}const EN=Object.freeze(Object.defineProperty({__proto__:null,QuickJSModuleCallbacks:T0,QuickJSWASMModule:lE,applyBaseRuntimeOptions:C0,applyModuleEvalRuntimeOptions:M0},Symbol.toStringTag,{value:"Module"})),Eu=Object.freeze(Object.defineProperty({__proto__:null},Symbol.toStringTag,{value:"Module"}));export{ne as A,pe as B,Ul as C,Bl as D,a_ as E,cn as F,de as G,lt as H,X as I,Mt as J,Qt as K,y_ as L,Pr as M,Ws as N,zn as O,Qn as P,P2 as Q,MN as R,$e as S,I2 as T,ge as U,LN as V,Te as a,O_ as b,$l as c,TN as d,Ar as e,Hs as f,At as g,ye as h,ef as i,CN as j,Ss as k,G_ as l,ON as m,g_ as n,On as o,Io as p,RN as q,IN as r,In as s,PN as t,iy as u,BN as v,YE as w,B2 as x,Bt as y,te as z};
