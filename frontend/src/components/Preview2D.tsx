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

    // Draw rectangle
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 2
    ctx.strokeRect(
      offsetX,
      offsetY,
      config.width * scale,
      config.height * scale
    )

    // Fill rectangle
    ctx.fillStyle = 'rgba(224, 231, 255, 0.3)'
    ctx.fillRect(
      offsetX,
      offsetY,
      config.width * scale,
      config.height * scale
    )
    
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

