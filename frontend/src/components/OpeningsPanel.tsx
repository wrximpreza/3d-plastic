import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '../store/useConfigStore'

type OpeningType = 'remove' | 'centre' | 'corner'

export function OpeningsPanel() {
  const { config, addHole, removeAllHoles } = useConfigStore()
  const [selectedType, setSelectedType] = useState<OpeningType | null>(null)
  const [openingSize, setOpeningSize] = useState(5)
  const [distanceFromEdge, setDistanceFromEdge] = useState(40)

  const createCentreHole = useCallback(() => {
    removeAllHoles()
    addHole({
      id: Date.now().toString(),
      x: config.width / 2,
      y: config.height / 2,
      diameter: openingSize
    })
  }, [config.width, config.height, openingSize, addHole, removeAllHoles])

  const createCornerHoles = useCallback(() => {
    removeAllHoles()
    const timestamp = Date.now()

    // Top-left corner
    addHole({
      id: `${timestamp}-tl`,
      x: distanceFromEdge,
      y: distanceFromEdge,
      diameter: openingSize
    })

    // Top-right corner
    addHole({
      id: `${timestamp}-tr`,
      x: config.width - distanceFromEdge,
      y: distanceFromEdge,
      diameter: openingSize
    })

    // Bottom-left corner
    addHole({
      id: `${timestamp}-bl`,
      x: distanceFromEdge,
      y: config.height - distanceFromEdge,
      diameter: openingSize
    })

    // Bottom-right corner
    addHole({
      id: `${timestamp}-br`,
      x: config.width - distanceFromEdge,
      y: config.height - distanceFromEdge,
      diameter: openingSize
    })
  }, [config.width, config.height, openingSize, distanceFromEdge, addHole, removeAllHoles])

  const handleTypeClick = (type: OpeningType) => {
    setSelectedType(type)

    if (type === 'remove') {
      removeAllHoles()
      setSelectedType(null)
    } else if (type === 'centre') {
      createCentreHole()
    } else if (type === 'corner') {
      createCornerHoles()
    }
  }

  // Update holes when openingSize or distanceFromEdge changes
  useEffect(() => {
    if (selectedType === 'centre') {
      createCentreHole()
    } else if (selectedType === 'corner') {
      createCornerHoles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openingSize, distanceFromEdge])

  return (
    <div className="bg-white border border-gray-300 rounded p-3 shadow-sm">
      <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wide mb-3">Openings</h3>

      <div className="space-y-2.5">
        {/* Opening Type Selection */}
        <div className="grid grid-cols-3 gap-2">
          {/* Remove */}
          <button
            onClick={() => handleTypeClick('remove')}
            className={`flex flex-col items-center justify-center p-2 border rounded transition-colors ${
              selectedType === 'remove'
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="text-[9px] mt-0.5">remove</span>
          </button>

          {/* Centre */}
          <button
            onClick={() => handleTypeClick('centre')}
            className={`flex flex-col items-center justify-center p-2 border rounded transition-colors ${
              selectedType === 'centre'
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <circle cx="16" cy="16" r="3" fill="currentColor"/>
            </svg>
            <span className="text-[9px] mt-0.5">centre</span>
          </button>

          {/* Corner */}
          <button
            onClick={() => handleTypeClick('corner')}
            className={`flex flex-col items-center justify-center p-2 border rounded transition-colors ${
              selectedType === 'corner'
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <circle cx="9" cy="9" r="2" fill="currentColor"/>
              <circle cx="23" cy="9" r="2" fill="currentColor"/>
              <circle cx="9" cy="23" r="2" fill="currentColor"/>
              <circle cx="23" cy="23" r="2" fill="currentColor"/>
            </svg>
            <span className="text-[9px] mt-0.5">corner</span>
          </button>
        </div>

        {/* Opening Size */}
        <div>
          <label className="block text-[10px] text-gray-700 mb-1">Opening size</label>
          <input
            type="number"
            min="1"
            max="100"
            value={openingSize}
            onChange={(e) => setOpeningSize(Number(e.target.value))}
            placeholder="5 mm"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Distance from Edge */}
        <div>
          <label className="block text-[10px] text-gray-700 mb-1">Distance from edge</label>
          <input
            type="number"
            min="1"
            max="500"
            value={distanceFromEdge}
            onChange={(e) => setDistanceFromEdge(Number(e.target.value))}
            placeholder="40 mm"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

