import json
import re
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright


BASE_URL = "http://127.0.0.1:3000"
SCREENSHOT_DIR = Path("/tmp/juhao-visual-qa")
ROUTES = [
    "/",
    "/products/spotlights",
    "/products/ceiling-lights",
    "/products/smart-home-devices",
    "/cases/jw-marriott-shenzhen-huafa-snow-world",
    "/cases/pullman-shangrao-guangfeng",
    "/news",
    "/contact",
]
VIEWPORTS = [
    ("mobile", 390, 844, ["/", "/products/spotlights", "/contact"]),
    ("tablet", 1012, 900, ["/", "/solutions/hospitality"]),
    ("desktop", 1440, 1000, ROUTES),
]


def screenshot_name(label: str, route: str) -> str:
    slug = "home" if route == "/" else re.sub(r"[^a-z0-9]+", "-", route.strip("/")).strip("-")
    return str(SCREENSHOT_DIR / f"{label}-{slug}.png")


def main() -> None:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    failures = []
    results = []
    console_errors = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        for label, width, height, routes in VIEWPORTS:
            context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="no-preference")
            page = context.new_page()
            page.on("console", lambda message, label=label: console_errors.append(f"{label}: {message.text}") if message.type == "error" else None)
            page.on("pageerror", lambda error, label=label: console_errors.append(f"{label}: pageerror: {error}"))

            for route in routes:
                response = page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
                status = response.status if response else 0
                if status != 200:
                    failures.append(f"{label} {route}: expected 200, got {status}")
                    continue

                metrics = page.evaluate(
                    """() => ({
                      scrollWidth: document.documentElement.scrollWidth,
                      clientWidth: document.documentElement.clientWidth,
                      h1Count: document.querySelectorAll('h1').length,
                      missingAlt: [...document.querySelectorAll('main img')].filter(img => !img.hasAttribute('alt')).length,
                    })"""
                )
                if metrics["scrollWidth"] > metrics["clientWidth"] + 1:
                    failures.append(f"{label} {route}: horizontal overflow {metrics['scrollWidth']} > {metrics['clientWidth']}")
                if metrics["h1Count"] != 1:
                    failures.append(f"{label} {route}: expected one H1, got {metrics['h1Count']}")
                if metrics["missingAlt"]:
                    failures.append(f"{label} {route}: {metrics['missingAlt']} main images lack alt")

                scroll_height = page.evaluate("document.documentElement.scrollHeight")
                for offset in range(0, scroll_height, max(320, int(height * 0.8))):
                    page.evaluate("position => window.scrollTo(0, position)", offset)
                    page.wait_for_timeout(120)
                page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
                page.wait_for_timeout(300)
                try:
                    page.wait_for_function(
                        """() => [...document.querySelectorAll('main img')]
                          .every(img => img.complete && img.naturalWidth > 0)""",
                        timeout=5000,
                    )
                except PlaywrightTimeoutError:
                    pass
                broken_images = page.evaluate(
                    """() => [...document.querySelectorAll('main img')]
                      .filter(img => !img.complete || img.naturalWidth === 0)
                      .map(img => img.getAttribute('src'))"""
                )
                page.evaluate("window.scrollTo(0, 0)")
                page.wait_for_timeout(80)
                if broken_images:
                    failures.append(f"{label} {route}: broken images {broken_images}")

                page.screenshot(path=screenshot_name(label, route), full_page=True)
                results.append({"viewport": label, "route": route, **metrics, "brokenImages": len(broken_images)})

            if label == "mobile":
                page.goto(f"{BASE_URL}/", wait_until="networkidle")
                primary = page.locator(".actions .primary").bounding_box()
                secondary = page.locator(".actions .ghost").all()
                secondary_boxes = [item.bounding_box() for item in secondary]
                proof = page.locator(".heroProofPeek").bounding_box()
                if not primary or len(secondary_boxes) != 2 or any(box is None for box in secondary_boxes):
                    failures.append("mobile /: first-screen CTA layout is incomplete")
                elif abs(secondary_boxes[0]["y"] - secondary_boxes[1]["y"]) > 2:
                    failures.append("mobile /: secondary CTAs are not side by side")
                if not proof or proof["y"] >= height:
                    failures.append("mobile /: next credibility section is not visible at the fold")

                menu_button = page.get_by_role("button", name="打开导航")
                menu_button.click()
                drawer = page.locator("#mobile-navigation")
                if drawer.get_attribute("aria-hidden") != "false":
                    failures.append("mobile navigation did not open")
                page.keyboard.press("Escape")
                if drawer.get_attribute("aria-hidden") != "true":
                    failures.append("mobile navigation did not close with Escape")

            if label == "tablet":
                page.goto(f"{BASE_URL}/", wait_until="networkidle")
                if not page.get_by_role("navigation", name="主导航").is_visible():
                    failures.append("1012px: desktop navigation is not visible")
                if page.locator("header button[aria-controls='mobile-navigation']").is_visible():
                    failures.append("1012px: mobile menu is visible")

            context.close()

        reduced_context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        reduced_page = reduced_context.new_page()
        reduced_page.goto(f"{BASE_URL}/", wait_until="networkidle")
        reduced_page.keyboard.press("Tab")
        if not reduced_page.locator(":focus-visible").count():
            failures.append("reduced-motion keyboard pass: no visible focus target")
        reduced_context.close()
        browser.close()

    failures.extend(console_errors)
    report = {
        "baseUrl": BASE_URL,
        "screenshots": str(SCREENSHOT_DIR),
        "checks": len(results),
        "failures": failures,
        "passed": not failures,
        "results": results,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
