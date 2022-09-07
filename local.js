const { clients, KeeperClient, TRIGGER_MODE } = require('./client/client')
const { server } = require('./server')
const Database = require("@replit/database");
const { MongoClient } = require('mongodb')

const dotenv = require('dotenv');
dotenv.config()

let mongo = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
server.setDB(mongo.db("general"))

const allReadyCallback = async () => {
  console.log("logged in")
  await server.Cults.init(server, readOnly = false)
  // scripting code goes here
}

clients.init( [
    new KeeperClient(process.env.TOKEN_2, TRIGGER_MODE.none)
  ],
  allReadyCallback
)

console.log("connecting to mongo...")
mongo.connect(async err => {
  if(err){
    console.log("mgo connect err:", err)
    return
  }
  console.log("connected to mongo")
  // server.setClient(clients.getAll()[1].client)
  console.log("logging in")
  clients.start()
})
