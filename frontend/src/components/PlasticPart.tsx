import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartConfig } from '../store/useConfigStore'

interface PlasticPartProps {
  config: PartConfig
}

// Material properties for different plastic types
const materialProperties = {
  'PE 500': {
    color: '#e0e7ff', // Light blue-ish
    metalness: 0.1,
    roughness: 0.4,
    opacity: 0.95,
    edgeColor: '#4f46e5', // Indigo
  },
  'PE 1000': {
    color: '#dbeafe', // Lighter blue
    metalness: 0.15,
    roughness: 0.35,
    opacity: 0.93,
    edgeColor: '#3b82f6', // Blue
  },
  'PP': {
    color: '#fef3c7', // Light yellow
    metalness: 0.05,
    roughness: 0.5,
    opacity: 0.92,
    edgeColor: '#f59e0b', // Amber
  },
  'POM': {
    color: '#f3f4f6', // Light gray
    metalness: 0.2,
    roughness: 0.3,
    opacity: 0.9,
    edgeColor: '#6b7280', // Gray
  },
  'PEEK': {
    color: '#6B6B6B', // Gray color
    metalness: 0.0,
    roughness: 0.5,
    opacity: 1.0,
    edgeColor: '#000000', // Black edge
  },
}

// Helper function to create rounded polygon from points
function createRoundedPolygon(points: Array<{x: number, y: number}>, radius: number, offsetX: number, offsetY: number): THREE.Shape {
  const shape = new THREE.Shape()

  if (points.length < 3) {
    return shape
  }

  // If no radius, just draw straight lines
  if (radius <= 0) {
    points.forEach((point, index) => {
      const x = point.x + offsetX
      const y = point.y + offsetY
      if (index === 0) {
        shape.moveTo(x, y)
      } else {
        shape.lineTo(x, y)
      }
    })
    shape.closePath()
    return shape
  }

  // Calculate rounded corners
  const roundedPoints: Array<{start: {x: number, y: number}, arc: {x: number, y: number}, end: {x: number, y: number}}> = []

  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]

    // Vectors from current point to neighbors
    const v1x = prev.x - curr.x
    const v1y = prev.y - curr.y
    const v2x = next.x - curr.x
    const v2y = next.y - curr.y

    // Normalize vectors
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y)
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y)

    if (len1 === 0 || len2 === 0) continue

    const n1x = v1x / len1
    const n1y = v1y / len1
    const n2x = v2x / len2
    const n2y = v2y / len2

    // Calculate the angle between vectors
    const angle = Math.acos(Math.max(-1, Math.min(1, n1x * n2x + n1y * n2y)))

    // Skip if angle is too small (nearly straight line)
    if (angle < 0.01) continue

    // Calculate the distance from corner to arc start/end points
    const dist = Math.min(radius / Math.tan(angle / 2), len1 / 2, len2 / 2)

    // Calculate start and end points of the arc
    const startX = curr.x + n1x * dist
    const startY = curr.y + n1y * dist
    const endX = curr.x + n2x * dist
    const endY = curr.y + n2y * dist

    roundedPoints.push({
      start: { x: startX, y: startY },
      arc: { x: curr.x, y: curr.y },
      end: { x: endX, y: endY }
    })
  }

  // Draw the rounded polygon
  if (roundedPoints.length > 0) {
    // Move to the start of the first arc
    const firstPoint = roundedPoints[0]
    shape.moveTo(firstPoint.start.x + offsetX, firstPoint.start.y + offsetY)

    // Draw each segment
    for (let i = 0; i < roundedPoints.length; i++) {
      const current = roundedPoints[i]
      const next = roundedPoints[(i + 1) % roundedPoints.length]

      // Draw arc at current corner
      shape.quadraticCurveTo(
        current.arc.x + offsetX,
        current.arc.y + offsetY,
        current.end.x + offsetX,
        current.end.y + offsetY
      )

      // Draw line to next arc start
      shape.lineTo(next.start.x + offsetX, next.start.y + offsetY)
    }

    shape.closePath()
  }

  return shape
}

