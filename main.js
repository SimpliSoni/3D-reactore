import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(40, 50, 60); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;

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

function createBoxObstacle(width, height, depth, x, z) {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const cube = new THREE.MeshBasicMaterial({ color: 0x8b2222 , opacity: 0.5, transparent: true });
  const mesh = new THREE.Mesh(geom, cube);
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

createBoxObstacle(20, 15, 20, 0, 0);

function createCorridor(width, height, depth, x, z, rotationY) {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0x8b2222, wireframe: true }));
  mesh.position.set(x, height / 2, z);
  mesh.rotation.y = rotationY;
  scene.add(mesh);
  obstacles.push(mesh);
}

// createCorridor(40, 6, 6, 25, 0, getRadians(0));               
// createCorridor(40, 6, 6, -15, 15, getRadians(45));            
// createCorridor(40, 6, 6, -15, -15, getRadians(-45));          

for (let x = -25; x <= 25; x += 25) {
  for (let z = -25; z <= 25; z += 25) {
    if (x === 0 && z === 0) continue;
    createPillar(x, z);
  }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointA = null;
const confirmedTunnels = []; 
let tunnelsVisible = true; 

const startSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
const endSphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0x3344ff }));
const safeMat = new THREE.MeshBasicMaterial({ color: 0x00ff22, transparent: true, opacity: 0.6 });
const dangerMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });

let activeTubeMesh = null;
const activeBox3 = new THREE.Box3(); 

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(intersectables);
  if (intersects.length > 0) {
    const targetPoint = intersects[0].point;
    endSphere.position.copy(targetPoint);
    endSphere.position.y = 1; 
    scene.add(endSphere);
    if (pointA !== null) updateTunnelPreview(pointA, targetPoint);
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
      if (activeTubeMesh) {
        const segment = activeTubeMesh.clone();
        segment.material = new THREE.MeshBasicMaterial({ color: 0x44aa66 });
        scene.add(segment);
        confirmedTunnels.push(segment);
      }
      pointA = clickedPoint.clone();
      startSphere.position.copy(pointA);
      startSphere.position.y = 1;
    }
  }
});

document.getElementById('btn-confirm').addEventListener('click', () => {
  pointA = null; 
  scene.remove(startSphere);
  scene.remove(activeTubeMesh);
  document.getElementById('stat-status').textContent = 'Path Locked';
  document.getElementById('warning-text').textContent = '';
});

document.getElementById('btn-undo').addEventListener('click', () => {
  if (confirmedTunnels.length > 0) {
    const last = confirmedTunnels.pop();
    scene.remove(last);
    last.geometry.dispose();
    last.material.dispose();
  }
});

document.getElementById('btn-toggle').addEventListener('click', () => {
  tunnelsVisible = !tunnelsVisible;
  confirmedTunnels.forEach(t => t.visible = tunnelsVisible);
});

document.getElementById('btn-reset').addEventListener('click', () => {
    camera.position.set(40, 50, 60);
    controls.target.set(0, 0, 0);
    controls.update();
});

document.getElementById('btn-top').addEventListener('click', () => {
    camera.position.set(0, 80, 0);
    controls.target.set(0, 0, 0);
    controls.update();
});

document.getElementById('btn-side').addEventListener('click', () => {
    camera.position.set(80, 10, 0);
    controls.target.set(0, 0, 0);
    controls.update();
});

function updateTunnelPreview(startPoint, endPoint) {
  if (activeTubeMesh) {
    scene.remove(activeTubeMesh);
    activeTubeMesh.geometry.dispose(); 
  }
  const distance = startPoint.distanceTo(endPoint);
  if (distance < 0.1) return;
  
  const tunnelGeom = new THREE.CylinderGeometry(1.5, 1.5, distance, 12);
  tunnelGeom.translate(0, distance / 2, 0); 
  activeTubeMesh = new THREE.Mesh(tunnelGeom, safeMat);
  activeTubeMesh.position.copy(startPoint);
  activeTubeMesh.position.y = 1;
  const lookTarget = endPoint.clone();
  lookTarget.y = 1; 
  activeTubeMesh.lookAt(lookTarget);
  activeTubeMesh.rotateX(Math.PI / 2); 
  activeTubeMesh.updateMatrixWorld(true);
  activeBox3.setFromObject(activeTubeMesh);
  let collision = false;
  for (let i = 0; i < obstacles.length; i++) {
    const obstacleBox = new THREE.Box3().setFromObject(obstacles[i]);
    if (activeBox3.intersectsBox(obstacleBox)) {
      collision = true;
      break; 
    }
  }
  const warningDiv = document.getElementById('warning-text');
  if (collision) {
    activeTubeMesh.material = dangerMat;
    warningDiv.textContent = 'COLLISION';
  } else if (distance > 40) {
    activeTubeMesh.material = dangerMat;
    warningDiv.textContent = 'SAFETY: Segment too long';
  } else {
    activeTubeMesh.material = safeMat;
    warningDiv.textContent = '';
  }
  scene.add(activeTubeMesh);
  document.getElementById('stat-length').textContent = distance.toFixed(1) + ' m';
  document.getElementById('stat-volume').textContent = (distance * 12).toFixed(1) + ' m³';
}

// extend corridor to new position and angle based on user input using x, y, z, and angle from textareas and update the corridor accordingly on button click, but it should extend from the last positon of old corridors to new position and angle

function updateCorridor() {
  const x = parseFloat(document.getElementById('btn-x').value);
  const z = parseFloat(document.getElementById('btn-z').value);
  const angle = parseFloat(document.getElementById('btn-angle').value);
  createCorridor(40, 6, 6, x, z, getRadians(angle));
}

document.getElementById('btn-update').addEventListener('click', updateCorridor);

// old corridors

createCorridor(40, 6, 6, 25, 0, getRadians(0));               
createCorridor(40, 6, 6, -15, 15, getRadians(45));            
createCorridor(40, 6, 6, -15, -15, getRadians(-45));

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