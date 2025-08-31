import api from "@/services/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeliveryByWorker, useRoute } from "./useDelivery";
import { useDeliveryDetail } from "./useDeliveryDetail";

export interface TransitRequest {
  delivery_id: string;
  transit_point_id: number;
}

export interface TransitResponse {
  status: string;
  message?: string;
  data?: any;
}

export interface TransitPoint {
  id: number;
  loading_city_id: number;
  unloading_city_id: number;
  estimated_duration_minute: number;
  cargo_type: string;
  extra_cost: number;
  is_active: boolean;
}

export interface TransitPointsResponse {
  status: string;
  data: TransitPoint[];
}

export interface TransitPointDetails {
  id: number;
  loadingCity: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    createdAt: number;
  };
  unloadingCity: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    createdAt: number;
  };
  estimatedDurationMinute: number;
  extraCost: number;
  cargo_type: string;
  createdAt: number;
  isActive: true;
}

export interface TransitPointDetailsResponse {
  status: string;
  data: TransitPointDetails[];
}

export interface DeliveryForTransit {
  id: string;
  route_id: string;
  status: string;
  current_location?: string;
  worker_id?: string;
  truck_id?: string;
  started_at?: number;
}

export interface ActiveDeliveriesResponse {
  status: string;
  data: DeliveryForTransit[];
}

// City mapping (you might want to fetch this from API too)
export interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
}

export interface CitiesResponse {
  status: string;
  data: City[];
}

// Fetch available transit points
const fetchTransitPoints = async (): Promise<TransitPointsResponse> => {
  const response = await api.get("/api/transit-points");
  return response.data;
};

const fetchTransitPointDetails = async (transitId: string): Promise<TransitPointDetailsResponse> => {
  const response = await api.get(`/api/transit-points/${transitId}`);
  return response.data;
}

// Fetch cities for mapping
const fetchCities = async (): Promise<{ status: string; data: City[] }> => {
  const response = await api.get("api/cities");
  return response.data;
};

const fetchCityById = async (cityId: number): Promise<{ status: string; data: City }> => {
  const response = await api.get(`api/cities/${cityId}`);
  return response.data;
}

// Submit transit
const submitTransit = async (
  transitData: TransitRequest
): Promise<TransitResponse> => {
  const response = await api.post("api/delivery/transit", transitData);
  return response.data;
};



// Hook for transit points
export const useTransitPoints = () => {
  return useQuery({
    queryKey: ["transit-points"],
    queryFn: fetchTransitPoints,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => ({
      ...data,
      data: data.data.filter((point) => point.is_active), // Only return active points
    }),
  });
};

export const useTransitPointDetails = (transitId: string) => {
  return useQuery({
    queryKey: ["transit-point-details", transitId],
    queryFn: () => fetchTransitPointDetails(transitId),
  });
};

// Hook for cities (for mapping city IDs to names)
export const useCities = () => {
  return useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,
    staleTime: 30 * 60 * 1000, // 30 minutes - cities don't change often
  });
};

export const useCityById = (cityId: number) => {
  return useQuery({
    queryKey: ["city", cityId],
    queryFn: () => fetchCityById(cityId),
    staleTime: 30 * 60 * 1000, // 30 minutes - cities don't change often
  });
}

// Hook for submitting transit
export const useSubmitTransit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitTransit,
    onSuccess: () => {
      // Refresh active deliveries after successful transit
      queryClient.invalidateQueries({ queryKey: ["active-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-history"] });
    },
  });
};

// Helper function to get city name by ID
export const getCityName = (cityId: number, cities: City[] = []) => {
  return cities.find((city) => city.id === cityId)?.name || `City ${cityId}`;
};

export const useTransitPointDriver = (worker_id: string) => {
  const { data: deliveriesDriver } = useDeliveryByWorker(worker_id);
  const { data: deliveryDetail } = useDeliveryDetail(
    deliveriesDriver?.data?.id || ""
  );
  const { data: routeDriver } = useRoute(
    deliveriesDriver?.data?.route_id || ""
  );
  const { data: citiesData } = useCities();

  // Pastikan semua data sudah siap
  const isReady =
    !!routeDriver?.data?.end_city_name &&
    !!citiesData?.data &&
    Array.isArray(citiesData.data) &&
    !!deliveryDetail?.data;

  return useQuery({
    queryKey: ["transit-point-driver", worker_id],
    queryFn: fetchTransitPoints,
    staleTime: 10 * 60 * 1000,
    enabled: isReady,
    select: (data) => {
      // Dapatkan transit terakhir yang sudah diterima (accepted)
      const acceptedTransits =
        deliveryDetail!.data.transits?.filter(
          (transit) => transit.is_accepted
        ) || [];

      let currentCityName: string;

      if (acceptedTransits.length === 0) {
        // Belum ada transit yang diterima, gunakan end_city_name dari route
        currentCityName = routeDriver!.data.end_city_name;
      } else {
        // Sudah ada transit yang diterima, gunakan unloading city dari transit terakhir
        const lastAcceptedTransit =
          acceptedTransits[acceptedTransits.length - 1];
        currentCityName = getCityName(
          lastAcceptedTransit.transit_point.unloading_city_id,
          citiesData!.data
        );
      }

      return {
        ...data,
        data: data.data.filter(
          (point) =>
            point.is_active &&
            getCityName(point.loading_city_id, citiesData!.data) ===
              currentCityName
        ),
      };
    },
  });
};
