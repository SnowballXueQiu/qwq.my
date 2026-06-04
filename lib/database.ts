type MongoClientLike = {
  db: (name?: string) => {
    collection: (name: string) => any;
  };
};

type RedisClientLike = {
  connect: () => Promise<unknown>;
  isOpen?: boolean;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hIncrBy: (key: string, field: string, increment: number) => Promise<number>;
  incr: (key: string) => Promise<number>;
};

const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;

let mongoClientPromise: Promise<MongoClientLike | null> | undefined;
let redisClientPromise: Promise<RedisClientLike | null> | undefined;

export function databaseEnabled() {
  return Boolean(process.env.MONGODB_URI);
}

export async function getMongoDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (!mongoClientPromise) {
    mongoClientPromise = dynamicImport("mongodb")
      .then(({ MongoClient }) => new MongoClient(uri).connect() as Promise<MongoClientLike>)
      .catch(() => null);
  }

  const client = await mongoClientPromise;
  return client?.db(process.env.MONGODB_DB ?? "qwq_my") ?? null;
}

export async function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!redisClientPromise) {
    redisClientPromise = dynamicImport("redis")
      .then(async ({ createClient }) => {
        const client = createClient({ url }) as RedisClientLike;
        if (!client.isOpen) await client.connect();
        return client;
      })
      .catch(() => null);
  }

  return redisClientPromise;
}

export async function getCollection(name: string) {
  const db = await getMongoDb();
  return db?.collection(name) ?? null;
}
