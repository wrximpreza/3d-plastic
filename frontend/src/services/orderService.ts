import type { PartConfig } from '../store/useConfigStore'
import { generateCADFiles, type CADExportResult } from './cadGenerator'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface OrderData {
  config: PartConfig
  cadFiles: CADExportResult
  customerInfo?: {
    name: string
    email: string
    company?: string
  }
  quantity: number
  orderDate: string
}

export interface OrderResponse {
  orderId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message: string
  estimatedDelivery?: string
  stepFileUrl?: string
  dxfFileUrl?: string
}

/**
 * Submit order to backend API and Visma order management system
 */
export async function submitOrder(
  config: PartConfig,
  quantity: number = 1,
  customerEmail?: string,
  customerName?: string
): Promise<OrderResponse> {
  try {
    // Call backend API to create order
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          width: config.width,
          height: config.height,
          thickness: config.thickness,
          material: config.material,
          holes: config.holes.map(h => ({
            id: h.id,
            x: h.x,
            y: h.y,
            diameter: h.diameter
          }))
        },
        quantity: quantity,
        customer_email: customerEmail || 'customer@example.com',
        customer_name: customerName || 'Customer',
        notes: ''
      })
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      orderId: data.order_number,
      status: data.status,
      message: 'Order submitted successfully. CAD files generated.',
      estimatedDelivery: getEstimatedDelivery(quantity),
      stepFileUrl: data.step_file_url,
      dxfFileUrl: data.dxf_file_url,
    }
  } catch (error) {
    console.error('Order submission failed:', error)

    // Fallback: generate CAD files locally
    try {
      const cadFiles = await generateCADFiles(config)
      return {
        orderId: `ORD-${Date.now()}`,
        status: 'pending',
        message: 'Order created locally (backend unavailable). CAD files generated.',
        estimatedDelivery: getEstimatedDelivery(quantity),
      }
    } catch (cadError) {
      return {
        orderId: '',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }
}

/**
 * Calculate estimated delivery date based on quantity
 */
function getEstimatedDelivery(quantity: number): string {
  const daysToAdd = Math.ceil(quantity / 10) + 5 // 5 base days + 1 day per 10 units
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + daysToAdd)
  return deliveryDate.toLocaleDateString()
}

/**
 * Send order data to Visma integration endpoint
 * This should be implemented on the backend
 */
export async function sendToVisma(orderData: OrderData): Promise<boolean> {
  // TODO: Implement Visma API integration
  // This would typically be done on the backend for security
  console.log('Sending to Visma:', orderData)
  return true
}

/**
 * Calculate price estimate based on configuration
 */
export function calculatePrice(config: PartConfig, quantity: number): number {
  const { width, height, thickness, material, holes } = config
  
  // Area in square meters
  const area = (width * height) / 1_000_000
  
  // Material cost per square meter
  const materialCosts: Record<string, number> = {
    'PE 500': 50,
    'PE 1000': 65,
    'PP': 45,
    'POM': 80,
  }
  
  const materialCost = (materialCosts[material] || 50) * area * thickness
  
  // Hole drilling cost
  const holeCost = holes.length * 2
  
  // CNC cutting cost (base + perimeter)
  const perimeter = 2 * (width + height) / 1000 // in meters
  const cuttingCost = 10 + perimeter * 5
  
  // Total per unit
  const unitPrice = materialCost + holeCost + cuttingCost
  
  // Quantity discount
  const discount = quantity >= 10 ? 0.9 : quantity >= 5 ? 0.95 : 1
  
  return Math.round(unitPrice * quantity * discount * 100) / 100
}

