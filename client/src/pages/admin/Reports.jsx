import { useState } from "react";
import { apiRequest, extractData } from "../../api/client";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import Modal from "../../components/common/Modal";
import PageContainer from "../../components/common/PageContainer";
import { useToast } from "../../context/ToastContext";

const reportTypes = [
  {
    id: "skill-gaps",
    title: "Skill Gap Report",
    description: "Organization-wide competency gaps and priority skills.",
  },
  {
    id: "training-effectiveness",
    title: "Training Effectiveness",
    description: "Course progress, completion, and certificate impact.",
  },
  {
    id: "department",
    title: "Department Report",
    description: "Competency summary for a department.",
  },
  {
    id: "employee",
    title: "Employee Report",
    description: "Detailed report for a specific employee ID.",
  },
];

export default function Reports() {
  const [format, setFormat] = useState("JSON");
  const [selected, setSelected] = useState("skill-gaps");
  const [parameter, setParameter] = useState("National Statistics Office");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { push } = useToast();

  async function generate() {
    setLoading(true);
    try {
      const path =
        selected === "employee"
          ? `/reports/employee/${parameter}`
          : selected === "department"
            ? `/reports/department/${encodeURIComponent(parameter)}`
            : `/reports/${selected}`;
      const payload = await apiRequest(path);
      setResult(extractData(payload));
      push(`${format} report generated`);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer title="Reports">
      <div className="grid gap-3 sm:grid-cols-2">
        {reportTypes.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={`rounded-xl border p-4 text-left ${selected === r.id ? "border-primary bg-indigo-50" : "border-line bg-white"}`}
          >
            <p className="text-sm font-semibold">{r.title}</p>
            <p className="mt-1 text-xs text-muted">{r.description}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Format</span>
        {["JSON", "PDF", "Excel"].map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`rounded-lg border px-3 py-2 text-sm ${format === f ? "border-primary bg-indigo-50 text-primary" : "border-line bg-white"}`}
          >
            {f}
          </button>
        ))}
        {selected === "employee" || selected === "department" ? (
          <input
            className="h-10 rounded-lg border border-line px-3 text-sm"
            placeholder={
              selected === "employee" ? "Employee Mongo ID" : "Department"
            }
            value={parameter}
            onChange={(e) => setParameter(e.target.value)}
          />
        ) : null}
        <Button
          onClick={generate}
          disabled={
            loading ||
            ((selected === "employee" || selected === "department") &&
              !parameter.trim())
          }
        >
          Generate Report
        </Button>
      </div>
      {loading ? <Loading label="Generating report..." /> : null}
      <Modal
        open={Boolean(result)}
        title="Report ready"
        onClose={() => setResult(null)}
      >
        <p className="mb-3 text-sm text-slate-600">
          The backend generated this{" "}
          {reportTypes.find((r) => r.id === selected)?.title.toLowerCase()}.
        </p>
        <pre className="max-h-[360px] overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
          {JSON.stringify(result, null, 2)}
        </pre>
        <div className="mt-4">
          <Button onClick={() => setResult(null)}>Close</Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
