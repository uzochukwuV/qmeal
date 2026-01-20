from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'qmeal_db')]

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
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionExchangeRequest(BaseModel):
    session_id: str

class SessionDataResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class Restaurant(BaseModel):
    restaurant_id: str = Field(default_factory=lambda: f"rest_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    cuisine_type: str
    rating: float = 0.0
    review_count: int = 0
    price_level: int = 2  # 1-4 ($ to $$$$)
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
    rating: int  # 1-5
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
    status: str = "pending"  # pending, confirmed, preparing, on_the_way, delivered
    delivery_address: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateOrderRequest(BaseModel):
    restaurant_id: str
    restaurant_name: str
    items: List[CartItem]
    subtotal: float
    delivery_fee: float
    total: float
    delivery_address: str

class CreateReviewRequest(BaseModel):
    restaurant_id: str
    rating: int
    comment: str

# ==================== AUTH HELPERS ====================

async def get_session_token_from_request(request: Request) -> Optional[str]:
    """Extract session token from cookie or Authorization header"""
    # First try cookie
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    
    # Then try Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None

async def get_current_user(request: Request) -> Optional[User]:
    """Get current authenticated user"""
    session_token = await get_session_token_from_request(request)
    if not session_token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    if not session:
        return None
    
    # Check expiry (handle timezone-naive dates from MongoDB)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
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

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session", response_model=SessionDataResponse)
async def exchange_session(request_data: SessionExchangeRequest, response: Response):
    """Exchange session_id from Emergent Auth for session_token"""
    try:
        async with httpx.AsyncClient() as client_http:
            auth_response = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request_data.session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            user_data = auth_response.json()
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Auth service unavailable")
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": user_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Delete any existing sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Create new session
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return SessionDataResponse(
        user_id=user_id,
        email=user_data["email"],
        name=user_data["name"],
        picture=user_data.get("picture"),
        session_token=session_token
    )

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(require_auth)):
    """Get current authenticated user"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = await get_session_token_from_request(request)
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

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
    
    # Determine sort order
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
        status="confirmed"
    )
    
    await db.orders.insert_one(order.dict())
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

# ==================== REVIEW ENDPOINTS ====================

@api_router.post("/reviews", response_model=Review)
async def create_review(
    review_data: CreateReviewRequest,
    current_user: User = Depends(require_auth)
):
    """Create a new review"""
    # Check restaurant exists
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

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample data"""
    # Check if already seeded
    existing = await db.restaurants.count_documents({})
    if existing > 0:
        return {"message": "Database already seeded", "restaurant_count": existing}
    
    # Sample restaurants
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
    
    # Insert restaurants
    await db.restaurants.insert_many(restaurants)
    
    # Sample menu items for each restaurant
    menu_items = [
        # Bella Italia
        {"item_id": "item_001", "restaurant_id": "rest_001", "name": "Margherita Pizza", "description": "Fresh mozzarella, tomato sauce, and basil", "price": 14.99, "category": "Pizza", "is_available": True, "is_popular": True},
        {"item_id": "item_002", "restaurant_id": "rest_001", "name": "Spaghetti Carbonara", "description": "Creamy pasta with bacon and parmesan", "price": 16.99, "category": "Pasta", "is_available": True, "is_popular": True},
        {"item_id": "item_003", "restaurant_id": "rest_001", "name": "Tiramisu", "description": "Classic Italian dessert with coffee and mascarpone", "price": 8.99, "category": "Desserts", "is_available": True, "is_popular": False},
        {"item_id": "item_004", "restaurant_id": "rest_001", "name": "Bruschetta", "description": "Toasted bread with tomatoes, garlic, and olive oil", "price": 9.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        {"item_id": "item_005", "restaurant_id": "rest_001", "name": "Lasagna", "description": "Layers of pasta, meat sauce, and cheese", "price": 18.99, "category": "Pasta", "is_available": True, "is_popular": True},
        
        # Tokyo Ramen House
        {"item_id": "item_006", "restaurant_id": "rest_002", "name": "Tonkotsu Ramen", "description": "Rich pork bone broth with chashu and soft egg", "price": 15.99, "category": "Ramen", "is_available": True, "is_popular": True},
        {"item_id": "item_007", "restaurant_id": "rest_002", "name": "Gyoza (6 pcs)", "description": "Pan-fried pork dumplings", "price": 8.99, "category": "Appetizers", "is_available": True, "is_popular": True},
        {"item_id": "item_008", "restaurant_id": "rest_002", "name": "Chicken Katsu Curry", "description": "Crispy chicken cutlet with Japanese curry", "price": 16.99, "category": "Main Dishes", "is_available": True, "is_popular": False},
        {"item_id": "item_009", "restaurant_id": "rest_002", "name": "Miso Soup", "description": "Traditional Japanese soup with tofu and seaweed", "price": 4.99, "category": "Soups", "is_available": True, "is_popular": False},
        {"item_id": "item_010", "restaurant_id": "rest_002", "name": "Spicy Miso Ramen", "description": "Spicy miso broth with ground pork and corn", "price": 16.99, "category": "Ramen", "is_available": True, "is_popular": True},
        
        # Burger Republic
        {"item_id": "item_011", "restaurant_id": "rest_003", "name": "Classic Smash Burger", "description": "Double patty with cheese, lettuce, tomato", "price": 12.99, "category": "Burgers", "is_available": True, "is_popular": True},
        {"item_id": "item_012", "restaurant_id": "rest_003", "name": "Bacon BBQ Burger", "description": "Angus beef with bacon, cheddar, and BBQ sauce", "price": 14.99, "category": "Burgers", "is_available": True, "is_popular": True},
        {"item_id": "item_013", "restaurant_id": "rest_003", "name": "Loaded Fries", "description": "Crispy fries with cheese, bacon, and sour cream", "price": 8.99, "category": "Sides", "is_available": True, "is_popular": True},
        {"item_id": "item_014", "restaurant_id": "rest_003", "name": "Onion Rings", "description": "Beer-battered onion rings", "price": 6.99, "category": "Sides", "is_available": True, "is_popular": False},
        {"item_id": "item_015", "restaurant_id": "rest_003", "name": "Milkshake", "description": "Choose vanilla, chocolate, or strawberry", "price": 5.99, "category": "Drinks", "is_available": True, "is_popular": False},
        
        # Spice Garden
        {"item_id": "item_016", "restaurant_id": "rest_004", "name": "Butter Chicken", "description": "Tender chicken in creamy tomato sauce", "price": 16.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_017", "restaurant_id": "rest_004", "name": "Lamb Biryani", "description": "Fragrant basmati rice with spiced lamb", "price": 18.99, "category": "Rice Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_018", "restaurant_id": "rest_004", "name": "Garlic Naan", "description": "Fresh baked bread with garlic butter", "price": 3.99, "category": "Bread", "is_available": True, "is_popular": True},
        {"item_id": "item_019", "restaurant_id": "rest_004", "name": "Samosa (2 pcs)", "description": "Crispy pastry filled with spiced potatoes", "price": 5.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        {"item_id": "item_020", "restaurant_id": "rest_004", "name": "Palak Paneer", "description": "Cottage cheese in spinach gravy", "price": 14.99, "category": "Main Dishes", "is_available": True, "is_popular": False},
        
        # Le Petit Bistro
        {"item_id": "item_021", "restaurant_id": "rest_005", "name": "Duck Confit", "description": "Slow-cooked duck leg with roasted potatoes", "price": 32.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_022", "restaurant_id": "rest_005", "name": "French Onion Soup", "description": "Classic soup with melted gruyere cheese", "price": 12.99, "category": "Soups", "is_available": True, "is_popular": True},
        {"item_id": "item_023", "restaurant_id": "rest_005", "name": "Steak Frites", "description": "Grilled ribeye with herb butter and fries", "price": 38.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_024", "restaurant_id": "rest_005", "name": "Crème Brûlée", "description": "Classic vanilla custard with caramelized sugar", "price": 10.99, "category": "Desserts", "is_available": True, "is_popular": False},
        {"item_id": "item_025", "restaurant_id": "rest_005", "name": "Escargot", "description": "Garlic butter snails in shell", "price": 16.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        
        # Taco Fiesta
        {"item_id": "item_026", "restaurant_id": "rest_006", "name": "Street Tacos (3)", "description": "Choice of carnitas, chicken, or steak", "price": 10.99, "category": "Tacos", "is_available": True, "is_popular": True},
        {"item_id": "item_027", "restaurant_id": "rest_006", "name": "Burrito Bowl", "description": "Rice, beans, protein, and toppings", "price": 12.99, "category": "Bowls", "is_available": True, "is_popular": True},
        {"item_id": "item_028", "restaurant_id": "rest_006", "name": "Guacamole & Chips", "description": "Fresh made guacamole with tortilla chips", "price": 8.99, "category": "Appetizers", "is_available": True, "is_popular": True},
        {"item_id": "item_029", "restaurant_id": "rest_006", "name": "Quesadilla", "description": "Grilled tortilla with cheese and protein", "price": 11.99, "category": "Main Dishes", "is_available": True, "is_popular": False},
        {"item_id": "item_030", "restaurant_id": "rest_006", "name": "Churros", "description": "Fried dough with cinnamon sugar and chocolate", "price": 6.99, "category": "Desserts", "is_available": True, "is_popular": False},
        
        # Dragon Palace
        {"item_id": "item_031", "restaurant_id": "rest_007", "name": "Kung Pao Chicken", "description": "Spicy chicken with peanuts and peppers", "price": 15.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_032", "restaurant_id": "rest_007", "name": "Dim Sum Platter", "description": "Assorted dumplings and buns", "price": 18.99, "category": "Dim Sum", "is_available": True, "is_popular": True},
        {"item_id": "item_033", "restaurant_id": "rest_007", "name": "Peking Duck", "description": "Crispy duck with pancakes and hoisin", "price": 38.99, "category": "Specialties", "is_available": True, "is_popular": True},
        {"item_id": "item_034", "restaurant_id": "rest_007", "name": "Fried Rice", "description": "Wok-fried rice with egg and vegetables", "price": 10.99, "category": "Rice Dishes", "is_available": True, "is_popular": False},
        {"item_id": "item_035", "restaurant_id": "rest_007", "name": "Spring Rolls (4)", "description": "Crispy vegetable spring rolls", "price": 7.99, "category": "Appetizers", "is_available": True, "is_popular": False},
        
        # Mediterranean Grill
        {"item_id": "item_036", "restaurant_id": "rest_008", "name": "Grilled Lamb Chops", "description": "Marinated lamb with Mediterranean herbs", "price": 28.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_037", "restaurant_id": "rest_008", "name": "Mixed Grill Platter", "description": "Chicken, lamb, and beef kebabs", "price": 24.99, "category": "Main Dishes", "is_available": True, "is_popular": True},
        {"item_id": "item_038", "restaurant_id": "rest_008", "name": "Hummus & Pita", "description": "Creamy hummus with warm pita bread", "price": 8.99, "category": "Appetizers", "is_available": True, "is_popular": True},
        {"item_id": "item_039", "restaurant_id": "rest_008", "name": "Greek Salad", "description": "Fresh vegetables with feta and olives", "price": 11.99, "category": "Salads", "is_available": True, "is_popular": False},
        {"item_id": "item_040", "restaurant_id": "rest_008", "name": "Baklava", "description": "Honey-soaked phyllo pastry with nuts", "price": 7.99, "category": "Desserts", "is_available": True, "is_popular": False},
    ]
    
    await db.menu_items.insert_many(menu_items)
    
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
