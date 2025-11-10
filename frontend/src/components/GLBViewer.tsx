import { Canvas, useThree, useLoader } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, useGLTF, Html } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { PlasticPart } from './PlasticPart'
import { useConfigStore } from '../store/useConfigStore'
import { useRef, useImperativeHandle, forwardRef, useState, useCallback, useEffect } from 'react'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import { generateCADFiles } from '../services/cadGenerator'
import * as THREE from 'three'

// Component to show measurements in 3D
function Measurements3D() {
  const { config } = useConfigStore()

  if (!config.showMeasurements) return null

  return (
    <>
      {/* Length measurement (horizontal, top) */}
      <Html position={[0, config.height / 2 + 50, 0]} center>
        <div className="bg-white px-2 py-1 rounded shadow-sm border border-gray-300 text-xs font-medium whitespace-nowrap">
          Length: {config.width} mm
        </div>
      </Html>

      {/* Width measurement (depth, right side) */}
      <Html position={[config.width / 2 + 50, 0, 0]} center>
        <div className="bg-white px-2 py-1 rounded shadow-sm border border-gray-300 text-xs font-medium whitespace-nowrap">
          Width: {config.thickness} mm
        </div>
      </Html>

      {/* Height measurement (vertical, left side) */}
      <Html position={[-config.width / 2 - 50, 0, 0]} center>
        <div className="bg-white px-2 py-1 rounded shadow-sm border border-gray-300 text-xs font-medium whitespace-nowrap">
          Height: {config.height} mm
        </div>
      </Html>
    </>
  )
}

interface CameraControlsProps {
  autoRotate: boolean
}

const CameraControls = forwardRef<any, CameraControlsProps>(({ autoRotate }, ref) => {
  const controlsRef = useRef<OrbitControlsType>(null)
  const { camera } = useThree()

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (controlsRef.current) {
        const distance = camera.position.length()
        const newDistance = Math.max(400, distance * 0.8)
        camera.position.multiplyScalar(newDistance / distance)
        controlsRef.current.update()
      }
    },
    zoomOut: () => {
      if (controlsRef.current) {
        const distance = camera.position.length()
        const newDistance = Math.min(3000, distance * 1.25)
        camera.position.multiplyScalar(newDistance / distance)
        controlsRef.current.update()
      }
    },
    reset: () => {
      if (controlsRef.current) {
        camera.position.set(0, 600, 1200)
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
      minDistance={400}
      maxDistance={3000}
      enableZoom={true}
      zoomSpeed={1.2}
      autoRotate={autoRotate}
      autoRotateSpeed={2.0}
      touches={{
        ONE: 2, // TOUCH.ROTATE
        TWO: 0, // TOUCH.DOLLY_PAN
      }}
    />
  )
})

// Component to load and display STL file
function STLModel({ url, color }: { url: string, color?: string }) {
  const geometry = useLoader(STLLoader, url)

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color={color || '#e0e7ff'}
        metalness={0.1}
        roughness={0.4}
      />
    </mesh>
  )
}

// Component to load and display GLB file
function GLBModel({ url, color }: { url: string, color?: string }) {
  const { scene } = useGLTF(url)

  useEffect(() => {
    if (color && color !== '#FFFFFF') {
      // Apply custom color to all meshes in the scene
      scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.material.color.set(color)
        }
      })
    }
  }, [scene, color])

  return <primitive object={scene} rotation={[-Math.PI / 2, 0, 0]} />
}

// Wrapper component that detects file type and loads appropriately
function Model3D({ url, color, fileExtension }: { url: string, color?: string, fileExtension?: string }) {
  // Use provided extension or try to detect from URL
  const isSTL = fileExtension === '.stl' || url.toLowerCase().endsWith('.stl')

  try {
    if (isSTL) {
      return <STLModel url={url} color={color} />
    } else {
      return <GLBModel url={url} color={color} />
    }
  } catch (error) {
    console.error('Failed to load 3D model:', error)
    return null
  }
}

