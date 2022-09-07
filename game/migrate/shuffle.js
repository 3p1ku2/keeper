const { server } = require('../../server')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
let csvToJson = require('convert-csv-to-json')

class BinPackCult {
  constructor(id) {
    this.id = id
    this.points = 0
    this.members = []
    this.numZero = 0
  }

  addUser(user) {
    this.points += user.points
    this.members.push({ id: user.discord.userid, name: user.discord.name, points: user.points })
    if (user.points <= 0) {
      this.numZero += 1
    }
  }
}

class BinPackCults {
  constructor() {
    this.min = 0
    let cults = server.Cults.values()
    this.cults = []
    for (const _cult of cults) {
      this.cults.push(new BinPackCult(_cult.id))
    }
    console.log("bin pack cults:", this.cults)
  }

  insert(user) {
    this.min = (Math.floor(Math.random() * this.cults.length))
    if (user.points > 0) {
      let minPoints = this.cults[this.min].points
      for (var i = 0; i < this.cults.length; i++) {
        let cult = this.cults[i]
        if (cult.points < minPoints) {
          minPoints = cult.points
          this.min = i
        }
      }
    } else {
      let minMembers = this.cults[this.min].members.length
      for (var i = 0; i < this.cults.length; i++) {
        let cult = this.cults[i]
        if (cult.members.length < minMembers) {
          minMembers = cult.members.length
          this.min = i
        }
      }
    }
    // console.log("this.min:", this.min)
    this.cults[this.min].addUser(user)
  }

  insertToCult(user, cultId) {
    for (var _cult of this.cults) {
      if (_cult.id == cultId) {
        _cult.addUser(user)
      }
    }
  }
  
  async save(){
    const csvWriter = createCsvWriter({
      path: `./data/shuffle.csv`,
      fieldDelimiter: ';',
      header: [
        { id: 'cult_id', title: 'cult_id' },
        { id: 'members', title: 'members' }
      ]
    })
  
    let users = await server.db.collection("users").find({ 'discord.userid': { $exists: true, $ne: '', $nin: server.admins }, 'cult_id': { $exists: true, $ne: '' }  })
    let records = this.cults.map(cult => {      
      return {
        cult_id: cult.id,
        members: cult.members.map(member => member.id)
      }
    })
    console.log("records:", records)
    await csvWriter.writeRecords(records)
  }
  
  async load(){
    let data = csvToJson.parseSubArray('"',',').fieldDelimiter(';').getJsonFromCsv(`./data/shuffle.csv`)
    this.cults = data.map(cult => {
      let c = new BinPackCult(cult.cult_id)
      let members = cult.members
      console.log("cult.members:", members)
      c.members = members.split(',').map(v => {
        return{id: v}
      })
      console.log("c.members:", c.members)
      return c
    })
  }
}

exports.BinPackCult = BinPackCult
exports.BinPackCults = BinPackCults
const shuffleUsers = async () => {
  console.log("shuffling users")
  let cults = new BinPackCults()
  let users = await server.db.collection("users").find({ 'discord.userid': { $exists: true, $ne: '', $nin: server.admins } }).sort({ 'points': -1, 'num_chants': -1 })
  users = await users.toArray()
  console.log("num users:", users.length)
  for (const user of users) {
    if (!user.discord || !user.discord.userid || user.discord.userid == '') {
      console.log('empty userid:', user)
      continue
    }
    let member = server.getMember(user.discord.userid)
    if (!member) {
      console.log("no member found for user:", user.discord.userid)
      continue
    }
    cults.insert(user)
  }
  for (var i = 0; i < cults.cults.length; i++) {
    console.log(`${i}: points: ${cults.cults[i].points} members: ${cults.cults[i].members.length} num-zero: ${cults.cults[i].numZero}`)
  }
  for (var i = 0; i < cults.cults.length; i++) {
    console.log(`${i}: members: ${cults.cults[i].members.map(member => `${member.name}-${member.points}`)}`)
  }
  console.log("done shuffling users")
  return cults
}

const shuffleUsersKeepCults = async () => {
  console.log("shuffling users")
  let cults = new BinPackCults()
  let start = new Date(0)
  // while(true){
    
  // }
  // , last: { $slice: [ "$history", -1 ] }
//   let users = await server.db.collection("users").aggregate([
//     { $project: { _id: 0, discord: 1, cult_id: 1, coins: 1, points: 1, created_at: 1 } },
//     { $match: { 'discord.userid': { $exists: true, $ne: '', $nin: server.admins }, 'created_at': { $gt: start } }},
//     {
//       $limit: 20000
//     }
//  ]).toArray()
 
  let users = await server.db.collection("users").aggregate([
    { $project: { _id: 0, discord: 1, cult_id: 1, coins: 1, history: 1, points: 1, created_at: 1, last: { $slice: [ "$history", -1 ] } } },
    { $match: { 'discord.userid': { $exists: true, $ne: '', $nin: server.admins }, 'created_at': { $gt: start }  }},
    {
      $limit: 30000
    }
  ]).toArray()
 
  // let users = await server.db.collection("users").find({ 'discord.userid': { $exists: true, $ne: '', $nin: server.admins } }) //.sort({ 'points': -1, 'num_chants': -1 })
  console.log("num users:", users.length)
  let n = 0
  for (const user of users) {
    if (!user.discord || !user.discord.userid || user.discord.userid == '') {
      console.log('empty userid:', user)
      continue
    }
    let member = server.getMember(user.discord.userid)
    if (!member) {
      // console.log("no member found for user:", user.discord.userid)
      continue
    }
    console.log("user:", user)
    user.points = user.last && user.last.length > 0 ? (Number.isNaN(user.last[0].points) ? 0 : user.last[0].points) : 0 // isNaN(user.coins) ? 0 : user.coins
   console.log("loaded points:", user.points)
    if (user.cult_id && user.cult_id != '') {
      console.log("home user:", user.discord.userid, "cult:", user.cult_id)
      cults.insertToCult(user, user.cult_id)
      n++
    } else {
      // console.log("unassigned user:", user)
      cults.insert(user)
    }
  }
  console.log("num assigned to existing cult:", n)
  for (var i = 0; i < cults.cults.length; i++) {
    console.log(`${i} ${cults.cults[i].id}: points: ${cults.cults[i].points} members: ${cults.cults[i].members.length} num-zero: ${cults.cults[i].numZero}`)
  }
  for (var i = 0; i < cults.cults.length; i++) {
    console.log(`${i} ${cults.cults[i].id}: members: ${cults.cults[i].members.map(member => `${member.name}-${member.points}`)}`)
  }
  console.log("done shuffling users")
  return cults
}

