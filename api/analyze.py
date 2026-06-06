import os
import json
import urllib.request
import urllib.error
import re
import traceback
import logging
from datetime import datetime
from http.server import BaseHTTPRequestHandler

# Structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VastuVisionServerless")

# Read API Key from environment
API_KEY = os.environ.get("GROQ_API_KEY")
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

MAX_PAYLOAD_BYTES = 16 * 1024 * 1024  # 16MB max request body
ALLOWED_ROOM_TYPES = {"bedroom", "kitchen", "living_room", "pooja_room", "bathroom"}

# Security headers applied to all responses
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; script-src 'self'; connect-src 'self'",
}

class handler(BaseHTTPRequestHandler):
    def _send_security_headers(self):
        """Inject security headers into every response."""
        for header, value in SECURITY_HEADERS.items():
            self.send_header(header, value)

    def do_OPTIONS(self):
        """CORS preflight request handling."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_error_response(self, code, message):
        """Helper to send unified JSON error responses."""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self._send_security_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))

    def do_POST(self):
        """Main endpoint logic for Vastu layout analysis."""
        content_length_str = self.headers.get('Content-Length')
        if not content_length_str:
            self.send_error_response(411, "Content-Length header required.")
            return

        try:
            content_length = int(content_length_str)
        except ValueError:
            self.send_error_response(400, "Invalid Content-Length header.")
            return

        if content_length > MAX_PAYLOAD_BYTES:
            self.send_error_response(413, f"Payload too large. Maximum allowed: {MAX_PAYLOAD_BYTES // (1024*1024)}MB.")
            return

        post_data = self.rfile.read(content_length)
        
        try:
            request_payload = json.loads(post_data.decode('utf-8'))
            room_type = request_payload.get('room_type', 'unknown')

            # --- Room type whitelist ---
            if room_type not in ALLOWED_ROOM_TYPES:
                self.send_error_response(400, f"Invalid room type. Allowed: {', '.join(sorted(ALLOWED_ROOM_TYPES))}")
                return
            
            previous_analysis = request_payload.get('previous_analysis')
            correction = request_payload.get('correction')
            
            if previous_analysis and correction:
                # --- Correction length guard ---
                if len(str(correction)) > 2000:
                    self.send_error_response(400, "Correction text too long. Maximum 2000 characters.")
                    return
                logger.info("Refinement request for room_type=%s", room_type)
                response_json = self.call_groq_refinement(room_type, previous_analysis, correction)
            else:
                images = request_payload.get('images', {})
                if not images:
                    self.send_error_response(400, "No images provided.")
                    return
                logger.info("Vision analysis request for room_type=%s (%d images)", room_type, len(images))
                response_json = self.call_groq_vision(room_type, images)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self._send_security_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response_json).encode('utf-8'))
            
        except json.JSONDecodeError:
            self.send_error_response(400, "Invalid JSON in request body.")
        except Exception as e:
            logger.error("Error during analysis: %s", traceback.format_exc())
            self.send_error_response(500, "Analysis failed. Please try again later.")

    def call_groq_vision(self, room_type, images):
        system_prompt = f"""You are a Vastu Shastra expert AI specializing in architectural layout and interior design.
Analyze the provided 4 directional photos of a '{room_type}' (facing North, South, East, and West walls).

Task:
1. Detect all visible furniture and key household items.
2. Identify which wall/direction each item is placed near based on the image labels.
3. Evaluate if the placement complies with Vastu Shastra guidelines.
4. Calculate an overall Vastu Compliance Score (0-100) based on items detected (default to 100 if all good, deduct 20 points for each critical violation, and 10 for each warning).

Vastu Rules Reference for '{room_type}':
- Bed / Sleeping Head: Ideal: South or East. Wrong: North (disturbs body magnetic field). Status: critical.
- Cooking Stove: Ideal: South-East. Wrong: North-East or North. Status: critical.
- Main Entrance: Ideal: North, East, North-East. Wrong: South. Status: warning.
- Mirror: Ideal: North or East wall. Wrong: South wall (creates anxiety). Status: warning.
- Study Desk: Ideal: East or North. Wrong: South or West. Status: warning.
- Sofa / Seating: Ideal: West or South wall. Wrong: Center or East. Status: good/warning.
- Water (Sink, Fountain): Ideal: North-East or North. Wrong: South-East (conflicts with fire). Status: critical.
- TV / Electronics: Ideal: South-East wall. Wrong: North-East. Status: warning.
- Pooja / Prayer Room: Ideal: North-East corner. Wrong: South-West. Status: critical.
- Toilet / Bathroom: Ideal: South or West. Wrong: North-East. Status: critical.
- Heavy Storage / Almirah: Ideal: South or West wall. Wrong: North or East. Status: warning.
- Plants: Ideal: North or East. Wrong: South-West. Status: warning.
- Clock: Ideal: North wall. Wrong: South wall. Status: warning.
- Fish Tank: Ideal: North-East. Wrong: South-East. Status: warning.

