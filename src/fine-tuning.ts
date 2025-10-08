import type { HttpClient } from './http'
import type {
  Dictionary,
  FineTuningJob,
  FineTuningJobCheckpoint,
  FineTuningJobEvent,
  ListResponse
} from './types'

const createFineTuningClient = (http: HttpClient) => {
  const listFineTuningJobs = (): Promise<ListResponse<FineTuningJob>> => {
    return http.get<ListResponse<FineTuningJob>>('/v1/fine_tuning/jobs')
  }

  const retrieveFineTuningJob = (id: string): Promise<FineTuningJob> => {
    return http.get<FineTuningJob>(`/v1/fine_tuning/jobs/${id}`)
  }

  const createFineTuningJob = (payload: Dictionary): Promise<FineTuningJob> => {
    return http.post<FineTuningJob, Dictionary>('/v1/fine_tuning/jobs', payload)
  }

  const cancelFineTuningJob = (id: string): Promise<FineTuningJob> => {
    return http.post<FineTuningJob, Record<string, never>>(`/v1/fine_tuning/jobs/${id}/cancel`, {})
  }

  const listFineTuningJobEvents = (id: string): Promise<ListResponse<FineTuningJobEvent>> => {
    return http.get<ListResponse<FineTuningJobEvent>>(`/v1/fine_tuning/jobs/${id}/events`)
  }

  const listFineTuningJobCheckpoints = (id: string): Promise<ListResponse<FineTuningJobCheckpoint>> => {
    return http.get<ListResponse<FineTuningJobCheckpoint>>(`/v1/fine_tuning/jobs/${id}/checkpoints`)
  }

  return {
    listFineTuningJobs,
    retrieveFineTuningJob,
    createFineTuningJob,
    cancelFineTuningJob,
    listFineTuningJobEvents,
    listFineTuningJobCheckpoints
  }
}

export { createFineTuningClient }
