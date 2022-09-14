const { server } = require("../../server")
const { cleanup } = require("./cleanup")
const { checkpoint } = require("./checkpoint")
const { lastChapterEndTime } = require("../state")
const { keys } = require("./keys")
const { shuffle } = require("./shuffle")

const close = async () => {
  let date = new Date()
  console.log("date:", date)
  await checkpoint.save(date)
  // TODO: set game state in kvstore, read from live client
  await server.kvstore.set("isRestarting", true)
  await server.kvstore.set("lastChapterEndTime", date)
}

const reset = async () => {
  let date = new Date(lastChapterEndTime())
  console.log("date:", date)
  // await cleanup.markInGame()
  // console.log("marked in game!")
  // await cleanup.unsetCultsInDB()
  // console.log("unset cults in db")
  // await cleanup.removeCultRoles()
  
  // await cleanup.resetCultScores()
  // await cleanup.killAllCreatures()
  // await cleanup.removeAllCreatures()
  // reset scores
  await cleanup.resetUserPointsAndMagic(date)
  // kill creatures
  // remove creatures
  // TODO:
  // clear proposals
}

const startHomecoming = async () => {
  await server.kvstore.set("chapterStartTime", 1662458400 * 1000)
  await server.kvstore.set("nextChapaterEndTime", 1664092800 * 1000)
  await server.kvstore.set("homecomingActive", true)
}

const stopHomecoming = async () => {
  // await server.kvstore.set("homecomingActive", false)
  // await cleanup.unsetCultsInDB()
  // await cleanup.cleanupMagic()
  await shuffle()
}

const startGame = async () => {
  await server.kvstore.set("homecomingActive", false)
  await server.kvstore.set("isRestarting", false)
  // await server.kvstore.set("chapterStartTime", (new Date()).getTime())
  await server.kvstore.set("nextChapaterEndTime", 1664092800 * 1000)
}

const assignKeys = async () => {
  // await checkpoint.save(new Date())
  await keys.assignKeys()
}

exports.migrate = {
  close: close,
  reset: reset,
  startHomecoming: startHomecoming,
  stopHomecoming: stopHomecoming,
  startGame: startGame,
  assignKeys: assignKeys
}