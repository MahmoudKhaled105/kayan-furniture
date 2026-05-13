# Design System Document: The Artisanal Atelier

## 1. Overview & Creative North Star
**Creative North Star: "The Modern Majlis"**
This design system moves away from the sterile, "SaaS-blue" corporate template. It is an editorial-first management experience that treats furniture inventory like a high-end gallery. By blending deep, charcoal-stained woods with the warmth of brass and amber, we create an atmosphere of a luxury showroom—not just a database. 

The system breaks the "template" look through **intentional asymmetry** and **high-contrast typography**. We reject the rigid grid in favor of layered surfaces that overlap, creating a sense of physical depth. The tone is uniquely Egyptian: professional excellence delivered with the warmth and wit of local craftsmanship.

---

## 2. Colors: The Palette of Craftsmanship
The color strategy mimics high-end interior materials: charcoal stone, aged brass, and polished amber.

*   **Primary (`#e8c46a`) & Primary Container (`#cba851`):** These represent the "Gold/Brass" accents. Use them for high-intent actions and to highlight signature furniture pieces.
*   **Secondary (`#ffb781`):** A warm wood-tone variant used for secondary accents or status indicators related to "Warmth" (e.g., active orders).
*   **Surface Hierarchy (The Foundation):**
    *   **Background (`#131313`):** The "Deep Charcoal" base.
    *   **Surface Container Lowest (`#0e0e0e`):** For recessed areas or deep background sections.
    *   **Surface Container High (`#2a2a2a`):** For primary interactive cards and panels.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background creates a clean, sophisticated edge without the visual noise of a line.

### Glass & Gradient Rule
To achieve a premium "Showroom" feel, use **Glassmorphism** for floating navigation and modal overlays. 
*   **Glass Token:** Use `surface-variant` at 60% opacity with a `20px` backdrop-blur. 
*   **Signature Gradients:** For main CTAs (like "إضافة قطعة جديدة"), use a linear gradient from `primary` to `primary-container`. This adds "soul" and prevents the UI from feeling flat.

---

## 3. Typography: Editorial Authority
We utilize a pairing of **Manrope** (for Latin numerals/technical labels) and **IBM Plex Sans Arabic** for its architectural precision and modern legibility.

*   **Display & Headlines (Manrope/IBM Plex Bold):** These are large and assertive. Use `display-lg` for dashboard titles like "الزتونة" (The Summary) to create an editorial, magazine-like feel.
*   **Body (Inter/IBM Plex Regular):** Optimized for readability in inventory lists.
*   **The Tone Shift:** While the typography is "Professional," the content is "Informal." This juxtaposition (Elegant Font + Egyptian Slang) creates a brand personality that feels like an expert craftsman talking to a friend.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "lift"; we use **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." Place a `surface-container-highest` card on a `surface-container-low` section. This creates a soft, natural lift that mimics stacked sheets of fine wood or stone.
*   **Ambient Shadows:** If an element must "float" (like a dropdown or a floating action button), use an extra-diffused shadow:
    *   *Blur:* 30px | *Opacity:* 6% | *Color:* `#000000`. 
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components: Styled for the Atelier

### Buttons
*   **Primary (The Brass Button):** Gradient of `primary` to `primary-container`, `xl` rounded corners (1.5rem), white text.
*   **Secondary:** `surface-container-highest` background with `primary` text. No border.
*   **Tertiary (Ghost):** No background, `on-surface-variant` text, turns to `primary` on hover.

### Cards (The "Furniture Folders")
*   **Rule:** Forbid the use of divider lines.
*   **Structure:** Use `spacing-6` (2rem) as internal padding. Separate the item image from the description using a subtle shift from `surface-container-high` to `surface-container-low`.

### Glass Inputs
*   **Style:** `surface-container-lowest` background with a `15%` opacity `outline-variant` ghost border. When focused, the border becomes `primary` at 50% opacity with a subtle glow.

### Signature App Components
*   **The "Hassala" (Payment Tracker):** A circular progress component using the `secondary` wood tone to show financial targets.
*   **The "Mandara" (Showroom Grid):** An asymmetrical grid layout for furniture items where featured pieces take up 2x2 slots, breaking the standard table view.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `xl` rounded corners (1.5rem) for large containers to soften the "industrial" feel of the dark theme.
*   **Do** embrace the slang. Labels like "المنضرة" (Showroom) should be prominent headline styles.
*   **Do** use generous white space (referencing `spacing-10` and `spacing-16`) to let high-end product photos "breathe."

### Don't
*   **Don't** use pure black `#000000`. Always use the `surface` tokens to maintain the "Charcoal" warmth.
*   **Don't** use standard 1px grey dividers. If you need to separate content, use a `spacing-px` gap that reveals the background color beneath.
*   **Don't** use sharp corners. This is a "Warm" system; sharp edges feel clinical and cold.