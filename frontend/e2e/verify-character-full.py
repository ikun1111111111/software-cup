from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('http://localhost:5173/chat')
    page.wait_for_load_state('networkidle')
    time.sleep(1)

    # Click history button
    buttons = page.locator('button').all()
    for btn in buttons:
        if '历史' in btn.inner_text():
            btn.click()
            break

    time.sleep(0.5)

    # Click tang era
    tang_btn = page.locator('button:has-text("穿越到盛唐")')
    if tang_btn.count() > 0:
        tang_btn.click()

    time.sleep(2)
    page.screenshot(path='screenshots/01-tang-overview.png', full_page=True)
    print('01-tang-overview.png saved')

    # Click first hotspot
    hotspots = page.locator('.discovery-hotspot')
    if hotspots.count() > 0:
        hotspots.first.click()
        time.sleep(1.5)
        page.screenshot(path='screenshots/02-after-zoom.png', full_page=True)
        print('02-after-zoom.png saved')

    browser.close()
