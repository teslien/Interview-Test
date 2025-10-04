#!/usr/bin/env python3
"""
Debug script to check why invites are not showing in admin dashboard
"""
import asyncio
import asyncpg
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend-postgress/.env')

async def debug_invites_issue():
    try:
        # Connect to database
        conn = await asyncpg.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            database=os.environ.get('DB_NAME', 'interview_platform'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', 'GoodYear2019')
        )
        print("✓ Database connection successful")
        
        # Check admin users
        print("\n=== ADMIN USERS ===")
        admins = await conn.fetch("""
            SELECT id, email, full_name, role, created_at 
            FROM users 
            WHERE role = 'admin'
            ORDER BY created_at DESC
        """)
        
        for admin in admins:
            print(f"• {admin['email']} - {admin['full_name']} (ID: {admin['id']})")
        
        # Check all invites
        print("\n=== ALL TEST INVITES ===")
        all_invites = await conn.fetch("""
            SELECT ti.id, ti.applicant_email, ti.applicant_name, ti.status, 
                   ti.created_at, ti.invited_by, u.email as admin_email
            FROM test_invites ti
            LEFT JOIN users u ON ti.invited_by = u.id
            ORDER BY ti.created_at DESC
        """)
        
        for invite in all_invites:
            print(f"• {invite['applicant_email']} -> {invite['applicant_name']} ({invite['status']})")
            print(f"  Created: {invite['created_at']}")
            print(f"  Invited by: {invite['admin_email']} (ID: {invite['invited_by']})")
            print()
        
        # Check invites for each admin
        for admin in admins:
            print(f"\n=== INVITES FOR ADMIN: {admin['email']} ===")
            admin_invites = await conn.fetch("""
                SELECT ti.id, ti.applicant_email, ti.applicant_name, ti.status, 
                       ti.created_at, ti.invited_by
                FROM test_invites ti
                WHERE ti.invited_by = $1
                ORDER BY ti.created_at DESC
            """, admin['id'])
            
            if admin_invites:
                for invite in admin_invites:
                    print(f"• {invite['applicant_email']} -> {invite['applicant_name']} ({invite['status']})")
                    print(f"  Created: {invite['created_at']}")
            else:
                print("  No invites found for this admin")
        
        # Check if there are any invites without invited_by
        print("\n=== INVITES WITHOUT INVITED_BY ===")
        orphaned_invites = await conn.fetch("""
            SELECT id, applicant_email, applicant_name, status, created_at, invited_by
            FROM test_invites
            WHERE invited_by IS NULL
        """)
        
        if orphaned_invites:
            for invite in orphaned_invites:
                print(f"• {invite['applicant_email']} -> {invite['applicant_name']} ({invite['status']})")
                print(f"  Created: {invite['created_at']}")
                print(f"  invited_by: {invite['invited_by']}")
        else:
            print("  No orphaned invites found")
        
        await conn.close()
        print("\n✓ Debug complete")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Debugging invites issue...")
    asyncio.run(debug_invites_issue())
