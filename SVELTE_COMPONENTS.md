# Svelte Components Implementation

This document describes the Svelte components implementation for the Ticketping Chat Widget.

## Overview

We've implemented Svelte wrapper components that allow users to easily integrate the Ticketping Chat Widget into their Svelte applications. The components support both Svelte 4 and Svelte 5.

## File Structure

```
src/frameworks/
├── svelte/
│   ├── TicketpingChat5.svelte    # Svelte 5 component with runes
│   ├── index.js                  # Export for Svelte 5
│   └── index.d.ts               # TypeScript definitions for Svelte 5
└── svelte4/
    ├── TicketpingChat4.svelte   # Svelte 4 component
    ├── index.js                 # Export for Svelte 4
    └── index.d.ts              # TypeScript definitions for Svelte 4

dist/frameworks/                 # Built components (generated)
├── svelte/
│   ├── TicketpingChat5.svelte
│   ├── index.js
│   └── index.d.ts
└── svelte4/
    ├── TicketpingChat4.svelte
    ├── index.js
    └── index.d.ts
```

## Package Exports

The package.json includes these exports:

```json
{
  "exports": {
    "./svelte": {
      "types": "./dist/frameworks/svelte/index.d.ts",
      "svelte": "./dist/frameworks/svelte/index.js",
      "default": "./dist/frameworks/svelte/index.js"
    },
    "./svelte4": {
      "types": "./dist/frameworks/svelte4/index.d.ts",
      "svelte": "./dist/frameworks/svelte4/index.js",
      "default": "./dist/frameworks/svelte4/index.js"
    }
  },
  "peerDependencies": {
    "svelte": "^4.0.0 || ^5.0.0"
  }
}
```

## Usage

### Svelte 5
```javascript
import TicketpingChat from '@ticketping/chat-widget/svelte';
```

### Svelte 4
```javascript
import TicketpingChat from '@ticketping/chat-widget/svelte4';
```

## Key Features

1. **Version-specific implementations**: Separate components for Svelte 4 and Svelte 5
2. **TypeScript support**: Full TypeScript definitions for both versions
3. **Event handling**: 
   - Svelte 5: Function props (onready, onopen, etc.)
   - Svelte 4: Event dispatcher (on:ready, on:open, etc.)
4. **Reactive props**: All widget configuration is reactive
5. **Lifecycle management**: Proper initialization and cleanup
6. **SSR compatible**: Dynamic imports to avoid server-side issues
7. **Public methods**: Access to widget methods through component refs

## Build Process

The build process includes:

1. Main widget build with Vite
2. Custom script (`scripts/build-svelte.js`) that copies Svelte files to dist
3. TypeScript definition generation for frameworks

## Testing

A test file is available at `examples/svelte/test-components.html` to verify imports work correctly.

## Future Extensions

This structure is designed to be easily extended for other frameworks:

- `src/frameworks/react/` - React components
- `src/frameworks/vue/` - Vue components
- `src/frameworks/nextjs/` - Next.js specific components
- `src/frameworks/nuxt/` - Nuxt.js specific components

The build system and package exports can be extended to support these additional frameworks.
