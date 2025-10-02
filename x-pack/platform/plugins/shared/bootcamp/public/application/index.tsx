/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router } from '@kbn/shared-ux-router';
import { BootcampApp } from './bootcamp_app';
import type { BootcampPublicPluginStartDeps, BootcampPublicStart } from '../types';
import { BootcampAppContextProvider } from '../hooks/use_kibana';

export function renderApp(
  coreStart: CoreStart,
  pluginsStart: BootcampPublicPluginStartDeps,
  myServices: BootcampPublicStart,
  params: AppMountParameters
) {
  const { element, history } = params;

  ReactDOM.render(
    // <KibanaContextProvider services={{ ...coreStart, ...pluginsStart, ...params }}>
    <BootcampAppContextProvider
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      params={params}
      myServices={myServices}
    >
      <Router history={history}>
        <BootcampApp />
      </Router>
    </BootcampAppContextProvider>,
    // </KibanaContextProvider>,
    element
  );

  // Return cleanup function (what happens when the app is unmounted)
  return () => ReactDOM.unmountComponentAtNode(element);
}
