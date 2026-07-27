var capacitorCapacitorAudioRecorder = (function (exports, core) {
    'use strict';

    /**
     * The recording status.
     *
     * @since 1.0.0
     */
    exports.RecordingStatus = void 0;
    (function (RecordingStatus) {
        RecordingStatus["Inactive"] = "INACTIVE";
        RecordingStatus["Recording"] = "RECORDING";
        RecordingStatus["Paused"] = "PAUSED";
    })(exports.RecordingStatus || (exports.RecordingStatus = {}));
    /**
     * Audio session category options available on iOS.
     *
     * @since 1.0.0
     */
    exports.AudioSessionCategoryOption = void 0;
    (function (AudioSessionCategoryOption) {
        AudioSessionCategoryOption["AllowAirPlay"] = "ALLOW_AIR_PLAY";
        AudioSessionCategoryOption["AllowBluetooth"] = "ALLOW_BLUETOOTH";
        AudioSessionCategoryOption["AllowBluetoothA2DP"] = "ALLOW_BLUETOOTH_A2DP";
        AudioSessionCategoryOption["DefaultToSpeaker"] = "DEFAULT_TO_SPEAKER";
        AudioSessionCategoryOption["DuckOthers"] = "DUCK_OTHERS";
        AudioSessionCategoryOption["InterruptSpokenAudioAndMixWithOthers"] = "INTERRUPT_SPOKEN_AUDIO_AND_MIX_WITH_OTHERS";
        AudioSessionCategoryOption["MixWithOthers"] = "MIX_WITH_OTHERS";
        AudioSessionCategoryOption["OverrideMutedMicrophoneInterruption"] = "OVERRIDE_MUTED_MICROPHONE_INTERRUPTION";
    })(exports.AudioSessionCategoryOption || (exports.AudioSessionCategoryOption = {}));
    /**
     * Audio session modes available on iOS.
     *
     * @since 1.0.0
     */
    exports.AudioSessionMode = void 0;
    (function (AudioSessionMode) {
        AudioSessionMode["Default"] = "DEFAULT";
        AudioSessionMode["GameChat"] = "GAME_CHAT";
        AudioSessionMode["Measurement"] = "MEASUREMENT";
        AudioSessionMode["SpokenAudio"] = "SPOKEN_AUDIO";
        AudioSessionMode["VideoChat"] = "VIDEO_CHAT";
        AudioSessionMode["VideoRecording"] = "VIDEO_RECORDING";
        AudioSessionMode["VoiceChat"] = "VOICE_CHAT";
    })(exports.AudioSessionMode || (exports.AudioSessionMode = {}));

    const CapacitorAudioRecorder = core.registerPlugin('CapacitorAudioRecorder', {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.CapacitorAudioRecorderWeb()),
    });

    class CapacitorAudioRecorderWeb extends core.WebPlugin {
        constructor() {
            super(...arguments);
            this.mediaRecorder = null;
            this.mediaStream = null;
            this.recordedChunks = [];
            this.status = exports.RecordingStatus.Inactive;
            this.startTimestamp = null;
            this.pausedTimestamp = null;
            this.accumulatedPauseDuration = 0;
            this.stopResolver = null;
            this.stopRejector = null;
            this.audioContext = null;
            this.analyser = null;
            this.analyserBuffer = null;
        }
        async startRecording(_options) {
            var _a, _b;
            if (this.status === exports.RecordingStatus.Recording || this.status === exports.RecordingStatus.Paused) {
                throw this.unavailable('Recording already in progress.');
            }
            await this.ensurePermission(true);
            try {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            catch (error) {
                this.handleError(`Unable to acquire microphone: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
                throw error;
            }
            const mimeType = this.pickMimeType();
            try {
                this.mediaRecorder = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);
            }
            catch (error) {
                this.cleanupMediaStream();
                this.handleError(`Unable to initialise MediaRecorder: ${(_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : error}`);
                throw error;
            }
            this.recordedChunks = [];
            this.startTimestamp = Date.now();
            this.accumulatedPauseDuration = 0;
            this.pausedTimestamp = null;
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            });
            this.mediaRecorder.addEventListener('stop', () => {
                const result = this.buildStopResult();
                if (this.stopResolver) {
                    this.stopResolver(result);
                }
                this.notifyListeners('recordingStopped', result);
                this.resetStopHandlers();
                this.resetState();
            });
            this.mediaRecorder.addEventListener('error', (event) => {
                var _a, _b;
                const message = (_b = (_a = event === null || event === void 0 ? void 0 : event.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : 'Recording error.';
                this.handleError(message);
                if (this.stopRejector) {
                    this.stopRejector(new Error(message));
                }
                this.resetStopHandlers();
                this.resetState();
            });
            this.setupAnalyser();
            this.mediaRecorder.start();
            this.status = exports.RecordingStatus.Recording;
        }
        async pauseRecording() {
            if (!this.mediaRecorder || this.status !== exports.RecordingStatus.Recording) {
                throw this.unavailable('No active recording to pause.');
            }
            if (this.supportsRecorderPause()) {
                this.mediaRecorder.pause();
                this.status = exports.RecordingStatus.Paused;
                this.pausedTimestamp = Date.now();
                this.notifyListeners('recordingPaused', {});
            }
            else {
                throw this.unavailable('Pausing recordings is not supported in this browser.');
            }
        }
        async resumeRecording() {
            if (!this.mediaRecorder || this.status !== exports.RecordingStatus.Paused) {
                throw this.unavailable('No paused recording to resume.');
            }
            if (this.supportsRecorderPause()) {
                this.mediaRecorder.resume();
                if (this.pausedTimestamp) {
                    this.accumulatedPauseDuration += Date.now() - this.pausedTimestamp;
                }
                this.pausedTimestamp = null;
                this.status = exports.RecordingStatus.Recording;
            }
            else {
                throw this.unavailable('Resuming recordings is not supported in this browser.');
            }
        }
        async stopRecording() {
            var _a;
            if (!this.mediaRecorder || this.status === exports.RecordingStatus.Inactive) {
                throw this.unavailable('No active recording to stop.');
            }
            if (this.status === exports.RecordingStatus.Paused && this.pausedTimestamp) {
                this.accumulatedPauseDuration += Date.now() - this.pausedTimestamp;
                this.pausedTimestamp = null;
            }
            const stopPromise = new Promise((resolve, reject) => {
                this.stopResolver = resolve;
                this.stopRejector = reject;
            });
            try {
                this.mediaRecorder.stop();
            }
            catch (error) {
                this.resetStopHandlers();
                this.resetState();
                this.handleError(`Unable to stop recorder: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
                throw error;
            }
            return stopPromise;
        }
        async cancelRecording() {
            if (!this.mediaRecorder || this.status === exports.RecordingStatus.Inactive) {
                this.resetState();
                return;
            }
            try {
                this.mediaRecorder.stop();
            }
            catch (_a) {
                // Ignored.
            }
            this.resetStopHandlers();
            this.resetState();
        }
        async getRecordingStatus() {
            return { status: this.status };
        }
        async getCurrentAmplitude() {
            if (this.status !== exports.RecordingStatus.Recording || !this.analyser || !this.analyserBuffer) {
                return { value: 0 };
            }
            this.analyser.getFloatTimeDomainData(this.analyserBuffer);
            let sumOfSquares = 0;
            for (const sample of this.analyserBuffer) {
                sumOfSquares += sample * sample;
            }
            const rms = Math.sqrt(sumOfSquares / this.analyserBuffer.length);
            return { value: Math.max(0, Math.min(1, rms)) };
        }
        async checkPermissions() {
            const state = await this.getPermissionState();
            return { recordAudio: state };
        }
        async requestPermissions() {
            const state = await this.ensurePermission(true);
            return { recordAudio: state };
        }
        async addListener(eventName, listenerFunc) {
            return super.addListener(eventName, listenerFunc);
        }
        async removeAllListeners() {
            await super.removeAllListeners();
        }
        async getPluginVersion() {
            return { version: 'web' };
        }
        // Helpers
        supportsRecorderPause() {
            return (!!this.mediaRecorder &&
                typeof this.mediaRecorder.pause === 'function' &&
                typeof this.mediaRecorder.resume === 'function');
        }
        pickMimeType() {
            const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
            for (const type of preferred) {
                if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
                    return type;
                }
            }
            return undefined;
        }
        buildStopResult() {
            const blob = this.recordedChunks.length > 0
                ? new Blob(this.recordedChunks, { type: this.pickMimeType() || 'audio/webm' })
                : undefined;
            let duration;
            if (this.startTimestamp) {
                duration = Date.now() - this.startTimestamp - this.accumulatedPauseDuration;
            }
            return {
                blob,
                duration,
            };
        }
        resetStopHandlers() {
            this.stopResolver = null;
            this.stopRejector = null;
        }
        resetState() {
            this.status = exports.RecordingStatus.Inactive;
            this.startTimestamp = null;
            this.pausedTimestamp = null;
            this.accumulatedPauseDuration = 0;
            this.recordedChunks = [];
            this.teardownAnalyser();
            this.cleanupMediaStream();
            if (this.mediaRecorder) {
                const recorder = this.mediaRecorder;
                recorder.ondataavailable = null;
                recorder.onstop = null;
                recorder.onerror = null;
            }
            this.mediaRecorder = null;
        }
        setupAnalyser() {
            if (!this.mediaStream) {
                return;
            }
            try {
                const AudioContextCtor = typeof AudioContext !== 'undefined'
                    ? AudioContext
                    : globalThis.webkitAudioContext;
                if (!AudioContextCtor) {
                    return;
                }
                const context = new AudioContextCtor();
                this.audioContext = context;
                const source = context.createMediaStreamSource(this.mediaStream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 1024;
                source.connect(analyser);
                this.analyser = analyser;
                this.analyserBuffer = new Float32Array(new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT));
            }
            catch (_a) {
                this.teardownAnalyser();
            }
        }
        teardownAnalyser() {
            if (this.analyser) {
                try {
                    this.analyser.disconnect();
                }
                catch (_a) {
                    // Ignored.
                }
            }
            this.analyser = null;
            this.analyserBuffer = null;
            if (this.audioContext) {
                void this.audioContext.close().catch(() => {
                    // Ignored.
                });
            }
            this.audioContext = null;
        }
        cleanupMediaStream() {
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach((track) => track.stop());
            }
            this.mediaStream = null;
        }
        async ensurePermission(request) {
            const currentState = await this.getPermissionState();
            if (currentState === 'granted' || !request) {
                return currentState;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach((track) => track.stop());
                return 'granted';
            }
            catch (error) {
                return 'denied';
            }
        }
        async getPermissionState() {
            var _a;
            if (!((_a = navigator.permissions) === null || _a === void 0 ? void 0 : _a.query)) {
                return 'prompt';
            }
            try {
                const result = await navigator.permissions.query({ name: 'microphone' });
                switch (result.state) {
                    case 'granted':
                        return 'granted';
                    case 'denied':
                        return 'denied';
                    default:
                        return 'prompt';
                }
            }
            catch (_b) {
                return 'prompt';
            }
        }
        handleError(message) {
            this.status = exports.RecordingStatus.Inactive;
            this.notifyListeners('recordingError', { message });
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        CapacitorAudioRecorderWeb: CapacitorAudioRecorderWeb
    });

    exports.CapacitorAudioRecorder = CapacitorAudioRecorder;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
