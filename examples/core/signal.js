// Signal System: Core reactivity primitives
// Inspired by FAST Observable + TC39 Signals proposal

let currentEffect = null;

export function signal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  const read = () => {
    if (currentEffect) subscribers.add(currentEffect);
    return value;
  };

  read.set = (newValue) => {
    if (Object.is(value, newValue)) return;
    value = newValue;
    for (const fn of subscribers) fn();
  };

  read.peek = () => value;

  return read;
}

export function computed(fn) {
  let cached;
  let dirty = true;
  const subscribers = new Set();

  const invalidate = () => {
    dirty = true;
    for (const s of subscribers) s();
  };

  const read = () => {
    if (currentEffect) subscribers.add(currentEffect);
    if (dirty) {
      const prev = currentEffect;
      currentEffect = invalidate;
      cached = fn();
      currentEffect = prev;
      dirty = false;
    }
    return cached;
  };

  read.invalidate = invalidate;

  return read;
}

let batching = false;
const pendingEffects = new Set();

export function batch(fn) {
  batching = true;
  fn();
  batching = false;
  for (const effect of pendingEffects) {
    effect();
  }
  pendingEffects.clear();
}

export function effect(fn) {
  const execute = () => {
    const prev = currentEffect;
    currentEffect = execute;
    try {
      fn();
    } finally {
      currentEffect = prev;
    }
  };
  
  // Wrap the execution to handle batching
  const wrappedExecute = () => {
    if (batching) {
      pendingEffects.add(wrappedExecute);
    } else {
      execute();
    }
  };
  
  wrappedExecute();
  return wrappedExecute; // return for cleanup if needed
}

export function untrack(fn) {
  const prev = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prev;
  }
}

export function createResource(source, fetcher) {
  const data = signal(null);
  const pending = signal(true);
  const error = signal(null);

  const update = async () => {
    pending.set(true);
    error.set(null);
    try {
      const val = await fetcher(source());
      data.set(val);
    } catch (e) {
      error.set(e);
    } finally {
      pending.set(false);
    }
  };

  effect(update);

  return {
    data,
    pending,
    error,
    refetch: update
  };
}

export function peek(sig) {
  return sig.peek ? sig.peek() : sig();
}
