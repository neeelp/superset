/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { CHART_TYPE } from 'src/dashboard/util/componentTypes';
import { NativeFilterType } from '@superset-ui/core';
import {
  clearIndicatorsCache,
  extractLabel,
  getAppliedColumnsWithFallback,
  getCrossFilterIndicator,
  selectIndicatorsForChart,
  selectNativeIndicatorsForChart,
} from './selectors';

// eslint-disable-next-line no-restricted-globals -- TODO: Migrate from describe blocks
describe('getCrossFilterIndicator', () => {
  const chartId = 123;
  const chartLayoutItems = [
    {
      id: 'chart-123',
      type: CHART_TYPE,
      children: [],
      parents: ['ROOT_ID'],
      meta: {
        chartId,
        sliceName: 'Test Chart',
        uuid: 'uuid-123',
        height: 10,
        width: 10,
      },
    },
  ];

  test('returns correct indicator with label from filterState.label', () => {
    const dataMask = {
      filterState: { label: 'foo', value: 'bar' },
      extraFormData: {},
    };
    const result = getCrossFilterIndicator(chartId, dataMask, chartLayoutItems);
    expect(result).toEqual({
      column: undefined,
      name: 'Test Chart',
      path: ['ROOT_ID', 'chart-123'],
      value: 'foo',
    });
  });

  test('returns correct indicator with label from filterState.value', () => {
    const dataMask = {
      filterState: { value: ['bar', 'baz'] },
      extraFormData: {},
    };
    const result = getCrossFilterIndicator(chartId, dataMask, chartLayoutItems);
    expect(result).toEqual({
      column: undefined,
      name: 'Test Chart',
      path: ['ROOT_ID', 'chart-123'],
      value: 'bar, baz',
    });
  });

  test('returns correct indicator with column and customColumnLabel', () => {
    const dataMask = {
      filterState: {
        value: 'valA',
        filters: { col: 'col' },
        customColumnLabel: 'label',
      },
      extraFormData: {},
    };
    const result = getCrossFilterIndicator(chartId, dataMask, chartLayoutItems);
    expect(result).toEqual({
      column: 'col',
      name: 'Test Chart',
      path: ['ROOT_ID', 'chart-123'],
      value: 'valA',
      customColumnLabel: 'label',
    });
  });

  test('returns correct indicator with column from extraFormData.filters', () => {
    const filterClause = { col: 'colB', op: 'IS NOT NULL' as const };
    const dataMask = {
      filterState: { value: 'valB' },
      extraFormData: { filters: [filterClause] },
    };
    const result = getCrossFilterIndicator(chartId, dataMask, chartLayoutItems);
    expect(result).toEqual({
      column: 'colB',
      name: 'Test Chart',
      path: ['ROOT_ID', 'chart-123'],
      value: 'valB',
    });
  });

  test('returns correct indicator with column from filterState.filters', () => {
    const dataMask = {
      filterState: { value: 'valC', filters: { colC: 'something' } },
      extraFormData: {},
    };
    const result = getCrossFilterIndicator(chartId, dataMask, chartLayoutItems);
    expect(result).toEqual({
      column: 'colC',
      name: 'Test Chart',
      path: ['ROOT_ID', 'chart-123'],
      value: 'valC',
    });
  });

  test('returns empty name and path if chartLayoutItem is not found', () => {
    const dataMask = {
      filterState: { value: 'valD' },
      extraFormData: {},
    };
    const result = getCrossFilterIndicator(999, dataMask, chartLayoutItems);
    expect(result).toEqual({
      column: undefined,
      name: '',
      path: [''],
      value: 'valD',
    });
  });

  test('returns null value if no label or value in filterState', () => {
    const dataMask = {
      filterState: {},
      extraFormData: {},
    };
    const result = getCrossFilterIndicator(chartId, dataMask, chartLayoutItems);
    expect(result).toEqual({
      column: undefined,
      name: 'Test Chart',
      path: ['ROOT_ID', 'chart-123'],
      value: null,
    });
  });
});

test('extractLabel returns label when filter has label and it does not include undefined', () => {
  expect(extractLabel({ label: 'My Label', value: 'x' })).toBe('My Label');
  expect(extractLabel({ label: 'Only label' })).toBe('Only label');
});

test('extractLabel returns value joined by ", " when filter has non-empty array value and no label', () => {
  expect(extractLabel({ value: ['a', 'b'] })).toBe('a, b');
  expect(extractLabel({ value: ['single'] })).toBe('single');
});

test('extractLabel returns value when filter has non-array value (ensureIsArray wraps it)', () => {
  expect(extractLabel({ value: 'scalar' })).toBe('scalar');
  expect(extractLabel({ value: 42 })).toBe('42');
});

