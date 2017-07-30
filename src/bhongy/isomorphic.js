/**
 * rewires/reconstruct React Fiber source code for my own learning
 * put everything in one file to see how they all fit together
 *
 * note: doing a lot of inline requires of third-party libraries
 *   which I don't do in actual projects
 *   because this style helps visualize where things are
 *   and how they are wired together
 *
 * @flow
 */

'use strict';

function TEMPORARY_TO_IMPLEMENT() {}

var ReactElement = (function ReactElementClosure() {
  // basic Symbol support: Safari (& mobile) 9+ and IE12(edge)+
  var REACT_ELEMENT_TYPE =
    (typeof Symbol === 'function' &&
      Symbol.for &&
      Symbol.for('react.element')) ||
    0xeac7;

  function isValidElement(elementType, input) {
    return (
      typeof input === 'object' &&
      input !== null &&
      input.$$typeof === elementType
    );
  }

  return {
    cloneElement: TEMPORARY_TO_IMPLEMENT,
    createElement: TEMPORARY_TO_IMPLEMENT,
    createFactory: TEMPORARY_TO_IMPLEMENT,
    // can't help it - just want to add a little functional flair :P
    isValidElement: isValidElement.bind(REACT_ELEMENT_TYPE),
  };
})();

var ReactChildren = (function ReactChildrenClosure() {
  return {
    map: TEMPORARY_TO_IMPLEMENT,
    forEach: TEMPORARY_TO_IMPLEMENT,
    count: TEMPORARY_TO_IMPLEMENT,
    toArray: TEMPORARY_TO_IMPLEMENT,
  };
})();

function ReactChildrenOnlyChild<T>(children: T): T {
  require('fbjs/lib/invariant')(
    ReactElement.isValidElement(children),
    'React.Children.only expected to receive a single React element child.',
  );
  return children;
}

var ReactBaseClasses = (function ReactBaseClassesClosure() {
  var emptyObject = require('fbjs/lib/emptyObject');

  // TODO: review if this is typed correctly
  type UpdaterCallback<State, Props, Context> = (
    nextState: State,
    props: Props,
    context: Context,
  ) => void;
  // should export this as an interface for renderers to implement
  type ReactUpdater<State> = {
    isMounted: (publicInstance: ReactClass<*>) => boolean,
    enqueueForceUpdate: (
      publicInstance: ReactClass<*>,
      callback?: UpdaterCallback<*>,
      callerName?: string,
    ) => void,
    enqueueReplaceState: (
      publicInstance: ReactClass<*>,
      completeState: State,
      callback?: UpdaterCallback<*>,
      callerName?: string,
    ) => void,
    enqueueSetState: (
      publicInstance: ReactClass<*>,
      completeState: State,
      callback?: UpdaterCallback<*>,
      callerName?: string,
    ) => void,
  };

  // default updater (noop) - the actual updater is injected
  // for different renderers - smart design!
  // this is the only place that uses this module
  var ReactNoopUpdateQueue = (function ReactNoopUpdateQueueClosure() {
    if (__DEV__) {
      var warning = require('fbjs/lib/warning');
    }

    function warnNoop(publicInstance, callerName) {
      if (__DEV__) {
        var constructor = publicInstance.constructor;
        var constructorName: string = constructor
          ? constructor.displayName || constructor.name
          : 'ReactClass';

        warning(
          false,
          '%s(...): Can only update a mounted or mounting component. ' +
            'This usually means you called %s() on an unmounted component. ' +
            'This is a no-op.\n\nPlease check the code for the %s component.',
          callerName,
          callerName,
          constructorName,
        );
      }
    }

    var ReactNoopUpdateQueueExport: ReactUpdater<*> = {
      isMounted: function isMounted(publicInstance) {
        // ? how does this change to return true when mounted ?
        return false;
      },

      // below are just mapping arguments
      // and delegate to `warnNoop` (the actual implementation)

      enqueueForceUpdate: function enqueueForceUpdate(
        publicInstance,
        callback,
        callerName,
      ) {
        warnNoop(publicInstance, 'forceUpdate');
      },

      enqueueReplaceState: function enqueueReplaceState(
        publicInstance,
        completeState,
        callback,
        callerName,
      ) {
        warnNoop(publicInstance, 'replaceState');
      },

      enqueueSetState: function enqueueSetState(
        publicInstance,
        completeState,
        callback,
        callerName,
      ) {
        warnNoop(publicInstance, 'setState');
      },
    };

    return ReactNoopUpdateQueueExport;
  })();

  // constructor
  // $FlowFixMe
  function ReactComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    // ? why needing `emptyObject` ?
    this.refs = emptyObject;
    // ? what is the updater in Fiber ?
    this.updater = updater || ReactNoopUpdateQueue;
  }

  // use in renderers as a flag (checking truthy)
  // might as well assigning `true` to it?
  ReactComponent.prototype.isReactComponent = {};
  ReactComponent.prototype.setState = function(
    partialState,
    callback: UpdaterCallback<*>,
  ) {
    var isValidPartialState =
      typeof partialState === 'object' ||
      typeof partialState === 'function' ||
      // `==` is true for `null` and `undefined`
      partialState == null;

    var message =
      'setState(...): takes an object of state variables to update or a ' +
      'function which returns an object of state variables.';

    require('fbjs/lib/invariant')(isValidPartialState, message);
    this.updater.enqueueSetState(this, partialState, callback, 'setState');
  };

  ReactComponent.prototype.forceUpdate = function(callback) {
    // opportunity to type interface for users (renderers)
    // even "requires" that the third argument has to be
    // the exact string literal 'forceUpdate'
    this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
  };

  // deprecated react component APIs

  if (__DEV__) {
    var deprecatedAPIs = {
      isMounted: [
        // info[0]
        'isMounted',
        // info[1]
        'Instead, make sure to clean up subscriptions and pending requests in ' +
          'componentWillUnmount to prevent memory leaks.',
      ],
      replaceState: [
        'replaceState',
        'Refactor your code to use setState instead (see ' +
          'https://github.com/facebook/react/issues/3236).',
      ],
    };

    // set getters for component prototype of all `deprecatedAPIs`
    // so if any component uses it, the warning will log
    var defineDeprecationWarning = function(methodName, info) {
      Object.defineProperty(ReactComponent.prototype, methodName, {
        get: function() {
          require('lowPriorityWarning')(
            false,
            '%s(...) is deprecated in plain JavaScript React classes. %s',
            info[0],
            info[1],
          );

          return undefined;
        },
      });
    };

    // Changed to a declarative loop for fun. :)
    // Although it won't work below IE9.
    Object.keys(deprecatedAPIs).forEach(fnName => {
      defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
    });
  }

  // boy, do I miss `class`, `extends`
  function inheritClass(ChildClass, ParentClass) {
    ChildClass.prototype = Object.create(ParentClass.prototype);
    ChildClass.prototype.constructor = ChildClass;
    // performance optimization, significant?
    // avoid enumerate through prototype chain e.g. __proto__
    Object.assign(ChildClass.prototype, ParentClass.prototype);
  }

  // $FlowFixMe
  function ReactPureComponent(props, context, updater) {
    // call super
    ReactComponent.call(this, props, context, updater);
  }

  inheritClass(ReactPureComponent, ReactComponent);
  Object.assign(ReactPureComponent.prototype, {
    isPureReactComponent: true,
  });

  // $FlowFixMe
  function ReactAsyncComponent(props, context, updater) {
    ReactComponent.call(this, props, context, updater);
  }

  inheritClass(ReactAsyncComponent, ReactComponent);
  Object.assign(ReactAsyncComponent.prototype, {
    unstable_isAsyncReactComponent: true,
    render: function() {
      return this.props.children;
    },
  });

  return {
    Component: ReactComponent,
    PureComponent: ReactPureComponent,
    AsyncComponent: ReactAsyncComponent,
  };
})();

