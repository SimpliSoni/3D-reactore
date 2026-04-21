import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Setup CSS2DRenderer for 3D Labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none'; // Don't block interactions!
document.body.appendChild(labelRenderer.domElement);

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

/* 
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
*/

document.getElementById('btn-confirm').addEventListener('click', () => {
  pointA = null; 
  scene.remove(startSphere);
  scene.remove(activeTubeMesh);
  document.getElementById('stat-status').textContent = 'Path Locked';
  document.getElementById('warning-text').textContent = '';
});

document.getElementById('btn-undo-corridor').addEventListener('click', () => {
    // 1. Re-implement Undo Functionality
    // This allows the user to remove the most recently added corridor segment.
    if (extendedCorridors.length > 0) {
        const last = extendedCorridors.pop();
        
        scene.remove(last);
        
        const obsIndex = obstacles.indexOf(last);
        if (obsIndex > -1) obstacles.splice(obsIndex, 1);
        
        corridorCount--;
        
        const dropdown = document.getElementById('btn-x');
        for (let i = 0; i < dropdown.options.length; i++) {
            if (dropdown.options[i].value === last.userData.name) {
                dropdown.remove(i);
                break;
            }
        }
        
        last.geometry.dispose();
        last.material.dispose();
        
        if (last.userData.jointMesh) {
            scene.remove(last.userData.jointMesh);
            last.userData.jointMesh.geometry.dispose();
            last.userData.jointMesh.material.dispose();
        }
        
        if (last.userData.labelObject) {
            last.remove(last.userData.labelObject);
        }
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
  mesh.position.set(x,height /2, z);
  mesh.rotation.y = rotationY;
  
  mesh.userData.rotationY = rotationY;
  mesh.userData.length = width; // Store length for statistics display
  mesh.userData.isCorridor = true; // Flag for raycasting 

  const helper = new THREE.Object3D();
  helper.position.copy(mesh.position);
  helper.rotation.y = rotationY;

  helper.translateX(-width / 2);
  mesh.userData.p1 = helper.position.clone();

  helper.position.copy(mesh.position);
  helper.translateX(width / 2);
  mesh.userData.p2 = helper.position.clone();

  scene.add(mesh);
  obstacles.push(mesh);
  return mesh; 
}

const extendedCorridors = []; 

// 2. 3D Labels & Point-and-Click Selection
// Helper function to attach a dynamic CSS2D label to a corridor
function attachLabel(corridorMesh, name) {
  corridorMesh.userData.name = name; // Ensure data is in user payload
  
  // Create HTML div element for the label
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = name;
  div.style.color = '#ffffff';
  div.style.background = 'rgba(0, 0, 0, 0.6)';
  div.style.padding = '2px 6px';
  div.style.borderRadius = '3px';
  div.style.pointerEvents = 'auto'; // Make it clickable
  div.style.cursor = 'pointer';
  div.style.userSelect = 'none';
  
  // Attach click listener directly to the HTML label!
  div.addEventListener('pointerdown', () => selectCorridor(corridorMesh));

  // Initialize and position the CSS2DObject
  const labelObj = new CSS2DObject(div);
  labelObj.position.set(0, 4, 0); // Position slightly above the corridor center
  
  // Link them strictly so we can clean it up later if needed
  corridorMesh.userData.labelObject = labelObj;
  corridorMesh.add(labelObj); // Add to the mesh so it follows the corridor's position natively
}

// Universal method for clicking / selecting a single corridor (3. Point-and-Click Selection & 4. Display Corridor Length)
function selectCorridor(corridorMesh) {
  if (!corridorMesh) return;
  const name = corridorMesh.userData.name;
  
  // Target the HTML dropdown to select that specific corridor
  const dropdown = document.getElementById('btn-x');
  for (let i = 0; i < dropdown.options.length; i++) {
    if (dropdown.options[i].value === name) {
      dropdown.selectedIndex = i;
      break;
    }
  }

  // 4. Display Corridor Length on Click
  // Show real-time statistics for the active corridor. Extract its length from its geometry parameters
  document.getElementById('stat-length').textContent = corridorMesh.userData.length.toFixed(1) + ' m';
  
  // Explicitly comment out the volume display logic as requested
  // document.getElementById('stat-volume').textContent = (corridorMesh.userData.length * 6 * 6).toFixed(1) + ' m³';
}

const initialCorridors = {
  "Tunnel 1": createCorridor(40, 6, 6, 25, 0, getRadians(0)),
  "Tunnel 2": createCorridor(40, 6, 6, -15, 15, getRadians(225)),
  "Tunnel 3": createCorridor(40, 6, 6, -15, -15, getRadians(135))
};

// Auto-attach labels to initial setup
Object.keys(initialCorridors).forEach(key => attachLabel(initialCorridors[key], key));


document.getElementById('btn-height').placeholder = "Enter Length";
document.getElementById('btn-angle').placeholder = "Enter Angle";

let corridorCount = 3; 

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

  const target = initialCorridors[choice] || extendedCorridors.find(c => c.userData.name === choice);
  if (!target) return;

  const baseRotation = target.userData.rotationY;
  const extensionAngle = THREE.MathUtils.degToRad(-angDeg);
  const finalRotation = baseRotation + extensionAngle;

  const connectionPoint = (side === 'start') ? target.userData.p1 : target.userData.p2;


  const helper = new THREE.Object3D();         
  helper.position.copy(connectionPoint);            
  helper.rotation.y = finalRotation; 

  if (side === 'start') {
      helper.translateX(-len / 2);
  } else {
      helper.translateX(len / 2);
  }

  const newSegment = createCorridor(len, 6, 6, helper.position.x, helper.position.z, finalRotation);
  
  corridorCount++;
  const newName = `Tunnel ${corridorCount}`;
  
  // Attach the interactive 3D label
  attachLabel(newSegment, newName);
  
  updateDropdown(newName);
  extendedCorridors.push(newSegment); 

  // 6. Resolve Joint Overlaps & Enable Multi-Branching
  // Visuals (Easiest Fix): Place a simple, appropriately sized cylinder at the exact pivot point
  const jointGeom = new THREE.CylinderGeometry(3, 3, 6, 16);
  const jointMesh = new THREE.Mesh(jointGeom, new THREE.MeshBasicMaterial({ color: 0x8b2222 }));
  jointMesh.position.copy(connectionPoint);
  jointMesh.position.y = 3; // Center the height properly
  scene.add(jointMesh);
  
  // Store reference to joint so we can undo it
  newSegment.userData.jointMesh = jointMesh;
  
  const newSegmentBox = new THREE.Box3().setFromObject(newSegment);
  const mainChamberBox = new THREE.Box3().setFromObject(mainChamber);
  const warningDiv = document.getElementById('warning-text');

  let hasCollision = false;
  // Save the connection point inside the mesh so we know what its "origin joint" is in space
  newSegment.userData.connectionPointHash = `${connectionPoint.x},${connectionPoint.z}`;

  for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      // 6. Collisions: Intentionally ignore collisions with its direct "parent" (target)
      if (obs === newSegment || obs === target || obs === mainChamber) continue;
      
      // 6. Collisions: Ignore any "sibling" tunnels that also share that exact same connection point
      // We check if the obstacle has the same exact pivot origin point hash
      if (obs.userData && obs.userData.connectionPointHash === newSegment.userData.connectionPointHash) {
          continue; // Allow multi-branching from the same origin point!
      }
      
      const obsBox = new THREE.Box3().setFromObject(obs);
      if (newSegmentBox.intersectsBox(obsBox)) {
          hasCollision = true;
          break;
      }
  }

  if (hasCollision) {
      warningDiv.textContent = 'Blocked by another obstacle!';
      
      let obs = obstacles.indexOf(newSegment);
      if (obs > -1) obstacles.splice(obs, 1);

      scene.remove(newSegment);
      // Clean up the joint mesh when undoing automatically due to collision
      scene.remove(newSegment.userData.jointMesh);
      newSegment.userData.jointMesh.geometry.dispose();
      newSegment.userData.jointMesh.material.dispose();
      
      extendedCorridors.pop();
      corridorCount--;
      
      const dropdown = document.getElementById('btn-x');
      for (let i = 0; i < dropdown.options.length; i++) {
          if (dropdown.options[i].value === newName) {
              dropdown.remove(i);
              break;
          }
      }

      newSegment.geometry.dispose();
      newSegment.material.dispose(); 
      // Clean up the label
      if (newSegment.userData.labelObject) {
         newSegment.remove(newSegment.userData.labelObject);
      }
  // } else if (newSegmentBox.intersectsBox(mainChamberBox)) {
  //     newSegment.material.color.setHex(0xff0000); 
  //     warningDiv.textContent = 'Warning: Extended into main chamber!';
  } else {
      warningDiv.textContent = '';
  }
}

