from playwright.sync_api import sync_playwright
import os
import time

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'screenshots')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_screenshot(page, name):
    path = os.path.join(OUTPUT_DIR, name)
    page.screenshot(path=path, full_page=True)
    print(f"Screenshot saved: {path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        try:
            # 1. Open chat page
            print("Opening /chat...")
            page.goto('http://localhost:5173/chat')
            page.wait_for_load_state('networkidle')
            time.sleep(1)
            save_screenshot(page, '01-initial-chat.png')

            # 2. Click "历史探索" (left island button)
            print("Clicking 历史探索...")
            history_btn = page.locator('button:has-text("历史")').first
            if history_btn.is_visible():
                history_btn.click()
                time.sleep(0.5)
                save_screenshot(page, '02-history-confirm.png')
            else:
                print("WARN: 历史探索 button not found, trying text match...")
                page.click('text=历史')
                time.sleep(0.5)
                save_screenshot(page, '02-history-confirm.png')

            # 3. Click "穿越到盛唐"
            print("Clicking 穿越到盛唐...")
            page.click('text=穿越到盛唐')
            time.sleep(2)  # wait for scene transition
            save_screenshot(page, '03-tang-overview.png')

            # 4. Check hotspots exist
            hotspots = page.locator('.hotspot-pulse')
            count = hotspots.count()
            print(f"Hotspots found: {count}")
            assert count >= 1, "No hotspots found!"

            # 5. Click first hotspot
            print("Clicking first hotspot...")
            first_hotspot = page.locator('button:has(.hotspot-pulse)').first
            first_hotspot.click()
            time.sleep(1.5)  # wait for zoom animation
            save_screenshot(page, '04-after-zoom.png')

            # 6. Wait for card panel
            print("Waiting for card panel...")
            page.wait_for_timeout(1000)
            save_screenshot(page, '05-card-panel.png')

            # 7. Click "听小景讲解"
            print("Clicking 听小景讲解...")
            speak_btn = page.locator('button:has-text("听小景讲解")')
            if speak_btn.is_visible():
                speak_btn.click()
                time.sleep(3)
                save_screenshot(page, '06-speaking.png')
            else:
                print("WARN: 听小景讲解 button not found")
                save_screenshot(page, '06-no-speak-btn.png')

            # 8. Wait for interaction state
            time.sleep(5)
            save_screenshot(page, '07-interact.png')

            # 9. Click "继续探索" back to overview
            continue_btn = page.locator('button:has-text("继续探索")')
            if continue_btn.is_visible():
                continue_btn.click()
                time.sleep(1.5)
                save_screenshot(page, '08-back-overview.png')

            print("\n=== Test completed successfully ===")
            print(f"Screenshots saved to: {OUTPUT_DIR}")

        except Exception as e:
            print(f"ERROR: {e}")
            save_screenshot(page, 'error-state.png')
            raise
        finally:
            browser.close()

if __name__ == '__main__':
    main()
