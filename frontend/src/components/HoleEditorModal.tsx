import { useState, useEffect } from 'react'
import { Hole } from '../store/useConfigStore'

interface HoleEditorModalProps {
  hole: Hole
  partWidth: number
  partHeight: number
  onUpdate: (hole: Hole) => void
  onRemove: () => void
  onClose: () => void
}

export function HoleEditorModal({ hole, partWidth, partHeight, onUpdate, onRemove, onClose }: HoleEditorModalProps) {
  const [x, setX] = useState(hole.x)
  const [y, setY] = useState(hole.y)
  const [diameter, setDiameter] = useState(hole.diameter)

  useEffect(() => {
    setX(hole.x)
    setY(hole.y)
    setDiameter(hole.diameter)
  }, [hole])

  const handleSave = () => {
    // Validate hole is within bounds
    const radius = diameter / 2
    const validX = Math.max(radius, Math.min(partWidth - radius, x))
    const validY = Math.max(radius, Math.min(partHeight - radius, y))
    
    onUpdate({
      ...hole,
      x: validX,
      y: validY,
      diameter
    })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Edit Hole</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* X Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X Position (mm)
            </label>
            <input
              type="number"
              min="0"
              max={partWidth}
              step="0.1"
              value={x}
              onChange={(e) => setX(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Y Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y Position (mm)
            </label>
            <input
              type="number"
              min="0"
              max={partHeight}
              step="0.1"
              value={y}
              onChange={(e) => setY(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Diameter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diameter (mm)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={diameter}
              onChange={(e) => setDiameter(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Common sizes: 3, 4, 5, 6, 8, 10, 12mm
            </p>
          </div>

          {/* Quick size buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Sizes
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 4, 5, 6, 8, 10, 12, 16].map((size) => (
                <button
                  key={size}
                  onClick={() => setDiameter(size)}
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    diameter === size
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  Ø{size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save
          </button>
          <button
            onClick={onRemove}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

