#!/usr/bin/env python3
"""
Script to add email status fields to test_invites table
Run this script to update the database schema
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    # Database connection parameters
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/interview_platform')
    
    try:
        # Connect to database
        conn = await asyncpg.connect(db_url)
        print("Connected to database successfully")
        
        # Read and execute the migration SQL
        with open('add_email_status_to_invites.sql', 'r') as f:
            migration_sql = f.read()
        
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements, 1):
            print(f"Executing statement {i}/{len(statements)}...")
            await conn.execute(statement)
            print(f"Statement {i} executed successfully")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        if 'conn' in locals():
            await conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    asyncio.run(run_migration())
