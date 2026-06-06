'use client'

import { memo, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { WeaveNode, WeaveEdge } from '@/types'

function Node({
  node,
  isNew,
  showLabel,
  onClick,
}: {
  node: WeaveNode
  isNew: boolean
  showLabel: boolean
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const color = node.color ?? '#818cf8'

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const pulse = Math.sin(t * 2 + node.x) * 0.06
    const scale = hovered ? 1.6 : isNew ? 1.3 + Math.sin(t * 8) * 0.3 : 1 + pulse
    meshRef.current.scale.setScalar(scale)
    if (isNew && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.5 + Math.sin(t * 10) * 0.5
    }
  })

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[node.radius ?? 1.2, 20, 20]} />
        <meshStandardMaterial
          color={isNew ? '#e879f9' : color}
          emissive={isNew ? '#c026d3' : color}
          emissiveIntensity={isNew ? 2 : hovered ? 1.5 : 0.6}
          transparent
          opacity={0.92}
        />
      </mesh>
      {(showLabel || hovered || isNew) && node.label ? (
        <Html
          center
          distanceFactor={22}
          position={[0, (node.radius ?? 1.2) + 0.9, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          zIndexRange={[20, 0]}
        >
          <div
            style={{
              whiteSpace: 'nowrap',
              fontSize: 12,
              lineHeight: 1.2,
              color: 'rgba(255,255,255,0.88)',
              background: 'rgba(7,7,18,0.62)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '1px 6px',
              borderRadius: 6,
            }}
          >
            {node.label}
          </div>
        </Html>
      ) : null}
    </group>
  )
}

const Edge = memo(function Edge({ edge, nodeById, isNew }: { edge: WeaveEdge; nodeById: Map<string, WeaveNode>; isNew: boolean }) {
  const src = nodeById.get(edge.source)
  const tgt = nodeById.get(edge.target)
  if (!src || !tgt) return null

  const sim = edge.similarity ?? 0
  // 저유사 관계선이 배경에 묻히지 않도록 하한을 0.3 으로.
  const opacity = isNew ? 0.9 : 0.3 + sim * 0.5
  const width = isNew ? 2.5 : 0.8 + sim * 2.5
  const color = isNew ? '#e879f9' : sim > 0.85 ? '#c4b5fd' : '#818cf8'

  return (
    <Line
      points={[[src.x, src.y, src.z], [tgt.x, tgt.y, tgt.z]]}
      color={color}
      lineWidth={width}
      transparent
      opacity={opacity}
    />
  )
})

function TwinkleStar({ position, delay }: { position: [number, number, number]; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const size = useMemo(() => 0.04 + Math.random() * 0.12, [])
  const color = useMemo(() => {
    const colors = ['#ffffff', '#e0e7ff', '#ddd6fe', '#fce7f3', '#bfdbfe']
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime + delay
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.3 + Math.abs(Math.sin(t * 1.5)) * 0.7
    meshRef.current.scale.setScalar(0.8 + Math.sin(t * 2) * 0.2)
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  )
}

function Nebula({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const radius = useMemo(() => 30 + Math.random() * 20, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime * 0.2
    meshRef.current.rotation.x = t * 0.1
    meshRef.current.rotation.y = t * 0.15
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.03 + Math.sin(t) * 0.01
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.04} wireframe />
    </mesh>
  )
}

// useState 대신 useRef + BufferGeometry 직접 업데이트 → 60fps 리렌더 없음
function Comet() {
  const headRef = useRef<THREE.Mesh>(null)
  const elapsed = useRef(0)

  const speed = useMemo(() => 0.3 + Math.random() * 0.4, [])
  const startPos = useMemo(() => new THREE.Vector3(
    -150 + Math.random() * 100,
    50 + Math.random() * 80,
    -50 + Math.random() * 100,
  ), [])
  const direction = useMemo(() => new THREE.Vector3(
    1.5 + Math.random(),
    -0.8 - Math.random() * 0.5,
    0.2 + Math.random() * 0.3,
  ).normalize(), [])

  const trailLine = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const mat = new THREE.LineBasicMaterial({ color: '#c4b5fd', transparent: true, opacity: 0.4 })
    return new THREE.Line(geo, mat)
  }, [])

  useFrame((_, delta) => {
    if (!headRef.current) return
    elapsed.current += delta * speed
    if (elapsed.current > 8) elapsed.current = 0

    const pos = startPos.clone().add(direction.clone().multiplyScalar(elapsed.current * 30))
    headRef.current.position.copy(pos)

    const tail = pos.clone().add(direction.clone().multiplyScalar(-18))
    const arr = trailLine.geometry.attributes.position.array as Float32Array
    arr[0] = pos.x;  arr[1] = pos.y;  arr[2] = pos.z
    arr[3] = tail.x; arr[4] = tail.y; arr[5] = tail.z
    trailLine.geometry.attributes.position.needsUpdate = true
  })

  return (
    <>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      <primitive object={trailLine} />
    </>
  )
}

