import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from './Badge'
import Button from './Button'
import courseImg from '../../assets/images/course-placeholder.png'

export default function CourseCard({ course, ctaLabel = 'Start Learning' }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <img src={courseImg} alt="" className="h-32 w-full object-cover" />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge>{course.level}</Badge>
          <span className="text-[11px] text-muted">{course.duration}</span>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug text-navy">{course.title}</h3>
        <p className="mt-1 text-xs text-muted">{course.provider}</p>
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
          <Star size={12} fill="currentColor" /> {course.rating}
        </div>
        {course.reason ? <p className="mt-2 text-xs leading-relaxed text-slate-600">{course.reason}</p> : null}
        <div className="mt-auto pt-3">
          <Link to={`/courses/${course.id}`}>
            <Button className="w-full">{ctaLabel}</Button>
          </Link>
        </div>
      </div>
    </article>
  )
}
