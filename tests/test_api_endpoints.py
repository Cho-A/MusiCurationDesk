import os
import re
from fastapi.routing import APIRoute

# Import the FastAPI app to inspect routes
from backend.main import app

def test_frontend_api_endpoints_exist():
    """
    Scans the frontend source code for fetch() calls to the backend API,
    extracts the URL paths, and verifies that they exist in the FastAPI route definitions.
    """
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "src")
    
    # Extract all valid routes from the FastAPI app using OpenAPI schema
    valid_routes = []
    openapi_schema = app.openapi()
    for path in openapi_schema["paths"].keys():
        # Convert FastAPI path params like {song_id} to regex
        path_regex = re.sub(r'\{[^\}]+\}', r'[^/]+', path)
        valid_routes.append({
            "path_regex": re.compile(f"^{path_regex}/?$") # Allow optional trailing slash
        })
            
    # Regex to find fetch calls like: fetch(`http://127.0.0.1:8000/songs/${id}`)
    # Matches URLs starting with http://127.0.0.1:8000 or http://localhost:8000
    fetch_pattern = re.compile(r'http://(?:127\.0\.0\.1|localhost):8000(/[^`\'"\?\s]+)')
    
    errors = []
    
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if not file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                continue
                
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
                
            for i, line in enumerate(lines):
                # We do a basic search for API URLs
                matches = fetch_pattern.finditer(line)
                for match in matches:
                    api_path = match.group(1)
                    
                    # Convert JS template literals like ${id} to a dummy value for matching
                    test_path = re.sub(r'\$\{[^\}]+\}', '123', api_path)
                    
                    # Check if test_path matches any valid_route
                    route_found = False
                    for route in valid_routes:
                        if route["path_regex"].match(test_path):
                            route_found = True
                            break
                            
                    if not route_found:
                        rel_path = os.path.relpath(filepath, start=frontend_dir)
                        errors.append(f"{rel_path}:{i+1} -> Unknown API endpoint: {api_path}")
                        
    assert len(errors) == 0, "Found frontend fetch calls to non-existent API endpoints:\n" + "\n".join(errors)
