const { server } = require('../../server')
const { stats } = require('../stats')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const { gaussian, weightedRandomSelect, adjustRarities, normalizeWeights, RandGenerator, hashString } = require('../../utils/rand')
const csv = require('csv-parser')
const fs = require('fs')
const { lastChapterEndTime } = require("../state")

const { checkpoint } = require('./checkpoint')

var DO_KEYS = false

async function firstChantUsers(start, end) {
  start = new Date('2022-08-25T22:26:40.664Z')
  end = lastChapterEndTime()
  console.log("start:", start, "end:", end)
  let users = new Set()
  
  while(users.size < 666) {
    let events = await server.db.collection("events").find(
      { 
        'event': 'chant',
        timestamp: {$gte: start, $lt: end }
      }
    ).limit(2000).sort({'timestamp': 1}).toArray()
    for (var event of events) {
      if(users.size >= 666){
        break
      }
      users.add(event.metadata.user)
    }
    console.log("num events:", events.length, "num users:", users.size)
    start = events[events.length - 1].timestamp
  }
  let cultists = []
  for (var id of users) {
    let member = await server.getUser(id)
    if(!member ){
      console.log('no member:', id)
      continue
    }
    cultists.push(member)
  }
  console.log("cultists:", cultists.map(c => `${c.discord.name} ${c.discord.id} ${c.allowlists}`))
  console.log("num names:", cultists.length)
  if(DO_KEYS){
    for(const cultist of cultists){
     console.log("assigning key to:", cultist.discord.name, "with current allowlists:", cultist.allowlists) 
    //  await server.db.collection("users").updateOne({'discord.userid': cultist.discord.userid}, {$inc: {'allowlists': 1}})
    }
  }
}

async function first10ChantUsers() {
  let date = lastChapterEndTime()
  let users = await server.db.collection("users").aggregate([
    { $project: { _id: 0, discord: 1, allowlists: 1, last: { $slice: [ "$history", -1 ] } } },
    { $match: { 'last.created': date, 'last.num_chants': {$gte: 10} } },
    {
      $sort: {
        'last.num_chants': -1
      }
    },
    {
      $limit: 666
    }
 ]).toArray()
  console.log("users:", users.map(c => `${c.discord.name} ${c.discord.id} ${c.allowlists}`))
  console.log("num users:", users.length)
  if(DO_KEYS){
    for(const cultist of users){
      console.log("assigning key to:", cultist.discord.name, "with current allowlists:", cultist.allowlists) 
      // await server.db.collection("users").updateOne({'discord.userid': cultist.discord.userid}, {$inc: {'allowlists': 1}})
     }
  }
}

async function assignZealotKeys() {
  return
  // get top 66 users
  await server.loadDiscordUsers()
  var guild = server.client.guilds.cache.get(server.Id)
  let mindless = await guild.roles.cache.get(server.Roles.MindlessZealot).members.map(m=>m.id)
  var total = 0
  for(const cultist of mindless){
    console.log("assigning key to:", cultist)
    let user = await server.db.collection("users").findOne({ 'discord.userid': cultist })
    console.log(user.discord.userid, user.discord.name, "num keys already:", user.allowlists)
    if(user.allowlists >= 2){
      continue
    }
    // total++
    await server.db.collection("users").updateOne({'discord.userid': user.discord.userid}, {$inc: {'allowlists': 1}})
    // await server.db.collection("users").updateOne({'discord.userid': user.discord.userid}, {$set: {'corrupted_keys': 1}})
  }
  console.log("num users:", mindless.length, total)
}

