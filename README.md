# 四级通关 · CET4 Ace

离线四级备考 App：**真题模考 + 专项训练 + 听力精听/听写 + 710 估分 + 背单词**，一个网页工程 + 一个 Android 外壳，可以自己打成 APK。

> 当前版本 **v1.5**（2026-11）：在 v1.4 的 AI 作文精批之上，新增**今日一条流**（按 15/30/45 分钟自动排单词、专项、听写、错题、写作）与 **AI 批改闭环**（自动存档、错误类型聚合、改写后再批、基于当前作文追问）。Key 仍由 Android Keystore 加密，只存本机；网页层拿不到明文。
>
> **GitHub 仓库说明**：本仓库收录源码、题库数据与听力音频（约 220MB）；**不包含** `dist/CET4Ace.apk`（202MB，超过 GitHub 单文件 100MB 限制）、`library/` 真题 PDF 和 `build/` 构建缓存。APK 与完整资料请从本地「四级通关」目录取用；克隆后运行 `python tools/build_apk.py` 可重新构建 APK（首次会自动下载 JDK/SDK，需要网络）。

- 内置 **74 套结构化真题**（2015.06 – 2026.06，每套 30–55 题，全部可作答、可自动判分）
- **专项训练**：把 74 套拆成 761 个题组（听力 471 / 选词 74 / 匹配 74 / 阅读 142），按题型单独刷，做完即时判分与解析
- **听力听写**：任取一段听力原文自动挖空（最多 12 个空），先听后填、逐空核对、可看中文
- **710 估分**：听力 248.5 / 阅读 248.5 / 写作翻译 213，交卷自动记录；报告页有最近 10 套趋势、题型正确率与薄弱项推荐
- **生词↔真题**：单词卡显示“真题出现 N 套”并可跳转；成绩页给出本套高频词，一键加入生词本
- **倒计时与冲刺计划**：首页显示距考试天数，按剩余天数自动生成每日任务清单（可改考试日期）
- **错题遗忘曲线**：错题按 1→3→7→15→30 天排期重测，答对延长、答错重置
- **系统级提醒**：APK 内可设置每天固定时间弹通知（Android 13+ 会请求通知权限，开机后自动恢复）
- 听力题带 **音频**（2016–2018 为后补的整段录音；2019 起为逐篇分段稿 + 音频时间点），可「本段重播 / 循环本段」
- **2016–2018 已补全听力原文、中文对照与真实篇目时间点**；2026.06 第1/2套有听力题与原文，但源站无音频
- 内置 **59 套带听力录音**（2019 起 29 段 + 2016–2018 12 段，共 191MB）
- **阅读划词查义**：点原文任意单词，弹出音标、释义、例句，可一键进生词本
- **考试模式**：有听力的套卷 130 分钟、纯阅读册 105 分钟倒计时，到时自动交卷；听力**顺序锁定播放**（不能暂停、拖动或调倍速，原文与循环也关闭）
- **写作与翻译**：6 类作文题型（提纲 + 范文 + 可套用句型），**作文可粘贴自评，按 15 分制给出 14/11/8/5/2 分档 + 分项得分与修改建议**；6 篇翻译练习
- **AI 作文精批（可选，自备 Key）**：支持 DeepSeek / Kimi / 智谱 / 硅基流动 / OpenAI 与任意 OpenAI 兼容接口；给出 15 分制参考分、内容/结构/语言三维分、逐条纠错、改写版与下一步建议；Key 用 Android Keystore 加密保存，只走原生请求，网页层与日志都拿不到明文
- **今日一条流（v1.5）**：首页一个入口，按 15/30/45 分钟自动拼出单词、专项、听写、错题、写作任务；完成一项自动打勾，首页进度环与下一项同步
- **AI 批改闭环（v1.5）**：每次批改自动存档在本机；按固定错误类型聚合；可把 AI 改写版放回文本框再批一次，显示分数变化；可基于当前作文继续追问，追问只带当前作文、当前评分和最近两轮问答
- **每日打卡**：连续天数、今日目标进度，首页与「我的」实时显示
- 内置 **四级词库 7508 词**（音标 + 释义 + 例句），带间隔复习调度
- 内置 **2014.06 – 2026.06 全量真题资料索引**（28 个考次），可在线打开原卷 PDF
- 默认完全离线：题库、音频、词库都在本地，不联网也能用；只有你主动点「AI 精批」时，作文正文才会发给你配置的服务商。进度存在本机 localStorage，AI 配置由原生加密存储

