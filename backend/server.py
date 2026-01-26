from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'qmeal_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'qmeal-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Stripe Configuration (Mock keys for development)
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_mock_key_for_development')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', 'pk_test_mock_key_for_development')
stripe.api_key = STRIPE_SECRET_KEY

# Create the main app
app = FastAPI(title="Qmeal API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    name: str
    picture: Optional[str] = None
    push_token: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Auth Request/Response Models
class RegisterRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    name: str

class LoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

class AuthResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    name: str
    picture: Optional[str] = None
    token: str

class UpdatePushTokenRequest(BaseModel):
    push_token: str

class Restaurant(BaseModel):
    restaurant_id: str = Field(default_factory=lambda: f"rest_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    cuisine_type: str
    rating: float = 0.0
    review_count: int = 0
    price_level: int = 2
    image_url: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    delivery_time_min: int = 20
    delivery_time_max: int = 40
    delivery_fee: float = 2.99
    is_open: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItem(BaseModel):
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    restaurant_id: str
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    is_available: bool = True
    is_popular: bool = False

class Review(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    restaurant_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    restaurant_id: str

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:12]}")
    user_id: str
    restaurant_id: str
    restaurant_name: str
    items: List[CartItem]
    subtotal: float
    delivery_fee: float
    total: float
    status: str = "pending"
    delivery_address: str
    payment_intent_id: Optional[str] = None
    payment_status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Favorite(BaseModel):
    favorite_id: str = Field(default_factory=lambda: f"fav_{uuid.uuid4().hex[:12]}")
    user_id: str
    restaurant_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    body: str
    data: Optional[dict] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request Models
class CreateOrderRequest(BaseModel):
    restaurant_id: str
    restaurant_name: str
    items: List[CartItem]
    subtotal: float
    delivery_fee: float
    total: float
    delivery_address: str
    payment_method_id: Optional[str] = None

class CreateReviewRequest(BaseModel):
    restaurant_id: str
    rating: int
    comment: str

class CreatePaymentIntentRequest(BaseModel):
    amount: float
    currency: str = "usd"

class UpdateOrderStatusRequest(BaseModel):
    status: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    """Create a JWT token for the user"""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_token_from_request(request: Request) -> Optional[str]:
    """Extract token from cookie or Authorization header"""
    token = request.cookies.get("auth_token")
    if token:
        return token
    
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None

async def get_current_user(request: Request) -> Optional[User]:
    """Get current authenticated user"""
    token = await get_token_from_request(request)
    if not token:
        return None
    
    payload = decode_jwt_token(token)
    if not payload:
        return None
    
    user_doc = await db.users.find_one(
        {"user_id": payload["user_id"]},
        {"_id": 0}
    )
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    """Dependency that requires authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ==================== PUSH NOTIFICATION HELPER ====================

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to user via Expo"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user or not user.get("push_token"):
        logger.info(f"No push token for user {user_id}")
        return False
    
    push_token = user["push_token"]
    
    # Store notification in database
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        data=data
    )
    await db.notifications.insert_one(notification.dict())
    
    # Send via Expo Push API
    try:
        message = {
            "to": push_token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default"
        }
        
        async with httpx.AsyncClient() as client_http:
            response = await client_http.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={"Content-Type": "application/json"}
            )
            logger.info(f"Push notification sent: {response.status_code}")
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return False

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(request_data: RegisterRequest, response: Response):
    """Register a new user with email/phone and password"""
    if not request_data.email and not request_data.phone:
        raise HTTPException(status_code=400, detail="Email or phone number is required")
    
    # Check if user already exists
    query = {}
    if request_data.email:
        query["email"] = request_data.email.lower()
    if request_data.phone:
        query["phone"] = request_data.phone
    
    existing_user = await db.users.find_one(query, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists with this email or phone")
    
    # Create new user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(request_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": request_data.email.lower() if request_data.email else None,
        "phone": request_data.phone,
        "name": request_data.name,
        "password_hash": hashed_password,
        "picture": None,
        "push_token": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    # Create JWT token
    token = create_jwt_token(user_id)
    
    # Set cookie
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 60 * 60
    )
    
    return AuthResponse(
        user_id=user_id,
        email=request_data.email,
        phone=request_data.phone,
        name=request_data.name,
        picture=None,
        token=token
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request_data: LoginRequest, response: Response):
    """Login with email/phone and password"""
    if not request_data.email and not request_data.phone:
        raise HTTPException(status_code=400, detail="Email or phone number is required")
    
    # Find user
    query = {}
    if request_data.email:
        query["email"] = request_data.email.lower()
    elif request_data.phone:
        query["phone"] = request_data.phone
    
    user_doc = await db.users.find_one(query, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request_data.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    token = create_jwt_token(user_doc["user_id"])
    
    # Set cookie
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 60 * 60
    )
    
    return AuthResponse(
        user_id=user_doc["user_id"],
        email=user_doc.get("email"),
        phone=user_doc.get("phone"),
        name=user_doc["name"],
        picture=user_doc.get("picture"),
        token=token
    )

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(require_auth)):
    """Get current authenticated user"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    response.delete_cookie(key="auth_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/push-token")
async def update_push_token(
    request_data: UpdatePushTokenRequest,
    current_user: User = Depends(require_auth)
):
    """Update user's push notification token"""
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"push_token": request_data.push_token}}
    )
    return {"message": "Push token updated"}

