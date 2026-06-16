import { ExternalLink } from 'lucide-react';

export default function QuickActionCard({ title, description, icon, onClick, variant }) {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left cursor-pointer p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 border ${
        isPrimary
          ? 'bg-brand-blue border-brand-blue shadow-xl shadow-brand-blue/20 text-white hover:bg-blue-700'
          : 'bg-surface-1 border-hairline hover:border-surface-2 text-white hover:bg-surface-2'
      }`}
    >
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-xl ${
          isPrimary ? 'bg-white/20' : 'bg-brand-blue/10 text-brand-blue'
        }`}>
          {icon}
        </div>
        <ExternalLink className={`w-5 h-5 transition-all ${
          isPrimary ? 'text-white/40 group-hover:text-white' : 'text-ink-subtle group-hover:text-brand-blue'
        }`} />
      </div>
      <h3 className="text-lg font-semibold mb-1 tracking-tight">{title}</h3>
      <p className={`text-sm ${
        isPrimary ? 'text-blue-100' : 'text-ink-muted'
      }`}>
        {description}
      </p>
    </button>
  );
}
