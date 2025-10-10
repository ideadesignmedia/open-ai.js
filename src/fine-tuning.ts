import type { HttpClient } from './http'
import type {
  Dictionary,
  FineTuningJob,
  FineTuningJobCheckpoint,
  FineTuningJobEvent,
  ListResponse
} from './types'

/**
 * Creates helper methods for the Fine-tuning API surface.
 *
 * @param http - HTTP client for issuing JSON requests.
 */
const createFineTuningClient = (http: HttpClient) => {
  /**
   * Lists fine-tuning jobs for the authenticated account.
   */
  const listFineTuningJobs = (): Promise<ListResponse<FineTuningJob>> => {
    return http.get<ListResponse<FineTuningJob>>('/v1/fine_tuning/jobs')
  }

  /**
   * Retrieves a single fine-tuning job by id.
   *
   * @param id - Fine-tuning job identifier.
   */
  const retrieveFineTuningJob = (id: string): Promise<FineTuningJob> => {
    return http.get<FineTuningJob>(`/v1/fine_tuning/jobs/${id}`)
  }

  /**
   * Creates a new fine-tuning job with the provided payload.
   *
   * @param payload - Fine-tuning request payload forwarded as-is.
   */
  const createFineTuningJob = (payload: Dictionary): Promise<FineTuningJob> => {
    return http.post<FineTuningJob, Dictionary>('/v1/fine_tuning/jobs', payload)
  }

  /**
   * Cancels a running fine-tuning job.
   *
   * @param id - Fine-tuning job id to cancel.
   */
  const cancelFineTuningJob = (id: string): Promise<FineTuningJob> => {
    return http.post<FineTuningJob, Record<string, never>>(`/v1/fine_tuning/jobs/${id}/cancel`, {})
  }

  /**
   * Lists events for a fine-tuning job.
   *
   * @param id - Fine-tuning job id to inspect.
   */
  const listFineTuningJobEvents = (id: string): Promise<ListResponse<FineTuningJobEvent>> => {
    return http.get<ListResponse<FineTuningJobEvent>>(`/v1/fine_tuning/jobs/${id}/events`)
  }

  /**
   * Lists checkpoints generated during a fine-tuning job.
   *
   * @param id - Fine-tuning job id.
   */
  const listFineTuningJobCheckpoints = (id: string): Promise<ListResponse<FineTuningJobCheckpoint>> => {
    return http.get<ListResponse<FineTuningJobCheckpoint>>(`/v1/fine_tuning/jobs/${id}/checkpoints`)
  }

  /**
   * Fine-tuning helper surface.
   */
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
