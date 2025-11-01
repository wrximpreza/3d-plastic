import { create } from 'zustand'

export type FormType = 'rectangle' | 'circle' | 'pentagon' | 'custom' | 'line'

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
  addHole: (hole: Hole) => void
  updateHole: (id: string, updates: Partial<Hole>) => void
  removeHole: (id: string) => void
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
  form: 'rectangle',
  width: 440,
  height: 600,
  thickness: 5,
  material: 'PE 500',
  color: '#FFFFFF',
  cornerRadius: 0,
  holes: [],
  customPoints: [],
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: defaultConfig,
  customShapeFinalized: false,

  updateForm: (form) =>
    set((state) => ({
      config: { ...state.config, form },
      // Reset customShapeFinalized when switching forms
      customShapeFinalized: form === 'custom' ? false : state.customShapeFinalized,
    })),

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

