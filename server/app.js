import express from "express";
import * as dotenv from "dotenv";
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}
import morgan from "morgan";
import axios from "axios";
// const cors = require("cors");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json("Welcome to our proxy server");
});

app.post("/api/:strictLevel", async (req, res) => {
  try {
    const { strictLevel = 1 } = req.params;
    const { url } = req.body;

    if (!url) {
      return res
        .status(404)
        .json({ name: "client error", message: "url is required" });
    }

    const REQUESTURL = process.env.IPQUALITYSCORE_API;
    const MYAPIKEY = process.env.API_KEY;
    const requestConfig = {
      strictness: !isNaN(strictLevel) ? Math.min(Number(strictLevel), 3) : 1,
    };

    const apiUrl = `${REQUESTURL}/${MYAPIKEY}/${encodeURIComponent(url)}`;

    const queryString =
      Object.keys(requestConfig).length > 0
        ? `?${new URLSearchParams(requestConfig)}`
        : "";

    const targetUrl = `${apiUrl}${queryString}`;
    const response = await axios.get(targetUrl);
    res.json(response.data); // Send the fetched data back to the client
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: error?.message, name: error?.name });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
