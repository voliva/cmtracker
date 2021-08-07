import classNames from "classnames";
import { FC, useState } from "react";
import tick from "../../assets/tick_small.svg";
import trash from "../../assets/trash.svg";
import { useTeamId } from "../../history";
import {
  raids,
  setPlayerMarked,
  StatusType,
  toggleWeeklyValue,
  triggerRefresh,
  useIsDeleteEnabled,
  usePlayerIds,
  usePlayerInfo,
  useStatusType,
  wings,
} from "./team.state";

export const CompactView = () => {
  const ids = usePlayerIds();

  return (
    <div className="overflow-auto flex">
      <table className="table-auto table-results table-results-compact m-auto">
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
                {raid.startsWith("E") ? "E" : raid.replace("B", "")}
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
  const statusType = useStatusType();
  const deleteEnabled = useIsDeleteEnabled();
  const teamId = useTeamId();
  const { name, normal, perm, weekly } = info;

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

  const toggleCell = (wing: string, boss: string) => {
    if (statusType !== StatusType.Weekly) {
      return;
    }
    toggleWeeklyValue(id, { wing, boss });
  };

  return (
    <tr>
      <td className="z-10">
        <div className="flex items-center pr-5 gap-1">
          <input
            type="checkbox"
            checked={isMarked}
            aria-label="Select to top group"
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
      {raids.map(({ wing, raid, start, end }) => {
        const value =
          statusType === StatusType.Normal
            ? normal[wing]?.[raid]
            : statusType === StatusType.Weekly
            ? weekly[wing]?.[raid]
            : perm[wing]?.[raid];
        const status =
          value === true ? "done" : value === false ? "missing" : "na";

        return (
          <td
            key={wing + raid}
            className={classNames("text-center bg-center bg-no-repeat", {
              "wing-start": start,
              "wing-end": end,
              "opacity-50": markStatus === "greyedout",
              "cursor-pointer":
                statusType === StatusType.Weekly &&
                weekly[wing]?.[raid] !== undefined,
              "bg-done": status === "done",
              "bg-missing": status === "missing",
              "bg-na": status === "na",
            })}
            style={{
              backgroundImage: `url(${status === "done" ? tick : ""})`,
              backgroundSize: "70%",
            }}
            onClick={() => toggleCell(wing, raid)}
          ></td>
        );
      })}
    </tr>
  );
};
