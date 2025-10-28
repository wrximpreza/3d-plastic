import { useState, lazy, Suspense } from 'react'
import { ParametricEditor } from './components/ParametricEditor'
import { LoadingScreen } from './components/LoadingScreen'

// Lazy load the 3D viewer for better initial load performance
const Viewer3D = lazy(() => import('./components/Viewer3D').then(module => ({ default: module.Viewer3D })))

function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-white p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Plastic Configurator</h1>
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
        >
          {isPanelOpen ? 'Show 3D' : 'Edit'}
        </button>
      </div>

      {/* Editor Panel - Responsive */}
      <aside
        className={`
          ${isPanelOpen ? 'block' : 'hidden md:block'}
          w-full md:w-96 lg:w-[28rem]
          h-[calc(100vh-64px)] md:h-screen
          flex-shrink-0
        `}
      >
        <ParametricEditor />
      </aside>

      {/* 3D Viewer - Responsive with lazy loading */}
      <main
        className={`
          ${isPanelOpen ? 'hidden md:block' : 'block'}
          flex-1 relative
          h-[calc(100vh-64px)] md:h-screen
        `}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Viewer3D />
        </Suspense>
      </main>
    </div>
  )
}

export default App

