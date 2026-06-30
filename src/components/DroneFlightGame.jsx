import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { audioEngine } from './AudioEngine';
import { fetchDroneFlightLeaderboard, saveDroneFlightScore } from '../services/api';
import './DroneFlightGame.css';

// --- Tuning (per 60fps frame, scaled by frame delta) ---
const GAME_SPEED = 0.5;        // global pace; 0.5 = 50% slower than the raw feel
const GRAVITY = 0.020;
const MAX_LAUNCH_SPEED = 1.45;
const THRUST_UP = 0.040;
const THRUST_FWD = 0.005;       // forward acceleration (halved — slower build-up & lower top speed)
const AIR_DRAG = 0.0010;
const STEER_ACCEL = 0.05;
const STEER_DAMP = 0.86;
const FUEL_MAX = 200;
const FUEL_BURN = 0.6;
const FUEL_PICKUP = 84;
const BOOST_SPEED = 0.6;
const HONEY_POINTS = 25;
const REFINERY_POINTS = 150;   // points for bombing an oil refinery
const BOMB_GRAVITY = 0.03;
const BOMB_COOLDOWN = 40;       // frames between bomb drops (~0.65s)
const NUM_REFINERIES = 3;
const NUM_BOMBS = 6;
const REFINERY_GAP_MIN = 500;
const REFINERY_GAP_MAX = 950;
const TRACK_HALF = 30;         // lateral steering limit
const GROUND_CLEAR = 0.7;      // crash if the drone gets this close to the terrain
const DRONE_R = 1.6;

// --- Procedural terrain ---
const WORLD_W = 240;           // terrain width (x)
const CHUNK_LEN = 64;          // length of one terrain chunk (z)
const NUM_CHUNKS = 6;          // recycled to build an endless world
const SEG_X = 24;              // heightfield resolution per chunk
const SEG_Z = 12;
const PROPS_PER_CHUNK = 16;    // scattered trees / buildings / rocks
const BIOME_LEN = 200;         // length of one biome stretch (z)

// Value-noise helpers (deterministic from world coords, so the mesh and the
// collision height always agree).
const _lerp = (a, b, t) => a + (b - a) * t;
const _smooth = (t) => t * t * (3 - 2 * t);
const _clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const _h01 = (n) => { const s = Math.sin(n) * 43758.5453; return s - Math.floor(s); };
const _h2 = (x, z) => _h01(x * 127.1 + z * 311.7);
const _vn = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const a = _h2(xi, zi), b = _h2(xi + 1, zi), c = _h2(xi, zi + 1), d = _h2(xi + 1, zi + 1);
    const u = _smooth(xf), v = _smooth(zf);
    return _lerp(_lerp(a, b, u), _lerp(c, d, u), v);
};

const C = (hex) => new THREE.Color(hex);
const BIOMES = [
    { kind: 'plains',    amp: 3,  lo: C('#3f7d3a'), hi: C('#7cb05a'), prop: 'tree',     obstacle: 0.05 },
    { kind: 'forest',    amp: 7,  lo: C('#27592e'), hi: C('#4f8a3f'), prop: 'tree',     obstacle: 0.30 },
    { kind: 'hills',     amp: 14, lo: C('#4a7338'), hi: C('#9aa861'), prop: 'rock',     obstacle: 0.16 },
    { kind: 'mountains', amp: 32, lo: C('#5f6657'), hi: C('#eef4fb'), prop: 'rock',     obstacle: 0.12 },
    { kind: 'city',      amp: 3,  lo: C('#525b66'), hi: C('#828c99'), prop: 'building', obstacle: 0.34 },
    { kind: 'desert',    amp: 8,  lo: C('#c6a667'), hi: C('#e7d49a'), prop: 'rock',     obstacle: 0.10 }
];

let TERRAIN_SEED = 0;          // randomised per run for a fresh course
const _segBiome = (i) => BIOMES[Math.floor(_h01(i * 12.9898 + 78.233) * BIOMES.length) % BIOMES.length];
const biomeAt = (z) => _segBiome(Math.floor((z + TERRAIN_SEED) / BIOME_LEN));
const heightAt = (x, z) => {
    const zz = z + TERRAIN_SEED;
    const seg = zz / BIOME_LEN, i0 = Math.floor(seg), t = _smooth(_clamp(seg - i0, 0, 1));
    const amp = _lerp(_segBiome(i0).amp, _segBiome(i0 + 1).amp, t);
    let h = (_vn(x * 0.013 + 40, zz * 0.013) - 0.5) * 2 * amp;
    h += (_vn(x * 0.06, zz * 0.06) - 0.5) * amp * 0.5;
    if (h < -amp * 0.25) h = -amp * 0.25;
    const ramp = _clamp((z - 6) / 46, 0, 1); // flat launch runway at the very start
    return h * ramp;
};
const colorAt = (x, z, h, out) => {
    const b = biomeAt(z);
    const hn = _clamp(h / (b.amp + 1.5) * 0.5 + 0.5, 0, 1);
    out.copy(b.lo).lerp(b.hi, hn);
};

const TYPE_WEIGHTS = [
    { type: 'fuel', w: 32 },
    { type: 'honey', w: 30 },
    { type: 'boost', w: 12 },
    { type: 'bird', w: 16 },
    { type: 'balloon', w: 10 }
];
const pickType = () => {
    const total = TYPE_WEIGHTS.reduce((s, t) => s + t.w, 0);
    let r = Math.random() * total;
    for (const t of TYPE_WEIGHTS) { if (r < t.w) return t.type; r -= t.w; }
    return 'honey';
};

