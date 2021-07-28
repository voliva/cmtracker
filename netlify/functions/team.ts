import { Handler } from "@netlify/functions";
import { Client } from "faunadb";

const handler: Handler = async (event, context) => {
  const client = new Client({
    secret: process.env.FAUNA_KEY,
    domain: "db.fauna.com",
    scheme: "https",
  });

  console.log("event ->", process.env.ENV_TEST, event.httpMethod, event.path);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello!" }),
  };
};

export { handler };