# ==================== RESTAURANT ENDPOINTS ====================

@api_router.get("/restaurants", response_model=List[Restaurant])
async def get_restaurants(
    cuisine: Optional[str] = None,
    min_rating: Optional[float] = None,
    price_level: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(default="rating", regex="^(rating|delivery_time|price)$")
):
    """Get all restaurants with optional filters"""
    query = {}
    
    if cuisine:
        query["cuisine_type"] = {"$regex": cuisine, "$options": "i"}
    
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    
    if price_level:
        query["price_level"] = price_level
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"cuisine_type": {"$regex": search, "$options": "i"}}
        ]
    
    sort_field = "rating"
    sort_order = -1
    if sort_by == "delivery_time":
        sort_field = "delivery_time_min"
        sort_order = 1
    elif sort_by == "price":
        sort_field = "price_level"
        sort_order = 1
    
    restaurants = await db.restaurants.find(query, {"_id": 0}).sort(sort_field, sort_order).to_list(100)
    return [Restaurant(**r) for r in restaurants]

@api_router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(restaurant_id: str):
    """Get single restaurant by ID"""
    restaurant = await db.restaurants.find_one(
        {"restaurant_id": restaurant_id},
        {"_id": 0}
    )
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return Restaurant(**restaurant)

@api_router.get("/restaurants/{restaurant_id}/menu", response_model=List[MenuItem])
async def get_restaurant_menu(restaurant_id: str):
    """Get menu items for a restaurant"""
    items = await db.menu_items.find(
        {"restaurant_id": restaurant_id, "is_available": True},
        {"_id": 0}
    ).to_list(100)
    return [MenuItem(**item) for item in items]

