/**
 * Custom React Hook for consuming Master Data Management (Module 02)
 */

import { useState, useEffect, useCallback } from 'react';
import { masterDataService } from '../services/MasterDataService';
import type {
  LookupValue,
  State,
  District,
  Taluka,
  Village,
  ServiceMaster,
  DocumentTypeMaster,
  PaymentMethodMaster,
} from '../types/master.types';

export function useMasterLookups(categoryKey: string) {
  const [items, setItems] = useState<LookupValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    masterDataService.getLookupValues(categoryKey).then((data) => {
      if (mounted) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [categoryKey]);

  return { items, loading };
}

export function useGeographyCascade() {
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [talukas, setTalukas] = useState<Taluka[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTalukas, setLoadingTalukas] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const loadStates = useCallback(async () => {
    setLoadingStates(true);
    const data = await masterDataService.getStates();
    setStates(data);
    setLoadingStates(false);
  }, []);

  const loadDistricts = useCallback(async (stateId?: string) => {
    setLoadingDistricts(true);
    const data = await masterDataService.getDistricts(stateId);
    setDistricts(data);
    setLoadingDistricts(false);
  }, []);

  const loadTalukas = useCallback(async (districtId?: string) => {
    setLoadingTalukas(true);
    const data = await masterDataService.getTalukas(districtId);
    setTalukas(data);
    setLoadingTalukas(false);
  }, []);

  const loadVillages = useCallback(async (talukaId?: string) => {
    setLoadingVillages(true);
    const data = await masterDataService.getVillages(talukaId);
    setVillages(data);
    setLoadingVillages(false);
  }, []);

  useEffect(() => {
    loadStates();
  }, [loadStates]);

  return {
    states,
    districts,
    talukas,
    villages,
    loadingStates,
    loadingDistricts,
    loadingTalukas,
    loadingVillages,
    loadDistricts,
    loadTalukas,
    loadVillages,
  };
}

export function useMasterServices() {
  const [services, setServices] = useState<ServiceMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    masterDataService.getServices().then((data) => {
      setServices(data);
      setLoading(false);
    });
  }, []);

  return { services, loading };
}

export function useMasterDocumentTypes() {
  const [docTypes, setDocTypes] = useState<DocumentTypeMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    masterDataService.getDocumentTypes().then((data) => {
      setDocTypes(data);
      setLoading(false);
    });
  }, []);

  return { docTypes, loading };
}

export function useMasterPaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    masterDataService.getPaymentMethods().then((data) => {
      setPaymentMethods(data);
      setLoading(false);
    });
  }, []);

  return { paymentMethods, loading };
}
