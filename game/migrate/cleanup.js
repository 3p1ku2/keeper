const { server } = require('../../server')
const { creatures } = require('../../spells/creatures')
const { hashString } = require('../../utils/rand')
const { StringMutex } = require('../../utils/mutex')
class UserHistoryEntry {
  constructor(user, date) {
    this.created = date
    this.cult_id = user.cult_id
    this.referrals = user.referrals
    this.points = user.points
    this.coins = user.coins ? user.coins : 0
    this.num_chants = user.num_chants ? user.num_chants : 0
    this.num_cast_points = user.num_cast_points ? user.num_cast_points : 0
    this.num_referral_chants = user.num_referral_chants ? user.num_referral_chants : 0
  }
}

var UserMutex = new StringMutex()

async function cleanupMagic() {
  const LIFESPAN = 3 * 60 * 60 * 1000
  let _creatures = await server.db.collection("creatures").find({
    healthRemaining: { $gt: 0 }
  })
  _creatures = await _creatures.toArray()
  //console.log("creatures:", creatures)
  if (!_creatures) {
    console.log("no creatures")
    return
  }
  _creatures.map(async (creature) => {
    let _now = Date.now()
    if (_now >= new Date(creature.created.getTime() + LIFESPAN)) {
      creatures.killCreature(server, creature)
      return
    }
  })
  // await server.db.collection("users").update({ 'discord.userid': { $exists: true, $ne: '', $nin: server.admins }, coins: {$gt: 1333} },
  // {$set:{coins:1333}})
  
  // let users = await server.db.collection("users").find({ 'discord.userid': { $exists: true, $ne: '', $nin: server.admins }, coins: {$gt: 5000} }).toArray()
  // console.log("users:", users.map((u) => {
  //   return {
  //     name: u.discord.name,
  //     coins: u.coins,
  //     // hist: u.history[0]
  //   }
  //   }))
}

async function _resetUserPointsAndMagic(n, date, users) {
  console.log("starting batch:", n)
  var i = 0
  for (const user of users) {
    if (i % 100 == 0) {
      console.log("batch", n, "@", i) 
    }
    i++
    if (!user.discord || !user.discord.userid || user.discord.userid == '') {
      console.log('empty userid:', user)
      continue
    }
    if (user.history && user.history.length > 0 && user.history[user.history.length - 1].created >= date) {
      console.log("history already set, continuing")
      continue
    }
    var release = await UserMutex.acquire(user.discord.userid)
    try {
      console.log("resetting user:", user.discord.userid)
      let entry = new UserHistoryEntry(user, date)
      if (user.history) {
        user.history.push(entry)
      } else {
        user.history = [entry]
        console.log("single entry user:", user.discord.userid)
      }
      user.points = 0
      // if (user.coins < 0) {
      //   user.coins = 0
      // }
      // // get all spells
      // let c = await server.db.collection("items").count({ owner: user.discord.userid })
      // if (c && c > 0) {
      //   user.coins += c * 10
      // }
      user.coins = 0
      await server.db.collection("users").updateOne({ 'discord.userid': user.discord.userid }, { $set: { points: 0, num_chants: 0, referrals: [], coins: user.coins, history: user.history, referral_target_cult_id: '' } })
    } finally {
      release()
    }
  }
  console.log("finished batch:", n)
}

async function resetUserPointsAndMagic(date) {
  if (true){
    // TODO: improve threading so we wait for all user updates to finish
    // delete all spells
    await server.db.collection("items").remove({}, { $multi: true })
    await server.db.collection("users").update(
      {},
      {$set: { coins: 0 }}
    )
    return
  }
  await server.loadDiscordUsers()
  console.log("loading users from db")
  let users = await server.db.collection("users").find({ 'discord.userid': { $exists: true, $ne: '', $nin: server.admins}, points: {$gt: 0} }) //.sort({ 'points': -1, 'num_chants': -1 })
  users = await users.toArray()
  console.log("num users:", users.length)
  var batchSize = users.length / 6
  var n = 0
  while(users.length > 0) {
     _resetUserPointsAndMagic(n, date, users.splice(0, batchSize))
     n++
  }
}

async function removeAllCreatures(){
  await server.db.collection("creatures").remove({}, { $multi: true })
}

async function resetCultScores() {
  for (const cult of server.Cults.values()) {
    await cult.resetPoints(server.kvstore)
  }
}

