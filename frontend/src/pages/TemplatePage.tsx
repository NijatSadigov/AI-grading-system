import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateApi } from '../api/template'
import Modal from '../components/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import type { Category, EvaluationFactor } from '../types/models'
import { useAuth } from '../context/AuthContext'
type CategoryDialog =
    | { kind: 'create' }
    | { kind: 'edit'; category: Category }
    | { kind: 'delete'; category: Category }
    | null

type FactorDialog =
    | { kind: 'create'; categoryId: string; categoryName: string }
    | { kind: 'edit'; factor: EvaluationFactor; categoryName: string }
    | { kind: 'delete'; factor: EvaluationFactor }
    | null

export default function TemplatePage() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'
    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['template'],
        queryFn: templateApi.get,
    })

    const [catDialog, setCatDialog] = useState<CategoryDialog>(null)
    const [factorDialog, setFactorDialog] = useState<FactorDialog>(null)

    return (
        <div>
            <div className="flex items-end justify-between mb-10">
                <div>
                    <p className="text-sm uppercase tracking-widest text-brand-600 mb-2">
                        Şablon
                    </p>
                    <h1 className="font-display text-4xl">Qiymətləndirmə şablonu</h1>
                    <p className="text-slate-500 mt-2 max-w-2xl">
                        {isAdmin
                            ? 'Kateqoriyaları, meyarları və bal təsvirlərini idarə edin. Burada edilən dəyişikliklər müəllimlərin görəcəyi qiymətləndirmə formasına təsir edir.'
                            : 'Məktəbin qiymətləndirmə şablonunu nəzərdən keçirin. Şablonu yalnız administrator dəyişə bilər.'}
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setCatDialog({ kind: 'create' })}>
                        + Yeni kateqoriya
                    </Button>
                )}
            </div>

            {isLoading && <p className="text-slate-500">Yüklənir…</p>}

            {!isLoading && categories.length === 0 && (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                    <h3 className="font-display text-xl mb-2">Hələ kateqoriya yoxdur</h3>
                    <p className="text-slate-500 mb-6">
                        {isAdmin
                            ? 'İlk kateqoriyanı yaradın və meyarları əlavə edin.'
                            : 'Administrator hələ şablonu hazırlamayıb.'}
                    </p>
                    {isAdmin && (
                        <Button onClick={() => setCatDialog({ kind: 'create' })}>
                            İlk kateqoriyanı yarat
                        </Button>
                    )}
                </div>
            )}

            <div className="space-y-8">
                {categories.map((cat) => (
                    <section
                        key={cat.id}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                    >
                        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-baseline gap-3">
                                <h2 className="font-display text-2xl">{cat.name}</h2>
                                <span className="text-xs uppercase tracking-wider text-slate-400">
                                    {cat.factors?.length ?? 0} meyar
                                </span>
                            </div>
                            {isAdmin && (
                                <div className="flex items-center gap-3 text-sm">
                                    <button
                                        onClick={() => setCatDialog({ kind: 'edit', category: cat })}
                                        className="text-slate-500 hover:text-slate-900 transition-colors"
                                    >
                                        Düzəliş
                                    </button>
                                    <button
                                        onClick={() => setCatDialog({ kind: 'delete', category: cat })}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                    >
                                        Sil
                                    </button>
                                </div>
                            )}
                        </header>

                        {cat.factors && cat.factors.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-slate-100 bg-slate-50/40">
                                        <th className="px-6 py-2.5 font-medium text-xs uppercase tracking-wider text-slate-500 w-12">
                                            №
                                        </th>
                                        <th className="px-6 py-2.5 font-medium text-xs uppercase tracking-wider text-slate-500">
                                            Meyar
                                        </th>
                                        <th className="px-6 py-2.5 font-medium text-xs uppercase tracking-wider text-slate-500">
                                            2–5 bal təsvirləri
                                        </th>
                                        <th className="px-6 py-2.5 w-28"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cat.factors.map((f, i) => (
                                        <tr
                                            key={f.id}
                                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                                        >
                                            <td className="px-6 py-3 text-slate-400">{i + 1}</td>
                                            <td className="px-6 py-3 font-medium text-slate-900">
                                                {f.name}
                                            </td>
                                            <td className="px-6 py-3 text-slate-500 max-w-xl truncate">
                                                {f.description_2 || '—'} / {f.description_5 || '—'}
                                            </td>
                                            {isAdmin ? (
                                                <td className="px-6 py-3 text-right space-x-2">
                                                    <button
                                                        onClick={() =>
                                                            setFactorDialog({
                                                                kind: 'edit',
                                                                factor: f,
                                                                categoryName: cat.name,
                                                            })
                                                        }
                                                        className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                                                    >
                                                        Düzəliş
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setFactorDialog({ kind: 'delete', factor: f })
                                                        }
                                                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                                                    >
                                                        Sil
                                                    </button>
                                                </td>
                                            ) : (
                                                <td />
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="px-6 py-6 text-sm text-slate-400 italic">
                                Hələ meyar yoxdur.
                            </div>
                        )}

                        {isAdmin && (
                            <div className="px-6 py-3 bg-slate-50/40 border-t border-slate-100">
                                <button
                                    onClick={() =>
                                        setFactorDialog({
                                            kind: 'create',
                                            categoryId: cat.id,
                                            categoryName: cat.name,
                                        })
                                    }
                                    className="text-sm text-brand-700 hover:text-brand-800 transition-colors"
                                >
                                    + Meyar əlavə et
                                </button>
                            </div>
                        )}
                    </section>
                ))}
            </div>

            {/* Category dialogs */}
            {catDialog?.kind === 'create' && (
                <CategoryFormModal
                    onClose={() => setCatDialog(null)}
                    onDone={() => setCatDialog(null)}
                />
            )}
            {catDialog?.kind === 'edit' && (
                <CategoryFormModal
                    existing={catDialog.category}
                    onClose={() => setCatDialog(null)}
                    onDone={() => setCatDialog(null)}
                />
            )}
            {catDialog?.kind === 'delete' && (
                <DeleteCategoryModal
                    category={catDialog.category}
                    onClose={() => setCatDialog(null)}
                    onDone={() => setCatDialog(null)}
                />
            )}

            {/* Factor dialogs */}
            {factorDialog?.kind === 'create' && (
                <FactorFormModal
                    categoryId={factorDialog.categoryId}
                    categoryName={factorDialog.categoryName}
                    onClose={() => setFactorDialog(null)}
                    onDone={() => setFactorDialog(null)}
                />
            )}
            {factorDialog?.kind === 'edit' && (
                <FactorFormModal
                    existing={factorDialog.factor}
                    categoryName={factorDialog.categoryName}
                    onClose={() => setFactorDialog(null)}
                    onDone={() => setFactorDialog(null)}
                />
            )}
            {factorDialog?.kind === 'delete' && (
                <DeleteFactorModal
                    factor={factorDialog.factor}
                    onClose={() => setFactorDialog(null)}
                    onDone={() => setFactorDialog(null)}
                />
            )}
        </div>
    )
}

