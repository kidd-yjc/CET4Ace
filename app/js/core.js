/* core.js —— 状态、存储、路由、通用工具 */
(function () {
  'use strict';

  var K = {
    WORDS: 'c4.words',
    STAR: 'c4.star',
    WRONG: 'c4.wrong',
    STATS: 'c4.stats',
    SET: 'c4.settings',
    PAPER: 'c4.paper.'
  };

  var S = {
    view: 'home',
    history: [],
    bank: null,      // 套题索引
    vocab: null,     // 词库
    library: null,   // 资料库索引
    paper: null,     // 当前试卷
    cur: 0,          // 当前题序
    answers: {},     // 当前作答 {no: letter}
    elapsed: 0,
    timer: null,
    submitted: false,
    filter: 'all'
  };

  /* ---------- 存储 ---------- */
  function load(key, dflt) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : dflt;
    } catch (e) { return dflt; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  var store = {
    words: function () { return load(K.WORDS, {}); },
    setWords: function (v) { save(K.WORDS, v); },
    star: function () { return load(K.STAR, []); },
    setStar: function (v) { save(K.STAR, v); },
    wrong: function () { return load(K.WRONG, []); },
    setWrong: function (v) { save(K.WRONG, v); },
    stats: function () {
      var s = load(K.STATS, null) || {};
      var today = todayStr();
      if (!s.day) { s.day = today; s.today = 0; }
      if (s.day !== today) {
        s.day = today;
        s.today = 0;
        s.todayExams = 0;
        s.todayDrill = 0;
        s.todayWrite = 0;
        s.todayDict = 0;
        s.todayWrong = 0;
      }
      if (!s.totalWords) s.totalWords = 0;
      if (!s.exams) s.exams = 0;
      if (!s.streak) s.streak = 0;
      if (!s.studyDays) s.studyDays = 0;
      if (!s.todayExams) s.todayExams = 0;
      if (!s.todayDrill) s.todayDrill = 0;
      if (!s.todayWrite) s.todayWrite = 0;
      if (!s.todayDict) s.todayDict = 0;
      if (!s.todayWrong) s.todayWrong = 0;
      return s;
    },
    setStats: function (v) { save(K.STATS, v); },
    /* 今天有学习行为：维护连续打卡天数 */
    bumpDay: function () {
      var s = store.stats();
      var today = todayStr();
      if (s.lastDay === today) return s;
      var yest = new Date(Date.now() - 86400000);
      var y = yest.getFullYear() + '-' + pad(yest.getMonth() + 1) + '-' + pad(yest.getDate());
      s.streak = (s.lastDay === y) ? (s.streak || 0) + 1 : 1;
      s.lastDay = today;
      s.studyDays = (s.studyDays || 0) + 1;
      save(K.STATS, s);
      return s;
    },
    settings: function () {
      return Object.assign({
        goal: 30, mode: 'en2cn', examMode: 'practice',
        examDate: '2026-12-19', reminder: false, reminderTime: '20:30'
      }, load(K.SET, {}));
    },
    setSettings: function (v) { save(K.SET, v); },
    kv: function (name, dflt) { return load('c4.' + name, dflt); },
    setKv: function (name, v) { save('c4.' + name, v); },
    paperKey: function (id) { return K.PAPER + id; },
    paperState: function (id) { return load(K.PAPER + id, null); },
    setPaperState: function (id, v) { save(K.PAPER + id, v); }
  };

  /* ---------- 工具 ---------- */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return pad(m) + ':' + pad(s);
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
  }
  function vibrate(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {}
  }

  /* ---------- 动态加载数据 ---------- */
  function loadScript(path, cb, errCb) {
    var existed = document.querySelector('script[data-src="' + path + '"]');
    if (existed) { cb(); return; }
    var s = document.createElement('script');
    s.src = path;
    s.setAttribute('data-src', path);
    s.onload = function () { setTimeout(cb, 0); };
    s.onerror = function () { errCb && errCb(); };
    document.head.appendChild(s);
  }
  function dataOf(name) { return window.__DATA ? window.__DATA[name] : null; }

  /* ---------- 路由 ---------- */
  var VIEWS = ['home', 'exam', 'paper', 'result', 'library', 'vocab', 'wordtest', 'write', 'me', 'about', 'drill', 'report', 'wrongtest', 'today'];
  var TITLES = {
    home: '四级通关', exam: '历年真题', paper: '模拟考试', result: '成绩分析',
    library: '真题资料库', vocab: '背单词', wordtest: '单词测验', write: '写作与翻译',
    me: '我的', about: '关于', drill: '专项训练', report: '学习报告', wrongtest: '错题重测',
    today: '今日一条流'
  };
  var TABBED = ['home', 'exam', 'vocab', 'write', 'me'];

  function go(view, opts) {
    opts = opts || {};
    // 离开答题页时停掉听力，避免锁定的音频在后台继续播
    if (S.view === 'paper' && view !== 'paper') {
      var au = document.getElementById('abAudio');
      if (au) { au.onpause = null; au.pause(); }
    }
    // 听写弹层依赖答题页音频，离开答题页就关掉
    var ds = document.getElementById('dictSheet');
    if (ds && view !== 'paper') {
      ds.hidden = true;
      var da = document.getElementById('dictAudio');
      if (da) { da.pause(); }
    }
    if (S.view === 'drill' && view !== 'drill') {
      var dra = document.getElementById('drillAudio');
      if (dra) { dra.onpause = null; dra.pause(); }
    }
    if (!opts.replace && S.view !== view) S.history.push(S.view);
    S.view = view;
    VIEWS.forEach(function (v) {
      var node = document.getElementById('view-' + v);
      if (node) node.hidden = (v !== view);
    });
    $('pageTitle').textContent = opts.title || TITLES[view] || '四级通关';
    $('btnBack').hidden = TABBED.indexOf(view) >= 0;
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-go') === view);
    }
    $('tabbar').hidden = (view === 'paper' || view === 'wordtest');
    window.scrollTo(0, 0);
    (RENDER[view] || function () {})();
  }
  function back() {
    if (S.view === 'paper' && !S.submitted) {
      if (!confirm('交卷前离开会丢失本次作答，确定返回？')) return;
    }
    var prev = S.history.pop();
    go(prev || 'home', { replace: true });
  }

  /* ---------- 渲染注册表 ---------- */
  var RENDER = {};

  /* ---------- 初始化 ---------- */
  function init() {
    var tabs = document.querySelectorAll('[data-go]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        go(this.getAttribute('data-go'));
      });
    }
    $('btnBack').addEventListener('click', back);
    $('sheet').addEventListener('click', function (e) {
      if (e.target === this) this.hidden = true;
    });
    $('wordSheet').addEventListener('click', function (e) {
      if (e.target === this) this.hidden = true;
    });

    var bank = dataOf('bank/manifest') || dataOf('bank_manifest');
    S.bank = bank;
    S.library = dataOf('library');
    var stats = store.stats();
    $('topStat').textContent = '累计 ' + (stats.totalWords || 0) + ' 词';

    var hash = (location.hash || '').replace('#', '');
    if (hash.indexOf('paper/') === 0) {
      go('exam', { replace: true });
      var pid = hash.slice(6);
      if (window.App && window.App.openPaper) window.App.openPaper(pid);
    } else if (hash && VIEWS.indexOf(hash) >= 0) go(hash, { replace: true });
    else go('home', { replace: true });
  }

  /* ---------- Android 返回键 ---------- */
  function handleAndroidBack() {
    if (TABBED.indexOf(S.view) >= 0 && !S.history.length) return false;
    back();
    return true;
  }

  /* ---------- 对外 ---------- */
  window.App = {
    S: S, go: go, back: back, el: el, esc: esc, toast: toast, $: $,
    store: store, loadScript: loadScript, dataOf: dataOf,
    fmtTime: fmtTime, pad: pad, todayStr: todayStr, vibrate: vibrate,
    RENDER: RENDER, TITLES: TITLES, handleAndroidBack: handleAndroidBack
  };

  document.addEventListener('DOMContentLoaded', init);
})();
