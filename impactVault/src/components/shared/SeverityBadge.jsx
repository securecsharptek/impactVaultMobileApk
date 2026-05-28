const colors = {
  1: "bg-emerald-100 text-emerald-700",
  2: "bg-lime-100 text-lime-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
};

export default function SeverityBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || "bg-stone-100 text-stone-600"}`}>
      {level}/5
    </span>
  );
}