You must return ONLY a single valid raw JSON object matching the schema below. No markdown wrapping (like ```json ... ```). No explanations.

Expected JSON Schema:
{{
  "room_type": "{room_type}",
  "vastu_score": 80,
  "objects": [
    {{
      "name": "Bed",
      "detected_direction": "North",
      "vastu_ideal": "South or East",
      "status": "critical",
      "reason": "Sleeping with head to North aligns body against Earth magnetic field.",
      "suggestion": "Rotate the bed so the head faces South or East."
    }},
    {{
      "name": "Mirror",
      "detected_direction": "East",
      "vastu_ideal": "North or East",
      "status": "good",
      "reason": "Mirror on East wall reflects positive energy inward.",
      "suggestion": "No change needed."
    }}
  ]
}}"""

        content_list = [
            {"type": "text", "text": f"Please analyze these 4 directional photos of the {room_type} for Vastu Shastra compliance."}
        ]

        # Add available images
        for direction in ['north', 'south', 'east', 'west']:
            img_b64 = images.get(direction)
            if img_b64:
                if "," in img_b64:
                    img_b64 = img_b64.split(",")[1]
                
                content_list.append({
                    "type": "text",
                    "text": f"[{direction.upper()} WALL IMAGE]"
                })
                content_list.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img_b64}"
                    }
                })

        payload = {
            "model": MODEL,
            "max_tokens": 1000,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": content_list
                }
            ]
        }

        return self._send_groq_request(payload, "Vision")

    def call_groq_refinement(self, room_type, previous_analysis, correction):
        system_prompt = f"""You are a Vastu Shastra expert AI specializing in interior room layout analysis.
The user previously ran an AI Vastu analysis on their '{room_type}'.
Here is the previous JSON analysis results:
{json.dumps(previous_analysis)}

Please adjust the Vastu analysis JSON based on the user's manual input:
1. If the user states an item is NOT there, remove it from the list of objects.
2. If the user adds or corrects the location of an item, update or add that item. Re-evaluate its Vastu compliance based on Vastu principles, and set the correct status (good/warning/critical), reason, and suggestions.
3. Recalculate the `vastu_score` (100 base, deduct 20 points for each critical violation, 10 for warnings).
4. Return ONLY a single raw valid JSON matching the schema below. No markdown wrapping. No explanations.

Expected JSON Schema:
{{
  "room_type": "{room_type}",
  "vastu_score": 80,
  "objects": [
    {{
      "name": "Bed",
      "detected_direction": "North",
      "vastu_ideal": "South or East",
      "status": "critical",
      "reason": "Sleeping with head to North aligns body against Earth magnetic field.",
      "suggestion": "Rotate the bed so the head faces South or East."
    }}
  ]
}}"""

        payload = {
            "model": MODEL,
            "max_tokens": 1000,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": f"The user has provided the following manual corrections or overrides:\n\"{correction}\""
                }
            ]
        }

        return self._send_groq_request(payload, "Refinement")

    def _send_groq_request(self, payload, label="API"):
        """Shared Groq API call handler with JSON extraction and error handling."""
        if not API_KEY:
            raise Exception("GROQ_API_KEY environment variable is not set on the serverless runtime.")

        req_body = json.dumps(payload).encode('utf-8')
        
        req = urllib.request.Request(
            ENDPOINT,
            data=req_body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
                "User-Agent": "VastuVision/1.0"
            },
            method="POST"
        )

        start_time = datetime.now()
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                resp_data = response.read().decode('utf-8')
                resp_json = json.loads(resp_data)
                
                raw_text = resp_json['choices'][0]['message']['content'].strip()
                elapsed = (datetime.now() - start_time).total_seconds()
                logger.info("Groq %s response received in %.1fs", label, elapsed)
                
                clean_text = raw_text
                if raw_text.startswith("```"):
                    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
                    if match:
                        clean_text = match.group(1)
                
                return json.loads(clean_text)
                
        except urllib.error.HTTPError as he:
            err_body = he.read().decode('utf-8')
            logger.error("Groq %s API HTTP Error %d: %s", label, he.code, err_body)
            raise Exception(f"Groq API returned error code {he.code}")
        except json.JSONDecodeError as je:
            logger.error("Failed to parse Groq %s response as JSON: %s", label, str(je))
            raise Exception("AI returned invalid response format. Please try again.")
        except Exception as e:
            logger.error("Error communicating with Groq (%s): %s", label, str(e))
            raise e
