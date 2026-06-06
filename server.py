import os
import json
import urllib.request
import urllib.error
import http.server
import socketserver
import re
import traceback
import logging
from datetime import datetime

# Structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("VastuVision")

PORT = 9091
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

# API Config retrieved from environment
API_KEY = os.environ.get("GROQ_API_KEY")
if not API_KEY:
    logger.warning("GROQ_API_KEY environment variable is not set. API calls will fail.")
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

# Security constants
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


def generate_mock_analysis(room_type, previous_analysis=None, correction=None):
    if previous_analysis and correction:
        try:
            # Deep clone previous analysis
            result = json.loads(json.dumps(previous_analysis))
        except Exception:
            result = {"room_type": room_type, "vastu_score": 100, "objects": []}

        corr_lower = correction.lower()

        # Handle removals
        if "remove" in corr_lower or "delete" in corr_lower:
            keywords = ["bed", "mirror", "desk", "stove", "sink", "water", "wardrobe", "storage", "tv", "sofa", "plants", "clock"]
            for kw in keywords:
                if kw in corr_lower:
                    result["objects"] = [obj for obj in result.get("objects", []) if kw not in obj["name"].lower()]
        else:
            # Handle moving/adding
            target_dir = None
            if "north" in corr_lower:
                target_dir = "North"
            elif "south" in corr_lower:
                target_dir = "South"
            elif "east" in corr_lower:
                target_dir = "East"
            elif "west" in corr_lower:
                target_dir = "West"

            obj_name = None
            if "bed" in corr_lower:
                obj_name = "Bed"
            elif "mirror" in corr_lower:
                obj_name = "Mirror"
            elif "desk" in corr_lower or "table" in corr_lower:
                obj_name = "Study Desk"
            elif "stove" in corr_lower or "oven" in corr_lower:
                obj_name = "Cooking Stove"
            elif "sink" in corr_lower or "water" in corr_lower:
                obj_name = "Water Sink"
            elif "wardrobe" in corr_lower or "almirah" in corr_lower or "storage" in corr_lower:
                obj_name = "Heavy Wardrobe"
            elif "sofa" in corr_lower or "seating" in corr_lower:
                obj_name = "Sofa"
            elif "tv" in corr_lower or "television" in corr_lower:
                obj_name = "TV"

            if obj_name and target_dir:
                existing_obj = None
                for obj in result.get("objects", []):
                    if obj["name"].lower() == obj_name.lower() or obj_name.lower() in obj["name"].lower():
                        existing_obj = obj
                        break

                rules = {
                    "Bed": {
                        "ideal": "South or East",
                        "good_dirs": ["south", "east"],
                        "bad_dirs": {"north": ("critical", "Sleeping with head to North aligns body against Earth magnetic field, disrupting health.")},
                        "warning_dirs": {"west": ("warning", "Sleeping with head to West is acceptable but not ideal.")}
                    },
                    "Mirror": {
                        "ideal": "North or East",
                        "good_dirs": ["north", "east"],
                        "bad_dirs": {"south": ("warning", "Mirror on South wall creates anxiety and absorbs negative energy reflections.")},
                        "warning_dirs": {"west": ("warning", "Mirror on West wall may reflect positive energy out.")}
                    },
                    "Study Desk": {
                        "ideal": "East or North",
                        "good_dirs": ["east", "north"],
                        "bad_dirs": {"south": ("warning", "Desk facing South blocks creative energy flow and concentration.")},
                        "warning_dirs": {"west": ("warning", "Desk facing West leads to distraction.")}
                    },
                    "Cooking Stove": {
                        "ideal": "South-East",
                        "good_dirs": ["south-east", "southeast", "south"],
                        "bad_dirs": {"north": ("critical", "Cooking stove in North conflicts with the Water energy of the zone."),
                                    "north-east": ("critical", "Cooking stove in North-East harms health and peace of mind.")}
                    },
                    "Water Sink": {
                        "ideal": "North or East",
                        "good_dirs": ["north", "east"],
                        "bad_dirs": {"south-east": ("critical", "Water sink in South-East conflicts directly with the Fire energy of the zone.")}
                    },
                    "Heavy Wardrobe": {
                        "ideal": "South or West",
                        "good_dirs": ["south", "west"],
                        "bad_dirs": {"north": ("warning", "Heavy elements in North block incoming wealth opportunities."),
                                    "east": ("warning", "Heavy elements in East block morning sunlight and positive energy.")}
                    }
                }

                rule = rules.get(obj_name, {
                    "ideal": "North or East",
                    "good_dirs": ["north", "east"],
                    "bad_dirs": {},
                    "warning_dirs": {}
                })

                status = "good"
                reason = f"{obj_name} on {target_dir} wall is aligned with Vastu Shastra rules."
                suggestion = "No change needed."

                target_dir_lower = target_dir.lower()
                if target_dir_lower in rule["good_dirs"]:
                    status = "good"
                elif target_dir_lower in rule.get("bad_dirs", {}):
                    status, reason = rule["bad_dirs"][target_dir_lower]
                    suggestion = f"Move the {obj_name} to the {rule['ideal']} wall."
                elif target_dir_lower in rule.get("warning_dirs", {}):
                    status, reason = rule["warning_dirs"][target_dir_lower]
                    suggestion = f"Move the {obj_name} to the {rule['ideal']} wall to improve compliance."
                else:
                    status = "warning"
                    reason = f"{obj_name} on {target_dir} is not in its optimal zone."
                    suggestion = f"Consider moving it to the {rule['ideal']} wall."

                if existing_obj:
                    existing_obj["detected_direction"] = target_dir
                    existing_obj["status"] = status
                    existing_obj["reason"] = reason
                    existing_obj["suggestion"] = suggestion
                else:
                    new_obj = {
                        "name": obj_name,
                        "detected_direction": target_dir,
                        "vastu_ideal": rule["ideal"],
                        "status": status,
                        "reason": reason,
                        "suggestion": suggestion
                    }
                    if "objects" not in result:
                        result["objects"] = []
                    result["objects"].append(new_obj)

        score = 100
        for obj in result.get("objects", []):
            if obj.get("status") == "critical":
                score -= 20
            elif obj.get("status") == "warning":
                score -= 10
        result["vastu_score"] = max(0, score)
        return result

    else:
        if room_type == "bedroom":
            return {
                "room_type": "bedroom",
                "vastu_score": 70,
                "objects": [
                    {
                        "name": "Bed",
                        "detected_direction": "North",
                        "vastu_ideal": "South or East",
                        "status": "critical",
                        "reason": "Sleeping with head to North aligns body against Earth magnetic field, causing sleep issues.",
                        "suggestion": "Rotate the bed so the head faces South or East."
                    },
                    {
                        "name": "Mirror",
                        "detected_direction": "East",
                        "vastu_ideal": "North or East",
                        "status": "good",
                        "reason": "Mirror on East wall reflects positive energy inward.",
                        "suggestion": "No change needed."
                    },
                    {
                        "name": "Heavy Wardrobe",
                        "detected_direction": "South",
                        "vastu_ideal": "South or West",
                        "status": "good",
                        "reason": "Heavy wardrobe on South wall adds grounding and stability.",
                        "suggestion": "No change needed."
                    },
                    {
                        "name": "Study Desk",
                        "detected_direction": "West",
                        "vastu_ideal": "East or North",
                        "status": "warning",
                        "reason": "Desk on West wall can cause focus issues; facing East is preferred.",
                        "suggestion": "Move the study desk near the East or North wall if possible."
                    }
                ]
            }
        elif room_type == "kitchen":
            return {
                "room_type": "kitchen",
                "vastu_score": 60,
                "objects": [
                    {
                        "name": "Cooking Stove",
                        "detected_direction": "North-East",
                        "vastu_ideal": "South-East",
                        "status": "critical",
                        "reason": "Cooking stove in North-East harms health and peace of mind by placing fire in a water zone.",
                        "suggestion": "Relocate the cooking stove to the South-East corner."
                    },
                    {
                        "name": "Water Sink",
                        "detected_direction": "North",
                        "vastu_ideal": "North or East",
                        "status": "good",
                        "reason": "Sink on North wall aligns with water zone rules.",
                        "suggestion": "No change needed."
                    },
                    {
                        "name": "Refrigerator",
                        "detected_direction": "South-West",
                        "vastu_ideal": "South-East or West",
                        "status": "warning",
                        "reason": "Refrigerator in South-West can block financial stability.",
                        "suggestion": "Move the refrigerator to the South-East or West wall."
                    }
                ]
            }
        elif room_type == "living_room":
            return {
                "room_type": "living_room",
                "vastu_score": 80,
                "objects": [
                    {
                        "name": "Sofa",
                        "detected_direction": "South",
                        "vastu_ideal": "West or South",
                        "status": "good",
                        "reason": "Sofa on South wall is grounded and compliant.",
                        "suggestion": "No change needed."
                    },
                    {
                        "name": "TV",
                        "detected_direction": "East",
                        "vastu_ideal": "South-East",
                        "status": "warning",
                        "reason": "TV in East wall is acceptable but South-East is preferred for electronics.",
                        "suggestion": "Consider shifting the TV to the South-East wall."
                    },
                    {
                        "name": "Indoor Plants",
                        "detected_direction": "North-East",
                        "vastu_ideal": "North or East",
                        "status": "good",
                        "reason": "Plants in North-East bring fresh oxygen and positive energy.",
                        "suggestion": "No change needed."
                    }
                ]
            }
        elif room_type == "pooja_room":
            return {
                "room_type": "pooja_room",
                "vastu_score": 90,
                "objects": [
                    {
                        "name": "Pooja Altar",
                        "detected_direction": "North-East",
                        "vastu_ideal": "North-East",
                        "status": "good",
                        "reason": "Altar in North-East maximizes cosmic spiritual energy.",
                        "suggestion": "No change needed."
                    },
                    {
                        "name": "Clock",
                        "detected_direction": "South",
                        "vastu_ideal": "North or East",
                        "status": "warning",
                        "reason": "Clock on South wall represents negative time flow/obstacles.",
                        "suggestion": "Move the clock to the North or East wall."
                    }
                ]
            }
        else:
            return {
                "room_type": "bathroom",
                "vastu_score": 80,
                "objects": [
                    {
                        "name": "Toilet Seat",
                        "detected_direction": "West",
                        "vastu_ideal": "South or West",
                        "status": "good",
                        "reason": "Toilet seat in West wall correctly aligns with drainage rules.",
                        "suggestion": "No change needed."
                    },
                    {
                        "name": "Mirror",
                        "detected_direction": "South",
                        "vastu_ideal": "North or East",
                        "status": "warning",
                        "reason": "Mirror on South wall is not ideal for energy reflection.",
                        "suggestion": "Move mirror to North or East wall."
                    }
                ]
            }



class VastuVisionHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_security_headers(self):
        """Inject security headers into every response."""
        for header, value in SECURITY_HEADERS.items():
            self.send_header(header, value)

    def handle(self):
        """Override handle to silence BrokenPipeError on client disconnects."""
        try:
            super().handle()
        except BrokenPipeError:
            # Client disconnected mid-response — expected during rapid refreshes
            pass
        except ConnectionResetError:
            pass

    def log_message(self, format, *args):
        """Route default HTTP log messages through structured logger."""
        logger.info("%s %s", self.address_string(), format % args)

    def do_GET(self):
        """Serve static files with security headers."""
        # For static files, we need to intercept send_response to add headers
        super().do_GET()

    def end_headers(self):
        """Inject security headers before finalizing response headers."""
        self._send_security_headers()
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/analyze':
            # --- Payload size guard ---
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
                
                is_mock_mode = not API_KEY or API_KEY == "your-groq-api-key"

                if previous_analysis and correction:
                    # --- Correction length guard ---
                    if len(str(correction)) > 2000:
                        self.send_error_response(400, "Correction text too long. Maximum 2000 characters.")
                        return
                    # Refinement query
                    if is_mock_mode:
                        logger.info("Refinement request for room_type=%s (Demo Mode)", room_type)
                        response_json = generate_mock_analysis(room_type, previous_analysis, correction)
                    else:
                        logger.info("Refinement request for room_type=%s", room_type)
                        response_json = self.call_groq_refinement(room_type, previous_analysis, correction)
                else:
                    images = request_payload.get('images', {})
                    if not images:
                        self.send_error_response(400, "No images provided.")
                        return
                    # Full vision query
                    if is_mock_mode:
                        logger.info("Vision analysis request for room_type=%s (Demo Mode)", room_type)
                        response_json = generate_mock_analysis(room_type)
                    else:
                        logger.info("Vision analysis request for room_type=%s (%d images)", room_type, len(images))
                        response_json = self.call_groq_vision(room_type, images)
                
                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response_json).encode('utf-8'))
                
            except json.JSONDecodeError:
                self.send_error_response(400, "Invalid JSON in request body.")
            except Exception as e:
                logger.error("Error during analysis: %s", traceback.format_exc())
                # Sanitized error — don't leak internals to client
                self.send_error_response(500, "Analysis failed. Please try again later.")
        else:
            self.send_error_response(404, "Not Found")

    def do_OPTIONS(self):
        # CORS preflight request
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode('utf-8'))

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
                img_b64 = str(img_b64).replace("\n", "").replace("\r", "").replace(" ", "")
                # Strip data:image/... prefix if client sent it
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
                logger.debug("Raw Groq %s Output: %s", label, raw_text)
                
                # Strip markdown code blocks if the model ignored our formatting instruction
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


if __name__ == '__main__':
    # Ensure public dir exists
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    # Run the server
    handler = VastuVisionHandler
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), handler) as httpd:
        logger.info("VastuVision Server running on http://localhost:%d", PORT)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            logger.info("Server shutting down.")
