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
  var ReactCurrentOwner = require('ReactCurrentOwner');
  var hasOwnProperty = function(obj: mixed, propName: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, propName);
  };

  // basic Symbol support: Safari (& mobile) 9+ and IE12(edge)+
  var REACT_ELEMENT_TYPE =
    (typeof Symbol === 'function' &&
      Symbol.for &&
      Symbol.for('react.element')) ||
    0xeac7;

  // use to "filter" `props` from `config` object
  // when `createElement` or `cloneElement`
  // ---
  // convert to ['key', 'ref', '__self', '__source']
  // and do `RESERVED_PROPS.indexOf(propName)` might be more concise
  var RESERVED_PROPS = {
    key: true,
    ref: true,
    __self: true,
    __source: true,
  };

  type SourceInfo = { fileName: string, lineNumber: number };
  type RESERVED_PROPS_SHAPE = {
    key?: string,
    ref?: any,
    __self?: any,
    __source?: SourceInfo,
  };

  type SpecialPropName = 'key' | 'ref';

  function hasValidConfigProp(propName: SpecialPropName, config) {
    if (__DEV__) {
      // essentially, check "if config[propName]'s getter has isReactWarning -> true"
      // the conditions are to verify that we can safely ask that question
      // "getter.isReactWarning" is set in "defineKeyPropWarningGetter"
      if (hasOwnProperty(config, propName)) {
        var getter = Object.getOwnPropertyDescriptor(propName);
        if (getter && getter.isReactWarning) {
          return false;
        }
      }
    }
    return config[propName] !== undefined;
  }

  var hasValidRef = hasValidConfigProp.bind(null, 'ref');
  var hasValidKey = hasValidConfigProp.bind(null, 'key');

  // ? internal most flexible create element ?
  // ---
  // TODO: define types for these values for documentation
  function ReactElementExport<Config>(
    type,
    key,
    ref,
    self,
    source,
    owner,
    props,
  ) {
    var element: {
      props: $PropsOf<Config>,
      // TODO: annotate this properly
      // dev only
      _store?: ?Object,
      _self?: any,
      _source?: ?SourceInfo,
    } = {
      $$typeof: REACT_ELEMENT_TYPE,
      type: type,
      key: key,
      ref: ref,
      props: props,
      _owner: owner,
    };

    if (__DEV__) {
      element._store = {};

      // ? where/how do React change "_store.validated" ?
      Object.defineProperty(element._store, 'validated', {
        configurable: false,
        enumerable: false,
        writable: true,
        value: false,
      });

      // `element._self` and `element._source` are frozen
      // cannot be changed, redefined, or deleted

      Object.defineProperty(element, '_self', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: self,
      });

      Object.defineProperty(element, '_source', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: source,
      });

      // freeze prevent properties addition, removals, reassign,
      // redefined, and prevent changing prototype
      if (Object.freeze) {
        Object.freeze(element.props);
        Object.freeze(element);
      }
    }

    return element;
  }

  // mechanism to warn about accessing key, ref
  // only use in `createElement`
  var specialPropWarningShown: { [SpecialPropName]: boolean } = {
    key: false,
    ref: false,
  };

  // factory pattern instead of binding first argument
  function defineConfigPropWarningGetterFor(propName: SpecialPropName) {
    return function(props, displayName) {
      var warnAboutAccessingProp = function() {
        // only show once
        if (!specialPropWarningShown[propName]) {
          specialPropWarningShown[propName] = true;

          require('fbjs/lib/warning')(
            false,
            '%s: `' +
              propName +
              '` is not a prop. Trying to access it will result ' +
              'in `undefined` being returned. If you need to access the same ' +
              'value within the child component, you should pass it as a different ' +
              'prop. (https://fb.me/react-special-props)',
            displayName,
          );
        }
      };

      warnAboutAccessingProp.isReactWarning = true;
      Object.defineProperty(props, propName, {
        get: warnAboutAccessingProp,
        configurable: true,
      });
    };
  }

  var defineKeyPropWarningGetter = defineConfigPropWarningGetterFor('key');
  var defineRefPropWarningGetter = defineConfigPropWarningGetterFor('ref');

  ReactElementExport.createElement = function createElement<Config>(
    type: ReactClass<Config>,
    config: Config & RESERVED_PROPS_SHAPE,
    children: React$Node<Config>,
  ) {
    var props = {};
    var ref = null;
    var key: ?string = null;
    var self = null;
    var source = null;

    // process `config` to `props`, `ref`, `key`, etc.
    if (config != null) {
      if (hasValidKey(config)) {
        // make sure key is a string
        // $FlowFixMe: `hasValidKey` should already ensure it
        key = '' + config.key;
      }

      if (hasValidRef(config)) {
        ref = config.ref;
      }

      self = config.__self === undefined ? null : config.__self;
      source = config.__source === undefined ? null : config.__source;

      // copy all non-reserved props from `config` to `props`
      // we know `Object.keys` on config won't thow from
      // previous `config != null` check
      // though it might give weird behavior if
      // config is a number, string, for example
      Object.keys(config).forEach(propName => {
        if (!RESERVED_PROPS.hasOwnProperty(propName)) {
          props[propName] = config[propName];
        }
      });
    }

    // process `createElement` arguments to `props.children`
    // arguments[0] -> type
    // arguments[1] -> config
    var childStartingIndex = 2;
    var childrenLength = arguments.lenght - childStartingIndex;
    if (childrenLength === 1) {
      props.children = children;
    } else if (childrenLength === 1) {
      var childArray = [];
      for (var i = 0; i < childrenLength; i++) {
        childArray[i] = arguments[i + childStartingIndex];
      }
      if (__DEV__) {
        // make it immutable (cannot change, add, or remove members)
        if (Object.freeze) {
          Object.freeze(childArray);
        }
      }
      props.children = childArray;
    }

    // resolve default props
    if (type && type.defaultProps) {
      // use defaultProps if either
      //   1) `props` does not have the key for `propName`
      //   2) has value at `props[propName]` but it's undefined
      // do not use defaultProps if `null` was assigned
      var defaultProps = type.defaultProps;

      // don't need to check for hasOwnProperty
      // because we check againsts `props[propName]`
      // to be undefined - props from prototype will "not" be undefined
      for (let propName in defaultProps) {
        if (props[propName] === undefined) {
          props[propName] = defaultProps[propName];
        }
      }
    }

    if (__DEV__) {
      if (key || ref) {
        // ? quite confused here ?
        if (
          // ? check for when first created - time dependent ?
          typeof props.$$typeof === 'undefined' ||
          // ? check for when invalid elements ?
          props.$$typeof !== REACT_ELEMENT_TYPE
        ) {
          var displayName = typeof type === 'function'
            ? type.displayName || type.name || 'Unknown'
            : type; // primitive type - e.g. 'div'
          if (key) {
            defineKeyPropWarningGetter(props, displayName);
          }
          if (key) {
            defineRefPropWarningGetter(props, displayName);
          }
        }
      }
    }

    return ReactElement(
      type,
      key,
      ref,
      self,
      source,
      // ? don't get how the owner mechanism work ?
      ReactCurrentOwner.current,
      props,
    );
  };

  ReactElementExport.createFactory = function createFactory<Config>(
    type: ReactClass<Config>,
  ) {
    var factory = ReactElementExport.createElement.bind(null, type);

    // $FlowFixMe: `type` is not in `factory`
    Object.defineProperty(factory, 'type', {
      get: function() {
        require('lowPriorityWarning')(
          false,
          'Warning: do not rely on `factory.type`.',
        );

        return type;
      },
    });

    return factory;
  };

  // create a new element with the new key and clone the rest
  ReactElementExport.cloneAndReplaceKey = function cloneAndReplaceKey(
    oldElement,
    newKey,
  ) {
    return ReactElementExport(
      oldElement.type,
      newKey,
      oldElement.ref,
      // interesting, `_self` and `_source` points back
      // to the old reference ... oh, see `cloneElement`
      oldElement._self,
      oldElement._source,
      oldElement._owner,
      oldElement.props,
      // ? get new `_store` ?
    );
  };

  // interface and behavior is similar to
  // `createElement(type, config, children)`
  ReactElementExport.cloneElement = function cloneElement<Config>(
    element: React$Element<Config> & {
      _owner: any,
      _self: React$Element<*>, // might use different Config?
      _source: SourceInfo, // source shape
    },
    config: Config & RESERVED_PROPS_SHAPE,
    children: React$Node<Config>,
  ) {
    // copy original props
    var props = Object.assign({}, element.props);
    var key = element.key;
    var ref = element.ref;

    // `self` and `source` will not be changed in this function
    // `self` will point to the original
    // `source` is reserved using the original source
    //   "unlikely to be targeted by a transpiler,
    //    and the original source is probably a better indicator
    //    of the true owner"
    var self = element._self;
    var source = element._source;

    // owner might change if `config.ref` is provided
    var owner = element._owner;

    // process `config` against original element
    if (config != null) {
      // use the clone's config.key instead of original's if provided
      if (hasValidKey(config)) {
        // $FlowFixMe: hasValidKey should already verify it
        key = '' + config.key;
      }

      // use the clone's config.ref instead of original's if provided
      if (hasValidRef(config)) {
        ref = config.ref;
        owner = ReactCurrentOwner.current;
      }

      /* same implementation as the one in `createElement` */
      // copy all non-reserved props from `config` to `props`
      Object.keys(config).forEach(propName => {
        if (!RESERVED_PROPS.hasOwnProperty(propName)) {
          props[propName] = config[propName];
        }
      });

      // use defaultProps from the original component (type)
      var defaultProps;
      if (element.type && element.type.defaultProps) {
        defaultProps = element.type.defaultProps;
      }

      /* same implementation as the one in `createElement` */
      // fill in any props that are still `undefined`
      // using `defaultProps` - after clone original
      // and adding ones from clone's `config`
      for (let propName in defaultProps) {
        if (props[propName] === undefined) {
          props[propName] = defaultProps[propName];
        }
      }
    }

    /* same implementation as the one in `createElement` */
    // process `cloneElement` arguments to `props.children`
    // arguments[0] -> type
    // arguments[1] -> config
    // ---
    // this replaces the original element.props.children
    var childStartingIndex = 2;
    var childrenLength = arguments.lenght - childStartingIndex;
    if (childrenLength === 1) {
      props.children = children;
    } else if (childrenLength === 1) {
      var childArray = [];
      for (var i = 0; i < childrenLength; i++) {
        childArray[i] = arguments[i + childStartingIndex];
      }
      if (__DEV__) {
        // make it immutable (cannot change, add, or remove members)
        if (Object.freeze) {
          Object.freeze(childArray);
        }
      }
      props.children = childArray;
    }

    // return new element
    return ReactElement(
      element.type,
      key,
      ref,
      self,
      source,
      owner,
      props,
    );
  };

  function isValidElement(elementType, input) {
    return (
      typeof input === 'object' &&
      input !== null &&
      input.$$typeof === elementType
    );
  }

  // can't help it - just want to add a little functional flair :P
  // ReactElementExport.isValidElement = isValidElement.bind(REACT_ELEMENT_TYPE);
  ReactElementExport.isValidElement = isValidElement.bind(REACT_ELEMENT_TYPE);

  return ReactElementExport;
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
