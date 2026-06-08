from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # Screenshot Dashboard
    page.goto('http://localhost:5173/admin/dashboard')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/screenshot-dashboard.png', full_page=True)
    print("Dashboard screenshot saved")

    # Screenshot Report
    page.goto('http://localhost:5173/admin/report')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/screenshot-report.png', full_page=True)
    print("Report screenshot saved")

    # Screenshot Knowledge
    page.goto('http://localhost:5173/admin/')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/screenshot-knowledge.png', full_page=True)
    print("Knowledge screenshot saved")

    # Screenshot Avatar
    page.goto('http://localhost:5173/admin/avatar')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/screenshot-avatar.png', full_page=True)
    print("Avatar screenshot saved")

    browser.close()
