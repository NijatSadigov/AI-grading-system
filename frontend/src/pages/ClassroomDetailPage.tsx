import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classroomsApi } from '../api/classrooms'
import { studentsApi, type StudentInput } from '../api/students'
import { gradesApi } from '../api/grades'
import { exportApi } from '../api/export'
import { zoneFor } from '../lib/zone'
import Modal from '../components/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

type AddMode = 'single' | 'bulk' | 'csv'

export default function ClassroomDetailPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const {
    data: classroom,
    isLoading: classroomLoading,
    isError: classroomError,
  } = useQuery({
    queryKey: ['classroom', id],
    queryFn: () => classroomsApi.get(id),
    enabled: !!id,
  })

  const { data: summaryData, isLoading: studentsLoading } = useQuery({
    queryKey: ['classroom-summary', id],
    queryFn: () => gradesApi.classroomSummary(id),
    enabled: !!id,
  })
  const summaries = summaryData?.summaries ?? []
  const totalFactors = summaryData?.total_factors ?? 0
  const students = summaries.map((s) => s.student)

  const [addOpen, setAddOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editClassroomOpen, setEditClassroomOpen] = useState(false)
  const [deleteClassroomOpen, setDeleteClassroomOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!classroom) return
    setExporting(true)
    try {
      await exportApi.classroom(
        classroom.id,
        `${classroom.name} - sinif hesabatı.xlsx`,
      )
    } catch {
      alert('İxrac edilə bilmədi')
    } finally {
      setExporting(false)
    }
  }

  if (classroomLoading) return <p className="text-slate-500">Yüklənir…</p>
  if (classroomError || !classroom)
    return <p className="text-red-600">Sinifə daxil olmaq mümkün deyil.</p>

  return (
    <div>
      {/* breadcrumb + header */}
      <div className="mb-10">
        <Link
          to="/classrooms"
          className="text-sm text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 mb-3"
        >
          ← Siniflər
        </Link>
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-brand-600 mb-2">
              Sinif
            </p>
            <div className="flex items-center gap-4">
              <h1 className="font-display text-4xl">{classroom.name}</h1>
              <button
                onClick={() => setEditClassroomOpen(true)}
                className="text-sm text-slate-500 hover:text-brand-700 transition-colors"
              >
                Düzəliş
              </button>
            </div>
            <p className="text-slate-500 mt-2">
              {students.length} şagird
              {classroom.teacher && (
                <>
                  {' · '}Müəllim:{' '}
                  <span className="text-slate-700">
                    {classroom.teacher.full_name}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'İxrac edilir…' : 'Excel ixrac et'}
            </Button>
            <Button onClick={() => setAddOpen(true)}>+ Şagird əlavə et</Button>
          </div>
        </div>
      </div>

      {/* students table */}
      {studentsLoading ? (
        <p className="text-slate-500">Şagirdlər yüklənir…</p>
      ) : students.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <h3 className="font-display text-xl mb-2">Hələ şagird yoxdur</h3>
          <p className="text-slate-500 mb-6">
            Bir-bir, toplu və ya CSV faylından şagird əlavə edə bilərsiniz.
          </p>
          <Button onClick={() => setAddOpen(true)}>İlk şagirdi əlavə et</Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-slate-500">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-slate-500">
                  Vəziyyət
                </th>
                <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-slate-500">
                  Valideyn email
                </th>
                <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-slate-500">
                  Qeyd
                </th>
                <th className="px-6 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => {
                const gradedCount = Object.keys(s.grades).length
                const isComplete =
                  totalFactors > 0 && gradedCount === totalFactors
                const isPartial = gradedCount > 0 && !isComplete
                const zone = zoneFor(s.total, gradedCount > 0)

                return (
                  <tr
                    key={s.student.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <Link
                        to={`/students/${s.student.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700 transition-colors"
                      >
                        {s.student.full_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      {isComplete && zone && (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${zone.badge}`}
                          >
                            {zone.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {s.total} bal
                          </span>
                        </span>
                      )}
                      {isPartial && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Qismən {gradedCount}/{totalFactors}
                        </span>
                      )}
                      {gradedCount === 0 && (
                        <span className="text-xs text-slate-400">
                          Qiymətləndirilməyib
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {s.student.parent_email || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-600 max-w-xs truncate">
                      {s.student.notes || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => setEditingStudent(s.student.id)}
                        className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        Düzəliş
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(s.student.id)}
                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* danger zone */}
      <div className="mt-16 pt-8 border-t border-slate-200">
        <button
          onClick={() => setDeleteClassroomOpen(true)}
          className="text-sm text-red-600 hover:text-red-700 transition-colors"
        >
          Sinifi sil
        </button>
      </div>

      {/* add modal */}
      <AddStudentsModal
        open={addOpen}
        classroomId={id}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          qc.invalidateQueries({ queryKey: ['classroom-summary', id] })
          setAddOpen(false)
        }}
      />

      {/* edit student modal */}
      {editingStudent && (
        <EditStudentModal
          studentId={editingStudent}
          students={students}
          onClose={() => setEditingStudent(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['classroom-summary', id] })
            setEditingStudent(null)
          }}
        />
      )}

      {/* delete student confirm */}
      {deleteConfirm && (
        <DeleteConfirmModal
          studentId={deleteConfirm}
          studentName={
            students.find((s) => s.id === deleteConfirm)?.full_name || ''
          }
          onClose={() => setDeleteConfirm(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['classroom-summary', id] })
            setDeleteConfirm(null)
          }}
        />
      )}

      {/* edit classroom modal */}
      {editClassroomOpen && (
        <EditClassroomModal
          classroomId={id}
          currentName={classroom.name}
          onClose={() => setEditClassroomOpen(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['classroom', id] })
            qc.invalidateQueries({ queryKey: ['classrooms'] })
            setEditClassroomOpen(false)
          }}
        />
      )}

      {/* delete classroom modal */}
      {deleteClassroomOpen && (
        <DeleteClassroomModal
          classroomId={id}
          classroomName={classroom.name}
          studentCount={students.length}
          onClose={() => setDeleteClassroomOpen(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['classrooms'] })
            navigate('/classrooms')
          }}
        />
      )}
    </div>
  )
}

