import { Router, Route, Switch } from "react-router-dom";
import { Create } from "./pages/Create";
import { Team } from "./pages/Team";
import { history } from "./history";

function App() {
  return (
    <div className="flex flex-col">
      <h1 className="my-1">GW2 Raid Progress Tracker</h1>
      <Router history={history}>
        <Switch>
          <Route path="/" exact>
            <Create />
          </Route>
          <Route path="/:id">
            <Team />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
