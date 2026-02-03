# Hardware Morse Key Support - Implementation Plan

**Document Version:** 2.1
**Date:** 2026-02-03
**Status:** Phase 1 Complete, Phase 2-3 Planned

---

## Overview

This document outlines the implementation plan for adding physical Morse key/paddle support to MorseFleet. The goal is to allow users to connect external Morse keys (straight keys and iambic paddles) to play the game, providing a more authentic CW training experience compatible with real ham radio equipment.

---

## Table of Contents

1. [Current Input Methods](#current-input-methods)
2. [Key Types and Keyer Modes](#key-types-and-keyer-modes)
3. [Hardware Connection Options](#hardware-connection-options-analysis)
4. [Standard Wiring and Connectors](#standard-wiring-and-connectors)
5. [Website Compatibility Modes](#website-compatibility-modes)
6. [Device Compatibility Matrix](#device-compatibility-matrix)
7. [Implementation Phases](#implementation-phases)
8. [Hardware Build Guides](#hardware-build-guides)
9. [Compatible Commercial Products](#compatible-commercial-products)
10. [Testing Plan](#testing-plan)
11. [References](#references)

---

## Current Input Methods

| Method | Implementation | Supported Devices |
|--------|---------------|-------------------|
| **Spacebar** | `keydown`/`keyup` events on `Space` | PC, laptops |
| **Mouse click** | `mousedown`/`mouseup` on Morse key button | PC, laptops, tablets with mouse |
| **Touch** | `touchstart`/`touchend` on Morse key button | Tablets, phones |

---

## Key Types and Keyer Modes

Understanding the different types of Morse keys used in ham radio is essential for proper implementation.

### Straight Key

The most basic type of CW key with a single set of contacts. The operator manually times both dits and dahs by holding the key down for different durations.

```
┌─────────────────────────────┐
│     STRAIGHT KEY            │
│                             │
│    ┌───┐                    │
│    │   │ ← Single lever     │
│    │   │                    │
│ ───┴───┴───                 │
│   Single contact            │
│                             │
│ • Manual timing of all      │
│   elements                  │
│ • Most authentic "fist"     │
│ • Requires practice         │
└─────────────────────────────┘
```

**In MorseFleet:** Current implementation - user controls timing of dits and dahs manually.

### Semi-Automatic "Bug" Key

A mechanical key that automatically generates dits at a consistent speed when moved one direction, but requires manual timing of dahs.

```
┌─────────────────────────────┐
│     BUG (Semi-Automatic)    │
│                             │
│    ←DIT  ┌───┐  DAH→        │
│    (auto)│   │  (manual)    │
│          └───┘              │
│                             │
│ • Dits: automatic, timed    │
│ • Dahs: manual timing       │
│ • Distinctive "swing"       │
└─────────────────────────────┘
```

**In MorseFleet:** Can be emulated - auto-repeat dits, manual dahs.

### Single-Lever Paddle

Has two contacts but a single lever - only one contact can be closed at a time. Used with an electronic keyer.

```
┌─────────────────────────────┐
│   SINGLE-LEVER PADDLE       │
│                             │
│    DIT ←┌───┐→ DAH          │
│         │   │               │
│         └───┘               │
│      Single lever           │
│      Two contacts           │
│                             │
│ • Cannot squeeze both       │
│ • 73 strokes for alphabet   │
└─────────────────────────────┘
```

### Dual-Lever (Iambic) Paddle

Two independent levers that can be pressed simultaneously. When both are pressed ("squeezed"), the keyer alternates between dits and dahs automatically.

```
┌─────────────────────────────┐
│   DUAL-LEVER (IAMBIC)       │
│                             │
│   DIT    DAH                │
│    ↓      ↓                 │
│  ┌───┐  ┌───┐               │
│  │   │  │   │               │
│  └───┘  └───┘               │
│   Two independent levers    │
│                             │
│ • Can squeeze both          │
│ • 65 strokes for alphabet   │
│ • 11% more efficient        │
└─────────────────────────────┘
```

### Iambic Mode A vs Mode B

| Mode | Behavior on Release | Common Usage |
|------|---------------------|--------------|
| **Iambic A** | Finishes current element, then stops | Traditional, predictable |
| **Iambic B** | Finishes current element + sends one more | Faster for some letters |
| **Ultimatic** | Last paddle pressed takes priority | Alternative preference |

**Example - Sending "C" (-.-.):**

```
Iambic A: Squeeze both paddles, release → sends "-.-" then stops
          Must press dit again for final "."

Iambic B: Squeeze both paddles, release → sends "-.-." automatically
          The "extra" element completes the character
```

### Efficiency Comparison

| Key Type | Strokes for Full Alphabet + Digits |
|----------|-----------------------------------|
| Straight key | 132 |
| Semi-automatic bug | 100 |
| Single-lever paddle | 73 |
| Iambic dual-lever paddle | 65 |

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
- [Pi Pico VBand Dongle](https://github.com/grahamwhaley/pico_vband) - Multi-mode, well documented
- [The Gadget - Morse USB/HID Interface](https://hackaday.io/project/184702-morse-code-usbhid-interface-the-gadget) - Seeeduino XIAO based
- [PE1HVH Configurable Morse Interface](https://www.pe1hvh.nl/?cursus=configurable_morse_code_interface) - Configurable via WebUSB
- [CWKeyboard](https://github.com/kevintechie/CWKeyboard) - Simple Arduino implementation
- [MorsePaddle2USB](https://github.com/mgiugliano/MorsePaddle2USB) - Detailed schematics

---

### Option 2: Web Serial API

**How it works:** Browser reads directly from serial port (USB-to-serial adapter or microcontroller in serial mode)

| Browser | Support |
|---------|---------|
| Chrome 89+ | ✅ Yes |
| Edge 89+ | ✅ Yes |
| Opera 76+ | ✅ Yes |
| Firefox | ❌ No (marked WONTFIX) |
| Safari | ❌ No |
| Mobile browsers | ❌ No |

**Overall Support:** ~25% ([caniuse.com/web-serial](https://caniuse.com/web-serial))

**Use Case:** Direct connection to devices like [Morserino-32](https://www.morserino.info/) that communicate via USB serial.

**Morserino-32 Protocol:**
- Sends characters via USB serial interface
- Can be configured to send keying events
- Chrome/Edge only for browser-based apps
- Full configuration available via [Morse Trainer Pro](https://morsetrainerpro.com/morserino-config.html)

---

### Option 3: Web MIDI API

**How it works:** Morse key connected via MIDI interface (Teensy with MIDI, K3NG keyer with MIDI output)

| Browser | Support |
|---------|---------|
| Chrome 43+ | ✅ Yes |
| Edge 79+ | ✅ Yes |
| Firefox 109+ | ✅ Yes |
| Safari | ❌ No |
| iOS Safari | ❌ No |

**Overall Support:** ~63% ([caniuse.com/midi](https://caniuse.com/midi))

**Existing Projects:**
- [TeensyWinkeyEmulator](https://github.com/dl1ycf/TeensyWinkeyEmulator) - WinKeyer emulator with MIDI output
- [K3NG Keyer MIDI](https://github.com/DL3LSM/k3ng_cw_keyer_midi_teensy) - K3NG keyer with MIDI keying

---

### Option 4: Gamepad API

**How it works:** Morse paddle wired to gamepad buttons or using Bluetooth gamepad

| Browser | Support |
|---------|---------|
| Chrome | ✅ Yes |
| Edge | ✅ Yes |
| Firefox | ✅ Yes |
| Safari | ✅ Yes |
| iOS Safari | ✅ Yes |
| Android | ✅ Yes |

**Overall Support:** ~95% ([MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API))

**Unique Advantage:** Only option that works on iOS Safari!

---

### Option 5: WinKeyer Protocol (via Web Serial)

**How it works:** Communication with K1EL WinKeyer or compatible devices using the WinKeyer serial protocol.

**WinKeyer Features:**
- Perfect timing at speeds up to 99 WPM
- Iambic A, B, Ultimatic, and Bug modes
- Optical isolation between PC and radio
- Standalone operation capability
- Widely supported by logging software (N1MM, Log4OM, Logger32)

**Protocol Details:**
- Serial communication (COM port or USB-serial)
- Single-byte commands with parameter bytes
- Supports real-time keying data readback
- [Full protocol specification](https://k1el.tripod.com/files/Winkey10.pdf)

**Implementation Consideration:** Could read paddle state directly from WinKeyer-compatible devices.

---

## Standard Wiring and Connectors

### 3.5mm TRS (Stereo) Jack - Ham Radio Standard

Most CW paddles and keyers use a 3.5mm stereo (TRS) connector with this standard wiring:

```
        3.5mm TRS Jack
        ┌─────────────┐
        │             │
   ─────┤ Tip         │──── Dit (dots)
        │             │
   ─────┤ Ring        │──── Dah (dashes)
        │             │
   ─────┤ Sleeve      │──── Ground (common)
        │             │
        └─────────────┘

Cross-section view:
         ┌───┬───┬─────────┐
         │TIP│RNG│ SLEEVE  │
         │ . │ - │   GND   │
         └───┴───┴─────────┘
```

### Alternative: 6.35mm (1/4") TRS Jack

Some older equipment uses the larger 1/4" jack with the same wiring convention. Adapters are readily available.

### Straight Key Wiring

Straight keys only need two connections (Tip + Sleeve or Ring + Sleeve):

```
Straight Key
┌─────────────┐
│    ┌───┐    │
│    │   │    │────── Tip (or Ring)
│    └─┬─┘    │
│      │      │────── Sleeve (Ground)
└──────┴──────┘
```

---

## Website Compatibility Modes

Different CW practice websites expect different keyboard inputs. The Pi Pico VBand dongle demonstrates this with 4 selectable modes:

| Mode | Dit Key | Dah Key | Compatible Websites |
|------|---------|---------|---------------------|
| **1** | `[` | `]` | VBand, Vail |
| **2** | `x` | `z` | Vail alternate |
| **3** | `e` | `i` | morsecode.me |
| **4** | `Ctrl-L` | `Ctrl-R` | VBand, Vail, **MorseFleet** |

**Mode 4 Advantage:** Control keys work even when browser window doesn't have focus.

### MorseFleet Implementation

We will support **all four modes** plus custom key binding:

```javascript
const PRESET_KEY_MODES = {
    'vband':      { dit: 'BracketLeft',  dah: 'BracketRight' },  // [ ]
    'vail-alt':   { dit: 'KeyX',         dah: 'KeyZ' },          // x z
    'morsecode':  { dit: 'KeyE',         dah: 'KeyI' },          // e i
    'vband-ctrl': { dit: 'ControlLeft',  dah: 'ControlRight' },  // Ctrl
    'custom':     { dit: null,           dah: null }             // User defined
};
```

---

## Device Compatibility Matrix

| Device | USB HID | Web Serial | Web MIDI | Gamepad | Touch |
|--------|---------|------------|----------|---------|-------|
| **Windows PC** | ✅ | ✅ Chrome/Edge | ✅ Chrome/Edge/FF | ✅ | - |
| **Mac** | ✅ | ✅ Chrome/Edge | ✅ Chrome/Edge/FF | ✅ | - |
| **Linux PC** | ✅ | ✅ Chrome | ✅ Chrome/FF | ✅ | - |
| **Chromebook** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **iPad (USB-C)** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **iPad (Lightning)** | ✅ adapter | ❌ | ❌ | ✅ | ✅ |
| **iPhone** | ✅ adapter | ❌ | ❌ | ✅ | ✅ |
| **Android Tablet** | ✅ USB-OTG | ❌ | ❌ | ✅ | ✅ |
| **Android Phone** | ✅ USB-OTG | ❌ | ❌ | ✅ | ✅ |

---

## Implementation Phases

### Phase 1: Enhanced Keyboard Support (Priority: HIGH) ✅ COMPLETED

**Goal:** Support USB HID adapters (VBand, The Gadget, etc.) that emulate keyboard keys.

**Status:** ✅ Implemented and deployed (2026-02-03)

**Implemented Features:**
- ✅ Configurable key bindings with presets (Space, VBand/Pi Pico, morsecode.me, custom)
- ✅ Straight key mode (single key, manual timing)
- ✅ Iambic paddle mode (two keys: dit + dah)
- ✅ Iambic keyer with Mode A, B, and Ultimatic support
- ✅ Bug (semi-automatic) mode with auto-repeat dits
- ✅ Settings persistence (localStorage)
- ✅ Settings modal UI with gear icon in status bar
- ✅ Keyer speed control (10-30 WPM, separate from game speed)
- ✅ Paddle swap option for left-handed operators
- ✅ Full translations (German, English, Slovenian)

**How to Use:**
1. Click the ⚙️ gear icon in the status bar (next to language selector)
2. Select your input method (Keyboard/USB HID)
3. Choose a key preset:
   - **Space**: Default spacebar for straight key
   - **VBand/Pi Pico**: Left Ctrl = dit, Right Ctrl = dah
   - **morsecode.me**: E = dit, I = dah
   - **Custom**: Define your own keys
4. Select keyer mode:
   - **Straight Key**: Manual timing of all elements
   - **Bug**: Auto-repeat dits, manual dahs
   - **Iambic A**: Alternating, stops immediately on release
   - **Iambic B**: Alternating, completes one more element on release
   - **Ultimatic**: Last paddle pressed takes priority
5. Adjust keyer speed if using Bug or Iambic modes

**Compatible Hardware:**
- Pi Pico with pico_vband firmware (recommended DIY, ~$5)
- VBand USB Interface (~$25)
- The Gadget (Seeeduino XIAO, ~$10)
- Any USB HID keyboard emulator

#### 1.1 Settings Data Structure

```javascript
const DEFAULT_KEY_SETTINGS = {
    // Input source
    inputMethod: 'keyboard',      // 'onscreen' | 'keyboard' | 'serial' | 'gamepad'

    // Key/Keyer type
    keyerMode: 'straight',        // 'straight' | 'bug' | 'iambic-a' | 'iambic-b' | 'ultimatic'

    // Keyboard bindings (KeyboardEvent.code values)
    keyPreset: 'vband-ctrl',      // Preset name or 'custom'
    straightKey: 'Space',         // For straight key mode
    ditKey: 'ControlLeft',        // VBand standard
    dahKey: 'ControlRight',       // VBand standard

    // Keyer timing (for iambic/bug modes)
    keyerWpm: 15,                 // Speed for automatic elements
    ditDahRatio: 3.0,             // Dah = 3x dit (standard)
    weight: 50,                   // Element weight percentage

    // Serial settings (Phase 2)
    serialBaudRate: 115200,
    serialProtocol: 'morserino',  // 'morserino' | 'winkeyer' | 'simple'

    // Gamepad settings (Phase 3)
    gamepadIndex: 0,
    gamepadDitButton: 0,
    gamepadDahButton: 1
};
```

#### 1.2 Key Binding UI

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ Morse Key Settings                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Input Method:                                                   │
│   ○ On-screen button (mouse/touch)                             │
│   ● Keyboard / USB HID adapter                                 │
│   ○ Serial port (Chrome/Edge only)                             │
│   ○ Gamepad / Controller                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Keyer Mode:                                                     │
│   ● Straight key      - Manual timing of all elements          │
│   ○ Bug (semi-auto)   - Auto dits, manual dahs                 │
│   ○ Iambic A          - Alternating, stops on release          │
│   ○ Iambic B          - Alternating, +1 element on release     │
│   ○ Ultimatic         - Last paddle pressed wins               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Key Preset:           [ VBand/Vail (Ctrl keys)    ▼]           │
│                                                                 │
│   ─── Current Bindings ───                                     │
│   Dit (dot):     [ ControlLeft    ] [Rebind]                   │
│   Dah (dash):    [ ControlRight   ] [Rebind]                   │
│                                                                 │
│   [Reset to Defaults]                                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Keyer Speed:     [15] WPM  (for Iambic/Bug modes)              │
│                  ─────●───────────                              │
│                  5         25                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ℹ️ Using a USB adapter like VBand or Pi Pico dongle?            │
│    Select "VBand/Vail (Ctrl keys)" preset.                     │
│                                                                 │
│ ℹ️ Compatible adapters:                                         │
│    • VBand USB Interface ($25)                                 │
│    • Pi Pico + pico_vband firmware (DIY ~$5)                   │
│    • The Gadget - Seeeduino XIAO (DIY ~$10)                    │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.3 Implementation Tasks

| Task | Description | Complexity |
|------|-------------|------------|
| 1.3.1 | Create `KeySettings` class for managing input configuration | Medium |
| 1.3.2 | Add key preset selector (VBand, morsecode.me, custom) | Low |
| 1.3.3 | Add settings modal/panel UI with key binding controls | Medium |
| 1.3.4 | Implement key rebinding with "press any key" capture | Low |
| 1.3.5 | Modify `MorseInput` class to support configurable keys | Medium |
| 1.3.6 | Add paddle mode with separate dit/dah key handling | High |
| 1.3.7 | Implement `IambicKeyer` class (Mode A, B, Ultimatic) | High |
| 1.3.8 | Implement `BugKeyer` class (auto-dits, manual dahs) | Medium |
| 1.3.9 | Add keyer speed control (separate from game WPM) | Low |
| 1.3.10 | Persist settings to localStorage | Low |
| 1.3.11 | Add settings gear icon to UI | Low |
| 1.3.12 | Update translations (DE, EN, SL) | Low |

#### 1.4 Iambic Keyer Implementation

```javascript
class IambicKeyer {
    constructor(options) {
        this.audio = options.audio;
        this.onElement = options.onElement;     // Callback: (element) => void
        this.getWpm = options.getWpm;           // Function returning current WPM

        this.ditPressed = false;
        this.dahPressed = false;
        this.currentElement = null;             // 'dit' | 'dah' | null
        this.lastElement = null;
        this.elementTimer = null;
        this.mode = 'B';                        // 'A' | 'B' | 'ultimatic'
        this.keyMemory = null;                  // For iambic B mode
    }

    getUnitTime() {
        return Math.round(1200 / this.getWpm());
    }

    ditDown() {
        this.ditPressed = true;
        if (this.mode === 'ultimatic') {
            this.keyMemory = 'dit';
        }
        this.update();
    }

    ditUp() {
        this.ditPressed = false;
        if (this.mode === 'B' && this.currentElement === 'dah') {
            this.keyMemory = 'dit';  // Remember for extra element
        }
        this.update();
    }

    dahDown() {
        this.dahPressed = true;
        if (this.mode === 'ultimatic') {
            this.keyMemory = 'dah';
        }
        this.update();
    }

    dahUp() {
        this.dahPressed = false;
        if (this.mode === 'B' && this.currentElement === 'dit') {
            this.keyMemory = 'dah';  // Remember for extra element
        }
        this.update();
    }

    update() {
        if (this.currentElement) return;  // Element in progress

        let nextElement = null;

        if (this.mode === 'ultimatic') {
            // Last key pressed wins
            if (this.keyMemory) {
                nextElement = this.keyMemory;
            } else if (this.ditPressed) {
                nextElement = 'dit';
            } else if (this.dahPressed) {
                nextElement = 'dah';
            }
        } else {
            // Iambic A/B
            if (this.ditPressed && this.dahPressed) {
                // Both pressed: alternate
                nextElement = this.lastElement === 'dit' ? 'dah' : 'dit';
            } else if (this.ditPressed) {
                nextElement = 'dit';
            } else if (this.dahPressed) {
                nextElement = 'dah';
            } else if (this.mode === 'B' && this.keyMemory) {
                // Mode B: send one more element after release
                nextElement = this.keyMemory;
                this.keyMemory = null;
            }
        }

        if (nextElement) {
            this.sendElement(nextElement);
        }
    }

    sendElement(element) {
        this.currentElement = element;
        this.lastElement = element;

        const unit = this.getUnitTime();
        const duration = element === 'dit' ? unit : unit * 3;

        this.audio.startTone();
        this.onElement(element === 'dit' ? '.' : '-');

        this.elementTimer = setTimeout(() => {
            this.audio.stopTone();
            this.currentElement = null;

            // Inter-element gap (1 unit)
            setTimeout(() => this.update(), unit);
        }, duration);
    }

    stop() {
        clearTimeout(this.elementTimer);
        this.audio.stopTone();
        this.currentElement = null;
        this.keyMemory = null;
    }
}
```

#### 1.5 Bug Keyer Implementation

```javascript
class BugKeyer {
    constructor(options) {
        this.audio = options.audio;
        this.onElement = options.onElement;
        this.getWpm = options.getWpm;

        this.ditPressed = false;
        this.dahPressed = false;
        this.dahStartTime = null;
        this.ditTimer = null;
        this.isPlayingDit = false;
    }

    getUnitTime() {
        return Math.round(1200 / this.getWpm());
    }

    ditDown() {
        this.ditPressed = true;
        if (!this.dahPressed) {
            this.startDitStream();
        }
    }

    ditUp() {
        this.ditPressed = false;
        this.stopDitStream();
    }

    dahDown() {
        this.dahPressed = true;
        this.dahStartTime = Date.now();
        this.stopDitStream();
        this.audio.startTone();
    }

    dahUp() {
        this.dahPressed = false;
        this.audio.stopTone();

        // Manual dah timing - calculate what was sent
        const duration = Date.now() - this.dahStartTime;
        const unit = this.getUnitTime();

        // Determine if it was a dah (>= 2 units) or accidental short press
        if (duration >= unit * 2) {
            this.onElement('-');
        }

        // Resume dit stream if dit still pressed
        if (this.ditPressed) {
            setTimeout(() => this.startDitStream(), this.getUnitTime());
        }
    }

    startDitStream() {
        if (this.isPlayingDit || this.dahPressed) return;

        this.isPlayingDit = true;
        this.playDit();
    }

    playDit() {
        if (!this.ditPressed || this.dahPressed) {
            this.isPlayingDit = false;
            return;
        }

        const unit = this.getUnitTime();

        this.audio.startTone();
        this.onElement('.');

        setTimeout(() => {
            this.audio.stopTone();
            // Inter-element gap, then next dit
            setTimeout(() => this.playDit(), unit);
        }, unit);
    }

    stopDitStream() {
        this.isPlayingDit = false;
    }

    stop() {
        this.ditPressed = false;
        this.dahPressed = false;
        this.stopDitStream();
        this.audio.stopTone();
    }
}
```

---

### Phase 2: Web Serial API Support (Priority: MEDIUM)

**Goal:** Direct serial connection for Chrome/Edge users with Morserino-32 or custom serial interfaces.

**Scope:**
- Feature detection for Web Serial API
- Connection UI with device picker
- Morserino-32 protocol support
- Simple binary protocol for DIY interfaces
- Graceful fallback when unsupported

#### 2.1 Implementation Tasks

| Task | Description | Complexity |
|------|-------------|------------|
| 2.1.1 | Add feature detection for `navigator.serial` | Low |
| 2.1.2 | Create "Connect Serial Device" button (shown only when supported) | Low |
| 2.1.3 | Implement serial port connection with permission request | Medium |
| 2.1.4 | Implement Morserino-32 protocol handler | Medium |
| 2.1.5 | Implement simple binary protocol for DIY devices | Low |
| 2.1.6 | Handle disconnection and reconnection | Medium |
| 2.1.7 | Add connection status indicator | Low |

#### 2.2 Serial Protocol Options

**Option A: Simple Binary Protocol (for DIY devices)**

```
Byte format: 0b000000DH
  D = Dit paddle state (1=pressed, 0=released)
  H = Dah paddle state (1=pressed, 0=released)

Examples:
  0x00 = Both released
  0x01 = Dah pressed only
  0x02 = Dit pressed only
  0x03 = Both pressed (squeeze)
```

**Option B: Morserino-32 Protocol**

The Morserino-32 can send keying events via USB serial. Configuration required:
- Enable "Serial Output" in Morserino settings
- Set output format to keying events

**Option C: WinKeyer Protocol**

For advanced users with K1EL WinKeyer or compatible devices. Provides:
- Real-time paddle state reporting
- Speed pot readback
- Sidetone control

#### 2.3 Sample Serial Implementation

```javascript
class SerialKeyInput {
    constructor(options) {
        this.onDitChange = options.onDitChange;  // (pressed: boolean) => void
        this.onDahChange = options.onDahChange;
        this.onStatusChange = options.onStatusChange;
        this.port = null;
        this.reader = null;
        this.lastDitState = false;
        this.lastDahState = false;
    }

    static isSupported() {
        return 'serial' in navigator;
    }

    async connect() {
        if (!SerialKeyInput.isSupported()) {
            throw new Error('Web Serial API not supported');
        }

        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: 115200 });

        this.onStatusChange?.('connected');
        this.readLoop();
    }

    async readLoop() {
        const reader = this.port.readable.getReader();
        this.reader = reader;

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                for (const byte of value) {
                    this.handleByte(byte);
                }
            }
        } catch (error) {
            console.error('Serial read error:', error);
        } finally {
            reader.releaseLock();
            this.onStatusChange?.('disconnected');
        }
    }

    handleByte(byte) {
        const ditState = (byte & 0x02) !== 0;
        const dahState = (byte & 0x01) !== 0;

        if (ditState !== this.lastDitState) {
            this.onDitChange?.(ditState);
            this.lastDitState = ditState;
        }

        if (dahState !== this.lastDahState) {
            this.onDahChange?.(dahState);
            this.lastDahState = dahState;
        }
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
            this.reader = null;
        }
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
        this.onStatusChange?.('disconnected');
    }
}
```

---

### Phase 3: Gamepad API Support (Priority: LOW)

**Goal:** Support Bluetooth gamepads, especially for mobile devices where USB HID may be inconvenient.

**Unique Value:** Only method that works on iOS Safari!

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
    constructor(options) {
        this.onDitChange = options.onDitChange;
        this.onDahChange = options.onDahChange;
        this.onStatusChange = options.onStatusChange;
        this.gamepadIndex = null;
        this.ditButton = 0;      // A button
        this.dahButton = 1;      // B button
        this.lastDitState = false;
        this.lastDahState = false;
        this.polling = false;
    }

    init() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            this.gamepadIndex = e.gamepad.index;
            this.onStatusChange?.('connected', e.gamepad.id);
            this.startPolling();
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (e.gamepad.index === this.gamepadIndex) {
                this.gamepadIndex = null;
                this.onStatusChange?.('disconnected');
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
        if (!this.polling || this.gamepadIndex === null) return;

        const gamepads = navigator.getGamepads();
        const gp = gamepads[this.gamepadIndex];

        if (gp) {
            const ditState = gp.buttons[this.ditButton]?.pressed || false;
            const dahState = gp.buttons[this.dahButton]?.pressed || false;

            if (ditState !== this.lastDitState) {
                this.onDitChange?.(ditState);
                this.lastDitState = ditState;
            }

            if (dahState !== this.lastDahState) {
                this.onDahChange?.(dahState);
                this.lastDahState = dahState;
            }
        }

        requestAnimationFrame(() => this.poll());
    }

    setButtonMapping(ditButton, dahButton) {
        this.ditButton = ditButton;
        this.dahButton = dahButton;
    }
}
```

---

## Hardware Build Guides

### Option A: Pi Pico VBand Dongle (Recommended DIY - $5)

**Components:**
- Raspberry Pi Pico ($4)
- 3.5mm TRS stereo jack ($0.50)
- USB micro cable ($1)

**Firmware:** [pico_vband](https://github.com/grahamwhaley/pico_vband)

**Wiring Diagram:**

```
            Raspberry Pi Pico
           ┌─────────────────┐
           │                 │
           │  GP2 ─────────────────── Tip (Dit)
           │                 │           │
           │  GP3 ─────────────────── Ring (Dah)
           │                 │           │
           │  GND ─────────────────── Sleeve (Ground)
           │                 │
           │  [LED] GP25     │  (built-in, optional external on GP9)
           │                 │
           └─────────────────┘

    3.5mm TRS Jack (top view):
         ┌───┬───┬─────────┐
         │TIP│RNG│ SLEEVE  │
         │Dit│Dah│  GND    │
         └───┴───┴─────────┘
```

**Features:**
- 4 selectable modes (short press to cycle, long press to reset)
- LED feedback (heartbeat at boot, solid during key press)
- 10ms debounce built-in
- Mode 4 uses Ctrl keys (works when window unfocused)

**Installation:**
1. Hold BOOTSEL button and plug in Pico
2. Drag `pico_vband.uf2` to the mounted drive
3. Pico reboots as USB keyboard
4. Connect paddle via 3.5mm jack

---

### Option B: Seeeduino XIAO "The Gadget" ($10)

**Components:**
- Seeeduino XIAO SAMD21 ($7)
- 3.5mm TRS stereo jack ($0.50)
- 3D printed case (optional)
- USB-C cable

**Firmware:** [The Gadget](https://hackaday.io/project/184702-morse-code-usbhid-interface-the-gadget)

**Advantages:**
- Tiny form factor (20x17mm)
- USB-C connector
- Can decode Morse and type full text

---

### Option C: Arduino Pro Micro ($8)

**Components:**
- Arduino Pro Micro (ATmega32U4) ($5-8)
- 3.5mm TRS stereo jack ($0.50)
- USB micro cable

**Why ATmega32U4?**
The ATmega32U4 has native USB support and can act as a USB HID device without additional hardware. The Arduino Leonardo, Micro, and Pro Micro all use this chip.

**Simple Firmware:**

```cpp
#include <Keyboard.h>

const int DIT_PIN = 2;
const int DAH_PIN = 3;
const int DEBOUNCE_MS = 10;

bool lastDitState = HIGH;
bool lastDahState = HIGH;
unsigned long lastDitChange = 0;
unsigned long lastDahChange = 0;

void setup() {
    pinMode(DIT_PIN, INPUT_PULLUP);
    pinMode(DAH_PIN, INPUT_PULLUP);
    Keyboard.begin();
}

void loop() {
    unsigned long now = millis();

    // Dit paddle (Left Ctrl)
    bool ditState = digitalRead(DIT_PIN);
    if (ditState != lastDitState && (now - lastDitChange) > DEBOUNCE_MS) {
        if (ditState == LOW) {
            Keyboard.press(KEY_LEFT_CTRL);
        } else {
            Keyboard.release(KEY_LEFT_CTRL);
        }
        lastDitState = ditState;
        lastDitChange = now;
    }

    // Dah paddle (Right Ctrl)
    bool dahState = digitalRead(DAH_PIN);
    if (dahState != lastDahState && (now - lastDahChange) > DEBOUNCE_MS) {
        if (dahState == LOW) {
            Keyboard.press(KEY_RIGHT_CTRL);
        } else {
            Keyboard.release(KEY_RIGHT_CTRL);
        }
        lastDahState = dahState;
        lastDahChange = now;
    }
}
```

---

### Option D: ESP32 with Bluetooth ($12)

**Components:**
- ESP32 development board ($8-12)
- 3.5mm TRS stereo jack ($0.50)
- Battery (optional for portable use)

**Projects:**
- [WristMorse](https://github.com/marsPRE/WristMorse) - Bluetooth keyboard mode
- [ESP32 CW Keyer](https://www.instructables.com/ESP32-CW-KEYER-WITH-TOUCH-BUTTONS/) - Touch buttons + Bluetooth

**Advantages:**
- Wireless operation via Bluetooth
- Can include built-in iambic keyer
- Battery-powered portable option

---

## Compatible Commercial Products

### Ready-Made USB Interfaces

| Product | Price | Features | Website |
|---------|-------|----------|---------|
| **VBand USB Interface** | $25 | Plug-and-play, 3.5mm jack, tested on all platforms | [hamradio.solutions](https://hamradio.solutions/vband/) |
| **Vail Adapter** | ~$30 | Multi-mode (MIDI, Keyboard, Radio), zero-delay sidetone | [vailadapter.com](https://vailadapter.com/) |
| **MY-KEY-MOUSE** | ~$30 | Mouse HID emulation | [cwmorse.us](https://cwmorse.us/) |

### Full-Featured CW Keyers with USB

| Product | Price | Features |
|---------|-------|----------|
| **Morserino-32** | ~$120 | ESP32-based, full trainer, USB serial, WiFi | [morserino.info](https://www.morserino.info/) |
| **K1EL WKUSB** | ~$80 | WinKeyer protocol, contest-grade, iambic A/B/ultimatic | [hamcrafters2.com](https://www.hamcrafters2.com/WKUSBX.html) |
| **nanoKeyer** | ~$60 | Arduino Nano based, K1EL WinKeyer compatible | [nanokeyer.wordpress.com](https://nanokeyer.wordpress.com/) |
| **K3NG Keyer Kits** | ~$40-80 | Open source, highly configurable | [Various vendors](https://blog.radioartisan.com/arduino-cw-keyer/) |

### Recommended Paddles

| Product | Price | Type | Notes |
|---------|-------|------|-------|
| **CW Morse Single Lever** | $40 | Single paddle | Good starter paddle |
| **Bencher BY-1** | $120 | Dual paddle | Classic iambic paddle |
| **Begali Simplex** | $150 | Dual paddle | High quality |
| **N3ZN ZN-9** | $200+ | Dual paddle | Premium |

---

## Testing Plan

### Phase 1 Testing

| Test Case | Input | Keyer Mode | Expected Result |
|-----------|-------|------------|-----------------|
| Space bar straight key | PC keyboard | Straight | Manual timing works |
| VBand adapter | Pi Pico + paddle | Straight | L-Ctrl/R-Ctrl detected |
| VBand adapter | Pi Pico + paddle | Iambic B | Squeeze alternates, +1 on release |
| Custom key binding | Any | Any | User-defined keys work |
| Settings persistence | Any | Any | Settings survive page reload |
| Mobile USB-OTG | Android + adapter | Iambic A | Touch paddle input works |

### Phase 2 Testing

| Test Case | Device | Browser | Expected Result |
|-----------|--------|---------|-----------------|
| Serial feature detect | Any | Chrome | "Connect" button visible |
| Serial feature detect | Any | Firefox | "Connect" button hidden |
| Morserino-32 connect | Morserino | Chrome | Device picker, connection success |
| Serial disconnect | Any | Chrome | Graceful fallback, status update |

### Phase 3 Testing

| Test Case | Controller | Platform | Expected Result |
|-----------|------------|----------|-----------------|
| Xbox controller | Xbox One | Windows | Buttons A/B as dit/dah |
| PS4 controller | DualShock 4 | Mac | X/O as dit/dah |
| MFi controller | Nimbus | iPad | Buttons detected |
| 8BitDo SN30 | Bluetooth | Android | Buttons mapped correctly |
| **iOS Safari** | MFi | iPhone | **Gamepad input works!** |

---

## Migration Notes

### Backwards Compatibility

- Default settings match current behavior (Space bar, straight key mode)
- No breaking changes to existing functionality
- Settings UI is optional (game works without configuration)
- All current input methods (mouse, touch) remain functional

### localStorage Keys

```javascript
// New keys for Phase 1
'morsefleet-input-method'     // 'onscreen' | 'keyboard' | 'serial' | 'gamepad'
'morsefleet-keyer-mode'       // 'straight' | 'bug' | 'iambic-a' | 'iambic-b' | 'ultimatic'
'morsefleet-key-preset'       // 'vband-ctrl' | 'vband' | 'morsecode' | 'custom'
'morsefleet-straight-key'     // KeyboardEvent.code value
'morsefleet-dit-key'          // KeyboardEvent.code value
'morsefleet-dah-key'          // KeyboardEvent.code value
'morsefleet-keyer-wpm'        // Number (5-50)

// Phase 2 additions
'morsefleet-serial-baud'      // Number
'morsefleet-serial-protocol'  // 'morserino' | 'winkeyer' | 'simple'

// Phase 3 additions
'morsefleet-gamepad-dit'      // Button index
'morsefleet-gamepad-dah'      // Button index
```

---

## References

### Web APIs
- [Web Serial API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Web Serial API - Can I Use](https://caniuse.com/web-serial)
- [Web MIDI API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [Web MIDI API - Can I Use](https://caniuse.com/midi)
- [Gamepad API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
- [AudioWorklet - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) (for low-latency sidetone)

### USB HID / Hardware Projects
- [Pi Pico VBand Dongle](https://github.com/grahamwhaley/pico_vband) - Multi-mode USB HID
- [The Gadget - Morse USB/HID Interface](https://hackaday.io/project/184702-morse-code-usbhid-interface-the-gadget) - Seeeduino XIAO
- [MorsePaddle2USB](https://github.com/mgiugliano/MorsePaddle2USB) - Detailed schematics
- [CWKeyboard](https://github.com/kevintechie/CWKeyboard) - Simple Arduino
- [PE1HVH Configurable Morse Interface](https://www.pe1hvh.nl/?cursus=configurable_morse_code_interface) - WebUSB config
- [WristMorse](https://github.com/marsPRE/WristMorse) - ESP32 Bluetooth

### CW Keyers and Protocols
- [K3NG Arduino CW Keyer](https://github.com/k3ng/k3ng_cw_keyer) - Feature-rich open source
- [K1EL WinKeyer Protocol](https://k1el.tripod.com/files/Winkey10.pdf) - Industry standard
- [TeensyWinkeyEmulator](https://github.com/dl1ycf/TeensyWinkeyEmulator) - WinKeyer + MIDI
- [Morserino-32](https://github.com/oe1wkl/Morserino-32) - Full-featured trainer

### Practice Websites (for compatibility testing)
- [VBand](https://hamradio.solutions/vband/) - Online CW practice
- [Vail](https://vailmorse.com/) - Internet Morse repeater
- [Morse Code World Keyer](https://morsecode.world/international/keyer.html) - Practice keyer
- [morsecode.me](https://morsecode.me/) - Simple practice

### CW Theory and Keying Modes
- [Iambic Keying Explained](https://www.qsl.net/w/w9cf/iambic.html)
- [Electronics Notes - CW Keys & Keyers](https://www.electronics-notes.com/articles/ham_radio/morse_code/cw-keys-keyers.php)
- [Paddle Wiring Standard](https://ad6dm.net/log/2018/02/wiring-a-cw-paddle/)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-03 | Initial planning document |
| 2.0 | 2026-02-03 | Added comprehensive ham radio keyer analysis: key types (straight, bug, iambic), keyer modes (A/B/Ultimatic), standard wiring (3.5mm TRS), website compatibility modes, detailed hardware build guides, commercial product recommendations, Bug keyer implementation, expanded references |
| 2.1 | 2026-02-03 | **Phase 1 Complete**: Implemented KeySettings class, IambicKeyer, BugKeyer, settings modal UI, key presets (Space, VBand, morsecode.me, custom), keyer modes (straight, bug, iambic A/B, ultimatic), paddle swap, translations (DE/EN/SL), deployed to production |
