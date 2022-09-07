const { server } = require('../server')
const { updateAllStats } = require('./stats')
const { FREEZE_TYPE } = require('../spells/constants')
const { handleJoin } = require('./recruit')
const { adventure } = require('../spells/adventure')
const { getAllPastReferralsSet } = require('../utils/user')
const { points } = require('../spells/points')

// Cleanup cult roles. Ensures only one cult role per user, matching their cult_id.
// Also ensures that all users with a cult have the @cultist role.
async function cleanRoles(client, date = new Date(0)) {
  await client.loadMembers(server.Id)
  console.log("loaded discord users")
  let users = await server.db.collection("users").find({ 
    'discord.userid': { $exists: true, $ne: '', $nin: server.admins },
    'cult_id': { $exists: true, $ne: '' },
    'created_at': { 
      $gt: date, $lt: new Date(new Date().getTime() - 60 * 1000) 
    }
  }).toArray()
  console.log("loaded db users")
  let isFullUpdate = date.getTime() === 0
  var isTest = false
  console.log("is full update:", isFullUpdate)
  console.log("num users:", users.length)
  let didUpdate = false
  for (const user of users) {
    if (!user.discord || !user.discord.userid || user.discord.userid == '') {
      console.log('empty userid:', user)
      continue
    }
    if (user.discord.userid == '365989466126549013') {
      console.log("found cloud caster")
    }
    let member = client.getMember(server.Id, user.discord.userid)
    if (!member) {
      console.log("no member found for user:", user.discord.userid)
      continue
    }
    // user has cult role:
    let cult = server.Cults.get(user.cult_id)
    if (!cult) {
      console.log("user:", user.discord.name, user.discord.userid, "no cult assigned")
      continue
    }
    
    let hasOtherCultRole = false
    for (const [key, _cult] of server.Cults.entries()) {
      if (_cult.id != cult.id && member.roles.cache.has(_cult.roleId)) {
        console.log("user:", user.discord.name, user.discord.userid, "has wrong cult:", _cult.name)
        hasOtherCultRole = true
        !isTest ? member.roles.remove(_cult.roleId) : null
      }
    }
    if (!member.roles.cache.has(cult.roleId)) {
      console.log("user:", user.discord.name, user.discord.userid, "does not have cult role")
      console.log("will handleJoin for user:", user.discord.name, user.discord.userid)
      if(!isTest){
        await handleJoin(server, member, false)
        didUpdate = true
      }
    }
    if (!member.roles.cache.has(server.Roles.Cultist)) {
      console.log("user:", user.discord.name, user.discord.userid, "does not have cultist role after handle join")
      !isTest ? await member.roles.add(server.Roles.Cultist) : null
    }
    if(user.num_chants > 0 && member.roles.cache.has(server.Roles.Unzealous)){
      console.log("user:", user.discord.name, user.discord.userid, "is zealous")
      !isTest ? member.roles.remove(server.Roles.Unzealous) : null  
    }
    
    let referrals = getAllPastReferralsSet(user)
    if (referrals.size < 2 && member.roles.cache.has(server.Roles.TrueBeliever)) {
      !isTest ? member.roles.remove(server.Roles.TrueBeliever) : null
    } else {
      await points.handleLeveling(user, referrals)
    }
    if(isFullUpdate || true){
      if(member.roles.cache.has(server.Roles.Abducted)){
        let c = await server.db.collection("creatures").count({
          type: FREEZE_TYPE,
          healthRemaining: { $gt: 0 },
          'target.id': member.id,
          event: 'spell_cast',
        })
        
        if(c == 0){
          console.log("user:", user.discord.name, user.discord.userid, "has abducted role but no attackers, removing abducted role")
          try {
            !isTest ? member.roles.remove(server.Roles.Unzealous) : null
          } catch(err) {
            console.log("error removing unzealous role:", err)
          }
        }
      }
    }
  }
  if (didUpdate) {
    updateAllStats()
  }
}

exports.updater = {
  cleanRoles: cleanRoles
}