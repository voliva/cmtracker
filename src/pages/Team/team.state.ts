import { bind, shareLatest } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { matchPath } from "react-router-dom";
import {
  combineLatest,
  defer,
  distinctUntilChanged,
  filter,
  interval,
  map,
  mapTo,
  merge,
  scan,
  startWith,
  switchMap,
  tap,
} from "rxjs";
import { history$ } from "../../history";

interface TeamInfo {
  name: string;
  players: PlayerInfo[];
  refreshed: number;
}
interface PlayerInfo {
  id: string;
  name: string;
  normal: EncounterInfo;
  perm: EncounterInfo;
}
type EncounterInfo = Record<string, Record<string, boolean>>;

export const [infoRefresh$, triggerRefresh] = createSignal();

const [deleteEnable$, enableDelete] = createSignal();
export const [useIsDeleteEnabled] = bind(
  deleteEnable$.pipe(mapTo(true)),
  false
);
(window as any).enableDelete = enableDelete;

export const [filterChange$, setFilter] = createSignal<string>();
export const [useFilter, filter$] = bind(filterChange$, "");

export const [statusTypeChange$, toggleStatusType] = createSignal<
  "normal" | "perm"
>();
const initialPreference = ((): "perm" | "normal" => {
  const v = localStorage.getItem("statusType");
  if (v === null || v === "null") {
    // String null for backwards-compatibility with an older version
    return "normal";
  }
  return v as "perm" | "normal";
})();

export const [useStatusType] = bind(
  statusTypeChange$.pipe(
    tap((v) => {
      localStorage.setItem("statusType", String(v));
    }),
    startWith(initialPreference)
  )
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
    startWith([] as string[]),
    shareLatest()
  )
);

const teamInfo$ = merge(infoRefresh$, interval(30 * 60 * 1000)).pipe(
  startWith(null),
  switchMap(() =>
    history$.pipe(
      map((history) => matchPath<{ id: string }>(history.pathname, "/:id")!),
      filter((v) => !!v),
      map((v) => v.params.id),
      distinctUntilChanged()
    )
  ),
  switchMap((id) => fetch(process.env.REACT_APP_SERVER_ROOT + "/team/" + id)),
  switchMap((result) => result.json() as Promise<TeamInfo>),
  shareLatest()
);

export const [useTeamName] = bind(teamInfo$.pipe(map((t) => t.name)));
export const [useDateRefreshed] = bind(
  teamInfo$.pipe(map((t) => new Date(t.refreshed)))
);
export const [usePlayerCount] = bind(
  teamInfo$.pipe(map((t) => t.players.length))
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
    info: teamInfo$.pipe(
      map((info) => info.players.find((p) => p.id === id)!),
      filter((v) => !!v)
    ),
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

// Hardcoded data
const raidStructure: Record<string, Array<string>> = {
  W1: ["B1", "E1", "B2", "B3"],
  W2: ["B1", "B2", "B3"],
  W3: ["B1", "B2", "E1", "B3"],
  W4: ["B1", "B2", "B3", "B4"],
  W5: ["B1", "B2", "B3", "B4"],
  W6: ["B1", "B2", "B3"],
  W7: ["E1", "B1", "B2", "B3"],
};
export const wings = Object.keys(raidStructure).map((w) => ({
  wing: w,
  raids: raidStructure[w],
}));
export const raids = wings.flatMap(({ wing: w, raids }) =>
  raids.map((r, i) => ({
    start: i === 0,
    end: i === raids.length - 1,
    wing: w,
    raid: r,
  }))
);

export const [compactToggle$, toggleCompactView] = createSignal();
const initialCompact = localStorage.getItem("compactView") === "true";

export const [useShowCompactView] = bind(
  compactToggle$.pipe(
    scan((acc) => !acc, initialCompact),
    tap((v) => {
      localStorage.setItem("compactView", String(v));
    }),
    startWith(initialCompact)
  )
);
