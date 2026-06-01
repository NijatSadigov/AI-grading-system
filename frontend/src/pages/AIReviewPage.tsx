import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '../api/students'
import { classroomsApi } from '../api/classrooms'
import {
  reviewsApi,
  type ReviewContent,
  type ReviewResponse,
} from '../api/reviews'
import Button from '../components/ui/Button'

export default function AIReviewPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const [err, setErr] = useState<string | null>(null)

  const { data: student } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id),
    enabled: !!id,
  })

  const { data: classroom } = useQuery({
    queryKey: ['classroom', student?.classroom_id],
    queryFn: () => classroomsApi.get(student!.classroom_id),
    enabled: !!student?.classroom_id,
  })

  const {
    data: reviewData,
    isLoading,
    isError,
    error,
  } = useQuery<ReviewResponse>({
    queryKey: ['ai-review', id],
    queryFn: () => reviewsApi.get(id),
    enabled: !!id,
    retry: false,
  })

  const generateMutation = useMutation({
    mutationFn: (force: boolean) => reviewsApi.generate(id, force),
    onSuccess: (data) => {
      qc.setQueryData(['ai-review', id], data)
      setErr(null)
    },
    onError: (e: any) =>
      setErr(e?.response?.data?.error || 'Hesabat yarana bilmədi'),
  })

  const content = useMemo<ReviewContent | null>(() => {
    if (!reviewData?.review) return null
    try {
      return JSON.parse(reviewData.review.content)
    } catch {
      return null
    }
  }, [reviewData])

  const has404 = isError && (error as any)?.response?.status === 404

  function handlePrint() {
    window.print()
  }

  if (!student) return <p className="text-slate-500">Yüklənir…</p>

  return (
    <div>
      {/* action bar - hidden in print */}
      <div className="print:hidden mb-8 flex items-center justify-between">
        <Link
          to={`/students/${student.id}`}
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
        >
          ← {student.full_name}
        </Link>
        {content && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handlePrint}>
              PDF kimi yüklə
            </Button>
            <Button
              variant="secondary"
              onClick={() => generateMutation.mutate(true)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Hazırlanır…' : 'Yenidən hazırla'}
            </Button>
          </div>
        )}
      </div>

      {/* loading state */}
      {isLoading && !has404 && (
        <div className="print:hidden text-center py-20">
          <p className="text-slate-500">Hesabat yüklənir…</p>
        </div>
      )}

      {/* no review yet */}
      {has404 && !generateMutation.isPending && (
        <div className="print:hidden bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-xl mx-auto">
          <h2 className="font-display text-2xl mb-2">
            Hesabat hələ hazırlanmayıb
          </h2>
          <p className="text-slate-500 mb-6">
            Şagirdin qiymətlərinə əsasən süni intellekt valideynlər üçün
            müfəssəl bir inkişaf hesabatı hazırlayacaq. Bu, bir neçə saniyə
            çəkə bilər.
          </p>
          <Button onClick={() => generateMutation.mutate(false)}>
            Hesabatı yarat
          </Button>
          {err && <p className="text-sm text-red-600 mt-4">{err}</p>}
        </div>
      )}

      {/* generation in progress */}
      {generateMutation.isPending && (
        <div className="print:hidden text-center py-20">
          <p className="font-display text-2xl mb-2">
            Hesabat hazırlanır…
          </p>
          <p className="text-slate-500 max-w-md mx-auto">
            Süni intellekt qiymətləri təhlil edir və hesabatı tərtib edir. Bu,
            10-15 saniyə çəkə bilər.
          </p>
        </div>
      )}

      {/* stale banner */}
      {reviewData?.is_stale && content && (
        <div className="print:hidden bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-900">
          Qiymətlər bu hesabatdan sonra dəyişib.{' '}
          <button
            onClick={() => generateMutation.mutate(true)}
            className="underline hover:no-underline font-medium"
            disabled={generateMutation.isPending}
          >
            Yenidən hazırla
          </button>
          .
        </div>
      )}

      {err && content && (
        <div className="print:hidden bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-6 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* the actual report — this is what prints */}
      {content && reviewData?.review && (
        <article className="bg-white print:bg-white border border-slate-200 print:border-0 rounded-2xl print:rounded-none p-10 md:p-14 print:p-0 max-w-3xl mx-auto print:max-w-none">
          {/* header with logo */}
          <header className="flex items-start justify-between gap-4 pb-8 border-b border-slate-200 mb-10">
            <img
              src="/liseylogo.png"
              alt="Hədəf STEAM Liseyi"
              className="h-12 w-auto"
            />
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-brand-600">
                Şagird İnkişaf Hesabatı
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(reviewData.review.generated_at).toLocaleDateString(
                  'az-AZ',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  },
                )}
              </p>
            </div>
          </header>

          {/* student info */}
          <div className="mb-12">
            <h1 className="font-display text-4xl leading-tight mb-2">
              {student.full_name}
            </h1>
            <p className="text-slate-500">
              {classroom?.name}
              {classroom?.teacher && (
                <> · Müəllim: {classroom.teacher.full_name}</>
              )}
            </p>
          </div>

          {/* overall picture */}
          <section className="mb-12 break-inside-avoid">
            <h2 className="text-xs uppercase tracking-widest text-brand-600 mb-3">
              Ümumi mənzərə
            </h2>
            <p className="font-display text-xl leading-relaxed text-slate-800 italic">
              {content.overall_picture}
            </p>
          </section>

          {/* strengths */}
          {content.strengths.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xs uppercase tracking-widest text-brand-600 mb-4">
                Güclü tərəflər
              </h2>
              <div className="space-y-5">
                {content.strengths.map((s, i) => (
                  <div key={i} className="break-inside-avoid">
                    <h3 className="font-display text-lg mb-1.5 text-slate-900">
                      {s.area}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* growth areas */}
          {content.growth_areas.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xs uppercase tracking-widest text-brand-600 mb-4">
                İnkişaf sahələri
              </h2>
              <div className="space-y-5">
                {content.growth_areas.map((g, i) => (
                  <div key={i} className="break-inside-avoid">
                    <h3 className="font-display text-lg mb-1.5 text-slate-900">
                      {g.area}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {g.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* recommendations */}
          <section className="break-before-page print:break-before-page">
            <h2 className="text-xs uppercase tracking-widest text-brand-600 mb-6">
              Tövsiyələr
            </h2>

            {content.recommendations.books.length > 0 && (
              <div className="mb-8">
                <h3 className="font-display text-2xl mb-4">Kitablar</h3>
                <div className="space-y-4">
                  {content.recommendations.books.map((b, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-brand-300 pl-4 break-inside-avoid"
                    >
                      <p className="font-medium text-slate-900">
                        {b.title}
                        <span className="font-normal text-slate-500">
                          {' '}
                          · {b.author}
                        </span>
                      </p>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                        {b.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {content.recommendations.films.length > 0 && (
              <div className="mb-8">
                <h3 className="font-display text-2xl mb-4">Filmlər</h3>
                <div className="space-y-4">
                  {content.recommendations.films.map((f, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-brand-300 pl-4 break-inside-avoid"
                    >
                      <p className="font-medium text-slate-900">{f.title}</p>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                        {f.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {content.recommendations.activities.length > 0 && (
              <div>
                <h3 className="font-display text-2xl mb-4">Fəaliyyətlər</h3>
                <div className="space-y-4">
                  {content.recommendations.activities.map((a, i) => (
                    <div
                      key={i}
                      className="border-l-2 border-brand-300 pl-4 break-inside-avoid"
                    >
                      <p className="font-medium text-slate-900">{a.title}</p>
                      <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                        {a.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* footer */}
          <footer className="mt-16 pt-6 border-t border-slate-200 text-xs text-slate-400 flex items-center justify-between">
            <span>Hədəf STEAM Liseyi</span>
            <span>
              Süni intellekt vasitəsilə hazırlanıb · {reviewData.review.model_used}
            </span>
          </footer>
        </article>
      )}
    </div>
  )
}