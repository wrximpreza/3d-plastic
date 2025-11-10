import { useConfigStore } from '../store/useConfigStore'

export function Sidebar() {
  const {
    config,
    updateShowMeasurements,
    updateViewMode,
    updateDisplayMode
  } = useConfigStore()

  return (
    <div className="absolute top-4 left-4 z-10 bg-white border border-gray-300 rounded shadow-sm p-3 space-y-3 w-[140px]">
      {/* Show Measurements Checkbox */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="showMeasurements"
          checked={config.showMeasurements}
          onChange={(e) => updateShowMeasurements(e.target.checked)}
          className="w-4 h-4 mt-0.5 text-gray-900 border-gray-400 rounded focus:ring-gray-500"
        />
        <label htmlFor="showMeasurements" className="text-[9px] font-medium text-gray-700 uppercase tracking-wide leading-tight">
          Show with measurements
        </label>
      </div>

      {/* View Mode Buttons - disabled in 3D mode */}
      <div className="space-y-1">
        <button
          onClick={() => config.displayMode === '2d' && updateViewMode('front')}
          disabled={config.displayMode === '3d'}
          className={`w-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide rounded transition-colors ${
            config.displayMode === '3d'
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : config.viewMode === 'front'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Front View
        </button>
        <button
          onClick={() => config.displayMode === '2d' && updateViewMode('side')}
          disabled={config.displayMode === '3d'}
          className={`w-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide rounded transition-colors ${
            config.displayMode === '3d'
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : config.viewMode === 'side'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Side View
        </button>
        <button
          onClick={() => config.displayMode === '2d' && updateViewMode('top')}
          disabled={config.displayMode === '3d'}
          className={`w-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide rounded transition-colors ${
            config.displayMode === '3d'
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : config.viewMode === 'top'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Top View
        </button>
      </div>

      {/* 2D/3D Toggle */}
      <div className="flex gap-1.5">
        <button
          onClick={() => updateDisplayMode('2d')}
          className={`flex-1 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide rounded transition-colors ${
            config.displayMode === '2d'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          2D
        </button>
        <button
          onClick={() => updateDisplayMode('3d')}
          className={`flex-1 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide rounded transition-colors ${
            config.displayMode === '3d'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          3D
        </button>
      </div>
    </div>
  )
}

