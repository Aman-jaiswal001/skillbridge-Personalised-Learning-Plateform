import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { apiRequest } from "../../api/client";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import PageContainer from "../../components/common/PageContainer";
import { useToast } from "../../context/ToastContext";
import { useApiData } from "../../hooks/useApiData";
import { Link } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";

export default function LearningPath() {
  const { push } = useToast();
  const {
    data: learningPath,
    loading,
    reload,
  } = useApiData("/learning-path", {
    initialData: { stages: [], overallProgress: 0 },
  });
  const {
    data: videoItems = [],
    loading: videosLoading,
    reload: reloadVideos,
  } = useApiData("/youtube-learning/items", { initialData: [] });
  const { data: quizPerformance } = useApiData("/quiz/performance", {
    initialData: { recentAttempts: [] },
  });
  const latestQuizByItem = new Map(
    (quizPerformance?.recentAttempts || [])
      .filter((attempt) => attempt.youtubeLearningItemId)
      .map((attempt) => [String(attempt.youtubeLearningItemId), attempt]),
  );
  const progress = learningPath?.overallProgress ?? 0;
  const donut = [
    { name: "Done", value: progress },
    { name: "Left", value: 100 - progress },
  ];

  async function refresh() {
    try {
      await apiRequest("/learning-path/refresh", { method: "POST" });
      await reload();
      push("Learning path refreshed");
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function removeVideo(item) {
    if (
      !window.confirm(
        `Remove “${item.resource?.title}” from your learning path?`,
      )
    )
      return;
    try {
      await apiRequest(`/youtube-learning/items/${item._id}`, {
        method: "DELETE",
      });
      await reloadVideos();
      push("Video removed from your learning path");
    } catch (err) {
      push(err.message, "error");
    }
  }

  return (
    <PageContainer
      title="My Learning Path"
      subtitle={
        learningPath?.learningGoal || "A personalized roadmap for your growth"
      }
      actions={<Button onClick={refresh}>Refresh</Button>}
    >
      {loading ? <Loading label="Loading learning path..." /> : null}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">
          YouTube video lessons
        </h2>
        {videosLoading ? <Loading label="Loading video lessons..." /> : null}
        {!videosLoading && videoItems.length ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {videoItems.map((item) => (
              <article
                key={item._id}
                className="min-w-0 overflow-hidden rounded-xl border border-line bg-white shadow-sm"
              >
                <Link
                  to={`/youtube-learning/items/${item._id}`}
                  aria-label={`Resume ${item.resource?.title}`}
                >
                  <img
                    src={item.resource?.thumbnailUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                </Link>
                <div className="space-y-2 p-3">
                  <Link
                    to={`/youtube-learning/items/${item._id}`}
                    className="font-semibold text-navy hover:text-primary"
                  >
                    {item.resource?.title}
                  </Link>
                  <p className="text-xs text-muted">
                    {item.resource?.category} · {item.resource?.difficulty}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge status={item.status} />
                    <span className="text-[11px] text-muted">
                      {item.lastAccessedAt
                        ? `Last opened ${new Date(item.lastAccessedAt).toLocaleDateString()}`
                        : "Not opened yet"}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {latestQuizByItem.has(String(item._id))
                      ? `Latest quiz: ${latestQuizByItem.get(String(item._id)).percentage}%`
                      : "Quiz Pending"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/youtube-learning/items/${item._id}`}
                      className="flex-1"
                    >
                      <Button className="w-full" variant="secondary">
                        {item.status === "Completed" ? "Review" : "Resume"}
                      </Button>
                    </Link>
                    <Link to={`/youtube-learning/items/${item._id}/quiz`}>
                      <Button variant="secondary">Take Quiz</Button>
                    </Link>
                    <Button variant="ghost" onClick={() => removeVideo(item)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {!videosLoading && !videoItems.length ? (
          <EmptyState
            title="No video lessons yet"
            description="Start a video lesson from Courses & Resources and it will appear here."
          />
        ) : null}
      </section>
      {learningPath?.skillGaps?.length ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Focus skills:{" "}
          {learningPath.skillGaps
            .map((skill) => skill.name || skill)
            .join(", ")}
        </p>
      ) : null}
    </PageContainer>
  );
}
