import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import Joi from 'joi'
import { MongoClient } from 'mongodb'
dotenv.config()

const app = express()
const serverPort = process.env.SERVER_PORT || 8000
const dbConnectionUrl = process.env.DB_URI
const client = new MongoClient(dbConnectionUrl)

app.use(cors())
app.use(express.json())

let db, collection

async function run() {
  try {
    await client.connect()
    console.log('MongoDB connected successfully!')
    db = client.db('LMS')
    collection = db.collection('Courses')

    app.post('/course', async (req, res) => {
      const schema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        videoUrl: Joi.array().items().required(),
      })

      const { error } = schema.validate(req.body)
      if (error) return res.status(400).send(error.details[0].message)

      try {
        const course = {
          title: req.body.title,
          description: req.body.description,
          videoUrl: req.body.videoUrl,
        }

        await collection.insertOne(course)
        res.status(201).send('Course added successfully!')
      } catch (error) {
        console.error('Error adding course:', error)
        res.status(500).send('Error adding course')
      }
    })

    app.get('/course', async (req, res) => {
      try {
        const courses = await collection.find({}).toArray()
        res.status(200).json(courses)
      } catch (error) {
        console.error('Error fetching courses:', error)
        res.status(500).send('Error fetching courses')
      }
    })
  } catch (error) {
    console.error('MongoDB connection error:', error)
  } finally {
    process.on('SIGINT', async () => {
      await client.close()
      console.log('MongoDB connection closed due to app termination.')
      process.exit(0)
    })
  }
}

run().catch(console.dir)

app.listen(serverPort, () => {
  console.log(`Server is running at http://localhost:${serverPort}`)
})
