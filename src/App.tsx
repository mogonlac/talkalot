/**
 * App.tsx
 * Primitive shell — consumes useLanguageTutor and renders ScenarioCard.
 * Lovable will replace the visual design. Do not add styling here.
 */

import { useLanguageTutor } from "./hooks/useLanguageTutor";
import { ScenarioCard } from "./components/ScenarioCard";

function App() {
  const tutor = useLanguageTutor();

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <ScenarioCard
        phase={tutor.phase}
        scenario={tutor.scenario}
        currentElo={tutor.currentElo}
        eloLabel={tutor.eloLabel}
        lastResult={tutor.lastResult}
        lastEloChange={tutor.lastEloChange}
        errorMessage={tutor.errorMessage}
        isSpeaking={tutor.isSpeaking}
        onStartTalking={tutor.startConversation}
        onStopTalking={tutor.stopConversation}
        onSwipeNext={tutor.swipeNext}
      />
    </div>
  );
}

export default App;
