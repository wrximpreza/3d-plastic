import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useConfigStore, type Hole } from '../store/useConfigStore'
import { useEffect, useState } from 'react'
import { submitOrder, calculatePrice } from '../services/orderService'
import { generateCADFiles, downloadBlob } from '../services/cadGenerator'
import { Preview2D } from './Preview2D'
import { InteractivePreview2D } from './InteractivePreview2D'
import { HoleEditor } from './HoleEditor'

const configSchema = z.object({
  width: z.number().min(50).max(3000),
  height: z.number().min(50).max(2000),
  thickness: z.number().min(1).max(50),
  material: z.string(),
})

type ConfigFormData = z.infer<typeof configSchema>

export function ParametricEditor() {
  const { config, updateDimensions, updateThickness, updateMaterial, addHole, updateHole, removeHole } = useConfigStore()
  const [quantity, setQuantity] = useState(1)
  const [isOrdering, setIsOrdering] = useState(false)
  const [orderStatus, setOrderStatus] = useState<string>('')
  const [editingHole, setEditingHole] = useState<Hole | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null)
  const [isGeneratingCAD, setIsGeneratingCAD] = useState(false)

  const { register, watch, formState: { errors } } = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      width: config.width,
      height: config.height,
      thickness: config.thickness,
      material: config.material,
    },
  })

  const estimatedPrice = calculatePrice(config, quantity)
  
  // Watch form changes and update store with debouncing
  const watchedValues = watch()
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (watchedValues.width && watchedValues.height) {
        updateDimensions(watchedValues.width, watchedValues.height)
      }
      if (watchedValues.thickness) {
        updateThickness(watchedValues.thickness)
      }
      if (watchedValues.material) {
        updateMaterial(watchedValues.material)
      }
    }, 300) // 300ms debounce for <500ms update requirement
    
    return () => clearTimeout(timeout)
  }, [watchedValues, updateDimensions, updateThickness, updateMaterial])
  
  const handleAddHole = () => {
    const newHole = {
      id: Date.now().toString(),
      x: config.width / 2,
      y: config.height / 2,
      diameter: 8,
    }
    addHole(newHole)
  }

  const handleCanvasClick = (x: number, y: number) => {
    const newHole: Hole = {
      id: Date.now().toString(),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      diameter: 8,
    }
    addHole(newHole)
  }

  const handleHoleClick = (hole: Hole) => {
    setEditingHole(hole)
  }

  const handleHoleDrag = (holeId: string, x: number, y: number) => {
    updateHole(holeId, {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    })
  }

  const handleHoleUpdate = (updatedHole: Hole) => {
    updateHole(updatedHole.id, updatedHole)
  }

  const handlePlaceOrder = async () => {
    setIsOrdering(true)
    setOrderStatus('Processing order...')
    setNotification({ type: 'success', message: 'Processing order...' })

    try {
      const result = await submitOrder(config, quantity)

      if (result.status === 'pending') {
        setOrderStatus(`✓ Order ${result.orderId} submitted! Estimated delivery: ${result.estimatedDelivery}`)
        setNotification({
          type: 'success',
          message: `Order ${result.orderId} submitted! Estimated delivery: ${result.estimatedDelivery}`
        })

        // Generate and download CAD files
        const cadFiles = await generateCADFiles(config)
        downloadBlob(cadFiles.stepFile, `part_${result.orderId}.step`)
        downloadBlob(cadFiles.dxfFile, `part_${result.orderId}.dxf`)

        // Clear notification after 5 seconds
        setTimeout(() => setNotification(null), 5000)
      } else {
        setOrderStatus(`✗ Order failed: ${result.message}`)
        setNotification({ type: 'error', message: `Order failed: ${result.message}` })
        setTimeout(() => setNotification(null), 10000)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setOrderStatus(`✗ Error: ${errorMessage}`)
      setNotification({ type: 'error', message: `Order error: ${errorMessage}` })
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsOrdering(false)
    }
  }

  const handleDownloadCAD = async () => {
    if (isGeneratingCAD) return // Prevent multiple clicks

    setIsGeneratingCAD(true)
    try {
      setNotification({ type: 'success', message: 'Generating CAD files...' })
      const cadFiles = await generateCADFiles(config)

      // Check validation if available
      if (cadFiles.metadata && 'validation' in cadFiles.metadata) {
        const validation = (cadFiles.metadata as any).validation
        if (validation && !validation.valid) {
          setNotification({
            type: 'error',
            message: `CAD file validation failed: ${validation.errors.join(', ')}`
          })
          setIsGeneratingCAD(false)
          return
        }
        if (validation && validation.warnings && validation.warnings.length > 0) {
          setNotification({
            type: 'warning',
            message: `CAD files generated with warnings: ${validation.warnings.join(', ')}`
          })
        } else {
          setNotification({ type: 'success', message: 'CAD files generated successfully!' })
        }
      } else {
        setNotification({ type: 'success', message: 'CAD files downloaded successfully!' })
      }

      downloadBlob(cadFiles.stepFile, 'plastic_part.step')
      downloadBlob(cadFiles.dxfFile, 'plastic_part.dxf')

      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000)
    } catch (error) {
      console.error('Failed to generate CAD files:', error)
      setNotification({
        type: 'error',
        message: `Failed to generate CAD files: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      // Clear error notification after 10 seconds
      setTimeout(() => setNotification(null), 10000)
    } finally {
      setIsGeneratingCAD(false)
    }
  }
  
  return (
    <div className="h-full overflow-y-auto bg-white shadow-xl">
      <div className="p-4 md:p-6 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-yellow-50 border-yellow-200 text-yellow-800'
          } flex items-start justify-between`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {notification.type === 'success' && !isGeneratingCAD ? '✓' :
                 notification.type === 'error' ? '✗' :
                 notification.type === 'warning' ? '⚠' :
                 '⏳'}
              </span>
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            {!isGeneratingCAD && (
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Configure Part</h1>
          <p className="text-sm text-gray-600 mt-1">Customize your plastic part dimensions and holes</p>
        </div>
        
        {/* Interactive 2D Preview */}
        <InteractivePreview2D
          config={config}
          onHoleClick={handleHoleClick}
          onCanvasClick={handleCanvasClick}
          onHoleDrag={handleHoleDrag}
        />

        {/* Static 2D Preview */}
        <Preview2D config={config} />

        {/* Dimensions Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Dimensions</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                {...register('width', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.width && (
                <p className="text-red-500 text-xs mt-1">{errors.width.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (mm)
              </label>
              <input
                type="number"
                {...register('height', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.height && (
                <p className="text-red-500 text-xs mt-1">{errors.height.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thickness (mm)
              </label>
              <input
                type="number"
                {...register('thickness', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {errors.thickness && (
                <p className="text-red-500 text-xs mt-1">{errors.thickness.message}</p>
              )}
            </div>
          </div>
        </section>
        
        {/* Material Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Material</h2>
          <select
            {...register('material')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="PE 500">PE 500 (Polyethylene)</option>
            <option value="PE 1000">PE 1000 (High Density)</option>
            <option value="PP">PP (Polypropylene)</option>
            <option value="POM">POM (Acetal)</option>
          </select>
        </section>
        
        {/* Holes Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Holes ({config.holes.length})</h2>
            <button
              onClick={handleAddHole}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + Add Hole
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {config.holes.map((hole) => (
              <div
                key={hole.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setEditingHole(hole)}
              >
                <div className="text-sm">
                  <span className="font-medium">Ø{hole.diameter}mm</span>
                  <span className="text-gray-600 ml-2">
                    @ ({hole.x.toFixed(1)}, {hole.y.toFixed(1)})
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingHole(hole)
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeHole(hole.id)
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Price Estimate */}
        <section className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Quantity</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Estimated Price</span>
            <span className="text-2xl font-bold text-primary">${estimatedPrice}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Material: {config.material} • {config.holes.length} holes
          </p>
        </section>

        {/* Order Section */}
        <section className="pt-4 border-t space-y-3">
          <button
            onClick={handlePlaceOrder}
            disabled={isOrdering || isGeneratingCAD}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isOrdering ? 'Processing...' : 'Place Order'}
          </button>

          <button
            onClick={handleDownloadCAD}
            disabled={isGeneratingCAD || isOrdering}
            className={`w-full py-2 rounded-lg transition-colors font-medium ${
              isGeneratingCAD || isOrdering
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGeneratingCAD ? 'Generating...' : 'Download CAD Files (STEP/DXF)'}
          </button>

          {orderStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              orderStatus.startsWith('✓')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {orderStatus}
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            STEP/DXF files will be generated automatically
          </p>
        </section>
      </div>

      {/* Hole Editor Modal */}
      {editingHole && (
        <HoleEditor
          hole={editingHole}
          partWidth={config.width}
          partHeight={config.height}
          onUpdate={handleHoleUpdate}
          onRemove={() => removeHole(editingHole.id)}
          onClose={() => setEditingHole(null)}
        />
      )}
    </div>
  )
}

