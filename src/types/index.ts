export interface WeaveNode {
  id: string
  label: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  color?: string
  radius?: number
  emotion?: string
  keywords?: string[]
  // ADR-002: 멀티소스 지식 노드 종류 (dream | research_report | community_video |
  // community_post | subscription_signal | user_memo | auto_memo).
  sourceKind?: string
  sourceLabel?: string
  metaLabel?: string
  visibility?: "public" | "community" | "private"
  mine?: boolean
  href?: string
}

export interface WeaveEdge {
  source: string
  target: string
  weight?: number     // force layout
  similarity: number  // edge 렌더링 (0–1)
}
