import { onFrameUpdate } from 'framesync';
import action, { Action } from '../action';
import { ColdSubscription } from '../action/types';

export type ActionStarter<I> = (action: Action, key: I) => ColdSubscription;

export type MultiProps<A, T, V, I> = {
    getCount: (actions: A) => number;
    getFirst: (subs: T) => ColdSubscription;
    getOutput: () => V;
    mapApi: (subs: T, methodName: string) => (...args: any[]) => V;
    setProp: (output: V, name: I, value: any) => any;
    startActions: (actions: A, starter: ActionStarter<I>) => T;
};

const multi = <A, T, V, I>({
  getCount,
  getFirst,
  getOutput,
  mapApi,
  setProp,
  startActions
}: MultiProps<A, T, V, I>) => (actions: A): Action => action(({ update, complete, error }) => {
  const numActions = getCount(actions);
  const output = getOutput();
  const updateOutput = () => update(output);
  const updatedActions: string[] = [];
  let numCompletedActions = 0;
  let allActionsHaveUpdated = false;

  const subs = startActions(actions, (a, name) => a.start({
    complete: () => {
      numCompletedActions++;
      if (numCompletedActions === numActions) onFrameUpdate(complete);
    },
    error,
    update: (v: any) => {
      setProp(output, name, v);

      if (!allActionsHaveUpdated && updatedActions.indexOf(`${name}`)) {
        updatedActions.push(`${name}`);
        if (updatedActions.length === numActions) allActionsHaveUpdated = true;
      }

      if (allActionsHaveUpdated) onFrameUpdate(updateOutput, true);
    }
  }));

  return Object.keys(getFirst(subs))
    .reduce((api: { [key: string ]: Function }, methodName) => {
      api[methodName] = mapApi(subs, methodName);
      return api;
    }, {});
});

export default multi;
