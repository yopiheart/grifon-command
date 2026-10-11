# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: companion-typing.spec.ts >> typing and delivered typography plus golden user bubble at 375px
- Location: tests\e2e\companion-typing.spec.ts:132:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "14px"
Received: "16px"
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - group [ref=e4]:
    - generic "Local test fixture · mocked generation · no provider calls" [ref=e5] [cursor=pointer]
  - generic [ref=e6]:
    - banner [ref=e7]:
      - button "Back to dashboard" [ref=e9] [cursor=pointer]:
        - img [ref=e10]
      - button "New ad" [ref=e13] [cursor=pointer]
      - generic [ref=e14]:
        - iframe [ref=e16]:

        - heading "Grifon" [level=1] [ref=e17]
    - region "Conversation with Grifon" [ref=e19]:
      - generic [ref=e22]:
        - article [ref=e23]:
          - paragraph [ref=e24]: What product are we making an ad for? Tell me about your audience and what you want the ad to achieve.
          - paragraph [ref=e25]:
            - time [ref=e26]: 9:57 AM
        - article [ref=e27]:
          - paragraph [ref=e28]: Cold brew for busy parents.
          - paragraph [ref=e29]:
            - time [ref=e30]: 8:00 PM
            - text: · Received
        - article [ref=e31]:
          - paragraph [ref=e32]: What is the brand name? I will keep its exact spelling.
          - paragraph [ref=e33]:
            - time [ref=e34]: 8:00 PM
      - generic [ref=e36]:
        - generic [ref=e37]:
          - button "Attach product photo" [ref=e38] [cursor=pointer]:
            - img [ref=e39]
          - textbox "Message Grifon" [active] [ref=e41]:
            - /placeholder: Tell Grifon…
          - button "Send" [disabled] [ref=e42]:
            - img [ref=e43]
        - paragraph [ref=e45]: Draft saved on this device. No generation starts until you confirm.
