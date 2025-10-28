import { useEffect, useRef, useState, useCallback } from 'react'
import type { PartConfig, Hole } from '../store/useConfigStore'

interface InteractivePreview2DProps {
  config: PartConfig
  onHoleClick?: (hole: Hole) => void
  onCanvasClick?: (x: number, y: number) => void
  onHoleDrag?: (holeId: string, x: number, y: number) => void
}

export function InteractivePreview2D({ config, onHoleClick, onCanvasClick, onHoleDrag }: InteractivePreview2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredHole, setHoveredHole] = useState<string | null>(null)
  const [draggingHole, setDraggingHole] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const getScaleAndOffset = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const padding = 40
    const scaleX = (canvas.width - padding * 2) / config.width
    const scaleY = (canvas.height - padding * 2) / config.height
    const baseScale = Math.min(scaleX, scaleY)
    const scale = baseScale * zoom

    const offsetX = (canvas.width - config.width * scale) / 2 + pan.x
    const offsetY = (canvas.height - config.height * scale) / 2 + pan.y

    return { scale, offsetX, offsetY }
  }, [config.width, config.height, zoom, pan])

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    // Scale from display coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    return { x, y }
  }, [])

  const getPartCoordinates = useCallback((canvasX: number, canvasY: number) => {
    const scaleData = getScaleAndOffset()
    if (!scaleData) return null

    const { scale, offsetX, offsetY } = scaleData
    const partX = (canvasX - offsetX) / scale
    const partY = (canvasY - offsetY) / scale

    return { x: partX, y: partY }
  }, [getScaleAndOffset])

  const findHoleAtPosition = useCallback((canvasX: number, canvasY: number): Hole | null => {
    const scaleData = getScaleAndOffset()
    if (!scaleData) return null

    const { scale, offsetX, offsetY } = scaleData

    for (const hole of config.holes) {
      const holeX = offsetX + hole.x * scale
      const holeY = offsetY + hole.y * scale
      const holeRadius = (hole.diameter / 2) * scale

      const distance = Math.sqrt(
        Math.pow(canvasX - holeX, 2) + Math.pow(canvasY - holeY, 2)
      )

      if (distance <= holeRadius + 5) {
        return hole
      }
    }

    return null
  }, [config.holes, getScaleAndOffset])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.5, Math.min(5, zoom * delta))

    setZoom(newZoom)
  }, [zoom])

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const handlePanMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }, [isPanning, panStart])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check for pan mode first
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      e.preventDefault()
      return
    }

    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const hole = findHoleAtPosition(coords.x, coords.y)

    if (hole) {
      const scaleData = getScaleAndOffset()
      if (!scaleData) return

      const { scale, offsetX, offsetY } = scaleData
      const holeX = offsetX + hole.x * scale
      const holeY = offsetY + hole.y * scale

      setDraggingHole(hole.id)
      setDragOffset({
        x: coords.x - holeX,
        y: coords.y - holeY
      })
      e.preventDefault()
    }
  }, [getCanvasCoordinates, findHoleAtPosition, getScaleAndOffset, pan])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle panning
    if (isPanning) {
      handlePanMove(e)
      return
    }

    const coords = getCanvasCoordinates(e)
    if (!coords) return

    if (draggingHole && onHoleDrag) {
      const partCoords = getPartCoordinates(coords.x - dragOffset.x, coords.y - dragOffset.y)
      if (partCoords) {
        const hole = config.holes.find(h => h.id === draggingHole)
        if (hole) {
          const radius = hole.diameter / 2
          const constrainedX = Math.max(radius, Math.min(config.width - radius, partCoords.x))
          const constrainedY = Math.max(radius, Math.min(config.height - radius, partCoords.y))
          onHoleDrag(draggingHole, constrainedX, constrainedY)
        }
      }
    } else {
      const hole = findHoleAtPosition(coords.x, coords.y)
      setHoveredHole(hole?.id || null)
    }
  }, [isPanning, handlePanMove, draggingHole, onHoleDrag, getCanvasCoordinates, getPartCoordinates, findHoleAtPosition, config.holes, config.width, config.height, dragOffset])

  const handleMouseUp = useCallback(() => {
    setDraggingHole(null)
    setDragOffset({ x: 0, y: 0 })
    setIsPanning(false)
  }, [])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(5, prev * 1.2))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev / 1.2))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handlePanUp = () => {
    setPan(prev => ({ x: prev.x, y: prev.y + 50 }))
  }

  const handlePanDown = () => {
    setPan(prev => ({ x: prev.x, y: prev.y - 50 }))
  }

  const handlePanLeft = () => {
    setPan(prev => ({ x: prev.x + 50, y: prev.y }))
  }

  const handlePanRight = () => {
    setPan(prev => ({ x: prev.x - 50, y: prev.y }))
  }

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const hole = findHoleAtPosition(coords.x, coords.y)
    
    if (hole && onHoleClick) {
      onHoleClick(hole)
    } else if (!hole && onCanvasClick) {
      const partCoords = getPartCoordinates(coords.x, coords.y)
      if (partCoords && partCoords.x >= 0 && partCoords.x <= config.width && 
          partCoords.y >= 0 && partCoords.y <= config.height) {
        onCanvasClick(partCoords.x, partCoords.y)
      }
    }
  }, [getCanvasCoordinates, findHoleAtPosition, onHoleClick, onCanvasClick, getPartCoordinates, config.width, config.height])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const scaleData = getScaleAndOffset()
    if (!scaleData) return

    const { scale, offsetX, offsetY } = scaleData

    // Draw rectangle
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 2
    ctx.strokeRect(offsetX, offsetY, config.width * scale, config.height * scale)

    // Fill rectangle
    ctx.fillStyle = 'rgba(224, 231, 255, 0.3)'
    ctx.fillRect(offsetX, offsetY, config.width * scale, config.height * scale)

    // Draw holes
    config.holes.forEach((hole) => {
      const x = offsetX + hole.x * scale
      const y = offsetY + hole.y * scale
      const radius = (hole.diameter / 2) * scale

      const isHovered = hoveredHole === hole.id
      const isDragging = draggingHole === hole.id

      // Draw hole
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = isDragging ? '#f59e0b' : isHovered ? '#ef4444' : '#dc2626'
      ctx.lineWidth = isDragging ? 3 : isHovered ? 2.5 : 1.5
      ctx.stroke()

      // Draw crosshair
      ctx.strokeStyle = isDragging ? '#f59e0b' : isHovered ? '#ef4444' : '#dc2626'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - radius - 5, y)
      ctx.lineTo(x + radius + 5, y)
      ctx.moveTo(x, y - radius - 5)
      ctx.lineTo(x, y + radius + 5)
      ctx.stroke()

      // Draw label if hovered or dragging
      if (isHovered || isDragging) {
        ctx.fillStyle = '#374151'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`Ø${hole.diameter}mm`, x, y - radius - 10)
        ctx.font = '10px sans-serif'
        ctx.fillText(`(${hole.x.toFixed(0)}, ${hole.y.toFixed(0)})`, x, y + radius + 15)
      }
    })

    // Draw dimensions
    ctx.fillStyle = '#374151'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    // Width dimension - centered on the rectangle
    ctx.fillText(`${config.width} mm`, offsetX + (config.width * scale) / 2, offsetY - 10)
    ctx.save()
    // Height dimension - centered on the rectangle
    ctx.translate(offsetX - 15, offsetY + (config.height * scale) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${config.height} mm`, 0, 0)
    ctx.restore()

    // Draw instruction if no holes
    if (config.holes.length === 0) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Click to add holes', canvas.width / 2, canvas.height / 2)
    }
  }, [config, hoveredHole, draggingHole, getScaleAndOffset])

  return (
    <div className="bg-white p-4 rounded-lg shadow-md relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Interactive 2D Preview</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Zoom: {(zoom * 100).toFixed(0)}%
          </span>
          <div className="flex gap-1">
            <button
              onClick={handleZoomIn}
              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-700 font-bold transition-colors"
              title="Zoom In (Mouse Wheel)"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-700 font-bold transition-colors"
              title="Zoom Out (Mouse Wheel)"
            >
              −
            </button>
            <button
              onClick={handleResetView}
              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-700 text-xs transition-colors"
              title="Reset View"
            >
              ⟲
            </button>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        Click to add • Drag to move • Double-click to edit • Wheel to zoom • Shift+Drag to pan
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={450}
          style={{ width: '100%', height: 'auto' }}
          className={`bg-gray-50 rounded border border-gray-300 ${
            isPanning ? 'cursor-grab' : draggingHole ? 'cursor-grabbing' : 'cursor-crosshair'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onDoubleClick={(e) => {
            const coords = getCanvasCoordinates(e)
            if (coords) {
              const hole = findHoleAtPosition(coords.x, coords.y)
              if (hole && onHoleClick) {
                onHoleClick(hole)
              }
            }
          }}
        />

        {/* Pan Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          <button
            onClick={handlePanUp}
            className="w-8 h-8 bg-white/90 hover:bg-white rounded shadow-md flex items-center justify-center text-gray-700 transition-colors"
            title="Pan Up"
          >
            ↑
          </button>
          <div className="flex gap-1">
            <button
              onClick={handlePanLeft}
              className="w-8 h-8 bg-white/90 hover:bg-white rounded shadow-md flex items-center justify-center text-gray-700 transition-colors"
              title="Pan Left"
            >
              ←
            </button>
            <button
              onClick={handlePanRight}
              className="w-8 h-8 bg-white/90 hover:bg-white rounded shadow-md flex items-center justify-center text-gray-700 transition-colors"
              title="Pan Right"
            >
              →
            </button>
          </div>
          <button
            onClick={handlePanDown}
            className="w-8 h-8 bg-white/90 hover:bg-white rounded shadow-md flex items-center justify-center text-gray-700 transition-colors"
            title="Pan Down"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  )
}