---

## 一、目录结构

```
CET4Ace/
├── app/                     前端（就是 App 本体）
│   ├── index.html
│   ├── css/app.css
│   ├── js/core.js           路由、存储、通用工具
│   ├── js/exam.js            模考、判分、成绩、听力精听、划词查义、资料库
│   ├── js/vocab.js           背单词、单词测验、我的
│   ├── js/ai.js              AI 作文批改：预设、Key 设置、提示词、结果渲染
│   ├── js/write.js           写作与翻译（题目、范文、自查、AI 入口）
│   ├── js/today.js           今日一条流（15/30/45 分钟任务编排与完成打勾）
│   ├── js/train.js           专项训练、听写、710 估分报告、冲刺计划、错题重测、提醒桥接
│   ├── data/
│   │   ├── bank/            74 套题库（.json + .js）
│   │   ├── bank_raw/        导入后的原始题库（改数据从这一层改）
│   │   ├── drill.json/.js   按题型拆好的 761 个题组
│   │   ├── wordindex.json/.js 词 → 真题套数索引 + 每套高频词
│   │   ├── vocab.json/.js   词库
│   │   └── library.json/.js 资料库索引
│   ├── audio/               听力 mp3（41 个文件）
│   └── icon-192.png / icon-512.png
├── android/                 Android 外壳（无 Gradle 依赖）
│   ├── AndroidManifest.xml
│   ├── java/com/cet4ace/app/MainActivity.java
│   ├── java/com/cet4ace/app/ReminderReceiver.java  每日通知与开机恢复
│   ├── java/com/cet4ace/app/AiBridge.java          AI 设置/请求原生桥
│   ├── java/com/cet4ace/app/AiStore.java           AI 配置与应用私有存储
│   ├── java/com/cet4ace/app/AiClient.java          HTTPS 转发（不暴露 Key）
│   ├── java/com/cet4ace/app/KeystoreCipher.java    Keystore AES-GCM 加解密
│   └── res/                 图标与字符串
├── tools/                   构建与数据脚本
│   ├── import_shepi.py      SQLite 题库 → bank_raw
│   ├── patch_missing.py     用旧题库补缺题、记录答案冲突
│   ├── clean_expl.py        清洗解析文本
│   ├── fetch_audio.py       下载听力并去重、回写 audioFile
│   ├── check_import.py      与旧题库交叉校验答案
│   ├── build_data.py        原始数据 → App 数据
│   ├── build_apk.py         无 Gradle 打 APK
│   ├── make_icons.py        生成图标
│   └── package_desktop.py   打包到桌面
├── library/                 全量真题 PDF（2014–2026），按考次分目录
├── dist/                    打好的 APK
└── build/                   中间产物
```

---

## 二、直接装 APK

`dist/CET4Ace.apk` 已签名，传到手机点击安装即可（需允许「安装未知来源应用」）。

包名 `com.cet4ace.app`，最低 Android 5.0（API 21），竖屏，纯 WebView 外壳。

> 签名密钥保存在 `tools/keystore/release.keystore`（密码 `android`，alias `cet4ace`），不再随 `build/` 一起清空（源码 ZIP 出于安全未包含，首次打包会自动新建）。**v1.3 的签名与 v1.2 测试包不同**：如果手机上装过 v1.2，需要先卸载再装 v1.3 / v1.4 / v1.5（本地进度会清空）；从 v1.3 起签名一致，可以一路覆盖升级到 v1.5。

### AI 作文批改怎么配

1. 打开「我的」→ 最下面「AI 作文批改（自备 Key）」。
2. 选服务商（推荐 DeepSeek），接口地址和模型会自动填好；也可以选「自定义」，填完整的 `https://.../chat/completions` 地址和模型名。
3. 粘贴自己的 API Key，点「保存配置」，再点「测试连接」。看到「连接成功」即可。
4. 到「写作」页，把作文粘进文本框，点「AI 精批」。会返回 15 分制参考分、内容/结构/语言分项、逐条纠错、改写版与下一步建议。
5. 批改结果会自动存档：卡片上会出现「上次 AI 批改」入口；写作页顶部汇总累计篇数和最常见错误类型。点「用改写版当新稿」可把 AI 改写放回文本框，改完再点「AI 精批」，新结果会显示比上次高/低几分。
6. 结果卡底部可「继续问这篇作文」：输入问题或点快捷问题，AI 只带当前作文、当前评分和最近两轮问答，不会把整本学习记录发出去。
7. 不想用 AI 也完全不影响：本地分档、范文、翻译、真题模考都不需要联网，也不需要 Key。

