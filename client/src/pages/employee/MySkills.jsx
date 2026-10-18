import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
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
  const [currentPercent, setCurrentPercent] = useState(20);
  const [targetPercent, setTargetPercent] = useState(80);
  const { push } = useToast();
  const { data, loading, reload } = useApiData("/employees/me/skills", {
    initialData: { skills: [], summary: {}, radar: [] },
  });

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

  async function addSkill() {
    if (!name.trim()) return;

    if (currentPercent < 0 || currentPercent > 100) {
      push("Current level must be between 0 and 100", "error");
      return;
    }

    if (targetPercent < 0 || targetPercent > 100) {
      push("Target level must be between 0 and 100", "error");
      return;
    }

    if (currentPercent > targetPercent) {
      push("Current level cannot be greater than target level", "error");
      return;
    }
    try {
      await apiRequest("/employees/me/skills", {
        method: "POST",
        body: {
          name: name.trim(),
          category,
          currentPercent: Number(currentPercent),
          targetPercent: Number(targetPercent),
        },
      });
      setName("");
      setCategory("Programming & Development");
      setCurrentPercent(20);
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
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium text-navy">
                      {s.name}
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
                    <td className="px-4 py-3">
                      <Badge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No skills found"
              description="Add your first skill to start gap tracking."
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
          label="Advanced"
          value={summary.advanced ?? 0}
          className="text-emerald-600"
        />
        <Summary
          label="Intermediate"
          value={summary.intermediate ?? 0}
          className="text-primary"
        />
        <Summary
          label="Beginner"
          value={summary.beginner ?? 0}
          className="text-orange-600"
        />
      </div>
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
            <option value="Programming & Development">Programming & Development</option>
            <option value="AI & Data Science">AI & Data Science</option>
            <option value="Database & Cloud">Database & Cloud</option>
            <option value="Communication & Soft skills">Communication & Soft skills</option>
            <option value="Design & Creativity">Design & Creativity</option>
            <option value="Cybersecurity & Network">Cybersecurity & Network</option>
            <option value="Academic & Core Computer Skills">Academic & Core Computer Skills</option>
          </select>
        </label>
        {/* Current Level */}
        <label className="block text-xs font-semibold">
          Current Level (%)
          <input
            type="number"
            min="0"
            max="100"
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm"
            value={currentPercent}
            onChange={(e) => setCurrentPercent(Number(e.target.value))}
            placeholder="0 - 100"
          />
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
