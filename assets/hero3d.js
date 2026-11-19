/* =========================================================
   HERO 3D — реальна GLTF-модель авто на поворотному колі
   three.js r160 (ESM) + GLTFLoader + Draco + RoomEnvironment
   Якщо CDN недоступний — вмикається стилізований фолбек.
========================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/ferrari.glb';
const AO_URL    = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/ferrari_ao.png';
const DRACO_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/';

const canvas  = document.getElementById('stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile  = innerWidth < 820;

/* ---------- renderer / scene / camera ---------- */
const renderer = new THREE.WebGLRenderer({canvas, antialias:!mobile, alpha:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile?1.5:2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x08090d, 0.032);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);

/* кадрування: на широких екранах авто зміщене вправо, щоб не перекривати заголовок */
const BASE   = new THREE.Vector3(5.2, 1.65, 6.4);   // базова позиція камери
const TARGET = new THREE.Vector3(0, 0.62, 0);       // точка погляду
const RIGHT  = new THREE.Vector3(0.77, 0, -0.62);   // напрямок «вправо» на екрані
const shift  = new THREE.Vector3();
let dist = 1, tgtY = TARGET.y;

function frame(){
  const w = canvas.clientWidth || innerWidth;
  const narrow = w < 940;
  dist = w < 620 ? 2.15 : (narrow ? 1.6 : 1.28);
  shift.copy(RIGHT).multiplyScalar(narrow ? 0 : -2.7); // -2.7 → авто йде вправо
  // на вузьких екранах опускаємо точку погляду — авто піднімається над текстом
  tgtY = w < 620 ? -2.75 : (narrow ? -1.1 : TARGET.y);
}

function resize(){
  const w = canvas.clientWidth || innerWidth;
  const h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  frame();
}
resize();
addEventListener('resize', resize);

/* ---------- environment (для відображень на кузові) ---------- */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

/* ---------- lighting: холодний key + amber/teal rim ---------- */
scene.add(new THREE.AmbientLight(0x2a3550, 0.5));

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(5, 8, 4);
key.castShadow = !mobile;
key.shadow.mapSize.set(mobile?1024:2048, mobile?1024:2048);
key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
key.shadow.camera.left = -5; key.shadow.camera.right = 5;
key.shadow.camera.far = 24;
key.shadow.bias = -0.0006;
scene.add(key);

const amberRim = new THREE.PointLight(0xD4A24C, 90, 22, 2);
amberRim.position.set(-5.5, 2.4, -3.2);
scene.add(amberRim);

const tealRim = new THREE.PointLight(0xBFD2E6, 80, 22, 2);
tealRim.position.set(5.2, 2.0, -4.0);
scene.add(tealRim);

const fill = new THREE.PointLight(0x3a4a6a, 25, 20, 2);
fill.position.set(0, 3.4, 7);
scene.add(fill);

/* ---------- підлога + кільце подіуму ---------- */
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(34, 64),
  new THREE.MeshStandardMaterial({color:0x06070b, metalness:0.75, roughness:0.42, envMapIntensity:0.5})
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(3.05, 3.2, 96),
  new THREE.MeshBasicMaterial({color:0xD4A24C, transparent:true, opacity:0.32, side:THREE.DoubleSide, toneMapped:false})
);
ring.rotation.x = -Math.PI/2;
ring.position.y = 0.012;
scene.add(ring);

/* ---------- turntable ---------- */
const turntable = new THREE.Group();
scene.add(turntable);

/* ---------- матеріали авто ---------- */
const bodyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x1d222b, metalness: 0.9, roughness: 0.19,
  clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 2.0
});
/* диски й хром — під платину логотипа, з легкою золотою ноткою в тіні */
const detailsMaterial = new THREE.MeshStandardMaterial({
  color: 0xc7cedb, metalness: 1.0, roughness: 0.22, envMapIntensity: 1.6
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0a1017, metalness: 0.55, roughness: 0.04,
  transparent: true, opacity: 0.82, envMapIntensity: 2.2
});

const wheels = [];
let loaded = false;

/* =========================================================
   МАТЕРІАЛІЗАЦІЯ: голограма-каркас → готове авто
   Уздовж довгої осі авто рухається поріг uThr:
     все ПОЗАДУ порога — суцільний кузов,
     все ПОПЕРЕДУ — світний каркас,
     на самій межі — яскрава смуга «складання».
========================================================= */
const REVEAL = {
  thr:  { value: -1e9 },
  band: { value: 0.30 },
  edge: { value: new THREE.Color(0xF5D58E) },
  inv:  { value: new THREE.Matrix4() }
};
const HOLO_COLOR = 0xD4A24C;
let revealAxis = 'z', revealFrom = -3, revealTo = 3, revealT = 0, revealRun = false;
let carRoot = null, holoLines = [];

