import { Handler } from "@netlify/functions";
import { query as q } from "faunadb";
import { createTeam, dbRun, getTeamById } from "./faunadb";

export const handler: Handler = async (event) => {
  const params = event.path.replace("/.netlify/functions/team", "").split("/");

  switch (event.httpMethod) {
    case "GET":
      if (params.length !== 2) return;
      return dbRun(async (client) => {
        const team = (await getTeamById(client, params[1])).data;

        const players = team.players.map(({ apiKey: _, ...rest }) => rest);

        return {
          statusCode: 200,
          body: JSON.stringify({
            name: team.name,
            players: players,
          }),
        };
      });
    case "POST":
      if (params.length === 1) {
        // Create new team
        const name: string = JSON.parse(event.body).name;
        if (!name) {
          return undefined;
        }
        return dbRun(async (client) => {
          const team = await createTeam(client, name);

          return {
            statusCode: 200,
            body: JSON.stringify({
              name,
              players: [],
              id: team.ref.id,
            }),
          };
        });
      } else if (params.length === 2) {
        // Add new player
        const { name, apiKey } = JSON.parse(event.body);
        if (!name || !apiKey) {
          return undefined;
        }
        return dbRun(async (client) => {
          const team = await getTeamById(client, params[1]);
          const existingPlayers = team.data.players;

          const id = existingPlayers.length
            ? (existingPlayers[existingPlayers.length - 1].id || 0) + 1
            : 0;
          const player = {
            id,
            name,
            apiKey,
          };
          const players = [...existingPlayers, player];

          await client.query(
            q.Update(q.Ref(q.Collection("teams"), params[1]), {
              data: {
                players,
              },
            })
          );

          return {
            statusCode: 200,
            body: JSON.stringify(player),
          };
        });
      } else {
        return;
      }
    case "DELETE":
      if (params.length !== 3) {
        return;
      }
      return dbRun(async (client) => {
        const team = await getTeamById(client, params[1]);

        const players = team.data.players.filter(
          (p) => p.id !== Number(params[2])
        );

        await client.query(
          q.Update(q.Ref(q.Collection("teams"), params[1]), {
            data: {
              players,
            },
          })
        );

        return {
          statusCode: 200,
        };
      });
  }

  return {
    statusCode: 404,
  };
};
