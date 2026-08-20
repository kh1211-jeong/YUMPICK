"""Generates every KPI / before-after chart for the final report from
docs/db-export/kpi_summary.json (the single numeric source of truth --
these numbers must match whatever the report text quotes).
"""
import json
import os
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

BASE = os.path.join(os.path.dirname(__file__), "..")
DB_EXPORT = os.path.join(BASE, "docs", "db-export")
CHARTS_DIR = os.path.join(BASE, "docs", "charts")
os.makedirs(CHARTS_DIR, exist_ok=True)

plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

# yumpick DESIGN.md palette
BG = "#FBF7F2"
TEXT = "#2B2320"
TEXT_MUTED = "#8A7E75"
ACCENT = "#E8703A"
ACCENT_SOFT = "#FCE9DE"
YUM = "#F2A93B"
YUM_SOFT = "#FDF0D8"
MUTED_CHOICE = "#9AA0A6"
BORDER = "#EBE1D6"

with open(os.path.join(DB_EXPORT, "kpi_summary.json"), encoding="utf-8") as f:
    K = json.load(f)


def style_ax(ax, title):
    ax.set_facecolor(BG)
    ax.set_title(title, fontsize=14, fontweight="bold", color=TEXT, pad=14)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(BORDER)
    ax.spines["bottom"].set_color(BORDER)
    ax.tick_params(colors=TEXT_MUTED, labelsize=10)
    ax.yaxis.grid(True, color=BORDER, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)


def savefig(fig, name):
    fig.patch.set_facecolor(BG)
    fig.tight_layout()
    path = os.path.join(CHARTS_DIR, name)
    fig.savefig(path, dpi=160, facecolor=BG, bbox_inches="tight", pad_inches=0.35)
    plt.close(fig)
    print("saved", path)


# ---------------------------------------------------------------
# Chart A: 일별 신규 가입자 성장
# ---------------------------------------------------------------
days = list(K["daily_signups"].keys())
counts = list(K["daily_signups"].values())
day_labels = [d[5:].replace("-", "/") for d in days]

fig, ax = plt.subplots(figsize=(7, 4.5))
bars = ax.bar(day_labels, counts, color=ACCENT, width=0.55, zorder=3)
ax.plot(day_labels, counts, color=YUM, linewidth=2.5, marker="o", markersize=8, zorder=4)
for b, c in zip(bars, counts):
    ax.text(b.get_x() + b.get_width() / 2, c + max(counts) * 0.03, str(c),
            ha="center", fontsize=12, fontweight="bold", color=TEXT)
style_ax(ax, "일별 신규 가입자 (누적 %d명)" % sum(counts))
ax.set_ylim(0, max(counts) * 1.25)
savefig(fig, "growth_daily_signups.png")

# ---------------------------------------------------------------
# Chart B: 서비스 퍼널 (DB 기준, 전체 기간 누적)
# ---------------------------------------------------------------
funnel_labels = ["가입", "그룹 생성", "세션 시작", "후보 생성\n(voting+closed)", "최종 확정\n(closed)"]
funnel_values = [
    K["totals"]["users"],
    K["totals"]["groups"],
    K["totals"]["sessions"],
    K["totals"]["sessions_with_candidates"],
    K["totals"]["sessions_closed"],
]

fig, ax = plt.subplots(figsize=(8, 4.8))
colors = [ACCENT, ACCENT, YUM, YUM, "#4CAF50"]
bars = ax.barh(funnel_labels[::-1], funnel_values[::-1], color=colors[::-1], height=0.6, zorder=3)
for b, v in zip(bars, funnel_values[::-1]):
    ax.text(v + max(funnel_values) * 0.02, b.get_y() + b.get_height() / 2, str(v),
            va="center", fontsize=12, fontweight="bold", color=TEXT)
style_ax(ax, "서비스 퍼널 (DB 누적, 전체 기간)")
ax.set_xlim(0, max(funnel_values) * 1.2)
ax.xaxis.grid(True, color=BORDER, linewidth=0.8, zorder=0)
ax.yaxis.grid(False)
savefig(fig, "funnel_db.png")

# ---------------------------------------------------------------
# Chart C: KPI 요약 대시보드 (4 subplot)
# ---------------------------------------------------------------
fig, axes = plt.subplots(1, 4, figsize=(14, 4.2))

# C1: 프롬프트 참여율
ax = axes[0]
rate = K["kpi"]["prompt_participation_rate"] * 100
ax.pie([rate, 100 - rate], colors=[ACCENT, "#EEE5DB"], startangle=90,
       counterclock=False, wedgeprops=dict(width=0.35, edgecolor=BG))
