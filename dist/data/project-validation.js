// Recorded local execution, not target scores or evidence of learner completion.
export const projectValidation={
  "date": "2026-11-08",
  "device": "Mac CPU",
  "torch": "2.15.0",
  "seed": 42,
  "steps": 100,
  "source_sha256": "8a1cbe09210428742b5e4634c0507591bcdffb948409c56c166ad1ac17548135",
  "rows": [
    {
      "arch": "mlp",
      "observation": "full",
      "parameters": 1250,
      "before": 0.4150451966561377,
      "after": 0.0011538348080648575,
      "persistence": 0.6097096391022205
    },
    {
      "arch": "mlp",
      "observation": "partial",
      "parameters": 1185,
      "before": 1.3514800807461143,
      "after": 0.46619905391708016,
      "persistence": 1.1487378422170877
    },
    {
      "arch": "transformer",
      "observation": "partial",
      "parameters": 17217,
      "before": 15.32632664963603,
      "after": 0.18568359181517735,
      "persistence": 1.1487378422170877
    },
    {
      "arch": "gru",
      "observation": "partial",
      "parameters": 6465,
      "before": 2.0035139080137014,
      "after": 0.02346475308877416,
      "persistence": 1.1487378422170877
    }
  ]
};
