import { bind, shareLatest } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { matchPath } from "react-router-dom";
import {
  combineLatest,
  defer,
  delay,
  distinctUntilChanged,
  filter,
  map,
  of,
  scan,
  startWith,
  switchMap,
} from "rxjs";
import { history$ } from "./history";

interface TeamInfo {
  name: string;
  players: PlayerInfo[];
}
interface PlayerInfo {
  id: string;
  name: string;
  normal: EncounterInfo;
  weekly: EncounterInfo;
  perm: EncounterInfo;
}
type EncounterInfo = Record<string, Record<string, boolean>>;

export const [filterChange$, setFilter] = createSignal<string>();
export const [useFilter, filter$] = bind(filterChange$, "");

export const [statusTypeChange$, toggleStatusType] = createSignal<
  "normal" | "weekly" | "perm"
>();
const initialStatusTypes = {
  normal: true,
  weekly: true,
  perm: true,
};
export const [useStatusTypes] = bind(
  statusTypeChange$.pipe(
    scan(
      (acc, type) => ({
        ...acc,
        [type]: !acc[type],
      }),
      initialStatusTypes
    )
  ),
  initialStatusTypes
);

export const [playerMarking$, setPlayerMarked] = createSignal(
  (id: string, marked: boolean) => ({ id, marked })
);
const markedPlayer$ = defer(() =>
  playerMarking$.pipe(
    scan((acc, { id, marked }) => {
      if (marked) {
        acc.add(id);
      } else {
        acc.delete(id);
      }
      return acc;
    }, new Set<string>()),
    map((v) => Array.from(v)),
    startWith([] as string[])
  )
);

const teamInfo$ = history$.pipe(
  map((history) => matchPath<{ id: string }>(history.pathname, "/:id")!),
  filter((v) => !!v),
  map((v) => v.params.id),
  distinctUntilChanged(),
  switchMap(() => {
    return of(mockData()).pipe(delay(200));
  }),
  shareLatest()
);

export const [usePlayerIds] = bind(
  combineLatest({
    teamInfo: teamInfo$,
    filter: filter$,
    markedPlayers: markedPlayer$,
  }).pipe(
    map(({ teamInfo, filter, markedPlayers }) => {
      const players =
        filter === ""
          ? [...teamInfo.players]
          : teamInfo.players.filter((player) =>
              player.name
                .toLocaleLowerCase()
                .includes(filter.toLocaleLowerCase())
            );

      if (markedPlayers.length) {
        players.sort((p1, p2) => {
          const p1v = markedPlayers.includes(p1.id) ? 1 : 0;
          const p2v = markedPlayers.includes(p2.id) ? 1 : 0;
          return p2v - p1v;
        });
      }

      return players.map((p) => p.id);
    })
  )
);

export const [usePlayerInfo] = bind((id: string) =>
  combineLatest({
    info: teamInfo$.pipe(map((info) => info.players.find((p) => p.id === id)!)),
    markStatus: combineLatest({
      marked: markedPlayer$,
      filter: filter$,
    }).pipe(
      map(({ marked, filter }) =>
        marked.includes(id)
          ? "marked"
          : marked.length === 0 || filter !== ""
          ? "unmarked"
          : "greyedout"
      ),
      distinctUntilChanged()
    ),
  })
);

function mockData(): TeamInfo {
  return {
    name: "KOM",
    players: [createPlayer("Oli"), createPlayer("Ulrick")],
  };

  function createPlayer(name: string) {
    return {
      id: "uuid" + name,
      name,
      normal: {
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
      },
      weekly: {
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
      },
      perm: {
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
      },
    };
  }
}
