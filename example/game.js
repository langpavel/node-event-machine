import {State, StateMachine} from '../src/stateMachine';


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
    }

    $onStateLeave(newStateClass, newStateInstance) {
        return newStateClass !== A;
    }

    transitionA(data) {
        this.log('A -> A ...', data);
        return A;
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


const machine = new StateMachine(A);



machine.transition('transitionA', 'data1');
machine.transition('transitionA');
machine.transition('transitionA');
machine.transition('transitionB', 'data2');
machine.transition('transitionA', 'data3');
machine.transition('transitionB');
machine.transition('transitionB');
machine.transition('transitionA');

console.log(JSON.stringify(machine, null, 2))
