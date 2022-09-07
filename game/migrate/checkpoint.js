const { server } = require('../../server')
const { stats } = require('../stats')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const csv = require('csv-parser')
const fs = require('fs')

let csvToJson = require('convert-csv-to-json')

function loadCults(basepath){
  return csvToJson.fieldDelimiter(',').getJsonFromCsv(`${basepath}-cults.csv`)
}

async function cultCheckpoint(basepath) {
  const csvWriter = createCsvWriter({
    path: `${basepath}-cults.csv`,
    header: [
      { id: 'id', title: 'id' },
      { id: 'name', title: 'name' },
      { id: 'score', title: 'score' },
      { id: 'points', title: 'points' },
      { id: 'members', title: 'members' },
    ]
  })
  let records = []
  await stats.applyStatsToCults()

  for (const cult of server.Cults.values()) {
    records.push({
      id: cult.id,
      name: cult.getName(server),
      score: cult.stats.score,
      points: cult.stats.chants,
      members: cult.stats.population,
    })
  }
  await csvWriter.writeRecords(records)
}

async function usersCheckpoint(basepath) {
  const csvWriter = createCsvWriter({
    path: `${basepath}-users.csv`,
    header: [
      { id: 'id', title: 'id' },
      { id: 'address', title: 'address' },
      { id: 'cult', title: 'cult' },
      { id: 'points', title: 'points' },
      { id: 'chants', title: 'chants' },
      { id: 'conversions', title: 'conversions' },
      { id: 'coins', title: 'coins' },
    ]
  })

  let users = await server.db.collection("users").find({ 'discord.userid': { $exists: true, $ne: '', $nin: server.admins }, 'cult_id': { $exists: true, $ne: '' }  })
  let records = await users.map(user => {
    return {
      id: user.discord.userid,
      address: user.address,
      cult: user.cult_id,
      points: user.points,
      chants: user.num_chants,
      conversions: user.referrals ? user.referrals.length : 0,
      coins: user.coins
    }
  }).toArray()
  console.log("records:", records)
  await csvWriter.writeRecords(records)
}


async function save(date) {
  if (!date) {
    date = new Date()
  }
  let basepath = `./data/checkpoints/checkpoint-${date.toISOString()}`
  await cultCheckpoint(basepath)
  await usersCheckpoint(basepath)
}

exports.checkpoint = {
  save: save,
  loadCults: loadCults
}