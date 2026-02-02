// ============================================================
// CYBER BREAKOUT - Complete Game Implementation
// ============================================================

// ============ CONSTANTS ============

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;

const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 14;
const PADDLE_Y = 600;
const PADDLE_SPEED = 450;

const BALL_RADIUS = 8;
const BALL_SPEED = 380;
const MAX_BOUNCE_ANGLE = Math.PI / 3;

const BRICK_COLS = 10;
const BRICK_WIDTH = 44;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 4;
const BRICK_TOP_OFFSET = 60;
const BRICK_LEFT_OFFSET = (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;

const POWERUP_DROP_CHANCE = 0.12;
const POWERUP_FALL_SPEED = 150;
const POWERUP_WIDTH = 32;
const POWERUP_HEIGHT = 18;

const EXPAND_DURATION = 10000;
const EXPAND_FACTOR = 1.5;
const SLOWMO_DURATION = 8000;
const SLOWMO_FACTOR = 0.6;

const COLORS = {
    cyan: '#00ffff',
    magenta: '#ff00ff',
    yellow: '#ffe600',
    white: '#ffffff'
};

// ============ DOM ELEMENTS ============

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const muteBtn = document.getElementById('mute');
const powerBtn = document.getElementById('power');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');

// ============ GAME STATE ============

const game = {
    state: 'idle',
    score: 0,
    lives: 3,
    bestScore: parseInt(localStorage.getItem('cyberBreakoutBest')) || 0,
    ballAttached: true,
    powerUpsEnabled: true
};

const paddle = {
    x: CANVAS_WIDTH / 2,
    y: PADDLE_Y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: PADDLE_SPEED,
    baseWidth: PADDLE_WIDTH
};

let balls = [];
let bricks = [];
let fallingPowerUps = [];

const effects = {
    expandActive: false,
    expandEndTime: 0,
    slowMoActive: false,
    slowMoEndTime: 0
};

const input = {
    left: false,
    right: false,
    dragging: false,
    dragStartX: 0,
    paddleStartX: 0
};

// ============ LEVEL DATA ============

const levels = [
    {
        layout: [
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]
    }
];

function loadLevel(levelIndex) {
    const level = levels[levelIndex];
    bricks = [];

    for (let row = 0; row < level.layout.length; row++) {
        for (let col = 0; col < level.layout[row].length; col++) {
            const durability = level.layout[row][col];
            if (durability > 0) {
                bricks.push({
                    x: BRICK_LEFT_OFFSET + col * (BRICK_WIDTH + BRICK_PADDING),
                    y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING),
                    width: BRICK_WIDTH,
                    height: BRICK_HEIGHT,
                    durability: durability,
                    maxDurability: durability,
                    alive: true
                });
            }
        }
    }
}

// ============ AUDIO ENGINE ============

let audioContext = null;
let isMuted = localStorage.getItem('cyberBreakoutMuted') === 'true';

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playPaddleHit() {
    if (isMuted) return;
    const actx = getAudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, actx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.08);
    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.08);
}

function playBrickHit() {
    if (isMuted) return;
    const actx = getAudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, actx.currentTime);
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.05);
    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.05);
}

function playBrickDestroy() {
    if (isMuted) return;
    const actx = getAudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.2, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.1);
}

function playPowerUp() {
    if (isMuted) return;
    const actx = getAudioContext();
    [523, 659, 784].forEach((freq, i) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        const t = actx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
    });
}

function playPowerUpExpire() {
    if (isMuted) return;
    const actx = getAudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, actx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);
    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.25);
}

function playLoseLife() {
    if (isMuted) return;
    const actx = getAudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, actx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.3);
}

function playWin() {
    if (isMuted) return;
    const actx = getAudioContext();
    [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        const t = actx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
    });
}

function playGameOver() {
    if (isMuted) return;
    const actx = getAudioContext();
    [400, 350, 300, 250].forEach((freq, i) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        const t = actx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
    });
}

// ============ INPUT HANDLING ============

function handleKeydown(e) {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        input.left = true;
    }
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        input.right = true;
    }
    if (e.key === ' ') {
        e.preventDefault();
        if (game.state === 'idle') {
            startGame();
        } else if (game.state === 'playing' && game.ballAttached) {
            launchBall();
        } else if (game.state === 'playing' || game.state === 'paused') {
            togglePause();
        }
    }
}

function handleKeyup(e) {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        input.left = false;
    }
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        input.right = false;
    }
}

function handleTouchStart(e) {
    if (game.state !== 'playing') return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const touchX = (touch.clientX - rect.left) * scaleX;
    if (Math.abs(touchX - paddle.x) < paddle.width) {
        input.dragging = true;
        input.dragStartX = touchX;
        input.paddleStartX = paddle.x;
        e.preventDefault();
    }
}

