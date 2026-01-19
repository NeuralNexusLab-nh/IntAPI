const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();

const list = [
  "gpt-4o-mini",
  "gpt-3.5-turbo",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-5-mini",
  "gpt-5-nano"
]

app.get("/", (req, res) => {
  res.status(200).send(`Welcome to IntAPI! We provide many AI models, user just need to use HTTP GET to some endpoint and get the response. 
  Endpoint info: /model/{model-id}/{question} or get faster: /model/{question}, 
  aviliable model-ids: gpt-4o-mini, gpt-3.5-turbo, gpt-4.1-mini, gpt-4.1-nano, gpt-5-mini, and gpt-5-nano.
  `);
});

app.get("/model/:id/:q", (req, res) => {
  const id = req.params.id;
  const q = req.params.q;
  if (list.includes(id)) {
    fetch("https://api.chatanywhere.org/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: id,
        messages: [{role: "user", content: q}]
      })
    })
      .then(res => res.json())
      .then(data => {
        res.status(200).send(data)
      })
      .catch(err => res.status(503).send(err));
  } else {
    res.status(403).send("Invalid Model");
  }
});

app.get("/model/:q", (req, res) => {
  const q = req.params.q;
  fetch("https://api.chatanywhere.org/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages: [{role: "user", content: q}]
    })
  })
    .then(res => res.json())
    .then(data => {
      res.status(200).send(data)
    })
    .catch(err => res.status(503).send(err));
});

app.all("*", (req, res) => {
  res.status(404).send("ERROR 404: Not Found.");
});
    
app.listen(process.env.PORT, () => console.log(`IntAPI Online: ${process.env.PORT}`));
