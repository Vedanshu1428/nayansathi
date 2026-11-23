/**
 * GazeConnect Offline Local Predictor
 * 100% Client-Side Bigram/Trigram + High-Frequency Assistive Vocabulary.
 * Supports English (EN), Hindi (HI), Spanish (ES), and Chinese (ZH).
 * Includes adaptive user-phrase learning.
 */

export interface PredictionResult {
  suggestions: string[];
  language: string;
}

// Assistive AAC Vocabulary & Common Collocations
const EN_COMMON = [
  "the", "I", "to", "and", "a", "water", "help", "need", "please", "pain",
  "yes", "no", "doctor", "tired", "cold", "hungry", "bathroom", "thank",
  "you", "more", "stop", "bed", "medicine", "nurse", "family", "call",
  "wait", "feel", "adjust", "position", "uncomfortable", "headache", "now"
];

const EN_BIGRAMS: Record<string, string[]> = {
  i: ["need", "want", "am", "feel", "have", "would"],
  "i need": ["water", "help", "rest", "food", "medicine", "the bathroom"],
  "i am": ["in pain", "tired", "hungry", "cold", "uncomfortable", "thirsty"],
  "i feel": ["sick", "cold", "pain", "tired", "dizzy", "better"],
  "i want": ["to rest", "water", "food", "to sit up", "to lie down"],
  please: ["help me", "call my caregiver", "call the doctor", "wait", "give me water", "adjust my position"],
  call: ["my doctor", "my caregiver", "the nurse", "emergency", "my family"],
  could: ["you please help", "you adjust my pillow", "you turn on the light"],
  thank: ["you", "you very much", "you so much"],
};

const HI_COMMON = [
  "पानी", "मदद", "कृपया", "नमस्ते", "दर्द", "खाना", "धन्यवाद", "डॉक्टर",
  "दवा", "हाँ", "नहीं", "थकान", "ठंड", "शौचालय", "रुकिए", "बुलाओ", "आराम"
];

const HI_BIGRAMS: Record<string, string[]> = {
  मुझे: ["पानी चाहिए", "मदद चाहिए", "दर्द हो रहा है", "भूख लगी है", "आराम चाहिए"],
  कृपया: ["मदद करें", "डॉक्टर को बुलाएं", "पानी दीजिए", "थोड़ा रुकिए"],
};

const ES_COMMON = [
  "agua", "ayuda", "por favor", "gracias", "dolor", "médico", "sí", "no",
  "cansado", "frío", "hambre", "baño", "espera", "llamar", "medicina", "necesito"
];

const ES_BIGRAMS: Record<string, string[]> = {
  necesito: ["agua", "ayuda", "ir al baño", "mi medicina", "descansar"],
  tengo: ["dolor", "frío", "hambre", "sed", "sueño"],
  por: ["favor ayúdame", "favor llama al médico", "favor espera"],
};

const ZH_COMMON = [
  "你好", "谢谢", "请", "喝水", "需要", "帮助", "医生", "疼痛",
  "是", "不是", "累了", "饿了", "冷", "洗手间", "等一下", "吃药"
];

const ZH_BIGRAMS: Record<string, string[]> = {
  我需要: ["喝水", "帮助", "休息", "去洗手间", "吃药"],
  请帮我: ["叫医生", "倒杯水", "调整姿势", "等一下"],
};

/**
 * Predicts the next words or completions based on typed context.
 * Returns up to 5 top candidate words/phrases.
 */
export function getLocalPredictions(
  text: string,
  language: string = "en"
): string[] {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const langKey = language.toLowerCase().slice(0, 2);

  // 1. If text is empty, return top common starter words
  if (!lower) {
    if (langKey === "hi") return HI_COMMON.slice(0, 5);
    if (langKey === "es") return ES_COMMON.slice(0, 5);
    if (langKey === "zh") return ZH_COMMON.slice(0, 5);
    return ["I need", "Please", "I am", "Help", "Thank you"];
  }

  // 2. Check bigram / phrase matches
  let bigrams = EN_BIGRAMS;
  let wordList = EN_COMMON;
  if (langKey === "hi") {
    bigrams = HI_BIGRAMS;
    wordList = HI_COMMON;
  } else if (langKey === "es") {
    bigrams = ES_BIGRAMS;
    wordList = ES_COMMON;
  } else if (langKey === "zh") {
    bigrams = ZH_BIGRAMS;
    wordList = ZH_COMMON;
  }

  // Exact phrase match
  if (bigrams[lower]) {
    return bigrams[lower].slice(0, 5);
  }

  // Words breakdown
  const words = lower.split(/\s+/);
  const lastWord = words[words.length - 1];

  // If ends with a space, try to match last 1 or 2 words in bigrams
  if (text.endsWith(" ")) {
    if (words.length >= 2) {
      const twoWords = `${words[words.length - 2]} ${lastWord}`;
      if (bigrams[twoWords]) {
        return bigrams[twoWords].slice(0, 5);
      }
    }
    if (bigrams[lastWord]) {
      return bigrams[lastWord].slice(0, 5);
    }
    // Fallback to top frequency words
    return wordList.slice(0, 5);
  }

  // 3. Prefix matching on active last word
  const matched = wordList.filter((w) =>
    w.toLowerCase().startsWith(lastWord) && w.toLowerCase() !== lastWord
  );

  if (matched.length >= 5) {
    return matched.slice(0, 5);
  }

  // Fill remainder with frequency list
  const results = [...matched];
  for (const w of wordList) {
    if (!results.includes(w) && w.toLowerCase() !== lastWord) {
      results.push(w);
      if (results.length >= 5) break;
    }
  }

  return results.slice(0, 5);
}

/**
 * Persists a user-spoken phrase to improve local suggestions over time.
 */
export function learnUserPhrase(phrase: string): void {
  if (typeof window === "undefined" || !phrase.trim()) return;
  try {
    const key = "gazeconnect_learned_phrases";
    const stored = localStorage.getItem(key);
    const list: string[] = stored ? JSON.parse(stored) : [];
    if (!list.includes(phrase)) {
      list.unshift(phrase);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));
    }
  } catch (e) {
    console.error("Failed to learn phrase:", e);
  }
}
