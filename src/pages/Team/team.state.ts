import { bind, shareLatest } from "@react-rxjs/core";
import {
  combineKeys,
  createKeyedSignal,
  createSignal,
  mergeWithKey,
} from "@react-rxjs/utils";
import { matchPath } from "react-router-dom";
import {
  combineLatest,
  concatMap,
  defer,
  distinctUntilChanged,
  filter,
  from,
  interval,
  map,
  mapTo,
  merge,
  mergeMap,
  scan,
  skip,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
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
  weekly: EncounterInfo;
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

export enum StatusType {
  Normal = "normal",
  Perm = "perm",
  Weekly = "weekly",
}
export const [statusTypeChange$, toggleStatusType] = createSignal<StatusType>();
const initialPreference = ((): StatusType => {
  const v = localStorage.getItem("statusType");
  if (v === null || v === "null") {
    // String null for backwards-compatibility with an older version
    return StatusType.Normal;
  }
  return v as StatusType;
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

const teamId$ = history$.pipe(
  map((history) => matchPath<{ id: string }>(history.pathname, "/:id")!),
  filter((v) => !!v),
  map((v) => v.params.id),
  distinctUntilChanged()
);

const teamInfo$ = merge(infoRefresh$, interval(30 * 60 * 1000)).pipe(
  startWith(null),
  switchMap(() => teamId$),
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

export const [usePlayerIds, playerIds$] = bind(
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

export const [weeklyToggle$, toggleWeeklyValue] = createKeyedSignal<
  string,
  { wing: string; boss: string }
>();

export const [usePlayerInfo, playerInfo$] = bind((id: string) =>
  combineLatest({
    info: mergeWithKey({
      reset: teamInfo$.pipe(
        map((info) => info.players.find((p) => p.id === id)!),
        filter((v) => !!v)
      ),
      weekly: weeklyToggle$(id),
    }).pipe(
      scan((acc, v) => {
        if (v.type === "reset") return v.payload;
        const { boss, wing } = v.payload;
        if (acc.weekly[wing]?.[boss] === undefined) {
          console.warn("Not defined for ", wing, boss);
          return acc;
        }
        acc.weekly[wing][boss] = !acc.weekly[wing][boss];
        return acc;
      }, null! as PlayerInfo)
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

const playerWeeklyChange$ = combineKeys(playerIds$, weeklyToggle$).pipe(
  switchMap((toggles) =>
    from(toggles.changes).pipe(
      mergeMap((id) => playerInfo$(id).pipe(skip(1))),
      withLatestFrom(teamId$),
      concatMap(([{ info }, teamId]) => {
        const { wing, boss } = toggles.get(info.id)!;
        const newValue = info.weekly[wing][boss];

        return fetch(
          process.env.REACT_APP_SERVER_ROOT + "/team/" + teamId + "/" + info.id,
          {
            method: "PATCH",
            body: JSON.stringify({ type: "weekly", wing, boss, newValue }),
          }
        );
      })
    )
  )
);

playerWeeklyChange$.subscribe();

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
