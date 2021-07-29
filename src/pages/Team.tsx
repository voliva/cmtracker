import { Subscribe } from "@react-rxjs/core";
import { FC, FormEvent, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import {
  setFilter,
  setPlayerMarked,
  toggleStatusType,
  triggerRefresh,
  useDateRefreshed,
  useFilter,
  useIsDeleteEnabled,
  usePlayerCount,
  usePlayerIds,
  usePlayerInfo,
  useStatusTypes,
  useTeamName,
} from "./team.state";
import trash from "../assets/trash.svg";
import checked from "../assets/checked.svg";
import neutral from "../assets/neutral.svg";
import cross from "../assets/cross.svg";
import { Card } from "../components/Card";
import { format } from "timeago.js";
import { useEffect } from "react";

export function Team() {
  return (
    <Subscribe fallback="Loading">
      <div className="flex flex-col gap-4">
        <Title />
        <Refresh />
        <Filter />
        <ResultsTable />
        <AddPlayer />
      </div>
    </Subscribe>
  );
}

const Title = () => {
  const name = useTeamName();

  return (
    <Card>
      <h2>Team: {name}</h2>
      <p>Share this URL with your team so that they can add their accounts.</p>
    </Card>
  );
};

const Refresh = () => {
  const teamId = useRouteMatch<{ id: string }>().params.id;
  const refreshDate = useDateRefreshed();
  useRerenderEveryTimediff(refreshDate);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    await fetch(process.env.REACT_APP_SERVER_ROOT + "/refresh/" + teamId, {
      method: "POST",
    });
    setIsRefreshing(false);
    triggerRefresh();
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={refresh}>
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
      <div>Last refresh: {format(refreshDate)}</div>
    </div>
  );
};

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const timeMap = [
  // [x,y] => If it's less than x, then wait y for rerender
  [MINUTE, SECOND],
  [HOUR, MINUTE],
  [DAY, HOUR],
  [Number.POSITIVE_INFINITY, DAY],
];
const useRerenderEveryTimediff = (date: Date) => {
  const [, forceUpdate] = useState(false);
  useEffect(() => {
    const timediff = Date.now() - date.getTime();
    const timeout = timeMap.find(([max]) => timediff < max)![1];
    const token = setTimeout(() => forceUpdate((v) => !v), timeout);
    return () => clearTimeout(token);
  });
};

/// Filter
const Filter = () => {
  const filter = useFilter();
  const statusTypes = useStatusTypes();

  return (
    <div className="flex">
      <input
        className="flex-grow"
        type="Text"
        placeholder="Filter by name"
        value={filter}
        onChange={(evt) => setFilter(evt.target.value)}
      />
      <div className="flex-grow-0 flex-shrink-0 button-group">
        <button
          className={
            statusTypes.normal && !statusTypes.perm ? "bg-green-100" : ""
          }
          onClick={() => toggleStatusType("normal")}
        >
          Normal
        </button>
        <button
          className={
            statusTypes.perm && !statusTypes.normal ? "bg-green-100" : ""
          }
          onClick={() => toggleStatusType("perm")}
        >
          CM
        </button>
      </div>
    </div>
  );
};

