const express = require("express");
const mysql = require("mysql2");
const redis = require("redis");
const helmet = require("helmet");
app.use(helmet());

const app = express();

// Structured JSON logging
function log(level, message, extra = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra
  }));
}

// MySQL connection with retry
function connectDB() {
  const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "secret",
    database: process.env.DB_NAME || "devopsdb",
  });

  db.connect((err) => {
    if (err) {
      log("warn", "MySQL not ready, retrying in 3s...");
      setTimeout(connectDB, 3000);
      return;
    }
    log("info", "MySQL connected!");
    global.db = db;
  });
}
connectDB();

// Redis connection
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || "localhost"}:6379`,
});
redisClient.connect().catch(console.error);

// Simple metrics counter
let requestCount = 0;
let dbQueryCount = 0;

app.use((req, res, next) => {
  requestCount++;
  log("info", "Incoming request", { method: req.method, path: req.path });
  next();
});

app.get("/", (req, res) => {
  res.send("Hello CI Pipeline!");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/db-test", (req, res) => {
  if (!global.db) return res.status(503).json({ error: "DB not ready yet" });
  dbQueryCount++;
  global.db.query("SELECT 1 + 1 AS result", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ db: "MySQL connected", result: results[0].result });
  });
});

app.get("/cache-test", async (req, res) => {
  try {
    await redisClient.set("key", "Redis connected!");
    const value = await redisClient.get("key");
    res.json({ cache: value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Metrics endpoint for Prometheus
app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(`# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total ${requestCount}

# HELP db_queries_total Total DB queries
# TYPE db_queries_total counter
db_queries_total ${dbQueryCount}
`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log("info", "Server started", { port: PORT });
});

module.exports = app;