import mongoose from 'mongoose'
import { env } from './env.js'
import { YouTubeResource } from '../models/YouTubeResource.js'
import { Question } from '../models/Question.js'
import { AssessmentImport } from '../models/AssessmentImport.js'

async function migrateYouTubeResourceTextIndex() {
  const collectionName = YouTubeResource.collection.collectionName
  const exists = await mongoose.connection.db
    .listCollections({ name: collectionName }, { nameOnly: true })
    .hasNext()

  if (exists) {
    const indexes = await YouTubeResource.collection.indexes()
    const textIndex = indexes.find((index) => index.key?._fts === 'text' || Object.values(index.key || {}).includes('text'))
    if (textIndex && textIndex.language_override !== 'textSearchLanguage') {
      await YouTubeResource.collection.dropIndex(textIndex.name)
      console.info(`[db] Replaced YouTube resource text index ${textIndex.name}`)
    }
  }

  await YouTubeResource.createIndexes()
}

export async function connectDb() {
  mongoose.set('strictQuery', true)
  await mongoose.connect(env.mongoUri)
  await migrateYouTubeResourceTextIndex()
  await Question.createIndexes()
  await AssessmentImport.createIndexes()
  console.info('[db] MongoDB connected')
}

export async function disconnectDb() {
  await mongoose.disconnect()
}
