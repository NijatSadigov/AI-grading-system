import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classroomsApi } from '../api/classrooms'
import Modal from '../components/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Yenidən köhnəyə',
  oldest: 'Köhnədən yeniyə',
  'name-asc': 'Ada görə (A–Z)',
  'name-desc': 'Ada görə (Z–A)',
}

export default function ClassroomsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')

  const { data: classrooms = [], isLoading, isError } = useQuery({
    queryKey: ['classrooms'],
    queryFn: classroomsApi.list,
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = classrooms
    if (q) {
      list = list.filter((c) => {
        const inName = c.name.toLowerCase().includes(q)
        const inTeacher = c.teacher?.full_name?.toLowerCase().includes(q) ?? false
        return inName || inTeacher
      })
    }
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return b.created_at.localeCompare(a.created_at)
        case 'oldest':
          return a.created_at.localeCompare(b.created_at)
        case 'name-asc':
          return a.name.localeCompare(b.name, 'az')
        case 'name-desc':
          return b.name.localeCompare(a.name, 'az')
      }
    })
    return sorted
  }, [classrooms, query, sort])

  const createMutation = useMutation({
    mutationFn: classroomsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classrooms'] })
      setCreateOpen(false)
      setName('')
      setErr(null)
    },
    onError: () => setErr('Sinif yaradıla bilmədi'),
  })

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim() })
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sm uppercase tracking-widest text-brand-600 mb-2">
            Siniflər
          </p>
          <h1 className="font-display text-4xl">Sinifləriniz</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Yeni sinif</Button>
      </div>

      {/* search + sort */}
      {!isLoading && classrooms.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sinif və ya müəllim adı ilə axtarın…"
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none w-full sm:w-auto border border-slate-300 rounded-lg pl-3 pr-9 py-2 text-sm bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all cursor-pointer"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              ▾
            </span>
          </div>
        </div>
      )}

      {!isLoading && classrooms.length > 0 && (
        <p className="text-xs text-slate-500 mb-4">
          {filtered.length === classrooms.length
            ? `${classrooms.length} sinif`
            : `${filtered.length} / ${classrooms.length} sinif`}
        </p>
      )}

      {isLoading && <p className="text-slate-500">Yüklənir…</p>}
      {isError && <p className="text-red-600">Sinifləri yükləmək mümkün olmadı.</p>}

      {!isLoading && classrooms.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <h3 className="font-display text-xl mb-2">Hələ sinif yoxdur</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            İlk sinifinizi yaradın və şagirdləri əlavə etməyə başlayın.
          </p>
          <Button onClick={() => setCreateOpen(true)}>İlk sinifi yarat</Button>
        </div>
      )}

      {!isLoading && classrooms.length > 0 && filtered.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <p className="text-slate-500">
            "<span className="text-slate-700">{query}</span>" üçün heç bir nəticə tapılmadı.
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/classrooms/${c.id}`}
              className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-brand-300 hover:shadow-[0_8px_30px_-12px_rgba(37,150,190,0.25)] transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display text-2xl">{c.name}</h3>
                <span className="text-xs text-slate-400">
                  {new Date(c.created_at).toLocaleDateString('az-AZ')}
                </span>
              </div>
              {c.teacher && (
                <div className="text-xs text-slate-500 mb-4">
                  Müəllim:{' '}
                  <span className="text-slate-700">{c.teacher.full_name}</span>
                </div>
              )}
              <div className="text-sm text-brand-700 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Aç <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setName('')
          setErr(null)
        }}
        title="Yeni sinif yarat"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="classroom-name"
            label="Sinfin adı"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Məs. 5A"
            autoFocus
            required
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
            >
              Ləğv et
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Yaradılır…' : 'Yarat'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}