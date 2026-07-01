from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SHOT = ROOT / "tmp" / "map_probe.png"


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 460, "height": 900}, device_scale_factor=1)
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: console_messages.append(f"pageerror: {err}"))

    page.goto("http://127.0.0.1:8097/map", wait_until="domcontentloaded", timeout=60000)
    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    page.wait_for_timeout(12000)

    page.screenshot(path=str(SHOT), full_page=True)
    result = page.evaluate(
        """
        () => {
          const map = document.querySelector('.amap-container') || document.querySelector('[class*="amap"]');
          const rectOf = (el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          };
          const markers = Array.from(document.querySelectorAll('.amap-marker'))
            .slice(0, 30)
            .map((el) => ({ rect: rectOf(el), text: (el.textContent || '').trim().slice(0, 40) }));
          const labels = Array.from(document.querySelectorAll('div, span'))
            .map((el) => ({ rect: rectOf(el), text: (el.textContent || '').trim() }))
            .filter((item) => item.text && /灵山|梵宫|照壁|五印|九龙|大佛|精舍|菩提/.test(item.text))
            .slice(0, 50);
          return {
            url: location.href,
            bodyText: document.body.innerText.slice(0, 800),
            mapRect: rectOf(map),
            markerCount: document.querySelectorAll('.amap-marker').length,
            markers,
            labels,
          };
        }
        """
    )

    print("SCREENSHOT", SHOT)
    print("RESULT", result)
    print("CONSOLE", console_messages[-30:])
    browser.close()
