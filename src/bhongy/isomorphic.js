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

function ReactChildrenOnlyChild(children) {
  require('fbjs/lib/invariant')(
    ReactElement.isValidElement(children),
    'React.Children.only expected to receive a single React element child.',
  );
  return children;
}

var ReactBaseClasses = (function ReactBaseClassesClosure() {
  return {
    Component: TEMPORARY_TO_IMPLEMENT,
    PureComponent: TEMPORARY_TO_IMPLEMENT,
    AsyncComponent: TEMPORARY_TO_IMPLEMENT,
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
  createFactory = ReactElementValidator.createFactoryt;
}

var ReactVersion = '16.0.0-beta.2';
var ReactInternals = (function ReactInternalsClosure(params) {
  const ReactInternalsExport = {
    ReactCurrentOwner: TEMPORARY_TO_IMPLEMENT,
  };

  if (__DEV__) {
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