> Key 由 Android 6.0+ 的 Keystore AES-GCM 加密保存在应用私有目录，网页层只能拿到掩码；请求由原生层直接发给你填的服务商，不经过任何中转服务器。Android 5.x 没有 Keystore AES，只能放应用私有目录（不加密），界面会明确提示。

---

## 三、自己重新打包 APK

### 方式 A：命令行一键打包（推荐，不用装 Android Studio）

```bash
python tools/build_data.py            # 原始数据 → app/data
python tools/build_apk.py             # 输出 dist/CET4Ace.apk
```

首次需要便携工具链（源码 ZIP 为了瘦身没有内置 `tools/jdk`、`tools/sdk`，脚本会自动下载）：

```bash
python tools/fetch_android_tools.py   # 华为云 JDK17 + 腾讯云 Android SDK，约 310MB
```

打包链路：`aapt2 compile` → `aapt2 link` → `javac` → `d8` → 打 dex 进包 → `zipalign` → `apksigner`。
签名默认用 `tools/keystore/release.keystore`（密码 `android`，alias `cet4ace`）；要正式发布请换自己的签名。

### 方式 B：Android Studio / Gradle

1. 新建 Empty Activity 工程，包名 `com.cet4ace.app`，语言 Java。
2. 用本工程 `android/java/com/cet4ace/app/` 下的全部 `.java`（MainActivity、ReminderReceiver、AiBridge、AiStore、AiClient、KeystoreCipher）和 `android/AndroidManifest.xml` 覆盖。
3. 把 `app/` 整个目录复制到 `src/main/assets/www/`。
4. 把 `android/res/mipmap-*` 图标复制到 `src/main/res/`。
5. Build → Build APKs。

> MainActivity 只依赖系统自带 `android.webkit.WebView`，不需要任何第三方库。

---

## 四、题库是怎么来的、怎么更新

### 数据链路

```
ShepiTT/CET_practice_questions 的 instance/cet4_v2.db（SQLite）
   │  tools/import_shepi.py        分组 → 试卷：阅读/选词/匹配/听力
   ▼
app/data/bank_raw/cet4_YYYY_MM_N.json     （含 expl 解析、script 原文、audioStart 起点）
   │  tools/patch_missing.py      用旧题库补缺题
   │  tools/clean_expl.py         清洗解析文本
   │  tools/fetch_audio.py        下载 mp3、按 md5 去重、回写 audioFile
   ▼
app/data/bank/*.json + *.js + manifest.json
```

2015–2018 与 2026.06 走另一条线（这两段没有 Shepi 结构化库）：

```
lazynote 整卷页（2015-06 ~ 2018-12、2026-06）
   │  tools/import_lazy.py      HTML 文本 → 题干/选项/词库/匹配段/答案速查
   ▼
app/data/bank_raw/cet4_YYYY_MM_N.json
   │  tools/import_listen.py   听力详情页 → 原文/中文对照/篇目时间点（2016–2018）
   │  tools/audio_lazy.py       happynchubby m4a → 32kbps 单声道 mp3 → 回写 audioFile
   ▼
app/data/bank/*.json + manifest.json
```

### 新增/更新一套题

1. 更新 `tools/_dl/shepi.db`（重新从仓库下载 latest 版本）
2. `python tools/import_shepi.py`
3. `python tools/fetch_audio.py`
4. `python tools/build_data.py`
5. `python tools/build_apk.py`

补 2015–2018：`python tools/import_lazy.py` + `python tools/audio_lazy.py` + `python tools/import_listen.py`，再走第 4、5 步。
补 2026.06 听力：`python tools/import_2026_listen.py`（只补题目与原文，无音频），再走第 4、5 步。

### 题库 JSON 结构

