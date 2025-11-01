"""
CAD Generation Service using FreeCAD

This service generates STEP and DXF files from parametric part configurations.
"""

import os
import sys
import tempfile
import subprocess
from pathlib import Path
from typing import Tuple, Optional
from schemas import PartConfig


class CADGenerationError(Exception):
    """Custom exception for CAD generation errors"""
    pass


class FreeCADService:
    """Service for generating CAD files using FreeCAD"""
    
    def __init__(self, freecad_path: str = None, freecad_python: str = None):
        """
        Initialize FreeCAD service

        Args:
            freecad_path: Path to FreeCAD library (optional)
            freecad_python: Path to FreeCADCmd executable (optional)
        """
        self.freecad_path = freecad_path
        self.freecad_python = freecad_python
        self._freecad_available = False
        self._freecad_subprocess_available = False
        self._init_freecad()
        self._check_freecad_subprocess()
    
    def _init_freecad(self):
        """Initialize FreeCAD Python module"""
        try:
            if self.freecad_path and os.path.exists(self.freecad_path):
                sys.path.append(self.freecad_path)

            import FreeCAD
            import Part

            self.FreeCAD = FreeCAD
            self.Part = Part
            self._freecad_available = True

            print(f"✅ FreeCAD {FreeCAD.Version()[0]}.{FreeCAD.Version()[1]} loaded successfully")

        except ImportError as e:
            print(f"Warning: FreeCAD not available: {e}")
            print("CAD generation will use fallback mode")
            self._freecad_available = False
        except Exception as e:
            print(f"Warning: FreeCAD initialization error: {e}")
            print("CAD generation will use fallback mode")
            self._freecad_available = False

    def _check_freecad_subprocess(self):
        """Check if FreeCAD can be used as subprocess"""
        if not self.freecad_python or not os.path.exists(self.freecad_python):
            return

        try:
            # Test FreeCAD subprocess
            result = subprocess.run(
                [self.freecad_python, '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                self._freecad_subprocess_available = True
                print(f"✅ FreeCAD subprocess available at {self.freecad_python}")
        except Exception as e:
            print(f"Warning: FreeCAD subprocess not available: {e}")

    def generate_step_file(self, config: PartConfig, output_path: str) -> str:
        """
        Generate STEP file from part configuration

        Args:
            config: Part configuration
            output_path: Path to save STEP file

        Returns:
            Path to generated STEP file
        """
        # Try subprocess method first if available
        if not self._freecad_available and self._freecad_subprocess_available:
            return self._generate_step_subprocess(config, output_path)

        if not self._freecad_available:
            return self._generate_step_fallback(config, output_path)
        
        try:
            # Create new document
            doc = self.FreeCAD.newDocument("PlasticPart")

            # Get configuration parameters
            width_mm = config.width
            height_mm = config.height
            thickness_mm = config.thickness
            corner_radius = getattr(config, 'corner_radius', 0)
            form = getattr(config, 'form', 'rectangle')

            # Create base shape based on form type
            if form == 'circle':
                # Create cylinder
                radius = width_mm / 2
                box = self.Part.makeCylinder(radius, thickness_mm)
                # Move to center
                box.translate(self.FreeCAD.Vector(-radius, -radius, 0))

            elif form == 'pentagon':
                # Create pentagon using wire and extrusion
                import math
                radius = width_mm / 2
                sides = 5
                points = []
                for i in range(sides):
                    angle = (i / sides) * 2 * math.pi - math.pi / 2
                    x = math.cos(angle) * radius
                    y = math.sin(angle) * radius
                    points.append(self.FreeCAD.Vector(x, y, 0))
                points.append(points[0])  # Close the shape

                wire = self.Part.makePolygon(points)
                face = self.Part.Face(wire)
                box = face.extrude(self.FreeCAD.Vector(0, 0, thickness_mm))

            elif form == 'line':
                # Create thin line
                line_width = max(thickness_mm, 5)
                box = self.Part.makeBox(line_width, height_mm, thickness_mm)
                # Center the line
                box.translate(self.FreeCAD.Vector(-line_width / 2, -height_mm / 2, 0))

            elif form == 'custom':
                # Create custom shape from user-drawn points
                custom_points = getattr(config, 'custom_points', None)
                if custom_points and len(custom_points) >= 3:
                    points = []
                    for point in custom_points:
                        points.append(self.FreeCAD.Vector(point.x, point.y, 0))
                    points.append(points[0])  # Close the shape

                    wire = self.Part.makePolygon(points)
                    face = self.Part.Face(wire)
                    box = face.extrude(self.FreeCAD.Vector(0, 0, thickness_mm))
                else:
                    # Fallback to rectangle if no custom points
                    box = self.Part.makeBox(width_mm, height_mm, thickness_mm)

            else:  # rectangle
                # Create box
                box = self.Part.makeBox(width_mm, height_mm, thickness_mm)

                # Apply rounded corners if specified
                if corner_radius > 0:
                    try:
                        # Get all edges and fillet the vertical ones
                        edges_to_fillet = []
                        for edge in box.Edges:
                            # Check if edge is vertical (parallel to Z axis)
                            if abs(edge.tangentAt(0).z) > 0.9:
                                edges_to_fillet.append(edge)

                        if edges_to_fillet:
                            box = box.makeFillet(corner_radius, edges_to_fillet)
                    except Exception as fillet_error:
                        print(f"Warning: Could not apply corner radius: {fillet_error}")

            # Create holes
            for hole in config.holes:
                # Create cylinder for hole
                hole_radius = hole.diameter / 2
                hole_x = hole.x
                hole_y = hole.y

                # Adjust hole position based on form type
                if form == 'circle' or form == 'pentagon':
                    # For circle/pentagon, holes are relative to center
                    hole_x = hole_x - width_mm / 2
                    hole_y = hole_y - height_mm / 2
                elif form == 'line':
                    # For line, center horizontally
                    line_width = max(thickness_mm, 5)
                    hole_x = hole_x - width_mm / 2
                    hole_y = hole_y - height_mm / 2

                # Create cylinder through the entire thickness
                cylinder = self.Part.makeCylinder(
                    hole_radius,
                    thickness_mm,
                    self.FreeCAD.Vector(hole_x, hole_y, 0),
                    self.FreeCAD.Vector(0, 0, 1)
                )

                # Subtract hole from box
                box = box.cut(cylinder)

            # Create Part object
            part = doc.addObject("Part::Feature", "PlasticPart")
            part.Shape = box
            part.Label = f"PlasticPart_{config.material.replace(' ', '_')}"

            # Add metadata as properties
            try:
                part.addProperty("App::PropertyString", "Material", "Part", "Material type")
                part.Material = config.material
                part.addProperty("App::PropertyFloat", "Width", "Dimensions", "Width in mm")
                part.Width = width_mm
                part.addProperty("App::PropertyFloat", "Height", "Dimensions", "Height in mm")
                part.Height = height_mm
                part.addProperty("App::PropertyFloat", "Thickness", "Dimensions", "Thickness in mm")
                part.Thickness = thickness_mm
                part.addProperty("App::PropertyInteger", "HoleCount", "Part", "Number of holes")
                part.HoleCount = len(config.holes)
            except Exception as prop_error:
                print(f"Warning: Could not add properties: {prop_error}")

            # Export to STEP
            self.Part.export([part], output_path)

            # Close document
            self.FreeCAD.closeDocument(doc.Name)

            return output_path

        except Exception as e:
            raise CADGenerationError(f"Failed to generate STEP file: {str(e)}")
    
    def generate_dxf_file(self, config: PartConfig, output_path: str) -> str:
        """
        Generate DXF file from part configuration (2D top view)

        Args:
            config: Part configuration
            output_path: Path to save DXF file

        Returns:
            Path to generated DXF file
        """
        # Always use fallback for DXF to avoid locale issues with FreeCAD's importDXF
        # The fallback DXF is actually more reliable and compatible
        return self._generate_dxf_fallback(config, output_path)
    
    def _generate_step_subprocess(self, config: PartConfig, output_path: str) -> str:
        """Generate STEP file using FreeCAD subprocess"""
        # Create Python script for FreeCAD
        script = f"""
import FreeCAD
import Part
import sys

# Create new document
doc = FreeCAD.newDocument("PlasticPart")

# Create base box
box = Part.makeBox({config.width}, {config.height}, {config.thickness})

# Create holes
holes_data = {[(h.x, h.y, h.diameter) for h in config.holes]}
for hole_x, hole_y, hole_diameter in holes_data:
    cylinder = Part.makeCylinder(
        hole_diameter / 2,
        {config.thickness},
        FreeCAD.Vector(hole_x, hole_y, 0),
        FreeCAD.Vector(0, 0, 1)
    )
    box = box.cut(cylinder)

# Create part object
part = doc.addObject("Part::Feature", "PlasticPart")
part.Shape = box
part.Label = "PlasticPart_{config.material.replace(' ', '_')}"

# Add metadata as properties
part.addProperty("App::PropertyString", "Material", "Part", "Material type")
part.Material = "{config.material}"
part.addProperty("App::PropertyFloat", "Width", "Dimensions", "Width in mm")
part.Width = {config.width}
part.addProperty("App::PropertyFloat", "Height", "Dimensions", "Height in mm")
part.Height = {config.height}
part.addProperty("App::PropertyFloat", "Thickness", "Dimensions", "Thickness in mm")
part.Thickness = {config.thickness}
part.addProperty("App::PropertyInteger", "HoleCount", "Part", "Number of holes")
part.HoleCount = {len(config.holes)}

# Export to STEP
Part.export([part], r"{output_path}")

# Validate export
import os
if not os.path.exists(r"{output_path}"):
    print("ERROR: STEP file was not created", file=sys.stderr)
    sys.exit(1)

file_size = os.path.getsize(r"{output_path}")
if file_size < 100:
    print(f"ERROR: STEP file is too small ({{file_size}} bytes)", file=sys.stderr)
    sys.exit(1)

print(f"SUCCESS: STEP file created ({{file_size}} bytes)")

# Close document
FreeCAD.closeDocument(doc.Name)
"""

        # Write script to temporary file
        script_path = output_path.replace('.step', '_script.py')
        with open(script_path, 'w') as f:
            f.write(script)

        try:
            # Run FreeCAD subprocess
            result = subprocess.run(
                [self.freecad_python, script_path],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                print(f"FreeCAD subprocess error: {result.stderr}")
                raise CADGenerationError(f"FreeCAD subprocess failed: {result.stderr}")

            # Log FreeCAD output
            if result.stdout:
                print(f"FreeCAD output: {result.stdout}")

            # Validate the generated file
            validation_result = self._validate_step_file(output_path, config)
            if not validation_result['valid']:
                raise CADGenerationError(f"STEP file validation failed: {validation_result['errors']}")

            print(f"✅ STEP file validated: {validation_result['message']}")

            # Clean up script file
            os.remove(script_path)

            return output_path

        except subprocess.TimeoutExpired:
            raise CADGenerationError("FreeCAD subprocess timed out")
        except Exception as e:
            raise CADGenerationError(f"FreeCAD subprocess error: {str(e)}")

    def _validate_step_file(self, file_path: str, config: PartConfig) -> dict:
        """
        Validate generated STEP file

        Args:
            file_path: Path to STEP file
            config: Original part configuration

        Returns:
            Dictionary with validation results
        """
        errors = []
        warnings = []

        # Check file exists
        if not os.path.exists(file_path):
            return {
                'valid': False,
                'errors': ['STEP file does not exist'],
                'warnings': [],
                'message': 'File not found'
            }

        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            errors.append('STEP file is empty (0 bytes)')
        elif file_size < 100:
            errors.append(f'STEP file is too small ({file_size} bytes)')

        # Read and validate STEP content
        try:
            with open(file_path, 'r') as f:
                content = f.read()

            # Check STEP format header
            if not content.startswith('ISO-10303-21'):
                errors.append('Invalid STEP format: missing ISO-10303-21 header')

            if 'END-ISO-10303-21' not in content:
                errors.append('Invalid STEP format: missing END-ISO-10303-21 footer')

            # Check for material information (more flexible matching)
            # Note: FreeCAD's standard STEP export doesn't include custom properties
            # Material info is only in fallback mode or if FreeCAD properties are exported
            material_found = (
                config.material in content or
                config.material.replace(' ', '_') in content or
                config.material.replace(' ', '') in content
            )
            # Only warn if using fallback mode (which should have material)
            if not material_found and 'FreeCAD Fallback' in content:
                warnings.append(f'Material "{config.material}" not found in STEP file')

            # Check for dimension references (more flexible matching)
            # Convert to int/float to handle both integer and decimal representations
            # FreeCAD uses format like "440." or "440.0" in CARTESIAN_POINT
            width_int = int(config.width) if config.width == int(config.width) else config.width
            width_variations = [
                str(width_int),
                f'{width_int}.',
                f'{config.width}',
                f'{config.width}.',
                f'{float(config.width)}',
                f'({width_int}',
                f'{config.width}mm'
            ]
            if not any(var in content for var in width_variations):
                warnings.append(f'Width dimension ({config.width}mm) not clearly referenced')

            height_int = int(config.height) if config.height == int(config.height) else config.height
            height_variations = [
                str(height_int),
                f'{height_int}.',
                f'{config.height}',
                f'{config.height}.',
                f'{float(config.height)}',
                f'({height_int}',
                f'{config.height}mm'
            ]
            if not any(var in content for var in height_variations):
                warnings.append(f'Height dimension ({config.height}mm) not clearly referenced')

            thickness_int = int(config.thickness) if config.thickness == int(config.thickness) else config.thickness
            thickness_variations = [
                str(thickness_int),
                f'{thickness_int}.',
                f'{config.thickness}',
                f'{config.thickness}.',
                f'{float(config.thickness)}',
                f'({thickness_int}',
                f'{config.thickness}mm'
            ]
            if not any(var in content for var in thickness_variations):
                warnings.append(f'Thickness dimension ({config.thickness}mm) not clearly referenced')

            # Check for hole count reference
            hole_count = len(config.holes)
            if hole_count > 0:
                # Look for cylinder or hole references
                if 'CYLINDRICAL_SURFACE' not in content and 'CIRCLE' not in content and str(hole_count) not in content:
                    warnings.append(f'Expected {hole_count} holes but no cylindrical surfaces found')

        except Exception as e:
            errors.append(f'Error reading STEP file: {str(e)}')

        # Determine if valid
        is_valid = len(errors) == 0

        if is_valid:
            message = f'Valid STEP file ({file_size} bytes)'
            if warnings:
                message += f' with {len(warnings)} warning(s)'
        else:
            message = f'Invalid STEP file: {len(errors)} error(s)'

        return {
            'valid': is_valid,
            'errors': errors,
            'warnings': warnings,
            'message': message,
            'file_size': file_size
        }

    def _generate_step_fallback(self, config: PartConfig, output_path: str) -> str:
        """Fallback STEP generation (simplified format)"""
        step_content = self._create_step_content(config)

        with open(output_path, 'w') as f:
            f.write(step_content)

        return output_path
    
    def _generate_dxf_fallback(self, config: PartConfig, output_path: str) -> str:
        """Fallback DXF generation (simplified format)"""
        dxf_content = self._create_dxf_content(config)
        
        with open(output_path, 'w') as f:
            f.write(dxf_content)
        
        return output_path
    
    def _create_step_content(self, config: PartConfig) -> str:
        """Create simplified STEP file content with embedded metadata"""
        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S')

        # Create geometry entities for the box
        entity_id = 10
        entities = []

        # Add material and dimension metadata as comments and entities
        entities.append(f"/* Material: {config.material} */")
        entities.append(f"/* Width: {config.width} mm */")
        entities.append(f"/* Height: {config.height} mm */")
        entities.append(f"/* Thickness: {config.thickness} mm */")
        entities.append(f"/* Holes: {len(config.holes)} */")

        # Add basic geometric representation
        entities.append(f"#{entity_id}=CARTESIAN_POINT('',(0.,0.,0.));")
        entity_id += 1
        entities.append(f"#{entity_id}=DIRECTION('',(0.,0.,1.));")
        entity_id += 1
        entities.append(f"#{entity_id}=DIRECTION('',(1.,0.,0.));")
        entity_id += 1

        # Add box dimensions as geometric entities
        entities.append(f"#{entity_id}=CARTESIAN_POINT('',({config.width},{config.height},{config.thickness}));")
        entity_id += 1

        entities_str = '\n'.join(entities)

        return f"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Plastic Part - {config.material}','Width: {config.width}mm, Height: {config.height}mm, Thickness: {config.thickness}mm'),'2;1');
FILE_NAME('plastic_part.step','{timestamp}',('Plastic Configurator'),(''),('FreeCAD Fallback'),'','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=PRODUCT('PlasticPart_{config.material.replace(" ", "_")}','{config.material} - {config.width}x{config.height}x{config.thickness}mm - {len(config.holes)} holes','Part generated by Plastic Configurator');
#2=PRODUCT_DEFINITION_FORMATION('','',#1);
#3=PRODUCT_DEFINITION('design','',#2,$);
#4=PRODUCT_DEFINITION_CONTEXT('part definition',#5,'design');
#5=APPLICATION_CONTEXT('automotive design');
#6=PRODUCT_RELATED_PRODUCT_CATEGORY('part',$,(#1));
#7=PROPERTY_DEFINITION('material','{config.material}',#3);
#8=PROPERTY_DEFINITION('width','{config.width}',#3);
#9=PROPERTY_DEFINITION('height','{config.height}',#3);
{entities_str}
ENDSEC;
END-ISO-10303-21;
"""
    
    def _create_dxf_content(self, config: PartConfig) -> str:
        """Create DXF file content with proper formatting for FreeCAD compatibility"""
        from datetime import datetime
        import math
        corner_radius = getattr(config, 'corner_radius', 0)
        form = getattr(config, 'form', 'rectangle')
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

        # Create metadata comment block
        metadata_comment = f"""999
Plastic Part Metadata
999
Material: {config.material}
999
Dimensions: {config.width}mm x {config.height}mm x {config.thickness}mm
999
Color: {config.color}
999
Corner Radius: {corner_radius}mm
999
Holes: {len(config.holes)}
999
Generated: {timestamp}
999
Assembly Details: {config.assembly_details if config.assembly_details else 'None'}"""

        dxf = f"""  0
SECTION
  2
HEADER
{metadata_comment}
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
CIRCLES
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
"""

        # Add outline based on form type
        if form == 'circle':
            # Draw circle
            radius = config.width / 2
            center_x = config.width / 2
            center_y = config.height / 2
            dxf += f"""  0
CIRCLE
  8
OUTLINE
 10
{center_x}
 20
{center_y}
 40
{radius}
"""
        elif form == 'pentagon':
            # Draw pentagon
            radius = config.width / 2
            center_x = config.width / 2
            center_y = config.height / 2
            sides = 5

            # Create polyline for pentagon
            dxf += f"""  0
LWPOLYLINE
  8
OUTLINE
 90
{sides}
 70
1
"""
            for i in range(sides):
                angle = (i / sides) * 2 * math.pi - math.pi / 2
                x = center_x + math.cos(angle) * radius
                y = center_y + math.sin(angle) * radius
                dxf += f""" 10
{x}
 20
{y}
"""
        elif form == 'line':
            # Draw thin line
            line_width = max(config.thickness, 5)
            center_x = config.width / 2
            dxf += f"""  0
LWPOLYLINE
  8
OUTLINE
 90
4
 70
1
 10
{center_x - line_width / 2}
 20
0.0
 10
{center_x + line_width / 2}
 20
0.0
 10
{center_x + line_width / 2}
 20
{config.height}
 10
{center_x - line_width / 2}
 20
{config.height}
"""
        elif form == 'custom':
            # Draw custom shape from user points
            custom_points = getattr(config, 'custom_points', None)
            if custom_points and len(custom_points) >= 3:
                dxf += f"""  0
LWPOLYLINE
  8
OUTLINE
 90
{len(custom_points)}
 70
1
"""
                for point in custom_points:
                    dxf += f""" 10
{point.x}
 20
{point.y}
"""
            else:
                # Fallback to rectangle
                dxf += f"""  0
LWPOLYLINE
  8
OUTLINE
 90
4
 70
1
 10
0.0
 20
0.0
 10
{config.width}
 20
0.0
 10
{config.width}
 20
{config.height}
 10
0.0
 20
{config.height}
"""
        elif corner_radius > 0:
            # Draw outline with arcs at corners
            r = corner_radius
            w = config.width
            h = config.height

            # Bottom line
            dxf += f"""  0
LINE
  8
OUTLINE
 10
{r}
 20
0.0
 11
{w - r}
 21
0.0
"""
            # Bottom-right arc
            dxf += f"""  0
ARC
  8
OUTLINE
 10
{w - r}
 20
{r}
 40
{r}
 50
270.0
 51
0.0
"""
            # Right line
            dxf += f"""  0
LINE
  8
OUTLINE
 10
{w}
 20
{r}
 11
{w}
 21
{h - r}
"""
            # Top-right arc
            dxf += f"""  0
ARC
  8
OUTLINE
 10
{w - r}
 20
{h - r}
 40
{r}
 50
0.0
 51
90.0
"""
            # Top line
            dxf += f"""  0
LINE
  8
OUTLINE
 10
{w - r}
 20
{h}
 11
{r}
 21
{h}
"""
            # Top-left arc
            dxf += f"""  0
ARC
  8
OUTLINE
 10
{r}
 20
{h - r}
 40
{r}
 50
90.0
 51
180.0
"""
            # Left line
            dxf += f"""  0
LINE
  8
OUTLINE
 10
0.0
 20
{h - r}
 11
0.0
 21
{r}
"""
            # Bottom-left arc
            dxf += f"""  0
ARC
  8
OUTLINE
 10
{r}
 20
{r}
 40
{r}
 50
180.0
 51
270.0
"""
        else:
            # Simple rectangle without rounded corners
            dxf += f"""  0
LWPOLYLINE
  8
OUTLINE
 90
4
 70
1
 10
0.0
 20
0.0
 10
{config.width}
 20
0.0
 10
{config.width}
 20
{config.height}
 10
0.0
 20
{config.height}
"""

        # Add holes as circles
        for hole in config.holes:
            dxf += f"""  0
CIRCLE
  8
CIRCLES
 10
{hole.x}
 20
{hole.y}
 40
{hole.diameter / 2}
"""

        dxf += """  0
ENDSEC
  0
EOF
"""
        return dxf
    
    def generate_glb_file(self, config: PartConfig, output_path: str) -> str:
        """
        Generate GLB file from part configuration

        Args:
            config: Part configuration
            output_path: Path to save GLB file

        Returns:
            Path to generated GLB file
        """
        if not self._freecad_available:
            return self._generate_glb_fallback(config, output_path)

        try:
            # Create FreeCAD document
            doc = self.FreeCAD.newDocument("PlasticPart")

            # Create the base plate
            plate = self._create_part_geometry(doc, config)

            # Export to GLB using Mesh module
            try:
                import Mesh
                import trimesh
                import numpy as np

                # Convert Part to Mesh with finer tessellation
                mesh = doc.addObject("Mesh::Feature", "Mesh")
                mesh.Mesh = Mesh.Mesh(plate.Shape.tessellate(0.05))

                # Export to STL first (FreeCAD doesn't directly support GLB)
                stl_path = output_path.replace('.glb', '_temp.stl')
                Mesh.export([mesh], stl_path)

                # Convert STL to GLB using trimesh
                try:
                    # Load STL with trimesh
                    mesh_obj = trimesh.load(stl_path, force='mesh')

                    # Ensure mesh is valid
                    if not mesh_obj.is_empty:
                        # Export as GLB (binary glTF)
                        mesh_obj.export(output_path, file_type='glb')
                        print(f"✅ Successfully converted STL to GLB: {output_path}")
                    else:
                        raise ValueError("Generated mesh is empty")

                    # Clean up temporary STL
                    if os.path.exists(stl_path):
                        os.remove(stl_path)

                except Exception as trimesh_error:
                    print(f"⚠️ Trimesh conversion failed: {trimesh_error}")
                    # Keep STL file and rename to .glb extension as fallback
                    # This won't work with GLB loaders but at least provides the geometry
                    if os.path.exists(stl_path):
                        # Just use STL format - Three.js can load STL too
                        stl_final = output_path.replace('.glb', '.stl')
                        os.rename(stl_path, stl_final)
                        return stl_final

            except ImportError as import_error:
                print(f"⚠️ Import error: {import_error}")
                # Fallback if Mesh module or trimesh not available
                return self._generate_glb_fallback(config, output_path)

            # Close document
            self.FreeCAD.closeDocument(doc.Name)

            return output_path

        except Exception as e:
            print(f"❌ GLB generation error: {str(e)}")
            raise CADGenerationError(f"Failed to generate GLB file: {str(e)}")

    def _generate_glb_fallback(self, config: PartConfig, output_path: str) -> str:
        """Fallback GLB generation using simple STL format"""
        # Generate a simple STL file as fallback
        stl_content = self._create_stl_content(config)

        # Save as STL instead of GLB since we can't convert without trimesh
        stl_path = output_path.replace('.glb', '.stl')
        with open(stl_path, 'wb') as f:
            f.write(stl_content.encode('utf-8'))

        return stl_path

    def _create_stl_content(self, config: PartConfig) -> str:
        """Create simple STL content for the part (complete box with all 6 faces)"""
        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

        # Simple ASCII STL format with metadata in header
        stl = f"solid PlasticPart\n"
        stl += f"  facet comment Material: {config.material}\n"
        stl += f"  facet comment Dimensions: {config.width}mm x {config.height}mm x {config.thickness}mm\n"
        stl += f"  facet comment Color: {config.color}\n"
        stl += f"  facet comment Holes: {len(config.holes)}\n"
        stl += f"  facet comment Generated: {timestamp}\n"
        if config.assembly_details:
            stl += f"  facet comment Assembly: {config.assembly_details}\n"

        # Generate triangles for a complete box
        w, h, t = config.width, config.height, config.thickness

        # Top face (Z = t) - 2 triangles
        stl += f"  facet normal 0 0 1\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 {t}\n"
        stl += f"      vertex {w} 0 {t}\n"
        stl += f"      vertex {w} {h} {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"
        stl += f"  facet normal 0 0 1\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 {t}\n"
        stl += f"      vertex {w} {h} {t}\n"
        stl += f"      vertex 0 {h} {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"

        # Bottom face (Z = 0) - 2 triangles
        stl += f"  facet normal 0 0 -1\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 0\n"
        stl += f"      vertex {w} {h} 0\n"
        stl += f"      vertex {w} 0 0\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"
        stl += f"  facet normal 0 0 -1\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 0\n"
        stl += f"      vertex 0 {h} 0\n"
        stl += f"      vertex {w} {h} 0\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"

        # Front face (Y = 0) - 2 triangles
        stl += f"  facet normal 0 -1 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 0\n"
        stl += f"      vertex {w} 0 0\n"
        stl += f"      vertex {w} 0 {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"
        stl += f"  facet normal 0 -1 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 0\n"
        stl += f"      vertex {w} 0 {t}\n"
        stl += f"      vertex 0 0 {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"

        # Back face (Y = h) - 2 triangles
        stl += f"  facet normal 0 1 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 {h} 0\n"
        stl += f"      vertex {w} {h} {t}\n"
        stl += f"      vertex {w} {h} 0\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"
        stl += f"  facet normal 0 1 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 {h} 0\n"
        stl += f"      vertex 0 {h} {t}\n"
        stl += f"      vertex {w} {h} {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"

        # Left face (X = 0) - 2 triangles
        stl += f"  facet normal -1 0 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 0\n"
        stl += f"      vertex 0 0 {t}\n"
        stl += f"      vertex 0 {h} {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"
        stl += f"  facet normal -1 0 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex 0 0 0\n"
        stl += f"      vertex 0 {h} {t}\n"
        stl += f"      vertex 0 {h} 0\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"

        # Right face (X = w) - 2 triangles
        stl += f"  facet normal 1 0 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex {w} 0 0\n"
        stl += f"      vertex {w} {h} {t}\n"
        stl += f"      vertex {w} 0 {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"
        stl += f"  facet normal 1 0 0\n"
        stl += f"    outer loop\n"
        stl += f"      vertex {w} 0 0\n"
        stl += f"      vertex {w} {h} 0\n"
        stl += f"      vertex {w} {h} {t}\n"
        stl += f"    endloop\n"
        stl += f"  endfacet\n"

        stl += "endsolid PlasticPart\n"
        return stl

    def generate_preview_images(self, config: PartConfig, output_dir: str, filename_base: str = "preview") -> list:
        """
        Generate 2D preview images from different angles

        Args:
            config: Part configuration
            output_dir: Directory to save images
            filename_base: Base filename (without extension)

        Returns:
            List of paths to generated preview images
        """
        preview_paths = []

        try:
            # Try to use PIL/Pillow for image generation
            from PIL import Image, ImageDraw, ImageFont

            # Generate top view
            top_view_path = os.path.join(output_dir, f"{filename_base}_top.png")
            self._generate_top_view_image(config, top_view_path)
            preview_paths.append(top_view_path)

            # Generate front view
            front_view_path = os.path.join(output_dir, f"{filename_base}_front.png")
            self._generate_front_view_image(config, front_view_path)
            preview_paths.append(front_view_path)

            # Generate isometric view
            iso_view_path = os.path.join(output_dir, f"{filename_base}_iso.png")
            self._generate_isometric_view_image(config, iso_view_path)
            preview_paths.append(iso_view_path)

        except ImportError:
            print("Warning: PIL/Pillow not available, skipping preview image generation")

        return preview_paths

    def _generate_top_view_image(self, config: PartConfig, output_path: str):
        """Generate top view 2D image with embedded metadata"""
        from PIL import Image, ImageDraw, PngImagePlugin
        from datetime import datetime

        # Image size
        img_width = 800
        img_height = 600
        margin = 50

        # Calculate scale
        scale_x = (img_width - 2 * margin) / config.width
        scale_y = (img_height - 2 * margin) / config.height
        scale = min(scale_x, scale_y)

        # Create image
        img = Image.new('RGB', (img_width, img_height), color='white')
        draw = ImageDraw.Draw(img)

        # Draw part outline
        x1 = margin
        y1 = margin
        x2 = margin + config.width * scale
        y2 = margin + config.height * scale
        draw.rectangle([x1, y1, x2, y2], outline='black', width=2, fill='lightgray')

        # Draw holes
        for hole in config.holes:
            cx = margin + hole.x * scale
            cy = margin + hole.y * scale
            r = hole.diameter * scale / 2
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline='red', width=2, fill='white')

        # Create metadata
        metadata = PngImagePlugin.PngInfo()
        metadata.add_text("Material", config.material)
        metadata.add_text("Width", f"{config.width}mm")
        metadata.add_text("Height", f"{config.height}mm")
        metadata.add_text("Thickness", f"{config.thickness}mm")
        metadata.add_text("Color", config.color)
        metadata.add_text("Holes", str(len(config.holes)))
        metadata.add_text("View", "Top")
        metadata.add_text("Generated", datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))
        if config.assembly_details:
            metadata.add_text("AssemblyDetails", config.assembly_details)

        # Save image with metadata
        img.save(output_path, pnginfo=metadata)

    def _generate_front_view_image(self, config: PartConfig, output_path: str):
        """Generate front view 2D image with embedded metadata"""
        from PIL import Image, ImageDraw, PngImagePlugin
        from datetime import datetime

        img_width = 800
        img_height = 400
        margin = 50

        scale_x = (img_width - 2 * margin) / config.width
        scale_y = (img_height - 2 * margin) / config.thickness
        scale = min(scale_x, scale_y) * 10  # Scale up thickness for visibility

        img = Image.new('RGB', (img_width, img_height), color='white')
        draw = ImageDraw.Draw(img)

        # Draw part side view
        x1 = margin
        y1 = img_height // 2 - config.thickness * scale / 2
        x2 = margin + config.width * (img_width - 2 * margin) / config.width
        y2 = y1 + config.thickness * scale

        draw.rectangle([x1, y1, x2, y2], outline='black', width=2, fill='lightgray')

        # Create metadata
        metadata = PngImagePlugin.PngInfo()
        metadata.add_text("Material", config.material)
        metadata.add_text("Width", f"{config.width}mm")
        metadata.add_text("Height", f"{config.height}mm")
        metadata.add_text("Thickness", f"{config.thickness}mm")
        metadata.add_text("Color", config.color)
        metadata.add_text("Holes", str(len(config.holes)))
        metadata.add_text("View", "Front")
        metadata.add_text("Generated", datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))
        if config.assembly_details:
            metadata.add_text("AssemblyDetails", config.assembly_details)

        img.save(output_path, pnginfo=metadata)

    def _generate_isometric_view_image(self, config: PartConfig, output_path: str):
        """Generate isometric view 2D image with embedded metadata"""
        from PIL import Image, ImageDraw, PngImagePlugin
        from datetime import datetime

        img_width = 800
        img_height = 600
        margin = 100

        img = Image.new('RGB', (img_width, img_height), color='white')
        draw = ImageDraw.Draw(img)

        # Simple isometric projection
        scale = min((img_width - 2 * margin) / (config.width * 1.5),
                   (img_height - 2 * margin) / (config.height * 1.5))

        # Isometric transformation
        def iso_project(x, y, z):
            iso_x = margin + (x - y) * scale * 0.866
            iso_y = margin + (x + y) * scale * 0.5 - z * scale
            return iso_x, iso_y

        # Draw isometric box
        w, h, t = config.width, config.height, config.thickness

        # Define vertices
        v1 = iso_project(0, 0, 0)
        v2 = iso_project(w, 0, 0)
        v3 = iso_project(w, h, 0)
        v4 = iso_project(0, h, 0)
        v5 = iso_project(0, 0, t)
        v6 = iso_project(w, 0, t)
        v7 = iso_project(w, h, t)
        v8 = iso_project(0, h, t)

        # Draw faces
        draw.polygon([v5, v6, v7, v8], outline='black', fill='lightgray')
        draw.polygon([v1, v2, v6, v5], outline='black', fill='darkgray')
        draw.polygon([v2, v3, v7, v6], outline='black', fill='gray')

        # Create metadata
        metadata = PngImagePlugin.PngInfo()
        metadata.add_text("Material", config.material)
        metadata.add_text("Width", f"{config.width}mm")
        metadata.add_text("Height", f"{config.height}mm")
        metadata.add_text("Thickness", f"{config.thickness}mm")
        metadata.add_text("Color", config.color)
        metadata.add_text("Holes", str(len(config.holes)))
        metadata.add_text("View", "Isometric")
        metadata.add_text("Generated", datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))
        if config.assembly_details:
            metadata.add_text("AssemblyDetails", config.assembly_details)

        img.save(output_path, pnginfo=metadata)

    def generate_cad_files(
        self,
        config: PartConfig,
        output_dir: str,
        filename_base: str = "part"
    ) -> Tuple[Optional[str], Optional[str], Optional[str], list, Optional[dict]]:
        """
        Generate STEP, DXF, GLB files and preview images

        Args:
            config: Part configuration
            output_dir: Directory to save files
            filename_base: Base filename (without extension)

        Returns:
            Tuple of (step_path, dxf_path, glb_path, preview_images, validation_info)
        """
        os.makedirs(output_dir, exist_ok=True)

        step_path = os.path.join(output_dir, f"{filename_base}.step")
        dxf_path = os.path.join(output_dir, f"{filename_base}.dxf")
        glb_path = os.path.join(output_dir, f"{filename_base}.glb")
        validation_info = None
        preview_images = []

        try:
            self.generate_step_file(config, step_path)
            self.generate_dxf_file(config, dxf_path)
            # generate_glb_file may return .stl path if GLB conversion fails
            glb_path = self.generate_glb_file(config, glb_path)
            preview_images = self.generate_preview_images(config, output_dir, filename_base)

            # Validate STEP file
            validation_info = self._validate_step_file(step_path, config)

            return step_path, dxf_path, glb_path, preview_images, validation_info
        except Exception as e:
            # Clean up partial files
            for path in [step_path, dxf_path, glb_path] + preview_images:
                if os.path.exists(path):
                    os.remove(path)
            raise CADGenerationError(f"Failed to generate CAD files: {str(e)}")

