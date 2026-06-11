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
        }
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
