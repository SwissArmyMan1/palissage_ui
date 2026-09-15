import type { RoleKey } from '@/chain/roles';
import { connectDemoWallet, disconnectDemoWallet } from './connector';
import {
  rehydrateSimulation,
  sandboxActive,
  sandboxState,
  startSimulation,
  stopSimulation,
  useSandbox,
} from './store';

/**
 * Starting and stopping the simulated world, wallet included.
 *
 * Two things have to move together: the store (what the screens read) and the
 * mock connector (who the screens think is connected). Either one alone gives a
 * half-simulated app, which is worse than neither.
 */
export async function beginSimulation(role: RoleKey): Promise<void> {
  startSimulation(role);
  await connectDemoWallet();
}

export async function endSimulation(): Promise<void> {
  await disconnectDemoWallet();
  stopSimulation();
}

/**
 * Called once at boot: a reload mid-tour should land back in the simulation.
 *
 * The `else` branch matters as much as the `if`. The demo connector is
 * reconnectable, so wagmi will happily restore it from storage on a load where
 * no simulation is running — a fake wallet reading real chain data, with no
 * simulation bar to say so. Disconnecting it here is what prevents that.
 */
export async function resumeSimulation(): Promise<boolean> {
  if (!rehydrateSimulation()) {
    await disconnectDemoWallet();
    return false;
  }
  await connectDemoWallet();
  return true;
}

export { useSandbox, sandboxActive, sandboxState };
export { DEMO_WALLET } from './seed';
export type { SandboxState } from './store';
