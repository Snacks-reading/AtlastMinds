export class VoiceController {
  constructor({ onStatus } = {}) {
    this.onStatus = onStatus || (() => {});
    this.synth = window.speechSynthesis || null;
    this.utterance = null;
    this.lastText = "";
    this.supported = !!(this.synth && window.SpeechSynthesisUtterance);
    this.paused = false;
    this.onStatus(this.supported ? "Voice ready" : "Voice unavailable in this browser");
  }

  speak(text) {
    if (!this.supported || !text) return;
    this.stop();
    this.lastText = text;
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.onend = () => this.onStatus("Voice complete");
    this.utterance.onerror = () => this.onStatus("Voice error");
    this.synth.speak(this.utterance);
    this.paused = false;
    this.onStatus("Speaking");
  }

  pause() {
    if (!this.supported || this.synth.paused) return;
    this.synth.pause();
    this.paused = true;
    this.onStatus("Paused");
  }

  resume() {
    if (!this.supported || !this.paused) return;
    this.synth.resume();
    this.paused = false;
    this.onStatus("Resumed");
  }

  repeat() {
    if (!this.supported || !this.lastText) return;
    this.speak(this.lastText);
  }

  stop() {
    if (!this.supported) return;
    this.synth.cancel();
  }
}
