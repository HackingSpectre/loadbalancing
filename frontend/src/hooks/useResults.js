import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

/**
 * Historical run listing and detail loading for comparative charts.
 */
export function useResults() {
  const [runs, setRuns] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listRuns();
      setRuns(data.runs || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const selectRun = useCallback(async (runId) => {
    setSelectedId(runId);
    if (!runId) {
      setSelectedRun(null);
      return;
    }
    setDetailLoading(true);
    try {
      const run = await api.getRun(runId);
      setSelectedRun(run);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load run detail');
      setSelectedRun(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const toggleCompare = useCallback((runId) => {
    setCompareIds((prev) => {
      if (prev.includes(runId)) {
        return prev.filter((id) => id !== runId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, runId];
    });
  }, []);

  const loadCompare = useCallback(async () => {
    if (!compareIds.length) {
      setCompareData([]);
      return;
    }
    try {
      const details = await Promise.all(compareIds.map((id) => api.getRun(id)));
      setCompareData(details.filter(Boolean));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load comparison data');
    }
  }, [compareIds]);

  useEffect(() => {
    loadCompare();
  }, [loadCompare]);

  return {
    runs,
    selectedId,
    selectedRun,
    compareIds,
    compareData,
    loading,
    detailLoading,
    error,
    loadRuns,
    selectRun,
    toggleCompare,
  };
}
