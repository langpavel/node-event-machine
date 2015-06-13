
import Promise from 'bluebird';
import {RaceConditionError, TimeoutError} from './errors';

export default class StateMachine {

    constructor(InitialState, context) {
        this.context = context || {};
        this.states_ = {};
        Object.defineProperty(this, 'pendingTimeout_', {
            value: null,
            writable: true
        });
        Object.defineProperty(this, 'pendingTransitionPromise_', {
            value: null,
            writable: true
        });
        this.pendingTransition = null;
        this.state = this.getState(InitialState);
        if (this.state.$onStateEnter)
          this.state.$onStateEnter(null, null);
    }

    getState(StateConstructor, forceNew = false) {
        if (StateConstructor === null)
            return this.state;

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
        if (this.pendingTransition)
            throw new RaceConditionError(
                `Trying to enter transition '${name}' while '${this.pendingTransition}' in progress`);

        this.pendingTransition = name;
        var newState;
        if (typeof this.state[name] === 'function') {
            newState = this.state[name](...args);
        } else {
            if (!this.state.$onTransition)
                throw new Error(`State has no transition function '${name}'`);

            newState = this.state.$onTransition(name, ...args);
            if (!newState)
                throw new Error(`State has no transition function '${name}'`);
        }

        const looksLikePromise = newState && typeof newState.then === 'function';
        if (looksLikePromise) {
            this.pendingTransitionPromise_ = newState;
            // const cancellable = newState.isCancellable && newState.isCancellable();
            this.clearTimeoutTransition_(true);
            const oldState = this.state;
            const oldStateStr = this.state.toString();
            return newState.then((state) => {
                if (this.pendingTransitionPromise_.timeouted_) {
                    throw new TimeoutError(`Timeout transition '${name}' from ${oldStateStr}`);
                }
                this.pendingTransitionPromise_ = null;
                this.clearTimeoutTransition_(false);
                if (oldState !== this.state) {
                    throw new RaceConditionError(`Race condition: Old ${oldStateStr} != ${this.state}`);
                }
                return Promise.resolve(this.doTransition_(state));
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

    timeoutTransition_(oldState, newStateClass, timeout, strict = false) {
        if (this.pendingTimeout_)
            throw new Error('Timeout transition is already pending');

        const handle = setTimeout(() => {
            const now = Date.now();
            oldState.$timeouted = now;
            this.pendingTimeout_ = null;
            if (this.pendingTransitionPromise_) {
                if (strict) {
                    this.pendingTransitionPromise_.timeouted_ = now;
                    this.doTransition_(newStateClass);
                    return;
                }
            }
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
