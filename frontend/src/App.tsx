import { lazy, Suspense } from 'react'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { FloatingFormSelector } from './components/FloatingFormSelector'
import { DimensionsPanel } from './components/DimensionsPanel'
import { OpeningsPanel } from './components/OpeningsPanel'
import { useConfigStore } from './store/useConfigStore'

// Lazy load the 3D viewer for better initial load performance
const GLBViewer = lazy(() => import('./components/GLBViewer').then(module => ({ default: module.GLBViewer })))

// Simple fallback component (no loading screen)
const EmptyFallback = () => <div className="w-full h-full bg-white" />

function App() {
  const { config } = useConfigStore()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col">
        {/* Canvas Area with dot grid background */}
        <div className="flex-1 relative dot-grid">
          {/* Left Control Panel - floating */}
          <Sidebar />

          {/* Floating Form Selector */}
          <FloatingFormSelector />

          {/* Dimensions Panel - floating on right side when form is selected */}
          {config.form && (
            <div className="absolute top-4 right-4 z-10 space-y-3">
              <DimensionsPanel />
              <OpeningsPanel />
            </div>
          )}

          {config.displayMode === '2d' ? (
            <Canvas />
          ) : (
            <Suspense fallback={<EmptyFallback />}>
              <GLBViewer />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  )
}

export default App