// Component to capture screenshot
const ScreenshotCapture = forwardRef<any, {}>((props, ref) => {
  const { gl, scene, camera } = useThree()

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      // Render the scene
      gl.render(scene, camera)

      // Get the canvas data as a data URL
      const dataURL = gl.domElement.toDataURL('image/png')
      return dataURL
    },
    captureMultipleViews: (cameraControls: any) => {
      const screenshots: { view: string; dataURL: string }[] = []
      const originalPosition = camera.position.clone()

      // Get original target - OrbitControls uses 'target' property
      let originalTarget = new THREE.Vector3(0, 0, 0)
      if (cameraControls?.target) {
        originalTarget = cameraControls.target.clone()
      }

      // View 1: Front view
      camera.position.set(0, 0, 1200)
      if (cameraControls?.target) {
        cameraControls.target.set(0, 0, 0)
        cameraControls.update()
      }
      camera.lookAt(0, 0, 0)
      gl.render(scene, camera)
      screenshots.push({
        view: 'front',
        dataURL: gl.domElement.toDataURL('image/png')
      })

      // View 2: Top view
      camera.position.set(0, 1200, 0)
      if (cameraControls?.target) {
        cameraControls.target.set(0, 0, 0)
        cameraControls.update()
      }
      camera.lookAt(0, 0, 0)
      gl.render(scene, camera)
      screenshots.push({
        view: 'top',
        dataURL: gl.domElement.toDataURL('image/png')
      })

      // View 3: Isometric view
      camera.position.set(600, 600, 900)
      if (cameraControls?.target) {
        cameraControls.target.set(0, 0, 0)
        cameraControls.update()
      }
      camera.lookAt(0, 0, 0)
      gl.render(scene, camera)
      screenshots.push({
        view: 'isometric',
        dataURL: gl.domElement.toDataURL('image/png')
      })

      // Restore original camera position
      camera.position.copy(originalPosition)
      if (cameraControls?.target) {
        cameraControls.target.copy(originalTarget)
        cameraControls.update()
      }
      camera.lookAt(originalTarget)

      return screenshots
    }
  }))

  return null
})

