import { FC, useState } from "react";
import { useRouteMatch } from "react-router-dom";
import checked from "../../assets/checked.svg";
import cross from "../../assets/cross.svg";
import neutral from "../../assets/neutral.svg";
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

export const ResultsTable = () => {
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
          className={`text-center ${start ? "wing-start" : ""} ${
            end ? "wing-end" : ""
          } ${markStatus === "greyedout" ? "opacity-50" : ""}`}
        >
          <div className="flex w-10 justify-center gap-1">
            {statusType === "normal" && renderStatus(normal[wing]?.[raid])}
            {statusType === "perm" && renderStatus(perm[wing]?.[raid])}
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
