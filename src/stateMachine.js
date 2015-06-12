
import Promise from 'bluebird';

export default class StateMachine {

    constructor(InitialState, context) {
        this.context = context || {};
        this.states_ = {};
        Object.defineProperty(this, 'pendingTimeout_', {
            value: null,
            writable: true
        });
        this.pendingTransition = null;
        this.state = this.getState(InitialState);
        if (this.state.$onStateEnter)
          this.state.$onStateEnter(null, null);
    }

    getState(StateConstructor, forceNew = false) {
        if (typeof StateConstructor !== 'function')
            throw new Error('StateMachine.getState accept only State class');

        const name = StateConstructor.name;

        if (!forceNew && this.states_[name])
            return this.states_[name];

        const newState = new StateConstructor(this);
        if (newState.$machine !== this)
            throw new Error(`Please call super($machine) in constructor of '${name}'`);

        this.states_[name] = newState;

        return this.states_[name];
    }

    releaseState(StateConstructor) {
        if (typeof StateConstructor !== 'function')
            throw new Error('StateMachine.getState accept only State class');

        const name = StateConstructor.name;

        if (this.states_[name]) {
            if (this.states_[name].$destroy) this.states_[name].$destroy();
            this.states_[name] = null;
        }
    }

    transition(name, ...args) {
        this.pendingTransition = name;
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
            this.clearTimeoutTransition_(false);
            return newState.then((state) => {
                this.clearTimeoutTransition_(true);
                return Promise.resolve(this.doTransition_(newState));
            });
        } else {
            this.clearTimeoutTransition_();
            return Promise.resolve(this.doTransition_(newState));
        }
    }

    clearTimeoutTransition_(onlyStrict) {
        if (this.pendingTimeout_) {
            if (onlyStrict && !this.pendingTimeout_.strict)
                return;
            clearTimeout(this.pendingTimeout_.handle);
            this.pendingTimeout_ = null;
        }
    }

    timeoutTransition_(newStateClass, timeout, strict = false) {
        if (this.pendingTimeout_)
            throw new Error('Timeout transition is already pending');

        const handle = setTimeout(() => {
            this.pendingTimeout_ = null;
            this.doTransition_(newStateClass);
        }, timeout);

        this.pendingTimeout_ = {strict, handle};
    }

    doTransition_(newStateClass) {
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

        this.pendingTransition = null;
        if (release) this.releaseState(oldStateClass);
        return this.state;
    }

}
