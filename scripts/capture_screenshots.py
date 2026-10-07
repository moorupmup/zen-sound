import http.server
import socketserver
import threading
import subprocess
import time
import os
import sys

PORT = 8769
DIRECTORY = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")

class SilentHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SilentHandler) as httpd:
        httpd.serve_forever()

def capture(chrome_path, url, out_file, width=1020, height=850, virtual_time=2000):
    cmd = [
        chrome_path,
        "--headless=new",
        "--hide-scrollbars",
        f"--window-size={width},{height}",
        f"--virtual-time-budget={virtual_time}",
        f"--screenshot={out_file}",
        url
    ]
    subprocess.run(cmd, check=True)
    if os.path.exists(out_file):
        print(f"Captured: {os.path.basename(out_file)} ({os.path.getsize(out_file):,} bytes)")

def main():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(chrome_path):
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "screenshots")
    os.makedirs(out_dir, exist_ok=True)

    targets = [
        ("banner.png", f"http://localhost:{PORT}/frame.html?preset=summer-storm", 1020, 850, 2000),
        ("preview-app.png", f"http://localhost:{PORT}/frame.html?preset=summer-storm", 1020, 850, 2000),
        ("preview-cozy.png", f"http://localhost:{PORT}/frame.html?preset=cozy-fire", 1020, 850, 2000),
        ("preview-timer.png", f"http://localhost:{PORT}/frame.html?preset=deep-sleep&timer=open", 1020, 850, 2000),
        ("preview-clean.png", f"http://localhost:{PORT}/frame.html", 1020, 850, 1000),
        ("screenshot-ui.png", f"http://localhost:{PORT}/index.html?preset=summer-storm", 880, 720, 1500),
    ]

    for filename, url, w, h, vt in targets:
        out_file = os.path.join(out_dir, filename)
        capture(chrome_path, url, out_file, w, h, virtual_time=vt)

    print("All screenshots generated successfully!")

if __name__ == "__main__":
    main()
