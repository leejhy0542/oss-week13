// The only file that talks to the LLM provider.
// The provider, the model and the key come from .env:
//   process.env.LLM_BASE_URL, process.env.LLM_MODEL, process.env.LLM_API_KEY

// TODO P4: make a constant SYSTEM here: the rules for every answer (tone, length, format).
//          Then send it as the first message, before the user's message, in ask().
const SYSTEM = `존댓말(해요체)로 답하고 답변 길이를 한 문단, 세 문장 이내로 답하고 목록,제목,굵은 글씨 같은 마크다운을 쓰지않고 답변해줘`;
const SYSTEM_JSON = `반드시 유효한 JSON 객체로만 답하세요. 다른 설명이나 마크다운은 쓰지 마세요.
키는 정확히 sentiment, score, summary 세 개만 사용하세요.
- sentiment: "positive", "negative", "neutral" 중 하나의 문자열
- score: 1부터 5 사이의 정수 (예: 1, 2, 3, 4, 5)
- summary: 한 문장의 짧은 요약 문자열`;
// ask("a question")  ->  the model's answer, as a string
export async function ask(question) {
  // TODO P3: write this function (see problems/P3_ask.md). Delete the throw line below.
  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages: [{role: "system",content: SYSTEM},
        {role: "user", content: question}],
    }),
  });

  const data = await res.json();
  return (data.choices[0].message.content ?? "").trim();
}

// chat([{ role: "user", content: "..." }, { role: "assistant", content: "..." }, ...])
//   ->  the model's next answer, as a string
export async function chat(history) {
  // TODO P5: write this function (see problems/P5_chat.md). Delete the throw line below.
  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages: [{role: "system",content: SYSTEM}, ...history],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM: HTTP ${res.status}`);
  }

  const data = await res.json();
  return (data.choices[0].message.content ?? "").trim();
}

// analyze("a review")  ->  an object, not a sentence:
//   { sentiment: "positive" | "negative" | "neutral", score: 1..5, summary: "one short sentence" }
export async function analyze(text) {
  // TODO P6: write this function (see problems/P6_json.md). Delete the throw line below.
  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_JSON },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM: HTTP ${res.status}`);
  }

  const data = await res.json();
  const raw = (data.choices[0].message.content ?? "").trim();
  const { sentiment, score, summary } = JSON.parse(raw);

  const validSentiments = ["positive", "negative", "neutral"];
  const isValidScore = Number.isInteger(score) && score >= 1 && score <= 5;
  const isValidSummary = typeof summary === "string";

  if (!validSentiments.includes(sentiment) || !isValidScore || !isValidSummary) {
    throw new Error("LLM: the answer has the wrong shape");
  }

  return { sentiment, score, summary };
}
