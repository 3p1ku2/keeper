
var isRestarting = false
var homecomingActive = false

var lastChapterEndTime = 1660935600 * 1000
var chapterStartTime = 1661558400 * 1000  // 1661558400 * 1000 // 
var nextChapaterEndTime = 1664092800 * 1000 

async function _load(kvstore){
  let _isRestarting = await kvstore.get("isRestarting")
  if (_isRestarting) {
    isRestarting = true
  }
  
  let _homecomingActive = await kvstore.get("homecomingActive")
  if (_homecomingActive) {
    homecomingActive = true
  }
  
  let _lastChapterEndTime = await kvstore.get("lastChapterEndTime")
  if (_lastChapterEndTime) {
    lastChapterEndTime = _lastChapterEndTime
  }
  
  let _chapterStartTime = await kvstore.get("chapterStartTime")
  if (_chapterStartTime) {
    chapterStartTime = _chapterStartTime
  }
  
  let _nextChapaterEndTime = await kvstore.get("nextChapaterEndTime")
  if (_nextChapaterEndTime) {
    nextChapaterEndTime = _nextChapaterEndTime
  }
}

exports.loadState = async (kvstore) => {
  await _load(kvstore)
  setInterval(async () => {
    await _load(kvstore)
  }, 10 * 1000)
}

exports.lastChapterEndTime = () => lastChapterEndTime
exports.chapterStartTime = () => chapterStartTime
exports.nextChapaterEndTime = () => nextChapaterEndTime
exports.isRestarting = () => isRestarting
exports.homecomingActive = () => homecomingActive