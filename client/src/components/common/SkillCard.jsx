import Badge from './Badge'
import ProgressBar from './ProgressBar'

export default function SkillCard({ skill }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-navy">{skill.name}</h3>
        <Badge status={skill.status} />
      </div>
      <p className="mb-3 text-xs text-muted">{skill.category}</p>
      <div className="space-y-2 text-xs">
        <div>
          <div className="mb-1 flex justify-between text-muted">
            <span>Current</span>
            <span>{skill.currentLevel}%</span>
          </div>
          <ProgressBar value={skill.currentLevel} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-muted">
            <span>Target</span>
            <span>{skill.targetLevel}%</span>
          </div>
          <ProgressBar value={skill.targetLevel} barClassName="bg-purple" />
        </div>
      </div>
    </div>
  )
}
