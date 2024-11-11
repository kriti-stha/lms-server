import dotenv from "dotenv";
import express, { text } from "express";
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

let db,
  collection,
  video_courses,
  pdf_courses,
  text_courses,
  youtube_courses,
  recentlyViewedCollection;

const dictionaryWord = (word) =>
  `https://api.dictionaryapi.dev/api/v2/entries/en_US/${word}`;

app.get("/site/info", async (req, res) => {
  const url = req.query.url;
  try {
    console.log(`Fetching - ${url}`);

    const response = await fetch(url);
    const html = await response.text();
    const doc = domino.createWindow(html).document;
    const metadata = getMetadata(doc, url);

    console.log({ metadata, html, response });
    res.json(metadata);
  } catch (error) {
    res.status(400).json(error);
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
    video_courses = db.collection("courses_video");
    pdf_courses = db.collection("courses_pdf");
    text_courses = db.collection("courses_text");
    youtube_courses = db.collection("courses_youtube");

    recentlyViewedCollection = db.collection("RecentlyViewed");

    //POST a new course
    // app.post("/course", async (req, res) => {
    //   const schema = Joi.object({
    //     title: Joi.string().required(),
    //     description: Joi.string().required(),
    //     videoUrl: Joi.array().items(),
    //     courseCode: Joi.string().required(),
    //     pdf: Joi.array().items(),
    //     youtubeLink: Joi.string(),
    //     text: Joi.string(),
    //   }).or("pdf", "videoUrl", "text", "youtubeLink"); //atleast one of the 4 must not be empty

    //   const { error } = schema.validate(req.body);
    //   if (error) return res.status(400).send(error.details[0].message);

    //   try {
    //     const isVideoUpload = !!req.body.videoUrl;
    //     const isPdfUpload = !!req.body.pdf;
    //     const isYoutubeLinkUpload = !!req.body.youtubeLink;
    //     const isTextUpload = !!req.body.text;

    //     const course = {
    //       title: req.body.title,
    //       description: req.body.description,
    //       videoUrl: req.body.videoUrl,
    //       courseCode: req.body.courseCode,
    //       pdf: req.body.pdf,
    //       youtubeLink: req.body.youtubeLink,
    //       courseCode: req.body.courseCode,
    //     };

    //     await collection.insertOne(course);
    //     res.status(201).send("Course added successfully!");
    //   } catch (error) {
    //     console.error("Error adding course:", error);
    //     res.status(500).send("Error adding course");
    //   }
    // });
    const baseSchema = {
      title: Joi.string().required(),
      description: Joi.string().required(),
      courseCode: Joi.string().required(),
    };

    // Endpoint for video uploads
    app.post("/course/video", async (req, res) => {
      const schema = Joi.object({
        ...baseSchema,
        videoUrl: Joi.array().items().required(),
      });

      const { error } = schema.validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);

      try {
        const course = {
          title: req.body.title,
          description: req.body.description,
          courseCode: req.body.courseCode,
          videoUrl: req.body.videoUrl,
        };
        await video_courses.insertOne(course);
        res.status(201).send("Video course added successfully!");
      } catch (error) {
        console.error("Error adding video course:", error);
        res.status(500).send("Error adding video course");
      }
    });

    // Endpoint for PDF uploads
    app.post("/course/pdf", async (req, res) => {
      const schema = Joi.object({
        ...baseSchema,
        pdf: Joi.array().items().required(),
      });

      const { error } = schema.validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);

      try {
        const course = {
          title: req.body.title,
          description: req.body.description,
          courseCode: req.body.courseCode,
          pdf: req.body.pdf,
        };
        await pdf_courses.insertOne(course);
        res.status(201).send("PDF course added successfully!");
      } catch (error) {
        console.error("Error adding PDF course:", error);
        res.status(500).send("Error adding PDF course");
      }
    });

    // Endpoint for YouTube link uploads
    app.post("/course/youtube", async (req, res) => {
      const schema = Joi.object({
        ...baseSchema,
        youtubeLink: Joi.string().required(),
      });

      const { error } = schema.validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);

      try {
        const course = {
          title: req.body.title,
          description: req.body.description,
          courseCode: req.body.courseCode,
          youtubeLink: req.body.youtubeLink,
        };
        await youtube_courses.insertOne(course);
        res.status(201).send("YouTube link course added successfully!");
      } catch (error) {
        console.error("Error adding YouTube link course:", error);
        res.status(500).send("Error adding YouTube link course");
      }
    });

    // Endpoint for text uploads
    app.post("/course/text", async (req, res) => {
      const schema = Joi.object({
        ...baseSchema,
        courseTextContent: Joi.string().required(),
      });

      const { error } = schema.validate(req.body);
      if (error) return res.status(400).send(error.details[0].message);

      try {
        const course = {
          title: req.body.title,
          description: req.body.description,
          courseCode: req.body.courseCode,
          courseTextContent: req.body.courseTextContent,
        };
        await text_courses.insertOne(course);
        res.status(201).send("Text course added successfully!");
      } catch (error) {
        console.error("Error adding text course:", error);
        res.status(500).send("Error adding text course");
      }
    });

    //GET all courses
    app.get("/course", async (req, res) => {
      try {
        const courses = await collection.find({}).toArray();
        res.status(200).json(courses);
      } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).send("Error fetching courses");
      }
    });

    //GET course by title
    app.get("/course/search", async (req, res) => {
      const searchTerm = req.query.searchTerm || "";
      try {
        const courses = await collection
          .find({ title: { $regex: searchTerm, $options: "i" } }) //i is for case insensitivity
          .toArray();

        res.status(200).json(courses);
      } catch (error) {
        console.error("Error searching courses:", error);
        res.status(500).send("Error searching courses");
      }
    });

    // POST recently watched course
    app.post("/course/recently-viewed", async (req, res) => {
      const { userCode, courseCode } = req.body;
      console.log("HERE IS THE POST REQUEST FOR RV", req.body);

      try {
        if (!userCode || !courseCode) {
          return res
            .status(400)
            .send("User code and course code are required.");
        }

        const result = await recentlyViewedCollection.updateOne(
          { userCode },
          { $addToSet: { courseCodes: courseCode } },
          { upsert: true } // Create a new if it doesn't exist
        );

        if (result.modifiedCount > 0) {
          res.status(200).send("Course added to recently viewed successfully!");
        } else {
          res
            .status(200)
            .send("Course already in recently viewed or added successfully!");
        }
      } catch (error) {
        console.error("Error adding recently viewed course:", error);
        res.status(500).send("Error adding recently viewed course");
      }
    });

    // GET recently viewed courses
    app.get("/course/recently-viewed/:userCode", async (req, res) => {
      const { userCode } = req.params;
      console.log("Fetching recently viewed courses for user:", userCode);

      try {
        const userWatchedCollection = await recentlyViewedCollection.findOne({
          userCode,
        });

        if (!userWatchedCollection) {
          return res.status(404).send("No recently viewed courses!");
        }

        res
          .status(200)
          .json({ courseCodes: userWatchedCollection.courseCodes });
      } catch (error) {
        console.error("Error fetching recently viewed courses:", error);
        res.status(500).send("Error fetching recently viewed courses");
      }
    });

    //GET course based on courseCode
    app.get("/course/:courseCode", async (req, res) => {
      const { courseCode } = req.params;
      console.log("Fetching course information for courseCode:", courseCode);

      try {
        const course = await collection.findOne({
          courseCode: courseCode,
        });

        if (!course) {
          return res.status(404).send("Course not found.");
        }
        res.status(200).json(course);
      } catch (error) {
        console.error("Error fetching course information:", error);
        res.status(500).send("Error fetching course information");
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