const CAR_POS_GLSL = `
varying vec3 vCarPos;
uniform mat4 uInv;
`;
const CAR_POS_ASSIGN = `
#include <begin_vertex>
vCarPos = ( uInv * modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`;

function patchSolid(mat){
  if(!mat || mat.userData.__reveal) return;
  mat.userData.__reveal = true;
  mat.onBeforeCompile = (sh)=>{
    sh.uniforms.uThr  = REVEAL.thr;
    sh.uniforms.uBand = REVEAL.band;
    sh.uniforms.uEdge = REVEAL.edge;
    sh.uniforms.uInv  = REVEAL.inv;
    sh.vertexShader = CAR_POS_GLSL + sh.vertexShader
      .replace('#include <begin_vertex>', CAR_POS_ASSIGN);
    sh.fragmentShader = CAR_POS_GLSL + 'uniform float uThr;\nuniform float uBand;\nuniform vec3 uEdge;\n' +
      sh.fragmentShader
        .replace('#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\n if ( vCarPos.'+revealAxis+' > uThr ) discard;')
        .replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\n float dEdge = uThr - vCarPos.'+revealAxis+';\n' +
          ' gl_FragColor.rgb += uEdge * ( 1.0 - smoothstep( 0.0, uBand, dEdge ) ) * 1.8;');
  };
  mat.needsUpdate = true;
}

function buildHolo(root){
  const holoMat = new THREE.LineBasicMaterial({
    color: HOLO_COLOR, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  });
  holoMat.onBeforeCompile = (sh)=>{
    sh.uniforms.uThr = REVEAL.thr;
    sh.uniforms.uInv = REVEAL.inv;
    sh.vertexShader = CAR_POS_GLSL + sh.vertexShader
      .replace('#include <begin_vertex>', CAR_POS_ASSIGN);
    sh.fragmentShader = CAR_POS_GLSL + 'uniform float uThr;\n' +
      sh.fragmentShader.replace('#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\n if ( vCarPos.'+revealAxis+' < uThr ) discard;');
  };

  // спершу збираємо меші, потім додаємо лінії — інакше traverse піде по щойно доданих
  const meshes = [];
  root.traverse(o=>{
    if(o.isMesh && o.geometry && !o.userData.__noHolo) meshes.push(o);
  });

  const out = [];
  meshes.forEach(o=>{
    // EdgesGeometry замість WireframeGeometry — структура читається, але вдесятеро легша
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 14), holoMat);
    lines.renderOrder = 3;
    o.add(lines);        // саме як дитина меша: успадковує його трансформ
    out.push(lines);     // масив, а не Group — Group забрав би лінії в меша
  });
  return out;
}

function setupReveal(root){
  carRoot = root;
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();

  // габарити в локальних координатах авто
  const box = new THREE.Box3();
  root.traverse(o=>{
    if(!o.isMesh || !o.geometry || o.userData.__noHolo) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone();
    b.applyMatrix4(inv.clone().multiply(o.matrixWorld));
    box.union(b);
  });
  const size = box.getSize(new THREE.Vector3());
  revealAxis = size.x >= size.z ? 'x' : 'z';
  const pad = REVEAL.band.value * 1.5;
  revealFrom = (revealAxis === 'x' ? box.min.x : box.min.z) - pad;
  revealTo   = (revealAxis === 'x' ? box.max.x : box.max.z) + pad;

  patchSolid(bodyMaterial);
  patchSolid(detailsMaterial);
  patchSolid(glassMaterial);
  root.traverse(o=>{ if(o.isMesh && o.material) patchSolid(o.material); });

  holoLines = buildHolo(root);
  REVEAL.thr.value = revealFrom;

  if(reduced){ finishReveal(); }
}

function finishReveal(){
  REVEAL.thr.value = revealTo;
  revealT = 1;
  // каркас відпрацював — прибираємо з рендера, щоб не витрачати draw calls
  holoLines.forEach(l=>{ l.visible = false; });
}

