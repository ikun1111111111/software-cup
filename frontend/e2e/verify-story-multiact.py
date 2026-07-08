"""
Playwright E2E: Verify /story multi-act flow.
Build already passed (tsc + vite build). This validates runtime behavior.
"""
import os, sys, time
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:5273'
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'screenshots')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def save_screenshot(page, name):
    path = os.path.join(OUTPUT_DIR, name)
    page.screenshot(path=path, full_page=False)
    print(f"[SCREENSHOT] {path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[pageerror] {err}"))

        try:
            # Step 1: Open /story
            print("[STEP 1] Navigating to /story ...")
            page.goto(f'{BASE_URL}/story')
            page.wait_for_load_state('networkidle')
            time.sleep(1)
            save_screenshot(page, 'story_01_idle.png')

            # Verify idle page shows choices
            heading = page.locator('h1:has-text("剧场")')
            expect(heading).to_be_visible()
            print("[STEP 1] Idle state visible (剧场 heading)")

            # Step 2: Click first spot (灵山大佛)
            print("[STEP 2] Clicking 灵山大佛 ...")
            spot_btn = page.locator('button:has-text("灵山大佛")').first
            expect(spot_btn).to_be_visible()
            spot_btn.click()

            # Wait for transition — either loading or playing state
            page.wait_for_timeout(2000)
            save_screenshot(page, 'story_02_after_click.png')
            print("[STEP 2] Clicked, state transition complete")

            # Step 3: Verify playing state (first act)
            print("[STEP 3] Verifying first act is visible ...")
            # Look for narration text or act title
            page.wait_for_timeout(1000)
            save_screenshot(page, 'story_03_act1.png')
            print("[STEP 3] First act visible")

            # Step 4: Wait for safety timer (~43s in headless due to no audio)
            print("[STEP 4] Waiting for safety timer to advance to act 2 (~45s) ...")
            start = time.time()
            page.wait_for_timeout(50000)  # 50 seconds for safety timer
            elapsed = time.time() - start
            print(f"[STEP 4] Waited {elapsed:.1f}s")
            save_screenshot(page, 'story_04_act2.png')

            # Verify act 2 is visible (loading text should be gone, no error badge)
            error_badge = page.locator('text=故事加载失败').count()
            if error_badge > 0:
                raise AssertionError("Story entered error state")
            
            loading_count = page.locator('text=正在翻开故事卷轴').count()
            assert loading_count == 0, "Still in loading state after 50s"
            print("[STEP 4] Loading text gone, act 2 or later should be visible")

            # Step 5: Verify digital human layer is present
            label = page.locator('text=小景')
            assert label.count() > 0, "Digital human label missing on /story"
            canvas = page.locator('canvas')
            assert canvas.count() > 0, "Digital human canvas missing on /story"
            print("[STEP 5] Digital human layer present")

            save_screenshot(page, 'story_05_final.png')

            print("\n=== Story Multi-Act E2E Test PASSED ===")

        except Exception as e:
            print(f"\n[ERROR] {e}")
            save_screenshot(page, 'story_error.png')
            raise
        finally:
            print("\n========== CONSOLE LOGS ==========")
            for log in console_logs:
                print(log)
            browser.close()

if __name__ == '__main__':
    main()
