import asyncpg
import asyncio
import os
from dotenv import load_dotenv

async def test_db():
    load_dotenv()
    try:
        conn = await asyncpg.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            port=int(os.environ.get('DB_PORT', 5432)),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', 'password'),
            database=os.environ.get('DB_NAME', 'interview_platform')
        )
        print('[OK] Database connection successful')

        # Check if tables exist
        tables = await conn.fetch('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'')
        table_names = [t['table_name'] for t in tables]
        print('Existing tables:', table_names)

        # Check if our required tables exist
        required_tables = ['webrtc_signals', 'active_webrtc_sessions', 'test_invites']
        for table in required_tables:
            if table in table_names:
                print(f'[OK] {table} exists')
            else:
                print(f'[MISSING] {table} missing')

        await conn.close()
    except Exception as e:
        print('[ERROR] Database error:', str(e))

if __name__ == "__main__":
    asyncio.run(test_db())
