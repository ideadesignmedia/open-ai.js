import { get, post } from './http'
import type {
  Dictionary,
  FineTuningJob,
  FineTuningJobCheckpoint,
  FineTuningJobEvent,
  ListResponse
} from './types'

const listFineTuningJobs = (): Promise<ListResponse<FineTuningJob>> => {
  return get<ListResponse<FineTuningJob>>('/v1/fine_tuning/jobs')
}

const retrieveFineTuningJob = (id: string): Promise<FineTuningJob> => {
  return get<FineTuningJob>(`/v1/fine_tuning/jobs/${id}`)
}

const createFineTuningJob = (payload: Dictionary): Promise<FineTuningJob> => {
  return post<FineTuningJob, Dictionary>('/v1/fine_tuning/jobs', payload)
}

const cancelFineTuningJob = (id: string): Promise<FineTuningJob> => {
  return post<FineTuningJob, Record<string, never>>(`/v1/fine_tuning/jobs/${id}/cancel`, {})
}

const listFineTuningJobEvents = (id: string): Promise<ListResponse<FineTuningJobEvent>> => {
  return get<ListResponse<FineTuningJobEvent>>(`/v1/fine_tuning/jobs/${id}/events`)
}

const listFineTuningJobCheckpoints = (id: string): Promise<ListResponse<FineTuningJobCheckpoint>> => {
  return get<ListResponse<FineTuningJobCheckpoint>>(`/v1/fine_tuning/jobs/${id}/checkpoints`)
}

export {
  cancelFineTuningJob,
  createFineTuningJob,
  listFineTuningJobCheckpoints,
  listFineTuningJobEvents,
  listFineTuningJobs,
  retrieveFineTuningJob
}
