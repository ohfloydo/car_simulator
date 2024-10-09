// simulation.js

// Canvas setup
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const steeringCanvas = document.getElementById('steeringIndicator');
const steeringCtx = steeringCanvas.getContext('2d');

// Car properties
let car = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    length: 60,
    width: 30,
    heading: 0, // in radians
    steeringAngle: 0, // in radians
    maxSteeringAngle: Math.PI / 6, // 30 degrees
    speed: 0,
    maxSpeed: 5 // Maximum speed in either direction
};

// User interface elements
const carLengthInput = document.getElementById('carLength');
const carWidthInput = document.getElementById('carWidth');
const speedControl = document.getElementById('speedControl');
const speedLabel = document.getElementById('speedLabel');
const resetButton = document.getElementById('resetButton');
const clearLinesButton = document.getElementById('clearLinesButton');
const rotateButton = document.getElementById('rotateButton');

// Obstacles, trace, and reference lines
let obstacles = [];
let trace = [];
let referenceLines = [];

// For drawing reference lines
let isDrawingLine = false;
let lineStart = { x: 0, y: 0 };
let lineEnd = { x: 0, y: 0 };

// Event listeners
carLengthInput.addEventListener('change', () => {
    car.length = parseFloat(carLengthInput.value);
});

carWidthInput.addEventListener('change', () => {
    car.width = parseFloat(carWidthInput.value);
});

resetButton.addEventListener('click', resetSimulation);

clearLinesButton.addEventListener('click', () => {
    referenceLines = [];
});

rotateButton.addEventListener('click', () => {
    car.heading += Math.PI / 2; // Rotate 90 degrees clockwise
});

speedControl.addEventListener('input', () => {
    car.speed = parseFloat(speedControl.value);
    speedLabel.textContent = car.speed.toFixed(1);
});

canvas.addEventListener('mousedown', onMouseDown);
canvas.addEventListener('mousemove', onMouseMove);
canvas.addEventListener('mouseup', onMouseUp);

document.addEventListener('keydown', handleSteering);

// Main animation loop
function animate() {
    update();
    render();
    requestAnimationFrame(animate);
}

animate();

// Functions

function resetSimulation() {
    car.x = canvas.width / 2;
    car.y = canvas.height / 2;
    car.heading = 0;
    car.steeringAngle = 0;
    car.speed = 0;
    speedControl.value = 0;
    speedLabel.textContent = '0.0';
    trace = [];
    obstacles = [];
    referenceLines = [];
}

function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (event.altKey) {
        // Start drawing a reference line
        isDrawingLine = true;
        lineStart = { x, y };
        lineEnd = { x, y };
    } else if (event.shiftKey) {
        // Place obstacle
        obstacles.push({ x: x - 20, y: y - 20, width: 40, height: 40 });
    } else {
        // Place car
        car.x = x;
        car.y = y;
        car.heading = 0;
        car.steeringAngle = 0;
        trace = [];
    }
}

function onMouseMove(event) {
    if (isDrawingLine) {
        const rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;

        if (event.shiftKey) {
            // Snap to angles
            const dx = x - lineStart.x;
            const dy = y - lineStart.y;
            const angle = Math.atan2(dy, dx);
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4); // Snap to 45-degree increments
            const length = Math.sqrt(dx * dx + dy * dy);
            x = lineStart.x + length * Math.cos(snapAngle);
            y = lineStart.y + length * Math.sin(snapAngle);
        }

        lineEnd = { x, y };
    }
}

function onMouseUp(event) {
    if (isDrawingLine) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        lineEnd = { x, y };
        referenceLines.push({ start: lineStart, end: lineEnd });
        isDrawingLine = false;
    }
}