```

# Test source

```ts
  53  |     await expect(page.locator('.companion-message-user')).toHaveCount(index + 1);
  54  |     await expect(typing(page)).toBeVisible();
  55  |     await expect(input(page)).toBeFocused();
  56  |     await expect(input(page)).toBeEnabled();
  57  |     await input(page).fill('Draft for the next answer');
  58  |     await input(page).press('Enter');
  59  |     await expect(input(page)).toHaveValue('Draft for the next answer');
  60  |     await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  61  |     await page.clock.runFor(499);
  62  |     expect(await page.locator('article .companion-message-assistant').count()).toBe(index + 1);
  63  |     expect(await page.locator('.companion-message-user').count()).toBe(index + 1);
  64  |     expect(await page.locator('[aria-label="Review your brief"]').count()).toBe(0);
  65  |     await page.clock.runFor(101);
  66  |     await expect(typing(page)).toHaveCount(0);
  67  |     await expect(page.locator('article .companion-message-assistant')).toHaveCount(index + 2);
  68  |     await expect(input(page)).toHaveValue('Draft for the next answer');
  69  |     await expect(input(page)).toBeFocused();
  70  |   }
  71  |   await expect(page.getByRole('heading', { name: 'Your product ad', exact: true })).toBeVisible();
  72  |   expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  73  | });
  74  |
  75  | test('reset cancels the pending reply without reviving the old brief', async ({ page }) => {
  76  |   await openFixture(page);
  77  |   await input(page).fill('Old brief'); await input(page).press('Enter');
  78  |   await expect(typing(page)).toBeVisible();
  79  |   await page.getByRole('button', { name: 'New ad', exact: true }).click();
  80  |   await page.clock.runFor(1000);
  81  |   await expect(typing(page)).toHaveCount(0);
  82  |   await expect(page.locator('.companion-message-user')).toHaveCount(0);
  83  |   await expect(page.locator('article .companion-message-assistant')).toHaveCount(1);
  84  |   await expect(page.locator('article .companion-message-assistant')).toContainText('What product');
  85  | });
  86  |
  87  | test('account remount isolates the pending reply and restores the accepted answer', async ({ page }) => {
  88  |   await openFixture(page);
  89  |   await input(page).fill('Account A accepted answer'); await input(page).press('Enter');
  90  |   await expect(typing(page)).toBeVisible();
  91  |   await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  92  |   await page.clock.runFor(1000);
  93  |   await expect(page.locator('.companion-message-user')).toHaveCount(0);
  94  |   await expect(page.locator('article .companion-message-assistant')).toHaveCount(1);
  95  |   await expect(typing(page)).toHaveCount(0);
  96  |   await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  97  |   await expect(page.getByText('Account A accepted answer', { exact: true })).toBeVisible();
  98  |   await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  99  |   await expect(page.locator('article .companion-message-assistant').last()).toContainText('brand name');
  100 | });
  101 |
  102 | for (const lifecycle of ['reload', 'leave-and-return']) {
  103 |   test(`${lifecycle} during typing retains the accepted answer and its next question`, async ({ page }) => {
  104 |     await openFixture(page);
  105 |     await input(page).fill('Persist this accepted answer'); await input(page).press('Enter');
  106 |     await expect(typing(page)).toBeVisible();
  107 |     if (lifecycle === 'reload') await page.reload();
  108 |     else { await page.goto('about:blank'); await page.goto('/companion-chat-preview.html'); }
  109 |     await expect(page.getByText('Persist this accepted answer', { exact: true })).toBeVisible();
  110 |     await page.clock.runFor(1000);
  111 |     await expect(typing(page)).toHaveCount(0);
  112 |     await expect(page.locator('.companion-message-user')).toHaveCount(1);
  113 |     await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  114 |     await expect(page.locator('article .companion-message-assistant').last()).toContainText('brand name');
  115 |   });
  116 | }
  117 |
  118 | test('reduced motion keeps the typing indicator static while preserving the delay', async ({ page }) => {
  119 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  120 |   await openFixture(page);
  121 |   await input(page).fill('A reduced motion brief'); await input(page).press('Enter');
  122 |   await expect(typing(page)).toBeVisible();
  123 |   expect(await typing(page).evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  124 |   await page.clock.runFor(499);
  125 |   await expect(typing(page)).toBeVisible();
  126 |   await page.clock.runFor(101);
  127 |   await expect(typing(page)).toHaveCount(0);
  128 |   await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  129 | });
  130 |
  131 | for (const [width, height] of [[375, 667], [390, 844], [1280, 900]]) {
  132 |   test(`typing and delivered typography plus golden user bubble at ${width}px`, async ({ page }) => {
  133 |     await page.setViewportSize({ width, height });
  134 |     await openFixture(page);
  135 |     await input(page).fill('Cold brew for busy parents.'); await input(page).press('Enter');
  136 |     await expect(typing(page)).toBeVisible();
  137 |     // Advance only enough for scrolling/layout, while the 600ms reply stays pending.
  138 |     await page.clock.runFor(200);
  139 |     await expect(typing(page)).toBeInViewport();
  140 |     fs.mkdirSync(QA, { recursive: true });
  141 |     await page.screenshot({ path: path.join(QA, `${phase}-typing-${width}.png`) });
  142 |     await page.clock.runFor(400);
  143 |     await expect(typing(page)).toHaveCount(0);
  144 |     await page.clock.runFor(500);
  145 |     await expect(page.locator('article .companion-message-assistant').last()).toBeInViewport();
  146 |     const metrics = await page.evaluate(() => {
  147 |       const css = (selector: string) => { const style = getComputedStyle(document.querySelector(selector)!); return { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, color: style.color, background: style.backgroundColor, image: style.backgroundImage, border: style.borderColor }; };
  148 |       return { user: css('.companion-message-user'), assistant: css('article .companion-message-assistant'), input: css('.companion-message-input'), button: css('.companion-header button:not([aria-label])'), timestamp: css('article time'), overflow: document.documentElement.scrollWidth - innerWidth };
  149 |     });
  150 |     fs.writeFileSync(path.join(QA, `${phase}-typography-${width}.json`), JSON.stringify(metrics, null, 2));
  151 |     for (const metric of [metrics.user, metrics.assistant, metrics.input]) {
  152 |       expect(metric.font.split(',')[0].replaceAll('"', '').trim()).toBe('Inter');
> 153 |       expect(metric.size).toBe('14px');
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  154 |     }
  155 |     expect(metrics.user.weight).toBe('400'); expect(metrics.input.weight).toBe('400');
  156 |     expect(metrics.button.font.split(',')[0].replaceAll('"', '').trim()).toBe('Inter');
  157 |     expect(metrics.button.size).toBe('14px');
  158 |     expect(metrics.button.weight).toBe('600');
  159 |     expect(metrics.timestamp.font).toContain('JetBrains Mono');
  160 |     expect(metrics.overflow).toBeLessThanOrEqual(0);
  161 |     expect(`${metrics.user.background} ${metrics.user.image} ${metrics.user.border}`).toContain('255, 204, 0');
  162 |     expect(metrics.user.background + metrics.user.image).not.toBe(metrics.assistant.background + metrics.assistant.image);
  163 |     await page.screenshot({ path: path.join(QA, `${phase}-delivered-${width}.png`) });
  164 |     await page.emulateMedia({ contrast: 'more' });
  165 |     const goldEdge = await page.locator('.companion-message-user').evaluate(element => getComputedStyle(element).borderColor);
  166 |     expect(goldEdge).toContain('255, 204, 0');
  167 |   });
  168 | }
  169 |
  170 | test('real timer delivers the next question without provider activity', async ({ page }) => {
  171 |   await openFixture(page, false);
  172 |   await page.evaluate(() => {
  173 |     const start = performance.now();
  174 |     const marks: Record<string, number> = {};
  175 |     const observer = new MutationObserver(() => {
  176 |       if (document.querySelector('.companion-message-user') && marks.accepted === undefined) marks.accepted = performance.now() - start;
  177 |       if (document.querySelector('[role="status"][aria-label="Grifon is typing"]') && marks.typing === undefined) marks.typing = performance.now() - start;
  178 |       if (document.querySelectorAll('article .companion-message-assistant').length === 2 && marks.delivered === undefined) { marks.delivered = performance.now() - start; observer.disconnect(); }
  179 |     });
  180 |     observer.observe(document.querySelector('[data-testid="conversation-scroll"]')!, { childList: true, subtree: true });
  181 |     (window as any).typingTimingMarks = marks;
  182 |   });
  183 |   await input(page).fill('Real timer observation'); await input(page).press('Enter');
  184 |   await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  185 |   const observation = await page.evaluate(() => ({ marks: (window as any).typingTimingMarks, calls: (window as any).companionFixture.snapshot().calls }));
  186 |   fs.mkdirSync(QA, { recursive: true });
  187 |   fs.writeFileSync(path.join(QA, `${phase}-real-timing.json`), JSON.stringify(observation, null, 2));
  188 |   expect(observation.calls).toEqual([]);
  189 |   // Deterministic timing bounds are asserted with page.clock above; this records
  190 |   // the production browser timer without imposing a load-sensitive wall-time gate.
  191 |   expect(observation.marks.typing).toBeDefined();
  192 |   expect(observation.marks.delivered).toBeGreaterThan(observation.marks.accepted);
  193 | });
  194 |
  195 | test('result revision controls respond immediately without an intake typing delay', async ({ page }) => {
  196 |   await openFixture(page);
  197 |   await page.evaluate(() => (window as any).companionFixture.emit('result'));
  198 |   await input(page).fill('style clean'); await input(page).press('Enter');
  199 |   expect(await typing(page).count()).toBe(0);
  200 |   await expect(page.locator('article .companion-message-assistant').last()).toContainText('Clean is selected.');
  201 |   await expect(page.getByRole('button', { name: 'Apply style', exact: true })).toBeVisible();
  202 |   expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls.some((call: any) => call.name === 'choosePreset'))).toBe(false);
  203 | });
  204 |
```