document.getElementById('btn-update').onclick = performCorridorExtension;   

// --- 5. Interactive Measurement Tool ---
let measurementMode = false;
let measureMarkers = [];
let measureLine = null;
const measurementStatusDiv = document.getElementById('stat-status');
const measurementLengthDiv = document.getElementById('stat-length');

document.getElementById('btn-measure').addEventListener('click', () => {
    measurementMode = !measurementMode;
    const btn = document.getElementById('btn-measure');
    
    if (measurementMode) {
        btn.textContent = 'Cancel Measuring';
        btn.style.backgroundColor = '#aa4444';
        measurementStatusDiv.textContent = 'Measurer: Click 1st point';
    } else {
        btn.textContent = 'Measure Distance';
        btn.style.backgroundColor = '';
        measurementStatusDiv.textContent = 'Idle';
        clearMeasurement();
    }
});

function clearMeasurement() {
    measureMarkers.forEach(m => scene.remove(m));
    measureMarkers = [];
    if (measureLine) {
        scene.remove(measureLine);
        measureLine.geometry.dispose();
        measureLine.material.dispose();
        measureLine = null;
    }
}

// Global click handler for Raycasting (used for both measurement tool and corridor selection)
window.addEventListener('mousedown', (event) => {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);

    if (measurementMode) {
        // Measurement Tool Logic
        const intersects = raycaster.intersectObjects([baseMesh, ...extendedCorridors, ...Object.values(initialCorridors)]);
        if (intersects.length > 0) {
            const hitPoint = intersects[0].point;
            
            // Create a small spherical marker
            const markerGeom = new THREE.SphereGeometry(1, 16, 16);
            const markerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const marker = new THREE.Mesh(markerGeom, markerMat);
            marker.position.copy(hitPoint);
            scene.add(marker);
            measureMarkers.push(marker);

            if (measureMarkers.length === 1) {
                measurementStatusDiv.textContent = 'Measurer: Click 2nd point';
            } else if (measureMarkers.length === 2) {
                // Draw a line connecting the two markers
                const p1 = measureMarkers[0].position;
                const p2 = measureMarkers[1].position;
                
                const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3 });
                measureLine = new THREE.Line(lineGeom, lineMat);
                scene.add(measureLine);
                
                // Calculate distance and display in UI
                const distance = p1.distanceTo(p2);
                measurementLengthDiv.textContent = distance.toFixed(2) + ' m';
                measurementStatusDiv.textContent = 'Measurement Complete';
                
                // Automatically exit measurement mode
                measurementMode = false;
                const btn = document.getElementById('btn-measure');
                btn.textContent = 'Measure Distance';
                btn.style.backgroundColor = '';
                
                // Optional: clear markers after a delay so they can see it, 
                // but let's leave it until they click measure again for now.
            }
        }
    } else {
        // 3. Point-and-Click Selection logic
        // If not in measurement mode, see if we clicked a corridor
        const corridorMeshes = [...extendedCorridors, ...Object.values(initialCorridors)];
        const intersects = raycaster.intersectObjects(corridorMeshes, false);
        
        if (intersects.length > 0) {
            // Find the closest intersected corridor
            const hitCorridor = intersects[0].object;
            if (hitCorridor.userData.isCorridor) {
                selectCorridor(hitCorridor);
            }
        }
    }
});

// document.getElementById('btn-zoom-in').onclick = () => {
//     camera.position.multiplyScalar(0.9);
//     controls.update();
// };

// document.getElementById('btn-zoom-out').onclick = () => {
//     camera.position.multiplyScalar(1.1);
//     controls.update();
// };

function animate() {
  requestAnimationFrame(animate);
  controls.update(); 
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});