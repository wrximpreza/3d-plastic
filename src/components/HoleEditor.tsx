import { useState } from 'react'
import type { Hole } from '../store/useConfigStore'

interface HoleEditorProps {
  hole: Hole
  partWidth: number
  partHeight: number
  onUpdate: (hole: Hole) => void
  onRemove: () => void
  onClose: () => void
}

export function HoleEditor({ hole, partWidth, partHeight, onUpdate, onRemove, onClose }: HoleEditorProps) {
  const [editedHole, setEditedHole] = useState<Hole>(hole)

  const handleSave = () => {
    // Validate hole is within bounds
    const radius = editedHole.diameter / 2
    const validX = Math.max(radius, Math.min(partWidth - radius, editedHole.x))
    const validY = Math.max(radius, Math.min(partHeight - radius, editedHole.y))
    
    onUpdate({
      ...editedHole,
      x: validX,
      y: validY,
    })
    onClose()
  }

  const handleChange = (field: keyof Hole, value: number) => {
    setEditedHole(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit Hole</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
              min={editedHole.diameter / 2}
              max={partWidth - editedHole.diameter / 2}
              step="0.1"
              value={editedHole.x}
              onChange={(e) => handleChange('x', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Range: {(editedHole.diameter / 2).toFixed(1)} - {(partWidth - editedHole.diameter / 2).toFixed(1)}
            </p>
          </div>

          {/* Y Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y Position (mm)
            </label>
            <input
              type="number"
              min={editedHole.diameter / 2}
              max={partHeight - editedHole.diameter / 2}
              step="0.1"
              value={editedHole.y}
              onChange={(e) => handleChange('y', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Range: {(editedHole.diameter / 2).toFixed(1)} - {(partHeight - editedHole.diameter / 2).toFixed(1)}
            </p>
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
              value={editedHole.diameter}
              onChange={(e) => handleChange('diameter', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Common sizes: 3, 4, 5, 6, 8, 10, 12mm
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Preview</p>
            <p className="text-xs text-gray-600">
              Hole Ø{editedHole.diameter}mm at position ({editedHole.x.toFixed(1)}, {editedHole.y.toFixed(1)})
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save Changes
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to remove this hole?')) {
                onRemove()
                onClose()
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Remove
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

