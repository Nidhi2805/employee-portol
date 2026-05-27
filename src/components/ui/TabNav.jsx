export default function TabNav({ tabs, active, onChange, accentColor = 'indigo' }) {
  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6">
      <div className="flex gap-0 overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap
              ${active === tab.id
                ? `border-${accentColor}-600 text-${accentColor}-600`
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
            {tab.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}