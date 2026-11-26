/* write.js —— 写作与翻译训练 */
(function () {
  'use strict';
  var A = window.App, S = A.S, el = A.el, esc = A.esc;
  function $(id) { return document.getElementById(id); }

  var DATA = {
    writing: [
      {
        t: '观点论证：大学生该不该做兼职',
        prompt: 'Some people believe that college students should take part-time jobs, while others think study should come first. What is your opinion? Write at least 120 words but no more than 180 words.',
        cn: '有人觉得大学生应该做兼职，也有人认为学习才是第一位的。你的看法是什么？',
        outline: [
          '第一段：点明争议 + 亮明观点（有条件地支持）',
          '第二段：两条理由（减轻经济压力 / 提前接触社会），各配一句例证',
          '第三段：让步 + 结论（前提是不影响学业，每周不超过 10 小时）'
        ],
        sample:
          'When it comes to whether college students should take part-time jobs, opinions vary. Personally, I am in favor of working part-time, provided that study remains the top priority.\n' +
          'To begin with, a part-time job relieves financial pressure. Many students have to support themselves, and a small income covers books, meals and even part of the tuition. More importantly, working outside the campus bridges the gap between textbooks and the real world. Dealing with customers and deadlines teaches communication and time management, which no lecture can offer.\n' +
          'Admittedly, overworking may distract students from their studies. Therefore, the key lies in balance: no more than ten hours a week, and never during the examination period. In short, a well-managed part-time job is a valuable lesson rather than a burden.',
        phrases: [
          'When it comes to … , opinions vary.（引出争议）',
          'provided that … / on condition that …（设条件）',
          'bridges the gap between A and B（弥合差距）',
          'Admittedly, … Therefore, the key lies in …（让步+落脚）'
        ]
      },
      {
        t: '现象分析：在线学习为什么流行',
        prompt: 'Nowadays more and more students choose to learn online. Analyze the reasons behind this trend and give your comments. Write at least 120 words but no more than 180 words.',
        cn: '如今越来越多学生选择在线学习。分析这一趋势的原因并给出你的评价。',
        outline: [
          '第一段：描述现象（一句话数据或场景）',
          '第二段：三个原因（时间灵活 / 资源便宜 / 回放可复习）',
          '第三段：评价（利大于弊，但需要自律）'
        ],
        sample:
          'Over the past few years, online learning has moved from an emergency solution to a daily habit for millions of students. In my dormitory, almost everyone watches at least one recorded lecture a week.\n' +
          'Three factors account for this trend. First, it is flexible: learners can study at midnight or on a bus, as long as a phone is at hand. Second, it is affordable. A single course often costs less than a printed textbook, and some platforms are entirely free. Third, recorded lessons can be replayed, which is a blessing for slow learners and for reviewing before exams.\n' +
          'On the whole, I regard online learning as a positive change. Yet it places a heavy demand on self-discipline, because no teacher is standing behind you. Those who can manage their time will benefit most.',
        phrases: [
          'has moved from … to …（描述演变）',
          'Three factors account for this trend.（列举原因）',
          'as long as …（只要）',
          'places a heavy demand on …（对…提出高要求）'
        ]
      },
      {
        t: '建议信：延长图书馆开放时间',
        prompt: 'Write a letter to the library of your university, suggesting that the opening hours be extended during the examination period. Do not sign your own name; use "Li Ming" instead.',
        cn: '给学校图书馆写一封信，建议考试周延长开放时间。署名用 Li Ming。',
        outline: [
          '称呼 + 写信目的（说明身份与来意）',
          '理由：座位紧张、晚间效率高、考试周需求集中',
          '具体建议：延到 23:00、增设自习区、线上预约',
          '礼貌收尾 + 署名'
        ],
        sample:
          'Dear Sir or Madam,\n' +
          'I am Li Ming, a junior from the School of Computer Science. I am writing to suggest that the library extend its opening hours during the examination period.\n' +
          'At present the library closes at 21:30, yet seats are already full by seven in the evening. Many students, myself included, concentrate better at night and have nowhere to go after the reading rooms are shut. During the two weeks before examinations, the demand for quiet study space doubles.\n' +
          'Therefore, I would like to propose that the library stay open until 23:00 in the examination period, that two additional reading rooms be opened on the third floor, and that seat reservation be available online so that students need not queue.\n' +
          'Thank you for your time and for considering my suggestion.\n' +
          'Yours sincerely,\nLi Ming',
        phrases: [
          'I am writing to suggest that …（写信目的）',
          'At present … yet …（现状对比）',
          'I would like to propose that + 主语 + (should) do（虚拟语气建议）',
          'Thank you for your time and for considering …（礼貌收尾）'
        ]
      },
      {
        t: '申请信：校园开放日志愿者',
        prompt: 'Your university is recruiting volunteers for the campus open day. Write an application letter to the student union, stating your qualifications and what you can do.',
        cn: '学校开放日招募志愿者。给学生会写一封申请信，说明你的优势与能承担的工作。',
        outline: [
          '开门见山：申请哪个岗位',
          '两个优势：英语口语好 / 有接待经验',
          '能做什么：引导家长、讲解实验室、维持秩序',
          '表达期待 + 署名'
        ],
        sample:
          'Dear Student Union,\n' +
          'I am writing to apply for the position of campus guide at the open day to be held on 18 May.\n' +
          'Two qualifications make me a suitable candidate. First, I have a good command of spoken English, since I have been preparing for the CET-4 and practise with foreign teachers every week. Second, I served as a receptionist at the freshmen registration last September, so I know how to answer questions patiently and calmly.\n' +
          'If accepted, I would guide visiting parents along the main route, explain our laboratories and library facilities, and help keep order at the crowded entrances.\n' +
          'I would appreciate the chance to contribute to this event and look forward to your reply.\n' +
          'Yours sincerely,\nLi Ming',
        phrases: [
          'I am writing to apply for …（申请句式）',
          'Two qualifications make me a suitable candidate.（引出优势）',
          'have a good command of …（掌握…）',
          'I would appreciate the chance to …（委婉请求）'
        ]
      },
      {
        t: '通知/广告：校园二手书市',
        prompt: 'The student union will hold a second-hand book market next Friday. Write a notice to inform students of the time, place and rules.',
        cn: '学生会下周五举办二手书市，写一则通知说明时间、地点和规则。',
        outline: [
          '标题（Notice）',
          '做什么：时间、地点、面向对象',
          '怎么参与：带书登记、按书价 3–5 折、以书换书',
          '注意事项：不得售卖盗版、结束后清理摊位'
        ],
        sample:
          'Notice\n' +
          'A second-hand book market will be held by the Student Union from 14:00 to 17:00 next Friday, 22 May, on the square in front of the main library.\n' +
          'All students are welcome to join. If you want to sell, please register your books at the union office before Wednesday and price them at 30% to 50% of the original. If you prefer to exchange, bring an old book and take another of similar value. Reference books for the CET-4 and CET-6 are especially sought after.\n' +
          'Please note that pirated copies are not allowed, and every seller should clear the booth before 17:30. For further information, contact Li Ming at 138-0000-0000.\n' +
          'Student Union',
        phrases: [
          'A … will be held from … to … on …（通知时间地点）',
          'All students are welcome to join.（欢迎参与）',
          'are especially sought after（尤其抢手）',
          'Please note that …（注意事项）'
        ]
      },
      {
        t: '图表描述：大学生每日屏幕时间',
        prompt: 'The chart shows the average daily screen time of college students in 2018 and 2023 (3.5 hours vs 5.2 hours). Describe the change and give possible reasons.',
        cn: '图表显示 2018 与 2023 年大学生日均屏幕时间（3.5 小时 → 5.2 小时）。描述变化并分析原因。',
        outline: [
          '第一段：总体趋势（上升约 1.7 小时）',
          '第二段：两条原因（短视频/网课、社交软件）',
          '第三段：影响与建议（护眼、设定使用上限）'
        ],
        sample:
          'The chart compares the average daily screen time of college students in 2018 and 2023. Clearly, the figure rose from 3.5 hours to 5.2 hours, an increase of nearly 50 percent.\n' +
          'Two reasons may explain the change. For one thing, short videos and online courses have made the phone a study tool as well as an entertainment centre; a single lecture or a few clips can easily take an hour. For another, social apps keep students online, because messages arrive at any moment and unanswered chats cause anxiety.\n' +
          'This trend is double-edged. Convenience comes at the cost of sleep and eyesight. Therefore, I suggest setting a daily limit in the phone settings and leaving the device outside the desk while reviewing. Screen time should serve us, not govern us.',
        phrases: [
          'The chart compares … Clearly, the figure rose from … to …（图表开头）',
          'For one thing … For another …（两条原因）',
          'double-edged（双刃剑）',
          'come at the cost of …（以…为代价）'
        ]
      }
    ],
    translation: [
      {
        t: '中国文化：茶',
        cn: '茶是中国人日常生活中最常见的饮品之一。中国是茶的故乡，种茶、制茶已有两千多年历史。唐代以后，饮茶之风逐渐传到日本、韩国以及欧洲各国。如今，茶馆不仅是喝茶的地方，也是朋友聚会、谈生意的重要场所。中国人常说，一杯好茶能让人静下心来。',
        ref:
          'Tea is one of the most common drinks in the daily life of Chinese people. China is the hometown of tea, and has a history of more than two thousand years of planting and processing tea. After the Tang Dynasty, the habit of drinking tea gradually spread to Japan, Korea and European countries. Nowadays, tea houses are not only places for drinking tea, but also important places where friends gather and business is discussed. Chinese people often say that a cup of good tea can calm a person down.',
        tips: [
          '「故乡」用 the hometown of，不用 hometown of China’s',
          '「种茶、制茶」并列动名词：planting and processing tea',
          '「不仅是…也是…」用 not only … but also …，注意后句不倒装',
          '「静下心来」calm down / settle one’s mind'
        ]
      },
      {
        t: '中国交通：高铁',
        cn: '高铁已经成为中国人出行的重要方式。截至目前，中国高铁运营里程超过四万公里，居世界第一。从北京到上海，乘坐高铁只需要四个多小时，比普通火车快了一倍多。高铁不仅缩短了城市之间的距离，也带动了沿线地区的经济发展。',
        ref:
          'High-speed trains have become an important way for Chinese people to travel. Up to now, the operating mileage of China’s high-speed railways has exceeded 40,000 kilometres, ranking first in the world. It takes only a little more than four hours to travel from Beijing to Shanghai by high-speed train, more than twice as fast as an ordinary train. High-speed railways have not only shortened the distance between cities, but also boosted the economic development of the areas along the lines.',
        tips: [
          '「截至目前」Up to now + 现在完成时',
          '「居世界第一」ranking first in the world 作伴随状语',
          '「快了不止一倍」more than twice as fast as',
          '「带动」boost / drive'
        ]
      },
      {
        t: '社会生活：移动支付',
        cn: '在中国，移动支付已经覆盖生活的方方面面。无论是买菜、乘公交，还是缴纳水电费，人们只需用手机扫一扫即可完成。移动支付不仅方便快捷，还减少了现金的使用，提高了交易的安全性。许多外国游客对此感到惊讶，认为这是中国发展速度的一个缩影。',
        ref:
          'In China, mobile payment has covered every aspect of life. Whether people are buying vegetables, taking a bus or paying water and electricity bills, they can finish the task simply by scanning a code with their phones. Mobile payment is not only convenient and fast, but also reduces the use of cash and improves the safety of transactions. Many foreign tourists are surprised at this and regard it as a miniature of China’s development speed.',
        tips: [
          '「无论是…还是…」whether … or …',
          '「扫一扫」scan a code',
          '「减少现金使用」reduce the use of cash',
          '「缩影」a miniature / an epitome'
        ]
      },
      {
        t: '传统节日：春节',
        cn: '春节是中国最重要的传统节日，通常在农历一月一日。节前，人们会打扫房屋、贴春联、准备年货。除夕夜，一家人围坐在一起吃年夜饭，看春节联欢晚会。孩子们最期待的是收红包。春节期间，各地还会举办舞龙、舞狮等庆祝活动。',
        ref:
          'The Spring Festival is the most important traditional festival in China, usually falling on the first day of the first lunar month. Before the festival, people clean their houses, put up couplets and prepare festival goods. On New Year’s Eve, the whole family sits around to enjoy a reunion dinner and watch the Spring Festival Gala. What children look forward to most is receiving red envelopes. During the festival, celebrations such as dragon dances and lion dances are also held across the country.',
        tips: [
          '「农历一月一日」the first day of the first lunar month',
          '「贴春联」put up couplets',
          '「年夜饭」reunion dinner',
          '「舞龙舞狮」dragon dances and lion dances'
        ]
      },
      {
        t: '生态环境：垃圾分类',
        cn: '近年来，中国许多城市开始推行垃圾分类。居民需要把垃圾分为可回收物、有害垃圾、厨余垃圾和其他垃圾四类。虽然一开始不少人觉得麻烦，但随着宣传和设施的完善，越来越多的人养成了分类的习惯。垃圾分类不仅减少了污染，也有利于资源的再利用。',
        ref:
          'In recent years, many cities in China have begun to promote garbage classification. Residents are required to sort waste into four categories: recyclables, hazardous waste, kitchen waste and other waste. Although quite a few people found it troublesome at first, more and more of them have formed the habit as publicity has spread and facilities have improved. Garbage classification not only reduces pollution but also contributes to the recycling of resources.',
        tips: [
          '「推行」promote / carry out',
          '四类垃圾的固定译法（recyclables / hazardous waste / kitchen waste / other waste）',
          '「养成习惯」form the habit',
          '「有利于」contribute to / be beneficial to'
        ]
      },
      {
        t: '教育科技：在线课堂',
        cn: '在线课堂让偏远地区的学生也能听到城市名师的讲课。一根网线、一块屏幕，就把优质教育资源送到了乡村学校。不过，在线课堂也面临网络不稳定、学生注意力难以集中等问题。专家认为，线上与线下相结合，才是未来教育的发展方向。',
        ref:
          'Online classes enable students in remote areas to attend lectures given by outstanding teachers from cities. A single cable and a single screen bring quality educational resources to rural schools. However, online classes also face problems such as unstable networks and students’ difficulty in concentrating. Experts believe that the combination of online and offline teaching is the direction of future education.',
        tips: [
          '「偏远地区」remote areas',
          '「名师」outstanding / experienced teachers',
          '「面临…问题」face problems such as …',
          '「线上与线下相结合」the combination of online and offline teaching'
        ]
      }
    ]
  };

  var kind = 'writing';
  var DRAFT_KEY = 'c4.writeDraft';

  function readDrafts() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function saveDraft(i, text) {
    try {
      var d = readDrafts();
      d['w' + i] = text;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (e) { }
  }

  A.RENDER.write = function () {
    var seg = $('writeSeg');
    if (!seg.__bound) {
      seg.__bound = true;
      seg.addEventListener('click', function (e) {
        if (!e.target.classList.contains('seg-btn')) return;
        kind = e.target.getAttribute('data-kind');
        var b = seg.querySelectorAll('.seg-btn');
        for (var i = 0; i < b.length; i++) b[i].classList.toggle('on', b[i] === e.target);
        renderList();
      });
    }
    renderList();
  };

  function renderList() {
    var box = $('writeList');
    box.innerHTML = '';
    var arr = DATA[kind] || [];
    arr.forEach(function (w, i) {
      box.appendChild(card(w, i));
    });
    renderAiLoop();
  }

  function renderAiLoop() {
    var box = $('aiLoopBox');
    if (!box) return;
    var ai = window.AI;
    if (!ai || !ai.history) { box.innerHTML = ''; return; }
    var hist = ai.history();
    if (!hist.length) { box.innerHTML = ''; return; }
    var stats = ai.errorStats();
    var top = stats.slice(0, 3).map(function (x) {
      return esc(x.type) + ' <em>×' + x.n + '</em>';
    }).join(' · ');
    var last = hist[hist.length - 1];
    box.innerHTML = '<div class="ai-loop"><div class="ai-loop-top"><b>AI 批改累计 ' + hist.length + ' 篇</b>' +
      '<span>最近 ' + (last.grade ? last.grade.total : '--') + '/15</span></div>' +
      '<div class="ai-loop-line">最常见错误：' + (top || '还没有可归类的错误') + '</div></div>';
  }

  function card(w, i) {
    var d = el('div', 'wr-card');
    var body = '';
    if (kind === 'writing') {
      body = '<div class="wr-p">' + esc(w.prompt) + '</div>' +
        '<div class="wr-cn">' + esc(w.cn) + '</div>' +
        '<div class="wr-sub">写作提纲</div>' +
        '<ul class="wr-list">' + w.outline.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
        '<details class="wr-fold"><summary>看范文（150 词左右）</summary>' +
        '<div class="wr-sample">' + esc(w.sample).replace(/\n/g, '<br>') + '</div></details>' +
        '<details class="wr-fold"><summary>可直接套用的句型</summary>' +
        '<ul class="wr-list">' + w.phrases.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>' +
        scoreBox(i) +
        selfCheck(i);
    } else {
      body = '<div class="wr-p wr-cn-src">' + esc(w.cn) + '</div>' +
        '<details class="wr-fold"><summary>看参考译文</summary>' +
        '<div class="wr-sample">' + esc(w.ref) + '</div></details>' +
        '<details class="wr-fold"><summary>翻译要点</summary>' +
        '<ul class="wr-list">' + w.tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
    }
    d.innerHTML = '<div class="wr-t">' + esc(w.t) + '</div>' + body;
    if (kind === 'writing') {
      var inp = d.querySelector('#wrIn' + i);
      if (inp) {
        var drafts = readDrafts();
        if (typeof drafts['w' + i] === 'string') inp.value = drafts['w' + i];
        inp.addEventListener('input', function () { saveDraft(i, this.value); });
      }
      bindCheck(d, i); bindScore(d, i); bindAi(d, i);
      showLastAi(d, i);
    }
    return d;
  }

  function selfCheck(i) {
    return '<div class="wr-sub">交卷前自查（逐项勾选）</div>' +
      '<div class="chk" data-check="' + i + '">' +
      '<label><input type="checkbox" data-k="1">三段结构完整，每段一个中心</label>' +
      '<label><input type="checkbox" data-k="2">用了 5 个以上衔接词（first / besides / therefore…）</label>' +
      '<label><input type="checkbox" data-k="3">至少 3 处高级表达（非 I think / very）</label>' +
      '<label><input type="checkbox" data-k="4">通读一遍，无时态、单复数错误</label>' +
      '</div><div class="wr-score" id="wrScore' + i + '">0 / 4 项达标</div>';
  }

  function scoreBox(i) {
    return '<div class="wr-sub">按评分标准自测（15 分制）</div>' +
      '<textarea class="wr-input" id="wrIn' + i + '" rows="7" placeholder="把写好的作文粘贴到这里（120–180 词），点下面按钮给出分档与修改建议"></textarea>' +
      '<div class="wr-btn-row"><button class="wr-btn" type="button" data-score="' + i + '">本地分档</button>' +
      '<button class="wr-btn ghost" type="button" data-ai="' + i + '">AI 精批</button></div>' +
      '<div class="wr-band" id="wrBand' + i + '"></div>' +
      '<div class="wr-ai-zone" id="wrAi' + i + '"></div>' +
      '<div class="wr-draft-note">草稿自动保存在本机，切到「我的」配置 AI 再回来也不会丢。</div>';
  }

  var CON = ['first', 'second', 'third', 'to begin with', 'more importantly', 'moreover',
    'furthermore', 'besides', 'in addition', 'what is more', 'however', 'therefore',
    'as a result', 'consequently', 'nevertheless', 'admittedly', 'on the whole', 'in short',
    'for one thing', 'for another', 'last but not least', 'in conclusion'];
  var ADV = ['not only', 'provided that', 'on condition that', 'as long as', 'which ', 'who ',
    'whose ', 'that ', 'it is ', 'there is ', 'there are ', 'compared with', 'in terms of',
    'play a vital role', 'contribute to', 'be beneficial to', 'bridge the gap',
    'double-edged', 'come at the cost', 'ranking ', 'regarded as', 'would ', 'could ',
    'having ', 'faced with', 'rather than', 'instead of'];

  function countWords(t) {
    return t.trim().split(/\s+/).filter(function (x) { return /[a-zA-Z]/.test(x); }).length;
  }

  function scoreEssay(text, w) {
    var n = countWords(text);
    var paras = text.split(/\n+/).filter(function (x) { return x.trim().length > 0; });
    var sentences = text.split(/[.!?]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var avg = n / Math.max(1, sentences.length);
    var con = CON.filter(function (k) { return new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text); });
    var adv = ADV.filter(function (k) { return new RegExp(k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text); });
    var issues = [];
    if (/[\u4e00-\u9fa5]/.test(text)) issues.push('混入了中文，考试时会被视为未完成英文作答');
    if (/\bi\s+[a-z]/.test(text)) issues.push('人称代词 i 未大写');
    if (/(^|[.!?]\s+)[a-z]/.test(text)) issues.push('句首字母未大写');
    if (/[。，；：！？]/.test(text)) issues.push('使用了中文标点');
    if (!/[.!?]\s*$/.test(text.trim())) issues.push('结尾缺少句号');
    if (avg > 32) issues.push('平均句长 ' + Math.round(avg) + ' 词，长句偏多，容易失控');
    if (n < 60) issues.push('篇幅过短，难以展开论点');
    if (paras.length < 3 && n >= 110) issues.push('段落少于 3 段，建议按“观点—理由—结论”分段');

    var content = n >= 120 && n <= 200 ? 4 : n >= 100 && n <= 220 ? 3 : n >= 80 ? 2 : 1;
    var structure = (paras.length >= 3 ? 2 : paras.length === 2 ? 1 : 0) + Math.min(2, Math.floor(con.length / 2));
    var language = Math.max(0, 4 - issues.length) - (avg > 32 || avg < 6 ? 1 : 0);
    if (language < 0) language = 0;
    var vocab = Math.min(3, Math.floor(adv.length / 2) + (n >= 140 ? 1 : 0));
    var total = content + structure + language + vocab;
    var band = total >= 13 ? '14 分档（13–15）' : total >= 10 ? '11 分档（10–12）' :
      total >= 7 ? '8 分档（7–9）' : total >= 4 ? '5 分档（4–6）' : '2 分档（1–3）';
    var level = total >= 10 ? '作文基本能用：结构与观点到位，重点改语言准确性。' :
      total >= 7 ? '作文能读但不够稳：先补结构与衔接，再减少语法硬伤。' :
        '目前更像“句子堆叠”：先按提纲写满三段，再套 3 个句型。';

    scoreEssay.last = total;

    var tips = [];
    if (n < 120) tips.push('再写 ' + (120 - n) + ' 词：每段补一句原因或例证即可，不要凑废话。');
    else if (n > 180) tips.push('删掉 ' + (n - 180) + ' 词：优先删重复观点和形容词堆砌。');
    if (paras.length < 3) tips.push('分 3 段：开头亮观点，中段两条理由，结尾让步+结论。');
    if (con.length < 4) tips.push('衔接词只有 ' + con.length + ' 个，补 first / more importantly / therefore / admittedly 这类，每段 1–2 个即可。');
    if (adv.length < 3) tips.push('高级句式只有 ' + adv.length + ' 处，至少加 1 个定语从句（which…）和 1 个状语从句（provided that / as long as）。');
    if (!issues.length) tips.push('未发现机械性错误（大写、标点、中文混入），但拼写与主谓一致仍需自己逐句复核。');

    return '<div class="wr-band-top">' + total + ' / 15 · ' + band + '</div>' +      '<div class="wr-band-note">' + level + '</div>' +
      '<div class="wr-fb">' +
      fbRow('内容切题', content + '/4', n + ' 词 · ' + paras.length + ' 段 · 题目要求 ' + (w.prompt.indexOf('120') >= 0 ? '120–180 词' : '按题目要求')) +
      fbRow('结构衔接', structure + '/4', '衔接词 ' + con.length + ' 个' + (con.length ? '：' + con.slice(0, 6).join(' / ') : '')) +
      fbRow('语言准确', language + '/4', issues.length ? issues.join('；') : '未发现明显机械错误') +
      fbRow('词汇句式', vocab + '/3', adv.length + ' 处进阶表达' + (adv.length ? '：' + adv.slice(0, 5).join(' / ') : '')) +
      '</div>' +
      '<div class="wr-sub">下一步怎么改</div>' +
      '<ul class="wr-list">' + tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  function fbRow(name, score, note) {
    return '<div class="wr-fb-row"><b>' + name + '</b><span>' + score + '</span><em>' + esc(note) + '</em></div>';
  }

  function bindScore(scope, i) {
    var btn = scope.querySelector('[data-score="' + i + '"]');
    var out = scope.querySelector('#wrBand' + i);
    var inp = scope.querySelector('#wrIn' + i);
    if (!btn || !out || !inp) return;
    btn.onclick = function () {
      var text = inp.value.trim();
      if (countWords(text) < 20) {
        out.innerHTML = '<div class="wr-band-note">至少写 20 个英文词再评分，否则统计没有意义。</div>';
        return;
      }
      out.innerHTML = scoreEssay(text, DATA.writing[i]);
      if (A.noteEssayScore) A.noteEssayScore(scoreEssay.last);
    };
  }

  function bindAi(scope, i) {
    var btn = scope.querySelector('[data-ai="' + i + '"]');
    var out = scope.querySelector('#wrAi' + i);
    var inp = scope.querySelector('#wrIn' + i);
    if (!btn || !out || !inp) return;
    btn.onclick = function () {
      if (btn.__busy) return;
      var text = inp.value.trim();
      if (countWords(text) < 20) {
        out.innerHTML = '<div class="wr-band-note">至少写 20 个英文词再让 AI 批，否则它只能挑拼写。</div>';
        return;
      }
      var ai = window.AI;
      if (!ai || !ai.available) {
        out.innerHTML = '<div class="ai-error">AI 精批只在 APK 内可用：网页预览没有原生加密存储。装 APK 后到「我的 → AI 作文批改」填自己的 Key。</div>';
        return;
      }
      btn.__busy = true;
      btn.disabled = true;
      var req = 0;
      out.innerHTML = '<div class="ai-load"><b>AI 正在批改…</b><span>通常 5–20 秒，长作文可能更久</span>' +
        '<button class="link ai-cancel" type="button">取消</button></div>';
      var cancel = out.querySelector('.ai-cancel');
      if (cancel) cancel.onclick = function () {
        if (req) ai.cancel(req);
        out.innerHTML = '';
        btn.__busy = false;
        btn.disabled = false;
        showLastAi(scope, i);
      };
      req = ai.gradeEssay({
        text: text,
        prompt: DATA.writing[i].prompt,
        promptTitle: DATA.writing[i].t,
        promptIndex: i,
        cn: DATA.writing[i].cn,
        words: countWords(text)
      }, function (err, res) {
        btn.__busy = false;
        btn.disabled = false;
        if (err) {
          out.innerHTML = '<div class="ai-error">' + esc(err.error || '批改失败') + '</div>' +
            '<div class="ai-actions"><button class="link" id="aiGoMe" type="button">去配置 AI</button></div>';
          var go = out.querySelector('#aiGoMe');
          if (go) go.onclick = function () { A.go('me'); };
          return;
        }
        showResult(out, i, res);
      });
    };
  }

  function showResult(out, i, res) {
    var ai = window.AI;
    if (!ai) return;
    out.innerHTML = ai.renderGrade(res.grade, res);
    var record = out.querySelector('[data-ai-record]');
    if (record) record.onclick = function () {
      A.noteEssayScore(parseInt(this.getAttribute('data-ai-record'), 10) || 0);
      this.disabled = true;
      this.textContent = '已记入学习报告';
    };
    var rewrite = out.querySelector('[data-ai-use-rewrite]');
    if (rewrite) rewrite.onclick = function () {
      var inp = out.parentNode ? out.parentNode.querySelector('#wrIn' + i) : null;
      if (!inp || !res.grade.rewrite) return;
      inp.value = res.grade.rewrite;
      saveDraft(i, inp.value);
      inp.focus();
      if (A.toast) A.toast('已放入改写版，点「AI 精批」再评一次');
    };
    bindQa(out, res);
  }

  function bindQa(out, res) {
    var ai = window.AI;
    var box = out.querySelector('.ai-qa');
    if (!ai || !box || !res.record) return;
    var qout = box.querySelector('.ai-qout');
    var input = box.querySelector('.ai-qinput');
    var send = box.querySelector('.ai-qsend');
    if (!qout || !input || !send) return;

    function ask(q) {
      q = String(q || '').trim().slice(0, 200);
      if (!q || send.disabled) return;
      send.disabled = true;
      var load = document.createElement('div');
      load.className = 'ai-qload';
      load.textContent = 'AI 正在回答…';
      qout.appendChild(load);
      ai.followUp(res.record, q, function (err, r) {
        send.disabled = false;
        if (load.parentNode) load.parentNode.removeChild(load);
        if (err) {
          var er = document.createElement('div');
          er.className = 'ai-error';
          er.textContent = err.error || '追问失败';
          qout.appendChild(er);
          return;
        }
        var newRec = ai.appendQa(res.record.id, q, r.answer);
        if (newRec) res.record = newRec;
        var item = document.createElement('div');
        item.className = 'ai-qitem';
        item.innerHTML = '<b>你问：' + esc(q) + '</b><div class="ai-q-a">' + esc(r.answer) + '</div>';
        qout.appendChild(item);
        qout.scrollTop = qout.scrollHeight;
      });
    }

    send.onclick = function () { ask(input.value); input.value = ''; };
    input.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); ask(input.value); input.value = ''; }
    };
    var chips = box.querySelectorAll('[data-q]');
    for (var k = 0; k < chips.length; k++) {
      chips[k].onclick = function () { ask(this.getAttribute('data-q')); };
    }
  }

  function showLastAi(scope, i) {
    var ai = window.AI;
    if (!ai || !ai.latestFor) return;
    var rec = ai.latestFor(i);
    if (!rec) return;
    var out = scope.querySelector('#wrAi' + i);
    if (!out) return;
    var d = new Date(rec.at || Date.now());
    var at = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' +
      (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    out.innerHTML = '<div class="ai-last">上次 AI 批改 <b>' + rec.grade.total + '/15</b><span>' + at +
      '</span><button class="link" type="button">查看</button></div>';
    var btn = out.querySelector('.ai-last .link');
    if (btn) btn.onclick = function () {
      showResult(out, i, {
        grade: rec.grade, usage: rec.usage, ms: rec.ms || 0,
        record: rec, prevScore: rec.prevScore, delta: rec.delta
      });
    };
  }

  function bindCheck(scope, i) {    var box = scope.querySelector('[data-check="' + i + '"]');
    if (!box) return;
    var out = scope.querySelector('#wrScore' + i);
    box.addEventListener('change', function () {
      var n = box.querySelectorAll('input:checked').length;
      out.textContent = n + ' / 4 项达标' + (n === 4 ? ' · 可以默写一遍收尾' : n >= 2 ? ' · 再补一补' : ' · 先按提纲重写');
    });
  }

  /* 路由与标题 */
  var TITLES = A.TITLES;
  TITLES.write = '写作与翻译';
  A._scoreEssay = scoreEssay;
})();