exports.shuffle = async () => {
  var handleBatch = async (n, cult, batch) => {
    var i = 0
    console.log("batch:", batch)
    for (const user of batch) {
      if (i % 10 == 0) {
        console.log(`${n}: ${i}/${batch.length}`)
      }
      i++
      console.log('user:', user)
      // move user to new cult
      let member = server.getMember(user.id)
      if (!member) {
        console.log("no member found for user:", user.id)
        continue
      }
      let roleCult = null
      for (const [key, _cult] of server.Cults.entries()) {
        if (_cult.id != cult.id && member.roles.cache.has(_cult.roleId)) {
          roleCult = _cult
          break
        }
      }
      if(!roleCult) {
        let cultist = await server.getUser(user.id)
        if(cultist.cult_id && cultist.cult_id != '') {
         console.log("user already in cult:", cultist.id) 
        } else {
          if (!member.roles.cache.has(cult.roleId)) {
            console.log("adding role:", cult.roleId, "to user:", member.id)
            await member.roles.add(cult.roleId)
          }
          await server.db.collection("users").update({ 'discord.userid': member.id }, { $set: { cult_id: cult.id, in_server: true } })
          console.log("added user:", member.id, "to cult:", cult.name)
        }
      } else {
        console.log("user:", member.id, "already in cult:", roleCult.name)
      }
      // for (const [key, _cult] of server.Cults.entries()) {
      //   if (_cult.id != cult.id && member.roles.cache.has(_cult.roleId)) {
      //     console.log("unbound cultist:", member.id)
      //     await member.roles.remove(_cult.roleId)
      //   } else if (_cult.id == cult.id) {
      //     if (!member.roles.cache.has(_cult.roleId)) {
      //       console.log("adding role:", cult.roleId, "to user:", member.id)
      //       await member.roles.add(cult.roleId)
      //     }
      //     await server.db.collection("users").update({ 'discord.userid': member.id }, { $set: { cult_id: cult.id, in_server: true } })
      //     console.log("added user:", member.id, "to cult:", cult.name)
      //   }
      // }
    }
  }
  await server.loadDiscordUsers()
  if (true) {
    
    // let shuffledCults = await shuffleUsersKeepCults()
    // await shuffledCults.save()
    // return
    shuffledCults = new BinPackCults()
    await shuffledCults.load()
    console.log("loaded shuffled cults:", shuffledCults)
    // return
    for (var i = 0; i < shuffledCults.cults.length; i++) {
      let shuffledCult = shuffledCults.cults[i]
      let cult = server.Cults.get(shuffledCult.id)
      var batchSize = Math.round(shuffledCult.members.length / 6)
      var n = 0
      while(shuffledCult.members.length > 0) {
        handleBatch(n, cult, shuffledCult.members.splice(0, batchSize))
        n++
      }
      // for (const _member of shuffledCult.members) {
      //   // move user to new cult
      //   let member = server.getMember(_member.id)
      //   if (!member) {
      //     console.log("no member found for user:", _member.id)
      //     continue
      //   }
      //   for (const [key, _cult] of server.Cults.entries()) {
      //     if (_cult.id != cult.id && member.roles.cache.has(_cult.roleId)) {
      //       console.log("unbound cultist:", member.id)
      //       member.roles.remove(_cult.roleId)
      //     } else if (_cult.id == cult.id) {
      //       if (!member.roles.cache.has(_cult.roleId)) {
      //         console.log("adding role:", cult.roleId, "to user:", member.id)
      //         await member.roles.add(cult.roleId)
      //       }
      //       await server.db.collection("users").update({ 'discord.userid': member.id }, { $set: { cult_id: cult.id } })
      //       console.log("added user:", member.id, "to cult:", cult.name)
      //     }
      //   }
      //   // console.log("adding role:", cult.roleId, "to user:", member.id)
      //   // // await member.roles.add(cult.roleId)
      //   // await server.db.collection("users").update({ 'discord.userid': member.id }, { $set: { cult_id: cult.id } })
      //   // console.log("added user:", member.id, "to cult:", cult.name)
      // }
    }
  } 
}