import glob
import json
import os

ROOT = r"C:\Users\ASUS\Doubao\chats\2026-11-15\new-chat-1\CET4Ace"
OLD = os.path.join(ROOT, "app", "data", "bank")
NEW = os.path.join(ROOT, "app", "data", "bank_raw")

shared = 0
diff_total = 0
checked_total = 0
missing_total = 0

for fn in sorted(glob.glob(os.path.join(OLD, "*.json"))):
    if fn.endswith("manifest.json"):
        continue
    pid = os.path.basename(fn)[:-5]
    newp = os.path.join(NEW, f"cet4_{pid}.json")
    if not os.path.exists(newp):
        continue
    shared += 1
    old = json.load(open(fn, encoding="utf-8"))
    new = json.load(open(newp, encoding="utf-8"))
    oldmap = {q["no"]: q["answer"] for q in old["questions"]}
    newmap = {q["no"]: q["answer"] for q in new["questions"]}
    diffs = []
    for no, ans in oldmap.items():
        if no in newmap:
            checked_total += 1
            if str(ans).strip().upper() != str(newmap[no]).strip().upper():
                diffs.append((no, ans, newmap[no]))
        else:
            missing_total += 1
    diff_total += len(diffs)
    print(f"{pid}: 旧{len(oldmap)}题 新{len(newmap)}题 不一致{len(diffs)} {diffs[:6]}")

print(f"\n共同套题 {shared} 套，比对 {checked_total} 题，答案不一致 {diff_total} 题，"
      f"新版缺失 {missing_total} 题")

# 质量抽查
p = json.load(open(os.path.join(NEW, "cet4_2025_06_1.json"), encoding="utf-8"))
print("\n--- 抽查 2025_06_1 ---")
print("passages:", {k: (len(str(v))) for k, v in p["passages"].items()})
print("cloze 词库:", p["passages"]["cloze"].get("wordBank"))
print("matching 段落:", list(p["passages"]["matching"]["paragraphs"])[:6], "...")
print("听力原文长度:", [len(q.get("script", "")) for q in p["questions"][:5]])
print("音频起点:", [q.get("audioStart") for q in p["questions"][:5]])
print("解析长度:", [len(q.get("expl", "")) for q in p["questions"][:3]])
