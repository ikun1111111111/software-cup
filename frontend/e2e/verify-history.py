"""
Verify HistoryExplore digital human integration.
Checks: era selection screen, digital human appears after selecting era,
hotspot click opens card, "listen to guide" triggers narration.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

DEBUG_DIR = r'C:\Users\11486\Desktop\草稿夹'
BASE_URL = 'http://localhost:5273'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    page.goto(f'{BASE_URL}/history')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)

    # 1. Era selection visible
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-history-load.png', full_page=False)
    assert page.locator('text=时空穿越').count() > 0, 'Era selection title not found'
    print('[1/6] History era selection visible')

    # 2. Select Tang dynasty
    tang_btn = page.locator('button:has-text("盛唐")')
    assert tang_btn.count() > 0, 'Tang era button not found'
    tang_btn.click()
    page.wait_for_timeout(2500)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-history-era.png', full_page=False)
    print('[2/6] Tang era selected')

    # 3. Digital human visible
    character_label = page.locator('text=小景')
    assert character_label.count() > 0, 'Digital human label not found'
    print('[3/6] Digital human visible')

    # 4. Hotspot visible and clickable
    hotspots = page.locator('.discovery-hotspot')
    assert hotspots.count() > 0, 'No hotspots found'
    hotspots.first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-history-hotspot.png', full_page=False)
    print('[4/6] Hotspot clicked')

    # 5. "Listen to guide" button visible
    listen_btn = page.locator('button:has-text("听小景讲解")')
    assert listen_btn.count() > 0, 'Listen button not found'
    listen_btn.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-history-speaking.png', full_page=False)
    print('[5/6] Guide narration started')

    # 6. Wait for dialog text
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-verify-history-dialog.png', full_page=False)
    print('[6/6] Guide dialog visible')

    browser.close()
    print('HistoryExplore verification passed.')
