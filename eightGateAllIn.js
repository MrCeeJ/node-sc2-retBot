const { createSystem, taskFunctions } = require('@node-sc2/core');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const {
    ASSIMILATOR,
    CYBERNETICSCORE,
    GATEWAY,
    NEXUS,
    TWILIGHTCOUNCIL,
} = require('@node-sc2/core/constants/unit-type');

const { build, upgrade } = taskFunctions;

const eightGateAllIn = createSystem({
    name: 'EightGateAllIn',
    type: 'build',

    buildOrder: [
        [16, build(ASSIMILATOR)],
        [17, build(GATEWAY)],
        [20, build(NEXUS)],
        [21, build(CYBERNETICSCORE)],
        [26, build(TWILIGHTCOUNCIL)],
        [34, upgrade(CHARGE)],
        [34, build(GATEWAY, 7)],
    ],
});

module.exports = eightGateAllIn;