var cloneElement = ReactElement.cloneElement;
var createElement = ReactElement.createElement;
var createFactory = ReactElement.createFactory;

if (__DEV__) {
  var ReactElementValidator = (function ReactElementValidatorClosure() {
    return {
      cloneElement: TEMPORARY_TO_IMPLEMENT,
      createElement: TEMPORARY_TO_IMPLEMENT,
      createFactory: TEMPORARY_TO_IMPLEMENT,
    };
  })();

  cloneElement = ReactElementValidator.cloneElement;
  createElement = ReactElementValidator.createElement;
  createFactory = ReactElementValidator.createFactory;
}

var ReactVersion = '16.0.0-beta.2';
var ReactInternals = (function ReactInternalsClosure(params) {
  const ReactInternalsExport = {
    ReactCurrentOwner: TEMPORARY_TO_IMPLEMENT,
  };

  if (__DEV__) {
    /*
      $FlowFixMe: using Object.assign as a terse way
      to mutate the original object causes flow errors
    */
    Object.assign(ReactInternalsExport, {
      ReactComponentTreeHook: TEMPORARY_TO_IMPLEMENT,
      ReactDebugCurrentFrame: TEMPORARY_TO_IMPLEMENT,
    });
  }

  return ReactInternalsExport;
})();

// * React interface *
// when consumers do `import React from 'react'`
// love how small the API surface is
var React = {
  Children: {
    map: ReactChildren.map,
    forEach: ReactChildren.forEach,
    count: ReactChildren.count,
    toArray: ReactChildren.toArray,
    // the only location in the codebase that uses "onlyChild"
    only: ReactChildrenOnlyChild,
  },

  Component: ReactBaseClasses.Component,
  PureComponent: ReactBaseClasses.PureComponent,
  unstable_AsyncComponent: ReactBaseClasses.AsyncComponent,

  cloneElement: cloneElement,
  createElement: createElement,
  createFactory: createFactory,
  isValidElement: ReactElement.isValidElement,

  version: ReactVersion,
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: ReactInternals,
};

module.exports = React;
