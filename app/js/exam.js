/* exam.js —— 首页、模考列表、答题、判分、资料库 */
(function () {
  'use strict';
  var A = window.App, S = A.S, el = A.el, esc = A.esc;

  var PART_NAME = { listening: '听力理解', reading: '阅读理解' };
  var KIND_NAME = { mcq: '', cloze: '选词填空', matching: '长篇匹配' };

  /* =============== 首页 =============== */
  A.RENDER.home = function () {
    var stats = A.store.stats();
    var set = A.store.settings();
    var words = A.store.words();
    var learned = Object.keys(words).length;
    var wrong = A.store.wrong().length;
    var exams = S.bank ? S.bank.exams : [];

    $('tileVocab').textContent = stats.today + ' / ' + set.goal;
    $('tileExam').textContent = exams.length + ' 套';
    $('tileWrong').textContent = wrong + ' 题';
    $('tileLib').textContent = (S.library && S.library.years ? S.library.years.length : 28) + ' 考次';

    var pct = Math.min(100, Math.round(stats.today / set.goal * 100));
    $('heroRingNum').textContent = pct;
    var streakTxt = stats.streak >= 2 ? ' · 已连续 ' + stats.streak + ' 天' : '';
    if (stats.today >= set.goal) {
      $('heroTitle').textContent = '今日目标已完成';
      $('heroSub').textContent = '已学 ' + learned + ' 词，去模考一套练手' + streakTxt;
    } else {
      $('heroTitle').textContent = '开始今日复习';
      $('heroSub').textContent = '还差 ' + (set.goal - stats.today) + ' 个单词，约 ' + Math.ceil((set.goal - stats.today) * 0.4) + ' 分钟' + streakTxt;
    }

    // 最近的做题记录
    var box = $('recentBox');
    box.innerHTML = '';
    var recent = [];
    exams.forEach(function (e) {
      var st = A.store.paperState(e.id);
      if (st && st.submitted) recent.push({ e: e, st: st });
    });
    recent.sort(function (a, b) { return (b.st.at || 0) - (a.st.at || 0); });
    if (!recent.length) {
      box.appendChild(el('div', 'empty', '还没做过套题，从「模考」开始第一套吧'));
    } else {
      recent.slice(0, 4).forEach(function (r) {
        var item = el('div', 'paper-item');
        item.innerHTML = '<div class="pi-main"><div class="pi-title">' + esc(r.e.title) + '</div>' +
          '<div class="pi-meta">正确率 ' + r.st.rate + '% · ' + r.st.right + '/' + r.st.total + '</div></div>' +
          '<div class="pi-score">' + r.st.rate + '%</div>';
        item.onclick = function () { A.go('result', { title: '成绩分析' }); };
        box.appendChild(item);
      });
    }
  };

  function $(id) { return document.getElementById(id); }

  /* =============== 模考列表 =============== */
  A.RENDER.exam = function () {
    var list = $('examList');
    var seg = $('examSeg');
    if (!seg.__bound) {
      seg.__bound = true;
      seg.addEventListener('click', function (e) {
        if (!e.target.classList.contains('seg-btn')) return;
        S.filter = e.target.getAttribute('data-filter');
        var btns = seg.querySelectorAll('.seg-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i] === e.target);
        renderExamList();
      });
    }
    renderExamList();
  };

  function renderExamList() {
    var list = $('examList');
    list.innerHTML = '';
    var exams = (S.bank && S.bank.exams) ? S.bank.exams : [];

    // 年份筛选
    var years = [];
    exams.forEach(function (e) { if (years.indexOf(String(e.year)) < 0) years.push(String(e.year)); });
    years.sort(function (a, b) { return b - a; });
    var ys = $('yearSeg');
    if (ys) {
      ys.innerHTML = '';
      ['all'].concat(years).forEach(function (y) {
        var b = el('button', 'seg-btn' + (String(S.year || 'all') === y ? ' on' : ''), y === 'all' ? '全部年份' : y);
        b.onclick = function () { S.year = y; renderExamList(); };
        ys.appendChild(b);
      });
    }

    var filtered = exams.filter(function (e) {
      if (S.year && S.year !== 'all' && String(e.year) !== String(S.year)) return false;
      if (S.filter === 'audio') return e.hasAudio;
      if (S.filter === 'reading') return e.readingOnly;
      return true;
    });
    if (!filtered.length) {
      list.appendChild(el('div', 'empty', '没有符合条件的套题'));
      return;
    }
    filtered.forEach(function (e) {
      var st = A.store.paperState(e.id);
      var item = el('div', 'paper-item');
      var tags = '';
      if (e.hasAudio) tags += '<span class="tag audio">含听力</span>';
      else if (e.counts && e.counts.listening) tags += '<span class="tag na">听力题 · 无音频</span>';
      if (e.readingOnly) tags += '<span class="tag read">纯阅读册</span>';
      if (st && st.submitted) tags += '<span class="tag done">已做 ' + st.rate + '%</span>';
      item.innerHTML = '<div class="pi-main"><div class="pi-title">' + esc(e.title) + '</div>' +
        '<div class="pi-meta">' + tags + (e.counts && e.counts.total ? '共 ' + e.counts.total + ' 题' : '') + '</div></div>' +
        '<div class="pi-score">' + (st && st.submitted ? (st.right + '') : '') + '</div>';
      item.onclick = function () { openPaper(e.id); };
      list.appendChild(item);
    });
  }

  /* =============== 打开试卷 =============== */
  function openPaper(id, focusNo) {
    var cached = A.dataOf('bank/' + id);
    if (cached) { startPaper(cached, focusNo); return; }
    A.toast('正在载入题目…');
    A.loadScript('data/bank/' + id + '.js', function () {
      var p = A.dataOf('bank/' + id);
      if (!p) { A.toast('题目载入失败'); return; }
      startPaper(p, focusNo);
    }, function () { A.toast('题目载入失败，请检查 data/bank 目录'); });
  }

  function startPaper(paper, focusNo) {
    S.paper = paper;
    S.answers = {};
    S.submitted = false;
    S.elapsed = 0;
    S.loop = null;
    var saved = A.store.paperState(paper.id);
    if (saved && saved.draft) {
      // 保留作答草稿
      S.answers = saved.draft || {};
    }
    S.cur = 0;
    if (focusNo != null) {
      var idx = paper.questions.findIndex(function (q) { return q.no === focusNo; });
      if (idx >= 0) S.cur = idx;
    }
    A.go('paper', { title: paper.title });
    renderPartNav();
    renderQuestion();
    startTimer();
  }

  function startTimer() {
    stopTimer();
    S.timer = setInterval(function () {
      if (S.submitted) return;
      S.elapsed++;
      updateTimerLabel();
      if (examLimit() && S.elapsed >= examLimit()) {
        stopTimer();
        A.toast('考试时间到，自动交卷');
        submit(true);
      }
    }, 1000);
    updateTimerLabel();
  }
  function examLimitMinutes() {
    // 有听力题（无论是否带音频）按 130 分钟；纯阅读册去掉 25 分钟听力，按 105 分钟
    var hasListening = S.paper && (S.paper.hasAudio || (S.paper.counts && S.paper.counts.listening));
    return hasListening ? 130 : 105;
  }
  function examLimit() {
    return A.store.settings().examMode === 'strict' ? examLimitMinutes() * 60 : 0;
  }
  function updateTimerLabel() {
    var t = $('paperTimer');
    if (!t) return;
    var limit = examLimit();
    if (limit) {
      var left = Math.max(0, limit - S.elapsed);
      t.textContent = A.fmtTime(left);
      t.classList.toggle('warn', left <= 15 * 60);
    } else {
      t.textContent = A.fmtTime(S.elapsed);
      t.classList.remove('warn');
    }
  }
  function stopTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

  /* =============== 答题页 =============== */
  A.RENDER.paper = function () {
    var p = S.paper;
    if (!p) { A.go('exam'); return; }
    var strict = A.store.settings().examMode === 'strict';
    $('paperTitle').textContent = p.title;
    $('paperSub').textContent = (strict ? '考试模式 ' + examLimitMinutes() + ' 分钟 · ' : '') +
      (p.hasAudio ? '含听力 · ' : (p.audioMissing ? '听力题无音频 · ' : '')) + (p.questions.length) + ' 题';
    updateTimerLabel();
    renderAudio();
    renderPartNav();
    renderQuestion();
  };

  function renderAudio() {
    var bar = $('audioBar');
    bar.innerHTML = '';
    var p = S.paper;
    if (!p || !p.hasAudio || !p.audio) return;
    var strict = A.store.settings().examMode === 'strict';
    var wrap = el('div', 'audio-bar');
    wrap.innerHTML =
      '<div class="ab-top">' +
      '<button class="ab-play" id="abPlay">&#9654;</button>' +
      '<div class="ab-times"><span id="abCur">00:00</span> / <span id="abDur">00:00</span></div>' +
      (strict ? '' : '<input class="ab-seek" id="abSeek" type="range" min="0" max="100" value="0">') +
      (strict ? '' : '<button class="ab-rate" id="abRate">1.0x</button>') +
      '</div>' +
      (strict ? '<div class="ab-lock">考试模式：听力按顺序连续播放，不能暂停、拖动进度或调倍速</div>' : '') +
      '<audio id="abAudio" preload="metadata" src="' + esc(p.audio) + '"></audio>';
    bar.appendChild(wrap);

    var au = $('abAudio');
    var seek = $('abSeek');
    var rates = [0.75, 1, 1.25, 1.5];
    var ri = 1;
    var lockPos = 0;
    var seekingBack = false;

    $('abPlay').onclick = function () {
      if (!au.paused) {
        if (!strict) au.pause();
        return;
      }
      au.play();
    };
    au.onplay = function () { $('abPlay').innerHTML = '&#10074;&#10074;'; };
    au.onpause = function () {
      if (strict && !S.submitted && !au.ended) { au.play(); return; }
      $('abPlay').innerHTML = '&#9654;';
    };
    au.onended = function () { A.toast('听力播放结束'); };
    au.onloadedmetadata = function () {
      $('abDur').textContent = A.fmtTime(au.duration || 0);
    };
    au.ontimeupdate = function () {
      if (!seekingBack) lockPos = au.currentTime;
      $('abCur').textContent = A.fmtTime(au.currentTime);
      if (seek && au.duration) seek.value = (au.currentTime / au.duration * 100) | 0;
      if (S.loop && au.currentTime >= S.loop.end) {
        au.currentTime = S.loop.start;
      }
    };
    au.onseeking = function () {
      if (!strict || S.submitted) return;
      if (Math.abs(au.currentTime - lockPos) > 0.5) {
        seekingBack = true;
        au.currentTime = lockPos;
        setTimeout(function () { seekingBack = false; }, 300);
      }
    };
    au.onratechange = function () {
      if (strict && au.playbackRate !== 1) au.playbackRate = 1;
    };
    au.onerror = function () { A.toast('音频文件缺失：' + p.audio); };
    if (seek) {
      seek.oninput = function () {
        if (au.duration) au.currentTime = seek.value / 100 * au.duration;
      };
    }
    if ($('abRate')) {
      $('abRate').onclick = function () {
        ri = (ri + 1) % rates.length;
        au.playbackRate = rates[ri];
        this.textContent = rates[ri].toFixed(2).replace(/0$/, '') + 'x';
      };
    }
  }

  function sectionsOf(p) {
    var out = [
      { key: 'listening', name: '听力理解', qs: [] },
      { key: 'cloze', name: '选词填空', qs: [] },
      { key: 'matching', name: '长篇匹配', qs: [] },
      { key: 'reading', name: '仔细阅读', qs: [] }
    ];
    p.questions.forEach(function (q) {
      if (q.part === 'listening') out[0].qs.push(q);
      else if (q.kind === 'cloze') out[1].qs.push(q);
      else if (q.kind === 'matching') out[2].qs.push(q);
      else out[3].qs.push(q);
    });
    return out.filter(function (s) { return s.qs.length; });
  }

  function renderPartNav() {
    var nav = $('partNav');
    nav.innerHTML = '';
    var p = S.paper;
    if (!p) return;
    var secs = sectionsOf(p);
    var curQ = p.questions[S.cur];
    secs.forEach(function (s) {
      var b = el('button', 'pn-btn', s.name + ' ' + s.qs.length);
      var inThis = s.qs.indexOf(curQ) >= 0;
      if (inThis) b.classList.add('on');
      b.onclick = function () {
        S.cur = p.questions.indexOf(s.qs[0]);
        renderPartNav(); renderQuestion();
      };
      nav.appendChild(b);
    });
  }

  function renderQuestion() {
    var p = S.paper;
    var wrap = $('qWrap');
    wrap.innerHTML = '';
    if (!p) return;
    var q = p.questions[S.cur];
    if (!q) return;
    var card = el('div', 'q-card');
    var kindName = KIND_NAME[q.kind] || '';
    var head = '第 ' + q.no + ' 题' + (kindName ? ' · ' + kindName : '') + (q.part === 'listening' ? ' · 听力' : '');
    var html = '<div class="q-no">' + head + '</div>';

    if (q.groupNote) html += '<div class="q-note">' + esc(q.groupNote) + '</div>';

    // 阅读原文
    if (q.passage && p.passages && p.passages[q.passage] && p.passages[q.passage].kind === 'passage') {
      html += '<div class="q-passage">' + esc(p.passages[q.passage].text) + '</div>';
    }
    // 匹配段落
    if (q.kind === 'matching' && p.passages && p.passages.matching) {
      var paras = p.passages.matching.paragraphs || {};
      var ph = '<div class="q-passage">';
      Object.keys(paras).forEach(function (k) {
        ph += '<b>' + k + '</b> ' + esc(paras[k]) + '<br><br>';
      });
      ph += '</div>';
      html += ph;
    }
    // 选词填空原文 + 词库
    if (q.kind === 'cloze' && p.passages && p.passages.cloze) {
      var cz = p.passages.cloze;
      html += '<div class="q-passage">' + esc(cz.text).replace(/\n/g, '<br>') + '</div>';
      var bank = cz.wordBank || {};
      var used = {};
      p.questions.forEach(function (qq) {
        if (qq.kind === 'cloze' && S.answers[qq.no]) used[S.answers[qq.no]] = 1;
      });
      html += '<div class="bank">';
      Object.keys(bank).sort().forEach(function (k) {
        var cls = 'bank-item' + (used[k] ? ' used' : '');
        html += '<span class="' + cls + '">' + k + '. ' + esc(bank[k]) + '</span>';
      });
      html += '</div>';
    }

    var stemText = String(q.stem || '').trim();
    if (stemText && stemText !== String(q.no)) {
      html += '<div class="q-stem">' + esc(stemText) + '</div>';
    }

    // 听力：原文 / 本段重播 / 循环本段（考试模式下不提供，避免“作弊式”回看）
    if (q.part === 'listening' && p.audioMissing && A.store.settings().examMode !== 'strict') {
      html += '<div class="q-note">本套听力暂无音频，可展开听力原文与中文对照</div>';
    }
    if (q.part === 'listening' && q.script && A.store.settings().examMode !== 'strict') {
      html += '<div class="q-tools">' +
        '<button class="mini" id="btnScript">听力原文</button>' +
        (q.audioStart != null ? '<button class="mini" id="btnSeg">本段重播</button>' +
          '<button class="mini" id="btnLoop">循环本段</button>' : '') +
        (q.audioStart != null && p.hasAudio ? '<button class="mini" id="btnDict">听写本段</button>' : '') +
        '</div>' +
        '<div class="q-script" id="qScript" hidden>' +
        esc(q.script).replace(/\n/g, '<br>') +
        (q.scriptCn ? '<div class="sc-cn">' + esc(q.scriptCn).replace(/\n/g, '<br>') + '</div>' : '') +
        '</div>';
    }

    // 选项
    var opts = q.options || {};
    var letters = Object.keys(opts).sort();
    var answerLetters;
    if (q.kind === 'cloze' && p.passages && p.passages.cloze) {
      answerLetters = Object.keys(p.passages.cloze.wordBank || {}).sort();
    } else if (q.kind === 'matching') {
      answerLetters = (p.passages.matching.letters || []).slice();
    } else {
      answerLetters = letters;
    }
    var picked = S.answers[q.no];
    html += '<div id="optBox">';
    answerLetters.forEach(function (L) {
      var text = opts[L] || (q.kind === 'cloze' ? (p.passages.cloze.wordBank || {})[L] : '');
      var cls = 'opt' + (picked === L ? ' sel' : '');
      html += '<div class="' + cls + '" data-k="' + L + '"><span class="key">' + L + '</span>' +
        '<span class="opt-t">' + esc(text || '段落 ' + L) + '</span></div>';
    });
    html += '</div>';

    card.innerHTML = html;
    wrap.appendChild(card);
    bindTapWords(card);

    var box = $('optBox');
    if (box) {
      box.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('.opt') : null;
        if (!t) return;
        var k = t.getAttribute('data-k');
        S.answers[q.no] = k;
        A.vibrate(8);
        var all = box.querySelectorAll('.opt');
        for (var i = 0; i < all.length; i++) all[i].classList.toggle('sel', all[i].getAttribute('data-k') === k);
        saveDraft();
      });
    }

    $('btnPrev').disabled = S.cur <= 0;
    $('btnNext').disabled = S.cur >= p.questions.length - 1;
    $('btnPrev').onclick = function () { if (S.cur > 0) { S.cur--; renderPartNav(); renderQuestion(); } };
    $('btnNext').onclick = function () { if (S.cur < p.questions.length - 1) { S.cur++; renderPartNav(); renderQuestion(); } };
    $('btnSubmit').onclick = function () { submit(false); };
    $('btnSheet').onclick = openSheet;

    if (q.part === 'listening' && q.script && $('btnScript')) bindListeningTools(q);
  }

  /* 该段音频的起止（秒），用于“本段重播/循环” */
  function segmentOf(q) {
    var p = S.paper;
    var starts = [];
    (p.questions || []).forEach(function (x) {
      if (x.part === 'listening' && x.audioStart != null) starts.push(x.audioStart);
    });
    starts = starts.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var start = q.audioStart || 0;
    var idx = starts.indexOf(start);
    var end = (idx >= 0 && idx + 1 < starts.length) ? starts[idx + 1] : (p.audioDuration || start + 180);
    return { start: start, end: end };
  }

  function bindListeningTools(q) {
    var au = $('abAudio');
    var btnScript = $('btnScript'), btnSeg = $('btnSeg'), btnLoop = $('btnLoop'), btnDict = $('btnDict');
    var seg = segmentOf(q);

    if (btnDict) btnDict.onclick = function () {
      if (A.openDictation) A.openDictation({ start: seg.start, end: seg.end, text: q.script, textCn: q.scriptCn || '', audio: S.paper.audio });
      else A.toast('听写模块未载入');
    };
    if (btnScript) btnScript.onclick = function () {
      var s = $('qScript');
      s.hidden = !s.hidden;
      btnScript.classList.toggle('on', !s.hidden);
    };
    if (btnSeg) btnSeg.onclick = function () {
      if (!au) return A.toast('本套暂无内置音频');
      au.currentTime = seg.start;
      var ok = au.play();
      if (ok && ok.catch) ok.catch(function () { A.toast('点击播放按钮开始'); });
    };
    if (btnLoop) btnLoop.onclick = function () {
      if (!au) return A.toast('本套暂无内置音频');
      if (S.loop) { S.loop = null; btnLoop.classList.remove('on'); A.toast('已关闭循环'); return; }
      S.loop = seg;
      btnLoop.classList.add('on');
      au.currentTime = seg.start;
      au.play();
      A.toast('循环 ' + A.fmtTime(seg.start) + '–' + A.fmtTime(seg.end));
    };
  }

  function saveDraft() {
    var p = S.paper;
    if (!p) return;
    A.store.setPaperState(p.id, {
      draft: S.answers, elapsed: S.elapsed, submitted: false, at: Date.now()
    });
  }

  function openSheet() {
    var p = S.paper;
    var grid = $('sheetGrid');
    grid.innerHTML = '';
    p.questions.forEach(function (q, i) {
      var g = el('div', 'sg', q.no);
      if (S.answers[q.no]) g.classList.add('done');
      if (i === S.cur) g.classList.add('cur');
      g.onclick = function () {
        S.cur = i; $('sheet').hidden = true;
        renderPartNav(); renderQuestion();
      };
      grid.appendChild(g);
    });
    $('sheet').hidden = false;
  }

  /* =============== 阅读划词查义 =============== */
  var WIDX = null;

  function buildWidx() {
    if (WIDX || !S.vocab) return;
    WIDX = {};
    S.vocab.forEach(function (v) {
      var k = String(v[0]).toLowerCase();
      if (!WIDX[k]) WIDX[k] = v;
    });
  }

  function bindTapWords(scope) {
    var nodes = scope.querySelectorAll('.q-passage');
    for (var i = 0; i < nodes.length; i++) nodes[i].addEventListener('click', onTapWord);
  }

  function onTapWord(e) {
    var x = e.clientX, y = e.clientY;
    if (x == null && e.changedTouches) { x = e.changedTouches[0].clientX; y = e.changedTouches[0].clientY; }
    if (x == null) return;
    var range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
    else if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y);
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
    }
    if (!range || !range.startContainer || range.startContainer.nodeType !== 3) return;
    if (!range.startContainer.parentNode.closest('.q-passage')) return;
    var node = range.startContainer, off = range.startOffset;
    var t = node.textContent, s = off, en = off;
    while (s > 0 && /[A-Za-z'-]/.test(t.charAt(s - 1))) s--;
    while (en < t.length && /[A-Za-z'-]/.test(t.charAt(en))) en++;
    var word = t.slice(s, en).replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
    if (!word || word.length < 2) return;
    e.stopPropagation();
    openWord(word);
  }

  function candidates(w) {
    var low = w.toLowerCase();
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

  function findWord(w) {
    var list = candidates(w);
    for (var i = 0; i < list.length; i++) {
      var k = list[i];
      if (WIDX[k]) return WIDX[k];
      if (k.length > 3 && k.charAt(k.length - 1) === k.charAt(k.length - 2)) {
        var kk = k.slice(0, -1);
        if (WIDX[kk]) return WIDX[kk];
      }
    }
    return null;
  }

  function openWord(word) {
    ensureVocabThen(function () {
      var d = findWord(word);
      $('wsWord').textContent = (d ? d[0] : word) + (d ? '' : '（未收录）');
      $('wsPh').textContent = d && d[1] ? d[1] : '点词查义：词库 7508 词，变形词自动还原';
      $('wsTrans').textContent = d ? d[3] : '词库里没有这个词，可能是人名或专有名词';
      $('wsEx').innerHTML = d && d[4] ? esc(d[4]) + '<br><i>' + esc(d[5] || '') + '</i>' : '';
      var key = d ? d[0] : word;
      if (A.wordIdxLine) A.wordIdxLine(key);
      else { var wi = $('wsIdx'); if (wi) wi.innerHTML = ''; }
      var starBtn = $('wsStar');
      var starred = A.store.star().indexOf(key) >= 0;
      starBtn.textContent = starred ? '★ 已在生词本' : '☆ 加入生词本';
      starBtn.onclick = function () {
        var s2 = A.store.star();
        var i2 = s2.indexOf(key);
        if (i2 >= 0) { s2.splice(i2, 1); A.toast('已移出生词本'); }
        else { s2.push(key); A.toast('已加入生词本'); }
        A.store.setStar(s2);
        openWord(word);
      };
      $('wsGoVocab').onclick = function () { $('wordSheet').hidden = true; A.go('vocab'); };
      $('wordSheet').hidden = false;
    });
  }

  function ensureVocabThen(cb) {
    if (S.vocab) { buildWidx(); cb(); return; }
    A.loadScript('data/vocab.js', function () {
      S.vocab = window.__DATA['vocab'];
      buildWidx();
      if (!S.vocab) { A.toast('词库载入失败'); return; }
      cb();
    }, function () { A.toast('词库载入失败'); });
  }

  /* =============== 判分 =============== */
  function submit(silent) {
    var p = S.paper;
    var unanswered = p.questions.filter(function (q) { return !S.answers[q.no]; }).length;
    if (unanswered && !silent && !confirm('还有 ' + unanswered + ' 题未作答，确定交卷？')) return;

    stopTimer();
    var right = 0, total = p.questions.length;
    var secStat = {};
    var wrongAdd = [];
    p.questions.forEach(function (q) {
      var sec = q.part === 'listening' ? 'listening'
        : (q.kind === 'cloze' ? 'cloze' : (q.kind === 'matching' ? 'matching' : 'read'));
      secStat[sec] = secStat[sec] || { right: 0, total: 0 };
      secStat[sec].total++;
      if (S.answers[q.no] === q.answer) {
        right++;
        secStat[sec].right++;
      } else {
        wrongAdd.push({
          paper: p.id, paperTitle: p.title, no: q.no,
          part: q.part, kind: q.kind, stem: q.stem,
          answer: q.answer, answerText: q.answerText || '',
          mine: S.answers[q.no] || '未答',
          options: q.options || {},
          expl: q.expl || '', script: q.script || '',
          lv: 0, due: Date.now() + 86400000
        });
      }
    });
    var rate = Math.round(right / total * 100);
    S.submitted = true;
    S.result = { right: right, total: total, rate: rate, secStat: secStat, wrong: wrongAdd };

    A.store.setPaperState(p.id, {
      draft: S.answers, elapsed: S.elapsed, submitted: true,
      right: right, total: total, rate: rate, at: Date.now()
    });

    // 错题本
    var wrong = A.store.wrong();
    wrongAdd.forEach(function (w) {
      var dup = wrong.some(function (x) { return x.paper === w.paper && x.no === w.no; });
      if (!dup) wrong.push(w);
    });
    A.store.setWrong(wrong.slice(-500));

    var stats = A.store.stats();
    stats.exams = (stats.exams || 0) + 1;
    stats.todayExams = (stats.todayExams || 0) + 1;
    A.store.setStats(stats);
    A.store.bumpDay();

    if (A.recordScore) A.recordScore(p, S.result);

    A.go('result', { title: '成绩分析' });
  }

  window.App.openPaper = openPaper;
  window.App.openPaperAt = function (id, no) { openPaper(id, no); };
  window.App.openWord = openWord;
  window.App.submitPaper = submit;
  A.RENDER.result = function () {
    var r = S.result;
    if (!r) {
      var saved = S.paper ? A.store.paperState(S.paper.id) : null;
      if (saved && saved.submitted) {
        r = { right: saved.right, total: saved.total, rate: saved.rate, secStat: {}, wrong: [] };
      } else { A.go('exam'); return; }
    }
    $('rcScore').textContent = r.rate + '%';
    var parts = [];
    if (r.secStat && r.secStat.listening) parts.push('听力 ' + r.secStat.listening.right + '/' + r.secStat.listening.total);
    ['cloze', 'matching', 'read'].forEach(function (k) {
      if (r.secStat && r.secStat[k]) {
        var nm = k === 'cloze' ? '选词' : (k === 'matching' ? '匹配' : '阅读');
        parts.push(nm + ' ' + r.secStat[k].right + '/' + r.secStat[k].total);
      }
    });
    $('rcDetail').innerHTML = '答对 ' + r.right + ' / ' + r.total + ' 题 · 用时 ' + A.fmtTime(S.elapsed) +
      '<br>' + parts.join(' · ');

    if (A.renderResultExtra) A.renderResultExtra(r);
    else {
      $('rcScoreCard').innerHTML = '';
      $('rcTopWords').innerHTML = '';
    }

    var list = $('rcList');
    list.innerHTML = '';
    var onlyWrong = $('btnReviewWrong');
    var showAll = !onlyWrong.__on;

    if (!S.paper) { list.innerHTML = '<div class="empty">题目未载入，无法查看解析</div>'; return; }
    var qs = S.paper.questions;
    qs.forEach(function (q) {
      var ok = S.answers[q.no] === q.answer;
      if (onlyWrong.__on && ok) return;
      var it = el('div', 'rc-item');
      var badge = ok ? '<span class="rc-badge ok">对</span>' : '<span class="rc-badge no">错</span>';
      var mine = S.answers[q.no] || '未答';
      var ansTxt = q.answer + (q.answerText ? ' (' + q.answerText + ')' : '');
      var optTxt = '';
      if (q.options && q.options[q.answer]) optTxt = q.options[q.answer];
      it.innerHTML = '<div class="rc-top">' + badge + '<b>第 ' + q.no + ' 题</b>' +
        '<span class="wl" style="color:#8b97a1;font-size:11.5px">你选 ' + esc(mine) + '</span></div>' +
        '<div class="rc-line">' + (String(q.stem || '').trim() === String(q.no) ? '' : esc(q.stem).slice(0, 120)) + '</div>' +
        '<div class="rc-exp">正确答案：' + esc(ansTxt) + (optTxt ? ' — ' + esc(optTxt) : '') + '</div>' +
        (q.expl ? '<div class="rc-expl">' + esc(q.expl) + '</div>' : '') +
        (q.script ? '<details class="rc-script"><summary>听力原文</summary>' +
          esc(q.script).replace(/\n/g, '<br>') +
          (q.scriptCn ? '<div class="sc-cn">' + esc(q.scriptCn).replace(/\n/g, '<br>') + '</div>' : '') +
          '</details>' : '');
      list.appendChild(it);
    });

    if (!onlyWrong.__bound) {
      onlyWrong.__bound = true;
      onlyWrong.onclick = function () {
        this.__on = !this.__on;
        this.textContent = this.__on ? '显示全部' : '只看错题';
        A.RENDER.result();
      };
    }
  };

  /* =============== 资料库 =============== */
  A.RENDER.library = function () {
    var box = $('libList');
    var lib = S.library;
    box.innerHTML = '';
    $('libNotice').innerHTML = '共收录 <b>' + (lib && lib.years ? lib.years.length : 0) +
      '</b> 个考次的全量资料（2014.06–2026.06）。点击可在线预览/下载原始文件；若要离线使用，在电脑上运行 <b>tools/fetch_library.py</b> 即可全部下载到 library 目录。';

    if (!lib || !lib.years || !lib.years.length) {
      box.appendChild(el('div', 'empty', '资料索引尚未生成，请先运行 tools/fetch_library.py 与 tools/build_data.py'));
      return;
    }
    lib.years.forEach(function (y) {
      var card = el('div', 'lib-year');
      var head = el('div', 'lib-head');
      head.innerHTML = '<span>' + esc(y.year) + '</span><small>' + y.total + ' 个文件</small>';
      var body = el('div', 'lib-body');
      body.hidden = true;
      Object.keys(y.dirs).forEach(function (sub) {
        var d = y.dirs[sub];
        var row = el('div', 'lib-row');
        row.innerHTML = '<a href="' + onlineUrl(y, sub) + '">' + esc(d.label) + '（' + d.count + '）</a>';
        body.appendChild(row);
      });
      head.onclick = function () {
        body.hidden = !body.hidden;
      };
      card.appendChild(head);
      card.appendChild(body);
      box.appendChild(card);
    });
  };

  function onlineUrl(y, sub) {
    var base = 'https://github.com/0609x/CET46-Resources/tree/main/' +
      encodeURIComponent('四级真题') + '/' + encodeURIComponent(y.year) + '/' + encodeURIComponent(sub);
    return base;
  }

  /* =============== 启动 =============== */
})();
