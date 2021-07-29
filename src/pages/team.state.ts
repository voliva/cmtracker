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
import { history$ } from "../history";

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
const initialPreference = (() => {
  const v = localStorage.getItem("statusType");
  if (v === null) {
    return "normal";
  }
  if (v === "null") {
    return null;
  }
  return v;
})();

const selectedStatusType$ = statusTypeChange$.pipe(
  scan(
    (acc, type) => (acc === type ? null : type),
    initialPreference as "normal" | "perm" | null
  ),
  tap((v) => {
    localStorage.setItem("statusType", String(v));
  }),
  startWith(initialPreference)
);

export const [useStatusTypes] = bind(
  selectedStatusType$.pipe(
    map((v) => {
      if (!v) {
        return {
          normal: true,
          perm: true,
        };
      }
      return {
        normal: false,
        perm: false,
        [v]: true,
      };
    })
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
    startWith([] as string[])
  )
);

const teamInfo$ = merge(infoRefresh$, interval(5 * 60 * 1000)).pipe(
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
