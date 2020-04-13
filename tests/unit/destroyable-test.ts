import { module, test } from 'qunit';

import {
  isDestroying,
  isDestroyed,
  associateDestroyableChild,
  registerDestructor,
  unregisterDestructor,
  destroy,
  assertDestroyablesDestroyed
} from '@ember/destroyable';
import CoreObject from '@ember/object/core';
import { run } from '@ember/runloop';

function makeDestructor(
  assert: Assert,
  step: string,
  expectedInstance: object
) {
  function destructor(instance: object) {
    assert.step(step);
    assert.strictEqual(
      instance,
      expectedInstance,
      `Destructor '${step}' was called for the instance it was registered for.`
    );
  }
  destructor.toString = () => step;
  return destructor;
}

function registerTestDestructors(
  assert: Assert,
  label: string,
  destroyable: object
) {
  const unregistered = makeDestructor(
    assert,
    `${label}-unregistered`,
    destroyable
  );
  registerDestructor(
    destroyable,
    makeDestructor(assert, `${label}-first`, destroyable)
  );
  registerDestructor(destroyable, unregistered);
  registerDestructor(
    destroyable,
    makeDestructor(assert, `${label}-second`, destroyable)
  );
  unregisterDestructor(destroyable, unregistered);
}

function assertLifecycle(
  assert: Assert,
  expected: 'initialized' | 'destroying' | 'destroyed',
  destroyable: object
) {
  const expectedDestroyed = expected === 'destroyed';
  // https://github.com/emberjs/rfcs/pull/580#discussion_r407224630
  const expectedDestroying = expectedDestroyed || expected === 'destroying';

  assert.strictEqual(
    isDestroying(destroyable),
    expectedDestroying,
    expectedDestroying
      ? `${destroyable} is destroying`
      : `${destroyable} is not destroying`
  );
  assert.strictEqual(
    isDestroyed(destroyable),
    expectedDestroyed,
    expectedDestroying
      ? `${destroyable} is destroyed`
      : `${destroyable} is not destroyed`
  );

  if (destroyable instanceof CoreObject) {
    assert.strictEqual(
      destroyable.isDestroying,
      expectedDestroying,
      `${destroyable}.isDestroying = ${expectedDestroying}`
    );
    assert.strictEqual(
      destroyable.isDestroyed,
      expectedDestroyed,
      `${destroyable}.isDestroyed = ${expectedDestroyed}`
    );
  }
}

module('destroyable', function (_hooks) {
  test('basic smoke test', function (assert) {
    assert.expect(23);

    const parent = {
      toString() {
        return 'parent';
      }
    };
    const child = {
      toString() {
        return 'child';
      }
    };

    associateDestroyableChild(parent, child);

    registerTestDestructors(assert, 'parent', parent);
    registerTestDestructors(assert, 'child', child);

    assertLifecycle(assert, 'initialized', parent);
    assertLifecycle(assert, 'initialized', child);

    assert.throws(
      () => assertDestroyablesDestroyed(),
      /Not all destroyable objects were destroyed/
    );

    run(() => {
      destroy(parent);

      assertLifecycle(assert, 'destroying', parent);
      assertLifecycle(assert, 'destroying', child);

      assert.throws(
        () => assertDestroyablesDestroyed(),
        /Not all destroyable objects were destroyed/
      );
    });

    assertLifecycle(assert, 'destroyed', parent);
    assertLifecycle(assert, 'destroyed', child);

    assert.verifySteps(
      ['parent-first', 'parent-second', 'child-first', 'child-second'],
      'Destructors were called in correct order.'
    );

    assertDestroyablesDestroyed();
  });

  module('integration with EmberObject', function () {
    test('destroy function', function (assert) {
      assert.expect(37);

      const parent = CoreObject.extend({
        toString() {
          return 'parent';
        },
        willDestroy() {
          assert.step('parent-willDestroy');
        }
      }).create();
      const child = CoreObject.extend({
        toString() {
          return 'child';
        },
        willDestroy() {
          assert.step('child-willDestroy');
        }
      }).create();

      associateDestroyableChild(parent, child);

      registerTestDestructors(assert, 'parent', parent);
      registerTestDestructors(assert, 'child', child);

      assertLifecycle(assert, 'initialized', parent);
      assertLifecycle(assert, 'initialized', child);

      assert.throws(
        () => assertDestroyablesDestroyed(),
        /Not all destroyable objects were destroyed/
      );

      run(() => {
        destroy(parent);

        assertLifecycle(assert, 'destroying', parent);
        assertLifecycle(assert, 'destroying', child);

        assert.throws(
          () => assertDestroyablesDestroyed(),
          /Not all destroyable objects were destroyed/
        );
      });

      assertLifecycle(assert, 'destroyed', parent);
      assertLifecycle(assert, 'destroyed', child);

      assert.verifySteps(
        [
          'parent-willDestroy',
          'parent-first',
          'parent-second',
          'child-willDestroy',
          'child-first',
          'child-second'
        ],
        'Destructors were called in correct order.'
      );

      assertDestroyablesDestroyed();
    });

    test('destroy hook', function (assert) {
      assert.expect(37);

      const parent = CoreObject.extend({
        toString() {
          return 'parent';
        },
        willDestroy() {
          assert.step('parent-willDestroy');
        }
      }).create();
      const child = CoreObject.extend({
        toString() {
          return 'child';
        },
        willDestroy() {
          assert.step('child-willDestroy');
        }
      }).create();

      associateDestroyableChild(parent, child);

      registerTestDestructors(assert, 'parent', parent);
      registerTestDestructors(assert, 'child', child);

      assertLifecycle(assert, 'initialized', parent);
      assertLifecycle(assert, 'initialized', child);

      assert.throws(
        () => assertDestroyablesDestroyed(),
        /Not all destroyable objects were destroyed/
      );

      run(() => {
        parent.destroy();

        assertLifecycle(assert, 'destroying', parent);
        assertLifecycle(assert, 'destroying', child);

        assert.throws(
          () => assertDestroyablesDestroyed(),
          /Not all destroyable objects were destroyed/
        );
      });

      assertLifecycle(assert, 'destroyed', parent);
      assertLifecycle(assert, 'destroyed', child);

      assert.verifySteps(
        [
          'parent-willDestroy',
          'parent-first',
          'parent-second',
          'child-willDestroy',
          'child-first',
          'child-second'
        ],
        'Destructors were called in correct order.'
      );

      assertDestroyablesDestroyed();
    });
  });
});
