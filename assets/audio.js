import { DEFAULT_AUDIO_SETTINGS } from "./storage.js";
import { getModeConfig } from "./modes.js";
const EVENT_CUE_URLS = {
    level: './audio/level-up-fanfare.mp3',
    gameover: './audio/game-over.mp3',
};
const TRACK_URLS = {
    tutorial: './audio/tutorial-theme.mp3',
    beginner: './audio/beginner-theme.mp3',
    intermediate: './audio/intermediate-theme.mp3',
    advanced: './audio/advanced-theme.mp3',
    expert: './audio/expert-theme.mp3',
    boss: './audio/boss-theme.mp3',
};
export class SoundManager {
    context = null;
    master = null;
    bgmGain = null;
    sfxGain = null;
    settings = { ...DEFAULT_AUDIO_SETTINGS };
    buffers = new Map();
    loading = new Map();
    eventBuffers = new Map();
    eventLoading = new Map();
    source = null;
    sourceGain = null;
    activeTrack = null;
    pendingTrack = null;
    trackRequest = 0;
    setSettings(settings) {
        this.settings = { ...settings };
        if (this.bgmGain) {
            this.bgmGain.gain.setTargetAtTime(this.settings.muteBgm ? 0 : this.settings.bgmVolume * 0.34, this.context?.currentTime ?? 0, 0.04);
        }
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(this.settings.muteSfx ? 0 : this.settings.sfxVolume * 0.62, this.context?.currentTime ?? 0, 0.025);
        }
    }
    getSettings() {
        return { ...this.settings };
    }
    async unlock() {
        if (typeof window === 'undefined' || !('AudioContext' in window))
            return;
        if (!this.context) {
            this.context = new AudioContext();
            this.master = this.context.createGain();
            this.master.gain.value = 0.78;
            this.master.connect(this.context.destination);
            this.bgmGain = this.context.createGain();
            this.bgmGain.gain.value = this.settings.muteBgm ? 0 : this.settings.bgmVolume * 0.34;
            this.bgmGain.connect(this.master);
            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.settings.muteSfx ? 0 : this.settings.sfxVolume * 0.62;
            this.sfxGain.connect(this.master);
        }
        if (this.context.state === 'suspended')
            await this.context.resume();
        // Preload mandatory event cues after the first user gesture so they are ready at the moment they are needed.
        void this.loadEventCue('level').catch((error) => console.warn('Level-up cue preload failed.', error));
        void this.loadEventCue('gameover').catch((error) => console.warn('Game-over cue preload failed.', error));
    }
    /** Starts the mode-specific exploration loop or the shared boss theme. */
    startBgm(modeId, boss = false) {
        if (!this.context || !this.bgmGain)
            return;
        const track = boss ? 'boss' : getModeConfig(modeId).bgmTrack;
        if (this.activeTrack === track && this.source)
            return;
        if (this.pendingTrack === track)
            return;
        this.pendingTrack = track;
        const request = ++this.trackRequest;
        void this.startTrack(track, request);
    }
    async startTrack(track, request) {
        if (!this.context || !this.bgmGain)
            return;
        try {
            const buffer = await this.loadTrack(track);
            if (request !== this.trackRequest || !this.context || !this.bgmGain)
                return;
            if (this.context.state === 'suspended')
                await this.context.resume();
            if (request !== this.trackRequest)
                return;
            const now = this.context.currentTime;
            const nextSource = this.context.createBufferSource();
            const nextGain = this.context.createGain();
            nextSource.buffer = buffer;
            nextSource.loop = true;
            nextGain.gain.setValueAtTime(0.0001, now);
            nextGain.gain.exponentialRampToValueAtTime(1, now + 0.55);
            nextSource.connect(nextGain).connect(this.bgmGain);
            nextSource.start(now);
            const previousSource = this.source;
            const previousGain = this.sourceGain;
            if (previousSource && previousGain) {
                previousGain.gain.cancelScheduledValues(now);
                previousGain.gain.setValueAtTime(Math.max(0.0001, previousGain.gain.value), now);
                previousGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
                window.setTimeout(() => {
                    try {
                        previousSource.stop();
                    }
                    catch { /* already stopped */ }
                    previousSource.disconnect();
                    previousGain.disconnect();
                }, 380);
            }
            this.source = nextSource;
            this.sourceGain = nextGain;
            this.activeTrack = track;
            this.pendingTrack = null;
            nextSource.onended = () => {
                if (this.source === nextSource) {
                    this.source = null;
                    this.sourceGain = null;
                    this.activeTrack = null;
                }
            };
        }
        catch (error) {
            if (request === this.trackRequest)
                this.pendingTrack = null;
            console.warn(`Could not load ${track} BGM.`, error);
        }
    }
    loadTrack(track) {
        const cached = this.buffers.get(track);
        if (cached)
            return Promise.resolve(cached);
        const inFlight = this.loading.get(track);
        if (inFlight)
            return inFlight;
        if (!this.context)
            return Promise.reject(new Error('AudioContext is not ready.'));
        const task = (async () => {
            const response = await fetch(new URL(TRACK_URLS[track], document.baseURI));
            if (!response.ok)
                throw new Error(`BGM request failed: ${response.status}`);
            const encoded = await response.arrayBuffer();
            const decoded = await this.context.decodeAudioData(encoded.slice(0));
            this.buffers.set(track, decoded);
            return decoded;
        })();
        this.loading.set(track, task);
        void task.finally(() => this.loading.delete(track)).catch(() => undefined);
        return task;
    }
    stopBgm() {
        this.trackRequest += 1;
        this.pendingTrack = null;
        this.activeTrack = null;
        if (!this.context || !this.source || !this.sourceGain)
            return;
        const source = this.source;
        const gain = this.sourceGain;
        const now = this.context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        this.source = null;
        this.sourceGain = null;
        window.setTimeout(() => {
            try {
                source.stop();
            }
            catch { /* already stopped */ }
            source.disconnect();
            gain.disconnect();
        }, 230);
    }
    /** Short action sounds use synthesis; mandatory progression/end cues use authored audio assets. */
    effect(effect) {
        if (effect === 'level' || effect === 'gameover') {
            void this.playEventCue(effect);
            return;
        }
        this.effectSequence([effect]);
    }
    effectSequence(effects) {
        if (!this.context || !this.sfxGain || this.settings.muteSfx || this.settings.sfxVolume <= 0)
            return;
        const now = this.context.currentTime;
        let offset = 0;
        for (const effect of effects) {
            if (effect === 'level' || effect === 'gameover') {
                void this.playEventCue(effect, now + offset);
                offset += effect === 'level' ? 2.65 : 3.8;
            }
            else {
                this.playEffect(effect, now + offset);
                offset += 0.115;
            }
        }
    }
    async loadEventCue(cue) {
        const cached = this.eventBuffers.get(cue);
        if (cached)
            return cached;
        const inFlight = this.eventLoading.get(cue);
        if (inFlight)
            return inFlight;
        if (!this.context)
            throw new Error('AudioContext is not ready.');
        const task = (async () => {
            const response = await fetch(new URL(EVENT_CUE_URLS[cue], document.baseURI));
            if (!response.ok)
                throw new Error(`Event cue request failed: ${response.status}`);
            const encoded = await response.arrayBuffer();
            const decoded = await this.context.decodeAudioData(encoded.slice(0));
            this.eventBuffers.set(cue, decoded);
            return decoded;
        })();
        this.eventLoading.set(cue, task);
        void task.finally(() => this.eventLoading.delete(cue)).catch(() => undefined);
        return task;
    }
    async playEventCue(cue, requestedStart) {
        if (!this.context || !this.sfxGain || this.settings.muteSfx || this.settings.sfxVolume <= 0)
            return;
        try {
            const buffer = await this.loadEventCue(cue);
            if (!this.context || !this.sfxGain || this.settings.muteSfx || this.settings.sfxVolume <= 0)
                return;
            if (this.context.state === 'suspended')
                await this.context.resume();
            const source = this.context.createBufferSource();
            const envelope = this.context.createGain();
            const now = this.context.currentTime;
            const startAt = Math.max(now + 0.015, requestedStart ?? now + 0.015);
            source.buffer = buffer;
            envelope.gain.setValueAtTime(0.0001, startAt);
            envelope.gain.linearRampToValueAtTime(0.82, startAt + 0.035);
            envelope.gain.setValueAtTime(0.82, startAt + Math.max(0.04, buffer.duration - 0.10));
            envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + buffer.duration);
            source.connect(envelope).connect(this.sfxGain);
            source.start(startAt);
            source.onended = () => { source.disconnect(); envelope.disconnect(); };
        }
        catch (error) {
            console.warn(`Could not load ${cue} cue; using synthesized fallback.`, error);
            if (this.context && this.sfxGain && !this.settings.muteSfx && this.settings.sfxVolume > 0) {
                this.playEffect(cue, this.context.currentTime + 0.015);
            }
        }
    }
    playEffect(effect, startAt) {
        if (!this.context || !this.sfxGain)
            return;
        const map = {
            move: { frequency: 250, duration: 0.055, type: 'square', level: 0.13, sweep: 210 },
            // Attack and damage intentionally use a single stable pitch, just like the movement cue.
            attack: { frequency: 392, duration: 0.075, type: 'triangle', level: 0.18 },
            damage: { frequency: 174.61, duration: 0.095, type: 'sine', level: 0.20 },
            defeat: { frequency: 523.25, duration: 0.18, type: 'triangle', level: 0.18, sweep: 659.25 },
            item: { frequency: 659.25, duration: 0.20, type: 'sine', level: 0.16, sweep: 783.99 },
            level: { frequency: 440, duration: 0.38, type: 'triangle', level: 0.18, sweep: 880 },
            boss: { frequency: 110, duration: 0.40, type: 'sawtooth', level: 0.13, sweep: 73.42 },
            gameover: { frequency: 220, duration: 0.70, type: 'triangle', level: 0.17, sweep: 110 },
            clear: { frequency: 523.25, duration: 0.64, type: 'sine', level: 0.17, sweep: 1046.5 },
        };
        const spec = map[effect];
        const oscillator = this.context.createOscillator();
        const envelope = this.context.createGain();
        oscillator.type = spec.type;
        oscillator.frequency.setValueAtTime(spec.frequency, startAt);
        if (spec.sweep)
            oscillator.frequency.exponentialRampToValueAtTime(spec.sweep, startAt + spec.duration);
        envelope.gain.setValueAtTime(0.0001, startAt);
        envelope.gain.exponentialRampToValueAtTime(spec.level, startAt + Math.min(0.012, spec.duration * 0.22));
        envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + spec.duration);
        oscillator.connect(envelope).connect(this.sfxGain);
        oscillator.start(startAt);
        oscillator.stop(startAt + spec.duration + 0.015);
        oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
        };
    }
}
