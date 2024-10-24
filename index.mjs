import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Joi from "joi";
import { MongoClient } from "mongodb";
import domino from "domino";
import fetch from "node-fetch";
import helmet from "helmet";
import axios from "axios";
import { getMetadata } from "page-metadata-parser";

dotenv.config();

const app = express();
const serverPort = 3001;
const dbConnectionUrl = process.env.DB_URI;
const client = new MongoClient(dbConnectionUrl);

app.use(cors());
app.use(express.json());
app.use(helmet());

let db, collection;

const dictionaryWord = (word) =>
  `https://api.dictionaryapi.dev/api/v2/entries/en_US/${word}`;

app.get("/site/info", async (req, res) => {
  const url = req.query.url;
  try {
    console.log(`Fetching - ${url}`);
    const response = await fetch(url);
    console.log({ response });
    console.log("HERE IS THE REQ BODY==>", { req });

    console.log(`Fetched, analysing...`);
    const html = await response.text();
    const doc = domino.createWindow(html).document;
    const metadata = getMetadata(doc, url);
    console.log("done");

    res.json(metadata);
  } catch (error) {
    res.status(400).json({ error: "fetch failed" });
  }
});

app.get("/define", async (req, res) => {
  try {
    const word = req.query.word;
    console.log(`Getting definition ${word}...`);
    const response = await axios.get(dictionaryWord(word));
    const meaning = response.data[0].meanings[0];
    console.log(`${word} done`);

    res.json(meaning);
  } catch (err) {
    console.error(err);
    res.status(400).json({ err });
  }
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully!");

    db = client.db("LMS");
    collection = db.collection("Courses");
    app.post("/course", async (req, res) => {
      const schema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        videoUrl: Joi.array().items().required(),
      });

      const { error } = schema.validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);

      try {
        const course = {
          title: req.body.title,
          description: req.body.description,
          videoUrl: req.body.videoUrl,
        };

        await collection.insertOne(course);
        res.status(201).send("Course added successfully!");
      } catch (error) {
        console.error("Error adding course:", error);
        res.status(500).send("Error adding course");
      }
    });

    app.get("/course", async (req, res) => {
      try {
        const courses = await collection.find({}).toArray();
        res.status(200).json(courses);
      } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).send("Error fetching courses");
      }
    });
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  } finally {
    process.on("SIGINT", async () => {
      await client.close();
      console.log("MongoDB connection closed due to app termination.");
      process.exit(0);
    });
  }
}

run().catch(console.error);

app.listen(serverPort, () => {
  console.log(`Server listening on ${serverPort}...`);
});
