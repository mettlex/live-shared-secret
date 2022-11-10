import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import {
  Database,
  SQLite3Connector,
  PostgresConnector,
  MySQLConnector,
  Connector,
  MongoDBConnector,
} from "https://deno.land/x/denodb@v1.1.0/mod.ts";

const dbType = Deno.env.get("DB_TYPE");
const dbOptions = JSON.parse(
  Deno.env.get("DB_OPTIONS") || `{"filepath":"./database.sqlite"}`,
);

let connector: Connector;

if (dbType == "postgres") {
  connector = new PostgresConnector(dbOptions);
} else if (dbType == "mysql") {
  connector = new MySQLConnector(dbOptions);
} else if (dbType == "mongodb") {
  connector = new MongoDBConnector(dbOptions);
} else {
  connector = new SQLite3Connector(dbOptions);
}

export const db = new Database({
  connector,
});
