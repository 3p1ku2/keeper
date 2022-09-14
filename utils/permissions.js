const { MessageEmbed, Permissions } = require('discord.js')
const { PermissionsBitField } = require('discord.js')

var PERMISSIONS = {
    VIEW: 1,
    READ: 2,
    WRITE: 4,
    REACT: 8,
    SLASH_COMMANDS: 16
}

const CULTIST_READ_ONLY = PERMISSIONS.VIEW | PERMISSIONS.READ | PERMISSIONS.REACT 
const CULTIST_READ_WRITE = CULTIST_READ_ONLY | PERMISSIONS.WRITE | PERMISSIONS.SLASH_COMMANDS

async function SetChannelPermissions(server, channel, mode, roles = null){
    if(!roles){
        roles = [server.Roles.Cultist]
    }
    let v = {VIEW_CHANNEL: false, SEND_MESSAGES: false, ADD_REACTIONS: false, USE_APPLICATION_COMMANDS: false}
    if(mode & PERMISSIONS.VIEW){
        v.VIEW_CHANNEL = true
    }
    if(mode & PERMISSIONS.WRITE){
        v.SEND_MESSAGES = true
    }
    if(mode & PERMISSIONS.SLASH_COMMANDS){
        // v[PermissionsBitField.FLAGS.UseSlashCommands] = true
        v.USE_APPLICATION_COMMANDS = true
    }
    if(mode & PERMISSIONS.REACT){
        v.ADD_REACTIONS = true
    }
    for(let role of roles){
        console.log("setting role:", role, "permissions:", v)
        channel.permissionOverwrites.create(role, v)
    }
}

async function GetPermissionsConfig(mode){
    let v = {VIEW_CHANNEL: true, SEND_MESSAGES: false, ADD_REACTIONS: false}
    if(mode & PERMISSIONS.WRITE){
        v.SEND_MESSAGES = true
    }
    if(mode & PERMISSIONS.REACT){
        v.ADD_REACTIONS = true
    }
    return v
}


exports.PERMISSIONS = PERMISSIONS
exports.CULTIST_READ_ONLY = CULTIST_READ_ONLY
exports.CULTIST_READ_WRITE = CULTIST_READ_WRITE
exports.SetChannelPermissions = SetChannelPermissions
exports.GetPermissionsConfig = GetPermissionsConfig