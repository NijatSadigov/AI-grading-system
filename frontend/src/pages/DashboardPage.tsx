import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()

const cards = [
  {
    title: 'Siniflər',
    desc: 'Sinifləri yaradın, şagirdləri əlavə edin və qiymətləndirməyə başlayın.',
    to: '/classrooms',
    label: 'Siniflərə keç',
  },
  {
    title: 'Şablon',
    desc:
      user?.role === 'admin'
        ? 'Qiymətləndirmə kateqoriyalarını və meyarlarını idarə edin.'
        : 'Qiymətləndirmə kateqoriyaları və meyarlarına baxın.',
    to: '/template',
    label: user?.role === 'admin' ? 'Şablonu aç' : 'Şablona bax',
  },
  ...(user?.role === 'admin'
    ? [
        {
          title: 'Müəllimlər',
          desc: 'Müəllim hesablarını yaradın və idarə edin.',
          to: '/teachers',
          label: 'Müəllimlərə keç',
        },
      ]
    : []),
]

  return (
    <div>
      <header className="mb-12">
        <p className="text-sm uppercase tracking-widest text-brand-600 mb-3">
          Xoş gəlmisiniz
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight max-w-2xl">
          Salam, {user?.full_name?.split(' ')[0]}.
        </h1>
        <p className="mt-4 text-slate-600 max-w-xl leading-relaxed">
          Bu panel vasitəsilə şagirdlərinizin inkişafını izləyə,
          qiymətləndirə və valideynlər üçün rəylər hazırlaya bilərsiniz.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative bg-white border border-slate-200 rounded-2xl p-7 hover:border-brand-300 hover:shadow-[0_8px_30px_-12px_rgba(37,150,190,0.25)] transition-all"
          >
            <h3 className="font-display text-2xl mb-2">{c.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {c.desc}
            </p>
            <span className="text-sm font-medium text-brand-700 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
              {c.label} <span>→</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}