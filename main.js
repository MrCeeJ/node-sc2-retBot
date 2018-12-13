const {createAgent, createEngine, createPlayer} = require('@node-sc2/core');
const {Difficulty, Race, Alliance} = require('@node-sc2/core/constants/enums');
const protossSupplySystem = require('@node-sc2/system-protoss-supply');
const {combatTypes} = require('@node-sc2/core/constants/groups');
const {GATEWAY, ZEALOT} = require('@node-sc2/core/constants/unit-type');
const {CHARGE} = require('@node-sc2/core/constants/upgrade');

const eightGateAllIn = require('./eightGateAllIn');
// const eightGateAllIn = require('./allInDemo');

const engine = createEngine();
engine.connect().then(() => {
    return engine.runGame('Cerulean Fall LE', [
        createPlayer({race: Race.PROTOSS}, bot),
        createPlayer({race: Race.RANDOM, difficulty: Difficulty.MEDIUM}),
    ]);
});

const bot = createAgent({
    state: {
        armySize: 12,
        buildCompleted: false,
    },// the second parameter of unit-based event consumers is the unit
    async onUnitFinished({resources}, newBuilding) {
        // check to see if the unit in question is a gas mine
        if (newBuilding.isGasMine()) {
            const {units, actions} = resources.get();

            // get the three closest probes to the assimilator
            const threeWorkers = units.getClosest(newBuilding.pos, units.getMineralWorkers(), 3);
            // add the `gasWorker` label, this makes sure they aren't used in the future for building
            threeWorkers.forEach(worker => worker.labels.set('gasWorker', true));
            // send them to mine at the `newBuilding` (the assimilator)
            return actions.mine(threeWorkers, newBuilding);
        }
    },
    async onUnitCreated({resources}, newUnit) {
        // add `map` to the resources we're getting
        const {actions, map} = resources.get();

        // this was already here
        if (newUnit.isWorker()) {
            return actions.gather(newUnit);
            /* "if the new unit is a combat unit...", just in case we
            * decide to make something other than zealots */
        } else if (combatTypes.includes(newUnit.unitType)) {
            /* `map.getCombatRally()` is sort of a silly helper, but it's
             * a good enough default we can use for now :) */
            return actions.attackMove([newUnit], map.getCombatRally());
        }
    },
    async onStep({agent, resources}) {
        const {units, map, actions} = resources.get();

        // all gateways that are done building and idle
        const idleGateways = units.getById(GATEWAY, {noQueue: true, buildProgress: 1});

        if (idleGateways.length > 0) {
            // if there are some, send a command to each to build a zealot
            return Promise.all(idleGateways.map(gateway => actions.train(ZEALOT, gateway)));
        }
        if (this.state.buildCompleted) {
            // only get idle units, so we know how many are in waiting
            const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);

            if (idleCombatUnits.length > this.state.armySize) {
                // add to our army size, so each attack is slightly larger
                this.state.armySize += 2;
                const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

                return Promise.all([enemyNat, enemyMain].map((expansion) => {
                    return actions.attackMove(idleCombatUnits, expansion.townhallPosition, true);
                }));
            }
        }
    },
    async onUpgradeComplete({resources}, upgrade) {
        if (upgrade === CHARGE) {
            const {units, map, actions} = resources.get();

            const combatUnits = units.getCombatUnits();
            const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

            return Promise.all([enemyNat, enemyMain].map((expansion) => {
                return actions.attackMove(combatUnits, expansion.townhallPosition, true);
            }));
        }
    },
    async buildComplete() {
        this.state.buildCompleted = true;
    },
});
bot.use(protossSupplySystem);
bot.use(eightGateAllIn);
