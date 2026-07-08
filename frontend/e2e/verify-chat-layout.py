"""Verify ChatPage Galgame layout: character centered, bottom dialog, top-right dock."""
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
    page.wait_for_timeout(2500)

    page.screenshot(path=f'{DEBUG_DIR}\\debug-chat-galgame-layout.png', full_page=False)

    # Inspect character position
    char_info = page.evaluate('''() => {
      const scene = document.querySelector('[data-testid="digital-human"]');
      if (!scene) return { error: 'digital-human not found' };
      const rect = scene.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        centerX,
        centerY,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      };
    }''')
    print('=== CHARACTER POSITION ===')
    print(char_info)

    # Inspect dialog position
    dialog_info = page.evaluate('''() => {
      const dialog = document.querySelector('[data-testid="chat-page"] > div');
      if (!dialog) return { error: 'dialog not found' };
      const rect = dialog.getBoundingClientRect();
      return {
        left: rect.left,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }''')
    print('\n=== DIALOG POSITION ===')
    print(dialog_info)

    # Inspect dock position
    dock_info = page.evaluate('''() => {
      const nav = document.querySelector('nav');
      if (!nav) return { error: 'nav not found' };
      const rect = nav.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }''')
    print('\n=== DOCK POSITION ===')
    print(dock_info)

    browser.close()
