import { Handler } from "@netlify/functions";
import { Client, query as q } from "faunadb";
import { Status } from "./gw2API";

export interface Player {
  name: string;
  apiKey: string;
  id: number;
  perm: Status;
  normal: Status;
}

export interface Team {
  name: string;
  players: Array<Player>;
  refreshed: number;
}

export interface FResult<T> {
  ref: {
    id: string;
  };
  ts: number;
  data: T;
}

type Response = Exclude<ReturnType<Handler>, void>;
export async function dbRun(handler: (client: Client) => Promise<Response>) {
  if (!process.env.FAUNA_KEY) {
    throw new Error("Missing Fauna key");
  }

  const client = new Client({
    secret: process.env.FAUNA_KEY,
    domain: process.env.FAUNA_DOMAIN,
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

export function getTeamById(client: Client, id: string) {
  return client.query<FResult<Team>>(q.Get(q.Ref(q.Collection("teams"), id)));
}

// Only gets first page ;D 64 by default.
// It could be configured or make it fancier, but I will just limit amount of teams to less than 64
export function getAllTeams(client: Client) {
  return client
    .paginate(q.Documents(q.Collection("teams")))
    .map((x) => q.Get(x))
    .nextPage() as Promise<Array<FResult<Team>>>;
}

export function createTeam(client: Client, name: string) {
  const team: Team = { name, players: [], refreshed: Date.now() };
  return client.query<FResult<Team>>(q.Create("teams", { data: team }));
}

export function countTeams(client: Client) {
  return client.query<number>(q.Count(q.Documents(q.Collection("teams"))));
}
