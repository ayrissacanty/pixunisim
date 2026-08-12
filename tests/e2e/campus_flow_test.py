"""End-to-end walkthrough: campus tour -> teacher -> class -> lesson -> progress -> objective.

Run:  python3 tests/e2e/campus_flow_test.py
Requires the dev server on http://localhost:8080.
"""

import asyncio, os, re, sys, time
from playwright.async_api import async_playwright, expect

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
EMAIL = os.environ.get("E2E_EMAIL") or f"e2e+{int(time.time())}@unify.test"
PASSWORD = os.environ.get("E2E_PASSWORD", "UnifyTest!2345")
SHOTS = "/tmp/browser/campus-flow"


async def sign_in(page):
    await page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
    toggle = page.get_by_role("button", name=re.compile("enrol instead", re.I))
    name_field = page.get_by_label(re.compile("student name", re.I))
    for _ in range(10):  # retry until React has hydrated the toggle
        await toggle.click()
        try:
            await name_field.wait_for(timeout=1500)
            break
        except Exception:
            continue
    await name_field.fill("E2E Student")
    await page.get_by_label(re.compile("email", re.I)).fill(EMAIL)
    await page.get_by_label(re.compile("password", re.I)).first.fill(PASSWORD)
    await page.get_by_role("button", name=re.compile("create student record", re.I)).click()
    try:
        await page.wait_for_url(re.compile(r"/campus"), timeout=30000)
    except Exception:
        err = await page.locator("p.text-destructive").all_inner_texts()
        raise AssertionError(f"sign-up failed: {err} url={page.url}")


async def main():
    os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        if os.environ.get("E2E_DEBUG"):
            page.on(
                "response",
                lambda r: print("HTTP", r.status, r.request.method, r.url)
                if "student_progress" in r.url
                else None,
            )

        await sign_in(page)

        # 1. Scripted route: Welcome Plaza -> Mathematics Hall -> Algebra 204
        await page.goto(f"{BASE}/campus?tour=algebra-204", wait_until="domcontentloaded")
        await page.wait_for_function("() => !!window.__unifyCampus", timeout=30000)

        # 2. The classroom must carry the shared course_id / lesson_id
        walk = await page.evaluate("() => window.__unifyCampus.walkthrough('algebra-204')")
        assert walk["roomId"] == "algebra-204", walk
        assert walk["zoneId"] == "math-tech-hall", walk
        assert walk["courseId"] == "foundations-algebra", walk
        assert walk["lessonId"] == "algebra-lesson-2", walk
        assert [s["zone"] for s in walk["steps"]] == [
            "welcome-plaza",
            "central-quad",
            "math-tech-hall",
            "math-tech-hall",
        ], walk

        # 3. Talk to teacher (the tour ends by greeting Professor Maya Ellison)
        dialogue = page.get_by_text(walk["teacher"], exact=False)
        await expect(dialogue.first).to_be_visible(timeout=30000)
        await page.screenshot(path=f"{SHOTS}/01-teacher.png")

        cont = page.get_by_role("button", name=re.compile("^continue$", re.I))
        while await cont.count():
            await cont.first.click()
            await page.wait_for_timeout(150)

        # 4. Attend class
        await page.get_by_role("button", name=re.compile("attend the lesson", re.I)).click()
        await expect(page.get_by_text("In class")).to_be_visible(timeout=15000)
        state = await page.evaluate("() => window.__unifyCampus.state()")
        assert state["lessonOpen"]["lessonId"] == "algebra-lesson-2", state
        assert state["lessonOpen"]["courseId"] == "foundations-algebra", state
        await page.screenshot(path=f"{SHOTS}/02-in-class.png")

        # 5. Read every section, then reach the knowledge check
        nxt = page.get_by_role("button", name=re.compile("^next", re.I))
        for _ in range(12):
            if await nxt.is_disabled():
                break
            await nxt.click()
            await page.wait_for_timeout(250)
        await expect(page.get_by_text(re.compile("knowledge check", re.I))).to_be_visible(
            timeout=15000
        )

        # 6. Answer every question
        for _ in range(12):
            card = page.locator("div.rounded-md.border").filter(
                has=page.locator("button:not([disabled])")
            )
            choice = page.locator("button:not([disabled])").filter(
                has_text=re.compile(r".+")
            )
            answered = page.get_by_text(re.compile(r"You scored \d+%"))
            if await answered.count():
                break
            btns = page.locator("section button:not([disabled])")
            n = await btns.count()
            if n == 0:
                break
            await btns.first.click()
            await page.wait_for_timeout(200)
        await expect(page.get_by_text(re.compile(r"You scored \d+%"))).to_be_visible(timeout=15000)
        await page.screenshot(path=f"{SHOTS}/03-scored.png")

        # 7. Save progress and return to campus
        await page.get_by_role("button", name=re.compile("record lesson as complete", re.I)).click()
        await expect(page.get_by_text("In class")).to_be_hidden(timeout=15000)

        # 8. Progress persisted and shared with the Traditional Workspace
        await page.goto(f"{BASE}/workspace/lesson/algebra-lesson-2", wait_until="domcontentloaded")
        await expect(page.get_by_text(re.compile("completed", re.I)).first).to_be_visible(
            timeout=20000
        )
        await page.screenshot(path=f"{SHOTS}/04-workspace.png")

        # 9. Back on campus the next objective has advanced past Algebra 204
        await page.goto(f"{BASE}/campus", wait_until="domcontentloaded")
        await page.wait_for_function("() => !!window.__unifyCampus", timeout=30000)
        await page.wait_for_function(
            "() => { const s = window.__unifyCampus.state();"
            " return s.objective && !/Algebra 204/.test(s.objective); }",
            timeout=30000,
        )
        objective = (await page.evaluate("() => window.__unifyCampus.state()"))["objective"]
        await page.screenshot(path=f"{SHOTS}/05-next-objective.png")

        assert not errors, errors
        print("PASS — next objective:", objective)
        await browser.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except AssertionError as exc:
        print("FAIL:", exc)
        sys.exit(1)