export function PlasticPart({ config }: PlasticPartProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Generate geometry with holes using CSG-like approach
  const geometry = useMemo(() => {
    const { form, width, height, thickness, holes, cornerRadius, customPoints } = config
    const r = cornerRadius || 0

    // Create the main shape based on form type
    let shape = new THREE.Shape()

    switch (form) {
      case 'circle': {
        // Create circle using width as diameter
        const radius = width / 2
        shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
        break
      }

      case 'pentagon': {
        // Create regular pentagon with optional rounded corners
        const radius = width / 2
        const sides = 5
        const pentagonPoints: Array<{x: number, y: number}> = []

        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          pentagonPoints.push({ x, y })
        }

        if (r > 0) {
          // Use rounded polygon function
          shape = createRoundedPolygon(pentagonPoints, r, 0, 0)
        } else {
          // Draw straight lines
          pentagonPoints.forEach((point, index) => {
            if (index === 0) {
              shape.moveTo(point.x, point.y)
            } else {
              shape.lineTo(point.x, point.y)
            }
          })
          shape.closePath()
        }
        break
      }

      case 'line': {
        // Create thin line (using height as length, thickness as width)
        const lineWidth = Math.max(thickness, 5) // Minimum 5mm width
        shape.moveTo(-lineWidth / 2, -height / 2)
        shape.lineTo(lineWidth / 2, -height / 2)
        shape.lineTo(lineWidth / 2, height / 2)
        shape.lineTo(-lineWidth / 2, height / 2)
        shape.closePath()
        break
      }

      case 'custom': {
        // Create custom shape from user-drawn points with optional rounded corners
        if (customPoints && customPoints.length >= 3) {
          shape = createRoundedPolygon(customPoints, r, -width / 2, -height / 2)
        } else {
          // Fallback to rectangle if no custom points
          shape.moveTo(-width / 2, -height / 2)
          shape.lineTo(width / 2, -height / 2)
          shape.lineTo(width / 2, height / 2)
          shape.lineTo(-width / 2, height / 2)
          shape.lineTo(-width / 2, -height / 2)
        }
        break
      }

      case 'rectangle':
      default: {
        // Rectangle with optional rounded corners
        if (r > 0) {
          // Create rounded rectangle
          const w = width / 2
          const h = height / 2

          shape.moveTo(-w + r, -h)
          shape.lineTo(w - r, -h)
          shape.quadraticCurveTo(w, -h, w, -h + r)
          shape.lineTo(w, h - r)
          shape.quadraticCurveTo(w, h, w - r, h)
          shape.lineTo(-w + r, h)
          shape.quadraticCurveTo(-w, h, -w, h - r)
          shape.lineTo(-w, -h + r)
          shape.quadraticCurveTo(-w, -h, -w + r, -h)
        } else {
          // Sharp corners
          shape.moveTo(-width / 2, -height / 2)
          shape.lineTo(width / 2, -height / 2)
          shape.lineTo(width / 2, height / 2)
          shape.lineTo(-width / 2, height / 2)
          shape.lineTo(-width / 2, -height / 2)
        }
        break
      }
    }

    // Add holes as paths
    holes.forEach((hole) => {
      const holePath = new THREE.Path()
      const holeX = hole.x - width / 2
      const holeY = hole.y - height / 2
      const radius = hole.diameter / 2

      holePath.absarc(holeX, holeY, radius, 0, Math.PI * 2, false)
      shape.holes.push(holePath)
    })

    // Extrude the shape
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 2,
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [config])

  // Get material properties based on selected material
  const matProps = useMemo(() => {
    const baseProps = materialProperties[config.material as keyof typeof materialProperties] || materialProperties['PEEK']

    // Always use the config color (which defaults to #C4B5A0)
    return {
      ...baseProps,
      color: config.color,
    }
  }, [config.material, config.color])

  // Subtle rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.02
    }
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      castShadow
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshStandardMaterial
        color={matProps.color}
        metalness={matProps.metalness}
        roughness={matProps.roughness}
        transparent={matProps.opacity < 1.0}
        opacity={matProps.opacity}
        side={THREE.DoubleSide}
      />

      {/* Edge lines for better visibility */}
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color={matProps.edgeColor} linewidth={2} />
      </lineSegments>
    </mesh>
  )
}

