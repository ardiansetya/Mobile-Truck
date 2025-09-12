// import "dotenv/config";

// export default {
//     expo: {
//         name: "Tracking Truck",
//         slug: "tracking-truck",
//         version: "1.0.0",
//         orientation: "portrait",
//         icon: "./assets/icons/icon.png",
//         scheme: "trackingtruck",
//         userInterfaceStyle: "automatic",
//         splash: {
//             image: "./assets/images/splash.png",
//             resizeMode: "contain",
//             backgroundColor: "#ffffff",
//         },
//         newArchEnabled: true,
//         ios: {
//             supportsTablet: true,
//         },
//         android: {
//             adaptiveIcon: {
//                 foregroundImage: "./assets/icons/adaptive-icon.png",
//                 backgroundColor: "#ffffff",
//             },
//             edgeToEdgeEnabled: true,
//             package: "com.michellee.trackingtruck",
//             permissions: [
//                 "android.permission.ACCESS_COARSE_LOCATION",
//                 "android.permission.ACCESS_FINE_LOCATION",
//             ],
//         },
//         web: {
//             bundler: "metro",
//             output: "static",
//             favicon: "./assets/icons/icon.png",
//         },
//         plugins: [
//             [
//                 "expo-location",
//                 {
//                     locationAlwaysAndWhenInUsePermission:
//                         "Allow Tracking Truck to use your location.",
//                 },
//             ],
//             "expo-router",
//             [
//                 "expo-splash-screen",
//                 {
//                     image: "./assets/images/splash.png",
//                     imageWidth: 800,
//                     resizeMode: "contain",
//                     backgroundColor: "#ffffff",
//                 },
//             ],
//             "expo-maps",
//             "expo-secure-store",
//             [
//                 'expo-build-properties',
//                 {
//                     android: {
//                         usesCleartextTraffic: true,
//                     },
//                 },
//             ],
//         ],
//         experiments: {
//             typedRoutes: true,
//         },
//         extra: {
//             router: {},
//             apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://154.19.37.110:8080",
//             eas: {
//                 projectId: "54b09975-1cef-47e3-80a2-31b2ec99ef82",
//             },
//         },
//         owner: "michellee",
//     },
// };


import "dotenv/config";

export default {
    expo: {
        name: "Tracking Truck",
        slug: "tracking-truck",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icons/icon.png",
        scheme: "trackingtruck",
        userInterfaceStyle: "automatic",
        splash: {
            image: "./assets/images/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff",
        },
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            infoPlist: {
                UIBackgroundModes: [
                    "background-fetch",
                    "location"
                ],
                NSLocationAlwaysAndWhenInUseUsageDescription: "Allow Tracking Truck to use your location even when the app is in the background to track delivery routes.",
                NSLocationWhenInUseUsageDescription: "Allow Tracking Truck to use your location to track delivery routes."
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/icons/adaptive-icon.png",
                backgroundColor: "#ffffff",
            },
            edgeToEdgeEnabled: true,
            package: "com.michellee.trackingtruck",
            permissions: [
                "android.permission.ACCESS_COARSE_LOCATION",
                "android.permission.ACCESS_FINE_LOCATION",
                "android.permission.ACCESS_BACKGROUND_LOCATION",
                "android.permission.FOREGROUND_SERVICE",
                "android.permission.FOREGROUND_SERVICE_LOCATION",
                "android.permission.WAKE_LOCK"
            ],
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/icons/icon.png",
        },
        plugins: [
            [
                "expo-location",
                {
                    locationAlwaysAndWhenInUsePermission:
                        "Allow Tracking Truck to use your location even when the app is in the background to track delivery routes.",
                    locationWhenInUsePermission:
                        "Allow Tracking Truck to use your location to track delivery routes.",
                    isIosBackgroundLocationEnabled: true,
                    isAndroidBackgroundLocationEnabled: true,
                },
            ],
            [
                "expo-background-fetch",
                {
                    backgroundFetchRequiredDelay: 900 // 15 minutes in seconds
                }
            ],
            "expo-task-manager",
            "expo-router",
            [
                "expo-splash-screen",
                {
                    image: "./assets/images/splash.png",
                    imageWidth: 800,
                    resizeMode: "contain",
                    backgroundColor: "#ffffff",
                },
            ],
            "expo-maps",
            "expo-secure-store",
            [
                'expo-build-properties',
                {
                    android: {
                        usesCleartextTraffic: true,
                    },
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            router: {},
            apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080",
            eas: {
                projectId: "304eb0ad-4961-4f92-8a18-1647215a4c4d",
            },
        },
        owner: "ardian95",
    },
};