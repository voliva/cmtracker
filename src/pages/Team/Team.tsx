import { Subscribe } from "@react-rxjs/core";
import classNames from "classnames";
import { FormEvent, useEffect, useState } from "react";
import { format } from "timeago.js";
import { Card } from "../../components/Card";
import { useTeamId } from "../../history";
import { CompactView } from "./CompactView";
import { ResultsTable } from "./ResultsTable";
import {
  setFilter,
  StatusType,
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
  const teamId = useTeamId();

  const isWizardyWiles = window.location.href.includes("wizardly-wiles-8da887");

  return (
    <>
      <Card>
        <h2>Team: {name}</h2>
        <p>
          Share this URL with your team so that they can add their accounts.
        </p>
      </Card>
      {isWizardyWiles ? (
        <Card>
          Important: The raid tracker has moved to a URL with an easier name.
          Your team's updated link is{" "}
          <a href={"https://www.gw2raidtracker.com/" + teamId}>
            www.gw2raidtracker.com/{teamId}
          </a>
        </Card>
      ) : null}
    </>
  );
};

const Refresh = () => {
  const teamId = useTeamId();
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
    <>
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
              "bg-green-100": statusType === StatusType.Normal,
            })}
            onClick={() => toggleStatusType(StatusType.Normal)}
          >
            Normal
          </button>
          <button
            className={classNames({
              "bg-green-100": statusType === StatusType.Weekly,
            })}
            onClick={() => toggleStatusType(StatusType.Weekly)}
          >
            Weekly CM
          </button>
          <button
            className={classNames({
              "bg-green-100": statusType === StatusType.Perm,
            })}
            onClick={() => toggleStatusType(StatusType.Perm)}
          >
            CM Achiev
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
      {statusType === StatusType.Weekly && (
        <Card>
          Unfortunately the GW2 API doesn't provide the progression info for
          weekly CMs yet, but you can manually fill in your completed CMs by
          clicking on the appropriate cell.
        </Card>
      )}
    </>
  );
};

const AddPlayer = () => {
  const count = usePlayerCount();
  const teamId = useTeamId();
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
