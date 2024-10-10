// app.js

// Scene, Camera, Renderer
let scene, camera, renderer;
// Car object
let car = {
    mesh: null,
    length: 4,
    width: 2,
    height: 1.2,
    steeringAngle: 0,
    maxSteeringAngle: Math.PI / 6, // 30 degrees
    speed: 0,
    maxSpeed: 5,
    heading: 0,
    wheelBase: 2.5 // Distance between front and rear axles
};

let clock = new THREE.Clock();
let obstacles = [];
let referenceLines = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let isDrawingLine = false;
let lineStart = new THREE.Vector3();


function init() {
    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaaaaaa);

    // Create the camera (PerspectiveCamera: FOV, aspect ratio, near, far)
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Ground Plane
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x007700 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    scene.add(plane);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Initialize the simulation
    initSimulation();

    // Start animation loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// Start the initialization
init();

function createCar() {
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(car.length, car.height, car.width);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = car.height / 2;
    carGroup.add(bodyMesh);

    // Wheels
    const wheelRadius = 0.4;
    const wheelWidth = 0.3;
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    // Function to create a wheel
    function createWheel(x, y, z) {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        return wheel;
    }

    const halfLength = car.length / 2 - 0.5;
    const halfWidth = car.width / 2 + 0.1;
    const wheelY = wheelRadius;

    // Front wheels (steering)
    car.frontLeftWheel = createWheel(halfLength, wheelY, halfWidth);
    car.frontRightWheel = createWheel(halfLength, wheelY, -halfWidth);
    carGroup.add(car.frontLeftWheel);
    carGroup.add(car.frontRightWheel);

    // Rear wheels
    car.rearLeftWheel = createWheel(-halfLength, wheelY, halfWidth);
    car.rearRightWheel = createWheel(-halfLength, wheelY, -halfWidth);
    carGroup.add(car.rearLeftWheel);
    carGroup.add(car.rearRightWheel);

    car.mesh = carGroup;
    scene.add(car.mesh);
}

function initSimulation() {
    // Create the car
    createCar();

    // Initialize other simulation elements if needed
}

// HTML elements
const carLengthInput = document.getElementById('carLength');
const carWidthInput = document.getElementById('carWidth');
const speedControl = document.getElementById('speedControl');
const speedLabel = document.getElementById('speedLabel');
const resetButton = document.getElementById('resetButton');
const rotateButton = document.getElementById('rotateButton');
const clearLinesButton = document.getElementById('clearLinesButton');

carLengthInput.addEventListener('change', () => {
    car.length = parseFloat(carLengthInput.value);
    scene.remove(car.mesh);
    createCar();
});

carWidthInput.addEventListener('change', () => {
    car.width = parseFloat(carWidthInput.value);
    scene.remove(car.mesh);
    createCar();
});

speedControl.addEventListener('input', () => {
    car.speed = parseFloat(speedControl.value);
    speedLabel.textContent = car.speed.toFixed(1);
});

resetButton.addEventListener('click', resetSimulation);

rotateButton.addEventListener('click', () => {
    car.heading -= Math.PI / 2; // Rotate 90 degrees clockwise
    car.mesh.rotation.y = car.heading;
});

clearLinesButton.addEventListener('click', () => {
    // Clear reference lines
    referenceLines.forEach(line => scene.remove(line));
    referenceLines = [];
});

document.addEventListener('keydown', handleKeyDown);

function handleKeyDown(event) {
    const steeringIncrement = Math.PI / 180 * 2; // 2 degrees in radians
    const speedIncrement = 0.1;

    if (event.key === 'ArrowLeft') {
        car.steeringAngle = Math.min(car.steeringAngle + steeringIncrement, car.maxSteeringAngle);
    }
    if (event.key === 'ArrowRight') {
        car.steeringAngle = Math.max(car.steeringAngle - steeringIncrement, -car.maxSteeringAngle);
    }
    if (event.key === 'ArrowUp') {
        car.speed += speedIncrement;
        if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
        updateSpeedControlUI();
    }
    if (event.key === 'ArrowDown') {
        car.speed -= speedIncrement;
        if (car.speed < -car.maxSpeed) car.speed = -car.maxSpeed;
        updateSpeedControlUI();
    }
}

function updateSpeedControlUI() {
    speedControl.value = car.speed;
    speedLabel.textContent = car.speed.toFixed(1);
}

function updateCarPosition(deltaTime) {
    const direction = car.speed >= 0 ? 1 : -1;
    const beta = Math.atan(Math.tan(car.steeringAngle) / 2) * direction;

    const velocity = car.speed * deltaTime;

    car.mesh.position.x += velocity * Math.sin(car.heading + beta);
    car.mesh.position.z += velocity * Math.cos(car.heading + beta);
    car.heading += (velocity / car.wheelBase) * Math.sin(beta);

    // Update the car's rotation
    car.mesh.rotation.y = -car.heading;

    // Steering wheels rotation
    car.frontLeftWheel.rotation.y = car.steeringAngle;
    car.frontRightWheel.rotation.y = car.steeringAngle;
}


function animate() {
    requestAnimationFrame(animate);

    let deltaTime = clock.getDelta();

    updateCarPosition(deltaTime);

    renderer.render(scene, camera);
}


function placeObstacle(position) {
    const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
    const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
    const obstacleMesh = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacleMesh.position.copy(position);
    scene.add(obstacleMesh);
    obstacles.push(obstacleMesh);
}


function addReferenceLine(start, end) {
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    referenceLines.push(line);
}

document.addEventListener('mousedown', onMouseDown, false);
document.addEventListener('mousemove', onMouseMove, false);
document.addEventListener('mouseup', onMouseUp, false);

function onMouseDown(event) {
    if (event.altKey) {
        // Start drawing reference line
        isDrawingLine = true;
        lineStart = getMousePositionOnPlane(event);
    } else if (event.shiftKey) {
        // Place obstacle
        const position = getMousePositionOnPlane(event);
        placeObstacle(position);
    } else {
        // Place car
        const position = getMousePositionOnPlane(event);
        car.mesh.position.copy(position);
        car.heading = 0;
        car.steeringAngle = 0;
    }
}

function onMouseMove(event) {
    if (isDrawingLine) {
        // Update the reference line preview (optional)
    }
}

function onMouseUp(event) {
    if (isDrawingLine) {
        const lineEnd = getMousePositionOnPlane(event);
        addReferenceLine(lineStart, lineEnd);
        isDrawingLine = false;
    }
}

function getMousePositionOnPlane(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, point);
    return point;
}

function checkCollisions() {
    const carBox = new THREE.Box3().setFromObject(car.mesh);

    for (let obstacle of obstacles) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (carBox.intersectsBox(obstacleBox)) {
            car.speed = 0;
            updateSpeedControlUI();
            break;
        }
    }
}
function animate() {
    requestAnimationFrame(animate);

    let deltaTime = clock.getDelta();

    updateCarPosition(deltaTime);
    checkCollisions();

    renderer.render(scene, camera);
}

function resetSimulation() {
    car.mesh.position.set(0, car.height / 2, 0);
    car.heading = 0;
    car.steeringAngle = 0;
    car.speed = 0;
    updateSpeedControlUI();

    // Remove obstacles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];

    // Remove reference lines
    referenceLines.forEach(line => scene.remove(line));
    referenceLines = [];
}

let controls = new THREE.OrbitControls(camera, renderer.domElement);

