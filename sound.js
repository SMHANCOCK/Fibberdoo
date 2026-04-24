(function () {
  var ctx;
  var settings = { enabled: true, volume: 0.45 };
  function load() { try { settings = Object.assign(settings, JSON.parse(localStorage.getItem('perudoSoundSettings')) || {}); } catch (e) {} }
  function save() { localStorage.setItem('perudoSoundSettings', JSON.stringify(settings)); }
  function initSound() { load(); if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return settings; }
  function tone(freq, dur, type, delay) {
    load(); if (!settings.enabled) return;
    try {
      if (!ctx) initSound();
      var osc = ctx.createOscillator(); var gain = ctx.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + (delay || 0));
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, settings.volume * 0.22), ctx.currentTime + (delay || 0) + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (delay || 0) + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + (delay || 0)); osc.stop(ctx.currentTime + (delay || 0) + dur + 0.02);
    } catch (e) {}
  }
  function setSoundSettings(next) { settings = Object.assign(settings, next); save(); }
  function playDiceRollSound() { [190, 240, 160].forEach(function (f, i) { tone(f, .09, 'triangle', i * .055); }); }
  function playBidSound() { tone(520, .08, 'square'); tone(700, .08, 'sine', .06); }
  function playDudoSound() { tone(160, .16, 'sawtooth'); tone(90, .18, 'triangle', .11); }
  function playRevealSound() { tone(420, .08, 'triangle'); tone(620, .12, 'triangle', .08); }
  function playLoseDieSound() { tone(220, .18, 'sine'); tone(140, .2, 'sine', .08); }
  function playEliminationSound() { tone(130, .28, 'sawtooth'); }
  function playPalificoSound() { tone(330, .12, 'triangle'); tone(495, .12, 'triangle', .12); tone(660, .16, 'triangle', .24); }
  function playRankUpSound() { tone(520, .1, 'sine'); tone(780, .14, 'sine', .1); }
  function playRankDownSound() { tone(320, .12, 'sine'); tone(220, .14, 'sine', .1); }
  function playWinSound() { [440, 554, 659, 880].forEach(function (f, i) { tone(f, .14, 'triangle', i * .09); }); }
  function playSpeechPopSound() { tone(760, .045, 'sine'); }
  window.PerudoSound = { initSound: initSound, setSoundSettings: setSoundSettings, playDiceRollSound: playDiceRollSound, playBidSound: playBidSound, playDudoSound: playDudoSound, playRevealSound: playRevealSound, playLoseDieSound: playLoseDieSound, playEliminationSound: playEliminationSound, playPalificoSound: playPalificoSound, playRankUpSound: playRankUpSound, playRankDownSound: playRankDownSound, playWinSound: playWinSound, playSpeechPopSound: playSpeechPopSound };
  Object.assign(window, window.PerudoSound);
})();