// ============ Category form ============

function CategoryFormModal({
    existing,
    onClose,
    onDone,
}: {
    existing?: Category
    onClose: () => void
    onDone: () => void
}) {
    const qc = useQueryClient()
    const [name, setName] = useState(existing?.name ?? '')
    const [order, setOrder] = useState(existing?.display_order ?? 0)
    const [err, setErr] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: () => {
            const payload = { name: name.trim(), display_order: order }
            return existing
                ? templateApi.updateCategory(existing.id, payload)
                : templateApi.createCategory(payload)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['template'] })
            onDone()
        },
        onError: () => setErr('Yadda saxlanılmadı'),
    })

    function submit(e: FormEvent) {
        e.preventDefault()
        if (!name.trim()) return
        mutation.mutate()
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={existing ? 'Kateqoriyaya düzəliş et' : 'Yeni kateqoriya'}
        >
            <form onSubmit={submit} className="space-y-4">
                <Input
                    label="Ad"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                />
                <Input
                    label="Sıra"
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value || '0', 10))}
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

// ============ Factor form ============

function FactorFormModal({
    existing,
    categoryId,
    categoryName,
    onClose,
    onDone,
}: {
    existing?: EvaluationFactor
    categoryId?: string
    categoryName: string
    onClose: () => void
    onDone: () => void
}) {
    const qc = useQueryClient()
    const [name, setName] = useState(existing?.name ?? '')
    const [order, setOrder] = useState(existing?.display_order ?? 0)
    const [d2, setD2] = useState(existing?.description_2 ?? 'Zəif inkişaf edib')
    const [d3, setD3] = useState(existing?.description_3 ?? 'Qismən inkişaf edib')
    const [d4, setD4] = useState(existing?.description_4 ?? 'Stabil inkişaf edib')
    const [d5, setD5] = useState(
        existing?.description_5 ?? 'Yüksək səviyyədə inkişaf edib',
    )
    const [err, setErr] = useState<string | null>(null)

    const mutation = useMutation({
        mutationFn: () => {
            const base = {
                name: name.trim(),
                description_2: d2,
                description_3: d3,
                description_4: d4,
                description_5: d5,
                display_order: order,
            }
            if (existing) return templateApi.updateFactor(existing.id, base)
            return templateApi.createFactor({ ...base, category_id: categoryId! })
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['template'] })
            onDone()
        },
        onError: () => setErr('Yadda saxlanılmadı'),
    })

    function submit(e: FormEvent) {
        e.preventDefault()
        if (!name.trim()) return
        mutation.mutate()
    }

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title={existing ? 'Meyara düzəliş et' : `Yeni meyar · ${categoryName}`}
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input
                            label="Meyarın adı"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <Input
                        label="Sıra"
                        type="number"
                        value={order}
                        onChange={(e) => setOrder(parseInt(e.target.value || '0', 10))}
                    />
                </div>

                <div className="pt-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">
                        Bal təsvirləri
                    </h3>
                    <div className="space-y-2.5">
                        {(
                            [
                                [2, d2, setD2],
                                [3, d3, setD3],
                                [4, d4, setD4],
                                [5, d5, setD5],
                            ] as [number, string, (v: string) => void][]
                        ).map(([score, val, setVal]) => (
                            <div key={score} className="flex items-center gap-3">
                                <span className="font-display text-lg w-6 text-brand-600">
                                    {score}
                                </span>
                                <input
                                    value={val}
                                    onChange={(e) => setVal(e.target.value)}
                                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                                />
                            </div>
                        ))}
                    </div>
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

