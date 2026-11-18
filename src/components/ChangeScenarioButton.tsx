/** A small pill with a sliders icon that opens the scenario panel; the same look wherever "Your scenario" appears. */
export function ChangeScenarioButton({ onOpen }: { onOpen: (from: HTMLElement) => void }) {
  return (
    <button type="button" className="change-scenario" onClick={(e) => onOpen(e.currentTarget)} aria-label="Change your scenario" title="Change your scenario">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
        <path d="M2 4h7M13 4h1M2 12h1M7 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="11" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="5" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      Change
    </button>
  );
}
