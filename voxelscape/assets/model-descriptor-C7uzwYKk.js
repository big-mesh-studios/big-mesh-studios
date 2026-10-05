import{i as e,r as t,t as n}from"./rolldown-runtime-Dd_uD5pT.js";var r=Uint8Array,i=Uint16Array,a=Int32Array,o=new r([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),s=new r([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),c=new r([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),l=function(e,t){for(var n=new i(31),r=0;r<31;++r)n[r]=t+=1<<e[r-1];for(var o=new a(n[30]),r=1;r<30;++r)for(var s=n[r];s<n[r+1];++s)o[s]=s-n[r]<<5|r;return{b:n,r:o}},u=l(o,2),d=u.b,f=u.r;d[28]=258,f[258]=28;for(var p=l(s,0),m=p.b,h=p.r,g=new i(32768),_=0;_<32768;++_){var v=(_&43690)>>1|(_&21845)<<1;v=(v&52428)>>2|(v&13107)<<2,v=(v&61680)>>4|(v&3855)<<4,g[_]=((v&65280)>>8|(v&255)<<8)>>1}for(var y=(function(e,t,n){for(var r=e.length,a=0,o=new i(t);a<r;++a)e[a]&&++o[e[a]-1];var s=new i(t);for(a=1;a<t;++a)s[a]=s[a-1]+o[a-1]<<1;var c;if(n){c=new i(1<<t);var l=15-t;for(a=0;a<r;++a)if(e[a])for(var u=a<<4|e[a],d=t-e[a],f=s[e[a]-1]++<<d,p=f|(1<<d)-1;f<=p;++f)c[g[f]>>l]=u}else for(c=new i(r),a=0;a<r;++a)e[a]&&(c[a]=g[s[e[a]-1]++]>>15-e[a]);return c}),b=new r(288),_=0;_<144;++_)b[_]=8;for(var _=144;_<256;++_)b[_]=9;for(var _=256;_<280;++_)b[_]=7;for(var _=280;_<288;++_)b[_]=8;for(var x=new r(32),_=0;_<32;++_)x[_]=5;var S=y(b,9,0),C=y(b,9,1),w=y(x,5,0),T=y(x,5,1),E=function(e){for(var t=e[0],n=1;n<e.length;++n)e[n]>t&&(t=e[n]);return t},D=function(e,t,n){var r=t/8|0;return(e[r]|e[r+1]<<8)>>(t&7)&n},O=function(e,t){var n=t/8|0;return(e[n]|e[n+1]<<8|e[n+2]<<16)>>(t&7)},k=function(e){return(e+7)/8|0},A=function(e,t,n){return(t==null||t<0)&&(t=0),(n==null||n>e.length)&&(n=e.length),new r(e.subarray(t,n))},j=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],M=function(e,t,n){var r=Error(t||j[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,M),!n)throw r;return r},N=function(e,t,n,i){var a=e.length,l=i?i.length:0;if(!a||t.f&&!t.l)return n||new r(0);var u=!n,f=u||t.i!=2,p=t.i;u&&(n=new r(a*3));var h=function(e){var t=n.length;if(e>t){var i=new r(Math.max(t*2,e));i.set(n),n=i}},g=t.f||0,_=t.p||0,v=t.b||0,b=t.l,x=t.d,S=t.m,w=t.n,j=a*8;do{if(!b){g=D(e,_,1);var N=D(e,_+1,3);if(_+=3,!N){var P=k(_)+4,F=e[P-4]|e[P-3]<<8,I=P+F;if(I>a){p&&M(0);break}f&&h(v+F),n.set(e.subarray(P,I),v),t.b=v+=F,t.p=_=I*8,t.f=g;continue}if(N==1)b=C,x=T,S=9,w=5;else if(N==2){var L=D(e,_,31)+257,R=D(e,_+10,15)+4,z=L+D(e,_+5,31)+1;_+=14;for(var B=new r(z),V=new r(19),H=0;H<R;++H)V[c[H]]=D(e,_+H*3,7);_+=R*3;for(var U=E(V),ee=(1<<U)-1,W=y(V,U,1),H=0;H<z;){var G=W[D(e,_,ee)];_+=G&15;var P=G>>4;if(P<16)B[H++]=P;else{var K=0,te=0;for(P==16?(te=3+D(e,_,3),_+=2,K=B[H-1]):P==17?(te=3+D(e,_,7),_+=3):P==18&&(te=11+D(e,_,127),_+=7);te--;)B[H++]=K}}var q=B.subarray(0,L),J=B.subarray(L);S=E(q),w=E(J),b=y(q,S,1),x=y(J,w,1)}else M(1);if(_>j){p&&M(0);break}}f&&h(v+131072);for(var ne=(1<<S)-1,re=(1<<w)-1,Y=_;;Y=_){var K=b[O(e,_)&ne],ie=K>>4;if(_+=K&15,_>j){p&&M(0);break}if(K||M(2),ie<256)n[v++]=ie;else if(ie==256){Y=_,b=null;break}else{var ae=ie-254;if(ie>264){var H=ie-257,oe=o[H];ae=D(e,_,(1<<oe)-1)+d[H],_+=oe}var se=x[O(e,_)&re],ce=se>>4;se||M(3),_+=se&15;var J=m[ce];if(ce>3){var oe=s[ce];J+=O(e,_)&(1<<oe)-1,_+=oe}if(_>j){p&&M(0);break}f&&h(v+131072);var le=v+ae;if(v<J){var ue=l-J,de=Math.min(J,le);for(ue+v<0&&M(3);v<de;++v)n[v]=i[ue+v]}for(;v<le;++v)n[v]=n[v-J]}}t.l=b,t.p=Y,t.b=v,t.f=g,b&&(g=1,t.m=S,t.d=x,t.n=w)}while(!g);return v!=n.length&&u?A(n,0,v):n.subarray(0,v)},P=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8},F=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8,e[r+2]|=n>>16},I=function(e,t){for(var n=[],a=0;a<e.length;++a)e[a]&&n.push({s:a,f:e[a]});var o=n.length,s=n.slice();if(!o)return{t:U,l:0};if(o==1){var c=new r(n[0].s+1);return c[n[0].s]=1,{t:c,l:1}}n.sort(function(e,t){return e.f-t.f}),n.push({s:-1,f:25001});var l=n[0],u=n[1],d=0,f=1,p=2;for(n[0]={s:-1,f:l.f+u.f,l,r:u};f!=o-1;)l=n[n[d].f<n[p].f?d++:p++],u=n[d!=f&&n[d].f<n[p].f?d++:p++],n[f++]={s:-1,f:l.f+u.f,l,r:u};for(var m=s[0].s,a=1;a<o;++a)s[a].s>m&&(m=s[a].s);var h=new i(m+1),g=L(n[f-1],h,0);if(g>t){var a=0,_=0,v=g-t,y=1<<v;for(s.sort(function(e,t){return h[t.s]-h[e.s]||e.f-t.f});a<o;++a){var b=s[a].s;if(h[b]>t)_+=y-(1<<g-h[b]),h[b]=t;else break}for(_>>=v;_>0;){var x=s[a].s;h[x]<t?_-=1<<t-h[x]++-1:++a}for(;a>=0&&_;--a){var S=s[a].s;h[S]==t&&(--h[S],++_)}g=t}return{t:new r(h),l:g}},L=function(e,t,n){return e.s==-1?Math.max(L(e.l,t,n+1),L(e.r,t,n+1)):t[e.s]=n},R=function(e){for(var t=e.length;t&&!e[--t];);for(var n=new i(++t),r=0,a=e[0],o=1,s=function(e){n[r++]=e},c=1;c<=t;++c)if(e[c]==a&&c!=t)++o;else{if(!a&&o>2){for(;o>138;o-=138)s(32754);o>2&&(s(o>10?o-11<<5|28690:o-3<<5|12305),o=0)}else if(o>3){for(s(a),--o;o>6;o-=6)s(8304);o>2&&(s(o-3<<5|8208),o=0)}for(;o--;)s(a);o=1,a=e[c]}return{c:n.subarray(0,r),n:t}},z=function(e,t){for(var n=0,r=0;r<t.length;++r)n+=e[r]*t[r];return n},B=function(e,t,n){var r=n.length,i=k(t+2);e[i]=r&255,e[i+1]=r>>8,e[i+2]=e[i]^255,e[i+3]=e[i+1]^255;for(var a=0;a<r;++a)e[i+a+4]=n[a];return(i+4+r)*8},V=function(e,t,n,r,a,l,u,d,f,p,m){P(t,m++,n),++a[256];for(var h=I(a,15),g=h.t,_=h.l,v=I(l,15),C=v.t,T=v.l,E=R(g),D=E.c,O=E.n,k=R(C),A=k.c,j=k.n,M=new i(19),N=0;N<D.length;++N)++M[D[N]&31];for(var N=0;N<A.length;++N)++M[A[N]&31];for(var L=I(M,7),V=L.t,H=L.l,U=19;U>4&&!V[c[U-1]];--U);var ee=p+5<<3,W=z(a,b)+z(l,x)+u,G=z(a,g)+z(l,C)+u+14+3*U+z(M,V)+2*M[16]+3*M[17]+7*M[18];if(f>=0&&ee<=W&&ee<=G)return B(t,m,e.subarray(f,f+p));var K,te,q,J;if(P(t,m,1+(G<W)),m+=2,G<W){K=y(g,_,0),te=g,q=y(C,T,0),J=C;var ne=y(V,H,0);P(t,m,O-257),P(t,m+5,j-1),P(t,m+10,U-4),m+=14;for(var N=0;N<U;++N)P(t,m+3*N,V[c[N]]);m+=3*U;for(var re=[D,A],Y=0;Y<2;++Y)for(var ie=re[Y],N=0;N<ie.length;++N){var ae=ie[N]&31;P(t,m,ne[ae]),m+=V[ae],ae>15&&(P(t,m,ie[N]>>5&127),m+=ie[N]>>12)}}else K=S,te=b,q=w,J=x;for(var N=0;N<d;++N){var oe=r[N];if(oe>255){var ae=oe>>18&31;F(t,m,K[ae+257]),m+=te[ae+257],ae>7&&(P(t,m,oe>>23&31),m+=o[ae]);var se=oe&31;F(t,m,q[se]),m+=J[se],se>3&&(F(t,m,oe>>5&8191),m+=s[se])}else F(t,m,K[oe]),m+=te[oe]}return F(t,m,K[256]),m+te[256]},H=new a([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),U=new r(0),ee=function(e,t,n,c,l,u){var d=u.z||e.length,p=new r(c+d+5*(1+Math.ceil(d/7e3))+l),m=p.subarray(c,p.length-l),g=u.l,_=(u.r||0)&7;if(t){_&&(m[0]=u.r>>3);for(var v=H[t-1],y=v>>13,b=v&8191,x=(1<<n)-1,S=u.p||new i(32768),C=u.h||new i(x+1),w=Math.ceil(n/3),T=2*w,E=function(t){return(e[t]^e[t+1]<<w^e[t+2]<<T)&x},D=new a(25e3),O=new i(288),j=new i(32),M=0,N=0,P=u.i||0,F=0,I=u.w||0,L=0;P+2<d;++P){var R=E(P),z=P&32767,U=C[R];if(S[z]=U,C[R]=z,I<=P){var ee=d-P;if((M>7e3||F>24576)&&(ee>423||!g)){_=V(e,m,0,D,O,j,N,F,L,P-L,_),F=M=N=0,L=P;for(var W=0;W<286;++W)O[W]=0;for(var W=0;W<30;++W)j[W]=0}var G=2,K=0,te=b,q=z-U&32767;if(ee>2&&R==E(P-q))for(var J=Math.min(y,ee)-1,ne=Math.min(32767,P),re=Math.min(258,ee);q<=ne&&--te&&z!=U;){if(e[P+G]==e[P+G-q]){for(var Y=0;Y<re&&e[P+Y]==e[P+Y-q];++Y);if(Y>G){if(G=Y,K=q,Y>J)break;for(var ie=Math.min(q,Y-2),ae=0,W=0;W<ie;++W){var oe=P-q+W&32767,se=oe-S[oe]&32767;se>ae&&(ae=se,U=oe)}}}z=U,U=S[z],q+=z-U&32767}if(K){D[F++]=268435456|f[G]<<18|h[K];var ce=f[G]&31,le=h[K]&31;N+=o[ce]+s[le],++O[257+ce],++j[le],I=P+G,++M}else D[F++]=e[P],++O[e[P]]}}for(P=Math.max(P,I);P<d;++P)D[F++]=e[P],++O[e[P]];_=V(e,m,g,D,O,j,N,F,L,P-L,_),g||(u.r=_&7|m[_/8|0]<<3,_-=7,u.h=C,u.p=S,u.i=P,u.w=I)}else{for(var P=u.w||0;P<d+g;P+=65535){var ue=P+65535;ue>=d&&(m[_/8|0]=g,ue=d),_=B(m,_+1,e.subarray(P,ue))}u.i=d}return A(p,0,c+k(_)+l)},W=function(){var e=1,t=0;return{p:function(n){for(var r=e,i=t,a=n.length|0,o=0;o!=a;){for(var s=Math.min(o+2655,a);o<s;++o)i+=r+=n[o];r=(r&65535)+15*(r>>16),i=(i&65535)+15*(i>>16)}e=r,t=i},d:function(){return e%=65521,t%=65521,(e&255)<<24|(e&65280)<<8|(t&255)<<8|t>>8}}},G=function(e,t,n,i,a){if(!a&&(a={l:1},t.dictionary)){var o=t.dictionary.subarray(-32768),s=new r(o.length+e.length);s.set(o),s.set(e,o.length),e=s,a.w=o.length}return ee(e,t.level==null?6:t.level,t.mem==null?a.l?Math.ceil(Math.max(8,Math.min(13,Math.log(e.length)))*1.5):20:12+t.mem,n,i,a)},K=function(e,t,n){for(;n;++t)e[t]=n,n>>>=8},te=function(e,t){var n=t.level,r=n==0?0:n<6?1:n==9?3:2;if(e[0]=120,e[1]=r<<6|(t.dictionary&&32),e[1]|=31-(e[0]<<8|e[1])%31,t.dictionary){var i=W();i.p(t.dictionary),K(e,2,i.d())}},q=function(e,t){return((e[0]&15)!=8||e[0]>>4>7||(e[0]<<8|e[1])%31)&&M(6,`invalid zlib data`),(e[1]>>5&1)==+!t&&M(6,`invalid zlib data: `+(e[1]&32?`need`:`unexpected`)+` dictionary`),(e[1]>>3&4)+2},J=function(){function e(e,t){typeof e==`function`&&(t=e,e={}),this.ondata=t;var n=e&&e.dictionary&&e.dictionary.subarray(-32768);this.s={i:0,b:n?n.length:0},this.o=new r(32768),this.p=new r(0),n&&this.o.set(n)}return e.prototype.e=function(e){if(this.ondata||M(5),this.d&&M(4),!this.p.length)this.p=e;else if(e.length){var t=new r(this.p.length+e.length);t.set(this.p),t.set(e,this.p.length),this.p=t}},e.prototype.c=function(e){this.s.i=+(this.d=e||!1);var t=this.s.b,n=N(this.p,this.s,this.o);this.ondata(A(n,t,this.s.b),this.d),this.o=A(n,this.s.b-32768),this.s.b=this.o.length,this.p=A(this.p,this.s.p/8|0),this.s.p&=7},e.prototype.push=function(e,t){this.e(e),this.c(t)},e}();function ne(e,t){t||={};var n=W();n.p(e);var r=G(e,t,t.dictionary?6:2,4);return te(r,t),K(r,r.length-4,n.d()),r}var re=function(){function e(e,t){J.call(this,e,t),this.v=e&&e.dictionary?2:1}return e.prototype.push=function(e,t){if(J.prototype.e.call(this,e),this.v){if(this.p.length<6&&!t)return;this.p=this.p.subarray(q(this.p,this.v-1)),this.v=0}t&&(this.p.length<4&&M(6,`invalid zlib data`),this.p=this.p.subarray(0,-4)),J.prototype.c.call(this,t)},e}();function Y(e,t){return N(e.subarray(q(e,t&&t.dictionary),-4),{i:2},t&&t.out,t&&t.dictionary)}var ie=typeof TextDecoder<`u`&&new TextDecoder;try{ie.decode(U,{stream:!0})}catch{}function ae(e,t=`utf8`){return new TextDecoder(t).decode(e)}var oe=new TextEncoder;function se(e){return oe.encode(e)}var ce=8192,le=(()=>{let e=new Uint8Array(4),t=new Uint32Array(e.buffer);return!((t[0]=1)&e[0])})(),ue={int8:globalThis.Int8Array,uint8:globalThis.Uint8Array,int16:globalThis.Int16Array,uint16:globalThis.Uint16Array,int32:globalThis.Int32Array,uint32:globalThis.Uint32Array,uint64:globalThis.BigUint64Array,int64:globalThis.BigInt64Array,float32:globalThis.Float32Array,float64:globalThis.Float64Array},de=class e{buffer;byteLength;byteOffset;length;offset;lastWrittenByte;littleEndian;_data;_mark;_marks;constructor(t=ce,n={}){let r=!1;typeof t==`number`?t=new ArrayBuffer(t):(r=!0,this.lastWrittenByte=t.byteLength);let i=n.offset?n.offset>>>0:0,a=t.byteLength-i,o=i;(ArrayBuffer.isView(t)||t instanceof e)&&(t.byteLength!==t.buffer.byteLength&&(o=t.byteOffset+i),t=t.buffer),this.lastWrittenByte=r?a:0,this.buffer=t,this.length=a,this.byteLength=a,this.byteOffset=o,this.offset=0,this.littleEndian=!0,this._data=new DataView(this.buffer,o,a),this._mark=0,this._marks=[]}available(e=1){return this.offset+e<=this.length}isLittleEndian(){return this.littleEndian}setLittleEndian(){return this.littleEndian=!0,this}isBigEndian(){return!this.littleEndian}setBigEndian(){return this.littleEndian=!1,this}skip(e=1){return this.offset+=e,this}back(e=1){return this.offset-=e,this}seek(e){return this.offset=e,this}mark(){return this._mark=this.offset,this}reset(){return this.offset=this._mark,this}pushMark(){return this._marks.push(this.offset),this}popMark(){let e=this._marks.pop();if(e===void 0)throw Error(`Mark stack empty`);return this.seek(e),this}rewind(){return this.offset=0,this}ensureAvailable(e=1){if(!this.available(e)){let t=(this.offset+e)*2,n=new Uint8Array(t);n.set(new Uint8Array(this.buffer)),this.buffer=n.buffer,this.length=t,this.byteLength=t,this._data=new DataView(this.buffer)}return this}readBoolean(){return this.readUint8()!==0}readInt8(){return this._data.getInt8(this.offset++)}readUint8(){return this._data.getUint8(this.offset++)}readByte(){return this.readUint8()}readBytes(e=1){return this.readArray(e,`uint8`)}readArray(e,t){let n=ue[t].BYTES_PER_ELEMENT*e,r=this.byteOffset+this.offset,i=this.buffer.slice(r,r+n);if(this.littleEndian===le&&t!==`uint8`&&t!==`int8`){let e=new Uint8Array(this.buffer.slice(r,r+n));e.reverse();let i=new ue[t](e.buffer);return this.offset+=n,i.reverse(),i}let a=new ue[t](i);return this.offset+=n,a}readInt16(){let e=this._data.getInt16(this.offset,this.littleEndian);return this.offset+=2,e}readUint16(){let e=this._data.getUint16(this.offset,this.littleEndian);return this.offset+=2,e}readInt32(){let e=this._data.getInt32(this.offset,this.littleEndian);return this.offset+=4,e}readUint32(){let e=this._data.getUint32(this.offset,this.littleEndian);return this.offset+=4,e}readFloat32(){let e=this._data.getFloat32(this.offset,this.littleEndian);return this.offset+=4,e}readFloat64(){let e=this._data.getFloat64(this.offset,this.littleEndian);return this.offset+=8,e}readBigInt64(){let e=this._data.getBigInt64(this.offset,this.littleEndian);return this.offset+=8,e}readBigUint64(){let e=this._data.getBigUint64(this.offset,this.littleEndian);return this.offset+=8,e}readChar(){return String.fromCharCode(this.readInt8())}readChars(e=1){let t=``;for(let n=0;n<e;n++)t+=this.readChar();return t}readUtf8(e=1){return ae(this.readBytes(e))}decodeText(e=1,t=`utf8`){return ae(this.readBytes(e),t)}writeBoolean(e){return this.writeUint8(e?255:0),this}writeInt8(e){return this.ensureAvailable(1),this._data.setInt8(this.offset++,e),this._updateLastWrittenByte(),this}writeUint8(e){return this.ensureAvailable(1),this._data.setUint8(this.offset++,e),this._updateLastWrittenByte(),this}writeByte(e){return this.writeUint8(e)}writeBytes(e){this.ensureAvailable(e.length);for(let t=0;t<e.length;t++)this._data.setUint8(this.offset++,e[t]);return this._updateLastWrittenByte(),this}writeInt16(e){return this.ensureAvailable(2),this._data.setInt16(this.offset,e,this.littleEndian),this.offset+=2,this._updateLastWrittenByte(),this}writeUint16(e){return this.ensureAvailable(2),this._data.setUint16(this.offset,e,this.littleEndian),this.offset+=2,this._updateLastWrittenByte(),this}writeInt32(e){return this.ensureAvailable(4),this._data.setInt32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeUint32(e){return this.ensureAvailable(4),this._data.setUint32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeFloat32(e){return this.ensureAvailable(4),this._data.setFloat32(this.offset,e,this.littleEndian),this.offset+=4,this._updateLastWrittenByte(),this}writeFloat64(e){return this.ensureAvailable(8),this._data.setFloat64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeBigInt64(e){return this.ensureAvailable(8),this._data.setBigInt64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeBigUint64(e){return this.ensureAvailable(8),this._data.setBigUint64(this.offset,e,this.littleEndian),this.offset+=8,this._updateLastWrittenByte(),this}writeChar(e){return this.writeUint8(e.charCodeAt(0))}writeChars(e){for(let t=0;t<e.length;t++)this.writeUint8(e.charCodeAt(t));return this}writeUtf8(e){return this.writeBytes(se(e))}toArray(){return new Uint8Array(this.buffer,this.byteOffset,this.lastWrittenByte)}getWrittenByteLength(){return this.lastWrittenByte-this.byteOffset}_updateLastWrittenByte(){this.offset>this.lastWrittenByte&&(this.lastWrittenByte=this.offset)}},fe=[];for(let e=0;e<256;e++){let t=e;for(let e=0;e<8;e++)t&1?t=3988292384^t>>>1:t>>>=1;fe[e]=t}var pe=4294967295;function me(e,t,n){let r=e;for(let e=0;e<n;e++)r=fe[(r^t[e])&255]^r>>>8;return r}function he(e,t){return(me(pe,e,t)^pe)>>>0}function ge(e,t,n){let r=e.readUint32(),i=he(new Uint8Array(e.buffer,e.byteOffset+e.offset-t-4,t),t);if(i!==r)throw Error(`CRC mismatch for chunk ${n}. Expected ${r}, found ${i}`)}function _e(e,t){e.writeUint32(he(new Uint8Array(e.buffer,e.byteOffset+e.offset-t,t),t))}function ve(e,t,n){for(let r=0;r<n;r++)t[r]=e[r]}function ye(e,t,n,r){let i=0;for(;i<r;i++)t[i]=e[i];for(;i<n;i++)t[i]=e[i]+t[i-r]&255}function be(e,t,n,r){let i=0;if(n.length===0)for(;i<r;i++)t[i]=e[i];else for(;i<r;i++)t[i]=e[i]+n[i]&255}function xe(e,t,n,r,i){let a=0;if(n.length===0){for(;a<i;a++)t[a]=e[a];for(;a<r;a++)t[a]=e[a]+(t[a-i]>>1)&255}else{for(;a<i;a++)t[a]=e[a]+(n[a]>>1)&255;for(;a<r;a++)t[a]=e[a]+(t[a-i]+n[a]>>1)&255}}function Se(e,t,n,r,i){let a=0;if(n.length===0){for(;a<i;a++)t[a]=e[a];for(;a<r;a++)t[a]=e[a]+t[a-i]&255}else{for(;a<i;a++)t[a]=e[a]+n[a]&255;for(;a<r;a++)t[a]=e[a]+Ce(t[a-i],n[a],n[a-i])&255}}function Ce(e,t,n){let r=e+t-n,i=Math.abs(r-e),a=Math.abs(r-t),o=Math.abs(r-n);return i<=a&&i<=o?e:a<=o?t:n}function we(e,t,n,r,i,a){switch(e){case 0:ve(t,n,i);break;case 1:ye(t,n,i,a);break;case 2:be(t,n,r,i);break;case 3:xe(t,n,r,i,a);break;case 4:Se(t,n,r,i,a);break;default:throw Error(`Unsupported filter: ${e}`)}}var Te=new Uint16Array([255]),Ee=new Uint8Array(Te.buffer)[0]===255;function De(e){let{data:t,width:n,height:r,channels:i,depth:a}=e,o=[{x:0,y:0,xStep:8,yStep:8},{x:4,y:0,xStep:8,yStep:8},{x:0,y:4,xStep:4,yStep:8},{x:2,y:0,xStep:4,yStep:4},{x:0,y:2,xStep:2,yStep:4},{x:1,y:0,xStep:2,yStep:2},{x:0,y:1,xStep:1,yStep:2}],s=Math.ceil(a/8)*i,c=new Uint8Array(r*n*s),l=0;for(let e=0;e<7;e++){let i=o[e],a=Math.ceil((n-i.x)/i.xStep),u=Math.ceil((r-i.y)/i.yStep);if(a<=0||u<=0)continue;let d=a*s,f=new Uint8Array(d);for(let e=0;e<u;e++){let o=t[l++],u=t.subarray(l,l+d);l+=d;let p=new Uint8Array(d);we(o,u,p,f,d,s),f.set(p);for(let t=0;t<a;t++){let a=i.x+t*i.xStep,o=i.y+e*i.yStep;if(!(a>=n||o>=r))for(let e=0;e<s;e++)c[(o*n+a)*s+e]=p[t*s+e]}}}if(a===16){let e=new Uint16Array(c.buffer);if(Ee)for(let t=0;t<e.length;t++)e[t]=Oe(e[t]);return e}return c}function Oe(e){return(e&255)<<8|e>>8&255}var ke=new Uint16Array([255]),Ae=new Uint8Array(ke.buffer)[0]===255,je=new Uint8Array;function Me(e){let{data:t,width:n,height:r,channels:i,depth:a}=e,o=Math.ceil(a/8)*i,s=Math.ceil(a/8*i*n),c=new Uint8Array(r*s),l=je,u=0,d,f;for(let e=0;e<r;e++){switch(d=t.subarray(u+1,u+1+s),f=c.subarray(e*s,(e+1)*s),t[u]){case 0:ve(d,f,s);break;case 1:ye(d,f,s,o);break;case 2:be(d,f,l,s);break;case 3:xe(d,f,l,s,o);break;case 4:Se(d,f,l,s,o);break;default:throw Error(`Unsupported filter: ${t[u]}`)}l=f,u+=s+1}if(a===16){let e=new Uint16Array(c.buffer);if(Ae)for(let t=0;t<e.length;t++)e[t]=Ne(e[t]);return e}return c}function Ne(e){return(e&255)<<8|e>>8&255}var Pe=Uint8Array.of(137,80,78,71,13,10,26,10);function Fe(e){e.writeBytes(Pe)}function Ie(e){if(!Le(e.readBytes(Pe.length)))throw Error(`wrong PNG signature`)}function Le(e){if(e.length<Pe.length)return!1;for(let t=0;t<Pe.length;t++)if(e[t]!==Pe[t])return!1;return!0}var Re=`tEXt`,ze=0,Be=new TextDecoder(`latin1`);function Ve(e){if(Ue(e),e.length===0||e.length>79)throw Error(`keyword length must be between 1 and 79`)}var He=/^[\u0000-\u00FF]*$/;function Ue(e){if(!He.test(e))throw Error(`invalid latin1 text`)}function We(e,t,n){let r=Ke(t);e[r]=qe(t,n-r.length-1)}function Ge(e,t,n){Ve(t),Ue(n);let r=t.length+1+n.length;e.writeUint32(r),e.writeChars(Re),e.writeChars(t),e.writeByte(ze),e.writeChars(n),_e(e,r+4)}function Ke(e){for(e.mark();e.readByte()!==ze;);let t=e.offset;e.reset();let n=Be.decode(e.readBytes(t-e.offset-1));return e.skip(1),Ve(n),n}function qe(e,t){return Be.decode(e.readBytes(t))}var X={UNKNOWN:-1,GREYSCALE:0,TRUECOLOUR:2,INDEXED_COLOUR:3,GREYSCALE_ALPHA:4,TRUECOLOUR_ALPHA:6},Je={UNKNOWN:-1,DEFLATE:0},Ye={UNKNOWN:-1,ADAPTIVE:0},Xe={UNKNOWN:-1,NO_INTERLACE:0,ADAM7:1},Ze={NONE:0,BACKGROUND:1,PREVIOUS:2},Qe={SOURCE:0,OVER:1},$e=class extends de{_checkCrc;_inflator;_png;_apng;_end;_hasPalette;_palette;_hasTransparency;_transparency;_compressionMethod;_filterMethod;_interlaceMethod;_colorType;_isAnimated;_numberOfFrames;_numberOfPlays;_frames;_writingDataChunks;_chunks;_inflatorResult;constructor(e,t={}){super(e);let{checkCrc:n=!1}=t;this._checkCrc=n,this._inflator=new re((e,t)=>{if(this._chunks.push(e),t){let e=this._chunks.reduce((e,t)=>e+t.length,0);this._inflatorResult=new Uint8Array(e);let t=0;for(let e of this._chunks)this._inflatorResult.set(e,t),t+=e.length;this._chunks=[]}}),this._chunks=[],this._png={width:-1,height:-1,channels:-1,data:new Uint8Array,depth:1,text:{}},this._apng={width:-1,height:-1,channels:-1,depth:1,numberOfFrames:1,numberOfPlays:0,text:{},frames:[]},this._end=!1,this._hasPalette=!1,this._palette=[],this._hasTransparency=!1,this._transparency=new Uint16Array,this._compressionMethod=Je.UNKNOWN,this._filterMethod=Ye.UNKNOWN,this._interlaceMethod=Xe.UNKNOWN,this._colorType=X.UNKNOWN,this._isAnimated=!1,this._numberOfFrames=1,this._numberOfPlays=0,this._frames=[],this._writingDataChunks=!1,this._inflatorResult=new Uint8Array,this.setBigEndian()}decode(){for(Ie(this);!this._end;){let e=this.readUint32(),t=this.readChars(4);this.decodeChunk(e,t)}return this._inflator.push(new Uint8Array,!0),this.decodeImage(),this._png}decodeApng(){for(Ie(this);!this._end;){let e=this.readUint32(),t=this.readChars(4);this.decodeApngChunk(e,t)}return this.decodeApngImage(),this._apng}decodeChunk(e,t){let n=this.offset;switch(t){case`IHDR`:this.decodeIHDR();break;case`PLTE`:this.decodePLTE(e);break;case`IDAT`:this.decodeIDAT(e);break;case`IEND`:this._end=!0;break;case`tRNS`:this.decodetRNS(e);break;case`iCCP`:this.decodeiCCP(e);break;case Re:We(this._png.text,this,e);break;case`pHYs`:this.decodepHYs();break;default:this.skip(e)}if(this.offset-n!==e)throw Error(`Length mismatch while decoding chunk ${t}`);this._checkCrc?ge(this,e+4,t):this.skip(4)}decodeApngChunk(e,t){let n=this.offset;switch(t!==`fdAT`&&t!==`IDAT`&&this._writingDataChunks&&this.pushDataToFrame(),t){case`acTL`:this.decodeACTL();break;case`fcTL`:this.decodeFCTL();break;case`fdAT`:this.decodeFDAT(e);break;default:this.decodeChunk(e,t),this.offset=n+e}if(this.offset-n!==e)throw Error(`Length mismatch while decoding chunk ${t}`);this._checkCrc?ge(this,e+4,t):this.skip(4)}decodeIHDR(){let e=this._png;e.width=this.readUint32(),e.height=this.readUint32(),e.depth=et(this.readUint8());let t=this.readUint8();this._colorType=t;let n;switch(t){case X.GREYSCALE:n=1;break;case X.TRUECOLOUR:n=3;break;case X.INDEXED_COLOUR:n=1;break;case X.GREYSCALE_ALPHA:n=2;break;case X.TRUECOLOUR_ALPHA:n=4;break;case X.UNKNOWN:default:throw Error(`Unknown color type: ${t}`)}if(this._png.channels=n,this._compressionMethod=this.readUint8(),this._compressionMethod!==Je.DEFLATE)throw Error(`Unsupported compression method: ${this._compressionMethod}`);this._filterMethod=this.readUint8(),this._interlaceMethod=this.readUint8()}decodeACTL(){this._numberOfFrames=this.readUint32(),this._numberOfPlays=this.readUint32(),this._isAnimated=!0}decodeFCTL(){let e={sequenceNumber:this.readUint32(),width:this.readUint32(),height:this.readUint32(),xOffset:this.readUint32(),yOffset:this.readUint32(),delayNumber:this.readUint16(),delayDenominator:this.readUint16(),disposeOp:this.readUint8(),blendOp:this.readUint8(),data:new Uint8Array};this._frames.push(e)}decodePLTE(e){if(e%3!=0)throw RangeError(`PLTE field length must be a multiple of 3. Got ${e}`);let t=e/3;this._hasPalette=!0;let n=[];this._palette=n;for(let e=0;e<t;e++)n.push([this.readUint8(),this.readUint8(),this.readUint8()])}decodeIDAT(e){this._writingDataChunks=!0;let t=e,n=this.offset+this.byteOffset;try{this._inflator.push(new Uint8Array(this.buffer,n,t),!1)}catch(e){throw Error(`Error while decompressing the data:`,{cause:e})}this.skip(e)}decodeFDAT(e){this._writingDataChunks=!0;let t=e,n=this.offset+this.byteOffset;n+=4,t-=4;try{this._inflator.push(new Uint8Array(this.buffer,n,t),!1)}catch(e){throw Error(`Error while decompressing the data:`,{cause:e})}this.skip(e)}decodetRNS(e){switch(this._colorType){case X.GREYSCALE:case X.TRUECOLOUR:if(e%2!=0)throw RangeError(`tRNS chunk length must be a multiple of 2. Got ${e}`);if(e/2>this._png.width*this._png.height)throw Error(`tRNS chunk contains more alpha values than there are pixels (${e/2} vs ${this._png.width*this._png.height})`);this._hasTransparency=!0,this._transparency=new Uint16Array(e/2);for(let t=0;t<e/2;t++)this._transparency[t]=this.readUint16();break;case X.INDEXED_COLOUR:{if(e>this._palette.length)throw Error(`tRNS chunk contains more alpha values than there are palette colors (${e} vs ${this._palette.length})`);let t=0;for(;t<e;t++){let e=this.readByte();this._palette[t].push(e)}for(;t<this._palette.length;t++)this._palette[t].push(255);break}case X.UNKNOWN:case X.GREYSCALE_ALPHA:case X.TRUECOLOUR_ALPHA:default:throw Error(`tRNS chunk is not supported for color type ${this._colorType}`)}}decodeiCCP(e){let t=Ke(this),n=this.readUint8();if(n!==Je.DEFLATE)throw Error(`Unsupported iCCP compression method: ${n}`);let r=this.readBytes(e-t.length-2);this._png.iccEmbeddedProfile={name:t,profile:Y(r)}}decodepHYs(){let e=this.readUint32(),t=this.readUint32(),n=this.readByte();this._png.resolution={x:e,y:t,unit:n}}decodeApngImage(){this._apng.width=this._png.width,this._apng.height=this._png.height,this._apng.channels=this._png.channels,this._apng.depth=this._png.depth,this._apng.numberOfFrames=this._numberOfFrames,this._apng.numberOfPlays=this._numberOfPlays,this._apng.text=this._png.text,this._apng.resolution=this._png.resolution;for(let e=0;e<this._numberOfFrames;e++){let t={sequenceNumber:this._frames[e].sequenceNumber,delayNumber:this._frames[e].delayNumber,delayDenominator:this._frames[e].delayDenominator,data:this._apng.depth===8?new Uint8Array(this._apng.width*this._apng.height*this._apng.channels):new Uint16Array(this._apng.width*this._apng.height*this._apng.channels)},n=this._frames.at(e);if(n){if(n.data=Me({data:n.data,width:n.width,height:n.height,channels:this._apng.channels,depth:this._apng.depth}),this._hasPalette&&(this._apng.palette=this._palette),this._hasTransparency&&(this._apng.transparency=this._transparency),e===0||n.xOffset===0&&n.yOffset===0&&n.width===this._png.width&&n.height===this._png.height)t.data=n.data;else{let r=this._apng.frames.at(e-1);this.disposeFrame(n,r,t),this.addFrameDataToCanvas(t,n)}this._apng.frames.push(t)}}return this._apng}disposeFrame(e,t,n){switch(e.disposeOp){case Ze.NONE:break;case Ze.BACKGROUND:for(let t=0;t<this._png.height;t++)for(let r=0;r<this._png.width;r++){let i=(t*e.width+r)*this._png.channels;for(let e=0;e<this._png.channels;e++)n.data[i+e]=0}break;case Ze.PREVIOUS:n.data.set(t.data);break;default:throw Error(`Unknown disposeOp`)}}addFrameDataToCanvas(e,t){let n=1<<this._png.depth,r=(e,n)=>({index:((e+t.yOffset)*this._png.width+t.xOffset+n)*this._png.channels,frameIndex:(e*t.width+n)*this._png.channels});switch(t.blendOp){case Qe.SOURCE:for(let n=0;n<t.height;n++)for(let i=0;i<t.width;i++){let{index:a,frameIndex:o}=r(n,i);for(let n=0;n<this._png.channels;n++)e.data[a+n]=t.data[o+n]}break;case Qe.OVER:for(let i=0;i<t.height;i++)for(let a=0;a<t.width;a++){let{index:o,frameIndex:s}=r(i,a);for(let r=0;r<this._png.channels;r++){let i=t.data[s+this._png.channels-1]/n,a=r%(this._png.channels-1)==0?1:t.data[s+r],c=Math.floor(i*a+(1-i)*e.data[o+r]);e.data[o+r]+=c}}break;default:throw Error(`Unknown blendOp`)}}decodeImage(){let e=this._inflatorResult;if(this._filterMethod!==Ye.ADAPTIVE)throw Error(`Filter method ${this._filterMethod} not supported`);if(this._interlaceMethod===Xe.NO_INTERLACE)this._png.data=Me({data:e,width:this._png.width,height:this._png.height,channels:this._png.channels,depth:this._png.depth});else if(this._interlaceMethod===Xe.ADAM7)this._png.data=De({data:e,width:this._png.width,height:this._png.height,channels:this._png.channels,depth:this._png.depth});else throw Error(`Interlace method ${this._interlaceMethod} not supported`);this._hasPalette&&(this._png.palette=this._palette),this._hasTransparency&&(this._png.transparency=this._transparency)}pushDataToFrame(){this._inflator.push(new Uint8Array,!0);let e=this._inflatorResult,t=this._frames.at(-1);t?t.data=e:this._frames.push({sequenceNumber:0,width:this._png.width,height:this._png.height,xOffset:0,yOffset:0,delayNumber:0,delayDenominator:0,disposeOp:Ze.NONE,blendOp:Qe.SOURCE,data:e}),this._inflator=new re((e,t)=>{if(this._chunks.push(e),t){let e=this._chunks.reduce((e,t)=>e+t.length,0);this._inflatorResult=new Uint8Array(e);let t=0;for(let e of this._chunks)this._inflatorResult.set(e,t),t+=e.length;this._chunks=[]}}),this._chunks=[],this._writingDataChunks=!1}};function et(e){if(e!==1&&e!==2&&e!==4&&e!==8&&e!==16)throw Error(`invalid bit depth: ${e}`);return e}var tt={level:3},nt=class extends de{_png;_zlibOptions;_colorType;_interlaceMethod;constructor(e,t={}){super(),this._colorType=X.UNKNOWN,this._zlibOptions={...tt,...t.zlib},this._png=this._checkData(e),this._interlaceMethod=(t.interlace===`Adam7`?Xe.ADAM7:Xe.NO_INTERLACE)??Xe.NO_INTERLACE,this.setBigEndian()}encode(){if(Fe(this),this.encodeIHDR(),this._png.palette&&(this.encodePLTE(),this._png.palette[0].length===4&&this.encodeTRNS()),this.encodeData(),this._png.text)for(let[e,t]of Object.entries(this._png.text))Ge(this,e,t);return this.encodeIEND(),this.toArray()}encodeIHDR(){this.writeUint32(13),this.writeChars(`IHDR`),this.writeUint32(this._png.width),this.writeUint32(this._png.height),this.writeByte(this._png.depth),this.writeByte(this._colorType),this.writeByte(Je.DEFLATE),this.writeByte(Ye.ADAPTIVE),this.writeByte(this._interlaceMethod),_e(this,17)}encodeIEND(){this.writeUint32(0),this.writeChars(`IEND`),_e(this,4)}encodePLTE(){let e=this._png.palette?.length*3;this.writeUint32(e),this.writeChars(`PLTE`);for(let e of this._png.palette)this.writeByte(e[0]),this.writeByte(e[1]),this.writeByte(e[2]);_e(this,4+e)}encodeTRNS(){let e=this._png.palette.filter(e=>e.at(-1)!==255);this.writeUint32(e.length),this.writeChars(`tRNS`);for(let t of e)this.writeByte(t.at(-1));_e(this,4+e.length)}encodeIDAT(e){this.writeUint32(e.length),this.writeChars(`IDAT`),this.writeBytes(e),_e(this,e.length+4)}encodeData(){let{width:e,height:t,channels:n,depth:r,data:i}=this._png,a=r<=8?Math.ceil(e*r/8)*n:Math.ceil(e*r/8*n/2),o=new de().setBigEndian(),s=0;if(this._interlaceMethod===Xe.NO_INTERLACE)for(let e=0;e<t;e++)o.writeByte(0),s=r===16?st(i,o,a,s):at(i,o,a,s);else this._interlaceMethod===Xe.ADAM7&&(s=ot(this._png,i,o,s));let c=ne(o.toArray(),this._zlibOptions);this.encodeIDAT(c)}_checkData(e){let{colorType:t,channels:n,depth:r}=it(e,e.palette),i={width:rt(e.width,`width`),height:rt(e.height,`height`),channels:n,data:e.data,depth:r,text:e.text,palette:e.palette};this._colorType=t;let a=r<8?Math.ceil(i.width*r/8)*i.height*n:i.width*i.height*n;if(i.data.length!==a)throw RangeError(`wrong data size. Found ${i.data.length}, expected ${a}`);return i}};function rt(e,t){if(Number.isInteger(e)&&e>0)return e;throw TypeError(`${t} must be a positive integer`)}function it(e,t){let{channels:n=4,depth:r=8}=e;if(n!==4&&n!==3&&n!==2&&n!==1)throw RangeError(`unsupported number of channels: ${n}`);let i={channels:n,depth:r,colorType:X.UNKNOWN};switch(n){case 4:i.colorType=X.TRUECOLOUR_ALPHA;break;case 3:i.colorType=X.TRUECOLOUR;break;case 1:i.colorType=t?X.INDEXED_COLOUR:X.GREYSCALE;break;case 2:i.colorType=X.GREYSCALE_ALPHA;break;default:throw Error(`unsupported number of channels`)}return i}function at(e,t,n,r){for(let i=0;i<n;i++)t.writeByte(e[r++]);return r}function ot(e,t,n,r){let i=[{x:0,y:0,xStep:8,yStep:8},{x:4,y:0,xStep:8,yStep:8},{x:0,y:4,xStep:4,yStep:8},{x:2,y:0,xStep:4,yStep:4},{x:0,y:2,xStep:2,yStep:4},{x:1,y:0,xStep:2,yStep:2},{x:0,y:1,xStep:1,yStep:2}],{width:a,height:o,channels:s,depth:c}=e,l;l=c===16?s*c/8/2:s*c/8;for(let e=0;e<7;e++){let r=i[e],s=Math.floor((a-r.x+r.xStep-1)/r.xStep),u=Math.floor((o-r.y+r.yStep-1)/r.yStep);if(s<=0||u<=0)continue;let d=s*l;for(let e=0;e<u;e++){let i=r.y+e*r.yStep,u=c<=8?new Uint8Array(d):new Uint16Array(d),f=0;for(let e=0;e<s;e++){let n=r.x+e*r.xStep;if(n<a&&i<o){let e=(i*a+n)*l;for(let n=0;n<l;n++)u[f++]=t[e+n]}}if(n.writeByte(0),c===8)n.writeBytes(u);else if(c===16)for(let e of u)n.writeByte(e>>8&255),n.writeByte(e&255)}}return r}function st(e,t,n,r){for(let i=0;i<n;i++)t.writeUint16(e[r++]);return r}function ct(e,t){return new $e(e,t).decode()}function lt(e,t){return new nt(e,t).encode()}var ut=n(((e,n)=>{(function(t){typeof e==`object`&&n!==void 0?n.exports=t():typeof define==`function`&&define.amd?define([],t):(typeof window<`u`?window:typeof global<`u`?global:typeof self<`u`?self:this).JSZip=t()})(function(){return function e(n,r,i){function a(s,c){if(!r[s]){if(!n[s]){var l=typeof t==`function`&&t;if(!c&&l)return l(s,!0);if(o)return o(s,!0);var u=Error(`Cannot find module '`+s+`'`);throw u.code=`MODULE_NOT_FOUND`,u}var d=r[s]={exports:{}};n[s][0].call(d.exports,function(e){var t=n[s][1][e];return a(t||e)},d,d.exports,e,n,r,i)}return r[s].exports}for(var o=typeof t==`function`&&t,s=0;s<i.length;s++)a(i[s]);return a}({1:[function(e,t,n){var r=e(`./utils`),i=e(`./support`),a=`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=`;n.encode=function(e){for(var t,n,i,o,s,c,l,u=[],d=0,f=e.length,p=f,m=r.getTypeOf(e)!==`string`;d<e.length;)p=f-d,i=m?(t=e[d++],n=d<f?e[d++]:0,d<f?e[d++]:0):(t=e.charCodeAt(d++),n=d<f?e.charCodeAt(d++):0,d<f?e.charCodeAt(d++):0),o=t>>2,s=(3&t)<<4|n>>4,c=1<p?(15&n)<<2|i>>6:64,l=2<p?63&i:64,u.push(a.charAt(o)+a.charAt(s)+a.charAt(c)+a.charAt(l));return u.join(``)},n.decode=function(e){var t,n,r,o,s,c,l=0,u=0,d=`data:`;if(e.substr(0,d.length)===d)throw Error(`Invalid base64 input, it looks like a data url.`);var f,p=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,``)).length/4;if(e.charAt(e.length-1)===a.charAt(64)&&p--,e.charAt(e.length-2)===a.charAt(64)&&p--,p%1!=0)throw Error(`Invalid base64 input, bad content length.`);for(f=i.uint8array?new Uint8Array(0|p):Array(0|p);l<e.length;)t=a.indexOf(e.charAt(l++))<<2|(o=a.indexOf(e.charAt(l++)))>>4,n=(15&o)<<4|(s=a.indexOf(e.charAt(l++)))>>2,r=(3&s)<<6|(c=a.indexOf(e.charAt(l++))),f[u++]=t,s!==64&&(f[u++]=n),c!==64&&(f[u++]=r);return f}},{"./support":30,"./utils":32}],2:[function(e,t,n){var r=e(`./external`),i=e(`./stream/DataWorker`),a=e(`./stream/Crc32Probe`),o=e(`./stream/DataLengthProbe`);function s(e,t,n,r,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=n,this.compression=r,this.compressedContent=i}s.prototype={getContentWorker:function(){var e=new i(r.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new o(`data_length`)),t=this;return e.on(`end`,function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw Error(`Bug : uncompressed data size mismatch`)}),e},getCompressedWorker:function(){return new i(r.Promise.resolve(this.compressedContent)).withStreamInfo(`compressedSize`,this.compressedSize).withStreamInfo(`uncompressedSize`,this.uncompressedSize).withStreamInfo(`crc32`,this.crc32).withStreamInfo(`compression`,this.compression)}},s.createWorkerFrom=function(e,t,n){return e.pipe(new a).pipe(new o(`uncompressedSize`)).pipe(t.compressWorker(n)).pipe(new o(`compressedSize`)).withStreamInfo(`compression`,t)},t.exports=s},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,n){var r=e(`./stream/GenericWorker`);n.STORE={magic:`\0\0`,compressWorker:function(){return new r(`STORE compression`)},uncompressWorker:function(){return new r(`STORE decompression`)}},n.DEFLATE=e(`./flate`)},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,n){var r=e(`./utils`),i=function(){for(var e,t=[],n=0;n<256;n++){e=n;for(var r=0;r<8;r++)e=1&e?3988292384^e>>>1:e>>>1;t[n]=e}return t}();t.exports=function(e,t){return e!==void 0&&e.length?r.getTypeOf(e)===`string`?function(e,t,n,r){var a=i,o=r+n;e^=-1;for(var s=r;s<o;s++)e=e>>>8^a[255&(e^t.charCodeAt(s))];return-1^e}(0|t,e,e.length,0):function(e,t,n,r){var a=i,o=r+n;e^=-1;for(var s=r;s<o;s++)e=e>>>8^a[255&(e^t[s])];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,n){n.base64=!1,n.binary=!1,n.dir=!1,n.createFolders=!0,n.date=null,n.compression=null,n.compressionOptions=null,n.comment=null,n.unixPermissions=null,n.dosPermissions=null},{}],6:[function(e,t,n){var r=null;r=typeof Promise<`u`?Promise:e(`lie`),t.exports={Promise:r}},{lie:37}],7:[function(e,t,n){var r=typeof Uint8Array<`u`&&typeof Uint16Array<`u`&&typeof Uint32Array<`u`,i=e(`pako`),a=e(`./utils`),o=e(`./stream/GenericWorker`),s=r?`uint8array`:`array`;function c(e,t){o.call(this,`FlateWorker/`+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}n.magic=`\b\0`,a.inherits(c,o),c.prototype.processChunk=function(e){this.meta=e.meta,this._pako===null&&this._createPako(),this._pako.push(a.transformTo(s,e.data),!1)},c.prototype.flush=function(){o.prototype.flush.call(this),this._pako===null&&this._createPako(),this._pako.push([],!0)},c.prototype.cleanUp=function(){o.prototype.cleanUp.call(this),this._pako=null},c.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var e=this;this._pako.onData=function(t){e.push({data:t,meta:e.meta})}},n.compressWorker=function(e){return new c(`Deflate`,e)},n.uncompressWorker=function(){return new c(`Inflate`,{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,n){function r(e,t){var n,r=``;for(n=0;n<t;n++)r+=String.fromCharCode(255&e),e>>>=8;return r}function i(e,t,n,i,o,u){var d,f,p=e.file,m=e.compression,h=u!==s.utf8encode,g=a.transformTo(`string`,u(p.name)),_=a.transformTo(`string`,s.utf8encode(p.name)),v=p.comment,y=a.transformTo(`string`,u(v)),b=a.transformTo(`string`,s.utf8encode(v)),x=_.length!==p.name.length,S=b.length!==v.length,C=``,w=``,T=``,E=p.dir,D=p.date,O={crc32:0,compressedSize:0,uncompressedSize:0};t&&!n||(O.crc32=e.crc32,O.compressedSize=e.compressedSize,O.uncompressedSize=e.uncompressedSize);var k=0;t&&(k|=8),h||!x&&!S||(k|=2048);var A=0,j=0;E&&(A|=16),o===`UNIX`?(j=798,A|=function(e,t){var n=e;return e||(n=t?16893:33204),(65535&n)<<16}(p.unixPermissions,E)):(j=20,A|=function(e){return 63&(e||0)}(p.dosPermissions)),d=D.getUTCHours(),d<<=6,d|=D.getUTCMinutes(),d<<=5,d|=D.getUTCSeconds()/2,f=D.getUTCFullYear()-1980,f<<=4,f|=D.getUTCMonth()+1,f<<=5,f|=D.getUTCDate(),x&&(w=r(1,1)+r(c(g),4)+_,C+=`up`+r(w.length,2)+w),S&&(T=r(1,1)+r(c(y),4)+b,C+=`uc`+r(T.length,2)+T);var M=``;return M+=`
\0`,M+=r(k,2),M+=m.magic,M+=r(d,2),M+=r(f,2),M+=r(O.crc32,4),M+=r(O.compressedSize,4),M+=r(O.uncompressedSize,4),M+=r(g.length,2),M+=r(C.length,2),{fileRecord:l.LOCAL_FILE_HEADER+M+g+C,dirRecord:l.CENTRAL_FILE_HEADER+r(j,2)+M+r(y.length,2)+`\0\0\0\0`+r(A,4)+r(i,4)+g+C+y}}var a=e(`../utils`),o=e(`../stream/GenericWorker`),s=e(`../utf8`),c=e(`../crc32`),l=e(`../signature`);function u(e,t,n,r){o.call(this,`ZipFileWorker`),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=n,this.encodeFileName=r,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}a.inherits(u,o),u.prototype.push=function(e){var t=e.meta.percent||0,n=this.entriesCount,r=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,o.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:n?(t+100*(n-r-1))/n:100}}))},u.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var n=i(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:n.fileRecord,meta:{percent:0}})}else this.accumulate=!0},u.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,n=i(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(n.dirRecord),t)this.push({data:function(e){return l.DATA_DESCRIPTOR+r(e.crc32,4)+r(e.compressedSize,4)+r(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:n.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},u.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var n=this.bytesWritten-e,i=function(e,t,n,i,o){var s=a.transformTo(`string`,o(i));return l.CENTRAL_DIRECTORY_END+`\0\0\0\0`+r(e,2)+r(e,2)+r(t,4)+r(n,4)+r(s.length,2)+s}(this.dirRecords.length,n,e,this.zipComment,this.encodeFileName);this.push({data:i,meta:{percent:100}})},u.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},u.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on(`data`,function(e){t.processChunk(e)}),e.on(`end`,function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on(`error`,function(e){t.error(e)}),this},u.prototype.resume=function(){return!!o.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},u.prototype.error=function(e){var t=this._sources;if(!o.prototype.error.call(this,e))return!1;for(var n=0;n<t.length;n++)try{t[n].error(e)}catch{}return!0},u.prototype.lock=function(){o.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=u},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,n){var r=e(`../compressions`),i=e(`./ZipFileWorker`);n.generateWorker=function(e,t,n){var a=new i(t.streamFiles,n,t.platform,t.encodeFileName),o=0;try{e.forEach(function(e,n){o++;var i=function(e,t){var n=e||t,i=r[n];if(!i)throw Error(n+` is not a valid compression method !`);return i}(n.options.compression,t.compression),s=n.options.compressionOptions||t.compressionOptions||{},c=n.dir,l=n.date;n._compressWorker(i,s).withStreamInfo(`file`,{name:e,dir:c,date:l,comment:n.comment||``,unixPermissions:n.unixPermissions,dosPermissions:n.dosPermissions}).pipe(a)}),a.entriesCount=o}catch(e){a.error(e)}return a}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,n){function r(){if(!(this instanceof r))return new r;if(arguments.length)throw Error(`The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.`);this.files=Object.create(null),this.comment=null,this.root=``,this.clone=function(){var e=new r;for(var t in this)typeof this[t]!=`function`&&(e[t]=this[t]);return e}}(r.prototype=e(`./object`)).loadAsync=e(`./load`),r.support=e(`./support`),r.defaults=e(`./defaults`),r.version=`3.10.2`,r.loadAsync=function(e,t){return new r().loadAsync(e,t)},r.external=e(`./external`),t.exports=r},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,n){var r=e(`./utils`),i=e(`./external`),a=e(`./utf8`),o=e(`./zipEntries`),s=e(`./stream/Crc32Probe`),c=e(`./nodejsUtils`);function l(e){return new i.Promise(function(t,n){var r=e.decompressed.getContentWorker().pipe(new s);r.on(`error`,function(e){n(e)}).on(`end`,function(){r.streamInfo.crc32===e.decompressed.crc32?t():n(Error(`Corrupted zip : CRC32 mismatch`))}).resume()})}t.exports=function(e,t){var n=this;return t=r.extend(t||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:a.utf8decode}),c.isNode&&c.isStream(e)?i.Promise.reject(Error(`JSZip can't accept a stream when loading a zip file.`)):r.prepareContent(`the loaded zip file`,e,!0,t.optimizedBinaryString,t.base64).then(function(e){var n=new o(t);return n.load(e),n}).then(function(e){var n=[i.Promise.resolve(e)],r=e.files;if(t.checkCRC32)for(var a=0;a<r.length;a++)n.push(l(r[a]));return i.Promise.all(n)}).then(function(e){for(var i=e.shift(),a=i.files,o=0;o<a.length;o++){var s=a[o],c=s.fileNameStr,l=r.resolve(s.fileNameStr);n.file(l,s.decompressed,{binary:!0,optimizedBinaryString:!0,date:s.date,dir:s.dir,comment:s.fileCommentStr.length?s.fileCommentStr:null,unixPermissions:s.unixPermissions,dosPermissions:s.dosPermissions,createFolders:t.createFolders}),s.dir||(n.file(l).unsafeOriginalName=c)}return i.zipComment.length&&(n.comment=i.zipComment),n})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,n){var r=e(`../utils`),i=e(`../stream/GenericWorker`);function a(e,t){i.call(this,`Nodejs stream input adapter for `+e),this._upstreamEnded=!1,this._bindStream(t)}r.inherits(a,i),a.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on(`data`,function(e){t.push({data:e,meta:{percent:0}})}).on(`error`,function(e){t.isPaused?this.generatedError=e:t.error(e)}).on(`end`,function(){t.isPaused?t._upstreamEnded=!0:t.end()})},a.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},a.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=a},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,n){var r=e(`readable-stream`).Readable;function i(e,t,n){r.call(this,t),this._helper=e;var i=this;e.on(`data`,function(e,t){i.push(e)||i._helper.pause(),n&&n(t)}).on(`error`,function(e){i.emit(`error`,e)}).on(`end`,function(){i.push(null)})}e(`../utils`).inherits(i,r),i.prototype._read=function(){this._helper.resume()},t.exports=i},{"../utils":32,"readable-stream":16}],14:[function(e,t,n){t.exports={isNode:typeof Buffer<`u`,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if(typeof e==`number`)throw Error(`The "data" argument must not be a number`);return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&typeof e.on==`function`&&typeof e.pause==`function`&&typeof e.resume==`function`}}},{}],15:[function(e,t,n){function r(e,t,n){var r,i=a.getTypeOf(t),s=a.extend(n||{},c);s.date=s.date||new Date,s.compression!==null&&(s.compression=s.compression.toUpperCase()),typeof s.unixPermissions==`string`&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=h(e)),s.createFolders&&(r=m(e))&&g.call(this,r,!0);var d=i===`string`&&!1===s.binary&&!1===s.base64;n&&n.binary!==void 0||(s.binary=!d),(t instanceof l&&t.uncompressedSize===0||s.dir||!t||t.length===0)&&(s.base64=!1,s.binary=!0,t=``,s.compression=`STORE`,i=`string`);var _=null;_=t instanceof l||t instanceof o?t:f.isNode&&f.isStream(t)?new p(e,t):a.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var v=new u(e,_,s);this.files[e]=v}var i=e(`./utf8`),a=e(`./utils`),o=e(`./stream/GenericWorker`),s=e(`./stream/StreamHelper`),c=e(`./defaults`),l=e(`./compressedObject`),u=e(`./zipObject`),d=e(`./generate`),f=e(`./nodejsUtils`),p=e(`./nodejs/NodejsStreamInputAdapter`),m=function(e){e.slice(-1)===`/`&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf(`/`);return 0<t?e.substring(0,t):``},h=function(e){return e.slice(-1)!==`/`&&(e+=`/`),e},g=function(e,t){return t=t===void 0?c.createFolders:t,e=h(e),this.files[e]||r.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function _(e){return Object.prototype.toString.call(e)===`[object RegExp]`}t.exports={load:function(){throw Error(`This method has been removed in JSZip 3.0, please check the upgrade guide.`)},forEach:function(e){var t,n,r;for(t in this.files)r=this.files[t],(n=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(n,r)},filter:function(e){var t=[];return this.forEach(function(n,r){e(n,r)&&t.push(r)}),t},file:function(e,t,n){if(arguments.length!==1)return e=this.root+e,r.call(this,e,t,n),this;if(_(e)){var i=e;return this.filter(function(e,t){return!t.dir&&i.test(e)})}var a=this.files[this.root+e];return a&&!a.dir?a:null},folder:function(e){if(!e)return this;if(_(e))return this.filter(function(t,n){return n.dir&&e.test(t)});var t=this.root+e,n=g.call(this,t),r=this.clone();return r.root=n.name,r},remove:function(e){e=this.root+e;var t=this.files[e];if(t||=(e.slice(-1)!==`/`&&(e+=`/`),this.files[e]),t&&!t.dir)delete this.files[e];else for(var n=this.filter(function(t,n){return n.name.slice(0,e.length)===e}),r=0;r<n.length;r++)delete this.files[n[r].name];return this},generate:function(){throw Error(`This method has been removed in JSZip 3.0, please check the upgrade guide.`)},generateInternalStream:function(e){var t,n={};try{if((n=a.extend(e||{},{streamFiles:!1,compression:`STORE`,compressionOptions:null,type:``,platform:`DOS`,comment:null,mimeType:`application/zip`,encodeFileName:i.utf8encode})).type=n.type.toLowerCase(),n.compression=n.compression.toUpperCase(),n.type===`binarystring`&&(n.type=`string`),!n.type)throw Error(`No output type specified.`);a.checkSupport(n.type),n.platform!==`darwin`&&n.platform!==`freebsd`&&n.platform!==`linux`&&n.platform!==`sunos`||(n.platform=`UNIX`),n.platform===`win32`&&(n.platform=`DOS`);var r=n.comment||this.comment||``;t=d.generateWorker(this,n,r)}catch(e){(t=new o(`error`)).error(e)}return new s(t,n.type||`string`,n.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e||={}).type||(e.type=`nodebuffer`),this.generateInternalStream(e).toNodejsStream(t)}}},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,n){t.exports=e(`stream`)},{stream:void 0}],17:[function(e,t,n){var r=e(`./DataReader`);function i(e){r.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e(`../utils`).inherits(i,r),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),n=e.charCodeAt(1),r=e.charCodeAt(2),i=e.charCodeAt(3),a=this.length-4;0<=a;--a)if(this.data[a]===t&&this.data[a+1]===n&&this.data[a+2]===r&&this.data[a+3]===i)return a-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),n=e.charCodeAt(1),r=e.charCodeAt(2),i=e.charCodeAt(3),a=this.readData(4);return t===a[0]&&n===a[1]&&r===a[2]&&i===a[3]},i.prototype.readData=function(e){if(this.checkOffset(e),e===0)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,n){var r=e(`../utils`);function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw Error(`End of data reached (data length = `+this.length+`, asked index = `+e+`). Corrupted zip ?`)},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,n=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)n=(n<<8)+this.byteAt(t);return this.index+=e,n},readString:function(e){return r.transformTo(`string`,this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,n){var r=e(`./Uint8ArrayReader`);function i(e){r.call(this,e)}e(`../utils`).inherits(i,r),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,n){var r=e(`./DataReader`);function i(e){r.call(this,e)}e(`../utils`).inherits(i,r),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,n){var r=e(`./ArrayReader`);function i(e){r.call(this,e)}e(`../utils`).inherits(i,r),i.prototype.readData=function(e){if(this.checkOffset(e),e===0)return new Uint8Array;var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,n){var r=e(`../utils`),i=e(`../support`),a=e(`./ArrayReader`),o=e(`./StringReader`),s=e(`./NodeBufferReader`),c=e(`./Uint8ArrayReader`);t.exports=function(e){var t=r.getTypeOf(e);return r.checkSupport(t),t!==`string`||i.uint8array?t===`nodebuffer`?new s(e):i.uint8array?new c(r.transformTo(`uint8array`,e)):new a(r.transformTo(`array`,e)):new o(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,n){n.LOCAL_FILE_HEADER=`PK`,n.CENTRAL_FILE_HEADER=`PK`,n.CENTRAL_DIRECTORY_END=`PK`,n.ZIP64_CENTRAL_DIRECTORY_LOCATOR=`PK\x07`,n.ZIP64_CENTRAL_DIRECTORY_END=`PK`,n.DATA_DESCRIPTOR=`PK\x07\b`},{}],24:[function(e,t,n){var r=e(`./GenericWorker`),i=e(`../utils`);function a(e){r.call(this,`ConvertWorker to `+e),this.destType=e}i.inherits(a,r),a.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=a},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,n){var r=e(`./GenericWorker`),i=e(`../crc32`);function a(){r.call(this,`Crc32Probe`),this.withStreamInfo(`crc32`,0)}e(`../utils`).inherits(a,r),a.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=a},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,n){var r=e(`../utils`),i=e(`./GenericWorker`);function a(e){i.call(this,`DataLengthProbe for `+e),this.propName=e,this.withStreamInfo(e,0)}r.inherits(a,i),a.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=a},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,n){var r=e(`../utils`),i=e(`./GenericWorker`);function a(e){i.call(this,`DataWorker`);var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type=``,this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=r.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}r.inherits(a,i),a.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},a.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,r.delay(this._tickAndRepeat,[],this)),!0)},a.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(r.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},a.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case`string`:e=this.data.substring(this.index,t);break;case`uint8array`:e=this.data.subarray(this.index,t);break;case`array`:case`nodebuffer`:e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=a},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,n){function r(e){this.name=e||`default`,this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}r.prototype={push:function(e){this.emit(`data`,e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit(`end`),this.cleanUp(),this.isFinished=!0}catch(e){this.emit(`error`,e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit(`error`,e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var n=0;n<this._listeners[e].length;n++)this._listeners[e][n].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw Error(`The stream '`+this+`' has already been used.`);this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on(`data`,function(e){t.processChunk(e)}),e.on(`end`,function(){t.end()}),e.on(`error`,function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw Error(`The stream '`+this+`' has already been used.`);this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e=`Worker `+this.name;return this.previous?this.previous+` -> `+e:e}},t.exports=r},{}],29:[function(e,t,n){var r=e(`../utils`),i=e(`./ConvertWorker`),a=e(`./GenericWorker`),o=e(`../base64`),s=e(`../support`),c=e(`../external`),l=null;if(s.nodestream)try{l=e(`../nodejs/NodejsStreamOutputAdapter`)}catch{}function u(e,t){return new c.Promise(function(n,i){var a=[],s=e._internalType,c=e._outputType,l=e._mimeType;e.on(`data`,function(e,n){a.push(e),t&&t(n)}).on(`error`,function(e){a=[],i(e)}).on(`end`,function(){try{n(function(e,t,n){switch(e){case`blob`:return r.newBlob(r.transformTo(`arraybuffer`,t),n);case`base64`:return o.encode(t);default:return r.transformTo(e,t)}}(c,function(e,t){var n,r=0,i=null,a=0;for(n=0;n<t.length;n++)a+=t[n].length;switch(e){case`string`:return t.join(``);case`array`:return Array.prototype.concat.apply([],t);case`uint8array`:for(i=new Uint8Array(a),n=0;n<t.length;n++)i.set(t[n],r),r+=t[n].length;return i;case`nodebuffer`:return Buffer.concat(t);default:throw Error(`concat : unsupported type '`+e+`'`)}}(s,a),l))}catch(e){i(e)}a=[]}).resume()})}function d(e,t,n){var o=t;switch(t){case`blob`:case`arraybuffer`:o=`uint8array`;break;case`base64`:o=`string`}try{this._internalType=o,this._outputType=t,this._mimeType=n,r.checkSupport(o),this._worker=e.pipe(new i(o)),e.lock()}catch(e){this._worker=new a(`error`),this._worker.error(e)}}d.prototype={accumulate:function(e){return u(this,e)},on:function(e,t){var n=this;return e===`data`?this._worker.on(e,function(e){t.call(n,e.data,e.meta)}):this._worker.on(e,function(){r.delay(t,arguments,n)}),this},resume:function(){return r.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(r.checkSupport(`nodestream`),this._outputType!==`nodebuffer`)throw Error(this._outputType+` is not supported by this method`);return new l(this,{objectMode:this._outputType!==`nodebuffer`},e)}},t.exports=d},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,n){if(n.base64=!0,n.array=!0,n.string=!0,n.arraybuffer=typeof ArrayBuffer<`u`&&typeof Uint8Array<`u`,n.nodebuffer=typeof Buffer<`u`,n.uint8array=typeof Uint8Array<`u`,typeof ArrayBuffer>`u`)n.blob=!1;else{var r=new ArrayBuffer(0);try{n.blob=new Blob([r],{type:`application/zip`}).size===0}catch{try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(r),n.blob=i.getBlob(`application/zip`).size===0}catch{n.blob=!1}}}try{n.nodestream=!!e(`readable-stream`).Readable}catch{n.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,n){for(var r=e(`./utils`),i=e(`./support`),a=e(`./nodejsUtils`),o=e(`./stream/GenericWorker`),s=Array(256),c=0;c<256;c++)s[c]=252<=c?6:248<=c?5:240<=c?4:224<=c?3:192<=c?2:1;s[254]=s[254]=1;function l(){o.call(this,`utf-8 decode`),this.leftOver=null}function u(){o.call(this,`utf-8 encode`)}n.utf8encode=function(e){return i.nodebuffer?a.newBufferFrom(e,`utf-8`):function(e){var t,n,r,a,o,s=e.length,c=0;for(a=0;a<s;a++)(64512&(n=e.charCodeAt(a)))==55296&&a+1<s&&(64512&(r=e.charCodeAt(a+1)))==56320&&(n=65536+(n-55296<<10)+(r-56320),a++),c+=n<128?1:n<2048?2:n<65536?3:4;for(t=i.uint8array?new Uint8Array(c):Array(c),a=o=0;o<c;a++)(64512&(n=e.charCodeAt(a)))==55296&&a+1<s&&(64512&(r=e.charCodeAt(a+1)))==56320&&(n=65536+(n-55296<<10)+(r-56320),a++),n<128?t[o++]=n:(n<2048?t[o++]=192|n>>>6:(n<65536?t[o++]=224|n>>>12:(t[o++]=240|n>>>18,t[o++]=128|n>>>12&63),t[o++]=128|n>>>6&63),t[o++]=128|63&n);return t}(e)},n.utf8decode=function(e){return i.nodebuffer?r.transformTo(`nodebuffer`,e).toString(`utf-8`):function(e){var t,n,i,a,o=e.length,c=Array(2*o);for(t=n=0;t<o;)if((i=e[t++])<128)c[n++]=i;else if(4<(a=s[i]))c[n++]=65533,t+=a-1;else{for(i&=a===2?31:a===3?15:7;1<a&&t<o;)i=i<<6|63&e[t++],a--;1<a?c[n++]=65533:i<65536?c[n++]=i:(i-=65536,c[n++]=55296|i>>10&1023,c[n++]=56320|1023&i)}return c.length!==n&&(c.subarray?c=c.subarray(0,n):c.length=n),r.applyFromCharCode(c)}(e=r.transformTo(i.uint8array?`uint8array`:`array`,e))},r.inherits(l,o),l.prototype.processChunk=function(e){var t=r.transformTo(i.uint8array?`uint8array`:`array`,e.data);if(this.leftOver&&this.leftOver.length){if(i.uint8array){var a=t;(t=new Uint8Array(a.length+this.leftOver.length)).set(this.leftOver,0),t.set(a,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var o=function(e,t){var n;for((t||=e.length)>e.length&&(t=e.length),n=t-1;0<=n&&(192&e[n])==128;)n--;return n<0||n===0?t:n+s[e[n]]>t?n:t}(t),c=t;o!==t.length&&(i.uint8array?(c=t.subarray(0,o),this.leftOver=t.subarray(o,t.length)):(c=t.slice(0,o),this.leftOver=t.slice(o,t.length))),this.push({data:n.utf8decode(c),meta:e.meta})},l.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:n.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},n.Utf8DecodeWorker=l,r.inherits(u,o),u.prototype.processChunk=function(e){this.push({data:n.utf8encode(e.data),meta:e.meta})},n.Utf8EncodeWorker=u},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,n){var r=e(`./support`),i=e(`./base64`),a=e(`./nodejsUtils`),o=e(`./external`);function s(e){return e}function c(e,t){for(var n=0;n<e.length;++n)t[n]=255&e.charCodeAt(n);return t}e(`setimmediate`),n.newBlob=function(e,t){n.checkSupport(`blob`);try{return new Blob([e],{type:t})}catch{try{var r=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return r.append(e),r.getBlob(t)}catch{throw Error(`Bug : can't construct the Blob.`)}}};var l={stringifyByChunk:function(e,t,n){var r=[],i=0,a=e.length;if(a<=n)return String.fromCharCode.apply(null,e);for(;i<a;)t===`array`||t===`nodebuffer`?r.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+n,a)))):r.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+n,a)))),i+=n;return r.join(``)},stringifyByChar:function(e){for(var t=``,n=0;n<e.length;n++)t+=String.fromCharCode(e[n]);return t},applyCanBeUsed:{uint8array:function(){try{return r.uint8array&&String.fromCharCode.apply(null,new Uint8Array(1)).length===1}catch{return!1}}(),nodebuffer:function(){try{return r.nodebuffer&&String.fromCharCode.apply(null,a.allocBuffer(1)).length===1}catch{return!1}}()}};function u(e){var t=65536,r=n.getTypeOf(e),i=!0;if(r===`uint8array`?i=l.applyCanBeUsed.uint8array:r===`nodebuffer`&&(i=l.applyCanBeUsed.nodebuffer),i)for(;1<t;)try{return l.stringifyByChunk(e,r,t)}catch{t=Math.floor(t/2)}return l.stringifyByChar(e)}function d(e,t){for(var n=0;n<e.length;n++)t[n]=e[n];return t}n.applyFromCharCode=u;var f={};f.string={string:s,array:function(e){return c(e,Array(e.length))},arraybuffer:function(e){return f.string.uint8array(e).buffer},uint8array:function(e){return c(e,new Uint8Array(e.length))},nodebuffer:function(e){return c(e,a.allocBuffer(e.length))}},f.array={string:u,array:s,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return a.newBufferFrom(e)}},f.arraybuffer={string:function(e){return u(new Uint8Array(e))},array:function(e){return d(new Uint8Array(e),Array(e.byteLength))},arraybuffer:s,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return a.newBufferFrom(new Uint8Array(e))}},f.uint8array={string:u,array:function(e){return d(e,Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:s,nodebuffer:function(e){return a.newBufferFrom(e)}},f.nodebuffer={string:u,array:function(e){return d(e,Array(e.length))},arraybuffer:function(e){return f.nodebuffer.uint8array(e).buffer},uint8array:function(e){return d(e,new Uint8Array(e.length))},nodebuffer:s},n.transformTo=function(e,t){return t||=``,e?(n.checkSupport(e),f[n.getTypeOf(t)][e](t)):t},n.resolve=function(e){for(var t=e.split(`/`),n=[],r=0;r<t.length;r++){var i=t[r];i===`.`||i===``&&r!==0&&r!==t.length-1||(i===`..`?n.pop():n.push(i))}return n.join(`/`)},n.getTypeOf=function(e){if(typeof e==`string`)return`string`;var t=Object.prototype.toString.call(e);return t===`[object Array]`?`array`:r.nodebuffer&&a.isBuffer(e)?`nodebuffer`:r.uint8array&&t===`[object Uint8Array]`?`uint8array`:r.arraybuffer&&t===`[object ArrayBuffer]`?`arraybuffer`:void 0},n.checkSupport=function(e){if(!r[e.toLowerCase()])throw Error(e+` is not supported by this platform`)},n.MAX_VALUE_16BITS=65535,n.MAX_VALUE_32BITS=-1,n.pretty=function(e){var t,n,r=``;for(n=0;n<(e||``).length;n++)r+=`\\x`+((t=e.charCodeAt(n))<16?`0`:``)+t.toString(16).toUpperCase();return r},n.delay=function(e,t,n){setImmediate(function(){e.apply(n||null,t||[])})},n.inherits=function(e,t){function n(){}n.prototype=t.prototype,e.prototype=new n},n.extend=function(){var e,t,n={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&n[t]===void 0&&(n[t]=arguments[e][t]);return n},n.prepareContent=function(e,t,a,s,l){return o.Promise.resolve(t).then(function(t){return r.blob&&(t instanceof Blob||[`[object File]`,`[object Blob]`].indexOf(Object.prototype.toString.call(t))!==-1)?Blob.prototype.arrayBuffer===void 0?typeof FileReader<`u`?new o.Promise(function(e,n){var r=new FileReader;r.onload=function(t){e(t.target.result)},r.onerror=function(e){n(e.target.error)},r.readAsArrayBuffer(t)}):o.Promise.reject(Error(e+` is a Blob, but we have no way of reading it.`)):t.arrayBuffer():t}).then(function(t){var u=n.getTypeOf(t);return u?(u===`arraybuffer`?t=n.transformTo(`uint8array`,t):u===`string`&&(l?t=i.decode(t):a&&!0!==s&&(t=function(e){return c(e,r.uint8array?new Uint8Array(e.length):Array(e.length))}(t))),t):o.Promise.reject(Error(`Can't read the data of '`+e+`'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?`))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,n){var r=e(`./reader/readerFor`),i=e(`./utils`),a=e(`./signature`),o=e(`./zipEntry`),s=e(`./support`);function c(e){this.files=[],this.loadOptions=e}c.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw Error(`Corrupted zip or bug: unexpected signature (`+i.pretty(t)+`, expected `+i.pretty(e)+`)`)}},isSignature:function(e,t){var n=this.reader.index;this.reader.setIndex(e);var r=this.reader.readString(4)===t;return this.reader.setIndex(n),r},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=s.uint8array?`uint8array`:`array`,n=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(n)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,n,r=this.zip64EndOfCentralSize-44;0<r;)e=this.reader.readInt(2),t=this.reader.readInt(4),n=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:n}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw Error(`Multi-volumes zip are not supported`)},readLocalFiles:function(){for(var e=0,t;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(a.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(a.CENTRAL_FILE_HEADER);)(e=new o({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&this.centralDirRecords!==0&&this.files.length===0)throw Error(`Corrupted zip or bug: expected `+this.centralDirRecords+` records in central dir, got `+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(a.CENTRAL_DIRECTORY_END);if(e<0)throw this.isSignature(0,a.LOCAL_FILE_HEADER)?Error(`Corrupted zip: can't find end of central directory`):Error(`Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html`);this.reader.setIndex(e);var t=e;if(this.checkSignature(a.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw Error(`Corrupted zip: can't find the ZIP64 end of central directory locator`);if(this.reader.setIndex(e),this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,a.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(a.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw Error(`Corrupted zip: can't find the ZIP64 end of central directory`);this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(a.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var n=this.centralDirOffset+this.centralDirSize;this.zip64&&(n+=20,n+=12+this.zip64EndOfCentralSize);var r=t-n;if(0<r)this.isSignature(t,a.CENTRAL_FILE_HEADER)||(this.reader.zero=r);else if(r<0)throw Error(`Corrupted zip: missing `+Math.abs(r)+` bytes.`)},prepareReader:function(e){this.reader=r(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=c},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,n){var r=e(`./reader/readerFor`),i=e(`./utils`),a=e(`./compressedObject`),o=e(`./crc32`),s=e(`./utf8`),c=e(`./compressions`),l=e(`./support`);function u(e,t){this.options=e,this.loadOptions=t}u.prototype={isEncrypted:function(){return(1&this.bitFlag)==1},useUTF8:function(){return(2048&this.bitFlag)==2048},readLocalPart:function(e){var t,n;if(e.skip(22),this.fileNameLength=e.readInt(2),n=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(n),this.compressedSize===-1||this.uncompressedSize===-1)throw Error(`Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)`);if((t=function(e){for(var t in c)if(Object.prototype.hasOwnProperty.call(c,t)&&c[t].magic===e)return c[t];return null}(this.compressionMethod))===null)throw Error(`Corrupted zip : compression `+i.pretty(this.compressionMethod)+` unknown (inner file : `+i.transformTo(`string`,this.fileName)+`)`);this.decompressed=new a(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw Error(`Encrypted zip are not supported`);e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),e==0&&(this.dosPermissions=63&this.externalFileAttributes),e==3&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||this.fileNameStr.slice(-1)!==`/`||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=r(this.extraFields[1].value);this.uncompressedSize===i.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===i.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===i.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===i.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,n,r,i=e.index+this.extraFieldsLength;for(this.extraFields||={};e.index+4<i;)t=e.readInt(2),n=e.readInt(2),r=e.readData(n),this.extraFields[t]={id:t,length:n,value:r};e.setIndex(i)},handleUTF8:function(){var e=l.uint8array?`uint8array`:`array`;if(this.useUTF8())this.fileNameStr=s.utf8decode(this.fileName),this.fileCommentStr=s.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(t!==null)this.fileNameStr=t;else{var n=i.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(n)}var r=this.findExtraFieldUnicodeComment();if(r!==null)this.fileCommentStr=r;else{var a=i.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(a)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=r(e.value);return t.readInt(1)===1&&o(this.fileName)===t.readInt(4)?s.utf8decode(t.readData(e.length-5)):null}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=r(e.value);return t.readInt(1)===1&&o(this.fileComment)===t.readInt(4)?s.utf8decode(t.readData(e.length-5)):null}return null}},t.exports=u},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,n){function r(e,t,n){this.name=e,this.dir=n.dir,this.date=n.date,this.comment=n.comment,this.unixPermissions=n.unixPermissions,this.dosPermissions=n.dosPermissions,this._data=t,this._dataBinary=n.binary,this.options={compression:n.compression,compressionOptions:n.compressionOptions}}var i=e(`./stream/StreamHelper`),a=e(`./stream/DataWorker`),o=e(`./utf8`),s=e(`./compressedObject`),c=e(`./stream/GenericWorker`);r.prototype={internalStream:function(e){var t=null,n=`string`;try{if(!e)throw Error(`No output type specified.`);var r=(n=e.toLowerCase())===`string`||n===`text`;n!==`binarystring`&&n!==`text`||(n=`string`),t=this._decompressWorker();var a=!this._dataBinary;a&&!r&&(t=t.pipe(new o.Utf8EncodeWorker)),!a&&r&&(t=t.pipe(new o.Utf8DecodeWorker))}catch(e){(t=new c(`error`)).error(e)}return new i(t,n,``)},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||`nodebuffer`).toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof s&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var n=this._decompressWorker();return this._dataBinary||(n=n.pipe(new o.Utf8EncodeWorker)),s.createWorkerFrom(n,e,t)},_decompressWorker:function(){return this._data instanceof s?this._data.getContentWorker():this._data instanceof c?this._data:new a(this._data)}};for(var l=[`asText`,`asBinary`,`asNodeBuffer`,`asUint8Array`,`asArrayBuffer`],u=function(){throw Error(`This method has been removed in JSZip 3.0, please check the upgrade guide.`)},d=0;d<l.length;d++)r.prototype[l[d]]=u;t.exports=r},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,t,n){(function(e){var n,r,i=e.MutationObserver||e.WebKitMutationObserver;if(i){var a=0,o=new i(u),s=e.document.createTextNode(``);o.observe(s,{characterData:!0}),n=function(){s.data=a=++a%2}}else if(e.setImmediate||e.MessageChannel===void 0)n=`document`in e&&`onreadystatechange`in e.document.createElement(`script`)?function(){var t=e.document.createElement(`script`);t.onreadystatechange=function(){u(),t.onreadystatechange=null,t.parentNode.removeChild(t),t=null},e.document.documentElement.appendChild(t)}:function(){setTimeout(u,0)};else{var c=new e.MessageChannel;c.port1.onmessage=u,n=function(){c.port2.postMessage(0)}}var l=[];function u(){var e,t;r=!0;for(var n=l.length;n;){for(t=l,l=[],e=-1;++e<n;)t[e]();n=l.length}r=!1}t.exports=function(e){l.push(e)!==1||r||n()}}).call(this,typeof global<`u`?global:typeof self<`u`?self:typeof window<`u`?window:{})},{}],37:[function(e,t,n){var r=e(`immediate`);function i(){}var a={},o=[`REJECTED`],s=[`FULFILLED`],c=[`PENDING`];function l(e){if(typeof e!=`function`)throw TypeError(`resolver must be a function`);this.state=c,this.queue=[],this.outcome=void 0,e!==i&&p(this,e)}function u(e,t,n){this.promise=e,typeof t==`function`&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),typeof n==`function`&&(this.onRejected=n,this.callRejected=this.otherCallRejected)}function d(e,t,n){r(function(){var r;try{r=t(n)}catch(t){return a.reject(e,t)}r===e?a.reject(e,TypeError(`Cannot resolve promise with itself`)):a.resolve(e,r)})}function f(e){var t=e&&e.then;if(e&&(typeof e==`object`||typeof e==`function`)&&typeof t==`function`)return function(){t.apply(e,arguments)}}function p(e,t){var n=!1;function r(t){n||(n=!0,a.reject(e,t))}function i(t){n||(n=!0,a.resolve(e,t))}var o=m(function(){t(i,r)});o.status===`error`&&r(o.value)}function m(e,t){var n={};try{n.value=e(t),n.status=`success`}catch(e){n.status=`error`,n.value=e}return n}(t.exports=l).prototype.finally=function(e){if(typeof e!=`function`)return this;var t=this.constructor;return this.then(function(n){return t.resolve(e()).then(function(){return n})},function(n){return t.resolve(e()).then(function(){throw n})})},l.prototype.catch=function(e){return this.then(null,e)},l.prototype.then=function(e,t){if(typeof e!=`function`&&this.state===s||typeof t!=`function`&&this.state===o)return this;var n=new this.constructor(i);return this.state===c?this.queue.push(new u(n,e,t)):d(n,this.state===s?e:t,this.outcome),n},u.prototype.callFulfilled=function(e){a.resolve(this.promise,e)},u.prototype.otherCallFulfilled=function(e){d(this.promise,this.onFulfilled,e)},u.prototype.callRejected=function(e){a.reject(this.promise,e)},u.prototype.otherCallRejected=function(e){d(this.promise,this.onRejected,e)},a.resolve=function(e,t){var n=m(f,t);if(n.status===`error`)return a.reject(e,n.value);var r=n.value;if(r)p(e,r);else{e.state=s,e.outcome=t;for(var i=-1,o=e.queue.length;++i<o;)e.queue[i].callFulfilled(t)}return e},a.reject=function(e,t){e.state=o,e.outcome=t;for(var n=-1,r=e.queue.length;++n<r;)e.queue[n].callRejected(t);return e},l.resolve=function(e){return e instanceof this?e:a.resolve(new this(i),e)},l.reject=function(e){var t=new this(i);return a.reject(t,e)},l.all=function(e){var t=this;if(Object.prototype.toString.call(e)!==`[object Array]`)return this.reject(TypeError(`must be an array`));var n=e.length,r=!1;if(!n)return this.resolve([]);for(var o=Array(n),s=0,c=-1,l=new this(i);++c<n;)u(e[c],c);return l;function u(e,i){t.resolve(e).then(function(e){o[i]=e,++s!==n||r||(r=!0,a.resolve(l,o))},function(e){r||(r=!0,a.reject(l,e))})}},l.race=function(e){var t=this;if(Object.prototype.toString.call(e)!==`[object Array]`)return this.reject(TypeError(`must be an array`));var n=e.length,r=!1;if(!n)return this.resolve([]);for(var o=-1,s=new this(i);++o<n;)c=e[o],t.resolve(c).then(function(e){r||(r=!0,a.resolve(s,e))},function(e){r||(r=!0,a.reject(s,e))});var c;return s}},{immediate:36}],38:[function(e,t,n){var r={};(0,e(`./lib/utils/common`).assign)(r,e(`./lib/deflate`),e(`./lib/inflate`),e(`./lib/zlib/constants`)),t.exports=r},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,n){var r=e(`./zlib/deflate`),i=e(`./utils/common`),a=e(`./utils/strings`),o=e(`./zlib/messages`),s=e(`./zlib/zstream`),c=Object.prototype.toString,l=0,u=-1,d=0,f=8;function p(e){if(!(this instanceof p))return new p(e);this.options=i.assign({level:u,method:f,chunkSize:16384,windowBits:15,memLevel:8,strategy:d,to:``},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg=``,this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var n=r.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(n!==l)throw Error(o[n]);if(t.header&&r.deflateSetHeader(this.strm,t.header),t.dictionary){var m=typeof t.dictionary==`string`?a.string2buf(t.dictionary):c.call(t.dictionary)===`[object ArrayBuffer]`?new Uint8Array(t.dictionary):t.dictionary;if((n=r.deflateSetDictionary(this.strm,m))!==l)throw Error(o[n]);this._dict_set=!0}}function m(e,t){var n=new p(t);if(n.push(e,!0),n.err)throw n.msg||o[n.err];return n.result}p.prototype.push=function(e,t){var n,o,s=this.strm,u=this.options.chunkSize;if(this.ended)return!1;o=t===~~t?t:!0===t?4:0,s.input=typeof e==`string`?a.string2buf(e):c.call(e)===`[object ArrayBuffer]`?new Uint8Array(e):e,s.next_in=0,s.avail_in=s.input.length;do{if(s.avail_out===0&&(s.output=new i.Buf8(u),s.next_out=0,s.avail_out=u),(n=r.deflate(s,o))!==1&&n!==l)return this.onEnd(n),!(this.ended=!0);s.avail_out!==0&&(s.avail_in!==0||o!==4&&o!==2)||(this.options.to===`string`?this.onData(a.buf2binstring(i.shrinkBuf(s.output,s.next_out))):this.onData(i.shrinkBuf(s.output,s.next_out)))}while((0<s.avail_in||s.avail_out===0)&&n!==1);return o===4?(n=r.deflateEnd(this.strm),this.onEnd(n),this.ended=!0,n===l):o!==2||(this.onEnd(l),!(s.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&(this.result=this.options.to===`string`?this.chunks.join(``):i.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},n.Deflate=p,n.deflate=m,n.deflateRaw=function(e,t){return(t||={}).raw=!0,m(e,t)},n.gzip=function(e,t){return(t||={}).gzip=!0,m(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,n){var r=e(`./zlib/inflate`),i=e(`./utils/common`),a=e(`./utils/strings`),o=e(`./zlib/constants`),s=e(`./zlib/messages`),c=e(`./zlib/zstream`),l=e(`./zlib/gzheader`),u=Object.prototype.toString;function d(e){if(!(this instanceof d))return new d(e);this.options=i.assign({chunkSize:16384,windowBits:0,to:``},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,t.windowBits===0&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&!(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg=``,this.ended=!1,this.chunks=[],this.strm=new c,this.strm.avail_out=0;var n=r.inflateInit2(this.strm,t.windowBits);if(n!==o.Z_OK)throw Error(s[n]);this.header=new l,r.inflateGetHeader(this.strm,this.header)}function f(e,t){var n=new d(t);if(n.push(e,!0),n.err)throw n.msg||s[n.err];return n.result}d.prototype.push=function(e,t){var n,s,c,l,d,f,p=this.strm,m=this.options.chunkSize,h=this.options.dictionary,g=!1;if(this.ended)return!1;s=t===~~t?t:!0===t?o.Z_FINISH:o.Z_NO_FLUSH,p.input=typeof e==`string`?a.binstring2buf(e):u.call(e)===`[object ArrayBuffer]`?new Uint8Array(e):e,p.next_in=0,p.avail_in=p.input.length;do{if(p.avail_out===0&&(p.output=new i.Buf8(m),p.next_out=0,p.avail_out=m),(n=r.inflate(p,o.Z_NO_FLUSH))===o.Z_NEED_DICT&&h&&(f=typeof h==`string`?a.string2buf(h):u.call(h)===`[object ArrayBuffer]`?new Uint8Array(h):h,n=r.inflateSetDictionary(this.strm,f)),n===o.Z_BUF_ERROR&&!0===g&&(n=o.Z_OK,g=!1),n!==o.Z_STREAM_END&&n!==o.Z_OK)return this.onEnd(n),!(this.ended=!0);p.next_out&&(p.avail_out!==0&&n!==o.Z_STREAM_END&&(p.avail_in!==0||s!==o.Z_FINISH&&s!==o.Z_SYNC_FLUSH)||(this.options.to===`string`?(c=a.utf8border(p.output,p.next_out),l=p.next_out-c,d=a.buf2string(p.output,c),p.next_out=l,p.avail_out=m-l,l&&i.arraySet(p.output,p.output,c,l,0),this.onData(d)):this.onData(i.shrinkBuf(p.output,p.next_out)))),p.avail_in===0&&p.avail_out===0&&(g=!0)}while((0<p.avail_in||p.avail_out===0)&&n!==o.Z_STREAM_END);return n===o.Z_STREAM_END&&(s=o.Z_FINISH),s===o.Z_FINISH?(n=r.inflateEnd(this.strm),this.onEnd(n),this.ended=!0,n===o.Z_OK):s!==o.Z_SYNC_FLUSH||(this.onEnd(o.Z_OK),!(p.avail_out=0))},d.prototype.onData=function(e){this.chunks.push(e)},d.prototype.onEnd=function(e){e===o.Z_OK&&(this.result=this.options.to===`string`?this.chunks.join(``):i.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},n.Inflate=d,n.inflate=f,n.inflateRaw=function(e,t){return(t||={}).raw=!0,f(e,t)},n.ungzip=f},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,n){var r=typeof Uint8Array<`u`&&typeof Uint16Array<`u`&&typeof Int32Array<`u`;n.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var n=t.shift();if(n){if(typeof n!=`object`)throw TypeError(n+`must be non-object`);for(var r in n)n.hasOwnProperty(r)&&(e[r]=n[r])}}return e},n.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,n,r,i){if(t.subarray&&e.subarray)e.set(t.subarray(n,n+r),i);else for(var a=0;a<r;a++)e[i+a]=t[n+a]},flattenChunks:function(e){for(var t=r=0,n=e.length,r,i,a,o;t<n;t++)r+=e[t].length;for(o=new Uint8Array(r),t=i=0,n=e.length;t<n;t++)a=e[t],o.set(a,i),i+=a.length;return o}},a={arraySet:function(e,t,n,r,i){for(var a=0;a<r;a++)e[i+a]=t[n+a]},flattenChunks:function(e){return[].concat.apply([],e)}};n.setTyped=function(e){e?(n.Buf8=Uint8Array,n.Buf16=Uint16Array,n.Buf32=Int32Array,n.assign(n,i)):(n.Buf8=Array,n.Buf16=Array,n.Buf32=Array,n.assign(n,a))},n.setTyped(r)},{}],42:[function(e,t,n){var r=e(`./common`),i=!0,a=!0;try{String.fromCharCode.apply(null,[0])}catch{i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch{a=!1}for(var o=new r.Buf8(256),s=0;s<256;s++)o[s]=252<=s?6:248<=s?5:240<=s?4:224<=s?3:192<=s?2:1;function c(e,t){if(t<65537&&(e.subarray&&a||!e.subarray&&i))return String.fromCharCode.apply(null,r.shrinkBuf(e,t));for(var n=``,o=0;o<t;o++)n+=String.fromCharCode(e[o]);return n}o[254]=o[254]=1,n.string2buf=function(e){var t,n,i,a,o,s=e.length,c=0;for(a=0;a<s;a++)(64512&(n=e.charCodeAt(a)))==55296&&a+1<s&&(64512&(i=e.charCodeAt(a+1)))==56320&&(n=65536+(n-55296<<10)+(i-56320),a++),c+=n<128?1:n<2048?2:n<65536?3:4;for(t=new r.Buf8(c),a=o=0;o<c;a++)(64512&(n=e.charCodeAt(a)))==55296&&a+1<s&&(64512&(i=e.charCodeAt(a+1)))==56320&&(n=65536+(n-55296<<10)+(i-56320),a++),n<128?t[o++]=n:(n<2048?t[o++]=192|n>>>6:(n<65536?t[o++]=224|n>>>12:(t[o++]=240|n>>>18,t[o++]=128|n>>>12&63),t[o++]=128|n>>>6&63),t[o++]=128|63&n);return t},n.buf2binstring=function(e){return c(e,e.length)},n.binstring2buf=function(e){for(var t=new r.Buf8(e.length),n=0,i=t.length;n<i;n++)t[n]=e.charCodeAt(n);return t},n.buf2string=function(e,t){var n,r,i,a,s=t||e.length,l=Array(2*s);for(n=r=0;n<s;)if((i=e[n++])<128)l[r++]=i;else if(4<(a=o[i]))l[r++]=65533,n+=a-1;else{for(i&=a===2?31:a===3?15:7;1<a&&n<s;)i=i<<6|63&e[n++],a--;1<a?l[r++]=65533:i<65536?l[r++]=i:(i-=65536,l[r++]=55296|i>>10&1023,l[r++]=56320|1023&i)}return c(l,r)},n.utf8border=function(e,t){var n;for((t||=e.length)>e.length&&(t=e.length),n=t-1;0<=n&&(192&e[n])==128;)n--;return n<0||n===0?t:n+o[e[n]]>t?n:t}},{"./common":41}],43:[function(e,t,n){t.exports=function(e,t,n,r){for(var i=65535&e|0,a=e>>>16&65535|0,o=0;n!==0;){for(n-=o=2e3<n?2e3:n;a=a+(i=i+t[r++]|0)|0,--o;);i%=65521,a%=65521}return i|a<<16|0}},{}],44:[function(e,t,n){t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,n){var r=function(){for(var e,t=[],n=0;n<256;n++){e=n;for(var r=0;r<8;r++)e=1&e?3988292384^e>>>1:e>>>1;t[n]=e}return t}();t.exports=function(e,t,n,i){var a=r,o=i+n;e^=-1;for(var s=i;s<o;s++)e=e>>>8^a[255&(e^t[s])];return-1^e}},{}],46:[function(e,t,n){var r,i=e(`../utils/common`),a=e(`./trees`),o=e(`./adler32`),s=e(`./crc32`),c=e(`./messages`),l=0,u=4,d=0,f=-2,p=-1,m=4,h=2,g=8,_=9,v=286,y=30,b=19,x=2*v+1,S=15,C=3,w=258,T=w+C+1,E=42,D=113,O=1,k=2,A=3,j=4;function M(e,t){return e.msg=c[t],t}function N(e){return(e<<1)-(4<e?9:0)}function P(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,n=t.pending;n>e.avail_out&&(n=e.avail_out),n!==0&&(i.arraySet(e.output,t.pending_buf,t.pending_out,n,e.next_out),e.next_out+=n,t.pending_out+=n,e.total_out+=n,e.avail_out-=n,t.pending-=n,t.pending===0&&(t.pending_out=0))}function I(e,t){a._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function L(e,t){e.pending_buf[e.pending++]=t}function R(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function z(e,t){var n,r,i=e.max_chain_length,a=e.strstart,o=e.prev_length,s=e.nice_match,c=e.strstart>e.w_size-T?e.strstart-(e.w_size-T):0,l=e.window,u=e.w_mask,d=e.prev,f=e.strstart+w,p=l[a+o-1],m=l[a+o];e.prev_length>=e.good_match&&(i>>=2),s>e.lookahead&&(s=e.lookahead);do if(l[(n=t)+o]===m&&l[n+o-1]===p&&l[n]===l[a]&&l[++n]===l[a+1]){a+=2,n++;do;while(l[++a]===l[++n]&&l[++a]===l[++n]&&l[++a]===l[++n]&&l[++a]===l[++n]&&l[++a]===l[++n]&&l[++a]===l[++n]&&l[++a]===l[++n]&&l[++a]===l[++n]&&a<f);if(r=w-(f-a),a=f-w,o<r){if(e.match_start=t,s<=(o=r))break;p=l[a+o-1],m=l[a+o]}}while((t=d[t&u])>c&&--i!=0);return o<=e.lookahead?o:e.lookahead}function B(e){var t,n,r,a,c,l,u,d,f,p,m=e.w_size;do{if(a=e.window_size-e.lookahead-e.strstart,e.strstart>=m+(m-T)){for(i.arraySet(e.window,e.window,m,m,0),e.match_start-=m,e.strstart-=m,e.block_start-=m,t=n=e.hash_size;r=e.head[--t],e.head[t]=m<=r?r-m:0,--n;);for(t=n=m;r=e.prev[--t],e.prev[t]=m<=r?r-m:0,--n;);a+=m}if(e.strm.avail_in===0)break;if(l=e.strm,u=e.window,d=e.strstart+e.lookahead,f=a,p=void 0,p=l.avail_in,f<p&&(p=f),n=p===0?0:(l.avail_in-=p,i.arraySet(u,l.input,l.next_in,p,d),l.state.wrap===1?l.adler=o(l.adler,u,p,d):l.state.wrap===2&&(l.adler=s(l.adler,u,p,d)),l.next_in+=p,l.total_in+=p,p),e.lookahead+=n,e.lookahead+e.insert>=C)for(c=e.strstart-e.insert,e.ins_h=e.window[c],e.ins_h=(e.ins_h<<e.hash_shift^e.window[c+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[c+C-1])&e.hash_mask,e.prev[c&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=c,c++,e.insert--,!(e.lookahead+e.insert<C)););}while(e.lookahead<T&&e.strm.avail_in!==0)}function V(e,t){for(var n,r;;){if(e.lookahead<T){if(B(e),e.lookahead<T&&t===l)return O;if(e.lookahead===0)break}if(n=0,e.lookahead>=C&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+C-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),n!==0&&e.strstart-n<=e.w_size-T&&(e.match_length=z(e,n)),e.match_length>=C){if(r=a._tr_tally(e,e.strstart-e.match_start,e.match_length-C),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=C){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+C-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,--e.match_length!=0;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask}else r=a._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(r&&(I(e,!1),e.strm.avail_out===0))return O}return e.insert=e.strstart<C-1?e.strstart:C-1,t===u?(I(e,!0),e.strm.avail_out===0?A:j):e.last_lit&&(I(e,!1),e.strm.avail_out===0)?O:k}function H(e,t){for(var n,r,i;;){if(e.lookahead<T){if(B(e),e.lookahead<T&&t===l)return O;if(e.lookahead===0)break}if(n=0,e.lookahead>=C&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+C-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=C-1,n!==0&&e.prev_length<e.max_lazy_match&&e.strstart-n<=e.w_size-T&&(e.match_length=z(e,n),e.match_length<=5&&(e.strategy===1||e.match_length===C&&4096<e.strstart-e.match_start)&&(e.match_length=C-1)),e.prev_length>=C&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-C,r=a._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-C),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+C-1])&e.hash_mask,n=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),--e.prev_length!=0;);if(e.match_available=0,e.match_length=C-1,e.strstart++,r&&(I(e,!1),e.strm.avail_out===0))return O}else if(e.match_available){if((r=a._tr_tally(e,0,e.window[e.strstart-1]))&&I(e,!1),e.strstart++,e.lookahead--,e.strm.avail_out===0)return O}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&=(r=a._tr_tally(e,0,e.window[e.strstart-1]),0),e.insert=e.strstart<C-1?e.strstart:C-1,t===u?(I(e,!0),e.strm.avail_out===0?A:j):e.last_lit&&(I(e,!1),e.strm.avail_out===0)?O:k}function U(e,t,n,r,i){this.good_length=e,this.max_lazy=t,this.nice_length=n,this.max_chain=r,this.func=i}function ee(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=g,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new i.Buf16(2*x),this.dyn_dtree=new i.Buf16(2*(2*y+1)),this.bl_tree=new i.Buf16(2*(2*b+1)),P(this.dyn_ltree),P(this.dyn_dtree),P(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new i.Buf16(S+1),this.heap=new i.Buf16(2*v+1),P(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new i.Buf16(2*v+1),P(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function W(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=h,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?E:D,e.adler=t.wrap===2?0:1,t.last_flush=l,a._tr_init(t),d):M(e,f)}function G(e){var t=W(e);return t===d&&function(e){e.window_size=2*e.w_size,P(e.head),e.max_lazy_match=r[e.level].max_lazy,e.good_match=r[e.level].good_length,e.nice_match=r[e.level].nice_length,e.max_chain_length=r[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=C-1,e.match_available=0,e.ins_h=0}(e.state),t}function K(e,t,n,r,a,o){if(!e)return f;var s=1;if(t===p&&(t=6),r<0?(s=0,r=-r):15<r&&(s=2,r-=16),a<1||_<a||n!==g||r<8||15<r||t<0||9<t||o<0||m<o)return M(e,f);r===8&&(r=9);var c=new ee;return(e.state=c).strm=e,c.wrap=s,c.gzhead=null,c.w_bits=r,c.w_size=1<<c.w_bits,c.w_mask=c.w_size-1,c.hash_bits=a+7,c.hash_size=1<<c.hash_bits,c.hash_mask=c.hash_size-1,c.hash_shift=~~((c.hash_bits+C-1)/C),c.window=new i.Buf8(2*c.w_size),c.head=new i.Buf16(c.hash_size),c.prev=new i.Buf16(c.w_size),c.lit_bufsize=1<<a+6,c.pending_buf_size=4*c.lit_bufsize,c.pending_buf=new i.Buf8(c.pending_buf_size),c.d_buf=1*c.lit_bufsize,c.l_buf=3*c.lit_bufsize,c.level=t,c.strategy=o,c.method=n,G(e)}r=[new U(0,0,0,0,function(e,t){var n=65535;for(n>e.pending_buf_size-5&&(n=e.pending_buf_size-5);;){if(e.lookahead<=1){if(B(e),e.lookahead===0&&t===l)return O;if(e.lookahead===0)break}e.strstart+=e.lookahead,e.lookahead=0;var r=e.block_start+n;if((e.strstart===0||e.strstart>=r)&&(e.lookahead=e.strstart-r,e.strstart=r,I(e,!1),e.strm.avail_out===0)||e.strstart-e.block_start>=e.w_size-T&&(I(e,!1),e.strm.avail_out===0))return O}return e.insert=0,t===u?(I(e,!0),e.strm.avail_out===0?A:j):(e.strstart>e.block_start&&(I(e,!1),e.strm.avail_out),O)}),new U(4,4,8,4,V),new U(4,5,16,8,V),new U(4,6,32,32,V),new U(4,4,16,16,H),new U(8,16,32,32,H),new U(8,16,128,128,H),new U(8,32,128,256,H),new U(32,128,258,1024,H),new U(32,258,258,4096,H)],n.deflateInit=function(e,t){return K(e,t,g,15,8,0)},n.deflateInit2=K,n.deflateReset=G,n.deflateResetKeep=W,n.deflateSetHeader=function(e,t){return e&&e.state&&e.state.wrap===2?(e.state.gzhead=t,d):f},n.deflate=function(e,t){var n,i,o,c;if(!e||!e.state||5<t||t<0)return e?M(e,f):f;if(i=e.state,!e.output||!e.input&&e.avail_in!==0||i.status===666&&t!==u)return M(e,e.avail_out===0?-5:f);if(i.strm=e,n=i.last_flush,i.last_flush=t,i.status===E){if(i.wrap===2)e.adler=0,L(i,31),L(i,139),L(i,8),i.gzhead?(L(i,+!!i.gzhead.text+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),L(i,255&i.gzhead.time),L(i,i.gzhead.time>>8&255),L(i,i.gzhead.time>>16&255),L(i,i.gzhead.time>>24&255),L(i,i.level===9?2:2<=i.strategy||i.level<2?4:0),L(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(L(i,255&i.gzhead.extra.length),L(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(e.adler=s(e.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69):(L(i,0),L(i,0),L(i,0),L(i,0),L(i,0),L(i,i.level===9?2:2<=i.strategy||i.level<2?4:0),L(i,3),i.status=D);else{var p=g+(i.w_bits-8<<4)<<8;p|=(2<=i.strategy||i.level<2?0:i.level<6?1:i.level===6?2:3)<<6,i.strstart!==0&&(p|=32),p+=31-p%31,i.status=D,R(i,p),i.strstart!==0&&(R(i,e.adler>>>16),R(i,65535&e.adler)),e.adler=1}}if(i.status===69){if(i.gzhead.extra){for(o=i.pending;i.gzindex<(65535&i.gzhead.extra.length)&&(i.pending!==i.pending_buf_size||(i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),F(e),o=i.pending,i.pending!==i.pending_buf_size));)L(i,255&i.gzhead.extra[i.gzindex]),i.gzindex++;i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),i.gzindex===i.gzhead.extra.length&&(i.gzindex=0,i.status=73)}else i.status=73}if(i.status===73){if(i.gzhead.name){o=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),F(e),o=i.pending,i.pending===i.pending_buf_size)){c=1;break}c=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,L(i,c)}while(c!==0);i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),c===0&&(i.gzindex=0,i.status=91)}else i.status=91}if(i.status===91){if(i.gzhead.comment){o=i.pending;do{if(i.pending===i.pending_buf_size&&(i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),F(e),o=i.pending,i.pending===i.pending_buf_size)){c=1;break}c=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,L(i,c)}while(c!==0);i.gzhead.hcrc&&i.pending>o&&(e.adler=s(e.adler,i.pending_buf,i.pending-o,o)),c===0&&(i.status=103)}else i.status=103}if(i.status===103&&(i.gzhead.hcrc?(i.pending+2>i.pending_buf_size&&F(e),i.pending+2<=i.pending_buf_size&&(L(i,255&e.adler),L(i,e.adler>>8&255),e.adler=0,i.status=D)):i.status=D),i.pending!==0){if(F(e),e.avail_out===0)return i.last_flush=-1,d}else if(e.avail_in===0&&N(t)<=N(n)&&t!==u)return M(e,-5);if(i.status===666&&e.avail_in!==0)return M(e,-5);if(e.avail_in!==0||i.lookahead!==0||t!==l&&i.status!==666){var m=i.strategy===2?function(e,t){for(var n;;){if(e.lookahead===0&&(B(e),e.lookahead===0)){if(t===l)return O;break}if(e.match_length=0,n=a._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,n&&(I(e,!1),e.strm.avail_out===0))return O}return e.insert=0,t===u?(I(e,!0),e.strm.avail_out===0?A:j):e.last_lit&&(I(e,!1),e.strm.avail_out===0)?O:k}(i,t):i.strategy===3?function(e,t){for(var n,r,i,o,s=e.window;;){if(e.lookahead<=w){if(B(e),e.lookahead<=w&&t===l)return O;if(e.lookahead===0)break}if(e.match_length=0,e.lookahead>=C&&0<e.strstart&&(r=s[i=e.strstart-1])===s[++i]&&r===s[++i]&&r===s[++i]){o=e.strstart+w;do;while(r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&r===s[++i]&&i<o);e.match_length=w-(o-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=C?(n=a._tr_tally(e,1,e.match_length-C),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(n=a._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),n&&(I(e,!1),e.strm.avail_out===0))return O}return e.insert=0,t===u?(I(e,!0),e.strm.avail_out===0?A:j):e.last_lit&&(I(e,!1),e.strm.avail_out===0)?O:k}(i,t):r[i.level].func(i,t);if(m!==A&&m!==j||(i.status=666),m===O||m===A)return e.avail_out===0&&(i.last_flush=-1),d;if(m===k&&(t===1?a._tr_align(i):t!==5&&(a._tr_stored_block(i,0,0,!1),t===3&&(P(i.head),i.lookahead===0&&(i.strstart=0,i.block_start=0,i.insert=0))),F(e),e.avail_out===0))return i.last_flush=-1,d}return t===u?i.wrap<=0?1:(i.wrap===2?(L(i,255&e.adler),L(i,e.adler>>8&255),L(i,e.adler>>16&255),L(i,e.adler>>24&255),L(i,255&e.total_in),L(i,e.total_in>>8&255),L(i,e.total_in>>16&255),L(i,e.total_in>>24&255)):(R(i,e.adler>>>16),R(i,65535&e.adler)),F(e),0<i.wrap&&(i.wrap=-i.wrap),i.pending===0?1:d):d},n.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==E&&t!==69&&t!==73&&t!==91&&t!==103&&t!==D&&t!==666?M(e,f):(e.state=null,t===D?M(e,-3):d):f},n.deflateSetDictionary=function(e,t){var n,r,a,s,c,l,u,p,m=t.length;if(!e||!e.state||(s=(n=e.state).wrap)===2||s===1&&n.status!==E||n.lookahead)return f;for(s===1&&(e.adler=o(e.adler,t,m,0)),n.wrap=0,m>=n.w_size&&(s===0&&(P(n.head),n.strstart=0,n.block_start=0,n.insert=0),p=new i.Buf8(n.w_size),i.arraySet(p,t,m-n.w_size,n.w_size,0),t=p,m=n.w_size),c=e.avail_in,l=e.next_in,u=e.input,e.avail_in=m,e.next_in=0,e.input=t,B(n);n.lookahead>=C;){for(r=n.strstart,a=n.lookahead-(C-1);n.ins_h=(n.ins_h<<n.hash_shift^n.window[r+C-1])&n.hash_mask,n.prev[r&n.w_mask]=n.head[n.ins_h],n.head[n.ins_h]=r,r++,--a;);n.strstart=r,n.lookahead=C-1,B(n)}return n.strstart+=n.lookahead,n.block_start=n.strstart,n.insert=n.lookahead,n.lookahead=0,n.match_length=n.prev_length=C-1,n.match_available=0,e.next_in=l,e.input=u,e.avail_in=c,n.wrap=s,d},n.deflateInfo=`pako deflate (from Nodeca project)`},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,n){t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name=``,this.comment=``,this.hcrc=0,this.done=!1}},{}],48:[function(e,t,n){t.exports=function(e,t){var n=e.state,r=e.next_in,i,a,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T=e.input,E;i=r+(e.avail_in-5),a=e.next_out,E=e.output,o=a-(t-e.avail_out),s=a+(e.avail_out-257),c=n.dmax,l=n.wsize,u=n.whave,d=n.wnext,f=n.window,p=n.hold,m=n.bits,h=n.lencode,g=n.distcode,_=(1<<n.lenbits)-1,v=(1<<n.distbits)-1;e:do{m<15&&(p+=T[r++]<<m,m+=8,p+=T[r++]<<m,m+=8),y=h[p&_];t:for(;;){if(p>>>=b=y>>>24,m-=b,(b=y>>>16&255)==0)E[a++]=65535&y;else{if(!(16&b)){if(!(64&b)){y=h[(65535&y)+(p&(1<<b)-1)];continue t}if(32&b){n.mode=12;break e}e.msg=`invalid literal/length code`,n.mode=30;break e}x=65535&y,(b&=15)&&(m<b&&(p+=T[r++]<<m,m+=8),x+=p&(1<<b)-1,p>>>=b,m-=b),m<15&&(p+=T[r++]<<m,m+=8,p+=T[r++]<<m,m+=8),y=g[p&v];r:for(;;){if(p>>>=b=y>>>24,m-=b,!(16&(b=y>>>16&255))){if(!(64&b)){y=g[(65535&y)+(p&(1<<b)-1)];continue r}e.msg=`invalid distance code`,n.mode=30;break e}if(S=65535&y,m<(b&=15)&&(p+=T[r++]<<m,(m+=8)<b&&(p+=T[r++]<<m,m+=8)),c<(S+=p&(1<<b)-1)){e.msg=`invalid distance too far back`,n.mode=30;break e}if(p>>>=b,m-=b,(b=a-o)<S){if(u<(b=S-b)&&n.sane){e.msg=`invalid distance too far back`,n.mode=30;break e}if(w=f,(C=0)===d){if(C+=l-b,b<x){for(x-=b;E[a++]=f[C++],--b;);C=a-S,w=E}}else if(d<b){if(C+=l+d-b,(b-=d)<x){for(x-=b;E[a++]=f[C++],--b;);if(C=0,d<x){for(x-=b=d;E[a++]=f[C++],--b;);C=a-S,w=E}}}else if(C+=d-b,b<x){for(x-=b;E[a++]=f[C++],--b;);C=a-S,w=E}for(;2<x;)E[a++]=w[C++],E[a++]=w[C++],E[a++]=w[C++],x-=3;x&&(E[a++]=w[C++],1<x&&(E[a++]=w[C++]))}else{for(C=a-S;E[a++]=E[C++],E[a++]=E[C++],E[a++]=E[C++],2<(x-=3););x&&(E[a++]=E[C++],1<x&&(E[a++]=E[C++]))}break}}break}}while(r<i&&a<s);r-=x=m>>3,p&=(1<<(m-=x<<3))-1,e.next_in=r,e.next_out=a,e.avail_in=r<i?i-r+5:5-(r-i),e.avail_out=a<s?s-a+257:257-(a-s),n.hold=p,n.bits=m}},{}],49:[function(e,t,n){var r=e(`../utils/common`),i=e(`./adler32`),a=e(`./crc32`),o=e(`./inffast`),s=e(`./inftrees`),c=1,l=2,u=0,d=-2,f=1,p=852,m=592;function h(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function g(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new r.Buf16(320),this.work=new r.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function _(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg=``,t.wrap&&(e.adler=1&t.wrap),t.mode=f,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new r.Buf32(p),t.distcode=t.distdyn=new r.Buf32(m),t.sane=1,t.back=-1,u):d}function v(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,_(e)):d}function y(e,t){var n,r;return e&&e.state?(r=e.state,t<0?(n=0,t=-t):(n=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?d:(r.window!==null&&r.wbits!==t&&(r.window=null),r.wrap=n,r.wbits=t,v(e))):d}function b(e,t){var n,r;return e?(r=new g,(e.state=r).window=null,(n=y(e,t))!==u&&(e.state=null),n):d}var x,S,C=!0;function w(e){if(C){var t;for(x=new r.Buf32(512),S=new r.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(s(c,e.lens,0,288,x,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;s(l,e.lens,0,32,S,0,e.work,{bits:5}),C=!1}e.lencode=x,e.lenbits=9,e.distcode=S,e.distbits=5}function T(e,t,n,i){var a,o=e.state;return o.window===null&&(o.wsize=1<<o.wbits,o.wnext=0,o.whave=0,o.window=new r.Buf8(o.wsize)),i>=o.wsize?(r.arraySet(o.window,t,n-o.wsize,o.wsize,0),o.wnext=0,o.whave=o.wsize):(i<(a=o.wsize-o.wnext)&&(a=i),r.arraySet(o.window,t,n-i,a,o.wnext),(i-=a)?(r.arraySet(o.window,t,n-i,i,0),o.wnext=i,o.whave=o.wsize):(o.wnext+=a,o.wnext===o.wsize&&(o.wnext=0),o.whave<o.wsize&&(o.whave+=a))),0}n.inflateReset=v,n.inflateReset2=y,n.inflateResetKeep=_,n.inflateInit=function(e){return b(e,15)},n.inflateInit2=b,n.inflate=function(e,t){var n,p,m,g,_,v,y,b,x,S,C,E,D,O,k,A,j,M,N,P,F,I,L,R,z=0,B=new r.Buf8(4),V=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&e.avail_in!==0)return d;(n=e.state).mode===12&&(n.mode=13),_=e.next_out,m=e.output,y=e.avail_out,g=e.next_in,p=e.input,v=e.avail_in,b=n.hold,x=n.bits,S=v,C=y,I=u;e:for(;;)switch(n.mode){case f:if(n.wrap===0){n.mode=13;break}for(;x<16;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(2&n.wrap&&b===35615){B[n.check=0]=255&b,B[1]=b>>>8&255,n.check=a(n.check,B,2,0),x=b=0,n.mode=2;break}if(n.flags=0,n.head&&(n.head.done=!1),!(1&n.wrap)||(((255&b)<<8)+(b>>8))%31){e.msg=`incorrect header check`,n.mode=30;break}if((15&b)!=8){e.msg=`unknown compression method`,n.mode=30;break}if(x-=4,F=8+(15&(b>>>=4)),n.wbits===0)n.wbits=F;else if(F>n.wbits){e.msg=`invalid window size`,n.mode=30;break}n.dmax=1<<F,e.adler=n.check=1,n.mode=512&b?10:12,x=b=0;break;case 2:for(;x<16;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(n.flags=b,(255&n.flags)!=8){e.msg=`unknown compression method`,n.mode=30;break}if(57344&n.flags){e.msg=`unknown header flags set`,n.mode=30;break}n.head&&(n.head.text=b>>8&1),512&n.flags&&(B[0]=255&b,B[1]=b>>>8&255,n.check=a(n.check,B,2,0)),x=b=0,n.mode=3;case 3:for(;x<32;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}n.head&&(n.head.time=b),512&n.flags&&(B[0]=255&b,B[1]=b>>>8&255,B[2]=b>>>16&255,B[3]=b>>>24&255,n.check=a(n.check,B,4,0)),x=b=0,n.mode=4;case 4:for(;x<16;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}n.head&&(n.head.xflags=255&b,n.head.os=b>>8),512&n.flags&&(B[0]=255&b,B[1]=b>>>8&255,n.check=a(n.check,B,2,0)),x=b=0,n.mode=5;case 5:if(1024&n.flags){for(;x<16;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}n.length=b,n.head&&(n.head.extra_len=b),512&n.flags&&(B[0]=255&b,B[1]=b>>>8&255,n.check=a(n.check,B,2,0)),x=b=0}else n.head&&(n.head.extra=null);n.mode=6;case 6:if(1024&n.flags&&(v<(E=n.length)&&(E=v),E&&(n.head&&(F=n.head.extra_len-n.length,n.head.extra||(n.head.extra=Array(n.head.extra_len)),r.arraySet(n.head.extra,p,g,E,F)),512&n.flags&&(n.check=a(n.check,p,E,g)),v-=E,g+=E,n.length-=E),n.length))break e;n.length=0,n.mode=7;case 7:if(2048&n.flags){if(v===0)break e;for(E=0;F=p[g+E++],n.head&&F&&n.length<65536&&(n.head.name+=String.fromCharCode(F)),F&&E<v;);if(512&n.flags&&(n.check=a(n.check,p,E,g)),v-=E,g+=E,F)break e}else n.head&&(n.head.name=null);n.length=0,n.mode=8;case 8:if(4096&n.flags){if(v===0)break e;for(E=0;F=p[g+E++],n.head&&F&&n.length<65536&&(n.head.comment+=String.fromCharCode(F)),F&&E<v;);if(512&n.flags&&(n.check=a(n.check,p,E,g)),v-=E,g+=E,F)break e}else n.head&&(n.head.comment=null);n.mode=9;case 9:if(512&n.flags){for(;x<16;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(b!==(65535&n.check)){e.msg=`header crc mismatch`,n.mode=30;break}x=b=0}n.head&&(n.head.hcrc=n.flags>>9&1,n.head.done=!0),e.adler=n.check=0,n.mode=12;break;case 10:for(;x<32;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}e.adler=n.check=h(b),x=b=0,n.mode=11;case 11:if(n.havedict===0)return e.next_out=_,e.avail_out=y,e.next_in=g,e.avail_in=v,n.hold=b,n.bits=x,2;e.adler=n.check=1,n.mode=12;case 12:if(t===5||t===6)break e;case 13:if(n.last){b>>>=7&x,x-=7&x,n.mode=27;break}for(;x<3;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}switch(n.last=1&b,--x,3&(b>>>=1)){case 0:n.mode=14;break;case 1:if(w(n),n.mode=20,t!==6)break;b>>>=2,x-=2;break e;case 2:n.mode=17;break;case 3:e.msg=`invalid block type`,n.mode=30}b>>>=2,x-=2;break;case 14:for(b>>>=7&x,x-=7&x;x<32;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if((65535&b)!=(b>>>16^65535)){e.msg=`invalid stored block lengths`,n.mode=30;break}if(n.length=65535&b,x=b=0,n.mode=15,t===6)break e;case 15:n.mode=16;case 16:if(E=n.length){if(v<E&&(E=v),y<E&&(E=y),E===0)break e;r.arraySet(m,p,g,E,_),v-=E,g+=E,y-=E,_+=E,n.length-=E;break}n.mode=12;break;case 17:for(;x<14;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(n.nlen=257+(31&b),b>>>=5,x-=5,n.ndist=1+(31&b),b>>>=5,x-=5,n.ncode=4+(15&b),b>>>=4,x-=4,286<n.nlen||30<n.ndist){e.msg=`too many length or distance symbols`,n.mode=30;break}n.have=0,n.mode=18;case 18:for(;n.have<n.ncode;){for(;x<3;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}n.lens[V[n.have++]]=7&b,b>>>=3,x-=3}for(;n.have<19;)n.lens[V[n.have++]]=0;if(n.lencode=n.lendyn,n.lenbits=7,L={bits:n.lenbits},I=s(0,n.lens,0,19,n.lencode,0,n.work,L),n.lenbits=L.bits,I){e.msg=`invalid code lengths set`,n.mode=30;break}n.have=0,n.mode=19;case 19:for(;n.have<n.nlen+n.ndist;){for(;A=(z=n.lencode[b&(1<<n.lenbits)-1])>>>16&255,j=65535&z,!((k=z>>>24)<=x);){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(j<16)b>>>=k,x-=k,n.lens[n.have++]=j;else{if(j===16){for(R=k+2;x<R;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(b>>>=k,x-=k,n.have===0){e.msg=`invalid bit length repeat`,n.mode=30;break}F=n.lens[n.have-1],E=3+(3&b),b>>>=2,x-=2}else if(j===17){for(R=k+3;x<R;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}x-=k,F=0,E=3+(7&(b>>>=k)),b>>>=3,x-=3}else{for(R=k+7;x<R;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}x-=k,F=0,E=11+(127&(b>>>=k)),b>>>=7,x-=7}if(n.have+E>n.nlen+n.ndist){e.msg=`invalid bit length repeat`,n.mode=30;break}for(;E--;)n.lens[n.have++]=F}}if(n.mode===30)break;if(n.lens[256]===0){e.msg=`invalid code -- missing end-of-block`,n.mode=30;break}if(n.lenbits=9,L={bits:n.lenbits},I=s(c,n.lens,0,n.nlen,n.lencode,0,n.work,L),n.lenbits=L.bits,I){e.msg=`invalid literal/lengths set`,n.mode=30;break}if(n.distbits=6,n.distcode=n.distdyn,L={bits:n.distbits},I=s(l,n.lens,n.nlen,n.ndist,n.distcode,0,n.work,L),n.distbits=L.bits,I){e.msg=`invalid distances set`,n.mode=30;break}if(n.mode=20,t===6)break e;case 20:n.mode=21;case 21:if(6<=v&&258<=y){e.next_out=_,e.avail_out=y,e.next_in=g,e.avail_in=v,n.hold=b,n.bits=x,o(e,C),_=e.next_out,m=e.output,y=e.avail_out,g=e.next_in,p=e.input,v=e.avail_in,b=n.hold,x=n.bits,n.mode===12&&(n.back=-1);break}for(n.back=0;A=(z=n.lencode[b&(1<<n.lenbits)-1])>>>16&255,j=65535&z,!((k=z>>>24)<=x);){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(A&&!(240&A)){for(M=k,N=A,P=j;A=(z=n.lencode[P+((b&(1<<M+N)-1)>>M)])>>>16&255,j=65535&z,!(M+(k=z>>>24)<=x);){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}b>>>=M,x-=M,n.back+=M}if(b>>>=k,x-=k,n.back+=k,n.length=j,A===0){n.mode=26;break}if(32&A){n.back=-1,n.mode=12;break}if(64&A){e.msg=`invalid literal/length code`,n.mode=30;break}n.extra=15&A,n.mode=22;case 22:if(n.extra){for(R=n.extra;x<R;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}n.length+=b&(1<<n.extra)-1,b>>>=n.extra,x-=n.extra,n.back+=n.extra}n.was=n.length,n.mode=23;case 23:for(;A=(z=n.distcode[b&(1<<n.distbits)-1])>>>16&255,j=65535&z,!((k=z>>>24)<=x);){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(!(240&A)){for(M=k,N=A,P=j;A=(z=n.distcode[P+((b&(1<<M+N)-1)>>M)])>>>16&255,j=65535&z,!(M+(k=z>>>24)<=x);){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}b>>>=M,x-=M,n.back+=M}if(b>>>=k,x-=k,n.back+=k,64&A){e.msg=`invalid distance code`,n.mode=30;break}n.offset=j,n.extra=15&A,n.mode=24;case 24:if(n.extra){for(R=n.extra;x<R;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}n.offset+=b&(1<<n.extra)-1,b>>>=n.extra,x-=n.extra,n.back+=n.extra}if(n.offset>n.dmax){e.msg=`invalid distance too far back`,n.mode=30;break}n.mode=25;case 25:if(y===0)break e;if(E=C-y,n.offset>E){if((E=n.offset-E)>n.whave&&n.sane){e.msg=`invalid distance too far back`,n.mode=30;break}D=E>n.wnext?(E-=n.wnext,n.wsize-E):n.wnext-E,E>n.length&&(E=n.length),O=n.window}else O=m,D=_-n.offset,E=n.length;for(y<E&&(E=y),y-=E,n.length-=E;m[_++]=O[D++],--E;);n.length===0&&(n.mode=21);break;case 26:if(y===0)break e;m[_++]=n.length,y--,n.mode=21;break;case 27:if(n.wrap){for(;x<32;){if(v===0)break e;v--,b|=p[g++]<<x,x+=8}if(C-=y,e.total_out+=C,n.total+=C,C&&(e.adler=n.check=n.flags?a(n.check,m,C,_-C):i(n.check,m,C,_-C)),C=y,(n.flags?b:h(b))!==n.check){e.msg=`incorrect data check`,n.mode=30;break}x=b=0}n.mode=28;case 28:if(n.wrap&&n.flags){for(;x<32;){if(v===0)break e;v--,b+=p[g++]<<x,x+=8}if(b!==(4294967295&n.total)){e.msg=`incorrect length check`,n.mode=30;break}x=b=0}n.mode=29;case 29:I=1;break e;case 30:I=-3;break e;case 31:return-4;default:return d}return e.next_out=_,e.avail_out=y,e.next_in=g,e.avail_in=v,n.hold=b,n.bits=x,(n.wsize||C!==e.avail_out&&n.mode<30&&(n.mode<27||t!==4))&&T(e,e.output,e.next_out,C-e.avail_out)?(n.mode=31,-4):(S-=e.avail_in,C-=e.avail_out,e.total_in+=S,e.total_out+=C,n.total+=C,n.wrap&&C&&(e.adler=n.check=n.flags?a(n.check,m,C,e.next_out-C):i(n.check,m,C,e.next_out-C)),e.data_type=n.bits+(n.last?64:0)+(n.mode===12?128:0)+(n.mode===20||n.mode===15?256:0),(S==0&&C===0||t===4)&&I===u&&(I=-5),I)},n.inflateEnd=function(e){if(!e||!e.state)return d;var t=e.state;return t.window&&=null,e.state=null,u},n.inflateGetHeader=function(e,t){var n;return e&&e.state&&2&(n=e.state).wrap?((n.head=t).done=!1,u):d},n.inflateSetDictionary=function(e,t){var n,r=t.length;return e&&e.state?(n=e.state).wrap!==0&&n.mode!==11?d:n.mode===11&&i(1,t,r,0)!==n.check?-3:T(e,t,r,r)?(n.mode=31,-4):(n.havedict=1,u):d},n.inflateInfo=`pako inflate (from Nodeca project)`},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,n){var r=e(`../utils/common`),i=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],a=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],o=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],s=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,n,c,l,u,d,f){var p,m,h,g,_,v,y,b,x,S=f.bits,C=0,w=0,T=0,E=0,D=0,O=0,k=0,A=0,j=0,M=0,N=null,P=0,F=new r.Buf16(16),I=new r.Buf16(16),L=null,R=0;for(C=0;C<=15;C++)F[C]=0;for(w=0;w<c;w++)F[t[n+w]]++;for(D=S,E=15;1<=E&&F[E]===0;E--);if(E<D&&(D=E),E===0)return l[u++]=20971520,l[u++]=20971520,f.bits=1,0;for(T=1;T<E&&F[T]===0;T++);for(D<T&&(D=T),C=A=1;C<=15;C++)if(A<<=1,(A-=F[C])<0)return-1;if(0<A&&(e===0||E!==1))return-1;for(I[1]=0,C=1;C<15;C++)I[C+1]=I[C]+F[C];for(w=0;w<c;w++)t[n+w]!==0&&(d[I[t[n+w]]++]=w);if(v=e===0?(N=L=d,19):e===1?(N=i,P-=257,L=a,R-=257,256):(N=o,L=s,-1),C=T,_=u,k=w=M=0,h=-1,g=(j=1<<(O=D))-1,e===1&&852<j||e===2&&592<j)return 1;for(;;){for(y=C-k,x=d[w]<v?(b=0,d[w]):d[w]>v?(b=L[R+d[w]],N[P+d[w]]):(b=96,0),p=1<<C-k,T=m=1<<O;l[_+(M>>k)+(m-=p)]=y<<24|b<<16|x|0,m!==0;);for(p=1<<C-1;M&p;)p>>=1;if(p===0?M=0:(M&=p-1,M+=p),w++,--F[C]==0){if(C===E)break;C=t[n+d[w]]}if(D<C&&(M&g)!==h){for(k===0&&(k=D),_+=T,A=1<<(O=C-k);O+k<E&&!((A-=F[O+k])<=0);)O++,A<<=1;if(j+=1<<O,e===1&&852<j||e===2&&592<j)return 1;l[h=M&g]=D<<24|O<<16|_-u|0}}return M!==0&&(l[_+M]=C-k<<24|4194304),f.bits=D,0}},{"../utils/common":41}],51:[function(e,t,n){t.exports={2:`need dictionary`,1:`stream end`,0:``,"-1":`file error`,"-2":`stream error`,"-3":`data error`,"-4":`insufficient memory`,"-5":`buffer error`,"-6":`incompatible version`}},{}],52:[function(e,t,n){var r=e(`../utils/common`),i=0,a=1;function o(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,c=29,l=256,u=l+1+c,d=30,f=19,p=2*u+1,m=15,h=16,g=7,_=256,v=16,y=17,b=18,x=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],S=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],C=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],w=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],T=Array(2*(u+2));o(T);var E=Array(2*d);o(E);var D=Array(512);o(D);var O=Array(256);o(O);var k=Array(c);o(k);var A,j,M,N=Array(d);function P(e,t,n,r,i){this.static_tree=e,this.extra_bits=t,this.extra_base=n,this.elems=r,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function I(e){return e<256?D[e]:D[256+(e>>>7)]}function L(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function R(e,t,n){e.bi_valid>h-n?(e.bi_buf|=t<<e.bi_valid&65535,L(e,e.bi_buf),e.bi_buf=t>>h-e.bi_valid,e.bi_valid+=n-h):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=n)}function z(e,t,n){R(e,n[2*t],n[2*t+1])}function B(e,t){for(var n=0;n|=1&e,e>>>=1,n<<=1,0<--t;);return n>>>1}function V(e,t,n){var r,i,a=Array(m+1),o=0;for(r=1;r<=m;r++)a[r]=o=o+n[r-1]<<1;for(i=0;i<=t;i++){var s=e[2*i+1];s!==0&&(e[2*i]=B(a[s]++,s))}}function H(e){for(var t=0;t<u;t++)e.dyn_ltree[2*t]=0;for(t=0;t<d;t++)e.dyn_dtree[2*t]=0;for(t=0;t<f;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*_]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function U(e){8<e.bi_valid?L(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function ee(e,t,n,r){var i=2*t,a=2*n;return e[i]<e[a]||e[i]===e[a]&&r[t]<=r[n]}function W(e,t,n){for(var r=e.heap[n],i=n<<1;i<=e.heap_len&&(i<e.heap_len&&ee(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!ee(t,r,e.heap[i],e.depth));)e.heap[n]=e.heap[i],n=i,i<<=1;e.heap[n]=r}function G(e,t,n){var r,i,a,o,s=0;if(e.last_lit!==0)for(;r=e.pending_buf[e.d_buf+2*s]<<8|e.pending_buf[e.d_buf+2*s+1],i=e.pending_buf[e.l_buf+s],s++,r===0?z(e,i,t):(z(e,(a=O[i])+l+1,t),(o=x[a])!==0&&R(e,i-=k[a],o),z(e,a=I(--r),n),(o=S[a])!==0&&R(e,r-=N[a],o)),s<e.last_lit;);z(e,_,t)}function K(e,t){var n,r,i,a=t.dyn_tree,o=t.stat_desc.static_tree,s=t.stat_desc.has_stree,c=t.stat_desc.elems,l=-1;for(e.heap_len=0,e.heap_max=p,n=0;n<c;n++)a[2*n]===0?a[2*n+1]=0:(e.heap[++e.heap_len]=l=n,e.depth[n]=0);for(;e.heap_len<2;)a[2*(i=e.heap[++e.heap_len]=l<2?++l:0)]=1,e.depth[i]=0,e.opt_len--,s&&(e.static_len-=o[2*i+1]);for(t.max_code=l,n=e.heap_len>>1;1<=n;n--)W(e,a,n);for(i=c;n=e.heap[1],e.heap[1]=e.heap[e.heap_len--],W(e,a,1),r=e.heap[1],e.heap[--e.heap_max]=n,e.heap[--e.heap_max]=r,a[2*i]=a[2*n]+a[2*r],e.depth[i]=(e.depth[n]>=e.depth[r]?e.depth[n]:e.depth[r])+1,a[2*n+1]=a[2*r+1]=i,e.heap[1]=i++,W(e,a,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var n,r,i,a,o,s,c=t.dyn_tree,l=t.max_code,u=t.stat_desc.static_tree,d=t.stat_desc.has_stree,f=t.stat_desc.extra_bits,h=t.stat_desc.extra_base,g=t.stat_desc.max_length,_=0;for(a=0;a<=m;a++)e.bl_count[a]=0;for(c[2*e.heap[e.heap_max]+1]=0,n=e.heap_max+1;n<p;n++)g<(a=c[2*c[2*(r=e.heap[n])+1]+1]+1)&&(a=g,_++),c[2*r+1]=a,l<r||(e.bl_count[a]++,o=0,h<=r&&(o=f[r-h]),s=c[2*r],e.opt_len+=s*(a+o),d&&(e.static_len+=s*(u[2*r+1]+o)));if(_!==0){do{for(a=g-1;e.bl_count[a]===0;)a--;e.bl_count[a]--,e.bl_count[a+1]+=2,e.bl_count[g]--,_-=2}while(0<_);for(a=g;a!==0;a--)for(r=e.bl_count[a];r!==0;)l<(i=e.heap[--n])||(c[2*i+1]!==a&&(e.opt_len+=(a-c[2*i+1])*c[2*i],c[2*i+1]=a),r--)}}(e,t),V(a,l,e.bl_count)}function te(e,t,n){var r,i,a=-1,o=t[1],s=0,c=7,l=4;for(o===0&&(c=138,l=3),t[2*(n+1)+1]=65535,r=0;r<=n;r++)i=o,o=t[2*(r+1)+1],++s<c&&i===o||(s<l?e.bl_tree[2*i]+=s:i===0?s<=10?e.bl_tree[2*y]++:e.bl_tree[2*b]++:(i!==a&&e.bl_tree[2*i]++,e.bl_tree[2*v]++),a=i,l=(s=0)===o?(c=138,3):i===o?(c=6,3):(c=7,4))}function q(e,t,n){var r,i,a=-1,o=t[1],s=0,c=7,l=4;for(o===0&&(c=138,l=3),r=0;r<=n;r++)if(i=o,o=t[2*(r+1)+1],!(++s<c&&i===o)){if(s<l)for(;z(e,i,e.bl_tree),--s!=0;);else i===0?s<=10?(z(e,y,e.bl_tree),R(e,s-3,3)):(z(e,b,e.bl_tree),R(e,s-11,7)):(i!==a&&(z(e,i,e.bl_tree),s--),z(e,v,e.bl_tree),R(e,s-3,2));a=i,l=(s=0)===o?(c=138,3):i===o?(c=6,3):(c=7,4)}}o(N);var J=!1;function ne(e,t,n,i){R(e,(s<<1)+ +!!i,3),function(e,t,n,i){U(e),i&&(L(e,n),L(e,~n)),r.arraySet(e.pending_buf,e.window,t,n,e.pending),e.pending+=n}(e,t,n,!0)}n._tr_init=function(e){J||=(function(){var e,t,n,r,i,a=Array(m+1);for(r=n=0;r<c-1;r++)for(k[r]=n,e=0;e<1<<x[r];e++)O[n++]=r;for(O[n-1]=r,r=i=0;r<16;r++)for(N[r]=i,e=0;e<1<<S[r];e++)D[i++]=r;for(i>>=7;r<d;r++)for(N[r]=i<<7,e=0;e<1<<S[r]-7;e++)D[256+i++]=r;for(t=0;t<=m;t++)a[t]=0;for(e=0;e<=143;)T[2*e+1]=8,e++,a[8]++;for(;e<=255;)T[2*e+1]=9,e++,a[9]++;for(;e<=279;)T[2*e+1]=7,e++,a[7]++;for(;e<=287;)T[2*e+1]=8,e++,a[8]++;for(V(T,u+1,a),e=0;e<d;e++)E[2*e+1]=5,E[2*e]=B(e,5);A=new P(T,x,l+1,u,m),j=new P(E,S,0,d,m),M=new P([],C,0,f,g)}(),!0),e.l_desc=new F(e.dyn_ltree,A),e.d_desc=new F(e.dyn_dtree,j),e.bl_desc=new F(e.bl_tree,M),e.bi_buf=0,e.bi_valid=0,H(e)},n._tr_stored_block=ne,n._tr_flush_block=function(e,t,n,r){var o,s,c=0;0<e.level?(e.strm.data_type===2&&(e.strm.data_type=function(e){var t,n=4093624447;for(t=0;t<=31;t++,n>>>=1)if(1&n&&e.dyn_ltree[2*t]!==0)return i;if(e.dyn_ltree[18]!==0||e.dyn_ltree[20]!==0||e.dyn_ltree[26]!==0)return a;for(t=32;t<l;t++)if(e.dyn_ltree[2*t]!==0)return a;return i}(e)),K(e,e.l_desc),K(e,e.d_desc),c=function(e){var t;for(te(e,e.dyn_ltree,e.l_desc.max_code),te(e,e.dyn_dtree,e.d_desc.max_code),K(e,e.bl_desc),t=f-1;3<=t&&e.bl_tree[2*w[t]+1]===0;t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),o=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=o&&(o=s)):o=s=n+5,n+4<=o&&t!==-1?ne(e,t,n,r):e.strategy===4||s===o?(R(e,2+ +!!r,3),G(e,T,E)):(R(e,4+ +!!r,3),function(e,t,n,r){var i;for(R(e,t-257,5),R(e,n-1,5),R(e,r-4,4),i=0;i<r;i++)R(e,e.bl_tree[2*w[i]+1],3);q(e,e.dyn_ltree,t-1),q(e,e.dyn_dtree,n-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,c+1),G(e,e.dyn_ltree,e.dyn_dtree)),H(e),r&&U(e)},n._tr_tally=function(e,t,n){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&n,e.last_lit++,t===0?e.dyn_ltree[2*n]++:(e.matches++,t--,e.dyn_ltree[2*(O[n]+l+1)]++,e.dyn_dtree[2*I(t)]++),e.last_lit===e.lit_bufsize-1},n._tr_align=function(e){R(e,2,3),z(e,_,T),function(e){e.bi_valid===16?(L(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,n){t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg=``,this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,n){(function(e){(function(e,t){if(!e.setImmediate){var n,r,i,a,o=1,s={},c=!1,l=e.document,u=Object.getPrototypeOf&&Object.getPrototypeOf(e);u=u&&u.setTimeout?u:e,n={}.toString.call(e.process)===`[object process]`?function(e){process.nextTick(function(){f(e)})}:function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage(``,`*`),e.onmessage=n,t}}()?(a=`setImmediate$`+Math.random()+`$`,e.addEventListener?e.addEventListener(`message`,p,!1):e.attachEvent(`onmessage`,p),function(t){e.postMessage(a+t,`*`)}):e.MessageChannel?((i=new MessageChannel).port1.onmessage=function(e){f(e.data)},function(e){i.port2.postMessage(e)}):l&&`onreadystatechange`in l.createElement(`script`)?(r=l.documentElement,function(e){var t=l.createElement(`script`);t.onreadystatechange=function(){f(e),t.onreadystatechange=null,r.removeChild(t),t=null},r.appendChild(t)}):function(e){setTimeout(f,0,e)},u.setImmediate=function(e){typeof e!=`function`&&(e=Function(``+e));for(var t=Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];return s[o]={callback:e,args:t},n(o),o++},u.clearImmediate=d}function d(e){delete s[e]}function f(e){if(c)setTimeout(f,0,e);else{var n=s[e];if(n){c=!0;try{(function(e){var n=e.callback,r=e.args;switch(r.length){case 0:n();break;case 1:n(r[0]);break;case 2:n(r[0],r[1]);break;case 3:n(r[0],r[1],r[2]);break;default:n.apply(t,r)}})(n)}finally{d(e),c=!1}}}}function p(t){t.source===e&&typeof t.data==`string`&&t.data.indexOf(a)===0&&f(+t.data.slice(a.length))}})(typeof self>`u`?e===void 0?this:e:self)}).call(this,typeof global<`u`?global:typeof self<`u`?self:typeof window<`u`?window:{})},{}]},{},[10])(10)})})),dt;(function(e){let t=e.EMPTY=255;function n(e,n){let r=new Uint8Array(e*n);return r.fill(t),{width:e,height:n,data:r}}e.create=n;function r(e){return{...e,data:new Uint8Array(e.data)}}e.clone=r;function i(e,t,n){return n*e.width+t}e.offset=i;function a(e,t,n){return t>=0&&n>=0&&t<e.width&&n<e.height}e.contains=a;function o(e,t,n){return e.data[i(e,t,n)]}e.get=o;function s(e,t,n,r){e.data[i(e,t,n)]=r}e.set=s;function c(e,n,r){return o(e,n,r)===t}e.isEmpty=c;function l(e,n,r=new ImageData(e.width,e.height)){for(let i=0;i<e.data.length;i++){let a=e.data[i]===t?void 0:n[e.data[i]],o=i<<2;r.data[o+0]=a?.r??0,r.data[o+1]=a?.g??0,r.data[o+2]=a?.b??0,r.data[o+3]=a===void 0?0:a.a}return r}e.toImageData=l})(dt||={});var Z;(function(e){function t(e=0,t=0,n=0){return{x:e,y:t,z:n}}e.create=t;function n(e,t,n=Z.create()){return n.x=e.x+t.x,n.y=e.y+t.y,n.z=e.z+t.z,n}e.add=n;function r(e,t,n=Z.create()){return n.x=e.x-t.x,n.y=e.y-t.y,n.z=e.z-t.z,n}e.subtract=r;function i(e,t,n=Z.create()){let r=e.y*t.z-e.z*t.y,i=e.z*t.x-e.x*t.z,a=e.x*t.y-e.y*t.x;return n.x=r,n.y=i,n.z=a,n}e.cross=i;function a(e){return Math.hypot(e.x,e.y,e.z)}e.length=a;function o(e,t=Z.create()){let n=Z.length(e)||1;return t.x=e.x/n,t.y=e.y/n,t.z=e.z/n,t}e.normalize=o;function s(e,t,n=Z.create()){return n.x=e.x*t,n.y=e.y*t,n.z=e.z*t,n}e.multiplyScalar=s;function c(e,t,n=Z.create()){let{x:r,y:i,z:a,w:o}=t,{x:s,y:c,z:l}=e,u=2*(i*l-a*c),d=2*(a*s-r*l),f=2*(r*c-i*s);return n.x=s+o*u+(i*f-a*d),n.y=c+o*d+(a*u-r*f),n.z=l+o*f+(r*d-i*u),n}e.rotateQuaternion=c;function l(e,t){return e.x===t.x&&e.y===t.y&&e.z===t.z}e.equals=l,e.EMPTY=Object.freeze(Z.create())})(Z||={});var ft;(function(e){function t(e,t={width:0,height:0,depth:0}){let n=Math.max(e.width,e.height,e.depth);return t.width=e.width/n,t.height=e.height/n,t.depth=e.depth/n,t}e.normalize=t;function n(e,t){return e.width===t.width&&e.height===t.height&&e.depth===t.depth}e.equals=n})(ft||={});var Q=class extends Float32Array{};(function(e){function t(e=0,t=0,n=0,r=0,i=0,a=0,o=0,s=0,c=0){return new Q([e,t,n,r,i,a,o,s,c])}e.create=t;function n(e=Q.create()){return e.set([1,0,0,0,1,0,0,0,1]),e}e.identity=n;function r(e,t,n,r=Q.create()){let i=Z.normalize(Z.subtract(e,t)),a=Z.normalize(Z.cross(n,i)),o=Z.cross(i,a);return r[0]=a.x,r[1]=a.y,r[2]=a.z,r[3]=o.x,r[4]=o.y,r[5]=o.z,r[6]=i.x,r[7]=i.y,r[8]=i.z,r}e.orientation=r;function i(e,t=Q.create()){let n=Math.cos(e),r=Math.sin(e);return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=n,t[5]=r,t[6]=0,t[7]=-r,t[8]=n,t}e.rotationX=i;function a(e,t=Q.create()){let n=Math.cos(e),r=Math.sin(e);return t[0]=n,t[1]=0,t[2]=-r,t[3]=0,t[4]=1,t[5]=0,t[6]=r,t[7]=0,t[8]=n,t}e.rotationY=a;function o(e,t=Q.create()){let n=Math.cos(e),r=Math.sin(e);return t[0]=n,t[1]=r,t[2]=0,t[3]=-r,t[4]=n,t[5]=0,t[6]=0,t[7]=0,t[8]=1,t}e.rotationZ=o;function s(e,t=Q.create()){let n=[e[0],e[3],e[6],e[1],e[4],e[7],e[2],e[5],e[8]];return t.set(n),t}e.transpose=s;function c(e,t,n=Q.create()){let r=[0,0,0,0,0,0,0,0,0];for(let n=0;n<3;n++)for(let i=0;i<3;i++)r[n*3+i]=e[i]*t[n*3]+e[3+i]*t[n*3+1]+e[6+i]*t[n*3+2];return n.set(r),n}e.multiply=c;function l(e,t,n=Z.create()){let r=e[0]*t.x+e[3]*t.y+e[6]*t.z,i=e[1]*t.x+e[4]*t.y+e[7]*t.z,a=e[2]*t.x+e[5]*t.y+e[8]*t.z;return n.x=r,n.y=i,n.z=a,n}e.transform=l})(Q||={});var pt=e(ut(),1),mt={front:!0,left:!0,right:!0,back:!0,top:!0,bottom:!0},ht=Object.keys(mt),gt={front:[`width`,`height`],back:[`width`,`height`],left:[`depth`,`height`],right:[`depth`,`height`],top:[`width`,`depth`],bottom:[`width`,`depth`]},_t=[`width`,`height`,`depth`],vt={width:`x`,height:`y`,depth:`z`},yt={front:`depth`,back:`depth`,left:`width`,right:`width`,top:`height`,bottom:`height`},bt={front:[!1,!0],back:[!0,!0],left:[!1,!0],right:[!0,!0],top:[!1,!1],bottom:[!1,!0]},xt={width:[`left`,`right`],height:[`bottom`,`top`],depth:[`back`,`front`]},St=(e,t)=>`section-${e}-${t}`;function Ct(e){let t=/^section-(\d+)-(before|after)$/.exec(e);return t===null?void 0:{cut:Number(t[1]),face:t[2]}}function wt(e){return Z.create(e.width/2,e.height/2,e.depth/2)}function Tt(e){return{width:e.sides.front.width,height:e.sides.front.height,depth:e.sides.left.width}}function Et(e,t=Q.create()){return Q.multiply(Q.multiply(Q.rotationX(e.x),Q.rotationY(e.y)),Q.rotationZ(e.z),t)}function Dt(e,t=Z.create()){let n=(t,n)=>e[t+3*n],r=Math.min(1,Math.max(-1,n(0,2)));return t.y=Math.asin(r),Math.abs(r)<.9999999?(t.x=Math.atan2(-n(1,2),n(2,2)),t.z=Math.atan2(-n(0,1),n(0,0))):(t.x=Math.atan2(n(1,0),n(1,1)),t.z=0),t}function Ot(e,t){let n=[],r=new Set,i=t;for(;i!==void 0&&!r.has(i.name);){r.add(i.name),n.push(i);let t=i.parent;i=t===null?void 0:e.parts.find(e=>e.name===t)}let a=Z.create(),o=Q.identity(),s=1;for(let e of n.reverse())Z.add(a,Q.transform(o,Z.multiplyScalar(e.root,s)),a),o=Q.multiply(o,Et(e.turn)),s*=e.scale;return{at:a,turn:o,scale:s}}var kt=(e,t)=>ht.map(n=>{let[r,i]=gt[n],[a,o]=bt[n];return{kind:n,side:t[n],axis:vt[yt[n]],fixedCoords:(t,n)=>{let s=Z.create();return s[vt[r]]=a?e[r]-1-t:t,s[vt[i]]=o?e[i]-1-n:n,s}}}),At=(e,t,n)=>{let r=new Map(n.map(e=>[e.kind,e])),i=[];for(let n of _t){let[a,o]=xt[n],s=r.get(a),c=r.get(o),l=e[n],u=vt[n],d=t.filter(e=>e.axis===n).map(e=>({...e,at:Math.min(Math.max(e.at,0),l)})).sort((e,t)=>e.at-t.at),f=0,p={fixedCoords:s.fixedCoords,side:s.side};for(let e of d)i.push({axis:u,from:f,to:e.at,faces:[p,{fixedCoords:c.fixedCoords,side:e.before}]}),f=e.at,p={fixedCoords:s.fixedCoords,side:e.after};i.push({axis:u,from:f,to:l,faces:[p,{fixedCoords:c.fixedCoords,side:c.side}]})}return i},jt=(e,t)=>{let n=Array(e),r=Array(e);for(let e of t)for(let t=e.from;t<e.to;t++)n[t]=e.faces[0].side,r[t]=e.faces[1].side;return{low:n,high:r}};function Mt(e,t,n=[],r=new Uint8Array(e.width*e.height*e.depth*4)){let{height:i,width:a,depth:o}=e,s=a*i*o*4;if(r.length!==s)throw Error(`out.length expected to be ${s}`);let c=({x:e,y:t,z:n})=>n*a*i+t*a+e<<2,l={x:4,y:a*4,z:a*i*4},u=kt(e,t);r.fill(255);let d=At(e,n,u);for(let e of d){let t=l[e.axis];for(let{side:n,fixedCoords:i}of e.faces)for(let a=0;a<n.height;++a){let o=a*n.width;for(let s=0;s<n.width;++s){if(n.data[o+s]!==dt.EMPTY)continue;let l=c(i(s,a))+e.from*t;for(let n=e.from;n<e.to;++n)r[l+3]!==0&&(r[l]=0,r[l+1]=0,r[l+2]=0,r[l+3]=0),l+=t}}}let f={x:jt(a,d.filter(e=>e.axis===`x`)),y:jt(i,d.filter(e=>e.axis===`y`)),z:jt(o,d.filter(e=>e.axis===`z`))};for(let e=0;e<o;e++)for(let t=0;t<i;t++){let n=i-1-t;for(let s=0;s<a;s++){let c=e*a*i+t*a+s<<2;if(r[c+3]===0)continue;let l=Nt(f.z.high[e],s,n),u=Nt(f.z.low[e],a-1-s,n),d=Nt(f.x.low[s],e,n),p=Nt(f.x.high[s],o-1-e,n),m=Nt(f.y.high[t],s,e),h=Nt(f.y.low[t],s,o-1-e);r[c+0]=l|(u&7)<<5,r[c+1]=u>>3&3|(d&31)<<2|(p&1)<<7,r[c+2]=p>>1&15|(m&15)<<4,r[c+3]=m>>4&1|(h&31)<<1|192}}return r}var Nt=(e,t,n)=>{let r=e.data[n*e.width+t];return r===dt.EMPTY?0:r},Pt=(e,t,n)=>{e[t+0]=n|(n&7)<<5,e[t+1]=n>>3&3|(n&31)<<2|(n&1)<<7,e[t+2]=n>>1&15|(n&15)<<4,e[t+3]=n>>4&1|(n&31)<<1|It};function Ft(e){let t=new Uint8Array(e.length*4);return e.forEach(({r:e,g:n,b:r,a:i},a)=>{let o=a<<2;t[o+0]=e,t[o+1]=n,t[o+2]=r,t[o+3]=i}),t}var It=192;function Lt(e){return e.width*e.height*e.depth}function Rt(e){return{dimensions:{...e},voxels:new Uint8Array(Lt(e)).fill(dt.EMPTY)}}function zt(e,t,n,r){return r*e.width*e.height+n*e.width+t}function Bt(e,t,n,r){return t>=0&&n>=0&&r>=0&&t<e.width&&n<e.height&&r<e.depth}var Vt=`CVOX`,Ht=`SIZE`,Ut=`CMAP`,Wt=`CUBE`,Gt=`VMAP`,Kt=`XYZ `,qt=8,Jt=7,Yt=6,Xt=3,Zt=15,Qt=({r:e,g:t,b:n,a:r})=>`${e},${t},${n},${r}`,$t=(e,t)=>e[t]|e[t+1]<<8|e[t+2]<<16,en=(e,t,n)=>{e[t]=n&255,e[t+1]=n>>8&255,e[t+2]=n>>16&255},tn=(e,t)=>({r:e[t],g:e[t+1],b:e[t+2],a:e[t+3]}),nn=(e,t,{r:n,g:r,b:i,a})=>{e[t]=n,e[t+1]=r,e[t+2]=i,e[t+3]=a},rn=(e,t)=>new DataView(e.buffer,e.byteOffset,e.byteLength).getInt32(t,!0);function an(e){let t=new DataView(e.buffer,e.byteOffset,e.byteLength),n=[];for(let r=0;r+qt<=e.length;){let i=String.fromCharCode(e[r],e[r+1],e[r+2],e[r+3]),a=t.getUint32(r+4,!0),o=r+qt;if(o+a>e.length)throw Error(`this .cvox file's ${JSON.stringify(i)} chunk claims ${a} bytes and runs past the end of the file`);n.push({id:i,start:o,size:a}),r=o+a}return n}function on(e,t){if(t.size%Jt!==0)throw Error(`this .cvox file's ${t.id.trim()} chunk is ${t.size} bytes, which is not a whole number of colours`);let n=[],r=[];for(let i=0;i+Jt<=t.size;i+=Jt){let a=tn(e,t.start+i);n.push(a);for(let n=$t(e,t.start+i+4);n>0;n--)r.push(a)}return{colours:n,runs:r}}var sn=(e,t)=>({dimensions:Z.create(e[t],e[t+1],e[t+2]),translation:Z.create(rn(e,t+3),rn(e,t+7),rn(e,t+11))});function cn(e,t,n){if(t===void 0)throw Error(`this .cvox file has a CUBE chunk with no CMAP chunk to give its cubes their colours`);if(n.size%Yt!==0)throw Error(`this .cvox file's CUBE chunk is ${n.size} bytes, which is not a whole number of cubes`);let{runs:r}=on(e,t),i=[];for(let t=0,a=0;t+Yt<=n.size;t+=Yt,a++){let o=Z.create(e[n.start+t],e[n.start+t+1],e[n.start+t+2]);i.push({low:o,high:Z.create(e[n.start+t+3],e[n.start+t+4],e[n.start+t+5]),colour:r[a]??un})}return i}function ln(e,t,n){if(t===void 0)throw Error(`this .cvox file has an XYZ chunk with no VMAP chunk to give its voxels their colours`);if(n.size%Xt!==0)throw Error(`this .cvox file's XYZ chunk is ${n.size} bytes, which is not a whole number of voxels`);let{runs:r}=on(e,t),i=[];for(let t=0,a=0;t+Xt<=n.size;t+=Xt,a++)i.push({at:Z.create(e[n.start+t],e[n.start+t+1],e[n.start+t+2]),colour:r[a]??un});return i}var un={r:0,g:0,b:0,a:255};function dn(e){let t=an(e),n=t[0];if(n===void 0||n.id!==Vt)throw Error(`this is not a .cvox file: it does not start with a CVOX chunk`);if(n.size<4)throw Error(`this .cvox file's version chunk is too short to hold a version`);let r=rn(e,n.start);if(r!==1)throw Error(`this .cvox file is version ${r}, and only version 1 is read`);let i=[],a,o=[],s=[],c=[],l,u;for(let n of t.slice(1))switch(n.id){case Ht:if(a!==void 0&&i.push({...a,cubes:o,voxels:s,colours:c}),n.size<Zt)throw Error(`this .cvox file's SIZE chunk is ${n.size} bytes, too short to hold a size and a position`);a=sn(e,n.start),o=[],s=[],c=[],l=void 0,u=void 0;break;case Ut:l=n,c=[...c,...on(e,n).colours];break;case Gt:u=n,c=[...c,...on(e,n).colours];break;case Wt:o=cn(e,l,n);break;case Kt:s=ln(e,u,n)}if(a===void 0)throw Error(`this .cvox file holds no model`);return i.push({...a,cubes:o,voxels:s,colours:c}),fn(i)}function fn(e){let t=Z.create(1/0,1/0,1/0),n=Z.create(-1/0,-1/0,-1/0);for(let r of e)t.x=Math.min(t.x,r.translation.x),t.y=Math.min(t.y,r.translation.y),t.z=Math.min(t.z,r.translation.z),n.x=Math.max(n.x,r.translation.x+r.dimensions.x),n.y=Math.max(n.y,r.translation.y+r.dimensions.y),n.z=Math.max(n.z,r.translation.z+r.dimensions.z);let r={width:n.x-t.x,height:n.y-t.y,depth:n.z-t.z},{palette:i,indexFor:a,dropped:o}=mn(e),s=Rt(r);for(let n of e){let e=Z.subtract(n.translation,t);for(let t of n.cubes)for(let n=t.low.x;n<=t.high.x;n++)for(let i=t.low.y;i<=t.high.y;i++)for(let o=t.low.z;o<=t.high.z;o++)pn(s,r,a(t.colour),{x:e.x+n,y:e.y+i,z:e.z+o});for(let t of n.voxels)pn(s,r,a(t.colour),{x:e.x+t.at.x,y:e.y+t.at.y,z:e.z+t.at.z})}return{volume:s,palette:i,dropped:o}}var pn=(e,t,n,r)=>{Bt(t,r.x,r.y,r.z)&&(e.voxels[zt(t,r.x,r.y,r.z)]=n)};function mn(e){let t=[],n=new Set,r=e=>{let r=Qt(e);n.has(r)||(n.add(r),t.push(e))};for(let t of e)for(let e of t.colours)r(e);let i=new Map,a=(e,t)=>{let n=Qt(e),r=i.get(n);r===void 0?i.set(n,{colour:e,count:t}):r.count+=t};for(let t of e){for(let e of t.cubes){let{x:t,y:n,z:r}=Z.subtract(e.high,e.low);a(e.colour,(t+1)*(n+1)*(r+1))}for(let e of t.voxels)a(e.colour,1)}let o=[...i.values()].filter(({colour:e})=>!n.has(Qt(e))).sort((e,t)=>t.count-e.count||Qt(e.colour).localeCompare(Qt(t.colour))).map(({colour:e})=>e),s=[...t,...o],c=s.slice(0,32),l=s.slice(32),u=new Map(c.map((e,t)=>[Qt(e),t])),d=new Map(l.map(e=>[Qt(e),hn(c,e)]));return{palette:c,dropped:l,indexFor:e=>u.get(Qt(e))??d.get(Qt(e))??0}}var hn=(e,t)=>{let n=0,r=1/0;return e.forEach((e,i)=>{let a=(t.r-e.r)**2+(t.g-e.g)**2+(t.b-e.b)**2+(t.a-e.a)**2;a<r&&(r=a,n=i)}),n};function gn(e){let{dimensions:t,voxels:n}=e,{width:r,height:i,depth:a}=t,o=(e,n,r)=>zt(t,e,n,r),s=new Uint8Array(Lt(t)),c=[],l=[],u=(e,t,c,l)=>e<r&&t<i&&c<a&&s[o(e,t,c)]===0&&n[o(e,t,c)]===l;for(let e=0;e<a;e++)for(let t=0;t<i;t++)for(let l=0;l<r;l++){if(s[o(l,t,e)]!==0)continue;let r=n[o(l,t,e)];if(r===dt.EMPTY){s[o(l,t,e)]=1;continue}let d=1;for(;u(l+d,t,e,r);)d++;let f=1;grow:for(;t+f<i;){for(let n=0;n<d;n++)if(!u(l+n,t+f,e,r))break grow;f++}let p=1;stack:for(;e+p<a;){for(let n=0;n<f;n++)for(let i=0;i<d;i++)if(!u(l+i,t+n,e+p,r))break stack;p++}for(let n=0;n<p;n++)for(let r=0;r<f;r++)for(let i=0;i<d;i++)s[o(l+i,t+r,e+n)]=1;c.push({low:Z.create(l,t,e),high:Z.create(l+d-1,t+f-1,e+p-1),index:r})}for(let e=0;e<a;e++)for(let t=0;t<i;t++)for(let i=0;i<r;i++)s[o(i,t,e)]===0&&n[o(i,t,e)]!==dt.EMPTY&&l.push({at:Z.create(i,t,e),index:n[o(i,t,e)]});return{cubes:c,voxels:l}}function _n(e,t){let{dimensions:n}=e;for(let[e,t]of[[`width`,n.width],[`height`,n.height],[`depth`,n.depth]])if(t>255)throw Error(`a .cvox file says where a voxel is in one byte along each axis, so a model's ${e} of ${t} will not fit in one`);let{cubes:r,voxels:i}=gn(e),a=(e,n)=>t.flatMap((t,r)=>e.filter(e=>n(e)===r)),o=a(r,e=>e.index),s=a(i,e=>e.index),c=t.map((e,t)=>o.filter(e=>e.index===t).length),l=t.map((e,t)=>s.filter(e=>e.index===t).length),u=[new Uint8Array(4),vn(n),yn(t,c),bn(o),yn(t,l),xn(s)],d=[Vt,Ht,Ut,Wt,Gt,Kt];new DataView(u[0].buffer).setInt32(0,1,!0);let f=u.reduce((e,t)=>e+qt+t.length,0),p=new Uint8Array(f),m=0;return d.forEach((e,t)=>{for(let t=0;t<4;t++)p[m+t]=e.charCodeAt(t);new DataView(p.buffer).setUint32(m+4,u[t].length,!0),m+=qt,p.set(u[t],m),m+=u[t].length}),p}function vn({width:e,height:t,depth:n}){let r=new Uint8Array(Zt);r[0]=e,r[1]=t,r[2]=n;let i=new DataView(r.buffer);return i.setInt32(3,0,!0),i.setInt32(7,0,!0),i.setInt32(11,0,!0),r}function yn(e,t){let n=new Uint8Array(e.length*Jt);return e.forEach((e,r)=>{nn(n,r*Jt,e),en(n,r*Jt+4,t[r])}),n}var bn=e=>{let t=new Uint8Array(e.length*Yt);return e.forEach(({low:e,high:n},r)=>{let i=r*Yt;t[i]=e.x,t[i+1]=e.y,t[i+2]=e.z,t[i+3]=n.x,t[i+4]=n.y,t[i+5]=n.z}),t},xn=e=>{let t=new Uint8Array(e.length*Xt);return e.forEach(({at:e},n)=>{t[n*Xt]=e.x,t[n*Xt+1]=e.y,t[n*Xt+2]=e.z}),t};function Sn(e,t,n){let{width:r,height:i,depth:a}=t;if(n.dimensions.width!==r||n.dimensions.height!==i||n.dimensions.depth!==a)throw Error(`an edit over a ${n.dimensions.width} by ${n.dimensions.height} by ${n.dimensions.depth} box cannot be applied to a ${r} by ${i} by ${a} one`);for(let o=0;o<a;o++)for(let a=0;a<i;a++)for(let i=0;i<r;i++){let r=zt(t,i,a,o),s=n.voxels[r];if(s===dt.EMPTY)continue;let c=r<<2;if(s===254){e[c+0]=0,e[c+1]=0,e[c+2]=0,e[c+3]=0;continue}Pt(e,c,s)}return e}var Cn=e=>e.voxels.some(e=>e!==dt.EMPTY),wn={r:0,g:0,b:0,a:0},Tn=(e,t)=>{let n=new Set,r=!1;for(let t of e.voxels)t!==dt.EMPTY&&(t===254?r=!0:n.add(t));let i=r?[wn]:[],a=new Map;for(let e of[...n].sort((e,t)=>e-t)){let n=t[e];if(n===void 0)throw Error(`an edit is in colour ${e}, which a palette of ${t.length} has no colour for`);a.set(e,i.length),i.push(n)}let o=Rt(e.dimensions);for(let t=0;t<e.voxels.length;t++){let n=e.voxels[t];n!==dt.EMPTY&&(o.voxels[t]=n===254?0:a.get(n)??0)}return{volume:o,palette:i}},En=(e,t)=>{let n=Rt(e.volume.dimensions);for(let r=0;r<e.volume.voxels.length;r++){let i=e.volume.voxels[r];if(i===dt.EMPTY)continue;let a=e.palette[i];if(a===void 0)continue;if(Dn(a,wn)){n.voxels[r]=254;continue}let o=t.findIndex(e=>Dn(e,a));if(o<0)throw Error(`an edit is in a colour this figure's palette does not have, rgb(${a.r}, ${a.g}, ${a.b}, ${a.a})`);n.voxels[r]=o}return n},Dn=(e,t)=>e.r===t.r&&e.g===t.g&&e.b===t.b&&e.a===t.a,On={name:``,framesPerSecond:12,loop:!0,parts:[]};function kn(e,t){switch(e){case`hold`:return 0;case`in`:return t*t;case`out`:return t*(2-t);case`in-out`:return t*t*(3-2*t);default:return t}}var $=(e,t,n)=>e[n*3+t];function An(e){let t=$(e,0,0)+$(e,1,1)+$(e,2,2);if(t>0){let n=Math.sqrt(t+1)*2;return[($(e,2,1)-$(e,1,2))/n,($(e,0,2)-$(e,2,0))/n,($(e,1,0)-$(e,0,1))/n,.25*n]}let n=$(e,0,0)>$(e,1,1)&&$(e,0,0)>$(e,2,2)?0:$(e,1,1)>$(e,2,2)?1:2,r=(n+1)%3,i=(n+2)%3,a=Math.sqrt(1+$(e,n,n)-$(e,r,r)-$(e,i,i))*2,o=[0,0,0];return o[n]=.25*a,o[r]=($(e,r,n)+$(e,n,r))/a,o[i]=($(e,n,i)+$(e,i,n))/a,[o[0],o[1],o[2],($(e,i,r)-$(e,r,i))/a]}function jn([e,t,n,r]){let i=Q.create();return i[0]=1-2*(t*t+n*n),i[1]=2*(e*t+n*r),i[2]=2*(e*n-t*r),i[3]=2*(e*t-n*r),i[4]=1-2*(e*e+n*n),i[5]=2*(t*n+e*r),i[6]=2*(e*n+t*r),i[7]=2*(t*n-e*r),i[8]=1-2*(e*e+t*t),i}function Mn(e,t,n){let r=An(Et(e)),i=An(Et(t)),a=r[0]*i[0]+r[1]*i[1]+r[2]*i[2]+r[3]*i[3];if(a<0&&(i=[-i[0],-i[1],-i[2],-i[3]],a=-a),a>.9995)return Dt(jn([0,1,2,3].map(e=>r[e]+(i[e]-r[e])*n)));let o=Math.acos(a),s=Math.sin(o),c=Math.sin((1-n)*o)/s,l=Math.sin(n*o)/s;return Dt(jn([0,1,2,3].map(e=>r[e]*c+i[e]*l)))}function Nn(e,t,n){let r=(e,t)=>e+(t-e)*n;return{root:Z.create(r(e.root.x,t.root.x),r(e.root.y,t.root.y),r(e.root.z,t.root.z)),turn:Mn(e.turn,t.turn,n),scale:r(e.scale,t.scale)}}var Pn=({root:e,turn:t,scale:n})=>({root:e,turn:t,scale:n});function Fn(e,t){if(e.length===0)return;let n=e[0],r=e[e.length-1];if(t<=n.at)return Pn(n);if(t>=r.at)return Pn(r);let i=0,a=e.length-2,o=0;for(;i<=a;)if(o=Math.floor((i+a)/2),t<e[o].at)a=o-1;else if(t>e[o+1].at)i=o+1;else break;let s=e[o],c=e[o+1],l=c.at-s.at;return Nn(Pn(s),Pn(c),kn(s.ease,l===0?1:(t-s.at)/l))}function In(e,t){return e.parts.find(e=>e.part===t)?.keys??[]}function Ln(e){let t=0;for(let{keys:n}of e.parts){let e=n[n.length-1];e!==void 0&&e.at>t&&(t=e.at)}return t}var Rn=e=>e.parts.every(({keys:e})=>e.length===0);function zn(e,t,n){return Rn(t)?e:{...e,parts:e.parts.map(e=>{let r=Fn(In(t,e.name),n);return r===void 0?e:{...e,...r}})}}function Bn(e){let{width:t,height:n,data:r}=e;return lt({width:t,height:n,data:r,channels:1,depth:8})}function Vn(e){let t=ct(e);if(t.depth!==8)throw Error(`holds ${t.depth} bits per sample, and only eight is read`);return{width:t.width,height:t.height,data:new Uint8Array(t.data)}}var Hn=`palette.png`,Un=`parts.json`,Wn=`edits.cvox`,Gn=`body`,Kn=(e,t)=>`${St(e,t)}.png`;function qn(e){let t=new Uint8Array(e.length*4);return e.forEach(({r:e,g:n,b:r,a:i},a)=>{let o=a<<2;t[o+0]=e,t[o+1]=n,t[o+2]=r,t[o+3]=i}),lt({width:e.length,height:1,data:t,channels:4,depth:8})}function Jn(e){let t=ct(e),n=[];for(let e=0;e<t.width;e++){let r=e<<2;n.push({r:t.data[r+0],g:t.data[r+1],b:t.data[r+2],a:t.data[r+3]})}return n}var Yn=32,Xn=(e,t,n)=>e<<16|t<<8|n;function Zn(e){let t=new Set;for(let n of e)for(let e=0;e<n.width*n.height*4;e+=4)n.data[e+3]!==0&&t.add(Xn(n.data[e],n.data[e+1],n.data[e+2]));return t}function Qn(e,t){let n=Array.from({length:Yn},(e,n)=>t[n]??{r:0,g:0,b:0,a:255}),r=n.map(({r:e,g:t,b:n})=>Xn(e,t,n)),i=new Map,a=[];for(let t=0;t<Yn;t++)e.has(r[t])?i.set(r[t],i.get(r[t])??t):a.push(t);let o=[...e].filter(e=>!i.has(e)),s=[];for(let e of o){let t=a.shift();if(t===void 0){s.push(e);continue}n[t]={r:e>>16&255,g:e>>8&255,b:e&255,a:255},i.set(e,t)}return{palette:n,indexOf:i,dropped:s}}function $n(e,t){return e.length>=Yn?e:Array.from({length:Yn},(n,r)=>e[r]??t[r]??{r:0,g:0,b:0,a:255})}function er(e,t){let n=dt.create(e.width,e.height);for(let r=0;r<n.data.length;r++){let i=r<<2;if(e.data[i+3]===0)continue;let a=t.get(Xn(e.data[i],e.data[i+1],e.data[i+2]));a!==void 0&&(n.data[r]=a)}return n}function tr(e){let{x:t,y:n,z:r}=e??{};return Z.create(typeof t==`number`?t:0,typeof n==`number`?n:0,typeof r==`number`?r:0)}var nr=[`linear`,`in`,`out`,`in-out`,`hold`];function rr(e){return Array.isArray(e)?e.map((e,t)=>{let n=e?.name,r=e?.framesPerSecond,i=e?.loop,a=e?.parts;return{name:typeof n==`string`?n:On.name,framesPerSecond:typeof r==`number`?r:On.framesPerSecond,loop:typeof i==`boolean`?i:On.loop,parts:(Array.isArray(a)?a:[]).map(e=>{let n=e?.part;if(typeof n!=`string`||n===``)throw Error(`${Un} gives a key of motion ${t} no part to move`);let r=e?.keys;return{part:n,keys:(Array.isArray(r)?r:[]).map(e=>{let r=e?.at;if(typeof r!=`number`)throw Error(`${Un} gives a key of ${n} in motion ${t} no frame to stand at`);let i=e?.ease,a=e?.scale;return{at:r,ease:nr.includes(i)?i:`linear`,root:tr(e?.root),turn:tr(e?.turn),scale:typeof a==`number`&&a>0?a:1}})}})}}):[]}function ir(e){let t;try{t=JSON.parse(e)}catch(e){throw Error(`${Un} is not readable as JSON: ${e}`)}let n=t?.parts;if(!Array.isArray(n))throw Error(`${Un} lists no parts`);return{version:5,parts:n.map((e,t)=>{let n=e?.name;if(typeof n!=`string`||n===``)throw Error(`${Un} gives part ${t} no name`);let r=e.parent,i=e.sections,a=e.scale;return{name:n,root:tr(e.root),pivot:tr(e.pivot),turn:tr(e.turn),scale:typeof a==`number`&&a>0?a:1,parent:typeof r==`string`?r:null,sections:(Array.isArray(i)?i:[]).map((e,t)=>{let{axis:r,at:i}=e??{};if(!_t.includes(r))throw Error(`${Un} cuts ${n} across "${r}", which is not one of its axes`);if(typeof i!=`number`)throw Error(`${Un} gives cut ${t} of ${n} nowhere to stand`);return{axis:r,at:i}})}}),motions:rr(t?.motions)}}async function ar(e,t=[]){let n=await pt.default.loadAsync(e),r=new Map,i,a,o=e=>{let t=r.get(e);return t===void 0&&(t={indexed:{},edits:void 0,asColours:{},sectionFaces:new Map},r.set(e,t)),t};for(let[e,t]of Object.entries(n.files)){let e=t.name.toLowerCase();if(e===Hn){i=Jn(new Uint8Array(await(await t.async(`blob`)).arrayBuffer()));continue}if(e===Un){a=ir(await t.async(`text`));continue}let n=/^(?:(.+)\/)?edits\.cvox$/i.exec(t.name);if(n!==null){o(n[1]??``).edits=new Uint8Array(await(await t.async(`blob`)).arrayBuffer());continue}let r=/^(?:(.+)\/)?([^/]+)\.png$/i.exec(t.name);if(r===null)continue;let s=r[1]??``,c=r[2].toLowerCase(),l=c,u=Ct(c);if(!mt[l]&&u===void 0)continue;let d=await(await t.async(`blob`)).arrayBuffer(),f=ct(new Uint8Array(d));if(f.depth!==8)throw Error(`${t.name} holds ${f.depth} bits per sample, and only eight is read`);let p={width:f.width,height:f.height,data:new Uint8Array(f.data)};if(u!==void 0){if(f.channels===4)throw Error(`${t.name} holds colours, and a section's face is only read as palette indices`);let e=o(s).sectionFaces;e.set(u.cut,{...e.get(u.cut),[u.face]:p});continue}if(f.channels===4){o(s).asColours[l]=f;continue}o(s).indexed[l]=p}let s=[...r.values()].flatMap(e=>Object.keys(e.asColours).map(t=>e.asColours[t])),c=s.length!==0;if(c){let e=Qn(Zn(s),i??t);e.dropped.length!==0&&console.error(`This model was drawn in ${e.dropped.length+Yn} colours and a palette holds ${Yn}. The cells drawn in the ${e.dropped.length} that did not fit have been emptied.`),i=e.palette;for(let t of r.values())for(let n of Object.keys(t.asColours))t.indexed[n]=er(t.asColours[n],e.indexOf)}!c&&i!==void 0&&t.length>0&&(i=$n(i,t));let l=i??t;return{parts:(a?.parts??[{name:Gn,root:Z.create(),turn:Z.create(),scale:1,parent:null,sections:[]}]).map(({name:e,root:t,pivot:n,turn:i,scale:o,parent:s,sections:c})=>{let u=a===void 0?``:e,d=r.get(u)?.indexed??{},f=lr(d,u);for(let e of ht){let[t,n]=gt[e];d[e]??=dt.create(f[t],f[n])}return{name:e,sides:d,sections:or(c,r.get(u),f,e),root:t,pivot:n??wt(f),turn:i,scale:o,parent:s,edits:cr(r.get(u),f,l,e)}}),palette:l,migrated:c,motions:a?.motions??[]}}function or(e,t,n,r){let i=[];return e.forEach(({axis:e,at:a},o)=>{let s=t?.sectionFaces.get(o);if(s?.before===void 0||s.after===void 0)return;let[c,l]=gt[xt[e][0]];for(let t of[s.before,s.after])if(t.width!==n[c]||t.height!==n[l])throw Error(`${r}'s cut ${o} is drawn ${t.width} by ${t.height}, and the ${e} it cuts across makes it ${n[c]} by ${n[l]}`);i.push({axis:e,at:a,before:s.before,after:s.after})}),i}var sr=32;function cr(e,t,n,r){if(e?.edits===void 0)return;let i=dn(e.edits);if(i.volume.dimensions.width!==t.width||i.volume.dimensions.height!==t.height||i.volume.dimensions.depth!==t.depth)throw Error(`"${r}" has edits over a ${i.volume.dimensions.width} by ${i.volume.dimensions.height} by ${i.volume.dimensions.depth} box and its drawings measure ${t.width} by ${t.height} by ${t.depth}`);return En(i,n)}function lr(e,t){let n={};for(let r of ht){let i=e[r];if(i===void 0)continue;let[a,o]=gt[r];for(let[e,s]of[[a,i.width],[o,i.height]]){let i=n[e];if(i===void 0){n[e]={by:r,of:s};continue}if(i.of!==s){let n=t===``?``:`${t}/`;throw Error(`${n}${r}.png makes the model ${s} ${e===`height`?`high`:e===`width`?`wide`:`deep`}, and ${n}${i.by}.png makes it ${i.of} — the six sides are not faces of one box`)}}}return{width:n.width?.of??sr,height:n.height?.of??sr,depth:n.depth?.of??sr}}function ur(e){return e!==``&&!/[/\\]/.test(e)&&e!==`.`&&e!==`..`}async function dr(e,t=[]){let n=new pt.default,r=new Set;for(let t of e.parts){if(!ur(t.name))throw Error(`"${t.name}" cannot name a part`);if(r.has(t.name))throw Error(`Two parts are called "${t.name}"`);r.add(t.name);for(let e of ht)n.file(`${t.name}/${e}.png`,Bn(t.sides[e]));if(t.edits!==void 0&&Cn(t.edits)){let r=Tn(t.edits,e.palette);n.file(`${t.name}/${Wn}`,_n(r.volume,r.palette))}t.sections.forEach((e,r)=>{for(let i of[`before`,`after`])n.file(`${t.name}/${Kn(r,i)}`,Bn(e[i]))})}let i={version:5,parts:e.parts.map(({name:e,root:t,pivot:n,turn:r,scale:i,parent:a,sections:o})=>({name:e,root:t,pivot:n,turn:r,scale:i,parent:a,sections:o.map(({axis:e,at:t})=>({axis:e,at:t}))})),motions:t.map(({name:e,framesPerSecond:t,loop:n,parts:r})=>({name:e,framesPerSecond:t,loop:n,parts:r.map(({part:e,keys:t})=>({part:e,keys:t.map(({at:e,ease:t,root:n,turn:r,scale:i})=>({at:e,ease:t,root:n,turn:r,scale:i}))}))}))};return n.file(Un,JSON.stringify(i,null,2)),n.file(Hn,qn(e.palette)),n.generateAsync({type:`blob`})}var fr=`app.bms.voxelscape.place`,pr=`manifest.json`,mr=`.json`,hr=e=>e.toLowerCase().endsWith(`.json`)?e.slice(0,-5):null,gr=e=>`${e}${mr}`,_r=`https://big-mesh-studios.github.io/big-mesh-studios/voxelscape/`,vr=[`solo`,`solo:edit`,`multi`,`multi:edit`],yr=e=>!Array.isArray(e)||e.length!==3?!1:e.every(e=>typeof e==`number`&&Number.isFinite(e)&&Math.abs(e)<=1e7),br=e=>typeof e==`string`&&e.length>=1&&e.length<=256,xr=e=>e===void 0||vr.includes(e),Sr=e=>{if(typeof e!=`object`||!e)return!1;let t=e;return!br(t.name)||typeof t.seed!=`number`||!Number.isFinite(t.seed)||!yr(t.spawn)||!xr(t.mode)?!1:Tr(t.scripts,64,256)&&Tr(t.levels,8,128)&&Tr(t.models,64,256)&&Cr(t)},Cr=e=>{let t=e.levels;if(t===void 0)return!0;if(!Array.isArray(t))return!1;let n=new Set([...wr(e.scripts),...wr(e.models)]),r=new Set;return t.every(e=>{if(typeof e!=`string`)return!1;let t=hr(e);if(t===null||t===``||n.has(e))return!1;let i=t.toLowerCase();return!r.has(i)&&(r.add(i),!0)})},wr=e=>Array.isArray(e)?e.filter(e=>typeof e==`string`):[],Tr=(e,t,n)=>e===void 0||Array.isArray(e)&&e.length<=t&&e.every(e=>typeof e==`string`&&e.length>=1&&e.length<=n&&!e.startsWith(`/`)&&!e.includes(`..`)),Er=e=>Array.isArray(e)&&e.length<=64&&e.every(e=>{if(typeof e!=`object`||!e)return!1;let{name:t,source:n}=e;return typeof t==`string`&&t.length>=1&&t.length<=256&&!t.startsWith(`/`)&&!t.includes(`..`)&&typeof n==`string`&&n.length<=1e5}),Dr=e=>Array.isArray(e)&&e.length<=64&&e.every(e=>{if(typeof e!=`object`||!e)return!1;let{name:t,uri:n,cid:r}=e;return typeof t==`string`&&t.length>=1&&t.length<=256&&!t.startsWith(`/`)&&!t.includes(`..`)&&typeof n==`string`&&typeof r==`string`}),Or=e=>e===void 0||Array.isArray(e)&&e.length<=8&&e.every(e=>{if(typeof e!=`object`||!e)return!1;let{name:t,source:n}=e;return typeof t==`string`&&t.length>=1&&t.length<=128&&!t.includes(`.`)&&!t.includes(`/`)&&!t.includes(`\\`)&&typeof n==`string`&&n.length<=32e3}),kr=e=>{if(typeof e!=`object`||!e)return!1;let t=e;return t.$type===`app.bms.voxelscape.place`&&br(t.name)&&typeof t.seed==`number`&&Number.isFinite(t.seed)&&yr(t.spawn)&&typeof t.createdAt==`string`&&Er(t.scripts)&&Or(t.levels)&&Dr(t.models)&&xr(t.mode)};function Ar(e){let t=e.toLowerCase().replace(/[^a-z0-9.\-_~]+/g,`-`).replace(/-+/g,`-`).replace(/^[-.]+|[-.]+$/g,``).slice(0,512);if(t===``)throw Error(`"${e}" holds no letters or digits to name a place by`);return t}var jr=(e,t,n,r,i=[])=>({$type:fr,name:e.name,seed:e.seed,spawn:e.spawn,createdAt:t,scripts:n,...i.length>0?{levels:i}:{},models:r,...e.mode===void 0?{}:{mode:e.mode}}),Mr=(e,t)=>`at://${e}/${fr}/${t}`,Nr=e=>{let t=/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/.exec(e);return t===null||t[2]!==`app.bms.voxelscape.place`?null:{repo:t[1],rkey:t[3]}},Pr=async e=>{let t;try{t=await pt.default.loadAsync(await e.arrayBuffer())}catch{throw Error(`not a zip a place was saved as`)}let n=t.file(pr);if(n===null)throw Error(`no ${pr} at the zip's root`);let r;try{r=JSON.parse(await n.async(`text`))}catch{throw Error(`${pr} is not valid JSON`)}if(!Sr(r))throw Error(`${pr} is not a place manifest this can open`);for(let e of[...r.scripts??[],...r.levels??[],...r.models??[]])if(t.file(e)===null)throw Error(`the manifest names "${e}", which the zip does not hold`);return r},Fr=`// The \`"voxelscape"\` module's ambient types: the one place every function
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
// \`LevelsByName\` is filled the first of those two ways only, by
// \`levels-dts.ts\` from a place's own attached levels. Declaration merging is
// what makes all of that additive rather than something this file has to know
// about in advance.
//
// This file carries no top-level \`import\` of its own — an inline
// \`import("./effects")\` type reaches the same file without one — because a
// top-level import would turn \`declare module "voxelscape"\` below from a
// fresh ambient module declaration into an augmentation of one that would
// then need to already exist elsewhere.
declare module "voxelscape" {
  /**
   * Every effect tag a place script may dispatch, in the order the world lists
   * them. A script never needs to name it — \`dispatch\` infers the tag from the
   * string it is given — but it is the union the effects section of the
   * reference is built from.
   */
  export type EffectTag = import("./effects").EffectTag;
  type ParsedEffect = import("./effects").ParsedEffect;
  /**
   * The read side of the world, as a set of functions. Each is written to be a
   * pure function of the shared clock and the replicated state, so every peer's
   * script reads the same world at the same moment.
   */
  export type WorldQuery = import("./sandbox").WorldQuery;
  /** One parsed fact \`onTick\` hands a script, exactly as the trusted side authored it. */
  export type ScriptEvent = import("./events").ScriptEvent;

  /**
   * The shape \`tag\` validates against, per \`effects.ts\`'s own \`ParsedEffect\`.
   * Naming it lets a script type the payload it builds before dispatching it,
   * which is how a payload gets its fields checked at the point it is written
   * rather than at the point it is sent.
   */
  export type PayloadFor<T extends EffectTag> = Extract<
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
  /** Writes a line to the terminal the place editor keeps under its scripts. */
  export function log(line: string): void;
  /** Milliseconds on the clock every peer in the place shares. */
  export const getNow: WorldQuery["getNow"];
  /** Every ending this place has defined. */
  export const getEndings: WorldQuery["getEndings"];

  /** One player's live position, by the did that identifies them. */
  export type Player = import("./sandbox").LivePlayer;
  /** One scripted figure as a query sees it. */
  export type EntitySnapshot = import("./sandbox").EntitySnapshot;
  /** Where a ray first met the world, and what it met. */
  export type RaycastHit = import("./sandbox").RaycastHit;
  /** A value a script may hang on an entity under a name. */
  export type AttributeValue = import("./sandbox").AttributeValue;
  /** One player's score on a leaderboard. */
  export type LeaderboardEntry = import("./sandbox").LeaderboardEntry;

  /** Every player's live position: the local player first, then connected peers. */
  export const getPlayers: WorldQuery["getPlayers"];
  /** The player \`did\` names, or null when they are not in the place. */
  export const getPlayer: WorldQuery["getPlayer"];
  /** Every player in the box \`min\` to \`max\`, inclusive. */
  export const getPlayersInBox: WorldQuery["getPlayersInBox"];
  /** The DID of the player on this peer, or "" when they are not signed in. */
  export const getLocalPlayer: WorldQuery["getLocalPlayer"];
  /** The local player's live movement and tool input, or null where the world reports none. */
  export type LocalInput = import("./sandbox").LocalInput;
  /**
   * The local player's live movement and tool input, or null where the world
   * reports none. Only the player on this peer has one.
   */
  export const getInput: WorldQuery["getInput"];
  /** The value set for \`player\` under \`key\`, or null when none. */
  export const getPlayerValue: WorldQuery["getPlayerValue"];
  /** The players ranked by \`key\`, highest first, at most \`count\` of them. */
  export const getLeaderboard: WorldQuery["getLeaderboard"];
  /** Which players a remembered value belongs to: one, or everyone in the place. */
  export type DataScope = import("./sandbox").DataScope;
  /** A value a place may remember: a string, a finite number, or a boolean. */
  export type DataValue = import("./sandbox").DataValue;
  /** The value the place remembers under \`scope\`/\`key\` for \`player\`, or null when there is none. */
  export function getData(
    scope: DataScope,
    player: string,
    key: string,
  ): DataValue | null;
  /** The players whose remembered number under \`key\` ranks, highest first, at most \`count\`. */
  export function getDataLeaderboard(
    key: string,
    count: number,
  ): Array<{ player: string; value: number }>;
  /** Saves \`value\` for \`player\` ("" for the local player) under \`key\`. */
  export function savePlayerData(
    key: string,
    value: DataValue,
    player?: string,
  ): void;
  /** Saves \`value\` for everyone under \`key\`. */
  export function saveGlobalData(key: string, value: DataValue): void;
  /** Forgets \`key\` for \`player\` ("" for the local player). */
  export function deletePlayerData(key: string, player?: string): void;
  /** Saves \`value\` for the signed-in account, whatever place it is read in. */
  export function saveAccountData(key: string, value: DataValue): void;
  /** Forgets \`key\` for the signed-in account. */
  export function deleteAccountData(key: string): void;
  /** Asks the world to read a remembered value; the answer arrives as a \`data-loaded\` fact. */
  export function requestData(
    scope: DataScope,
    key: string,
    requestId: string,
    player?: string,
  ): void;
  /** Awards the badge \`badge\` to \`player\` ("" for the local player). */
  export function awardBadge(badge: string, player?: string): void;
  /** Sends \`player\` ("" for the local player) to another place, carrying \`carry\` keys into the account scope. */
  export function teleport(
    place: string,
    player?: string,
    carry?: string[],
  ): void;

  /** Who the catalog opens for, and what it starts the search on. */
  export interface CatalogOptions {
    /** The player the catalog is shown to; "" for the local player. */
    player?: string;
    /**
     * The handle or DID to seed the search with — the account whose published
     * places are listed. Omit it to list every published place instead.
     */
    query?: string;
  }

  /**
   * Opens the world's place catalog — the search over published places a
   * player enters by picking one — through the "catalog" effect.
   */
  export function openCatalog(options?: CatalogOptions): void;

  /** Which of the world's own avatars a player may be drawn as. */
  export type AvatarKind = "cube" | "human";

  /**
   * Draws a player as one of the world's own avatars — the cube or a walking
   * human — and remembers it as the avatar they carry into other places.
   */
  export function setPlayerAvatar(kind: AvatarKind, player?: string): void;

  /** Dresses a player in one of the place's models; "" returns them to the plain cube. */
  export function setPlayerModel(
    model: keyof ModelsByName | "",
    player?: string,
  ): void;
  /** Takes the worn model off a player, back to the plain cube. */
  export function clearPlayerModel(player?: string): void;

  /** Which corner of the screen a scripted panel docks to. */
  export type UiAnchor =
    "top-left" | "top-right" | "bottom-left" | "bottom-right";

  /** The player a scripted UI is shown to; "" means the local player. */
  export interface UiTarget {
    player?: string;
  }

  /** A panel of scripted UI. */
  export interface UiPanelOptions extends UiTarget {
    id: string;
    /** The panel's heading, or "" for none. */
    title?: string;
    /** Which corner it docks to; defaults to top-left. */
    anchor?: UiAnchor;
  }
  /** Shows one player a panel of items, docked to a screen corner. */
  export function uiPanel(options: UiPanelOptions): void;

  /** Where an item joins a panel. */
  export interface UiItemTarget extends UiTarget {
    panel: string;
    id: string;
  }

  /** A line of text. */
  export interface UiLabelOptions extends UiItemTarget {
    text: string;
    /** Linear RGB, 0 to 1 each; defaults to white. */
    color?: [number, number, number];
  }
  /** Puts a line of text into a panel the script showed. */
  export function uiLabel(options: UiLabelOptions): void;

  /** A labelled bar. */
  export interface UiBarOptions extends UiItemTarget {
    label?: string;
    value: number;
    max: number;
  }
  /** Puts a labelled bar into a panel the script showed. */
  export function uiBar(options: UiBarOptions): void;

  /** A button; its press arrives as a \`ui-clicked\` fact. */
  export interface UiButtonOptions extends UiItemTarget {
    label: string;
    /** Carried on the \`ui-clicked\` fact, so one handler can tell buttons apart. */
    value?: string;
  }
  /** Puts a button into a panel the script showed; its press arrives as a \`ui-clicked\` fact. */
  export function uiButton(options: UiButtonOptions): void;

  /** An item-sprite image. */
  export interface UiImageOptions extends UiItemTarget {
    /** An item id whose sprite the world draws. */
    sprite: string;
  }
  /** Puts an item-sprite image into a panel the script showed. */
  export function uiImage(options: UiImageOptions): void;

  /** Takes an item off a panel, or the whole panel when \`item\` is omitted. */
  export interface UiRemoveOptions extends UiTarget {
    panel: string;
    item?: string;
  }
  /** Takes an item off a panel, or the whole panel when \`item\` is omitted. */
  export function uiRemove(options: UiRemoveOptions): void;
  /**
   * Shows a leaderboard to the local player as a HUD text readout, ranking the
   * players by the player-value \`key\`; call it whenever the values change.
   */
  export function showLeaderboard(
    id: string,
    title: string,
    key: string,
    count?: number,
  ): void;
  /** The item id the local player is holding, or "" for none. */
  export function getHeldItem(): string;
  /** The block id at (\`x\`, \`y\`, \`z\`), or 0 for air. */
  export const getBlockAt: WorldQuery["getBlockAt"];
  /** The scripted figure \`id\` names, or null when there is none. */
  export const getEntity: WorldQuery["getEntity"];
  /** Every scripted figure in the box \`min\` to \`max\`, inclusive, in id order. */
  export const getEntitiesInBox: WorldQuery["getEntitiesInBox"];
  /** Every scripted figure within \`radius\` of a point, in id order. */
  export const getEntitiesInSphere: WorldQuery["getEntitiesInSphere"];
  /** Every scripted figure carrying \`tag\`, in id order. */
  export const getEntitiesWithTag: WorldQuery["getEntitiesWithTag"];
  /** Where a ray from \`origin\` along \`direction\` first meets the world, or null within \`maxDistance\` world units. */
  export const raycast: WorldQuery["raycast"];
  /** The walkable route from \`from\` to \`to\`, as world-unit waypoints, or null when none exists within the bounds. */
  export function findPath(
    from: [number, number, number],
    to: [number, number, number],
    options?: { maxNodes?: number; maxCells?: number },
  ): Array<[number, number, number]> | null;

  /** Where an NPC walks to, how fast, and how hard the route search tries. */
  export interface WalkToOptions {
    x: number;
    z: number;
    y?: number;
    /** World units per second; defaults to 4. */
    speed?: number;
    maxNodes?: number;
    maxCells?: number;
  }
  /** The terrain surface at (x, z). */
  export const getHeightAt: WorldQuery["getHeightAt"];
  /** Whether (x, y, z) is inside solid ground. */
  export const getSolidAt: WorldQuery["getSolidAt"];
  /** Whether (x, y, z) is water. */
  export const getWaterAt: WorldQuery["getWaterAt"];
  /**
   * Registers a handler the world calls each step with the shared clock and
   * the facts since the last step, already parsed — \`events\` is the exact
   * \`ScriptEvent[]\` the trusted side authored, not the JSON text it crossed
   * the sandbox boundary as.
   */
  export function onTick(
    fn: (clockMs: number, events: ScriptEvent[]) => void,
  ): void;
  /**
   * Registers what builds this place's terrain, called once before the first
   * fill. Either a plan already written out, as \`plan\` hands one back, or a
   * function answering with one when the world calls it with this place's seed
   * and the region a plan may build in — whichever it is, the plan is read as a
   * \`LevelPlan\`.
   */
  export function onPlan(
    answer: string | ((contextJson: string) => string),
  ): void;
  /** Every block id a script may name, by name, so no voxel id is ever written by hand. */
  export const blocks: Record<string, number>;

  /** A three-axis vector, its arithmetic returning new vectors so a script's own value is never mutated. */
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z: number);
    static create(x: number, y: number, z: number): Vector3;
    static fromArray(a: readonly number[]): Vector3;
    static zero(): Vector3;
    static one(): Vector3;
    add(v: Vector3): Vector3;
    sub(v: Vector3): Vector3;
    scale(s: number): Vector3;
    mul(v: Vector3): Vector3;
    dot(v: Vector3): number;
    cross(v: Vector3): Vector3;
    readonly length: number;
    unit(): Vector3;
    distanceTo(v: Vector3): number;
    lerp(v: Vector3, t: number): Vector3;
    clone(): Vector3;
    toArray(): [number, number, number];
    equals(v: Vector3): boolean;
  }

  /** A two-axis vector, its arithmetic returning new vectors. */
  export class Vector2 {
    x: number;
    y: number;
    constructor(x: number, y: number);
    static create(x: number, y: number): Vector2;
    static fromArray(a: readonly number[]): Vector2;
    static zero(): Vector2;
    add(v: Vector2): Vector2;
    sub(v: Vector2): Vector2;
    scale(s: number): Vector2;
    dot(v: Vector2): number;
    readonly length: number;
    unit(): Vector2;
    lerp(v: Vector2, t: number): Vector2;
    toArray(): [number, number];
  }

  /** A colour whose three channels run from 0 to 1. */
  export class Color3 {
    r: number;
    g: number;
    b: number;
    constructor(r: number, g: number, b: number);
    static create(r: number, g: number, b: number): Color3;
    static fromRGB(r: number, g: number, b: number): Color3;
    static fromHex(hex: string): Color3;
    lerp(c: Color3, t: number): Color3;
    toArray(): [number, number, number];
  }

  /** Holds \`value\` within \`min\` and \`max\`. */
  export function clamp(value: number, min: number, max: number): number;
  /** The point \`t\` of the way from \`a\` to \`b\`; \`t\` is not clamped. */
  export function lerp(a: number, b: number, t: number): number;
  /** Eases \`t\` from 0 to 1 with zero slope at each end, clamping \`t\` first. */
  export function smoothstep(t: number): number;
  /** A random integer from \`min\` to \`max\`, both included, from the seeded stream. */
  export function randint(min: number, max: number): number;
  /** A random real number from \`min\` up to but not including \`max\`. */
  export function randFloat(min: number, max: number): number;
  /** One element of \`array\`, chosen from the seeded stream; undefined when empty. */
  export function choice<T>(array: readonly T[]): T | undefined;

  /** What a model is made of, keyed by name in \`ModelsByName\`. */
  export interface ModelDescriptor {
    readonly name: string;
    readonly file: string;
    readonly parts: readonly string[];
    readonly motions: readonly string[];
  }

  /** Every model this place carries, keyed by the bare name \`createNpc\`/\`createProp\` take — empty until augmented. */
  export interface ModelsByName {}

  /**
   * Every level this place carries, keyed by the bare name \`plan\` takes — empty
   * until augmented. A level is its plan as text, so every entry is the string
   * an \`onPlan\` call answers with.
   */
  export interface LevelsByName {}

  /** The level plan this place carries under \`name\`, as \`onPlan\` answers one. */
  export function plan(name: keyof LevelsByName): string;

  /** How a figure is tinted and faded over the colours its model wears. */
  export interface EntityLookOptions {
    /** The colour the figure is multiplied by, each channel 0 to 1; defaults to white. */
    color?: [number, number, number];
    /** The share of the figure's opacity kept, 0 to 1; defaults to 1. */
    alpha?: number;
  }

  /** How a figure plays one of its model's motions. */
  export interface AnimationPlayOptions {
    /** How fast to play it; defaults to 1. */
    speed?: number;
    /** Whether it repeats; defaults to the motion's own loop. */
    loop?: boolean;
  }

  /** Where a figure stands and faces, over the id/model a create call also takes. */
  export interface FigurePlacement {
    x: number;
    z: number;
    y?: number;
    yaw?: number;
  }

  /** A figure's placement, re-sent on \`move\`. \`live\` marks a position the script computed itself as the figure's current owner, to broadcast to other peers rather than leave for each of them to compute independently — see the "npc" effect's own \`live\` field, which this passes straight through, and defaults to true. A prop, which has no such field, ignores it. \`vx\`/\`vy\`/\`vz\` say how fast a driven prop's own body is moving, in world units per second, so a player standing on it is carried. */
  export interface FigureMove extends FigurePlacement {
    live?: boolean;
    vx?: number;
    vy?: number;
    vz?: number;
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
    /** Names this figure answers to in a query. */
    readonly tags: readonly string[];
    /** Values the script hangs on this figure under a name. */
    readonly attributes: Readonly<Record<string, AttributeValue>>;
    /** Gives this figure a value under \`key\`, replacing any it held there, and returns this figure. */
    setAttribute(key: string, value: AttributeValue): NpcHandle<M>;
    /** The value this figure holds under \`key\`, or undefined. */
    getAttribute(key: string): AttributeValue | undefined;
    /** Names this figure with \`tag\`, and returns this figure. */
    addTag(tag: string): NpcHandle<M>;
    /** Takes \`tag\` off this figure, and returns this figure. */
    removeTag(tag: string): NpcHandle<M>;
    /** Moves the figure and re-dispatches its placement. */
    move(options: FigureMove): void;
    /** Walks the figure to a point along a route the world searches for, and returns whether one exists. */
    walkTo(options: WalkToOptions): boolean;
    /** Plays one of the model's motions, named as the model's file names it. */
    play(
      name: M extends ModelDescriptor ? M["motions"][number] : string,
      options?: AnimationPlayOptions,
    ): NpcHandle<M>;
    /** Stops the NPC's animation, standing it back at rest. */
    stop(): NpcHandle<M>;
    /** Tints and fades the NPC over its model's colours. */
    setLook(options: EntityLookOptions): NpcHandle<M>;
    /** Clears the NPC's tint and fade. */
    clearLook(): NpcHandle<M>;
    /** Removes the NPC outright — no death fall. */
    remove(): void;
    /** Plays a death fall in place of an outright removal, then forgets it the same way. */
    die(): void;
  }

  /**
   * An NPC's whole address: where it stands, which model it wears, and what a
   * script hangs on it. \`id\` and the placement are required because every peer
   * replaying the script has to compute the same address for the same figure.
   */
  export interface CreateNpcOptions<
    K extends keyof ModelsByName | undefined,
  > extends FigurePlacement {
    /** Which model this NPC wears; omit it to leave the world drawing its own default figure. */
    model?: K;
    id: string;
    /** Shown to players, e.g. "Zombie" — the model it wears is a separate thing from what it is called. */
    name?: string;
    /** Reads the model live from its own \`at://\` address instead of the place's bundled files. */
    modelUri?: string;
    /** Names this NPC answers to in a query, e.g. "enemy". */
    tags?: string[];
    /** Values a script hangs on this NPC under a name. */
    attributes?: Record<string, AttributeValue>;
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
    /** Names this figure answers to in a query. */
    readonly tags: readonly string[];
    /** Values the script hangs on this figure under a name. */
    readonly attributes: Readonly<Record<string, AttributeValue>>;
    /** Gives this figure a value under \`key\`, replacing any it held there, and returns this figure. */
    setAttribute(key: string, value: AttributeValue): PropHandle<M>;
    /** The value this figure holds under \`key\`, or undefined. */
    getAttribute(key: string): AttributeValue | undefined;
    /** Names this figure with \`tag\`, and returns this figure. */
    addTag(tag: string): PropHandle<M>;
    /** Takes \`tag\` off this figure, and returns this figure. */
    removeTag(tag: string): PropHandle<M>;
    /** Plays one of the model's motions, named as the model's file names it. */
    play(
      name: M["motions"][number],
      options?: AnimationPlayOptions,
    ): PropHandle<M>;
    /** Stops the prop's animation, standing it back at rest. */
    stop(): PropHandle<M>;
    /** Tints and fades the prop over its model's colours. */
    setLook(options: EntityLookOptions): PropHandle<M>;
    /** Clears the prop's tint and fade. */
    clearLook(): PropHandle<M>;
    move(options: FigureMove): void;
    remove(): void;
  }

  /**
   * A prop's whole address, as \`createNpc\` hands it back. A prop is a figure
   * with no mind: the same placement and model, and the handles a script moves
   * it with rather than talks to.
   */
  export interface CreatePropOptions<
    K extends keyof ModelsByName,
  > extends FigurePlacement {
    model: K;
    id: string;
    name?: string;
    height?: number;
    solid?: boolean;
    hazard?: boolean;
    /** Whether a player standing on the prop is turned to the prop's heading, as a seat. */
    seat?: boolean;
    conveyor?: { vx: number; vz: number };
    /** A path and spin the prop follows over the shared clock, in place of \`move\`. */
    motion?: import("./motion").MotionSpec;
    /** Names this prop answers to in a query, e.g. "enemy". */
    tags?: string[];
    /** Values a script hangs on this prop under a name. */
    attributes?: Record<string, AttributeValue>;
  }

  /** Places a prop wearing the model named \`options.model\`; see \`createNpc\` for how a name resolves and why \`id\` is never generated. */
  export function createProp<K extends keyof ModelsByName>(
    options: CreatePropOptions<K>,
  ): PropHandle<ModelsByName[K]>;

  /**
   * A box the player walks into rather than through, stood through the
   * "barrier"/"barrier-remove" effects. Drawn nothing, so it blocks a body
   * and none of what a script steers or a player shoots — the gap a horde
   * bashes its way through stays a wall to whoever pays it shut.
   */
  export interface BarrierHandle {
    readonly id: string;
    /** The box that blocks the player, in world units, inclusive. */
    readonly min: [number, number, number];
    readonly max: [number, number, number];
    /** Removes the barrier, opening the gap again. */
    remove(): void;
  }

  /** A box that blocks the player until it is taken down, in world units. */
  export interface CreateBarrierOptions {
    id: string;
    /** The box that blocks the player, in world units, inclusive. */
    min: [number, number, number];
    max: [number, number, number];
  }

  /** Stands a barrier; see \`createProp\` for why \`id\` is never generated. */
  export function createBarrier(options: CreateBarrierOptions): BarrierHandle;

  /** One shape a structure plan is written in, in LOD-0 world voxels. */
  export type PlanShape = import("../world/plan-shapes").PlanShape;
  /** How far one horizontal axis of a surface's footprint reaches. */
  export type SurfaceReach = import("../world/plan-shapes").SurfaceReach;

  /**
   * A named group of structure shapes a script places at run time, stood
   * through the "structure"/"structure-remove" effects. The world stamps the
   * group's shapes over the plan the world was built with, and taking the
   * group down regenerates the cells it reached, so the ground beneath it
   * comes back.
   */
  export interface StructureHandle {
    readonly id: string;
    /** Replaces the group's shapes, re-stamping the cells either set reaches. */
    setShapes(shapes: PlanShape[]): StructureHandle;
    /** Takes the whole group down. */
    remove(): void;
  }

  /** The shapes one named group stands, to be re-stamped or taken down as a unit. */
  export interface CreateStructureOptions {
    id: string;
    /** The plan shapes to stamp, in LOD-0 world voxels. */
    shapes: PlanShape[];
  }

  /** Places a named group of structure shapes; see \`createProp\` for why \`id\` is never generated. */
  export function createStructure(
    options: CreateStructureOptions,
  ): StructureHandle;

  /** Where a point light stands, or the figure it hangs over. */
  export interface CreateLightOptions {
    id: string;
    /** Hangs the light over this figure; when set, the position fields are ignored. */
    entityId?: string;
    x?: number;
    y?: number;
    z?: number;
    /** Linear RGB, 0 to 1 each; defaults to warm white. */
    color?: [number, number, number];
    /** How far the light reaches, in world units; defaults to 12. */
    range?: number;
    /** How brightly it burns; defaults to 1. */
    intensity?: number;
  }

  /** A light a place script has lit; \`remove\` puts it out. */
  export interface LightHandle {
    readonly id: string;
    remove(): void;
  }

  /** Lights a point or a figure; see \`createProp\` for why \`id\` is never generated. */
  export function createLight(options: CreateLightOptions): LightHandle;

  /** Where a world-space label hangs and what it says. */
  export interface CreateBillboardOptions {
    id: string;
    text: string;
    /** Hangs the label over this figure; when set, the position fields are ignored. */
    entityId?: string;
    x?: number;
    y?: number;
    z?: number;
    /** Linear RGB, 0 to 1 each; defaults to white. */
    color?: [number, number, number];
    /** Drawn height of the label in world units; defaults to 0.5. */
    scale?: number;
    /** How far above an attached figure's feet it hangs; defaults to 2.2. */
    height?: number;
  }

  /** A label a place script shows; \`remove\` takes it down. */
  export interface BillboardHandle {
    readonly id: string;
    remove(): void;
  }

  /** Shows a world-space label; see \`createProp\` for why \`id\` is never generated. */
  export function createBillboard(
    options: CreateBillboardOptions,
  ): BillboardHandle;

  /** One of the world's fixed particle kinds. */
  export type ParticleKind = "spark" | "flame" | "smoke" | "dust";

  /** Where an emitter runs and what it looks like. */
  export interface CreateParticleOptions {
    id: string;
    /** One of the world's fixed particle kinds; defaults to "spark". */
    kind?: ParticleKind;
    /** Hangs the emitter over this figure; when set, the position fields are ignored. */
    entityId?: string;
    x?: number;
    y?: number;
    z?: number;
    /** Linear RGB, 0 to 1 each; defaults to the kind's own colour. */
    color?: [number, number, number];
    /** Drawn size of one particle, in world units; defaults to the kind's own. */
    size?: number;
    /** How far particles travel, in world units; defaults to the kind's own. */
    spread?: number;
    /** How long one particle lives, in milliseconds; defaults to the kind's own. */
    lifeMs?: number;
    /** Whether it keeps emitting until removed; defaults to false. */
    loop?: boolean;
  }

  /** An emitter a place script runs; \`remove\` stops it. */
  export interface ParticleHandle {
    readonly id: string;
    remove(): void;
  }

  /** Runs a particle emitter; see \`createProp\` for why \`id\` is never generated. */
  export function createParticle(
    options: CreateParticleOptions,
  ): ParticleHandle;

  /** One of the world's fixed storm shapes. */
  export type StormKind = "wall" | "funnel";

  /** Where a dust storm stands and how it is sized. */
  export interface CreateStormOptions {
    id: string;
    /** One of the world's fixed storm shapes; defaults to "wall". */
    kind?: StormKind;
    x: number;
    z: number;
    /** The storm's base height in world units; defaults to the ground. */
    y?: number;
    /** Heading the storm travels toward, in radians; defaults to 0. */
    yaw?: number;
    /** A wall's half-width across the heading, or a funnel's base radius; defaults to 40. */
    width?: number;
    /** Drawn height of the storm in world units; defaults to 30. */
    height?: number;
    /** How far a wall runs front to back, in world units; defaults to 30. */
    depth?: number;
    /** How thick the dust reads, 0 to 1; defaults to 1. */
    intensity?: number;
    /** Linear RGB dust colour, 0 to 1 each; defaults to a sand tan. */
    color?: [number, number, number];
    /** Turns per second a funnel spins about its axis; defaults to a slow spin. */
    spin?: number;
  }

  /** The changes a storm handle's \`move\` may apply to the storm it drives. */
  export interface MoveStormOptions {
    kind?: StormKind;
    x?: number;
    z?: number;
    y?: number;
    yaw?: number;
    width?: number;
    height?: number;
    depth?: number;
    intensity?: number;
    color?: [number, number, number];
    spin?: number;
  }

  /** A dust storm a place script drives; \`move\` re-places it and \`remove\` takes it down. */
  export interface StormHandle {
    readonly id: string;
    move(options: MoveStormOptions): StormHandle;
    remove(): void;
  }

  /** Drives a dust storm; see \`createProp\` for why \`id\` is never generated. */
  export function createStorm(options: CreateStormOptions): StormHandle;

  /** One of the world's fixed mark shapes. */
  export type DecalKind = "arrow" | "cross" | "ring" | "splat";

  /** Where a flat mark lies and what it looks like. */
  export interface CreateDecalOptions {
    id: string;
    kind: DecalKind;
    /** Lies the mark under this figure; when set, the position fields are ignored. */
    entityId?: string;
    x?: number;
    y?: number;
    z?: number;
    /** Linear RGB, 0 to 1 each; defaults to white. */
    color?: [number, number, number];
    /** Drawn width in world units; defaults to 2. */
    size?: number;
    /** Rotation about the vertical axis, in radians; defaults to 0. */
    yaw?: number;
  }

  /** A mark a place script has laid; \`remove\` lifts it. */
  export interface DecalHandle {
    readonly id: string;
    remove(): void;
  }

  /** Lays a flat mark on the world; see \`createProp\` for why \`id\` is never generated. */
  export function createDecal(options: CreateDecalOptions): DecalHandle;

  /** Where a rift stands and how it reads. */
  export interface CreateRiftOptions {
    id: string;
    /** The rift's centre, in world units. */
    x: number;
    y: number;
    z: number;
    /** Drawn width across the sheet in world units; defaults to 6. */
    width?: number;
    /** Drawn height of the sheet in world units; defaults to 8. */
    height?: number;
    /** Rotation about the vertical axis, in radians; defaults to 0. */
    yaw?: number;
    /** Linear RGB, 0 to 1 each; defaults to a portal violet. */
    color?: [number, number, number];
    /** How strongly the rift reads, 0 to 1; defaults to 1. */
    intensity?: number;
    /** Turns per second the sheet churns; defaults to a slow churn. */
    spin?: number;
  }

  /** A rift a place script has opened; \`remove\` closes it. */
  export interface RiftHandle {
    readonly id: string;
    remove(): void;
  }

  /** Opens a rift; see \`createProp\` for why \`id\` is never generated. */
  export function createRift(options: CreateRiftOptions): RiftHandle;

  /** Where a beam's two ends stand: a figure it follows, or a world point. */
  export interface CreateBeamOptions {
    id: string;
    /** The figure the line starts at; exactly one of this and \`from\` is set. */
    fromEntity?: string;
    /** The world point the line starts at, in world units. */
    from?: [number, number, number];
    /** The figure the line ends at; exactly one of this and \`to\` is set. */
    toEntity?: string;
    /** The world point the line ends at, in world units. */
    to?: [number, number, number];
    /** Linear RGB, 0 to 1 each; defaults to white. */
    color?: [number, number, number];
    /** How wide the line is drawn, in world units; defaults to 0.1. */
    width?: number;
  }

  /** A line a place script draws; \`remove\` takes it down. */
  export interface BeamHandle {
    readonly id: string;
    remove(): void;
  }

  /** Draws a glowing line between two ends; see \`createProp\` for why \`id\` is never generated. */
  export function createBeam(options: CreateBeamOptions): BeamHandle;
}
`,Ir=`// The effect vocabulary a place script speaks: what its \`engine.dispatch(tag,
// payload)\` calls mean once the trusted side has applied them. A script never
// performs an effect — it queues one as a JSON payload, and this module is
// where a tag's shape and its bounds are decided, the same way
// \`multiplayer/messages.ts\` bounds every wire field. Anything a script asks for
// that is not a well-formed effect here is dropped, never applied.
import type { CameraShot } from "./cutscene";
import type { MotionSpec } from "./motion";
import { STORM_KINDS, type StormKind } from "../world/scripted-storm";
import {
  MAX_PLAN_SHAPES,
  isPlanShape,
  type PlanShape,
} from "../world/plan-shapes";
import type {
  AttributeValue,
  DataScope,
  DataValue,
  ScriptEffect,
} from "./sandbox";

/** Every particle kind a script may name; the world draws each one its own way. */
const PARTICLE_KINDS = ["spark", "flame", "smoke", "dust"] as const;
/** Every mark shape a script may name; the world draws each one its own way. */
const DECAL_KINDS = ["arrow", "cross", "ring", "splat"] as const;

type ParticleKind = (typeof PARTICLE_KINDS)[number];
type DecalKind = (typeof DECAL_KINDS)[number];

/** Every effect tag a place script may dispatch. */
export type EffectTag =
  | "npc"
  | "npc-remove"
  | "npc-die"
  | "prop"
  | "prop-remove"
  | "entity-set"
  | "fire"
  | "field"
  | "field-remove"
  | "zone"
  | "zone-remove"
  | "barrier"
  | "barrier-remove"
  | "item-define"
  | "item-give"
  | "item-take"
  | "item-hold"
  | "toast"
  | "sound"
  | "sound-stop"
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
  | "player-heal"
  | "player-max-health"
  | "team-define"
  | "player-team"
  | "player-value"
  | "player-push"
  | "report-hit"
  | "player-checkpoint"
  | "player-kill"
  | "player-respawn"
  | "void"
  | "cutscene"
  | "camera"
  | "camera-follow"
  | "camera-follow-clear"
  | "player-control"
  | "player-view"
  | "hud"
  | "hud-remove"
  | "explosion"
  | "block-set"
  | "block-fill"
  | "block-clear"
  | "structure"
  | "structure-remove"
  | "bind"
  | "prompt"
  | "prompt-remove"
  | "figure-animate"
  | "figure-stop"
  | "player-avatar"
  | "player-model"
  | "light"
  | "light-remove"
  | "billboard"
  | "billboard-remove"
  | "particle"
  | "particle-remove"
  | "storm"
  | "storm-remove"
  | "decal"
  | "decal-remove"
  | "rift"
  | "rift-remove"
  | "entity-look"
  | "entity-look-clear"
  | "beam"
  | "beam-remove"
  | "data-set"
  | "data-delete"
  | "data-get"
  | "badge-award"
  | "teleport"
  | "catalog"
  | "ui-panel"
  | "ui-label"
  | "ui-bar"
  | "ui-button"
  | "ui-image"
  | "ui-remove";

/** The furthest an NPC or prop may stand from the origin, in world units. */
export const MAX_NPC_COORD = 1_000_000;
/** The longest an NPC or prop's name may be. */
export const MAX_NPC_NAME = 40;
/** The most tags one entity may carry. */
export const MAX_TAGS = 32;
/** The longest a tag or an attribute's name may be. */
export const MAX_TAG_LENGTH = 40;
/** The most attributes one entity may carry. */
export const MAX_ATTRIBUTES = 32;
/** The longest a string attribute value may be. */
export const MAX_ATTRIBUTE_STRING = 256;
/** The longest a prop's model file name may be. */
export const MAX_PROP_MODEL = 128;
/** The longest an avatar kind's name may be. */
export const MAX_AVATAR_KIND = 16;
/** The tallest a prop may be drawn, in world units. */
export const MAX_PROP_HEIGHT = 64;
/** The most waypoints one motion's path may hold. */
export const MAX_MOTION_POINTS = 64;
/** The longest one motion traversal may take, in milliseconds. */
export const MAX_MOTION_MS = 86_400_000;
/** The furthest a motion's oscillation may move a figure, in world units. */
export const MAX_MOTION_AMPLITUDE = 64;
/** The largest spin rate a motion may ask for, per second or per metre. */
export const MAX_SPIN_RATE = 1_000;
/** The most whole turns a bounded spin may ask for. */
export const MAX_SPIN_TURNS = 1_000;
/** The furthest a motion's hinge may sit from its figure's origin, in world units. */
export const MAX_MOTION_PIVOT = 64;
/** The most shots one cutscene may hold. */
export const MAX_CUTSCENE_SHOTS = 64;
/** The longest one camera move or hold may last, in milliseconds. */
export const MAX_CAMERA_MS = 86_400_000;
/** The narrowest field of view a camera shot may ask for, in degrees. */
export const MIN_CAMERA_FOV = 1;
/** The widest field of view a camera shot may ask for, in degrees. */
export const MAX_CAMERA_FOV = 179;
/** The furthest a camera may shake, in world units. */
export const MAX_CAMERA_SHAKE = 16;
/** The furthest a followed camera may sit behind or above its figure, in world units. */
export const MAX_CAMERA_DISTANCE = 200;
/** The longest one HUD readout's id or label may be. */
export const MAX_HUD_LABEL = 64;
/** The longest one HUD readout's text may be; long enough for a ranked list. */
export const MAX_HUD_TEXT = 1_000;
/** The largest HUD value or maximum may read. */
export const MAX_HUD_VALUE = 1_000_000_000;
/** The longest a script item's id or name may be. */
export const MAX_ITEM_NAME = 40;
/** The longest an items-spritesheet sprite name may be. */
export const MAX_ITEM_SPRITE = 64;
/** The most of one item a \`give\`/\`take\` may move. */
export const MAX_ITEM_COUNT = 9_999;
/** The most hit points one weapon shot may deal. */
export const MAX_WEAPON_DAMAGE = 1_000;
/** The furthest a weapon shot may reach, in world units. */
export const MAX_WEAPON_REACH = 128;
/** The longest a weapon may ask a shot to wait before the next, in milliseconds. */
export const MAX_WEAPON_FIRE_INTERVAL_MS = 60_000;

/**
 * What a script item means as a weapon: holding it fires the primary button
 * instead of the wielded tool, with its own reach, rate, and damage.
 */
export interface WeaponSpec {
  /** Hit points one shot deals to the body it lands on. */
  damage: number;
  /** How far a shot reaches, in world units. */
  reach: number;
  /** The gap between shots, in milliseconds. */
  fireIntervalMs: number;
}

/** One item a place script defines for its own game. */
export interface ScriptItemDefinition {
  id: string;
  name: string;
  /** The items-spritesheet sprite the HUD shows, or "" for none. */
  sprite: string;
  stackable: boolean;
  /** The weapon this item is when held, or none for a plain carried item. */
  weapon?: WeaponSpec;
}
/** The longest a dialog prompt may be. */
export const MAX_DIALOG_PROMPT = 500;
/** The most options one dialog may offer. */
export const MAX_DIALOG_OPTIONS = 8;
/** The longest one option's text may be. */
export const MAX_OPTION_LENGTH = 80;
/** The longest a toast line may be. */
export const MAX_TOAST_LENGTH = 300;
/** The longest a sound effect's name may be. */
export const MAX_SOUND_NAME = 32;
/** The largest volume a sound may play at. */
export const MAX_SOUND_VOLUME = 1;
/** The slowest a sound may be pitched. */
export const MIN_SOUND_PITCH = 0.25;
/** The fastest a sound may be pitched. */
export const MAX_SOUND_PITCH = 4;
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
/** The most hit points one \`player-damage\` or \`player-heal\` effect may move. */
export const MAX_PLAYER_DAMAGE = 1_000;
/** The most hit points a player may be given with \`player-max-health\`. */
export const MAX_PLAYER_MAX_HEALTH = 100_000;
/** The fastest a \`player-push\` may throw a player, per axis, in units per second. */
export const MAX_PUSH_SPEED = 100;
/** The most hit points one \`report-hit\` may carry. */
export const MAX_REPORTED_HIT = 1_000;
/** The longest a bound key code may be. */
export const MAX_BIND_KEY = 32;
/** The longest a prompt's verb may be. */
export const MAX_PROMPT_VERB = 40;
/** How close, in world units, a player must be for a prompt to trigger. */
export const MAX_PROMPT_RANGE = 32;
/** The longest a model motion's name may be. */
export const MAX_ANIMATION_NAME = 64;
/** The largest multiple a figure may play its animation at. */
export const MAX_ANIMATION_SPEED = 100;
/** The furthest a scripted light reaches, in world units. */
export const MAX_LIGHT_RANGE = 64;
/** The brightest a scripted light may burn. */
export const MAX_LIGHT_INTENSITY = 20;
/** The longest a billboard's text may be. */
export const MAX_BILLBOARD_TEXT = 64;
/** The tallest a billboard may be drawn, in world units. */
export const MAX_BILLBOARD_SCALE = 8;
/** The furthest a billboard may hang above an attached figure's feet, in world units. */
export const MAX_BILLBOARD_HEIGHT = 32;
/** The largest one particle may be drawn, in world units. */
export const MAX_PARTICLE_SIZE = 4;
/** The furthest a particle may travel from its emitter, in world units. */
export const MAX_PARTICLE_SPREAD = 32;
/** The longest one particle may live, in milliseconds. */
export const MAX_PARTICLE_LIFE_MS = 30_000;
/** The widest or tallest a storm may be drawn, in world units. */
export const MAX_STORM_SIZE = 256;
/** The most turns per second a funnel may spin. */
export const MAX_STORM_SPIN = 1;
/** The widest a decal may be drawn, in world units. */
export const MAX_DECAL_SIZE = 32;
/** The widest or tallest a rift may be drawn, in world units. */
export const MAX_RIFT_SIZE = 64;
/** The most turns per second a rift may churn. */
export const MAX_RIFT_SPIN = 2;
/** The widest a beam may be drawn, in world units. */
export const MAX_BEAM_WIDTH = 1;
/** The longest a data key or a badge name may be. */
export const MAX_DATA_KEY = 64;
/** The longest a string a place may remember. */
export const MAX_DATA_STRING = 512;
/** The longest a teleport address may be. */
export const MAX_PLACE_ADDRESS = 256;
/** The longest an account handle or DID that seeds the place catalog may be. */
export const MAX_CATALOG_QUERY = 256;
/** The most keys one teleport may carry into the account scope. */
export const MAX_CARRY_KEYS = 32;
/** The most panels one player's scripted UI may show. */
export const MAX_UI_PANELS = 8;
/** The most items one panel may hold. */
export const MAX_UI_ITEMS = 32;
/** The longest a label, title, or button text may be. */
export const MAX_UI_TEXT = 200;
/** The longest a sprite name may be. */
export const MAX_UI_SPRITE = 64;
/** The longest a button's value may be. */
export const MAX_UI_VALUE = 128;

/** Which corner of the screen a scripted panel docks to. */
export type UiAnchor =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

const UI_ANCHORS: UiAnchor[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const isDataValue = (v: unknown): v is DataValue =>
  typeof v === "boolean" ||
  (typeof v === "string" && v.length <= MAX_DATA_STRING) ||
  (typeof v === "number" && Number.isFinite(v));

/** Whether a value is one of the scopes a remembered value may belong to. */
const isDataScope = (v: unknown): v is DataScope =>
  v === "player" || v === "global" || v === "account";
/** The longest a team's id or name, or a player-value's key, may be. */
export const MAX_TEAM_NAME = 64;
/** The largest magnitude a player-value may hold. */
export const MAX_PLAYER_VALUE = 1_000_000_000_000;
/** The widest an explosion may read, in world units. */
export const MAX_EXPLOSION_RADIUS = 64;
/** The furthest a script may address a voxel from the origin, in LOD-0 grid units. */
export const MAX_BLOCK_COORD = 1_000_000;
/** Voxel ids are a byte, so 0..255 covers every id a block effect may name. */
export const MAX_BLOCK_ID = 255;
/** The most voxels one \`block-fill\` or \`block-clear\` may touch. */
export const MAX_BLOCK_FILL = 32_768;
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
        /** Names this entity answers to in a query, e.g. "enemy". */
        tags?: string[];
        /** Values a script hangs on this entity under a name. */
        attributes?: Record<string, AttributeValue>;
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
        /** Whether a player standing on the prop is turned to the prop's heading, as a seat. */
        seat?: boolean;
        /** A path and spin the prop follows over the shared clock. */
        motion?: MotionSpec;
        /**
         * The horizontal velocity the prop's surface carries a player standing
         * on it, in units per second. It takes the place of a \`motion\` — a
         * static treadmill, a rolling walkway — so the two may not both be set.
         */
        conveyor?: { vx: number; vz: number };
        /**
         * The velocity the prop's own body is moving at, in units per second,
         * set by the script each time it moves the prop. Unlike a \`motion\`,
         * the pose is not sampled from a path: the prop stands where \`x\`/\`y\`/
         * \`z\` put it and this only says how fast its surface is going, so a
         * rider is carried. Takes the place of a \`motion\` and a \`conveyor\`.
         */
        velocity?: { vx: number; vy: number; vz: number };
        /** Names this entity answers to in a query, e.g. "enemy". */
        tags?: string[];
        /** Values a script hangs on this entity under a name. */
        attributes?: Record<string, AttributeValue>;
      };
    }
  | { tag: "prop-remove"; payload: { id: string } }
  | {
      tag: "entity-set";
      /** The tags and attributes to give the NPC or prop \`id\`, replacing what it carried. */
      payload: {
        id: string;
        tags?: string[];
        attributes?: Record<string, AttributeValue>;
      };
    }
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
  | {
      tag: "barrier";
      payload: {
        id: string;
        /** The box that blocks the player, in world units, inclusive. */
        min: [number, number, number];
        max: [number, number, number];
      };
    }
  | { tag: "barrier-remove"; payload: { id: string } }
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
      tag: "sound";
      payload: {
        /** The player meant to hear the effect; "" means everyone locally. */
        player: string;
        /**
         * One of the world's fixed sound vocabulary — an effect only names a
         * sound the world already ships, never a file or URL of its own.
         */
        name: string;
        /** Names the playing sound, so a later \`sound-stop\` can reach it. Required to loop. */
        id?: string;
        /** How loudly to play it, 0 to 1; defaults to 1. */
        volume?: number;
        /** How fast to play it, a fifth-speed to four-times; defaults to 1. */
        pitch?: number;
        /** Whether it repeats until stopped; defaults to false. */
        loop?: boolean;
      };
    }
  | { tag: "sound-stop"; payload: { player: string; id: string } }
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
      tag: "player-heal";
      payload: {
        player: string;
        /** Hit points to restore, never past the player's maximum. */
        amount: number;
      };
    }
  | {
      tag: "player-max-health";
      payload: {
        player: string;
        /** The most hit points the player may hold from now on, at least one heart's worth. */
        maxHealth: number;
      };
    }
  | {
      tag: "team-define";
      payload: {
        /** The team's id, matched by a \`player-team\`. */
        id: string;
        /** Shown to players; defaults to the id. */
        name?: string;
      };
    }
  | {
      tag: "player-team";
      payload: {
        player: string;
        /** The team id to put the player on, or "" to take them off any team. */
        team: string;
      };
    }
  | {
      tag: "player-value";
      payload: {
        player: string;
        /** Names the value, so a leaderboard can rank players by it. */
        key: string;
        value: number;
      };
    }
  | {
      tag: "player-push";
      payload: {
        player: string;
        /** The velocity to add to the player, per axis, in units per second. */
        vx: number;
        vy: number;
        vz: number;
      };
    }
  | {
      tag: "report-hit";
      payload: {
        /** The player whose swing or shot this is, so the fact names them. */
        player: string;
        /** The NPC the strike landed on. */
        entityId: string;
        /** Hit points the strike carried. */
        amount: number;
        /** Where the attacker stood when it landed, in world units. */
        attackerX: number;
        attackerZ: number;
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
        /** The field of view to move to, in degrees; the current one is kept when absent. */
        fov?: number;
        /** How far the view shakes, in world units; absent for a still one. */
        shake?: number;
      };
    }
  | {
      tag: "camera-follow";
      payload: {
        player: string;
        /** The scripted figure the camera follows until it is cleared. */
        entityId: string;
        /** How far behind the figure the camera sits, in world units; defaults to 8. */
        back?: number;
        /** How far above the figure the camera sits, in world units; defaults to 3. */
        up?: number;
        /** How far ahead of the figure the camera looks, in world units; defaults to 4. */
        lookAhead?: number;
        /** The field of view to hold, in degrees; the current one is kept when absent. */
        fov?: number;
      };
    }
  | { tag: "camera-follow-clear"; payload: { player: string } }
  | {
      tag: "player-control";
      payload: {
        player: string;
        /** Whether the script takes the player's movement and tools away. */
        locked: boolean;
      };
    }
  | {
      tag: "player-view";
      payload: {
        player: string;
        /**
         * Which camera the player sees the world through: \`"first"\` puts it at
         * the player's eye, \`"third"\` swings it out on a boom behind them.
         */
        view: "first" | "third";
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
    }
  | {
      tag: "block-set";
      payload: {
        /** The LOD-0 voxel to fill, in grid units. */
        voxel: [number, number, number];
        /** The voxel id to put there; 0 clears the voxel. */
        id: number;
      };
    }
  | {
      tag: "block-fill";
      payload: {
        /** The box to fill, in LOD-0 grid units, inclusive on both corners. */
        min: [number, number, number];
        max: [number, number, number];
        /** The voxel id to put through the box; 0 clears it. */
        id: number;
      };
    }
  | {
      tag: "block-clear";
      payload: {
        /** The box to clear, in LOD-0 grid units, inclusive on both corners. */
        min: [number, number, number];
        max: [number, number, number];
      };
    }
  | {
      tag: "structure";
      payload: {
        /** Names the group, so a later \`structure-remove\` reaches it, or a new one replaces it. */
        id: string;
        /** The plan shapes to stamp, in LOD-0 world voxels. */
        shapes: PlanShape[];
      };
    }
  | { tag: "structure-remove"; payload: { id: string } }
  | {
      tag: "bind";
      payload: {
        /** Names the binding, so the \`input\` fact can be matched to it. */
        id: string;
        /** The key code to listen on, or "" to remove the binding. */
        key: string;
        /** Shown to players; defaults to the key. */
        label?: string;
      };
    }
  | {
      tag: "prompt";
      payload: {
        /** Names the prompt, so the \`prompt-triggered\` fact can be matched to it. */
        id: string;
        /** The scripted figure the prompt stands on. */
        entityId: string;
        /** What the prompt invites the player to do, e.g. "Open". */
        verb: string;
        /** A key code shown as the shortcut beside the verb, or absent. */
        key?: string;
        /** How close the player must be, in world units; defaults to 5. */
        range?: number;
        /** Whether the prompt fires once and is then forgotten. */
        once?: boolean;
      };
    }
  | { tag: "prompt-remove"; payload: { id: string } }
  | {
      tag: "figure-animate";
      payload: {
        /** The scripted figure to play a motion on. */
        id: string;
        /** The model motion's name, as the model's own file names it. */
        name: string;
        /** How fast to play it; defaults to 1. */
        speed?: number;
        /** Whether it repeats; defaults to the motion's own loop. */
        loop?: boolean;
      };
    }
  | { tag: "figure-stop"; payload: { id: string } }
  | {
      tag: "player-avatar";
      payload: {
        /** The player whose avatar changes; "" for the local player. */
        player: string;
        /** Which of the world's avatars the player is drawn as. */
        kind: string;
      };
    }
  | {
      tag: "player-model";
      payload: {
        /** The player whose look changes; "" for the local player. */
        player: string;
        /** The place model file the player wears, or "" to go back to the plain cube. */
        model?: string;
        /** Reads the model live from its own \`at://\` address; takes precedence over \`model\`. */
        modelUri?: string;
      };
    }
  | {
      tag: "light";
      payload: {
        /** Names the light, so a later \`light-remove\` reaches it. */
        id: string;
        /** The figure the light hangs over; when set, the position fields are ignored. */
        entityId?: string;
        /** The light's position, in world units, required when it hangs over no figure. */
        x?: number;
        /** The light's height in world units; docked to the ground when absent. */
        y?: number;
        z?: number;
        /** Linear RGB, 0 to 1 each; defaults to warm white. */
        color?: [number, number, number];
        /** How far the light reaches, in world units; defaults to 12. */
        range?: number;
        /** How brightly it burns; defaults to 1. */
        intensity?: number;
      };
    }
  | { tag: "light-remove"; payload: { id: string } }
  | {
      tag: "billboard";
      payload: {
        /** Names the label, so a later \`billboard-remove\` reaches it, or a new one replaces it. */
        id: string;
        /** The line shown. */
        text: string;
        /** The figure the label hangs over; when set, the position fields are ignored. */
        entityId?: string;
        /** The label's position, in world units, required when it hangs over no figure. */
        x?: number;
        /** The label's height in world units; docked to the ground (plus \`height\`) when absent. */
        y?: number;
        z?: number;
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
        /** The drawn height of the label in world units; defaults to 0.5. */
        scale?: number;
        /** How far above an attached figure's feet the label hangs; defaults to 2.2. */
        height?: number;
      };
    }
  | { tag: "billboard-remove"; payload: { id: string } }
  | {
      tag: "particle";
      payload: {
        /** Names the emitter, so a later \`particle-remove\` reaches it. */
        id: string;
        /** The emitter's position, in world units, required when it hangs over no figure. */
        x?: number;
        /** The emitter's height in world units; docked to the ground when absent. */
        y?: number;
        z?: number;
        /** The figure the emitter hangs over; when set, the position fields are ignored. */
        entityId?: string;
        /** One of the world's fixed particle kinds; defaults to "spark". */
        kind?: ParticleKind;
        /** Linear RGB, 0 to 1 each; defaults to the kind's own colour. */
        color?: [number, number, number];
        /** Drawn size of one particle, in world units; defaults to the kind's own. */
        size?: number;
        /** How far particles travel, in world units; defaults to the kind's own. */
        spread?: number;
        /** How long one particle lives, in milliseconds; defaults to the kind's own. */
        lifeMs?: number;
        /** Whether it keeps emitting until removed; defaults to false. */
        loop?: boolean;
      };
    }
  | { tag: "particle-remove"; payload: { id: string } }
  | {
      tag: "storm";
      payload: {
        /** Names the storm, so a later \`storm-remove\` reaches it, or a new one replaces it. */
        id: string;
        /** One of the world's fixed storm shapes; defaults to "wall". */
        kind?: StormKind;
        /** The storm's centre, in world units; the host grounds it when \`y\` is absent. */
        x: number;
        z: number;
        /** The storm's base height in world units; defaults to the ground. */
        y?: number;
        /** Heading the storm travels toward, in radians; defaults to 0. */
        yaw?: number;
        /** A wall's half-width across the heading, or a funnel's base radius; defaults to 40. */
        width?: number;
        /** Drawn height of the storm in world units; defaults to 30. */
        height?: number;
        /** How far a wall runs front to back, in world units; defaults to 30. */
        depth?: number;
        /** How thick the dust reads, 0 to 1; defaults to 1. */
        intensity?: number;
        /** Linear RGB dust colour, 0 to 1 each; defaults to a sand tan. */
        color?: [number, number, number];
        /** Turns per second a funnel spins about its axis; defaults to a slow spin. */
        spin?: number;
      };
    }
  | { tag: "storm-remove"; payload: { id: string } }
  | {
      tag: "decal";
      payload: {
        /** Names the mark, so a later \`decal-remove\` reaches it. */
        id: string;
        /** One of the world's fixed mark shapes. */
        kind: DecalKind;
        /** The mark's position, in world units, required when it lies on no figure. */
        x?: number;
        /** The mark's height in world units; docked to the ground when absent. */
        y?: number;
        z?: number;
        /** The figure the mark lies under; when set, the position fields are ignored. */
        entityId?: string;
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
        /** Drawn width in world units; defaults to 2. */
        size?: number;
        /** Rotation about the vertical axis, in radians; defaults to 0. */
        yaw?: number;
      };
    }
  | { tag: "decal-remove"; payload: { id: string } }
  | {
      tag: "rift";
      payload: {
        /** Names the rift, so a later \`rift-remove\` reaches it, or a new one replaces it. */
        id: string;
        /** The rift's centre, in world units. */
        x: number;
        y: number;
        z: number;
        /** Drawn width across the sheet in world units; defaults to 6. */
        width?: number;
        /** Drawn height of the sheet in world units; defaults to 8. */
        height?: number;
        /** Rotation about the vertical axis, in radians; defaults to 0. */
        yaw?: number;
        /** Linear RGB, 0 to 1 each; defaults to a portal violet. */
        color?: [number, number, number];
        /** How strongly the rift reads, 0 to 1; defaults to 1. */
        intensity?: number;
        /** Turns per second the sheet churns; defaults to a slow churn. */
        spin?: number;
      };
    }
  | { tag: "rift-remove"; payload: { id: string } }
  | {
      tag: "entity-look";
      payload: {
        /** The scripted figure to tint or fade. */
        id: string;
        /** The colour the figure is multiplied by, each channel 0 to 1; defaults to white. */
        color?: [number, number, number];
        /** The share of the figure's opacity kept, 0 to 1; defaults to 1. */
        alpha?: number;
      };
    }
  | { tag: "entity-look-clear"; payload: { id: string } }
  | {
      tag: "beam";
      payload: {
        /** Names the line, so a later \`beam-remove\` reaches it. */
        id: string;
        /** The figure the line starts at; exactly one of this and \`from\` is set. */
        fromEntity?: string;
        /** The world point the line starts at, in world units. */
        from?: [number, number, number];
        /** The figure the line ends at; exactly one of this and \`to\` is set. */
        toEntity?: string;
        /** The world point the line ends at, in world units. */
        to?: [number, number, number];
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
        /** How wide the line is drawn, in world units; defaults to 0.1. */
        width?: number;
      };
    }
  | { tag: "beam-remove"; payload: { id: string } }
  | {
      tag: "data-set";
      payload: {
        /** Whether the value belongs to one player or to everyone. */
        scope: DataScope;
        /** The player the value belongs to; "" means the local player; ignored for global. */
        player?: string;
        /** Names the value, so it can be read back on a later run. */
        key: string;
        /** The value to remember. */
        value: DataValue;
      };
    }
  | {
      tag: "data-delete";
      payload: {
        scope: DataScope;
        player?: string;
        key: string;
      };
    }
  | {
      tag: "data-get";
      payload: {
        scope: DataScope;
        /** The player the value belongs to; "" means the local player; ignored for global. */
        player?: string;
        key: string;
        /** Names the request, so the \`data-loaded\` fact can be matched to it. */
        requestId: string;
      };
    }
  | {
      tag: "badge-award";
      payload: {
        /** The player to award; "" means the local player. */
        player?: string;
        /** Names the badge, so a later run can ask whether it was earned. */
        badge: string;
      };
    }
  | {
      tag: "teleport";
      payload: {
        /** The player to send; "" means the local player. */
        player: string;
        /** Where to send them: a published place's \`at://\` address, or a built-in demo as \`demo:<id>\`. */
        place: string;
        /** The player's saved keys to copy into the account scope, so the place they go to can read them. */
        carry?: string[];
      };
    }
  | {
      tag: "catalog";
      payload: {
        /** The player to show the catalog to; "" means the local player. */
        player: string;
        /**
         * The handle or DID to seed the search with, naming the account whose
         * places are listed. The world opens the place catalog on every
         * published place when this is left out or empty.
         */
        query?: string;
      };
    }
  | {
      tag: "ui-panel";
      payload: {
        /** The player whose overlay shows it; "" for the local player. */
        player: string;
        /** Names the panel, so later items and a remove reach it. */
        id: string;
        /** The panel's heading, or "" for none. */
        title?: string;
        /** Which corner it docks to; defaults to top-left. */
        anchor?: UiAnchor;
      };
    }
  | {
      tag: "ui-label";
      payload: {
        player: string;
        /** The panel the label belongs to. */
        panel: string;
        id: string;
        text: string;
        /** Linear RGB, 0 to 1 each; defaults to white. */
        color?: [number, number, number];
      };
    }
  | {
      tag: "ui-bar";
      payload: {
        player: string;
        panel: string;
        id: string;
        /** The bar's caption, or "" for none. */
        label?: string;
        value: number;
        max: number;
      };
    }
  | {
      tag: "ui-button";
      payload: {
        player: string;
        panel: string;
        id: string;
        label: string;
        /** Carried on the \`ui-clicked\` fact, so one handler can tell buttons apart. */
        value?: string;
      };
    }
  | {
      tag: "ui-image";
      payload: {
        player: string;
        panel: string;
        id: string;
        /** An item id whose sprite the world draws; the item's name when it has no sprite. */
        sprite: string;
      };
    }
  | {
      tag: "ui-remove";
      payload: {
        player: string;
        panel: string;
        /** The item to take off; the whole panel when absent. */
        item?: string;
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

/** Whether a value is one LOD-0 voxel coordinate this world can address. */
const isVoxel = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every(
    (n) =>
      typeof n === "number" &&
      Number.isInteger(n) &&
      Math.abs(n) <= MAX_BLOCK_COORD,
  );

/** Whether a value is a voxel id a \`Uint8Array\` store can hold. */
const isBlockId = (v: unknown): boolean =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_BLOCK_ID;

/** Whether a value is a voxel box this world can fill, its two corners ordered and its volume bounded. */
const isBlockBox = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const p = v as Record<string, unknown>;
  if (!isVoxel(p.min) || !isVoxel(p.max)) {
    return false;
  }
  const min = p.min as [number, number, number];
  const max = p.max as [number, number, number];
  if (!(min[0] <= max[0] && min[1] <= max[1] && min[2] <= max[2])) {
    return false;
  }
  return (
    (max[0] - min[0] + 1) * (max[1] - min[1] + 1) * (max[2] - min[2] + 1) <=
    MAX_BLOCK_FILL
  );
};

const isNumberIn = (v: unknown, min: number, max: number): boolean =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Whether a value is a string, number, or boolean a script may hang on an entity. */
const isAttributeValue = (v: unknown): v is AttributeValue =>
  typeof v === "boolean" ||
  (typeof v === "string" && v.length <= MAX_ATTRIBUTE_STRING) ||
  (typeof v === "number" && Number.isFinite(v));

/** Whether a value is a linear RGB colour, each channel from 0 to 1. */
const isColor3 = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every((n) => isNumberIn(n, 0, 1));

/** Whether a value is a list of names an entity may carry. */
const isTags = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= MAX_TAGS &&
  v.every((tag) => isShort(tag, MAX_TAG_LENGTH));

/** Whether a value is a table of named values an entity may carry. */
const isAttributes = (v: unknown): v is Record<string, AttributeValue> => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return false;
  }
  const entries = Object.entries(v);
  return (
    entries.length <= MAX_ATTRIBUTES &&
    entries.every(
      ([key, value]) => isShort(key, MAX_TAG_LENGTH) && isAttributeValue(value),
    )
  );
};

/** Whether a value is a weapon spec this world can fire. */
const isWeapon = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const w = v as Record<string, unknown>;
  return (
    isNumberIn(w.damage, 1, MAX_WEAPON_DAMAGE) &&
    isNumberIn(w.reach, 1, MAX_WEAPON_REACH) &&
    isNumberIn(w.fireIntervalMs, 1, MAX_WEAPON_FIRE_INTERVAL_MS)
  );
};

/** Whether a value is a back-and-forth offset along an axis this world can sample. */
const isOscillation = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    isNumberIn(o.amplitude, 0, MAX_MOTION_AMPLITUDE) &&
    isNumberIn(o.periodMs, 1, MAX_MOTION_MS) &&
    (o.axis === undefined || isVector(o.axis)) &&
    (o.startAfterMs === undefined ||
      isNumberIn(o.startAfterMs, 0, MAX_MOTION_MS))
  );
};

/** Whether a value is a path, spin, and oscillation this world can sample. */
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
  if (m.oscillate !== undefined && !isOscillation(m.oscillate)) {
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
  const rates = [s.turns, s.turnsPerSecond, s.degreesPerMeter].filter(
    (rate) => rate !== undefined,
  );
  if (rates.length !== 1) {
    return false;
  }
  if (
    s.turns !== undefined &&
    !isNumberIn(s.turns, -MAX_SPIN_TURNS, MAX_SPIN_TURNS)
  ) {
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
  if (
    s.pivot !== undefined &&
    (!isVector(s.pivot) ||
      s.pivot.some((v) => !isNumberIn(v, -MAX_MOTION_PIVOT, MAX_MOTION_PIVOT)))
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
  if (
    s.fov !== undefined &&
    !isNumberIn(s.fov, MIN_CAMERA_FOV, MAX_CAMERA_FOV)
  ) {
    return false;
  }
  if (s.shake !== undefined && !isNumberIn(s.shake, 0, MAX_CAMERA_SHAKE)) {
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

/** Whether a value is the velocity a script-driven prop moves its own body at. */
const isBodyVelocity = (v: unknown): boolean => {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const c = v as Record<string, unknown>;
  return (
    isNumberIn(c.vx, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED) &&
    isNumberIn(c.vy, -MAX_CONVEYOR_SPEED, MAX_CONVEYOR_SPEED) &&
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
        (p.motion === undefined || isMotion(p.motion)) &&
        (p.tags === undefined || isTags(p.tags)) &&
        (p.attributes === undefined || isAttributes(p.attributes))
      );
    case "npc-remove":
    case "npc-die":
      return isShort(p.id, 64);
    case "entity-set":
      return (
        isShort(p.id, 64) &&
        (p.tags === undefined || isTags(p.tags)) &&
        (p.attributes === undefined || isAttributes(p.attributes)) &&
        (p.tags !== undefined || p.attributes !== undefined)
      );
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
        (p.seat === undefined || typeof p.seat === "boolean") &&
        (p.motion === undefined || isMotion(p.motion)) &&
        (p.conveyor === undefined ||
          (p.motion === undefined && isConveyor(p.conveyor))) &&
        (p.velocity === undefined ||
          (p.motion === undefined &&
            p.conveyor === undefined &&
            isBodyVelocity(p.velocity))) &&
        (p.tags === undefined || isTags(p.tags)) &&
        (p.attributes === undefined || isAttributes(p.attributes))
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
    case "barrier": {
      const { min, max } = p;
      return (
        isShort(p.id, 64) &&
        isVector(min) &&
        isVector(max) &&
        min[0] <= max[0] &&
        min[1] <= max[1] &&
        min[2] <= max[2]
      );
    }
    case "barrier-remove":
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
        typeof p.stackable === "boolean" &&
        (p.weapon === undefined || isWeapon(p.weapon))
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
    case "sound":
      return (
        isPlayer(p.player) &&
        isShort(p.name, MAX_SOUND_NAME) &&
        (p.id === undefined || isShort(p.id, 64)) &&
        (p.volume === undefined || isNumberIn(p.volume, 0, MAX_SOUND_VOLUME)) &&
        (p.pitch === undefined ||
          isNumberIn(p.pitch, MIN_SOUND_PITCH, MAX_SOUND_PITCH)) &&
        (p.loop === undefined || typeof p.loop === "boolean") &&
        (p.loop !== true || isShort(p.id, 64))
      );
    case "sound-stop":
      return isPlayer(p.player) && isShort(p.id, 64);
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
        (p.ease === undefined || p.ease === "linear" || p.ease === "smooth") &&
        (p.fov === undefined ||
          isNumberIn(p.fov, MIN_CAMERA_FOV, MAX_CAMERA_FOV)) &&
        (p.shake === undefined || isNumberIn(p.shake, 0, MAX_CAMERA_SHAKE))
      );
    case "camera-follow":
      return (
        isPlayer(p.player) &&
        isShort(p.entityId, 64) &&
        (p.back === undefined || isNumberIn(p.back, 0, MAX_CAMERA_DISTANCE)) &&
        (p.up === undefined ||
          isNumberIn(p.up, -MAX_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE)) &&
        (p.lookAhead === undefined ||
          isNumberIn(p.lookAhead, -MAX_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE)) &&
        (p.fov === undefined ||
          isNumberIn(p.fov, MIN_CAMERA_FOV, MAX_CAMERA_FOV))
      );
    case "camera-follow-clear":
      return isPlayer(p.player);
    case "player-control":
      return isPlayer(p.player) && typeof p.locked === "boolean";
    case "player-view":
      return isPlayer(p.player) && (p.view === "first" || p.view === "third");
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
    case "player-heal":
      return isPlayer(p.player) && isNumberIn(p.amount, 1, MAX_PLAYER_DAMAGE);
    case "player-max-health":
      return (
        isPlayer(p.player) && isNumberIn(p.maxHealth, 1, MAX_PLAYER_MAX_HEALTH)
      );
    case "team-define":
      return (
        isShort(p.id, MAX_TEAM_NAME) &&
        (p.name === undefined || isShort(p.name, MAX_TEAM_NAME))
      );
    case "player-team":
      return (
        isPlayer(p.player) && (p.team === "" || isShort(p.team, MAX_TEAM_NAME))
      );
    case "player-value":
      return (
        isPlayer(p.player) &&
        isShort(p.key, MAX_TEAM_NAME) &&
        isNumberIn(p.value, -MAX_PLAYER_VALUE, MAX_PLAYER_VALUE)
      );
    case "player-push":
      return (
        isPlayer(p.player) &&
        isNumberIn(p.vx, -MAX_PUSH_SPEED, MAX_PUSH_SPEED) &&
        isNumberIn(p.vy, -MAX_PUSH_SPEED, MAX_PUSH_SPEED) &&
        isNumberIn(p.vz, -MAX_PUSH_SPEED, MAX_PUSH_SPEED) &&
        ((p.vx as number) !== 0 ||
          (p.vy as number) !== 0 ||
          (p.vz as number) !== 0)
      );
    case "report-hit":
      return (
        isPlayer(p.player) &&
        isShort(p.entityId, 64) &&
        isNumberIn(p.amount, 1, MAX_REPORTED_HIT) &&
        isCoord(p.attackerX) &&
        isCoord(p.attackerZ)
      );
    case "block-set":
      return isVoxel(p.voxel) && isBlockId(p.id);
    case "block-fill":
      return isBlockBox(p) && isBlockId(p.id);
    case "block-clear":
      return isBlockBox(p);
    case "structure": {
      const shapes = p.shapes;
      return (
        isShort(p.id, MAX_NPC_NAME) &&
        Array.isArray(shapes) &&
        shapes.length > 0 &&
        shapes.length <= MAX_PLAN_SHAPES &&
        shapes.every(isPlanShape)
      );
    }
    case "structure-remove":
      return isShort(p.id, MAX_NPC_NAME);
    case "bind":
      return (
        isShort(p.id, 64) &&
        (p.key === "" || isShort(p.key, MAX_BIND_KEY)) &&
        (p.label === undefined || isShort(p.label, MAX_PROMPT_VERB))
      );
    case "prompt":
      return (
        isShort(p.id, 64) &&
        isShort(p.entityId, 64) &&
        isShort(p.verb, MAX_PROMPT_VERB) &&
        (p.key === undefined || isShort(p.key, MAX_BIND_KEY)) &&
        (p.range === undefined || isNumberIn(p.range, 1, MAX_PROMPT_RANGE)) &&
        (p.once === undefined || typeof p.once === "boolean")
      );
    case "prompt-remove":
      return isShort(p.id, 64);
    case "figure-animate":
      return (
        isShort(p.id, 64) &&
        isShort(p.name, MAX_ANIMATION_NAME) &&
        (p.speed === undefined ||
          isNumberIn(p.speed, 0.01, MAX_ANIMATION_SPEED)) &&
        (p.loop === undefined || typeof p.loop === "boolean")
      );
    case "figure-stop":
      return isShort(p.id, 64);
    case "player-avatar":
      // Which kind is a question the world answers, the same way the model file
      // beside it is one it resolves; a name it does not carry changes nothing.
      return isPlayer(p.player) && isShort(p.kind, MAX_AVATAR_KIND);
    case "player-model":
      return (
        isPlayer(p.player) &&
        (p.model === undefined ||
          p.model === "" ||
          isShort(p.model, MAX_PROP_MODEL)) &&
        (p.modelUri === undefined ||
          (p.modelUri !== "" && isShort(p.modelUri, MAX_MODEL_URI))) &&
        (p.model !== undefined || p.modelUri !== undefined)
      );
    case "light":
      return (
        isShort(p.id, 64) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.range === undefined || isNumberIn(p.range, 0, MAX_LIGHT_RANGE)) &&
        (p.intensity === undefined ||
          isNumberIn(p.intensity, 0, MAX_LIGHT_INTENSITY))
      );
    case "light-remove":
      return isShort(p.id, 64);
    case "billboard":
      return (
        isShort(p.id, 64) &&
        isShort(p.text, MAX_BILLBOARD_TEXT) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.scale === undefined ||
          isNumberIn(p.scale, 0.05, MAX_BILLBOARD_SCALE)) &&
        (p.height === undefined ||
          isNumberIn(p.height, 0, MAX_BILLBOARD_HEIGHT))
      );
    case "billboard-remove":
      return isShort(p.id, 64);
    case "particle":
      return (
        isShort(p.id, 64) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.kind === undefined ||
          PARTICLE_KINDS.includes(p.kind as ParticleKind)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.size === undefined || isNumberIn(p.size, 0.02, MAX_PARTICLE_SIZE)) &&
        (p.spread === undefined ||
          isNumberIn(p.spread, 0, MAX_PARTICLE_SPREAD)) &&
        (p.lifeMs === undefined ||
          isNumberIn(p.lifeMs, 50, MAX_PARTICLE_LIFE_MS)) &&
        (p.loop === undefined || typeof p.loop === "boolean")
      );
    case "particle-remove":
      return isShort(p.id, 64);
    case "storm":
      return (
        isShort(p.id, 64) &&
        (p.kind === undefined || STORM_KINDS.includes(p.kind as StormKind)) &&
        isCoord(p.x) &&
        isCoord(p.z) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.yaw === undefined || isCoord(p.yaw)) &&
        (p.width === undefined || isNumberIn(p.width, 0.5, MAX_STORM_SIZE)) &&
        (p.height === undefined || isNumberIn(p.height, 0.5, MAX_STORM_SIZE)) &&
        (p.depth === undefined || isNumberIn(p.depth, 0.5, MAX_STORM_SIZE)) &&
        (p.intensity === undefined || isNumberIn(p.intensity, 0, 1)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.spin === undefined ||
          isNumberIn(p.spin, -MAX_STORM_SPIN, MAX_STORM_SPIN))
      );
    case "storm-remove":
      return isShort(p.id, 64);
    case "decal":
      return (
        isShort(p.id, 64) &&
        DECAL_KINDS.includes(p.kind as DecalKind) &&
        (p.entityId === undefined
          ? isCoord(p.x) && isCoord(p.z)
          : isShort(p.entityId, 64)) &&
        (p.y === undefined || isCoord(p.y)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.size === undefined || isNumberIn(p.size, 0.1, MAX_DECAL_SIZE)) &&
        (p.yaw === undefined || isCoord(p.yaw))
      );
    case "decal-remove":
      return isShort(p.id, 64);
    case "rift":
      return (
        isShort(p.id, 64) &&
        isCoord(p.x) &&
        isCoord(p.y) &&
        isCoord(p.z) &&
        (p.width === undefined || isNumberIn(p.width, 0.5, MAX_RIFT_SIZE)) &&
        (p.height === undefined || isNumberIn(p.height, 0.5, MAX_RIFT_SIZE)) &&
        (p.yaw === undefined || isCoord(p.yaw)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.intensity === undefined || isNumberIn(p.intensity, 0, 1)) &&
        (p.spin === undefined ||
          isNumberIn(p.spin, -MAX_RIFT_SPIN, MAX_RIFT_SPIN))
      );
    case "rift-remove":
      return isShort(p.id, 64);
    case "entity-look":
      return (
        isShort(p.id, 64) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.alpha === undefined || isNumberIn(p.alpha, 0, 1))
      );
    case "entity-look-clear":
      return isShort(p.id, 64);
    case "beam":
      return (
        isShort(p.id, 64) &&
        (p.fromEntity === undefined) !== (p.from === undefined) &&
        (p.toEntity === undefined) !== (p.to === undefined) &&
        (p.fromEntity === undefined || isShort(p.fromEntity, 64)) &&
        (p.toEntity === undefined || isShort(p.toEntity, 64)) &&
        (p.from === undefined || isVector(p.from)) &&
        (p.to === undefined || isVector(p.to)) &&
        (p.color === undefined || isColor3(p.color)) &&
        (p.width === undefined || isNumberIn(p.width, 0.02, MAX_BEAM_WIDTH))
      );
    case "beam-remove":
      return isShort(p.id, 64);
    case "data-set":
      return (
        isDataScope(p.scope) &&
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.key, MAX_DATA_KEY) &&
        isDataValue(p.value)
      );
    case "data-delete":
      return (
        isDataScope(p.scope) &&
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.key, MAX_DATA_KEY)
      );
    case "data-get":
      return (
        isDataScope(p.scope) &&
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.key, MAX_DATA_KEY) &&
        isShort(p.requestId, 64)
      );
    case "badge-award":
      return (
        (p.player === undefined || isPlayer(p.player)) &&
        isShort(p.badge, MAX_DATA_KEY)
      );
    case "teleport":
      return (
        isPlayer(p.player) &&
        isShort(p.place, MAX_PLACE_ADDRESS) &&
        (p.carry === undefined ||
          (Array.isArray(p.carry) &&
            p.carry.length <= MAX_CARRY_KEYS &&
            p.carry.every((key) => isShort(key, MAX_DATA_KEY))))
      );
    case "catalog":
      return (
        isPlayer(p.player) &&
        (p.query === undefined ||
          p.query === "" ||
          isShort(p.query, MAX_CATALOG_QUERY))
      );
    case "ui-panel":
      return (
        isPlayer(p.player) &&
        isShort(p.id, 64) &&
        (p.title === undefined ||
          p.title === "" ||
          isShort(p.title, MAX_UI_TEXT)) &&
        (p.anchor === undefined || UI_ANCHORS.includes(p.anchor as UiAnchor))
      );
    case "ui-label":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        isShort(p.text, MAX_UI_TEXT) &&
        (p.color === undefined || isColor3(p.color))
      );
    case "ui-bar":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        (p.label === undefined ||
          p.label === "" ||
          isShort(p.label, MAX_UI_TEXT)) &&
        isNumberIn(p.value, -MAX_HUD_VALUE, MAX_HUD_VALUE) &&
        isNumberIn(p.max, 1, MAX_HUD_VALUE)
      );
    case "ui-button":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        isShort(p.label, MAX_UI_TEXT) &&
        (p.value === undefined ||
          p.value === "" ||
          isShort(p.value, MAX_UI_VALUE))
      );
    case "ui-image":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        isShort(p.id, 64) &&
        isShort(p.sprite, MAX_UI_SPRITE)
      );
    case "ui-remove":
      return (
        isPlayer(p.player) &&
        isShort(p.panel, 64) &&
        (p.item === undefined || p.item === "" || isShort(p.item, 64))
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
`,Lr=`// The camera shots a place script plays: an ordered list of moves over the
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
  /** The field of view to move to, in degrees; the previous one is kept when absent. */
  fov?: number;
  /** How far the view shakes while this shot runs, in world units; absent for a still one. */
  shake?: number;
}

/** A camera sequence a script has started, with the moment it began. */
export interface CutsceneState {
  /** The shared-clock moment the sequence began, in milliseconds. */
  startMs: number;
  shots: CameraShot[];
}

/** Where a camera is before a sequence begins: its eye, what it looks at, and how wide its view is. */
export interface CameraStart {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  /** The field of view it starts at, in degrees, or undefined to leave it alone. */
  fov?: number;
}

/** Where a camera is at a moment: its eye, what it looks at, and whether it is done. */
export interface CameraPose extends CameraStart {
  done: boolean;
  /** How far the view shakes about the eye, in world units, while the shot runs. */
  shake?: number;
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
  fov?: number,
): CameraStart => ({
  x: at[0],
  y: at[1],
  z: at[2],
  lookX: look[0],
  lookY: look[1],
  lookZ: look[2],
  ...(fov === undefined ? {} : { fov }),
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
    const fov = shot.fov ?? previous.fov;
    const shake = shot.shake === undefined ? {} : { shake: shot.shake };
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
        ...(fov === undefined
          ? {}
          : {
              fov:
                previous.fov === undefined ? fov : lerp(previous.fov, fov, t),
            }),
        ...shake,
        done: false,
      };
    }
    const arrived = poseOf(shot.at, look, fov);
    if (elapsed < cursor + move + hold) {
      return { ...arrived, done: false, ...shake };
    }
    cursor += move + hold;
    previous = arrived;
  }
  return { ...previous, done: true };
};
`,Rr=`// The motion a place script gives a prop or NPC: a path walked over the shared
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
  /**
   * A whole turn applied over the motion's eased progress, from 0 to \`turns\`,
   * so a \`once\` motion comes to rest at exactly that angle. Takes the place of
   * a rate; a door swinging 90 degrees asks for \`0.25\`.
   */
  turns?: number;
  /** Revolutions per second, or absent when the spin is driven by distance. */
  turnsPerSecond?: number;
  /** Degrees of turn per world unit travelled, or absent when driven by time. */
  degreesPerMeter?: number;
  /**
   * The point the figure turns about, in world units, relative to its own
   * feet-centre origin and before its heading is applied — the hinge edge of a
   * door. Absent turns the figure about its own origin, as before.
   */
  pivot?: [number, number, number];
}

/**
 * A back-and-forth offset a motion adds to its figure along an axis: the
 * machinery a script builds out of the clock — a bobbing platform, a swinging
 * arm, a swaying gate — sampled as a sine rather than stepped.
 */
export interface MotionOscillation {
  /** How far the figure moves from its declared position, in world units. */
  amplitude: number;
  /** How long one full back-and-forth takes, in milliseconds. */
  periodMs: number;
  /** The axis it moves along; defaults to straight up. */
  axis?: [number, number, number];
  /** How long the figure stands still before the oscillation begins. */
  startAfterMs?: number;
}

/** The path, spin, and oscillation a prop or NPC follows, as its script declares it. */
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
  /** A back-and-forth offset over the shared clock, added to the path. */
  oscillate?: MotionOscillation;
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
  /** The hinge the spin turns about, in world units from the figure's origin, or absent for its own origin. */
  spinPivot?: [number, number, number];
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
  const [px, py, pz] = pointAt(motion.path, u);

  // A central difference over a millisecond, so a constant-speed path reports a
  // velocity and a still one reports zero.
  const before = pointAt(motion.path, easedAt(motion, clockMs - 1));
  const after = pointAt(motion.path, easedAt(motion, clockMs + 1));
  let vx = ((after[0] - before[0]) / 2) * 1_000;
  let vy = ((after[1] - before[1]) / 2) * 1_000;
  let vz = ((after[2] - before[2]) / 2) * 1_000;

  // An oscillation is a sine over the shared clock, so it adds an offset and
  // the offset's own velocity to whatever the path is doing.
  let ox = 0;
  let oy = 0;
  let oz = 0;
  if (motion.oscillate !== undefined) {
    const { amplitude, periodMs } = motion.oscillate;
    const periodSeconds = periodMs / 1_000;
    if (amplitude > 0 && periodSeconds > 0) {
      const elapsed = Math.max(
        0,
        clockMs - (motion.oscillate.startAfterMs ?? 0),
      );
      const omega = (Math.PI * 2) / periodSeconds;
      const phase = (elapsed / 1_000) * omega;
      const offset = Math.sin(phase) * amplitude;
      const speed = Math.cos(phase) * amplitude * omega;
      const axis = motion.oscillate.axis ?? [0, 1, 0];
      const length = Math.hypot(axis[0], axis[1], axis[2]);
      const unit =
        length === 0
          ? ([0, 1, 0] as [number, number, number])
          : ([axis[0] / length, axis[1] / length, axis[2] / length] as [
              number,
              number,
              number,
            ]);
      ox = unit[0] * offset;
      oy = unit[1] * offset;
      oz = unit[2] * offset;
      vx += unit[0] * speed;
      vy += unit[1] * speed;
      vz += unit[2] * speed;
    }
  }
  const dx = px + ox;
  const dy = py + oy;
  const dz = pz + oz;

  const spin = motion.spin;
  let angle = 0;
  let yaw = 0;
  let axis: [number, number, number] = [0, 1, 0];
  if (spin !== undefined) {
    const unit = unitAxis(spin.axis);
    if (unit !== null) {
      axis = unit;
      if (spin.turns !== undefined) {
        angle = spin.turns * Math.PI * 2 * u;
      } else if (spin.turnsPerSecond !== undefined) {
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
    ...(spin?.pivot !== undefined ? { spinPivot: spin.pivot } : {}),
    vx,
    vy,
    vz,
  };
};
`,zr=`// The seam a place's creator code runs behind, and the vocabulary its inputs
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

/** One player's live position, by the did that identifies them. */
export interface LivePlayer {
  readonly did: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Heading in radians; absent where the world does not report one. */
  readonly yaw?: number;
  /** Hit points the player has left; absent where the world does not report them. */
  readonly health?: number;
  /** The most hit points the player can hold; absent where the world does not report it. */
  readonly maxHealth?: number;
  /** The team the player is on, or "" for none; absent where the world has no teams. */
  readonly team?: string;
}

/** A value a script may hang on an entity under a name. */
export type AttributeValue = string | number | boolean;

/**
 * Which players a remembered value belongs to: one in this place, everyone in
 * this place, or the signed-in account across every place.
 */
export type DataScope = "player" | "global" | "account";

/** A value a place may remember: a string, a finite number, or a boolean. */
export type DataValue = string | number | boolean;

/** One player's score on a leaderboard, keyed by the player string a script's own values use. */
export interface LeaderboardEntry {
  readonly player: string;
  readonly value: number;
}

/** One scripted figure as a script's own queries see it. */
export interface EntitySnapshot {
  readonly id: string;
  readonly kind: "npc" | "prop";
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  /** The place model file the figure wears, or "" for the world's own pick. */
  readonly model: string;
  readonly name: string;
  readonly tags: readonly string[];
  readonly attributes: Readonly<Record<string, AttributeValue>>;
}

/**
 * The local player's live movement and tool input, as a place script reads it
 * to drive something itself — a car's throttle and steering, a turret's aim.
 * Only the peer's own player has one: a script that needs another player's
 * input hears it as a fact instead.
 */
export interface LocalInput {
  /** Strafe input, from -1 (left) to 1 (right). */
  readonly moveX: number;
  /** Forward/back input, from -1 (backward) to 1 (forward). */
  readonly moveY: number;
  /** Whether the jump input is held down. */
  readonly jumpHeld: boolean;
  /** Horizontal pointer-move delta accumulated since the last frame. */
  readonly lookDx: number;
  /** Vertical pointer-move delta accumulated since the last frame. */
  readonly lookDy: number;
  /** Whether the primary (strike or dig) button fired this frame. */
  readonly primary: boolean;
  /** Whether the touch dig button is held down, which a script may read as an accelerator. */
  readonly primaryHeld: boolean;
  /** Whether the secondary (place or guard) button is held down. */
  readonly secondaryHeld: boolean;
  /** Whether the interact input fired this frame. */
  readonly use: boolean;
  /**
   * Whether the interact input is held down — the E key or the touch use
   * button. A script's step runs on its timers, not every frame, so this is the
   * form to read when a one-frame \`use\` edge could pass between steps.
   */
  readonly useHeld: boolean;
}

/** Where a ray first met the world, and what it met. */
export interface RaycastHit {
  /** What the ray hit first: terrain, a scripted figure, or a player. */
  readonly kind: "block" | "npc" | "prop" | "player";
  /** The point of first contact, in world units. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** The face normal at the contact, in world axes. */
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  /** How far along the ray the contact lies, in world units. */
  readonly distance: number;
  /** The entity or player id, or "" when the contact is terrain. */
  readonly id: string;
}

/**
 * The world a script reads from, answered by the trusted side and kept
 * injectable for determinism — every peer must hand a script the same
 * answers given the same shared clock. Declared once here so a script's own
 * "voxelscape" module (\`voxelscape.d.ts\`), the sandbox that binds it
 * (\`quickjs-sandbox.ts\`), and the two layers above it that answer it
 * (\`ScriptHostParams\`, \`ScriptConsoleParams\`) all reuse the same six
 * signatures instead of each retyping them; how many of the six a given
 * layer requires versus leaves optional is that layer's own choice, made
 * with \`RequireOnly\` below.
 */
export interface WorldQuery {
  /** The shared time source for this sandbox, in milliseconds. */
  getNow(): number;
  /** Every ending this place has defined. */
  getEndings(): string[];
  /** The terrain surface at (\`x\`, \`z\`). */
  getHeightAt(x: number, z: number): number;
  /** Whether (\`x\`, \`y\`, \`z\`) is inside solid ground. */
  getSolidAt(x: number, y: number, z: number): boolean;
  /** Whether (\`x\`, \`y\`, \`z\`) is water. */
  getWaterAt(x: number, y: number, z: number): boolean;
  /** Every player's live position: the local player first, then connected peers. */
  getPlayers(): LivePlayer[];
  /** The block id at (\`x\`, \`y\`, \`z\`), or 0 for air. */
  getBlockAt(x: number, y: number, z: number): number;
  /** The scripted figure \`id\` names, or null when there is none. */
  getEntity(id: string): EntitySnapshot | null;
  /** Every scripted figure in the box \`min\` to \`max\`, inclusive, each corner's components smallest first, in id order. */
  getEntitiesInBox(
    min: readonly [number, number, number],
    max: readonly [number, number, number],
  ): EntitySnapshot[];
  /** Every scripted figure within \`radius\` of (\`x\`, \`y\`, \`z\`), in id order. */
  getEntitiesInSphere(
    x: number,
    y: number,
    z: number,
    radius: number,
  ): EntitySnapshot[];
  /** Every scripted figure carrying \`tag\`, in id order. */
  getEntitiesWithTag(tag: string): EntitySnapshot[];
  /** The player \`did\` names, or null when they are not in the place. */
  getPlayer(did: string): LivePlayer | null;
  /** Every player in the box \`min\` to \`max\`, inclusive, in the order \`getPlayers\` gives. */
  getPlayersInBox(
    min: readonly [number, number, number],
    max: readonly [number, number, number],
  ): LivePlayer[];
  /** The DID of the player on this peer, or "" when they are not signed in. */
  getLocalPlayer(): string;
  /** The local player's held movement and tool input, or null where the world reports none. */
  getInput(): LocalInput | null;
  /** The value the script set for \`did\` under \`key\`, or null when there is none. */
  getPlayerValue(did: string, key: string): number | null;
  /** The value the place remembers under \`scope\`/\`key\` for \`player\`, or undefined. */
  getData(scope: DataScope, player: string, key: string): DataValue | undefined;
  /** The players ranked by a remembered \`key\`, highest first, ties by player, at most \`count\`. */
  getDataLeaderboard(
    key: string,
    count: number,
  ): Array<{ player: string; value: DataValue }>;
  /** The players ranked by \`key\`, highest first, ties by player string, at most \`count\` of them. */
  getLeaderboard(key: string, count: number): LeaderboardEntry[];
  /** Where a ray from \`origin\` along \`direction\` first meets the world, or null within \`maxDistance\` world units. */
  raycast(
    origin: readonly [number, number, number],
    direction: readonly [number, number, number],
    maxDistance: number,
  ): RaycastHit | null;
  /** The walkable route from \`from\` to \`to\`, as world-unit waypoints, or null when none exists within the bounds. */
  findPath(
    from: readonly [number, number, number],
    to: readonly [number, number, number],
    options?: { maxNodes?: number; maxCells?: number },
  ): Array<[number, number, number]> | null;
}

/** \`T\` with only \`K\` required; every other property stays optional. */
export type RequireOnly<T, K extends keyof T> = Required<Pick<T, K>> &
  Partial<Omit<T, K>>;
`,Br=`// Script events: the replicated fact vocabulary a place's derived rules fold
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
      /** Which control the player used, or absent where the world does not say. */
      button?: "primary" | "secondary" | "use";
    }
  | {
      kind: "input";
      /** The id a script gave the binding its key is on. */
      bindId: string;
      /** Whether the key went down or came up. */
      phase: "down" | "up";
    }
  | {
      kind: "prompt-triggered";
      /** The id a script gave the prompt the player answered. */
      promptId: string;
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
    }
  | {
      kind: "data-changed";
      /** Which players the value belongs to: one in this place, everyone, or the account. */
      scope: "player" | "global" | "account";
      /** The player the value belongs to, or "" for the global or account scope. */
      player: string;
      /** The key that changed. */
      key: string;
      /** Whether the key was forgotten rather than set. */
      deleted: boolean;
      /** The value set, or absent when the key was forgotten. */
      value?: string | number | boolean;
    }
  | {
      kind: "data-loaded";
      /** The id the script gave the \`data-get\` this answers. */
      requestId: string;
      /** The scope the value was read from. */
      scope: "player" | "global" | "account";
      /** The key the value was read under. */
      key: string;
      /** Whether the place remembered a value for it. */
      found: boolean;
      /** The value, present exactly when \`found\` is. */
      value?: string | number | boolean;
    }
  | {
      kind: "badge-earned";
      /** The player who earned it, or "" for the local player. */
      player: string;
      /** The badge earned. */
      badge: string;
    }
  | {
      kind: "player-teleported";
      /** The place the player went to. */
      place: string;
    }
  | {
      kind: "ui-clicked";
      /** The panel the button belongs to. */
      panel: string;
      /** The button the player pressed. */
      button: string;
      /** The button's value, or "" when it named none. */
      value?: string;
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
/** The longest a string value one \`data-changed\` may carry. */
export const MAX_EVENT_DATA_VALUE = 512;
/** The longest a teleport address one \`player-teleported\` may carry. */
export const MAX_EVENT_PLACE = 256;
/** The longest a button value one \`ui-clicked\` may carry. */
export const MAX_EVENT_UI_VALUE = 128;
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
      (r.item === "" || isShortString(r.item, MAX_EVENT_ITEM)) &&
      (r.button === undefined ||
        r.button === "primary" ||
        r.button === "secondary" ||
        r.button === "use")
    );
  }
  if (r.kind === "input") {
    return (
      isShortString(r.bindId, MAX_EVENT_ID) &&
      (r.phase === "down" || r.phase === "up")
    );
  }
  if (r.kind === "prompt-triggered") {
    return isShortString(r.promptId, MAX_EVENT_ID);
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
  if (r.kind === "data-changed") {
    return (
      (r.scope === "player" || r.scope === "global" || r.scope === "account") &&
      (r.player === "" || isPlayer(r.player)) &&
      isShortString(r.key, MAX_EVENT_ID) &&
      typeof r.deleted === "boolean" &&
      (r.deleted
        ? r.value === undefined
        : typeof r.value === "boolean" ||
          (typeof r.value === "string" &&
            r.value.length <= MAX_EVENT_DATA_VALUE) ||
          (typeof r.value === "number" && Number.isFinite(r.value)))
    );
  }
  if (r.kind === "data-loaded") {
    return (
      isShortString(r.requestId, MAX_EVENT_ID) &&
      (r.scope === "player" || r.scope === "global" || r.scope === "account") &&
      isShortString(r.key, MAX_EVENT_ID) &&
      typeof r.found === "boolean" &&
      (r.found
        ? typeof r.value === "boolean" ||
          (typeof r.value === "string" &&
            r.value.length <= MAX_EVENT_DATA_VALUE) ||
          (typeof r.value === "number" && Number.isFinite(r.value))
        : r.value === undefined)
    );
  }
  if (r.kind === "badge-earned") {
    return (
      (r.player === "" || isPlayer(r.player)) &&
      isShortString(r.badge, MAX_EVENT_ID)
    );
  }
  if (r.kind === "player-teleported") {
    return isShortString(r.place, MAX_EVENT_PLACE);
  }
  if (r.kind === "ui-clicked") {
    return (
      isShortString(r.panel, MAX_EVENT_ID) &&
      isShortString(r.button, MAX_EVENT_ID) &&
      (r.value === undefined ||
        r.value === "" ||
        isShortString(r.value, MAX_EVENT_UI_VALUE))
    );
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
`,Vr=`main.ts`,Hr=`voxelscape.d.ts`,Ur=Fr,Wr={[Hr]:Ur,"effects.ts":Ir,"cutscene.ts":Lr,"motion.ts":Rr,"sandbox.ts":zr,"events.ts":Br},Gr=`import { createNpc, dispatch, log, onTick } from "voxelscape";

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
`,Kr=e=>({manifest:{name:``,seed:e,spawn:[0,0,0],scripts:[Vr],mode:`solo:edit`},scripts:{[Vr]:Gr},levels:{},models:{}}),qr=async e=>{let t=await Pr(e),n=await pt.default.loadAsync(await e.arrayBuffer()),r={};for(let e of t.scripts??[])r[e]=await n.file(e).async(`text`);let i={};for(let e of t.models??[])i[e]={bytes:new Uint8Array(await n.file(e).async(`arraybuffer`))};let a={};for(let e of t.levels??[])a[hr(e)??e]=await n.file(e).async(`text`);return{manifest:t,scripts:r,levels:a,models:i}};function Jr(e){return e.toLowerCase().endsWith(`.zip`)?e.slice(0,-4):null}function Yr(e){return Jr(e)===null?`${e}.zip`:e}async function Xr(e,t,n){let r=await ar(n);return{name:e,file:t,parts:r.parts.map(e=>e.name),motions:r.motions.map(e=>e.name)}}export{ht as A,zn as C,Ot as D,Mt as E,ct as F,ft as M,Z as N,_t as O,dt as P,Ln as S,Ft as T,Ar as _,Wr as a,Vn as b,_r as c,kr as d,gr as f,Mr as g,Nr as h,Vr as i,Q as j,Tt as k,fr as l,jr as m,Yr as n,Kr as o,hr as p,Jr as r,qr as s,Xr as t,vr as u,ar as v,Sn as w,Bn as x,dr as y};