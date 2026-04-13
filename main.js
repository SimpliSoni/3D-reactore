import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * ============================================================================
 * 1. SCENE SETUP (The Basic World)
 * ============================================================================
 * Beginner Tip: Think of Three.js like a Theatre.
 * - The SCENE is the Stage.
 * - The CAMERA is the Audience's eyes.
 * - THE RENDERER is the Film Projector that draws the stage onto your screen.
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a24); // Dark engineering background

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(40, 50, 60); 

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// Why appendChild? The renderer draws our 3D world onto an HTML <canvas> element.
// This line grabs our '<div id="app">' from index.html and literally attaches that canvas to it.
document.getElementById('app').appendChild(renderer.domElement);

// OrbitControls allow the user to rotate/zoom around the project.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

/**
 * ============================================================================
 * 2. LIGHTING (Visibility)
 * ============================================================================
 */
// Since we are using "Basic" materials (which ignore complex shadows and shading),
// we only need a single flat light to ensure our colors are visible to the camera!
scene.add(new THREE.AmbientLight(0xffffff, 1.0)); 

/**
 * ============================================================================
 * 3. ENVIRONMENT (Mine Infrastructure)
 * ============================================================================
 */
// A. Grid Helper: Provides a sense of scale (100m x 100m)
const gridHelper = new THREE.GridHelper(100, 20, 0x444455, 0x222233);
scene.add(gridHelper);

// B. The Planning Floor: A flat surface we can click on.
const baseGeom = new THREE.PlaneGeometry(60, 60);
const baseMat = new THREE.MeshBasicMaterial({ color: 0x111115, side: THREE.DoubleSide });
const baseMesh = new THREE.Mesh(baseGeom, baseMat);

// Math Helper: A simple function to convert plain degrees to radians.
// Beginners use degrees (0 to 360), but Three.js uses radians (Pi).
function getRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Why rotate? By default, Three.js builds Planes standing straight up (like a wall).
// We want this to be a floor to walk on, so we rotate it -90 degrees on the X axis to lay it flat.
baseMesh.rotation.x = getRadians(-90); 
baseMesh.position.y = -0.1; // Slightly below grid to avoid clipping
scene.add(baseMesh);

// Things we can click on (Point A and Point B)
const intersectables = [baseMesh];

// C. Obstacles (Red Infrastructure)
// We store these in an array so the "brain" can check for collisions later.
const obstacles = [];
const redMat = new THREE.MeshBasicMaterial({ color: 0x8b2222 });

/**
 * Function: createBoxObstacle
 * Simple helper to build boxes for our environment.
 */
function createBoxObstacle(width, height, depth, x, z, label) {
  const geom = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geom, redMat);
  mesh.position.set(x, height / 2, z); // Sit ON the floor
  scene.add(mesh);
  obstacles.push(mesh);
  return mesh;
}

/**
 * Function: createPillar
 * Uses CylinderGeometry to represent support columns.
 */
function createPillar(x, z) {
  const pillarGeom = new THREE.CylinderGeometry(1.5, 1.5, 15, 16);
  const pillar = new THREE.Mesh(pillarGeom, redMat);
  pillar.position.set(x, 7.5, z); // Height is 15, so lift by 7.5 to sit on ground
  scene.add(pillar);
  obstacles.push(pillar);
}

// 1. Central Excavation Chamber (The main hub)
createBoxObstacle(20, 15, 20, 0, 0, "Main Chamber");

/**
 * Function: createCorridor
 * Creates a long hollow-looking corridor using wireframe.
 * For the assessment, we use wireframe to show these are "hollow" volumes.
 */
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

// 2. Three Existing Tunnels (Corridors)
// These branch out from the chamber in different directions
createCorridor(40, 6, 6, 25, 0, getRadians(0));               // East corridor
createCorridor(40, 6, 6, -15, 15, getRadians(45));            // Southwest corridor (rotated 45 deg)
createCorridor(40, 6, 6, -15, -15, getRadians(-45));          // Northwest corridor (rotated -45 deg)

// 3. Grid of Support Pillars

for (let x = -25; x <= 25; x += 25) {
  for (let z = -25; z <= 25; z += 25) {
    // Skip the center (0,0) as the Chamber is there
    if (x === 0 && z === 0) continue;
    createPillar(x, z);
  }
}

/**
 * ============================================================================
 * 4. INTERACTION LOGIC (Planning the Tunnel)
 * ============================================================================
 */
// How Raycasting Works: Think of it exactly like a literal laser pointer.
// When you click the mouse on the screen, Three.js shoots an invisible laser from the 
// Camera, straight through your mouse cursor, and out into the 3D world.
// It then hands you a list of whatever 3D objects the laser bumped into!
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let pointA = null;
let pointB = null;

