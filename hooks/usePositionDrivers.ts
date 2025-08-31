import api from "@/services/axios";
import { useQuery } from "@tanstack/react-query";

interface Positions {
    "latitude": number,
      "longitude": number,
      "name": string,
      "city": string,
      "state": string,
      "country": string,
      "formatted_address": string,
      "plus_code": string,
      "recorded_at": number
}


interface PositionResponse {
    status: string;
    data: Positions[];
}

const getPositionDriver = async (deliveryId: string): Promise<PositionResponse> => {
  try {
    const response = await api.get(`/api/delivery/positions/${deliveryId}`);
    if (response.status !== 200) {
      throw new Error(`Failed to fetch positions: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching driver positions:", error);
    throw error;
  }
}

export const usePositionDrivers = (deliveryId: string) => {
  return useQuery({
    queryKey: ["positions", deliveryId],
    queryFn: () => getPositionDriver(deliveryId),
    staleTime: 900000, // 15 minutes
    enabled: !!deliveryId,
  });
}