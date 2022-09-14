const { User, Cultist } = require('./types/user')
const { Cult, Cults } = require('./types/cult')
const { FREEZER_TYPE } = require('./spells/constants')
const { KeyValueStore } = require('./utils/kvstore')

class ServerRules {
  constructor(channelRules) {
    this.channelRules = channelRules
  }
  
  isNoMessagesChannel(id){
    let rules = this.channelRules[id]
    return rules && rules.noMessages
  }
  
  isNoPublicInteractionsChannel(id){
    let rules = this.channelRules[id]
    return rules && rules.noPublicInteractions
  }
  
  isNoRecruitmentChannel(id){
    let rules = this.channelRules[id]
    return rules && rules.noRecruitmentLinks
  }
}

class Server {
  constructor(id, cults, testCult, welcomeChannel, statsChannel, beginChannel, altarChannel, channels, emojis, roles, rules) {
    this.Id = id
    this.Cults = cults
    this.TestCult = testCult
    this.WelcomeChannelId = welcomeChannel
    this.StatsId = statsChannel
    this.BeginChannelId = beginChannel
    this.AltarChannelId = altarChannel
    this.channels = channels
    this.Emojis = emojis
    this.Roles = roles
    this.ADMIN_ID = "821876872391950386"
    this.admins = ["821876872391950386"]
    this.rules = rules
  }

  setClient(client) {
    this.client = client
  }
  
  setClientsGetter(getter) {
    this.clientsGetter = getter
  }
  
  getClients(){
    return this.clientsGetter()
  }
  
  setDB(db) {
   this.db = db
   this.kvstore = new KeyValueStore(db) 
  }

  getChannel(id) {
    return this.client.channels.cache.get(id)
  }

  getChannelName(id) {
    let channel = this.client.channels.cache.get(id)
    return channel.name
  }

  async getNextSequenceValue(sequenceName) {
    var sequenceDocument = await this.db.collection("counters").findOneAndUpdate(
      { id: sequenceName },
      { $inc: { sequence_value: 1 } }
    );
    return sequenceDocument.value.sequence_value.toString();
  }

  async getSequenceValue(sequenceName) {
    var sequenceDocument = await this.db.collection("counters").findOne({
      id: sequenceName
    });
    if (!sequenceDocument) {
      return null
    }
    return sequenceDocument.sequence_value.toString();
  }
  
  async getUser(id) {
    let user = await this.db.collection("users").findOne({ 'discord.userid': id })
    if(user && user !== undefined){
      return new Cultist(user)
    }
    return null
  }
  
  async getUserWithReferralKey(key) {
    let user = await this.db.collection("users").findOne({ 'referral_key': key })
    if(user && user !== undefined){
      return new Cultist(user)
    }
    return null
  }

  async loadUser(id) {
    let user = await this.kvstore.get(`user:${id}`)
    if (user == null) {
      user = new User(id, 0)
    } else {
      Object.setPrototypeOf(user, User.prototype)
    }
    return user
  }

  async loadDiscordUsers() {
    var guild = this.client.guilds.cache.get(this.Id);
    let members = await guild.members.fetch()
    return members
  }
  
  async multiLoadDiscordUsers() {
    var members
    for(let client of this.getClients()){
      members = await client.loadMembers(this.Id)
    }
    return members
  }

  async saveUser(user) {
    await this.kvstore.set(`user:${user.Id}`, user)
  }

  getMember(id) {
    let guild = this.client.guilds.cache.get(this.Id)
    return guild.members.cache.get(id)
  }

  userIdCult(id) {
    let guild = this.client.guilds.cache.get(this.Id)
    let member = guild.members.cache.get(id)
    if (!member) {
      return null
    }
    return this.Cults.userCult(member)
  }

  memberCult(member) {
    return this.Cults.userCult(member)
  }

  memberHasRole(member, roleId) {
    if (!member) {
      return false
    }
    if (typeof member === 'string' || member instanceof String) {
      let guild = this.client.guilds.cache.get(this.Id)
      member = guild.members.cache.get(id)
    }
    return member.roles.cache.has(roleId)
  }

  async userIsFrozen(user) {
    if(user === null){
      return false 
    }
    if (typeof user === 'string' || user instanceof String) {
      let c = await this.db.collection("creatures").count({ 'target.id': user, 'type': FREEZE_TYPE })
      return c > 0
    }
    return user.roles.cache.has(this.Roles.Abducted)
  }

  async getCachedMessage(channelId, key) {
    let messageId = await this.kvstore.get(`${key}:${channelId}`)
    if (!messageId) {
      return null
    }
    let channel = this.client.channels.cache.get(channelId)
    try {
      return await channel.messages.fetch(messageId)
    } catch(err){
      console.log("error:", err)
    }
    return null
  }

  async updateCachedMessage(channelId, key, value) {
    let messageId = await this.kvstore.get(`${key}:${channelId}`)
    let channel = this.client.channels.cache.get(channelId)
    if (messageId) {
      try {
        let msg = await channel.messages.fetch(messageId)
        if (msg) {
          try {
            await msg.edit(value)
          } catch(err){
            console.log("updateCachedMessage error:", err)
          }
          return msg
        }
      } catch(err){
        console.log("error:", err)
      }
    }
    let message = await channel.send(value)
    await this.kvstore.set(`${key}:${channelId}`, message.id)
    return message
  }
  
