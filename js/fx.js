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
uniform vec3 envC;
uniform float op;
uniform vec2 size;
uniform vec4 rp[4];
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
  float rip = 0.0;
  for (int i = 0; i < 4; i++) {
    float age = t - rp[i].z;
    if (age > 0.0 && age < 4.0) {
      vec2 dd = p - rp[i].xy;
      float r = length(dd) + 1e-4;
      float x = r - age * 0.42;
      float env = exp(-x * x * 30.0) * exp(-age * 0.9) * rp[i].w;
      g += dd / r * cos(x * 16.0) * 0.19 * env;
      rip += env;
    }
  }
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(cameraPosition - vW);
  float below = 1.0 - step(vW.y, cameraPosition.y);
  float nv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float fr = 0.03 + 0.97 * pow(1.0 - nv, 4.0);
  float hgt = n1.x * 0.65 + n2.x * 0.35;
  vec2 e = min(vUv, 1.0 - vUv) * size;
  float bd = min(e.x, e.y) + (n2.x - 0.5) * 0.06;
  float dk = smoothstep(0.0, min(0.75, min(size.x, size.y) * 0.22), bd);
  vec3 deepC = mix(cB, cA, clamp(0.2 + 0.5 * nv + 0.3 * (hgt - 0.5), 0.0, 1.0));
  vec3 shallow = cA * 1.22 + vec3(0.05, 0.08, 0.06);
  vec3 body = mix(shallow, deepC, dk);
  vec3 r = reflect(-v, n);
  float ry = clamp(r.y, -1.0, 1.0);
  vec3 refl = mix(envC * 0.5, envC * 0.85 + 0.1, smoothstep(0.12, 0.8, ry));
  refl *= 0.8 + 0.3 * smoothstep(0.02, 0.2, ry) * (1.0 - smoothstep(0.3, 0.55, ry));
  refl += vec3(1.0, 0.96, 0.88) * pow(max(dot(r, normalize(vec3(0.15, 1.0, 0.1))), 0.0), 90.0) * 1.1;
  vec3 col = mix(body, refl, fr * 0.85);
  vec3 L = normalize(vec3(0.35, 0.9, 0.25));
  float nh = max(dot(n, normalize(L + v)), 0.0);
  float glint = pow(nh, 240.0) * 2.4 + pow(nh, 28.0) * 0.08;
  glint += smoothstep(0.72, 0.95, n2.x) * pow(nh, 70.0) * 1.6;
  col += vec3(1.0, 0.97, 0.9) * glint * (1.0 - below);
  col += vec3(0.75, 0.9, 1.0) * min(rip, 1.0) * 0.04;
  float foam = (1.0 - smoothstep(0.01, 0.1, bd)) * (0.35 + 0.65 * n1.x) * 0.55;
  col = mix(col, vec3(0.88, 0.95, 1.0), foam * (1.0 - below));
  float a = clamp(op * mix(0.62, 1.0, dk) + fr * 0.25 + foam * 0.25, 0.0, 1.0);
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
`,r={glass:`vec3 fxV = normalize(vViewPosition);
float fxNV = clamp(abs(dot(normal, fxV)), 0.0, 1.0);
float fxFr = pow(1.0 - fxNV, 3.0);
vec3 fxR = reflect(-fxV, normal);
float fxUp = dot(fxR, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
outgoingLight += mix(vec3(0.03, 0.025, 0.02), vec3(0.16, 0.18, 0.21), smoothstep(-0.3, 0.6, fxUp)) * (0.25 + 0.9 * fxFr);
outgoingLight += fxTint * fxFr * 0.35;
diffuseColor.a = clamp(diffuseColor.a + fxFr * 0.45, 0.0, 1.0);
#include <opaque_fragment>`,goo:`vec3 fxV = normalize(vViewPosition);
float fxNV = clamp(abs(dot(normal, fxV)), 0.0, 1.0);
float fxRim = pow(1.0 - fxNV, 2.0);
outgoingLight = outgoingLight * (0.82 + 0.18 * fxNV) + fxTint * (fxRim * 0.5 + 0.06);
diffuseColor.a = clamp(diffuseColor.a + fxRim * 0.1, 0.0, 1.0);
#include <opaque_fragment>`,velvet:`vec3 fxV = normalize(vViewPosition);
float fxNV = clamp(abs(dot(normal, fxV)), 0.0, 1.0);
float fxL = dot(outgoingLight, vec3(0.3, 0.59, 0.11));
outgoingLight = outgoingLight * (0.7 + 0.3 * fxNV) + fxTint * pow(1.0 - fxNV, 2.2) * (fxL * 1.8 + 0.006);
#include <opaque_fragment>`};function i(e,t,n){let r=Math.imul(e,374761393)+Math.imul(t,668265263)+Math.imul(n,1442695041)|0;return r=Math.imul(r^r>>>13,1274126177),r^=r>>>16,(r>>>0)/4294967296}function a(e,t,n,r,a){let o=Math.floor(e),s=Math.floor(t),c=e-o,l=t-s;c=c*c*(3-2*c),l=l*l*(3-2*l);let u=(o%n+n)%n,d=(u+1)%n,f=(s%r+r)%r,p=(f+1)%r,m=i(u,f,a),h=i(d,f,a),g=i(u,p,a),_=i(d,p,a);return m+(h-m)*c+(g-m)*l+(m-h-g+_)*c*l}function o(e,t,n,r,i,o=4){let s=0,c=.5,l=1,u=0;for(let d=0;d<o;d++)s+=c*a(e*n*l,t*r*l,n*l,r*l,i+d*17),u+=c,c*=.5,l*=2;return s/u}function s(e){let t=e>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function c(e,t,n){let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)}function l(e,t,n,r,i=3,a=.5){let o=e*e,c=new Float32Array(o),l=new Int32Array(e),u=new Int32Array(e),d=new Float32Array(e),f=1,p=0;for(let o=0;o<i;o++){let i=t<<o,m=n<<o;if(i>e*2||m>e*2)break;let h=new Float32Array(i*m),g=s(r*131+o*7919+1),_=new Float32Array(i);for(let e=0;e<h.length;e++)h[e]=g();for(let t=0;t<e;t++){let n=t*i/e,r=Math.floor(n),a=n-r;l[t]=r%i,u[t]=(r+1)%i,d[t]=a*a*(3-2*a)}for(let t=0;t<e;t++){let n=t*m/e,r=Math.floor(n),a=n-r,o=a*a*(3-2*a),s=r%m*i,p=(r+1)%m*i,g=t*e;for(let e=0;e<i;e++){let t=h[s+e];_[e]=(t+(h[p+e]-t)*o)*f}for(let t=0;t<e;t++){let e=_[l[t]];c[g+t]+=e+(_[u[t]]-e)*d[t]}}p+=f,f*=a}let m=1/p;for(let e=0;e<o;e++)c[e]*=m;return c}function u(e,t,n,r,i,a=null){let o=new Float32Array(e*e),c=s(n);for(let n=0;n<t;n++){let t=c()*e,n=c()*e,s=a===null?c()*Math.PI*2:a+(c()-.5)*.25,l=(r+c()*(i-r))*e,u=.35+c()*.65,d=Math.cos(s),f=Math.sin(s);for(let r=0;r<l;r++){let i=(Math.round(t+d*r)%e+e)%e,a=(Math.round(n+f*r)%e+e)%e,s=u*Math.sin(Math.PI*r/l),c=a*e+i;s>o[c]&&(o[c]=s)}}return o}function d(e,t,n){let r=new Float32Array(e*e),i=s(n);for(let n=0;n<t;n++){let t=i()*e,n=i()*e,a=e*(.022+i()*.012),o=a*1.35,s=i()*Math.PI,c=Math.cos(s),l=Math.sin(s),u=9+i()*3,d=Math.ceil(o+2);for(let i=-d;i<=d;i++)for(let s=-d;s<=d;s++){let d=(s*c+i*l)/a,f=(-s*l+i*c)/o,p=Math.sqrt(d*d+f*f);if(p>=1)continue;let m=(.5+.5*Math.sin(p*u*Math.PI+Math.atan2(f,d)*.4))*(1-p*p),h=(Math.round(t+s)%e+e)%e,g=(Math.round(n+i)%e+e)%e*e+h;m>r[g]&&(r[g]=m)}}return r}const f=new Float32Array(4096);for(let e=0;e<4096;e++)f[e]=Math.sin(e/4096*Math.PI*2);function p(e,t){let n=new e.Color(t).getHex();return[n>>16&255,n>>8&255,n&255]}export function createFx(e){let m=e.THREE,h=new Map;class g extends m.MeshStandardMaterial{onBeforeCompile(e){let t=this.userData;e.uniforms.fxMacro={value:t.fxMacro||0},e.uniforms.fxWear={value:t.fxWear||0},e.uniforms.fxTint={value:new m.Color().fromArray(t.fxTint||[0,0,0])},e.vertexShader=e.vertexShader.replace(`#include <common>`,`#include <common>
varying vec3 vFxW;
varying vec2 vFxU;`).replace(`#include <worldpos_vertex>`,`#include <worldpos_vertex>
vec4 fxP4 = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
fxP4 = instanceMatrix * fxP4;
#endif
vFxW = (modelMatrix * fxP4).xyz;
vFxU = uv;`);let n=e.fragmentShader.replace(`#include <common>`,`#include <common>
varying vec3 vFxW;
varying vec2 vFxU;
uniform float fxMacro;
uniform float fxWear;
uniform vec3 fxTint;
float fxH(vec2 p){ return fract(sin(dot(p, vec2(41.7, 289.3))) * 45758.231); }
float fxN(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fxH(i), fxH(i + vec2(1.0, 0.0)), f.x), mix(fxH(i + vec2(0.0, 1.0)), fxH(i + vec2(1.0, 1.0)), f.x), f.y); }`).replace(`#include <map_fragment>`,`#include <map_fragment>
float fxM = fxN(vFxW.xz * 0.55 + vFxW.y * vec2(0.31, -0.47)) * 0.65 + fxN(vFxW.zy * 1.7 + vFxW.x * vec2(0.5, 0.29)) * 0.35;
diffuseColor.rgb *= 1.0 + fxMacro * (fxM - 0.5) * 2.0;
float fxEw = 0.0;
if (fxWear > 0.0) {
  float fxDu = length(fwidth(vFxU));
  float fxUpm = fxDu / max(length(fwidth(vFxW)), 1e-5);
  vec2 fxE = min(vFxU, 1.0 - vFxU);
  float fxEd = min(fxE.x, fxE.y) / max(fxUpm, 1e-4);
  fxEw = (1.0 - smoothstep(0.0, 0.014, fxEd)) * smoothstep(0.3, 0.7, fxN(vFxW.xy * 23.0 + vFxW.z * 17.0)) * fxWear * step(1e-6, fxDu);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.22 + 0.02, fxEw);
}`).replace(`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor * (1.0 - 0.35 * fxEw) * (1.0 + fxMacro * 1.6 * (fxM - 0.5)), 0.03, 1.0);`);r[t.fxKind]&&(n=n.replace(`#include <opaque_fragment>`,r[t.fxKind])),e.fragmentShader=n}customProgramCacheKey(){return`fx1`+(r[this.userData.fxKind]?this.userData.fxKind:``)}}function _(e,t){let n=document.createElement(`canvas`);n.width=n.height=e;let r=n.getContext(`2d`),i=r.createImageData(e,e);return i.data.set(t),r.putImageData(i,0,0),n}function v(e,t){let n=new m.CanvasTexture(e);return n.wrapS=n.wrapT=m.RepeatWrapping,t&&(n.colorSpace=m.SRGBColorSpace),n.anisotropy=4,n.userData.shared=!0,n}function y(e,t,n,r){let i=`pat:`+e;if(h.has(i))return h.get(i);let a=r(t),o=t*t,s=a.h,c=a.ro,l=a.me,u=new Uint8ClampedArray(o*4),d=new Uint8ClampedArray(o*4),f=n*t/256,p=t-1;for(let e=0;e<t;e++){let n=(e+p&p)*t,r=(e+1&p)*t,i=e*t;for(let e=0;e<t;e++){let t=(s[i+(e+1&p)]-s[i+(e+p&p)])*f,a=(s[r+e]-s[n+e])*f,o=1/Math.sqrt(t*t+a*a+1),m=i+e,h=m*4;u[h]=(-t*o*.5+.5)*255,u[h+1]=(a*o*.5+.5)*255,u[h+2]=(o*.5+.5)*255,u[h+3]=255;let g=c[m]*255;d[h]=g,d[h+1]=g,d[h+2]=l?l[m]*255:0,d[h+3]=255}}let m={S:t,k:a.k,w:a.w||null,m:a.m||null,ov:a.ov||null,add:a.add||null,normal:v(_(t,u),!1),rough:v(_(t,d),!1)};return h.set(i,m),m}function b(e,t,n){let r=`col:`+t+`:`+n.join(`_`);if(h.has(r))return h.get(r);let[i,a,o]=n,s=e.S*e.S,c=new Uint8ClampedArray(s*4),{k:l,w:u,m:d,ov:f,add:p}=e;for(let e=0;e<s;e++){let t=l[e],n=u?u[e]:0,r=e*4,s=i*t*(1+.09*n),m=a*t*(1+.015*n),h=o*t*(1-.11*n);if(d){let t=d[e];t>0&&(s+=(f[e*3]-s)*t,m+=(f[e*3+1]-m)*t,h+=(f[e*3+2]-h)*t)}if(p){let t=p[e];s+=t,m+=t,h+=t}c[r]=s,c[r+1]=m,c[r+2]=h,c[r+3]=255}let m=v(_(e.S,c),!0);return h.set(r,m),m}function x(e,t,n){return{map:b(e,t,n),normal:e.normal,rough:e.rough}}function S(e){let t=1,n=1;return e.repeat!=null&&(Array.isArray(e.repeat)?(t=+e.repeat[0]||1,n=+(e.repeat[1]??e.repeat[0])||1):t=n=+e.repeat||1),e.scale!=null&&+e.scale>0&&(t/=+e.scale,n/=+e.scale),[t,n]}function C(e,t,n){if(t===1&&n===1)return e;let r=e.uuid+`:`+t.toFixed(4)+`:`+n.toFixed(4);if(h.has(r))return h.get(r);let i=e.clone();return i.repeat.set(t,n),i.needsUpdate=!0,i.userData.shared=!0,h.set(r,i),i}function w(e,t={}){let[n,r]=S(t),i=new g({color:16777215,map:C(e.map,n,r),normalMap:C(e.normal,n,r),roughnessMap:C(e.rough,n,r),roughness:t.roughness??1,metalness:t.metalness??0,transparent:!!t.transparent,opacity:t.opacity??1});t.metalness&&(i.metalnessMap=i.roughnessMap);let a=t.ns??1;return i.normalScale.set(a,a),t.emissive&&(i.emissive.set(t.emissive),i.emissiveIntensity=t.ei??.1),t.depthWrite===!1&&(i.depthWrite=!1),t.side&&(i.side=t.side),i.userData.fxKind=t.kind||``,i.userData.fxMacro=t.macro??0,i.userData.fxWear=t.wear??0,i.userData.fxTint=t.tint?new m.Color(t.tint).toArray():[0,0,0],i}function T({w:n=4,d:r=4,color:i=`#1487a8`,deep:a=`#04283a`,opacity:o=.82,env:s=`#8ea4b2`}={}){let c=new m.PlaneGeometry(n,r,24,24);c.rotateX(-Math.PI/2);let l=[new m.Vector4(0,0,-99,0),new m.Vector4(0,0,-99,0),new m.Vector4(0,0,-99,0),new m.Vector4(0,0,-99,0)],u=new m.ShaderMaterial({uniforms:m.UniformsUtils.merge([m.UniformsLib.fog,{t:{value:0},amp:{value:Math.min(.03,Math.min(n,r)*.006)},cA:{value:new m.Color(i)},cB:{value:new m.Color(a)},envC:{value:new m.Color(s)},op:{value:o},size:{value:new m.Vector2(n,r)},rp:{value:l}}]),vertexShader:`
uniform float t;
uniform float amp;
uniform vec4 rp[4];
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
  for (int i = 0; i < 4; i++) {
    float age = t - rp[i].z;
    if (age > 0.0 && age < 4.0) {
      float x = distance(q, rp[i].xy) - age * 0.42;
      s += sin(x * 16.0) * exp(-x * x * 30.0) * exp(-age * 0.9) * rp[i].w * 0.006 * edge;
    }
  }
  vS = vec2(cos(a1) * 0.85 + cos(a3) * 0.465, cos(a2) * 0.805 + cos(a3) * 0.465) * k;
  vec4 w = w0 + vec4(0.0, s, 0.0, 0.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`,fragmentShader:t,transparent:!0,depthWrite:!1,side:m.DoubleSide,fog:!0});e.timeMat(u);let d=new m.Mesh(c,u);d.renderOrder=1,d.userData.setLevel=e=>{d.position.y=e};let f=0;return d.userData.ripple=(e,t,n=1)=>{f=(f+1)%4,u.uniforms.rp.value[f].set(e,t,u.uniforms.t.value,Math.max(0,Math.min(2,+n||1)))},d}function E({w:t=4,d:r=4,color:i=`#9fe8ff`,strength:a=.35}={}){let o=new m.PlaneGeometry(t,r);o.rotateX(-Math.PI/2);let s=new m.ShaderMaterial({uniforms:{t:{value:0},col:{value:new m.Color(i)},amt:{value:a}},vertexShader:`
varying vec3 vW;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`,fragmentShader:n,transparent:!0,depthWrite:!1,blending:m.AdditiveBlending,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});e.timeMat(s);let c=new m.Mesh(o,s);return c.position.y=.006,c.renderOrder=2,c}function D(e,t,n=64){if(h.has(e))return h.get(e);let r=new Uint8ClampedArray(n*n*4);for(let e=0;e<n;e++)for(let i=0;i<n;i++){let a=t((i+.5)/n,(e+.5)/n),o=(e*n+i)*4;r[o]=a[0],r[o+1]=a[1],r[o+2]=a[2],r[o+3]=a[3]}let i=v(_(n,r),!0);return i.wrapS=i.wrapT=m.ClampToEdgeWrapping,h.set(e,i),i}let O=()=>D(`flame`,(e,t)=>{let n=(e-.5)*2,r=.16+.62*c(0,.85,t),i=(a(e*8,t*8,8,8,5)-.5)*.25,o=t<.62?(t-.62)/.6:(t-.62)/.34,s=Math.sqrt((n/r)**2+o*o)+i*(1-t),l=Math.max(0,1-s)**1.5,u=Math.min(1,s/.85),d=250-180*u,f=225-215*Math.min(1,u*1.6);return[255,Math.max(60,d),Math.max(10,f),l*255]}),k=()=>D(`puff`,(e,t)=>{let n=e-.5,r=t-.5,i=Math.sqrt(n*n+r*r)*2,a=o(e,t,4,4,9,3);return[255,255,255,Math.max(0,1-i)**1.8*(.55+.45*a)*255]}),A=()=>D(`pool`,(e,t)=>{let n=e-.5,r=t-.5,a=Math.min(1,Math.sqrt(n*n+r*r)*2),o=(1-a*a)**2.2*(1-.18*a),s=(i(Math.floor(e*128),Math.floor(t*128),3)-.5)*2;return[255,255,255,Math.max(0,o*255+s)]},128);function j({size:t=.4,color:n=`#ff8a2a`}={}){let r=new m.Group,i=O(),a=[`#fff0b8`,n,n,`#ff5a1f`],o=s(Math.floor(t*1e3)+7),c=new m.Sprite(new m.SpriteMaterial({map:i,color:new m.Color(n),transparent:!0,opacity:.45,depthWrite:!1,blending:m.AdditiveBlending}));c.scale.set(t*1.3,t*1.5,1),c.position.y=t*.45,r.add(c);let l=[];for(let e=0;e<10;e++){let t=new m.Sprite(new m.SpriteMaterial({map:i,color:new m.Color(a[e%a.length]),transparent:!0,depthWrite:!1,blending:m.AdditiveBlending}));l.push({s:t,ph:e/10+o()*.1,sp:1.1+o()*.6,a:o()*6.28}),r.add(t)}return e.onUpdate((e,n)=>{if(r.visible){c.material.opacity=.4+.06*Math.sin(n*2.3);for(let e=0;e<l.length;e++){let r=l[e],i=(n*r.sp+r.ph)%1,a=.16*t*(1-i);r.s.position.set(Math.sin(r.a+n*3.1)*a,i*t*1.25,Math.cos(r.a*1.3+n*2.7)*a);let o=t*(.78-.5*i)*(.92+.12*Math.sin(n*5+r.a));r.s.scale.set(o*.8,o*1.2,1),r.s.material.opacity=Math.min(1,i*7)*(1-i)*1.05}}}),r}function M({size:t=.4}={}){let n=new m.Group,r=k(),i=s(Math.floor(t*1e3)+31),a=[];for(let e=0;e<8;e++){let t=new m.Sprite(new m.SpriteMaterial({map:r,color:16777215,transparent:!0,depthWrite:!1,opacity:0}));a.push({s:t,ph:e/8+i()*.08,sp:.28+i()*.18,a:i()*6.28,spin:(i()-.5)*.6}),n.add(t)}return e.onUpdate((e,r)=>{if(n.visible)for(let e=0;e<a.length;e++){let n=a[e],i=(r*n.sp+n.ph)%1,o=t*.35*i;n.s.position.set(Math.sin(n.a+r*.6)*o,i*t*2.4,Math.cos(n.a+r*.5)*o);let s=t*(.35+i*1.15);n.s.scale.set(s,s,1),n.s.material.rotation=n.a+r*n.spin,n.s.material.opacity=Math.min(1,i*5)*(1-i)*.42}}),n}function N(t,n=`#ffd54a`){return e.burst(t,n,36,2.4)}function P(e=`#5dff8a`,t={}){let n=p(m,e),r=y(`goo`,256,5,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),i=new Float32Array(t),a=new Float32Array(t),o=l(e,4,4,11,4),c=l(e,12,12,12,2),u=s(77),d=[];for(let t=0;t<34;t++)d.push([u()*e,u()*e,e*(.01+u()*.045)]);let f=new Float32Array(t);for(let[t,n,r]of d){let i=Math.ceil(r);for(let a=-i;a<=i;a++)for(let o=-i;o<=i;o++){let i=(o*o+a*a)/(r*r);if(i>=1)continue;let s=(Math.round(n+a)%e+e)%e*e+(Math.round(t+o)%e+e)%e;f[s]=Math.max(f[s],Math.sqrt(1-i))}}for(let e=0;e<t;e++){let t=o[e],s=f[e];n[e]=.7+.42*t+.2*s+.06*(c[e]-.5),r[e]=(t-.5)*1.4+s*.5,i[e]=t*.6+s*.5+c[e]*.05,a[e]=.04+.1*(1-t)-.03*s}return{k:n,w:r,h:i,ro:a}}),i=new m.Color(e).offsetHSL(0,.15,.08).multiplyScalar(.55);return w(x(r,`goo`,n),{...t,transparent:!0,opacity:.88,ns:.6,metalness:0,emissive:e,ei:.12,kind:`goo`,tint:i})}function F(e=`#d8f4ff`,t=.28,n={}){t&&typeof t==`object`&&(n=t,t=n.opacity??.28);let r=p(m,e);return w(x(y(`glass`,256,3,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),i=new Float32Array(t),a=new Float32Array(t),o=u(e,30,91,.03,.2),s=l(e,3,3,21,3),f=l(e,6,6,22,4),p=d(e,5,23),m=l(e,64,64,24,1);for(let e=0;e<t;e++){let t=o[e],l=c(.56,.8,f[e]),u=p[e]*.8;n[e]=.95+.05*s[e],a[e]=55*t+14*u+10*l*m[e],r[e]=s[e]*.15-t*.08,i[e]=Math.min(1,.03+.2*l+.3*t+.22*u)}return{k:n,h:r,ro:i,add:a}}),`glass`,r),{...n,transparent:!0,opacity:t,ns:.3,roughness:1,depthWrite:!1,kind:`glass`,tint:new m.Color(e).lerp(new m.Color(`#ffffff`),.5)})}function I(e=`#9aa3ad`,t={}){let{brushed:n=!1,rust:r=0}=t,i=p(m,e),a=r===!0?.55:Math.max(0,Math.min(1,+r||0)),o=`metal`+(n?`b`:``)+a.toFixed(2);return w(x(y(o,n?512:256,4,e=>{let t=e*e,r=new Float32Array(t),i=new Float32Array(t),o=new Float32Array(t),s=new Float32Array(t),f=new Float32Array(t),p=l(e,6,6,31,3),m=l(e,2,2,32,2),h=n?l(e,2,384,35,2):null,g=n?l(e,1,96,36,2):null,_=u(e,n?24:60,41,.02,.16,n?0:null),v=d(e,4,42),y=null,b=null,x=null,S=null,C=null;a>0&&(y=new Float32Array(t),b=new Float32Array(t*3),x=l(e,5,5,33,4),S=l(e,24,24,37,2),C=l(e,18,3,38,2));for(let l=0;l<t;l++){let t=p[l],u=_[l],d=m[l],w=v[l],T=n?(h[l]-.5)*.7+(g[l]-.5)*.5:0;r[l]=.84+.2*t+T*.22-.05*w,f[l]=48*u;let E=t*.22+T*.3-u*.5,D=(n?.3+T*.2:.2+.14*t)-.07*u+.2*w-.12*c(.55,.8,d),O=.95;if(y){let t=(l/e|0)/e,n=x[l]*.75+C[l]*.25+(.5-Math.abs(t-.5))*.02,r=c(.67-a*.35,.75-a*.3,n);if(r>0){let e=S[l],t=l*3;y[l]=r,b[t]=92+92*e,b[t+1]=40+42*e,b[t+2]=16+16*e,E-=r*(.12+e*.4),D+=(.93-D)*r,O*=1-r,f[l]*=1-r}}i[l]=E,o[l]=Math.max(.05,Math.min(1,D)),s[l]=O}return{k:r,h:i,ro:o,me:s,add:f,m:y,ov:b}}),o,i),{...t,metalness:1,ns:.8,macro:.05,wear:.6})}function L(e,t){let n=`wood`+(e?`p`+t:``);return[n,y(n,512,6,n=>{let r=n*n,i=new Float32Array(r),a=new Float32Array(r),o=new Float32Array(r),u=new Float32Array(r),d=e?t:1,p=l(n,2,3,61,3),m=l(n,4,192,63,2),h=l(n,24,256,64,1),g=l(n,2,2,65,3),_=s(123),v=[];for(let e=0;e<d;e++)v.push({off:_(),off2:_(),tone:.84+_()*.3,warm:(_()-.5)*2,ph:_()*3,ku:_(),kv:.3+_()*.4,kn:_()<.45,fq:4+Math.floor(_()*3)});let y=e?.028:.04;for(let t=0;t<n;t++){let r=t/n,s=Math.min(d-1,Math.floor(r*d)),l=v[s],_=r*d-s,b=Math.min(_,1-_)*(n/d),x=e?1-c(.4,1.7,b):0;for(let s=0;s<n;s++){let v=s/n,b=t*n+s,S=p[b],C=e?_*l.fq+S*.9+l.ph+.35*Math.sin(2*Math.PI*(v+l.off)):r*9+S*1.3+.3*Math.sin(2*Math.PI*v+1.7),w=0;if(l.kn||!e){let t=Math.abs(v-l.ku);t=Math.min(t,1-t);let n=e?(_-l.kv)/d:r-.5,i=(t*t+n*n*9)/(y*y);i<9&&(w=Math.exp(-i),C+=1.6*Math.exp(-i*.35))}let T=.5+.5*f[(C*4096|0)&4095],E=T*T*Math.sqrt(T),D=c(.7,.86,h[b]),O=x;if(e){let e=Math.abs(v-l.off);e=Math.min(e,1-e)*n;let t=Math.abs(v-(l.off+.5+l.off2*.2)%1);t=Math.min(t,1-t)*n,O=Math.max(O,1-c(.4,1.5,e),l.off2>.5?1-c(.4,1.5,t):0)}let k=e?l.tone:1,A=g[b],j=m[b];i[b]=(.78+.34*j)*(1-.17*E)*k*(1-.26*D)*(1-.55*O)*(.93+.14*A)*(1-.45*w),a[b]=(e?l.warm*.7:0)+(S-.5)*.7+E*.45+w*.6,o[b]=.5-E*.08+j*.12-D*.18-O*.9-w*.08,u[b]=Math.min(1,Math.max(.2,.52+.13*E+.16*D+.32*O+(j-.5)*.1-(A-.5)*.22))}}return{k:i,w:a,h:o,ro:u}})]}function R(e=`#8a5a34`,t={}){let{dark:n=!1,planks:r=!1}=t,[i,a,o]=p(m,e);n&&(i*=.5,a*=.46,o*=.44);let[s,c]=L(r,r?Math.max(2,Math.min(16,Math.round(t.rows||7))):1);return w(x(c,s,[Math.round(i),Math.round(a),Math.round(o)]),{...t,ns:.9,macro:.06,wear:n?.7:1})}function z(e=`#8c8a84`,t={}){let n=p(m,e),r=!!t.blocks,a=`stone`+(r?`b`:``);return w(x(y(a,512,5,e=>{let t=e*e,n=new Float32Array(t),a=new Float32Array(t),o=new Float32Array(t),u=new Float32Array(t),d=l(e,6,6,51,4),f=l(e,2,2,53,3),p=l(e,3,3,52,3),m=l(e,96,96,54,1),h=r?l(e,24,24,56,2):null,g=null,_=null,v=s(57),y=[];for(let e=0;e<12;e++)y.push([.86+v()*.26,(v()-.5)*1.6]);r&&(g=new Float32Array(t),_=new Float32Array(t*3));for(let t=0;t<e;t++)for(let s=0;s<e;s++){let l=t*e+s,v=d[l],b=c(.975,.998,1-Math.abs(2*p[l]-1)),x=i(s,t,55),S=x>.95?.2:x<.05?-.22:0,C=m[l],w=(.7+.44*v)*(.9+.2*f[l])*(1+S)*(1-.22*b)*(.94+.12*C),T=(f[l]-.5)*1.6+(C-.5)*.6,E=v*.7+S*.15-b*.3+C*.1,D=.76+.15*v+.08*b-.08*(f[l]-.5);if(r){let n=t/e,r=Math.floor(n*3),i=n*3-r,a=(s/e+r%2*.5/2)%1,o=Math.floor(a*2),u=a*2-o,d=(h[l]-.5)*3,f=Math.min(Math.min(i,1-i)*e/3,Math.min(u,1-u)*e/2)+d,p=1-c(2.2,4.2,f),m=1-c(3,12,f),b=y[(r*2+o)%y.length];w*=b[0]*(1-.12*m),T+=b[1],E=E*(1-p)-p*1.2-m*.35,D+=.12*p,g[l]=p*.85,_[l*3]=128+30*v,_[l*3+1]=122+30*v,_[l*3+2]=112+28*v}n[l]=w,a[l]=T,o[l]=E,u[l]=Math.min(1,D)}return{k:n,w:a,h:o,ro:u,m:g,ov:_}}),a,n),{...t,ns:1,macro:.08,wear:.5})}function B(e=`#4a6fa5`,t={}){let n=p(m,e);return w(x(y(`fabric`,256,3,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),a=new Float32Array(t),o=new Float32Array(t),s=l(e,4,4,74,3),c=l(e,32,32,75,2);for(let t=0;t<e;t++)for(let l=0;l<e;l++){let u=t*e+l,d=l/4|0,f=t/4|0,p=(l%4+.5)/4,m=(t%4+.5)/4,h=(d+f&3)<2,g=Math.sin(Math.PI*p),_=Math.sin(Math.PI*m),v=h?g*(.72+.28*_):_*(.72+.28*g),y=h?i(d,0,71):i(0,f,72),b=i(l,t,73),x=s[u];n[u]=(.66+.38*v)*(.93+.12*y)*(.96+.07*b)*(.92+.16*x),r[u]=(x-.5)*.8+(y-.5)*.3,a[u]=.25+.6*v+b*.08+c[u]*.15,o[u]=.86+.1*b+.04*(1-v)}return{k:n,w:r,h:a,ro:o}}),`fabric`,n),{...t,ns:.75,macro:.05})}function V(e=`#e84d4d`,t={}){let n=p(m,e);return w(x(y(`plastic`,256,2,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),a=new Float32Array(t),o=new Float32Array(t),s=l(e,48,48,61,2),c=l(e,3,3,62,3),f=l(e,2,12,64,2),p=u(e,22,83,.02,.1),m=d(e,4,84);for(let l=0;l<t;l++){let t=p[l],u=m[l],d=i(l%e,l/e|0,63)>.988?.05:0;n[l]=.94+.06*s[l]+.05*(c[l]-.5)+.03*(f[l]-.5)+d,o[l]=26*t,r[l]=s[l]*.3-t*.3+f[l]*.05,a[l]=Math.min(1,.28+.1*s[l]+.3*t+.2*u+.06*(c[l]-.5))}return{k:n,h:r,ro:a,add:o}}),`plastic`,n),{...t,ns:.5,macro:.03,wear:.5})}function H(e=`#6b3a22`,t={}){let n=p(m,e);return w(x(y(`leather`,512,4,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),i=new Float32Array(t),a=new Float32Array(t),o=e/40,u=s(91),d=new Float32Array(1600),f=new Float32Array(1600);for(let e=0;e<1600;e++)d[e]=.15+u()*.7,f[e]=.15+u()*.7;let p=l(e,3,3,92,3),m=l(e,6,2,93,3),h=l(e,8,8,94,2);for(let t=0;t<e;t++)for(let s=0;s<e;s++){let l=Math.floor(s/o),u=Math.floor(t/o),g=9,_=9;for(let e=-1;e<=1;e++)for(let n=-1;n<=1;n++){let r=(l+n+40)%40,i=(u+e+40)%40,a=(l+n+d[i*40+r])*o,c=(u+e+f[i*40+r])*o,p=(s-a)/o,m=(t-c)/o,h=p*p+m*m;h<g?(_=g,g=h):h<_&&(_=h)}let v=t*e+s,y=1-c(.02,.18,Math.sqrt(_)-Math.sqrt(g)),b=1-Math.min(1,Math.sqrt(g)*1.3),x=c(.55,.8,p[v]),S=c(.6,.75,1-Math.abs(2*m[v]-1));n[v]=(.88+.1*b)*(1-.12*y)*(.92+.16*h[v])*(1+.12*x)*(1-.15*S),r[v]=(h[v]-.5)*.8+x*.4,i[v]=b*.25-y*.25-S*.3,a[v]=Math.min(1,.5+.16*y-.2*x+.1*S)}return{k:n,w:r,h:i,ro:a}}),`leather`,n),{...t,ns:.7,macro:.06,wear:.8})}function U(e=`#e8e0d2`,t={}){let n=p(m,e);return w(x(y(`plaster`,512,3,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),i=new Float32Array(t),a=new Float32Array(t),o=l(e,3,3,101,4),s=l(e,8,6,102,3),u=l(e,160,160,103,1),d=l(e,5,5,104,4);for(let e=0;e<t;e++){let t=c(.5,.62,s[e]),l=c(.985,.998,1-Math.abs(2*d[e]-1));n[e]=(.95+.07*o[e])*(1+.025*t)*(.985+.03*u[e])*(1-.07*l),r[e]=(o[e]-.5)*.4,i[e]=o[e]*.4+t*.25+u[e]*.12-l*.15,a[e]=Math.min(1,.82+.1*u[e]-.1*t)}return{k:n,w:r,h:i,ro:a}}),`plaster`,n),{...t,ns:.45,macro:.07,wear:.25})}function W(e=`#e9e6df`,t={}){let n=p(m,e),r=Math.max(1,Math.min(16,Math.round(1/Math.max(.0625,+t.size||.25)))),i=(n[0]*.3+n[1]*.59+n[2]*.11)/255,a=t.grout?p(m,t.grout):i>.55?[150,146,138]:[96,94,90],o=`tile`+r;return w(x(y(o,512,4,e=>{let t=e*e,n=new Float32Array(t),i=new Float32Array(t),o=new Float32Array(t),u=new Float32Array(t),d=new Float32Array(t),f=new Float32Array(t*3),p=l(e,4,4,111,3),m=l(e,64,64,112,1),h=l(e,96,96,113,1),g=e/r,_=s(114),v=[];for(let e=0;e<r*r;e++)v.push([.93+_()*.12,(_()-.5)*.8,_()*.08]);for(let t=0;t<e;t++)for(let s=0;s<e;s++){let l=t*e+s,_=Math.floor(s/g),y=Math.floor(t/g),b=Math.min(s-_*g,(_+1)*g-1-s),x=Math.min(t-y*g,(y+1)*g-1-t),S=Math.min(b,x),C=1-c(1.2,2.6,S),w=1-c(2.6,9,S),T=v[y*r+_];n[l]=T[0]*(.98+.04*p[l])*(1-.06*w),i[l]=T[1],o[l]=.6+p[l]*.05-w*.25-C*.8+m[l]*.01,u[l]=C>.5?.92:.12+T[2]+.08*(p[l]-.5)+.1*w,d[l]=C;let E=.9+.2*h[l];f[l*3]=a[0]*E,f[l*3+1]=a[1]*E,f[l*3+2]=a[2]*E}return{k:n,w:i,h:o,ro:u,m:d,ov:f}}),o+`:`+a.join(`_`),n),{...t,ns:.6,macro:.04})}function G(e=`#8a4a34`,t={}){let n=p(m,e);return w(x(y(`brick`,512,5,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),i=new Float32Array(t),a=new Float32Array(t),o=new Float32Array(t),u=new Float32Array(t*3),d=l(e,64,64,121,2),f=l(e,48,48,122,2),p=l(e,6,6,123,3),m=l(e,128,128,124,1),h=s(125),g=[];for(let e=0;e<70;e++){let e=h()<.1;g.push([e?.62+h()*.12:.85+h()*.28,(h()-.5)*1.8+(e?-.6:0)])}for(let t=0;t<e;t++)for(let s=0;s<e;s++){let l=t*e+s,h=t/e,_=Math.floor(h*14),v=h*14-_,y=(s/e+_%2*.5/5)%1,b=Math.floor(y*5),x=y*5-b,S=(d[l]-.5)*3.2,C=Math.min(Math.min(v,1-v)*e/14,Math.min(x,1-x)*e/5)+S,w=1-c(2,3.4,C),T=1-c(3,7,C),E=g[_*5+b];n[l]=E[0]*(.86+.22*f[l])*(.94+.12*p[l])*(1-.1*T),r[l]=E[1]+(p[l]-.5)*.6,i[l]=(1-w)*(.6+f[l]*.3)-w*.6-T*.2,a[l]=.82+.1*f[l]+.1*w,o[l]=w*.95;let D=.85+.3*m[l];u[l*3]=168*D,u[l*3+1]=160*D,u[l*3+2]=146*D}return{k:n,w:r,h:i,ro:a,m:o,ov:u}}),`brick`,n),{...t,ns:.9,macro:.07})}function K(e=`#7a1530`,t={}){let n=p(m,e),r=y(`velvet`,256,2,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),i=new Float32Array(t),a=new Float32Array(t),o=l(e,6,6,131,3),s=l(e,3,12,132,3),u=l(e,128,128,133,1);for(let e=0;e<t;e++){let t=c(.45,.75,s[e]);n[e]=(.84+.16*o[e])*(1+.14*t)*(.96+.06*u[e]),r[e]=(o[e]-.5)*.5,i[e]=t*.2+u[e]*.1,a[e]=.9+.08*u[e]}return{k:n,w:r,h:i,ro:a}}),i=new m.Color(e).lerp(new m.Color(`#ffffff`),.35);return w(x(r,`velvet`,n),{...t,ns:.5,macro:.07,kind:`velvet`,tint:i})}function q(e=`#eeeae4`,t={}){let n=p(m,e),r=(n[0]*.3+n[1]*.59+n[2]*.11)/255,i=t.vein?p(m,t.vein):r>.5?[n[0]*.42,n[1]*.42,n[2]*.45]:[Math.min(255,n[0]+150),Math.min(255,n[1]+145),Math.min(255,n[2]+135)],a=y(`marble`,512,2,e=>{let t=e*e,n=new Float32Array(t),r=new Float32Array(t),i=new Float32Array(t),a=new Float32Array(t),o=new Float32Array(t*3),s=new Float32Array(t),u=l(e,4,4,141,4),d=l(e,8,8,142,3),p=l(e,3,3,143,4),m=l(e,6,6,144,3);for(let t=0;t<e;t++)for(let l=0;l<e;l++){let h=t*e+l,g=l/e,_=t/e,v=1-Math.abs(f[((g+2*_+u[h]*1.114)*4096|0)&4095]),y=1-Math.abs(f[((3*g-_+4+d[h]*1.432)*4096|0)&4095]),b=v*v,x=b*b,S=x*x,C=y*y,w=C*C,T=w*w,E=T*T,D=S*x*b*.9+E*T*w*C*.5;a[h]=Math.min(1,D),o[h*3]=1,o[h*3+1]=1,o[h*3+2]=1,n[h]=.9+.14*p[h],s[h]=(p[h]-.5)*.6,r[h]=p[h]*.05-D*.05,i[h]=Math.min(1,.08+.1*c(.55,.8,m[h])+.04*D)}return{k:n,w:s,h:r,ro:i,m:a,ov:o}}),o=`marble:`+i.map(Math.round).join(`_`);if(!a[`ov`+o]){let e=a.S*a.S,t=new Float32Array(e*3);for(let n=0;n<e;n++)t[n*3]=i[0],t[n*3+1]=i[1],t[n*3+2]=i[2];a[`ov`+o]=t}return w(x({...a,ov:a[`ov`+o]},o,n),{...t,ns:.3,macro:.04,wear:.15})}function J({color:e=`#fff1d6`,size:t=1.2,w:n,d:r,opacity:i=.35}={}){let a=new m.MeshBasicMaterial({map:A(),color:new m.Color(e),transparent:!0,opacity:i,depthWrite:!1,toneMapped:!1,blending:m.AdditiveBlending,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-2}),o=new m.Mesh(new m.PlaneGeometry(n??t,r??t),a);return o.rotation.x=-Math.PI/2,o.position.y=.004,o.renderOrder=1,o.castShadow=o.receiveShadow=!1,o}function Y({w:e=.6,d:t=.6,opacity:n=.55,blur:r}={}){let i=r??.05+.12*Math.min(e,t),a=e+i*2,o=t+i*2,s=new m.ShaderMaterial({uniforms:{hs:{value:new m.Vector2(e/2,t/2)},bl:{value:i},op:{value:n},ps:{value:new m.Vector2(a,o)}},vertexShader:`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,fragmentShader:`uniform vec2 hs; uniform float bl; uniform float op; uniform vec2 ps; varying vec2 vUv;
void main(){ vec2 p = (vUv - 0.5) * ps; float r = min(bl * 0.5, min(hs.x, hs.y));
vec2 q = abs(p) - hs + r; float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
float a = 1.0 - smoothstep(-bl * 0.55, bl, sd); a *= a * (3.0 - 2.0 * a);
float core = 1.0 - smoothstep(-min(hs.x, hs.y), 0.0, sd);
gl_FragColor = vec4(0.0, 0.0, 0.0, op * a * (0.78 + 0.22 * core)); }`,transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-2}),c=new m.Mesh(new m.PlaneGeometry(a,o),s);return c.rotation.x=-Math.PI/2,c.position.y=.003,c.renderOrder=1,c.castShadow=c.receiveShadow=!1,c}function X({w:e=1.2,h:t=2.4,color:n=`#fff4d6`,opacity:r=.09,layers:i=3}={}){let a=Math.max(1,Math.min(4,i|0)),o=[],s=[],c=[],l=[];for(let n=0;n<a;n++){let r=a===1?0:(n/(a-1)-.5)*e*.35,i=n*4;o.push(-e/2,0,r,e/2,0,r,-e/2,-t,r,e/2,-t,r),s.push(0,1,1,1,0,0,1,0),c.push(0,0,1,0,0,1,0,0,1,0,0,1),l.push(i,i+2,i+1,i+1,i+2,i+3)}let u=new m.BufferGeometry;u.setAttribute(`position`,new m.Float32BufferAttribute(o,3)),u.setAttribute(`uv`,new m.Float32BufferAttribute(s,2)),u.setAttribute(`normal`,new m.Float32BufferAttribute(c,3)),u.setIndex(l);let d=new m.ShaderMaterial({uniforms:{col:{value:new m.Color(n)},op:{value:r}},vertexShader:`varying vec2 vUv; varying float vF; varying float vD; varying float vZ;
void main(){ vUv = uv; vZ = position.z; vec4 mv = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal);
vF = abs(dot(n, normalize(-mv.xyz))); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,fragmentShader:`uniform vec3 col; uniform float op; varying vec2 vUv; varying float vF; varying float vD; varying float vZ;
void main(){ float x = vUv.x + vZ * 0.37;
float s = 0.5 + 0.5 * (sin(x * 17.0 + 1.3) * 0.5 + sin(x * 31.0 + 4.1) * 0.3 + sin(x * 7.0 + 0.4) * 0.2);
s = 0.35 + 0.65 * s * s;
float e = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
float l = smoothstep(0.0, 0.55, vUv.y) * (0.55 + 0.45 * vUv.y) * smoothstep(1.0, 0.94, vUv.y);
float a = op * s * e * l * pow(vF, 0.6) * smoothstep(0.35, 1.3, vD);
gl_FragColor = vec4(col * a, 1.0); }`,transparent:!0,depthWrite:!1,blending:m.AdditiveBlending,side:m.DoubleSide}),f=new m.Mesh(u,d);return f.renderOrder=3,f.castShadow=f.receiveShadow=!1,f}function Z({size:t=2,count:n=80,color:r=`#fff6e0`,opacity:i=.5}={}){let a=Array.isArray(t)?t:[t,t,t],o=Math.max(1,Math.min(600,n|0)),c=s(o*7+3),l=new Float32Array(o*3),u=new Float32Array(o);for(let e=0;e<o;e++)l[e*3]=(c()-.5)*a[0],l[e*3+1]=(c()-.5)*a[1],l[e*3+2]=(c()-.5)*a[2],u[e]=c();let d=new m.BufferGeometry;d.setAttribute(`position`,new m.BufferAttribute(l,3)),d.setAttribute(`seed`,new m.BufferAttribute(u,1));let f=new m.ShaderMaterial({uniforms:{t:{value:0},px:{value:600},box:{value:new m.Vector3(a[0],a[1],a[2])},col:{value:new m.Color(r)},op:{value:i}},vertexShader:`uniform float t; uniform float px; uniform vec3 box; attribute float seed; varying float vA;
void main(){ vec3 p = position;
p += vec3(sin(t * 0.13 + seed * 6.28), 0.0, cos(t * 0.11 + seed * 5.1)) * 0.12;
p.y = mod(p.y + box.y * 0.5 + t * (0.006 + seed * 0.01) + sin(t * 0.09 + seed * 3.0) * 0.08, box.y) - box.y * 0.5;
vec4 mv = modelViewMatrix * vec4(p, 1.0);
gl_PointSize = clamp(px * projectionMatrix[1][1] * (0.004 + 0.004 * seed) / max(-mv.z, 0.05), 1.0, 24.0);
float edge = smoothstep(0.0, 0.15, 0.5 - abs(p.y / box.y));
vA = (0.45 + 0.55 * (0.5 + 0.5 * sin(t * 0.35 + seed * 40.0))) * edge * smoothstep(0.25, 0.8, -mv.z);
gl_Position = projectionMatrix * mv; }`,fragmentShader:`uniform vec3 col; uniform float op; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float a = 1.0 - smoothstep(0.1, 0.5, length(c));
gl_FragColor = vec4(col * a * vA * op, 1.0); }`,transparent:!0,depthWrite:!1,blending:m.AdditiveBlending});e.timeMat(f);let p=new m.Points(d,f);return p.frustumCulled=!1,p.renderOrder=3,p.userData.cut=`fx`,p.onBeforeRender=e=>{f.uniforms.px.value=e.xr&&e.xr.isPresenting?1100:e.domElement.height*.5},p}return{water:T,caustics:E,fire:j,steam:M,sparks:N,goo:P,glass:F,metal:I,wood:R,stone:z,fabric:B,plastic:V,leather:H,plaster:U,tile:W,brick:G,velvet:K,marble:q,lightPool:J,contactShadow:Y,godRays:X,dustMotes:Z}}