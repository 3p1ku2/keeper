const { interactionHandler } = require('./client/interaction')
const { clients, KeeperClient, TRIGGER_MODE } = require('./client/client')
const { stats } = require('./game/stats')
const { vote } = require('./game/vote')
const { runReferralsCounter, runPurgatory } = require('./game/recruit')
const { batch } = require('./game/batch')
const { loadState } = require('./game/state')
const { server } = require('./server')
const { MongoClient } = require('mongodb')
const express = require('express')

const dotenv = require('dotenv')
dotenv.config()

const Web3 = require('web3');
const web3 = new Web3(process.env.WEB3_URI)

var exec = require('child_process').exec
const { spells_game } = require('./spells/controller')
const { manager } = require('./game/manager')
const { clock } = require('./game/clock')
const { homecoming } = require('./game/homecoming')
const { sortinghat } = require('./discord/sortinghat')
const { extensions } = require('./extensions/extensions')

const uri = process.env.MONGO_URI
console.log("mongo uri:", uri, "token:", process.env.TOKEN)

let mongo = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
server.setDB(mongo.db("general"))

async function initMessageCache() {
  var guild = await server.client.guilds.cache.get(server.Id)
  var cultChannels = server.Cults.channelIds()
  try {
    let channels = guild.channels.cache
    for (const channel of channels.values()) {
      if (channel.type != 'GUILD_TEXT') {
        continue
      }
      var dungeonIds = server.Cults.dungeonIds()
      dungeonIds.push(server.channels.DungeonSectionId)
      if(channel.parentId && dungeonIds.includes(channel.parentId)){
      // if (channel.parentId in server.Cults.values().map( cult => cult.channels.DungeonChannelId)) {
        continue
      }
      let _lastMsg = 0;
      while (true) {
        let messages = await channel.messages.fetch({
          limit: 99,
          after: _lastMsg
        })
        messages = [...messages.values()]
        if (messages.length == 0) {
          break;
        }
        if (!cultChannels.includes(channel.id)) {
          break
        }
        _lastMsg = messages[0].id
      }
      console.log("loaded channel:", channel.name)
    }
  } catch (error) {
    console.log(error)
  }
}

var loggedIn = false
const allReadyCallback = async () => {
  console.log('Ready!');
  loggedIn = true
  await server.loadDiscordUsers()
  await vote.init(server)
  await server.Cults.init(server)
  await stats.init()
  runPurgatory(server)

  clock.run()
  initMessageCache()
  for (const cult of server.Cults.values()) {
    console.log("cult:", cult.name, "num-members:", cult.countMembers(server))
  }
  
  // await batch.migrate()
  interactionHandler.init(server)
  await spells_game.init(server)
  await sortinghat.init()
  await homecoming.init()
  await extensions.init()
  runReferralsCounter(server)
  spells_game.run(server)
  manager.run()
  extensions.run()
}

clients.init(
  [
    new KeeperClient(process.env.TOKEN, TRIGGER_MODE.commands | TRIGGER_MODE.members | TRIGGER_MODE.messages | TRIGGER_MODE.logs),
    new KeeperClient(process.env.TOKEN_2, TRIGGER_MODE.none)
  ],
  allReadyCallback
)

console.log("connecting to mongo...")
mongo.connect(async err => {
  if (err) {
    console.log("mgo connect err:", err)
  }
  console.log("loading state...")
  await loadState(server.kvstore)
  console.log("loading state done")
  console.log("logging in")
  clients.start()
  return
})


// handle gcloud health check
const app = express()
const port = 8080

app.get('/', (req, res) => {
  res.send('alive')
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})

setTimeout(() => {
  if (!loggedIn) {
    exec("kill 1", function(error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }
    })
  }
}, 30000)


