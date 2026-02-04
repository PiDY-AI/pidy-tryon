# Pidy Try-On Widget Demo

This folder contains a demo implementation showing how to integrate the Pidy Virtual Try-On widget into an e-commerce product page, based on the [genses repository](https://github.com/vishnu-da/genses).

## Structure

```
demo/
├── components/
│   └── VirtualTryOnBot.tsx    # The widget component
├── data/
│   └── products.ts             # Sample product catalog
├── pages/
│   ├── DemoIndex.tsx           # Product listing page
│   └── ProductDetail.tsx       # Product detail with widget
└── README.md
```

## Features

### VirtualTryOnBot Component

The widget component includes:

- **Product Support Check**: Only shows for supported product IDs
- **SDK Integration**: Automatically triggers Pidy SDK scan
- **Auto-Click Gate**: Reduces friction by auto-clicking "Enter Suite" buttons
- **Style Enforcement**: Ensures proper visibility of SDK elements
- **Responsive Design**: 400x620px container with proper styling
- **User Controls**: Toggle button and close button

### Supported Products

11 products support virtual try-on:

**Men's Products (5):**
- OVO-STAN-VRS-2025-001 (Stanford Varsity Jacket)
- KITH-LAX-PKT-2025-002 (Essential Pocket Tee)
- KNIT-POLO-JNY-2025-003 (Knit Polo Sweater)
- W-LEG-DENIM-2025-004 (Wide Leg Denim)
- BTN-DWN-BRW-2025-005 (Button Down Oxford Shirt)

**Women's Products (6):**
- JCREW-STRIPE-DRS-2026-006 (J.Crew Striped Smocked Dress)
- AEO-LACE-CUL-2026-007 (AEO Lace Trim Culottes)
- NEXT-CP-BTN-2026-008 (Next Lemon Print Shirt)
- NEXT-CRM-SHRT-2026-009 (Next Braided Belt Shorts)
- SHEIN-RIB-TNK-2026-010 (SHEIN Ribbed Square Neck Tank)
- SWIM-FLOR-BKN-2026-011 (Floral Print Bikini Set)

## Usage

### View Demo

1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:8080/demo`
3. Click on any product to see the detail page
4. For supported products, click "Virtual Try-On" button

### Integration Example

```tsx
import { VirtualTryOnBot } from "@/demo/components/VirtualTryOnBot";

function ProductPage() {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  return (
    <div>
      {/* Size selector */}
      <SizeSelector onChange={setSelectedSize} />

      {/* Widget - only shows for supported products */}
      <VirtualTryOnBot
        productId="OVO-STAN-VRS-2025-001"
        size={selectedSize || undefined}
      />

      {/* Add to cart */}
      <Button>Add to Cart</Button>
    </div>
  );
}
```

## SDK Requirements

The widget expects the Pidy SDK to be loaded. Add this to your `index.html`:

```html
<script src="https://cdn.pidy.com/tryon-sdk.js"></script>
```

Or trigger the scan event manually:

```javascript
window.PidyTryOn.scan();
// or
window.dispatchEvent(new Event('pidy-tryon-scan'));
```

## How It Works

1. **Button Click**: User clicks "Virtual Try-On" button
2. **Container Opens**: 400x620px container appears
3. **SDK Trigger**: Component dispatches scan event after 100ms
4. **Auto-Gate Click**: If SDK shows "Enter Suite" gate, auto-clicks it
5. **Style Enforcement**: Continuously ensures proper visibility
6. **User Interaction**: User tries on products via SDK interface
7. **Close**: User clicks X button to close widget

## Technical Details

### Style Enforcement

The component uses multiple strategies to ensure SDK elements are visible:

- **Immediate Fix**: Applied on mount
- **Interval Polling**: Checks every 200ms
- **Mutation Observer**: Watches for DOM changes
- **Shadow DOM Support**: Works with SDK shadow roots

### Z-Index Management

- Close button: `z-index: 40`
- SDK iframe: `z-index: 30`
- SDK canvas/img/video: `z-index: 10`

This prevents SDK elements from covering the close button while ensuring the iframe is visible.

## Customization

### Change Widget Size

Modify the container dimensions in VirtualTryOnBot.tsx:

```tsx
style={{
  width: "500px",      // Change from 400px
  height: "720px",     // Change from 620px
  background: "#666",
}}
```

### Add More Products

Add product IDs to the `tryOnEnabledProducts` array:

```tsx
const tryOnEnabledProducts = [
  'OVO-STAN-VRS-2025-001',
  'YOUR-NEW-PRODUCT-ID',
  // ...
];
```

### Style the Button

Modify the button className in VirtualTryOnBot.tsx:

```tsx
className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3..."
```

## Source

This implementation is based on the [genses repository](https://github.com/vishnu-da/genses) which demonstrates production usage of the Pidy Try-On widget.
