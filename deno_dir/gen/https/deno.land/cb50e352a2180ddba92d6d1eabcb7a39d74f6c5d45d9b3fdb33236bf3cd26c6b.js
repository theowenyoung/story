// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
// Copyright (c) 2019 Denolibs authors. All rights reserved. MIT license.
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
import { assert } from "../_util/assert.ts";
import { makeMethodsEnumerable, notImplemented } from "./_utils.ts";
import { ERR_INVALID_ARG_TYPE, ERR_OUT_OF_RANGE, ERR_UNHANDLED_ERROR } from "./_errors.ts";
import { inspect } from "./util.ts";
function ensureArray(maybeArray) {
    return Array.isArray(maybeArray) ? maybeArray : [
        maybeArray
    ];
}
// deno-lint-ignore no-explicit-any
function createIterResult(value, done) {
    return {
        value,
        done
    };
}
export let defaultMaxListeners = 10;
function validateMaxListeners(n, name) {
    if (!Number.isInteger(n) || Number.isNaN(n) || n < 0) {
        throw new ERR_OUT_OF_RANGE(name, "a non-negative number", inspect(n));
    }
}
function setMaxListeners(n, ...eventTargets) {
    validateMaxListeners(n, "n");
    if (eventTargets.length === 0) {
        defaultMaxListeners = n;
    } else {
        for (const target of eventTargets){
            if (target instanceof EventEmitter) {
                target.setMaxListeners(n);
            } else if (target instanceof EventTarget) {
                notImplemented("setMaxListeners currently does not support EventTarget");
            } else {
                throw new ERR_INVALID_ARG_TYPE("eventTargets", [
                    "EventEmitter",
                    "EventTarget"
                ], target);
            }
        }
    }
}
/**
 * See also https://nodejs.org/api/events.html
 */ export class EventEmitter {
    static captureRejectionSymbol = Symbol.for("nodejs.rejection");
    static errorMonitor = Symbol("events.errorMonitor");
    static get defaultMaxListeners() {
        return defaultMaxListeners;
    }
    static set defaultMaxListeners(value) {
        validateMaxListeners(value, "defaultMaxListeners");
        defaultMaxListeners = value;
    }
    maxListeners;
    _events;
    static  #init(emitter) {
        if (emitter._events == null || emitter._events === Object.getPrototypeOf(emitter)._events // If `emitter` does not own `_events` but the prototype does
        ) {
            emitter._events = Object.create(null);
        }
    }
    /**
   * Overrides `call` to mimic the es5 behavior with the es6 class.
   */ // deno-lint-ignore no-explicit-any
    static call = function call(thisArg) {
        EventEmitter.#init(thisArg);
    };
    constructor(){
        EventEmitter.#init(this);
    }
    /** Alias for emitter.on(eventName, listener). */ addListener(eventName, listener) {
        return EventEmitter.#addListener(this, eventName, listener, false);
    }
    /**
   * Synchronously calls each of the listeners registered for the event named
   * eventName, in the order they were registered, passing the supplied
   * arguments to each.
   * @return true if the event had listeners, false otherwise
   */ // deno-lint-ignore no-explicit-any
    emit(eventName, ...args) {
        if (hasListeners(this._events, eventName)) {
            if (eventName === "error" && hasListeners(this._events, EventEmitter.errorMonitor)) {
                this.emit(EventEmitter.errorMonitor, ...args);
            }
            const listeners = ensureArray(this._events[eventName]).slice(); // We copy with slice() so array is not mutated during emit
            for (const listener of listeners){
                try {
                    listener.apply(this, args);
                } catch (err) {
                    this.emit("error", err);
                }
            }
            return true;
        } else if (eventName === "error") {
            if (hasListeners(this._events, EventEmitter.errorMonitor)) {
                this.emit(EventEmitter.errorMonitor, ...args);
            }
            let err1 = args.length > 0 ? args[0] : "Unhandled error.";
            if (err1 instanceof Error) {
                throw err1;
            }
            try {
                err1 = inspect(err1);
            } catch  {
            // pass
            }
            throw new ERR_UNHANDLED_ERROR(err1);
        }
        return false;
    }
    /**
   * Returns an array listing the events for which the emitter has
   * registered listeners.
   */ eventNames() {
        return Reflect.ownKeys(this._events);
    }
    /**
   * Returns the current max listener value for the EventEmitter which is
   * either set by emitter.setMaxListeners(n) or defaults to
   * EventEmitter.defaultMaxListeners.
   */ getMaxListeners() {
        return EventEmitter.#getMaxListeners(this);
    }
    /**
   * Returns the number of listeners listening to the event named
   * eventName.
   */ listenerCount(eventName) {
        return EventEmitter.#listenerCount(this, eventName);
    }
    static listenerCount(emitter, eventName) {
        return emitter.listenerCount(eventName);
    }
    /** Returns a copy of the array of listeners for the event named eventName.*/ listeners(eventName) {
        return listeners2(this._events, eventName, true);
    }
    /**
   * Returns a copy of the array of listeners for the event named eventName,
   * including any wrappers (such as those created by .once()).
   */ rawListeners(eventName) {
        return listeners2(this._events, eventName, false);
    }
    /** Alias for emitter.removeListener(). */ off(// deno-lint-ignore no-unused-vars
    eventName, // deno-lint-ignore no-unused-vars
    listener) {
    // The body of this method is empty because it will be overwritten by later code. (`EventEmitter.prototype.off = EventEmitter.prototype.removeListener;`)
    // The purpose of this dirty hack is to get around the current limitation of TypeScript type checking.
    }
    /**
   * Adds the listener function to the end of the listeners array for the event
   *  named eventName. No checks are made to see if the listener has already
   * been added. Multiple calls passing the same combination of eventName and
   * listener will result in the listener being added, and called, multiple
   * times.
   */ on(// deno-lint-ignore no-unused-vars
    eventName, // deno-lint-ignore no-unused-vars
    listener) {
    // The body of this method is empty because it will be overwritten by later code. (`EventEmitter.prototype.addListener = EventEmitter.prototype.on;`)
    // The purpose of this dirty hack is to get around the current limitation of TypeScript type checking.
    }
    /**
   * Adds a one-time listener function for the event named eventName. The next
   * time eventName is triggered, this listener is removed and then invoked.
   */ once(eventName, listener) {
        const wrapped = onceWrap(this, eventName, listener);
        this.on(eventName, wrapped);
        return this;
    }
    /**
   * Adds the listener function to the beginning of the listeners array for the
   *  event named eventName. No checks are made to see if the listener has
   * already been added. Multiple calls passing the same combination of
   * eventName and listener will result in the listener being added, and
   * called, multiple times.
   */ prependListener(eventName, listener) {
        return EventEmitter.#addListener(this, eventName, listener, true);
    }
    /**
   * Adds a one-time listener function for the event named eventName to the
   * beginning of the listeners array. The next time eventName is triggered,
   * this listener is removed, and then invoked.
   */ prependOnceListener(eventName, listener) {
        const wrapped = onceWrap(this, eventName, listener);
        this.prependListener(eventName, wrapped);
        return this;
    }
    /** Removes all listeners, or those of the specified eventName. */ removeAllListeners(eventName) {
        if (this._events === undefined) {
            return this;
        }
        if (eventName) {
            if (hasListeners(this._events, eventName)) {
                const listeners = ensureArray(this._events[eventName]).slice().reverse();
                for (const listener of listeners){
                    this.removeListener(eventName, unwrapListener(listener));
                }
            }
        } else {
            const eventList = this.eventNames();
            eventList.forEach((eventName)=>{
                if (eventName === "removeListener") return;
                this.removeAllListeners(eventName);
            });
            this.removeAllListeners("removeListener");
        }
        return this;
    }
    /**
   * Removes the specified listener from the listener array for the event
   * named eventName.
   */ removeListener(eventName, listener) {
        checkListenerArgument(listener);
        if (hasListeners(this._events, eventName)) {
            const maybeArr = this._events[eventName];
            assert(maybeArr);
            const arr = ensureArray(maybeArr);
            let listenerIndex = -1;
            for(let i = arr.length - 1; i >= 0; i--){
                // arr[i]["listener"] is the reference to the listener inside a bound 'once' wrapper
                if (arr[i] == listener || arr[i] && arr[i]["listener"] == listener) {
                    listenerIndex = i;
                    break;
                }
            }
            if (listenerIndex >= 0) {
                arr.splice(listenerIndex, 1);
                if (arr.length === 0) {
                    delete this._events[eventName];
                } else if (arr.length === 1) {
                    // If there is only one listener, an array is not necessary.
                    this._events[eventName] = arr[0];
                }
                if (this._events.removeListener) {
                    this.emit("removeListener", eventName, listener);
                }
            }
        }
        return this;
    }
    /**
   * By default EventEmitters will print a warning if more than 10 listeners
   * are added for a particular event. This is a useful default that helps
   * finding memory leaks. Obviously, not all events should be limited to just
   * 10 listeners. The emitter.setMaxListeners() method allows the limit to be
   * modified for this specific EventEmitter instance. The value can be set to
   * Infinity (or 0) to indicate an unlimited number of listeners.
   */ setMaxListeners(n) {
        if (n !== Infinity) {
            validateMaxListeners(n, "n");
        }
        this.maxListeners = n;
        return this;
    }
    /**
   * Creates a Promise that is fulfilled when the EventEmitter emits the given
   * event or that is rejected when the EventEmitter emits 'error'. The Promise
   * will resolve with an array of all the arguments emitted to the given event.
   */ static once(emitter, name) {
        return new Promise((resolve, reject)=>{
            if (emitter instanceof EventTarget) {
                // EventTarget does not have `error` event semantics like Node
                // EventEmitters, we do not listen to `error` events here.
                emitter.addEventListener(name, (...args)=>{
                    resolve(args);
                }, {
                    once: true,
                    passive: false,
                    capture: false
                });
                return;
            } else if (emitter instanceof EventEmitter) {
                // deno-lint-ignore no-explicit-any
                const eventListener = (...args)=>{
                    if (errorListener !== undefined) {
                        emitter.removeListener("error", errorListener);
                    }
                    resolve(args);
                };
                let errorListener;
                // Adding an error listener is not optional because
                // if an error is thrown on an event emitter we cannot
                // guarantee that the actual event we are waiting will
                // be fired. The result could be a silent way to create
                // memory or file descriptor leaks, which is something
                // we should avoid.
                if (name !== "error") {
                    // deno-lint-ignore no-explicit-any
                    errorListener = (err)=>{
                        emitter.removeListener(name, eventListener);
                        reject(err);
                    };
                    emitter.once("error", errorListener);
                }
                emitter.once(name, eventListener);
                return;
            }
        });
    }
    /**
   * Returns an AsyncIterator that iterates eventName events. It will throw if
   * the EventEmitter emits 'error'. It removes all listeners when exiting the
   * loop. The value returned by each iteration is an array composed of the
   * emitted event arguments.
   */ static on(emitter, event) {
        // deno-lint-ignore no-explicit-any
        const unconsumedEventValues = [];
        // deno-lint-ignore no-explicit-any
        const unconsumedPromises = [];
        let error = null;
        let finished = false;
        const iterator = {
            // deno-lint-ignore no-explicit-any
            next () {
                // First, we consume all unread events
                // deno-lint-ignore no-explicit-any
                const value = unconsumedEventValues.shift();
                if (value) {
                    return Promise.resolve(createIterResult(value, false));
                }
                // Then we error, if an error happened
                // This happens one time if at all, because after 'error'
                // we stop listening
                if (error) {
                    const p = Promise.reject(error);
                    // Only the first element errors
                    error = null;
                    return p;
                }
                // If the iterator is finished, resolve to done
                if (finished) {
                    return Promise.resolve(createIterResult(undefined, true));
                }
                // Wait until an event happens
                return new Promise(function(resolve, reject) {
                    unconsumedPromises.push({
                        resolve,
                        reject
                    });
                });
            },
            // deno-lint-ignore no-explicit-any
            return () {
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
                finished = true;
                for (const promise of unconsumedPromises){
                    promise.resolve(createIterResult(undefined, true));
                }
                return Promise.resolve(createIterResult(undefined, true));
            },
            throw (err) {
                error = err;
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
            },
            // deno-lint-ignore no-explicit-any
            [Symbol.asyncIterator] () {
                return this;
            }
        };
        emitter.on(event, eventHandler);
        emitter.on("error", errorHandler);
        return iterator;
        // deno-lint-ignore no-explicit-any
        function eventHandler(...args) {
            const promise = unconsumedPromises.shift();
            if (promise) {
                promise.resolve(createIterResult(args, false));
            } else {
                unconsumedEventValues.push(args);
            }
        }
        // deno-lint-ignore no-explicit-any
        function errorHandler(err) {
            finished = true;
            const toError = unconsumedPromises.shift();
            if (toError) {
                toError.reject(err);
            } else {
                // The next time we call next()
                error = err;
            }
            iterator.return();
        }
    }
    // The generic type here is a workaround for `TS2322 [ERROR]: Type 'EventEmitter' is not assignable to type 'this'.` error.
    static  #addListener(target, eventName, listener, prepend) {
        checkListenerArgument(listener);
        let events = target._events;
        if (events == null) {
            EventEmitter.#init(target);
            events = target._events;
        }
        if (events.newListener) {
            target.emit("newListener", eventName, unwrapListener(listener));
        }
        if (hasListeners(events, eventName)) {
            let listeners = events[eventName];
            if (!Array.isArray(listeners)) {
                listeners = [
                    listeners
                ];
                events[eventName] = listeners;
            }
            if (prepend) {
                listeners.unshift(listener);
            } else {
                listeners.push(listener);
            }
        } else if (events) {
            events[eventName] = listener;
        }
        const max = EventEmitter.#getMaxListeners(target);
        if (max > 0 && EventEmitter.#listenerCount(target, eventName) > max) {
            const warning = new MaxListenersExceededWarning(target, eventName);
            EventEmitter.#warnIfNeeded(target, eventName, warning);
        }
        return target;
    }
    static  #getMaxListeners(target1) {
        return target1.maxListeners == null ? EventEmitter.defaultMaxListeners : target1.maxListeners;
    }
    static  #listenerCount(target2, eventName1) {
        if (hasListeners(target2._events, eventName1)) {
            const maybeListeners = target2._events[eventName1];
            return Array.isArray(maybeListeners) ? maybeListeners.length : 1;
        } else {
            return 0;
        }
    }
    static  #warnIfNeeded(target3, eventName2, warning1) {
        const listeners1 = target3._events[eventName2];
        if (listeners1.warned) {
            return;
        }
        listeners1.warned = true;
        console.warn(warning1);
        // TODO(uki00a): Here are two problems:
        // * If `global.ts` is not imported, then `globalThis.process` will be undefined.
        // * Importing `process.ts` from this file will result in circular reference.
        // As a workaround, explicitly check for the existence of `globalThis.process`.
        // deno-lint-ignore no-explicit-any
        const maybeProcess = globalThis.process;
        if (maybeProcess) {
            maybeProcess.emitWarning(warning1);
        }
    }
}
function checkListenerArgument(listener) {
    if (typeof listener !== "function") {
        throw new ERR_INVALID_ARG_TYPE("listener", "function", listener);
    }
}
function hasListeners(maybeEvents, eventName) {
    return maybeEvents != null && Boolean(maybeEvents[eventName]);
}
function listeners2(events, eventName, unwrap) {
    if (!hasListeners(events, eventName)) {
        return [];
    }
    const eventListeners = events[eventName];
    if (Array.isArray(eventListeners)) {
        return unwrap ? unwrapListeners(eventListeners) : eventListeners.slice(0);
    } else {
        return [
            unwrap ? unwrapListener(eventListeners) : eventListeners, 
        ];
    }
}
function unwrapListeners(arr) {
    const unwrappedListeners = new Array(arr.length);
    for(let i = 0; i < arr.length; i++){
        unwrappedListeners[i] = unwrapListener(arr[i]);
    }
    return unwrappedListeners;
}
function unwrapListener(listener) {
    return listener["listener"] ?? listener;
}
// Wrapped function that calls EventEmitter.removeListener(eventName, self) on execution.
function onceWrap(target, eventName, listener) {
    checkListenerArgument(listener);
    const wrapper = function(// deno-lint-ignore no-explicit-any
    ...args) {
        // If `emit` is called in listeners, the same listener can be called multiple times.
        // To prevent that, check the flag here.
        if (this.isCalled) {
            return;
        }
        this.context.removeListener(this.eventName, this.listener);
        this.isCalled = true;
        return this.listener.apply(this.context, args);
    };
    const wrapperContext = {
        eventName: eventName,
        listener: listener,
        rawListener: wrapper,
        context: target
    };
    const wrapped = wrapper.bind(wrapperContext);
    wrapperContext.rawListener = wrapped;
    wrapped.listener = listener;
    return wrapped;
}
// EventEmitter#on should point to the same function as EventEmitter#addListener.
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
// EventEmitter#off should point to the same function as EventEmitter#removeListener.
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
class MaxListenersExceededWarning extends Error {
    count;
    constructor(emitter, type){
        const listenerCount = emitter.listenerCount(type);
        const message = "Possible EventEmitter memory leak detected. " + `${listenerCount} ${type == null ? "null" : type.toString()} listeners added to [${emitter.constructor.name}]. ` + " Use emitter.setMaxListeners() to increase limit";
        super(message);
        this.emitter = emitter;
        this.type = type;
        this.count = listenerCount;
        this.name = "MaxListenersExceededWarning";
    }
    emitter;
    type;
}
makeMethodsEnumerable(EventEmitter);
export default Object.assign(EventEmitter, {
    EventEmitter,
    setMaxListeners
});
export const captureRejectionSymbol = EventEmitter.captureRejectionSymbol;
export const errorMonitor = EventEmitter.errorMonitor;
export const listenerCount = EventEmitter.listenerCount;
export const on = EventEmitter.on;
export const once = EventEmitter.once;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjExNC4wL25vZGUvZXZlbnRzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTkgRGVub2xpYnMgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcIi4uL191dGlsL2Fzc2VydC50c1wiO1xuaW1wb3J0IHsgbWFrZU1ldGhvZHNFbnVtZXJhYmxlLCBub3RJbXBsZW1lbnRlZCB9IGZyb20gXCIuL191dGlscy50c1wiO1xuaW1wb3J0IHtcbiAgRVJSX0lOVkFMSURfQVJHX1RZUEUsXG4gIEVSUl9PVVRfT0ZfUkFOR0UsXG4gIEVSUl9VTkhBTkRMRURfRVJST1IsXG59IGZyb20gXCIuL19lcnJvcnMudHNcIjtcbmltcG9ydCB7IGluc3BlY3QgfSBmcm9tIFwiLi91dGlsLnRzXCI7XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgdHlwZSBHZW5lcmljRnVuY3Rpb24gPSAoLi4uYXJnczogYW55W10pID0+IGFueTtcblxuZXhwb3J0IGludGVyZmFjZSBXcmFwcGVkRnVuY3Rpb24gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb247XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUFycmF5PFQ+KG1heWJlQXJyYXk6IFRbXSB8IFQpOiBUW10ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShtYXliZUFycmF5KSA/IG1heWJlQXJyYXkgOiBbbWF5YmVBcnJheV07XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5mdW5jdGlvbiBjcmVhdGVJdGVyUmVzdWx0KHZhbHVlOiBhbnksIGRvbmU6IGJvb2xlYW4pOiBJdGVyYXRvclJlc3VsdDxhbnk+IHtcbiAgcmV0dXJuIHsgdmFsdWUsIGRvbmUgfTtcbn1cblxuaW50ZXJmYWNlIEFzeW5jSXRlcmFibGUge1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBuZXh0KCk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55LCBhbnk+PjtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgcmV0dXJuKCk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55LCBhbnk+PjtcbiAgdGhyb3coZXJyOiBFcnJvcik6IHZvaWQ7XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogYW55O1xufVxuXG50eXBlIEV2ZW50TWFwID0gUmVjb3JkPFxuICBzdHJpbmcgfCBzeW1ib2wsXG4gIChcbiAgICB8IChBcnJheTxHZW5lcmljRnVuY3Rpb24gfCBXcmFwcGVkRnVuY3Rpb24+KVxuICAgIHwgR2VuZXJpY0Z1bmN0aW9uXG4gICAgfCBXcmFwcGVkRnVuY3Rpb25cbiAgKSAmIHsgd2FybmVkPzogYm9vbGVhbiB9XG4+O1xuXG5leHBvcnQgbGV0IGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcbmZ1bmN0aW9uIHZhbGlkYXRlTWF4TGlzdGVuZXJzKG46IG51bWJlciwgbmFtZTogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghTnVtYmVyLmlzSW50ZWdlcihuKSB8fCBOdW1iZXIuaXNOYU4obikgfHwgbiA8IDApIHtcbiAgICB0aHJvdyBuZXcgRVJSX09VVF9PRl9SQU5HRShuYW1lLCBcImEgbm9uLW5lZ2F0aXZlIG51bWJlclwiLCBpbnNwZWN0KG4pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRNYXhMaXN0ZW5lcnMoXG4gIG46IG51bWJlcixcbiAgLi4uZXZlbnRUYXJnZXRzOiBBcnJheTxFdmVudEVtaXR0ZXIgfCBFdmVudFRhcmdldD5cbik6IHZvaWQge1xuICB2YWxpZGF0ZU1heExpc3RlbmVycyhuLCBcIm5cIik7XG4gIGlmIChldmVudFRhcmdldHMubGVuZ3RoID09PSAwKSB7XG4gICAgZGVmYXVsdE1heExpc3RlbmVycyA9IG47XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCB0YXJnZXQgb2YgZXZlbnRUYXJnZXRzKSB7XG4gICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgRXZlbnRFbWl0dGVyKSB7XG4gICAgICAgIHRhcmdldC5zZXRNYXhMaXN0ZW5lcnMobik7XG4gICAgICB9IGVsc2UgaWYgKHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50VGFyZ2V0KSB7XG4gICAgICAgIG5vdEltcGxlbWVudGVkKFxuICAgICAgICAgIFwic2V0TWF4TGlzdGVuZXJzIGN1cnJlbnRseSBkb2VzIG5vdCBzdXBwb3J0IEV2ZW50VGFyZ2V0XCIsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRVJSX0lOVkFMSURfQVJHX1RZUEUoXG4gICAgICAgICAgXCJldmVudFRhcmdldHNcIixcbiAgICAgICAgICBbXCJFdmVudEVtaXR0ZXJcIiwgXCJFdmVudFRhcmdldFwiXSxcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2VlIGFsc28gaHR0cHM6Ly9ub2RlanMub3JnL2FwaS9ldmVudHMuaHRtbFxuICovXG5leHBvcnQgY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgcHVibGljIHN0YXRpYyBjYXB0dXJlUmVqZWN0aW9uU3ltYm9sID0gU3ltYm9sLmZvcihcIm5vZGVqcy5yZWplY3Rpb25cIik7XG4gIHB1YmxpYyBzdGF0aWMgZXJyb3JNb25pdG9yID0gU3ltYm9sKFwiZXZlbnRzLmVycm9yTW9uaXRvclwiKTtcbiAgcHVibGljIHN0YXRpYyBnZXQgZGVmYXVsdE1heExpc3RlbmVycygpIHtcbiAgICByZXR1cm4gZGVmYXVsdE1heExpc3RlbmVycztcbiAgfVxuICBwdWJsaWMgc3RhdGljIHNldCBkZWZhdWx0TWF4TGlzdGVuZXJzKHZhbHVlOiBudW1iZXIpIHtcbiAgICB2YWxpZGF0ZU1heExpc3RlbmVycyh2YWx1ZSwgXCJkZWZhdWx0TWF4TGlzdGVuZXJzXCIpO1xuICAgIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSB2YWx1ZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF4TGlzdGVuZXJzOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2V2ZW50cyE6IEV2ZW50TWFwO1xuXG4gIHN0YXRpYyAjaW5pdChlbWl0dGVyOiBFdmVudEVtaXR0ZXIpOiB2b2lkIHtcbiAgICBpZiAoXG4gICAgICBlbWl0dGVyLl9ldmVudHMgPT0gbnVsbCB8fFxuICAgICAgZW1pdHRlci5fZXZlbnRzID09PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZW1pdHRlcikuX2V2ZW50cyAvLyBJZiBgZW1pdHRlcmAgZG9lcyBub3Qgb3duIGBfZXZlbnRzYCBidXQgdGhlIHByb3RvdHlwZSBkb2VzXG4gICAgKSB7XG4gICAgICBlbWl0dGVyLl9ldmVudHMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPdmVycmlkZXMgYGNhbGxgIHRvIG1pbWljIHRoZSBlczUgYmVoYXZpb3Igd2l0aCB0aGUgZXM2IGNsYXNzLlxuICAgKi9cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgc3RhdGljIGNhbGwgPSBmdW5jdGlvbiBjYWxsKHRoaXNBcmc6IGFueSk6IHZvaWQge1xuICAgIEV2ZW50RW1pdHRlci4jaW5pdCh0aGlzQXJnKTtcbiAgfTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBFdmVudEVtaXR0ZXIuI2luaXQodGhpcyk7XG4gIH1cblxuICAvKiogQWxpYXMgZm9yIGVtaXR0ZXIub24oZXZlbnROYW1lLCBsaXN0ZW5lcikuICovXG4gIGFkZExpc3RlbmVyKFxuICAgIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICAgIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb24gfCBXcmFwcGVkRnVuY3Rpb24sXG4gICk6IHRoaXMge1xuICAgIHJldHVybiBFdmVudEVtaXR0ZXIuI2FkZExpc3RlbmVyKHRoaXMsIGV2ZW50TmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTeW5jaHJvbm91c2x5IGNhbGxzIGVhY2ggb2YgdGhlIGxpc3RlbmVycyByZWdpc3RlcmVkIGZvciB0aGUgZXZlbnQgbmFtZWRcbiAgICogZXZlbnROYW1lLCBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlIHJlZ2lzdGVyZWQsIHBhc3NpbmcgdGhlIHN1cHBsaWVkXG4gICAqIGFyZ3VtZW50cyB0byBlYWNoLlxuICAgKiBAcmV0dXJuIHRydWUgaWYgdGhlIGV2ZW50IGhhZCBsaXN0ZW5lcnMsIGZhbHNlIG90aGVyd2lzZVxuICAgKi9cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgcHVibGljIGVtaXQoZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsIC4uLmFyZ3M6IGFueVtdKTogYm9vbGVhbiB7XG4gICAgaWYgKGhhc0xpc3RlbmVycyh0aGlzLl9ldmVudHMsIGV2ZW50TmFtZSkpIHtcbiAgICAgIGlmIChcbiAgICAgICAgZXZlbnROYW1lID09PSBcImVycm9yXCIgJiZcbiAgICAgICAgaGFzTGlzdGVuZXJzKHRoaXMuX2V2ZW50cywgRXZlbnRFbWl0dGVyLmVycm9yTW9uaXRvcilcbiAgICAgICkge1xuICAgICAgICB0aGlzLmVtaXQoRXZlbnRFbWl0dGVyLmVycm9yTW9uaXRvciwgLi4uYXJncyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxpc3RlbmVycyA9IGVuc3VyZUFycmF5KHRoaXMuX2V2ZW50c1tldmVudE5hbWVdISlcbiAgICAgICAgLnNsaWNlKCkgYXMgQXJyYXk8R2VuZXJpY0Z1bmN0aW9uPjsgLy8gV2UgY29weSB3aXRoIHNsaWNlKCkgc28gYXJyYXkgaXMgbm90IG11dGF0ZWQgZHVyaW5nIGVtaXRcbiAgICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdGVuZXJzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIGVycik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoZXZlbnROYW1lID09PSBcImVycm9yXCIpIHtcbiAgICAgIGlmIChoYXNMaXN0ZW5lcnModGhpcy5fZXZlbnRzLCBFdmVudEVtaXR0ZXIuZXJyb3JNb25pdG9yKSkge1xuICAgICAgICB0aGlzLmVtaXQoRXZlbnRFbWl0dGVyLmVycm9yTW9uaXRvciwgLi4uYXJncyk7XG4gICAgICB9XG4gICAgICBsZXQgZXJyID0gYXJncy5sZW5ndGggPiAwID8gYXJnc1swXSA6IFwiVW5oYW5kbGVkIGVycm9yLlwiO1xuICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgZXJyID0gaW5zcGVjdChlcnIpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIHBhc3NcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFUlJfVU5IQU5ETEVEX0VSUk9SKGVycik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIGFycmF5IGxpc3RpbmcgdGhlIGV2ZW50cyBmb3Igd2hpY2ggdGhlIGVtaXR0ZXIgaGFzXG4gICAqIHJlZ2lzdGVyZWQgbGlzdGVuZXJzLlxuICAgKi9cbiAgcHVibGljIGV2ZW50TmFtZXMoKTogW3N0cmluZyB8IHN5bWJvbF0ge1xuICAgIHJldHVybiBSZWZsZWN0Lm93bktleXModGhpcy5fZXZlbnRzKSBhcyBbXG4gICAgICBzdHJpbmcgfCBzeW1ib2wsXG4gICAgXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IG1heCBsaXN0ZW5lciB2YWx1ZSBmb3IgdGhlIEV2ZW50RW1pdHRlciB3aGljaCBpc1xuICAgKiBlaXRoZXIgc2V0IGJ5IGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKG4pIG9yIGRlZmF1bHRzIHRvXG4gICAqIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzLlxuICAgKi9cbiAgcHVibGljIGdldE1heExpc3RlbmVycygpOiBudW1iZXIge1xuICAgIHJldHVybiBFdmVudEVtaXR0ZXIuI2dldE1heExpc3RlbmVycyh0aGlzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgbGlzdGVuZXJzIGxpc3RlbmluZyB0byB0aGUgZXZlbnQgbmFtZWRcbiAgICogZXZlbnROYW1lLlxuICAgKi9cbiAgcHVibGljIGxpc3RlbmVyQ291bnQoZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wpOiBudW1iZXIge1xuICAgIHJldHVybiBFdmVudEVtaXR0ZXIuI2xpc3RlbmVyQ291bnQodGhpcywgZXZlbnROYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyBsaXN0ZW5lckNvdW50KFxuICAgIGVtaXR0ZXI6IEV2ZW50RW1pdHRlcixcbiAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KGV2ZW50TmFtZSk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhIGNvcHkgb2YgdGhlIGFycmF5IG9mIGxpc3RlbmVycyBmb3IgdGhlIGV2ZW50IG5hbWVkIGV2ZW50TmFtZS4qL1xuICBwdWJsaWMgbGlzdGVuZXJzKGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sKTogR2VuZXJpY0Z1bmN0aW9uW10ge1xuICAgIHJldHVybiBsaXN0ZW5lcnModGhpcy5fZXZlbnRzLCBldmVudE5hbWUsIHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBhcnJheSBvZiBsaXN0ZW5lcnMgZm9yIHRoZSBldmVudCBuYW1lZCBldmVudE5hbWUsXG4gICAqIGluY2x1ZGluZyBhbnkgd3JhcHBlcnMgKHN1Y2ggYXMgdGhvc2UgY3JlYXRlZCBieSAub25jZSgpKS5cbiAgICovXG4gIHB1YmxpYyByYXdMaXN0ZW5lcnMoXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICk6IEFycmF5PEdlbmVyaWNGdW5jdGlvbiB8IFdyYXBwZWRGdW5jdGlvbj4ge1xuICAgIHJldHVybiBsaXN0ZW5lcnModGhpcy5fZXZlbnRzLCBldmVudE5hbWUsIGZhbHNlKTtcbiAgfVxuXG4gIC8qKiBBbGlhcyBmb3IgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcigpLiAqL1xuICBwdWJsaWMgb2ZmKFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tdW51c2VkLXZhcnNcbiAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLXVudXNlZC12YXJzXG4gICAgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIGJhbi10cy1jb21tZW50XG4gICAgLy8gQHRzLWlnbm9yZVxuICApOiB0aGlzIHtcbiAgICAvLyBUaGUgYm9keSBvZiB0aGlzIG1ldGhvZCBpcyBlbXB0eSBiZWNhdXNlIGl0IHdpbGwgYmUgb3ZlcndyaXR0ZW4gYnkgbGF0ZXIgY29kZS4gKGBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7YClcbiAgICAvLyBUaGUgcHVycG9zZSBvZiB0aGlzIGRpcnR5IGhhY2sgaXMgdG8gZ2V0IGFyb3VuZCB0aGUgY3VycmVudCBsaW1pdGF0aW9uIG9mIFR5cGVTY3JpcHQgdHlwZSBjaGVja2luZy5cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBsaXN0ZW5lciBmdW5jdGlvbiB0byB0aGUgZW5kIG9mIHRoZSBsaXN0ZW5lcnMgYXJyYXkgZm9yIHRoZSBldmVudFxuICAgKiAgbmFtZWQgZXZlbnROYW1lLiBObyBjaGVja3MgYXJlIG1hZGUgdG8gc2VlIGlmIHRoZSBsaXN0ZW5lciBoYXMgYWxyZWFkeVxuICAgKiBiZWVuIGFkZGVkLiBNdWx0aXBsZSBjYWxscyBwYXNzaW5nIHRoZSBzYW1lIGNvbWJpbmF0aW9uIG9mIGV2ZW50TmFtZSBhbmRcbiAgICogbGlzdGVuZXIgd2lsbCByZXN1bHQgaW4gdGhlIGxpc3RlbmVyIGJlaW5nIGFkZGVkLCBhbmQgY2FsbGVkLCBtdWx0aXBsZVxuICAgKiB0aW1lcy5cbiAgICovXG4gIHB1YmxpYyBvbihcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLXVudXNlZC12YXJzXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby11bnVzZWQtdmFyc1xuICAgIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb24gfCBXcmFwcGVkRnVuY3Rpb24sXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBiYW4tdHMtY29tbWVudFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgKTogdGhpcyB7XG4gICAgLy8gVGhlIGJvZHkgb2YgdGhpcyBtZXRob2QgaXMgZW1wdHkgYmVjYXVzZSBpdCB3aWxsIGJlIG92ZXJ3cml0dGVuIGJ5IGxhdGVyIGNvZGUuIChgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247YClcbiAgICAvLyBUaGUgcHVycG9zZSBvZiB0aGlzIGRpcnR5IGhhY2sgaXMgdG8gZ2V0IGFyb3VuZCB0aGUgY3VycmVudCBsaW1pdGF0aW9uIG9mIFR5cGVTY3JpcHQgdHlwZSBjaGVja2luZy5cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgb25lLXRpbWUgbGlzdGVuZXIgZnVuY3Rpb24gZm9yIHRoZSBldmVudCBuYW1lZCBldmVudE5hbWUuIFRoZSBuZXh0XG4gICAqIHRpbWUgZXZlbnROYW1lIGlzIHRyaWdnZXJlZCwgdGhpcyBsaXN0ZW5lciBpcyByZW1vdmVkIGFuZCB0aGVuIGludm9rZWQuXG4gICAqL1xuICBwdWJsaWMgb25jZShldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCwgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbik6IHRoaXMge1xuICAgIGNvbnN0IHdyYXBwZWQ6IFdyYXBwZWRGdW5jdGlvbiA9IG9uY2VXcmFwKHRoaXMsIGV2ZW50TmFtZSwgbGlzdGVuZXIpO1xuICAgIHRoaXMub24oZXZlbnROYW1lLCB3cmFwcGVkKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBsaXN0ZW5lciBmdW5jdGlvbiB0byB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaXN0ZW5lcnMgYXJyYXkgZm9yIHRoZVxuICAgKiAgZXZlbnQgbmFtZWQgZXZlbnROYW1lLiBObyBjaGVja3MgYXJlIG1hZGUgdG8gc2VlIGlmIHRoZSBsaXN0ZW5lciBoYXNcbiAgICogYWxyZWFkeSBiZWVuIGFkZGVkLiBNdWx0aXBsZSBjYWxscyBwYXNzaW5nIHRoZSBzYW1lIGNvbWJpbmF0aW9uIG9mXG4gICAqIGV2ZW50TmFtZSBhbmQgbGlzdGVuZXIgd2lsbCByZXN1bHQgaW4gdGhlIGxpc3RlbmVyIGJlaW5nIGFkZGVkLCBhbmRcbiAgICogY2FsbGVkLCBtdWx0aXBsZSB0aW1lcy5cbiAgICovXG4gIHB1YmxpYyBwcmVwZW5kTGlzdGVuZXIoXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICAgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbiB8IFdyYXBwZWRGdW5jdGlvbixcbiAgKTogdGhpcyB7XG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlci4jYWRkTGlzdGVuZXIodGhpcywgZXZlbnROYW1lLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIG9uZS10aW1lIGxpc3RlbmVyIGZ1bmN0aW9uIGZvciB0aGUgZXZlbnQgbmFtZWQgZXZlbnROYW1lIHRvIHRoZVxuICAgKiBiZWdpbm5pbmcgb2YgdGhlIGxpc3RlbmVycyBhcnJheS4gVGhlIG5leHQgdGltZSBldmVudE5hbWUgaXMgdHJpZ2dlcmVkLFxuICAgKiB0aGlzIGxpc3RlbmVyIGlzIHJlbW92ZWQsIGFuZCB0aGVuIGludm9rZWQuXG4gICAqL1xuICBwdWJsaWMgcHJlcGVuZE9uY2VMaXN0ZW5lcihcbiAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uLFxuICApOiB0aGlzIHtcbiAgICBjb25zdCB3cmFwcGVkOiBXcmFwcGVkRnVuY3Rpb24gPSBvbmNlV3JhcCh0aGlzLCBldmVudE5hbWUsIGxpc3RlbmVyKTtcbiAgICB0aGlzLnByZXBlbmRMaXN0ZW5lcihldmVudE5hbWUsIHdyYXBwZWQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqIFJlbW92ZXMgYWxsIGxpc3RlbmVycywgb3IgdGhvc2Ugb2YgdGhlIHNwZWNpZmllZCBldmVudE5hbWUuICovXG4gIHB1YmxpYyByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnROYW1lPzogc3RyaW5nIHwgc3ltYm9sKTogdGhpcyB7XG4gICAgaWYgKHRoaXMuX2V2ZW50cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAoZXZlbnROYW1lKSB7XG4gICAgICBpZiAoaGFzTGlzdGVuZXJzKHRoaXMuX2V2ZW50cywgZXZlbnROYW1lKSkge1xuICAgICAgICBjb25zdCBsaXN0ZW5lcnMgPSBlbnN1cmVBcnJheSh0aGlzLl9ldmVudHNbZXZlbnROYW1lXSkuc2xpY2UoKVxuICAgICAgICAgIC5yZXZlcnNlKCk7XG4gICAgICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihcbiAgICAgICAgICAgIGV2ZW50TmFtZSxcbiAgICAgICAgICAgIHVud3JhcExpc3RlbmVyKGxpc3RlbmVyKSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV2ZW50TGlzdCA9IHRoaXMuZXZlbnROYW1lcygpO1xuICAgICAgZXZlbnRMaXN0LmZvckVhY2goKGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sKSA9PiB7XG4gICAgICAgIGlmIChldmVudE5hbWUgPT09IFwicmVtb3ZlTGlzdGVuZXJcIikgcmV0dXJuO1xuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhldmVudE5hbWUpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhcInJlbW92ZUxpc3RlbmVyXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgdGhlIHNwZWNpZmllZCBsaXN0ZW5lciBmcm9tIHRoZSBsaXN0ZW5lciBhcnJheSBmb3IgdGhlIGV2ZW50XG4gICAqIG5hbWVkIGV2ZW50TmFtZS5cbiAgICovXG4gIHB1YmxpYyByZW1vdmVMaXN0ZW5lcihcbiAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uLFxuICApOiB0aGlzIHtcbiAgICBjaGVja0xpc3RlbmVyQXJndW1lbnQobGlzdGVuZXIpO1xuICAgIGlmIChoYXNMaXN0ZW5lcnModGhpcy5fZXZlbnRzLCBldmVudE5hbWUpKSB7XG4gICAgICBjb25zdCBtYXliZUFyciA9IHRoaXMuX2V2ZW50c1tldmVudE5hbWVdO1xuXG4gICAgICBhc3NlcnQobWF5YmVBcnIpO1xuICAgICAgY29uc3QgYXJyID0gZW5zdXJlQXJyYXkobWF5YmVBcnIpO1xuXG4gICAgICBsZXQgbGlzdGVuZXJJbmRleCA9IC0xO1xuICAgICAgZm9yIChsZXQgaSA9IGFyci5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAvLyBhcnJbaV1bXCJsaXN0ZW5lclwiXSBpcyB0aGUgcmVmZXJlbmNlIHRvIHRoZSBsaXN0ZW5lciBpbnNpZGUgYSBib3VuZCAnb25jZScgd3JhcHBlclxuICAgICAgICBpZiAoXG4gICAgICAgICAgYXJyW2ldID09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGFycltpXSAmJiAoYXJyW2ldIGFzIFdyYXBwZWRGdW5jdGlvbilbXCJsaXN0ZW5lclwiXSA9PSBsaXN0ZW5lcilcbiAgICAgICAgKSB7XG4gICAgICAgICAgbGlzdGVuZXJJbmRleCA9IGk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGxpc3RlbmVySW5kZXggPj0gMCkge1xuICAgICAgICBhcnIuc3BsaWNlKGxpc3RlbmVySW5kZXgsIDEpO1xuICAgICAgICBpZiAoYXJyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZlbnROYW1lXTtcbiAgICAgICAgfSBlbHNlIGlmIChhcnIubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgb25seSBvbmUgbGlzdGVuZXIsIGFuIGFycmF5IGlzIG5vdCBuZWNlc3NhcnkuXG4gICAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50TmFtZV0gPSBhcnJbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICAgICAgdGhpcy5lbWl0KFwicmVtb3ZlTGlzdGVuZXJcIiwgZXZlbnROYW1lLCBsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnNcbiAgICogYXJlIGFkZGVkIGZvciBhIHBhcnRpY3VsYXIgZXZlbnQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB0aGF0IGhlbHBzXG4gICAqIGZpbmRpbmcgbWVtb3J5IGxlYWtzLiBPYnZpb3VzbHksIG5vdCBhbGwgZXZlbnRzIHNob3VsZCBiZSBsaW1pdGVkIHRvIGp1c3RcbiAgICogMTAgbGlzdGVuZXJzLiBUaGUgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSBtZXRob2QgYWxsb3dzIHRoZSBsaW1pdCB0byBiZVxuICAgKiBtb2RpZmllZCBmb3IgdGhpcyBzcGVjaWZpYyBFdmVudEVtaXR0ZXIgaW5zdGFuY2UuIFRoZSB2YWx1ZSBjYW4gYmUgc2V0IHRvXG4gICAqIEluZmluaXR5IChvciAwKSB0byBpbmRpY2F0ZSBhbiB1bmxpbWl0ZWQgbnVtYmVyIG9mIGxpc3RlbmVycy5cbiAgICovXG4gIHB1YmxpYyBzZXRNYXhMaXN0ZW5lcnMobjogbnVtYmVyKTogdGhpcyB7XG4gICAgaWYgKG4gIT09IEluZmluaXR5KSB7XG4gICAgICB2YWxpZGF0ZU1heExpc3RlbmVycyhuLCBcIm5cIik7XG4gICAgfVxuXG4gICAgdGhpcy5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBQcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gdGhlIEV2ZW50RW1pdHRlciBlbWl0cyB0aGUgZ2l2ZW5cbiAgICogZXZlbnQgb3IgdGhhdCBpcyByZWplY3RlZCB3aGVuIHRoZSBFdmVudEVtaXR0ZXIgZW1pdHMgJ2Vycm9yJy4gVGhlIFByb21pc2VcbiAgICogd2lsbCByZXNvbHZlIHdpdGggYW4gYXJyYXkgb2YgYWxsIHRoZSBhcmd1bWVudHMgZW1pdHRlZCB0byB0aGUgZ2l2ZW4gZXZlbnQuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIG9uY2UoXG4gICAgZW1pdHRlcjogRXZlbnRFbWl0dGVyIHwgRXZlbnRUYXJnZXQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICk6IFByb21pc2U8YW55W10+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaWYgKGVtaXR0ZXIgaW5zdGFuY2VvZiBFdmVudFRhcmdldCkge1xuICAgICAgICAvLyBFdmVudFRhcmdldCBkb2VzIG5vdCBoYXZlIGBlcnJvcmAgZXZlbnQgc2VtYW50aWNzIGxpa2UgTm9kZVxuICAgICAgICAvLyBFdmVudEVtaXR0ZXJzLCB3ZSBkbyBub3QgbGlzdGVuIHRvIGBlcnJvcmAgZXZlbnRzIGhlcmUuXG4gICAgICAgIGVtaXR0ZXIuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGFyZ3MpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgeyBvbmNlOiB0cnVlLCBwYXNzaXZlOiBmYWxzZSwgY2FwdHVyZTogZmFsc2UgfSxcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIGlmIChlbWl0dGVyIGluc3RhbmNlb2YgRXZlbnRFbWl0dGVyKSB7XG4gICAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgICAgIGNvbnN0IGV2ZW50TGlzdGVuZXIgPSAoLi4uYXJnczogYW55W10pOiB2b2lkID0+IHtcbiAgICAgICAgICBpZiAoZXJyb3JMaXN0ZW5lciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlbWl0dGVyLnJlbW92ZUxpc3RlbmVyKFwiZXJyb3JcIiwgZXJyb3JMaXN0ZW5lcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc29sdmUoYXJncyk7XG4gICAgICAgIH07XG4gICAgICAgIGxldCBlcnJvckxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb247XG5cbiAgICAgICAgLy8gQWRkaW5nIGFuIGVycm9yIGxpc3RlbmVyIGlzIG5vdCBvcHRpb25hbCBiZWNhdXNlXG4gICAgICAgIC8vIGlmIGFuIGVycm9yIGlzIHRocm93biBvbiBhbiBldmVudCBlbWl0dGVyIHdlIGNhbm5vdFxuICAgICAgICAvLyBndWFyYW50ZWUgdGhhdCB0aGUgYWN0dWFsIGV2ZW50IHdlIGFyZSB3YWl0aW5nIHdpbGxcbiAgICAgICAgLy8gYmUgZmlyZWQuIFRoZSByZXN1bHQgY291bGQgYmUgYSBzaWxlbnQgd2F5IHRvIGNyZWF0ZVxuICAgICAgICAvLyBtZW1vcnkgb3IgZmlsZSBkZXNjcmlwdG9yIGxlYWtzLCB3aGljaCBpcyBzb21ldGhpbmdcbiAgICAgICAgLy8gd2Ugc2hvdWxkIGF2b2lkLlxuICAgICAgICBpZiAobmFtZSAhPT0gXCJlcnJvclwiKSB7XG4gICAgICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgICAgICBlcnJvckxpc3RlbmVyID0gKGVycjogYW55KTogdm9pZCA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLnJlbW92ZUxpc3RlbmVyKG5hbWUsIGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGVtaXR0ZXIub25jZShcImVycm9yXCIsIGVycm9yTGlzdGVuZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZW1pdHRlci5vbmNlKG5hbWUsIGV2ZW50TGlzdGVuZXIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBBc3luY0l0ZXJhdG9yIHRoYXQgaXRlcmF0ZXMgZXZlbnROYW1lIGV2ZW50cy4gSXQgd2lsbCB0aHJvdyBpZlxuICAgKiB0aGUgRXZlbnRFbWl0dGVyIGVtaXRzICdlcnJvcicuIEl0IHJlbW92ZXMgYWxsIGxpc3RlbmVycyB3aGVuIGV4aXRpbmcgdGhlXG4gICAqIGxvb3AuIFRoZSB2YWx1ZSByZXR1cm5lZCBieSBlYWNoIGl0ZXJhdGlvbiBpcyBhbiBhcnJheSBjb21wb3NlZCBvZiB0aGVcbiAgICogZW1pdHRlZCBldmVudCBhcmd1bWVudHMuXG4gICAqL1xuICBwdWJsaWMgc3RhdGljIG9uKFxuICAgIGVtaXR0ZXI6IEV2ZW50RW1pdHRlcixcbiAgICBldmVudDogc3RyaW5nIHwgc3ltYm9sLFxuICApOiBBc3luY0l0ZXJhYmxlIHtcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHVuY29uc3VtZWRFdmVudFZhbHVlczogYW55W10gPSBbXTtcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHVuY29uc3VtZWRQcm9taXNlczogYW55W10gPSBbXTtcbiAgICBsZXQgZXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGZpbmlzaGVkID0gZmFsc2U7XG5cbiAgICBjb25zdCBpdGVyYXRvciA9IHtcbiAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgICBuZXh0KCk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICAvLyBGaXJzdCwgd2UgY29uc3VtZSBhbGwgdW5yZWFkIGV2ZW50c1xuICAgICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgICBjb25zdCB2YWx1ZTogYW55ID0gdW5jb25zdW1lZEV2ZW50VmFsdWVzLnNoaWZ0KCk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoY3JlYXRlSXRlclJlc3VsdCh2YWx1ZSwgZmFsc2UpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZW4gd2UgZXJyb3IsIGlmIGFuIGVycm9yIGhhcHBlbmVkXG4gICAgICAgIC8vIFRoaXMgaGFwcGVucyBvbmUgdGltZSBpZiBhdCBhbGwsIGJlY2F1c2UgYWZ0ZXIgJ2Vycm9yJ1xuICAgICAgICAvLyB3ZSBzdG9wIGxpc3RlbmluZ1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zdCBwOiBQcm9taXNlPG5ldmVyPiA9IFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAvLyBPbmx5IHRoZSBmaXJzdCBlbGVtZW50IGVycm9yc1xuICAgICAgICAgIGVycm9yID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSBpdGVyYXRvciBpcyBmaW5pc2hlZCwgcmVzb2x2ZSB0byBkb25lXG4gICAgICAgIGlmIChmaW5pc2hlZCkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoY3JlYXRlSXRlclJlc3VsdCh1bmRlZmluZWQsIHRydWUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdhaXQgdW50aWwgYW4gZXZlbnQgaGFwcGVuc1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIHVuY29uc3VtZWRQcm9taXNlcy5wdXNoKHsgcmVzb2x2ZSwgcmVqZWN0IH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgICByZXR1cm4oKTogUHJvbWlzZTxJdGVyYXRvclJlc3VsdDxhbnk+PiB7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGV2ZW50SGFuZGxlcik7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoXCJlcnJvclwiLCBlcnJvckhhbmRsZXIpO1xuICAgICAgICBmaW5pc2hlZCA9IHRydWU7XG5cbiAgICAgICAgZm9yIChjb25zdCBwcm9taXNlIG9mIHVuY29uc3VtZWRQcm9taXNlcykge1xuICAgICAgICAgIHByb21pc2UucmVzb2x2ZShjcmVhdGVJdGVyUmVzdWx0KHVuZGVmaW5lZCwgdHJ1ZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjcmVhdGVJdGVyUmVzdWx0KHVuZGVmaW5lZCwgdHJ1ZSkpO1xuICAgICAgfSxcblxuICAgICAgdGhyb3coZXJyOiBFcnJvcik6IHZvaWQge1xuICAgICAgICBlcnJvciA9IGVycjtcbiAgICAgICAgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcihldmVudCwgZXZlbnRIYW5kbGVyKTtcbiAgICAgICAgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcihcImVycm9yXCIsIGVycm9ySGFuZGxlcik7XG4gICAgICB9LFxuXG4gICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBhbnkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGVtaXR0ZXIub24oZXZlbnQsIGV2ZW50SGFuZGxlcik7XG4gICAgZW1pdHRlci5vbihcImVycm9yXCIsIGVycm9ySGFuZGxlcik7XG5cbiAgICByZXR1cm4gaXRlcmF0b3I7XG5cbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGZ1bmN0aW9uIGV2ZW50SGFuZGxlciguLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgICAgY29uc3QgcHJvbWlzZSA9IHVuY29uc3VtZWRQcm9taXNlcy5zaGlmdCgpO1xuICAgICAgaWYgKHByb21pc2UpIHtcbiAgICAgICAgcHJvbWlzZS5yZXNvbHZlKGNyZWF0ZUl0ZXJSZXN1bHQoYXJncywgZmFsc2UpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVuY29uc3VtZWRFdmVudFZhbHVlcy5wdXNoKGFyZ3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgZnVuY3Rpb24gZXJyb3JIYW5kbGVyKGVycjogYW55KTogdm9pZCB7XG4gICAgICBmaW5pc2hlZCA9IHRydWU7XG5cbiAgICAgIGNvbnN0IHRvRXJyb3IgPSB1bmNvbnN1bWVkUHJvbWlzZXMuc2hpZnQoKTtcbiAgICAgIGlmICh0b0Vycm9yKSB7XG4gICAgICAgIHRvRXJyb3IucmVqZWN0KGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGUgbmV4dCB0aW1lIHdlIGNhbGwgbmV4dCgpXG4gICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgfVxuXG4gICAgICBpdGVyYXRvci5yZXR1cm4oKTtcbiAgICB9XG4gIH1cblxuICAvLyBUaGUgZ2VuZXJpYyB0eXBlIGhlcmUgaXMgYSB3b3JrYXJvdW5kIGZvciBgVFMyMzIyIFtFUlJPUl06IFR5cGUgJ0V2ZW50RW1pdHRlcicgaXMgbm90IGFzc2lnbmFibGUgdG8gdHlwZSAndGhpcycuYCBlcnJvci5cbiAgc3RhdGljICNhZGRMaXN0ZW5lcjxUIGV4dGVuZHMgRXZlbnRFbWl0dGVyPihcbiAgICB0YXJnZXQ6IFQsXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICAgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbiB8IFdyYXBwZWRGdW5jdGlvbixcbiAgICBwcmVwZW5kOiBib29sZWFuLFxuICApOiBUIHtcbiAgICBjaGVja0xpc3RlbmVyQXJndW1lbnQobGlzdGVuZXIpO1xuICAgIGxldCBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcbiAgICBpZiAoZXZlbnRzID09IG51bGwpIHtcbiAgICAgIEV2ZW50RW1pdHRlci4jaW5pdCh0YXJnZXQpO1xuICAgICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgdGFyZ2V0LmVtaXQoXCJuZXdMaXN0ZW5lclwiLCBldmVudE5hbWUsIHVud3JhcExpc3RlbmVyKGxpc3RlbmVyKSk7XG4gICAgfVxuXG4gICAgaWYgKGhhc0xpc3RlbmVycyhldmVudHMsIGV2ZW50TmFtZSkpIHtcbiAgICAgIGxldCBsaXN0ZW5lcnMgPSBldmVudHNbZXZlbnROYW1lXTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0ZW5lcnMpKSB7XG4gICAgICAgIGxpc3RlbmVycyA9IFtsaXN0ZW5lcnNdO1xuICAgICAgICBldmVudHNbZXZlbnROYW1lXSA9IGxpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgaWYgKHByZXBlbmQpIHtcbiAgICAgICAgbGlzdGVuZXJzLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZXZlbnRzKSB7XG4gICAgICBldmVudHNbZXZlbnROYW1lXSA9IGxpc3RlbmVyO1xuICAgIH1cblxuICAgIGNvbnN0IG1heCA9IEV2ZW50RW1pdHRlci4jZ2V0TWF4TGlzdGVuZXJzKHRhcmdldCk7XG4gICAgaWYgKG1heCA+IDAgJiYgRXZlbnRFbWl0dGVyLiNsaXN0ZW5lckNvdW50KHRhcmdldCwgZXZlbnROYW1lKSA+IG1heCkge1xuICAgICAgY29uc3Qgd2FybmluZyA9IG5ldyBNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmcodGFyZ2V0LCBldmVudE5hbWUpO1xuICAgICAgRXZlbnRFbWl0dGVyLiN3YXJuSWZOZWVkZWQodGFyZ2V0LCBldmVudE5hbWUsIHdhcm5pbmcpO1xuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cblxuICBzdGF0aWMgI2dldE1heExpc3RlbmVycyh0YXJnZXQ6IEV2ZW50RW1pdHRlcik6IG51bWJlciB7XG4gICAgcmV0dXJuIHRhcmdldC5tYXhMaXN0ZW5lcnMgPT0gbnVsbFxuICAgICAgPyBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVyc1xuICAgICAgOiB0YXJnZXQubWF4TGlzdGVuZXJzO1xuICB9XG5cbiAgc3RhdGljICNsaXN0ZW5lckNvdW50KFxuICAgIHRhcmdldDogRXZlbnRFbWl0dGVyLFxuICAgIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICApOiBudW1iZXIge1xuICAgIGlmIChoYXNMaXN0ZW5lcnModGFyZ2V0Ll9ldmVudHMsIGV2ZW50TmFtZSkpIHtcbiAgICAgIGNvbnN0IG1heWJlTGlzdGVuZXJzID0gdGFyZ2V0Ll9ldmVudHNbZXZlbnROYW1lXTtcbiAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KG1heWJlTGlzdGVuZXJzKSA/IG1heWJlTGlzdGVuZXJzLmxlbmd0aCA6IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyAjd2FybklmTmVlZGVkKFxuICAgIHRhcmdldDogRXZlbnRFbWl0dGVyLFxuICAgIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICAgIHdhcm5pbmc6IEVycm9yLFxuICApIHtcbiAgICBjb25zdCBsaXN0ZW5lcnMgPSB0YXJnZXQuX2V2ZW50c1tldmVudE5hbWVdO1xuICAgIGlmIChsaXN0ZW5lcnMud2FybmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgIGNvbnNvbGUud2Fybih3YXJuaW5nKTtcblxuICAgIC8vIFRPRE8odWtpMDBhKTogSGVyZSBhcmUgdHdvIHByb2JsZW1zOlxuICAgIC8vICogSWYgYGdsb2JhbC50c2AgaXMgbm90IGltcG9ydGVkLCB0aGVuIGBnbG9iYWxUaGlzLnByb2Nlc3NgIHdpbGwgYmUgdW5kZWZpbmVkLlxuICAgIC8vICogSW1wb3J0aW5nIGBwcm9jZXNzLnRzYCBmcm9tIHRoaXMgZmlsZSB3aWxsIHJlc3VsdCBpbiBjaXJjdWxhciByZWZlcmVuY2UuXG4gICAgLy8gQXMgYSB3b3JrYXJvdW5kLCBleHBsaWNpdGx5IGNoZWNrIGZvciB0aGUgZXhpc3RlbmNlIG9mIGBnbG9iYWxUaGlzLnByb2Nlc3NgLlxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgbWF5YmVQcm9jZXNzID0gKGdsb2JhbFRoaXMgYXMgYW55KS5wcm9jZXNzO1xuICAgIGlmIChtYXliZVByb2Nlc3MpIHtcbiAgICAgIG1heWJlUHJvY2Vzcy5lbWl0V2FybmluZyh3YXJuaW5nKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY2hlY2tMaXN0ZW5lckFyZ3VtZW50KGxpc3RlbmVyOiB1bmtub3duKTogdm9pZCB7XG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgIHRocm93IG5ldyBFUlJfSU5WQUxJRF9BUkdfVFlQRShcImxpc3RlbmVyXCIsIFwiZnVuY3Rpb25cIiwgbGlzdGVuZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhc0xpc3RlbmVycyhcbiAgbWF5YmVFdmVudHM6IEV2ZW50TWFwIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIG1heWJlRXZlbnRzICE9IG51bGwgJiYgQm9vbGVhbihtYXliZUV2ZW50c1tldmVudE5hbWVdKTtcbn1cblxuZnVuY3Rpb24gbGlzdGVuZXJzKFxuICBldmVudHM6IEV2ZW50TWFwLFxuICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgdW53cmFwOiBib29sZWFuLFxuKTogR2VuZXJpY0Z1bmN0aW9uW10ge1xuICBpZiAoIWhhc0xpc3RlbmVycyhldmVudHMsIGV2ZW50TmFtZSkpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBldmVudExpc3RlbmVycyA9IGV2ZW50c1tldmVudE5hbWVdO1xuICBpZiAoQXJyYXkuaXNBcnJheShldmVudExpc3RlbmVycykpIHtcbiAgICByZXR1cm4gdW53cmFwXG4gICAgICA/IHVud3JhcExpc3RlbmVycyhldmVudExpc3RlbmVycylcbiAgICAgIDogZXZlbnRMaXN0ZW5lcnMuc2xpY2UoMCkgYXMgR2VuZXJpY0Z1bmN0aW9uW107XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHVud3JhcCA/IHVud3JhcExpc3RlbmVyKGV2ZW50TGlzdGVuZXJzKSA6IGV2ZW50TGlzdGVuZXJzLFxuICAgIF0gYXMgR2VuZXJpY0Z1bmN0aW9uW107XG4gIH1cbn1cblxuZnVuY3Rpb24gdW53cmFwTGlzdGVuZXJzKFxuICBhcnI6IChHZW5lcmljRnVuY3Rpb24gfCBXcmFwcGVkRnVuY3Rpb24pW10sXG4pOiBHZW5lcmljRnVuY3Rpb25bXSB7XG4gIGNvbnN0IHVud3JhcHBlZExpc3RlbmVycyA9IG5ldyBBcnJheShhcnIubGVuZ3RoKSBhcyBHZW5lcmljRnVuY3Rpb25bXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICB1bndyYXBwZWRMaXN0ZW5lcnNbaV0gPSB1bndyYXBMaXN0ZW5lcihhcnJbaV0pO1xuICB9XG4gIHJldHVybiB1bndyYXBwZWRMaXN0ZW5lcnM7XG59XG5cbmZ1bmN0aW9uIHVud3JhcExpc3RlbmVyKFxuICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uIHwgV3JhcHBlZEZ1bmN0aW9uLFxuKTogR2VuZXJpY0Z1bmN0aW9uIHtcbiAgcmV0dXJuIChsaXN0ZW5lciBhcyBXcmFwcGVkRnVuY3Rpb24pW1wibGlzdGVuZXJcIl0gPz8gbGlzdGVuZXI7XG59XG5cbi8vIFdyYXBwZWQgZnVuY3Rpb24gdGhhdCBjYWxscyBFdmVudEVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoZXZlbnROYW1lLCBzZWxmKSBvbiBleGVjdXRpb24uXG5mdW5jdGlvbiBvbmNlV3JhcChcbiAgdGFyZ2V0OiBFdmVudEVtaXR0ZXIsXG4gIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uLFxuKTogV3JhcHBlZEZ1bmN0aW9uIHtcbiAgY2hlY2tMaXN0ZW5lckFyZ3VtZW50KGxpc3RlbmVyKTtcbiAgY29uc3Qgd3JhcHBlciA9IGZ1bmN0aW9uIChcbiAgICB0aGlzOiB7XG4gICAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbDtcbiAgICAgIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb247XG4gICAgICByYXdMaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uIHwgV3JhcHBlZEZ1bmN0aW9uO1xuICAgICAgY29udGV4dDogRXZlbnRFbWl0dGVyO1xuICAgICAgaXNDYWxsZWQ/OiBib29sZWFuO1xuICAgIH0sXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAuLi5hcmdzOiBhbnlbXVxuICApOiB2b2lkIHtcbiAgICAvLyBJZiBgZW1pdGAgaXMgY2FsbGVkIGluIGxpc3RlbmVycywgdGhlIHNhbWUgbGlzdGVuZXIgY2FuIGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lcy5cbiAgICAvLyBUbyBwcmV2ZW50IHRoYXQsIGNoZWNrIHRoZSBmbGFnIGhlcmUuXG4gICAgaWYgKHRoaXMuaXNDYWxsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jb250ZXh0LnJlbW92ZUxpc3RlbmVyKFxuICAgICAgdGhpcy5ldmVudE5hbWUsXG4gICAgICB0aGlzLmxpc3RlbmVyIGFzIEdlbmVyaWNGdW5jdGlvbixcbiAgICApO1xuICAgIHRoaXMuaXNDYWxsZWQgPSB0cnVlO1xuICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmFwcGx5KHRoaXMuY29udGV4dCwgYXJncyk7XG4gIH07XG4gIGNvbnN0IHdyYXBwZXJDb250ZXh0ID0ge1xuICAgIGV2ZW50TmFtZTogZXZlbnROYW1lLFxuICAgIGxpc3RlbmVyOiBsaXN0ZW5lcixcbiAgICByYXdMaXN0ZW5lcjogKHdyYXBwZXIgYXMgdW5rbm93bikgYXMgV3JhcHBlZEZ1bmN0aW9uLFxuICAgIGNvbnRleHQ6IHRhcmdldCxcbiAgfTtcbiAgY29uc3Qgd3JhcHBlZCA9ICh3cmFwcGVyLmJpbmQoXG4gICAgd3JhcHBlckNvbnRleHQsXG4gICkgYXMgdW5rbm93bikgYXMgV3JhcHBlZEZ1bmN0aW9uO1xuICB3cmFwcGVyQ29udGV4dC5yYXdMaXN0ZW5lciA9IHdyYXBwZWQ7XG4gIHdyYXBwZWQubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgcmV0dXJuIHdyYXBwZWQgYXMgV3JhcHBlZEZ1bmN0aW9uO1xufVxuXG4vLyBFdmVudEVtaXR0ZXIjb24gc2hvdWxkIHBvaW50IHRvIHRoZSBzYW1lIGZ1bmN0aW9uIGFzIEV2ZW50RW1pdHRlciNhZGRMaXN0ZW5lci5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuLy8gRXZlbnRFbWl0dGVyI29mZiBzaG91bGQgcG9pbnQgdG8gdGhlIHNhbWUgZnVuY3Rpb24gYXMgRXZlbnRFbWl0dGVyI3JlbW92ZUxpc3RlbmVyLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuXG5jbGFzcyBNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmcgZXh0ZW5kcyBFcnJvciB7XG4gIHJlYWRvbmx5IGNvdW50OiBudW1iZXI7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHJlYWRvbmx5IGVtaXR0ZXI6IEV2ZW50RW1pdHRlcixcbiAgICByZWFkb25seSB0eXBlOiBzdHJpbmcgfCBzeW1ib2wsXG4gICkge1xuICAgIGNvbnN0IGxpc3RlbmVyQ291bnQgPSBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSk7XG4gICAgY29uc3QgbWVzc2FnZSA9IFwiUG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSBsZWFrIGRldGVjdGVkLiBcIiArXG4gICAgICBgJHtsaXN0ZW5lckNvdW50fSAke1xuICAgICAgICB0eXBlID09IG51bGwgPyBcIm51bGxcIiA6IHR5cGUudG9TdHJpbmcoKVxuICAgICAgfSBsaXN0ZW5lcnMgYWRkZWQgdG8gWyR7ZW1pdHRlci5jb25zdHJ1Y3Rvci5uYW1lfV0uIGAgK1xuICAgICAgXCIgVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXRcIjtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLmNvdW50ID0gbGlzdGVuZXJDb3VudDtcbiAgICB0aGlzLm5hbWUgPSBcIk1heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZ1wiO1xuICB9XG59XG5cbm1ha2VNZXRob2RzRW51bWVyYWJsZShFdmVudEVtaXR0ZXIpO1xuXG5leHBvcnQgZGVmYXVsdCBPYmplY3QuYXNzaWduKEV2ZW50RW1pdHRlciwgeyBFdmVudEVtaXR0ZXIsIHNldE1heExpc3RlbmVycyB9KTtcblxuZXhwb3J0IGNvbnN0IGNhcHR1cmVSZWplY3Rpb25TeW1ib2wgPSBFdmVudEVtaXR0ZXIuY2FwdHVyZVJlamVjdGlvblN5bWJvbDtcbmV4cG9ydCBjb25zdCBlcnJvck1vbml0b3IgPSBFdmVudEVtaXR0ZXIuZXJyb3JNb25pdG9yO1xuZXhwb3J0IGNvbnN0IGxpc3RlbmVyQ291bnQgPSBFdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudDtcbmV4cG9ydCBjb25zdCBvbiA9IEV2ZW50RW1pdHRlci5vbjtcbmV4cG9ydCBjb25zdCBvbmNlID0gRXZlbnRFbWl0dGVyLm9uY2U7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLHlFQUF5RTtBQUN6RSxzREFBc0Q7QUFDdEQsRUFBRTtBQUNGLDBFQUEwRTtBQUMxRSxnRUFBZ0U7QUFDaEUsc0VBQXNFO0FBQ3RFLHNFQUFzRTtBQUN0RSw0RUFBNEU7QUFDNUUscUVBQXFFO0FBQ3JFLHdC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