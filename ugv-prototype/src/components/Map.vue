<template>
    <div>
        <div id="map"></div>
        <div>
            <h2>Saved Waypoints</h2>
            <ul>
                <li v-for="(waypoint, index) in nearbyMarkers" :key="index">
                    {{ waypoint.name }}: {{ waypoint.latitude.toFixed(2) }}, {{ waypoint.longitude.toFixed(2) }}
                    <button @click="deleteWaypoint(waypoint.latitude, waypoint.longitude)">Delete</button>
                    <button @click="renameWaypoint(index)">Rename</button>
                    <button @click="driveWaypoint(waypoint)">Drive</button>
                </li>
            </ul>
        </div>
        <button class="engine-button" @click="toggleEngine">
            <span v-if="engineStarted">Stop Engine</span>
            <span v-else>Start Engine</span>
        </button>
    </div>
</template>

<script setup lang="ts">
import * as leaflet from "leaflet";
import { onMounted, watchEffect, ref, onUnmounted } from 'vue';
import { useGeolocation } from "@vueuse/core";

import { userMarker, nearbyMarkers, Marker } from "@/stores/mapStore";

const engineStarted = ref(false);
const isMounted = ref(false);
let map: leaflet.Map;
let userGeoMarker: leaflet.Marker;
let waypointPopup: leaflet.Popup | null = null;

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
                `Saved Marker at (<strong>${latitude.toFixed(2)},${longitude.toFixed(2)}</strong>)`
            );
    });

    map.on('contextmenu', (e) => {
        if (waypointPopup) {
            waypointPopup.remove();
        }
        
        waypointPopup = leaflet.popup({
            closeButton: false,
            minWidth: 100,
            maxWidth: 200,
            maxHeight: 200,
            autoClose: false,
            closeOnClick: false,
        })
            .setLatLng(e.latlng)
            .setContent(`
                <button id="drive">Drive</button>
                <button id="save">Save</button>
                <button id="discard">Discard</button>
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

function handleArrowKeyPress(event: KeyboardEvent) {
    if (!engineStarted.value) {
        alert("Please start the engine to move the UGV.");
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
            `Saved Marker at (<strong>${latitude.toFixed(2)},${longitude.toFixed(2)}</strong>)`
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
</script>

<style scoped>
#map {
    width: 80%;
    height: calc(100vh - 50px);
}

.engine-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(128, 128, 128, 0.8);
    border: 2px solid black;
    color: white;
    padding: 10px;
    cursor: pointer;
}
</style>
