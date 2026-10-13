# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: route-consistency.spec.ts >> marked OAuth return enters the app after a full callback reload
- Location: tests\e2e\route-consistency.spec.ts:109:1

# Error details

```
Error: expect(received).toBeNull()

Received: "1"
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: Chats
        - button "Collapse conversations" [ref=e7] [cursor=pointer]:
          - img [ref=e8]
      - button "New chat" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - text: New chat
      - generic [ref=e13]:
        - img [ref=e14]
        - textbox "Search chats" [ref=e17]:
          - /placeholder: Search
      - navigation "Conversations" [ref=e18]:
        - 'button "Open chat: New chat" [ref=e19] [cursor=pointer]': New chat
      - generic [ref=e20]:
        - button "Studio" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
          - text: Studio
        - button "Account settings" [ref=e27] [cursor=pointer]:
          - img [ref=e28]
          - generic [ref=e31]: Buyer
        - paragraph [ref=e32]: Saved on this device
    - generic [ref=e33]:
      - region "Conversation with Grifon" [ref=e36]:
        - generic:
          - generic:
            - generic:
              - heading "Grifon" [level=1]
        - generic [ref=e39]:
          - paragraph [ref=e40]:
            - time [ref=e41]: Oct 7 · 3:31 PM
          - article [ref=e42]:
            - paragraph [ref=e43]: What product are we making an ad for? Tell me about your audience and what you want the ad to achieve.
        - generic [ref=e44]:
          - generic [ref=e45]:
            - button "Attach product photo" [ref=e46] [cursor=pointer]:
              - img [ref=e47]
            - textbox "Message Grifon" [ref=e48]:
              - /placeholder: Tell Grifon…
            - button "Start voice input" [ref=e49] [cursor=pointer]:
              - img [ref=e50]
            - button "Send" [disabled] [ref=e53]:
              - img [ref=e54]
          - paragraph [ref=e56]: Voice input uses your browser and may be processed online. Review before sending.
          - paragraph [ref=e57]: Draft saved on this device. No generation starts until you confirm.
      - iframe [ref=e58]:

  - region "Notifications alt+T"
```

# Test source

