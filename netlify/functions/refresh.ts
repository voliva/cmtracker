import { Handler } from "@netlify/functions";
import { Client, query as q } from "faunadb";
import { dbRun, getAllTeams, getTeamById, Team } from "./faunadb";
import { requestPlayerStatus } from "./gw2API";

export const handler: Handler = async (event) => {
  const params = event.path
    .replace("/.netlify/functions/refresh", "")
    .split("/");

  switch (event.httpMethod) {
    case "GET":
      if (params.length > 2) return; // Has one optional parameter
      return dbRun(async (client) => {
        if (params.length === 1) {
          const teams = await getAllTeams(client);

          await Promise.all(
            teams.map((team) => refreshTeam(client, team.ref.id, team.data))
          );
        } else {
          const team = await getTeamById(client, params[1]);
          await refreshTeam(client, team.ref.id, team.data);
        }

        return {
          statusCode: 200,
          body: "{}",
        };
      });
  }

  return {
    statusCode: 404,
  };
};

async function refreshTeam(client: Client, id: string, team: Team) {
  const players = team.players;

  const playerData = await Promise.all(players.map(requestPlayerStatus));

  playerData.forEach(({ id, perm, normal }) => {
    const player = players.find((p) => p.id === id)!;
    player.perm = perm;
    player.normal = normal;
  });

  await client.query(
    q.Update(q.Ref(q.Collection("teams"), id), {
      data: {
        players,
        refreshed: Date.now(),
      },
    })
  );
}