function handleTouchMove(e) {
    if (!input.dragging) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const touchX = (touch.clientX - rect.left) * scaleX;
    paddle.x = input.paddleStartX + (touchX - input.dragStartX);
    const half = paddle.width / 2;
    paddle.x = Math.max(half, Math.min(CANVAS_WIDTH - half, paddle.x));
    e.preventDefault();
}

function handleTouchEnd() {
    input.dragging = false;
}

function startLeftMove() {
    input.left = true;
    if (game.state === 'idle') startGame();
}
function stopLeftMove() { input.left = false; }
function startRightMove() {
    input.right = true;
    if (game.state === 'idle') startGame();
}
function stopRightMove() { input.right = false; }

// ============ BALL MANAGEMENT ============

function createBall(attached = true) {
    return {
        x: paddle.x,
        y: paddle.y - BALL_RADIUS - paddle.height / 2 - 2,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        speed: BALL_SPEED,
        attached: attached
    };
}

function launchBall() {
    if (!game.ballAttached) return;
    balls.forEach(ball => {
        if (ball.attached) {
            const angle = (Math.random() - 0.5) * 0.5;
            const speed = effects.slowMoActive ? ball.speed * SLOWMO_FACTOR : ball.speed;
            ball.vx = Math.sin(angle) * speed;
            ball.vy = -Math.cos(angle) * speed;
            ball.attached = false;
        }
    });
    game.ballAttached = false;
    statusEl.textContent = 'Playing';
}

function resetBall() {
    balls = [createBall(true)];
    game.ballAttached = true;
    statusEl.textContent = 'Press Space to launch';
}

// ============ PHYSICS & COLLISION ============

function updatePaddle(dt) {
    if (input.left && !input.right) paddle.x -= paddle.speed * dt;
    if (input.right && !input.left) paddle.x += paddle.speed * dt;
    const half = paddle.width / 2;
    paddle.x = Math.max(half, Math.min(CANVAS_WIDTH - half, paddle.x));
}

function updateBalls(dt) {
    const speed = effects.slowMoActive ? BALL_SPEED * SLOWMO_FACTOR : BALL_SPEED;

    balls.forEach(ball => {
        if (ball.attached) {
            ball.x = paddle.x;
            ball.y = paddle.y - BALL_RADIUS - paddle.height / 2 - 2;
            return;
        }

        const curSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (Math.abs(curSpeed - speed) > 10) {
            const f = speed / curSpeed;
            ball.vx *= f;
            ball.vy *= f;
        }

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x - ball.radius < 0) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx); }
        if (ball.x + ball.radius > CANVAS_WIDTH) { ball.x = CANVAS_WIDTH - ball.radius; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy); }

        if (ball.vy > 0 && checkPaddleCollision(ball)) {
            const hitPos = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.width / 2)));
            const angle = hitPos * MAX_BOUNCE_ANGLE;
            ball.vx = speed * Math.sin(angle);
            ball.vy = -speed * Math.cos(angle);
            ball.y = paddle.y - paddle.height / 2 - ball.radius - 1;
            playPaddleHit();
        }

        checkBrickCollisions(ball);
    });

    const active = balls.filter(b => b.y - b.radius < CANVAS_HEIGHT);
    if (active.length < balls.length && active.length === 0) {
        loseLife();
    }
    balls = active.length > 0 ? active : balls;
}

function checkPaddleCollision(ball) {
    return (
        ball.y + ball.radius > paddle.y - paddle.height / 2 &&
        ball.y - ball.radius < paddle.y + paddle.height / 2 &&
        ball.x + ball.radius > paddle.x - paddle.width / 2 &&
        ball.x - ball.radius < paddle.x + paddle.width / 2
    );
}

function checkBrickCollisions(ball) {
    for (let i = bricks.length - 1; i >= 0; i--) {
        const brick = bricks[i];
        if (!brick.alive) continue;

        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
        const dx = ball.x - closestX;
        const dy = ball.y - closestY;

        if (dx * dx + dy * dy < ball.radius * ball.radius) {
            const overlapX = ball.radius - Math.abs(dx);
            const overlapY = ball.radius - Math.abs(dy);

            if (overlapX < overlapY) {
                ball.vx = -ball.vx;
                ball.x += dx > 0 ? overlapX : -overlapX;
            } else {
                ball.vy = -ball.vy;
                ball.y += dy > 0 ? overlapY : -overlapY;
            }

            brick.durability--;
            if (brick.durability <= 0) {
                brick.alive = false;
                game.score += brick.maxDurability * 10;
                playBrickDestroy();
                if (game.powerUpsEnabled && Math.random() < POWERUP_DROP_CHANCE) {
                    spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                }
            } else {
                playBrickHit();
            }
            updateHUD();
            break;
        }
    }
}

// ============ POWER-UP SYSTEM ============

