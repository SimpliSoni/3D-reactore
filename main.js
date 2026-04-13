import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a24); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(40, 50, 60); 

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.0)); 
const gridHelper = new THREE.GridHelper(100, 20, 0x444455, 0x222233);
scene.add(gridHelper);

const baseGeom = new THREE.PlaneGeometry(60, 60);
const baseMat = new THREE.MeshBasicMaterial({ color: 0x111115, side: THREE.DoubleSide });
const baseMesh = new THREE.Mesh(baseGeom, baseMat);

function getRadians(degrees) {
  return degrees * (Math.PI / 180);
}

baseMesh.rotation.x = getRadians(-90); 
baseMesh.position.y = -0.1; 
scene.add(baseMesh);

const intersectables = [baseMesh];
const obstacles = [];
const redMat = new THREE.MeshBasicMaterial({ color: 0x8b2222 });

function createBoxObstacle(width, height, depth, x, z, label) {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geom, redMat);
  mesh.position.set(x, height / 2, z); 
  scene.add(mesh);
  obstacles.push(mesh);
  return mesh;
}

function createPillar(x, z) {
  const pillarGeom = new THREE.CylinderGeometry(1.5, 1.5, 15, 16);
  const pillar = new THREE.Mesh(pillarGeom, redMat);
  pillar.position.set(x, 7.5, z); 
  scene.add(pillar);
  obstacles.push(pillar);
}

createBoxObstacle(20, 15, 20, 0, 0, "Main Chamber");

function createCorridor(width, height, depth, x, z, rotationY) {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ 
    color: 0x8b2222, 
    wireframe: true 
  }));
  mesh.position.set(x, height / 2, z);
  mesh.rotation.y = rotationY;
  scene.add(mesh);
  obstacles.push(mesh);
}

createCorridor(40, 6, 6, 25, 0, getRadians(0));               
createCorridor(40, 6, 6, -15, 15, getRadians(45));            
createCorridor(40, 6, 6, -15, -15, getRadians(-45));          

for (let x = -25; x <= 25; x += 25) {
  for (let z = -25; z <= 25; z += 25) {
    if (x === 0 && z === 0) continue; // avoid center
    createPillar(x, z);
  }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let pointA = null;
let pointB = null;

const startSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
const endSphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0x3344ff }));

const safeMat = new THREE.MeshBasicMaterial({ color: 0x00ff22, transparent: true, opacity: 0.6 });
const dangerMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });

let activeTubeMesh = null;
const activeBox3 = new THREE.Box3(); 

// interaction
window.addEventListener('mousemove', (event) => {
  const screenX = event.clientX;
  const screenY = event.clientY;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  mouse.x = (screenX / screenWidth) * 2 - 1;
  mouse.y = -(screenY / screenHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(intersectables);
  
  if (intersects.length > 0) {
    const targetPoint = intersects[0].point;
    endSphere.position.copy(targetPoint);
    endSphere.position.y = 1; 
    scene.add(endSphere);
    
    if (pointA !== null) {
      updateTunnelPreview(pointA, targetPoint);
    }
  }
});

window.addEventListener('mousedown', () => {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(intersectables);
  
  if (intersects.length > 0) {
    const clickedPoint = intersects[0].point;
    
    if (pointA === null) {
      pointA = clickedPoint.clone();
      startSphere.position.copy(pointA);
      startSphere.position.y = 1;
      scene.add(startSphere);
      document.getElementById('stat-status').textContent = 'Drawing...';
    } else {
      document.getElementById('stat-status').textContent = 'Path Locked';
      pointA = null; 
      scene.remove(startSphere);
      scene.remove(endSphere);
    }
  }
});

// core logic
function updateTunnelPreview(startPoint, endPoint) {
  if (activeTubeMesh) {
    scene.remove(activeTubeMesh);
    activeTubeMesh.geometry.dispose(); 
  }

  const distance = startPoint.distanceTo(endPoint);
  if (distance < 0.1) return;

  const tunnelGeom = new THREE.CylinderGeometry(1.5, 1.5, distance, 12);
  const halfLength = distance / 2;
  tunnelGeom.translate(0, halfLength, 0); 
  
  activeTubeMesh = new THREE.Mesh(tunnelGeom, safeMat);
  activeTubeMesh.position.copy(startPoint);
  activeTubeMesh.position.y = 1;

  const lookTarget = endPoint.clone();
  lookTarget.y = 1; 
  activeTubeMesh.lookAt(lookTarget);
  activeTubeMesh.rotateX(getRadians(90)); 

  activeTubeMesh.updateMatrixWorld(true);
  activeBox3.setFromObject(activeTubeMesh);

  let collision = false;
  // collision
  for (let i = 0; i < obstacles.length; i++) {
    const obstacleBox = new THREE.Box3().setFromObject(obstacles[i]);
    if (activeBox3.intersectsBox(obstacleBox)) {
      collision = true;
      break; 
    }
  }

  activeTubeMesh.material = collision ? dangerMat : safeMat;
  scene.add(activeTubeMesh);

  document.getElementById('stat-length').textContent = distance.toFixed(1) + ' m';
  document.getElementById('stat-volume').textContent = (distance * 12).toFixed(1) + ' m³';
}

function animate() {
  requestAnimationFrame(animate);
  controls.update(); 
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
;