  isAdmin(id){
    return this.admins.includes(id)
  }

}

var GLOBAL_CHANNELS = {
  DungeonSectionId: "988261012295794698",
  EnterChannelId: "986712037633720390",
  AdventureLogChannelId: "989617981233451028",
  GameTimerChannelId: "999040396258717706",
  AltarChannelId: "978078135193071657",
  AutonomousCouncilChannelId: "1007018715474313216",
  CultsSectionId: "970091626779254875",
  // non-spells
  Banter: "1017668088096890901",
  Questions: "1017668716743381003",
  Diviners: "1017964002913034250"
}

const spellQuestServer = new Server("970091626779254874",
  new Cults({
    // "1007387236343492638": new Cult(
    //   "culivanis",
    //   "1007387236343492638",
    //   "ashmin col thalias",
    //   "🪐",
    //   "🪐",
    //   // roleId
    //   "1007386782767267960",
    //   {
    //     stats: '1007387977770610878',
    //   },
    //   // emoji id
    //   null,
    //   // bonus points
    //   0
    // ),
    "972639993635938344": new Cult(
      "minas kin",
      "972639993635938344",
      "forn nal numen",
      "🥼",
      "🥼",
      "1018848889727619132", // roleId
      {
        stats: '977052635603554324',
      },
      // emoji id
      null,
      // bonus points
      0
    ),
    "973532685479854110": new Cult(
      "orodruin",
      "973532685479854110",
      "golin barad quendi",
      "🧿",
      "🧿",
      "1018849041376870461",
      {
        stats: '977060905089105941',
      },
      // emoji id
      null,
      // bonus points
      0
    )
    // "1": new Cult(
    //   "calmit sin",
    //   "1",
    //   "calmit ada sin",
    //   "🩸",
    //   "🩸",
    //   "1015452664202530839",
    //   {
    //     stats: '1015452477379850240',
    //   },
    //   // emoji id
    //   null,
    //   // bonus points
    //   0
    // ),
    // "973532570266533898": new Cult(
    //   "vos silan",
    //   "973532570266533898",
    //   "avari noc brith",
    //   "🪞",
    //   "🪞",
    //   "1015431651267969034",
    //   {
    //     stats: '977052689768804382',
    //   },
    //   // emoji id
    //   null,
    //   // bonus points
    //   0
    // )
  }),
  new Cult(
    "Coven of Parsimony",
    "973532516092882944",
    "chant",
    "🌙",
    "🌙",
    "973761990340276255"
  ),
  "973821687743258654", // welcome channel
  "974824235384057977",
  "973760681763565578",
  "978078135193071657",
  GLOBAL_CHANNELS,
  {
    AYE: "976559748143001642",
    NAY: "976559312103174228"
  },
  {
    Cultist: "1007389250787999845",
    TrueBeliever: "1001219339577479240",
    MindlessZealot: "1015175139635232838",
    Unzealous: "997279025292644372",
    Abducted: "998705483277938739",
    Lost: "1004460065463484518"
  },
  new ServerRules({
    // enter channel
    [GLOBAL_CHANNELS.EnterChannelId]: {
      noPublicInteractions: true,
      noMessages: true
    },
    [GLOBAL_CHANNELS.AutonomousCouncilChannelId]: {
      noPublicInteractions: true,
      noRecruitmentLinks: true,
    },
    [GLOBAL_CHANNELS.AltarChannelId]: {
      noPublicInteractions: true,
      noRecruitmentLinks: true,
    },
    [GLOBAL_CHANNELS.AltarChannelId]: {
      noPublicInteractions: true,
      noRecruitmentLinks: true,
    },
    [GLOBAL_CHANNELS.Banter]: {
      noPublicInteractions: true,
      noRecruitmentLinks: true,
    },
    [GLOBAL_CHANNELS.Questions]: {
      noPublicInteractions: true,
      noRecruitmentLinks: true,
    },
    [GLOBAL_CHANNELS.Diviners]: {
      noPublicInteractions: true,
      noRecruitmentLinks: true,
    }
  })
)

const testServer = {
  Id: "845219291943272448",
  Cults: new Cults({
    "hexadethicult": new Cult(
      "hexadethicult",
      "974823282790514798",
      "chant",
      "🩸"
    ),
    "daemoncabal": new Cult(
      "daemoncabal",
      "974823324997787728",
      "chant",
      "🎭"
    ),
    "pointlessguild": new Cult(
      "pointlessguild",
      "974823343838601267",
      "chant",
      "🕴"
    )
  }),
  StatsId: "974824617967484989",
  Emojis: {
    AYE: "976559748143001642",
    NAY: "976559312103174228"
  },
  Roles: {
    Unzealous: "997279025292644372"
  }
}

exports.testServer = testServer
exports.server = spellQuestServer