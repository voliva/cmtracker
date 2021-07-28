import { Handler } from "@netlify/functions";
import { Client, query } from "faunadb";

type Response = Exclude<ReturnType<Handler>, void>;

const handler: Handler = async (event, context) => {
  if (!process.env.FAUNA_KEY) {
    throw new Error("Missing FaunaDB key");
  }
  const params = event.path.replace("/.netlify/functions/team", "").split("/");

  switch (event.httpMethod) {
    case "GET":
      if (params.length !== 2) return undefined;
      return dbRun(async (client) => {
        const team = await client.query(
          query.Get(query.Ref(query.Collection("Teams")), Number(params[1]))
        );
        return {
          statusCode: 200,
          body: JSON.stringify(team),
        };
      });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello!" }),
  };
};

async function dbRun(handler: (client: Client) => Promise<Response>) {
  const client = new Client({
    secret: process.env.FAUNA_KEY,
  });

  try {
    return await handler(client);
  } catch (ex) {
    console.log(ex);
    throw ex;
  } finally {
    client.close();
  }
}

export { handler };

setTimeout(() => {
  dbRun(async (client) =>
    client.query(
      query.Get(query.Ref(query.Collection("Teams")), "305366791356416192")
    )
  ).catch(() => {});
});
