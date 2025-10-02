/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiPageTemplate, EuiText } from '@elastic/eui';
import React from 'react';
import { useParams } from 'react-router-dom';

export function DashboardPage() {
  // eslint-disable-next-line no-console
  console.log('DashboardPage()');

  const { dashboardId } = useParams<{ dashboardId: string }>();

  // eslint-disable-next-line no-console
  console.log('DashboardPage() ->', { dashboardId });

  return (
    <EuiPageTemplate.Section>
      <EuiText>
        <h2>{dashboardId}</h2>
        <div
          style={{
            height: '300px',
            width: '100%',
            border: '1px solid #ccc',
            // eslint-disable-next-line @elastic/eui/no-css-color
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <EuiLoadingSpinner size="xxl" />
        </div>
      </EuiText>
    </EuiPageTemplate.Section>
  );
}

// eslint-disable-next-line import/no-default-export
export default DashboardPage;
