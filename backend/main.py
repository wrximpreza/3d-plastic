"""
FastAPI Backend for Plastic Parts Configurator

Main application entry point
"""

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import tempfile
import uuid
from datetime import datetime

from config import settings
from database import get_db, init_db
from models import Order, OrderStatus
from schemas import (
    CADGenerateRequest,
    CADGenerateResponse,
    OrderCreateRequest,
    OrderResponse,
    OrderListResponse,
    PartConfig
)
from services.cad_service import FreeCADService, CADGenerationError
from services.storage_service import storage_service
from services.visma_service import visma_service

# Initialize FastAPI app
app = FastAPI(
    title="Plastic Parts Configurator API",
    description="Backend API for parametric plastic parts configuration and ordering",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize FreeCAD service
cad_service = FreeCADService(
    freecad_path=settings.freecad_path,
    freecad_python=settings.freecad_python
)

# Mount static files for local storage
if settings.storage_type == "local":
    os.makedirs(settings.storage_path, exist_ok=True)
    app.mount("/files", StaticFiles(directory=settings.storage_path), name="files")


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print(f"🚀 Server started on {settings.host}:{settings.port}")
    print(f"📁 Storage type: {settings.storage_type}")
    print(f"🔧 FreeCAD available: {cad_service._freecad_available}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Plastic Parts Configurator API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "freecad_available": cad_service._freecad_available,
        "storage_type": settings.storage_type
    }


@app.post("/api/cad/generate", response_model=CADGenerateResponse)
async def generate_cad(
    request: CADGenerateRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate CAD files (STEP/DXF/GLB) and preview images from part configuration

    This endpoint generates CAD files and returns URLs to download them.
    """
    try:
        # Create temporary directory for CAD files
        temp_dir = tempfile.mkdtemp()
        filename_base = f"part_{uuid.uuid4().hex[:8]}"

        # Generate CAD files (STEP, DXF, GLB, and preview images)
        step_path, dxf_path, glb_path, preview_images, validation_info = cad_service.generate_cad_files(
            request.config,
            temp_dir,
            filename_base
        )

        # Upload to storage
        step_key = f"cad/{filename_base}.step"
        dxf_key = f"cad/{filename_base}.dxf"

        # Handle both GLB and STL files (backend may return STL if GLB conversion fails)
        glb_extension = os.path.splitext(glb_path)[1]  # Get actual extension (.glb or .stl)
        glb_key = f"cad/{filename_base}{glb_extension}"

        step_url = storage_service.save_file(step_path, step_key)
        dxf_url = storage_service.save_file(dxf_path, dxf_key)
        glb_url = storage_service.save_file(glb_path, glb_key)

        # Upload preview images
        preview_urls = []
        for i, preview_path in enumerate(preview_images):
            preview_key = f"cad/{filename_base}_preview_{i}.png"
            preview_url = storage_service.save_file(preview_path, preview_key)
            preview_urls.append(preview_url)

        # Clean up temp files in background
        background_tasks.add_task(cleanup_temp_files, temp_dir)

        # Calculate metadata
        area = request.config.width * request.config.height
        volume = area * request.config.thickness

        return CADGenerateResponse(
            step_file_url=step_url,
            dxf_file_url=dxf_url,
            glb_file_url=glb_url,
            preview_images=preview_urls,
            metadata={
                "width": request.config.width,
                "height": request.config.height,
                "thickness": request.config.thickness,
                "material": request.config.material,
                "holes_count": len(request.config.holes),
                "area_mm2": area,
                "volume_mm3": volume,
                "generated_at": datetime.utcnow().isoformat(),
                "assembly_details": request.config.assembly_details
            },
            validation=validation_info
        )

    except CADGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CAD generation failed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@app.post("/api/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    request: OrderCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Create a new order
    
    This endpoint:
    1. Generates CAD files
    2. Creates order in database
    3. Sends order to Visma (if configured)
    4. Returns order details
    """
    try:
        # Generate order number
        order_number = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        # Generate CAD files
        temp_dir = tempfile.mkdtemp()
        filename_base = f"order_{order_number}"

        step_path, dxf_path, glb_path, preview_images, _ = cad_service.generate_cad_files(
            request.config,
            temp_dir,
            filename_base
        )

        # Upload to storage
        step_key = f"orders/{order_number}/{filename_base}.step"
        dxf_key = f"orders/{order_number}/{filename_base}.dxf"

        # Handle both GLB and STL files
        glb_extension = os.path.splitext(glb_path)[1]
        glb_key = f"orders/{order_number}/{filename_base}{glb_extension}"

        step_url = storage_service.save_file(step_path, step_key)
        dxf_url = storage_service.save_file(dxf_path, dxf_key)
        glb_url = storage_service.save_file(glb_path, glb_key)
        
        # Calculate price
        price = calculate_price(request.config, request.quantity)
        
        # Create order in database
        order = Order(
            order_number=order_number,
            width=request.config.width,
            height=request.config.height,
            thickness=request.config.thickness,
            material=request.config.material,
            holes=[hole.model_dump() for hole in request.config.holes],
            quantity=request.quantity,
            price=price,
            status=OrderStatus.PENDING,
            step_file_url=step_url,
            dxf_file_url=dxf_url,
            customer_email=request.customer_email,
            customer_name=request.customer_name,
            notes=request.notes
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Send to Visma in background
        background_tasks.add_task(send_to_visma, order.id, db)
        
        # Clean up temp files
        background_tasks.add_task(cleanup_temp_files, temp_dir)
        
        return order_to_response(order)
        
    except CADGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CAD generation failed: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )


@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get order by ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found"
        )
    
    return order_to_response(order)


@app.get("/api/orders", response_model=OrderListResponse)
async def list_orders(
    page: int = 1,
    page_size: int = 20,
    status_filter: str = None,
    db: Session = Depends(get_db)
):
    """List all orders with pagination"""
    query = db.query(Order)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return OrderListResponse(
        orders=[order_to_response(order) for order in orders],
        total=total,
        page=page,
        page_size=page_size
    )


# Helper functions

def calculate_price(config: PartConfig, quantity: int) -> float:
    """Calculate order price"""
    # Base price calculation
    area = config.width * config.height  # mm²
    area_m2 = area / 1_000_000  # Convert to m²
    
    # Material cost per m²
    material_costs = {
        "PE 500": 50.0,
        "PE 1000": 65.0,
        "PP": 45.0,
        "POM": 80.0
    }
    
    material_cost = material_costs.get(config.material, 50.0) * area_m2
    
    # Hole drilling cost
    hole_cost = len(config.holes) * 2.0
    
    # Cutting cost (perimeter-based)
    perimeter = 2 * (config.width + config.height)
    cutting_cost = (perimeter / 1000) * 5.0  # $5 per meter
    
    # Base price per unit
    unit_price = material_cost + hole_cost + cutting_cost
    
    # Quantity discount
    if quantity >= 10:
        discount = 0.10
    elif quantity >= 5:
        discount = 0.05
    else:
        discount = 0.0
    
    total_price = unit_price * quantity * (1 - discount)
    
    return round(total_price, 2)


def order_to_response(order: Order) -> OrderResponse:
    """Convert Order model to OrderResponse"""
    from schemas import Hole
    
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        config=PartConfig(
            width=order.width,
            height=order.height,
            thickness=order.thickness,
            material=order.material,
            holes=[Hole(**hole) for hole in order.holes]
        ),
        quantity=order.quantity,
        price=order.price,
        status=order.status.value,
        step_file_url=order.step_file_url,
        dxf_file_url=order.dxf_file_url,
        visma_order_id=order.visma_order_id,
        visma_status=order.visma_status,
        customer_email=order.customer_email,
        customer_name=order.customer_name,
        notes=order.notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        completed_at=order.completed_at
    )


async def send_to_visma(order_id: int, db: Session):
    """Background task to send order to Visma"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return
    
    visma_order_id = await visma_service.create_order(order)
    
    if visma_order_id:
        order.visma_order_id = visma_order_id
        order.visma_status = "submitted"
        order.status = OrderStatus.PROCESSING
        db.commit()


def cleanup_temp_files(temp_dir: str):
    """Clean up temporary files"""
    import shutil
    try:
        shutil.rmtree(temp_dir)
    except Exception as e:
        print(f"Failed to cleanup temp files: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

