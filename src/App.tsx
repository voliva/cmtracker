import { Router, Route, Switch } from "react-router-dom";
import { Create } from "./Create";
import { Team } from "./Team";
import { history } from "./history";

function App() {
  return (
    <div className="flex flex-col">
      <h1 className="my-1">Raid Tracker</h1>
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
