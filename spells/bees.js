const { MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton } = require('discord.js')

const { server } = require('../server')
const { BEES_SPELL } = require('./constants')


async function isBesetByBees(member) {
  //let period = new Date(new Date().getTime() - (12 * 60 * 60 * 1000))
  let n = await server.db.collection("events").count({ 'metadata.end': { $gt: new Date() }, spell_type: BEES_SPELL, 'metadata.target.id': member.id })
  if (n && n > 0) {
    return true
  }
  return false
}

var buzzes = [
  'bz',
  'bzzz bz',
  'zzbz',
  'bzz',
  'bzz',
  'bzz',
  'buzzz',
  'buzzz',
  'bzzzbz',
  'bz',
  'zzp',
  'ð¯',
  'ð',
  'ð',
  'ð',
  'ð',
  'ðð',
  'bzðzz',
  'ð¤',
  'ð¤',
  'ð¤',
  'ððð¤',
  'ððð¤ bzz',
]

async function handleMessage(message) {
  if (message.interaction != null || message.channel.id == server.channels.AltarChannelId || message.channel.parentId == server.channels.ModSectionId) {
    return false
  }
  if(!message.member){
    return false
  }
  
  if (!await isBesetByBees(message.member)) {
    return false
  }
  console.log("user:", message.member.id, "is beset by bees!")
  let content = message.content.replaceAll("@", "")
  const words = content.split(" ")
  var newWords = []
  for (var word of words) {
    if (Math.random() < 0.6) {
      newWords.push(buzzes[Math.floor(Math.random() * buzzes.length)])
    }
    if (word.length > 2 && Math.random() < 0.1) {
      let idx = Math.floor(Math.random() * word.length)
      word = word.slice(0, idx) + buzzes[Math.floor(Math.random() * buzzes.length)] + word.slice(idx, word.length)
    }
    newWords.push(word)
  }
  message.delete()
  let resp = await message.channel.send(`${message.member}: ${newWords.join(" ")}`)
  if (resp) {
    resp.react('ð')
    resp.react('ð¤')
  }
  return true
}

exports.bees = {
  handleMessage: handleMessage,
  isBesetByBees: isBesetByBees
}