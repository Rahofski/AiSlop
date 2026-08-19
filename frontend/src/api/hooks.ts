import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { ApiSubject, ApiTask, TaskFilters } from './types'

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: () => api<ApiSubject[]>('/api/subjects'),
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; teacher: string }) =>
      api<ApiSubject>('/api/subjects', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  })
}

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters.subject_id) params.set('subject_id', filters.subject_id)
      if (filters.status) params.set('status', filters.status)
      if (filters.kind) params.set('kind', filters.kind)
      if (filters.days) params.set('days', String(filters.days))
      const query = params.toString()
      return api<ApiTask[]>(`/api/tasks${query ? `?${query}` : ''}`)
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { prompt_text: string; subject_id: string; tasktype_id: string }) =>
      api<ApiTask>('/api/tasks', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}
