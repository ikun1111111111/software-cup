from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('http://localhost:5173/chat')
    page.wait_for_load_state('networkidle')
    time.sleep(1)

    # Click history button by index
    buttons = page.locator('button').all()
    for btn in buttons:
        text = btn.inner_text()
        if '历史' in text:
            btn.click()
            break

    time.sleep(0.5)

    # Click tang era
    tang_btn = page.locator('button:has-text("穿越到盛唐")')
    if tang_btn.count() > 0:
        tang_btn.click()

    time.sleep(2)
    page.screenshot(path='screenshots/verify-character.png', full_page=True)
    print('Screenshot saved to screenshots/verify-character.png')
    browser.close()
