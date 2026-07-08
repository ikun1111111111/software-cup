from playwright.sync_api import sync_playwright
import os
import time

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'screenshots', 'mobile')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_screenshot(page, name):
    path = os.path.join(OUTPUT_DIR, name)
    page.screenshot(path=path, full_page=True)
    print(f"Mobile screenshot: {path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 375, 'height': 812})

        try:
            page.goto('http://localhost:5173/chat')
            page.wait_for_load_state('networkidle')
            time.sleep(1)

            # History explore
            page.click('button:has-text("历史")')
            time.sleep(0.5)
            page.click('text=穿越到盛唐')
            time.sleep(2)
            save_screenshot(page, '01-mobile-overview.png')

            # Click hotspot
            hotspots = page.locator('.discovery-hotspot')
            if hotspots.count() > 0:
                hotspots.first.click()
                time.sleep(1.5)
                save_screenshot(page, '02-mobile-card.png')

            print("Mobile test completed")
        except Exception as e:
            print(f"Mobile error: {e}")
            save_screenshot(page, 'error.png')
        finally:
            browser.close()

if __name__ == '__main__':
    main()