// ============ Add students modal (3 modes) ============

function AddStudentsModal({
  open,
  classroomId,
  onClose,
  onDone,
}: {
  open: boolean
  classroomId: string
  onClose: () => void
  onDone: () => void
}) {
  const [mode, setMode] = useState<AddMode>('single')

  return (
    <Modal open={open} onClose={onClose} title="Şagird əlavə et" size="lg">
      <div className="border-b border-slate-200 -mx-6 px-6 mb-5">
        <div className="flex gap-1">
          {(
            [
              ['single', 'Tək'],
              ['bulk', 'Toplu (JSON)'],
              ['csv', 'CSV fayl'],
            ] as [AddMode, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
                mode === key
                  ? 'border-brand-600 text-brand-700 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'single' && (
        <SingleAddForm classroomId={classroomId} onDone={onDone} />
      )}
      {mode === 'bulk' && (
        <BulkAddForm classroomId={classroomId} onDone={onDone} />
      )}
      {mode === 'csv' && (
        <CSVImportForm classroomId={classroomId} onDone={onDone} />
      )}
    </Modal>
  )
}

function SingleAddForm({
  classroomId,
  onDone,
}: {
  classroomId: string
  onDone: () => void
}) {
  const [data, setData] = useState<StudentInput>({ full_name: '' })
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (d: StudentInput) => studentsApi.create(classroomId, d),
    onSuccess: () => onDone(),
    onError: () => setErr('Şagird əlavə edilə bilmədi'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!data.full_name.trim()) return
    mutation.mutate(data)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Ad Soyad"
        value={data.full_name}
        onChange={(e) => setData({ ...data, full_name: e.target.value })}
        required
        autoFocus
      />
      <Input
        label="Valideyn email (məcburi deyil)"
        type="email"
        value={data.parent_email || ''}
        onChange={(e) => setData({ ...data, parent_email: e.target.value })}
      />
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
          Qeyd (məcburi deyil)
        </label>
        <textarea
          rows={2}
          value={data.notes || ''}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Əlavə edilir…' : 'Əlavə et'}
        </Button>
      </div>
    </form>
  )
}

function BulkAddForm({
  classroomId,
  onDone,
}: {
  classroomId: string
  onDone: () => void
}) {
  const [text, setText] = useState(
    '[\n  { "full_name": "Aydan Mammadova", "parent_email": "" },\n  { "full_name": "Rufat Aliyev" }\n]',
  )
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (students: StudentInput[]) =>
      studentsApi.bulkCreate(classroomId, students),
    onSuccess: () => onDone(),
    onError: () => setErr('Əlavə edilə bilmədi'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setErr('Boş olmayan JSON massivi olmalıdır')
        return
      }
      mutation.mutate(parsed)
    } catch {
      setErr('JSON sintaksisi düzgün deyil')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
          JSON massivi
        </label>
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
          spellCheck={false}
        />
        <p className="text-xs text-slate-500 mt-2">
          Hər obyekt üçün <code className="text-brand-700">full_name</code>{' '}
          məcburidir. İstəyə bağlı:{' '}
          <code className="text-brand-700">parent_email</code>,{' '}
          <code className="text-brand-700">notes</code>.
        </p>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Əlavə edilir…' : 'Əlavə et'}
        </Button>
      </div>
    </form>
  )
}