```json
{
  "id": "2024_12_1", "title": "2024年12月 第1套", "year": 2024, "month": 12, "set": 1,
  "audio": "audio/xxxx.mp3",
  "questions": [
    { "no": 1, "part": "listening", "kind": "mcq", "stem": "1",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "answer": "D",
      "script": "听力原文……", "audioStart": 43.1, "expl": "中文解析……",
      "groupNote": "Questions 1 and 2 are based on the news report..." }
  ],
  "passages": { "cloze": {...}, "matching": {...}, "passage1": {...} }
}
```

`kind` 支持 `mcq`（单选）、`cloze`（选词填空，用词库字母作答）、`matching`（长篇匹配，用段落字母作答）。

---

## 五、App 里能做什么

| 模块 | 能力 |
| --- | --- |
| 模考 | 74 套真题按年份筛选（2015.06–2026.06）；练习模式正计时 / 考试模式 130 分钟（纯阅读册 105 分钟）倒计时并自动交卷；答题卡、交卷判分；成绩按题型拆分 |
| 今日一条流 | 首页一个入口；15/30/45 分钟自动拼单词、专项、听写、到期错题、写作；完成自动打勾，首页进度环同步；无到期错题自动跳过 |
| 精听 | 2016–2026 听力题配原文与中文对照；「本段重播」按真实篇目起点跳转（2016–2018 已补时间点）；「循环本段」在该段内循环；可调 0.75x–1.5x 倍速（考试模式禁用）。2026.06 第1/2套无音频，可读原文 |
| 考试模式 | 130 / 105 分钟倒计时 + 自动交卷；听力顺序锁定：不能暂停、拖动进度、调倍速，原文/循环按钮同时隐藏 |
| 解析 | 交卷后逐题显示正确答案；2019 起的题库带中文解析，2016–2026 听力题可展开原文与中文对照 |
| 错题本 | 「我的」里点任意错题可直接跳回原套题对应题号重做 |
| 划词 | 阅读/选词/匹配原文点任意单词，弹层显示音标、释义、例句，可加入生词本 |
| 写作 | 6 类题型：英文题目 + 中文题意 + 三段提纲 + 范文 + 可套用句型；可粘贴自评，15 分制给出 14/11/8/5/2 分档、四项得分与修改建议 |
| AI 精批 | 自备 OpenAI 兼容 Key：15 分制参考分、内容/结构/语言三维分、逐条纠错（原文→修改→原因）、好表达、改写版、下一步建议；支持测试连接、记入报告；Key 加密存本机 |
| 翻译 | 6 篇中国文化/社会主题练习：中文原文 + 参考译文 + 逐句要点 |
| 背单词 | 7508 词卡片翻转、读音、收藏、按 SM-2 间隔复习；连续打卡统计；单词卡显示真题出现套数并可跳转 |
| 专项 | 4 类题型共 761 组：听力按篇目、选词 10 空、匹配 10 题、阅读按篇 5 题；逐题即时判分、解析、错题入本 |
| 听写 | 答题页「听写本段」：原文自动挖空、0.75x 慢速、逐空核对、显示正确词与中文 |
| 估分 | 710 分制估算（听力 248.5 / 阅读 248.5 / 写作翻译 213），记录最近 40 套；报告含趋势、题型正确率、薄弱推荐 |
| 计划 | 首页倒计时 + 基础/强化/冲刺/临考四阶段每日清单，日清计数 |
| 错题 | 按 1/3/7/15/30 天遗忘曲线重测；答对延长间隔，答错回到第 1 级 |
| 提醒 | APK 内每天固定时间系统通知；Android 13+ 运行时申请通知权限，重启后自动恢复 |
| 真题库 | 28 个考次（2014.06–2026.06）的真题 PDF / 音频在线入口 |

---

## 六、已知边界（务必知道）

1. **结构化可判分题库覆盖 2015.06 – 2026.06（74 套）**。**2014 全年（6 套）仍只有原卷 PDF**
   （在「真题库」页与桌面资料 ZIP 里）：公开可用的整卷结构库最早从 2015 年开始，2014 缺逐题答案，
   故未强行拼成可判分题库。需要 2014 可判分，得再找一份带答案的 2014 数据源。
2. **2015 全年（6 套）只有阅读部分**：源站的 2015 听力题目与 2015 真题卷对不上（用真题 PDF 逐项核对确认），
   已主动剔除听力，只保留选词填空 / 匹配 / 阅读（30 题）。2016–2018 的第 3 套是纯阅读册（30 题）；
   **2026.06 第1/2套已补成 55 题（听力题 + 原文，但源站没有音频）**，第3套只有阅读 30 题。
   2016–2018 第 1/2 套已补 32kbps 单声道 mp3。
