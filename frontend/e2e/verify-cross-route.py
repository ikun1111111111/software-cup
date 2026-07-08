"""
Cross-route digital human continuity verification.
Visits /chat, /history, /recommend, /story in sequence and verifies
that the global digital human layer (小景 label + canvas) remains present.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

DEBUG_DIR = r'C:\Users\11486\Desktop\草稿夹'
BASE_URL = 'http://localhost:5273'
ROUTES = ['/', '/chat', '/history', '/recommend', '/story']

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    for i, route in enumerate(ROUTES):
        page.goto(f'{BASE_URL}{route}')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500 if route == '/' else 1000)

        label = page.locator('text=小景')
        assert label.count() > 0, f'Digital human label missing on {route}'

        canvas = page.locator('canvas')
        assert canvas.count() > 0, f'Digital human canvas missing on {route}'

        page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-route-{i}-{route.replace("/", "root")}.png', full_page=False)
        print(f'[{i+1}/{len(ROUTES)}] {route} digital human present')

    browser.close()
    print('Cross-route digital human continuity verification passed.')