ax.text(0, 0, f"{rate:.0f}%", ha="center", va="center", fontsize=20, fontweight="bold", color=TEXT)
ax.set_title("프롬프트\n참여율", fontsize=12, fontweight="bold", color=TEXT)

# C2: 세션 완료율
ax = axes[1]
rate2 = K["kpi"]["session_completion_rate"] * 100
ax.pie([rate2, 100 - rate2], colors=[YUM, "#EEE5DB"], startangle=90,
       counterclock=False, wedgeprops=dict(width=0.35, edgecolor=BG))
ax.text(0, 0, f"{rate2:.0f}%", ha="center", va="center", fontsize=20, fontweight="bold", color=TEXT)
ax.set_title("세션 완료율\n(후보생성→확정)", fontsize=12, fontweight="bold", color=TEXT)

# C3: 평균 결정 도달 시간
ax = axes[2]
ax.axis("off")
mins = K["kpi"]["avg_decision_minutes"]
ax.text(0.5, 0.55, f"{mins/60:.1f}h", ha="center", va="center", fontsize=28, fontweight="bold", color=ACCENT, transform=ax.transAxes)
ax.text(0.5, 0.2, "평균 결정 도달 시간\n(세션 생성→마지막 투표)", ha="center", va="center", fontsize=11, color=TEXT_MUTED, transform=ax.transAxes)

# C4: 동점(룰렛) 발생
ax = axes[3]
ax.axis("off")
ties = K["kpi"]["tie_break_sessions"]
ax.text(0.5, 0.55, f"{ties}건", ha="center", va="center", fontsize=28, fontweight="bold", color=YUM, transform=ax.transAxes)
ax.text(0.5, 0.2, "동점 → 룰렛\n실제 작동 횟수", ha="center", va="center", fontsize=11, color=TEXT_MUTED, transform=ax.transAxes)

fig.suptitle("핵심 KPI 요약 (DB 전체 기간 기준)", fontsize=15, fontweight="bold", color=TEXT, y=1.03)
savefig(fig, "kpi_dashboard.png")

# ---------------------------------------------------------------
# Chart D: Iteration Before / After 종합 비교
# ---------------------------------------------------------------
fig, axes = plt.subplots(1, 4, figsize=(15, 4.5))

def before_after(ax, title, before, after, before_label, after_label, unit=""):
    bars = ax.bar([before_label, after_label], [before, after], color=[MUTED_CHOICE, ACCENT], width=0.5, zorder=3)
    for b, v in zip(bars, [before, after]):
        ax.text(b.get_x() + b.get_width() / 2, v + max(before, after) * 0.03, f"{v}{unit}",
                ha="center", fontsize=13, fontweight="bold", color=TEXT)
    style_ax(ax, title)
    ax.set_ylim(0, max(before, after) * 1.3)

before_after(axes[0], "Gemini 모델 안정성\n(연속 호출 실패)", 3, 0, "flash-latest", "flash-lite-latest", "회 실패")
before_after(axes[1], "그룹당 동시\n활성 세션 수(버그)", 3, 1, "수정 전", "수정 후", "개")
before_after(axes[2], "재로그인 시\n입력 필드 수", 4, 1, "수정 전", "수정 후", "개")
before_after(axes[3], "노출 후보 수\n(AI추천+더보기)", 3, 10, "수정 전", "수정 후", "곳")

fig.suptitle("Iteration Before / After", fontsize=15, fontweight="bold", color=TEXT, y=1.04)
savefig(fig, "iteration_before_after.png")

# ---------------------------------------------------------------
# Chart E: GA4 이벤트 (참고용 - 측정 시작 이후 구간만)
# ---------------------------------------------------------------
ga_events = [
    ("page_view", 437), ("invite_click", 117), ("scroll", 137),
    ("signup_complete", 26), ("vote_click", 26), ("prompt_submit", 19),
    ("group_create", 8), ("candidate_view", 6), ("result_confirm", 3),
]
labels = [e[0] for e in ga_events]
values = [e[1] for e in ga_events]

fig, ax = plt.subplots(figsize=(9, 4.8))
bars = ax.bar(labels, values, color=YUM, width=0.55, zorder=3)
for b, v in zip(bars, values):
    ax.text(b.get_x() + b.get_width() / 2, v + max(values) * 0.02, str(v),
            ha="center", fontsize=10, fontweight="bold", color=TEXT)
style_ax(ax, "GA4 이벤트 발생 수 (측정 연동 이후 구간, 7/23~8/19)")
plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
savefig(fig, "ga4_events.png")

print("\nAll charts generated in", CHARTS_DIR)
