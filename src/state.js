
export default class State {

    constructor(machine) {
        // not enumerable, not writable
        Object.defineProperty(this, '$machine', {value: machine});
        this.$init();
    }

    $init() {}
    $destroy() {}

    /**
     * @param {constructor} oldStateClass
     * @param {State} oldState
     */
    $onStateEnter(oldStateClass, oldState) {}

    /**
     * @param {constructor} newStateClass
     * @param {State} newState
     * @return {bool} true if state should be destroyed
     */
    $onStateLeave(newStateClass, newState) {
        return false;
    }

    $transition(name, ...args) {
        if (typeof this[name] === 'function') return this[name](...args);
        return null;
    }

    toString() {
        //return `[state ${this.constructor.name} ${JSON.stringify(this)}]`;
    }

}


