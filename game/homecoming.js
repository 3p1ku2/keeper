const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js')
const { server } = require('../server')
const { StringMutex } = require('../utils/mutex')
const { getAllPastPoints } = require('../utils/user')
const { homecomingActive } = require('./state')
const { handleJoin } = require('./recruit')
const { text } = require('express')
const { emoji } = require('../utils/emoji')
const HomecomingChannelId = '1004448290596724786'
const UserMutex = new StringMutex()
let numCults = server.Cults.values().length
const MAX_MEMBERS = Math.floor(26000 / numCults)
const MAX_POINTS = Math.floor(52792727 / numCults)

async function assignCult(userId, cult) {
  if (!cult) {
    console.log("no cult")
    return
  }
  console.log("getting user mutex")
  var release = await UserMutex.acquire(userId)
  console.log("got user mutex")
  try {
    let member = server.getMember(userId)
    var _cult = server.memberCult(member)
    if (_cult) {
      // remove them from old cult
      if (cult.id != _cult.id) {
        member.roles.remove(_cult.roleId)
        await server.db.collection("users").update({ 'discord.userid': userId }, { $set: { cult_id: '' } })
      } else {
        return true
      }
    }
    if (cult) {
      // assign user to cult
      console.log("adding role:", cult.roleId, "to user:", userId)
      await member.roles.add(cult.roleId)
      await server.db.collection("users").update({ 'discord.userid': userId }, { $set: { cult_id: cult.id } })
    }
  } finally {
    release()
  }
}

async function handleSelectTo(interaction) {
  console.log("handleSelectTo called!")
  if (!homecomingActive()) {
    await interaction.update({ content: 'the entrance is closed', components: [] })
    return false
  }
  if (interaction.values.length != 1) {
    await interaction.update({ content: 'cannot select multiple values', components: [] })
   return 
  }
  let targetMessage = await server.getCachedMessage(HomecomingChannelId, 'homecoming')
  if (!targetMessage) {
    return false
  }
  var targetCultId = interaction.values[0]
  await interaction.deferReply({ephemeral: true})
  var release = await UserMutex.acquire(interaction.member.id)
  try {
    let dbuser = await server.getUser(interaction.member.id)
    if(!dbuser){
      let embed = new MessageEmbed()
        .setTitle(`${interaction.user.username ? interaction.user.username + ' ' : ''}you must bind before playing <:magic:975922950551244871>`)
        .setColor("#FFFFE0")
        .setURL('https://spells.quest/bind')
        .setDescription(`you must [**bind**](https://spells.quest/bind) to join a cult`)
        .addField('binding', 'one click auth with discord so @keeper can connect your wallet to your profile. [go here](https://spells.quest/bind) and click the 🗡')
        .setFooter({ text: '​', iconURL: 'https://cdn.discordapp.com/emojis/975977080699379712.webp?size=96&quality=lossless' })
      
      try {
        await interaction.editReply({ embeds:[embed], ephemeral: true })
      } catch (err) {
        console.log(err)
      }
      return true
    }
    let member = server.getMember(interaction.member.id)
    var cult = server.memberCult(interaction.member)
    if (cult) {
      // already has cult
      if (cult.id != targetCultId) {
        // remove old cult
        member.roles.remove(cult.roleId)
        await server.db.collection("users").update({ 'discord.userid': interaction.member.id }, { $set: { cult_id: '' } })
      } else {
        await interaction.editReply({ content: 'you are already a member of this cult' , ephemeral: true})
        return true
      }
    }
    cult = server.Cults.get(targetCultId)
    if (cult) {
      let metrics = await cult.getMetrics(server)
      let points = dbuser.points // getAllPastPoints(dbuser)
      if (metrics.population >= MAX_MEMBERS || metrics.points + (dbuser ? points : 0) >= MAX_POINTS) {
        console.log("cult full")
        await interaction.editReply({ content: 'cult is full' , ephemeral: true})
        return
      }
      // assign user to cult
      console.log("adding role:", cult.roleId, "to user:", interaction.member.id)
      // await interaction.member.roles.add(cult.roleId)
      await server.db.collection("users").update({ 'discord.userid': interaction.member.id }, { $set: { cult_id: cult.id } })
      await handleJoin(server, member, false)
      await interaction.editReply({content: `excellent choice ${emoji.mindlesszealot}` , ephemeral: true})
      // updateMessage()
    }
  } finally {
    release()
  }
  return true

}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array
}

async function updateMessage() {
  let txt = `AELIN, IT IS TIME TO CHOOSE YOUR DESTINY!

bind to the cult you consider home. bring your friends. try to keep the cults balanced, or the ancients may balance them for you...`
  
  let message = await server.updateCachedMessage(HomecomingChannelId, 'homecoming', {
    content: txt,
    components: [
      new MessageActionRow()
        .addComponents(
          new MessageSelectMenu()
            .setCustomId('bind_select_to')
            .setPlaceholder('make your choice')
            .addOptions(server.Cults.values().map( (cult) => {
              return {
                value: cult.id,
                emoji: cult.emojiId ? { id: cult.emojiId } : { name: cult.emoji },
                label: cult.getName(server)
              }
            }))
        )
    ]
  })
  await message.reactions.removeAll()
  setTimeout(() => {
    for (const _cult of shuffleArray(server.Cults.values())) {
      message.react(_cult.emoji)
    }
  }, 1 * 1000)
}

async function init() {
  updateMessage()
  setInterval(() => {
    updateMessage()
  }, 10 * 60 * 1000)
  if (await server.getCachedMessage(HomecomingChannelId, 'homecoming')) {
    return
  }
  updateMessage()
}


exports.homecoming = {
  init: init,
  updateMessage: updateMessage,
  assignCult: assignCult,
  handleSelectTo: handleSelectTo
}