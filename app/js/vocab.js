/* vocab.js —— 背单词、单词测验、我的、关于 */
(function () {
  'use strict';
  var A = window.App, S = A.S, el = A.el, esc = A.esc;
  function $(id) { return document.getElementById(id); }

  var INTERVALS = [0, 1, 2, 4, 7, 15, 30]; // 天，按掌握等级
  var V = { loaded: false, queue: [], idx: 0, revealed: false, sessionDone: 0, test: null };

  /* ---------- 数据加载 ---------- */
  function ensureVocab(cb) {
    if (S.vocab) { cb(); return; }
    if (window.__DATA && window.__DATA['vocab']) { S.vocab = window.__DATA['vocab']; cb(); return; }
    A.toast('正在载入词库…');
    A.loadScript('data/vocab.js', function () {
      S.vocab = window.__DATA['vocab'];
      if (!S.vocab) { A.toast('词库载入失败'); return; }
      cb();
    }, function () { A.toast('词库载入失败'); });
  }

  /* ---------- 记忆调度 ---------- */
  function grade(word, lv) {
    var w = A.store.words();
    var rec = w[word] || { lv: 0, seen: 0, right: 0 };
    rec.seen++;
    if (lv === 0) { rec.lv = 0; rec.due = Date.now() + 30 * 60 * 1000; rec.right = rec.right || 0; }
    else {
      rec.lv = Math.min(6, (rec.lv || 0) + lv);
      rec.due = Date.now() + (INTERVALS[rec.lv] || 1) * 86400000;
      rec.right = (rec.right || 0) + 1;
    }
    w[word] = rec;
    A.store.setWords(w);

    var st = A.store.stats();
    st.today = (st.today || 0) + 1;
    st.totalWords = (st.totalWords || 0) + 1;
    A.store.setStats(st);
    A.store.bumpDay();
    if (A.flowCheck) A.flowCheck('vocab');
  }

  function pickQueue() {
    var all = S.vocab;
    var w = A.store.words();
    var set = A.store.settings();
    var now = Date.now();
    var due = [], fresh = [];
    for (var i = 0; i < all.length; i++) {
      var word = all[i][0];
      var rec = w[word];
      if (rec) { if (rec.due <= now) due.push(all[i]); }
      else fresh.push(all[i]);
    }
    var need = Math.max(0, set.goal - A.store.stats().today);
    due.sort(function () { return Math.random() - 0.5; });
    var q = due.slice(0, Math.max(need, 12));
    var rest = Math.max(0, need - q.length);
    if (rest > 0) {
      fresh.sort(function () { return Math.random() - 0.5; });
      q = q.concat(fresh.slice(0, rest));
    }
    if (!q.length) {
      // 全都到期学完，就复习最久没碰的
      var pool = all.slice().sort(function (a, b) {
        var ra = w[a[0]], rb = w[b[0]];
        return ((ra && ra.due) || 0) - ((rb && rb.due) || 0);
      });
      q = pool.slice(0, 13);
    }
    V.queue = q;
    V.idx = 0;
    V.revealed = false;
  }

  /* ---------- 背单词页 ---------- */
  A.RENDER.vocab = function () {
    ensureVocab(function () {
      if (!V.queue.length) pickQueue();
      var set = A.store.settings();
      var st = A.store.stats();
      $('vocabDone').textContent = st.today;
      $('vocabGoal').textContent = set.goal;
      $('vocabBar').style.width = Math.min(100, (st.today / set.goal * 100)) + '%';
      $('starCount').textContent = A.store.star().length;
      renderFlash();
    });
  };

  function renderFlash() {
    var card = $('flashCard');
    var cur = V.queue[V.idx];
    if (!cur) {
      card.innerHTML = '<div class="f-empty">今日 ' + A.store.settings().goal + ' 个词已完成 ✓<br><br>' +
        '可以去「小测」检查一下，或者切到「模考」做套题。</div>';
      $('flashBtns').innerHTML = '<button class="btn ghost" data-go="wordtest">去小测</button>' +
        '<button class="btn ghost" id="btnMoreWords">再来 10 个</button>';
      bindMore();
      return;
    }
    var word = cur[0], ph = cur[1], trans = cur[3], exEn = cur[4], exCn = cur[5];
    var stars = A.store.star();
    var starred = stars.indexOf(word) >= 0;
    var mode = A.store.settings().mode;

    if (!V.revealed) {
      card.innerHTML = '<div class="f-word">' + esc(mode === 'cn2en' ? trans : word) + '</div>' +
        (mode === 'en2cn' && ph ? '<div class="f-ph">' + esc(ph) + '</div>' : '') +
        '<div class="f-hint">点击卡片查看' + (mode === 'cn2en' ? '英文' : '释义') + '</div>';
      card.onclick = function () { V.revealed = true; renderFlash(); };
      $('flashBtns').innerHTML =
        '<button class="btn ghost" id="btnStar">' + (starred ? '★ 已收藏' : '☆ 收藏') + '</button>' +
        '<button class="btn primary" id="btnReveal">看释义</button>';
      $('btnReveal').onclick = function () { V.revealed = true; renderFlash(); };
      $('btnStar').onclick = function () { toggleStar(word); };
      return;
    }

    card.innerHTML = '<div class="f-word">' + esc(word) + '</div>' +
      (ph ? '<div class="f-ph">' + esc(ph) + '</div>' : '') +
      '<div class="f-trans">' + esc(trans) + '</div>' +
      (exEn ? '<div class="f-ex">' + esc(exEn) + '<br><i style="color:#8b97a1">' + esc(exCn) + '</i></div>' : '');
    var extra = A.wordExtraHtml ? A.wordExtraHtml(word) : '';
    if (extra) card.innerHTML += extra;
    card.onclick = null;
    $('flashBtns').innerHTML =
      '<button class="btn ghost" data-lv="0">不认识</button>' +
      '<button class="btn ghost" data-lv="1">模糊</button>' +
      '<button class="btn primary" data-lv="2">认识</button>';
    var btns = $('flashBtns').querySelectorAll('[data-lv]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () {
        grade(word, parseInt(this.getAttribute('data-lv'), 10));
        V.idx++;
        V.revealed = false;
        var st = A.store.stats();
        $('vocabDone').textContent = st.today;
        $('vocabBar').style.width = Math.min(100, (st.today / A.store.settings().goal * 100)) + '%';
        renderFlash();
      };
    }
  }

  function toggleStar(word) {
    var stars = A.store.star();
    var i = stars.indexOf(word);
    if (i >= 0) { stars.splice(i, 1); A.toast('已移出生词本'); }
    else { stars.push(word); A.toast('已加入生词本'); }
    A.store.setStar(stars);
    $('starCount').textContent = stars.length;
    renderFlash();
  }

  function bindMore() {
    var b = $('btnMoreWords');
    if (b) b.onclick = function () {
      V.queue = []; pickQueue(); renderFlash();
    };
  }

  /* ---------- 单词测验 ---------- */
  A.RENDER.wordtest = function () {
    ensureVocab(function () {
      if (!V.test) buildTest();
      renderTest();
    });
  };

  function buildTest() {
    var all = S.vocab;
    var learned = A.store.words();
    var pool = all.filter(function (x) { return learned[x[0]]; });
    if (pool.length < 8) pool = all;
    var qs = [];
    var picked = [];
    for (var i = 0; i < 10; i++) {
      var a;
      do { a = pool[(Math.random() * pool.length) | 0]; } while (picked.indexOf(a[0]) >= 0 && picked.length < pool.length);
      picked.push(a[0]);
      var opts = [a[3]];
      var guard = 0;
      while (opts.length < 4 && guard++ < 200) {
        var b = pool[(Math.random() * pool.length) | 0];
        if (opts.indexOf(b[3]) < 0) opts.push(b[3]);
      }
      opts.sort(function () { return Math.random() - 0.5; });
      qs.push({ word: a[0], ph: a[1], right: a[3], opts: opts, ans: 0 });
    }
    V.test = { qs: qs, i: 0, score: 0, locked: false };
  }

  function renderTest() {
    var t = V.test;
    $('wtProgress').textContent = (t.i + 1) + ' / ' + t.qs.length;
    $('wtScore').textContent = t.score + ' 分';
    var q = t.qs[t.i];
    if (!q) {
      $('wtWord').textContent = '完成';
      $('wtOpts').innerHTML = '<div class="wt-tip">得分 ' + t.score + ' / ' + t.qs.length * 10 + '</div>' +
        '<button class="btn primary wide" id="btnNewTest">再测一轮</button>';
      $('wtTip').textContent = '';
      $('btnNewTest') && ($('btnNewTest').onclick = function () { V.test = null; buildTest(); renderTest(); });
      return;
    }
    $('wtWord').textContent = q.word;
    $('wtTip').textContent = q.ph || '';
    var box = $('wtOpts');
    box.innerHTML = '';
    q.opts.forEach(function (o, i) {
      var b = el('button', 'wt-opt', esc(o));
      b.onclick = function () {
        if (t.locked) return;
        t.locked = true;
        var ok = (o === q.right);
        if (ok) { t.score += 10; b.classList.add('ok'); }
        else {
          b.classList.add('no');
          var all = box.querySelectorAll('.wt-opt');
          for (var j = 0; j < all.length; j++) {
            if (all[j].textContent === q.right) all[j].classList.add('ok');
          }
        }
        $('wtScore').textContent = t.score + ' 分';
        setTimeout(function () {
          t.i++; t.locked = false; renderTest();
        }, ok ? 700 : 1200);
      };
      box.appendChild(b);
    });
  }

  /* ---------- 我的 ---------- */
  A.RENDER.me = function () {
    var st = A.store.stats();
    var words = A.store.words();
    var learned = Object.keys(words).filter(function (k) { return words[k].lv >= 1; }).length;
    var stats = $('meStats');
    stats.innerHTML =
      '<div class="st"><b>' + learned + '</b><span>已掌握</span></div>' +
      '<div class="st"><b>' + Object.keys(words).length + '</b><span>学过词</span></div>' +
      '<div class="st"><b>' + (st.exams || 0) + '</b><span>模考次数</span></div>' +
      '<div class="st"><b>' + (st.streak || 0) + '</b><span>连续打卡</span></div>';

    // 错题本
    var wrong = $('wrongList');
    var ws = A.store.wrong();
    wrong.innerHTML = '';
    if (!ws.length) wrong.appendChild(el('div', 'empty', '还没有错题，去模考一套'));
    ws.slice(-60).reverse().forEach(function (w, i) {
      var it = el('div', 'w-item w-click');
      var dueTxt = '';
      if (w.due) {
        var leftDays = Math.ceil((w.due - Date.now()) / 86400000);
        dueTxt = leftDays <= 0 ? '今日复习' : ('还有 ' + leftDays + ' 天');
      }
      it.innerHTML = '<div class="w-top"><span class="wl">' + esc(w.paperTitle) + ' · 第 ' + w.no + ' 题' +
        (dueTxt ? ' · ' + dueTxt : '') + '</span>' +
        '<span class="wl" style="color:#8b97a1">重做 ›</span></div>' +
        '<div class="w-trans">' + esc(String(w.stem).slice(0, 70)) + '</div>' +
        '<div class="rc-exp">你选 ' + esc(w.mine) + ' → 正确 ' + esc(w.answer) +
        (w.answerText ? ' (' + esc(w.answerText) + ')' : '') + '</div>';
      it.onclick = function () {
        if (w.paper && A.openPaperAt) A.openPaperAt(w.paper, w.no);
      };
      wrong.appendChild(it);
    });

    // 生词本
    var starList = $('starList');
    var stars = A.store.star();
    starList.innerHTML = '';
    if (!stars.length) starList.appendChild(el('div', 'empty', '单词页点「生词本」即可收藏'));
    ensureVocab(function () {
      var idx = {};
      S.vocab.forEach(function (v) { idx[v[0]] = v; });
      stars.slice(-80).reverse().forEach(function (w) {
        var d = idx[w];
        var it = el('div', 'w-item');
        it.innerHTML = '<div class="w-top"><span class="w-word">' + esc(w) + '</span>' +
          '<button class="link" data-del="' + esc(w) + '">移出</button></div>' +
          '<div class="w-trans">' + esc(d ? d[3] : '') + '</div>';
        it.querySelector('[data-del]').onclick = function () {
          var s2 = A.store.star();
          var i2 = s2.indexOf(w);
          if (i2 >= 0) s2.splice(i2, 1);
          A.store.setStar(s2);
          A.RENDER.me();
        };
        starList.appendChild(it);
      });
    });

    // 设置
    var set = A.store.settings();
    $('goalSelect').value = String(set.goal);
    $('modeSelect').value = set.mode;
    $('examModeSelect').value = set.examMode || 'practice';
    $('examModeSelect').onchange = function () {
      var s = A.store.settings();
      s.examMode = this.value;
      A.store.setSettings(s);
      A.toast(this.value === 'strict' ? '已开启考试模式：130 分钟倒计时，听力精听暂停' : '已切回练习模式');
    };
    $('goalSelect').onchange = function () {
      var s = A.store.settings(); s.goal = parseInt(this.value, 10);
      A.store.setSettings(s); V.queue = []; A.toast('目标已更新');
    };
    $('modeSelect').onchange = function () {
      var s = A.store.settings(); s.mode = this.value;
      A.store.setSettings(s); V.queue = []; A.toast('已切换');
    };
    $('btnClearWrong').onclick = function () {
      if (!confirm('清空错题本？')) return;
      A.store.setWrong([]); A.RENDER.me();
    };
    $('btnClearStar').onclick = function () {
      if (!confirm('清空生词本？')) return;
      A.store.setStar([]); A.RENDER.me();
    };

    if (A.renderExtraSettings) A.renderExtraSettings();
  };

  A.RENDER.about = function () {};

  /* 顶部统计 */
  var origHome = A.RENDER.home;
  A.RENDER.home = function () {
    var st = A.store.stats();
    $('topStat').textContent = (st.streak ? '连续 ' + st.streak + ' 天 · ' : '') + '今日 ' + st.today + ' 词';
    origHome();
  };
})();