3. 少数套题在源库里本身就不全（如 2020.07 第1套、2020.12 第2套只有 50 题；2021.06 第3套听力 20 题），已按原样导入。
4. **2025.12 第2套第 25 题**两套题库答案冲突（旧库 A / 新库 D），App 采用新库 D，并在该套 JSON 的 `warnings` 里标注。
5. 听力音频来源不同：2019 起约 24kbps，2016–2018 为 32kbps 单声道重编码（体积小、语音可辨）。
6. 「写作」页的作文题与范文是自编训练素材，用于对照结构与句型，**不是官方真题答案**；翻译练习同理。
   作文自评是按字数、段落、衔接词、进阶句式与机械错误做的**规则评分**，用于定位问题，不等同人工阅卷。
   AI 精批是模型生成的参考评分，可能不稳定或误判；正式考试以人工/官方评分为准。
7. 「每日提醒」分两层：网页版只有应用内进度提示；装成 APK 后走 Android 通知（`NotifyBridge` → `AlarmManager` 每日不精确重复闹钟 + 开机恢复）。不申请精确闹钟权限，通知可能比设定时间晚几分钟；Android 13+ 需要允许通知权限，否则只排期不弹窗。
8. **710 估分是近似换算**：听力 25 题、阅读 30 题按比例折算到 248.5，写作翻译按作文 15 分制折算；写作未评分时按 8/15 中位估。结果用于看趋势和定位薄弱项，**不等于官方报道分**。纯阅读册（2015 六套等）按 461.5 满分折算并单独标注。
9. **AI 精批需要你自备 API Key，且需要联网**。App 不内置任何 Key，也不承担服务商费用；Key 由 Android 6.0+ 的 Keystore AES-GCM 加密后存应用私有目录，网页层只拿到掩码。Android 5.x 没有 Keystore AES，只能放在应用私有目录（未加密），界面会明确提示。点「AI 精批」时发送的内容只有作文正文、题目与评分要求，不发送生词、错题、模考成绩等其他数据。追问只额外带上当前评分、当前作文和最近两轮问答。
10. **AI 批改历史存在本机 localStorage**（`c4.aiHistory`，最多 80 篇），不上传服务器。清除 App 数据或卸载会一并丢失；换手机不会自动同步。错误类型是 AI 按固定标签归类的，仍可能出现归错类；统计只用于看趋势，不是精确语法诊断。
11. **AI 接口必须兼容 OpenAI `POST /chat/completions` 格式**（请求头 Bearer Key，返回 `choices[0].message.content`）。DeepSeek / Kimi / 智谱 / 硅基流动 / OpenAI 预设可直接用；自定义服务商要填完整的 `/chat/completions` 地址和模型名。401/403 多数是 Key 或地址不匹配，404 多数是地址少了 `/v1`，429 是额度或频率限制。

---

## 七、数据来源与版权

| 内容 | 来源 | 许可 |
| --- | --- | --- |
| 结构化真题+解析+听力原文（2019.06–2025.12） | [ShepiTT/CET_practice_questions](https://github.com/ShepiTT/CET_practice_questions) | 整理者未声明，权利归原机构 |
| 结构化真题+答案速查+听力原文（2015.06–2018.12、2026.06 第1/2套） | [lazynote 懒笔记](https://english-exam.lazynote.cn/cet4/) | 整理者未声明，权利归原机构 |
| 2016–2018 听力音频（m4a 转码） | [HNC 英语学习](https://www.happynchubby.xyz/%E8%80%8D%E5%8D%80%E5%B0%88%E5%8D%80/cet-4/) | 整理者未声明，权利归原机构 |
| 旧版结构化题库（交叉校验用） | [couldyyy9/cet-website](https://github.com/couldyyy9/cet-website) | MIT |
| 真题 PDF / 听力（2014–2026） | [0609x/CET46-Resources](https://github.com/0609x/CET46-Resources) | 整理者未声明，权利归原机构 |
| 四级词库 7508 词 | [KyleBing/english-vocabulary](https://github.com/KyleBing/english-vocabulary) | 原库结构，词条来自公开词表 |

**真题原文、听力音频、解析的版权归原考试机构及相应权利人所有。本工程仅供个人学习自用，请勿上架应用商店或公开分发。**
