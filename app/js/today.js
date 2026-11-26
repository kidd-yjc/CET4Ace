/* today.js —— 今日一条流：按 15/30/45 分钟自动拼任务，完成即打勾 */
(function () {
  'use strict';
  var A = window.App;
  var S = A.S;
  var K = 'c4.flow';
  var MK = 'c4.flowMode';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function today() { return A.todayStr(); }
  function stats() { return A.store.stats(); }
  function defaultMode() {
    var m = parseInt(A.store.kv(MK, 30), 10);
    return m === 15 || m === 30 || m === 45 ? m : 30;
  }
  function wordTarget(mode) { return mode >= 45 ? 30 : mode >= 30 ? 20 : 10; }
  function daysText() {
    var days = A.daysLeft ? A.daysLeft() : null;
    if (typeof days !== 'number') return '';
    return days > 0 ? '距考试 ' + days + ' 天' : days === 0 ? '今天考试' : '考试已过';
  }

  function audioPaper() {
    var exams = (S.bank && S.bank.exams) || [];
    for (var i = 0; i < exams.length; i++) {
      if (exams[i].hasAudio) return exams[i];
    }
    return exams[0] || null;
  }

  function dueWrong() {
    var now = Date.now();
    return A.store.wrong().filter(function (w) { return !w.due || w.due <= now; });
  }

  function create(mode) {
    var st = stats();
    return {
      date: today(),
      mode: mode || defaultMode(),
      start: {
        today: st.today || 0,
        drill: st.todayDrill || 0,
        dict: st.todayDict || 0,
        wrong: st.todayWrong || 0,
        write: st.todayWrite || 0
      },
      done: {},
      created: Date.now()
    };
  }

  function peek() {
    var f = A.store.kv(K, null);
    return f && f.date === today() ? f : null;
  }

  function save(f) { A.store.setKv(K, f); }

  function get() {
    var f = peek();
    if (!f) { f = create(defaultMode()); save(f); }
    return f;
  }

  function delta(f, key) {
    var st = stats();
    if (key === 'vocab') return Math.max(0, (st.today || 0) - (f.start.today || 0));
    if (key === 'drill') return Math.max(0, (st.todayDrill || 0) - (f.start.drill || 0));
    if (key === 'dict') return Math.max(0, (st.todayDict || 0) - (f.start.dict || 0));
    if (key === 'wrong') return Math.max(0, (st.todayWrong || 0) - (f.start.wrong || 0));
    if (key === 'write') return Math.max(0, (st.todayWrite || 0) - (f.start.write || 0));
    return 0;
  }

  function sync(f) {
    var changed = false;
    if (!f.done.vocab && delta(f, 'vocab') >= wordTarget(f.mode)) { f.done.vocab = true; changed = true; }
    if (!f.done.drill && delta(f, 'drill') >= 1) { f.done.drill = true; changed = true; }
    if (!f.done.dict && delta(f, 'dict') >= 1) { f.done.dict = true; changed = true; }
    if (!f.done.write && delta(f, 'write') >= 1) { f.done.write = true; changed = true; }
    if (changed) save(f);
    return f;
  }

  function plan(f) {
    var st = stats();
    var due = dueWrong();
    var wp = audioPaper();
    var mode = f.mode;
    var items = [
      {
        key: 'vocab', title: '单词', view: 'vocab',
        desc: '目标 ' + wordTarget(mode) + ' 个，新词和复习混排',
        meta: Math.min(delta(f, 'vocab'), wordTarget(mode)) + ' / ' + wordTarget(mode) + ' 个',
        done: !!f.done.vocab
      },
      {
        key: 'drill', title: '专项', view: 'drill',
        desc: '按题型做 1 组，听力/选词/匹配/阅读任选',
        meta: Math.min(delta(f, 'drill'), 1) + ' / 1 组',
        done: !!f.done.drill
      }
    ];
    if (mode >= 30) {
      items.push({
        key: 'dict', title: '听写', view: 'paper', paper: wp ? wp.id : '',
        desc: wp ? '打开 ' + wp.title + '，第 1 题点「听写本段」' : '打开一套带听力的真题，点「听写本段」',
        meta: Math.min(delta(f, 'dict'), 1) + ' / 1 段',
        done: !!f.done.dict
      });
    }
    if (due.length) {
      items.push({
        key: 'wrong', title: '错题', view: 'wrongtest',
        desc: '按遗忘曲线复习今天到期的 ' + due.length + ' 题',
        meta: Math.min(delta(f, 'wrong'), due.length) + ' / ' + due.length + ' 题',
        done: !!f.done.wrong
      });
    } else {
      items.push({
        key: 'wrong', title: '错题', view: 'wrongtest', optional: true,
        desc: '今天没有到期错题，可直接跳过',
        meta: '0 题',
        done: true
      });
    }
    if (mode >= 45) {
      items.push({
        key: 'write', title: '写作', view: 'write',
        desc: '写 1 篇，用 AI 精批；有 Key 时批完可直接追问',
        meta: Math.min(delta(f, 'write'), 1) + ' / 1 篇',
        done: !!f.done.write
      });
    }
    return items;
  }

  function counts(items) {
    var real = items.filter(function (x) { return !x.optional; });
    var done = real.filter(function (x) { return x.done; }).length;
    var total = real.length;
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0, items: items, real: real };
  }

  function taskButton(t) {
    if (t.optional) return '<span class="td-opt">无需做</span>';
    if (t.done) return '<button class="td-go done" type="button" data-task="' + t.key + '">已完成</button>';
    return '<button class="td-go" type="button" data-task="' + t.key + '">' +
      (t.key === 'vocab' || t.key === 'drill' ? '继续' : '开始') + '</button>';
  }

  function goTask(t) {
    if (!t) return;
    if (t.key === 'dict') {
      if (t.paper && A.openPaperAt) {
        A.openPaperAt(t.paper, 1);
        if (A.toast) A.toast('打开第 1 题后，点「听写本段」；核对完这段就算完成');
        return;
      }
      A.go('exam');
      if (A.toast) A.toast('选一套带听力的真题，点「听写本段」');
      return;
    }
    A.go(t.view);
  }

  function notifyDone(key) {
    var f = peek();
    if (!f) return;
    f = sync(f);
    var name = { vocab: '单词', drill: '专项', dict: '听写', wrong: '错题', write: '写作' }[key] || key;
    if (S.view === 'today' && A.RENDER.today) A.RENDER.today();
    else if (S.view === 'home' && A.RENDER.home) A.RENDER.home();
    if (A.toast) A.toast('今日一条流 · ' + name + '完成');
  }

  function mark(key) {
    var f = peek();
    if (!f) return false;
    if (f.done[key]) return false;
    f.done[key] = true;
    save(f);
    notifyDone(key);
    return true;
  }

  A.flowDone = function (key) { return mark(key); };

  A.flowCheck = function (key) {
    var f = peek();
    if (!f) return;
    if (key === 'wrong') { mark('wrong'); return; }
    if (key === 'write') { mark('write'); return; }
    var before = !!f.done[key];
    f = sync(f);
    if (!before && f.done[key]) notifyDone(key);
    else if (S.view === 'home' && A.RENDER.home) A.RENDER.home();
  };

  A.flowSetMode = function (mode) {
    mode = parseInt(mode, 10);
    if (mode !== 15 && mode !== 30 && mode !== 45) return;
    var f = get();
    if (f.mode === mode) return;
    var anyDone = Object.keys(f.done).some(function (k) { return f.done[k]; });
    if (anyDone && !window.confirm('切换时长会重置今天的勾选（学习统计不变），继续？')) return;
    A.store.setKv(MK, mode);
    f = create(mode);
    save(f);
    if (S.view === 'today') A.RENDER.today();
    if (S.view === 'home' && A.RENDER.home) A.RENDER.home();
  };

  A.RENDER.today = function () {
    var top = $('todayTop'), list = $('todayList'), foot = $('todayFoot'), modeBox = $('todayMode');
    if (!top || !list || !modeBox || !foot) return;
    var f = sync(get());
    var p = plan(f);
    var c = counts(p);
    var next = c.real.filter(function (x) { return !x.done; })[0] || null;

    modeBox.innerHTML = [15, 30, 45].map(function (m) {
      return '<button class="seg-btn' + (f.mode === m ? ' on' : '') + '" type="button" data-mode="' + m + '">' +
        m + ' 分钟</button>';
    }).join('') + '<span class="td-mode-tip">' + (f.mode === 15 ? '单词 + 专项 + 到期错题' : f.mode === 30 ? '加 1 段听写' : '再加 1 篇写作') + '</span>';

    top.innerHTML = '<div class="td-hero">' +
      '<div class="td-ring" style="--p:' + c.pct + '%"><b>' + c.done + '</b><small>/ ' + c.total + '</small></div>' +
      '<div class="td-hero-txt"><div class="td-kicker">TODAY FLOW · ' + f.mode + ' MIN</div>' +
      '<div class="td-title">今日一条流</div>' +
      '<div class="td-sub">' + (next ? '下一项：' + esc(next.title) + ' · ' + esc(next.meta) : '今天排的任务已经全部完成') +
      (daysText() ? '<br>' + daysText() : '') + '</div></div></div>';

    list.innerHTML = '<div class="td-list">' + p.map(function (t, i) {
      return '<div class="td-item' + (t.done ? ' done' : '') + (t.optional ? ' optional' : '') + '">' +
        '<div class="td-no">' + (t.done ? '✓' : (i + 1)) + '</div>' +
        '<div class="td-info"><b>' + esc(t.title) + '</b><span>' + esc(t.desc) + '</span>' +
        '<em>' + esc(t.meta) + '</em></div>' + taskButton(t) + '</div>';
    }).join('') + '</div>';

    if (next) {
      list.innerHTML += '<div class="td-next"><div><b>从下一项开始</b><span>' +
        esc(next.title) + ' · ' + esc(next.meta) + '</span></div>' +
        '<button class="btn primary" type="button" id="tdNext">开始</button></div>';
    } else {
      list.innerHTML += '<div class="td-finish"><b>今日训练完成</b><span>' +
        (f.mode >= 45 ? '单词、专项、听写、错题、写作都排到了' : '完成后可以再模考一套，或提前做明天的错题') +
        '</span><div class="btn-row"><button class="btn ghost" type="button" data-go="exam">去模考</button>' +
        '<button class="btn ghost" type="button" data-go="report">看报告</button></div></div>';
    }

    foot.innerHTML = '<div class="td-note">时长只决定任务量，不强制计时；做完一项自动打勾。' +
      '切换时长会重置今天的勾选，学习统计不受影响。</div>';

    modeBox.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-mode]') : null;
      if (b) A.flowSetMode(b.getAttribute('data-mode'));
    };
    list.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-task]') : null;
      if (b) {
        var key = b.getAttribute('data-task');
        var t = p.filter(function (x) { return x.key === key; })[0];
        goTask(t);
        return;
      }
      if (e.target && e.target.id === 'tdNext' && next) goTask(next);
      var g = e.target.closest ? e.target.closest('[data-go]') : null;
      if (g) A.go(g.getAttribute('data-go'));
    };
  };

  /* 首页 hero 改成今日一条流进度 */
  var prevHome = A.RENDER.home;
  A.RENDER.home = function () {
    prevHome();
    var f = peek();
    var title = $('heroTitle'), sub = $('heroSub'), ring = $('heroRingNum');
    if (!f) {
      if (title) title.textContent = '开始今日训练';
      if (sub) sub.textContent = '按 15/30/45 分钟自动排好单词、专项、听写、错题和写作';
      if (ring) ring.textContent = '0';
      return;
    }
    f = sync(f);
    var c = counts(plan(f));
    var next = c.real.filter(function (x) { return !x.done; })[0] || null;
    if (ring) ring.textContent = c.pct;
    if (title) title.textContent = next ? '今日训练 ' + c.done + ' / ' + c.total : '今日训练已完成';
    if (sub) {
      sub.textContent = next ? '下一项：' + next.title + ' · ' + next.meta : c.total + ' 项全部完成，去模考或复习错题';
    }
  };
})();
