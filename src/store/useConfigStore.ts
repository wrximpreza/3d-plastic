import { create } from 'zustand'

export interface Hole {
  id: string
  x: number // Position from left edge (mm)
  y: number // Position from bottom edge (mm)
  diameter: number // mm
}

export interface PartConfig {
  width: number // mm
  height: number // mm
  thickness: number // mm
  material: string
  holes: Hole[]
}

interface ConfigStore {
  config: PartConfig
  updateDimensions: (width: number, height: number) => void
  updateThickness: (thickness: number) => void
  updateMaterial: (material: string) => void
  addHole: (hole: Hole) => void
  updateHole: (id: string, updates: Partial<Hole>) => void
  removeHole: (id: string) => void
  resetConfig: () => void
}

const defaultConfig: PartConfig = {
  width: 440,
  height: 600,
  thickness: 5,
  material: 'PE 500',
  holes: [
    // Default 8 holes around edges
    { id: '1', x: 50, y: 50, diameter: 8 },
    { id: '2', x: 390, y: 50, diameter: 8 },
    { id: '3', x: 50, y: 550, diameter: 8 },
    { id: '4', x: 390, y: 550, diameter: 8 },
    { id: '5', x: 220, y: 50, diameter: 8 },
    { id: '6', x: 220, y: 550, diameter: 8 },
    { id: '7', x: 50, y: 300, diameter: 8 },
    { id: '8', x: 390, y: 300, diameter: 8 },
  ],
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: defaultConfig,
  
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
  
  resetConfig: () => set({ config: defaultConfig }),
}))

