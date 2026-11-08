// Fija la fecha para las pruebas que suponen un día concreto.
// FAKE_NOW=2026-10-31T10:00:00-03:00 PW_PATH=… node -r ./test/clock-hook.cjs test/smoke.mjs fixture.json out
// FAKE_NODE=1 también fija la fecha de Node (Date, Date.now).
const T = process.env.FAKE_NOW;
if (T) {
  const pw = require(process.env.PW_PATH || 'playwright');
  const orig = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...a) => {
    const b = await orig(...a), nc = b.newContext.bind(b);
    b.newContext = async (...x) => { const c = await nc(...x); await c.clock.install({ time: new Date(T) }); return c; };
    return b;
  };
  if (process.env.FAKE_NODE) {
    const RealDate = Date, off = new RealDate(T).getTime() - RealDate.now();
    global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + off); } static now() { return RealDate.now() + off; } };
  }
}
