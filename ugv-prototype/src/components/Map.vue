<template>
    <div>
        <div id="map"></div>
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

import { userMarker, nearbyMarkers } from "@/stores/mapStore";

const { coords } = useGeolocation();

const engineStarted = ref(false);



let map: leaflet.Map;
let userGeoMarker: leaflet.Marker;
let waypointPopup: leaflet.Popup | null = null;
let driveToWaypoint: leaflet.LatLng | null = null;

onMounted(() => {
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
        // const { lat: latitude, lng: longitude } = e.latlng;

        // leaflet
        //     .marker([latitude, longitude])
        //     .addTo(map)
        //     .bindPopup(
        //         `Saved Marker at (<strong>${latitude.toFixed(2)},${longitude.toFixed(2)}</strong>)`
        //     );

        // nearbyMarkers.value.push({ latitude, longitude });

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
            driveWaypoint()
        });
        document.getElementById('save').addEventListener('click', () => {
            saveWaypoint(e)
        });
        document.getElementById('discard').addEventListener('click', () => {
            discardWaypoint()
        });

        driveToWaypoint = e.latlng;
    });
});

watchEffect(() => {
    if (
        coords.value.latitude !== Number.POSITIVE_INFINITY &&
        coords.value.longitude !== Number.POSITIVE_INFINITY
    ) {
        userMarker.value.latitude = coords.value.latitude;
        userMarker.value.longitude = coords.value.longitude;

        if (userGeoMarker) {
            map.removeLayer(userGeoMarker);
        }

        userGeoMarker = leaflet
            .marker([userMarker.value.latitude, userMarker.value.longitude])
            .addTo(map)
            .bindPopup("User Marker");

        map.setView([userMarker.value.latitude, userMarker.value.longitude], 13);

        const el = userGeoMarker.getElement();
        if (el) {
            el.style.filter = "hue-rotate(120deg)";
        }
    }
});

function toggleEngine() {
    engineStarted.value = !engineStarted.value;
    if (!engineStarted.value) {
        // Disable UGV movement when engine is stopped
        document.removeEventListener("keydown", handleArrowKeyPress);
    } else {
        // Enable UGV movement when engine is started
        document.addEventListener("keydown", handleArrowKeyPress);
    }
}

function handleArrowKeyPress(event: KeyboardEvent) {
    if (!engineStarted.value) return; // Exit if engine is not started

    const moveDistance = 5; // Number of pixels to move

    const currentLatLng = userGeoMarker.getLatLng();
    let newLatLng: leaflet.LatLng | null = null;

    // Move UGV based on arrow key pressed
    switch (event.key) {
        case "ArrowUp":
            // Move UGV forward (up)
            newLatLng = new leaflet.LatLng(currentLatLng.lat + (moveDistance / 111111), currentLatLng.lng);
            break;
        case "ArrowDown":
            // Move UGV backward (down)
            newLatLng = new leaflet.LatLng(currentLatLng.lat - (moveDistance / 111111), currentLatLng.lng);
            break;
        case "ArrowLeft":
            // Move UGV left
            newLatLng = new leaflet.LatLng(currentLatLng.lat, currentLatLng.lng - (moveDistance / (111111 * Math.cos(currentLatLng.lat * Math.PI / 180))));
            break;
        case "ArrowRight":
            // Move UGV right
            newLatLng = new leaflet.LatLng(currentLatLng.lat, currentLatLng.lng + (moveDistance / (111111 * Math.cos(currentLatLng.lat * Math.PI / 180))));
            break;
        default:
            break;
    }

    // Update UGV marker position if a new position is calculated
    if (newLatLng) {
        userGeoMarker.setLatLng(newLatLng);
        map.panTo(newLatLng); // Optionally, pan the map to the new position
    }
}

function driveWaypoint() {
    if (driveToWaypoint) {
        // Move UGV to the waypoint's location
        if (userGeoMarker) {
            userGeoMarker.setLatLng(driveToWaypoint);
        } else {
            userGeoMarker = leaflet.marker(driveToWaypoint).addTo(map);
        }
    }
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

    nearbyMarkers.value.push({ latitude, longitude });
    if (waypointPopup) {
        waypointPopup.remove();
    }
}

function discardWaypoint() {
    if (waypointPopup) {
        waypointPopup.remove();
    }
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
    /* Grey background with 80% opacity */
    border: 2px solid black;
    /* Black borders with 2px width */
    color: white;
    /* White text color */
    padding: 10px;
    cursor: pointer;
}
</style>