function spawnPowerUp(x, y) {
    const types = ['multiBall', 'expand', 'slowMo'];
    fallingPowerUps.push({
        x, y,
        vy: POWERUP_FALL_SPEED,
        type: types[Math.floor(Math.random() * types.length)],
        width: POWERUP_WIDTH,
        height: POWERUP_HEIGHT
    });
}

function updatePowerUps(dt) {
    for (let i = fallingPowerUps.length - 1; i >= 0; i--) {
        const pu = fallingPowerUps[i];
        pu.y += pu.vy * dt;

        if (
            pu.y + pu.height / 2 > paddle.y - paddle.height / 2 &&
            pu.y - pu.height / 2 < paddle.y + paddle.height / 2 &&
            pu.x + pu.width / 2 > paddle.x - paddle.width / 2 &&
            pu.x - pu.width / 2 < paddle.x + paddle.width / 2
        ) {
            activatePowerUp(pu.type);
            fallingPowerUps.splice(i, 1);
            continue;
        }

        if (pu.y > CANVAS_HEIGHT + pu.height) {
            fallingPowerUps.splice(i, 1);
        }
    }

    const now = performance.now();
    if (effects.expandActive && now >= effects.expandEndTime) {
        effects.expandActive = false;
        paddle.width = paddle.baseWidth;
        playPowerUpExpire();
        updateStatus();
    }
    if (effects.slowMoActive && now >= effects.slowMoEndTime) {
        effects.slowMoActive = false;
        playPowerUpExpire();
        updateStatus();
    }
}

function activatePowerUp(type) {
    playPowerUp();
    if (type === 'multiBall') {
        const newBalls = [];
        balls.forEach(ball => {
            if (ball.attached) return;
            [Math.PI / 6, -Math.PI / 6].forEach(off => {
                const cos = Math.cos(off), sin = Math.sin(off);
                newBalls.push({
                    x: ball.x, y: ball.y,
                    vx: ball.vx * cos - ball.vy * sin,
                    vy: ball.vx * sin + ball.vy * cos,
                    radius: ball.radius, speed: ball.speed, attached: false
                });
            });
        });
        balls.push(...newBalls);
    } else if (type === 'expand') {
        effects.expandActive = true;
        effects.expandEndTime = performance.now() + EXPAND_DURATION;
        paddle.width = paddle.baseWidth * EXPAND_FACTOR;
    } else if (type === 'slowMo') {
        effects.slowMoActive = true;
        effects.slowMoEndTime = performance.now() + SLOWMO_DURATION;
    }
    updateStatus();
}

// ============ GAME LOGIC ============

function loseLife() {
    game.lives--;
    updateHUD();
    playLoseLife();
    if (game.lives <= 0) {
        gameOver();
    } else {
        resetBall();
        effects.expandActive = false;
        effects.slowMoActive = false;
        paddle.width = paddle.baseWidth;
        fallingPowerUps = [];
    }
}

function gameOver() {
    game.state = 'gameOver';
    playGameOver();
    if (game.score > game.bestScore) {
        game.bestScore = game.score;
        localStorage.setItem('cyberBreakoutBest', game.bestScore);
        bestEl.textContent = game.bestScore;
    }
    statusEl.textContent = `Game Over! Score: ${game.score}`;
    startBtn.textContent = 'Retry';
}

function checkWin() {
    if (bricks.filter(b => b.alive).length === 0) {
        game.state = 'win';
        playWin();
        if (game.score > game.bestScore) {
            game.bestScore = game.score;
            localStorage.setItem('cyberBreakoutBest', game.bestScore);
            bestEl.textContent = game.bestScore;
        }
        statusEl.textContent = `You Win! Score: ${game.score}`;
        startBtn.textContent = 'Play Again';
    }
}

function startGame() {
    game.state = 'playing';
    game.score = 0;
    game.lives = 3;
    game.ballAttached = true;
    paddle.x = CANVAS_WIDTH / 2;
    paddle.width = paddle.baseWidth;
    effects.expandActive = false;
    effects.slowMoActive = false;
    fallingPowerUps = [];
    loadLevel(0);
    resetBall();
    updateHUD();
    startBtn.textContent = 'Restart';
    pauseBtn.textContent = '⏸';
}

function togglePause() {
    if (game.state === 'playing') {
        game.state = 'paused';
        pauseBtn.textContent = '▶';
        statusEl.textContent = 'Paused';
    } else if (game.state === 'paused') {
        game.state = 'playing';
        pauseBtn.textContent = '⏸';
        updateStatus();
    }
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('cyberBreakoutMuted', isMuted);
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    if (!isMuted) playPaddleHit();
}

function togglePowerUps() {
    game.powerUpsEnabled = !game.powerUpsEnabled;
    powerBtn.textContent = `Power-ups: ${game.powerUpsEnabled ? 'ON' : 'OFF'}`;
}

