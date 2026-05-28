export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="text-center py-14">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-6 h-6 text-stone-400" />
        </div>
      )}
      <p className="text-stone-700 font-medium">{title}</p>
      {subtitle && <p className="text-stone-400 text-sm mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}