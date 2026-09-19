const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Create a small 1-second dummy WAV
function createSilentWav() {
  const sampleRate = 16000;
  const numSamples = sampleRate; // 1s
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  return buffer;
}

async function testAudioModels() {
  const wavBase64 = createSilentWav().toString('base64');
  const models = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'];

  for (const m of models) {
    try {
      console.log('Testing audio on:', m);
      const res = await ai.models.generateContent({
        model: m,
        contents: [
          {
            inlineData: {
              mimeType: 'audio/wav',
              data: wavBase64
            }
          },
          { text: 'Transcribe audio if any, else return {} in JSON: {"segments":[]}' }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });
      console.log('SUCCESS on', m, 'output:', res.text?.slice(0, 80));
    } catch(e) {
      console.log('FAILED on', m, e.status || e.message);
    }
  }
}
testAudioModels();
