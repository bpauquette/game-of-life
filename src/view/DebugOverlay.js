// DebugOverlay was useful during diagnosis but is removed to avoid
// spamming logs in normal development. Keep a no-op component here so
// imports remain valid while we remove runtime side-effects.
export default function DebugOverlay() {
  return null;
}