/// Results Table
const ResultsTable = () => {
  const ids = usePlayerIds();

  return (
    <div className="overflow-auto flex">
      <table className="table-auto table-results">
        <thead>
          <tr>
            <th></th>
            {wings.map(({ wing, raids }) => (
              <th
                key={wing}
                colSpan={raids.length}
                className="wing-start wing-end"
              >
                {wing}
              </th>
            ))}
          </tr>
          <tr>
            <th>Player</th>
            {raids.map(({ wing, raid, start, end }) => (
              <th
                key={wing + raid}
                className={`${start ? "wing-start" : ""} ${
                  end ? "wing-end" : ""
                }`}
              >
                {raid}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => (
            <PlayerResults key={id} id={id} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PlayerResults: FC<{ id: string }> = ({ id }) => {
  const { info, markStatus } = usePlayerInfo(id);
  const statusTypes = useStatusTypes();
  const deleteEnabled = useIsDeleteEnabled();
  const teamId = useRouteMatch<{ id: string }>().params.id;
  const { name, normal, perm } = info;

  const isMarked = markStatus === "marked";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await fetch(process.env.REACT_APP_SERVER_ROOT + `/team/${teamId}/${id}`, {
      method: "DELETE",
    });
    setIsSubmitting(false);

    triggerRefresh();
  };

  return (
    <tr>
      <td className="z-10">
        <div className="flex items-center pr-5 gap-1">
          <input
            type="checkbox"
            checked={isMarked}
            onChange={(evt) => setPlayerMarked(id, evt.target.checked)}
          />
          <div className="flex-grow">{name}</div>
          {deleteEnabled && !isSubmitting && (
            <img
              alt="delete"
              src={trash}
              className="w-5 absolute right-1 cursor-pointer"
              onClick={handleDelete}
            />
          )}
        </div>
      </td>
      {raids.map(({ wing, raid, start, end }) => (
        <td
          key={wing + raid}
          className={`text-center ${start ? "wing-start" : ""} ${
            end ? "wing-end" : ""
          } ${markStatus === "greyedout" ? "opacity-50" : ""}`}
        >
          <div className="flex w-10 justify-center gap-1">
            {statusTypes.normal && renderStatus(normal[wing]?.[raid])}
            {statusTypes.perm && renderStatus(perm[wing]?.[raid])}
          </div>
        </td>
      ))}
    </tr>
  );
};

const renderStatus = (status: boolean | undefined) => (
  <img
    className="inline-block w-5"
    alt={String(status)}
    src={getStatusSrc(status)}
  />
);

const getStatusSrc = (status: boolean | undefined) => {
  if (status === undefined) {
    return neutral;
  }
  return status ? checked : cross;
};

const AddPlayer = () => {
  const count = usePlayerCount();
  const teamId = useRouteMatch<{ id: string }>().params.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (isSubmitting) return;
    const form = evt.currentTarget;
    const data = new FormData(form);
    const name = data.get("name");
    const apiKey = data.get("apiKey");
    if (typeof name !== "string" || typeof apiKey !== "string") {
      return;
    }

    setIsSubmitting(true);
    const result = await fetch(
      process.env.REACT_APP_SERVER_ROOT + "/team/" + teamId,
      {
        method: "POST",
        body: JSON.stringify({ name, apiKey }),
      }
    ).then((r) => r.json());
    setIsSubmitting(false);

    if (result.id !== undefined) {
      triggerRefresh();
      form.reset();
    } else {
      alert(
        result.error
          ? result.error
          : "Woops - something is not working. Check again another day, sorry!"
      );
    }
  };

  if (process.env.REACT_APP_PLAYER_LIMIT) {
    if (count >= Number(process.env.REACT_APP_PLAYER_LIMIT)) {
      return null;
    }
  }

  return (
    <form
      className="flex flex-row items-center justify-center gap-1 flex-wrap"
      onSubmit={handleSubmit}
    >
      <input type="text" placeholder="Name" name="name" autoComplete="off" />
      <input
        type="text"
        placeholder="API Key"
        name="apiKey"
        autoComplete="off"
      />
      <input
        className={"px-6 " + isSubmitting ? "" : "cursor-pointer"}
        type="submit"
        value={isSubmitting ? "Adding..." : "Add Player"}
        disabled={isSubmitting}
      />
    </form>
  );
};

const raidStructure: Record<string, Array<string>> = {
  W1: ["B1", "E1", "B2", "B3"],
  W2: ["B1", "B2", "B3"],
  W3: ["B1", "B2", "E1", "B3"],
  W4: ["B1", "B2", "B3", "B4"],
  W5: ["B1", "B2", "B3", "B4"],
  W6: ["B1", "B2", "B3"],
  W7: ["E1", "B1", "B2", "B3"],
};
const wings = Object.keys(raidStructure).map((w) => ({
  wing: w,
  raids: raidStructure[w],
}));
const raids = wings.flatMap(({ wing: w, raids }) =>
  raids.map((r, i) => ({
    start: i === 0,
    end: i === raids.length - 1,
    wing: w,
    raid: r,
  }))
);