function updateReveal(dt){
  if(!carRoot) return;
  REVEAL.inv.value.copy(carRoot.matrixWorld).invert();
  if(revealT >= 1 || !revealRun) return;
  revealT = Math.min(revealT + dt/2.6, 1);
  if(revealT >= 1){ finishReveal(); return; }
  // easeInOutCubic — старт повільний, розгін, м'яке гальмування
  const e = revealT < 0.5 ? 4*revealT**3 : 1 - Math.pow(-2*revealT+2, 3)/2;
  REVEAL.thr.value = revealFrom + (revealTo - revealFrom) * e;
}

/* ---------- завантаження моделі ---------- */
const draco = new DRACOLoader();
draco.setDecoderPath(DRACO_URL);
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

loader.load(
  MODEL_URL,
  (gltf)=>{
    const car = gltf.scene.children[0] || gltf.scene;

    const pick = (n)=>car.getObjectByName(n);
    const set  = (n,m)=>{const o=pick(n); if(o&&o.material!==undefined)o.material=m;};

    set('body', bodyMaterial);
    ['rim_fl','rim_fr','rim_rr','rim_rl','trim'].forEach(n=>set(n, detailsMaterial));
    set('glass', glassMaterial);

    ['wheel_fl','wheel_fr','wheel_rl','wheel_rr'].forEach(n=>{
      const w = pick(n);
      if(w) wheels.push(w);
    });

    car.traverse(o=>{
      if(o.isMesh){o.castShadow = true; o.receiveShadow = false;}
    });

    // м'яка контактна тінь під авто (AO-текстура з моделі)
    new THREE.TextureLoader().load(AO_URL, (tex)=>{
      tex.colorSpace = THREE.SRGBColorSpace;
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.655*4, 1.3*4),
        new THREE.MeshBasicMaterial({map:tex, blending:THREE.MultiplyBlending, toneMapped:false, transparent:true})
      );
      shadow.rotation.x = -Math.PI/2;
      shadow.position.y = 0.008;
      shadow.renderOrder = 2;
      shadow.userData.__noHolo = true;   // контактна тінь не бере участі в матеріалізації
      car.add(shadow);
    }, undefined, ()=>{});

    turntable.add(car);
    setupReveal(car);
    loaded = true;
    document.documentElement.classList.add("car-ready");
  },
  undefined,
  ()=>{ buildFallbackCar(); loaded = true; document.documentElement.classList.add("car-ready"); }
);

/* ---------- фолбек: стилізоване авто з примітивів ---------- */
function buildFallbackCar(){
  const car = new THREE.Group();

  const s = new THREE.Shape();
  s.moveTo(-2.1,0.15); s.lineTo(2.1,0.15); s.lineTo(2.15,0.45);
  s.quadraticCurveTo(2.2,0.62,1.9,0.66);
  s.quadraticCurveTo(1.2,0.72,0.75,0.78);
  s.quadraticCurveTo(0.35,1.12,-0.35,1.16);
  s.quadraticCurveTo(-1.0,1.14,-1.35,0.8);
  s.quadraticCurveTo(-1.8,0.72,-2.05,0.66);
  s.lineTo(-2.15,0.42); s.lineTo(-2.1,0.15);

  const bodyGeo = new THREE.ExtrudeGeometry(s,{depth:1.9,bevelEnabled:true,bevelThickness:0.12,bevelSize:0.12,bevelSegments:4,steps:1});
  bodyGeo.translate(0,0,-0.95);
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, bodyMaterial);
  body.castShadow = true; body.position.y = 0.02;
  car.add(body);

  const gs = new THREE.Shape();
  gs.moveTo(0.7,0.78);
  gs.quadraticCurveTo(0.35,1.08,-0.32,1.12);
  gs.quadraticCurveTo(-0.9,1.1,-1.2,0.82);
  gs.lineTo(0.7,0.78);
  const glassGeo = new THREE.ExtrudeGeometry(gs,{depth:1.66,bevelEnabled:false});
  glassGeo.translate(0,0,-0.83);
  const glass = new THREE.Mesh(glassGeo, glassMaterial);
  glass.position.y = 0.03;
  car.add(glass);

  const tireMat = new THREE.MeshStandardMaterial({color:0x090a0d, metalness:0.15, roughness:0.85});
  const wheelGeo = new THREE.CylinderGeometry(0.52,0.52,0.34,32);
  const rimGeo = new THREE.CylinderGeometry(0.31,0.31,0.36,24);
  [[1.3,0.9],[1.3,-0.9],[-1.3,0.9],[-1.3,-0.9]].forEach(([x,z])=>{
    const grp = new THREE.Group();
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.z = Math.PI/2; w.castShadow = true; grp.add(w);
    const r = new THREE.Mesh(rimGeo, detailsMaterial);
    r.rotation.z = Math.PI/2; grp.add(r);
    grp.position.set(x, 0.52, z);
    car.add(grp);
    wheels.push(grp);
  });

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.08,0.16,1.5),
    new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xbfe9ff, emissiveIntensity:2.4})
  );
  head.position.set(2.16,0.62,0); car.add(head);

  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.06,0.12,1.55),
    new THREE.MeshStandardMaterial({color:0xD4A24C, emissive:0xD4A24C, emissiveIntensity:2.6})
  );
  tail.position.set(-2.18,0.6,0); car.add(tail);

  turntable.add(car);
  setupReveal(car);
}

