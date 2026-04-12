const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const query = async (text, params = []) => {
  const result = await pool.query(text, params);
  return [result.rows, result];
};

const end = async () => pool.end();

module.exports = {
  query,
  end,
  raw: pool,
};
