jest.dontMock('../state');
jest.dontMock('../stateMachine');

const State = require('../state');
const StateMachine = require('../stateMachine');

/*eslint-disable no-use-before-define */

class A extends State {
    $init() {
        this.a = 0;
    }

    $onStateEnter(oldStateClass, oldStateInstance) {
        this.a++;
        super.$onStateEnter(oldStateClass, oldStateInstance);
    }

    $onStateLeave(newStateClass, newStateInstance) {
        return newStateClass !== A;
    }

    transitionA(data) { return A; }

    transitionB() { return B; }
}


class B extends State {
    transitionA(data) {
        return A;
    }

    transitionB() {
        return B;
    }
}

describe('StateMachine', () => {
    it('should work', () => {
        const machine = new StateMachine(A);
        expect(machine.state instanceof A).toBeTruthy();
        machine.transition('transitionB');
        expect(machine.state instanceof B).toBeTruthy();
        machine.transition('transitionA');
        expect(machine.state instanceof A).toBeTruthy();
    });
});
