import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { SettlementListParams } from '@/types';

export const useSettlements = (params?: SettlementListParams) => {
  return useQuery({
    queryKey: ['settlements', params],
    queryFn: () => apiService.getSettlements(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSettlement = (id: string) => {
  return useQuery({
    queryKey: ['settlement', id],
    queryFn: () => apiService.getSettlementById(id),
    enabled: !!id,
  });
};

export const useProcessSettlement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiService.processSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}; 