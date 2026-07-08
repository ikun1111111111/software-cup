"""
Debug script for route_guide "connection error" issue.
Follows webapp-testing skill: reconnaissance-then-action pattern.
"""
from playwright.sync_api import sync_playwright

console_logs = []
network_errors = []
responses = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=300)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: console_logs.append(f"[pageerror] {err}"))
    page.on("requestfailed", lambda req: network_errors.append(
        f"FAILED {req.method} {req.url}"
    ))
    page.on("response", lambda res: responses.append(f"{res.status} {res.url}") or print(f"  ← {res.status} {res.url}"))

    # 1. Navigate to chat page
    page.goto("http://localhost:5173/chat")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_01_chat_loaded.png")
    print("[STEP 1] Chat page loaded")

    # 2. Click route recommendation button (left island)
    # Use broader text selector
    btns = page.locator("button").all()
    route_btn = None
    for b in btns:
        txt = b.inner_text()
        if "路线" in txt or "推荐" in txt:
            route_btn = b
            break
    if route_btn:
        route_btn.click()
        page.wait_for_timeout(1000)
        page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_02_route_confirm.png")
        print("[STEP 2] Clicked route recommendation button")
    else:
        print("[STEP 2] Route button not found")
        page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_02_no_route_btn.png")

    # 3. Select first route
    route_btns = page.locator("button").all()
    selected = False
    for b in route_btns:
        txt = b.inner_text()
        if "·" in txt and ("小时" in txt or "分钟" in txt):
            b.click()
            selected = True
            break
    if selected:
        page.wait_for_timeout(1500)
        page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_03_route_guide.png")
        print("[STEP 3] Selected a route, entered route_guide")
    else:
        print("[STEP 3] No route selection button found")
        page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_03_no_route.png")

    # 4. Wait for auto-triggered errors
    page.wait_for_timeout(4000)
    page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_04_after_wait.png")
    print("[STEP 4] Waited 4s")

    # 5. Click first QA question button
    qa_btns = page.locator("button").all()
    qa_clicked = False
    for b in qa_btns:
        txt = b.inner_text()
        if "?" in txt or "什么" in txt or "怎么" in txt:
            b.click()
            qa_clicked = True
            break
    if qa_clicked:
        page.wait_for_timeout(3000)
        page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_05_after_qa.png")
        print("[STEP 5] Clicked a QA question")
    else:
        print("[STEP 5] No QA button found")
        page.screenshot(path="C:/Users/11486/Desktop/ruanjianbei-main/ruanjianbei-main/frontend/e2e/ss_05_no_qa.png")

    browser.close()

print("\n========== CONSOLE LOGS ==========")
for log in console_logs:
    print(log)
print("\n========== NETWORK ERRORS ==========")
for err in network_errors:
    print(err)
if not network_errors:
    print("(none)")
print("\n========== RESPONSES ==========")
for r in responses:
    print(r)
print("\n========== DONE ==========")
