import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from dotenv import load_dotenv

# Load env variables from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

# If modifying these scopes, delete any saved token.
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    print("=== Google Drive OAuth Token Generator ===\n")
    
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')

    if not client_id or not client_secret or client_id == "your_google_client_id_here":
        print("Required credentials not found in backend/.env")
        client_id = input("Enter your OAuth Client ID: ").strip()
        client_secret = input("Enter your OAuth Client Secret: ").strip()

    if not client_id or not client_secret:
        print("Error: Client ID and Secret are required.")
        return

    # Configuration required for InstalledAppFlow
    flow_config = {
        "web": {
            "client_id": client_id,
            "project_id": "trip-planner-oauth",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret,
            "redirect_uris": ["http://localhost"]
        }
    }

    try:
        # Run local server flow which opens the browser for user consent
        flow = InstalledAppFlow.from_client_config(flow_config, SCOPES)
        creds = flow.run_local_server(port=0, prompt='consent', access_type='offline')

        print("\n=== ✨ Authentication Successful! ===")
        print("Please copy the following token and add it to your backend/.env file:\n")
        
        print(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
        
        print("\n====================================")
        
        if not creds.refresh_token:
            print("\nWarning: No refresh token was returned. If you have authenticated before,")
            print("you might need to go to https://myaccount.google.com/permissions")
            print("and remove access for this app, then try running this script again.")
            
    except Exception as e:
        print(f"\nError during authentication: {e}")

if __name__ == '__main__':
    main()
