import classNames from "classnames";
import { FC, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import trash from "../../assets/trash.svg";
import {
  raids,
  setPlayerMarked,
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
          className={classNames("text-center", {
            "wing-start": start,
            "wing-end": end,
            "opacity-50": markStatus === "greyedout",
            "bg-done":
              (statusType === "normal" && normal[wing]?.[raid] === true) ||
              (statusType === "perm" && perm[wing]?.[raid] === true),
            "bg-missing":
              (statusType === "normal" && normal[wing]?.[raid] === false) ||
              (statusType === "perm" && perm[wing]?.[raid] === false),
            "bg-na":
              (statusType === "normal" && normal[wing]?.[raid] === undefined) ||
              (statusType === "perm" && perm[wing]?.[raid] === undefined),
          })}
        ></td>
      ))}
    </tr>
  );
};
