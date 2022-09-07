const { SlashCommandBuilder, ContextMenuCommandBuilder } = require('@discordjs/builders')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const { MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js')
const { points } = require('../spells/points')
const { fragments } = require('../spells/fragments')
const { enter } = require('../discord/enter')
const { spells } = require('../spells/spells')
const { store } = require('../spells/store')
const { cast } = require('../spells/cast')
const { drop } = require('../spells/drop')
const { objects } = require('../spells/objects')
const { sortinghat } = require('../discord/sortinghat')
const { handleSabotage } = require('../game/recruit')
const { toHrMin } = require('../utils/time')
const { homecoming } = require('../game/homecoming')

const clientId = '974842656372953118';

const conjureCmd = new SlashCommandBuilder()
  .setName('conjure')
  .setDescription('conjure spells')
const castCmd = new SlashCommandBuilder()
  .setName('cast')
  .setDescription('cast spells')
const dropCmd = new SlashCommandBuilder()
  .setName('drop')
  .setDescription('drop spells from your inventory')

const shameCmd = new SlashCommandBuilder()
  .setName('shame')
  .setDescription('shame the least zealous cultists')
  .addRoleOption(option => option.setName('cult')
    .setDescription('get the wall of shame for a single cult')
    .setRequired(false))
const praiseCmd = new SlashCommandBuilder()
  .setName('praise')
  .setDescription('praise the most zealous cultists')
  .addRoleOption(option => option.setName('cult')
    .setDescription('praise the most zealous for a single cult')
    .setRequired(false))
const believersCmd = new SlashCommandBuilder()
  .setName('believers')
  .setDescription('list the True Believers (users with the most conversions)')
const beesCmd = new SlashCommandBuilder()
  .setName('bees')
  .setDescription('buzz buzz 🐝')
const fragmentsCmd = new SlashCommandBuilder()
  .setName('fragment')
  .setDescription('reveal your daily fragment')

const equipCmd = new SlashCommandBuilder()
  .setName('equip')
  .setDescription('equip items')
const statsCmd = new SlashCommandBuilder()
  .setName('purse')
  .setDescription('view your magic balance')
  .addUserOption(option => option.setName('cultist').setDescription('inspect another user').setRequired(false))
const sabotageCmd = new SlashCommandBuilder()
  .setName('sabotage')
  .setDescription('set your zealous link to refer to another cult')
  .addRoleOption(option => option.setName('cult')
    .setDescription('the cult to sabotage')
    .setRequired(true))
const zealotCmd = new SlashCommandBuilder()
  .setName('zealot')
  .setDescription('get your zealous link')
const inspectCmd = new SlashCommandBuilder()
  .setName('inspect')
  .setDescription('inspect a cultist')
  .addUserOption(option => option.setName('cultist').setDescription('the user').setRequired(true))

const enterCmd = new SlashCommandBuilder()
  .setName('enter')
  .setDescription('do as hypervisor says')

const userStatsCtx = new ContextMenuCommandBuilder()
  .setName('inspect')
  .setType(2)

// const msgCtx = new ContextMenuCommandBuilder()
// 	.setName('enter')
// 	.setType(3)

async function init(server) {
  try {
    console.log('Started refreshing application (/) commands.');
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN)
    await rest.put(
      Routes.applicationGuildCommands(clientId, server.Id),
      {
        body: [equipCmd.toJSON(), zealotCmd.toJSON(), sabotageCmd.toJSON(),
        conjureCmd.toJSON(), castCmd.toJSON(), dropCmd.toJSON(),
        statsCmd.toJSON(),
        inspectCmd.toJSON(),
        userStatsCtx.toJSON(),
        enterCmd.toJSON(),
        shameCmd.toJSON(),
        praiseCmd.toJSON(),
        believersCmd.toJSON(),
        beesCmd.toJSON(),
        // fragmentsCmd.toJSON()
        ]
      },
    );
  } catch (error) {
    console.error(error);
  }
}

