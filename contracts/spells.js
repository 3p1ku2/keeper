const SpellsActionFacet = require("./abi/SpellsActionFacet.json")
const SpellsRendererFacet = require("./abi/SpellsRendererFacet.json")
const SpellsToken = require("./abi/SpellsToken.json")
const SpellsTokenController = require("./abi/SpellsTokenController.json")

exports.Spells = {
  abi: SpellsActionFacet.abi.concat(SpellsToken.abi).concat(SpellsRendererFacet.abi).concat(SpellsTokenController.abi),
  address: '0x7fef3f3364C7d8B9BFabB1b24D5CE92A402c6Bd3'
}