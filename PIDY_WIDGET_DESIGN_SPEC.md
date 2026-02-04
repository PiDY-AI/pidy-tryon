# Pidy Widget Design Specification

**Document Version:** 1.0
**Date:** 2026-02-01
**Purpose:** Design specification for Figma widget design

---

## 1. BRAND OVERVIEW

**App Name:** Pidy BodyID
**Purpose:** Virtual try-on and body measurement app for fashion/retail
**Design Style:** Dark mode, minimalist, modern with warm accents

---

## 2. COLOR PALETTE

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Background | `#0D0D0D` | Main app background |
| Surface | `#1A1A1A` | Cards, modals, containers |
| Surface Light | `#252525` | Elevated surfaces, badges |
| Border | `#333333` | All borders and dividers |

### Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary Accent | `#E8C4A0` | CTAs, highlights, active states |
| Accent Light | `#F5E6D3` | Lighter accent variant |
| Accent Dark | `#D4A574` | Gradient end, secondary accent |

### Gradient

```
Primary Button Gradient:
Start: #E8C4A0 → End: #D4A574
Direction: Left to Right (horizontal)
```

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary Text | `#FFFFFF` | Headings, important text |
| Secondary Text | `#B3B3B3` | Body text, descriptions |
| Muted Text | `#757575` | Labels, metadata, placeholders |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#4CAF50` | Confirmations, positive states |
| Warning | `#FF9800` | Alerts, medium confidence |
| Error | `#F44336` | Errors, negative states |

### Fit Indicator Colors

| Fit Type | Hex | Usage |
|----------|-----|-------|
| Tight | `#FF6B6B` | Tight fit indicator |
| Fitted | `#4ECDC4` | Perfect/fitted indicator |
| Loose | `#95E1D3` | Loose fit indicator |

### Gray Scale

| Level | Hex |
|-------|-----|
| Gray 50 | `#FAFAFA` |
| Gray 100 | `#F5F5F5` |
| Gray 200 | `#EEEEEE` |
| Gray 300 | `#E0E0E0` |
| Gray 400 | `#BDBDBD` |
| Gray 500 | `#9E9E9E` |
| Gray 600 | `#757575` |
| Gray 700 | `#616161` |
| Gray 800 | `#424242` |
| Gray 900 | `#212121` |

---

## 3. TYPOGRAPHY

### Font Family
System fonts (San Francisco on iOS, Roboto on Android)

### Type Scale

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 36px | 800 | 44px | Hero titles |
| H1 | 28px | 800 | 36px | Page titles |
| H2 | 20px | 700 | 28px | Section titles |
| H3 | 18px | 700 | 24px | Card titles |
| H4 | 16px | 700 | 22px | Subsection titles |
| Subtitle | 15px | 600 | 22px | Button text, subtitles |
| Body | 14px | 400 | 20px | Body text |
| Body Bold | 14px | 600 | 20px | Emphasized body |
| Caption | 13px | 400 | 18px | Secondary info |
| Small | 12px | 600 | 16px | Labels |
| Micro | 11px | 600 | 14px | Badges, tags |

### Text Styles

- **Uppercase Labels:** Letter spacing 1-2px, weight 600
- **Muted Text:** Color #757575

---

## 4. SPACING SYSTEM

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing, icon gaps |
| sm | 8px | Component internal spacing |
| md | 12px | Card gaps, list items |
| base | 16px | Container padding, standard spacing |
| lg | 20px | Section padding |
| xl | 24px | Large section spacing |
| 2xl | 32px | Major section dividers |

### Container Padding
- **Horizontal:** 16px (standard screens)
- **Horizontal:** 24px (auth/onboarding screens)

---

## 5. BORDER RADIUS

| Token | Value | Usage |
|-------|-------|-------|
| sm | 6px | Badges, small buttons |
| md | 8px | Input fields |
| base | 12px | Buttons, small cards |
| lg | 16px | Cards, containers |
| xl | 20px | Large buttons, modals |
| 2xl | 24px | Modal top corners |
| full | 50% | Circle buttons, avatars |

---

## 6. COMPONENT SPECIFICATIONS

### 6.1 Buttons

#### Primary Button (CTA)
```
Height: 48-56px
Padding: 12px horizontal, 14-18px vertical
Border Radius: 12-20px
Background: Gradient #E8C4A0 → #D4A574
Text Color: #1A1A1A
Font: 15-16px, weight 600
Active Opacity: 0.9
```

#### Secondary Button
```
Height: 44px
Padding: 12px horizontal, 10px vertical
Border Radius: 20px
Background: Transparent or #333333
Border: 1px #333333 (if transparent)
Text Color: #E8C4A0 or #FFFFFF
Font: 15px, weight 600
```

#### Icon Button (Circle)
```
Size: 40-44px
Border Radius: 50%
Background: #1A1A1A or #252525
Icon Color: #E8C4A0 or #FFFFFF
Icon Size: 20-24px
```

