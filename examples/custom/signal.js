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

  const read = () => {
    if (currentEffect) subscribers.add(currentEffect);
    if (dirty) {
      const prev = currentEffect;
      currentEffect = () => {
        dirty = true;
        for (const s of subscribers) s();
      };
      cached = fn();
      currentEffect = prev;
      dirty = false;
    }
    return cached;
  };

  read.invalidate = () => {
    dirty = true;
    for (const s of subscribers) s();
  };

  return read;
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
  execute();
}

export function batch(fn) {
  fn();
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

export function peek(sig) {
  return sig.peek ? sig.peek() : sig();
}
