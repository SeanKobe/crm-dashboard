import { useCallback } from 'react'
import { companiesService, subscribeCompanies, type Company } from '../services/companies'
import { configureContactsService } from '../services/contacts'
import { useLiveList, type LiveList } from './useLiveList'

/** `simulateError` is the test hook (?error=1): reads fail until it is removed. */
export function useCompanies(minLoadMs = 0, simulateError = false): LiveList<Company[]> {
  const load = useCallback(() => { configureContactsService({ failReads: simulateError }); return companiesService.list() }, [simulateError])
  return useLiveList(load, subscribeCompanies, minLoadMs)
}
