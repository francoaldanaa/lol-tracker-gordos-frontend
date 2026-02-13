import { Castle } from "lucide-react"

type ObjectiveType = "voidgrubs" | "dragones" | "torres" | "herald" | "baron"

interface ObjectiveChipProps {
  type: ObjectiveType
  blue: number
  red: number
}

function getObjectiveMeta(type: ObjectiveType) {
  switch (type) {
    case "voidgrubs":
      return { label: "Voidgrubs", iconSrc: "/voidgrubs.png", Icon: null, colorClass: "text-violet-200" }
    case "dragones":
      return { label: "Dragón", iconSrc: "/dragon.png", Icon: null, colorClass: "text-emerald-200" }
    case "torres":
      return { label: "Torres", iconSrc: null, Icon: Castle, colorClass: "text-amber-200" }
    case "herald":
      return { label: "Heraldo", iconSrc: "/herald.png", Icon: null, colorClass: "text-sky-200" }
    case "baron":
      return { label: "Barón Nashor", iconSrc: "/baron.png", Icon: null, colorClass: "text-fuchsia-200" }
  }
}

export default function ObjectiveChip({ type, blue, red }: ObjectiveChipProps) {
  const { label, iconSrc, Icon, colorClass } = getObjectiveMeta(type)

  return (
    <div className="glass-card flex items-center justify-between gap-4 px-4 py-3 text-xs text-slate-200/85">
      <span className="min-w-[2.5rem] text-center text-lg font-bold text-cyan-100">{blue}</span>
      <span className={`inline-flex flex-col items-center gap-1 ${colorClass}`} title={label}>
        {iconSrc ? <img src={iconSrc} alt={label} className="h-[74px] w-auto max-w-[104px] object-contain" /> : null}
        {Icon ? <Icon className="h-[74px] w-[74px]" /> : null}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-100">{label}</span>
      </span>
      <span className="min-w-[2.5rem] text-center text-lg font-bold text-rose-100">{red}</span>
    </div>
  )
}