const DroneFlightGame = () => {
    const mountRef = useRef(null);

    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [phase, setPhase] = useState('power'); // power | angle | flying
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(audioEngine.muted);
    const [best, setBest] = useState(() => Number(localStorage.getItem('droneFlightBest') || 0));
    const [leaderboard, setLeaderboard] = useState([]);
    const [finalScore, setFinalScore] = useState(0);
    const [finalDist, setFinalDist] = useState(0);

    const distRef = useRef(null);
    const honeyRef = useRef(null);
    const refineryRef = useRef(null);
    const fuelBarRef = useRef(null);
    const gaugeBarRef = useRef(null);

    const three = useRef({});
    const g = useRef(null);
    const playing = useRef(false);
    const input = useRef({ thrust: false, keySteer: 0, dragSteer: 0, dragOrigin: 0 });

    // ---------- Scene setup ----------
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#1b3a6b');
        scene.fog = new THREE.Fog('#2a4d80', 50, 260);

        const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
        camera.position.set(0, 6, -13);

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        mount.appendChild(renderer.domElement);
        renderer.domElement.classList.add('drone-canvas');

        // Sky dome — vertical gradient
        const sky = new THREE.Mesh(
            new THREE.SphereGeometry(420, 24, 16),
            new THREE.ShaderMaterial({
                side: THREE.BackSide,
                uniforms: { top: { value: new THREE.Color('#0c2347') }, bottom: { value: new THREE.Color('#5b86c4') } },
                vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
                fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 bottom; void main(){ float h = clamp((normalize(vP).y*0.5+0.5),0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }'
            })
        );
        scene.add(sky);

        scene.add(new THREE.HemisphereLight('#cfe2ff', '#1a3b22', 1.0));
        const sun = new THREE.DirectionalLight('#fff1cf', 1.2);
        sun.position.set(-30, 50, -20);
        scene.add(sun);
        scene.add(new THREE.AmbientLight('#4a6ea0', 0.3));

        // Terrain chunks
        const chunks = [];
        for (let i = 0; i < NUM_CHUNKS; i++) {
            const c = buildChunk();
            scene.add(c.group);
            chunks.push(c);
        }

        // Drone, catapult, collectibles, clouds, shadow, debris
        const drone = buildDrone();
        scene.add(drone);
        const catapult = buildCatapult();
        scene.add(catapult);

        const entities = [];
        for (let i = 0; i < 11; i++) { const e = buildEntity(); scene.add(e.group); e.group.visible = false; entities.push(e); }

        // Oil refineries (bomb targets) + bombs
        const refineries = [];
        for (let i = 0; i < NUM_REFINERIES; i++) { const r = buildRefinery(); scene.add(r.group); refineries.push(r); }
        const bombs = buildBombs();
        bombs.forEach(b => scene.add(b.mesh));

        const clouds = [];
        const cloudMat = new THREE.MeshStandardMaterial({ color: '#dfe9f7', emissive: '#9fb6d6', emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
        for (let i = 0; i < 11; i++) {
            const grp = new THREE.Group();
            for (let p = 0; p < 3; p++) {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 4, 8, 6), cloudMat);
                puff.position.set((p - 1) * 5 + Math.random() * 2, Math.random() * 2, Math.random() * 3);
                puff.scale.y = 0.55; grp.add(puff);
            }
            grp.position.set((Math.random() * 2 - 1) * 120, 46 + Math.random() * 30, 40 + i * 26);
            scene.add(grp); clouds.push(grp);
        }

        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(2.2, 20),
            new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false })
        );
        shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.1;
        scene.add(shadow);

        const debris = buildDebris();
        debris.forEach(d => scene.add(d.mesh));
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(1, 12, 10),
            new THREE.MeshBasicMaterial({ color: '#ffb13b', transparent: true, opacity: 0, depthWrite: false })
        );
        flash.visible = false; scene.add(flash);

        three.current = { scene, camera, renderer, sky, sun, chunks, maxChunkZ: 0, drone, catapult, entities, refineries, bombs, clouds, shadow, debris, flash };

        // initial terrain (seed 0) for the idle/menu view
        chunks.forEach((c, i) => regenChunk(c, i * CHUNK_LEN));
        three.current.maxChunkZ = (NUM_CHUNKS - 1) * CHUNK_LEN;

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(mount);

        g.current = freshState();
        placeIdle();
        renderer.render(scene, camera);

        return () => {
            ro.disconnect();
            if (g.current && g.current.raf) cancelAnimationFrame(g.current.raf);
            audioEngine.stopMusic();
            audioEngine.stopDroneMusic();
            renderer.dispose();
            scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- Input + lifecycle ----------
    useEffect(() => {
        fetchDroneFlightLeaderboard().then(data => { if (Array.isArray(data)) setLeaderboard(data); });

        const onKeyDown = (e) => {
            const k = e.key.toLowerCase();
            if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); pressStart(0); }
            if (e.key === 'ArrowLeft' || k === 'a' || k === 'ф') input.current.keySteer = -1;
            if (e.key === 'ArrowRight' || k === 'd' || k === 'в') input.current.keySteer = 1;
            if (k === 'p' || k === 'з') togglePause();
            if (k === 'b' || k === 'и' || e.key === 'Enter') dropBomb();
        };
        const onKeyUp = (e) => {
            const k = e.key.toLowerCase();
            if (e.key === ' ' || e.key === 'ArrowUp') input.current.thrust = false;
            if (e.key === 'ArrowLeft' || k === 'a' || k === 'ф') { if (input.current.keySteer < 0) input.current.keySteer = 0; }
            if (e.key === 'ArrowRight' || k === 'd' || k === 'в') { if (input.current.keySteer > 0) input.current.keySteer = 0; }
        };
        const onVis = () => { if (document.hidden) togglePause(true); };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('visibilitychange', onVis);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resize = () => {
        const mount = mountRef.current;
        const { camera, renderer } = three.current;
        if (!mount || !renderer) return;
        const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };

    function freshState() {
        return {
            phase: 'power',
            pos: new THREE.Vector3(0, 1.6, 0),
            vel: new THREE.Vector3(0, 0, 0),
            cam: new THREE.Vector3(0, 6, -13),
            fuel: FUEL_MAX, honey: 0, distance: 0,
            power: 0, angleNorm: 0, roll: 0,
            gameTime: 0, lastFrame: 0, fs: 1,
            paused: false, pausedAt: 0, pausedTotal: 0, startedAt: 0,
            isOver: false, crashing: false, crashTimer: 0,
            nextSpawnZ: 70, nextRefineryZ: 1500,
            bombCooldown: 0, refineries: 0, shake: 0,
            raf: null
        };
    }

    function placeIdle() {
        const { drone, catapult, camera, scene, renderer } = three.current;
        drone.visible = true;
        drone.position.set(0, 1.7, 1.5);
        drone.rotation.set(-0.5, 0, 0);
        catapult.visible = true;
        camera.position.set(0, 6, -13);
        camera.lookAt(0, 2, 10);
        renderer.render(scene, camera);
    }

    function togglePause(force) {
        const s = g.current;
        if (!s || s.isOver || s.crashing || !playing.current) return;
        const next = typeof force === 'boolean' ? force : !s.paused;
        if (next === s.paused) return;
        s.paused = next;
        setIsPaused(next);
        if (next) { s.pausedAt = performance.now(); audioEngine.suspend(); }
        else { s.pausedTotal += performance.now() - s.pausedAt; audioEngine.resume(); }
    }

    const toggleMute = () => {
        const next = !audioEngine.muted;
        audioEngine.setMuted(next);
        setIsMuted(next);
    };

    const startGame = async () => {
        await audioEngine.init();
        const { entities, refineries, bombs, catapult, drone, shadow } = three.current;
        g.current = freshState();
        input.current = { thrust: false, keySteer: 0, dragSteer: 0, dragOrigin: 0 };
        playing.current = true;
        // fresh random course
        TERRAIN_SEED = Math.random() * 5000;
        three.current.chunks.forEach((c, i) => regenChunk(c, i * CHUNK_LEN));
        three.current.maxChunkZ = (NUM_CHUNKS - 1) * CHUNK_LEN;
        entities.forEach(e => { e.group.visible = false; e.active = false; });
        refineries.forEach(r => { r.group.visible = false; r.free = true; r.alive = false; });
        bombs.forEach(b => { b.mesh.visible = false; b.active = false; });
        catapult.visible = true;
        drone.visible = true;
        if (shadow) shadow.visible = true;
        setGameStarted(true);
        setGameOver(false);
        setIsPaused(false);
        setPhase('power');
        audioEngine.startDroneMusic();
        loop(0);
    };

    const pressStart = (x) => {
        const s = g.current;
        if (!s || !playing.current || s.isOver || s.crashing || s.paused) return;
        if (s.phase === 'power') { s.phase = 'angle'; setPhase('angle'); }
        else if (s.phase === 'angle') { launch(); }
        else if (s.phase === 'flying') { input.current.thrust = true; input.current.dragOrigin = x; }
    };
    const pressMove = (x) => {
        const s = g.current;
        if (!s || s.phase !== 'flying' || !input.current.thrust) return;
        input.current.dragSteer = Math.max(-1, Math.min(1, (x - input.current.dragOrigin) / 60));
    };
    const pressEnd = () => { input.current.thrust = false; input.current.dragSteer = 0; };

    const dropBomb = () => {
        const s = g.current;
        if (!s || !playing.current || s.phase !== 'flying' || s.isOver || s.crashing || s.paused) return;
        if (s.bombCooldown > 0) return;
        const { bombs, drone } = three.current;
        const b = bombs.find(x => !x.active);
        if (!b) return;
        b.active = true;
        b.mesh.visible = true;
        b.mesh.position.copy(drone.position);
        // Mostly straight down (only a little forward carry) so "fly over → drop" lands on target
        b.vx = s.vel.x * 0.5; b.vy = -0.08; b.vz = s.vel.z * 0.3;
        s.bombCooldown = BOMB_COOLDOWN;
        audioEngine.playShoot();
    };

    const launch = () => {
        const s = g.current;
        const angleDeg = 18 + s.angleNorm * 52;
        const rad = angleDeg * Math.PI / 180;
        const speed = 0.5 + s.power * (MAX_LAUNCH_SPEED - 0.5);
        s.vel.set(0, Math.sin(rad) * speed, Math.cos(rad) * speed);
        s.phase = 'flying';
        setPhase('flying');
        three.current.catapult.visible = false;
        audioEngine.playExplosion();
    };

    const endGame = () => {
        const s = g.current;
        s.isOver = true;
        playing.current = false;
        const dist = Math.floor(s.distance);
        const score = dist + s.honey * HONEY_POINTS + s.refineries * REFINERY_POINTS;
        setFinalDist(dist);
        setFinalScore(score);
        setGameOver(true);
        audioEngine.stopMusic();
        audioEngine.stopDroneMusic();
        if (score > best) { setBest(score); localStorage.setItem('droneFlightBest', String(score)); }
        const playTimeMs = Math.round(performance.now() - (s.startedAt || performance.now()) - s.pausedTotal);
        saveDroneFlightScore({ score, metrics: { distance: dist, honey: s.honey, playTimeMs } })
            .then(() => fetchDroneFlightLeaderboard().then(data => { if (Array.isArray(data)) setLeaderboard(data); }));
    };

    const crash = () => {
        const s = g.current;
        if (s.crashing || s.isOver) return;
        s.crashing = true;
        playing.current = false;
        input.current.thrust = false;
        audioEngine.stopDroneMusic();
        const { drone, debris, flash, shadow } = three.current;
        drone.visible = false;
        if (shadow) shadow.visible = false;
        debris.forEach(d => {
            d.mesh.position.copy(drone.position);
            d.mesh.visible = true;
            d.vx = (Math.random() - 0.5) * 0.7; d.vy = Math.random() * 0.5 + 0.15; d.vz = (Math.random() - 0.5) * 0.7;
            d.ax = (Math.random() - 0.5) * 0.3; d.ay = (Math.random() - 0.5) * 0.3; d.az = (Math.random() - 0.5) * 0.3;
        });
        flash.position.copy(drone.position); flash.scale.setScalar(1); flash.material.opacity = 0.9; flash.visible = true;
        audioEngine.playExplosion();
        setTimeout(() => audioEngine.playExplosion(), 120);
        s.crashTimer = 80;
    };

    // ---------- Game loop ----------
    const loop = (timestamp) => {
        const s = g.current;
        if (!s || s.isOver) return;
        if (s.paused) { s.lastFrame = timestamp; s.raf = requestAnimationFrame(loop); return; }
        const elapsed = Math.min(timestamp - (s.lastFrame || timestamp), 50);
        s.lastFrame = timestamp;
        s.fs = elapsed / 16.667;
        s.gameTime = timestamp - s.pausedTotal;
        if (!s.startedAt) s.startedAt = timestamp;
        update();
        render();
        s.raf = requestAnimationFrame(loop);
    };

    const update = () => {
        const s = g.current;
        if (s.crashing) { updateCrash(s); return; }

        const fs = s.fs * GAME_SPEED;
        const { drone, catapult } = three.current;

        if (s.phase === 'power') {
            s.power = (Math.sin(s.gameTime / 300) + 1) / 2;
            if (gaugeBarRef.current) gaugeBarRef.current.style.width = `${s.power * 100}%`;
            drone.position.set(0, 1.7, 1.5); drone.rotation.set(-0.5, 0, 0);
            return;
        }
        if (s.phase === 'angle') {
            s.angleNorm = (Math.sin(s.gameTime / 250) + 1) / 2;
            if (gaugeBarRef.current) gaugeBarRef.current.style.width = `${s.angleNorm * 100}%`;
            drone.rotation.set(-(18 + s.angleNorm * 52) * Math.PI / 180, 0, 0);
            return;
        }

        // Flying physics
        s.vel.y -= GRAVITY * fs;
        if (input.current.thrust && s.fuel > 0) {
            s.vel.y += THRUST_UP * fs;
            s.vel.z += THRUST_FWD * fs;
            s.fuel = Math.max(0, s.fuel - FUEL_BURN * fs);
        }
        const steer = Math.max(-1, Math.min(1, input.current.keySteer + input.current.dragSteer));
        s.vel.x += steer * STEER_ACCEL * fs;
        s.vel.x *= Math.pow(STEER_DAMP, fs);
        s.vel.z -= s.vel.z * AIR_DRAG * fs;
        if (s.vel.z < 0) s.vel.z = 0;

        s.pos.x += s.vel.x * fs;
        s.pos.y += s.vel.y * fs;
        s.pos.z += s.vel.z * fs;

        if (s.pos.x < -TRACK_HALF) { s.pos.x = -TRACK_HALF; s.vel.x = Math.abs(s.vel.x) * 0.3; }
        if (s.pos.x > TRACK_HALF) { s.pos.x = TRACK_HALF; s.vel.x = -Math.abs(s.vel.x) * 0.3; }

        // Crash into the terrain
        if (s.pos.y - GROUND_CLEAR <= heightAt(s.pos.x, s.pos.z)) { crash(); return; }

        // Crash into an obstacle (building / tree / rock) in the corridor
        const ch = chunkAt(s.pos.z);
        if (ch) {
            for (const o of ch.solids) {
                const dx = s.pos.x - o.wx, dz = s.pos.z - o.wz;
                if (dx * dx + dz * dz < (o.r + DRONE_R) * (o.r + DRONE_R) && s.pos.y - 0.3 < o.topY) { crash(); return; }
            }
        }
        // Crash into a still-standing refinery if you fly too low into it
        for (const r of three.current.refineries) {
            if (r.free || !r.alive) continue;
            const dx = s.pos.x - r.wx, dz = s.pos.z - r.wz;
            if (dx * dx + dz * dz < r.crashR * r.crashR && s.pos.y - 0.3 < r.topY) { crash(); return; }
        }

        s.distance = Math.max(s.distance, s.pos.z);

        // Dynamic music intensity tracks speed + thrust
        const thrusting = input.current.thrust && s.fuel > 0;
        const speedN = Math.min(1, s.vel.z / 5);
        audioEngine.setMusicIntensity(0.2 + speedN * 0.6 + (thrusting ? 0.15 : 0));

        s.roll += (-steer * 0.5 - s.roll) * Math.min(1, 0.2 * fs);
        drone.position.copy(s.pos);
        drone.rotation.set(Math.atan2(-s.vel.y, Math.max(s.vel.z, 0.3)) * 0.6, steer * -0.25, s.roll);
        catapult.visible = s.pos.z < 30;

        if (s.bombCooldown > 0) s.bombCooldown -= s.fs;

        spawnCollectibles();
        spawnRefineries();
        recycleChunks();
        recycleClouds();
        updateEntities();
        updateBombs();
        updateRefineries();

        if (distRef.current) distRef.current.textContent = Math.floor(s.distance);
        if (honeyRef.current) honeyRef.current.textContent = s.honey;
        if (refineryRef.current) refineryRef.current.textContent = s.refineries;
        if (fuelBarRef.current) {
            const r = Math.max(0, s.fuel / FUEL_MAX);
            fuelBarRef.current.style.width = `${r * 100}%`;
            fuelBarRef.current.style.background = r > 0.3 ? '#34d399' : '#ef4444';
        }
    };

    const updateCrash = (s) => {
        const fs = s.fs;
        const { debris, flash } = three.current;
        debris.forEach(d => {
            if (!d.mesh.visible) return;
            d.vy -= 0.02 * fs;
            d.mesh.position.x += d.vx * fs; d.mesh.position.y += d.vy * fs; d.mesh.position.z += d.vz * fs;
            d.mesh.rotation.x += d.ax * fs; d.mesh.rotation.y += d.ay * fs; d.mesh.rotation.z += d.az * fs;
            const gy = heightAt(d.mesh.position.x, d.mesh.position.z);
            if (d.mesh.position.y < gy + 0.2) { d.mesh.position.y = gy + 0.2; d.vy *= -0.3; d.vx *= 0.7; d.vz *= 0.7; }
        });
        if (flash.visible) {
            flash.scale.multiplyScalar(1 + 0.25 * fs);
            flash.material.opacity -= 0.05 * fs;
            if (flash.material.opacity <= 0) flash.visible = false;
        }
        s.crashTimer -= fs;
        if (s.crashTimer <= 0) {
            debris.forEach(d => { d.mesh.visible = false; });
            flash.visible = false;
            endGame();
        }
    };

    const chunkAt = (z) => three.current.chunks.find(c => z >= c.startZ && z < c.startZ + CHUNK_LEN);

    const recycleChunks = () => {
        const s = g.current;
        three.current.chunks.forEach(c => {
            if (c.startZ + CHUNK_LEN < s.pos.z - 24) {
                three.current.maxChunkZ += CHUNK_LEN;
                regenChunk(c, three.current.maxChunkZ);
            }
        });
    };

    const recycleClouds = () => {
        const s = g.current;
        three.current.clouds.forEach(c => {
            c.position.x += 0.03 * s.fs;
            if (c.position.z < s.pos.z - 40) {
                c.position.z = s.pos.z + 220 + Math.random() * 70;
                c.position.x = (Math.random() * 2 - 1) * 120;
                c.position.y = 46 + Math.random() * 30;
            }
        });
    };

    const spawnCollectibles = () => {
        const s = g.current;
        const { entities } = three.current;
        while (s.nextSpawnZ < s.pos.z + 190) {
            const e = entities.find(en => !en.active);
            if (!e) break;
            const type = pickType();
            const x = (Math.random() * 2 - 1) * (TRACK_HALF - 4);
            const y = heightAt(x, s.nextSpawnZ) + 4 + Math.random() * 12;
            setEntity(e, type, x, y, s.nextSpawnZ);
            s.nextSpawnZ += 18 + Math.random() * 24;
        }
    };

    const updateEntities = () => {
        const s = g.current;
        const { entities } = three.current;
        const dpos = s.pos;
        entities.forEach(e => {
            if (!e.active) return;
            if (e.group.position.z < dpos.z - 24) { e.active = false; e.group.visible = false; return; }
            e.group.rotation.y += 0.04 * s.fs;
            if (e.type === 'bird') e.group.position.y = e.baseY + Math.sin(s.gameTime / 140 + e.bob) * 1.2;
            const dx = e.group.position.x - dpos.x, dy = e.group.position.y - dpos.y, dz = e.group.position.z - dpos.z;
            if (dx * dx + dy * dy + dz * dz < (e.r + 1.4) * (e.r + 1.4)) {
                applyPickup(e); e.active = false; e.group.visible = false;
            }
        });
    };

    const applyPickup = (e) => {
        const s = g.current;
        if (e.type === 'fuel') { s.fuel = Math.min(FUEL_MAX, s.fuel + FUEL_PICKUP); audioEngine.playShoot(); }
        else if (e.type === 'honey') { s.honey += 1; audioEngine.playShoot(); }
        else if (e.type === 'boost') { s.vel.z += BOOST_SPEED; audioEngine.playShoot(); }
        else { s.vel.z *= 0.5; s.vel.y += 0.25; audioEngine.playExplosion(); } // birds / balloons stay "soft"
    };

    // --- Oil refineries (bomb targets) ---
    const spawnRefineries = () => {
        const s = g.current;
        const { refineries } = three.current;
        while (s.nextRefineryZ < s.pos.z + 220) {
            const r = refineries.find(x => x.free);
            if (!r) break;
            const x = (Math.random() * 2 - 1) * (TRACK_HALF - 6);
            const wz = s.nextRefineryZ;
            const gy = heightAt(x, wz);
            placeRefinery(r, x, gy, wz);
            s.nextRefineryZ += REFINERY_GAP_MIN + Math.random() * (REFINERY_GAP_MAX - REFINERY_GAP_MIN);
        }
    };

    const updateRefineries = () => {
        const s = g.current;
        three.current.refineries.forEach(r => {
            if (r.free) return;
            if (r.wz < s.pos.z - 30) { r.free = true; r.group.visible = false; return; }
            if (r.flash.visible) {
                r.flash.scale.multiplyScalar(1 + 0.2 * s.fs);
                r.flash.material.opacity -= 0.06 * s.fs;
                if (r.flash.material.opacity <= 0) r.flash.visible = false;
            }
            if (r.flame.visible) {
                r.flame.children.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(s.gameTime / 90 + i) * 0.35; });
                r.flame.rotation.y += 0.03 * s.fs;
            }
        });
    };

    const hitRefinery = (r) => {
        const s = g.current;
        r.alive = false;
        r.flame.visible = true;
        r.flash.visible = true; r.flash.scale.set(1, 1, 1); r.flash.material.opacity = 0.9;
        r.tankMat.color.set('#2b2b2b');
        r.tankMat.emissive.set('#5a1f00');
        r.tankMat.emissiveIntensity = 0.4;
        s.refineries += 1;
        s.shake = Math.max(s.shake, 14);
        audioEngine.playExplosion();
        setTimeout(() => audioEngine.playExplosion(), 130);
    };

    const updateBombs = () => {
        const s = g.current;
        const fs = s.fs * GAME_SPEED;
        const { bombs, refineries } = three.current;
        bombs.forEach(b => {
            if (!b.active) return;
            b.vy -= BOMB_GRAVITY * fs;
            b.mesh.position.x += b.vx * fs;
            b.mesh.position.y += b.vy * fs;
            b.mesh.position.z += b.vz * fs;
            b.mesh.rotation.x += 0.2 * fs;

            for (const r of refineries) {
                if (r.free || !r.alive) continue;
                const dx = b.mesh.position.x - r.wx, dz = b.mesh.position.z - r.wz;
                if (dx * dx + dz * dz < r.r * r.r && b.mesh.position.y < r.topY + 2) {
                    hitRefinery(r);
                    b.active = false; b.mesh.visible = false;
                    break;
                }
            }
            if (!b.active) return;

            if (b.mesh.position.y <= heightAt(b.mesh.position.x, b.mesh.position.z) + 0.2 || b.mesh.position.z < s.pos.z - 30) {
                b.active = false; b.mesh.visible = false;
            }
        });
    };

    const render = () => {
        const s = g.current;
        const { scene, camera, renderer, sky, shadow } = three.current;
        const desired = new THREE.Vector3(s.pos.x * 0.5, s.pos.y + 5.5, s.pos.z - 13);
        s.cam.lerp(desired, Math.min(1, 0.12 * s.fs));
        camera.position.copy(s.cam);
        if (s.crashing) { camera.position.x += (Math.random() - 0.5) * 0.5; camera.position.y += (Math.random() - 0.5) * 0.5; }
        if (s.shake > 0) {
            const k = s.shake * 0.03;
            camera.position.x += (Math.random() - 0.5) * k;
            camera.position.y += (Math.random() - 0.5) * k;
            s.shake -= s.fs;
        }
        camera.lookAt(s.pos.x * 0.5, s.pos.y + 1.5, s.pos.z + 8);
        if (sky) sky.position.set(camera.position.x, 0, camera.position.z);
        if (shadow && !s.crashing) {
            shadow.visible = true;
            const gy = heightAt(s.pos.x, s.pos.z);
            const alt = Math.max(0, s.pos.y - gy);
            shadow.position.set(s.pos.x, gy + 0.12, s.pos.z);
            shadow.scale.setScalar(_clamp(1 - alt * 0.03, 0.4, 1));
            shadow.material.opacity = _clamp(0.3 - alt * 0.012, 0.05, 0.3);
        }
        renderer.render(scene, camera);
    };

    // ---------- Geometry builders ----------
    function buildDrone() {
        const grp = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 2.6), new THREE.MeshStandardMaterial({ color: '#e5e7eb', flatShading: true }));
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 8), new THREE.MeshStandardMaterial({ color: '#9ca3af' }));
        nose.rotation.x = Math.PI / 2; nose.position.z = 1.7;
        const wing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: '#cbd5e1', flatShading: true }));
        wing.position.y = 0.05;
        const tailW = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: '#cbd5e1' }));
        tailW.position.z = -1.1;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.5), new THREE.MeshStandardMaterial({ color: '#cbd5e1' }));
        fin.position.set(0, 0.35, -1.1);
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0e7490', emissiveIntensity: 0.4 }));
        cockpit.position.set(0, 0.22, 0.6);
        grp.add(body, nose, wing, tailW, fin, cockpit);
        return grp;
    }

    function buildCatapult() {
        const grp = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: '#6b7280', flatShading: true });
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 5), mat); ramp.position.set(0, 1, 0); ramp.rotation.x = -0.5;
        const legA = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.4), mat); legA.position.set(0, 0.8, 1.4);
        const legB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), mat); legB.position.set(0, 0.4, -1.4);
        grp.add(ramp, legA, legB);
        return grp;
    }

    function buildEntity() {
        const group = new THREE.Group();
        const meshes = {};
        meshes.fuel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 10), new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#065f46', emissiveIntensity: 0.3, flatShading: true }));
        meshes.honey = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.7, 6), new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#b45309', emissiveIntensity: 0.4, flatShading: true }));
        meshes.honey.rotation.x = Math.PI / 2;
        meshes.boost = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshStandardMaterial({ color: '#60a5fa', emissive: '#1d4ed8', emissiveIntensity: 0.5, flatShading: true }));
        meshes.bird = new THREE.Group();
        const wmat = new THREE.MeshStandardMaterial({ color: '#374151', flatShading: true });
        const bw1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.6), wmat); bw1.position.x = -0.8; bw1.rotation.z = 0.4;
        const bw2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.6), wmat); bw2.position.x = 0.8; bw2.rotation.z = -0.4;
        meshes.bird.add(bw1, bw2);
        meshes.balloon = new THREE.Group();
        const ball = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 12), new THREE.MeshStandardMaterial({ color: '#dc2626', flatShading: true }));
        const tie = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 6), new THREE.MeshStandardMaterial({ color: '#991b1b' }));
        tie.position.y = -1.4; tie.rotation.x = Math.PI;
        meshes.balloon.add(ball, tie);
        Object.values(meshes).forEach(m => { m.visible = false; group.add(m); });
        return { group, meshes, type: null, active: false, r: 1.2, baseY: 0, bob: 0 };
    }

    function setEntity(e, type, x, y, z) {
        Object.values(e.meshes).forEach(m => { m.visible = false; });
        e.meshes[type].visible = true;
        e.type = type;
        e.r = type === 'balloon' ? 1.6 : (type === 'bird' ? 1.3 : 1.1);
        e.baseY = y; e.bob = Math.random() * Math.PI * 2;
        e.group.position.set(x, y, z); e.group.rotation.set(0, 0, 0);
        e.group.visible = true; e.active = true;
    }

    // Terrain chunk: a heightfield mesh + scattered props (trees / buildings / rocks)
    function buildChunk() {
        const cols = SEG_X + 1, rows = SEG_Z + 1;
        const pos = new Float32Array(cols * rows * 3);
        const col = new Float32Array(cols * rows * 3);
        const idx = [];
        for (let iz = 0; iz < SEG_Z; iz++) for (let ix = 0; ix < SEG_X; ix++) {
            const a = iz * cols + ix, b = a + 1, c = a + cols, d = c + 1;
            idx.push(a, c, b, b, c, d);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
        const group = new THREE.Group();
        group.add(mesh);
        const props = [];
        for (let i = 0; i < PROPS_PER_CHUNK; i++) { const p = buildProp(); group.add(p.group); props.push(p); }
        return { group, mesh, props, solids: [], startZ: 0 };
    }

    function regenChunk(chunk, startZ) {
        chunk.startZ = startZ;
        chunk.group.position.z = startZ;
        const geo = chunk.mesh.geometry;
        const pos = geo.attributes.position.array;
        const col = geo.attributes.color.array;
        const cols = SEG_X + 1, rows = SEG_Z + 1;
        const tmp = new THREE.Color();
        let p = 0;
        for (let iz = 0; iz < rows; iz++) {
            const lz = (iz / SEG_Z) * CHUNK_LEN;
            const wz = startZ + lz;
            for (let ix = 0; ix < cols; ix++) {
                const lx = -WORLD_W / 2 + (ix / SEG_X) * WORLD_W;
                const h = heightAt(lx, wz);
                pos[p] = lx; pos[p + 1] = h; pos[p + 2] = lz;
                colorAt(lx, wz, h, tmp);
                col[p] = tmp.r; col[p + 1] = tmp.g; col[p + 2] = tmp.b;
                p += 3;
            }
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
        chunk.solids.length = 0;
        const biome = biomeAt(startZ + CHUNK_LEN / 2);
        chunk.props.forEach(pr => configProp(pr, biome, startZ, chunk.solids));
    }

    function buildProp() {
        const group = new THREE.Group();
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 5), new THREE.MeshStandardMaterial({ color: '#5b3a1e' }));
        trunk.position.y = 0.8;
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 6), new THREE.MeshStandardMaterial({ color: '#1d6b3a', flatShading: true }));
        crown.position.y = 4;
        tree.add(trunk, crown);
        const building = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 6), new THREE.MeshStandardMaterial({ color: '#5a6573', flatShading: true, roughness: 0.9 }));
        box.position.y = 6;
        const winMat = new THREE.MeshStandardMaterial({ color: '#1a2233', emissive: '#ffd27a', emissiveIntensity: 0.8 });
        const win1 = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 9.6), winMat); win1.position.set(0, 6, -3.05); win1.rotation.y = Math.PI;
        const win2 = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 9.6), winMat); win2.position.set(0, 6, 3.05);
        building.add(box, win1, win2);
        const rock = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.5, 5), new THREE.MeshStandardMaterial({ color: '#7b7f72', flatShading: true }));
        rock.position.y = 1.75; rock.rotation.y = Math.random() * Math.PI;
        [tree, building, rock].forEach(m => { m.visible = false; group.add(m); });
        group.visible = false;
        return { group, parts: { tree, building, rock }, radius: 1.6, height: 5, solid: false, type: null };
    }

    function setProp(pr, type, lx, gy, lz, scale) {
        pr.parts.tree.visible = type === 'tree';
        pr.parts.building.visible = type === 'building';
        pr.parts.rock.visible = type === 'rock';
        pr.group.position.set(lx, gy, lz);
        pr.group.scale.setScalar(scale);
        pr.group.visible = true;
        const base = type === 'building' ? { r: 3.5, h: 12 } : type === 'rock' ? { r: 2.2, h: 3.5 } : { r: 1.6, h: 5.6 };
        pr.radius = base.r * scale;
        pr.height = base.h * scale;
        pr.type = type;
    }

    function configProp(pr, biome, startZ, solids) {
        const lx = (Math.random() * 2 - 1) * (WORLD_W / 2 - 6);
        const lz = Math.random() * CHUNK_LEN;
        const wz = startZ + lz;
        const inCorridor = Math.abs(lx) < TRACK_HALF;
        const safe = wz < 60; // keep the launch runway clear
        if (inCorridor && !safe && Math.random() < biome.obstacle) {
            const type = biome.prop;
            const scale = type === 'building' ? (0.9 + Math.random() * 1.6) : (0.8 + Math.random() * 1.3);
            const gy = heightAt(lx, wz);
            setProp(pr, type, lx, gy, lz, scale);
            pr.solid = true;
            solids.push({ wx: lx, wz, r: pr.radius * 0.7, topY: gy + pr.height });
        } else if (!inCorridor) {
            const type = Math.random() < 0.18 ? biome.prop : 'tree';
            const gy = heightAt(lx, wz);
            setProp(pr, type, lx, gy, lz, 0.7 + Math.random() * 1.2);
            pr.solid = false;
        } else {
            pr.group.visible = false; // keep the flight corridor mostly clear
            pr.solid = false;
        }
    }

    function buildDebris() {
        const pieces = [];
        const mat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', flatShading: true });
        for (let i = 0; i < 16; i++) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.4 + Math.random() * 0.5, 0.3, 0.4 + Math.random() * 0.6), mat);
            m.visible = false;
            pieces.push({ mesh: m, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0 });
        }
        return pieces;
    }

    // Oil refinery / storage depot — a bomb target
    function buildRefinery() {
        const group = new THREE.Group();
        const tankMat = new THREE.MeshStandardMaterial({ color: '#cfd3d6', emissive: '#000000', flatShading: true, roughness: 0.7 });
        const tanks = [];
        // Big storage tanks (3x3 cluster)
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                const t = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 8, 16), tankMat);
                t.position.set((i - 1) * 10, 4, (j - 0.5) * 11);
                group.add(t); tanks.push(t);
            }
        }
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 20, 8), new THREE.MeshStandardMaterial({ color: '#9aa0a6' }));
        tower.position.set(13, 10, -6); group.add(tower);
        const tower2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 15, 8), new THREE.MeshStandardMaterial({ color: '#9aa0a6' }));
        tower2.position.set(-13, 7.5, -6); group.add(tower2);
        const pipe = new THREE.Mesh(new THREE.BoxGeometry(28, 1.1, 1.1), new THREE.MeshStandardMaterial({ color: '#7c828a' }));
        pipe.position.set(0, 7, 7); group.add(pipe);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.9 }));
        beacon.position.set(13, 20.5, -6); group.add(beacon);

        const flame = new THREE.Group();
        for (let i = 0; i < 11; i++) {
            const f = new THREE.Mesh(
                new THREE.ConeGeometry(2.4 + Math.random() * 1.4, 6 + Math.random() * 4, 6),
                new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#fb923c', emissiveIntensity: 1.3, transparent: true, opacity: 0.92, flatShading: true })
            );
            f.position.set((Math.random() * 2 - 1) * 12, 5 + Math.random() * 4, (Math.random() * 2 - 1) * 6);
            flame.add(f);
        }
        flame.visible = false; group.add(flame);

        const flash = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false }));
        flash.position.y = 6; flash.visible = false; group.add(flash);

        group.visible = false;
        return { group, tanks, tankMat, flame, flash, wx: 0, wz: 0, r: 15, crashR: 15, topY: 0, alive: false, free: true };
    }

    function placeRefinery(r, x, gy, wz) {
        r.group.position.set(x, gy, wz);
        r.wx = x; r.wz = wz; r.topY = gy + 9;
        r.alive = true; r.free = false;
        r.flame.visible = false; r.flash.visible = false;
        r.tankMat.color.set('#cfd3d6');
        r.tankMat.emissive.set('#000000');
        r.tankMat.emissiveIntensity = 0;
        r.group.visible = true;
    }

    function buildBombs() {
        const arr = [];
        const mat = new THREE.MeshStandardMaterial({ color: '#1f2937', flatShading: true });
        const finMat = new THREE.MeshStandardMaterial({ color: '#374151' });
        for (let i = 0; i < NUM_BOMBS; i++) {
            const m = new THREE.Group();
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mat); body.scale.z = 1.7;
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.2), finMat); fin.position.z = -0.8;
            m.add(body, fin);
            m.visible = false;
            arr.push({ mesh: m, vx: 0, vy: 0, vz: 0, active: false });
        }
        return arr;
    }

    const hintText = phase === 'power'
        ? 'Тап — зафіксувати силу'
        : phase === 'angle'
            ? 'Тап — кут і запуск'
            : 'Тяга · маневр пальцем · 💣 бомба';

    return (
        <div className="drone-game-wrapper">
            <div
                className="drone-playfield"
                ref={mountRef}
                onPointerDown={(e) => { e.preventDefault(); pressStart(e.clientX); }}
                onPointerMove={(e) => pressMove(e.clientX)}
                onPointerUp={pressEnd}
                onPointerLeave={pressEnd}
                onPointerCancel={pressEnd}
            >
                {gameStarted && !gameOver && (
                    <>
                        <div className="drone-hud-top">
                            <span className="drone-dist"><b ref={distRef}>0</b> м</span>
                            <span className="drone-sub">🍯 <b ref={honeyRef}>0</b> · 🛢️ <b ref={refineryRef}>0</b> · рекорд {best}</span>
                            <div className="drone-fuel"><div ref={fuelBarRef} className="drone-fuel-fill" /></div>
                        </div>

                        {phase === 'flying' && (
                            <button
                                className="drone-bomb-btn"
                                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); dropBomb(); }}
                                title="Скинути бомбу (B)"
                            >💣</button>
                        )}

                        <div className="drone-icon-buttons">
                            <button className="game-icon-btn" onClick={(e) => { e.stopPropagation(); togglePause(); }} title="Пауза (P)">
                                {isPaused ? '▶' : '⏸'}
                            </button>
                            <button className="game-icon-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }} title={isMuted ? 'Звук' : 'Без звуку'}>
                                {isMuted ? '🔇' : '🔊'}
                            </button>
                        </div>

                        {(phase === 'power' || phase === 'angle') && !isPaused && (
                            <div className="drone-gauge">
                                <span>{phase === 'power' ? 'СИЛА' : 'КУТ'} — тапни</span>
                                <div className="drone-gauge-track">
                                    <div ref={gaugeBarRef} className={`drone-gauge-fill ${phase}`} />
                                </div>
                            </div>
                        )}

                        {!isPaused && <div className="drone-hint">{hintText}</div>}
                    </>
                )}

                {isPaused && gameStarted && !gameOver && (
                    <div className="drone-overlay" onClick={(e) => { e.stopPropagation(); togglePause(false); }}>
                        <h2>ПАУЗА</h2>
                        <button className="restart-btn" onClick={(e) => { e.stopPropagation(); togglePause(false); }}>Продовжити</button>
                    </div>
                )}

                {!gameStarted && (
                    <div className="drone-overlay">
                        <h2>Політ БПЛА</h2>
                        <p>Катапультою запусти розвідника й долети якнайдалі. Лови ⛽ пальне, 🍯 мед, ⚡ прискорення. Скидай 💣 на нафтобази — це очки. Не врізайся в рельєф, будівлі й дерева — БПЛА розіб'ється.</p>
                        <button className="restart-btn" onClick={startGame}>Почати</button>
                        {leaderboard.length > 0 && (
                            <div className="drone-leaderboard">
                                <h3>Топ пілотів</h3>
                                <table><tbody>
                                    {leaderboard.slice(0, 5).map((en, i) => (
                                        <tr key={i}><td>{i + 1}. {en.name || 'Анонім'}</td><td>{en.score}</td></tr>
                                    ))}
                                </tbody></table>
                            </div>
                        )}
                    </div>
                )}

                {gameOver && (
                    <div className="drone-overlay">
                        <h2>БПЛА РОЗБИВСЯ</h2>
                        <p className="drone-final">{finalDist} м · {finalScore} очок</p>
                        {finalScore >= best && finalScore > 0 && <p className="drone-record">🏆 Новий рекорд!</p>}
                        <button className="restart-btn" onClick={startGame}>Запустити ще раз</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DroneFlightGame;
