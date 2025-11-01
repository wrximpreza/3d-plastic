import { useEffect, useRef } from 'react'
import type { PartConfig } from '../store/useConfigStore'

interface Preview2DProps {
  config: PartConfig
}

export function Preview2D({ config }: Preview2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate scale to fit canvas
    const padding = 40
    const scaleX = (canvas.width - padding * 2) / config.width
    const scaleY = (canvas.height - padding * 2) / config.height
    const scale = Math.min(scaleX, scaleY)

    // Center the drawing
    const offsetX = (canvas.width - config.width * scale) / 2
    const offsetY = (canvas.height - config.height * scale) / 2

    // Draw grid
    const gridSize = 50 // Grid spacing in mm

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    // Vertical grid lines
    for (let x = 0; x <= config.width; x += gridSize) {
      const canvasX = offsetX + x * scale
      ctx.beginPath()
      ctx.moveTo(canvasX, offsetY)
      ctx.lineTo(canvasX, offsetY + config.height * scale)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let y = 0; y <= config.height; y += gridSize) {
      const canvasY = offsetY + y * scale
      ctx.beginPath()
      ctx.moveTo(offsetX, canvasY)
      ctx.lineTo(offsetX + config.width * scale, canvasY)
      ctx.stroke()
    }

    // Draw grid labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'

    // X-axis labels
    for (let x = gridSize; x < config.width; x += gridSize) {
      const canvasX = offsetX + x * scale
      ctx.fillText(`${x}`, canvasX, offsetY - 3)
    }

    // Y-axis labels
    ctx.textAlign = 'right'
    for (let y = gridSize; y < config.height; y += gridSize) {
      const canvasY = offsetY + y * scale
      ctx.fillText(`${y}`, offsetX - 3, canvasY + 3)
    }

    // Draw shape based on form type
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 2
    ctx.fillStyle = 'rgba(224, 231, 255, 0.3)'

    ctx.beginPath()

    switch (config.form) {
      case 'circle': {
        const centerX = offsetX + (config.width * scale) / 2
        const centerY = offsetY + (config.height * scale) / 2
        const radius = (config.width * scale) / 2
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        break
      }

      case 'pentagon': {
        const centerX = offsetX + (config.width * scale) / 2
        const centerY = offsetY + (config.height * scale) / 2
        const radius = (config.width * scale) / 2
        const sides = 5
        const pentagonPoints: Array<{x: number, y: number}> = []

        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          pentagonPoints.push({ x, y })
        }

        if (config.cornerRadius > 0) {
          // Draw rounded pentagon
          const r = config.cornerRadius * scale
          const roundedPoints: Array<{start: {x: number, y: number}, arc: {x: number, y: number}, end: {x: number, y: number}}> = []

          for (let i = 0; i < pentagonPoints.length; i++) {
            const curr = pentagonPoints[i]
            const prev = pentagonPoints[(i - 1 + pentagonPoints.length) % pentagonPoints.length]
            const next = pentagonPoints[(i + 1) % pentagonPoints.length]

            const v1x = prev.x - curr.x
            const v1y = prev.y - curr.y
            const v2x = next.x - curr.x
            const v2y = next.y - curr.y

            const len1 = Math.sqrt(v1x * v1x + v1y * v1y)
            const len2 = Math.sqrt(v2x * v2x + v2y * v2y)

            if (len1 === 0 || len2 === 0) continue

            const n1x = v1x / len1
            const n1y = v1y / len1
            const n2x = v2x / len2
            const n2y = v2y / len2

            const angle = Math.acos(Math.max(-1, Math.min(1, n1x * n2x + n1y * n2y)))

            if (angle < 0.01) continue

            const dist = Math.min(r / Math.tan(angle / 2), len1 / 2, len2 / 2)

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

          if (roundedPoints.length > 0) {
            const firstPoint = roundedPoints[0]
            ctx.moveTo(firstPoint.start.x, firstPoint.start.y)

            for (let i = 0; i < roundedPoints.length; i++) {
              const current = roundedPoints[i]
              const next = roundedPoints[(i + 1) % roundedPoints.length]

              ctx.quadraticCurveTo(
                current.arc.x,
                current.arc.y,
                current.end.x,
                current.end.y
              )

              ctx.lineTo(next.start.x, next.start.y)
            }

            ctx.closePath()
          }
        } else {
          // Draw straight lines
          pentagonPoints.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y)
            } else {
              ctx.lineTo(point.x, point.y)
            }
          })
          ctx.closePath()
        }
        break
      }

      case 'line': {
        const lineWidth = Math.max(config.thickness, 5) * scale
        const centerX = offsetX + (config.width * scale) / 2
        ctx.rect(centerX - lineWidth / 2, offsetY, lineWidth, config.height * scale)
        break
      }

      case 'custom': {
        if (config.customPoints && config.customPoints.length >= 3) {
          config.customPoints.forEach((point, index) => {
            const x = offsetX + point.x * scale
            const y = offsetY + point.y * scale
            if (index === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          })
          ctx.closePath()
        } else {
          // Fallback to rectangle
          ctx.rect(offsetX, offsetY, config.width * scale, config.height * scale)
        }
        break
      }

      case 'rectangle':
      default: {
        ctx.rect(offsetX, offsetY, config.width * scale, config.height * scale)
        break
      }
    }

    ctx.fill()
    ctx.stroke()
    
    // Draw holes
    config.holes.forEach((hole) => {
      const x = offsetX + hole.x * scale
      const y = offsetY + hole.y * scale
      const radius = (hole.diameter / 2) * scale
      
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.5
      ctx.stroke()
      
      // Draw crosshair
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - radius - 5, y)
      ctx.lineTo(x + radius + 5, y)
      ctx.moveTo(x, y - radius - 5)
      ctx.lineTo(x, y + radius + 5)
      ctx.stroke()
    })
    
    // Draw dimensions
    ctx.fillStyle = '#374151'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'

    // Width dimension
    ctx.fillText(
      `${config.width} mm`,
      canvas.width / 2,
      offsetY - 25
    )

    // Height dimension
    ctx.save()
    ctx.translate(offsetX - 30, canvas.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${config.height} mm`, 0, 0)
    ctx.restore()
    
  }, [config])
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">2D Preview (Top View)</h3>
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="w-full border border-gray-200 rounded"
      />
    </div>
  )
}

