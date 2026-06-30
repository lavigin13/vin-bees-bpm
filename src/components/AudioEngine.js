// Simple Web Audio API Synthesizer for Retro Games
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.bassLoop = null;
        this.nextNoteTime = 0;
        this.currentNote = 0;
        this.initialized = false;
        
        // Expanded dynamic sequence (MIDI note numbers, 0 for rest)
        this.sequence = [
            36, 36, 48, 36, 39, 39, 51, 39, 
            36, 36, 48, 36, 34, 34, 46, 34,
            36, 36, 48, 36, 39, 39, 51, 39,
            41, 41, 53, 41, 43, 43, 55, 43,
            36, 36, 48, 36, 39, 39, 51, 39,
            36, 36, 48, 36, 34, 34, 46, 34,
            32, 32, 44, 32, 31, 31, 43, 31,
            29, 29, 41, 29, 34, 34, 46, 34
        ];
        this.tempo = 140;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.muted = localStorage.getItem('beeInvadersMuted') === '1';
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
        localStorage.setItem('beeInvadersMuted', muted ? '1' : '0');
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : 0.5;
        }
    }

    // Pause/resume the whole audio context (used by the game pause)
    suspend() {
        if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend();
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
            // avoid a burst of catch-up notes after a long pause
            if (this.droneOn) this.droneNextTime = this.ctx.currentTime + 0.1;
        }
    }

    // ===== Drone Flight: procedural indie / lo-fi dynamic soundtrack =====
    // A gentle chord-progression with a pad, soft bass and an arpeggio whose
    // density and brightness rise with `intensity` (driven by the drone's speed
    // and thrust), so the music tracks the action.
    startDroneMusic() {
        this.init();
        if (this.droneOn) return;
        this.droneOn = true;
        this.droneIntensity = 0;
        this.droneStep = 0;
        this.droneNextTime = this.ctx.currentTime + 0.12;
        // Cmaj-ish lo-fi loop: Am7 · Fmaj7 · Cmaj7 · G  (root, pad triad, arp tones)
        this.droneChords = [
            { root: 45, pad: [57, 60, 64], arp: [57, 60, 64, 67] },
            { root: 41, pad: [53, 57, 60], arp: [53, 57, 60, 64] },
            { root: 48, pad: [55, 60, 64], arp: [55, 60, 64, 67] },
            { root: 43, pad: [55, 59, 62], arp: [55, 59, 62, 67] }
        ];
        this.droneSchedulerTick();
    }

    stopDroneMusic() {
        this.droneOn = false;
        if (this.droneTimer) clearTimeout(this.droneTimer);
    }

    setMusicIntensity(v) {
        this.droneIntensity = v < 0 ? 0 : v > 1 ? 1 : v;
    }

    droneSchedulerTick() {
        if (!this.droneOn) return;
        const bpm = 90 + this.droneIntensity * 36;
        const step16 = 60 / bpm / 4;
        while (this.droneNextTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.droneScheduleStep(this.droneStep, this.droneNextTime);
            this.droneStep += 1;
            this.droneNextTime += step16;
        }
        this.droneTimer = setTimeout(() => this.droneSchedulerTick(), this.lookahead);
    }

    droneScheduleStep(step, time) {
        const chord = this.droneChords[Math.floor(step / 16) % this.droneChords.length];
        const inBar = step % 16;
        const intensity = this.droneIntensity;

        // sustained pad at the start of each bar
        if (inBar === 0) {
            chord.pad.forEach(m => this.playTone(this.midiToFreq(m), time, 1.7, 'sine', 0.045, 0.35));
        }
        // soft bass on the beats
        if (inBar % 4 === 0) {
            this.playTone(this.midiToFreq(chord.root), time, 0.55, 'triangle', 0.11, 0.01);
        }
        // arpeggio — denser & brighter with intensity
        const every = intensity > 0.66 ? 1 : intensity > 0.33 ? 2 : 4;
        if (inBar % every === 0) {
            const note = chord.arp[Math.floor(step / every) % chord.arp.length] + 12;
            this.playTone(this.midiToFreq(note), time, 0.22, 'triangle', 0.05 + intensity * 0.04, 0.005);
        }
        // light hat on offbeats once things pick up
        if (intensity > 0.4 && inBar % 2 === 1) {
            this.playHat(time, 0.025 + intensity * 0.03);
        }
    }

    playTone(freq, time, dur, type = 'sine', vol = 0.1, attack = 0.02) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vol, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    playHat(time, vol = 0.03) {
        const bufferSize = this.ctx.sampleRate * 0.04;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
        noise.connect(hp); hp.connect(gain); gain.connect(this.masterGain);
        noise.start(time);
    }

    midiToFreq(m) {
        if (m === 0) return 0;
        return Math.pow(2, (m - 69) / 12) * 440;
    }

    scheduleNote(noteNumber, time) {
        const freq = this.midiToFreq(noteNumber);
        if (freq === 0) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2); // Decay
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(time);
        osc.stop(time + 0.25);
    }

    scheduler() {
        if (!this.isPlaying) return;
        
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.sequence[this.currentNote], this.nextNoteTime);
            this.nextNote();
        }
        this.bassLoop = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.currentNote = (this.currentNote + 1) % this.sequence.length;
    }

    startMusic() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.currentNote = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.bassLoop) {
            clearTimeout(this.bassLoop);
        }
    }

    playIntroMusic() {
        if (!this.initialized) return;
        this.ctx.resume();

        const sirenOsc = this.ctx.createOscillator();
        const sirenGain = this.ctx.createGain();
        
        sirenOsc.type = 'sawtooth';
        sirenOsc.connect(sirenGain);
        sirenGain.connect(this.masterGain);

        sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
        sirenGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.5);

        sirenOsc.frequency.setValueAtTime(400, this.ctx.currentTime);
        for (let i = 0; i < 5; i++) {
            sirenOsc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + i * 2 + 1);
            sirenOsc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + i * 2 + 2);
        }

        sirenOsc.start();
        
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'square';
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);
        
        const now = this.ctx.currentTime;
        for (let i = 0; i < 40; i++) {
            bassOsc.frequency.setValueAtTime(55, now + i * 0.125);
            bassGain.gain.setValueAtTime(0.2, now + i * 0.125);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.125 + 0.1);
        }
        
        bassOsc.start();
        this.introNodes = { sirenOsc, sirenGain, bassOsc, bassGain };
    }

    stopIntroMusic() {
        if (this.introNodes) {
            const now = this.ctx.currentTime;
            try {
                this.introNodes.sirenGain.gain.cancelScheduledValues(now);
                this.introNodes.bassGain.gain.cancelScheduledValues(now);
                this.introNodes.sirenGain.gain.linearRampToValueAtTime(0, now + 0.5);
                this.introNodes.bassGain.gain.linearRampToValueAtTime(0, now + 0.5);
                
                setTimeout(() => {
                    if (this.introNodes) {
                        this.introNodes.sirenOsc.stop();
                        this.introNodes.bassOsc.stop();
                        this.introNodes = null;
                    }
                }, 500);
            } catch {
                this.introNodes = null;
            }
        }
    }

    playShoot() {
        if (!this.initialized) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playExplosion() {
        if (!this.initialized) return;
        
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start();
    }
}

export const audioEngine = new AudioEngine();
