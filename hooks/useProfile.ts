// hooks/useProfile.ts
import { useAuth } from "@/context/AuthContext";
import api from "@/services/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
interface UserProfile {
  id: string;
  username: string;
  refresh_token: string;
  email: string;
  role: string;
  phone_number: string;
  age: number;
}

interface ProfileResponse {
  status: string;
  data: UserProfile;
}

interface UpdateProfileData {
  username?: string;
  email?: string;
  phone_number?: string;
  age?: number;
}


interface UpdateProfile {
  refresh_token: string;
}
interface UpdateProfileResponse {
  status: string;
  data: UpdateProfile;
}


// API functions
const fetchProfile = async (): Promise<ProfileResponse> => {
  const response = await api.get("/api/users/profile");
  console.log("Profile API response:", response.data); // Debug log

  if (response.status !== 200) {
    throw new Error("Failed to fetch user profile");
  }

  return response.data;
};

const updateProfile = async (
  data: UpdateProfileData
): Promise<UpdateProfileResponse> => {
  const response = await api.post("/api/users/profile", data);
  

  if (response.status !== 200) {
    throw new Error("Failed to update profile");
  }

  return response.data;
};

const validateRole = async () => {
    const response = await api.get("/auth/validate");
    if (response.status !== 200) {
        throw new Error("Failed to validate user role");
    }
    return response.data;
}

// Custom hooks
export const useProfile = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["user_profile"],
    queryFn: fetchProfile,
    enabled: isAuthenticated, // Only fetch if user is authenticated
    retry: 2,
    staleTime: 0,
  });
};

export const useValidateRole = () => {
  return useQuery({
    queryKey: ["validate_role"],
    queryFn: validateRole,
    retry: 2,
    refetchOnWindowFocus: false, // Avoid refetching on window focus
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      // Update the profile query cache
      queryClient.setQueryData(["user_profile"], data);
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["user_profile"] });
    },
    onError: (error) => {
      console.error("Update profile error:", error);
    },
  });

  
};
