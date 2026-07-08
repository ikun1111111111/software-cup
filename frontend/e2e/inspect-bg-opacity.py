"""Compare global-bg visibility by toggling overlay opacity."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

DEBUG_DIR = r'C:\Users\11486\Desktop\草稿夹'
BASE_URL = 'http://localhost:5273'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    page.goto(f'{BASE_URL}/chat')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Screenshot as-is
    page.screenshot(path=f'{DEBUG_DIR}\\debug-chat-bg-default.png', full_page=False)

    # Evaluate background layers info
    info = page.evaluate('''() => {
      const el = document.getElementById('global-bg');
      if (!el) return { error: 'global-bg not found' };
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        backgroundRepeat: style.backgroundRepeat,
        backgroundColor: style.backgroundColor,
        zIndex: style.zIndex,
        opacity: style.opacity,
      };
    }''')
    print('=== DEFAULT BG INFO ===')
    print(info)

    # Reduce overlay opacity to make image visible
    page.evaluate('''() => {
      const el = document.getElementById('global-bg');
      if (!el) return;
      el.style.backgroundImage = `var(--texture-paper), linear-gradient(180deg, rgba(247,245,240,0.55) 0%, rgba(247,245,240,0.45) 50%, rgba(247,245,240,0.55) 100%), url('/image/AigcAssets(3).png')`;
    }''')
    page.wait_for_timeout(500)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-chat-bg-light-overlay.png', full_page=False)

    # Remove gradient overlay entirely
    page.evaluate('''() => {
      const el = document.getElementById('global-bg');
      if (!el) return;
      el.style.backgroundImage = `var(--texture-paper), url('/image/AigcAssets(3).png')`;
    }''')
    page.wait_for_timeout(500)
    page.screenshot(path=f'{DEBUG_DIR}\\debug-chat-bg-no-gradient.png', full_page=False)

    browser.close()
