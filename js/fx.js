const e=`
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.7, 289.3))) * 45758.231); }
vec3 vnd(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 du = 6.0 * f * (1.0 - f);
  float a = h21(i);
  float b = h21(i + vec2(1.0, 0.0));
  float c = h21(i + vec2(0.0, 1.0));
  float d = h21(i + vec2(1.0, 1.0));
  float k1 = b - a;
  float k2 = c - a;
  float k3 = a - b - c + d;
  return vec3(a + k1 * u.x + k2 * u.y + k3 * u.x * u.y, du.x * (k1 + k3 * u.y), du.y * (k2 + k3 * u.x));
}
`,t=`
uniform float t;
uniform vec3 cA;
uniform vec3 cB;
uniform float op;
uniform vec2 size;
varying vec3 vW;
varying vec2 vUv;
varying vec2 vS;
#include <fog_pars_fragment>
${e}
const mat2 R = mat2(0.8, -0.6, 0.6, 0.8);
void main(){
  vec2 p = vW.xz;
  vec3 n1 = vnd(p * 2.1 + vec2(t * 0.16, t * 0.09));
  vec3 n2 = vnd(R * p * 5.7 - vec2(t * 0.21, -t * 0.13));
  vec2 g = n1.yz * 0.105 + (n2.yz * R) * 0.1 + vS;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(cameraPosition - vW);
  float below = 1.0 - step(vW.y, cameraPosition.y);
  float nv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float fr = 0.03 + 0.97 * pow(1.0 - nv, 4.0);
  float hgt = n1.x * 0.65 + n2.x * 0.35;
  vec3 body = mix(cB, cA, clamp(0.25 + 0.55 * nv + 0.3 * (hgt - 0.5), 0.0, 1.0));
  vec3 r = reflect(-v, n);
  vec3 sky = mix(cA * 0.5 + vec3(0.30, 0.36, 0.40), vec3(0.86, 0.93, 1.0), clamp(r.y, 0.0, 1.0));
  vec3 col = mix(body, sky, fr * 0.8);
  vec3 L = normalize(vec3(0.35, 0.9, 0.25));
  float nh = max(dot(n, normalize(L + v)), 0.0);
  float glint = pow(nh, 240.0) * 2.6 + pow(nh, 28.0) * 0.1;
  glint += smoothstep(0.72, 0.95, n2.x) * pow(nh, 70.0) * 1.8;
  col += vec3(1.0, 0.97, 0.9) * glint * (1.0 - below);
  vec2 e = min(vUv, 1.0 - vUv) * size;
  float bd = min(e.x, e.y) + (n2.x - 0.5) * 0.06;
  float foam = (1.0 - smoothstep(0.015, 0.16, bd)) * (0.45 + 0.55 * n1.x);
  col = mix(col, vec3(0.9, 0.96, 1.0), foam * 0.75 * (1.0 - below));
  float a = clamp(op + fr * 0.25 + foam * 0.3, 0.0, 1.0);
  float tir = 1.0 - smoothstep(0.05, 0.35, nv);
  vec3 uc = mix(cA * 1.35 + vec3(0.05, 0.08, 0.08), cB * 0.55, tir);
  uc *= 0.85 + 0.3 * hgt;
  col = mix(col, uc, below);
  a = mix(a, clamp(op + 0.12 + tir * 0.2, 0.0, 1.0), below);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`,n=`
uniform float t;
uniform vec3 col;
uniform float amt;
varying vec3 vW;
varying vec2 vUv;
${e}
void main(){
  vec2 p = vW.xz * 2.6;
  p += vec2(sin(p.y * 1.3 + t * 0.7), cos(p.x * 1.1 - t * 0.6)) * 0.35;
  float a = 1.0 - abs(vnd(p + vec2(t * 0.25, t * 0.1)).x * 2.0 - 1.0);
  float b = 1.0 - abs(vnd(p * 1.6 - vec2(t * 0.18, -t * 0.27) + 7.3).x * 2.0 - 1.0);
  float c = pow(a, 8.0) * 0.7 + pow(b, 10.0) * 0.6 + pow(a * b, 4.0) * 0.8;
  vec2 e = min(vUv, 1.0 - vUv);
  float f = smoothstep(0.0, 0.08, min(e.x, e.y));
  gl_FragColor = vec4(col * c * amt * f, 1.0);
  #include <colorspace_fragment>
}
`;function r(e,t,n){let r=Math.imul(e,374761393)+Math.imul(t,668265263)+Math.imul(n,1442695041)|0;return r=Math.imul(r^r>>>13,1274126177),r^=r>>>16,(r>>>0)/4294967296}function i(e,t,n,i,a){let o=Math.floor(e),s=Math.floor(t),c=e-o,l=t-s;c=c*c*(3-2*c),l=l*l*(3-2*l);let u=(o%n+n)%n,d=(u+1)%n,f=(s%i+i)%i,p=(f+1)%i,m=r(u,f,a),h=r(d,f,a),g=r(u,p,a),_=r(d,p,a);return m+(h-m)*c+(g-m)*l+(m-h-g+_)*c*l}function a(e,t,n,r,a,o=4){let s=0,c=.5,l=1,u=0;for(let d=0;d<o;d++)s+=c*i(e*n*l,t*r*l,n*l,r*l,a+d*17),u+=c,c*=.5,l*=2;return s/u}function o(e){let t=e>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function s(e,t,n){let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)}function c(e,t,n,r,i,a=null){let s=new Float32Array(e*e),c=o(n);for(let n=0;n<t;n++){let t=c()*e,n=c()*e,o=a===null?c()*Math.PI*2:a+(c()-.5)*.25,l=(r+c()*(i-r))*e,u=.35+c()*.65,d=Math.cos(o),f=Math.sin(o);for(let r=0;r<l;r++){let i=(Math.round(t+d*r)%e+e)%e,a=(Math.round(n+f*r)%e+e)%e,o=u*Math.sin(Math.PI*r/l),c=a*e+i;o>s[c]&&(s[c]=o)}}return s}function l(e,t){let n=new e.Color(t).getHex();return[n>>16&255,n>>8&255,n&255]}export function createFx(e){let u=e.THREE,d=new Map;function f(e,t){let n=document.createElement(`canvas`);n.width=n.height=e;let r=n.getContext(`2d`),i=r.createImageData(e,e);return i.data.set(t),r.putImageData(i,0,0),n}function p(e,t){let n=new u.CanvasTexture(e);return n.wrapS=n.wrapT=u.RepeatWrapping,t&&(n.colorSpace=u.SRGBColorSpace),n.anisotropy=4,n.userData.shared=!0,n}function m(e,t,n,r){if(d.has(e))return d.get(e);let i=t*t,a=new Uint8ClampedArray(i*4),o=new Uint8ClampedArray(i*4),s=new Uint8ClampedArray(i*4),c=new Float32Array(i),l={r:0,g:0,b:0,h:.5,ro:.5,me:0};for(let e=0;e<t;e++)for(let n=0;n<t;n++){r(n,e,n/t,e/t,l);let i=e*t+n,s=i*4;a[s]=l.r,a[s+1]=l.g,a[s+2]=l.b,a[s+3]=255;let u=Math.min(1,Math.max(0,l.ro))*255,d=Math.min(1,Math.max(0,l.me))*255;o[s]=u,o[s+1]=u,o[s+2]=d,o[s+3]=255,c[i]=l.h}for(let e=0;e<t;e++)for(let r=0;r<t;r++){let i=(e,n)=>c[(n+t)%t*t+(e+t)%t],a=(i(r+1,e)-i(r-1,e))*n,o=(i(r,e+1)-i(r,e-1))*n,l=1/Math.sqrt(a*a+o*o+1),u=(e*t+r)*4;s[u]=(-a*l*.5+.5)*255,s[u+1]=(o*l*.5+.5)*255,s[u+2]=(l*.5+.5)*255,s[u+3]=255}let u={map:p(f(t,a),!0),normal:p(f(t,s),!1),rough:p(f(t,o),!1)};return d.set(e,u),u}function h(e,t={}){let n=new u.MeshStandardMaterial({color:16777215,map:e.map,normalMap:e.normal,roughnessMap:e.rough,roughness:t.roughness??1,metalness:t.metalness??0,transparent:!!t.transparent,opacity:t.opacity??1});t.metalness&&(n.metalnessMap=e.rough);let r=t.ns??1;return n.normalScale.set(r,r),t.emissive&&(n.emissive.set(t.emissive),n.emissiveIntensity=t.ei??.1),t.depthWrite===!1&&(n.depthWrite=!1),t.side&&(n.side=t.side),n}function g({w:n=4,d:r=4,color:i=`#1487a8`,deep:a=`#04283a`,opacity:o=.82}={}){let s=new u.PlaneGeometry(n,r,24,24);s.rotateX(-Math.PI/2);let c=new u.ShaderMaterial({uniforms:u.UniformsUtils.merge([u.UniformsLib.fog,{t:{value:0},amp:{value:Math.min(.03,Math.min(n,r)*.006)},cA:{value:new u.Color(i)},cB:{value:new u.Color(a)},op:{value:o},size:{value:new u.Vector2(n,r)}}]),vertexShader:`
uniform float t;
uniform float amp;
varying vec3 vW;
varying vec2 vUv;
varying vec2 vS;
#include <fog_pars_vertex>
void main(){
  vUv = uv;
  vec4 w0 = modelMatrix * vec4(position, 1.0);
  vec2 q = w0.xz;
  float a1 = q.x * 1.7 + t * 0.9;
  float a2 = q.y * 2.3 - t * 1.1;
  float a3 = (q.x + q.y) * 3.1 + t * 1.6;
  vec2 e2 = min(uv, 1.0 - uv);
  float edge = smoothstep(0.0, 0.12, min(e2.x, e2.y));
  float k = amp * edge;
  float s = (sin(a1) * 0.5 + sin(a2) * 0.35 + sin(a3) * 0.15) * k;
  vS = vec2(cos(a1) * 0.85 + cos(a3) * 0.465, cos(a2) * 0.805 + cos(a3) * 0.465) * k;
  vec4 w = w0 + vec4(0.0, s, 0.0, 0.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,fragmentShader:t,transparent:!0,depthWrite:!1,side:u.DoubleSide,fog:!0});e.timeMat(c);let l=new u.Mesh(s,c);return l.renderOrder=1,l.userData.setLevel=e=>{l.position.y=e},l}function _({w:t=4,d:r=4,color:i=`#9fe8ff`,strength:a=.35}={}){let o=new u.PlaneGeometry(t,r);o.rotateX(-Math.PI/2);let s=new u.ShaderMaterial({uniforms:{t:{value:0},col:{value:new u.Color(i)},amt:{value:a}},vertexShader:`
varying vec3 vW;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`,fragmentShader:n,transparent:!0,depthWrite:!1,blending:u.AdditiveBlending,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});e.timeMat(s);let c=new u.Mesh(o,s);return c.position.y=.006,c.renderOrder=2,c}function v(e,t){if(d.has(e))return d.get(e);let n=new Uint8ClampedArray(16384);for(let e=0;e<64;e++)for(let r=0;r<64;r++){let i=t((r+.5)/64,(e+.5)/64),a=(e*64+r)*4;n[a]=i[0],n[a+1]=i[1],n[a+2]=i[2],n[a+3]=i[3]}let r=p(f(64,n),!0);return r.wrapS=r.wrapT=u.ClampToEdgeWrapping,d.set(e,r),r}let y=()=>v(`flame`,(e,t)=>{let n=(e-.5)*2,r=.16+.62*s(0,.85,t),a=(i(e*8,t*8,8,8,5)-.5)*.25,o=t<.62?(t-.62)/.6:(t-.62)/.34,c=Math.sqrt((n/r)**2+o*o)+a*(1-t),l=Math.max(0,1-c)**1.5,u=Math.min(1,c/.85),d=250-180*u,f=225-215*Math.min(1,u*1.6);return[255,Math.max(60,d),Math.max(10,f),l*255]}),b=()=>v(`puff`,(e,t)=>{let n=e-.5,r=t-.5,i=Math.sqrt(n*n+r*r)*2,o=a(e,t,4,4,9,3);return[255,255,255,Math.max(0,1-i)**1.8*(.55+.45*o)*255]});function x({size:t=.4,color:n=`#ff8a2a`}={}){let r=new u.Group,i=y(),a=[`#fff0b8`,n,n,`#ff5a1f`],s=o(Math.floor(t*1e3)+7),c=new u.Sprite(new u.SpriteMaterial({map:i,color:new u.Color(n),transparent:!0,opacity:.45,depthWrite:!1,blending:u.AdditiveBlending}));c.scale.set(t*1.3,t*1.5,1),c.position.y=t*.45,r.add(c);let l=[];for(let e=0;e<10;e++){let t=new u.Sprite(new u.SpriteMaterial({map:i,color:new u.Color(a[e%a.length]),transparent:!0,depthWrite:!1,blending:u.AdditiveBlending}));l.push({s:t,ph:e/10+s()*.1,sp:1.1+s()*.6,a:s()*6.28}),r.add(t)}return e.onUpdate((e,n)=>{if(r.visible){c.material.opacity=.4+.06*Math.sin(n*2.3);for(let e=0;e<l.length;e++){let r=l[e],i=(n*r.sp+r.ph)%1,a=.16*t*(1-i);r.s.position.set(Math.sin(r.a+n*3.1)*a,i*t*1.25,Math.cos(r.a*1.3+n*2.7)*a);let o=t*(.78-.5*i)*(.92+.12*Math.sin(n*5+r.a));r.s.scale.set(o*.8,o*1.2,1),r.s.material.opacity=Math.min(1,i*7)*(1-i)*1.05}}}),r}function S({size:t=.4}={}){let n=new u.Group,r=b(),i=o(Math.floor(t*1e3)+31),a=[];for(let e=0;e<8;e++){let t=new u.Sprite(new u.SpriteMaterial({map:r,color:16777215,transparent:!0,depthWrite:!1,opacity:0}));a.push({s:t,ph:e/8+i()*.08,sp:.28+i()*.18,a:i()*6.28,spin:(i()-.5)*.6}),n.add(t)}return e.onUpdate((e,r)=>{if(n.visible)for(let e=0;e<a.length;e++){let n=a[e],i=(r*n.sp+n.ph)%1,o=t*.35*i;n.s.position.set(Math.sin(n.a+r*.6)*o,i*t*2.4,Math.cos(n.a+r*.5)*o);let s=t*(.35+i*1.15);n.s.scale.set(s,s,1),n.s.material.rotation=n.a+r*n.spin,n.s.material.opacity=Math.min(1,i*5)*(1-i)*.42}}),n}function C(t,n=`#ffd54a`){return e.burst(t,n,36,2.4)}function w(e=`#5dff8a`){let[t,n,r]=l(u,e);return h(m(`goo`+t+`_`+n+`_`+r,256,5,(()=>{let e=o(77),i=[];for(let t=0;t<22;t++)i.push([e(),e(),.015+e()*.05]);return(e,o,s,c,l)=>{let u=a(s,c,4,4,11,4),d=0;for(let e of i){let t=Math.abs(s-e[0]);t=Math.min(t,1-t);let n=Math.abs(c-e[1]);n=Math.min(n,1-n);let r=(t*t+n*n)/(e[2]*e[2]);r<1&&(d=Math.max(d,Math.sqrt(1-r)))}let f=u*.6+d*.45,p=.72+.45*u+.18*d;l.r=t*p+40*d,l.g=n*p+40*d,l.b=r*p+40*d,l.h=f,l.ro=.05+.1*(1-u),l.me=0}})()),{transparent:!0,opacity:.88,ns:.6,metalness:0,emissive:e,ei:.12})}function T(e=`#d8f4ff`,t=.28){let[n,r,i]=l(u,e);return h(m(`glass`+n+`_`+r+`_`+i,256,3,(()=>{let e=c(256,26,91,.04,.22);return(t,o,c,l,u)=>{let d=a(c,l,3,3,21,3),f=s(.55,.8,a(c,l,6,6,22,4)),p=e[o*256+t],m=.94+.06*d;u.r=Math.min(255,n*m+60*p),u.g=Math.min(255,r*m+60*p),u.b=Math.min(255,i*m+60*p),u.h=d*.15-p*.08,u.ro=.03+.22*f+.3*p,u.me=0}})()),{transparent:!0,opacity:t,ns:.3,roughness:1,depthWrite:!1})}function E(e=`#9aa3ad`,{brushed:t=!1,rust:n=0}={}){let[r,i,o]=l(u,e),d=n===!0?.55:Math.max(0,Math.min(1,+n||0));return h(m(`metal`+r+`_`+i+`_`+o+(t?`b`:``)+d.toFixed(2),256,4,(()=>{let e=c(256,t?18:40,41,.03,.18,t?0:null);return(n,c,l,u,f)=>{let p=a(l,u,6,6,31,4),m=t?a(l,u,2,128,35,3):.5,h=e[c*256+n],g=.82+.22*p+(t?(m-.5)*.35:0),_=r*g+55*h,v=i*g+55*h,y=o*g+55*h,b=p*.25+(t?m*.35:0)-h*.5,x=(t?.3+(m-.5)*.25:.24+.16*p)-.08*h,S=.95;if(d>0){let e=s(.62-d*.35,.72-d*.3,a(l,u,5,5,33,5));if(e>0){let t=a(l,u,24,24,37,2),n=110+80*t,r=48+40*t,i=18+14*t;_+=(n-_)*e,v+=(r-v)*e,y+=(i-y)*e,b-=e*(.15+t*.35),x+=(.92-x)*e,S*=1-e}}f.r=_,f.g=v,f.b=y,f.h=b,f.ro=x,f.me=S}})()),{metalness:1,ns:.8})}function D(e=`#8a5a34`,{dark:t=!1,planks:n=!1}={}){let[r,c,d]=l(u,e);return t&&(r*=.5,c*=.46,d*=.44),h(m(`wood`+Math.round(r)+`_`+Math.round(c)+`_`+Math.round(d)+(n?`p`:``),512,6,(()=>{let e=o(123),t=[],l=[];for(let n=0;n<5;n++)t.push(e()),l.push(.86+e()*.26);return(e,o,u,f,p)=>{let m=n?Math.min(4,Math.floor(f*5)):0,h=a(u,f,2,4,61,3),g=f*12+h*3.2+m*3.7+a(u,f,8,16,62,2)*.35,_=(.5+.5*Math.sin(g*Math.PI*2))**3,v=i(u*4,f*160,4,160,63+m),y=s(.8,.9,i(u*48,f*256,48,256,64+m)),b=0;if(n){let e=f*5-Math.floor(f*5);b=1-s(.4,1.8,Math.min(e,1-e)*(512/5));let n=Math.abs(u-t[m]);n=Math.min(n,1-n)*512,b=Math.max(b,1-s(.4,1.6,n))}let x=n?l[m]:1,S=(.8+.25*v)*(1-.3*_)*x*(1-.35*y)*(1-.65*b);p.r=r*S,p.g=c*S,p.b=d*S,p.h=.5-_*.12+v*.18-y*.25-b*.9,p.ro=.55+.18*_+.2*y+.2*b,p.me=0}})()),{ns:.9})}function O(e=`#8c8a84`){let[t,n,i]=l(u,e);return h(m(`stone`+t+`_`+n+`_`+i,256,5,(e,o,c,l,u)=>{let d=a(c,l,4,4,51,5),f=a(c,l,2,2,53,3),p=s(.94,.99,1-Math.abs(2*a(c,l,3,3,52,4)-1)),m=r(e,o,55),h=m>.94?.22:m<.06?-.25:0,g=(.68+.48*d)*(.9+.2*f)*(1+h)*(1-.5*p);u.r=t*g,u.g=n*g,u.b=i*g,u.h=d*.7+h*.15-p*.6,u.ro=.78+.15*d+.07*p,u.me=0}),{ns:1})}function k(e=`#4a6fa5`){let[t,n,i]=l(u,e);return h(m(`fabric`+t+`_`+n+`_`+i,256,3,(e,a,o,s,c)=>{let l=Math.floor(e/8),u=Math.floor(a/8),d=(e%8+.5)/8,f=(a%8+.5)/8,p=(l+u)%2==0,m=Math.sin(Math.PI*d),h=Math.sin(Math.PI*f),g=p?m*(.75+.25*h):h*(.75+.25*m),_=p?r(l,0,71):r(0,u,72),v=r(e,a,73),y=.25+.6*g+v*.08,b=(.62+.42*g)*(.92+.14*_)*(.95+.08*v);c.r=t*b,c.g=n*b,c.b=i*b,c.h=y,c.ro=.88+.1*v,c.me=0}),{ns:.8})}function A(e=`#e84d4d`){let[t,n,i]=l(u,e);return h(m(`plastic`+t+`_`+n+`_`+i,256,2,(()=>{let e=c(256,14,83,.03,.12);return(o,s,c,l,u)=>{let d=a(c,l,24,24,61,2),f=a(c,l,3,3,62,3),p=e[s*256+o],m=r(o,s,63)>.985?.06:0,h=.93+.08*d+.05*(f-.5)+m;u.r=Math.min(255,t*h+30*p),u.g=Math.min(255,n*h+30*p),u.b=Math.min(255,i*h+30*p),u.h=d*.35-p*.3,u.ro=.3+.1*d+.3*p,u.me=0}})()),{ns:.5})}return{water:g,caustics:_,fire:x,steam:S,sparks:C,goo:w,glass:T,metal:E,wood:D,stone:O,fabric:k,plastic:A}}