// ============ Delete modals ============

function DeleteCategoryModal({
    category,
    onClose,
    onDone,
}: {
    category: Category
    onClose: () => void
    onDone: () => void
}) {
    const qc = useQueryClient()
    const [wipe, setWipe] = useState(false)
    const mutation = useMutation({
        mutationFn: () => templateApi.deleteCategory(category.id, wipe),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['template'] })
            onDone()
        },
    })

    const factorCount = category.factors?.length ?? 0

    return (
        <Modal open onClose={onClose} title="Kateqoriyanı sil" size="sm">
            <p className="text-sm text-slate-700 mb-3">
                <strong>{category.name}</strong> və onun {factorCount} meyarı silinəcək.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={wipe}
                        onChange={(e) => setWipe(e.target.checked)}
                        className="mt-1"
                    />
                    <span className="text-sm text-slate-700">
                        Bu kateqoriya ilə bağlı bütün şagird qiymətlərini də sil.
                        <span className="block text-xs text-slate-500 mt-0.5">
                            İşarələnməsə, mövcud qiymətlər tarixi məlumat kimi qalacaq.
                        </span>
                    </span>
                </label>
            </div>
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

function DeleteFactorModal({
    factor,
    onClose,
    onDone,
}: {
    factor: EvaluationFactor
    onClose: () => void
    onDone: () => void
}) {
    const qc = useQueryClient()
    const [wipe, setWipe] = useState(false)
    const mutation = useMutation({
        mutationFn: () => templateApi.deleteFactor(factor.id, wipe),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['template'] })
            onDone()
        },
    })

    return (
        <Modal open onClose={onClose} title="Meyarı sil" size="sm">
            <p className="text-sm text-slate-700 mb-3">
                <strong>{factor.name}</strong> silinəcək.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={wipe}
                        onChange={(e) => setWipe(e.target.checked)}
                        className="mt-1"
                    />
                    <span className="text-sm text-slate-700">
                        Bu meyar ilə bağlı bütün şagird qiymətlərini də sil.
                        <span className="block text-xs text-slate-500 mt-0.5">
                            İşarələnməsə, mövcud qiymətlər tarixi məlumat kimi qalacaq.
                        </span>
                    </span>
                </label>
            </div>
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