async function assignWLKeys() {
  var wallets = [
    // lasercats
    "0x768C26E52234A0eFdf77A033549FC074A6ff1663",
    "0xDFAc20549b005CFb16231278AeaA6e579550bd6C",
    "0x460252106797b16857D236a9AbF4682283207Cf3",
    "0xE56507AA1f25588c88aA44d52A1dC29E6dAd3322",
    "0x63e649Aab85200B4F128F657df4e17102abfc78E",
    "0xf7615ffc2694794ed2812a3DA3c0D14Ae13539C3",
    "0xF5d20eF7C20bfA4166226f802D230c7336349974",
    "0x00ED3fa9C29EB984291e6AC70B68955ff0a5A113",
    "0x0eE3e15B896706394C938F90c266EEc912e10bb9",
    "0x0D7712F5593B0D78F0F5182BFd365C4Cd6e999DD",
    "0xE7486438FB41c2D583514Aa344B16E5Db21FBC34",
    "0x1Cd5c81f65c568a8E73473784c34964E2412b421",
    "0x3371f5c5cA2B7921e92F77177853F4F7341C8792",
    "0x8Fe00bA1Ce9563F063220b3B3b8c4F94097C933C",
    "0x155c4865F55d9825B0512Fc185b518f65fb2EC5e",
    "0x51d9E4137b08A0c740E3c5F1ef87dfE0FDe546ba",
    "0xccAF3DF1Bf81E6C96cCBAD705ECd24D6C7e6065E",
    "0xA554ECBA31431c3AFED2E6D8F082A7F0129C97cf",
    "0x51562e8a0eff24D47Fc3BACcff2Fd458CE3B5F61",
    "0x24C4bF2E24FA2aDd5B2bc4585F8bD7bDF2Ee54d1",
    "0xAF0e59Fa1c58008549ADD4ae75c3b838c2910C2b",
    "0xCF0EBf1402cd545f12b601B83ca8F1f616c898B1",
    "0xD1C5c031F5EcDE1b4d16F5172b1B86dab2171DbC",
    "0x0D5c395f88bD35028763e04E201446759A0D6D05",
    "0xfdE6b490c8494B81a116120B4D0C60ECB7a6b076",
    // blits,
    "0xd01f50d6540104ead6ce57115b5e4999bc1ad2da",
    "0xae61a4278f5e106ffb06664861fdc47fa80aba2f",
    "0x6a41f4c9fb972b867b87b8e4e00471084eb64ee5",
    "0x340dc2e57d64e4f8a7010eb347fd1ca1b18bf935",
    "0xa2fa6144168751d116336b58c5288feaf8bb12c1",
    "0x46c6e9956aa122045e13c84630853915b01a80e1",
    "0x4a0018c28570d4b5d14db76cc9d649b560fb49a5",
    "0xf503c4cac2b5a27f68eee197efb94e6fdeaa48d1",
    "0xe19558d2b3fabb5c045ddf3b44dc15de18e9cd20",
    "0x7250982aee4667254a47916dc4523537ee59fe8b",
    "0x75e1bec21ad7c4e94cc4512d876e52f0b7293820",
    "0xf43e468e6e39f490e7198cde92c6995e843ef4c5",
    "0xf627e5f4bad95a956468d8bb6ee20b119f992e96",
    "0x54372e2b338c4be299b75cb54d914822db32a63f",
    "0x5289156f8b0876e7576fe960e39a3e84c90d821f",
    "0x72fe708527b3191790295a45f978b6b459da15ef",
    "0xd7ac4581ef4e2bb6cc3734da183b981bfd0ee2a2",
    "0xf83a68df6ddaf64a418acd925b6cde332a885365",
    "0xa5d981BC0Bc57500ffEDb2674c597F14a3Cb68c1",
    "0x4e0d37be65ae69efd4d8f7f1aae5cd1f37f4c280",
    "0x3d9fe7337f067dd52d1dc8cb45490b1ad6c2f65b",
    "0xb9556d93ccfa3cc4d66cc9a3d426ecd7a2f21bbb",
    "0x0dd189d8a05d4c7308aa5e08dba80ed57b9a5fbd",
    "0xf0c10e3a5e45cfec080e458b9b76dbcf3000ec96",
    "0x75d4bdbf6593ed463e9625694272a0ff9a6d346f",
    "0xECF542C31d2d3A8Bce3C6a0FFe15EA53c2D080E6",
    "0xF296178d553C8Ec21A2fBD2c5dDa8CA9ac905A00"

  ]
  for (const address of wallets){
    let user = await server.db.collection("users").findOne({ 'address': address })
    if(!user){
     user = {
      address: address,
      allowlists: 1
     } 
     console.log("would insert user:", user)
    //  await server.db.collection("users").insertOne(user)
    } else {
      if(!user.allowlists){
        user.allowlists = 0
      }
      user.allowlists += 1
      // console.log("would add allowlist to user:", user)
      // await server.db.collection("users").updateOne({'discord.userid': user.discord.userid}, {$set: {'allowlists': user.allowlists}})
    }
    
  }
}

