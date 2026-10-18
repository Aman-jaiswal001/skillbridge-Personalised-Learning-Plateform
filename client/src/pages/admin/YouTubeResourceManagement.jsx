import { useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import PageContainer from "../../components/common/PageContainer";
import { useToast } from "../../context/ToastContext";
import { useApiData } from "../../hooks/useApiData";

const blank = {
  title: "",
  description: "",
  youtubeUrl: "",
  instructor: "",
  category: "",
  skills: "",
  subtopics: "",
  difficulty: "Beginner",
  duration: "",
  language: "Hindi",
  prerequisites: "",
  objectives: "",
  isPublished: false,
};
const listFields = ["skills", "subtopics", "prerequisites", "objectives"];

function parseVideoId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be")
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    else if (
      [
        "youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtube-nocookie.com",
      ].includes(host)
    ) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (/^\/(embed|shorts|live)\//.test(url.pathname))
        id = url.pathname.split("/")[2] || "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

export default function YouTubeResourceManagement() {
  const {
    data = [],
    loading,
    error,
    reload,
  } = useApiData("/youtube-learning/resources?admin=true", { initialData: [] });
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const { push } = useToast();
  const videoId = useMemo(
    () => parseVideoId(form.youtubeUrl),
    [form.youtubeUrl],
  );
  const shown = data.filter((resource) =>
    `${resource.title} ${resource.category} ${resource.skills?.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function edit(resource) {
    setEditing(resource._id);
    setForm({
      ...blank,
      ...resource,
      skills: resource.skills?.join(", ") || "",
      subtopics: resource.subtopics?.join(", ") || "",
      prerequisites: resource.prerequisites?.join(", ") || "",
      objectives: resource.objectives?.join("\n") || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() {
    setEditing("");
    setForm(blank);
  }
  async function submit(event) {
    event.preventDefault();
    if (!videoId) {
      push("Enter a valid YouTube watch, youtu.be, or embed URL.", "error");
      return;
    }
    setSaving(true);
    const body = {
      ...form,
      ...Object.fromEntries(
        listFields.map((key) => [
          key,
          form[key]
            .split(key === "objectives" ? "\n" : ",")
            .map((value) => value.trim())
            .filter(Boolean),
        ]),
      ),
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
    try {
      await apiRequest(
        editing
          ? `/youtube-learning/resources/${editing}`
          : "/youtube-learning/resources",
        { method: editing ? "PUT" : "POST", body },
      );
      push(editing ? "Video resource updated" : "Video resource created");
      reset();
      await reload();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setSaving(false);
    }
  }
  async function toggle(resource) {
    try {
      await apiRequest(`/youtube-learning/resources/${resource._id}`, {
        method: "PUT",
        body: {
          ...resource,
          youtubeUrl: resource.youtubeUrl,
          isPublished: !resource.isPublished,
        },
      });
      push(resource.isPublished ? "Video unpublished" : "Video published");
      await reload();
    } catch (err) {
      push(err.message, "error");
    }
  }
  async function remove(resource) {
    if (
      !window.confirm(
        `Delete “${resource.title}”? Existing student progress will be preserved.`,
      )
    )
      return;
    try {
      await apiRequest(`/youtube-learning/resources/${resource._id}`, {
        method: "DELETE",
      });
      push("Video resource deleted");
      await reload();
    } catch (err) {
      push(err.message, "error");
    }
  }

  return (
    <PageContainer
      title="YouTube Learning"
      subtitle="Create and publish curated video resources for learners"
    >
      <form
        onSubmit={submit}
        className="grid min-w-0 gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2"
      >
        <label className="text-sm font-medium">
          Title
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => change("title", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          YouTube URL
          <input
            required
            type="url"
            value={form.youtubeUrl}
            onChange={(e) => change("youtubeUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
          {form.youtubeUrl && !videoId ? (
            <span className="text-xs text-red-600">
              Enter a supported URL containing a valid video ID.
            </span>
          ) : null}
        </label>
        <label className="text-sm font-medium">
          Course / category
          <input
            required
            value={form.category}
            onChange={(e) => change("category", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Instructor / channel
          <input
            value={form.instructor}
            onChange={(e) => change("instructor", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Learning level
          <select
            value={form.difficulty}
            onChange={(e) => change("difficulty", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          >
            {["Beginner", "Intermediate", "Advanced"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Estimated duration
          <input
            value={form.duration}
            onChange={(e) => change("duration", e.target.value)}
            placeholder="e.g. 25 min"
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Language
          <input
            value={form.language}
            onChange={(e) => change("language", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Skill tags (comma separated)
          <input
            value={form.skills}
            onChange={(e) => change("skills", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Description
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => change("description", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Subtopics (comma separated)
          <textarea
            rows="2"
            value={form.subtopics}
            onChange={(e) => change("subtopics", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Prerequisites (comma separated)
          <textarea
            rows="2"
            value={form.prerequisites}
            onChange={(e) => change("prerequisites", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Learning objectives (one per line)
          <textarea
            rows="3"
            value={form.objectives}
            onChange={(e) => change("objectives", e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal"
          />
        </label>
        {videoId ? (
          <div className="flex items-center gap-3 sm:col-span-2">
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt="Video thumbnail preview"
              className="w-32 rounded-lg"
            />
            <span className="text-xs text-muted">
              YouTube thumbnail preview
            </span>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => change("isPublished", e.target.checked)}
          />
          Publish for students
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Create Video"}
          </Button>
          {editing ? (
            <Button type="button" variant="secondary" onClick={reset}>
              Cancel Edit
            </Button>
          ) : null}
        </div>
      </form>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-navy">Video resources</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search managed videos"
          aria-label="Search managed videos"
          className="rounded-lg border border-line px-3 py-2 text-sm"
        />
      </div>
      {loading ? <Loading label="Loading video resources..." /> : null}
      {error ? (
        <EmptyState
          title="Couldn't load resources"
          description={error}
          action={
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
          }
        />
      ) : null}
      {!loading && !error && shown.length ? (
        <div className="space-y-3">
          {shown.map((resource) => (
            <article
              key={resource._id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-3 sm:flex-row sm:items-center"
            >
              <img
                src={resource.thumbnailUrl}
                alt=""
                className="aspect-video w-full rounded-lg object-cover sm:w-36"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-navy">
                  {resource.title}
                </h3>
                <p className="text-sm text-muted">
                  {resource.category} · {resource.difficulty}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge
                    status={resource.isPublished ? "Completed" : "Not Started"}
                  >
                    {resource.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <Badge>{resource.videoId}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => edit(resource)}>
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => toggle(resource)}>
                  {resource.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="danger" onClick={() => remove(resource)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {!loading && !error && !shown.length ? (
        <EmptyState
          title="No video resources"
          description={
            search
              ? "No resources match this search."
              : "Add your first YouTube learning resource above."
          }
        />
      ) : null}
    </PageContainer>
  );
}
