const { server } = require('../server')
const { updater} = require('./updater');

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  })
}

exports.manager = {
  run: async () => {
    let period = 6 * 60 * 1000
    while(true){
      let start = Date.now()  
      await updater.cleanRoles(server.getClients()[1])
      let duration = Date.now() - start
      if(duration < period){
        await sleep(period - duration)
      }
    } 
  }
}