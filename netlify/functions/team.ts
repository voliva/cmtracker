import { Handler } from "@netlify/functions";
import { query as q } from "faunadb";
import {
  countTeams,
  createTeam,
  dbRun,
  getTeamById,
  Player,
  updateTeam,
} from "./faunadb";
import { createCMStatus, requestPlayerStatus } from "./gw2API";
import { hasToReset, resetWeeklyTeam } from "./refresh";

export const handler: Handler = async (event) => {
  const params = event.path.replace("/.netlify/functions/team", "").split("/");

  switch (event.httpMethod) {
    case "GET":
      if (params.length !== 2) return;
      return dbRun(async (client) => {
        const team = (await getTeamById(client, params[1])).data;

        if (hasToReset(team)) {
          resetWeeklyTeam(team);
          await updateTeam(client, params[1], team);
        }

        const players = team.players.map(({ apiKey: _, ...rest }) => rest);

        return {
          statusCode: 200,
          body: JSON.stringify({
            name: team.name,
            refreshed: team.refreshed,
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
          if (process.env.TEAM_LIMIT) {
            const teamCount = await countTeams(client);
            if (teamCount >= Number(process.env.TEAM_LIMIT)) {
              return {
                statusCode: 400,
                body: JSON.stringify({
                  error: "No more teams are allowed in this server",
                }),
              };
            }
          }

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
          // TODO verify apiKey is valid
          const team = await getTeamById(client, params[1]);
          const existingPlayers = team.data.players;

          if (process.env.REACT_APP_PLAYER_LIMIT) {
            if (
              existingPlayers.length >=
              Number(process.env.REACT_APP_PLAYER_LIMIT)
            ) {
              return {
                statusCode: 400,
                body: JSON.stringify({
                  error: "Player limit reached for this team",
                }),
              };
            }
          }

          if (existingPlayers.some((player) => player.apiKey === apiKey)) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                error: "Provided apiKey already exists",
              }),
            };
          }

          const id = existingPlayers.length
            ? (existingPlayers[existingPlayers.length - 1].id || 0) + 1
            : 0;
          const status = await requestPlayerStatus({ id, apiKey });
          const player: Player = {
            ...status,
            weekly: createCMStatus(),
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
    case "PATCH":
      if (params.length !== 3) {
        return;
      }
      return dbRun(async (client) => {
        const { type, wing, boss, newValue } = JSON.parse(event.body);
        if (type !== "weekly") {
          return;
        }

        const team = await getTeamById(client, params[1]);
        const player = team.data.players.find(
          (p) => p.id === Number(params[2])
        );
        if (!player) {
          return {
            statusCode: 400,
            error: "Player doesn't exist",
          };
        }
        if (player.weekly[wing]?.[boss] === undefined) {
          return {
            statusCode: 400,
            error: "Incorrect wing-boss combination",
          };
        }
        player.weekly[wing][boss] = Boolean(newValue);

        await updateTeam(client, params[1], { players: team.data.players });

        return {
          statusCode: 200,
        };
      });
    case "DELETE":
      if (params.length !== 3) {
        return;
      }
      return dbRun(async (client) => {
        const team = await getTeamById(client, params[1]);

        const players = team.data.players.filter(
          (p) => p.id !== Number(params[2])
        );

        await updateTeam(client, params[1], { players });

        return {
          statusCode: 200,
        };
      });
  }

  return {
    statusCode: 404,
  };
};
