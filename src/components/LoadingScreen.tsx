export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mb-4"></div>
        <h2 className="text-white text-xl font-semibold">Loading 3D Viewer...</h2>
        <p className="text-gray-400 text-sm mt-2">Initializing configurator</p>
      </div>
    </div>
  )
}