#### Disabled State
```
Opacity: 0.6
Background: #333333 (solid, no gradient)
```

---

### 6.2 Cards

#### Product Card
```
Width: 47% of container (2-column grid)
Background: #1A1A1A
Border: 1px #333333
Border Radius: 16px
Overflow: Hidden

Image Section:
  - Height: 180px
  - Width: 100%
  - Object Fit: Cover

Content Section:
  - Padding: 12px
  - Gap: 4-8px between elements
```

#### Surface Card
```
Background: #1A1A1A
Border: 1px #333333
Border Radius: 16px
Padding: 16px
Gap: 12px (between child elements)
```

---

### 6.3 Input Fields

#### Text Input
```
Height: 48-52px
Background: #1A1A1A
Border: 1px #333333
Border Radius: 12px
Padding: 16px

Icon (left):
  - Size: 20px
  - Color: #757575
  - Margin Right: 12px

Text:
  - Font: 14px, weight 400
  - Color: #FFFFFF
  - Placeholder Color: #757575
```

---

### 6.4 Badges & Tags

#### Size Badge
```
Padding: 8px horizontal, 3px vertical
Background: #252525
Border Radius: 6px
Font: 11px, weight 600
Text Color: #FFFFFF
```

#### Accent Badge
```
Padding: 8px horizontal, 3px vertical
Background: #E8C4A0 at 20% opacity
Border: 1px #E8C4A0 at 40% opacity
Border Radius: 6px
Font: 11px, weight 600
Text Color: #E8C4A0
```

#### Status Badge (Confidence)
```
Padding: 4-6px
Border Radius: 4px
Font: 11-13px, weight 600
Background: Status color at 20% opacity
Text Color: Full status color
```

---

### 6.5 Modals

#### Overlay
```
Background: rgba(0, 0, 0, 0.85-0.95)
```

#### Modal Container
```
Background: #1A1A1A
Border Radius: 20-24px (top corners only for bottom sheets)
Max Height: 90% of screen
Padding: 20px
```

#### Modal Header
```
Height: 48-56px
Padding: 16-20px
Border Bottom: 1px #333333
Layout: Row, space-between, center aligned
```

#### Close Button
```
Size: 32-36px
Border Radius: 50%
Background: #252525
Icon: X, 20px, #FFFFFF
Position: Top right or in header
```

---

### 6.6 Navigation

#### Tab Bar
```
Height: 85px
Background: #1A1A1A
Border Top: 1px #333333
Padding: 8px top, 8px bottom
```

#### Tab Item
```
Icon Size: 24px
Label Font: 11px, weight 500
Label Margin Top: 4px
Active Color: #E8C4A0
Inactive Color: #9E9E9E
```

#### Header
```
Height: 48-56px
Padding: 16px horizontal, 8-12px vertical
Background: Transparent or #0D0D0D
Layout: Row, space-between, center aligned
```

---

## 7. ICONOGRAPHY

