import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartConfig } from '../store/useConfigStore'

interface PlasticPartProps {
  config: PartConfig
}

export function PlasticPart({ config }: PlasticPartProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Generate geometry with holes using CSG-like approach
  const geometry = useMemo(() => {
    const { width, height, thickness, holes } = config
    
    // Create the main rectangle shape
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, -height / 2)
    shape.lineTo(width / 2, -height / 2)
    shape.lineTo(width / 2, height / 2)
    shape.lineTo(-width / 2, height / 2)
    shape.lineTo(-width / 2, -height / 2)
    
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
        color="#e0e7ff"
        metalness={0.1}
        roughness={0.4}
        transparent
        opacity={0.95}
        side={THREE.DoubleSide}
      />
      
      {/* Wireframe overlay for better visibility */}
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color="#4f46e5" linewidth={1} />
      </lineSegments>
    </mesh>
  )
}

