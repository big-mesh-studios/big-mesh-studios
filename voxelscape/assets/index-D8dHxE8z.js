function uw(t,e){for(var n=0;n<e.length;n++){const r=e[n];if(typeof r!="string"&&!Array.isArray(r)){for(const s in r)if(s!=="default"&&!(s in t)){const i=Object.getOwnPropertyDescriptor(r,s);i&&Object.defineProperty(t,s,i.get?i:{enumerable:!0,get:()=>r[s]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&r(o)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();class It extends Error{source;constructor(e){const n=Error,r=n.stackTraceLimit;r!==void 0&&(n.stackTraceLimit=0),super(),r!==void 0&&(n.stackTraceLimit=r),this.source=e}}class rl extends Error{source;constructor(e,n){super(n instanceof Error?n.message:String(n),{cause:n}),this.source=e}}function Fo(t){return t instanceof rl?t.cause:t}class Rg extends Error{constructor(){super("")}}class hw extends Error{constructor(){super("")}}const Ig=0,bi=1,Yr=2,Pl=4,kr=8,Ri=16,bs=32,Yn=64,Ds=128,wh=256,sl=512,Ns=1024,dw=2048,_h=1,zg=2,Ol=4,fw=8,Pg=16,lr=32,xh=64,Fe=1,ht=2,Ot=4,vi=1,qn=2,$l=3,Ve={},kh={};function Fi(t){return t===kh?void 0:t}const pw=typeof Proxy=="function",Sh={},mw=Symbol("refresh"),il=new WeakMap,Rn=new Set;function gw(t){let e=il.get(t);if(e)return Jt(e);const n=t.nn,r=n?.Me?Jt(n.Me):null;return e={en:t,Ne:new Set,rn:[[],[]],tn:null,Ie:Ae,an:r},il.set(t,e),Rn.add(e),Kd(t.he,e),Kd(t.pe,e),e}function Kd(t,e){if(!t)return;const n=il.get(t);if(!n)return;const r=Jt(n);r!==e&&r.en===t&&!r.an&&(r.an=e)}function Jt(t){for(;t.tn;)t=t.tn;return t}function yw(t,e){if(t=Jt(t),e=Jt(e),t===e)return t;e.tn=t;for(const n of e.Ne)t.Ne.add(n);return e.Ne.clear(),t.rn[0].push(...e.rn[0]),t.rn[1].push(...e.rn[1]),e.rn[0].length=0,e.rn[1].length=0,t}function Ao(t){const e=t.Me;if(!e)return;const n=Jt(e);if(Rn.has(n))return n;t.Me=void 0}function fo(t){if(qr(t)&&t.sn){const e=t.sn=Ll(t.sn);if(e.fn!==!0)return e;t.sn=null}return Ao(t)?.Ie??t.Ie}function qr(t){return t.Ae!==void 0&&t.Ae!==Ve}function Eh(t,e){const n=Jt(e),r=t.Me;if(r){if(r.tn){t.Me=e;return}const s=Jt(r);if(Rn.has(s)){s!==n&&!qr(t)&&(n.an&&Jt(n.an)===s?t.Me=e:s.an&&Jt(s.an)===n||yw(n,s));return}}t.Me=e}const ro=new Set,Mn={eE:new Array(2e3).fill(void 0),tE:!1,He:0,EE:0},wi={eE:new Array(2e3).fill(void 0),tE:!1,He:0,EE:0};let Pt=0,Ae=null,To=!1,ol=!1,ef=!1,Tu=0;const so=new Set;function bw(t){const e=t.m;return ro.size===0&&Rn.size===0&&t.vt.length===0&&e.je.length===0&&e.A.length===0&&e.cn.size===0&&so.size===0}function vw(){if(so.size!==0)for(const t of so){if(t.o!==null){so.delete(t);continue}t.De===Ve&&(t.Ae!==void 0&&t.Ae!==Ve||t.t||(so.delete(t),t.ut?.()))}}function ea(){return{Se:Pt,Qt:[],Ee:new Map,je:[],A:[],cn:new Set,ie:[],yt:{gt:[[],[]],vt:[]},fn:!1,ln:new Set}}function ww(t,e){e.fn=t,t.ie.push(...e.ie);for(const n of Rn)n.Ie===e&&(n.Ie=t);e.je.length&&(t.je.push(...e.je),e.je.length=0),e.A.length&&(t.A.push(...e.A),e.A.length=0);for(const n of e.cn)t.cn.add(n);for(const[n,r]of e.Ee){let s=t.Ee.get(n);s||t.Ee.set(n,s=new Set);for(const i of r)s.add(i)}for(const n of e.ln)t.ln.add(n)}function zn(){if(ol){_w();return}To||(To=!0,!Tu&&!At.bt&&queueMicrotask(Fs))}function Co(t){if(ol)return;ol=!0;let e="[REACTIVITY_HALTED]";t===void 0?console.error(e):console.error(e,t)}function _w(){ef||(ef=!0,console.error("[REACTIVITY_HALTED]"))}let xw=0;class Og{ve=null;gt=[[],[]];vt=[];kt=0;created=Pt;addChild(e){this.vt.push(e),e.ve=this}removeChild(e){const n=this.vt.indexOf(e);n>=0&&(this.vt.splice(n,1),e.ve=null)}notify(e,n,r,s){return this.ve?this.ve.notify(e,n,r,s):!1}run(e){if(this.gt[e-1].length){const s=this.gt[e-1];this.gt[e-1]=[],Sw(s,e)}const n=this.vt,r=++xw;for(let s=0;s<n.length;){const i=n[s];if(i.kt!==r&&(i.kt=r,i.run?.(e),n[s]!==i)){s=0;continue}s++}}enqueue(e,n){e&&(Xt?Jt(Xt).rn[e-1].push(n):this.gt[e-1].push(n)),zn()}stashQueues(e){e.gt[0].push(...this.gt[0]),e.gt[1].push(...this.gt[1]),this.gt=[[],[]];for(let n=0;n<this.vt.length;n++){let r=this.vt[n],s=e.vt[n];s||(s={gt:[[],[]],vt:[]},e.vt[n]=s),r.stashQueues(s)}}restoreQueues(e){this.gt[0].push(...e.gt[0]),this.gt[1].push(...e.gt[1]);for(let n=0;n<e.vt.length;n++){const r=e.vt[n];let s=this.vt[n];s&&s.restoreQueues(r)}}}class ue extends Og{bt=!1;m=ea();static Ce;static me;static Xe;static Dt=null;static p=null;static G=null;static M=null;static h=null;static dt=null;static It=null;static _e=null;static ce=null;static Ge=null;static un=null;static St=null;static At=null;static Pt=null;static $e=null;static k=null;static Lt=null;static ht=null;static En=null;static dn=null;static Tn=null;static In=null;static Ot=null;static Ct=null;static Rt=null;static Ze=null;static ze=null;static Ke=null;static Nn=null;flush(){if(!this.bt){this.bt=!0;try{if(io(Mn,ue.Ce),Ae){if(!Aw(Ae)){const s=Ae;io(wi,ue.Ce),this.m===s&&(po=this.m=ea()),Rn.size&&(ue.In(vi),ue.In(qn)),this.stashQueues(s.yt),Pt++,To=Mn.EE>=Mn.He||this.m.Qt.length>0,tf(s.Qt),Ae=null,pc(null,!0);return}const n=Ae,r=this.m;if(r!==n&&r.Qt.push(...n.Qt),this.restoreQueues(n.yt),ro.delete(n),Ae=null,tf(r.Qt),pc(n),r===n){const s=ea();s.Qt=r.Qt,s.je=r.je,s.A=r.A,s.cn=r.cn,po=this.m=s}}else bw(this)?(al(),Mn.EE>=Mn.He&&(io(Mn,ue.Ce),al())):(ro.size&&io(wi,ue.Ce),pc());Pt++,To=Mn.EE>=Mn.He,Rn.size&&ue.In(vi),this.run(vi),Rn.size&&ue.In(qn),this.run(qn)}finally{this.bt=!1}}}notify(e,n,r,s){if(n&Fe){if(r&Fe){const i=s!==void 0?s:e._;if(i?.l)return!0;if(Ae&&i){const o=i.source;let a=Ae.Ee.get(o);a||Ae.Ee.set(o,a=new Set);const l=a.size;a.add(e),a.size!==l&&zn()}}return!0}return!1}initTransition(e){if(e&&(e=Ll(e)),e&&e===Ae||!e&&Ae&&Ae.Se===Pt)return;if(!Ae)Ae=e??ea();else if(e){const r=Ae;ww(e,r),ro.delete(r),Ae=e}ro.add(Ae),Ae.Se=Pt;const n=this.m;if(n!==Ae){for(let r=0;r<n.Qt.length;r++){const s=n.Qt[r];s.Ie=Ae,Ae.Qt.push(s)}for(let r=0;r<n.je.length;r++){const s=n.je[r];s.Ie=Ae,Ae.je.push(s)}n.A.length&&Ae.A.push(...n.A);for(const r of n.cn)Ae.cn.add(r);po=this.m=Ae}for(const r of Rn)r.Ie||(r.Ie=Ae)}}function Ii(t){po.Qt.push(t)}function vs(t,e=!1){const n=t.Me||Xt,r=t.xe!==void 0;for(let s=t.o;s!==null;s=s.ue){if(r&&s.le.T&fw){s.le.se|=wh;continue}e&&n?(s.le.se|=Ds,Eh(s.le,n)):e&&(s.le.se|=Ds,s.le.Me=void 0),Bo(s.le)}}function kw(t){const e=t;if(!e.ae){t.De!==Ve&&(t.Ue=t.De,t.De=Ve),(t.he||t.pe)&&ue.un(t);return}t.De!==Ve&&(t.Ue=t.De,t.De=Ve,t.Pe&&t.Pe!==$l&&(t.Be=!0)),e.se&=~Ns,e.S&Fe||(e.S&=~Ot),(e.Qe!==null||e.ye!==null)&&ue.me(e,!1,!0),(t.he||t.pe)&&ue.un(t)}function al(){const t=po.Qt;for(let e=0;e<t.length;e++)kw(t[e]);t.length=0}function pc(t=null,e=!1){const n=!e;n&&al(),!e&&At.vt.length&&Cu(At);const r=Mn.EE>=Mn.He;if(r&&io(Mn,ue.Ce),n){r&&al();const s=t??At.m;if(s.je.length&&ue.En(s.je),t&&t.ln.size){for(const i of t.ln)i.se&Yn||Bo(i);t.ln.clear()}s.A.length&&(ue.G(s.A),At.vt.length&&Cu(At)),s.cn.size&&ue.Dt(s.cn,t),vw(),Rn.size&&ue.Tn(t)}}function Cu(t){for(const e of t.vt)e.ne?.(),Cu(e)}function tf(t){for(let e=0;e<t.length;e++)t[e].Ie=Ae}const At=new ue;let po=At.m;function Fs(t){if(t){Tu++;try{return t()}finally{try{Fs()}finally{Tu--}}}if(!At.bt&&!ol)for(;To||Ae;)At.flush()}function Sw(t,e){for(let n=0;n<t.length;n++)t[n](e)}function Ew(t,e){if(t.se&(bs|Yn))return!1;if(t.oe?.has(e))return!0;for(let n=t.et;n;n=n.tt){let r=n.nt;for(;r;){if(r===e||r.it===e)return!0;r=r.nn}}return!!(t.S&Fe&&t._ instanceof It&&t._.source===e)}function Aw(t){if(t.fn)return!0;if(t.ie.length)return!1;let e=!0;for(const[n,r]of t.Ee){let s=!1;for(const i of r){if(Ew(i,n)){s=!0;break}r.delete(i)}if(!s)t.Ee.delete(n);else if(n.S&Fe&&n._?.source===n){e=!1;break}}return e&&ue.dn?.(t)&&(e=!1),e&&(t.fn=!0),e}function Ll(t){for(;t.fn&&typeof t.fn=="object";)t=t.fn;return t}function Tw(t,e){const n=Ae;try{return Ae=Ll(t),e()}finally{Ae=n}}function Tr(t){return t.se&bs?wi:Mn}function Bo(t){if(t.Pe===$l){const n=t;n.Be||(n.Be=!0,n.C.enqueue(qn,n.Ft));return}const e=Tr(t);e.He>t.Ve&&(e.He=t.Ve),Ah(t,e)}function $g(t,e){const n=(t.ve?.Nt?t.ve.Tt?.Ve:t.ve?.Ve)??-1;n>=t.Ve&&(t.Ve=n+1);const r=t.Ve,s=e.eE[r];if(s===void 0)e.eE[r]=t;else{const i=s.ot;i.lt=t,t.ot=i,s.ot=t}r>e.EE&&(e.EE=r)}function Ah(t,e){let n=t.se;n&(kr|Pl|Ns)||(n&bi?t.se=n&-4|Yr|kr:(t.se=n|kr,e.tE&&!(n&Yr)&&(e.tE=!1)),n&Ri||$g(t,e))}function Th(t,e){let n=t.se;n&(kr|Pl|Ri|Ns)||(t.se=n|Ri,$g(t,e))}function Bi(t,e){const n=t.se;if(!(n&(kr|Ri)))return;t.se=n&-25;const r=t.Ve;if(t.ot===t)e.eE[r]=void 0;else{const s=t.lt,i=e.eE[r],o=s??i;t===i?e.eE[r]=s:t.ot.lt=s,o.ot=t.ot}t.ot=t,t.lt=void 0}function Lg(t){if(!t.tE){t.tE=!0;for(let e=0;e<=t.EE;e++)for(let n=t.eE[e];n!==void 0;n=n.lt)n.se&kr&&ll(n)}}function ll(t,e=Yr){const n=t.se;if(!((n&(bi|Yr))>=e)){t.se=n&-4|e;for(let r=t.o;r!==null;r=r.ue)ll(r.le,bi);if(t.u!==null)for(let r=t.u;r!==null;r=r.fe)for(let s=r.o;s!==null;s=s.ue)ll(s.le,bi)}}function io(t,e){for(t.tE=!1,t.He=0;t.He<=t.EE;t.He++){let n=t.eE[t.He];for(;n!==void 0;)n.se&kr?e(n):Cw(n,t),n=t.eE[t.He]}t.EE=0}function Cw(t,e){Bi(t,e);let n=t.Ve;for(let r=t.et;r;r=r.tt){const s=r.nt,i=s.it||s;i.ae&&i.Ve>=n&&(n=i.Ve+1)}if(t.Ve!==n){t.Ve=n;for(let r=t.o;r!==null;r=r.ue)Th(r.le,Tr(r.le))}}const Mw={};function Dg(t){let e=t.ke;for(;e;){const n=e.se;e.se=n|bs,n&(kr|Ri)&&(Bi(e,n&bs?wi:Mn),n&kr?Ah(e,wi):Th(e,wi)),Dg(e),e=e.Fe}}function Uo(t,e=!1,n){const r=t.se;if(r&Yn)return;if(e){t.se=r|Yn;const i=t;(i.he||i.pe)&&ue.un(i)}e&&t.ae&&(t.Te=null);let s=n?t.Qe:t.ke;for(;s;){const i=s.Fe;if(s.et){const o=s;Bi(o,Tr(o));let a=o.et;do a=Rh(a);while(a!==null);o.et=null,o.We=null}Uo(s,!0),s=i}if(n?t.Qe=null:(t.ke=null,t.qe=0),e&&!n&&!(r&bs)&&t.ve!==null&&!(t.ve.se&Yn)){const i=t.rt,o=t.Fe;i!==null?i.Fe=o:t.ve.ke=o,o!==null&&(o.rt=i),t.rt=null}if(Rw(t,n),e&&t.Et){const i=t.Et;t.Et=void 0,i()}}function Rw(t,e){let n=e?t.ye:t.Le;if(n){if(Array.isArray(n))for(let r=0;r<n.length;r++){const s=n[r];s.call(s)}else n.call(n);e?t.ye=null:t.Le=null}}function Iw(t,e){let n=t;for(;n.T&Ol&&n.ve;)n=n.ve;if(n.id!=null)return Pw(n.id,n.qe++);throw new Error("")}function zw(t){return Iw(t)}function Ch(t,e,n){return t?.id??(e?n?.id:n?.id!=null?zw(n):void 0)}function Pw(t,e){const n=e.toString(36),r=n.length-1;return t+(r?String.fromCharCode(64+r):"")+n}function A4(){return as||Wr?Mw:Wt?We:null}function xs(){return We}function Mh(t){return We&&(We.Le?Array.isArray(We.Le)?We.Le.push(t):We.Le=[We.Le,t]:We.Le=t),t}function Ow(t=!0){Uo(this,t)}function Ps(t){const e=We,n=t?.transparent??!1,r={id:Ch(t,n,e),T:n?Ol:0,Nt:!0,Tt:e?.Nt?e.Tt:e,ke:null,Fe:null,rt:null,Le:null,C:e?.C??At,we:e?.we||Sh,qe:0,ye:null,Qe:null,ve:e,dispose:Ow};if(e){const s=e.ke;s===null||(r.Fe=s,s.rt=r),e.ke=r}return r}function Dl(t,e){const n=Ps(e);return jn(n,()=>t(()=>n.dispose()))}function Rh(t){const e=t.nt,n=t.tt,r=t.ue,s=t.ll;if(r!==null?r.ll=s:e.st=s,s!==null)s.ue=r;else if(e.o=r,r===null){e.ut?.();const i=e;i.ae&&i.T&lr&&!(i.se&bs)&&!(i.S&Fe)&&Nl(i)}return n}function Ng(t){const e=t.We;let n=e!==null?e.tt:t.et;if(n!==null){do n=Rh(n);while(n!==null);e!==null?e.tt=null:t.et=null}}function Nl(t){Bi(t,Tr(t));let e=t.et;for(;e!==null;)e=Rh(e);t.et=null,t.We=null,Uo(t,!0)}function oo(t,e,n=!1){const r=e.We;if(r!==null&&r.nt===t){r.Oe&&=n;return}let s=null;const i=e.se&Pl;if(i&&(s=r!==null?r.tt:e.et,s!==null&&s.nt===t)){s.nl=e.Ye,e.We=s,s.Oe=n;return}const o=t.st;if(o!==null&&o.le===e&&(!i||o.nl===e.Ye)){i?o.Oe&&=n:o.Oe=n;return}const a=e.We=t.st={nt:t,le:e,tt:s,ll:o,ue:null,nl:e.Ye,Oe:n};r!==null?r.tt=a:e.et=a,o!==null?o.ue=a:t.o=a}function $w(t,e){return t.oe?.has(e)?!1:((t.oe??=new Set).add(e),!0)}function Lw(t,e){return t.oe?.delete(e)?(t.oe.size===0&&(t.oe=void 0),!0):!1}function Fg(t){t.oe?.clear(),t.oe=void 0}function cl(t,e,n){if(!e){t._=null;return}if(n instanceof It&&n.source===e){t._=n;return}const r=t._;(!(r instanceof It)||r.source!==e)&&(t._=new It(e))}function Bs(t,e){for(let n=t.o;n!==null;n=n.ue)e(n.le,n);for(let n=t.u??null;n!==null;n=n.fe)for(let r=n.o;r!==null;r=r.ue)e(r.le,r)}function Bg(t){t.ae&&t.T&lr&&!t.o&&!(t.se&bs)&&!(t.S&Fe)&&Nl(t)}function Dw(t){let e;const n=new Set,r=s=>{n.has(s)||(n.add(s),!s.o&&s.T&lr&&(e??=[]).push(s),Bs(s,r))};if(Bs(t,r),e)for(const s of e)Bg(s)}function Nw(t,e){let n=!1;const r=new Set,s=i=>{r.has(i)||(r.add(i),i._===e&&(Bo(i),n=!0),Bs(i,s))};Bs(t,s),n&&zn()}function Fw(t){let e=!1,n;const r=new Set,s=ue.ce,i=o=>{if(r.has(o)||!Lw(o,t))return;r.add(o),o.Se=Pt;const a=o.oe?.values().next().value;a?(cl(o,a),s!==null&&s(o)):(o.S&=~Fe,cl(o),s!==null&&s(o),o.de&&(Bo(o),e=!0),o.de=!1,!o.o&&o.T&lr&&(n??=[]).push(o)),Bs(o,i)};if(Bs(t,i),n)for(const o of n)Bg(o);e&&zn()}function nf(t){return t!=null&&typeof t=="object"&&typeof t.then=="function"}function Bw(t,e,n){let r=!1,s=!1;if(typeof e=="object"&&e!==null&&Nt(()=>{r=e[Symbol.asyncIterator],s=!r&&nf(e)}),!s&&!r)return t.Te=null,e;t.Te=e;let i;const o=()=>{const u=fo(t);if(u&&t.S&Ot&&!Ll(u).Ee.has(t)){t.Ie=null;return}At.initTransition(u)},a=u=>{if(t.Te!==e)return;o();const h=u instanceof It;_i(t,h?Fe:ht,u),t.Se=Pt,h||Dw(t)},l=(u,h)=>{if(t.Te!==e||t.se&(Yr|Ds))return;o();const d=!!(t.S&Ot);Ng(t),Ug(t);const f=Ao(t);if(f&&f.Ne.delete(t),t.Ae!==void 0)t.De===Ve&&Ii(t),t.De=u,ue._e!==null&&ue._e(t,u),qr(t)||vs(t),t.Se=Pt;else if(f){const m=t.Pe,p=t.Ue,y=t.be;try{(!m&&d||!y||!y(u,p))&&(t.Ue=u,t.Se=Pt,ue._e!==null&&ue._e(t,u),vs(t,!0))}catch(g){_i(t,ht,g)}}else try{yn(t,()=>u)}catch(m){_i(t,ht,m)}Fw(t),zn(),Fs(),h?.()},c=()=>t.T&lr&&!t.o&&!(t.S&Fe)?(Nl(t),!0):!1;if(s){let u=!1,h=!1,d,f=!0;if(e.then(m=>{f?(i=m,u=!0):(l(m),c())},m=>{f?(d=m,h=!0):(a(m),c())}),f=!1,h)throw a(d),d;if(!u)throw At.initTransition(fo(t)),new It(We)}if(r){const u=e[Symbol.asyncIterator]();let h=!1,d=!1,f=!0;Mh(()=>{if(!d){d=!0;try{const g=u.return?.();nf(g)&&g.then(void 0,()=>{})}catch{}}});const m=()=>{c()||p()},p=()=>{let g,b,v=!1,x=!1,k=!0;if(u.next().then(C=>{if(k)g=C,v=!0,C.done&&(d=!0);else{if(t.Te!==e)return;C.done?(d=!0,h?(zn(),Fs()):l(void 0),c()):(h=!0,l(C.value,m))}},C=>{k?(b=C,x=!0):t.Te===e&&(d=!0,a(C),c())}),k=!1,x){if(d=!0,a(b),f)throw b;return!0}return v&&!g.done?(i=g.value,h=!0,p()):v&&g.done},y=p();if(f=!1,!h&&!y)throw At.initTransition(fo(t)),new It(We)}return i}function Ug(t,e=!1){t.oe&&Fg(t),t.de&&(t.de=!1),t.Re=!1,t.S=e?0:t.S&Ot,t._&&cl(t),(t.he||t.pe)&&ue.ce(t),t.u&&ue.Ge!==null&&ue.Ge(t),t.i&&t.i()}function _i(t,e,n,r,s){e===ht&&!(n instanceof rl)&&!(n instanceof It)&&(n=new rl(t,n));const i=e===Fe&&n instanceof It?n.source:void 0,o=i===t,a=e===Fe&&t.Ae!==void 0&&!o,l=a&&qr(t);r||(e===Fe&&i?($w(t,i),t.S=Fe|t.S&Ot,cl(t,i,n)):(Fg(t),t.S=e|(e!==ht?t.S&Ot:0),t._=n),ue.ce!==null&&ue.ce(t),t.u&&ue.Ge!==null&&ue.Ge(t)),s&&!r&&Eh(t,s);const c=r||l,u=r||a?void 0:s;if(t.i){if(r&&e===Fe)return;c?t.i(e,n):t.i();return}Bs(t,(h,d)=>{if(h.Se=Pt,e===Fe&&i&&!h.oe?.has(i)||e!==Fe&&(h._!==n||h.oe)){if(d.Oe&&e!==Fe&&!(n instanceof It)){Bo(h),zn();return}!c&&!h.Ie&&Ii(h),_i(h,e,n,c,u)}})}ue.Ce=Cr;ue.me=Uo;let Wt=!1;function Ur(t){as=t}function ul(t){Wr=t}function rf(t){We=t}let rr=!1,as=!1,Wr=!1,We=null,Xt=null;function Cr(t,e=!1){const n=t.Pe;e||(t.Ie&&(!n||Ae)&&Ae!==t.Ie&&At.initTransition(t.Ie),Bi(t,Tr(t)),t.Te=null,t.Ie||n===$l?Uo(t):(t.ke!==null||t.Le!==null)&&(Dg(t),t.ye=t.Le,t.Qe=t.ke,t.Le=null,t.ke=null,t.qe=0));let r=!!(t.se&Ds);const s=t.Ae!==void 0&&t.Ae!==Ve,i=!!(t.S&Ot),o=t.S&ht?t._:void 0,a=(t.se&dw)!==0,l=We;We=t,t.We=null,t.Ye++,t.se=Pl,t.Se=Pt;let c=t.De===Ve?t.Ue:t.De,u=t.Ve,h=Wt,d=Xt;Wt=!0;const f=Wr;if(Wr=!1,r){const g=ue.Ze(t,!0);g&&(Xt=g)}else if(Ae&&!e&&Ae.je.length){const g=ue.Ze(t,!1);g&&(r=!0,Xt=g)}const m=n&&n!==qn,p=rr;m&&(rr=!0);try{if(t.T&xh)c=t.ae(c),t.Te=null;else{const g=t.Te,b=t.ae(c),v=typeof b=="object"&&b!==null,x=t.Te!==g;c=x||!v?b:Bw(t,b),!x&&!v&&(t.Te=null)}(t.S!==0||t.i!==void 0||t._||t.Re||t.de||t.oe!==void 0||t.he!==void 0||t.pe!==void 0||t.u!==null)&&Ug(t,e),t.Me&&ue.Ke(t)}catch(g){g instanceof It&&Xt&&ue.ze(t);let b=!1;g instanceof It&&(t.de=!0,ue.$e!==null&&(b=ue.$e(t,a))),_i(t,g instanceof It?Fe:ht,g,void 0,g instanceof It?t.Me:void 0),b&&ue.k(t)}finally{Wt=h,Wr=f,m&&(rr=p),t.se=Ig|(e?t.se&wh:0),We=l}if(!t._){Ng(t);const g=s?Fi(t.Ae):t.De===Ve?t.Ue:t.De;let b=!1;try{b=!n&&i||!t.be||!t.be(g,c)}catch(v){_i(t,ht,v)}if(n&&b&&(t.Be=!t._,e||t.C.enqueue(n,t.Je??=ue.Xe.bind(null,t))),!t._){if(b){const v=s?t.Ae:void 0;e||n&&(Ae!==t.Ie||Ae===null)||r?(t.Ue=c,s&&r&&(t.Ae=c===void 0?kh:c,t.De=Ve)):(t.De=c,(Ae||t.Ie)&&ue._e!==null&&ue._e(t,c)),t.o!==null&&(!s||r||t.Ae!==v)&&vs(t,r||s)}else if(s)t.De===Ve&&Ii(t),t.De=c;else if(t.Ve!=u)for(let v=t.o;v!==null;v=v.ue)Th(v.le,Tr(v.le))}o!==void 0&&!b&&!t._&&Nw(t,o)}Xt=d,(t.De!==Ve||t.Qe!==null||t.ye!==null||(t.S&(Fe|Ot))!==0)&&(!e||t.S&Fe)&&(!t.Ie||s)&&Ii(t),t.Ie&&n&&Ae!==t.Ie&&Tw(t.Ie,()=>Cr(t))}function Ih(t){if(t.se&bi)for(let e=t.et;e;e=e.tt){const n=e.nt,r=n.it||n;if(r.ae&&Ih(r),t.se&Yr)break}(t.se&(Yr|Ds)||t._&&t.Se<Pt&&!t.Te)&&Cr(t),t.se=t.se&(wh|kr|Ri)}function ks(t,e){const n=e?.transparent??!1,r={id:Ch(e,n,We),T:(n?Ol:0)|(e?.ownedWrite?_h:0)|(!We||e?.lazy?lr:0)|(e?.sync?xh:0)|(e?.V?zg:0)|0,be:e?.equals!=null?e.equals:jg,ut:e?.unobserved,Le:null,C:We?.C??At,we:We?.we??Sh,qe:0,ae:t,Ue:void 0,Ve:0,u:null,lt:void 0,ot:null,et:null,We:null,Ye:0,o:null,st:null,ve:We,Fe:null,rt:null,ke:null,se:e?.lazy?sl:Ig,S:Ot,Se:Pt,De:Ve,ye:null,Qe:null,Te:null,Ie:null,Re:!1};return Hg(r,e),r}function Uw(t,e,n,r,s,i){const o=i?.transparent??!1,a={id:Ch(i,o,We),T:(o?Ol:0)|(i?.ownedWrite?_h:0)|(i?.sync?xh:0)|0,be:!1,ut:i?.unobserved,Le:null,C:We?.C??At,we:We?.we??Sh,qe:0,ae:t,Ue:void 0,Ve:0,u:null,lt:void 0,ot:null,et:null,We:null,Ye:0,o:null,st:null,ve:We,Fe:null,rt:null,ke:null,se:sl,S:Ot,Se:Pt,De:Ve,ye:null,Qe:null,Te:null,Ie:null,Re:!1,Be:!1,ct:void 0,_t:e,ft:n,Et:void 0,Pe:r,i:s};return Hg(a,Hw),a}const Hw={lazy:!0};function Hg(t,e){t.ot=t;const n=We?.Nt?We.Tt:We;if(We){const r=We.ke;r===null||(t.Fe=r,r.rt=t),We.ke=t}n&&(t.Ve=n.Ve+1),ue.dt!==null&&ue.dt(t),!e?.lazy&&Cr(t,!0)}function ls(t,e,n=null){const r={be:e?.equals!=null?e.equals:jg,T:(e?.ownedWrite?_h:0)|(e?.V?zg:0),ut:e?.unobserved,Ue:t,o:null,st:null,Se:Pt,it:n,fe:n?.u||null,De:Ve};return n&&(n.u=r),r}function jw(t,e){const n=ls(t,e);return n.Ae=Ve,n}function Ww(t,e){const n=ks(t,e);return n.Ae=Ve,n}function jg(t,e){return t===e}function Nt(t,e){if(ue.It===null&&!Wt)return t();const n=Wt;Wt=!1;try{return ue.It!==null?ue.It(t):t()}finally{Wt=n}}function zh(t,e){t.se&sl?(t.se&=~sl,Cr(t,!0)):t.se&Yn?Cr(t,!0):e&&Ih(t)}function nr(t){if(Wr)return ue.St(t);let e=We;e?.Nt&&(e=e.Tt);const n=t,r=t.it,s=r||t;if(as?ue.At(t,e,s,r):typeof n.ae=="function"&&zh(t,!1),!n.ae&&s===t&&t.Ae===void 0&&t.xe===void 0&&Ae===null&&Xt===null)return e&&Wt&&oo(t,e),!e||t.De===Ve?t.Ue:t.De;if(e&&Wt&&(oo(t,e,as),s.ae)){const o=Tr(t);s.Ve>=o.He&&(ll(e),Lg(o),Ih(s));const a=s.Ve;a>=e.Ve&&t.ve!==e&&(e.Ve=a+1)}if(s.S&Fe)if(e&&!(rr&&s.Ie&&Ae!==s.Ie)){if(Xt===null||ue.Ct(s))throw!Wt&&t!==e&&oo(t,e),s._}else{if(e&&s!==t&&s.S&Ot)throw!Wt&&t!==e&&oo(t,e),s._;if(!e&&s.S&Ot)throw s._}if(s.ae&&s.S&ht){if(Wt&&!as&&s.Se<Pt)return Cr(s),nr(t);throw s._}if(t.Ae!==void 0&&t.Ae!==Ve)return Fi(t.Ae);if(Xt!==null&&Ae!==null&&e!==null&&ue.Ot(t,s,e))return t.Ue;const i=!e||Xt!==null&&ue.Rt(t,s,e)||t.De===Ve||rr&&t.Ie&&Ae!==t.Ie?t.Ue:t.De;return as&&ue.Pt(t,i),!e&&s===t&&typeof n.ae=="function"&&t.T&lr&&!(s.S&Fe)&&!t.o&&Nl(t),i}function yn(t,e){if(t.Ie&&Ae!==t.Ie&&At.initTransition(t.Ie),t.Ae!==void 0)return ue.ht(t,e);const n=t.De===Ve?t.Ue:t.De;return typeof e=="function"&&(e=e(n)),(!!(t.S&Ot)||!t.be||!t.be(n,e))&&(t.De===Ve&&Ii(t),t.De=e,(t.he!==void 0||t.pe!==void 0)&&ue._e!==null&&ue._e(t,e),t.Se=Pt,vs(t),zn()),e}function Vw(t){Bi(t,Tr(t)),!(t.se&Ns)&&t.De===Ve&&(Ii(t),zn()),t.se=t.se&-4|Ns}function Gw(t,e){const n=yn(t,e);return Vw(t),n}function jn(t,e){const n=We,r=Wt;We=t,Wt=!1;try{return e()}finally{We=n,Wt=r}}function Yw(t,e=!0){const n=rr;rr=e;try{return t()}finally{rr=n}}function qw(t,e=xs()){if(!e)throw new Rg;const n=Zw(t,e)?e.we[t.id]:t.defaultValue;if(Ph(n))throw new hw;return n}function Xw(t,e,n=xs()){if(!n)throw new Rg;n.we={...n.we,[t.id]:Ph(e)?t.defaultValue:e}}function Zw(t,e){return!Ph(e?.we[t.id])}function Ph(t){return typeof t>"u"}function Jw(t,e){const n=t.Ae!==Ve,r=n?Fi(t.Ae):t.Ue;if(typeof e=="function"&&(e=e(r)),!(!!(t.S&Ot)||!t.be||!t.be(r,e))){if(n){const o=fo(t);o&&Ae!==o&&At.initTransition(o)}return e}n?At.initTransition(fo(t)):At.m.je.push(t),t.sn=Ae;const i=gw(t);return t.Me=i,t.Ae=e===void 0?kh:e,(t.he!==void 0||t.pe!==void 0)&&ue._e!==null&&ue._e(t,e),t.Se=Pt,vs(t,!0),zn(),e}function Qw(t){for(let e=0;e<t.je.length;e++){const n=t.je[e];if(qr(n)&&"S"in n&&n.S&Fe&&n._ instanceof It)return!0}return!1}function Kw(t){const e=t.length;for(let n=0;n<e;n++){const r=t[n];r.Me=void 0,r.S&Fe||(r.S&=~Ot);const s=r.Ae;r.Ae=Ve,s!==Ve&&r.Ue!==Fi(s)&&vs(r,!0),r.Ie=null,r.sn=null}for(let n=0;n<e;n++){const r=t[n];(r.he||r.pe)&&ue.un(r);const s=r.nn;s&&(s.he===r||s.pe===r)&&ue.un(s)}t.splice(0,e)}function Mu(t,e){for(let n=0;n<t.length;n++)t[n](e)}function e1(t){for(const e of Rn){if(e.tn||e.Ne.size>0)continue;const n=e.rn[t-1];n.length&&(e.rn[t-1]=[],Mu(n,t))}}function t1(t){for(const e of Rn)(t?e.Ie===t:!e.Ie)&&(e.tn||(e.rn[0].length&&Mu(e.rn[0],vi),e.rn[1].length&&Mu(e.rn[1],qn)),e.en.Me===e&&(e.en.Me=void 0),e.Ne.clear(),e.rn[0].length=0,e.rn[1].length=0,Rn.delete(e),il.delete(e.en))}function n1(t){const e=t.Me;return e?Jt(e)===Jt(Xt)&&!qr(t):!1}function r1(t,e,n){return Wr||t.De===Ve||t.ae||e!==t&&!(e.se&Ns)?!1:(Ae.ln.add(n),!0)}function s1(t,e,n){return t.Ae!==void 0||!!t.Me||e===t&&rr&&n.nn!==t||!!(e.S&Fe)}function i1(t,e){if(e)return Ao(t)??null;for(let n=t.et;n;n=n.tt){const r=n.nt;if(r.se&Ds){const s=Ao(r);if(s)return t.se|=Ds,Eh(t,s),s}}return null}function o1(t){const e=Jt(Xt);e.en!==t&&(e.Ne.add(t),t.Me=e,ue.ce!==null&&ue.ce(e.en))}function a1(t){const e=Ao(t);e&&(e.Ne.delete(t),ue.ce!==null&&ue.ce(e.en))}function l1(t){At.m.cn.add(t),zn()}function c1(){ue.ht===null&&(ue.ht=Jw,ue.En=Kw,ue.dn=Qw,ue.Tn=t1,ue.In=e1,ue.Ot=r1,ue.Ct=n1,ue.Rt=s1,ue.Ze=i1,ue.ze=o1,ue.Ke=a1,ue.Nn=l1)}c1();let Vr=null;function u1(t){return t.he||(t.he=jw(!1,{ownedWrite:!0}),t.he.nn=t,Oh(t)&&yn(t.he,!0)),t.he}function sf(t){if(!Vr)return;Vr.sources.add(t);const e=t.it||t;e!==t&&Vr.sources.add(e)}function h1(t){Vr?.sources.add(t)}function Wg(t){if(t.oe){for(const e of t.oe)if(!e.Re)return!1;return!0}return t.Re}function of(t){return!!(t.S&Fe)&&!(t.S&Ot)&&!Wg(t)}function Oh(t){const e=t;if(e.se&Yn)return!1;const n=t.it;if(t.nn){const r=t.nn,s=r.it||r;return of(s)}return n&&t.De!==Ve&&!qr(t)?!!(n.se&Ns)||!n.Te&&!(n.S&Fe)||!!(n.S&Fe)&&Wg(n):t.De!==Ve&&!(e.S&Ot)?qr(t)?!t.be||!t.be(t.De,Fi(t.Ae)):!0:of(e)}function d1(t,e){t.he&&Ho(t),t.pe&&yn(t.pe,e)}function Ho(t){t.he&&yn(t.he,Oh(t)),t.pe&&Ho(t.pe)}function f1(t){for(let e=t.u;e!==null;e=e.fe)(e.he||e.pe)&&Ho(e)}function p1(t,e=!1){const n=e?$h:Ho,r=new Set,s=i=>{if(!r.has(i)){r.add(i),(i.he||i.pe)&&n(i);for(let o=i.o;o!==null;o=o.ue)s(o.le);for(let o=i.u??null;o!==null;o=o.fe)s(o)}};s(t)}function $h(t){const e=t.he;if(e&&(e.Ae===void 0||e.Ae===Ve)){const r=Oh(t);(e.Ue!==r||e.De!==Ve)&&(e.Ue=r,e.De=Ve,e.Se=Pt,vs(e),zn())}const n=t.pe;n&&!(n.se&Yn)&&((n.Ae===void 0||n.Ae===Ve)&&n.De===Ve&&!Object.is(n.Ue,t.Ue)&&!(n.se&(Yr|bi))&&(n.se|=Yr,Ah(n,Tr(n)),vs(n),zn()),$h(n))}function m1(t){if(!t.pe){const e=Wr;ul(!1);const n=as;Ur(!1);const r=We;rf(null),t.pe=Ww(()=>nr(t)),t.pe.nn=t,rf(r),Ur(n),ul(e)}return t.pe}function g1(t){const e=m1(t),n=Wr;ul(!1);const r=t.Ae!==void 0&&t.Ae!==Ve?Fi(t.Ae):t.Ue;let s;try{const i=Tr(e);e.Ve>=i.He&&!(e.se&(Yn|bs))&&(Lg(i),zh(e,!0)),s=nr(e)}catch(i){if(i instanceof It&&(!We||!(t.S&Ot)))return r;throw i}finally{ul(n)}if(e.S&Fe)return r;if(rr&&Xt&&e.Me){const i=Jt(e.Me),o=Jt(Xt);if(i!==o&&i.Ne.size>0)return r}return e.De!==Ve&&!qr(e)&&!(rr&&e.Ie&&Ae!==e.Ie)?e.De:s}function y1(t,e,n,r){Ur(!1),typeof t.ae=="function"&&zh(t,!0);const s=n.S;if(e&&s&Fe&&s&Ot)throw Wt&&t!==e&&oo(t,e),Ur(!0),n._;sf(t),r&&sf(r),Ur(!0)}function b1(t,e){Vr!==null&&t.De!==Ve&&e===t.De&&Vr.freshReads.add(t)}function v1(t,e){const n=!!(t.S&Fe),r=e&&!(n&&!t.Re),s=n&&t.Re!==r;return t.Re=r,s}function w1(t){const e=as,n=Vr;Ur(!0);const r=Vr={found:!1,sources:new Set,freshReads:new Set},s=()=>{Ur(!1);try{r.sources.forEach(i=>{nr(u1(i))&&!r.freshReads.has(i)&&(r.found=!0)})}finally{Ur(!0)}};try{return t(),s(),r.found}catch(i){if(s(),i instanceof It){const o=!!(i.source?.S&Ot);if(r.found&&!o)return!0;if(We&&o)throw i}return r.found}finally{Ur(e),Vr=n}}ue._e=d1;ue.ce=Ho;ue.Ge=f1;ue.un=$h;ue.St=g1;ue.At=y1;ue.Pt=b1;ue.$e=v1;ue.k=p1;ue.Lt=h1;function Vg(t,e,n,r){const s=!!r?.user,i=Uw(t,e,n,s?qn:vi,_1,r);Cr(i,!0),!r?.defer&&(i.Pe===qn||r?.schedule?i.C.enqueue(i.Pe,hl.bind(null,i)):hl(i))}function _1(t,e){const n=t!==void 0?t:this.S,r=e!==void 0?e:this._;if(n&ht){if(this.C.notify(this,Fe,0),this.Pe===qn){this.S&ht&&(this.Be=!0,this.C.enqueue(this.Pe,this.Je??=hl.bind(null,this)));return}if(!this.C.notify(this,ht,ht))throw Co(Fo(r)),r}else this.Pe===vi&&this.C.notify(this,Fe|ht,n,r)}function hl(t){if(!t.Be||t.se&Yn)return;if(t.S&ht&&t.Pe===qn){const n=Fo(t._);t.ct=t.Ue,t.Be=!1;try{t.ft?t.ft(n,()=>{const r=t.Et;t.Et=void 0,r?.()}):console.error(n)}catch(r){if(!t.C.notify(t,ht,ht))throw Co(r),r}return}const e=t.Et;t.Et=void 0;try{e?.();const n=t._t(t.Ue,t.ct);t.Et=n}catch(n){if(t._=new rl(t,n),t.S|=ht,!t.C.notify(t,ht,ht))throw Co(n),n}finally{t.ct=t.Ue,t.Be=!1}}ue.Xe=hl;function x1(t,e){const n=()=>{!r.Be||r.se&Yn||(r.Be=!1,Cr(r))},r=ks(()=>{const s=r.Et;r.Et=void 0,s?.();const i=Yw(t);r.Et=i},{...e,lazy:!0});r.Et=void 0,r.T=r.T&~lr|Pg,r.Be=!0,r.Pe=$l,r.i=(s,i)=>{if((s!==void 0?s:r.S)&ht){r.C.notify(r,Fe,0);const a=i!==void 0?i:r._;if(!r.C.notify(r,ht,ht))throw Co(Fo(a)),a}},r.Ft=n,r.C.enqueue(qn,n)}function bn(t){return Mh(t)}function Hr(t){const e=nr.bind(null,t);return e[mw]=t,e}function k1(t,e){if(typeof t=="function"){const r=ks(t,e);return r.T&=~lr,[Hr(r),Gw.bind(null,r)]}const n=ls(t,e);return[Hr(n),yn.bind(null,n)]}function Gr(t,e){return Hr(ks(t,e))}function S1(t,e,n){Vg(t,e.effect||e,e.error,{user:!0,...n})}function E1(t,e,n){Vg(t,e,void 0,n)}function A1(t,e){x1(t,e)}function Xr(t){const e=xs();e&&!(e.T&Pg)?A1(()=>Nt(t),void 0):At.enqueue(qn,()=>{t()})}const T1=Symbol(0),Ru=Symbol(0);function C1(t){return Reflect.ownKeys(t).filter(e=>Object.prototype.propertyIsEnumerable.call(t,e))}function M1(t,e,n){const r=typeof n?.keyed=="function"?n.keyed:void 0,s=e.length>1,i=e,o={wt:Ps(),jt:0,Wt:t,Mt:[],Kt:i,xt:[],Gt:[],Ut:r,$t:r||n?.keyed===!1?[]:void 0,qt:s&&n?.keyed!==!1?[]:void 0,zt:n?.keyed===!1,Bt:n?.fallback},a=ks(R1.bind(o));return o.wt.Tt=a,a.T&=~lr,Hr(a)}const ta={ownedWrite:!0};function R1(){const t=this.Wt()||[],e=t.length;return t[T1],jn(this.wt,()=>{let n,r,s,i,o=this.$t?this.zt?()=>(s[r]=ls(t[r],ta),this.Kt(Hr(s[r]),r)):()=>(s[r]=ls(t[r],ta),i&&(i[r]=ls(r,ta)),this.Kt(Hr(s[r]),i?Hr(i[r]):void 0)):this.qt?()=>{const a=t[r];return i[r]=ls(r,ta),this.Kt(a,Hr(i[r]))}:()=>{const a=t[r];return this.Kt(a)};if(e===0)this.jt!==0&&(this.wt.dispose(!1),this.Gt=[],this.Mt=[],this.xt=[],this.jt=0,this.$t&&(this.$t=[]),this.qt&&(this.qt=[])),this.Bt&&!this.xt[0]&&(this.Gt[0]?.dispose(),this.xt[0]=jn(this.Gt[0]=Ps(),this.Bt));else if(this.jt===0){const a=new Array(e),l=new Array(e);s=this.$t&&new Array(e),i=this.qt&&new Array(e);try{for(r=0;r<e;r++)a[r]=jn(l[r]=Ps(),o)}catch(c){for(n=0;n<=r;n++)l[n]?.dispose();throw c}this.Gt[0]&&this.Gt[0].dispose(),this.xt=a,this.Gt=l,s&&(this.$t=s),i&&(this.qt=i),this.Mt=t.slice(0),this.jt=e}else{let a,l,c,u,h,d,f,m,p;for(a=0,l=Math.min(this.jt,e);a<l&&(this.Mt[a]===t[a]||this.$t&&af(this.Ut,this.Mt[a],t[a]));a++)this.$t&&yn(this.$t[a],t[a]);for(l=this.jt-1,c=e-1;l>=a&&c>=a&&(this.Mt[l]===t[c]||this.$t&&af(this.Ut,this.Mt[l],t[c]));l--,c--);if(a===e&&this.jt===e){this.Mt=t.slice(0);return}const y=e-this.jt,g=new Array(e),b=new Array(e);for(s=this.$t?new Array(e):void 0,i=this.qt?new Array(e):void 0,d=new Map,f=new Array(c+1),r=c;r>=a;r--)u=t[r],h=this.Ut?this.Ut(u):u,n=d.get(h),f[r]=n===void 0?-1:n,d.set(h,r);for(n=a;n<=l;n++)u=this.Mt[n],h=this.Ut?this.Ut(u):u,r=d.get(h),r!==void 0&&r!==-1?(g[r]=this.xt[n],b[r]=this.Gt[n],s&&(s[r]=this.$t[n]),i&&(i[r]=this.qt[n]),r=f[r],d.set(h,r)):(m??=[]).push(this.Gt[n]);try{for(r=a;r<=c;r++)b[r]===void 0&&((p??=[]).push(b[r]=Ps()),g[r]=jn(b[r],o))}catch(v){if(p)for(n=0;n<p.length;n++)p[n].dispose();throw v}for(n=0;n<a;n++)g[n]=this.xt[n],b[n]=this.Gt[n],s&&(s[n]=this.$t[n]),i&&(i[n]=this.qt[n]);for(r=a;r<=c;r++)s&&yn(s[r],t[r]),i&&yn(i[r],r);for(r=c+1;r<e;r++)g[r]=this.xt[r-y],b[r]=this.Gt[r-y],s&&(s[r]=this.$t[r-y],yn(s[r],t[r])),i&&(i[r]=this.qt[r-y],y!==0&&yn(i[r],r));if(this.xt=g,this.Gt=b,s&&(this.$t=s),i&&(this.qt=i),this.jt=e,this.Mt=t.slice(0),m)for(n=0;n<m.length;n++)m[n].dispose()}}),this.xt}function af(t,e,n){return t?t(e)===t(n):!0}function na(){return!0}const I1={get(t,e,n){return e===Ru?n:t.get(e)},has(t,e){return e===Ru?!0:t.has(e)},set:na,deleteProperty:na,getOwnPropertyDescriptor(t,e){return{configurable:!0,enumerable:!0,get(){return t.get(e)},set:na,deleteProperty:na}},ownKeys(t){return t.keys()}};function mc(t){return(t=typeof t=="function"?t():t)?t:{}}const gc=Symbol(0);function z1(...t){if(t.length===1&&typeof t[0]!="function")return t[0];let e=!1;const n=[];for(let l=0;l<t.length;l++){const c=t[l];e=e||!!c&&Ru in c;const u=!!c&&c[gc];if(u)for(let h=0;h<u.length;h++)n.push(u[h]);else n.push(typeof c=="function"?(e=!0,Gr(c)):c)}if(pw&&e)return new Proxy({get(l){if(l===gc)return n;for(let c=n.length-1;c>=0;c--){const u=mc(n[c]);if(l in u)return u[l]}},has(l){for(let c=n.length-1;c>=0;c--)if(l in mc(n[c]))return!0;return!1},keys(){const l=new Set;for(let c=0;c<n.length;c++){const u=C1(mc(n[c]));for(let h=0;h<u.length;h++)l.add(u[h])}return[...l]}},I1);const r=Object.create(null);let s=!1,i=n.length-1;for(let l=i;l>=0;l--){const c=n[l];if(!c){l===i&&i--;continue}const u=Object.getOwnPropertyNames(c);for(let h=u.length-1;h>=0;h--){const d=u[h];if(!(d==="__proto__"||d==="constructor")&&!r[d]){s=s||l!==i;const f=Object.getOwnPropertyDescriptor(c,d);r[d]=f.get?{enumerable:!0,configurable:!0,get:f.get.bind(c)}:f}}}if(!s)return n[i];const o={},a=Object.keys(r);for(let l=a.length-1;l>=0;l--){const c=a[l],u=r[c];u.get?Object.defineProperty(o,c,u):o[c]=u.value}return o[gc]=n,o}function P1(t,e){const n=ks(t,{lazy:!0});return n.i=(r,s)=>{const i=r!==void 0?r:n.S,o=s!==void 0?s:n._;n.S&=~n.R;const a=n.C.notify(n,Fe|ht,i,o),l=i&~n.R&(Fe|ht);if(l&&(n.S&=~l,n._===o&&!(n.S&(Fe|ht))&&(n._=void 0)),!a&&i&ht)throw Co(Fo(o)),o},n.R=e,n.T&=~lr,Cr(n,!0),n}function O1(t,e,n,r){const s=t.C;return s.addChild(t.C=n),Mh(()=>s.removeChild(t.C)),jn(t,()=>{const i=ks(e);return P1(()=>Fl(nr(i)),r)})}const lf=Symbol();class $1 extends Og{$;v=new Set;ee;N=!0;I=ls(!1,{ownedWrite:!0,V:!0});_;D=ls(!1,{ownedWrite:!0,V:!0});B;W=!1;te;re=lf;constructor(e){super(),this.$=e}run(e){if(!(!e||nr(this.I)))return super.run(e)}notify(e,n,r,s){if(!(n&this.$))return super.notify(e,n,r,s);if(this.W&&this.te){const i=Nt(()=>{try{return this.te()}catch{return lf}});i!==this.re&&(this.re=i,this.W=!1,this.v.clear())}if(this.$&Fe&&this.W)return super.notify(e,n,r,s);if(r&this.$){this.N=!0;const i=s?.source||e._?.source;if(i){const o=this.v.size===0;this.v.add(i),o&&yn(this.I,!0),this.$&ht&&yn(this._,Fo(i._))}}return n&=~this.$,n?super.notify(e,n,r,s):!0}ne(){for(const e of this.v)(e.se&Yn||!e.t&&!(e.S&this.$)&&!(this.$&ht&&e.S&Fe))&&this.v.delete(e);if(!this.v.size&&(this.$&Fe&&this.N&&!this.W&&this.ee?this.N=!!(this.ee.S&this.$):this.N=!1,!this.N&&(yn(this.I,!1),this.te)))try{this.re=Nt(()=>this.te())}catch{}}}function L1(t,e,n,r){const s=Ps(),i=new $1(t);r&&(i.te=r);const o=i.ee=O1(s,e,i,t);return Nt(()=>{let a=!1;try{nr(o)}catch(l){if(l instanceof It)a=!0;else throw l}i.N=a||!!(o.S&t)||o._ instanceof It}),Hr(ks(()=>{if(!nr(i.I)){const a=nr(o);if(!Nt(()=>nr(i.I)))return i.W=!0,a}return n(i)},{V:!0}))}function D1(t,e,n){return L1(Fe,t,()=>e(),n?.on)}function Fl(t,e){if(typeof t=="function"&&!t.length){if(e?.doNotUnwrap)return t;do t=t();while(typeof t=="function"&&!t.length)}if(!(e?.skipNonRendered&&(t==null||t===!0||t===!1||t===""))){if(Array.isArray(t)){let n=[];return Iu(t,n,e)?()=>{let r=[];return Iu(n,r,{...e,doNotUnwrap:!1}),r}:n}return t}}function Iu(t,e=[],n){let r=null,s=!1;for(let i=0;i<t.length;i++)try{let o=t[i];if(typeof o=="function"&&!o.length){if(n?.doNotUnwrap){e.push(o),s=!0;continue}do o=o();while(typeof o=="function"&&!o.length)}Array.isArray(o)?s=Iu(o,e,n):n?.skipNonRendered&&(o==null||o===!0||o===!1||o==="")||e.push(o)}catch(o){if(!(o instanceof It))throw o;r=o}if(r)throw r;return s}function Bl(t,e){const n=Symbol("");function r(s){return Dl(()=>(Xw(r,s.value),N1(()=>s.children)))}return r.id=n,r.defaultValue=t,r}function Ul(t){return qw(t)}function N1(t){const e=Gr(t,{lazy:!0}),n=Gr(()=>Fl(e()),{lazy:!0,sync:!0});return n.toArray=()=>{const r=n();return Array.isArray(r)?r:r!=null?[r]:[]},n}const Sr={hydrating:!1,registry:void 0,done:!1,isHydrationInProgress:F1,onHydrationEnd:B1};let yc=null,Gg=0;function F1(){return Sr.hydrating||Gg>0}function B1(t){if(!Sr.hydrating&&Gg===0){queueMicrotask(t);return}yc||(yc=[]),yc.push(t)}let U1;const Bt=(...t)=>Gr(...t),ge=(...t)=>k1(...t),Lh=(...t)=>E1(...t),or=(...t)=>S1(...t),H1=(t,e,n)=>D1(t,e,n);function re(t,e){return Nt(()=>t(e||{}))}function j1(t,e){let n,r;const s=i=>{Sr.hydrating&&(n=U1(n,e));let o=n;o||(r||(r=t()),r.then(l=>{n=()=>l.default}),o=Gr(()=>r.then(l=>l.default)));let a;return Gr(()=>(a=(n||o)())?Nt(()=>a(i)):"",{sync:!0})};return s.preload=()=>r||((r=t()).then(i=>n=()=>i.default),r),s.moduleUrl=e,s}const W1=t=>`Stale read from <${t}>.`;function on(t){const e="fallback"in t?{keyed:t.keyed,fallback:()=>t.fallback}:{keyed:t.keyed};return M1(()=>t.each,t.children,e)}function Ne(t){const e=t.keyed,n=Gr(()=>t.when,void 0),r=e?n:Gr(n,{equals:(s,i)=>!s==!i,sync:!0});return Gr(()=>{const s=r();if(s){const i=t.children;return typeof i=="function"&&i.length>0?Nt(e?()=>i(s):()=>i(()=>{if(!Nt(r))throw W1("Show");return n()})):i}return t.fallback},{sync:!0})}function V1(t){const e="on"in t?{on:()=>t.on}:void 0;return H1(()=>t.children,()=>t.fallback,e)}const cf={INPUT:{value:1,defaultValue:2,checked:1,defaultChecked:2},SELECT:{value:1},OPTION:{value:1,selected:1,defaultSelected:2},TEXTAREA:{value:1,defaultValue:2},VIDEO:{muted:1,defaultMuted:2},AUDIO:{muted:1,defaultMuted:2}},G1=new Set(["innerHTML","textContent","innerText","children"]),nn=Symbol("slot"),uf=Symbol("host"),Y1=new Set(["beforeinput","click","dblclick","contextmenu","focusin","focusout","input","keydown","keyup","mousedown","mousemove","mouseout","mouseover","mouseup","pointerdown","pointermove","pointerout","pointerover","pointerup","touchend","touchmove","touchstart"]),q1={svg:"http://www.w3.org/2000/svg",mathml:"http://www.w3.org/1998/Math/MathML",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace"},X1={transparent:!0,sync:!0},Z1={sync:!0},he=(t,e,n)=>Lh(t,e,n?{sync:!0,...n,transparent:!n.scope}:X1),Zt=t=>Bt(()=>t(),Z1);function J1(t,e,n,r){let s=n.length,i=e.length,o=s,a=0,l=0,c=e[i-1],u=c[nn],h=c.parentNode===t&&(!u||u===r)?c.nextSibling:r||null,d=null,f,m;for(;a<i||l<o;){if(e[a]===n[l]){a++,l++;continue}for(;e[i-1]===n[o-1];)i--,o--;if(i===a){let p;if(o<s)if(l){const y=n[l-1],g=y[nn];p=y.parentNode===t&&(!g||g===r)?y.nextSibling:h}else p=n[o-l];else p=h;for(;l<o;){const y=n[l++];t.insertBefore(y,p),r&&(y[nn]=r)}}else if(o===l)for(;a<i;){const p=e[a++];if(!d||!d.has(p)){const y=p[nn];p.parentNode===t&&(!y||y===r)&&p.remove()}}else if((f=e[a])===n[o-1]&&n[l]===e[i-1]&&f.parentNode===t&&(!(m=f[nn])||m===r))if(r)do{const p=e[--i];if(t.insertBefore(p,f),p[nn]=r,l++,a>=i-1||l>=o)break}while(e[a]===n[o-1]&&n[l]===e[i-1]);else do if(t.insertBefore(e[--i],f),l++,a>=i-1||l>=o)break;while(e[a]===n[o-1]&&n[l]===e[i-1]);else{if(!d){d=new Map;let y=l;for(;y<o;)d.set(n[y],y++)}const p=d.get(e[a]);if(p!=null)if(l<p&&p<o){let y=a,g=1,b;for(;++y<i&&y<o&&!((b=d.get(e[y]))==null||b!==p+g);)g++;if(g>p-l){const v=e[a],x=v[nn],k=v.parentNode===t&&(!x||x===r)?v:h;for(;l<p;){const C=n[l++];t.insertBefore(C,k),r&&(C[nn]=r)}}else{const v=e[a++],x=n[l++],k=v[nn];v.parentNode===t&&(!k||k===r)?t.replaceChild(x,v):t.insertBefore(x,h),r&&(x[nn]=r)}}else a++;else{const y=e[a++],g=y[nn];y.parentNode===t&&(!g||g===r)&&y.remove()}}}}const hf="_$DX_EVENT_OWNER",df={},zu=new Set,Us=new Map;function Q1(t,e,n,r={}){let s;K1(e);try{Dl(i=>{if(s=i,e===document){const o=t();he(()=>Fl(o),()=>{})}else{const o=t();ne(e,()=>o,e.firstChild?null:void 0,n,r.insertOptions)}},{id:r.renderId})}catch(i){throw s&&s(),pf(e),i}return()=>{s(),pf(e),e.textContent=""}}function ff(t,e,n){const r=document.createElement("template");return r.innerHTML=t,n===2?r.content.firstChild.firstChild:r.content.firstChild}function de(t,e){let n;return e===1?s=>document.importNode(n||(n=ff(t,s,e)),!0):s=>(n||(n=ff(t,s,e))).cloneNode(!0)}function Ir(t){for(let e=0,n=t.length;e<n;e++){const r=t[e];zu.has(r)||(zu.add(r),Us.forEach((s,i)=>Xg(r,i,s)))}}function K1(t){const e=Yg(t,t);e&&(e.roots=(e.roots||0)+1)}function pf(t){const e=Us.get(t);e&&(e.roots>1?e.roots--:delete e.roots),qg(t,t)}function Yg(t,e=t){if(!t||!e)return;let n=Us.get(t);return n||Us.set(t,n={owners:new Map,handlers:new Map}),n.owners.set(e,(n.owners.get(e)||0)+1),zu.forEach(r=>Xg(r,t,n)),n}function qg(t,e=t){const n=Us.get(t);if(!n)return;const r=n.owners.get(e);r>1?n.owners.set(e,r-1):n.owners.delete(e),!n.owners.size&&(n.handlers.forEach((s,i)=>t.removeEventListener(i,s)),Us.delete(t))}function Xg(t,e,n){if(n.handlers.has(t))return;const r=s=>u_(s,e,n);n.handlers.set(t,r),e.addEventListener(t,r)}function e_(t){for(;t;){if(Us.get(t)?.roots)return t;t=t._$host||t.parentNode||t.host}}function t_(t,e){let n=t,r=0;for(;n;){if(e.owners.has(n))return{owner:n,distance:r};r++,n=n._$host||n.parentNode||n.host}}let cs=null;const n_=Symbol.for("dom-expressions.element-claims");function r_(t){return(cs||(cs=globalThis[n_]=[])).push(t),()=>{const e=cs.indexOf(t);e>-1&&cs.splice(e,1)}}function s_(t){if(cs!==null)for(let e=0;e<cs.length;e++)cs[e](t);return t}function ut(t,e,n){Hl(t)||(n==null||n===!1?t.removeAttribute(e):t.setAttribute(e,n===!0?"":n),cs!==null&&(e==="href"||e==="action")&&s_(t))}function i_(t,e,n,r){Hl(t)||(r==null||r===!1?t.removeAttributeNS(e,n.indexOf(":")>-1?n.split(":").pop():n):t.setAttributeNS(e,n,r===!0?"":r))}function q(t,e,n){if(Hl(t))return;if(e==null||e===!1){n&&t.removeAttribute("class");return}if(typeof e=="string"){e!==n&&t.setAttribute("class",e);return}typeof n=="string"?(n={},t.removeAttribute("class")):n=mf(n||{}),e=mf(e);const r=Object.keys(e||{}),s=Object.keys(n);let i,o;for(i=0,o=s.length;i<o;i++){const a=s[i];!a||a==="undefined"||e[a]||t.classList.remove(a)}for(i=0,o=r.length;i<o;i++){const a=r[i],l=!!e[a];!a||a==="undefined"||n[a]===l||!l||t.classList.add(a)}}function Zg(t,e,n,r){if(r)Array.isArray(n)?(t[`$$${e}`]=n[0],t[`$$${e}Data`]=n[1]):t[`$$${e}`]=n;else if(Array.isArray(n)){const s=n[0];t.addEventListener(e,n[0]=i=>s.call(t,n[1],i))}else t.addEventListener(e,n,typeof n!="function"&&n)}function Dh(t,e,n){if(!e){(n||t._$styles)&&(ut(t,"style"),t._$styles=void 0);return}const r=t.style;if(typeof e=="string")return t._$styles=void 0,r.cssText=e;typeof n=="string"&&(r.cssText="",n=void 0);let s=t._$styles;s||(s=t._$styles=n?{...n}:{});let i,o;for(o in s)e[o]==null&&(r.removeProperty(o),delete s[o]);for(o in e)i=e[o],i!=null&&i!==s[o]&&(r.setProperty(o,i),s[o]=i)}function Rt(t,e,n){n!=null?t.style.setProperty(e,n):t.style.removeProperty(e)}function o_(t,e={},n){const r={};return ne(t,()=>e.children),he(()=>{const s=e.ref;(typeof s=="function"||Array.isArray(s))&&Zn(()=>s,t)},()=>{}),he(()=>{const s={};for(const i in e)i==="children"||i==="ref"||(s[i]=e[i]);return s},s=>c_(t,s,!0,r,!0)),r}function a_(t,e){Array.isArray(t)?t.flat(1/0).forEach(n=>n&&n(e)):t(e)}function Zn(t,e){const n=Nt(t);jn(null,()=>a_(n,e))}const l_={scope:!0};function ne(t,e,n,r,s){const i=n!==void 0,o=s&&s.host;if(i&&!r&&(r=[]),typeof e!="function"&&(e=vc(e,r,i,!0),typeof e!="function")){bc(t,e,r,n),o&&Ta(e,o);return}if(i&&r.length===0){const l=document.createTextNode("");t.insertBefore(l,n),r=[l]}let a=r;he(l=>{const c=vc(e(),a,i,!0);return typeof c!="function"?c:(he(()=>vc(c,a,i),u=>{bc(t,u,a,n),a=u,o&&Ta(a,o)},l!==void 0&&!(s&&s.schedule)?{...s,schedule:!0}:s),df)},l=>{l!==df&&(bc(t,l,a,n),a=l,o&&Ta(a,o))},e.$s?s?{...s,scope:!0}:l_:s)}function c_(t,e,n,r={},s=!1){const i=t.nodeName;e||(e={});for(const o in r)if(!(o in e)){if(o==="children")continue;r[o]=gf(t,o,null,r[o],s,i)}for(const o in e)o!=="children"&&(r[o]=gf(t,o,e[o],r[o],s,i))}function Hl(t){if(!Sr.hydrating)return!1;if(!t||t.isConnected)return!0;const e=Sr.claimRoots;if(e){for(let n=0;n<e.length;n++)if(e[n].contains(t))return!0}return!1}function mf(t){if(Array.isArray(t)){const e={};Jg(t,e),t=e}if(t&&typeof t=="object"){const e={},n=Object.keys(t);for(let r=0,s=n.length;r<s;r++){const i=n[r];if(!t[i])continue;const o=i.trim().split(/\s+/);for(let a=0,l=o.length;a<l;a++)o[a]&&(e[o[a]]=!0)}return e}return t}function Jg(t,e){for(let n=0,r=t.length;n<r;n++){const s=t[n];Array.isArray(s)?Jg(s,e):typeof s=="object"&&s!=null?Object.assign(e,s):(s||s===0)&&(e[s]=!0)}}function gf(t,e,n,r,s,i){if(e==="style")return Dh(t,n,r),n;if(e==="class")return q(t,n,r),n;if(n===r&&cf[i]?.[e]!==1)return r;if(e==="ref")return!s&&n&&Zn(()=>n,t),n;const o=e.indexOf(":")>-1;if(!o&&e.slice(0,2)==="on"){const a=e.slice(2).toLowerCase(),l=Y1.has(a);if(!l&&r){const c=Array.isArray(r)?r[0]:r;t.removeEventListener(a,c)}(l||n)&&(Zg(t,a,n,l),l&&Ir([a]))}else if(o&&e.slice(0,5)==="prop:"||G1.has(e)||cf[i]?.[e]){if(o)e=e.slice(5);else if(Hl(t))return n;e==="value"&&i==="SELECT"?queueMicrotask(()=>t.value=n)||(t.value=n):(e==="value"||e==="defaultValue")&&(i==="INPUT"||i==="TEXTAREA")?t[e]=n??"":t[e]=n}else{const a=o&&q1[e.split(":")[0]];a?i_(t,a,e,n):ut(t,e,n)}return n}function u_(t,e,n){const r=t[hf];let s;if(r){if(r===!0||r===e||!e.contains(r))return;s=r}const i=n&&(n.owners.size===1&&n.owners.has(e)?e:t_(t.target,n)?.owner);if(n&&!i)return;t[hf]=i||!0;let o=s||t.target;const a=`$$${t.type}`,l=t.target,c=i||e||t.currentTarget,u=f=>Object.defineProperty(t,"target",{configurable:!0,value:f}),h=()=>{const f=o[a];if(f&&!o.disabled){const m=o[`${a}Data`];if(m!==void 0?f.call(o,m,t):f.call(o,t),t.cancelBubble)return}return o.host&&typeof o.host!="string"&&!o.host._$host&&o.contains(t.target)&&u(o.host),!0},d=()=>{for(;h()&&!(o===c||o.parentNode===c);)o=o._$host||o.parentNode||o.host};if(Object.defineProperty(t,"currentTarget",{configurable:!0,get(){return o||c||document}}),s)s===t.target&&(o=s._$host||s.parentNode||s.host),o&&o!==c&&d();else if(t.composedPath){const f=t.composedPath();if(f.length){u(f[0]);for(let m=0;m<f.length&&(o=f[m],!!h());m++){if(o._$host){o=o._$host,d();break}if(o===c||o.parentNode===c)break}}else d()}else d();u(l)}function bc(t,e,n,r){if(e===n)return;const s=typeof e,i=r!==void 0;if(s==="string"||s==="number"){const o=typeof n;o==="string"||o==="number"?t.firstChild.data=e:Qg(t,n)?t.textContent=e:(Kg(t,n),t.insertBefore(document.createTextNode(e),t.firstChild))}else if(e===void 0)ra(t,n,r);else if(e.nodeType)Array.isArray(n)?ra(t,n,i?r:null,e):n&&n.nodeType?n.parentNode===t?t.replaceChild(e,n):t.appendChild(e):n&&t.firstChild?t.replaceChild(e,t.firstChild):t.appendChild(e),r&&(e[nn]=r);else if(Array.isArray(e)){const o=n&&Array.isArray(n);e.length===0?ra(t,n,r):o?n.length===0?yf(t,e,r):J1(t,n,e,r):(n&&ra(t,n),yf(t,e))}}function vc(t,e,n,r){if(t=Fl(t,{skipNonRendered:!0,doNotUnwrap:r}),r&&typeof t=="function")return t;if(n&&!Array.isArray(t)&&(t=[t??""]),Array.isArray(t))for(let s=0,i=t.length;s<i;s++){const o=t[s],a=e&&e[s],l=typeof o;(l==="string"||l==="number")&&(t[s]=a&&a.nodeType===3&&(Sr.hydrating||a.data===""+o)?a:document.createTextNode(o))}return t}function Ta(t,e){if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)Ta(t[n],e);else t&&t.nodeType&&t[uf]!==e&&(t[uf]=e,Object.defineProperty(t,"_$host",{get:e,configurable:!0}))}function yf(t,e,n=null){for(let r=0,s=e.length;r<s;r++){const i=e[r];t.insertBefore(i,n),n&&(i[nn]=n)}}function Qg(t,e){if(e==null)return!0;if(Array.isArray(e))return e.length?t.firstChild===e[0]&&t.lastChild===e[e.length-1]:t.firstChild===null;if(e==="")return t.firstChild===null;if(e.nodeType)return t.firstChild===e&&t.lastChild===e;const n=t.firstChild;return n!==null&&n.nodeType===3&&t.lastChild===n}function Kg(t,e){if(Array.isArray(e))for(let n=0;n<e.length;n++){const r=e[n];r.parentNode===t&&r.remove()}else if(e.nodeType)e.parentNode===t&&e.remove();else{const n=t.firstChild;n&&n.nodeType===3&&n.remove()}}function ra(t,e,n,r){if(n===void 0)return Qg(t,e)?t.textContent="":Kg(t,e);if(e.length){let s=!1;for(let i=e.length-1;i>=0;i--){const o=e[i];if(r!==o){const a=o[nn],l=o.parentNode===t&&(!a||a===n);r&&!s&&!i?l?t.replaceChild(r,o):t.insertBefore(r,n):l&&o.remove()}else s=!0}}else r&&t.insertBefore(r,n);r&&n&&(r[nn]=n)}const h_=Symbol.for("solid.ResponseEnvelope");function T4(t){return!!(t&&typeof t=="object"&&t[h_])}const C4="X-Revalidate",d_=z1,f_=!1;function p_(t,e,n,r={}){{const s=Q1(t,e,n,{...r,insertOptions:{schedule:!0}});return Fs(),s}}function m_(t){return jn(Ps(),()=>g_(t))}function g_(t){const e=document.createTextNode(""),n=document.createTextNode(""),r=document.createTextNode(""),s=()=>t.mount||document.body,i=Bt(()=>[n,t.children],{ssrSource:"client"});return Lh(()=>[s(),i(),xs()],([,o,a])=>{const l=Nt(s);l.appendChild(r);const c=jn(a,()=>Dl(u=>(ne(l,o,r,void 0,{host:()=>e.parentNode}),u)));return()=>{c();let u=n;for(;u;){const h=u.nextSibling;if(l.removeChild(u),u===r)break;u=h}}},{schedule:!0,ssrSource:"client"}),or(s,()=>{const o=Nt(s),a=e_(e);if(!(!a||a.contains(o)))return Yg(o,a),()=>qg(o,a)},{ssrSource:"client"}),Sr.hydrating?Bt(()=>e,{ssrSource:"client"}):e}const y_=/^(?:[a-z0-9]+:)?\/\//i,b_=/^\/+|(\/)\/+$/g,Mo="http://sr";function Os(t,e=!1){const n=t.replace(b_,"$1");return n?e||/^[?#]/.test(n)?n:"/"+n:""}const wc=t=>Os(t.split(/[?#]/,1)[0]).toLowerCase().replace(/\/$/,"");function Ca(t,e,n){if(y_.test(e))return;const r=Os(t),s=n&&Os(n);let i="";return!s||e.startsWith("/")?i=r:s.toLowerCase().indexOf(r.toLowerCase())!==0?i=r+s:i=s,(i||"/")+Os(e,!i)}function v_(t,e){if(t==null)throw new Error(e);return t}function w_(t,e){return Os(t).replace(/\/*(\*.*)?$/g,"")+Os(e)}function ey(t){const e={};return t.searchParams.forEach((n,r)=>{r in e?Array.isArray(e[r])?e[r].push(n):e[r]=[e[r],n]:e[r]=n}),e}function ty(t,e,n){const[r,s]=t.split("/*",2),i=r.split("/").filter(Boolean),o=i.length;return a=>{const l=a.split("/");if(l[0]===""&&l.shift(),l.length&&l[l.length-1]===""&&l.pop(),l.includes(""))return null;const c=l.length-o;if(c<0||c>0&&s===void 0&&!e)return null;const u={path:o?"":"/",params:{}},h=d=>n===void 0?void 0:n[d];for(let d=0;d<o;d++){const f=i[d],m=f[0]===":",p=m?l[d]:l[d].toLowerCase(),y=m?f.slice(1):f.toLowerCase();if(m&&_c(p,h(y)))u.params[y]=p;else if(m||!_c(p,y))return null;u.path+=`/${p}`}if(s){const d=c?l.slice(-c).join("/"):"";if(_c(d,h(s)))u.params[s]=d;else return null}return u}}function _c(t,e){const n=r=>r===t;return e===void 0?!0:typeof e=="string"?n(e):typeof e=="function"?e(t):Array.isArray(e)?e.some(n):e instanceof RegExp?e.test(t):!1}function __(t){const[e,n]=t.pattern.split("/*",2),r=e.split("/").filter(Boolean);return r.reduce((s,i)=>s+(i.startsWith(":")?2:3),r.length-(n===void 0?0:1))}function ny(t){const e=new Map,n=xs();return new Proxy({},{get(r,s){return e.has(s)||jn(n,()=>e.set(s,Bt(()=>t()[s]))),e.get(s)()},getOwnPropertyDescriptor(){return{enumerable:!0,configurable:!0}},ownKeys(){return Reflect.ownKeys(t())},has(r,s){return s in t()}})}function x_(t,e){const n=new URLSearchParams(t);Object.entries(e).forEach(([s,i])=>{i==null||i===""||i instanceof Array&&!i.length?n.delete(s):i instanceof Array?(n.delete(s),i.forEach(o=>{n.append(s,String(o))})):n.set(s,String(i))});const r=n.toString();return r?`?${r}`:""}function ry(t){let e=/(\/?\:[^\/]+)\?/.exec(t);if(!e)return[t];let n=t.slice(0,e.index),r=t.slice(e.index+e[0].length);const s=[n,n+=e[1]];for(;e=/^(\/\:[^\/]+)\?/.exec(r);)s.push(n+=e[1]),r=r.slice(e[0].length);return ry(r).reduce((i,o)=>[...i,...s.map(a=>a+o)],[])}function M4(t,e){return Object.defineProperty(t,"name",{value:e,writable:!1,configurable:!1}),t}function k_(t,e){const n=t.base.path(),r=new WeakMap,s=new Set;function i(u){return u.namespaceURI==="http://www.w3.org/2000/svg"}function o(u){if(e&&!u.hasAttribute("link"))return;const h=i(u),d=h?u.href.baseVal:u.getAttribute("href");if((h?u.target.baseVal:u.target)||!d)return;const m=(u.getAttribute("rel")||"").split(/\s+/);if(u.hasAttribute("download")||m.includes("external"))return;let p;try{p=new URL(d,document.baseURI)}catch{return}if(!(p.origin!==window.location.origin||n&&p.pathname&&!p.pathname.toLowerCase().startsWith(n.toLowerCase())))return wc(p.pathname)}function a(u){const h=decodeURI(wc(t.location.pathname)),d=t.isRouting(),f=o(u),m=y=>f!==void 0&&(y===f||f!==""&&y.startsWith(f+"/")),p=d&&!!t.pendingTarget&&m(decodeURI(wc(t.pendingTarget.value)));return{active:m(h),pending:p,exact:f!==void 0&&h===f}}function l(u,h,{active:d,pending:f,exact:m}){d?u.setAttribute("data-active",""):u.removeAttribute("data-active"),f?u.setAttribute("data-pending",""):u.removeAttribute("data-pending"),m!==h.current&&(m?u.setAttribute("aria-current","page"):u.removeAttribute("aria-current"),h.current=m)}const c=(u,h)=>Nt(()=>l(u,h,a(u)));Lh(()=>(t.location.pathname,t.isRouting()),()=>s.forEach(u=>c(u,r.get(u))),{transparent:!0}),bn(r_(u=>{if(u.nodeName.toUpperCase()!=="A")return;const h=u,d=r.get(h);if(d)return c(h,d);const f={current:!1};r.set(h,f),xs()&&(s.add(h),bn(()=>s.delete(h))),c(h,f)}))}const S_="modulepreload",E_=function(t){return"/big-mesh-studios/voxelscape/"+t},bf={},xr=function(e,n,r){let s=Promise.resolve();if(n&&n.length>0){let l=function(c){return Promise.all(c.map(u=>Promise.resolve(u).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),a=o?.nonce||o?.getAttribute("nonce");s=l(n.map(c=>{if(c=E_(c),c in bf)return;bf[c]=!0;const u=c.endsWith(".css"),h=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${h}`))return;const d=document.createElement("link");if(d.rel=u?"stylesheet":S_,u||(d.as="script"),d.crossOrigin="",d.href=c,a&&d.setAttribute("nonce",a),document.head.appendChild(d),u)return new Promise((f,m)=>{d.addEventListener("load",f),d.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${c}`)))})}))}function i(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return s.then(o=>{for(const a of o||[])a.status==="rejected"&&i(a.reason);return e().catch(i)})};let Pu;function R4(t){Pu=t}function A_({preload:t=!0,explicitLinks:e=!1,actionBase:n="/_server",transformUrl:r}={}){return s=>{const i=s.base.path(),o=s.navigatorFactory(s.base);let a,l;function c(p){return p.namespaceURI==="http://www.w3.org/2000/svg"}function u(p){if(p.defaultPrevented||p.button!==0||p.metaKey||p.altKey||p.ctrlKey||p.shiftKey)return;const y=p.composedPath().find(C=>C instanceof Node&&C.nodeName.toUpperCase()==="A");if(!y||e&&!y.hasAttribute("link"))return;const g=c(y),b=g?y.href.baseVal:y.href;if((g?y.target.baseVal:y.target)||!b&&!y.hasAttribute("state"))return;const x=(y.getAttribute("rel")||"").split(/\s+/);if(y.hasAttribute("download")||x&&x.includes("external"))return;const k=g?new URL(b,document.baseURI):new URL(b);if(!(k.origin!==window.location.origin||i&&k.pathname&&!k.pathname.toLowerCase().startsWith(i.toLowerCase())))return[y,k]}function h(p){const y=u(p);if(!y)return;const[g,b]=y,v=s.parsePath(b.pathname+b.search+b.hash),x=g.getAttribute("state");p.preventDefault(),o(v,{resolve:!1,replace:g.hasAttribute("replace"),scroll:!g.hasAttribute("noscroll"),state:x?JSON.parse(x):void 0})}function d(p){const y=u(p);if(!y)return;const[g,b]=y;r&&(b.pathname=r(b.pathname)),s.preloadRoute(b,g.getAttribute("preload")!=="false")}function f(p){clearTimeout(a);const y=u(p);if(!y)return l=null;const[g,b]=y;l!==g&&(r&&(b.pathname=r(b.pathname)),a=setTimeout(()=>{s.preloadRoute(b,g.getAttribute("preload")!=="false"),l=g},20))}function m(p){if(Pu)return Pu(p,s,n);if(p.defaultPrevented)return;const y=p.target,g=p.submitter&&p.submitter.hasAttribute("formaction")?p.submitter.getAttribute("formaction"):y.getAttribute("action");if(!g||g.startsWith("https://action/"))return;const b=new URL(g,document.baseURI),v=s.parsePath(b.pathname+b.search);if(!v.startsWith(n)||y.method.toUpperCase()!=="POST")return;p.preventDefault();const x=new FormData(y,p.submitter);xr(()=>import("./serverForms-clGxJ5vw.js"),[]).then(k=>k.submitServerForm(s,v,y,x))}Ir(["click","submit"]),document.addEventListener("click",h),t&&(document.addEventListener("mousemove",f,{passive:!0}),document.addEventListener("focusin",d,{passive:!0}),document.addEventListener("touchstart",d,{passive:!0})),document.addEventListener("submit",m),bn(()=>{document.removeEventListener("click",h),t&&(document.removeEventListener("mousemove",f),document.removeEventListener("focusin",d),document.removeEventListener("touchstart",d)),document.removeEventListener("submit",m)})}}const T_=t=>String(t).split("/").map(encodeURIComponent).join("/");function C_(t=n=>n,e=""){const n=(s,i="")=>t(s||"/")+i;function r(s){const i=(...o)=>{let a=s;for(let l=0;l<o.length;l++){const c=o[l];if(typeof c=="object"&&c!==null){const u=typeof o[l+1]=="string"?`#${o[l+1]}`:"";return n(a,x_("",c)+u)}a+=`/${T_(c)}`}return o.length?r(a):n(a)};return new Proxy(i,{get(o,a){return a==="toString"?()=>n(s):typeof a=="symbol"?a===Symbol.toPrimitive?()=>n(s):void 0:r(`${s}/${a}`)}})}return r(Os(e))}const M_=100,Ou=Bl(),Nh=Bl();function Fh(t){try{return Ul(t)}catch{return}}const sy=()=>v_(Ul(Ou),"<A> and 'use' router primitives can be only used inside a Route."),R_=()=>Fh(Nh)||sy().base,I_=()=>sy().navigatorFactory();function z_(t){return R_().params}const P_=t=>encodeURIComponent(t).replace(/%(2B|40|3A|24|26|2C|3B|3D)/g,e=>decodeURIComponent(e)),vf=new WeakMap,[O_,$_]=ge(0);function L_(){return O_()}function D_(t){let e=vf.get(t);return e||vf.set(t,e={thunk:t}),e}function wf(t){return t.resolved?t.resolved:t.promise||=Promise.resolve(t.thunk()).then(e=>{const n=Array.isArray(e)?e:e.default||e.routes||[];return t.resolved=n,$_(r=>r+1),t.resolved})}function N_(t){const e=[];for(const n of t)n.route.lazy&&!n.route.lazy.resolved&&e.push(n.route.lazy);return e}function F_(t,e){const n=t+"/*";return{key:e,originalPath:"*",pattern:n,matcher:ty(n),lazy:e}}function B_(t,e=""){const{component:n,preload:r,children:s,info:i}=t,o=!s||Array.isArray(s)&&!s.length,a={key:t,component:n,preload:r,info:i};return iy(t.path).reduce((l,c)=>{for(const u of ry(c)){const h=w_(e,u);let d=o?h:h.split("/*",1)[0];d=d.split("/").map(f=>f.startsWith(":")||f.startsWith("*")?f:P_(f)).join("/"),l.push({...a,originalPath:c,pattern:d,matcher:ty(d,!o,t.matchFilters)})}return l},[])}function _f(t,e=0){return{routes:t,score:__(t[t.length-1])*1e4-e,matcher(n){const r=[];for(let s=t.length-1;s>=0;s--){const i=t[s],o=i.matcher(n);if(!o)return null;r.unshift({...o,route:i})}return r}}}function iy(t){return Array.isArray(t)?t:[t]}function oy(t,e="",n=[],r=[]){const s=iy(t);for(let i=0,o=s.length;i<o;i++){const a=s[i];if(a&&typeof a=="object"){a.hasOwnProperty("path")||(a.path="");const l=B_(a,e);for(const c of l){n.push(c);let u=a.children;if(typeof u=="function"){const d=D_(u);if(d.resolved)u=d.resolved;else{n.push(F_(c.pattern,d)),r.push(_f([...n],r.length)),n.pop(),n.pop();continue}}const h=Array.isArray(u)&&u.length===0;if(u&&!h)oy(u,c.pattern,n,r);else{const d=_f([...n],r.length);r.push(d)}n.pop()}}}return n.length?r:r.sort((i,o)=>o.score-i.score)}function $u(t,e){for(let n=0,r=t.length;n<r;n++){const s=t[n].matcher(e);if(s)return s}return[]}function ay(t){const e={};for(let n=0;n<t.length;n++)Object.assign(e,t[n].params);return e}function U_(t,e,n){const r=new URL(Mo),s=Bt((u=r)=>{const h=t();try{return new URL(h[0]==="/"?Mo+h:h,r)}catch{return console.error(`Invalid path ${h}`),u}},{equals:(u,h)=>u.href===h.href}),i=Bt(()=>s().pathname),o=Bt(()=>s().search),a=Bt(()=>s().hash),l=()=>"",c=Bt(()=>ey(s()));return{get pathname(){return i()},get search(){return o()},get hash(){return a()},get state(){return e()},get key(){return l()},query:n?n(c):ny(c)}}let dl;const mo=new Map;function H_(t){return mo.set(t,dl&&dl(t)),()=>{const e=mo.get(t);mo.delete(t),e&&e()}}function I4(t){if(!dl){dl=t;for(const[e,n]of mo)n||mo.set(e,t(e))}}let Is;function j_(){return Is}let zi=!1;function z4(){return zi}function xf(t){zi=t}function W_(t,e,n,r={}){const{signal:[s,i],utils:o={}}=t,a=o.parsePath||(R=>R),l=o.renderPath||(R=>R),c=o.beforeLeave||{},u=Ca("",r.base||""),h=Nt(s);if(u===void 0)throw new Error(`${u} is not a valid base path`);u&&!h.value&&i({value:u,replace:!0,scroll:!1});const[d,f]=ge(!1,{ownedWrite:!0}),[m,p]=ge(void 0,{ownedWrite:!0});let y;const g=Bt(()=>m()??s()),b=U_(()=>g().value,()=>g().state,o.queryWrapper),v=[];let x;const k=Bt(()=>{const R=typeof r.transformUrl=="function"?r.transformUrl(b.pathname):b.pathname,F=$u(e(),R),D=N_(F);if(D.length)throw new It(Promise.all(D.map(wf)));return F}),C=Bt(()=>d()||w1(()=>(k(),b.search,b.hash))),E=()=>ay(k()),T=o.paramsWrapper?R=>o.paramsWrapper(R,e):R=>ny(R),A=T(E),M={pattern:u,params:A,path:()=>u,outlet:()=>null,resolvePath(R){return Ca(u,R)}};return{base:M,location:b,params:A,wrapParams:T,isRouting:C,get pendingTarget(){return y},leaving(R){const F=y;if(!F||!R.retained)return!1;const D=F.value.split(/[?#]/,1)[0];return!R.retained(r.transformUrl?r.transformUrl(D):D)},renderPath:l,parsePath:a,navigatorFactory:S,matches:k,beforeLeave:c,preloadRoute:w,singleFlight:r.singleFlight===void 0?!0:r.singleFlight,get submissions(){return x||=ge([],{ownedWrite:!0})}};function P(R,F,D){Nt(()=>{if(typeof F=="number"){F&&(o.go?o.go(F):console.warn("Router integration does not support relative routing"));return}typeof F!="string"&&(F=F.toString());const{replace:te,resolve:H,scroll:Q,state:N}={replace:!1,resolve:!0,scroll:!0,...D};let B;if(!H)B=Ca((!F||F[0]==="?")&&b.pathname||"",F);else if(F[0]==="/")B=R.resolvePath(F);else{const oe=new URL(F,Mo+b.pathname+b.search+b.hash);B=oe.origin===Mo?oe.pathname+oe.search+oe.hash:void 0}if(B===void 0)throw new Error(`Path '${F}' is not a routable path`);if(v.length>=M_)throw new Error("Too many redirects");const le=g();if((B!==le.value||N!==le.state)&&!f_){if(!c.current||c.current.confirm(B,D)){v.push({value:le.value,replace:te,scroll:Q,state:le.state});const oe={value:B,state:N},X=y===void 0;Is="navigate",y=oe,X&&(f(!0),Fs()),y===oe&&(p({...y}),queueMicrotask(()=>{y===oe&&(Is=void 0,O(y),p(void 0),f(!1),y=void 0)}))}}})}function S(R){return R=R||Fh(Nh)||M,(F,D)=>P(R,F,D)}function O(R){const F=v[0];F&&(i({...R,replace:F.replace,scroll:F.scroll}),v.length=0)}function w(R,F){const D=$u(e(),R.pathname),te=D.find(Q=>Q.route.lazy&&!Q.route.lazy.resolved);te&&wf(te.route.lazy).then(()=>w(R,F));const H=Is;Is="preload";for(let Q in D){const{route:N,params:B}=D[Q];N.component&&N.component.preload&&N.component.preload();const{preload:le}=N;zi=!0,F&&le&&jn(n(),()=>le({params:B,location:{pathname:R.pathname,search:R.search,hash:R.hash,query:ey(R),state:null,key:""},intent:"preload"})),zi=!1}Is=H}}function V_(t,e,n,r,s=()=>[r()]){const{base:i,location:o,wrapParams:a}=t,{pattern:l,component:c,preload:u}=r().route,h=Bt(()=>r().path),d=a(()=>ay(s()));c&&c.preload&&c.preload(),zi=!0;const f=u?u({params:d,location:o,intent:Is||"initial"}):void 0;return zi=!1,{parent:e,pattern:l,params:d,path:h,retained(p){const y=r(),g=y.route.matcher(p);return!!g&&g.path===y.path},outlet:()=>c?re(c,{params:d,location:o,data:f,get children(){return n()}}):n(),resolvePath(p){return Ca(i.path(),p,h())}}}function G_(t){const e=t.routerState.location,n=t.routerState.params,r=Bt(()=>t.preload&&Nt(()=>{xf(!0);try{return t.preload({params:n,location:e,intent:j_()||"initial"})}finally{xf(!1)}})),s=t.root;return s?re(s,{params:n,location:e,get data(){return r()},get children(){return t.children}}):t.children}function Y_(t){const e=[];let n,r;bn(()=>e.forEach(a=>a()));const s=xs(),i=Bt(a=>{const l=t.routerState.matches(),c=r;let u=c&&l.length===c.length;const h=[];for(let d=0,f=l.length;d<f;d++){const m=c&&c[d],p=l[d];a&&m&&p.route.key===m.route.key?h[d]=a[d]:(u=!1,e[d]&&e[d](),jn(s,()=>Dl(y=>{e[d]=y;const g=p.route.key,b=Bt(v=>{const x=t.routerState.matches(),k=x[d];return k&&k.route.key===g?x:v||l});h[d]=V_(t.routerState,h[d-1]||t.routerState.base,kf(()=>i()?.[d+1]),()=>b()[d],b)})))}return e.splice(l.length).forEach(d=>d()),a&&u?(r=l,a):(n=h[0],r=l,h)}),o=kf(()=>i()&&n);return Zt(o)}const kf=t=>()=>{const e=t();if(e)return re(Nh,{value:e,get children(){return e.outlet()}})};function fl(t,e,n){return t.addEventListener(e,n),()=>t.removeEventListener(e,n)}let Lu;function Pi(){(!window.history.state||window.history.state._depth==null)&&window.history.replaceState({...window.history.state,_depth:window.history.length-1},""),Lu=window.history.state._depth}function ly(t){return{...t,_depth:window.history.state&&window.history.state._depth}}function cy(t,e){let n=!1;return()=>{const r=Lu;Pi();const s=r==null?null:Lu-r;if(n){n=!1;return}s&&e(s)?(n=!0,window.history.go(-s)):t()}}function uy(t,e){const n=t&&document.getElementById(t);n?n.scrollIntoView():e&&window.scrollTo(0,0)}function Sf(){const t=()=>{const n=window.location.pathname+window.location.search,r=window.history.state&&window.history.state._depth&&Object.keys(window.history.state).length===1?void 0:window.history.state;return{value:n+window.location.hash,state:r}},e={};return Pi(),{get:t,set({value:n,replace:r,scroll:s,state:i}){r?window.history.replaceState(ly(i),"",n):window.history.pushState(i,"",n),uy(decodeURIComponent(window.location.hash.slice(1)),s),Pi()},init:n=>fl(window,"popstate",cy(n,r=>{const s=e.current;if(!s)return!1;if(r)return!s.confirm(r);{const i=t();return!s.confirm(i.value,{state:i.state})}})),utils:{go:n=>window.history.go(n),beforeLeave:e}}}function q_(t){const e=t.replace(/^.*?#/,"");if(!e.startsWith("/")){const[,n="/"]=window.location.hash.split("#",2);return`${n}#${e}`}return e}function X_(){const t=()=>window.location.hash.slice(1),e={};return Pi(),{get:t,set({value:n,replace:r,scroll:s,state:i}){r?window.history.replaceState(ly(i),"","#"+n):window.history.pushState(i,"","#"+n);const o=n.indexOf("#"),a=o>=0?n.slice(o+1):"";uy(a,s),Pi()},init:n=>fl(window,"hashchange",cy(n,r=>{const s=e.current;return!!s&&!s.confirm(r&&r<0?r:t())})),utils:{go:n=>window.history.go(n),renderPath:n=>`#${n}`,parsePath:q_,beforeLeave:e}}}const Ef="solid-router:scroll";function Z_(){window.history.scrollRestoration="manual",Pi();let t={};try{t=JSON.parse(sessionStorage.getItem(Ef))||{}}catch{}const e=()=>window.history.state&&window.history.state._depth;let n=!1,r;const s=[fl(window,"scroll",()=>{const o=e();o!=null&&(t[o]=window.scrollY),n||(r=void 0)}),fl(window,"pagehide",()=>{try{sessionStorage.setItem(Ef,JSON.stringify(t))}catch{}})],i=()=>{if(r==null)return;const o=t[r];r=void 0,o!=null&&(n=!0,window.scrollTo(0,o),n=!1)};return{onPop(){r=e()},onPush(){const o=e();if(o!=null)for(const a in t)+a>=o&&delete t[a]},create(o){or(()=>({url:o.location.pathname+o.location.search+o.location.hash,routing:o.isRouting()}),l=>{l.routing||i()},{transparent:!0}),bn(()=>s.forEach(l=>l()));const[a]=performance.getEntriesByType&&performance.getEntriesByType("navigation");a&&a.type!=="navigate"&&(r=e())}}}function J_(t,e){return{...t,set(n){t.set(n),n.replace||e.onPush()},init:t.init&&(n=>t.init(r=>{e.onPop(),n(r)}))}}function Q_(t){let e=!1;const n=o=>typeof o=="string"?{value:o}:o,[r,s]=ge(n(t.get()),{equals:(o,a)=>o.value===a.value&&o.state===a.state,ownedWrite:!0}),i=[r,o=>{!e&&t.set(o),Sr.registry&&!Sr.done&&(Sr.done=!0),s(o)}];return t.init&&bn(t.init((o=t.get())=>{e=!0,i[1](n(o)),e=!1})),{signal:i,utils:t.utils}}function K_(t){const e=t.base||"";let n,r=-1;const s=()=>{const c=L_();return(!n||r!==c)&&(n=oy(t.routes,e),r=c),n},i=t.history&&t.history.utils&&t.history.utils.renderPath||void 0;function o(c){Fh(Ou)&&console.warn("Mounting a router inside another router is not supported. Compose route trees in one createRouter config instead.");const u=Nt(()=>c.children);let h,d=t.history;(t.scrollRestoration??!d)&&(h=Z_(),d=J_(d||Sf(),h));const f=Q_(d||Sf());let m;const p=W_(f,s,()=>m,{base:e,singleFlight:t.singleFlight,transformUrl:t.transformUrl});return A_({preload:t.preloadLinks,explicitLinks:t.explicitLinks,actionBase:t.actionBase,transformUrl:t.transformUrl})(p),k_(p,t.explicitLinks),p.singleFlight&&bn(H_(p)),h&&h.create(p),re(Ou,{value:p,get children(){return re(G_,{routerState:p,root:u,get preload(){return t.preload},get children(){return[Zt(()=>(m=xs())&&null),re(Y_,{routerState:p,branches:s})]}})}})}const a=Object.assign(o,{routes:t.routes,config:t,match(c){const u=new URL(c,Mo),h=t.transformUrl?t.transformUrl(u.pathname):u.pathname;return $u(s(),h).map(({route:d,path:f,params:m})=>({path:d.originalPath,pattern:d.pattern,match:f,params:m,info:d.info}))}});let l;return Object.defineProperty(a,"paths",{get:()=>l||(l=C_(i,e))}),a}const ex="_canvas_1p9qu_1",tx="_container_1p9qu_12",nx="_joining_1p9qu_17",rx="_ending_1p9qu_26",br={canvas:ex,"debug-perf":"_debug-perf_1p9qu_9",container:tx,joining:nx,ending:rx,"ending-panel":"_ending-panel_1p9qu_35","ending-title":"_ending-title_1p9qu_41","ending-text":"_ending-text_1p9qu_45","ending-button":"_ending-button_1p9qu_50"},sx=new TextEncoder;new TextDecoder("utf-8",{fatal:!0,ignoreBOM:!0});const ix=crypto.subtle,Bh=t=>sx.encode(t),ox=t=>t>=56320&&t<=57343,ax=(t,e,n)=>{const r=t.length;if(r*3<e)return!1;if(r>=e&&r*3<=n)return!0;let s=0,i=0;for(;s<r;){const o=t.charCodeAt(s);if(o<128?(s+=1,i+=1):o<2048?(s+=1,i+=2):o<55296||o>56319?(s+=1,i+=3):ox(t.charCodeAt(s+1))?(s+=2,i+=4):(s+=1,i+=3),i>n)return!1}return i>=e},lx=async t=>new Uint8Array(await ix.digest("SHA-256",t)),cx=/^did:([a-z]+):([a-zA-Z0-9._:%-]*[a-zA-Z0-9._-])$/,Uh=t=>typeof t=="string"&&t.length>=7&&t.length<=2048&&cx.test(t),hy=t=>t>=65&&t<=90||t>=97&&t<=122,xc=t=>hy(t)||t>=48&&t<=57,ux=(t,e,n)=>{const r=n-e;if(r===0||r>63)return!1;const s=t.charCodeAt(e);if(!xc(s))return!1;if(r>1){if(!xc(t.charCodeAt(n-1)))return!1;for(let i=e+1;i<n-1;i++){const o=t.charCodeAt(i);if(!xc(o)&&o!==45)return!1}}return!0},dy=t=>{if(typeof t!="string")return!1;const e=t.length;if(e<3||e>253)return!1;let n=0,r=0,s=0;for(let i=0;i<=e;i++)if(i===e||t.charCodeAt(i)===46){if(!ux(t,n,i))return!1;s=n,n=i+1,r++}return r<2?!1:hy(t.charCodeAt(s))},hx=t=>Uh(t)||dy(t),dx=/^((?!0{4})\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))T((?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d))(\.\d+)?(Z|(?!-00:00)[+-](?:[01]\d|2[0-3]):(?:[0-5]\d))$/,fx=t=>typeof t=="string"&&t.length>=20&&t.length<=64&&dx.test(t),px=/^\w+:(?:\/\/)?[^\s/][^\s]*$/,mx=t=>typeof t!="string"||!ax(t,3,8192)?!1:px.test(t),In=(t,e,n)=>(Object.defineProperty(t,e,{value:n}),n),Hh=t=>({get value(){const e=t();return In(this,"value",e)}}),fy=Array.isArray,Af=t=>typeof t=="object"&&t!==null&&!fy(t),gx=Hh(()=>{if(typeof navigator<"u"&&navigator?.userAgent?.includes("Cloudflare"))return!1;try{const t=Function;return new t(""),!0}catch{return!1}}),Ma=(t,e)=>t?{ok:!1,code:"join",left:t,right:e}:e,go=(t,e)=>({ok:!1,code:"prepend",key:t,tree:e}),Du=t=>({ok:!0,value:t}),yx=0,ao=1,bx=t=>JSON.stringify(t),py=(t,e=[],n=[])=>{for(;;)switch(t.code){case"join":{py(t.left,e.slice(),n),t=t.right;continue}case"prepend":{e.push(t.key),t=t.tree;continue}default:return n.push({message:t.msg(),path:e.length>0?e:void 0}),n}},Ys=t=>({version:1,vendor:"@atcute/lexicons",validate(e){const n=t["~run"](e,yx);return n===void 0?{value:e}:n.ok?{value:n.value}:{issues:py(n)}}}),Nu=t=>{const e={ok:!1,code:"invalid_literal",expected:[t],msg(){return`expected ${bx(t)}`}};return{kind:"schema",type:"literal",expected:t,"~run"(n,r){if(n!==t)return e},get"~standard"(){return In(this,"~standard",Ys(this))}}},Tf={ok:!1,code:"invalid_type",expected:"integer",msg(){return"expected integer"}},vx={kind:"schema",type:"integer","~run"(t,e){if(typeof t!="number"||!Number.isSafeInteger(t))return Tf},get"~standard"(){return In(this,"~standard",Ys(this))}},vr=()=>vx,wx={ok:!1,code:"invalid_type",expected:"string",msg(){return"expected string"}},my=(t,e)=>{const n={ok:!1,code:"invalid_string_format",expected:t,msg(){return`expected a ${t} formatted string`}},r={kind:"schema",type:"string",format:t,"~run"(s,i){if(typeof s!="string")return wx;if(!e(s))return n},get"~standard"(){return In(this,"~standard",Ys(this))}};return()=>r},gy=my("datetime",fx),yy=my("uri",mx),Fu=t=>({kind:"schema",type:"nullable",wrapped:t,"~run"(e,n){if(e!==null)return t["~run"](e,n)},get"~standard"(){return In(this,"~standard",Ys(this))}}),by=(t,e)=>({kind:"schema",type:"optional",wrapped:t,default:e,"~run"(n,r){if(n!==void 0)return t["~run"](n,r)},get"~standard"(){return In(this,"~standard",Ys(this))}}),_x=t=>t.type==="optional",xx={ok:!1,code:"invalid_type",expected:"array",msg(){return"expected array"}},vy=t=>{const e=Hh(()=>typeof t=="function"?t():t);return{kind:"schema",type:"array",get item(){return In(this,"item",e.value)},get"~run"(){const n=e.value;return In(this,"~run",(s,i)=>{if(!fy(s))return xx;let o,a;for(let l=0,c=s.length;l<c;l++){const u=s[l],h=n["~run"](u,i);if(h!==void 0)if(h.ok)a===void 0&&(a=s.slice()),a[l]=h.value;else{if(i&ao)return go(l,h);o=Ma(o,go(l,h))}}if(o!==void 0)return o;if(a!==void 0)return Du(a)})},get"~standard"(){return In(this,"~standard",Ys(this))}}},Cf={ok:!1,code:"invalid_type",expected:"object",msg(){return"expected object"}},kx={ok:!1,code:"missing_value",msg(){return"missing value"}},Sx=(t,e,n)=>{e==="__proto__"?Object.defineProperty(t,e,{value:n}):t[e]=n},jl=t=>{const e=Hh(()=>{const n=[];for(const r in t){const s=t[r];n.push({key:r,schema:s,optional:_x(s),missing:go(r,kx)})}return n});return{kind:"schema",type:"object",get shape(){const n=e.value,r={};for(const s of n)r[s.key]=s.schema;return In(this,"shape",r)},get"~run"(){const n=e.value,r=n.length,s=()=>{const o=[["$ok",Du],["$joinIssues",Ma],["$prependPath",go]];let a="let $iss,$out;";for(let c=0;c<r;c++){const u=n[c],h=u.key,d=JSON.stringify(h),f=`_${c}`;if(a+=`{const $val=$in[${d}];`,u.optional?a+="if($val!==undefined){":a+=`if($val!==undefined||${d} in $in){`,a+=`const $res=${f}$schema["~run"]($val,$flags);if($res!==undefined)if($res.ok)${h!=="__proto__"?`($out??={...$in})[${d}]=$res.value`:`Object.defineProperty($out??={...$in},${d},{value:$res.value})`};else if((($iss=$joinIssues($iss,$prependPath(${d},$res))),$flags&${ao}))return $iss;}`,u.optional){const m=u.schema,p=m.wrapped,y=m.default;if(o.push([`${f}$schema`,p]),y!==void 0){const g=typeof y=="function"?`${f}$default()`:`${f}$default`;o.push([`${f}$default`,y]),a+=h!=="__proto__"?`else($out??={...$in})[${d}]=${g};`:`else Object.defineProperty($out??={...$in},${d},{value:${g}});`}}else o.push([`${f}$schema`,u.schema]),o.push([`${f}$missing`,u.missing]),a+=`else if((($iss=$joinIssues($iss,${f}$missing)),$flags&${ao}))return $iss;`;a+="}"}return a+="if($iss!==undefined)return $iss;if($out!==undefined)return $ok($out);",new Function(`[${o.map(([c])=>c).join(",")}]`,`return function matcher($in,$flags){${a}}`)(o.map(([,c])=>c))};if(gx.value){const o=s();return In(this,"~run",(l,c)=>Af(l)?o(l,c):Cf)}return In(this,"~run",(o,a)=>{if(!Af(o))return Cf;let l,c;for(let u=0;u<r;u++){const h=n[u],d=h.key,f=o[d];if(!h.optional&&f===void 0&&!(d in o)){if(l=Ma(l,h.missing),a&ao)return l;continue}const m=h.schema["~run"](f,a);if(m!==void 0){if(m.ok)c===void 0&&(c={...o}),Sx(c,d,m.value);else if(l=Ma(l,go(d,m)),a&ao)return l}}if(l!==void 0)return l;if(c!==void 0)return Du(c)})},get"~standard"(){return In(this,"~standard",Ys(this))}}},Ex=t=>typeof t=="object"?t.handle.bind(t):t,Ro=({service:t,fetch:e=fetch})=>async(n,r)=>{const s=new URL(n,t);return await e(s.href,r)},Mf=/\bapplication\/json\b/;class Hs{constructor({handler:e,proxy:n=null}){this.handler=Ex(e),this.proxy=n}clone({handler:e=this.handler,proxy:n=this.proxy}={}){return new Hs({handler:e,proxy:n})}get(e,n={}){return this.#e("get",e,n)}post(e,n={}){return this.#e("post",e,n)}async call(e,n={}){}async#e(e,n,{signal:r,as:s="json",headers:i,input:o,params:a}){const l=o&&(o instanceof Blob||ArrayBuffer.isView(o)||o instanceof ArrayBuffer||o instanceof ReadableStream),c=`/xrpc/${n}`+Ax(a),u=await this.handler(c,{method:e,signal:r,body:o&&!l?JSON.stringify(o):o,headers:Tx(i,{"content-type":o&&!l?"application/json":null,"atproto-proxy":this.proxy}),duplex:o instanceof ReadableStream?"half":void 0});{const h=u.status,d=u.headers,f=d.get("content-type");if(h!==200){let m;if(f!=null&&Mf.test(f))try{const p=await u.json();Cx(p)&&(m=p)}catch{}else await u.body?.cancel();return{ok:!1,status:h,headers:d,data:m??{error:"UnknownXRPCError",message:`Request failed with status code ${h}`}}}{let m;switch(s){case"json":{if(f!=null&&Mf.test(f))m=await u.json();else throw await u.body?.cancel(),new TypeError(`Invalid response content-type (got ${f})`);break}case null:{m=null,await u.body?.cancel();break}case"blob":{m=await u.blob();break}case"bytes":{m=new Uint8Array(await u.arrayBuffer());break}case"stream":{m=u.body;break}}return{ok:!0,status:h,headers:d,data:m}}}}}const Ax=t=>{let e;for(const n in t){const r=t[n];if(r!==void 0)if(e??=new URLSearchParams,Array.isArray(r))for(let s=0,i=r.length;s<i;s++){const o=r[s];e.append(n,""+o)}else e.set(n,""+r)}return e?"?"+e.toString():""},Tx=(t,e)=>{let n;for(const r in e){const s=e[r];s!==null&&(n??=new Headers(t),n.has(r)||n.set(r,s))}return n??t},Cx=t=>{const e=t;if(typeof e!="object"||e==null)return!1;const n=typeof e.error,r=typeof e.message;return n==="string"&&(r==="undefined"||r==="string")},Hn=t=>{if(t instanceof Promise)return t.then(Hn);if(t.ok)return t.data;throw new Mx(t)};class Mx extends Error{constructor({status:e,headers:n=new Headers,data:r}){super(`${r.error} > ${r.message??"(unspecified description)"}`),this.name="ClientResponseError",this.error=r.error,this.description=r.message,this.status=e,this.headers=n}}function Rx(t){const e="at://";for(const n of t.alsoKnownAs??[])if(n.startsWith(e)){const r=n.slice(e.length);return r===""?null:r}return null}async function Ix(t){const e=Rx(t.document);if(e===null)return null;try{return await t.resolveDid(e)===t.did?e:null}catch{return null}}const zx="app.bsky.actor.profile",Px="self",Ox=t=>{if(typeof t!="object"||t===null)return null;const e=t.avatar;if(typeof e!="object"||e===null)return null;const n=e.ref;if(typeof n!="object"||n===null)return null;const r=n.$link;return typeof r=="string"&&r!==""?r:null},$x=(t,e,n)=>`${t}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(e)}&cid=${encodeURIComponent(n)}`,Lx={lang:void 0,message:void 0,abortEarly:void 0,abortPipeEarly:void 0};function wy(t){return Lx}let Dx;function Nx(t){return Dx?.get(t)}let Fx;function Bx(t){return Fx?.get(t)}let Ux;function Hx(t,e){return Ux?.get(t)?.get(e)}function _y(t){const e=typeof t;return e==="string"?`"${t}"`:e==="number"||e==="bigint"||e==="boolean"?`${t}`:e==="object"||e==="function"?(t&&Object.getPrototypeOf(t)?.constructor?.name)??"null":e}function vn(t,e,n,r,s){const i=s&&"input"in s?s.input:n.value,o=s?.expected??t.expects??null,a=s?.received??_y(i),l={kind:t.kind,type:t.type,input:i,expected:o,received:a,message:`Invalid ${e}: ${o?`Expected ${o} but r`:"R"}eceived ${a}`,requirement:t.requirement,path:s?.path,issues:s?.issues,lang:r.lang,abortEarly:r.abortEarly,abortPipeEarly:r.abortPipeEarly},c=t.kind==="schema",u=s?.message??t.message??Hx(t.reference,l.lang)??(c?Bx(l.lang):null)??r.message??Nx(l.lang);u!==void 0&&(l.message=typeof u=="function"?u(l):u),c&&(n.typed=!1),n.issues?n.issues.push(l):n.issues=[l]}function jx(t,e){return t===e||Number.isNaN(t)&&Number.isNaN(e)}function xy(t,e){return Object.prototype.hasOwnProperty.call(t,e)&&e!=="__proto__"&&e!=="prototype"&&e!=="constructor"}function Wx(t,e){const n=[...new Set(t)];return n.length>1?`(${n.join(` ${e} `)})`:n[0]??"never"}function Pn(t){return t["~standard"]={version:1,vendor:"valibot",validate:e=>t["~run"]({value:e},wy())},t}var Vx=class extends Error{constructor(t){super(t[0].message),this.name="ValiError",this.issues=t}};function ms(t,e){return{kind:"validation",type:"check",reference:ms,async:!1,expects:null,requirement:t,message:e,"~run"(n,r){return n.typed&&!this.requirement(n.value)&&vn(this,"input",n,r),n}}}function ky(t,e){return{kind:"validation",type:"regex",reference:ky,async:!1,expects:`${t}`,requirement:t,message:e,"~run"(n,r){return n.typed&&!this.requirement.test(n.value)&&vn(this,"format",n,r),n}}}function jh(t){return{kind:"transformation",type:"transform",reference:jh,async:!1,operation:t,"~run"(e){return e.value=this.operation(e.value),e}}}function Gx(t,e,n){return typeof t.fallback=="function"?t.fallback(e,n):t.fallback}function Yx(t,e){return{...t,"~run"(n,r){const s=n.issues&&[...n.issues];if(n=t["~run"](n,r),n.issues){for(const i of n.issues)if(!s?.includes(i)){let o=n.value;for(const a of e){const l=o[a],c={type:"unknown",origin:"value",input:o,key:a,value:l};if(i.path?i.path.push(c):i.path=[c],!l)break;o=l}}}return n}}}function Sy(t,e,n){return typeof t.default=="function"?t.default(e,n):t.default}function Dn(t,e){return Pn({kind:"schema",type:"array",reference:Dn,expects:"Array",async:!1,item:t,message:e,"~run"(n,r){const s=n.value;if(Array.isArray(s)){n.typed=!0,n.value=[];for(let i=0;i<s.length;i++){const o=s[i],a=this.item["~run"]({value:o},r);if(a.issues){const l={type:"array",origin:"value",input:s,key:i,value:o};for(const c of a.issues)c.path?c.path.unshift(l):c.path=[l],n.issues?.push(c);if(n.issues||(n.issues=a.issues),r.abortEarly){n.typed=!1;break}}a.typed||(n.typed=!1),n.value.push(a.value)}}else vn(this,"type",n,r);return n}})}function hi(t){return Pn({kind:"schema",type:"boolean",reference:hi,expects:"boolean",async:!1,message:t,"~run"(e,n){return typeof e.value=="boolean"?e.typed=!0:vn(this,"type",e,n),e}})}function Ey(t,e){return Pn({kind:"schema",type:"custom",reference:Ey,expects:"unknown",async:!1,check:t,message:e,"~run"(n,r){return this.check(n.value)?n.typed=!0:vn(this,"type",n,r),n}})}function Ay(t,e){return Pn({kind:"schema",type:"literal",reference:Ay,expects:_y(t),async:!1,literal:t,message:e,"~run"(n,r){return jx(n.value,this.literal)?n.typed=!0:vn(this,"type",n,r),n}})}function Ss(t,e){return Pn({kind:"schema",type:"loose_object",reference:Ss,expects:"Object",async:!1,entries:t,message:e,"~run"(n,r){const s=n.value;if(s&&typeof s=="object"){n.typed=!0,n.value={};for(const i in this.entries){const o=this.entries[i];if(i in s||(o.type==="exact_optional"||o.type==="optional"||o.type==="nullish")&&o.default!==void 0){const a=i in s?s[i]:Sy(o),l=o["~run"]({value:a},r);if(l.issues){const c={type:"object",origin:"value",input:s,key:i,value:a};for(const u of l.issues)u.path?u.path.unshift(c):u.path=[c],n.issues?.push(u);if(n.issues||(n.issues=l.issues),r.abortEarly){n.typed=!1;break}}l.typed||(n.typed=!1),n.value[i]=l.value}else if(o.fallback!==void 0)n.value[i]=Gx(o);else if(o.type!=="exact_optional"&&o.type!=="optional"&&o.type!=="nullish"&&(vn(this,"key",n,r,{input:void 0,expected:`"${i}"`,path:[{type:"object",origin:"key",input:s,key:i,value:s[i]}]}),r.abortEarly))break}if(!n.issues||!r.abortEarly)for(const i in s)xy(s,i)&&!Object.prototype.hasOwnProperty.call(this.entries,i)&&(n.value[i]=s[i])}else vn(this,"type",n,r);return n}})}function Ty(t){return Pn({kind:"schema",type:"number",reference:Ty,expects:"number",async:!1,message:t,"~run"(e,n){return typeof e.value=="number"&&!isNaN(e.value)?e.typed=!0:vn(this,"type",e,n),e}})}function Nn(t,e){return Pn({kind:"schema",type:"optional",reference:Nn,expects:`(${t.expects} | undefined)`,async:!1,wrapped:t,default:e,"~run"(n,r){return n.value===void 0&&(this.default!==void 0&&(n.value=Sy(this,n,r)),n.value===void 0)?(n.typed=!0,n):this.wrapped["~run"](n,r)}})}function pl(t,e,n){return Pn({kind:"schema",type:"record",reference:pl,expects:"Object",async:!1,key:t,value:e,message:n,"~run"(r,s){const i=r.value;if(i&&typeof i=="object"){r.typed=!0,r.value={};for(const o in i)if(xy(i,o)){const a=i[o],l=this.key["~run"]({value:o},s);if(l.issues){const u={type:"object",origin:"key",input:i,key:o,value:a};for(const h of l.issues)h.path=[u],r.issues?.push(h);if(r.issues||(r.issues=l.issues),s.abortEarly){r.typed=!1;break}}const c=this.value["~run"]({value:a},s);if(c.issues){const u={type:"object",origin:"value",input:i,key:o,value:a};for(const h of c.issues)h.path?h.path.unshift(u):h.path=[u],r.issues?.push(h);if(r.issues||(r.issues=c.issues),s.abortEarly){r.typed=!1;break}}(!l.typed||!c.typed)&&(r.typed=!1),l.typed&&(r.value[l.value]=c.value)}}else vn(this,"type",r,s);return r}})}function Gt(t){return Pn({kind:"schema",type:"string",reference:Gt,expects:"string",async:!1,message:t,"~run"(e,n){return typeof e.value=="string"?e.typed=!0:vn(this,"type",e,n),e}})}function Cy(t,e){return Pn({kind:"schema",type:"tuple",reference:Cy,expects:"Array",async:!1,items:t,message:e,"~run"(n,r){const s=n.value;if(Array.isArray(s)){n.typed=!0,n.value=[];for(let i=0;i<this.items.length;i++){const o=s[i],a=this.items[i]["~run"]({value:o},r);if(a.issues){const l={type:"array",origin:"value",input:s,key:i,value:o};for(const c of a.issues)c.path?c.path.unshift(l):c.path=[l],n.issues?.push(c);if(n.issues||(n.issues=a.issues),r.abortEarly){n.typed=!1;break}}a.typed||(n.typed=!1),n.value.push(a.value)}}else vn(this,"type",n,r);return n}})}function Rf(t){let e;if(t)for(const n of t)if(e)for(const r of n.issues)e.push(r);else e=n.issues;return e}function $s(t,e){return Pn({kind:"schema",type:"union",reference:$s,expects:Wx(t.map(n=>n.expects),"|"),async:!1,options:t,message:e,"~run"(n,r){let s,i,o;for(const a of this.options){const l=a["~run"]({value:n.value},r);if(l.typed)if(l.issues)i?i.push(l):i=[l];else{s=l;break}else o?o.push(l):o=[l]}if(s)return s;if(i){if(i.length===1)return i[0];vn(this,"type",n,r,{issues:Rf(i)}),n.typed=!0}else{if(o?.length===1)return o[0];vn(this,"type",n,r,{issues:Rf(o)})}return n}})}function My(){return Pn({kind:"schema",type:"unknown",reference:My,expects:"unknown",async:!1,"~run"(t){return t.typed=!0,t}})}function qx(t,e,n){const r=t["~run"]({value:e},wy());if(r.issues)throw new Vx(r.issues);return r.value}function Er(...t){return Pn({...t[0],pipe:t,"~run"(e,n){for(const r of t)if(r.kind!=="metadata"){if(e.issues&&(r.kind==="schema"||r.kind==="transformation")){e.typed=!1;break}(!e.issues||!n.abortEarly&&!n.abortPipeEarly)&&(e=r["~run"](e,n))}return e}})}const Xx=/^#[^#]+$/,Zx=/^z[a-km-zA-HJ-NP-Z1-9]+$/,di=Er(Gt(),ms(t=>URL.canParse(t),"must be a url")),Wh=Er(Gt(),ms(t=>Xx.test(t)||URL.canParse(t),"must be a did relative uri")),Jx=Er(Gt(),ky(Zx,"must be a base58 multibase")),Ra=Ey(Uh,"must be a did"),If=Er(Ss({id:Wh,type:Gt(),controller:Ra,publicKeyMultibase:Nn(Jx),publicKeyJwk:Nn(pl(Gt(),My()))}),Yx(ms(t=>{switch(t.type){case"Multikey":case"EcdsaSecp256k1VerificationKey2019":case"EcdsaSecp256r1VerificationKey2019":return t.publicKeyMultibase!==void 0}return!0},"missing public key multibase"),["publicKeyMultibase"])),Qx=Ss({id:Wh,type:$s([Gt(),Dn(Gt())]),serviceEndpoint:$s([di,pl(Gt(),di),Dn($s([di,pl(Gt(),di)]))])}),kc=(t,e=n=>n)=>{const n=new Set;for(const r of t){const s=e(r);if(n.has(s))return!0;n.add(s)}return!1},Kx=Er(Ss({"@context":Nn(Dn(di)),id:Ra,alsoKnownAs:Nn(Er(Dn(di),ms(t=>!kc(t),"duplicate aka entries"))),verificationMethod:Nn(Er(Dn(If),ms(t=>!kc(t,e=>e.id),"duplicate verification method ids"))),service:Nn(Dn(Qx)),controller:Nn($s([Ra,Dn(Ra)])),authentication:Nn(Dn($s([Wh,If])))}),ms(t=>{const e=t.service;if(!e?.length)return!0;const n=t.id,r=e.map(s=>s.id[0]==="#"?n+s.id:s.id);return!kc(r)},"duplicate service ids")),ek="parse"in URL,tk=t=>{let e=null;if(ek)e=URL.parse(t);else try{e=new URL(t)}catch{}return e!==null&&(e.protocol==="https:"||e.protocol==="http:")&&e.pathname==="/"&&e.search===""&&e.hash===""},zf=t=>{const e=t.alsoKnownAs;if(!e)return null;const n="at://";for(let r=0,s=e.length;r<s;r++){const i=e[r];if(!i.startsWith(n))continue;const o=i.slice(n.length);return dy(o)?o:void 0}return null},nk=(t,e)=>{const n=t.service;if(n)for(let r=0,s=n.length;r<s;r++){const{id:i,type:o,serviceEndpoint:a}=n[r];if(!(i!==e.id&&i!==t.id+e.id)){if(e.type!==void 0){if(Array.isArray(o)){if(!o.includes(e.type))continue}else if(o!==e.type)continue}if(!(typeof a!="string"||!tk(a)))return a}}},rk=t=>nk(t,{id:"#atproto_pds",type:"AtprotoPersonalDataServer"}),sk=/^did:plc:([a-z2-7]{24})$/,ik=t=>typeof t=="string"&&t.length===32&&sk.test(t),ok=/^did:web:([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?:\.[a-zA-Z]{2,})|localhost(?:%3[aA]\d+)?)$/,ak=t=>typeof t=="string"&&t.length>=12&&ok.test(t),lk=t=>{const[e,...n]=t.slice(8).split(":").map(decodeURIComponent);let r="/"+n.join("/");r==="/"?r="/.well-known/did.json":r+="/did.json";const s=new URL(`https://${e}${r}`);return s.hostname==="localhost"&&(s.protocol="http:"),s},Ry=t=>ik(t)||ak(t),ck=t=>{const e=t.indexOf(":",4);return t.slice(4,e)};class Vh extends Error{name="DidResolutionError"}class Gh extends Vh{name="UnsupportedDidMethodError";did;constructor(e){super(`unsupported did method; did=${e}`),this.did=e}}class Iy extends Vh{name="DocumentNotFoundError";did;constructor(e){super(`did document not found; did=${e}`),this.did=e}}class zy extends Vh{name="FailedDocumentResolutionError";did;constructor(e,n){super(`failed to resolve did document; did=${e}`,n),this.did=e}}class Wl extends Error{name="HandleResolutionError"}class Bu extends Wl{name="DidNotFoundError";handle;constructor(e){super(`handle returned no did; handle=${e}`),this.handle=e}}class Uu extends Wl{name="FailedHandleResolutionError";handle;constructor(e,n){super(`failed to resolve handle; handle=${e}`,n),this.handle=e}}class Py extends Wl{name="InvalidResolvedHandleError";handle;did;constructor(e,n){super(`handle returned invalid did; handle=${e}; did=${n}`),this.handle=e,this.did=n}}class Oy extends Wl{name="AmbiguousHandleError";constructor(e){super(`handle returned multiple did values; handle=${e}`)}}class Sc extends Error{name="ActorResolutionError"}class uk{handleResolver;didDocumentResolver;constructor(e){this.handleResolver=e.handleResolver,this.didDocumentResolver=e.didDocumentResolver}async resolve(e,n){const r=Uh(e);let s;if(r)s=e;else try{s=await this.handleResolver.resolve(e,n)}catch(l){throw new Sc("failed to resolve handle",{cause:l})}let i;try{i=await this.didDocumentResolver.resolve(s,n)}catch(l){throw new Sc("failed to resolve did document",{cause:l})}const o=rk(i);if(!o)throw new Sc("missing pds endpoint");let a="handle.invalid";if(r){const l=zf(i);if(l)try{await this.handleResolver.resolve(l,n)===s&&(a=l)}catch{}}else zf(i)===e&&(a=e);return{did:s,handle:a,pds:new URL(o).href}}}class hk{#e;constructor({methods:e}){this.#e=new Map(Object.entries(e))}async resolve(e,n){const r=ck(e),s=this.#e.get(r);if(s===void 0)throw new Gh(e);return await s.resolve(e,n)}}function Yh(...t){return t.reduce(dk)}const dk=(t,e)=>n=>t(n).then(e);let Vl=class extends Error{name="FetchResponseError"};class Gl extends Vl{name="FailedResponseError";response;constructor(e){super(`got http ${e.status}`),this.response=e}get status(){return this.response.status}}class Pf extends Vl{name="ImproperContentTypeError";contentType;constructor(e,n){super(n),this.contentType=e}}class Hu extends Vl{name="ImproperContentLengthError";expectedSize;actualSize;constructor(e,n,r){super(r),this.expectedSize=e,this.actualSize=n}}class fk extends Vl{name="ImproperResponseError"}class pk extends TransformStream{constructor(e){let n=0;super({transform(r,s){if(n+=r.length,n>e){s.error(new Hu(e,n,"response content-length too large"));return}s.enqueue(r)}})}}const qh=async t=>{if(t.ok)return t;throw new Gl(t)},mk=t=>async e=>{const n=await Dy(e,t);return{response:e,text:n}},$y=(t,e)=>async n=>{await gk(n,t);const r=await Dy(n,e);try{const s=JSON.parse(r);return{response:n,json:s}}catch(s){throw new fk("unexpected json data",{cause:s})}},Ly=t=>async e=>{const n=qx(t,e.json);return{response:e.response,json:n}},gk=async(t,e)=>{const n=t.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase();if(n===void 0)throw t.body&&await t.body.cancel(),new Pf(null,"missing response content-type");if(!e.test(n))throw t.body&&await t.body.cancel(),new Pf(n,"unexpected response content-type")},Dy=async(t,e)=>{const n=t.headers.get("content-length");if(n!==null){const i=Number(n);if(!/^\d+$/.test(n)||!Number.isSafeInteger(i))throw t.body?.cancel(),new Hu(e,null,"invalid response content-length");if(i>e)throw t.body?.cancel(),new Hu(e,i,"response content-length too large")}if(t.body===null)return"";const r=t.body.pipeThrough(new pk(e)).pipeThrough(new TextDecoderStream);let s="";for await(const i of yk(r))s+=i;return s},yk=Symbol.asyncIterator in ReadableStream.prototype?t=>t[Symbol.asyncIterator]():t=>{const e=t.getReader();return{[Symbol.asyncIterator](){return this},next(){return e.read()},async return(){return await e.cancel(),{done:!0,value:void 0}},async throw(n){return await e.cancel(n),{done:!0,value:void 0}}}},Io=Er(Ty(),ms(t=>Number.isInteger(t)&&t>=0&&t<=2**32-1)),bk=Ss({name:Gt(),type:Ay(16)}),vk=Ss({name:Gt(),type:Io,TTL:Io,data:Er(Gt(),jh(t=>t.replace(/^"|"$/g,"").replace(/\\"/g,'"')))}),wk=Ss({name:Gt(),type:Io,TTL:Io,data:Gt()}),_k=Ss({Status:Io,TC:hi(),RD:hi(),RA:hi(),AD:hi(),CD:hi(),Question:Cy([bk]),Answer:Nn(Er(Dn(vk),jh(t=>t.filter(e=>e.type===16))),()=>[]),Authority:Nn(Dn(wk)),Comment:Nn($s([Gt(),Dn(Gt())]))}),xk=Yh(qh,$y(/^application\/(dns-)?json$/,16*1024),Ly(_k)),Ny=Yh(qh,$y(/^application\/(did\+ld\+)?json$/,20*1024),Ly(Kx));class kk{apiUrl;#e;constructor({apiUrl:e="https://plc.directory",fetch:n=fetch}={}){this.apiUrl=e,this.#e=n}async resolve(e,n){if(!e.startsWith("did:plc:"))throw new Gh(e);let r;try{const s=new URL(`/${encodeURIComponent(e)}`,this.apiUrl),i=await(0,this.#e)(s,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,redirect:"manual",headers:{accept:"application/did+ld+json,application/json"}});if(i.status>=300&&i.status<400)throw new TypeError("unexpected redirect");r=(await Ny(i)).json}catch(s){throw s instanceof Gl&&s.status===404?new Iy(e):new zy(e,{cause:s})}return r}}class Sk{#e;constructor({fetch:e=fetch}={}){this.#e=e}async resolve(e,n){if(!e.startsWith("did:web:"))throw new Gh(e);let r;try{const s=lk(e),i=await(0,this.#e)(s,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,redirect:"manual",headers:{accept:"application/did+ld+json,application/json"}});if(i.status>=300&&i.status<400)throw new TypeError("unexpected redirect");r=(await Ny(i)).json}catch(s){throw s instanceof Gl&&s.status===404?new Iy(e):new zy(e,{cause:s})}return r}}class Ek{#e;strategy;constructor({methods:e,strategy:n="race"}){this.#e=e,this.strategy=n}async resolve(e,n){const{http:r,dns:s}=this.#e,i=n?.signal,o=new AbortController;i&&i.addEventListener("abort",()=>o.abort(),{signal:o.signal});const a=s.resolve(e,{...n,signal:o.signal}),l=r.resolve(e,{...n,signal:o.signal});switch(this.strategy){case"race":return new Promise(c=>{a.then(u=>{o.abort(),c(u)},()=>c(l)),l.then(u=>{o.abort(),c(u)},()=>c(a))});case"dns-first":{l.catch(sa);const c=await a.catch(sa);return c?(o.abort(),c):l}case"http-first":{a.catch(sa);const c=await l.catch(sa);return c?(o.abort(),c):a}case"both":{const[c,u]=await Promise.allSettled([a,l]),h=c.status==="fulfilled"?c.value:void 0,d=u.status==="fulfilled"?u.value:void 0;if(h&&d&&h!==d)throw new Oy(e);return h||d||a}}}}const sa=()=>{},Ak="_atproto",Ec="did=";class Tk{dohUrl;#e;constructor({dohUrl:e,fetch:n=fetch}){this.dohUrl=e,this.#e=n}async resolve(e,n){let r;try{const o=new URL(this.dohUrl);o.searchParams.set("name",`${Ak}.${e}`),o.searchParams.set("type","TXT");const a=await(0,this.#e)(o,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,headers:{accept:"application/dns-json"}});r=(await xk(a)).json}catch(o){throw new Uu(e,{cause:o})}const s=r.Status,i=r.Answer;if(s!==0)throw s===3?new Bu(e):new Uu(e,{cause:new TypeError(`dns returned ${s}`)});for(let o=0,a=i.length;o<a;o++){const c=i[o].data;if(!c.startsWith(Ec))continue;for(let h=o+1;h<a;h++)if(i[h].data.startsWith(Ec))throw new Oy(e);const u=c.slice(Ec.length);if(!Ry(u))throw new Py(e,u);return u}throw new Bu(e)}}const Ck=Yh(qh,mk(2064));class Mk{#e;constructor({fetch:e=fetch}={}){this.#e=e}async resolve(e,n){let r;try{const i=new URL("/.well-known/atproto-did",`https://${e}`),o=await(0,this.#e)(i,{signal:n?.signal,cache:n?.noCache?"no-cache":void 0,redirect:"manual"});if(o.status>=300&&o.status<400)throw new TypeError("unexpected redirect");r=(await Ck(o)).text}catch(i){throw i instanceof Gl&&i.status===404?new Bu(e):new Uu(e,{cause:i})}const s=r.split(`
`)[0].trim();if(!Ry(s))throw new Py(e,s);return s}}const Rk="https://cloudflare-dns.com/dns-query";function jo(){return new hk({methods:{plc:new kk,web:new Sk}})}function Yl(){return new Ek({strategy:"race",methods:{dns:new Tk({dohUrl:Rk}),http:new Mk}})}function ql(t){const e=t.service?.find(r=>r.id==="#atproto"||r.id==="#atproto_pds")??t.service?.find(r=>(Array.isArray(r.type)?r.type:[r.type]).includes("AtprotoPersonalDataServer")),n=typeof e?.serviceEndpoint=="string"?e.serviceEndpoint.replace(/\/+$/,""):void 0;if(n===void 0)throw new Error(`no personal data server in the account document for ${t.id}`);return n}function Ik(t){const e=jo(),n=Yl(),r=((...u)=>globalThis.fetch(...u)),s=new Map,i=new Map,o=new Map,a=new Map,l=(u,h,d)=>{const f=u.get(h);if(f!==void 0)return f;const m=d();return u.set(h,m),m},c={document(u){return l(s,u,()=>e.resolve(u))},async service(u){return ql(await c.document(u))},handle(u){return l(i,u,async()=>{const h=await Ix({did:u,document:await c.document(u),resolveDid:d=>n.resolve(d)});return o.set(u,h),h})},knownHandle(u){return o.get(u)},picture(u){return l(a,u,async()=>{const h=await c.service(u),d=await r(`${h}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(u)}&collection=${zx}&rkey=${Px}`);if(!d.ok)return null;const f=Ox((await d.json()).value);if(f===null)return null;const m=await r($x(h,u,f));return m.ok?m.blob():null})},async name(u){try{return await c.handle(u)??u}catch{return u}}};return c}var ia=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function Fy(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}function oa(t){throw new Error('Could not dynamically require "'+t+'". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.')}var Ac={exports:{}};var Of;function zk(){return Of||(Of=1,(function(t,e){(function(n){t.exports=n()})(function(){return(function n(r,s,i){function o(c,u){if(!s[c]){if(!r[c]){var h=typeof oa=="function"&&oa;if(!u&&h)return h(c,!0);if(a)return a(c,!0);var d=new Error("Cannot find module '"+c+"'");throw d.code="MODULE_NOT_FOUND",d}var f=s[c]={exports:{}};r[c][0].call(f.exports,function(m){var p=r[c][1][m];return o(p||m)},f,f.exports,n,r,s,i)}return s[c].exports}for(var a=typeof oa=="function"&&oa,l=0;l<i.length;l++)o(i[l]);return o})({1:[function(n,r,s){var i=n("./utils"),o=n("./support"),a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";s.encode=function(l){for(var c,u,h,d,f,m,p,y=[],g=0,b=l.length,v=b,x=i.getTypeOf(l)!=="string";g<l.length;)v=b-g,h=x?(c=l[g++],u=g<b?l[g++]:0,g<b?l[g++]:0):(c=l.charCodeAt(g++),u=g<b?l.charCodeAt(g++):0,g<b?l.charCodeAt(g++):0),d=c>>2,f=(3&c)<<4|u>>4,m=1<v?(15&u)<<2|h>>6:64,p=2<v?63&h:64,y.push(a.charAt(d)+a.charAt(f)+a.charAt(m)+a.charAt(p));return y.join("")},s.decode=function(l){var c,u,h,d,f,m,p=0,y=0,g="data:";if(l.substr(0,g.length)===g)throw new Error("Invalid base64 input, it looks like a data url.");var b,v=3*(l=l.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(l.charAt(l.length-1)===a.charAt(64)&&v--,l.charAt(l.length-2)===a.charAt(64)&&v--,v%1!=0)throw new Error("Invalid base64 input, bad content length.");for(b=o.uint8array?new Uint8Array(0|v):new Array(0|v);p<l.length;)c=a.indexOf(l.charAt(p++))<<2|(d=a.indexOf(l.charAt(p++)))>>4,u=(15&d)<<4|(f=a.indexOf(l.charAt(p++)))>>2,h=(3&f)<<6|(m=a.indexOf(l.charAt(p++))),b[y++]=c,f!==64&&(b[y++]=u),m!==64&&(b[y++]=h);return b}},{"./support":30,"./utils":32}],2:[function(n,r,s){var i=n("./external"),o=n("./stream/DataWorker"),a=n("./stream/Crc32Probe"),l=n("./stream/DataLengthProbe");function c(u,h,d,f,m){this.compressedSize=u,this.uncompressedSize=h,this.crc32=d,this.compression=f,this.compressedContent=m}c.prototype={getContentWorker:function(){var u=new o(i.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new l("data_length")),h=this;return u.on("end",function(){if(this.streamInfo.data_length!==h.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),u},getCompressedWorker:function(){return new o(i.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},c.createWorkerFrom=function(u,h,d){return u.pipe(new a).pipe(new l("uncompressedSize")).pipe(h.compressWorker(d)).pipe(new l("compressedSize")).withStreamInfo("compression",h)},r.exports=c},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(n,r,s){var i=n("./stream/GenericWorker");s.STORE={magic:"\0\0",compressWorker:function(){return new i("STORE compression")},uncompressWorker:function(){return new i("STORE decompression")}},s.DEFLATE=n("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(n,r,s){var i=n("./utils"),o=(function(){for(var a,l=[],c=0;c<256;c++){a=c;for(var u=0;u<8;u++)a=1&a?3988292384^a>>>1:a>>>1;l[c]=a}return l})();r.exports=function(a,l){return a!==void 0&&a.length?i.getTypeOf(a)!=="string"?(function(c,u,h,d){var f=o,m=d+h;c^=-1;for(var p=d;p<m;p++)c=c>>>8^f[255&(c^u[p])];return-1^c})(0|l,a,a.length,0):(function(c,u,h,d){var f=o,m=d+h;c^=-1;for(var p=d;p<m;p++)c=c>>>8^f[255&(c^u.charCodeAt(p))];return-1^c})(0|l,a,a.length,0):0}},{"./utils":32}],5:[function(n,r,s){s.base64=!1,s.binary=!1,s.dir=!1,s.createFolders=!0,s.date=null,s.compression=null,s.compressionOptions=null,s.comment=null,s.unixPermissions=null,s.dosPermissions=null},{}],6:[function(n,r,s){var i=null;i=typeof Promise<"u"?Promise:n("lie"),r.exports={Promise:i}},{lie:37}],7:[function(n,r,s){var i=typeof Uint8Array<"u"&&typeof Uint16Array<"u"&&typeof Uint32Array<"u",o=n("pako"),a=n("./utils"),l=n("./stream/GenericWorker"),c=i?"uint8array":"array";function u(h,d){l.call(this,"FlateWorker/"+h),this._pako=null,this._pakoAction=h,this._pakoOptions=d,this.meta={}}s.magic="\b\0",a.inherits(u,l),u.prototype.processChunk=function(h){this.meta=h.meta,this._pako===null&&this._createPako(),this._pako.push(a.transformTo(c,h.data),!1)},u.prototype.flush=function(){l.prototype.flush.call(this),this._pako===null&&this._createPako(),this._pako.push([],!0)},u.prototype.cleanUp=function(){l.prototype.cleanUp.call(this),this._pako=null},u.prototype._createPako=function(){this._pako=new o[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var h=this;this._pako.onData=function(d){h.push({data:d,meta:h.meta})}},s.compressWorker=function(h){return new u("Deflate",h)},s.uncompressWorker=function(){return new u("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(n,r,s){function i(f,m){var p,y="";for(p=0;p<m;p++)y+=String.fromCharCode(255&f),f>>>=8;return y}function o(f,m,p,y,g,b){var v,x,k=f.file,C=f.compression,E=b!==c.utf8encode,T=a.transformTo("string",b(k.name)),A=a.transformTo("string",c.utf8encode(k.name)),M=k.comment,P=a.transformTo("string",b(M)),S=a.transformTo("string",c.utf8encode(M)),O=A.length!==k.name.length,w=S.length!==M.length,R="",F="",D="",te=k.dir,H=k.date,Q={crc32:0,compressedSize:0,uncompressedSize:0};m&&!p||(Q.crc32=f.crc32,Q.compressedSize=f.compressedSize,Q.uncompressedSize=f.uncompressedSize);var N=0;m&&(N|=8),E||!O&&!w||(N|=2048);var B=0,le=0;te&&(B|=16),g==="UNIX"?(le=798,B|=(function(X,ye){var Le=X;return X||(Le=ye?16893:33204),(65535&Le)<<16})(k.unixPermissions,te)):(le=20,B|=(function(X){return 63&(X||0)})(k.dosPermissions)),v=H.getUTCHours(),v<<=6,v|=H.getUTCMinutes(),v<<=5,v|=H.getUTCSeconds()/2,x=H.getUTCFullYear()-1980,x<<=4,x|=H.getUTCMonth()+1,x<<=5,x|=H.getUTCDate(),O&&(F=i(1,1)+i(u(T),4)+A,R+="up"+i(F.length,2)+F),w&&(D=i(1,1)+i(u(P),4)+S,R+="uc"+i(D.length,2)+D);var oe="";return oe+=`
\0`,oe+=i(N,2),oe+=C.magic,oe+=i(v,2),oe+=i(x,2),oe+=i(Q.crc32,4),oe+=i(Q.compressedSize,4),oe+=i(Q.uncompressedSize,4),oe+=i(T.length,2),oe+=i(R.length,2),{fileRecord:h.LOCAL_FILE_HEADER+oe+T+R,dirRecord:h.CENTRAL_FILE_HEADER+i(le,2)+oe+i(P.length,2)+"\0\0\0\0"+i(B,4)+i(y,4)+T+R+P}}var a=n("../utils"),l=n("../stream/GenericWorker"),c=n("../utf8"),u=n("../crc32"),h=n("../signature");function d(f,m,p,y){l.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=m,this.zipPlatform=p,this.encodeFileName=y,this.streamFiles=f,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}a.inherits(d,l),d.prototype.push=function(f){var m=f.meta.percent||0,p=this.entriesCount,y=this._sources.length;this.accumulate?this.contentBuffer.push(f):(this.bytesWritten+=f.data.length,l.prototype.push.call(this,{data:f.data,meta:{currentFile:this.currentFile,percent:p?(m+100*(p-y-1))/p:100}}))},d.prototype.openedSource=function(f){this.currentSourceOffset=this.bytesWritten,this.currentFile=f.file.name;var m=this.streamFiles&&!f.file.dir;if(m){var p=o(f,m,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:p.fileRecord,meta:{percent:0}})}else this.accumulate=!0},d.prototype.closedSource=function(f){this.accumulate=!1;var m=this.streamFiles&&!f.file.dir,p=o(f,m,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(p.dirRecord),m)this.push({data:(function(y){return h.DATA_DESCRIPTOR+i(y.crc32,4)+i(y.compressedSize,4)+i(y.uncompressedSize,4)})(f),meta:{percent:100}});else for(this.push({data:p.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},d.prototype.flush=function(){for(var f=this.bytesWritten,m=0;m<this.dirRecords.length;m++)this.push({data:this.dirRecords[m],meta:{percent:100}});var p=this.bytesWritten-f,y=(function(g,b,v,x,k){var C=a.transformTo("string",k(x));return h.CENTRAL_DIRECTORY_END+"\0\0\0\0"+i(g,2)+i(g,2)+i(b,4)+i(v,4)+i(C.length,2)+C})(this.dirRecords.length,p,f,this.zipComment,this.encodeFileName);this.push({data:y,meta:{percent:100}})},d.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},d.prototype.registerPrevious=function(f){this._sources.push(f);var m=this;return f.on("data",function(p){m.processChunk(p)}),f.on("end",function(){m.closedSource(m.previous.streamInfo),m._sources.length?m.prepareNextSource():m.end()}),f.on("error",function(p){m.error(p)}),this},d.prototype.resume=function(){return!!l.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},d.prototype.error=function(f){var m=this._sources;if(!l.prototype.error.call(this,f))return!1;for(var p=0;p<m.length;p++)try{m[p].error(f)}catch{}return!0},d.prototype.lock=function(){l.prototype.lock.call(this);for(var f=this._sources,m=0;m<f.length;m++)f[m].lock()},r.exports=d},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(n,r,s){var i=n("../compressions"),o=n("./ZipFileWorker");s.generateWorker=function(a,l,c){var u=new o(l.streamFiles,c,l.platform,l.encodeFileName),h=0;try{a.forEach(function(d,f){h++;var m=(function(b,v){var x=b||v,k=i[x];if(!k)throw new Error(x+" is not a valid compression method !");return k})(f.options.compression,l.compression),p=f.options.compressionOptions||l.compressionOptions||{},y=f.dir,g=f.date;f._compressWorker(m,p).withStreamInfo("file",{name:d,dir:y,date:g,comment:f.comment||"",unixPermissions:f.unixPermissions,dosPermissions:f.dosPermissions}).pipe(u)}),u.entriesCount=h}catch(d){u.error(d)}return u}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(n,r,s){function i(){if(!(this instanceof i))return new i;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var o=new i;for(var a in this)typeof this[a]!="function"&&(o[a]=this[a]);return o}}(i.prototype=n("./object")).loadAsync=n("./load"),i.support=n("./support"),i.defaults=n("./defaults"),i.version="3.10.1",i.loadAsync=function(o,a){return new i().loadAsync(o,a)},i.external=n("./external"),r.exports=i},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(n,r,s){var i=n("./utils"),o=n("./external"),a=n("./utf8"),l=n("./zipEntries"),c=n("./stream/Crc32Probe"),u=n("./nodejsUtils");function h(d){return new o.Promise(function(f,m){var p=d.decompressed.getContentWorker().pipe(new c);p.on("error",function(y){m(y)}).on("end",function(){p.streamInfo.crc32!==d.decompressed.crc32?m(new Error("Corrupted zip : CRC32 mismatch")):f()}).resume()})}r.exports=function(d,f){var m=this;return f=i.extend(f||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:a.utf8decode}),u.isNode&&u.isStream(d)?o.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):i.prepareContent("the loaded zip file",d,!0,f.optimizedBinaryString,f.base64).then(function(p){var y=new l(f);return y.load(p),y}).then(function(p){var y=[o.Promise.resolve(p)],g=p.files;if(f.checkCRC32)for(var b=0;b<g.length;b++)y.push(h(g[b]));return o.Promise.all(y)}).then(function(p){for(var y=p.shift(),g=y.files,b=0;b<g.length;b++){var v=g[b],x=v.fileNameStr,k=i.resolve(v.fileNameStr);m.file(k,v.decompressed,{binary:!0,optimizedBinaryString:!0,date:v.date,dir:v.dir,comment:v.fileCommentStr.length?v.fileCommentStr:null,unixPermissions:v.unixPermissions,dosPermissions:v.dosPermissions,createFolders:f.createFolders}),v.dir||(m.file(k).unsafeOriginalName=x)}return y.zipComment.length&&(m.comment=y.zipComment),m})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(n,r,s){var i=n("../utils"),o=n("../stream/GenericWorker");function a(l,c){o.call(this,"Nodejs stream input adapter for "+l),this._upstreamEnded=!1,this._bindStream(c)}i.inherits(a,o),a.prototype._bindStream=function(l){var c=this;(this._stream=l).pause(),l.on("data",function(u){c.push({data:u,meta:{percent:0}})}).on("error",function(u){c.isPaused?this.generatedError=u:c.error(u)}).on("end",function(){c.isPaused?c._upstreamEnded=!0:c.end()})},a.prototype.pause=function(){return!!o.prototype.pause.call(this)&&(this._stream.pause(),!0)},a.prototype.resume=function(){return!!o.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},r.exports=a},{"../stream/GenericWorker":28,"../utils":32}],13:[function(n,r,s){var i=n("readable-stream").Readable;function o(a,l,c){i.call(this,l),this._helper=a;var u=this;a.on("data",function(h,d){u.push(h)||u._helper.pause(),c&&c(d)}).on("error",function(h){u.emit("error",h)}).on("end",function(){u.push(null)})}n("../utils").inherits(o,i),o.prototype._read=function(){this._helper.resume()},r.exports=o},{"../utils":32,"readable-stream":16}],14:[function(n,r,s){r.exports={isNode:typeof Buffer<"u",newBufferFrom:function(i,o){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(i,o);if(typeof i=="number")throw new Error('The "data" argument must not be a number');return new Buffer(i,o)},allocBuffer:function(i){if(Buffer.alloc)return Buffer.alloc(i);var o=new Buffer(i);return o.fill(0),o},isBuffer:function(i){return Buffer.isBuffer(i)},isStream:function(i){return i&&typeof i.on=="function"&&typeof i.pause=="function"&&typeof i.resume=="function"}}},{}],15:[function(n,r,s){function i(k,C,E){var T,A=a.getTypeOf(C),M=a.extend(E||{},u);M.date=M.date||new Date,M.compression!==null&&(M.compression=M.compression.toUpperCase()),typeof M.unixPermissions=="string"&&(M.unixPermissions=parseInt(M.unixPermissions,8)),M.unixPermissions&&16384&M.unixPermissions&&(M.dir=!0),M.dosPermissions&&16&M.dosPermissions&&(M.dir=!0),M.dir&&(k=g(k)),M.createFolders&&(T=y(k))&&b.call(this,T,!0);var P=A==="string"&&M.binary===!1&&M.base64===!1;E&&E.binary!==void 0||(M.binary=!P),(C instanceof h&&C.uncompressedSize===0||M.dir||!C||C.length===0)&&(M.base64=!1,M.binary=!0,C="",M.compression="STORE",A="string");var S=null;S=C instanceof h||C instanceof l?C:m.isNode&&m.isStream(C)?new p(k,C):a.prepareContent(k,C,M.binary,M.optimizedBinaryString,M.base64);var O=new d(k,S,M);this.files[k]=O}var o=n("./utf8"),a=n("./utils"),l=n("./stream/GenericWorker"),c=n("./stream/StreamHelper"),u=n("./defaults"),h=n("./compressedObject"),d=n("./zipObject"),f=n("./generate"),m=n("./nodejsUtils"),p=n("./nodejs/NodejsStreamInputAdapter"),y=function(k){k.slice(-1)==="/"&&(k=k.substring(0,k.length-1));var C=k.lastIndexOf("/");return 0<C?k.substring(0,C):""},g=function(k){return k.slice(-1)!=="/"&&(k+="/"),k},b=function(k,C){return C=C!==void 0?C:u.createFolders,k=g(k),this.files[k]||i.call(this,k,null,{dir:!0,createFolders:C}),this.files[k]};function v(k){return Object.prototype.toString.call(k)==="[object RegExp]"}var x={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(k){var C,E,T;for(C in this.files)T=this.files[C],(E=C.slice(this.root.length,C.length))&&C.slice(0,this.root.length)===this.root&&k(E,T)},filter:function(k){var C=[];return this.forEach(function(E,T){k(E,T)&&C.push(T)}),C},file:function(k,C,E){if(arguments.length!==1)return k=this.root+k,i.call(this,k,C,E),this;if(v(k)){var T=k;return this.filter(function(M,P){return!P.dir&&T.test(M)})}var A=this.files[this.root+k];return A&&!A.dir?A:null},folder:function(k){if(!k)return this;if(v(k))return this.filter(function(A,M){return M.dir&&k.test(A)});var C=this.root+k,E=b.call(this,C),T=this.clone();return T.root=E.name,T},remove:function(k){k=this.root+k;var C=this.files[k];if(C||(k.slice(-1)!=="/"&&(k+="/"),C=this.files[k]),C&&!C.dir)delete this.files[k];else for(var E=this.filter(function(A,M){return M.name.slice(0,k.length)===k}),T=0;T<E.length;T++)delete this.files[E[T].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(k){var C,E={};try{if((E=a.extend(k||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:o.utf8encode})).type=E.type.toLowerCase(),E.compression=E.compression.toUpperCase(),E.type==="binarystring"&&(E.type="string"),!E.type)throw new Error("No output type specified.");a.checkSupport(E.type),E.platform!=="darwin"&&E.platform!=="freebsd"&&E.platform!=="linux"&&E.platform!=="sunos"||(E.platform="UNIX"),E.platform==="win32"&&(E.platform="DOS");var T=E.comment||this.comment||"";C=f.generateWorker(this,E,T)}catch(A){(C=new l("error")).error(A)}return new c(C,E.type||"string",E.mimeType)},generateAsync:function(k,C){return this.generateInternalStream(k).accumulate(C)},generateNodeStream:function(k,C){return(k=k||{}).type||(k.type="nodebuffer"),this.generateInternalStream(k).toNodejsStream(C)}};r.exports=x},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(n,r,s){r.exports=n("stream")},{stream:void 0}],17:[function(n,r,s){var i=n("./DataReader");function o(a){i.call(this,a);for(var l=0;l<this.data.length;l++)a[l]=255&a[l]}n("../utils").inherits(o,i),o.prototype.byteAt=function(a){return this.data[this.zero+a]},o.prototype.lastIndexOfSignature=function(a){for(var l=a.charCodeAt(0),c=a.charCodeAt(1),u=a.charCodeAt(2),h=a.charCodeAt(3),d=this.length-4;0<=d;--d)if(this.data[d]===l&&this.data[d+1]===c&&this.data[d+2]===u&&this.data[d+3]===h)return d-this.zero;return-1},o.prototype.readAndCheckSignature=function(a){var l=a.charCodeAt(0),c=a.charCodeAt(1),u=a.charCodeAt(2),h=a.charCodeAt(3),d=this.readData(4);return l===d[0]&&c===d[1]&&u===d[2]&&h===d[3]},o.prototype.readData=function(a){if(this.checkOffset(a),a===0)return[];var l=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./DataReader":18}],18:[function(n,r,s){var i=n("../utils");function o(a){this.data=a,this.length=a.length,this.index=0,this.zero=0}o.prototype={checkOffset:function(a){this.checkIndex(this.index+a)},checkIndex:function(a){if(this.length<this.zero+a||a<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+a+"). Corrupted zip ?")},setIndex:function(a){this.checkIndex(a),this.index=a},skip:function(a){this.setIndex(this.index+a)},byteAt:function(){},readInt:function(a){var l,c=0;for(this.checkOffset(a),l=this.index+a-1;l>=this.index;l--)c=(c<<8)+this.byteAt(l);return this.index+=a,c},readString:function(a){return i.transformTo("string",this.readData(a))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var a=this.readInt(4);return new Date(Date.UTC(1980+(a>>25&127),(a>>21&15)-1,a>>16&31,a>>11&31,a>>5&63,(31&a)<<1))}},r.exports=o},{"../utils":32}],19:[function(n,r,s){var i=n("./Uint8ArrayReader");function o(a){i.call(this,a)}n("../utils").inherits(o,i),o.prototype.readData=function(a){this.checkOffset(a);var l=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(n,r,s){var i=n("./DataReader");function o(a){i.call(this,a)}n("../utils").inherits(o,i),o.prototype.byteAt=function(a){return this.data.charCodeAt(this.zero+a)},o.prototype.lastIndexOfSignature=function(a){return this.data.lastIndexOf(a)-this.zero},o.prototype.readAndCheckSignature=function(a){return a===this.readData(4)},o.prototype.readData=function(a){this.checkOffset(a);var l=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./DataReader":18}],21:[function(n,r,s){var i=n("./ArrayReader");function o(a){i.call(this,a)}n("../utils").inherits(o,i),o.prototype.readData=function(a){if(this.checkOffset(a),a===0)return new Uint8Array(0);var l=this.data.subarray(this.zero+this.index,this.zero+this.index+a);return this.index+=a,l},r.exports=o},{"../utils":32,"./ArrayReader":17}],22:[function(n,r,s){var i=n("../utils"),o=n("../support"),a=n("./ArrayReader"),l=n("./StringReader"),c=n("./NodeBufferReader"),u=n("./Uint8ArrayReader");r.exports=function(h){var d=i.getTypeOf(h);return i.checkSupport(d),d!=="string"||o.uint8array?d==="nodebuffer"?new c(h):o.uint8array?new u(i.transformTo("uint8array",h)):new a(i.transformTo("array",h)):new l(h)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(n,r,s){s.LOCAL_FILE_HEADER="PK",s.CENTRAL_FILE_HEADER="PK",s.CENTRAL_DIRECTORY_END="PK",s.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK\x07",s.ZIP64_CENTRAL_DIRECTORY_END="PK",s.DATA_DESCRIPTOR="PK\x07\b"},{}],24:[function(n,r,s){var i=n("./GenericWorker"),o=n("../utils");function a(l){i.call(this,"ConvertWorker to "+l),this.destType=l}o.inherits(a,i),a.prototype.processChunk=function(l){this.push({data:o.transformTo(this.destType,l.data),meta:l.meta})},r.exports=a},{"../utils":32,"./GenericWorker":28}],25:[function(n,r,s){var i=n("./GenericWorker"),o=n("../crc32");function a(){i.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}n("../utils").inherits(a,i),a.prototype.processChunk=function(l){this.streamInfo.crc32=o(l.data,this.streamInfo.crc32||0),this.push(l)},r.exports=a},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(n,r,s){var i=n("../utils"),o=n("./GenericWorker");function a(l){o.call(this,"DataLengthProbe for "+l),this.propName=l,this.withStreamInfo(l,0)}i.inherits(a,o),a.prototype.processChunk=function(l){if(l){var c=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=c+l.data.length}o.prototype.processChunk.call(this,l)},r.exports=a},{"../utils":32,"./GenericWorker":28}],27:[function(n,r,s){var i=n("../utils"),o=n("./GenericWorker");function a(l){o.call(this,"DataWorker");var c=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,l.then(function(u){c.dataIsReady=!0,c.data=u,c.max=u&&u.length||0,c.type=i.getTypeOf(u),c.isPaused||c._tickAndRepeat()},function(u){c.error(u)})}i.inherits(a,o),a.prototype.cleanUp=function(){o.prototype.cleanUp.call(this),this.data=null},a.prototype.resume=function(){return!!o.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,i.delay(this._tickAndRepeat,[],this)),!0)},a.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(i.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},a.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var l=null,c=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":l=this.data.substring(this.index,c);break;case"uint8array":l=this.data.subarray(this.index,c);break;case"array":case"nodebuffer":l=this.data.slice(this.index,c)}return this.index=c,this.push({data:l,meta:{percent:this.max?this.index/this.max*100:0}})},r.exports=a},{"../utils":32,"./GenericWorker":28}],28:[function(n,r,s){function i(o){this.name=o||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}i.prototype={push:function(o){this.emit("data",o)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(o){this.emit("error",o)}return!0},error:function(o){return!this.isFinished&&(this.isPaused?this.generatedError=o:(this.isFinished=!0,this.emit("error",o),this.previous&&this.previous.error(o),this.cleanUp()),!0)},on:function(o,a){return this._listeners[o].push(a),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(o,a){if(this._listeners[o])for(var l=0;l<this._listeners[o].length;l++)this._listeners[o][l].call(this,a)},pipe:function(o){return o.registerPrevious(this)},registerPrevious:function(o){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=o.streamInfo,this.mergeStreamInfo(),this.previous=o;var a=this;return o.on("data",function(l){a.processChunk(l)}),o.on("end",function(){a.end()}),o.on("error",function(l){a.error(l)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var o=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),o=!0),this.previous&&this.previous.resume(),!o},flush:function(){},processChunk:function(o){this.push(o)},withStreamInfo:function(o,a){return this.extraStreamInfo[o]=a,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var o in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,o)&&(this.streamInfo[o]=this.extraStreamInfo[o])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var o="Worker "+this.name;return this.previous?this.previous+" -> "+o:o}},r.exports=i},{}],29:[function(n,r,s){var i=n("../utils"),o=n("./ConvertWorker"),a=n("./GenericWorker"),l=n("../base64"),c=n("../support"),u=n("../external"),h=null;if(c.nodestream)try{h=n("../nodejs/NodejsStreamOutputAdapter")}catch{}function d(m,p){return new u.Promise(function(y,g){var b=[],v=m._internalType,x=m._outputType,k=m._mimeType;m.on("data",function(C,E){b.push(C),p&&p(E)}).on("error",function(C){b=[],g(C)}).on("end",function(){try{var C=(function(E,T,A){switch(E){case"blob":return i.newBlob(i.transformTo("arraybuffer",T),A);case"base64":return l.encode(T);default:return i.transformTo(E,T)}})(x,(function(E,T){var A,M=0,P=null,S=0;for(A=0;A<T.length;A++)S+=T[A].length;switch(E){case"string":return T.join("");case"array":return Array.prototype.concat.apply([],T);case"uint8array":for(P=new Uint8Array(S),A=0;A<T.length;A++)P.set(T[A],M),M+=T[A].length;return P;case"nodebuffer":return Buffer.concat(T);default:throw new Error("concat : unsupported type '"+E+"'")}})(v,b),k);y(C)}catch(E){g(E)}b=[]}).resume()})}function f(m,p,y){var g=p;switch(p){case"blob":case"arraybuffer":g="uint8array";break;case"base64":g="string"}try{this._internalType=g,this._outputType=p,this._mimeType=y,i.checkSupport(g),this._worker=m.pipe(new o(g)),m.lock()}catch(b){this._worker=new a("error"),this._worker.error(b)}}f.prototype={accumulate:function(m){return d(this,m)},on:function(m,p){var y=this;return m==="data"?this._worker.on(m,function(g){p.call(y,g.data,g.meta)}):this._worker.on(m,function(){i.delay(p,arguments,y)}),this},resume:function(){return i.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(m){if(i.checkSupport("nodestream"),this._outputType!=="nodebuffer")throw new Error(this._outputType+" is not supported by this method");return new h(this,{objectMode:this._outputType!=="nodebuffer"},m)}},r.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(n,r,s){if(s.base64=!0,s.array=!0,s.string=!0,s.arraybuffer=typeof ArrayBuffer<"u"&&typeof Uint8Array<"u",s.nodebuffer=typeof Buffer<"u",s.uint8array=typeof Uint8Array<"u",typeof ArrayBuffer>"u")s.blob=!1;else{var i=new ArrayBuffer(0);try{s.blob=new Blob([i],{type:"application/zip"}).size===0}catch{try{var o=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);o.append(i),s.blob=o.getBlob("application/zip").size===0}catch{s.blob=!1}}}try{s.nodestream=!!n("readable-stream").Readable}catch{s.nodestream=!1}},{"readable-stream":16}],31:[function(n,r,s){for(var i=n("./utils"),o=n("./support"),a=n("./nodejsUtils"),l=n("./stream/GenericWorker"),c=new Array(256),u=0;u<256;u++)c[u]=252<=u?6:248<=u?5:240<=u?4:224<=u?3:192<=u?2:1;c[254]=c[254]=1;function h(){l.call(this,"utf-8 decode"),this.leftOver=null}function d(){l.call(this,"utf-8 encode")}s.utf8encode=function(f){return o.nodebuffer?a.newBufferFrom(f,"utf-8"):(function(m){var p,y,g,b,v,x=m.length,k=0;for(b=0;b<x;b++)(64512&(y=m.charCodeAt(b)))==55296&&b+1<x&&(64512&(g=m.charCodeAt(b+1)))==56320&&(y=65536+(y-55296<<10)+(g-56320),b++),k+=y<128?1:y<2048?2:y<65536?3:4;for(p=o.uint8array?new Uint8Array(k):new Array(k),b=v=0;v<k;b++)(64512&(y=m.charCodeAt(b)))==55296&&b+1<x&&(64512&(g=m.charCodeAt(b+1)))==56320&&(y=65536+(y-55296<<10)+(g-56320),b++),y<128?p[v++]=y:(y<2048?p[v++]=192|y>>>6:(y<65536?p[v++]=224|y>>>12:(p[v++]=240|y>>>18,p[v++]=128|y>>>12&63),p[v++]=128|y>>>6&63),p[v++]=128|63&y);return p})(f)},s.utf8decode=function(f){return o.nodebuffer?i.transformTo("nodebuffer",f).toString("utf-8"):(function(m){var p,y,g,b,v=m.length,x=new Array(2*v);for(p=y=0;p<v;)if((g=m[p++])<128)x[y++]=g;else if(4<(b=c[g]))x[y++]=65533,p+=b-1;else{for(g&=b===2?31:b===3?15:7;1<b&&p<v;)g=g<<6|63&m[p++],b--;1<b?x[y++]=65533:g<65536?x[y++]=g:(g-=65536,x[y++]=55296|g>>10&1023,x[y++]=56320|1023&g)}return x.length!==y&&(x.subarray?x=x.subarray(0,y):x.length=y),i.applyFromCharCode(x)})(f=i.transformTo(o.uint8array?"uint8array":"array",f))},i.inherits(h,l),h.prototype.processChunk=function(f){var m=i.transformTo(o.uint8array?"uint8array":"array",f.data);if(this.leftOver&&this.leftOver.length){if(o.uint8array){var p=m;(m=new Uint8Array(p.length+this.leftOver.length)).set(this.leftOver,0),m.set(p,this.leftOver.length)}else m=this.leftOver.concat(m);this.leftOver=null}var y=(function(b,v){var x;for((v=v||b.length)>b.length&&(v=b.length),x=v-1;0<=x&&(192&b[x])==128;)x--;return x<0||x===0?v:x+c[b[x]]>v?x:v})(m),g=m;y!==m.length&&(o.uint8array?(g=m.subarray(0,y),this.leftOver=m.subarray(y,m.length)):(g=m.slice(0,y),this.leftOver=m.slice(y,m.length))),this.push({data:s.utf8decode(g),meta:f.meta})},h.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=h,i.inherits(d,l),d.prototype.processChunk=function(f){this.push({data:s.utf8encode(f.data),meta:f.meta})},s.Utf8EncodeWorker=d},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(n,r,s){var i=n("./support"),o=n("./base64"),a=n("./nodejsUtils"),l=n("./external");function c(p){return p}function u(p,y){for(var g=0;g<p.length;++g)y[g]=255&p.charCodeAt(g);return y}n("setimmediate"),s.newBlob=function(p,y){s.checkSupport("blob");try{return new Blob([p],{type:y})}catch{try{var g=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return g.append(p),g.getBlob(y)}catch{throw new Error("Bug : can't construct the Blob.")}}};var h={stringifyByChunk:function(p,y,g){var b=[],v=0,x=p.length;if(x<=g)return String.fromCharCode.apply(null,p);for(;v<x;)y==="array"||y==="nodebuffer"?b.push(String.fromCharCode.apply(null,p.slice(v,Math.min(v+g,x)))):b.push(String.fromCharCode.apply(null,p.subarray(v,Math.min(v+g,x)))),v+=g;return b.join("")},stringifyByChar:function(p){for(var y="",g=0;g<p.length;g++)y+=String.fromCharCode(p[g]);return y},applyCanBeUsed:{uint8array:(function(){try{return i.uint8array&&String.fromCharCode.apply(null,new Uint8Array(1)).length===1}catch{return!1}})(),nodebuffer:(function(){try{return i.nodebuffer&&String.fromCharCode.apply(null,a.allocBuffer(1)).length===1}catch{return!1}})()}};function d(p){var y=65536,g=s.getTypeOf(p),b=!0;if(g==="uint8array"?b=h.applyCanBeUsed.uint8array:g==="nodebuffer"&&(b=h.applyCanBeUsed.nodebuffer),b)for(;1<y;)try{return h.stringifyByChunk(p,g,y)}catch{y=Math.floor(y/2)}return h.stringifyByChar(p)}function f(p,y){for(var g=0;g<p.length;g++)y[g]=p[g];return y}s.applyFromCharCode=d;var m={};m.string={string:c,array:function(p){return u(p,new Array(p.length))},arraybuffer:function(p){return m.string.uint8array(p).buffer},uint8array:function(p){return u(p,new Uint8Array(p.length))},nodebuffer:function(p){return u(p,a.allocBuffer(p.length))}},m.array={string:d,array:c,arraybuffer:function(p){return new Uint8Array(p).buffer},uint8array:function(p){return new Uint8Array(p)},nodebuffer:function(p){return a.newBufferFrom(p)}},m.arraybuffer={string:function(p){return d(new Uint8Array(p))},array:function(p){return f(new Uint8Array(p),new Array(p.byteLength))},arraybuffer:c,uint8array:function(p){return new Uint8Array(p)},nodebuffer:function(p){return a.newBufferFrom(new Uint8Array(p))}},m.uint8array={string:d,array:function(p){return f(p,new Array(p.length))},arraybuffer:function(p){return p.buffer},uint8array:c,nodebuffer:function(p){return a.newBufferFrom(p)}},m.nodebuffer={string:d,array:function(p){return f(p,new Array(p.length))},arraybuffer:function(p){return m.nodebuffer.uint8array(p).buffer},uint8array:function(p){return f(p,new Uint8Array(p.length))},nodebuffer:c},s.transformTo=function(p,y){if(y=y||"",!p)return y;s.checkSupport(p);var g=s.getTypeOf(y);return m[g][p](y)},s.resolve=function(p){for(var y=p.split("/"),g=[],b=0;b<y.length;b++){var v=y[b];v==="."||v===""&&b!==0&&b!==y.length-1||(v===".."?g.pop():g.push(v))}return g.join("/")},s.getTypeOf=function(p){return typeof p=="string"?"string":Object.prototype.toString.call(p)==="[object Array]"?"array":i.nodebuffer&&a.isBuffer(p)?"nodebuffer":i.uint8array&&p instanceof Uint8Array?"uint8array":i.arraybuffer&&p instanceof ArrayBuffer?"arraybuffer":void 0},s.checkSupport=function(p){if(!i[p.toLowerCase()])throw new Error(p+" is not supported by this platform")},s.MAX_VALUE_16BITS=65535,s.MAX_VALUE_32BITS=-1,s.pretty=function(p){var y,g,b="";for(g=0;g<(p||"").length;g++)b+="\\x"+((y=p.charCodeAt(g))<16?"0":"")+y.toString(16).toUpperCase();return b},s.delay=function(p,y,g){setImmediate(function(){p.apply(g||null,y||[])})},s.inherits=function(p,y){function g(){}g.prototype=y.prototype,p.prototype=new g},s.extend=function(){var p,y,g={};for(p=0;p<arguments.length;p++)for(y in arguments[p])Object.prototype.hasOwnProperty.call(arguments[p],y)&&g[y]===void 0&&(g[y]=arguments[p][y]);return g},s.prepareContent=function(p,y,g,b,v){return l.Promise.resolve(y).then(function(x){return i.blob&&(x instanceof Blob||["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(x))!==-1)&&typeof FileReader<"u"?new l.Promise(function(k,C){var E=new FileReader;E.onload=function(T){k(T.target.result)},E.onerror=function(T){C(T.target.error)},E.readAsArrayBuffer(x)}):x}).then(function(x){var k=s.getTypeOf(x);return k?(k==="arraybuffer"?x=s.transformTo("uint8array",x):k==="string"&&(v?x=o.decode(x):g&&b!==!0&&(x=(function(C){return u(C,i.uint8array?new Uint8Array(C.length):new Array(C.length))})(x))),x):l.Promise.reject(new Error("Can't read the data of '"+p+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(n,r,s){var i=n("./reader/readerFor"),o=n("./utils"),a=n("./signature"),l=n("./zipEntry"),c=n("./support");function u(h){this.files=[],this.loadOptions=h}u.prototype={checkSignature:function(h){if(!this.reader.readAndCheckSignature(h)){this.reader.index-=4;var d=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+o.pretty(d)+", expected "+o.pretty(h)+")")}},isSignature:function(h,d){var f=this.reader.index;this.reader.setIndex(h);var m=this.reader.readString(4)===d;return this.reader.setIndex(f),m},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var h=this.reader.readData(this.zipCommentLength),d=c.uint8array?"uint8array":"array",f=o.transformTo(d,h);this.zipComment=this.loadOptions.decodeFileName(f)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var h,d,f,m=this.zip64EndOfCentralSize-44;0<m;)h=this.reader.readInt(2),d=this.reader.readInt(4),f=this.reader.readData(d),this.zip64ExtensibleData[h]={id:h,length:d,value:f}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var h,d;for(h=0;h<this.files.length;h++)d=this.files[h],this.reader.setIndex(d.localHeaderOffset),this.checkSignature(a.LOCAL_FILE_HEADER),d.readLocalPart(this.reader),d.handleUTF8(),d.processAttributes()},readCentralDir:function(){var h;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER);)(h=new l({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(h);if(this.centralDirRecords!==this.files.length&&this.centralDirRecords!==0&&this.files.length===0)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var h=this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);if(h<0)throw this.isSignature(0,a.LOCAL_FILE_HEADER)?new Error("Corrupted zip: can't find end of central directory"):new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");this.reader.setIndex(h);var d=h;if(this.checkSignature(a.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===o.MAX_VALUE_16BITS||this.diskWithCentralDirStart===o.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===o.MAX_VALUE_16BITS||this.centralDirRecords===o.MAX_VALUE_16BITS||this.centralDirSize===o.MAX_VALUE_32BITS||this.centralDirOffset===o.MAX_VALUE_32BITS){if(this.zip64=!0,(h=this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(h),this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,a.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var f=this.centralDirOffset+this.centralDirSize;this.zip64&&(f+=20,f+=12+this.zip64EndOfCentralSize);var m=d-f;if(0<m)this.isSignature(d,a.CENTRAL_FILE_HEADER)||(this.reader.zero=m);else if(m<0)throw new Error("Corrupted zip: missing "+Math.abs(m)+" bytes.")},prepareReader:function(h){this.reader=i(h)},load:function(h){this.prepareReader(h),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},r.exports=u},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(n,r,s){var i=n("./reader/readerFor"),o=n("./utils"),a=n("./compressedObject"),l=n("./crc32"),c=n("./utf8"),u=n("./compressions"),h=n("./support");function d(f,m){this.options=f,this.loadOptions=m}d.prototype={isEncrypted:function(){return(1&this.bitFlag)==1},useUTF8:function(){return(2048&this.bitFlag)==2048},readLocalPart:function(f){var m,p;if(f.skip(22),this.fileNameLength=f.readInt(2),p=f.readInt(2),this.fileName=f.readData(this.fileNameLength),f.skip(p),this.compressedSize===-1||this.uncompressedSize===-1)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if((m=(function(y){for(var g in u)if(Object.prototype.hasOwnProperty.call(u,g)&&u[g].magic===y)return u[g];return null})(this.compressionMethod))===null)throw new Error("Corrupted zip : compression "+o.pretty(this.compressionMethod)+" unknown (inner file : "+o.transformTo("string",this.fileName)+")");this.decompressed=new a(this.compressedSize,this.uncompressedSize,this.crc32,m,f.readData(this.compressedSize))},readCentralPart:function(f){this.versionMadeBy=f.readInt(2),f.skip(2),this.bitFlag=f.readInt(2),this.compressionMethod=f.readString(2),this.date=f.readDate(),this.crc32=f.readInt(4),this.compressedSize=f.readInt(4),this.uncompressedSize=f.readInt(4);var m=f.readInt(2);if(this.extraFieldsLength=f.readInt(2),this.fileCommentLength=f.readInt(2),this.diskNumberStart=f.readInt(2),this.internalFileAttributes=f.readInt(2),this.externalFileAttributes=f.readInt(4),this.localHeaderOffset=f.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");f.skip(m),this.readExtraFields(f),this.parseZIP64ExtraField(f),this.fileComment=f.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var f=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),f==0&&(this.dosPermissions=63&this.externalFileAttributes),f==3&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||this.fileNameStr.slice(-1)!=="/"||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var f=i(this.extraFields[1].value);this.uncompressedSize===o.MAX_VALUE_32BITS&&(this.uncompressedSize=f.readInt(8)),this.compressedSize===o.MAX_VALUE_32BITS&&(this.compressedSize=f.readInt(8)),this.localHeaderOffset===o.MAX_VALUE_32BITS&&(this.localHeaderOffset=f.readInt(8)),this.diskNumberStart===o.MAX_VALUE_32BITS&&(this.diskNumberStart=f.readInt(4))}},readExtraFields:function(f){var m,p,y,g=f.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});f.index+4<g;)m=f.readInt(2),p=f.readInt(2),y=f.readData(p),this.extraFields[m]={id:m,length:p,value:y};f.setIndex(g)},handleUTF8:function(){var f=h.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=c.utf8decode(this.fileName),this.fileCommentStr=c.utf8decode(this.fileComment);else{var m=this.findExtraFieldUnicodePath();if(m!==null)this.fileNameStr=m;else{var p=o.transformTo(f,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(p)}var y=this.findExtraFieldUnicodeComment();if(y!==null)this.fileCommentStr=y;else{var g=o.transformTo(f,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(g)}}},findExtraFieldUnicodePath:function(){var f=this.extraFields[28789];if(f){var m=i(f.value);return m.readInt(1)!==1||l(this.fileName)!==m.readInt(4)?null:c.utf8decode(m.readData(f.length-5))}return null},findExtraFieldUnicodeComment:function(){var f=this.extraFields[25461];if(f){var m=i(f.value);return m.readInt(1)!==1||l(this.fileComment)!==m.readInt(4)?null:c.utf8decode(m.readData(f.length-5))}return null}},r.exports=d},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(n,r,s){function i(m,p,y){this.name=m,this.dir=y.dir,this.date=y.date,this.comment=y.comment,this.unixPermissions=y.unixPermissions,this.dosPermissions=y.dosPermissions,this._data=p,this._dataBinary=y.binary,this.options={compression:y.compression,compressionOptions:y.compressionOptions}}var o=n("./stream/StreamHelper"),a=n("./stream/DataWorker"),l=n("./utf8"),c=n("./compressedObject"),u=n("./stream/GenericWorker");i.prototype={internalStream:function(m){var p=null,y="string";try{if(!m)throw new Error("No output type specified.");var g=(y=m.toLowerCase())==="string"||y==="text";y!=="binarystring"&&y!=="text"||(y="string"),p=this._decompressWorker();var b=!this._dataBinary;b&&!g&&(p=p.pipe(new l.Utf8EncodeWorker)),!b&&g&&(p=p.pipe(new l.Utf8DecodeWorker))}catch(v){(p=new u("error")).error(v)}return new o(p,y,"")},async:function(m,p){return this.internalStream(m).accumulate(p)},nodeStream:function(m,p){return this.internalStream(m||"nodebuffer").toNodejsStream(p)},_compressWorker:function(m,p){if(this._data instanceof c&&this._data.compression.magic===m.magic)return this._data.getCompressedWorker();var y=this._decompressWorker();return this._dataBinary||(y=y.pipe(new l.Utf8EncodeWorker)),c.createWorkerFrom(y,m,p)},_decompressWorker:function(){return this._data instanceof c?this._data.getContentWorker():this._data instanceof u?this._data:new a(this._data)}};for(var h=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],d=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<h.length;f++)i.prototype[h[f]]=d;r.exports=i},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(n,r,s){(function(i){var o,a,l=i.MutationObserver||i.WebKitMutationObserver;if(l){var c=0,u=new l(m),h=i.document.createTextNode("");u.observe(h,{characterData:!0}),o=function(){h.data=c=++c%2}}else if(i.setImmediate||i.MessageChannel===void 0)o="document"in i&&"onreadystatechange"in i.document.createElement("script")?function(){var p=i.document.createElement("script");p.onreadystatechange=function(){m(),p.onreadystatechange=null,p.parentNode.removeChild(p),p=null},i.document.documentElement.appendChild(p)}:function(){setTimeout(m,0)};else{var d=new i.MessageChannel;d.port1.onmessage=m,o=function(){d.port2.postMessage(0)}}var f=[];function m(){var p,y;a=!0;for(var g=f.length;g;){for(y=f,f=[],p=-1;++p<g;)y[p]();g=f.length}a=!1}r.exports=function(p){f.push(p)!==1||a||o()}}).call(this,typeof ia<"u"?ia:typeof self<"u"?self:typeof window<"u"?window:{})},{}],37:[function(n,r,s){var i=n("immediate");function o(){}var a={},l=["REJECTED"],c=["FULFILLED"],u=["PENDING"];function h(g){if(typeof g!="function")throw new TypeError("resolver must be a function");this.state=u,this.queue=[],this.outcome=void 0,g!==o&&p(this,g)}function d(g,b,v){this.promise=g,typeof b=="function"&&(this.onFulfilled=b,this.callFulfilled=this.otherCallFulfilled),typeof v=="function"&&(this.onRejected=v,this.callRejected=this.otherCallRejected)}function f(g,b,v){i(function(){var x;try{x=b(v)}catch(k){return a.reject(g,k)}x===g?a.reject(g,new TypeError("Cannot resolve promise with itself")):a.resolve(g,x)})}function m(g){var b=g&&g.then;if(g&&(typeof g=="object"||typeof g=="function")&&typeof b=="function")return function(){b.apply(g,arguments)}}function p(g,b){var v=!1;function x(E){v||(v=!0,a.reject(g,E))}function k(E){v||(v=!0,a.resolve(g,E))}var C=y(function(){b(k,x)});C.status==="error"&&x(C.value)}function y(g,b){var v={};try{v.value=g(b),v.status="success"}catch(x){v.status="error",v.value=x}return v}(r.exports=h).prototype.finally=function(g){if(typeof g!="function")return this;var b=this.constructor;return this.then(function(v){return b.resolve(g()).then(function(){return v})},function(v){return b.resolve(g()).then(function(){throw v})})},h.prototype.catch=function(g){return this.then(null,g)},h.prototype.then=function(g,b){if(typeof g!="function"&&this.state===c||typeof b!="function"&&this.state===l)return this;var v=new this.constructor(o);return this.state!==u?f(v,this.state===c?g:b,this.outcome):this.queue.push(new d(v,g,b)),v},d.prototype.callFulfilled=function(g){a.resolve(this.promise,g)},d.prototype.otherCallFulfilled=function(g){f(this.promise,this.onFulfilled,g)},d.prototype.callRejected=function(g){a.reject(this.promise,g)},d.prototype.otherCallRejected=function(g){f(this.promise,this.onRejected,g)},a.resolve=function(g,b){var v=y(m,b);if(v.status==="error")return a.reject(g,v.value);var x=v.value;if(x)p(g,x);else{g.state=c,g.outcome=b;for(var k=-1,C=g.queue.length;++k<C;)g.queue[k].callFulfilled(b)}return g},a.reject=function(g,b){g.state=l,g.outcome=b;for(var v=-1,x=g.queue.length;++v<x;)g.queue[v].callRejected(b);return g},h.resolve=function(g){return g instanceof this?g:a.resolve(new this(o),g)},h.reject=function(g){var b=new this(o);return a.reject(b,g)},h.all=function(g){var b=this;if(Object.prototype.toString.call(g)!=="[object Array]")return this.reject(new TypeError("must be an array"));var v=g.length,x=!1;if(!v)return this.resolve([]);for(var k=new Array(v),C=0,E=-1,T=new this(o);++E<v;)A(g[E],E);return T;function A(M,P){b.resolve(M).then(function(S){k[P]=S,++C!==v||x||(x=!0,a.resolve(T,k))},function(S){x||(x=!0,a.reject(T,S))})}},h.race=function(g){var b=this;if(Object.prototype.toString.call(g)!=="[object Array]")return this.reject(new TypeError("must be an array"));var v=g.length,x=!1;if(!v)return this.resolve([]);for(var k=-1,C=new this(o);++k<v;)E=g[k],b.resolve(E).then(function(T){x||(x=!0,a.resolve(C,T))},function(T){x||(x=!0,a.reject(C,T))});var E;return C}},{immediate:36}],38:[function(n,r,s){var i={};(0,n("./lib/utils/common").assign)(i,n("./lib/deflate"),n("./lib/inflate"),n("./lib/zlib/constants")),r.exports=i},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(n,r,s){var i=n("./zlib/deflate"),o=n("./utils/common"),a=n("./utils/strings"),l=n("./zlib/messages"),c=n("./zlib/zstream"),u=Object.prototype.toString,h=0,d=-1,f=0,m=8;function p(g){if(!(this instanceof p))return new p(g);this.options=o.assign({level:d,method:m,chunkSize:16384,windowBits:15,memLevel:8,strategy:f,to:""},g||{});var b=this.options;b.raw&&0<b.windowBits?b.windowBits=-b.windowBits:b.gzip&&0<b.windowBits&&b.windowBits<16&&(b.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new c,this.strm.avail_out=0;var v=i.deflateInit2(this.strm,b.level,b.method,b.windowBits,b.memLevel,b.strategy);if(v!==h)throw new Error(l[v]);if(b.header&&i.deflateSetHeader(this.strm,b.header),b.dictionary){var x;if(x=typeof b.dictionary=="string"?a.string2buf(b.dictionary):u.call(b.dictionary)==="[object ArrayBuffer]"?new Uint8Array(b.dictionary):b.dictionary,(v=i.deflateSetDictionary(this.strm,x))!==h)throw new Error(l[v]);this._dict_set=!0}}function y(g,b){var v=new p(b);if(v.push(g,!0),v.err)throw v.msg||l[v.err];return v.result}p.prototype.push=function(g,b){var v,x,k=this.strm,C=this.options.chunkSize;if(this.ended)return!1;x=b===~~b?b:b===!0?4:0,typeof g=="string"?k.input=a.string2buf(g):u.call(g)==="[object ArrayBuffer]"?k.input=new Uint8Array(g):k.input=g,k.next_in=0,k.avail_in=k.input.length;do{if(k.avail_out===0&&(k.output=new o.Buf8(C),k.next_out=0,k.avail_out=C),(v=i.deflate(k,x))!==1&&v!==h)return this.onEnd(v),!(this.ended=!0);k.avail_out!==0&&(k.avail_in!==0||x!==4&&x!==2)||(this.options.to==="string"?this.onData(a.buf2binstring(o.shrinkBuf(k.output,k.next_out))):this.onData(o.shrinkBuf(k.output,k.next_out)))}while((0<k.avail_in||k.avail_out===0)&&v!==1);return x===4?(v=i.deflateEnd(this.strm),this.onEnd(v),this.ended=!0,v===h):x!==2||(this.onEnd(h),!(k.avail_out=0))},p.prototype.onData=function(g){this.chunks.push(g)},p.prototype.onEnd=function(g){g===h&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=g,this.msg=this.strm.msg},s.Deflate=p,s.deflate=y,s.deflateRaw=function(g,b){return(b=b||{}).raw=!0,y(g,b)},s.gzip=function(g,b){return(b=b||{}).gzip=!0,y(g,b)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(n,r,s){var i=n("./zlib/inflate"),o=n("./utils/common"),a=n("./utils/strings"),l=n("./zlib/constants"),c=n("./zlib/messages"),u=n("./zlib/zstream"),h=n("./zlib/gzheader"),d=Object.prototype.toString;function f(p){if(!(this instanceof f))return new f(p);this.options=o.assign({chunkSize:16384,windowBits:0,to:""},p||{});var y=this.options;y.raw&&0<=y.windowBits&&y.windowBits<16&&(y.windowBits=-y.windowBits,y.windowBits===0&&(y.windowBits=-15)),!(0<=y.windowBits&&y.windowBits<16)||p&&p.windowBits||(y.windowBits+=32),15<y.windowBits&&y.windowBits<48&&(15&y.windowBits)==0&&(y.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new u,this.strm.avail_out=0;var g=i.inflateInit2(this.strm,y.windowBits);if(g!==l.Z_OK)throw new Error(c[g]);this.header=new h,i.inflateGetHeader(this.strm,this.header)}function m(p,y){var g=new f(y);if(g.push(p,!0),g.err)throw g.msg||c[g.err];return g.result}f.prototype.push=function(p,y){var g,b,v,x,k,C,E=this.strm,T=this.options.chunkSize,A=this.options.dictionary,M=!1;if(this.ended)return!1;b=y===~~y?y:y===!0?l.Z_FINISH:l.Z_NO_FLUSH,typeof p=="string"?E.input=a.binstring2buf(p):d.call(p)==="[object ArrayBuffer]"?E.input=new Uint8Array(p):E.input=p,E.next_in=0,E.avail_in=E.input.length;do{if(E.avail_out===0&&(E.output=new o.Buf8(T),E.next_out=0,E.avail_out=T),(g=i.inflate(E,l.Z_NO_FLUSH))===l.Z_NEED_DICT&&A&&(C=typeof A=="string"?a.string2buf(A):d.call(A)==="[object ArrayBuffer]"?new Uint8Array(A):A,g=i.inflateSetDictionary(this.strm,C)),g===l.Z_BUF_ERROR&&M===!0&&(g=l.Z_OK,M=!1),g!==l.Z_STREAM_END&&g!==l.Z_OK)return this.onEnd(g),!(this.ended=!0);E.next_out&&(E.avail_out!==0&&g!==l.Z_STREAM_END&&(E.avail_in!==0||b!==l.Z_FINISH&&b!==l.Z_SYNC_FLUSH)||(this.options.to==="string"?(v=a.utf8border(E.output,E.next_out),x=E.next_out-v,k=a.buf2string(E.output,v),E.next_out=x,E.avail_out=T-x,x&&o.arraySet(E.output,E.output,v,x,0),this.onData(k)):this.onData(o.shrinkBuf(E.output,E.next_out)))),E.avail_in===0&&E.avail_out===0&&(M=!0)}while((0<E.avail_in||E.avail_out===0)&&g!==l.Z_STREAM_END);return g===l.Z_STREAM_END&&(b=l.Z_FINISH),b===l.Z_FINISH?(g=i.inflateEnd(this.strm),this.onEnd(g),this.ended=!0,g===l.Z_OK):b!==l.Z_SYNC_FLUSH||(this.onEnd(l.Z_OK),!(E.avail_out=0))},f.prototype.onData=function(p){this.chunks.push(p)},f.prototype.onEnd=function(p){p===l.Z_OK&&(this.options.to==="string"?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=p,this.msg=this.strm.msg},s.Inflate=f,s.inflate=m,s.inflateRaw=function(p,y){return(y=y||{}).raw=!0,m(p,y)},s.ungzip=m},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(n,r,s){var i=typeof Uint8Array<"u"&&typeof Uint16Array<"u"&&typeof Int32Array<"u";s.assign=function(l){for(var c=Array.prototype.slice.call(arguments,1);c.length;){var u=c.shift();if(u){if(typeof u!="object")throw new TypeError(u+"must be non-object");for(var h in u)u.hasOwnProperty(h)&&(l[h]=u[h])}}return l},s.shrinkBuf=function(l,c){return l.length===c?l:l.subarray?l.subarray(0,c):(l.length=c,l)};var o={arraySet:function(l,c,u,h,d){if(c.subarray&&l.subarray)l.set(c.subarray(u,u+h),d);else for(var f=0;f<h;f++)l[d+f]=c[u+f]},flattenChunks:function(l){var c,u,h,d,f,m;for(c=h=0,u=l.length;c<u;c++)h+=l[c].length;for(m=new Uint8Array(h),c=d=0,u=l.length;c<u;c++)f=l[c],m.set(f,d),d+=f.length;return m}},a={arraySet:function(l,c,u,h,d){for(var f=0;f<h;f++)l[d+f]=c[u+f]},flattenChunks:function(l){return[].concat.apply([],l)}};s.setTyped=function(l){l?(s.Buf8=Uint8Array,s.Buf16=Uint16Array,s.Buf32=Int32Array,s.assign(s,o)):(s.Buf8=Array,s.Buf16=Array,s.Buf32=Array,s.assign(s,a))},s.setTyped(i)},{}],42:[function(n,r,s){var i=n("./common"),o=!0,a=!0;try{String.fromCharCode.apply(null,[0])}catch{o=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch{a=!1}for(var l=new i.Buf8(256),c=0;c<256;c++)l[c]=252<=c?6:248<=c?5:240<=c?4:224<=c?3:192<=c?2:1;function u(h,d){if(d<65537&&(h.subarray&&a||!h.subarray&&o))return String.fromCharCode.apply(null,i.shrinkBuf(h,d));for(var f="",m=0;m<d;m++)f+=String.fromCharCode(h[m]);return f}l[254]=l[254]=1,s.string2buf=function(h){var d,f,m,p,y,g=h.length,b=0;for(p=0;p<g;p++)(64512&(f=h.charCodeAt(p)))==55296&&p+1<g&&(64512&(m=h.charCodeAt(p+1)))==56320&&(f=65536+(f-55296<<10)+(m-56320),p++),b+=f<128?1:f<2048?2:f<65536?3:4;for(d=new i.Buf8(b),p=y=0;y<b;p++)(64512&(f=h.charCodeAt(p)))==55296&&p+1<g&&(64512&(m=h.charCodeAt(p+1)))==56320&&(f=65536+(f-55296<<10)+(m-56320),p++),f<128?d[y++]=f:(f<2048?d[y++]=192|f>>>6:(f<65536?d[y++]=224|f>>>12:(d[y++]=240|f>>>18,d[y++]=128|f>>>12&63),d[y++]=128|f>>>6&63),d[y++]=128|63&f);return d},s.buf2binstring=function(h){return u(h,h.length)},s.binstring2buf=function(h){for(var d=new i.Buf8(h.length),f=0,m=d.length;f<m;f++)d[f]=h.charCodeAt(f);return d},s.buf2string=function(h,d){var f,m,p,y,g=d||h.length,b=new Array(2*g);for(f=m=0;f<g;)if((p=h[f++])<128)b[m++]=p;else if(4<(y=l[p]))b[m++]=65533,f+=y-1;else{for(p&=y===2?31:y===3?15:7;1<y&&f<g;)p=p<<6|63&h[f++],y--;1<y?b[m++]=65533:p<65536?b[m++]=p:(p-=65536,b[m++]=55296|p>>10&1023,b[m++]=56320|1023&p)}return u(b,m)},s.utf8border=function(h,d){var f;for((d=d||h.length)>h.length&&(d=h.length),f=d-1;0<=f&&(192&h[f])==128;)f--;return f<0||f===0?d:f+l[h[f]]>d?f:d}},{"./common":41}],43:[function(n,r,s){r.exports=function(i,o,a,l){for(var c=65535&i|0,u=i>>>16&65535|0,h=0;a!==0;){for(a-=h=2e3<a?2e3:a;u=u+(c=c+o[l++]|0)|0,--h;);c%=65521,u%=65521}return c|u<<16|0}},{}],44:[function(n,r,s){r.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(n,r,s){var i=(function(){for(var o,a=[],l=0;l<256;l++){o=l;for(var c=0;c<8;c++)o=1&o?3988292384^o>>>1:o>>>1;a[l]=o}return a})();r.exports=function(o,a,l,c){var u=i,h=c+l;o^=-1;for(var d=c;d<h;d++)o=o>>>8^u[255&(o^a[d])];return-1^o}},{}],46:[function(n,r,s){var i,o=n("../utils/common"),a=n("./trees"),l=n("./adler32"),c=n("./crc32"),u=n("./messages"),h=0,d=4,f=0,m=-2,p=-1,y=4,g=2,b=8,v=9,x=286,k=30,C=19,E=2*x+1,T=15,A=3,M=258,P=M+A+1,S=42,O=113,w=1,R=2,F=3,D=4;function te(_,J){return _.msg=u[J],J}function H(_){return(_<<1)-(4<_?9:0)}function Q(_){for(var J=_.length;0<=--J;)_[J]=0}function N(_){var J=_.state,Z=J.pending;Z>_.avail_out&&(Z=_.avail_out),Z!==0&&(o.arraySet(_.output,J.pending_buf,J.pending_out,Z,_.next_out),_.next_out+=Z,J.pending_out+=Z,_.total_out+=Z,_.avail_out-=Z,J.pending-=Z,J.pending===0&&(J.pending_out=0))}function B(_,J){a._tr_flush_block(_,0<=_.block_start?_.block_start:-1,_.strstart-_.block_start,J),_.block_start=_.strstart,N(_.strm)}function le(_,J){_.pending_buf[_.pending++]=J}function oe(_,J){_.pending_buf[_.pending++]=J>>>8&255,_.pending_buf[_.pending++]=255&J}function X(_,J){var Z,I,z=_.max_chain_length,U=_.strstart,se=_.prev_length,ie=_.nice_match,G=_.strstart>_.w_size-P?_.strstart-(_.w_size-P):0,j=_.window,fe=_.w_mask,ae=_.prev,we=_.strstart+M,Me=j[U+se-1],W=j[U+se];_.prev_length>=_.good_match&&(z>>=2),ie>_.lookahead&&(ie=_.lookahead);do if(j[(Z=J)+se]===W&&j[Z+se-1]===Me&&j[Z]===j[U]&&j[++Z]===j[U+1]){U+=2,Z++;do;while(j[++U]===j[++Z]&&j[++U]===j[++Z]&&j[++U]===j[++Z]&&j[++U]===j[++Z]&&j[++U]===j[++Z]&&j[++U]===j[++Z]&&j[++U]===j[++Z]&&j[++U]===j[++Z]&&U<we);if(I=M-(we-U),U=we-M,se<I){if(_.match_start=J,ie<=(se=I))break;Me=j[U+se-1],W=j[U+se]}}while((J=ae[J&fe])>G&&--z!=0);return se<=_.lookahead?se:_.lookahead}function ye(_){var J,Z,I,z,U,se,ie,G,j,fe,ae=_.w_size;do{if(z=_.window_size-_.lookahead-_.strstart,_.strstart>=ae+(ae-P)){for(o.arraySet(_.window,_.window,ae,ae,0),_.match_start-=ae,_.strstart-=ae,_.block_start-=ae,J=Z=_.hash_size;I=_.head[--J],_.head[J]=ae<=I?I-ae:0,--Z;);for(J=Z=ae;I=_.prev[--J],_.prev[J]=ae<=I?I-ae:0,--Z;);z+=ae}if(_.strm.avail_in===0)break;if(se=_.strm,ie=_.window,G=_.strstart+_.lookahead,j=z,fe=void 0,fe=se.avail_in,j<fe&&(fe=j),Z=fe===0?0:(se.avail_in-=fe,o.arraySet(ie,se.input,se.next_in,fe,G),se.state.wrap===1?se.adler=l(se.adler,ie,fe,G):se.state.wrap===2&&(se.adler=c(se.adler,ie,fe,G)),se.next_in+=fe,se.total_in+=fe,fe),_.lookahead+=Z,_.lookahead+_.insert>=A)for(U=_.strstart-_.insert,_.ins_h=_.window[U],_.ins_h=(_.ins_h<<_.hash_shift^_.window[U+1])&_.hash_mask;_.insert&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[U+A-1])&_.hash_mask,_.prev[U&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=U,U++,_.insert--,!(_.lookahead+_.insert<A)););}while(_.lookahead<P&&_.strm.avail_in!==0)}function Le(_,J){for(var Z,I;;){if(_.lookahead<P){if(ye(_),_.lookahead<P&&J===h)return w;if(_.lookahead===0)break}if(Z=0,_.lookahead>=A&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart),Z!==0&&_.strstart-Z<=_.w_size-P&&(_.match_length=X(_,Z)),_.match_length>=A)if(I=a._tr_tally(_,_.strstart-_.match_start,_.match_length-A),_.lookahead-=_.match_length,_.match_length<=_.max_lazy_match&&_.lookahead>=A){for(_.match_length--;_.strstart++,_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart,--_.match_length!=0;);_.strstart++}else _.strstart+=_.match_length,_.match_length=0,_.ins_h=_.window[_.strstart],_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+1])&_.hash_mask;else I=a._tr_tally(_,0,_.window[_.strstart]),_.lookahead--,_.strstart++;if(I&&(B(_,!1),_.strm.avail_out===0))return w}return _.insert=_.strstart<A-1?_.strstart:A-1,J===d?(B(_,!0),_.strm.avail_out===0?F:D):_.last_lit&&(B(_,!1),_.strm.avail_out===0)?w:R}function xe(_,J){for(var Z,I,z;;){if(_.lookahead<P){if(ye(_),_.lookahead<P&&J===h)return w;if(_.lookahead===0)break}if(Z=0,_.lookahead>=A&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart),_.prev_length=_.match_length,_.prev_match=_.match_start,_.match_length=A-1,Z!==0&&_.prev_length<_.max_lazy_match&&_.strstart-Z<=_.w_size-P&&(_.match_length=X(_,Z),_.match_length<=5&&(_.strategy===1||_.match_length===A&&4096<_.strstart-_.match_start)&&(_.match_length=A-1)),_.prev_length>=A&&_.match_length<=_.prev_length){for(z=_.strstart+_.lookahead-A,I=a._tr_tally(_,_.strstart-1-_.prev_match,_.prev_length-A),_.lookahead-=_.prev_length-1,_.prev_length-=2;++_.strstart<=z&&(_.ins_h=(_.ins_h<<_.hash_shift^_.window[_.strstart+A-1])&_.hash_mask,Z=_.prev[_.strstart&_.w_mask]=_.head[_.ins_h],_.head[_.ins_h]=_.strstart),--_.prev_length!=0;);if(_.match_available=0,_.match_length=A-1,_.strstart++,I&&(B(_,!1),_.strm.avail_out===0))return w}else if(_.match_available){if((I=a._tr_tally(_,0,_.window[_.strstart-1]))&&B(_,!1),_.strstart++,_.lookahead--,_.strm.avail_out===0)return w}else _.match_available=1,_.strstart++,_.lookahead--}return _.match_available&&(I=a._tr_tally(_,0,_.window[_.strstart-1]),_.match_available=0),_.insert=_.strstart<A-1?_.strstart:A-1,J===d?(B(_,!0),_.strm.avail_out===0?F:D):_.last_lit&&(B(_,!1),_.strm.avail_out===0)?w:R}function Se(_,J,Z,I,z){this.good_length=_,this.max_lazy=J,this.nice_length=Z,this.max_chain=I,this.func=z}function Ze(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=b,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new o.Buf16(2*E),this.dyn_dtree=new o.Buf16(2*(2*k+1)),this.bl_tree=new o.Buf16(2*(2*C+1)),Q(this.dyn_ltree),Q(this.dyn_dtree),Q(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new o.Buf16(T+1),this.heap=new o.Buf16(2*x+1),Q(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new o.Buf16(2*x+1),Q(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function Ue(_){var J;return _&&_.state?(_.total_in=_.total_out=0,_.data_type=g,(J=_.state).pending=0,J.pending_out=0,J.wrap<0&&(J.wrap=-J.wrap),J.status=J.wrap?S:O,_.adler=J.wrap===2?0:1,J.last_flush=h,a._tr_init(J),f):te(_,m)}function ft(_){var J=Ue(_);return J===f&&(function(Z){Z.window_size=2*Z.w_size,Q(Z.head),Z.max_lazy_match=i[Z.level].max_lazy,Z.good_match=i[Z.level].good_length,Z.nice_match=i[Z.level].nice_length,Z.max_chain_length=i[Z.level].max_chain,Z.strstart=0,Z.block_start=0,Z.lookahead=0,Z.insert=0,Z.match_length=Z.prev_length=A-1,Z.match_available=0,Z.ins_h=0})(_.state),J}function pt(_,J,Z,I,z,U){if(!_)return m;var se=1;if(J===p&&(J=6),I<0?(se=0,I=-I):15<I&&(se=2,I-=16),z<1||v<z||Z!==b||I<8||15<I||J<0||9<J||U<0||y<U)return te(_,m);I===8&&(I=9);var ie=new Ze;return(_.state=ie).strm=_,ie.wrap=se,ie.gzhead=null,ie.w_bits=I,ie.w_size=1<<ie.w_bits,ie.w_mask=ie.w_size-1,ie.hash_bits=z+7,ie.hash_size=1<<ie.hash_bits,ie.hash_mask=ie.hash_size-1,ie.hash_shift=~~((ie.hash_bits+A-1)/A),ie.window=new o.Buf8(2*ie.w_size),ie.head=new o.Buf16(ie.hash_size),ie.prev=new o.Buf16(ie.w_size),ie.lit_bufsize=1<<z+6,ie.pending_buf_size=4*ie.lit_bufsize,ie.pending_buf=new o.Buf8(ie.pending_buf_size),ie.d_buf=1*ie.lit_bufsize,ie.l_buf=3*ie.lit_bufsize,ie.level=J,ie.strategy=U,ie.method=Z,ft(_)}i=[new Se(0,0,0,0,function(_,J){var Z=65535;for(Z>_.pending_buf_size-5&&(Z=_.pending_buf_size-5);;){if(_.lookahead<=1){if(ye(_),_.lookahead===0&&J===h)return w;if(_.lookahead===0)break}_.strstart+=_.lookahead,_.lookahead=0;var I=_.block_start+Z;if((_.strstart===0||_.strstart>=I)&&(_.lookahead=_.strstart-I,_.strstart=I,B(_,!1),_.strm.avail_out===0)||_.strstart-_.block_start>=_.w_size-P&&(B(_,!1),_.strm.avail_out===0))return w}return _.insert=0,J===d?(B(_,!0),_.strm.avail_out===0?F:D):(_.strstart>_.block_start&&(B(_,!1),_.strm.avail_out),w)}),new Se(4,4,8,4,Le),new Se(4,5,16,8,Le),new Se(4,6,32,32,Le),new Se(4,4,16,16,xe),new Se(8,16,32,32,xe),new Se(8,16,128,128,xe),new Se(8,32,128,256,xe),new Se(32,128,258,1024,xe),new Se(32,258,258,4096,xe)],s.deflateInit=function(_,J){return pt(_,J,b,15,8,0)},s.deflateInit2=pt,s.deflateReset=ft,s.deflateResetKeep=Ue,s.deflateSetHeader=function(_,J){return _&&_.state?_.state.wrap!==2?m:(_.state.gzhead=J,f):m},s.deflate=function(_,J){var Z,I,z,U;if(!_||!_.state||5<J||J<0)return _?te(_,m):m;if(I=_.state,!_.output||!_.input&&_.avail_in!==0||I.status===666&&J!==d)return te(_,_.avail_out===0?-5:m);if(I.strm=_,Z=I.last_flush,I.last_flush=J,I.status===S)if(I.wrap===2)_.adler=0,le(I,31),le(I,139),le(I,8),I.gzhead?(le(I,(I.gzhead.text?1:0)+(I.gzhead.hcrc?2:0)+(I.gzhead.extra?4:0)+(I.gzhead.name?8:0)+(I.gzhead.comment?16:0)),le(I,255&I.gzhead.time),le(I,I.gzhead.time>>8&255),le(I,I.gzhead.time>>16&255),le(I,I.gzhead.time>>24&255),le(I,I.level===9?2:2<=I.strategy||I.level<2?4:0),le(I,255&I.gzhead.os),I.gzhead.extra&&I.gzhead.extra.length&&(le(I,255&I.gzhead.extra.length),le(I,I.gzhead.extra.length>>8&255)),I.gzhead.hcrc&&(_.adler=c(_.adler,I.pending_buf,I.pending,0)),I.gzindex=0,I.status=69):(le(I,0),le(I,0),le(I,0),le(I,0),le(I,0),le(I,I.level===9?2:2<=I.strategy||I.level<2?4:0),le(I,3),I.status=O);else{var se=b+(I.w_bits-8<<4)<<8;se|=(2<=I.strategy||I.level<2?0:I.level<6?1:I.level===6?2:3)<<6,I.strstart!==0&&(se|=32),se+=31-se%31,I.status=O,oe(I,se),I.strstart!==0&&(oe(I,_.adler>>>16),oe(I,65535&_.adler)),_.adler=1}if(I.status===69)if(I.gzhead.extra){for(z=I.pending;I.gzindex<(65535&I.gzhead.extra.length)&&(I.pending!==I.pending_buf_size||(I.gzhead.hcrc&&I.pending>z&&(_.adler=c(_.adler,I.pending_buf,I.pending-z,z)),N(_),z=I.pending,I.pending!==I.pending_buf_size));)le(I,255&I.gzhead.extra[I.gzindex]),I.gzindex++;I.gzhead.hcrc&&I.pending>z&&(_.adler=c(_.adler,I.pending_buf,I.pending-z,z)),I.gzindex===I.gzhead.extra.length&&(I.gzindex=0,I.status=73)}else I.status=73;if(I.status===73)if(I.gzhead.name){z=I.pending;do{if(I.pending===I.pending_buf_size&&(I.gzhead.hcrc&&I.pending>z&&(_.adler=c(_.adler,I.pending_buf,I.pending-z,z)),N(_),z=I.pending,I.pending===I.pending_buf_size)){U=1;break}U=I.gzindex<I.gzhead.name.length?255&I.gzhead.name.charCodeAt(I.gzindex++):0,le(I,U)}while(U!==0);I.gzhead.hcrc&&I.pending>z&&(_.adler=c(_.adler,I.pending_buf,I.pending-z,z)),U===0&&(I.gzindex=0,I.status=91)}else I.status=91;if(I.status===91)if(I.gzhead.comment){z=I.pending;do{if(I.pending===I.pending_buf_size&&(I.gzhead.hcrc&&I.pending>z&&(_.adler=c(_.adler,I.pending_buf,I.pending-z,z)),N(_),z=I.pending,I.pending===I.pending_buf_size)){U=1;break}U=I.gzindex<I.gzhead.comment.length?255&I.gzhead.comment.charCodeAt(I.gzindex++):0,le(I,U)}while(U!==0);I.gzhead.hcrc&&I.pending>z&&(_.adler=c(_.adler,I.pending_buf,I.pending-z,z)),U===0&&(I.status=103)}else I.status=103;if(I.status===103&&(I.gzhead.hcrc?(I.pending+2>I.pending_buf_size&&N(_),I.pending+2<=I.pending_buf_size&&(le(I,255&_.adler),le(I,_.adler>>8&255),_.adler=0,I.status=O)):I.status=O),I.pending!==0){if(N(_),_.avail_out===0)return I.last_flush=-1,f}else if(_.avail_in===0&&H(J)<=H(Z)&&J!==d)return te(_,-5);if(I.status===666&&_.avail_in!==0)return te(_,-5);if(_.avail_in!==0||I.lookahead!==0||J!==h&&I.status!==666){var ie=I.strategy===2?(function(G,j){for(var fe;;){if(G.lookahead===0&&(ye(G),G.lookahead===0)){if(j===h)return w;break}if(G.match_length=0,fe=a._tr_tally(G,0,G.window[G.strstart]),G.lookahead--,G.strstart++,fe&&(B(G,!1),G.strm.avail_out===0))return w}return G.insert=0,j===d?(B(G,!0),G.strm.avail_out===0?F:D):G.last_lit&&(B(G,!1),G.strm.avail_out===0)?w:R})(I,J):I.strategy===3?(function(G,j){for(var fe,ae,we,Me,W=G.window;;){if(G.lookahead<=M){if(ye(G),G.lookahead<=M&&j===h)return w;if(G.lookahead===0)break}if(G.match_length=0,G.lookahead>=A&&0<G.strstart&&(ae=W[we=G.strstart-1])===W[++we]&&ae===W[++we]&&ae===W[++we]){Me=G.strstart+M;do;while(ae===W[++we]&&ae===W[++we]&&ae===W[++we]&&ae===W[++we]&&ae===W[++we]&&ae===W[++we]&&ae===W[++we]&&ae===W[++we]&&we<Me);G.match_length=M-(Me-we),G.match_length>G.lookahead&&(G.match_length=G.lookahead)}if(G.match_length>=A?(fe=a._tr_tally(G,1,G.match_length-A),G.lookahead-=G.match_length,G.strstart+=G.match_length,G.match_length=0):(fe=a._tr_tally(G,0,G.window[G.strstart]),G.lookahead--,G.strstart++),fe&&(B(G,!1),G.strm.avail_out===0))return w}return G.insert=0,j===d?(B(G,!0),G.strm.avail_out===0?F:D):G.last_lit&&(B(G,!1),G.strm.avail_out===0)?w:R})(I,J):i[I.level].func(I,J);if(ie!==F&&ie!==D||(I.status=666),ie===w||ie===F)return _.avail_out===0&&(I.last_flush=-1),f;if(ie===R&&(J===1?a._tr_align(I):J!==5&&(a._tr_stored_block(I,0,0,!1),J===3&&(Q(I.head),I.lookahead===0&&(I.strstart=0,I.block_start=0,I.insert=0))),N(_),_.avail_out===0))return I.last_flush=-1,f}return J!==d?f:I.wrap<=0?1:(I.wrap===2?(le(I,255&_.adler),le(I,_.adler>>8&255),le(I,_.adler>>16&255),le(I,_.adler>>24&255),le(I,255&_.total_in),le(I,_.total_in>>8&255),le(I,_.total_in>>16&255),le(I,_.total_in>>24&255)):(oe(I,_.adler>>>16),oe(I,65535&_.adler)),N(_),0<I.wrap&&(I.wrap=-I.wrap),I.pending!==0?f:1)},s.deflateEnd=function(_){var J;return _&&_.state?(J=_.state.status)!==S&&J!==69&&J!==73&&J!==91&&J!==103&&J!==O&&J!==666?te(_,m):(_.state=null,J===O?te(_,-3):f):m},s.deflateSetDictionary=function(_,J){var Z,I,z,U,se,ie,G,j,fe=J.length;if(!_||!_.state||(U=(Z=_.state).wrap)===2||U===1&&Z.status!==S||Z.lookahead)return m;for(U===1&&(_.adler=l(_.adler,J,fe,0)),Z.wrap=0,fe>=Z.w_size&&(U===0&&(Q(Z.head),Z.strstart=0,Z.block_start=0,Z.insert=0),j=new o.Buf8(Z.w_size),o.arraySet(j,J,fe-Z.w_size,Z.w_size,0),J=j,fe=Z.w_size),se=_.avail_in,ie=_.next_in,G=_.input,_.avail_in=fe,_.next_in=0,_.input=J,ye(Z);Z.lookahead>=A;){for(I=Z.strstart,z=Z.lookahead-(A-1);Z.ins_h=(Z.ins_h<<Z.hash_shift^Z.window[I+A-1])&Z.hash_mask,Z.prev[I&Z.w_mask]=Z.head[Z.ins_h],Z.head[Z.ins_h]=I,I++,--z;);Z.strstart=I,Z.lookahead=A-1,ye(Z)}return Z.strstart+=Z.lookahead,Z.block_start=Z.strstart,Z.insert=Z.lookahead,Z.lookahead=0,Z.match_length=Z.prev_length=A-1,Z.match_available=0,_.next_in=ie,_.input=G,_.avail_in=se,Z.wrap=U,f},s.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(n,r,s){r.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(n,r,s){r.exports=function(i,o){var a,l,c,u,h,d,f,m,p,y,g,b,v,x,k,C,E,T,A,M,P,S,O,w,R;a=i.state,l=i.next_in,w=i.input,c=l+(i.avail_in-5),u=i.next_out,R=i.output,h=u-(o-i.avail_out),d=u+(i.avail_out-257),f=a.dmax,m=a.wsize,p=a.whave,y=a.wnext,g=a.window,b=a.hold,v=a.bits,x=a.lencode,k=a.distcode,C=(1<<a.lenbits)-1,E=(1<<a.distbits)-1;e:do{v<15&&(b+=w[l++]<<v,v+=8,b+=w[l++]<<v,v+=8),T=x[b&C];t:for(;;){if(b>>>=A=T>>>24,v-=A,(A=T>>>16&255)===0)R[u++]=65535&T;else{if(!(16&A)){if((64&A)==0){T=x[(65535&T)+(b&(1<<A)-1)];continue t}if(32&A){a.mode=12;break e}i.msg="invalid literal/length code",a.mode=30;break e}M=65535&T,(A&=15)&&(v<A&&(b+=w[l++]<<v,v+=8),M+=b&(1<<A)-1,b>>>=A,v-=A),v<15&&(b+=w[l++]<<v,v+=8,b+=w[l++]<<v,v+=8),T=k[b&E];n:for(;;){if(b>>>=A=T>>>24,v-=A,!(16&(A=T>>>16&255))){if((64&A)==0){T=k[(65535&T)+(b&(1<<A)-1)];continue n}i.msg="invalid distance code",a.mode=30;break e}if(P=65535&T,v<(A&=15)&&(b+=w[l++]<<v,(v+=8)<A&&(b+=w[l++]<<v,v+=8)),f<(P+=b&(1<<A)-1)){i.msg="invalid distance too far back",a.mode=30;break e}if(b>>>=A,v-=A,(A=u-h)<P){if(p<(A=P-A)&&a.sane){i.msg="invalid distance too far back",a.mode=30;break e}if(O=g,(S=0)===y){if(S+=m-A,A<M){for(M-=A;R[u++]=g[S++],--A;);S=u-P,O=R}}else if(y<A){if(S+=m+y-A,(A-=y)<M){for(M-=A;R[u++]=g[S++],--A;);if(S=0,y<M){for(M-=A=y;R[u++]=g[S++],--A;);S=u-P,O=R}}}else if(S+=y-A,A<M){for(M-=A;R[u++]=g[S++],--A;);S=u-P,O=R}for(;2<M;)R[u++]=O[S++],R[u++]=O[S++],R[u++]=O[S++],M-=3;M&&(R[u++]=O[S++],1<M&&(R[u++]=O[S++]))}else{for(S=u-P;R[u++]=R[S++],R[u++]=R[S++],R[u++]=R[S++],2<(M-=3););M&&(R[u++]=R[S++],1<M&&(R[u++]=R[S++]))}break}}break}}while(l<c&&u<d);l-=M=v>>3,b&=(1<<(v-=M<<3))-1,i.next_in=l,i.next_out=u,i.avail_in=l<c?c-l+5:5-(l-c),i.avail_out=u<d?d-u+257:257-(u-d),a.hold=b,a.bits=v}},{}],49:[function(n,r,s){var i=n("../utils/common"),o=n("./adler32"),a=n("./crc32"),l=n("./inffast"),c=n("./inftrees"),u=1,h=2,d=0,f=-2,m=1,p=852,y=592;function g(S){return(S>>>24&255)+(S>>>8&65280)+((65280&S)<<8)+((255&S)<<24)}function b(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new i.Buf16(320),this.work=new i.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function v(S){var O;return S&&S.state?(O=S.state,S.total_in=S.total_out=O.total=0,S.msg="",O.wrap&&(S.adler=1&O.wrap),O.mode=m,O.last=0,O.havedict=0,O.dmax=32768,O.head=null,O.hold=0,O.bits=0,O.lencode=O.lendyn=new i.Buf32(p),O.distcode=O.distdyn=new i.Buf32(y),O.sane=1,O.back=-1,d):f}function x(S){var O;return S&&S.state?((O=S.state).wsize=0,O.whave=0,O.wnext=0,v(S)):f}function k(S,O){var w,R;return S&&S.state?(R=S.state,O<0?(w=0,O=-O):(w=1+(O>>4),O<48&&(O&=15)),O&&(O<8||15<O)?f:(R.window!==null&&R.wbits!==O&&(R.window=null),R.wrap=w,R.wbits=O,x(S))):f}function C(S,O){var w,R;return S?(R=new b,(S.state=R).window=null,(w=k(S,O))!==d&&(S.state=null),w):f}var E,T,A=!0;function M(S){if(A){var O;for(E=new i.Buf32(512),T=new i.Buf32(32),O=0;O<144;)S.lens[O++]=8;for(;O<256;)S.lens[O++]=9;for(;O<280;)S.lens[O++]=7;for(;O<288;)S.lens[O++]=8;for(c(u,S.lens,0,288,E,0,S.work,{bits:9}),O=0;O<32;)S.lens[O++]=5;c(h,S.lens,0,32,T,0,S.work,{bits:5}),A=!1}S.lencode=E,S.lenbits=9,S.distcode=T,S.distbits=5}function P(S,O,w,R){var F,D=S.state;return D.window===null&&(D.wsize=1<<D.wbits,D.wnext=0,D.whave=0,D.window=new i.Buf8(D.wsize)),R>=D.wsize?(i.arraySet(D.window,O,w-D.wsize,D.wsize,0),D.wnext=0,D.whave=D.wsize):(R<(F=D.wsize-D.wnext)&&(F=R),i.arraySet(D.window,O,w-R,F,D.wnext),(R-=F)?(i.arraySet(D.window,O,w-R,R,0),D.wnext=R,D.whave=D.wsize):(D.wnext+=F,D.wnext===D.wsize&&(D.wnext=0),D.whave<D.wsize&&(D.whave+=F))),0}s.inflateReset=x,s.inflateReset2=k,s.inflateResetKeep=v,s.inflateInit=function(S){return C(S,15)},s.inflateInit2=C,s.inflate=function(S,O){var w,R,F,D,te,H,Q,N,B,le,oe,X,ye,Le,xe,Se,Ze,Ue,ft,pt,_,J,Z,I,z=0,U=new i.Buf8(4),se=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!S||!S.state||!S.output||!S.input&&S.avail_in!==0)return f;(w=S.state).mode===12&&(w.mode=13),te=S.next_out,F=S.output,Q=S.avail_out,D=S.next_in,R=S.input,H=S.avail_in,N=w.hold,B=w.bits,le=H,oe=Q,J=d;e:for(;;)switch(w.mode){case m:if(w.wrap===0){w.mode=13;break}for(;B<16;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(2&w.wrap&&N===35615){U[w.check=0]=255&N,U[1]=N>>>8&255,w.check=a(w.check,U,2,0),B=N=0,w.mode=2;break}if(w.flags=0,w.head&&(w.head.done=!1),!(1&w.wrap)||(((255&N)<<8)+(N>>8))%31){S.msg="incorrect header check",w.mode=30;break}if((15&N)!=8){S.msg="unknown compression method",w.mode=30;break}if(B-=4,_=8+(15&(N>>>=4)),w.wbits===0)w.wbits=_;else if(_>w.wbits){S.msg="invalid window size",w.mode=30;break}w.dmax=1<<_,S.adler=w.check=1,w.mode=512&N?10:12,B=N=0;break;case 2:for(;B<16;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(w.flags=N,(255&w.flags)!=8){S.msg="unknown compression method",w.mode=30;break}if(57344&w.flags){S.msg="unknown header flags set",w.mode=30;break}w.head&&(w.head.text=N>>8&1),512&w.flags&&(U[0]=255&N,U[1]=N>>>8&255,w.check=a(w.check,U,2,0)),B=N=0,w.mode=3;case 3:for(;B<32;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}w.head&&(w.head.time=N),512&w.flags&&(U[0]=255&N,U[1]=N>>>8&255,U[2]=N>>>16&255,U[3]=N>>>24&255,w.check=a(w.check,U,4,0)),B=N=0,w.mode=4;case 4:for(;B<16;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}w.head&&(w.head.xflags=255&N,w.head.os=N>>8),512&w.flags&&(U[0]=255&N,U[1]=N>>>8&255,w.check=a(w.check,U,2,0)),B=N=0,w.mode=5;case 5:if(1024&w.flags){for(;B<16;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}w.length=N,w.head&&(w.head.extra_len=N),512&w.flags&&(U[0]=255&N,U[1]=N>>>8&255,w.check=a(w.check,U,2,0)),B=N=0}else w.head&&(w.head.extra=null);w.mode=6;case 6:if(1024&w.flags&&(H<(X=w.length)&&(X=H),X&&(w.head&&(_=w.head.extra_len-w.length,w.head.extra||(w.head.extra=new Array(w.head.extra_len)),i.arraySet(w.head.extra,R,D,X,_)),512&w.flags&&(w.check=a(w.check,R,X,D)),H-=X,D+=X,w.length-=X),w.length))break e;w.length=0,w.mode=7;case 7:if(2048&w.flags){if(H===0)break e;for(X=0;_=R[D+X++],w.head&&_&&w.length<65536&&(w.head.name+=String.fromCharCode(_)),_&&X<H;);if(512&w.flags&&(w.check=a(w.check,R,X,D)),H-=X,D+=X,_)break e}else w.head&&(w.head.name=null);w.length=0,w.mode=8;case 8:if(4096&w.flags){if(H===0)break e;for(X=0;_=R[D+X++],w.head&&_&&w.length<65536&&(w.head.comment+=String.fromCharCode(_)),_&&X<H;);if(512&w.flags&&(w.check=a(w.check,R,X,D)),H-=X,D+=X,_)break e}else w.head&&(w.head.comment=null);w.mode=9;case 9:if(512&w.flags){for(;B<16;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(N!==(65535&w.check)){S.msg="header crc mismatch",w.mode=30;break}B=N=0}w.head&&(w.head.hcrc=w.flags>>9&1,w.head.done=!0),S.adler=w.check=0,w.mode=12;break;case 10:for(;B<32;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}S.adler=w.check=g(N),B=N=0,w.mode=11;case 11:if(w.havedict===0)return S.next_out=te,S.avail_out=Q,S.next_in=D,S.avail_in=H,w.hold=N,w.bits=B,2;S.adler=w.check=1,w.mode=12;case 12:if(O===5||O===6)break e;case 13:if(w.last){N>>>=7&B,B-=7&B,w.mode=27;break}for(;B<3;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}switch(w.last=1&N,B-=1,3&(N>>>=1)){case 0:w.mode=14;break;case 1:if(M(w),w.mode=20,O!==6)break;N>>>=2,B-=2;break e;case 2:w.mode=17;break;case 3:S.msg="invalid block type",w.mode=30}N>>>=2,B-=2;break;case 14:for(N>>>=7&B,B-=7&B;B<32;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if((65535&N)!=(N>>>16^65535)){S.msg="invalid stored block lengths",w.mode=30;break}if(w.length=65535&N,B=N=0,w.mode=15,O===6)break e;case 15:w.mode=16;case 16:if(X=w.length){if(H<X&&(X=H),Q<X&&(X=Q),X===0)break e;i.arraySet(F,R,D,X,te),H-=X,D+=X,Q-=X,te+=X,w.length-=X;break}w.mode=12;break;case 17:for(;B<14;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(w.nlen=257+(31&N),N>>>=5,B-=5,w.ndist=1+(31&N),N>>>=5,B-=5,w.ncode=4+(15&N),N>>>=4,B-=4,286<w.nlen||30<w.ndist){S.msg="too many length or distance symbols",w.mode=30;break}w.have=0,w.mode=18;case 18:for(;w.have<w.ncode;){for(;B<3;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}w.lens[se[w.have++]]=7&N,N>>>=3,B-=3}for(;w.have<19;)w.lens[se[w.have++]]=0;if(w.lencode=w.lendyn,w.lenbits=7,Z={bits:w.lenbits},J=c(0,w.lens,0,19,w.lencode,0,w.work,Z),w.lenbits=Z.bits,J){S.msg="invalid code lengths set",w.mode=30;break}w.have=0,w.mode=19;case 19:for(;w.have<w.nlen+w.ndist;){for(;Se=(z=w.lencode[N&(1<<w.lenbits)-1])>>>16&255,Ze=65535&z,!((xe=z>>>24)<=B);){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(Ze<16)N>>>=xe,B-=xe,w.lens[w.have++]=Ze;else{if(Ze===16){for(I=xe+2;B<I;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(N>>>=xe,B-=xe,w.have===0){S.msg="invalid bit length repeat",w.mode=30;break}_=w.lens[w.have-1],X=3+(3&N),N>>>=2,B-=2}else if(Ze===17){for(I=xe+3;B<I;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}B-=xe,_=0,X=3+(7&(N>>>=xe)),N>>>=3,B-=3}else{for(I=xe+7;B<I;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}B-=xe,_=0,X=11+(127&(N>>>=xe)),N>>>=7,B-=7}if(w.have+X>w.nlen+w.ndist){S.msg="invalid bit length repeat",w.mode=30;break}for(;X--;)w.lens[w.have++]=_}}if(w.mode===30)break;if(w.lens[256]===0){S.msg="invalid code -- missing end-of-block",w.mode=30;break}if(w.lenbits=9,Z={bits:w.lenbits},J=c(u,w.lens,0,w.nlen,w.lencode,0,w.work,Z),w.lenbits=Z.bits,J){S.msg="invalid literal/lengths set",w.mode=30;break}if(w.distbits=6,w.distcode=w.distdyn,Z={bits:w.distbits},J=c(h,w.lens,w.nlen,w.ndist,w.distcode,0,w.work,Z),w.distbits=Z.bits,J){S.msg="invalid distances set",w.mode=30;break}if(w.mode=20,O===6)break e;case 20:w.mode=21;case 21:if(6<=H&&258<=Q){S.next_out=te,S.avail_out=Q,S.next_in=D,S.avail_in=H,w.hold=N,w.bits=B,l(S,oe),te=S.next_out,F=S.output,Q=S.avail_out,D=S.next_in,R=S.input,H=S.avail_in,N=w.hold,B=w.bits,w.mode===12&&(w.back=-1);break}for(w.back=0;Se=(z=w.lencode[N&(1<<w.lenbits)-1])>>>16&255,Ze=65535&z,!((xe=z>>>24)<=B);){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(Se&&(240&Se)==0){for(Ue=xe,ft=Se,pt=Ze;Se=(z=w.lencode[pt+((N&(1<<Ue+ft)-1)>>Ue)])>>>16&255,Ze=65535&z,!(Ue+(xe=z>>>24)<=B);){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}N>>>=Ue,B-=Ue,w.back+=Ue}if(N>>>=xe,B-=xe,w.back+=xe,w.length=Ze,Se===0){w.mode=26;break}if(32&Se){w.back=-1,w.mode=12;break}if(64&Se){S.msg="invalid literal/length code",w.mode=30;break}w.extra=15&Se,w.mode=22;case 22:if(w.extra){for(I=w.extra;B<I;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}w.length+=N&(1<<w.extra)-1,N>>>=w.extra,B-=w.extra,w.back+=w.extra}w.was=w.length,w.mode=23;case 23:for(;Se=(z=w.distcode[N&(1<<w.distbits)-1])>>>16&255,Ze=65535&z,!((xe=z>>>24)<=B);){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if((240&Se)==0){for(Ue=xe,ft=Se,pt=Ze;Se=(z=w.distcode[pt+((N&(1<<Ue+ft)-1)>>Ue)])>>>16&255,Ze=65535&z,!(Ue+(xe=z>>>24)<=B);){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}N>>>=Ue,B-=Ue,w.back+=Ue}if(N>>>=xe,B-=xe,w.back+=xe,64&Se){S.msg="invalid distance code",w.mode=30;break}w.offset=Ze,w.extra=15&Se,w.mode=24;case 24:if(w.extra){for(I=w.extra;B<I;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}w.offset+=N&(1<<w.extra)-1,N>>>=w.extra,B-=w.extra,w.back+=w.extra}if(w.offset>w.dmax){S.msg="invalid distance too far back",w.mode=30;break}w.mode=25;case 25:if(Q===0)break e;if(X=oe-Q,w.offset>X){if((X=w.offset-X)>w.whave&&w.sane){S.msg="invalid distance too far back",w.mode=30;break}ye=X>w.wnext?(X-=w.wnext,w.wsize-X):w.wnext-X,X>w.length&&(X=w.length),Le=w.window}else Le=F,ye=te-w.offset,X=w.length;for(Q<X&&(X=Q),Q-=X,w.length-=X;F[te++]=Le[ye++],--X;);w.length===0&&(w.mode=21);break;case 26:if(Q===0)break e;F[te++]=w.length,Q--,w.mode=21;break;case 27:if(w.wrap){for(;B<32;){if(H===0)break e;H--,N|=R[D++]<<B,B+=8}if(oe-=Q,S.total_out+=oe,w.total+=oe,oe&&(S.adler=w.check=w.flags?a(w.check,F,oe,te-oe):o(w.check,F,oe,te-oe)),oe=Q,(w.flags?N:g(N))!==w.check){S.msg="incorrect data check",w.mode=30;break}B=N=0}w.mode=28;case 28:if(w.wrap&&w.flags){for(;B<32;){if(H===0)break e;H--,N+=R[D++]<<B,B+=8}if(N!==(4294967295&w.total)){S.msg="incorrect length check",w.mode=30;break}B=N=0}w.mode=29;case 29:J=1;break e;case 30:J=-3;break e;case 31:return-4;default:return f}return S.next_out=te,S.avail_out=Q,S.next_in=D,S.avail_in=H,w.hold=N,w.bits=B,(w.wsize||oe!==S.avail_out&&w.mode<30&&(w.mode<27||O!==4))&&P(S,S.output,S.next_out,oe-S.avail_out)?(w.mode=31,-4):(le-=S.avail_in,oe-=S.avail_out,S.total_in+=le,S.total_out+=oe,w.total+=oe,w.wrap&&oe&&(S.adler=w.check=w.flags?a(w.check,F,oe,S.next_out-oe):o(w.check,F,oe,S.next_out-oe)),S.data_type=w.bits+(w.last?64:0)+(w.mode===12?128:0)+(w.mode===20||w.mode===15?256:0),(le==0&&oe===0||O===4)&&J===d&&(J=-5),J)},s.inflateEnd=function(S){if(!S||!S.state)return f;var O=S.state;return O.window&&(O.window=null),S.state=null,d},s.inflateGetHeader=function(S,O){var w;return S&&S.state?(2&(w=S.state).wrap)==0?f:((w.head=O).done=!1,d):f},s.inflateSetDictionary=function(S,O){var w,R=O.length;return S&&S.state?(w=S.state).wrap!==0&&w.mode!==11?f:w.mode===11&&o(1,O,R,0)!==w.check?-3:P(S,O,R,R)?(w.mode=31,-4):(w.havedict=1,d):f},s.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(n,r,s){var i=n("../utils/common"),o=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],a=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],l=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],c=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];r.exports=function(u,h,d,f,m,p,y,g){var b,v,x,k,C,E,T,A,M,P=g.bits,S=0,O=0,w=0,R=0,F=0,D=0,te=0,H=0,Q=0,N=0,B=null,le=0,oe=new i.Buf16(16),X=new i.Buf16(16),ye=null,Le=0;for(S=0;S<=15;S++)oe[S]=0;for(O=0;O<f;O++)oe[h[d+O]]++;for(F=P,R=15;1<=R&&oe[R]===0;R--);if(R<F&&(F=R),R===0)return m[p++]=20971520,m[p++]=20971520,g.bits=1,0;for(w=1;w<R&&oe[w]===0;w++);for(F<w&&(F=w),S=H=1;S<=15;S++)if(H<<=1,(H-=oe[S])<0)return-1;if(0<H&&(u===0||R!==1))return-1;for(X[1]=0,S=1;S<15;S++)X[S+1]=X[S]+oe[S];for(O=0;O<f;O++)h[d+O]!==0&&(y[X[h[d+O]]++]=O);if(E=u===0?(B=ye=y,19):u===1?(B=o,le-=257,ye=a,Le-=257,256):(B=l,ye=c,-1),S=w,C=p,te=O=N=0,x=-1,k=(Q=1<<(D=F))-1,u===1&&852<Q||u===2&&592<Q)return 1;for(;;){for(T=S-te,M=y[O]<E?(A=0,y[O]):y[O]>E?(A=ye[Le+y[O]],B[le+y[O]]):(A=96,0),b=1<<S-te,w=v=1<<D;m[C+(N>>te)+(v-=b)]=T<<24|A<<16|M|0,v!==0;);for(b=1<<S-1;N&b;)b>>=1;if(b!==0?(N&=b-1,N+=b):N=0,O++,--oe[S]==0){if(S===R)break;S=h[d+y[O]]}if(F<S&&(N&k)!==x){for(te===0&&(te=F),C+=w,H=1<<(D=S-te);D+te<R&&!((H-=oe[D+te])<=0);)D++,H<<=1;if(Q+=1<<D,u===1&&852<Q||u===2&&592<Q)return 1;m[x=N&k]=F<<24|D<<16|C-p|0}}return N!==0&&(m[C+N]=S-te<<24|64<<16|0),g.bits=F,0}},{"../utils/common":41}],51:[function(n,r,s){r.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(n,r,s){var i=n("../utils/common"),o=0,a=1;function l(z){for(var U=z.length;0<=--U;)z[U]=0}var c=0,u=29,h=256,d=h+1+u,f=30,m=19,p=2*d+1,y=15,g=16,b=7,v=256,x=16,k=17,C=18,E=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],T=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],A=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],M=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],P=new Array(2*(d+2));l(P);var S=new Array(2*f);l(S);var O=new Array(512);l(O);var w=new Array(256);l(w);var R=new Array(u);l(R);var F,D,te,H=new Array(f);function Q(z,U,se,ie,G){this.static_tree=z,this.extra_bits=U,this.extra_base=se,this.elems=ie,this.max_length=G,this.has_stree=z&&z.length}function N(z,U){this.dyn_tree=z,this.max_code=0,this.stat_desc=U}function B(z){return z<256?O[z]:O[256+(z>>>7)]}function le(z,U){z.pending_buf[z.pending++]=255&U,z.pending_buf[z.pending++]=U>>>8&255}function oe(z,U,se){z.bi_valid>g-se?(z.bi_buf|=U<<z.bi_valid&65535,le(z,z.bi_buf),z.bi_buf=U>>g-z.bi_valid,z.bi_valid+=se-g):(z.bi_buf|=U<<z.bi_valid&65535,z.bi_valid+=se)}function X(z,U,se){oe(z,se[2*U],se[2*U+1])}function ye(z,U){for(var se=0;se|=1&z,z>>>=1,se<<=1,0<--U;);return se>>>1}function Le(z,U,se){var ie,G,j=new Array(y+1),fe=0;for(ie=1;ie<=y;ie++)j[ie]=fe=fe+se[ie-1]<<1;for(G=0;G<=U;G++){var ae=z[2*G+1];ae!==0&&(z[2*G]=ye(j[ae]++,ae))}}function xe(z){var U;for(U=0;U<d;U++)z.dyn_ltree[2*U]=0;for(U=0;U<f;U++)z.dyn_dtree[2*U]=0;for(U=0;U<m;U++)z.bl_tree[2*U]=0;z.dyn_ltree[2*v]=1,z.opt_len=z.static_len=0,z.last_lit=z.matches=0}function Se(z){8<z.bi_valid?le(z,z.bi_buf):0<z.bi_valid&&(z.pending_buf[z.pending++]=z.bi_buf),z.bi_buf=0,z.bi_valid=0}function Ze(z,U,se,ie){var G=2*U,j=2*se;return z[G]<z[j]||z[G]===z[j]&&ie[U]<=ie[se]}function Ue(z,U,se){for(var ie=z.heap[se],G=se<<1;G<=z.heap_len&&(G<z.heap_len&&Ze(U,z.heap[G+1],z.heap[G],z.depth)&&G++,!Ze(U,ie,z.heap[G],z.depth));)z.heap[se]=z.heap[G],se=G,G<<=1;z.heap[se]=ie}function ft(z,U,se){var ie,G,j,fe,ae=0;if(z.last_lit!==0)for(;ie=z.pending_buf[z.d_buf+2*ae]<<8|z.pending_buf[z.d_buf+2*ae+1],G=z.pending_buf[z.l_buf+ae],ae++,ie===0?X(z,G,U):(X(z,(j=w[G])+h+1,U),(fe=E[j])!==0&&oe(z,G-=R[j],fe),X(z,j=B(--ie),se),(fe=T[j])!==0&&oe(z,ie-=H[j],fe)),ae<z.last_lit;);X(z,v,U)}function pt(z,U){var se,ie,G,j=U.dyn_tree,fe=U.stat_desc.static_tree,ae=U.stat_desc.has_stree,we=U.stat_desc.elems,Me=-1;for(z.heap_len=0,z.heap_max=p,se=0;se<we;se++)j[2*se]!==0?(z.heap[++z.heap_len]=Me=se,z.depth[se]=0):j[2*se+1]=0;for(;z.heap_len<2;)j[2*(G=z.heap[++z.heap_len]=Me<2?++Me:0)]=1,z.depth[G]=0,z.opt_len--,ae&&(z.static_len-=fe[2*G+1]);for(U.max_code=Me,se=z.heap_len>>1;1<=se;se--)Ue(z,j,se);for(G=we;se=z.heap[1],z.heap[1]=z.heap[z.heap_len--],Ue(z,j,1),ie=z.heap[1],z.heap[--z.heap_max]=se,z.heap[--z.heap_max]=ie,j[2*G]=j[2*se]+j[2*ie],z.depth[G]=(z.depth[se]>=z.depth[ie]?z.depth[se]:z.depth[ie])+1,j[2*se+1]=j[2*ie+1]=G,z.heap[1]=G++,Ue(z,j,1),2<=z.heap_len;);z.heap[--z.heap_max]=z.heap[1],(function(W,ee){var K,ke,Ye,Ce,et,mt,it=ee.dyn_tree,en=ee.max_code,tn=ee.stat_desc.static_tree,Be=ee.stat_desc.has_stree,Pe=ee.stat_desc.extra_bits,at=ee.stat_desc.extra_base,gt=ee.stat_desc.max_length,tt=0;for(Ce=0;Ce<=y;Ce++)W.bl_count[Ce]=0;for(it[2*W.heap[W.heap_max]+1]=0,K=W.heap_max+1;K<p;K++)gt<(Ce=it[2*it[2*(ke=W.heap[K])+1]+1]+1)&&(Ce=gt,tt++),it[2*ke+1]=Ce,en<ke||(W.bl_count[Ce]++,et=0,at<=ke&&(et=Pe[ke-at]),mt=it[2*ke],W.opt_len+=mt*(Ce+et),Be&&(W.static_len+=mt*(tn[2*ke+1]+et)));if(tt!==0){do{for(Ce=gt-1;W.bl_count[Ce]===0;)Ce--;W.bl_count[Ce]--,W.bl_count[Ce+1]+=2,W.bl_count[gt]--,tt-=2}while(0<tt);for(Ce=gt;Ce!==0;Ce--)for(ke=W.bl_count[Ce];ke!==0;)en<(Ye=W.heap[--K])||(it[2*Ye+1]!==Ce&&(W.opt_len+=(Ce-it[2*Ye+1])*it[2*Ye],it[2*Ye+1]=Ce),ke--)}})(z,U),Le(j,Me,z.bl_count)}function _(z,U,se){var ie,G,j=-1,fe=U[1],ae=0,we=7,Me=4;for(fe===0&&(we=138,Me=3),U[2*(se+1)+1]=65535,ie=0;ie<=se;ie++)G=fe,fe=U[2*(ie+1)+1],++ae<we&&G===fe||(ae<Me?z.bl_tree[2*G]+=ae:G!==0?(G!==j&&z.bl_tree[2*G]++,z.bl_tree[2*x]++):ae<=10?z.bl_tree[2*k]++:z.bl_tree[2*C]++,j=G,Me=(ae=0)===fe?(we=138,3):G===fe?(we=6,3):(we=7,4))}function J(z,U,se){var ie,G,j=-1,fe=U[1],ae=0,we=7,Me=4;for(fe===0&&(we=138,Me=3),ie=0;ie<=se;ie++)if(G=fe,fe=U[2*(ie+1)+1],!(++ae<we&&G===fe)){if(ae<Me)for(;X(z,G,z.bl_tree),--ae!=0;);else G!==0?(G!==j&&(X(z,G,z.bl_tree),ae--),X(z,x,z.bl_tree),oe(z,ae-3,2)):ae<=10?(X(z,k,z.bl_tree),oe(z,ae-3,3)):(X(z,C,z.bl_tree),oe(z,ae-11,7));j=G,Me=(ae=0)===fe?(we=138,3):G===fe?(we=6,3):(we=7,4)}}l(H);var Z=!1;function I(z,U,se,ie){oe(z,(c<<1)+(ie?1:0),3),(function(G,j,fe,ae){Se(G),le(G,fe),le(G,~fe),i.arraySet(G.pending_buf,G.window,j,fe,G.pending),G.pending+=fe})(z,U,se)}s._tr_init=function(z){Z||((function(){var U,se,ie,G,j,fe=new Array(y+1);for(G=ie=0;G<u-1;G++)for(R[G]=ie,U=0;U<1<<E[G];U++)w[ie++]=G;for(w[ie-1]=G,G=j=0;G<16;G++)for(H[G]=j,U=0;U<1<<T[G];U++)O[j++]=G;for(j>>=7;G<f;G++)for(H[G]=j<<7,U=0;U<1<<T[G]-7;U++)O[256+j++]=G;for(se=0;se<=y;se++)fe[se]=0;for(U=0;U<=143;)P[2*U+1]=8,U++,fe[8]++;for(;U<=255;)P[2*U+1]=9,U++,fe[9]++;for(;U<=279;)P[2*U+1]=7,U++,fe[7]++;for(;U<=287;)P[2*U+1]=8,U++,fe[8]++;for(Le(P,d+1,fe),U=0;U<f;U++)S[2*U+1]=5,S[2*U]=ye(U,5);F=new Q(P,E,h+1,d,y),D=new Q(S,T,0,f,y),te=new Q(new Array(0),A,0,m,b)})(),Z=!0),z.l_desc=new N(z.dyn_ltree,F),z.d_desc=new N(z.dyn_dtree,D),z.bl_desc=new N(z.bl_tree,te),z.bi_buf=0,z.bi_valid=0,xe(z)},s._tr_stored_block=I,s._tr_flush_block=function(z,U,se,ie){var G,j,fe=0;0<z.level?(z.strm.data_type===2&&(z.strm.data_type=(function(ae){var we,Me=4093624447;for(we=0;we<=31;we++,Me>>>=1)if(1&Me&&ae.dyn_ltree[2*we]!==0)return o;if(ae.dyn_ltree[18]!==0||ae.dyn_ltree[20]!==0||ae.dyn_ltree[26]!==0)return a;for(we=32;we<h;we++)if(ae.dyn_ltree[2*we]!==0)return a;return o})(z)),pt(z,z.l_desc),pt(z,z.d_desc),fe=(function(ae){var we;for(_(ae,ae.dyn_ltree,ae.l_desc.max_code),_(ae,ae.dyn_dtree,ae.d_desc.max_code),pt(ae,ae.bl_desc),we=m-1;3<=we&&ae.bl_tree[2*M[we]+1]===0;we--);return ae.opt_len+=3*(we+1)+5+5+4,we})(z),G=z.opt_len+3+7>>>3,(j=z.static_len+3+7>>>3)<=G&&(G=j)):G=j=se+5,se+4<=G&&U!==-1?I(z,U,se,ie):z.strategy===4||j===G?(oe(z,2+(ie?1:0),3),ft(z,P,S)):(oe(z,4+(ie?1:0),3),(function(ae,we,Me,W){var ee;for(oe(ae,we-257,5),oe(ae,Me-1,5),oe(ae,W-4,4),ee=0;ee<W;ee++)oe(ae,ae.bl_tree[2*M[ee]+1],3);J(ae,ae.dyn_ltree,we-1),J(ae,ae.dyn_dtree,Me-1)})(z,z.l_desc.max_code+1,z.d_desc.max_code+1,fe+1),ft(z,z.dyn_ltree,z.dyn_dtree)),xe(z),ie&&Se(z)},s._tr_tally=function(z,U,se){return z.pending_buf[z.d_buf+2*z.last_lit]=U>>>8&255,z.pending_buf[z.d_buf+2*z.last_lit+1]=255&U,z.pending_buf[z.l_buf+z.last_lit]=255&se,z.last_lit++,U===0?z.dyn_ltree[2*se]++:(z.matches++,U--,z.dyn_ltree[2*(w[se]+h+1)]++,z.dyn_dtree[2*B(U)]++),z.last_lit===z.lit_bufsize-1},s._tr_align=function(z){oe(z,2,3),X(z,v,P),(function(U){U.bi_valid===16?(le(U,U.bi_buf),U.bi_buf=0,U.bi_valid=0):8<=U.bi_valid&&(U.pending_buf[U.pending++]=255&U.bi_buf,U.bi_buf>>=8,U.bi_valid-=8)})(z)}},{"../utils/common":41}],53:[function(n,r,s){r.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(n,r,s){(function(i){(function(o,a){if(!o.setImmediate){var l,c,u,h,d=1,f={},m=!1,p=o.document,y=Object.getPrototypeOf&&Object.getPrototypeOf(o);y=y&&y.setTimeout?y:o,l={}.toString.call(o.process)==="[object process]"?function(x){process.nextTick(function(){b(x)})}:(function(){if(o.postMessage&&!o.importScripts){var x=!0,k=o.onmessage;return o.onmessage=function(){x=!1},o.postMessage("","*"),o.onmessage=k,x}})()?(h="setImmediate$"+Math.random()+"$",o.addEventListener?o.addEventListener("message",v,!1):o.attachEvent("onmessage",v),function(x){o.postMessage(h+x,"*")}):o.MessageChannel?((u=new MessageChannel).port1.onmessage=function(x){b(x.data)},function(x){u.port2.postMessage(x)}):p&&"onreadystatechange"in p.createElement("script")?(c=p.documentElement,function(x){var k=p.createElement("script");k.onreadystatechange=function(){b(x),k.onreadystatechange=null,c.removeChild(k),k=null},c.appendChild(k)}):function(x){setTimeout(b,0,x)},y.setImmediate=function(x){typeof x!="function"&&(x=new Function(""+x));for(var k=new Array(arguments.length-1),C=0;C<k.length;C++)k[C]=arguments[C+1];var E={callback:x,args:k};return f[d]=E,l(d),d++},y.clearImmediate=g}function g(x){delete f[x]}function b(x){if(m)setTimeout(b,0,x);else{var k=f[x];if(k){m=!0;try{(function(C){var E=C.callback,T=C.args;switch(T.length){case 0:E();break;case 1:E(T[0]);break;case 2:E(T[0],T[1]);break;case 3:E(T[0],T[1],T[2]);break;default:E.apply(a,T)}})(k)}finally{g(x),m=!1}}}}function v(x){x.source===o&&typeof x.data=="string"&&x.data.indexOf(h)===0&&b(+x.data.slice(h.length))}})(typeof self>"u"?i===void 0?this:i:self)}).call(this,typeof ia<"u"?ia:typeof self<"u"?self:typeof window<"u"?window:{})},{}]},{},[10])(10)})})(Ac)),Ac.exports}var Pk=zk();const Xl=Fy(Pk),js="app.bms.voxelscape.place",ju="application/zip",lo="manifest.json",Ok=256,$k=1e7,Lk=64,Dk=256,Nk=64,Fk=256,Xh="https://big-mesh-studios.github.io/big-mesh-studios/voxelscape/",Ms=["solo","solo:edit","multi","multi:edit"],By=t=>!Array.isArray(t)||t.length!==3?!1:t.every(e=>typeof e=="number"&&Number.isFinite(e)&&Math.abs(e)<=$k),Uy=t=>typeof t=="string"&&t.length>=1&&t.length<=Ok,Hy=t=>t===void 0||Ms.includes(t),Bk=t=>{if(typeof t!="object"||t===null)return!1;const{ref:e,mimeType:n}=t;return typeof n=="string"&&typeof e=="object"&&e!==null&&typeof e.$link=="string"},Uk=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return!Uy(e.name)||typeof e.seed!="number"||!Number.isFinite(e.seed)||!By(e.spawn)||!Hy(e.mode)?!1:$f(e.scripts,Lk,Dk)&&$f(e.models,Nk,Fk)},$f=(t,e,n)=>t===void 0?!0:Array.isArray(t)&&t.length<=e&&t.every(r=>typeof r=="string"&&r.length>=1&&r.length<=n&&!r.startsWith("/")&&!r.includes("..")),Lf=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return e.$type===js&&Uy(e.name)&&typeof e.seed=="number"&&Number.isFinite(e.seed)&&By(e.spawn)&&typeof e.createdAt=="string"&&Bk(e.file)&&Hy(e.mode)};function jy(t){const e=t.toLowerCase().replace(/[^a-z0-9.\-_~]+/g,"-").replace(/-+/g,"-").replace(/^[-.]+|[-.]+$/g,"").slice(0,512);if(e==="")throw new Error(`"${t}" holds no letters or digits to name a place by`);return e}const Hk=(t,e,n)=>({$type:js,name:t.name,seed:t.seed,spawn:t.spawn,createdAt:e,file:n,...t.mode!==void 0?{mode:t.mode}:{}}),Wy=(t,e)=>`at://${t}/${js}/${e}`,Ls=t=>{const e=/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(t);return e===null||e[2]!==js?null:{repo:e[1],rkey:e[3]}},Vy=async t=>{let e;try{e=await Xl.loadAsync(await t.arrayBuffer())}catch{throw new Error("not a zip a place was saved as")}const n=e.file(lo);if(n===null)throw new Error(`no ${lo} at the zip's root`);let r;try{r=JSON.parse(await n.async("text"))}catch{throw new Error(`${lo} is not valid JSON`)}if(!Uk(r))throw new Error(`${lo} is not a place manifest this can open`);for(const s of[...r.scripts??[],...r.models??[]])if(e.file(s)===null)throw new Error(`the manifest names "${s}", which the zip does not hold`);return r},yo="app.bms.stacker.model";function jk(t){const e=t.toLowerCase().replace(/[^a-z0-9.\-_~]+/g,"-").replace(/-+/g,"-").replace(/^[-.]+|[-.]+$/g,"").slice(0,512);if(e==="")throw new Error(`"${t}" holds no letters or digits to name a record by`);return e}function Wk(t){if(typeof t!="object"||t===null)return!1;const{width:e,height:n,depth:r}=t;return typeof e=="number"&&typeof n=="number"&&typeof r=="number"}function Wu(t){if(typeof t!="object"||t===null)return!1;const{ref:e,mimeType:n}=t;return typeof n=="string"&&typeof e=="object"&&e!==null&&typeof e.$link=="string"}function Vu(t){if(typeof t!="object"||t===null)return!1;const e=t;return e.$type===yo&&typeof e.name=="string"&&typeof e.createdAt=="string"&&Wu(e.file)&&Wk(e.dimensions)&&(e.thumbnail===void 0||Wu(e.thumbnail))}function Vk(t){return t.file.ref.$link}function Gk(t){return Wu(t.thumbnail)?t.thumbnail.ref.$link:null}function Gu(t,e,n){return`${t}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(e)}&cid=${encodeURIComponent(n)}`}function Yk(t){const e=/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(t);return e===null||e[2]!==yo?null:{repo:e[1],rkey:e[3]}}const Gy=t=>{const e=Jk,n=globalThis.fetch.bind(globalThis),r=new Map,s=a=>{const l=r.get(a)??e(a);return r.set(a,l),l},i=async a=>{const l=await s(a);return{location:l,client:new Hs({handler:Ro({service:l.service,fetch:n})})}},o=async(a,l)=>{const c=new Hs({handler:Ro({service:a.service,fetch:n})}),u=await Hn(c.get("com.atproto.repo.getRecord",{params:{repo:a.did,collection:js,rkey:l}}));if(!Lf(u.value))throw new Error(`"${l}" is not a place this can open`);return{repo:a.did,rkey:l,record:u.value}};return{async list(a){const{location:l,client:c}=await i(a),u=[];let h;do{const d=await Hn(c.get("com.atproto.repo.listRecords",{params:{repo:l.did,collection:js,cursor:h,limit:100}}));h=d.cursor;for(const{uri:f,value:m}of d.records){if(!Lf(m))continue;const p=f.slice(f.lastIndexOf("/")+1);u.push({repo:l.did,rkey:p,record:m})}}while(h!==void 0);return u},async find(a,l){const c=await s(a);return o(c,jy(l))},async recordAtUri(a){const l=Ls(a);if(l===null)throw new Error(`"${a}" is not a place address`);const c=await s(l.repo);return o(c,l.rkey)},async file(a){const l=await s(a.repo),c=Gu(l.service,a.repo,a.record.file.ref.$link),u=await n(c);if(!u.ok)throw new Error(`the server holding ${a.repo} would not serve "${a.record.name}" (${u.status})`);return u.blob()}}},qk=t=>({async publish(e){const n=t.getClient(),r=t.getRepo();if(n===void 0||r===null)throw new Error("not connected — use /account:login first");const s=await Vy(e),i=await n.uploadBlob(e.type===ju?e:new Blob([e],{type:ju})),o=jy(s.name),a=Hk(s,new Date().toISOString(),i);return await n.putRecord({repo:r,collection:js,rkey:o,record:a}),Wy(r,o)}}),Xk=Yl(),Zk=jo(),Jk=async t=>{const e=t.startsWith("did:")?t:await Xk.resolve(t),n=await Zk.resolve(e);return{did:e,service:ql(n)}},Qk=`// The \`"engine"\` module's ambient types: the one place every function
// \`quickjs-sandbox.ts\` binds is typed, whether or not a given script calls
// it. \`tsc\` sees this file as part of the app's own program, so every demo
// script that imports "engine" type-checks against it directly; \`project.ts\`
// reads it back as text (\`ENGINE_TYPES\`) to feed the editor's language worker
// the same declaration for a creator's own scripts. \`PlaceEditorPanes.tsx\`
// feeds the worker \`effects.ts\`, \`cutscene.ts\`, and \`motion.ts\` too, so
// \`dispatch\`'s payload type resolves the same way there as it does for \`tsc\`.
//
// This file carries no top-level \`import\` of its own — an inline
// \`import("./effects")\` type reaches the same file without one — because a
// top-level import would turn \`declare module "engine"\` below from a fresh
// ambient module declaration into an augmentation of one that would then
// need to already exist elsewhere.
declare module "engine" {
  type EffectTag = import("./effects").EffectTag;
  type ParsedEffect = import("./effects").ParsedEffect;

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
  export function onTick(
    fn: (clockMs: number, eventsJson: string) => void,
  ): void;
  export function onPlan(fn: (contextJson: string) => string): void;
  export const blocks: Record<string, number>;
}
`,Kk=`// The effect vocabulary a place script speaks: what its \`engine.dispatch(tag,
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
`,eS=`// The camera shots a place script plays: an ordered list of moves over the
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
`,tS=`// The motion a place script gives a prop or NPC: a path walked over the shared
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
`,nS=`// The seam a place's creator code runs behind, and the vocabulary its inputs
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
`,Zr="main.ts",rS="engine.d.ts",sS=Qk,O4={[rS]:sS,"effects.ts":Kk,"cutscene.ts":eS,"motion.ts":tS,"sandbox.ts":nS},iS=`// Your place's script. Call engine.onTick with a function and the world will
// call it each step with the shared clock and the events since the last step.
// Call engine.onPlan too and the world calls it once, before generating
// terrain, to stamp roads and houses into the ground: it returns JSON shapes,
// and the block ids it may use are on engine.blocks. engine.endings() returns
// a JSON array of the ending titles this place has already reached. The
// TypeScript types are stripped when the script loads, so the panel's
// squiggles are the whole of the type-check; imports may only reach this
// place's own script files, or "engine". Run /script:demo for a working
// sample.
import * as engine from "engine";

let started = false;

engine.onTick(function tick(clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    engine.dispatch(
      "npc",
      { id: "guide", x: 8, z: 8, name: "Guide" },
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
        { player: event.producer, text: "Hello, traveller." },
      );
    }
  }
});
`,Yu=t=>({manifest:{name:"",seed:t,spawn:[0,0,0],scripts:[Zr],mode:"solo:edit"},scripts:{[Zr]:iS},models:{}}),Ia=async t=>{const e=new Xl,n=Object.keys(t.scripts),r=Object.keys(t.models),s={...t.manifest,scripts:n};r.length>0&&(s.models=r),e.file(lo,JSON.stringify(s));for(const[o,a]of Object.entries(t.scripts))e.file(o,a);for(const[o,a]of Object.entries(t.models))e.file(o,a);const i=await e.generateAsync({type:"arraybuffer"});return new Blob([i],{type:ju})},Zh=async t=>{const e=await Vy(t),n=await Xl.loadAsync(await t.arrayBuffer()),r={};for(const i of e.scripts??[])r[i]=await n.file(i).async("text");const s={};for(const i of e.models??[])s[i]=new Uint8Array(await n.file(i).async("arraybuffer"));return{manifest:e,scripts:r,models:s}},oS=`// The "Get a Snack at 4 AM" demo's place script. This file is the source a
// creator would write: it is imported with \`?raw\` and handed to the sandbox as
// text, never run as part of the world's own bundle.
import * as engine from "engine";

/** One fact the world hands the script, as the script reads it back. */
interface Event {
  kind: string;
  producer: string;
  item?: string;
  entityId?: string;
  npcId?: string;
  option?: number;
  zoneId?: string;
  timerId?: string;
}

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
  const b = engine.blocks;
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

engine.onPlan(function plan(): string {
  const b = engine.blocks;
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
  engine.dispatch("toast", { player: "", text });
}

function narrate(name: string, text: string): void {
  engine.dispatch("narrate", { player: "", name, text });
}

function hold(item: string): void {
  engine.dispatch("item-hold", { player: "", item });
  held = item;
}

function give(item: string, text: string): void {
  engine.dispatch("item-give", { player: "", item, count: 1 });
  hold(item);
  if (text !== "") {
    say(text);
  }
}

function ending(title: string, text: string): void {
  engine.dispatch("ending", { player: "", title, text });
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
const ITEM_MODELS: Record<string, string> = {
  chips: "chips.zip",
  orange: "orange.zip",
  colgate: "colgate.zip",
  cola: "cola.zip",
  egg: "egg.zip",
  friedegg: "friedegg.zip",
  juice: "juice.zip",
  milk: "milk.zip",
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
const FURNITURE: Array<[string, string, number, number, number, string]> = [
  ["bed", "bed.zip", -22, -14, 0.5, "Bed"],
  ["bathtub", "bathtub.zip", -22, 14, 1, "Bathtub"],
  ["sofa", "sofa.zip", 20, -20, 1.2, "Sofa"],
  ["tv", "tv.zip", 26, -20, 1.2, "TV"],
  ["living-table", "table.zip", 20, -8, 1, "Table"],
  ["counter", "counter.zip", 20, 6, 1.5, "Counter"],
  ["stove", "stove.zip", 12, 20, 1.5, "Stove"],
  ["fridge", "fridge.zip", 26, 20, 3, "Fridge"],
  ["kitchen-table", "table.zip", 8, 10, 1, "Table"],
  ["bench", "bench.zip", 44, 12, 0.8, "Bench"],
  ["vending", "vending.zip", 48, -12, 3.5, "Vending Machine"],
  ["manhole", "manhole.zip", 30, -12, 0.2, "Manhole"],
  ["trash", "trash.zip", 46, -8, 1.2, "Trash Can"],
  ["register", "register.zip", 62, 2, 1, "Register"],
  ["store-counter", "counter.zip", 60, 2, 1.5, "Counter"],
  ["shelf-1", "shelf.zip", 68, -6, 3, "Shelf"],
  ["shelf-2", "shelf.zip", 68, 4, 3, "Shelf"],
];

/** Small things lying about: pickups and the plates, none of them solid. */
const PICKUPS: Array<[string, string, number, number, number, number]> = [
  ["chips", "chips.zip", 20, 6, 63.5, 0.6],
  ["orange", "orange.zip", 8, 10, 63, 0.4],
  ["colgate", "colgate.zip", -22, 8, FLOOR, 0.6],
  ["cola", "cola.zip", 24, 18, FLOOR, 0.7],
  ["plate1", "plate.zip", 19, 6, 63.5, 0.15],
  ["plate2", "plate.zip", 21, 6, 63.5, 0.15],
  ["buy-cola", "cola.zip", 66, -6, FLOOR, 0.7],
  ["buy-egg", "egg.zip", 66, -4, FLOOR, 0.4],
  ["buy-juice", "juice.zip", 66, -2, FLOOR, 0.7],
  ["buy-milk", "milk.zip", 66, 0, FLOOR, 0.7],
  // cash: Tix are a dollar, Robux five. Enough here to afford an egg and a
  // full breakfast, with the hundred-cash milestone reachable by picking up all.
  ["tix-1", "tix.zip", -24, -20, FLOOR, 0.3],
  ["tix-2", "tix.zip", -20, -20, FLOOR, 0.3],
  ["tix-3", "tix.zip", -2, -2, FLOOR, 0.3],
  ["tix-4", "tix.zip", 2, -2, FLOOR, 0.3],
  ["tix-5", "tix.zip", -2, 2, FLOOR, 0.3],
  ["tix-6", "tix.zip", 2, 2, FLOOR, 0.3],
  ["tix-7", "tix.zip", -24, 4, FLOOR, 0.3],
  ["tix-8", "tix.zip", -20, 4, FLOOR, 0.3],
  ["tix-9", "tix.zip", -16, 4, FLOOR, 0.3],
  ["tix-10", "tix.zip", -24, 8, FLOOR, 0.3],
  ["tix-11", "tix.zip", 4, -20, FLOOR, 0.3],
  ["tix-12", "tix.zip", 8, -20, FLOOR, 0.3],
  ["tix-13", "tix.zip", 12, -20, FLOOR, 0.3],
  ["tix-14", "tix.zip", 16, -20, FLOOR, 0.3],
  ["robux-1", "robux.zip", -8, 20, FLOOR, 0.3],
  ["robux-2", "robux.zip", -12, 20, FLOOR, 0.3],
  ["robux-3", "robux.zip", 4, -4, FLOOR, 0.3],
  ["robux-4", "robux.zip", 8, -4, FLOOR, 0.3],
  ["robux-5", "robux.zip", 12, -4, FLOOR, 0.3],
  ["robux-6", "robux.zip", 16, -4, FLOOR, 0.3],
  ["robux-7", "robux.zip", 4, 4, FLOOR, 0.3],
  ["robux-8", "robux.zip", 8, 4, FLOOR, 0.3],
  ["robux-9", "robux.zip", 12, 4, FLOOR, 0.3],
  ["robux-10", "robux.zip", 16, 4, FLOOR, 0.3],
];

function open(): void {
  engine.dispatch("time", { seconds: 900, speed: 0 });
  for (const [id, name] of Object.entries(ITEM_NAMES)) {
    engine.dispatch("item-define", { id, name, sprite: "", stackable: true });
  }
  for (const [id, minX, minZ, maxX, maxZ] of ROOMS) {
    engine.dispatch("zone", {
      id,
      name: id,
      min: [minX, FLOOR, minZ],
      max: [maxX, FLOOR + 12, maxZ],
    });
  }
  for (const [id, model, x, z, height, name] of FURNITURE) {
    // Every fixture stands on the floor: grounded by \`heightAt\` it would land
    // on the roof once the house is built, which is what a restart showed.
    engine.dispatch("prop", {
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
    engine.dispatch("prop", {
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
  engine.dispatch("npc", {
    id: DAD,
    x: -20,
    z: 16,
    y: FLOOR,
    name: "Father Figure",
    model: "npc-sable.zip",
    yaw: Math.PI / 2,
  });
  engine.dispatch("npc", {
    id: CASHIER,
    x: 63,
    z: 3,
    y: FLOOR,
    name: "Cashier",
    model: "npc-rook.zip",
    yaw: Math.atan2(60 - 63, 2 - 3),
  });
  // The cashier works for a while, then takes an indefinite break outside. Once
  // he is gone the shelves are unattended and nothing counts as theft.
  engine.dispatch("timer", { id: "cashier-break", afterMs: 120_000 });
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
  engine.dispatch("prop-remove", { id: entityId });
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
  engine.dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  engine.dispatch("prop", {
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
    engine.dispatch("dialog-close", { player: "", npcId: CASHIER });
    say("You do not have enough cash for the " + ITEM_NAMES[good] + ".");
    return;
  }
  cash -= price;
  paid.add(good);
  counterItem = null;
  engine.dispatch("prop-remove", { id: "counter-item" });
  engine.dispatch("dialog-close", { player: "", npcId: CASHIER });
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
    engine.dispatch("prop-remove", { id: propId });
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
  engine.dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  engine.dispatch("prop", {
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
    engine.dispatch("item-take", { player: "", item, count: 1 });
    hold("");
    engine.dispatch("prop", {
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
    engine.dispatch("timer", {
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
    engine.dispatch("prop-remove", { id: "stove-item" });
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
  engine.dispatch("prop", {
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
  engine.dispatch("prop-remove", { id: "stove-item" });
  stoveItem = null;
  stoveCooked = false;
  fireLit = true;
  for (const [index, [x, z, height]] of FIRE_SPOTS.entries()) {
    engine.dispatch("fire", {
      id: "fire-" + index,
      x,
      z,
      y: FLOOR,
      height,
    });
  }
  narrate("You", "The kitchen catches fire!");
  engine.dispatch("timer", { id: "burn", afterMs: 8_000 });
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
  engine.dispatch("npc", {
    id: CASHIER,
    x: 50,
    z: -14,
    y: FLOOR,
    name: "Cashier",
    model: "npc-rook.zip",
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
  engine.dispatch("npc", {
    id: DAD,
    x,
    z,
    y: FLOOR,
    name: "Father Figure",
    model: "npc-sable.zip",
    yaw,
  });
  // The script cannot read the player's exact spot, but it can turn them to
  // face where Dad now stands — the cutscene's whole point.
  engine.dispatch("player-face", { player: "", x, z });
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
    engine.dispatch("prop-remove", { id: "chips" });
    give("chips", "You pick up the bag of chips.");
    return;
  }
  if (entityId === "orange") {
    narrate("You", "This isn't an ordinary orange...");
    ending("Orange", "uh oh.");
    return;
  }
  if (entityId === "colgate") {
    engine.dispatch("prop-remove", { id: "colgate" });
    give("colgate", "You take the colgate.");
    return;
  }
  if (entityId === "cola") {
    engine.dispatch("prop-remove", { id: "cola" });
    give("cola", "You take the bloxy cola.");
    return;
  }
  if (entityId.startsWith("tix")) {
    engine.dispatch("prop-remove", { id: entityId });
    cash += 1;
    say("You pocket a Tix. ($" + cash + ")");
    return;
  }
  if (entityId.startsWith("robux")) {
    engine.dispatch("prop-remove", { id: entityId });
    cash += 5;
    say("You pocket some Robux. ($" + cash + ")");
    return;
  }
  if (entityId === "vending") {
    if (item === "cola") {
      engine.dispatch("item-take", { player: "", item: "cola", count: 1 });
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
  engine.dispatch("item-take", { player: "", item, count: 1 });
  hold("");
  narrate("You", text);
}

function usedItem(item: string): void {
  if (item === "chips") {
    engine.dispatch("item-take", { player: "", item, count: 1 });
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
    engine.dispatch("dialog", {
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
    engine.dispatch("dialog", {
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
  engine.dispatch("dialog", {
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
      engine.dispatch("dialog-close", { player, npcId: CASHIER });
    }
    return;
  }
  if (option === 0) {
    say("The cashier points at the shelves on the right.");
  }
  engine.dispatch("dialog-close", { player, npcId: CASHIER });
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

engine.onTick(function tick(_clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    open();
  }
  const events = JSON.parse(eventsJson) as Event[];
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
`,aS=`// The "Late to School" demo's place script. This file is the source a creator
// would write: it is imported with \`?raw\` and handed to the sandbox as text,
// never run as part of the world's own bundle.
import * as engine from "engine";

/** One fact the world hands the script, as the script reads it back. */
interface Event {
  kind: string;
  producer: string;
  item?: string;
  entityId?: string;
  npcId?: string;
  option?: number;
  zoneId?: string;
  timerId?: string;
}

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
  engine.dispatch("toast", { player: "", text });
}

function narrate(name: string, text: string): void {
  engine.dispatch("narrate", { player: "", name, text });
}

function hold(item: string): void {
  engine.dispatch("item-hold", { player: "", item });
  held = item;
}

function give(item: string, text: string): void {
  engine.dispatch("item-give", { player: "", item, count: 1 });
  hold(item);
  if (text !== "") {
    say(text);
  }
}

function take(item: string, count: number): void {
  engine.dispatch("item-take", { player: "", item, count });
  if (held === item) {
    hold("");
  }
}

function ending(title: string, text: string): void {
  engine.dispatch("ending", { player: "", title, text });
}

function timer(id: string, afterMs: number): void {
  engine.dispatch("timer", { id, afterMs });
}

function dialog(npcId: string, prompt: string, options: string[]): void {
  engine.dispatch("dialog", { player: "", npcId, prompt, options });
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
  const b = engine.blocks;
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

engine.onPlan(function plan(): string {
  const b = engine.blocks;
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

function prop(
  id: string,
  model: string,
  x: number,
  z: number,
  height: number,
  name: string,
  solid: boolean,
): void {
  engine.dispatch("prop", { id, model, x, z, y: FLOOR, name, height, solid });
}

function pickup(
  id: string,
  model: string,
  name: string,
  x: number,
  z: number,
  y: number,
  height: number,
): void {
  engine.dispatch("prop", { id, model, x, z, y, name, height, solid: false });
}

function npc(
  id: string,
  x: number,
  z: number,
  name: string,
  model: string,
  yaw: number,
): void {
  engine.dispatch("npc", { id, x, z, y: FLOOR, name, model, yaw });
}

/** Places the fixtures, pickups, NPCs, and zones the world opens with. */
function open(): void {
  engine.dispatch("time", { seconds: 60, speed: 0 });
  for (const [id, name] of Object.entries(ITEM_NAMES)) {
    engine.dispatch("item-define", { id, name, sprite: "", stackable: true });
  }
  for (const [id, minX, minZ, maxX, maxZ] of ZONES) {
    engine.dispatch("zone", {
      id,
      name: id,
      min: [minX, FLOOR, minZ],
      max: [maxX, FLOOR + 12, maxZ],
    });
  }

  // The player's house: somewhere to sleep, a phone, and the day's things.
  prop("bed", "bed.zip", -20, 22, 1.2, "Bed", true);
  prop("phone", "phone.zip", -2, 10, 1.5, "Phone", false);
  prop("mirror", "mirror.zip", -20, 6, 1.6, "Mirror", false);
  prop("bookshelf", "bookshelf.zip", -6, 26, 2, "Bookshelf", true);
  prop("player-counter", "counter.zip", -2, 24, 1.5, "Counter", true);
  prop("player-fridge", "fridge.zip", -6, 24, 3, "Fridge", true);
  prop("player-tv", "tv.zip", -16, 24, 1.4, "TV", true);
  prop("player-sofa", "sofa.zip", -18, 18, 1.2, "Sofa", true);
  prop("player-door", "door.zip", -6, 4.5, 2, "Door", false);
  prop("locked-door", "door.zip", -2, 26, 2, "Locked Room", false);
  prop("mailbox", "mailbox.zip", -12, 0, 1.4, "Mailbox", false);
  pickup(
    "historybook",
    "historybook.zip",
    "History Book",
    -4,
    26,
    FLOOR + 1.5,
    0.4,
  );

  // Laugh's house: the fridge, the bed, and the present.
  prop("laugh-fridge", "fridge.zip", 24, 24, 3, "Fridge", true);
  prop("laugh-bed", "bed.zip", 6, 24, 1.2, "Bed", true);
  prop("chair", "chair.zip", 10, 24, 1, "Chair", false);
  prop("laugh-door", "door.zip", 8, 4.5, 2, "Door", false);
  prop("alex-door", "door.zip", 22, 4.5, 2, "Door", false);
  prop("james-door", "door.zip", 36, 4.5, 2, "Door", false);

  // The street's furniture.
  prop(
    "lemonade-stand",
    "lemonade-stand.zip",
    -30,
    2,
    1.6,
    "Lemonade Stand",
    true,
  );
  prop("bus-stop", "bus-stop.zip", 60, 0, 1.6, "Bus Stop", false);
  prop("flower", "flower.zip", 80, -2, 1, "Flower", false);
  prop("gate", "gate.zip", 150, -2, 2, "Gate", true);

  // Bean Bros.: a counter, shelves, and the slushie machine.
  prop("bean-counter", "counter.zip", 8, -16, 1.5, "Counter", true);
  prop("bean-shelf-1", "shelf.zip", 2, -14, 2, "Shelf", true);
  prop("bean-shelf-2", "shelf.zip", 14, -14, 2, "Shelf", true);
  prop(
    "slushie-machine",
    "slushie-machine.zip",
    12,
    -16,
    2.2,
    "Slushie Machine",
    true,
  );
  prop("bean-door", "door.zip", 8, -6.5, 2, "Door", false);

  // The arcade: cabinets, the boarded machine, and a dumpster outside.
  prop("arcade-1", "arcade.zip", 20, -16, 2.4, "Arcade Machine", true);
  prop("arcade-2", "arcade.zip", 26, -16, 2.4, "Arcade Machine", true);
  prop(
    "broken-machine",
    "boarded-machine.zip",
    23,
    -8,
    2.4,
    "Broken Machine",
    true,
  );
  prop("token-atm", "vending.zip", 46, -16, 2.2, "Token ATM", true);
  prop("dumpster", "dumpster.zip", 30, -4, 1.8, "Dumpster", true);
  prop("arcade-door", "door.zip", 22, -6.5, 2, "Door", false);
  prop("bench", "bench.zip", 50, -4, 1, "Bench", true);

  // The school: desks, lockers, cafeteria tables, and the fighting poster.
  prop("school-door", "door.zip", 46, -2.5, 2, "Door", false);
  prop("classroom-door", "door.zip", 82, -20, 2, "Classroom", false);
  prop("desk-1", "desk.zip", 76, -30, 1.2, "Desk", true);
  prop("desk-2", "desk.zip", 82, -30, 1.2, "Desk", true);
  prop("desk-3", "desk.zip", 88, -30, 1.2, "Desk", true);
  prop("chair-1", "chair.zip", 76, -26, 1, "Chair", false);
  prop("chair-2", "chair.zip", 82, -26, 1, "Chair", false);
  prop("chair-3", "chair.zip", 88, -26, 1, "Chair", false);
  prop("locker-1", "locker.zip", 72, -34, 2, "Locker", true);
  prop("locker-2", "locker.zip", 76, -34, 2, "Locker", true);
  prop("cafeteria-table-1", "cafeteria-table.zip", 98, -30, 1.2, "Table", true);
  prop(
    "cafeteria-table-2",
    "cafeteria-table.zip",
    106,
    -30,
    1.2,
    "Table",
    true,
  );
  prop("cafeteria-plate", "plate.zip", 102, -26, 0.15, "Plate", false);
  prop(
    "fighting-poster",
    "poster.zip",
    94,
    -20,
    1.4,
    "Fighting Contest",
    false,
  );

  // The finale: the Dimensionator at the arcade, and the corrupted dimension's
  // four house buttons, gate, history book, and portal, far to the south.
  prop("dimensionator", "arcade.zip", 40, -10, 2.4, "Dimensionator", false);
  prop(
    "corrupt-button-blue",
    "poster.zip",
    -12,
    240,
    1.4,
    "Blue Button",
    false,
  );
  prop("corrupt-button-red", "poster.zip", 16, 240, 1.4, "Red Button", false);
  prop(
    "corrupt-button-green",
    "poster.zip",
    44,
    240,
    1.4,
    "Green Button",
    false,
  );
  prop(
    "corrupt-button-purple",
    "poster.zip",
    72,
    240,
    1.4,
    "Purple Button",
    false,
  );
  prop("corrupt-gate", "gate.zip", 150, 236, 2, "Gate", true);
  pickup(
    "corrupt-book",
    "historybook.zip",
    "History Book",
    164,
    236,
    FLOOR,
    0.4,
  );
  prop("corrupt-portal", "gate.zip", 200, 236, 2, "Portal", false);

  // The pickups the day begins with.
  pickup("plush", "plush.zip", "Plush", -22, 18, FLOOR, 0.6);
  pickup("banana", "banana.zip", "Banana", -20, -6, FLOOR, 0.4);
  pickup("chips", "chips.zip", "Chips", -4, 22, FLOOR + 1.5, 0.5);
  pickup("key", "key.zip", "Key", -22, 10, FLOOR, 0.3);
  pickup("matches", "matches.zip", "Matches", 20, -20, FLOOR, 0.3);
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
    pickup(\`cash-\${index + 1}\`, "tix.zip", "Cash", x, z, FLOOR, 0.3);
  }

  npc(LITTLE_BRO, -16, 20, "Little Brother", "npc-littlebro.zip", 0);
  npc(LAUGH, 8, 20, "Laugh", "npc-laugh.zip", Math.PI);
  npc(ALEX, 22, 20, "Alex", "npc-alex.zip", Math.PI);
  npc(JAMES, 36, 20, "James", "npc-james.zip", Math.PI);
  npc(BRIT, 6, -18, "Brit", "npc-brit.zip", 0);
  npc(BRETT, 10, -18, "Brett", "npc-brett.zip", 0);
  npc(BRAD, 24, -18, "Brad", "npc-brad.zip", 0);
  npc(HOMELESS, -6, 2, "Homeless Kid", "npc-homeless.zip", Math.PI);
  npc(LEMONADE, -30, 4, "Lemonade Salesperson", "npc-lemonade.zip", 0);
  npc(SLEEPA, 50, -6, "Sleepa", "npc-sleepa.zip", Math.PI / 2);
  npc(BULLY, 80, -20, "Bully", "npc-bully.zip", Math.PI / 2);
  npc(NERD, 84, -20, "Nerd", "npc-nerd.zip", Math.PI / 2);
  npc(TEACHER, 80, -32, "Teacher", "npc-teacher.zip", Math.PI);
  npc(POTHEAD, 100, -22, "Pot Head", "npc-pothead.zip", Math.PI / 2);
  npc(CHAMP, 106, -34, "Champ", "npc-champ.zip", Math.PI);
  npc(SANTA, 120, -10, "Santa Claus", "npc-santa.zip", Math.PI);
  npc(OBBY, 24, -10, "Obby Master", "npc-obby.zip", 0);

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
  npc(JAMES, -12, 2, "James", "npc-james.zip", Math.PI);
  narrate(
    "James",
    "I've been expecting you. Your history book is the key to the perfect ending. Go to the arcade — something is waiting outside.",
  );
}

/** Opens the Dimensionator and drops the party into the corrupted dimension. */
function startCorruption(): void {
  flags.portalOpen = true;
  engine.dispatch("explosion", { id: "portal-boom", x: 40, z: -10, radius: 5 });
  narrate("Laugh", "Do you realize what you have done?");
  narrate(
    "James",
    "It's the only way to stop the Anomaly. Find your history book, then run for the portal.",
  );
  engine.dispatch("player-place", { player: "", x: 0, z: 236, y: FLOOR });
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
  engine.dispatch("prop-remove", { id: "corrupt-gate" });
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
    engine.dispatch("explosion", {
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
    engine.dispatch("prop-remove", { id: "corrupt-book" });
    flags.gotBook = true;
    give(
      "roaster",
      "You grab the history book. The Anomaly is coming — run to the portal!",
    );
    npc(ANOMALY, 92, 236, "The Anomaly", "npc-anomaly.zip", Math.PI);
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
    engine.dispatch("player-place", { player: "", x: 280, z: 236, y: FLOOR });
    npc(ANOMALY, 284, 236, "The Anomaly", "npc-anomaly.zip", Math.PI);
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
    engine.dispatch("player-speed", { player: "", multiplier: 0.2 });
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
    engine.dispatch("prop-remove", { id: entityId });
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
    engine.dispatch("prop-remove", { id: entityId });
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
    engine.dispatch("player-jump", { player: "", multiplier: 1.6 });
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
  engine.dispatch("dialog-close", { player, npcId });
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

engine.onTick(function tick(_clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    collected = JSON.parse(engine.endings()) as string[];
    open();
  }
  const events = JSON.parse(eventsJson) as Event[];
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
`,lS=`// The "Zombies" demo's place script. This file is the source a creator would
// write: it is imported with \`?raw\` and handed to the sandbox as text, never
// run as part of the world's own bundle. A whole population of zombies
// materializes procedurally around wherever players explore and fights back
// with a sword the player starts holding.
//
// \`zombie\` is imported rather than named as a bare string, so the panel
// types it against the model this place actually carries (ADR 0046) — this
// demo's own manifest lists \`zombie.zip\` among its models, which is what
// makes the specifier below resolve at all.
import zombie from "zombie" with { type: "model" };
import * as engine from "engine";

const GUIDE = "guide";
const SWORD = "sword";

/** The place model file the zombie's own drawing is bundled under — the
 * effects vocabulary still takes a model by its file name, not by the bare
 * specifier an import resolves against, so the extension is put back on. */
const ZOMBIE_MODEL_FILE = zombie.name + ".zip";

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
  id: string;
  x: number;
  z: number;
  yaw: number;
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

/**
 * Sends a zombie's current position to the host — spawning it fresh, or
 * saying where it now stands after a move. \`live\` decides whether the
 * position is also broadcast to other peers; the host still applies it to
 * this peer's own copy either way, which is what keeps the owner's own view
 * smooth even on a tick that skips the broadcast.
 */
function announce(z: Zombie, live: boolean): void {
  const y = engine.heightAt(z.x, z.z);
  engine.dispatch("npc", {
    id: z.id,
    x: z.x,
    y,
    z: z.z,
    name: "Zombie",
    model: ZOMBIE_MODEL_FILE,
    yaw: z.yaw,
    live,
  });
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
      const z: Zombie = {
        id: spawn.id,
        x: pose.x,
        z: pose.z,
        yaw: pose.yaw,
        hp: ZOMBIE_MAX_HP,
        lastAttackAt: 0,
        state: "wander",
        ownerDid: "",
        wanderHeading: 0,
        wanderUntil: 0,
        lastBroadcastAt: engine.now(),
        cellKey: key,
        homeX: pose.x,
        homeZ: pose.z,
      };
      zombies.set(spawn.id, z);
      announce(z, true);
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
      engine.dispatch("npc-remove", { id });
    }
  }
}

/** Whether stepping from the current ground to (x, z) is walkable: not too
 * steep a rise, and neither solid nor water at body height once there. */
function walkable(fromX: number, fromZ: number, x: number, z: number): boolean {
  const ground = engine.heightAt(x, z);
  if (Math.abs(ground - engine.heightAt(fromX, fromZ)) > STEP_LIMIT) {
    return false;
  }
  const y = ground + BODY_Y;
  return !engine.solidAt(x, y, z) && !engine.waterAt(x, y, z);
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
function pickWanderHeading(z: Zombie): number {
  if (dist2D(z.x, z.z, z.homeX, z.homeZ) <= WANDER_LEASH_RADIUS) {
    return Math.random() * Math.PI * 2;
  }
  const towardHome = Math.atan2(z.homeX - z.x, z.homeZ - z.z);
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

  let nearest = players[0];
  let nearestDistance = dist2D(z.x, z.z, nearest.x, nearest.z);
  for (let i = 1; i < players.length; i++) {
    const p = players[i];
    const d = dist2D(z.x, z.z, p.x, p.z);
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
      const currentDistance = dist2D(z.x, z.z, current.x, current.z);
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
    z.yaw = Math.atan2(owner.x - z.x, owner.z - z.z);
    // There's a nearest range as well as a furthest one: nothing stops a
    // player walking straight into it mid-fight otherwise, and standing
    // inside its own model's geometry is indistinguishable from it not
    // being there at all. Backing off is silent — no re-dispatch here — the
    // tick's own \`announce\` below still sends wherever it ends up.
    if (ownerDistance < MIN_ATTACK_DISTANCE) {
      const away = z.yaw + Math.PI;
      const moved = moveStep(z.x, z.z, away, ZOMBIE_SPEED, TICK_MS);
      z.x = moved.x;
      z.z = moved.z;
    }
    if (now - z.lastAttackAt >= ATTACK_INTERVAL_MS) {
      z.lastAttackAt = now;
      engine.dispatch("player-damage", {
        player: owner.did,
        amount: ZOMBIE_DAMAGE,
        source: z.id,
      });
    }
  } else if (state === "chase") {
    z.yaw = Math.atan2(owner.x - z.x, owner.z - z.z);
    const moved = moveStep(z.x, z.z, z.yaw, ZOMBIE_SPEED, TICK_MS);
    z.x = moved.x;
    z.z = moved.z;
  } else {
    if (now >= z.wanderUntil) {
      z.wanderHeading = pickWanderHeading(z);
      z.wanderUntil = now + WANDER_MIN_MS + Math.random() * WANDER_SPREAD_MS;
    }
    // The leash is enforced on every step, not only when a heading is
    // picked — a heading chosen while still within it can point outward, and
    // only checking at the next pick would let a full multi-second leg carry
    // it well past the leash before anything pulled it back.
    const beyondLeash =
      dist2D(z.x, z.z, z.homeX, z.homeZ) > WANDER_LEASH_RADIUS;
    const heading = beyondLeash
      ? Math.atan2(z.homeX - z.x, z.homeZ - z.z)
      : z.wanderHeading;
    const moved = moveStep(z.x, z.z, heading, ZOMBIE_WANDER_SPEED, TICK_MS);
    z.x = moved.x;
    z.z = moved.z;
    z.yaw = heading;
    if (moved.blocked) {
      z.wanderHeading = pickWanderHeading(z);
      z.wanderUntil = now + 500 + Math.random() * 1000;
    }
  }

  const dueToBroadcast =
    state !== "wander" ||
    now - z.lastBroadcastAt >= WANDER_BROADCAST_INTERVAL_MS;
  if (dueToBroadcast) {
    z.lastBroadcastAt = now;
  }
  announce(z, dueToBroadcast);
}

/** Shoves a zombie away from wherever it was struck from, unless the shove
 * would land it in a wall or water, which would only stick it there. */
function knockback(z: Zombie, attacker: { x: number; z: number }): void {
  const dx = z.x - attacker.x;
  const dz = z.z - attacker.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-6) {
    return;
  }
  const push = Math.min(KNOCKBACK, distance);
  const nx = z.x + (dx / distance) * push;
  const nz = z.z + (dz / distance) * push;
  if (walkable(z.x, z.z, nx, nz)) {
    z.x = nx;
    z.z = nz;
  }
}

function armTick(): void {
  engine.dispatch("timer", { id: "zombie-tick", afterMs: TICK_MS });
}

engine.onTick(function tick(_clockMs: number, eventsJson: string): void {
  const now = engine.now();
  if (!started) {
    started = true;
    engine.dispatch("npc", { id: GUIDE, x: 8, z: 8, name: "Guide" });
    engine.log("your place started");
    // The sword is given and equipped once, for good: this place has nothing
    // else to hold, and a bare-handed touch stays how every other entity is
    // greeted.
    engine.dispatch("item-define", {
      id: SWORD,
      name: "Sword",
      sprite: "",
      stackable: false,
    });
    engine.dispatch("item-give", { player: "", item: SWORD, count: 1 });
    engine.dispatch("item-hold", { player: "", item: SWORD });
    armTick();
  }

  const players = JSON.parse(engine.players()) as Player[];
  const events = JSON.parse(eventsJson) as Array<{
    kind: string;
    producer: string;
    npcId?: string;
    entityId?: string;
    item?: string;
    timerId?: string;
    amount?: number;
    attackerX?: number;
    attackerZ?: number;
  }>;

  let ticked = false;
  for (const e of events) {
    if (
      (e.kind === "npc-talk" && e.npcId === GUIDE) ||
      (e.kind === "entity-used" && e.entityId === GUIDE)
    ) {
      engine.dispatch("toast", {
        player: e.producer,
        text: "Hello, traveller.",
      });
    } else if (e.kind === "entity-used" && e.entityId !== undefined) {
      // A bare touch only ever gets a rise out of it — killing one takes an
      // actual swing, over the sword's own reach and reported strike.
      if (zombies.has(e.entityId)) {
        engine.dispatch("toast", {
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
        knockback(target, {
          x: e.attackerX ?? target.x,
          z: e.attackerZ ?? target.z,
        });
        target.hp -= e.amount;
        if (target.hp <= 0) {
          zombies.delete(target.id);
          deadIds.add(target.id);
          engine.dispatch("npc-die", { id: target.id });
          engine.dispatch("toast", {
            player: e.producer,
            text: "The zombie falls.",
          });
        } else {
          announce(target, true);
          engine.dispatch("toast", {
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
`,cS=`// The "Don't Poop Yourself at School" demo's place script — a faithful port
// of the Roblox obby. The course runs west → east through the school building:
//
//   Yard → Lobby → Stairs → Hallway → Cafeteria → Gym → Library → Mud Room
//   → Final Pads → Bathroom
//
// New sections use quicksand (the muddy room that slows the player) and
// conveyor belts (the cafeteria lunch trays that carry the player forward).
//
// ALL voxel coordinates × 2 = world coordinates. The plan handler registered
// with engine.onPlan takes voxel coordinates; zones, props, and fields take
// world coordinates.
import * as engine from "engine";

/** One fact the world hands the script, as the script reads it back. */
interface Event {
  kind: string;
  producer: string;
  item?: string;
  entityId?: string;
  npcId?: string;
  option?: number;
  zoneId?: string;
  timerId?: string;
  cause?: string;
}

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
  engine.dispatch("toast", { player: "", text });
}
function narrate(name: string, text: string): void {
  engine.dispatch("narrate", { player: "", name, text });
}
function hold(item: string): void {
  engine.dispatch("item-hold", { player: "", item });
  held = item;
}
function give(item: string, text: string): void {
  engine.dispatch("item-give", { player: "", item, count: 1 });
  hold(item);
  if (text !== "") {
    say(text);
  }
}
function take(item: string, count: number): void {
  engine.dispatch("item-take", { player: "", item, count });
  if (held === item) {
    hold("");
  }
}
function ending(title: string, text: string): void {
  flags.finished = true;
  engine.dispatch("ending", { player: "", title, text });
}
function showBladder(): void {
  engine.dispatch("hud", {
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
  engine.dispatch("timer", { id: "bladder", afterMs: BLADDER_STEP_MS });
}
function showCheckpoint(name: string): void {
  engine.dispatch("hud", {
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

engine.onPlan(function plan(): string {
  const b = engine.blocks;
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
  engine.dispatch("time", { seconds: 480, speed: 0 });

  engine.dispatch("item-define", {
    id: "soap",
    name: "Soap",
    sprite: "",
    stackable: false,
  });
  engine.dispatch("item-define", {
    id: "hall-pass",
    name: "Hall Pass",
    sprite: "",
    stackable: false,
  });
  engine.dispatch("item-define", {
    id: "toilet-paper",
    name: "Toilet Paper",
    sprite: "",
    stackable: false,
  });

  for (const [id, minX, minY, minZ, maxX, maxY, maxZ] of ZONES) {
    engine.dispatch("zone", {
      id,
      name: id,
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    });
  }

  // Quicksand over the Mud Room floor (world z=220..244, world y=218..226)
  engine.dispatch("field", {
    id: "mud",
    kind: "quicksand",
    min: [-14, 218, 220],
    max: [14, 226, 244],
    speedScale: 0.25,
    sink: 2,
  });

  // Soap pickup on lobby floor (world y=202)
  engine.dispatch("prop", {
    id: "soap",
    model: "soap.zip",
    x: -10,
    z: -50,
    y: LOBBY,
    name: "Soap",
    height: 0.4,
    solid: false,
  });

  // Wet-floor sign in the hallway (world z=48 = roughly mid-hallway)
  engine.dispatch("prop", {
    id: "wet-floor",
    model: "wet-floor.zip",
    x: 3,
    z: 48,
    y: 218,
    name: "Wet Floor",
    height: 1.5,
    solid: false,
    hazard: true,
  });

  // RESTROOM Sign above the bathroom doorway (world z=268, y=225)
  engine.dispatch("prop", {
    id: "restroom-sign",
    model: "platform.zip",
    x: 0,
    z: 268,
    y: 225,
    name: "RESTROOM Sign",
    height: 1.2,
    solid: false,
  });

  // First toilet roll tumbling down the stairs (world z=14, y=220)
  engine.dispatch("prop", {
    id: "toilet-roll",
    model: "toilet-roll.zip",
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
  engine.dispatch("prop", {
    id: "toilet-roll-2",
    model: "toilet-roll.zip",
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
  engine.dispatch("prop", {
    id: "moving-plank",
    model: "platform.zip",
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
  engine.dispatch("prop", {
    id: "tray-a",
    model: "platform.zip",
    x: 0,
    z: 70,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });
  engine.dispatch("prop", {
    id: "tray-b",
    model: "platform.zip",
    x: 0,
    z: 86,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });
  engine.dispatch("prop", {
    id: "tray-c",
    model: "platform.zip",
    x: 0,
    z: 102,
    y: 218,
    name: "Lunch Tray",
    height: 0.5,
    solid: true,
    conveyor: { vx: 0, vz: 6 },
  });

  // Gym: side-sliding platform (world z=130)
  engine.dispatch("prop", {
    id: "gym-slide",
    model: "platform.zip",
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
  engine.dispatch("prop", {
    id: "turntable",
    model: "platform.zip",
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
  engine.dispatch("prop", {
    id: "gym-bounce",
    model: "platform.zip",
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
  engine.dispatch("prop", {
    id: "globe",
    model: "toilet-roll.zip",
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
  engine.dispatch("npc", {
    id: JANITOR,
    x: -18,
    z: -50,
    y: LOBBY,
    name: "Janitor",
    model: "npc-sable.zip",
    yaw: Math.PI / 2,
  });
  engine.dispatch("npc", {
    id: BULLY,
    x: 0,
    z: 40,
    y: 218,
    name: "Bully",
    model: "npc-bully.zip",
    yaw: Math.PI,
  });
  engine.dispatch("npc", {
    id: PRINCIPAL,
    x: -14,
    z: 88,
    y: 218,
    name: "Principal",
    model: "npc-brad.zip",
    yaw: Math.PI / 2,
  });
  engine.dispatch("npc", {
    id: TEACHER,
    x: 0,
    z: 278,
    y: 220,
    name: "Teacher",
    model: "npc-teacher.zip",
    yaw: Math.PI,
  });

  engine.dispatch("player-place", { player: "", x: 0, z: -50, y: LOBBY });
  engine.dispatch("void", { y: VOID_Y });

  showBladder();
  engine.dispatch("timer", { id: "bladder", afterMs: BLADDER_STEP_MS });

  engine.dispatch("cutscene", {
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
  engine.dispatch("player-jump", { player: "", multiplier: 1.5 });
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
    engine.dispatch("prop-remove", { id: "soap" });
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
    engine.dispatch("player-checkpoint", {
      player: "",
      x: spot[0],
      z: spot[1],
      y: spot[2],
    });
    showCheckpoint(zone);
  }

  if (zone === STAIRS && flags.stairBeat !== true) {
    flags.stairBeat = true;
    engine.dispatch("camera", {
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
    engine.dispatch("camera", {
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
    engine.dispatch("camera", {
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
    engine.dispatch("camera", {
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
    engine.dispatch("player-kill", { player: "", cause: "wet-floor" });
    return;
  }
  if (entityId === "globe") {
    engine.dispatch("player-kill", { player: "", cause: "globe" });
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
engine.onTick(function tick(_clockMs: number, eventsJson: string): void {
  if (!started) {
    started = true;
    open();
  }
  const events = JSON.parse(eventsJson) as Event[];
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
`,uS={id:"get-a-snack-at-4-am",manifest:{name:"Get a Snack at 4 AM",seed:4004,spawn:[-14,0,-12],models:["bed.zip","bathtub.zip","sofa.zip","tv.zip","table.zip","counter.zip","stove.zip","fridge.zip","bench.zip","manhole.zip","trash.zip","register.zip","shelf.zip","vending.zip","chips.zip","orange.zip","colgate.zip","cola.zip","egg.zip","friedegg.zip","juice.zip","milk.zip","tix.zip","robux.zip","plate.zip"]},scripts:{[Zr]:oS}},hS=["npc-laugh.zip","npc-alex.zip","npc-james.zip","npc-bully.zip","npc-nerd.zip","npc-homeless.zip","npc-brit.zip","npc-brett.zip","npc-brad.zip","npc-sleepa.zip","npc-champ.zip","npc-teacher.zip","npc-lemonade.zip","npc-pothead.zip","npc-santa.zip","npc-obby.zip","npc-littlebro.zip","npc-anomaly.zip","bed.zip","phone.zip","mirror.zip","bookshelf.zip","counter.zip","fridge.zip","tv.zip","sofa.zip","door.zip","mailbox.zip","lemonade-stand.zip","bus-stop.zip","flower.zip","gate.zip","shelf.zip","vending.zip","slushie-machine.zip","arcade.zip","boarded-machine.zip","dumpster.zip","bench.zip","desk.zip","chair.zip","locker.zip","cafeteria-table.zip","plate.zip","poster.zip","plush.zip","banana.zip","chips.zip","key.zip","matches.zip","slushie.zip","pizza.zip","hotdog.zip","salad.zip","taco.zip","historybook.zip","roaster.zip","hat.zip","lemonade.zip","foodbag.zip","bean.zip","cola.zip","tix.zip"],dS={id:"late-to-school",manifest:{name:"Late to School",seed:2546,spawn:[-12,0,16],models:hS},scripts:{[Zr]:aS}},fS={id:"zombies",manifest:{name:"Zombies",seed:90210,spawn:[0,0,0],mode:"multi",models:["zombie.zip"]},scripts:{[Zr]:lS}},pS=["soap.zip","wet-floor.zip","platform.zip","toilet-roll.zip","npc-sable.zip","npc-bully.zip","npc-brad.zip","npc-teacher.zip"],mS={id:"dont-poop-yourself-at-school",manifest:{name:"Don't Poop Yourself at School",seed:4202,spawn:[0,0,0],models:pS},scripts:{[Zr]:cS}},qu=[uS,dS,fS,mS],Xu=t=>qu.find(e=>e.id===t)??null,Yy=async t=>{const e={};for(const n of t.manifest.models??[])try{const r=await fetch(`/big-mesh-studios/voxelscape/models/${n}`);r.ok&&(e[n]=new Uint8Array(await r.arrayBuffer()))}catch{}return{manifest:{...t.manifest,scripts:Object.keys(t.scripts)},scripts:t.scripts,models:e}},gS="https://esm.sh/typescript@5.9.3",yS="typescript";let Df;function bS(){return Df??=typeof globalThis<"u"&&"process"in globalThis?import(yS):import(gS).then(t=>t.default??t),Df}var sn=Uint8Array,fi=Uint16Array,vS=Int32Array,qy=new sn([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),Xy=new sn([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),wS=new sn([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Zy=function(t,e){for(var n=new fi(31),r=0;r<31;++r)n[r]=e+=1<<t[r-1];for(var s=new vS(n[30]),r=1;r<30;++r)for(var i=n[r];i<n[r+1];++i)s[i]=i-n[r]<<5|r;return{b:n,r:s}},Jy=Zy(qy,2),Qy=Jy.b,_S=Jy.r;Qy[28]=258,_S[258]=28;var xS=Zy(Xy,0),kS=xS.b,Zu=new fi(32768);for(var vt=0;vt<32768;++vt){var es=(vt&43690)>>1|(vt&21845)<<1;es=(es&52428)>>2|(es&13107)<<2,es=(es&61680)>>4|(es&3855)<<4,Zu[vt]=((es&65280)>>8|(es&255)<<8)>>1}var bo=(function(t,e,n){for(var r=t.length,s=0,i=new fi(e);s<r;++s)t[s]&&++i[t[s]-1];var o=new fi(e);for(s=1;s<e;++s)o[s]=o[s-1]+i[s-1]<<1;var a;if(n){a=new fi(1<<e);var l=15-e;for(s=0;s<r;++s)if(t[s])for(var c=s<<4|t[s],u=e-t[s],h=o[t[s]-1]++<<u,d=h|(1<<u)-1;h<=d;++h)a[Zu[h]>>l]=c}else for(a=new fi(r),s=0;s<r;++s)t[s]&&(a[s]=Zu[o[t[s]-1]++]>>15-t[s]);return a}),Wo=new sn(288);for(var vt=0;vt<144;++vt)Wo[vt]=8;for(var vt=144;vt<256;++vt)Wo[vt]=9;for(var vt=256;vt<280;++vt)Wo[vt]=7;for(var vt=280;vt<288;++vt)Wo[vt]=8;var Ky=new sn(32);for(var vt=0;vt<32;++vt)Ky[vt]=5;var SS=bo(Wo,9,1),ES=bo(Ky,5,1),Tc=function(t){for(var e=t[0],n=1;n<t.length;++n)t[n]>e&&(e=t[n]);return e},Jn=function(t,e,n){var r=e/8|0;return(t[r]|t[r+1]<<8)>>(e&7)&n},Cc=function(t,e){var n=e/8|0;return(t[n]|t[n+1]<<8|t[n+2]<<16)>>(e&7)},AS=function(t){return(t+7)/8|0},za=function(t,e,n){return(e==null||e<0)&&(e=0),(n==null||n>t.length)&&(n=t.length),new sn(t.subarray(e,n))},TS=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],mn=function(t,e,n){var r=new Error(e||TS[t]);if(r.code=t,Error.captureStackTrace&&Error.captureStackTrace(r,mn),!n)throw r;return r},e0=function(t,e,n,r){var s=t.length,i=0;if(!s||e.f&&!e.l)return n||new sn(0);var o=!n,a=o||e.i!=2,l=e.i;o&&(n=new sn(s*3));var c=function(Ue){var ft=n.length;if(Ue>ft){var pt=new sn(Math.max(ft*2,Ue));pt.set(n),n=pt}},u=e.f||0,h=e.p||0,d=e.b||0,f=e.l,m=e.d,p=e.m,y=e.n,g=s*8;do{if(!f){u=Jn(t,h,1);var b=Jn(t,h+1,3);if(h+=3,b)if(b==1)f=SS,m=ES,p=9,y=5;else if(b==2){var C=Jn(t,h,31)+257,E=Jn(t,h+10,15)+4,T=C+Jn(t,h+5,31)+1;h+=14;for(var A=new sn(T),M=new sn(19),P=0;P<E;++P)M[wS[P]]=Jn(t,h+P*3,7);h+=E*3;for(var S=Tc(M),O=(1<<S)-1,w=bo(M,S,1),P=0;P<T;){var R=w[Jn(t,h,O)];h+=R&15;var v=R>>4;if(v<16)A[P++]=v;else{var F=0,D=0;for(v==16?(D=3+Jn(t,h,3),h+=2,F=A[P-1]):v==17?(D=3+Jn(t,h,7),h+=3):v==18&&(D=11+Jn(t,h,127),h+=7);D--;)A[P++]=F}}var te=A.subarray(0,C),H=A.subarray(C);p=Tc(te),y=Tc(H),f=bo(te,p,1),m=bo(H,y,1)}else mn(1);else{var v=AS(h)+4,x=t[v-4]|t[v-3]<<8,k=v+x;if(k>s){l&&mn(0);break}a&&c(d+x),n.set(t.subarray(v,k),d),e.b=d+=x,e.p=h=k*8,e.f=u;continue}if(h>g){l&&mn(0);break}}a&&c(d+131072);for(var Q=(1<<p)-1,N=(1<<y)-1,B=h;;B=h){var F=f[Cc(t,h)&Q],le=F>>4;if(h+=F&15,h>g){l&&mn(0);break}if(F||mn(2),le<256)n[d++]=le;else if(le==256){B=h,f=null;break}else{var oe=le-254;if(le>264){var P=le-257,X=qy[P];oe=Jn(t,h,(1<<X)-1)+Qy[P],h+=X}var ye=m[Cc(t,h)&N],Le=ye>>4;ye||mn(3),h+=ye&15;var H=kS[Le];if(Le>3){var X=Xy[Le];H+=Cc(t,h)&(1<<X)-1,h+=X}if(h>g){l&&mn(0);break}a&&c(d+131072);var xe=d+oe;if(d<H){var Se=i-H,Ze=Math.min(H,xe);for(Se+d<0&&mn(3);d<Ze;++d)n[d]=r[Se+d]}for(;d<xe;++d)n[d]=n[d-H]}}e.l=f,e.p=B,e.b=d,e.f=u,f&&(u=1,e.m=p,e.d=m,e.n=y)}while(!u);return d!=n.length&&o?za(n,0,d):n.subarray(0,d)},CS=new sn(0),t0=function(t,e){return((t[0]&15)!=8||t[0]>>4>7||(t[0]<<8|t[1])%31)&&mn(6,"invalid zlib data"),(t[1]>>5&1)==+!e&&mn(6,"invalid zlib data: "+(t[1]&32?"need":"unexpected")+" dictionary"),(t[1]>>3&4)+2},Mc=(function(){function t(e,n){typeof e=="function"&&(n=e,e={}),this.ondata=n;var r=e&&e.dictionary&&e.dictionary.subarray(-32768);this.s={i:0,b:r?r.length:0},this.o=new sn(32768),this.p=new sn(0),r&&this.o.set(r)}return t.prototype.e=function(e){if(this.ondata||mn(5),this.d&&mn(4),!this.p.length)this.p=e;else if(e.length){var n=new sn(this.p.length+e.length);n.set(this.p),n.set(e,this.p.length),this.p=n}},t.prototype.c=function(e){this.s.i=+(this.d=e||!1);var n=this.s.b,r=e0(this.p,this.s,this.o);this.ondata(za(r,n,this.s.b),this.d),this.o=za(r,this.s.b-32768),this.s.b=this.o.length,this.p=za(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(e,n){this.e(e),this.c(n)},t})(),Nf=(function(){function t(e,n){Mc.call(this,e,n),this.v=e&&e.dictionary?2:1}return t.prototype.push=function(e,n){if(Mc.prototype.e.call(this,e),this.v){if(this.p.length<6&&!n)return;this.p=this.p.subarray(t0(this.p,this.v-1)),this.v=0}n&&(this.p.length<4&&mn(6,"invalid zlib data"),this.p=this.p.subarray(0,-4)),Mc.prototype.c.call(this,n)},t})();function MS(t,e){return e0(t.subarray(t0(t,e),-4),{i:2},e,e)}var RS=typeof TextDecoder<"u"&&new TextDecoder,IS=0;try{RS.decode(CS,{stream:!0}),IS=1}catch{}function Ff(t,e="utf8"){return new TextDecoder(e).decode(t)}const zS=new TextEncoder;function PS(t){return zS.encode(t)}const OS=1024*8,$S=(()=>{const t=new Uint8Array(4),e=new Uint32Array(t.buffer);return!((e[0]=1)&t[0])})(),Rc={int8:globalThis.Int8Array,uint8:globalThis.Uint8Array,int16:globalThis.Int16Array,uint16:globalThis.Uint16Array,int32:globalThis.Int32Array,uint32:globalThis.Uint32Array,uint64:globalThis.BigUint64Array,int64:globalThis.BigInt64Array,float32:globalThis.Float32Array,float64:globalThis.Float64Array};class Jh{buffer;byteLength;byteOffset;length;offset;lastWrittenByte;littleEndian;_data;_mark;_marks;constructor(e=OS,n={}){let r=!1;typeof e=="number"?e=new ArrayBuffer(e):(r=!0,this.lastWrittenByte=e.byteLength);const s=n.offset?n.offset>>>0:0,i=e.byteLength-s;let o=s;(ArrayBuffer.isView(e)||e instanceof Jh)&&(e.byteLength!==e.buffer.byteLength&&(o=e.byteOffset+s),e=e.buffer),r?this.lastWrittenByte=i:this.lastWrittenByte=0,this.buffer=e,this.length=i,this.byteLength=i,this.byteOffset=o,this.offset=0,this.littleEndian=!0,this._data=new DataView(this.buffer,o,i),this._mark=0,this._marks=[]}available(e=1){return this.offset+e<=this.length}isLittleEndian(){return this.littleEndian}setLittleEndian(){return this.littleEndian=!0,this}isBigEndian(){return!this.littleEndian}setBigEndian(){return this.littleEndian=!1,this}skip(e=1){return this.offset+=e,this}back(e=1){return this.offset-=e,this}seek(e){return this.offset=e,this}mark(){return this._mark=this.offset,this}reset(){return this.offset=this._mark,this}pushMark(){return this._marks.push(this.offset),this}popMark(){const e=this._marks.pop();if(e===void 0)throw new Error("Mark stack empty");return this.seek(e),this}rewind(){return this.offset=0,this}ensureAvailable(e=1){if(!this.available(e)){const r=(this.offset+e)*2,s=new Uint8Array(r);s.set(new Uint8Array(this.buffer)),this.buffer=s.buffer,this.length=r,this.byteLength=r,this._data=new DataView(this.buffer)}return this}readBoolean(){return this.readUint8()!==0}readInt8(){return this._data.getInt8(this.offset++)}readUint8(){return this._data.getUint8(this.offset++)}readByte(){return this.readUint8()}readBytes(e=1){return this.readArray(e,"uint8")}readArray(e,n){const r=Rc[n].BYTES_PER_ELEMENT*e,s=this.byteOffset+this.offset,i=this.buffer.slice(s,s+r);if(this.littleEndian===$S&&n!=="uint8"&&n!=="int8"){const a=new Uint8Array(this.buffer.slice(s,s+r));a.reverse();const l=new Rc[n](a.buffer);return this.offset+=r,l.reverse(),l}const o=new Rc[n](i);return this.offset+=r,o}readInt16(){const e=this._data.getInt16(this.offset,this.littleEndian);return this.offset+=2,e}readUint16(){const e=this._data.getUint16(this.offset,this.littleEndian);return this.offset+=2,e}readInt32(){const e=this._data.getInt32(this.offset,this.littleEndian);return this.offset+=4,e}readUint32(){const e=this._data.getUint32(this.offset,this.littleEndian);return this.offset+=4,e}readFloat32(){const e=this._data.getFloat32(this.offset,this.littleEndian);return this.offset+=4,e}readFloat64(){const e=this._data.getFloat64(this.offset,this.littleEndian);return this.offset+=8,e}readBigInt64(){const e=this._data.getBigInt64(this.offset,this.littleEndian);return this.offset+=8,e}readBigUint64(){const e=this._data.getBigUint64(this.offset,this.littleEndian);return this.offset+=8,e}readChar(){return String.fromCharCode(this.readInt8())}readChars(e=1){let n="";for(let r=0;r<e;r++)n+=this.readChar();return n}readUtf8(e=1){return Ff(this.readBytes(e))}decodeText(e=1,n="utf8"){return Ff(this.readBytes(e),n)}writeBoolean(e){return this.writeUint8(e?255:0),this}writeInt8(e){return this.ensureAvailable(1),this._data.setInt8(this.offset++,e),this._updateLastWrittenByte(),this}writeUint8(e){return this.ensureAvailable(1),this._data.setUint8(this.offset++,e),this._updateLastWrittenByte(),this}writeByte(e){return this.writeUint8(e)}writeBytes(e){this.ensureAvailable(e.length);for(let n=0;n<e.length;n++)this._data.setUint8(this.offset++,e[n]);return this._updateLastWrittenByte(),this}writeInt16(e){return this.ensureAvailable(2),this._data.setInt16(this.offset,e,this.littleEndian),this.offset+=2,this._updateLastWrittenByte(),this}writeUint16(e){return this.ensureAvailable(2),this._data.setUint16(this.offset,e,this.littleEndian),this.offset+=2,this._updateLastWrittenByte(),this}writeInt32(e){return this.ensureAvailable(4),this._data.setInt32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeUint32(e){return this.ensureAvailable(4),this._data.setUint32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeFloat32(e){return this.ensureAvailable(4),this._data.setFloat32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeFloat64(e){return this.ensureAvailable(8),this._data.setFloat64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeBigInt64(e){return this.ensureAvailable(8),this._data.setBigInt64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeBigUint64(e){return this.ensureAvailable(8),this._data.setBigUint64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeChar(e){return this.writeUint8(e.charCodeAt(0))}writeChars(e){for(let n=0;n<e.length;n++)this.writeUint8(e.charCodeAt(n));return this}writeUtf8(e){return this.writeBytes(PS(e))}toArray(){return new Uint8Array(this.buffer,this.byteOffset,this.lastWrittenByte)}getWrittenByteLength(){return this.lastWrittenByte-this.byteOffset}_updateLastWrittenByte(){this.offset>this.lastWrittenByte&&(this.lastWrittenByte=this.offset)}}const n0=[];for(let t=0;t<256;t++){let e=t;for(let n=0;n<8;n++)e&1?e=3988292384^e>>>1:e=e>>>1;n0[t]=e}const Bf=4294967295;function LS(t,e,n){let r=t;for(let s=0;s<n;s++)r=n0[(r^e[s])&255]^r>>>8;return r}function DS(t,e){return(LS(Bf,t,e)^Bf)>>>0}function Uf(t,e,n){const r=t.readUint32(),s=DS(new Uint8Array(t.buffer,t.byteOffset+t.offset-e-4,e),e);if(s!==r)throw new Error(`CRC mismatch for chunk ${n}. Expected ${r}, found ${s}`)}function r0(t,e,n){for(let r=0;r<n;r++)e[r]=t[r]}function s0(t,e,n,r){let s=0;for(;s<r;s++)e[s]=t[s];for(;s<n;s++)e[s]=t[s]+e[s-r]&255}function i0(t,e,n,r){let s=0;if(n.length===0)for(;s<r;s++)e[s]=t[s];else for(;s<r;s++)e[s]=t[s]+n[s]&255}function o0(t,e,n,r,s){let i=0;if(n.length===0){for(;i<s;i++)e[i]=t[i];for(;i<r;i++)e[i]=t[i]+(e[i-s]>>1)&255}else{for(;i<s;i++)e[i]=t[i]+(n[i]>>1)&255;for(;i<r;i++)e[i]=t[i]+(e[i-s]+n[i]>>1)&255}}function a0(t,e,n,r,s){let i=0;if(n.length===0){for(;i<s;i++)e[i]=t[i];for(;i<r;i++)e[i]=t[i]+e[i-s]&255}else{for(;i<s;i++)e[i]=t[i]+n[i]&255;for(;i<r;i++)e[i]=t[i]+NS(e[i-s],n[i],n[i-s])&255}}function NS(t,e,n){const r=t+e-n,s=Math.abs(r-t),i=Math.abs(r-e),o=Math.abs(r-n);return s<=i&&s<=o?t:i<=o?e:n}function FS(t,e,n,r,s,i){switch(t){case 0:r0(e,n,s);break;case 1:s0(e,n,s,i);break;case 2:i0(e,n,r,s);break;case 3:o0(e,n,r,s,i);break;case 4:a0(e,n,r,s,i);break;default:throw new Error(`Unsupported filter: ${t}`)}}const BS=new Uint16Array([255]),US=new Uint8Array(BS.buffer),HS=US[0]===255;function jS(t){const{data:e,width:n,height:r,channels:s,depth:i}=t,o=[{x:0,y:0,xStep:8,yStep:8},{x:4,y:0,xStep:8,yStep:8},{x:0,y:4,xStep:4,yStep:8},{x:2,y:0,xStep:4,yStep:4},{x:0,y:2,xStep:2,yStep:4},{x:1,y:0,xStep:2,yStep:2},{x:0,y:1,xStep:1,yStep:2}],a=Math.ceil(i/8)*s,l=new Uint8Array(r*n*a);let c=0;for(let u=0;u<7;u++){const h=o[u],d=Math.ceil((n-h.x)/h.xStep),f=Math.ceil((r-h.y)/h.yStep);if(d<=0||f<=0)continue;const m=d*a,p=new Uint8Array(m);for(let y=0;y<f;y++){const g=e[c++],b=e.subarray(c,c+m);c+=m;const v=new Uint8Array(m);FS(g,b,v,p,m,a),p.set(v);for(let x=0;x<d;x++){const k=h.x+x*h.xStep,C=h.y+y*h.yStep;if(!(k>=n||C>=r))for(let E=0;E<a;E++)l[(C*n+k)*a+E]=v[x*a+E]}}}if(i===16){const u=new Uint16Array(l.buffer);if(HS)for(let h=0;h<u.length;h++)u[h]=WS(u[h]);return u}else return l}function WS(t){return(t&255)<<8|t>>8&255}const VS=new Uint16Array([255]),GS=new Uint8Array(VS.buffer),YS=GS[0]===255,qS=new Uint8Array(0);function Hf(t){const{data:e,width:n,height:r,channels:s,depth:i}=t,o=Math.ceil(i/8)*s,a=Math.ceil(i/8*s*n),l=new Uint8Array(r*a);let c=qS,u=0,h,d;for(let f=0;f<r;f++){switch(h=e.subarray(u+1,u+1+a),d=l.subarray(f*a,(f+1)*a),e[u]){case 0:r0(h,d,a);break;case 1:s0(h,d,a,o);break;case 2:i0(h,d,c,a);break;case 3:o0(h,d,c,a,o);break;case 4:a0(h,d,c,a,o);break;default:throw new Error(`Unsupported filter: ${e[u]}`)}c=d,u+=a+1}if(i===16){const f=new Uint16Array(l.buffer);if(YS)for(let m=0;m<f.length;m++)f[m]=XS(f[m]);return f}else return l}function XS(t){return(t&255)<<8|t>>8&255}const Pa=Uint8Array.of(137,80,78,71,13,10,26,10);function jf(t){if(!ZS(t.readBytes(Pa.length)))throw new Error("wrong PNG signature")}function ZS(t){if(t.length<Pa.length)return!1;for(let e=0;e<Pa.length;e++)if(t[e]!==Pa[e])return!1;return!0}const JS="tEXt",QS=0,l0=new TextDecoder("latin1");function KS(t){if(t2(t),t.length===0||t.length>79)throw new Error("keyword length must be between 1 and 79")}const e2=/^[\u0000-\u00FF]*$/;function t2(t){if(!e2.test(t))throw new Error("invalid latin1 text")}function n2(t,e,n){const r=c0(e);t[r]=r2(e,n-r.length-1)}function c0(t){for(t.mark();t.readByte()!==QS;);const e=t.offset;t.reset();const n=l0.decode(t.readBytes(e-t.offset-1));return t.skip(1),KS(n),n}function r2(t,e){return l0.decode(t.readBytes(e))}const An={UNKNOWN:-1,GREYSCALE:0,TRUECOLOUR:2,INDEXED_COLOUR:3,GREYSCALE_ALPHA:4,TRUECOLOUR_ALPHA:6},Ic={UNKNOWN:-1,DEFLATE:0},Wf={UNKNOWN:-1,ADAPTIVE:0},zc={UNKNOWN:-1,NO_INTERLACE:0,ADAM7:1},aa={NONE:0,BACKGROUND:1,PREVIOUS:2},Pc={SOURCE:0,OVER:1};class s2 extends Jh{_checkCrc;_inflator;_png;_apng;_end;_hasPalette;_palette;_hasTransparency;_transparency;_compressionMethod;_filterMethod;_interlaceMethod;_colorType;_isAnimated;_numberOfFrames;_numberOfPlays;_frames;_writingDataChunks;_chunks;_inflatorResult;constructor(e,n={}){super(e);const{checkCrc:r=!1}=n;this._checkCrc=r,this._inflator=new Nf((s,i)=>{if(this._chunks.push(s),i){const o=this._chunks.reduce((l,c)=>l+c.length,0);this._inflatorResult=new Uint8Array(o);let a=0;for(const l of this._chunks)this._inflatorResult.set(l,a),a+=l.length;this._chunks=[]}}),this._chunks=[],this._png={width:-1,height:-1,channels:-1,data:new Uint8Array(0),depth:1,text:{}},this._apng={width:-1,height:-1,channels:-1,depth:1,numberOfFrames:1,numberOfPlays:0,text:{},frames:[]},this._end=!1,this._hasPalette=!1,this._palette=[],this._hasTransparency=!1,this._transparency=new Uint16Array(0),this._compressionMethod=Ic.UNKNOWN,this._filterMethod=Wf.UNKNOWN,this._interlaceMethod=zc.UNKNOWN,this._colorType=An.UNKNOWN,this._isAnimated=!1,this._numberOfFrames=1,this._numberOfPlays=0,this._frames=[],this._writingDataChunks=!1,this._inflatorResult=new Uint8Array(0),this.setBigEndian()}decode(){for(jf(this);!this._end;){const e=this.readUint32(),n=this.readChars(4);this.decodeChunk(e,n)}return this._inflator.push(new Uint8Array(0),!0),this.decodeImage(),this._png}decodeApng(){for(jf(this);!this._end;){const e=this.readUint32(),n=this.readChars(4);this.decodeApngChunk(e,n)}return this.decodeApngImage(),this._apng}decodeChunk(e,n){const r=this.offset;switch(n){case"IHDR":this.decodeIHDR();break;case"PLTE":this.decodePLTE(e);break;case"IDAT":this.decodeIDAT(e);break;case"IEND":this._end=!0;break;case"tRNS":this.decodetRNS(e);break;case"iCCP":this.decodeiCCP(e);break;case JS:n2(this._png.text,this,e);break;case"pHYs":this.decodepHYs();break;default:this.skip(e);break}if(this.offset-r!==e)throw new Error(`Length mismatch while decoding chunk ${n}`);this._checkCrc?Uf(this,e+4,n):this.skip(4)}decodeApngChunk(e,n){const r=this.offset;switch(n!=="fdAT"&&n!=="IDAT"&&this._writingDataChunks&&this.pushDataToFrame(),n){case"acTL":this.decodeACTL();break;case"fcTL":this.decodeFCTL();break;case"fdAT":this.decodeFDAT(e);break;default:this.decodeChunk(e,n),this.offset=r+e;break}if(this.offset-r!==e)throw new Error(`Length mismatch while decoding chunk ${n}`);this._checkCrc?Uf(this,e+4,n):this.skip(4)}decodeIHDR(){const e=this._png;e.width=this.readUint32(),e.height=this.readUint32(),e.depth=i2(this.readUint8());const n=this.readUint8();this._colorType=n;let r;switch(n){case An.GREYSCALE:r=1;break;case An.TRUECOLOUR:r=3;break;case An.INDEXED_COLOUR:r=1;break;case An.GREYSCALE_ALPHA:r=2;break;case An.TRUECOLOUR_ALPHA:r=4;break;case An.UNKNOWN:default:throw new Error(`Unknown color type: ${n}`)}if(this._png.channels=r,this._compressionMethod=this.readUint8(),this._compressionMethod!==Ic.DEFLATE)throw new Error(`Unsupported compression method: ${this._compressionMethod}`);this._filterMethod=this.readUint8(),this._interlaceMethod=this.readUint8()}decodeACTL(){this._numberOfFrames=this.readUint32(),this._numberOfPlays=this.readUint32(),this._isAnimated=!0}decodeFCTL(){const e={sequenceNumber:this.readUint32(),width:this.readUint32(),height:this.readUint32(),xOffset:this.readUint32(),yOffset:this.readUint32(),delayNumber:this.readUint16(),delayDenominator:this.readUint16(),disposeOp:this.readUint8(),blendOp:this.readUint8(),data:new Uint8Array(0)};this._frames.push(e)}decodePLTE(e){if(e%3!==0)throw new RangeError(`PLTE field length must be a multiple of 3. Got ${e}`);const n=e/3;this._hasPalette=!0;const r=[];this._palette=r;for(let s=0;s<n;s++)r.push([this.readUint8(),this.readUint8(),this.readUint8()])}decodeIDAT(e){this._writingDataChunks=!0;const n=e,r=this.offset+this.byteOffset;try{this._inflator.push(new Uint8Array(this.buffer,r,n),!1)}catch(s){throw new Error("Error while decompressing the data:",{cause:s})}this.skip(e)}decodeFDAT(e){this._writingDataChunks=!0;let n=e,r=this.offset+this.byteOffset;r+=4,n-=4;try{this._inflator.push(new Uint8Array(this.buffer,r,n),!1)}catch(s){throw new Error("Error while decompressing the data:",{cause:s})}this.skip(e)}decodetRNS(e){switch(this._colorType){case An.GREYSCALE:case An.TRUECOLOUR:{if(e%2!==0)throw new RangeError(`tRNS chunk length must be a multiple of 2. Got ${e}`);if(e/2>this._png.width*this._png.height)throw new Error(`tRNS chunk contains more alpha values than there are pixels (${e/2} vs ${this._png.width*this._png.height})`);this._hasTransparency=!0,this._transparency=new Uint16Array(e/2);for(let n=0;n<e/2;n++)this._transparency[n]=this.readUint16();break}case An.INDEXED_COLOUR:{if(e>this._palette.length)throw new Error(`tRNS chunk contains more alpha values than there are palette colors (${e} vs ${this._palette.length})`);let n=0;for(;n<e;n++){const r=this.readByte();this._palette[n].push(r)}for(;n<this._palette.length;n++)this._palette[n].push(255);break}case An.UNKNOWN:case An.GREYSCALE_ALPHA:case An.TRUECOLOUR_ALPHA:default:throw new Error(`tRNS chunk is not supported for color type ${this._colorType}`)}}decodeiCCP(e){const n=c0(this),r=this.readUint8();if(r!==Ic.DEFLATE)throw new Error(`Unsupported iCCP compression method: ${r}`);const s=this.readBytes(e-n.length-2);this._png.iccEmbeddedProfile={name:n,profile:MS(s)}}decodepHYs(){const e=this.readUint32(),n=this.readUint32(),r=this.readByte();this._png.resolution={x:e,y:n,unit:r}}decodeApngImage(){this._apng.width=this._png.width,this._apng.height=this._png.height,this._apng.channels=this._png.channels,this._apng.depth=this._png.depth,this._apng.numberOfFrames=this._numberOfFrames,this._apng.numberOfPlays=this._numberOfPlays,this._apng.text=this._png.text,this._apng.resolution=this._png.resolution;for(let e=0;e<this._numberOfFrames;e++){const n={sequenceNumber:this._frames[e].sequenceNumber,delayNumber:this._frames[e].delayNumber,delayDenominator:this._frames[e].delayDenominator,data:this._apng.depth===8?new Uint8Array(this._apng.width*this._apng.height*this._apng.channels):new Uint16Array(this._apng.width*this._apng.height*this._apng.channels)},r=this._frames.at(e);if(r){if(r.data=Hf({data:r.data,width:r.width,height:r.height,channels:this._apng.channels,depth:this._apng.depth}),this._hasPalette&&(this._apng.palette=this._palette),this._hasTransparency&&(this._apng.transparency=this._transparency),e===0||r.xOffset===0&&r.yOffset===0&&r.width===this._png.width&&r.height===this._png.height)n.data=r.data;else{const s=this._apng.frames.at(e-1);this.disposeFrame(r,s,n),this.addFrameDataToCanvas(n,r)}this._apng.frames.push(n)}}return this._apng}disposeFrame(e,n,r){switch(e.disposeOp){case aa.NONE:break;case aa.BACKGROUND:for(let s=0;s<this._png.height;s++)for(let i=0;i<this._png.width;i++){const o=(s*e.width+i)*this._png.channels;for(let a=0;a<this._png.channels;a++)r.data[o+a]=0}break;case aa.PREVIOUS:r.data.set(n.data);break;default:throw new Error("Unknown disposeOp")}}addFrameDataToCanvas(e,n){const r=1<<this._png.depth,s=(i,o)=>{const a=((i+n.yOffset)*this._png.width+n.xOffset+o)*this._png.channels,l=(i*n.width+o)*this._png.channels;return{index:a,frameIndex:l}};switch(n.blendOp){case Pc.SOURCE:for(let i=0;i<n.height;i++)for(let o=0;o<n.width;o++){const{index:a,frameIndex:l}=s(i,o);for(let c=0;c<this._png.channels;c++)e.data[a+c]=n.data[l+c]}break;case Pc.OVER:for(let i=0;i<n.height;i++)for(let o=0;o<n.width;o++){const{index:a,frameIndex:l}=s(i,o);for(let c=0;c<this._png.channels;c++){const u=n.data[l+this._png.channels-1]/r,h=c%(this._png.channels-1)===0?1:n.data[l+c],d=Math.floor(u*h+(1-u)*e.data[a+c]);e.data[a+c]+=d}}break;default:throw new Error("Unknown blendOp")}}decodeImage(){const e=this._inflatorResult;if(this._filterMethod!==Wf.ADAPTIVE)throw new Error(`Filter method ${this._filterMethod} not supported`);if(this._interlaceMethod===zc.NO_INTERLACE)this._png.data=Hf({data:e,width:this._png.width,height:this._png.height,channels:this._png.channels,depth:this._png.depth});else if(this._interlaceMethod===zc.ADAM7)this._png.data=jS({data:e,width:this._png.width,height:this._png.height,channels:this._png.channels,depth:this._png.depth});else throw new Error(`Interlace method ${this._interlaceMethod} not supported`);this._hasPalette&&(this._png.palette=this._palette),this._hasTransparency&&(this._png.transparency=this._transparency)}pushDataToFrame(){this._inflator.push(new Uint8Array(0),!0);const e=this._inflatorResult,n=this._frames.at(-1);n?n.data=e:this._frames.push({sequenceNumber:0,width:this._png.width,height:this._png.height,xOffset:0,yOffset:0,delayNumber:0,delayDenominator:0,disposeOp:aa.NONE,blendOp:Pc.SOURCE,data:e}),this._inflator=new Nf((r,s)=>{if(this._chunks.push(r),s){const i=this._chunks.reduce((a,l)=>a+l.length,0);this._inflatorResult=new Uint8Array(i);let o=0;for(const a of this._chunks)this._inflatorResult.set(a,o),o+=a.length;this._chunks=[]}}),this._chunks=[],this._writingDataChunks=!1}}function i2(t){if(t!==1&&t!==2&&t!==4&&t!==8&&t!==16)throw new Error(`invalid bit depth: ${t}`);return t}function Qh(t,e){return new s2(t,e).decode()}var gn;(t=>{t.EMPTY=255;function e(c,u){const h=new Uint8Array(c*u);return h.fill(t.EMPTY),{width:c,height:u,data:h}}t.create=e;function n(c){return{...c,data:new Uint8Array(c.data)}}t.clone=n;function r(c,u,h){return h*c.width+u}t.offset=r;function s(c,u,h){return u>=0&&h>=0&&u<c.width&&h<c.height}t.contains=s;function i(c,u,h){return c.data[r(c,u,h)]}t.get=i;function o(c,u,h,d){c.data[r(c,u,h)]=d}t.set=o;function a(c,u,h){return i(c,u,h)===t.EMPTY}t.isEmpty=a;function l(c,u,h=new ImageData(c.width,c.height)){for(let d=0;d<c.data.length;d++){const f=c.data[d]===t.EMPTY?void 0:u[c.data[d]],m=d<<2;h.data[m+0]=f?.r??0,h.data[m+1]=f?.g??0,h.data[m+2]=f?.b??0,h.data[m+3]=f===void 0?0:f.a}return h}t.toImageData=l})(gn||(gn={}));var Et;(t=>{function e(u=0,h=0,d=0){return{x:u,y:h,z:d}}t.create=e;function n(u,h,d=t.create()){return d.x=u.x+h.x,d.y=u.y+h.y,d.z=u.z+h.z,d}t.add=n;function r(u,h,d=t.create()){return d.x=u.x-h.x,d.y=u.y-h.y,d.z=u.z-h.z,d}t.subtract=r;function s(u,h,d=t.create()){const f=u.y*h.z-u.z*h.y,m=u.z*h.x-u.x*h.z,p=u.x*h.y-u.y*h.x;return d.x=f,d.y=m,d.z=p,d}t.cross=s;function i(u){return Math.hypot(u.x,u.y,u.z)}t.length=i;function o(u,h=t.create()){const d=t.length(u)||1;return h.x=u.x/d,h.y=u.y/d,h.z=u.z/d,h}t.normalize=o;function a(u,h,d=t.create()){return d.x=u.x*h,d.y=u.y*h,d.z=u.z*h,d}t.multiplyScalar=a;function l(u,h,d=t.create()){const{x:f,y:m,z:p,w:y}=h,{x:g,y:b,z:v}=u,x=2*(m*v-p*b),k=2*(p*g-f*v),C=2*(f*b-m*g);return d.x=g+y*x+(m*C-p*k),d.y=b+y*k+(p*x-f*C),d.z=v+y*C+(f*k-m*x),d}t.rotateQuaternion=l;function c(u,h){return u.x===h.x&&u.y===h.y&&u.z===h.z}t.equals=c,t.EMPTY=Object.freeze(t.create())})(Et||(Et={}));var zo;(t=>{function e(r,s={width:0,height:0,depth:0}){const i=Math.max(r.width,r.height,r.depth);return s.width=r.width/i,s.height=r.height/i,s.depth=r.depth/i,s}t.normalize=e;function n(r,s){return r.width===s.width&&r.height===s.height&&r.depth===s.depth}t.equals=n})(zo||(zo={}));class Fn extends Float32Array{}(t=>{function e(u=0,h=0,d=0,f=0,m=0,p=0,y=0,g=0,b=0){return new t([u,h,d,f,m,p,y,g,b])}t.create=e;function n(u=t.create()){return u.set([1,0,0,0,1,0,0,0,1]),u}t.identity=n;function r(u,h,d,f=t.create()){const m=Et.normalize(Et.subtract(u,h)),p=Et.normalize(Et.cross(d,m)),y=Et.cross(m,p);return f[0]=p.x,f[1]=p.y,f[2]=p.z,f[3]=y.x,f[4]=y.y,f[5]=y.z,f[6]=m.x,f[7]=m.y,f[8]=m.z,f}t.orientation=r;function s(u,h=t.create()){const d=Math.cos(u),f=Math.sin(u);return h[0]=1,h[1]=0,h[2]=0,h[3]=0,h[4]=d,h[5]=f,h[6]=0,h[7]=-f,h[8]=d,h}t.rotationX=s;function i(u,h=t.create()){const d=Math.cos(u),f=Math.sin(u);return h[0]=d,h[1]=0,h[2]=-f,h[3]=0,h[4]=1,h[5]=0,h[6]=f,h[7]=0,h[8]=d,h}t.rotationY=i;function o(u,h=t.create()){const d=Math.cos(u),f=Math.sin(u);return h[0]=d,h[1]=f,h[2]=0,h[3]=-f,h[4]=d,h[5]=0,h[6]=0,h[7]=0,h[8]=1,h}t.rotationZ=o;function a(u,h=t.create()){const d=[u[0],u[3],u[6],u[1],u[4],u[7],u[2],u[5],u[8]];return h.set(d),h}t.transpose=a;function l(u,h,d=t.create()){const f=[0,0,0,0,0,0,0,0,0];for(let m=0;m<3;m++)for(let p=0;p<3;p++)f[m*3+p]=u[p]*h[m*3]+u[3+p]*h[m*3+1]+u[6+p]*h[m*3+2];return d.set(f),d}t.multiply=l;function c(u,h,d=Et.create()){const f=u[0]*h.x+u[3]*h.y+u[6]*h.z,m=u[1]*h.x+u[4]*h.y+u[7]*h.z,p=u[2]*h.x+u[5]*h.y+u[8]*h.z;return d.x=f,d.y=m,d.z=p,d}t.transform=c})(Fn||(Fn={}));var vo;(t=>{function e(s=0,i=0,o=0,a=0){return{x:s,y:i,z:o,w:a}}t.create=e;function n({x:s,y:i,z:o},a,l=t.create()){const c=a/2,u=Math.sin(c);return l.x=s*u,l.y=i*u,l.z=o*u,l.w=Math.cos(c),l}t.fromAxisAngle=n;function r(s,i,o=t.create()){return o.x=s.w*i.x+s.x*i.w+s.y*i.z-s.z*i.y,o.y=s.w*i.y-s.x*i.z+s.y*i.w+s.z*i.x,o.z=s.w*i.z+s.x*i.y-s.y*i.x+s.z*i.w,o.w=s.w*i.w-s.x*i.x-s.y*i.y-s.z*i.z,o}t.multiply=r})(vo||(vo={}));var Ju;(t=>{function e(s,i){return s.r===i.r&&s.g===i.g&&s.b===i.b}t.equals=e;function n(s,i={r:0,g:0,b:0}){const o=typeof s=="number"?s:Number(s);if(!Number.isInteger(o)||o<0||o>16777215)throw new Error(`${s} is not a valid 24-bit hex colour`);return i.r=o>>16&255,i.g=o>>8&255,i.b=o&255,i}t.fromHex=n;function r({r:s,g:i,b:o}){return`rgb(${s}, ${i}, ${o})`}t.toCSS=r})(Ju||(Ju={}));var wr;(t=>{function e(d=0,f=0){return{x:d,y:f}}t.create=e;function n(d,f=t.create()){return f.x=Math.round(d.x-.5),f.y=Math.round(d.y-.5),f}t.round=n;function r(d){return Math.hypot(d.x,d.y)}t.length=r;function s(d,f,m=t.create()){return m.x=d.x-f.x,m.y=d.y-f.y,m}t.sub=s;function i(d,f,m=t.create()){return m.x=d.x+f.x,m.y=d.y+f.y,m}t.add=i;function o(d,f,m=t.create()){return m.x=d.x*f.x,m.y=d.y*f.y,m}t.multiply=o;function a(d,f,m=t.create()){return m.x=d.x*f,m.y=d.y*f,m}t.multiplyScalar=a;function l(d,f,m=t.create()){return m.x=Math.max(d.x,f.x),m.y=Math.max(d.y,f.y),m}t.max=l;function c(d,f,m=t.create()){return m.x=Math.min(d.x,f.x),m.y=Math.min(d.y,f.y),m}t.min=c;function u(d,f,m,p=t.create()){return p.x=Math.max(Math.min(d.x,m.x),f.x),p.y=Math.max(Math.min(d.y,m.y),f.y),p}t.clamp=u;function h(d){return t.create(d.x,d.y)}t.clone=h,t.EMPTY=Object.freeze(e())})(wr||(wr={}));const u0={front:!0,left:!0,right:!0,back:!0,top:!0,bottom:!0},Kh=Object.keys(u0),Zl={front:["width","height"],back:["width","height"],left:["depth","height"],right:["depth","height"],top:["width","depth"],bottom:["width","depth"]},h0=["width","height","depth"],Oa={width:"x",height:"y",depth:"z"},o2={front:"depth",back:"depth",left:"width",right:"width",top:"height",bottom:"height"},a2={front:[!1,!0],back:[!0,!0],left:[!1,!0],right:[!0,!0],top:[!1,!1],bottom:[!1,!0]},d0={width:["left","right"],height:["bottom","top"],depth:["back","front"]};function l2(t){const e=/^section-(\d+)-(before|after)$/.exec(t);return e===null?void 0:{cut:Number(e[1]),face:e[2]}}function c2(t){return Et.create(t.width/2,t.height/2,t.depth/2)}function f0(t){return{width:t.sides.front.width,height:t.sides.front.height,depth:t.sides.left.width}}function u2(t,e=Fn.create()){return Fn.multiply(Fn.multiply(Fn.rotationX(t.x),Fn.rotationY(t.y)),Fn.rotationZ(t.z),e)}function h2(t,e){const n=[],r=new Set;let s=e;for(;s!==void 0&&!r.has(s.name);){r.add(s.name),n.push(s);const l=s.parent;s=l===null?void 0:t.parts.find(c=>c.name===l)}const i=Et.create();let o=Fn.identity(),a=1;for(const l of n.reverse())Et.add(i,Fn.transform(o,Et.multiplyScalar(l.root,a)),i),o=Fn.multiply(o,u2(l.turn)),a*=l.scale;return{at:i,turn:o,scale:a}}const Oc={name:"",framesPerSecond:12,loop:!0},d2="palette.png",is="parts.json",f2="body";function p2(t){const e=Qh(t),n=[];for(let r=0;r<e.width;r++){const s=r<<2;n.push({r:e.data[s+0],g:e.data[s+1],b:e.data[s+2],a:e.data[s+3]})}return n}const ml=32,ed=(t,e,n)=>t<<16|e<<8|n;function m2(t){const e=new Set;for(const n of t)for(let r=0;r<n.width*n.height*4;r+=4)n.data[r+3]!==0&&e.add(ed(n.data[r],n.data[r+1],n.data[r+2]));return e}function g2(t,e){const n=Array.from({length:ml},(l,c)=>e[c]??{r:0,g:0,b:0,a:255}),r=n.map(({r:l,g:c,b:u})=>ed(l,c,u)),s=new Map,i=[];for(let l=0;l<ml;l++)t.has(r[l])?s.set(r[l],s.get(r[l])??l):i.push(l);const o=[...t].filter(l=>!s.has(l)),a=[];for(const l of o){const c=i.shift();if(c===void 0){a.push(l);continue}n[c]={r:l>>16&255,g:l>>8&255,b:l&255,a:255},s.set(l,c)}return{palette:n,indexOf:s,dropped:a}}function y2(t,e){const n=gn.create(t.width,t.height);for(let r=0;r<n.data.length;r++){const s=r<<2;if(t.data[s+3]===0)continue;const i=e.get(ed(t.data[s],t.data[s+1],t.data[s+2]));i!==void 0&&(n.data[r]=i)}return n}function wo(t){const{x:e,y:n,z:r}=t??{};return Et.create(typeof e=="number"?e:0,typeof n=="number"?n:0,typeof r=="number"?r:0)}const b2=["linear","in","out","in-out","hold"];function v2(t){return Array.isArray(t)?t.map((e,n)=>{const r=e?.name,s=e?.framesPerSecond,i=e?.loop,o=e?.parts;return{name:typeof r=="string"?r:Oc.name,framesPerSecond:typeof s=="number"?s:Oc.framesPerSecond,loop:typeof i=="boolean"?i:Oc.loop,parts:(Array.isArray(o)?o:[]).map(a=>{const l=a?.part;if(typeof l!="string"||l==="")throw new Error(`${is} gives a key of motion ${n} no part to move`);const c=a?.keys;return{part:l,keys:(Array.isArray(c)?c:[]).map(u=>{const h=u?.at;if(typeof h!="number")throw new Error(`${is} gives a key of ${l} in motion ${n} no frame to stand at`);const d=u?.ease,f=u?.scale;return{at:h,ease:b2.includes(d)?d:"linear",root:wo(u?.root),turn:wo(u?.turn),scale:typeof f=="number"&&f>0?f:1}})}})}}):[]}function w2(t){let e;try{e=JSON.parse(t)}catch(r){throw new Error(`${is} is not readable as JSON: ${r}`)}const n=e?.parts;if(!Array.isArray(n))throw new Error(`${is} lists no parts`);return{version:4,parts:n.map((r,s)=>{const i=r?.name;if(typeof i!="string"||i==="")throw new Error(`${is} gives part ${s} no name`);const o=r.parent,a=r.sections,l=r.scale;return{name:i,root:wo(r.root),pivot:wo(r.pivot),turn:wo(r.turn),scale:typeof l=="number"&&l>0?l:1,parent:typeof o=="string"?o:null,sections:(Array.isArray(a)?a:[]).map((c,u)=>{const{axis:h,at:d}=c??{};if(!h0.includes(h))throw new Error(`${is} cuts ${i} across "${h}", which is not one of its axes`);if(typeof d!="number")throw new Error(`${is} gives cut ${u} of ${i} nowhere to stand`);return{axis:h,at:d}})}}),motions:v2(e?.motions)}}async function gl(t,e=[]){const n=await Xl.loadAsync(t),r=new Map;let s,i;const o=h=>{let d=r.get(h);return d===void 0&&(d={indexed:{},asColours:{},sectionFaces:new Map},r.set(h,d)),d};for(const[h,d]of Object.entries(n.files)){const f=d.name.toLowerCase();if(f===d2){s=p2(new Uint8Array(await(await d.async("blob")).arrayBuffer()));continue}if(f===is){i=w2(await d.async("text"));continue}const m=/^(?:(.+)\/)?([^/]+)\.png$/i.exec(d.name);if(m===null)continue;const p=m[1]??"",y=m[2].toLowerCase(),g=y,b=l2(y);if(!u0[g]&&b===void 0)continue;const v=await(await d.async("blob")).arrayBuffer(),x=Qh(new Uint8Array(v));if(x.depth!==8)throw new Error(`${d.name} holds ${x.depth} bits per sample, and only eight is read`);const k={width:x.width,height:x.height,data:new Uint8Array(x.data)};if(b!==void 0){if(x.channels===4)throw new Error(`${d.name} holds colours, and a section's face is only read as palette indices`);const C=o(p).sectionFaces;C.set(b.cut,{...C.get(b.cut),[b.face]:k});continue}if(x.channels===4){o(p).asColours[g]=x;continue}o(p).indexed[g]=k}const a=[...r.values()].flatMap(h=>Object.keys(h.asColours).map(d=>h.asColours[d])),l=a.length!==0;if(l){const h=g2(m2(a),s??e);h.dropped.length!==0&&console.error(`This model was drawn in ${h.dropped.length+ml} colours and a palette holds ${ml}. The cells drawn in the ${h.dropped.length} that did not fit have been emptied.`),s=h.palette;for(const d of r.values())for(const f of Object.keys(d.asColours))d.indexed[f]=y2(d.asColours[f],h.indexOf)}return{parts:(i?.parts??[{name:f2,root:Et.create(),turn:Et.create(),scale:1,parent:null,sections:[]}]).map(({name:h,root:d,pivot:f,turn:m,scale:p,parent:y,sections:g})=>{const b=i===void 0?"":h,v=r.get(b)?.indexed??{},x=x2(v,b);for(const k of Kh){const[C,E]=Zl[k];v[k]??=gn.create(x[C],x[E])}return{name:h,sides:v,sections:_2(g,r.get(b),x,h),root:d,pivot:f??c2(x),turn:m,scale:p,parent:y}}),palette:s??e,migrated:l,motions:i?.motions??[]}}function _2(t,e,n,r){const s=[];return t.forEach(({axis:i,at:o},a)=>{const l=e?.sectionFaces.get(a);if(l?.before===void 0||l.after===void 0)return;const[c,u]=Zl[d0[i][0]];for(const h of[l.before,l.after])if(h.width!==n[c]||h.height!==n[u])throw new Error(`${r}'s cut ${a} is drawn ${h.width} by ${h.height}, and the ${i} it cuts across makes it ${n[c]} by ${n[u]}`);s.push({axis:i,at:o,before:l.before,after:l.after})}),s}const $c=32;function x2(t,e){const n={};for(const r of Kh){const s=t[r];if(s===void 0)continue;const[i,o]=Zl[r];for(const[a,l]of[[i,s.width],[o,s.height]]){const c=n[a];if(c===void 0){n[a]={by:r,of:l};continue}if(c.of!==l){const u=e===""?"":`${e}/`;throw new Error(`${u}${r}.png makes the model ${l} ${a==="height"?"high":a==="width"?"wide":"deep"}, and ${u}${c.by}.png makes it ${c.of} — the six sides are not faces of one box`)}}}return{width:n.width?.of??$c,height:n.height?.of??$c,depth:n.depth?.of??$c}}function $4(t){return t.toLowerCase().endsWith(".zip")?t.slice(0,-4):null}function Vf(t,e){if(t[e]!==void 0)return e;const n=`${e}.zip`;return t[n]!==void 0?n:null}async function k2(t,e){const n=await gl(e);return{name:t,parts:n.parts.map(r=>r.name),motions:n.motions.map(r=>r.name)}}class pi extends Error{constructor(e){super(e),this.name="PlaceBundleError"}}const S2=()=>bS(),E2=t=>({target:t.ScriptTarget.ES2019,module:t.ModuleKind.CommonJS,esModuleInterop:!0,isolatedModules:!0,skipLibCheck:!0}),A2=async(t,e,n)=>{const r=t.transpileModule(n,{fileName:e,compilerOptions:E2(t),reportDiagnostics:!0}),s=(r.diagnostics??[]).filter(i=>i.category===t.DiagnosticCategory.Error);if(s.length>0)throw new pi(s.map(i=>T2(t,e,n,i)).join(`
`));return r.outputText},T2=(t,e,n,r)=>{const s=r.start===void 0?{line:0,character:0}:t.getLineAndCharacterOfPosition(t.createSourceFile(e,n,t.ScriptTarget.Latest,!1),r.start),i=r.code,o=t.flattenDiagnosticMessageText(r.messageText," ");return`${e}:${s.line+1}:${s.character+1} — TS${i}: ${o}`},C2=(t,e,n)=>{const r=[],s=t.createSourceFile(e,n,t.ScriptTarget.Latest,!1,t.ScriptKind.TS);for(const i of s.statements)if(t.isImportDeclaration(i)&&!i.importClause?.isTypeOnly){const o=i.attributes?.elements.find(a=>a.name.text==="type");r.push({specifier:i.moduleSpecifier.text,isModelImport:o?.value?.text==="model"})}else t.isExportDeclaration(i)&&!i.isTypeOnly&&i.moduleSpecifier!==void 0&&r.push({specifier:i.moduleSpecifier.text,isModelImport:!1});return r},M2=(t,e)=>{if(e==="engine")return"engine";if(e.includes("://")||e.startsWith("/")||e.includes(".."))return null;const n=e.replace(/^\.\//,""),r=n.endsWith(".js")?`${n.slice(0,-3)}.ts`:`${n}.ts`;for(const s of[n,r,`${n}.js`,`${n}/index.ts`,`${n}/index.js`])if(t.has(s))return s;return null},Lc=t=>`\0model:${t}`,R2=async(t,e,n={})=>{const r=await S2();if(t[e]===void 0)throw new pi(`the entry script "${e}" is not a file of this project`);const s=Object.keys(t).sort(),i=new Set(s),o=new Map,a=new Set;for(const d of s){const f=C2(r,d,t[d]);o.set(d,f);for(const{specifier:m,isModelImport:p}of f)if(p){if(m.startsWith(".")||m.includes("://"))throw new pi(`${d} imports "${m}" as a model — a model import names a bare model, not a path`);if(Vf(n,m)===null)throw new pi(`${d} imports "${m}" as a model — this place carries no such model`);a.add(m)}}const l=[...a].sort(),c=new Map([...s,...l.map(Lc)].map((d,f)=>[d,f])),u=[];for(const d of s){const f=await A2(r,d,t[d]),m={};for(const{specifier:p,isModelImport:y}of o.get(d)){if(y){m[p]=c.get(Lc(p));continue}const g=M2(i,p);if(g===null)throw new pi(`${d} imports "${p}" — imports may only come from this place's own script files, or "engine"`);m[p]=g==="engine"?"engine":c.get(g)}u.push({path:d,code:f,requires:m})}for(const d of l){const f=Vf(n,d),m=await k2(d,n[f]);u.push({path:Lc(d),code:`module.exports = ${JSON.stringify(m)};`,requires:{}})}const h=c.get(e);return I2(u,h)},I2=(t,e)=>{const n=t.map(({path:r,code:s,requires:i})=>({path:r,code:s,requires:i}));return`var __modules = ${JSON.stringify(n)};
var __cache = [];
var __engineModule;
function __require(id) {
  if (id === "engine") {
    if (__engineModule === undefined) {
      __engineModule = {
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
    return __engineModule;
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
`};var Qs={JS_EVAL_TYPE_GLOBAL:0,JS_EVAL_TYPE_MODULE:1,JS_EVAL_FLAG_STRICT:8,JS_EVAL_FLAG_STRIP:16,JS_EVAL_FLAG_COMPILE_ONLY:32,JS_EVAL_FLAG_BACKTRACE_BARRIER:64},Gf={BaseObjects:1,Date:2,Eval:4,StringNormalize:8,RegExp:16,RegExpCompiler:32,JSON:64,Proxy:128,MapSet:256,TypedArrays:512,Promise:1024,BigInt:2048,BigFloat:4096,BigDecimal:8192,OperatorOverloading:16384,BignumExt:32768},Dc={Pending:0,Fulfilled:1,Rejected:2},Ks={JS_GPN_STRING_MASK:1,JS_GPN_SYMBOL_MASK:2,JS_GPN_PRIVATE_MASK:4,JS_GPN_ENUM_ONLY:16,QTS_GPN_NUMBER_MASK:64,QTS_STANDARD_COMPLIANT_NUMBER:128},la={IsStrictlyEqual:0,IsSameValue:1,IsSameValueZero:2},z2=Object.defineProperty,P2=(t,e)=>{for(var n in e)z2(t,n,{get:e[n],enumerable:!0})};function co(...t){}var O2={};P2(O2,{QuickJSAsyncifyError:()=>g0,QuickJSAsyncifySuspended:()=>y0,QuickJSEmptyGetOwnPropertyNames:()=>w0,QuickJSEmscriptenModuleError:()=>eh,QuickJSHostRefInvalid:()=>os,QuickJSHostRefRangeExceeded:()=>_0,QuickJSMemoryLeakDetected:()=>$2,QuickJSNotImplemented:()=>m0,QuickJSPromisePending:()=>v0,QuickJSUnknownIntrinsic:()=>b0,QuickJSUnwrapError:()=>Qu,QuickJSUseAfterFree:()=>Ku,QuickJSWrongOwner:()=>p0});var Qu=class extends Error{constructor(t,e){let n=typeof t=="object"&&t&&"message"in t?String(t.message):String(t);super(n),this.cause=t,this.context=e,this.name="QuickJSUnwrapError"}},p0=class extends Error{constructor(){super(...arguments),this.name="QuickJSWrongOwner"}},Ku=class extends Error{constructor(){super(...arguments),this.name="QuickJSUseAfterFree"}},m0=class extends Error{constructor(){super(...arguments),this.name="QuickJSNotImplemented"}},g0=class extends Error{constructor(){super(...arguments),this.name="QuickJSAsyncifyError"}},y0=class extends Error{constructor(){super(...arguments),this.name="QuickJSAsyncifySuspended"}},$2=class extends Error{constructor(){super(...arguments),this.name="QuickJSMemoryLeakDetected"}},eh=class extends Error{constructor(){super(...arguments),this.name="QuickJSEmscriptenModuleError"}},b0=class extends TypeError{constructor(){super(...arguments),this.name="QuickJSUnknownIntrinsic"}},v0=class extends Error{constructor(){super(...arguments),this.name="QuickJSPromisePending"}},w0=class extends Error{constructor(){super(...arguments),this.name="QuickJSEmptyGetOwnPropertyNames"}},_0=class extends Error{constructor(){super(...arguments),this.name="QuickJSHostRefRangeExceeded"}},os=class extends Error{constructor(){super(...arguments),this.name="QuickJSHostRefInvalid"}};function*x0(t){return yield t}function L2(t){return x0(nd(t))}var td=x0;td.of=L2;function Yf(t,e){return(...n)=>{let r=e.call(t,td,...n);return nd(r)}}function D2(t,e){let n=e.call(t,td);return nd(n)}function nd(t){function e(n){return n.done?n.value:n.value instanceof Promise?n.value.then(r=>e(t.next(r)),r=>e(t.throw(r))):e(t.next(n.value))}return e(t.next())}var Kr=class{[Symbol.dispose](){return this.dispose()}},th=Symbol.dispose??Symbol.for("Symbol.dispose"),qf=Kr.prototype;qf[th]||(qf[th]=function(){return this.dispose()});var an=class k0 extends Kr{constructor(e,n,r,s){super(),this._value=e,this.copier=n,this.disposer=r,this._owner=s,this._alive=!0,this._constructorStack=void 0}get alive(){return this._alive}get value(){return this.assertAlive(),this._value}get owner(){return this._owner}get dupable(){return!!this.copier}dup(){if(this.assertAlive(),!this.copier)throw new Error("Non-dupable lifetime");return new k0(this.copier(this._value),this.copier,this.disposer,this._owner)}consume(e){this.assertAlive();let n=e(this);return this.dispose(),n}map(e){return this.assertAlive(),e(this)}tap(e){return e(this),this}dispose(){this.assertAlive(),this.disposer&&this.disposer(this._value),this._alive=!1}assertAlive(){if(!this.alive)throw this._constructorStack?new Ku(`Lifetime not alive
${this._constructorStack}
Lifetime used`):new Ku("Lifetime not alive")}},Rs=class extends an{constructor(t,e){super(t,void 0,void 0,e)}get dupable(){return!0}dup(){return this}dispose(){}},Xf=class extends an{constructor(t,e,n,r){super(t,e,n,r)}dispose(){this._alive=!1}};function Nc(t,e){let n;try{t.dispose()}catch(r){n=r}if(e&&n)throw Object.assign(e,{message:`${e.message}
 Then, failed to dispose scope: ${n.message}`,disposeError:n}),e;if(e||n)throw e||n}var gr=class $a extends Kr{constructor(){super(...arguments),this._disposables=new an(new Set),this.manage=e=>(this._disposables.value.add(e),e)}static withScope(e){let n=new $a,r;try{return e(n)}catch(s){throw r=s,s}finally{Nc(n,r)}}static withScopeMaybeAsync(e,n){return D2(void 0,function*(r){let s=new $a,i;try{return yield*r.of(n.call(e,r,s))}catch(o){throw i=o,o}finally{Nc(s,i)}})}static async withScopeAsync(e){let n=new $a,r;try{return await e(n)}catch(s){throw r=s,s}finally{Nc(n,r)}}get alive(){return this._disposables.alive}dispose(){let e=Array.from(this._disposables.value.values()).reverse();for(let n of e)n.alive&&n.dispose();this._disposables.dispose()}};function N2(t){let e=t?Array.from(t):[];function n(){return e.forEach(s=>s.alive?s.dispose():void 0)}function r(){return e.some(s=>s.alive)}return Object.defineProperty(e,th,{configurable:!0,enumerable:!1,value:n}),Object.defineProperty(e,"dispose",{configurable:!0,enumerable:!1,value:n}),Object.defineProperty(e,"alive",{configurable:!0,enumerable:!1,get:r}),e}function yl(t){return!!(t&&(typeof t=="object"||typeof t=="function")&&"alive"in t&&typeof t.alive=="boolean"&&"dispose"in t&&typeof t.dispose=="function")}var rd=class S0 extends Kr{static success(e){return new F2(e)}static fail(e,n){return new B2(e,n)}static is(e){return e instanceof S0}},F2=class extends rd{constructor(t){super(),this.value=t}get alive(){return yl(this.value)?this.value.alive:!0}dispose(){yl(this.value)&&this.value.dispose()}unwrap(){return this.value}unwrapOr(t){return this.value}},B2=class extends rd{constructor(t,e){super(),this.error=t,this.onUnwrap=e}get alive(){return yl(this.error)?this.error.alive:!0}dispose(){yl(this.error)&&this.error.dispose()}unwrap(){throw this.onUnwrap(this),this.error}unwrapOr(t){return t}},xi=rd,U2=class extends Kr{constructor(t){super(),this.resolve=e=>{this.resolveHandle.alive&&(this.context.unwrapResult(this.context.callFunction(this.resolveHandle,this.context.undefined,e||this.context.undefined)).dispose(),this.disposeResolvers(),this.onSettled())},this.reject=e=>{this.rejectHandle.alive&&(this.context.unwrapResult(this.context.callFunction(this.rejectHandle,this.context.undefined,e||this.context.undefined)).dispose(),this.disposeResolvers(),this.onSettled())},this.dispose=()=>{this.handle.alive&&this.handle.dispose(),this.disposeResolvers()},this.context=t.context,this.owner=t.context.runtime,this.handle=t.promiseHandle,this.settled=new Promise(e=>{this.onSettled=e}),this.resolveHandle=t.resolveHandle,this.rejectHandle=t.rejectHandle}get alive(){return this.handle.alive||this.resolveHandle.alive||this.rejectHandle.alive}disposeResolvers(){this.resolveHandle.alive&&this.resolveHandle.dispose(),this.rejectHandle.alive&&this.rejectHandle.dispose()}},E0=class{constructor(t){this.module=t}toPointerArray(t){let e=new Int32Array(t.map(s=>s.value)),n=e.length*e.BYTES_PER_ELEMENT,r=this.module._malloc(n);return new Uint8Array(this.module.HEAPU8.buffer,r,n).set(new Uint8Array(e.buffer)),new an(r,void 0,s=>this.module._free(s))}newTypedArray(t,e){let n=new t(new Array(e).fill(0)),r=n.length*n.BYTES_PER_ELEMENT,s=this.module._malloc(r),i=new t(this.module.HEAPU8.buffer,s,e);return i.set(n),new an({typedArray:i,ptr:s},void 0,o=>this.module._free(o.ptr))}newMutablePointerArray(t){return this.newTypedArray(Int32Array,t)}newHeapCharPointer(t){let e=this.module.lengthBytesUTF8(t),n=e+1,r=this.module._malloc(n);return this.module.stringToUTF8(t,r,n),new an({ptr:r,strlen:e},void 0,s=>this.module._free(s.ptr))}newHeapBufferPointer(t){let e=t.byteLength,n=this.module._malloc(e);return this.module.HEAPU8.set(t,n),new an({pointer:n,numBytes:e},void 0,r=>this.module._free(r.pointer))}consumeHeapCharPointer(t){let e=this.module.UTF8ToString(t);return this.module._free(t),e}};function H2(t){if(!t)return 0;let e=0;for(let[n,r]of Object.entries(t)){if(!(n in Gf))throw new b0(n);r&&(e|=Gf[n])}return e}function j2(t){if(typeof t=="number")return t;if(t===void 0)return 0;let{type:e,strict:n,strip:r,compileOnly:s,backtraceBarrier:i}=t,o=0;return e==="global"&&(o|=Qs.JS_EVAL_TYPE_GLOBAL),e==="module"&&(o|=Qs.JS_EVAL_TYPE_MODULE),n&&(o|=Qs.JS_EVAL_FLAG_STRICT),r&&(o|=Qs.JS_EVAL_FLAG_STRIP),s&&(o|=Qs.JS_EVAL_FLAG_COMPILE_ONLY),i&&(o|=Qs.JS_EVAL_FLAG_BACKTRACE_BARRIER),o}function W2(t){if(typeof t=="number")return t;if(t===void 0)return 0;let{strings:e,symbols:n,quickjsPrivate:r,onlyEnumerable:s,numbers:i,numbersAsStrings:o}=t,a=0;return e&&(a|=Ks.JS_GPN_STRING_MASK),n&&(a|=Ks.JS_GPN_SYMBOL_MASK),r&&(a|=Ks.JS_GPN_PRIVATE_MASK),s&&(a|=Ks.JS_GPN_ENUM_ONLY),i&&(a|=Ks.QTS_GPN_NUMBER_MASK),o&&(a|=Ks.QTS_STANDARD_COMPLIANT_NUMBER),a}function V2(...t){let e=[];for(let n of t)n!==void 0&&(e=e.concat(n));return e}var G2=class extends Kr{constructor(t,e){super(),this.handle=t,this.context=e,this._isDone=!1,this.owner=e.runtime}[Symbol.iterator](){return this}next(t){if(!this.alive||this._isDone)return{done:!0,value:void 0};let e=this._next??(this._next=this.context.getProp(this.handle,"next"));return this.callIteratorMethod(e,t)}return(t){if(!this.alive)return{done:!0,value:void 0};let e=this.context.getProp(this.handle,"return");if(e===this.context.undefined&&t===void 0)return this.dispose(),{done:!0,value:void 0};let n=this.callIteratorMethod(e,t);return e.dispose(),this.dispose(),n}throw(t){if(!this.alive)return{done:!0,value:void 0};let e=t instanceof an?t:this.context.newError(t),n=this.context.getProp(this.handle,"throw"),r=this.callIteratorMethod(n,t);return e.alive&&e.dispose(),n.dispose(),this.dispose(),r}get alive(){return this.handle.alive}dispose(){this._isDone=!0,this.handle.dispose(),this._next?.dispose()}callIteratorMethod(t,e){let n=e?this.context.callFunction(t,this.handle,e):this.context.callFunction(t,this.handle);if(n.error)return this.dispose(),{value:n};let r=this.context.getProp(n.value,"done").consume(i=>this.context.dump(i)),s=this.context.getProp(n.value,"value");return n.value.dispose(),r&&this.dispose(),{value:xi.success(s),done:r}}},Zf=-2147483648,Jf=2147483647,La=0;function Fc(t){return t>>8}var Y2=class{constructor(){this.nextId=Zf,this.freelist=[],this.groups=new Map}put(t){let e=this.allocateId(),n=Fc(e),r=this.groups.get(n);return r||(r=new Map,this.groups.set(n,r)),r.set(e,t),e}get(t){if(t===La)throw new os("no host reference id defined");let e=Fc(t),n=this.groups.get(e);if(!n)throw new os(`host reference id ${t} is not defined`);let r=n.get(t);if(!r)throw new os(`host reference id ${t} is not defined`);return r}delete(t){if(t===La)throw new os("no host reference id defined");let e=Fc(t),n=this.groups.get(e);if(!n)throw new os(`host reference id ${t} is not defined`);n.delete(t),n.size===0&&this.groups.delete(e),this.freelist.push(t)}allocateId(){if(this.freelist.length>0)return this.freelist.shift();if(this.nextId===La&&this.nextId++,this.nextId>Jf)throw new _0(`HostRefMap: too many host refs created without disposing. Max simultaneous host refs: ${Jf-Zf}`);return this.nextId++}},Qf=class extends Kr{constructor(t,e,n){if(n===La)throw new os("cannot create HostRef with undefined id");super(),this.runtime=t,this.handle=e,this.id=n}get alive(){return this.handle.alive}dispose(){this.handle.dispose()}get value(){return this.runtime.hostRefs.get(this.id)}},q2=class extends E0{constructor(t){super(t.module),this.scope=new gr,this.copyJSValue=e=>this.ffi.QTS_DupValuePointer(this.ctx.value,e),this.freeJSValue=e=>{this.ffi.QTS_FreeValuePointer(this.ctx.value,e)},t.ownedLifetimes?.forEach(e=>this.scope.manage(e)),this.owner=t.owner,this.module=t.module,this.ffi=t.ffi,this.rt=t.rt,this.ctx=this.scope.manage(t.ctx)}get alive(){return this.scope.alive}dispose(){return this.scope.dispose()}[Symbol.dispose](){return this.dispose()}manage(t){return this.scope.manage(t)}consumeJSCharPointer(t){let e=this.module.UTF8ToString(t);return this.ffi.QTS_FreeCString(this.ctx.value,t),e}heapValueHandle(t,e){let n=e?r=>{e(),this.freeJSValue(r)}:this.freeJSValue;return new an(t,this.copyJSValue,n,this.owner)}staticHeapValueHandle(t){return this.manage(this.heapValueHandle(t)),new Rs(t,this.owner)}},X2=class extends Kr{constructor(t){super(),this._undefined=void 0,this._null=void 0,this._false=void 0,this._true=void 0,this._global=void 0,this._BigInt=void 0,this._Symbol=void 0,this._SymbolIterator=void 0,this._SymbolAsyncIterator=void 0,this.cToHostCallbacks={callFunction:(e,n,r,s,i)=>{if(e!==this.ctx.value)throw new Error("QuickJSContext instance received C -> JS call with mismatched ctx");let o=this.getFunction(i);return gr.withScopeMaybeAsync(this,function*(a,l){let c=l.manage(new Xf(n,this.memory.copyJSValue,this.memory.freeJSValue,this.runtime)),u=new Array(r);for(let h=0;h<r;h++){let d=this.ffi.QTS_ArgvGetJSValueConstPointer(s,h);u[h]=l.manage(new Xf(d,this.memory.copyJSValue,this.memory.freeJSValue,this.runtime))}try{let h=yield*a(o.apply(c,u));if(h){if("error"in h&&h.error)throw this.runtime.debugLog("throw error",h.error),h.error;let d=l.manage(h instanceof an?h:h.value);return this.ffi.QTS_DupValuePointer(this.ctx.value,d.value)}return 0}catch(h){return this.errorToHandle(h).consume(d=>this.ffi.QTS_Throw(this.ctx.value,d.value))}})}},this.runtime=t.runtime,this.module=t.module,this.ffi=t.ffi,this.rt=t.rt,this.ctx=t.ctx,this.memory=new q2({...t,owner:this.runtime}),t.callbacks.setContextCallbacks(this.ctx.value,this.cToHostCallbacks),this.dump=this.dump.bind(this),this.getString=this.getString.bind(this),this.getNumber=this.getNumber.bind(this),this.resolvePromise=this.resolvePromise.bind(this),this.uint32Out=this.memory.manage(this.memory.newTypedArray(Uint32Array,1))}get alive(){return this.memory.alive}dispose(){this.memory.dispose()}get undefined(){if(this._undefined)return this._undefined;let t=this.ffi.QTS_GetUndefined();return this._undefined=new Rs(t)}get null(){if(this._null)return this._null;let t=this.ffi.QTS_GetNull();return this._null=new Rs(t)}get true(){if(this._true)return this._true;let t=this.ffi.QTS_GetTrue();return this._true=new Rs(t)}get false(){if(this._false)return this._false;let t=this.ffi.QTS_GetFalse();return this._false=new Rs(t)}get global(){if(this._global)return this._global;let t=this.ffi.QTS_GetGlobalObject(this.ctx.value);return this._global=this.memory.staticHeapValueHandle(t),this._global}newNumber(t){return this.memory.heapValueHandle(this.ffi.QTS_NewFloat64(this.ctx.value,t))}newString(t){let e=this.memory.newHeapCharPointer(t).consume(n=>this.ffi.QTS_NewString(this.ctx.value,n.value.ptr));return this.memory.heapValueHandle(e)}newUniqueSymbol(t){let e=(typeof t=="symbol"?t.description:t)??"",n=this.memory.newHeapCharPointer(e).consume(r=>this.ffi.QTS_NewSymbol(this.ctx.value,r.value.ptr,0));return this.memory.heapValueHandle(n)}newSymbolFor(t){let e=(typeof t=="symbol"?t.description:t)??"",n=this.memory.newHeapCharPointer(e).consume(r=>this.ffi.QTS_NewSymbol(this.ctx.value,r.value.ptr,1));return this.memory.heapValueHandle(n)}getWellKnownSymbol(t){return this._Symbol??(this._Symbol=this.memory.manage(this.getProp(this.global,"Symbol"))),this.getProp(this._Symbol,t)}newBigInt(t){if(!this._BigInt){let r=this.getProp(this.global,"BigInt");this.memory.manage(r),this._BigInt=new Rs(r.value,this.runtime)}let e=this._BigInt,n=String(t);return this.newString(n).consume(r=>this.unwrapResult(this.callFunction(e,this.undefined,r)))}newObject(t){t&&this.runtime.assertOwned(t);let e=t?this.ffi.QTS_NewObjectProto(this.ctx.value,t.value):this.ffi.QTS_NewObject(this.ctx.value);return this.memory.heapValueHandle(e)}newArray(){let t=this.ffi.QTS_NewArray(this.ctx.value);return this.memory.heapValueHandle(t)}newArrayBuffer(t){let e=new Uint8Array(t),n=this.memory.newHeapBufferPointer(e),r=this.ffi.QTS_NewArrayBuffer(this.ctx.value,n.value.pointer,e.length);return this.memory.heapValueHandle(r)}newPromise(t){let e=gr.withScope(n=>{let r=n.manage(this.memory.newMutablePointerArray(2)),s=this.ffi.QTS_NewPromiseCapability(this.ctx.value,r.value.ptr),i=this.memory.heapValueHandle(s),[o,a]=Array.from(r.value.typedArray).map(l=>this.memory.heapValueHandle(l));return new U2({context:this,promiseHandle:i,resolveHandle:o,rejectHandle:a})});return t&&typeof t=="function"&&(t=new Promise(t)),t&&Promise.resolve(t).then(e.resolve,n=>n instanceof an?e.reject(n):this.newError(n).consume(e.reject)),e}newFunction(t,e){let n=typeof t=="function"?t:e;if(!n)throw new TypeError("Expected a function");return this.newFunctionWithOptions({name:typeof t=="string"?t:void 0,length:n.length,isConstructor:!1,fn:n})}newConstructorFunction(t,e){let n=typeof t=="function"?t:e;if(!n)throw new TypeError("Expected a function");return this.newFunctionWithOptions({name:typeof t=="string"?t:void 0,length:n.length,isConstructor:!0,fn:n})}newFunctionWithOptions(t){let{name:e,length:n,isConstructor:r,fn:s}=t,i=this.runtime.hostRefs.put(s);try{return this.memory.heapValueHandle(this.ffi.QTS_NewFunction(this.ctx.value,e??"",n,r,i))}catch(o){throw this.runtime.hostRefs.delete(i),o}}newError(t){let e=this.memory.heapValueHandle(this.ffi.QTS_NewError(this.ctx.value));return t&&typeof t=="object"?(t.name!==void 0&&this.newString(t.name).consume(n=>this.setProp(e,"name",n)),t.message!==void 0&&this.newString(t.message).consume(n=>this.setProp(e,"message",n))):typeof t=="string"?this.newString(t).consume(n=>this.setProp(e,"message",n)):t!==void 0&&this.newString(String(t)).consume(n=>this.setProp(e,"message",n)),e}newHostRef(t){let e=this.runtime.hostRefs.put(t);try{let n=this.memory.heapValueHandle(this.ffi.QTS_NewHostRef(this.ctx.value,e));return new Qf(this.runtime,n,e)}catch(n){throw this.runtime.hostRefs.delete(e),n}}toHostRef(t){let e=this.ffi.QTS_GetHostRefId(t.value);if(e!==0)return this.runtime.hostRefs.get(e),new Qf(this.runtime,t.dup(),e)}unwrapHostRef(t){let e=this.ffi.QTS_GetHostRefId(t.value);if(e===0)throw new os("handle is not a HostRef");return this.runtime.hostRefs.get(e)}typeof(t){return this.runtime.assertOwned(t),this.memory.consumeHeapCharPointer(this.ffi.QTS_Typeof(this.ctx.value,t.value))}getNumber(t){return this.runtime.assertOwned(t),this.ffi.QTS_GetFloat64(this.ctx.value,t.value)}getString(t){return this.runtime.assertOwned(t),this.memory.consumeJSCharPointer(this.ffi.QTS_GetString(this.ctx.value,t.value))}getSymbol(t){this.runtime.assertOwned(t);let e=this.memory.consumeJSCharPointer(this.ffi.QTS_GetSymbolDescriptionOrKey(this.ctx.value,t.value));return this.ffi.QTS_IsGlobalSymbol(this.ctx.value,t.value)?Symbol.for(e):Symbol(e)}getBigInt(t){this.runtime.assertOwned(t);let e=this.getString(t);return BigInt(e)}getArrayBuffer(t){this.runtime.assertOwned(t);let e=this.ffi.QTS_GetArrayBufferLength(this.ctx.value,t.value),n=this.ffi.QTS_GetArrayBuffer(this.ctx.value,t.value);if(!n)throw new Error("Couldn't allocate memory to get ArrayBuffer");return new an(this.module.HEAPU8.subarray(n,n+e),void 0,()=>this.module._free(n))}getPromiseState(t){this.runtime.assertOwned(t);let e=this.ffi.QTS_PromiseState(this.ctx.value,t.value);if(e<0)return{type:"fulfilled",value:t,notAPromise:!0};if(e===Dc.Pending)return{type:"pending",get error(){return new v0("Cannot unwrap a pending promise")}};let n=this.ffi.QTS_PromiseResult(this.ctx.value,t.value),r=this.memory.heapValueHandle(n);if(e===Dc.Fulfilled)return{type:"fulfilled",value:r};if(e===Dc.Rejected)return{type:"rejected",error:r};throw r.dispose(),new Error(`Unknown JSPromiseStateEnum: ${e}`)}resolvePromise(t){this.runtime.assertOwned(t);let e=gr.withScope(n=>{let r=n.manage(this.getProp(this.global,"Promise")),s=n.manage(this.getProp(r,"resolve"));return this.callFunction(s,r,t)});return e.error?Promise.resolve(e):new Promise(n=>{gr.withScope(r=>{let s=r.manage(this.newFunction("resolve",l=>{n(this.success(l&&l.dup()))})),i=r.manage(this.newFunction("reject",l=>{n(this.fail(l&&l.dup()))})),o=r.manage(e.value),a=r.manage(this.getProp(o,"then"));this.callFunction(a,o,s,i).unwrap().dispose()})})}isEqual(t,e,n=la.IsStrictlyEqual){if(t===e)return!0;this.runtime.assertOwned(t),this.runtime.assertOwned(e);let r=this.ffi.QTS_IsEqual(this.ctx.value,t.value,e.value,n);if(r===-1)throw new m0("WASM variant does not expose equality");return!!r}eq(t,e){return this.isEqual(t,e,la.IsStrictlyEqual)}sameValue(t,e){return this.isEqual(t,e,la.IsSameValue)}sameValueZero(t,e){return this.isEqual(t,e,la.IsSameValueZero)}getProp(t,e){this.runtime.assertOwned(t);let n;return typeof e=="number"&&e>=0?n=this.ffi.QTS_GetPropNumber(this.ctx.value,t.value,e):n=this.borrowPropertyKey(e).consume(r=>this.ffi.QTS_GetProp(this.ctx.value,t.value,r.value)),this.memory.heapValueHandle(n)}getLength(t){if(this.runtime.assertOwned(t),!(this.ffi.QTS_GetLength(this.ctx.value,this.uint32Out.value.ptr,t.value)<0))return this.uint32Out.value.typedArray[0]}getOwnPropertyNames(t,e={strings:!0,numbersAsStrings:!0}){this.runtime.assertOwned(t),t.value;let n=W2(e);if(n===0)throw new w0("No options set, will return an empty array");return gr.withScope(r=>{let s=r.manage(this.memory.newMutablePointerArray(1)),i=this.ffi.QTS_GetOwnPropertyNames(this.ctx.value,s.value.ptr,this.uint32Out.value.ptr,t.value,n);if(i)return this.fail(this.memory.heapValueHandle(i));let o=this.uint32Out.value.typedArray[0],a=s.value.typedArray[0],l=new Uint32Array(this.module.HEAP8.buffer,a,o),c=Array.from(l).map(u=>this.memory.heapValueHandle(u));return this.ffi.QTS_FreeVoidPointer(this.ctx.value,a),this.success(N2(c))})}getIterator(t){let e=this._SymbolIterator??(this._SymbolIterator=this.memory.manage(this.getWellKnownSymbol("iterator")));return gr.withScope(n=>{let r=n.manage(this.getProp(t,e)),s=this.callFunction(r,t);return s.error?s:this.success(new G2(s.value,this))})}setProp(t,e,n){this.runtime.assertOwned(t),this.borrowPropertyKey(e).consume(r=>this.ffi.QTS_SetProp(this.ctx.value,t.value,r.value,n.value))}defineProp(t,e,n){this.runtime.assertOwned(t),gr.withScope(r=>{let s=r.manage(this.borrowPropertyKey(e)),i=n.value||this.undefined,o=!!n.configurable,a=!!n.enumerable,l=!!n.value,c=n.get?r.manage(this.newFunction(n.get.name,n.get)):this.undefined,u=n.set?r.manage(this.newFunction(n.set.name,n.set)):this.undefined;this.ffi.QTS_DefineProp(this.ctx.value,t.value,s.value,i.value,c.value,u.value,o,a,l)})}callFunction(t,e,...n){this.runtime.assertOwned(t);let r,s=n[0];s===void 0||Array.isArray(s)?r=s??[]:r=n;let i=this.memory.toPointerArray(r).consume(a=>this.ffi.QTS_Call(this.ctx.value,t.value,e.value,r.length,a.value)),o=this.ffi.QTS_ResolveException(this.ctx.value,i);return o?(this.ffi.QTS_FreeValuePointer(this.ctx.value,i),this.fail(this.memory.heapValueHandle(o))):this.success(this.memory.heapValueHandle(i))}callMethod(t,e,n=[]){return this.getProp(t,e).consume(r=>this.callFunction(r,t,n))}evalCode(t,e="eval.js",n){let r=n===void 0?1:0,s=j2(n),i=this.memory.newHeapCharPointer(t).consume(a=>this.ffi.QTS_Eval(this.ctx.value,a.value.ptr,a.value.strlen,e,r,s)),o=this.ffi.QTS_ResolveException(this.ctx.value,i);return o?(this.ffi.QTS_FreeValuePointer(this.ctx.value,i),this.fail(this.memory.heapValueHandle(o))):this.success(this.memory.heapValueHandle(i))}throw(t){return this.errorToHandle(t).consume(e=>this.ffi.QTS_Throw(this.ctx.value,e.value))}borrowPropertyKey(t){return typeof t=="number"?this.newNumber(t):typeof t=="string"?this.newString(t):new Rs(t.value,this.runtime)}getMemory(t){if(t===this.rt.value)return this.memory;throw new Error("Private API. Cannot get memory from a different runtime")}dump(t){this.runtime.assertOwned(t);let e=this.typeof(t);if(e==="string")return this.getString(t);if(e==="number")return this.getNumber(t);if(e==="bigint")return this.getBigInt(t);if(e==="undefined")return;if(e==="symbol")return this.getSymbol(t);let n=this.getPromiseState(t);if(n.type==="fulfilled"&&!n.notAPromise)return t.dispose(),{type:n.type,value:n.value.consume(this.dump)};if(n.type==="pending")return t.dispose(),{type:n.type};if(n.type==="rejected")return t.dispose(),{type:n.type,error:n.error.consume(this.dump)};let r=this.memory.consumeJSCharPointer(this.ffi.QTS_Dump(this.ctx.value,t.value));try{return JSON.parse(r)}catch{return r}}unwrapResult(t){if(t.error){let e="context"in t.error?t.error.context:this,n=t.error.consume(r=>this.dump(r));if(n&&typeof n=="object"&&typeof n.message=="string"){let{message:r,name:s,stack:i,...o}=n,a=new Qu(n,e);typeof s=="string"&&(a.name=n.name),a.message=r;let l=a.stack;throw typeof i=="string"&&(a.stack=`${s}: ${r}
${n.stack}Host: ${l}`),Object.assign(a,o),a}throw new Qu(n)}return t.value}[Symbol.for("nodejs.util.inspect.custom")](){return this.alive?`${this.constructor.name} { ctx: ${this.ctx.value} rt: ${this.rt.value} }`:`${this.constructor.name} { disposed }`}getFunction(t){let e=this.runtime.hostRefs.get(t);if(typeof e!="function")throw new Error(`Host reference ${t} is not a function`);return e}errorToHandle(t){return t instanceof an?t:this.newError(t)}encodeBinaryJSON(t){let e=this.ffi.QTS_bjson_encode(this.ctx.value,t.value);return this.memory.heapValueHandle(e)}decodeBinaryJSON(t){let e=this.ffi.QTS_bjson_decode(this.ctx.value,t.value);return this.memory.heapValueHandle(e)}success(t){return xi.success(t)}fail(t){return xi.fail(t,e=>this.unwrapResult(e))}},Z2=class extends Kr{constructor(t){super(),this.scope=new gr,this.contextMap=new Map,this.hostRefs=new Y2,this._debugMode=!1,this.cToHostCallbacks={freeHostRef:(e,n)=>{if(e!==this.rt.value)throw new Error("Runtime pointer mismatch");this.hostRefs.delete(n)},shouldInterrupt:e=>{if(e!==this.rt.value)throw new Error("QuickJSContext instance received C -> JS interrupt with mismatched rt");let n=this.interruptHandler;if(!n)throw new Error("QuickJSContext had no interrupt handler");return n(this)?1:0},loadModuleSource:Yf(this,function*(e,n,r,s){let i=this.moduleLoader;if(!i)throw new Error("Runtime has no module loader");if(n!==this.rt.value)throw new Error("Runtime pointer mismatch");let o=this.contextMap.get(r)??this.newContext({contextPointer:r});try{let a=yield*e(i(s,o));if(typeof a=="object"&&"error"in a&&a.error)throw this.debugLog("cToHostLoadModule: loader returned error",a.error),a.error;let l=typeof a=="string"?a:"value"in a?a.value:a;return this.memory.newHeapCharPointer(l).value.ptr}catch(a){return this.debugLog("cToHostLoadModule: caught error",a),o.throw(a),0}}),normalizeModule:Yf(this,function*(e,n,r,s,i){let o=this.moduleNormalizer;if(!o)throw new Error("Runtime has no module normalizer");if(n!==this.rt.value)throw new Error("Runtime pointer mismatch");let a=this.contextMap.get(r)??this.newContext({contextPointer:r});try{let l=yield*e(o(s,i,a));if(typeof l=="object"&&"error"in l&&l.error)throw this.debugLog("cToHostNormalizeModule: normalizer returned error",l.error),l.error;let c=typeof l=="string"?l:l.value;return a.getMemory(this.rt.value).newHeapCharPointer(c).value.ptr}catch(l){return this.debugLog("normalizeModule: caught error",l),a.throw(l),0}})},t.ownedLifetimes?.forEach(e=>this.scope.manage(e)),this.module=t.module,this.memory=new E0(this.module),this.ffi=t.ffi,this.rt=t.rt,this.callbacks=t.callbacks,this.scope.manage(this.rt),this.callbacks.setRuntimeCallbacks(this.rt.value,this.cToHostCallbacks),this.executePendingJobs=this.executePendingJobs.bind(this)}get alive(){return this.scope.alive}dispose(){return this.scope.dispose()}newContext(t={}){let e=H2(t.intrinsics),n=new an(t.contextPointer||this.ffi.QTS_NewContext(this.rt.value,e),void 0,s=>{this.contextMap.delete(s),this.callbacks.deleteContext(s),this.ffi.QTS_FreeContext(s)}),r=new X2({module:this.module,ctx:n,ffi:this.ffi,rt:this.rt,ownedLifetimes:t.ownedLifetimes,runtime:this,callbacks:this.callbacks});return this.contextMap.set(n.value,r),r}setModuleLoader(t,e){this.moduleLoader=t,this.moduleNormalizer=e,this.ffi.QTS_RuntimeEnableModuleLoader(this.rt.value,this.moduleNormalizer?1:0)}removeModuleLoader(){this.moduleLoader=void 0,this.ffi.QTS_RuntimeDisableModuleLoader(this.rt.value)}hasPendingJob(){return!!this.ffi.QTS_IsJobPending(this.rt.value)}setInterruptHandler(t){let e=this.interruptHandler;this.interruptHandler=t,e||this.ffi.QTS_RuntimeEnableInterruptHandler(this.rt.value)}removeInterruptHandler(){this.interruptHandler&&(this.ffi.QTS_RuntimeDisableInterruptHandler(this.rt.value),this.interruptHandler=void 0)}executePendingJobs(t=-1){let e=this.memory.newMutablePointerArray(1),n=this.ffi.QTS_ExecutePendingJob(this.rt.value,t??-1,e.value.ptr),r=e.value.typedArray[0];if(e.dispose(),r===0)return this.ffi.QTS_FreeValuePointerRuntime(this.rt.value,n),xi.success(0);let s=this.contextMap.get(r)??this.newContext({contextPointer:r}),i=s.getMemory(this.rt.value).heapValueHandle(n);if(s.typeof(i)==="number"){let o=s.getNumber(i);return i.dispose(),xi.success(o)}else{let o=Object.assign(i,{context:s});return xi.fail(o,a=>s.unwrapResult(a))}}setMemoryLimit(t){if(t<0&&t!==-1)throw new Error("Cannot set memory limit to negative number. To unset, pass -1");this.ffi.QTS_RuntimeSetMemoryLimit(this.rt.value,t)}computeMemoryUsage(){let t=this.getSystemContext().getMemory(this.rt.value);return t.heapValueHandle(this.ffi.QTS_RuntimeComputeMemoryUsage(this.rt.value,t.ctx.value))}dumpMemoryUsage(){return this.memory.consumeHeapCharPointer(this.ffi.QTS_RuntimeDumpMemoryUsage(this.rt.value))}setMaxStackSize(t){if(t<0)throw new Error("Cannot set memory limit to negative number. To unset, pass 0.");this.ffi.QTS_RuntimeSetMaxStackSize(this.rt.value,t)}assertOwned(t){if(t.owner&&t.owner.rt!==this.rt)throw new p0(`Handle is not owned by this runtime: ${t.owner.rt.value} != ${this.rt.value}`)}setDebugMode(t){this._debugMode=t,this.ffi.DEBUG&&this.rt.alive&&this.ffi.QTS_SetDebugLogEnabled(this.rt.value,t?1:0)}isDebugMode(){return this._debugMode}debugLog(...t){this._debugMode&&console.log("quickjs-emscripten:",...t)}[Symbol.for("nodejs.util.inspect.custom")](){return this.alive?`${this.constructor.name} { rt: ${this.rt.value} }`:`${this.constructor.name} { disposed }`}getSystemContext(){return this.context||(this.context=this.scope.manage(this.newContext())),this.context}},J2=class{constructor(t){this.freeHostRef=t.freeHostRef,this.callFunction=t.callFunction,this.shouldInterrupt=t.shouldInterrupt,this.loadModuleSource=t.loadModuleSource,this.normalizeModule=t.normalizeModule}},A0=class{constructor(t){this.contextCallbacks=new Map,this.runtimeCallbacks=new Map,this.suspendedCount=0,this.cToHostCallbacks=new J2({freeHostRef:(e,n,r)=>{let s=this.runtimeCallbacks.get(n);if(!s)throw new Error(`QuickJSRuntime(rt = ${n}) not found when trying to free HostRef(id = ${r})`);s.freeHostRef(n,r)},callFunction:(e,n,r,s,i,o)=>this.handleAsyncify(e,()=>{try{let a=this.contextCallbacks.get(n);if(!a)throw new Error(`QuickJSContext(ctx = ${n}) not found for C function call "${o}"`);return a.callFunction(n,r,s,i,o)}catch(a){return console.error("[C to host error: returning null]",a),0}}),shouldInterrupt:(e,n)=>this.handleAsyncify(e,()=>{try{let r=this.runtimeCallbacks.get(n);if(!r)throw new Error(`QuickJSRuntime(rt = ${n}) not found for C interrupt`);return r.shouldInterrupt(n)}catch(r){return console.error("[C to host interrupt: returning error]",r),1}}),loadModuleSource:(e,n,r,s)=>this.handleAsyncify(e,()=>{try{let i=this.runtimeCallbacks.get(n);if(!i)throw new Error(`QuickJSRuntime(rt = ${n}) not found for C module loader`);let o=i.loadModuleSource;if(!o)throw new Error(`QuickJSRuntime(rt = ${n}) does not support module loading`);return o(n,r,s)}catch(i){return console.error("[C to host module loader error: returning null]",i),0}}),normalizeModule:(e,n,r,s,i)=>this.handleAsyncify(e,()=>{try{let o=this.runtimeCallbacks.get(n);if(!o)throw new Error(`QuickJSRuntime(rt = ${n}) not found for C module loader`);let a=o.normalizeModule;if(!a)throw new Error(`QuickJSRuntime(rt = ${n}) does not support module loading`);return a(n,r,s,i)}catch(o){return console.error("[C to host module loader error: returning null]",o),0}})}),this.module=t,this.module.callbacks=this.cToHostCallbacks}setRuntimeCallbacks(t,e){this.runtimeCallbacks.set(t,e)}deleteRuntime(t){this.runtimeCallbacks.delete(t)}setContextCallbacks(t,e){this.contextCallbacks.set(t,e)}deleteContext(t){this.contextCallbacks.delete(t)}handleAsyncify(t,e){if(t)return t.handleSleep(r=>{try{let s=e();if(!(s instanceof Promise)){co("asyncify.handleSleep: not suspending:",s),r(s);return}if(this.suspended)throw new g0(`Already suspended at: ${this.suspended.stack}
Attempted to suspend at:`);this.suspended=new y0(`(${this.suspendedCount++})`),co("asyncify.handleSleep: suspending:",this.suspended),s.then(i=>{this.suspended=void 0,co("asyncify.handleSleep: resolved:",i),r(i)},i=>{co("asyncify.handleSleep: rejected:",i),console.error("QuickJS: cannot handle error in suspended function",i),this.suspended=void 0})}catch(s){throw this.suspended=void 0,s}});let n=e();if(n instanceof Promise)throw new Error("Promise return value not supported in non-asyncify context.");return n}};function T0(t,e){e.interruptHandler&&t.setInterruptHandler(e.interruptHandler),e.maxStackSizeBytes!==void 0&&t.setMaxStackSize(e.maxStackSizeBytes),e.memoryLimitBytes!==void 0&&t.setMemoryLimit(e.memoryLimitBytes)}function C0(t,e){e.moduleLoader&&t.setModuleLoader(e.moduleLoader),e.shouldInterrupt&&t.setInterruptHandler(e.shouldInterrupt),e.memoryLimitBytes!==void 0&&t.setMemoryLimit(e.memoryLimitBytes),e.maxStackSizeBytes!==void 0&&t.setMaxStackSize(e.maxStackSizeBytes)}var Q2=class{constructor(t,e){this.module=t,this.ffi=e,this.callbacks=new A0(t)}newRuntime(t={}){let e=new an(this.ffi.QTS_NewRuntime(),void 0,r=>{this.ffi.QTS_FreeRuntime(r),this.callbacks.deleteRuntime(r)}),n=new Z2({module:this.module,callbacks:this.callbacks,ffi:this.ffi,rt:e});return T0(n,t),t.moduleLoader&&n.setModuleLoader(t.moduleLoader),n}newContext(t={}){let e=this.newRuntime(),n=e.newContext({...t,ownedLifetimes:V2(e,t.ownedLifetimes)});return e.context=n,n}evalCode(t,e={}){return gr.withScope(n=>{let r=n.manage(this.newContext());C0(r.runtime,e);let s=r.evalCode(t,"eval.js");if(e.memoryLimitBytes!==void 0&&r.runtime.setMemoryLimit(-1),s.error)throw r.dump(n.manage(s.error));return r.dump(n.manage(s.value))})}getWasmMemory(){let t=this.module.quickjsEmscriptenInit?.(()=>{})?.getWasmMemory?.();if(!t)throw new Error("Variant does not support getting WebAssembly.Memory");return t}getFFI(){return this.ffi}};async function Kf(t){let e=Da(await t),[n,r,{QuickJSWASMModule:s}]=await Promise.all([e.importModuleLoader().then(Da),e.importFFI(),xr(()=>Promise.resolve().then(()=>S4),[]).then(Da)]),i=await n();i.type="sync";let o=new r(i);return new s(i,o)}function Da(t){return t&&"default"in t&&t.default?t.default&&"default"in t.default&&t.default.default?t.default.default:t.default:t}function K2(t,e){return{...t,async importModuleLoader(){let n=Da(await t.importModuleLoader());return async function(){let r=e.emscriptenModule?{...e.emscriptenModule}:{},s=e.log??((...h)=>co("newVariant moduleLoader:",...h)),i=(h,d)=>(s(...h,d),d),o=h=>typeof h=="function"?h():h;(e.wasmLocation||e.wasmSourceMapLocation||e.locateFile)&&(r.locateFile=(h,d)=>{let f={fileName:h,relativeTo:d};if(h.endsWith(".wasm")&&e.wasmLocation!==void 0)return i(["locateFile .wasm: provide wasmLocation",f],e.wasmLocation);if(h.endsWith(".map")){if(e.wasmSourceMapLocation!==void 0)return i(["locateFile .map: provide wasmSourceMapLocation",f],e.wasmSourceMapLocation);if(e.wasmLocation&&!e.locateFile)return i(["locateFile .map: infer from wasmLocation",f],e.wasmLocation+".map")}return e.locateFile?i(["locateFile: use provided fn",f],e.locateFile(h,d)):i(["locateFile: unhandled, passthrough",f],h)}),e.wasmBinary&&(r.wasmBinary=await o(e.wasmBinary)),e.wasmMemory&&(r.wasmMemory=await o(e.wasmMemory));let a=e.wasmModule,l;a&&(r.instantiateWasm=async(h,d)=>{l??(l=Promise.resolve(o(a)));let f=await l;if(!f)throw new eh(`options.wasmModule returned ${String(f)}`);let m=await WebAssembly.instantiate(f,h);return d(m),m.exports}),r.monitorRunDependencies=h=>{s("monitorRunDependencies:",h)},r.quickjsEmscriptenInit=()=>eE(s);let c=n(r),u=r.quickjsEmscriptenInit?.(s);if(a&&u?.receiveWasmOffsetConverter&&!u.existingWasmOffsetConverter){let h=await o(e.wasmBinary)??new ArrayBuffer(0);l??(l=Promise.resolve(o(a)));let d=await l;if(!d)throw new eh(`options.wasmModule returned ${String(d)}`);u.receiveWasmOffsetConverter(h,d)}if(u?.receiveSourceMapJSON){let h=await o(e.wasmSourceMapData);typeof h=="string"?u.receiveSourceMapJSON(JSON.parse(h)):h?u.receiveSourceMapJSON(h):u.receiveSourceMapJSON({version:3,names:[],sources:[],mappings:""})}return c}}}}function eE(t){let e="mock called, emscripten module may not be initialized yet";return{mock:!0,removeRunDependency(n){t(`${e}: removeRunDependency called:`,n)},receiveSourceMapJSON(n){t(`${e}: receiveSourceMapJSON called:`,n)},WasmOffsetConverter:void 0,receiveWasmOffsetConverter(n,r){t(`${e}: receiveWasmOffsetConverter called:`,n,r)}}}var tE={type:"sync",importFFI:()=>xr(()=>import("./ffi-Boa1QuFa.js"),[]).then(t=>t.QuickJSFFI),importModuleLoader:()=>xr(()=>import("./emscripten-module.browser-DSSLSMvU.js"),[]).then(t=>t.default)},nE=tE;class rE{perm=[];constructor(e=0){const n=[];for(let s=0;s<256;s++)n[s]=s;let r=e;for(let s=255;s>0;s--){r=r*1103515245+12345&2147483647;const i=r%(s+1);[n[s],n[i]]=[n[i],n[s]]}for(let s=0;s<512;s++)this.perm[s]=n[s&255]}fade(e){return e*e*e*(e*(e*6-15)+10)}lerp(e,n,r){return e+r*(n-e)}grad(e,n,r){const s=e&3,i=s<2?n:r,o=s<2?r:n;return((s&1)===0?i:-i)+((s&2)===0?o:-o)}noise(e,n){const r=Math.floor(e)&255,s=Math.floor(n)&255;e-=Math.floor(e),n-=Math.floor(n);const i=this.fade(e),o=this.fade(n),a=this.perm[r]+s,l=this.perm[r+1]+s;return this.lerp(this.lerp(this.grad(this.perm[a],e,n),this.grad(this.perm[l],e-1,n),i),this.lerp(this.grad(this.perm[a+1],e,n-1),this.grad(this.perm[l+1],e-1,n-1),i),o)}fbm(e,n,r=4){let s=0,i=1,o=1,a=0;for(let l=0;l<r&&!(i<.001);l++)s+=i*this.noise(e*o,n*o),a+=i,i*=.5,o*=2;return s/a}}class sd{constructor(e=0,n=256){this.period=n;const r=[];for(let i=0;i<256;i++)r[i]=i;let s=e;for(let i=255;i>0;i--){s=s*1103515245+12345&2147483647;const o=s%(i+1);[r[i],r[o]]=[r[o],r[i]]}for(let i=0;i<513;i++)this.perm[i]=r[i&255]}period;perm=[];fade(e){return e*e*e*(e*(e*6-15)+10)}lerp(e,n,r){return e+r*(n-e)}grad(e,n,r,s){const i=e&15,o=i<8?n:r,a=i<4?r:i===12||i===14?n:s;return((i&1)===0?o:-o)+((i&2)===0?a:-a)}noise(e,n,r){const s=this.period,i=Math.floor(e),o=Math.floor(n),a=Math.floor(r),l=(i%s+s)%s,c=(o%s+s)%s,u=(a%s+s)%s,h=e-i,d=n-o,f=r-a,m=this.fade(h),p=this.fade(d),y=this.fade(f),g=this.perm[l]+c,b=this.perm[(l+1)%s]+c,v=this.perm[l]+(c+1)%s,x=this.perm[(l+1)%s]+(c+1)%s,k=this.perm[g]+u,C=this.perm[b]+u,E=this.perm[v]+u,T=this.perm[x]+u,A=(u+1)%s,M=this.perm[g]+A,P=this.perm[b]+A,S=this.perm[v]+A,O=this.perm[x]+A;return this.lerp(this.lerp(this.lerp(this.grad(this.perm[k],h,d,f),this.grad(this.perm[C],h-1,d,f),m),this.lerp(this.grad(this.perm[E],h,d-1,f),this.grad(this.perm[T],h-1,d-1,f),m),p),this.lerp(this.lerp(this.grad(this.perm[M],h,d,f-1),this.grad(this.perm[P],h-1,d,f-1),m),this.lerp(this.grad(this.perm[S],h,d-1,f-1),this.grad(this.perm[O],h-1,d-1,f-1),m),p),y)}fbm(e,n,r,s=3){let i=0,o=1,a=1,l=0;for(let c=0;c<s&&!(o<.001);c++)i+=o*this.noise(e*a,n*a,r*a),l+=o,o*=.5,a*=2;return i/l}}const Oi={seed:54321,frequency:.008,amplitude:80,octaves:4,base:64,plains:{seed:24680,cell:48,threshold:-.1,edge:.2,plateauFrequency:5e-4,plateauOctaves:2},seaLevel:56},ep=new Map,id=t=>{let e=ep.get(t);return e===void 0&&(e=new rE(t),ep.set(t,e)),e},sE=(t,e,n)=>{const r=Math.max(0,Math.min(1,(n-t)/(e-t)));return r*r*(3-2*r)},Na=(t,e,n)=>t+n*(e-t),tp=(t,e,n)=>{const r=Math.floor(t),s=Math.floor(e),i=t-r,o=e-s,a=n(r,s),l=n(r+1,s),c=n(r,s+1),u=n(r+1,s+1);return Na(Na(a,l,i),Na(c,u,i),o)},iE=(t,e,n)=>{const r=id(n.seed);return n.base+r.fbm(t*n.frequency,e*n.frequency,n.octaves)*n.amplitude},np=new Map,oE=(t,e,n)=>{const r=`${t.seed}|${e}|${n}`;let s=np.get(r);return s===void 0&&(s=id(t.seed).noise(e+.5,n+.5),np.set(r,s)),s},rp=new Map,aE=(t,e,n,r)=>{const s=e.plateauFrequency??5e-4,i=e.plateauOctaves??2,o=`${t.seed}|${e.cell}|${s}|${i}|${n}|${r}`;let a=rp.get(o);if(a===void 0){const l=id(t.seed);a=t.base+l.fbm((n+.5)*e.cell*s,(r+.5)*e.cell*s,i)*t.amplitude,rp.set(o,a)}return a},Po=(t,e,n=Oi)=>{const r=iE(t,e,n);if(n.plains===void 0)return r;const{cell:s,threshold:i,edge:o}=n.plains,a=t/s,l=e/s,c=tp(a,l,(d,f)=>oE(n.plains,d,f)),u=tp(a,l,(d,f)=>aE(n,n.plains,d,f)),h=sE(i-o,i+o,c);return Na(r,u,h)},lE=1024,M0=8,cE=220,uE=64,hE=M0/lE,dE=5,fE=2,pE=.52,mE=.15,gE=.8,yE=790741,Jl={y:cE,halfHeight:uE,flatness:dE,frequency:hE,period:M0,octaves:fE,threshold:pE,coverageThreshold:mE,coverageDrive:gE},sp=new Map,bE=t=>{let e=sp.get(t);return e===void 0&&(e=new sd(t^yE,Jl.period),sp.set(t,e)),e},ip=(t,e,n,r=Jl)=>t.fbm(e*r.frequency,r.y*r.frequency,n*r.frequency,r.octaves),Bc=(t,e,n,r,s,i=Jl)=>t.fbm(e*i.frequency,n*i.frequency*i.flatness,r*i.frequency,i.octaves)>i.threshold-Math.max(0,s)*i.coverageDrive,vE=829413,wE=1/200,op=1,_E=.004,ca=6,ap=new Map,xE=t=>{let e=ap.get(t);return e===void 0&&(e=new sd(t^vE,256),ap.set(t,e)),e},Wi=(t,e,n,r,s,i)=>{if(i===0||n>s+4)return!1;const o=wE,a=2,l=t.fbm(e*o,n*o*a,r*o,op),c=t.fbm((e+317)*o,(n+317)*o*a,(r+317)*o,op);let u=l*l+c*c;if(n>s-4){const h=n-(s-4);u+=h*.005}return u<_E},kE=108449,lp=1/1500,SE=2,EE=.02,AE=30,cp=new Map,TE=t=>{let e=cp.get(t);return e===void 0&&(e=new sd(t^kE,256),cp.set(t,e)),e},CE=(t,e,n)=>t.fbm(e*lp,0,n*lp,SE)>EE,_e=0,ki=1,us=2,rn=3,hs=4,gs=5,Ar=6,R0=7,I0=8,od=25,ad=26,ME=27,RE=28,Fa=29,bl=9,z0=15,Oo=16,ld=22,P0=23,cd=24,vl=7,Ut=t=>t===rn||t>=bl&&t<=z0||t===P0,Mr=t=>t===Ar||t>=Oo&&t<=ld||t===cd,kt=t=>Ut(t)||Mr(t),Ba=t=>Ut(t)||Mr(t)?t>=bl&&t<=z0?t-bl+1:t>=Oo&&t<=ld?t-Oo+1:0:0,ud=1,hd=(t,e=ud)=>(t[0]+2*e)*(t[1]+2*e)*(t[2]+2*e);class IE{dims;scale;voxels;padding=ud;data;mightHaveVoxels=!1;hasWater=!1;hasFlowing=!1;constructor(e){this.dims=e.dims,this.voxels=e.voxels,this.scale=e.scale,this.data=e.data??new Uint8Array(hd(e.voxels,this.padding))}index(e,n,r){const[s,i]=this.voxels,o=this.padding;return((r+o)*(i+2*o)+(n+o))*(s+2*o)+(e+o)}paddedIndex(e,n,r){const[s,i]=this.voxels,o=this.padding;return((r+o)*(i+2*o)+(n+o))*(s+2*o)+(e+o)}atPadded(e,n,r){return this.data[this.paddedIndex(e,n,r)]}inBoundsPadded(e,n,r){const s=this.padding;return e>=-s&&n>=-s&&r>=-s&&e<this.voxels[0]+s&&n<this.voxels[1]+s&&r<this.voxels[2]+s}inBounds(e,n,r){return e>=0&&n>=0&&r>=0&&e<this.voxels[0]&&n<this.voxels[1]&&r<this.voxels[2]}get(e,n,r){return this.inBounds(e,n,r)?this.data[this.index(e,n,r)]:_e}set(e,n,r,s){this.inBounds(e,n,r)&&(this.data[this.index(e,n,r)]=s,Ut(s)?this.hasWater=!0:s!==_e&&(this.mightHaveVoxels=!0),kt(s)&&(this.hasFlowing=!0))}reset(){this.data.fill(_e),this.mightHaveVoxels=!1,this.hasWater=!1,this.hasFlowing=!1}}const zE=(t,e,n,r)=>{t.reset();const s=t.scale,[i,o,a]=t.voxels,l=t.padding,c=o/2,u=t.dims[1],h=n.seaLevel,d=8,f=Jl,m=f.y-f.halfHeight,p=f.y+f.halfHeight,y=e[1]+(-l+.5-o/2)*s,b=e[1]+(o+l-.5-o/2)*s>=m&&y<=p?bE(n.seed):void 0,v=xE(n.seed),x=E=>Math.round((E-e[1])/s+c),k=(E,T,A,M)=>{const P=Math.max(s,M),S=Math.min(s,M),O=Math.round(P/S),w=Math.floor(E/P)*P+P/2,R=Math.floor(T/P)*P+P/2,F=Math.floor(A/P)*P+P/2,D=w+(.5-O/2)*S,te=R+(.5-O/2)*S,H=F+(.5-O/2)*S,Q=u/2/S;let N;for(let B=0;B<O;B++){const le=D+B*S;for(let oe=0;oe<O;oe++){const X=H+oe*S,ye=Po(le,X,n),Le=Math.round((ye-e[1])/S+Q),xe=b===void 0?-1/0:ip(b,le,X),Se=xe>=f.coverageThreshold;for(let Ze=0;Ze<O;Ze++){const Ue=te+Ze*S,ft=Math.round((Ue-e[1])/S+Q-.5),pt=Wi(v,le,Ue,X,ye,n.amplitude);let _;if(pt?_=h!==void 0&&ft>=Le+1&&ft<=Math.round((h-e[1])/S+Q)?rn:_e:ft===Le?_=ki:ft<Le?_=Ue>=ye-ca?us:hs:h!==void 0&&ft>=Le+1&&ft<=Math.round((h-e[1])/S+Q)?_=rn:_=_e,_===_e&&Se&&b!==void 0&&Ue>=m&&Ue<=p&&Bc(b,le,Ue,X,xe)&&(_=gs),_===_e)return _e;const J=_===rn?"water":"solid";if(N===void 0)N=J;else if(J!==N)return _e}}}return N==="water"?rn:us},C=(E,T)=>{const A=e[0]+(E+.5-i/2)*s,M=e[2]+(T+.5-a/2)*s,P=E<0?r?.nx??s:E>=i?r?.px??s:void 0,S=T<0?r?.nz??s:T>=a?r?.pz??s:void 0,O=Po(A,M,n),w=x(O),R=h===void 0?-1/0:x(h),F=b===void 0?-1/0:ip(b,A,M),D=F>=f.coverageThreshold,te=(()=>{if(!CE(TE(n.seed),A,M))return-1/0;const X=O-AE;for(let ye=-l;ye<o+l-1;ye++){const Le=e[1]+(ye+.5-o/2)*s;if(Le>X)break;if(!Wi(v,A,Le,M,O,n.amplitude))continue;const xe=e[1]+(ye+1+.5-o/2)*s;if(Wi(v,A,xe,M,O,n.amplitude))return ye}return-1/0})(),H=w,Q=H-ca,N=H+d,B=(X,ye)=>X===H?ki:X<H?ye>=O-ca?us:hs:h!==void 0&&X>=H+1&&X<=R?rn:D&&b!==void 0&&ye>=m&&ye<=p&&Bc(b,A,ye,M,F)?gs:_e,le=(X,ye)=>Wi(v,A,ye,M,O,n.amplitude)?X===te?Ar:h!==void 0&&X>=H+1&&X<=R?rn:_e:hs,oe=(X,ye)=>{if(Wi(v,A,ye,M,O,n.amplitude)){const xe=h!==void 0&&X>=H+1&&X<=R;return X===te&&!xe?Ar:xe?rn:_e}return X===H?ki:X<H?ye>=O-ca?us:hs:h!==void 0&&X>=H+1&&X<=R?rn:D&&b!==void 0&&ye>=m&&ye<=p&&Bc(b,A,ye,M,F)?gs:_e};for(let X=-l;X<o+l;++X){const ye=e[1]+(X+.5-o/2)*s,Le=X<0?r?.ny??s:X>=o?r?.py??s:void 0;let xe;if(P!==void 0||Le!==void 0||S!==void 0){const Se=[];P!==void 0&&Se.push(P),Le!==void 0&&Se.push(Le),S!==void 0&&Se.push(S),xe=Se.some(Ze=>Ze!==s)?k(A,ye,M,Math.max(...Se)):X>N?B(X,ye):X<Q?le(X,ye):oe(X,ye)}else xe=X>N?B(X,ye):X<Q?le(X,ye):oe(X,ye);t.data[t.paddedIndex(E,X,T)]=xe,Ut(xe)?t.hasWater=!0:xe!==_e&&(t.mightHaveVoxels=!0)}};for(let E=-l;E<a+l;++E)for(let T=-l;T<i+l;++T)C(T,E)};class ua extends Error{kind;constructor(e,n){super(n),this.name="ScriptExecutionError",this.kind=e}}class PE{context;runtime;effects=[];logs=[];timeLimitMs;tickHandlers=[];planHandler;engine;deadline=1/0;disposed=!1;constructor(e){this.runtime=e.runtime,this.context=e.context,this.timeLimitMs=e.timeLimitMs,e.runtime.setInterruptHandler(()=>Date.now()>this.deadline),this.engine=this.installEngine(e.context,e),this.installDeterministicGlobals(e.context,e)}load(e){this.assertAlive(),this.withBudget(()=>{const n=this.context.evalCode(`(function (engine) {
${e}
});`,"place.js");if(n.error!==void 0){const{name:i,message:o}=this.describeError(n.error);throw n.dispose(),new ua(Uc(i,o),o===""?i:`${i}: ${o}`)}const r=n.value,s=this.context.callFunction(r,this.context.undefined,this.engine);r.dispose(),this.readResult(s)})}tick(e,n){this.assertAlive(),this.withBudget(()=>{const r=this.context.newNumber(e),s=this.context.newString(n);try{for(const i of this.tickHandlers){const o=this.context.callFunction(i,this.context.undefined,r,s);this.readResult(o)}}finally{s.dispose(),r.dispose()}})}plan(e){this.assertAlive();let n="";return this.withBudget(()=>{if(this.planHandler===void 0)return;const r=this.context,s=r.newString(e);try{const i=r.callFunction(this.planHandler,r.undefined,s);if(i.error!==void 0){const{name:o,message:a}=this.describeError(i.error);throw i.dispose(),new ua(Uc(o,a),a===""?o:`${o}: ${a}`)}r.typeof(i.value)==="string"&&(n=r.getString(i.value)),i.dispose()}finally{s.dispose()}}),n}drain(){return{effects:this.effects.splice(0,this.effects.length),logs:this.logs.splice(0,this.logs.length)}}dispose(){if(!this.disposed){this.disposed=!0;for(const e of this.tickHandlers)e.dispose();this.planHandler?.dispose(),this.engine.dispose(),this.context.dispose(),this.runtime.dispose()}}withBudget(e){this.deadline=Date.now()+this.timeLimitMs;try{e()}finally{this.deadline=1/0}}installEngine(e,n){const r=e.newObject(),s=(a,l)=>{const c=e.newFunction(a,l);e.setProp(r,a,c),c.dispose()};s("dispatch",(a,l)=>(this.effects.push({tag:e.getString(a),payload:e.getString(l)}),e.undefined)),s("log",a=>(this.logs.push(e.getString(a)),e.undefined)),s("now",()=>e.newNumber(n.now())),s("endings",()=>e.newString(JSON.stringify(n.endings?.()??[]))),s("players",()=>e.newString(JSON.stringify(n.getPlayers?.()??[]))),s("heightAt",(a,l)=>e.newNumber(n.heightAt?.(e.getNumber(a),e.getNumber(l))??0)),s("solidAt",(a,l,c)=>n.solidAt?.(e.getNumber(a),e.getNumber(l),e.getNumber(c))?e.true:e.false),s("waterAt",(a,l,c)=>n.waterAt?.(e.getNumber(a),e.getNumber(l),e.getNumber(c))?e.true:e.false),s("onTick",a=>(this.tickHandlers.push(a.dup()),e.undefined)),s("onPlan",a=>(this.planHandler?.dispose(),this.planHandler=a.dup(),e.undefined));const i=e.newObject(),o={air:_e,grass:ki,dirt:us,water:rn,stone:hs,cloud:gs,lava:Ar,log:R0,leaves:I0,brick:od,wood:ad,ice:ME,greystone:RE};for(const[a,l]of Object.entries(o)){const c=e.newNumber(l);e.setProp(i,a,c),c.dispose()}return e.setProp(r,"blocks",i),i.dispose(),r}installDeterministicGlobals(e,n){const r=e.newFunction("random",()=>e.newNumber(n.random())),s=e.getProp(e.global,"Math");e.setProp(s,"random",r),r.dispose(),s.dispose();const i=e.newFunction("now",()=>e.newNumber(n.now())),o=e.getProp(e.global,"Date");e.setProp(o,"now",i),i.dispose(),o.dispose()}readResult(e){if(e.error!==void 0){const{name:n,message:r}=this.describeError(e.error);throw e.dispose(),new ua(Uc(n,r),r===""?n:`${n}: ${r}`)}e.dispose()}describeError(e){const n=r=>{const s=this.context.getProp(e,r),i=this.context.typeof(s)==="string"?this.context.getString(s):"";return s.dispose(),i};return{name:n("name"),message:n("message")}}assertAlive(){if(this.disposed)throw new ua("fatal","sandbox disposed")}}const OE=t=>{let e=t|0;return()=>{e=e+1831565813|0;let n=Math.imul(e^e>>>15,1|e);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}},Uc=(t,e)=>{if(t==="InternalError"){if(e==="interrupted")return"interrupt";if(e==="out of memory")return"memory"}return"exception"};let up;const $E=()=>typeof process<"u"&&process.versions?.node!==void 0,LE=()=>$E()?(async()=>{const{createRequire:t}=await xr(async()=>{const{createRequire:o}=await Promise.resolve().then(()=>Au);return{createRequire:o}},void 0),{dirname:e,join:n}=await xr(async()=>{const{dirname:o,join:a}=await Promise.resolve().then(()=>Au);return{dirname:o,join:a}},void 0),{pathToFileURL:r}=await xr(async()=>{const{pathToFileURL:o}=await Promise.resolve().then(()=>Au);return{pathToFileURL:o}},void 0),s=t(import.meta.url),i=e(s.resolve("@jitl/quickjs-wasmfile-release-sync/package.json"));return Kf({type:"sync",importFFI:()=>import(r(n(i,"dist","ffi.mjs")).href).then(o=>o.QuickJSFFI),importModuleLoader:()=>import(r(n(i,"dist","emscripten-module.mjs")).href).then(o=>o.default)})})():(async()=>{const{default:t}=await xr(async()=>{const{default:e}=await import("./emscripten-module-8No0DIiv.js");return{default:e}},[]);return Kf(K2(nE,{wasmLocation:t}))})(),DE=async t=>{up??=LE();const n=(await up).newRuntime();n.setMemoryLimit(t.memoryLimitBytes??16*1024*1024);const r=n.newContext(),s=OE(t.seed|0);return new PE({runtime:n,context:r,now:t.now,random:s,timeLimitMs:t.timeLimitMs??250,endings:t.endings,heightAt:t.heightAt,solidAt:t.solidAt,waterAt:t.waterAt,getPlayers:t.getPlayers})},Ln=(t,e,n)=>({kind:"box",min:t,max:e,id:n}),NE=({at:t,size:e,wall:n,roof:r,floor:s})=>{const[i,o,a]=t,[l,c,u]=e,h=i+l-1,d=o+c-1,f=a+u-1,m=[];m.push(Ln([i,o,a],[h,o,f],s)),m.push(Ln([i,d,a],[h,d,f],r));const p=o+1,y=d-1;if(y>=p&&l>=3&&u>=3){m.push(Ln([i,p,a],[h,y,a],n)),m.push(Ln([i,p,f],[h,y,f],n)),m.push(Ln([i,p,a+1],[i,y,f-1],n)),m.push(Ln([h,p,a+1],[h,y,f-1],n));const g=i+Math.floor(l/2),b=Math.min(p+1,y);m.push(Ln([g,p,a],[g,b,a],_e))}return m},FE=({from:t,to:e,width:n,id:r})=>{const[s,i,o]=t,[a,,l]=e,c=Math.abs(a-s)>=Math.abs(l-o),u=Math.floor(Math.max(1,n)/2),[h,d]=c?[Math.min(s,a),Math.max(s,a)]:[s-u,s+u],[f,m]=c?[o-u,o+u]:[Math.min(o,l),Math.max(o,l)];return[Ln([h,i,f],[d,i,m],r)]},BE=({at:t,along:e,steps:n,rise:r,run:s,width:i,id:o})=>{const[a,l,c]=t,u=[];for(let h=0;h<n;h++){const d=l+(h+1)*r-1;if(e==="x"){const f=a+h*s;u.push(Ln([f,l,c],[f+s-1,d,c+i-1],o))}else{const f=c+h*s;u.push(Ln([a,l,f],[a+i-1,d,f+s-1],o))}}return u},UE=({from:t,to:e,width:n,id:r})=>{const[s,i,o]=t,[a,l,c]=e,u=Math.abs(a-s)>=Math.abs(c-o),h=Math.max(1,Math.abs(u?a-s:c-o)),d=Math.min(i,l),f=Math.floor(Math.max(1,n)/2),m=[];for(let p=0;p<=h;p++){const y=Math.max(d,Math.round(i+(l-i)*p/h));if(u){const g=Math.min(s,a)+p;m.push(Ln([g,d,o-f],[g,y,o+f],r))}else{const g=Math.min(o,c)+p;m.push(Ln([s-f,d,g],[s+f,y,g],r))}}return m},HE=t=>t.kind==="box"?[t]:t.kind==="road"?FE(t):t.kind==="stairs"?BE(t):t.kind==="ramp"?UE(t):NE(t),jE=(t,e,n)=>{if(n.length===0)return;const r=t.scale,[s,i,o]=t.voxels,a=[s,i,o],l=t.padding;for(const c of n)for(const u of HE(c)){const h=u.id;if(!Number.isInteger(h)||h<0||h>255)continue;const d=[0,0,0],f=[0,0,0];for(let m=0;m<3;m++){const p=u.min[m]*bt,y=(u.max[m]+1)*bt;d[m]=Math.max(-l,Math.floor((p-e[m])/r+a[m]/2)),f[m]=Math.min(a[m]+l-1,Math.ceil((y-e[m])/r+a[m]/2)-1)}for(let m=d[2];m<=f[2];m++)for(let p=d[1];p<=f[1];p++)for(let y=d[0];y<=f[0];y++)t.data[t.paddedIndex(y,p,m)]=h,Ut(h)?t.hasWater=!0:h!==_e&&(t.mightHaveVoxels=!0)}},jr=15,mi=15,WE=0,nh=4,O0=(()=>{const t={[Ar]:jr,[Fa]:jr};for(let e=Oo;e<=ld;e++)t[e]=jr;return t[cd]=jr,t})(),$0=t=>t*(1/jr),VE=t=>t==="skylight"?WE:nh;class hp{constructor(e,n){this.voxels=e,this.data=n??new Uint8Array(hd(e,this.padding))}voxels;data;padding=ud;paddedIndex(e,n,r){const[s,i]=this.voxels,o=this.padding;return((r+o)*(i+2*o)+(n+o))*(s+2*o)+(e+o)}skylightAt(e){return this.data[e]&mi}blocklightAt(e){return this.data[e]>>>nh}setSkylightAt(e,n){this.data[e]=this.data[e]&~mi|n}setBlocklightAt(e,n){this.data[e]=this.data[e]&mi|n<<nh}clearBlocklight(){const e=this.data;for(let n=0;n<e.length;n++)e[n]&=mi}}const L0=t=>t===_e||Ut(t)||t===gs,dp=(t,e,n,r)=>t.paddedIndex(e,n,r),dd=(t,e,n,r,s)=>{const[i,o,a]=t.voxels,l=t.padding,c=e.data,u=VE(r),h=~(mi<<u),d=y=>c[y]>>>u&mi,f=(y,g)=>{c[y]=c[y]&h|g<<u},m=[];for(const y of n){const g=dp(e,y.x,y.y,y.z);y.level>d(g)&&f(g,y.level),m.push(y)}const p=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]];for(let y=0;y<m.length;y++){const g=m[y];for(const[b,v,x]of p){const k=g.x+b,C=g.y+v,E=g.z+x;if(k<-l||k>=i+l||C<-l||C>=o+l||E<-l||E>=a+l||!L0(t.atPadded(k,C,E)))continue;const T=dp(e,k,C,E),A=d(T),M=s&&g.fullSky&&v!==0?jr:g.level-1;M<=A||(f(T,M),m.push({x:k,y:C,z:E,level:M,fullSky:M===jr}))}}},D0=(t,e,n,r)=>{const[s,i,o]=t.voxels,a=t.scale,l=t.padding,c=t.voxels.map(m=>m/2),u=m=>n[0]+(m+.5-c[0])*a,h=m=>n[1]+(m+.5-c[1])*a,d=m=>n[2]+(m+.5-c[2])*a,f=[];for(let m=-l;m<o+l;m++){const p=d(m);for(let y=-l;y<s+l;y++){const g=u(y),b=Po(g,p,r);for(let v=-l;v<i+l;v++){const x=e.paddedIndex(y,v,m);if(e.skylightAt(x)!==0)continue;L0(t.atPadded(y,v,m))&&h(v)>=b&&(e.setSkylightAt(x,jr),f.push({x:y,y:v,z:m,level:jr,fullSky:!0}))}}}return dd(t,e,f,"skylight",!0),e},Ql=(t,e)=>{e.clearBlocklight();const[n,r,s]=t.voxels,i=t.padding,o=[];for(let a=-i;a<s+i;a++)for(let l=-i;l<r+i;l++)for(let c=-i;c<n+i;c++){const u=t.atPadded(c,l,a);if(u===_e)continue;const h=O0[u];h!==void 0&&o.push({x:c,y:l,z:a,level:h,fullSky:!1})}return dd(t,e,o,"blocklight",!1),e},bt=2,wl=t=>{const e=bt*(1<<t);return{voxels:[rt[0]/e,rt[1]/e,rt[2]/e],dimensions:rt,voxelSize:e}},Ua=64,rt=[Ua*bt,Ua*bt,Ua*bt],fp=t=>{const e=t.lod??0,{dimensions:n,voxels:r,voxelSize:s}=wl(e),i=t.into;return i!==void 0&&(i.storeData.fill(0),i.light.fill(0)),{center:t.center,store:new IE({dims:n,voxels:r,scale:s,data:i?.storeData}),light:i===void 0?new hp(r):new hp(r,i.light),targetLod:e}},_o=(t,e,n)=>[Math.floor((t+rt[0]/2)/rt[0]),Math.floor((e+rt[1]/2)/rt[1]),Math.floor((n+rt[2]/2)/rt[2])],GE=(t,e,n)=>{const r=t.store,s=r.scale,[i,o,a]=r.voxels,l=(h,d)=>Math.max(0,Math.min(d-1,h)),c=l(Math.floor((e-t.center[0])/s+i/2),i),u=l(Math.floor((n-t.center[2])/s+a/2),a);for(let h=o-1;h>=0;--h){const d=r.get(c,h,u);if(d!==0&&!kt(d)&&d!==gs)return t.center[1]+(h+1-o/2)*s}return-1/0},YE=(t,e,n,r=Oi)=>{const s=_o(e,Po(e,n,r),n)[1];for(let i=24;i>=-32;i--){const a=(s+i)*rt[1],l=t(e,a,n);if(l===void 0)continue;const c=GE(l,e,n);if(c!==-1/0)return c}return-1/0},qE=(t,e,n,r)=>{const s=_o(e,n,r);for(let i=0;i<4;i++){const o=s[1]*rt[1],a=t(e,o,r);if(a===void 0)return-1/0;const l=a.store,c=l.scale,[u,h,d]=l.voxels,f=(g,b)=>Math.max(0,Math.min(b-1,g)),m=f(Math.floor((e-a.center[0])/c+u/2),u),p=f(Math.floor((r-a.center[2])/c+d/2),d),y=f(Math.floor((n-a.center[1])/c+h/2),h);for(let g=y;g>=0;--g){const b=l.get(m,g,p);if(b!==0&&!kt(b))return a.center[1]+(g+1-h/2)*c}s[1]--}return-1/0},fd=(t,e,n,r)=>{const s=t(e,n,r);if(s===void 0)return _e;const i=s.store,o=i.scale,[a,l,c]=i.voxels;return i.get(Math.floor((e-s.center[0])/o+a/2),Math.floor((n-s.center[1])/o+l/2),Math.floor((r-s.center[2])/o+c/2))},XE=(t,e,n,r)=>{const s=fd(t,e,n,r);return s!==_e&&!kt(s)},ZE=(t,e,n,r)=>Ut(fd(t,e,n,r)),JE=(t,e,n,r)=>Mr(fd(t,e,n,r)),Hc=(t,e=Oi)=>{D0(t.store,t.light,t.center,e),Ql(t.store,t.light)},pp=(t,e)=>{const{dimensions:n,voxels:r,voxelSize:s}=wl(e.lod);t.store.dims=n,t.store.voxels=r,t.store.scale=s,t.store.data=e.storeData,t.store.mightHaveVoxels=e.mightHaveVoxels,t.store.hasWater=e.hasWater,t.light.voxels=r,t.light.data=e.light,t.targetLod=e.lod},QE=8,KE=t=>{const e=QE*Ua,n=r=>Math.floor(r/bt);return{min:[n(t[0])-e,n(t[1])-e,n(t[2])-e],max:[n(t[0])+e,n(t[1])+e,n(t[2])+e]}},eA=4096,mp=1e6,tA=255,nA=256,jc=64,rA=128,sA=64,iA=64,oA=256,Fr=(t,e,n)=>typeof t=="number"&&Number.isInteger(t)&&t>=e&&t<=n,aA=t=>Fr(t,-mp,mp),zr=t=>Array.isArray(t)&&t.length===3&&t.every(aA),As=t=>Fr(t,0,tA),lA=t=>{if(typeof t!="object"||t===null)return!1;const e=t;if(e.kind==="box")return!zr(e.min)||!zr(e.max)||!As(e.id)?!1:e.min.every((n,r)=>n<=e.max[r]);if(e.kind==="road")return zr(e.from)&&zr(e.to)&&Fr(e.width,1,jc)&&As(e.id);if(e.kind==="house")return zr(e.at)&&zr(e.size)&&e.size.every(n=>Fr(n,1,nA))&&As(e.wall)&&As(e.roof)&&As(e.floor);if(e.kind==="stairs")return zr(e.at)&&(e.along==="x"||e.along==="z")&&Fr(e.steps,1,rA)&&Fr(e.rise,1,sA)&&Fr(e.run,1,iA)&&Fr(e.width,1,jc)&&As(e.id);if(e.kind==="ramp"){if(!zr(e.from)||!zr(e.to)||!Fr(e.width,1,jc)||!As(e.id))return!1;const[n,,r]=e.from,[s,,i]=e.to;return Math.max(Math.abs(s-n),Math.abs(i-r))<=oA}return!1},cA=t=>Array.isArray(t)&&t.length<=eA&&t.every(lA),uA=t=>{if(t.trim()==="")return[];let e;try{e=JSON.parse(t)}catch{return null}return cA(e)?e:null},hA=async t=>{const e=await R2(t.files,t.entry,t.models??{}),n=await DE({seed:t.seed,now:()=>0});try{n.load(e);const r={seed:t.seed,region:t.region},s=n.plan(JSON.stringify(r)),i=uA(s);if(i===null)throw new pi("the plan handler did not return a structure plan this world can generate");return i}finally{n.dispose()}},dA="_overlay_15awv_6",fA="_control_15awv_12",ha={overlay:dA,control:fA};const N0="183";function pA(t){const e=t[0];if(typeof e=="string"&&e.startsWith("TSL:")){const n=t[1];n&&n.isStackTrace?t[0]+=" "+n.getLocation():t[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return t}function mA(...t){t=pA(t);const e="THREE."+t.shift();{const n=t[0];n&&n.isStackTrace?console.warn(n.getError(e)):console.warn(e,...t)}}function ei(t,e,n){return Math.max(e,Math.min(n,t))}class _l{constructor(e=0,n=0){_l.prototype.isVector2=!0,this.x=e,this.y=n}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,n){return this.x=e,this.y=n,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,n){return this.x=e.x+n.x,this.y=e.y+n.y,this}addScaledVector(e,n){return this.x+=e.x*n,this.y+=e.y*n,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const n=this.x,r=this.y,s=e.elements;return this.x=s[0]*n+s[3]*r+s[6],this.y=s[1]*n+s[4]*r+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,n){return this.x=ei(this.x,e.x,n.x),this.y=ei(this.y,e.y,n.y),this}clampScalar(e,n){return this.x=ei(this.x,e,n),this.y=ei(this.y,e,n),this}clampLength(e,n){const r=this.length();return this.divideScalar(r||1).multiplyScalar(ei(r,e,n))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const n=Math.sqrt(this.lengthSq()*e.lengthSq());if(n===0)return Math.PI/2;const r=this.dot(e)/n;return Math.acos(ei(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,r=this.y-e.y;return n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this}lerpVectors(e,n,r){return this.x=e.x+(n.x-e.x)*r,this.y=e.y+(n.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e}fromBufferAttribute(e,n){return this.x=e.getX(n),this.y=e.getY(n),this}rotateAround(e,n){const r=Math.cos(n),s=Math.sin(n),i=this.x-e.x,o=this.y-e.y;return this.x=i*r-o*s+e.x,this.y=i*s+o*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:N0}}));typeof window<"u"&&(window.__THREE__?mA("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=N0);const F0=Bl(),cr=()=>Ul(F0),Wc=new Map;function pd(t,e,n){const{promise:r,resolve:s}=Promise.withResolvers();let i={x:0,y:0},o={x:t.clientX,y:t.clientY};const a=performance.now(),l=new AbortController,c=t.pointerId,u=t.currentTarget;u.setPointerCapture(c);const h=Wc.get(u)??new Map;Wc.set(u,h),h.set(c,t);function d(p){const y=wr.create(p.clientX,p.clientY),g=wr.sub(y,o);return o=y,i=wr.add(i,g),h.set(p.pointerId,p),{delta:g,totalDelta:i,event:p,timespan:performance.now()-a,pointers:h}}function f(p){const y=d(p);u.hasPointerCapture(c)&&(u.releasePointerCapture(c),h.delete(p.pointerId),h.size===0&&Wc.delete(u)),e?.(y),s(y),l.abort()}const m=p=>y=>{y.pointerId===c&&p(y)};return e&&u.addEventListener("pointermove",m(p=>e(d(p))),l),u.addEventListener("pointercancel",m(f),l),u.addEventListener("pointerup",m(f),l),r}const gA={"action-button":"_action-button_c115i_1"};var yA=de("<button>");const bA=Object.freeze({r:255,g:255,b:255});function gp(t){const[e,n]=ge(!1),r={r:0,g:0,b:0},s=Bt(()=>{const a=t.colour;return a===void 0?bA:typeof a=="object"?a:Ju.fromHex(a,r)},{equals:!1}),i=async a=>{n(!0),await pd(a),n(!1)};or(e,a=>t.onPressed?.(a));var o=yA();return o.$$contextmenu=a=>a.preventDefault(),o.$$pointerdown=i,he(()=>({e:`${t.left}px`,t:`${t.top}px`,a:`${t.size}px`,o:`${t.size}px`,i:`${.5*t.size}px`,n:`rgba(${s().r}, ${s().g}, ${s().b}, ${e()?"0.8":"0.5"})`,s:gA["action-button"]}),({e:a,t:l,a:c,o:u,i:h,n:d,s:f},m)=>{a!==m?.e&&Rt(o,"left",a),l!==m?.t&&Rt(o,"top",l),c!==m?.a&&Rt(o,"width",c),u!==m?.o&&Rt(o,"height",u),h!==m?.i&&Rt(o,"border-radius",h),d!==m?.n&&Rt(o,"background-color",d),q(o,f,m?.s)}),o}Ir(["pointerdown","contextmenu"]);const vA="_underlay_hl8f5_1",wA="_knob_hl8f5_13",Vc={underlay:vA,"outer-ring":"_outer-ring_hl8f5_6",knob:wA};var _A=de("<div><div><div>");function xA(t){const[e,n]=ge(),[r,s]=ge();async function i(c){const u=c.currentTarget.getBoundingClientRect();s(wr.create(c.clientX-u.left,c.clientY-u.top)),await pd(c,({totalDelta:h})=>{const d=wr.clone(h),f=wr.length(d);f>.5*t.outerRingSize&&wr.multiplyScalar(d,.5*t.outerRingSize/f,d),n(d),t.onValue(wr.multiplyScalar(d,1/t.outerRingSize))}),n(void 0),s(void 0),t.onValue({x:0,y:0})}var o=_A(),a=o.firstChild,l=a.firstChild;return o.$$contextmenu=c=>c.preventDefault(),o.$$pointerdown=i,he(()=>({e:`${t.left}px`,t:`${t.top}px`,a:`${t.hitAreaSize}px`,o:`${t.hitAreaSize}px`,i:Vc.underlay,n:`${r()?.x??.5*t.hitAreaSize}px`,s:`${r()?.y??.5*t.hitAreaSize}px`,h:`${t.outerRingSize}px`,r:`${t.outerRingSize}px`,d:Vc["outer-ring"],l:`calc(50% + ${e()?.x??0}px)`,u:`calc(50% + ${e()?.y??0}px)`,c:`${t.knobSize}px`,w:`${t.knobSize}px`,m:Vc.knob}),({e:c,t:u,a:h,o:d,i:f,n:m,s:p,h:y,r:g,d:b,l:v,u:x,c:k,w:C,m:E},T)=>{c!==T?.e&&Rt(o,"left",c),u!==T?.t&&Rt(o,"top",u),h!==T?.a&&Rt(o,"width",h),d!==T?.o&&Rt(o,"height",d),q(o,f,T?.i),m!==T?.n&&Rt(a,"left",m),p!==T?.s&&Rt(a,"top",p),y!==T?.h&&Rt(a,"width",y),g!==T?.r&&Rt(a,"height",g),q(a,b,T?.d),v!==T?.l&&Rt(l,"left",v),x!==T?.u&&Rt(l,"top",x),k!==T?.c&&Rt(l,"width",k),C!==T?.w&&Rt(l,"height",C),q(l,E,T?.m)}),o}Ir(["pointerdown","contextmenu"]);var kA=de("<div style=-webkit-tap-highlight-color:transparent><div></div><div></div><div>");const Gc=150,ti=100,Yc=84,ni=24,SA=()=>{const{input:t}=cr(),[e,n]=ge(new _l(window.innerWidth,window.innerHeight)),r=new AbortController;window.addEventListener("resize",()=>n(new _l(window.innerWidth,window.innerHeight)),{signal:r.signal}),bn(()=>r.abort());var s=kA(),i=s.firstChild,o=i.nextSibling,a=o.nextSibling;return ne(i,re(xA,{left:ni,get top(){return e().y-ni-Gc},hitAreaSize:Gc,outerRingSize:.8*Gc,knobSize:70,onValue:l=>t.setTouchMove(l.x*2,-l.y*2)})),ne(o,re(gp,{get left(){return e().x-ni-ti},get top(){return e().y-ni-ti},size:ti,onPressed:l=>{t.setTouchJump(l),l&&t.queueJump()}})),a.addEventListener("pointercancel",l=>{l.stopPropagation(),t.setTouchSecondary(!1)}),a.$$pointerup=l=>{l.stopPropagation(),t.setTouchSecondary(!1)},a.$$pointerdown=l=>{l.stopPropagation(),t.setTouchSecondary(!0)},ne(a,re(gp,{get left(){return e().x-ni-ti-Yc-12},get top(){return e().y-ni-ti+(ti-Yc)/2},size:Yc,colour:"0x35b06b"})),he(()=>({e:ha.overlay,t:ha.control,a:ha.control,o:ha.control}),({e:l,t:c,a:u,o:h},d)=>{q(s,l,d?.e),q(i,c,d?.t),q(o,u,d?.a),q(a,h,d?.o)}),s};Ir(["pointerdown","pointerup"]);function Kl(t){const e=window.matchMedia(t),n=new AbortController,[r,s]=ge(i(e));function i(o){return!!o.matches}return e.addEventListener("change",o=>s(i(o)),{signal:n.signal}),bn(()=>n.abort()),r}function Ha(t){const e=t.target;if(e===null)return!1;const n=e.tagName;return n==="INPUT"||n==="TEXTAREA"||n==="SELECT"||e.isContentEditable}const Ws=(t,e,n)=>Math.max(e,Math.min(n,t));function EA(...t){return t.filter(e=>e!==void 0)}var AA=de("<button>"),TA=de("<div>");let CA=0;function Vi(){let t=null;const e=`popover-${CA++}`,[n,r]=ge(!1);return{isOpen:n,open(){t?.togglePopover(!0)},close(){t?.togglePopover(!1)},Trigger(s){var i=AA();return Rt(i,"anchor-name",`--${e}`),ut(i,"popovertarget",e),ne(i,()=>s.children),he(()=>({e:n()?"true":"false",t:s.class,a:s.title}),({e:o,t:a,a:l},c)=>{o!==c?.e&&ut(i,"aria-selected",o),q(i,a,c?.t),l!==c?.a&&ut(i,"title",l)}),i},PopOver(s){return re(m_,{get children(){var i=TA();i.addEventListener("toggle",a=>{const l=a.newState==="open";r(l),s.onToggle?.(l)});var o=EA(s.ref,a=>t=a);return(typeof o=="function"||Array.isArray(o))&&Zn(()=>o,i),ut(i,"id",e),ne(i,()=>s.children),he(()=>({e:{"position-anchor":`--${e}`,...s.style},t:s.popover??"auto",a:s.class}),({e:a,t:l,a:c},u)=>{Dh(i,a,u?.e),l!==u?.t&&ut(i,"popover",l),q(i,c,u?.a)}),i}})}}}const MA="bms-voxelscape-places",$i="draft",B0="working",RA=()=>new Promise((t,e)=>{const n=indexedDB.open(MA,1);n.onupgradeneeded=()=>{const r=n.result;r.objectStoreNames.contains($i)||r.createObjectStore($i)},n.onsuccess=()=>t(n.result),n.onerror=()=>e(n.error)}),IA=t=>new Promise((e,n)=>{const s=t.transaction($i,"readonly").objectStore($i).get(B0);s.onsuccess=()=>e(s.result),s.onerror=()=>n(s.error)}),zA=(t,e)=>new Promise((n,r)=>{const s=t.transaction($i,"readwrite");s.objectStore($i).put(e,B0),s.oncomplete=()=>n(),s.onerror=()=>r(s.error)}),PA=t=>{if(typeof t!="object"||t===null)return!1;const e=t,n=r=>typeof r=="object"&&r!==null&&!Array.isArray(r);return n(e.manifest)&&n(e.scripts)&&n(e.models)},OA=()=>{let t,e,n=null;const r=()=>(t??=RA(),t),s=async()=>{if(n===null)return;const i=n;n=null;try{await zA(await r(),i)}catch(o){console.warn("[place draft] failed to persist to IndexedDB.",o)}};return{async load(){try{const i=await IA(await r());return PA(i)?i:null}catch(i){return console.warn("[place draft] failed to load from IndexedDB.",i),null}},scheduleSave(i){n=i,e===void 0&&(e=setTimeout(()=>{e=void 0,n!==null&&s()},250))},async saveNow(i){n=i,e!==void 0&&(clearTimeout(e),e=void 0),await s()}}},$A="_content_1h03m_4",LA="_loading_1h03m_13",DA="_header_1h03m_19",NA="_fields_1h03m_29",FA="_field_1h03m_29",BA="_text_1h03m_45",UA="_number_1h03m_46",HA="_actions_1h03m_66",jA="_button_1h03m_72",WA="_primary_1h03m_91",VA="_clonePopover_1h03m_114",GA="_clonePopoverText_1h03m_133",YA="_clonePopoverOk_1h03m_139",qA="_clonePopoverError_1h03m_143",XA="_pick_1h03m_147",ZA="_tabs_1h03m_197",JA="_tab_1h03m_197",QA="_tabActive_1h03m_221",KA="_tabMain_1h03m_227",eT="_tabRemove_1h03m_235",tT="_add_1h03m_248",nT="_panes_1h03m_266",rT="_pane_1h03m_266",sT="_paneActive_1h03m_278",iT="_modelsToggle_1h03m_289",oT="_models_1h03m_289",aT="_modelsAttached_1h03m_338",lT="_modelsBrowse_1h03m_349",cT="_modelsAttachedHeader_1h03m_366",uT="_modelsHeading_1h03m_373",hT="_modelsEmpty_1h03m_400",dT="_modelsCards_1h03m_414",fT="_modelsFromFile_1h03m_422",pT="_modelsSearch_1h03m_439",mT="_modelsCard_1h03m_414",gT="_modelsCardPreview_1h03m_480",yT="_modelsCardThumbnail_1h03m_490",bT="_modelsCardPlaceholder_1h03m_497",vT="_modelsCardName_1h03m_503",wT="_modelsCardDims_1h03m_511",_T="_modelsCardAction_1h03m_517",me={content:$A,loading:LA,header:DA,fields:NA,field:FA,text:BA,number:UA,actions:HA,button:jA,primary:WA,clonePopover:VA,clonePopoverText:GA,clonePopoverOk:YA,clonePopoverError:qA,pick:XA,tabs:ZA,tab:JA,tabActive:QA,tabMain:KA,tabRemove:eT,add:tT,panes:nT,pane:rT,paneActive:sT,modelsToggle:iT,models:oT,modelsAttached:aT,modelsBrowse:lT,modelsAttachedHeader:cT,modelsHeading:uT,modelsEmpty:hT,modelsCards:dT,modelsFromFile:fT,modelsSearch:pT,modelsCard:mT,modelsCardPreview:gT,modelsCardThumbnail:yT,modelsCardPlaceholder:bT,modelsCardName:vT,modelsCardDims:wT,modelsCardAction:_T};var yp=de("<p>"),xT=de("<button>"),kT=de("<i>"),ST=de("<button>Open…"),ET=de("<button>Run"),AT=de("<button>Publish"),TT=de("<header><div><label>name<input></label><label>seed<input type=number></label><label>spawn<input></label></div><div><button>New</button><!><!><button>Close</button></div><!><!>"),CT=de("<nav><button>+ script</button><button>models"),MT=de('<button type=button title="add rm-stacker model files">+ from a file'),bp=de("<ul>"),RT=de('<div><section><div><h3>attached to this place</h3><input type=file accept=.zip,application/zip multiple hidden></div></section><section><h3>browse published models</h3><div><input placeholder="a handle, e.g. alice.bsky.social"><button>Search'),IT=de("<div>"),zT=de("<div>loading draft…"),PT=de("<select><option value disabled selected>pick a place…"),OT=de("<option>"),$T=de('<div><button title="double-click to rename"></button><button>✕'),LT=de("<div>loading editor…"),DT=de("<p>nothing attached yet"),NT=de("<button>remove"),FT=de("<li><div></div><span>"),vp=de("<span>▢"),wp=de("<img loading=lazy>",1),BT=de("<button>mine"),UT=de("<button>attach"),HT=de("<li><div></div><span></span><span>×<!>×<!>");const da=OA(),jT=j1(()=>xr(()=>import("./PlaceEditorPanes-DQThaxfj.js"),[]),"src/ui/PlaceEditorPanes.tsx"),ri=t=>t instanceof Error?t.message:String(t);let Gi=null;const qc=t=>t.manifest.scripts?.[0]??Object.keys(t.scripts)[0]??Zr,WT=t=>{const e=t.voxelscape,[n,r]=ge(Gi),[s,i]=ge(Zr),[o,a]=ge(!1),[l,c]=ge(!1),[u,h]=ge([]),d=new Map,f=W=>{Gi=W,r(W),W!==null&&da.scheduleSave(W)},[m,p]=ge(null);Xr(()=>{if(e().placeEditor.isMine)return;const W=e().placeEditor.owner;W!==null&&e().placeEditor.resolveHandle(W).then(p)}),Xr(()=>{if(Gi!==null)return;const W=e().placeEditor.activeProject;if(W!==null){Gi=W,r(W),i(qc(W));return}da.load().then(ee=>{const K=ee??Yu(e().placeEditor.defaultSeed);Gi=K,r(K),i(qc(K)),ee===null&&da.saveNow(K)})}),bn(()=>{const W=n();W!==null&&da.saveNow(W)});const y=()=>{const W=n();return W===null?[]:Object.keys(W.scripts)},g=W=>{a(!1),i(W),d.get(W)?.requestMeasure()},b=W=>{const ee=n();ee!==null&&f({...ee,manifest:{...ee.manifest,...W}})},v=W=>{const ee=W.split(/[,\s]+/).map(Number);ee.length===3&&ee.every(K=>Number.isFinite(K))&&b({spawn:[ee[0],ee[1],ee[2]]})},x=(W,ee)=>{const K=n();K!==null&&f({...K,scripts:{...K.scripts,[W]:ee}})},k=()=>{const W=n();if(W===null)return;let ee="script.js";for(let K=2;W.scripts[ee]!==void 0;K++)ee=`script${K}.js`;f({...W,manifest:{...W.manifest,scripts:[...W.manifest.scripts??[],ee]},scripts:{...W.scripts,[ee]:""}}),i(ee)},C=W=>{const ee=n();if(ee===null)return;const K={...ee.scripts};delete K[W];const ke=Object.keys(K);f({...ee,manifest:{...ee.manifest,scripts:ke},scripts:K}),s()===W&&i(ke[0]??"")},E=W=>{const ee=n();if(ee===null)return;const K=window.prompt("rename the script file to:",W);if(K===null||K.trim()===""||K===W)return;if(/[/\\]|\.\./.test(K)){t.onStatus(`"${K}" cannot be a script file name`);return}if(ee.scripts[K]!==void 0){t.onStatus(`"${K}" is already a script file`);return}const ke={...ee.scripts};ke[K]=ke[W]??"",delete ke[W],f({...ee,manifest:{...ee.manifest,scripts:(ee.manifest.scripts??Object.keys(ee.scripts)).map(Ye=>Ye===W?K:Ye)},scripts:ke}),s()===W&&i(K)},T=()=>Object.keys(n()?.models??{}),A=(W,ee)=>{const K=n();if(K===null)return;const ke={...K.models,[W]:ee};f({...K,manifest:{...K.manifest,models:Object.keys(ke)},models:ke})},M=async W=>{if(W===null)return;const ee=[];let K=0;for(const ke of Array.from(W)){if(/[/\\]|\.\./.test(ke.name)){ee.push(ke.name);continue}A(ke.name,new Uint8Array(await ke.arrayBuffer())),K++}t.onStatus(ee.length===0?`added ${K} model(s)`:`refused ${ee.join(", ")} — a model name cannot hold a path`)},P=W=>{const ee=n();if(ee===null)return;const K={...ee.models};delete K[W];const ke=Object.keys(K);f({...ee,manifest:{...ee.manifest,models:ke.length>0?ke:void 0},models:K})},[S,O]=ge(""),[w,R]=ge([]),[F,D]=ge(!1),[te,H]=ge({}),Q=W=>`${W.repo}/${W.rkey}`,N=async(W,ee)=>{try{const K=await e().placeEditor.models.thumbnailUrl(ee);K!==null&&H(ke=>({...ke,[W]:K}))}catch{}},B=async W=>{if(W.trim()!==""){D(!0);try{const ee=await e().placeEditor.models.list(W.trim());R(ee);for(const K of ee)N(Q(K),K)}catch(ee){R([]),t.onStatus(`could not list ${W}'s models — ${ri(ee)}`)}finally{D(!1)}}},le=async W=>{O(await e().placeEditor.resolveHandle(W)),B(W)},oe=async W=>{const ee=`${W.rkey}.zip`;if(n()?.models[ee]!==void 0){t.onStatus(`"${W.record.name}" is already attached`);return}c(!0);try{const K=new Uint8Array(await(await e().placeEditor.models.file(W)).arrayBuffer());A(ee,K);const ke=te()[Q(W)];ke!==void 0&&H(Ye=>({...Ye,[ee]:ke})),t.onStatus(`attached "${W.record.name}"`)}catch(K){t.onStatus(`could not attach "${W.record.name}" — ${ri(K)}`)}finally{c(!1)}},X=()=>{f(Yu(e().placeEditor.defaultSeed)),i(Zr),h([]),t.onStatus("new place started — name it, write its script, then publish")},ye=async()=>{const W=e().placeEditor.accountDid;if(W===null){t.onStatus("not signed in — use /account:login first");return}c(!0);try{const ee=await e().placeEditor.places.list(W);h(ee),t.onStatus(ee.length===0?"you have published no places yet":"pick one of your places to open and edit")}catch(ee){t.onStatus(`could not list your places — ${ri(ee)}`)}finally{c(!1)}},Le=async W=>{c(!0);try{const ee=await Zh(await e().placeEditor.places.file(W));f(ee),i(qc(ee)),h([]),t.onStatus(`opened "${ee.manifest.name}" — publishing again under the same name updates the place`)}catch(ee){t.onStatus(`could not open that place — ${ri(ee)}`)}finally{c(!1)}},xe=async()=>{const W=n();if(W===null)return;const ee=W.manifest.scripts?.[0];if(ee===void 0||W.scripts[ee]===void 0){t.onStatus("name a first script in the manifest to run it");return}c(!0);try{const K=await e().placeEditor.runScript(W.scripts,ee,W.manifest.seed,W.models);t.onStatus(K)}catch(K){t.onStatus(`run failed — ${ri(K)}`)}finally{c(!1)}},Se=async()=>{const W=n();if(W===null)return{ok:!1,error:"no draft to publish"};if(W.manifest.name.trim()===""){const ee="name the place before publishing";return t.onStatus(ee),{ok:!1,error:ee}}c(!0);try{const ee=await e().placeEditor.publisher.publish(await Ia(W));return h([]),t.onStatus(`published — ${ee}`),{ok:!0,atUri:ee}}catch(ee){const K=`publish failed — ${ri(ee)}`;return t.onStatus(K),{ok:!1,error:K}}finally{c(!1)}},Ze=()=>e().placeEditor.isMine,Ue=Vi(),ft=Vi(),pt=1400,[_,J]=ge(null),[Z,I]=ge(null),z=async()=>{J(null);const W=await Se();if(!W.ok){J({ok:!1,text:W.error});return}J({ok:!0,text:"Cloned — running your copy"}),await xe(),await e().placeEditor.claim(W.atUri),setTimeout(()=>{Ue.close(),J(null)},pt)},U=async()=>{I(null);const W=await Se();if(!W.ok){I({ok:!1,text:W.error});return}I({ok:!0,text:"Cloned — published"}),await e().placeEditor.claim(W.atUri),setTimeout(()=>{ft.close(),I(null)},pt)},se=W=>W.endsWith("s")?"'":"'s",ie=(W,ee,K,ke,Ye,Ce)=>re(W.PopOver,{popover:"auto",get class(){return me.clonePopover},onToggle:et=>{et||Ye(null)},get children(){return[(()=>{var et=yp();return ne(et,re(Ne,{get when(){return ke()},get fallback(){return re(Ne,{get when(){return e().placeEditor.owner},get fallback(){return["This is a demo — clone it to ",ee," your own copy."]},children:mt=>["This is ",(()=>{var it=kT();return ne(it,()=>m()??mt()),it})(),Zt(()=>se(m()??mt()))," place — clone it to ",ee," your own copy."]})},children:mt=>mt().text})),he(()=>[me.clonePopoverText,ke()!==null&&(ke().ok?me.clonePopoverOk:me.clonePopoverError)],(mt,it)=>{q(et,mt,it)}),et})(),re(Ne,{get when(){return!ke()?.ok},get children(){var et=xT();return Zg(et,"click",Ce,!0),ne(et,K),he(()=>({e:[me.button,me.primary],t:l()}),({e:mt,t:it},en)=>{q(et,mt,en?.e),it!==en?.t&&ut(et,"disabled",it)}),et}})]}});let G;const j=Vi(),[fe,ae]=ge(null),we=async()=>{ae(null);const W=await Se();if(!W.ok){ae({ok:!1,text:W.error});return}ae({ok:!0,text:"Cloned — choose files to attach"}),await e().placeEditor.claim(W.atUri),setTimeout(()=>{j.close(),ae(null),G?.click()},pt)};var Me=IT();return Zn(()=>W=>t.ref?.(W),Me),ne(Me,re(Ne,{get when(){return n()},get fallback(){var W=zT();return he(()=>me.loading,(ee,K)=>{q(W,ee,K)}),W},get children(){return[(()=>{var W=TT(),ee=W.firstChild,K=ee.firstChild,ke=K.firstChild,Ye=ke.nextSibling,Ce=K.nextSibling,et=Ce.firstChild,mt=et.nextSibling,it=Ce.nextSibling,en=it.firstChild,tn=en.nextSibling,Be=ee.nextSibling,Pe=Be.firstChild,at=Pe.nextSibling,gt=at.nextSibling,tt=gt.nextSibling,On=Be.nextSibling,Yt=On.nextSibling;return Ye.$$input=De=>b({name:De.currentTarget.value}),mt.$$input=De=>{const lt=Number(De.currentTarget.value);Number.isFinite(lt)&&b({seed:lt})},tn.$$input=De=>v(De.currentTarget.value),Pe.$$click=()=>X(),ne(Be,re(Ne,{get when(){return u().length===0},get fallback(){var De=PT();return De.firstChild,De.addEventListener("change",lt=>{const Re=u()[Number(lt.currentTarget.value)];Re!==void 0&&Le(Re)}),ne(De,re(on,{get each(){return u()},children:(lt,Re)=>(()=>{var qe=OT();return ne(qe,()=>lt.record.name),he(()=>Re(),ct=>{qe.value=ct}),qe})()}),null),he(()=>me.pick,(lt,Re)=>{q(De,lt,Re)}),De},get children(){var De=ST();return De.$$click=()=>{ye()},he(()=>({e:me.button,t:l()}),({e:lt,t:Re},qe)=>{q(De,lt,qe?.e),Re!==qe?.t&&ut(De,"disabled",Re)}),De}}),at),ne(Be,re(Ne,{get when(){return Ze()},get fallback(){return re(Ue.Trigger,{get class(){return[me.button,me.primary]},title:"This place isn't yours — clone it to run your own copy",children:"Run"})},get children(){var De=ET();return De.$$click=()=>{xe()},he(()=>({e:[me.button,me.primary],t:l()||y().length===0}),({e:lt,t:Re},qe)=>{q(De,lt,qe?.e),Re!==qe?.t&&ut(De,"disabled",Re)}),De}}),gt),ne(Be,re(Ne,{get when(){return Ze()},get fallback(){return re(ft.Trigger,{get class(){return[me.button,me.primary]},title:"This place isn't yours — clone it to publish your own copy",children:"Publish"})},get children(){var De=AT();return De.$$click=()=>{Se()},he(()=>({e:[me.button,me.primary],t:l()}),({e:lt,t:Re},qe)=>{q(De,lt,qe?.e),Re!==qe?.t&&ut(De,"disabled",Re)}),De}}),tt),tt.$$click=()=>e().placeEditor.setOpen(!1),ne(W,()=>ie(Ue,"run","Clone & Run",_,J,()=>{z()}),On),ne(W,()=>ie(ft,"publish","Clone & Publish",Z,I,()=>{U()}),Yt),he(()=>({e:me.header,t:me.fields,a:me.field,o:me.text,i:n().manifest.name,n:me.field,s:me.number,h:n().manifest.seed,r:me.field,d:me.text,l:n().manifest.spawn.join(", "),u:me.actions,c:me.button,w:me.button}),({e:De,t:lt,a:Re,o:qe,i:ct,n:Je,s:$t,h:Tt,r:cn,d:xn,l:un,u:hr,c:kn,w:Go},hn)=>{q(W,De,hn?.e),q(ee,lt,hn?.t),q(K,Re,hn?.a),q(Ye,qe,hn?.o),Ye.value=ct??"",q(Ce,Je,hn?.n),q(mt,$t,hn?.s),mt.value=Tt??"",q(it,cn,hn?.r),q(tn,xn,hn?.d),tn.value=un??"",q(Be,hr,hn?.u),q(Pe,kn,hn?.c),q(tt,Go,hn?.w)}),W})(),(()=>{var W=CT(),ee=W.firstChild,K=ee.nextSibling;return K.firstChild,ne(W,re(on,{get each(){return y()},children:ke=>(()=>{var Ye=$T(),Ce=Ye.firstChild,et=Ce.nextSibling;return Ce.$$dblclick=()=>E(ke),Ce.$$click=()=>g(ke),ne(Ce,ke),et.$$click=()=>C(ke),ut(et,"title",`remove ${ke}`),he(()=>({e:[me.tab,!o()&&s()===ke&&me.tabActive],t:me.tabMain,a:me.tabRemove}),({e:mt,t:it,a:en},tn)=>{q(Ye,mt,tn?.e),q(Ce,it,tn?.t),q(et,en,tn?.a)}),Ye})()}),ee),ee.$$click=()=>k(),K.$$click=()=>a(!0),ne(K,re(Ne,{get when(){return T().length>0},get children(){return[" (",Zt(()=>T().length),")"]}}),null),he(()=>({e:me.tabs,t:me.add,a:[me.modelsToggle,o()&&me.tabActive]}),({e:ke,t:Ye,a:Ce},et)=>{q(W,ke,et?.e),q(ee,Ye,et?.t),q(K,Ce,et?.a)}),W})(),re(Ne,{get when(){return!o()},get children(){return re(Ne,{get when(){return y().length>0},get children(){return re(V1,{get fallback(){var W=LT();return he(()=>me.loading,(ee,K)=>{q(W,ee,K)}),W},get children(){return re(jT,{get project(){return n()},get active(){return s()},onEditor:(W,ee)=>d.set(W,ee),onInput:x})}})}})}}),re(Ne,{get when(){return o()},get children(){var W=RT(),ee=W.firstChild,K=ee.firstChild,ke=K.firstChild,Ye=ke.nextSibling,Ce=ee.nextSibling,et=Ce.firstChild,mt=et.nextSibling,it=mt.firstChild,en=it.nextSibling;Ye.addEventListener("change",Be=>{M(Be.currentTarget.files),Be.currentTarget.value=""});var tn=G;return typeof tn=="function"||Array.isArray(tn)?Zn(()=>tn,Ye):G=Ye,ne(K,re(Ne,{get when(){return Ze()},get fallback(){return[re(j.Trigger,{get class(){return me.modelsFromFile},title:"this place isn't yours — clone it to attach your own files",children:"+ from a file"}),Zt(()=>ie(j,"attach","Clone & Attach",fe,ae,()=>{we()}))]},get children(){var Be=MT();return Be.$$click=()=>G?.click(),he(()=>me.modelsFromFile,(Pe,at)=>{q(Be,Pe,at)}),Be}}),null),ne(ee,re(Ne,{get when(){return T().length>0},get fallback(){var Be=DT();return he(()=>me.modelsEmpty,(Pe,at)=>{q(Be,Pe,at)}),Be},get children(){var Be=bp();return ne(Be,re(on,{get each(){return T()},children:Pe=>{const at=Vi(),[gt,tt]=ge(null),On=async()=>{tt(null);const Re=await Se();if(!Re.ok){tt({ok:!1,text:Re.error});return}P(Pe),tt({ok:!0,text:"Cloned — removed"}),await e().placeEditor.claim(Re.atUri),setTimeout(()=>{at.close(),tt(null)},pt)};var Yt=FT(),De=Yt.firstChild,lt=De.nextSibling;return ne(De,re(Ne,{get when(){return te()[Pe]},get fallback(){var Re=vp();return he(()=>me.modelsCardPlaceholder,(qe,ct)=>{q(Re,qe,ct)}),Re},children:Re=>(()=>{var qe=wp();return ut(qe,"alt",Pe),he(()=>({e:me.modelsCardThumbnail,t:Re()}),({e:ct,t:Je},$t)=>{q(qe,ct,$t?.e),Je!==$t?.t&&ut(qe,"src",Je)}),qe})()})),ut(lt,"title",Pe),ne(lt,Pe),ne(Yt,re(Ne,{get when(){return Ze()},get fallback(){return[re(at.Trigger,{get class(){return me.modelsCardAction},title:`this place isn't yours — clone it to remove ${Pe} from your own copy`,children:"remove"}),Zt(()=>ie(at,"remove models from","Clone & Remove",gt,tt,()=>{On()}))]},get children(){var Re=NT();return Re.$$click=()=>P(Pe),ut(Re,"title",`remove ${Pe}`),he(()=>me.modelsCardAction,(qe,ct)=>{q(Re,qe,ct)}),Re}}),null),he(()=>({e:me.modelsCard,t:me.modelsCardPreview,a:me.modelsCardName}),({e:Re,t:qe,a:ct},Je)=>{q(Yt,Re,Je?.e),q(De,qe,Je?.t),q(lt,ct,Je?.a)}),Yt}})),he(()=>me.modelsCards,(Pe,at)=>{q(Be,Pe,at)}),Be}}),null),it.$$keydown=Be=>{Be.key==="Enter"&&B(S())},it.$$input=Be=>O(Be.currentTarget.value),en.$$click=()=>{B(S())},ne(mt,re(Ne,{get when(){return e().placeEditor.accountDid},children:Be=>(()=>{var Pe=BT();return Pe.$$click=()=>{le(Be())},he(()=>({e:me.button,t:F()}),({e:at,t:gt},tt)=>{q(Pe,at,tt?.e),gt!==tt?.t&&ut(Pe,"disabled",gt)}),Pe})()}),null),ne(Ce,re(Ne,{get when(){return w().length>0},get fallback(){var Be=yp();return ne(Be,()=>F()?"searching…":"no results yet"),he(()=>me.modelsEmpty,(Pe,at)=>{q(Be,Pe,at)}),Be},get children(){var Be=bp();return ne(Be,re(on,{get each(){return w()},children:Pe=>{const at=Vi(),[gt,tt]=ge(null),On=async()=>{tt(null);const Tt=await Se();if(!Tt.ok){tt({ok:!1,text:Tt.error});return}await oe(Pe),tt({ok:!0,text:"Cloned — attached"}),await e().placeEditor.claim(Tt.atUri),setTimeout(()=>{at.close(),tt(null)},pt)};var Yt=HT(),De=Yt.firstChild,lt=De.nextSibling,Re=lt.nextSibling,qe=Re.firstChild,ct=qe.nextSibling,Je=ct.nextSibling,$t=Je.nextSibling;return ne(De,re(Ne,{get when(){return te()[Q(Pe)]},get fallback(){var Tt=vp();return he(()=>me.modelsCardPlaceholder,(cn,xn)=>{q(Tt,cn,xn)}),Tt},children:Tt=>(()=>{var cn=wp();return he(()=>({e:me.modelsCardThumbnail,t:Tt(),a:Pe.record.name}),({e:xn,t:un,a:hr},kn)=>{q(cn,xn,kn?.e),un!==kn?.t&&ut(cn,"src",un),hr!==kn?.a&&ut(cn,"alt",hr)}),cn})()})),ne(lt,()=>Pe.record.name),ne(Re,()=>Pe.record.dimensions.width,qe),ne(Re,()=>Pe.record.dimensions.height,ct),ne(Re,()=>Pe.record.dimensions.depth,$t),ne(Yt,re(Ne,{get when(){return Ze()},get fallback(){return[re(at.Trigger,{get class(){return me.modelsCardAction},title:"this place isn't yours — clone it to attach models to your own copy",children:"attach"}),Zt(()=>ie(at,"attach","Clone & Attach",gt,tt,()=>{On()}))]},get children(){var Tt=UT();return Tt.$$click=()=>{oe(Pe)},he(()=>({e:me.modelsCardAction,t:l()}),({e:cn,t:xn},un)=>{q(Tt,cn,un?.e),xn!==un?.t&&ut(Tt,"disabled",xn)}),Tt}}),null),he(()=>({e:me.modelsCard,t:me.modelsCardPreview,a:me.modelsCardName,o:Pe.record.name,i:me.modelsCardDims}),({e:Tt,t:cn,a:xn,o:un,i:hr},kn)=>{q(Yt,Tt,kn?.e),q(De,cn,kn?.t),q(lt,xn,kn?.a),un!==kn?.o&&ut(lt,"title",un),q(Re,hr,kn?.i)}),Yt}})),he(()=>me.modelsCards,(Pe,at)=>{q(Be,Pe,at)}),Be}}),null),he(()=>({e:me.models,t:me.modelsAttached,a:me.modelsAttachedHeader,o:me.modelsHeading,i:me.modelsBrowse,n:me.modelsHeading,s:me.modelsSearch,h:me.text,r:S(),d:me.button,l:F()}),({e:Be,t:Pe,a:at,o:gt,i:tt,n:On,s:Yt,h:De,r:lt,d:Re,l:qe},ct)=>{q(W,Be,ct?.e),q(ee,Pe,ct?.t),q(K,at,ct?.a),q(ke,gt,ct?.o),q(Ce,tt,ct?.i),q(et,On,ct?.n),q(mt,Yt,ct?.s),q(it,De,ct?.h),it.value=lt??"",q(en,Re,ct?.d),qe!==ct?.l&&ut(en,"disabled",qe)}),W}})]}})),he(()=>me.content,(W,ee)=>{q(Me,W,ee)}),Me};Ir(["click","input","keydown","dblclick"]);const VT="_underlay_5etxy_1",GT="_anchor_5etxy_7",YT="_scrim_5etxy_30",qT="_panel_5etxy_44",XT="_editorOpen_5etxy_77",ZT="_terminal_5etxy_87",JT="_output_5etxy_114",QT="_help_5etxy_124",KT="_name_5etxy_137",eC="_args_5etxy_141",tC="_prompt_5etxy_145",nC="_prefix_5etxy_155",rC="_field_5etxy_160",sC="_input_5etxy_149",iC="_completion_5etxy_181",oC="_typed_5etxy_193",aC="_suggestions_5etxy_200",lC="_suggestion_5etxy_200",cC="_selected_5etxy_235",uC="_dockHeader_5etxy_240",hC="_dockLabel_5etxy_267",dC="_dockChevron_5etxy_275",dt={underlay:VT,anchor:GT,scrim:YT,panel:qT,editorOpen:XT,terminal:ZT,output:JT,help:QT,name:KT,args:eC,prompt:tC,"input-container":"_input-container_5etxy_149",prefix:nC,field:rC,input:sC,completion:iC,typed:oC,suggestions:aC,suggestion:lC,selected:cC,dockHeader:uC,dockLabel:hC,dockChevron:dC};var fC=de('<div><input placeholder="type a command (/help)"><!><ul popover=manual>'),_p=de("<div aria-hidden=true><span>"),pC=de("<li>"),mC=de("<div><span>> </span><span></span><span>"),gC=de("<dl>"),yC=de("<dt>"),bC=de("<span> "),vC=de("<dd><!><!>"),wC=de("<output>"),U0=de("<div>"),_C=de("<span>"),xC=de("<button type=button><span>>_</span><span>terminal"),kC=de("<div><span>>"),SC=de("<div><div>"),EC=de("<div><button>>_</button><!><!>");const AC=t=>{let e=null,n=null;const r=[],[s,i]=ge(-1),[o,a]=ge(()=>r[s()]),[l,c]=ge(0),u=P=>{if(!P.startsWith("/")||P.includes(" "))return[];const S=t.commands.map(O=>O.name).map(O=>[O,h(P,O)]).filter(O=>O[1]!==void 0).sort(([O,w],[R,F])=>F-w||O.length-R.length).map(([O])=>O);return S.length>1?S:S.filter(O=>O!==P)},h=(P,S)=>{let O=0,w=0,R=0;for(const F of P){const D=S.indexOf(F,O);if(D===-1)return;w=D===O?w+1:0,R+=w-(D-O),O=D+1}return R},d=(P,S)=>{const O=P.indexOf(":",S.length);return O===-1?P:P.slice(0,O+1)},f=()=>o()??"",m=()=>{const P=f(),S=t.commands.find(O=>O.name===P.trimEnd());return S?.args===void 0?"":`${P.endsWith(" ")?"":" "}${S.args}`},p=()=>u(f()),y=()=>p()[l()],g=P=>t.commands.some(S=>S.name===P),b=()=>{if(g(f()))return;const P=y();return P?.startsWith(f())?P:void 0};or(()=>t.open&&p().length>0,P=>{n.togglePopover(P)}),or(()=>l(),P=>{n.children[P]?.scrollIntoView({block:"nearest"})});const v=P=>{a(P),c(0),e.value=P,e.focus(),e.setSelectionRange(P.length,P.length)},x=P=>{switch(P.key){case"Enter":{const S=P.currentTarget.value.trim(),O=g(S)?S:u(S)[l()]??S;if(O==="")return;t.onCommand(O),r.push(O),c(0),a("");return}case"Tab":{const S=y();if(S===void 0)return;P.preventDefault();const O=S.startsWith(f())?d(S,f()):S;v(O),c(Math.max(0,u(O).indexOf(S)));return}case"ArrowUp":{const S=p().length;if(S>0){P.preventDefault(),c(O=>(O+S-1)%S);return}i(O=>O===-1?r.length-1:O-1);return}case"ArrowDown":{const S=p().length;if(S>0){P.preventDefault(),c(O=>(O+1)%S);return}i(O=>O===r.length-1?-1:O+1);return}}};t.ref({prefill:v});var k=fC(),C=k.firstChild,E=C.nextSibling,T=E.nextSibling;C.$$keydown=x,C.$$input=P=>{i(-1),c(0),a(P.currentTarget.value)};var A=e;typeof A=="function"||Array.isArray(A)?Zn(()=>A,C):e=C,ne(k,re(Ne,{get when(){return b()},children:P=>(()=>{var S=_p(),O=S.firstChild;return ne(O,f),ne(S,()=>P().slice(f().length),null),he(()=>({e:dt.completion,t:dt.typed}),({e:w,t:R},F)=>{q(S,w,F?.e),q(O,R,F?.t)}),S})()}),E),ne(k,re(Ne,{get when(){return m()},children:P=>(()=>{var S=_p(),O=S.firstChild;return ne(O,f),ne(S,P,null),he(()=>({e:dt.completion,t:dt.typed}),({e:w,t:R},F)=>{q(S,w,F?.e),q(O,R,F?.t)}),S})()}),T);var M=n;return typeof M=="function"||Array.isArray(M)?Zn(()=>M,T):n=T,ne(T,re(on,{get each(){return p()},children:(P,S)=>(()=>{var O=pC();return O.$$click=()=>v(P),O.$$mousedown=w=>w.preventDefault(),ne(O,P),he(()=>[dt.suggestion,{[dt.selected]:S()===l()}],(w,R)=>{q(O,w,R)}),O})()})),he(()=>({e:dt.field,t:o(),a:t.autofocus,o:dt.input,i:dt.suggestions}),({e:P,t:S,a:O,o:w,i:R},F)=>{q(k,P,F?.e),C.value=S??"",O!==F?.a&&ut(C,"autofocus",O),q(C,w,F?.o),q(T,R,F?.i)}),k},TC=t=>{const e=()=>t.command.split(/\s/)[0],n=()=>t.command.slice(e().length);var r=mC(),s=r.firstChild,i=s.nextSibling,o=i.nextSibling;return ne(i,e),ne(o,n),he(()=>({e:dt.prompt,t:dt.name,a:dt.args}),({e:a,t:l,a:c},u)=>{q(s,a,u?.e),q(i,l,u?.t),q(o,c,u?.a)}),r},CC=t=>(()=>{var e=gC();return ne(e,re(on,{get each(){return t.commands},children:n=>[(()=>{var r=yC();return ne(r,()=>n.name),he(()=>dt.name,(s,i)=>{q(r,s,i)}),r})(),(()=>{var r=vC(),s=r.firstChild,i=s.nextSibling;return ne(r,re(Ne,{get when(){return n.args},get children(){var o=bC(),a=o.firstChild;return ne(o,()=>n.args,a),he(()=>dt.args,(l,c)=>{q(o,l,c)}),o}}),s),ne(r,()=>n.description,i),r})()]})),he(()=>dt.help,(n,r)=>{q(e,n,r)}),e})(),MC=t=>{let e=null;or(()=>t.entries,()=>{e.scrollTop=e.scrollHeight});var n=wC(),r=e;return typeof r=="function"||Array.isArray(r)?Zn(()=>r,n):e=n,ne(n,re(on,{get each(){return t.entries},children:s=>{switch(s.kind){case"echo":return re(TC,{get command(){return s.command}});case"help":return re(CC,{get commands(){return s.commands}});default:var i=U0();return ne(i,()=>s.text),i}}})),he(()=>dt.output,(s,i)=>{q(n,s,i)}),n};function RC(t){const[e,n]=ge([]),r=(...a)=>{n(l=>[...l,...a])},s=a=>typeof a=="string"?a.split(`
`).map(l=>({kind:"line",text:l})):[{kind:"help",commands:a}];t.notice!==void 0&&or(()=>t.notice(),a=>{a!==void 0&&r({kind:"line",text:a})});async function i(a){if(a==="/clear"){n([]);return}const l=t.onCommand(a);if(!(l instanceof Promise)){r({kind:"echo",command:a},...s(l));return}r({kind:"echo",command:a},{kind:"line",text:"…"});try{r(...s(await l))}catch(c){r({kind:"line",text:`command failed: ${String(c)}`})}}const o=a=>{r({kind:"line",text:a})};return{entries:e,commands:t.commands,onCommand:i,print:o}}const IC=t=>[(()=>{var e=xC(),n=e.firstChild,r=n.nextSibling;return e.$$click=()=>t.onToggle(),ne(e,re(Ne,{get when(){return t.minimizable},get children(){var s=_C();return ne(s,()=>t.expanded?"▾":"▸"),he(()=>dt.dockChevron,(i,o)=>{q(s,i,o)}),s}}),null),he(()=>({e:dt.dockHeader,t:!t.minimizable,a:t.expanded?"true":"false",o:t.expanded?"collapse terminal":"expand terminal",i:dt.prompt,n:dt.dockLabel}),({e:s,t:i,a:o,o:a,i:l,n:c},u)=>{q(e,s,u?.e),i!==u?.t&&ut(e,"disabled",i),o!==u?.a&&ut(e,"aria-expanded",o),a!==u?.o&&ut(e,"aria-label",a),q(n,l,u?.i),q(r,c,u?.n)}),e})(),re(Ne,{get when(){return t.expanded},get children(){return re(MC,{get entries(){return t.terminal.entries()}})}}),(()=>{var e=kC(),n=e.firstChild;return ne(e,re(AC,{get commands(){return t.terminal.commands()},open:!0,autofocus:!0,get onCommand(){return t.terminal.onCommand},ref:r=>t.ref(r)}),null),he(()=>({e:dt["input-container"],t:dt.prefix}),({e:r,t:s},i)=>{q(e,r,i?.e),q(n,s,i?.t)}),e})()],zC=t=>{const e=t.voxelscape,n=Kl("(any-pointer: coarse)"),r=()=>e().placeEditor.open(),[s,i]=ge(!1),[o,a]=ge(!n()),l=()=>s()||r();let c=null,u=null,h=null,d=null;or(()=>r(),v=>{v&&document.pointerLockElement!==null&&document.exitPointerLock()}),or(()=>r(),v=>{v&&a(!1)});const f=new AbortController;bn(()=>f.abort()),window.addEventListener("keydown",v=>{if(v.key==="/"&&!v.ctrlKey&&!v.metaKey&&!v.altKey&&!Ha(v)){v.preventDefault(),i(!0),Fs(),h.prefill("/");return}if(v.key==="Escape"){if(r()){d!==null&&v.target instanceof Node&&d.contains(v.target)||e().placeEditor.setOpen(!1);return}s()&&i(!1)}},{signal:f.signal}),window.addEventListener("pointerdown",v=>{!s()||r()||v.target instanceof Node&&!c.contains(v.target)&&!u.contains(v.target)&&i(!1)},{signal:f.signal});var m=EC(),p=m.firstChild,y=p.nextSibling,g=y.nextSibling;p.$$click=()=>i(v=>!v);var b=u;return typeof b=="function"||Array.isArray(b)?Zn(()=>b,p):u=p,ne(m,re(Ne,{get when(){return r()},get children(){var v=U0();return v.$$click=x=>{x.target===x.currentTarget&&e().placeEditor.setOpen(!1)},he(()=>dt.scrim,(x,k)=>{q(v,x,k)}),v}}),y),ne(m,re(Ne,{get when(){return l()},get children(){var v=SC(),x=v.firstChild,k=c;return typeof k=="function"||Array.isArray(k)?Zn(()=>k,v):c=v,ne(v,re(Ne,{get when(){return r()},get children(){return re(WT,{ref:C=>{d=C},voxelscape:e,onStatus:C=>{t.terminal.print(C),a(!0)}})}}),x),ne(x,re(IC,{get terminal(){return t.terminal},get expanded(){return Zt(()=>!!r())()?o():!0},onToggle:()=>a(C=>!C),get minimizable(){return r()},ref:C=>{h=C}})),he(()=>({e:[dt.panel,r()&&dt.editorOpen],t:r()?"dialog":void 0,a:r()?"place script editor":void 0,o:dt.terminal}),({e:C,t:E,a:T,o:A},M)=>{q(v,C,M?.e),E!==M?.t&&ut(v,"role",E),T!==M?.a&&ut(v,"aria-label",T),q(x,A,M?.o)}),v}}),g),he(()=>({e:dt.underlay,t:dt.anchor}),({e:v,t:x},k)=>{q(m,v,k?.e),q(p,x,k?.t)}),m};Ir(["input","keydown","mousedown","click"]);const PC="_overlay_9y4mt_1",OC="_hint_9y4mt_11",$C="_bubble_9y4mt_20",LC="_speaker_9y4mt_31",DC="_prompt_9y4mt_39",NC="_actions_9y4mt_46",FC="_option_9y4mt_53",BC="_leave_9y4mt_67",UC="_hud_9y4mt_96",HC="_narration_9y4mt_140",Lt={overlay:PC,hint:OC,bubble:$C,speaker:LC,prompt:DC,actions:NC,option:FC,leave:BC,"letterbox-top":"_letterbox-top_9y4mt_78","letterbox-bottom":"_letterbox-bottom_9y4mt_79",hud:UC,"hud-item":"_hud-item_9y4mt_107","hud-label":"_hud-label_9y4mt_113","hud-bar":"_hud-bar_9y4mt_121","hud-bar-fill":"_hud-bar-fill_9y4mt_129","hud-text":"_hud-text_9y4mt_134",narration:HC,"narration-name":"_narration-name_9y4mt_154","narration-text":"_narration-text_9y4mt_162"},jC="/big-mesh-studios/voxelscape/audio/letter-tick.ogg",WC=.6;class VC{context=null;buffer=null;bytes=null;constructor(){this.bytes=fetch(jC).then(e=>e.ok?e.arrayBuffer():null).catch(()=>null),window.addEventListener("pointerdown",()=>this.unlock(),{once:!0}),window.addEventListener("keydown",()=>this.unlock(),{once:!0})}unlock(){if(this.context!==null){this.context.resume(),this.decode();return}const e=window.AudioContext??window.webkitAudioContext;e!==void 0&&(this.context=new e,this.decode())}async decode(){if(this.context===null||this.buffer!==null||this.bytes===null)return;const e=await this.bytes;if(!(e===null||this.context===null))try{this.buffer=await this.context.decodeAudioData(e)}catch{this.buffer=null}}play(){this.unlock();const e=this.context;if(e===null)return;e.state==="suspended"&&e.resume();const n=e.createGain();if(n.gain.value=WC,n.connect(e.destination),this.buffer!==null){const r=e.createBufferSource();r.buffer=this.buffer,r.connect(n),r.start();return}this.synthesize(e,n)}synthesize(e,n){const r=e.createOscillator();r.type="triangle";const s=e.currentTime;r.frequency.setValueAtTime(1250,s),r.frequency.exponentialRampToValueAtTime(700,s+.03),n.gain.setValueAtTime(.4,s),n.gain.exponentialRampToValueAtTime(.001,s+.035),r.connect(n),r.start(s),r.stop(s+.04)}}const GC=new VC;var ja=de("<div>"),xp=de("<span>"),YC=de("<div><div>"),qC=de("<div><!><!>"),H0=de("<div><div></div><div>"),XC=de("<div> — tap to <!>"),ZC=de('<button aria-label="walk away">✕'),JC=de("<div><!><!><!><!><!>"),QC=de("<button>");const KC=36,eM=6e3,tM=t=>t.max<=0?0:Math.max(0,Math.min(100,t.value/t.max*100)),nM=()=>{const t=cr(),[e,n]=ge([]);return Xr(()=>{let r=0,s="";const i=()=>{const o=t.hud(),a=JSON.stringify(o);a!==s&&(s=a,n(o)),r=requestAnimationFrame(i)};return r=requestAnimationFrame(i),()=>cancelAnimationFrame(r)}),re(Ne,{get when(){return e().length>0},get children(){var r=ja();return ne(r,re(on,{get each(){return e()},children:s=>(()=>{var i=qC(),o=i.firstChild,a=o.nextSibling;return ne(i,re(Ne,{get when(){return s.label!==""},get children(){var l=xp();return ne(l,()=>s.label),he(()=>Lt["hud-label"],(c,u)=>{q(l,c,u)}),l}}),o),ne(i,re(Ne,{get when(){return s.kind==="bar"},get fallback(){var l=xp();return ne(l,()=>s.text),he(()=>Lt["hud-text"],(c,u)=>{q(l,c,u)}),l},get children(){var l=YC(),c=l.firstChild;return he(()=>({e:Lt["hud-bar"],t:Lt["hud-bar-fill"],a:`${tM(s)}%`}),({e:u,t:h,a:d},f)=>{q(l,u,f?.e),q(c,h,f?.t),d!==f?.a&&Rt(c,"width",d)}),l}}),a),he(()=>Lt["hud-item"],(l,c)=>{q(i,l,c)}),i})()})),he(()=>Lt.hud,(s,i)=>{q(r,s,i)}),r}})},rM=()=>{const t=cr(),[e,n]=ge(null);return Xr(()=>{let r=null,s,i=0;const o=()=>{const a=t.narration();a!==r&&(r=a,n(a),s!==void 0&&(clearTimeout(s),s=void 0),a!==null&&(s=setTimeout(()=>t.dismissNarration(),eM))),i=requestAnimationFrame(o)};return i=requestAnimationFrame(o),()=>{cancelAnimationFrame(i),s!==void 0&&clearTimeout(s)}}),re(Ne,{get when(){return e()!==null},get children(){var r=H0(),s=r.firstChild,i=s.nextSibling;return ne(s,()=>e().name),ne(i,()=>e().text),he(()=>({e:Lt.narration,t:Lt["narration-name"],a:Lt["narration-text"]}),({e:o,t:a,a:l},c)=>{q(r,o,c?.e),q(s,a,c?.t),q(i,l,c?.a)}),r}})},sM=()=>{const t=cr(),[e,n]=ge(""),[r,s]=ge(""),[i,o]=ge(!1),[a,l]=ge([]),[c,u]=ge("");Xr(()=>{let b=0,v="",x=0,k=0;const C=E=>{const T=t.dialog(),A=T?.prompt??"",M=T===null?"":`${T.npcId}\0${A}`;if(M!==v&&(v=M,T===null?(n(""),s(""),u(""),l([]),o(!1)):(n(T.name),u(A),l(T.options),x=0,k=E,s(""),o(!1))),T!==null&&!i()){const P=Math.floor((E-k)/KC),S=Math.min(A.length,1+P);for(;x<S;){x++;const O=A[x-1];O!==void 0&&O!==" "&&GC.play()}s(A.slice(0,x)),x>=A.length&&o(!0)}b=requestAnimationFrame(C)};return b=requestAnimationFrame(C),()=>cancelAnimationFrame(b)});const h=()=>{i()||(s(c()),o(!0))};var d=JC(),f=d.firstChild,m=f.nextSibling,p=m.nextSibling,y=p.nextSibling,g=y.nextSibling;return ne(d,re(Ne,{get when(){return t.cutscene()},get children(){return[(()=>{var b=ja();return he(()=>Lt["letterbox-top"],(v,x)=>{q(b,v,x)}),b})(),(()=>{var b=ja();return he(()=>Lt["letterbox-bottom"],(v,x)=>{q(b,v,x)}),b})()]}}),f),ne(d,re(nM,{}),m),ne(d,re(rM,{}),p),ne(d,re(Ne,{get when(){return Zt(()=>t.dialog()===null)()&&t.npcAim()!==null},get children(){var b=XC(),v=b.firstChild,x=v.nextSibling;return ne(b,()=>t.npcAim().name,v),ne(b,()=>t.npcAim().action,x),he(()=>Lt.hint,(k,C)=>{q(b,k,C)}),b}}),y),ne(d,re(Ne,{get when(){return t.dialog()!==null},get children(){var b=H0(),v=b.firstChild,x=v.nextSibling;return ne(v,e),x.$$pointerdown=h,ne(x,r),ne(b,re(Ne,{get when(){return i()},get children(){return[(()=>{var k=ja();return ne(k,re(on,{get each(){return a()},children:(C,E)=>(()=>{var T=QC();return T.$$pointerdown=()=>t.choose(E()),ne(T,C),he(()=>Lt.option,(A,M)=>{q(T,A,M)}),T})()})),he(()=>Lt.actions,(C,E)=>{q(k,C,E)}),k})(),(()=>{var k=ZC();return k.$$pointerdown=()=>t.leaveDialog(),he(()=>Lt.leave,(C,E)=>{q(k,C,E)}),k})()]}}),null),he(()=>({e:Lt.bubble,t:Lt.speaker,a:Lt.prompt}),({e:k,t:C,a:E},T)=>{q(b,k,T?.e),q(v,C,T?.t),q(x,E,T?.a)}),b}}),g),he(()=>Lt.overlay,(b,v)=>{q(d,b,v)}),d};Ir(["pointerdown"]);const iM="_hud_1k1rj_1",oM="_crosshair_1k1rj_7",aM="_voxel_1k1rj_21",lM="_strikeable_1k1rj_25",cM="_hotbar_1k1rj_42",uM="_item_1k1rj_50",hM="_active_1k1rj_68",dM="_name_1k1rj_72",fM="_icon_1k1rj_75",pM="_count_1k1rj_80",mM="_status_1k1rj_86",fn={hud:iM,crosshair:oM,voxel:aM,strikeable:lM,"vertical-stroke":"_vertical-stroke_1k1rj_29","horizontal-stroke":"_horizontal-stroke_1k1rj_34",hotbar:cM,item:uM,active:hM,name:dM,icon:fM,count:pM,status:mM};let wt=class j0{x;y;z;constructor(e=0,n=0,r=0){this.x=e,this.y=n,this.z=r}set(e,n,r){return this.x=e,this.y=n,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setComponent(e,n){switch(e){case 0:this.x=n;break;case 1:this.y=n;break;case 2:this.z=n;break;default:throw new Error(`index is out of range: ${e}`)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error(`index is out of range: ${e}`)}}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}clone(){return new j0(this.x,this.y,this.z)}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subVectors(e,n){return this.x=e.x-n.x,this.y=e.y-n.y,this.z=e.z-n.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}divideScalar(e){return this.multiplyScalar(1/e)}negate(){return this.multiplyScalar(-1)}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}cross(e){return this.crossVectors(this,e)}crossVectors(e,n){const r=e.x,s=e.y,i=e.z,o=n.x,a=n.y,l=n.z;return this.x=s*l-i*a,this.y=i*o-r*l,this.z=r*a-s*o,this}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.lengthSq())}lengthManhattan(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,r=this.y-e.y,s=this.z-e.z;return n*n+r*r+s*s}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this}applyMatrix3(e){const n=this.x,r=this.y,s=this.z,i=e.elements;return this.x=i[0]*n+i[3]*r+i[6]*s,this.y=i[1]*n+i[4]*r+i[7]*s,this.z=i[2]*n+i[5]*r+i[8]*s,this}applyMatrix4(e){const n=this.x,r=this.y,s=this.z,i=e.elements,o=1/(i[3]*n+i[7]*r+i[11]*s+i[15]);return this.x=(i[0]*n+i[4]*r+i[8]*s+i[12])*o,this.y=(i[1]*n+i[5]*r+i[9]*s+i[13])*o,this.z=(i[2]*n+i[6]*r+i[10]*s+i[14])*o,this}applyQuaternion(e){const n=this.x,r=this.y,s=this.z,i=e.x,o=e.y,a=e.z,l=e.w,c=l*n+o*s-a*r,u=l*r+a*n-i*s,h=l*s+i*r-o*n,d=-i*n-o*r-a*s;return this.x=c*l+d*-i+u*-a-h*-o,this.y=u*l+d*-o+h*-i-c*-a,this.z=h*l+d*-a+c*-o-u*-i,this}transformDirection(e){const n=this.x,r=this.y,s=this.z,i=e.elements;return this.x=i[0]*n+i[4]*r+i[8]*s,this.y=i[1]*n+i[5]*r+i[9]*s,this.z=i[2]*n+i[6]*r+i[10]*s,this.normalize()}projectOnVector(e){const n=e.lengthSq();return n===0?this.set(0,0,0):this.copy(e).multiplyScalar(this.dot(e)/n)}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}setFromSphericalCoords(e,n,r){const s=Math.sin(n)*e;return this.x=s*Math.sin(r),this.y=Math.cos(n)*e,this.z=s*Math.cos(r),this}setFromMatrixPosition(e){const n=e.elements;return this.x=n[12],this.y=n[13],this.z=n[14],this}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e}},gM=class W0{elements;constructor(e=1,n=0,r=0,s=0,i=1,o=0,a=0,l=0,c=1){this.elements=[e,n,r,s,i,o,a,l,c]}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}clone(){return new W0().fromArray(this.elements)}copy(e){return this.fromArray(e.elements),this}set(e,n,r,s,i,o,a,l,c){const u=this.elements;return u[0]=e,u[3]=s,u[6]=a,u[1]=n,u[4]=i,u[7]=l,u[2]=r,u[5]=o,u[8]=c,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){const r=e.elements,s=n.elements,i=this.elements,o=r[0],a=r[3],l=r[6],c=r[1],u=r[4],h=r[7],d=r[2],f=r[5],m=r[8],p=s[0],y=s[3],g=s[6],b=s[1],v=s[4],x=s[7],k=s[2],C=s[5],E=s[8];return i[0]=o*p+a*b+l*k,i[3]=o*y+a*v+l*C,i[6]=o*g+a*x+l*E,i[1]=c*p+u*b+h*k,i[4]=c*y+u*v+h*C,i[7]=c*g+u*x+h*E,i[2]=d*p+f*b+m*k,i[5]=d*y+f*v+m*C,i[8]=d*g+f*x+m*E,this}determinant(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return n*o*u-n*a*c-r*i*u+r*a*l+s*i*c-s*o*l}invert(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=o*u-a*c,d=a*l-i*u,f=i*c-o*l,m=n*h+r*d+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const p=1/m;return e[0]=h*p,e[1]=(s*c-r*u)*p,e[2]=(r*a-s*o)*p,e[3]=d*p,e[4]=(n*u-s*l)*p,e[5]=(s*i-n*a)*p,e[6]=f*p,e[7]=(r*l-n*c)*p,e[8]=(n*o-r*i)*p,this}transpose(){let e;const n=this.elements;return e=n[1],n[1]=n[3],n[3]=e,e=n[2],n[2]=n[6],n[6]=e,e=n[5],n[5]=n[7],n[7]=e,this}setFromMatrix4(e){const n=e.elements;return this.set(n[0],n[4],n[8],n[1],n[5],n[9],n[2],n[6],n[10]),this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}fromArray(e,n=0){for(let r=0;r<9;r++)this.elements[r]=e[n+r];return this}toArray(e=[],n=0){for(let r=0;r<9;r++)e[n+r]=this.elements[r];return e}equals(e){const n=this.elements,r=e.elements;for(let s=0;s<9;s++)if(n[s]!==r[s])return!1;return!0}},sr=class V0{elements;constructor(e=1,n=0,r=0,s=0,i=0,o=1,a=0,l=0,c=0,u=0,h=1,d=0,f=0,m=0,p=0,y=1){this.elements=[e,i,c,f,n,o,u,m,r,a,h,p,s,l,d,y]}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new V0().fromArray(this.elements)}copy(e){return this.fromArray(e.elements),this}set(e,n,r,s,i,o,a,l,c,u,h,d,f,m,p,y){const g=this.elements;return g[0]=e,g[4]=n,g[8]=r,g[12]=s,g[1]=i,g[5]=o,g[9]=a,g[13]=l,g[2]=c,g[6]=u,g[10]=h,g[14]=d,g[3]=f,g[7]=m,g[11]=p,g[15]=y,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,n){const r=e.elements,s=n.elements,i=this.elements,o=r[0],a=r[4],l=r[8],c=r[12],u=r[1],h=r[5],d=r[9],f=r[13],m=r[2],p=r[6],y=r[10],g=r[14],b=r[3],v=r[7],x=r[11],k=r[15],C=s[0],E=s[4],T=s[8],A=s[12],M=s[1],P=s[5],S=s[9],O=s[13],w=s[2],R=s[6],F=s[10],D=s[14],te=s[3],H=s[7],Q=s[11],N=s[15];return i[0]=o*C+a*M+l*w+c*te,i[4]=o*E+a*P+l*R+c*H,i[8]=o*T+a*S+l*F+c*Q,i[12]=o*A+a*O+l*D+c*N,i[1]=u*C+h*M+d*w+f*te,i[5]=u*E+h*P+d*R+f*H,i[9]=u*T+h*S+d*F+f*Q,i[13]=u*A+h*O+d*D+f*N,i[2]=m*C+p*M+y*w+g*te,i[6]=m*E+p*P+y*R+g*H,i[10]=m*T+p*S+y*F+g*Q,i[14]=m*A+p*O+y*D+g*N,i[3]=b*C+v*M+x*w+k*te,i[7]=b*E+v*P+x*R+k*H,i[11]=b*T+v*S+x*F+k*Q,i[15]=b*A+v*O+x*D+k*N,this}determinant(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=e[9],d=e[10],f=e[11],m=e[12],p=e[13],y=e[14],g=e[15],b=h*y*c-p*d*c+p*l*f-a*y*f-h*l*g+a*d*g,v=m*d*c-u*y*c-m*l*f+o*y*f+u*l*g-o*d*g,x=u*p*c-m*h*c+m*a*f-o*p*f-u*a*g+o*h*g,k=m*h*l-u*p*l-m*a*d+o*p*d+u*a*y-o*h*y;return n*b+r*v+s*x+i*k}invert(){const e=this.elements,n=e[0],r=e[1],s=e[2],i=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=e[9],d=e[10],f=e[11],m=e[12],p=e[13],y=e[14],g=e[15],b=h*y*c-p*d*c+p*l*f-a*y*f-h*l*g+a*d*g,v=m*d*c-u*y*c-m*l*f+o*y*f+u*l*g-o*d*g,x=u*p*c-m*h*c+m*a*f-o*p*f-u*a*g+o*h*g,k=m*h*l-u*p*l-m*a*d+o*p*d+u*a*y-o*h*y,C=n*b+r*v+s*x+i*k;if(C===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/C;return e[0]=b*E,e[1]=(p*d*i-h*y*i-p*s*f+r*y*f+h*s*g-r*d*g)*E,e[2]=(a*y*i-p*l*i+p*s*c-r*y*c-a*s*g+r*l*g)*E,e[3]=(h*l*i-a*d*i-h*s*c+r*d*c+a*s*f-r*l*f)*E,e[4]=v*E,e[5]=(u*y*i-m*d*i+m*s*f-n*y*f-u*s*g+n*d*g)*E,e[6]=(m*l*i-o*y*i-m*s*c+n*y*c+o*s*g-n*l*g)*E,e[7]=(o*d*i-u*l*i+u*s*c-n*d*c-o*s*f+n*l*f)*E,e[8]=x*E,e[9]=(m*h*i-u*p*i-m*r*f+n*p*f+u*r*g-n*h*g)*E,e[10]=(o*p*i-m*a*i+m*r*c-n*p*c-o*r*g+n*a*g)*E,e[11]=(u*a*i-o*h*i-u*r*c+n*h*c+o*r*f-n*a*f)*E,e[12]=k*E,e[13]=(u*p*s-m*h*s+m*r*d-n*p*d-u*r*y+n*h*y)*E,e[14]=(m*a*s-o*p*s-m*r*l+n*p*l+o*r*y-n*a*y)*E,e[15]=(o*h*s-u*a*s+u*r*l-n*h*l-o*r*d+n*a*d)*E,this}transpose(){let e;const n=this.elements;return e=n[1],n[1]=n[4],n[4]=e,e=n[2],n[2]=n[8],n[8]=e,e=n[6],n[6]=n[9],n[9]=e,e=n[3],n[3]=n[12],n[12]=e,e=n[7],n[7]=n[13],n[13]=e,e=n[11],n[11]=n[14],n[14]=e,this}setPosition(e){const n=Array.isArray(e)?e[0]:e.x,r=Array.isArray(e)?e[1]:e.y,s=Array.isArray(e)?e[2]:e.z,i=this.elements;return i[12]=n,i[13]=r,i[14]=s,this}setFromMatrixPosition(e){const n=e.elements;return this.set(1,0,0,n[12],0,1,0,n[13],0,0,1,n[14],0,0,0,1),this}extractRotation(e){const n=this.elements,r=e.elements,s=1/si.set(r[0],r[1],r[2]).length(),i=1/si.set(r[4],r[5],r[6]).length(),o=1/si.set(r[8],r[9],r[10]).length();return n[0]=r[0]*s,n[1]=r[1]*s,n[2]=r[2]*s,n[4]=r[4]*i,n[5]=r[5]*i,n[6]=r[6]*i,n[8]=r[8]*o,n[9]=r[9]*o,n[10]=r[10]*o,n[3]=0,n[7]=0,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,this}makeTranslation(e,n,r){return this.set(1,0,0,e,0,1,0,n,0,0,1,r,0,0,0,1)}makeRotationX(e){const n=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,n,-r,0,0,r,n,0,0,0,0,1)}makeRotationY(e){const n=Math.cos(e),r=Math.sin(e);return this.set(n,0,r,0,0,1,0,0,-r,0,n,0,0,0,0,1)}makeRotationZ(e){const n=Math.cos(e),r=Math.sin(e);return this.set(n,-r,0,0,r,n,0,0,0,0,1,0,0,0,0,1)}makeRotationFromQuaternion(e){return this.compose(yM,e,bM)}makeScale(e,n,r){return this.set(e,0,0,0,0,n,0,0,0,0,r,0,0,0,0,1)}makePerspective(e,n,r,s,i,o){const a=this.elements,l=2*i/(n-e),c=2*i/(r-s),u=(n+e)/(n-e),h=(r+s)/(r-s),d=-(o+i)/(o-i),f=-2*o*i/(o-i);return a[0]=l,a[4]=0,a[8]=u,a[12]=0,a[1]=0,a[5]=c,a[9]=h,a[13]=0,a[2]=0,a[6]=0,a[10]=d,a[14]=f,a[3]=0,a[7]=0,a[11]=-1,a[15]=0,this}makeOrthographic(e,n,r,s,i,o){const a=this.elements,l=1/(n-e),c=1/(r-s),u=1/(o-i),h=(n+e)*l,d=(r+s)*c,f=(o+i)*u;return a[0]=2*l,a[4]=0,a[8]=0,a[12]=-h,a[1]=0,a[5]=2*c,a[9]=0,a[13]=-d,a[2]=0,a[6]=0,a[10]=-2*u,a[14]=-f,a[3]=0,a[7]=0,a[11]=0,a[15]=1,this}lookAt(e,n,r){const s=this.elements;return Tn.subVectors(e,n),Tn.lengthSq()===0&&(Tn.z=1),Tn.normalize(),ts.crossVectors(r,Tn),ts.lengthSq()===0&&(Math.abs(r.z)===1?Tn.x+=1e-4:Tn.z+=1e-4,Tn.normalize(),ts.crossVectors(r,Tn)),ts.normalize(),fa.crossVectors(Tn,ts),s[0]=ts.x,s[4]=fa.x,s[8]=Tn.x,s[1]=ts.y,s[5]=fa.y,s[9]=Tn.y,s[2]=ts.z,s[6]=fa.z,s[10]=Tn.z,this}compose(e,n,r){const s=this.elements,i=n.x,o=n.y,a=n.z,l=n.w,c=i+i,u=o+o,h=a+a,d=i*c,f=i*u,m=i*h,p=o*u,y=o*h,g=a*h,b=l*c,v=l*u,x=l*h,k=r.x,C=r.y,E=r.z;return s[0]=(1-(p+g))*k,s[1]=(f+x)*k,s[2]=(m-v)*k,s[3]=0,s[4]=(f-x)*C,s[5]=(1-(d+g))*C,s[6]=(y+b)*C,s[7]=0,s[8]=(m+v)*E,s[9]=(y-b)*E,s[10]=(1-(d+p))*E,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,n,r){const s=this.elements;let i=si.set(s[0],s[1],s[2]).length();const o=si.set(s[4],s[5],s[6]).length(),a=si.set(s[8],s[9],s[10]).length();this.determinant()<0&&(i=-i),e.x=s[12],e.y=s[13],e.z=s[14],Qn.copy(this);const l=1/i,c=1/o,u=1/a;return Qn.elements[0]*=l,Qn.elements[1]*=l,Qn.elements[2]*=l,Qn.elements[4]*=c,Qn.elements[5]*=c,Qn.elements[6]*=c,Qn.elements[8]*=u,Qn.elements[9]*=u,Qn.elements[10]*=u,n.setFromRotationMatrix(Qn),r.x=i,r.y=o,r.z=a,this}equals(e){const n=this.elements,r=e.elements;for(let s=0;s<16;s++)if(n[s]!==r[s])return!1;return!0}fromArray(e,n=0){for(let r=0;r<16;r++)this.elements[r]=e[n+r];return this}toArray(e=[],n=0){for(let r=0;r<16;r++)e[n+r]=this.elements[r];return e}};const yM=new wt(0,0,0),bM=new wt(1,1,1),ts=new wt,fa=new wt,Tn=new wt,si=new wt,Qn=new sr;let $o=class G0{x;y;z;w;constructor(e=0,n=0,r=0,s=1){this.x=e,this.y=n,this.z=r,this.w=s}set(e,n,r,s){return this.x=e,this.y=n,this.z=r,this.w=s,this}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w,this}clone(){return new G0(this.x,this.y,this.z,this.w)}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,n){const r=e.x,s=e.y,i=e.z,o=e.w,a=n.x,l=n.y,c=n.z,u=n.w;return this.x=r*u+o*a+s*c-i*l,this.y=s*u+o*l+i*a-r*c,this.z=i*u+o*c+r*l-s*a,this.w=o*u-r*a-s*l-i*c,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.lengthSq())}normalize(){let e=this.length();return e===0?(this.x=0,this.y=0,this.z=0,this.w=1):(e=1/e,this.x*=e,this.y*=e,this.z*=e,this.w*=e),this}conjugate(){return this.x*=-1,this.y*=-1,this.z*=-1,this}invert(){return this.conjugate().normalize()}setFromEuler(e){const n=e.x,r=e.y,s=e.z,i=e.order,o=Math.cos(n/2),a=Math.cos(r/2),l=Math.cos(s/2),c=Math.sin(n/2),u=Math.sin(r/2),h=Math.sin(s/2);switch(i){case"XYZ":this.x=c*a*l+o*u*h,this.y=o*u*l-c*a*h,this.z=o*a*h+c*u*l,this.w=o*a*l-c*u*h;break;case"YXZ":this.x=c*a*l+o*u*h,this.y=o*u*l-c*a*h,this.z=o*a*h-c*u*l,this.w=o*a*l+c*u*h;break;case"ZXY":this.x=c*a*l-o*u*h,this.y=o*u*l+c*a*h,this.z=o*a*h+c*u*l,this.w=o*a*l-c*u*h;break;case"ZYX":this.x=c*a*l-o*u*h,this.y=o*u*l+c*a*h,this.z=o*a*h-c*u*l,this.w=o*a*l+c*u*h;break;case"YZX":this.x=c*a*l+o*u*h,this.y=o*u*l+c*a*h,this.z=o*a*h-c*u*l,this.w=o*a*l-c*u*h;break;case"XZY":this.x=c*a*l-o*u*h,this.y=o*u*l-c*a*h,this.z=o*a*h+c*u*l,this.w=o*a*l+c*u*h;break;default:throw new Error(`unsupported euler order: ${i}`)}return this}setFromAxisAngle(e,n){const r=n/2,s=Math.sin(r);return this.x=e.x*s,this.y=e.y*s,this.z=e.z*s,this.w=Math.cos(r),this}setFromRotationMatrix(e){const n=e.elements,r=n[0],s=n[4],i=n[8],o=n[1],a=n[5],l=n[9],c=n[2],u=n[6],h=n[10],d=r+a+h;if(d>0){const f=.5/Math.sqrt(d+1);this.w=.25/f,this.x=(u-l)*f,this.y=(i-c)*f,this.z=(o-s)*f}else if(r>a&&r>h){const f=2*Math.sqrt(1+r-a-h);this.w=(u-l)/f,this.x=.25*f,this.y=(s+o)/f,this.z=(i+c)/f}else if(a>h){const f=2*Math.sqrt(1+a-r-h);this.w=(i-c)/f,this.x=(s+o)/f,this.y=.25*f,this.z=(l+u)/f}else{const f=2*Math.sqrt(1+h-r-a);this.w=(o-s)/f,this.x=(i+c)/f,this.y=(l+u)/f,this.z=.25*f}return this}slerp(e,n){if(n===0)return this;if(n===1)return this.copy(e);const r=this.x,s=this.y,i=this.z,o=this.w;let a=o*e.w+r*e.x+s*e.y+i*e.z;if(a<0?(this.w=-e.w,this.x=-e.x,this.y=-e.y,this.z=-e.z,a=-a):this.copy(e),a>=1)return this.w=o,this.x=r,this.y=s,this.z=i,this;const l=1-a*a;if(l<=Number.EPSILON){const f=1-n;return this.w=f*o+n*this.w,this.x=f*r+n*this.x,this.y=f*s+n*this.y,this.z=f*i+n*this.z,this.normalize()}const c=Math.sqrt(l),u=Math.atan2(c,a),h=Math.sin((1-n)*u)/c,d=Math.sin(n*u)/c;return this.w=o*h+this.w*d,this.x=r*h+this.x*d,this.y=s*h+this.y*d,this.z=i*h+this.z*d,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this.w=e[n+3],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.w,e}},vM=class Y0{_x;_y;_z;_onChangeCallback=null;order;constructor(e=0,n=0,r=0,s="XYZ"){this._x=e,this._y=n,this._z=r,this.order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback?.()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback?.()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback?.()}_onChange(e){this._onChangeCallback=e}setXYZ(e,n,r){return this._x=e,this._y=n,this._z=r,this._onChangeCallback?.(),this}set(e,n,r,s=this.order){return this._x=e,this._y=n,this._z=r,this.order=s,this._onChangeCallback?.(),this}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this.order=e.order,this._onChangeCallback?.(),this}clone(){return new Y0(this.x,this.y,this.z,this.order)}setFromRotationMatrix(e,n=this.order){const r=e.elements,s=r[0],i=r[4],o=r[8],a=r[1],l=r[5],c=r[9],u=r[2],h=r[6],d=r[10];switch(n){case"XYZ":this.y=Math.asin(Math.min(1,Math.max(-1,o))),Math.abs(o)<.9999999?(this.x=Math.atan2(-c,d),this.z=Math.atan2(-i,s)):(this.x=Math.atan2(h,l),this.z=0);break;case"YXZ":this.x=Math.asin(-Math.min(1,Math.max(-1,c))),Math.abs(c)<.9999999?(this.y=Math.atan2(o,d),this.z=Math.atan2(a,l)):(this.y=Math.atan2(-u,s),this.z=0);break;case"ZXY":this.x=Math.asin(Math.min(1,Math.max(-1,h))),Math.abs(h)<.9999999?(this.y=Math.atan2(-u,d),this.z=Math.atan2(-i,l)):(this.y=0,this.z=Math.atan2(a,s));break;case"ZYX":this.y=Math.asin(-Math.min(1,Math.max(-1,u))),Math.abs(u)<.9999999?(this.x=Math.atan2(h,d),this.z=Math.atan2(a,s)):(this.x=0,this.z=Math.atan2(-i,l));break;case"YZX":this.z=Math.asin(Math.min(1,Math.max(-1,a))),Math.abs(a)<.9999999?(this.x=Math.atan2(-c,l),this.y=Math.atan2(-u,s)):(this.x=0,this.y=Math.atan2(o,d));break;case"XZY":this.z=Math.asin(-Math.min(1,Math.max(-1,i))),Math.abs(i)<.9999999?(this.x=Math.atan2(h,l),this.y=Math.atan2(o,s)):(this.x=Math.atan2(-c,d),this.y=0);break;default:throw new Error(`unsupported euler order: ${n}`)}return this.order=n,this._onChangeCallback?.(),this}setFromQuaternion(e,n=this.order){return kp.makeRotationFromQuaternion(e),this.setFromRotationMatrix(kp,n)}reorder(e){return Sp.setFromEuler(this),this.setFromQuaternion(Sp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e.order===this.order}fromArray(e){return this.x=e[0],this.y=e[1],this.z=e[2],e[3]!==void 0&&(this.order=e[3]),this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.order,e}};const kp=new sr,Sp=new $o;class Qt{r;g;b;constructor(e=1,n=1,r=1){this.r=e,this.g=n,this.b=r}set(e,n,r){return this.r=e,this.g=n,this.b=r,this}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}clone(){return new Qt(this.r,this.g,this.b)}setRGB(e,n,r){return this.r=e,this.g=n,this.b=r,this}setHex(e){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,this}getHex(){return Math.round(this.r*255)<<16|Math.round(this.g*255)<<8|Math.round(this.b*255)}setStyle(e){if(/^#([0-9a-fA-F]{6})$/.test(e))return this.setHex(parseInt(e.slice(1),16));if(/^#([0-9a-fA-F]{3})$/.test(e)){const n=e.slice(1);return this.setHex(parseInt(n[0]+n[0]+n[1]+n[1]+n[2]+n[2],16))}if(/^(rgb|rgba)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.test(e)){const n=/^rgb\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(e);return this.setRGB(+n[1]/255,+n[2]/255,+n[3]/255)}throw new Error(`unsupported color style: ${e}`)}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}lerp(e,n){return this.r+=(e.r-this.r)*n,this.g+=(e.g-this.g)*n,this.b+=(e.b-this.b)*n,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}toArray(e=[],n=0){return e[n]=this.r,e[n+1]=this.g,e[n+2]=this.b,e}}class md{listeners=new Map;addEventListener(e,n){const r=this.listeners.get(e);r?r.includes(n)||r.push(n):this.listeners.set(e,[n])}hasEventListener(e,n){return this.listeners.get(e)?.includes(n)??!1}removeEventListener(e,n){const r=this.listeners.get(e);if(!r)return;const s=r.indexOf(n);s!==-1&&r.splice(s,1)}dispatchEvent(e){const n=this.listeners.get(e.type);if(n){e.target=this;for(const r of[...n])r(e);e.target=null}}}let Ui=class extends md{isObject3D=!0;isCamera=!1;isLight=!1;isMesh=!1;name="";parent=null;children=[];visible=!0;position=new wt;quaternion=new $o;rotation=new vM;scale=new wt(1,1,1);up=new wt(0,1,0);matrix=new sr;matrixWorld=new sr;matrixAutoUpdate=!0;matrixWorldNeedsUpdate=!0;constructor(){super(),this.rotation._onChange(()=>{this.quaternion.setFromEuler(this.rotation)})}onBeforeRender;add(...e){for(const n of e){if(n===this)throw new Error("[RMSL/scene] an object cannot be added to itself");n.parent!==null&&n.parent.remove(n),n.parent=this,this.children.push(n),n.dispatchEvent({type:"added",object:n})}return this}remove(...e){for(const n of e){const r=this.children.indexOf(n);r!==-1&&(n.parent=null,this.children.splice(r,1),n.dispatchEvent({type:"removed",object:n}))}return this}clear(){for(const e of this.children)e.parent=null,e.dispatchEvent({type:"removed",child:e});return this.children.length=0,this}getObjectByName(e){if(this.name===e)return this;for(const n of this.children){const r=n.getObjectByName(e);if(r!==void 0)return r}}traverse(e){e(this);for(const n of this.children)n.traverse(e)}traverseVisible(e){if(this.visible){e(this);for(const n of this.children)n.traverseVisible(e)}}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e=!1){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);for(const n of this.children)n.updateMatrixWorld(e)}updateWorldMatrix(e,n){const r=this.parent;if(e&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,n)for(const s of this.children)s.updateWorldMatrix(!1,!0)}applyMatrix4(e){return this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this}getWorldPosition(e=new wt){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e=new $o){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Yi,e,_M),e}getWorldScale(e=new wt){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Yi,wM,e),e}getWorldDirection(e=new wt){this.updateWorldMatrix(!0,!1);const n=this.matrixWorld.elements;return e.set(-n[8],-n[9],-n[10]).normalize()}lookAt(e,n,r){e instanceof wt?pa.copy(e):pa.set(e,n,r),this.updateWorldMatrix(!0,!1),Yi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?qi.lookAt(Yi,pa,this.up):qi.lookAt(pa,Yi,this.up),this.quaternion.setFromRotationMatrix(qi);const s=this.parent;return s!==null&&(Ep.extractRotation(s.matrixWorld),qi.premultiply(Ep.invert()),this.quaternion.setFromRotationMatrix(qi)),this}};const Yi=new wt,pa=new wt,wM=new $o,_M=new wt,qi=new sr,Ep=new sr;let gd=class extends Ui{isLight=!0;color;intensity;constructor(e=16777215,n=1){super(),this.color=new Qt,typeof e=="number"?this.color.setHex(e):this.color.copy(e),this.intensity=n}},yd=class extends gd{isAmbientLight=!0;constructor(e,n){super(e,n)}},bd=class extends gd{isDirectionalLight=!0;target=new Ui;constructor(e,n){super(e,n)}};class q0 extends gd{isPointLight=!0;distance;decay;constructor(e,n,r=0,s=2){super(e,n),this.distance=r,this.decay=s}}const xM=1023,kM=36244,SM=1009,EM=1e3,Xc=1001,AM=1002,TM=1003,Ap=1006,CM=1004,MM=1005;function RM(t,e){return t.precision??e}function IM(t,e){switch(t){case"projectionMatrix":return e.projectionMatrix.elements;case"viewMatrix":return e.matrixWorldInverse.elements;case"cameraPosition":return e.getWorldPosition().toArray();default:return[]}}function zM(t,e){switch(t){case"modelMatrix":return e.matrixWorld.elements;case"normalMatrix":return OM.getNormalMatrix(e.matrixWorld).toArray();default:return[]}}function PM(t,e,n){const r=e.attributes[n];if(r)return r;if(n==="instanceMatrix")return t.instanceMatrix;if(n==="instanceColor")return t.instanceColor??void 0}const OM=new gM;function $M(t,e,n){return t==="resolution"?[e,n]:[]}function LM(t){let e="";return t.traverseVisible(n=>{n instanceof yd?e+="a":n instanceof bd?e+="d":n instanceof q0&&(e+="p")}),e}function DM(t,e,n){return`${t}|${e?"i":""}${n?"c":""}`}function NM(t,e){const n=!X0(e);return{magFilter:n?Tp(t.magFilter):"nearest",minFilter:n?Tp(t.minFilter):"nearest",wrapS:Zc(t.wrapS),wrapT:Zc(t.wrapT),wrapR:Zc(t.wrapR)}}function FM(t){return t.format===kM?1:4}function Tp(t){switch(t){case TM:case CM:case MM:return"nearest";default:return"linear"}}function Zc(t){switch(t){case EM:return"repeat";case AM:return"mirror";default:return"clamp"}}function X0(t){return t.startsWith("isampler")||t.startsWith("usampler")}function Jc(t,e=!1){if(ArrayBuffer.isView(t))return t;if(e){let n=-1/0;for(let r=0;r<t.length;r++)t[r]>n&&(n=t[r]);return n>65535?new Uint32Array(t):new Uint16Array(t)}return new Float32Array(t)}const Z0={float32:{count:1,bytes:4,normalized:!1,gl:"FLOAT"},float32x2:{count:2,bytes:4,normalized:!1,gl:"FLOAT"},float32x3:{count:3,bytes:4,normalized:!1,gl:"FLOAT"},float32x4:{count:4,bytes:4,normalized:!1,gl:"FLOAT"},float16x2:{count:2,bytes:2,normalized:!1,gl:"HALF_FLOAT"},float16x4:{count:4,bytes:2,normalized:!1,gl:"HALF_FLOAT"},snorm8x4:{count:4,bytes:1,normalized:!0,gl:"BYTE"},unorm8x4:{count:4,bytes:1,normalized:!0,gl:"UNSIGNED_BYTE"},snorm16x2:{count:2,bytes:2,normalized:!0,gl:"SHORT"},snorm16x4:{count:4,bytes:2,normalized:!0,gl:"SHORT"},unorm16x2:{count:2,bytes:2,normalized:!0,gl:"UNSIGNED_SHORT"},unorm16x4:{count:4,bytes:2,normalized:!0,gl:"UNSIGNED_SHORT"}};function BM(t,e){if(!ArrayBuffer.isView(t)||t instanceof Float32Array)return"float32";if(typeof Float16Array<"u"&&t instanceof Float16Array)return"float16";if(e){if(t instanceof Int8Array)return"snorm8";if(t instanceof Uint8Array)return"unorm8";if(t instanceof Int16Array)return"snorm16";if(t instanceof Uint16Array)return"unorm16"}}function UM(t,e=t.itemSize){if(t.format!==void 0)return t.format;const n=BM(t.array,t.normalized);if(n===void 0)throw new Error(`rmsl: a ${Cp(t.array)} attribute has no vertex format. An integer array reaches a float attribute only when it is scaled on the way in: set \`normalized: true\`, or set \`format\` to say what its bytes hold.`);const r=n==="float32"&&e===1?"float32":`${n}x${e}`;if(!(r in Z0))throw new Error(`rmsl: no vertex format "${r}" for a ${Cp(t.array)} attribute of ${e} component${e===1?"":"s"}. A buffer carrying one attribute must have a stride that is a multiple of four, so a narrow attribute packs into the spare lanes of a four-component one rather than taking a buffer of its own.`);return r}function Cp(t){return ArrayBuffer.isView(t)?t.constructor.name:"number[]"}class Li{_t;type;params;value;constructor(e){this._t=e._t,this.type=e.type,this.params=e.params,this.value=e.value}add(e){return Oe("add",this,e)}sub(e){return Oe("sub",this,e)}mul(e){let n=Rr[this._t],r=e?._t;if(n!==void 0&&typeof r=="string"&&r.startsWith("vec")){let s=Ft[r],i=n[0],o=n[1];if(s===i)return ce({_t:`vec${o}`,type:"matVecMul",params:[this,je(e)]});if(s===i-1)return ce({_t:`vec${Math.min(o,s)}`,type:"matVecMul",params:[this,je(e)]});throw new Error(`[RMSL] A ${this._t} cannot multiply a ${r}: the vector must have the matrix's column width or one fewer component (a position with its homogeneous coordinate implied).`)}return Oe("mul",this,e)}div(e){return Oe("div",this,e)}negate(){return Oe("negate",this)}sin(){return Ge("sin",this)}cos(){return Ge("cos",this)}tan(){return Ge("tan",this)}asin(){return Ge("asin",this)}acos(){return Ge("acos",this)}atan(e){return e===void 0?Ge("atan",this):Oe("atan2",this,e)}sinh(){return Ge("sinh",this)}cosh(){return Ge("cosh",this)}tanh(){return Ge("tanh",this)}asinh(){return Ge("asinh",this)}acosh(){return Ge("acosh",this)}atanh(){return Ge("atanh",this)}abs(){return Ge("abs",this)}sign(){return Ge("sign",this)}floor(){return Ge("floor",this)}ceil(){return Ge("ceil",this)}fract(){return Ge("fract",this)}round(){return Ge("round",this)}trunc(){return Ge("trunc",this)}radians(){return Oe("mul",this,.017453292519943295)}degrees(){return Oe("mul",this,57.29577951308232)}sqrt(){return Ge("sqrt",this)}inverseSqrt(){return Ge("inverseSqrt",this)}inversesqrt(){return Ge("inverseSqrt",this)}exp(){return Ge("exp",this)}log(){return Ge("log",this)}exp2(){return Ge("exp2",this)}log2(){return Ge("log2",this)}cbrt(){return Oe("mul",this.sign(),Oe("pow",this.abs(),1/3))}reciprocal(){return Oe("div",1,this)}oneMinus(){return Oe("sub",1,this)}difference(e){return Ge("abs",Oe("sub",this,e))}lengthSq(){return(Ft[this._t]??1)>1?Oe("dot",this,this):Oe("mul",this,this)}saturate(){return Oe("clamp",this,0,1)}pow(e){return Oe("pow",this,e)}pow2(){return Oe("mul",this,this)}pow3(){return Oe("mul",this,this,this)}pow4(){return Oe("mul",this,this,this,this)}min(e){return Oe("min",this,e)}max(e){return Oe("max",this,e)}mod(e){return Oe("mod",this,e)}dFdx(){return Ge("dFdx",this)}dFdy(){return Ge("dFdy",this)}lessThan(e){return ii("lessThan",this,e)}greaterThan(e){return ii("greaterThan",this,e)}lessThanEqual(e){return ii("lessThanEqual",this,e)}greaterThanEqual(e){return ii("greaterThanEqual",this,e)}equal(e){return ii("equal",this,e)}notEqual(e){return ii("notEqual",this,e)}dot(e){return Oe("dot",this,e)}length(){return Ge("length",this)}normalize(){return Ge("normalize",this)}distance(e){return Oe("distance",this,e)}reflect(e){return Oe("reflect",this,e)}refract(e,n){return Oe("refract",this,e,n)}faceForward(e,n){return Oe("faceForward",this,e,n)}clamp(e,n){return Oe("clamp",this,e,n)}mix(e,n){return Oe("mix",this,e,n)}step(e){return Oe("step",e,this)}smoothstep(e,n){return Oe("smoothstep",e,n,this)}fwidth(){return Ge("fwidth",this)}cross(e){return Oe("cross",this,e)}element(e){let n=typeof e=="number"?ce({_t:"int",type:"int",value:e|0}):e,r=/^(vec|ivec|uvec|bvec)[234]$/.test(this._t);return Oe(r?"vectorElement":"matrixElement",this,n)}inverse(){return Ge("inverse",this)}transpose(){return Ge("transpose",this)}determinant(){return Ge("determinant",this)}bitAnd(e){return Oe("bitAnd",this,e)}bitOr(e){return Oe("bitOr",this,e)}bitXor(e){return Oe("bitXor",this,e)}shiftLeft(e){return Oe("shiftLeft",this,e)}shiftRight(e){return Oe("shiftRight",this,e)}bitNot(){return ce({_t:this._t,type:"bitNot",params:[this]})}texture(e){return ce({_t:Mp(this._t),type:"texture",params:[this,je(e)]})}textureLod(e,n){return ce({_t:Mp(this._t),type:"textureLod",params:[this,je(e),je(n)]})}and(e){return Oe("and",this,e)}or(e){return Oe("or",this,e)}not(){return Ge("not",this)}xor(e){return Oe("and",Oe("or",this,e),Ge("not",Oe("and",this,e)))}all(){return ce({_t:"bool",type:"all",params:[this]})}any(){return ce({_t:"bool",type:"any",params:[this]})}assign(e){Di("assign",n=>{n.push(new Li({_t:"void",type:"assign",params:[this,e]}))})}toVar(e){let n;return Di("toVar",r=>{let s=GM(e);n=HM(s,this._t),r.push(new Li({_t:"void",type:"let",params:[n,this]}))}),n}var(e){return this.toVar(e)}addAssign(e){this.assign(this.add(e))}subAssign(e){this.assign(this.sub(e))}mulAssign(e){this.assign(this.mul(e))}divAssign(e){this.assign(this.div(e))}modAssign(e){this.assign(this.mod(e))}toFloat(){return ce({_t:"float",type:"construct",params:[this]})}toInt(){return ce({_t:"int",type:"construct",params:[this]})}toUint(){return ce({_t:"uint",type:"construct",params:[this]})}toBool(){return ce({_t:"bool",type:"construct",params:[this]})}toVec2(){return ce({_t:"vec2",type:"construct",params:[this]})}toVec3(){return ce({_t:"vec3",type:"construct",params:[this]})}toVec4(){return ce({_t:"vec4",type:"construct",params:[this]})}toIVec2(){return ce({_t:"ivec2",type:"construct",params:[this]})}toIVec3(){return ce({_t:"ivec3",type:"construct",params:[this]})}toIVec4(){return ce({_t:"ivec4",type:"construct",params:[this]})}toUVec2(){return ce({_t:"uvec2",type:"construct",params:[this]})}toUVec3(){return ce({_t:"uvec3",type:"construct",params:[this]})}toUVec4(){return ce({_t:"uvec4",type:"construct",params:[this]})}toBVec2(){return ce({_t:"bvec2",type:"construct",params:[this]})}toBVec3(){return ce({_t:"bvec3",type:"construct",params:[this]})}toBVec4(){return ce({_t:"bvec4",type:"construct",params:[this]})}toMat2(){return ce({_t:"mat2",type:"construct",params:[this]})}toMat3(){return ce({_t:"mat3",type:"construct",params:[this]})}toMat4(){return ce({_t:"mat4",type:"construct",params:[this]})}convert(e){return ce({_t:e,type:"construct",params:[this]})}select(e,n){let r=je(e),s=je(n),i=r?._t||s?._t||this._t;return ce({_t:i,type:"select",params:[this,r,s]})}get x(){return Ct(this,"x")}get y(){return Ct(this,"y")}get z(){return Ct(this,"z")}get w(){return Ct(this,"w")}get r(){return Ct(this,"r")}get g(){return Ct(this,"g")}get b(){return Ct(this,"b")}get a(){return Ct(this,"a")}get xy(){return Ct(this,"xy")}get xz(){return Ct(this,"xz")}get xw(){return Ct(this,"xw")}get yz(){return Ct(this,"yz")}get yw(){return Ct(this,"yw")}get zw(){return Ct(this,"zw")}get xyz(){return Ct(this,"xyz")}get xyw(){return Ct(this,"xyw")}get xzw(){return Ct(this,"xzw")}get yzw(){return Ct(this,"yzw")}get rgba(){return Ct(this,"rgba")}get rgb(){return Ct(this,"rgb")}}for(const t of["s","t","p","q","st","sp","sq","tp","tq","pq","stp","stq","spq","tpq","stpq"])Object.defineProperty(Li.prototype,t,{get(){return Ct(this,t)}});const J0=Li;function ce(t){let e=new J0({_t:t._t??t.type,...t});return t.name!==void 0&&(e.name=t.name),e}function HM(t,e){return new J0({_t:e,type:"var",value:{varName:t,varType:e}})}function ar(t){return typeof t=="object"&&t!==null&&"_t"in t&&"type"in t}function Mp(t){return t.startsWith("isampler")?"ivec4":t.startsWith("usampler")?"uvec4":"vec4"}function je(t){return t==null?ce({_t:"void",type:"void"}):typeof t=="boolean"?ce({_t:"bool",type:"bool",value:t}):typeof t=="number"?ce({_t:"float",type:"float",value:t}):Array.isArray(t)?t.length===3?ce({_t:"vec3",type:"vec3",value:t}):t.length===4?ce({_t:"vec4",type:"vec4",value:t}):t.length===2?ce({_t:"vec2",type:"vec2",value:t}):t.length===9?ce({_t:"mat3",type:"mat3",value:t}):t.length===16?ce({_t:"mat4",type:"mat4",value:t}):ce({_t:"float",type:"float",value:t[0]}):t}const jM={dot:"float",length:"float",distance:"float",determinant:"float",transpose:t=>{let e=Rr[t];if(e===void 0)return t;let[n,r]=e;return n===r?t:`mat${r}x${n}`},matrixElement:t=>{let e=Rr[t];return e===void 0?"float":`vec${e[1]}`},vectorElement:t=>t.startsWith("ivec")?"int":t.startsWith("uvec")?"uint":"float"};function Q0(t,e){let n=jM[t];return n===void 0?e:typeof n=="function"?n(e):n}const Ft={float:1,int:1,uint:1,bool:1,vec2:2,vec3:3,vec4:4,ivec2:2,ivec3:3,ivec4:4,uvec2:2,uvec3:3,uvec4:4,bvec2:2,bvec3:3,bvec4:4},WM={step:1,smoothstep:2},VM=new Set(["step","smoothstep","clamp","min","max","pow","mod"]);function K0(t,e){let n=/^ivec/.test(e)?"int":/^uvec/.test(e)?"uint":e;if(typeof t!="number"||!(n==="int"||n==="uint"))return je(t);if(!Number.isInteger(t))throw new Error(`[RMSL] ${t} is not a whole number, but the operand beside it is an ${e}. Convert the operand to a float, or use a whole number.`);if(n==="uint"&&t<0)throw new Error(`[RMSL] ${t} is negative, but the operand beside it is unsigned. Use a signed operand, or a literal that is not negative.`);return ce({_t:n,type:n,value:t})}function Oe(t,...e){let n=je(e[0]),r=n?._t||"float",s=[n,...e.slice(1).map(c=>K0(c,r))],i=WM[t]??0,o=s[i]?._t??r,a=c=>Ft[c?._t]??(Rr[c?._t]?16:1),l=s[0];for(const c of s)a(c)>a(l)&&(l=c);return o=l?._t??o,VM.has(t)&&(Ft[o]??1)>1&&(s=s.map(c=>(Ft[c?._t]??1)===1?ce({_t:o,type:"construct",params:[c]}):c)),ce({_t:Q0(t,o),type:t,params:s})}function Ge(t,e){let n=je(e),r=n?._t||"float";return ce({_t:Q0(t,r),type:t,params:[n]})}function ii(t,e,n){let r=je(e),s=[r,K0(n,r?._t||"float")],i=s.map(a=>Ft[a?._t]??1),o=Math.max(i[0],i[1]);if(o>1){let a=s[i[0]>=i[1]?0:1]._t;s=s.map((l,c)=>i[c]===1?ce({_t:a,type:"construct",params:[l]}):l)}return ce({_t:o>1?`bvec${o}`:"bool",type:t,params:s})}function Ct(t,e){let n=t?._t||"float",r=/^ivec/.test(n)?"i":/^uvec/.test(n)?"u":"",s=e.length===1?r==="i"?"int":r==="u"?"uint":"float":r==="i"?`ivec${e.length}`:r==="u"?`uvec${e.length}`:`vec${e.length}`;return ce({_t:s,type:"swizzle",params:[t],value:e})}let Wn,Rp=0,uo=new Set;const Ip="_rmsl_";function GM(t){if(t!==void 0){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(t))throw new Error(`toVar("${t}") must be a valid identifier (letters, digits and underscore, not starting with a digit).`);if(t.startsWith(Ip))throw new Error(`toVar("${t}") uses the reserved "${Ip}" prefix, which the compiler keeps for its own names.`);let n=t;for(let r=1;uo.has(n);r++)n=`${t}${r}`;return uo.add(n),n}let e=`_rmsl_${Rp++}`;for(;uo.has(e);)e=`_rmsl_${Rp++}`;return uo.add(e),e}function Di(t,e){if(Wn===void 0)throw new Error(`${t} must be called inside an Fn(() => { ... }) scope.`);e(Wn)}function zp(t){return((...e)=>{let n=Wn;n===void 0&&uo.clear();try{let r=[];Wn=r;let s=t(...e);if(Array.isArray(s))return s.map((a,l)=>{let c=je(s[l]);return ce({_t:c._t||"void",type:"seq",params:[...r,c]})});let i=je(s),o=i._t||"void";return ce({_t:o,type:"seq",params:[...r,i]})}finally{Wn=n}})}function xo(t){let e=Wn;Wn=[];try{return t(),ce({_t:"void",type:"seq",params:[...Wn]})}finally{Wn=e}}function V(t){return ar(t)?ce({_t:"float",type:"construct",params:[t]}):ce({_t:"float",type:"float",value:t})}function Vt(t,e){if(t===void 0)return ce({_t:"vec2",type:"construct",params:[je(0)]});if(ar(t)){let n=[t];return e!==void 0&&n.push(je(e)),ce({_t:"vec2",type:"construct",params:n})}return ce(e===void 0?{_t:"vec2",type:"construct",params:[je(t)]}:typeof e=="number"?{_t:"vec2",type:"vec2",value:[t,e]}:{_t:"vec2",type:"construct",params:[je(t),e]})}function ze(t,e,n){if(t===void 0)return ce({_t:"vec3",type:"construct",params:[je(0)]});if(ar(t)){let s=[t];return e!==void 0&&s.push(je(e)),n!==void 0&&s.push(je(n)),ce({_t:"vec3",type:"construct",params:s})}if(e===void 0)return ce({_t:"vec3",type:"construct",params:[je(t)]});if(typeof e=="number"&&(n===void 0||typeof n=="number")){let s=[t,e];return n!==void 0&&s.push(n),ce({_t:"vec3",type:"vec3",value:s})}let r=[je(t)];return e!==void 0&&r.push(je(e)),n!==void 0&&r.push(je(n)),ce({_t:"vec3",type:"construct",params:r})}function Ie(t,e,n,r){if(t===void 0)return ce({_t:"vec4",type:"construct",params:[je(0)]});if(ar(t)){let i=[t];return e!==void 0&&i.push(je(e)),n!==void 0&&i.push(je(n)),r!==void 0&&i.push(je(r)),ce({_t:"vec4",type:"construct",params:i})}if(e===void 0)return ce({_t:"vec4",type:"construct",params:[je(t)]});if(typeof e=="number"&&(n===void 0||typeof n=="number")&&(r===void 0||typeof r=="number")){let i=[t,e];return n!==void 0&&i.push(n),r!==void 0&&i.push(r),ce({_t:"vec4",type:"vec4",value:i})}let s=[je(t)];return e!==void 0&&s.push(je(e)),n!==void 0&&s.push(je(n)),r!==void 0&&s.push(je(r)),ce({_t:"vec4",type:"construct",params:s})}function YM(t){return ar(t)?ce({_t:"int",type:"construct",params:[t]}):ce({_t:"int",type:"int",value:t|0})}function qM(t){return ar(t)?ce({_t:"uint",type:"construct",params:[t]}):ce({_t:"uint",type:"uint",value:t|0})}function XM(t,e,n){return(...r)=>{if(r.length===0)return ce({_t:t,type:"construct",params:[ce({_t:n,type:n,value:0})]});if(r.length===1&&ar(r[0]))return ce({_t:t,type:"construct",params:[r[0]]});if(r.length===1&&typeof r[0]=="number")return ce({_t:t,type:"construct",params:[ce({_t:n,type:n,value:r[0]|0})]});if(r.length<=e&&r.every(s=>typeof s=="number")){if(n==="uint"){for(let s of r)if(s<0)throw new Error(`[RMSL] ${s} is negative, but ${t} components are unsigned. Use a signed vector, or values that are not negative.`)}return ce({_t:t,type:t,value:r.map(s=>s|0)})}return ce({_t:t,type:"construct",params:r.map(s=>ar(s)?s:je(s))})}}const ZM=XM("ivec3",3,"int");function Pp(t){return ar(t)?ce({_t:"bool",type:"construct",params:[t]}):ce({_t:"bool",type:"bool",value:t})}function vd(...t){return t.length===1&&ar(t[0])?ce({_t:"mat3",type:"construct",params:[t[0]]}):t.length===3&&t.every(e=>ar(e))?ce({_t:"mat3",type:"construct",params:t.map(e=>e)}):t.length===1&&typeof t[0]=="number"?ce({_t:"mat3",type:"construct",params:[je(t[0])]}):t.length===0?ce({_t:"mat3",type:"mat3",value:[1,0,0,0,1,0,0,0,1]}):ce({_t:"mat3",type:"mat3",value:t})}function qs(t){return je(t)}function Wa(t,e){return qs(t).mod(e)}function xl(t){return qs(t).sin()}function JM(t){return qs(t).cos()}function QM(t,e){return qs(t).pow(e)}function _r(t,e,n){return qs(t).mix(e,n)}function Vn(t,e,n){return qs(n).smoothstep(t,e)}function gi(t,e){return qs(t).element(e)}const Op=V(Math.PI);V(Math.PI*2);V(Math.PI*2);V(Math.PI*.5);V(1e-6);V(1e6);let KM=0,eR=0,tR=0;function $p(t,e){let n=KM++;return ce({_t:e,type:"uniform",value:{id:n,slot:t,shaderType:e},name:t})}function nR(t){let e=eR++;return ce({_t:t,type:"attribute",value:{id:e,slot:`_rmsl_a${e}`,shaderType:t},name:`_rmsl_a${e}`})}function rR(t){let e=tR++;return ce({_t:t,type:"varying",value:{id:e,slot:`_rmsl_v${e}`,shaderType:t},name:`_rmsl_v${e}`})}let sR=0;function iR(t){let e=sR++;return ce({_t:t,type:"output",value:{id:e,slot:`_rmsl_o${e}`,shaderType:t,location:e}})}function oR(){return ce({_t:"float",type:"builtinFragDepth"})}function xt(t,e){let n=ce({_t:"void",type:"if",params:[je(t),xo(e)]});Di("If",i=>{i.push(n)});let r=n;const s={ElseIf:(i,o)=>{let a=ce({_t:"void",type:"if",params:[je(i),xo(o)]});return r.params[2]=a,r=a,s},Else:i=>{r.params[2]=xo(i)}};return s}function aR(t,e,n,r){Di("For",s=>{let i=Wn,o=[];Wn=o;let a;try{a=t()}finally{Wn=i}let l=ce({_t:"void",type:"seq",params:[...o]}),c=je(e(a)),u=xo(()=>n(a)),h=xo(()=>r(a));s.push(ce({_t:"void",type:"for",params:[l,c,u,h]}))})}function ma(){Di("Discard",t=>{t.push(ce({_t:"void",type:"discard"}))})}function Lp(){Di("Break",t=>{t.push(ce({_t:"void",type:"break"}))})}const ws={select:5,or:10,and:20,bitOr:30,bitXor:40,bitAnd:50,equal:60,notEqual:60,lessThan:60,greaterThan:60,lessThanEqual:60,greaterThanEqual:60,shiftLeft:70,shiftRight:70,add:80,sub:80,mul:90,div:90,mod:90},Bn=100,Ke=200;function St(t,e,n){return(t??Ke)<=e?`(${n})`:n}let lR={float:"float",vec2:"vec2",vec3:"vec3",vec4:"vec4",int:"int",uint:"uint",bool:"bool",ivec2:"ivec2",ivec3:"ivec3",ivec4:"ivec4",uvec2:"uvec2",uvec3:"uvec3",uvec4:"uvec4",bvec2:"bvec2",bvec3:"bvec3",bvec4:"bvec4",mat2:"mat2",mat2x3:"mat2x3",mat2x4:"mat2x4",mat3x2:"mat3x2",mat3:"mat3",mat3x4:"mat3x4",mat4x2:"mat4x2",mat4x3:"mat4x3",mat4:"mat4",sampler2D:"sampler2D",sampler3D:"sampler3D",samplerCube:"samplerCube",isampler2D:"isampler2D",isampler3D:"isampler3D",isamplerCube:"isamplerCube",usampler2D:"usampler2D",usampler3D:"usampler3D",usamplerCube:"usamplerCube",void:"void"};function Ts(t){return lR[t]??"float"}function Dp(t){return(t.type==="float"||t.type==="int"||t.type==="uint"||t.type==="bool")&&!t.params}function eb(t){if(t.type==="select"){let i=t.params?.[0];if(i&&Dp(i))return(i.value?t.params[1]:t.params[2])??null}let e=t.params??[];if(!e.every(Dp))return null;let n=e[0]?.value,r=e[1]?.value,s=t._t;if(s==="float"||s==="int"||s==="uint"){let i=n,o=r;switch(t.type){case"add":return Xe({_t:s,type:s,value:s==="int"||s==="uint"?i+o|0:i+o});case"sub":return Xe({_t:s,type:s,value:s==="int"||s==="uint"?i-o|0:i-o});case"mul":return Xe({_t:s,type:s,value:s==="int"||s==="uint"?i*o|0:i*o});case"div":return Xe({_t:s,type:s,value:s==="int"||s==="uint"?i/o|0:i/o});case"negate":return Xe({_t:s,type:s,value:s==="int"||s==="uint"?-i|0:-i});case"mod":return Xe({_t:s,type:s,value:s==="int"||s==="uint"?i%o|0:i-o*Math.floor(i/o)});case"sin":return Xe({_t:s,type:s,value:Math.sin(i)});case"cos":return Xe({_t:s,type:s,value:Math.cos(i)});case"tan":return Xe({_t:s,type:s,value:Math.tan(i)});case"asin":return Xe({_t:s,type:s,value:Math.asin(i)});case"acos":return Xe({_t:s,type:s,value:Math.acos(i)});case"atan":return Xe({_t:s,type:s,value:Math.atan(i)});case"sinh":return Xe({_t:s,type:s,value:Math.sinh(i)});case"cosh":return Xe({_t:s,type:s,value:Math.cosh(i)});case"tanh":return Xe({_t:s,type:s,value:Math.tanh(i)});case"asinh":return Xe({_t:s,type:s,value:Math.asinh(i)});case"acosh":return Xe({_t:s,type:s,value:Math.acosh(i)});case"atanh":return Xe({_t:s,type:s,value:Math.atanh(i)});case"abs":return Xe({_t:s,type:s,value:Math.abs(i)});case"sign":return Xe({_t:s,type:s,value:Math.sign(i)});case"floor":return Xe({_t:s,type:s,value:Math.floor(i)});case"ceil":return Xe({_t:s,type:s,value:Math.ceil(i)});case"round":return Xe({_t:s,type:s,value:Math.round(i)});case"trunc":return Xe({_t:s,type:s,value:Math.trunc(i)});case"fract":return Xe({_t:s,type:s,value:i-Math.floor(i)});case"sqrt":return Xe({_t:s,type:s,value:Math.sqrt(i)});case"inverseSqrt":return Xe({_t:s,type:s,value:1/Math.sqrt(i)});case"atan2":return Xe({_t:s,type:s,value:Math.atan2(i,o)});case"exp":return Xe({_t:s,type:s,value:Math.exp(i)});case"log":return Xe({_t:s,type:s,value:Math.log(i)});case"exp2":return Xe({_t:s,type:s,value:Math.pow(2,i)});case"log2":return Xe({_t:s,type:s,value:Math.log2(i)});case"pow":return Xe({_t:s,type:s,value:Math.pow(i,o)});case"min":return Xe({_t:s,type:s,value:Math.min(i,o)});case"max":return Xe({_t:s,type:s,value:Math.max(i,o)});case"dot":return Xe({_t:s,type:s,value:i*o})}}return null}function Xe(t){return new Li({_t:t._t??t.type,type:t.type,params:t.params,value:t.value})}function tb(t){if(t.body.some(e=>e.includes("{")))throw new Error("[RMSL] A for-loop's update cannot contain a block. Move the branch into the loop body, or write the loop with While.");return t.body}function nb(t){return t.endsWith(";")?t.slice(0,-1):t}function rb(t,e,n){if(t==="vertex"&&!n&&e!=="vec4")throw new Error("[RMSL] A vertex shader has to produce a position. This one "+(e===void 0||e==="void"?"returns nothing and never assigns builtinPosition(). Return a vec4, or assign builtinPosition() yourself.":`returns ${e}, which cannot become one. Wrap it — for example vec4(value, 1.0).`))}const cR={x:0,y:1,z:2,w:3,r:0,g:1,b:2,a:3,s:0,t:1,p:2,q:3};function uR(t){let e=t.value,n=t.params[0];for(;n?.type==="swizzle";){let r=n.value;e=[...e].map(s=>r[cR[s]]).join(""),n=n.params[0]}return{base:n,pattern:e}}function sb(t){let e=Rr[t];if(e===void 0||e[0]!==e[1])throw new Error(`[RMSL] inverse() needs a square matrix, but this one is ${t??"untyped"}.`);return e[0]}function ib(t){if(t.shaderStage!=="vertex")throw new Error("[RMSL] builtinPosition() is the vertex stage's output position, and a fragment stage cannot read it. Pass the value you need through a varying() instead.")}function Te(t,e){if(t==null)return{decls:[],body:[],expr:"0.0"};if(typeof t=="boolean")return{decls:[],body:[],expr:t?"true":"false"};if(typeof t=="number")return{decls:[],body:[],expr:t.toString()};if(Array.isArray(t))return{decls:[],body:[],expr:`vec3(${t.join(", ")})`};let n=e.memo.get(t);if(n)return{decls:[],body:[],expr:n.expr,prec:n.prec};let r=hR(t,e);return e.memo.set(t,r),r}function hR(t,e){let n=eb(t);switch(n&&(t=n),t.type){case"float":{let r=String(t.value);return!r.includes(".")&&!r.includes("e")&&(r+=".0"),{decls:[],body:[],expr:r}}case"int":return{decls:[],body:[],expr:String(t.value)};case"uint":return{decls:[],body:[],expr:String(t.value)+"u"};case"bool":return{decls:[],body:[],expr:t.value?"true":"false"};case"vec2":return{decls:[],body:[],expr:`vec2(${t.value.join(", ")})`};case"vec3":return{decls:[],body:[],expr:`vec3(${t.value.join(", ")})`};case"vec4":return{decls:[],body:[],expr:`vec4(${t.value.join(", ")})`};case"ivec2":return{decls:[],body:[],expr:`ivec2(${t.value.join(", ")})`};case"ivec3":return{decls:[],body:[],expr:`ivec3(${t.value.join(", ")})`};case"ivec4":return{decls:[],body:[],expr:`ivec4(${t.value.join(", ")})`};case"uvec2":return{decls:[],body:[],expr:`uvec2(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec3":return{decls:[],body:[],expr:`uvec3(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec4":return{decls:[],body:[],expr:`uvec4(${t.value.map(r=>`${r}u`).join(", ")})`};case"bvec2":return{decls:[],body:[],expr:`bvec2(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec3":return{decls:[],body:[],expr:`bvec3(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec4":return{decls:[],body:[],expr:`bvec4(${t.value.map(r=>r?"true":"false").join(", ")})`};case"mat2":return{decls:[],body:[],expr:`mat2(${t.value.join(", ")})`};case"mat2x3":return{decls:[],body:[],expr:`mat2x3(${t.value.join(", ")})`};case"mat2x4":return{decls:[],body:[],expr:`mat2x4(${t.value.join(", ")})`};case"mat3x2":return{decls:[],body:[],expr:`mat3x2(${t.value.join(", ")})`};case"mat3":return{decls:[],body:[],expr:`mat3(${t.value.join(", ")})`};case"mat3x4":return{decls:[],body:[],expr:`mat3x4(${t.value.join(", ")})`};case"mat4x2":return{decls:[],body:[],expr:`mat4x2(${t.value.join(", ")})`};case"mat4x3":return{decls:[],body:[],expr:`mat4x3(${t.value.join(", ")})`};case"mat4":return{decls:[],body:[],expr:`mat4(${t.value.join(", ")})`};case"void":return{decls:[],body:[],expr:"0.0"};case"construct":{let r=(t.params??[]).map(o=>Te(o,e)),s=Ts(t._t),i=r.map(o=>o.expr).join(", ");return{decls:r.flatMap(o=>o.decls),body:r.flatMap(o=>o.body),expr:`${s}(${i})`}}case"var":{let r=t.value,s=r?.varName;return s&&!e.varDefs.has(s)&&e.varDefs.set(s,r?.varType||"float"),{decls:[],body:[],expr:s}}case"uniform":{let r=t.value;return e.uniforms.has(r.id)||e.uniforms.set(r.id,{type:Ts(r.shaderType),slot:r.slot}),{decls:[],body:[],expr:r.slot}}case"uniformArray":{let r=t.value;return e.uniforms.has(r.id)||e.uniforms.set(r.id,{type:Ts(r.shaderType),slot:r.slot,length:r.length}),{decls:[],body:[],expr:r.slot}}case"uniformArrayElement":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=t.params[1]?._t,o=i==="int"||i==="uint"?s.expr:`int(${s.expr})`;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${r.expr}[${o}]`}}case"attribute":{let r=t.value;return e.attributes.has(r.id)||e.attributes.set(r.id,{type:Ts(r.shaderType),slot:r.slot}),{decls:[],body:[],expr:r.slot}}case"varying":{let r=t.value;return e.varyings.has(r.id)||e.varyings.set(r.id,{id:r.id,type:Ts(r.shaderType),slot:r.slot}),{decls:[],body:[],expr:r.slot}}case"output":{let r=t.value;return e.outputs.has(r.id)||e.outputs.set(r.id,{type:Ts(r.shaderType),slot:r.slot,location:r.location}),{decls:[],body:[],expr:r.slot}}case"builtinPosition":return ib(e),{decls:[],body:[],expr:"gl_Position"};case"builtinFragDepth":{if(e.shaderStage!=="fragment")throw new Error("builtinFragDepth() can only be used in fragment shaders");return{decls:[],body:[],expr:"gl_FragDepth"}}case"fragCoord":{if(e.shaderStage!=="fragment")throw new Error("fragCoord() can only be used in fragment shaders");return{decls:[],body:[],expr:"gl_FragCoord.xy"}}case"swizzle":{let r=Te(t.params[0],e),s=t.value,i=(r.prec??Ke)<Ke?`(${r.expr})`:r.expr;return{decls:r.decls,body:r.body,expr:`${i}.${s}`,prec:Ke}}case"negate":{let r=Te(t.params[0],e),s=St(r.prec,Bn,r.expr);return{decls:r.decls,body:r.body,expr:`-${s}`,prec:Bn}}case"not":{let r=Te(t.params[0],e),s=t.params[0]?._t;if(s==="bvec2"||s==="bvec3"||s==="bvec4")return{decls:r.decls,body:r.body,expr:`not(${r.expr})`,prec:Ke};let i=St(r.prec,Bn,r.expr);return{decls:r.decls,body:r.body,expr:`!${i}`,prec:Bn}}case"all":{let r=Te(t.params[0],e);return{decls:r.decls,body:r.body,expr:`all(${r.expr})`}}case"any":{let r=Te(t.params[0],e);return{decls:r.decls,body:r.body,expr:`any(${r.expr})`}}case"add":return _t(t,e,"+");case"sub":return _t(t,e,"-");case"mul":return _t(t,e,"*");case"div":return _t(t,e,"/");case"atan2":return _t(t,e,"atan",!0);case"mod":{let r=t.params[0]?._t;return r==="int"||r==="uint"?_t(t,e,"%"):_t(t,e,"mod",!0)}case"pow":return _t(t,e,"pow",!0);case"min":return _t(t,e,"min",!0);case"max":return _t(t,e,"max",!0);case"dot":return _t(t,e,"dot",!0);case"cross":return _t(t,e,"cross",!0);case"distance":return _t(t,e,"distance",!0);case"reflect":return _t(t,e,"reflect",!0);case"refract":return Xi(t,e,"refract");case"mix":return Xi(t,e,"mix");case"step":return _t(t,e,"step",!0);case"smoothstep":return Xi(t,e,"smoothstep");case"clamp":return Xi(t,e,"clamp");case"select":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=Te(t.params[2],e),o=t.params[0]?._t||"bool";if(o!=="bool"){let h=Ft[t.params[1]?._t]??3,d=s.expr,f=i.expr,m=r.expr,p=Ft[t.params[1]?._t]??1,y=Ft[t.params[2]?._t]??1,g=Math.max(p,y,h);p===1&&g>1&&(d=`vec${g}(${d})`),y===1&&g>1&&(f=`vec${g}(${f})`);let b=o.startsWith("bvec")||o.startsWith("vec")?`vec${g}(${m})`:m;return{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`mix(${f}, ${d}, ${b})`,prec:Ke}}let a=ws[t.type]??0,l=St(r.prec,a,r.expr),c=St(s.prec,a,s.expr),u=St(i.prec,a,i.expr);return{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`${l} ? ${c} : ${u}`,prec:a}}case"lessThan":return oi(t,e,"<","lessThan");case"greaterThan":return oi(t,e,">","greaterThan");case"lessThanEqual":return oi(t,e,"<=","lessThanEqual");case"greaterThanEqual":return oi(t,e,">=","greaterThanEqual");case"equal":return oi(t,e,"==","equal");case"notEqual":return oi(t,e,"!=","notEqual");case"and":return _t(t,e,"&&");case"or":return _t(t,e,"||");case"bitAnd":return _t(t,e,"&");case"bitOr":return _t(t,e,"|");case"bitXor":return _t(t,e,"^");case"shiftLeft":return _t(t,e,"<<");case"shiftRight":return _t(t,e,">>");case"matVecMul":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=t.params[0]?._t||"mat4",o=t.params[1]?._t||"vec3",a=ws.mul,l=St(r.prec,a,r.expr),c=St(s.prec,a,s.expr),u=Rr[i],h=Ft[o]??0;if(u!==void 0&&h===u[0]-1){let d=`(${l} * vec${u[0]}(${c}, 1.0))`;return h<u[1]&&(d+=`.${"xyzw".slice(0,h)}`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:d,prec:Ke}}return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${l} * ${c}`,prec:a}}case"sin":return nt(t,e,"sin");case"cos":return nt(t,e,"cos");case"tan":return nt(t,e,"tan");case"asin":return nt(t,e,"asin");case"acos":return nt(t,e,"acos");case"atan":return nt(t,e,"atan");case"sinh":return nt(t,e,"sinh");case"cosh":return nt(t,e,"cosh");case"tanh":return nt(t,e,"tanh");case"asinh":return nt(t,e,"asinh");case"acosh":return nt(t,e,"acosh");case"atanh":return nt(t,e,"atanh");case"abs":return nt(t,e,"abs");case"sign":return nt(t,e,"sign");case"floor":return nt(t,e,"floor");case"ceil":return nt(t,e,"ceil");case"fract":return nt(t,e,"fract");case"round":return nt(t,e,"round");case"trunc":return nt(t,e,"trunc");case"sqrt":return nt(t,e,"sqrt");case"inverseSqrt":return nt(t,e,"inversesqrt");case"exp":return nt(t,e,"exp");case"log":return nt(t,e,"log");case"exp2":return nt(t,e,"exp2");case"log2":return nt(t,e,"log2");case"normalize":return nt(t,e,"normalize");case"length":return nt(t,e,"length");case"transpose":return nt(t,e,"transpose");case"inverse":return sb(t.params[0]?._t),nt(t,e,"inverse");case"determinant":return nt(t,e,"determinant");case"fwidth":return nt(t,e,"fwidth");case"dFdx":return nt(t,e,"dFdx");case"dFdy":return nt(t,e,"dFdy");case"faceForward":return Xi(t,e,"faceforward");case"bitNot":{let r=Te(t.params[0],e),s=St(r.prec,Bn,r.expr);return{decls:r.decls,body:r.body,expr:`~${s}`,prec:Bn}}case"matrixElement":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`int(${i})`);let o=(r.prec??Ke)<Ke?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:Ke}}case"vectorElement":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`int(${i})`);let o=(r.prec??Ke)<Ke?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:Ke}}case"texture":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=t.params[0]?._t||"sampler2D";if(!(i.startsWith("isampler")||i.startsWith("usampler")))return _t(t,e,"texture",!0);let o=i.endsWith("2D")?2:3,a=s.expr;return(t.params[1]?._t||"float")!=="int"&&(a=`ivec${o}(${a})`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`texelFetch(${r.expr}, ${a}, 0)`,prec:Ke}}case"textureLod":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=Te(t.params[2],e),o=t.params[0]?._t||"sampler2D";if(!(o.startsWith("isampler")||o.startsWith("usampler")))return{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`textureLod(${r.expr}, ${s.expr}, ${i.expr})`};let a=o.endsWith("2D")?2:3,l=i.expr;(t.params[2]?._t||"float")==="float"&&(l=`int(${l})`);let c=s.expr;return(t.params[1]?._t||"float")!=="int"&&(c=`ivec${a}(${c})`),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`texelFetch(${r.expr}, ${c}, ${l})`}}case"textureLoad":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=(t.params[0]?._t||"sampler2D").endsWith("2D")?2:3,o=s.expr,a=t.params[1]?._t||"ivec2";return a!==`ivec${i}`&&a!==`uvec${i}`&&(o=`ivec${i}(${o})`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`texelFetch(${r.expr}, ${o}, 0)`,prec:Ke}}case"textureSize":{let r=Te(t.params[0],e);return{decls:r.decls,body:r.body,expr:`textureSize(${r.expr}, 0)`,prec:Ke}}case"let":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=t.params[0]._t||"float",o=t.params[1]?._t||"float",a=Ts(i),l=s.expr;return i==="float"&&(o==="int"||o==="uint")&&(l=`float(${l})`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body,`${a} ${r.expr} = ${l};`],expr:r.expr}}case"assign":{t.params[0]?.type==="builtinPosition"&&(e.positionWritten=!0);let r=Te(t.params[0],e),s=Te(t.params[1],e);return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body,`${r.expr} = ${s.expr};`],expr:r.expr}}case"seq":{let r=t.params??[],s=[],i=[],o="0.0";for(let a of r){let l=Te(a,e);s.push(...l.decls),i.push(...l.body),o=l.expr}return{decls:s,body:i,expr:o}}case"if":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=t.params.length>=3&&t.params[2]!==void 0?Te(t.params[2],e):{decls:[],body:[]},o=[...r.body,`if (${r.expr}) {`,...s.body.map(a=>"  "+a),"}"];return i.body.length>0&&(o.push("else {"),o.push(...i.body.map(a=>"  "+a)),o.push("}")),{decls:[...r.decls,...s.decls,...i.decls],body:o,expr:"0.0"}}case"for":{let r=Te(t.params[0],e),s=Te(t.params[1],e),i=Te(t.params[2],e),o=Te(t.params[3],e),a=r.expr,l=r.body;if(r.body.length>0){let c=r.body[r.body.length-1];c.endsWith(";")&&(a=c.slice(0,-1),l=r.body.slice(0,-1))}return{decls:[...r.decls,...s.decls,...i.decls,...o.decls],body:[...l,...s.body,`for (${a}; ${s.expr}; ${tb(i).map(nb).join(", ")}) {`,...o.body.map(c=>"  "+c),"}"],expr:"0.0"}}case"while":{let r=Te(t.params[0],e),s=Te(t.params[1],e);return{decls:[...r.decls,...s.decls],body:[...r.body,`while (${r.expr}) {`,...s.body.map(i=>"  "+i),"}"],expr:"0.0"}}case"discard":return{decls:[],body:["discard;"],expr:"0.0"};case"break":return{decls:[],body:["break;"],expr:"0.0"};case"continue":return{decls:[],body:["continue;"],expr:"0.0"};case"return":return{decls:[],body:["return;"],expr:"0.0"};default:throw new Error(`[RMSL] Unsupported node type in GLSL compiler: "${t.type}"`)}}function _t(t,e,n,r){let s=Te(t.params[0],e),i=Te(t.params[1],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=s.expr,c=i.expr;if(o==="float"&&(a==="int"||a==="uint")?c=`float(${c})`:(o==="int"||o==="uint")&&a==="float"?l=`float(${l})`:(o==="int"||o==="uint")&&(a==="int"||a==="uint")&&(o==="int"&&a==="uint"&&(c=`int(${c})`),o==="uint"&&a==="int"&&(l=`uint(${l})`)),r)return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${n}(${l}, ${c})`,prec:Ke};let u=ws[t.type]??0;return l=St(s.prec,u,l),c=St(i.prec,u,c),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${l} ${n} ${c}`,prec:u}}function oi(t,e,n,r){let s=Te(t.params[0],e),i=Te(t.params[1],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=(Ft[o]??1)>1,c=s.expr,u=i.expr;if(!l&&o==="float"&&(a==="int"||a==="uint")?u=`float(${u})`:!l&&(o==="int"||o==="uint")&&a==="float"&&(c=`float(${c})`),l)return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${r}(${c}, ${u})`,prec:Ke};let h=ws[t.type]??0;return c=St(s.prec,h,c),u=St(i.prec,h,u),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${c} ${n} ${u}`,prec:h}}function Xi(t,e,n){let r=Te(t.params[0],e),s=Te(t.params[1],e),i=Te(t.params[2],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=t.params[2]?._t||"float",c=r.expr,u=s.expr,h=i.expr;return o==="float"?((a==="int"||a==="uint")&&(u=`float(${u})`),(l==="int"||l==="uint")&&(h=`float(${h})`)):(o==="int"||o==="uint")&&a==="float"&&(c=`float(${c})`),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`${n}(${c}, ${u}, ${h})`}}function nt(t,e,n){let r=Te(t.params[0],e);return{decls:r.decls,body:r.body,expr:`${n}(${r.expr})`}}function Qc(t,e,n={}){const r=n.precision??"highp";if(r!=="lowp"&&r!=="mediump"&&r!=="highp")throw new Error(`[RMSL] unknown precision "${r}" — use "lowp", "mediump" or "highp".`);let s={shaderStage:e,uniforms:new Map,attributes:new Map,varyings:new Map,outputs:new Map,varDefs:new Map,memo:new Map,positionWritten:!1},i=Array.isArray(t)?t:[t],o=i.map(p=>Te(p,s)),a=[],l="0.0",c;for(let p=0;p<o.length;p++)a.push(...o[p].decls,...o[p].body),l=o[p].expr,c=i[p]?._t;rb(e,c,s.positionWritten);let u=c==="vec4"&&!s.positionWritten,h=e==="fragment"&&s.outputs.size===0&&u,d=[];d.push("#version 300 es"),d.push(`precision ${r} float;`);let f=[...new Set([...s.uniforms.values()].map(p=>p.type).filter(p=>/^(i|u)?sampler2D$|^(i|u)?sampler3D$|^(i|u)?samplerCube$/.test(p)))].sort();for(let p of f)d.push(`precision ${r} ${p};`);d.push(""),s.uniforms.forEach(p=>{d.push(p.length!==void 0?`uniform ${p.type} ${p.slot}[${p.length}];`:`uniform ${p.type} ${p.slot};`)}),s.attributes.forEach(p=>{d.push(`in ${p.type} ${p.slot};`)}),s.varyings.forEach(p=>{e==="vertex"?d.push(`out ${p.type} ${p.slot};`):d.push(`in ${p.type} ${p.slot};`)});let m=0;if(s.outputs.forEach(p=>{p&&p.slot&&p.type&&d.push(e==="fragment"?`layout(location=${m++}) out ${p.type} ${p.slot};`:`out ${p.type} ${p.slot};`)}),h&&d.push("layout(location=0) out vec4 _rmsl_fragColor;"),(s.uniforms.size>0||s.attributes.size>0||s.outputs.size>0||h)&&d.push(""),e==="vertex"){d.push("void main(void) {");for(let p of a)d.push("  "+p);u&&d.push(`  gl_Position = ${l};`),d.push("}")}else{d.push("void main(void) {");for(let p of a)d.push("  "+p);h&&d.push(`  _rmsl_fragColor = ${l};`),d.push("}")}return d.join(`
`)}const Np=Object.assign((t,e)=>Qc(t,"fragment",e),{vertex:(t,e)=>Qc(t,"vertex",e),fragment:(t,e)=>Qc(t,"fragment",e)});let dR={float:"f32",vec2:"vec2<f32>",vec3:"vec3<f32>",vec4:"vec4<f32>",int:"i32",uint:"u32",bool:"bool",ivec2:"vec2<i32>",ivec3:"vec3<i32>",ivec4:"vec4<i32>",uvec2:"vec2<u32>",uvec3:"vec3<u32>",uvec4:"vec4<u32>",bvec2:"vec2<bool>",bvec3:"vec3<bool>",bvec4:"vec4<bool>",mat2:"mat2x2<f32>",mat2x3:"mat2x3<f32>",mat2x4:"mat2x4<f32>",mat3x2:"mat3x2<f32>",mat3:"mat3x3<f32>",mat3x4:"mat3x4<f32>",mat4x2:"mat4x2<f32>",mat4x3:"mat4x3<f32>",mat4:"mat4x4<f32>",sampler2D:"texture_2d<f32>",sampler3D:"texture_3d<f32>",samplerCube:"texture_cube<f32>",isampler2D:"texture_2d<i32>",isampler3D:"texture_3d<i32>",isamplerCube:"texture_cube<i32>",usampler2D:"texture_2d<u32>",usampler3D:"texture_3d<u32>",usamplerCube:"texture_cube<u32>",void:"void"};const Rr={mat2:[2,2],mat2x3:[2,3],mat2x4:[2,4],mat3x2:[3,2],mat3:[3,3],mat3x4:[3,4],mat4x2:[4,2],mat4x3:[4,3],mat4:[4,4]};function fR(t){return kl(t)?.count??1}function kl(t){const e=/^mat(\d)x(\d)<(.+)>$/.exec(t);return e?{count:Number(e[1]),columnType:`vec${e[2]}<${e[3]}>`}:null}function Fp(t,e){return`${t}_${e}`}function pR(t,e){const n=Rr[t],r=e===void 0?void 0:Rr[e];if(n===void 0||r===void 0||n[0]>=r[0]||n[1]>=r[1])return null;const s=`_rmsl_${t}_from_${e}`;return s in _d?s:null}function mR(t,e,n){let r=Rr[t];if(r===void 0||e.length!==1||Ft[n]!==1)return e;let[s,i]=r,o=e[0],a=[];for(let l=0;l<s;l++)for(let c=0;c<i;c++)a.push(c===l?o:"0f");return a}const Bp="_RmslUniforms",rh="_rmsl_uniforms",gR={f32:{size:4,align:4},i32:{size:4,align:4},u32:{size:4,align:4},"vec2<f32>":{size:8,align:8},"vec3<f32>":{size:12,align:16},"vec4<f32>":{size:16,align:16},"vec2<u32>":{size:8,align:8},"vec3<u32>":{size:12,align:16},"vec4<u32>":{size:16,align:16},"vec2<i32>":{size:8,align:8},"vec3<i32>":{size:12,align:16},"vec4<i32>":{size:16,align:16},"mat2x2<f32>":{size:16,align:8},"mat2x3<f32>":{size:32,align:16},"mat2x4<f32>":{size:32,align:16},"mat3x2<f32>":{size:24,align:8},"mat3x3<f32>":{size:48,align:16},"mat3x4<f32>":{size:48,align:16},"mat4x2<f32>":{size:32,align:8},"mat4x3<f32>":{size:64,align:16},"mat4x4<f32>":{size:64,align:16}},wd={f32:{stored:"vec4<f32>",read:t=>`${t}.x`},i32:{stored:"vec4<i32>",read:t=>`${t}.x`},u32:{stored:"vec4<u32>",read:t=>`${t}.x`},"vec2<f32>":{stored:"vec4<f32>",read:t=>`${t}.xy`},"vec2<i32>":{stored:"vec4<i32>",read:t=>`${t}.xy`},"vec2<u32>":{stored:"vec4<u32>",read:t=>`${t}.xy`},bool:{stored:"vec4<u32>",read:t=>`(${t}.x != 0u)`},"vec2<bool>":{stored:"vec4<u32>",read:t=>`(${t}.xy != vec2<u32>(0u))`},"vec3<bool>":{stored:"vec4<u32>",read:t=>`(${t}.xyz != vec3<u32>(0u))`},"vec4<bool>":{stored:"vec4<u32>",read:t=>`(${t} != vec4<u32>(0u))`}};function yR(t){return t.length===void 0?t.type:`array<${wd[t.type]?.stored??t.type}, ${t.length}>`}function bR(t){return/^(i|u)?sampler(2D|3D|Cube)$/.test(t)}function Up(t){return t==="texture_2d<f32>"||t==="texture_3d<f32>"||t==="texture_cube<f32>"||t==="texture_2d<i32>"||t==="texture_3d<i32>"||t==="texture_cube<i32>"||t==="texture_2d<u32>"||t==="texture_3d<u32>"||t==="texture_cube<u32>"}function vR(t){const e=o=>{const a=o.length===void 0?o.type:wd[o.type]?.stored??o.type,l=gR[a];if(l===void 0)throw new Error(`[RMSL] no uniform layout is known for ${o.type}. Its size and alignment have to be added to WGSL_LAYOUT before it can be packed into a uniform buffer.`);if(o.length===void 0)return{...l,stride:l.size};const c=Math.ceil(l.size/16)*16;return{size:c*o.length,align:Math.max(l.align,16),stride:c}},n=t.map((o,a)=>({m:o,declaredAt:a})).sort((o,a)=>{const l=e(a.m).align-e(o.m).align;return l!==0?l:o.declaredAt-a.declaredAt}).map(({m:o})=>o),r=[];let s=0;for(const o of n){const{size:a,align:l,stride:c}=e(o);s=Math.ceil(s/l)*l,r.push({name:o.slot,type:o.type,offset:s,size:a,...o.length!==void 0?{length:o.length,stride:c}:{}}),s+=a}const i=n.reduce((o,a)=>Math.max(o,e(a).align),4);return{members:r,size:Math.ceil(s/i)*i}}function Kn(t){return dR[t]??"f32"}function wR(t){let e="";for(const n of t)e+=n==="s"?"x":n==="t"?"y":n==="p"?"z":n==="q"?"w":n;return e}function Kc(t){return t.id??Number(/^_rmsl_v(\d+)$/.exec(t.slot)?.[1]??0)}function Ee(t,e){if(t==null)return{decls:[],body:[],expr:"0.0"};if(typeof t=="boolean")return{decls:[],body:[],expr:t?"true":"false"};if(typeof t=="number")return{decls:[],body:[],expr:Number.isInteger(t)?`${t}i`:`${t}f`};if(Array.isArray(t))return{decls:[],body:[],expr:`vec3<f32>(${t.join(", ")})`};let n=e.memo.get(t);if(n)return{decls:[],body:[],expr:n.expr,prec:n.prec};let r=_R(t,e);return e.memo.set(t,r),r}function _R(t,e){let n=eb(t);switch(n&&(t=n),t.type){case"float":return{decls:[],body:[],expr:`${t.value}f`};case"int":return{decls:[],body:[],expr:`${t.value}i`};case"uint":return{decls:[],body:[],expr:`${t.value}u`};case"bool":return{decls:[],body:[],expr:t.value?"true":"false"};case"vec2":return{decls:[],body:[],expr:`vec2<f32>(${t.value.join(", ")})`};case"vec3":return{decls:[],body:[],expr:`vec3<f32>(${t.value.join(", ")})`};case"vec4":return{decls:[],body:[],expr:`vec4<f32>(${t.value.join(", ")})`};case"ivec2":return{decls:[],body:[],expr:`vec2<i32>(${t.value.map(r=>`${r}i`).join(", ")})`};case"ivec3":return{decls:[],body:[],expr:`vec3<i32>(${t.value.map(r=>`${r}i`).join(", ")})`};case"ivec4":return{decls:[],body:[],expr:`vec4<i32>(${t.value.map(r=>`${r}i`).join(", ")})`};case"uvec2":return{decls:[],body:[],expr:`vec2<u32>(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec3":return{decls:[],body:[],expr:`vec3<u32>(${t.value.map(r=>`${r}u`).join(", ")})`};case"uvec4":return{decls:[],body:[],expr:`vec4<u32>(${t.value.map(r=>`${r}u`).join(", ")})`};case"bvec2":return{decls:[],body:[],expr:`vec2<bool>(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec3":return{decls:[],body:[],expr:`vec3<bool>(${t.value.map(r=>r?"true":"false").join(", ")})`};case"bvec4":return{decls:[],body:[],expr:`vec4<bool>(${t.value.map(r=>r?"true":"false").join(", ")})`};case"mat2":return{decls:[],body:[],expr:`mat2x2<f32>(${t.value.join(", ")})`};case"mat2x3":return{decls:[],body:[],expr:`mat2x3<f32>(${t.value.join(", ")})`};case"mat2x4":return{decls:[],body:[],expr:`mat2x4<f32>(${t.value.join(", ")})`};case"mat3x2":return{decls:[],body:[],expr:`mat3x2<f32>(${t.value.join(", ")})`};case"mat3":return{decls:[],body:[],expr:`mat3x3<f32>(${t.value.join(", ")})`};case"mat3x4":return{decls:[],body:[],expr:`mat3x4<f32>(${t.value.join(", ")})`};case"mat4x2":return{decls:[],body:[],expr:`mat4x2<f32>(${t.value.join(", ")})`};case"mat4x3":return{decls:[],body:[],expr:`mat4x3<f32>(${t.value.join(", ")})`};case"mat4":return{decls:[],body:[],expr:`mat4x4<f32>(${t.value.join(", ")})`};case"void":return{decls:[],body:[],expr:"0.0"};case"construct":{let r=(t.params??[]).map(u=>Ee(u,e)),s=Kn(t._t),i=Ft[t._t],o=t.params?.[0]?._t,a=Ft[o];if(r.length===1&&i!==void 0&&a!==void 0&&a>i&&i>=1&&/^(vec|ivec|uvec|bvec)/.test(o??"")){let u=`${r[0].expr}.${"xyzw".slice(0,i)}`;return{decls:r[0].decls,body:r[0].body,expr:i===1?`${s}(${u})`:u}}let l=r.length===1?pR(t._t,o):null;if(l)return e.wgslHelpers.add(l),{decls:r[0].decls,body:r[0].body,expr:`${l}(${r[0].expr})`};let c=mR(t._t,r.map(u=>u.expr),o).join(", ");return{decls:r.flatMap(u=>u.decls),body:r.flatMap(u=>u.body),expr:`${s}(${c})`}}case"var":{let r=t.value,s=r?.varName;return s&&!e.varDefs.has(s)&&e.varDefs.set(s,Kn(r?.varType||"float")),{decls:[],body:[],expr:s}}case"uniform":{let r=t.value,s=Ft[r?.shaderType]??1,i=r?.shaderType==="bool"||r?.shaderType?.startsWith("bvec"),o=s===1?"u32":`vec${s}<u32>`,a=s===1?"0u":`${o}(0u)`;if(r&&r.id!=null&&!e.uniforms.has(r.id)&&e.uniforms.set(r.id,{type:i?o:Kn(r.shaderType),slot:r.slot}),!r?.slot)return{decls:[],body:[],expr:"uniform<f32>"};let l=bR(r.shaderType)?r.slot:`${rh}.${r.slot}`;return{decls:[],body:[],expr:i?`(${l} != ${a})`:l}}case"uniformArray":{let r=t.value;return r&&r.id!=null&&!e.uniforms.has(r.id)&&e.uniforms.set(r.id,{type:Kn(r.shaderType),slot:r.slot,length:r.length}),{decls:[],body:[],expr:`${rh}.${r.slot}`}}case"uniformArrayElement":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=t.params[1]?._t,o=i==="int"||i==="uint"?s.expr:`i32(${s.expr})`,a=Kn(t.params[0]?._t),l=`${r.expr}[${o}]`,c=wd[a]?.read;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:c?c(l):l}}case"attribute":{let r=t.value;if(r&&r.id!=null&&!e.attributes.has(r.id)&&e.attributes.set(r.id,{type:Kn(r.shaderType),slot:r.slot}),e.shaderStage!=="vertex")return{decls:[],body:[],expr:r.slot};const s=kl(Kn(r.shaderType))!==null;return{decls:[],body:[],expr:s?r.slot:`input.${r.slot}`}}case"varying":{let r=t.value;r&&r.id!=null&&!e.varyings.has(r.id)&&e.varyings.set(r.id,{id:r.id,type:Kn(r.shaderType),slot:r.slot});let s=r?.slot||"vec3<f32>(0.0, 0.0, 0.0)",i=e.shaderStage==="vertex"?`result.${s}`:s;return{decls:[],body:[],expr:i}}case"output":{let r=t.value;return r&&r.id!=null&&!e.outputs.has(r.id)&&e.outputs.set(r.id,{type:Kn(r.shaderType),slot:r.slot,location:r.location}),{decls:[],body:[],expr:`result.${r?.slot}`}}case"builtinPosition":return ib(e),{decls:[],body:[],expr:"result.position"};case"builtinFragDepth":{if(e.shaderStage!=="fragment")throw new Error("builtinFragDepth() can only be used in fragment shaders");return e.fragDepthUsed=!0,{decls:[],body:[],expr:"result._rmsl_fragDepth"}}case"fragCoord":{if(e.shaderStage!=="fragment")throw new Error("fragCoord() can only be used in fragment shaders");return e.fragCoordUsed=!0,{decls:[],body:[],expr:"_rmsl_fragCoordInput.xy"}}case"swizzle":{let r=Ee(t.params[0],e),s=wR(t.value),i=(r.prec??Ke)<Ke?`(${r.expr})`:r.expr;return{decls:r.decls,body:r.body,expr:`${i}.${s}`,prec:Ke}}case"negate":{let r=Ee(t.params[0],e),s=St(r.prec,Bn,r.expr);return{decls:r.decls,body:r.body,expr:`-${s}`,prec:Bn}}case"not":{let r=Ee(t.params[0],e),s=St(r.prec,Bn,r.expr);return{decls:r.decls,body:r.body,expr:`!${s}`,prec:Bn}}case"all":{let r=Ee(t.params[0],e);return{decls:r.decls,body:r.body,expr:`all(${r.expr})`}}case"any":{let r=Ee(t.params[0],e);return{decls:r.decls,body:r.body,expr:`any(${r.expr})`}}case"add":return yt(t,e,"+");case"sub":return yt(t,e,"-");case"mul":return yt(t,e,"*");case"div":return yt(t,e,"/");case"atan2":return yt(t,e,"atan2",!0);case"mod":{let r=t.params[0]?._t;if(r==="int"||r==="uint")return yt(t,e,"%");let s=`_rmsl_mod_${r}`;return s in _d?(e.wgslHelpers.add(s),yt(t,e,s,!0)):yt(t,e,"%")}case"pow":return yt(t,e,"pow",!0);case"min":return yt(t,e,"min",!0);case"max":return yt(t,e,"max",!0);case"dot":return yt(t,e,"dot",!0);case"cross":return yt(t,e,"cross",!0);case"distance":return yt(t,e,"distance",!0);case"reflect":return yt(t,e,"reflect",!0);case"refract":return Zi(t,e,"refract");case"mix":return Zi(t,e,"mix");case"step":return yt(t,e,"step",!0);case"smoothstep":return Zi(t,e,"smoothstep");case"clamp":return Zi(t,e,"clamp");case"select":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=Ee(t.params[2],e),o=Ft[t.params[1]?._t]??1,a=Ft[t.params[2]?._t]??1,l=Math.max(o,a),c=s.expr,u=i.expr;return o===1&&l>1&&(c=`vec${l}<f32>(${c})`),a===1&&l>1&&(u=`vec${l}<f32>(${u})`),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`select(${u}, ${c}, ${r.expr})`,prec:Ke}}case"lessThan":return yt(t,e,"<");case"greaterThan":return yt(t,e,">");case"lessThanEqual":return yt(t,e,"<=");case"greaterThanEqual":return yt(t,e,">=");case"equal":return yt(t,e,"==");case"notEqual":return yt(t,e,"!=");case"and":return jp(t,e,"&&");case"or":return jp(t,e,"||");case"bitAnd":return yt(t,e,"&");case"bitOr":return yt(t,e,"|");case"bitXor":return yt(t,e,"^");case"shiftLeft":return Hp(t,e,"<<");case"shiftRight":return Hp(t,e,">>");case"matVecMul":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=t.params[0]?._t||"mat4",o=t.params[1]?._t||"vec3",a=ws.mul,l=St(r.prec,a,r.expr),c=St(s.prec,a,s.expr),u=Rr[i],h=Ft[o]??0;if(u!==void 0&&h===u[0]-1){let d=`(${l} * vec${u[0]}<f32>(${c}, 1.0))`;return h<u[1]&&(d+=`.${"xyzw".slice(0,h)}`),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:d,prec:Ke}}return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${l} * ${c}`,prec:a}}case"sin":return st(t,e,"sin");case"cos":return st(t,e,"cos");case"tan":return st(t,e,"tan");case"asin":return st(t,e,"asin");case"acos":return st(t,e,"acos");case"atan":return st(t,e,"atan");case"sinh":return st(t,e,"sinh");case"cosh":return st(t,e,"cosh");case"tanh":return st(t,e,"tanh");case"asinh":return st(t,e,"asinh");case"acosh":return st(t,e,"acosh");case"atanh":return st(t,e,"atanh");case"abs":return st(t,e,"abs");case"sign":return st(t,e,"sign");case"floor":return st(t,e,"floor");case"ceil":return st(t,e,"ceil");case"fract":return st(t,e,"fract");case"round":return st(t,e,"round");case"trunc":return st(t,e,"trunc");case"sqrt":return st(t,e,"sqrt");case"inverseSqrt":return st(t,e,"inverseSqrt");case"exp":return st(t,e,"exp");case"log":return st(t,e,"log");case"exp2":return st(t,e,"exp2");case"log2":return st(t,e,"log2");case"normalize":return st(t,e,"normalize");case"length":return st(t,e,"length");case"transpose":return st(t,e,"transpose");case"inverse":{let r=Ee(t.params[0],e),s=`_rmsl_inverse${sb(t.params[0]?._t)}`;return e.wgslHelpers.add(s),{decls:r.decls,body:r.body,expr:`${s}(${r.expr})`}}case"determinant":return st(t,e,"determinant");case"fwidth":return st(t,e,"fwidth");case"dFdx":return st(t,e,"dpdx");case"dFdy":return st(t,e,"dpdy");case"faceForward":return Zi(t,e,"faceForward");case"bitNot":{let r=Ee(t.params[0],e),s=St(r.prec,Bn,r.expr);return{decls:r.decls,body:r.body,expr:`~${s}`,prec:Bn}}case"matrixElement":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`i32(${i})`);let o=(r.prec??Ke)<Ke?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:Ke}}case"vectorElement":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=s.expr;(t.params[1]?._t||"float")==="float"&&(i=`i32(${i})`);let o=(r.prec??Ke)<Ke?`(${r.expr})`:r.expr;return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o}[${i}]`,prec:Ke}}case"texture":case"textureLod":{let r=t.params[0],s=Ee(r,e),i=Ee(t.params[1],e),o=r.value?.slot,a=r?._t||"sampler2D";if(a.startsWith("isampler")||a.startsWith("usampler")){let c=a.endsWith("2D")?2:3,u=t.params[1]?._t||"ivec2",h=i.expr;if(u!==`ivec${c}`&&(h=`vec${c}<i32>(${h})`),t.type==="texture")return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`textureLoad(${s.expr}, ${h}, 0i)`,prec:Ke};let d=Ee(t.params[2],e),f=d.expr;return(t.params[2]?._t||"float")!=="int"&&(f=`i32(${f})`),{decls:[...s.decls,...i.decls,...d.decls],body:[...s.body,...i.body,...d.body],expr:`textureLoad(${s.expr}, ${h}, ${f})`,prec:Ke}}o&&!e.wgslSamplers.has(o)&&e.wgslSamplers.set(o,{textureSlot:o,samplerSlot:o+"_s"});let l=o?o+"_s":"sampler";if(t.type==="texture")return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`textureSample(${s.expr}, ${l}, ${i.expr})`};{let c=Ee(t.params[2],e);return{decls:[...s.decls,...i.decls,...c.decls],body:[...s.body,...i.body,...c.body],expr:`textureSampleLevel(${s.expr}, ${l}, ${i.expr}, ${c.expr})`}}}case"textureLoad":{let r=t.params[0],s=Ee(r,e),i=Ee(t.params[1],e),o=(r?._t||"sampler2D").endsWith("2D")?2:3,a=t.params[1]?._t||`ivec${o}`,l=i.expr;return a!==`ivec${o}`&&a!==`uvec${o}`&&(l=`vec${o}<i32>(${l})`),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`textureLoad(${s.expr}, ${l}, 0)`,prec:Ke}}case"textureSize":{let r=Ee(t.params[0],e);return{decls:r.decls,body:r.body,expr:`textureDimensions(${r.expr})`,prec:Ke}}case"let":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=t.params[0]._t||"float",o=Kn(i),a=t.params[0].varName||r.expr;return e.varDefs.set(a,o),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body,`var ${a}: ${o} = ${s.expr};`],expr:a}}case"assign":{t.params[0]?.type==="builtinPosition"&&(e.positionWritten=!0);let r=Ee(t.params[1],e),s=t.params[0];if(s?.type==="swizzle"){let o=uR(s),a=Ee(o.base,e);if(o.pattern.length===1)return{decls:[...a.decls,...r.decls],body:[...a.body,...r.body,`${a.expr}.${o.pattern} = ${r.expr};`],expr:a.expr};let l=`_rmsl_sw${e.nextId++}`,c=Kn(t.params[1]?._t??"float"),u=[...a.body,...r.body,`var ${l}: ${c} = ${r.expr};`,...[...o.pattern].map((h,d)=>`${a.expr}.${h} = ${l}[${d}];`)];return{decls:[...a.decls,...r.decls],body:u,expr:a.expr}}let i=Ee(t.params[0],e);return{decls:[...i.decls,...r.decls],body:[...i.body,...r.body,`${i.expr} = ${r.expr};`],expr:i.expr}}case"seq":{let r=t.params??[],s=[],i=[],o="0.0";for(let a of r){let l=Ee(a,e);s.push(...l.decls),i.push(...l.body),o=l.expr}return{decls:s,body:i,expr:o}}case"if":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=t.params.length>=3&&t.params[2]!==void 0?Ee(t.params[2],e):{decls:[],body:[]},o=[...r.body,`if (${r.expr}) {`,...s.body.map(a=>"  "+a),"}"];return i.body.length>0&&(o.push("else {"),o.push(...i.body.map(a=>"  "+a)),o.push("}")),{decls:[...r.decls,...s.decls,...i.decls],body:o,expr:"0.0"}}case"for":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=Ee(t.params[2],e),o=Ee(t.params[3],e),a=r.expr,l=r.body;if(r.body.length>0){let d=r.body[r.body.length-1];d.endsWith(";")&&(a=d.slice(0,-1),l=r.body.slice(0,-1))}let c=tb(i),u=[...r.decls,...s.decls,...i.decls,...o.decls];if(c.length>1)return{decls:u,body:[...l,"{",`  ${a};`,"  loop {",...s.body.map(d=>"    "+d),`    if (!(${s.expr})) { break; }`,...o.body.map(d=>"    "+d),"    continuing {",...c.map(d=>"      "+d),"    }","  }","}"],expr:"0.0"};let h=c.length===1?nb(c[0]):"";return{decls:u,body:[...l,`for (${a}; ${s.expr}; ${h}) {`,...o.body.map(d=>"  "+d),"}"],expr:"0.0"}}case"while":{let r=Ee(t.params[0],e),s=Ee(t.params[1],e);return{decls:[...r.decls,...s.decls],body:[...r.body,`while (${r.expr}) {`,...s.body.map(i=>"  "+i),"}"],expr:"0.0"}}case"discard":return{decls:[],body:["discard;"],expr:"0.0"};case"break":return{decls:[],body:["break;"],expr:"0.0"};case"continue":return{decls:[],body:["continue;"],expr:"0.0"};case"return":return{decls:[],body:["return;"],expr:"0.0"};default:throw new Error(`[RMSL] Unsupported node type in WGSL compiler: "${t.type}"`)}}const _d={_rmsl_mat3_from_mat4:`fn _rmsl_mat3_from_mat4(m: mat4x4<f32>) -> mat3x3<f32> {
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
}`};function Hp(t,e,n){let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=t.params[1]?._t==="uint"?s.expr:`u32(${s.expr})`,o=ws[t.type]??0,a=St(r.prec,o,r.expr);return i=St(s.prec,o,i),{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${a} ${n} ${i}`,prec:o}}function jp(t,e,n){let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=ws[t.type]??0;const o=(a,l)=>l?.type==="and"||l?.type==="or"?`(${a.expr})`:St(a.prec,i,a.expr);return{decls:[...r.decls,...s.decls],body:[...r.body,...s.body],expr:`${o(r,t.params[0])} ${n} ${o(s,t.params[1])}`,prec:i}}function yt(t,e,n,r){let s=Ee(t.params[0],e),i=Ee(t.params[1],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=i.expr,c=s.expr;if(o!==a&&(o==="float"&&(a==="int"||a==="uint")?l=`f32(${i.expr})`:(o==="int"||o==="uint")&&a==="float"?l=o==="int"?`i32(${i.expr})`:`u32(${i.expr})`:(o==="int"||o==="uint")&&(a==="int"||a==="uint")&&(l=o==="int"?`i32(${i.expr})`:`u32(${i.expr})`)),r)return{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${n}(${c}, ${l})`,prec:Ke};let u=ws[t.type]??0;return c=St(s.prec,u,c),l=St(i.prec,u,l),{decls:[...s.decls,...i.decls],body:[...s.body,...i.body],expr:`${c} ${n} ${l}`,prec:u}}function Zi(t,e,n){let r=Ee(t.params[0],e),s=Ee(t.params[1],e),i=Ee(t.params[2],e),o=t.params[0]?._t||"float",a=t.params[1]?._t||"float",l=t.params[2]?._t||"float",c=r.expr,u=s.expr,h=i.expr;return o==="float"&&((a==="int"||a==="uint")&&(u=`f32(${u})`),(l==="int"||l==="uint")&&(h=`f32(${h})`)),{decls:[...r.decls,...s.decls,...i.decls],body:[...r.body,...s.body,...i.body],expr:`${n}(${c}, ${u}, ${h})`}}function st(t,e,n){let r=Ee(t.params[0],e);return{decls:r.decls,body:r.body,expr:`${n}(${r.expr})`}}function eu(t,e,n){let r={nextId:0,shaderStage:e,uniforms:new Map,attributes:new Map,varyings:new Map,outputs:new Map,wgslSamplers:new Map,varDefs:new Map,memo:new Map,wgslHelpers:new Set,positionWritten:!1,fragDepthUsed:!1,fragCoordUsed:!1},s=Array.isArray(t)?t:[t],i=s.map(g=>Ee(g,r)),o=[],a="0.0",l;for(let g=0;g<i.length;g++)o.push(...i[g].decls,...i[g].body),a=i[g].expr,l=s[g]?._t;rb(e,l,r.positionWritten);let c=l==="vec4"&&!r.positionWritten,u=[],h=0,d=0,f=[...r.uniforms.entries()].sort((g,b)=>g[1].slot.localeCompare(b[1].slot)),m=f.filter(([,g])=>Up(g.type)),p=f.filter(([,g])=>!Up(g.type));for(let[,g]of m)u.push(`@group(1) @binding(${h++}) var ${g.slot}: ${g.type};`);let y=n?.uniforms?xR(n.uniforms,p.map(([,g])=>g)):p.map(([,g])=>({slot:g.slot,type:g.type,length:g.length}));if(y.length>0){let g=vR(y);u.push(`struct ${Bp} {`);for(let b of g.members)u.push(`  ${b.name}: ${yR(b)},`);u.push("};"),u.push(`@group(0) @binding(0) var<uniform> ${rh}: ${Bp};`)}r.wgslSamplers.forEach(g=>{u.push(`@group(2) @binding(${d++}) var ${g.samplerSlot}: sampler;`)}),(r.uniforms.size>0||r.wgslSamplers.size>0||r.outputs.size>0)&&u.push("");for(const g of[...r.wgslHelpers].sort())u.push(_d[g],"");if(e==="vertex"){if(r.attributes.size>0){u.push("struct VertexInput {");let v=0;const x=[...r.attributes.entries()].sort((k,C)=>k[0]-C[0]);for(const[,k]of x){const C=kl(k.type);if(C)for(let E=0;E<C.count;E++)u.push(`  @location(${v+E}) ${Fp(k.slot,E)}: ${C.columnType},`);else u.push(`  @location(${v}) ${k.slot}: ${k.type},`);v+=fR(k.type)}u.push("};"),u.push("")}u.push("struct VertexOutput {"),u.push("  @builtin(position) position: vec4<f32>,");let g=[...r.varyings.entries()].sort((v,x)=>v[1].slot.localeCompare(x[1].slot)),b=0;for(let[,v]of g)b=Math.max(b,Kc(v)+1),u.push(`  @location(${Kc(v)}) ${v.slot}: ${v.type},`);r.outputs.forEach(v=>{v&&v.slot&&v.type&&u.push(`  @location(${b++}) ${v.slot}: ${v.type},`)}),u.push("};"),u.push(""),u.push("@vertex"),r.attributes.size>0?u.push("fn main(input: VertexInput) -> VertexOutput {"):u.push("fn main() -> VertexOutput {"),u.push("  var result: VertexOutput;");for(const[,v]of[...r.attributes.entries()].sort((x,k)=>x[0]-k[0])){const x=kl(v.type);if(!x)continue;const k=Array.from({length:x.count},(C,E)=>`input.${Fp(v.slot,E)}`);u.push(`  let ${v.slot} = ${v.type}(${k.join(", ")});`)}for(let v of o)u.push("  "+v);c&&u.push(`  result.position = ${a};`),u.push("  return result;"),u.push("}")}else{let g=r.outputs.size===0&&c,b=r.outputs.size>0||g||r.fragDepthUsed;if(b){u.push("struct FragmentOutput {");let k=0;r.outputs.forEach(C=>{C&&C.slot&&C.type&&u.push(`  @location(${k++}) ${C.slot}: ${C.type},`)}),g&&u.push("  @location(0) _rmsl_fragColor: vec4<f32>,"),r.fragDepthUsed&&u.push("  @builtin(frag_depth) _rmsl_fragDepth: f32,"),u.push("};"),u.push("")}u.push("@fragment");let v="",x=[...r.varyings.entries()].sort((k,C)=>k[1].slot.localeCompare(C[1].slot));for(let[,k]of x)v&&(v+=", "),v+=`@location(${Kc(k)}) ${k.slot}: ${k.type}`;r.fragCoordUsed&&(v&&(v+=", "),v+="@builtin(position) _rmsl_fragCoordInput: vec4<f32>"),u.push(`fn main(${v})${b?" -> FragmentOutput":""} {`),b&&u.push("  var result: FragmentOutput;");for(let k of o)u.push("  "+k);g&&u.push(`  result._rmsl_fragColor = ${a};`),r.fragDepthUsed&&!o.some(k=>k.includes("_rmsl_fragDepth ="))&&u.push("  result._rmsl_fragDepth = 1.0;"),b&&u.push("  return result;"),u.push("}")}return u.join(`
`)}Object.assign((t,e)=>eu(t,"fragment",e),{vertex:(t,e)=>eu(t,"vertex",e),fragment:(t,e)=>eu(t,"fragment",e)});function xR(t,e){let n=new Set(t.map(r=>r.slot));for(let r of e)if(!n.has(r.slot))throw new Error(`[RMSL] the uniform "${r.slot}" is read by this stage but missing from the uniforms passed to the compiler. Pass every uniform of the program, so both stages and the host agree on the buffer layout.`);return t}class xd{x;y;constructor(e=0,n=0){this.x=e,this.y=n}set(e,n){return this.x=e,this.y=n,this}setScalar(e){return this.x=e,this.y=e,this}copy(e){return this.x=e.x,this.y=e.y,this}clone(){return new xd(this.x,this.y)}add(e){return this.x+=e.x,this.y+=e.y,this}sub(e){return this.x-=e.x,this.y-=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divideScalar(e){return this.multiplyScalar(1/e)}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.lengthSq())}normalize(){return this.divideScalar(this.length()||1)}dot(e){return this.x*e.x+this.y*e.y}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const n=this.x-e.x,r=this.y-e.y;return n*n+r*r}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e}}class ec{x;y;z;w;constructor(e=0,n=0,r=0,s=1){this.x=e,this.y=n,this.z=r,this.w=s}set(e,n,r,s){return this.x=e,this.y=n,this.z=r,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w,this}clone(){return new ec(this.x,this.y,this.z,this.w)}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}divideScalar(e){return this.multiplyScalar(1/e)}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.dot(this)}length(){return Math.sqrt(this.lengthSq())}normalize(){return this.divideScalar(this.length()||1)}lerp(e,n){return this.x+=(e.x-this.x)*n,this.y+=(e.y-this.y)*n,this.z+=(e.z-this.z)*n,this.w+=(e.w-this.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,n=0){return this.x=e[n],this.y=e[n+1],this.z=e[n+2],this.w=e[n+3],this}toArray(e=[],n=0){return e[n]=this.x,e[n+1]=this.y,e[n+2]=this.z,e[n+3]=this.w,e}}function kR(t){return t*Math.PI/180}class Xn extends Ui{isGroup=!0}class ob extends Ui{isScene=!0;background=new Qt(0,0,0)}class SR extends Ui{isCamera=!0;matrixWorldInverse=new sr;projectionMatrix=new sr;projectionMatrixInverse=new sr;updateMatrixWorld(e=!1){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}getWorldDirection(e=new wt){return super.getWorldDirection(e)}}class ER extends SR{isPerspectiveCamera=!0;fov;aspect;near;far;constructor(e=50,n=1,r=.1,s=2e3){super(),this.fov=e,this.aspect=n,this.near=r,this.far=s,this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near,n=e*Math.tan(kR(.5*this.fov)),r=2*n,s=this.aspect*r,i=-.5*s;this.projectionMatrix.makePerspective(i,i+s,n,n-r,e,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}}class $e{isBufferAttribute=!0;array;itemSize;normalized;count;stepMode;needsUpdate=!1;format;updateRange={offset:0,count:-1};constructor(e,n,r=!1,s="vertex"){this.array=e,this.itemSize=n,this.normalized=r,this.stepMode=s,this.count=e!==void 0?e.length/n:0}setStepMode(e){return this.stepMode=e,this}setArray(e){return this.array=e,this.count=e.length/this.itemSize,this.needsUpdate=!0,this}getX(e){return this.array[e*this.itemSize]}getY(e){return this.array[e*this.itemSize+1]}getZ(e){return this.array[e*this.itemSize+2]}getW(e){return this.array[e*this.itemSize+3]}clone(){const e=this.array.slice?this.array.slice():Array.from(this.array),n=new $e(e,this.itemSize,this.normalized,this.stepMode);return n.format=this.format,n}}function AR(t){let e=-1/0;for(let n=0;n<t.length;n++){const r=t[n];r>e&&(e=r)}return e}class Jr extends md{isBufferGeometry=!0;attributes={};index=null;name="";instanceCount=1;setAttribute(e,n){return this.attributes[e]=n,this}getAttribute(e){return this.attributes[e]}hasAttribute(e){return this.attributes[e]!==void 0}deleteAttribute(e){return delete this.attributes[e],this}setIndex(e){if(e===null)this.index=null;else if(e instanceof $e)this.index=e;else{const n=e.length>0&&AR(e)>65535;this.index=new $e(n?new Uint32Array(e):new Uint16Array(e),1)}return this}get position(){return this.attributes.position}set position(e){e===void 0?delete this.attributes.position:this.attributes.position=e}get normal(){return this.attributes.normal}set normal(e){e===void 0?delete this.attributes.normal:this.attributes.normal=e}get uv(){return this.attributes.uv}set uv(e){e===void 0?delete this.attributes.uv:this.attributes.uv=e}get vertexCount(){return this.index?this.index.count:this.attributes.position?.count??0}get drawCount(){return this.index?this.index.count:this.attributes.position?.count??0}dispose(){this.dispatchEvent({type:"dispose"})}}var Qr=(t=>(t[t.FrontSide=0]="FrontSide",t[t.BackSide=1]="BackSide",t[t.DoubleSide=2]="DoubleSide",t))(Qr||{}),Vs=(t=>(t[t.NoBlending=0]="NoBlending",t[t.NormalBlending=1]="NormalBlending",t[t.AdditiveBlending=2]="AdditiveBlending",t))(Vs||{});class ab{name="";side=0;transparent=!1;opacity=1;depthTest=!0;depthWrite=!0;blending=1;get precision(){return this._precision}set precision(e){this._precision!==e&&(this._precision=e,this.needsUpdate=!0)}_precision=null;needsUpdate=!1;isMaterial=!0}class wn extends Ui{isMesh=!0;geometry;material;castShadow=!1;receiveShadow=!1;drawRange={start:0,count:1/0};constructor(e=new Jr,n=new ab){super(),this.geometry=e,this.material=n}}const TR=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],CR=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],MR=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];class lb extends Jr{isLineSegmentsGeometry=!0;type="LineSegmentsGeometry";constructor(){super(),this.setIndex(MR),this.setAttribute("position",new $e(new Float32Array(TR),3)),this.setAttribute("uv",new $e(new Float32Array(CR),2))}setPositions(e){const n=e instanceof Float32Array?e:new Float32Array(e),r=Math.floor(n.length/6),s=new Float32Array(r*3),i=new Float32Array(r*3);for(let o=0;o<r;o++){const a=o*6;s[o*3]=n[a],s[o*3+1]=n[a+1],s[o*3+2]=n[a+2],i[o*3]=n[a+3],i[o*3+1]=n[a+4],i[o*3+2]=n[a+5]}return this.setAttribute("instanceStart",new $e(s,3).setStepMode("instance")),this.setAttribute("instanceEnd",new $e(i,3).setStepMode("instance")),this.instanceCount=r,this}setColors(e){const n=e instanceof Float32Array?e:new Float32Array(e),r=Math.floor(n.length/6),s=new Float32Array(r*3),i=new Float32Array(r*3);for(let o=0;o<r;o++){const a=o*6;s[o*3]=n[a],s[o*3+1]=n[a+1],s[o*3+2]=n[a+2],i[o*3]=n[a+3],i[o*3+1]=n[a+4],i[o*3+2]=n[a+5]}return this.setAttribute("instanceColorStart",new $e(s,3).setStepMode("instance")),this.setAttribute("instanceColorEnd",new $e(i,3).setStepMode("instance")),this}computeLineDistances(){const e=this.attributes.instanceStart,n=this.attributes.instanceEnd;if(!e||!n)return this;const r=e.count,s=new Float32Array(r),i=new Float32Array(r);let o=0;for(let a=0;a<r;a++){s[a]=o;const l=n.getX(a)-e.getX(a),c=n.getY(a)-e.getY(a),u=n.getZ(a)-e.getZ(a);o+=Math.sqrt(l*l+c*c+u*u),i[a]=o}return this.setAttribute("instanceDistanceStart",new $e(s,1).setStepMode("instance")),this.setAttribute("instanceDistanceEnd",new $e(i,1).setStepMode("instance")),this}applyMatrix4(e){const n=this.attributes.instanceStart,r=this.attributes.instanceEnd;if(n&&r){const s=n.array,i=r.array;for(let o=0;o<n.count;o++)ns.set(s[o*3],s[o*3+1],s[o*3+2]).applyMatrix4(e),s[o*3]=ns.x,s[o*3+1]=ns.y,s[o*3+2]=ns.z,ns.set(i[o*3],i[o*3+1],i[o*3+2]).applyMatrix4(e),i[o*3]=ns.x,i[o*3+1]=ns.y,i[o*3+2]=ns.z;n.needsUpdate=!0,r.needsUpdate=!0}return this}}const ns=new wt;class RR{uniforms=new Map;attributes=new Map;varyings=new Map;samplers=new Map;stage="vertex";instancing=!1;instancingColor=!1;attribute(e,n,r="vertex"){let s=this.attributes.get(e);if(!s){const i=nR(n);this.attributes.set(e,{node:i,name:e,stepMode:r}),s=this.attributes.get(e)}return s.node}varying(e,n){let r=this.varyings.get(e);if(!r){const s=rR(n);this.varyings.set(e,{node:s,name:e}),r=this.varyings.get(e)}return r.node}uniform(e,n,r,s){let i=this.uniforms.get(e);if(!i){const o=$p(e,n);this.uniforms.set(e,{node:o,name:e,scope:r,value:s}),i=this.uniforms.get(e)}return i.node}materialUniform(e,n,r){return this.uniform(e,n,"material",r)}rendererUniform(e,n){return this.uniform(e,n,"renderer")}sampler(e,n,r){const s=typeof n=="string"?n:"sampler2D",i=typeof n=="string"?r:n;let o=this.samplers.get(e);if(!o){const a=$p(e,s);this.samplers.set(e,{node:a,name:e,type:s,texture:i}),o=this.samplers.get(e)}return o.node}get position(){return this.stage==="vertex"?this.attribute("position","vec3"):this.varying("positionWorld","vec3")}get normal(){return this.stage==="vertex"?this.attribute("normal","vec3"):this.varying("normalWorld","vec3")}get uv(){return this.stage==="vertex"?this.attribute("uv","vec2"):this.varying("uv","vec2")}get instanceMatrix(){return this.attribute("instanceMatrix","mat4","instance")}get instanceColor(){return this.attribute("instanceColor","vec3","instance")}get positionWorld(){return this.varying("positionWorld","vec3")}get normalWorld(){return this.varying("normalWorld","vec3")}get uvVarying(){return this.varying("uv","vec2")}get instanceColorVarying(){return this.varying("instanceColor","vec3")}get cameraPosition(){return this.uniform("cameraPosition","vec3","camera")}get viewMatrix(){return this.uniform("viewMatrix","mat4","camera")}get projectionMatrix(){return this.uniform("projectionMatrix","mat4","camera")}get modelMatrix(){return this.uniform("modelMatrix","mat4","object")}get normalMatrix(){return this.uniform("normalMatrix","mat3","object")}get modelViewMatrix(){return this.viewMatrix.mul(this.modelMatrix)}get viewDirection(){return this.cameraPosition.sub(this.positionWorld).normalize()}}function Wp(t){const e=new Set,n=new Set,r=new Set,s=new Set,i=a=>{if(!a||typeof a!="object"||s.has(a))return;s.add(a);const l=a.type;if(l==="uniform"||l==="uniformArray"?e.add(a):l==="attribute"?n.add(a):l==="varying"&&r.add(a),Array.isArray(a.params))for(const c of a.params)i(c)},o=Array.isArray(t)?t:[t];for(const a of o)i(a);return{uniforms:e,attributes:n,varyings:r}}function Dt(t,e){if(t!==void 0)return typeof t=="function"?t(e):t}class ur extends ab{isNodeMaterial=!0;colorNode;opacityNode;roughnessNode;metalnessNode;emissiveNode;normalNode;positionNode;uvNode;vertexNode;fragmentNode;setup(e,n){}buildVertexBody(e){const n=Dt(this.positionNode,e)??e.position,r=Ie(n,1),s=e.instancing?e.instanceMatrix.mul(r):r,i=e.modelMatrix.mul(s);e.positionWorld.assign(i.xyz);let o=Dt(this.normalNode,e)??e.normal;return e.instancing&&(o=vd(e.instanceMatrix).mul(o)),e.normalWorld.assign(e.normalMatrix.mul(o).normalize()),e.uvVarying.assign(e.uv),e.instancingColor&&e.instanceColorVarying.assign(e.instanceColor),e.projectionMatrix.mul(e.viewMatrix.mul(i))}buildFragmentBody(e){return Ie(1,1,1,1)}build(e,n={}){const r=new RR;r.instancing=n.instancing??!1,r.instancingColor=n.instancingColor??!1,this.setup(r,e),r.stage="vertex";const s=zp(()=>this.vertexNode?this.vertexNode(r):this.buildVertexBody(r))();r.stage="fragment";const i=zp(()=>{const h=iR("vec4"),d=this.fragmentNode?this.fragmentNode(r):this.buildFragmentBody(r),f=r.instancingColor?Ie(d.rgb.mul(r.instanceColorVarying),d.a):d;return h.assign(f),h})(),o=Wp(s),a=Wp(i),l=new Set([...o.uniforms,...a.uniforms]),c=new Set([...o.attributes,...a.attributes]),u=new Set([...o.varyings,...a.varyings]);return{vertexRoot:s,fragmentRoot:i,uniforms:[...r.uniforms.values()].filter(h=>l.has(h.node)),attributes:[...r.attributes.values()].filter(h=>c.has(h.node)),varyings:[...r.varyings.values()].filter(h=>u.has(h.node)),samplers:[...r.samplers.values()]}}}class kd extends ur{isLine2NodeMaterial=!0;color=new Qt(1,1,1);linewidth=1;dashSize=1;gapSize=1;dashOffset=0;dashScale=1;lineWidthNode;dashSizeNode;gapSizeNode;dashOffsetNode;dashScaleNode;offsetNode;colorUniform;lineWidthUniform;resolutionUniform;dashScaleUniform;dashSizeUniform;gapSizeUniform;dashOffsetUniform;_worldUnits=!1;_dashed=!1;_vertexColors=!1;_alphaToCoverage=!0;constructor(e={}){super(),this.side=Qr.DoubleSide,e.color!==void 0&&(this.color=typeof e.color=="number"?new Qt().setHex(e.color):e.color.clone()),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.dashOffset!==void 0&&(this.dashOffset=e.dashOffset),e.dashScale!==void 0&&(this.dashScale=e.dashScale),e.worldUnits!==void 0&&(this._worldUnits=e.worldUnits),e.dashed!==void 0&&(this._dashed=e.dashed),e.vertexColors!==void 0&&(this._vertexColors=e.vertexColors),e.alphaToCoverage!==void 0&&(this._alphaToCoverage=e.alphaToCoverage),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.precision!==void 0&&(this.precision=e.precision)}get worldUnits(){return this._worldUnits}set worldUnits(e){this._worldUnits!==e&&(this._worldUnits=e,this.needsUpdate=!0)}get dashed(){return this._dashed}set dashed(e){this._dashed!==e&&(this._dashed=e,this.needsUpdate=!0)}get vertexColors(){return this._vertexColors}set vertexColors(e){this._vertexColors!==e&&(this._vertexColors=e,this.needsUpdate=!0)}get alphaToCoverage(){return this._alphaToCoverage}set alphaToCoverage(e){this._alphaToCoverage!==e&&(this._alphaToCoverage=e,this.needsUpdate=!0)}setup(e,n){this.colorUniform=e.materialUniform("materialColor","vec3",()=>this.color.toArray()),this.lineWidthUniform=e.materialUniform("materialLineWidth","float",()=>this.linewidth),this.resolutionUniform=e.rendererUniform("resolution","vec2"),this._dashed&&(this.dashScaleUniform=e.materialUniform("materialLineScale","float",()=>this.dashScale),this.dashSizeUniform=e.materialUniform("materialLineDashSize","float",()=>this.dashSize),this.gapSizeUniform=e.materialUniform("materialLineGapSize","float",()=>this.gapSize),this.dashOffsetUniform=e.materialUniform("materialLineDashOffset","float",()=>this.dashOffset))}buildVertexBody(e){const n=e.position,r=n.y.toVar("quadY"),s=n.x.toVar("quadX");e.uvVarying.assign(e.uv);const i=e.attribute("instanceStart","vec3","instance"),o=Ie(e.modelViewMatrix.mul(Ie(i,1))).toVar("start"),a=e.attribute("instanceEnd","vec3","instance"),l=Ie(e.modelViewMatrix.mul(Ie(a,1))).toVar("end");let c,u;this._dashed&&(c=e.attribute("instanceDistanceStart","float","instance").toVar("distanceStart"),u=e.attribute("instanceDistanceEnd","float","instance").toVar("distanceEnd")),this._worldUnits&&(e.varying("worldStart","vec3").assign(o.xyz),e.varying("worldEnd","vec3").assign(l.xyz));const h=gi(gi(e.projectionMatrix,2),3).equal(-1);if(xt(h,()=>{xt(o.z.lessThan(0).and(l.z.greaterThan(0)),()=>{const b=Vp(e,o,l);l.assign(Ie(_r(o.xyz,l.xyz,b),l.w)),c&&u&&u.assign(_r(c,u,b))}).ElseIf(l.z.lessThan(0).and(o.z.greaterThanEqual(0)),()=>{const b=Vp(e,l,o);o.assign(Ie(_r(l.xyz,o.xyz,b),o.w)),c&&u&&c.assign(_r(u,c,b))})}),this._dashed){const b=Dt(this.dashScaleNode,e)??this.dashScaleUniform,v=Dt(this.offsetNode,e)??this.dashOffsetUniform,x=r.lessThan(.5).select(b.mul(c),b.mul(u)).add(v);e.varying("lineDistance","float").assign(x)}const d=e.projectionMatrix.mul(o),f=e.projectionMatrix.mul(l),m=d.xyz.div(d.w),p=f.xyz.div(f.w),y=Dt(this.lineWidthNode,e)??this.lineWidthUniform,g=Ie().toVar("clip");if(this._worldUnits){const b=l.xyz.sub(o.xyz).normalize(),v=_r(o.xyz,l.xyz,.5).normalize(),x=b.cross(v).normalize(),k=b.cross(x),C=e.varying("worldPos","vec4");C.assign(r.lessThan(.5).select(o,l));const E=y.mul(.5);C.assign(C.add(Ie(s.lessThan(0).select(x.mul(E),x.mul(E).negate()),0))),this._dashed||(C.assign(C.add(Ie(r.lessThan(.5).select(b.mul(E).negate(),b.mul(E)),0))),C.assign(C.add(Ie(k.mul(E),0))),xt(r.greaterThan(1).or(r.lessThan(0)),()=>{C.assign(C.sub(Ie(k.mul(2).mul(E),0)))})),g.assign(e.projectionMatrix.mul(C));const T=r.lessThan(.5).select(m,p).toVar("clipPose");g.z.assign(T.z.mul(g.w))}else{const b=this.resolutionUniform.x.div(this.resolutionUniform.y),v=p.xy.sub(m.xy).toVar("dir");v.x.assign(v.x.mul(b)),v.assign(v.normalize());const x=Vt(v.y,v.x.negate()).toVar("offset");v.x.assign(v.x.div(b)),x.x.assign(x.x.div(b)),x.assign(s.lessThan(0).select(x.negate(),x)),xt(r.lessThan(0),()=>{x.assign(x.sub(v))}).ElseIf(r.greaterThan(1),()=>{x.assign(x.add(v))}),x.assign(x.mul(y)),x.assign(x.div(this.resolutionUniform.y)),g.assign(r.lessThan(.5).select(d,f)),x.assign(x.mul(g.w)),g.assign(g.add(Ie(x,0,0)))}if(this._vertexColors){const b=e.attribute("instanceColorStart","vec3","instance"),v=e.attribute("instanceColorEnd","vec3","instance");e.varying("instanceColor","vec3").assign(r.lessThan(.5).select(b,v))}return g}buildFragmentBody(e){const n=e.uv;if(this._dashed){const o=Dt(this.dashSizeNode,e)??this.dashSizeUniform,a=Dt(this.gapSizeNode,e)??this.gapSizeUniform,l=e.varying("lineDistance","float");xt(n.y.lessThan(-1).or(n.y.greaterThan(1)),()=>{ma()}),xt(l.mod(o.add(a)).greaterThan(o),()=>{ma()})}const r=Dt(this.lineWidthNode,e)??this.lineWidthUniform;if(this._worldUnits){const o=e.varying("worldStart","vec3"),a=e.varying("worldEnd","vec3"),l=e.varying("worldPos","vec4").xyz.normalize().mul(1e5),c=a.sub(o),u=IR(o,a,ze(0,0,0),l),h=o.add(c.mul(u.x)),d=l.mul(u.y),f=h.sub(d).length().div(r);xt(f.greaterThan(.5),()=>{ma()})}else xt(n.y.abs().greaterThan(1),()=>{const o=n.x,a=n.y.greaterThan(0).select(n.y.sub(1),n.y.add(1)),l=o.mul(o).add(a.mul(a));xt(l.greaterThan(1),()=>{ma()})});let s=Dt(this.colorNode,e)??this.colorUniform;this._vertexColors&&(s=s.mul(e.varying("instanceColor","vec3")));const i=Dt(this.opacityNode,e)??V(this.opacity);return Ie(s,i)}}function Vp(t,e,n){const r=gi(gi(t.projectionMatrix,2),2),s=gi(gi(t.projectionMatrix,3),2);return r.greaterThan(0).select(s.negate().div(r.add(1)),s.mul(-.5).div(r)).sub(e.z).div(n.z.sub(e.z))}function IR(t,e,n,r){const s=t.sub(n),i=r.sub(n),o=e.sub(t),a=s.dot(i),l=i.dot(o),c=s.dot(o),u=i.dot(i),h=o.dot(o).mul(u).sub(l.mul(l)),d=a.mul(l).sub(c.mul(u)).div(h).clamp(V(0),V(1)),f=a.add(l.mul(d)).div(u).clamp(V(0),V(1));return Vt(d,f)}class zR extends wn{isLineSegments2=!0;type="LineSegments2";resolution=new xd;constructor(e=new lb,n=new kd){super(e,n)}computeLineDistances(){return this.geometry.computeLineDistances(),this}onBeforeRender=e=>{const n=e.getViewport(PR);this.resolution.set(n.z,n.w)}}const PR=new ec;class cb extends lb{isLineGeometry=!0;type="LineGeometry";constructor(e){if(super(),e===void 0||e.length===0)return;let n;Array.isArray(e)&&typeof e[0]=="object"&&"x"in e[0]?n=new Float32Array(e.flatMap(o=>[o.x,o.y,o.z])):n=e instanceof Float32Array?e:new Float32Array(e);const r=Math.floor(n.length/3),s=Math.max(r-1,0),i=new Float32Array(s*6);for(let o=0;o<s;o++)i[o*6]=n[o*3],i[o*6+1]=n[o*3+1],i[o*6+2]=n[o*3+2],i[o*6+3]=n[o*3+3],i[o*6+4]=n[o*3+4],i[o*6+5]=n[o*3+5];this.setPositions(i)}}class OR extends zR{isLine2=!0;type="Line2";constructor(e=new cb,n=new kd){super(e,n)}}class Hi extends Jr{constructor(e=1,n=1,r=1){super();const s=1,i=1,o=1,a=[],l=[],c=[],u=[];let h=0;d("z","y","x",-1,-1,r,n,e,o,i),d("z","y","x",1,-1,r,n,-e,o,i),d("x","z","y",1,1,e,r,n,s,o),d("x","z","y",1,-1,e,r,-n,s,o),d("x","y","z",1,-1,e,n,r,s,i),d("x","y","z",-1,-1,e,n,-r,s,i);function d(f,m,p,y,g,b,v,x,k,C){const E=b/k,T=v/C,A=b/2,M=v/2,P=x/2,S=f==="x"?0:f==="y"?1:2,O=m==="x"?0:m==="y"?1:2,w=k+1,R=C+1,F=h;for(let D=0;D<R;D++){const te=D*T-M;for(let H=0;H<w;H++){const Q=H*E-A,N=S===0?Q*y:O===0?te*g:P,B=S===1?Q*y:O===1?te*g:P,le=S===2?Q*y:O===2?te*g:P,oe=S===0||O===0?0:x>0?1:-1,X=S===1||O===1?0:x>0?1:-1,ye=S===2||O===2?0:x>0?1:-1;l.push(N,B,le),c.push(oe,X,ye),u.push(H/k,1-D/C),h++}}for(let D=0;D<C;D++)for(let te=0;te<k;te++){const H=F+te+w*D,Q=F+te+w*(D+1),N=F+(te+1)+w*(D+1),B=F+(te+1)+w*D;a.push(H,Q,B,Q,N,B)}}this.setAttribute("position",new $e(new Float32Array(l),3)),this.setAttribute("normal",new $e(new Float32Array(c),3)),this.setAttribute("uv",new $e(new Float32Array(u),2)),this.setIndex(a)}}class sh extends Jr{constructor(e=1,n=1,r=1,s=1){super(),r=Math.floor(r),s=Math.floor(s);const i=r,o=s,a=i+1,l=o+1,c=e/i,u=n/o,h=[],d=[],f=[],m=[];for(let p=0;p<l;p++){const y=p*u-n/2;for(let g=0;g<a;g++){const b=g*c-e/2;d.push(b,-y,0),f.push(0,0,1),m.push(g/i,1-p/o)}}for(let p=0;p<o;p++)for(let y=0;y<i;y++){const g=y+a*p,b=y+a*(p+1),v=y+1+a*(p+1),x=y+1+a*p;h.push(g,b,x,b,v,x)}this.setAttribute("position",new $e(new Float32Array(d),3)),this.setAttribute("normal",new $e(new Float32Array(f),3)),this.setAttribute("uv",new $e(new Float32Array(m),2)),this.setIndex(h)}}class Lo extends ur{isMeshBasicMaterial=!0;color=new Qt(1,1,1);map=null;colorUniform;opacityUniform;mapUniform;constructor(e={}){super(),e.color!==void 0&&(this.color=typeof e.color=="number"?new Qt().setHex(e.color):e.color.clone()),e.map!==void 0&&(this.map=e.map),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.side!==void 0&&(this.side=e.side),e.precision!==void 0&&(this.precision=e.precision)}setup(e,n){this.colorUniform=e.materialUniform("materialColor","vec3",()=>this.color.toArray()),this.opacityUniform=e.materialUniform("materialOpacity","float",()=>this.opacity),this.map&&(this.mapUniform=e.sampler("map",()=>this.map))}buildFragmentBody(e){const n=Dt(this.colorNode,e)??this.colorUniform,r=Dt(this.opacityNode,e)??this.opacityUniform,s=Dt(this.uvNode,e)??e.uvVarying,i=this.mapUniform?n.mul(this.mapUniform.texture(s).rgb):n;return Ie(i,r)}}function $R(t,e){const n=[],r=[],s=[];e.traverseVisible(l=>{l instanceof yd?n.push(l):l instanceof bd?r.push(l):l instanceof q0&&s.push(l)});const i=t.materialUniform("ambientColor","vec3",()=>{let l=0,c=0,u=0;for(const h of n)l+=h.color.r*h.intensity,c+=h.color.g*h.intensity,u+=h.color.b*h.intensity;return[l,c,u]}),o=r.map((l,c)=>({color:t.materialUniform(`directionalColor${c}`,"vec3",()=>{const[u,h,d]=l.color.toArray();return[u*l.intensity,h*l.intensity,d*l.intensity]}),direction:t.materialUniform(`directionalDirection${c}`,"vec3",()=>l.getWorldPosition().sub(l.target.getWorldPosition()).normalize().toArray())})),a=s.map((l,c)=>({color:t.materialUniform(`pointColor${c}`,"vec3",()=>{const[u,h,d]=l.color.toArray();return[u*l.intensity,h*l.intensity,d*l.intensity]}),position:t.materialUniform(`pointPosition${c}`,"vec3",()=>l.getWorldPosition().toArray()),distance:t.materialUniform(`pointDistance${c}`,"float",()=>l.distance),decay:t.materialUniform(`pointDecay${c}`,"float",()=>l.decay)}));return{ambient:i,directionals:o,points:a}}function Gp(t,e,n,r,s,i,o,a){const l=r.add(n).normalize(),c=e.dot(r).clamp(1e-4,1),u=e.dot(l).clamp(1e-4,1),h=e.dot(n).clamp(1e-4,1),d=n.dot(l).clamp(1e-4,1),f=i.pow(4),m=u.pow(2),p=f.div(Op.mul(m.mul(f.sub(1)).add(1).pow(2))),y=c.mul(h.pow(2).mul(f.oneMinus()).add(f).sqrt()),g=h.mul(c.pow(2).mul(f.oneMinus()).add(f).sqrt()),b=y.add(g).reciprocal().mul(.5),v=a.add(a.oneMinus().mul(d.oneMinus().pow(5))),x=v.oneMinus().mul(o.oneMinus()),k=p.mul(b).mul(v);return t.div(Op).mul(x).add(k).mul(s).mul(c)}function LR(t,e,n,r){const s=e.distance(t).max(1e-4).toVar(),i=s.pow(r.negate()).toVar();return xt(n.greaterThan(0),()=>{const o=n.reciprocal().mul(s).pow(4).oneMinus().saturate().pow(2);i.assign(i.mul(o))}),i}class DR extends ur{isMeshStandardMaterial=!0;color=new Qt(1,1,1);roughness=1;metalness=0;emissive=new Qt(0,0,0);colorUniform;opacityUniform;roughnessUniform;metalnessUniform;emissiveUniform;lights;constructor(e={}){super(),e.color!==void 0&&(this.color=typeof e.color=="number"?new Qt().setHex(e.color):e.color.clone()),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.emissive!==void 0&&(this.emissive=typeof e.emissive=="number"?new Qt().setHex(e.emissive):e.emissive.clone()),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.side!==void 0&&(this.side=e.side),e.precision!==void 0&&(this.precision=e.precision)}setup(e,n){this.colorUniform=e.materialUniform("materialColor","vec3",()=>this.color.toArray()),this.opacityUniform=e.materialUniform("materialOpacity","float",()=>this.opacity),this.roughnessUniform=e.materialUniform("materialRoughness","float",()=>this.roughness),this.metalnessUniform=e.materialUniform("materialMetalness","float",()=>this.metalness),this.emissiveUniform=e.materialUniform("materialEmissive","vec3",()=>this.emissive.toArray()),this.lights=$R(e,n)}buildFragmentBody(e){const n=Dt(this.colorNode,e)??this.colorUniform,r=Dt(this.opacityNode,e)??this.opacityUniform,s=Dt(this.roughnessNode,e)??this.roughnessUniform,i=Dt(this.metalnessNode,e)??this.metalnessUniform,o=Dt(this.emissiveNode,e)??this.emissiveUniform,a=(Dt(this.normalNode,e)??e.normalWorld).normalize().toVar(),l=e.viewDirection.normalize().toVar(),c=ze(.04).mix(n,i).toVar(),u=ze(0).toVar();u.addAssign(o),u.addAssign(n.mul(this.lights.ambient));for(const h of this.lights.directionals){const d=h.direction.normalize();u.addAssign(Gp(n,a,l,d,h.color,s,i,c))}for(const h of this.lights.points){const d=h.position.sub(e.positionWorld).normalize(),f=LR(h.position,e.positionWorld,h.distance,h.decay);u.addAssign(Gp(n,a,l,d,h.color,s,i,c).mul(f))}return Ie(u,r)}}class tc extends md{isTexture=!0;name="";image=null;needsUpdate=!0;magFilter=Ap;minFilter=Ap;wrapS=Xc;wrapT=Xc;wrapR=Xc;userData={};constructor(e=null){super(),this.image=e}dispose(){this.dispatchEvent({type:"dispose"})}}class Yp extends tc{width;height;depth;format;type;constructor(e=null,n=1,r=1,s=1,i=xM,o=SM){super(),this.image=e,this.width=n,this.height=r,this.depth=s,this.format=i,this.type=o}}class NR{isWebGLRenderer=!0;canvas;gl;programs=new Map;geometryBuffers=new Map;attributeBuffers=new Map;bufferCapacities=new WeakMap;textures=new Map;renderTargets=new Map;clearColor=new Qt(0,0,0);clearAlpha=1;animationCallback=null;animationHandle=null;precision;constructor(e,n={}){this.canvas=e??document.createElement("canvas"),this.precision=n.precision??"highp";const r=this.canvas.getContext("webgl2",{antialias:n.antialias??!0,depth:n.depth??!0});if(!r)throw new Error("[RMSL/scene] WebGL2 is not available on this canvas");this.gl=r}setClearColor(e,n=1){typeof e=="number"?this.clearColor.setHex(e):this.clearColor.copy(e),this.clearAlpha=n}setSize(e,n){this.canvas.width=e,this.canvas.height=n}setAnimationLoop(e){if(this.animationCallback=e,e&&this.animationHandle===null){const n=r=>{if(!this.animationCallback){this.animationHandle=null;return}this.animationCallback(r),this.animationHandle=requestAnimationFrame(n)};this.animationHandle=requestAnimationFrame(n)}}render(e,n,r=null){const s=this.gl;e.updateMatrixWorld(!0),n.updateMatrixWorld(!0),n.projectionMatrixInverse.copy(n.projectionMatrix).invert(),r!==null?(s.bindFramebuffer(s.FRAMEBUFFER,this.renderTargetFramebuffer(r,s)),s.viewport(0,0,r.width,r.height)):(s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height));const[i,o,a]=this.clearColor.toArray();s.clearColor(i,o,a,this.clearAlpha),s.clear(s.COLOR_BUFFER_BIT|s.DEPTH_BUFFER_BIT),s.enable(s.DEPTH_TEST),e.traverseVisible(l=>{if(l.isMesh){const c=l;c.onBeforeRender?.(this,e,n),this.drawMesh(c,e,n)}})}getViewport(e=new ec){const n=this.gl;return e.set(0,0,n.drawingBufferWidth,n.drawingBufferHeight),e}renderTargetFramebuffer(e,n=this.gl){const r=this.renderTargets.get(e);if(r!==void 0&&r.width===e.width&&r.height===e.height)return r.framebuffer;r!==void 0&&this.deleteRenderTarget(e,r,n);const s=n.createFramebuffer(),i=n.createTexture();n.bindTexture(n.TEXTURE_2D,i),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,e.width,e.height,0,n.RGBA,n.UNSIGNED_BYTE,null),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.bindTexture(n.TEXTURE_2D,null);const o=n.createRenderbuffer();n.bindRenderbuffer(n.RENDERBUFFER,o),n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_COMPONENT24,e.width,e.height),n.bindRenderbuffer(n.RENDERBUFFER,null),n.bindFramebuffer(n.FRAMEBUFFER,s),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,i,0),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,o),n.bindFramebuffer(n.FRAMEBUFFER,null);const a={framebuffer:s,color:i,depth:o,width:e.width,height:e.height};return this.renderTargets.set(e,a),s}readPixels(e,n){const r=this.gl,s=n??new Uint8Array(e.width*e.height*4);return r.bindFramebuffer(r.READ_FRAMEBUFFER,this.renderTargetFramebuffer(e)),r.readPixels(0,0,e.width,e.height,r.RGBA,r.UNSIGNED_BYTE,s),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),s}readPixelsAsync(e,n){const r=this.gl,s=n??new Uint8Array(e.width*e.height*4),i=r.createBuffer();r.bindBuffer(r.PIXEL_PACK_BUFFER,i),r.bufferData(r.PIXEL_PACK_BUFFER,s.byteLength,r.STREAM_READ),r.bindFramebuffer(r.READ_FRAMEBUFFER,this.renderTargetFramebuffer(e)),r.readPixels(0,0,e.width,e.height,r.RGBA,r.UNSIGNED_BYTE,0),r.bindFramebuffer(r.READ_FRAMEBUFFER,null),r.bindBuffer(r.PIXEL_PACK_BUFFER,null);const o=r.fenceSync(r.SYNC_GPU_COMMANDS_COMPLETE,0);return r.flush(),new Promise((a,l)=>{const c=()=>{const u=r.clientWaitSync(o,0,0);if(u===r.TIMEOUT_EXPIRED){requestAnimationFrame(c);return}if(r.deleteSync(o),u===r.WAIT_FAILED){r.deleteBuffer(i),l(new Error("[RMSL/scene] readPixelsAsync: GPU sync wait failed"));return}r.bindBuffer(r.PIXEL_PACK_BUFFER,i),r.getBufferSubData(r.PIXEL_PACK_BUFFER,0,s),r.bindBuffer(r.PIXEL_PACK_BUFFER,null),r.deleteBuffer(i),a(s)};c()})}drawMesh(e,n,r){const s=e.material;if(!s.isNodeMaterial)return;const i=e.isInstancedMesh===!0,o=i&&e.instanceColor!==null;this.usedTextureUnits.clear();const a=this.ensureProgram(s,n,i,o),l=this.gl;l.useProgram(a.glProgram),this.setRenderState(s),this.uploadUniforms(a,e,r),this.bindGeometry(e,a,e.geometry);const c=e.geometry,u=i?e.count:c.instanceCount,h=e.drawRange;if(c.index){const d=Jc(c.index.array,!0),f=d instanceof Uint16Array?l.UNSIGNED_SHORT:l.UNSIGNED_INT,m=Number.isFinite(h.count)?h.count:d.length;l.drawElementsInstanced(l.TRIANGLES,m,f,h.start*d.BYTES_PER_ELEMENT,u)}else{const d=Number.isFinite(h.count)?h.count:c.attributes.position?.count??0;l.drawArraysInstanced(l.TRIANGLES,h.start,d,u)}}setRenderState(e){const n=this.gl;switch(e.side){case Qr.FrontSide:n.enable(n.CULL_FACE),n.cullFace(n.BACK);break;case Qr.BackSide:n.enable(n.CULL_FACE),n.cullFace(n.FRONT);break;default:n.disable(n.CULL_FACE);break}e.depthTest?n.enable(n.DEPTH_TEST):n.disable(n.DEPTH_TEST),n.depthMask(e.depthWrite),e.transparent||e.blending!==Vs.NormalBlending?(n.enable(n.BLEND),e.blending===Vs.AdditiveBlending?n.blendFunc(n.SRC_ALPHA,n.ONE):n.blendFunc(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA)):n.disable(n.BLEND)}uploadUniforms(e,n,r){const s=this.gl;for(const i of e.program.uniforms){const o=e.uniformLocations.get(i.node.name);if(o==null)continue;let a;i.scope==="camera"?a=IM(i.name,r):i.scope==="object"?a=zM(i.name,n):i.scope==="renderer"?a=$M(i.name,this.gl.drawingBufferWidth,this.gl.drawingBufferHeight):a=i.value?.({camera:r,mesh:n})??[],!(Array.isArray(a)&&a.length===0)&&this.setUniform(o,i.node._t,a)}for(const i of e.program.samplers){const o=i.texture(),a=e.uniformLocations.get(i.name);if(!o||a==null)continue;const l=this.bindTexture(o,i.type);s.uniform1i(a,l)}}setUniform(e,n,r){const s=this.gl;if(typeof r=="number"){switch(n){case"float":s.uniform1f(e,r);break;case"int":case"bool":s.uniform1i(e,r);break}return}switch(n){case"float":s.uniform1f(e,r[0]);break;case"int":s.uniform1i(e,r[0]);break;case"bool":s.uniform1i(e,r[0]);break;case"vec2":s.uniform2f(e,r[0],r[1]);break;case"vec3":s.uniform3f(e,r[0],r[1],r[2]);break;case"vec4":s.uniform4f(e,r[0],r[1],r[2],r[3]);break;case"ivec2":s.uniform2i(e,r[0],r[1]);break;case"ivec3":s.uniform3i(e,r[0],r[1],r[2]);break;case"ivec4":s.uniform4i(e,r[0],r[1],r[2],r[3]);break;case"mat2":s.uniformMatrix2fv(e,!1,r);break;case"mat3":s.uniformMatrix3fv(e,!1,r);break;case"mat4":s.uniformMatrix4fv(e,!1,r);break}}bindTexture(e,n){const r=this.gl,s=n.endsWith("3D"),i=s?r.TEXTURE_3D:r.TEXTURE_2D,o=X0(n),a=this.nextTextureUnit();r.activeTexture(r.TEXTURE0+a);let l=this.textures.get(e);if(!l||e.needsUpdate){l||(l=r.createTexture(),this.textures.set(e,l),e.addEventListener("dispose",this.onTextureDispose)),r.bindTexture(i,l);const c=NM(e,n);r.texParameteri(i,r.TEXTURE_WRAP_S,tu(r,c.wrapS)),r.texParameteri(i,r.TEXTURE_WRAP_T,tu(r,c.wrapT)),s&&r.texParameteri(i,r.TEXTURE_WRAP_R,tu(r,c.wrapR)),r.texParameteri(i,r.TEXTURE_MIN_FILTER,qp(r,c.minFilter)),r.texParameteri(i,r.TEXTURE_MAG_FILTER,qp(r,c.magFilter));const u=e.image;if(ArrayBuffer.isView(u)){const h=e.width??1,d=e.height??1;if(o){const f=FM(e)===1,{internalFormat:m,format:p,type:y}=FR(r,n.startsWith("isampler"),u,f);if(s){const g=e.depth??1;r.texImage3D(i,0,m,h,d,g,0,p,y,u)}else r.texImage2D(i,0,m,h,d,0,p,y,u)}else if(s){const f=e.depth??1;r.texImage3D(i,0,r.RGBA,h,d,f,0,r.RGBA,r.UNSIGNED_BYTE,u)}else r.texImage2D(i,0,r.RGBA,h,d,0,r.RGBA,r.UNSIGNED_BYTE,u)}else u!=null&&!s&&!o&&r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,u);e.needsUpdate=!1}return r.bindTexture(i,l),a}onTextureDispose=e=>{const n=e.target,r=this.textures.get(n);r&&this.gl.deleteTexture(r),this.textures.delete(n),n.removeEventListener("dispose",this.onTextureDispose)};onGeometryDispose=e=>{const n=e.target,r=this.geometryBuffers.get(n);if(r){for(const s of r.attributes.values())this.gl.deleteBuffer(s);r.index&&this.gl.deleteBuffer(r.index)}this.geometryBuffers.delete(n),n.removeEventListener("dispose",this.onGeometryDispose)};nextTextureUnit(){const e=this.gl,n=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS);for(let r=0;r<n;r++)if(!this.usedTextureUnits.has(r))return this.usedTextureUnits.add(r),r;return 0}usedTextureUnits=new Set;ensureProgram(e,n,r,s){const i=DM(LM(n),r,s);let o=this.programs.get(e);const a=o?.get(i);if(a&&!e.needsUpdate)return a;const l=e.build(n,{instancing:r,instancingColor:s}),c=this.gl,u=RM(e,this.precision),h=this.compileShader(Np.vertex(l.vertexRoot,{precision:u}),c.VERTEX_SHADER),d=this.compileShader(Np.fragment(l.fragmentRoot,{precision:u}),c.FRAGMENT_SHADER),f=c.createProgram();if(c.attachShader(f,h),c.attachShader(f,d),c.linkProgram(f),!c.getProgramParameter(f,c.LINK_STATUS))throw new Error(`[RMSL/scene] program link failed:
${c.getProgramInfoLog(f)}`);const m=new Map;for(const g of l.uniforms)m.set(g.node.name,c.getUniformLocation(f,g.node.name));for(const g of l.samplers)m.set(g.name,c.getUniformLocation(f,g.name));const p=new Map;for(const g of l.attributes)p.set(g.node.name,c.getAttribLocation(f,g.node.name));const y={program:l,glProgram:f,uniformLocations:m,attributeLocations:p};return o||(o=new Map,this.programs.set(e,o)),o.set(i,y),e.needsUpdate=!1,y}compileShader(e,n){const r=this.gl,s=r.createShader(n);if(r.shaderSource(s,e),r.compileShader(s),!r.getShaderParameter(s,r.COMPILE_STATUS))throw new Error(`[RMSL/scene] shader compile failed:
${r.getShaderInfoLog(s)}
---
${e}`);return s}bindGeometry(e,n,r){const s=this.gl;let i=this.geometryBuffers.get(r);i||(i={attributes:new Map,index:null,needsUpload:!0},this.geometryBuffers.set(r,i),r.addEventListener("dispose",this.onGeometryDispose));const o=i.needsUpload||Object.values(r.attributes).some(a=>a.needsUpdate);for(const a of n.program.attributes){const l=PM(e,r,a.name),c=n.attributeLocations.get(a.node.name);if(!l||c==null)continue;const u=r.attributes[a.name]!==void 0;let h=u?i.attributes.get(a.name):this.attributeBuffers.get(l);const d=h===void 0;if(h||(h=s.createBuffer(),u?i.attributes.set(a.name,h):this.attributeBuffers.set(l,h)),d||l.needsUpdate){const g=Jc(l.array);h=this.uploadSlice(s,s.ARRAY_BUFFER,h,g,this.uploadRangeOf(g,l,d)),u?i.attributes.set(a.name,h):this.attributeBuffers.set(l,h),l.needsUpdate=!1}s.bindBuffer(s.ARRAY_BUFFER,h);const f=a.node._t==="mat4"?4:1,m=l.itemSize/f,p=Z0[UM(l,m)],y=l.itemSize*p.bytes;for(let g=0;g<f;g++)s.enableVertexAttribArray(c+g),s.vertexAttribPointer(c+g,m,s[p.gl],p.normalized,y,m*g*p.bytes),s.vertexAttribDivisor(c+g,a.stepMode==="instance"?1:0)}if(r.index){const a=i.index===null,l=i.index??(i.index=s.createBuffer());if(a||o||r.index.needsUpdate){const c=Jc(r.index.array,!0);i.index=this.uploadSlice(s,s.ELEMENT_ARRAY_BUFFER,l,c,this.uploadRangeOf(c,r.index,a)),r.index.needsUpdate=!1}s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,i.index)}i.needsUpload=!1}uploadRangeOf(e,n,r){if(r||n.updateRange.count===-1)return{byteOffset:0,byteEnd:e.byteLength};const s=e.BYTES_PER_ELEMENT,i=Math.min(e.byteLength,Math.max(0,n.updateRange.offset)*s),o=Math.min(e.byteLength,i+Math.max(0,n.updateRange.count)*s);return{byteOffset:i,byteEnd:o}}uploadSlice(e,n,r,s,{byteOffset:i,byteEnd:o}){e.bindBuffer(n,r);const a=this.bufferCapacities.get(r);if(a===void 0)return e.bufferData(n,s,e.STATIC_DRAW),this.bufferCapacities.set(r,s.byteLength),r;if(o>a){const l=Math.max(o,a*2),c=e.createBuffer();return e.bindBuffer(n,c),e.bufferData(n,l,e.STATIC_DRAW),e.bufferSubData(n,0,s),e.deleteBuffer(r),this.bufferCapacities.set(c,l),c}if(o>i){const l=s;e.bufferSubData(n,i,l.subarray(i/l.BYTES_PER_ELEMENT,o/l.BYTES_PER_ELEMENT))}return r}deleteRenderTarget(e,n,r=this.gl){r.deleteFramebuffer(n.framebuffer),r.deleteTexture(n.color),r.deleteRenderbuffer(n.depth),this.renderTargets.delete(e)}dispose(){const e=this.gl;for(const n of this.programs.values())for(const r of n.values())e.deleteProgram(r.glProgram);for(const[n,r]of this.geometryBuffers){for(const s of r.attributes.values())e.deleteBuffer(s);r.index&&e.deleteBuffer(r.index),n.removeEventListener("dispose",this.onGeometryDispose)}for(const n of this.attributeBuffers.values())e.deleteBuffer(n);for(const[n,r]of this.textures)e.deleteTexture(r),n.removeEventListener("dispose",this.onTextureDispose);for(const[n,r]of this.renderTargets)this.deleteRenderTarget(n,r);this.programs.clear(),this.geometryBuffers.clear(),this.attributeBuffers.clear(),this.textures.clear()}}function tu(t,e){switch(e){case"repeat":return t.REPEAT;case"mirror":return t.MIRRORED_REPEAT;default:return t.CLAMP_TO_EDGE}}function qp(t,e){return e==="nearest"?t.NEAREST:t.LINEAR}function FR(t,e,n,r){const s=n.BYTES_PER_ELEMENT??1;return e?r?{internalFormat:t.R8I,format:t.RED_INTEGER,type:t.BYTE}:s===1?{internalFormat:t.RGBA8I,format:t.RGBA_INTEGER,type:t.BYTE}:s===2?{internalFormat:t.RGBA16I,format:t.RGBA_INTEGER,type:t.SHORT}:{internalFormat:t.RGBA32I,format:t.RGBA_INTEGER,type:t.INT}:r?{internalFormat:t.R8UI,format:t.RED_INTEGER,type:t.UNSIGNED_BYTE}:s===1?{internalFormat:t.RGBA8UI,format:t.RGBA_INTEGER,type:t.UNSIGNED_BYTE}:s===2?{internalFormat:t.RGBA16UI,format:t.RGBA_INTEGER,type:t.UNSIGNED_SHORT}:{internalFormat:t.RGBA32UI,format:t.RGBA_INTEGER,type:t.UNSIGNED_INT}}class BR{isRenderTarget=!0;width;height;constructor(e=1,n=1){this.width=e,this.height=n}}const UR={1:{top:"grass_top",side:"dirt_grass",bottom:"dirt"},2:{top:"dirt",side:"dirt",bottom:"dirt"},4:{top:"stone",side:"stone",bottom:"stone"},5:{top:"snow",side:"snow",bottom:"snow"},6:{top:"lava",side:"lava",bottom:"lava"},7:{top:"trunk_top",side:"trunk_side",bottom:"trunk_bottom"},8:{top:"leaves",side:"leaves",bottom:"leaves"},25:{top:"brick_red",side:"brick_red",bottom:"brick_red"},26:{top:"wood",side:"wood",bottom:"wood"},27:{top:"ice",side:"ice",bottom:"ice"},28:{top:"greystone",side:"greystone",bottom:"greystone"},29:{top:"lava",side:"lava",bottom:"lava"},16:{top:"lava",side:"lava",bottom:"lava"},17:{top:"lava",side:"lava",bottom:"lava"},18:{top:"lava",side:"lava",bottom:"lava"},19:{top:"lava",side:"lava",bottom:"lava"},20:{top:"lava",side:"lava",bottom:"lava"},21:{top:"lava",side:"lava",bottom:"lava"},22:{top:"lava",side:"lava",bottom:"lava"},24:{top:"lava",side:"lava",bottom:"lava"}},ub=t=>{const e=new DOMParser().parseFromString(t,"application/xml"),n=new Map,r=e.querySelectorAll("SubTexture");for(const s of r){const i=s.getAttribute("name");i!==null&&n.set(i.replace(/\.png$/i,""),{x:Number(s.getAttribute("x")),y:Number(s.getAttribute("y")),w:Number(s.getAttribute("width")),h:Number(s.getAttribute("height"))})}return n},HR=(t,e,n)=>{const r=[...t.values()],s=r[0];return s===void 0||!r.every(o=>o.w===s.w&&o.h===s.h&&o.x%s.w===0&&o.y%s.h===0)?null:{columns:Math.round(e/s.w),tilePixels:[s.w,s.h],sheetPixels:[e,n]}},nu=(t,e)=>Math.round(t.y/e.tilePixels[1])*e.columns+Math.round(t.x/e.tilePixels[0]),jR=(t,e,n)=>{const r=[],s={...UR,...n};for(const i of Object.keys(s)){const o=s[Number(i)],a=l=>{const c=t.get(l);if(c===void 0)throw new Error(`[atlas] missing subtexture "${l}"`);return c};r.push({id:Number(i),top:nu(a(o.top),e),side:nu(a(o.side),e),bottom:nu(a(o.bottom),e)})}return r},WR=async t=>{const e=await fetch(t);if(!e.ok)throw new Error(`[atlas] failed to load "${t}": ${e.status}`);const n=await createImageBitmap(await e.blob());return{texture:new tc(n),width:n.width,height:n.height}},He=24,ih="/big-mesh-studios/voxelscape/spritesheets/spritesheet_items.png",Xp="/big-mesh-studios/voxelscape/spritesheets/spritesheet_items.xml",VR=1024,GR=1024,Zp=100,YR={r:0,g:0,b:0,a:255},qR=32,XR=(t,e,n)=>{const r=new Uint8Array(n.w*n.h*4);for(let s=0;s<n.h;s++)for(let i=0;i<n.w;i++){const o=(n.y+s)*t.width+(n.x+i),a=s*n.w+i<<2;if(t.channels===1&&e!==void 0){const l=e[t.data[o]];r[a]=l[0],r[a+1]=l[1],r[a+2]=l[2],r[a+3]=l.length>3?l[3]:255}else{const l=o<<2;r[a]=t.data[l],r[a+1]=t.data[l+1],r[a+2]=t.data[l+2],r[a+3]=t.data[l+3]}}return{width:n.w,height:n.h,data:r}},ZR=t=>{const{width:e,height:n,data:r}=t,s=(M,P)=>r[(P*e+M)*4+3];let i=e,o=n,a=-1,l=-1;for(let M=0;M<n;M++)for(let P=0;P<e;P++)s(P,M)<Zp||(P<i&&(i=P),P>a&&(a=P),M<o&&(o=M),M>l&&(l=M));a<0&&(i=0,o=0,a=e-1,l=n-1);const c=a-i+1,u=l-o+1,h=(M,P)=>{const S=i+Math.floor(M*c/He),O=i+Math.floor((M+1)*c/He),w=o+Math.floor(P*u/He),R=o+Math.floor((P+1)*u/He);let F=0,D=0,te=0,H=0;for(let Q=w;Q<R;Q++)for(let N=S;N<O;N++)s(N,Q)<Zp||(F+=r[(Q*e+N)*4],D+=r[(Q*e+N)*4+1],te+=r[(Q*e+N)*4+2],H++);return H===0?null:{r:Math.round(F/H),g:Math.round(D/H),b:Math.round(te/H)}},d=M=>Math.min(255,Math.round(M/16)*16),f=new Map,m=[];for(let M=0;M<He;M++)for(let P=0;P<He;P++){const S=h(P,M);if(S===null)continue;m.push({ox:P,oy:M,colour:S});const O=`${d(S.r)},${d(S.g)},${d(S.b)}`;f.set(O,(f.get(O)??0)+1)}const p=[YR];for(const M of[...f.entries()].sort((P,S)=>S[1]-P[1]).slice(0,qR-1).map(([P])=>P)){const[P,S,O]=M.split(",").map(Number);p.push({r:P,g:S,b:O,a:255})}const y=({r:M,g:P,b:S})=>{let O=0,w=1/0;for(let R=0;R<p.length;R++){const F=p[R].r-M,D=p[R].g-P,te=p[R].b-S,H=F*F+D*D+te*te;H<w&&(w=H,O=R)}return O},g=gn.create(He,He);for(const{ox:M,oy:P,colour:S}of m)g.data[P*He+M]=y(S);const b=new Uint8Array(g.data),v=(M,P)=>M>=0&&P>=0&&M<He&&P<He&&b[P*He+M]!==gn.EMPTY;for(let M=0;M<He;M++)for(let P=0;P<He;P++)if(b[M*He+P]===gn.EMPTY)for(let S=M-1;S<=M+1;S++)for(let O=P-1;O<=P+1;O++)v(O,S)&&(g.data[M*He+P]=0);const x=gn.create(He,He);for(let M=0;M<He;M++)for(let P=0;P<He;P++)x.data[M*He+(He-1-P)]=g.data[M*He+P];const k=gn.create(He,He),C=gn.create(He,He),E=gn.create(He,He),T=gn.create(He,He);for(let M=0;M<He;M++)k.data[M*He+12]=0,C.data[M*He+11]=0,E.data[12*He+M]=0,T.data[11*He+M]=0;return{model:{sides:{front:g,back:x,left:k,right:C,top:E,bottom:T},palette:p,dimensions:{width:He,height:He,depth:He}},trim:{x:i,y:o,w:c,h:u}}},Jp=async t=>{const[e,n]=await Promise.all([fetch(ih),fetch(Xp)]);if(!e.ok)throw new Error(`failed to load "${ih}": ${e.status}`);if(!n.ok)throw new Error(`failed to load "${Xp}": ${n.status}`);const s=ub(await n.text()).get(t);if(s===void 0)throw new Error(`the items spritesheet has no "${t}"`);const i=Qh(new Uint8Array(await e.arrayBuffer()));if(i.depth!==8)throw new Error("the items spritesheet is not an 8-bit png");const{model:o,trim:a}=ZR(XR(i,i.palette,s));return{model:o,bbox:{x:s.x+a.x,y:s.y+a.y,w:a.w,h:a.h}}},ru=46,JR=t=>{const e=ru/Math.max(t.w,t.h),n=t.w*e,r=t.h*e;return{"background-image":`url("${ih}")`,"background-repeat":"no-repeat","background-size":`${VR*e}px ${GR*e}px`,"background-position":`${(ru-n)/2-t.x*e}px ${(ru-r)/2-t.y*e}px`}};var QR=de("<div><div><div></div><div></div></div><div><div>"),KR=de("<div><!><!>"),su=de("<span>");const eI=()=>{const{inventory:t,editStatus:e,target:n,icons:r,scriptItem:s,npcAim:i}=cr(),o=Kl("(any-pointer: coarse)"),[a,l]=ge(t.items()),[c,u]=ge(t.selectedId),h=()=>{l(t.items()),u(t.selectedId)};t.onChange=h,bn(()=>{t.onChange===h&&(t.onChange=null)});const d=()=>{if(i()?.action==="use")return fn.strikeable;const v=n();if(v!==null)return v.kind==="actor"?fn.strikeable:fn.voxel};var f=QR(),m=f.firstChild,p=m.firstChild,y=p.nextSibling,g=m.nextSibling,b=g.firstChild;return ne(g,re(on,{get each(){return a()},children:v=>{const x=()=>r()[v.id];var k=KR(),C=k.firstChild,E=C.nextSibling;return k.$$pointerdown=()=>t.setSelected(v.id),ne(k,(()=>{var T=Zt(()=>x()!==void 0);return()=>T()?(()=>{var A=su();return he(()=>({e:fn.icon,t:JR(x())}),({e:M,t:P},S)=>{q(A,M,S?.e),Dh(A,P,S?.t)}),A})():(()=>{var A=su();return ne(A,()=>v.name[0]),he(()=>fn.name,(M,P)=>{q(A,M,P)}),A})()})(),C),ne(k,(()=>{var T=Zt(()=>!!v.stackable);return()=>T()?(()=>{var A=su();return ne(A,()=>v.count),he(()=>fn.count,(M,P)=>{q(A,M,P)}),A})():v.stackable})(),E),he(()=>({e:[fn.item,v.id===c()&&fn.active],t:v.name}),({e:T,t:A},M)=>{q(k,T,M?.e),A!==M?.t&&ut(k,"title",A)}),k}}),b),ne(b,()=>e()||(s()!==null?`holding ${s().name} — ${o()?"tap":"press E"} to use`:o()?"hold world to dig  •  tap to strike":"click to strike  •  right-click to use")),he(()=>({e:fn.hud,t:[fn.crosshair,d()],a:fn["vertical-stroke"],o:fn["horizontal-stroke"],i:fn.hotbar,n:fn.status}),({e:v,t:x,a:k,o:C,i:E,n:T},A)=>{q(f,v,A?.e),q(m,x,A?.t),q(p,k,A?.a),q(y,C,A?.o),q(g,E,A?.i),q(b,T,A?.n)}),f};Ir(["pointerdown"]);const tI="_health_19jmo_1",nI="_heart_19jmo_15",rI="_hitFlash_19jmo_39",yr={health:tI,"on-coarse":"_on-coarse_19jmo_9",heart:nI,"heart-outline":"_heart-outline_19jmo_21","heart-red":"_heart-red_19jmo_27","heart-empty":"_heart-empty_19jmo_31","heart-glint":"_heart-glint_19jmo_35",hitFlash:rI},Va=2,sI=3,Qp=.5,iI=.5,oI=.5,Kp=(t,e)=>{const n=Math.ceil(e/Va),r=Math.max(0,Math.min(e,Math.floor(t))),s=[];let i=r;for(let o=0;o<n;o++)i>=Va?(s.push(2),i-=Va):i>0?(s.push(1),i=0):s.push(0);return s};class aI{onChange=null;maxHp=sI*Va;hp=this.maxHp;dead=!1;guarding=!1;onFallDone;fallSeconds=0;fallDone=!1;constructor(e={}){this.onFallDone=e.onFallDone}setGuarding(e){this.guarding=e}takeDamage(e){const n=this.guarding?Math.ceil(e*oI):e,r=this.hp;this.hp=Math.max(0,this.hp-n);const s=r-this.hp;return s>0&&(this.emit(),r>0&&this.hp===0&&(this.dead=!0,this.fallSeconds=0,this.fallDone=!1)),s}kill(){this.dead||(this.hp!==0&&(this.hp=0,this.emit()),this.dead=!0,this.fallSeconds=0,this.fallDone=!1)}heal(e){const n=Math.min(this.maxHp,this.hp+e);n!==this.hp&&(this.hp=n,this.emit())}get fallProgress(){return Math.min(1,this.fallSeconds/Qp)}tick(e){this.dead&&(this.fallSeconds+=e,!this.fallDone&&this.fallSeconds>=Qp+iI&&(this.fallDone=!0,this.onFallDone?.()))}respawn(){this.dead=!1,this.guarding=!1,this.fallSeconds=0,this.fallDone=!1,this.hp=this.maxHp,this.emit()}emit(){this.onChange?.()}}var lI=de('<svg viewBox="0 0 32 32"aria-hidden=true><path d="M16 28 C 6 22, 0 16, 0 10 C 0 4.5, 4.5 1, 8.5 1 C 11 1, 14 2.5, 16 6 C 18 2.5, 21 1, 23.5 1 C 27.5 1, 32 4.5, 32 10 C 32 16, 26 22, 16 28 Z"></path><path d="M16 28 C 6 22, 0 16, 0 10 C 0 4.5, 4.5 1, 8.5 1 C 11 1, 14 2.5, 16 6 L 16 28 Z"></path><path d="M16 6 C 18 2.5, 21 1, 23.5 1 C 27.5 1, 32 4.5, 32 10 C 32 16, 26 22, 16 28 L 16 6 Z">'),cI=de("<svg><circle cx=10 cy=7 r=1.8></svg>",2),em=de("<div>");const uI=500,hI=t=>(()=>{var e=lI(),n=e.firstChild,r=n.nextSibling,s=r.nextSibling;return ne(e,(()=>{var i=Zt(()=>t.fill>=1);return()=>i()&&(()=>{var o=cI();return he(()=>yr["heart-glint"],(a,l)=>{q(o,a,l)}),o})()})(),null),he(()=>({e:yr.heart,t:yr["heart-outline"],a:t.fill>=1?yr["heart-red"]:yr["heart-empty"],o:t.fill>=2?yr["heart-red"]:yr["heart-empty"]}),({e:i,t:o,a,o:l},c)=>{q(e,i,c?.e),q(n,o,c?.t),q(r,a,c?.a),q(s,l,c?.o)}),e})(),dI=()=>{const{health:t}=cr(),e=Kl("(any-pointer: coarse)"),[n,r]=ge(Kp(t.hp,t.maxHp)),[s,i]=ge([]);let o=t.hp,a=0;const l=()=>{if(t.hp<o){const c=a++;i(u=>[...u,c]),setTimeout(()=>i(u=>u.filter(h=>h!==c)),uI)}o=t.hp,r(Kp(t.hp,t.maxHp))};return t.onChange=l,bn(()=>{t.onChange===l&&(t.onChange=null)}),[(()=>{var c=em();return ne(c,re(on,{get each(){return n()},children:u=>re(hI,{fill:u})})),he(()=>[yr.health,e()&&yr["on-coarse"]],(u,h)=>{q(c,u,h)}),c})(),re(on,{get each(){return s()},children:()=>(()=>{var c=em();return he(()=>yr.hitFlash,(u,h)=>{q(c,u,h)}),c})()})]},fI="_panel_1cusw_1",pI="_row_1cusw_8",mI="_rowDim_1cusw_9",gI="_value_1cusw_21",Ga={panel:fI,row:pI,rowDim:mI,value:gI};var yI=de("<div><span></span><span>"),bI=de("<div><!><!><!><!><!><!><!><!><!>");const vI=250,ga=t=>(t/1048576).toFixed(1),Pr=t=>(()=>{var e=yI(),n=e.firstChild,r=n.nextSibling;return ne(n,()=>t.name),ne(r,()=>t.value),he(()=>({e:t.dim===!0?Ga.rowDim:Ga.row,t:Ga.value}),({e:s,t:i},o)=>{q(e,s,o?.e),q(r,i,o?.t)}),e})(),wI=()=>{const{player:t,stats:e}=cr(),[n,r]=ge({fps:0,worst:0}),[s,i]=ge(e()),[o,a]=ge({x:0,y:0,z:0});Xr(()=>{let v=0,x=performance.now(),k=x,C=0,E=0;const T=()=>{const A=performance.now(),M=A-x;if(x=A,C++,C>1&&(E=Math.max(E,M)),A-k>=vI){r({fps:C*1e3/(A-k),worst:E}),i(e());const P=t.position;a({x:Math.round(P.x),y:Math.round(P.y),z:Math.round(P.z)}),k=A,C=0,E=0}v=requestAnimationFrame(T)};return v=requestAnimationFrame(T),()=>cancelAnimationFrame(v)});const l=()=>s().voxelBytes+s().mergedGeometryBytes+s().blockGeometryBytes;var c=bI(),u=c.firstChild,h=u.nextSibling,d=h.nextSibling,f=d.nextSibling,m=f.nextSibling,p=m.nextSibling,y=p.nextSibling,g=y.nextSibling,b=g.nextSibling;return ne(c,re(Pr,{name:"frame",get value(){return`${n().fps.toFixed(0)} fps  worst ${n().worst.toFixed(1)}ms`}}),u),ne(c,re(Pr,{name:"heap",get value(){return Zt(()=>s().heapBytes===void 0)()?"not said":`${ga(s().heapBytes)} MiB`}}),h),ne(c,re(Pr,{name:"resident",get value(){return`${ga(l())} MiB`}}),d),ne(c,re(Pr,{name:"voxels + light",get value(){return ga(s().voxelBytes)},dim:!0}),f),ne(c,re(Pr,{name:"geometry",get value(){return ga(s().mergedGeometryBytes+s().blockGeometryBytes)},dim:!0}),m),ne(c,re(Pr,{name:"window",get value(){return`${s().blocks} blocks  r${s().chunkRadius}`}}),p),ne(c,re(Pr,{name:"drawing",get value(){return`${(s().triangles/1e3).toFixed(0)}k triangles`}}),y),ne(c,re(Pr,{name:"waiting",get value(){return`${s().fillsPending} fills  ${s().meshesPending} meshes`}}),g),ne(c,re(Pr,{name:"at",get value(){return`${o().x}  ${o().y}  ${o().z}`}}),b),he(()=>Ga.panel,(v,x)=>{q(c,v,x)}),c},_I="_screen_1snf5_1",xI="_spinner_1snf5_20",kI="_track_1snf5_41",SI="_bar_1snf5_49",ko={screen:_I,spinner:xI,track:kI,bar:SI},EI="_stack_1m3p6_1",AI="_toast_1m3p6_14",hb={stack:EI,toast:AI};var TI=de("<div>"),CI=de("<div><!><!>");let MI=0;const Sl=t=>(()=>{var e=TI();return ne(e,()=>t.children),he(()=>hb.toast,(n,r)=>{q(e,n,r)}),e})();function RI(){const[t,e]=ge([]);function n(r){e(s=>s.filter(i=>i.id!==r))}return{show(r,s){const i=MI++;return e(o=>[...o,{id:i,content:r}]),s!==void 0&&setTimeout(()=>n(i),s),()=>n(i)},Stack(r){var s=CI(),i=s.firstChild,o=i.nextSibling;return ne(s,()=>r.children,i),ne(s,re(on,{get each(){return t()},children:a=>re(Sl,{get children(){return a.content()}})}),o),he(()=>hb.stack,(a,l)=>{q(s,a,l)}),s}}}var II=de("<div><div>generating terrain</div><div>"),zI=de("<div><div>"),PI=de("<span> blocks to go");const OI=()=>{const{loading:t}=cr();return re(Ne,{get when(){return!t().spawnDrawn},get children(){var e=II(),n=e.firstChild,r=n.nextSibling;return he(()=>({e:ko.screen,t:ko.title,a:ko.spinner}),({e:s,t:i,a:o},a)=>{q(e,s,a?.e),q(n,i,a?.t),q(r,o,a?.a)}),e}})},$I=()=>{const{loading:t}=cr(),e=()=>`${t().drawn/t().total*100}%`,n=()=>t().total-t().drawn;return re(Ne,{get when(){return Zt(()=>!!t().spawnDrawn)()?n()>0:t().spawnDrawn},get children(){return re(Sl,{get children(){return[(()=>{var r=zI(),s=r.firstChild;return he(()=>({e:ko.track,t:ko.bar,a:e()}),({e:i,t:o,a},l)=>{q(r,i,l?.e),q(s,o,l?.t),a!==l?.a&&Rt(s,"width",a)}),r})(),(()=>{var r=PI(),s=r.firstChild;return ne(r,n,s),r})()]}})}})},LI=16384,DI=1e3;class NI{constructor(e,n,r=DI){this.probe=e,this.source=n,this.waitMs=r}probe;source;waitMs;startedAt;startedOn="";name="";marks=[];events=[];startPicture;setup={};wanted=[];get recording(){return this.startedAt!==void 0}get marked(){return this.marks.length}start(e){return this.name=e,this.startedAt=performance.now(),this.startedOn=new Date().toISOString(),this.marks=[],this.events=[],this.setup=El(this.source.setup()),this.probe.arm(LI),this.startPicture=void 0,this.wantPicture().then(n=>{this.startPicture=n}),this.setup}mark(e){if(this.startedAt===void 0)return;const n={at:(performance.now()-this.startedAt)/1e3,note:e,pose:this.source.pose()};this.marks.push(n),this.wantPicture().then(r=>{n.picture=r})}event(e,n={}){if(this.startedAt===void 0)return;const r={at:(performance.now()-this.startedAt)/1e3,kind:e,...n,pose:this.source.pose()};this.events.push(r),e==="death"&&this.wantPicture().then(s=>{r.picture=s})}wantPicture(){return new Promise(e=>{let n=!1;const r=s=>{n||(n=!0,e(s))};this.wanted.push(r),setTimeout(()=>{this.wanted=this.wanted.filter(s=>s!==r),r(void 0)},this.waitMs)})}takePicture(e){const n=this.wanted;if(n.length===0)return;this.wanted=[];let r;try{r=e.toDataURL("image/png")}catch{}for(const s of n)s(r)}async snap(e){const n=El(this.source.setup()),r=this.source.pose(),s=await this.wantPicture();return{name:e,startedAt:new Date().toISOString(),seconds:0,setup:n,startPicture:s,marks:[{at:0,note:e,pose:r,picture:s}],events:[],frames:this.probe.drain()}}async stop(){if(this.startedAt===void 0)return;const e=await this.wantPicture(),n=(performance.now()-this.startedAt)/1e3,r=this.probe.drain();return this.probe.disarm(),this.startedAt=void 0,{name:this.name,startedAt:this.startedOn,seconds:n,setup:this.setup,startPicture:this.startPicture,endPicture:e,marks:this.marks,events:this.events,frames:r}}}const El=t=>typeof t=="number"&&!Number.isFinite(t)?t>0?"Infinity":"-Infinity":Array.isArray(t)?t.map(El):t!==null&&typeof t=="object"?Object.fromEntries(Object.entries(t).map(([e,n])=>[e,El(n)])):t,db=t=>t==null?"unset":Array.isArray(t)?t.join(", "):typeof t=="object"?Object.entries(t).map(([e,n])=>`${e} ${db(n)}`).join(", "):String(t),FI=t=>Object.entries(t).map(([e,n])=>`${e}: ${db(n)}`).join(`
`);function BI(t){const{oauth:e,identity:n,store:r}=t;let s={status:"unknown",did:null,error:null},i,o;const a=u=>{s={...s,...u},t.onChange?.(s)},l=u=>a({status:"error",error:u instanceof Error?u.message:String(u)}),c=async u=>{i=await r.adopt({did:u,resolveService:h=>n.service(h)}),a({status:"connected",did:i.did,error:null}),t.onConnected?.(i.did)};return{get state(){return s},get repoClient(){return i?.client},restore(){return o??=(async()=>{try{a({status:"connecting",error:null}),await e.configureOAuthClient();const[u]=r.stored();if(u===void 0){a({status:"anonymous"});return}await c(u)}catch(u){l(u)}})(),o},async signIn(u){const h=u.trim().replace(/^@/,"");if(!hx(h)){a({status:s.did===null?"error":"connected",error:`"${u}" is not a handle or an account identifier`});return}try{a({status:"connecting",error:null}),await e.configureOAuthClient(),await c(await e.signInPopup({identifier:h}))}catch(d){l(d)}},async signOut(){await i?.end().catch(()=>{}),i=void 0,o=void 0,a({status:"anonymous",did:null,error:null}),t.onSignedOut?.()},dispose(){i=void 0}}}const fb=()=>{const t=globalThis.navigator?.locks;if(t===void 0)throw new Error("web locks api is unavailable, a secure context is required");return t},tm="2",UI=1e4,Ji=(t,e)=>t.expiresAt!==null&&e>t.expiresAt,HI=({name:t})=>{const e=new AbortController,n=e.signal,r=new BroadcastChannel(`${t}:sync`);n.addEventListener("abort",()=>r.close());const s=`${t}:version`;let i;try{i=localStorage.getItem(s)===tm}catch{i=!0}const o=(l,c,u=!1)=>{const h=`${t}:${l}:`,d=`${t}:${l}`,f=new Map,m=new Set;let p=0;const y=E=>{for(const T of m)T(E)},g=()=>{if(n.aborted)throw new Error("store closed")},b=E=>{let T;try{T=localStorage.getItem(h+E)}catch{return}if(T!==null)try{const A=JSON.parse(T);return A===null||typeof A!="object"?void 0:{...A,revision:A.revision??0}}catch{return}},v=E=>{g();const T=b(E),A=f.get(E);return A===void 0?T:T===void 0||A.revision>T.revision?A.envelope:T},x=(E,T,A)=>{try{r.postMessage({store:l,key:E,envelope:T,revision:A})}catch{}},k=(E,T,A)=>{if(T===null){f.delete(E),y(E);return}const M=f.get(E);M!==void 0&&M.revision>=A||(f.set(E,{envelope:T,revision:A}),y(E))};r.addEventListener("message",E=>{const T=E.data;T!==null&&typeof T=="object"&&T.store===l&&k(T.key,T.envelope,T.revision)},{signal:n}),globalThis.addEventListener("storage",E=>{if(E.key===null||!E.key.startsWith(h))return;const T=E.key.slice(h.length);if(E.newValue===null){k(T,null,0);return}try{const A=JSON.parse(E.newValue);A!==null&&typeof A=="object"&&k(T,A,A.revision??0)}catch{}},{signal:n});const C=()=>{const E=[];try{for(let T=0,A=localStorage.length;T<A;T++){const M=localStorage.key(T);M!==null&&M.startsWith(h)&&E.push(M.slice(h.length))}}catch{}return E};i||jI(d,h);{const E=async T=>{if(!T||n.aborted||(await new Promise(M=>setTimeout(M,UI)),n.aborted))return;const A=Date.now();for(const M of C()){const P=b(M);if(!(P===void 0||!Ji(P,A)))try{localStorage.removeItem(h+M)}catch{}}};fb().request(`${h}cleanup`,{ifAvailable:!0},E)}return{get(E){const T=v(E);if(!(T===void 0||Ji(T,Date.now())))return T.value},getRecord(E){const T=v(E);if(!(T===void 0||Ji(T,Date.now())))return{value:T.value,revision:T.revision}},getWithLapsed(E){const T=v(E),A=Date.now();if(T===void 0||Ji(T,A))return[void 0,1/0];const M=T.updatedAt;return M===void 0?[T.value,1/0]:[T.value,A-M]},set(E,T){const A=v(E),M=Math.max((A?.revision??0)+1,p+1,Date.now());p=M;const P={value:T,expiresAt:c(T),updatedAt:u?Date.now():void 0,revision:M};try{localStorage.setItem(h+E,JSON.stringify(P))}catch(S){throw f.set(E,{envelope:P,revision:P.revision,unpersisted:!0}),y(E),S}return f.set(E,{envelope:P,revision:P.revision}),y(E),x(E,P,P.revision),P.revision},delete(E){g();try{localStorage.removeItem(h+E)}catch{}f.delete(E),y(E),x(E,null,0)},keys(){g();const E=Date.now(),T=new Set(C());for(const[M,P]of f)P.unpersisted&&T.add(M);const A=[];for(const M of T){const P=v(M);P!==void 0&&!Ji(P,E)&&A.push(M)}return A},watch(E){return m.add(E),()=>{m.delete(E)}}}},a={dispose:()=>{e.abort()},sessions:o("sessions",({token:l})=>l.refresh?null:l.expires_at??null),states:o("states",l=>Date.now()+600*1e3),dpopNonces:o("dpopNonces",l=>Date.now()+1440*60*1e3,!0),inflightDpop:new Map};if(!i)try{localStorage.setItem(s,tm)}catch{}return a},jI=(t,e)=>{let n;try{n=localStorage.getItem(t)}catch{return}if(n===null)return;let r;try{r=JSON.parse(n)}catch{return}if(!(r===null||typeof r!="object"))for(const s in r){const i=r[s];if(i===null||typeof i!="object")continue;const o=e+s;try{if(localStorage.getItem(o)!==null)continue;const a={value:i.value,expiresAt:i.expiresAt??null,updatedAt:i.updatedAt,revision:1};localStorage.setItem(o,JSON.stringify(a))}catch{return}}};let Sd,Ed,oh,pb,_n,mb;const WI=t=>{({identityResolver:mb,fetchClientAssertion:oh,onPersistError:pb}=t),{client_id:Sd,redirect_uri:Ed}=t.metadata,_n?.dispose(),_n=HI({name:t.storageName??"atcute-oauth"})};class Qi extends Error{name="LoginError"}class VI extends Error{name="AuthorizationError"}class er extends Error{name="ResolverError"}class Al extends Error{name="TokenRefreshError";sub;constructor(e,n,r){super(n,r),this.sub=e}}class gb extends Error{name="OAuthResponseError";response;data;error;description;constructor(e,n){const r=nm(rm(n)?.error),s=nm(rm(n)?.error_description),i=r?`"${r}"`:"unknown",o=s?`: ${s}`:"",a=`OAuth ${i} error${o}`;super(a),this.response=e,this.data=n,this.error=r,this.description=s}get status(){return this.response.status}get headers(){return this.response.headers}}class GI extends Error{name="FetchResponseError";response;status;constructor(e,n,r){super(r),this.response=e,this.status=n}}const nm=t=>typeof t=="string"?t:void 0,rm=t=>typeof t=="object"&&t!==null&&!Array.isArray(t)?t:void 0;let YI="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict",yb=(t=21)=>{let e="",n=crypto.getRandomValues(new Uint8Array(t|=0));for(;t--;)e+=YI[n[t]&63];return e};const qI=(t,e,n)=>r=>{const s=(1<<e)-1;let i="",o=0,a=0;for(let l=0;l<r.length;++l)for(a=a<<8|r[l],o+=8;o>e;)o-=e,i+=t[s&a>>o];if(o!==0&&(i+=t[s&a<<e-o]),n)for(;(i.length*e&7)!==0;)i+="=";return i},XI=t=>t.toBase64({alphabet:"base64url",omitPadding:!0}),ZI="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",JI=qI(ZI,6,!1),QI="fromBase64"in Uint8Array,Ad=QI?XI:JI,KI={ES256:"SHA-256",ES384:"SHA-384",ES512:"SHA-512",PS256:"SHA-256",PS384:"SHA-384",PS512:"SHA-512",RS256:"SHA-256",RS384:"SHA-384",RS512:"SHA-512"},ez={ES256:"P-256",ES384:"P-384",ES512:"P-521",PS256:null,PS384:null,PS512:null,RS256:null,RS384:null,RS512:null},Si=t=>KI[t],bb=t=>ez[t],tz=t=>t.startsWith("ES")?{name:"ECDSA",hash:{name:Si(t)}}:t.startsWith("PS")?{name:"RSA-PSS",hash:{name:Si(t)},saltLength:sz(Si(t))}:{name:"RSASSA-PKCS1-v1_5"},nz=(t,e)=>{if(t.startsWith("ES")){const n=e??bb(t);if(!n)throw new Error(`unable to determine curve for ${t}`);return{name:"ECDSA",namedCurve:n}}return t.startsWith("PS")?{name:"RSA-PSS",hash:{name:Si(t)}}:{name:"RSASSA-PKCS1-v1_5",hash:{name:Si(t)}}},rz=t=>{const e=bb(t);if(e)return{name:"ECDSA",namedCurve:e};const n={name:Si(t)};return{name:t.startsWith("PS")?"RSA-PSS":"RSASSA-PKCS1-v1_5",hash:n,modulusLength:2048,publicExponent:new Uint8Array([1,0,1])}},sz=t=>{switch(t){case"SHA-256":return 32;case"SHA-384":return 48;case"SHA-512":return 64}},iz=["ES256","ES384","ES512","PS256","PS384","PS512","RS256","RS384","RS512"],oz=t=>iz.includes(t),vb=(t,e,n)=>{if(t.kty==="EC"){const{crv:r,x:s,y:i}=t;return{kty:"EC",crv:r,x:s,y:i,kid:e,alg:n,use:"sig"}}if(t.kty==="RSA"){const{n:r,e:s}=t;return{kty:"RSA",n:r,e:s,kid:e,alg:n,use:"sig"}}throw new Error("unsupported key type")},az=async(t,e)=>{if(!("d"in t)||!t.d)throw new Error("expected a private key (missing 'd' parameter)");if(t.kty==="EC"&&!e.startsWith("ES"))throw new Error(`algorithm ${e} does not match ec key`);if(t.kty==="RSA"&&e.startsWith("ES"))throw new Error(`algorithm ${e} does not match rsa key`);const n=nz(e,t.kty==="EC"?t.crv:void 0),r=await crypto.subtle.importKey("jwk",t,n,!0,["sign"]);if(!(r instanceof CryptoKey))throw new Error("expected asymmetric key, got symmetric");return r},lz=async(t,e,n)=>{const r=await crypto.subtle.exportKey("jwk",t);return r.alg=e,r},ah=new WeakMap,cz=async t=>{const e=ah.get(t);if(e)return e;const{alg:n}=t,r=await az(t,n),s=vb(t,t.kid,n),i={cryptoKey:r,publicJwk:s};return ah.set(t,i),i},uz=(t,e)=>{const n=vb(t,t.kid,t.alg);ah.set(t,{cryptoKey:e,publicJwk:n})},hz=async t=>{const{header:e,payload:n,key:r,alg:s}=t,i={...e,alg:s},o=sm(i),a=sm(n),l=`${o}.${a}`,c=await crypto.subtle.sign(tz(s),r,Bh(l)),u=Ad(new Uint8Array(c));return`${l}.${u}`},sm=t=>Ad(Bh(JSON.stringify(t))),wb=async t=>{const e=Bh(t),n=await lx(e);return Ad(n)},_b=t=>{const e=t.alg;let n;return async(r,s,i,o)=>{n||=cz(t);const{cryptoKey:a,publicJwk:l}=await n,c=Math.floor(Date.now()/1e3);return hz({header:{typ:"dpop+jwt",jwk:l},payload:{htm:r,htu:s,iat:c,jti:yb(24),nonce:i,ath:o},key:a,alg:e})}},im=["ES256","ES384","ES512","PS256","PS384","PS512","RS256","RS384","RS512"],dz=t=>t.toSorted((e,n)=>{const r=im.indexOf(e),s=im.indexOf(n);return r===-1&&s===-1?0:r===-1?1:s===-1?-1:r-s}),fz=async t=>{const e=t?.filter(oz)??[];if(t?.length&&e.length===0)throw new Error("no supported algorithms provided");const n=e.length?dz(e):["ES256"],r=[];for(const s of n)try{const i=await crypto.subtle.generateKey(rz(s),!0,["sign","verify"]),o=await lz(i.privateKey,s);return uz(o,i.privateKey),o}catch(i){r.push(i)}throw new AggregateError(r,`failed to generate DPoP key for any of: ${n.join(", ")}`)},pz=async(t=64)=>{const e=yb(t),n=await wb(e);return{verifier:e,challenge:n,method:"S256"}};let mz="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict",gz=(t=21)=>{let e="",n=crypto.getRandomValues(new Uint8Array(t|=0));for(;t--;)e+=mz[n[t]&63];return e};const nc=t=>t.get("content-type")?.split(";")[0],yz="parse"in URL,bz=t=>{let e=null;if(yz)e=URL.parse(t);else try{e=new URL(t)}catch{}return e!==null?e.protocol==="https:"||e.protocol==="http:":!1},xb=async t=>{const e=await mb.resolve(t);return{identity:e,metadata:await Sb(e.pds)}},vz=async t=>{try{return{metadata:await Sb(t)}}catch(e){if(e instanceof er)try{return{metadata:await kb(t)}}catch{}throw e}},wz=async t=>{const e=new URL("/.well-known/oauth-protected-resource",t),n=await fetch(e.href,{redirect:"manual",headers:{accept:"application/json"}});if(n.status!==200||nc(n.headers)!=="application/json")throw new er("unexpected response");const r=await n.json();if(r.resource!==e.origin)throw new er("unexpected issuer");return r},kb=async t=>{const e=new URL("/.well-known/oauth-authorization-server",t),n=await fetch(e.href,{redirect:"manual",headers:{accept:"application/json"}});if(n.status!==200||nc(n.headers)!=="application/json")throw new er("unexpected response");const r=await n.json();if(r.issuer!==e.origin)throw new er("unexpected issuer");if(!bz(r.authorization_endpoint))throw new er("authorization server provided incorrect authorization endpoint");if(!r.client_id_metadata_document_supported)throw new er("authorization server does not support 'client_id_metadata_document'");if(!r.pushed_authorization_request_endpoint)throw new er("authorization server does not support 'pushed_authorization request'");if(r.response_types_supported&&!r.response_types_supported.includes("code"))throw new er("authorization server does not support 'code' response type");return r},Sb=async t=>{const e=await wz(t);if(e.authorization_servers?.length!==1)throw new er("expected exactly one authorization server in the listing");const n=e.authorization_servers[0],r=await kb(n);if(r.protected_resources&&!r.protected_resources.includes(e.resource))throw new er("server is not in authorization server's jurisdiction");return r},_z=180*1e3,xz=5e3,kz=async(t,e)=>{let n;try{await Promise.race([t,new Promise(r=>{n=setTimeout(r,e)})])}finally{clearTimeout(n)}},lh=(t,e)=>{const n=_n.dpopNonces,r=_n.inflightDpop,s=_b(t);return async(i,o)=>{const a=o?.body instanceof ReadableStream||i instanceof Request&&o?.body==null&&i.body!==null,l=new Request(i,o),c=l.headers.get("authorization"),u=c?.startsWith("DPoP ")?await wb(c.slice(5)):void 0,{method:h,url:d}=l,{origin:f,pathname:m}=new URL(d),p=f+m;{const x=r.get(f);x&&await kz(x.promise,xz)}let y,g=!1;try{const[x,k]=n.getWithLapsed(f);y=x,g=k>_z}catch{}let b;g&&r.set(f,b=Promise.withResolvers());let v;try{const x=await s(h,p,y,u);l.headers.set("dpop",x);const k=await fetch(l);if(v=k.headers.get("dpop-nonce"),v!==null&&(v!==y||g))try{n.set(f,v)}catch{}if(v===null||v===y||!await Sz(k,e)||a)return k}finally{b&&(r.get(f)===b&&r.delete(f),b.resolve())}{const x=await s(h,p,v,u),k=new Request(i,o);k.headers.set("dpop",x);const C=await fetch(k),E=C.headers.get("dpop-nonce");if(E!==null&&E!==v)try{n.set(f,E)}catch{}return C}}},Sz=async(t,e)=>{if((e===void 0||e===!1)&&t.status===401){const n=t.headers.get("www-authenticate");if(n?.startsWith("DPoP"))return n.includes('error="use_dpop_nonce"')}if((e===void 0||e===!0)&&t.status===400&&nc(t.headers)==="application/json")try{const n=await t.clone().json();return typeof n=="object"&&n?.error==="use_dpop_nonce"}catch{return!1}return!1},Ez=(t,e)=>{const n={};for(let r=0,s=e.length;r<s;r++){const i=e[r];n[i]=t[i]}return n};class rc{#e;#t;#n;constructor(e,n){this.#t=e,this.#n=n,this.#e=lh(n,!0)}async request(e,n){const r=this.#t[`${e}_endpoint`];if(!r)throw new Error(`no endpoint for ${e}`);if((e==="token"||e==="pushed_authorization_request")&&oh!==void 0){const o=_b(this.#n),a=await oh({aud:this.#t.issuer,createDpopProof:async(l,c)=>await o("POST",l,c,void 0)});n={...n,...a}}const s=await this.#e(r,{method:"post",headers:{"content-type":"application/json"},body:JSON.stringify({...n,client_id:Sd})});if(nc(s.headers)!=="application/json")throw new GI(s,2,"unexpected content-type");const i=await s.json();if(s.ok)return i;throw new gb(s,i)}async revoke(e){try{await this.request("revocation",{token:e})}catch{}}async exchangeCode(e,n){const r=await this.request("token",{grant_type:"authorization_code",redirect_uri:Ed,code:e,code_verifier:n});let s;try{s=this.#r(r)}catch(a){throw await this.revoke(r.access_token),a}const i=r.sub,o=await xb(i);if(o.metadata.issuer!==this.#t.issuer)throw await this.revoke(s.access),new TypeError(`issuer mismatch; got ${o.metadata.issuer}`);return{token:s,info:{sub:i,aud:o.identity.pds,server:Ez(o.metadata,["issuer","authorization_endpoint","introspection_endpoint","pushed_authorization_request_endpoint","revocation_endpoint","token_endpoint"])}}}async refresh({sub:e,token:n}){if(!n.refresh)throw new Al(e,"no refresh token available");const r=await this.request("token",{grant_type:"refresh_token",refresh_token:n.refresh});if(e!==r.sub)throw new Al(e,`sub mismatch in token response; got ${r.sub}`);return this.#r(r,n)}#r(e,n){if(!e.sub)throw new TypeError("missing sub field in token response");if(!e.scope)throw new TypeError("missing scope field in token response");if(e.token_type!=="DPoP")throw new TypeError("token response returned a non-dpop token");return{scope:e.scope,refresh:e.refresh_token??n?.refresh,access:e.access_token,type:e.token_type,expires_at:typeof e.expires_in=="number"?Date.now()+e.expires_in*1e3:void 0}}}const ya=new Map,Az=2e3,ch=async(t,e)=>{e?.signal?.throwIfAborted();const n=e?.staleAccessToken;let r=zz;e?.noCache||n!==void 0?r=Mz:e?.allowStale&&(r=Cz);let s;for(;s=ya.get(t);){try{const{isFresh:l,value:c}=await s;if(l||r(c))return c}catch{}e?.signal?.throwIfAborted()}const i=async()=>{const l=_n.sessions.getRecord(t);if(l===void 0)throw new Al(t,"session deleted by another tab");if(n!==void 0&&l.value.token.access!==n)return{isFresh:!0,value:l.value};if(r(l.value))return{isFresh:!1,value:l.value};const{rotated:c,session:u}=await Iz(t,l);return c&&Eb(t,u),{isFresh:!0,value:u}};let o=fb().request(`atcute-oauth:${t}`,i);if(o=o.finally(()=>ya.delete(t)),ya.has(t))throw new Error("concurrent request for the same key");ya.set(t,o);const{value:a}=await o;return a},Eb=(t,e)=>{try{_n.sessions.set(t,e)}catch(n){pb?.(t,n)}},Ab=t=>{_n.sessions.delete(t)},Tz=()=>_n.sessions.keys(),Cz=()=>!0,Mz=()=>!1,Rz=async(t,e)=>{const n=()=>_n.sessions.getRecord(t)?.revision!==e;if(n())return!0;let r,s;try{return await new Promise(i=>{s=setTimeout(()=>i(!1),Az),r=_n.sessions.watch(o=>{o===t&&n()&&i(!0)})})}finally{clearTimeout(s),r?.()}},Iz=async(t,e)=>{const{dpopKey:n,info:r,token:s}=e.value,i=new rc(r.server,n);try{const o=await i.refresh({sub:r.sub,token:s});return{rotated:!0,session:{dpopKey:n,info:r,token:o}}}catch(o){if(o instanceof gb&&o.status===400&&o.error==="invalid_grant"){if(await Rz(t,e.revision)){const a=_n.sessions.getRecord(t);if(a!==void 0)return{rotated:!1,session:a.value}}throw new Al(t,"session was revoked",{cause:o})}throw o}},zz=({token:t})=>{const e=t.expires_at;return e==null||Date.now()+6e4<=e},Pz=async t=>{const{target:e,scope:n,state:r=null,...s}=t;let i;switch(e.type){case"account":{i=await xb(e.identifier);break}case"pds":i=await vz(e.serviceUrl)}const{identity:o,metadata:a}=i,l=o?o.handle!=="handle.invalid"?o.handle:o.did:void 0,c=gz(24),u=await pz(),h=await fz(["ES256"]),d={display:s.display,ui_locales:s.locale,prompt:s.prompt,redirect_uri:Ed,code_challenge:u.challenge,code_challenge_method:u.method,state:c,login_hint:l,response_mode:"fragment",response_type:"code",scope:n};_n.states.set(c,{dpopKey:h,metadata:a,verifier:u.verifier,state:r});const m=await new rc(a,h).request("pushed_authorization_request",d),p=new URL(a.authorization_endpoint);return p.searchParams.set("client_id",Sd),p.searchParams.set("request_uri",m.request_uri),p},Oz=async t=>{const e=t.get("iss"),n=t.get("state"),r=t.get("code"),s=t.get("error");if(!n||!(r||s))throw new Qi("missing parameters");const i=_n.states.get(n);if(i)_n.states.delete(n);else throw new Qi("unknown state provided");if(s)throw new VI(t.get("error_description")||s);if(!r)throw new Qi("missing code parameter");const o=i.dpopKey,a=i.metadata,l=i.state??null;if(e===null)throw new Qi("missing issuer parameter");if(e!==a.issuer)throw new Qi("issuer mismatch");const c=new rc(a,o),{info:u,token:h}=await c.exchangeCode(r,i.verifier),d=u.sub,f={dpopKey:o,info:u,token:h};return Eb(d,f),{session:f,state:l}};class $z{#e;#t;session;constructor(e){this.session=e,this.#e=lh(e.dpopKey,!1)}get sub(){return this.session.info.sub}getSession(e){const n=ch(this.session.info.sub,e);return n.then(r=>{this.#n(r)},()=>{}).finally(()=>{this.#t===n&&(this.#t=void 0)}),this.#t=n}async signOut(){const e=this.session.info.sub;try{const{dpopKey:n,info:r,token:s}=await ch(e,{allowStale:!0});await new rc(r.server,n).revoke(s.refresh??s.access)}finally{Ab(e)}}async handle(e,n){await this.#t;const r=new Headers(n?.headers);let s=this.session,i=new URL(e,s.info.aud);r.set("authorization",`${s.token.type} ${s.token.access}`);const o=await this.#e(i.href,{...n,headers:r});if(!Lz(o))return o;const a=s.token.access;try{const l=this.#t;s=l?await l:await this.getSession({staleAccessToken:a}),s.token.access===a&&(s=await this.getSession({staleAccessToken:a}))}catch{return o}return n?.body instanceof ReadableStream?o:(i=new URL(e,s.info.aud),r.set("authorization",`${s.token.type} ${s.token.access}`),await this.#e(i.href,{...n,headers:r}))}#n(e){e.dpopKey.d!==this.session.dpopKey.d&&(this.#e=lh(e.dpopKey,!1)),this.session=e}}const Lz=t=>{if(t.status!==401)return!1;const e=t.headers.get("www-authenticate");return e!=null&&(e.startsWith("Bearer ")||e.startsWith("DPoP "))&&e.includes('error="invalid_token"')};function Dz(t){const{client:e,selfDid:n,resolveService:r}=t,s=async i=>{if(i===n)return e;const o=await r(i);return e.clone({handler:Ro({service:o})})};return{async putRecord({repo:i,collection:o,rkey:a,record:l}){const c=await s(i);await Hn(c.post("com.atproto.repo.putRecord",{input:{repo:i,collection:o,rkey:a,record:l}}))},async getRecord({repo:i,collection:o,rkey:a}){const l=await s(i);return{value:(await Hn(l.get("com.atproto.repo.getRecord",{params:{repo:i,collection:o,rkey:a}}))).value}},async listRecords({repo:i,collection:o,cursor:a,limit:l}){const c=await s(i),u=await Hn(c.get("com.atproto.repo.listRecords",{params:{repo:i,collection:o,cursor:a,limit:l}}));return{records:u.records,cursor:u.cursor}},async deleteRecord({repo:i,collection:o,rkey:a}){const l=await s(i);await Hn(l.post("com.atproto.repo.deleteRecord",{input:{repo:i,collection:o,rkey:a}}))},async uploadBlob(i){return(await Hn(e.post("com.atproto.repo.uploadBlob",{input:i}))).blob}}}const Tb="big-mesh-studios:atproto:session-recency",Cb=()=>{try{const t=localStorage.getItem(Tb),e=t===null?[]:JSON.parse(t);return Array.isArray(e)?e.filter(n=>typeof n=="string"):[]}catch{return[]}},Nz=t=>{try{const e=Cb().filter(n=>n!==t);e.unshift(t),localStorage.setItem(Tb,JSON.stringify(e))}catch{}};function Fz(){return{stored(){const t=Tz(),e=Cb(),n=new Set(t),r=e.filter(i=>n.has(i)),s=t.filter(i=>!r.includes(i));return[...r,...s]},async adopt({did:t,resolveService:e}){const n=new $z(await ch(t,{allowStale:!0}));return Nz(n.sub),{did:n.sub,client:Dz({client:new Hs({handler:n}),selfDid:n.sub,resolveService:e}),async end(){try{await n.signOut()}catch{Ab(n.sub)}}}}}}const Bz=t=>typeof t=="object"&&t!==null&&"version"in t&&typeof t.version=="number"?t.version:0,Uz=(t,e)=>{const n=t["~standard"].validate(e);if(n instanceof Promise)throw new Error("versionedRecord only supports schemas that validate synchronously");return n},Mb=(t,e)=>({upgradesTo:(n,r)=>Mb(n,[...e,{schema:t,up:r}]),parse:n=>{const r=Bz(n);if(r<0||r>e.length)return null;const s=r===e.length?t:e[r].schema,i=Uz(s,n);if(i.issues!==void 0)return null;let o=i.value;for(let a=r;a<e.length;a++)o=e[a].up(o);return o}}),Hz=t=>Mb(t,[]);class uh{capacity;mask;count=0;maxLoadFactor=.7;keys;values;occupied;constructor(e=16){this.capacity=this.powerOfTwoAtLeast(e),this.mask=this.capacity-1,this.keys=new Int32Array(this.capacity*3),this.values=new Array(this.capacity),this.occupied=new Uint8Array(this.capacity)}get size(){return this.count}get(e,n,r){let s=this.hash(e,n,r);for(;this.occupied[s]!==0;){const i=s*3;if(this.keys[i]===e&&this.keys[i+1]===n&&this.keys[i+2]===r)return this.values[s];s=s+1&this.mask}}set(e,n,r,s){this.count>=this.capacity*this.maxLoadFactor&&this.resize(this.capacity*2);let i=this.hash(e,n,r);for(;this.occupied[i]!==0;){const a=i*3;if(this.keys[a]===e&&this.keys[a+1]===n&&this.keys[a+2]===r){this.values[i]=s;return}i=i+1&this.mask}const o=i*3;this.keys[o]=e,this.keys[o+1]=n,this.keys[o+2]=r,this.values[i]=s,this.occupied[i]=1,this.count++}delete(e,n,r){let s=this.hash(e,n,r);for(;this.occupied[s]!==0;){const o=s*3;if(this.keys[o]===e&&this.keys[o+1]===n&&this.keys[o+2]===r)break;s=s+1&this.mask}if(this.occupied[s]===0)return!1;this.occupied[s]=0,this.values[s]=void 0,this.count--;let i=s+1&this.mask;for(;this.occupied[i]!==0;){const o=i*3,a=this.hash(this.keys[o],this.keys[o+1],this.keys[o+2]);if(!this.probedFrom(a,s,i)){const l=s*3;this.keys[l]=this.keys[o],this.keys[l+1]=this.keys[o+1],this.keys[l+2]=this.keys[o+2],this.values[s]=this.values[i],this.occupied[s]=1,this.occupied[i]=0,this.values[i]=void 0,s=i}i=i+1&this.mask}return!0}probedFrom(e,n,r){return n<r?e>n&&e<=r:e>n||e<=r}forEach(e){const{keys:n,values:r,occupied:s,capacity:i}=this;for(let o=0;o<i;o++){if(s[o]===0)continue;const a=o*3;e(n[a],n[a+1],n[a+2],r[o])}}hash(e,n,r){let s=2166136261;return s=Math.imul(s^e,16777619),s=Math.imul(s^n,16777619),s=Math.imul(s^r,16777619),(s^s>>>16)&this.mask}resize(e){const n=this.keys,r=this.values,s=this.occupied,i=this.capacity;this.capacity=e,this.mask=e-1,this.count=0,this.keys=new Int32Array(e*3),this.values=new Array(e),this.occupied=new Uint8Array(e);for(let o=0;o<i;o++){if(s[o]===0)continue;const a=o*3;this.set(n[a],n[a+1],n[a+2],r[o])}}powerOfTwoAtLeast(e){let n=1;for(;n<e;)n<<=1;return n}}const jz=(t,e,n)=>{const[r,s,i]=t.voxels,[o,a,l]=e,c=t.scale;return[Math.round(o/c-r/2+n[0]),Math.round(a/c-s/2+n[1]),Math.round(l/c-i/2+n[2])]},_s=(t,e,n)=>{const[r,s,i]=t.voxels,[o,a,l]=e,c=t.scale;return[Math.round(n[0]-o/c+r/2),Math.round(n[1]-a/c+s/2),Math.round(n[2]-l/c+i/2)]},Gs=(t,e=0)=>{const n=[Math.round((t[0]-rt[0]/2)/bt)-e,Math.round((t[1]-rt[1]/2)/bt)-e,Math.round((t[2]-rt[2]/2)/bt)-e],r=[n[0]+rt[0]/bt-1+2*e,n[1]+rt[1]/bt-1+2*e,n[2]+rt[2]/bt-1+2*e];return{min:n,max:r}};class Wz{edits;constructor(){this.edits=new uh}get size(){return this.edits.size}set(e,n,r){const s=this.edits.get(e[0],e[1],e[2]);return s!==void 0&&s.id===n?(s.updatedAt=Math.max(s.updatedAt,r),!1):(this.edits.set(e[0],e[1],e[2],{id:n,updatedAt:r}),!0)}get(e){return this.edits.get(e[0],e[1],e[2])}queryRange(e,n){const r=[];return this.edits.forEach((s,i,o,a)=>{s>=e[0]&&s<=n[0]&&i>=e[1]&&i<=n[1]&&o>=e[2]&&o<=n[2]&&r.push({w:[s,i,o],edit:a})}),r}applyToBlock(e){const{min:n,max:r}=Gs(e.center,e.store.padding),s=this.queryRange(n,r);if(s.length===0)return 0;let i=0;for(const{w:o,edit:a}of s){const[l,c,u]=_s(e.store,e.center,o);e.store.inBoundsPadded(l,c,u)&&(e.store.data[e.store.paddedIndex(l,c,u)]=a.id,Ut(a.id)?e.store.hasWater=!0:a.id!==_e&&(e.store.mightHaveVoxels=!0),kt(a.id)&&(e.store.hasFlowing=!0),i++)}return i}snapshot(){const e=[];return this.edits.forEach((n,r,s,i)=>{e.push({w:[n,r,s],edit:i})}),e}}const Rb=(t,e)=>{let n=0;for(const{w:r,edit:s}of e){const i=t.get(r);i!==void 0&&i.updatedAt>s.updatedAt||t.set(r,s.id,s.updatedAt)&&n++}return n},Un=32,Vo="app.bms.voxelscape.edit",Ib=jl({x:vr(),y:vr(),z:vr()}),zb=jl({x:vr(),y:vr(),z:vr(),id:vr(),ts:by(vr())}),Vz=jl({$type:Nu(Vo),chunk:Ib,seed:Fu(vr()),place:by(Fu(yy())),createdAt:gy(),edits:vy(zb)}),Gz=jl({$type:Nu(Vo),version:Nu(1),chunk:Ib,seed:Fu(vr()),place:yy(),createdAt:gy(),edits:vy(zb)}),Yz=Hz(Vz).upgradesTo(Gz,t=>({...t,version:1,place:t.place??Xh})),qz=t=>Yz.parse(t),Xz=t=>({x:Math.floor(t[0]/Un),y:Math.floor(t[1]/Un),z:Math.floor(t[2]/Un)}),Zz=t=>({x:t[0]-Math.floor(t[0]/Un)*Un,y:t[1]-Math.floor(t[1]/Un)*Un,z:t[2]-Math.floor(t[2]/Un)*Un}),Jz=t=>`${t.x}/${t.y}/${t.z}`,Qz=(t,e)=>[t.chunk.x*Un+e.x,t.chunk.y*Un+e.y,t.chunk.z*Un+e.z],Kz=(t,e,n,r)=>{const s=new Map;for(const{w:i,edit:o}of t){const a=Xz(i),l=Jz(a);let c=s.get(l);c===void 0&&(c={$type:Vo,version:1,chunk:a,seed:e,place:n,createdAt:r,edits:[]},s.set(l,c));const u=Zz(i);c.edits.push({x:u.x,y:u.y,z:u.z,id:o.id,ts:o.updatedAt})}return s},eP=t=>{let e=0;for(let n=0;n<t.length;n++)e=Math.imul(e,31)+t.charCodeAt(n)|0;return(e>>>0).toString(36)},tP=(t,e)=>`e_${eP(t)}_${e.x}_${e.y}_${e.z}`,nP=t=>{const e=[];for(const n of t){const r=Date.parse(n.createdAt),s=Number.isFinite(r)?r:0;for(const i of n.edits){const o=typeof i.ts=="number"&&Number.isFinite(i.ts)?i.ts:s;e.push({w:Qz(n,i),edit:{id:i.id,updatedAt:o}})}}return e},rP="https://constellation.microcosm.blue",sP="place",iP=100,oP=500,aP=async(t,e,n,r)=>{const s=[];let i;do{const o=new URLSearchParams({subject:t,source:`${e}:${n}`,limit:String(iP)});for(const c of r??[])o.append("did",c);i!==void 0&&o.set("cursor",i);const a=await fetch(`${rP}/xrpc/blue.microcosm.links.getBacklinks?${o.toString()}`);if(!a.ok)throw new Error(`constellation error: ${a.status}`);const l=await a.json();s.push(...l.records),i=l.cursor??void 0}while(i!==void 0&&s.length<oP);return s},lP=jo(),cP=async t=>{const e=await lP.resolve(t.did),n=new Hs({handler:Ro({service:ql(e)})}),r=await Hn(n.get("com.atproto.repo.getRecord",{params:{repo:t.did,collection:t.collection,rkey:t.rkey}}));return qz(r.value)},uP=async(t,e)=>{try{const n=await aP(t,Vo,sP,e);return(await Promise.all(n.map(s=>cP(s).catch(i=>(console.warn(`[edits] could not fetch an edit chunk from ${s.did}.`,i),null))))).filter(s=>s!==null)}catch(n){return console.warn("[edits] constellation discovery failed.",n),[]}},iu="atproto transition:generic",hP="popup=1,width=600,height=720",dP=5*6e4;function fP(t){function e(){const f=`http://127.0.0.1:${window.location.port||"5173"}${t.loopbackRedirectPath}`;return{clientId:`http://localhost?${new URLSearchParams({redirect_uri:f,scope:iu}).toString()}`,redirectUri:f,scope:iu}}function n(){if(typeof window>"u")return!1;const d=window.location.hostname;return d==="localhost"||d==="127.0.0.1"||d==="[::1]"}async function r(d){const f=await fetch(d,{headers:{accept:"application/json"}});if(!f.ok)throw new Error(`could not load client metadata from ${d} (${f.status})`);const m=await f.json(),p=m.redirect_uris?.[0];if(p===void 0)throw new Error(`client metadata at ${d} lists no redirect_uris`);return{clientId:d,redirectUri:p,scope:m.scope??iu}}async function s(d){return d!==void 0?r(d):n()?e():r(t.clientMetadataUrl())}let i;function o(d){return i??=(async()=>{const f=await s(d);return WI({metadata:{client_id:f.clientId,redirect_uri:f.redirectUri},identityResolver:new uk({handleResolver:Yl(),didDocumentResolver:jo()})}),f})(),i}function a(){const d=new URLSearchParams(window.location.hash.slice(1));return d.has("state")&&(d.has("code")||d.has("error"))}function l(d){const f=new BroadcastChannel(t.popupChannel);f.postMessage(d),f.close()}function c(){return new Promise((d,f)=>{const m=new BroadcastChannel(t.popupChannel);let p;const y=g=>{clearTimeout(p),m.close(),g()};m.onmessage=g=>{const b=g.data;"did"in b?y(()=>d(b.did)):y(()=>f(new Error(b.error)))},p=setTimeout(()=>{y(()=>f(new Error("sign-in was not completed in time")))},dP)})}async function u(d){const f=window.open("about:blank","_blank",hP);if(f===null)throw new Error("sign-in popup was blocked — allow popups for this site");try{const m=await o(d.clientId),p=await Pz({target:{type:"account",identifier:d.identifier},scope:m.scope,display:"popup"}),y=c();return f.location.href=p.href,await y}catch(m){throw f.close(),m}}async function h(){try{await o();const d=new URLSearchParams(window.location.hash.slice(1));window.history.replaceState(null,"",window.location.pathname+window.location.search);const{session:f}=await Oz(d);return l({did:f.info.sub}),f.info.sub}catch(d){throw l({error:d instanceof Error?d.message:String(d)}),d}}return{configureOAuthClient:o,isOAuthCallback:a,signInPopup:u,completeSignIn:h}}const{configureOAuthClient:pP,isOAuthCallback:Pb,signInPopup:mP,completeSignIn:Ob}=fP({popupChannel:"bms.voxelscape.oauth",loopbackRedirectPath:"/oauth/callback",clientMetadataUrl:()=>new URL("client-metadata.json",window.location.href).href}),gP=Object.freeze(Object.defineProperty({__proto__:null,completeSignIn:Ob,configureOAuthClient:pP,isOAuthCallback:Pb,signInPopup:mP},Symbol.toStringTag,{value:"Module"})),yP=6e4;class bP{layer;seed;place;editScope;onMerged;handleInput;identity;session;lastUploadAt=0;syncTimer;syncInFlight=!1;constructor(e){this.layer=e.layer,this.seed=e.seed,this.place=e.place,this.editScope=e.editScope,this.handleInput=e.getHandle,this.onMerged=e.onMerged??(()=>{}),this.identity=Ik(),this.session=BI({oauth:gP,identity:this.identity,store:Fz(),onConnected:n=>e.onConnected?.(n),onSignedOut:()=>{this.stopSyncLoop(),e.onSignedOut?.()}});try{const n=Number(localStorage.getItem("bms.atproto.lastUploadAt"));Number.isFinite(n)&&(this.lastUploadAt=n)}catch{this.lastUploadAt=0}}get status(){return this.session.state.status}get did(){return this.session.state.did}get ready(){return this.session.repoClient!==void 0}get repoClient(){return this.session.repoClient}resolveHandle(e){return this.identity.name(e)}resolvePicture(e){return this.identity.picture(e)}async init(){await this.session.restore();const{status:e,did:n,error:r}=this.session.state;return e==="error"?`account error: ${r}`:n===null?"not signed in":`restored session for ${await this.identity.name(n)}`}async connect(e){const n=(e??this.handleInput()).trim();if(n==="")return"provide a Bluesky handle (e.g. /account:login you.bsky.social)";await this.session.signIn(n);const{status:r,did:s,error:i}=this.session.state;return r!=="connected"||s===null?`account error: ${i}`:`signed in as ${await this.identity.name(s)}`}async sync(){if(this.syncInFlight)return"sync already running";this.syncInFlight=!0;try{return await this.runSync()}finally{this.syncInFlight=!1}}startSyncLoop(e=yP){this.syncTimer===void 0&&(this.syncTimer=setInterval(()=>{this.sync()},e))}stopSyncLoop(){this.syncTimer!==void 0&&(clearInterval(this.syncTimer),this.syncTimer=void 0)}async runSync(){const e=this.session.repoClient,n=this.session.state.did,r=[];if(e!==void 0&&n!==null){const i=Kz(this.layer.snapshot().filter(({edit:o})=>o.updatedAt>this.lastUploadAt),this.seed,this.place,new Date().toISOString());for(const o of i.values())try{await e.putRecord({repo:n,collection:Vo,rkey:tP(this.place,o.chunk),record:o})}catch(a){return`account error: ${a instanceof Error?a.message:String(a)}`}if(i.size>0){this.lastUploadAt=Date.now();try{localStorage.setItem("bms.atproto.lastUploadAt",String(this.lastUploadAt))}catch{}r.push(`uploaded ${i.size} edit chunk(s)`)}}const s=this.editScope==="self"?n!==null?[n]:null:void 0;if(s!==null){const i=await uP(this.place,s),o=Rb(this.layer,nP(i));this.onMerged(o),r.push(`fetched ${i.length} remote record(s), ${o} voxel(s) updated`)}return r.length===0?"not connected — sign in to save or share edits here; this place's shared edits still merge in on their own":r.join(", ")}async signOut(){return await this.session.signOut(),"signed out"}describe(){const{status:e,did:n,error:r}=this.session.state,s=n===null?null:this.identity.knownHandle(n)??n;return`account: ${e}${s!==null?` as ${s}`:""}${e==="error"?` — ${r??"unknown error"}`:""}`}dispose(){this.stopSyncLoop(),this.session.dispose()}}const vP=t=>{const e=SP,n=globalThis.fetch.bind(globalThis),r=new Map,s=o=>{const a=r.get(o)??e(o);return r.set(o,a),a},i=async o=>{const a=await s(o);return{location:a,client:new Hs({handler:Ro({service:a.service,fetch:n})})}};return{async list(o){const{location:a,client:l}=await i(o),c=[];let u;do{const h=await Hn(l.get("com.atproto.repo.listRecords",{params:{repo:a.did,collection:yo,cursor:u,limit:100}}));u=h.cursor,c.push(...wP(a.did,h.records))}while(u!==void 0);return c},async find(o,a){const l=jk(a),{location:c,client:u}=await i(o),h=await Hn(u.get("com.atproto.repo.getRecord",{params:{repo:c.did,collection:yo,rkey:l}}));if(!Vu(h.value))throw new Error(`"${a}" is not a model this can open`);return{repo:c.did,rkey:l,record:h.value}},async byUri(o){const a=Yk(o);if(a===null)throw new Error(`"${o}" is not a model address`);const{location:l,client:c}=await i(a.repo),u=await Hn(c.get("com.atproto.repo.getRecord",{params:{repo:l.did,collection:yo,rkey:a.rkey}}));if(!Vu(u.value))throw new Error(`"${o}" is not a model this can open`);return{repo:l.did,rkey:a.rkey,record:u.value}},async file(o){const{service:a}=await s(o.repo),l=Gu(a,o.repo,Vk(o.record)),c=await n(l);if(!c.ok)throw new Error(`the server holding ${o.repo} would not serve "${o.record.name}" (${c.status})`);return c.blob()},async thumbnailUrl(o){const a=Gk(o.record);if(a===null)return null;const{service:l}=await s(o.repo);return Gu(l,o.repo,a)}}},wP=(t,e)=>e.flatMap(({uri:n,value:r})=>Vu(r)?[{repo:t,rkey:_P(n),record:r}]:[]),_P=t=>t.slice(t.lastIndexOf("/")+1),xP=Yl(),kP=jo(),SP=async t=>{const e=t.startsWith("did:")?t:await xP.resolve(t),n=await kP.resolve(e);return{did:e,service:ql(n)}},EP=(t,e)=>Kh.map(n=>{const[r,s]=Zl[n],[i,o]=a2[n];return{kind:n,side:e[n],axis:Oa[o2[n]],fixedCoords:(a,l)=>{const c=Et.create();return c[Oa[r]]=i?t[r]-1-a:a,c[Oa[s]]=o?t[s]-1-l:l,c}}}),AP=(t,e,n)=>{const r=new Map(n.map(i=>[i.kind,i])),s=[];for(const i of h0){const[o,a]=d0[i],l=r.get(o),c=r.get(a),u=t[i],h=Oa[i],d=e.filter(p=>p.axis===i).map(p=>({...p,at:Math.min(Math.max(p.at,0),u)})).sort((p,y)=>p.at-y.at);let f=0,m={fixedCoords:l.fixedCoords,side:l.side};for(const p of d)s.push({axis:h,from:f,to:p.at,faces:[m,{fixedCoords:c.fixedCoords,side:p.before}]}),f=p.at,m={fixedCoords:l.fixedCoords,side:p.after};s.push({axis:h,from:f,to:u,faces:[m,{fixedCoords:c.fixedCoords,side:c.side}]})}return s},ou=(t,e)=>{const n=new Array(t),r=new Array(t);for(const s of e)for(let i=s.from;i<s.to;i++)n[i]=s.faces[0].side,r[i]=s.faces[1].side;return{low:n,high:r}};function $b(t,e,n=[],r=new Uint8Array(t.width*t.height*t.depth*4)){const{height:s,width:i,depth:o}=t,a=i*s*o*4;if(r.length!==a)throw new Error(`out.length expected to be ${a}`);const l=({x:f,y:m,z:p})=>p*i*s+m*i+f<<2,c={x:4,y:i*4,z:i*s*4},u=EP(t,e);r.fill(255);const h=AP(t,n,u);for(const f of h){const m=c[f.axis];for(const{side:p,fixedCoords:y}of f.faces)for(let g=0;g<p.height;++g){const b=g*p.width;for(let v=0;v<p.width;++v){if(p.data[b+v]!==gn.EMPTY)continue;let x=l(y(v,g))+f.from*m;for(let k=f.from;k<f.to;++k)r[x+3]!==0&&(r[x]=0,r[x+1]=0,r[x+2]=0,r[x+3]=0),x+=m}}}const d={x:ou(i,h.filter(f=>f.axis==="x")),y:ou(s,h.filter(f=>f.axis==="y")),z:ou(o,h.filter(f=>f.axis==="z"))};for(let f=0;f<o;f++)for(let m=0;m<s;m++){const p=s-1-m;for(let y=0;y<i;y++){const g=f*i*s+m*i+y<<2;if(r[g+3]===0)continue;const b=ai(d.z.high[f],y,p),v=ai(d.z.low[f],i-1-y,p),x=ai(d.x.low[y],f,p),k=ai(d.x.high[y],o-1-f,p),C=ai(d.y.high[m],y,f),E=ai(d.y.low[m],y,o-1-f);r[g+0]=b|(v&7)<<5,r[g+1]=v>>3&3|(x&31)<<2|(k&1)<<7,r[g+2]=k>>1&15|(C&15)<<4,r[g+3]=C>>4&1|(E&31)<<1|192}}return r}const ai=(t,e,n)=>{const r=t.data[n*t.width+e];return r===gn.EMPTY?0:r};function Lb(t){const e=new Uint8Array(t.length*4);return t.forEach(({r:n,g:r,b:s,a:i},o)=>{const a=o<<2;e[a+0]=n,e[a+1]=r,e[a+2]=s,e[a+3]=i}),e}const TP=(t,e)=>t.add(e).sub(t.sub(e).abs()).mul(V(.5)),CP=(t,e)=>t.add(e).add(t.sub(e).abs()).mul(V(.5)),MP=(t,e)=>t.add(e).sub(t.sub(e).abs()).mul(V(.5)),RP=(t,e)=>t.add(e).add(t.sub(e).abs()).mul(V(.5)),om=(t,e)=>t.texture(e.toUVec3()),IP=(t,e)=>{const n=e.toVec3();return n.greaterThanEqual(ze(V(0))).all().and(n.lessThan(t).all())},zP=(t,e)=>{const n=e.toVec3();return n.greaterThanEqual(ze(V(-2))).all().and(n.lessThan(t.add(ze(V(2)))).all())},PP=t=>t.r.bitAnd(31),OP=t=>t.r.bitAnd(224).shiftRight(5).bitOr(t.g.bitAnd(3).shiftLeft(3)),$P=t=>t.g.bitAnd(124).shiftRight(2),LP=t=>t.g.bitAnd(128).shiftRight(7).bitOr(t.b.bitAnd(15).shiftLeft(1)),DP=t=>t.b.bitAnd(240).shiftRight(4).bitOr(t.a.bitAnd(1).shiftLeft(4)),NP=t=>t.a.bitAnd(62).shiftRight(1),FP=t=>t.a.bitAnd(192).notEqual(0),am=(t,e)=>t.texture(Vt(e.toFloat().div(32).add(V(1/64)),V(.5))),BP=t=>{const{rayOrigin:e,rayDirection:n,voxels:r,palette:s,dimensions:i,voxelCount:o,lightDir:a,lightColour:l,ambientColour:c,unlit:u}=t,h=e.toVar(),d=n.toVar(),f=Ie(V(0),V(0),V(0),V(0)).toVar(),m=ZM(0,0,0).toVar(),p=ze(0,0,0).toVar(),y=ze(0,0,0).toVar(),g=i.div(o).toVar(),b=i.mul(V(-.5)).sub(g).toVar(),v=i.mul(V(.5)).add(g).toVar(),x=ze(V(1)).div(d),k=x.mul(b.sub(h)).toVar(),C=x.mul(v.sub(h)).toVar(),E=MP(k,C).toVar(),T=RP(k,C).toVar(),A=CP(Vt(E.x,E.x),Vt(E.y,E.z)).toVar(),M=A.x.max(A.y).max(V(0)).toVar(),P=TP(Vt(T.x,T.x),Vt(T.y,T.z)).toVar(),S=P.x.min(P.y).toVar();return xt(M.lessThanEqual(S),()=>{const O=d.div(g).toVar(),R=h.add(d.mul(M)).toVar().add(i.mul(V(.5))).div(g).add(O.mul(V(.001))).toVar(),F=R.floor().toIVec3().toVar(),D=d.sign().toIVec3().toVar(),te=ze(V(1)).div(O.abs().max(V(1e-6))).toVar(),H=D.toVec3().mul(F.toVec3().sub(R)).add(D.toVec3().mul(V(.5)).add(V(.5))).mul(te).toVar(),Q=ze(V(0)).toVar();xt(E.x.equal(M),()=>{Q.assign(ze(V(1),V(0),V(0)))}).ElseIf(E.y.equal(M),()=>{Q.assign(ze(V(0),V(1),V(0)))}).Else(()=>{Q.assign(ze(V(0),V(0),V(1)))});const N=o.x.max(o.y).max(o.z).mul(V(3)).add(V(8)).toInt(),B=Pp(!1).toVar();aR(()=>YM(0).toVar(),le=>le.lessThan(N),le=>le.assign(le.add(1)),()=>{xt(zP(o,F).not(),()=>{Lp()}),xt(IP(o,F),()=>{xt(FP(om(r,F)),()=>{B.assign(Pp(!0)),Lp()})}),Q.assign(H.lessThanEqual(ze(H.y.min(H.z),H.z.min(H.x),H.x.min(H.y))).toVec3()),H.assign(H.add(Q.mul(te))),F.assign(F.add(Q.toIVec3().mul(D)))}),xt(B,()=>{m.assign(F);const le=om(r,F),oe=qM(0).toVar();xt(Q.x.notEqual(V(0)),()=>{xt(D.x.greaterThan(0),()=>{oe.assign($P(le))}).Else(()=>{oe.assign(LP(le))})}).ElseIf(Q.y.notEqual(V(0)),()=>{xt(D.y.greaterThan(0),()=>{oe.assign(NP(le))}).Else(()=>{oe.assign(DP(le))})}).Else(()=>{xt(D.z.greaterThan(0),()=>{oe.assign(OP(le))}).Else(()=>{oe.assign(PP(le))})});const X=V(0).toVar();xt(Q.x.notEqual(V(0)),()=>{X.assign(M.add(D.x.greaterThan(0).select(F.x,F.x.add(1)).toFloat().sub(R.x).mul(D.x.toFloat()).mul(te.x)))}).ElseIf(Q.y.notEqual(V(0)),()=>{X.assign(M.add(D.y.greaterThan(0).select(F.y,F.y.add(1)).toFloat().sub(R.y).mul(D.y.toFloat()).mul(te.y)))}).Else(()=>{X.assign(M.add(D.z.greaterThan(0).select(F.z,F.z.add(1)).toFloat().sub(R.z).mul(D.z.toFloat()).mul(te.z)))}),y.assign(h.add(d.mul(X))),xt(u.toVar(),()=>{f.rgb.assign(am(s,oe).rgb)}).Else(()=>{p.assign(Q.mul(D.toVec3()).negate());const ye=p.dot(a).max(V(0));f.rgb.assign(am(s,oe).rgb.mul(c.add(l.mul(ye))))}),f.a.assign(V(1))})}),{colour:f,voxelPos:m,normal:p,hitPoint:y}};class Db extends ur{voxelTexture;paletteTexture;dimensions=[0,0,0];voxelCount=[1,1,1];lightDir=[0,0,1];lightColour=[1,1,1];ambientColour=[0,0,0];unlit=!1;flash=0;depthBias=0;voxelsUniform;paletteUniform;dimensionsUniform;voxelCountUniform;lightDirUniform;lightColourUniform;ambientColourUniform;unlitUniform;flashUniform;depthBiasUniform;constructor(){super(),this.voxelTexture=new Yp(new Uint8Array(4),1,1,1),this.paletteTexture=new Yp(new Uint8Array(4),1,1)}setup(e,n){this.voxelsUniform=e.sampler("uVoxels","usampler3D",()=>this.voxelTexture),this.paletteUniform=e.sampler("uPalette","sampler2D",()=>this.paletteTexture),this.dimensionsUniform=e.materialUniform("uDimensions","vec3",()=>this.dimensions),this.voxelCountUniform=e.materialUniform("uVoxelCount","vec3",()=>this.voxelCount),this.lightDirUniform=e.materialUniform("uLightDir","vec3",()=>this.lightDir),this.lightColourUniform=e.materialUniform("uLightColour","vec3",()=>this.lightColour),this.ambientColourUniform=e.materialUniform("uAmbientColour","vec3",()=>this.ambientColour),this.unlitUniform=e.materialUniform("uUnlit","bool",()=>this.unlit?1:0),this.flashUniform=e.materialUniform("uFlash","float",()=>this.flash),this.depthBiasUniform=e.materialUniform("uDepthBias","float",()=>this.depthBias)}buildVertexBody(e){const n=e.position;e.varying("vModelPos","vec3").assign(n);const r=e.instancing?e.instanceMatrix.inverse():e.modelMatrix.inverse();e.varying("vCamVolume","vec3").assign(r.mul(Ie(e.cameraPosition,V(1))).xyz),e.varying("vLightVolume","vec3").assign(r.mul(Ie(this.lightDirUniform,V(0))).xyz.normalize());const s=e.instancing?e.instanceMatrix.mul(Ie(n,V(1))):Ie(n,V(1)),i=e.projectionMatrix.mul(e.viewMatrix.mul(e.modelMatrix.mul(s)));e.varying("vClipZ","float").assign(i.z),e.varying("vClipW","float").assign(i.w);const o=e.instancing?e.modelMatrix.mul(e.instanceMatrix):e.modelMatrix,a=e.projectionMatrix.mul(e.viewMatrix.mul(o));return e.varying("vRow2","vec4").assign(Ie(a.element(0).element(2),a.element(1).element(2),a.element(2).element(2),a.element(3).element(2))),e.varying("vRow3","vec4").assign(Ie(a.element(0).element(3),a.element(1).element(3),a.element(2).element(3),a.element(3).element(3))),i}buildFragmentBody(e){const n=e.varying("vCamVolume","vec3"),r=e.varying("vModelPos","vec3").sub(n).normalize(),{colour:s,hitPoint:i}=BP({rayOrigin:n,rayDirection:r,voxels:this.voxelsUniform,palette:this.paletteUniform,dimensions:this.dimensionsUniform,voxelCount:this.voxelCountUniform,lightDir:e.varying("vLightVolume","vec3"),lightColour:this.lightColourUniform,ambientColour:this.ambientColourUniform,unlit:this.unlitUniform}),o=Ie(_r(s.xyz,ze(V(1),V(.15),V(.15)),this.flashUniform),s.a),a=oR();return xt(s.a.greaterThan(V(.5)),()=>{const l=i.sub(e.varying("vModelPos","vec3")),c=e.varying("vClipZ","float").add(e.varying("vRow2","vec4").dot(Ie(l,V(0)))),u=e.varying("vClipW","float").add(e.varying("vRow3","vec4").dot(Ie(l,V(0))));a.assign(c.div(u).mul(V(.5)).add(V(.5)).add(this.depthBiasUniform))}).Else(()=>{a.assign(V(1))}),o}}const Nb=t=>{const e=zo.normalize(t),n=(r,s)=>r*(1+2/s);return{width:n(e.width,t.width),height:n(e.height,t.height),depth:n(e.depth,t.depth)}},UP=t=>Math.max(t.width,t.height,t.depth),HP=[{axis:"x",extent:"width"},{axis:"y",extent:"height"},{axis:"z",extent:"depth"}];function jP(t){const e=t.parts.map(i=>{const o=f0(i),a=h2(t,i),l=(c,u,h)=>Et.add(a.at,Fn.transform(a.turn,Et.multiplyScalar(Et.subtract(Et.create(c,u,h),i.pivot),a.scale)));return{dimensions:o,pose:a,middle:l(o.width/2,o.height/2,o.depth/2),corners:[0,1].flatMap(c=>[0,1].flatMap(u=>[0,1].map(h=>l(c*o.width,u*o.height,h*o.depth))))}}),n=Et.create(),r={width:0,height:0,depth:0};for(const{axis:i,extent:o}of HP){let a=1/0,l=-1/0;for(const c of e)for(const u of c.corners)a=Math.min(a,u[i]),l=Math.max(l,u[i]);e.length>0&&(n[i]=a,r[o]=l-a)}const s=i=>e.length===0?0:i+2;return{bounds:{low:n,dimensions:r},size:{width:s(r.width),height:s(r.height),depth:s(r.depth)},placements:e.map(i=>({position:i.middle,turn:i.pose.turn,scale:UP(i.dimensions)*i.pose.scale}))}}function WP(t){const e=f0(t);return{name:t.name,dimensions:e,voxels:$b(e,t.sides,t.sections)}}function VP(t,e,n,r){const s=t.voxelTexture;s.image=n,s.width=e.width,s.height=e.height,s.depth=e.depth,s.needsUpdate=!0;const i=t.paletteTexture;i.image=Lb(r),i.width=r.length,i.height=1,i.needsUpdate=!0;const o=zo.normalize(e);t.dimensions=[o.width,o.height,o.depth],t.voxelCount=[e.width,e.height,e.depth]}function GP(t,e){const{position:n,turn:r,scale:s}=e;t.position.set(n.x,n.y,n.z),t.scale.set(s,s,s),t.quaternion.setFromRotationMatrix(YP.set(r[0],r[3],r[6],0,r[1],r[4],r[7],0,r[2],r[5],r[8],0,0,0,0,1))}const YP=new sr;function qP(t){const e=Nb(t);return new Hi(e.width,e.height,e.depth)}class XP{parts;bounds;size;palette;constructor(e){const{bounds:n,size:r,placements:s}=jP(e);this.bounds=n,this.size=r,this.palette=e.palette,this.parts=e.parts.map((i,o)=>{const{name:a,dimensions:l,voxels:c}=WP(i);return{name:a,dimensions:l,voxels:c,geometry:qP(l),placement:s[o]}})}createMaterials(){return this.parts.map(e=>{const n=new Db;return VP(n,e.dimensions,e.voxels,this.palette),n})}copy(e){return new ZP(this.parts,e)}}class ZP{group=new Xn;meshes;constructor(e,n){this.meshes=e.map((r,s)=>{const i=new wn(r.geometry,n[s]);return GP(i,r.placement),this.group.add(i),i})}wear(e){this.meshes.forEach((n,r)=>{n.material=e[r]})}}const JP=1,QP=3,lm=8,cm=(t,e,n)=>t+(e-t)*n,um=t=>Math.max(-lm,Math.min(lm,t));class KP{current;previous=null;rendered;constructor(e,n){this.current={...e,at:n},this.rendered={...e}}next(e,n,r){(e.x!==this.current.x||e.z!==this.current.z)&&(this.previous=this.current,this.current={...e,at:n});const s=this.extrapolate(n),i=Math.hypot(s.x-this.rendered.x,s.z-this.rendered.z);return this.rendered=i>QP?s:{x:cm(this.rendered.x,s.x,1-Math.exp(-12*r)),z:cm(this.rendered.z,s.z,1-Math.exp(-12*r))},this.rendered}extrapolate(e){if(this.previous===null)return this.current;const n=(this.current.at-this.previous.at)/1e3;if(n<=0)return this.current;const r=um((this.current.x-this.previous.x)/n),s=um((this.current.z-this.previous.z)/n),i=Math.min((e-this.current.at)/1e3,JP);return{x:this.current.x+r*i,z:this.current.z+s*i}}}const hm=2,e3=.5,t3=180;class dm{group=new Xn;getFigures;modelFor;baked=new Map;meshes=new Map;heights=new Map;hurtUntil=new Map;motion=new Map;spinAxis=new wt;upAxis=new wt(0,1,0);yawTurn=new $o;constructor(e){this.getFigures=e.getFigures,this.modelFor=e.modelFor??(()=>"zombie.zip")}get size(){return this.meshes.size}setFigure(e,n){const r=new XP(n),s=r.size.height,{width:i,depth:o}=r.bounds.dimensions,a=r.createMaterials();for(const l of a)l.flash=1;this.baked.set(e,{baked:r,materials:r.createMaterials(),flashMaterials:a,modelHeight:s,halfRatio:s>0?.5*Math.max(i,o)/s:0});for(const[l,c]of this.meshes)this.modelFor(l)===e&&(this.group.remove(c.group),this.meshes.delete(l),this.heights.delete(l))}flashHit(e){this.hurtUntil.set(e,Date.now()+t3)}async loadModel(e,n){this.setFigure(e,await gl(n))}aimBounds(e){const n=this.baked.get(this.modelFor(e));if(n===void 0)return null;const r=this.heights.get(e)??hm;return{half:n.halfRatio*r,height:r}}applyLighting(e){const n=[e.sunDir[0],e.sunDir[1],e.sunDir[2]],r=[e.sunLight[0],e.sunLight[1],e.sunLight[2]],s=[e.ambient[0],e.ambient[1],e.ambient[2]];for(const{materials:i,flashMaterials:o}of this.baked.values())for(const a of[...i,...o])a.lightDir=n,a.lightColour=r,a.ambientColour=s}tick(e){const n=Date.now(),r=new Set;for(const s of this.getFigures()){r.add(s.id);const i=this.modelFor(s.id),o=this.baked.get(i);if(o===void 0||o.modelHeight<=0)continue;const a=s.height??hm;this.heights.set(s.id,a);let l=this.meshes.get(s.id);l===void 0&&(l=o.baked.copy(o.materials),this.group.add(l.group),this.meshes.set(s.id,l));const c=a/o.modelHeight;l.group.scale.set(c,c,c);const u=s.yaw??0;if(s.dyingAt===void 0){let h=this.motion.get(s.id);h===void 0&&(h=new KP({x:s.x,z:s.z},n),this.motion.set(s.id,h));const d=h.next({x:s.x,z:s.z},n,e);l.group.position.set(d.x,s.y+a/2,d.z),s.spin===void 0?l.group.rotation.set(0,u,0):(this.spinAxis.set(s.spin.axis[0],s.spin.axis[1],s.spin.axis[2]).normalize(),l.group.quaternion.setFromAxisAngle(this.spinAxis,s.spin.angle),this.yawTurn.setFromAxisAngle(this.upAxis,u),l.group.quaternion.multiply(this.yawTurn))}else{const h=Math.min(1,(n-s.dyingAt)/1e3/e3),d=-Math.PI/2*h,f=a/2;l.group.position.set(s.x+f*Math.sin(d)*Math.sin(u),s.y+f*Math.cos(d),s.z+f*Math.sin(d)*Math.cos(u)),l.group.rotation.set(d,u,0)}(this.hurtUntil.get(s.id)??0)>n?l.wear(o.flashMaterials):(l.wear(o.materials),this.hurtUntil.delete(s.id))}for(const[s,i]of this.meshes)r.has(s)||(this.group.remove(i.group),this.meshes.delete(s),this.heights.delete(s),this.hurtUntil.delete(s),this.motion.delete(s))}clear(){for(const e of this.meshes.values())this.group.remove(e.group);this.meshes.clear(),this.heights.clear(),this.hurtUntil.clear(),this.motion.clear()}}const n3=t=>t*t*(3-2*t),li=(t,e,n)=>t+(e-t)*n,r3=(t,e)=>({x:t[0],y:t[1],z:t[2],lookX:e[0],lookY:e[1],lookZ:e[2]}),s3=(t,e,n)=>{const r=Math.max(0,e-t.startMs);let s=0,i=n;for(const o of t.shots){const a=Math.max(0,o.durationMs??0),l=Math.max(0,o.holdMs??0),c=o.look??[i.lookX,i.lookY,i.lookZ];if(r<s+a){const h=a<=0?1:(r-s)/a,d=o.ease==="smooth"?n3(Math.min(1,h)):h;return{x:li(i.x,o.at[0],d),y:li(i.y,o.at[1],d),z:li(i.z,o.at[2],d),lookX:li(i.lookX,c[0],d),lookY:li(i.lookY,c[1],d),lookZ:li(i.lookZ,c[2],d),done:!1}}const u=r3(o.at,c);if(r<s+a+l)return{...u,done:!1};s+=a+l,i=u}return{...i,done:!0}},i3=(t,e)=>`bms-voxelscape:endings:${t}:${e}`,o3=t=>{const e=()=>{try{const n=localStorage.getItem(t);if(n===null)return[];const r=JSON.parse(n);return Array.isArray(r)&&r.every(s=>typeof s=="string")?r:[]}catch{return[]}};return{seen:e,record(n){const r=e();if(!r.includes(n)){r.push(n);try{localStorage.setItem(t,JSON.stringify(r))}catch{}}}}},Fb=t=>[Math.round(t.x/2),Math.floor(t.y/2)-1,Math.round(t.z/2)],a3=t=>{const[e,,n]=Fb(t);return{x:e*2+1,y:t.y,z:n*2+1}},hh=(t,e,n)=>{for(let r=0;r<t.length;r++){const s=t[r],{min:i,max:o}=Gs(s.center);if(e[0]<i[0]||e[0]>o[0]||e[1]<i[1]||e[1]>o[1]||e[2]<i[2]||e[2]>o[2])continue;const[a,l,c]=_s(s.store,s.center,e);s.store.inBoundsPadded(a,l,c)&&n(s,r,a,l,c)}},fm=(t,e)=>{Ut(e)?t.store.hasWater=!0:e!==_e&&(t.store.mightHaveVoxels=!0),kt(e)&&(t.store.hasFlowing=!0)},l3=(t,e)=>{let n=_e;return hh(t,e,(r,s,i,o,a)=>{n=r.store.atPadded(i,o,a)}),n};class c3{constructor(e,n){this.blocks=e,this.onBlocksChanged=n}blocks;onBlocksChanged;kindled=new Map;seed(e){const n=Fb(e),r=n.join(",");if(this.kindled.has(r))return;const s=l3(this.blocks,n),i=O0[Fa],o=[];hh(this.blocks,n,(a,l,c,u,h)=>{a.store.data[a.store.paddedIndex(c,u,h)]=Fa,fm(a,Fa),dd(a.store,a.light,[{x:c,y:u,z:h,level:i,fullSky:!1}],"blocklight",!1),o.push(l)}),o.length!==0&&(this.kindled.set(r,{voxel:n,was:s}),this.onBlocksChanged(o))}clear(){const e=new Set;for(const{voxel:n,was:r}of this.kindled.values())hh(this.blocks,n,(s,i,o,a,l)=>{s.store.data[s.store.paddedIndex(o,a,l)]=r,fm(s,r),Ql(s.store,s.light),e.add(i)});this.kindled.clear(),e.size>0&&this.onBlocksChanged([...e])}}const pr=96,u3=.27,au=[.08,.18],lu=[.08,.14],yi=2.5,h3=.5,d3=t=>Math.max(.1,t/u3),f3=()=>{const t=new Float32Array(pr*4*3),e=new Float32Array(pr*4*2),n=new Float32Array(pr*4*3),r=new Float32Array(pr*4),s=new Float32Array(pr*4),i=new Float32Array(pr*4),o=new Float32Array(pr*4),a=new Float32Array(pr*4*2),l=new Uint16Array(pr*6),c=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let h=0;h<pr;h++){const d=h*4,f=(Math.random()-.5)*.012*yi,m=Math.random()*.01,p=(Math.random()-.5)*.012*yi,y=(Math.random()-.5)*.05*yi,g=lu[0]+Math.random()*(lu[1]-lu[0]),b=(Math.random()-.5)*.05*yi,v=.45+Math.random()*.35,x=Math.random()*v,k=au[0]+Math.random()*(au[1]-au[0]),C=Math.random()*Math.PI*2;for(let E=0;E<4;E++){const T=d+E,A=T*3,M=T*2;t[A]=f,t[A+1]=m,t[A+2]=p,e[M]=c[E][0],e[M+1]=c[E][1],n[A]=y,n[A+1]=g,n[A+2]=b,r[T]=v,s[T]=x,i[T]=k,o[T]=C,a[M]=(c[E][0]+1)/2,a[M+1]=(c[E][1]+1)/2}l[h*6+0]=d,l[h*6+1]=d+1,l[h*6+2]=d+2,l[h*6+3]=d,l[h*6+4]=d+2,l[h*6+5]=d+3}const u=new Jr;return u.setAttribute("particlePos",new $e(t,3)),u.setAttribute("corner",new $e(e,2)),u.setAttribute("drift",new $e(n,3)),u.setAttribute("life",new $e(r,1)),u.setAttribute("offset",new $e(s,1)),u.setAttribute("size",new $e(i,1)),u.setAttribute("spin",new $e(o,1)),u.setAttribute("uv",new $e(a,2)),u.setIndex(l),u};class p3 extends ur{time=0;timeUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!1,this.side=Qr.DoubleSide,this.blending=Vs.AdditiveBlending}setup(e,n){this.timeUniform=e.materialUniform("time","float",()=>this.time)}buildVertexBody(e){const n=(this.timeUniform??V(0)).mul(V(h3)).toVar(),r=e.attribute("particlePos","vec3"),s=e.attribute("corner","vec2"),i=e.attribute("drift","vec3"),o=e.attribute("life","float"),a=e.attribute("offset","float"),l=e.attribute("size","float"),c=e.attribute("spin","float"),u=e.attribute("uv","vec2"),h=Wa(n.add(a),o).div(o).toVar(),d=Vn(V(0),V(.08),h),f=V(1).sub(Vn(V(.35),V(1),h)),m=d.mul(f).toVar(),p=V(1).sub(h).toVar(),y=r.add(i.mul(h)).toVar(),g=xl(n.mul(V(10)).add(c).add(h.mul(V(12)))).mul(V(.012*yi)).mul(V(1).sub(h)),b=xl(n.mul(V(24)).add(c)).mul(V(.004)),v=JM(n.mul(V(8)).add(c).add(h.mul(V(10)))).mul(V(.006*yi)).mul(V(1).sub(h)),x=ze(y.x.add(g),y.y.add(h.mul(h).mul(V(.12))).add(b),y.z.add(v)).toVar(),k=e.viewMatrix.mul(e.modelMatrix.mul(Ie(x,V(1)))).toVar(),C=s.mul(l.mul(m)).toVar(),E=k.xyz.add(ze(C.x,C.y,V(0))).toVar();return e.varying("vUv","vec2").assign(u),e.varying("vFade","float").assign(m),e.varying("vHeat","float").assign(p),e.projectionMatrix.mul(Ie(E,k.w))}buildFragmentBody(e){const n=e.varying("vUv","vec2"),r=e.varying("vFade","float"),s=e.varying("vHeat","float"),o=n.sub(Vt(.5)).toVar().length().toVar(),a=o.lessThanEqual(V(.5)).select(V(1),V(0)),l=V(1).sub(Vn(V(0),V(.28),o)),c=V(1).sub(Vn(V(.12),V(.5),o)),u=ze(1,.22,.02),h=ze(1,.55,.08),d=ze(1,.95,.55),f=s.mul(V(1.2)).clamp(V(0),V(1)),m=_r(u,h,f),p=_r(m,d,l),y=c.mul(r).mul(a).toVar();return Ie(p,y)}}class m3{constructor(e){this.fires=e}fires;group=new Xn;material=new p3;geometry=f3();meshes=new Map;time=0;tick(e){this.time+=e,this.material.time=this.time;const n=this.fires();for(const r of n){let s=this.meshes.get(r.id);s===void 0&&(s=new wn(this.geometry,this.material),this.group.add(s),this.meshes.set(r.id,s));const i=d3(r.height),o=a3(r);s.position.set(o.x,o.y,o.z),s.scale.setScalar(i)}for(const[r,s]of this.meshes)n.some(i=>i.id===r)||(this.group.remove(s),this.meshes.delete(r))}clear(){for(const e of this.meshes.values())this.group.remove(e);this.meshes.clear()}}const Or=160,g3=.85,y3=.8,b3=.15,cu=.5,uu=[.08,.2],v3=8,w3=()=>{const t=Math.random(),e=Math.random(),n=2*Math.PI*t,r=Math.sqrt(e*(1-e));return[2*r*Math.cos(n),2*r*Math.sin(n),2*e-1]},_3=()=>{const t=new Float32Array(Or*4*3),e=new Float32Array(Or*4*2),n=new Float32Array(Or*4*3),r=new Float32Array(Or*4),s=new Float32Array(Or*4),i=new Float32Array(Or*4),o=new Float32Array(Or*4*2),a=new Uint16Array(Or*6),l=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let u=0;u<Or;u++){const[h,d,f]=w3(),m=h*.02,p=d*.02,y=f*.02,g=uu[0]+Math.random()*(uu[1]-uu[0]),b=Math.random()*b3,v=u*4;for(let x=0;x<4;x++){const k=v+x,C=k*3,E=k*2;t[C]=m,t[C+1]=p,t[C+2]=y,e[E]=l[x][0],e[E+1]=l[x][1],n[C]=h*cu,n[C+1]=d*cu,n[C+2]=f*cu,r[k]=y3,s[k]=b,i[k]=g,o[E]=(l[x][0]+1)/2,o[E+1]=(l[x][1]+1)/2}a[u*6+0]=v,a[u*6+1]=v+1,a[u*6+2]=v+2,a[u*6+3]=v,a[u*6+4]=v+2,a[u*6+5]=v+3}const c=new Jr;return c.setAttribute("particlePos",new $e(t,3)),c.setAttribute("corner",new $e(e,2)),c.setAttribute("drift",new $e(n,3)),c.setAttribute("life",new $e(r,1)),c.setAttribute("offset",new $e(s,1)),c.setAttribute("size",new $e(i,1)),c.setAttribute("uv",new $e(o,2)),c.setIndex(a),c};class x3 extends ur{time=0;timeUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!1,this.side=Qr.DoubleSide,this.blending=Vs.AdditiveBlending}setup(e,n){this.timeUniform=e.materialUniform("time","float",()=>this.time)}buildVertexBody(e){const n=(this.timeUniform??V(0)).toVar(),r=e.attribute("particlePos","vec3"),s=e.attribute("corner","vec2"),i=e.attribute("drift","vec3"),o=e.attribute("life","float"),a=e.attribute("offset","float"),l=e.attribute("size","float"),c=e.attribute("uv","vec2"),u=n.add(a).div(o).clamp(V(0),V(1)).toVar(),h=Vn(V(0),V(.08),u),d=V(1).sub(Vn(V(.35),V(1),u)),f=h.mul(d).toVar(),m=V(1).sub(u).toVar(),p=r.add(i.mul(u)).toVar(),y=e.viewMatrix.mul(e.modelMatrix.mul(Ie(p,V(1)))).toVar(),g=s.mul(l.mul(f)).toVar(),b=y.xyz.add(ze(g.x,g.y,V(0))).toVar();return e.varying("vUv","vec2").assign(c),e.varying("vFade","float").assign(f),e.varying("vHeat","float").assign(m),e.projectionMatrix.mul(Ie(b,y.w))}buildFragmentBody(e){const n=e.varying("vUv","vec2"),r=e.varying("vFade","float"),s=e.varying("vHeat","float"),o=n.sub(Vt(.5)).toVar().length().toVar(),a=o.lessThanEqual(V(.5)).select(V(1),V(0)),l=V(1).sub(Vn(V(0),V(.28),o)),c=V(1).sub(Vn(V(.12),V(.5),o)),u=ze(1,.22,.02),h=ze(1,.55,.08),d=ze(1,.95,.55),f=s.mul(V(1.2)).clamp(V(0),V(1)),m=_r(u,h,f),p=_r(m,d,l),y=c.mul(r).mul(a).toVar();return Ie(p,y)}}class k3{constructor(e){this.explosions=e}explosions;group=new Xn;geometry=_3();materials=[];free=[];bursts=new Map;lit=new Map;time=0;tick(e){this.time+=e;const n=this.explosions(),r=new Set;for(const s of n)r.add(s.id),this.lit.get(s.id)!==s.at&&(this.lit.set(s.id,s.at),this.start(s));for(const[s,i]of this.bursts){const o=this.time-i.started;if(o>=g3){this.discard(s);continue}i.material.time=o}for(const s of[...this.lit.keys()])r.has(s)||this.lit.delete(s)}clear(){for(const e of[...this.bursts.keys()])this.discard(e);this.lit.clear()}start(e){this.discard(e.id);const n=this.takeMaterial();n.time=0;const r=new wn(this.geometry,n);r.position.set(e.x,e.y,e.z),r.scale.setScalar(e.radius),this.group.add(r),this.bursts.set(e.id,{mesh:r,material:n,started:this.time})}discard(e){const n=this.bursts.get(e);n!==void 0&&(this.group.remove(n.mesh),this.bursts.delete(e),this.free.push(n.material))}takeMaterial(){const e=this.free.pop();if(e!==void 0)return e;if(this.materials.length<v3){const r=new x3;return this.materials.push(r),r}const n=[...this.bursts.entries()].sort((r,s)=>r[1].started-s[1].started)[0];return n===void 0?this.materials[0]:(this.discard(n[0]),this.free.pop())}}const S3=5,E3=.6,A3=2,T3=(t,e,n)=>{const r=[0,0,0],s=[0,0,0];for(let a=0;a<3;a++){const l=t[a],c=e[a],u=a===0?n.minX:a===1?n.minY:n.minZ,h=a===0?n.maxX:a===1?n.maxY:n.maxZ;if(Math.abs(c)<1e-9){if(l<u||l>h)return null;r[a]=-1/0,s[a]=1/0}else{const d=1/c;if(r[a]=(u-l)*d,s[a]=(h-l)*d,r[a]>s[a]){const f=r[a];r[a]=s[a],s[a]=f}}}const i=Math.max(r[0],r[1],r[2]),o=Math.min(s[0],s[1],s[2]);return i>o||o<0?null:Math.max(0,i)},Bb=(t,e,n,r=S3)=>{let s=null;for(const i of n){const o=i.half??E3,a=i.height??A3,l=i.yaw??0,c=Math.cos(l),u=Math.sin(l),h=t[0]-i.x,d=t[2]-i.z,f=[h*c-d*u,t[1]-i.y,h*u+d*c],m=[e[0]*c-e[2]*u,e[1],e[0]*u+e[2]*c],p=T3(f,m,{minX:-o,maxX:o,minY:0,maxY:a,minZ:-o,maxZ:o});p!==null&&p<=r&&(s===null||p<s.distance)&&(s={id:i.id,distance:p})}return s},Ub=4,C3=8,hu=()=>typeof navigator>"u"||typeof navigator.hardwareConcurrency!="number"?2:Math.max(0,Math.min(Ub,navigator.hardwareConcurrency-1));class Td{_workers=[];messageHandlers=[];lostHandlers=[];addedHandlers=[];createWorker;requestedCount;disposed=!1;constructor(e={}){this.createWorker=e.createWorker,this.requestedCount=e.count;const n=e.count??hu();for(let r=0;r<n&&this.spawnOne()!==void 0;r++);}get workers(){return this._workers}get available(){return this._workers.length>0}onMessage(e){this.messageHandlers.push(e);for(const n of this._workers)n.addEventListener("message",e)}onWorkerLost(e){this.lostHandlers.push(e)}onWorkerAdded(e){this.addedHandlers.push(e)}setCount(e){this.requestedCount=Math.min(C3,Math.max(0,e)),this.ensure(this.requestedCount)}setAuto(){this.requestedCount=void 0,this.ensure(hu())}describe(){const e=hu(),n=this._workers.length,r=this.requestedCount,s=r===void 0?`auto (${e})`:`fixed at ${r} (auto: ${e})`;return`world workers: ${n} running, ${s}`}dispose(){if(!this.disposed){this.disposed=!0;for(const e of this._workers)e.terminate();this._workers.length=0}}ensure(e){for(;this._workers.length>e;){const n=this._workers.pop();if(n!==void 0){n.terminate();for(const r of this.lostHandlers)r(n)}}for(;this._workers.length<e&&this.spawnOne()!==void 0;);}spawnOne(){let e;try{e=this.createWorker===void 0?new Worker(new URL("/big-mesh-studios/voxelscape/assets/world-worker-B9BfNJFD.js",import.meta.url),{type:"module"}):this.createWorker()}catch{e=void 0}if(e!==void 0){for(const n of this.messageHandlers)e.addEventListener("message",n);e.addEventListener("error",()=>this.drop(e)),this._workers.push(e);for(const n of this.addedHandlers)n(e);return e}}drop(e){const n=this._workers.indexOf(e);n>=0&&this._workers.splice(n,1);for(const r of this.lostHandlers)r(e)}}const Qe={player:0,scroll:1,scrollCells:2,scrollEvict:3,scrollTeleport:4,scrollOrder:5,scrollRequest:6,flow:7,multiplayer:8,figures:9,environment:10,meshDrain:11,merge:12,rendererTick:13,advance:14,occlusion:15,draw:16},M3=Object.keys(Qe),Gn={fillsRequested:0,fillsLanded:1,meshesRequested:2,meshesLanded:3,meshesFromFill:4,merges:5,uploads:6,scrolls:7,blocksStreamed:8},Mt={gapMs:0,gpuMs:1,scale:2,uploadBytes:3,merges:4,triangles:5,occluded:6,visible:7,drawnMeshes:8,fillPending:9,fillInFlight:10,meshPending:11,meshInFlight:12,dirtySuperchunks:13,heapBytes:14,residentBytes:15,voxelBytes:16,mergedGeometryBytes:17,blockGeometryBytes:18,gpuOcclusionMs:19,cellReady:20,playerX:21,playerY:22,playerZ:23},R3=Object.keys(Mt);R3.length+M3.length;const I3={rows:[],rowStride:0,fieldNames:[],phaseNames:[],counterNames:[],counters:[],framesSeen:0,wrapped:!1,durationMs:0};class z3{armed=!1;arm(){}disarm(){}reset(){}begin(){}end(){}count(){}gauge(){}frame(){}drain(){return I3}}const pe=new z3,Hb=4,P3=Hb*Ub,pm=t=>({named:{stores:t.map(e=>e.storeData),lights:t.map(e=>e.light)},buffers:t.flatMap(e=>[e.storeData.buffer,e.light.buffer])});class O3{fillGen;fillLod;fillBorder;pendingFills=new Set;pendingCenter=new Map;pendingLod=new Map;pendingBorder=new Map;pendingFocus=[0,0,0];workerLoad=new Map;fillInflight=new Set;spares=new Map;blocks;terrain;onBlockChanged;customFillStore;customFillStoreUrl;structures;editLayer;tileRects;fillRects=new Map;pool;warnedWorkerError=!1;pendingSyncFills=new Set;pendingSyncLods=new Map;pendingSyncBorder=new Map;syncFillTimer;constructor(e){this.terrain=e.terrain,this.blocks=e.blocks,this.onBlockChanged=e.onBlockChanged,this.customFillStore=e.customFillStore,this.customFillStoreUrl=e.customFillStoreUrl,this.structures=e.structures,this.editLayer=e.editLayer,this.tileRects=e.tileRects,this.fillGen=new Array(e.blocks.length).fill(0),this.fillLod=new Array(e.blocks.length).fill(0),this.fillBorder=new Array(e.blocks.length).fill(void 0),this.pool=e.pool??new Td(e.createWorker===void 0?{}:{createWorker:e.createWorker,count:1}),this.pool.onMessage(n=>{this.onWorkerMessage(n.data)}),this.pool.onWorkerLost(()=>{this.onWorkerLost()}),this.pool.onWorkerAdded(n=>{this.sendFillConfig(n),n.addEventListener("message",r=>this.countWorkerResult(n,r))});for(const n of this.pool.workers)this.sendFillConfig(n),n.addEventListener("message",r=>this.countWorkerResult(n,r))}sendFillConfig(e){const n={terrain:this.terrain,customFillStoreUrl:this.customFillStoreUrl,structures:this.structures};e.postMessage({type:"config",config:n})}onWorkerMessage(e){if(e.type==="fillMesh"){this.applyMeshedFillResult(e);return}if(e.type==="fill")for(let n=0;n<e.indices.length;n++){const r=e.indices[n];if(e.gens[n]!==this.fillGen[r]){this.returnSpare({storeData:e.storeData[n],light:e.light[n]});continue}this.fillInflight.delete(r),pe.count(Gn.fillsLanded);const s=this.arraysOf(r);pp(this.blocks[r],{storeData:e.storeData[n],mightHaveVoxels:e.mightHaveVoxels[n],hasWater:e.hasWater[n],lod:e.lods[n],light:e.light[n]}),this.returnSpare(s),this.applyEdits(r)>0&&Hc(this.blocks[r],this.terrain),this.onBlockChanged(r)}}applyMeshedFillResult(e){const n=e.index;if(e.gen!==this.fillGen[n]){this.returnSpare({storeData:e.storeData,light:e.light});return}this.fillInflight.delete(n),pe.count(Gn.fillsLanded);const r=this.tileRects?.()??[],s=this.fillRects.get(n)===r;this.fillRects.delete(n);const i=this.arraysOf(n);if(pp(this.blocks[n],{storeData:e.storeData,mightHaveVoxels:e.mightHaveVoxels,hasWater:e.hasWater,lod:e.lod,light:e.light}),this.returnSpare(i),this.applyEdits(n)>0){Hc(this.blocks[n],this.terrain),this.onBlockChanged(n);return}if(!s){this.onBlockChanged(n);return}pe.count(Gn.meshesFromFill),this.onBlockChanged(n,{terrain:e.terrain,water:e.water})}countWorkerResult(e,n){const r=n.data;if(r?.type!=="fill"&&r?.type!=="fillMesh")return;const s=(this.workerLoad.get(e)??0)-1;s<=0?this.workerLoad.delete(e):this.workerLoad.set(e,s),this.drainWorkerFills()}onWorkerLost(){this.warnedWorkerError||(this.warnedWorkerError=!0,console.warn("[fills] worker unavailable; falling back to the remaining workers or synchronous fills"));for(const e of this.fillInflight)this.syncFillBlock(e,this.fillLod[e],this.fillBorder[e]);this.fillInflight.clear(),this.workerLoad.clear(),this.drainWorkerFills()}resizeTo(e){for(;this.fillGen.length<e;)this.fillGen.push(0),this.fillLod.push(0),this.fillBorder.push(void 0);this.fillGen.length=e,this.fillLod.length=e,this.fillBorder.length=e;const n=r=>r>=e;for(const r of[this.pendingFills,this.fillInflight,this.pendingSyncFills])for(const s of[...r])n(s)&&r.delete(s);for(const r of[this.pendingCenter,this.pendingLod,this.pendingBorder,this.pendingSyncLods,this.pendingSyncBorder])for(const s of[...r.keys()])n(s)&&r.delete(s)}get pendingCount(){return this.pendingFills.size+this.pendingSyncFills.size}get inFlightCount(){return this.fillInflight.size}fillNow(e,n=0,r){this.fillGen[e]++,this.fillInflight.delete(e),this.fillLod[e]=n,this.fillBorder[e]=r,this.syncFillBlock(e,n,r)}requestFill(e,n,r,s,i){if(pe.count(Gn.fillsRequested,e.length),this.pool.workers.length===0){for(let o=0;o<e.length;o++){this.pendingSyncFills.add(e[o]),this.pendingSyncLods.set(e[o],r[o]);const a=s?.[o];a!==void 0&&this.pendingSyncBorder.set(e[o],a)}this.drainSyncFills();return}i!==void 0&&(this.pendingFocus=i);for(let o=0;o<e.length;o++){const a=e[o];this.fillGen[a]++,this.fillLod[a]=r[o],this.fillBorder[a]=s?.[o],this.pendingFills.add(a),this.pendingCenter.set(a,n[o]),this.pendingLod.set(a,r[o]),this.pendingBorder.set(a,s?.[o]??{})}this.drainWorkerFills()}drainWorkerFills(){const e=this.pool.workers;if(e.length===0||this.pendingFills.size===0)return;const n=[...this.pendingFills].sort((i,o)=>this.distanceSquaredTo(i)-this.distanceSquaredTo(o)),r=this.tileRects!==void 0;let s=0;for(const i of e){if((this.workerLoad.get(i)??0)>0)continue;const o=n.slice(s,s+Hb);if(o.length===0)return;s+=o.length;for(const u of o)this.pendingFills.delete(u);const a=o.map(u=>this.pendingCenter.get(u)??[0,0,0]),l=o.map(u=>this.pendingLod.get(u)??0),c=o.map(u=>this.pendingBorder.get(u)??{});r?this.sendMeshedFillBatch(o,a,l,c,i):this.sendFillBatch(o,a,l,c,i)}}distanceSquaredTo(e){const[n,r,s]=this.pendingCenter.get(e)??[0,0,0],[i,o,a]=this.pendingFocus;return(n-i)**2+(r-o)**2+(s-a)**2}drainSyncFills(){if(this.syncFillTimer!==void 0)return;const e=this.pendingSyncFills.values().next();if(e.done===!0)return;const n=e.value;this.pendingSyncFills.delete(n);const r=this.pendingSyncLods.get(n)??0;this.pendingSyncLods.delete(n);const s=this.pendingSyncBorder.get(n);this.pendingSyncBorder.delete(n),this.syncFillTimer=setTimeout(()=>{this.syncFillTimer=void 0,this.syncFillBlock(n,r,s),this.drainSyncFills()},0)}syncFillBlock(e,n=0,r){const s=this.blocks[e];if(s===void 0)return;const{dimensions:i,voxels:o,voxelSize:a}=wl(n);s.store.dims=i,s.store.voxels=o,s.store.scale=a,s.targetLod=n,(this.customFillStore??zE)(s.store,s.center,this.terrain,r),this.structures!==void 0&&jE(s.store,s.center,this.structures),this.applyEdits(e),Hc(s,this.terrain),this.onBlockChanged(e)}applyEdits(e){const n=this.editLayer;return n===void 0?0:n.applyToBlock(this.blocks[e])}takeSpare(e){const n=hd(wl(e).voxels);return this.spares.get(n)?.pop()??{storeData:new Uint8Array(n),light:new Uint8Array(n)}}returnSpare(e){const n=e.storeData.length;if(n===0)return;const r=this.spares.get(n)??[];r.length>=P3||(r.push(e),this.spares.set(n,r))}arraysOf(e){const n=this.blocks[e];return{storeData:n.store.data,light:n.light.data}}attachBatch(e,n){for(const r of e)this.fillInflight.add(r);this.workerLoad.set(n,(this.workerLoad.get(n)??0)+e.length)}gensOf(e){return e.map(n=>this.fillGen[n])}sendFillBatch(e,n,r,s,i){this.attachBatch(e,i);const o=pm(e.map((a,l)=>this.takeSpare(r[l])));i.postMessage({type:"fill",indices:e,centers:n,lods:r,borderSizes:s,gens:this.gensOf(e),...o.named},o.buffers)}sendMeshedFillBatch(e,n,r,s,i){this.attachBatch(e,i);const o=this.tileRects?.()??[];for(const l of e)this.fillRects.set(l,o);const a=pm(e.map((l,c)=>this.takeSpare(r[c])));i.postMessage({type:"fillMesh",indices:e,centers:n,lods:r,borderSizes:s,gens:this.gensOf(e),tileRects:o,...a.named},a.buffers)}dispose(){this.pool.dispose()}}const Ya=(t,e,n=e)=>{const r=[];for(let s=-e;s<=e;s++)for(let i=-n;i<=n;i++)for(let o=-e;o<=e;o++){const a={x:t.x+s,y:t.y+i,z:t.z+o};jb(a,t,e,n)&&r.push(a)}return r},jb=(t,e,n,r=n)=>{const s=t.x-e.x,i=t.y-e.y,o=t.z-e.z,a=n/r;return s*s+o*o+(i*a)**2<=n*n},Cd=(t,e=t)=>Ya({x:0,y:0,z:0},t,e).length,sc={full:3,coarse:4},$3={full:Number.POSITIVE_INFINITY,coarse:Number.POSITIVE_INFINITY},L3=t=>!Number.isFinite(t.full),Nr=(t,e,n=sc)=>{const r=t.x-e.x,s=t.y-e.y,i=t.z-e.z,o=r*r+s*s+i*i;return o<=n.full*n.full?0:o<=n.coarse*n.coarse?1:2},du=(t,e,n=sc)=>{const r=(s,i,o)=>bt*(1<<Nr({x:t.x+s,y:t.y+i,z:t.z+o},e,n));return{px:r(1,0,0),nx:r(-1,0,0),py:r(0,1,0),ny:r(0,-1,0),pz:r(0,0,1),nz:r(0,0,-1)}};class D3{blocks;radius;yRadius;bands=sc;query;cells=[];cellIndex;filled=[];free=[];onBlockReposition;onBlockRelease;fillClient;centerCell={x:0,y:0,z:0};constructor(e){this.radius=e.radius,this.yRadius=e.yRadius??e.radius,this.onBlockReposition=e.onBlockReposition,this.onBlockRelease=e.onBlockRelease;const n=Ya({x:0,y:0,z:0},this.radius,this.yRadius);this.cellIndex=new uh(n.length*2),this.blocks=n.map(r=>{const s=[r.x*rt[0],r.y*rt[1],r.z*rt[2]];return this.cells.push({x:r.x,y:r.y,z:r.z}),this.filled.push(!1),fp({center:s,lod:Nr(r,{x:0,y:0,z:0},this.bands)})}),this.query=(r,s,i)=>{const o=this.slotAt(r,s,i);return o===void 0?void 0:this.blocks[o]},this.fillClient=new O3({terrain:e.terrain,blocks:this.blocks,onBlockChanged:(r,s)=>{this.filled[r]=!0,e.onBlockChanged(r,s)},editLayer:e.editLayer,customFillStore:e.customFillStore,customFillStoreUrl:e.customFillStoreUrl,structures:e.structures,tileRects:e.tileRects,pool:e.pool,createWorker:e.createWorker})}slotAt(e,n,r){const[s,i,o]=_o(e,n,r),a=this.cellIndex.get(s,i,o);return a===void 0||!this.filled[a]?void 0:a}hasTerrain(e){return this.filled[e]}get fillPendingCount(){return this.fillClient.pendingCount}get fillInFlightCount(){return this.fillClient.inFlightCount}reshape(e,n,r){const s=Cd(e,n),i=this.blocks.length;for(let a=0;a<i;a++)this.onBlockRelease?.(a);this.radius=e,this.yRadius=n,this.bands=r,this.blocks.length=s,this.cells.length=s,this.filled.length=s;for(let a=i;a<s;a++){const l={x:0,y:0,z:0};this.blocks[a]=fp({center:[0,0,0],lod:Nr(l,l,this.bands)}),this.cells[a]=l,this.filled[a]=!1}this.cellIndex=new uh(s*2),this.free.length=0,this.fillClient.resizeTo(s);const o=this.centerCell;return this.fillFrom(o.x*rt[0],o.y*rt[1],o.z*rt[2])}fillFrom(e,n,r){const s=_o(e,n,r);this.centerCell={x:s[0],y:s[1],z:s[2]};const i=Ya(this.centerCell,this.radius,this.yRadius);for(let u=0;u<this.blocks.length;u++){this.cells[u]=i[u],this.cellIndex.set(i[u].x,i[u].y,i[u].z,u);const h=[i[u].x*rt[0],i[u].y*rt[1],i[u].z*rt[2]];this.blocks[u].center=h,this.filled[u]=!1,this.onBlockReposition(u,h)}const o=this.blocks.map((u,h)=>h);o.sort((u,h)=>this.distanceSquared(u,e,n,r)-this.distanceSquared(h,e,n,r));const[a,...l]=o,c=Nr(this.cells[a],this.centerCell,this.bands);this.blocks[a].targetLod=c,this.fillClient.fillNow(a,c,du(this.cells[a],this.centerCell,this.bands));for(const u of l)this.blocks[u].targetLod=Nr(this.cells[u],this.centerCell,this.bands);return this.fillClient.requestFill(l,l.map(u=>this.blocks[u].center),l.map(u=>Nr(this.cells[u],this.centerCell,this.bands)),l.map(u=>du(this.cells[u],this.centerCell,this.bands)),[e,n,r]),a}distanceSquared(e,n,r,s){const[i,o,a]=this.blocks[e].center;return(i-n)**2+(o-r)**2+(a-s)**2}lodOf(e){return Math.round(Math.log2(this.blocks[e].store.scale/bt))}scrollTo(e,n,r){const[s,i,o]=_o(e,n,r);if(s===this.centerCell.x&&i===this.centerCell.y&&o===this.centerCell.z)return;const a={x:s,y:i,z:o};pe.begin(Qe.scrollCells);const l=Ya(a,this.radius,this.yRadius);pe.end(Qe.scrollCells);const c=[];pe.begin(Qe.scrollEvict);for(let f=0;f<this.blocks.length;f++){const m=this.cells[f];if(this.cellIndex.get(m.x,m.y,m.z)!==f)continue;if(!jb(m,a,this.radius,this.yRadius)){this.onBlockRelease?.(f),this.cellIndex.delete(m.x,m.y,m.z),this.free.push(f);continue}const p=Nr(m,a,this.bands);p!==this.lodOf(f)&&p!==this.blocks[f].targetLod&&(this.onBlockRelease?.(f),c.push(f),this.blocks[f].targetLod=p)}pe.end(Qe.scrollEvict);const u=[];pe.begin(Qe.scrollTeleport);for(const f of l){if(this.cellIndex.get(f.x,f.y,f.z)!==void 0)continue;const m=this.free.pop();if(m===void 0)throw new Error("[ChunkSphere] window pool exhausted");this.cells[m]=f,this.cellIndex.set(f.x,f.y,f.z,m);const p=[f.x*rt[0],f.y*rt[1],f.z*rt[2]];this.blocks[m].center=p,this.blocks[m].targetLod=Nr(f,a,this.bands),this.filled[m]=!1,this.onBlockReposition(m,p),u.push(m)}pe.end(Qe.scrollTeleport),this.centerCell=a;const h=[...u,...c];if(pe.count(Gn.scrolls),pe.count(Gn.blocksStreamed,h.length),h.length===0)return;pe.begin(Qe.scrollOrder);const d=h.sort((f,m)=>this.distanceSquared(f,e,n,r)-this.distanceSquared(m,e,n,r));pe.end(Qe.scrollOrder),pe.begin(Qe.scrollRequest),this.fillClient.requestFill(d,d.map(f=>this.blocks[f].center),d.map(f=>Nr(this.cells[f],this.centerCell,this.bands)),d.map(f=>du(this.cells[f],this.centerCell,this.bands)),[e,n,r]),pe.end(Qe.scrollRequest)}dispose(){this.fillClient.dispose()}}const Wb=32,mm=`usage: /world:radius <chunks> [chunks in Y]
chunks is how far the window reaches around the player, from 1 to ${Wb}, a chunk being 128 world units. A second number does the same up and down; smaller than the first it flattens the window, which suits a world with more ground than sky. Every block refills.`,gm=`usage: /world:lod off | auto | <full> <coarser>
full is how far full-resolution blocks reach and coarser how far the tier below it reaches; past that, blocks are coarsest. Each tier doubles the voxel size, so a block one tier out holds an eighth of the voxels and two tiers out a forty-ninth, which is what makes a wide window affordable. off keeps every block at full resolution however far away; auto puts the distances back to 3 and 4. Every block refills.`,ci=t=>{const e=t.lodBands,n=L3(e)?"every block at full detail":`full detail to ${e.full} chunks, coarser to ${e.coarse}, coarsest beyond`,r=(t.voxelBytes/1048576).toFixed(1);return`window radius ${t.chunkRadius} chunks (${t.chunkRadiusY} in Y), ${t.blocks.length} blocks, ${t.ringRadius} world units of sight; ${n}; ${r}MiB of voxels and light`};class N3{commands;constructor(e){this.commands=e}run(e){const[n,...r]=e.trim().toLowerCase().split(/\s+/);if(n==="/help")return this.help();const s=this.commands[n];return s===void 0?`unknown command "${e}" — try /help`:s.run(r)}names(){return this.help().map(e=>e.name).sort()}help(){return[{name:"/help",description:"list every command"},...Object.entries(this.commands).map(([e,n])=>({name:e,args:n.args,description:n.description}))]}}const Ki=t=>t instanceof Error?t.message:String(t),F3=(t,e)=>{const n=t[0],r=n!==void 0&&(n.includes(".")||n.startsWith("did:")),s=r?t.slice(1):t;return{account:r?n:e,name:s.join(" ").trim()}},B3=({renderer:t,workerPool:e,world:n,dayNight:r,weather:s,sound:i,atproto:o,multiplayer:a,health:l,places:c,placePublisher:u,defaultSeed:h,placeUri:d,navigate:f,togglePlaceEditor:m,script:p,resolution:y,setView:g,setPlayerVisible:b,setMoveSpeed:v,setLookSensitivity:x,setFlying:k,setNoClip:C,setDebugPerf:E,setShowStats:T,traceStart:A,traceMark:M,traceSnap:P,traceStop:S,setMultisampling:O})=>new N3({"/clock:day":{description:"jump to noon (t=300s)",run:()=>(r.jumpTo(300),"jumped to noon (t=300s)")},"/clock:sunset":{description:"jump to dusk (t=645s)",run:()=>(r.jumpTo(645),"jumped to dusk (t=645s)")},"/clock:night":{description:"jump to midnight (t=900s)",run:()=>(r.jumpTo(900),"jumped to midnight (t=900s)")},"/clock:sunrise":{description:"jump to dawn (t=1120s)",run:()=>(r.jumpTo(1120),"jumped to dawn (t=1120s)")},"/clock:time":{description:"jump to a second of the 20-minute cycle",args:"<seconds>",run:w=>{const R=Number(w[0]);return!Number.isFinite(R)||R<0?"usage: /clock:time <seconds>  (0..1200, wraps)":(r.jumpTo(R),`time set to ${R}s`)}},"/clock:speed":{description:"run the clock that many times fast (0 pauses)",args:"<multiplier>",run:w=>{const R=Number(w[0]);return!Number.isFinite(R)||R<0?"usage: /clock:speed <multiplier>  (0 pauses, 1 = real time)":(r.setSpeed(R),`clock speed set to ${R}×`)}},"/clock:live":{description:"resume the live clock",run:()=>(r.clearOverride(),"resumed the live clock")},"/clock:state":{description:"show the current clock state",run:()=>r.describe()},"/world:workers":{description:"report, pin, or reset the world's worker count",args:"auto|<0..8>",run:w=>{const R=w[0];if(R===void 0||R==="auto")return R==="auto"&&e.setAuto(),e.describe();const F=Number(R);return Number.isInteger(F)&&F>=0&&F<=8?(e.setCount(F),e.describe()):"usage: /world:workers auto|<0..8>  (0 runs fills and meshes on the main thread)"}},"/world:radius":{description:"how far the streamed block window reaches, in chunks of 128 units",args:"<chunks> [chunks in Y]",run:w=>{if(w.length===0)return`${ci(n)}
${mm}`;const R=Number(w[0]),F=w[1]===void 0?void 0:Number(w[1]),D=te=>te===void 0||Number.isInteger(te)&&te>=1&&te<=Wb;return!D(R)||!D(F)?mm:(n.reshape({chunkRadius:R,chunkRadiusY:F}),ci(n))}},"/world:lod":{description:"the distances at which blocks drop to coarser voxels, in chunks",args:"off|auto|<full> <coarser>",run:w=>{const R=w[0];if(R===void 0)return`${ci(n)}
${gm}`;if(R==="off")return n.reshape({lodBands:$3}),ci(n);if(R==="auto")return n.reshape({lodBands:sc}),ci(n);const F=Number(R),D=Number(w[1]);return!Number.isInteger(F)||!Number.isInteger(D)||F<1||D<F?gm:(n.reshape({lodBands:{full:F,coarse:D}}),ci(n))}},"/render:resolution":{description:"adapt the render resolution, or pin it",args:"auto|<0.1..1>",run:w=>{const R=w[0];if(R===void 0)return y.describe();if(R==="auto")return y.setAuto(),y.describe();const F=Number(R);return Number.isFinite(F)&&F>0&&F<=1?(y.setFixed(F),y.describe()):"usage: /render:resolution auto|<0.1..1>  (1 renders every display pixel)"}},"/trace:start":{description:"record a walk, to hand to somebody who was not there",args:"<what you are looking for>",run:w=>A(w.join(" "))},"/trace:mark":{description:"mark this moment of the walk, and what is wrong with it",args:"<what you see>",run:w=>M(w.join(" "))},"/trace:snap":{description:"write down this one moment, without recording a walk",args:"<what you see>",run:w=>P(w.join(" "))},"/trace:stop":{description:"end the walk being recorded and write it down",run:()=>S()},"/debug:stats":{description:"show or hide the statistics toast",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?T(!0):R==="off"?T(!1):R===void 0?T():"usage: /debug:stats [on|off]"}},"/render:perf":{description:"show or hide the frame-time readout",args:"[on|off]",run:w=>{const R=w[0];return R===void 0?E():R==="on"?E(!0):R==="off"?E(!1):"usage: /render:perf [on|off]  (no argument flips it)"}},"/render:msaa":{description:"turn multisampling on or off, which remakes the canvas and reuploads to it",args:"[on|off]",run:w=>{const R=w[0];return R===void 0?O():R==="on"?O(!0):R==="off"?O(!1):"usage: /render:msaa [on|off]  (no argument flips it)"}},"/render:triangles":{description:"show the current triangle count",run:()=>`triangles: ${t.triangleCount.toLocaleString()}`},"/render:occlusion":{description:"turn the occlusion culler on/off, set its query interval, or force a fresh query",args:"[on|off|force] [<frames>]",run:w=>{const R=w[0];if(R==="off")return t.occlusionEnabled=!1,"occlusion: off";if(R==="on")return t.occlusionEnabled=!0,`occlusion: on, query every ${t.occlusionIntervalFrames} frames`;if(R==="force")return t.forceOcclusionQuery(),`occlusion: a fresh query runs next frame; last query saw ${t.lastVisibleCount} chunks`;if(R!==void 0){const F=Number(R);return Number.isFinite(F)&&F>=1?(t.occlusionIntervalFrames=F,`occlusion: on, query every ${t.occlusionIntervalFrames} frames`):"usage: /render:occlusion [on|off|force] [<frames>]"}return`occlusion: ${t.occlusionEnabled?"on":"off"}, query every ${t.occlusionIntervalFrames} frames, last query saw ${t.lastVisibleCount} chunks, hidden ${t.occlusions}: ${t.occlusionBreakdown}`}},"/render:probe":{description:"draw every chunk in its own colour, showing the occlusion probe view",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?(t.probeDebug=!0,t.forceOcclusionQuery(),"probe view: on — the world shows the occlusion culler's render"):R==="off"?(t.probeDebug=!1,"probe view: off"):R===void 0?(t.probeDebug=!t.probeDebug,t.forceOcclusionQuery(),`probe view: ${t.probeDebug?"on":"off"}`):"usage: /render:probe [on|off]  (no argument flips it)"}},"/sound:volume":{description:"set the sound volume (0 mutes)",args:"<0..1>",run:w=>{const R=Number(w[0]);return Number.isFinite(R)?i.setVolume(R):i.describe()}},"/sound:state":{description:"show the sound state",run:()=>i.describe()},"/player:view":{description:"switch the camera between first and third person",args:"first|third",run:w=>{const R=w[0];return R==="first"||R==="third"?g(R):"usage: /player:view first|third"}},"/player:cube":{description:"show or hide the player cube",args:"show|hide",run:w=>{const R=w[0];return R==="show"?b(!0):R==="hide"?b(!1):"usage: /player:cube show|hide"}},"/player:speed":{description:"set (or show) the player's move speed, in units per second",args:"[n]",run:w=>{const R=Number(w[0]);return v(w[0]===void 0||!Number.isFinite(R)||R<=0?void 0:R)}},"/player:sensitivity":{description:"set (or show) the look sensitivity, in radians per pixel",args:"[n]",run:w=>{const R=Number(w[0]);return x(w[0]===void 0||!Number.isFinite(R)||R<=0?void 0:R)}},"/player:fly":{description:"turn flight on or off (no gravity; W follows the look)",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?k(!0):R==="off"?k(!1):R===void 0?k():"usage: /player:fly [on|off]  (no argument flips it)"}},"/player:no-clip":{description:"turn no-clip on or off (fly through solid blocks)",args:"[on|off]",run:w=>{const R=w[0];return R==="on"?C(!0):R==="off"?C(!1):R===void 0?C():"usage: /player:no-clip [on|off]  (no argument flips it)"}},"/player:heal":{description:"restore the player's hearts to full",run:()=>(l.heal(l.maxHp),`hearts restored to ${l.hp}`)},"/account:login":{description:"sign in through the Bluesky login popup",args:"[handle]",run:async w=>o.connect(w[0])},"/account:logout":{description:"sign out, and revoke the session that was signed in",run:async()=>o.signOut()},"/account:sync":{description:"upload new edits, then fetch and merge remote edit chunks",run:async()=>o.sync()},"/account:state":{description:"show which account is signed in",run:()=>o.describe()},"/multiplayer:start":{description:"bring the multiplayer mesh online",run:async()=>a.start()},"/multiplayer:stop":{description:"take the multiplayer mesh offline",run:async()=>a.stop()},"/multiplayer:state":{description:"show the multiplayer mesh's peers and connection state",run:()=>a.describe()},"/multiplayer:debug":{description:"show what every peer connection is doing",run:()=>a.describeDebug()},"/place:editor":{description:"open (or close) the place script editor",run:()=>m()},"/place:create":{description:`publish a new, empty place under your account, seeded from the world being played, and join it — modes: ${Ms.join(", ")} (default solo:edit)`,args:"<name> [mode]",run:async w=>{const R=w[w.length-1],F=Ms.find(H=>H===R),D=(F===void 0?w:w.slice(0,-1)).join(" ").trim();if(D==="")return`usage: /place:create <name> [${Ms.join("|")}]`;const te=Yu(h);te.manifest.name=D,F!==void 0&&(te.manifest.mode=F);try{const H=await u.publish(await Ia(te)),Q=Ls(H);if(Q===null)return`created — ${H}`;const N=await o.resolveHandle(Q.repo);return f(`/${N??Q.repo}/${Q.rkey}`),`created "${D}" — joining its world`}catch(H){return`create failed: ${Ki(H)}`}}},"/place:mode":{description:`sets this place's mode — modes: ${Ms.join(", ")}. Only the place's owner may change it.`,args:"<mode>",run:async w=>{const R=Ms.find(F=>F===w[0]);if(R===void 0)return`usage: /place:mode <mode>  (mode is one of ${Ms.join(", ")})`;if(Ls(d)===null)return"this isn't a published place — there's no mode to set";if(o.did===null)return"sign in first — use /account:login";try{const F=await c.recordAtUri(d);if(F.repo!==o.did)return"only this place's owner can change its mode";const D=await Zh(await c.file(F));return D.manifest.mode=R,await u.publish(await Ia(D)),`"${F.record.name}" is now ${R}`}catch(F){return`could not set mode: ${Ki(F)}`}}},"/place:publish":{description:"publish a place zip to your account — a file from this device, or a built-in demo by id",args:"[demo id]",run:w=>{const R=H=>u.publish(H).then(async Q=>{const N=Ls(Q);return N===null?`published — ${Q}`:`published — /big-mesh-studios/voxelscape/#/${await o.resolveHandle(N.repo)??N.repo}/${N.rkey}`},Q=>`publish failed: ${Ki(Q)}`),F=w[0];if(F!==void 0){const H=Xu(F);return H===null?`no demo "${F}" — /place:demos lists them`:Yy(H).then(Ia).then(R)}let D;const te=document.createElement("input");return te.type="file",te.accept=".zip,application/zip",te.style.display="none",te.onchange=()=>{const H=te.files?.[0];if(te.remove(),H===void 0){D("no zip picked");return}R(H).then(D)},te.oncancel=()=>{te.remove(),D("publish cancelled")},document.body.appendChild(te),te.click(),new Promise(H=>{D=H})}},"/place:published":{description:"list the places an account has published",args:"[handle]",run:async w=>{const R=w[0]??o.did;if(R==null)return"name the account whose places to list, or sign in first";try{const F=await c.list(R);return F.length===0?`${R} has published no places`:F.map(({record:D})=>{const[te,H,Q]=D.spawn;return`"${D.name}" — seed ${D.seed}, spawn ${te},${H},${Q}`}).join(`
`)}catch(F){return`nothing to list from ${R} — ${Ki(F)}`}}},"/place:join":{description:"join a place someone published, playing its world",args:"[handle] [name]",run:async w=>{const{account:R,name:F}=F3(w,o.did);if(R==null)return"name the account whose place to join, or sign in first";if(F==="")return"usage: /place:join [handle] [name]";try{const D=await c.find(R,F),te=await o.resolveHandle(D.repo);return f(`/${te??D.repo}/${D.rkey}`),`joining "${D.record.name}" — loading its world`}catch(D){return`no "${F}" from ${R} — ${Ki(D)}`}}},"/place:demos":{description:"list the built-in demo places",run:async()=>qu.map(w=>`${w.id} — ${w.manifest.name}`).join(`
`)||"no built-in demos"},"/place:demo":{description:"play a built-in demo place",args:"[id]",run:async w=>{const R=w[0]??qu[0]?.id;if(R===void 0)return"no built-in demos";const F=Xu(R);return F===null?`no demo "${R}" — /place:demos lists them`:(f(`/demos/${F.id}`),`opening the demo "${F.manifest.name}" — loading its world`)}},"/script:demo":{description:"load and run the bundled sample place script",run:async()=>p.demo()},"/script:state":{description:"show what the loaded script is doing",run:async()=>p.state()},"/script:talk":{description:"start talking to an NPC the script placed",args:"<id>",run:async w=>p.talk(w[0]??"")},"/script:choose":{description:"pick an option of the current conversation",args:"<1..n>",run:async w=>{const R=Number(w[0]);return Number.isInteger(R)?p.choose(R):"usage: /script:choose <option number>"}},"/script:leave":{description:"end the current conversation",run:async()=>p.leave()},"/weather":{description:"set or resume the weather",args:"clear|rain|thunder|snow|auto",run:w=>{const R=w[0];return R==="clear"||R==="rain"||R==="thunder"||R==="snow"||R==="auto"?(s.setWeather(R),`weather set to ${R}`):s.describe()}},"/fullscreen":{description:"enter or leave fullscreen",args:"true|false",run:async([w])=>{if(!!w||w===void 0&&document.fullscreenElement!==document.body)try{return await document.body.requestFullscreen(),"full screen request succeeded."}catch{return"full screen request failed."}try{return document.exitFullscreen(),"exit screen request succeeded."}catch{return"exit fullscreen failed."}}},"/clear":{description:"clear the console output",run:()=>""}}),Ei=600,Do=90,Md=420,Vb=90,So=Ei+Do+Md+Vb,Tl=-8,$r={sky:[.53,.81,.92],ambient:[.45,.5,.6],sunLight:[1,.98,.9],moonLight:[0,0,0]},rs={sky:[.95,.5,.25],ambient:[.28,.2,.18],sunLight:[1,.5,.2],moonLight:[.15,.2,.35]},Lr={sky:[.02,.03,.09],ambient:[.05,.07,.15],sunLight:[.05,.08,.15],moonLight:[.3,.4,.65]},qa=(t,e,n)=>t+(e-t)*n,ym=(t,e,n)=>[qa(t[0],e[0],n),qa(t[1],e[1],n),qa(t[2],e[2],n)],ss=(t,e,n,r)=>r<.5?ym(t,e,r*2):ym(e,n,(r-.5)*2),ic=t=>(t%So+So)%So,ds=(t,e,n,r,s)=>qa(n,s,(t-e)/(r-e)),Rd=t=>{const e=ic(t);return e<Ei?"day":e<Ei+Do?"sunset":e<Ei+Do+Md?"night":"sunrise"},U3=t=>{const e=ic(t);return e<300?ds(e,0,35,300,60):e<600?ds(e,300,60,600,35):e<690?ds(e,600,35,690,-25):e<1110?-25:ds(e,1110,-25,1200,35)},H3=t=>{const e=ic(t);return e<600?ds(e,0,60,600,120):e<690?ds(e,600,120,690,130):e<1110?ds(e,690,130,1110,250):ds(e,1110,250,1200,300)},j3=t=>{switch(Rd(t)){case"day":return $r;case"night":return Lr;case"sunset":{const e=(t-Ei)/Do;return{sky:ss($r.sky,rs.sky,Lr.sky,e),ambient:ss($r.ambient,rs.ambient,Lr.ambient,e),sunLight:ss($r.sunLight,rs.sunLight,Lr.sunLight,e),moonLight:ss($r.moonLight,rs.moonLight,Lr.moonLight,e)}}case"sunrise":{const e=(t-Ei-Do-Md)/Vb;return{sky:ss(Lr.sky,rs.sky,$r.sky,e),ambient:ss(Lr.ambient,rs.ambient,$r.ambient,e),sunLight:ss(Lr.sunLight,rs.sunLight,$r.sunLight,e),moonLight:ss(Lr.moonLight,rs.moonLight,$r.moonLight,e)}}}},W3=(t,e)=>{const n=t*Math.PI/180,r=e*Math.PI/180;return[Math.cos(n)*Math.cos(r),Math.sin(n),Math.cos(n)*Math.sin(r)]},V3=t=>{const e=ic(t),n=j3(e),r=U3(e),s=-r,i=W3(r,H3(e)),o=[-i[0],-i[1],-i[2]];return{phase:Rd(e),elapsed:t,sunDir:i,moonDir:o,sunLight:n.sunLight,moonLight:n.moonLight,ambient:n.ambient,skyColor:n.sky,sunElevation:r,moonElevation:s,sunVisible:r>Tl,moonVisible:s>Tl}};class G3{sun;sky=new Xn;ambient;sunMesh;moonMesh;skyDistance;elapsed=0;timeOverride=null;timeSpeed=1;constructor({skyDistance:e=600,sunSize:n=48,moonSize:r=32}={}){this.skyDistance=e,this.sun=new bd,this.sun.position.set(2,1,1),this.sky.add(this.sun),this.ambient=new yd(16777215,.6),this.sky.add(this.ambient);const s=new Lo({color:16773792});s.depthWrite=!1,this.sunMesh=new wn(new sh(n,n),s),this.sky.add(this.sunMesh);const i=new Lo({color:13620966});i.depthWrite=!1,this.moonMesh=new wn(new sh(r,r),i),this.sky.add(this.moonMesh)}shownTime(){return this.timeOverride??this.elapsed}tick(e,n){this.elapsed+=e*this.timeSpeed;const r=V3(this.timeOverride??this.elapsed);this.sun.color.set(r.sunLight[0],r.sunLight[1],r.sunLight[2]),this.sun.position.set(r.sunDir[0],r.sunDir[1],r.sunDir[2]),this.ambient.color.set(r.ambient[0],r.ambient[1],r.ambient[2]),this.ambient.intensity=1;const s=n.position;return this.sunMesh.position.set(s.x+r.sunDir[0]*this.skyDistance,s.y+r.sunDir[1]*this.skyDistance,s.z+r.sunDir[2]*this.skyDistance),this.sunMesh.lookAt(s.x,s.y,s.z),this.sunMesh.visible=r.sunElevation>Tl,this.moonMesh.position.set(s.x+r.moonDir[0]*this.skyDistance,s.y+r.moonDir[1]*this.skyDistance,s.z+r.moonDir[2]*this.skyDistance),this.moonMesh.lookAt(s.x,s.y,s.z),this.moonMesh.visible=r.moonElevation>Tl,r}jumpTo(e){this.timeOverride=e}clearOverride(){this.timeOverride=null}setSpeed(e){this.timeSpeed=e}describe(){const e=this.shownTime();return`phase: ${Rd(e)} | t=${e.toFixed(1)}s | speed=${this.timeSpeed}× | live=${this.timeOverride===null}`}}const bm=2,Y3=.55,q3=.18,X3=.5,Z3=.18,J3=.3,Q3=1.4,ba=.6,K3=343,vm="/big-mesh-studios/voxelscape/audio/rain.ogg",wm="/big-mesh-studios/voxelscape/audio/thunder.ogg",eO=.9,tO=t=>{const e=Math.max(0,t);return{delay:e/K3,gain:Math.exp(-e/160)}},_m=(t,e,n)=>{const r=Math.floor(t.sampleRate*e),s=t.createBuffer(1,r,t.sampleRate),i=s.getChannelData(0);if(n){let o=0;for(let a=0;a<r;a++){const l=Math.random()*2-1;o=(o+.02*l)/1.02,i[a]=o*3.5}}else for(let o=0;o<r;o++)i[o]=Math.random()*2-1;return s};class nO{ctx=null;master=null;whiteBuffer=null;brownBuffer=null;rain=null;rainBody=null;wind=null;rainLoop=null;rainLoopLoaded=!1;thunderBuffer=null;lfo=null;lastCamera=null;volume=1;unlock(){if(this.ctx!==null){this.ctx.state==="suspended"&&this.ctx.resume();return}const e=window.AudioContext??window.webkitAudioContext;if(e===void 0)return;const n=new e;this.ctx=n,this.master=n.createGain(),this.master.gain.value=this.volume,this.master.connect(n.destination),this.whiteBuffer=_m(n,bm,!1),this.brownBuffer=_m(n,bm,!0),this.rain=this.startLoop(n,this.whiteBuffer,"lowpass",2400,.4,0);const r=n.createOscillator();r.frequency.value=.35;const s=n.createGain();s.gain.value=400,r.connect(s),s.connect(this.rain.filter.frequency),r.start(),this.lfo=r,this.rainBody=this.startLoop(n,this.brownBuffer,"lowpass",500,.7,0),this.wind=this.startLoop(n,this.brownBuffer,"bandpass",420,.6,0),this.loadRainLoop(n),this.loadThunder(n)}async loadRainLoop(e){try{const n=await fetch(vm);if(!n.ok)throw new Error(`${vm}: ${n.status}`);const r=await e.decodeAudioData(await n.arrayBuffer());if(this.ctx!==e)return;this.rainLoop=this.startLoop(e,r,"highpass",40,.7,0),this.rainLoopLoaded=!0}catch(n){console.warn("[sound] rain recording not loaded; using procedural bed.",n)}}async loadThunder(e){try{const n=await fetch(wm);if(!n.ok)throw new Error(`${wm}: ${n.status}`);const r=await e.decodeAudioData(await n.arrayBuffer());if(this.ctx!==e)return;this.thunderBuffer=r}catch(n){console.warn("[sound] thunder recording not loaded; using synthesized thunder.",n)}}startLoop(e,n,r,s,i,o){const a=e.createBufferSource();a.buffer=n,a.loop=!0;const l=e.createBiquadFilter();l.type=r,l.frequency.value=s,l.Q.value=i;const c=e.createGain();return c.gain.value=o,a.connect(l),l.connect(c),c.connect(this.master),a.start(),{source:a,filter:l,gain:c}}tick(e,n,r){this.lastCamera=n;const s=this.ctx;if(s===null||this.rain===null||this.rainBody===null||this.wind===null)return;const{weather:i,intensity:o}=r,a=i==="rain"||i==="thunder",l=i==="snow"?Q3:1,c=s.currentTime;this.rain.gain.gain.setTargetAtTime(a?o*(this.rainLoopLoaded?q3:X3):0,c,ba),this.rainLoop!==null&&this.rainLoop.gain.gain.setTargetAtTime(a?o*Y3:0,c,ba),this.rainBody.gain.gain.setTargetAtTime(a?o*Z3:0,c,ba),this.wind.gain.gain.setTargetAtTime(o*J3*l,c,ba)}thunderStrike(e,n){const r=this.ctx;if(r===null)return;const s=this.lastCamera,i=s===null?60:Math.hypot(e-s.position.x,n-s.position.z),{delay:o,gain:a}=tO(i),l=r.currentTime+o,c=Math.min(1,a*eO);this.thunderBuffer!==null?this.playThunderClap(r,l,c):(this.playCrack(r,l,c),this.playRumble(r,l+.05+Math.random()*.1,c)),this.playSubRumble(r,l,c)}playThunderClap(e,n,r){const s=e.createBufferSource();s.buffer=this.thunderBuffer,s.playbackRate.value=.92+Math.random()*.16;const i=e.createGain();i.gain.setValueAtTime(0,n),i.gain.linearRampToValueAtTime(r,n+.02),s.connect(i),i.connect(this.master);const o=this.thunderBuffer.duration;s.start(n),s.stop(n+o+.05)}playSubRumble(e,n,r){const s=e.createOscillator();s.type="sine",s.frequency.value=42+Math.random()*14;const i=e.createGain(),o=2.5+Math.random()*1.5;i.gain.setValueAtTime(0,n+.15),i.gain.linearRampToValueAtTime(r*.2,n+.25),i.gain.exponentialRampToValueAtTime(.001,n+.15+o),s.connect(i),i.connect(this.master),s.start(n+.15),s.stop(n+.15+o)}playCrack(e,n,r){const s=e.createBufferSource();s.buffer=this.whiteBuffer;const i=e.createBiquadFilter();i.type="highpass",i.frequency.value=1200;const o=e.createGain(),a=.08+Math.random()*.05;o.gain.setValueAtTime(0,n),o.gain.linearRampToValueAtTime(r*.5,n+.005),o.gain.exponentialRampToValueAtTime(.001,n+a),s.connect(i),i.connect(o),o.connect(this.master),s.start(n),s.stop(n+a+.05)}playRumble(e,n,r){const s=2+Math.random()*2,i=e.createBufferSource();i.buffer=this.brownBuffer;const o=e.createBiquadFilter();o.type="lowpass",o.frequency.setValueAtTime(240+Math.random()*160,n),o.frequency.exponentialRampToValueAtTime(60,n+s);const a=e.createGain();a.gain.setValueAtTime(0,n),a.gain.linearRampToValueAtTime(r,n+.04),a.gain.exponentialRampToValueAtTime(.001,n+s),i.connect(o),o.connect(a),a.connect(this.master),i.start(n),i.stop(n+s+.1);const l=e.createOscillator();l.type="sine",l.frequency.value=46+Math.random()*16;const c=e.createGain();c.gain.setValueAtTime(0,n),c.gain.linearRampToValueAtTime(r*.25,n+.05),c.gain.exponentialRampToValueAtTime(.001,n+s*.9),l.connect(c),c.connect(this.master),l.start(n),l.stop(n+s)}setVolume(e){this.volume=Math.max(0,Math.min(1,e));const n=this.ctx;return this.master!==null&&n!==null&&this.master.gain.setTargetAtTime(this.volume,n.currentTime,.1),`volume set to ${this.volume.toFixed(2)}`}describe(){return`sound: ${this.ctx?.state??"locked (waiting for input)"} | volume=${this.volume.toFixed(2)}`}dispose(){this.rain?.source.stop(),this.rainBody?.source.stop(),this.wind?.source.stop(),this.rainLoop?.source.stop(),this.lfo?.stop(),this.rain=null,this.rainBody=null,this.wind=null,this.rainLoop=null,this.rainLoopLoaded=!1,this.thunderBuffer=null,this.lfo=null;const e=this.ctx;this.ctx=null,this.master=null,this.whiteBuffer=null,this.brownBuffer=null,e!==null&&e.close()}}const rO=1.5*So,sO=7*So,xm=60,iO=240,oO=t=>{let e=t|0;return()=>{e=e+1831565813|0;let n=Math.imul(e^e>>>15,1|e);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}},aO=(t,e)=>oO(t^Math.imul(e,2654435769)|0),lO=t=>t<.5?"rain":t<.8?"thunder":"snow",cO=(t,e)=>{if(e<0)return{weather:"clear",startedAt:-1/0,endsAt:0};let n=0;for(let r=0;;r++){const s=aO(t,r),i=n+rO+s()*sO;if(e<i)return{weather:"clear",startedAt:n,endsAt:i};const o=xm+s()*(iO-xm),a=i+o;if(e<a)return{weather:lO(s()),startedAt:i,endsAt:a};n=a}},uO={rain:{skyTint:[.42,.47,.52],ambientScale:.65,sunScale:.55,moonScale:.85},thunder:{skyTint:[.16,.18,.24],ambientScale:.4,sunScale:.25,moonScale:.7},snow:{skyTint:[.68,.74,.78],ambientScale:.85,sunScale:.7,moonScale:1}},hO=t=>t==="clear"?{skyTint:[.53,.81,.92],ambientScale:1,sunScale:1,moonScale:1}:uO[t],dO=(t,e,n)=>[t[0]+(e[0]-t[0])*n,t[1]+(e[1]-t[1])*n,t[2]+(e[2]-t[2])*n],fu=(t,e)=>[t[0]*e,t[1]*e,t[2]*e],fO=(t,e,n)=>{const r=Math.max(0,Math.min(1,n));if(r===0)return t;const s=hO(e);return{...t,skyColor:dO(t.skyColor,s.skyTint,r),ambient:fu(t.ambient,1+(s.ambientScale-1)*r),sunLight:fu(t.sunLight,1+(s.sunScale-1)*r),moonLight:fu(t.moonLight,1+(s.moonScale-1)*r)}},pO=24301,mO=5e3,gO=4e3,yO=5,bO=3.5,km=150,vO=.18,Sm=.3,wO=.3,Em={count:mO,spreadX:100,spreadZ:100,tileSize:200,minY:-80,maxY:220,fallSpeed:90,windX:4,windZ:1,sizeMin:[.05,.6],sizeMax:[.1,1.8],lifeMin:.8,lifeMax:1.8},Am={count:gO,spreadX:120,spreadZ:120,tileSize:240,minY:-80,maxY:240,fallSpeed:6,windX:2,windZ:.5,sizeMin:[.1,.1],sizeMax:[.2,.2],lifeMin:6,lifeMax:10},_O=t=>{const e=t.count,n=new Float32Array(e*4*3),r=new Float32Array(e*4*2),s=new Float32Array(e*4*3),i=new Float32Array(e*4),o=new Float32Array(e*4),a=new Float32Array(e*4*2),l=new Float32Array(e*4),c=new Float32Array(e*4*2),u=new Uint16Array(e*6),h=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let d=0;d<e;d++){const f=(Math.random()*2-1)*t.spreadX,m=(Math.random()*2-1)*t.spreadZ,p=t.minY+Math.random()*(t.maxY-t.minY),y=t.lifeMin+Math.random()*(t.lifeMax-t.lifeMin),g=Math.random()*y,b=t.sizeMin[0]+Math.random()*(t.sizeMax[0]-t.sizeMin[0]),v=t.sizeMin[1]+Math.random()*(t.sizeMax[1]-t.sizeMin[1]),x=Math.random()*Math.PI*2,k=t.fallSpeed*(.85+Math.random()*.3),C=(t.windX+(Math.random()*2-1)*2)*y,E=-k*y,T=(t.windZ+(Math.random()*2-1)*2)*y,A=d*4;for(let M=0;M<4;M++){const P=A+M,S=P*3,O=P*2;n[S]=f,n[S+1]=p,n[S+2]=m,s[S]=C,s[S+1]=E,s[S+2]=T,r[O]=h[M][0],r[O+1]=h[M][1],c[O]=(h[M][0]+1)/2,c[O+1]=(h[M][1]+1)/2,i[P]=y,o[P]=g,a[O]=b,a[O+1]=v,l[P]=x}u[d*6+0]=A,u[d*6+1]=A+1,u[d*6+2]=A+2,u[d*6+3]=A,u[d*6+4]=A+2,u[d*6+5]=A+3}return{positions:n,corners:r,drifts:s,lives:i,offsets:o,sizes:a,spins:l,uvs:c,indices:u}},Tm=t=>{const e=_O(t),n=new Jr;return n.setAttribute("particlePos",new $e(e.positions,3)),n.setAttribute("corner",new $e(e.corners,2)),n.setAttribute("drift",new $e(e.drifts,3)),n.setAttribute("life",new $e(e.lives,1)),n.setAttribute("offset",new $e(e.offsets,1)),n.setAttribute("size",new $e(e.sizes,2)),n.setAttribute("spin",new $e(e.spins,1)),n.setAttribute("uv",new $e(e.uvs,2)),n.setIndex(e.indices),n};class Cm extends ur{time=0;intensity=0;tint=[.75,.8,.9];sway=0;disc=!1;tileSize=200;camPos=[0,0,0];timeUniform;intensityUniform;tintUniform;swayUniform;camPosUniform;tileUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!1,this.side=Qr.DoubleSide}setup(e,n){this.timeUniform=e.materialUniform("time","float",()=>this.time),this.intensityUniform=e.materialUniform("intensity","float",()=>this.intensity),this.tintUniform=e.materialUniform("tint","vec3",()=>this.tint),this.swayUniform=e.materialUniform("sway","float",()=>this.sway),this.camPosUniform=e.materialUniform("camPos","vec3",()=>this.camPos),this.tileUniform=e.materialUniform("tileSize","float",()=>this.tileSize)}buildVertexBody(e){const n=this.timeUniform??V(0),r=this.swayUniform??V(0),s=this.camPosUniform??ze(0),i=this.tileUniform??V(200),o=e.attribute("particlePos","vec3"),a=e.attribute("corner","vec2"),l=e.attribute("drift","vec3"),c=e.attribute("life","float"),u=e.attribute("offset","float"),h=e.attribute("size","vec2"),d=e.attribute("spin","float"),f=e.attribute("uv","vec2"),m=Wa(n.add(u),c).div(c).toVar(),p=Vn(V(0),V(.08),m),y=V(1).sub(Vn(V(.8),V(1),m)),g=p.mul(y).toVar(),b=ze(o.x.add(l.x.mul(m)).add(xl(n.mul(V(1.4)).add(d)).mul(r).mul(V(1).sub(m))),o.y.add(l.y.mul(m)),o.z.add(l.z.mul(m)).add(xl(n.mul(V(1.1)).add(d)).mul(r).mul(V(1).sub(m)))).toVar(),v=i.mul(V(.5)),x=Wa(b.x.sub(s.x).add(v),i).sub(v).toVar(),k=Wa(b.z.sub(s.z).add(v),i).sub(v).toVar(),C=ze(s.x.add(x),s.y.add(b.y),s.z.add(k)).toVar(),E=e.viewMatrix.mul(Ie(C,V(1))).toVar(),T=a.mul(h.mul(g)).toVar(),A=E.xyz.add(ze(T.x,T.y,V(0))).toVar();return e.varying("vUv","vec2").assign(f),e.varying("vFade","float").assign(g),e.projectionMatrix.mul(Ie(A,E.w))}buildFragmentBody(e){const n=e.varying("vUv","vec2"),r=e.varying("vFade","float"),s=this.tintUniform??ze(1),i=this.intensityUniform??V(0),o=n.sub(Vt(.5)).toVar();let a;if(this.disc){const l=o.length();a=V(1).sub(Vn(V(.42),V(.5),l))}else{const l=Vt(1).sub(Vn(V(.4),V(.5),o.abs().mul(Vt(2))));a=l.x.mul(l.y)}return Ie(s,a.mul(r).mul(i))}}class Mm{mesh;material;level=0;rampSeconds;constructor(e,n,r){this.material=e,this.mesh=new wn(n,e),this.mesh.visible=!1,this.rampSeconds=r}setTarget(e,n){const r=n/this.rampSeconds;this.level=this.level<e?Math.min(e,this.level+r):Math.max(e,this.level-r),this.material.intensity=this.level,this.mesh.visible=this.level>.005}follow(e,n){this.material.time=n,this.material.camPos=[e.position.x,e.position.y,e.position.z],this.mesh.position.copy(e.position)}}const Rm=(t,e,n,r,s,i,o,a)=>{const l=[t,e,n];for(let c=1;c<o;c++){const u=c/o;l.push(t+(r-t)*u+(Math.random()*2-1)*a,e+(s-e)*u,n+(i-n)*u+(Math.random()*2-1)*a)}return l.push(r,s,i),l},Im=(t,e)=>{const n=[];for(let r=0;r+3<=e.length-3;r+=3)n.push(e[r],e[r+1],e[r+2],e[r+3],e[r+4],e[r+5]);t.setPositions(n),t.getAttribute("instanceStart").needsUpdate=!0,t.getAttribute("instanceEnd").needsUpdate=!0};class xO{groundHeight;onStrike;seed;rampSeconds;strikeMean;rain;snow;weather=new Xn;bolts;flashMesh;flashMaterial;forcedWeather=null;intensity=0;time=0;lastClockSeconds=0;inThunder=!1;nextStrikeAt=0;strike=null;flashOpacity=0;scheduleWeather="clear";tintWeather="clear";constructor(e){const{groundHeight:n,onStrike:r,seed:s,rampSeconds:i,strikeInterval:o}=e;this.groundHeight=n,this.onStrike=r,this.seed=s??pO,this.rampSeconds=i??yO,this.strikeMean=o??bO,this.rain=new Mm(new Cm,Tm(Em),this.rampSeconds),this.rain.material.tileSize=Em.tileSize,this.rain.material.tint=[.75,.8,.9],this.rain.material.sway=.4,this.snow=new Mm(new Cm,Tm(Am),this.rampSeconds),this.snow.material.tileSize=Am.tileSize,this.snow.material.tint=[.95,.97,1],this.snow.material.sway=1.6,this.snow.material.disc=!0,this.bolts=[this.makeBolt(),this.makeBolt()],this.weather.add(this.rain.mesh,this.snow.mesh,...this.bolts),this.flashMaterial=new Lo({color:16777215,transparent:!0,opacity:0}),this.flashMaterial.blending=Vs.AdditiveBlending,this.flashMaterial.depthTest=!1,this.flashMaterial.depthWrite=!1,this.flashMesh=new wn(new Hi(3e3,3e3,3e3),this.flashMaterial),this.flashMesh.visible=!1,this.weather.add(this.flashMesh)}makeBolt(){const e=new kd({color:13623551,linewidth:.7,worldUnits:!0,transparent:!0,opacity:0});e.blending=Vs.AdditiveBlending,e.depthWrite=!1;const n=new OR(new cb,e);return n.visible=!1,n}currentState(e){return this.forcedWeather!==null?{weather:this.forcedWeather,startedAt:-1/0,endsAt:1/0}:cO(this.seed,e)}spawnStrike(e,n){const r=this.groundHeight(e,n);Number.isFinite(r)&&(this.onStrike?.(e,n),this.strike={main:this.bolts[0],branch:this.bolts[1],state:"active",timeLeft:vO,x:e,z:n,groundY:r,topY:r+60+Math.random()*40},this.strike.main.material.opacity=1,this.strike.main.visible=!0,this.strike.branch!==null&&(this.strike.branch.material.opacity=.7,this.strike.branch.visible=!0),this.flashOpacity=.9,this.rewriteStrike())}rewriteStrike(){const e=this.strike;if(e===null)return;const n=Math.hypot(e.x,e.z),r=Math.max(3,n*.15),s=Rm(e.x,e.topY,e.z,e.x,e.groundY,e.z,9,r);if(Im(e.main.geometry,s),e.branch!==null){const i=e.x+(Math.random()*2-1)*r*1.5,o=e.z+(Math.random()*2-1)*r*1.5,a=e.groundY+(e.topY-e.groundY)*(.4+Math.random()*.25),l=i+(Math.random()*2-1)*30,c=o+(Math.random()*2-1)*30,u=e.groundY+10+Math.random()*30,h=Rm(i,a,o,l,u,c,5,r*.6);Im(e.branch.geometry,h)}}updateStrike(e){const n=this.strike;if(n!==null)if(n.timeLeft-=e,n.state==="active")n.timeLeft<=0?(n.state="fade",n.timeLeft=Sm):this.rewriteStrike();else{const r=1-Math.max(0,n.timeLeft)/Sm;n.main.material.opacity=1-r,n.branch!==null&&(n.branch.material.opacity=(1-r)*.7),n.timeLeft<=0&&(n.main.visible=!1,n.branch!==null&&(n.branch.visible=!1),this.strike=null)}}tick(e,n,r){this.time+=e,this.lastClockSeconds=r;const s=this.currentState(r).weather;s!==this.scheduleWeather&&(this.scheduleWeather=s,s!=="clear"&&(this.tintWeather=s));const i=s==="clear"?0:1,o=e/this.rampSeconds;return this.intensity=this.intensity<i?Math.min(i,this.intensity+o):Math.max(i,this.intensity-o),this.intensity<=.001&&(this.tintWeather="clear"),this.rain.setTarget(s==="rain"||s==="thunder"?1:0,e),this.snow.setTarget(s==="snow"?1:0,e),this.rain.follow(n,this.time),this.snow.follow(n,this.time),s==="thunder"&&this.intensity>.4?(this.inThunder||(this.inThunder=!0,this.nextStrikeAt=this.time+.5+Math.random()*1.5),this.strike===null&&this.time>=this.nextStrikeAt&&(this.spawnStrike(n.position.x+(Math.random()*2-1)*km,n.position.z+(Math.random()*2-1)*km),this.nextStrikeAt=this.time+this.strikeMean*(.4+Math.random()))):this.inThunder=!1,this.updateStrike(e),this.flashOpacity>0&&(this.flashOpacity=Math.max(0,this.flashOpacity-e/wO)),this.flashMesh.position.copy(n.position),this.flashMaterial.opacity=this.flashOpacity,this.flashMesh.visible=this.flashOpacity>.002,{weather:this.tintWeather,intensity:this.intensity}}setWeather(e){this.forcedWeather=e==="auto"?null:e}describe(){const e=this.currentState(this.lastClockSeconds),n=this.forcedWeather===null?"auto":"forced",r=Number.isFinite(e.endsAt)?`until ${e.endsAt.toFixed(0)}s`:"indefinite";return`weather: ${e.weather} (${n}) | intensity=${this.intensity.toFixed(2)} | ${r}`}}const kO=({groundHeightAt:t})=>{const e=new G3,n=new nO,r=new xO({groundHeight:t,onStrike:(a,l)=>n.thunderStrike(a,l)}),s=new AbortController,i=()=>{n.unlock(),s.abort()},{signal:o}=s;return window.addEventListener("pointerdown",i,{signal:o}),window.addEventListener("keydown",i,{signal:o}),{dayNight:e,weather:r,sound:n,sky:e.sky,weatherEffects:r.weather,tick(a,l){const c=e.tick(a,l),u=r.tick(a,l,c.elapsed);return n.tick(a,l,u),fO(c,u.weather,u.intensity)},dispose(){n.dispose(),s.abort()}}},SO=1440*60*1e3,EO=1e4,AO=8;class TO{wallNow;self=null;rosterDids=new Set;samples=new Map;constructor(e={}){this.wallNow=e.wallNow??(()=>Date.now())}setSelf(e){this.self=e}setRoster(e){this.rosterDids.clear();for(const n of e)this.rosterDids.add(n)}get referenceDid(){const e=this.self;if(e===null)return null;let n=e;for(const r of this.rosterDids)r<n&&(n=r);return n}observe(e,n,r,s){const i=s-n;if(!Number.isFinite(i)||i<0||i>EO||!Number.isFinite(r))return;const o=r-(n+s)/2;if(!Number.isFinite(o)||Math.abs(o)>SO)return;const a=this.samples.get(e)??[];a.push({offset:o,rtt:i}),a.length>AO&&a.shift(),this.samples.set(e,a)}offsetTo(e){const n=this.samples.get(e);if(n===void 0||n.length===0)return null;let r=n[0];for(const s of n)s.rtt<r.rtt&&(r=s);return r.offset}get offset(){const e=this.referenceDid;return e===null?0:this.offsetTo(e)??0}now(){return this.wallNow()+this.offset}forget(e){this.samples.delete(e),this.rosterDids.delete(e)}reset(){this.self=null,this.rosterDids.clear(),this.samples.clear()}describe(){const e=this.referenceDid,n=[...this.samples.entries()].map(([r,s])=>`${r}=${s.map(i=>i.offset).join(",")}`).join(" ");return`reference=${e??"none"} offset=${this.offset}ms ${n}`}}const CO=(t,e)=>t.filter(n=>n.scope===e).map(n=>n.did),MO=1e5,RO=255,mr=64,zm=64,IO=256,zO=32,PO=1e3,OO=1e6,$O=t=>!Array.isArray(t)||t.length!==3?!1:t.every(e=>typeof e=="number"&&Number.isInteger(e)&&Math.abs(e)<=MO),Cn=(t,e)=>typeof t=="string"&&t.length>=1&&t.length<=e,Pm=t=>typeof t=="number"&&Number.isFinite(t)&&Math.abs(t)<=OO,pu=t=>Cn(t,IO),LO=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return!Cn(e.id,mr)||!pu(e.producer)||typeof e.at!="number"||!Number.isFinite(e.at)||e.at<0?!1:e.kind==="block-broken"||e.kind==="block-placed"?$O(e.voxel)&&typeof e.blockId=="number"&&Number.isInteger(e.blockId)&&e.blockId>=0&&e.blockId<=RO:e.kind==="entity-killed"?Cn(e.entityId,mr)&&(e.by===""||pu(e.by)):e.kind==="player-joined"||e.kind==="player-left"?pu(e.player):e.kind==="entity-used"?Cn(e.entityId,mr)&&(e.item===""||Cn(e.item,zm)):e.kind==="entity-hit"?Cn(e.entityId,mr)&&typeof e.amount=="number"&&Number.isFinite(e.amount)&&e.amount>0&&e.amount<=PO&&Pm(e.attackerX)&&Pm(e.attackerZ):e.kind==="item-used"?Cn(e.item,zm):e.kind==="zone-entered"||e.kind==="zone-left"?Cn(e.zoneId,mr):e.kind==="npc-talk"||e.kind==="npc-leave"?Cn(e.npcId,mr):e.kind==="timer"?Cn(e.timerId,mr):e.kind==="player-touched"?Cn(e.entityId,mr):e.kind==="player-died"?e.cause===""||Cn(e.cause,mr):e.kind==="npc-choose"?Cn(e.npcId,mr)&&typeof e.option=="number"&&Number.isInteger(e.option)&&e.option>=0&&e.option<=zO:!1},DO=t=>{let e;if(typeof t=="string"||t instanceof Uint8Array)try{e=JSON.parse(typeof t=="string"?t:new TextDecoder().decode(t))}catch{return null}else e=t;return Array.isArray(e)&&e.every(LO)?e:null},Om=(t,e)=>t<e?-1:t>e?1:0,B4=(t,e)=>t.at-e.at||Om(t.producer,e.producer)||Om(t.id,e.id),Dr=(t,e)=>{const n=10**e;return Math.round(t*n)/n},Ai=1e5,NO=255,FO=512,BO=32,UO=32,HO=100,jO=t=>{const e=t;return e.type==="pose"&&e.v===1&&typeof e.seq=="number"&&typeof e.t=="number"&&typeof e.x=="number"&&typeof e.y=="number"&&typeof e.z=="number"&&typeof e.yaw=="number"&&typeof e.pitch=="number"},WO=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return Number.isInteger(e.x)&&Number.isInteger(e.y)&&Number.isInteger(e.z)&&Math.abs(e.x)<=Ai&&Math.abs(e.y)<=Ai&&Math.abs(e.z)<=Ai&&Number.isInteger(e.id)&&e.id>=0&&e.id<=NO&&typeof e.ts=="number"&&Number.isFinite(e.ts)&&e.ts>=0},VO=t=>{const e=t;return e.type!=="edit"||e.v!==1||typeof e.seq!="number"||typeof e.t!="number"?!1:Array.isArray(e.edits)&&e.edits.length<=FO&&e.edits.every(WO)},GO=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return typeof e.id=="string"&&e.id.length>=1&&e.id.length<=64&&typeof e.x=="number"&&Number.isFinite(e.x)&&Math.abs(e.x)<=Ai&&typeof e.y=="number"&&Number.isFinite(e.y)&&Math.abs(e.y)<=Ai&&typeof e.z=="number"&&Number.isFinite(e.z)&&Math.abs(e.z)<=Ai&&typeof e.yaw=="number"&&Number.isFinite(e.yaw)},YO=t=>{const e=t;return e.type!=="script-entity"||e.v!==1||typeof e.seq!="number"||typeof e.t!="number"?!1:Array.isArray(e.updates)&&e.updates.length<=BO&&e.updates.every(GO)},qO=t=>{const e=t;return e.type!=="script-event"||e.v!==1||typeof e.seq!="number"||typeof e.t!="number"||!Array.isArray(e.events)||e.events.length>UO?!1:DO(e.events)!==null},XO=t=>{const e=t;return e.type==="player-damage"&&e.v===1&&typeof e.seq=="number"&&typeof e.t=="number"&&typeof e.target=="string"&&e.target.length>=1&&e.target.length<=256&&Number.isInteger(e.amount)&&e.amount>=1&&e.amount<=HO},ZO=1e13,$m=t=>typeof t=="number"&&Number.isFinite(t)&&t>=0&&t<=ZO,JO=t=>{const e=t;return e.type==="time"&&e.v===1&&$m(e.t1)&&(e.t2===void 0||$m(e.t2))},ui=t=>t.type==="pose"?JSON.stringify({v:1,type:"pose",seq:t.seq,t:Math.round(t.t),x:Dr(t.x,2),y:Dr(t.y,2),z:Dr(t.z,2),yaw:Dr(t.yaw,4),pitch:Dr(t.pitch,4)}):t.type==="edit"?JSON.stringify({v:1,type:"edit",seq:t.seq,t:Math.round(t.t),edits:t.edits}):t.type==="player-damage"?JSON.stringify({v:1,type:"player-damage",seq:t.seq,t:Math.round(t.t),target:t.target,amount:t.amount}):t.type==="script-entity"?JSON.stringify({v:1,type:"script-entity",seq:t.seq,t:Math.round(t.t),updates:t.updates.map(e=>({id:e.id,x:Dr(e.x,2),y:Dr(e.y,2),z:Dr(e.z,2),yaw:Dr(e.yaw,4)}))}):t.type==="time"?JSON.stringify({v:1,type:"time",t1:Math.round(t.t1),...t.t2!==void 0?{t2:Math.round(t.t2)}:{}}):JSON.stringify({v:1,type:"script-event",seq:t.seq,t:Math.round(t.t),events:t.events}),QO=t=>{if(typeof t!="string"&&!(t instanceof Uint8Array))return null;let e;try{e=JSON.parse(typeof t=="string"?t:new TextDecoder().decode(t))}catch{return null}if(typeof e!="object"||e===null)return null;const n=e;return jO(n)||VO(n)||XO(n)||YO(n)||qO(n)||JO(n)?n:null},KO=2e4,e$=2e4;class mu{did;selfDid;onOpen;onPose;onEdits;onScriptEntities;onScriptEvents;onPlayerDamage;onTime;onClose;onError;wallNow;role;transport;phase="waiting";destroyed=!1;startedAt=Date.now();timer;lastError=null;constructor(e){this.did=e.did,this.selfDid=e.selfDid,this.onOpen=e.onOpen,this.onPose=e.onPose,this.onEdits=e.onEdits,this.onScriptEntities=e.onScriptEntities,this.onScriptEvents=e.onScriptEvents,this.onPlayerDamage=e.onPlayerDamage,this.onTime=e.onTime,this.onClose=e.onClose,this.onError=e.onError,this.wallNow=e.wallNow??(()=>Date.now()),this.role=this.selfDid<this.did?"initiator":"responder",e.transport!==void 0?this.attach(e.transport):this.armTimer(KO,()=>this.fail("no incoming connection"))}get connected(){return this.phase==="open"}canAttach(){return!this.destroyed&&this.phase==="waiting"}attach(e){if(!this.canAttach()){e.destroy();return}this.clearTimer(),this.transport=e,this.wire()}sendPose(e,n){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(ui({v:1,type:"pose",seq:n,t:Date.now(),...e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendEdits(e,n){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(ui({v:1,type:"edit",seq:n,t:Date.now(),edits:e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendScriptEntities(e,n){if(!(this.destroyed||this.phase!=="open"||e.length===0))try{this.transport?.send(ui({v:1,type:"script-entity",seq:n,t:Date.now(),updates:e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendScriptEvents(e,n){if(!(this.destroyed||this.phase!=="open"||e.length===0))try{this.transport?.send(ui({v:1,type:"script-event",seq:n,t:Date.now(),events:e}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}sendPlayerDamage(e){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(ui(e))}catch(n){this.fail(n instanceof Error?n.message:String(n))}}sendTime(e,n){if(!(this.destroyed||this.phase!=="open"))try{this.transport?.send(ui({v:1,type:"time",t1:e,...n!==void 0?{t2:n}:{}}))}catch(r){this.fail(r instanceof Error?r.message:String(r))}}close(e="closed"){if(!this.destroyed){this.destroyed=!0,this.phase="closed",this.clearTimer();try{this.transport?.destroy()}catch{}this.onClose(this.did)}}describe(){const e=Math.round((Date.now()-this.startedAt)/1e3);return`role=${this.role} phase=${this.phase} up=${e}s${this.lastError!==null?` lastError=${this.lastError}`:""}`}wire(){this.phase="connecting",this.transport?.on("connect",()=>this.handleOpen()),this.transport?.on("data",e=>this.handleData(e)),this.transport?.on("close",()=>this.close("peer closed")),this.transport?.on("error",e=>this.fail(e.message,e.code)),this.armTimer(e$,()=>this.fail("connection did not open"))}handleOpen(){this.destroyed||(this.phase="open",this.clearTimer(),this.onOpen(this.did))}armTimer(e,n){this.clearTimer(),this.timer=setTimeout(n,e)}clearTimer(){this.timer!==void 0&&(clearTimeout(this.timer),this.timer=void 0)}handleData(e){if(this.destroyed)return;const n=QO(e);n!==null&&(n.type==="pose"?this.onPose(this.did,n):n.type==="edit"?this.onEdits(this.did,n.edits):n.type==="player-damage"?this.onPlayerDamage(this.did,n):n.type==="script-entity"?this.onScriptEntities(this.did,n.updates):n.type==="time"?n.t2===void 0?this.sendTime(n.t1,this.wallNow()):this.onTime(this.did,n.t1,n.t2):this.onScriptEvents(this.did,n.events))}fail(e,n){this.lastError=n!==void 0?`${n}: ${e}`:e,this.onError(this.did,e,n),this.close(e)}}const zs="app.bms.voxelscape.presence",gu="latest",Gb=t=>{let e=0;for(let n=0;n<t.length;n++)e=Math.imul(e,31)+t.charCodeAt(n)|0;return(e>>>0).toString(36)},t$=(t,e,n,r,s,i,o)=>({$type:zs,x:Math.round(t),y:Math.round(e),z:Math.round(n),seed:r,scope:s,...o!==void 0?{joinCode:o}:{},updatedAt:i}),n$=t=>{if(typeof t!="object"||t===null)return!1;const e=t;return e.$type===zs&&typeof e.x=="number"&&typeof e.y=="number"&&typeof e.z=="number"&&(e.seed===null||typeof e.seed=="number")&&typeof e.scope=="string"&&(e.joinCode===void 0||typeof e.joinCode=="string")&&typeof e.updatedAt=="number"},Lm=128,r$=(t,e)=>{const n=t.getContext("2d");n!==null&&(n.fillStyle=`#${e.toString(16).padStart(6,"0")}`,n.fillRect(0,0,t.width,t.height))},Yb=t=>{const e=document.createElement("canvas");e.width=Lm,e.height=Lm,r$(e,t);const n=new tc(e);n.needsUpdate=!0;const r=new DR({roughness:.8});return r.colorNode=s=>s.sampler("playerSkin",()=>n).texture(s.uv).rgb,{material:r,setPicture(s){const i=e.getContext("2d");if(i===null)return;i.setTransform(1,0,0,-1,0,e.height);const o=Math.min(s.width,s.height);i.drawImage(s,(s.width-o)/2,(s.height-o)/2,o,o,0,0,e.width,e.height),n.needsUpdate=!0}}},va=1,s$=3.2,i$=.8,o$=1.9,Dm=[15022389,2001125,4431943,16485376,9315498,44225,6111287,12634675],a$=t=>t.slice(t.lastIndexOf(":")+1)||t,Nm=40,l$=10,c$=t=>Dm[Math.abs(parseInt(Gb(t),36))%Dm.length],qb=(t,e)=>{const n=t.getContext("2d");if(n===null)return;n.setTransform(1,0,0,-1,0,t.height),n.clearRect(0,0,t.width,t.height),n.fillStyle="rgba(0, 0, 0, 0.55)",n.fillRect(0,12,t.width,52),n.fillStyle="#fff",n.textAlign="center",n.textBaseline="middle",n.font=`bold ${Nm}px monospace`;const r=t.width-l$*2,s=n.measureText(e).width;s>r&&(n.font=`bold ${Math.floor(Nm*r/s)}px monospace`),n.fillText(e,t.width/2,40)},u$=t=>{const e=document.createElement("canvas");e.width=256,e.height=64,qb(e,t);const n=new tc(e);return n.needsUpdate=!0,n},h$=(t,e,n)=>{let r=(e-t)%(Math.PI*2);return r>Math.PI&&(r-=Math.PI*2),r<-Math.PI&&(r+=Math.PI*2),t+r*n};class d${avatars=new Xn;camera;players=new Map;handles=new Map;pictures=new Map;constructor(e){this.camera=e.camera}get size(){return this.players.size}positions(){const e=[];for(const[n,r]of this.players)e.push({did:n,x:r.target.x,y:r.target.y,z:r.target.z});return e}update(e,n,r=Date.now()){const s=this.players.get(e)??this.createPlayer(e);s.target=n,s.updatedAt=r,s.cube.visible=!0,s.label.visible=!0}setHandle(e,n){this.handles.set(e,n);const r=this.players.get(e);if(r===void 0)return;const s=r.label.material.map,i=s?.image;s==null||!(i instanceof HTMLCanvasElement)||(qb(i,n),s.needsUpdate=!0)}setPicture(e,n){this.pictures.set(e,n),this.players.get(e)?.skin.setPicture(n)}remove(e){const n=this.players.get(e);n!==void 0&&(this.avatars.remove(n.cube),this.avatars.remove(n.label),this.players.delete(e))}clear(){for(const e of[...this.players.keys()])this.remove(e)}tick(e){const n=1-Math.exp(-8*e),r=new wt;for(const s of this.players.values()){const{cube:i,label:o,target:a}=s;r.set(a.x,a.y,a.z),i.position.lerp(r,n),i.rotation.y=h$(i.rotation.y,a.yaw,n),o.position.copy(i.position),o.position.y+=va+o$,o.lookAt(this.camera.position)}}createPlayer(e){const n=Yb(c$(e)),r=this.pictures.get(e);r!==void 0&&n.setPicture(r);const s=new wn(new Hi(va*2,va*2,va*2),n.material);s.visible=!1;const i=new wn(new sh(s$,i$),new Lo({map:u$(this.handles.get(e)??a$(e)),transparent:!0}));i.visible=!1,this.avatars.add(s,i);const o={cube:s,skin:n,label:i,target:{x:0,y:0,z:0,yaw:0,pitch:0},updatedAt:0};return this.players.set(e,o),o}}const f$=t=>t.map(({did:e,record:n})=>({did:e,x:n.x,y:n.y,z:n.z,scope:n.scope,...n.joinCode!==void 0?{joinCode:n.joinCode}:{},updatedAt:n.updatedAt})),p$={k:6,ttlMs:6e4,maxDistance:160,buffer:2,hysteresisMs:2500},m$=t=>{const e={...p$,...t.options},{selfDid:n,selfX:r,selfZ:s,selfScope:i,roster:o,nowMs:a,previous:l}=t,c=o.filter(b=>b.did!==n&&b.scope===i&&a-b.updatedAt<=e.ttlMs).map(b=>({e:b,dist2:(b.x-r)**2+(b.z-s)**2})).filter(({dist2:b})=>b<=e.maxDistance**2).sort((b,v)=>b.dist2-v.dist2||(b.e.did<v.e.did?-1:b.e.did>v.e.did?1:0)),u=c.length>e.k,h=new Set(c.slice(0,e.k).map(({e:b})=>b.did)),d=new Set(c.slice(0,e.k+e.buffer).map(({e:b})=>b.did)),f=new Map,m=[];for(const[b,v]of l){if(h.has(b)||d.has(b)){f.set(b,-1);continue}const x=v>=0?v:a;a-x>=e.hysteresisMs?m.push(b):f.set(b,x)}for(const b of h)f.has(b)||f.set(b,-1);const p=[...f.keys()].sort(),y=p.filter(b=>!l.has(b)),g=[...d].sort();return{target:p,candidates:g,connect:y,disconnect:m,links:f,truncated:u}},g$=2e4,y$=2e3,b$=4,Fm=15e3,v$=200,w$="https://bsky.network",_$=150,x$=2e3,k$=1,S$=3e4,E$=2e3,A$=3e4;class T${getRepoClient;getDid;seed;scope;getPose;createSignaling;relay;fetchDirectory;resolveHandle;resolvePicture;onRemotePose;onRemoteEdits;onRemoteScriptEntities;onRemoteScriptEvents;onRemotePlayerDamage;clusterOptions;wallNow;clock;avatars;remotePlayers;running=!1;status_="off";lastError=null;signaling;joinCode;roster=[];selection;lastDiscovery;peers=new Map;pendingConnections=new Map;failedAt=new Map;peerCount=0;poseSeq=0;editSeq=0;scriptEntitySeq=0;scriptEventSeq=0;playerDamageSeq=0;editsSent=0;editsReceived=0;scriptEntitiesSent=0;scriptEntitiesReceived=0;scriptEventsSent=0;scriptEventsReceived=0;playerDamageSent=0;playerDamageReceived=0;lastPresenceAt=0;lastPresenceX=0;lastPresenceZ=0;lastSendAt=0;lastSendX=0;lastSendZ=0;lastMeasureAt=0;pendingTimes=new Map;presenceTimer;discoverTimer;constructor(e){this.getRepoClient=e.getRepoClient,this.getDid=e.getDid,this.seed=e.seed,this.scope=e.scope,this.getPose=e.getPose,this.createSignaling=e.createSignaling,this.relay=e.relay??w$,this.fetchDirectory=e.fetchDirectory??this.relayFetchDirectory,this.resolveHandle=e.resolveHandle,this.resolvePicture=e.resolvePicture,this.onRemotePose=e.onRemotePose??(()=>{}),this.onRemoteEdits=e.onRemoteEdits??(()=>{}),this.onRemoteScriptEntities=e.onRemoteScriptEntities??(()=>{}),this.onRemoteScriptEvents=e.onRemoteScriptEvents??(()=>{}),this.onRemotePlayerDamage=e.onRemotePlayerDamage??(()=>{}),this.clusterOptions=e.clusterOptions??{},this.wallNow=e.wallNow??(()=>Date.now()),this.clock=new TO({wallNow:this.wallNow}),this.remotePlayers=e.camera!==void 0?new d$({camera:e.camera}):void 0,this.avatars=this.remotePlayers?.avatars??new Xn}get status(){return this.status_}get rosterSize(){return this.roster.length}get connections(){return this.peerCount}now(){return this.clock.now()}connectedDids(){const e=[];for(const[n,r]of this.peers)r.connected&&e.push(n);return e.sort()}peerPositions(){return this.remotePlayers?.positions()??[]}async start(){if(this.running)return`multiplayer already online (${this.describeState()})`;const e=this.getRepoClient(),n=this.getDid();if(e===void 0||n===null)return"multiplayer needs an account — use /account:login first";this.running=!0,this.status_="online",this.lastError=null,this.clock.setSelf(n),this.clock.setRoster(this.placeRoster()),this.signaling=this.createSignaling({selfDid:n}),this.signaling.onOpen(s=>{this.joinCode=s,this.publishPresenceTick()}),this.signaling.onConnection((s,i)=>this.handleIncomingConnection(s,i)),this.signaling.onError(s=>this.fail(s));const r=Date.now();return this.lastPresenceAt=0,await this.publishPresence(e,n,r),this.presenceTimer=setInterval(()=>{this.publishPresenceTick()},g$),await this.refreshDiscovery(r),this.discoverTimer=setInterval(()=>{this.refreshDiscovery(Date.now())},Fm),"multiplayer online — discovering nearby players"}async stop(){if(!this.running)return"multiplayer is off";this.running=!1,this.presenceTimer!==void 0&&(clearInterval(this.presenceTimer),this.presenceTimer=void 0),this.discoverTimer!==void 0&&(clearInterval(this.discoverTimer),this.discoverTimer=void 0);for(const r of this.peers.values())r.close("multiplayer stopped");this.peers.clear();for(const r of this.pendingConnections.values())r.transport.destroy();this.pendingConnections.clear(),this.failedAt.clear(),this.pendingTimes.clear(),this.lastMeasureAt=0,this.clock.reset(),this.peerCount=0,this.roster=[],this.selection=void 0,this.signaling?.destroy(),this.signaling=void 0,this.joinCode=void 0,this.remotePlayers?.clear(),this.status_="off",this.lastError=null;const e=this.getRepoClient(),n=this.getDid();if(e!==void 0&&n!==null)try{await e.deleteRecord({repo:n,collection:zs,rkey:gu})}catch{}return"multiplayer stopped"}tick(e){if(!this.running)return;const n=Date.now();if(n-this.lastMeasureAt>=E$){this.lastMeasureAt=n;for(const a of this.connectedDids())this.measureClock(a)}for(const[a,l]of this.pendingTimes)n-l.at>A$&&this.pendingTimes.delete(a);const r=this.getPose();(r.x-this.lastPresenceX)**2+(r.z-this.lastPresenceZ)**2>=b$**2&&n-this.lastPresenceAt>=y$&&(this.lastPresenceX=r.x,this.lastPresenceZ=r.z,this.publishPresenceTick(n));const o=(r.x-this.lastSendX)**2+(r.z-this.lastSendZ)**2>=k$**2?_$:x$;if(n-this.lastSendAt>=o){this.lastSendAt=n,this.lastSendX=r.x,this.lastSendZ=r.z;const a=++this.poseSeq;for(const l of this.peers.values())l.sendPose(r,a)}this.remotePlayers?.tick(e)}broadcastEdits(e){if(!this.running||e.length===0)return;const n=++this.editSeq;this.editsSent+=e.length;for(const r of this.peers.values())r.sendEdits(e,n)}broadcastScriptEntities(e){if(!this.running||e.length===0)return;const n=++this.scriptEntitySeq;this.scriptEntitiesSent+=e.length;for(const r of this.peers.values())r.sendScriptEntities(e,n)}broadcastScriptEvents(e){if(!this.running||e.length===0)return;const n=++this.scriptEventSeq;this.scriptEventsSent+=e.length;for(const r of this.peers.values())r.sendScriptEvents(e,n)}broadcastPlayerDamage(e){if(!this.running)return;const n=++this.playerDamageSeq;this.playerDamageSent++;const r={v:1,type:"player-damage",seq:n,t:Date.now(),...e};for(const s of this.peers.values())s.sendPlayerDamage(r)}describe(){return`multiplayer: ${this.describeState()}${this.lastError!==null?` — ${this.lastError}`:""}`}describeDebug(){const e=[];e.push(`state: ${this.describeState()}`),e.push(`did: ${this.getDid()??"none"}  joinCode: ${this.joinCode??"none"}  relay: ${this.relay}  seed: ${this.seed??"none"}  scope: ${this.scope}`);const n=this.lastDiscovery;if(n===void 0)e.push("discovery: no pass yet");else{const s=Math.round((Date.now()-n.at)/1e3);e.push(`discovery: ${s}s ago — relay returned ${n.relayDids.length} DID(s) for ${zs}`);for(const i of n.relayDids)e.push(`  relay listed: ${i}`);for(const i of n.fetched)if(i.self===!0)e.push(`  fetch: ${i.did} (self, skipped)`);else if(i.ok){const o=i.updatedAt!==void 0?`${Math.round((Date.now()-i.updatedAt)/1e3)}s old`:"?";e.push(`  fetch: ${i.did} ok, ${o}`)}else e.push(`  fetch: ${i.did} FAILED — ${i.error??"unknown"}`)}e.push(`roster (${this.roster.length} other player(s)):`);for(const s of this.roster)e.push(`  ${s.did} at (${s.x}, ${s.z}) ${Math.round((Date.now()-s.updatedAt)/1e3)}s old`);const r=this.selection;r===void 0?e.push("selection: none yet"):e.push(`selection: target=[${r.target.join(", ")}] candidates=[${r.candidates.join(", ")}] connect=[${r.connect.join(", ")}] disconnect=[${r.disconnect.join(", ")}]`),e.push(`peers (${this.peers.size}):`);for(const[s,i]of this.peers)e.push(`  ${s}: ${i.describe()}`);return e.push(`edits: ${this.editsSent} sent, ${this.editsReceived} received`),e.push(`script entities: ${this.scriptEntitiesSent} sent, ${this.scriptEntitiesReceived} received`),e.push(`script events: ${this.scriptEventsSent} sent, ${this.scriptEventsReceived} received`),e.push(`player-damage: ${this.playerDamageSent} sent, ${this.playerDamageReceived} received`),e.push(`clock: ${this.clock.describe()}`),e.push(`lastError: ${this.lastError??"none"}`),e.join(`
`)}dispose(){this.stop()}describeState(){if(!this.running)return"off";const e=this.selection?.target.length??0,n=this.selection?.truncated??!1;return`online, ${this.roster.length} player(s) nearby, ${e} selected${n?"+":""}, ${this.peerCount} connected`}async publishPresenceTick(e=Date.now()){if(!this.running)return;const n=this.getRepoClient(),r=this.getDid();n===void 0||r===null||await this.publishPresence(n,r,e)}async publishPresence(e,n,r){const s=this.getPose();this.lastPresenceAt=r,this.lastPresenceX=s.x,this.lastPresenceZ=s.z;try{await e.putRecord({repo:n,collection:zs,rkey:gu,record:t$(s.x,s.y,s.z,this.seed,this.scope,r,this.joinCode)})}catch(i){this.fail(i)}}async refreshDiscovery(e){if(this.running)try{const n=await this.fetchPresenceRepos(),r=this.getDid(),s=[],i=[];for(const o of n){if(o===r){s.push({did:o,ok:!0,self:!0});continue}const a=await this.fetchPresence(o);a.ok?(s.push({did:o,ok:!0,updatedAt:a.record.updatedAt}),i.push({did:o,record:a.record})):s.push({did:o,ok:!1,error:a.error})}this.lastDiscovery={at:e,relayDids:n,fetched:s},this.roster=f$(i),this.clock.setRoster(this.placeRoster()),this.applySelection(e)}catch(n){this.fail(n)}}async fetchPresenceRepos(){return this.fetchDirectory(zs)}relayFetchDirectory=async e=>{const n=`${this.relay}/xrpc/com.atproto.sync.listReposByCollection`,r=[];let s;for(let i=0;i<10&&r.length<v$;i++){const o=new URLSearchParams({collection:e,limit:"100"});s!==void 0&&o.set("cursor",s);const a=await fetch(`${n}?${o.toString()}`);if(!a.ok)throw new Error(`discovery relay replied ${a.status}`);const l=await a.json();for(const c of l.repos??[])r.push(c.did);if(s=l.cursor,s===void 0)break}return r};async fetchPresence(e){const n=this.getRepoClient();if(n===void 0)return{did:e,ok:!1,error:"no signed-in record client"};try{const s=(await n.getRecord({repo:e,collection:zs,rkey:gu})).value;return n$(s)?{did:e,ok:!0,record:s}:{did:e,ok:!1,error:"record malformed"}}catch(r){return{did:e,ok:!1,error:r instanceof Error?r.message:String(r)}}}applySelection(e){const n=this.getPose(),r=m$({selfDid:this.getDid()??"",selfX:n.x,selfZ:n.z,selfScope:this.scope,roster:this.roster,nowMs:e,previous:this.selection?.links??new Map,options:this.clusterOptions});this.selection=r;const s=new Set([...r.target,...r.candidates]);for(const i of s){if(this.peers.has(i))continue;const o=this.failedAt.get(i);o!==void 0&&e-o<S$||this.openPeer(i)}for(const i of[...this.peers.keys()])s.has(i)||this.peers.get(i)?.close("peer out of range");for(const[i,o]of this.pendingConnections)s.has(i)?(this.pendingConnections.delete(i),this.acceptIncoming(i,o.transport)):e-o.since>=Fm&&(this.pendingConnections.delete(i),o.transport.destroy())}openPeer(e){const n=this.getDid(),r=this.signaling;if(n===null||r===void 0)return;if(n<e){const i=this.roster.find(o=>o.did===e)?.joinCode;if(i===void 0)return;try{const o=r.connect(i,{did:n});this.peers.set(e,new mu({did:e,selfDid:n,transport:o,...this.peerHandlers()}))}catch(o){this.lastError=`${o instanceof Error?o.message:String(o)}`}}else this.peers.set(e,new mu({did:e,selfDid:n,...this.peerHandlers()}))}peerHandlers(){let e=!1;return{onOpen:n=>{e=!0,this.failedAt.delete(n),this.peerCount++,this.clock.setRoster(this.placeRoster()),this.measureClock(n),this.nameAvatar(n),this.faceAvatar(n)},onPose:(n,r)=>{this.remotePlayers?.update(n,r),this.onRemotePose(n,r)},onEdits:(n,r)=>{this.editsReceived+=r.length,this.onRemoteEdits(n,r)},onScriptEntities:(n,r)=>{this.scriptEntitiesReceived+=r.length,this.onRemoteScriptEntities(n,r)},onScriptEvents:(n,r)=>{this.scriptEventsReceived+=r.length,this.onRemoteScriptEvents(n,r)},onPlayerDamage:(n,r)=>{this.playerDamageReceived++,this.onRemotePlayerDamage(n,r)},onTime:(n,r,s)=>{const i=this.pendingTimes.get(n);i===void 0||i.t1!==r||(this.pendingTimes.delete(n),this.clock.observe(n,r,s,this.wallNow()))},onClose:n=>{this.peerCount=Math.max(0,this.peerCount-1),this.remotePlayers?.remove(n),this.pendingTimes.delete(n),this.clock.forget(n),this.clock.setRoster(this.placeRoster()),this.peers.delete(n),e||this.failedAt.set(n,Date.now())},onError:(n,r,s)=>{this.lastError=`${n}: ${r}${s!==void 0?` (${s})`:""}`},wallNow:()=>this.wallNow()}}async nameAvatar(e){const n=this.resolveHandle,r=this.remotePlayers;if(!(n===void 0||r===void 0))try{const s=await n(e);s!==null&&r.setHandle(e,s)}catch(s){this.lastError=`${e}: handle lookup failed — ${s instanceof Error?s.message:String(s)}`}}async faceAvatar(e){const n=this.resolvePicture,r=this.remotePlayers;if(!(n===void 0||r===void 0))try{const s=await n(e);s!==null&&r.setPicture(e,await createImageBitmap(s))}catch(s){this.lastError=`${e}: picture lookup failed — ${s instanceof Error?s.message:String(s)}`}}handleIncomingConnection(e,n){const r=e.did,s=this.getDid();if(r===void 0||r===s||s===null){n.destroy();return}const i=this.peers.get(r);if(i!==void 0){i.canAttach()?i.attach(n):n.destroy();return}if(this.isWanted(r)){this.acceptIncoming(r,n);return}this.pendingConnections.get(r)!==void 0?n.destroy():this.pendingConnections.set(r,{transport:n,since:Date.now()})}isWanted(e){const n=this.selection;return n!==void 0&&(n.target.includes(e)||n.candidates.includes(e))}acceptIncoming(e,n){const r=this.getDid();if(r===null){n.destroy();return}const s=this.peers.get(e);if(s!==void 0){s.canAttach()?s.attach(n):n.destroy();return}this.peers.set(e,new mu({did:e,selfDid:r,transport:n,...this.peerHandlers()}))}fail(e){this.status_="error",this.lastError=e instanceof Error?e.message:String(e)}measureClock(e){const n=this.peers.get(e);if(n===void 0||!n.connected)return;const r=this.wallNow();this.pendingTimes.set(e,{t1:r,at:r}),n.sendTime(r)}placeRoster(){const e=this.getDid();return e===null?[]:[e,...CO(this.roster,this.scope)]}}class C${constructor(){this.encoder=new TextEncoder,this._pieces=[],this._parts=[]}append_buffer(e){this.flush(),this._parts.push(e)}append(e){this._pieces.push(e)}flush(){if(this._pieces.length>0){const e=new Uint8Array(this._pieces);this._parts.push(e),this._pieces=[]}}toArrayBuffer(){const e=[];for(const n of this._parts)e.push(n);return M$(e).buffer}}function M$(t){let e=0;for(const s of t)e+=s.byteLength;const n=new Uint8Array(e);let r=0;for(const s of t){const i=new Uint8Array(s.buffer,s.byteOffset,s.byteLength);n.set(i,r),r+=s.byteLength}return n}function Xb(t){return new R$(t).unpack()}function Zb(t){const e=new I$,n=e.pack(t);return n instanceof Promise?n.then(()=>e.getBuffer()):e.getBuffer()}class R${constructor(e){this.index=0,this.dataBuffer=e,this.dataView=new Uint8Array(this.dataBuffer),this.length=this.dataBuffer.byteLength}unpack(){const e=this.unpack_uint8();if(e<128)return e;if((e^224)<32)return(e^224)-32;let n;if((n=e^160)<=15)return this.unpack_raw(n);if((n=e^176)<=15)return this.unpack_string(n);if((n=e^144)<=15)return this.unpack_array(n);if((n=e^128)<=15)return this.unpack_map(n);switch(e){case 192:return null;case 193:return;case 194:return!1;case 195:return!0;case 202:return this.unpack_float();case 203:return this.unpack_double();case 204:return this.unpack_uint8();case 205:return this.unpack_uint16();case 206:return this.unpack_uint32();case 207:return this.unpack_uint64();case 208:return this.unpack_int8();case 209:return this.unpack_int16();case 210:return this.unpack_int32();case 211:return this.unpack_int64();case 212:return;case 213:return;case 214:return;case 215:return;case 216:return n=this.unpack_uint16(),this.unpack_string(n);case 217:return n=this.unpack_uint32(),this.unpack_string(n);case 218:return n=this.unpack_uint16(),this.unpack_raw(n);case 219:return n=this.unpack_uint32(),this.unpack_raw(n);case 220:return n=this.unpack_uint16(),this.unpack_array(n);case 221:return n=this.unpack_uint32(),this.unpack_array(n);case 222:return n=this.unpack_uint16(),this.unpack_map(n);case 223:return n=this.unpack_uint32(),this.unpack_map(n)}}unpack_uint8(){const e=this.dataView[this.index]&255;return this.index++,e}unpack_uint16(){const e=this.read(2),n=(e[0]&255)*256+(e[1]&255);return this.index+=2,n}unpack_uint32(){const e=this.read(4),n=((e[0]*256+e[1])*256+e[2])*256+e[3];return this.index+=4,n}unpack_uint64(){const e=this.read(8),n=((((((e[0]*256+e[1])*256+e[2])*256+e[3])*256+e[4])*256+e[5])*256+e[6])*256+e[7];return this.index+=8,n}unpack_int8(){const e=this.unpack_uint8();return e<128?e:e-256}unpack_int16(){const e=this.unpack_uint16();return e<32768?e:e-65536}unpack_int32(){const e=this.unpack_uint32();return e<2**31?e:e-2**32}unpack_int64(){const e=this.unpack_uint64();return e<2**63?e:e-2**64}unpack_raw(e){if(this.length<this.index+e)throw new Error(`BinaryPackFailure: index is out of range ${this.index} ${e} ${this.length}`);const n=this.dataBuffer.slice(this.index,this.index+e);return this.index+=e,n}unpack_string(e){const n=this.read(e);let r=0,s="",i,o;for(;r<e;)i=n[r],i<160?(o=i,r++):(i^192)<32?(o=(i&31)<<6|n[r+1]&63,r+=2):(i^224)<16?(o=(i&15)<<12|(n[r+1]&63)<<6|n[r+2]&63,r+=3):(o=(i&7)<<18|(n[r+1]&63)<<12|(n[r+2]&63)<<6|n[r+3]&63,r+=4),s+=String.fromCodePoint(o);return this.index+=e,s}unpack_array(e){const n=new Array(e);for(let r=0;r<e;r++)n[r]=this.unpack();return n}unpack_map(e){const n={};for(let r=0;r<e;r++){const s=this.unpack();n[s]=this.unpack()}return n}unpack_float(){const e=this.unpack_uint32(),n=e>>31,r=(e>>23&255)-127,s=e&8388607|8388608;return(n===0?1:-1)*s*2**(r-23)}unpack_double(){const e=this.unpack_uint32(),n=this.unpack_uint32(),r=e>>31,s=(e>>20&2047)-1023,o=(e&1048575|1048576)*2**(s-20)+n*2**(s-52);return(r===0?1:-1)*o}read(e){const n=this.index;if(n+e<=this.length)return this.dataView.subarray(n,n+e);throw new Error("BinaryPackFailure: read index out of range")}}class I${getBuffer(){return this._bufferBuilder.toArrayBuffer()}pack(e){if(typeof e=="string")this.pack_string(e);else if(typeof e=="number")Math.floor(e)===e?this.pack_integer(e):this.pack_double(e);else if(typeof e=="boolean")e===!0?this._bufferBuilder.append(195):e===!1&&this._bufferBuilder.append(194);else if(e===void 0)this._bufferBuilder.append(192);else if(typeof e=="object")if(e===null)this._bufferBuilder.append(192);else{const n=e.constructor;if(e instanceof Array){const r=this.pack_array(e);if(r instanceof Promise)return r.then(()=>this._bufferBuilder.flush())}else if(e instanceof ArrayBuffer)this.pack_bin(new Uint8Array(e));else if("BYTES_PER_ELEMENT"in e){const r=e;this.pack_bin(new Uint8Array(r.buffer,r.byteOffset,r.byteLength))}else if(e instanceof Date)this.pack_string(e.toString());else{if(e instanceof Blob)return e.arrayBuffer().then(r=>{this.pack_bin(new Uint8Array(r)),this._bufferBuilder.flush()});if(n==Object||n.toString().startsWith("class")){const r=this.pack_object(e);if(r instanceof Promise)return r.then(()=>this._bufferBuilder.flush())}else throw new Error(`Type "${n.toString()}" not yet supported`)}}else throw new Error(`Type "${typeof e}" not yet supported`);this._bufferBuilder.flush()}pack_bin(e){const n=e.length;if(n<=15)this.pack_uint8(160+n);else if(n<=65535)this._bufferBuilder.append(218),this.pack_uint16(n);else if(n<=4294967295)this._bufferBuilder.append(219),this.pack_uint32(n);else throw new Error("Invalid length");this._bufferBuilder.append_buffer(e)}pack_string(e){const n=this._textEncoder.encode(e),r=n.length;if(r<=15)this.pack_uint8(176+r);else if(r<=65535)this._bufferBuilder.append(216),this.pack_uint16(r);else if(r<=4294967295)this._bufferBuilder.append(217),this.pack_uint32(r);else throw new Error("Invalid length");this._bufferBuilder.append_buffer(n)}pack_array(e){const n=e.length;if(n<=15)this.pack_uint8(144+n);else if(n<=65535)this._bufferBuilder.append(220),this.pack_uint16(n);else if(n<=4294967295)this._bufferBuilder.append(221),this.pack_uint32(n);else throw new Error("Invalid length");const r=s=>{if(s<n){const i=this.pack(e[s]);return i instanceof Promise?i.then(()=>r(s+1)):r(s+1)}};return r(0)}pack_integer(e){if(e>=-32&&e<=127)this._bufferBuilder.append(e&255);else if(e>=0&&e<=255)this._bufferBuilder.append(204),this.pack_uint8(e);else if(e>=-128&&e<=127)this._bufferBuilder.append(208),this.pack_int8(e);else if(e>=0&&e<=65535)this._bufferBuilder.append(205),this.pack_uint16(e);else if(e>=-32768&&e<=32767)this._bufferBuilder.append(209),this.pack_int16(e);else if(e>=0&&e<=4294967295)this._bufferBuilder.append(206),this.pack_uint32(e);else if(e>=-2147483648&&e<=2147483647)this._bufferBuilder.append(210),this.pack_int32(e);else if(e>=-9223372036854776e3&&e<=9223372036854776e3)this._bufferBuilder.append(211),this.pack_int64(e);else if(e>=0&&e<=18446744073709552e3)this._bufferBuilder.append(207),this.pack_uint64(e);else throw new Error("Invalid integer")}pack_double(e){let n=0;e<0&&(n=1,e=-e);const r=Math.floor(Math.log(e)/Math.LN2),s=e/2**r-1,i=Math.floor(s*2**52),o=2**32,a=n<<31|r+1023<<20|i/o&1048575,l=i%o;this._bufferBuilder.append(203),this.pack_int32(a),this.pack_int32(l)}pack_object(e){const n=Object.keys(e),r=n.length;if(r<=15)this.pack_uint8(128+r);else if(r<=65535)this._bufferBuilder.append(222),this.pack_uint16(r);else if(r<=4294967295)this._bufferBuilder.append(223),this.pack_uint32(r);else throw new Error("Invalid length");const s=i=>{if(i<n.length){const o=n[i];if(e.hasOwnProperty(o)){this.pack(o);const a=this.pack(e[o]);if(a instanceof Promise)return a.then(()=>s(i+1))}return s(i+1)}};return s(0)}pack_uint8(e){this._bufferBuilder.append(e)}pack_uint16(e){this._bufferBuilder.append(e>>8),this._bufferBuilder.append(e&255)}pack_uint32(e){const n=e&4294967295;this._bufferBuilder.append((n&4278190080)>>>24),this._bufferBuilder.append((n&16711680)>>>16),this._bufferBuilder.append((n&65280)>>>8),this._bufferBuilder.append(n&255)}pack_uint64(e){const n=e/4294967296,r=e%2**32;this._bufferBuilder.append((n&4278190080)>>>24),this._bufferBuilder.append((n&16711680)>>>16),this._bufferBuilder.append((n&65280)>>>8),this._bufferBuilder.append(n&255),this._bufferBuilder.append((r&4278190080)>>>24),this._bufferBuilder.append((r&16711680)>>>16),this._bufferBuilder.append((r&65280)>>>8),this._bufferBuilder.append(r&255)}pack_int8(e){this._bufferBuilder.append(e&255)}pack_int16(e){this._bufferBuilder.append((e&65280)>>8),this._bufferBuilder.append(e&255)}pack_int32(e){this._bufferBuilder.append(e>>>24&255),this._bufferBuilder.append((e&16711680)>>>16),this._bufferBuilder.append((e&65280)>>>8),this._bufferBuilder.append(e&255)}pack_int64(e){const n=Math.floor(e/4294967296),r=e%2**32;this._bufferBuilder.append((n&4278190080)>>>24),this._bufferBuilder.append((n&16711680)>>>16),this._bufferBuilder.append((n&65280)>>>8),this._bufferBuilder.append(n&255),this._bufferBuilder.append((r&4278190080)>>>24),this._bufferBuilder.append((r&16711680)>>>16),this._bufferBuilder.append((r&65280)>>>8),this._bufferBuilder.append(r&255)}constructor(){this._bufferBuilder=new C$,this._textEncoder=new TextEncoder}}let Jb=!0,Qb=!0;function ho(t,e,n){const r=t.match(e);return r&&r.length>=n&&parseFloat(r[n],10)}function Xs(t,e,n){if(!t.RTCPeerConnection)return;if(!Object.getOwnPropertyDescriptor(EventTarget.prototype,"addEventListener").writable){Id("Unable to polyfill events");return}const s=t.RTCPeerConnection.prototype,i=s.addEventListener;s.addEventListener=function(a,l){if(a!==e)return i.apply(this,arguments);const c=u=>{const h=n(u);h&&(l.handleEvent?l.handleEvent(h):l(h))};return this._eventMap=this._eventMap||{},this._eventMap[e]||(this._eventMap[e]=new Map),this._eventMap[e].set(l,c),i.apply(this,[a,c])};const o=s.removeEventListener;s.removeEventListener=function(a,l){if(a!==e||!this._eventMap||!this._eventMap[e])return o.apply(this,arguments);if(!this._eventMap[e].has(l))return o.apply(this,arguments);const c=this._eventMap[e].get(l);return this._eventMap[e].delete(l),this._eventMap[e].size===0&&delete this._eventMap[e],Object.keys(this._eventMap).length===0&&delete this._eventMap,o.apply(this,[a,c])},Object.defineProperty(s,"on"+e,{get(){return this["_on"+e]},set(a){this["_on"+e]&&(this.removeEventListener(e,this["_on"+e]),delete this["_on"+e]),a&&this.addEventListener(e,this["_on"+e]=a)},enumerable:!0,configurable:!0})}function z$(t){return typeof t!="boolean"?new Error("Argument type: "+typeof t+". Please use a boolean."):(Jb=t,t?"adapter.js logging disabled":"adapter.js logging enabled")}function P$(t){return typeof t!="boolean"?new Error("Argument type: "+typeof t+". Please use a boolean."):(Qb=!t,"adapter.js deprecation warnings "+(t?"disabled":"enabled"))}function Id(){if(typeof window=="object"){if(Jb)return;typeof console<"u"&&typeof console.log=="function"&&console.log.apply(console,arguments)}}function zd(t,e){Qb&&console.warn(t+" is deprecated, please use "+e+" instead.")}function O$(t){const e={browser:null,version:null};if(typeof t>"u"||!t.navigator||!t.navigator.userAgent)return e.browser="Not a browser.",e;const{navigator:n}=t;if(n.userAgentData&&n.userAgentData.brands){const r=n.userAgentData.brands.find(s=>s.brand==="Chromium");if(r){const s=parseInt(r.version,10);if(s>=90)return{browser:"chrome",version:s}}}if(n.mozGetUserMedia)e.browser="firefox",e.version=parseInt(ho(n.userAgent,/Firefox\/(\d+)\./,1));else if(n.webkitGetUserMedia||t.isSecureContext===!1&&t.webkitRTCPeerConnection)e.browser="chrome",e.version=parseInt(ho(n.userAgent,/Chrom(e|ium)\/(\d+)\./,2))||null;else if(t.RTCPeerConnection&&n.userAgent.match(/AppleWebKit\/(\d+)\./))e.browser="safari",e.version=parseInt(ho(n.userAgent,/AppleWebKit\/(\d+)\./,1)),e.supportsUnifiedPlan=t.RTCRtpTransceiver&&"currentDirection"in t.RTCRtpTransceiver.prototype,e._safariVersion=ho(n.userAgent,/Version\/(\d+(\.?\d+))/,1);else return e.browser="Not a supported browser.",e;return e}function Bm(t){return Object.prototype.toString.call(t)==="[object Object]"}function Kb(t){return Bm(t)?Object.keys(t).reduce(function(e,n){const r=Bm(t[n]),s=r?Kb(t[n]):t[n],i=r&&!Object.keys(s).length;return s===void 0||i?e:Object.assign(e,{[n]:s})},{}):t}function dh(t,e,n){!e||n.has(e.id)||(n.set(e.id,e),Object.keys(e).forEach(r=>{r.endsWith("Id")?dh(t,t.get(e[r]),n):r.endsWith("Ids")&&e[r].forEach(s=>{dh(t,t.get(s),n)})}))}function Um(t,e,n){const r=n?"outbound-rtp":"inbound-rtp",s=new Map;if(e===null)return s;const i=[];return t.forEach(o=>{o.type==="track"&&o.trackIdentifier===e.id&&i.push(o)}),i.forEach(o=>{t.forEach(a=>{a.type===r&&a.trackId===o.id&&dh(t,a,s)})}),s}const Hm=Id;function ev(t,e){if(e.version>=64)return;const n=t&&t.navigator;if(!n.mediaDevices)return;const r=function(a){if(typeof a!="object"||a.mandatory||a.optional)return a;const l={};return Object.keys(a).forEach(c=>{if(c==="require"||c==="advanced"||c==="mediaSource")return;const u=typeof a[c]=="object"?a[c]:{ideal:a[c]};u.exact!==void 0&&typeof u.exact=="number"&&(u.min=u.max=u.exact);const h=function(d,f){return d?d+f.charAt(0).toUpperCase()+f.slice(1):f==="deviceId"?"sourceId":f};if(u.ideal!==void 0){l.optional=l.optional||[];let d={};typeof u.ideal=="number"?(d[h("min",c)]=u.ideal,l.optional.push(d),d={},d[h("max",c)]=u.ideal,l.optional.push(d)):(d[h("",c)]=u.ideal,l.optional.push(d))}u.exact!==void 0&&typeof u.exact!="number"?(l.mandatory=l.mandatory||{},l.mandatory[h("",c)]=u.exact):["min","max"].forEach(d=>{u[d]!==void 0&&(l.mandatory=l.mandatory||{},l.mandatory[h(d,c)]=u[d])})}),a.advanced&&(l.optional=(l.optional||[]).concat(a.advanced)),l},s=function(a,l){if(e.version>=61)return l(a);if(a=JSON.parse(JSON.stringify(a)),a&&typeof a.audio=="object"){const c=function(u,h,d){h in u&&!(d in u)&&(u[d]=u[h],delete u[h])};a=JSON.parse(JSON.stringify(a)),c(a.audio,"autoGainControl","googAutoGainControl"),c(a.audio,"noiseSuppression","googNoiseSuppression"),a.audio=r(a.audio)}if(a&&typeof a.video=="object"){let c=a.video.facingMode;c=c&&(typeof c=="object"?c:{ideal:c});const u=e.version<66;if(c&&(c.exact==="user"||c.exact==="environment"||c.ideal==="user"||c.ideal==="environment")&&!(n.mediaDevices.getSupportedConstraints&&n.mediaDevices.getSupportedConstraints().facingMode&&!u)){delete a.video.facingMode;let h;if(c.exact==="environment"||c.ideal==="environment"?h=["back","rear"]:(c.exact==="user"||c.ideal==="user")&&(h=["front"]),h)return n.mediaDevices.enumerateDevices().then(d=>{d=d.filter(m=>m.kind==="videoinput");let f=d.find(m=>h.some(p=>m.label.toLowerCase().includes(p)));return!f&&d.length&&h.includes("back")&&(f=d[d.length-1]),f&&(a.video.deviceId=c.exact?{exact:f.deviceId}:{ideal:f.deviceId}),a.video=r(a.video),Hm("chrome: "+JSON.stringify(a)),l(a)})}a.video=r(a.video)}return Hm("chrome: "+JSON.stringify(a)),l(a)},i=function(a){return e.version>=64?a:{name:{PermissionDeniedError:"NotAllowedError",PermissionDismissedError:"NotAllowedError",InvalidStateError:"NotAllowedError",DevicesNotFoundError:"NotFoundError",ConstraintNotSatisfiedError:"OverconstrainedError",TrackStartError:"NotReadableError",MediaDeviceFailedDueToShutdown:"NotAllowedError",MediaDeviceKillSwitchOn:"NotAllowedError",TabCaptureError:"AbortError",ScreenCaptureError:"AbortError",DeviceCaptureError:"AbortError"}[a.name]||a.name,message:a.message,constraint:a.constraint||a.constraintName,toString(){return this.name+(this.message&&": ")+this.message}}},o=function(a,l,c){s(a,u=>{n.webkitGetUserMedia(u,l,h=>{c&&c(i(h))})})};if(n.getUserMedia=o.bind(n),n.mediaDevices.getUserMedia){const a=n.mediaDevices.getUserMedia.bind(n.mediaDevices);n.mediaDevices.getUserMedia=function(l){return s(l,c=>a(c).then(u=>{if(c.audio&&!u.getAudioTracks().length||c.video&&!u.getVideoTracks().length)throw u.getTracks().forEach(h=>{h.stop()}),new DOMException("","NotFoundError");return u},u=>Promise.reject(i(u))))}}}function tv(t){t.MediaStream=t.MediaStream||t.webkitMediaStream}function nv(t,e){if(!(e.version>102))if(typeof t=="object"&&t.RTCPeerConnection&&!("ontrack"in t.RTCPeerConnection.prototype)){Object.defineProperty(t.RTCPeerConnection.prototype,"ontrack",{get(){return this._ontrack},set(r){this._ontrack&&this.removeEventListener("track",this._ontrack),this.addEventListener("track",this._ontrack=r)},enumerable:!0,configurable:!0});const n=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(){return this._ontrackpoly||(this._ontrackpoly=s=>{s.stream.addEventListener("addtrack",i=>{let o;t.RTCPeerConnection.prototype.getReceivers?o=this.getReceivers().find(l=>l.track&&l.track.id===i.track.id):o={track:i.track};const a=new Event("track");a.track=i.track,a.receiver=o,a.transceiver={receiver:o},a.streams=[s.stream],this.dispatchEvent(a)}),s.stream.getTracks().forEach(i=>{let o;t.RTCPeerConnection.prototype.getReceivers?o=this.getReceivers().find(l=>l.track&&l.track.id===i.id):o={track:i};const a=new Event("track");a.track=i,a.receiver=o,a.transceiver={receiver:o},a.streams=[s.stream],this.dispatchEvent(a)})},this.addEventListener("addstream",this._ontrackpoly)),n.apply(this,arguments)}}else Xs(t,"track",n=>(n.transceiver||Object.defineProperty(n,"transceiver",{value:{receiver:n.receiver}}),n))}function rv(t){if(typeof t=="object"&&t.RTCPeerConnection&&!("getSenders"in t.RTCPeerConnection.prototype)&&"createDTMFSender"in t.RTCPeerConnection.prototype){const e=function(s,i){return{track:i,get dtmf(){return this._dtmf===void 0&&(i.kind==="audio"?this._dtmf=s.createDTMFSender(i):this._dtmf=null),this._dtmf},_pc:s}};if(!t.RTCPeerConnection.prototype.getSenders){t.RTCPeerConnection.prototype.getSenders=function(){return this._senders=this._senders||[],this._senders.slice()};const s=t.RTCPeerConnection.prototype.addTrack;t.RTCPeerConnection.prototype.addTrack=function(a,l){let c=s.apply(this,arguments);return c||(c=e(this,a),this._senders.push(c)),c};const i=t.RTCPeerConnection.prototype.removeTrack;t.RTCPeerConnection.prototype.removeTrack=function(a){i.apply(this,arguments);const l=this._senders.indexOf(a);l!==-1&&this._senders.splice(l,1)}}const n=t.RTCPeerConnection.prototype.addStream;t.RTCPeerConnection.prototype.addStream=function(i){this._senders=this._senders||[],n.apply(this,[i]),i.getTracks().forEach(o=>{this._senders.push(e(this,o))})};const r=t.RTCPeerConnection.prototype.removeStream;t.RTCPeerConnection.prototype.removeStream=function(i){this._senders=this._senders||[],r.apply(this,[i]),i.getTracks().forEach(o=>{const a=this._senders.find(l=>l.track===o);a&&this._senders.splice(this._senders.indexOf(a),1)})}}else if(typeof t=="object"&&t.RTCPeerConnection&&"getSenders"in t.RTCPeerConnection.prototype&&"createDTMFSender"in t.RTCPeerConnection.prototype&&t.RTCRtpSender&&!("dtmf"in t.RTCRtpSender.prototype)){const e=t.RTCPeerConnection.prototype.getSenders;t.RTCPeerConnection.prototype.getSenders=function(){const r=e.apply(this,[]);return r.forEach(s=>s._pc=this),r},Object.defineProperty(t.RTCRtpSender.prototype,"dtmf",{get(){return this._dtmf===void 0&&(this.track.kind==="audio"?this._dtmf=this._pc.createDTMFSender(this.track):this._dtmf=null),this._dtmf}})}}function sv(t,e){if(e.version>=67||!(typeof t=="object"&&t.RTCPeerConnection&&t.RTCRtpSender&&t.RTCRtpReceiver))return;if(!("getStats"in t.RTCRtpSender.prototype)){const r=t.RTCPeerConnection.prototype.getSenders;r&&(t.RTCPeerConnection.prototype.getSenders=function(){const o=r.apply(this,[]);return o.forEach(a=>a._pc=this),o});const s=t.RTCPeerConnection.prototype.addTrack;s&&(t.RTCPeerConnection.prototype.addTrack=function(){const o=s.apply(this,arguments);return o._pc=this,o}),t.RTCRtpSender.prototype.getStats=function(){const o=this;return this._pc.getStats().then(a=>Um(a,o.track,!0))}}if(!("getStats"in t.RTCRtpReceiver.prototype)){const r=t.RTCPeerConnection.prototype.getReceivers;r&&(t.RTCPeerConnection.prototype.getReceivers=function(){const i=r.apply(this,[]);return i.forEach(o=>o._pc=this),i}),Xs(t,"track",s=>(s.receiver._pc=s.srcElement,s)),t.RTCRtpReceiver.prototype.getStats=function(){const i=this;return this._pc.getStats().then(o=>Um(o,i.track,!1))}}if(!("getStats"in t.RTCRtpSender.prototype&&"getStats"in t.RTCRtpReceiver.prototype))return;const n=t.RTCPeerConnection.prototype.getStats;t.RTCPeerConnection.prototype.getStats=function(){if(arguments.length>0&&arguments[0]instanceof t.MediaStreamTrack){const s=arguments[0];let i,o,a;return this.getSenders().forEach(l=>{l.track===s&&(i?a=!0:i=l)}),this.getReceivers().forEach(l=>(l.track===s&&(o?a=!0:o=l),l.track===s)),a||i&&o?Promise.reject(new DOMException("There are more than one sender or receiver for the track.","InvalidAccessError")):i?i.getStats():o?o.getStats():Promise.reject(new DOMException("There is no sender or receiver for the track.","InvalidAccessError"))}return n.apply(this,arguments)}}function iv(t){t.RTCPeerConnection.prototype.getLocalStreams=function(){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},Object.keys(this._shimmedLocalStreams).map(o=>this._shimmedLocalStreams[o][0])};const e=t.RTCPeerConnection.prototype.addTrack;t.RTCPeerConnection.prototype.addTrack=function(o,a){if(!a)return e.apply(this,arguments);this._shimmedLocalStreams=this._shimmedLocalStreams||{};const l=e.apply(this,arguments);return this._shimmedLocalStreams[a.id]?this._shimmedLocalStreams[a.id].indexOf(l)===-1&&this._shimmedLocalStreams[a.id].push(l):this._shimmedLocalStreams[a.id]=[a,l],l};const n=t.RTCPeerConnection.prototype.addStream;t.RTCPeerConnection.prototype.addStream=function(o){this._shimmedLocalStreams=this._shimmedLocalStreams||{},o.getTracks().forEach(c=>{if(this.getSenders().find(h=>h.track===c))throw new DOMException("Track already exists.","InvalidAccessError")});const a=this.getSenders();n.apply(this,arguments);const l=this.getSenders().filter(c=>a.indexOf(c)===-1);this._shimmedLocalStreams[o.id]=[o].concat(l)};const r=t.RTCPeerConnection.prototype.removeStream;t.RTCPeerConnection.prototype.removeStream=function(o){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},delete this._shimmedLocalStreams[o.id],r.apply(this,arguments)};const s=t.RTCPeerConnection.prototype.removeTrack;t.RTCPeerConnection.prototype.removeTrack=function(o){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},o&&Object.keys(this._shimmedLocalStreams).forEach(a=>{const l=this._shimmedLocalStreams[a].indexOf(o);l!==-1&&this._shimmedLocalStreams[a].splice(l,1),this._shimmedLocalStreams[a].length===1&&delete this._shimmedLocalStreams[a]}),s.apply(this,arguments)}}function ov(t,e){if(!t.RTCPeerConnection)return;if(t.RTCPeerConnection.prototype.addTrack&&e.version>=65)return iv(t);const n=t.RTCPeerConnection.prototype.getLocalStreams;t.RTCPeerConnection.prototype.getLocalStreams=function(){const u=n.apply(this);return this._reverseStreams=this._reverseStreams||{},u.map(h=>this._reverseStreams[h.id])};const r=t.RTCPeerConnection.prototype.addStream;t.RTCPeerConnection.prototype.addStream=function(u){if(this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{},u.getTracks().forEach(h=>{if(this.getSenders().find(f=>f.track===h))throw new DOMException("Track already exists.","InvalidAccessError")}),!this._reverseStreams[u.id]){const h=new t.MediaStream(u.getTracks());this._streams[u.id]=h,this._reverseStreams[h.id]=u,u=h}r.apply(this,[u])};const s=t.RTCPeerConnection.prototype.removeStream;t.RTCPeerConnection.prototype.removeStream=function(u){this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{},s.apply(this,[this._streams[u.id]||u]),delete this._reverseStreams[this._streams[u.id]?this._streams[u.id].id:u.id],delete this._streams[u.id]},t.RTCPeerConnection.prototype.addTrack=function(u,h){if(this.signalingState==="closed")throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.","InvalidStateError");const d=[].slice.call(arguments,1);if(d.length!==1||!d[0].getTracks().find(p=>p===u))throw new DOMException("The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.","NotSupportedError");if(this.getSenders().find(p=>p.track===u))throw new DOMException("Track already exists.","InvalidAccessError");this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{};const m=this._streams[h.id];if(m)m.addTrack(u),Promise.resolve().then(()=>{this.dispatchEvent(new Event("negotiationneeded"))});else{const p=new t.MediaStream([u]);this._streams[h.id]=p,this._reverseStreams[p.id]=h,this.addStream(p)}return this.getSenders().find(p=>p.track===u)};function i(c,u){let h=u.sdp;return Object.keys(c._reverseStreams||[]).forEach(d=>{const f=c._reverseStreams[d],m=c._streams[f.id];h=h.replace(new RegExp(m.id,"g"),f.id)}),new RTCSessionDescription({type:u.type,sdp:h})}function o(c,u){let h=u.sdp;return Object.keys(c._reverseStreams||[]).forEach(d=>{const f=c._reverseStreams[d],m=c._streams[f.id];h=h.replace(new RegExp(f.id,"g"),m.id)}),new RTCSessionDescription({type:u.type,sdp:h})}["createOffer","createAnswer"].forEach(function(c){const u=t.RTCPeerConnection.prototype[c],h={[c](){const d=arguments;return arguments.length&&typeof arguments[0]=="function"?u.apply(this,[m=>{const p=i(this,m);d[0].apply(null,[p])},m=>{d[1]&&d[1].apply(null,m)},arguments[2]]):u.apply(this,arguments).then(m=>i(this,m))}};t.RTCPeerConnection.prototype[c]=h[c]});const a=t.RTCPeerConnection.prototype.setLocalDescription;t.RTCPeerConnection.prototype.setLocalDescription=function(){return!arguments.length||!arguments[0].type?a.apply(this,arguments):(arguments[0]=o(this,arguments[0]),a.apply(this,arguments))};const l=Object.getOwnPropertyDescriptor(t.RTCPeerConnection.prototype,"localDescription");Object.defineProperty(t.RTCPeerConnection.prototype,"localDescription",{get(){const c=l.get.apply(this);return c.type===""?c:i(this,c)}}),t.RTCPeerConnection.prototype.removeTrack=function(u){if(this.signalingState==="closed")throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.","InvalidStateError");if(!u._pc)throw new DOMException("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.","TypeError");if(!(u._pc===this))throw new DOMException("Sender was not created by this connection.","InvalidAccessError");this._streams=this._streams||{};let d;Object.keys(this._streams).forEach(f=>{this._streams[f].getTracks().find(p=>u.track===p)&&(d=this._streams[f])}),d&&(d.getTracks().length===1?this.removeStream(this._reverseStreams[d.id]):d.removeTrack(u.track),this.dispatchEvent(new Event("negotiationneeded")))}}function fh(t,e){!t.RTCPeerConnection&&t.webkitRTCPeerConnection&&(t.RTCPeerConnection=t.webkitRTCPeerConnection),t.RTCPeerConnection&&e.version<53&&["setLocalDescription","setRemoteDescription","addIceCandidate"].forEach(function(n){const r=t.RTCPeerConnection.prototype[n],s={[n](){return arguments[0]=new(n==="addIceCandidate"?t.RTCIceCandidate:t.RTCSessionDescription)(arguments[0]),r.apply(this,arguments)}};t.RTCPeerConnection.prototype[n]=s[n]})}function av(t,e){e.version>102||Xs(t,"negotiationneeded",n=>{const r=n.target;if(!((e.version<72||r.getConfiguration&&r.getConfiguration().sdpSemantics==="plan-b")&&r.signalingState!=="stable"))return n})}const jm=Object.freeze(Object.defineProperty({__proto__:null,fixNegotiationNeeded:av,shimAddTrackRemoveTrack:ov,shimAddTrackRemoveTrackWithNative:iv,shimGetSendersWithDtmf:rv,shimGetUserMedia:ev,shimMediaStream:tv,shimOnTrack:nv,shimPeerConnection:fh,shimSenderReceiverGetStats:sv},Symbol.toStringTag,{value:"Module"}));function lv(t,e){const n=t&&t.navigator;if(!n.mediaDevices)return;const r=t&&t.MediaStreamTrack;if(n.getUserMedia=function(s,i,o){zd("navigator.getUserMedia","navigator.mediaDevices.getUserMedia"),n.mediaDevices.getUserMedia(s).then(i,o)},!(e.version>55&&"autoGainControl"in n.mediaDevices.getSupportedConstraints())){const s=function(o,a,l){a in o&&!(l in o)&&(o[l]=o[a],delete o[a])},i=n.mediaDevices.getUserMedia.bind(n.mediaDevices);if(n.mediaDevices.getUserMedia=function(o){return typeof o=="object"&&typeof o.audio=="object"&&(o=JSON.parse(JSON.stringify(o)),s(o.audio,"autoGainControl","mozAutoGainControl"),s(o.audio,"noiseSuppression","mozNoiseSuppression")),i(o)},r&&r.prototype.getSettings){const o=r.prototype.getSettings;r.prototype.getSettings=function(){const a=o.apply(this,arguments);return s(a,"mozAutoGainControl","autoGainControl"),s(a,"mozNoiseSuppression","noiseSuppression"),a}}if(r&&r.prototype.applyConstraints){const o=r.prototype.applyConstraints;r.prototype.applyConstraints=function(a){return this.kind==="audio"&&typeof a=="object"&&(a=JSON.parse(JSON.stringify(a)),s(a,"autoGainControl","mozAutoGainControl"),s(a,"noiseSuppression","mozNoiseSuppression")),o.apply(this,[a])}}}}function $$(t,e){t.navigator.mediaDevices&&(t.navigator.mediaDevices&&"getDisplayMedia"in t.navigator.mediaDevices||(t.navigator.mediaDevices.getDisplayMedia=function(r){if(!(r&&r.video)){const s=new DOMException("getDisplayMedia without video constraints is undefined");return s.name="NotFoundError",s.code=8,Promise.reject(s)}return r.video===!0?r.video={mediaSource:e}:r.video.mediaSource=e,t.navigator.mediaDevices.getUserMedia(r)}))}function cv(t){typeof t=="object"&&t.RTCTrackEvent&&"receiver"in t.RTCTrackEvent.prototype&&!("transceiver"in t.RTCTrackEvent.prototype)&&Object.defineProperty(t.RTCTrackEvent.prototype,"transceiver",{get(){return{receiver:this.receiver}}})}function ph(t,e){typeof t!="object"||!(t.RTCPeerConnection||t.mozRTCPeerConnection)||(!t.RTCPeerConnection&&t.mozRTCPeerConnection&&(t.RTCPeerConnection=t.mozRTCPeerConnection),e.version<53&&["setLocalDescription","setRemoteDescription","addIceCandidate"].forEach(function(n){const r=t.RTCPeerConnection.prototype[n],s={[n](){return arguments[0]=new(n==="addIceCandidate"?t.RTCIceCandidate:t.RTCSessionDescription)(arguments[0]),r.apply(this,arguments)}};t.RTCPeerConnection.prototype[n]=s[n]}))}function uv(t,e){if(typeof t!="object"||!(t.RTCPeerConnection||t.mozRTCPeerConnection)||e.version>=151)return;const n={inboundrtp:"inbound-rtp",outboundrtp:"outbound-rtp",candidatepair:"candidate-pair",localcandidate:"local-candidate",remotecandidate:"remote-candidate"},r=t.RTCPeerConnection.prototype.getStats;t.RTCPeerConnection.prototype.getStats=function(){const[i,o,a]=arguments;return this.signalingState==="closed"?Promise.resolve(new Map):r.apply(this,[i||null]).then(l=>{if(e.version<53&&!o)try{l.forEach(c=>{c.type=n[c.type]||c.type})}catch(c){if(c.name!=="TypeError")throw c;l.forEach((u,h)=>{l.set(h,Object.assign({},u,{type:n[u.type]||u.type}))})}return l}).then(o,a)}}function hv(t){if(!(typeof t=="object"&&t.RTCPeerConnection&&t.RTCRtpSender)||t.RTCRtpSender&&"getStats"in t.RTCRtpSender.prototype)return;const e=t.RTCPeerConnection.prototype.getSenders;e&&(t.RTCPeerConnection.prototype.getSenders=function(){const s=e.apply(this,[]);return s.forEach(i=>i._pc=this),s});const n=t.RTCPeerConnection.prototype.addTrack;n&&(t.RTCPeerConnection.prototype.addTrack=function(){const s=n.apply(this,arguments);return s._pc=this,s}),t.RTCRtpSender.prototype.getStats=function(){return this.track?this._pc.getStats(this.track):Promise.resolve(new Map)}}function dv(t){if(!(typeof t=="object"&&t.RTCPeerConnection&&t.RTCRtpSender)||t.RTCRtpSender&&"getStats"in t.RTCRtpReceiver.prototype)return;const e=t.RTCPeerConnection.prototype.getReceivers;e&&(t.RTCPeerConnection.prototype.getReceivers=function(){const r=e.apply(this,[]);return r.forEach(s=>s._pc=this),r}),Xs(t,"track",n=>(n.receiver._pc=n.srcElement,n)),t.RTCRtpReceiver.prototype.getStats=function(){return this._pc.getStats(this.track)}}function fv(t){!t.RTCPeerConnection||"removeStream"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.removeStream=function(n){zd("removeStream","removeTrack"),this.getSenders().forEach(r=>{r.track&&n.getTracks().includes(r.track)&&this.removeTrack(r)})})}function pv(t){t.DataChannel&&!t.RTCDataChannel&&(t.RTCDataChannel=t.DataChannel)}function mv(t,e){if(!(typeof t=="object"&&t.RTCPeerConnection)||e.version>=110)return;const n=t.RTCPeerConnection.prototype.addTransceiver;n&&(t.RTCPeerConnection.prototype.addTransceiver=function(){this.setParametersPromises=[];let s=arguments[1]&&arguments[1].sendEncodings;s===void 0&&(s=[]),s=[...s];const i=s.length>0;i&&s.forEach(a=>{if("rid"in a&&!/^[a-z0-9]{0,16}$/i.test(a.rid))throw new TypeError("Invalid RID value provided.");if("scaleResolutionDownBy"in a&&!(parseFloat(a.scaleResolutionDownBy)>=1))throw new RangeError("scale_resolution_down_by must be >= 1.0");if("maxFramerate"in a&&!(parseFloat(a.maxFramerate)>=0))throw new RangeError("max_framerate must be >= 0.0")});const o=n.apply(this,arguments);if(i){const{sender:a}=o,l=a.getParameters();(!("encodings"in l)||l.encodings.length===1&&Object.keys(l.encodings[0]).length===0)&&(l.encodings=s,a.sendEncodings=s,this.setParametersPromises.push(a.setParameters(l).then(()=>{delete a.sendEncodings}).catch(()=>{delete a.sendEncodings})))}return o})}function gv(t,e){if(!(typeof t=="object"&&t.RTCRtpSender)||e.version>=110)return;const n=t.RTCRtpSender.prototype.getParameters;n&&(t.RTCRtpSender.prototype.getParameters=function(){const s=n.apply(this,arguments);return"encodings"in s||(s.encodings=[].concat(this.sendEncodings||[{}])),s})}function yv(t,e){if(!(typeof t=="object"&&t.RTCPeerConnection)||e.version>=110)return;const n=t.RTCPeerConnection.prototype.createOffer;t.RTCPeerConnection.prototype.createOffer=function(){return this.setParametersPromises&&this.setParametersPromises.length?Promise.all(this.setParametersPromises).then(()=>n.apply(this,arguments)).finally(()=>{this.setParametersPromises=[]}):n.apply(this,arguments)}}function bv(t,e){if(!(typeof t=="object"&&t.RTCPeerConnection)||e.version>=110)return;const n=t.RTCPeerConnection.prototype.createAnswer;t.RTCPeerConnection.prototype.createAnswer=function(){return this.setParametersPromises&&this.setParametersPromises.length?Promise.all(this.setParametersPromises).then(()=>n.apply(this,arguments)).finally(()=>{this.setParametersPromises=[]}):n.apply(this,arguments)}}const Wm=Object.freeze(Object.defineProperty({__proto__:null,shimAddTransceiver:mv,shimCreateAnswer:bv,shimCreateOffer:yv,shimGetDisplayMedia:$$,shimGetParameters:gv,shimGetStats:uv,shimGetUserMedia:lv,shimOnTrack:cv,shimPeerConnection:ph,shimRTCDataChannel:pv,shimReceiverGetStats:dv,shimRemoveStream:fv,shimSenderGetStats:hv},Symbol.toStringTag,{value:"Module"}));function vv(t){if(!(typeof t!="object"||!t.RTCPeerConnection)){if("getLocalStreams"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.getLocalStreams=function(){return this._localStreams||(this._localStreams=[]),this._localStreams}),!("addStream"in t.RTCPeerConnection.prototype)){const e=t.RTCPeerConnection.prototype.addTrack;t.RTCPeerConnection.prototype.addStream=function(r){this._localStreams||(this._localStreams=[]),this._localStreams.includes(r)||this._localStreams.push(r),r.getAudioTracks().forEach(s=>e.call(this,s,r)),r.getVideoTracks().forEach(s=>e.call(this,s,r))},t.RTCPeerConnection.prototype.addTrack=function(r,...s){return s&&s.forEach(i=>{this._localStreams?this._localStreams.includes(i)||this._localStreams.push(i):this._localStreams=[i]}),e.apply(this,arguments)}}"removeStream"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.removeStream=function(n){this._localStreams||(this._localStreams=[]);const r=this._localStreams.indexOf(n);if(r===-1)return;this._localStreams.splice(r,1);const s=n.getTracks();this.getSenders().forEach(i=>{s.includes(i.track)&&this.removeTrack(i)})})}}function wv(t){if(!(typeof t!="object"||!t.RTCPeerConnection)&&("getRemoteStreams"in t.RTCPeerConnection.prototype||(t.RTCPeerConnection.prototype.getRemoteStreams=function(){return this._remoteStreams?this._remoteStreams:[]}),!("onaddstream"in t.RTCPeerConnection.prototype))){Object.defineProperty(t.RTCPeerConnection.prototype,"onaddstream",{get(){return this._onaddstream},set(n){this._onaddstream&&(this.removeEventListener("addstream",this._onaddstream),this.removeEventListener("track",this._onaddstreampoly)),this.addEventListener("addstream",this._onaddstream=n),this.addEventListener("track",this._onaddstreampoly=r=>{r.streams.forEach(s=>{if(this._remoteStreams||(this._remoteStreams=[]),this._remoteStreams.includes(s))return;this._remoteStreams.push(s);const i=new Event("addstream");i.stream=s,this.dispatchEvent(i)})})}});const e=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(){const r=this;return this._onaddstreampoly||this.addEventListener("track",this._onaddstreampoly=function(s){s.streams.forEach(i=>{if(r._remoteStreams||(r._remoteStreams=[]),r._remoteStreams.indexOf(i)>=0)return;r._remoteStreams.push(i);const o=new Event("addstream");o.stream=i,r.dispatchEvent(o)})}),e.apply(r,arguments)}}}function _v(t){if(typeof t!="object"||!t.RTCPeerConnection)return;const e=t.RTCPeerConnection.prototype,n=e.createOffer,r=e.createAnswer,s=e.setLocalDescription,i=e.setRemoteDescription,o=e.addIceCandidate;e.createOffer=function(c,u){const h=arguments.length>=2?arguments[2]:arguments[0],d=n.apply(this,[h]);return u?(d.then(c,u),Promise.resolve()):d},e.createAnswer=function(c,u){const h=arguments.length>=2?arguments[2]:arguments[0],d=r.apply(this,[h]);return u?(d.then(c,u),Promise.resolve()):d};let a=function(l,c,u){const h=s.apply(this,[l]);return u?(h.then(c,u),Promise.resolve()):h};e.setLocalDescription=a,a=function(l,c,u){const h=i.apply(this,[l]);return u?(h.then(c,u),Promise.resolve()):h},e.setRemoteDescription=a,a=function(l,c,u){const h=o.apply(this,[l]);return u?(h.then(c,u),Promise.resolve()):h},e.addIceCandidate=a}function xv(t){const e=t&&t.navigator;if(e.mediaDevices&&e.mediaDevices.getUserMedia){const n=e.mediaDevices,r=n.getUserMedia.bind(n);e.mediaDevices.getUserMedia=s=>r(kv(s))}!e.getUserMedia&&e.mediaDevices&&e.mediaDevices.getUserMedia&&(e.getUserMedia=(function(r,s,i){e.mediaDevices.getUserMedia(r).then(s,i)}).bind(e))}function kv(t){return t&&t.video!==void 0?Object.assign({},t,{video:Kb(t.video)}):t}function Sv(t){if(!t.RTCPeerConnection)return;const e=t.RTCPeerConnection;t.RTCPeerConnection=function(r,s){if(r&&r.iceServers){const i=[];for(let o=0;o<r.iceServers.length;o++){let a=r.iceServers[o];a.urls===void 0&&a.url?(zd("RTCIceServer.url","RTCIceServer.urls"),a=JSON.parse(JSON.stringify(a)),a.urls=a.url,delete a.url,i.push(a)):i.push(r.iceServers[o])}r.iceServers=i}return new e(r,s)},t.RTCPeerConnection.prototype=e.prototype,"generateCertificate"in e&&Object.defineProperty(t.RTCPeerConnection,"generateCertificate",{get(){return e.generateCertificate}})}function Ev(t){typeof t=="object"&&t.RTCTrackEvent&&"receiver"in t.RTCTrackEvent.prototype&&!("transceiver"in t.RTCTrackEvent.prototype)&&Object.defineProperty(t.RTCTrackEvent.prototype,"transceiver",{get(){return{receiver:this.receiver}}})}function Av(t){const e=t.RTCPeerConnection.prototype.createOffer;t.RTCPeerConnection.prototype.createOffer=function(r){if(r){typeof r.offerToReceiveAudio<"u"&&(r.offerToReceiveAudio=!!r.offerToReceiveAudio);const s=this.getTransceivers().find(o=>o.receiver.track.kind==="audio");r.offerToReceiveAudio===!1&&s?s.direction==="sendrecv"?s.setDirection?s.setDirection("sendonly"):s.direction="sendonly":s.direction==="recvonly"&&(s.setDirection?s.setDirection("inactive"):s.direction="inactive"):r.offerToReceiveAudio===!0&&!s&&this.addTransceiver("audio",{direction:"recvonly"}),typeof r.offerToReceiveVideo<"u"&&(r.offerToReceiveVideo=!!r.offerToReceiveVideo);const i=this.getTransceivers().find(o=>o.receiver.track.kind==="video");r.offerToReceiveVideo===!1&&i?i.direction==="sendrecv"?i.setDirection?i.setDirection("sendonly"):i.direction="sendonly":i.direction==="recvonly"&&(i.setDirection?i.setDirection("inactive"):i.direction="inactive"):r.offerToReceiveVideo===!0&&!i&&this.addTransceiver("video",{direction:"recvonly"})}return e.apply(this,arguments)}}function Tv(t){typeof t!="object"||t.AudioContext||(t.AudioContext=t.webkitAudioContext)}const Vm=Object.freeze(Object.defineProperty({__proto__:null,shimAudioContext:Tv,shimCallbacksAPI:_v,shimConstraints:kv,shimCreateOfferLegacy:Av,shimGetUserMedia:xv,shimLocalStreamsAPI:vv,shimRTCIceServerUrls:Sv,shimRemoteStreamsAPI:wv,shimTrackEventTransceiver:Ev},Symbol.toStringTag,{value:"Module"}));var yu={exports:{}},Gm;function L$(){return Gm||(Gm=1,(function(t){const e={};e.generateIdentifier=function(){return Math.random().toString(36).substring(2,12)},e.localCName=e.generateIdentifier(),e.splitLines=function(n){return n.trim().split(`
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
`),r},e.parseRtpParameters=function(n){const r={codecs:[],headerExtensions:[],fecMechanisms:[],rtcp:[]},i=e.splitLines(n)[0].split(" ");r.profile=i[2];for(let a=3;a<i.length;a++){const l=i[a],c=e.matchPrefix(n,"a=rtpmap:"+l+" ")[0];if(c){const u=e.parseRtpMap(c),h=e.matchPrefix(n,"a=fmtp:"+l+" ");switch(u.parameters=h.length?e.parseFmtp(h[0]):{},u.rtcpFeedback=e.matchPrefix(n,"a=rtcp-fb:"+l+" ").map(e.parseRtcpFb),r.codecs.push(u),u.name.toUpperCase()){case"RED":case"ULPFEC":r.fecMechanisms.push(u.name.toUpperCase());break}}}e.matchPrefix(n,"a=extmap:").forEach(a=>{r.headerExtensions.push(e.parseExtmap(a))});const o=e.matchPrefix(n,"a=rtcp-fb:* ").map(e.parseRtcpFb);return r.codecs.forEach(a=>{o.forEach(l=>{a.rtcpFeedback.find(u=>u.type===l.type&&u.parameter===l.parameter)||a.rtcpFeedback.push(l)})}),r},e.writeRtpDescription=function(n,r){let s="";s+="m="+n+" ",s+=r.codecs.length>0?"9":"0",s+=" "+(r.profile||"UDP/TLS/RTP/SAVPF")+" ",s+=r.codecs.map(o=>o.preferredPayloadType!==void 0?o.preferredPayloadType:o.payloadType).join(" ")+`\r
`,s+=`c=IN IP4 0.0.0.0\r
`,s+=`a=rtcp:9 IN IP4 0.0.0.0\r
`,r.codecs.forEach(o=>{s+=e.writeRtpMap(o),s+=e.writeFmtp(o),s+=e.writeRtcpFb(o)});let i=0;return r.codecs.forEach(o=>{o.maxptime>i&&(i=o.maxptime)}),i>0&&(s+="a=maxptime:"+i+`\r
`),r.headerExtensions&&r.headerExtensions.forEach(o=>{s+=e.writeExtmap(o)}),s},e.parseRtpEncodingParameters=function(n){const r=[],s=e.parseRtpParameters(n),i=s.fecMechanisms.indexOf("RED")!==-1,o=s.fecMechanisms.indexOf("ULPFEC")!==-1,a=e.matchPrefix(n,"a=ssrc:").map(d=>e.parseSsrcMedia(d)).filter(d=>d.attribute==="cname"),l=a.length>0&&a[0].ssrc;let c;const u=e.matchPrefix(n,"a=ssrc-group:FID").map(d=>d.substring(17).split(" ").map(m=>parseInt(m,10)));u.length>0&&u[0].length>1&&u[0][0]===l&&(c=u[0][1]),s.codecs.forEach(d=>{if(d.name.toUpperCase()==="RTX"&&d.parameters.apt){let f={ssrc:l,codecPayloadType:parseInt(d.parameters.apt,10)};l&&c&&(f.rtx={ssrc:c}),r.push(f),i&&(f=JSON.parse(JSON.stringify(f)),f.fec={ssrc:l,mechanism:o?"red+ulpfec":"red"},r.push(f))}}),r.length===0&&l&&r.push({ssrc:l});let h=e.matchPrefix(n,"b=");return h.length&&(h[0].indexOf("b=TIAS:")===0?h=parseInt(h[0].substring(7),10):h[0].indexOf("b=AS:")===0?h=parseInt(h[0].substring(5),10)*1e3*.95-2e3*8:h=void 0,r.forEach(d=>{d.maxBitrate=h})),r},e.parseRtcpParameters=function(n){const r={},s=e.matchPrefix(n,"a=ssrc:").map(a=>e.parseSsrcMedia(a)).filter(a=>a.attribute==="cname")[0];s&&(r.cname=s.value,r.ssrc=s.ssrc);const i=e.matchPrefix(n,"a=rtcp-rsize");r.reducedSize=i.length>0,r.compound=i.length===0;const o=e.matchPrefix(n,"a=rtcp-mux");return r.mux=o.length>0,r},e.writeRtcpParameters=function(n){let r="";return n.reducedSize&&(r+=`a=rtcp-rsize\r
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
`},e.getDirection=function(n,r){const s=e.splitLines(n);for(let i=0;i<s.length;i++)switch(s[i]){case"a=sendrecv":case"a=sendonly":case"a=recvonly":case"a=inactive":return s[i].substring(2)}return r?e.getDirection(r):"sendrecv"},e.getKind=function(n){return e.splitLines(n)[0].split(" ")[0].substring(2)},e.isRejected=function(n){return n.split(" ",2)[1]==="0"},e.parseMLine=function(n){const s=e.splitLines(n)[0].substring(2).split(" ");return{kind:s[0],port:parseInt(s[1],10),protocol:s[2],fmt:s.slice(3).join(" ")}},e.parseOLine=function(n){const s=e.matchPrefix(n,"o=")[0].substring(2).split(" ");return{username:s[0],sessionId:s[1],sessionVersion:parseInt(s[2],10),netType:s[3],addressType:s[4],address:s[5]}},e.isValidSDP=function(n){if(typeof n!="string"||n.length===0)return!1;const r=e.splitLines(n);for(let s=0;s<r.length;s++)if(r[s].length<2||r[s].charAt(1)!=="=")return!1;return!0},t.exports=e})(yu)),yu.exports}var Cv=L$();const Ti=Fy(Cv),D$=uw({__proto__:null,default:Ti},[Cv]);function Xa(t){if(!t.RTCIceCandidate||t.RTCIceCandidate&&"foundation"in t.RTCIceCandidate.prototype)return;const e=t.RTCIceCandidate;t.RTCIceCandidate=function(r){if(typeof r=="object"&&r.candidate&&r.candidate.indexOf("a=")===0&&(r=JSON.parse(JSON.stringify(r)),r.candidate=r.candidate.substring(2)),r.candidate&&r.candidate.length){const s=new e(r),i=Ti.parseCandidate(r.candidate);for(const o in i)o in s||Object.defineProperty(s,o,{value:i[o]});return s.toJSON=function(){return{candidate:s.candidate,sdpMid:s.sdpMid,sdpMLineIndex:s.sdpMLineIndex,usernameFragment:s.usernameFragment}},s}return new e(r)},t.RTCIceCandidate.prototype=e.prototype,Xs(t,"icecandidate",n=>(n.candidate&&Object.defineProperty(n,"candidate",{value:new t.RTCIceCandidate(n.candidate),writable:"false"}),n))}function mh(t){!t.RTCIceCandidate||t.RTCIceCandidate&&"relayProtocol"in t.RTCIceCandidate.prototype||Xs(t,"icecandidate",e=>{if(e.candidate){const n=Ti.parseCandidate(e.candidate.candidate);n.type==="relay"&&(e.candidate.relayProtocol={0:"tls",1:"tcp",2:"udp"}[n.priority>>24])}return e})}function Za(t,e){if(!t.RTCPeerConnection||e.browser==="chrome"&&e.version>102||e.browser==="firefox"&&e.version>=113)return;"sctp"in t.RTCPeerConnection.prototype||Object.defineProperty(t.RTCPeerConnection.prototype,"sctp",{get(){return typeof this._sctp>"u"?null:this._sctp}});const n=function(a){if(!a||!a.sdp)return!1;const l=Ti.splitSections(a.sdp);return l.shift(),l.some(c=>{const u=Ti.parseMLine(c);return u&&u.kind==="application"&&u.protocol.indexOf("SCTP")!==-1})},r=function(a){const l=a.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);if(l===null||l.length<2)return-1;const c=parseInt(l[1],10);return c!==c?-1:c},s=function(a){let l=65536;return e.browser==="firefox"&&(e.version<57?a===-1?l=16384:l=2147483637:e.version<60?l=e.version===57?65535:65536:l=2147483637),l},i=function(a,l){let c=65536;e.browser==="firefox"&&e.version===57&&(c=65535);const u=Ti.matchPrefix(a.sdp,"a=max-message-size:");return u.length>0?c=parseInt(u[0].substring(19),10):e.browser==="firefox"&&l!==-1&&(c=2147483637),c},o=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(){if(this._sctp=null,e.browser==="chrome"&&e.version>=76){const{sdpSemantics:l}=this.getConfiguration();l==="plan-b"&&Object.defineProperty(this,"sctp",{get(){return typeof this._sctp>"u"?null:this._sctp},enumerable:!0,configurable:!0})}if(n(arguments[0])){const l=r(arguments[0]),c=s(l),u=i(arguments[0],l);let h;c===0&&u===0?h=Number.POSITIVE_INFINITY:c===0||u===0?h=Math.max(c,u):h=Math.min(c,u);const d={};Object.defineProperty(d,"maxMessageSize",{get(){return h}}),this._sctp=d}return o.apply(this,arguments)}}function Ja(t,e){if(!(t.RTCPeerConnection&&"createDataChannel"in t.RTCPeerConnection.prototype)||e.browser==="chrome"&&e.version>=149||e.browser==="firefox"&&e.version>60)return;function n(s,i){const o=s.send;s.send=function(){const l=arguments[0],c=l.length||l.size||l.byteLength;if(s.readyState==="open"&&i.sctp&&c>i.sctp.maxMessageSize)throw new TypeError("Message too large (can send a maximum of "+i.sctp.maxMessageSize+" bytes)");return o.apply(s,arguments)}}const r=t.RTCPeerConnection.prototype.createDataChannel;t.RTCPeerConnection.prototype.createDataChannel=function(){const i=r.apply(this,arguments);return n(i,this),i},Xs(t,"datachannel",s=>(n(s.channel,s.target),s))}function gh(t){if(!t.RTCPeerConnection||"connectionState"in t.RTCPeerConnection.prototype)return;const e=t.RTCPeerConnection.prototype;Object.defineProperty(e,"connectionState",{get(){return{completed:"connected",checking:"connecting"}[this.iceConnectionState]||this.iceConnectionState},enumerable:!0,configurable:!0}),Object.defineProperty(e,"onconnectionstatechange",{get(){return this._onconnectionstatechange||null},set(n){this._onconnectionstatechange&&(this.removeEventListener("connectionstatechange",this._onconnectionstatechange),delete this._onconnectionstatechange),n&&this.addEventListener("connectionstatechange",this._onconnectionstatechange=n)},enumerable:!0,configurable:!0}),["setLocalDescription","setRemoteDescription"].forEach(n=>{const r=e[n];e[n]=function(){return this._connectionstatechangepoly||(this._connectionstatechangepoly=s=>{const i=s.target;if(i._lastConnectionState!==i.connectionState){i._lastConnectionState=i.connectionState;const o=new Event("connectionstatechange",s);i.dispatchEvent(o)}return s},this.addEventListener("iceconnectionstatechange",this._connectionstatechangepoly)),r.apply(this,arguments)}})}function yh(t,e){if(!t.RTCPeerConnection||e.browser==="chrome"&&e.version>=71||e.browser==="safari"&&e._safariVersion>=13.1)return;const n=t.RTCPeerConnection.prototype.setRemoteDescription;t.RTCPeerConnection.prototype.setRemoteDescription=function(s){if(s&&s.sdp&&s.sdp.indexOf(`
a=extmap-allow-mixed`)!==-1){const i=s.sdp.split(`
`).filter(o=>o.trim()!=="a=extmap-allow-mixed").join(`
`);t.RTCSessionDescription&&s instanceof t.RTCSessionDescription?arguments[0]=new t.RTCSessionDescription({type:s.type,sdp:i}):s.sdp=i}return n.apply(this,arguments)}}function Qa(t,e){if(!(t.RTCPeerConnection&&t.RTCPeerConnection.prototype))return;const n=t.RTCPeerConnection.prototype.addIceCandidate;!n||n.length===0||(t.RTCPeerConnection.prototype.addIceCandidate=function(){return arguments[0]?(e.browser==="chrome"&&e.version<78||e.browser==="firefox"&&e.version<68||e.browser==="safari")&&arguments[0]&&arguments[0].candidate===""?Promise.resolve():n.apply(this,arguments):(arguments[1]&&arguments[1].apply(null),Promise.resolve())})}function Ka(t,e){if(!(t.RTCPeerConnection&&t.RTCPeerConnection.prototype))return;const n=t.RTCPeerConnection.prototype.setLocalDescription;!n||n.length===0||(t.RTCPeerConnection.prototype.setLocalDescription=function(){let s=arguments[0]||{};if(typeof s!="object"||s.type&&s.sdp)return n.apply(this,arguments);if(s={type:s.type,sdp:s.sdp},!s.type)switch(this.signalingState){case"stable":case"have-local-offer":case"have-remote-pranswer":s.type="offer";break;default:s.type="answer";break}return s.sdp||s.type!=="offer"&&s.type!=="answer"?n.apply(this,[s]):(s.type==="offer"?this.createOffer:this.createAnswer).apply(this).then(o=>n.apply(this,[o]))})}const N$=Object.freeze(Object.defineProperty({__proto__:null,removeExtmapAllowMixed:yh,shimAddIceCandidateNullOrEmpty:Qa,shimConnectionState:gh,shimMaxMessageSize:Za,shimParameterlessSetLocalDescription:Ka,shimRTCIceCandidate:Xa,shimRTCIceCandidateRelayProtocol:mh,shimSendThrowTypeError:Ja},Symbol.toStringTag,{value:"Module"}));function F$({window:t}={},e={shimChrome:!0,shimFirefox:!0,shimSafari:!0}){const n=Id,r=O$(t),s={browserDetails:r,commonShim:N$,extractVersion:ho,disableLog:z$,disableWarnings:P$,sdp:D$};switch(r.browser){case"chrome":if(!jm||!fh||!e.shimChrome)return n("Chrome shim is not included in this adapter release."),s;if(r.version===null)return n("Chrome shim can not determine version, not shimming."),s;n("adapter.js shimming chrome."),s.browserShim=jm,Qa(t,r),Ka(t),ev(t,r),tv(t),fh(t,r),nv(t,r),ov(t,r),rv(t),sv(t,r),av(t,r),Xa(t),mh(t),gh(t),Za(t,r),Ja(t,r),yh(t,r);break;case"firefox":if(!Wm||!ph||!e.shimFirefox)return n("Firefox shim is not included in this adapter release."),s;n("adapter.js shimming firefox."),s.browserShim=Wm,Qa(t,r),Ka(t),lv(t,r),ph(t,r),uv(t,r),cv(t),fv(t),hv(t),dv(t),pv(t),mv(t,r),gv(t,r),yv(t,r),bv(t,r),Xa(t),gh(t),Za(t,r),Ja(t,r);break;case"safari":if(!Vm||!e.shimSafari)return n("Safari shim is not included in this adapter release."),s;n("adapter.js shimming safari."),s.browserShim=Vm,Qa(t,r),Ka(t),Sv(t),Av(t),_v(t),vv(t),wv(t),Ev(t),xv(t),Tv(t),Xa(t),mh(t),Za(t,r),Ja(t,r),yh(t,r);break;default:n("Unsupported browser!");break}return s}const Ym=F$({window:typeof window>"u"?void 0:window});function Zs(t,e,n,r){Object.defineProperty(t,e,{get:n,set:r,enumerable:!0,configurable:!0})}class Mv{constructor(){this.chunkedMTU=16300,this._dataCount=1,this.chunk=e=>{const n=[],r=e.byteLength,s=Math.ceil(r/this.chunkedMTU);let i=0,o=0;for(;o<r;){const a=Math.min(r,o+this.chunkedMTU),l=e.slice(o,a),c={__peerData:this._dataCount,n:i,data:l,total:s};n.push(c),o=a,i++}return this._dataCount++,n}}}function B$(t){let e=0;for(const s of t)e+=s.byteLength;const n=new Uint8Array(e);let r=0;for(const s of t)n.set(s,r),r+=s.byteLength;return n}const bu=Ym.default||Ym,eo=new class{isWebRTCSupported(){return typeof RTCPeerConnection<"u"}isBrowserSupported(){const t=this.getBrowser(),e=this.getVersion();return this.supportedBrowsers.includes(t)?t==="chrome"?e>=this.minChromeVersion:t==="firefox"?e>=this.minFirefoxVersion:t==="safari"?!this.isIOS&&e>=this.minSafariVersion:!1:!1}getBrowser(){return bu.browserDetails.browser}getVersion(){return bu.browserDetails.version||0}isUnifiedPlanSupported(){const t=this.getBrowser(),e=bu.browserDetails.version||0;if(t==="chrome"&&e<this.minChromeVersion)return!1;if(t==="firefox"&&e>=this.minFirefoxVersion)return!0;if(!window.RTCRtpTransceiver||!("currentDirection"in RTCRtpTransceiver.prototype))return!1;let n,r=!1;try{n=new RTCPeerConnection,n.addTransceiver("audio"),r=!0}catch{}finally{n&&n.close()}return r}toString(){return`Supports:
    browser:${this.getBrowser()}
    version:${this.getVersion()}
    isIOS:${this.isIOS}
    isWebRTCSupported:${this.isWebRTCSupported()}
    isBrowserSupported:${this.isBrowserSupported()}
    isUnifiedPlanSupported:${this.isUnifiedPlanSupported()}`}constructor(){this.isIOS=typeof navigator<"u"?["iPad","iPhone","iPod"].includes(navigator.platform):!1,this.supportedBrowsers=["firefox","chrome","safari"],this.minFirefoxVersion=59,this.minChromeVersion=72,this.minSafariVersion=605}},U$=t=>!t||/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(t),Rv=()=>Math.random().toString(36).slice(2),qm={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:["turn:eu-0.turn.peerjs.com:3478","turn:us-0.turn.peerjs.com:3478"],username:"peerjs",credential:"peerjsp"}],sdpSemantics:"unified-plan"};class H$ extends Mv{noop(){}blobToArrayBuffer(e,n){const r=new FileReader;return r.onload=function(s){s.target&&n(s.target.result)},r.readAsArrayBuffer(e),r}binaryStringToArrayBuffer(e){const n=new Uint8Array(e.length);for(let r=0;r<e.length;r++)n[r]=e.charCodeAt(r)&255;return n.buffer}isSecure(){return location.protocol==="https:"}constructor(...e){super(...e),this.CLOUD_HOST="0.peerjs.com",this.CLOUD_PORT=443,this.chunkedBrowsers={Chrome:1,chrome:1},this.defaultConfig=qm,this.browser=eo.getBrowser(),this.browserVersion=eo.getVersion(),this.pack=Zb,this.unpack=Xb,this.supports=(function(){const n={browser:eo.isBrowserSupported(),webRTC:eo.isWebRTCSupported(),audioVideo:!1,data:!1,binaryBlob:!1,reliable:!1};if(!n.webRTC)return n;let r;try{r=new RTCPeerConnection(qm),n.audioVideo=!0;let s;try{s=r.createDataChannel("_PEERJSTEST",{ordered:!0}),n.data=!0,n.reliable=!!s.ordered;try{s.binaryType="blob",n.binaryBlob=!eo.isIOS}catch{}}catch{}finally{s&&s.close()}}catch{}finally{r&&r.close()}return n})(),this.validateId=U$,this.randomToken=Rv}}const pn=new H$,j$="PeerJS: ";class W${get logLevel(){return this._logLevel}set logLevel(e){this._logLevel=e}log(...e){this._logLevel>=3&&this._print(3,...e)}warn(...e){this._logLevel>=2&&this._print(2,...e)}error(...e){this._logLevel>=1&&this._print(1,...e)}setLogFunction(e){this._print=e}_print(e,...n){const r=[j$,...n];for(const s in r)r[s]instanceof Error&&(r[s]="("+r[s].name+") "+r[s].message);e>=3?console.log(...r):e>=2?console.warn("WARNING",...r):e>=1&&console.error("ERROR",...r)}constructor(){this._logLevel=0}}var be=new W$,Pd={},V$=Object.prototype.hasOwnProperty,ln="~";function No(){}Object.create&&(No.prototype=Object.create(null),new No().__proto__||(ln=!1));function G$(t,e,n){this.fn=t,this.context=e,this.once=n||!1}function Iv(t,e,n,r,s){if(typeof n!="function")throw new TypeError("The listener must be a function");var i=new G$(n,r||t,s),o=ln?ln+e:e;return t._events[o]?t._events[o].fn?t._events[o]=[t._events[o],i]:t._events[o].push(i):(t._events[o]=i,t._eventsCount++),t}function el(t,e){--t._eventsCount===0?t._events=new No:delete t._events[e]}function Kt(){this._events=new No,this._eventsCount=0}Kt.prototype.eventNames=function(){var e=[],n,r;if(this._eventsCount===0)return e;for(r in n=this._events)V$.call(n,r)&&e.push(ln?r.slice(1):r);return Object.getOwnPropertySymbols?e.concat(Object.getOwnPropertySymbols(n)):e};Kt.prototype.listeners=function(e){var n=ln?ln+e:e,r=this._events[n];if(!r)return[];if(r.fn)return[r.fn];for(var s=0,i=r.length,o=new Array(i);s<i;s++)o[s]=r[s].fn;return o};Kt.prototype.listenerCount=function(e){var n=ln?ln+e:e,r=this._events[n];return r?r.fn?1:r.length:0};Kt.prototype.emit=function(e,n,r,s,i,o){var a=ln?ln+e:e;if(!this._events[a])return!1;var l=this._events[a],c=arguments.length,u,h;if(l.fn){switch(l.once&&this.removeListener(e,l.fn,void 0,!0),c){case 1:return l.fn.call(l.context),!0;case 2:return l.fn.call(l.context,n),!0;case 3:return l.fn.call(l.context,n,r),!0;case 4:return l.fn.call(l.context,n,r,s),!0;case 5:return l.fn.call(l.context,n,r,s,i),!0;case 6:return l.fn.call(l.context,n,r,s,i,o),!0}for(h=1,u=new Array(c-1);h<c;h++)u[h-1]=arguments[h];l.fn.apply(l.context,u)}else{var d=l.length,f;for(h=0;h<d;h++)switch(l[h].once&&this.removeListener(e,l[h].fn,void 0,!0),c){case 1:l[h].fn.call(l[h].context);break;case 2:l[h].fn.call(l[h].context,n);break;case 3:l[h].fn.call(l[h].context,n,r);break;case 4:l[h].fn.call(l[h].context,n,r,s);break;default:if(!u)for(f=1,u=new Array(c-1);f<c;f++)u[f-1]=arguments[f];l[h].fn.apply(l[h].context,u)}}return!0};Kt.prototype.on=function(e,n,r){return Iv(this,e,n,r,!1)};Kt.prototype.once=function(e,n,r){return Iv(this,e,n,r,!0)};Kt.prototype.removeListener=function(e,n,r,s){var i=ln?ln+e:e;if(!this._events[i])return this;if(!n)return el(this,i),this;var o=this._events[i];if(o.fn)o.fn===n&&(!s||o.once)&&(!r||o.context===r)&&el(this,i);else{for(var a=0,l=[],c=o.length;a<c;a++)(o[a].fn!==n||s&&!o[a].once||r&&o[a].context!==r)&&l.push(o[a]);l.length?this._events[i]=l.length===1?l[0]:l:el(this,i)}return this};Kt.prototype.removeAllListeners=function(e){var n;return e?(n=ln?ln+e:e,this._events[n]&&el(this,n)):(this._events=new No,this._eventsCount=0),this};Kt.prototype.off=Kt.prototype.removeListener;Kt.prototype.addListener=Kt.prototype.on;Kt.prefixed=ln;Kt.EventEmitter=Kt;Pd=Kt;var Js={};Zs(Js,"ConnectionType",()=>ys);Zs(Js,"PeerErrorType",()=>zt);Zs(Js,"BaseConnectionErrorType",()=>bh);Zs(Js,"DataConnectionErrorType",()=>Od);Zs(Js,"SerializationType",()=>oc);Zs(Js,"SocketEventType",()=>fs);Zs(Js,"ServerMessageType",()=>qt);var ys=(function(t){return t.Data="data",t.Media="media",t})({}),zt=(function(t){return t.BrowserIncompatible="browser-incompatible",t.Disconnected="disconnected",t.InvalidID="invalid-id",t.InvalidKey="invalid-key",t.Network="network",t.PeerUnavailable="peer-unavailable",t.SslUnavailable="ssl-unavailable",t.ServerError="server-error",t.SocketError="socket-error",t.SocketClosed="socket-closed",t.UnavailableID="unavailable-id",t.WebRTC="webrtc",t})({}),bh=(function(t){return t.NegotiationFailed="negotiation-failed",t.ConnectionClosed="connection-closed",t})({}),Od=(function(t){return t.NotOpenYet="not-open-yet",t.MessageToBig="message-too-big",t})({}),oc=(function(t){return t.Binary="binary",t.BinaryUTF8="binary-utf8",t.JSON="json",t.None="raw",t})({}),fs=(function(t){return t.Message="message",t.Disconnected="disconnected",t.Error="error",t.Close="close",t})({}),qt=(function(t){return t.Heartbeat="HEARTBEAT",t.Candidate="CANDIDATE",t.Offer="OFFER",t.Answer="ANSWER",t.Open="OPEN",t.Error="ERROR",t.IdTaken="ID-TAKEN",t.InvalidKey="INVALID-KEY",t.Leave="LEAVE",t.Expire="EXPIRE",t})({});const zv="1.5.5";class Y$ extends Pd.EventEmitter{constructor(e,n,r,s,i,o=5e3){super(),this.pingInterval=o,this._disconnected=!0,this._messagesQueue=[];const a=e?"wss://":"ws://";this._baseUrl=a+n+":"+r+s+"peerjs?key="+i}start(e,n){this._id=e;const r=`${this._baseUrl}&id=${e}&token=${n}`;this._socket||!this._disconnected||(this._socket=new WebSocket(r+"&version="+zv),this._disconnected=!1,this._socket.onmessage=s=>{let i;try{i=JSON.parse(s.data),be.log("Server message received:",i)}catch{be.log("Invalid server message",s.data);return}this.emit(fs.Message,i)},this._socket.onclose=s=>{this._disconnected||(be.log("Socket closed.",s),this._cleanup(),this._disconnected=!0,this.emit(fs.Disconnected))},this._socket.onopen=()=>{this._disconnected||(this._sendQueuedMessages(),be.log("Socket open"),this._scheduleHeartbeat())})}_scheduleHeartbeat(){this._wsPingTimer=setTimeout(()=>{this._sendHeartbeat()},this.pingInterval)}_sendHeartbeat(){if(!this._wsOpen()){be.log("Cannot send heartbeat, because socket closed");return}const e=JSON.stringify({type:qt.Heartbeat});this._socket.send(e),this._scheduleHeartbeat()}_wsOpen(){return!!this._socket&&this._socket.readyState===1}_sendQueuedMessages(){const e=[...this._messagesQueue];this._messagesQueue=[];for(const n of e)this.send(n)}send(e){if(this._disconnected)return;if(!this._id){this._messagesQueue.push(e);return}if(!e.type){this.emit(fs.Error,"Invalid message");return}if(!this._wsOpen())return;const n=JSON.stringify(e);this._socket.send(n)}close(){this._disconnected||(this._cleanup(),this._disconnected=!0)}_cleanup(){this._socket&&(this._socket.onopen=this._socket.onmessage=this._socket.onclose=null,this._socket.close(),this._socket=void 0),clearTimeout(this._wsPingTimer)}}class Pv{constructor(e){this.connection=e}startConnection(e){const n=this._startPeerConnection();if(this.connection.peerConnection=n,this.connection.type===ys.Media&&e._stream&&this._addTracksToConnection(e._stream,n),e.originator){const r=this.connection,s={ordered:!!e.reliable},i=n.createDataChannel(r.label,s);r._initializeDataChannel(i),this._makeOffer()}else this.handleSDP("OFFER",e.sdp)}_startPeerConnection(){be.log("Creating RTCPeerConnection.");const e=new RTCPeerConnection(this.connection.provider.options.config);return this._setupListeners(e),e}_setupListeners(e){const n=this.connection.peer,r=this.connection.connectionId,s=this.connection.type,i=this.connection.provider;be.log("Listening for ICE candidates."),e.onicecandidate=o=>{!o.candidate||!o.candidate.candidate||(be.log(`Received ICE candidates for ${n}:`,o.candidate),i.socket.send({type:qt.Candidate,payload:{candidate:o.candidate,type:s,connectionId:r},dst:n}))},e.oniceconnectionstatechange=()=>{switch(e.iceConnectionState){case"failed":be.log("iceConnectionState is failed, closing connections to "+n),this.connection.emitError(bh.NegotiationFailed,"Negotiation of connection to "+n+" failed."),this.connection.close();break;case"closed":be.log("iceConnectionState is closed, closing connections to "+n),this.connection.emitError(bh.ConnectionClosed,"Connection to "+n+" closed."),this.connection.close();break;case"disconnected":be.log("iceConnectionState changed to disconnected on the connection with "+n);break;case"completed":e.onicecandidate=()=>{};break}this.connection.emit("iceStateChanged",e.iceConnectionState)},be.log("Listening for data channel"),e.ondatachannel=o=>{be.log("Received data channel");const a=o.channel;i.getConnection(n,r)._initializeDataChannel(a)},be.log("Listening for remote stream"),e.ontrack=o=>{be.log("Received remote stream");const a=o.streams[0],l=i.getConnection(n,r);if(l.type===ys.Media){const c=l;this._addStreamToMediaConnection(a,c)}}}cleanup(){be.log("Cleaning up PeerConnection to "+this.connection.peer);const e=this.connection.peerConnection;if(!e)return;this.connection.peerConnection=null,e.onicecandidate=e.oniceconnectionstatechange=e.ondatachannel=e.ontrack=()=>{};const n=e.signalingState!=="closed";let r=!1;const s=this.connection.dataChannel;s&&(r=!!s.readyState&&s.readyState!=="closed"),(n||r)&&e.close()}async _makeOffer(){const e=this.connection.peerConnection,n=this.connection.provider;try{const r=await e.createOffer(this.connection.options.constraints);be.log("Created offer."),this.connection.options.sdpTransform&&typeof this.connection.options.sdpTransform=="function"&&(r.sdp=this.connection.options.sdpTransform(r.sdp)||r.sdp);try{await e.setLocalDescription(r),be.log("Set localDescription:",r,`for:${this.connection.peer}`);let s={sdp:r,type:this.connection.type,connectionId:this.connection.connectionId,metadata:this.connection.metadata};if(this.connection.type===ys.Data){const i=this.connection;s={...s,label:i.label,reliable:i.reliable,serialization:i.serialization}}n.socket.send({type:qt.Offer,payload:s,dst:this.connection.peer})}catch(s){s!="OperationError: Failed to set local offer sdp: Called in wrong state: kHaveRemoteOffer"&&(n.emitError(zt.WebRTC,s),be.log("Failed to setLocalDescription, ",s))}}catch(r){n.emitError(zt.WebRTC,r),be.log("Failed to createOffer, ",r)}}async _makeAnswer(){const e=this.connection.peerConnection,n=this.connection.provider;try{const r=await e.createAnswer();be.log("Created answer."),this.connection.options.sdpTransform&&typeof this.connection.options.sdpTransform=="function"&&(r.sdp=this.connection.options.sdpTransform(r.sdp)||r.sdp);try{await e.setLocalDescription(r),be.log("Set localDescription:",r,`for:${this.connection.peer}`),n.socket.send({type:qt.Answer,payload:{sdp:r,type:this.connection.type,connectionId:this.connection.connectionId},dst:this.connection.peer})}catch(s){n.emitError(zt.WebRTC,s),be.log("Failed to setLocalDescription, ",s)}}catch(r){n.emitError(zt.WebRTC,r),be.log("Failed to create answer, ",r)}}async handleSDP(e,n){n=new RTCSessionDescription(n);const r=this.connection.peerConnection,s=this.connection.provider;be.log("Setting remote description",n);const i=this;try{await r.setRemoteDescription(n),be.log(`Set remoteDescription:${e} for:${this.connection.peer}`),e==="OFFER"&&await i._makeAnswer()}catch(o){s.emitError(zt.WebRTC,o),be.log("Failed to setRemoteDescription, ",o)}}async handleCandidate(e){be.log("handleCandidate:",e);try{await this.connection.peerConnection.addIceCandidate(e),be.log(`Added ICE candidate for:${this.connection.peer}`)}catch(n){this.connection.provider.emitError(zt.WebRTC,n),be.log("Failed to handleCandidate, ",n)}}_addTracksToConnection(e,n){if(be.log(`add tracks from stream ${e.id} to peer connection`),!n.addTrack)return be.error("Your browser does't support RTCPeerConnection#addTrack. Ignored.");e.getTracks().forEach(r=>{n.addTrack(r,e)})}_addStreamToMediaConnection(e,n){be.log(`add stream ${e.id} to media connection ${n.connectionId}`),n.addStream(e)}}class Ov extends Pd.EventEmitter{emitError(e,n){be.error("Error:",n),this.emit("error",new q$(`${e}`,n))}}class q$ extends Error{constructor(e,n){typeof n=="string"?super(n):(super(),Object.assign(this,n)),this.type=e}}class $v extends Ov{get open(){return this._open}constructor(e,n,r){super(),this.peer=e,this.provider=n,this.options=r,this._open=!1,this.metadata=r.metadata}}class Cl extends $v{static#e=this.ID_PREFIX="mc_";get type(){return ys.Media}get localStream(){return this._localStream}get remoteStream(){return this._remoteStream}constructor(e,n,r){super(e,n,r),this._localStream=this.options._stream,this.connectionId=this.options.connectionId||Cl.ID_PREFIX+pn.randomToken(),this._negotiator=new Pv(this),this._localStream&&this._negotiator.startConnection({_stream:this._localStream,originator:!0})}_initializeDataChannel(e){this.dataChannel=e,this.dataChannel.onopen=()=>{be.log(`DC#${this.connectionId} dc connection success`),this.emit("willCloseOnRemote")},this.dataChannel.onclose=()=>{be.log(`DC#${this.connectionId} dc closed for:`,this.peer),this.close()}}addStream(e){be.log("Receiving stream",e),this._remoteStream=e,super.emit("stream",e)}handleMessage(e){const n=e.type,r=e.payload;switch(e.type){case qt.Answer:this._negotiator.handleSDP(n,r.sdp),this._open=!0;break;case qt.Candidate:this._negotiator.handleCandidate(r.candidate);break;default:be.warn(`Unrecognized message type:${n} from peer:${this.peer}`);break}}answer(e,n={}){if(this._localStream){be.warn("Local stream already exists on this MediaConnection. Are you answering a call twice?");return}this._localStream=e,n&&n.sdpTransform&&(this.options.sdpTransform=n.sdpTransform),this._negotiator.startConnection({...this.options._payload,_stream:e});const r=this.provider._getMessages(this.connectionId);for(const s of r)this.handleMessage(s);this._open=!0}close(){this._negotiator&&(this._negotiator.cleanup(),this._negotiator=null),this._localStream=null,this._remoteStream=null,this.provider&&(this.provider._removeConnection(this),this.provider=null),this.options&&this.options._stream&&(this.options._stream=null),this.open&&(this._open=!1,super.emit("close"))}}class X${constructor(e){this._options=e}_buildRequest(e){const n=this._options.secure?"https":"http",{host:r,port:s,path:i,key:o}=this._options,a=new URL(`${n}://${r}:${s}${i}${o}/${e}`);return a.searchParams.set("ts",`${Date.now()}${Math.random()}`),a.searchParams.set("version",zv),fetch(a.href,{referrerPolicy:this._options.referrerPolicy})}async retrieveId(){try{const e=await this._buildRequest("id");if(e.status!==200)throw new Error(`Error. Status:${e.status}`);return e.text()}catch(e){be.error("Error retrieving ID",e);let n="";throw this._options.path==="/"&&this._options.host!==pn.CLOUD_HOST&&(n=" If you passed in a `path` to your self-hosted PeerServer, you'll also need to pass in that same path when creating a new Peer."),new Error("Could not get an ID from the server."+n)}}async listAllPeers(){try{const e=await this._buildRequest("peers");if(e.status!==200){if(e.status===401){let n="";throw this._options.host===pn.CLOUD_HOST?n="It looks like you're using the cloud server. You can email team@peerjs.com to enable peer listing for your API key.":n="You need to enable `allow_discovery` on your self-hosted PeerServer to use this feature.",new Error("It doesn't look like you have permission to list peers IDs. "+n)}throw new Error(`Error. Status:${e.status}`)}return e.json()}catch(e){throw be.error("Error retrieving list peers",e),new Error("Could not get list peers from the server."+e)}}}class Ml extends $v{static#e=this.ID_PREFIX="dc_";static#t=this.MAX_BUFFERED_AMOUNT=8388608;get type(){return ys.Data}constructor(e,n,r){super(e,n,r),this.connectionId=this.options.connectionId||Ml.ID_PREFIX+Rv(),this.label=this.options.label||this.connectionId,this.reliable=!!this.options.reliable,this._negotiator=new Pv(this),this._negotiator.startConnection(this.options._payload||{originator:!0,reliable:this.reliable})}_initializeDataChannel(e){this.dataChannel=e,this.dataChannel.onopen=()=>{be.log(`DC#${this.connectionId} dc connection success`),this._open=!0,this.emit("open")},this.dataChannel.onmessage=n=>{be.log(`DC#${this.connectionId} dc onmessage:`,n.data)},this.dataChannel.onclose=()=>{be.log(`DC#${this.connectionId} dc closed for:`,this.peer),this.close()}}close(e){if(e?.flush){this.send({__peerData:{type:"close"}});return}this._negotiator&&(this._negotiator.cleanup(),this._negotiator=null),this.provider&&(this.provider._removeConnection(this),this.provider=null),this.dataChannel&&(this.dataChannel.onopen=null,this.dataChannel.onmessage=null,this.dataChannel.onclose=null,this.dataChannel=null),this.open&&(this._open=!1,super.emit("close"))}send(e,n=!1){if(!this.open){this.emitError(Od.NotOpenYet,"Connection is not open. You should listen for the `open` event before sending messages.");return}return this._send(e,n)}async handleMessage(e){const n=e.payload;switch(e.type){case qt.Answer:await this._negotiator.handleSDP(e.type,n.sdp);break;case qt.Candidate:await this._negotiator.handleCandidate(n.candidate);break;default:be.warn("Unrecognized message type:",e.type,"from peer:",this.peer);break}}}class $d extends Ml{get bufferSize(){return this._bufferSize}_initializeDataChannel(e){super._initializeDataChannel(e),this.dataChannel.binaryType="arraybuffer",this.dataChannel.addEventListener("message",n=>this._handleDataMessage(n))}_bufferedSend(e){(this._buffering||!this._trySend(e))&&(this._buffer.push(e),this._bufferSize=this._buffer.length)}_trySend(e){if(!this.open)return!1;if(this.dataChannel.bufferedAmount>Ml.MAX_BUFFERED_AMOUNT)return this._buffering=!0,setTimeout(()=>{this._buffering=!1,this._tryBuffer()},50),!1;try{this.dataChannel.send(e)}catch(n){return be.error(`DC#:${this.connectionId} Error when sending:`,n),this._buffering=!0,this.close(),!1}return!0}_tryBuffer(){if(!this.open||this._buffer.length===0)return;const e=this._buffer[0];this._trySend(e)&&(this._buffer.shift(),this._bufferSize=this._buffer.length,this._tryBuffer())}close(e){if(e?.flush){this.send({__peerData:{type:"close"}});return}this._buffer=[],this._bufferSize=0,super.close()}constructor(...e){super(...e),this._buffer=[],this._bufferSize=0,this._buffering=!1}}class vu extends $d{close(e){super.close(e),this._chunkedData={}}constructor(e,n,r){super(e,n,r),this.chunker=new Mv,this.serialization=oc.Binary,this._chunkedData={}}_handleDataMessage({data:e}){const n=Xb(e),r=n.__peerData;if(r){if(r.type==="close"){this.close();return}this._handleChunk(n);return}this.emit("data",n)}_handleChunk(e){const n=e.__peerData,r=this._chunkedData[n]||{data:[],count:0,total:e.total};if(r.data[e.n]=new Uint8Array(e.data),r.count++,this._chunkedData[n]=r,r.total===r.count){delete this._chunkedData[n];const s=B$(r.data);this._handleDataMessage({data:s})}}_send(e,n){const r=Zb(e);if(r instanceof Promise)return this._send_blob(r);if(!n&&r.byteLength>this.chunker.chunkedMTU){this._sendChunks(r);return}this._bufferedSend(r)}async _send_blob(e){const n=await e;if(n.byteLength>this.chunker.chunkedMTU){this._sendChunks(n);return}this._bufferedSend(n)}_sendChunks(e){const n=this.chunker.chunk(e);be.log(`DC#${this.connectionId} Try to send ${n.length} chunks...`);for(const r of n)this.send(r,!0)}}class Z$ extends $d{_handleDataMessage({data:e}){super.emit("data",e)}_send(e,n){this._bufferedSend(e)}constructor(...e){super(...e),this.serialization=oc.None}}class J$ extends $d{_handleDataMessage({data:e}){const n=this.parse(this.decoder.decode(e)),r=n.__peerData;if(r&&r.type==="close"){this.close();return}this.emit("data",n)}_send(e,n){const r=this.encoder.encode(this.stringify(e));if(r.byteLength>=pn.chunkedMTU){this.emitError(Od.MessageToBig,"Message too big for JSON channel");return}this._bufferedSend(r)}constructor(...e){super(...e),this.serialization=oc.JSON,this.encoder=new TextEncoder,this.decoder=new TextDecoder,this.stringify=JSON.stringify,this.parse=JSON.parse}}class Ld extends Ov{static#e=this.DEFAULT_KEY="peerjs";get id(){return this._id}get options(){return this._options}get open(){return this._open}get socket(){return this._socket}get connections(){const e=Object.create(null);for(const[n,r]of this._connections)e[n]=r;return e}get destroyed(){return this._destroyed}get disconnected(){return this._disconnected}constructor(e,n){super(),this._serializers={raw:Z$,json:J$,binary:vu,"binary-utf8":vu,default:vu},this._id=null,this._lastServerId=null,this._destroyed=!1,this._disconnected=!1,this._open=!1,this._connections=new Map,this._lostMessages=new Map;let r;if(e&&e.constructor==Object?n=e:e&&(r=e.toString()),n={debug:0,host:pn.CLOUD_HOST,port:pn.CLOUD_PORT,path:"/",key:Ld.DEFAULT_KEY,token:pn.randomToken(),config:pn.defaultConfig,referrerPolicy:"strict-origin-when-cross-origin",serializers:{},...n},this._options=n,this._serializers={...this._serializers,...this.options.serializers},this._options.host==="/"&&(this._options.host=window.location.hostname),this._options.path&&(this._options.path[0]!=="/"&&(this._options.path="/"+this._options.path),this._options.path[this._options.path.length-1]!=="/"&&(this._options.path+="/")),this._options.secure===void 0&&this._options.host!==pn.CLOUD_HOST?this._options.secure=pn.isSecure():this._options.host==pn.CLOUD_HOST&&(this._options.secure=!0),this._options.logFunction&&be.setLogFunction(this._options.logFunction),be.logLevel=this._options.debug||0,this._api=new X$(n),this._socket=this._createServerConnection(),!pn.supports.audioVideo&&!pn.supports.data){this._delayedAbort(zt.BrowserIncompatible,"The current browser does not support WebRTC");return}if(r&&!pn.validateId(r)){this._delayedAbort(zt.InvalidID,`ID "${r}" is invalid`);return}r?this._initialize(r):this._api.retrieveId().then(s=>this._initialize(s)).catch(s=>this._abort(zt.ServerError,s))}_createServerConnection(){const e=new Y$(this._options.secure,this._options.host,this._options.port,this._options.path,this._options.key,this._options.pingInterval);return e.on(fs.Message,n=>{this._handleMessage(n)}),e.on(fs.Error,n=>{this._abort(zt.SocketError,n)}),e.on(fs.Disconnected,()=>{this.disconnected||(this.emitError(zt.Network,"Lost connection to server."),this.disconnect())}),e.on(fs.Close,()=>{this.disconnected||this._abort(zt.SocketClosed,"Underlying socket is already closed.")}),e}_initialize(e){this._id=e,this.socket.start(e,this._options.token)}_handleMessage(e){const n=e.type,r=e.payload,s=e.src;switch(n){case qt.Open:this._lastServerId=this.id,this._open=!0,this.emit("open",this.id);break;case qt.Error:this._abort(zt.ServerError,r.msg);break;case qt.IdTaken:this._abort(zt.UnavailableID,`ID "${this.id}" is taken`);break;case qt.InvalidKey:this._abort(zt.InvalidKey,`API KEY "${this._options.key}" is invalid`);break;case qt.Leave:be.log(`Received leave message from ${s}`),this._cleanupPeer(s),this._connections.delete(s);break;case qt.Expire:this.emitError(zt.PeerUnavailable,`Could not connect to peer ${s}`);break;case qt.Offer:{const i=r.connectionId;let o=this.getConnection(s,i);if(o&&(o.close(),be.warn(`Offer received for existing Connection ID:${i}`)),r.type===ys.Media){const l=new Cl(s,this,{connectionId:i,_payload:r,metadata:r.metadata});o=l,this._addConnection(s,o),this.emit("call",l)}else if(r.type===ys.Data){const l=new this._serializers[r.serialization](s,this,{connectionId:i,_payload:r,metadata:r.metadata,label:r.label,serialization:r.serialization,reliable:r.reliable});o=l,this._addConnection(s,o),this.emit("connection",l)}else{be.warn(`Received malformed connection type:${r.type}`);return}const a=this._getMessages(i);for(const l of a)o.handleMessage(l);break}default:{if(!r){be.warn(`You received a malformed message from ${s} of type ${n}`);return}const i=r.connectionId,o=this.getConnection(s,i);o&&o.peerConnection?o.handleMessage(e):i?this._storeMessage(i,e):be.warn("You received an unrecognized message:",e);break}}}_storeMessage(e,n){this._lostMessages.has(e)||this._lostMessages.set(e,[]),this._lostMessages.get(e).push(n)}_getMessages(e){const n=this._lostMessages.get(e);return n?(this._lostMessages.delete(e),n):[]}connect(e,n={}){if(n={serialization:"default",...n},this.disconnected){be.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect, or call reconnect on this peer if you believe its ID to still be available."),this.emitError(zt.Disconnected,"Cannot connect to new Peer after disconnecting from server.");return}const r=new this._serializers[n.serialization](e,this,n);return this._addConnection(e,r),r}call(e,n,r={}){if(this.disconnected){be.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect."),this.emitError(zt.Disconnected,"Cannot connect to new Peer after disconnecting from server.");return}if(!n){be.error("To call a peer, you must provide a stream from your browser's `getUserMedia`.");return}const s=new Cl(e,this,{...r,_stream:n});return this._addConnection(e,s),s}_addConnection(e,n){be.log(`add connection ${n.type}:${n.connectionId} to peerId:${e}`),this._connections.has(e)||this._connections.set(e,[]),this._connections.get(e).push(n)}_removeConnection(e){const n=this._connections.get(e.peer);if(n){const r=n.indexOf(e);r!==-1&&n.splice(r,1)}this._lostMessages.delete(e.connectionId)}getConnection(e,n){const r=this._connections.get(e);if(!r)return null;for(const s of r)if(s.connectionId===n)return s;return null}_delayedAbort(e,n){setTimeout(()=>{this._abort(e,n)},0)}_abort(e,n){be.error("Aborting!"),this.emitError(e,n),this._lastServerId?this.disconnect():this.destroy()}destroy(){this.destroyed||(be.log(`Destroy peer with ID:${this.id}`),this.disconnect(),this._cleanup(),this._destroyed=!0,this.emit("close"))}_cleanup(){for(const e of this._connections.keys())this._cleanupPeer(e),this._connections.delete(e);this.socket.removeAllListeners()}_cleanupPeer(e){const n=this._connections.get(e);if(n)for(const r of n)r.close()}disconnect(){if(this.disconnected)return;const e=this.id;be.log(`Disconnect peer with ID:${e}`),this._disconnected=!0,this._open=!1,this.socket.close(),this._lastServerId=e,this._id=null,this.emit("disconnected",e)}reconnect(){if(this.disconnected&&!this.destroyed)be.log(`Attempting reconnection to server with ID ${this._lastServerId}`),this._disconnected=!1,this._initialize(this._lastServerId);else{if(this.destroyed)throw new Error("This peer cannot reconnect to the server. It has already been destroyed.");if(!this.disconnected&&!this.open)be.error("In a hurry? We're still trying to make the initial connection!");else throw new Error(`Peer ${this.id} cannot reconnect because it is not disconnected from the server!`)}}listAllPeers(e=n=>{}){this._api.listAllPeers().then(n=>e(n)).catch(n=>this._abort(zt.ServerError,n))}}var Q$=Ld;const K$=[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}],eL=new Set(["server-error","network","ssl-unavailable","browser-incompatible"]),Xm=t=>{const e=[];let n=!1;return t.on("open",()=>{n=!0}),t.on("error",r=>{for(const s of[...e])s(r)}),{on(r,s){return r==="connect"?n?queueMicrotask(()=>s()):t.on("open",s):r==="error"?e.push(s):t.on(r,s),this},send(r){t.send(r)},destroy(){t.close()},fail(r){for(const s of[...e])s(new Error(r))}}},tL=({selfDid:t})=>{const e=[],n=[],r=[];let s;const i=new Map,o=()=>{const l=Math.random().toString(36).slice(2,6);return`bms-${Gb(t)}-${l}`},a=l=>{s?.destroy(),s=new Q$(l,{debug:0,config:{iceServers:K$}}),s.on("open",c=>{for(const u of e)u(c)}),s.on("connection",c=>{const u=c.metadata;for(const h of n)h({joinCode:c.peer,did:u?.did},Xm(c))}),s.on("error",c=>{if(c.type==="unavailable-id"){a(o());return}if(c.type==="peer-unavailable"){const u=c.message.match(/connect to peer (\S+)/)?.[1],h=u!==void 0?i.get(u):void 0;h!==void 0&&h.fail(c.message);return}if(eL.has(c.type))for(const u of r)u(c)})};return a(o()),{onOpen(l){e.push(l)},onConnection(l){n.push(l)},onError(l){r.push(l)},connect(l,c){if(s===void 0)throw new Error("signaling not started");const u=s.connect(l,{metadata:c}),h=Xm(u);return i.set(l,h),h},destroy(){i.clear(),s?.destroy(),s=void 0}}},Zm={ArrowUp:[0,1],ArrowDown:[0,-1],ArrowLeft:[-1,0],ArrowRight:[1,0],KeyW:[0,1],KeyS:[0,-1],KeyA:[-1,0],KeyD:[1,0]},nL=.02,rL=6,sL=120,iL=500,Jm=60,oL=()=>{const t={keyMoveX:0,keyMoveY:0,touchMoveX:0,touchMoveY:0,jumpQueued:!1,jumpHeld:!1,lookDx:0,lookDy:0,primaryQueued:!1,clickQueued:!1,tapQueued:!1,secondaryQueued:!1,secondaryHeld:!1,secondaryReleasedQueued:!1,useQueued:!1,selectQueued:null,wheelQueued:0,wheelLastEventAt:-1/0,wheelPendingTimer:void 0};let e=null;const n=(o,a)=>{t.lookDx+=o,t.lookDy+=a};let r=!1;const s={onPointerDown:async o=>{if(o.pointerType==="mouse"&&document.pointerLockElement!==o.currentTarget){await o.currentTarget.requestPointerLock();return}if(o.pointerType==="mouse"){o.button===0?(t.primaryQueued=!0,t.clickQueued=!0):o.button===2&&(t.secondaryQueued=!0,t.secondaryHeld=!0);return}if(r)return;r=!0;const a=Math.max(rL,o.currentTarget.clientWidth*nL);let l=!1,c=!1,u,h;const d=()=>{u!==void 0&&(window.clearTimeout(u),u=void 0),h!==void 0&&(window.clearInterval(h),h=void 0)},f=()=>{c=!0,o.button===0&&(t.primaryQueued=!0)};u=window.setTimeout(()=>{f(),h=window.setInterval(()=>{l||f()},iL)},sL);const m=await pd(o,({delta:p,totalDelta:y})=>{n(p.x,p.y),!l&&Math.hypot(y.x,y.y)>a&&(l=!0,d())});r=!1,d(),!l&&m.event.type!=="pointercancel"&&(c||o.button===0&&(t.tapQueued=!0))},onMouseMove:o=>{document.pointerLockElement===o.currentTarget&&n(o.movementX,o.movementY)},onPointerUp:o=>{o.pointerType==="mouse"&&o.button===2&&t.secondaryHeld&&(t.secondaryHeld=!1,t.secondaryReleasedQueued=!0)},onWheel:o=>{if(Ha(o))return;o.preventDefault();const a=o.deltaY<0?-1:o.deltaY>0?1:0;if(a===0)return;const l=Date.now(),c=l-t.wheelLastEventAt;t.wheelLastEventAt=l,t.wheelPendingTimer!==void 0&&(window.clearTimeout(t.wheelPendingTimer),t.wheelPendingTimer=void 0),!(c<Jm)&&(t.wheelPendingTimer=window.setTimeout(()=>{t.wheelQueued=a,t.wheelPendingTimer=void 0},Jm))}},i=()=>{if(e)return;e=new AbortController;const{signal:o}=e;window.addEventListener("keydown",a=>{if(Ha(a))return;if(a.code==="Space"){a.preventDefault(),t.jumpQueued=!0,t.jumpHeld=!0;return}if(a.code==="KeyE"){a.repeat||(t.useQueued=!0);return}if(a.code.startsWith("Digit")){const c=Number(a.code.slice(5));c>=1&&c<=9&&(t.selectQueued=c-1);return}const l=Zm[a.code];l===void 0||a.repeat||(a.preventDefault(),t.keyMoveX+=l[0],t.keyMoveY+=l[1])},{signal:o}),window.addEventListener("keyup",a=>{if(Ha(a))return;if(a.code==="Space"){t.jumpHeld=!1;return}const l=Zm[a.code];l!==void 0&&(a.preventDefault(),t.keyMoveX-=l[0],t.keyMoveY-=l[1])},{signal:o}),window.addEventListener("contextmenu",a=>a.preventDefault(),{signal:o})};return i(),{install:i,addLookDelta:n,canvasHandlers:s,dispose(){e?.abort(),e=null,t.wheelPendingTimer!==void 0&&(window.clearTimeout(t.wheelPendingTimer),t.wheelPendingTimer=void 0)},consume(){const o={moveX:Ws(t.keyMoveX+t.touchMoveX,-1,1),moveY:Ws(t.keyMoveY+t.touchMoveY,-1,1),jump:t.jumpQueued,jumpHeld:t.jumpHeld,lookDx:t.lookDx,lookDy:t.lookDy,primary:t.primaryQueued,click:t.clickQueued,tap:t.tapQueued,secondary:t.secondaryQueued,secondaryHeld:t.secondaryHeld,secondaryReleased:t.secondaryReleasedQueued,use:t.useQueued,select:t.selectQueued,wheel:t.wheelQueued};return t.jumpQueued=!1,t.lookDx=0,t.lookDy=0,t.primaryQueued=!1,t.clickQueued=!1,t.tapQueued=!1,t.secondaryQueued=!1,t.secondaryReleasedQueued=!1,t.useQueued=!1,t.selectQueued=null,t.wheelQueued=0,o},queuePrimary(){t.primaryQueued=!0},queueSecondary(){t.secondaryQueued=!0},queueUse(){t.useQueued=!0},queueSelect(o){t.selectQueued=o},queueJump(){t.jumpQueued=!0},setTouchMove(o,a){t.touchMoveX=o,t.touchMoveY=a},setTouchJump(o){t.jumpHeld=o},setTouchSecondary(o){o?(t.secondaryQueued=!0,t.secondaryHeld=!0):t.secondaryHeld&&(t.secondaryHeld=!1,t.secondaryReleasedQueued=!0)}}},Rl={halfSize:1,speed:22.5,acceleration:150,gravity:45,jumpSpeed:14,swimSpeed:10,climbSpeed:10,lookSensitivity:.0025,maxPitch:1.35,followBack:9,followUp:2.5,eyeHeight:.9,stepHeight:2,collisionRadius:.6},aL=(t,e,n,r={})=>({position:new wt(t,e,n),yaw:0,pitch:0,vx:0,vz:0,vy:0,onGround:!1,flying:!1,noclip:!1,config:{...Rl,...r}}),Ci=(t,e,n)=>{const r=e-t;return Math.abs(r)<=n?e:t+Math.sign(r)*n},Lv=[[0,0],[1,0],[-1,0],[0,1],[0,-1]],lL=(t,e,n,r,s)=>{const i=r+t.stepHeight;let o=-1/0,a=1/0;for(const[l,c]of Lv){const u=e(n+l*t.collisionRadius,r,s+c*t.collisionRadius);if(!Number.isFinite(u)||u>i)continue;const h=Math.abs(u-r);h<a&&(a=h,o=u)}return o},cL=(t,e,n,r,s)=>{const i=r+t.stepHeight;let o=-1/0;for(const[a,l]of Lv){const c=e(n+a*t.collisionRadius,r,s+l*t.collisionRadius);Number.isFinite(c)&&c<=i&&c>o&&(o=c)}return o},uL=[[1,1],[1,-1],[-1,1],[-1,-1]],Dv=6,vh=.001,Mi=(t,e,n,r,s)=>{const i=r-t.halfSize+vh,o=r+t.halfSize-vh;for(const[a,l]of uL){const c=n+a*t.collisionRadius,u=s+l*t.collisionRadius;if(e(c,i,u)||e(c,o,u))return!0}return!1},Qm=(t,e,n,r)=>{if(r===0)return!1;const s=t.config,i=t.position[n];t.position[n]=Math.max(-e.halfExtent,Math.min(e.halfExtent,i+r));const{x:o,y:a,z:l}=t.position;if(!Mi(s,e.solidAt,o,a,l))return!1;const c=cL(s,e.groundHeightAt,o,a-s.halfSize,l),u=c+s.halfSize;if(Number.isFinite(c)&&u>a&&!Mi(s,e.solidAt,o,u,l))return t.position.y=u,!1;let h=i,d=t.position[n];for(let f=0;f<Dv;f++){const m=(h+d)/2;t.position[n]=m,Mi(s,e.solidAt,t.position.x,a,t.position.z)?d=m:h=m}return t.position[n]=h,!0},wu=(t,e,n,r)=>{if(r===0)return!1;const s=t.config,i=t.position[n];if(t.position[n]=Math.max(-e.halfExtent,Math.min(e.halfExtent,i+r)),!Mi(s,e.solidAt,t.position.x,t.position.y,t.position.z))return!1;let o=i,a=t.position[n];for(let l=0;l<Dv;l++){const c=(o+a)/2;t.position[n]=c,Mi(s,e.solidAt,t.position.x,t.position.y,t.position.z)?a=c:o=c}return t.position[n]=o,!0},Nv=(t,e,n)=>{const r=t.config,[s,i,o]=Il(t),a=-Math.cos(t.yaw),l=Math.sin(t.yaw);let c=0,u=0,h=0;if(e.moveX!==0||e.moveY!==0){const f=Math.hypot(e.moveX,e.moveY),m=e.moveX/f,p=e.moveY/f;c=(s*p+a*m)*r.speed,u=i*p*r.speed,h=(o*p+l*m)*r.speed}const d=r.acceleration*n;t.vx=Ci(t.vx,c,d),t.vy=Ci(t.vy,u,d),t.vz=Ci(t.vz,h,d)},hL=(t,e,n,r)=>{Nv(t,e,r),wu(t,n,"x",t.vx*r),wu(t,n,"y",t.vy*r),wu(t,n,"z",t.vz*r),t.onGround=!1},dL=(t,e,n,r)=>{Nv(t,e,r),t.position.x=Math.max(-n.halfExtent,Math.min(n.halfExtent,t.position.x+t.vx*r)),t.position.y=Math.max(-n.halfExtent,Math.min(n.halfExtent,t.position.y+t.vy*r)),t.position.z=Math.max(-n.halfExtent,Math.min(n.halfExtent,t.position.z+t.vz*r)),t.onGround=!1},fL=(t,e,n,r)=>{const s=t.config;if(t.yaw-=n.lookDx*s.lookSensitivity,t.pitch=Math.max(-s.maxPitch,Math.min(s.maxPitch,t.pitch-n.lookDy*s.lookSensitivity)),t.noclip){dL(t,n,r,e);return}if(t.flying){hL(t,n,r,e);return}const i=Math.sin(t.yaw),o=Math.cos(t.yaw),a=i,l=o,c=-o,u=i,h=n.moveX,d=n.moveY,f=r.mediumAt?.(t.position.x,t.position.y,t.position.z)??null;let m=0,p=0;if(h!==0||d!==0){const P=Math.hypot(h,d),S=h/P,O=d/P;m=(a*O+c*S)*s.speed,p=(l*O+u*S)*s.speed}f!==null&&(f.speedScale!==1&&(m*=f.speedScale,p*=f.speedScale),(f.pushVx!==0||f.pushVz!==0)&&(m+=f.pushVx,p+=f.pushVz));const y=s.acceleration*e;t.vx=Ci(t.vx,m,y),t.vz=Ci(t.vz,p,y);const g=t.vx*e,b=t.vz*e,v=r.inWaterAt(t.position.x,t.position.y-s.halfSize+vh,t.position.z);v?(t.vy-=s.gravity*.15*e,n.jumpHeld?t.vy=s.swimSpeed:t.vy*=Math.max(0,1-3*e)):(t.vy-=s.gravity*e,f!==null&&(f.pushVy!==null&&(t.vy=Ci(t.vy,f.pushVy,y)),f.sink>0&&(t.vy=Math.max(t.vy,-f.sink)))),!v&&t.onGround&&n.jump&&(t.vy=s.jumpSpeed);const x=Qm(t,r,"x",g),k=Qm(t,r,"z",b),C=x||k;if(t.onGround&&r.surfaceVelocityAt!==void 0){const P=r.surfaceVelocityAt(t.position.x,t.position.y-s.halfSize,t.position.z);P!==null&&(t.position.x+=P[0]*e,t.position.y+=P[1]*e,t.position.z+=P[2]*e)}C&&n.jumpHeld&&!v&&(t.vy=Math.max(t.vy,s.climbSpeed));const E=t.position.y-s.halfSize,T=t.position.y+t.vy*e;t.vy>0&&Mi(s,r.solidAt,t.position.x,T,t.position.z)?t.vy=0:t.position.y=T;const A=lL(s,r.groundHeightAt,t.position.x,E,t.position.z);if(!Number.isFinite(A)){t.position.y=E+s.halfSize,t.vy=0,t.onGround=!0;return}const M=A+s.halfSize;t.position.y<=M?(t.position.y=M,t.vy<0&&(t.vy=0),t.onGround=!0):t.onGround=!1},Il=t=>{const e=Math.cos(t.pitch);return[e*Math.sin(t.yaw),Math.sin(t.pitch),e*Math.cos(t.yaw)]},Km=(t,e,n=!0)=>{const r=e.config;if(n){t.position.set(e.position.x,e.position.y+r.eyeHeight,e.position.z);const[a,l,c]=Il(e);t.lookAt(t.position.x+a,t.position.y+l,t.position.z+c);return}const s=Math.sin(e.yaw),i=Math.cos(e.yaw);t.position.set(e.position.x-s*r.followBack,e.position.y+r.followUp,e.position.z-i*r.followBack);const o=e.position.y+Math.sin(e.pitch)*3;t.lookAt(e.position.x,o,e.position.z)},pL=(t,e)=>{const n=Math.max(0,Math.min(1,t)),r=-Math.PI/2*n,s=Math.sin(r),i=Math.cos(r),o=Math.sin(e.yaw),a=Math.cos(e.yaw),l=e.config.eyeHeight,c=e.position.y-e.config.halfSize;return{position:[e.position.x+l*s*o,c+l*i,e.position.z+l*s*a],pitch:e.pitch+Math.PI/2*n}},mL=1e6,gL=16740419,yL=({camera:t,terrain:e,spawn:n,player:r})=>{let s=!0,i=!1;const o={...Rl,...r},a=aL(n[0],e.heightAt(n[0],n[2])+o.halfSize+.1,n[2],o),l={groundHeightAt:(d,f,m)=>e.groundHeightAt(d,f,m),inWaterAt:(d,f,m)=>e.inWaterAt(d,f,m),solidAt:(d,f,m)=>e.solidAt(d,f,m),halfExtent:mL,...e.surfaceVelocityAt!==void 0?{surfaceVelocityAt:e.surfaceVelocityAt}:{},...e.mediumAt!==void 0?{mediumAt:e.mediumAt}:{}},c=Yb(gL),u=new wn(new Hi(a.config.halfSize*2,a.config.halfSize*2,a.config.halfSize*2),c.material);u.position.copy(a.position),u.visible=i;const h=new Xn;return h.add(u),Km(t,a,s),{body:h,player:a,move(d,f){fL(a,d,f,l)},place(){u.position.copy(a.position),u.rotation.y=a.yaw,u.visible=i,Km(t,a,s)},placeDeath(d){if(s){const f=pL(d,a);t.position.set(f.position[0],f.position[1],f.position[2]);const[m,p,y]=Il({...a,pitch:f.pitch});t.lookAt(f.position[0]+m,f.position[1]+p,f.position[2]+y)}else{const f=Math.max(0,Math.min(1,d)),m=-Math.PI/2*f,p=Math.sin(m),y=Math.cos(m),g=Math.sin(a.yaw),b=Math.cos(a.yaw),v=a.config.halfSize;u.rotation.set(m,a.yaw,0),u.position.set(a.position.x+v*p*g,a.position.y-v+v*y,a.position.z+v*p*b)}},look(){const d=t.position,[f,m,p]=Il(a);return{origin:[d.x,d.y,d.z],direction:[f,m,p]}},occupiedVoxels(){const d=a.config.halfSize,f=k=>[Math.floor((k-d)/bt),Math.floor((k+d)/bt)],[m,p]=f(a.position.x),[y,g]=f(a.position.y),[b,v]=f(a.position.z),x=[];for(let k=m;k<=p;k++)for(let C=y;C<=g;C++)for(let E=b;E<=v;E++)x.push([k,C,E]);return x},setFirstPerson(d){s=d},get firstPerson(){return s},setCubeVisible(d){i=d},setPicture(d){c.setPicture(d)}}},Fv=.001,Dd=(t,e,n)=>{const r=t.yaw??0;if(r===0)return e>=t.minX&&e<=t.maxX&&n>=t.minZ&&n<=t.maxZ;const s=(t.maxX-t.minX)/2,i=(t.maxZ-t.minZ)/2,o=e-(t.minX+t.maxX)/2,a=n-(t.minZ+t.maxZ)/2,l=Math.cos(r),c=Math.sin(r);return Math.abs(o*l-a*c)<=s&&Math.abs(o*c+a*l)<=i},bL=(t,e,n,r)=>n>=t.minY&&n<=t.maxY&&Dd(t,e,r),vL=(t,e,n,r)=>t.some(s=>bL(s,e,n,r)),wL=(t,e,n,r)=>{let s=-1/0;for(const i of t)Dd(i,e,r)&&i.maxY<=n+Fv&&i.maxY>s&&(s=i.maxY);return s},_L=(t,e,n,r)=>{let s=null,i=-1/0;for(const o of t)Dd(o,e,r)&&o.maxY<=n+Fv&&o.maxY>i&&(i=o.maxY,s=o);return s===null?null:[s.vx??0,s.vy??0,s.vz??0]},Bv=9,eg=(t,e)=>{for(let n=0;n<t.length;n++){const{min:r,max:s}=Gs(t[n].center);if(e[0]>=r[0]&&e[0]<=s[0]&&e[1]>=r[1]&&e[1]<=s[1]&&e[2]>=r[2]&&e[2]<=s[2]){const i=_s(t[n].store,t[n].center,e);return t[n].store.get(i[0],i[1],i[2])}}return _e},xL=(t,e,n,r=Bv)=>{const s=[e[0]/bt,e[1]/bt,e[2]/bt];let i=Math.floor(s[0]),o=Math.floor(s[1]),a=Math.floor(s[2]);const l=n[0]>0?1:n[0]<0?-1:0,c=n[1]>0?1:n[1]<0?-1:0,u=n[2]>0?1:n[2]<0?-1:0,h=l===0?1/0:Math.abs(1/n[0]),d=c===0?1/0:Math.abs(1/n[1]),f=u===0?1/0:Math.abs(1/n[2]);let m=l===0?1/0:l>0?(i+1-s[0])*h:(s[0]-i)*h,p=c===0?1/0:c>0?(o+1-s[1])*d:(s[1]-o)*d,y=u===0?1/0:u>0?(a+1-s[2])*f:(s[2]-a)*f;const g=r/bt;let b=null,v=0,x=0;const k=Math.ceil(g)+8;for(;eg(t,[i,o,a])!==_e&&x++<k;)if(m<p&&m<y?(v=m,i+=l,m+=h):p<y?(v=p,o+=c,p+=d):(v=y,a+=u,y+=f),v>g)return{target:null,place:b,distance:1/0};for(;;){const C=[i,o,a];if(eg(t,C)!==_e)return{target:C,place:b,distance:v*bt};if(b=C,m<p&&m<y?(v=m,i+=l,m+=h):p<y?(v=p,o+=c,p+=d):(v=y,a+=u,y+=f),v>g)return{target:null,place:b,distance:1/0}}};class to{ctx;item;voxel;constructor(e,n,r){this.ctx=e,this.item=n,this.voxel=r}pick(){const e=this.ctx.editing.pick();return{primary:e.target===null?null:{kind:"voxel",voxel:e.target,distance:e.distance},secondary:e.place}}primary(e){return this.ctx.editing.breakBlock(tg(e.primary))}secondary(e){return this.ctx.editing.placeBlock(this.item,this.voxel,tg(e.primary),e.secondary)}update(){}pose(){return null}stow(){}}const tg=t=>t!==null&&t.kind==="voxel"?t.voxel:null,kL={x:-5.6/24,y:-6/24},SL={x:Math.sqrt(.5),y:Math.sqrt(.5),z:0},EL=Math.PI/4,Uv=t=>1-(1-t)*(1-t),Hv=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,Eo=(t,e,n)=>{const r=Ws(n,0,1),s=t.handle??e.handle,i={x:t.x+(e.x-t.x)*r,y:t.y+(e.y-t.y)*r,z:t.z+(e.z-t.z)*r,roll:t.roll+(e.roll-t.roll)*r};return s!==void 0&&(i.handle=s),i},AL=(t,e)=>{const n=vo.fromAxisAngle(SL,EL),r=vo.fromAxisAngle({x:0,y:0,z:1},t.roll),s=vo.multiply(r,n),i=t.handle??kL,o={x:i.x*e,y:i.y*e,z:0},a=Et.rotateQuaternion(o,s);return{position:{x:t.x-a.x,y:t.y-a.y,z:t.z-a.z},rotation:s}},TL=Bv*.6,CL=8,_u={x:.45,y:-.35,z:-.85,roll:0},ML={x:.62,y:-.48,z:-1.05,roll:35*Math.PI/180},ng={x:.38,y:-.18,z:-.68,roll:-50*Math.PI/180},rg=.22,sg=.28,RL=.16,IL=(t,e,n)=>{switch(t){case"idle":return Eo(_u,ML,n);case"swing":return Eo(_u,ng,Uv(Ws(e,0,1)));case"recover":return Eo(ng,_u,Hv(Ws(e,0,1)))}},zL=(t,e)=>t===null?e:e===null||t.distance<=e.distance?t:e;class PL{ctx;state="idle";stateTime=0;guard=0;guarding=!1;constructor(e){this.ctx=e}pick(){const{origin:e,direction:n}=this.ctx.look(),r=this.ctx.editing.pick(),s=Bb(e,n,this.ctx.strikeables(),TL);return{primary:zL(s===null?null:{kind:"actor",id:s.id,distance:s.distance},r.target===null?null:{kind:"voxel",voxel:r.target,distance:r.distance}),secondary:null}}primary(e){this.state="swing",this.stateTime=0;const n=e.primary;if(n===null)return null;if(n.kind==="voxel")return this.ctx.editing.breakBlock(n.voxel);const r=this.ctx.position();return this.ctx.strike(n.id,CL,r.x,r.z),null}secondary(){return null}update(e,n){this.state!=="idle"&&(this.stateTime+=e,this.state==="swing"&&this.stateTime>=rg?(this.state="recover",this.stateTime=0):this.state==="recover"&&this.stateTime>=sg&&(this.state="idle",this.stateTime=0)),this.raiseGuard(n.secondaryHeld&&this.state==="idle"),this.guard=Ws(this.guard+(this.guarding?e:-e)/RL,0,1)}pose(){const e=this.state==="swing"?this.stateTime/rg:this.state==="recover"?this.stateTime/sg:0;return IL(this.state,e,this.guard)}stow(){this.state="idle",this.stateTime=0,this.guard=0,this.raiseGuard(!1)}raiseGuard(e){e!==this.guarding&&(this.guarding=e,this.ctx.setGuarding(e))}}const wa={x:.5,y:-.3,z:-.9,roll:-.06,handle:{x:0,y:-.42,z:0}},ig={x:.46,y:-.22,z:-.72,roll:24*Math.PI/180,handle:{x:0,y:-.42,z:0}},_a=.18,og=.3;class OL{ctx;held=null;onFillChange=null;dipTime=0;dipping=!1;constructor(e){this.ctx=e}get fill(){return this.held}notify(){this.onFillChange?.()}pick(){const e=this.ctx.editing.pick();return{primary:e.target===null?null:{kind:"voxel",voxel:e.target,distance:e.distance},secondary:e.place}}primary(e){return this.secondary(e)}secondary(e){return this.held===null?this.fillFrom(e.primary):this.pourOut(e.secondary)}fillFrom(e){const n=e!==null&&e.kind==="voxel"?e.voxel:null,r=this.ctx.editing.sourceKind(n);return r===null||!this.ctx.editing.isScoopable(n)?"nothing to scoop — fill it at a water or lava source":this.ctx.editing.scoop(n)?(this.held=r,this.dip(),this.notify(),`bucket filled with ${r}`):"couldn't scoop that"}pourOut(e){if(this.held===null)return null;if(!this.ctx.editing.pourFluid(this.held,e))return"can't pour that here";const n=this.held;return this.held=null,this.dip(),this.notify(),`emptied ${n} from the bucket`}dip(){this.dipping=!0,this.dipTime=0}update(e){this.dipping&&(this.dipTime+=e,this.dipTime>=_a+og&&(this.dipping=!1))}pose(){if(!this.dipping)return wa;if(this.dipTime<_a)return Eo(wa,ig,Uv(this.dipTime/_a));const e=(this.dipTime-_a)/og;return e<1?Eo(ig,wa,Hv(Ws(e,0,1))):wa}stow(){this.dipping=!1}}const tr={dirt:{name:"Dirt",stackable:!0,sprite:null,tool:t=>new to(t,"dirt",us)},stone:{name:"Stone",stackable:!0,sprite:null,tool:t=>new to(t,"stone",hs)},cloud:{name:"Cloud",stackable:!0,sprite:null,tool:t=>new to(t,"cloud",gs)},brick:{name:"Brick",stackable:!0,sprite:null,tool:t=>new to(t,"brick",od)},wood:{name:"Wood",stackable:!0,sprite:null,tool:t=>new to(t,"wood",ad)},bucket:{name:"Bucket",stackable:!1,sprite:"bucket",tool:t=>new OL(t)},sword:{name:"Sword",stackable:!1,sprite:"sword_bronze",tool:t=>new PL(t)}},Br=Object.keys(tr),$L={[ki]:"dirt",[us]:"dirt",[hs]:"stone",[gs]:"cloud",[R0]:"wood",[I0]:"wood",[od]:"brick",[ad]:"wood"},xu=(t,e)=>{for(let n=0;n<t.length;n++){const{min:r,max:s}=Gs(t[n].center);if(e[0]>=r[0]&&e[0]<=s[0]&&e[1]>=r[1]&&e[1]<=s[1]&&e[2]>=r[2]&&e[2]<=s[2])return n}return-1};class LL{blocks;layer;inventory;onBlocksEdited;onEditRecorded;onEdit;getLook;getPlayerVoxels;onVoxelWritten;terrain;enabled=!0;constructor(e){this.blocks=e.blocks,this.layer=e.layer,this.inventory=e.inventory,this.onBlocksEdited=e.onBlocksEdited,this.onEditRecorded=e.onEditRecorded,this.onEdit=e.onEdit??(()=>{}),this.getLook=e.getLook,this.getPlayerVoxels=e.getPlayerVoxels,this.onVoxelWritten=e.onVoxelWritten??(()=>{}),this.terrain=e.terrain}setEnabled(e){this.enabled=e}pick(){const{origin:e,direction:n}=this.getLook();return xL(this.blocks,e,n)}breakBlock(e){if(!this.enabled)return"this place doesn't allow editing";if(e===null)return null;const[n,r,s]=e,i=$L[this.readVoxel(e)];return i===void 0?null:(this.applyEdit(e,_e),this.inventory.add(i,1),this.onEditRecorded(),`broke ${tr[i].name} at ${n},${r},${s}`)}placeBlock(e,n,r,s){if(!this.enabled)return"this place doesn't allow editing";if(this.inventory.count(e)<1)return`no ${tr[e].name.toLowerCase()} to place — break some first`;if(r===null)return"point at a block face to place against";if(s===null||xu(this.blocks,s)<0)return"can't build outside the world";if(this.overlapsPlayer(s))return"can't place inside yourself";if(this.readVoxel(s)!==_e&&!kt(this.readVoxel(s)))return"that space is occupied";const[i,o,a]=s,l=n===us&&this.readVoxel([i,o+1,a])===_e;return this.applyEdit(s,l?ki:n),this.inventory.remove(e,1),this.onEditRecorded(),`placed ${tr[e].name} at ${i},${o},${a}`}isScoopable(e){if(e===null)return!1;const n=this.readVoxel(e);return n===rn||n===Ar}sourceKind(e){if(e===null)return null;const n=this.readVoxel(e);return n===rn?"water":n===Ar?"lava":null}scoop(e){return!this.enabled||!this.isScoopable(e)?!1:(this.applyEdit(e,_e),this.onEditRecorded(),!0)}pourFluid(e,n){return!this.enabled||n===null||xu(this.blocks,n)<0||this.overlapsPlayer(n)||this.readVoxel(n)!==_e?!1:(this.applyEdit(n,e==="water"?rn:Ar),this.onEditRecorded(),!0)}readVoxel(e){const n=xu(this.blocks,e);if(n<0)return _e;const r=this.blocks[n],s=_s(r.store,r.center,e);return r.store.get(s[0],s[1],s[2])}applyEdit(e,n){const r=Date.now();if(!this.layer.set(e,n,r))return;this.onEdit(e,n,r),this.onVoxelWritten(e,n);const s=[];for(let i=0;i<this.blocks.length;i++){const o=this.blocks[i],[a,l,c]=_s(o.store,o.center,e);o.store.inBoundsPadded(a,l,c)&&(o.store.data[o.store.paddedIndex(a,l,c)]=n,Ut(n)?o.store.hasWater=!0:n!==_e&&(o.store.mightHaveVoxels=!0),kt(n)&&(o.store.hasFlowing=!0),Ql(o.store,o.light),this.terrain!==void 0&&D0(o.store,o.light,o.center,this.terrain),s.push(i))}s.length>0&&this.onBlocksEdited(s)}overlapsPlayer(e){const n=this.getPlayerVoxels();return n===null?!1:n.some(r=>r[0]===e[0]&&r[1]===e[1]&&r[2]===e[2])}}const xa=.42;class DL{camera;models=new Map;constructor(e){this.camera=e.camera}setModel(e,n){const r=this.models.get(e);r!==void 0&&this.camera.remove(r.mesh);const s=new Db,i=s.voxelTexture;i.image=$b(n.dimensions,n.sides),i.width=n.dimensions.width,i.height=n.dimensions.height,i.depth=n.dimensions.depth,i.needsUpdate=!0;const o=s.paletteTexture;o.image=Lb(n.palette),o.width=n.palette.length,o.height=1,o.needsUpdate=!0;const a=zo.normalize(n.dimensions);s.dimensions=[a.width,a.height,a.depth],s.voxelCount=[n.dimensions.width,n.dimensions.height,n.dimensions.depth];const l=Nb(n.dimensions),c=new wn(new Hi(l.width,l.height,l.depth),s);c.scale.set(xa,xa,xa),c.visible=!1,this.camera.add(c),this.models.set(e,{mesh:c,material:s,cardSize:l.height*xa})}applyLighting(e){for(const{material:n}of this.models.values())n.lightDir=[e.sunDir[0],e.sunDir[1],e.sunDir[2]],n.lightColour=[e.sunLight[0],e.sunLight[1],e.sunLight[2]],n.ambientColour=[e.ambient[0],e.ambient[1],e.ambient[2]]}show(e,n){for(const[r,{mesh:s,cardSize:i}]of this.models){const o=r===e&&n!==null;if(s.visible=o,!o||n===null)continue;const{position:a,rotation:l}=AL(n,i);s.position.set(a.x,a.y,a.z),s.quaternion.set(l.x,l.y,l.z,l.w)}}dispose(){for(const{mesh:e}of this.models.values())this.camera.remove(e);this.models.clear()}}class NL{onChange=null;counts=new Map;selected="dirt";add(e,n=1){tr[e].stackable&&(this.counts.set(e,(this.counts.get(e)??0)+n),this.emit())}remove(e,n=1){if(!tr[e].stackable)return!1;const r=this.counts.get(e)??0;if(r<n)return!1;const s=r-n;return s===0?this.counts.delete(e):this.counts.set(e,s),this.emit(),!0}count(e){return tr[e].stackable?this.counts.get(e)??0:1}get selectedId(){return this.selected}setSelected(e){return this.selected===e?!1:(this.selected=e,this.emit(),!0)}items(){return Br.map(e=>({id:e,name:tr[e].name,count:this.count(e),stackable:tr[e].stackable}))}selectSlot(e){const n=Br[e];return n===void 0?!1:this.setSelected(n)}selectStep(e){if(Br.length<2)return!1;const n=Br.indexOf(this.selected),r=Br[(n+e+Br.length)%Br.length];return this.setSelected(r)}emit(){this.onChange?.()}}const FL={targetMs:1e3/60,missFactor:1.5,outlierMs:1e3,downFrames:30,upFrames:120,missPenalty:4,downStep:.8,upStep:1.25,minScale:.25,settleFrames:10,probeFrames:120,probeCooldownFrames:600,maxProbeBackoff:4,futilityScale:.5,improveFactor:.9,downCooldownFrames:900},BL=.1;class jv{config;_scale;_mode="auto";missedFrames=0;metFrames=0;settle=0;meanGapMs;probedFrom=null;probeWindow=0;probeCooldown=0;probeFailures=0;descentFrom=null;descentGapMs=0;downCooldown=0;downFailures=0;constructor(e={},n=1){this.config={...FL,...e},this._scale=n,this.meanGapMs=this.config.targetMs}get scale(){return this._scale}get mode(){return this._mode}get framesPerSecond(){return 1e3/this.meanGapMs}setAuto(){this._mode="auto",this.missedFrames=0,this.metFrames=0,this.probedFrom=null,this.probeWindow=0,this.probeCooldown=0,this.probeFailures=0,this.descentFrom=null,this.downCooldown=0,this.downFailures=0,this.hold()}setFixed(e){this._mode="fixed",this._scale=ag(Math.min(1,Math.max(BL,e)))}describe(){const e=Math.round(this._scale*100),n=Math.round(this.framesPerSecond);return this._mode==="fixed"?`resolution: ${e}% of the display resolution, pinned — ${n} frames per second`:this.downCooldown>0?`resolution: ${e}% of the display resolution, not stepping down (lowering it did not make frames any faster) — ${n} frames per second`:`resolution: ${e}% of the display resolution, adapting — ${n} frames per second`}update(e){return this.observe(e,!0)}frame(e){return this.observe(e,!1)}hold(e=this.config.settleFrames){this.settle=Math.max(this.settle,e)}observe(e,n){return this._mode==="fixed"?this._scale:!(e>0)||e>this.config.outlierMs?(this.hold(),this._scale):(this.meanGapMs=this.meanGapMs*.9+e*.1,this.probeCooldown>0&&this.probeCooldown--,this.downCooldown>0&&this.downCooldown--,this.probeWindow>0&&(this.probeWindow--,this.probeWindow===0&&(this.probedFrom=null,this.probeFailures=0)),this.settle>0?(this.settle--,this._scale):(n&&this.adapt(e),this._scale))}adapt(e){if(e>this.config.targetMs*this.config.missFactor){this.metFrames=Math.max(0,this.metFrames-this.config.missPenalty),this.missedFrames++,this.missedFrames>=this.config.downFrames&&this.stepDown();return}this.metFrames++,this.missedFrames>0&&this.missedFrames--,this.metFrames>=this.config.upFrames&&this.stepUp()}stepDown(){if(this.missedFrames=0,this.probedFrom!==null){const e=this.probedFrom;this.probedFrom=null,this.probeWindow=0,this.probeFailures=Math.min(this.probeFailures+1,this.config.maxProbeBackoff),this.probeCooldown=this.config.probeCooldownFrames*2**this.probeFailures,this.setScale(e);return}if(!(this.downCooldown>0)){if(this.descentFrom!==null&&this._scale<=this.descentFrom*this.config.futilityScale){if(this.meanGapMs>this.descentGapMs*this.config.improveFactor){const e=this.descentFrom;this.descentFrom=null,this.downFailures=Math.min(this.downFailures+1,this.config.maxProbeBackoff),this.downCooldown=this.config.downCooldownFrames*2**this.downFailures,this.setScale(e);return}this.descentFrom=this._scale,this.descentGapMs=this.meanGapMs,this.downFailures=0}this.descentFrom===null&&(this.descentFrom=this._scale,this.descentGapMs=this.meanGapMs),this.setScale(Math.max(this.config.minScale,this._scale*this.config.downStep))}}stepUp(){this.metFrames=0,this.descentFrom=null,this.downCooldown=0,this.downFailures=0,!(this._scale>=1||this.probeCooldown>0||this.probedFrom!==null)&&(this.probedFrom=this._scale,this.probeWindow=this.config.probeFrames,this.setScale(Math.min(1,this._scale*this.config.upStep)))}setScale(e){this.missedFrames=0,this.metFrames=0;const n=ag(e);n!==this._scale&&(this._scale=n,this.settle=this.config.settleFrames)}}const ag=t=>Math.round(t*1e3)/1e3;class UL{supported=!1;ms=0;answered=!1;begin(){}end(){}poll(){}}const lg=()=>new UL,HL=24,jL=60,WL=({canvas:t,scene:e,camera:n,debugPerf:r,resolution:s,onFrame:i,beforeRender:o,afterRender:a,clearColor:l,describeStats:c,onDebugStats:u,antialias:h})=>{const d=new NR(t,{antialias:h});d.setClearColor(l(),1);let f,m;const p=s??new jv;let y=0,g=0,b=0,v=0,x=0;const k=()=>{const M=r();if(!M&&!pe.armed)return o?.(d,n),d.render(e,n),a?.(t),!1;f??=lg(d.gl),m??=lg(d.gl),m.begin(),pe.begin(Qe.occlusion),o?.(d,n),pe.end(Qe.occlusion),m.end(),m.poll(),f.begin(),pe.begin(Qe.draw),d.render(e,n),pe.end(Qe.draw),a?.(t),f.end(),f.poll(),x++;const P=x%HL===0;if(!M)return P;const S=c?.(d.gl,d.canvas.width,d.canvas.height,P);return u?.(`frame: ${f.ms.toFixed(2)} ms | resolution: ${p.scale.toFixed(3)}x | ${S??""}`),P},C=M=>{if(y<=0||g<=0)return;const P=Math.max(1,Math.round(y*M)),S=Math.max(1,Math.round(g*M));(P!==t.width||S!==t.height)&&(t.width=P,t.height=S,t.style.imageRendering=P<y/window.devicePixelRatio?"pixelated":"",k())},E=M=>{const P=v>0?M-v:0,S=v>0?Math.min(.05,(M-v)/1e3):1/60;v=M,pe.begin(Qe.advance),i(S),pe.end(Qe.advance),d.setClearColor(l(),1);const O=k();if(m!==void 0&&m.answered&&pe.gauge(Mt.gpuOcclusionMs,m.ms),pe.frame(P,f!==void 0&&f.answered?f.ms:-1,p.scale),b>0&&!document.hidden){const w=M-b;C(O?p.frame(w):p.update(w))}b=M},T=()=>{document.visibilityState==="visible"&&(b=0,v=0,p.hold(jL))};document.addEventListener("visibilitychange",T);const A=new ResizeObserver(()=>{const M=t.getBoundingClientRect(),P=M.width/M.height;!Number.isFinite(P)||P<=0||(y=M.width*window.devicePixelRatio,g=M.height*window.devicePixelRatio,n.aspect=P,n.updateProjectionMatrix(),p.hold(),C(p.scale))});return A.observe(t),d.setAnimationLoop(E),{dispose(){document.removeEventListener("visibilitychange",T),A.disconnect(),d.setAnimationLoop(null),d.dispose()}}},Wv={water:rn,lava:Ar},cg={water:P0,lava:cd},VL={water:bl,lava:Oo},Cs=t=>Ut(t)?"water":Mr(t)?"lava":null,ka=(t,e)=>t==="water"?Ut(e):Mr(e),GL=(t,e)=>e<=0?Wv[t]:VL[t]+Math.min(e,vl)-1,YL=t=>(vl+1-t)/(vl+1),qL={water:.25,lava:1.5},XL=512,ZL=4,JL=([t,e,n])=>`${t},${e},${n}`,QL=t=>{const[e,n,r]=t.split(",");return[Number(e),Number(n),Number(r)]},no=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];class KL{blocks;resolve;onBlocksEdited;due=new Map;now=0;touched=new Set;emissive=new Set;constructor(e){this.blocks=e.blocks,this.resolve=e.resolve,this.onBlocksEdited=e.onBlocksEdited}wakeVoxel(e,n){kt(n)&&this.schedule(e,Cs(n)),this.wakeNeighbours(e)}wakeNeighbours(e){for(const n of no){const r=[e[0]+n[0],e[1]+n[1],e[2]+n[2]],s=this.read(r);kt(s)&&this.schedule(r,Cs(s))}}wakeBlock(e){const n=this.blocks[e];n.store.hasFlowing&&this.wakeUnstableIn(n);const r=this.blockIndexAtVoxel(n.center[0]/2,n.center[1]/2+64,n.center[2]/2);if(r!==void 0&&r!==e){const s=this.blocks[r];s.store.hasFlowing&&this.wakeBlockBottom(s)}}wakeUnstableIn(e){const n=e.store,[r,s,i]=n.voxels;for(let o=0;o<i;o++)for(let a=0;a<s;a++)for(let l=0;l<r;l++){const c=n.get(l,a,o);if(!kt(c))continue;const u=Cs(c);this.airBelowOrSide(l,a,o,n)&&this.schedule(this.toWorldVoxel(e,l,a,o),u)}}wakeBlockBottom(e){const n=e.store,[r,s]=n.voxels;for(let i=0;i<s;i++)for(let o=0;o<r;o++){const a=n.get(o,0,i);if(!kt(a))continue;const l=this.toWorldVoxel(e,o,0,i);this.read([l[0],l[1]-1,l[2]])===_e&&this.schedule(l,Cs(a))}}airBelowOrSide(e,n,r,s){if(s.atPadded(e,n-1,r)===_e)return!0;const i=[[e-1,n,r],[e+1,n,r],[e,n,r-1],[e,n,r+1]];for(const[o,a,l]of i)if(s.atPadded(o,a,l)===_e)return!0;return!1}blockIndexAtVoxel(e,n,r){return this.resolve!==void 0?this.resolve([e,n,r]):this.findIndexLinear(e,n,r)}isLoaded(e){return this.blockIndexAtVoxel(e[0],e[1],e[2])!==void 0}tick(e){this.now+=e;let n=0;const r=[...this.due.keys()];for(const s of r){if(n>=XL)break;const i=this.due.get(s);if(i===void 0||i>this.now)continue;this.due.delete(s);const o=QL(s),a=this.read(o);kt(a)&&(this.step(o,a),n++)}this.flush()}step(e,n){const r=Cs(n);if(r===null)return;const s=Ba(n),i=eD(e);if(!this.isLoaded(i))return;const a=this.read(i);if(a===_e){s===0&&this.hasKindNeighbour(e,r)?this.write(i,cg[r]):(this.write(e,_e),this.write(i,cg[r]));return}if(kt(a)&&Cs(a)!==r){this.write(i,hs);return}if(!ka(r,a)){if(s===0){this.spread(e,r,0);return}if(r==="water"&&this.sourceNeighbourCount(e,r)>=2){this.write(e,Wv.water);return}if(!this.hasLowerNeighbour(e,r,s)){this.write(e,_e);return}s<vl&&this.spread(e,r,s)}}hasKindNeighbour(e,n){for(const r of no){if(r[1]!==0)continue;const s=[e[0]+r[0],e[1],e[2]+r[2]];if(ka(n,this.read(s)))return!0}return!1}sourceNeighbourCount(e,n){let r=0;for(const s of no){if(s[1]!==0)continue;const i=[e[0]+s[0],e[1],e[2]+s[2]];ka(n,this.read(i))&&Ba(this.read(i))===0&&r++}return r}hasLowerNeighbour(e,n,r){for(const s of no){const i=[e[0]+s[0],e[1]+s[1],e[2]+s[2]];if(ka(n,this.read(i))&&Ba(this.read(i))<r)return!0}return!1}spread(e,n,r){const s=[];for(const a of no){if(a[1]!==0)continue;const l=[e[0]+a[0],e[1],e[2]+a[2]];!this.isLoaded(l)||this.read(l)!==_e||s.push({w:l,weight:this.dropDistance(l)})}if(s.length===0)return;let i=1/0;for(const a of s)i=Math.min(i,a.weight);const o=GL(n,r+1);for(const a of s)a.weight===i&&this.read(a.w)===_e&&this.write(a.w,o)}dropDistance(e){for(let n=1;n<=ZL;n++)if(this.read([e[0],e[1]-n,e[2]])===_e)return n;return 1e3}schedule(e,n){this.due.set(JL(e),this.now+qL[n])}read(e){const n=this.blockIndexAtVoxel(e[0],e[1],e[2]);if(n===void 0)return _e;const r=this.blocks[n],s=_s(r.store,r.center,e);return r.store.get(s[0],s[1],s[2])}findIndexLinear(e,n,r){for(let s=0;s<this.blocks.length;s++){const{min:i,max:o}=Gs(this.blocks[s].center);if(e>=i[0]&&e<=o[0]&&n>=i[1]&&n<=o[1]&&r>=i[2]&&r<=o[2])return s}}toWorldVoxel(e,n,r,s){const i=e.store.scale,[o,a,l]=e.store.voxels;return[Math.round(e.center[0]/i-o/2+n),Math.round(e.center[1]/i-a/2+r),Math.round(e.center[2]/i-l/2+s)]}write(e,n){let r=_e;const s=[];if(this.resolve!==void 0){const o=new Set;for(let a=-1;a<=1;a++)for(let l=-1;l<=1;l++)for(let c=-1;c<=1;c++){const u=this.resolve([e[0]+c,e[1]+l,e[2]+a]);u!==void 0&&!o.has(u)&&(o.add(u),s.push(u))}}else for(let o=0;o<this.blocks.length;o++)s.push(o);let i=!1;for(const o of s){const a=this.blocks[o],[l,c,u]=_s(a.store,a.center,e);if(!a.store.inBoundsPadded(l,c,u))continue;const h=a.store.paddedIndex(l,c,u),d=a.store.data[h];d!==n&&(r=d,a.store.data[h]=n,Ut(n)?a.store.hasWater=!0:n!==_e&&(a.store.mightHaveVoxels=!0),kt(n)&&(a.store.hasFlowing=!0),this.touched.add(o),(Mr(d)||Mr(n))&&this.emissive.add(o),i=!0)}i&&(kt(n)?this.schedule(e,Cs(n)):kt(r)&&r!==n&&this.wakeNeighbours(e))}flush(){if(this.emissive.size>0){for(const n of this.emissive){const r=this.blocks[n];Ql(r.store,r.light)}this.emissive.clear()}if(this.touched.size===0)return;const e=[...this.touched];this.touched.clear(),this.onBlocksEdited(e)}get pendingCount(){return this.due.size}get active(){return this.due.size>0}}const eD=([t,e,n])=>[t,e-1,n];class ps{buf;ctor;chunk;length=0;constructor(e,n=512){this.ctor=e,this.chunk=n,this.buf=new e(n)}growBy(e){const n=this.length+e;if(n<=this.buf.length)return;let r=this.buf.length;for(;r<n;)r=Math.max(r*2,this.chunk);const s=new this.ctor(r);s.set(this.buf.subarray(0,this.length)),this.buf=s}pushMany(e){this.growBy(e.length),this.buf.set(e,this.length),this.length+=e.length}pushShifted(e,n){this.growBy(e.length);for(let r=0;r<e.length;r++)this.buf[this.length+r]=e[r]+n;this.length+=e.length}pushOffset(e,n,r,s){this.growBy(e.length);for(let i=0;i<e.length;i+=3)this.buf[this.length+i]=e[i]+n,this.buf[this.length+i+1]=e[i+1]+r,this.buf[this.length+i+2]=e[i+2]+s;this.length+=e.length}pushTris(e,n,r,s){const i=s*3;this.growBy(i);for(let o=0;o<s;o++){const a=this.length+o*3;this.buf[a]=e,this.buf[a+1]=n,this.buf[a+2]=r}this.length+=i}get count(){return this.length}get capacityBytes(){return this.buf.byteLength}pushPair(e,n){this.growBy(2),this.buf[this.length]=e,this.buf[this.length+1]=n,this.length+=2}pushTriple(e,n,r){this.growBy(3),this.buf[this.length]=e,this.buf[this.length+1]=n,this.buf[this.length+2]=r,this.length+=3}pushQuad(e,n,r,s){this.growBy(4),this.buf[this.length]=e,this.buf[this.length+1]=n,this.buf[this.length+2]=r,this.buf[this.length+3]=s,this.length+=4}writeManyAt(e,n){this.buf.set(n,e)}writeShiftedAt(e,n,r){for(let s=0;s<n.length;s++)this.buf[e+s]=n[s]+r}writeOffsetAt(e,n,r,s,i){for(let o=0;o<n.length;o+=3)this.buf[e+o]=n[o]+r,this.buf[e+o+1]=n[o+1]+s,this.buf[e+o+2]=n[o+2]+i}clear(){this.length=0}exact(){const e=new this.ctor(this.length);return e.set(this.buf.subarray(0,this.length)),e}array(){return this.buf.subarray(0,this.length)}}const ug=-1,tD=Number.NaN,hg=t=>t.every(e=>e===t[0])?t[0]:null;class nD{constructor(e,n){this.wide=e,this.tall=n,this.ids=new Int32Array(e*n),this.skies=new Float64Array(e*n),this.blocks=new Float64Array(e*n),this.taken=new Uint8Array(e*n),this.clear()}wide;tall;ids;skies;blocks;taken;clear(){this.ids.fill(ug),this.taken.fill(0)}set(e,n,r,s){const i=n*this.wide+e;if(this.ids[i]=r,s===null){this.skies[i]=1,this.blocks[i]=0;return}const o=hg(s.sky),a=hg(s.block);if(o===null||a===null){this.skies[i]=tD;return}this.skies[i]=o,this.blocks[i]=a}eachRectangle(e){for(let n=0;n<this.tall;n++)for(let r=0;r<this.wide;r++){const s=n*this.wide+r,i=this.ids[s];if(i===ug||this.taken[s]===1)continue;const o=this.skies[s];if(Number.isNaN(o)){this.taken[s]=1,e({first:r,second:n,wide:1,tall:1,id:i,sky:null,block:0});continue}const a=this.blocks[s];let l=1;for(;r+l<this.wide&&this.matches(s+l,i,o,a);)l++;let c=1;for(;n+c<this.tall;){const u=s+c*this.wide;let h=!0;for(let d=0;d<l;d++)if(!this.matches(u+d,i,o,a)){h=!1;break}if(!h)break;c++}for(let u=0;u<c;u++)this.taken.fill(1,s+u*this.wide,s+u*this.wide+l);e({first:r,second:n,wide:l,tall:c,id:i,sky:o,block:a})}}matches(e,n,r,s){return this.taken[e]===0&&this.ids[e]===n&&this.skies[e]===r&&this.blocks[e]===s}}const rD=20,dg=255,Nd=(t,e)=>t*2+(e>0?0:1),Vv=t=>{const e=t.mul(.5).floor(),n=V(1).sub(t.sub(e.mul(2)).mul(2)),r=s=>V(1).sub(e.sub(V(s)).abs().min(V(1)));return ze(r(0),r(1),r(2)).mul(n)},fg=t=>{if(t===0)return 0;const e=Math.floor(Math.log2(t)),n=t-2**e<<10-e;return e+15<<10|n};class Gv{positions=new ps(Float32Array);packed=new ps(Uint8Array);uvs=new ps(Uint16Array);indices=new ps(Uint32Array);clear(){this.positions.clear(),this.packed.clear(),this.uvs.clear(),this.indices.clear()}pushPacked(e,n,r,s){this.packed.pushQuad(e,Math.round(n*255),s,Math.round(r*255))}pushUv(e,n){this.uvs.pushPair(fg(e),fg(n))}finish(){return{positions:this.positions.exact(),packed:this.packed.exact(),uvs:this.uvs.exact(),indices:this.indices.exact()}}}const sD=()=>({positions:new Float32Array(0),packed:new Uint8Array(0),uvs:new Uint16Array(0),indices:new Uint32Array(0)}),ac=[[[0,0,0,0,1],[0,1,0,0,0],[0,1,1,1,0],[0,0,1,1,1]],[[0,0,0,0,0],[1,0,0,1,0],[1,0,1,1,1],[0,0,1,0,1]],[[0,0,0,0,1],[1,0,0,1,1],[1,1,0,1,0],[0,1,0,0,0]]],iD=(t,e)=>t===1?e===-1:e===1,pg=[!0,!1,!1],Fd=[[1,2],[0,2],[0,1]],oD=(t,e,n,r)=>$0(t.skylightAt(t.paddedIndex(e,n,r))),aD=(t,e,n,r)=>$0(t.blocklightAt(t.paddedIndex(e,n,r))),ku=(t,e,n,r)=>{const s=t.atPadded(e,n,r);return s!==_e&&!Ut(s)},lD=t=>t===_e||kt(t),Bd=(t,e,n,r,s,i,o)=>{if(e===null)return null;const[a,l]=Fd[i],c=[],u=[];for(const h of ac[i]){const d=h[a],f=h[l];let m=0,p=0;for(const E of[d,d-1])for(const T of[f,f-1]){const A=[n,r,s];A[a]+=E,A[l]+=T,A[i]+=o,m=Math.max(m,oD(e,A[0],A[1],A[2])),p=Math.max(p,aD(e,A[0],A[1],A[2]))}const y=d===0?-1:1,g=f===0?-1:1;let b=0;const v=[n,r,s];v[a]+=y,v[i]+=o,b+=ku(t,v[0],v[1],v[2])?1:0;const x=[n,r,s];x[l]+=g,x[i]+=o,b+=ku(t,x[0],x[1],x[2])?1:0;const k=[n,r,s];k[a]+=y,k[l]+=g,k[i]+=o,b+=ku(t,k[0],k[1],k[2])?1:0;const C=(3-b)/3;c.push(m*C),u.push(p*C)}return{sky:c,block:u}},tl=0,Ud=(t,e,n,r)=>{iD(n,r)?(t.into.indices.pushTriple(e,e+1,e+2),t.into.indices.pushTriple(e,e+2,e+3)):(t.into.indices.pushTriple(e,e+2,e+1),t.into.indices.pushTriple(e,e+3,e+2))},cD=(t,e,n,r,s,i,o,a,l,c)=>{const{store:u,light:h}=t,f=u.scale/2,m=t.into.positions.count/3,p=ac[s],y=Bd(u,h,a,l,c,s,i);for(let g=0;g<p.length;g++){const[b,v,x,k,C]=p[g];t.into.positions.pushTriple(s===0?e+i*f:e+(b-.5)*2*f,s===1?n+i*f:n+(v-.5)*2*f,s===2?r+i*f:r+(x-.5)*2*f),t.into.pushUv(k,C),t.into.pushPacked(Nd(s,i),y===null?1:y.sky[g],y===null?0:y.block[g],o)}Ud(t,m,s,i)},uD=(t,e,n,r,s,i,o,a,l,c,u)=>{const{store:h}=t,d=h.scale,f=h.voxels,[m,p]=Fd[e],y=t.into.positions.count/3,g=(r+(n>0?1:0)-f[e]/2)*d,b=pg[e]?a:o,v=pg[e]?o:a;for(const x of ac[e]){const[k,C,E,T,A]=x,M=[k,C,E],P=[0,0,0];P[e]=g,P[m]=(s+M[m]*o-f[m]/2)*d,P[p]=(i+M[p]*a-f[p]/2)*d,t.into.positions.pushTriple(P[0],P[1],P[2]),t.into.pushUv(T*b,A*v),t.into.pushPacked(Nd(e,n),c,u,l)}Ud(t,y,e,n)},Su=(t,e,n,r,s,i,o,a,l,c,u,h)=>{const{store:d,light:f}=t,m=d.scale,p=m/2,y=t.into.positions.count/3,g=ac[s],b=Bd(d,f,a,l,c,s,i),v=x=>n-p+x*m;for(let x=0;x<g.length;x++){const[k,C,E,T,A]=g[x],M=s===1||C===1?h:u;t.into.positions.pushTriple(s===0?e+i*p:e+(k-.5)*2*p,v(M),s===2?r+i*p:r+(E-.5)*2*p),t.into.pushUv(T,A),t.into.pushPacked(Nd(s,i),b===null?1:b.sky[x],b===null?0:b.block[x],o)}Ud(t,y,s,i)},mg=(t,e,n,r)=>{const s=t.atPadded(e,n,r),i=t.atPadded(e,n+1,r);return t.atPadded(e,n-1,r)===_e?1:i===_e?YL(Ba(s)):1},Yv=(t,e,n,r,s)=>{const{store:i}=t,[o,a,l]=i.voxels,c=i.scale,u=(k,C,E)=>i.atPadded(k,C,E),h=u(e,n,r),d=Ut(h)?Ut:Mr,f=u(e,n+1,r),m=u(e,n-1,r),p=[[e-1,n,r,0],[e+1,n,r,1],[e,n,r-1,2],[e,n,r+1,3]],y=mg(i,e,n,r),g=(e+.5-o/2)*c,b=(n+.5-a/2)*c,v=(r+.5-l/2)*c,x=s===null?tl:s(h);f===_e&&Su(t,g,b,v,1,1,x,e,n,r,y,y),m===_e&&Su(t,g,b,v,1,-1,x,e,n,r,0,0);for(const[k,C,E,T]of p){const A=u(k,C,E);if(A!==_e&&!d(A))continue;const M=d(A)?mg(i,k,C,E):0;if(M>=y)continue;const P=T<2?0:2,S=T%2===0?-1:1;Su(t,g,b,v,P,S,x,e,n,r,M,y)}},hD=(t,e,n=null,r=new Gv)=>{r.clear();const s={store:t,light:n,into:r},[i,o,a]=t.voxels,l=t.scale,c=new Map;for(const p of e)c.set(p.id,p);const u=p=>c.get(p)?.side??tl,h=(p,y,g)=>t.atPadded(p,y,g);for(let p=0;p<a;++p)for(let y=0;y<o;++y)for(let g=0;g<i;++g)Mr(h(g,y,p))&&Yv(s,g,y,p,u);const d=(p,y,g)=>{const b=c.get(p);return y!==1?b?.side??tl:(g>0?b?.top:b?.bottom)??tl},f=[0,0,0],m=[0,0,0];for(let p=0;p<3;p++){const[y,g]=Fd[p],b=new nD(t.voxels[y],t.voxels[g]);for(const v of[-1,1])for(let x=0;x<t.voxels[p];x++){b.clear();for(let k=0;k<t.voxels[g];k++)for(let C=0;C<t.voxels[y];C++){f[p]=x,f[y]=C,f[g]=k;const E=h(f[0],f[1],f[2]);E===_e||Ut(E)||Mr(E)||(m[p]=x+v,m[y]=C,m[g]=k,lD(h(m[0],m[1],m[2]))&&b.set(C,k,E,Bd(t,n,f[0],f[1],f[2],p,v)))}b.eachRectangle(k=>{const{first:C,second:E,wide:T,tall:A,id:M,sky:P,block:S}=k,O=d(M,p,v);if(P===null){f[p]=x,f[y]=C,f[g]=E,cD(s,(f[0]+.5-i/2)*l,(f[1]+.5-o/2)*l,(f[2]+.5-a/2)*l,p,v,O,f[0],f[1],f[2]);return}uD(s,p,v,x,C,E,T,A,O,P,S)})}}return r.finish()},dD=(t,e=null,n=new Gv)=>{n.clear();const r={store:t,light:e,into:n},[s,i,o]=t.voxels;if(!t.hasWater)return n.finish();for(let a=0;a<o;++a)for(let l=0;l<i;++l)for(let c=0;c<s;++c)Ut(t.atPadded(c,l,a))&&Yv(r,c,l,a,null);return n.finish()},Sa=(t,e,n,r,s=!1)=>{const i=new $e(t,e,s);return i.format=r,n!==void 0&&(i.updateRange={offset:n.first*e,count:n.count*e}),i.needsUpdate=!0,i},fD=(t,e,n)=>{t.setAttribute("position",Sa(e.positions,3,n?.vertices,"float32x3")),t.setAttribute("packed",Sa(e.packed,4,n?.vertices,"unorm8x4",!0)),e.uvs.length>0?t.setAttribute("uv",Sa(e.uvs,2,n?.vertices,"float16x2")):t.deleteAttribute("uv"),t.setIndex(Sa(e.indices,1,n?.indices))},Hd=rD,jd=4,gg={start:0,count:0},pD=()=>({positions:new ps(Float32Array),packed:new ps(Uint8Array),uvs:new ps(Uint16Array),indices:new ps(Uint32Array)}),qv=()=>({vertexFirst:1/0,vertexLast:-1,indexFirst:1/0,indexLast:-1}),zl=(t,e)=>e<t?void 0:{first:t,count:e-t+1},mD=(t,e,n,r,s)=>{const i=t.positions.count/3;t.positions.pushOffset(e.positions,n,r,s),t.packed.pushMany(e.packed),t.uvs.pushMany(e.uvs),t.indices.pushShifted(e.indices,i)},yg=t=>t.positions.capacityBytes+t.packed.capacityBytes+t.uvs.capacityBytes+t.indices.capacityBytes,bg=()=>({arrays:pD(),free:[],written:qv()}),vg=t=>{const e=zl(t.written.vertexFirst,t.written.vertexLast),n=zl(t.written.indexFirst,t.written.indexLast);return(e?.count??0)*Hd+(n?.count??0)*jd},wg=(t,e,n,r,s)=>{n>0&&(t.written.vertexFirst=Math.min(t.written.vertexFirst,e),t.written.vertexLast=Math.max(t.written.vertexLast,e+n-1)),s>0&&(t.written.indexFirst=Math.min(t.written.indexFirst,r),t.written.indexLast=Math.max(t.written.indexLast,r+s-1))},gD=(t,e,n,r,s)=>{const i=e.positions.length/3,o=e.indices.length,a=t.free.findIndex(h=>h.vertexCount>=i&&h.indexCount>=o);if(a===-1){const h=t.arrays.positions.count/3,d=t.arrays.indices.count;return mD(t.arrays,e,n,r,s),wg(t,h,i,d,o),{indices:{start:d,count:o},vertices:{start:h,count:i}}}const l=t.free[a];t.arrays.positions.writeOffsetAt(l.vertexFirst*3,e.positions,n,r,s),t.arrays.packed.writeManyAt(l.vertexFirst*4,e.packed),t.arrays.uvs.writeManyAt(l.vertexFirst*2,e.uvs),t.arrays.indices.writeShiftedAt(l.indexFirst,e.indices,l.vertexFirst),wg(t,l.vertexFirst,i,l.indexFirst,o);const c=l.vertexCount-i,u=l.indexCount-o;return c>0&&u>0?t.free[a]={vertexFirst:l.vertexFirst+i,vertexCount:c,indexFirst:l.indexFirst+o,indexCount:u}:t.free.splice(a,1),{indices:{start:l.indexFirst,count:o},vertices:{start:l.vertexFirst,count:i}}},yD=(t,e,n,r)=>{e.count===0&&r===0||t.free.push({vertexFirst:n,vertexCount:r,indexFirst:e.start,indexCount:e.count})},_g=t=>t.free.reduce((e,n)=>e+n.vertexCount*Hd+n.indexCount*jd,0),xg=t=>{for(const[e,n]of Object.entries(t.attributes))t.setAttribute(e,new $e(new Float32Array(0),n.itemSize));t.index!==null&&t.setIndex(new $e(new Uint32Array(0),1))},Ea=t=>t.positions.length/3*Hd+t.indices.length*jd;class bD{constructor(e,n){this.center=e,this.pair=n}center;pair;joined=new Set;terrainPass=bg();waterPass=bg();terrainRanges=new Map;waterRanges=new Map;terrainVertices=new Map;waterVertices=new Map;get terrain(){return this.pair.terrain}get water(){return this.pair.water}holds(e){return this.joined.has(e)}get members(){return this.joined}join(e,n,r){if(this.joined.has(e))return;const s=n[0]-this.center[0],i=n[1]-this.center[1],o=n[2]-this.center[2];for(const[a,l,c,u]of[[this.terrainPass,r.terrain,this.terrainRanges,this.terrainVertices],[this.waterPass,r.water,this.waterRanges,this.waterVertices]]){const h=gD(a,l,s,i,o);c.set(e,h.indices),u.set(e,h.vertices)}this.joined.add(e)}retire(e){if(this.joined.delete(e))for(const[n,r,s]of[[this.terrainPass,this.terrainRanges,this.terrainVertices],[this.waterPass,this.waterRanges,this.waterVertices]]){const i=r.get(e),o=s.get(e);i!==void 0&&o!==void 0&&yD(n,i,o.start,o.count),r.delete(e),s.delete(e)}}rangeOf(e){return{terrain:this.terrainRangeOf(e),water:this.waterRangeOf(e)}}terrainRangeOf(e){return this.terrainRanges.get(e)??gg}waterRangeOf(e){return this.waterRanges.get(e)??gg}get pendingBytes(){return vg(this.terrainPass)+vg(this.waterPass)}get bytes(){return yg(this.terrainPass.arrays)+yg(this.waterPass.arrays)}get freeBytes(){return _g(this.terrainPass)+_g(this.waterPass)}get indexCount(){return this.terrainPass.arrays.indices.count+this.waterPass.arrays.indices.count}upload(){const e=this.pendingBytes;for(const[n,r]of[[this.terrainPass,this.pair.terrain],[this.waterPass,this.pair.water]]){const s=zl(n.written.vertexFirst,n.written.vertexLast),i=zl(n.written.indexFirst,n.written.indexLast);fD(r,{positions:n.arrays.positions.array(),packed:n.arrays.packed.array(),uvs:n.arrays.uvs.array(),indices:n.arrays.indices.array()},{vertices:s??{first:0,count:0},indices:i??{first:0,count:0}}),n.written=qv()}return e}release(){return xg(this.pair.terrain),xg(this.pair.water),this.pair}}const Xv=12,vD=2*Xv,Aa=sD();class wD{blocks;onMeshBuilt;buildsPerDrain;generation;pending=new Set;inFlight=new Map;bufferPool=[];tilesById=new Map;rects=[];pool;warnedWorkerError=!1;nextWorker=0;constructor(e){this.blocks=e.blocks,this.onMeshBuilt=e.onMeshBuilt,this.buildsPerDrain=e.buildsPerDrain??Xv,this.generation=new Array(e.blocks.length).fill(0),this.pool=e.pool??new Td(e.createWorker===void 0?{}:{createWorker:e.createWorker,count:1}),this.pool.onMessage(n=>{this.onWorkerMessage(n.data)}),this.pool.onWorkerLost(()=>{this.onWorkerLost()})}onWorkerMessage(e){if(e.type!=="mesh")return;const n=this.inFlight.get(e.id);if(n!==void 0){if(this.inFlight.delete(e.id),n!==this.generation[e.id]){this.releaseBuffer(e.data),this.releaseBuffer(e.light);return}pe.count(Gn.meshesLanded),this.onMeshBuilt(e.id,e.terrain,e.water),this.releaseBuffer(e.data),this.releaseBuffer(e.light)}}onWorkerLost(){this.warnedWorkerError||(this.warnedWorkerError=!0,console.warn("[meshes] worker unavailable; falling back to the remaining workers or the main thread"));for(const e of this.inFlight.keys())this.pending.add(e);this.inFlight.clear()}invalidate(e){this.generation[e]++}resizeTo(e){for(;this.generation.length<e;)this.generation.push(0);this.generation.length=e;for(const n of[...this.pending])n>=e&&this.pending.delete(n);for(const n of[...this.inFlight.keys()])n>=e&&this.inFlight.delete(n)}requestBuild(e){this.generation[e]++,this.pending.add(e)}acceptMesh(e,n){this.generation[e]++,this.pending.delete(e),this.onMeshBuilt(e,n.terrain,n.water)}buildNow(e){this.pending.delete(e),this.buildOnThisThread([e])}drain(){if(this.pool.workers.length===0){const n=[...this.pending];this.pending.clear(),this.buildOnThisThread(n);return}let e=0;for(const n of this.pending)if(!this.inFlight.has(n)){if(!this.hasSurfaceData(n)){this.pending.delete(n),this.onMeshBuilt(n,Aa,Aa);continue}if(this.send(n),this.pending.delete(n),++e>=this.buildsPerDrain)break}}setTiles(e){this.tilesById.clear();for(const n of e)this.tilesById.set(n.id,n);this.rects=[...this.tilesById.values()];for(let n=0;n<this.blocks.length;n++)this.requestBuild(n)}get tileRects(){return this.rects}get pendingCount(){return this.pending.size}get inFlightCount(){return this.inFlight.size}buildOnThisThread(e){const n=[...this.tilesById.values()];pe.count(Gn.meshesRequested,e.length),pe.count(Gn.meshesLanded,e.length);for(const r of e){if(!this.hasSurfaceData(r)){this.onMeshBuilt(r,Aa,Aa);continue}const s=this.blocks[r].store,i=this.blocks[r].light;this.onMeshBuilt(r,hD(s,n,i),dD(s,i))}}hasSurfaceData(e){return this.blocks[e].store.mightHaveVoxels||this.blocks[e].store.hasWater}send(e){this.generation[e]++,this.inFlight.set(e,this.generation[e]),pe.count(Gn.meshesRequested);const n=this.blocks[e].store,r=this.blocks[e].light,s=this.acquireBuffer(n.data.byteLength);s.set(n.data);const i=this.acquireBuffer(r.data.byteLength);i.set(r.data);const o={type:"mesh",id:e,voxels:n.voxels,scale:n.scale,data:s,hasWater:n.hasWater,light:i,tileRects:[...this.tilesById.values()]},a=this.pool.workers[this.nextWorker%this.pool.workers.length];this.nextWorker++,a?.postMessage(o,[o.data.buffer,o.light.buffer])}acquireBuffer(e){const n=this.bufferPool.findIndex(r=>r.byteLength===e);return n>=0?this.bufferPool.splice(n,1)[0]:new Uint8Array(e)}releaseBuffer(e){this.bufferPool.length<vD&&this.bufferPool.push(e)}dispose(){this.pool.dispose()}}class _D extends ur{slotColor=[0,0,0];slotColorUniform;setup(e){this.slotColorUniform=e.materialUniform("slotColor","vec3",()=>this.slotColor)}buildVertexBody(e){const n=Ie(e.position,1),r=e.instancing?e.instanceMatrix.mul(n):n,s=e.modelMatrix.mul(r);return e.positionWorld.assign(s.xyz),e.instancingColor&&e.instanceColorVarying.assign(e.instanceColor),e.projectionMatrix.mul(e.viewMatrix.mul(s))}buildFragmentBody(e){const n=this.slotColorUniform??e.materialUniform("slotColor","vec3",()=>this.slotColor),r=n.element(0).mul(255).round(),s=n.element(1).mul(255).round(),i=n.element(2).mul(255).round(),a=r.add(s.mul(256)).add(i.mul(65536)).mul(.6180339887).fract(),l=ze(a).add(ze(1,2/3,1/3)).fract().mul(6).sub(3).abs(),c=ze(.9).mul(ze(1).mix(l.sub(ze(1)).clamp(0,1),.8));return Ie(c,1)}}class kg extends ur{slotColor=[0,0,0];slotColorUniform;setup(e){this.slotColorUniform=e.materialUniform("slotColor","vec3",()=>this.slotColor)}buildVertexBody(e){const n=Ie(e.position,1),r=e.instancing?e.instanceMatrix.mul(n):n,s=e.modelMatrix.mul(r);return e.positionWorld.assign(s.xyz),e.instancingColor&&e.instanceColorVarying.assign(e.instanceColor),e.projectionMatrix.mul(e.viewMatrix.mul(s))}buildFragmentBody(e){return Ie(this.slotColorUniform??e.materialUniform("slotColor","vec3",()=>this.slotColor),1)}}const xD=t=>[t&255,t>>>8&255,t>>>16&255],kD=(t,e,n)=>t|e<<8|n<<16,SD=t=>{const[e,n,r]=xD(t);return[e/255,n/255,r/255]},ED=(t,e,n=t.length)=>{let r=0;for(const a of e)a>r&&(r=a);const s=new Uint8Array(r+1),i=Math.min(n,t.length);for(let a=0;a<i;a+=4){const l=kD(t[a],t[a+1],t[a+2]);l>0&&l<=r&&(s[l]=1)}const o=new Set;for(let a=1;a<=r;a++)s[a]===1&&o.add(a);return o},AD=(t,e,n,r)=>t>=r.intervalFrames||e>=r.moveFastTrack*r.moveFastTrack||n<=r.turnFastTrack,TD=(t,e,n)=>Math.abs(t[0]-e[0])<=n&&Math.abs(t[1]-e[1])<=n&&Math.abs(t[2]-e[2])<=n,Sg=t=>Math.max(64,t>>3);class CD extends ur{tilesTexture=null;atlasGrid={columns:1,tilePixels:[1,1],sheetPixels:[1,1]};maxDistance=480;fogStart=200;fogColor=[.53,.81,.92];sunDirection=[1/Math.sqrt(6),2/Math.sqrt(6),1/Math.sqrt(6)];sunLightColor=[1,1,1];moonDirection=[-1/Math.sqrt(6),-2/Math.sqrt(6),-1/Math.sqrt(6)];moonLightColor=[0,0,0];ambientColor=[.2,.2,.2];maxDistanceUniform;fogStartUniform;fogColorUniform;sunDirectionUniform;sunLightColorUniform;moonDirectionUniform;moonLightColorUniform;ambientColorUniform;atlasColumnsUniform;atlasTileUniform;atlasInsetUniform;tilesSampler;constructor(){super(),this.side=Qr.FrontSide}setup(e,n){e.attribute("packed","vec4"),e.varying("brightness","float"),e.varying("blockLight","float"),e.varying("tileIndex","float"),this.atlasColumnsUniform=e.materialUniform("atlasColumns","float",()=>this.atlasGrid.columns),this.atlasTileUniform=e.materialUniform("atlasTile","vec2",()=>[this.atlasGrid.tilePixels[0]/this.atlasGrid.sheetPixels[0],this.atlasGrid.tilePixels[1]/this.atlasGrid.sheetPixels[1]]),this.atlasInsetUniform=e.materialUniform("atlasInset","vec2",()=>[.5/this.atlasGrid.sheetPixels[0],.5/this.atlasGrid.sheetPixels[1]]),this.maxDistanceUniform=e.materialUniform("maxDistance","float",()=>this.maxDistance),this.fogStartUniform=e.materialUniform("fogStart","float",()=>this.fogStart),this.fogColorUniform=e.materialUniform("fogColor","vec3",()=>this.fogColor),this.sunDirectionUniform=e.materialUniform("sunDirection","vec3",()=>this.sunDirection),this.sunLightColorUniform=e.materialUniform("sunLightColor","vec3",()=>this.sunLightColor),this.moonDirectionUniform=e.materialUniform("moonDirection","vec3",()=>this.moonDirection),this.moonLightColorUniform=e.materialUniform("moonLightColor","vec3",()=>this.moonLightColor),this.ambientColorUniform=e.materialUniform("ambientColor","vec3",()=>this.ambientColor),this.tilesTexture!==null&&(this.tilesSampler=e.sampler("tilesAtlas","sampler2D",()=>this.tilesTexture))}buildVertexBody(e){const n=e.attribute("packed","vec4");e.varying("brightness","float").assign(n.y),e.varying("blockLight","float").assign(n.w),e.varying("tileIndex","float").assign(n.z.mul(255).round());const r=Ie(e.position,1),s=e.instancing?e.instanceMatrix.mul(r):r,i=e.modelMatrix.mul(s);e.positionWorld.assign(i.xyz);let o=Vv(n.x.mul(255).round());return e.instancing&&(o=vd(e.instanceMatrix).mul(o)),e.normalWorld.assign(e.normalMatrix.mul(o).normalize()),e.uvVarying.assign(e.uv),e.projectionMatrix.mul(e.viewMatrix.mul(i))}buildFragmentBody(e){const n=e.normalWorld.normalize().toVar(),r=e.positionWorld.toVar(),s=e.uvVarying.toVar(),i=e.varying("brightness","float").toVar(),o=e.varying("blockLight","float").toVar(),a=this.sunDirectionUniform??ze(.4,.7,.4).normalize(),l=this.sunLightColorUniform??ze(1),c=this.moonDirectionUniform??ze(-.4,-.7,-.4).normalize(),u=this.moonLightColorUniform??ze(0),h=this.ambientColorUniform??ze(.2),d=this.fogColorUniform??ze(.53,.81,.92),f=this.fogStartUniform??V(200),m=this.maxDistanceUniform??V(480),p=n.dot(a).max(V(0)),y=n.dot(c).max(V(0)),g=h.add(l.mul(p)).add(u.mul(y));let b=ze(0,0,1);if(this.tilesSampler!==void 0){const E=this.atlasColumnsUniform??V(1),T=this.atlasTileUniform??Vt(1,1),A=this.atlasInsetUniform??Vt(0,0),M=e.varying("tileIndex","float").toVar(),P=M.div(E).floor(),S=M.sub(P.mul(E)),O=Vt(s.x.fract(),s.y.fract()),w=Vt(T.x.sub(A.x.mul(2)),T.y.sub(A.y.mul(2))),R=Vt(S.mul(T.x).add(A.x).add(O.x.mul(w.x)),P.mul(T.y).add(A.y).add(O.y.mul(w.y)));b=this.tilesSampler.texture(R).rgb}const v=i.max(V(.1)).min(V(1)).toVar(),x=b.mul(g.mul(v).max(o)).toVar(),C=r.sub(e.cameraPosition).length().toVar().smoothstep(f,m).toVar();return x.assign(x.mix(d,C)),Ie(x,1)}}class MD extends ur{fogColor=[.53,.81,.92];waterColor=[.1,.35,.55];waterOpacity=.5;fogColorUniform;waterColorUniform;waterOpacityUniform;constructor(){super(),this.transparent=!0,this.depthWrite=!0,this.side=Qr.FrontSide}setup(e,n){e.attribute("packed","vec4"),e.varying("brightness","float"),e.varying("blockLight","float"),this.fogColorUniform=e.materialUniform("fogColor","vec3",()=>this.fogColor),this.waterColorUniform=e.materialUniform("waterColor","vec3",()=>this.waterColor),this.waterOpacityUniform=e.materialUniform("waterOpacity","float",()=>this.waterOpacity)}buildVertexBody(e){const n=e.attribute("packed","vec4");e.varying("brightness","float").assign(n.y),e.varying("blockLight","float").assign(n.w);const r=Ie(e.position,1),s=e.instancing?e.instanceMatrix.mul(r):r,i=e.modelMatrix.mul(s);e.positionWorld.assign(i.xyz);let o=Vv(n.x.mul(255).round());return e.instancing&&(o=vd(e.instanceMatrix).mul(o)),e.normalWorld.assign(e.normalMatrix.mul(o).normalize()),e.uvVarying.assign(e.uv),e.projectionMatrix.mul(e.viewMatrix.mul(i))}buildFragmentBody(e){const n=this.fogColorUniform??ze(.53,.81,.92),r=this.waterColorUniform??ze(.1,.35,.55),s=this.waterOpacityUniform??V(.5),i=e.varying("brightness","float").max(e.varying("blockLight","float")).toVar(),a=e.positionWorld.toVar().sub(e.cameraPosition).normalize(),l=V(.05).add(V(.95).mul(QM(V(1).sub(a.y.abs()),V(3)))).toVar(),c=i.max(V(.1)).min(V(1)).toVar(),u=r.mix(n,l).mul(c),h=l.add(s).min(V(1));return Ie(u,h)}}const RD=2,ir=RD*rt[0],ID=ir/2,nl=rt[0]/2,Eg=6,zD=2*1024*1024,PD=8,OD=200,$D=1,LD=ir,DD=.75,Ag=t=>[Math.floor(t[0]/ir),Math.floor(t[1]/ir),Math.floor(t[2]/ir)],ND=t=>`${t[0]},${t[1]},${t[2]}`,FD=t=>({center:[t[0]*ir+nl,t[1]*ir+nl,t[2]*ir+nl],half:ID}),Tg=t=>t.positions.byteLength+t.packed.byteLength+t.uvs.byteLength+t.indices.byteLength,BD=t=>{const e=t.elements;return[[e[3]-e[0],e[7]-e[4],e[11]-e[8],e[15]-e[12]],[e[3]+e[0],e[7]+e[4],e[11]+e[8],e[15]+e[12]],[e[3]+e[1],e[7]+e[5],e[11]+e[9],e[15]+e[13]],[e[3]-e[1],e[7]-e[5],e[11]-e[9],e[15]-e[13]],[e[3]-e[2],e[7]-e[6],e[11]-e[10],e[15]-e[14]],[e[3]+e[2],e[7]+e[6],e[11]+e[10],e[15]+e[14]]]},Cg=(t,e,n)=>{for(const[r,s,i,o]of t){const a=r>=0?e[0]+n:e[0]-n,l=s>=0?e[1]+n:e[1]-n,c=i>=0?e[2]+n:e[2]-n;if(r*a+s*l+i*c+o<0)return!1}return!0},UD={start:0,count:0};class HD{triMaterial=new CD;triWaterMaterial=new MD;terrain=new Xn;water=new Xn;underwaterTint=new Xn;waterExtinction;seaLevel;uploadBudgetBytes;uploadBytesThisFrame=0;mergesThisFrame=0;totalTriangles=0;meshes;onBlockMeshed;meshed=new Map;seated=new Map;chunkMeshes=new Map;scMembers=new Map;blockSc=new Map;scChunkTerrain=new Map;scChunkWater=new Map;slotCenter=new Map;superchunks=new Map;geometryPool=[];geometryPoolBytes=0;geometryPoolBudgetBytes;dirty=new Set;scLastUpload=new Map;frame=0;contentSlots=new Set;changedTogether=[];probeTerrainMaterial=new kg;probeWaterMaterial=new kg;probeDebugMaterial=new _D;occlusionScene=new ob;scCell=new Map;scProbeTerrain=new Map;scProbeWater=new Map;occlusionTarget=null;occlusionReadback=null;lastVisible=null;lastQueryTested=new Set;lastQueryFrame=Number.NEGATIVE_INFINITY;lastQueryPosition=null;lastQueryForward=null;occlusionPending=!1;occlusionOn=!0;occlusionInterval=OD;showProbe=!1;occludedCount=0;lastTimedOut=0;lastNearExempt=0;lastSaw=0;drawnMeshes=0;runOrder=[];tintMaterial;tintMesh;constructor(e){const{blocks:n,waterExtinction:r,seaLevel:s,onBlockMeshed:i}=e;this.waterExtinction=r,this.seaLevel=s,this.onBlockMeshed=i,this.uploadBudgetBytes=e.uploadBytesPerFrame??zD,this.geometryPoolBudgetBytes=this.uploadBudgetBytes*PD,this.probeWaterMaterial.depthWrite=!1,this.meshes=new wD({blocks:n,pool:e.pool,createWorker:e.createWorker,onMeshBuilt:(o,a,l)=>{this.chunkMeshes.set(o,{terrain:a,water:l}),this.meshed.set(o,a.indices.length>0||l.indices.length>0);const c=this.blockSc.get(o);c!==void 0&&(this.superchunks.get(c)?.retire(o),this.heldForGroup(o,c)||this.dirty.add(c)),this.onBlockMeshed?.(o)}}),this.tintMaterial=new Lo({color:1726860,transparent:!0,opacity:0}),this.tintMaterial.depthTest=!1,this.tintMaterial.depthWrite=!1,this.tintMesh=new wn(new Hi(4e3,4e3,4e3),this.tintMaterial),this.tintMesh.visible=!1,this.underwaterTint.add(this.tintMesh)}ensureSuperchunk(e,n){this.scMembers.has(e)||(this.scMembers.set(e,[]),this.scCell.set(e,n))}removeSuperchunk(e){this.scCell.delete(e);const n=this.scMembers.get(e);if(n!==void 0)for(const s of n)this.dropSlot(s.index);this.scMembers.delete(e);const r=this.superchunks.get(e);r!==void 0&&this.recycleGeometryPair(r),this.superchunks.delete(e),this.dirty.delete(e),this.updateTriCount()}takeGeometryPair(){const e=this.geometryPool.pop();return e!==void 0?(this.geometryPoolBytes-=e.bytes,{terrain:e.terrain,water:e.water}):{terrain:new Jr,water:new Jr}}recycleGeometryPair(e){const n=e.bytes,r=e.release();if(this.geometryPoolBytes+n>this.geometryPoolBudgetBytes){r.terrain.dispose(),r.water.dispose();return}this.geometryPool.push({terrain:r.terrain,water:r.water,bytes:n}),this.geometryPoolBytes+=n}dropSlot(e){for(const n of[this.scChunkTerrain,this.scChunkWater]){const r=n.get(e);r!==void 0&&(this.terrain.remove(r),this.water.remove(r),n.delete(e))}for(const n of[this.scProbeTerrain,this.scProbeWater]){const r=n.get(e);r!==void 0&&(this.occlusionScene.remove(r),n.delete(e))}this.contentSlots.delete(e),this.seated.delete(e),this.slotCenter.delete(e)}rebuildSuperchunk(e,n=!1){const r=this.scMembers.get(e),s=this.scCell.get(e);if(r===void 0||s===void 0)return!1;const i=[s[0]*ir,s[1]*ir,s[2]*ir];let o=this.superchunks.get(e);const a=o===void 0;o===void 0&&(o=new bD(i,this.takeGeometryPair()),this.superchunks.set(e,o));let l=!1;for(const f of r){const m=this.chunkMeshes.get(f.index);m===void 0||o.holds(f.index)||(o.join(f.index,f.center,m),this.chunkMeshes.delete(f.index),l=!0)}const c=r.reduce((f,m)=>f+(this.meshed.has(m.index)?0:1),0),u=this.scLastUpload.get(e),h=u!==void 0&&this.frame-u>=Eg;return n||a||l&&c===0||h?(this.scLastUpload.set(e,this.frame),pe.count(Gn.uploads),this.uploadBytesThisFrame+=o.upload(),this.syncSlotMeshes(e,i,o),this.updateTriCount(),!0):(l&&this.dirty.add(e),!1)}pendingUploadBytes(e){const n=this.scMembers.get(e);if(n===void 0)return 0;const r=this.superchunks.get(e);if(r===void 0){let i=0;for(const o of n){const a=this.chunkMeshes.get(o.index);a!==void 0&&(i+=Ea(a.terrain)+Ea(a.water))}return i}let s=r.pendingBytes;for(const i of n){if(r.holds(i.index))continue;const o=this.chunkMeshes.get(i.index);o!==void 0&&(s+=Ea(o.terrain)+Ea(o.water))}return s}syncSlotMeshes(e,n,r){for(const s of this.scMembers.get(e)){this.slotCenter.set(s.index,s.center);const{terrain:i,water:o}=r.rangeOf(s.index),a=i.count>0,l=o.count>0;if(a){const c=this.slotMesh(this.scChunkTerrain,this.terrain,s.index);this.seatSlotMesh(c,r.terrain,this.worldTerrainMaterial(),n,i);const u=this.probeMesh(this.scProbeTerrain,s.index);this.seatSlotMesh(u,r.terrain,this.probeTerrainMaterial,n,i)}if(l){const c=this.slotMesh(this.scChunkWater,this.water,s.index);this.seatSlotMesh(c,r.water,this.worldWaterMaterial(),n,o);const u=this.probeMesh(this.scProbeWater,s.index);this.seatSlotMesh(u,r.water,this.probeWaterMaterial,n,o)}this.setSlotRange(this.scChunkTerrain,s.index,i),this.setSlotRange(this.scChunkWater,s.index,o),this.setSlotRange(this.scProbeTerrain,s.index,i),this.setSlotRange(this.scProbeWater,s.index,o),this.seated.set(s.index,{terrain:{start:i.start,count:i.count},water:{start:o.start,count:o.count}}),a||l?this.contentSlots.add(s.index):this.contentSlots.delete(s.index)}}probeMesh(e,n){const r=e.get(n);if(r!==void 0)return r;const s=this.slotMesh(e,this.occlusionScene,n),i=SD(n);return s.onBeforeRender=()=>{s.material.slotColor=i},s}slotMesh(e,n,r){let s=e.get(r);return s===void 0&&(s=new wn,s.drawRange={start:0,count:0},n.add(s),e.set(r,s)),s}seatSlotMesh(e,n,r,s,i){e.geometry=n,e.material=r,e.position.set(s[0],s[1],s[2]),e.drawRange.start=i.start,e.drawRange.count=i.count}setSlotRange(e,n,r){const s=e.get(n);s!==void 0&&(s.drawRange.start=r.start,s.drawRange.count=r.count)}worldTerrainMaterial(){return this.showProbe?this.probeDebugMaterial:this.triMaterial}worldWaterMaterial(){return this.showProbe?this.probeDebugMaterial:this.triWaterMaterial}syncProbeMaterials(){for(const e of this.scChunkTerrain.values())e.material=this.worldTerrainMaterial();for(const e of this.scChunkWater.values())e.material=this.worldWaterMaterial()}meshNow(e){this.meshes.buildNow(e)}updateTriCount(){let e=0;for(const n of this.scChunkTerrain.keys())e+=this.seatedRange(n,!0).count/3;for(const n of this.scChunkWater.keys())e+=this.seatedRange(n,!1).count/3;this.totalTriangles=Math.round(e)}seatedRange(e,n){const r=this.seated.get(e);return r===void 0?UD:n?r.terrain:r.water}applyVisibility(e,n){this.occludedCount=0,this.lastTimedOut=0,this.lastNearExempt=0,this.lastSaw=0,this.drawnMeshes=0;for(const[r,s]of this.scChunkTerrain)s.visible=this.chunkVisible(r,!0,e,n,!0);for(const[r,s]of this.scChunkWater)s.visible=this.chunkVisible(r,!1,e,n,!1);this.drawRuns(this.scChunkTerrain,!0),this.drawRuns(this.scChunkWater,!1)}drawRuns(e,n){if(this.showProbe){for(const s of e.values())s.visible&&this.drawnMeshes++;return}const r=this.runOrder;for(const[s,i]of this.scMembers){if(this.superchunks.get(s)===void 0)continue;r.length=0;for(const u of i)e.get(u.index)?.visible===!0&&r.push(u.index);if(r.length===0)continue;r.sort((u,h)=>this.seatedRange(u,n).start-this.seatedRange(h,n).start);let a=e.get(r[0]),l=this.seatedRange(r[0],n).start,c=this.seatedRange(r[0],n).count;for(let u=1;u<r.length;u++){const h=this.seatedRange(r[u],n);if(h.start===l+c){c+=h.count,e.get(r[u]).visible=!1;continue}a.drawRange.start=l,a.drawRange.count=c,this.drawnMeshes++,a=e.get(r[u]),l=h.start,c=h.count}a.drawRange.start=l,a.drawRange.count=c,this.drawnMeshes++}}chunkVisible(e,n,r,s,i){const o=this.slotCenter.get(e);return o===void 0||this.seatedRange(e,n).count<=0||!Cg(r,o,nl)?!1:this.showProbe?!0:this.lastQueryTested.has(e)?this.slotIsNear(e,s)?(this.lastNearExempt++,!0):this.lastVisible!==null&&!this.lastVisible.has(e)?(i&&this.occludedCount++,!1):(this.lastSaw++,!0):(this.lastTimedOut++,!0)}slotIsNear(e,n){const r=this.blockSc.get(e),s=r===void 0?void 0:this.scCell.get(r);return s!==void 0&&TD(s,n,$D)}slotHiddenByOcclusion(e,n){return!this.lastQueryTested.has(e)||this.slotIsNear(e,n)?!1:this.lastVisible!==null&&!this.lastVisible.has(e)}scOccluded(e,n){const r=this.superchunks.get(e)?.members;if(r!==void 0&&r.size>0){for(const o of r)if(!this.slotHiddenByOcclusion(o,n))return!1;return!0}const s=this.scMembers.get(e);if(s===void 0||s.length===0)return!1;let i=!1;for(const o of s)if(this.meshed.get(o.index)===!0&&(i=!0,!this.slotHiddenByOcclusion(o.index,n)))return!1;return i}get triangleCount(){return this.totalTriangles}get lastTickUploadBytes(){return this.uploadBytesThisFrame}get mergedGeometryBytes(){let e=0;for(const n of this.superchunks.values())e+=n.bytes;return e}get blockGeometryBytes(){let e=0;for(const n of this.chunkMeshes.values())e+=Tg(n.terrain)+Tg(n.water);return e}get lastTickMerges(){return this.mergesThisFrame}get dirtySuperchunkCount(){return this.dirty.size}get meshPendingCount(){return this.meshes.pendingCount}get meshInFlightCount(){return this.meshes.inFlightCount}resizeTo(e){for(const n of[...this.blockSc.keys()]){if(n<e)continue;this.dropSlot(n),this.chunkMeshes.delete(n),this.meshed.delete(n),this.meshes.invalidate(n);const r=this.blockSc.get(n);if(this.blockSc.delete(n),r===void 0)continue;const s=this.scMembers.get(r),i=s?.findIndex(o=>o.index===n)??-1;i>=0&&s.splice(i,1),s!==void 0&&s.length===0?this.removeSuperchunk(r):(this.superchunks.get(r)?.retire(n),this.dirty.add(r))}this.meshes.resizeTo(e)}repositionBlock(e,n){const r=Ag(n),s=ND(r),i=this.blockSc.get(e);this.chunkMeshes.delete(e),this.meshed.delete(e),this.seated.delete(e),this.meshes.invalidate(e);for(const o of[this.scChunkTerrain,this.scChunkWater,this.scProbeTerrain,this.scProbeWater]){const a=o.get(e);a!==void 0&&(a.drawRange.start=0,a.drawRange.count=0)}if(this.slotCenter.delete(e),i!==void 0){const o=this.scMembers.get(i),a=o?.findIndex(l=>l.index===e)??-1;a>=0&&o.splice(a,1),o!==void 0&&o.length===0?this.removeSuperchunk(i):o!==void 0&&(this.superchunks.get(i)?.retire(e),this.dirty.add(i))}this.ensureSuperchunk(s,r),this.blockSc.set(e,s),this.scMembers.get(s).push({index:e,center:n})}heldForGroup(e,n){for(let r=0;r<this.changedTogether.length;r++){const s=this.changedTogether[r];if(s.waitingFor.has(e)){if(s.waitingFor.delete(e),s.keys.add(n),s.waitingFor.size===0){for(const i of s.keys)this.dirty.add(i);this.changedTogether.splice(r,1)}return!0}}return!1}onBlocksChanged(e){e.length>1&&this.changedTogether.push({waitingFor:new Set(e),keys:new Set,since:this.frame});for(const n of e)this.onBlockChanged(n)}onBlockChanged(e,n){if(n!==void 0){this.meshes.acceptMesh(e,n);return}this.meshes.requestBuild(e)}setTiles(e,n,r){for(const s of e){const i=Math.max(s.top,s.side,s.bottom);if(i>dg)throw new Error(`[atlas] tile index ${i} is past the ${dg} a vertex can name`)}this.triMaterial.tilesTexture=n,this.triMaterial.atlasGrid=r,this.triMaterial.needsUpdate=!0,this.meshes.setTiles(e)}get tileRects(){return this.meshes.tileRects}applyLighting(e){this.triMaterial.fogColor=e.skyColor,this.triMaterial.sunDirection=e.sunDir,this.triMaterial.sunLightColor=e.sunLight,this.triMaterial.moonDirection=e.moonDir,this.triMaterial.moonLightColor=e.moonLight,this.triMaterial.ambientColor=e.ambient,this.triWaterMaterial.fogColor=e.skyColor}tick(e,n){pe.begin(Qe.meshDrain),this.meshes.drain(),pe.end(Qe.meshDrain),this.frame++,this.uploadBytesThisFrame=0,this.mergesThisFrame=0;for(let c=this.changedTogether.length-1;c>=0;c--){const u=this.changedTogether[c];if(!(this.frame-u.since<Eg)){for(const h of u.keys)this.dirty.add(h);this.changedTogether.splice(c,1)}}const r=[...this.dirty];this.dirty.clear(),n.updateMatrixWorld(!0);const s=new sr().copy(n.projectionMatrix).multiply(n.matrixWorldInverse),i=BD(s),o=Ag([n.position.x,n.position.y,n.position.z]),a=[];for(const c of r){const u=this.scCell.get(c);if(u===void 0)continue;const{center:h,half:d}=FD(u);if(!Cg(i,h,d)){this.dirty.add(c);continue}if(this.scOccluded(c,o)){this.dirty.add(c);continue}const f=h[0]-n.position.x,m=h[1]-n.position.y,p=h[2]-n.position.z;a.push({key:c,d2:f*f+m*m+p*p,bytes:this.pendingUploadBytes(c)})}a.sort((c,u)=>c.d2-u.d2);let l=0;pe.begin(Qe.merge);for(const c of a){if(l>0&&l+c.bytes>this.uploadBudgetBytes){this.dirty.add(c.key);continue}this.rebuildSuperchunk(c.key)&&(l+=c.bytes,this.mergesThisFrame++,pe.count(Gn.merges))}if(pe.end(Qe.merge),this.applyVisibility(i,o),this.seaLevel!==void 0){const c=this.seaLevel-n.position.y;c>0?(this.tintMesh.visible=!0,this.tintMesh.position.copy(n.position),this.tintMaterial.opacity=Math.min(1,1-Math.exp(-this.waterExtinction*c))):this.tintMesh.visible=!1}else this.tintMesh.visible=!1}occlusionFrame(e,n){if(!this.occlusionOn||this.occlusionPending||this.scProbeTerrain.size===0&&this.scProbeWater.size===0)return;const r=e.gl,s=Sg(r.drawingBufferWidth),i=Sg(r.drawingBufferHeight);n.updateMatrixWorld(!0);const o=n.getWorldDirection(),a=this.lastQueryPosition===null?Number.POSITIVE_INFINITY:(n.position.x-this.lastQueryPosition[0])**2+(n.position.y-this.lastQueryPosition[1])**2+(n.position.z-this.lastQueryPosition[2])**2,l=this.lastQueryForward===null?-1:o.x*this.lastQueryForward[0]+o.y*this.lastQueryForward[1]+o.z*this.lastQueryForward[2];if(!AD(this.frame-this.lastQueryFrame,a,l,{intervalFrames:this.occlusionInterval,moveFastTrack:LD,turnFastTrack:DD}))return;this.occlusionTarget??=new BR,this.occlusionTarget.width=s,this.occlusionTarget.height=i;const c=s*i*4;(this.occlusionReadback===null||this.occlusionReadback.length!==c)&&(this.occlusionReadback=new Uint8Array(c));const u=r.getParameter(r.COLOR_CLEAR_VALUE);e.setClearColor(new Qt(0,0,0),1),e.render(this.occlusionScene,n,this.occlusionTarget),e.setClearColor(new Qt(u[0],u[1],u[2]),u[3]);const h=new Set([...this.scProbeTerrain.keys(),...this.scProbeWater.keys()]);this.occlusionPending=!0,this.runOcclusionQuery(e,this.occlusionTarget,this.occlusionReadback,h,c),this.lastQueryFrame=this.frame,this.lastQueryPosition=[n.position.x,n.position.y,n.position.z],this.lastQueryForward=[o.x,o.y,o.z]}async runOcclusionQuery(e,n,r,s,i){try{const o=await e.readPixelsAsync(n,r);this.lastQueryTested=s,this.lastVisible=ED(o,s,i)}catch{}finally{this.occlusionPending=!1}}get occlusionEnabled(){return this.occlusionOn}set occlusionEnabled(e){this.occlusionOn=e,e&&this.forceOcclusionQuery()}get occlusionIntervalFrames(){return this.occlusionInterval}set occlusionIntervalFrames(e){this.occlusionInterval=Math.max(1,e)}get occlusions(){return this.occludedCount}forceOcclusionQuery(){this.lastQueryFrame=Number.NEGATIVE_INFINITY,this.lastQueryPosition=null,this.lastQueryForward=null}get lastDrawnMeshes(){return this.drawnMeshes}get lastVisibleCount(){return this.lastVisible===null?0:this.lastVisible.size}get occlusionBreakdown(){const e=[`simple ${this.lastTimedOut}`,`near ${this.lastNearExempt}`,`seen ${this.lastSaw}`];return this.occludedCount>0&&e.push(`occluded ${this.occludedCount}`),e.join(", ")}get probeDebug(){return this.showProbe}set probeDebug(e){this.showProbe!==e&&(this.showProbe=e,this.syncProbeMaterials())}dispose(){this.meshes.dispose();for(const e of this.superchunks.values()){const n=e.release();n.terrain.dispose(),n.water.dispose()}for(const e of this.geometryPool)e.terrain.dispose(),e.water.dispose();this.geometryPool.length=0,this.geometryPoolBytes=0}}const jD="/big-mesh-studios/voxelscape/spritesheets/spritesheet_tiles.png",WD="/big-mesh-studios/voxelscape/spritesheets/spritesheet_tiles.xml",VD=async(t,e)=>{const n=e?.tileUrl??jD,r=e?.xmlUrl??WD;try{const[s,i]=await Promise.all([WR(n),fetch(r)]);if(!i.ok)throw new Error(`failed to load "${r}": ${i.status}`);const o=ub(await i.text()),a=HR(o,s.width,s.height);if(a===null)throw new Error("[atlas] the sheet's tiles are not one size on a grid, which is the only layout a tile index can name");const l=jR(o,a,e?.customVoxelTiles);t.setTiles(l,s.texture,a)}catch(s){console.warn("[atlas] spritesheet not applied; voxels stay flat blue.",s)}},GD="bms-voxelscape",Ni="edits",YD=()=>new Promise((t,e)=>{const n=indexedDB.open(GD,1);n.onupgradeneeded=()=>{const r=n.result;r.objectStoreNames.contains(Ni)||r.createObjectStore(Ni)},n.onsuccess=()=>t(n.result),n.onerror=()=>e(n.error)}),qD=(t,e)=>new Promise((n,r)=>{const i=t.transaction(Ni,"readonly").objectStore(Ni).get(e);i.onsuccess=()=>n(i.result),i.onerror=()=>r(i.error)}),XD=(t,e,n)=>new Promise((r,s)=>{const i=t.transaction(Ni,"readwrite");i.objectStore(Ni).put(n,e),i.oncomplete=()=>r(),i.onerror=()=>s(i.error)}),ZD=(t,e)=>{const n=`overlay:${e??"default"}`;let r,s,i=!1;const o=()=>(r??=YD(),r),a=async()=>{i=!1;try{const l=t.snapshot();await XD(await o(),n,JSON.stringify(l))}catch(l){console.warn("[edits] failed to persist overlay to IndexedDB.",l)}};return{async load(){try{const l=await qD(await o(),n);if(l!==void 0){const c=JSON.parse(l);for(const{w:u,edit:h}of c)t.set(u,h.id,h.updatedAt)}}catch(l){console.warn("[edits] failed to load overlay from IndexedDB.",l)}return t},scheduleSave(){i=!0,s===void 0&&(s=setTimeout(()=>{s=void 0,i&&a()},250))},async saveNow(){s!==void 0&&(clearTimeout(s),s=void 0),await a()}}},JD=.12,QD=({chunkRadius:t,chunkRadiusY:e=t,terrain:n,customVoxelTiles:r,structures:s,spawn:i,placeUri:o,onInitialDraw:a,createWorker:l})=>{const c=()=>p.radius*rt[0],u=new Wz,h=ZD(u,o??null),d=[],f=new Td(l===void 0?{}:{createWorker:l,count:1});let m;const p=new D3({radius:t,yRadius:e,terrain:n,structures:s,onBlockChanged:(T,A)=>{b.add(T),k.onBlockChanged(T,A);for(const M of d)M(T)},onBlockReposition:(T,A)=>{k.repositionBlock(T,A)},onBlockRelease:T=>m?.(T),editLayer:u,tileRects:()=>k.tileRects,pool:f}),y={blocks:p.blocks};m=T=>{const A=p.blocks[T],M=A.store;if(!M.hasFlowing)return;const{min:P,max:S}=Gs(A.center),O=Date.now();let w=!1;const[R,F,D]=M.voxels;for(let te=0;te<D;te++)for(let H=0;H<F;H++)for(let Q=0;Q<R;Q++){const N=M.get(Q,H,te);if(N===rn||N===Ar||!kt(N))continue;const B=jz(M,A.center,[Q,H,te]),le=u.get(B);(le===void 0||le.id!==N)&&(u.set(B,N,O),w=!0)}for(const{w:te,edit:H}of u.queryRange(P,S)){if(!kt(H.id))continue;const Q=_s(M,A.center,te),N=M.inBounds(Q[0],Q[1],Q[2])?M.get(Q[0],Q[1],Q[2]):_e;N!==H.id&&(N!==_e&&!kt(N)||(kt(N)?u.set(te,N,O):u.set(te,_e,O),w=!0))}w&&h.scheduleSave()};const b=new Set,v=new Set;let x=-1;const k=new HD({blocks:y.blocks,waterExtinction:JD,seaLevel:n.seaLevel,pool:f,onBlockMeshed:T=>{!b.has(T)||v.has(T)||(v.add(T),a?.({drawn:v.size,total:y.blocks.length,spawnDrawn:v.has(x)}))}}),C=()=>{const T=[];for(let A=0;A<y.blocks.length;A++){if(!p.hasTerrain(A))continue;const M=y.blocks[A];u.applyToBlock(M)>0&&T.push(A)}for(const A of T)k.onBlockChanged(A)},E=T=>{if(T.length===0)return 0;const A=Rb(u,T);if(A===0)return 0;const M=new Set;for(const{w:S}of T)for(let O=0;O<y.blocks.length;O++){const{min:w,max:R}=Gs(y.blocks[O].center);S[0]>=w[0]&&S[0]<=R[0]&&S[1]>=w[1]&&S[1]<=R[1]&&S[2]>=w[2]&&S[2]<=R[2]&&M.add(O)}const P=[];for(const S of M){const O=y.blocks[S];u.applyToBlock(O)>0&&P.push(S)}for(const S of P)k.onBlockChanged(S);return h.scheduleSave(),A};return x=p.fillFrom(i[0],i[1],i[2]),VD(k,{customVoxelTiles:r}).then(()=>k.meshNow(x)),h.load().then(C),{blocks:y.blocks,renderer:k,get voxelBytes(){let T=0;for(const A of y.blocks)T+=A.store.data.byteLength+A.light.data.byteLength;return T},get fillPendingCount(){return p.fillPendingCount},get fillInFlightCount(){return p.fillInFlightCount},terrain:k.terrain,water:k.water,underwaterTint:k.underwaterTint,editLayer:u,get ringRadius(){return c()},get chunkRadius(){return p.radius},get chunkRadiusY(){return p.yRadius},get lodBands(){return p.bands},reshape({chunkRadius:T,chunkRadiusY:A,lodBands:M}){const P=T??p.radius,S=A??p.yRadius;k.resizeTo(Cd(P,S)),p.reshape(P,S,M??p.bands)},workerPool:f,reapplyEdits:C,applyEdits:E,heightAt(T,A){const M=YE(p.query,T,A,n);return M===-1/0?Po(T,A,n):M},groundHeightAt(T,A,M){return qE(p.query,T,A,M)},inWaterAt(T,A,M){return ZE(p.query,T,A,M)},lavaAt(T,A,M){return JE(p.query,T,A,M)},solidAt(T,A,M){return XE(p.query,T,A,M)},scrollTo(T,A,M){p.scrollTo(T,A,M)},cellReady(T,A,M){return p.slotAt(T,A,M)!==void 0},scheduleSave(){h.scheduleSave()},onBlockFilled(T){d.push(T)},blockIndexAtVoxel(T){return p.slotAt((T[0]+.5)*bt,(T[1]+.5)*bt,(T[2]+.5)*bt)},dispose(){p.dispose(),k.dispose(),h.saveNow()}}},KD=8900331,e4={moveX:0,moveY:0,jump:!1,jumpHeld:!1,lookDx:0,lookDy:0,primary:!1,click:!1,tap:!1,secondary:!1,secondaryHeld:!1,secondaryReleased:!1,use:!1,select:null,wheel:0},t4=t=>new Blob([t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength)]),n4=({antialias:t=!1,chunkRadius:e=4,chunkRadiusY:n=2,terrain:r=Oi,customVoxelTiles:s,structures:i,place:o,activeProject:a,placeEditorOpen:l,mode:c,placeUri:u=Xh,spawn:h=[0,0,0],debugPerf:d=!1,navigate:f=g=>{window.location.hash=g},onDebugStats:m,onNotice:p,player:y}={})=>{const g=c===void 0||c==="multi"||c==="multi:edit",b=c===void 0||c==="solo:edit"||c==="multi:edit",v=c==="multi:edit"?"everyone":"self",[x,k]=ge(""),[C,E]=ge(null),[T,A]=ge(null),[M,P]=ge(null),[S,O]=ge(null),[w,R]=ge(null),[F,D]=ge(null),[te,H]=ge(!1),[Q,N]=ge({}),[B,le]=ge(d),[oe,X]=ge(!1),ye=()=>({heapBytes:performance.memory?.usedJSHeapSize,voxelBytes:I.voxelBytes,mergedGeometryBytes:I.renderer.mergedGeometryBytes,blockGeometryBytes:I.renderer.blockGeometryBytes,blocks:I.blocks.length,chunkRadius:I.chunkRadius,triangles:I.renderer.triangleCount,fillsPending:I.fillPendingCount,meshesPending:I.renderer.meshPendingCount}),[Le,xe]=ge(t),[Se,Ze]=l??ge(!1);let Ue=u,ft=null;const pt=oL(),_=kO({groundHeightAt:($,L)=>I.heightAt($,L)}),[J,Z]=ge({drawn:0,total:Cd(e,n),spawnDrawn:!1}),I=QD({chunkRadius:e,chunkRadiusY:n,terrain:r,customVoxelTiles:s,structures:i,spawn:h,placeUri:u,onInitialDraw:Z}),z=new ER(50,1,.1,I.ringRadius+200),U=[],se=[],ie=[],j=yL({camera:z,terrain:{heightAt:($,L)=>I.heightAt($,L),groundHeightAt:($,L,Y)=>Math.max(I.groundHeightAt($,L,Y),wL(U,$,L,Y)),inWaterAt:($,L,Y)=>I.inWaterAt($,L,Y),solidAt:($,L,Y)=>I.solidAt($,L,Y)||vL(U,$,L,Y),surfaceVelocityAt:($,L,Y)=>_L(U,$,L,Y),mediumAt:($,L,Y)=>{let ve=0,ot=0,dn=null,Sn=1,fr=0,Qo=!1;for(const Ht of ie)$<Ht.min[0]||$>Ht.max[0]||L<Ht.min[1]||L>Ht.max[1]||Y<Ht.min[2]||Y>Ht.max[2]||(Qo=!0,Ht.kind==="push"?(ve+=Ht.vx,ot+=Ht.vz,Ht.vy!==void 0&&(dn=(dn??0)+Ht.vy)):(Ht.speedScale<Sn&&(Sn=Ht.speedScale),Ht.sink>fr&&(fr=Ht.sink)));return Qo?{pushVx:ve,pushVz:ot,pushVy:dn,speedScale:Sn,sink:fr}:null}},spawn:h,player:y}),fe=j.player.position.y,ae={x:h[0],y:fe,z:h[2],yaw:0},we=()=>{j.player.position.set(ae.x,ae.y,ae.z),j.player.yaw=ae.yaw,j.player.pitch=0,j.player.vx=0,j.player.vy=0,j.player.vz=0,j.player.onGround=!1,j.player.flying=!1,Me.respawn(),dr.event("respawn")},Me=new aI({onFallDone:we});let W=null;const ee=new Set;let K=null;const ke=o===void 0?null:o3(i3(o.seed,o.entry)),Ye=new dm({getFigures:()=>{const $=[];for(const L of K?.npcs()??[]){const Y=K?.npcPose(L.id)??null;$.push(Y===null?L:{id:L.id,x:L.x+Y.dx,y:L.y+Y.dy,z:L.z+Y.dz,yaw:L.yaw+Y.yaw,spin:{axis:Y.spinAxis,angle:Y.spinAngle}})}return $},modelFor:$=>{const L=K?.npc($)??null;return L!==null&&L.modelUri!==""?L.modelUri:L!==null&&L.model!==""?L.model:$==="sable"?"npc-sable.zip":$==="rook"?"npc-rook.zip":"zombie.zip"}}),Ce=new dm({getFigures:()=>{const $=[];for(const L of K?.props()??[]){const Y=K?.propPose(L.id)??null;$.push(Y===null?L:{id:L.id,x:L.x+Y.dx,y:L.y+Y.dy,z:L.z+Y.dz,yaw:L.yaw+Y.yaw,height:L.height,spin:{axis:Y.spinAxis,angle:Y.spinAngle}})}return $},modelFor:$=>K?.prop($)?.model??""}),et=new m3(()=>K?.fires()??[]),mt=new k3(()=>K?.explosions()??[]),it=new c3(I.blocks,$=>I.renderer.onBlocksChanged($)),en=()=>{U.length=0,se.length=0;for(const $ of K?.props()??[]){if(!$.solid&&!$.hazard)continue;const L=Ce.aimBounds($.id);if(L===null)continue;const Y=K?.propPose($.id)??null,ve=$.x+(Y?.dx??0),ot=$.y+(Y?.dy??0),dn=$.z+(Y?.dz??0),Sn={minX:ve-L.half,maxX:ve+L.half,minY:ot,maxY:ot+L.height,minZ:dn-L.half,maxZ:dn+L.half,...Y!==null?{yaw:$.yaw+Y.yaw,vx:Y.vx,vy:Y.vy,vz:Y.vz}:$.conveyor!==void 0?{vx:$.conveyor.vx,vz:$.conveyor.vz}:{}};$.solid&&U.push(Sn),$.hazard&&se.push({id:$.id,box:Sn})}},tn=()=>{ie.length=0;for(const $ of K?.fields()??[])ie.push($)},Be=()=>{const $=j.player.position,L=j.player.config.halfSize,Y=new Set;for(const{id:ve,box:ot}of se)$.x+L>=ot.minX&&$.x-L<=ot.maxX&&$.y+L>=ot.minY&&$.y-L<=ot.maxY&&$.z+L>=ot.minZ&&$.z-L<=ot.maxZ&&(Y.add(ve),ee.has(ve)||K?.touched(ve));ee.clear();for(const ve of Y)ee.add(ve)},Pe=()=>{const $=[];for(const L of K?.npcs()??[]){const Y=Ye.aimBounds(L.id);$.push({id:L.id,x:L.x,y:L.y,z:L.z,half:Y?.half,height:Y?.height,yaw:L.yaw})}return $},at=async $=>{for(const[L,Y]of Object.entries($))try{const ve=await gl(t4(Y));Ye.setFigure(L,ve),Ce.setFigure(L,ve)}catch(ve){p?.(`model "${L}" did not load — ${ve instanceof Error?ve.message:String(ve)}`)}},gt=new NL,tt=new DL({camera:z}),On=new KL({blocks:I.blocks,resolve:$=>I.blockIndexAtVoxel($),onBlocksEdited:$=>I.renderer.onBlocksChanged($)});I.onBlockFilled($=>On.wakeBlock($));const Yt=new LL({blocks:I.blocks,layer:I.editLayer,inventory:gt,onBlocksEdited:$=>I.renderer.onBlocksChanged($),onEditRecorded:()=>I.scheduleSave(),onEdit:($,L,Y)=>$t.broadcastEdits([{x:$[0],y:$[1],z:$[2],id:L,ts:Y}]),onVoxelWritten:($,L)=>On.wakeVoxel($,L),getLook:()=>j.look(),getPlayerVoxels:()=>j.occupiedVoxels(),terrain:r}),De=()=>{Yt.setEnabled(b&&(v!=="everyone"||Je.did!==null))},lt={editing:Yt,look:()=>j.look(),position:()=>j.player.position,strikeables:()=>Pe(),strike:($,L,Y,ve)=>{Ye.flashHit($),K?.hit($,L,Y,ve)},setGuarding:$=>Me.setGuarding($)},Re=Object.fromEntries(Br.map($=>[$,tr[$].tool(lt)]));let qe=null;const ct=$=>{$!==qe&&(qe!==null&&Re[qe].stow(),qe=$)},Je=new bP({layer:I.editLayer,seed:r.seed,place:u,editScope:v,getHandle:()=>"",onMerged:$=>{$>0&&(I.reapplyEdits(),I.scheduleSave())},onConnected:$=>{g&&$t.start(),De(),Je.sync(),Je.resolvePicture($).then(async L=>{L!==null&&j.setPicture(await createImageBitmap(L))}).catch(()=>{})},onSignedOut:()=>{$t.stop(),De()}});De(),Je.sync();const $t=new T$({getRepoClient:()=>Je.repoClient,getDid:()=>Je.did,seed:r.seed,scope:u,getPose:()=>({x:j.player.position.x,y:j.player.position.y,z:j.player.position.z,yaw:j.player.yaw,pitch:j.player.pitch}),resolveHandle:$=>Je.resolveHandle($),resolvePicture:$=>Je.resolvePicture($),createSignaling:tL,camera:z,onRemoteEdits:($,L)=>{I.applyEdits(L.map(Y=>({w:[Y.x,Y.y,Y.z],edit:{id:Y.id,updatedAt:Y.ts}})))},onRemoteScriptEntities:($,L)=>{for(const Y of L)K?.applyRemoteNpc(Y.id,Y.x,Y.y,Y.z,Y.yaw)},onRemoteScriptEvents:($,L)=>{K?.applyRemoteEvents(L)},onRemotePlayerDamage:($,L)=>{L.target===(Je.did??"")&&uc(L.amount,"remote-script")}}),Tt=vP(),cn=4e3,xn=new Set,un=new Set,hr=new Map,kn=$=>{if($===""||xn.has($)||un.has($))return;const L=hr.get($);L!==void 0&&Date.now()-L<cn||(un.add($),(async()=>{try{const Y=await Tt.byUri($);await Ye.loadModel($,await Tt.file(Y)),xn.add($),hr.delete($)}catch(Y){hr.set($,Date.now()),p?.(`model "${$}" did not load — ${Y instanceof Error?Y.message:String(Y)}`)}finally{un.delete($)}})())},Go=Gy(),hn=qk({getClient:()=>Je.repoClient,getRepo:()=>Je.did});let ji=null,Yo=-1;const Jv=()=>{const $=K?.cutsceneFor("")??null;if($===null)return;if($.startMs!==Yo){Yo=$.startMs;const Y=z.getWorldDirection(new wt);ji={x:z.position.x,y:z.position.y,z:z.position.z,lookX:z.position.x+Y.x,lookY:z.position.y+Y.y,lookZ:z.position.z+Y.z},H(!0)}if(ji===null)return;const L=s3($,K?.now()??Date.now(),ji);z.position.set(L.x,L.y,L.z),z.lookAt(L.lookX,L.lookY,L.lookZ),L.done&&(K?.clearCutscene(""),Yo=-1,ji=null,H(!1),j.place())},Wd=()=>{R(null),P(null),H(!1),Yo=-1,ji=null,ae.x=h[0],ae.y=fe,ae.z=h[2],ae.yaw=0,W=null,ee.clear(),j.player.position.set(h[0],fe,h[2]),j.player.vx=0,j.player.vy=0,j.player.vz=0,j.player.onGround=!1,j.player.flying=!1,Me.respawn(),it.clear(),K?.restart()},$n=async()=>{if(K===null){const{ScriptConsole:$}=await xr(async()=>{const{ScriptConsole:L}=await import("./script-console-MzsPYNND.js");return{ScriptConsole:L}},[]);K=new $({heightAt:(L,Y)=>I.heightAt(L,Y),solidAt:(L,Y,ve)=>I.solidAt(L,Y,ve),waterAt:(L,Y,ve)=>I.inWaterAt(L,Y,ve),getPlayers:()=>[{did:Je.did??"",x:j.player.position.x,y:j.player.position.y,z:j.player.position.z},...$t.peerPositions()],now:()=>$t.now(),report:L=>p?.(L),onDialog:(L,Y)=>{L===""&&P(Y)},onEnding:(L,Y)=>{L===""&&(R(Y),Y!==null&&ke?.record(Y.title))},onRestart:()=>Wd(),onTime:L=>{L.clear===!0&&_.dayNight.clearOverride(),L.seconds!==void 0&&_.dayNight.jumpTo(L.seconds),L.speed!==void 0&&_.dayNight.setSpeed(L.speed)},onNarrate:(L,Y)=>D(Y),onPlayerPlace:(L,Y)=>{L!==""&&L!==(Je.did??"")||(j.player.position.set(Y.x,Y.y===void 0?j.player.position.y:Y.y+j.player.config.halfSize,Y.z),Y.yaw!==void 0&&(j.player.yaw=Y.yaw),j.player.vx=0,j.player.vy=0,j.player.vz=0,j.player.onGround=!1,j.place())},onPlayerFace:(L,Y)=>{L!==""&&L!==(Je.did??"")||(j.player.yaw=Math.atan2(Y.x-j.player.position.x,Y.z-j.player.position.z),j.place())},onPlayerSpeed:(L,Y)=>{L!==""&&L!==(Je.did??"")||(j.player.config.speed=Rl.speed*Y)},onPlayerJump:(L,Y)=>{L!==""&&L!==(Je.did??"")||(j.player.config.jumpSpeed=Rl.jumpSpeed*Y)},onPlayerDamage:(L,Y,ve)=>{L===""||L===(Je.did??"")?uc(Y,"script",ve):$t.broadcastPlayerDamage({target:L,amount:Y})},onEntityMove:L=>{$t.broadcastScriptEntities([L])},onEvent:L=>{$t.broadcastScriptEvents([L])},onCheckpoint:(L,Y)=>{L===""&&(ae.x=Y.x,ae.z=Y.z,Y.y!==void 0&&(ae.y=Y.y+j.player.config.halfSize),Y.yaw!==void 0&&(ae.yaw=Y.yaw))},onKill:L=>{L===""&&Me.kill()},onRespawn:L=>{L===""&&we()},onVoid:L=>{W=L},onFire:L=>{it.seed(L)},endings:()=>ke?.seen()??[]})}return K};o!==void 0&&(at(o.models??{}),$n().then($=>$.loadProject(o.files,o.entry,o.seed,o.models??{})).then($=>p?.($)).catch($=>p?.(`place script did not load — ${$ instanceof Error?$.message:String($)}`)));const Vd=$=>{$n().then(L=>L.talkTo($)).catch(()=>{})},Qv=$=>{const L=K?.heldItem()?.id??"";$n().then(Y=>Y.use($,L)).catch(()=>{})},Kv=$=>{$n().then(L=>L.useItem($)).catch(()=>{})},ew=$=>{M()!==null&&$n().then(L=>L.chooseOption($)).catch(()=>{})},tw=()=>{M()!==null&&$n().then($=>$.leaveTalk()).catch(()=>{})},nw={demo:()=>$n().then($=>$.loadSample()),state:()=>$n().then($=>$.describe()),talk:$=>$n().then(L=>L.talk($)),choose:$=>$n().then(L=>L.choose($)),leave:()=>$n().then($=>$.leave())};(async()=>{for(const $ of["npc-sable.zip","npc-rook.zip","zombie.zip"])try{const L=await fetch(`/big-mesh-studios/voxelscape/models/${$}`);L.ok&&Ye.setFigure($,await gl(await L.blob()))}catch{}})();let Gd;const Yd=new Map,qo=Re.bucket,lc=$=>{const L=$===null?Gd:Yd.get($);L!==void 0&&(tt.setModel("bucket",L.model),N(Y=>({...Y,bucket:L.bbox})))};qo.onFillChange=()=>lc(qo.fill);for(const $ of Br){const L=tr[$].sprite;L!==null&&Jp(L).then(({model:Y,bbox:ve})=>{$==="bucket"&&(Gd={model:Y,bbox:ve},lc(qo.fill)),tt.setModel($,Y),N(ot=>({...ot,[$]:ve}))}).catch(Y=>console.warn(`[${$}] not drawn; the player holds nothing.`,Y))}for(const $ of["water","lava"])Jp(`bucket_${$}`).then(({model:L,bbox:Y})=>{Yd.set($,{model:L,bbox:Y}),lc(qo.fill)}).catch(L=>console.warn(`[bucket_${$}] not drawn; the fill shows empty.`,L));const cc=new ob;cc.add(_.sky,I.terrain,j.body,$t.avatars,Ye.group,Ce.group,et.group,mt.group,I.water,_.weatherEffects,I.underwaterTint,z),Je.init().then($=>p?.($));const Xo=new jv;let Zo;const dr=new NI(pe,{setup:()=>({href:window.location.href,userAgent:navigator.userAgent,cores:navigator.hardwareConcurrency,devicePixelRatio:window.devicePixelRatio,viewport:Zo&&{width:Zo.width,height:Zo.height},terrain:r,window:{chunkRadius:I.chunkRadius,chunkRadiusY:I.chunkRadiusY,lodBands:I.lodBands},render:{multisampling:Le(),resolution:Xo.describe()},workers:I.workerPool.describe(),clock:_.dayNight.describe(),spawn:h}),pose:()=>{const $=j.player.position,L=z.getWorldDirection(new wt);return{position:[$.x,$.y,$.z],facing:[L.x,L.y,L.z]}}}),uc=($,L,Y)=>{const ve=Me.takeDamage($);if(ve===0)return;const ot=Y===void 0?null:K?.npc(Y)??null;dr.event(Me.dead?"death":"damage",{cause:L,amount:ve,hp:Me.hp,attacker:ot===null?void 0:{id:Y,position:[ot.x,ot.y,ot.z]}})},rw={open:Se,setOpen:Ze,get accountDid(){return Je.did},resolveHandle:$=>Je.resolveHandle($),get isMine(){const $=Ls(Ue);return $!==null&&$.repo===Je.did},get owner(){return Ls(Ue)?.repo??null},activeProject:a??null,defaultSeed:r.seed,places:Go,publisher:hn,models:Tt,runScript:($,L,Y,ve)=>(ve!==void 0&&at(ve),$n().then(ot=>ot.loadProject($,L,Y,ve??{}))),async claim($){Ue=$;const L=Ls($);if(L===null)return;const Y=await Je.resolveHandle(L.repo);f(`/${Y}/${L.rkey}`)}},sw=B3({renderer:I.renderer,workerPool:I.workerPool,world:I,dayNight:_.dayNight,weather:_.weather,sound:_.sound,atproto:Je,multiplayer:$t,health:Me,places:Go,placePublisher:hn,defaultSeed:r.seed,placeUri:u,navigate:f,togglePlaceEditor:()=>{const $=!Se();return Ze($),$?"place editor opened — write your place's scripts, run them, then publish":"place editor closed"},script:nw,resolution:Xo,setView:$=>(j.setFirstPerson($==="first"),`camera: ${$}-person view`),setPlayerVisible:$=>(j.setCubeVisible($),$?"player cube shown":"player cube hidden"),setMoveSpeed:$=>($!==void 0&&(j.player.config.speed=$),`move speed: ${j.player.config.speed} units/sec`),setLookSensitivity:$=>($!==void 0&&(j.player.config.lookSensitivity=$),`look sensitivity: ${j.player.config.lookSensitivity} rad/px`),setFlying:$=>{const L=$??!j.player.flying;return j.player.flying=L,L&&(j.player.vy=0,j.player.onGround=!1),L?"flying":"walking"},setNoClip:$=>{const L=$??!j.player.noclip;return j.player.noclip=L,L&&(j.player.vy=0,j.player.onGround=!1),L?"no-clip":"collisions on"},setDebugPerf:$=>"performance readout unavailable in this build",traceStart:$=>{if(dr.recording)return"a walk is already being traced; /trace:stop writes it";const L=dr.start($);return[`tracing "${$}"`,FI(L),"/trace:mark what you see, /trace:stop to write it"].join(`
`)},traceMark:$=>dr.recording?(dr.mark($),`marked ${dr.marked}: ${$||"(no note)"}`):"nothing is being traced; /trace:start first",traceSnap:async $=>{const L=await dr.snap($);return Xd(L,`snapped "${$||"(no note)"}"`)},traceStop:async()=>{const $=await dr.stop();if($===void 0)return"nothing is being traced";const L=`traced ${$.seconds.toFixed(0)}s, ${$.marks.length} mark${$.marks.length===1?"":"s"}, ${$.events.length} logged event${$.events.length===1?"":"s"}`;return Xd($,L)},setShowStats:$=>{const L=$??!oe();return X(L),L?"stats shown":"stats hidden"},setMultisampling:$=>{const L=$??!Le();return L===Le()?`multisampling is already ${L?"on":"off"}`:(xe(L),L?"multisampling on — remaking the canvas":"multisampling off — remaking the canvas")}}),qd=new Qt(KD);let Jo=null,hc=0;const iw=1,ow=()=>{if(!pe.armed)return;const $=I.renderer;pe.gauge(Mt.uploadBytes,$.lastTickUploadBytes),pe.gauge(Mt.merges,$.lastTickMerges),pe.gauge(Mt.triangles,$.triangleCount),pe.gauge(Mt.occluded,$.occlusions),pe.gauge(Mt.visible,$.lastVisibleCount),pe.gauge(Mt.drawnMeshes,$.lastDrawnMeshes),pe.gauge(Mt.meshPending,$.meshPendingCount),pe.gauge(Mt.meshInFlight,$.meshInFlightCount),pe.gauge(Mt.dirtySuperchunks,$.dirtySuperchunkCount),pe.gauge(Mt.fillPending,I.fillPendingCount),pe.gauge(Mt.fillInFlight,I.fillInFlightCount);const L=I.voxelBytes,Y=$.mergedGeometryBytes,ve=$.blockGeometryBytes;pe.gauge(Mt.voxelBytes,L),pe.gauge(Mt.mergedGeometryBytes,Y),pe.gauge(Mt.blockGeometryBytes,ve),pe.gauge(Mt.residentBytes,L+Y+ve);const ot=j.player.position;pe.gauge(Mt.cellReady,I.cellReady(ot.x,ot.y,ot.z)?1:0),pe.gauge(Mt.playerX,ot.x),pe.gauge(Mt.playerY,ot.y),pe.gauge(Mt.playerZ,ot.z)},aw=$=>{const L=J();if(L.drawn<L.total&&Xo.hold(),L.spawnDrawn,L.spawnDrawn&&!Se()&&I.cellReady(j.player.position.x,j.player.position.y,j.player.position.z)){if(Me.tick($),Me.dead)j.placeDeath(Me.fallProgress),ct(null),E(null),tt.show(null,null);else{pe.begin(Qe.player);const ve=pt.consume(),ot=K?.controlsLocked("")??!1;if(en(),tn(),j.move($,ot?e4:ve),Be(),pe.end(Qe.player),ot)E(null),A(null),ct(null),tt.show(null,null);else{ve.select!==null&&gt.selectSlot(ve.select),ve.wheel!==0&&gt.selectStep(ve.wheel),ct(gt.selectedId);const Sn=Re[gt.selectedId],fr=j.look(),Qo=[fr.origin[0],fr.origin[1],fr.origin[2]],Ht=[fr.direction[0],fr.direction[1],fr.direction[2]],Zd=Pe();for(const jt of K?.props()??[]){const Qd=Ce.aimBounds(jt.id);Zd.push({id:jt.id,x:jt.x,y:jt.y,z:jt.z,half:Qd?.half,height:Qd?.height})}const En=Bb(Qo,Ht,Zd),Ko=En===null?null:K?.npc(En.id)??null,cw=En===null?null:K?.prop(En.id)??null,dc=K?.heldItem()!==null,Jd=En===null?null:`${En.id}:${dc}`;Jd!==ft&&(ft=Jd,A(En===null?null:Ko!==null&&!dc?{id:En.id,name:Ko.name,action:"talk"}:{id:En.id,name:Ko?.name??cw?.name??En.id,action:"use"}));const Es=Sn.pick();E(Es.primary);const fc=M()===null&&En!==null&&(ve.use||(ve.tap||ve.click)&&Es.primary?.kind!=="actor");if(fc)Ko!==null&&!dc?Vd(En.id):Qv(En.id);else if(ve.use||ve.tap&&Es.primary?.kind!=="actor"){const jt=K?.heldItem()??null;jt!==null&&Kv(jt.id)}if(ve.primary&&!fc){const jt=Sn.primary(Es);jt!==null&&k(jt)}if(!fc&&ve.tap&&Es.primary?.kind==="actor"){const jt=Sn.primary(Es);jt!==null&&k(jt)}if(ve.secondary){const jt=Sn.secondary(Es);jt!==null&&k(jt)}Sn.update($,ve),tt.show(j.firstPerson?gt.selectedId:null,Sn.pose())}pe.begin(Qe.scroll),I.scrollTo(j.player.position.x,j.player.position.y,j.player.position.z),pe.end(Qe.scroll),j.place(),Jv();const dn=j.player.position;hc-=$,(I.lavaAt(dn.x,dn.y,dn.z)||I.lavaAt(dn.x,dn.y+1.5,dn.z))&&hc<=0&&(uc(iw,"lava"),hc=.5),W!==null&&j.player.position.y-j.player.config.halfSize<W&&(Me.kill(),K?.died("void"))}pe.begin(Qe.flow),On.tick($),pe.end(Qe.flow),pe.begin(Qe.multiplayer),$t.tick($),pe.end(Qe.multiplayer),pe.begin(Qe.figures);for(const ve of K?.npcs()??[])kn(ve.modelUri);Ye.tick($),Ce.tick($),et.tick($),mt.tick($),pe.end(Qe.figures),O(K?.heldItem()??null),K?.updatePosition(j.player.position.x,j.player.position.y,j.player.position.z),K?.pump()}pe.begin(Qe.environment);const Y=_.tick($,z);qd.set(Y.skyColor[0],Y.skyColor[1],Y.skyColor[2]),I.renderer.applyLighting(Y),Ye.applyLighting(Y),Ce.applyLighting(Y),tt.applyLighting(Y),pe.end(Qe.environment),pe.begin(Qe.rendererTick),I.renderer.tick($,z),pe.end(Qe.rendererTick),ow()},Xd=async($,L)=>{try{const Y=await fetch("/__walktrace",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify($)});if(!Y.ok)return`${L}, but the server refused it (${Y.status})`;const{path:ve}=await Y.json();return`${L} — written to ${ve}`}catch{return`${L}, but there is no development server to write it to`}},lw=$=>{Zo=$;const L=WL({canvas:$,scene:cc,camera:z,antialias:Le(),debugPerf:B,resolution:Xo,onDebugStats:m,onFrame:aw,clearColor:()=>qd,beforeRender:(Y,ve)=>I.renderer.occlusionFrame(Y,ve),afterRender:Y=>dr.takePicture(Y),describeStats:()=>`tris: ${I.renderer.triangleCount.toLocaleString()} | uploaded: ${I.renderer.lastTickUploadBytes.toLocaleString()} B | occluded: ${I.renderer.occlusions}`});return Jo=()=>{Jo=null,L.dispose()},Jo};return{scene:cc,camera:z,player:j.player,input:pt,inventory:gt,health:Me,commands:sw,placeEditor:rw,debugPerf:B,showStats:oe,stats:ye,editStatus:x,target:C,npcAim:T,dialog:M,scriptItem:S,ending:w,narration:F,dismissNarration:()=>D(null),cutscene:te,hud:()=>K?.hud()??[],restart:Wd,talkTo:Vd,choose:ew,leaveDialog:tw,icons:Q,loading:J,multisampling:Le,mount:lw,dispose(){Jo?.(),K?.dispose(),K=null,I.dispose(),$t.dispose(),Je.dispose(),_.dispose(),Ye.clear(),Ce.clear(),et.clear(),mt.clear(),tt.dispose(),pt.dispose()}}};var r4=de("<div>"),s4=de("<div><!><!><!><!><!><!><!><!>"),i4=de("<canvas>"),o4=de("<div role=dialog aria-label=ending><div><h1></h1><p></p><button>Play again"),a4=de("<div><div>");const Mg=6,l4="bigmesh.eurosky.social",c4="home",Zv=Bl(),u4=t=>{const[e,n]=ge(null),r=ge(!1),s=RC({onCommand:i=>e()?.commands.run(i)??"the world is still loading — try again in a moment",commands:()=>e()?.commands.help()??[]});return re(Zv,{value:{terminal:s,setCurrentVoxelscape:n,placeEditorOpen:r},get children(){return[Zt(()=>t.children),re(Ne,{get when(){return e()},children:i=>re(zC,{terminal:s,voxelscape:i})})]}})},h4=t=>{let e;const n=Kl("(any-pointer: coarse)"),r=RI(),s=n4({terrain:t.launch.terrain,spawn:t.launch.spawn,structures:t.launch.structures,place:t.launch.place,activeProject:t.launch.project,placeEditorOpen:t.placeEditorOpen,mode:t.launch.mode,placeUri:t.launch.placeUri,chunkRadius:g4(),antialias:m4(),navigate:t.navigate,onDebugStats:i=>{e!==void 0&&(e.textContent=i)},onNotice:i=>{t.terminal.print(i),r.show(()=>i,Mg*1e3)}});return Xr(()=>{t.setCurrent(s)}),Xr(()=>{t.launch.notice!==void 0&&r.show(()=>t.launch.notice,Mg*1e3)}),bn(s.dispose),re(F0,{value:s,get children(){var i=s4(),o=i.firstChild,a=o.nextSibling,l=a.nextSibling,c=l.nextSibling,u=c.nextSibling,h=u.nextSibling,d=h.nextSibling,f=d.nextSibling;return ne(i,re(on,{get each(){return[s.multisampling()]},children:()=>re(d4,{})}),o),ne(i,re(Ne,{get when(){return n()},get children(){return re(SA,{})}}),a),ne(i,re(eI,{}),l),ne(i,re(dI,{}),c),ne(i,re(sM,{}),u),ne(i,re(f4,{}),h),ne(i,re(OI,{}),d),ne(i,re(r.Stack,{get children(){return[re(Ne,{get when(){return s.showStats()},get children(){return re(Sl,{get children(){return re(wI,{})}})}}),re(Ne,{get when(){return s.debugPerf()},get children(){return re(Sl,{get children(){var m=r4();return Zn(()=>p=>{e=p},m),he(()=>br["debug-perf"],(p,y)=>{q(m,p,y)}),m}})}}),re($I,{})]}}),f),he(()=>br.container,(m,p)=>{q(i,m,p)}),i}})},d4=()=>{const t=cr();let e;Xr(()=>t.mount(e));var n=i4();return Zn(()=>r=>{e=r},n),o_(n,d_({get class(){return br.canvas}},()=>t.input.canvasHandlers)),n},f4=()=>{const t=cr();return re(Ne,{get when(){return t.ending()!==null},get children(){var e=o4(),n=e.firstChild,r=n.firstChild,s=r.nextSibling,i=s.nextSibling;return ne(r,()=>t.ending().title),ne(s,()=>t.ending().text),i.$$click=()=>t.restart(),he(()=>({e:br.ending,t:br["ending-panel"],a:br["ending-title"],o:br["ending-text"],i:br["ending-button"]}),({e:o,t:a,a:l,o:c,i:u},h)=>{q(e,o,h?.e),q(n,a,h?.t),q(r,l,h?.a),q(s,c,h?.o),q(i,u,h?.i)}),e}})},p4=t=>(()=>{var e=a4(),n=e.firstChild;return ne(n,()=>t.line),he(()=>({e:br.container,t:br.joining}),({e:r,t:s},i)=>{q(e,r,i?.e),q(n,s,i?.t)}),e})(),m4=()=>{const t=new URLSearchParams(window.location.search).get("antialias");if(t!==null)return t!=="0"&&t!=="false"},g4=()=>{const t=new URLSearchParams(window.location.search).get("radius");if(t===null)return;const e=Number(t);return Number.isInteger(e)&&e>=1&&e<=8?e:void 0},Eu=()=>{const{terminal:t,setCurrentVoxelscape:e,placeEditorOpen:n}=Ul(Zv),[r,s]=ge(null),[i,o]=ge("joining world…"),a=Gy(),l=z_(),c=I_(),[u,h]=ge(0),d=m=>{h(p=>p+1),c(m)},f=async(m,p,y)=>{const g=m.manifest.scripts?.[0];if(g===void 0)return{terrain:{...Oi,seed:m.manifest.seed},spawn:m.manifest.spawn,project:m,mode:m.manifest.mode,placeUri:y,notice:`${p} names no scripts — playing its terrain`};let b,v="";try{b=await hA({files:m.scripts,entry:g,models:m.models,seed:m.manifest.seed,region:KE(m.manifest.spawn)}),v=` · ${b.length} structure shape(s)`}catch(x){v=` · its plan did not compile (${x instanceof Error?x.message:String(x)})`}return{terrain:{...Oi,seed:m.manifest.seed},spawn:m.manifest.spawn,structures:b,place:{files:m.scripts,entry:g,seed:m.manifest.seed,models:m.models},project:m,mode:m.manifest.mode,placeUri:y,notice:`${p}${v}`}};return or(()=>({demoId:l.id,handle:l.handle,worldName:l.worldName,generation:u()}),({demoId:m,handle:p,worldName:y})=>{let g=!0;return s(null),o("joining world…"),(async()=>{if(m!==void 0){const x=Xu(m);if(x===null){g&&s({notice:`there is no demo "${m}" — /place:demos lists them`});return}g&&o(`opening "${x.manifest.name}"…`);try{const k=await f(await Yy(x),`playing the demo "${x.manifest.name}"`,`${Xh}#/demos/${x.id}`);g&&s(k)}catch(k){const C=k instanceof Error?k.message:String(k);g&&(o(`could not open the demo — ${C}`),s({notice:`could not open the demo (${C})`}))}return}const[b,v]=p===void 0||y===void 0?[l4,c4]:[p,y];g&&o(`joining ${b}/${v}…`);try{const x=await a.find(b,v);g&&o("opening the place's scripts…");const k=await f(await Zh(await a.file(x)),`joined "${x.record.name}" — playing its world`,Wy(x.repo,x.rkey));g&&s(k)}catch(x){const k=x instanceof Error?x.message:String(x);g&&(o(`could not join — ${k}`),s({notice:p===void 0||y===void 0?`could not load the default world (${k}) — playing a procedural one instead`:`could not join ${p}/${y} (${k}) — playing this world instead`}))}})(),()=>{g=!1}}),re(on,{get each(){return Zt(()=>!!r())()?[r()]:[]},get fallback(){return re(p4,{get line(){return i()}})},children:m=>re(h4,{launch:m,navigate:d,terminal:t,setCurrent:e,placeEditorOpen:n})})};Ir(["click"]);const y4=[{path:"/",component:Eu},{path:"/demos/:id",component:Eu},{path:"/:handle/:worldName",component:Eu}],b4=K_({routes:y4,history:X_()}),v4="_status_od5f2_1",w4={status:v4};var _4=de("<output>");const x4=500,k4=()=>{const[t,e]=ge("finishing sign-in…"),n=Bt(Ob);or(n,s=>{e("signed in — closing…"),window.close(),setTimeout(()=>e(`signed in as ${s} — you can close this window`),x4)});var r=_4();return ne(r,t),he(()=>w4.status,(s,i)=>{q(r,s,i)}),r};if(window.location.hostname==="localhost"){const t=new URL(window.location.href);t.hostname="127.0.0.1",window.location.replace(t.href)}else{const t=Pb();p_(()=>t?re(k4,{}):re(b4,{children:e=>re(u4,{get children(){return e.children}})}),document.getElementById("root"))}const S4=Object.freeze(Object.defineProperty({__proto__:null,QuickJSModuleCallbacks:A0,QuickJSWASMModule:Q2,applyBaseRuntimeOptions:T0,applyModuleEvalRuntimeOptions:C0},Symbol.toStringTag,{value:"Module"})),Au=Object.freeze(Object.defineProperty({__proto__:null},Symbol.toStringTag,{value:"Module"}));export{ne as A,de as B,Ul as C,Bl as D,s_ as E,on as F,he as G,ut as H,q as I,Rt as J,Zt as K,p_ as L,Zr as M,Xr as N,or as O,Zn as P,$4 as Q,C4 as R,Ne as S,k2 as T,O4 as U,me as V,Ae as a,R_ as b,Ll as c,A4 as d,Sr as e,Fs as f,At as g,ge as h,nf as i,T4 as j,xs as k,j_ as l,z4 as m,f_ as n,bn as o,Mo as p,M4 as q,I4 as r,zn as s,R4 as t,sy as u,B4 as v,DE as w,R2 as x,Bt as y,re as z};
