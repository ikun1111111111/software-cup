"""
Inspect chat page background image loading by navigating to /chat,
capturing console logs and network responses for background assets.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

DEBUG_DIR = r'C:\Users\11486\Desktop\草稿夹'
BASE_URL = 'http://localhost:5273'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    console_logs = []
    network_errors = []
    responses = []

    page.on('console', lambda msg: console_logs.append(f'[{msg.type}] {msg.text}'))
    page.on('pageerror', lambda err: console_logs.append(f'[pageerror] {err}'))
    page.on('requestfailed', lambda req: network_errors.append(f"FAILED {req.method} {req.url}"))
    page.on('response', lambda res: responses.append(f"{res.status} {res.url}"))

    page.goto(f'{BASE_URL}/chat')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    page.screenshot(path=f'{DEBUG_DIR}\\debug-chat-bg-inspect.png', full_page=False)

    # Check global-bg element style
    bg_info = page.evaluate('''() => {
      const el = document.getElementById('global-bg');
      if (!el) return { error: 'global-bg not found' };
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        width: el.offsetWidth,
        height: el.offsetHeight,
        zIndex: style.zIndex,
      };
    }''')

    print('=== BG INFO ===')
    print(bg_info)
    print('\n=== CONSOLE LOGS ===')
    for log in console_logs:
        print(log)
    print('\n=== NETWORK FAILURES ===')
    for err in network_errors:
        print(err)
    print('\n=== ALL RESPONSES ===')
    for r in responses:
        print(r)

    browser.close()