async function assignConjuringKeys() {
  // return
  // await server.db.collection("users").insertOne({address: '0xc485712B3d7873D39928719B15D9BBdB92288D1C', allowlists:9})
  assignWLKeys()
  return
  await server.loadDiscordUsers()
  let date = new Date('2022-09-08T19:10:16.965Z') // lastChapterEndTime()
  let basepath = `./data/checkpoints/checkpoint-${date.toISOString()}`
  // let basepath = `./data/checkpoints/checkpoint-2022-08-19T04-01-02.825Z`
  let cults = checkpoint.loadCults(basepath)  
  console.log("cults:", cults)
  cults.sort((a, b) => {
    return  b.score - a.score
  })
  console.log("cults:", cults)
  
  const WINNER_SLICE = 50
  const LOSER_SLICE = 0
  let winner = cults[0]
  let losers = cults.slice(1)
  let sum = 0
  for(const cult of losers){
    cult.score = Number(cult.score)
    sum += cult.score 
  }
  for(const cult of losers){
   cult.weight = cult.score / sum 
   cult.keys = LOSER_SLICE * cult.weight
  }
  winner.keys = WINNER_SLICE
  console.log("cults:", cults)
  // return
  let cultUsers = {}
  for(const cult of cults){
   cultUsers[cult.id] = []
  }
  fs.createReadStream(`${basepath}-users.csv`)
    .pipe(csv())
    .on('data', (row) => {
      console.log(row);
      if ( row.id !== "" && row.coins != 'NaN' && row.cult != "") {
        let _user = {
          value: row.id,
          weight: row.points == 0 ? 1 : Math.pow(row.points * 2, 2),
          points: row.points,
          keys: 0
        }
        if(row.cult in cultUsers){
          cultUsers[row.cult].push(_user)
        }
      }
    })
    .on('end', async () => {
      for(const cult of cults){
        
      
        let users = cultUsers[cult.id]
        console.log('CSV file successfully processed');
        normalizeWeights(users)
        let blacklist = new Set()
        for (var i = 0; i < cult.keys; i++) {
          while(true) {
            var next = weightedRandomSelect(Math.random(), users)
            if(blacklist.has(next.value)){
              continue
            }
            if(next.points == 0){
              continue
            }
            next.keys++
            if(next.keys >= 4){
              blacklist.add(next.value)
            }
            break
          }
        }
        // console.log("num:", users.length)
        // console.log("num:", users.length, "users:", users)
        let numWithKeys = 0, numWith10Keys = 0, totalKeys = 0
        for (var user of users) {
          if (user.keys == 0) {
            continue
          }
          numWithKeys++
          if (user.keys >= 10) {
            numWith10Keys++
          }
          totalKeys += user.keys
          let member = server.getMember(user.value)
          console.log("userid:", user.value, "name:", member ? member.displayName : 'n/a', "numkeys:", user.keys, 'points:', user.points)
          await server.db.collection("users").updateOne({ 'discord.userid': user.value }, { $inc: { allowlists: user.keys } })
        }
        console.log("done", "cult:", cult.name, "numWithKeys:", numWithKeys, "numWith10Keys:", numWith10Keys, "totalKeys:", totalKeys)
      }
      
    });
}

async function assignKeys(date) {
  assignConjuringKeys()
  return
  if(!date){
    throw new Error("no date provided")
  }
  date = '2022-08-19T04-01-02.825Z'
  console.log("date:", date)
  
  
  // load cults
  let basepath = `./data/checkpoints/checkpoint-${date}`
  // let basepath = `./data/checkpoints/checkpoint-${date.toISOString()}`
  let cults = checkpoint.loadCults(basepath)  
  console.log("cults:", cults)
  cults.sort((a, b) => {
    return a.score - b.score
  })
  console.log("cults:", cults)
  // await first10ChantUsers()
  await firstChantUsers()
  return
  
  // users with first 666 chants
  
//   1007387236343492638,culivanis,1.802690441780327,549.20,73
// 972639993635938344,minas kin,2.088296402119564,601.60,70
// 973532685479854110,orodruin,1.7238164782123928,496.60,70
// 973532570266533898,vos silan,1.0164030561803126,276.20,67

  // assign 50 keys to winners
  // assgin 30 keys to loser cults, weighted by cult scores relative to each other
  // assign zealot keys manually
  // await server.db.collection("users").updateOne({ 
  //   'discord.userid': user.value 
  // }, { $inc: { allowlists: 1 } })
  let cultId = '972639993635938344'
  let users = []
  let cultUsers = { '1007387236343492638': [], '972639993635938344': [], '973532685479854110': [], '973532570266533898': []}
  basepath = `./data/checkpoints/checkpoint-2022-08-19T04-01-02.825Z-users.csv`
  fs.createReadStream(basepath)
    .pipe(csv())
    .on('data', (row) => {
      console.log(row);
      if ( row.id !== "" && row.coins != 'NaN') {
        let _user = {
          value: row.id,
          weight: row.points == 0 ? 1 : Math.pow(row.points * 2, 1.2),
          points: row.points,
          keys: 0
        }
        cultUsers[row.cult].push(_user)
      }
    })
    .on('end', async () => {
      let users = cultUsers[cultId]
      console.log('CSV file successfully processed');
      normalizeWeights(users)
      for (var i = 0; i < 50; i++) {
        var next = weightedRandomSelect(Math.random(), users)
        next.keys++
      }
      // console.log("num:", users.length)
      console.log("num:", users.length, "users:", users)
      for (var user of users) {
        if (user.keys == 0) {
          continue
        }
        console.log("userid:", user.value, "numkeys:", user.keys)
        // await server.db.collection("users").updateOne({ 'discord.userid': user.value }, { $inc: { allowlists: user.keys } })
      }
      console.log("done")
      
      
    });
}

exports.keys = {
  assignKeys: assignKeys
}