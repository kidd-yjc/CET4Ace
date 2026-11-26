/* train.js —— 专项训练 / 听力听写 / 710 估分报告 / 冲刺计划 / 错题遗忘曲线 / 系统提醒 */
(function () {
  'use strict';
  var A = window.App, S = A.S, el = A.el, esc = A.esc;
  function $(id) { return document.getElementById(id); }
  var DAY = 86400000;
  var REVIEW_LV = [1, 3, 7, 15, 30];

  /* ================= 通用 ================= */
  function settings() { return A.store.settings(); }
  function saveSettings(patch) {
    var s = settings();
    for (var k in patch) { if (patch.hasOwnProperty(k)) s[k] = patch[k]; }
    A.store.setSettings(s);
    return s;
  }
  function examDateStr() { return settings().examDate || '2026-12-19'; }
  function examDateObj() {
    var p = examDateStr().split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  function daysLeft() {
    var now = new Date();
    var base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((examDateObj().getTime() - base.getTime()) / DAY);
  }
  function shortDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  function fmtScore(x) {
    if (x == null) return '--';
    var r = Math.round(x * 10) / 10;
    return r === Math.floor(r) ? String(r) : r.toFixed(1);
  }
  function bindGo(scope) {
    var bs = scope.querySelectorAll('[data-go]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].onclick = function () { A.go(this.getAttribute('data-go')); };
    }
  }

  /* ================= 710 估分 ================= */
  function scoreFromSec(sec) {
    sec = sec || {};
    var lisPct = (sec.listening && sec.listening.total) ? sec.listening.right / sec.listening.total : null;
    var rR = 0, rT = 0;
    ['cloze', 'matching', 'read'].forEach(function (k) {
      if (sec[k]) { rR += sec[k].right; rT += sec[k].total; }
    });
    var readPct = rT ? rR / rT : 0;
    var essay = A.store.kv('essay', null) || {};
    var eTot = essay.total || 8;
    var wPct = Math.max(0, Math.min(1, eTot / 15));
    var L = lisPct == null ? 0 : lisPct * 248.5;
    var R = readPct * 248.5;
    var W = wPct * 213;
    return {
      L: L, R: R, W: W,
      total: L + R + W,
      full: lisPct == null ? 461.5 : 710,
      hasListening: lisPct != null,
      lisPct: lisPct, readPct: readPct, wPct: wPct, essayTotal: eTot
    };
  }

  A.recordScore = function (p, r) {
    var sc = scoreFromSec(r.secStat);
    var arr = A.store.kv('scores', []);
    arr.push({
      id: p.id, title: p.title, at: Date.now(),
      rate: r.rate, right: r.right, total: r.total,
      score: sc, sec: r.secStat
    });
    A.store.setKv('scores', arr.slice(-40));
  };

  A.noteEssayScore = function (total) {
    A.store.setKv('essay', { total: total, at: Date.now() });
    var st = A.store.stats();
    st.todayWrite = (st.todayWrite || 0) + 1;
    A.store.setStats(st);
    A.store.bumpDay();
    if (A.flowCheck) A.flowCheck('write');
  };

  function barRow(name, val, full) {
    var pct = full ? Math.max(0, Math.min(100, Math.round(val / full * 100))) : 0;
    return '<div class="tr-bar-row"><span class="tr-bar-k">' + name + '</span>' +
      '<div class="tr-bar-track"><i style="width:' + pct + '%"></i></div>' +
      '<em>' + fmtScore(val) + ' / ' + fmtScore(full) + '</em></div>';
  }

  function scoreCardHtml(sc) {
    var gap = Math.round(sc.total - 425);
    var note = sc.hasListening
      ? (gap >= 0 ? '已越过 425 线 ' + gap + ' 分' : '离 425 还差 ' + (-gap) + ' 分')
      : '本套无听力，只有阅读与写作折算，参考价值有限';
    return '<div class="tr-card tr-score">' +
      '<div class="tr-score-top">' +
      '<div class="tr-score-num"><span>本次估算</span><b>' + fmtScore(sc.total) + '</b><small> / ' + fmtScore(sc.full) + '</small></div>' +
      '<div class="tr-score-side">' + note + '</div>' +
      '</div>' +
      '<div class="tr-bars">' +
      (sc.hasListening ? barRow('听力', sc.L, 248.5) : '<div class="tr-bar-row tr-dim"><span class="tr-bar-k">听力</span><div class="tr-bar-track"><i style="width:0"></i></div><em>本套无听力</em></div>') +
      barRow('阅读', sc.R, 248.5) +
      barRow('写作翻译', sc.W, 213) +
      '</div>' +
      '<div class="tr-score-foot">估算方式：听力按 25 题 × 248.5，阅读按 30 题 × 248.5，写作翻译按作文 15 分制折算 213。' +
      '写作未评分时按 8/15 中位估，结果为近似值，不等于官方报道分。</div>' +
      '</div>';
  }

  A.renderResultExtra = function (r) {
    var card = $('rcScoreCard'), top = $('rcTopWords');
    if (!card || !top) return;
    if (!S.paper || !r) { card.innerHTML = ''; top.innerHTML = ''; return; }
    var sc = scoreFromSec(r.secStat);
    card.innerHTML = scoreCardHtml(sc);

    var p = S.paper;
    top.innerHTML = '<div class="sec-head"><span>本套高频词</span><span class="link" id="btnAddTop">全部加入生词本</span></div>' +
      '<div class="tr-chips" id="trChips"><span class="tr-dim">正在匹配词库…</span></div>';
    var chips = $('trChips');
    chips.onclick = function (e) {
      var t = e.target.closest ? e.target.closest('.tr-chip') : null;
      if (!t) return;
      var w = t.getAttribute('data-w');
      if (w && A.openWord) A.openWord(w);
    };
    ensureIndex(function () {
      if (!chips || !document.body.contains(chips)) return;
      var ws = (IDX && IDX.top && IDX.top[p.id]) ? IDX.top[p.id].slice(0, 24) : [];
      if (!ws.length) { chips.innerHTML = '<span class="tr-dim">本套没匹配到词库词条</span>'; return; }
      chips.innerHTML = ws.map(function (w) {
        return '<span class="tr-chip" data-w="' + esc(w) + '">' + esc(w) + '</span>';
      }).join('');
    });
    var addBtn = $('btnAddTop');
    if (addBtn) addBtn.onclick = function () {
      ensureIndex(function () {
        var ws = (IDX && IDX.top && IDX.top[p.id]) ? IDX.top[p.id].slice(0, 24) : [];
        if (!ws.length) { A.toast('没有可加入的词'); return; }
        var star = A.store.star();
        ws.forEach(function (w) { if (star.indexOf(w) < 0) star.push(w); });
        A.store.setStar(star);
        A.toast('已加入 ' + ws.length + ' 个词到生词本');
      });
    };
  };

  /* ================= 学习报告 ================= */
  A.RENDER.report = function () {
    var body = $('reportBody');
    if (!body) return;
    var arr = A.store.kv('scores', []);
    var d = daysLeft();
    var last = arr.length ? arr[arr.length - 1] : null;
    var prev = arr.length > 1 ? arr[arr.length - 2] : null;
    var html = '<div class="tr-card tr-rep-hero">' +
      '<div class="tr-rep-left"><span class="tr-kicker">距 ' + esc(examDateStr()) + '</span>' +
      '<b class="tr-big">' + (d > 0 ? d : 0) + '</b><span class="tr-unit">天</span></div>' +
      '<div class="tr-rep-right">';
    if (last) {
      html += '<span class="tr-kicker">最近一套 ' + esc(shortDate(last.at)) + '</span>' +
        '<b class="tr-big">' + fmtScore(last.score.total) + '</b><span class="tr-unit">/ ' + fmtScore(last.score.full) + '</span>' +
        (prev ? '<div class="tr-delta ' + (last.score.total >= prev.score.total ? 'up' : 'down') + '">' +
          (last.score.total >= prev.score.total ? '↑ +' : '↓ ') + fmtScore(Math.abs(last.score.total - prev.score.total)) + ' vs 上一套</div>' : '');
    } else {
      html += '<span class="tr-kicker">还没有模考成绩</span><div class="tr-rep-empty">做一套真题，这里才会有估分和趋势</div>';
    }
    html += '</div></div>';

    if (!arr.length) {
      html += '<div class="tr-card"><div class="tr-dim">建议先做一套带听力的近年真题（约 130 分钟），系统会自动记录分数。</div>' +
        '<div class="btn-row"><button class="btn primary" data-go="exam">去模考</button></div></div>';
      body.innerHTML = html;
      bindGo(body);
      return;
    }

    /* 分项 */
    html += '<div class="sec-head"><span>最近一套分项</span></div>' + scoreCardHtml(last.score);

    /* 趋势 */
    html += '<div class="sec-head"><span>最近 ' + Math.min(10, arr.length) + ' 套趋势</span></div><div class="tr-card tr-trend">';
    arr.slice(-10).forEach(function (rec) {
      var pct = Math.max(4, Math.min(100, Math.round(rec.score.total / rec.score.full * 100)));
      var cls = (rec.score.total / rec.score.full) >= 0.6 ? 'good' : 'warn';
      html += '<div class="tr-trend-row"><span>' + shortDate(rec.at) + '</span>' +
        '<div class="tr-bar-track"><i class="' + cls + '" style="width:' + pct + '%"></i></div>' +
        '<em>' + fmtScore(rec.score.total) + '</em></div>';
    });
    html += '<div class="tr-dim tr-trend-note">柱长按 710 分制折算；2015 等纯阅读套按 461.5 满分折算，会偏低。</div></div>';

    /* 题型正确率（最近 6 套汇总） */
    var agg = {};
    arr.slice(-6).forEach(function (rec) {
      var sec = rec.sec || {};
      Object.keys(sec).forEach(function (k) {
        agg[k] = agg[k] || { r: 0, t: 0 };
        agg[k].r += sec[k].right; agg[k].t += sec[k].total;
      });
    });
    var names = { listening: '听力', cloze: '选词填空', matching: '长篇匹配', read: '仔细阅读' };
    var rows = '', weak = null, weakPct = 2;
    ['listening', 'cloze', 'matching', 'read'].forEach(function (k) {
      if (!agg[k] || !agg[k].t) return;
      var pct = agg[k].r / agg[k].t;
      if (pct < weakPct) { weakPct = pct; weak = k; }
      rows += '<div class="tr-bar-row"><span class="tr-bar-k">' + names[k] + '</span>' +
        '<div class="tr-bar-track"><i style="width:' + Math.round(pct * 100) + '%"></i></div>' +
        '<em>' + Math.round(pct * 100) + '% · ' + agg[k].r + '/' + agg[k].t + '</em></div>';
    });
    html += '<div class="sec-head"><span>近 6 套题型正确率</span></div><div class="tr-card tr-bars">' +
      (rows || '<div class="tr-dim">还没有足够的答题记录</div>') + '</div>';

    /* 写作翻译 */
    var essay = A.store.kv('essay', null);
    if (essay) {
      html += '<div class="sec-head"><span>写作最近评分</span></div><div class="tr-card tr-essay">' +
        '<div><b>' + essay.total + '</b> / 15 · ' + (essay.total >= 13 ? '14 分档' : essay.total >= 10 ? '11 分档' :
          essay.total >= 7 ? '8 分档' : essay.total >= 4 ? '5 分档' : '2 分档') + '</div>' +
        '<div class="tr-dim">' + esc(shortDate(essay.at)) + ' 评分 · 折算写作翻译 ' + fmtScore(essay.total / 15 * 213) + ' / 213</div></div>';
    }

    /* 薄弱推荐 */
    var recMap = {
      listening: '听力专项：新闻 + 长对话逐段精听，先用「听写本段」把细节抓稳',
      cloze: '选词填空专项：先判词性再选词，10 题一组连续做 3 组',
      matching: '长篇匹配专项：先读题干圈关键词，再回原文找同义替换',
      read: '仔细阅读专项：每篇 5 题限时 8 分钟，错题回看定位句'
    };
    var weakText = weak ? recMap[weak] : '四项都还算均衡，保持每天一组专项 + 隔天一套模考';
    if (weak && weakPct < 0.5) weakText = '最弱项是「' + names[weak] + '」（' + Math.round(weakPct * 100) + '%）。' + recMap[weak];
    html += '<div class="sec-head"><span>下一步</span></div><div class="tr-card tr-advice">' +
      '<div>' + esc(weakText) + '</div>' +
      '<div class="btn-row"><button class="btn primary" data-go="drill">去专项训练</button>' +
      '<button class="btn ghost" data-go="exam">再做一套</button></div></div>';

    body.innerHTML = html;
    bindGo(body);
  };

  /* ================= 专项训练 ================= */
  var DRILL = { data: null, type: 'listening', session: null, limit: 40 };
  var TYPE_NAME = { listening: '听力', cloze: '选词填空', matching: '长篇匹配', reading: '仔细阅读' };
  var KIND_MAP = { listening: 'listening', cloze: 'cloze', matching: 'matching', reading: 'reading' };

  function ensureDrill(cb) {
    if (DRILL.data) { cb(DRILL.data); return; }
    DRILL.loading = true;
    A.loadScript('data/drill.js', function () {
      DRILL.data = window.__DATA['drill'];
      DRILL.loading = false;
      if (!DRILL.data) { A.toast('题组数据载入失败'); return; }
      cb(DRILL.data);
    }, function () { DRILL.loading = false; A.toast('题组数据载入失败'); });
  }

  A.RENDER.drill = function () {
    var seg = $('drillSeg');
    if (seg && !seg.__bound) {
      seg.__bound = true;
      seg.addEventListener('click', function (e) {
        if (!e.target.classList.contains('seg-btn')) return;
        var t = e.target.getAttribute('data-type');
        if (!t || t === DRILL.type) return;
        DRILL.type = t;
        DRILL.session = null;
        DRILL.limit = 40;
        stopDrillAudio();
        var btns = seg.querySelectorAll('.seg-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i] === e.target);
        renderDrill();
      });
    }
    if (seg) {
      var bs = seg.querySelectorAll('.seg-btn');
      for (var j = 0; j < bs.length; j++) bs[j].classList.toggle('on', bs[j].getAttribute('data-type') === DRILL.type);
    }
    var box = $('drillBody');
    if (box) box.innerHTML = '<div class="empty">题组数据载入中…</div>';
    ensureDrill(function () { renderDrill(); });
  };

  function drillGroups() { return (DRILL.data && DRILL.data.groups[DRILL.type]) || []; }

  function renderDrill() {
    var box = $('drillBody');
    if (!box) return;
    if (DRILL.session) { renderDrillSession(); return; }
    var gs = drillGroups();
    if (!gs.length) { box.innerHTML = '<div class="empty">这类题组还没生成</div>'; return; }
    var prog = A.store.kv('drillProg', {});
    var doneN = 0, rightN = 0, totalN = 0, qN = 0;
    gs.forEach(function (g) {
      qN += g.qs.length;
      var p = prog[g.id];
      if (p) { doneN++; rightN += p.r; totalN += p.t; }
    });
    var html = '<div class="tr-card tr-drill-head">' +
      '<div class="tr-head-top"><b>' + TYPE_NAME[DRILL.type] + '</b><span>' + gs.length + ' 组 · ' + qN + ' 题</span></div>' +
      '<div class="tr-head-sub">已做 ' + doneN + ' 组' +
      (totalN ? ' · 累计正确率 ' + Math.round(rightN / totalN * 100) + '%' : '') +
      ' · 每组 2–10 题，做完即时给解析</div>' +
      '<div class="btn-row"><button class="btn primary" id="btnDrillRandom">随机来一组</button>' +
      '<button class="btn ghost" id="btnDrillUndone">只做没做过的</button></div></div>';

    var shown = gs.slice(0, DRILL.limit);
    html += '<div class="tr-list">';
    shown.forEach(function (g) {
      var p = prog[g.id];
      var sub = '第 ' + g.no1 + (g.no2 !== g.no1 ? '–' + g.no2 : '') + ' 题 · ' + g.qs.length + ' 题';
      if (g.type === 'listening' && g.start != null) sub += ' · ' + A.fmtTime(g.start) + '–' + A.fmtTime(g.end);
      html += '<div class="tr-item" data-gid="' + esc(g.id) + '">' +
        '<div class="tr-item-main"><div class="tr-item-t">' + esc(g.title) + '</div>' +
        '<div class="tr-item-s">' + sub + '</div></div>' +
        '<div class="tr-item-r">' + (p ? (Math.round(p.r / p.t * 100) + '%') : '未做') + '</div></div>';
    });
    html += '</div>';
    if (gs.length > DRILL.limit) {
      html += '<button class="btn ghost wide" id="btnDrillMore">显示更多（还有 ' + (gs.length - DRILL.limit) + ' 组）</button>';
    }
    box.innerHTML = html;

    box.onclick = function (e) {
      var it = e.target.closest ? e.target.closest('.tr-item') : null;
      if (!it) return;
      var gid = it.getAttribute('data-gid');
      var g = null;
      gs.forEach(function (x) { if (x.id === gid) g = x; });
      if (g) startDrill(g);
    };
    var rnd = $('btnDrillRandom');
    if (rnd) rnd.onclick = function () {
      var undone = gs.filter(function (g) { return !prog[g.id]; });
      var pool = undone.length ? undone : gs;
      startDrill(pool[(Math.random() * pool.length) | 0]);
    };
    var und = $('btnDrillUndone');
    if (und) und.onclick = function () {
      var undone = gs.filter(function (g) { return !prog[g.id]; });
      if (!undone.length) { A.toast('这一类都做过了，随机再来一组'); return; }
      startDrill(undone[(Math.random() * undone.length) | 0]);
    };
    var more = $('btnDrillMore');
    if (more) more.onclick = function () { DRILL.limit += 60; renderDrill(); };
  }

  function stopDrillAudio() {
    var au = $('drillAudio');
    if (au) { au.onpause = null; au.pause(); }
  }

  function startDrill(g) {
    stopDrillAudio();
    DRILL.session = {
      g: g, ans: {}, judged: {}, right: 0,
      total: g.qs.length, finished: false, counted: false, loop: null
    };
    renderDrill();
  }

  function optionText(g, q, L) {
    if (q.options && q.options[L]) return q.options[L];
    if (g.type === 'cloze' && g.bank && g.bank[L]) return g.bank[L];
    if (g.type === 'matching') {
      var p = (g.paras || {})[L];
      return p ? ('段落 ' + L + '：' + String(p).slice(0, 26) + '…') : ('段落 ' + L);
    }
    return '';
  }

  function drillMaterialHtml(g) {
    if (g.type === 'listening') {
      return '<div class="tr-audio">' +
        '<button class="ab-play" id="dPlay">&#9654;</button>' +
        '<div class="tr-audio-info"><b>本段听力</b><span id="dTime">' + A.fmtTime(g.start) + '–' + A.fmtTime(g.end) + '</span></div>' +
        '<button class="mini" id="dLoop">循环本段</button></div>' +
        '<details class="tr-script"><summary>听力原文（听完再看）</summary>' +
        '<div class="q-script" style="max-height:260px">' + esc(g.text || '').replace(/\n/g, '<br>') +
        (g.textCn ? '<div class="sc-cn">' + esc(g.textCn).replace(/\n/g, '<br>') + '</div>' : '') +
        '</div></details>' +
        '<audio id="drillAudio" preload="metadata" src="' + esc(g.audio || '') + '"></audio>';
    }
    if (g.type === 'cloze') {
      var bank = g.bank || {};
      var chips = Object.keys(bank).sort().map(function (k) {
        return '<span class="bank-item">' + k + '. ' + esc(bank[k]) + '</span>';
      }).join('');
      return '<div class="q-passage">' + esc(g.text || '').replace(/\n/g, '<br>') + '</div>' +
        '<div class="tr-sub">词库</div><div class="bank">' + chips + '</div>';
    }
    if (g.type === 'matching') {
      var paras = g.paras || {};
      var ph = '';
      Object.keys(paras).forEach(function (k) {
        ph += '<b>' + k + '</b> ' + esc(paras[k]) + '<br><br>';
      });
      return '<details class="tr-script" open><summary>段落 A–' + (g.letters && g.letters.length ? g.letters[g.letters.length - 1] : 'K') + '</summary>' +
        '<div class="q-passage" style="max-height:340px;overflow:auto">' + ph + '</div></details>';
    }
    return '<details class="tr-script" open><summary>阅读原文</summary>' +
      '<div class="q-passage" style="max-height:340px;overflow:auto">' + esc(g.text || '').replace(/\n/g, '<br>') + '</div></details>';
  }

  function renderDrillSession() {
    var box = $('drillBody');
    var s = DRILL.session, g = s.g;
    var answered = Object.keys(s.judged).length;
    var qhtml = '';
    g.qs.forEach(function (q) {
      var stem = String(q.stem || '').trim();
      var opts = '';
      var letters = [];
      if (g.type === 'cloze') letters = Object.keys(g.bank || {}).sort();
      else if (g.type === 'matching') letters = (g.letters || []).slice();
      else letters = Object.keys(q.options || {}).sort();
      letters.forEach(function (L) {
        opts += '<div class="opt tr-opt" data-no="' + q.no + '" data-k="' + L + '">' +
          '<span class="key">' + L + '</span><span class="opt-t">' + esc(optionText(g, q, L)) + '</span></div>';
      });
      qhtml += '<div class="tr-card tr-q" data-no="' + q.no + '">' +
        '<div class="q-no">第 ' + q.no + ' 题' + (g.type === 'listening' && q.groupNote ? ' · ' + esc(q.groupNote) : '') + '</div>' +
        (stem && stem !== String(q.no) ? '<div class="q-stem">' + esc(stem) + '</div>' : '') +
        '<div class="tr-opts">' + opts + '</div>' +
        '<div class="tr-fb" id="fb' + q.no + '"></div></div>';
    });

    box.innerHTML = '<div class="tr-card tr-sess-head">' +
      '<div class="tr-sess-top"><button class="link" id="drillBack">‹ 返回题组</button>' +
      '<span id="drillProg">' + answered + ' / ' + s.total + '</span></div>' +
      '<div class="tr-item-t">' + esc(g.title) + '</div>' +
      '<div class="tr-item-s">' + TYPE_NAME[g.type] + ' · 第 ' + g.no1 + '–' + g.no2 + ' 题 · 做完即时判分</div>' +
      '</div>' +
      '<div class="tr-card tr-mat">' + drillMaterialHtml(g) + '</div>' +
      '<div id="drillQs">' + qhtml + '</div>' +
      '<div id="drillSum"></div>';

    $('drillBack').onclick = function () {
      stopDrillAudio();
      DRILL.session = null;
      renderDrill();
    };
    var box2 = $('drillQs');
    box2.onclick = function (e) {
      var opt = e.target.closest ? e.target.closest('.tr-opt') : null;
      if (!opt) return;
      var no = parseInt(opt.getAttribute('data-no'), 10);
      answerDrill(no, opt.getAttribute('data-k'));
    };
    bindDrillAudio(g);
    if (s.finished) renderDrillSum();
  }

  function bindDrillAudio(g) {
    var au = $('drillAudio');
    if (!au) return;
    au.onloadedmetadata = function () { };
    var play = $('dPlay');
    if (play) play.onclick = function () {
      if (!au.paused) { au.pause(); return; }
      if (au.currentTime < g.start || au.currentTime >= g.end) au.currentTime = g.start;
      var pr = au.play();
      if (pr && pr.catch) pr.catch(function () { A.toast('点击播放开始'); });
    };
    au.onplay = function () { if (play) play.innerHTML = '&#10074;&#10074;'; };
    au.onpause = function () { if (play) play.innerHTML = '&#9654;'; };
    au.ontimeupdate = function () {
      var s = DRILL.session;
      var tEl = $('dTime');
      if (tEl) tEl.textContent = A.fmtTime(au.currentTime) + ' / ' + A.fmtTime(g.end);
      if (au.currentTime >= g.end) {
        if (s && s.loop) { au.currentTime = g.start; au.play(); }
        else au.pause();
      }
    };
    var loop = $('dLoop');
    if (loop) loop.onclick = function () {
      var s = DRILL.session;
      if (!s) return;
      if (s.loop) { s.loop = null; loop.classList.remove('on'); A.toast('已关闭循环'); return; }
      s.loop = true;
      loop.classList.add('on');
      au.currentTime = g.start;
      au.play();
    };
  }

  function answerDrill(no, letter) {
    var s = DRILL.session;
    if (!s || s.judged[no]) return;
    var q = null;
    s.g.qs.forEach(function (x) { if (x.no === no) q = x; });
    if (!q) return;
    s.judged[no] = true;
    s.ans[no] = letter;
    var ok = (letter === q.answer);
    if (ok) s.right++;

    var card = $('drillQs').querySelector('.tr-q[data-no="' + no + '"]');
    if (card) {
      var opts = card.querySelectorAll('.tr-opt');
      for (var i = 0; i < opts.length; i++) {
        var k = opts[i].getAttribute('data-k');
        opts[i].classList.add('locked');
        if (k === q.answer) opts[i].classList.add('right');
        else if (k === letter) opts[i].classList.add('wrong');
      }
      var fb = $('fb' + no);
      if (fb) {
        var ansTxt = q.answer + (q.answerText ? ' (' + q.answerText + ')' : '') +
          (q.options && q.options[q.answer] ? ' — ' + q.options[q.answer] : '');
        fb.innerHTML = '<div class="tr-expl">正确答案：' + esc(ansTxt) +
          (q.expl ? '<br>' + esc(q.expl) : '') + '</div>';
      }
    }
    if (!ok) {
      A.addWrong({
        paper: s.g.pid, paperTitle: s.g.title, no: q.no,
        part: s.g.type === 'listening' ? 'listening' : 'reading',
        kind: s.g.type === 'cloze' ? 'cloze' : (s.g.type === 'matching' ? 'matching' : 'mcq'),
        stem: q.stem, answer: q.answer, answerText: q.answerText || '',
        mine: letter, options: q.options || {}, expl: q.expl || ''
      });
    }
    var pr = $('drillProg');
    if (pr) pr.textContent = Object.keys(s.judged).length + ' / ' + s.total;
    if (Object.keys(s.judged).length >= s.total && !s.finished) {
      s.finished = true;
      saveDrill();
      renderDrillSum();
    }
  }

  function saveDrill() {
    var s = DRILL.session;
    if (!s) return;
    var prog = A.store.kv('drillProg', {});
    prog[s.g.id] = { r: s.right, t: s.total, at: Date.now() };
    A.store.setKv('drillProg', prog);
    if (!s.counted) {
      s.counted = true;
      var st = A.store.stats();
      st.todayDrill = (st.todayDrill || 0) + 1;
      A.store.setStats(st);
      A.store.bumpDay();
      if (A.flowCheck) A.flowCheck('drill');
    }
  }

  function renderDrillSum() {
    var s = DRILL.session;
    if (!s) return;
    var box = $('drillSum');
    if (!box) return;
    var rate = s.total ? Math.round(s.right / s.total * 100) : 0;
    var missed = [];
    s.g.qs.forEach(function (q) { if (s.ans[q.no] !== q.answer) missed.push(q.no); });
    var gs = drillGroups();
    var idx = -1;
    gs.forEach(function (g, i) { if (g.id === s.g.id) idx = i; });
    var next = idx >= 0 ? gs[(idx + 1) % gs.length] : null;
    box.innerHTML = '<div class="tr-card tr-sum">' +
      '<div class="tr-sum-top">本组完成 · 答对 <b>' + s.right + '</b> / ' + s.total + '（' + rate + '%）</div>' +
      '<div class="tr-dim">' + (missed.length ? '错题：第 ' + missed.join('、') + ' 题，已进错题本，按 1 天间隔排期复习' : '全对，这组可以过了') + '</div>' +
      '<div class="btn-row"><button class="btn ghost" id="drillAgain">重做本组</button>' +
      (next ? '<button class="btn primary" id="drillNext">下一组</button>' : '') + '</div></div>';
    var again = $('drillAgain');
    if (again) again.onclick = function () { startDrill(s.g); };
    var nx = $('drillNext');
    if (nx) nx.onclick = function () { startDrill(next); };
  }

  /* ================= 单词 ↔ 真题索引 ================= */
  var IDX = null, IDX_WAIT = [], IDX_LOADING = false;

  function ensureIndex(cb) {
    if (IDX) { cb(IDX); return; }
    IDX_WAIT.push(cb);
    if (IDX_LOADING) return;
    IDX_LOADING = true;
    if (window.__DATA && window.__DATA['wordindex']) {
      IDX = window.__DATA['wordindex'];
      IDX_LOADING = false;
      flushIdx();
      return;
    }
    A.loadScript('data/wordindex.js', function () {
      IDX = window.__DATA['wordindex'];
      IDX_LOADING = false;
      flushIdx();
    }, function () {
      IDX_LOADING = false;
      flushIdx();
    });
  }

  function flushIdx() {
    var list = IDX_WAIT;
    IDX_WAIT = [];
    for (var i = 0; i < list.length; i++) {
      try { list[i](IDX); } catch (e) { }
    }
  }

  function candsOf(low) {
    var out = [low];
    if (/ies$/.test(low)) out.push(low.slice(0, -3) + 'y');
    if (/ves$/.test(low)) out.push(low.slice(0, -3) + 'f', low.slice(0, -3) + 'fe');
    if (/es$/.test(low)) out.push(low.slice(0, -2));
    if (/s$/.test(low)) out.push(low.slice(0, -1));
    if (/ing$/.test(low)) { out.push(low.slice(0, -3), low.slice(0, -3) + 'e'); }
    if (/ed$/.test(low)) { out.push(low.slice(0, -2), low.slice(0, -1)); }
    if (/ly$/.test(low)) out.push(low.slice(0, -2));
    return out;
  }

  function idxHit(word) {
    if (!IDX || !IDX.index) return null;
    var list = candsOf(String(word).toLowerCase());
    for (var i = 0; i < list.length; i++) {
      var hit = IDX.index[list[i]];
      if (hit && hit.length) {
        var papers = hit.map(function (n) { return IDX.papers[n]; });
        return { key: list[i], papers: papers };
      }
    }
    return null;
  }

  function paperLinks(papers, max) {
    return papers.slice(0, max || 4).map(function (p) {
      return '<a href="javascript:;" class="tr-plink" onclick="App.openPaper(\'' + p.id + '\')">' + esc(p.title) + '</a>';
    }).join('、');
  }

  A.wordExtraHtml = function (word) {
    if (!IDX) {
      ensureIndex(function (d) {
        if (d && S.view === 'vocab' && A.RENDER.vocab) A.RENDER.vocab();
      });
      return '<div class="tr-idx tr-dim">正在查这个词在真题里的出处…</div>';
    }
    var hit = idxHit(word);
    if (!hit) return '<div class="tr-idx tr-dim">真题语料里没有匹配到这个词（可能是超纲词、人名或变形没覆盖）</div>';
    return '<div class="tr-idx"><b>真题出现 ' + hit.papers.length + ' 套</b>' +
      '<div class="tr-idx-list">' + paperLinks(hit.papers, 4) +
      (hit.papers.length > 4 ? ' 等' + hit.papers.length + ' 套' : '') + '</div>' +
      '<div class="tr-dim">点套名直接打开那套真题</div></div>';
  };

  A.wordIdxLine = function (word) {
    var box = $('wsIdx');
    if (!box) return;
    box.innerHTML = '<span class="tr-dim">查真题出处…</span>';
    ensureIndex(function () {
      if (!box || !document.body.contains(box)) return;
      var hit = idxHit(word);
      if (!hit) { box.innerHTML = '<span class="tr-dim">真题语料未出现</span>'; return; }
      box.innerHTML = '<b>真题出现 ' + hit.papers.length + ' 套</b>' +
        '<div class="tr-idx-list">' + paperLinks(hit.papers, 3) + (hit.papers.length > 3 ? ' 等' : '') + '</div>';
    });
  };

  /* ================= 错题遗忘曲线 ================= */
  var WT = { active: false, queue: [], i: 0, right: 0, review: false };

  function dueWrong() {
    var now = Date.now();
    return A.store.wrong().filter(function (w) { return !w.due || w.due <= now; });
  }

  function findWrong(item) {
    var arr = A.store.wrong();
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].paper === item.paper && arr[i].no === item.no) return { arr: arr, idx: i };
    }
    return null;
  }

  function gradeWrong(item, ok) {
    var f = findWrong(item);
    if (!f) return;
    var it = f.arr[f.idx];
    it.lv = ok ? Math.min(5, (it.lv || 0) + 1) : 0;
    it.due = Date.now() + REVIEW_LV[it.lv] * DAY;
    A.store.setWrong(f.arr);
  }

  A.RENDER.wrongtest = function () {
    var body = $('wt2Body');
    if (!body) return;
    if (WT.active) { renderWrongQ(); return; }
    var ws = A.store.wrong();
    var due = dueWrong();
    var mastered = ws.filter(function (w) { return (w.lv || 0) >= 3; }).length;
    var lv = [0, 0, 0, 0, 0, 0];
    ws.forEach(function (w) { lv[Math.min(5, w.lv || 0)]++; });
    body.innerHTML = '<div class="tr-card tr-wt-head">' +
      '<div class="tr-wt-nums">' +
      '<div><b>' + due.length + '</b><span>今日到期</span></div>' +
      '<div><b>' + ws.length + '</b><span>错题总数</span></div>' +
      '<div><b>' + mastered + '</b><span>连对 ≥3 次</span></div></div>' +
      '<div class="tr-wt-note">按遗忘曲线排期：答对一次间隔 1 → 3 → 7 → 15 → 30 天，答错回到第 1 天。到期题会自动出现在这里。</div>' +
      '<div class="btn-row"><button class="btn primary" id="wtStart">' +
      (due.length ? '开始重测（' + Math.min(20, due.length) + ' 题）' : '提前复习 10 题') + '</button></div>' +
      (due.length ? '' : '<div class="tr-dim" style="margin-top:8px">目前没有到期的错题；也可以提前抽 10 题复习。</div>') +
      '</div>' +
      '<div class="tr-card tr-wt-lv"><div class="tr-sub">记忆等级分布</div>' +
      '<div class="tr-bars">' + lv.map(function (n, i) {
        return '<div class="tr-bar-row"><span class="tr-bar-k">第 ' + i + ' 级</span>' +
          '<div class="tr-bar-track"><i style="width:' + (ws.length ? Math.round(n / ws.length * 100) : 0) + '%"></i></div>' +
          '<em>' + n + '</em></div>';
      }).join('') + '</div></div>';
    $('wtStart').onclick = function () {
      var q = due.slice(0, 20);
      WT.review = false;
      if (!q.length) {
        q = ws.slice().sort(function (a, b) { return (a.due || 0) - (b.due || 0); }).slice(0, 10);
        WT.review = true;
      }
      if (!q.length) { A.toast('错题本是空的，先去做套题'); return; }
      WT.active = true; WT.queue = q; WT.i = 0; WT.right = 0; WT.answered = false;
      renderWrongQ();
    };
  };

  function renderWrongQ() {
    var body = $('wt2Body');
    var w = WT.queue[WT.i];
    if (!w) { renderWrongSum(); return; }
    WT.answered = false;
    var opts = Object.keys(w.options || {}).sort();
    var optHtml = '';
    if (opts.length) {
      opts.forEach(function (L) {
        optHtml += '<div class="opt wt2-opt" data-k="' + L + '"><span class="key">' + L + '</span>' +
          '<span class="opt-t">' + esc(w.options[L]) + '</span></div>';
      });
    }
    var stemRaw = String(w.stem || '').trim();
    var stemShow = (stemRaw === String(w.no) || !stemRaw) ? '（这道题是填空题，回忆当时的答案）' : esc(stemRaw);
    body.innerHTML = '<div class="tr-card tr-sess-head">' +
      '<div class="tr-sess-top"><button class="link" id="wtExit">‹ 退出</button>' +
      '<span>' + (WT.i + 1) + ' / ' + WT.queue.length + ' · 记住 ' + WT.right + '</span></div>' +
      '<div class="tr-item-t">' + esc(w.paperTitle) + ' · 第 ' + w.no + ' 题</div>' +
      '<div class="tr-item-s">' + (WT.review ? '提前复习' : '到期复习') +
      ' · 当前第 ' + (w.lv || 0) + ' 级' + (w.due ? ' · 下次 ' + shortDate(w.due) : '') + '</div></div>' +
      '<div class="tr-card tr-wt-q">' +
      '<div class="q-stem">' + stemShow + '</div>' +
      (opts.length ? '<div class="tr-opts">' + optHtml + '</div>' :
        '<div class="tr-dim">这道题没有存选项（选词/匹配题），先自己回忆，再点下面自评。</div>' +
        '<div class="btn-row"><button class="btn ghost" id="wtMiss">没记住</button>' +
        '<button class="btn primary" id="wtKnow">我会了</button></div>') +
      '<div id="wtFb"></div></div>';

    $('wtExit').onclick = function () { WT.active = false; A.RENDER.wrongtest(); };
    var box = body.querySelector('.tr-wt-q');
    if (opts.length) {
      box.onclick = function (e) {
        var t = e.target.closest ? e.target.closest('.wt2-opt') : null;
        if (!t || WT.answered) return;
        judgeWrongItem(w, t.getAttribute('data-k'));
      };
    } else {
      $('wtKnow').onclick = function () { selfJudge(w, true); };
      $('wtMiss').onclick = function () { selfJudge(w, false); };
    }
  }

  function judgeWrongItem(w, mine) {
    if (WT.answered) return;
    WT.answered = true;
    var ok = (mine === w.answer);
    var box = document.querySelectorAll('.wt2-opt');
    for (var i = 0; i < box.length; i++) {
      var k = box[i].getAttribute('data-k');
      box[i].classList.add('locked');
      if (k === w.answer) box[i].classList.add('right');
      else if (k === mine) box[i].classList.add('wrong');
    }
    finishWrongJudge(w, ok, '你选 ' + mine);
  }

  function selfJudge(w, ok) {
    if (WT.answered) return;
    WT.answered = true;
    finishWrongJudge(w, ok, ok ? '自评记住' : '自评没记住');
  }

  function finishWrongJudge(w, ok, note) {
    if (ok) WT.right++;
    gradeWrong(w, ok);
    var f = findWrong(w);
    var lvNow = f ? f.arr[f.idx].lv : (ok ? 1 : 0);
    var waitDays = REVIEW_LV[lvNow] || 1;
    var st = A.store.stats();
    st.todayWrong = (st.todayWrong || 0) + 1;
    A.store.setStats(st);
    A.store.bumpDay();
    var fb = $('wtFb');
    if (fb) {
      fb.innerHTML = '<div class="tr-expl">' + note + ' · 正确答案 ' + esc(w.answer) +
        (w.answerText ? ' (' + esc(w.answerText) + ')' : '') +
        (w.expl ? '<br>' + esc(w.expl) : '') +
        '<br><b>' + (ok ? ('间隔已延长到 ' + waitDays + ' 天后') : '回到第 1 级，明天再见') + '</b></div>' +
        '<button class="btn primary wide" id="wtNext">下一题</button>';
      var nx = $('wtNext');
      if (nx) nx.onclick = function () { WT.i++; WT.answered = false; renderWrongQ(); };
    }
  }

  function renderWrongSum() {
    var body = $('wt2Body');
    var n = WT.queue.length;
    body.innerHTML = '<div class="tr-card tr-sum"><div class="tr-sum-top">本轮复习完成 · 记住 <b>' + WT.right + '</b> / ' + n + '</div>' +
      '<div class="tr-dim">' + (WT.review ? '这轮是提前复习，复习结果同样计入记忆等级，下次按新间隔出现。' : '到期的题已按曲线顺延，没记住的明天会重新出现。') + '</div>' +
      '<div class="btn-row"><button class="btn primary" id="wtBack">回到错题概览</button></div></div>';
    $('wtBack').onclick = function () { WT.active = false; A.RENDER.wrongtest(); };
    if (A.flowCheck) A.flowCheck('wrong');
  }

  /* ================= 听力听写 ================= */
  var DICT = { g: null, blanks: [], checked: false };
  var DICT_STOP = {};
  ('the a an and or but to of in on for with is are was were be been being it its this that these those as at by from will would can could ' +
    'have has had do does did not no you your we our they their he she his her him them i me my us than then so if when what which who ' +
    'how why all also just more most some any one two very up out about into over after before there here their ours yours').split(' ')
    .forEach(function (w) { DICT_STOP[w] = 1; });

  function normWord(s) {
    return String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function closeDict() {
    var sh = $('dictSheet');
    if (sh) sh.hidden = true;
    var au = $('dictAudio');
    if (au) { au.pause(); au.ontimeupdate = null; }
  }

  function playDict() {
    var au = $('dictAudio'), g = DICT.g;
    if (!au || !g) return;
    if (!g.audio) { A.toast('这一段没有音频文件'); return; }
    if (au.currentTime < g.start - 0.5 || au.currentTime >= g.end) au.currentTime = g.start;
    var pr = au.play();
    if (pr && pr.catch) pr.catch(function () { A.toast('再点一次播放开始'); });
  }

  function bindDictOnce() {
    var play = $('dictPlay');
    if (!play || play.__bound) return;
    play.__bound = true;
    $('dictClose').onclick = closeDict;
    play.onclick = playDict;
    $('dictSlow').onclick = function () {
      var au = $('dictAudio');
      var slow = au.playbackRate === 0.75;
      au.playbackRate = slow ? 1 : 0.75;
      this.textContent = slow ? '0.75x' : '1.0x';
      this.classList.toggle('on', !slow);
    };
    $('dictReveal').onclick = function () {
      var box = $('dictResult'), g = DICT.g;
      if (!g) return;
      box.innerHTML = '<div class="dict-full"><div class="tr-sub">本段原文</div>' +
        esc(g.text || '').replace(/\n/g, '<br>') +
        (g.textCn ? '<div class="sc-cn">' + esc(g.textCn).replace(/\n/g, '<br>') + '</div>' : '') + '</div>';
    };
    $('dictCheck').onclick = checkDict;
    var au = $('dictAudio');
    au.ontimeupdate = function () {
      var g = DICT.g;
      if (g && au.currentTime >= g.end) au.pause();
    };
  }

  function checkDict() {
    if (!DICT.blanks.length) { A.toast('本段没有可挖的空'); return; }
    var inputs = $('dictScript').querySelectorAll('.dc-in');
    var ok = 0;
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i], b = DICT.blanks[i];
      var good = normWord(inp.value) && normWord(inp.value) === normWord(b.w);
      inp.classList.remove('ok', 'no');
      inp.classList.add(good ? 'ok' : 'no');
      if (good) ok++;
      else if (!inp.__corr) {
        var sp = document.createElement('span');
        sp.className = 'dc-right';
        sp.textContent = b.w;
        inp.parentNode.insertBefore(sp, inp.nextSibling);
        inp.__corr = sp;
      }
    }
    var miss = [];
    for (var j = 0; j < inputs.length; j++) {
      if (!inputs[j].classList.contains('ok')) miss.push(DICT.blanks[j].w);
    }
    var sum = '<div class="dc-sum">听写正确 <b>' + ok + '</b> / ' + inputs.length + '</div>';
    if (miss.length) sum += '<div class="dc-miss">没写对：' + esc(miss.join(' / ')) + '</div>';
    $('dictResult').innerHTML = sum;

    var st = A.store.stats();
    st.todayDict = (st.todayDict || 0) + 1;
    A.store.setStats(st);
    A.store.bumpDay();
    var rec = A.store.kv('dict', { total: 0, right: 0, sets: 0 });
    rec.total += inputs.length;
    rec.right += ok;
    rec.sets += 1;
    A.store.setKv('dict', rec);
    if (A.flowCheck) A.flowCheck('dict');
    A.toast(ok === inputs.length ? '全对，这段可以过了' : '再听一遍，错词单独抄一次');
  }

  A.openDictation = function (g) {
    if (!g || !g.text) { A.toast('这一段没有听力原文，无法听写'); return; }
    var text = String(g.text).replace(/\r/g, '');
    var words = [], re = /[A-Za-z][A-Za-z'\u2019\-]*/g, m;
    while ((m = re.exec(text))) { words.push({ w: m[0], s: m.index, e: re.lastIndex }); }
    var cands = [];
    words.forEach(function (x, i) {
      var low = x.w.toLowerCase();
      if (x.w.length < 5 || DICT_STOP[low]) return;
      // 句中大写开头的多半是人名、地名，挖空没有意义
      if (/^[A-Z]/.test(x.w)) {
        var before = text.slice(0, x.s).replace(/[ \t\r\n]+$/, '');
        if (before && !/[.!?]$/.test(before)) return;
      }
      cands.push(i);
    });
    var want = Math.min(12, Math.max(4, Math.round(words.length / 10)));
    var sel = [];
    if (cands.length) {
      var step = cands.length / want;
      for (var k = 0; k < want; k++) {
        var vi = cands[Math.min(cands.length - 1, Math.floor(k * step + step / 2))];
        if (sel.indexOf(vi) < 0) sel.push(vi);
      }
    }
    sel.sort(function (a, b) { return a - b; });
    var html = '', last = 0;
    sel.forEach(function (vi, k) {
      var x = words[vi];
      html += esc(text.slice(last, x.s)).replace(/\n/g, '<br>');
      var wpx = Math.max(6, Math.min(18, x.w.length + 3));
      html += '<input class="dc-in" data-i="' + k + '" type="text" autocomplete="off" autocorrect="off" ' +
        'autocapitalize="off" spellcheck="false" style="width:' + wpx + 'ch">';
      last = x.e;
    });
    html += esc(text.slice(last)).replace(/\n/g, '<br>');
    DICT.blanks = sel.map(function (vi) { return { w: words[vi].w }; });
    DICT.g = { start: g.start, end: g.end, audio: g.audio, text: g.text, textCn: g.textCn };
    DICT.checked = false;
    $('dictScript').innerHTML = html;
    $('dictResult').innerHTML = '<div class="tr-dim">共 ' + sel.length + ' 个空。先听 2–3 遍再填，大小写不扣分。</div>';
    $('dictSheet').hidden = false;
    bindDictOnce();
    var au = $('dictAudio');
    au.pause();
    if (g.audio) au.src = g.audio; else au.removeAttribute('src');
    au.playbackRate = 1;
    $('dictSlow').textContent = '0.75x';
    $('dictSlow').classList.remove('on');
    var main = $('abAudio');
    if (main && !main.paused) main.pause();
    setTimeout(playDict, 150);
  };

  /* ================= 冲刺计划 & 倒计时 ================= */
  A.renderPlan = function () {
    var box = $('planBox');
    if (!box) return;
    var st = A.store.stats(), s = settings(), d = daysLeft();
    var phase = d > 30 ? '基础期' : d > 15 ? '强化期' : d > 7 ? '冲刺期' : d > 0 ? '临考期' : '考试周';
    var items = [];
    items.push({ t: '背单词 ' + s.goal + ' 个', now: st.today + '/' + s.goal, ok: st.today >= s.goal, view: 'vocab' });
    items.push({ t: '专项训练 1 组', now: st.todayDrill + '/1', ok: st.todayDrill >= 1, view: 'drill' });
    items.push({ t: d > 30 ? '模考 1 套（隔天）' : '模考 1 套', now: st.todayExams + '/1', ok: st.todayExams >= 1, view: 'exam' });
    if (d <= 15) items.push({ t: '作文 1 篇', now: st.todayWrite + '/1', ok: st.todayWrite >= 1, view: 'write' });
    if (d <= 7) items.push({ t: '听写 1 段', now: st.todayDict + '/1', ok: st.todayDict >= 1, view: 'exam' });
    var done = items.filter(function (x) { return x.ok; }).length;
    var html = '<div class="tr-card tr-plan">' +
      '<div class="tr-plan-head"><b>' + phase + '</b><span>今日 ' + done + ' / ' + items.length + '</span></div>' +
      '<div class="tr-plan-items">' + items.map(function (it) {
        return '<div class="tr-plan-item' + (it.ok ? ' ok' : '') + '" data-view="' + it.view + '">' +
          '<span class="tr-check">' + (it.ok ? '✓' : '') + '</span>' +
          '<span class="tr-plan-t">' + it.t + '</span><em>' + it.now + '</em></div>';
      }).join('') + '</div>' +
      '<div class="tr-plan-note">计划随剩余天数自动变化；考试日期可在「我的」里改。</div></div>';
    box.innerHTML = html;
    box.onclick = function (e) {
      var it = e.target.closest ? e.target.closest('.tr-plan-item') : null;
      if (!it) return;
      A.go(it.getAttribute('data-view'));
    };
  };

  var origHome = A.RENDER.home;
  A.RENDER.home = function () {
    origHome();
    var d = daysLeft();
    var hd = $('heroDays');
    if (hd) {
      hd.textContent = d > 0 ? ('距 ' + examDateStr() + ' 还有 ' + d + ' 天') :
        (d === 0 ? '今天就是考试日，稳住' : '考试日已过 ' + (-d) + ' 天（可在「我的」改日期）');
    }
    var td = $('tileDrill');
    if (td && DRILL.data && DRILL.data.counts) {
      var total = 0;
      Object.keys(DRILL.data.counts).forEach(function (k) { total += DRILL.data.counts[k].groups; });
      td.textContent = total + ' 组';
    }
    var tr = $('tileReport');
    if (tr) {
      var arr = A.store.kv('scores', []);
      tr.textContent = arr.length ? (fmtScore(arr[arr.length - 1].score.total) + ' 分') : '--';
    }
    var tw = $('tileWrong');
    if (tw) {
      var due = dueWrong().length;
      tw.textContent = due ? (due + ' 到期') : (A.store.wrong().length + ' 题');
    }
    A.renderPlan();
  };

  /* ================= 设置：考试日期 / 每日提醒 ================= */
  function syncReminder() {
    var s = settings();
    if (!window.NotifyBridge) return;
    try {
      if (s.reminder) {
        var p = String(s.reminderTime || '20:30').split(':');
        window.NotifyBridge.setDaily(parseInt(p[0], 10) || 20, parseInt(p[1], 10) || 30);
      } else {
        window.NotifyBridge.cancel();
      }
    } catch (e) { }
  }

  A.renderExtraSettings = function () {
    var s = settings();
    var ed = $('examDateInput');
    if (ed) {
      ed.value = s.examDate;
      ed.onchange = function () {
        if (!this.value) { this.value = s.examDate; return; }
        saveSettings({ examDate: this.value });
        A.toast('考试日期已改为 ' + this.value);
        if (S.view === 'home') A.RENDER.home();
      };
    }
    var sel = $('reminderSelect');
    if (sel) {
      sel.value = s.reminder ? 'on' : 'off';
      sel.onchange = function () {
        saveSettings({ reminder: this.value === 'on' });
        syncReminder();
        if (this.value === 'on' && !window.NotifyBridge) A.toast('网页版没有系统通知，装成 APK 后生效');
        else A.toast(this.value === 'on' ? '已开启每日提醒' : '已关闭提醒');
      };
    }
    var ti = $('reminderTimeInput');
    if (ti) {
      ti.value = s.reminderTime || '20:30';
      ti.onchange = function () {
        if (!this.value) return;
        saveSettings({ reminderTime: this.value });
        syncReminder();
        A.toast('提醒时间改为 ' + this.value);
      };
    }
    var note = $('reminderNote');
    if (note) {
      note.textContent = window.NotifyBridge
        ? '系统通知已接入：每天到点弹一条提醒。首次开启会请求通知权限，被拒绝就到系统设置里手动开。'
        : '当前是网页/预览环境，没有系统通知；装成 APK 后由 Android 每天定时提醒。';
    }
    if (A.bindAiSettings) A.bindAiSettings();
  };

  A.syncReminder = syncReminder;

  /* ================= 对外挂载 ================= */
  A.addWrong = function (item) {
    var arr = A.store.wrong();
    var dup = arr.some(function (x) { return x.paper === item.paper && x.no === item.no; });
    if (dup) return;
    item.lv = 0;
    item.due = Date.now() + DAY;
    arr.push(item);
    A.store.setWrong(arr.slice(-500));
  };

  A.daysLeft = daysLeft;
  A.scoreFromSec = scoreFromSec;

  var dsheet = $('dictSheet');
  if (dsheet) {
    dsheet.addEventListener('click', function (e) {
      if (e.target === this) closeDict();
    });
  }

  var origBack = A.handleAndroidBack;
  A.handleAndroidBack = function () {
    var ds = $('dictSheet');
    if (ds && !ds.hidden) { closeDict(); return true; }
    if (S.view === 'drill' && DRILL.session) {
      stopDrillAudio();
      DRILL.session = null;
      renderDrill();
      return true;
    }
    if (S.view === 'wrongtest' && WT.active) {
      WT.active = false;
      A.RENDER.wrongtest();
      return true;
    }
    return origBack ? origBack() : false;
  };

  setTimeout(function () { syncReminder(); }, 0);
})();
