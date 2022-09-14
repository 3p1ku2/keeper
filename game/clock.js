const { server } = require('../server')
const { batch } = require('./batch')
const { toHrMin } = require('../utils/time')
const { isRestarting, lastChapterEndTime, chapterStartTime, nextChapaterEndTime } = require('../game/state')

var HasCheckpointed = false

async function update() {
  let channel = server.getChannel(server.channels.GameTimerChannelId)
  let now = Date.now()
  if (now >= nextChapaterEndTime()) {
    // make sure matches backend
    let nextEnd = await server.kvstore.get("nextChapaterEndTime")
    if (now >= nextEnd) {
    // if (!HasCheckpointed || channel.name != 'RESTARTING...') {
      //   await batch.checkpoint(new Date())
      //   HasCheckpointed = true
      // }
      try {
        await channel.setName("RESTARTING...")
      } catch (error) {
        console.log("setName error:", error)
      }
      throw new Error("game over")
      return
    }
  }
  let remaining = nextChapaterEndTime() - now
  let name = "⏳ " + toHrMin(Math.floor(remaining / 1000))
  console.log("clock update:", name)
  try {
    await channel.setName(name)
  } catch (error) {
    console.log("setName error:", error)
  }
  return
}

async function run() {
  if (isRestarting()) {
    return
  }
  update()
  setInterval(() => {
    update()
  }, 5 * 60000 + Math.floor(Math.random() * 60000))
}

exports.clock = {
  run: run,
  update: update
}