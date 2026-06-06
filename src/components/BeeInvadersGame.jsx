import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from './AudioEngine';
import { fetchBeeInvadersLeaderboard, saveBeeInvadersScore } from '../services/api';
import './BeeInvadersGame.css';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;

// Game Object sizes
const PLAYER_SIZE = 60;
const ENEMY_SIZE = 60;
const BULLET_WIDTH = 25;
const BULLET_HEIGHT = 40;

const PLAYER_SPEED = 5;
const ENEMY_SPEED = 1.2;
const BULLET_SPEED = 4;
const SHOOT_INTERVAL = 800;
const SPAWN_INTERVAL = 1500;
const BG_SPEED = 2;

const getComboMultiplier = (combo) => {
    if (combo >= 20) return 5;
    if (combo >= 10) return 3;
    if (combo >= 5) return 2;
    return 1;
};

const getComboColor = (multiplier) => {
    if (multiplier >= 5) return '#ef4444';
    if (multiplier >= 3) return '#f59e0b';
    if (multiplier >= 2) return '#3b82f6';
    return '#ffd700';
};

const BeeInvadersGame = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [introStep, setIntroStep] = useState(0); // 0 = menu, 1 = slide1, 2 = slide2
    const [leaderboard, setLeaderboard] = useState([]);
    const [combo, setCombo] = useState(0);
    const [bombs, setBombs] = useState(1);
    const [waveAnnounce, setWaveAnnounce] = useState(null);
    
    // Controls state
    const keys = useRef({ left: false, right: false, up: false, down: false });
    
    // Images
    const imagesRef = useRef({ player: null, enemy: null, bullet: null, lancet: null, orlan: null, loaded: 0 });

    // Game State
    const gameState = useRef({
        player: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT - PLAYER_SIZE - 20, width: PLAYER_SIZE, height: PLAYER_SIZE },
        bullets: [],
        enemies: [],
        lastShootTime: 0,
        lastSpawnTime: 0,
        animationFrameId: null,
        isGameOver: false,
        score: 0,
        level: 1,
        bgY: 0,
        lastFrameTime: 0,
        particles: [],
        combo: 0,
        comboTexts: [],
        joystick: {
            active: false,
            originX: 0,
            originY: 0,
            x: 0,
            y: 0,
            radius: 70 // Larger radius for less sensitivity
        },
        telemetry: {
            enemiesKilled: 0,
            misses: 0,
            playTimeStart: 0
        }
    });

    // Load Images
    useEffect(() => {
        const loadImg = (src, key) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                imagesRef.current[key] = img;
                imagesRef.current.loaded += 1;
            };
        };

        loadImg('/assets/combat_bee.png', 'player');
        loadImg('/assets/shahed_drone.png', 'enemy');
        loadImg('/assets/lancet_drone.png', 'lancet');
        loadImg('/assets/orlan_drone.png', 'orlan');
        loadImg('/assets/interceptor_projectile.png', 'bullet');
        loadImg('/assets/ground_bg.png', 'background');
        loadImg('/assets/boss_bg.png', 'boss_bg');
        loadImg('/assets/base.png', 'base');
        loadImg('/assets/bumblebee.png', 'bumblebee');
        loadImg('/assets/grusha.png', 'grusha');
    }, []);

    // Intro Cutscene Flow
    useEffect(() => {
        let timer;
        if (introStep === 1) {
            timer = setTimeout(() => setIntroStep(2), 3000); // 3 seconds on slide 1
        } else if (introStep === 2) {
            timer = setTimeout(() => {
                setIntroStep(0);
                beginGameplay();
            }, 2000); // 2 seconds on slide 2
        }
        return () => clearTimeout(timer);
    }, [introStep]);

    const startIntro = async () => {
        await audioEngine.init();
        setGameOver(false);
        setGameStarted(false);
        setIntroStep(1);
        audioEngine.playIntroMusic();
    };

    const skipIntro = () => {
        setIntroStep(0);
        audioEngine.stopIntroMusic();
        beginGameplay();
    };

    const beginGameplay = () => {
        setGameOver(false);
        setGameStarted(true);
        setScore(0);
        setLevel(1);
        setLives(3);
        setCombo(0);
        setBombs(1);
        setWaveAnnounce(null);
        
        gameState.current = {
            player: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT - PLAYER_SIZE - 20, width: PLAYER_SIZE, height: PLAYER_SIZE },
            bullets: [],
            enemies: [],
            lastShootTime: 0,
            lastSpawnTime: 0,
            animationFrameId: null,
            isGameOver: false,
            score: 0,
            level: 1,
            lives: 3,
            bgY: 0,
            damageFlash: 0,
            lastFrameTime: 0,
            particles: [],
            combo: 0,
            comboTexts: [],
            timeScale: 1,
            slowmoFrames: 0,
            screenShake: 0,
            bombs: 1,
            bombActive: false,
            bumblebeeSweep: null,
            enemyBullets: [],
            wave: 1,
            waveEnemiesTotal: 8,
            waveEnemiesSpawned: 0,
            waveEnemiesKilledOrPassed: 0,
            wavePause: false,
            wavePauseUntil: 0,
            bossBase: null,
            isBossWave: false,
            bossFireParticles: [],
            currentBgImg: 'background',
            nextBgImg: 'background',
            bossBgArrived: false,
            joystick: {
                active: false,
                originX: 0,
                originY: 0,
                x: 0,
                y: 0,
                radius: 70
            },
            powerups: [],
            activeBuffs: { bigBullets: 0, shield: 0, doubleShot: 0, spreadShot: 0 },
            telemetry: {
                enemiesKilled: 0,
                misses: 0,
                playTimeStart: performance.now()
            }
        };

        audioEngine.stopIntroMusic();
        audioEngine.startMusic();

        if (imagesRef.current.loaded >= 5) {
            gameLoop(0);
        } else {
            // Fallback if images not fully loaded, though rare
            setTimeout(() => gameLoop(0), 500);
        }
    };

    const stopGame = () => {
        audioEngine.stopMusic();
        if (gameState.current.animationFrameId) {
            cancelAnimationFrame(gameState.current.animationFrameId);
        }
    };

    useEffect(() => {
        const loadLeaderboard = async () => {
            const data = await fetchBeeInvadersLeaderboard();
            if (Array.isArray(data)) setLeaderboard(data);
        };
        loadLeaderboard();

        const handleKeyDown = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault(); // Prevent scrolling
            }
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'ф') keys.current.left = true;
            if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'в') keys.current.right = true;
            if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'ц') keys.current.up = true;
            if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'і' || e.key.toLowerCase() === 'ы') keys.current.down = true;
            if (e.key === ' ') activateBomb();
        };
        const handleKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'ф') keys.current.left = false;
            if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'в') keys.current.right = false;
            if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'ц') keys.current.up = false;
            if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'і' || e.key.toLowerCase() === 'ы') keys.current.down = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            stopGame();
        };
    }, []);

    const activateBomb = () => {
        const state = gameState.current;
        if (state.isGameOver || !state.bombs || state.bombs <= 0 || state.bombActive) return;
        
        state.bombs -= 1;
        setBombs(state.bombs);
        state.bombActive = true;
        
        // Spawn Bumblebee at the bottom
        state.bumblebeeSweep = {
            active: true,
            x: GAME_WIDTH / 2 - 125, // centered, width 250
            y: GAME_HEIGHT + 20,
            width: 250,
            height: 250,
            hitBoss: false
        };
        
        state.screenShake = 30;
        state.slowmoFrames = 60; // Matrix style sweep
        state.timeScale = 0.25;
        
        audioEngine.playExplosion();
        setTimeout(() => audioEngine.playExplosion(), 200);
    };

    const checkCollision = (rect1, rect2) => {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    };

    const gameLoop = (timestamp) => {
        if (gameState.current.isGameOver) return;

        // Cap framerate to ~60 FPS (approx 16.6ms per frame)
        // This prevents the game from running 2x faster on 120Hz screens when touching
        const elapsed = timestamp - (gameState.current.lastFrameTime || 0);
        if (elapsed < 16) {
            gameState.current.animationFrameId = requestAnimationFrame(gameLoop);
            return;
        }
        gameState.current.lastFrameTime = timestamp;

        // Slowmo: skip update frames to create slow-motion effect
        const state = gameState.current;
        if (state.slowmoFrames > 0) {
            state.slowmoFrames -= 1;
            state.timeScale = 0.25;
            if (state.slowmoFrames <= 0) state.timeScale = 1;
        }

        update(timestamp);
        draw();

        gameState.current.animationFrameId = requestAnimationFrame(gameLoop);
    };

    const update = (timestamp) => {
        const state = gameState.current;

        // Wave / Level logic
        const waveLevel = state.wave;
        if (waveLevel !== state.level) {
            state.level = waveLevel;
            setLevel(waveLevel);
        }

        const currentEnemySpeed = Math.min(2.4, 1.2 + (state.level - 1) * 0.2);
        const currentSpawnInterval = Math.max(700, 1500 - (state.level - 1) * 120);
        const dodgeChance = Math.min(0.6, 0.2 + (state.level - 1) * 0.07);
        const armoredChance = Math.min(0.35, 0.05 + (state.level - 1) * 0.05);

        const ts = state.timeScale;

        let currentBgSpeed = BG_SPEED * ts;
        if (state.isBossWave && state.bossBgArrived) {
            currentBgSpeed = 0; // Stop background scroll when arrived at base
        }

        // Update Background
        state.bgY += currentBgSpeed;
        if (state.bgY >= GAME_HEIGHT) {
            state.bgY = 0;
            state.currentBgImg = state.nextBgImg;
            if (state.isBossWave) {
                state.bossBgArrived = true;
            }
        }

        // Move boss base into position (locked to incoming boss background)
        if (state.bossBase && state.isBossWave && !state.bossBgArrived) {
            state.bossBase.y = state.bgY - GAME_HEIGHT + 20;
        } else if (state.bossBase && state.bossBgArrived) {
            state.bossBase.y = 20;
        }

        // Screen shake decay
        if (state.screenShake > 0) state.screenShake -= 1;

        // Move Player (not affected by slowmo - player keeps full control)
        if (keys.current.left) {
            state.player.x -= PLAYER_SPEED;
            if (state.player.x < 0) state.player.x = 0;
        }
        if (keys.current.right) {
            state.player.x += PLAYER_SPEED;
            if (state.player.x + state.player.width > GAME_WIDTH) state.player.x = GAME_WIDTH - state.player.width;
        }
        if (keys.current.up) {
            state.player.y -= PLAYER_SPEED;
            if (state.player.y < 0) state.player.y = 0;
        }
        if (keys.current.down) {
            state.player.y += PLAYER_SPEED;
            if (state.player.y + state.player.height > GAME_HEIGHT) state.player.y = GAME_HEIGHT - state.player.height;
        }
        
        // Joystick Movement
        if (state.joystick.active) {
            const dx = state.joystick.x - state.joystick.originX;
            const dy = state.joystick.y - state.joystick.originY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 15) { // Larger Deadzone
                // Adjusted curve for smoother acceleration
                const speedScale = Math.pow(Math.min(dist / state.joystick.radius, 1.0), 1.5);
                state.player.x += (dx / dist) * PLAYER_SPEED * speedScale;
                state.player.y += (dy / dist) * PLAYER_SPEED * speedScale;
                
                state.player.x = Math.max(0, Math.min(GAME_WIDTH - state.player.width, state.player.x));
                state.player.y = Math.max(0, Math.min(GAME_HEIGHT - state.player.height, state.player.y));
            }
        }

        // Auto Shoot
        if (timestamp - state.lastShootTime > SHOOT_INTERVAL / ts) {
            const hasSpread = state.activeBuffs.spreadShot > timestamp;
            const hasDouble = state.activeBuffs.doubleShot > timestamp;
            const hasBig = state.activeBuffs.bigBullets > timestamp;
            const bWidth = hasBig ? BULLET_WIDTH * 2 : BULLET_WIDTH;
            const bHeight = hasBig ? BULLET_HEIGHT * 2 : BULLET_HEIGHT;
            
            if (hasSpread) {
                state.bullets.push({
                    x: state.player.x + state.player.width / 2 - bWidth / 2,
                    y: state.player.y,
                    width: bWidth, height: bHeight, vx: -BULLET_SPEED * 0.5
                });
                state.bullets.push({
                    x: state.player.x + state.player.width / 2 - bWidth / 2,
                    y: state.player.y,
                    width: bWidth, height: bHeight, vx: 0
                });
                state.bullets.push({
                    x: state.player.x + state.player.width / 2 - bWidth / 2,
                    y: state.player.y,
                    width: bWidth, height: bHeight, vx: BULLET_SPEED * 0.5
                });
            } else if (hasDouble) {
                state.bullets.push({
                    x: state.player.x + state.player.width / 4 - bWidth / 2,
                    y: state.player.y,
                    width: bWidth, height: bHeight, vx: 0
                });
                state.bullets.push({
                    x: state.player.x + (state.player.width * 3) / 4 - bWidth / 2,
                    y: state.player.y,
                    width: bWidth, height: bHeight, vx: 0
                });
            } else {
                state.bullets.push({
                    x: state.player.x + state.player.width / 2 - bWidth / 2,
                    y: state.player.y,
                    width: bWidth, height: bHeight, vx: 0
                });
            }
            state.lastShootTime = timestamp;
        }

        // Move Bullets
        state.bullets.forEach(b => {
            b.y -= BULLET_SPEED * ts;
            if (b.vx) b.x += b.vx;
        });
        // Remove off-screen bullets
        state.bullets = state.bullets.filter(b => b.y + b.height > 0);

        // Move and Collect Powerups
        for (let i = state.powerups.length - 1; i >= 0; i--) {
            let p = state.powerups[i];
            p.y += 2 * ts;
            if (p.y > GAME_HEIGHT) {
                state.powerups.splice(i, 1);
                continue;
            }
            if (checkCollision(p, state.player)) {
                if (p.type === 4) { // Heal
                    state.lives = Math.min(state.lives + 1, 5);
                    setLives(state.lives);
                } else if (p.type === 1) { // Big Bullets
                    state.activeBuffs.bigBullets = timestamp + 10000;
                } else if (p.type === 2) { // Shield
                    state.activeBuffs.shield = timestamp + 10000;
                } else if (p.type === 3) { // Double Shot
                    state.activeBuffs.doubleShot = timestamp + 10000;
                } else if (p.type === 5) { // Spread Shot
                    state.activeBuffs.spreadShot = timestamp + 10000;
                } else if (p.type === 6) { // Bomb
                    state.bombs = Math.min((state.bombs || 0) + 1, 3);
                    setBombs(state.bombs);
                }
                state.powerups.splice(i, 1);
            }
        }

        // Wave pause logic
        if (state.wavePause) {
            if (timestamp >= state.wavePauseUntil) {
                state.wavePause = false;
                setWaveAnnounce(null);
            }
            // Don't spawn during pause, but still allow movement/shooting
        }

        // Spawn Enemies (wave-based)
        const isBoss = state.isBossWave && state.bossBase;
        const waveComplete = !isBoss && state.waveEnemiesSpawned >= state.waveEnemiesTotal && state.enemies.length === 0;
        
        if (waveComplete && !state.wavePause) {
            // Advance to next wave
            state.wave += 1;
            state.waveEnemiesTotal = Math.min(25, 8 + (state.wave - 1) * 2);
            state.waveEnemiesSpawned = 0;
            state.waveEnemiesKilledOrPassed = 0;
            state.wavePause = true;
            state.wavePauseUntil = timestamp + 3000;
            
            // Check if this is a boss wave
            if (state.wave % 10 === 0) {
                state.isBossWave = true;
                state.nextBgImg = 'boss_bg';
                state.bossBgArrived = false;
                state.wavePauseUntil = timestamp + 4000;
                setWaveAnnounce('⛽ НАФТОВА БАЗА');
            } else {
                setWaveAnnounce(state.wave);
            }
        }
        
        // Boss wave: init base after pause ends
        if (state.isBossWave && !state.bossBase && !state.wavePause) {
            const bossHp = 30 + state.wave * 3;
            state.bossBase = {
                x: GAME_WIDTH / 2 - 125,
                y: state.bossBgArrived ? 20 : (state.bgY - GAME_HEIGHT + 20),
                width: 250,
                height: 250,
                hp: bossHp,
                maxHp: bossHp,
                flashTimer: 0
            };
            state.bossFireParticles = [];
        }
        
        // Boss base: fire particles when damaged
        if (state.bossBase) {
            const dmgRatio = 1 - state.bossBase.hp / state.bossBase.maxHp;
            if (dmgRatio > 0.2 && Math.random() < dmgRatio * 0.6) {
                const bb = state.bossBase;
                state.bossFireParticles.push({
                    x: bb.x + 20 + Math.random() * (bb.width - 40),
                    y: bb.y + 10 + Math.random() * (bb.height - 20),
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -Math.random() * 2 - 0.5,
                    life: Math.random() * 20 + 10,
                    maxLife: 30,
                    color: Math.random() > 0.4 ? '#ef4444' : '#f59e0b'
                });
            }
            state.bossFireParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 1;
            });
            state.bossFireParticles = state.bossFireParticles.filter(p => p.life > 0);
            if (state.bossBase.flashTimer > 0) state.bossBase.flashTimer -= 1;
        }
        
        // Boss wave spawning: continuous defenders
        if (state.isBossWave && state.bossBase && !state.wavePause && timestamp - state.lastSpawnTime > currentSpawnInterval * 1.3 / ts) {
            const isLancet = Math.random() < 0.4;
            const isArmored = !isLancet && Math.random() < armoredChance;
            const eSize = ENEMY_SIZE;
            const randomX = Math.random() * (GAME_WIDTH - eSize);
            
            state.enemies.push({
                id: Math.random(),
                x: randomX,
                y: -eSize,
                width: eSize,
                height: eSize,
                type: isLancet ? 'lancet' : 'shahed',
                dodgeTargetX: null,
                canDodge: !isLancet && Math.random() < dodgeChance,
                isArmored: isArmored,
                hp: isLancet ? 1 : (isArmored ? 2 : 1),
                moveDir: 0
            });
            state.lastSpawnTime = timestamp;
        }
        
        // Normal wave spawning
        if (!state.isBossWave && !state.wavePause && state.waveEnemiesSpawned < state.waveEnemiesTotal && timestamp - state.lastSpawnTime > currentSpawnInterval / ts) {
            const hasOrlan = state.enemies.some(e => e.type === 'orlan');
            let isOrlan = false;
            let isLancet = false;
            let isArmored = false;
            
            // Every 5th wave guarantees Orlan as last enemy
            const isLastEnemy = state.waveEnemiesSpawned === state.waveEnemiesTotal - 1;
            const isBossWave = state.wave % 5 === 0;
            
            if (!hasOrlan && ((isBossWave && isLastEnemy) || Math.random() < 0.05)) {
                isOrlan = true;
            } else {
                isLancet = Math.random() < 0.25;
                isArmored = !isLancet && Math.random() < armoredChance;
            }
            
            const eSize = isOrlan ? ENEMY_SIZE * 2 : ENEMY_SIZE;
            const minX = 0;
            const maxX = GAME_WIDTH - eSize;
            const randomX = Math.random() * (maxX - minX) + minX;
            
            state.enemies.push({
                id: Math.random(),
                x: randomX,
                y: -eSize,
                width: eSize,
                height: eSize,
                type: isOrlan ? 'orlan' : (isLancet ? 'lancet' : 'shahed'),
                dodgeTargetX: null,
                canDodge: (isLancet || isOrlan) ? false : Math.random() < dodgeChance,
                isArmored: isArmored,
                hp: isOrlan ? 10 : (isLancet ? 1 : (isArmored ? 2 : 1)),
                moveDir: isOrlan ? (Math.random() > 0.5 ? 1 : -1) : 0
            });
            state.waveEnemiesSpawned += 1;
            state.lastSpawnTime = timestamp;
        }

        const isOrlanAlive = state.enemies.some(e => e.type === 'orlan');
        const grushasCount = state.enemies.filter(e => e.type === 'grusha').length;

        // Move Enemies and Dodging AI
        state.enemies.forEach(e => {
            if (e.type === 'orlan') {
                if (!e.lastGrushaSpawnTime) e.lastGrushaSpawnTime = timestamp;
                if (timestamp - e.lastGrushaSpawnTime > 5000 && grushasCount < 2) {
                    state.enemies.push({
                        id: Math.random(),
                        x: e.x + e.width / 2 - (ENEMY_SIZE / 2),
                        y: e.y + e.height,
                        width: ENEMY_SIZE,
                        height: ENEMY_SIZE,
                        type: 'grusha',
                        hp: 1,
                        moveDir: Math.random() > 0.5 ? 1 : -1,
                        lastShotTime: timestamp + Math.random() * 2000
                    });
                    e.lastGrushaSpawnTime = timestamp;
                }

                if (e.y < 50) e.y += currentEnemySpeed * ts;
                else {
                    e.x += e.moveDir * currentEnemySpeed * ts;
                    if (e.x < 0 || e.x + e.width > GAME_WIDTH) {
                        e.moveDir *= -1;
                        e.x = Math.max(0, Math.min(GAME_WIDTH - e.width, e.x));
                    }
                }
            } else if (e.type === 'lancet') {
                // Lancet: Fast, straight down. If Orlan alive -> Homing
                e.y += currentEnemySpeed * 2.2 * ts; // Much faster
                
                if (isOrlanAlive && e.y < state.player.y) {
                    const distY = state.player.y - e.y;
                    const distX = state.player.x - e.x;
                    const distance = Math.sqrt(distX * distX + distY * distY);
                    const speed = currentEnemySpeed * 1.5 * ts;
                    e.x += (distX / distance) * speed;
                    e.targetAngle = Math.atan2(distY, distX) - Math.PI / 2;
                } else {
                    e.targetAngle = null;
                }
            } else if (e.type === 'grusha') {
                if (e.y < 120) {
                    e.y += currentEnemySpeed * 1.5 * ts;
                } else {
                    e.x += e.moveDir * currentEnemySpeed * 0.8 * ts;
                    if (e.x < 0 || e.x + e.width > GAME_WIDTH) {
                        e.moveDir *= -1;
                        e.x = Math.max(0, Math.min(GAME_WIDTH - e.width, e.x));
                    }
                }

                if (!e.lastShotTime) e.lastShotTime = timestamp;
                if (timestamp - e.lastShotTime > 2000) {
                    const dx = (state.player.x + state.player.width/2) - (e.x + e.width/2);
                    const dy = (state.player.y + state.player.height/2) - (e.y + e.height);
                    const mag = Math.sqrt(dx*dx + dy*dy);
                    state.enemyBullets.push({
                        x: e.x + e.width/2 - 4,
                        y: e.y + e.height,
                        width: 8,
                        height: 8,
                        vx: (dx / mag) * 5,
                        vy: (dy / mag) * 5,
                        damage: 1
                    });
                    e.lastShotTime = timestamp;
                }
            } else {
                // Shahed: Homing and dodging logic
                const distY = state.player.y - e.y;
                const distX = state.player.x - e.x;
                const distance = Math.sqrt(distX * distX + distY * distY);

                if (distY > 0 && distY < 250) {
                    // Ramming AI: Homing towards player
                    const speed = currentEnemySpeed * 1.5 * ts;
                    e.x += (distX / distance) * speed;
                    e.y += (distY / distance) * speed;
                    e.targetAngle = Math.atan2(distY, distX) - Math.PI / 2;
                } else {
                    e.y += currentEnemySpeed * ts;
                    e.targetAngle = null;

                    // Dodging logic
                    const canDodgeNow = e.canDodge || isOrlanAlive;
                    if (canDodgeNow && e.dodgeTargetX === null) {
                        for (let b of state.bullets) {
                            if (b.y > e.y && b.y - e.y < 200) {
                                const bCenter = b.x + b.width / 2;
                                const eCenter = e.x + e.width / 2;
                                const dodgeThreshold = isOrlanAlive ? 60 : 30;
                                if (Math.abs(bCenter - eCenter) < dodgeThreshold) {
                                    const direction = Math.random() > 0.5 ? 1 : -1;
                                    const dodgeDist = isOrlanAlive ? 100 : 60;
                                    e.dodgeTargetX = Math.max(0, Math.min(GAME_WIDTH - e.width, e.x + direction * dodgeDist));
                                    break;
                                }
                            }
                        }
                    } else if (e.dodgeTargetX !== null) {
                        if (Math.abs(e.x - e.dodgeTargetX) > 2) {
                            e.x += (e.dodgeTargetX > e.x ? 1 : -1) * (currentEnemySpeed * (isOrlanAlive ? 2.5 : 1.5) * ts);
                        } else {
                            e.dodgeTargetX = null;
                        }
                    }
                }
            }
        });

        // Update particles
        state.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 1;
        });
        state.particles = state.particles.filter(p => p.life > 0);

        // Update combo texts
        state.comboTexts.forEach(ct => {
            ct.y -= 1.5;
            ct.life -= 1;
        });
        state.comboTexts = state.comboTexts.filter(ct => ct.life > 0);

        // Update bomb shockwave
        if (state.bumblebeeSweep && state.bumblebeeSweep.active) {
            state.bumblebeeSweep.y -= 18 * ts; // fast upward sweep
            
            // Destroy enemies it passes
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                let e = state.enemies[i];
                if (e.y > state.bumblebeeSweep.y - e.height) { // Passed them
                    for (let p = 0; p < 15; p++) {
                        state.particles.push({
                            x: e.x + e.width / 2, y: e.y + e.height / 2,
                            vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                            life: Math.random() * 30 + 15, maxLife: 45,
                            color: ['#ef4444', '#f59e0b', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 4)]
                        });
                    }
                    state.combo += 1;
                    const mult = getComboMultiplier(state.combo);
                    const baseScore = e.type === 'orlan' ? 200 : (e.type === 'grusha' ? 25 : (e.type === 'lancet' ? 15 : 10));
                    state.score += baseScore * mult;
                    state.telemetry.enemiesKilled += 1;
                    state.enemies.splice(i, 1);
                }
            }
            
            // Damage boss base once during sweep
            if (state.bossBase && state.bossBase.hp > 0 && state.bossBase.y + state.bossBase.height > state.bumblebeeSweep.y) {
                if (!state.bumblebeeSweep.hitBoss) {
                    state.bumblebeeSweep.hitBoss = true;
                    state.bossBase.hp = Math.max(0, state.bossBase.hp - 10);
                    state.bossBase.flashTimer = 8;
                    for (let p = 0; p < 30; p++) {
                        state.bossFireParticles.push({
                            x: state.bossBase.x + Math.random() * state.bossBase.width,
                            y: state.bossBase.y + Math.random() * state.bossBase.height,
                            vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4 - 1,
                            life: Math.random() * 35 + 15, maxLife: 50,
                            color: Math.random() > 0.3 ? '#ef4444' : '#f59e0b'
                        });
                    }
                    state.screenShake = 20; // Extra shake on boss hit
                }
            }
            
            // Finish sweep
            if (state.bumblebeeSweep.y < -state.bumblebeeSweep.height - 50) {
                state.bumblebeeSweep.active = false;
                state.bombActive = false;
            }
            
            setScore(state.score);
            setCombo(state.combo);
        }

        // Check Collisions
        let orlanDied = false;
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            let enemy = state.enemies[i];
            
            // Enemy hits bottom (Penalty instead of Game Over)
            if (enemy.y > GAME_HEIGHT) {
                state.enemies.splice(i, 1);
                state.score -= enemy.type === 'lancet' ? 20 : 10; // 20 penalty for Lancet, 10 for Shahed
                state.telemetry.misses += 1;
                state.combo = 0;
                setCombo(0);
                setScore(state.score);
                
                continue;
            }

            // Enemy hits player
            // make player hitbox slightly smaller to be forgiving
            const playerHitbox = {
                x: state.player.x + 5,
                y: state.player.y + 5,
                width: state.player.width - 10,
                height: state.player.height - 10
            };
            if (checkCollision(enemy, playerHitbox)) {
                audioEngine.playExplosion();
                state.explosions = state.explosions || [];
                state.explosions.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    radius: 0,
                    maxRadius: enemy.width,
                    alpha: 1
                });
                
                state.telemetry.enemiesKilled += 1;
                
                if (enemy.type === 'orlan') {
                    state.score += 200;
                    orlanDied = true;
                    const types = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
                    for (let k = 0; k < 3; k++) {
                        state.powerups.push({ x: enemy.x + enemy.width/2 - 45 + k * 30, y: enemy.y, width: 30, height: 30, type: types[k] });
                    }
                } else {
                    state.score += (enemy.type === 'lancet' ? 50 : 20);
                    if (Math.random() < 0.1) {
                        const typeId = Math.floor(Math.random() * 5) + 1;
                        state.powerups.push({ x: enemy.x, y: enemy.y, width: 30, height: 30, type: typeId });
                    }
                }
                setScore(state.score);
                
                state.enemies.splice(i, 1);
                
                if (state.activeBuffs.shield > timestamp) {
                    // Shield protects from damage
                } else {
                    state.combo = 0;
                    setCombo(0);
                    state.lives -= 1;
                    setLives(state.lives);
                    
                    if (state.lives <= 0) {
                    state.isGameOver = true;
                    setGameOver(true);
                    audioEngine.stopMusic();
                    
                    // Submit score and anti-cheat telemetry
                    const playTimeMs = Math.round(performance.now() - state.telemetry.playTimeStart);
                    const tokenString = `${state.score}_${state.telemetry.enemiesKilled}_${playTimeMs}_secretSalt123`;
                    const verifyToken = btoa(tokenString);
                    
                    const scoreData = {
                        score: state.score,
                        metrics: {
                            kills: state.telemetry.enemiesKilled,
                            misses: state.telemetry.misses,
                            playTimeMs: playTimeMs,
                            levelReached: state.level
                        },
                        verifyToken
                    };
                    
                    saveBeeInvadersScore(scoreData).then(() => {
                        // Refresh leaderboard silently
                        fetchBeeInvadersLeaderboard().then(data => {
                            if (Array.isArray(data)) setLeaderboard(data);
                        });
                    });
                } else {
                    state.damageFlash = 15;
                    state.screenShake = 8;
                }
                }
                
                if (orlanDied) break;
                continue;
            }

            // Enemy hits bullet
            for (let j = state.bullets.length - 1; j >= 0; j--) {
                let bullet = state.bullets[j];
                if (checkCollision(enemy, bullet)) {
                    state.bullets.splice(j, 1);
                    enemy.hp -= 1;

                    if (enemy.hp <= 0) {
                        // Destroyed
                        for (let p = 0; p < 15; p++) {
                            state.particles.push({
                                x: enemy.x + enemy.width / 2,
                                y: enemy.y + enemy.height / 2,
                                vx: (Math.random() - 0.5) * 6,
                                vy: (Math.random() - 0.5) * 6,
                                life: Math.random() * 20 + 10,
                                maxLife: 30,
                                color: enemy.type === 'orlan' ? '#3b82f6' : (Math.random() > 0.5 ? '#ef4444' : '#f59e0b')
                            });
                        }
                        audioEngine.playExplosion();
                        state.enemies.splice(i, 1);
                        state.combo += 1;
                        const mult = getComboMultiplier(state.combo);
                        if (enemy.type === 'orlan') {
                            state.score += 200 * mult;
                            orlanDied = true;
                            const types = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
                            for (let k = 0; k < 3; k++) {
                                state.powerups.push({ x: enemy.x + enemy.width/2 - 45 + k * 30, y: enemy.y, width: 30, height: 30, type: types[k] });
                            }
                            state.comboTexts.push({ text: mult > 1 ? `+${200 * mult} x${mult}` : `+200`, x: enemy.x + enemy.width / 2, y: enemy.y, color: getComboColor(mult), fontSize: 22, life: 50, maxLife: 50 });
                            // Orlan always drops a bomb
                            state.powerups.push({ x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, width: 30, height: 30, type: 6 });
                            state.telemetry.enemiesKilled += 1;
                            setScore(state.score);
                            setCombo(state.combo);
                            break; // Break the bullets loop
                        } else {
                            const baseScore = enemy.type === 'lancet' ? 15 : 10;
                            state.score += baseScore * mult;
                            if (Math.random() < 0.1) {
                                const typeId = Math.floor(Math.random() * 5) + 1;
                                state.powerups.push({ x: enemy.x, y: enemy.y, width: 30, height: 30, type: typeId });
                            }
                            if (state.combo > 1) {
                                state.comboTexts.push({ text: mult > 1 ? `+${baseScore * mult} x${mult}` : `${state.combo} HIT`, x: enemy.x + enemy.width / 2, y: enemy.y, color: getComboColor(mult), fontSize: mult > 1 ? 22 : 16, life: 50, maxLife: 50 });
                            }
                        }
                        state.telemetry.enemiesKilled += 1;
                        setScore(state.score);
                        setCombo(state.combo);
                    } else {
                        // Armor hit (sparks)
                        for (let p = 0; p < 5; p++) {
                            state.particles.push({
                                x: bullet.x + bullet.width / 2,
                                y: bullet.y,
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * 4,
                                life: Math.random() * 10 + 5,
                                maxLife: 15,
                                color: '#e2e8f0'
                            });
                        }
                    }
                    break; // Move to next enemy
                }
            }
            if (orlanDied) break;
        }

        if (orlanDied) {
            state.enemies.forEach(otherE => {
                for (let p = 0; p < 15; p++) {
                    state.particles.push({
                        x: otherE.x + otherE.width / 2,
                        y: otherE.y + otherE.height / 2,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: Math.random() * 20 + 10,
                        maxLife: 30,
                        color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b'
                    });
                }
                state.combo += 1;
                const chainMult = getComboMultiplier(state.combo);
                const chainBase = otherE.type === 'lancet' ? 15 : 10;
                state.score += chainBase * chainMult;
                state.telemetry.enemiesKilled += 1;
            });
            state.enemies = []; // Kill all other enemies
            audioEngine.playExplosion(); // Extra boom sound
            state.slowmoFrames = 90; // ~1.5 seconds of slowmo
            state.timeScale = 0.25;
            setScore(state.score);
            setCombo(state.combo);
        }

        // Update enemy bullets
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            let b = state.enemyBullets[i];
            b.x += b.vx * ts;
            b.y += b.vy * ts;
            
            if (checkCollision(b, state.player)) {
                state.enemyBullets.splice(i, 1);
                
                if (state.activeBuffs.shield > timestamp) {
                    // Shield protects
                } else {
                    state.combo = 0;
                    setCombo(0);
                    state.lives -= 1;
                    setLives(state.lives);
                    audioEngine.playExplosion();
                    
                    if (state.lives <= 0) {
                        state.isGameOver = true;
                        setGameOver(true);
                        audioEngine.stopMusic();
                        
                        const playTimeMs = Math.round(performance.now() - state.telemetry.playTimeStart);
                        const tokenString = `${state.score}_${state.telemetry.enemiesKilled}_${playTimeMs}_secretSalt123`;
                        const verifyToken = btoa(tokenString);
                        const scoreData = {
                            score: state.score,
                            metrics: { kills: state.telemetry.enemiesKilled, misses: state.telemetry.misses, playTimeMs: playTimeMs, levelReached: state.level },
                            verifyToken
                        };
                        saveBeeInvadersScore(scoreData).then(() => fetchBeeInvadersLeaderboard().then(data => {
                            if (Array.isArray(data)) setLeaderboard(data);
                        }));
                    } else {
                        state.damageFlash = 15;
                        state.screenShake = 8;
                    }
                }
                continue;
            }
            
            if (b.y > GAME_HEIGHT || b.x < 0 || b.x > GAME_WIDTH || b.y < 0) {
                state.enemyBullets.splice(i, 1);
            }
        }

        // Boss base bullet collision
        if (state.bossBase && state.bossBase.hp > 0) {
            for (let j = state.bullets.length - 1; j >= 0; j--) {
                const bullet = state.bullets[j];
                if (checkCollision(bullet, state.bossBase)) {
                    state.bullets.splice(j, 1);
                    state.bossBase.hp -= 1;
                    state.bossBase.flashTimer = 4;
                    
                    // Hit sparks
                    for (let p = 0; p < 3; p++) {
                        state.particles.push({
                            x: bullet.x + bullet.width / 2,
                            y: bullet.y,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 3 - 1,
                            life: Math.random() * 12 + 5,
                            maxLife: 17,
                            color: Math.random() > 0.5 ? '#fbbf24' : '#ef4444'
                        });
                    }
                    
                    // Base destroyed!
                    if (state.bossBase.hp <= 0) {
                        // Massive explosion
                        const bb = state.bossBase;
                        for (let p = 0; p < 60; p++) {
                            state.particles.push({
                                x: bb.x + Math.random() * bb.width,
                                y: bb.y + Math.random() * bb.height,
                                vx: (Math.random() - 0.5) * 10,
                                vy: (Math.random() - 0.5) * 10,
                                life: Math.random() * 40 + 20,
                                maxLife: 60,
                                color: ['#ef4444', '#f59e0b', '#fbbf24', '#ffffff', '#000000'][Math.floor(Math.random() * 5)]
                            });
                        }
                        
                        // Shockwave
                        state.bombShockwave = {
                            x: bb.x + bb.width / 2,
                            y: bb.y + bb.height / 2,
                            radius: 0,
                            maxRadius: GAME_HEIGHT * 1.2,
                            life: 50,
                            maxLife: 50
                        };
                        
                        // Rewards
                        state.score += 500 * getComboMultiplier(state.combo);
                        state.comboTexts.push({ text: `БАЗА +500`, x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, color: '#ffd700', fontSize: 28, life: 80, maxLife: 80 });
                        state.bombs = Math.min(state.bombs + 1, 3);
                        setBombs(state.bombs);
                        
                        // Effects
                        state.screenShake = 20;
                        state.slowmoFrames = 120;
                        state.timeScale = 0.25;
                        audioEngine.playExplosion();
                        setTimeout(() => audioEngine.playExplosion(), 200);
                        setTimeout(() => audioEngine.playExplosion(), 400);
                        
                        // Destroy all remaining enemies
                        state.enemies.forEach(e => {
                            for (let pp = 0; pp < 10; pp++) {
                                state.particles.push({
                                    x: e.x + e.width / 2, y: e.y + e.height / 2,
                                    vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                                    life: Math.random() * 20 + 10, maxLife: 30,
                                    color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b'
                                });
                            }
                            state.telemetry.enemiesKilled += 1;
                        });
                        state.enemies = [];
                        
                        // End boss wave, transition to next
                        state.bossBase = null;
                        state.isBossWave = false;
                        state.bossBgArrived = false;
                        state.nextBgImg = 'background';
                        state.bossFireParticles = [];
                        state.waveEnemiesSpawned = state.waveEnemiesTotal; // Mark wave as done
                        
                        setScore(state.score);
                        break;
                    }
                }
            }
        }
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = gameState.current;
        const imgs = imagesRef.current;

        // Screen Shake
        ctx.save();
        if (state.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * state.screenShake * 2;
            const shakeY = (Math.random() - 0.5) * state.screenShake * 2;
            ctx.translate(shakeX, shakeY);
        }

        // Clear canvas / Draw background
        if (imgs.background) {
            const currentImg = imgs[state.currentBgImg] || imgs.background;
            const nextImg = imgs[state.nextBgImg] || imgs.background;
            
            ctx.drawImage(currentImg, 0, state.bgY, GAME_WIDTH, GAME_HEIGHT);
            ctx.drawImage(nextImg, 0, state.bgY - GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT);
        } else {
            ctx.fillStyle = '#0a0a2a'; // dark night sky
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }

        const currentTimestamp = performance.now();

        // Draw Boss Base (oil refinery)
        if (state.bossBase) {
            const bb = state.bossBase;
            ctx.save();
            
            // Flash on hit
            if (bb.flashTimer > 0) {
                ctx.globalAlpha = 0.6 + Math.sin(bb.flashTimer * 4) * 0.4;
            }
            
            if (imgs.base) {
                ctx.drawImage(imgs.base, bb.x, bb.y, bb.width, bb.height);
            } else {
                ctx.fillStyle = '#374151';
                ctx.fillRect(bb.x, bb.y, bb.width, bb.height);
            }
            
            ctx.globalAlpha = 1;
            ctx.restore();
            
            // Fire particles
            state.bossFireParticles.forEach(p => {
                ctx.globalAlpha = p.life / p.maxLife;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, (p.life / p.maxLife) * 6 + 2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            
            // HP Bar
            const hpRatio = bb.hp / bb.maxHp;
            const barW = bb.width * 0.6;
            const barH = 8;
            const barX = bb.x + (bb.width - barW) / 2;
            const barY = bb.y + bb.height - 20;
            
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            
            const hpColor = hpRatio > 0.5 ? '#ef4444' : (hpRatio > 0.25 ? '#f59e0b' : '#dc2626');
            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, barW * hpRatio, barH);
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);
        }

        // Draw Bumblebee Sweep
        if (state.bumblebeeSweep && state.bumblebeeSweep.active) {
            const bee = state.bumblebeeSweep;
            if (imgs.bumblebee) {
                ctx.drawImage(imgs.bumblebee, bee.x, bee.y, bee.width, bee.height);
            } else {
                ctx.fillStyle = 'orange';
                ctx.fillRect(bee.x, bee.y, bee.width, bee.height);
            }
        }

        // Draw Player (with bobbing animation)
        const hoverOffset = Math.sin(currentTimestamp / 150) * 4;
        
        if (state.damageFlash > 0) {
            ctx.globalAlpha = (state.damageFlash % 4 > 1) ? 0.3 : 1.0;
            state.damageFlash -= 1;
        }
        
        if (imgs.player) {
            ctx.drawImage(imgs.player, state.player.x, state.player.y + hoverOffset, state.player.width, state.player.height);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(state.player.x, state.player.y + hoverOffset, state.player.width, state.player.height);
        }
        ctx.globalAlpha = 1.0;
        
        if (state.activeBuffs.shield > currentTimestamp) {
            ctx.beginPath();
            ctx.arc(state.player.x + state.player.width/2, state.player.y + state.player.height/2 + hoverOffset, state.player.width/2 + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.fill();
        }

        // Draw Powerups
        state.powerups.forEach(p => {
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let icon = '🟢';
            if (p.type === 2) icon = '🛡️';
            if (p.type === 3) icon = '♊';
            if (p.type === 4) icon = '❤️';
            if (p.type === 5) icon = '✨';
            if (p.type === 6) icon = '💣';
            ctx.fillText(icon, p.x + p.width/2, p.y + p.height/2);
        });

        // Draw Enemies (with rocking animation and targeting)
        state.enemies.forEach(e => {
            const rockAngle = e.type === 'lancet' || e.type === 'orlan' ? 0 : Math.PI + Math.sin(currentTimestamp / 150 + e.id) * 0.15;
            const finalAngle = e.targetAngle !== null && e.targetAngle !== undefined ? Math.PI + e.targetAngle : rockAngle;
            
            let imgToDraw = imgs.enemy;
            if (e.type === 'lancet') imgToDraw = imgs.lancet;
            if (e.type === 'orlan') imgToDraw = imgs.orlan;
            if (e.type === 'grusha') imgToDraw = imgs.grusha;

            if (imgToDraw) {
                ctx.save();
                ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
                
                if (e.type === 'orlan' || e.type === 'grusha') {
                    const orlanHover = Math.sin(currentTimestamp / 300 + e.id) * 5;
                    ctx.translate(0, orlanHover);
                } else {
                    ctx.rotate(finalAngle);
                }
                
                // Visual distinction for armored enemies
                if (e.isArmored) {
                    // Sepia filter for a rusty/dark look
                    ctx.filter = 'sepia(100%) hue-rotate(-50deg) saturate(200%) brightness(80%)';
                }

                ctx.drawImage(imgToDraw, -e.width / 2, -e.height / 2, e.width, e.height);
                ctx.restore();
            } else {
                ctx.fillStyle = e.isArmored ? 'darkred' : (e.type === 'lancet' ? 'white' : 'red');
                ctx.fillRect(e.x, e.y, e.width, e.height);
            }
        });

        // Draw Particles (Explosions)
        state.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.beginPath();
            ctx.arc(p.x, p.y, (p.life / p.maxLife) * 5 + 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Draw Combo Texts
        state.comboTexts.forEach(ct => {
            ctx.save();
            ctx.globalAlpha = Math.min(1, ct.life / (ct.maxLife * 0.4));
            ctx.font = `bold ${ct.fontSize}px 'Courier New', monospace`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(ct.text, ct.x, ct.y);
            ctx.fillStyle = ct.color;
            ctx.fillText(ct.text, ct.x, ct.y);
            ctx.restore();
        });

        // Draw Virtual Joystick
        if (state.joystick.active) {
            ctx.save();
            // Base
            ctx.beginPath();
            ctx.arc(state.joystick.originX, state.joystick.originY, state.joystick.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Thumb
            ctx.beginPath();
            ctx.arc(state.joystick.x, state.joystick.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
            ctx.restore();
        }

        // Slowmo vignette overlay
        if (state.timeScale < 1) {
            ctx.save();
            const gradient = ctx.createRadialGradient(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_HEIGHT * 0.3, GAME_WIDTH/2, GAME_HEIGHT/2, GAME_HEIGHT * 0.7);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            ctx.restore();
        }



        // Draw Bullets
        state.bullets.forEach(b => {
            if (imgs.bullet) {
                ctx.save();
                ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
                ctx.rotate(Math.PI);
                ctx.drawImage(imgs.bullet, -b.width / 2, -b.height / 2, b.width, b.height);
                ctx.restore();
            } else {
                ctx.fillStyle = 'cyan';
                ctx.fillRect(b.x, b.y, b.width, b.height);
            }
        });

        // Draw Enemy Bullets
        if (state.enemyBullets) {
            state.enemyBullets.forEach(b => {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(b.x + b.width/2, b.y + b.height/2, b.width/2, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#fca5a5';
                ctx.beginPath();
                ctx.arc(b.x + b.width/2, b.y + b.height/2, b.width/4, 0, Math.PI*2);
                ctx.fill();
            });
        }

        // Restore screen shake transform
        ctx.restore();
    };

    // Virtual Joystick Controls
    const handlePointerDown = (e) => {
        if (!gameStarted || gameOver) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        gameState.current.joystick.active = true;
        gameState.current.joystick.originX = x;
        gameState.current.joystick.originY = y;
        gameState.current.joystick.x = x;
        gameState.current.joystick.y = y;
    };

    const handlePointerMove = (e) => {
        if (!gameState.current.joystick.active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const dx = x - gameState.current.joystick.originX;
        const dy = y - gameState.current.joystick.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = gameState.current.joystick.radius;
        
        if (dist > maxDist) {
            gameState.current.joystick.x = gameState.current.joystick.originX + (dx / dist) * maxDist;
            gameState.current.joystick.y = gameState.current.joystick.originY + (dy / dist) * maxDist;
        } else {
            gameState.current.joystick.x = x;
            gameState.current.joystick.y = y;
        }
    };

    const handlePointerUp = () => {
        gameState.current.joystick.active = false;
    };

    return (
        <div className="bee-invaders-container">
            <canvas
                ref={canvasRef}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                className="game-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            />

            <div className="game-overlay">
                <div className="game-score">ОЧКИ: {score.toString().padStart(5, '0')}</div>
                <div className="game-level" style={{ color: '#ef4444', fontWeight: 'bold', fontFamily: "'Courier New', Courier, monospace", fontSize: '1.2rem', textShadow: '2px 2px 0 #000' }}>
                    {'❤️'.repeat(lives)}
                </div>
                {combo > 2 && (
                    <div className={`combo-indicator ${getComboMultiplier(combo) > 1 ? 'combo-multiplied' : ''}`}>
                        <span className="combo-number">{combo}</span>
                        <span className="combo-text">COMBO</span>
                        {getComboMultiplier(combo) > 1 && (
                            <span className="combo-mult" style={{ color: getComboColor(getComboMultiplier(combo)) }}>x{getComboMultiplier(combo)}</span>
                        )}
                    </div>
                )}
            </div>

            {gameStarted && !gameOver && waveAnnounce && (
                <div className="wave-announce">
                    <span>ХВИЛЯ {waveAnnounce}</span>
                </div>
            )}

            {gameStarted && !gameOver && (
                <button
                    className={`bomb-btn ${bombs <= 0 ? 'bomb-btn-empty' : ''}`}
                    onClick={activateBomb}
                    disabled={bombs <= 0}
                >
                    🐝 Джміль {bombs}
                </button>
            )}



            {/* Intro Cutscene */}
            {!gameStarted && introStep > 0 && (
                <div className="intro-screen">
                    <img 
                        src={`/assets/intro_slide_${introStep}.png`} 
                        alt="Cutscene" 
                        className={`intro-image slide-${introStep}`} 
                    />
                    <div className="intro-overlay">
                        <h1 className={`intro-text animate-text-${introStep}`}>
                            {introStep === 1 ? 'ЗНОВУ ТРИВОГА!' : 'ВИЛІТАЄМО!'}
                        </h1>
                        <button className="skip-btn" onClick={skipIntro}>
                            Пропустити &gt;&gt;
                        </button>
                    </div>
                </div>
            )}

            {!gameStarted && !gameOver && introStep === 0 && (
                <div className="start-screen">
                    <h2>Bee Invaders</h2>
                    <p>Керуйте бджілкою (Стрілки/WASD). Пробіл — викликати джмеля 🐝</p>
                    <button className="restart-btn" onClick={startIntro}>Почати гру</button>

                    {leaderboard && leaderboard.length > 0 && (
                        <div className="leaderboard-container">
                            <h3>Топ Пілотів</h3>
                            <table className="leaderboard-table">
                                <tbody>
                                    {leaderboard.slice(0, 5).map((entry, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}. {entry.name || 'Анонім'}</td>
                                            <td style={{textAlign: 'right'}}>{entry.score}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {gameOver && (
                <div className="game-over-overlay">
                    <h2>GAME OVER</h2>
                    <p>Рахунок: {score}</p>
                    <button className="restart-btn" onClick={startIntro}>Грати знову</button>
                </div>
            )}
        </div>
    );
};

export default BeeInvadersGame;
