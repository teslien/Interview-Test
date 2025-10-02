#!/usr/bin/env python3
"""
Script to fix monitoring status and timestamps for existing test submissions
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend-postgress/.env')

async def fix_monitoring_data():
    try:
        # Connect to database
        conn = await asyncpg.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            database=os.environ.get('DB_NAME', 'interview_platform'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', 'GoodYear2019')
        )
        print("✓ Database connection successful")
        
        # Fix monitoring status based on WebRTC sessions
        print("\n=== FIXING MONITORING STATUS ===")
        
        # Update submissions to reflect actual monitoring status
        result1 = await conn.execute("""
            UPDATE test_submissions 
            SET is_monitored = true
            WHERE invite_id IN (
                SELECT invite_id FROM active_webrtc_sessions 
                WHERE status IN ('connected', 'offer_sent')
            )
        """)
        print(f"✓ Updated monitoring status to 'true' for monitored sessions")
        
        # Update submissions to reflect no monitoring for sessions that ended
        result2 = await conn.execute("""
            UPDATE test_submissions 
            SET is_monitored = false
            WHERE invite_id IN (
                SELECT invite_id FROM active_webrtc_sessions 
                WHERE status = 'ended'
            )
        """)
        print(f"✓ Updated monitoring status to 'false' for ended sessions")
        
        # Fix started_at timestamps that are null or incorrect
        print("\n=== FIXING STARTED_AT TIMESTAMPS ===")
        
        # Update submissions with null started_at to use invite's started_at
        result3 = await conn.execute("""
            UPDATE test_submissions 
            SET started_at = ti.started_at
            FROM test_invites ti
            WHERE test_submissions.invite_id = ti.id 
            AND test_submissions.started_at IS NULL
            AND ti.started_at IS NOT NULL
        """)
        print(f"✓ Fixed null started_at timestamps")
        
        # Update submissions with incorrect started_at (like epoch time) to use invite's started_at
        result4 = await conn.execute("""
            UPDATE test_submissions 
            SET started_at = ti.started_at
            FROM test_invites ti
            WHERE test_submissions.invite_id = ti.id 
            AND test_submissions.started_at < '2020-01-01'::timestamp
            AND ti.started_at IS NOT NULL
        """)
        print(f"✓ Fixed incorrect started_at timestamps")
        
        # Show current status
        print("\n=== CURRENT STATUS ===")
        submissions = await conn.fetch("""
            SELECT ts.id, ts.applicant_email, ts.started_at, ts.is_monitored,
                   ti.started_at as invite_started_at,
                   aws.status as webrtc_status
            FROM test_submissions ts
            JOIN test_invites ti ON ts.invite_id = ti.id
            LEFT JOIN active_webrtc_sessions aws ON ts.invite_id = aws.invite_id
            ORDER BY ts.submitted_at DESC
            LIMIT 5
        """)
        
        for sub in submissions:
            print(f"• {sub['applicant_email']}")
            print(f"  Started: {sub['started_at']}")
            print(f"  Monitored: {sub['is_monitored']}")
            print(f"  WebRTC Status: {sub['webrtc_status']}")
            print()
        
        await conn.close()
        print("✓ Data fix complete")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Fixing monitoring status and timestamps...")
    asyncio.run(fix_monitoring_data())
