# RK CB75 Keyboard

This directory runs the CB75 Keyboard implementation copied from `rk-hub-web` as an isolated app. The `components/rk_cb75`, `keyboard/beiying/rk_cb75`, and `stores/rk_cb75` files remain RK's CB75 implementation. Shared RK files are included only where that implementation imports them. `keyboard/beiying/state.ts` and `device/state.ts` contain CB75-only device registration so other RK models are not bundled.

The root `npm run build:cb75` builds this app at `/cb75/index.html`. Its copied RK image URLs are scoped to `/cb75/assets/images/` during the build. This app needs a secure context and a user-approved WebHID device. USB PID `258A:02F1` and dongle PID `3554:FA09` are recognized.
