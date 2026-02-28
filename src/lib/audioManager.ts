// Global audio manager - ensures only one audio plays at a time
// and can be stopped from anywhere

let currentSource: AudioBufferSourceNode | null = null
let currentContext: AudioContext | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

export function stopAudio() {
  try {
    if (currentSource) {
      currentSource.stop()
      currentSource = null
    }
    if (currentContext) {
      currentContext.close()
      currentContext = null
    }
    if (currentUtterance) {
      window.speechSynthesis.cancel()
      currentUtterance = null
    }
  } catch (e) {
    // Ignore errors when stopping
  }
}

export async function playAudio(arrayBuffer: ArrayBuffer): Promise<void> {
  // Stop any currently playing audio first
  stopAudio()

  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContext.decodeAudioData(arrayBuffer).then((audioBuffer) => {
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        source.onended = () => {
          currentSource = null
          resolve()
        }
        currentSource = source
        currentContext = audioContext
        source.start(0)
      }).catch(() => {
        resolve()
      })
    } catch (e) {
      resolve()
    }
  })
}

// Browser-based TTS fallback using Web Speech API
export async function speakWithBrowserTTS(text: string, lang: string = 'en-US'): Promise<void> {
  // Stop any currently playing audio first
  stopAudio()

  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported')
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.9
      utterance.pitch = 1.0
      
      utterance.onend = () => {
        currentUtterance = null
        resolve()
      }
      
      utterance.onerror = () => {
        currentUtterance = null
        resolve()
      }

      currentUtterance = utterance
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.error('Browser TTS error:', e)
      resolve()
    }
  })
}
