import json

import whisper

from detoxify import Detoxify

model = whisper.load_model("base")

result = model.transcribe("output.mp3")

transcript_text = result["text"]

detoxify_original = Detoxify('original')
corpus = transcript_text.split(". ")

corpus_size = len(corpus)
print("Corpus size", corpus_size)

def toxicity_score(sentence):
  results = detoxify_original.predict(sentence)
  toxicity = results["toxicity"]
  severe_toxicity = results["severe_toxicity"]
  identity_attack = results["identity_attack"]

  i_coef = 10
  t_coef = 1
  st_coef = 3
  return {
    "toxicity": identity_attack * i_coef + severe_toxicity * st_coef + toxicity * t_coef,
    "sentence": sentence
  }

final_scores = list(map(toxicity_score, corpus))
sorted_scores = sorted(final_scores, key=lambda x: x["toxicity"], reverse=True)[:10]
# sorted_scores = final_scores.sort(key=lambda x: x["toxicity"], reverse=True)
print("[STARTOFOUTPUT]")
print(json.dumps(sorted_scores))