@api_router.get("/restaurants/{restaurant_id}/reviews", response_model=List[Review])
async def get_restaurant_reviews(restaurant_id: str):
    """Get reviews for a restaurant"""
    reviews = await db.reviews.find(
        {"restaurant_id": restaurant_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [Review(**r) for r in reviews]

@api_router.get("/cuisines")
async def get_cuisines():
    """Get list of unique cuisines"""
    cuisines = await db.restaurants.distinct("cuisine_type")
    return {"cuisines": cuisines}

# ==================== FAVORITES ENDPOINTS ====================

@api_router.get("/favorites", response_model=List[Restaurant])
async def get_favorites(current_user: User = Depends(require_auth)):
    """Get user's favorite restaurants"""
    favorites = await db.favorites.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    restaurant_ids = [f["restaurant_id"] for f in favorites]
    
    if not restaurant_ids:
        return []
    
    restaurants = await db.restaurants.find(
        {"restaurant_id": {"$in": restaurant_ids}},
        {"_id": 0}
    ).to_list(100)
    
    return [Restaurant(**r) for r in restaurants]

@api_router.post("/favorites/{restaurant_id}")
async def add_favorite(restaurant_id: str, current_user: User = Depends(require_auth)):
    """Add restaurant to favorites"""
    # Check if restaurant exists
    restaurant = await db.restaurants.find_one({"restaurant_id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Check if already favorited
    existing = await db.favorites.find_one({
        "user_id": current_user.user_id,
        "restaurant_id": restaurant_id
    })
    
    if existing:
        return {"message": "Already in favorites"}
    
    favorite = Favorite(
        user_id=current_user.user_id,
        restaurant_id=restaurant_id
    )
    await db.favorites.insert_one(favorite.dict())
    
    return {"message": "Added to favorites", "favorite_id": favorite.favorite_id}

@api_router.delete("/favorites/{restaurant_id}")
async def remove_favorite(restaurant_id: str, current_user: User = Depends(require_auth)):
    """Remove restaurant from favorites"""
    result = await db.favorites.delete_one({
        "user_id": current_user.user_id,
        "restaurant_id": restaurant_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    return {"message": "Removed from favorites"}

@api_router.get("/favorites/check/{restaurant_id}")
async def check_favorite(restaurant_id: str, current_user: User = Depends(require_auth)):
    """Check if restaurant is in favorites"""
    existing = await db.favorites.find_one({
        "user_id": current_user.user_id,
        "restaurant_id": restaurant_id
    })
    return {"is_favorite": existing is not None}

# ==================== ORDER ENDPOINTS ====================

@api_router.get("/orders", response_model=List[Order])
async def get_user_orders(current_user: User = Depends(require_auth)):
    """Get orders for current user"""
    orders = await db.orders.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [Order(**o) for o in orders]

@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: CreateOrderRequest,
    current_user: User = Depends(require_auth)
):
    """Create a new order"""
    order = Order(
        user_id=current_user.user_id,
        restaurant_id=order_data.restaurant_id,
        restaurant_name=order_data.restaurant_name,
        items=[CartItem(**item.dict()) for item in order_data.items],
        subtotal=order_data.subtotal,
        delivery_fee=order_data.delivery_fee,
        total=order_data.total,
        delivery_address=order_data.delivery_address,
        status="confirmed",
        payment_status="completed" if order_data.payment_method_id else "pending"
    )
    
    await db.orders.insert_one(order.dict())
    
    # Send push notification
    await send_push_notification(
        current_user.user_id,
        "Order Confirmed!",
        f"Your order from {order_data.restaurant_name} has been confirmed.",
        {"order_id": order.order_id, "type": "order_confirmed"}
    )
    
    return order

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: User = Depends(require_auth)):
    """Get single order by ID"""
    order = await db.orders.find_one(
        {"order_id": order_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_data: UpdateOrderStatusRequest,
    current_user: User = Depends(require_auth)
):
    """Update order status (for demo/testing)"""
    valid_statuses = ["pending", "confirmed", "preparing", "on_the_way", "delivered"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status_data.status}}
    )
    
    # Send push notification for status update
    status_messages = {
        "preparing": "Your order is being prepared!",
        "on_the_way": "Your order is on the way!",
        "delivered": "Your order has been delivered!"
    }
    
    if status_data.status in status_messages:
        await send_push_notification(
            order["user_id"],
            f"Order Update - {status_data.status.replace('_', ' ').title()}",
            status_messages[status_data.status],
            {"order_id": order_id, "type": "order_status", "status": status_data.status}
        )
    
    return {"message": "Status updated", "status": status_data.status}

# ==================== PAYMENT ENDPOINTS ====================

@api_router.post("/payments/create-intent")
async def create_payment_intent(
    request_data: CreatePaymentIntentRequest,
    current_user: User = Depends(require_auth)
):
    """Create a Stripe payment intent"""
    try:
        # Convert amount to cents
        amount_cents = int(request_data.amount * 100)
        
        # Create payment intent (will work with real Stripe keys)
        # With mock keys, this will raise an error, so we simulate success
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=request_data.currency,
                metadata={"user_id": current_user.user_id}
            )
            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "publishable_key": STRIPE_PUBLISHABLE_KEY
            }
        except stripe.error.AuthenticationError:
            # Mock response for development without real Stripe keys
            mock_intent_id = f"pi_mock_{uuid.uuid4().hex[:16]}"
            return {
                "client_secret": f"{mock_intent_id}_secret_mock",
                "payment_intent_id": mock_intent_id,
                "publishable_key": STRIPE_PUBLISHABLE_KEY,
                "mock": True,
                "message": "Using mock payment intent - replace with real Stripe keys for production"
            }
    except Exception as e:
        logger.error(f"Payment intent error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment intent")

@api_router.get("/payments/config")
async def get_payment_config():
    """Get Stripe publishable key for frontend"""
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "is_mock": "mock" in STRIPE_PUBLISHABLE_KEY
    }

