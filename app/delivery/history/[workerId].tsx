import { useDeliveryHistoryByWorkerId } from "@/hooks/useDelivery";
import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Types
export interface DeliveryHistoryWorker {
  id: string;
  worker_id: string;
  truck_id: string;
  route_id: string;
  started_at: number;
  finished_at: number;
  add_by_operator_id: string;
}

export interface DeliveryHistoryWorkerResponse {
  status: string;
  data: DeliveryHistoryWorker[];
}

interface DeliveryHistoryPageProps {
  workerId: string;
}

const DeliveryHistoryPage: React.FC<DeliveryHistoryPageProps> = ({
  workerId,
}) => {
  const { data, isLoading, error, refetch, isRefetching } =
    useDeliveryHistoryByWorkerId(workerId);

  const formatDate = (epochTime: number): string => {
    // Convert epoch time (seconds) to milliseconds
    const date = new Date(epochTime * 1000);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (startEpoch: number, endEpoch: number): string => {
    // Calculate duration in seconds, then convert to hours and minutes
    const durationSeconds = endEpoch - startEpoch;
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    return `${hours}j ${minutes}m`;
  };

  const renderHistoryItem = ({ item }: { item: DeliveryHistoryWorker }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.historyId}>#{item.id.slice(-8)}</Text>
        <Text style={styles.duration}>
          {calculateDuration(item.started_at, item.finished_at)}
        </Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Truck ID:</Text>
          <Text style={styles.value}>{item.truck_id}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Route ID:</Text>
          <Text style={styles.value}>{item.route_id}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Mulai:</Text>
          <Text style={styles.value}>{formatDate(item.started_at)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Selesai:</Text>
          <Text style={styles.value}>{formatDate(item.finished_at)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Operator:</Text>
          <Text style={styles.value}>{item.add_by_operator_id}</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>Tidak ada riwayat delivery</Text>
      <Text style={styles.emptyStateSubtext}>
        Belum ada data delivery untuk worker ini
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>Gagal memuat data</Text>
      <Text style={styles.errorSubtext}>
        {error?.message || "Terjadi kesalahan saat memuat riwayat delivery"}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Riwayat Delivery</Text>
          <Text style={styles.headerSubtitle}>Worker ID: {workerId}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Memuat riwayat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Delivery</Text>
        <Text style={styles.headerSubtitle}>Worker ID: {workerId}</Text>
      </View>

      <FlatList
        data={data?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={["#007bff"]}
            tintColor="#007bff"
          />
        }
        ListEmptyComponent={error ? renderError() : renderEmptyState()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6c757d",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  historyId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007bff",
  },
  duration: {
    fontSize: 14,
    fontWeight: "500",
    color: "#28a745",
    backgroundColor: "#d4edda",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  label: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: "#212529",
    fontWeight: "400",
    flex: 2,
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6c757d",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#adb5bd",
    textAlign: "center",
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc3545",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default DeliveryHistoryPage;
