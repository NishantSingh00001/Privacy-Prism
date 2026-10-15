(() => {
  const canvas = document.querySelector('#prismCanvas');
  if (!canvas) return;
  const fallback = document.querySelector('[data-prism-fallback]');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
  if (!gl) { fallback.hidden = false; return; }

  const vertex = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec4 aColor;
    uniform float uYaw;
    uniform float uPitch;
    uniform float uAspect;
    uniform float uScale;
    uniform int uModel;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec4 vColor;
    varying float vDepth;
    void main() {
      vec3 p = aPosition * uScale;
      vec3 n = aNormal;
      if (uModel == 1) {
        float cy = cos(uYaw), sy = sin(uYaw), cx = cos(uPitch), sx = sin(uPitch);
        p = vec3(cy*p.x + sy*p.z, p.y, -sy*p.x + cy*p.z);
        n = vec3(cy*n.x + sy*n.z, n.y, -sy*n.x + cy*n.z);
        p = vec3(p.x, cx*p.y - sx*p.z, sx*p.y + cx*p.z);
        n = vec3(n.x, cx*n.y - sx*n.z, sx*n.y + cx*n.z);
      }
      gl_PointSize = uModel == 2 ? 11.0 : 1.0;
      float depth = 8.4 - p.z;
      float focal = 3.2;
      gl_Position = vec4(p.x * focal / uAspect, p.y * focal, 1.004 * depth - 0.2004, depth);
      vNormal = normalize(n);
      vPosition = p;
      vColor = aColor;
      vDepth = depth;
    }`;
  const fragment = `
    precision highp float;
    uniform float uTime;
    uniform float uOpacity;
    uniform int uMaterial;
    uniform float uUtility;
    uniform float uRisk;
    uniform float uCoverage;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec4 vColor;
    varying float vDepth;
    vec3 spectral(float x) {
      return .5 + .5*cos(6.28318*(vec3(0.02,0.36,0.68)+x+vec3(0.0,.12,.23)));
    }
    void main() {
      if (uMaterial == 2) {
        vec2 p = gl_PointCoord - .5;
        float d = length(p);
        float core = exp(-d*d*54.0);
        float halo = exp(-d*d*13.0);
        gl_FragColor = vec4(mix(vec3(.56,.78,1.0),vec3(.83,.63,1.0),vColor.r), (core*.9+halo*.22)*vColor.a);
        return;
      }
      if (uMaterial == 1) {
        float pulse = .78 + .22*sin(uTime*1.4 + vPosition.y*2.2 + vPosition.x*1.7);
        float flow = .5 + .5*sin(uTime*.45 + vPosition.y*3.1 + vPosition.x*2.3);
        gl_FragColor = vec4(vColor.rgb * (0.7 + flow*.48), vColor.a * pulse * uOpacity);
        return;
      }
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vec3(-vPosition.x*.24, -vPosition.y*.24, 8.4-vPosition.z));
      float fresnel = pow(1.0 - abs(dot(N,V)), 2.5);
      vec3 L1 = normalize(vec3(-.55,.8,.9));
      vec3 L2 = normalize(vec3(.75,-.25,.65));
      float diffuse = max(dot(N,L1),0.0)*.55 + max(dot(N,L2),0.0)*.32;
      float spec = pow(max(dot(reflect(-L1,N),V),0.0),24.0) + pow(max(dot(reflect(-L2,N),V),0.0),38.0)*.62;
      float spectralBand = .5 + .5*sin(vPosition.y*3.0 + vPosition.x*2.1 + uTime*.16);
      vec3 iridescence = spectral(spectralBand*.17 + vPosition.z*.045);
      vec3 base = vColor.rgb * (.30 + diffuse*.9) * (.82 + .18*uUtility);
      base = mix(base, iridescence, .25 + fresnel*.46);
      base += spec * vec3(.73,.86,1.0) * .72;
      base += fresnel * mix(vec3(.28,.78,.98),vec3(.81,.48,1.0),uRisk) * .48;
      base += uCoverage * vec3(.13,.34,.24) * (1.0-fresnel)*.18;
      float alpha = clamp(.19 + fresnel*.57 + spec*.32, .12, .91) * uOpacity;
      if (uMaterial == 3) { base = mix(vec3(.42,.77,.98),vec3(.82,.61,1.0),uRisk); alpha = .76*uOpacity; }
      gl_FragColor = vec4(base,alpha);
    }`;

  function shader(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let program;
  try {
    program = gl.createProgram(); gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) { console.warn('Privacy Prism WebGL could not initialize:', error); fallback.hidden = false; return; }
  gl.useProgram(program);
  const loc = name => gl.getAttribLocation(program, name);
  const uniform = name => gl.getUniformLocation(program, name);
  const attrs = { position: loc('aPosition'), normal: loc('aNormal'), color: loc('aColor') };
  const U = { yaw:uniform('uYaw'), pitch:uniform('uPitch'), aspect:uniform('uAspect'), scale:uniform('uScale'), model:uniform('uModel'), time:uniform('uTime'), opacity:uniform('uOpacity'), material:uniform('uMaterial'), utility:uniform('uUtility'), risk:uniform('uRisk'), coverage:uniform('uCoverage') };
  const buffers = {};
  const makeBuffer = data => { const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW); return b; };
  function bindGeometry(bufferSet) {
    for (const [key, buffer] of Object.entries(bufferSet)) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const index = attrs[key]; if (index < 0) continue;
      const size = key === 'color' ? 4 : 3;
      gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index, size, gl.FLOAT, false, 0, 0);
    }
  }
  function triangle(a,b,c,color,out,normals) {
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    const m=Math.hypot(...n)||1; n.forEach((v,i)=>n[i]=v/m);
    [a,b,c].forEach(p=>{out.push(...p);normals.push(...n);});
  }
  const palette = [[.48,.76,.96, .58],[.66,.56,.97,.46],[.42,.85,.8,.4],[.92,.56,.78,.42],[.65,.78,.99,.5],[.8,.66,.97,.45],[.42,.76,.84,.4],[.94,.7,.56,.38]];
  function crystalGeometry(scale=1) {
    const top=[0,1.45,0], bottom=[0,-1.38,0], ring=[[.93,0,0],[0,0,.93],[-.93,0,0],[0,0,-.93]], positions=[], normals=[], colors=[];
    for(let i=0;i<4;i++) {
      const j=(i+1)%4, color=palette[i];
      for(const tri of [[top,ring[i],ring[j]],[bottom,ring[j],ring[i]]]) triangle(tri[0],tri[1],tri[2],color,positions,normals);
    }
    for(let face=0;face<8;face++) for(let i=0;i<3;i++) colors.push(...palette[face]);
    return { position:makeBuffer(positions), normal:makeBuffer(normals), color:makeBuffer(colors), count:positions.length/3 };
  }
  const outer = crystalGeometry();
  const inner = crystalGeometry();
  const edgePairs = [];
  const ringPoints=[[.93,0,0],[0,0,.93],[-.93,0,0],[0,0,-.93]], top=[0,1.45,0], bottom=[0,-1.38,0];
  for(let i=0;i<4;i++){edgePairs.push(top,ringPoints[i],bottom,ringPoints[i],ringPoints[i],ringPoints[(i+1)%4]);}
  const edgePos=[],edgeNorm=[],edgeColor=[];
  edgePairs.forEach(pair=>pair.forEach(p=>{edgePos.push(...p);edgeNorm.push(0,0,1);edgeColor.push(.7,.9,1,.8);}));
  const edges={position:makeBuffer(edgePos),normal:makeBuffer(edgeNorm),color:makeBuffer(edgeColor),count:edgePos.length/3};

  const streams = { position:gl.createBuffer(), normal:gl.createBuffer(), color:gl.createBuffer(), count:0 };
  const streamCount=16, samples=56;
  const phaseData=Array.from({length:streamCount},(_,i)=>i/(streamCount-1));
  function bezier(a,b,c,d,t){const q=1-t;return [q*q*q*a[0]+3*q*q*t*b[0]+3*q*t*t*c[0]+t*t*t*d[0],q*q*q*a[1]+3*q*q*t*b[1]+3*q*t*t*c[1]+t*t*t*d[1],q*q*q*a[2]+3*q*q*t*b[2]+3*q*t*t*c[2]+t*t*t*d[2]];}
  function updateStreams(time) {
    const pos=[],nor=[],col=[];
    for(let side=0;side<2;side++) for(let i=0;i<streamCount;i++) {
      const q=phaseData[i], spread=(q-.5)*2.2, drift=Math.sin(time*.42+i*.7)*.05;
      const start=side===0?[-5.9,spread,-.9]:[.72,spread*.18,-.78];
      const c1=side===0?[-3.2,spread*.92+drift,-.95]:[2.4,spread*.42+drift,-.82];
      const c2=side===0?[-1.45,spread*.38+drift,-.9]:[4.1,spread*1.18+drift,-.68];
      const end=side===0?[-.72,spread*.2,-.85]:[5.85,spread*1.9+Math.sin(time*.38+i*.9)*.12,-.65];
      const hue=side===0?i/streamCount:(i/streamCount*.72+.13);
      const rgb=side===0?[.43,.7,.98]:hue<.42?[.77,.58,1]:hue<.68?[.4,.86,.79]:[1,.57,.68];
      let prev=null;
      for(let s=0;s<samples;s++) {
        const t=s/(samples-1), p=bezier(start,c1,c2,end,t), p2=bezier(start,c1,c2,end,Math.min(1,t+.002));
        const dx=p2[0]-p[0],dy=p2[1]-p[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
        const width=.005 + .009*Math.sin(Math.PI*t);
        const alpha=(.15+.38*Math.sin(Math.PI*t))*(.68+.32*Math.sin(time*1.15+t*24+i));
        const l=[p[0]+nx*width,p[1]+ny*width,p[2]],r=[p[0]-nx*width,p[1]-ny*width,p[2]];
        if(prev){pos.push(...prev.l,...l,...prev.r,...prev.r,...l,...r);for(let k=0;k<6;k++){nor.push(0,0,1);col.push(rgb[0],rgb[1],rgb[2],alpha);}}
        prev={l,r};
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,streams.position);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,streams.normal);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(nor),gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,streams.color);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(col),gl.DYNAMIC_DRAW);
    streams.count=pos.length/3;
  }
  const particles={position:gl.createBuffer(),normal:gl.createBuffer(),color:gl.createBuffer(),count:0};
  function updateParticles(time) {
    const p=[],n=[],c=[];
    for(let side=0;side<2;side++) for(let i=0;i<streamCount;i+=2) {
      const q=phaseData[i],spread=(q-.5)*2.2;
      for(let k=0;k<2;k++){
        const t=(time*.095+k*.47+i*.073)%1;
        const a=side===0?[-5.9,spread,-.88]:[.72,spread*.18,-.76];
        const b=side===0?[-3.2,spread,-.95]:[2.4,spread*.4,-.82];
        const d=side===0?[-.72,spread*.2,-.85]:[5.85,spread*1.8,-.65];
        const c1=side===0?[-1.45,spread*.38,-.9]:[4.1,spread*1.18,-.68];
        const xyz=bezier(a,b,c1,d,t);p.push(...xyz);n.push(0,0,1);c.push(side===0?0:.8,1,1,1);
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,particles.position);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(p),gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,particles.normal);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(n),gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,particles.color);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(c),gl.DYNAMIC_DRAW);particles.count=p.length/3;
  }

  let width=1,height=1,yaw=-.22,pitch=.08,targetYaw=yaw,targetPitch=pitch,dragging=false,lastX=0,lastY=0,paused=false,scores={utility:.8,risk:.35,coverage:.8};
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;width=rect.width;height=rect.height;const dpr=Math.min(window.devicePixelRatio||1,2.25);canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));gl.viewport(0,0,canvas.width,canvas.height);}
  new ResizeObserver(resize).observe(canvas.parentElement);resize();
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;targetYaw+=(e.clientX-lastX)*.008;targetPitch=clamp(targetPitch+(e.clientY-lastY)*.006,-.55,.55);lastX=e.clientX;lastY=e.clientY;});
  const stopDrag=()=>{dragging=false;canvas.classList.remove('is-dragging');};canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);
  canvas.addEventListener('pointerleave',()=>{if(!dragging)canvas.classList.remove('is-hover');});canvas.addEventListener('pointerenter',()=>canvas.classList.add('is-hover'));
  document.querySelector('[data-prism-motion]')?.addEventListener('click',e=>{paused=!paused;e.currentTarget.setAttribute('aria-pressed',String(paused));e.currentTarget.innerHTML=paused?'▶ &nbsp; PLAY':'Ⅱ &nbsp; PAUSE';});
  window.updatePrismScores = data => { scores={utility:clamp(data.utility??scores.utility,0,1),risk:clamp(data.risk??scores.risk,0,1),coverage:clamp(data.coverage??scores.coverage,0,1)}; };
  function setUniforms(time,material,scale=1,opacity=1,model=0){gl.uniform1f(U.yaw,yaw);gl.uniform1f(U.pitch,pitch);gl.uniform1f(U.aspect,width/Math.max(1,height));gl.uniform1f(U.scale,scale);gl.uniform1i(U.model,model);gl.uniform1f(U.time,time);gl.uniform1f(U.opacity,opacity);gl.uniform1i(U.material,material);gl.uniform1f(U.utility,scores.utility);gl.uniform1f(U.risk,scores.risk);gl.uniform1f(U.coverage,scores.coverage);}
  function draw(geo,time,material,scale=1,opacity=1,model=0,mode=gl.TRIANGLES){bindGeometry(geo);setUniforms(time,material,scale,opacity,model);gl.drawArrays(mode,0,geo.count);}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  let lastDraw=0,lastFrame=0,simTime=0;
  function frame(now){requestAnimationFrame(frame);if(document.hidden){lastFrame=now;return;}const interval=matchMedia('(max-width: 700px)').matches?1000/30:1000/60;if(now-lastDraw<interval)return;lastDraw=now;if(lastFrame&&!paused&&!reduceMotion.matches)simTime+=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;const time=simTime;if(!paused&&!reduceMotion.matches&&!dragging){targetYaw+=.00037;targetPitch=Math.sin(time*.2)*.075;}yaw+=(targetYaw-yaw)*.045;pitch+=(targetPitch-pitch)*.045;
    updateStreams(time);updateParticles(time);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
    gl.depthMask(false);draw(streams,time,1,1,.84,0);draw(particles,time,2,1,1,2,gl.POINTS);
    draw(outer,time,0,1,.94,1);draw(inner,time,0,.245,.52,1);draw(edges,time,3,1,.96,1,gl.LINES);gl.depthMask(true);
  }
  requestAnimationFrame(frame);
})();
