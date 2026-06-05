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

const BeeInvadersGame = () => {
    const canvasRef = useRef(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [introStep, setIntroStep] = useState(0); // 0 = menu, 1 = slide1, 2 = slide2
    const [leaderboard, setLeaderboard] = useState([]);
    
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

        update(timestamp);
        draw();

        gameState.current.animationFrameId = requestAnimationFrame(gameLoop);
    };

    const update = (timestamp) => {
        const state = gameState.current;

        // Level logic
        const newLevel = Math.floor(state.score / 100) + 1;
        if (newLevel !== state.level) {
            state.level = newLevel;
            setLevel(newLevel);
        }

        const currentEnemySpeed = 1.2 + (state.level - 1) * 0.2;
        const currentSpawnInterval = Math.max(400, 1500 - (state.level - 1) * 150);
        const dodgeChance = Math.min(0.8, 0.3 + (state.level - 1) * 0.1);
        const armoredChance = Math.min(0.5, 0.1 + (state.level - 1) * 0.1);

        // Update Background
        state.bgY += BG_SPEED;
        if (state.bgY >= GAME_HEIGHT) {
            state.bgY = 0;
        }

        // Move Player
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
        if (timestamp - state.lastShootTime > SHOOT_INTERVAL) {
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
            b.y -= BULLET_SPEED;
            if (b.vx) b.x += b.vx;
        });
        // Remove off-screen bullets
        state.bullets = state.bullets.filter(b => b.y + b.height > 0);

        // Move and Collect Powerups
        for (let i = state.powerups.length - 1; i >= 0; i--) {
            let p = state.powerups[i];
            p.y += 2;
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
                }
                state.powerups.splice(i, 1);
            }
        }

        // Spawn Enemies
        if (timestamp - state.lastSpawnTime > currentSpawnInterval) {
            const hasOrlan = state.enemies.some(e => e.type === 'orlan');
            let isOrlan = false;
            let isLancet = false;
            let isArmored = false;
            
            if (!hasOrlan && Math.random() < 0.05) {
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
            state.lastSpawnTime = timestamp;
        }

        const isOrlanAlive = state.enemies.some(e => e.type === 'orlan');

        // Move Enemies and Dodging AI
        state.enemies.forEach(e => {
            if (e.type === 'orlan') {
                if (e.y < 50) e.y += currentEnemySpeed;
                else {
                    e.x += e.moveDir * currentEnemySpeed;
                    if (e.x < 0 || e.x + e.width > GAME_WIDTH) {
                        e.moveDir *= -1;
                        e.x = Math.max(0, Math.min(GAME_WIDTH - e.width, e.x));
                    }
                }
            } else if (e.type === 'lancet') {
                // Lancet: Fast, straight down. If Orlan alive -> Homing
                e.y += currentEnemySpeed * 2.2; // Much faster
                
                if (isOrlanAlive && e.y < state.player.y) {
                    const distY = state.player.y - e.y;
                    const distX = state.player.x - e.x;
                    const distance = Math.sqrt(distX * distX + distY * distY);
                    const speed = currentEnemySpeed * 1.5;
                    e.x += (distX / distance) * speed;
                    e.targetAngle = Math.atan2(distY, distX) - Math.PI / 2;
                } else {
                    e.targetAngle = null;
                }
            } else {
                // Shahed: Homing and dodging logic
                const distY = state.player.y - e.y;
                const distX = state.player.x - e.x;
                const distance = Math.sqrt(distX * distX + distY * distY);

                if (distY > 0 && distY < 250) {
                    // Ramming AI: Homing towards player
                    const speed = currentEnemySpeed * 1.5;
                    e.x += (distX / distance) * speed;
                    e.y += (distY / distance) * speed;
                    e.targetAngle = Math.atan2(distY, distX) - Math.PI / 2;
                } else {
                    e.y += currentEnemySpeed;
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
                            e.x += (e.dodgeTargetX > e.x ? 1 : -1) * (currentEnemySpeed * (isOrlanAlive ? 2.5 : 1.5));
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

        // Check Collisions
        let orlanDied = false;
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            let enemy = state.enemies[i];
            
            // Enemy hits bottom (Penalty instead of Game Over)
            if (enemy.y > GAME_HEIGHT) {
                state.enemies.splice(i, 1);
                state.score -= enemy.type === 'lancet' ? 20 : 10; // 20 penalty for Lancet, 10 for Shahed
                state.telemetry.misses += 1;
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
                        if (enemy.type === 'orlan') {
                            state.score += 200;
                            orlanDied = true;
                            const types = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
                            for (let k = 0; k < 3; k++) {
                                state.powerups.push({ x: enemy.x + enemy.width/2 - 45 + k * 30, y: enemy.y, width: 30, height: 30, type: types[k] });
                            }
                            break; // Break the bullets loop
                        } else {
                            state.score += (enemy.type === 'lancet' ? 15 : 10);
                            if (Math.random() < 0.1) {
                                const typeId = Math.floor(Math.random() * 5) + 1;
                                state.powerups.push({ x: enemy.x, y: enemy.y, width: 30, height: 30, type: typeId });
                            }
                        }
                        state.telemetry.enemiesKilled += 1;
                        setScore(state.score);
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
                state.score += otherE.type === 'lancet' ? 15 : 10;
                state.telemetry.enemiesKilled += 1;
            });
            state.enemies = []; // Kill all other enemies
            audioEngine.playExplosion(); // Extra boom sound
            setScore(state.score);
        }
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = gameState.current;
        const imgs = imagesRef.current;

        // Clear canvas / Draw background
        if (imgs.background) {
            ctx.drawImage(imgs.background, 0, state.bgY, GAME_WIDTH, GAME_HEIGHT);
            ctx.drawImage(imgs.background, 0, state.bgY - GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT);
        } else {
            ctx.fillStyle = '#0a0a2a'; // dark night sky
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }

        const currentTimestamp = performance.now();

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
            ctx.fillText(icon, p.x + p.width/2, p.y + p.height/2);
        });

        // Draw Enemies (with rocking animation and targeting)
        state.enemies.forEach(e => {
            const rockAngle = e.type === 'lancet' || e.type === 'orlan' ? 0 : Math.PI + Math.sin(currentTimestamp / 150 + e.id) * 0.15;
            const finalAngle = e.targetAngle !== null && e.targetAngle !== undefined ? Math.PI + e.targetAngle : rockAngle;
            
            let imgToDraw = imgs.enemy;
            if (e.type === 'lancet') imgToDraw = imgs.lancet;
            if (e.type === 'orlan') imgToDraw = imgs.orlan;

            if (imgToDraw) {
                ctx.save();
                ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
                
                if (e.type === 'orlan') {
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
                <div className="game-level" style={{ color: '#ec4899', fontWeight: 'bold', fontFamily: "'Courier New', Courier, monospace" }}>
                    РІВЕНЬ {level}
                </div>
            </div>

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
                    <p>Керуйте бджілкою (Стрілки або W/A/S/D). Збивайте БПЛА!</p>
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
