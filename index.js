const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;


// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())

app.get("/", (req, res) => {
  res.send("Hello from LearnEnglish Server..");
});

app.listen(port, () => {
  console.log(`LearnEnglish is running at:http://localhost:${port}`);
});