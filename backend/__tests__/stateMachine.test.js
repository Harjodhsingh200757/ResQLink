const { validateStatusTransition } = require('../src/services/dispatchService');

describe('Dispatch State Machine Unit Tests', () => {
  test('Valid transition: OFF_DUTY -> AVAILABLE should succeed', () => {
    expect(() => validateStatusTransition('OFF_DUTY', 'AVAILABLE', 'AMBULANCE')).not.toThrow();
  });

  test('Valid transition: AVAILABLE -> BUSY should succeed', () => {
    expect(() => validateStatusTransition('AVAILABLE', 'BUSY', 'AMBULANCE')).not.toThrow();
  });

  test('Valid transition: BUSY -> EN_ROUTE should succeed', () => {
    expect(() => validateStatusTransition('BUSY', 'EN_ROUTE', 'AMBULANCE')).not.toThrow();
  });

  test('Invalid transition: OFF_DUTY -> EN_ROUTE should throw 400 error', () => {
    expect(() => validateStatusTransition('OFF_DUTY', 'EN_ROUTE', 'AMBULANCE')).toThrow();
    try {
      validateStatusTransition('OFF_DUTY', 'EN_ROUTE', 'AMBULANCE');
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_STATUS_TRANSITION');
    }
  });

  test('Invalid trip transition: COMPLETED -> EN_ROUTE should throw 400 error', () => {
    expect(() => validateStatusTransition('COMPLETED', 'EN_ROUTE', 'TRIP')).toThrow();
  });
});
