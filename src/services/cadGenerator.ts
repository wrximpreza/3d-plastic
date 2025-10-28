import type { PartConfig } from '../store/useConfigStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface ValidationInfo {
  valid: boolean
  errors: string[]
  warnings: string[]
  message: string
  file_size?: number
}

export interface CADExportResult {
  stepFile: Blob
  dxfFile: Blob
  metadata: {
    width: number
    height: number
    thickness: number
    material: string
    holeCount: number
    generatedAt: string
    validation?: ValidationInfo
  }
}

/**
 * Generate STEP and DXF files from part configuration
 * Calls backend API with FreeCAD integration
 */
export async function generateCADFiles(config: PartConfig): Promise<CADExportResult> {
  try {
    // Call backend API to generate CAD files
    const response = await fetch(`${API_URL}/api/cad/generate`, {
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
        format: 'both'
      })
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Fetch the generated files
    const stepResponse = await fetch(`${API_URL}${data.step_file_url}`)
    const dxfResponse = await fetch(`${API_URL}${data.dxf_file_url}`)

    const stepBlob = await stepResponse.blob()
    const dxfBlob = await dxfResponse.blob()

    return {
      stepFile: stepBlob,
      dxfFile: dxfBlob,
      metadata: {
        width: data.metadata.width,
        height: data.metadata.height,
        thickness: data.metadata.thickness,
        material: data.metadata.material,
        holeCount: data.metadata.holes_count,
        generatedAt: data.metadata.generated_at,
        validation: data.validation,
      },
    }
  } catch (error) {
    console.error('Failed to generate CAD files from backend, using fallback:', error)
    // Fallback to client-side generation if backend fails
    return generateCADFilesFallback(config)
  }
}

/**
 * Fallback client-side CAD generation
 */
async function generateCADFilesFallback(config: PartConfig): Promise<CADExportResult> {
  const stepContent = generateSTEPContent(config)
  const stepBlob = new Blob([stepContent], { type: 'application/step' })

  const dxfContent = generateDXFContent(config)
  const dxfBlob = new Blob([dxfContent], { type: 'application/dxf' })

  return {
    stepFile: stepBlob,
    dxfFile: dxfBlob,
    metadata: {
      width: config.width,
      height: config.height,
      thickness: config.thickness,
      material: config.material,
      holeCount: config.holes.length,
      generatedAt: new Date().toISOString(),
    },
  }
}

/**
 * Generate STEP file content (ISO 10303-21 format)
 * This is a simplified version - production should use FreeCAD
 */
function generateSTEPContent(config: PartConfig): string {
  const { width, height, thickness, holes } = config

  let entityId = 1
  const nextId = () => entityId++

  // Header
  let step = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Plastic Part - ${config.material}'),'2;1');
FILE_NAME('plastic_part.step','${new Date().toISOString()}',('Plastic Configurator'),(''),
  'Plastic Parts Configurator','','');
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));
ENDSEC;

DATA;
`

  // Basic geometric entities
  const origin = nextId()
  const zDir = nextId()
  const xDir = nextId()
  const axis = nextId()

  step += `#${origin}=CARTESIAN_POINT('',(0.,0.,0.));
#${zDir}=DIRECTION('',(0.,0.,1.));
#${xDir}=DIRECTION('',(1.,0.,0.));
#${axis}=AXIS2_PLACEMENT_3D('',#${origin},#${zDir},#${xDir});
`

  // Create box vertices
  const p1 = nextId()
  const p2 = nextId()
  const p3 = nextId()
  const p4 = nextId()
  const p5 = nextId()
  const p6 = nextId()
  const p7 = nextId()
  const p8 = nextId()

  step += `/* Box vertices: ${width}mm x ${height}mm x ${thickness}mm */
#${p1}=CARTESIAN_POINT('',(0.,0.,0.));
#${p2}=CARTESIAN_POINT('',(${width},0.,0.));
#${p3}=CARTESIAN_POINT('',(${width},${height},0.));
#${p4}=CARTESIAN_POINT('',(0.,${height},0.));
#${p5}=CARTESIAN_POINT('',(0.,0.,${thickness}));
#${p6}=CARTESIAN_POINT('',(${width},0.,${thickness}));
#${p7}=CARTESIAN_POINT('',(${width},${height},${thickness}));
#${p8}=CARTESIAN_POINT('',(0.,${height},${thickness}));
`

  // Create manifold solid
  const manifold = nextId()
  step += `#${manifold}=MANIFOLD_SOLID_BREP('PlasticPart',#${nextId()});
`

  // Add hole information as comments
  if (holes.length > 0) {
    step += `/* Holes: ${holes.length} total */\n`
    holes.forEach((hole, i) => {
      step += `/* Hole ${i + 1}: Ø${hole.diameter}mm at (${hole.x}, ${hole.y}) */\n`
    })
  }

  // Product definition
  const product = nextId()
  const productDef = nextId()
  const productDefForm = nextId()
  const productDefShape = nextId()
  const shapeRep = nextId()
  const shapeRepRel = nextId()

  step += `
#${product}=PRODUCT('PlasticPart','PlasticPart','',(#${nextId()}));
#${productDef}=PRODUCT_DEFINITION('design','',#${nextId()},#${nextId()});
#${productDefForm}=PRODUCT_DEFINITION_FORMATION('','',#${product});
#${productDefShape}=PRODUCT_DEFINITION_SHAPE('','',#${productDef});
#${shapeRep}=SHAPE_REPRESENTATION('',(#${axis},#${manifold}),#${nextId()});
#${shapeRepRel}=SHAPE_DEFINITION_REPRESENTATION(#${productDefShape},#${shapeRep});
`

  step += `ENDSEC;
END-ISO-10303-21;
`

  return step
}

/**
 * Generate DXF file content (AutoCAD Drawing Exchange Format)
 * This is a simplified version - production should use FreeCAD
 */
function generateDXFContent(config: PartConfig): string {
  const { width, height, holes } = config

  return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$INSUNITS
70
4
9
$MEASUREMENT
70
1
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LTYPE
70
1
0
LTYPE
2
CONTINUOUS
70
0
3
Solid line
72
65
73
0
40
0.0
0
ENDTAB
0
TABLE
2
LAYER
70
2
0
LAYER
2
GEOMETRY
70
0
62
7
6
CONTINUOUS
290
1
0
LAYER
2
OUTLINE
70
0
62
1
6
CONTINUOUS
290
1
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
OUTLINE
90
4
70
1
10
${-width/2}
20
${-height/2}
10
${width/2}
20
${-height/2}
10
${width/2}
20
${height/2}
10
${-width/2}
20
${height/2}
${holes.map((hole) => {
  const x = hole.x - width / 2
  const y = hole.y - height / 2
  return `0
CIRCLE
8
0
10
${x}
20
${y}
40
${hole.diameter / 2}`
}).join('\n')}
0
ENDSEC
0
EOF
`
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

