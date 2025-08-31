// hooks/useDeliveryDetail.ts
import api from "@/services/axios";
import { useQuery } from "@tanstack/react-query";

// Types
interface TransitPoint {
  id: number;
  loading_city_id: number;
  unloading_city_id: number;
  estimated_duration_minute: number;
  cargo_type: string;
  extra_cost: number;
  is_active: boolean;
}

interface Transit {
  id: string;
  transit_point: TransitPoint;
  arrived_at: number;
  is_accepted: boolean;
  reason: string;
  actioned_at: number;
  action_by_operator_id: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: number;
}

interface DeliveryDetail {
  id: string;
  worker_id: string;
  truck_id: string;
  route_id: string;
  add_by_operator_id: string;
  started_at: number;
  finished_at: number;
  transits: Transit[];
  alerts: Alert[];
}

interface DeliveryDetailResponse {
  status: string;
  data: DeliveryDetail;
}

// API function
const fetchDeliveryDetail = async (
  delivery_id: string
): Promise<DeliveryDetailResponse> => {
  const response = await api.get(`/api/delivery/detail/${delivery_id}`);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch delivery detail ${delivery_id}`);
  }

  return response.data;
};

// Custom hook
export const useDeliveryDetail = (delivery_id: string) => {
  return useQuery({
    queryKey: ["delivery_detail", delivery_id],
    queryFn: () => fetchDeliveryDetail(delivery_id),
    enabled: !!delivery_id,
  });
};
