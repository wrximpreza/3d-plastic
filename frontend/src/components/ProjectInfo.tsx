import { useConfigStore } from '../store/useConfigStore'

export function ProjectInfo() {
  const { config } = useConfigStore()

  const getFormName = () => {
    switch (config.form) {
      case 'rectangle': return 'Rectangle'
      case 'circle': return 'Circle'
      case 'pentagon': return 'Pentagon'
      case 'custom': return 'Custom Shape'
      case 'line': return 'Line'
      default: return 'Unknown'
    }
  }

  const calculateArea = () => {
    if (config.form === 'rectangle') {
      return (config.width * config.height / 1000).toFixed(2)
    } else if (config.form === 'circle') {
      const radius = Math.min(config.width, config.height) / 2
      return (Math.PI * radius * radius / 1000).toFixed(2)
    }
    return 'N/A'
  }

  return (
    <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72">
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Project</h3>
          <p className="text-sm text-gray-900 font-medium">
            {getFormName()}
            {config.cornerRadius > 0 && config.form === 'rectangle' && (
              <span className="text-gray-600 font-normal"> • R{config.cornerRadius}mm</span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {config.holes.length} opening{config.holes.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Dimensions</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Length:</span>
              <span className="font-medium text-gray-900">{config.width} mm</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Width:</span>
              <span className="font-medium text-gray-900">{config.height} mm</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Thickness:</span>
              <span className="font-medium text-gray-900">{config.thickness} mm</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Area:</span>
              <span className="font-medium text-gray-900">{calculateArea()} cm²</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Material</h4>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded border border-gray-300 flex-shrink-0 shadow-sm"
              style={{ backgroundColor: config.color }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{config.material}</p>
              <p className="text-xs text-gray-500">{config.thickness}mm available</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">View:</span>
            <span className="text-xs font-medium text-gray-900 uppercase">
              {config.viewMode} • {config.displayMode}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

