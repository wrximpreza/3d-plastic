from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()


class OrderStatus(str, enum.Enum):
    """Order status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Order(Base):
    """Order model"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)
    
    # Part configuration
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    thickness = Column(Float, nullable=False)
    material = Column(String, nullable=False)
    holes = Column(JSON, nullable=False)  # Array of hole objects
    
    # Order details
    quantity = Column(Integer, nullable=False, default=1)
    price = Column(Float, nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    
    # CAD files
    step_file_url = Column(String, nullable=True)
    dxf_file_url = Column(String, nullable=True)
    
    # Visma integration
    visma_order_id = Column(String, nullable=True)
    visma_status = Column(String, nullable=True)
    
    # Metadata
    customer_email = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "order_number": self.order_number,
            "config": {
                "width": self.width,
                "height": self.height,
                "thickness": self.thickness,
                "material": self.material,
                "holes": self.holes,
            },
            "quantity": self.quantity,
            "price": self.price,
            "status": self.status.value,
            "step_file_url": self.step_file_url,
            "dxf_file_url": self.dxf_file_url,
            "visma_order_id": self.visma_order_id,
            "visma_status": self.visma_status,
            "customer_email": self.customer_email,
            "customer_name": self.customer_name,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

