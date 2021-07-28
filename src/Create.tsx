import { Card } from "./Card";

export function Create() {
  return (
    <div>
      <Card className="my-4">
        <p>
          This app will let you track the weekly raid status for everyone in
          your team.
        </p>
        <p>
          In here you can create a new empty team. If you are already part of a
          team, please use your team's link instead.
        </p>
      </Card>
      <Card>
        <form className="flex flex-col items-center gap-2">
          <input type="text" placeholder="Team name" />
          <input
            className="px-6 cursor-pointer"
            type="submit"
            value="Create Team"
          />
        </form>
      </Card>
    </div>
  );
}
