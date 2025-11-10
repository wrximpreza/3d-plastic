import { useConfigStore } from '../store/useConfigStore'

export function FloatingFormSelector() {
  const { config, updateForm } = useConfigStore()

  const forms = [
    { type: 'rectangle' as const, label: 'Rectangle', icon: '▭' },
    { type: 'circle' as const, label: 'Ellipse', icon: '●' },
    { type: 'pentagon' as const, label: 'Polygon', icon: '⬟' },
    { type: 'custom' as const, label: 'Free box', icon: '✏️' },
    { type: 'line' as const, label: 'Edges', icon: '─' },
  ]

  return (
    <>
      {/* Form Selector */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white border border-gray-300 rounded shadow-sm w-[360px] px-6 py-3">
          <h3 className="text-[10px] font-bold text-gray-900 uppercase tracking-wide mb-3">Form</h3>
          <div className="flex justify-between items-center">
            {forms.map((form) => (
              <button
                key={form.type}
                onClick={() => updateForm(form.type)}
                className="flex flex-col items-center justify-center gap-1.5 group w-[60px]"
                title={form.label}
              >
                <div className={`w-10 h-10 flex items-center justify-center text-2xl transition-colors ${
                  config.form === form.type ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'
                }`}>
                  {form.icon}
                </div>
                <div className={`text-[9px] transition-colors ${
                  config.form === form.type ? 'text-gray-900 font-semibold' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  {form.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full Screen Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen()
            } else {
              document.exitFullscreen()
            }
          }}
          className="bg-white border border-gray-300 rounded shadow-sm px-4 py-2 text-[10px] font-semibold uppercase tracking-wide hover:bg-gray-50 transition-colors"
        >
          FULL SCREEN
        </button>
      </div>
    </>
  )
}

