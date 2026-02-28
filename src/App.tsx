/**
 * App.tsx — primitive shell. Lovable will replace visual design.
 */

import { useLanguageTutor } from "./hooks/useLanguageTutor";
import { ScenarioCard } from "./components/ScenarioCard";

function App() {
  const tutor = useLanguageTutor();

  return (
    <div>
      <ScenarioCard
        phase={tutor.phase}
        scenario={tutor.scenario}
        currentElo={tutor.currentElo}
        eloLabel={tutor.eloLabel}
        lastResult={tutor.lastResult}
        lastEloChange={tutor.lastEloChange}
        errorMessage={tutor.errorMessage}
        isSpeaking={tutor.isSpeaking}
        targetLanguage={tutor.targetLanguage}
        onSetLanguage={tutor.setTargetLanguage}
        onStartTalking={tutor.startConversation}
        onStopTalking={tutor.stopConversation}
        onSwipeNext={tutor.swipeNext}
      />
    </div>
  );
}

export default App;
