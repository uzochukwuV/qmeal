#!/usr/bin/env python3
"""
Fix existing owner user password field name
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def fix_owner_password():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'qmeal_db')]
    
    # Find owner user with old password field
    owner = await db.users.find_one({"email": "owner@bellatest.com"})
    if owner and "password" in owner and "password_hash" not in owner:
        print(f"Found owner user with old password field: {owner['email']}")
        
        # Update the field name
        await db.users.update_one(
            {"email": "owner@bellatest.com"},
            {
                "$rename": {"password": "password_hash"}
            }
        )
        print("Updated password field name from 'password' to 'password_hash'")
    else:
        print("Owner user not found or already has correct password_hash field")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(fix_owner_password())