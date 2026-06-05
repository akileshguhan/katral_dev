---
name: Lumina Learning
colors:
  surface: '#faf8ff'
  surface-dim: '#dad9e1'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fb'
  surface-container: '#eeedf5'
  surface-container-high: '#e8e7ef'
  surface-container-highest: '#e2e2e9'
  on-surface: '#1a1b21'
  on-surface-variant: '#484554'
  inverse-surface: '#2f3036'
  inverse-on-surface: '#f1f0f8'
  outline: '#797586'
  outline-variant: '#c9c4d7'
  surface-tint: '#6042d6'
  primary: '#451ebb'
  on-primary: '#ffffff'
  primary-container: '#5d3fd3'
  on-primary-container: '#d8ceff'
  inverse-primary: '#cabeff'
  secondary: '#006d36'
  on-secondary: '#ffffff'
  secondary-container: '#83fba5'
  on-secondary-container: '#00743a'
  tertiary: '#7e2600'
  on-tertiary: '#ffffff'
  tertiary-container: '#a13a0f'
  on-tertiary-container: '#ffc8b6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6deff'
  primary-fixed-dim: '#cabeff'
  on-primary-fixed: '#1c0062'
  on-primary-fixed-variant: '#4723be'
  secondary-fixed: '#83fba5'
  secondary-fixed-dim: '#66dd8b'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005227'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#380c00'
  on-tertiary-fixed-variant: '#822800'
  background: '#faf8ff'
  on-background: '#1a1b21'
  surface-variant: '#e2e2e9'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base_unit: 8px
  container_max_width: 1280px
  gutter: 24px
  margin_mobile: 16px
  margin_desktop: 40px
---

## Brand & Style

The design system is engineered for a modern, vibrant educational platform that balances academic rigor with creative energy. The target audience includes lifelong learners, students, and educators who value a clean, distraction-free environment that still feels optimistic and forward-thinking.

The visual style is **Contemporary Corporate with Glassmorphic Accents**. It utilizes a sophisticated "light mode" foundation characterized by high-quality geometric typography and generous whitespace. To inject energy, the system employs vibrant gradients and translucent, frosted-glass layers that create a sense of depth and modernity. The emotional response should be one of clarity, inspiration, and technical precision.

## Colors

The palette is anchored by a **Deep Purple** primary color, representing wisdom and digital sophistication. **Emerald Green** is used for success states, progress indicators, and "Go" actions, while **Coral Red** provides a warm, energetic contrast for highlights, notifications, and critical calls-to-action.

The background is not a pure white but a **Faint Purple Tint** (#F8F7FF) to soften the interface and maintain brand cohesion across all surfaces. Gradients should be used sparingly on primary buttons and hero illustrations to maintain the "vibrant" requirement without overwhelming the content. Glassmorphism effects utilize a semi-transparent white fill with a significant background blur (20px+) to create a layered, "aerospace" feel.

## Typography

This design system uses **Plus Jakarta Sans** for the majority of the interface to leverage its soft, welcoming geometric curves. Headlines use heavier weights (Bold/ExtraBold) with slight negative letter-spacing to appear impactful and modern.

For technical or functional elements—such as progress percentages, code snippets, or metadata labels—**Geist** is introduced. Its monospaced-influenced proportions provide a "pro" feel that complements the educational context. For mobile, display sizes scale down aggressively to ensure readability without horizontal scrolling, while body text remains large (16px minimum) to ensure accessibility during long reading sessions.

## Layout & Spacing

The layout follows a **Fluid Grid** model based on an 8px square rhythm. On desktop, a 12-column grid is used with wide 24px gutters to allow the content to breathe. 

- **Mobile:** 4 columns, 16px side margins.
- **Tablet:** 8 columns, 24px side margins.
- **Desktop:** 12 columns, 40px side margins, max-width of 1280px for the central container.

Spacing between logical sections should be generous (typically 64px or 80px) to maintain the "clean" aesthetic. Components utilize internal padding following the 8px scale (e.g., 16px, 24px, 32px) to ensure consistent internal alignment.

## Elevation & Depth

Hierarchy is established through **Glassmorphism and Tonal Layering** rather than heavy shadows. 

1.  **Level 0 (Base):** The faint purple neutral background.
2.  **Level 1 (Cards/Surface):** Solid white containers with a very soft, high-spread shadow (0px 4px 20px rgba(93, 63, 211, 0.05)) to separate from the background.
3.  **Level 2 (Overlays/Modals):** Glassmorphic surfaces. A background blur of 24px combined with a 70% white opacity and a thin 1px white border (20% opacity) to simulate reflective edges.

Shadows should always be tinted with the Primary Purple color to keep the palette cohesive and avoid "dirty" grey shadows.

## Shapes

The design system adopts a **Generous Roundedness** strategy to appear friendly and approachable. 

The standard border radius is **0.5rem (8px)** for small elements like inputs and tags. However, main UI containers and cards utilize **rounded-2xl (1.5rem / 24px)** to create the distinct, modern look requested. Buttons follow a "Super-ellipse" feel with significant corner rounding, and progress bars or decorative chips should be fully pill-shaped (rounded-full).

## Components

- **Buttons:** Primary buttons use the purple-to-violet gradient with white text. Secondary buttons use a "ghost" style with a 1px deep purple border. All buttons have a height of 48px for better touch targets and 24px horizontal padding.
- **Input Fields:** Use the faint purple tint as a fill with a 1px border that turns Deep Purple on focus. Labels use the Geist font at 13px.
- **Cards:** Use `rounded-2xl` corners. Course cards should feature a glassmorphic footer overlay for the title and progress.
- **Chips/Tags:** Used for categories (e.g., "Design," "Math"). These use a semi-transparent version of the primary, secondary, or tertiary colors with high-contrast text.
- **Progress Bars:** Use a thick 8px track. The fill is always the Emerald Green gradient to signify growth and completion.
- **Navigation:** The top navigation bar is a glassmorphic "sticky" element that blurs the content behind it, creating a high-end, integrated feel.