/* ---------- пил у повітрі ---------- */
const pCount = reduced ? 0 : (mobile ? 120 : 240);
let points = null;
if(pCount){
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount*3);
  for(let i=0;i<pCount;i++){
    pos[i*3]   = (Math.random()-0.5)*24;
    pos[i*3+1] = Math.random()*8;
    pos[i*3+2] = (Math.random()-0.5)*24;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color:0xD4A24C, size:0.045, transparent:true, opacity:0.55,
    blending:THREE.AdditiveBlending, depthWrite:false
  }));
  scene.add(points);
}

/* ---------- керування: параллакс + drag ---------- */
let tX=0, tY=0, cx=0, cy=0;
let spin = -0.6, spinVel = 0, dragging = false, lastX = 0, autoPaused = 0;

addEventListener('mousemove',(e)=>{
  tX = e.clientX/innerWidth - 0.5;
  tY = e.clientY/innerHeight - 0.5;
});

const startDrag = (x)=>{dragging = true; lastX = x; canvas.style.cursor='grabbing';};
const moveDrag  = (x)=>{
  if(!dragging) return;
  const dx = (x - lastX)/innerWidth;
  spinVel = dx*4.2;
  spin += spinVel;
  lastX = x;
  autoPaused = 1.4;
};
const endDrag = ()=>{dragging = false; canvas.style.cursor='grab';};

canvas.style.cursor = 'grab';
canvas.addEventListener('pointerdown',(e)=>{startDrag(e.clientX); canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',(e)=>moveDrag(e.clientX));
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', endDrag);

/* ---------- рендер-цикл (пауза, коли hero поза екраном) ---------- */
let visible = true;
new IntersectionObserver((es)=>{visible = es[0].isIntersecting;},{threshold:0.01})
  .observe(document.getElementById('top'));

const clock = new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  if(!visible || document.hidden) return;

  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  // складання авто стартує, щойно інтро прибрано
  if(!revealRun && carRoot && !document.body.classList.contains('locked')){
    revealRun = true;
  }
  updateReveal(dt);

  if(reduced){
    turntable.rotation.y = -0.6;
  }else{
    autoPaused = Math.max(0, autoPaused - dt);
    if(!dragging){
      spinVel *= 0.92;
      spin += spinVel;
      // поки авто складається — тримаємо ракурс, щоб ефект було видно
      if(autoPaused === 0 && revealT >= 1) spin += dt*0.22;
    }
    turntable.rotation.y = spin;

    wheels.forEach(w=>{ w.rotation.x -= dt*1.6; });

    // рим-світло повільно «обходить» кузов — дає живі відблиски
    amberRim.position.set(Math.cos(t*0.22)*6.0, 2.4, Math.sin(t*0.22)*6.0);
    tealRim.position.set(Math.cos(t*0.22+Math.PI)*6.0, 2.0, Math.sin(t*0.22+Math.PI)*6.0);

    if(points){
      const arr = points.geometry.attributes.position.array;
      for(let i=0;i<pCount;i++){
        arr[i*3+1] += dt*0.25;
        if(arr[i*3+1] > 8) arr[i*3+1] = 0;
      }
      points.geometry.attributes.position.needsUpdate = true;
      points.rotation.y = t*0.02;
    }
  }

  cx += (tX-cx)*0.05;
  cy += (tY-cy)*0.05;
  camera.position.set(
    BASE.x*dist + shift.x + cx*1.3,
    BASE.y*dist + shift.y - cy*0.8,
    BASE.z*dist + shift.z
  );
  camera.lookAt(TARGET.x + shift.x, tgtY, TARGET.z + shift.z);

  renderer.render(scene, camera);
}
loop();
