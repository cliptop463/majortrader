import { describe, expect, it } from 'vitest';
import { transitionRuntime } from '../runtime';

describe('runtimeTransitions', () => {
  describe('RUN action', () => {
    it('transitions from idle to running when connected and authenticated', () => {
      const result = transitionRuntime('idle', {
        type: 'RUN',
        isConnected: true,
        isAuthenticated: true,
      });

      expect(result.status).toBe('running');
      expect(result.phase).toBe('scanning');
      expect(result.error).toBeUndefined();
    });

    it('rejects RUN when disconnected', () => {
      const result = transitionRuntime('idle', {
        type: 'RUN',
        isConnected: false,
        isAuthenticated: true,
      });

      expect(result.status).toBe('idle');
      expect(result.error).toContain('WebSocket is disconnected');
    });

    it('rejects RUN when unauthenticated', () => {
      const result = transitionRuntime('idle', {
        type: 'RUN',
        isConnected: true,
        isAuthenticated: false,
      });

      expect(result.status).toBe('idle');
      expect(result.error).toContain('Authenticated Deriv session is required');
    });
  });

  describe('PAUSE action', () => {
    it('transitions running to paused without open contract (phase: halted)', () => {
      const result = transitionRuntime('running', { type: 'PAUSE' }, false);
      expect(result.status).toBe('paused');
      expect(result.phase).toBe('halted');
    });

    it('safely maintains open_contract phase when pausing with an active open contract', () => {
      const result = transitionRuntime('running', { type: 'PAUSE' }, true);
      expect(result.status).toBe('paused');
      expect(result.phase).toBe('open_contract');
      expect(result.policyNote).toContain('Safe tracking active open contract');
    });

    it('rejects PAUSE if not running', () => {
      const result = transitionRuntime('idle', { type: 'PAUSE' });
      expect(result.status).toBe('idle');
      expect(result.error).toContain('Strategy is not currently running');
    });
  });

  describe('RESUME action', () => {
    it('resumes from paused to running', () => {
      const result = transitionRuntime('paused', { type: 'RESUME' });
      expect(result.status).toBe('running');
      expect(result.phase).toBe('scanning');
    });

    it('rejects RESUME if not paused', () => {
      const result = transitionRuntime('idle', { type: 'RESUME' });
      expect(result.status).toBe('idle');
      expect(result.error).toContain('Strategy is not paused');
    });
  });

  describe('STOP action', () => {
    it('stops execution without open contract', () => {
      const result = transitionRuntime('running', { type: 'STOP' }, false);
      expect(result.status).toBe('stopped');
      expect(result.phase).toBe('halted');
    });

    it('safely tracks in-flight contract when stopping with an active open contract', () => {
      const result = transitionRuntime('running', { type: 'STOP' }, true);
      expect(result.status).toBe('stopped');
      expect(result.phase).toBe('open_contract');
      expect(result.policyNote).toContain('monitoring current open contract safely');
    });
  });

  describe('LIMIT_REACHED action', () => {
    it('transitions to limit_reached with halted phase', () => {
      const result = transitionRuntime('running', {
        type: 'LIMIT_REACHED',
        reason: 'Take profit hit',
      });
      expect(result.status).toBe('limit_reached');
      expect(result.phase).toBe('halted');
      expect(result.policyNote).toContain('Take profit hit');
    });
  });

  describe('RESET action', () => {
    it('resets stopped or limit_reached status back to idle', () => {
      expect(transitionRuntime('stopped', { type: 'RESET' }).status).toBe('idle');
      expect(transitionRuntime('limit_reached', { type: 'RESET' }).status).toBe('idle');
    });
  });
});
