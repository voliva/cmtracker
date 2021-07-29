# GW2 Raid Progress Tracker

This app will let you track the weekly raid status for everyone in your team.

This is in early development, "use at your own risk". You can try it by using this [public demo](https://wizardly-wiles-8da887.netlify.app/305485456878862536) (this link might break in a future).

Please, deploy your own instance to use this.

## Deployment

This project is built to be deployed with [Netlify](https://www.netlify.com/) + [Fauna](https://fauna.com/)

### Fauna config

1. Login or create a Fauna account.
2. Create a new database in Fauna. Note that depending on the region you pick, you will need to select a specific endpoint later on.
3. Create a new collection in that database with the name `teams`.
4. In the "Security" tab of the dashboard, create a new Key with CRUD rights to that database (or just pick role "server" if you don't care). Note down the secret key.

### Netlify config

1. Login or create a Netlify account
2. Create a new site with this app (either fork this repo and use your fork, or download as zip and upload to Netlify).
3. On the site settings add the following environment variables (while creating they're hidden under Advanced):

- `FAUNA_KEY`: The secret key from Fauna
- `FAUNA_DOMAIN`: The fauna endpoint based on the database region you selected. Endpont list can be found in [Fauna docs](https://docs.fauna.com/fauna/current/api/fql/region_groups#how-to-use-region-groups)
- `REACT_APP_SERVER_ROOT`:
  `/.netlify/functions`
- `TEAM_LIMIT`: (optional) a number to limit the number of teams that can be created on this environment.
- `REACT_APP_PLAYER_LIMIT`: (optional) a number to limit the number of players that each team can have on this environment
