const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const UPSTREAM = "https://api.chatanywhere.org/v1";
const API_KEY = process.env.key;

const models = [
  "gpt-4o-mini",
  "gpt-3.5-turbo",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-5-mini",
  "gpt-5-nano"
];

/* ============================
   Root
============================ */
app.get("/", (req, res) => {
  res.type("text/plain").send(
`Welcome to IntAPI!
Now supports OpenAI-compatible API at /v1

Endpoints:
- GET  /v1/models
- GET  /v1/models/:id
- POST /v1/chat/completions
- POST /v1/responses

Legacy:
- /model/:id/:q
- /model/:q
`
  );
});

/* ============================
   OpenAI-compatible APIs
============================ */

/* ---- GET /v1/models ---- */
app.get("/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: models.map(id => ({
      id,
      object: "model",
      owned_by: "intapi"
    }))
  });
});

/* ---- GET /v1/models/:id ---- */
app.get("/v1/models/:id", (req, res) => {
  const id = req.params.id;
  if (!models.includes(id)) {
    return res.status(404).json({ error: { message: "Model not found" } });
  }
  res.json({
    id,
    object: "model",
    owned_by: "intapi"
  });
});

/* ---- POST /v1/chat/completions ---- */
app.post("/v1/chat/completions", async (req, res) => {
  const {
    model = "gpt-5-mini",
    messages,
    stream = false,
    ...rest
  } = req.body;

  if (!models.includes(model)) {
    return res.status(400).json({ error: { message: "Invalid model" } });
  }

  const upstreamRes = await fetch(`${UPSTREAM}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      ...rest
    })
  });

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    upstreamRes.body.pipe(res);
  } else {
    const data = await upstreamRes.json();
    res.json(data);
  }
});

/* ---- POST /v1/responses ---- */
app.post("/v1/responses", async (req, res) => {
  const {
    model = "gpt-5-mini",
    input,
    messages,
    stream = false,
    ...rest
  } = req.body;

  const finalMessages =
    messages ??
    (typeof input === "string"
      ? [{ role: "user", content: input }]
      : input);

  const upstreamRes = await fetch(`${UPSTREAM}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      stream,
      ...rest
    })
  });

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    upstreamRes.body.pipe(res);
  } else {
    const data = await upstreamRes.json();

    // 包成 OpenAI Responses 格式
    res.json({
      id: "resp_" + Date.now(),
      object: "response",
      output: [
        {
          id: "msg_" + Date.now(),
          type: "message",
          role: "assistant",
          content: [
            { type: "output_text", text: data.choices[0].message.content }
          ]
        }
      ],
      usage: data.usage
    });
  }
});

/* ============================
   Legacy APIs (保留你原本的)
============================ */

app.get("/model/:id/:q", async (req, res) => {
  const { id, q } = req.params;
  if (!models.includes(id)) return res.status(403).send("Invalid Model");

  try {
    const r = await fetch(`${UPSTREAM}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: id,
        messages: [{ role: "user", content: q }]
      })
    });
    const data = await r.json();
    res.type("text/plain").send(data.choices[0].message.content);
  } catch (e) {
    res.status(503).send(String(e));
  }
});

app.get("/model/:q", async (req, res) => {
  const q = req.params.q;
  try {
    const r = await fetch(`${UPSTREAM}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: q }]
      })
    });
    const data = await r.json();
    res.type("text/plain").send(data.choices[0].message.content);
  } catch (e) {
    res.status(503).send(String(e));
  }
});

/* ============================
   404
============================ */
app.all("*", (req, res) => {
  res.status(404).type("text/plain").send("ERROR 404: Not Found.");
});

app.listen(PORT, () => {
  console.log(`IntAPI Online: ${PORT}`);
});
