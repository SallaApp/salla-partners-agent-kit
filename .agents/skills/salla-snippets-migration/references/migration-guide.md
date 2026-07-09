# HTML → JS Snippet Migration — Reference

Full mechanics for [`SKILL.md`](../SKILL.md) Steps 2–4. The parameter model (what's
FORBIDDEN, what's merchant-conditional, what's unchanged) lives in `SKILL.md` itself — this
file does not repeat it. Sourced from https://docs.salla.dev/2247590m0.md, with two
intentional corrections called out below — **do not silently resync this file against that
raw doc**; the corrections are load-bearing.

## Corrections vs. the raw doc (why this file diverges)

1. **Parameter table dropped.** The raw doc's "Parameter Mapping: Old to New" table
   asserts specific renames (`{{customer.id}}`→`user.id`, `{{store.domain}}`→`store.url`,
   `{{user.email}}`→`store.contacts.email`) that this kit does not treat as fact. The
   correct model is in `SKILL.md`: `customer.*` and `store.domain` are forbidden with no
   replacement, not renamed to a specific new key.
2. **Worked example rewrapped.** The raw doc's example calls `salla.config.get(...)` and
   injects DOM nodes at the top level. This kit requires that inside `salla.onReady(...)` —
   see the worked example below, which is adapted, not copied verbatim.

---

## HTML → JavaScript element conversion

| HTML                                 | JavaScript                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<link rel="stylesheet" href="...">` | `var link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '...'; document.head.appendChild(link);`                                                           |
| `<script src="...">`                 | `var script = document.createElement('script'); script.src = '...'; document.head.appendChild(script);`                                                                             |
| `<script>...</script>` (inline)      | Move the code directly into the snippet body; apply the token rewrites in `SKILL.md` Step 3 to anything inside it.                                                                  |
| `<style>...</style>`                 | `var style = document.createElement('style'); style.innerHTML = '...'; document.head.appendChild(style);`                                                                           |
| Markup (divs, buttons, text)         | `document.body.insertAdjacentHTML('beforeend', '<markup>')` — use `'afterbegin'` if the original markup was in `<head>`.                                                            |
| `<meta>`, `<iframe>`, comments       | No direct equivalent. Drop them; re-implement only if the behavior is genuinely required (and confirm it's not simply disallowed — `salla_snippets` rejects `iframe`/`embed` tags). |

---

## Worked example

### Before (legacy HTML snippet)

```html
<style>
  .roulette-btn {
    border: solid 3px {{app.roulette_border_color}};
  }
</style>

<div class="roulette-btn" id="openRoulette">{{app.button_label}}</div>

<script src="https://cdn.example.com/widget.js?store={{store.id}}"></script>

<script>
  if ("{{app.hideButton}}" === "1") {
    document.getElementById("openRoulette").remove();
  }
</script>
```

### After (pure JS, adapted to this kit's rules)

```js
salla.onReady(() => {
  var style = document.createElement("style");
  style.innerHTML = `.roulette-btn { border: solid 3px ${salla.config.get("app.roulette_border_color", "")}; }`;
  document.head.appendChild(style);

  var html = `<div class="roulette-btn" id="openRoulette">${salla.config.get("app.button_label", "")}</div>`;
  document.body.insertAdjacentHTML("beforeend", html);

  var script = document.createElement("script");
  script.src = `https://cdn.example.com/widget.js?store=${salla.config.get("store.id", "")}`;
  document.head.appendChild(script);

  if (salla.config.get("app.hideButton", "") === "1") {
    document.getElementById("openRoulette").remove();
  }
});
```

Every read in this example is `app.*` or `store.id` — both confirmed, neither forbidden.
The whole block sits inside `salla.onReady(...)` because every line either reads
`salla.config` or writes to the DOM (SKILL.md Step 4). If the source snippet also
registered a `product::*`/`cart::*` listener, that listener would sit **outside** this
`onReady` block, at the top level.

---

## Migration checklist

1. Pull the current legacy snippet content.
2. Split into pieces: markup, `<link>`, `<script src>`, inline `<script>`, `<style>`,
   other.
3. Convert each piece with the element table above.
4. Rewrite every `{{namespace.key}}` token per `SKILL.md`'s parameter model — `app.*`
   unchanged, `customer.*`/`store.domain` forbidden (flag, don't replace), everything else
   against `salla-snippets/references/device-mode.md`'s Store context & language catalog.
5. Wrap every `salla.config.get(...)`/DOM-writing block in `salla.onReady(...)`; keep
   `product::*`/`cart::*` listeners at the top level.
6. Mark every referenced `app.<key>` setting `Public` in the Partners Portal if it isn't
   already.
7. Confirm the result parses as valid JS (`node --check` or equivalent).
8. Hand off to `salla-snippets` Step 2 — do not call `salla_snippets` from this skill.