function handleSteering(event) {
    const steeringIncrement = Math.PI / 180 * 2; // 2 degrees in radians
    const speedIncrement = 0.1; // Adjust as needed

    if (event.key === 'ArrowLeft') {
        car.steeringAngle = Math.max(car.steeringAngle - steeringIncrement, -car.maxSteeringAngle);
    }
    if (event.key === 'ArrowRight') {
        car.steeringAngle = Math.min(car.steeringAngle + steeringIncrement, car.maxSteeringAngle);
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
    // Update the speed slider and label
    speedControl.value = car.speed;
    speedLabel.textContent = car.speed.toFixed(1);
}

function update() {
    // Update position based on speed and heading
    const direction = car.speed >= 0 ? 1 : -1; // Forward or backward
    const beta = Math.atan(Math.tan(car.steeringAngle) / 2) * direction;

    car.x += car.speed * Math.cos(car.heading + beta);
    car.y += car.speed * Math.sin(car.heading + beta);
    car.heading += (car.speed / car.length) * Math.sin(beta);

    // Record trace
    if (car.speed !== 0) {
        trace.push({ x: car.x, y: car.y });
    }

    // Boundary check
    if (car.x < 0 || car.x > canvas.width || car.y < 0 || car.y > canvas.height) {
        car.speed = 0;
        updateSpeedControlUI();
    }

    // Collision detection
    checkCollisions();
}

function checkCollisions() {
    // Simple collision detection
    for (let obs of obstacles) {
        if (isCollidingWithObstacle(obs)) {
            car.speed = 0;
            updateSpeedControlUI();
            break;
        }
    }
}

function isCollidingWithObstacle(obs) {
    // Approximate collision detection using axis-aligned bounding boxes
    const carRect = {
        x: car.x - car.width / 2,
        y: car.y - car.length / 2,
        width: car.width,
        height: car.length
    };

    return (
        carRect.x < obs.x + obs.width &&
        carRect.x + carRect.width > obs.x &&
        carRect.y < obs.y + obs.height &&
        carRect.y + carRect.height > obs.y
    );
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trace
    ctx.beginPath();
    for (let i = 0; i < trace.length; i++) {
        const point = trace[i];
        if (i === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    }
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw reference lines
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 2;
    for (let line of referenceLines) {
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
    }

    // If currently drawing a line, show it
    if (isDrawingLine) {
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw obstacles
    for (let obs of obstacles) {
        ctx.fillStyle = 'gray';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Draw car
    drawCar();

    // Draw steering wheel indicator
    drawSteeringIndicator();
}

function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);

    // Car body
    ctx.fillStyle = 'red';
    ctx.fillRect(-car.length / 2, -car.width / 2, car.length, car.width);

    // Front wheels
    ctx.save();
    ctx.translate(car.length / 4, -car.width / 2);
    ctx.rotate(car.steeringAngle);
    ctx.fillStyle = 'black';
    ctx.fillRect(-5, 0, 10, car.width / 2);
    ctx.restore();

    ctx.save();
    ctx.translate(car.length / 4, car.width / 2);
    ctx.rotate(car.steeringAngle);
    ctx.fillStyle = 'black';
    ctx.fillRect(-5, -car.width / 2, 10, car.width / 2);
    ctx.restore();

    // Rear wheels
    ctx.fillStyle = 'black';
    ctx.fillRect(-car.length / 4 - 5, -car.width / 2, 10, car.width / 2);
    ctx.fillRect(-car.length / 4 - 5, 0, 10, car.width / 2);

    ctx.restore();
}

function drawSteeringIndicator() {
    steeringCtx.clearRect(0, 0, steeringCanvas.width, steeringCanvas.height);

    steeringCtx.beginPath();
    steeringCtx.arc(50, 50, 40, 0, 2 * Math.PI);
    steeringCtx.strokeStyle = 'black';
    steeringCtx.lineWidth = 2;
    steeringCtx.stroke();

    // Steering angle indicator
    steeringCtx.save();
    steeringCtx.translate(50, 50);
    steeringCtx.rotate(car.steeringAngle);
    steeringCtx.beginPath();
    steeringCtx.moveTo(0, 0);
    steeringCtx.lineTo(0, -40);
    steeringCtx.strokeStyle = 'red';
    steeringCtx.lineWidth = 3;
    steeringCtx.stroke();
    steeringCtx.restore();
}

