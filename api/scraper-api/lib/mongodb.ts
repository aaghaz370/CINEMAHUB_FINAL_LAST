import { MongoClient, Db } from 'mongodb';

// Cache for multiple clients
const clients: Record<string, MongoClient> = {};
const dbs: Record<string, Db> = {};

/**
 * Get MongoDB Database instance based on a shard key (e.g. tmdb_id)
 * If we have multiple URIs configured (MONGODB_URI, MONGODB_URI2, etc),
 * we distribute the load across them.
 */
export async function getDb(shardKey: number | string): Promise<Db> {
  const uris = [
    process.env.MONGODB_URI,
    process.env.MONGODB_URI2,
    process.env.MONGODB_URI3,
  ].filter(Boolean) as string[];

  if (uris.length === 0) {
    throw new Error('No MONGODB_URI configured');
  }

  // Simple consistent hashing to pick a URI
  const hash = typeof shardKey === 'number' ? shardKey : String(shardKey).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const index = Math.abs(hash) % uris.length;
  const targetUri = uris[index];

  if (dbs[targetUri]) {
    return dbs[targetUri];
  }

  const client = new MongoClient(targetUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  clients[targetUri] = client;
  dbs[targetUri] = client.db('cinemahub'); // DB name
  
  return dbs[targetUri];
}

export async function closeAllDbs() {
  for (const uri in clients) {
    await clients[uri].close();
    delete clients[uri];
    delete dbs[uri];
  }
}
