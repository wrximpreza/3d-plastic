import { useState, useEffect } from 'react'
import { useConfigStore } from '../store/useConfigStore'

export function DimensionsPanel() {
  const { config, updateDimensions, updateThickness, updateCornerRadius } = useConfigStore()
  
  const [width, setWidth] = useState(config.width)
  const [height, setHeight] = useState(config.height)
  const [thickness, setThickness] = useState(config.thickness)
  const [cornerRadius, setCornerRadius] = useState(config.cornerRadius)

  // Debounce updates
  useEffect(() => {
    const timer = setTimeout(() => {
      updateDimensions(width, height)
    }, 300)
    return () => clearTimeout(timer)
  }, [width, height, updateDimensions])

  useEffect(() => {
    const timer = setTimeout(() => {
      updateThickness(thickness)
    }, 300)
    return () => clearTimeout(timer)
  }, [thickness, updateThickness])

  useEffect(() => {
    const timer = setTimeout(() => {
      updateCornerRadius(cornerRadius)
    }, 300)
    return () => clearTimeout(timer)
  }, [cornerRadius, updateCornerRadius])

  return (
    <div className="bg-white border border-gray-300 rounded p-3 shadow-sm">
      <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wide mb-3">Dimensions</h3>

      <div className="space-y-2.5">
        {/* Length and Width in a row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-700 mb-1">Length</label>
            <div className="relative">
              <input
                type="number"
                min="50"
                max="3000"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                placeholder="400 mm"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">mm</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-700 mb-1">Width</label>
            <div className="relative">
              <input
                type="number"
                min="50"
                max="2000"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                placeholder="400 mm"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">mm</span>
            </div>
          </div>
        </div>

        {/* Height field */}
        <div>
          <label className="block text-[10px] text-gray-700 mb-1">Height</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="100"
              value={thickness}
              onChange={(e) => setThickness(Number(e.target.value))}
              placeholder="16 mm"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">mm</span>
          </div>
        </div>

        {/* Corner Radius - only for rectangle */}
        {config.form === 'rectangle' && (
          <div>
            <label className="block text-[10px] text-gray-700 mb-1">Corner radius</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={cornerRadius}
                onChange={(e) => setCornerRadius(Number(e.target.value))}
                placeholder="5 mm"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">mm</span>
            </div>
          </div>
        )}

        {/* Action Icons */}
        <div className="flex gap-1.5 pt-1">
          {/* Closed Lock Icon */}
          <button
            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Lock aspect ratio"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="7" width="8" height="7" rx="1" fill="currentColor"/>
              <path d="M5 7V5C5 3.34 6.34 2 8 2C9.66 2 11 3.34 11 5V7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>

          {/* Open Lock Icon */}
          <button
            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Unlock"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 7V5C5 3.34 6.34 2 8 2C9.66 2 11 3.34 11 5V6" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>

          {/* Maximize/Fullscreen Icon */}
          <button
            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            title="Maximize"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="10" height="10" stroke="currentColor" strokeWidth="1.5" rx="0.5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