```ts
  18  |       const session = () => sessionStorage.getItem('route_fixture_signed_in') ? {
  19  |         access_token: 'test-only-token', user: {id:'route-fixture-user', email:'buyer@example.test', user_metadata:{}}
  20  |       } : null;
  21  |       window.__routeFixtureSignIn = () => {
  22  |         sessionStorage.setItem('route_fixture_signed_in', '1');
  23  |         listeners.forEach(fn => fn('SIGNED_IN', session()));
  24  |       };
  25  |       const query = {select:()=>query,eq:()=>query,maybeSingle:async()=>({data:null}),
  26  |         single:async()=>({data:null}),then:resolve=>resolve({data:[]})};
  27  |       const channel = {on:()=>channel,subscribe:()=>channel};
  28  |       const client = {auth:{getSession:async()=>({data:{session:session()}}),
  29  |         onAuthStateChange:fn=>{listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},
  30  |         signOut:async()=>{sessionStorage.removeItem('route_fixture_signed_in');listeners.forEach(fn=>fn('SIGNED_OUT',null));return {error:null};}},
  31  |         from:()=>query,channel:()=>channel,removeChannel:()=>{}};
  32  |       export const getSupabase = () => client;
  33  |     ` });
  34  |   });
  35  | }
  36  |
  37  | test('pricing Home changes the URL and refresh preserves the landing screen', async ({ page }) => {
  38  |   await page.goto('/pricing');
  39  |   await page.getByRole('button', { name: 'Home', exact: true }).click();
  40  |   await expect(page.locator('.landing-page')).toBeVisible();
  41  |   await expect(page).toHaveURL(/\/$/);
  42  |   await page.reload();
  43  |   await expect(page.locator('.landing-page')).toBeVisible();
  44  | });
  45  |
  46  | test('landing, pricing and login retain real Back and Forward entries', async ({ page }) => {
  47  |   await page.goto('/');
  48  |   await page.getByRole('button', { name: 'Pricing', exact: true }).first().click();
  49  |   await expect(page).toHaveURL(/\/pricing$/);
  50  |   await page.getByRole('button', { name: 'Annual', exact: true }).click();
  51  |   await page.getByRole('button', { name: 'Choose Starter', exact: true }).click();
  52  |   await expect(page).toHaveURL(/\/login\?plan=starter&cycle=annual$/);
  53  |   await page.goBack();
  54  |   await expect(page).toHaveURL(/\/pricing$/);
  55  |   await expect(page.locator('.pricing-page')).toBeVisible();
  56  |   await page.goBack();
  57  |   await expect(page).toHaveURL(/\/$/);
  58  |   await expect(page.locator('.landing-page')).toBeVisible();
  59  |   await page.goForward();
  60  |   await expect(page.locator('.pricing-page')).toBeVisible();
  61  |   await page.goForward();
  62  |   await expect(page).toHaveURL(/\/login\?plan=starter&cycle=annual$/);
  63  |   await expect(page.locator('.auth-gateway')).toBeVisible();
  64  |   await page.reload();
  65  |   await expect(page.locator('.auth-gateway')).toBeVisible();
  66  |   expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('grifon_intended_plan') || 'null')))
  67  |     .toEqual({ plan_id: 'starter', billing_cycle: 'annual' });
  68  | });
  69  |
  70  | test('checkout error Back updates the URL to pricing', async ({ page }) => {
  71  |   await page.goto('/checkout?plan=business&cycle=annual');
  72  |   await page.getByRole('button', { name: 'Back to plans', exact: true }).click();
  73  |   await expect(page.locator('.pricing-page')).toBeVisible();
  74  |   await expect(page).toHaveURL(/\/pricing$/);
  75  | });
  76  |
  77  | test('Reviews anchor and logo reflect the current landing location', async ({ page }) => {
  78  |   await page.goto('/');
  79  |   await page.getByRole('link', { name: 'Reviews', exact: true }).click();
  80  |   await expect(page).toHaveURL(/\/#reviews$/);
  81  |   await expect(page.locator('#reviews')).toBeInViewport();
  82  |   await page.locator('header').getByText('GRIFON', { exact: true }).click();
  83  |   await expect(page).toHaveURL(/\/$/);
  84  |   await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  85  | });
  86  |
  87  | test('signed-in pricing Home, app entry and logout keep screen and path aligned', async ({ page }) => {
  88  |   await authFixture(page);
  89  |   await page.addInitScript(() => sessionStorage.setItem('route_fixture_signed_in', '1'));
  90  |   await page.goto('/pricing');
  91  |   await page.getByRole('button', { name: 'Home', exact: true }).click();
  92  |   await expect(page.locator('.landing-page')).toBeVisible();
  93  |   await expect(page).toHaveURL(/\/$/);
  94  |   await page.reload();
  95  |   await expect(page.locator('.landing-page')).toBeVisible();
  96  |   await expect(page).toHaveURL(/\/$/);
  97  |   await page.getByRole('button', { name: /^log in$/i }).click();
  98  |   await expect(page).toHaveURL(/\/app$/);
  99  |   await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
  100 |   await page.getByRole('button', { name: 'Account settings', exact: true }).click();
  101 |   await page.getByRole('button', { name: /sign out/i }).click();
  102 |   await expect(page).toHaveURL(/\/login\?from=logout$/);
  103 |   await expect(page.locator('.auth-gateway')).toBeVisible();
  104 |   await page.goBack();
  105 |   await expect(page.locator('.landing-page')).toBeVisible();
  106 |   await expect(page).toHaveURL(/\/$/);
  107 | });
  108 |
  109 | test('marked OAuth return enters the app after a full callback reload', async ({ page }) => {
  110 |   await authFixture(page);
  111 |   await page.addInitScript(() => {
  112 |     sessionStorage.setItem('route_fixture_signed_in', '1');
  113 |     sessionStorage.setItem('grifon_oauth_pending', '1');
  114 |   });
  115 |   await page.goto('/');
  116 |   await expect(page).toHaveURL(/\/app$/);
  117 |   await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
> 118 |   expect(await page.evaluate(() => sessionStorage.getItem('grifon_oauth_pending'))).toBeNull();
      |                                                                                     ^ Error: expect(received).toBeNull()
  119 | });
  120 |
  121 | test('payment retry carries a billing cycle changed within checkout', async ({ page }) => {
  122 |   await authFixture(page);
  123 |   await page.addInitScript(() => sessionStorage.setItem('route_fixture_signed_in', '1'));
  124 |   await page.route('**/api/billing?action=intent', route => {
  125 |     const { plan_id, billing_cycle } = route.request().postDataJSON();
  126 |     return route.fulfill({ json: {
  127 |       intent_id: 'fixture-intent', client_key: 'fixture', status: 'awaiting_payment_method',
  128 |       plan: { id: plan_id, name: 'Business', billing_cycle, description: 'Fixture' },
  129 |       breakdown: { subtotal_centavos: 499700, vat_centavos: 0, total_centavos: 499700, add_on_centavos: 0 },
  130 |     } });
  131 |   });
  132 |   await page.goto('/checkout?plan=business&cycle=monthly');
  133 |   await page.getByRole('radio', { name: /^Annual/ }).click();
  134 |   await expect(page).toHaveURL(/\/checkout\?plan=business&cycle=annual$/);
  135 |   await page.goto('/billing/3ds-return');
  136 |   await page.getByRole('button', { name: 'Try again', exact: true }).click();
  137 |   await expect(page).toHaveURL(/\/checkout\?plan=business&cycle=annual$/);
  138 |   await expect(page.getByRole('radio', { name: /^Annual/ })).toBeChecked();
  139 | });
  140 |
  141 | test('auth and browser history preserve legal and annual checkout return', async ({ page }) => {
  142 |   await authFixture(page);
  143 |   await page.goto('/login?plan=business&cycle=annual');
  144 |   await page.getByRole('button', { name: 'Terms of Service', exact: true }).click();
  145 |   await expect(page).toHaveURL(/\/terms$/);
  146 |   await page.goBack();
  147 |   await expect(page.locator('.auth-gateway')).toBeVisible();
  148 |   await page.goForward();
  149 |   await expect(page).toHaveURL(/\/terms$/);
  150 |   await page.reload();
  151 |   await page.getByRole('button', { name: 'Back', exact: true }).click();
  152 |   await expect(page).toHaveURL(/\/login\?plan=business&cycle=annual$/);
  153 |   await page.evaluate(() => (window as any).__routeFixtureSignIn());
  154 |   await expect(page).toHaveURL(/\/checkout\?plan=business&cycle=annual$/);
  155 | });
  156 |
  157 | test('guest app deep link presents login at its own URL', async ({ page }) => {
  158 |   await page.goto('/app');
  159 |   await expect(page.locator('.auth-gateway')).toBeVisible();
  160 |   await expect(page).toHaveURL(/\/login$/);
  161 | });
  162 |
  163 | for (const selection of ['plan=business&cycle=annual', 'topup=video_ad_pack5']) {
  164 |   test(`payment retry restores the selected checkout: ${selection}`, async ({ page }) => {
  165 |     await page.goto(`/checkout?${selection}`);
  166 |     await expect(page.getByRole('button', { name: /Back to plans|Back to my ads/i })).toBeVisible();
  167 |     await page.goto('/billing/3ds-return');
  168 |     await page.getByRole('button', { name: 'Try again', exact: true }).click();
  169 |     await expect(page).toHaveURL(new RegExp(`/checkout\\?${selection}$`));
  170 |     await page.reload();
  171 |     await expect(page.getByRole('button', { name: /Back to plans|Back to my ads/i })).toBeVisible();
  172 |   });
  173 | }
  174 |
  175 | test('mobile menu routes and direct Reviews links match their visible location', async ({ page }) => {
  176 |   await page.setViewportSize({ width: 390, height: 844 });
  177 |   await page.goto('/#reviews');
  178 |   await expect(page.locator('#reviews')).toBeInViewport();
  179 |   await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  180 |   await page.getByRole('button', { name: 'Pricing', exact: true }).last().click();
  181 |   await expect(page).toHaveURL(/\/pricing$/);
  182 |   await expect(page.locator('.pricing-page')).toBeVisible();
  183 |   await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  184 |   await page.getByRole('button', { name: 'Home', exact: true }).last().click();
  185 |   await expect(page).toHaveURL(/\/$/);
  186 |   await expect(page.locator('.landing-page')).toBeVisible();
  187 |   await page.goBack();
  188 |   await expect(page.locator('.pricing-page')).toBeVisible();
  189 |   await page.goBack();
  190 |   await expect(page).toHaveURL(/\/#reviews$/);
  191 |   await expect(page.locator('#reviews')).toBeInViewport();
  192 | });
  193 |
  194 | test('billing success continues to the authenticated chat URL', async ({ page }) => {
  195 |   await authFixture(page);
  196 |   await page.addInitScript(() => sessionStorage.setItem('route_fixture_signed_in', '1'));
  197 |   await page.route(/\/hooks\/useSubscription\.ts(?:\?.*)?$/, route => route.fulfill({
  198 |     contentType: 'application/javascript',
  199 |     body: `export const useSubscription=()=>({plan_id:'pro',status:'active',loading:false,billing_cycle:'monthly'});`,
  200 |   }));
  201 |   await page.goto('/billing/success');
  202 |   await page.getByRole('button', { name: 'Create my first ad', exact: false }).click();
  203 |   await expect(page).toHaveURL(/\/app$/);
  204 |   await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
  205 | });
  206 |
  207 | test('invalid checkout return selection falls back to pricing on the same origin', async ({ page }) => {
  208 |   await page.addInitScript(() => sessionStorage.setItem('grifon_checkout_return', '/checkout?plan=https://example.test&cycle=annual'));
  209 |   await page.goto('/billing/3ds-return');
  210 |   await page.getByRole('button', { name: 'Try again', exact: true }).click();
  211 |   await expect(page).toHaveURL('http://localhost:5173/pricing');
  212 |   await expect(page.locator('.pricing-page')).toBeVisible();
  213 | });
  214 |
```
