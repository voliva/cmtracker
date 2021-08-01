import { FormEvent, useState } from "react";
import { Card } from "../components/Card";
import { history } from "../history";

export function Create() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (isSubmitting) return;
    const data = new FormData(evt.currentTarget);
    const name = data.get("name");
    if (typeof name !== "string") {
      return;
    }

    setIsSubmitting(true);
    const result = await fetch(process.env.REACT_APP_SERVER_ROOT + "/team", {
      method: "POST",
      body: JSON.stringify({ name }),
    }).then((r) => r.json());
    setIsSubmitting(false);

    if (result.id) {
      history.push("/" + result.id);
    } else {
      alert(
        result.error
          ? result.error
          : "Woops - something is not working. Check again another day, sorry!"
      );
    }
  };

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
        <p>
          Please, consider deploying your own version of this app by following
          the steps posted in{" "}
          <a href="https://github.com/voliva/cmtracker">GitHub</a>.
        </p>
      </Card>
      <Card>
        <form
          className="flex flex-col items-center gap-2"
          onSubmit={handleSubmit}
        >
          <input
            disabled={isSubmitting}
            type="text"
            placeholder="Team name"
            name="name"
            autoComplete="off"
          />
          <input
            disabled={isSubmitting}
            className={"px-6 " + isSubmitting ? "" : "cursor-pointer"}
            type="submit"
            value={isSubmitting ? "Creating team..." : "Create Team"}
          />
        </form>
      </Card>
    </div>
  );
}
