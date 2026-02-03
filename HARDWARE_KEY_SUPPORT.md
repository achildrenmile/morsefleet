# Hardware Morse Key Support - Implementation Plan

**Document Version:** 1.0
**Date:** 2026-02-03
**Status:** Planning

---

## Overview

This document outlines the implementation plan for adding physical Morse key/paddle support to MorseFleet. The goal is to allow users to connect external Morse keys (straight keys and iambic paddles) to play the game, providing a more authentic CW training experience.

---

## Current Input Methods

| Method | Implementation | Supported Devices |
|--------|---------------|-------------------|
| **Spacebar** | `keydown`/`keyup` events on `Space` | PC, laptops |
| **Mouse click** | `mousedown`/`mouseup` on Morse key button | PC, laptops, tablets with mouse |
| **Touch** | `touchstart`/`touchend` on Morse key button | Tablets, phones |

---

## Hardware Connection Options Analysis

### Option 1: USB HID Keyboard Emulation (Recommended)

**How it works:** A microcontroller (Arduino, Pi Pico, Seeeduino XIAO) reads the key contacts and emulates USB keyboard keypresses.

**Browser Support:** **100%** - Works in ALL browsers on ALL platforms

| Aspect | Details |
|--------|---------|
| Compatibility | Universal (appears as standard keyboard) |
| Mobile Support | Works via USB-OTG adapters |
| Permissions | None required |
| Latency | Excellent (<5ms) |
| Cost | $5-50 depending on solution |

