from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime


class Hole(BaseModel):
    """Hole configuration schema"""
    id: str
    x: float = Field(..., ge=0, description="Position from left edge (mm)")
    y: float = Field(..., ge=0, description="Position from bottom edge (mm)")
    diameter: float = Field(..., gt=0, le=100, description="Hole diameter (mm)")


class PartConfig(BaseModel):
    """Part configuration schema"""
    width: float = Field(..., ge=50, le=3000, description="Width in mm")
    height: float = Field(..., ge=50, le=2000, description="Height in mm")
    thickness: float = Field(..., ge=1, le=50, description="Thickness in mm")
    material: str = Field(..., description="Material type (PE 500, PE 1000, PP, POM)")
    holes: List[Hole] = Field(default_factory=list, description="Array of holes")
    
    @field_validator('material')
    @classmethod
    def validate_material(cls, v):
        allowed = ["PE 500", "PE 1000", "PP", "POM"]
        if v not in allowed:
            raise ValueError(f"Material must be one of {allowed}")
        return v


class CADGenerateRequest(BaseModel):
    """Request schema for CAD generation"""
    config: PartConfig
    format: str = Field(default="both", description="Output format: 'step', 'dxf', or 'both'")


class ValidationInfo(BaseModel):
    """Validation information for generated files"""
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    message: str
    file_size: Optional[int] = None


class CADGenerateResponse(BaseModel):
    """Response schema for CAD generation"""
    step_file_url: Optional[str] = None
    dxf_file_url: Optional[str] = None
    metadata: dict
    validation: Optional[ValidationInfo] = None


class OrderCreateRequest(BaseModel):
    """Request schema for creating an order"""
    config: PartConfig
    quantity: int = Field(default=1, ge=1, le=1000, description="Quantity to order")
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    """Response schema for order"""
    id: int
    order_number: str
    config: PartConfig
    quantity: int
    price: float
    status: str
    step_file_url: Optional[str] = None
    dxf_file_url: Optional[str] = None
    visma_order_id: Optional[str] = None
    visma_status: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Response schema for order list"""
    orders: List[OrderResponse]
    total: int
    page: int
    page_size: int

