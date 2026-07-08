"""
Verify RecommendPage digital human integration.
Checks: page load, digital human visible, route list interactive,
route selection opens scroll and shows spot navigation.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

DEBUG_DIR = r'C:\Users\11486\Desktop\草稿夹'
BASE_URL = 'http://localhost:5273'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    page.goto(f'{BASE_URL}/recommend')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)

    # 1. Page loaded
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-recommend-load.png', full_page=False)
    print('[1/5] Recommend page loaded')

    # 2. Digital human visible (canvas or character label)
    character_label = page.locator('text=小景')
    assert character_label.count() > 0, 'Digital human label not found'
    print('[2/5] Digital human label visible')

    # 3. Route list visible and clickable
    route_list = page.locator('[data-testid="route-list"]')
    assert route_list.count() > 0, 'Route list not found'
    route_buttons = route_list.locator('button').all()
    assert len(route_buttons) > 0, 'No route buttons found'
    route_buttons[0].click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-recommend-route.png', full_page=False)
    print('[3/5] Route selected')

    # 4. Scroll navigation / spot info visible
    next_btn = page.locator('button:has-text("下一站")')
    prev_btn = page.locator('button:has-text("上一站")')
    assert next_btn.count() > 0, 'Next spot button not found'
    assert prev_btn.count() > 0, 'Prev spot button not found'
    print('[4/5] Spot navigation visible')

    # 5. Click next spot
    next_btn.click()
    page.wait_for_timeout(800)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-recommend-next-spot.png', full_page=False)
    print('[5/5] Next spot clicked')

    browser.close()
    print('RecommendPage verification passed.')