test('extractLabel returns null when filter is undefined or has no label and no value', () => {
  expect(extractLabel(undefined)).toBe(null);
  expect(extractLabel({})).toBe(null);
  expect(extractLabel({ label: '' })).toBe(null);
});

test('extractLabel returns null when filter.value is null or undefined', () => {
  expect(extractLabel({ value: null })).toBe(null);
  expect(extractLabel({ value: undefined })).toBe(null);
});

test('extractLabel does not return ", " or "null, null" for arrays of only null, undefined, or empty string', () => {
  expect(extractLabel({ value: [null, null] })).toBe(null);
  expect(extractLabel({ value: [null] })).toBe(null);
  expect(extractLabel({ value: [''] })).toBe(null);
  expect(extractLabel({ value: ['', ''] })).toBe(null);
  expect(extractLabel({ value: [null, ''] })).toBe(null);
  expect(extractLabel({ value: [undefined, undefined] })).toBe(null);
  expect(extractLabel({ value: [null, undefined, ''] })).toBe(null);
  expect(extractLabel({ value: [null, null] })).not.toBe(', ');
  expect(extractLabel({ value: [null, ''] })).not.toBe(', ');
});

test('extractLabel returns only non-empty items when array has mix of empty and non-empty', () => {
  expect(extractLabel({ value: [null, 'a', '', 'b', undefined] })).toBe('a, b');
  expect(extractLabel({ value: ['', 'x', ''] })).toBe('x');
});

test('extractLabel uses value when label is undefined', () => {
  expect(extractLabel({ label: undefined, value: ['a'] })).toBe('a');
});

test('getAppliedColumnsWithFallback returns columns from query response when available', () => {
  const chart = {
    queriesResponse: [
      {
        applied_filters: [{ column: 'age' }, { column: 'name' }],
      },
    ],
  };
  const result = getAppliedColumnsWithFallback(chart);
  expect(result).toEqual(new Set(['age', 'name']));
});

test('getAppliedColumnsWithFallback returns empty set when query response has no applied_filters and no fallback params', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const result = getAppliedColumnsWithFallback(chart);
  expect(result).toEqual(new Set());
});

test('getAppliedColumnsWithFallback derives columns from native filters when query response is empty', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
    filter2: {
      id: 'filter2',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'name' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: '25' },
      extraFormData: {},
    },
    filter2: {
      id: 'filter2',
      filterState: { value: 'John' },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set(['age', 'name']));
});

test('getAppliedColumnsWithFallback excludes filters not in chart scope', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
    filter2: {
      id: 'filter2',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [456], // Different chart
      targets: [{ column: { name: 'name' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: '25' },
      extraFormData: {},
    },
    filter2: {
      id: 'filter2',
      filterState: { value: 'John' },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set(['age']));
});

test('getAppliedColumnsWithFallback excludes filters without values', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
    filter2: {
      id: 'filter2',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'name' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: '25' },
      extraFormData: {},
    },
    filter2: {
      id: 'filter2',
      filterState: { value: null },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set(['age']));
});

test('getAppliedColumnsWithFallback excludes filters without targets', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
    filter2: {
      id: 'filter2',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: '25' },
      extraFormData: {},
    },
    filter2: {
      id: 'filter2',
      filterState: { value: 'John' },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set(['age']));
});

test('getAppliedColumnsWithFallback excludes non-native filter types', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
    filter2: {
      id: 'filter2',
      type: 'other_type' as any,
      chartsInScope: [123],
      targets: [{ column: { name: 'name' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: '25' },
      extraFormData: {},
    },
    filter2: {
      id: 'filter2',
      filterState: { value: 'John' },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set(['age']));
});

test('getAppliedColumnsWithFallback handles missing dataMask entry for filter', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
  } as any;
  const dataMask = {
    // filter1 is missing
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set());
});

test('getAppliedColumnsWithFallback handles empty array values in filterState', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: [] },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set());
});

test('getAppliedColumnsWithFallback handles null values in filterState', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: [null, null] },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set());
});

test('getAppliedColumnsWithFallback returns empty set when chart is undefined', () => {
  const result = getAppliedColumnsWithFallback(undefined);
  expect(result).toEqual(new Set());
});

test('getAppliedColumnsWithFallback returns empty set when chart has no queriesResponse', () => {
  const chart = {};
  const result = getAppliedColumnsWithFallback(chart);
  expect(result).toEqual(new Set());
});

test('getAppliedColumnsWithFallback returns empty set when fallback params are incomplete', () => {
  const chart = {
    queriesResponse: [{ applied_filters: [] }],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'age' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: '25' },
      extraFormData: {},
    },
  } as any;
  // Missing chartId
  expect(getAppliedColumnsWithFallback(chart, nativeFilters, dataMask)).toEqual(
    new Set(),
  );
  // Missing dataMask
  expect(
    getAppliedColumnsWithFallback(chart, nativeFilters, undefined, 123),
  ).toEqual(new Set());
  // Missing nativeFilters
  expect(
    getAppliedColumnsWithFallback(chart, undefined, dataMask, 123),
  ).toEqual(new Set());
});

