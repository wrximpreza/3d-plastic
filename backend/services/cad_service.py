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

            # Create base rectangle
            width_mm = config.width
            height_mm = config.height
            thickness_mm = config.thickness

            # Create box
            box = self.Part.makeBox(width_mm, height_mm, thickness_mm)

            # Create holes
            for hole in config.holes:
                # Create cylinder for hole
                hole_radius = hole.diameter / 2
                hole_x = hole.x
                hole_y = hole.y

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
        dxf = f"""  0
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
0
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
    
    def generate_cad_files(
        self,
        config: PartConfig,
        output_dir: str,
        filename_base: str = "part"
    ) -> Tuple[Optional[str], Optional[str], Optional[dict]]:
        """
        Generate both STEP and DXF files

        Args:
            config: Part configuration
            output_dir: Directory to save files
            filename_base: Base filename (without extension)

        Returns:
            Tuple of (step_path, dxf_path, validation_info)
        """
        os.makedirs(output_dir, exist_ok=True)

        step_path = os.path.join(output_dir, f"{filename_base}.step")
        dxf_path = os.path.join(output_dir, f"{filename_base}.dxf")
        validation_info = None

        try:
            self.generate_step_file(config, step_path)
            self.generate_dxf_file(config, dxf_path)

            # Validate STEP file
            validation_info = self._validate_step_file(step_path, config)

            return step_path, dxf_path, validation_info
        except Exception as e:
            # Clean up partial files
            if os.path.exists(step_path):
                os.remove(step_path)
            if os.path.exists(dxf_path):
                os.remove(dxf_path)
            raise CADGenerationError(f"Failed to generate CAD files: {str(e)}")

