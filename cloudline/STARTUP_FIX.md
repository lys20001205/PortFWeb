# Cloudline startup fix 1.2.1

## Report and reproduction

The user reported the page remaining on “正在建立飞机与机场…”. This was a static label, not a measured loading stage. The previous single-file build was tested in this session: with normal JavaScript execution it initialized and started A320/BKI; with inline scripts blocked by a Content Security Policy it reproduced the exact endless label and disabled Start button. With WebGL deliberately unavailable it showed the existing graphics error instead. These tests identify a reproducible failure path, not proof of the specific cause on the user's iPhone.

## Changes

- An always-present, readable HTML fallback explains when script execution has not been confirmed. It remains informative even when no scripts run.
- A separate, conservative-syntax boot.js runs before the five game scripts. It catches load failures, main-script syntax errors, early runtime errors, rejected startup promises and script security-policy violations when the guard itself is allowed to run.
- Startup succeeds only after __cloudline, the graphics context and first-frame draw calls are confirmed. A 15-second watchdog reports incomplete startup without claiming an airport download is progressing. It continues checking for recovery.
- Diagnostic information is displayed locally and can be copied by the user. It is not uploaded or collected.
- No aircraft, flight physics, route guidance, portfolio pages, or hosting configuration changed. The flight core remains 1.2.0; startup shell is 1.2.1.

## Validation performed in this session

22 startup/browser assertions passed, plus 3 separate-file checks (CSS, boot.js and five game scripts loaded through intercepted requests; A320/BKI starts with zero WebGL error; a network-aborted app.js reports the filename). The 18 baseline and 11 route Node checks were also rerun and passed.

Environment: Chromium + Xvfb + SwiftShader, emulated touch at 844x390 and 390x844. Failure injection covered blocked scripts, disabled JavaScript, a main-script syntax error, unavailable WebGL, a first-frame exception, missing main initialization and an external script load error. This is not physical iPhone/Safari validation. Full local reports and test scripts accompany the downloadable source package.

## Remaining boundary

This patch diagnoses startup failures. It cannot make an attachment preview execute JavaScript when the preview prohibits it. A working browser opening path or a verified hosted webpage is still required for those environments. This source commit is not confirmation that an external hosting service deployed it.
