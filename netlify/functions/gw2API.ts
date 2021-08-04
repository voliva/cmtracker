import { format, isAfter, startOfWeek, subWeeks } from "date-fns";
import fetch from "node-fetch";

/*
Weekly CM 5455 // => Doesn't exist
*/
export type Status = Record<string, Record<string, boolean>>;
export interface Statuses {
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
export async function requestPlayerStatus({
  id,
  apiKey,
}: {
  id: number;
  apiKey: string;
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
      console.error("achievementsP", err);
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
      console.error("weeklyP", err);
      return [] as string[];
    });

  const lastResetP = fetch(
    "https://api.guildwars2.com/v2/account?v=2019-02-21T00:00:00Z",
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  )
    .then((result) => result.json())
    .then((result) => new Date(result.last_modified))
    .catch((err) => {
      console.error("lastResetP", err);
      return new Date();
    });

  const [achievements, progression, lastReset] = await Promise.all([
    achievementsP,
    weeklyP,
    lastResetP,
  ]);

  const statuses: Statuses = {
    normal: createStatus(),
    perm: createCMStatus(),
  };

  achievements.forEach((a) => achievementMap[a.id](statuses));
  // progression might give values which were not reset because the user
  // hasn't logged in yet. In that case, don't populate the progression table.
  if (isAfter(lastReset, getLastReset())) {
    progression.forEach((p) => progressionMap[p](statuses));
  }

  return { id, ...statuses };
}

export function createStatus(): Status {
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
export function createCMStatus(): Status {
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

export function getLastReset() {
  const now = Date.now();
  // Weekly reset happens on monday 7:30 UTC
  const monday = startOfWeek(now);
  // I could add 7hr 30m, but I think this will fail on days with daylight saving changes
  // I'll format to an ISO string date with that value set, as reset happens relative to UTC.
  const reset = new Date(format(monday, "yyyy-MM-dd") + "T07:30:00Z");
  if (isAfter(reset, now)) {
    // The monday before reset we would get the next reset. We want the previous one.
    return subWeeks(reset, 1);
  }
  return reset;
}
