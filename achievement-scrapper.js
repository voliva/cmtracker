const fs = require("fs");
const fetch = require("node-fetch");

const achievements = fs.existsSync("./achievements.json")
  ? JSON.parse(fs.readFileSync("./achievements.json"))
  : {};

async function run() {
  let page = Number(process.argv[2]) || 0;
  while (true) {
    console.log("fetching page", page);

    const result = await fetch(`https://api.guildwars2.com/v2/achievements?page=${page}`)
      .then(result => result.json());

    if (result.text) {
      break;
    }

    result.forEach(r => {
      achievements[r.id] = r;
    })
    page++;
  }
}

run().catch(() => { }).then(() => {
  fs.writeFileSync('./achievements.json', JSON.stringify(achievements, null, 2));
});
