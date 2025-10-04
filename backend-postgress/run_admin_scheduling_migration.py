#!/usr/bin/env python3
"""
Migration script to add admin_scheduled field to test_invites table
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

async def run_migration():
    """Run the admin scheduling migration"""
    try:
        # Read the SQL migration file
        with open('add_admin_scheduling.sql', 'r') as f:
            migration_sql = f.read()
        
        # Connect to database
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("Running admin scheduling migration...")
        
        # Execute the migration
        await conn.execute(migration_sql)
        
        print("✅ Admin scheduling migration completed successfully!")
        
        # Verify the migration
        result = await conn.fetchrow("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'test_invites' AND column_name = 'admin_scheduled'
        """)
        
        if result:
            print(f"✅ Verified: admin_scheduled column exists")
            print(f"   - Type: {result['data_type']}")
            print(f"   - Nullable: {result['is_nullable']}")
            print(f"   - Default: {result['column_default']}")
        else:
            print("❌ Migration verification failed")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(run_migration())
