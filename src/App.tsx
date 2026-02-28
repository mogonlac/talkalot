import { useLanguageTutor } from "./hooks/useLanguageTutor";
import { ScenarioCard } from "./components/ScenarioCard";

/**
 * App — intentionally primitive and unstyled.
 * All business logic is delegated to useLanguageTutor.
 * Lovable will replace the visual design of this file.
 */
function App() {
  const {
    currentElo,
    currentScenario,
    conversationStatus,
    isSpeaking,
    startConversation,
    endConversation,
    handleSuccess,
    handleFailure,
    handleSwipeNext,
  } = useLanguageTutor();

  const handleEndSuccess = async () => {
    await endConversation();
    handleSuccess();
  };

  const handleEndFail = async () => {
    await endConversation();
    handleFailure();
  };

  return (
    <div>
      <h1>DuoConnect — Language Tutor</h1>

      {/* Vertical scenario feed — Lovable will convert this into a TikTok-style swipe UI */}
      <ScenarioCard
        scenario={currentScenario}
        currentElo={currentElo}
        conversationStatus={conversationStatus}
        isSpeaking={isSpeaking}
        onStartTalking={startConversation}
        onEndSuccess={handleEndSuccess}
        onEndFail={handleEndFail}
        onSwipeNext={handleSwipeNext}
      />
    </div>
  );
}

export default App;
