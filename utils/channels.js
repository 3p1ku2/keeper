const { Permissions } = require('discord.js');
const { ChannelType } = require('discord-api-types/v9');
const { SetChannelPermissions, GetPermissionsConfig, CULTIST_READ_ONLY, CULTIST_READ_WRITE, PERMISSIONS } = require('./permissions')

const CHANNEL_KEYS = {
  MAIN : "main_channel",
  PROPOSALS : "proposals",
  CHESTS : "chests",
  FRAGMENTS : "fragments",
  STATS: "stats"
}
function _cultDungeonChannelName(cult) {
  return `⎼⎼⎼ ${cult.emoji} dunge❍n ⎼⎼⎼`
}

async function upsertCultDungeon(server, cult, readOnly = false) {
  console.log("upserting dungeon for cult", cult.name)
  let dungeonId = await server.kvstore.get(`cult:${cult.id}:dungeon`)
  let dungeon = dungeonId ? await server.getChannel(dungeonId) : null
  let name = _cultDungeonChannelName(cult)
  if(!dungeon) {
    if(readOnly) {
      return
    }
    var guild = server.client.guilds.cache.get(server.Id)
    dungeon = await guild.channels.create(name, {
      type: 4, // GUILD_CATEGORY
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [
            Permissions.FLAGS.VIEW_CHANNEL,
            Permissions.FLAGS.CREATE_PUBLIC_THREADS,
            Permissions.FLAGS.CREATE_PRIVATE_THREADS,
            Permissions.FLAGS.ATTACH_FILES,
            Permissions.FLAGS.EMBED_LINKS
          ],
        }
      ]
    })
    await SetChannelPermissions(server, dungeon, CULTIST_READ_ONLY)
  } else if (dungeon.name != name && !readOnly) {
    await dungeon.setName(name)
  }
  if(dungeon){
    if(!dungeonId || dungeon.id != dungeonId) {
      await server.kvstore.set(`cult:${cult.id}:dungeon`, dungeon.id)
    }
    cult.channels.DungeonSectionId = dungeon.id
  }
}

async function loadCultDungeon(server, cult) {
  await upsertCultDungeon(server, cult, true)
}

async function _upsertCultChannel(server, cult, channelKey, _type, permissions, readOnly = false) {
  let channelId = await server.kvstore.get(`cult:${cult.id}:channel:${channelKey}`)
  let channel = channelId ? await server.getChannel(channelId) : null
  let name = `${cult.emoji}・${ channelKey == CHANNEL_KEYS.MAIN ? cult.getName(server) : channelKey}`
  if(!channel) {
    if(readOnly) {
      return
    }
    var guild = server.client.guilds.cache.get(server.Id)
    channel = await guild.channels.create(name, {
      type: _type, // GUILD_CATEGORY
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [
            Permissions.FLAGS.VIEW_CHANNEL,
            Permissions.FLAGS.CREATE_PUBLIC_THREADS,
            Permissions.FLAGS.CREATE_PRIVATE_THREADS,
            Permissions.FLAGS.ATTACH_FILES,
            Permissions.FLAGS.EMBED_LINKS
          ],
        }
      ]
    })
    await channel.setParent(server.channels.CultsSectionId)
    await SetChannelPermissions(server, channel, permissions, [cult.roleId])
  } else if (channel.name != name && !readOnly) {
    await channel.setName(name)
  }
  if(channel){
    if(!channelId || channel.id != channelId) {
      await server.kvstore.set(`cult:${cult.id}:channel:${channelKey}`, channel.id)
    }
    cult.channels[channelKey] = channel.id
  }
}

async function upsertCultChannels(server, cult, readOnly = false) {
  // server.channels.CultsSectionId
  // TODO: 
  // - cult channel
  // - proposals channel
  // const setProposalsPermissions = async (channel) => {
  //   await SetChannelPermissions(server, channel, CULTIST_READ_ONLY, [cult.roleId])
  // }
  await _upsertCultChannel(server, cult, CHANNEL_KEYS.MAIN, ChannelType.GUILD_TEXT, CULTIST_READ_WRITE)

  await _upsertCultChannel(server, cult, CHANNEL_KEYS.PROPOSALS, ChannelType.GUILD_TEXT, CULTIST_READ_WRITE)
  // - chest channel (read only, no reactions)
  await _upsertCultChannel(server, cult, CHANNEL_KEYS.CHESTS, ChannelType.GUILD_TEXT, CULTIST_READ_ONLY)
  // - fragments channel (tbd)
  await _upsertCultChannel(server, cult, CHANNEL_KEYS.FRAGMENTS, ChannelType.GUILD_TEXT, CULTIST_READ_WRITE)
}

async function loadCultChannels(server, cult) {
  upsertCultChannels(server, cult, true)
}

exports.channels = {
  upsertCultDungeon: upsertCultDungeon,
  loadCultDungeon: loadCultDungeon,
  upsertCultChannels: upsertCultChannels,
  loadCultChannels: loadCultChannels,
}