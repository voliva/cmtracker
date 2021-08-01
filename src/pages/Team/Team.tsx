import { Subscribe } from "@react-rxjs/core";
import classNames from "classnames";
import { FormEvent, useEffect, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import { format } from "timeago.js";
import { Card } from "../../components/Card";
import { CompactView } from "./CompactView";
import { ResultsTable } from "./ResultsTable";
import {
  setFilter,
  toggleCompactView,
  toggleStatusType,
  triggerRefresh,
  useDateRefreshed,
  useFilter,
  usePlayerCount,
  useShowCompactView,
  useStatusType,
  useTeamName,
} from "./team.state";

export function Team() {
  return (
    <Subscribe fallback="Loading">
      <div className="flex flex-col gap-4">
        <Title />
        <Refresh />
        <Filter />
        <Results />
        <AddPlayer />
        <Feedback />
      </div>
    </Subscribe>
  );
}

const Results = () =>
  useShowCompactView() ? <CompactView /> : <ResultsTable />;

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

const Filter = () => {
  const filter = useFilter();
  const statusType = useStatusType();
  const showCompact = useShowCompactView();

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
          className={classNames({
            "bg-green-100": statusType === "normal",
          })}
          onClick={() => toggleStatusType("normal")}
        >
          Normal
        </button>
        <button
          className={classNames({
            "bg-green-100": statusType === "perm",
          })}
          onClick={() => toggleStatusType("perm")}
        >
          CM
        </button>
      </div>
      <button
        className={classNames("flex-grow-0", "flex-shrink-0", {
          "bg-green-100": showCompact,
        })}
        onClick={toggleCompactView}
      >
        Compact
      </button>
    </div>
  );
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

const Feedback = () => (
  <div className="text-sm bg-gray-100 p-1 rounded text-gray-800 mt-10">
    <p>Like what you see? Do you have some feedback?</p>
    <p>
      Reach me out in-game [EU] blackoil.2673 or open an issue on{" "}
      <a href="https://github.com/voliva/cmtracker">GitHub</a>.
    </p>
  </div>
);
