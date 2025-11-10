import { create } from 'zustand'

export type FormType = 'rectangle' | 'circle' | 'pentagon' | 'custom' | 'line' | null

export interface Point {
  x: number
  y: number
}

export interface Hole {
  id: string
  x: number // Position from left edge (mm)
  y: number // Position from bottom edge (mm)
  diameter: number // mm
}

export type ViewMode = 'front' | 'side' | 'top'
export type DisplayMode = '2d' | '3d'

export interface PartConfig {
  form: FormType // Shape of the part
  width: number // mm
  height: number // mm
  thickness: number // mm
  material: string
  color?: string // Color hex code for material finish
  cornerRadius: number // Corner radius in mm (0 = sharp corners)
  holes: Hole[]
  assemblyDetails?: string // Assembly specifications and details
  customPoints?: Point[] // Custom shape points (for 'custom' form)
  showMeasurements: boolean // Show measurements on canvas
  viewMode: ViewMode // Current view mode
  displayMode: DisplayMode // 2D or 3D display
}

interface ConfigStore {
  config: PartConfig
  customShapeFinalized: boolean
  updateForm: (form: FormType) => void
  updateDimensions: (width: number, height: number) => void
  updateThickness: (thickness: number) => void
  updateMaterial: (material: string) => void
  updateColor: (color: string) => void
  updateCornerRadius: (radius: number) => void
  updateAssemblyDetails: (details: string) => void
  updateShowMeasurements: (show: boolean) => void
  updateViewMode: (mode: ViewMode) => void
  updateDisplayMode: (mode: DisplayMode) => void
  addHole: (hole: Hole) => void
  updateHole: (id: string, updates: Partial<Hole>) => void
  removeHole: (id: string) => void
  removeAllHoles: () => void
  setCustomPoints: (points: Point[]) => void
  addCustomPoint: (point: Point) => void
  updateCustomPoint: (index: number, point: Point) => void
  removeCustomPoint: (index: number) => void
  removeLastCustomPoint: () => void
  clearCustomPoints: () => void
  finalizeCustomShape: () => void
  editCustomShape: () => void
  resetConfig: () => void
}

const defaultConfig: PartConfig = {
  form: null, // No form selected initially
  width: 400, // Default dimensions when form is selected (matches image)
  height: 400,
  thickness: 16,
  material: 'PEEK',
  color: '#6B6B6B', // Gray color
  cornerRadius: 0, // Sharp corners by default
  holes: [],
  customPoints: [],
  showMeasurements: false, // Measurements disabled by default
  viewMode: 'front',
  displayMode: '2d',
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: defaultConfig,
  customShapeFinalized: false,
  savedCustomShape: null as { points: Point[], finalized: boolean } | null,

  updateForm: (form) =>
    set((state) => {
      let customPoints: Point[] = []
      let customShapeFinalized = false

      if (form === 'custom') {
        // Restore saved custom shape if exists
        if ((state as any).savedCustomShape) {
          customPoints = (state as any).savedCustomShape.points
          customShapeFinalized = (state as any).savedCustomShape.finalized
        }
      } else {
        // Save current custom shape before switching away
        if (state.config.form === 'custom' && state.config.customPoints && state.config.customPoints.length > 0) {
          (state as any).savedCustomShape = {
            points: state.config.customPoints,
            finalized: state.customShapeFinalized
          }
        }
      }

      return {
        config: {
          ...state.config,
          form,
          holes: [], // Clear holes when changing form
          customPoints
        },
        customShapeFinalized,
        savedCustomShape: (state as any).savedCustomShape
      }
    }),

  updateDimensions: (width, height) =>
    set((state) => ({
      config: { ...state.config, width, height },
    })),

  updateThickness: (thickness) =>
    set((state) => ({
      config: { ...state.config, thickness },
    })),

  updateMaterial: (material) =>
    set((state) => ({
      config: { ...state.config, material },
    })),

  updateColor: (color) =>
    set((state) => ({
      config: { ...state.config, color },
    })),

  updateCornerRadius: (radius) =>
    set((state) => ({
      config: { ...state.config, cornerRadius: radius },
    })),

  updateAssemblyDetails: (details) =>
    set((state) => ({
      config: { ...state.config, assemblyDetails: details },
    })),

  updateShowMeasurements: (show) =>
    set((state) => ({
      config: { ...state.config, showMeasurements: show },
    })),

  updateViewMode: (mode) =>
    set((state) => ({
      config: { ...state.config, viewMode: mode },
    })),

  updateDisplayMode: (mode) =>
    set((state) => ({
      config: { ...state.config, displayMode: mode },
    })),

  addHole: (hole) =>
    set((state) => ({
      config: {
        ...state.config,
        holes: [...state.config.holes, hole],
      },
    })),

  updateHole: (id, updates) =>
    set((state) => ({
      config: {
        ...state.config,
        holes: state.config.holes.map((hole) =>
          hole.id === id ? { ...hole, ...updates } : hole
        ),
      },
    })),

  removeHole: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        holes: state.config.holes.filter((hole) => hole.id !== id),
      },
    })),

  removeAllHoles: () =>
    set((state) => ({
      config: {
        ...state.config,
        holes: [],
      },
    })),

  setCustomPoints: (points) =>
    set((state) => ({
      config: { ...state.config, customPoints: points },
    })),

  addCustomPoint: (point) =>
    set((state) => ({
      config: {
        ...state.config,
        customPoints: [...(state.config.customPoints || []), point],
      },
    })),

  updateCustomPoint: (index, point) =>
    set((state) => ({
      config: {
        ...state.config,
        customPoints: (state.config.customPoints || []).map((p, i) =>
          i === index ? point : p
        ),
      },
    })),

  removeCustomPoint: (index) =>
    set((state) => ({
      config: {
        ...state.config,
        customPoints: (state.config.customPoints || []).filter((_, i) => i !== index),
      },
    })),

  removeLastCustomPoint: () =>
    set((state) => ({
      config: {
        ...state.config,
        customPoints: (state.config.customPoints || []).slice(0, -1),
      },
    })),

  clearCustomPoints: () =>
    set((state) => ({
      config: { ...state.config, customPoints: [] },
      customShapeFinalized: false,
    })),

  finalizeCustomShape: () =>
    set(() => ({
      customShapeFinalized: true,
    })),

  editCustomShape: () =>
    set(() => ({
      customShapeFinalized: false,
    })),

  resetConfig: () => set({ config: defaultConfig, customShapeFinalized: false }),
}))

