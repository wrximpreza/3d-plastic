import { useConfigStore } from '../store/useConfigStore'

export function RightSidebar() {
  const { config } = useConfigStore()

  return (
    <div className="w-[240px] bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Project Info */}
        <div>
          <h3 className="text-xs font-bold text-gray-900 mb-2">Project name:</h3>
          <p className="text-xs text-gray-700">
            {config.form ? `${config.form.charAt(0).toUpperCase() + config.form.slice(1)} with hole and 45 degree recess step.` : 'No shape selected'}
          </p>
        </div>

        {/* Dimensions Info */}
        {config.form && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-900">Length:</span>
              <span className="text-xs text-gray-700">{config.width} mm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-900">Width:</span>
              <span className="text-xs text-gray-700">{config.height} mm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-900">Thickness:</span>
              <span className="text-xs text-gray-700">{config.thickness} mm</span>
            </div>
          </div>
        )}

        {/* Material Section */}
        {config.form && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="5" width="30" height="30" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="2"/>
                  <path d="M10 10L30 30M30 10L10 30" stroke="#9CA3AF" strokeWidth="1"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-900 mb-1">Material</div>
                <div className="text-xs text-gray-700 font-semibold">{config.material}</div>
                <div className="text-xs text-gray-600">{config.thickness} mm in stock</div>
              </div>
            </div>
          </div>
        )}

        {/* Price Section */}
        {config.form && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-900">Pris:</span>
              <span className="text-xs text-gray-700">[not calculated yet]</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