async function defaultCancel(server, interaction) {
  try {
    await interaction.update({ content: 'you have exited', ephemeral: true })
  } catch (error) {
    console.error(error)
  }
}

async function handleInteraction(server, interaction) {
  if(interaction.user.bot){
    return
  }
  // user context menu
  if (interaction.isUserContextMenu()) {
    await points.handleUserStatsInteraction(server, interaction, interaction.targetUser.id)
    return
  }
  // select
  if (interaction.isSelectMenu()) {
    switch (interaction.customId) {
      case "select":
        if (interaction.values.length == 1) {
          console.log("value:", interaction.values[0])
          switch (interaction.values[0]) {
            case 'mask':
              interaction.member.roles.add("975937160148553738")
              try {
                await interaction.update({ content: '<:mask:975938373594251385>', components: [] })
              } catch (error) {
                console.error(error)
              }
              break
          }
        }
        break;
      case "conjure_select":
        await store.handleConjureSelect(interaction)
        break
      case "cast_select_from":
        await cast.selectFrom(server, interaction)
        break
      case "cast_select_to":
        await cast.selectTo(server, interaction)
        break
      case "bind_select_to":
        await homecoming.handleSelectTo(interaction)
        break
      case "drop_select":
        await drop.select(server, interaction)
        break
    }
  }

  if (interaction.isButton()) {
    switch (interaction.customId) {
      case "enter_continue_1":
        await enter.continue(server, interaction, 1)
        break
      case "enter_continue_2":
        await enter.continue(server, interaction, 2)
        break
      case "enter_continue_3":
        await enter.continue(server, interaction, 3)
        break
      case "enter_continue_4":
        await enter.continue(server, interaction, 4)
        break
      case "enter_cancel":
        await enter.cancel(server, interaction)
        break
      case "spells_conjure_1":
        await spells.conjure(server, interaction)
        break
      case "default_cancel":
        await defaultCancel(server, interaction)
        break
      case "cast_cancel":
        await cast.cancel(server, interaction)
        break
      case "cast_confirm":
        await cast.commit(server, interaction)
        break
      case "drop_cancel":
        await drop.cancel(server, interaction)
        break
      case "drop_confirm":
        await drop.commit(server, interaction)
        break
      case "do_sorting_hat":
        await sortinghat.handleChair(interaction)
        break
      case "unlock_chest":
        await objects.handleUnlock(interaction)
        break
    }
  }

  // commands
  if (interaction.isCommand()) {
    switch (interaction.commandName) {
      case 'conjure':
        try {
          await store.handleConjureRequest(interaction)
        }catch(err){
          console.log("error:", err)
        }
        break
      case 'shame':
        if (server.rules.isNoPublicInteractionsChannel(interaction.channel.id) && !server.isAdmin(interaction.member.id)) {
          try {
            await interaction.reply({ content: 'command not allowed in this channel', ephemeral: true })
          } catch (error) {
            console.error("caught error:", error)
          }
          return 
        }
        await handleShame(server, interaction)
        return
      case 'praise':
        if (server.rules.isNoPublicInteractionsChannel(interaction.channel.id) && !server.isAdmin(interaction.member.id)) {
          try {
            await interaction.reply({ content: 'command not allowed in this channel', ephemeral: true })
          } catch (error) {
            console.error("caught error:", error)
          }
          return 
        }
        await handlePraise(server, interaction)
        return
      case 'believers':
        if (server.rules.isNoPublicInteractionsChannel(interaction.channel.id) && !server.isAdmin(interaction.member.id)) {
          try {
            await interaction.reply({ content: 'command not allowed in this channel', ephemeral: true })
          } catch (error) {
            console.error("caught error:", error)
          }
          return 
        }
        await handleBelievers(server, interaction)
        return
      case 'bees':
        handleBees(server, interaction)
        return
      case 'fragment':
        fragments.handleReveal(interaction)
        return
      case 'enter':
        await enter.start(server, interaction)
        break
      case 'inspect':
        var user = interaction.options.getUser('cultist')
        await points.handleUserStatsInteraction(server, interaction, user.id)
        break
      case 'sabotage':
        await handleSabotage(server, interaction)
        break
      case 'zealot':
        try {
          var user = await server.db.collection("users").findOne({ 'discord.userid': interaction.member.id })
          await interaction.reply({ content: `https://spells.quest/?z=${user.referral_key}`, ephemeral: true })
        } catch (error) {
          try {
            await interaction.reply({ content: `error: ${error} | talk to @hypervisor`, ephemeral: true })
          } catch(err) {
            console.error("error:", err)
          }
        }
        break
      case 'purse':
        var user = interaction.options.getUser('cultist')
        if (user) {
          await points.handleUserStatsInteraction(server, interaction, user.id)
        } else {
          await points.handleUserStatsInteraction(server, interaction)
        }
        break
      case 'equip':
        let options = [{
          label: 'mask',
          emoji: { id: "975938373594251385" },
          value: 'mask',
        }]
        const row = new MessageActionRow()
          .addComponents(
            new MessageSelectMenu()
              .setCustomId('select')
              .setPlaceholder('select item')
              .addOptions(options)
          );
        try {
          await interaction.reply({ content: 'equip', components: [row], ephemeral: true })
        } catch (error) {
          console.error(error)
        }
        return
      case 'cast':
        // await interaction.reply({ content: 'casting is strangely BLOCKED?',  ephemeral:true })
        await cast.start(server, interaction)
        return
      case 'drop':
        await drop.start(server, interaction)
        return
    }
  }
}

