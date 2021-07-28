// import { useRouteMatch } from "react-router-dom";

export function Team() {
  // const { params } = useRouteMatch<{ id: string }>();
  // const { id } = params;
  return (
    <div className="flex flex-col gap-4">
      <Filter />
      <ResultsTable />
      <AddPlayer />
    </div>
  );
}

/// Filter
const Filter = () => {
  return (
    <div className="flex">
      <input className="flex-grow" type="Text" placeholder="Filter by name" />
      <div className="flex-grow-0 flex-shrink-0 button-group">
        <button>Normal</button>
        <button>Weekly CM</button>
        <button>Perm CM</button>
      </div>
    </div>
  );
};

/// Results Table
const ResultsTable = () => (
  <div className="overflow-auto flex">
    <table className="table-auto table-results">
      <thead>
        <tr>
          <th></th>
          <th colSpan={4}>W1</th>
          <th colSpan={3}>W2</th>
          <th colSpan={4}>W3</th>
          <th colSpan={4}>W4</th>
          <th colSpan={4}>W5</th>
          <th colSpan={3}>W6</th>
          <th colSpan={4}>W7</th>
        </tr>
        <tr>
          <th>Player</th>
          {/* W1 */}
          <th>B1</th>
          <th>E1</th>
          <th>B2</th>
          <th>B3</th>
          {/* W2 */}
          <th>B1</th>
          <th>B2</th>
          <th>B3</th>
          {/* W3 */}
          <th>B1</th>
          <th>B2</th>
          <th>E1</th>
          <th>B3</th>
          {/* W4 */}
          <th>B1</th>
          <th>B2</th>
          <th>B3</th>
          <th>B4</th>
          {/* W5 */}
          <th>B1</th>
          <th>B2</th>
          <th>B3</th>
          <th>B4</th>
          {/* W6 */}
          <th>B1</th>
          <th>B2</th>
          <th>B3</th>
          {/* W7 */}
          <th>E1</th>
          <th>B1</th>
          <th>B2</th>
          <th>B3</th>
        </tr>
      </thead>
      <tbody>
        <PlayerResults />
      </tbody>
    </table>
  </div>
);

const PlayerResults = () => {
  return (
    <tr>
      <td>Oli</td>
      {/* W1 */}
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      {/* W2 */}
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      {/* W3 */}
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      {/* W4 */}
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      {/* W5 */}
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      {/* W6 */}
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      {/* W7 */}
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
      <td>0 1 0</td>
    </tr>
  );
};

/// Add Player
const AddPlayer = () => {
  return (
    <form className="flex flex-row items-center justify-center gap-1 flex-wrap">
      <input type="text" placeholder="Name" />
      <input type="text" placeholder="API Key" />
      <input className="px-6 cursor-pointer" type="submit" value="Add Player" />
    </form>
  );
};