**Existing Projects:**
- [Pi Pico VBand Dongle](https://github.com/grahamwhaley/pico_vband)
- [The Gadget - Morse USB/HID Interface](https://hackaday.io/project/184702-morse-code-usbhid-interface-the-gadget)
- [PE1HVH Configurable Morse Interface](https://www.pe1hvh.nl/?cursus=configurable_morse_code_interface)

**VBand Standard Keys:**
- Left Ctrl = Dit (dot)
- Right Ctrl = Dah (dash)

---

### Option 2: Web Serial API

**How it works:** Browser reads directly from serial port (USB-to-serial adapter with key contacts)

| Browser | Support |
|---------|---------|
| Chrome 89+ | Yes |
| Edge 89+ | Yes |
| Opera 76+ | Yes |
| Firefox | No (marked WONTFIX) |
| Safari | No |
| Mobile browsers | No |

**Overall Support:** ~25% ([caniuse.com/web-serial](https://caniuse.com/web-serial))

**Pros:**
- Direct hardware access
- No microcontroller needed (simple USB-serial adapter)
- Low latency

**Cons:**
- Limited browser support
- Requires HTTPS
- No mobile support
- Requires user permission dialog

---

### Option 3: Web MIDI API

**How it works:** Morse key connected via MIDI interface

| Browser | Support |
|---------|---------|
| Chrome 43+ | Yes |
| Edge 79+ | Yes |
| Firefox 109+ | Yes |
| Safari | No |
| iOS Safari | No |

**Overall Support:** ~63% ([caniuse.com/midi](https://caniuse.com/midi))

**Pros:**
- Better support than Web Serial
- Established protocol

**Cons:**
- Requires MIDI-capable hardware
- No Safari/iOS support
- Overkill for simple on/off signaling

---

### Option 4: Gamepad API

**How it works:** Morse paddle wired to gamepad buttons or using Bluetooth gamepad

| Browser | Support |
|---------|---------|
| Chrome | Yes |
| Edge | Yes |
| Firefox | Yes |
| Safari | Yes |
| iOS Safari | Yes |
| Android | Yes |

**Overall Support:** ~95% ([MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API))

**Pros:**
- Excellent cross-platform support including mobile
- Could use existing game controllers
- Works on iOS (unique advantage)

**Cons:**
- Requires polling (not event-driven)
- Non-standard approach for Morse
- Slight latency (~16ms at 60fps polling)

---

## Device Compatibility Matrix

| Device | USB HID | Web Serial | Gamepad | Touch |
|--------|---------|------------|---------|-------|
| **Windows PC** | ✅ | ✅ Chrome/Edge | ✅ | - |
| **Mac** | ✅ | ✅ Chrome/Edge | ✅ | - |
| **Linux PC** | ✅ | ✅ Chrome | ✅ | - |
| **Chromebook** | ✅ | ✅ | ✅ | ✅ |
| **iPad (USB-C)** | ✅ | ❌ | ✅ | ✅ |
| **iPad (Lightning)** | ✅ adapter | ❌ | ✅ | ✅ |
| **iPhone** | ✅ adapter | ❌ | ✅ | ✅ |
| **Android Tablet** | ✅ USB-OTG | ❌ | ✅ | ✅ |
| **Android Phone** | ✅ USB-OTG | ❌ | ✅ | ✅ |

---

## Implementation Phases

### Phase 1: Enhanced Keyboard Support (Priority: HIGH)

**Goal:** Support USB HID adapters (VBand, The Gadget, etc.) that emulate keyboard keys.

**Scope:**
- Configurable key bindings
- Straight key mode (single key)
- Iambic paddle mode (two keys: dit + dah)
- Settings persistence (localStorage)

#### 1.1 Settings Data Structure

```javascript
const DEFAULT_KEY_SETTINGS = {
    inputMethod: 'keyboard',      // 'onscreen' | 'keyboard' | 'serial' | 'gamepad'
    keyType: 'straight',          // 'straight' | 'paddle'

    // Keyboard bindings (KeyboardEvent.code values)
    straightKey: 'Space',
    ditKey: 'ControlLeft',        // VBand standard
    dahKey: 'ControlRight',       // VBand standard

    // Iambic keyer settings (for paddle mode)
    iambicMode: 'B',              // 'A' | 'B' | 'straight'

    // Serial settings (Phase 2)
    serialBaudRate: 9600,

    // Gamepad settings (Phase 3)
    gamepadDitButton: 0,
    gamepadDahButton: 1
};
```

#### 1.2 Key Binding UI

```
┌─────────────────────────────────────────────────────┐
│ ⚙️ Morse Key Settings                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Input Method:                                       │
│   ○ On-screen button (mouse/touch)                 │
│   ● Keyboard / USB HID adapter                     │
│   ○ Serial port (Chrome/Edge only)                 │
│   ○ Gamepad / Controller                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Key Type:                                           │
│   ● Straight key (single contact)                  │
│   ○ Paddle (iambic, two contacts)                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Key Bindings:                                       │
│                                                     │
│   Straight key:  [ Space          ] [Rebind]       │
│                                                     │
│   ─── Paddle Mode (when selected) ───              │
│   Dit (dot):     [ ControlLeft    ] [Rebind]       │
│   Dah (dash):    [ ControlRight   ] [Rebind]       │
│                                                     │
│   [Reset to Defaults]                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ℹ️ Using VBand adapter? Select "Paddle" and use    │
│    default Left/Right Ctrl bindings.               │
└─────────────────────────────────────────────────────┘
```

#### 1.3 Implementation Tasks

| Task | Description | Complexity |
|------|-------------|------------|
| 1.3.1 | Create `KeySettings` class for managing input configuration | Medium |
| 1.3.2 | Add settings modal/panel UI with key binding controls | Medium |
| 1.3.3 | Implement key rebinding with "press any key" capture | Low |
| 1.3.4 | Modify `MorseInput` class to support configurable keys | Medium |
| 1.3.5 | Add paddle mode with separate dit/dah key handling | High |
| 1.3.6 | Implement iambic keyer logic (Mode A and B) | High |
| 1.3.7 | Persist settings to localStorage | Low |
| 1.3.8 | Add settings gear icon to UI | Low |
| 1.3.9 | Update translations (DE, EN, SL) | Low |

#### 1.4 Iambic Keyer Implementation

For paddle support, we need to implement an iambic keyer that automatically generates alternating dits and dahs when both paddles are pressed.

**Iambic Mode A:**
- When both paddles released, element in progress completes and stops

**Iambic Mode B:**
- When both paddles released, one additional element is sent

```javascript
class IambicKeyer {
    constructor(audio, timing, onElement) {
        this.audio = audio;
        this.timing = timing;
        this.onElement = onElement;  // Callback: (element) => void

        this.ditPressed = false;
        this.dahPressed = false;
        this.currentElement = null;  // 'dit' | 'dah' | null
        this.lastElement = null;
        this.elementTimer = null;
        this.mode = 'B';  // 'A' | 'B'
    }

    ditDown() { this.ditPressed = true; this.update(); }
    ditUp() { this.ditPressed = false; this.update(); }
    dahDown() { this.dahPressed = true; this.update(); }
    dahUp() { this.dahPressed = false; this.update(); }

    update() {
        if (this.currentElement) return;  // Element in progress

        if (this.ditPressed && this.dahPressed) {
            // Both pressed: alternate
            this.sendElement(this.lastElement === 'dit' ? 'dah' : 'dit');
        } else if (this.ditPressed) {
            this.sendElement('dit');
        } else if (this.dahPressed) {
            this.sendElement('dah');
        }
    }

    sendElement(element) {
        this.currentElement = element;
        this.lastElement = element;

        const duration = element === 'dit'
            ? this.timing.get().UNIT
            : this.timing.get().UNIT * 3;

        this.audio.startTone();
        this.onElement(element === 'dit' ? '.' : '-');

        this.elementTimer = setTimeout(() => {
            this.audio.stopTone();
            this.currentElement = null;

            // Inter-element gap
            setTimeout(() => this.update(), this.timing.get().UNIT);
        }, duration);
    }

    stop() {
        clearTimeout(this.elementTimer);
        this.audio.stopTone();
        this.currentElement = null;
    }
}
```

---

### Phase 2: Web Serial API Support (Priority: MEDIUM)

**Goal:** Direct serial connection for Chrome/Edge users with USB-serial adapters.

**Scope:**
- Feature detection for Web Serial API
- Connection UI with device picker
- Simple protocol: DTR/RTS or character-based signaling
- Graceful fallback when unsupported

#### 2.1 Implementation Tasks

| Task | Description | Complexity |
|------|-------------|------------|
| 2.1.1 | Add feature detection for `navigator.serial` | Low |
| 2.1.2 | Create "Connect Serial Device" button (shown only when supported) | Low |
| 2.1.3 | Implement serial port connection with permission request | Medium |
| 2.1.4 | Define serial protocol (baud rate, signal interpretation) | Low |
| 2.1.5 | Read serial data and map to keyDown/keyUp events | Medium |
| 2.1.6 | Handle disconnection and reconnection | Medium |
| 2.1.7 | Add connection status indicator | Low |

#### 2.2 Serial Protocol Options

**Option A: Character-based (Simple)**
```
Key down: Send 'D' (0x44)
Key up:   Send 'U' (0x55)

For paddle:
Dit down: Send '.' (0x2E)
Dit up:   Send ',' (0x2C)
Dah down: Send '-' (0x2D)
Dah up:   Send '_' (0x5F)
```

**Option B: Binary state (Efficient)**
```
Byte format: 0b000000DH
  D = Dit state (1=pressed, 0=released)
  H = Dah state (1=pressed, 0=released)
```

#### 2.3 Sample Implementation

```javascript
class SerialKeyInput {
    constructor(onDit, onDah) {
        this.port = null;
        this.reader = null;
        this.onDit = onDit;  // {down: fn, up: fn}
        this.onDah = onDah;
    }

    async connect() {
        if (!('serial' in navigator)) {
            throw new Error('Web Serial API not supported');
        }

        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: 9600 });

        this.readLoop();
    }

    async readLoop() {
        const reader = this.port.readable.getReader();

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                for (const byte of value) {
                    this.handleByte(byte);
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    handleByte(byte) {
        // Binary protocol
        const ditState = (byte & 0x02) !== 0;
        const dahState = (byte & 0x01) !== 0;

        // Trigger appropriate callbacks
        // (with state tracking to detect changes)
    }

    async disconnect() {
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
    }
}
```

---

### Phase 3: Gamepad API Support (Priority: LOW)

**Goal:** Support Bluetooth gamepads, especially for mobile devices where USB HID may be inconvenient.

**Scope:**
- Gamepad detection and connection
- Button mapping configuration
- Polling loop for button states
- Works on iOS Safari (unique advantage)

#### 3.1 Implementation Tasks

| Task | Description | Complexity |
|------|-------------|------------|
| 3.1.1 | Implement gamepad detection (`gamepadconnected` event) | Low |
| 3.1.2 | Create polling loop using `requestAnimationFrame` | Medium |
| 3.1.3 | Add button mapping UI | Low |
| 3.1.4 | Map button presses to dit/dah events | Medium |
| 3.1.5 | Handle gamepad disconnection | Low |
| 3.1.6 | Test on iOS Safari with MFi controllers | Medium |

#### 3.2 Sample Implementation

```javascript
class GamepadKeyInput {
    constructor(onDit, onDah) {
        this.onDit = onDit;
        this.onDah = onDah;
        this.gamepadIndex = null;
        this.ditButton = 0;  // Usually "A" button
        this.dahButton = 1;  // Usually "B" button
        this.lastDitState = false;
        this.lastDahState = false;
        this.polling = false;
    }

    init() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            this.gamepadIndex = e.gamepad.index;
            this.startPolling();
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (e.gamepad.index === this.gamepadIndex) {
                this.gamepadIndex = null;
                this.stopPolling();
            }
        });
    }

    startPolling() {
        this.polling = true;
        this.poll();
    }

    stopPolling() {
        this.polling = false;
    }

    poll() {
        if (!this.polling) return;

        const gamepads = navigator.getGamepads();
        const gp = gamepads[this.gamepadIndex];

        if (gp) {
            const ditState = gp.buttons[this.ditButton]?.pressed || false;
            const dahState = gp.buttons[this.dahButton]?.pressed || false;

            // Detect state changes
            if (ditState !== this.lastDitState) {
                ditState ? this.onDit.down() : this.onDit.up();
                this.lastDitState = ditState;
            }

            if (dahState !== this.lastDahState) {
                dahState ? this.onDah.down() : this.onDah.up();
                this.lastDahState = dahState;
            }
        }

        requestAnimationFrame(() => this.poll());
    }
}
```

---

## Hardware Recommendations for Users

### Budget DIY Option ($5-15)

**Components:**
- Raspberry Pi Pico ($4)
- 3.5mm stereo jack ($1)
- USB cable ($2)
- Firmware: [pico_vband](https://github.com/grahamwhaley/pico_vband)

**Wiring:**
```
3.5mm Jack          Pi Pico
─────────           ───────
Tip (Dit)    ───→   GPIO 2
Ring (Dah)   ───→   GPIO 3
Sleeve (GND) ───→   GND
```

### Ready-Made Options ($30-60)

1. **VBand USB Paddle Interface** - Ham Radio Solutions
   - Plug-and-play
   - Works with standard paddles
   - Emulates Left/Right Ctrl keys

2. **K3NG Keyer** - Various vendors
   - Full-featured CW keyer
   - USB HID output option
   - Supports paddles and straight keys

### Advanced DIY Option ($10-20)

**Seeeduino XIAO SAMD21:**
- Tiny form factor
- USB-C
- Native USB HID support
- Firmware: [The Gadget](https://hackaday.io/project/184702-morse-code-usbhid-interface-the-gadget)

---

## Testing Plan

### Phase 1 Testing

| Test Case | Device | Expected Result |
|-----------|--------|-----------------|
| Space bar input | PC | Works as before |
| VBand adapter (paddle) | PC | L-Ctrl=dit, R-Ctrl=dah |
| VBand adapter | Mac | Same as PC |
| USB HID adapter | iPad (USB-C) | Works with native USB |
| USB HID adapter | Android | Works with USB-OTG |
| Custom key binding | All | User can rebind keys |
| Settings persistence | All | Settings saved across sessions |

### Phase 2 Testing

| Test Case | Device | Browser | Expected Result |
|-----------|--------|---------|-----------------|
| Serial connect | PC | Chrome | Device picker shown |
| Serial connect | PC | Firefox | Button hidden/disabled |
| Serial input | PC | Chrome | Key events triggered |
| Serial disconnect | PC | Chrome | Graceful fallback |

### Phase 3 Testing

| Test Case | Device | Expected Result |
|-----------|--------|-----------------|
| Xbox controller | PC | Buttons detected |
| PS4 controller | PC | Buttons detected |
| MFi controller | iPad | Buttons detected |
| 8BitDo controller | Android | Buttons detected |

---

## Migration Notes

### Backwards Compatibility

- Default settings match current behavior (Space bar)
- No breaking changes to existing functionality
- Settings UI is optional (game works without configuration)

### localStorage Keys

```javascript
// New keys to be added
'morsefleet-input-method'    // 'onscreen' | 'keyboard' | 'serial' | 'gamepad'
'morsefleet-key-type'        // 'straight' | 'paddle'
'morsefleet-straight-key'    // KeyboardEvent.code value
'morsefleet-dit-key'         // KeyboardEvent.code value
'morsefleet-dah-key'         // KeyboardEvent.code value
'morsefleet-iambic-mode'     // 'A' | 'B'
```

---

## References

### Web APIs
- [Web Serial API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Web Serial API - Can I Use](https://caniuse.com/web-serial)
- [Web MIDI API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Web MIDI API - Can I Use](https://caniuse.com/midi)
- [Gamepad API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)

### Hardware Projects
- [Pi Pico VBand Dongle](https://github.com/grahamwhaley/pico_vband)
- [The Gadget - Morse USB/HID Interface](https://hackaday.io/project/184702-morse-code-usbhid-interface-the-gadget)
- [PE1HVH Configurable Morse Interface](https://www.pe1hvh.nl/?cursus=configurable_morse_code_interface)
- [Morse HID Keyboard Project](https://ke0ff.github.io/musb/index.html)
- [Morse Code World Keyer](https://morsecode.world/international/keyer.html)

### CW Keyer Theory
- [Iambic Keying Explained](https://www.qsl.net/w/w9cf/iambic.html)
- [K3NG Arduino CW Keyer](https://github.com/k3ng/k3ng_cw_keyer)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-03 | Initial planning document |
