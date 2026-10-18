import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../api/client";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Loading from "../../components/common/Loading";
import PageContainer from "../../components/common/PageContainer";
import { useToast } from "../../context/ToastContext";
import { useApiData } from "../../hooks/useApiData";

export default function YouTubeCatalog() {
  const [searchParams] = useSearchParams()
  const initialSkill = searchParams.get("skill") || ""
  const initialDifficulty = searchParams.get("difficulty") || ""
  const initialFilters = new URLSearchParams()
  if (initialSkill) initialFilters.set("skill", initialSkill)
  if (initialDifficulty) initialFilters.set("difficulty", initialDifficulty)
  const {
    data = [],
    loading,
    error,
    reload,
  } = useApiData(`/youtube-learning/resources${initialFilters.size ? `?${initialFilters}` : ""}`, { initialData: [] });
  const { data: items = [], reload: reloadItems } = useApiData(
    "/youtube-learning/items",
    { initialData: [] },
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [skill, setSkill] = useState(initialSkill);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [busy, setBusy] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();
  const allResources = searchResults ?? data;
  const categories = [
    ...new Set(data.map((resource) => resource.category).filter(Boolean)),
  ].sort();
  const skills = [
    ...new Set(data.flatMap((resource) => resource.skills || [])),
  ].sort();
  const existing = useMemo(
    () =>
      new Map(
        items
          .filter((item) => item.resourceId)
          .map((item) => [String(item.resourceId), item]),
      ),
    [items],
  );
  const filtered = allResources.filter((resource) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        `${resource.title} ${resource.description} ${resource.category}`
          .toLowerCase()
          .includes(q)) &&
      (!category || resource.category === category) &&
      (!skill || resource.skills?.includes(skill)) &&
      (!difficulty || resource.difficulty === difficulty)
    );
  });

  async function searchResources(event) {
    event.preventDefault();
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      if (skill) params.set("skill", skill);
      if (difficulty) params.set("difficulty", difficulty);
      const payload = await apiRequest(
        `/youtube-learning/resources?${params.toString()}`,
      );
      setSearchResults(payload.data || []);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setSearching(false);
    }
  }

  async function start(resource) {
    setBusy(resource._id);
    try {
      const payload = await apiRequest(
        `/youtube-learning/items/${resource._id}`,
        { method: "POST" },
      );
      const item = payload.data;
      await reloadItems();
      if (payload.existing)
        push("This video is already in your learning path. Resuming it.");
      else push("Added to your learning path");
      navigate(`/youtube-learning/items/${item._id}`);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <PageContainer
      title="Courses & Resources"
      subtitle="Learn with curated video lessons from YouTube"
      actions={
        <Button variant="secondary" onClick={reload}>
          Refresh
        </Button>
      }
    >
      <form
        onSubmit={searchResources}
        className="grid gap-3 rounded-xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input
          aria-label="Search videos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search videos"
          className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm"
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Filter by skill"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">All skills</option>
          {skills.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Filter by difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="min-w-0 rounded-lg border border-line px-3 py-2 text-sm"
        >
          <option value="">All levels</option>
          {["Beginner", "Intermediate", "Advanced"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <Button type="submit" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>
      {loading || searching ? (
        <Loading
          label={searching ? "Searching videos..." : "Loading videos..."}
        />
      ) : null}
      {error ? (
        <EmptyState
          title="Couldn't load videos"
          description={error}
          action={
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
          }
        />
      ) : null}
      {!loading && !error && filtered.length ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((video) => {
            const item = existing.get(String(video._id));
            return (
              <article
                key={video._id}
                className="min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm"
              >
                <img
                  src={video.thumbnailUrl}
                  alt={`Thumbnail for ${video.title}`}
                  className="aspect-video w-full bg-slate-100 object-cover"
                  loading="lazy"
                />
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{video.difficulty}</Badge>
                    {video.locked ? <Badge status="Locked">{video.requiresEnrollment ? "Add skill to unlock" : `Locked · ${video.unlockedLevel || "Beginner"} unlocked`}</Badge> : null}
                    <Badge>{video.duration || "Video lesson"}</Badge>
                    <Badge>{video.category}</Badge>
                  </div>
                  <div>
                    <h2 className="font-semibold text-navy">{video.title}</h2>
                    <p className="mt-1 line-clamp-3 text-sm text-muted">
                      {video.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(video.skills || []).map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    disabled={busy === video._id || video.locked}
                    onClick={() => start(video)}
                  >
                    {busy === video._id
                      ? "Opening..."
                      : item
                        ? "Resume Learning"
                        : "Start Learning"}
                  </Button>
                  {video.locked && video.requiresEnrollment ? <Link to="/skills" className="block text-center text-xs font-semibold text-primary">Add this skill in My Skills</Link> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {!loading && !searching && !error && !filtered.length ? (
        <EmptyState
          title="No videos found"
          description={
            data.length
              ? "Try changing the search or filters."
              : "New published learning videos will appear here."
          }
        />
      ) : null}
    </PageContainer>
  );
}
