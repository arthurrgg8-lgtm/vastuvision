import json
import urllib.request
import urllib.error
import base64
import os

def test_vastuvision_api():
    print("Testing VastuVision API end-to-end...")
    
    # 1. Locate sample image
    image_path = "/home/lazzy/sample.jpg"
    if not os.path.exists(image_path):
        print(f"Error: Sample image not found at {image_path}")
        return
        
    # 2. Base64 encode the image
    with open(image_path, "rb") as f:
        img_bytes = f.read()
        img_b64 = base64.b64encode(img_bytes).decode('utf-8')
        
    # 3. Construct payload (send same image for all 4 directions)
    payload = {
        "room_type": "bedroom",
        "images": {
            "north": img_b64,
            "south": img_b64,
            "east": img_b64,
            "west": img_b64
        }
    }
    
    # 4. POST request to local server
    url = "http://localhost:9091/api/analyze"
    data = json.dumps(payload).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        print("Sending request to local server (http://localhost:9091/api/analyze)...")
        with urllib.request.urlopen(req, timeout=60) as response:
            resp_data = response.read().decode('utf-8')
            resp_json = json.loads(resp_data)
            print("\nAPI Response:")
            print(json.dumps(resp_json, indent=2))
    except urllib.error.HTTPError as he:
        print(f"HTTP Error {he.code}: {he.read().decode('utf-8')}")
    except Exception as e:
        print(f"Connection/Server error: {str(e)}")

if __name__ == "__main__":
    test_vastuvision_api()