function CSVImportForm({
  classroomId,
  onDone,
}: {
  classroomId: string
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (f: File) => studentsApi.importCSV(classroomId, f),
    onSuccess: () => onDone(),
    onError: (e: any) =>
      setErr(e?.response?.data?.error || 'İdxal edilə bilmədi'),
  })

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setErr(null)
    setFile(e.target.files?.[0] || null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setErr('Fayl seçin')
      return
    }
    mutation.mutate(file)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 leading-relaxed">
        CSV faylının başlıq sətri olmalıdır:{' '}
        <code className="text-brand-700">full_name, parent_email, notes</code>.{' '}
        <span className="text-slate-500">
          Yalnız <code>full_name</code> məcburidir.
        </span>
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
          CSV fayl
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={onFileChange}
          className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-medium hover:file:bg-brand-100 file:transition-colors"
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={mutation.isPending || !file}>
          {mutation.isPending ? 'İdxal edilir…' : 'İdxal et'}
        </Button>
      </div>
    </form>
  )
}

// ============ Student edit modal ============

function EditStudentModal({
  studentId,
  students,
  onClose,
  onDone,
}: {
  studentId: string
  students: {
    id: string
    full_name: string
    parent_email?: string
    notes?: string
  }[]
  onClose: () => void
  onDone: () => void
}) {
  const original = students.find((s) => s.id === studentId)
  const [data, setData] = useState<StudentInput>({
    full_name: original?.full_name || '',
    parent_email: original?.parent_email || '',
    notes: original?.notes || '',
  })
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (d: StudentInput) => studentsApi.update(studentId, d),
    onSuccess: () => onDone(),
    onError: () => setErr('Düzəliş edilə bilmədi'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!data.full_name.trim()) return
    mutation.mutate(data)
  }

  return (
    <Modal open={true} onClose={onClose} title="Şagirdə düzəliş et">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Ad Soyad"
          value={data.full_name}
          onChange={(e) => setData({ ...data, full_name: e.target.value })}
          required
          autoFocus
        />
        <Input
          label="Valideyn email"
          type="email"
          value={data.parent_email || ''}
          onChange={(e) => setData({ ...data, parent_email: e.target.value })}
        />
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
            Qeyd
          </label>
          <textarea
            rows={2}
            value={data.notes || ''}
            onChange={(e) => setData({ ...data, notes: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Yadda saxlanılır…' : 'Yadda saxla'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ============ Student delete confirm ============

function DeleteConfirmModal({
  studentId,
  studentName,
  onClose,
  onDone,
}: {
  studentId: string
  studentName: string
  onClose: () => void
  onDone: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => studentsApi.delete(studentId),
    onSuccess: () => onDone(),
  })

  return (
    <Modal open={true} onClose={onClose} title="Şagirdi sil" size="sm">
      <p className="text-sm text-slate-700 mb-1">
        <strong>{studentName}</strong> silinəcək.
      </p>
      <p className="text-sm text-slate-500 mb-6">
        Şagirdin bütün qiymətləri də silinəcək. Bu əməliyyat geri qaytarıla
        bilməz.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Ləğv et
        </Button>
        <Button
          variant="danger"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Silinir…' : 'Sil'}
        </Button>
      </div>
    </Modal>
  )
}

// ============ Classroom edit modal ============

function EditClassroomModal({
  classroomId,
  currentName,
  onClose,
  onDone,
}: {
  classroomId: string
  currentName: string
  onClose: () => void
  onDone: () => void
}) {
  const [name, setName] = useState(currentName)
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (n: string) => classroomsApi.update(classroomId, { name: n }),
    onSuccess: () => onDone(),
    onError: () => setErr('Düzəliş edilə bilmədi'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    mutation.mutate(name.trim())
  }

  return (
    <Modal open={true} onClose={onClose} title="Sinfə düzəliş et">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Sinfin adı"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Yadda saxlanılır…' : 'Yadda saxla'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ============ Classroom delete modal ============

function DeleteClassroomModal({
  classroomId,
  classroomName,
  studentCount,
  onClose,
  onDone,
}: {
  classroomId: string
  classroomName: string
  studentCount: number
  onClose: () => void
  onDone: () => void
}) {
  const [confirmText, setConfirmText] = useState('')
  const mutation = useMutation({
    mutationFn: () => classroomsApi.delete(classroomId),
    onSuccess: () => onDone(),
  })

  const matches = confirmText.trim() === classroomName

  return (
    <Modal open={true} onClose={onClose} title="Sinifi sil" size="sm">
      <p className="text-sm text-slate-700 mb-1">
        <strong>{classroomName}</strong> silinəcək.
      </p>
      {studentCount > 0 && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3 mb-3">
          Bu sinifdə <strong>{studentCount} şagird</strong> və onların bütün
          qiymətləri də silinəcək.
        </p>
      )}
      <p className="text-sm text-slate-500 mb-4">
        Təsdiqləmək üçün sinif adını yazın:{' '}
        <span className="font-mono text-slate-700">{classroomName}</span>
      </p>
      <Input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={classroomName}
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>
          Ləğv et
        </Button>
        <Button
          variant="danger"
          onClick={() => mutation.mutate()}
          disabled={!matches || mutation.isPending}
        >
          {mutation.isPending ? 'Silinir…' : 'Sinifi sil'}
        </Button>
      </div>
    </Modal>
  )
}