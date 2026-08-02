import { metaFor } from "./metaFor";

export function SourceIcon({
  meta,
  size = 16,  // size in px
}: {
  meta: ReturnType<typeof metaFor>
  size?: number
}) {
  if (meta.iconType === "direct") {
    return (
      <span style={{ fontSize: size, width: size, height: size, display: 'inline-flex', alignItems: 'center' }}>
        {meta.icon}
      </span>
    )
  }
  if (meta.iconType === "favicon") {
    return (
      <img
        src={meta.iconUrl}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-sm"
      />
    )
  }
  return (
    <span
      className="flex items-center justify-center font-bold text-muted"
      style={{ width: size, height: size, fontSize: size * 0.7 }}
    >
      {meta.initials}
    </span>
  )
}

export function SourceBadge({
  meta,
  size = 16,
  fontSize = 13,
}: {
  meta: ReturnType<typeof metaFor>
  size?: number
  fontSize?: number
}) {
  return (
    <span
      className="inline-flex text-muted items-center gap-1.5 py-1 font-normal"
      style={{ fontSize }}
    >
      <SourceIcon meta={meta} size={size} />
      {meta.name}
    </span>
  )
}