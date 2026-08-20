"""Exports all Supabase tables to docs/db-export/ as JSON + CSV, and computes
the KPI numbers used by both the final report and the charts, so both always
agree with each other (docs/db-export/kpi_summary.json is the single source
of truth for every number quoted anywhere else).
"""
import json
import csv
import os
from datetime import datetime, timezone
from collections import defaultdict
import requests

SUPABASE_URL = "https://hafhterrfilxaahcsqfe.supabase.co"
ANON_KEY = "sb_publishable_9xKCCqrSJGAtbOS-3cQeRw_kvT0QMpL"
HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "db-export")
os.makedirs(OUT_DIR, exist_ok=True)

TABLES = ["users", "groups", "group_members", "sessions", "preferences", "votes"]


def fetch(table):
    res = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?select=*", headers=HEADERS)
    res.raise_for_status()
    return res.json()


def save(table, rows):
    json_path = os.path.join(OUT_DIR, f"{table}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    if rows:
        csv_path = os.path.join(OUT_DIR, f"{table}.csv")
        keys = sorted({k for r in rows for k in r.keys()})
        with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            for r in rows:
                writer.writerow(r)
    print(f"{table}: {len(rows)} rows")


def main():
    data = {}
    for t in TABLES:
        rows = fetch(t)
        save(t, rows)
        data[t] = rows

    users = data["users"]
    groups = data["groups"]
    members = data["group_members"]
    sessions = data["sessions"]
    prefs = data["preferences"]
    votes = data["votes"]

    members_by_group = defaultdict(list)
    for m in members:
        members_by_group[m["group_id"]].append(m["user_id"])

    prefs_by_session = defaultdict(list)
    for p in prefs:
        prefs_by_session[p["session_id"]].append(p)

    votes_by_session = defaultdict(list)
    for v in votes:
        votes_by_session[v["session_id"]].append(v)

    # ---- KPI 1: 프롬프트 참여율 (실제 입력한 사람 수 / 세션이 속한 그룹의 멤버 수), 세션 평균 ----
    participation_rates = []
    for s in sessions:
        member_count = len(members_by_group.get(s["group_id"], []))
        if member_count == 0:
            continue
        real_submits = sum(1 for p in prefs_by_session.get(s["id"], []) if not p["passed"])
        participation_rates.append(real_submits / member_count)
    prompt_participation_rate = (
        sum(participation_rates) / len(participation_rates) if participation_rates else 0
    )

    # ---- KPI 2: 세션 완료율 (closed / 후보가 생성된 세션(voting+closed)) ----
    sessions_with_candidates = [s for s in sessions if s["status"] in ("voting", "closed")]
    closed_sessions = [s for s in sessions if s["status"] == "closed"]
    session_completion_rate = (
        len(closed_sessions) / len(sessions_with_candidates) if sessions_with_candidates else 0
    )

    # ---- KPI 3: 결정 도달 시간 (세션 생성 -> 마지막 투표, 분 단위 평균, closed 세션만) ----
    decision_minutes = []
    for s in closed_sessions:
        sv = votes_by_session.get(s["id"], [])
        if not sv:
            continue
        created = datetime.fromisoformat(s["created_at"].replace("Z", "+00:00"))
        last_vote = max(datetime.fromisoformat(v["created_at"].replace("Z", "+00:00")) for v in sv)
        decision_minutes.append((last_vote - created).total_seconds() / 60)
    avg_decision_minutes = sum(decision_minutes) / len(decision_minutes) if decision_minutes else 0

    # ---- 동점(룰렛) 발생 횟수 ----
    tie_sessions = 0
    for sid, sv in votes_by_session.items():
        tally = defaultdict(int)
        for v in sv:
            tally[v["restaurant"]] += 1
        if tally:
            m = max(tally.values())
            if list(tally.values()).count(m) > 1:
                tie_sessions += 1

    # ---- 일자별 신규 가입자 (funnel/growth chart 용) ----
    daily_signups = defaultdict(int)
    for u in users:
        day = u["created_at"][:10]
        daily_signups[day] += 1

    # ---- 그룹 유형 분포 ----
    group_type_counts = defaultdict(int)
    for g in groups:
        group_type_counts[g["type"]] += 1

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "totals": {
            "users": len(users),
            "groups": len(groups),
            "group_members": len(members),
            "sessions": len(sessions),
            "preferences": len(prefs),
            "votes": len(votes),
            "sessions_closed": len(closed_sessions),
            "sessions_with_candidates": len(sessions_with_candidates),
        },
        "kpi": {
            "prompt_participation_rate": round(prompt_participation_rate, 4),
            "session_completion_rate": round(session_completion_rate, 4),
            "avg_decision_minutes": round(avg_decision_minutes, 2),
            "tie_break_sessions": tie_sessions,
        },
        "daily_signups": dict(sorted(daily_signups.items())),
        "group_type_counts": dict(group_type_counts),
    }

    summary_path = os.path.join(OUT_DIR, "kpi_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("\n=== KPI SUMMARY ===")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
