// Global audio manager - ensures only one audio plays at a time
// and can be stopped from anywhere

let currentSource: AudioBufferSourceNode | null = null
let currentContext: AudioContext | null = null

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
  } catch (e) {
    // Ignore errors when stopping
  }
}

export async function playAudio(arrayBuffer: ArrayBuffer): Promise<void> {
  // Stop any currently playing audio first
  stopAudio()

  return new Promise(async (resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
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
    } catch (e) {
      resolve()
    }
  })
}
