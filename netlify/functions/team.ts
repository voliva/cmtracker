import { Handler } from "@netlify/functions";
import Firebase from "firebase/app";
import "firebase/firestore";
import fetch from "node-fetch";

const app = Firebase.initializeApp({
  apiKey: process.env.FIRESTORE_API_KEY,
  authDomain: process.env.FIRESTORE_AUTH_DOMAIN,
  projectId: process.env.FIRESTORE_PROJECT_ID,
  storageBucket: process.env.FIRESTORE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIRESTORE_MESSAGING_SENDER_ID,
  appId: process.env.FIRESTORE_APP_ID,
});

type Response = Exclude<ReturnType<Handler>, void>;

const handler: Handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const params = event.path.replace("/.netlify/functions/team", "").split("/");

  switch (event.httpMethod) {
    case "GET":
      if (params.length !== 2) return;
      return dbRun(async (client) => {
        const team = (
          await client.collection("teams").doc(params[1]).get()
        ).data();

        const players: Array<{ name: string; apiKey: string; id: string }> =
          team.players.map((p) => JSON.parse(p));

        const playerData = await Promise.all(players.map(requestPlayerStatus));

        return {
          statusCode: 200,
          body: JSON.stringify({
            name: team.name,
            players: playerData,
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
          const team = await client.collection("teams").add({
            name,
            players: [],
          });

          return {
            statusCode: 200,
            body: JSON.stringify({
              name,
              players: [],
              id: team.id,
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
          const team = client.collection("teams").doc(params[1]);
          const existingPlayers = (await team.get()).data().players;

          const id = existingPlayers.length
            ? (JSON.parse(existingPlayers[existingPlayers.length - 1]).id ||
                0) + 1
            : 0;
          const player = {
            id,
            name,
            apiKey,
          };
          team.set({
            players: [...existingPlayers, JSON.stringify(player)],
          });

          return {
            statusCode: 200,
            body: JSON.stringify(player),
          };
        });
      } else {
        return;
      }
    case "PUT":
      if (params.length !== 3) {
        return;
      }
      return dbRun(async (client) => {
        const team = client.collection("teams").doc(params[1]);
        const existingPlayers = (await team.get())
          .data()
          .players.map((p) => JSON.parse(p));

        const index = existingPlayers.findIndex(
          (p) => p.id === Number(params[2])
        );

        const name: string = JSON.parse(event.body).name;
        if (!name || index < 0) {
          return;
        }

        existingPlayers[index] = {
          ...existingPlayers[index],
          name,
        };

        team.set({
          players: existingPlayers.map((p) => JSON.stringify(p)),
        });

        return {
          statusCode: 200,
        };
      });
    case "DELETE":
      if (params.length !== 3) {
        return;
      }
      return dbRun(async (client) => {
        const team = client.collection("teams").doc(params[1]);
        const existingPlayers = (await team.get())
          .data()
          .players.map((p) => JSON.parse(p));

        team.set({
          players: existingPlayers
            .filter((p) => p.id !== Number(params[2]))
            .map((p) => JSON.stringify(p)),
        });

        return {
          statusCode: 200,
        };
      });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello!" }),
  };
};

async function dbRun(
  handler: (client: Firebase.firestore.Firestore) => Promise<Response>
) {
  if (!process.env.FIRESTORE_API_KEY) {
    throw new Error("Missing Firestore key");
  }

  const firestore = app.firestore();

  try {
    return await handler(firestore);
  } catch (ex) {
    console.log(ex);
    throw ex;
  } finally {
    await firestore.waitForPendingWrites();
    await firestore.terminate();
    await firestore.clearPersistence();
  }
}

/*
Weekly CM 5455 // => Doesn't exist
*/

type Status = Record<string, Record<string, boolean>>;
interface Statuses {
  normal: Status;
  // weekly: Status,
  perm: Status;
}

const achievementMap: Record<number, (status: Statuses) => void> = {
  // W3 B2 Down, Down, Downed
  3019: setFlag("perm", "W3", "B2"),
  // W4 B1 Jaded
  3334: setFlag("perm", "W4", "B1"),
  // W4 B2 Attuned
  3287: setFlag("perm", "W4", "B2"),
  // W4 B3 Harsh Sentence
  3342: setFlag("perm", "W4", "B3"),
  // W4 B4 Solitary Confinement
  3292: setFlag("perm", "W4", "B4"),
  // W5 B1 Exile Executioner
  3993: setFlag("perm", "W5", "B1"),
  // W5 B4 Death Eater
  3979: setFlag("perm", "W5", "B4"),
  // W6 B1 Some Dissasembly Required
  4416: setFlag("perm", "W6", "B1"),
  // W6 B2 Let's Not Do That Again
  4429: setFlag("perm", "W6", "B2"),
  // W6 B3 Heroes of the Forge
  4355: setFlag("perm", "W6", "B3"),
  // W7 B1 Rock Solid
  4803: setFlag("perm", "W7", "B1"),
  // W7 B2 Quell the Storm
  4779: setFlag("perm", "W7", "B2"),
  // W7 B3 Mad with Power
  4800: setFlag("perm", "W7", "B3"),
};
const progressionMap: Record<string, (status: Statuses) => void> = {
  vale_guardian: setFlag("normal", "W1", "B1"),
  spirit_woods: setFlag("normal", "W1", "E1"),
  gorseval: setFlag("normal", "W1", "B2"),
  sabetha: setFlag("normal", "W1", "B3"),
  slothasor: setFlag("normal", "W2", "B1"),
  bandit_trio: setFlag("normal", "W2", "B2"),
  matthias: setFlag("normal", "W2", "B3"),
  escort: setFlag("normal", "W3", "B1"),
  keep_construct: setFlag("normal", "W3", "B2"),
  twisted_castle: setFlag("normal", "W3", "E1"),
  xera: setFlag("normal", "W3", "B3"),
  cairn: setFlag("normal", "W4", "B1"),
  mursaat_overseer: setFlag("normal", "W4", "B2"),
  samarog: setFlag("normal", "W4", "B3"),
  deimos: setFlag("normal", "W4", "B4"),
  soulless_horror: setFlag("normal", "W5", "B1"),
  river_of_souls: setFlag("normal", "W5", "B2"),
  statues_of_grenth: setFlag("normal", "W5", "B3"),
  voice_in_the_void: setFlag("normal", "W5", "B4"),
  conjured_amalgamate: setFlag("normal", "W6", "B1"),
  twin_largos: setFlag("normal", "W6", "B2"),
  qadim: setFlag("normal", "W6", "B3"),
  gate: setFlag("normal", "W7", "E1"),
  adina: setFlag("normal", "W7", "B1"),
  sabir: setFlag("normal", "W7", "B2"),
  qadim_the_peerless: setFlag("normal", "W7", "B3"),
};

const ids = Object.keys(achievementMap);
interface AccountAchievement {
  id: number;
  done: boolean;
  bits?: number[];
}
async function requestPlayerStatus({
  id,
  apiKey,
  name,
}: {
  id: string;
  apiKey: string;
  name: string;
}) {
  const achievementsP = fetch(
    `https://api.guildwars2.com/v2/account/achievements?ids=${ids.join(",")}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  )
    .then((result) => result.json())
    .then((result): AccountAchievement[] => {
      if (!Array.isArray(result)) {
        return [];
      }
      return result;
    })
    .catch((err) => {
      console.error(err);
      return [] as AccountAchievement[];
    });

  const weeklyP = fetch("https://api.guildwars2.com/v2/account/raids", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
    .then((result) => result.json())
    .then((result): string[] => {
      if (!Array.isArray(result)) {
        return [];
      }
      return result;
    })
    .catch((err) => {
      console.error(err);
      return [] as string[];
    });

  const [achievements, progression] = await Promise.all([
    achievementsP,
    weeklyP,
  ]);

  const statuses: Statuses = {
    normal: createStatus(),
    perm: createCMStatus(),
  };

  achievements.forEach((a) => achievementMap[a.id](statuses));
  progression.forEach((p) => progressionMap[p](statuses));

  return { id, name, ...statuses };
}

export { handler };

function createStatus(): Status {
  return {
    W1: {
      B1: false,
      E1: false,
      B2: false,
      B3: false,
    },
    W2: {
      B1: false,
      B2: false,
      B3: false,
    },
    W3: {
      B1: false,
      B2: false,
      E1: false,
      B3: false,
    },
    W4: {
      B1: false,
      B2: false,
      B3: false,
      B4: false,
    },
    W5: {
      B1: false,
      B2: false,
      B3: false,
      B4: false,
    },
    W6: {
      B1: false,
      B2: false,
      B3: false,
    },
    W7: {
      E1: false,
      B1: false,
      B2: false,
      B3: false,
    },
  };
}
function createCMStatus(): Status {
  return {
    W3: {
      B2: false,
    },
    W4: {
      B1: false,
      B2: false,
      B3: false,
      B4: false,
    },
    W5: {
      B1: false,
      B4: false,
    },
    W6: {
      B1: false,
      B2: false,
      B3: false,
    },
    W7: {
      B1: false,
      B2: false,
      B3: false,
    },
  };
}

function setFlag(key: keyof Statuses, wing: string, boss: string) {
  return (status: Statuses) => {
    status[key][wing][boss] = true;
  };
}
