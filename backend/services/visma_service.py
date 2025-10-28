"""
Visma Integration Service

Handles integration with Visma order management system
"""

import httpx
from typing import Dict, Optional
from config import settings
from models import Order


class VismaService:
    """Service for Visma API integration"""
    
    def __init__(self):
        self.api_url = settings.visma_api_url
        self.api_key = settings.visma_api_key
        self.client_id = settings.visma_client_id
        self.client_secret = settings.visma_client_secret
        self.webhook_secret = settings.visma_webhook_secret
    
    async def create_order(self, order: Order) -> Optional[str]:
        """
        Create order in Visma system
        
        Args:
            order: Order model instance
            
        Returns:
            Visma order ID if successful, None otherwise
        """
        if not self.api_key:
            print("Warning: Visma API key not configured, skipping integration")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/orders",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "orderNumber": order.order_number,
                        "customerEmail": order.customer_email,
                        "customerName": order.customer_name,
                        "items": [
                            {
                                "description": f"Plastic Part - {order.material}",
                                "dimensions": f"{order.width}x{order.height}x{order.thickness}mm",
                                "quantity": order.quantity,
                                "unitPrice": order.price / order.quantity,
                                "totalPrice": order.price,
                                "specifications": {
                                    "width": order.width,
                                    "height": order.height,
                                    "thickness": order.thickness,
                                    "material": order.material,
                                    "holes": order.holes,
                                }
                            }
                        ],
                        "totalAmount": order.price,
                        "attachments": [
                            {"type": "STEP", "url": order.step_file_url},
                            {"type": "DXF", "url": order.dxf_file_url},
                        ],
                        "notes": order.notes,
                    },
                    timeout=30.0
                )
                
                if response.status_code == 201:
                    data = response.json()
                    return data.get("orderId")
                else:
                    print(f"Visma API error: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            print(f"Failed to create Visma order: {str(e)}")
            return None
    
    async def get_order_status(self, visma_order_id: str) -> Optional[Dict]:
        """
        Get order status from Visma
        
        Args:
            visma_order_id: Visma order ID
            
        Returns:
            Order status data if successful
        """
        if not self.api_key:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/orders/{visma_order_id}",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return None
                    
        except Exception as e:
            print(f"Failed to get Visma order status: {str(e)}")
            return None
    
    async def update_order_status(self, visma_order_id: str, status: str) -> bool:
        """
        Update order status in Visma
        
        Args:
            visma_order_id: Visma order ID
            status: New status
            
        Returns:
            True if successful
        """
        if not self.api_key:
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.api_url}/orders/{visma_order_id}",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={"status": status},
                    timeout=30.0
                )
                
                return response.status_code == 200
                
        except Exception as e:
            print(f"Failed to update Visma order status: {str(e)}")
            return False
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify webhook signature from Visma
        
        Args:
            payload: Webhook payload
            signature: Signature from webhook headers
            
        Returns:
            True if signature is valid
        """
        if not self.webhook_secret:
            return True  # Skip verification if no secret configured
        
        import hmac
        import hashlib
        
        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)


# Global Visma service instance
visma_service = VismaService()

