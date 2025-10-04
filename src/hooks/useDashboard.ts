import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      console.log('Fetching dashboard data...');
      const data = await apiService.getDashboardData();
      console.log('Dashboard data received:', data);
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}; 