// Visual aids for Point A (Start) and Point B (End)
const startSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
const endSphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0x3344ff }));

// Materials for the "Active" tunnel tube
const safeMat = new THREE.MeshBasicMaterial({ color: 0x00ff22, transparent: true, opacity: 0.6 });
const dangerMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });

let activeTubeMesh = null;
const activeBox3 = new THREE.Box3(); // Mathematical box used for collision detection

/**
 * MOUSE MOVE: Updates the preview
 */
window.addEventListener('mousemove', function(event) {
  // Math Simplification: Three.js doesn't understand screen pixels (like 1920x1080).
  // It only understands coordinates from -1 to +1 (where 0,0 is the exact center of the screen).
  // These two lines convert pixel coordinates into that -1 to +1 scale.
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

    // Show where the mouse is aiming
    endSphere.position.copy(targetPoint);
    endSphere.position.y = 1; 
    scene.add(endSphere);
    
    // If we have started drawing (Point A set), update the preview tube
    if (pointA !== null) {
      updateTunnelPreview(pointA, targetPoint);
    }
  }
});

/**
 * MOUSE CLICK: Commits Point A or Point B
 */
window.addEventListener('mousedown', function(event) {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(intersectables);
  
  if (intersects.length > 0) {
    const clickedPoint = intersects[0].point;
    
    if (pointA === null) {
      // First Click: Set Start Point
      pointA = clickedPoint.clone();
      startSphere.position.copy(pointA);
      startSphere.position.y = 1;
      scene.add(startSphere);
      document.getElementById('stat-status').textContent = 'Drawing...';
    } 
    else {
      // Second Click: Finish
      document.getElementById('stat-status').textContent = 'Path Locked';
      pointA = null; // Reset for next time
      scene.remove(startSphere);
      scene.remove(endSphere);
    }
  }
});

/**
 * ============================================================================
 * 5. CORE BRAIN: Tunnel Creation & Collision Detection
 * ============================================================================
 */
function updateTunnelPreview(startPoint, endPoint) {
  // Clear the previous frame's tube
  if (activeTubeMesh) {
    scene.remove(activeTubeMesh);
    activeTubeMesh.geometry.dispose(); 
  }

  const distance = startPoint.distanceTo(endPoint);
  if (distance < 0.1) return;

  // 1. Create Shape
  const tunnelGeom = new THREE.CylinderGeometry(1.5, 1.5, distance, 12);
  
  // Math Simplification: Shift the geometry's pivot point to the very edge.
  // By default, Cylinders rotate from their center. By shifting it by half its length (distance / 2),
  // it behaves like a clock hand rotating around the Start Point.
  const halfLength = distance / 2;
  tunnelGeom.translate(0, halfLength, 0); 
  
  activeTubeMesh = new THREE.Mesh(tunnelGeom, safeMat);
  
  // 2. Positioning & Orientation
  activeTubeMesh.position.copy(startPoint);
  activeTubeMesh.position.y = 1;

  // Make the cylinder "Look at" End Point
  const lookTarget = endPoint.clone();
  lookTarget.y = 1; 
  activeTubeMesh.lookAt(lookTarget);
  
  // Tip it over 90 degrees to lay flat
  activeTubeMesh.rotateX(getRadians(90)); 

  // 3. Collision Detection (The important part!)
  // We wrap an invisible "Hit Box" (Box3) around the tube to see if it hits obstacles.
  activeTubeMesh.updateMatrixWorld(true);
  activeBox3.setFromObject(activeTubeMesh);

  let collision = false;
  
  // Classic Beginner Loop: Check every obstacle in our list one by one
  for (let i = 0; i < obstacles.length; i++) {
    const singleObstacle = obstacles[i];
    
    // Wrap a hit box around this specific obstacle
    const obstacleBox = new THREE.Box3().setFromObject(singleObstacle);
    
    // Check if the two hit boxes are touching
    if (activeBox3.intersectsBox(obstacleBox)) {
      collision = true;
      break; // Stop checking further once we find a hit!
    }
  }

  // Update color based on collision status
  activeTubeMesh.material = collision ? dangerMat : safeMat;
  scene.add(activeTubeMesh);

  // 4. Update UI
  document.getElementById('stat-length').textContent = distance.toFixed(1) + ' m';
  document.getElementById('stat-volume').textContent = (distance * 12).toFixed(1) + ' m³';
}

/**
 * ============================================================================
 * 6. ENGINE (The Loop)
 * ============================================================================
 */
function animate() {
  requestAnimationFrame(animate);
  controls.update(); 
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});