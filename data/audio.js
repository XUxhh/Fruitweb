/* 果物奇观 · 背景音乐（大航海时代氛围）
   右上角音乐按钮：点击切换播放/暂停（开关）；鼠标悬停按钮时左侧滑出音量滑块。
   音乐由 Web Audio 合成的柔和氛围和弦，无需外部音频文件；
   如需换成真实曲目，可在 start() 里改为播放 <audio> 元素。 */
(function () {
  "use strict";
  if (document.getElementById("musicCtl")) return;

  // ---------- 注入样式 ----------
  var style = document.createElement("style");
  style.textContent = [
    '.music-ctl{position:fixed;top:15px;right:76px;z-index:70;display:flex;align-items:center;gap:8px;}',
    '.music-ctl__btn{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;cursor:pointer;border:1px solid rgba(69,118,53,.28);background:rgba(255,255,255,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#457635;box-shadow:0 6px 18px rgba(90,92,66,.16);transition:transform .25s cubic-bezier(.22,1,.36,1),background .25s,color .25s,border-color .25s;}',
    '.music-ctl__btn:hover{transform:translateY(-2px);}',
    '.music-ctl__btn.on{background:#6B9136;color:#F8EBBD;border-color:#6B9136;}',
    '.music-ctl__btn svg{width:20px;height:20px;display:block;}',
    '.music-ctl__btn .eq{display:none;}',
    '.music-ctl__btn.on .eq{display:block;}',
    '.music-ctl__btn.on .note{display:none;}',
    '.music-ctl__vol{width:0;overflow:hidden;opacity:0;transition:width .4s cubic-bezier(.2,.7,.2,1),opacity .3s;}',
    '.music-ctl__vol-inner{display:flex;align-items:center;gap:10px;height:40px;padding:0 16px;background:rgba(255,255,255,.86);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.9);border-radius:20px;box-shadow:0 6px 18px rgba(90,92,66,.16);}',
    '.music-ctl:hover .music-ctl__vol,.music-ctl:focus-within .music-ctl__vol{width:160px;opacity:1;}',
    '.music-ctl__range{-webkit-appearance:none;appearance:none;width:90px;height:4px;border-radius:2px;background:rgba(69,118,53,.16);outline:none;cursor:pointer;}',
    '.music-ctl__range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #6B9136;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.18);}',
    '.music-ctl__range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid #6B9136;cursor:pointer;}',
    '.music-ctl__pct{font-family:"Newsreader",serif;font-size:12px;color:#8A7F6B;width:28px;text-align:right;}',
    '@media(max-width:560px){.music-ctl{right:72px;}}'
  ].join("\n");
  document.head.appendChild(style);

  // ---------- 注入 UI ----------
  var ctl = document.createElement("div");
  ctl.className = "music-ctl";
  ctl.id = "musicCtl";
  ctl.innerHTML =
    '<div class="music-ctl__vol">' +
      '<div class="music-ctl__vol-inner">' +
        '<input class="music-ctl__range" id="musicVol" type="range" min="0" max="100" value="55" aria-label="音乐音量">' +
        '<span class="music-ctl__pct" id="musicVolLabel">55</span>' +
      '</div>' +
    '</div>' +
    '<button class="music-ctl__btn" id="musicBtn" type="button" aria-label="播放 / 暂停背景音乐" aria-pressed="false">' +
      '<svg class="note" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>' +
      '<svg class="eq" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="4" y="12" width="3" height="7" rx="1.5"/><rect x="10" y="8" width="3" height="11" rx="1.5"/><rect x="16" y="10" width="3" height="9" rx="1.5"/></svg>' +
    '</button>';
  document.body.appendChild(ctl);

  // ---------- Web Audio 柔和氛围和弦 ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, filter = null;
  var playing = false, timer = null, nextTime = 0, chordIdx = 0;
  var vol = 0.55;

  // 和弦进行（Cmaj7 - Am7 - Fmaj7 - G7），缓慢循环
  var CHORDS = [
    [261.63, 329.63, 392.00, 493.88],
    [220.00, 261.63, 329.63, 392.00],
    [174.61, 220.00, 261.63, 349.23],
    [196.00, 246.94, 293.66, 392.00]
  ];
  var CHORD_DUR = 8;

  var btn = document.getElementById("musicBtn");
  var range = document.getElementById("musicVol");
  var label = document.getElementById("musicVolLabel");

  function ensureCtx() {
    if (ctx) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;
    filter.Q.value = 0.35;
    filter.connect(master);
  }

  function scheduleChord(t) {
    var chord = CHORDS[chordIdx % CHORDS.length];
    chordIdx++;
    for (var i = 0; i < chord.length; i++) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = chord[i];
      osc.detune.value = (Math.random() - 0.5) * 7;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 2.6);
      g.gain.setValueAtTime(0.1, t + CHORD_DUR - 1.6);
      g.gain.linearRampToValueAtTime(0, t + CHORD_DUR);
      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + CHORD_DUR + 0.2);
    }
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 1.0) {
      scheduleChord(nextTime);
      nextTime += CHORD_DUR;
    }
  }

  function setVol(v) {
    vol = v;
    label.textContent = Math.round(v * 100);
    if (ctx && playing) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(vol * 0.5, ctx.currentTime, 0.2);
    }
  }

  function start() {
    ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    if (playing) return;
    playing = true;
    chordIdx = 0;
    nextTime = ctx.currentTime + 0.1;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(vol * 0.5, ctx.currentTime, 0.7);
    scheduler();
    timer = setInterval(scheduler, 800);
  }

  function stop() {
    if (!ctx || !playing) return;
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
  }

  function setUI(on) {
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  // 按钮 = 开关：点击切换播放/暂停（不再开关音量面板）
  btn.addEventListener("click", function () {
    if (playing) { stop(); setUI(false); }
    else { start(); setUI(true); }
  });

  // 悬停按钮时左侧滑出的音量滑块：拖动即可调大小
  range.addEventListener("input", function () {
    setVol(parseFloat(range.value) / 100);
  });
})();