### Icon Library
**Lucide Icons** (https://lucide.dev)

### Common Icons

| Category | Icons |
|----------|-------|
| Navigation | ArrowLeft, ChevronRight, ChevronLeft, ChevronDown |
| Actions | QrCode, Camera, Upload, Download, RefreshCw, Zap |
| UI | X (close), Check, Info, Eye, EyeOff |
| Profile | User, UserCircle, Heart, Settings, LogOut, Shield |
| Commerce | ShoppingBag, Package, DoorOpen, Store |
| Measurements | Ruler, ScanLine, Clock |
| Status | Sparkles, AlertCircle, HelpCircle, FileText |

### Icon Sizes

| Context | Size |
|---------|------|
| Tab Bar | 24px |
| Header Buttons | 20-24px |
| Card Metadata | 12-18px |
| Buttons with Text | 18-24px |
| Large UI Elements | 32-48px |

### Icon Colors
- Primary: `#FFFFFF`
- Accent: `#E8C4A0`
- Muted: `#757575`
- Success: `#4CAF50`
- Error: `#F44336`

---

## 8. SCREEN LAYOUTS

### 8.1 Standard Screen Structure

```
┌─────────────────────────────────────┐
│ Safe Area Top                       │
├─────────────────────────────────────┤
│ Header (48-56px)                    │
│ [Back] [Title]              [Action]│
├─────────────────────────────────────┤
│                                     │
│ Content Area (ScrollView)           │
│ Padding: 16px horizontal            │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ Footer / CTA Button (optional)      │
├─────────────────────────────────────┤
│ Tab Bar (85px)                      │
│ [Home] [Scan] [Profile]             │
├─────────────────────────────────────┤
│ Safe Area Bottom                    │
└─────────────────────────────────────┘
```

### 8.2 Product Grid Layout

```
┌─────────────────────────────────────┐
│ Section Title              [Action] │
├─────────────────────────────────────┤
│ ┌─────────┐    ┌─────────┐         │
│ │  Image  │    │  Image  │         │
│ │  180px  │    │  180px  │         │
│ ├─────────┤    ├─────────┤         │
│ │ Category│    │ Category│         │
│ │ Title   │    │ Title   │         │
│ │ [Badge] │    │ [Badge] │         │
│ └─────────┘    └─────────┘         │
│      47%            47%      (12px) │
└─────────────────────────────────────┘
```

### 8.3 Modal Layout

```
┌─────────────────────────────────────┐
│ ████████ Overlay ████████████████   │
│ ████████████████████████████████    │
│ ┌───────────────────────────────┐   │
│ │ Header                    [X] │   │
│ ├───────────────────────────────┤   │
│ │                               │   │
│ │ Content                       │   │
│ │                               │   │
│ ├───────────────────────────────┤   │
│ │ [Primary CTA Button]          │   │
│ └───────────────────────────────┘   │
│ ████████████████████████████████    │
└─────────────────────────────────────┘
```

---

## 9. WIDGET DESIGN CONSIDERATIONS

### Embed Context
The widget will be embedded on third-party retail/fashion websites.

### Recommended Widget Sizes

| Type | Dimensions |
|------|------------|
| Compact | 320px × 480px |
| Standard | 375px × 667px |
| Large | 414px × 896px |
| Full Screen | 100% viewport |

### Widget Entry Points

1. **Size Selector Button** - Small inline button
2. **Size Recommendation Banner** - Horizontal strip
3. **Full Try-On Modal** - Overlay experience

### Essential Widget Components

1. **Size Recommendation Card**
   - Recommended size with confidence badge
   - Fit indicator (tight/fitted/loose)
   - "Try On" CTA button

2. **Quick Scan Button**
   - QR code or camera icon
   - "Scan to find your size" text

3. **Fit Visualization**
   - Body outline with garment overlay
   - Color-coded fit areas

4. **Measurement Display**
   - Key measurements (chest, waist, hips)
   - Size comparison table

---

## 10. ANIMATION GUIDELINES

### Transitions
- **Duration:** 200-300ms standard, 400ms for modals
- **Easing:** Ease-in-out for most, spring for modals

### Interactive States
- **Button Press:** Scale 0.98, opacity 0.9
- **Card Hover:** Subtle border color change to #E8C4A0
- **Active Tab:** Color transition to accent

### Loading States
- **Spinner:** Circular, accent color #E8C4A0
- **Skeleton:** Pulse animation on #252525

---

## 11. ACCESSIBILITY

### Touch Targets
- Minimum size: 44×44px
- Spacing between targets: 8px minimum

### Color Contrast
- Text on dark: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- All combinations in this spec meet WCAG AA

### Focus States
- Outline: 2px solid #E8C4A0
- Offset: 2px

---

## 12. ASSET REQUIREMENTS

### Logo
- **Format:** SVG preferred, PNG fallback
- **Sizes:** 24px, 48px, 72px, 100px
- **Variants:** Light (for dark bg), Dark (for light bg)

### Product Images
- **Aspect Ratio:** 3:4 or 2:3
- **Minimum Resolution:** 350×500px
- **Format:** WebP preferred, JPEG fallback

### Icons
- **Source:** Lucide icon library
- **Format:** SVG
- **Stroke Width:** 2px standard

---

## 13. FIGMA SETUP RECOMMENDATIONS

### Color Styles
Create color styles for all tokens in Section 2.

### Text Styles
Create text styles for all typography in Section 3.

### Components
Create components for:
- Buttons (Primary, Secondary, Icon, Disabled variants)
- Cards (Product, Surface)
- Inputs (Text, with/without icon)
- Badges (Size, Accent, Status)
- Modals (Header, Container)
- Navigation (Tab Bar, Header)

### Auto Layout
- Use 4px spacing increments
- Enable auto layout on all containers
- Set proper padding and gap values

### Variants
Create variants for:
- Button states (default, hover, pressed, disabled)
- Input states (default, focused, error)
- Badge types (size, accent, success, warning, error)

---

## 14. QUICK REFERENCE CARD

```
COLORS
──────
Background:     #0D0D0D
Surface:        #1A1A1A
Border:         #333333
Accent:         #E8C4A0
Text Primary:   #FFFFFF
Text Secondary: #B3B3B3
Text Muted:     #757575

TYPOGRAPHY
──────────
Display:   36px / 800
Title:     28px / 800
Subtitle:  15px / 600
Body:      14px / 400
Caption:   13px / 400
Small:     11px / 600

SPACING
───────
Base unit: 4px
Container: 16px
Gap:       12px

RADIUS
──────
Small:  6px
Medium: 12px
Large:  16px
XL:     20px

BUTTONS
───────
Height:  48-56px
Radius:  12-20px
Font:    15px / 600
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-01 | Initial design specification |