async function markInGame() {
  console.log("mark in game")
  let members = await server.loadDiscordUsers()
  members = members.map((member) => member)
  for(const member of members) {
    let user = await server.db.collection("users").findOne({ 'discord.userid': member.id, 'cult_id': { $exists: true, $ne: '' } })
    // let cult = server.memberCult(member)
    // if (!cult) {
    //   if (user && user.cult_id != '') {
    //     await server.db.collection("users").updateOne({ 'discord.userid': member.id }, { $set: { cult_id: '' } })
    //   }
    //   return
    // }

    if (user) {
      console.log("marking user:", member.id)
      await server.db.collection("users").updateOne({ 'discord.userid': member.id }, { $set: { onboarded: true, cult_id: '' } })
    }
  }
  console.log("done marking players in game")
}

async function unsetCultsInDB() {
  console.log("unsetting cults in db")
  await server.loadDiscordUsers()
  // var guild = server.client.guilds.cache.get(server.Id)
  await server.db.collection("users").update(
    { 'discord.userid': { $exists: true, $ne: '' }, cult_id: { $exists: true, $ne: ''} },
    {$set: { cult_id: '' }}
  )
  console.log("removed all cult roles")
  // let orodruin = server.Cults.get('973532685479854110')
  // let minaskin = server.Cults.get('972639993635938344')
  // let orodruinMembers = await guild.roles.get(orodruin.roleId).members.map(m=>m.id).toArray()
  // let mkMembers = await guild.roles.get('1015426208588107876').members.map(m=>m.id).toArray()
  // await server.db.collection("users").update({ 'discord.userid': { $nin: true, $ne: '', $nin: server.admins } }, { $set: { cult_id: '' } })

  // let users = await server.db.collection("users").find({ 'discord.userid': { $exists: true, $ne: '' }, cult_id: { $exists: true, $ne: ''} })
  // await users.map(async (user) => {
  //   let member = server.getMember(user.discord.userid)
  //   if (member) {
  //     let cult = server.Cults.get(user.cult_id)
  //     if(!cult){
  //       console.log("no cult for id:", user.cult_id)
  //       return
  //     }
  //     if(!member.roles.cache.has(cult.roleId)) {
  //       console.log("should remove user cult:", cult.name)
  //       await server.db.collection("users").updateOne({ 'discord.userid': user.discord.userid }, { $set: { onboarded: true, cult_id: '' } }) // previous: in_server: false
  //     }
  //   }
  // }).toArray()
  // console.log("done unsetting cults in db")
}

async function removeCultRoles() {
  let members = await server.multiLoadDiscordUsers()
  let clients = server.getClients()
  console.log("clients:", clients)
  members = members.map((member) => member)
  for(const member of members) {
    console.log("hash:", hashString(member.id))
    let target = clients[hashString(member.id) % clients.length]
    let _member = target.getMember(server.Id, member.id)
    for (const cult of server.Cults.values()) {
      console.log("cult role id:", cult.roleId)
      if (_member.roles.cache.has(cult.roleId)) {
        console.log("unbound cultist:", member.id)
        await _member.roles.remove(cult.roleId)
      }
    }
  }
  console.log("done!")
}

async function killAllCreatures() {
  console.log("killing all creatures...")
  let creatures = await server.db.collection("creatures").find({
    healthRemaining: { $lte: 0 }
  }).toArray()
  if (creatures) {
    creatures.map(async (creature) => {
      let channel = server.client.channels.cache.get(creature.channelId)
      if(channel){
        channel.delete()
      }
      return
    })
  }
  
  console.log("purged dead channels")
  creatures = await server.db.collection("creatures").find({
    healthRemaining: { $gt: 0 }
  })
  creatures = await creatures.toArray()
  if (!creatures) {
    return
  }
  creatures.map(async (creature) => {
    let channel = server.client.channels.cache.get(creature.channelId)
    setTimeout(() => {
      channel.delete()
    }, 10 * 1000)
    await server.db.collection("creatures").update({ id: creature.id }, { $set: { healthRemaining: 0 } })
    return
  })
  console.log("triggered kill all active creatures, need to wait for channels to delete")
}

async function removeAllCreatures(){
  
  await server.db.collection("creatures").remove({}, { $multi: true })
}

async function resetCultScores() {
  for (const cult of server.Cults.values()) {
    await cult.resetPoints(server.kvstore)
  }
}

exports.cleanup = {
  markInGame: markInGame,
  unsetCultsInDB: unsetCultsInDB,
  removeCultRoles: removeCultRoles,
  resetCultScores: resetCultScores,
  killAllCreatures: killAllCreatures,
  removeAllCreatures: removeAllCreatures,
  resetUserPointsAndMagic: resetUserPointsAndMagic,
  cleanupMagic: cleanupMagic
}
