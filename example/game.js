/*eslint-disable no-console */
/*eslint-disable no-use-before-define */

import Promise from 'bluebird';
import State from '../src/state';
import StateMachine from '../src/stateMachine';


class LoggingState extends State {
    $onStateEnter(oldStateClass, oldStateInstance) {
        console.log(`${this} entered`);
    }

    $onStateLeave(newStateClass, newStateInstance) {
        console.log(`${this} leaved`);
    }

    $destroy() {
        console.log(`${this} destroyed`);
    }

    log(msg, ...args) {
        console.log(`${this} ${msg}`, ...args);
    }
}


class A extends LoggingState {
    $init() {
        this.i = 0;
    }

    $onStateEnter(oldStateClass, oldStateInstance) {
        this.i++;
        super.$onStateEnter(oldStateClass, oldStateInstance);
        this.$timeout(GameEnd, 5000);
    }

    $onStateLeave(newStateClass, newStateInstance) {
        return newStateClass !== A;
    }

    transitionA(data) {
        this.log('A -> A ...', data);
        return Promise.resolve(A);
    }

    transitionB() {
        this.log('A -> B ...');
        return B;
    }
}


class B extends LoggingState {
    transitionA(data) {
        this.log('B -> A ...', data);
        return A;
    }

    transitionB() {
        this.log('B -> B ...');
        return B;
    }
}


class GameEnd extends LoggingState {}


const machine = new StateMachine(A);

machine.transition('transitionA', 'data1').then((state) => {
    console.log(`Transition done, state ${state}`);
    return machine.transition('transitionB', 'data2');
}).then((state) => {
    console.log(`Transition done, state ${state}`);
    return machine.transition('transitionA', 'data3');
}).then((state) => {
    console.log(`Transition done, state ${state}`);
    return machine.transition('transitionA', 'data4');
});
