import sqlite3
from datetime import datetime

def reset_message_read_status(db_path='db.sqlite3', dry_run=False, conversation_id=None):
    """
    Reset all message read statuses to mark them as read in the SQLite database.
    
    Args:
        db_path: Path to the SQLite database file
        dry_run: If True, only show what would be done without making changes
        conversation_id: If provided, only reset messages for this specific conversation
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Build the query
        query = "SELECT id, conversation_id, sender_id, is_read FROM app_message WHERE is_read = 0"
        params = []
        
        if conversation_id:
            query += " AND conversation_id = ?"
            params.append(conversation_id)
        
        cursor.execute(query, params)
        messages = cursor.fetchall()
        
        print(f"=== Reset Message Read Status ===")
        print(f"Found {len(messages)} unread messages")
        
        if dry_run:
            print("DRY RUN - No changes will be made")
            for msg in messages[:10]:  # Show first 10
                print(f"  - Message {msg[0]} in conversation {msg[1]} from sender {msg[2]}")
            if len(messages) > 10:
                print(f"  ... and {len(messages) - 10} more")
            return
        
        if len(messages) == 0:
            print("No unread messages found. Nothing to do.")
            return
        
        # Confirm
        response = input(f'About to mark {len(messages)} messages as read. Continue? (yes/no): ')
        if response.lower() != 'yes':
            print("Aborted.")
            return
        
        # Update messages
        update_query = "UPDATE app_message SET is_read = 1, read_at = ? WHERE is_read = 0"
        update_params = [datetime.now().isoformat()]
        
        if conversation_id:
            update_query += " AND conversation_id = ?"
            update_params.append(conversation_id)
        
        cursor.execute(update_query, update_params)
        updated = cursor.rowcount
        conn.commit()
        
        print(f"Successfully marked {updated} messages as read")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    
    dry_run = '--dry-run' in sys.argv
    conversation_id = None
    
    for arg in sys.argv:
        if arg.startswith('--conversation-id='):
            try:
                conversation_id = int(arg.split('=')[1])
            except ValueError:
                print("Invalid conversation ID")
                sys.exit(1)
    
    reset_message_read_status(
        db_path='db.sqlite3',
        dry_run=dry_run,
        conversation_id=conversation_id
    )
