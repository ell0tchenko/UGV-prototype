<template>
    <div class="notification-popup" v-if="notificationVisible">
        {{ notificationMessage }}
    </div>
    <div class="map-container">
        <div id="map" class="map"></div>
        <div class="button-instruction--container">
            <button class="engine-button" @click="toggleEngine">
                <span v-if="engineStarted">STOP ENGINE</span>
                <span v-else>START ENGINE</span>
            </button>
            <p class="instruction">Move the UGV with arrow keys</p>
            <div class="saved-waypoints">
                <h2>SAVED WAYPOINTS</h2>
                <ul>
                    <li v-for="(waypoint, index) in nearbyMarkers" :key="index" class="waypoint-item">
                        {{ waypoint.name }}: {{ waypoint.latitude.toFixed(2) }}, {{ waypoint.longitude.toFixed(2) }}
                        <div class="waypoint-button--container">
                            <button @click="deleteWaypoint(waypoint.latitude, waypoint.longitude)"
                                class="waypoint-button">DELETE</button>
                            <button @click="renameWaypoint(index)" class="waypoint-button">RENAME</button>
                            <button @click="driveWaypoint(waypoint)" class="waypoint-button">DRIVE</button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>



</template>

<script lang="ts">
import { defineComponent, onMounted, watchEffect, ref, onUnmounted } from 'vue';
import * as leaflet from "leaflet";
import { userMarker, nearbyMarkers, Marker } from "@/stores/mapStore";

export default defineComponent({
    name: 'MapComponent',
    setup() {
        const engineStarted = ref(false);
        const isMounted = ref(false);
        let map: leaflet.Map;
        let userGeoMarker: leaflet.Marker;
        let waypointPopup: leaflet.Popup | null = null;
        const notificationMessage = ref('');
        const notificationVisible = ref(false);


        onMounted(() => {
            isMounted.value = true;
            initializeMap();
        });

        watchEffect(() => {
            if (!isMounted.value) return;

            const { latitude, longitude } = userMarker.value;

            if (userGeoMarker) {
                userGeoMarker.setLatLng([latitude, longitude]);
            } else {
                userGeoMarker = leaflet.marker([latitude, longitude]);

                if (map) {
                    userGeoMarker.addTo(map);
                } else {
                    console.error("Map is not initialized yet.");
                    return;
                }

                userGeoMarker.bindPopup("User Marker");

                const el = userGeoMarker.getElement();
                if (el) {
                    el.style.filter = "hue-rotate(120deg)";
                }
            }
        });

        function initializeMap() {
            map = leaflet.map("map").setView([userMarker.value.latitude, userMarker.value.longitude], 13);

            leaflet
                .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 19,
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                })
                .addTo(map);

            nearbyMarkers.value.forEach(({ latitude, longitude }) => {
                leaflet
                    .marker([latitude, longitude])
                    .addTo(map)
                    .bindPopup(
                        `Saved place at (<strong>${latitude.toFixed(2)},${longitude.toFixed(2)}</strong>)`
                    );
            });

            map.on('contextmenu', (e) => {
                if (waypointPopup) {
                    waypointPopup.remove();
                }

                waypointPopup = leaflet.popup({
                    closeButton: false,
                    minWidth: 100,
                    maxWidth: 300,
                    maxHeight: 200,
                    autoClose: false,
                    closeOnClick: false,
                })
                    .setLatLng(e.latlng)
                    .setContent(`
                    <style>
                        .popup-button {
                            padding: 3px 10px;
                            cursor: pointer;
                            background-color: #ffffff;
                            border: 1px solid black;
                            color: rgb(20, 20, 21);
                            border-radius: 4px;
                            transition: background-color 0.3s;
                            font-family: "Nunito Sans", sans-serif;
                            margin: 0 5px;
                        }
                        .popup-button:hover {
                            background-color: #e3e3e3;
                        }
                    </style>
                        <button id="drive" class="popup-button">DRIVE</button>
                        <button id="save" class="popup-button">SAVE</button>
                        <button id="discard" class="popup-button">DISCARD</button>
                    `)
                    .openOn(map);

                document.getElementById('drive').addEventListener('click', () => {
                    driveWaypoint(e.latlng)
                });
                document.getElementById('save').addEventListener('click', () => {
                    saveWaypoint(e)
                });
                document.getElementById('discard').addEventListener('click', () => {
                    discardWaypoint()
                });
            });

            document.addEventListener("keydown", handleArrowKeyPress);
        }

        function toggleEngine() {
            engineStarted.value = !engineStarted.value;
        }

        function showNotification(message: string) {
            notificationMessage.value = message;
            notificationVisible.value = true;

            setTimeout(() => {
                notificationVisible.value = false;
            }, 3000);

        }

        function handleArrowKeyPress(event: KeyboardEvent) {
            if (!engineStarted.value) {
                showNotification("Please start the engine to move the UGV");
                return;
            }

            const moveDistance = 5; // Number of pixels to move
            const currentLatLng = userGeoMarker.getLatLng();
            let newLatLng: leaflet.LatLng | null = null;

            switch (event.key) {
                case "ArrowUp":
                    newLatLng = new leaflet.LatLng(currentLatLng.lat + (moveDistance / 111111), currentLatLng.lng);
                    break;
                case "ArrowDown":
                    newLatLng = new leaflet.LatLng(currentLatLng.lat - (moveDistance / 111111), currentLatLng.lng);
                    break;
                case "ArrowLeft":
                    newLatLng = new leaflet.LatLng(currentLatLng.lat, currentLatLng.lng - (moveDistance / (111111 * Math.cos(currentLatLng.lat * Math.PI / 180))));
                    break;
                case "ArrowRight":
                    newLatLng = new leaflet.LatLng(currentLatLng.lat, currentLatLng.lng + (moveDistance / (111111 * Math.cos(currentLatLng.lat * Math.PI / 180))));
                    break;
                default:
                    break;
            }

            if (newLatLng) {
                userGeoMarker.setLatLng(newLatLng);
                map.panTo(newLatLng);
            }
        }

        function driveWaypoint(waypoint: leaflet.LatLng | Marker | null) {
            let waypointLatLng: leaflet.LatLng;

            if ('latitude' in waypoint && 'longitude' in waypoint) {
                waypointLatLng = new leaflet.LatLng(waypoint.latitude, waypoint.longitude);
                userMarker.value.latitude = waypoint.latitude;
                userMarker.value.longitude = waypoint.longitude;
            } else if (waypoint instanceof leaflet.LatLng) {
                waypointLatLng = waypoint;
                userMarker.value.latitude = waypoint.lat;
                userMarker.value.longitude = waypoint.lng;
            } else {
                return;
            }

            if (userGeoMarker) {
                userGeoMarker.setLatLng(waypointLatLng); // Update the marker position
            } else {
                userGeoMarker = leaflet.marker(waypointLatLng).addTo(map);
            }

            map.setView(waypointLatLng, 13); // Set the map view to the waypoint

            if (waypointPopup) {
                waypointPopup.remove();
            }
        }

        function saveWaypoint(e) {
            const { lat: latitude, lng: longitude } = e.latlng;

            leaflet
                .marker([latitude, longitude])
                .addTo(map)
                .bindPopup(
                    `Saved place at (<strong>${latitude.toFixed(2)},${longitude.toFixed(2)}</strong>)`
                );

            nearbyMarkers.value.push({ latitude, longitude, name: 'Place at' });

            if (waypointPopup) {
                waypointPopup.remove();
            }
        }

        function discardWaypoint() {
            if (waypointPopup) {
                waypointPopup.remove();
            }
        }

        function renameWaypoint(index?: number) {
            const newName = prompt("Enter new name for the waypoint:");
            if (newName && index !== undefined) {
                nearbyMarkers.value[index].name = newName;
            } else if (newName) {
                userMarker.value.name = newName;
            }
        }

        function deleteWaypoint(latitude: number, longitude: number) {
            const index = nearbyMarkers.value.findIndex(waypoint => waypoint.latitude === latitude && waypoint.longitude === longitude);

            if (index !== -1) {
                nearbyMarkers.value.splice(index, 1);
            }

            map.eachLayer((layer) => {
                if (layer instanceof leaflet.Marker) {
                    const marker = layer as leaflet.Marker;
                    const markerLatLng = marker.getLatLng();
                    if (markerLatLng.lat === latitude && markerLatLng.lng === longitude) {
                        map.removeLayer(marker);
                    }
                }
            });
        }

        onUnmounted(() => {
            document.removeEventListener("keydown", handleArrowKeyPress);
        });

        return {
            engineStarted,
            nearbyMarkers,
            toggleEngine,
            deleteWaypoint,
            renameWaypoint,
            driveWaypoint,
            notificationMessage,
            notificationVisible
        };
    }
});
</script>

