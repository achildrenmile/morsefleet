# MorseFleet

**Morse Code Naval Battle Trainer** - Learn Morse code while playing battleship against the computer!

![MorseFleet](https://img.shields.io/badge/version-1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Languages](https://img.shields.io/badge/languages-DE%20%7C%20EN%20%7C%20SL-orange)

## Overview

MorseFleet is an interactive web-based game that combines the classic battleship game with Morse code learning. Players input coordinates using a Morse key (or spacebar) and engage in turn-based naval combat against a computer opponent.

**Live Demo:** [https://morsefleet.oeradio.at/](https://morsefleet.oeradio.at/)

## Features

### Two-Way Gameplay
- **Ship Placement Phase**: Place your 6 ships on a 7x7 grid
  - Click to place, press R to rotate
  - Random placement option available
- **Turn-Based Combat**: You shoot, then the computer shoots back
- **Win/Lose Conditions**: First to sink all enemy ships wins

### Morse Code Input
- Physical Morse key simulation (click or hold spacebar)
- Short press = dot (.), Long press = dash (-)
- Automatic character recognition after pause
- Audio feedback with authentic Morse tones

### Hardware Morse Key Support
- **USB HID (Keyboard Emulation)** - Works in all browsers
  - Connect real CW paddles via USB HID adapters
  - Compatible with VBand, Pi Pico (pico_vband), and similar devices
  - Configurable key presets (VBand, morsecode.me, custom)
- **Web Serial API** - Chrome/Edge only
  - Direct USB serial connection for Morserino-32 or DIY Arduino adapters
  - Multiple protocols: Simple Binary, ASCII, Morserino
  - Configurable baud rate (9600-115200)
- Multiple keyer modes:
  - **Straight Key**: Manual timing of all elements
  - **Bug (Semi-Auto)**: Automatic dits, manual dahs
  - **Iambic A/B**: Alternating dits and dahs with squeeze keying
  - **Ultimatic**: Last paddle pressed takes priority
- Adjustable keyer speed (10-30 WPM)
- Click ⚙️ in the status bar to configure

### Smart Computer AI
- Hunt-and-target algorithm
- Checkerboard pattern for efficient hunting
- Line tracking when multiple hits detected

### Multi-Language Support
- German (Deutsch)
- English
- Slovenian (Slovenščina)

### Game Modes
- **Normal Mode**: Uses letters A-G and numbers 1-7 (2 Morse characters per coordinate)
- **Advanced Mode**: Uses letter pairs AB-MN and number pairs 01-13 (4 Morse characters per coordinate)
  - Learn the full alphabet A-N and all digits 0-9

### Additional Features
- Adjustable speed (10-25 WPM)
- Interactive tutorial with live demo
- Autoplay mode to watch the game play itself
- Built-in Morse code reference (updates based on game mode)
- Mobile-responsive design
- No cookies, no tracking

## How to Play

1. **Place Your Ships**: Click on the left grid to place ships. Press R to rotate. Click "Confirm Fleet" when done.

2. **Enter Morse Code**: Hold the Morse key (or spacebar):
   - Short press (<200ms) = dot
   - Long press (>200ms) = dash
   - Pause to finalize character

3. **Send Coordinates**: Enter a letter (A-G) + number (1-7), e.g., "B3", then click "Send"

4. **Interpret Response**:
   - W (.--) = Water (miss)
   - S (...) = Hit
   - K (-.-) = Sunk

5. **Survive**: Watch for incoming enemy fire on your fleet grid!

## Morse Reference

### Normal Mode (A-G, 1-7)
```
Letters:        Numbers:
A = .-          1 = .----
B = -...        2 = ..---
C = -.-.        3 = ...--
D = -..         4 = ....-
E = .           5 = .....
F = ..-.        6 = -....
G = --.         7 = --...
```

### Advanced Mode (A-N, 0-9)
```
Letters:                    Numbers:
A = .-      H = ....       0 = -----
B = -...    I = ..         1 = .----
C = -.-.    J = .---       2 = ..---
D = -..     K = -.-        3 = ...--
E = .       L = .-..       4 = ....-
F = ..-.    M = --         5 = .....
G = --.     N = -.         6 = -....
                           7 = --...
                           8 = ---..
                           9 = ----.
```

## Technical Details

- **Single-file SPA**: Everything in one HTML file (~6500 lines)
- **No dependencies**: Pure HTML, CSS, JavaScript
- **Web Audio API**: For Morse tone generation
- **LocalStorage**: For language preference and key settings
- **Docker-ready**: Includes Dockerfile and nginx config
- **Hardware Key Support**: USB HID keyboard emulation for CW paddles

## Project Structure

```
morsefleet/
├── morsefleet.html           # Main application (single-file SPA)
├── config.json               # Optional parent site branding
├── nginx.conf                # Nginx configuration
├── Dockerfile                # Docker build configuration
├── docker-entrypoint.sh      # Container startup script
├── deploy-production.sh      # Deployment script
├── HARDWARE_KEY_SUPPORT.md   # Hardware Morse key implementation docs
└── README.md                 # This file
```

## Deployment

### Local Development
Simply open `morsefleet.html` in a browser - no server required.

### Docker Deployment
```bash
docker build -t morsefleet .
docker run -d -p 80:80 morsefleet
```

### Production Deployment
```bash
./deploy-production.sh
```

## Configuration

Optional `config.json` for parent site branding:
```json
{
  "parentSiteUrl": "https://example.com",
  "parentSiteLogo": "logo.png",
  "parentSiteName": "Example Site"
}
```

## Credits

- **Game Rules**: Based on rules by [Radioklub Vegova (S59VEG)](https://www.s59veg.si/)
- **Developer**: Michael Linder (OE8YML)

## License

MIT License - See source code for details.

---

**73 de OE8YML** - Good luck and have fun learning Morse code!
