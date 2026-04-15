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

const mainChamber = createBoxObstacle(20, 15, 20, 0, 0);        

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

// extend corridor

function createCorridor(width, height, depth, x, z, rotationY) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshBasicMaterial({ color: 0x8b2222, wireframe: true }));
  // Place the piece centrally at (x, z)
  mesh.position.set(x, height / 2, z);
  mesh.rotation.y = rotationY;
  
  // Math explained for Start (p1) and End (p2) points:
  // To find the exact ends of the corridor piece, we use simple Right Triangle Math (SOH CAH TOA).
  // The distance from the center to either end is exactly half the corridor's length (width / 2).
  // Multiplying this distance by Cosine of the rotation angle gives us the X-axis offset.
  // Multiplying by Sine of the rotation angle gives us the Z-axis offset.
  const dx = (width / 2) * Math.cos(rotationY);
  const dz = (width / 2) * Math.sin(rotationY);

  mesh.userData.rotationY = rotationY;
  
  // p1 represents the "Start" point. We subtract the horizontal offsets.
  // In Three.js, due to the coordinate system, we add `dz` to get the opposite Z direction.
  mesh.userData.p1 = new THREE.Vector3(x - dx, height / 2, z + dz); 
  
  // p2 represents the "End" point. We add the horizontal offsets directly.
  mesh.userData.p2 = new THREE.Vector3(x + dx, height / 2, z - dz); 

  scene.add(mesh);
  obstacles.push(mesh);
  return mesh; 
}

const extendedCorridors = []; 

// Base initial corridors placed in the 3D world.
// We fixed their angles (0, 225, 135 degrees) so that their defined "Start" (p1) 
// and "End" (p2) points line up naturally with the visual direction of each corridor.
const initialCorridors = {
  "Tunnel 1": createCorridor(40, 6, 6, 25, 0, getRadians(0)),
  "Tunnel 2": createCorridor(40, 6, 6, -15, 15, getRadians(225)),
  "Tunnel 3": createCorridor(40, 6, 6, -15, -15, getRadians(135))
};

document.getElementById('btn-height').placeholder = "Enter Length";
document.getElementById('btn-angle').placeholder = "Enter Angle";

let corridorCount = 3; // Keep track of total corridors to avoid ID collisions

function updateDropdown(name) {
  const dropdown = document.getElementById('btn-x');
  const option = document.createElement("option");
  option.text = name;
  option.value = name;
  dropdown.add(option);
}

function performCorridorExtension() {
  const len = parseFloat(document.getElementById('btn-height').value) || 20;
  const angDeg = parseFloat(document.getElementById('btn-angle').value) || 0;
  const choice = document.getElementById('btn-x').value; 
  const side = document.getElementById('btn-point').value;

  // Find target from initial or extended list
  const target = initialCorridors[choice] || extendedCorridors.find(c => c.userData.name === choice);
  if (!target) return;

  // 1. Determine Rotation
  // We add the user-defined angle relative to the previous corridor's base angle
  const baseRotation = target.userData.rotationY;
  const extensionAngle = THREE.MathUtils.degToRad(-angDeg);
  const finalRotation = baseRotation + extensionAngle;

  // 2. Identify the connection point
  // Connect to either the start (p1) or end (p2) of the selected corridor
  const connectionPoint = (side === 'start') ? target.userData.p1 : target.userData.p2;

  // 3. Use the Helper to find the new center
  // This cleverly handles local-to-world transformations without complex matrix math
  const helper = new THREE.Object3D();         
  helper.position.copy(connectionPoint);            
  helper.rotation.y = finalRotation; 

  /* If we attach to the 'end' (p2), we move forward by half-length.
     If we attach to the 'start' (p1), we move backward by half-length 
     to ensure the segment grows AWAY from the previous one.
  */
  const directionFactor = (side === 'start') ? -1 : 1;
  helper.translateX(directionFactor * (len / 2));

  // 4. Create the new segment
  const newSegment = createCorridor(len, 6, 6, helper.position.x, helper.position.z, finalRotation);
  
  // Assign ID and update UI seamlessly using global counter
  corridorCount++;
  newSegment.userData.name = `Tunnel ${corridorCount}`;
  
  updateDropdown(newSegment.userData.name);
  extendedCorridors.push(newSegment); 

  // Collision detection against main excavation chamber
  const newSegmentBox = new THREE.Box3().setFromObject(newSegment);
  const mainChamberBox = new THREE.Box3().setFromObject(mainChamber);
  const warningDiv = document.getElementById('warning-text');

  if (newSegmentBox.intersectsBox(mainChamberBox)) {
      newSegment.material.color.setHex(0xff0000); // Turn it red to indicate danger
      warningDiv.textContent = 'WARNING!';
  } else {
      warningDiv.textContent = '';
  }
}

document.getElementById('btn-update').onclick = performCorridorExtension;   

document.getElementById('btn-undo-corridor').onclick = () => {
    if (extendedCorridors.length > 0) {
        const last = extendedCorridors.pop();
        scene.remove(last);

        const dropdown = document.getElementById('btn-x');
        for (let i = 0; i < dropdown.options.length; i++) {
            if (dropdown.options[i].value === last.userData.name || dropdown.options[i].text === last.userData.name) {
                dropdown.remove(i);
                break;
            }
        }
        
        // Also remove from obstacles array to prevent phantom collisions
        const index = obstacles.indexOf(last);
        if (index > -1) {
            obstacles.splice(index, 1);
        }

        corridorCount--;

        // Clear any warnings when undoing a segment
        document.getElementById('warning-text').textContent = '';
    }
};

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