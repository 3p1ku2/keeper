const { server } = require('../server')
const { StringMutex } = require('../utils/mutex')

const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js')

var claimCache = {}

async function cancel(interaction) {
  delete claimCache[interaction.message.interaction.id]
  await interaction.update({ content: 'claim canceled', components: [], ephemeral: true })
}

async function start(interaction) {
  let prizes = await server.db.collection("prizes").find({
    supply: {$gt: 0}
  })
  let options = await prizes.map(item => {
    return {
      value: item.id,
      label: item.name,
      description: item.description
    }
  }).toArray()
  if (options.length == 0) {
    await interaction.reply({ content: "no prizes are available to claim right now...", ephemeral: true })
    return
  }
  const row = new MessageActionRow()
    .addComponents(
      new MessageSelectMenu()
        .setCustomId('prize_select')
        .setPlaceholder('prizes')
        .addOptions(options)
    );
  try {
    await interaction.reply({ content: 'select prize', components: [row], ephemeral: true })
  } catch(error) {
    console.log("error:", error)
  }
}

async function select(interaction) {
  try {
    if (interaction.values.length != 1) {
      await interaction.update({ content: 'cannot select multiple values', components: [], ephemeral: true })
      return
    }
    var item;
    try {
      item = await server.db.collection("prizes").findOne({
        id: interaction.values[0]
      })
    } catch (error) {
      console.log("error:", error)
      await interaction.update({ content: `error: ${error} | talk to @hypervisor`, components: [], ephemeral: true })
      return
    }
    claimCache[interaction.message.interaction.id] = item.id
    const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId('claim_confirm')
        .setLabel('Claim')
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId('claim_cancel')
        .setLabel('Cancel')
        .setStyle('SECONDARY')
    );
    await interaction.update({ content: `cast ${this.spell.name}`, components: [row], ephemeral: true })
  } catch (e) {
    console.log("error:", e)
  }
}

async function commit(interaction) {
  try {
    if (interaction.values.length != 1) {
      await interaction.update({ content: 'cannot select multiple values', components: [], ephemeral: true })
      return
    }
    let item = await server.db.collection("prizes").findOne({
      id: claimCache[interaction.message.interaction.id]
    })
    if(!item){
      await interaction.update({ content: 'no prize found | talk to @hypervisor about this...', components: [], ephemeral: true })
      return
    }
    
    await interaction.deferReply({ ephemeral: true })
    var release = await UserMutex.acquire(interaction.member.id)
    try {
      
      // Validate request
      let c = await server.db.collection("items").count({ owner: interaction.member.id })
      if (c >= 10) {
        await interaction.editReply({ content: 'you have the maximum number of spells. you must /cast or /drop some to conjure again.', components: [], ephemeral: true })
        return
      }
      let user = await server.db.collection("users").findOne({ "discord.userid": interaction.member.id })
      if (!user) {
        await interaction.editReply({ content: 'user not found, talk to @hypervisor...', components: [], ephemeral: true })
        return
      }
      if (!server.Cults.userCult(interaction.member)) {
        await interaction.editReply({ content: `no cult assigned`, components: [], ephemeral: true })
        return
      }
      if (user.coins < spellType.price) {
        await interaction.editReply({ content: `not enough magic <:magic:975922950551244871>. ${spellType.name} costs <:magic:975922950551244871>${spellType.price} magic. you have <:magic:975922950551244871>${user.coins},,,`, components: [], ephemeral: true })
        return
      }
      let spell = await conjure(server, spellType, interaction.member)
      console.log("spell:", spell)
      let embed = spellMessageEmbed(spell)
      await interaction.editReply({ content: 'what magic have you conjured?', embeds: [embed], components: [], ephemeral: true })
    } finally {
      release()
    }
  } catch (error) {
    console.log(error)
  }
}

exports.prizes = {
  cancel: cancel,
  start: start,
  select: select,
  commit: commit
}