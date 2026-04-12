const pool = require("../db/connection");

const ensureCooldownCascade = async (db = pool) => {
  const [constraints] = await db.query(`
    SELECT con.conname AS constraint_name, con.confdeltype
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'cooldown_log'
      AND nsp.nspname = 'public'
      AND con.contype = 'f'
  `);

  if (!constraints.length) {
    throw new Error("cooldown_log.driver_id foreign key was not found");
  }

  if (constraints[0].confdeltype !== "c") {
    throw new Error("cooldown_log.driver_id foreign key does not use ON DELETE CASCADE");
  }
};

if (require.main === module) {
  ensureCooldownCascade()
    .then(async () => {
      console.log("Ensured cooldown_log driver foreign key uses ON DELETE CASCADE.");
      await pool.end();
    })
    .catch(async (error) => {
      console.error("Failed to update cooldown_log foreign key:", error);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { ensureCooldownCascade };
