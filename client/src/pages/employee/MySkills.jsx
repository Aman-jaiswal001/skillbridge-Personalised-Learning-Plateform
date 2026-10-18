import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { normalizeSkill } from "../../api/normalizers";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import Modal from "../../components/common/Modal";
import PageContainer from "../../components/common/PageContainer";
import ProgressBar from "../../components/common/ProgressBar";
import SearchBar from "../../components/common/SearchBar";
import { useToast } from "../../context/ToastContext";
import { useApiData } from "../../hooks/useApiData";

export default function MySkills() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("All Skills");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Programming & Development");
  const [startingLevel, setStartingLevel] = useState("Beginner");
  const [targetPercent, setTargetPercent] = useState(80);
  const { push } = useToast();
  const { data, loading, error, reload } = useApiData("/employees/me/skills", {
    initialData: { skills: [], summary: {}, radar: [] },
  });

  useEffect(() => {
    window.addEventListener("skillbridge:learning-updated", reload);
    return () =>
      window.removeEventListener("skillbridge:learning-updated", reload);
  }, [reload]);

  const list = useMemo(() => (data?.skills || []).map(normalizeSkill), [data]);
  const categories = useMemo(
    () => [
      "All Skills",
      ...new Set(list.map((s) => s.category).filter(Boolean)),
    ],
    [list],
  );
  const radar = data?.radar?.length
    ? data.radar
    : categories
        .filter((c) => c !== "All Skills")
        .map((c) => ({ subject: c, A: 0 }));
  const filtered = useMemo(() => {
    return list.filter((s) => {
      const matchTab = tab === "All Skills" || s.category === tab;
      const matchQ = s.name.toLowerCase().includes(q.toLowerCase());
      return matchTab && matchQ;
    });
  }, [list, q, tab]);

  const summary = data?.summary || {};
  const prioritySkill = list.find((skill) => skill.gap > 0);
  const trend = useMemo(
    () =>
      list
        .flatMap((skill) =>
          (skill.assessmentHistory || []).map((attempt) => ({
            date: attempt.completedAt
              ? new Date(attempt.completedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })
              : "Assessment",
            timestamp: attempt.completedAt
              ? new Date(attempt.completedAt).getTime()
              : 0,
            score: attempt.score,
            skill: skill.name,
          })),
        )
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-12),
    [list],
  );

  async function addSkill() {
    if (!name.trim()) return;

    if (targetPercent < 0 || targetPercent > 100) {
      push("Target level must be between 0 and 100", "error");
      return;
    }

    try {
      await apiRequest("/employees/me/skills", {
        method: "POST",
        body: {
          name: name.trim(),
          category,
          startingLevel,
          targetPercent: Number(targetPercent),
        },
      });
      setName("");
      setCategory("Programming & Development");
      setStartingLevel("Beginner");
      setTargetPercent(80);
      setOpen(false);
      await reload();
      push("Skill added to your profile");
    } catch (err) {
      push(err.message, "error");
    }
  }

  return (
    <PageContainer
      title="My Skills"
      actions={
        <>
          <div className="w-full sm:w-64">
            <SearchBar value={q} onChange={setQ} placeholder="Search skills" />
          </div>
          <Button onClick={() => setOpen(true)}>Add Skill</Button>
        </>
      }
    >
      {loading ? <Loading label="Loading skills..." /> : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          Could not load your skill progress. {error}
        </p>
      ) : null}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${
              tab === c
                ? "border-primary bg-indigo-50 text-primary"
                : "border-line bg-white text-slate-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm lg:col-span-2">
          {filtered.length ? (
            <table className="min-w-160 w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Skill</th>
                  <th className="px-4 py-3">Current Level</th>
                  <th className="px-4 py-3">Target Level</th>
                  <th className="px-4 py-3">Gap</th>
                  <th className="px-4 py-3">Lectures</th>
                  <th className="px-4 py-3">Latest assessment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Next step</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <Fragment key={s.id}>
                    <tr className="border-t border-line">
                      <td className="px-4 py-3 font-medium text-navy">
                        {s.name}
                        <span className="mt-1 block text-[11px] font-normal text-muted">
                          Self-reported start: {s.startingLevel || "Beginner"} ·
                          Unlocked:{" "}
                          {s.unlockedLevel || s.startingLevel || "Beginner"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar value={s.currentLevel} />
                        <span className="text-[11px] text-muted">
                          {s.currentLevel}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar
                          value={s.targetLevel}
                          barClassName="bg-purple"
                        />
                        <span className="text-[11px] text-muted">
                          {s.targetLevel}%
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.gap}%</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.completedLectures || 0} / {s.totalLectures || 0}
                        <span className="ml-1 text-xs text-muted">
                          ({s.lectureCompletionPercent || 0}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.latestAssessmentScore == null ? (
                          <span className="text-muted">No result</span>
                        ) : (
                          <>
                            <span>{s.latestAssessmentScore}%</span>
                            <span className="block text-xs text-muted">
                              {s.latestAssessmentDate
                                ? new Date(
                                    s.latestAssessmentDate,
                                  ).toLocaleDateString()
                                : ""}
                              {s.assessmentChange != null
                                ? ` · ${s.assessmentChange > 0 ? "+" : ""}${s.assessmentChange} pts`
                                : ""}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={s.status} />
                        {s.allLevelsPassed ? (
                          <span className="mt-1 block">
                            <Badge status="Passed">All Levels Passed</Badge>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          className="text-xs font-semibold text-primary hover:underline"
                          to={
                            s.totalLectures > s.completedLectures
                              ? "/learning-path"
                              : "/assessment"
                          }
                        >
                          {s.totalLectures > s.completedLectures
                            ? "Continue learning"
                            : "Take assessment"}
                        </Link>
                      </td>
                    </tr>
                    <tr className="border-t border-line bg-slate-50/70">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          {(s.masteryLevels || []).map((stage) => (
                            <div
                              key={stage.level}
                              className="rounded-lg border border-line bg-white p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-navy">
                                  {stage.level}
                                </span>
                                <Badge status={stage.status} />
                              </div>
                              <p className="mt-2 text-[11px] text-muted">
                                Lectures {stage.completedLectures}/
                                {stage.totalLectures} ·{" "}
                                {stage.latestAssessment
                                  ? `Latest score ${stage.latestAssessment.score}%`
                                  : `${stage.attemptCount} attempts`}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-3">
                                {stage.status !== "Self-reported" ? (
                                  <Link
                                    className="text-xs font-semibold text-primary hover:underline"
                                    to={`/assessment?skillId=${encodeURIComponent(s.skillId)}&level=${encodeURIComponent(stage.level)}`}
                                  >
                                    {stage.status === "Locked"
                                      ? "View locked assessment"
                                      : stage.status === "Passed"
                                        ? "Review assessment"
                                        : "Take assessment"}
                                  </Link>
                                ) : null}
                                <Link
                                  className="text-xs font-semibold text-primary hover:underline"
                                  to={`/youtube-learning?skill=${encodeURIComponent(s.name)}&difficulty=${encodeURIComponent(stage.level)}`}
                                >
                                  View lectures
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No skills found"
              description="Add a skill or complete a baseline assessment to start tracking learning progress."
              action={
                <Link
                  to="/assessment"
                  className="text-sm font-semibold text-primary"
                >
                  Take an assessment
                </Link>
              }
            />
          )}
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <h3 className="text-[15px] font-semibold text-navy">
            Skill Category Distribution
          </h3>
          <div className="h-65">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <Radar
                  dataKey="A"
                  stroke="#304FFE"
                  fill="#304FFE"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary
          label="Total Skills"
          value={summary.totalSkills ?? list.length}
        />
        <Summary
          label="Average Proficiency"
          value={`${summary.averageProficiency ?? 0}%`}
          className="text-emerald-600"
        />
        <Summary
          label="Critical Skill Gaps"
          value={summary.criticalGaps ?? 0}
          className="text-primary"
        />
        <Summary
          label="Skills at Target"
          value={summary.skillsAtTarget ?? 0}
          className="text-orange-600"
        />
      </div>
      {prioritySkill ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Recommended next step
            </p>
            <h3 className="mt-1 font-semibold text-navy">
              Focus on {prioritySkill.name}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {prioritySkill.latestAssessmentScore != null &&
              prioritySkill.latestAssessmentScore < 60
                ? `Your latest ${prioritySkill.latestAssessmentScore}% score suggests reviewing this skill.`
                : prioritySkill.totalLectures > prioritySkill.completedLectures
                  ? `${prioritySkill.totalLectures - prioritySkill.completedLectures} assigned lesson${prioritySkill.totalLectures - prioritySkill.completedLectures === 1 ? "" : "s"} remain.`
                  : "Take an assessment to measure your current proficiency."}
            </p>
          </div>
          <Link
            to={
              prioritySkill.totalLectures > prioritySkill.completedLectures
                ? "/learning-path"
                : "/assessment"
            }
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {prioritySkill.totalLectures > prioritySkill.completedLectures
              ? "Continue learning"
              : "Browse assessments"}
          </Link>
        </section>
      ) : null}
      <section className="rounded-xl border border-line bg-white p-4 shadow-sm">
        <h3 className="text-[15px] font-semibold text-navy">
          Assessment score trend
        </h3>
        {trend.length ? (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value, _name, item) => [
                    `${value}%`,
                    item.payload.skill,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#304FFE"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            title="No assessment trend yet"
            description="Complete an assessment to see your demonstrated skill scores over time."
            action={
              <Link
                to="/assessment"
                className="text-sm font-semibold text-primary"
              >
                Browse assessments
              </Link>
            }
          />
        )}
      </section>
      <Modal
        open={open}
        title="Add Skill"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addSkill}>Save</Button>
          </>
        }
      >
        <label className="block text-xs font-semibold">
          Skill name
          <input
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block text-xs font-semibold">
          Category
          <select
            className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Programming & Development">
              Programming & Development
            </option>
            <option value="AI & Data Science">AI & Data Science</option>
            <option value="Database & Cloud">Database & Cloud</option>
            <option value="Communication & Soft skills">
              Communication & Soft skills
            </option>
            <option value="Design & Creativity">Design & Creativity</option>
            <option value="Cybersecurity & Network">
              Cybersecurity & Network
            </option>
            <option value="Academic & Core Computer Skills">
              Academic & Core Computer Skills
            </option>
          </select>
        </label>
        <label className="block text-xs font-semibold">
          Self-reported starting level
          <select
            className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
            value={startingLevel}
            onChange={(e) => setStartingLevel(e.target.value)}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>

        {/* Target Level */}
        <label className="block text-xs font-semibold">
          Target Level (%)
          <input
            type="number"
            min="0"
            max="100"
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm"
            value={targetPercent}
            onChange={(e) => setTargetPercent(Number(e.target.value))}
            placeholder="0 - 100"
          />
        </label>
      </Modal>
    </PageContainer>
  );
}

function Summary({ label, value, className = "" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}
