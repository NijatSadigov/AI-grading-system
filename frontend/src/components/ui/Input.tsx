import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className = '', id, ...rest }: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all ${className}`}
        {...rest}
      />
    </div>
  )
}