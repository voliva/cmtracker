import { Handler } from "@netlify/functions";
import { isAfter } from "date-fns";
import { Client } from "faunadb";
import { dbRun, getTeamById, Team, updateTeam } from "./faunadb";
import {
  createCMStatus,
  createStatus,
  getLastReset,
  requestPlayerStatus,
} from "./gw2API";

export const handler: Handler = async (event) => {
  const params = event.path
    .replace("/.netlify/functions/refresh", "")
    .split("/");

  switch (event.httpMethod) {
    case "POST":
      if (params.length !== 2) return;
      return dbRun(async (client) => {
        const team = await getTeamById(client, params[1]);
        await refreshTeam(client, team.ref.id, team.data);

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

  if (hasToReset(team)) {
    resetWeeklyTeam(team);
  }

  const playerData = await Promise.all(players.map(requestPlayerStatus));

  playerData.forEach(({ id, perm, normal }) => {
    const player = players.find((p) => p.id === id)!;
    player.perm = perm;
    player.normal = normal;
  });

  await updateTeam(client, id, {
    players,
    lastReset: team.lastReset,
    refreshed: Date.now(),
  });
}

export function hasToReset(team: Team): boolean {
  const lastReset = getLastReset();
  return !team.lastReset || !isAfter(team.lastReset, lastReset);
}
export function resetWeeklyTeam(team: Team) {
  team.players.forEach((p) => {
    // When migrating, we only want to reset the weekly stat, but not the normal stat.
    if (team.lastReset !== undefined) {
      p.normal = createStatus();
    }
    p.weekly = createCMStatus();
  });
  team.lastReset = Date.now();
}