async function handleShame(server, interaction) {
  try {
    var role = interaction.options.getRole('cult')
    if (role) {
      let cult;
      for (var _cult of server.Cults.values()) {
        if (_cult.roleId == role) {
          cult = _cult
          break
        }
      }
      
      if (!cult) {
        await interaction.reply({ content: 'not a valid cult role', ephemeral: true })
      } else {
        await interaction.reply({ content: await points.cultLoserboard(server, cult.id), ephemeral: false })
      }
      return
    }
    await interaction.reply({ content: await points.loserboard(server), ephemeral: false })
  } catch (error) {
    console.error("error:", error)
  }
}

async function handlePraise(server, interaction) {
  try {
    var role = interaction.options.getRole('cult')
    if (role) {
      let cult;
      for (var _cult of server.Cults.values()) {
        if (_cult.roleId == role) {
          cult = _cult
          break
        }
      }
      if (!cult) {
        await interaction.reply({ content: 'not a valid cult role', ephemeral: true })
      } else {
        await interaction.reply({ content: await points.cultLeaderboard(server, cult.id), ephemeral: false })
      }
      return
    }
    await interaction.reply({ content: await points.leaderboard(server), ephemeral: false })
  } catch (error) {
    console.error("error:", error)
  }
}

async function handleBelievers(server, interaction) {
  try {
    await interaction.reply({ content: await points.referralLeaderboard(server), ephemeral: false })
  } catch (error) {
    console.error("error:", error)
  }
}

async function handleBees(server, interaction) {
  try {
    let now = Date.now() / 1000
    let events = await server.db.collection("events").find({ spell_type: 'bees_spell', 'metadata.end': { $gt: new Date() } })
    let list = await events.map(event => {
      let member = server.getMember(event.metadata.target.id)
      return `🐝 ${member.displayName} ${toHrMin(event.metadata.end.getTime() / 1000 - now)}`
    }).toArray()
    await interaction.reply({ content: `🐝🐝🐝\n\n${list.join('\n')}`, ephemeral: true })
  } catch (error) {
    console.error("error:", error)
  }
}



exports.interactionHandler = {
  handle: handleInteraction,
  init: init
}