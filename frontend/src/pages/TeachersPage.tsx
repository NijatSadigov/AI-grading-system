import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachersApi } from '../api/teachers'
import Modal from '../components/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import type { User } from '../types/models'

type Dialog =
  | { kind: 'create' }
  | { kind: 'reset'; teacher: User }
  | { kind: 'delete'; teacher: User }
  | null

export default function TeachersPage() {
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: teachersApi.list,
  })

  const [dialog, setDialog] = useState<Dialog>(null)

  return (
    <div>
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-sm uppercase tracking-widest text-brand-600 mb-2">
            Müəllimlər
          </p>
          <h1 className="font-display text-4xl">Müəllim hesabları</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Müəllim hesablarını yaradın, şifrələri yeniləyin və ya silin.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          + Yeni müəllim
        </Button>
      </div>

      {isLoading && <p className="text-slate-500">Yüklənir…</p>}

      {!isLoading && teachers.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <h3 className="font-display text-xl mb-2">Hələ müəllim yoxdur</h3>
          <p className="text-slate-500 mb-6">
            İlk müəllim hesabını yaradın.
          </p>
          <Button onClick={() => setDialog({ kind: 'create' })}>
            İlk müəllimi yarat
          </Button>
        </div>
      )}

      {teachers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-slate-500">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-slate-500">
                  Email
                </th>
                <th className="px-6 py-3 font-medium text-xs uppercase tracking-wider text-slate-500">
                  Yaradılma tarixi
                </th>
                <th className="px-6 py-3 w-44"></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {t.full_name}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{t.email}</td>
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(t.created_at).toLocaleDateString('az-AZ')}
                  </td>
                  <td className="px-6 py-3 text-right space-x-3">
                    <button
                      onClick={() => setDialog({ kind: 'reset', teacher: t })}
                      className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Şifrə sıfırla
                    </button>
                    <button
                      onClick={() => setDialog({ kind: 'delete', teacher: t })}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.kind === 'create' && (
        <CreateTeacherModal onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'reset' && (
        <ResetPasswordModal
          teacher={dialog.teacher}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteTeacherModal
          teacher={dialog.teacher}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

// ============ Create ============

function CreateTeacherModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [data, setData] = useState({ email: '', full_name: '', password: '' })
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      teachersApi.create({
        email: data.email.trim().toLowerCase(),
        full_name: data.full_name.trim(),
        password: data.password,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      onClose()
    },
    onError: (e: any) =>
      setErr(e?.response?.data?.error || 'Müəllim yaradıla bilmədi'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!data.email.trim() || !data.full_name.trim()) {
      setErr('Email və ad soyad məcburidir')
      return
    }
    if (data.password.length < 8) {
      setErr('Şifrə minimum 8 simvol olmalıdır')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal open onClose={onClose} title="Yeni müəllim">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Ad Soyad"
          value={data.full_name}
          onChange={(e) => setData({ ...data, full_name: e.target.value })}
          required
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          required
        />
        <Input
          label="Başlanğıc şifrə (min 8 simvol)"
          type="text"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          required
        />
        <p className="text-xs text-slate-500">
          Müəllim ilk girişdən sonra şifrəni dəyişdirə bilər. Şifrəni təhlükəsiz
          şəkildə müəllimə çatdırın.
        </p>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Yaradılır…' : 'Yarat'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ============ Reset password ============

function ResetPasswordModal({
  teacher,
  onClose,
}: {
  teacher: User
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: () => teachersApi.resetPassword(teacher.id, password),
    onSuccess: () => setDone(true),
    onError: (e: any) =>
      setErr(e?.response?.data?.error || 'Şifrə sıfırlana bilmədi'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) {
      setErr('Şifrə minimum 8 simvol olmalıdır')
      return
    }
    mutation.mutate()
  }

  if (done) {
    return (
      <Modal open onClose={onClose} title="Şifrə yeniləndi" size="sm">
        <p className="text-sm text-slate-700 mb-2">
          <strong>{teacher.full_name}</strong> üçün yeni şifrə təyin edildi.
        </p>
        <p className="text-sm text-slate-500 mb-5">
          Şifrəni müəllimə təhlükəsiz şəkildə çatdırın.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Bağla</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Şifrə sıfırla" size="sm">
      <p className="text-sm text-slate-700 mb-4">
        <strong>{teacher.full_name}</strong> ({teacher.email}) üçün yeni şifrə.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Yeni şifrə (min 8 simvol)"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sıfırlanır…' : 'Sıfırla'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ============ Delete ============

function DeleteTeacherModal({
  teacher,
  onClose,
}: {
  teacher: User
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [err, setErr] = useState<{ msg: string; classroomCount?: number } | null>(null)

  const mutation = useMutation({
    mutationFn: () => teachersApi.delete(teacher.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      onClose()
    },
    onError: (e: any) => {
      const data = e?.response?.data
      setErr({
        msg: data?.error || 'Silinə bilmədi',
        classroomCount: data?.classroom_count,
      })
    },
  })

  return (
    <Modal open onClose={onClose} title="Müəllimi sil" size="sm">
      <p className="text-sm text-slate-700 mb-1">
        <strong>{teacher.full_name}</strong> ({teacher.email}) silinəcək.
      </p>
      <p className="text-sm text-slate-500 mb-4">
        Bu əməliyyat geri qaytarıla bilməz.
      </p>
      {err && (
        <div className="bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-4 text-sm text-red-700">
          {err.classroomCount ? (
            <>
              Müəllimin {err.classroomCount} sinifi var. Əvvəlcə həmin sinifləri
              başqa müəllimə təyin edin və ya silin.
            </>
          ) : (
            err.msg
          )}
        </div>
      )}
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