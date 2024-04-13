import { useLocalStorage } from "@vueuse/core";

export type Marker = {
    latitude: number;
    longitude: number;
    name: string;
};

export const userMarker = useLocalStorage<Marker>("USER_MARKER", {
    latitude: 59.429813,
    longitude: 24.849374,
    name: 'Milrem Robotics',
});

export const nearbyMarkers = useLocalStorage<Marker[]>("NEARBY_MARKERS", []);