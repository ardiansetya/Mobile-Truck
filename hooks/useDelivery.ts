
import api from "@/services/axios";
import { useQuery } from "@tanstack/react-query";

// Types
interface Delivery {
  id: string;
  worker_id: string;
  truck_id: string;
  route_id: string;
  add_by_operator_id: string;
  started_at: number;
}

interface DeliveryResponse {
  status: string;
  data: Delivery[];
}
interface DeliveryWorkerResponse {
  status: string;
  data: Delivery;
}

interface TransitPoint {
  id: number;
  loading_city_id: number;
  unloading_city_id: number;
  estimated_duration_minute: number;
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

interface Worker {
  id: string;
  username: string;
  email: string;
  role: string;
  phone_number: string;
  age: number;
}

interface WorkerResponse {
  status: string;
  data: Worker;
}

interface Truck {
  id: string;
  license_plate: string;
  model: string;
  capacity_kg: number;
  cargo_type: string;
  is_available: boolean;
  deleted_at: number | null;
}

interface TruckResponse {
  status: string;
  data: Truck;
}

interface Route {
  id: string;
  start_city_name: string;
  end_city_name: string;
  details: string;
  base_price: number;
  distance_km: number;
  cargo_type: string;
  estimated_duration_hours: number;
  is_active: boolean;
  created_at: number;
}

interface RouteResponse {
  status: string;
  data: Route;
}

// API functions
const fetchActiveDeliveries = async (): Promise<DeliveryResponse> => {
  const response = await api.get("/api/delivery/active");
  console.log(response.data);

  if (response.status !== 200) {
    throw new Error("Failed to fetch active deliveries");
  }

  return response.data;
};

const fetchActiveDeliveriesWorker = async (
  worker_id: string
): Promise<DeliveryWorkerResponse> => {
  const response = await api.get(`/api/delivery/active/${worker_id}`);

  if (response.status !== 200) {
    throw new Error("Failed to fetch active deliveries");
  }

  return response.data;
};

const fetchDeliveryDetail = async (delivery_id: string): Promise<DeliveryDetailResponse> => {
  const response = await api.get(`/api/delivery/${delivery_id}`);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch delivery detail ${delivery_id}`);
  }

  return response.data;
};
const fetchDeliveryByWorker = async (): Promise<DeliveryDetailResponse> => {
  const response = await api.get("/api/delivery/detail");

  if (response.status !== 200) {
    throw new Error(`Failed to fetch delivery detail `);
  }

  return response.data;
};

const fetchWorker = async (worker_id: string): Promise<WorkerResponse> => {
  const response = await api.get(`/api/users/${worker_id}`);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch worker ${worker_id}`);
  }

  return response.data;
};

