import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import { PlasticPart } from './PlasticPart'
import { useConfigStore } from '../store/useConfigStore'
import { useRef, useImperativeHandle, forwardRef } from 'react'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'

const CameraControls = forwardRef((props, ref) => {
  const controlsRef = useRef<OrbitControlsType>(null)
  const { camera } = useThree()

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (controlsRef.current) {
        const distance = camera.position.length()
        const newDistance = Math.max(200, distance * 0.8)
        camera.position.multiplyScalar(newDistance / distance)
        controlsRef.current.update()
      }
    },
    zoomOut: () => {
      if (controlsRef.current) {
        const distance = camera.position.length()
        const newDistance = Math.min(2000, distance * 1.25)
        camera.position.multiplyScalar(newDistance / distance)
        controlsRef.current.update()
      }
    },
    reset: () => {
      if (controlsRef.current) {
        camera.position.set(0, 400, 800)
        controlsRef.current.target.set(0, 0, 0)
        controlsRef.current.update()
      }
    }
  }))

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={200}
      maxDistance={2000}
      maxPolarAngle={Math.PI / 2}
      enableZoom={true}
      zoomSpeed={1.2}
      touches={{
        ONE: 2, // TOUCH.ROTATE
        TWO: 0, // TOUCH.DOLLY_PAN
      }}
    />
  )
})

export function Viewer3D() {
  const config = useConfigStore((state) => state.config)
  const controlsRef = useRef<any>(null)

  const handleZoomIn = () => {
    controlsRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    controlsRef.current?.zoomOut()
  }

  const handleReset = () => {
    controlsRef.current?.reset()
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        <PerspectiveCamera makeDefault position={[0, 400, 800]} fov={50} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />

        {/* Grid helper */}
        <Grid
          args={[3000, 3000]}
          cellSize={100}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={500}
          sectionThickness={1}
          sectionColor="#9ca3af"
          fadeDistance={4000}
          fadeStrength={1}
          followCamera={false}
        />

        {/* The plastic part */}
        <PlasticPart config={config} />

        {/* Camera controls */}
        <CameraControls ref={controlsRef} />
      </Canvas>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-xl transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-800 font-bold text-xl transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg shadow-lg flex items-center justify-center text-gray-800 text-xs transition-colors"
          title="Reset View"
        >
          ⟲
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-2 rounded text-xs max-w-xs">
        <div className="font-semibold mb-1">3D Controls:</div>
        <div>• Mouse wheel / Pinch: Zoom</div>
        <div>• Left click + drag: Rotate</div>
        <div>• Right click + drag: Pan</div>
      </div>
    </div>
  )
}

