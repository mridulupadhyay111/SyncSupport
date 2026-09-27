/**
 * MongoDB Atlas Vector Search Index Setup Utility
 * 
 * Index Name: vector_index
 * Target Collection: knowledgebases
 * Database: syncsupport
 * 
 * Index Definition JSON:
 * {
 *   "fields": [
 *     {
 *       "numDimensions": 768,
 *       "path": "embedding",
 *       "similarity": "cosine",
 *       "type": "vector"
 *     }
 *   ]
 * }
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

async function setupVectorSearchIndex() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/syncsupport';
  console.log(`[Vector Index Setup] Connecting to MongoDB...`);

  try {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const collection = db.collection('knowledgebases');

    console.log(`[Vector Index Setup] Attempting to create search index 'vector_index' on 'knowledgebases'...`);

    const indexDefinition = {
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 768,
            similarity: "cosine"
          }
        ]
      }
    };

    try {
      const result = await collection.createSearchIndex(indexDefinition);
      console.log(`[Vector Index Setup] Search Index Created Successfully:`, result);
    } catch (err) {
      console.log(`\n================================================================`);
      console.log(`[Atlas Search Notice] Atlas Vector Search Indexes can also be created directly`);
      console.log(`in the MongoDB Atlas Web Console UI under:`);
      console.log(`Database -> Search -> Create Search Index -> Atlas Vector Search (JSON Editor)`);
      console.log(`----------------------------------------------------------------`);
      console.log(`Use the following JSON Definition:`);
      console.log(JSON.stringify({
        fields: [
          {
            numDimensions: 768,
            path: "embedding",
            similarity: "cosine",
            type: "vector"
          }
        ]
      }, null, 2));
      console.log(`================================================================\n`);
    }
  } catch (error) {
    console.error('[Vector Index Setup Error]', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('[Vector Index Setup] Disconnected from database.');
  }
}

setupVectorSearchIndex();