const fetchTruck = async (truck_id: string): Promise<TruckResponse> => {
  const response = await api.get(`/api/trucks/${truck_id}`);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch truck ${truck_id}`);
  }

  return response.data;
};

const fetchRoute = async (route_id: string): Promise<RouteResponse> => {
  const response = await api.get(`/api/routes/${route_id}`);

  if (response.status !== 200) {
    throw new Error(`Failed to fetch route ${route_id}`);
  }

  return response.data;
};

// Custom hooks
export const useActiveDeliveries = () => {
  return useQuery({
    queryKey: ["active_deliveries"],
    queryFn: fetchActiveDeliveries,
    // refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
};
export const useActiveDeliveriesWorker = (worker_id: string) => {
  return useQuery({
    queryKey: ["active_deliveries", worker_id],
    queryFn: () => fetchActiveDeliveriesWorker(worker_id),
    // refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
};
export const useDeliveryByWorker = (worker_id: string) => {
  return useQuery({
    queryKey: ["worker_deliveries", worker_id],
    queryFn: () => fetchActiveDeliveriesWorker(worker_id),
    // refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
};
export const useDeliveryDetailsByWorker = () => {
  return useQuery({
    queryKey: ["worker_deliveries" ],
    queryFn: fetchDeliveryByWorker,
    // refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
};

export const useDeliveryDetail = (delivery_id: string) => {
  return useQuery({
    queryKey: ["delivery_detail", delivery_id],
    queryFn: () => fetchDeliveryDetail(delivery_id),
    enabled: !!delivery_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useWorker = (worker_id: string) => {
  return useQuery({
    queryKey: ["worker", worker_id],
    queryFn: () => fetchWorker(worker_id),
    enabled: !!worker_id, // Only run query if worker_id exists
    staleTime: 5 * 60 * 1000, // Worker data is less likely to change, cache for 5 minutes
  });
};

export const useTruck = (truck_id: string) => {
  return useQuery({
    queryKey: ["truck", truck_id],
    queryFn: () => fetchTruck(truck_id),
    enabled: !!truck_id, // Only run query if truck_id exists
    staleTime: 5 * 60 * 1000, // Truck data is less likely to change, cache for 5 minutes
  });
};

export const useRoute = (route_id: string) => {
  return useQuery({
    queryKey: ["route", route_id],
    queryFn: () => fetchRoute(route_id),
    enabled: !!route_id, // Only run query if route_id exists
    staleTime: 5 * 60 * 1000, // Route data is less likely to change, cache for 5 minutes
  });
};

// Hook to get multiple workers
export const useWorkers = (worker_ids: string[]) => {
  return useQuery({
    queryKey: ["workers", worker_ids],
    queryFn: async () => {
      const workers = await Promise.all(
        worker_ids.map((id) => fetchWorker(id))
      );
      return workers.reduce(
        (acc, worker) => {
          acc[worker.data.id] = worker.data;
          return acc;
        },
        {} as Record<string, Worker>
      );
    },
    enabled: worker_ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook to get multiple trucks
export const useTrucks = (truck_ids: string[]) => {
  return useQuery({
    queryKey: ["trucks", truck_ids],
    queryFn: async () => {
      const trucks = await Promise.all(
        truck_ids.map((id) => fetchTruck(id))
      );
      return trucks.reduce(
        (acc, truck) => {
          acc[truck.data.id] = truck.data;
          return acc;
        },
        {} as Record<string, Truck>
      );
    },
    enabled: truck_ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook to get multiple routes
export const useRoutes = (route_ids: string[]) => {
  return useQuery({
    queryKey: ["routes", route_ids],
    queryFn: async () => {
      const routes = await Promise.all(
        route_ids.map((id) => fetchRoute(id))
      );
      return routes.reduce(
        (acc, route) => {
          acc[route.data.id] = route.data;
          return acc;
        },
        {} as Record<string, Route>
      );
    },
    enabled: route_ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Combined hook for delivery with all related data
export const useDeliveryWithDetails = (delivery: Delivery) => {
  const workerQuery = useWorker(delivery.worker_id);
  const truckQuery = useTruck(delivery.truck_id);
  const routeQuery = useRoute(delivery.route_id);

  return {
    delivery,
    worker: workerQuery.data?.data,
    truck: truckQuery.data?.data,
    route: routeQuery.data?.data,
    isLoading: workerQuery.isLoading || truckQuery.isLoading || routeQuery.isLoading,
    error: workerQuery.error || truckQuery.error || routeQuery.error,
  };
};


// Types based on snake_case payload
export interface DeliveryHistoryItem {
  id: string;
  worker_id: string;
  truck_id: string;
  route_id: string;
  started_at: number; // timestamp
  finished_at: number; // timestamp
  add_by_operator_id: string;
}

export interface DeliveryHistoryResponse {
  status: string;
  data: DeliveryHistoryItem[];
}

// Query key factory
export const deliveryHistoryKeys = {
  all: ["delivery-history"] as const,
  lists: () => [...deliveryHistoryKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...deliveryHistoryKeys.lists(), { filters }] as const,
};

// Fetch function
const fetchDeliveryHistory = async (): Promise<DeliveryHistoryResponse> => {
  const response = await api.get("api/delivery/history");
  return response.data;
};

// Hook
export const useDeliveryHistory = () => {
  return useQuery({
    queryKey: deliveryHistoryKeys.lists(),
    queryFn: fetchDeliveryHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
  });
};

// Hook with filters (optional - for future use)
export const useDeliveryHistoryWithFilters = (
  filters: Record<string, any> = {}
) => {
  return useQuery({
    queryKey: deliveryHistoryKeys.list(filters),
    queryFn: () => fetchDeliveryHistory(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: true,
  });
};
