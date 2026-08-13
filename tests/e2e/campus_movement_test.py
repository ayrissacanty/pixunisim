"""End-to-end: spawn -> walk -> collision -> Mathematics Hall door -> lesson start.

Screenshots plus DOM-state assertions at every beat.

Run:  python3 tests/e2e/campus_movement_test.py
Requires the dev server on http://localhost:8080.
"""

import asyncio, os, re, sys, time
from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
EMAIL = os.environ.get("E2E_EMAIL") or f"e2e+move{int(time.time())}@unify.test"
PASSWORD = os.environ.get("E2E_PASSWORD", "UnifyTest!2345")
SHOTS = "/tmp/browser/campus-movement"


async def sign_in(page):
    await page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
    toggle = page.get_by_role("button", name=re.compile("enrol instead", re.I))
    name_field = page.get_by_label(re.compile("student name", re.I))
    for _ in range(10):
        await toggle.click()
        try:
            await name_field.wait_for(timeout=1500)
            break
        except Exception:
            continue
    await name_field.fill("E2E Walker")
    await page.get_by_label(re.compile("email", re.I)).fill(EMAIL)
    await page.get_by_label(re.compile("password", re.I)).first.fill(PASSWORD)
    await page.get_by_role("button", name=re.compile("create student record", re.I)).click()
    await page.wait_for_url(re.compile(r"/campus"), timeout=30000)


async def campus_state(page):
    return await page.evaluate("() => window.__unifyCampus.state()")


async def hold(page, key, ms):
    await page.keyboard.down(key)
    await page.wait_for_timeout(ms)
    await page.keyboard.up(key)
    await page.wait_for_timeout(120)


async def shot(page, name):
    await page.screenshot(path=f"{SHOTS}/{name}.png")


async def main():
    os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        await sign_in(page)
        await page.wait_for_selector("[data-testid='campus-root']")
        await page.wait_for_function("() => !!window.__unifyCampus")
        await page.wait_for_timeout(1200)
        await shot(page, "1_spawn")

        # --- Step 1: spawn state -------------------------------------------------
        s = await campus_state(page)
        assert s["zone"] == "welcome-plaza", s
        assert await page.get_attribute("[data-testid='campus-root']", "data-layer") == "1"
        spawn = s["player"]
        print("spawn", spawn)

        # --- Step 2: movement actually moves the player --------------------------
        await page.click("[data-testid='campus-root']")
        await hold(page, "ArrowUp", 700)
        moved = (await campus_state(page))["player"]
        assert moved != spawn, f"player did not move: {spawn} -> {moved}"
        await shot(page, "2_moved")

        # --- Step 3: collision — blocked tiles are never entered -----------------
        walkable = await page.evaluate(
            """() => {
                const s = window.__unifyCampus.state();
                return window.__unifyCampus.walkable(s.zone, s.player.x, s.player.y);
            }"""
        )
        assert walkable is True, "player ended up on a blocked tile"

        for key in ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]:
            await hold(page, key, 900)
            st = await campus_state(page)
            ok = await page.evaluate(
                "([z,x,y]) => window.__unifyCampus.walkable(z,x,y)",
                [st["zone"], st["player"]["x"], st["player"]["y"]],
            )
            assert ok is True, f"walked onto a blocked tile after {key}: {st['player']}"
            if st["zone"] != "welcome-plaza":
                break
        await shot(page, "3_collision")

        # --- Step 4: guided route to Mathematics Hall ----------------------------
        walk = await page.evaluate("() => window.__unifyCampus.walkthrough('algebra-204')")
        print("walkthrough", walk["zoneId"], walk["courseId"], walk["lessonId"])
        await page.evaluate("() => { window.__unifyCampus.tour('algebra-204'); }")

        seen = []
        banner = page.locator("[data-testid='tour-step']")
        reached = False
        for _ in range(300):
            if await banner.count():
                label = await banner.get_attribute("data-step-label")
                if label and (not seen or seen[-1] != label):
                    seen.append(label)
                    await shot(page, f"4_tour_{len(seen)}_{re.sub(r'[^a-z0-9]+','-',label.lower())[:28]}")
            st = await campus_state(page)
            if st["zone"] == walk["zoneId"]:
                reached = True
            # Keep sampling until the guided route finishes (banner clears).
            if reached and not await banner.count():
                break
            await page.wait_for_timeout(120)

        st = await campus_state(page)
        assert st["zone"] == walk["zoneId"], f"never reached {walk['zoneId']}: {st}"
        assert len(seen) >= 2, f"expected several banner steps, saw {seen}"
        assert await page.get_attribute("[data-testid='campus-root']", "data-layer") in ("1", "2")
        await shot(page, "5_math_hall")

        # --- Step 5: zone memory is recorded for the way back --------------------
        print("state after tour", st)
        print("probe", await page.evaluate("()=>{const s=window.__unifyCampus.state();return s.zoneMemory;}"))
        assert "welcome-plaza" in st["zoneMemory"], st["zoneMemory"]

        # --- Step 6: teacher dialogue -> attend class ----------------------------
        await page.wait_for_selector("[data-testid='dialogue-box']", timeout=15000)
        await shot(page, "6_teacher")
        await page.get_by_role("button", name=re.compile("attend the lesson", re.I)).click()
        await page.wait_for_function(
            "() => window.__unifyCampus.state().layer >= 3", timeout=15000
        )
        st = await campus_state(page)
        assert st["classroom"]["courseId"] == walk["courseId"], st["classroom"]
        assert st["classroom"]["lessonId"] == walk["lessonId"], st["classroom"]
        await shot(page, "7_classroom_beat")

        # --- Step 7: lesson mode opens with the same shared ids ------------------
        await page.wait_for_function(
            "() => !!window.__unifyCampus.state().lessonOpen", timeout=30000
        )
        st = await campus_state(page)
        assert st["lessonOpen"]["lessonId"] == walk["lessonId"], st["lessonOpen"]
        assert st["layer"] == 4, st
        assert await page.get_attribute("[data-testid='campus-root']", "data-layer") == "4"
        await shot(page, "8_lesson")

        hard = [e for e in errors if "Warning" not in e]
        assert not hard, f"console errors: {hard[:3]}"

        print("PASS — screenshots in", SHOTS)
        await browser.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except AssertionError as exc:
        print("FAIL:", exc)
        sys.exit(1)