function DustParticle({ position, delay }: { position: [number, number, number]; delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const originY = position[1]

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime + delay
    meshRef.current.position.y = originY + Math.sin(t * 0.5) * 3
    meshRef.current.position.x = position[0] + Math.cos(t * 0.3) * 2
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.1 + Math.abs(Math.sin(t * 0.8)) * 0.3
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.08, 4, 4]} />
      <meshBasicMaterial color="#ddd6fe" transparent opacity={0.2} />
    </mesh>
  )
}

function Background() {
  const stars = useMemo(() => Array.from({ length: 300 }, (_, i) => ({
    position: [
      Math.sin(i * 137.5) * 0.5 * 350,
      Math.cos(i * 97.3) * 0.5 * 350,
      Math.sin(i * 73.1) * 0.5 * 350,
    ] as [number, number, number],
    delay: i * 0.1,
  })), [])

  const dust = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    position: [
      Math.sin(i * 53.7) * 0.5 * 120,
      Math.cos(i * 41.3) * 0.5 * 120,
      Math.sin(i * 67.9) * 0.5 * 120,
    ] as [number, number, number],
    delay: i * 0.3,
  })), [])

  return (
    <>
      {stars.map((s, i) => <TwinkleStar key={i} position={s.position} delay={s.delay} />)}
      <Nebula position={[40, 20, -60]} color="#7c3aed" />
      <Nebula position={[-60, -30, -40]} color="#4338ca" />
      <Nebula position={[0, 60, -80]} color="#be185d" />
      <Nebula position={[-40, 40, 30]} color="#0e7490" />
      {dust.map((d, i) => <DustParticle key={i} position={d.position} delay={d.delay} />)}
      <Comet />
      <Comet />
      <Comet />
    </>
  )
}

export default function WeaveCanvas({
  nodes,
  edges,
  newNodeIds,
  onNodeClick,
}: {
  nodes: WeaveNode[]
  edges: WeaveEdge[]
  newNodeIds: Set<string>
  onNodeClick: (node: WeaveNode) => void
}) {
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  return (
    <Canvas
      camera={{ position: [0, 0, 100], fov: 60 }}
      // preserveDrawingBuffer 는 export(toDataURL) 가 마지막 프레임을 읽게 하려고 필수.
      gl={{ preserveDrawingBuffer: true }}
      style={{ width: '100%', height: '100vh', background: 'linear-gradient(135deg, #070712 0%, #0d0a1e 50%, #070712 100%)' }}
    >
      <ambientLight intensity={0.15} />
      <pointLight position={[30, 30, 30]} intensity={2} color="#a855f7" />
      <pointLight position={[-30, -30, -30]} intensity={1} color="#6366f1" />
      <pointLight position={[0, 50, 0]} intensity={0.8} color="#e879f9" />
      <pointLight position={[0, -50, 0]} intensity={0.3} color="#0ea5e9" />

      <Background />

      {nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          isNew={newNodeIds.has(node.id)}
          showLabel={nodes.length <= 80}
          onClick={() => onNodeClick(node)}
        />
      ))}

      {edges.map((edge) => (
        <Edge
          key={`${edge.source}-${edge.target}`}
          edge={edge}
          nodeById={nodeById}
          isNew={newNodeIds.has(edge.source) || newNodeIds.has(edge.target)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.4}
        zoomSpeed={0.8}
        autoRotate
        autoRotateSpeed={0.2}
      />
    </Canvas>
  )
}
