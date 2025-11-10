import { useEffect, useRef, useCallback, useState } from 'react'
import { useConfigStore, type Hole } from '../store/useConfigStore'
import { HoleEditorModal } from './HoleEditorModal'

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const config = useConfigStore((state) => state.config)
  const addHole = useConfigStore((state) => state.addHole)
  const updateHole = useConfigStore((state) => state.updateHole)
  const removeHole = useConfigStore((state) => state.removeHole)
  const addCustomPoint = useConfigStore((state) => state.addCustomPoint)
  const finalizeCustomShape = useConfigStore((state) => state.finalizeCustomShape)
  const customShapeFinalized = useConfigStore((state) => state.customShapeFinalized)
  const [selectedHole, setSelectedHole] = useState<string | null>(null)
  const [editingHole, setEditingHole] = useState<Hole | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDrawingCustom, setIsDrawingCustom] = useState(false)

  // Compute consistent layout values for drawing and hit-testing
  const computeLayout = (canvas: HTMLCanvasElement) => {
    // Use CSS pixel dimensions for layout, independent of device pixel ratio
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr

    let displayWidth = config.width
    let displayHeight = config.height

    if (config.viewMode === 'side') {
      displayWidth = config.thickness
      displayHeight = config.height
    } else if (config.viewMode === 'top') {
      displayWidth = config.width
      displayHeight = config.thickness
    }

    const paddingLeft = 80  // Space for left measurement
    const paddingRight = 80
    const paddingTop = 100   // Space for top measurement and form selector
    const paddingBottom = 80

    const scaleX = (cssW - paddingLeft - paddingRight) / displayWidth
    const scaleY = (cssH - paddingTop - paddingBottom) / displayHeight
    const scale = Math.min(scaleX, scaleY) * 0.6  // Scale down to 60% to make shape smaller

    const offsetX = paddingLeft + (cssW - paddingLeft - paddingRight - displayWidth * scale) / 2
    const offsetY = paddingTop + (cssH - paddingTop - paddingBottom - displayHeight * scale) / 2

    return { displayWidth, displayHeight, scale, offsetX, offsetY }
  }

  const drawPart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Prepare for high-DPI rendering
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // If no form is selected, just show empty canvas
    if (!config.form) {
      return
    }

    // Compute layout (in CSS pixels)
    const { displayWidth, displayHeight, scale, offsetX, offsetY } = computeLayout(canvas)

    // Draw the part based on form and view mode
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)

    // Set part style
    ctx.fillStyle = config.color || '#C4B5A0'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1 / scale

    if (config.viewMode === 'front') {
      // Front view - show the main face
      if (config.form === 'rectangle') {
        if (config.cornerRadius > 0) {
          // Draw rounded rectangle
          const r = config.cornerRadius
          ctx.beginPath()
          ctx.moveTo(r, 0)
          ctx.lineTo(config.width - r, 0)
          ctx.arcTo(config.width, 0, config.width, r, r)
          ctx.lineTo(config.width, config.height - r)
          ctx.arcTo(config.width, config.height, config.width - r, config.height, r)
          ctx.lineTo(r, config.height)
          ctx.arcTo(0, config.height, 0, config.height - r, r)
          ctx.lineTo(0, r)
          ctx.arcTo(0, 0, r, 0, r)
          ctx.closePath()
        } else {
          // Draw regular rectangle
          ctx.fillRect(0, 0, config.width, config.height)
          ctx.strokeRect(0, 0, config.width, config.height)
        }
        ctx.fill()
        ctx.stroke()

        // Draw corner radius indicators if present
        if (config.cornerRadius > 0 && config.showMeasurements) {
          const r = config.cornerRadius
          ctx.strokeStyle = '#666666'
          ctx.lineWidth = 1 / scale
          ctx.setLineDash([3 / scale, 3 / scale])

          // Draw corner arcs
          ;[[r, r, Math.PI, Math.PI * 1.5],
            [config.width - r, r, Math.PI * 1.5, Math.PI * 2],
            [config.width - r, config.height - r, 0, Math.PI * 0.5],
            [r, config.height - r, Math.PI * 0.5, Math.PI]
          ].forEach(([x, y, start, end]) => {
            ctx.beginPath()
            ctx.arc(x, y, r, start, end)
            ctx.stroke()
          })

          ctx.setLineDash([])
        }
      } else if (config.form === 'circle') {
        const radius = Math.min(config.width, config.height) / 2
        const centerX = config.width / 2
        const centerY = config.height / 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else if (config.form === 'pentagon') {
        // Draw pentagon
        const centerX = config.width / 2
        const centerY = config.height / 2
        const radius = Math.min(config.width, config.height) / 2
        const sides = 5

        ctx.beginPath()
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI / sides) - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else if (config.form === 'custom') {
        if (config.customPoints && config.customPoints.length > 0) {
          // Draw custom shape
          if (config.customPoints.length >= 3 && customShapeFinalized) {
            // Draw filled shape if finalized
            ctx.fillStyle = config.color || '#C4B5A0'
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 1 / scale
            ctx.beginPath()
            config.customPoints.forEach((point, i) => {
              if (i === 0) {
                ctx.moveTo(point.x, point.y)
              } else {
                ctx.lineTo(point.x, point.y)
              }
            })
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
          } else {
            // Draw lines and points while drawing
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 2 / scale
            ctx.beginPath()
            config.customPoints.forEach((point, i) => {
              if (i === 0) {
                ctx.moveTo(point.x, point.y)
              } else {
                ctx.lineTo(point.x, point.y)
              }
            })
            ctx.stroke()

            // Draw points
            config.customPoints.forEach((point) => {
              ctx.fillStyle = '#3B82F6'
              ctx.beginPath()
              ctx.arc(point.x, point.y, 4 / scale, 0, Math.PI * 2)
              ctx.fill()
            })
          }
        }
      } else if (config.form === 'line') {
        // Draw line
        ctx.strokeStyle = config.color || '#C4B5A0'
        ctx.lineWidth = config.thickness / scale
        ctx.beginPath()
        ctx.moveTo(0, config.height / 2)
        ctx.lineTo(config.width, config.height / 2)
        ctx.stroke()
      }
    } else if (config.viewMode === 'side') {
      // Side view - show thickness × height
      ctx.fillRect(0, 0, displayWidth, displayHeight)
      ctx.strokeRect(0, 0, displayWidth, displayHeight)
    } else if (config.viewMode === 'top') {
      // Top view - show width × thickness
      if (config.form === 'rectangle') {
        if (config.cornerRadius > 0) {
          const r = config.cornerRadius
          ctx.beginPath()
          ctx.moveTo(r, 0)
          ctx.lineTo(config.width - r, 0)
          ctx.arcTo(config.width, 0, config.width, r, r)
          ctx.lineTo(config.width, displayHeight - r)
          ctx.arcTo(config.width, displayHeight, config.width - r, displayHeight, r)
          ctx.lineTo(r, displayHeight)
          ctx.arcTo(0, displayHeight, 0, displayHeight - r, r)
          ctx.lineTo(0, r)
          ctx.arcTo(0, 0, r, 0, r)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        } else {
          ctx.fillRect(0, 0, displayWidth, displayHeight)
          ctx.strokeRect(0, 0, displayWidth, displayHeight)
        }
      } else if (config.form === 'circle') {
        const radius = Math.min(config.width, displayHeight) / 2
        const centerX = config.width / 2
        const centerY = displayHeight / 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else if (config.form === 'pentagon') {
        // Pentagon top view - show as ellipse
        const centerX = config.width / 2
        const centerY = displayHeight / 2
        const radiusX = config.width / 2
        const radiusY = displayHeight / 2

        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      } else if (config.form === 'line') {
        // Line top view
        ctx.fillRect(0, 0, displayWidth, displayHeight)
        ctx.strokeRect(0, 0, displayWidth, displayHeight)
      }
    }

    ctx.restore()

    // Draw measurements if enabled
    if (config.showMeasurements) {
      ctx.save()
      ctx.fillStyle = '#000000'
      ctx.font = '11px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Width text (top) - very close to canvas edge
      const topY = offsetY - 10
      const widthLabel = config.viewMode === 'side' ? `${config.thickness} mm` : `${config.width} mm`
      ctx.fillText(
        widthLabel,
        offsetX + (displayWidth * scale) / 2,
        topY
      )

      // Height text (left side) - very close to canvas edge
      const leftX = offsetX - 15
      const heightLabel = config.viewMode === 'top' ? `${config.thickness} mm` : `${config.height} mm`
      ctx.save()
      ctx.translate(leftX, offsetY + (displayHeight * scale) / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(heightLabel, 0, 0)
      ctx.restore()

      ctx.restore()
    }



    // Draw holes (only in front and top views)
    if (config.viewMode !== 'side') {
      config.holes.forEach((hole) => {
        ctx.save()
        ctx.translate(offsetX, offsetY)
        ctx.scale(scale, scale)

        const holeX = hole.x
        const holeY = hole.y
        const holeRadius = hole.diameter / 2
        const isSelected = hole.id === selectedHole

        // Draw hole - small circle with black outline
        ctx.fillStyle = '#FFFFFF'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1 / scale
        ctx.beginPath()
        ctx.arc(holeX, holeY, holeRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Draw diameter label if selected
        if (isSelected && config.showMeasurements) {
          ctx.fillStyle = '#3B82F6'
          ctx.font = `${10 / scale}px Arial`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillText(`Ø${hole.diameter}mm`, holeX, holeY + holeRadius + 5 / scale)
        }

        ctx.restore()
      })
    }
  }, [config, selectedHole, customShapeFinalized])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size to match container with device-pixel-ratio scaling
    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        const dpr = window.devicePixelRatio || 1
        const cssW = container.clientWidth
        const cssH = container.clientHeight
        canvas.style.width = cssW + 'px'
        canvas.style.height = cssH + 'px'
        canvas.width = Math.floor(cssW * dpr)
        canvas.height = Math.floor(cssH * dpr)
        drawPart()
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [drawPart])

  useEffect(() => {
    drawPart()
  }, [drawPart])

  // Handle canvas click to add custom points or holes
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Convert canvas coordinates to part coordinates using same math as drawing
    const { displayWidth, displayHeight, scale, offsetX, offsetY } = computeLayout(canvas)

    // Check if click is within part bounds
    if (x >= offsetX && x <= offsetX + displayWidth * scale &&
        y >= offsetY && y <= offsetY + displayHeight * scale) {

      // Convert to part coordinates
      const partX = (x - offsetX) / scale
      const partY = (y - offsetY) / scale

      // If drawing custom shape, add point
      if (config.form === 'custom' && !customShapeFinalized) {
        addCustomPoint({ x: partX, y: partY })
        setIsDrawingCustom(true)
        return
      }

      // Check if clicking on existing hole
      const clickedHole = config.holes.find(hole => {
        const dx = hole.x - partX
        const dy = hole.y - partY
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance <= hole.diameter / 2
      })

      if (clickedHole) {
        setSelectedHole(clickedHole.id)
        setEditingHole(clickedHole)
      }
    }
  }, [config, addCustomPoint, customShapeFinalized])

  return (
    <div className="relative w-full h-full bg-white animate-fadeIn">
      {/* Dotted background */}
      <div className="absolute inset-0 dot-grid pointer-events-none" />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`absolute inset-0 w-full h-full ${config.form === 'custom' && !customShapeFinalized ? 'cursor-crosshair' : 'cursor-default'}`}
      />

      {/* Custom Shape Controls */}
      {config.form === 'custom' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {!customShapeFinalized && config.customPoints && config.customPoints.length >= 3 && (
            <button
              onClick={() => {
                finalizeCustomShape()
                setIsDrawingCustom(false)
              }}
              className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded shadow-lg hover:bg-gray-800 transition-colors"
            >
              Finish Shape
            </button>
          )}
          {customShapeFinalized && (
            <button
              onClick={() => {
                const { clearCustomPoints } = useConfigStore.getState()
                clearCustomPoints()
                setIsDrawingCustom(false)
              }}
              className="px-6 py-2 bg-red-600 text-white text-sm font-semibold rounded shadow-lg hover:bg-red-700 transition-colors"
            >
              Remove Shape
            </button>
          )}
        </div>
      )}

      {/* Hole Editor Modal */}
      {editingHole && (
        <HoleEditorModal
          hole={editingHole}
          partWidth={config.width}
          partHeight={config.height}
          onUpdate={(updatedHole) => {
            updateHole(updatedHole.id, updatedHole)
            setEditingHole(null)
            setSelectedHole(null)
          }}
          onRemove={() => {
            removeHole(editingHole.id)
            setEditingHole(null)
            setSelectedHole(null)
          }}
          onClose={() => {
            setEditingHole(null)
            setSelectedHole(null)
          }}
        />
      )}
    </div>
  )
}

