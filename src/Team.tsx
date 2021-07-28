// import { useRouteMatch } from "react-router-dom";

import { Subscribe } from "@react-rxjs/core";
import { FC, FormEvent, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import {
  setFilter,
  setPlayerMarked,
  toggleStatusType,
  triggerRefresh,
  useFilter,
  usePlayerIds,
  usePlayerInfo,
  useStatusTypes,
} from "./team.state";

export function Team() {
  return (
    <Subscribe fallback="Loading">
      <div className="flex flex-col gap-4">
        <Filter />
        <ResultsTable />
        <AddPlayer />
      </div>
    </Subscribe>
  );
}

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
          className={statusTypes.normal ? "bg-green-100" : "bg-yellow-100"}
          onClick={() => toggleStatusType("normal")}
        >
          Normal
        </button>
        <button
          className={statusTypes.perm ? "bg-green-100" : "bg-yellow-100"}
          onClick={() => toggleStatusType("perm")}
        >
          Perm CM
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
              <th key={wing} colSpan={raids.length}>
                {wing}
              </th>
            ))}
          </tr>
          <tr>
            <th>Player</th>
            {raids.map(({ wing, raid }) => (
              <th key={wing + raid}>{raid}</th>
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
  const { name, normal, perm } = info;

  const isMarked = markStatus === "marked";

  return (
    <tr className={markStatus === "greyedout" ? "opacity-50" : ""}>
      <td>
        <input
          type="checkbox"
          checked={isMarked}
          onChange={(evt) => setPlayerMarked(id, evt.target.checked)}
        />
        {name}
      </td>
      {raids.map(({ wing, raid }) => (
        <td key={wing + raid} className="text-center">
          {statusTypes.normal && renderStatus(normal[wing]?.[raid])}
          {statusTypes.perm && renderStatus(perm[wing]?.[raid])}
        </td>
      ))}
    </tr>
  );
};

const renderStatus = (status: boolean | undefined) => {
  if (status === undefined) {
    return "-";
  }
  return status ? 1 : 0;
};

/// Add Player
const AddPlayer = () => {
  const teamId = useRouteMatch<{ id: string }>().params.id;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
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
        "Woops - something is not working. Check again another day, sorry!"
      );
    }
  };

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
  raids.map((r) => ({
    wing: w,
    raid: r,
  }))
);
