import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '../api/students'
import { templateApi } from '../api/template'
import { gradesApi, type GradeInput } from '../api/grades'
import { classroomsApi } from '../api/classrooms'
import { exportApi } from '../api/export'
import { zoneFor } from '../lib/zone'
import Button from '../components/ui/Button'

import type { Category, EvaluationFactor } from '../types/models'

export default function StudentDetailPage() {
  const { id = '' } = useParams()

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id),
    enabled: !!id,
  })

  const { data: classroom } = useQuery({
    queryKey: ['classroom', student?.classroom_id],
    queryFn: () => classroomsApi.get(student!.classroom_id),
    enabled: !!student?.classroom_id,
  })

  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!student) return
    setExporting(true)
    try {
      await exportApi.student(student.id, `${student.full_name}.xlsx`)
    } catch {
      alert('İxrac edilə bilmədi')
    } finally {
      setExporting(false)
    }
  }

  if (studentLoading) return <p className="text-slate-500">Yüklənir…</p>
  if (!student) return <p className="text-red-600">Şagird tapılmadı.</p>

  return (
    <div>
      <div className="mb-10">
        {classroom && (
          <Link
            to={`/classrooms/${classroom.id}`}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 mb-3"
          >
            ← {classroom.name}
          </Link>
        )}
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-brand-600 mb-2">
              Şagird
            </p>
            <h1 className="font-display text-4xl">{student.full_name}</h1>
            {student.parent_email && (
              <p className="text-slate-500 mt-2">{student.parent_email}</p>
            )}
            {student.notes && (
              <p className="text-slate-600 mt-3 italic">{student.notes}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Link to={`/students/${student.id}/review`}>
              <Button variant="secondary">AI hesabat</Button>
            </Link>
            <Button variant="secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? 'İxrac edilir…' : 'Excel ixrac et'}
            </Button>
          </div>
        </div>
      </div>

      <GradingGrid studentId={student.id} classroomId={student.classroom_id} />
    </div>
  )
}

// ============ Grading grid ============

function GradingGrid({
  studentId,
  classroomId,
}: {
  studentId: string
  classroomId: string
}) {
  const qc = useQueryClient()

  const { data: template = [] } = useQuery({
    queryKey: ['template'],
    queryFn: templateApi.get,
  })

  const { data: existingGrades = [] } = useQuery({
    queryKey: ['student-grades', studentId],
    queryFn: () => gradesApi.studentGrades(studentId),
  })

  // local pending state — overrides server values until saved
  const [pendingScores, setPendingScores] = useState<Record<string, number>>({})

  const savedScores = useMemo(() => {
    const map: Record<string, number> = {}
    existingGrades.forEach((g) => {
      map[g.factor_id] = g.score
    })
    return map
  }, [existingGrades])

  const currentScores: Record<string, number> = {
    ...savedScores,
    ...pendingScores,
  }

  const isDirty = useMemo(() => {
    return Object.entries(pendingScores).some(
      ([fid, score]) => savedScores[fid] !== score,
    )
  }, [pendingScores, savedScores])

  const total = Object.values(currentScores).reduce((a, b) => a + b, 0)
  const gradedCount = Object.keys(currentScores).length
  const totalFactors = template.reduce(
    (acc, cat) => acc + (cat.factors?.length || 0),
    0,
  )
  const zone = zoneFor(total, gradedCount > 0)

  const saveMutation = useMutation({
    mutationFn: (scores: Record<string, number>) => {
      const payload: GradeInput[] = Object.entries(scores).map(
        ([factor_id, score]) => ({
          factor_id,
          score,
        }),
      )
      return gradesApi.upsertStudentGrades(studentId, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-grades', studentId] })
      qc.invalidateQueries({ queryKey: ['classroom-summary', classroomId] })
      setPendingScores({})
    },
  })

  function setScore(factorId: string, score: number) {
    setPendingScores((prev) => ({ ...prev, [factorId]: score }))
  }

  function handleSave() {
    saveMutation.mutate(currentScores)
  }

  return (
    <div>
      {/* sticky summary bar */}
      <div className="sticky top-16 z-10 -mx-6 px-6 py-4 bg-paper/90 backdrop-blur-md border-b border-slate-200 mb-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Ümumi bal
              </div>
              <div className="font-display text-3xl leading-tight">
                {total}
                <span className="text-slate-400 text-lg">
                  {' '}
                  / {totalFactors * 5}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Kateqoriya
              </div>
              <div className="mt-1">
                {zone ? (
                  <span
                    className={`text-sm px-2.5 py-1 rounded-full ${zone.badge}`}
                  >
                    {zone.label}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Tamamlanma
              </div>
              <div className="text-sm text-slate-700 mt-1">
                {gradedCount} / {totalFactors}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                Yadda saxlanmayıb
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!isDirty || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Yadda saxlanılır…' : 'Yadda saxla'}
            </Button>
          </div>
        </div>
      </div>

      {/* categories */}
      <div className="space-y-10">
        {template.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            scores={currentScores}
            onScoreChange={setScore}
          />
        ))}
      </div>
    </div>
  )
}

function CategorySection({
  category,
  scores,
  onScoreChange,
}: {
  category: Category
  scores: Record<string, number>
  onScoreChange: (factorId: string, score: number) => void
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-display text-2xl">{category.name}</h2>
        <span className="text-xs uppercase tracking-wider text-slate-400">
          {category.factors?.length ?? 0} meyar
        </span>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {category.factors?.map((factor, i) => (
          <FactorRow
            key={factor.id}
            factor={factor}
            isLast={i === (category.factors?.length ?? 0) - 1}
            score={scores[factor.id]}
            onScoreChange={(s) => onScoreChange(factor.id, s)}
          />
        ))}
      </div>
    </section>
  )
}

function FactorRow({
  factor,
  score,
  onScoreChange,
  isLast,
}: {
  factor: EvaluationFactor
  score?: number
  onScoreChange: (score: number) => void
  isLast: boolean
}) {
  const descriptions: Record<number, string> = {
    2: factor.description_2,
    3: factor.description_3,
    4: factor.description_4,
    5: factor.description_5,
  }

  return (
    <div
      className={`px-6 py-4 flex items-center justify-between gap-6 ${!isLast ? 'border-b border-slate-100' : ''
        }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900">{factor.name}</div>
        <div className="text-sm text-slate-500 mt-0.5 min-h-5">
          {score ? (
            descriptions[score]
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {[2, 3, 4, 5].map((s) => {
          const selected = score === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => onScoreChange(s)}
              title={descriptions[s]}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${selected
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              {s}
            </button>
          )
        })}
      </div>
    </div>
  )
}