test('getAppliedColumnsWithFallback prioritizes query response over fallback', () => {
  const chart = {
    queriesResponse: [
      {
        applied_filters: [{ column: 'query_column' }],
      },
    ],
  };
  const nativeFilters = {
    filter1: {
      id: 'filter1',
      type: NativeFilterType.NativeFilter,
      chartsInScope: [123],
      targets: [{ column: { name: 'fallback_column' } }],
    },
  } as any;
  const dataMask = {
    filter1: {
      id: 'filter1',
      filterState: { value: '25' },
      extraFormData: {},
    },
  } as any;
  const result = getAppliedColumnsWithFallback(
    chart,
    nativeFilters,
    dataMask,
    123,
  );
  expect(result).toEqual(new Set(['query_column']));
});

test('clearIndicatorsCache empties memoized indicator results', () => {
  const filters = {
    1: {
      chartId: 1,
      columns: { country: 'US' },
      scopes: { country: { scope: ['ROOT_ID'], immune: [] } },
      labels: { country: 'Country' },
      isDateFilter: false,
      directPathToFilter: ['ROOT_ID'],
      datasourceId: 'ds-1',
    },
  } as any;
  const datasources = { 'ds-1': {} } as any;
  const chart = {
    queriesResponse: [{ applied_filters: [{ column: 'country' }] }],
  };

  const first = selectIndicatorsForChart(2, filters, datasources, chart);
  // Same inputs hit the cache and return the same array reference.
  const second = selectIndicatorsForChart(2, filters, datasources, chart);
  expect(second).toBe(first);

  clearIndicatorsCache();

  const third = selectIndicatorsForChart(2, filters, datasources, chart);
  expect(third).not.toBe(first);
  expect(third).toEqual(first);
});

test('selectNativeIndicatorsForChart cache survives until cleared', () => {
  const nativeFilters = {
    f1: {
      id: 'f1',
      type: NativeFilterType.NativeFilter,
      name: 'Country',
      chartsInScope: [10],
      targets: [{ column: { name: 'country' } }],
    },
  } as any;
  const dataMask = {
    f1: { id: 'f1', filterState: { value: 'US' }, extraFormData: {} },
  } as any;
  const chart = {
    queriesResponse: [{ applied_filters: [{ column: 'country' }] }],
  };
  const chartLayoutItems: any[] = [];

  const a = selectNativeIndicatorsForChart(
    nativeFilters,
    dataMask,
    10,
    chart,
    chartLayoutItems,
  );
  const b = selectNativeIndicatorsForChart(
    nativeFilters,
    dataMask,
    10,
    chart,
    chartLayoutItems,
  );
  expect(b).toBe(a);

  clearIndicatorsCache();

  const c = selectNativeIndicatorsForChart(
    nativeFilters,
    dataMask,
    10,
    chart,
    chartLayoutItems,
  );
  expect(c).not.toBe(a);
  expect(c).toEqual(a);
});

test('selectIndicatorsForChart cache evicts oldest entries beyond max size', () => {
  // The cache cap is 100 chartIds; insert 101 distinct ids and confirm the
  // first one is evicted (its result is recomputed to a fresh reference)
  // while a recent id remains memoized.
  clearIndicatorsCache();

  const datasources = { 'ds-1': {} } as any;
  const chart = { queriesResponse: [{ applied_filters: [] }] };
  const makeFilters = (chartId: number) =>
    ({
      [chartId + 1000]: {
        chartId: chartId + 1000,
        columns: { country: 'US' },
        scopes: { country: { scope: ['ROOT_ID'], immune: [] } },
        labels: { country: 'Country' },
        isDateFilter: false,
        directPathToFilter: ['ROOT_ID'],
        datasourceId: 'ds-1',
      },
    }) as any;

  const firstResult = selectIndicatorsForChart(
    0,
    makeFilters(0),
    datasources,
    chart,
  );
  for (let i = 1; i <= 100; i += 1) {
    selectIndicatorsForChart(i, makeFilters(i), datasources, chart);
  }

  // Recent entry still cached.
  const recent = selectIndicatorsForChart(
    100,
    makeFilters(100),
    datasources,
    chart,
  );
  const recentAgain = selectIndicatorsForChart(
    100,
    makeFilters(100),
    datasources,
    chart,
  );
  expect(recentAgain).toBe(recent);

  // Oldest entry (chartId=0) was evicted: a recompute returns a new reference.
  const refetched = selectIndicatorsForChart(
    0,
    makeFilters(0),
    datasources,
    chart,
  );
  expect(refetched).not.toBe(firstResult);
  expect(refetched).toEqual(firstResult);
});
