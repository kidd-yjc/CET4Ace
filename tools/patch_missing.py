"""用旧题库（couldyyy9 源）补齐 ShepiTT 库里缺失的题目，并记录答案冲突。"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = os.path.join(ROOT, "app", "data", "bank")
RAW = os.path.join(ROOT, "app", "data", "bank_raw")

filled = 0
conflicts = []
for fn in sorted(glob.glob(os.path.join(RAW, "cet4_*.json"))):
    pid = os.path.basename(fn)[5:-5]
    oldp = os.path.join(OLD, pid + ".json")
    if not os.path.exists(oldp):
        continue
    new = json.load(open(fn, encoding="utf-8"))
    old = json.load(open(oldp, encoding="utf-8"))
    oldmap = {q["no"]: q for q in old["questions"]}
    have = {q["no"]: q for q in new["questions"]}

    warnings = new.get("warnings", [])
    for no, q in oldmap.items():
        if no not in have:
            # 补题：沿用旧题干/选项/答案
            q2 = {
                "no": no, "part": q.get("part"), "kind": q.get("kind"),
                "stem": q.get("stem", ""), "options": q.get("options", {}),
                "answer": q.get("answer"), "passage": q.get("passage"),
                "groupNote": q.get("groupNote", ""),
            }
            if q.get("answerText"):
                q2["answerText"] = q["answerText"]
            new["questions"].append(q2)
            filled += 1
            warnings.append(f"第{no}题由旧题库补充（ShepiTT 库缺失）")
        elif have[no].get("answer") != q.get("answer"):
            conflicts.append((pid, no, q.get("answer"), have[no].get("answer")))
            warnings.append(f"第{no}题答案存在冲突：旧={q.get('answer')} 新={have[no].get('answer')}，采用新")
    new["questions"].sort(key=lambda x: x["no"])
    new["warnings"] = warnings
    with open(fn, "w", encoding="utf-8") as f:
        json.dump(new, f, ensure_ascii=False, separators=(",", ":"))

print(f"补题 {filled} 道；答案冲突 {len(conflicts)} 处: {conflicts}")
