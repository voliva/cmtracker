import { Handler } from "@netlify/functions";
import Koa from "koa";
import dotenv from "dotenv";
import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";

dotenv.config({
  path: ".env.local",
});

const app = new Koa();
app.use(cors());
app.use(
  bodyParser({
    enableTypes: ["text"],
  })
);

app.use(async (ctx) => {
  if (ctx.path.startsWith("/functions/")) {
    const [, , functionName] = ctx.path.split("/");
    const handler: Handler = require("./netlify/functions/" +
      functionName).handler;

    const headers = Object.fromEntries(
      Object.entries(ctx.headers).filter(([, v]) => !Array.isArray(v))
    ) as Record<string, string>;
    const multiValueHeaders = Object.fromEntries(
      Object.entries(ctx.headers).filter(([, v]) => Array.isArray(v))
    ) as Record<string, string[]>;

    const queryStringParameters = Object.fromEntries(
      Object.entries(ctx.query).filter(([, v]) => !Array.isArray(v))
    ) as Record<string, string>;
    const multiValueQueryStringParameters = Object.fromEntries(
      Object.entries(ctx.query).filter(([, v]) => Array.isArray(v))
    ) as Record<string, string[]>;

    const result = await handler(
      {
        body: ctx.request.body as string,
        headers,
        httpMethod: ctx.method,
        isBase64Encoded: false,
        path: ctx.path.replace("/functions/", "/.netlify/functions/"),
        multiValueHeaders,
        multiValueQueryStringParameters,
        queryStringParameters,
        rawQuery: "",
        rawUrl: "",
      },
      null as any,
      () => {}
    );

    if (!result) {
      ctx.status = 500;
    } else {
      ctx.status = result.statusCode;
      Object.entries(result.headers || {}).forEach(([name, value]) =>
        ctx.set(name, String(value))
      );
      Object.entries(result.multiValueHeaders || {}).forEach(([name, value]) =>
        ctx.set(
          name,
          value.map((v) => String(v))
        )
      );
      ctx.body = result.body;
    }
    return;
  }

  ctx.status = 404;
});
app.listen(8080);