<style scoped>
.map-container {
    display: flex;
    align-items: flex-start;
    padding: 20px;
}

.map {
    width: 100%;
    height: 95vh;
    border: 2px solid #ddd;
    border-radius: 8px;
    margin-right: 20px;
}

.button-instruction--container {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    text-align: justify;
}

.instruction {
    font-family: "Nunito Sans", sans-serif;
    font-size: 15px;
    margin-top: 10px;
}

.saved-waypoints {
    width: 100%;
    max-width: 600px;
    font-family: "Nunito Sans", sans-serif;
}

.saved-waypoints h2 {
    font-size: 18px;
    margin: 20px 0 10px 0;
}

.waypoint-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
}

.waypoint-button--container {
    display: flex;
    width: 220px;
    justify-content: space-between;
}

.waypoint-button {
    padding: 3px 10px;
    cursor: pointer;
    background-color: #ffffff;
    border: 1px solid black;
    color: rgb(20, 20, 21);
    border-radius: 4px;
    transition: background-color 0.3s;
    font-family: "Nunito Sans", sans-serif;
}

.waypoint-button:hover {
    background-color: #e3e3e3;
}

.engine-button {
    background-color: rgba(75, 75, 75, 0.8);
    border: 2px solid black;
    color: white;
    padding: 10px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.3s;
    font-family: "Nunito Sans", sans-serif;
}

.engine-button:hover {
    background-color: rgba(133, 133, 133, 0.8);
}

.notification-popup {
    position: fixed;
    z-index: 1000;
    width: 340px;
    top: 200px;
    left: calc(50vw - 170px);
    background-color: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 10px 20px;
    border-radius: 4px;
    font-family: "Nunito Sans", sans-serif;
}
</style>
