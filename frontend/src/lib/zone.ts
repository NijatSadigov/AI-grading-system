export type ZoneInfo = {
  label: string
  badge: string // tailwind classes
}

export function zoneFor(total: number, hasAnyGrade: boolean): ZoneInfo | null {
  if (!hasAnyGrade) return null
  if (total >= 85)
    return { label: 'Yüksək inkişaf', badge: 'bg-emerald-100 text-emerald-700' }
  if (total >= 70)
    return { label: 'Stabil inkişaf', badge: 'bg-brand-100 text-brand-800' }
  if (total >= 50)
    return { label: 'Risk zonası', badge: 'bg-amber-100 text-amber-800' }
  return { label: 'Kritik zona', badge: 'bg-red-100 text-red-700' }
}