import { useEffect, useRef, useCallback, useState } from 'react'
import type { Point } from '../store/useConfigStore'

interface CustomShapeDrawerProps {
  points: Point[]
  onAddPoint: (point: Point) => void
  onUpdatePoint: (index: number, point: Point) => void
  onRemovePoint: (index: number) => void
  onRemoveLastPoint: () => void
  onClearPoints: () => void
  onApplyShape?: () => void
  isFinalized?: boolean
  width: number
  height: number
  cornerRadius?: number
}

export function CustomShapeDrawer({
  points,
  onAddPoint,
  onUpdatePoint,
  onRemovePoint,
  onRemoveLastPoint,
  onClearPoints,
  onApplyShape,
  isFinalized = false,
  width,
  height,
  cornerRadius = 0,
}: CustomShapeDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Clear selection states when shape is finalized
  useEffect(() => {
    if (isFinalized) {
      setDraggingIndex(null)
      setHoveredIndex(null)
      setSelectedIndex(null)
    }
  }, [isFinalized])

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    return { x, y }
  }, [])

  const getPartCoordinates = useCallback((canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const padding = 40
    const scaleX = (canvas.width - padding * 2) / width
    const scaleY = (canvas.height - padding * 2) / height
    const scale = Math.min(scaleX, scaleY)

    const offsetX = (canvas.width - width * scale) / 2
    const offsetY = (canvas.height - height * scale) / 2

    const partX = (canvasX - offsetX) / scale
    const partY = (canvasY - offsetY) / scale

    return { x: partX, y: partY }
  }, [width, height])

  // Find if click is on an existing point
  const findPointAtPosition = useCallback((canvasX: number, canvasY: number): number | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const padding = 40
    const scaleX = (canvas.width - padding * 2) / width
    const scaleY = (canvas.height - padding * 2) / height
    const scale = Math.min(scaleX, scaleY)

    const offsetX = (canvas.width - width * scale) / 2
    const offsetY = (canvas.height - height * scale) / 2

    const clickRadius = 10 // pixels

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const px = offsetX + point.x * scale
      const py = offsetY + point.y * scale
      const distance = Math.sqrt((px - canvasX) ** 2 + (py - canvasY) ** 2)

      if (distance <= clickRadius) {
        return i
      }
    }

    return null
  }, [points, width, height])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const pointIndex = findPointAtPosition(coords.x, coords.y)

    if (pointIndex !== null) {
      // Start dragging existing point
      setDraggingIndex(pointIndex)
      setSelectedIndex(pointIndex)
    }
  }, [getCanvasCoordinates, findPointAtPosition])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    // Update hovered point
    const pointIndex = findPointAtPosition(coords.x, coords.y)
    setHoveredIndex(pointIndex)

    // Handle dragging
    if (draggingIndex !== null) {
      const partCoords = getPartCoordinates(coords.x, coords.y)
      if (!partCoords) return

      // Clamp to bounds
      const clampedX = Math.max(0, Math.min(width, partCoords.x))
      const clampedY = Math.max(0, Math.min(height, partCoords.y))

      onUpdatePoint(draggingIndex, { x: clampedX, y: clampedY })
    }
  }, [getCanvasCoordinates, getPartCoordinates, findPointAtPosition, draggingIndex, onUpdatePoint, width, height])

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const pointIndex = findPointAtPosition(coords.x, coords.y)

    if (pointIndex !== null) {
      // Clicked on existing point - select it
      setSelectedIndex(pointIndex)
      return
    }

    // Clicked on empty space - add new point
    const partCoords = getPartCoordinates(coords.x, coords.y)
    if (!partCoords) return

    // Only add points within bounds
    if (partCoords.x >= 0 && partCoords.x <= width &&
        partCoords.y >= 0 && partCoords.y <= height) {
      onAddPoint(partCoords)
      setSelectedIndex(null)
    }
  }, [getCanvasCoordinates, getPartCoordinates, findPointAtPosition, onAddPoint, width, height])

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)
    if (!coords) return

    const pointIndex = findPointAtPosition(coords.x, coords.y)

    if (pointIndex !== null) {
      // Double-clicked on point - delete it
      onRemovePoint(pointIndex)
      setSelectedIndex(null)
    }
  }, [getCanvasCoordinates, findPointAtPosition, onRemovePoint])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const padding = 40
    const scaleX = (canvas.width - padding * 2) / width
    const scaleY = (canvas.height - padding * 2) / height
    const scale = Math.min(scaleX, scaleY)

    const offsetX = (canvas.width - width * scale) / 2
    const offsetY = (canvas.height - height * scale) / 2

    // Draw grid
    const gridSize = 50
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    for (let x = 0; x <= width; x += gridSize) {
      const canvasX = offsetX + x * scale
      ctx.beginPath()
      ctx.moveTo(canvasX, offsetY)
      ctx.lineTo(canvasX, offsetY + height * scale)
      ctx.stroke()
    }

    for (let y = 0; y <= height; y += gridSize) {
      const canvasY = offsetY + y * scale
      ctx.beginPath()
      ctx.moveTo(offsetX, canvasY)
      ctx.lineTo(offsetX + width * scale, canvasY)
      ctx.stroke()
    }

    // Draw bounding box
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.strokeRect(offsetX, offsetY, width * scale, height * scale)
    ctx.setLineDash([])

    // Draw custom shape
    if (points.length > 0) {
      ctx.strokeStyle = '#4f46e5'
      ctx.lineWidth = 3
      ctx.fillStyle = 'rgba(224, 231, 255, 0.3)'

      ctx.beginPath()

      // Draw with rounded corners if cornerRadius > 0 and we have at least 3 points
      if (cornerRadius > 0 && points.length >= 3) {
        // Calculate rounded corners
        const r = cornerRadius * scale // Scale the radius to canvas coordinates
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
          const dist = Math.min(cornerRadius / Math.tan(angle / 2), len1 / 2, len2 / 2)

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
          const firstPoint = roundedPoints[0]
          ctx.moveTo(offsetX + firstPoint.start.x * scale, offsetY + firstPoint.start.y * scale)

          for (let i = 0; i < roundedPoints.length; i++) {
            const current = roundedPoints[i]
            const next = roundedPoints[(i + 1) % roundedPoints.length]

            // Draw arc at current corner
            ctx.quadraticCurveTo(
              offsetX + current.arc.x * scale,
              offsetY + current.arc.y * scale,
              offsetX + current.end.x * scale,
              offsetY + current.end.y * scale
            )

            // Draw line to next arc start
            ctx.lineTo(offsetX + next.start.x * scale, offsetY + next.start.y * scale)
          }

          ctx.closePath()
          ctx.fill()
        }
      } else {
        // Draw straight lines
        points.forEach((point, index) => {
          const x = offsetX + point.x * scale
          const y = offsetY + point.y * scale

          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        // Close the shape if we have at least 3 points
        if (points.length >= 3) {
          ctx.closePath()
          ctx.fill()
        }
      }

      ctx.stroke()

      // Draw points only if not finalized
      if (!isFinalized) {
        points.forEach((point, index) => {
          const x = offsetX + point.x * scale
          const y = offsetY + point.y * scale

          // Determine point appearance based on state
          const isHovered = index === hoveredIndex
          const isSelected = index === selectedIndex
          const isDragging = index === draggingIndex
          const isFirst = index === 0

          // Draw outer glow for hovered/selected points
          if (isHovered || isSelected || isDragging) {
            ctx.beginPath()
            ctx.arc(x, y, 10, 0, Math.PI * 2)
            ctx.fillStyle = isDragging ? 'rgba(239, 68, 68, 0.3)' :
                            isSelected ? 'rgba(251, 191, 36, 0.3)' :
                            'rgba(79, 70, 229, 0.3)'
            ctx.fill()
          }

          // Draw main point
          ctx.beginPath()
          const radius = (isHovered || isSelected || isDragging) ? 8 : 6
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = isDragging ? '#ef4444' :
                          isSelected ? '#fbbf24' :
                          isFirst ? '#10b981' : '#4f46e5'
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.stroke()

          // Draw point number
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 10px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText((index + 1).toString(), x, y)

          // Show coordinates for selected/hovered point
          if (isSelected || isHovered) {
            ctx.fillStyle = '#374151'
            ctx.font = '11px sans-serif'
            ctx.fillText(
              `(${Math.round(point.x)}, ${Math.round(point.y)})`,
              x,
              y - 18
            )
          }
        })
      }
    }

    // Draw instructions only if not finalized
    if (!isFinalized) {
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        points.length === 0
          ? 'Click to add points to draw your custom shape'
          : `${points.length} point${points.length > 1 ? 's' : ''} - Drag to move, double-click to delete`,
        canvas.width / 2,
        20
      )
    }
  }, [points, width, height, cornerRadius, hoveredIndex, selectedIndex, draggingIndex, isFinalized])

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Draw Custom Shape</h3>
        <div className="flex gap-2">
          {selectedIndex !== null && !isFinalized && (
            <button
              onClick={() => {
                onRemovePoint(selectedIndex)
                setSelectedIndex(null)
              }}
              className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              🗑 Delete Point #{selectedIndex + 1}
            </button>
          )}
          {!isFinalized && (
            <>
              <button
                onClick={onRemoveLastPoint}
                disabled={points.length === 0}
                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ↶ Undo
              </button>
              <button
                onClick={onClearPoints}
                disabled={points.length === 0}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ✕ Clear
              </button>
            </>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        onClick={!isFinalized ? handleClick : undefined}
        onDoubleClick={!isFinalized ? handleDoubleClick : undefined}
        onMouseDown={!isFinalized ? handleMouseDown : undefined}
        onMouseMove={!isFinalized ? handleMouseMove : undefined}
        onMouseUp={!isFinalized ? handleMouseUp : undefined}
        onMouseLeave={!isFinalized ? handleMouseUp : undefined}
        className={`w-full border border-gray-200 rounded ${isFinalized ? 'cursor-default' : 'cursor-crosshair'}`}
      />

      {!isFinalized && (
        <div className="mt-2 text-xs text-gray-600">
          <p>• <strong>Click</strong> on canvas to add points</p>
          <p>• <strong>Click & Drag</strong> points to move them</p>
          <p>• <strong>Double-click</strong> a point to delete it</p>
          <p>• <strong>Hover</strong> over points to see coordinates</p>
          <p>• First point is green, selected is yellow, others are blue</p>
        </div>
      )}

      {isFinalized && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800 font-medium">
            ✓ Custom shape applied! You can now add holes or other features.
          </p>
        </div>
      )}

      {!isFinalized && points.length >= 3 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center justify-between">
          <p className="text-xs text-green-800">
            ✓ Custom shape ready! ({points.length} points)
          </p>
          {onApplyShape && (
            <button
              onClick={onApplyShape}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              Apply Shape ✓
            </button>
          )}
        </div>
      )}

      {!isFinalized && points.length > 0 && points.length < 3 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            ⚠ Add {3 - points.length} more point{3 - points.length > 1 ? 's' : ''} to complete the shape
          </p>
        </div>
      )}

      {/* Point Coordinates Editor */}
      {points.length > 0 && !isFinalized && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Point Coordinates</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {points.map((point, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded ${
                  index === selectedIndex
                    ? 'bg-yellow-50 border border-yellow-300'
                    : index === hoveredIndex
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-1 min-w-[60px]">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-green-500' : index === selectedIndex ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-700">P{index + 1}</span>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600 w-4">X:</label>
                    <input
                      type="number"
                      value={Math.round(point.x)}
                      onChange={(e) => {
                        const newX = Number(e.target.value)
                        const clampedX = Math.max(0, Math.min(width, newX))
                        onUpdatePoint(index, { x: clampedX, y: point.y })
                      }}
                      onFocus={() => setSelectedIndex(index)}
                      min="0"
                      max={width}
                      step="1"
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-600 w-4">Y:</label>
                    <input
                      type="number"
                      value={Math.round(point.y)}
                      onChange={(e) => {
                        const newY = Number(e.target.value)
                        const clampedY = Math.max(0, Math.min(height, newY))
                        onUpdatePoint(index, { x: point.x, y: clampedY })
                      }}
                      onFocus={() => setSelectedIndex(index)}
                      min="0"
                      max={height}
                      step="1"
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    onRemovePoint(index)
                    setSelectedIndex(null)
                  }}
                  className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                  title="Delete point"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

