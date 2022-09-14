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
  // get top 66 users
  await server.loadDiscordUsers()
  var guild = server.client.guilds.cache.get(server.Id)
  let mindless = await guild.roles.cache.get(server.Roles.TrueBeliever).members.map(m=>m.id)
  for(const cultist of mindless){
    console.log("assigning key to:", cultist)
    let user = await server.db.collection("users").findOne({ 'discord.userid': cultist })
    console.log(user.discord.userid, user.discord.name, "num keys already:", user.allowlists)
    await server.db.collection("users").updateOne({'discord.userid': user.discord.userid}, {$set: {'corrupted_keys': 1}})
  }
  console.log("num users:", mindless.length)
}

async function assignConjuringKeys() {
  assignZealotKeys()
  return
  await server.loadDiscordUsers()
  let date = new Date('2022-08-19T04:01:02.825Z') // lastChapterEndTime()
  // let basepath = `./data/checkpoints/checkpoint-${date.toISOString()}`
  let basepath = `./data/checkpoints/checkpoint-2022-08-19T04-01-02.825Z`
  let cults = checkpoint.loadCults(basepath)  
  console.log("cults:", cults)
  cults.sort((a, b) => {
    return  b.score - a.score
  })
  console.log("cults:", cults)
  
  const WINNER_SLICE = 50
  const LOSER_SLICE = 30
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
        cultUsers[row.cult].push(_user)
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