function updateHUD() {
    scoreEl.textContent = game.score;
    livesEl.textContent = game.lives;
    bestEl.textContent = game.bestScore;
}

function updateStatus() {
    if (game.state !== 'playing') return;
    if (game.ballAttached) { statusEl.textContent = 'Press Space to launch'; return; }
    const parts = [];
    const now = performance.now();
    if (effects.expandActive) parts.push(`↔️ Expand (${Math.ceil((effects.expandEndTime - now) / 1000)}s)`);
    if (effects.slowMoActive) parts.push(`⏱️ Slow (${Math.ceil((effects.slowMoEndTime - now) / 1000)}s)`);
    statusEl.textContent = parts.length ? parts.join(' | ') : 'Playing';
}

// ============ RENDERING ============

function drawPaddle() {
    const x = paddle.x - paddle.width / 2;
    const y = paddle.y - paddle.height / 2;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 15;
    const grad = ctx.createLinearGradient(x, y, x, y + paddle.height);
    grad.addColorStop(0, '#00ffff');
    grad.addColorStop(1, '#009999');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, paddle.width, paddle.height, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawBalls() {
    balls.forEach(ball => {
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = 12;
        ctx.fillStyle = COLORS.white;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(ball.x - 2, ball.y - 2, ball.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBricks() {
    bricks.forEach(brick => {
        if (!brick.alive) return;
        let color = brick.durability === 3 ? COLORS.yellow : brick.durability === 2 ? COLORS.magenta : COLORS.cyan;
        if (brick.durability < brick.maxDurability) ctx.globalAlpha = 0.7 + (brick.durability / brick.maxDurability) * 0.3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
    });
}

function drawPowerUps(time) {
    fallingPowerUps.forEach(pu => {
        const color = pu.type === 'multiBall' ? COLORS.cyan : pu.type === 'expand' ? COLORS.magenta : COLORS.yellow;
        const icon = pu.type === 'multiBall' ? '⚡' : pu.type === 'expand' ? '↔' : '⏱';
        const pulse = 1 + Math.sin(time / 150) * 0.15;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * pulse;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(pu.x - pu.width / 2, pu.y - pu.height / 2, pu.width, pu.height, 4);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, pu.x, pu.y);
    });
}

function drawEffectOverlay() {
    if (effects.slowMoActive) { ctx.fillStyle = 'rgba(255,230,0,0.08)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }
    if (effects.expandActive) { ctx.fillStyle = 'rgba(255,0,255,0.06)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }
}

function render(time) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (game.state === 'idle') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Press Start to play', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        return;
    }
    drawEffectOverlay();
    drawBricks();
    drawPowerUps(time);
    drawPaddle();
    drawBalls();
    if (game.ballAttached && game.state === 'playing') {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to launch', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
    }
}

// ============ GAME LOOP ============

let lastTime = 0;

function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    if (game.state === 'playing') {
        updatePaddle(dt);
        updateBalls(dt);
        updatePowerUps(dt);
        checkWin();
        if (effects.expandActive || effects.slowMoActive) updateStatus();
    }
    render(time);
    requestAnimationFrame(gameLoop);
}

// ============ UI BINDINGS ============

function initEventListeners() {
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    leftBtn.addEventListener('touchstart', e => { e.preventDefault(); startLeftMove(); });
    leftBtn.addEventListener('touchend', stopLeftMove);
    leftBtn.addEventListener('touchcancel', stopLeftMove);
    leftBtn.addEventListener('mousedown', startLeftMove);
    leftBtn.addEventListener('mouseup', stopLeftMove);
    leftBtn.addEventListener('mouseleave', stopLeftMove);

    rightBtn.addEventListener('touchstart', e => { e.preventDefault(); startRightMove(); });
    rightBtn.addEventListener('touchend', stopRightMove);
    rightBtn.addEventListener('touchcancel', stopRightMove);
    rightBtn.addEventListener('mousedown', startRightMove);
    rightBtn.addEventListener('mouseup', stopRightMove);
    rightBtn.addEventListener('mouseleave', stopRightMove);

    startBtn.addEventListener('click', () => { getAudioContext(); startGame(); });
    pauseBtn.addEventListener('click', togglePause);
    muteBtn.addEventListener('click', toggleMute);
    powerBtn.addEventListener('click', togglePowerUps);

    canvas.addEventListener('click', () => {
        if (game.state === 'idle') { getAudioContext(); startGame(); }
        else if (game.state === 'playing' && game.ballAttached) launchBall();
    });
}

// ============ INITIALIZATION ============

function init() {
    bestEl.textContent = game.bestScore;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    powerBtn.textContent = 'Power-ups: ON';
    statusEl.textContent = 'Ready.';
    initEventListeners();
    requestAnimationFrame(gameLoop);
}

init();
