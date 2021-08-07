import { createBrowserHistory } from "history";
import { shareLatest } from "@react-rxjs/core";
import { Observable } from "rxjs";
import { useRouteMatch } from "react-router-dom";

export const history = createBrowserHistory();

export const history$ = new Observable<typeof history["location"]>(
  (observer) => {
    observer.next(history.location);
    const historySubs = history.listen(() => {
      observer.next(history.location);
    });
    return historySubs;
  }
).pipe(shareLatest());

history$.subscribe();

export const useTeamId = () => useRouteMatch<{ id: string }>().params.id;