# ==================== REVIEW ENDPOINTS ====================

@api_router.post("/reviews", response_model=Review)
async def create_review(
    review_data: CreateReviewRequest,
    current_user: User = Depends(require_auth)
):
    """Create a new review"""
    restaurant = await db.restaurants.find_one(
        {"restaurant_id": review_data.restaurant_id},
        {"_id": 0}
    )
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    review = Review(
        restaurant_id=review_data.restaurant_id,
        user_id=current_user.user_id,
        user_name=current_user.name,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.dict())
    
    # Update restaurant rating
    all_reviews = await db.reviews.find(
        {"restaurant_id": review_data.restaurant_id},
        {"_id": 0}
    ).to_list(1000)
    
    if all_reviews:
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        await db.restaurants.update_one(
            {"restaurant_id": review_data.restaurant_id},
            {"$set": {"rating": round(avg_rating, 1), "review_count": len(all_reviews)}}
        )
    
    return review

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(require_auth)):
    """Get user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(require_auth)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": current_user.user_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(require_auth)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user.user_id},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample data"""
    existing = await db.restaurants.count_documents({})
    if existing > 0:
        return {"message": "Database already seeded", "restaurant_count": existing}
    
    # Sample restaurants with real coordinates
    restaurants = [
        {
            "restaurant_id": "rest_001",
            "name": "Bella Italia",
            "description": "Authentic Italian cuisine with handmade pasta and wood-fired pizzas",
            "cuisine_type": "Italian",
            "rating": 4.7,
            "review_count": 234,
            "price_level": 2,
            "image_url": "https://images.unsplash.com/photo-1615719413546-198b25453f85",
            "address": "123 Main Street, Downtown",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "delivery_time_min": 25,
            "delivery_time_max": 40,
            "delivery_fee": 2.99,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "restaurant_id": "rest_002",
            "name": "Tokyo Ramen House",
            "description": "Traditional Japanese ramen and authentic Asian dishes",
            "cuisine_type": "Japanese",
            "rating": 4.8,
            "review_count": 189,
            "price_level": 2,
            "image_url": "https://images.unsplash.com/photo-1676300185004-c31cf62d3bc8",
            "address": "456 Oak Avenue, Midtown",
            "latitude": 40.7580,
            "longitude": -73.9855,
            "delivery_time_min": 20,
            "delivery_time_max": 35,
            "delivery_fee": 1.99,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "restaurant_id": "rest_003",
            "name": "Burger Republic",
            "description": "Gourmet burgers made with premium Angus beef and fresh ingredients",
            "cuisine_type": "American",
            "rating": 4.5,
            "review_count": 456,
            "price_level": 1,
            "image_url": "https://images.unsplash.com/photo-1651440204227-a9a5b9d19712",
            "address": "789 Elm Street, Uptown",
            "latitude": 40.7829,
            "longitude": -73.9654,
            "delivery_time_min": 15,
            "delivery_time_max": 30,
            "delivery_fee": 0.99,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "restaurant_id": "rest_004",
            "name": "Spice Garden",
            "description": "Aromatic Indian curries and tandoori specialties",
            "cuisine_type": "Indian",
            "rating": 4.6,
            "review_count": 178,
            "price_level": 2,
            "image_url": "https://images.unsplash.com/photo-1694184191737-778bc1b5c4e8",
            "address": "321 Spice Lane, East Side",
            "latitude": 40.7489,
            "longitude": -73.9680,
            "delivery_time_min": 30,
            "delivery_time_max": 45,
            "delivery_fee": 2.49,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "restaurant_id": "rest_005",
            "name": "Le Petit Bistro",
            "description": "French cuisine with a modern twist in an elegant setting",
            "cuisine_type": "French",
            "rating": 4.9,
            "review_count": 98,
            "price_level": 4,
            "image_url": "https://images.unsplash.com/photo-1683538503204-fec7fc504067",
            "address": "555 Boulevard Ave, West End",
            "latitude": 40.7614,
            "longitude": -73.9776,
            "delivery_time_min": 35,
            "delivery_time_max": 50,
            "delivery_fee": 4.99,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "restaurant_id": "rest_006",
            "name": "Taco Fiesta",
            "description": "Authentic Mexican street food and margaritas",
            "cuisine_type": "Mexican",
            "rating": 4.4,
            "review_count": 312,
            "price_level": 1,
            "image_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47",
            "address": "777 Fiesta Way, South Side",
            "latitude": 40.7282,
            "longitude": -73.7949,
            "delivery_time_min": 20,
            "delivery_time_max": 35,
            "delivery_fee": 1.49,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "restaurant_id": "rest_007",
            "name": "Dragon Palace",
            "description": "Traditional Chinese cuisine with dim sum and Cantonese favorites",
            "cuisine_type": "Chinese",
            "rating": 4.3,
            "review_count": 267,
            "price_level": 2,
            "image_url": "https://images.unsplash.com/photo-1563245372-f21724e3856d",
            "address": "888 Dragon Street, Chinatown",
            "latitude": 40.7157,
            "longitude": -73.9970,
            "delivery_time_min": 25,
            "delivery_time_max": 40,
            "delivery_fee": 2.29,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "restaurant_id": "rest_008",
            "name": "Mediterranean Grill",
            "description": "Fresh Mediterranean flavors with grilled meats and seafood",
            "cuisine_type": "Mediterranean",
            "rating": 4.6,
            "review_count": 145,
            "price_level": 3,
            "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947",
            "address": "999 Olive Road, Harbor District",
            "latitude": 40.7023,
            "longitude": -74.0156,
            "delivery_time_min": 30,
            "delivery_time_max": 45,
            "delivery_fee": 3.49,
            "is_open": True,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.restaurants.insert_many(restaurants)
    
    # Menu items (same as before)
    menu_items = [
        {"item_id": "item_001", "restaurant_id": "rest_001", "name": "Margherita Pizza", "description": "Fresh mozzarella, tomato sauce, and basil", "price": 14.99, "category": "Pizza", "is_available": True, "is_popular": True},
        {"item_id": "item_002", "restaurant_id": "rest_001", "name": "Spaghetti Carbonara", "description": "Creamy pasta with bacon and parmesan", "price": 16.99, "category": "Pasta", "is_available": True, "is_popular": True},
        {"item_id": "item_003", "restaurant_id": "rest_001", "name": "Tiramisu", "description": "Classic Italian dessert with coffee and mascarpone", "price": 8.99, "category": "Desserts", "is_available": True, "is_popular": False},
        {"item_id": "item_004", "restaurant_id": "rest_001", "name": "Bruschetta", "description": "Toasted bread with tomatoes, garlic, and olive oil", "price": 9.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        {"item_id": "item_005", "restaurant_id": "rest_001", "name": "Lasagna", "description": "Layers of pasta, meat sauce, and cheese", "price": 18.99, "category": "Pasta", "is_available": True, "is_popular": True},
        {"item_id": "item_006", "restaurant_id": "rest_002", "name": "Tonkotsu Ramen", "description": "Rich pork bone broth with chashu and soft egg", "price": 15.99, "category": "Ramen", "is_available": True, "is_popular": True},
        {"item_id": "item_007", "restaurant_id": "rest_002", "name": "Gyoza (6 pcs)", "description": "Pan-fried pork dumplings", "price": 8.99, "category": "Appetizers", "is_available": True, "is_popular": True},
        {"item_id": "item_008", "restaurant_id": "rest_002", "name": "Chicken Katsu Curry", "description": "Crispy chicken cutlet with Japanese curry", "price": 16.99, "category": "Main Dishes", "is_available": True, "is_popular": False},
        {"item_id": "item_009", "restaurant_id": "rest_002", "name": "Miso Soup", "description": "Traditional Japanese soup with tofu and seaweed", "price": 4.99, "category": "Soups", "is_available": True, "is_popular": False},
        {"item_id": "item_010", "restaurant_id": "rest_002", "name": "Spicy Miso Ramen", "description": "Spicy miso broth with ground pork and corn", "price": 16.99, "category": "Ramen", "is_available": True, "is_popular": True},
        {"item_id": "item_011", "restaurant_id": "rest_003", "name": "Classic Smash Burger", "description": "Double patty with cheese, lettuce, tomato", "price": 12.99, "category": "Burgers", "is_available": True, "is_popular": True},
        {"item_id": "item_012", "restaurant_id": "rest_003", "name": "Bacon BBQ Burger", "description": "Angus beef with bacon, cheddar, and BBQ sauce", "price": 14.99, "category": "Burgers", "is_available": True, "is_popular": True},
        {"item_id": "item_013", "restaurant_id": "rest_003", "name": "Loaded Fries", "description": "Crispy fries with cheese, bacon, and sour cream", "price": 8.99, "category": "Sides", "is_available": True, "is_popular": True},
        {"item_id": "item_014", "restaurant_id": "rest_003", "name": "Onion Rings", "description": "Beer-battered onion rings", "price": 6.99, "category": "Sides", "is_available": True, "is_popular": False},
        {"item_id": "item_015", "restaurant_id": "rest_003", "name": "Milkshake", "description": "Choose vanilla, chocolate, or strawberry", "price": 5.99, "category": "Drinks", "is_available": True, "is_popular": False},
        {"item_id": "item_016", "restaurant_id": "rest_004", "name": "Butter Chicken", "description": "Tender chicken in creamy tomato sauce", "price": 16.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_017", "restaurant_id": "rest_004", "name": "Lamb Biryani", "description": "Fragrant basmati rice with spiced lamb", "price": 18.99, "category": "Rice Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_018", "restaurant_id": "rest_004", "name": "Garlic Naan", "description": "Fresh baked bread with garlic butter", "price": 3.99, "category": "Bread", "is_available": True, "is_popular": True},
        {"item_id": "item_019", "restaurant_id": "rest_004", "name": "Samosa (2 pcs)", "description": "Crispy pastry filled with spiced potatoes", "price": 5.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        {"item_id": "item_020", "restaurant_id": "rest_004", "name": "Palak Paneer", "description": "Cottage cheese in spinach gravy", "price": 14.99, "category": "Main Dishes", "is_available": True, "is_popular": False},
        {"item_id": "item_021", "restaurant_id": "rest_005", "name": "Duck Confit", "description": "Slow-cooked duck leg with roasted potatoes", "price": 32.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_022", "restaurant_id": "rest_005", "name": "French Onion Soup", "description": "Classic soup with melted gruyere cheese", "price": 12.99, "category": "Soups", "is_available": True, "is_popular": True},
        {"item_id": "item_023", "restaurant_id": "rest_005", "name": "Steak Frites", "description": "Grilled ribeye with herb butter and fries", "price": 38.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_024", "restaurant_id": "rest_005", "name": "Crème Brûlée", "description": "Classic vanilla custard with caramelized sugar", "price": 10.99, "category": "Desserts", "is_available": True, "is_popular": False},
        {"item_id": "item_025", "restaurant_id": "rest_005", "name": "Escargot", "description": "Garlic butter snails in shell", "price": 16.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        {"item_id": "item_026", "restaurant_id": "rest_006", "name": "Street Tacos (3)", "description": "Choice of carnitas, chicken, or steak", "price": 10.99, "category": "Tacos", "is_available": True, "is_popular": True},
        {"item_id": "item_027", "restaurant_id": "rest_006", "name": "Burrito Bowl", "description": "Rice, beans, protein, and toppings", "price": 12.99, "category": "Bowls", "is_available": True, "is_popular": True},
        {"item_id": "item_028", "restaurant_id": "rest_006", "name": "Guacamole & Chips", "description": "Fresh made guacamole with tortilla chips", "price": 8.99, "category": "Appetizers", "is_available": True, "is_popular": True},
        {"item_id": "item_029", "restaurant_id": "rest_006", "name": "Quesadilla", "description": "Grilled tortilla with cheese and protein", "price": 11.99, "category": "Main Dishes", "is_available": True, "is_popular": False},
        {"item_id": "item_030", "restaurant_id": "rest_006", "name": "Churros", "description": "Fried dough with cinnamon sugar and chocolate", "price": 6.99, "category": "Desserts", "is_available": True, "is_popular": False},
        {"item_id": "item_031", "restaurant_id": "rest_007", "name": "Kung Pao Chicken", "description": "Spicy chicken with peanuts and peppers", "price": 15.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_032", "restaurant_id": "rest_007", "name": "Dim Sum Platter", "description": "Assorted dumplings and buns", "price": 18.99, "category": "Dim Sum", "is_available": True, "is_popular": True},
        {"item_id": "item_033", "restaurant_id": "rest_007", "name": "Peking Duck", "description": "Crispy duck with pancakes and hoisin", "price": 38.99, "category": "Specialties", "is_available": True, "is_popular": True},
        {"item_id": "item_034", "restaurant_id": "rest_007", "name": "Fried Rice", "description": "Wok-fried rice with egg and vegetables", "price": 10.99, "category": "Rice Dishes", "is_available": True, "is_popular": False},
        {"item_id": "item_035", "restaurant_id": "rest_007", "name": "Spring Rolls (4)", "description": "Crispy vegetable spring rolls", "price": 7.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        {"item_id": "item_036", "restaurant_id": "rest_008", "name": "Grilled Lamb Chops", "description": "Marinated lamb with Mediterranean herbs", "price": 28.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_037", "restaurant_id": "rest_008", "name": "Mixed Grill Platter", "description": "Chicken, lamb, and beef kebabs", "price": 24.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_038", "restaurant_id": "rest_008", "name": "Hummus & Pita", "description": "Creamy hummus with warm pita bread", "price": 8.99, "category": "Appetizers", "is_available": True, "is_popular": True},
        {"item_id": "item_039", "restaurant_id": "rest_008", "name": "Greek Salad", "description": "Fresh vegetables with feta and olives", "price": 11.99, "category": "Salads", "is_available": True, "is_popular": False},
        {"item_id": "item_040", "restaurant_id": "rest_008", "name": "Baklava", "description": "Honey-soaked phyllo pastry with nuts", "price": 7.99, "category": "Desserts", "is_available": True, "is_popular": False},
    ]
    
    await db.menu_items.insert_many(menu_items)
    
    # Create indexes for better performance
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.users.create_index("user_id", unique=True)
    await db.restaurants.create_index("restaurant_id", unique=True)
    await db.menu_items.create_index("restaurant_id")
    await db.orders.create_index("user_id")
    await db.favorites.create_index([("user_id", 1), ("restaurant_id", 1)], unique=True)
    await db.notifications.create_index("user_id")
    
    return {"message": "Database seeded successfully", "restaurants": len(restaurants), "menu_items": len(menu_items)}

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
