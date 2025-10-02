#!/usr/bin/env python3
"""
Simple script to run the theme settings migration.
Run this script after setting up your database to add theme functionality.
"""

import asyncio
import asyncpg
import os
from pathlib import Path

async def run_migration():
    # Database connection parameters
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'GoodYear2019')
    db_name = os.getenv('DB_NAME', 'interview_platform')
    
    try:
        # Connect to the database
        conn = await asyncpg.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name
        )
        
        print("Connected to database successfully!")
        
        # Read and execute the theme migration SQL
        migration_file = Path(__file__).parent / 'add_theme_settings.sql'
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        await conn.execute(migration_sql)
        print("Theme settings migration executed successfully!")
        
        await conn.close()
        print("Database connection closed.")
        
    except Exception as e:
        print(f"Error running migration: {e}")
        print("Please make sure:")
        print("1. PostgreSQL is running")
        print("2. Database credentials are correct")
        print("3. The database 'interview_platform' exists")
        print("4. You have the necessary permissions")

if __name__ == "__main__":
    print("Running theme settings migration...")
    asyncio.run(run_migration())
