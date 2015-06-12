
export default class StateMachine {

    constructor(InitialState) {
        this.states = {};
        this.state = this.getState(InitialState);
        if (this.state.$onStateEnter)
          this.state.$onStateEnter(null, null);
    }

    getState(StateConstructor, forceNew = false) {
        if (typeof StateConstructor !== 'function')
            throw new Error('StateMachine.getState accept only State class');

        const name = StateConstructor.name;

        if (!forceNew && this.states[name])
            return this.states[name];

        const newState = new StateConstructor(this);
        if (newState.$machine !== this)
            throw new Error(`Please call super($machine) in constructor of '${name}'`);

        this.states[name] = newState;

        return this.states[name];
    }

    releaseState(StateConstructor) {
        if (typeof StateConstructor !== 'function')
            throw new Error('StateMachine.getState accept only State class');

        const name = StateConstructor.name;

        if (this.states[name]) {
            if (this.states[name].$destroy) this.states[name].$destroy();
            this.states[name] = null;
        }
    }

    transition(name, ...args) {
        var newState;
        if (typeof this.state[name] === 'function') {
            newState = this.state[name](...args);
        } else {
            newState = this.state.$transition(name, ...args);
            if (!newState)
                throw new Error(`State has no transition function '${name}'`);
        }

        const looksLikePromise = newState && typeof newState.then === 'function';
        if (looksLikePromise) {
            return newState.then((state) => {
                return Promise.resolve(this.setState_(newState));
            });
        } else {
            return Promise.resolve(this.setState_(newState));
        }
    }

    setState_(newStateClass) {
        const oldState = this.state;
        const oldStateClass = oldState ? oldState.constructor : null;
        const newState = this.getState(newStateClass);

        var release = false;

        if (oldState.$onStateLeave) {
            release = oldState.$onStateLeave(newStateClass, newState);
        }

        this.state = newState;

        if (newState.$onStateEnter) {
            newState.$onStateEnter(oldStateClass, oldState);
        }

        if (release) this.releaseState(oldStateClass);
        return this.state;
    }

}
