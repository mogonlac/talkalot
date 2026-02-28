import { Scenario } from "../services/scenarioData";

interface ScenarioCardProps {
  scenario: Scenario;
  currentElo: number;
  conversationStatus: string;
  isSpeaking: boolean;
  onStartTalking: () => void;
  onEndSuccess: () => void;
  onEndFail: () => void;
  onSwipeNext: () => void;
}

/**
 * ScenarioCard — intentionally primitive and unstyled.
 * This is a "dumb" display component. All logic lives in useLanguageTutor.
 * Lovable will replace the visual design of this component.
 */
export function ScenarioCard({
  scenario,
  currentElo,
  conversationStatus,
  isSpeaking,
  onStartTalking,
  onEndSuccess,
  onEndFail,
  onSwipeNext,
}: ScenarioCardProps) {
  return (
    <div>
      <h2>{scenario.title}</h2>
      <p><strong>Language:</strong> {scenario.language}</p>
      <p><strong>Difficulty Tier:</strong> {scenario.difficultyTier} / 5</p>
      <p>{scenario.description}</p>
      <p><strong>Your ELO:</strong> {currentElo}</p>
      <p><strong>Status:</strong> {conversationStatus}</p>
      <p><strong>Agent Speaking:</strong> {isSpeaking ? "Yes" : "No"}</p>

      <hr />

      <button onClick={onStartTalking}>
        Start Talking (ElevenLabs)
      </button>

      <button onClick={onEndSuccess}>
        End Conversation — Success (Update ELO ↑)
      </button>

      <button onClick={onEndFail}>
        End Conversation — Fail (Update ELO ↓)
      </button>

      <button onClick={onSwipeNext}>
        Next Scenario (Swipe ↓)
      </button>
    </div>
  );
}
