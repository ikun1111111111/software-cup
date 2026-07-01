from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(r"E:\03_Projects\software-cup")
SCREENSHOT = ROOT / "tmp" / "memory-page-smoke.png"
URL = "http://127.0.0.1:8099/memory"


def main() -> None:
    console_errors: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
        )
        page.on(
            "console",
            lambda msg: console_errors.append(msg.text)
            if msg.type == "error"
            else None,
        )
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_load_state("networkidle", timeout=30000)
        page.wait_for_timeout(2500)
        body_text = page.locator("body").inner_text(timeout=10000)
        page.screenshot(path=str(SCREENSHOT), full_page=True)
        browser.close()

    print(f"URL={URL}")
    print(f"SCREENSHOT={SCREENSHOT}")
    print("TEXT_SAMPLE_START")
    print(body_text[:1200])
    print("TEXT_SAMPLE_END")
    print(f"CONSOLE_ERRORS={len(console_errors)}")
    for error in console_errors[:10]:
        print(f"CONSOLE_ERROR={error}")
    print(f"PAGE_ERRORS={len(page_errors)}")
    for error in page_errors[:10]:
        print(f"PAGE_ERROR={error}")

    if page_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
