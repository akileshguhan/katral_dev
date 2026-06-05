---
name: Academic Professional
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#41485e'
  on-tertiary: '#ffffff'
  tertiary-container: '#586076'
  on-tertiary-container: '#d4dbf5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 280px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  section-gap: 64px
---

## Brand & Style

This design system establishes a professional, enterprise-grade learning environment that bridges the gap between collaborative productivity tools and structured educational platforms. The personality is authoritative yet accessible, focusing on clarity, focus, and reliability. 

The aesthetic is a **Corporate Modern** style with a high degree of "polish." It utilizes a disciplined layout inspired by productivity suites, featuring a sidebar-heavy navigation model and a clear content hierarchy. The interface prioritizes high readability and functional density, ensuring that both educators and students can navigate complex course materials without cognitive overload. It evokes a sense of "organized intelligence" through structured grids and intentional use of whitespace.

## Colors

The color palette is anchored by a deep **Indigo** primary, which signals trust and academic rigor. The **Amber** accent is used sparingly for high-priority calls to action, progress indicators, and "aha!" moments in the learning journey. 

The neutral palette is built on the **Slate** scale. The background uses a very light Slate-50 to provide a softer, more premium feel than pure white, reducing eye strain during long study sessions. The sidebar is committed to a dark Slate-900 (Deep Navy), creating a strong structural anchor for the application and clearly separating global navigation from the active workspace.

## Typography

The typography utilizes **Inter** exclusively to lean into its utilitarian, highly legible nature. The system relies on weight and color rather than font variety to establish hierarchy. 

Headlines use semi-bold and bold weights with tight letter-spacing to feel impactful and modern. Body text is optimized for long-form reading with a generous 1.5x line height. Label styles are used for metadata, sidebar navigation, and button text, often employing a medium weight to maintain clarity at smaller sizes.

## Layout & Spacing

The system uses a **Fixed-Fluid Hybrid** model. The sidebar remains at a fixed 280px width (collapsible to 80px), while the main content area occupies a fluid space up to a maximum container width of 1280px to maintain line-length readability.

A 12-column grid is used for dashboard layouts and course galleries. Spacing follows an 8px base unit, with 24px gutters providing ample breathing room between functional blocks. On mobile, margins shrink to 16px and the sidebar transitions to a bottom-sheet or a full-screen overlay menu.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Soft Ambient Shadows**. 

1.  **Level 0 (Floor):** The Slate-50 background.
2.  **Level 1 (Cards/Sections):** White surfaces with an extremely soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.05)). This is the primary container for course content.
3.  **Level 2 (Popovers/Dropdowns):** White surfaces with a more pronounced shadow (0px 10px 30px rgba(0,0,0,0.1)) and a subtle 1px border in Slate-200.
4.  **Level 3 (Modals):** Centered containers with a heavy backdrop blur (8px) on the layers beneath.

Interactive elements like buttons use a subtle "press" effect where the shadow decreases on active states to mimic physical tactility.

## Shapes

The shape language is defined by **Rounded-XL** (0.75rem to 1rem) corners. This high level of roundness softens the "corporate" feel of the Slate colors, making the platform feel more welcoming and modern. 

Input fields, buttons, and cards all share this radius. Smaller components like badges or tags may use a full-pill radius to distinguish them as secondary interactive elements. Sidebar active-state indicators use a "right-side rounded" pill that connects to the edge of the screen.

## Components

### Buttons
Primary buttons use the Indigo background with white text. The "Amber" accent is reserved for "Submit Assignment" or "Upgrade" actions. Secondary buttons use a Slate-100 background or a Slate-200 outline. All buttons have a height of 44px (md) or 52px (lg) to ensure accessibility.

### Input Fields
Inputs feature a 1px Slate-200 border, turning Indigo on focus. The background is pure white to contrast against the Slate-50 page background. Error states use a soft Red-500 border with supporting text.

### Cards
Content cards (for courses or modules) are white with the "Level 1" shadow. They feature a standard 16px internal padding. Images within cards should have a top-only roundedness that matches the card container.

### Lists & Navigation
Sidebar items use Lucide icons (20px) with a Slate-400 color, shifting to White on active states. Active states are indicated by an Indigo background block with rounded-xl corners.

### Chips & Badges
Used for course tags or status indicators (e.g., "In Progress"). These use a low-saturation version of the status color (e.g., Indigo-50 background with Indigo-700 text) to maintain professional restraint.