export function GLBViewer() {
  const config = useConfigStore((state) => state.config)
  const controlsRef = useRef<any>(null)
  const screenshotRef = useRef<any>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [glbUrl, setGlbUrl] = useState<string | null>(null)
  const [glbFileExtension, setGlbFileExtension] = useState<string>('.glb')  // Track actual file extension
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useProceduralModel, setUseProceduralModel] = useState(true)
  const [generated2DImages, setGenerated2DImages] = useState<{ view: string; dataURL: string }[]>([])
  const [show2DPreview, setShow2DPreview] = useState(false)
  const previousMaterialRef = useRef(config.material)
  const previousColorRef = useRef(config.color)

  // Function to load GLB/STL from backend
  const loadGLBFromBackend = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await generateCADFiles(config)

      if (result.glbFile && result.glbFileUrl) {
        // Clean up old URL
        if (glbUrl) {
          URL.revokeObjectURL(glbUrl)
        }

        // Detect file extension from the original URL
        const extension = result.glbFileUrl.toLowerCase().endsWith('.stl') ? '.stl' : '.glb'
        setGlbFileExtension(extension)
        console.log(`✅ Loaded 3D model with extension: ${extension}`)

        // Create object URL from blob
        const url = URL.createObjectURL(result.glbFile)
        setGlbUrl(url)
        setUseProceduralModel(false)
      }
    } catch (err) {
      console.error('Failed to generate 3D model:', err)
      setError('Failed to load 3D model from backend')
    } finally {
      setIsLoading(false)
    }
  }, [config, glbUrl])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (glbUrl) {
        URL.revokeObjectURL(glbUrl)
      }
    }
  }, [glbUrl])

  // Auto-generate 2D images when material or color changes
  useEffect(() => {
    const materialChanged = previousMaterialRef.current !== config.material
    const colorChanged = previousColorRef.current !== config.color

    if (materialChanged || colorChanged) {
      // Update refs
      previousMaterialRef.current = config.material
      previousColorRef.current = config.color

      // Generate 2D images after a short delay to allow rendering
      const timer = setTimeout(() => {
        if (screenshotRef.current && controlsRef.current) {
          const images = screenshotRef.current.captureMultipleViews(controlsRef.current)
          setGenerated2DImages(images)

          // Show notification
          console.log('✅ Generated 2D images from material/color change:', images.length)
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [config.material, config.color])

  const handleZoomIn = () => {
    controlsRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    controlsRef.current?.zoomOut()
  }

  const handleReset = () => {
    controlsRef.current?.reset()
  }

  const toggleAutoRotate = () => {
    setAutoRotate(!autoRotate)
  }

  const handleScreenshot = useCallback(() => {
    if (screenshotRef.current) {
      const dataURL = screenshotRef.current.captureScreenshot()

      // Create a download link
      const link = document.createElement('a')
      link.download = 'plastic-part-preview.png'
      link.href = dataURL
      link.click()
    }
  }, [])

  const handleGenerate2DImages = useCallback(() => {
    if (screenshotRef.current && controlsRef.current) {
      const images = screenshotRef.current.captureMultipleViews(controlsRef.current)
      setGenerated2DImages(images)
      setShow2DPreview(true)
    }
  }, [])

  const handleDownload2DImages = useCallback(() => {
    generated2DImages.forEach((img) => {
      const link = document.createElement('a')
      link.download = `plastic-part-${img.view}.png`
      link.href = img.dataURL
      link.click()
    })
  }, [generated2DImages])

  const handleDownload3DModel = useCallback(async () => {
    if (!glbUrl) {
      // If no backend model loaded, generate one first
      try {
        setIsLoading(true)
        const result = await generateCADFiles(config)

        if (result.glbFile && result.glbFileUrl) {
          // Determine file extension and name
          const extension = result.glbFileUrl.toLowerCase().endsWith('.stl') ? '.stl' : '.glb'
          const filename = `plastic-part-${config.width}x${config.height}x${config.thickness}${extension}`

          // Create download link
          const url = URL.createObjectURL(result.glbFile)
          const link = document.createElement('a')
          link.download = filename
          link.href = url
          link.click()

          // Clean up
          setTimeout(() => URL.revokeObjectURL(url), 100)
        }
      } catch (err) {
        console.error('Failed to download 3D model:', err)
        setError('Failed to download 3D model')
      } finally {
        setIsLoading(false)
      }
    } else {
      // Download the already loaded model
      const extension = glbFileExtension
      const filename = `plastic-part-${config.width}x${config.height}x${config.thickness}${extension}`

      // Fetch the blob from the URL and download
      fetch(glbUrl)
        .then(res => res.blob())
        .then(blob => {
          const link = document.createElement('a')
          link.download = filename
          link.href = URL.createObjectURL(blob)
          link.click()
        })
        .catch(err => {
          console.error('Failed to download 3D model:', err)
          setError('Failed to download 3D model')
        })
    }
  }, [glbUrl, glbFileExtension, config])

  const handleDownloadMetadata = useCallback(() => {
    // Create metadata object
    const metadata = {
      user: 'Guest', // TODO: Replace with actual user when auth is implemented
      date: new Date().toISOString(),
      dimensions: {
        width: config.width,
        height: config.height,
        thickness: config.thickness,
        unit: 'mm'
      },
      material: config.material,
      color: config.color,
      cornerRadius: config.cornerRadius,
      holes: config.holes.map((hole, idx) => ({
        number: idx + 1,
        diameter: hole.diameter,
        position: {
          x: hole.x,
          y: hole.y
        }
      })),
      assemblyDetails: config.assemblyDetails || null,
      generatedAt: new Date().toLocaleString()
    }

    // Convert to JSON
    const jsonString = JSON.stringify(metadata, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `plastic-part-${config.width}x${config.height}x${config.thickness}-metadata.json`
    link.href = url
    link.click()

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }, [config])

  // Don't render anything if no form is selected
  if (!config.form) {
    return (
      <div className="relative w-full h-full bg-white animate-fadeIn">
        {/* Dotted background - same as 2D mode */}
        <div className="absolute inset-0 dot-grid" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-white animate-fadeIn">
      {/* Dotted background - same as 2D mode */}
      <div className="absolute inset-0 dot-grid" />

      <Canvas
        shadows
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        className="absolute inset-0"
        gl={{
          alpha: true,
          preserveDrawingBuffer: true,
          antialias: true
        }}
        style={{ background: 'transparent', pointerEvents: 'auto' }}
      >
        <PerspectiveCamera makeDefault position={[0, 600, 1200]} fov={50} />

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

        {/* Load 3D model (GLB/STL) or use procedural model */}
        {!useProceduralModel && glbUrl ? (
          <Model3D url={glbUrl} color={config.color} fileExtension={glbFileExtension} />
        ) : (
          <PlasticPart config={config} />
        )}

        {/* 3D Measurements */}
        <Measurements3D />

        {/* Camera controls */}
        <CameraControls ref={controlsRef} autoRotate={autoRotate} />

        {/* Screenshot capture */}
        <ScreenshotCapture ref={screenshotRef} />
      </Canvas>
    </div>
  )
}

